import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { DR_TOXI_DEFAULT_AVATAR_URI } from '@/constants/drToxiAvatars';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { t, isEnglish } from '@/utils/i18n';

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
          <Image source={{ uri: DR_TOXI_DEFAULT_AVATAR_URI }} style={styles.avatarImage} resizeMode="contain" />
        </View>

        <Text style={styles.title}>{t('ai_consent_title')}</Text>

        <Text style={styles.description}>
          {t('ai_consent_desc')}
        </Text>

        <View style={styles.techCard}>
          <Text style={styles.techLabel}>{t('tech_used')}</Text>
          <Text style={styles.techValue}>{isEnglish() ? 'Advanced AI (text + vision analysis)' : 'IA avancée (analyse texte + vision)'}</Text>
          <Text style={styles.techValue}>{isEnglish() ? 'Dr.Toxi proprietary database — enriched with global cancer research (IARC/WHO, EFSA, FDA, NTP, INSERM) and continuously updated each time a new ingredient is declared carcinogenic or ultra-processed worldwide.' : "Base de données propriétaire Dr.Toxi — enrichie par les recherches mondiales sur le cancer (CIRC/OMS, EFSA, FDA, NTP, INSERM) et mise à jour en continu à chaque nouvel ingrédient déclaré cancérigène ou ultra-transformé dans le monde."}</Text>
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: 64,
    height: 64,
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
