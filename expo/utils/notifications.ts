import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { t } from '@/utils/i18n';

// Local notifications only (no remote push) — fully supported in Expo Go.
// Foreground presentation so reminders show even while the app is open.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.log('[Notifications] Failed to set handler:', e);
}

const REMINDER_CHANNEL = 'meal-reminders';
const NOON_HOUR = 12;
const EVENING_HOUR = 20;
const FRIDAY_REPORT_HOUR = 21;
const FRIDAY_WEEKDAY = 6; // expo: 1=Sunday … 6=Friday

const isNative = Platform.OS !== 'web';

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: 'Meal reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: undefined,
    });
  } catch (e) {
    console.log('[Notifications] Channel setup failed:', e);
  }
}

/** Requests notification permission. Returns true when granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted && settings.canAskAgain !== false) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    }
    await ensureAndroidChannel();
    console.log('[Notifications] Permission granted:', granted);
    return granted;
  } catch (e) {
    console.log('[Notifications] Permission request failed:', e);
    return false;
  }
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function atHour(base: Date, dayOffset: number, hour: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * Smart anti-spam reminders (spec §9): schedules noon + 8pm "scan your meal"
 * reminders for the next few days and the Friday 21:00 weekly report. If the
 * user already scanned a meal today, today's reminders are skipped so we never
 * nag someone who has already logged a meal.
 *
 * Re-run on app launch and after every meal scan so the schedule stays fresh.
 */
export async function syncMealReminders(meals: { scannedAt: string }[]): Promise<void> {
  if (!isNative) return;
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted && settings.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
      return;
    }
    await ensureAndroidChannel();
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    const scannedToday = meals.some((m) => {
      const d = new Date(m.scannedAt);
      return !Number.isNaN(d.getTime()) && sameDay(d, now);
    });

    // Next 4 days of reminders. Skip today's if a meal was already scanned today.
    for (let dayOffset = 0; dayOffset <= 4; dayOffset++) {
      const skipToday = dayOffset === 0 && scannedToday;
      if (skipToday) continue;

      const noon = atHour(now, dayOffset, NOON_HOUR);
      if (noon.getTime() > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: { title: t('notif_noon_title'), body: t('notif_noon_body') },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: noon, channelId: REMINDER_CHANNEL },
        });
      }
      const evening = atHour(now, dayOffset, EVENING_HOUR);
      if (evening.getTime() > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: { title: t('notif_evening_title'), body: t('notif_evening_body') },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: evening, channelId: REMINDER_CHANNEL },
        });
      }
    }

    // Weekly report — every Friday at 21:00 (always on, the premium hook).
    await Notifications.scheduleNotificationAsync({
      content: { title: t('notif_friday_title'), body: t('notif_friday_body') },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: FRIDAY_WEEKDAY,
        hour: FRIDAY_REPORT_HOUR,
        minute: 0,
        channelId: REMINDER_CHANNEL,
      },
    });

    console.log('[Notifications] Meal reminders synced. scannedToday:', scannedToday);
  } catch (e) {
    console.log('[Notifications] syncMealReminders failed:', e);
  }
}

/** Cancels every scheduled reminder (e.g. when the user goes Pro and prefers silence). */
export async function cancelAllMealReminders(): Promise<void> {
  if (!isNative) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.log('[Notifications] cancelAll failed:', e);
  }
}
