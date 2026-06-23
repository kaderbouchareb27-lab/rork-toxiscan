import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Camera, Leaf, ChevronRight, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { t } from '@/utils/i18n';
import { DR_TOXI_BADGE_AVATARS, type DrToxiVerdictLevel } from '@/constants/drToxiAvatars';

type LabelKey = 'badge_danger' | 'badge_caution' | 'badge_moderation' | 'badge_approved';
type DescKey =
  | 'onboarding_risk_avoid'
  | 'onboarding_risk_limit'
  | 'onboarding_risk_moderate'
  | 'onboarding_risk_enjoy';

interface ResultRowConfig {
  level: DrToxiVerdictLevel;
  color: string;
  tint: string;
  labelKey: LabelKey;
  descKey: DescKey;
}

const RESULT_ROWS: ResultRowConfig[] = [
  { level: 'danger', color: '#D0260F', tint: 'rgba(208,38,15,0.07)', labelKey: 'badge_danger', descKey: 'onboarding_risk_avoid' },
  { level: 'warning', color: '#E8730A', tint: 'rgba(232,115,10,0.08)', labelKey: 'badge_caution', descKey: 'onboarding_risk_limit' },
  { level: 'moderation', color: '#C28800', tint: 'rgba(234,179,8,0.12)', labelKey: 'badge_moderation', descKey: 'onboarding_risk_moderate' },
  { level: 'approuve', color: '#2E9E34', tint: 'rgba(46,158,52,0.08)', labelKey: 'badge_approved', descKey: 'onboarding_risk_enjoy' },
];

const BARCODE_BARS: number[] = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 2, 3, 1, 1, 2];

export default function OnboardingScreen() {
  const { completeOnboarding, hasSeenMealOnboarding } = useOnboarding();
  const buttonScale = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const rowsAnim = useRef<Animated.Value[]>(RESULT_ROWS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start();
    Animated.stagger(
      90,
      rowsAnim.map((v) => Animated.spring(v, { toValue: 1, useNativeDriver: true, friction: 8, tension: 64 })),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1150, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1150, useNativeDriver: true }),
      ]),
    ).start();
  }, [fade, pulse, rowsAnim]);

  const finish = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    completeOnboarding();
    // New users continue straight into the meal-scan onboarding; otherwise go home.
    if (hasSeenMealOnboarding === false) {
      console.log('[Onboarding] Completing onboarding → meal onboarding');
      router.replace('/meal-onboarding');
    } else {
      console.log('[Onboarding] Completing onboarding → home');
      router.replace('/');
    }
  }, [completeOnboarding, hasSeenMealOnboarding]);

  const handleStart = useCallback(() => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 70, useNativeDriver: true }),
    ]).start();
    finish();
  }, [buttonScale, finish]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const pulseGlow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.4] });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.flex, { opacity: fade }]}>
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Leaf color={Colors.white} size={19} strokeWidth={2.4} fill={Colors.white} />
          </View>
          <TouchableOpacity onPress={finish} style={styles.skipBtn} testID="onboarding-skip" hitSlop={10}>
            <Text style={styles.skipText}>{t('skip')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={styles.title}>{t('onboarding_hero_title')}</Text>
          <Text style={styles.subtitle}>{t('onboarding_hero_sub')}</Text>

          <View style={styles.scanCardWrap}>
            <View style={styles.scanCard}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              <View style={styles.labelCard}>
                <Text style={styles.labelHeader}>{t('onboarding_mock_ingredients_label')}</Text>
                <Text style={styles.labelBody}>{t('onboarding_mock_ingredients_body')}</Text>
                <View style={styles.barcode}>
                  {BARCODE_BARS.map((w, i) => (
                    <View key={`bar-${i}`} style={[styles.bar, { width: w }]} />
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.cameraBtnWrap} pointerEvents="none">
              <Animated.View style={[styles.cameraGlow, { opacity: pulseGlow, transform: [{ scale: pulseScale }] }]} />
              <View style={styles.cameraBtn}>
                <Camera color={Colors.primary} size={25} strokeWidth={2.2} />
              </View>
            </View>
          </View>

          <Text style={styles.resultsHeading}>{t('onboarding_results_heading')}</Text>

          <View style={styles.resultsList}>
            {RESULT_ROWS.map((row, i) => (
              <Animated.View
                key={row.level}
                style={{
                  opacity: rowsAnim[i],
                  transform: [
                    {
                      translateY: rowsAnim[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
                    },
                  ],
                }}
              >
                <View style={[styles.resultRow, { backgroundColor: row.tint, borderColor: `${row.color}26` }]}>
                  <View style={[styles.avatarRing, { borderColor: row.color, backgroundColor: row.tint }]}>
                    <Image
                      source={{ uri: DR_TOXI_BADGE_AVATARS[row.level] }}
                      style={styles.avatar}
                      contentFit="contain"
                    />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={[styles.rowLabel, { color: row.color }]} numberOfLines={1}>
                      {t(row.labelKey)}
                    </Text>
                    <Text style={styles.rowDescriptor} numberOfLines={1}>
                      {t(row.descKey)}
                    </Text>
                  </View>
                  <ChevronRight color={row.color} size={18} strokeWidth={2.6} />
                </View>
              </Animated.View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Animated.View style={[styles.buttonWrap, { transform: [{ scale: buttonScale }] }]}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleStart}
              activeOpacity={0.9}
              testID="onboarding-start"
            >
              <Text style={styles.buttonText}>{t('onboarding_cta_start')}</Text>
              <ArrowRight color={Colors.white} size={20} strokeWidth={2.6} />
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.scienceRow}>
            <ShieldCheck color={Colors.primary} size={14} strokeWidth={2.4} />
            <Text style={styles.scienceText}>{t('onboarding_science_footer')}</Text>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 15.5,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  scanCardWrap: {
    marginTop: 26,
    marginBottom: 44,
    alignItems: 'center' as const,
  },
  scanCard: {
    width: '100%',
    maxWidth: 330,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#E7F0E4',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(46,158,52,0.16)',
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  corner: {
    position: 'absolute' as const,
    width: 22,
    height: 22,
    borderColor: Colors.primary,
  },
  cornerTL: { top: 12, left: 12, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 7 },
  cornerTR: { top: 12, right: 12, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 7 },
  cornerBL: { bottom: 12, left: 12, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 7 },
  cornerBR: { bottom: 12, right: 12, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 7 },
  labelCard: {
    width: '78%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  labelHeader: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.primary,
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  labelBody: {
    fontSize: 11.5,
    lineHeight: 16,
    color: Colors.text,
  },
  barcode: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    height: 28,
    marginTop: 12,
    gap: 1.5,
  },
  bar: {
    height: 28,
    backgroundColor: Colors.text,
    borderRadius: 0.5,
  },
  cameraBtnWrap: {
    position: 'absolute' as const,
    bottom: -28,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cameraGlow: {
    position: 'absolute' as const,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.primary,
  },
  cameraBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(46,158,52,0.18)',
  },
  resultsHeading: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    letterSpacing: 0.2,
    marginBottom: 14,
  },
  resultsList: {
    gap: 10,
  },
  resultRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  },
  avatar: {
    width: 38,
    height: 38,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
  },
  rowDescriptor: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 14,
  },
  buttonWrap: {
    width: '100%',
  },
  button: {
    width: '100%',
    flexDirection: 'row' as const,
    paddingVertical: 17,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 17.5,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  scienceRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 7,
  },
  scienceText: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
});
