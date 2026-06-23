import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * User-configured meal reminder preferences (first-launch onboarding §2 + settings).
 *
 * The user opts into notifications in context (Apple-compliant) and chooses which of
 * the 3 meal reminders to enable, each at an exact time THEY pick — nothing hardcoded.
 * The Friday weekly report is scheduled only while notifications are enabled.
 *
 * Stored in AsyncStorage so the choice persists across launches. notifications.ts reads
 * these prefs to schedule the right reminders.
 */

export type ReminderSlot = 'morning' | 'noon' | 'evening';

export interface MealReminder {
  enabled: boolean;
  /** 0–23 */
  hour: number;
  /** 0–59 */
  minute: number;
}

export interface ReminderPrefs {
  /** Whether the user opted into reminder notifications at all. */
  notificationsEnabled: boolean;
  /** Whether the user has been through the notification onboarding/settings at least once. */
  configured: boolean;
  morning: MealReminder;
  noon: MealReminder;
  evening: MealReminder;
}

const STORAGE_KEY = 'toxiscan_reminder_prefs';

/** Sensible suggested defaults — pre-filled in the picker, fully editable by the user. */
export function getDefaultReminderPrefs(): ReminderPrefs {
  return {
    notificationsEnabled: false,
    configured: false,
    morning: { enabled: false, hour: 8, minute: 0 },
    noon: { enabled: true, hour: 12, minute: 30 },
    evening: { enabled: true, hour: 19, minute: 30 },
  };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? Math.round(value) : Number.NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeReminder(raw: Partial<MealReminder> | undefined, fallback: MealReminder): MealReminder {
  return {
    enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : fallback.enabled,
    hour: clampInt(raw?.hour, 0, 23, fallback.hour),
    minute: clampInt(raw?.minute, 0, 59, fallback.minute),
  };
}

function normalize(raw: Partial<ReminderPrefs> | null): ReminderPrefs {
  const defaults = getDefaultReminderPrefs();
  if (!raw) return defaults;
  return {
    notificationsEnabled: typeof raw.notificationsEnabled === 'boolean' ? raw.notificationsEnabled : defaults.notificationsEnabled,
    configured: typeof raw.configured === 'boolean' ? raw.configured : defaults.configured,
    morning: normalizeReminder(raw.morning, defaults.morning),
    noon: normalizeReminder(raw.noon, defaults.noon),
    evening: normalizeReminder(raw.evening, defaults.evening),
  };
}

/** Loads the saved reminder preferences, falling back to defaults. */
export async function loadReminderPrefs(): Promise<ReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultReminderPrefs();
    return normalize(JSON.parse(raw) as Partial<ReminderPrefs>);
  } catch (e) {
    console.log('[ReminderPrefs] load failed:', e);
    return getDefaultReminderPrefs();
  }
}

/** Persists the reminder preferences. */
export async function saveReminderPrefs(prefs: ReminderPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalize(prefs)));
  } catch (e) {
    console.log('[ReminderPrefs] save failed:', e);
  }
}

/** Formats an hour/minute as a zero-padded 24h "HH:MM" string. */
export function formatTime(hour: number, minute: number): string {
  const h = clampInt(hour, 0, 23, 0).toString().padStart(2, '0');
  const m = clampInt(minute, 0, 59, 0).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export const REMINDER_SLOTS: ReminderSlot[] = ['morning', 'noon', 'evening'];
