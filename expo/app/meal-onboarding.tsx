import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import {
  ChevronLeft,
  ArrowRight,
  Bell,
  Camera,
  Leaf,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { t, pick } from '@/utils/i18n';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { DR_TOXI_DEFAULT_AVATAR_URI } from '@/constants/drToxiAvatars';
import {
  MEAL_TIER_AVATARS,
  MEAL_TIER_COLORS,
  MEAL_TIER_SOFT,
  MEAL_CATEGORY_COLORS,
  mealCategoryLabel,
  mealTierLabel,
} from '@/constants/mealAvatars';
import type { MealTier, MealCategory } from '@/utils/mealAnalysis';
import ToxicityScoreRing from '@/components/ToxicityScoreRing';
import ReminderToggleList from '@/components/ReminderToggleList';
import {
  loadReminderPrefs,
  saveReminderPrefs,
  getDefaultReminderPrefs,
  type ReminderPrefs,
} from '@/utils/reminderPrefs';
import { requestNotificationPermission, syncMealReminders } from '@/utils/notifications';

const PRESENTATION_STEPS = 2;
const TOTAL_STEPS = 3;

const TIER_ORDER: MealTier[] = ['green', 'yellow', 'orange', 'red'];

export default function MealOnboardingScreen() {
  const { completeMealOnboarding } = useOnboarding();
  const [step, setStep] = useState<number>(0);
  const [prefs, setPrefs] = useState<ReminderPrefs>(getDefaultReminderPrefs());
  const [busy, setBusy] = useState<boolean>(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void loadReminderPrefs().then(setPrefs);
  }, []);

  useEffect(() => {
    fade.setValue(0);
    slide.setValue(14);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 9, tension: 70 }),
    ]).start();
  }, [step, fade, slide]);

  const finish = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    completeMealOnboarding();
    router.replace('/');
  }, [completeMealOnboarding]);

  const goNext = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }, []);

  const goBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const skipToNotif = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setStep(PRESENTATION_STEPS);
  }, []);

  const handleEnable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const granted = await requestNotificationPermission();
      const next: ReminderPrefs = { ...prefs, notificationsEnabled: granted, configured: true };
      await saveReminderPrefs(next);
      await syncMealReminders([]);
      if (!granted && Platform.OS !== 'web') {
        Alert.alert(t('mob_notif_denied_title'), t('mob_notif_denied_msg'), [{ text: t('ok') }]);
      }
    } catch (e) {
      console.log('[MealOnboarding] enable failed:', e);
    } finally {
      setBusy(false);
      finish();
    }
  }, [busy, prefs, finish]);

  const handleLater = useCallback(async () => {
    if (busy) return;
    const next: ReminderPrefs = { ...prefs, notificationsEnabled: false, configured: true };
    await saveReminderPrefs(next);
    await syncMealReminders([]);
    finish();
  }, [busy, prefs, finish]);

  const isNotifStep = step === PRESENTATION_STEPS;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <View style={styles.header}>
        {step > 0 ? (
          <TouchableOpacity style={styles.headerBtn} onPress={goBack} hitSlop={10} testID="mob-back">
            <ChevronLeft color={Colors.text} size={24} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}

        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        {!isNotifStep ? (
          <TouchableOpacity style={styles.skipBtn} onPress={skipToNotif} hitSlop={10} testID="mob-skip">
            <Text style={styles.skipText}>{t('skip')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      <Animated.View style={[styles.flex, { opacity: fade, transform: [{ translateY: slide }] }]}>
        {isNotifStep ? (
          <NotifStep
            prefs={prefs}
            onChange={setPrefs}
            onEnable={handleEnable}
            onLater={handleLater}
            busy={busy}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
            {step === 0 ? <StepScan /> : null}
            {step === 1 ? <StepValue /> : null}
          </ScrollView>
        )}
      </Animated.View>

      {!isNotifStep ? (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.9} testID="mob-continue">
            <Text style={styles.primaryBtnText}>{t('mob_continue')}</Text>
            <ArrowRight color={Colors.white} size={20} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function StepHeroAvatar() {
  return (
    <View style={styles.heroAvatarHalo}>
      <Image source={{ uri: DR_TOXI_DEFAULT_AVATAR_URI }} style={styles.heroAvatar} contentFit="contain" />
    </View>
  );
}

function StepScan() {
  return (
    <View style={styles.stepWrap}>
      <View style={styles.eyebrowPill}>
        <Text style={styles.eyebrowText}>{t('mob_1_eyebrow')}</Text>
      </View>

      <View style={styles.scanVisual}>
        <View style={styles.scanPhotoCard}>
          <View style={styles.scanPhotoInner}>
            <Camera color={Colors.primary} size={30} strokeWidth={2} />
          </View>
          <View style={styles.scanRingFloat}>
            <ToxicityScoreRing score={7} tier="orange" size={104} stroke={10} label={t('meal_toxicity_word')} />
          </View>
        </View>
      </View>

      <Text style={styles.title}>{t('mob_1_title')}</Text>
      <Text style={styles.body}>{t('mob_1_body')}</Text>

      <Text style={styles.tiersLabel}>{t('mob_1_tiers_label')}</Text>
      <View style={styles.tierLegend}>
        {TIER_ORDER.map((tier) => (
          <View key={tier} style={styles.tierChip}>
            <View style={[styles.tierAvatarRing, { backgroundColor: MEAL_TIER_SOFT[tier], borderColor: MEAL_TIER_COLORS[tier] }]}>
              <Image source={{ uri: MEAL_TIER_AVATARS[tier] }} style={styles.tierAvatarImg} contentFit="contain" />
            </View>
            <Text style={styles.tierChipText}>{mealTierLabel(tier)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MockIngredient({ name, category, grave }: { name: string; category: MealCategory; grave?: boolean }) {
  return (
    <View style={styles.mockRow}>
      <View style={[styles.mockDot, { backgroundColor: MEAL_CATEGORY_COLORS[category] }]} />
      <Text style={styles.mockName}>{name}</Text>
      <View style={styles.mockMeta}>
        {grave ? (
          <View style={styles.graveTag}>
            <AlertTriangle color="#D0260F" size={10} strokeWidth={2.4} />
            <Text style={styles.graveTagText}>{t('meal_grave_tag')}</Text>
          </View>
        ) : null}
        <Text style={[styles.mockCat, { color: MEAL_CATEGORY_COLORS[category] }]}>{mealCategoryLabel(category)}</Text>
      </View>
    </View>
  );
}

function StepValue() {
  return (
    <View style={styles.stepWrap}>
      <StepHeroAvatar />
      <Text style={styles.title}>{t('mob_2_title')}</Text>
      <Text style={styles.body}>{t('mob_2_body')}</Text>

      <View style={styles.mockCard}>
        <MockIngredient name={pick({ fr: 'Tomate', en: 'Tomato', ko: '토마토' })} category="healthy" />
        <MockIngredient name={pick({ fr: 'Huile de palme', en: 'Palm oil', ko: '팜유' })} category="refined_oil" />
        <MockIngredient name={pick({ fr: 'Jambon', en: 'Ham', ko: '햄' })} category="carcinogen_g1" grave />
      </View>

      <View style={styles.altCard}>
        <View style={styles.altIcon}>
          <Leaf color={Colors.primary} size={18} strokeWidth={2.2} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.altLabel}>{t('mob_2_alt_label')}</Text>
          <Text style={styles.altText}>
            {pick({
              fr: 'Pizza maison : pâte simple, légumes frais, mozzarella.',
              en: 'Homemade pizza: simple dough, fresh veggies, mozzarella.',
              ko: '홈메이드 피자: 간단한 도우, 신선한 채소, 모차렐라.',
            })}
          </Text>
        </View>
      </View>

      <View style={styles.weeklyStrip}>
        <View style={styles.weeklyIcon}>
          <TrendingUp color={Colors.primary} size={18} strokeWidth={2.2} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.weeklyLabel}>{t('mob_3_title')}</Text>
          <Text style={styles.weeklyText}>{t('mob_3_body')}</Text>
        </View>
      </View>
    </View>
  );
}

function NotifStep({
  prefs,
  onChange,
  onEnable,
  onLater,
  busy,
}: {
  prefs: ReminderPrefs;
  onChange: (p: ReminderPrefs) => void;
  onEnable: () => void;
  onLater: () => void;
  busy: boolean;
}) {
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.notifScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.notifIconWrap}>
          <Bell color={Colors.primary} size={30} strokeWidth={2.1} />
        </View>
        <Text style={styles.title}>{t('mob_notif_title')}</Text>
        <Text style={styles.body}>{t('mob_notif_body')}</Text>

        <Text style={styles.remindersLabel}>{t('mob_notif_reminders_label')}</Text>
        <ReminderToggleList prefs={prefs} onChange={onChange} />

        <View style={styles.fridayNote}>
          <Text style={styles.fridayNoteText}>{t('mob_notif_friday_note')}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onEnable} activeOpacity={0.9} disabled={busy} testID="mob-enable">
          {busy ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Bell color={Colors.white} size={18} strokeWidth={2.4} />
              <Text style={styles.primaryBtnText}>{t('mob_notif_enable')}</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.laterBtn} onPress={onLater} activeOpacity={0.7} disabled={busy} testID="mob-later">
          <Text style={styles.laterText}>{t('mob_notif_later')}</Text>
        </TouchableOpacity>
        <Text style={styles.settingsHint}>{t('mob_notif_settings_hint')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerBtn: { width: 64, height: 36, justifyContent: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { width: 22, backgroundColor: Colors.primary },
  skipBtn: { width: 64, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
  skipText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, flexGrow: 1 },
  stepWrap: { flex: 1, alignItems: 'center' },

  eyebrowPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(46,158,52,0.12)',
    marginTop: 8,
    marginBottom: 18,
  },
  eyebrowText: { fontSize: 11, fontWeight: '800' as const, color: Colors.primary, letterSpacing: 1.4 },

  scanVisual: { width: '100%', alignItems: 'center', marginBottom: 28 },
  scanPhotoCard: {
    width: 220,
    height: 168,
    borderRadius: 26,
    backgroundColor: '#E7F0E4',
    borderWidth: 1,
    borderColor: 'rgba(46,158,52,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 5,
  },
  scanPhotoInner: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanRingFloat: {
    position: 'absolute',
    bottom: -34,
    right: -10,
    backgroundColor: Colors.white,
    borderRadius: 60,
    padding: 6,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },

  heroAvatarHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  heroAvatar: { width: 80, height: 80 },

  title: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  body: {
    fontSize: 15.5,
    lineHeight: 23,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 6,
  },

  tiersLabel: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.3,
    marginTop: 30,
    marginBottom: 14,
  },
  tierLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 6,
    paddingRight: 15,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tierAvatarRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  tierAvatarImg: { width: 30, height: 30 },
  tierChipText: { fontSize: 13.5, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.1 },

  mockCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 28,
  },
  mockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  mockDot: { width: 11, height: 11, borderRadius: 6 },
  mockName: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  mockMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mockCat: { fontSize: 12.5, fontWeight: '700' as const },
  graveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(208,38,15,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  graveTagText: { fontSize: 10, fontWeight: '900' as const, color: '#D0260F', letterSpacing: 0.4 },

  altCard: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F7FDF9',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(46,158,52,0.22)',
    marginTop: 14,
  },
  altIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(46,158,52,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  altLabel: { fontSize: 12, fontWeight: '800' as const, color: Colors.primary, letterSpacing: 0.3, textTransform: 'uppercase' as const },
  altText: { fontSize: 14, color: Colors.text, lineHeight: 20, marginTop: 4 },

  weeklyStrip: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 14,
  },
  weeklyIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(46,158,52,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyLabel: { fontSize: 14.5, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.2 },
  weeklyText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 3 },

  notifScroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20, alignItems: 'center' },
  notifIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(46,158,52,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  remindersLabel: {
    alignSelf: 'flex-start',
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.4,
    marginTop: 28,
    marginBottom: 12,
  },
  fridayNote: {
    width: '100%',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  fridayNoteText: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary, textAlign: 'center' },

  footer: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 12, gap: 10 },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    paddingVertical: 17,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  primaryBtnText: { color: Colors.white, fontSize: 17, fontWeight: '800' as const, letterSpacing: 0.2 },
  laterBtn: { paddingVertical: 12, alignItems: 'center' },
  laterText: { fontSize: 15, fontWeight: '600' as const, color: Colors.textSecondary },
  settingsHint: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center', paddingHorizontal: 10 },
});
