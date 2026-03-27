import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, Brain } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function AIConsentScreen() {
  const { acceptAIConsent } = useOnboarding();

  const handleAccept = useCallback(() => {
    console.log('[AIConsent] User accepted AI consent');
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    acceptAIConsent();
    router.replace('/onboarding');
  }, [acceptAIConsent]);

  const handlePrivacy = useCallback(() => {
    console.log('[AIConsent] Opening privacy policy');
    router.push('/privacy');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconRow}>
          <View style={styles.iconContainer}>
            <Brain color={Colors.primary} size={36} />
          </View>
          <View style={styles.iconContainer}>
            <ShieldCheck color={Colors.primary} size={36} />
          </View>
        </View>

        <Text style={styles.title}>ToxiScan utilise le Toolkit IA de Rork</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Cette application utilise le Toolkit IA de Rork pour :
          </Text>

          <View style={styles.bulletList}>
            <View style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>Analyser les photos de listes d'ingrédients</Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>Identifier les substances dans tout objet du quotidien</Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>Répondre à vos questions via Dr. Toxi</Text>
            </View>
          </View>

          <Text style={styles.infoTextSecondary}>
            Vos photos et messages sont traités par le Toolkit IA de Rork de manière sécurisée. Aucune donnée personnelle n'est conservée.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.acceptButton}
          onPress={handleAccept}
          activeOpacity={0.8}
          testID="accept-ai-consent"
        >
          <Text style={styles.acceptButtonText}>J'accepte et je continue</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePrivacy} style={styles.privacyLink} testID="privacy-link">
          <Text style={styles.privacyLinkText}>Politique de confidentialité</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 32,
  },
  infoText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 14,
  },
  bulletList: {
    gap: 10,
    marginBottom: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  infoTextSecondary: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  acceptButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  acceptButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  privacyLink: {
    paddingVertical: 8,
  },
  privacyLinkText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
