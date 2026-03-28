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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Brain, ChevronRight, Share2 } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { ChatMessage } from '@/types';
import { generateText } from '@rork-ai/toolkit-sdk';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useBadges } from '@/providers/BadgesProvider';
import { router } from 'expo-router';
import { DR_TOXI_SYSTEM_PROMPT, QUICK_SUGGESTIONS, DR_TOXI_WELCOME } from '@/constants/drToxiPrompt';

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



export default function DrToxiScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [tipIndex, setTipIndex] = useState<number>(0);
  const flatListRef = useRef<FlatList>(null);
  const { canUseDrToxi, drToxiRemaining, drToxiLimit, isPro, consumeDrToxi } = useSubscription();
  const { recordDrToxiQuestion, recordShare } = useBadges();

  const sendMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      console.log('[DrToxi] Sending message:', userMessage);

      const conversationHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const response = await generateText({
        messages: [
          { role: 'user', content: DR_TOXI_SYSTEM_PROMPT },
          { role: 'assistant', content: 'Compris ! Je suis Dr. Toxi, ton conseiller santé du quotidien. Je suis prêt à t\'aider.' },
          ...conversationHistory,
          { role: 'user', content: userMessage },
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
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    onError: (error) => {
      console.error('[DrToxi] Error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '_error',
        role: 'assistant',
        content: 'Désolé, je n\'ai pas pu traiter votre demande. Réessayez dans un instant.',
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
    sendMutation.mutate(messageText);
  }, [input, sendMutation, canUseDrToxi]);

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
          <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
            <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.botMessageText]}>
              {item.content}
            </Text>
          </View>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Image source={{ uri: DR_TOXI_AVATAR }} style={styles.avatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Dr. Toxi</Text>
          <Text style={styles.headerSubtitle}>Ton conseiller santé du quotidien</Text>
        </View>
      </View>

      <View style={styles.disclaimerBanner}>
        <Text style={styles.disclaimerText}>
          Les réponses de Dr. Toxi sont à titre informatif uniquement et ne remplacent pas un avis médical.
        </Text>
      </View>

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

            <TouchableOpacity
              style={styles.quizCard}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                router.push('/quiz');
              }}
              activeOpacity={0.8}
              testID="quiz-launch"
            >
              <View style={styles.quizCardLeft}>
                <View style={styles.quizIconContainer}>
                  <Brain color={Colors.primary} size={20} strokeWidth={2} />
                </View>
                <View style={styles.quizCardContent}>
                  <Text style={styles.quizCardTitle}>Quiz Santé</Text>
                  <Text style={styles.quizCardSubtitle}>10 questions pour tester vos connaissances</Text>
                </View>
              </View>
              <ChevronRight color={Colors.primary} size={20} />
            </TouchableOpacity>
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

        {sendMutation.isPending && (
          <View style={styles.typingContainer}>
            <View style={styles.typingIndicator}>
              <Image source={{ uri: DR_TOXI_AVATAR }} style={styles.avatarSmall} />
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>Dr. Toxi réfléchit...</Text>
            </View>
            <View style={styles.tipBanner}>
              <Text style={styles.tipLabel}>Le saviez-vous ?</Text>
              <Text style={styles.tipText}>{LOADING_TIPS[tipIndex]}</Text>
            </View>
          </View>
        )}

        <View style={styles.inputContainer}>
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
            style={[styles.sendButton, (!input.trim() || sendMutation.isPending) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || sendMutation.isPending}
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
  disclaimerBanner: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
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
  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(52, 199, 89, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.12)',
    marginTop: 20,
    width: '100%',
  },
  quizCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  quizIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizCardContent: {
    flex: 1,
  },
  quizCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  quizCardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
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
