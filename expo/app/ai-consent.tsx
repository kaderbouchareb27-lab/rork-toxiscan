import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brain } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { t } from '@/utils/i18n';

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
        <View style={styles.iconContainer}>
          <Brain color={Colors.primary} size={36} strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>{t('ai_consent_title')}</Text>

        <Text style={styles.description}>
          {t('ai_consent_desc')}
        </Text>

        <View style={styles.techCard}>
          <Text style={styles.techLabel}>{t('tech_used')}</Text>
          <Text style={styles.techValue}>OpenAI GPT-4o (texte et vision)</Text>
          <Text style={styles.techValue}>Open Food Facts (données produits)</Text>
        </View>

        <Text style={styles.disclaimerText}>
          {t('ai_disclaimer_1')}
        </Text>

        <Text style={styles.disclaimerText}>
          {t('ai_disclaimer_2')}
        </Text>

        <TouchableOpacity
          style={styles.acceptButton}
          onPress={handleAccept}
          activeOpacity={0.8}
          testID="accept-ai-consent"
        >
          <Text style={styles.acceptButtonText}>{t('understood')}</Text>
        </TouchableOpacity>

        <Text style={styles.privacyText}>{t('ai_privacy_note')}</Text>

        <TouchableOpacity onPress={handlePrivacy} style={styles.privacyLink} testID="privacy-link">
          <Text style={styles.privacyLinkText}>{t('privacy_policy')}</Text>
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
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(46, 158, 52, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  techCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  techLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  techValue: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  disclaimerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  acceptButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    marginTop: 16,
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
  privacyText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
    paddingHorizontal: 16,
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
