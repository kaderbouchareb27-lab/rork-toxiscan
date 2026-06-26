import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';

const PROMPT_LOG_KEY = 'toxiscan_review_prompts';
const MAX_PROMPTS_PER_YEAR = 3;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

let requestInFlight = false;

/**
 * Asks for Apple's NATIVE in-app review (SKStoreReviewController via
 * expo-store-review) right after a POSITIVE scan result — a green "approved"
 * product verdict or a "Bon repas" green meal. We only ask on a good outcome
 * to maximise honest positive reviews; the displayed verdict text is never
 * altered to manipulate the rating.
 *
 * Apple itself caps the prompt at 3×/year and may silently ignore the call,
 * and we never show a custom "rate us 5 stars" screen (forbidden by the
 * guidelines). We additionally keep a rolling-365-day log of when we asked so
 * we never request more than 3 times a year, even across reinstalled state.
 *
 * @param isPositive true only when the user just saw a positive/green verdict.
 */
export async function maybeRequestReviewAfterPositiveScan(isPositive: boolean): Promise<void> {
  if (!isPositive || Platform.OS === 'web' || requestInFlight) return;
  requestInFlight = true;
  try {
    const raw = await AsyncStorage.getItem(PROMPT_LOG_KEY);
    const now = Date.now();
    const prompts: number[] = raw
      ? (JSON.parse(raw) as number[]).filter((ts) => typeof ts === 'number' && now - ts < YEAR_MS)
      : [];

    if (prompts.length >= MAX_PROMPTS_PER_YEAR) {
      // Keep the log pruned so the rolling window stays accurate.
      await AsyncStorage.setItem(PROMPT_LOG_KEY, JSON.stringify(prompts));
      return;
    }

    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;

    // Record the attempt BEFORE asking — the native sheet may not actually
    // appear, but we must still count it against our yearly budget.
    prompts.push(now);
    await AsyncStorage.setItem(PROMPT_LOG_KEY, JSON.stringify(prompts));

    // Small delay so the result screen settles before the system sheet slides up.
    setTimeout(() => { void StoreReview.requestReview(); }, 1200);
  } catch (e) {
    console.log('[ReviewPrompt] error:', e instanceof Error ? e.message : e);
  } finally {
    requestInFlight = false;
  }
}
