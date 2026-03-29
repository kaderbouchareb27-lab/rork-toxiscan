import React, { useState, useRef, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, ChevronRight, Share2, Camera } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';
import { ChatMessage } from '@/types';
import { generateText } from '@rork-ai/toolkit-sdk';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useBadges } from '@/providers/BadgesProvider';
import { router } from 'expo-router';
import { DR_TOXI_SYSTEM_PROMPT, QUICK_SUGGESTIONS, DR_TOXI_WELCOME, DR_TOXI_VISION_PROMPT, VISION_LOADING_MESSAGES } from '@/constants/drToxiPrompt';

const LOADING_TIPS = [
  'Le brocoli est l\'aliment anti-cancer #1 selon les chercheurs.',
  'Un contenant en verre est toujours plus sûr que le plastique.',
  'Les nitrites (E250) sont classés cancérogènes avérés par le CIRC.',
  'L\'huile d\'olive extra vierge est anti-inflammatoire naturelle.',
  'Ne chauffez jamais un contenant plastique au micro-ondes.',
  'Les poêles en fonte ou inox sont les plus sûres pour cuisiner.',
  'Lisez toujours la liste d\'ingrédients, pas juste le devant du produit.',
  'Le curcuma est un puissant anti-inflammatoire naturel.',
  'Privilégiez les produits avec moins de 5 ingrédients.',
  'Le MSG (E621) est caché sous de nombreux noms : extrait de levure, arôme naturel...',
  'Les bocaux en verre ne libèrent aucune substance dans vos aliments.',
  'Le thé vert contient des antioxydants puissants.',
];

const DR_TOXI_AVATAR = 'https://r2-pub.rork.com/generated-images/97a5e938-5054-43f6-b4a0-83e39183f2a6.png';

function compressImageWeb(uri: string, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = reject;
    img.src = uri;
  });
}

async function compressImageNative(uri: string): Promise<string> {
  try {
    console.log('[DrToxi] Compressing native image...');
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    if (manipulated.base64) {
      console.log('[DrToxi] Native image compressed, base64 length:', manipulated.base64.length);
      return manipulated.base64;
    }

    console.log('[DrToxi] ImageManipulator did not return base64, falling back');
    const FileSystemLegacy = await import('expo-file-system/legacy');
    const base64 = await FileSystemLegacy.readAsStringAsync(manipulated.uri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('[DrToxi] Native compression error:', error);
    const FileSystemLegacy = await import('expo-file-system/legacy');
    const base64 = await FileSystemLegacy.readAsStringAsync(uri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
    return base64;
  }
}

async function getBase64FromUri(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return compressImageWeb(uri, 1024);
  }
  return compressImageNative(uri);
}

const CHAT_STORAGE_KEY = 'toxiscan_drtoxi_chat';
const MAX_PERSISTED_MESSAGES = 50;

async function loadPersistedMessages(): Promise<ChatMessage[]> {
  try {
    const stored = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as ChatMessage[];
    console.log('[DrToxi] Loaded', parsed.length, 'persisted messages');
    return parsed;
  } catch (error) {
    console.log('[DrToxi] Error loading persisted messages:', error);
    return [];
  }
}

async function persistMessages(messages: ChatMessage[]): Promise<void> {
  try {
    const toStore = messages.slice(-MAX_PERSISTED_MESSAGES);
    await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore));
    console.log('[DrToxi] Persisted', toStore.length, 'messages');
  } catch (error) {
    console.log('[DrToxi] Error persisting messages:', error);
  }
}

export default function DrToxiScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [tipIndex, setTipIndex] = useState<number>(0);
  const [visionTipIndex, setVisionTipIndex] = useState<number>(0);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [hasLoadedMessages, setHasLoadedMessages] = useState<boolean>(false);
  const flatListRef = useRef<FlatList>(null);
  const { canUseDrToxi, drToxiRemaining, drToxiLimit, isPro, consumeDrToxi } = useSubscription();
  const { recordDrToxiQuestion, recordShare } = useBadges();

  useEffect(() => {
    void loadPersistedMessages().then((loaded) => {
      if (loaded.length > 0) {
        setMessages(loaded);
      }
      setHasLoadedMessages(true);
    });
  }, []);

  useEffect(() => {
    if (hasLoadedMessages && messages.length > 0) {
      void persistMessages(messages);
    }
  }, [messages, hasLoadedMessages]);

  const sendMutation = useMutation({
    mutationFn: async (payload: { text: string; imageBase64?: string }) => {
      console.log('[DrToxi] Sending message:', payload.text.substring(0, 50));

      const conversationHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const systemPrompt = payload.imageBase64
        ? DR_TOXI_SYSTEM_PROMPT + '\n\n--- MODE SCANNER VISION ---\n\n' + DR_TOXI_VISION_PROMPT
        : DR_TOXI_SYSTEM_PROMPT;

      const userContent: string | Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = payload.imageBase64
        ? [
            { type: 'text' as const, text: payload.text || 'Analyse ce produit pour moi.' },
            { type: 'image' as const, image: payload.imageBase64 },
          ]
        : payload.text;

      const response = await generateText({
        messages: [
          { role: 'user' as const, content: systemPrompt },
          { role: 'assistant' as const, content: 'Compris ! Je suis Dr. Toxi, ton conseiller santé du quotidien. Je suis prêt à t\'aider.' },
          ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user' as const, content: userContent },
        ],
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
        id: Date.now().toString() + '_assistant',
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsAnalyzingImage(false);
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    onError: (error) => {
      console.error('[DrToxi] Error:', error);
      setIsAnalyzingImage(false);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '_error',
        role: 'assistant',
        content: 'Oups, j\'ai pas réussi à analyser cette image 😅 Réessaie en prenant la photo un peu plus près, avec une bonne lumière. Vise bien la liste d\'ingrédients !',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
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

    const userMessage: ChatMessage = {
      id: Date.now().toString() + '_user',
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    sendMutation.mutate({ text: messageText });
  }, [input, sendMutation, canUseDrToxi]);

  const handleImagePicked = useCallback(async (uri: string) => {
    if (!canUseDrToxi) {
      console.log('[DrToxi] Message limit reached, showing paywall');
      router.push('/paywall?source=drtoxi');
      return;
    }

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString() + '_user',
      role: 'user',
      content: '📸 Photo envoyée pour analyse',
      timestamp: new Date().toISOString(),
      imageUri: uri,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsAnalyzingImage(true);

    try {
      console.log('[DrToxi] Compressing image for vision analysis...');
      const base64 = await getBase64FromUri(uri);
      console.log('[DrToxi] Image compressed, base64 length:', base64.length);
      sendMutation.mutate({ text: 'Analyse cette photo de produit ou d\'étiquette d\'ingrédients.', imageBase64: base64 });
    } catch (error) {
      console.error('[DrToxi] Image compression error:', error);
      setIsAnalyzingImage(false);
      const errorMsg: ChatMessage = {
        id: Date.now().toString() + '_error',
        role: 'assistant',
        content: 'Oups, j\'ai pas réussi à traiter cette image. Réessaie avec une autre photo !',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  }, [canUseDrToxi, sendMutation]);

  const handleCameraPress = useCallback(async () => {
    if (sendMutation.isPending || isAnalyzingImage) return;

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Dr. Toxi a besoin de ta caméra 📸',
          'Pour analyser les étiquettes de tes produits en direct et te donner un verdict instantané.',
          [
            { text: 'Plus tard', style: 'cancel' },
            { text: 'Autoriser la caméra', onPress: () => {
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
      Alert.alert('Erreur', 'Impossible d\'ouvrir la caméra. Essaie de choisir une photo depuis ta galerie.');
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
      'Scanne un produit',
      'Assure-toi que le texte est net et bien éclairé',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: '📁 Galerie', onPress: () => void handleGalleryPress() },
        { text: '📷 Caméra', onPress: () => void handleCameraPress() },
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
        message: `Dr. Toxi (ToxiScan) :\n\n${content}\n\nScannez vos produits avec ToxiScan — gratuit sur l'App Store`,
      });
      if (result.action === Share.sharedAction) {
        recordShare();
        console.log('[DrToxi] Share completed, badge recorded');
      }
    } catch (error) {
      console.log('[DrToxi] Share error:', error);
    }
  }, [recordShare]);

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
                📸 Photo envoyée pour analyse
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
            <TouchableOpacity
              style={styles.shareResponseButton}
              onPress={() => handleShareResponse(item.content)}
              activeOpacity={0.7}
            >
              <Share2 color={Colors.textSecondary} size={14} />
              <Text style={styles.shareResponseText}>Partager</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [handleShareResponse]);

  const isLoading = sendMutation.isPending || isAnalyzingImage;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Image source={{ uri: DR_TOXI_AVATAR }} style={styles.avatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Dr. Toxi</Text>
          <Text style={styles.headerSubtitle}>Ton conseiller santé du quotidien</Text>
        </View>
      </View>

      <Text style={styles.disclaimerText}>
        Informatif uniquement — ne remplace pas un avis médical.
      </Text>

      {!isPro && (
        <View style={styles.counterBanner}>
          <Text style={styles.counterText}>
            {drToxiRemaining}/{drToxiLimit} messages gratuits aujourd'hui — Illimité avec Pro
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
                <Text style={styles.scanInChatTitle}>Scanne un produit</Text>
                <Text style={styles.scanInChatSubtitle}>Prends en photo une étiquette pour un verdict instantané</Text>
              </View>
              <ChevronRight color={Colors.primary} size={18} />
            </TouchableOpacity>

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
                  ? `🔍 ${VISION_LOADING_MESSAGES[visionTipIndex]}`
                  : 'Dr. Toxi réfléchit...'}
              </Text>
            </View>
            {!isAnalyzingImage && (
              <View style={styles.tipBanner}>
                <Text style={styles.tipLabel}>Le saviez-vous ?</Text>
                <Text style={styles.tipText}>{LOADING_TIPS[tipIndex]}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={[styles.cameraButton, isLoading && styles.cameraButtonDisabled]}
            onPress={handlePhotoAction}
            disabled={isLoading}
            activeOpacity={0.7}
            testID="camera-button"
          >
            <Camera color={isLoading ? Colors.textTertiary : Colors.primary} size={20} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Posez votre question..."
            placeholderTextColor={Colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            testID="chat-input"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || isLoading}
            testID="send-button"
          >
            <Send color={Colors.white} size={18} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 2,
  },
  counterBanner: {
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  counterText: {
    fontSize: 12,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '500' as const,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 17,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  scanInChatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginBottom: 28,
    width: '100%',
    gap: 12,
  },
  scanInChatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
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
    marginTop: 2,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.text,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: 12,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  botBubble: {
    backgroundColor: Colors.surfaceSecondary,
    borderBottomLeftRadius: 4,
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
    borderRadius: 14,
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
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  shareResponseText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  tipBanner: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    borderRadius: 12,
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginBottom: 2,
  },
  tipText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cameraButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  cameraButtonDisabled: {
    opacity: 0.4,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
