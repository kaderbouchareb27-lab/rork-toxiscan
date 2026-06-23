import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { ChevronLeft, Bell, CalendarCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { t } from '@/utils/i18n';
import ReminderToggleList from '@/components/ReminderToggleList';
import {
  loadReminderPrefs,
  saveReminderPrefs,
  getDefaultReminderPrefs,
  type ReminderPrefs,
} from '@/utils/reminderPrefs';
import { requestNotificationPermission, syncMealReminders } from '@/utils/notifications';
import { useMeals } from '@/providers/MealHistoryProvider';

export default function MealRemindersScreen() {
  const { meals } = useMeals();
  const [prefs, setPrefs] = useState<ReminderPrefs>(getDefaultReminderPrefs());

  useEffect(() => {
    void loadReminderPrefs().then(setPrefs);
  }, []);

  const persist = useCallback((next: ReminderPrefs) => {
    setPrefs(next);
    void (async () => {
      await saveReminderPrefs(next);
      await syncMealReminders(meals);
    })();
  }, [meals]);

  const handleMasterToggle = useCallback(async (value: boolean) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted && Platform.OS !== 'web') {
        Alert.alert(t('mob_notif_denied_title'), t('mob_notif_denied_msg'), [
          { text: t('cancel'), style: 'cancel' },
          { text: t('open_settings'), onPress: () => { void Linking.openSettings(); } },
        ]);
        return;
      }
      persist({ ...prefs, notificationsEnabled: Platform.OS === 'web' ? true : granted, configured: true });
    } else {
      persist({ ...prefs, notificationsEnabled: false, configured: true });
    }
  }, [prefs, persist]);

  const masterOn = prefs.notificationsEnabled;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7} testID="reminders-back">
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('meal_reminders_title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{t('meal_reminders_intro')}</Text>

        <View style={styles.masterCard}>
          <View style={styles.masterIcon}>
            <Bell color={masterOn ? Colors.primary : Colors.textTertiary} size={20} strokeWidth={2.1} />
          </View>
          <View style={styles.masterText}>
            <Text style={styles.masterTitle}>{t('meal_reminders_master')}</Text>
            <Text style={styles.masterDesc}>{t('meal_reminders_master_desc')}</Text>
          </View>
          <Switch
            value={masterOn}
            onValueChange={handleMasterToggle}
            trackColor={{ false: '#D9D4C8', true: Colors.primary }}
            ios_backgroundColor="#D9D4C8"
            testID="reminders-master"
          />
        </View>

        {masterOn ? (
          <ReminderToggleList prefs={prefs} onChange={persist} enabled={masterOn} />
        ) : (
          <View style={styles.offNote}>
            <Text style={styles.offNoteText}>{t('meal_reminders_off_note')}</Text>
          </View>
        )}

        <View style={[styles.fridayCard, !masterOn && styles.fridayCardOff]}>
          <View style={styles.fridayIcon}>
            <CalendarCheck color={masterOn ? Colors.primary : Colors.textTertiary} size={19} strokeWidth={2.1} />
          </View>
          <View style={styles.fridayText}>
            <Text style={styles.fridayTitle}>{t('meal_reminders_friday_title')}</Text>
            <Text style={styles.fridayDesc}>{t('meal_reminders_friday_desc')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary },
  headerTitle: { fontSize: 18, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40 },
  intro: { fontSize: 14.5, lineHeight: 21, color: Colors.textSecondary, marginBottom: 18 },
  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  masterIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(46,158,52,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  masterText: { flex: 1 },
  masterTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.2 },
  masterDesc: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  offNote: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
  },
  offNoteText: { fontSize: 13.5, lineHeight: 19, color: Colors.textSecondary, textAlign: 'center' },
  fridayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 14,
  },
  fridayCardOff: { opacity: 0.5 },
  fridayIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(46,158,52,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fridayText: { flex: 1 },
  fridayTitle: { fontSize: 15.5, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.2 },
  fridayDesc: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
});
