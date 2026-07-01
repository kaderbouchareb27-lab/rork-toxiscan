import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { t } from '@/utils/i18n';
import { loadReminderPrefs, type MealReminder, type ReminderSlot } from '@/utils/reminderPrefs';

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
const FRIDAY_REPORT_HOUR = 21;
const FRIDAY_WEEKDAY = 6; // expo: 1=Sunday … 6=Friday
/** How many days ahead one-off reminders are pre-scheduled (re-synced on launch & after each scan). */
const SCHEDULE_DAYS_AHEAD = 7;

/** Localized copy for each reminder slot. */
function reminderCopy(slot: ReminderSlot): { title: string; body: string } {
  switch (slot) {
    case 'morning':
      return { title: t('notif_morning_title'), body: t('notif_morning_body') };
    case 'noon':
      return { title: t('notif_noon_title'), body: t('notif_noon_body') };
    case 'evening':
      return { title: t('notif_evening_title'), body: t('notif_evening_body') };
  }
}

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

function atTime(base: Date, dayOffset: number, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Schedules the user's chosen meal reminders + the Friday 21:00 weekly report.
 *
 * Driven entirely by the user's preferences (onboarding §2 / settings): only the
 * reminders they enabled are scheduled, each at the exact time THEY picked — nothing
 * hardcoded. If the user hasn't opted into notifications (or permission isn't granted),
 * nothing is scheduled and any existing reminders are cleared (we respect the choice).
 *
 * Anti-spam: if a meal was already scanned today, today's reminders are skipped so we
 * never nag someone who has already logged a meal. Re-run on app launch and after every
 * meal scan so the rolling schedule stays fresh.
 */
export async function syncMealReminders(meals: { scannedAt: string }[]): Promise<void> {
  if (!isNative) return;
  try {
    await ensureAndroidChannel();
    await Notifications.cancelAllScheduledNotificationsAsync();

    const prefs = await loadReminderPrefs();
    if (!prefs.notificationsEnabled) {
      console.log('[Notifications] Notifications disabled by user — nothing scheduled.');
      return;
    }

    const settings = await Notifications.getPermissionsAsync();
    const granted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted) {
      console.log('[Notifications] Permission not granted — nothing scheduled.');
      return;
    }

    const now = new Date();
    const scannedToday = meals.some((m) => {
      const d = new Date(m.scannedAt);
      return !Number.isNaN(d.getTime()) && sameDay(d, now);
    });

    const allSlots: { slot: ReminderSlot; r: MealReminder }[] = [
      { slot: 'morning', r: prefs.morning },
      { slot: 'noon', r: prefs.noon },
      { slot: 'evening', r: prefs.evening },
    ];
    const slots = allSlots.filter((x) => x.r.enabled);

    // Rolling window of one-off reminders. Skip today's if a meal was already scanned today.
    for (let dayOffset = 0; dayOffset <= SCHEDULE_DAYS_AHEAD; dayOffset++) {
      const skipToday = dayOffset === 0 && scannedToday;
      if (skipToday) continue;

      for (const { slot, r } of slots) {
        const when = atTime(now, dayOffset, r.hour, r.minute);
        if (when.getTime() <= now.getTime()) continue;
        const { title, body } = reminderCopy(slot);
        await Notifications.scheduleNotificationAsync({
          content: { title, body },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: REMINDER_CHANNEL },
        });
      }
    }

    // Weekly report — every Friday at 21:00 (the premium hook), tied to notifications being on.
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

    console.log('[Notifications] Reminders synced.', { enabled: slots.map((s) => s.slot), scannedToday });
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

/**
 * Presents an immediate local notification for NonToxic Hub activity (new posts or
 * new replies detected while the app is running). Silent no-op when notification
 * permission has not been granted — we never prompt from here.
 */
export async function presentHubActivityNotification(title: string, body: string): Promise<void> {
  if (!isNative) return;
  try {
    const settings = await Notifications.getPermissionsAsync();
    const granted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted) return;
    await ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL } : null,
    });
    console.log('[Notifications] Hub activity notification presented.');
  } catch (e) {
    console.log('[Notifications] Hub notification failed:', e);
  }
}
