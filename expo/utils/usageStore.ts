import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Persistent lifetime-usage store for the freemium counters (spec §13).
 *
 * The free meal-scan (3) and Dr. Toxi message (6) quotas are LIFETIME, and must
 * survive an uninstall/reinstall so the limit can't be reset by deleting the app.
 *
 * Strategy:
 *  - SecureStore (iOS Keychain) is the authoritative store. Keychain items are NOT
 *    wiped when an iOS app is deleted, so the counters persist across reinstalls.
 *  - AsyncStorage is kept as a fast mirror (and the only store on web).
 *  - On every read we take the element-wise MAX across both stores and the legacy
 *    key, then heal both back — so counts only ever go UP and a wiped store is
 *    restored from the surviving one. A reinstall therefore cannot lower a quota.
 *  - The RevenueCat appUserID is recorded alongside for traceability ("lié à
 *    l'appUserID RevenueCat") and so a future server sync can key off it.
 */

export interface LifetimeUsage {
  /** Number of meal scans used on `mealScanDay` (resets each local day). */
  mealScanCount: number;
  /** Local 'YYYY-MM-DD' the meal-scan count applies to. */
  mealScanDay: string;
  drToxiCount: number;
  /** Number of product scans used on `productScanDay` (resets each local day). */
  productScanCount: number;
  /** Local 'YYYY-MM-DD' the product-scan count applies to. */
  productScanDay: string;
  /** RevenueCat appUserID this usage is associated with (best-effort). */
  appUserId?: string;
}

/** Local calendar day as 'YYYY-MM-DD' (used for the daily product-scan quota). */
export function todayLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const SECURE_KEY = 'toxiscan_lifetime_usage_secure';
/** Legacy + mirror key (previously the only store). */
const MIRROR_KEY = 'toxiscan_lifetime_usage';

const secureAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

function getDefaultUsage(): LifetimeUsage {
  return { mealScanCount: 0, mealScanDay: '', drToxiCount: 0, productScanCount: 0, productScanDay: '' };
}

function parse(raw: string | null): Partial<LifetimeUsage> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<LifetimeUsage>;
  } catch {
    return null;
  }
}

async function readSecure(): Promise<Partial<LifetimeUsage> | null> {
  if (!secureAvailable) return null;
  try {
    return parse(await SecureStore.getItemAsync(SECURE_KEY));
  } catch (e) {
    console.log('[UsageStore] SecureStore read failed:', e);
    return null;
  }
}

async function readMirror(): Promise<Partial<LifetimeUsage> | null> {
  try {
    return parse(await AsyncStorage.getItem(MIRROR_KEY));
  } catch (e) {
    console.log('[UsageStore] AsyncStorage read failed:', e);
    return null;
  }
}

function mergeMax(
  a: Partial<LifetimeUsage> | null,
  b: Partial<LifetimeUsage> | null,
): LifetimeUsage {
  // Lifetime counters take the element-wise max. The daily product/meal-scan counters
  // are date-aware: the most recent day wins (and its count); same-day takes the max so
  // a reinstall can't reset today's quota, while a new day naturally starts fresh.
  const mealMerged = mergeDaily(
    a?.mealScanDay ?? '',
    a?.mealScanCount ?? 0,
    b?.mealScanDay ?? '',
    b?.mealScanCount ?? 0,
  );
  const productMerged = mergeDaily(
    a?.productScanDay ?? '',
    a?.productScanCount ?? 0,
    b?.productScanDay ?? '',
    b?.productScanCount ?? 0,
  );
  return {
    mealScanCount: mealMerged.count,
    mealScanDay: mealMerged.day,
    drToxiCount: Math.max(a?.drToxiCount ?? 0, b?.drToxiCount ?? 0),
    productScanCount: productMerged.count,
    productScanDay: productMerged.day,
    appUserId: b?.appUserId ?? a?.appUserId,
  };
}

/** Date-aware merge for a daily counter: most-recent day wins, same-day takes the max. */
function mergeDaily(aDay: string, aCount: number, bDay: string, bCount: number): { day: string; count: number } {
  if (aDay === bDay) return { day: aDay, count: Math.max(aCount, bCount) };
  if (aDay > bDay) return { day: aDay, count: aCount };
  return { day: bDay, count: bCount };
}

/** Writes the usage to BOTH the Keychain (when available) and the AsyncStorage mirror. */
export async function persistLifetimeUsage(usage: LifetimeUsage): Promise<void> {
  const payload = JSON.stringify(usage);
  const tasks: Promise<unknown>[] = [
    AsyncStorage.setItem(MIRROR_KEY, payload).catch((e) =>
      console.log('[UsageStore] mirror write failed:', e),
    ),
  ];
  if (secureAvailable) {
    tasks.push(
      SecureStore.setItemAsync(SECURE_KEY, payload).catch((e) =>
        console.log('[UsageStore] secure write failed:', e),
      ),
    );
  }
  await Promise.all(tasks);
}

/**
 * Loads the lifetime usage, taking the highest value seen across the Keychain and
 * the AsyncStorage mirror, then heals both stores so a wiped one is restored.
 */
export async function loadLifetimeUsage(): Promise<LifetimeUsage> {
  const [secure, mirror] = await Promise.all([readSecure(), readMirror()]);
  if (!secure && !mirror) return getDefaultUsage();
  const merged = mergeMax(secure, mirror);
  // Self-heal: write the merged (highest) values back to both stores.
  await persistLifetimeUsage(merged);
  return merged;
}

/**
 * Atomically increments one counter from the true persisted maximum and writes it
 * back to both stores. Returns the updated, authoritative usage. Counts are
 * monotonic — a reinstall (which wipes AsyncStorage but not the iOS Keychain)
 * can never lower them.
 */
export async function incrementLifetimeUsage(
  field: 'drToxiCount',
  appUserId?: string,
): Promise<LifetimeUsage> {
  const current = await loadLifetimeUsage();
  const updated: LifetimeUsage = {
    ...current,
    [field]: (current[field] ?? 0) + 1,
    appUserId: appUserId ?? current.appUserId,
  };
  await persistLifetimeUsage(updated);
  console.log(`[UsageStore] ${field} incremented to`, updated[field]);
  return updated;
}

/**
 * Increments the DAILY meal-scan counter. If the persisted day is not today, the
 * count starts fresh at 1 for today; otherwise it bumps the existing count. The result
 * is written to both stores so deleting/reinstalling the app cannot reset today's quota.
 */
export async function incrementMealScan(appUserId?: string): Promise<LifetimeUsage> {
  const current = await loadLifetimeUsage();
  const today = todayLocalDateString();
  const sameDay = current.mealScanDay === today;
  const updated: LifetimeUsage = {
    ...current,
    mealScanDay: today,
    mealScanCount: sameDay ? (current.mealScanCount ?? 0) + 1 : 1,
    appUserId: appUserId ?? current.appUserId,
  };
  await persistLifetimeUsage(updated);
  console.log('[UsageStore] mealScan incremented to', updated.mealScanCount, 'for', today);
  return updated;
}

/**
 * Increments the DAILY product-scan counter. If the persisted day is not today, the
 * count starts fresh at 1 for today; otherwise it bumps the existing count. The result
 * is written to both stores so deleting/reinstalling the app cannot reset today's quota.
 */
export async function incrementProductScan(appUserId?: string): Promise<LifetimeUsage> {
  const current = await loadLifetimeUsage();
  const today = todayLocalDateString();
  const sameDay = current.productScanDay === today;
  const updated: LifetimeUsage = {
    ...current,
    productScanDay: today,
    productScanCount: sameDay ? (current.productScanCount ?? 0) + 1 : 1,
    appUserId: appUserId ?? current.appUserId,
  };
  await persistLifetimeUsage(updated);
  console.log('[UsageStore] productScan incremented to', updated.productScanCount, 'for', today);
  return updated;
}

/** Records/refreshes the associated RevenueCat appUserID without touching counts. */
export async function tagAppUserId(appUserId: string): Promise<void> {
  if (!appUserId) return;
  const current = await loadLifetimeUsage();
  if (current.appUserId === appUserId) return;
  await persistLifetimeUsage({ ...current, appUserId });
}
