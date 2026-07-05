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
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Camera, Leaf, ScanLine, ShieldCheck, Sparkles, Utensils } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { t, pick } from '@/utils/i18n';
import { DR_TOXI_BADGE_AVATARS, DR_TOXI_DEFAULT_AVATAR_URI } from '@/constants/drToxiAvatars';

const BARCODE_BARS: number[] = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1];

/** The full 5-tier verdict hierarchy shown as a scale on the intro (best → worst). */
const VERDICT_SCALE = [
  { key: 'approved', color: '#2E9E34', labelKey: 'filter_approved' },
  { key: 'moderation', color: '#EAB308', labelKey: 'filter_caution' },
  { key: 'processed', color: '#E8730A', labelKey: 'filter_warning' },
  { key: 'ultra_toxic', color: '#722F37', labelKey: 'filter_ultra_toxic' },
  { key: 'carcinogenic', color: '#D0260F', labelKey: 'filter_danger' },
] as const;

export default function OnboardingScreen() {
  const { completeOnboarding, hasSeenMealOnboarding } = useOnboarding();
  const buttonScale = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  const avatarPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 9, tension: 72 }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(avatarPulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    ).start();
  }, [avatarPulse, fade, slide]);

  const finish = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    completeOnboarding();
    if (hasSeenMealOnboarding === false) {
      router.replace('/meal-onboarding');
      return;
    }
    router.replace('/');
  }, [completeOnboarding, hasSeenMealOnboarding]);

  const handleStart = useCallback(() => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 70, useNativeDriver: true }),
    ]).start(finish);
  }, [buttonScale, finish]);

  const pulseScale = avatarPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const pulseOpacity = avatarPulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.34] });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.flex, { opacity: fade, transform: [{ translateY: slide }] }]}>
        <View style={styles.header}>
          <View style={styles.progressPill}>
            <View style={styles.progressDotActive} />
            <View style={styles.progressDot} />
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
          <LinearGradient
            colors={['#FFFFFC', '#F8F5EE', '#EEF7EF']}
            locations={[0, 0.54, 1]}
            style={styles.heroCard}
          >
            <View style={styles.heroGlowTop} />
            <View style={styles.heroGlowBottom} />

            <View style={styles.officialPill}>
              <Sparkles color={Colors.primary} size={14} strokeWidth={2.4} />
              <Text style={styles.officialPillText}>{pick({ fr: 'GUIDE DR. TOXI', en: 'DR. TOXI GUIDE', ko: 'DR. TOXI 가이드' })}</Text>
            </View>

            <View style={styles.avatarStage}>
              <Animated.View style={[styles.avatarAura, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
              <View style={styles.avatarDisc}>
                <Image source={{ uri: DR_TOXI_DEFAULT_AVATAR_URI }} style={styles.avatar} contentFit="contain" />
              </View>
              <View style={styles.verifiedBadge}>
                <ShieldCheck color={Colors.white} size={15} strokeWidth={2.6} />
              </View>
            </View>

            <Text style={styles.title}>
              {pick({
                fr: 'Scanne produits et repas. Dr. Toxi t’explique le risque.',
                en: 'Scan products and meals. Dr. Toxi explains the risk.',
                ko: '제품과 식사를 스캔하세요. Dr. Toxi가 위험도를 설명합니다.',
              })}
            </Text>
            <Text style={styles.subtitle}>
              {pick({
                fr: 'Une seule photo suffit : étiquette, ingrédients ou assiette. Tu obtiens un verdict clair, les alertes importantes et une meilleure alternative quand c’est utile.',
                en: 'One photo is enough: label, ingredients, or plate. You get a clear verdict, key alerts, and a better alternative when helpful.',
                ko: '사진 한 장이면 충분합니다: 라벨, 성분표 또는 식사. 명확한 판정과 주요 경고, 필요할 땐 더 나은 대안을 받습니다.',
              })}
            </Text>

            <View style={styles.visualGrid}>
              <View style={styles.scanModeCard}>
                <View style={styles.modeHeader}>
                  <View style={styles.modeIconGreen}>
                    <ScanLine color={Colors.primary} size={18} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.modeTitle}>{pick({ fr: 'Produit', en: 'Product', ko: '제품' })}</Text>
                </View>
                <View style={styles.labelMock}>
                  <Text style={styles.labelMockTitle}>{pick({ fr: 'INGRÉDIENTS', en: 'INGREDIENTS', ko: '성분' })}</Text>
                  <Text style={styles.labelMockText}>Eau, sucre, huile de palme, E471…</Text>
                  <View style={styles.barcode}>
                    {BARCODE_BARS.map((w, i) => <View key={`bar-${i}`} style={[styles.bar, { width: w }]} />)}
                  </View>
                </View>
                <View style={styles.verdictMiniRow}>
                  <Image source={{ uri: DR_TOXI_BADGE_AVATARS.danger }} style={styles.miniAvatar} contentFit="contain" />
                  <Text style={styles.redSignal}>{t('badge_danger')}</Text>
                </View>
              </View>

              <View style={styles.scanModeCard}>
                <View style={styles.modeHeader}>
                  <View style={styles.modeIconCream}>
                    <Utensils color={Colors.warning} size={18} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.modeTitle}>{pick({ fr: 'Repas', en: 'Meal', ko: '식사' })}</Text>
                </View>
                <View style={styles.mealScoreMock}>
                  <Text style={styles.scoreNumber}>7</Text>
                  <Text style={styles.scoreOut}>/10</Text>
                  <Text style={styles.scoreLabel}>{pick({ fr: 'TOXICITÉ', en: 'TOXICITY', ko: '독성' })}</Text>
                </View>
                <View style={styles.verdictMiniRow}>
                  <Leaf color={Colors.primary} size={17} strokeWidth={2.4} />
                  <Text style={styles.greenSignal}>{pick({ fr: 'Alternative saine', en: 'Cleaner swap', ko: '더 건강한 대안' })}</Text>
                </View>
              </View>
            </View>

            <View style={styles.scaleBlock}>
              <Text style={styles.scaleTitle}>{pick({ fr: 'LES 5 NIVEAUX DR. TOXI', en: 'THE 5 DR. TOXI LEVELS', ko: 'DR. TOXI 5단계' })}</Text>
              <View style={styles.scaleRow}>
                {VERDICT_SCALE.map((lvl) => (
                  <View key={lvl.key} style={styles.scaleItem}>
                    <View style={[styles.scaleDot, { backgroundColor: lvl.color }]} />
                    <Text style={styles.scaleLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t(lvl.labelKey)}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.promiseRow}>
              <View style={styles.promiseChip}>
                <Camera color={Colors.primary} size={14} strokeWidth={2.4} />
                <Text style={styles.promiseText}>{pick({ fr: '1 photo', en: '1 photo', ko: '사진 1장' })}</Text>
              </View>
              <View style={styles.promiseChip}>
                <ShieldCheck color={Colors.primary} size={14} strokeWidth={2.4} />
                <Text style={styles.promiseText}>{pick({ fr: 'Verdict clair', en: 'Clear verdict', ko: '명확한 판정' })}</Text>
              </View>
              <View style={styles.promiseChip}>
                <Leaf color={Colors.primary} size={14} strokeWidth={2.4} />
                <Text style={styles.promiseText}>{pick({ fr: 'Alternatives', en: 'Swaps', ko: '대안' })}</Text>
              </View>
            </View>
          </LinearGradient>
        </ScrollView>

        <View style={styles.footer}>
          <Animated.View style={[styles.buttonWrap, { transform: [{ scale: buttonScale }] }]}> 
            <TouchableOpacity
              style={styles.button}
              onPress={handleStart}
              activeOpacity={0.9}
              testID="onboarding-start"
            >
              <Text style={styles.buttonText}>{t('mob_continue')}</Text>
              <ArrowRight color={Colors.white} size={21} strokeWidth={2.7} />
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
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  progressPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  progressDotActive: { width: 28, height: 8, borderRadius: 8, backgroundColor: Colors.primary },
  progressDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: Colors.border },
  skipBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipText: { fontSize: 14, fontWeight: '700' as const, color: Colors.textSecondary },
  scrollContent: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12 },
  heroCard: {
    borderRadius: 34,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: 'rgba(232,225,214,0.92)',
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  heroGlowTop: {
    position: 'absolute' as const,
    top: -82,
    left: -70,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(46,158,52,0.11)',
  },
  heroGlowBottom: {
    position: 'absolute' as const,
    right: -88,
    bottom: 74,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(232,115,10,0.08)',
  },
  officialPill: {
    alignSelf: 'center' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(46,158,52,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(46,158,52,0.16)',
  },
  officialPillText: { fontSize: 11, fontWeight: '900' as const, color: Colors.primary, letterSpacing: 1.2 },
  avatarStage: { alignSelf: 'center' as const, width: 132, height: 132, marginTop: 14, marginBottom: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  avatarAura: { position: 'absolute' as const, width: 126, height: 126, borderRadius: 63, backgroundColor: Colors.primary },
  avatarDisc: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: Colors.white,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden' as const,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 5,
  },
  avatar: { width: 96, height: 96 },
  verifiedBadge: {
    position: 'absolute' as const,
    right: 12,
    bottom: 17,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.white,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '900' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    letterSpacing: -0.8,
    paddingHorizontal: 4,
  },
  subtitle: {
    fontSize: 15.5,
    lineHeight: 23,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 12,
    paddingHorizontal: 6,
    fontWeight: '500' as const,
  },
  visualGrid: { flexDirection: 'row' as const, gap: 12, marginTop: 22 },
  scanModeCard: {
    flex: 1,
    minHeight: 190,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(232,225,214,0.92)',
    padding: 12,
  },
  modeHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 12 },
  modeIconGreen: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(46,158,52,0.12)', alignItems: 'center' as const, justifyContent: 'center' as const },
  modeIconCream: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(232,115,10,0.11)', alignItems: 'center' as const, justifyContent: 'center' as const },
  modeTitle: { fontSize: 15, fontWeight: '900' as const, color: Colors.text, letterSpacing: -0.2 },
  labelMock: { borderRadius: 17, backgroundColor: '#F7F9F4', borderWidth: 1, borderColor: 'rgba(46,158,52,0.12)', padding: 10, minHeight: 98 },
  labelMockTitle: { fontSize: 10, fontWeight: '900' as const, color: Colors.primary, letterSpacing: 0.7, marginBottom: 5 },
  labelMockText: { fontSize: 10.5, lineHeight: 14, color: Colors.text, fontWeight: '600' as const },
  barcode: { flexDirection: 'row' as const, alignItems: 'flex-end' as const, height: 22, marginTop: 8, gap: 1 },
  bar: { height: 22, backgroundColor: Colors.text, borderRadius: 0.5 },
  mealScoreMock: { height: 98, borderRadius: 49, alignSelf: 'center' as const, aspectRatio: 1, borderWidth: 8, borderColor: Colors.warning, backgroundColor: Colors.white, alignItems: 'center' as const, justifyContent: 'center' as const },
  scoreNumber: { fontSize: 30, fontWeight: '900' as const, color: Colors.warning, lineHeight: 31 },
  scoreOut: { position: 'absolute' as const, right: 15, top: 33, fontSize: 14, fontWeight: '800' as const, color: Colors.textTertiary },
  scoreLabel: { fontSize: 8.5, fontWeight: '900' as const, color: Colors.textSecondary, letterSpacing: 0.8, marginTop: 2 },
  verdictMiniRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7, marginTop: 12, minHeight: 30 },
  miniAvatar: { width: 30, height: 30 },
  redSignal: { flex: 1, fontSize: 11.5, fontWeight: '900' as const, color: Colors.danger, letterSpacing: 0.1 },
  greenSignal: { flex: 1, fontSize: 11.5, fontWeight: '900' as const, color: Colors.primary, letterSpacing: 0.1 },
  scaleBlock: { marginTop: 20, paddingHorizontal: 2 },
  scaleTitle: { fontSize: 11, fontWeight: '900' as const, color: Colors.textSecondary, letterSpacing: 1, textAlign: 'center' as const, marginBottom: 12 },
  scaleRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 4 },
  scaleItem: { flex: 1, alignItems: 'center' as const, gap: 6 },
  scaleDot: { width: 16, height: 16, borderRadius: 8 },
  scaleLabel: { fontSize: 8.5, fontWeight: '900' as const, color: Colors.text, letterSpacing: 0.1, textAlign: 'center' as const },
  promiseRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'center' as const, gap: 8, marginTop: 18 },
  promiseChip: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: Colors.borderLight },
  promiseText: { fontSize: 12.5, fontWeight: '800' as const, color: Colors.text },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 10, gap: 12 },
  buttonWrap: { width: '100%' },
  button: {
    width: '100%',
    flexDirection: 'row' as const,
    paddingVertical: 17,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 6,
  },
  buttonText: { color: Colors.white, fontSize: 18, fontWeight: '900' as const, letterSpacing: 0.1 },
  scienceRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 7 },
  scienceText: { fontSize: 12.5, color: Colors.textSecondary, fontWeight: '700' as const },
});
