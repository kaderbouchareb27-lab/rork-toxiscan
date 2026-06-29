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
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { ArrowRight, Bell, CalendarCheck, ShieldCheck, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { t, pick } from '@/utils/i18n';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { DR_TOXI_DEFAULT_AVATAR_URI } from '@/constants/drToxiAvatars';
import ReminderToggleList from '@/components/ReminderToggleList';
import {
  loadReminderPrefs,
  saveReminderPrefs,
  getDefaultReminderPrefs,
  type ReminderPrefs,
} from '@/utils/reminderPrefs';
import { requestNotificationPermission, syncMealReminders } from '@/utils/notifications';

export default function MealOnboardingScreen() {
  const { completeMealOnboarding } = useOnboarding();
  const [prefs, setPrefs] = useState<ReminderPrefs>(getDefaultReminderPrefs());
  const [busy, setBusy] = useState<boolean>(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(14)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void loadReminderPrefs().then(setPrefs);
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 9, tension: 70 }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    ).start();
  }, [fade, pulse, slide]);

  const finish = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    completeMealOnboarding();
    router.replace('/');
  }, [completeMealOnboarding]);

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

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.32] });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <View style={styles.header}>
        <View style={styles.progressPill}>
          <View style={styles.progressDot} />
          <View style={styles.progressDotActive} />
        </View>
        <TouchableOpacity style={styles.skipBtn} onPress={handleLater} hitSlop={10} disabled={busy} testID="mob-skip">
          <Text style={styles.skipText}>{t('skip')}</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.flex, { opacity: fade, transform: [{ translateY: slide }] }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          <LinearGradient colors={['#FFFFFC', '#F8F5EE', '#EEF7EF']} locations={[0, 0.55, 1]} style={styles.heroCard}>
            <View style={styles.glowTop} />
            <View style={styles.glowBottom} />

            <View style={styles.eyebrowPill}>
              <Sparkles color={Colors.primary} size={14} strokeWidth={2.4} />
              <Text style={styles.eyebrowText}>{pick({ fr: 'OPTIONNEL', en: 'OPTIONAL', ko: '선택 사항' })}</Text>
            </View>

            <View style={styles.avatarStage}>
              <Animated.View style={[styles.avatarAura, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
              <View style={styles.avatarDisc}>
                <Image source={{ uri: DR_TOXI_DEFAULT_AVATAR_URI }} style={styles.avatar} contentFit="contain" />
              </View>
              <View style={styles.bellBadge}>
                <Bell color={Colors.white} size={15} strokeWidth={2.6} />
              </View>
            </View>

            <Text style={styles.title}>{t('mob_notif_title')}</Text>
            <Text style={styles.body}>{t('mob_notif_body')}</Text>

            <View style={styles.previewCard}>
              <View style={styles.previewIcon}>
                <CalendarCheck color={Colors.primary} size={21} strokeWidth={2.3} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.previewTitle}>{pick({ fr: 'Bilan santé du vendredi', en: 'Friday health report', ko: '금요일 건강 리포트' })}</Text>
                <Text style={styles.previewText}>{t('mob_notif_friday_note')}</Text>
              </View>
              <ShieldCheck color={Colors.primary} size={20} strokeWidth={2.3} />
            </View>
          </LinearGradient>

          <Text style={styles.remindersLabel}>{t('mob_notif_reminders_label')}</Text>
          <ReminderToggleList prefs={prefs} onChange={setPrefs} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleEnable} activeOpacity={0.9} disabled={busy} testID="mob-enable">
            {busy ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <Bell color={Colors.white} size={18} strokeWidth={2.4} />
                <Text style={styles.primaryBtnText}>{t('mob_notif_enable')}</Text>
                <ArrowRight color={Colors.white} size={19} strokeWidth={2.6} />
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.laterBtn} onPress={handleLater} activeOpacity={0.7} disabled={busy} testID="mob-later">
            <Text style={styles.laterText}>{t('mob_notif_later')}</Text>
          </TouchableOpacity>
          <Text style={styles.settingsHint}>{t('mob_notif_settings_hint')}</Text>
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
  scrollContent: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 16 },
  heroCard: {
    borderRadius: 34,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: 'rgba(232,225,214,0.92)',
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.11,
    shadowRadius: 28,
    elevation: 6,
  },
  glowTop: {
    position: 'absolute' as const,
    top: -88,
    left: -76,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(46,158,52,0.11)',
  },
  glowBottom: {
    position: 'absolute' as const,
    right: -80,
    bottom: -70,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(232,115,10,0.08)',
  },
  eyebrowPill: {
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
  eyebrowText: { fontSize: 11, fontWeight: '900' as const, color: Colors.primary, letterSpacing: 1.2 },
  avatarStage: { alignSelf: 'center' as const, width: 128, height: 128, marginTop: 14, marginBottom: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  avatarAura: { position: 'absolute' as const, width: 122, height: 122, borderRadius: 61, backgroundColor: Colors.primary },
  avatarDisc: {
    width: 104,
    height: 104,
    borderRadius: 52,
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
  avatar: { width: 92, height: 92 },
  bellBadge: {
    position: 'absolute' as const,
    right: 12,
    bottom: 18,
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
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    letterSpacing: -0.8,
    paddingHorizontal: 4,
  },
  body: {
    fontSize: 15.5,
    lineHeight: 23,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 12,
    paddingHorizontal: 4,
    fontWeight: '500' as const,
  },
  previewCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 13,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
    marginTop: 20,
  },
  previewIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(46,158,52,0.1)', alignItems: 'center' as const, justifyContent: 'center' as const },
  previewTitle: { fontSize: 15.5, fontWeight: '900' as const, color: Colors.text, letterSpacing: -0.2 },
  previewText: { fontSize: 12.5, lineHeight: 17, color: Colors.textSecondary, marginTop: 3, fontWeight: '600' as const },
  remindersLabel: {
    fontSize: 12.5,
    fontWeight: '900' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 10, gap: 9 },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row' as const,
    paddingVertical: 17,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 9,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 6,
  },
  primaryBtnText: { color: Colors.white, fontSize: 17, fontWeight: '900' as const, letterSpacing: 0.1 },
  laterBtn: { paddingVertical: 9, alignItems: 'center' as const },
  laterText: { fontSize: 15, fontWeight: '700' as const, color: Colors.textSecondary },
  settingsHint: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center' as const, paddingHorizontal: 10, lineHeight: 17 },
});
