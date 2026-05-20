import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Share,
  Alert,
  Modal,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, ChevronRight, Share2, Camera, ChevronLeft, Plus, MessageSquare, X, Mic, Volume2, Square, Lock } from 'lucide-react-native';
import { startRecording, transcribeAudio, speakText, stopSpeech, type RecorderHandle } from '@/utils/voiceChat';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';
import { ChatMessage, Conversation } from '@/types';
import { aiGenerateText } from '@/utils/aiApi';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useBadges } from '@/providers/BadgesProvider';
import { router, useLocalSearchParams } from 'expo-router';
import { DR_TOXI_SYSTEM_PROMPT, QUICK_SUGGESTIONS, DR_TOXI_WELCOME, DR_TOXI_VISION_PROMPT, VISION_LOADING_MESSAGES } from '@/constants/drToxiPrompt';
import { LOADING_TIPS } from '@/constants/loadingTips';
import { compressImageWeb, compressImageNative } from '@/utils/imageCompression';
import { getChatRegionPrompt } from '@/utils/regionDetection';
import { t, tf, getDateLocale, isEnglish } from '@/utils/i18n';

const DR_TOXI_AVATAR = 'https://r2-pub.rork.com/generated-images/97a5e938-5054-43f6-b4a0-83e39183f2a6.png';

async function getBase64FromUri(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return compressImageWeb(uri, 1024);
  }
  return compressImageNative(uri, 1024, 0.8);
}

const CONVERSATIONS_STORAGE_KEY = 'toxiscan_drtoxi_conversations';
const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES_PER_CONVERSATION = 50;

function generateId(): string {
  return Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

function createNewConversation(productContext?: Conversation['productContext']): Conversation {
  return {
    id: generateId(),
    title: productContext ? productContext.name : t('conv_new'),
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    productContext,
  };
}

async function loadConversations(): Promise<Conversation[]> {
  try {
    const stored = await AsyncStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (!stored) {
      const oldChat = await AsyncStorage.getItem('toxiscan_drtoxi_chat');
      if (oldChat) {
        const oldMessages = JSON.parse(oldChat) as ChatMessage[];
        if (oldMessages.length > 0) {
          const migrated: Conversation = {
            id: generateId(),
            title: t('conv_previous'),
            messages: oldMessages,
            createdAt: oldMessages[0]?.timestamp ?? new Date().toISOString(),
            updatedAt: oldMessages[oldMessages.length - 1]?.timestamp ?? new Date().toISOString(),
          };
          console.log('[DrToxi] Migrated old chat to conversation system');
          await AsyncStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify([migrated]));
          await AsyncStorage.removeItem('toxiscan_drtoxi_chat');
          return [migrated];
        }
      }
      return [];
    }
    const parsed = JSON.parse(stored) as Conversation[];
    console.log('[DrToxi] Loaded', parsed.length, 'conversations');
    return parsed;
  } catch (error) {
    console.log('[DrToxi] Error loading conversations:', error);
    return [];
  }
}

async function persistConversations(conversations: Conversation[]): Promise<void> {
  try {
    const toStore = conversations.slice(0, MAX_CONVERSATIONS);
    await AsyncStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(toStore));
    console.log('[DrToxi] Persisted', toStore.length, 'conversations');
  } catch (error) {
    console.log('[DrToxi] Error persisting conversations:', error);
  }
}

function getConversationPreview(conv: Conversation): string {
  if (conv.productContext) {
    return conv.productContext.name + (conv.productContext.brand ? ` — ${conv.productContext.brand}` : '');
  }
  const lastUserMsg = [...conv.messages].reverse().find(m => m.role === 'user');
  if (lastUserMsg) {
    return lastUserMsg.content.length > 60 ? lastUserMsg.content.substring(0, 60) + '...' : lastUserMsg.content;
  }
  return t('conv_new');
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('just_now');
  if (diffMins < 60) return tf('minutes_ago', diffMins);
  if (diffHours < 24) return tf('hours_ago', diffHours);
  if (diffDays < 7) return tf('days_ago', diffDays);
  return date.toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short' });
}

export default function DrToxiScreen() {
  const params = useLocalSearchParams<{
    productName?: string;
    productBrand?: string;
    productBarcode?: string;
    productVerdict?: string;
    productSummary?: string;
  }>();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState<string>('');
  const [tipIndex, setTipIndex] = useState<number>(0);
  const [visionTipIndex, setVisionTipIndex] = useState<number>(0);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [productContextHandled, setProductContextHandled] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const recorderRef = useRef<RecorderHandle | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const waveAnim3 = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const { canUseDrToxi, drToxiRemaining, drToxiLimit, isPro, consumeDrToxi } = useSubscription();
  const { recordDrToxiQuestion, recordShare } = useBadges();

  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null;
    return conversations.find(c => c.id === activeConversationId) ?? null;
  }, [conversations, activeConversationId]);

  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    console.log('[DrToxi] Loading conversations');
    void loadConversations().then((loaded) => {
      setConversations(loaded);
      if (loaded.length > 0 && !params.productName) {
        setActiveConversationId(loaded[0].id);
      }
      setHasLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;

    const hasProductContext = params.productName && params.productBarcode;
    if (!hasProductContext) return;

    const contextKey = `${params.productBarcode}_${params.productName}`;
    if (productContextHandled === contextKey) return;

    console.log('[DrToxi] Product context detected:', params.productName);
    setProductContextHandled(contextKey);

    const productCtx: Conversation['productContext'] = {
      name: params.productName!,
      brand: params.productBrand ?? '',
      barcode: params.productBarcode!,
      verdictLevel: (params.productVerdict as 'danger' | 'warning' | 'moderation' | 'approuve') ?? 'approuve',
      analysisSummary: params.productSummary,
    };

    const newConv = createNewConversation(productCtx);

    const verdictLabel = productCtx.verdictLevel === 'danger'
      ? t('verdict_label_danger')
      : productCtx.verdictLevel === 'warning'
      ? t('verdict_label_caution')
      : productCtx.verdictLevel === 'moderation'
      ? t('verdict_label_moderation')
      : t('verdict_label_approved');

    const welcomeMsg: ChatMessage = {
      id: generateId() + '_assistant',
      role: 'assistant',
      content: tf('conv_scanned', productCtx.name, productCtx.brand ?? '', verdictLabel) + (productCtx.analysisSummary ? ` ${productCtx.analysisSummary}` : ''),
      timestamp: new Date().toISOString(),
    };

    newConv.messages = [welcomeMsg];
    newConv.updatedAt = new Date().toISOString();

    setConversations(prev => {
      const updated = [newConv, ...prev];
      void persistConversations(updated);
      return updated;
    });
    setActiveConversationId(newConv.id);
    setShowHistory(false);
  }, [hasLoaded, params.productName, params.productBarcode, params.productBrand, params.productVerdict, params.productSummary, productContextHandled]);

  useEffect(() => {
    if (hasLoaded && conversations.length > 0) {
      void persistConversations(conversations);
    }
  }, [conversations, hasLoaded]);

  const updateActiveConversationMessages = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setConversations(prev => {
      return prev.map(c => {
        if (c.id !== activeConversationId) return c;
        const newMessages = updater(c.messages).slice(-MAX_MESSAGES_PER_CONVERSATION);
        const firstUserMsg = newMessages.find(m => m.role === 'user');
        let title = c.title;
        if ((c.title === 'Nouvelle discussion' || c.title === 'New conversation') && firstUserMsg) {
          title = firstUserMsg.content.length > 40 ? firstUserMsg.content.substring(0, 40) + '...' : firstUserMsg.content;
        }
        return { ...c, messages: newMessages, updatedAt: new Date().toISOString(), title };
      });
    });
  }, [activeConversationId]);

  const sendMutation = useMutation({
    mutationFn: async (payload: { text: string; imageBase64?: string }) => {
      console.log('[DrToxi] Sending message:', payload.text.substring(0, 50), 'hasImage:', !!payload.imageBase64);

      const currentMessages = activeConversation?.messages ?? [];
      const conversationHistory = currentMessages
        .filter(m => !m.id.includes('_error'))
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const regionPrompt = getChatRegionPrompt();

      let productContextPrompt = '';
      if (activeConversation?.productContext) {
        const ctx = activeConversation.productContext;
        productContextPrompt = tf('product_context_prompt', ctx.name, ctx.brand || '', ctx.barcode, ctx.verdictLevel, ctx.analysisSummary || '');
      }

      const systemPrompt = payload.imageBase64
        ? DR_TOXI_SYSTEM_PROMPT + regionPrompt + productContextPrompt + '\n\n--- MODE SCANNER VISION ---\n\n' + DR_TOXI_VISION_PROMPT
        : DR_TOXI_SYSTEM_PROMPT + regionPrompt + productContextPrompt;

      const userContent: string | Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = payload.imageBase64
        ? [
            { type: 'text' as const, text: payload.text || t('analyze_for_me') },
            { type: 'image' as const, image: payload.imageBase64 },
          ]
        : payload.text;

      const response = await aiGenerateText({
        system: systemPrompt,
        messages: [
          ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user' as const, content: userContent },
        ],
        maxTokens: 2048,
      });

      const cleaned = response
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^[-•]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        .replace(/`([^`]+)`/g, '$1');

      console.log('[DrToxi] Response received, length:', cleaned.length);
      return cleaned;
    },
    onSuccess: (response) => {
      consumeDrToxi();
      recordDrToxiQuestion();
      const assistantMessage: ChatMessage = {
        id: generateId() + '_assistant',
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };
      updateActiveConversationMessages(prev => [...prev, assistantMessage]);
      setIsAnalyzingImage(false);
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    onError: (error, variables) => {
      console.error('[DrToxi] Error:', error);
      const hadImage = !!variables?.imageBase64;
      setIsAnalyzingImage(false);
      const errorMessage: ChatMessage = {
        id: generateId() + '_error',
        role: 'assistant',
        content: hadImage ? t('error_image_analysis') : t('error_chat_generic'),
        timestamp: new Date().toISOString(),
      };
      updateActiveConversationMessages(prev => [...prev, errorMessage]);
    },
  });

  useEffect(() => {
    if (!sendMutation.isPending) return;
    setTipIndex(Math.floor(Math.random() * LOADING_TIPS.length));
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % LOADING_TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [sendMutation.isPending]);

  useEffect(() => {
    if (!isAnalyzingImage) return;
    setVisionTipIndex(Math.floor(Math.random() * VISION_LOADING_MESSAGES.length));
    const interval = setInterval(() => {
      setVisionTipIndex(prev => (prev + 1) % VISION_LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isAnalyzingImage]);

  const ensureActiveConversation = useCallback((): string => {
    if (activeConversationId) return activeConversationId;
    const newConv = createNewConversation();
    setConversations(prev => {
      const updated = [newConv, ...prev];
      void persistConversations(updated);
      return updated;
    });
    setActiveConversationId(newConv.id);
    return newConv.id;
  }, [activeConversationId]);

  const handleSend = useCallback((text?: string) => {
    const messageText = text ?? input.trim();
    if (!messageText || sendMutation.isPending) return;

    if (!canUseDrToxi) {
      console.log('[DrToxi] Message limit reached, showing paywall');
      router.push('/paywall?source=drtoxi');
      return;
    }

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    ensureActiveConversation();

    const userMessage: ChatMessage = {
      id: generateId() + '_user',
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    updateActiveConversationMessages(prev => [...prev, userMessage]);
    setInput('');
    sendMutation.mutate({ text: messageText });
  }, [input, sendMutation, canUseDrToxi, ensureActiveConversation, updateActiveConversationMessages]);

  const handleImagePicked = useCallback(async (uri: string) => {
    if (!canUseDrToxi) {
      console.log('[DrToxi] Message limit reached, showing paywall');
      router.push('/paywall?source=drtoxi');
      return;
    }

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    ensureActiveConversation();

    const userMessage: ChatMessage = {
      id: generateId() + '_user',
      role: 'user',
      content: t('photo_sent'),
      timestamp: new Date().toISOString(),
      imageUri: uri,
    };

    updateActiveConversationMessages(prev => [...prev, userMessage]);
    setIsAnalyzingImage(true);

    try {
      console.log('[DrToxi] Compressing image for vision analysis...');
      const base64 = await getBase64FromUri(uri);
      console.log('[DrToxi] Image compressed, base64 length:', base64.length);
      sendMutation.mutate({ text: t('analyze_photo_prompt'), imageBase64: base64 });
    } catch (error) {
      console.error('[DrToxi] Image compression error:', error);
      setIsAnalyzingImage(false);
      const errorMsg: ChatMessage = {
        id: generateId() + '_error',
        role: 'assistant',
        content: t('error_image_process'),
        timestamp: new Date().toISOString(),
      };
      updateActiveConversationMessages(prev => [...prev, errorMsg]);
    }
  }, [canUseDrToxi, sendMutation, ensureActiveConversation, updateActiveConversationMessages]);

  const handleCameraPress = useCallback(async () => {
    if (sendMutation.isPending || isAnalyzingImage) return;

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('camera_disabled_title'),
          t('camera_disabled_msg'),
          [
            { text: t('open_settings'), onPress: () => {
              if (Platform.OS !== 'web') {
                void import('expo-linking').then(LinkingModule => {
                  void LinkingModule.openSettings();
                }).catch(() => {});
              }
            }},
          ]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[DrToxi] Camera photo taken:', result.assets[0].uri.substring(0, 50));
        void handleImagePicked(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[DrToxi] Camera error:', error);
      Alert.alert(t('error_generic'), t('error_camera_chat'));
    }
  }, [sendMutation.isPending, isAnalyzingImage, handleImagePicked]);

  const handleGalleryPress = useCallback(async () => {
    if (sendMutation.isPending || isAnalyzingImage) return;

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[DrToxi] Gallery photo selected:', result.assets[0].uri.substring(0, 50));
        void handleImagePicked(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[DrToxi] Gallery error:', error);
    }
  }, [sendMutation.isPending, isAnalyzingImage, handleImagePicked]);

  const handlePhotoAction = useCallback(() => {
    if (sendMutation.isPending || isAnalyzingImage) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Alert.alert(
      t('scan_product_alert_title'),
      t('scan_product_alert_msg'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('gallery'), onPress: () => void handleGalleryPress() },
        { text: t('camera'), onPress: () => void handleCameraPress() },
      ]
    );
  }, [sendMutation.isPending, isAnalyzingImage, handleGalleryPress, handleCameraPress]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleShareResponse = useCallback(async (content: string) => {
    console.log('[DrToxi] Sharing response');
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const result = await Share.share({
        message: `Dr.Toxi :\n\n${content}\n\n${t('share_drtoxi_suffix')}`,
      });
      if (result.action === Share.sharedAction) {
        recordShare();
        console.log('[DrToxi] Share completed, badge recorded');
      }
    } catch (error) {
      console.log('[DrToxi] Share error:', error);
    }
  }, [recordShare]);

  const handleNewConversation = useCallback(() => {
    console.log('[DrToxi] Creating new conversation');
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newConv = createNewConversation();
    setConversations(prev => {
      const updated = [newConv, ...prev];
      void persistConversations(updated);
      return updated;
    });
    setActiveConversationId(newConv.id);
    setShowHistory(false);
  }, []);

  const handleSelectConversation = useCallback((convId: string) => {
    console.log('[DrToxi] Switching to conversation:', convId);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveConversationId(convId);
    setShowHistory(false);
  }, []);

  const handleDeleteConversation = useCallback((convId: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== convId);
      void persistConversations(updated);
      if (activeConversationId === convId) {
        setActiveConversationId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  }, [activeConversationId]);

  const handleSpeakMessage = useCallback(async (messageId: string, content: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!isPro) {
      console.log('[DrToxi] Listen blocked, user is not Pro');
      router.push('/paywall?source=listen');
      return;
    }
    if (speakingMessageId === messageId) {
      await stopSpeech();
      setSpeakingMessageId(null);
      return;
    }
    try {
      await stopSpeech();
      setSpeakingMessageId(messageId);
      await speakText(content);
    } catch (error) {
      console.error('[DrToxi] Speak error:', error);
      setSpeakingMessageId(null);
      Alert.alert(t('mic_error_title'), t('tts_error'));
    }
  }, [speakingMessageId, isPro]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubbleContainer, isUser ? styles.userBubbleContainer : styles.botBubbleContainer]}>
        {!isUser && (
          <Image source={{ uri: DR_TOXI_AVATAR }} style={styles.avatarSmall} />
        )}
        <View style={styles.messageColumn}>
          {isUser && item.imageUri ? (
            <View style={[styles.messageBubble, styles.userBubble, styles.imageBubble]}>
              <Image source={{ uri: item.imageUri }} style={styles.chatImage} resizeMode="cover" />
              <Text style={[styles.messageText, styles.userMessageText, styles.imageCaption]}>
                {t('photo_sent')}
              </Text>
            </View>
          ) : (
            <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
              <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.botMessageText]}>
                {item.content}
              </Text>
            </View>
          )}
          {!isUser && !item.id.includes('_error') && (
            <View style={styles.messageActionsRow}>
              <TouchableOpacity
                style={styles.shareResponseButton}
                onPress={() => handleShareResponse(item.content)}
                activeOpacity={0.7}
              >
                <Share2 color={Colors.textSecondary} size={14} />
                <Text style={styles.shareResponseText}>{t('share')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareResponseButton, speakingMessageId === item.id && styles.shareResponseButtonActive]}
                onPress={() => handleSpeakMessage(item.id, item.content)}
                activeOpacity={0.7}
                testID={`speak-${item.id}`}
              >
                {speakingMessageId === item.id ? (
                  <Square color={Colors.primary} size={14} fill={Colors.primary} />
                ) : !isPro ? (
                  <Lock color={Colors.textSecondary} size={12} />
                ) : (
                  <Volume2 color={Colors.textSecondary} size={14} />
                )}
                <Text style={[styles.shareResponseText, speakingMessageId === item.id && styles.shareResponseTextActive]}>
                  {speakingMessageId === item.id ? t('listening') : t('listen')}
                </Text>
                {!isPro && (
                  <View style={styles.listenProBadge}>
                    <Text style={styles.listenProBadgeText}>Pro</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }, [handleShareResponse, handleSpeakMessage, speakingMessageId]);

  const isLoading = sendMutation.isPending || isAnalyzingImage;

  useEffect(() => {
    if (!isRecording) {
      pulseAnim.setValue(1);
      waveAnim1.setValue(0);
      waveAnim2.setValue(0);
      waveAnim3.setValue(0);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const makeWave = (anim: Animated.Value, delay: number) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(anim, { toValue: 0, duration: 500, easing: Easing.in(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    pulse.start();
    const w1 = makeWave(waveAnim1, 0);
    const w2 = makeWave(waveAnim2, 150);
    const w3 = makeWave(waveAnim3, 300);
    w1.start();
    w2.start();
    w3.start();
    return () => {
      pulse.stop();
      w1.stop();
      w2.stop();
      w3.stop();
    };
  }, [isRecording, pulseAnim, waveAnim1, waveAnim2, waveAnim3]);

  const handleMicPressIn = useCallback(async () => {
    if (isLoading || isRecording || isTranscribing) return;
    if (!canUseDrToxi) {
      router.push('/paywall?source=drtoxi');
      return;
    }
    try {
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const handle = await startRecording();
      recorderRef.current = handle;
      setIsRecording(true);
      console.log('[DrToxi] Voice recording started');
    } catch (error) {
      console.error('[DrToxi] Recording start error:', error);
      const msg = error instanceof Error && error.message === 'microphone_permission_denied'
        ? t('mic_permission_msg')
        : t('mic_start_error');
      Alert.alert(t('mic_error_title'), msg);
    }
  }, [isLoading, isRecording, isTranscribing, canUseDrToxi]);

  const handleMicPressOut = useCallback(async () => {
    if (!isRecording) return;
    const handle = recorderRef.current;
    recorderRef.current = null;
    setIsRecording(false);
    if (!handle) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const result = await handle.stop();
      if (!result) {
        console.log('[DrToxi] No audio captured');
        return;
      }
      setIsTranscribing(true);
      const text = await transcribeAudio(result.uri, result.mimeType);
      setIsTranscribing(false);
      if (!text || text.length < 2) {
        Alert.alert(t('mic_error_title'), t('mic_empty_transcription'));
        return;
      }
      handleSend(text);
    } catch (error) {
      setIsTranscribing(false);
      console.error('[DrToxi] Transcription error:', error);
      Alert.alert(t('mic_error_title'), t('mic_transcription_error'));
    }
  }, [isRecording, handleSend]);

  useEffect(() => {
    return () => {
      void stopSpeech();
      if (recorderRef.current) {
        void recorderRef.current.cancel();
      }
    };
  }, []);

  const getVerdictDot = (level?: string) => {
    if (level === 'danger') return '#D0260F';
    if (level === 'warning') return '#E8730A';
    if (level === 'moderation') return '#EAB308';
    if (level === 'approuve') return '#34C759';
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          testID="dr-toxi-back"
        >
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Image source={{ uri: DR_TOXI_AVATAR }} style={styles.avatar} />
        <TouchableOpacity style={styles.headerInfo} onPress={() => setShowHistory(true)} activeOpacity={0.7}>
          <Text style={styles.headerTitle}>Dr. Toxi</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {activeConversation?.productContext
              ? activeConversation.productContext.name
              : t('your_ingredient_expert')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={handleNewConversation}
          activeOpacity={0.7}
          testID="new-conversation"
        >
          <Plus color={Colors.primary} size={20} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimerText}>
        {t('disclaimer')}
      </Text>

      {!isPro && (
        <View style={styles.counterBanner}>
          <Text style={styles.counterText}>
            {tf('free_messages_counter', drToxiRemaining, drToxiLimit)}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {messages.length === 0 ? (
          <View style={styles.welcomeContainer}>
            <Image source={{ uri: DR_TOXI_AVATAR }} style={styles.welcomeAvatar} />
            <Text style={styles.welcomeText}>
              {DR_TOXI_WELCOME}
            </Text>

            <TouchableOpacity
              style={styles.scanInChatCard}
              onPress={handleCameraPress}
              activeOpacity={0.7}
              testID="scan-in-chat"
            >
              <View style={styles.scanInChatIcon}>
                <Camera color={Colors.white} size={20} strokeWidth={2} />
              </View>
              <View style={styles.scanInChatContent}>
                <Text style={styles.scanInChatTitle}>{t('scan_product_chat')}</Text>
                <Text style={styles.scanInChatSubtitle}>{t('scan_product_chat_desc')}</Text>
              </View>
              <ChevronRight color={Colors.primary} size={18} />
            </TouchableOpacity>

            {conversations.length > 0 && (
              <TouchableOpacity
                style={styles.historyQuickLink}
                onPress={() => setShowHistory(true)}
                activeOpacity={0.7}
              >
                <MessageSquare color={Colors.textSecondary} size={16} />
                <Text style={styles.historyQuickLinkText}>
                  {tf('previous_discussions', conversations.length)}
                </Text>
                <ChevronRight color={Colors.textTertiary} size={16} />
              </TouchableOpacity>
            )}

            <View style={styles.suggestionsContainer}>
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={styles.suggestionChip}
                  onPress={() => handleSend(suggestion)}
                  activeOpacity={0.7}
                  testID={`suggestion-${suggestion}`}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {isLoading && (
          <View style={styles.typingContainer}>
            <View style={styles.typingIndicator}>
              <Image source={{ uri: DR_TOXI_AVATAR }} style={styles.avatarSmall} />
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>
                {isAnalyzingImage
                  ? VISION_LOADING_MESSAGES[visionTipIndex]
                  : t('drtoxi_thinking')}
              </Text>
            </View>
            {!isAnalyzingImage && (
              <View style={styles.tipBanner}>
                <Text style={styles.tipLabel}>{t('did_you_know')}</Text>
                <Text style={styles.tipText}>{LOADING_TIPS[tipIndex]}</Text>
              </View>
            )}
          </View>
        )}

        {isRecording && (
          <View style={styles.recordingOverlay} testID="recording-overlay">
            <View style={styles.recordingWaves}>
              <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.6] }) }] }]} />
              <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.8] }) }] }]} />
              <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim3.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.4] }) }] }]} />
              <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.9] }) }] }]} />
              <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.5] }) }] }]} />
            </View>
            <Text style={styles.recordingText}>{t('speak_now')}</Text>
            <Text style={styles.recordingHint}>{t('release_to_send')}</Text>
          </View>
        )}

        {isTranscribing && (
          <View style={styles.recordingOverlay}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.recordingText}>{t('transcribing')}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={[styles.cameraButton, isLoading && styles.cameraButtonDisabled]}
            onPress={handlePhotoAction}
            disabled={isLoading || isRecording}
            activeOpacity={0.7}
            testID="camera-button"
          >
            <Camera color={isLoading ? Colors.textTertiary : Colors.primary} size={20} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder={isRecording ? t('speak_now') : t('ask_question_placeholder')}
            placeholderTextColor={Colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            editable={!isRecording && !isTranscribing}
            testID="chat-input"
          />
          {input.trim().length > 0 ? (
            <TouchableOpacity
              style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
              onPress={() => handleSend()}
              disabled={isLoading}
              testID="send-button"
            >
              <Send color={Colors.white} size={18} />
            </TouchableOpacity>
          ) : (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonRecording, (isLoading || isTranscribing) && styles.sendButtonDisabled]}
                onPressIn={handleMicPressIn}
                onPressOut={handleMicPressOut}
                disabled={isLoading || isTranscribing}
                activeOpacity={0.8}
                testID="mic-button"
              >
                <Mic color={Colors.white} size={18} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showHistory}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistory(false)}
      >
        <SafeAreaView style={styles.historyContainer} edges={['top']}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>{t('discussions_title')}</Text>
            <TouchableOpacity
              style={styles.historyCloseButton}
              onPress={() => setShowHistory(false)}
              activeOpacity={0.7}
            >
              <X color={Colors.text} size={22} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.newConvButton}
            onPress={handleNewConversation}
            activeOpacity={0.7}
          >
            <View style={styles.newConvIcon}>
              <Plus color={Colors.white} size={18} strokeWidth={2.5} />
            </View>
            <Text style={styles.newConvText}>{t('new_discussion')}</Text>
          </TouchableOpacity>

          <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
            {conversations.length === 0 ? (
              <View style={styles.emptyHistory}>
                <MessageSquare color={Colors.textTertiary} size={36} />
                <Text style={styles.emptyHistoryText}>{t('no_discussions')}</Text>
              </View>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const dotColor = getVerdictDot(conv.productContext?.verdictLevel);
                return (
                  <TouchableOpacity
                    key={conv.id}
                    style={[styles.convItem, isActive && styles.convItemActive]}
                    onPress={() => handleSelectConversation(conv.id)}
                    onLongPress={() => {
                      Alert.alert(
                        t('delete_discussion_title'),
                        t('delete_discussion_msg'),
                        [
                          { text: t('cancel'), style: 'cancel' },
                          { text: t('delete'), style: 'destructive', onPress: () => handleDeleteConversation(conv.id) },
                        ]
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.convItemLeft}>
                      {dotColor ? (
                        <View style={[styles.convDot, { backgroundColor: dotColor }]} />
                      ) : (
                        <MessageSquare color={isActive ? Colors.primary : Colors.textSecondary} size={18} />
                      )}
                    </View>
                    <View style={styles.convItemContent}>
                      <Text style={[styles.convItemTitle, isActive && styles.convItemTitleActive]} numberOfLines={1}>
                        {conv.title}
                      </Text>
                      <Text style={styles.convItemPreview} numberOfLines={1}>
                        {getConversationPreview(conv)}
                      </Text>
                    </View>
                    <View style={styles.convItemRight}>
                      <Text style={styles.convItemTime}>{formatTimestamp(conv.updatedAt)}</Text>
                      <Text style={styles.convItemCount}>{conv.messages.length} msg</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'rgba(52, 199, 89, 0.15)',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  newChatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 2,
  },
  counterBanner: {
    backgroundColor: 'rgba(52, 199, 89, 0.06)',
    paddingHorizontal: 20,
    paddingVertical: 7,
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 10,
  },
  counterText: {
    fontSize: 12,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  chatContainer: {
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: 'rgba(52, 199, 89, 0.12)',
  },
  welcomeText: {
    fontSize: 17,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 28,
  },
  scanInChatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 199, 89, 0.25)',
    marginBottom: 16,
    width: '100%',
    gap: 14,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  scanInChatIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanInChatContent: {
    flex: 1,
  },
  scanInChatTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  scanInChatSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  historyQuickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    marginBottom: 20,
    width: '100%',
  },
  historyQuickLinkText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
    alignItems: 'flex-start',
  },
  messageColumn: {
    maxWidth: '78%',
    gap: 4,
  },
  userBubbleContainer: {
    justifyContent: 'flex-end',
  },
  botBubbleContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#34C759',
    borderBottomRightRadius: 6,
    marginLeft: 'auto',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  botBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  imageBubble: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  chatImage: {
    width: 200,
    height: 260,
    borderRadius: 16,
  },
  imageCaption: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: Colors.white,
  },
  botMessageText: {
    color: Colors.text,
  },
  shareResponseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    marginTop: 2,
  },
  shareResponseText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  messageActionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  shareResponseButtonActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
  },
  shareResponseTextActive: {
    color: '#34C759',
    fontWeight: '600' as const,
  },
  listenProBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#34C759',
    borderRadius: 6,
    marginLeft: 4,
  },
  listenProBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  micButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  micButtonRecording: {
    backgroundColor: '#FF3B30',
    shadowColor: '#C62828',
  },
  recordingOverlay: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.25)',
    alignItems: 'center',
    gap: 6,
  },
  recordingWaves: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    marginBottom: 2,
  },
  waveBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#34C759',
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#34C759',
  },
  recordingHint: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  tipBanner: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 3,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  tipText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cameraButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  cameraButtonDisabled: {
    opacity: 0.4,
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surfaceSecondary,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  historyContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  historyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  historyCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  newConvButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },
  newConvIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newConvText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  historyList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: Colors.textTertiary,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 4,
    gap: 12,
  },
  convItemActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.06)',
  },
  convItemLeft: {
    width: 32,
    alignItems: 'center',
  },
  convDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  convItemContent: {
    flex: 1,
  },
  convItemTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  convItemTitleActive: {
    color: Colors.primary,
  },
  convItemPreview: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  convItemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  convItemTime: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  convItemCount: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
});
