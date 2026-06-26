import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import {
  MealIngredient,
  MealTier,
  MealAlternatives,
  MealCategory,
  scoreToTier,
} from '@/utils/mealAnalysis';
import { getDeviceLanguage } from '@/utils/i18n';
import { syncMealReminders } from '@/utils/notifications';

const STORAGE_KEY = 'toxiscan_meals';
// One-time flag: marks that stored meals use the v2 HEALTH scale (higher = better).
// Before v2 the stored score was a TOXICITY value (higher = worse).
const SCORE_SCALE_V2_FLAG = 'toxiscan_score_scale_v2';
const MAX_MEALS = 200;

export interface MealRecord {
  id: string;
  dishName: string;
  photoUri?: string;
  thumbnailUri?: string;
  score: number;
  tier: MealTier;
  ingredients: MealIngredient[];
  verdictText: string;
  alternatives: MealAlternatives | null;
  scannedAt: string;
  lang: string;
}

export interface WeeklyReport {
  meals: MealRecord[];
  count: number;
  avgScore: number;
  tier: MealTier;
  distribution: Record<MealTier, number>;
  problemCategory: MealCategory | null;
  problemCount: number;
  trendDirection: 'up' | 'down' | 'flat' | 'first';
  trendPct: number;
  bestMeal: MealRecord | null;
  worstMeal: MealRecord | null;
}

/** Health-score tiers (higher = healthier): 8-10 green, 5-7 yellow, 3-4 orange, 0-2 red. */
function avgToTier(avg: number): MealTier {
  return scoreToTier(avg);
}

/** Monday 00:00 of the week containing `now`, shifted by `weekOffset` weeks. */
function startOfWeek(now: Date, weekOffset: number): Date {
  const d = new Date(now);
  const dayFromMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayFromMonday + weekOffset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isFlagged(c: MealCategory): boolean {
  return c !== 'healthy' && c !== 'neutral';
}

export const [MealHistoryProvider, useMeals] = createContextHook(() => {
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const queryClient = useQueryClient();
  const didSyncReminders = useRef<boolean>(false);

  const mealsQuery = useQuery({
    queryKey: ['meals'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed: MealRecord[] = stored ? (JSON.parse(stored) as MealRecord[]) : [];
      // ONE-TIME migration to the HEALTH scale (higher = better). Older records hold a
      // toxicity score (higher = worse); convert each once with health = 10 - score and
      // recompute its tier so history never desyncs with new health-scaled scans.
      const migrated = await AsyncStorage.getItem(SCORE_SCALE_V2_FLAG);
      if (!migrated) {
        if (parsed.length > 0) {
          const converted = parsed.map((m) => {
            const health = Math.max(0, Math.min(10, 10 - m.score));
            return { ...m, score: health, tier: scoreToTier(health) };
          });
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(converted));
          await AsyncStorage.setItem(SCORE_SCALE_V2_FLAG, 'true');
          return converted;
        }
        await AsyncStorage.setItem(SCORE_SCALE_V2_FLAG, 'true');
      }
      return parsed;
    },
  });

  useEffect(() => {
    if (mealsQuery.data) {
      setMeals(mealsQuery.data);
      if (!didSyncReminders.current) {
        didSyncReminders.current = true;
        void syncMealReminders(mealsQuery.data);
      }
    }
  }, [mealsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (updated: MealRecord[]) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, MAX_MEALS)));
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['meals'], data);
    },
  });

  const addMeal = useCallback((meal: MealRecord) => {
    setMeals((prev) => {
      const updated = [meal, ...prev].slice(0, MAX_MEALS);
      saveMutation.mutate(updated);
      // Permission is handled by the meal onboarding / settings. Here we just keep the
      // rolling schedule fresh (respecting the user's saved prefs); since a meal was just
      // logged, today's reminders are skipped (anti-spam).
      void syncMealReminders(updated);
      return updated;
    });
  }, [saveMutation]);

  const deleteMeal = useCallback((id: string) => {
    setMeals((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const clearMeals = useCallback(() => {
    setMeals([]);
    saveMutation.mutate([]);
  }, [saveMutation]);

  const getMeal = useCallback((id: string): MealRecord | undefined => {
    return meals.find((m) => m.id === id);
  }, [meals]);

  return useMemo(() => ({
    meals,
    addMeal,
    deleteMeal,
    clearMeals,
    getMeal,
    isLoading: mealsQuery.isLoading,
  }), [meals, addMeal, deleteMeal, clearMeals, getMeal, mealsQuery.isLoading]);
});

/**
 * Aggregates the meals of a given week into the dashboard report (spec §8):
 * average health score, tier distribution, recurring problem ingredient, trend vs the
 * previous week, and best/worst meals. weekOffset 0 = current week.
 */
export function useWeeklyMealReport(weekOffset: number = 0): WeeklyReport {
  const { meals } = useMeals();
  return useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, weekOffset);
    const weekEnd = startOfWeek(now, weekOffset + 1);
    const prevStart = startOfWeek(now, weekOffset - 1);

    const inRange = (m: MealRecord, start: Date, end: Date): boolean => {
      const d = new Date(m.scannedAt).getTime();
      return d >= start.getTime() && d < end.getTime();
    };

    const weekMeals = meals.filter((m) => inRange(m, weekStart, weekEnd));
    const prevMeals = meals.filter((m) => inRange(m, prevStart, weekStart));

    const distribution: Record<MealTier, number> = { green: 0, yellow: 0, orange: 0, red: 0 };
    let scoreSum = 0;
    for (const m of weekMeals) {
      distribution[m.tier] += 1;
      scoreSum += m.score;
    }
    const count = weekMeals.length;
    const avgScore = count > 0 ? Math.round(scoreSum / count) : 0;

    // Recurring problem ingredient — most frequent flagged category across the week's meals.
    const categoryMealCount = new Map<MealCategory, number>();
    for (const m of weekMeals) {
      const seen = new Set<MealCategory>();
      for (const ing of m.ingredients) {
        if (isFlagged(ing.category) && !seen.has(ing.category)) {
          seen.add(ing.category);
          categoryMealCount.set(ing.category, (categoryMealCount.get(ing.category) ?? 0) + 1);
        }
      }
    }
    let problemCategory: MealCategory | null = null;
    let problemCount = 0;
    categoryMealCount.forEach((c, cat) => {
      if (c > problemCount) {
        problemCount = c;
        problemCategory = cat;
      }
    });

    // Trend — share of "good meals" (green tier) this week vs last week.
    let trendDirection: 'up' | 'down' | 'flat' | 'first' = 'first';
    let trendPct = 0;
    if (prevMeals.length > 0 && count > 0) {
      const thisRatio = distribution.green / count;
      const prevGreen = prevMeals.filter((m) => m.tier === 'green').length;
      const prevRatio = prevGreen / prevMeals.length;
      const delta = Math.round((thisRatio - prevRatio) * 100);
      trendPct = Math.abs(delta);
      trendDirection = delta > 3 ? 'up' : delta < -3 ? 'down' : 'flat';
    }

    // Health scale: the BEST meal has the HIGHEST score, the WORST the lowest.
    let bestMeal: MealRecord | null = null;
    let worstMeal: MealRecord | null = null;
    for (const m of weekMeals) {
      if (!bestMeal || m.score > bestMeal.score) bestMeal = m;
      if (!worstMeal || m.score < worstMeal.score) worstMeal = m;
    }

    return {
      meals: weekMeals,
      count,
      avgScore,
      tier: avgToTier(avgScore),
      distribution,
      problemCategory,
      problemCount,
      trendDirection,
      trendPct,
      bestMeal,
      worstMeal,
    };
  }, [meals, weekOffset]);
}

/** Creates a MealRecord stamped with the current language. */
export function buildMealRecord(params: {
  id: string;
  dishName: string;
  photoUri?: string;
  thumbnailUri?: string;
  score: number;
  tier: MealTier;
  ingredients: MealIngredient[];
  verdictText: string;
  alternatives: MealAlternatives | null;
}): MealRecord {
  return {
    ...params,
    scannedAt: new Date().toISOString(),
    lang: getDeviceLanguage(),
  };
}
