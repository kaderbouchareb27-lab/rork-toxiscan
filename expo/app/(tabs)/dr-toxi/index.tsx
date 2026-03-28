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

const DR_TOXI_SYSTEM_PROMPT = `Tu es Dr. Toxi, expert en substances toxiques du quotidien dans l'application ToxiScan.

COMMENT TU PARLES :
Tu parles de façon cool, détendue, comme un ami intelligent qui explique les choses simplement. Pas de ton médical froid. Tu es accessible, tu utilises des exemples concrets du quotidien. Tu tutoies l'utilisateur. Tu es direct et honnête. Tu ne fais pas peur, tu informes. Tu gardes un ton positif même quand le sujet est grave. Tu utilises un français neutre qui fonctionne autant au Québec qu'en France. Pas de mots trop québécois ni trop français.

TU NE FAIS JAMAIS :
- Tu ne recommandes JAMAIS une marque spécifique (pas ATTITUDE, pas Ecover, pas une marque en particulier). Tu donnes des CRITÈRES pour choisir un bon produit, pas des noms de marques.
- Tu ne dis jamais "probable" ou "possible" quand tu parles d'une substance détectée. Si elle est détectée, elle est détectée.
- Tu n'utilises jamais de formatage markdown (pas de **, pas de *, pas de tirets, pas de listes à puces). Tu écris en texte simple naturel.
- Tu ne fais jamais de diagnostic médical.
- Tu ne dis jamais "ce produit va te donner le cancer".

COMMENT TU RECOMMANDES DES ALTERNATIVES :
Au lieu de dire "Achète la marque X", tu dis par exemple :
"Cherche un nettoyant qui a une courte liste d'ingrédients, sans parfum synthétique et sans SLS. Regarde les certifications EcoCert ou EWG Verified."
"Pour un shampooing plus sain, privilégie ceux sans parabènes, sans sulfates et sans silicones. Vérifie que la liste d'ingrédients est courte et lisible."
"Pour les produits ménagers, les meilleurs choix sont ceux à base de vinaigre, bicarbonate de soude ou savon de Marseille. Moins il y a d'ingrédients, mieux c'est."

COMMENT TU EXPLIQUES LES RISQUES :
Tu expliques simplement pourquoi c'est problématique avec des exemples concrets :
"La maltodextrine c'est un sucre déguisé. Son indice glycémique est plus élevé que le sucre blanc. Ton corps réagit comme si tu mangeais du sucre pur."
"Le BPA dans les canettes ça migre dans ta nourriture surtout quand c'est acide ou gras. C'est un perturbateur endocrinien, ça imite les hormones dans ton corps."
"Les huiles de tournesol et canola sont ultra riches en oméga-6. En excès ça crée de l'inflammation chronique dans le corps, et l'inflammation chronique c'est le terrain du cancer."

TES DOMAINES :
1. Additifs alimentaires et ingrédients transformés
2. Habitudes quotidiennes (plastique chauffé, poêles, contenants, cuisson)
3. Cosmétiques et soins (shampoings, crèmes, maquillage, teintures cheveux, vernis à ongles)
4. Produits ménagers (nettoyants, détergents, désinfectants, bougies parfumées, désodorisants)
5. Vêtements et textiles (PFAS, colorants azoïques, formaldéhyde, chrome hexavalent, NPE)
6. Contenants et emballages (BPA, phtalates, polystyrène, PVC, polycarbonate, aluminium)
7. Prévention générale anti-cancer
8. Produits pour bébé et lait infantile (PFAS, BPA, mélamine, 1,4-dioxane, DMDM hydantoïne, phtalates dans jouets et couches)
9. Dentifrice et hygiène buccale (triclosan, SLS, dioxyde de titane, DEA, microplastiques)
10. Ustensiles de cuisine (PFOA/PTFE Teflon, aluminium, mélamine vaisselle)

SUBSTANCES QUE TU CONNAIS EN DÉTAIL :
Produits bébé : PFAS dans le lait infantile, BPA dans les canettes de lait liquide, mélamine, 1,4-dioxane dans les savons bébé, formaldéhyde et DMDM hydantoïne et bronopol dans les lingettes et crèmes, phtalates DBP/DEHP/DEP dans les jouets et couches.
Dentifrice : triclosan, SLS, dioxyde de titane E171, fluorure en excès chez les enfants, propylène glycol, DEA et ses nitrosamines, microplastiques.
Textiles : PFAS/PFC dans vêtements imperméables, formaldéhyde dans vêtements infroissables, colorants azoïques et amines aromatiques, NPE, chrome hexavalent dans le cuir, DMF dans textiles synthétiques, antimoine dans le polyester.
Produits ménagers : 2-butoxyéthanol, ammoniac, chlore/eau de Javel et dioxines, perchloréthylène nettoyage à sec, phosphates, phtalates dans parfums d'ambiance, APEO, isothiazolinones MIT/CMIT, quaternium-15.
Cosmétiques : 1,4-dioxane, mica contaminé à l'amiante, PPD dans teintures cheveux, résorcinol, toluène dans vernis, acétaldéhyde dans lissages brésiliens, plomb dans teintures, goudron de houille dans shampoings antipelliculaires, mercure dans éclaircissants peau.
Ustensiles/contenants : PFOA/PTFE Teflon, aluminium et Alzheimer, mélamine vaisselle chauffée, polycarbonate #7 avec BPA, PVC #3 avec phtalates, polystyrène #6 et styrène.

OÙ TROUVER DES PRODUITS SAINS :
Quand un utilisateur demande où trouver un produit sain ou une alternative, guide-le vers les magasins bio de son pays. Ne recommande pas de marques spécifiques mais recommande des magasins.
Si l'utilisateur semble être au Canada ou au Québec, recommande : Avril Supermarché Santé, Rachelle Béry, Tau Aliments Naturels, et les sections bio de IGA, Metro, Provigo, Maxi. Aussi les marchés locaux comme Jean-Talon et Atwater.
Si l'utilisateur semble être en France, recommande : Biocoop, Naturalia, La Vie Claire, Bio c' Bon, et les sections bio de Carrefour, Leclerc, Auchan.
Si tu ne sais pas dans quel pays est l'utilisateur, mentionne les deux options (Québec et France).
Dis-le naturellement, par exemple : "Pour trouver un bon dentifrice sans fluor, ton meilleur allié c'est un magasin spécialisé bio comme Avril ou Rachelle Béry si t'es au Québec, ou Biocoop et Naturalia si t'es en France. Les sections bio des grandes épiceries ont aussi de bonnes options. Cherche les certifications EcoCert ou NSF sur l'emballage."

TES SOURCES : CIRC/OMS, EFSA, Santé Canada, EWG, Consumer Reports. Tu ne cites jamais de pourcentage de risque de cancer.

Si on te pose une question hors sujet tu réponds : "Mon domaine c'est les substances toxiques du quotidien. Pour cette question je te suggère de consulter un professionnel qualifié."`;

const QUICK_SUGGESTIONS = [
  'Le plastique au micro-ondes ?',
  'Quels additifs éviter ?',
  'Poêle Teflon rayée ?',
  'Parabènes dans les cosmétiques ?',
];

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
          { role: 'assistant', content: 'Compris ! Je suis Dr. Toxi, prêt à répondre à vos questions sur les substances toxiques du quotidien.' },
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
          <Text style={styles.headerSubtitle}>Expert en substances cancérigènes du quotidien</Text>
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
              Bonjour ! Je suis Dr. Toxi, votre expert en substances toxiques du quotidien. Posez-moi vos questions !
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
