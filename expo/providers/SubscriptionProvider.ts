import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const SUBSCRIPTION_KEY = 'toxiscan_subscription';
const USAGE_KEY = 'toxiscan_daily_usage';

const FREE_DRTOXI_LIMIT = 1;

interface DailyUsage {
  date: string;
  drToxiCount: number;
}

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getDefaultUsage(): DailyUsage {
  return { date: getTodayString(), drToxiCount: 0 };
}

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [isPro, setIsPro] = useState<boolean>(false);
  const [usage, setUsage] = useState<DailyUsage>(getDefaultUsage());

  const subscriptionQuery = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const value = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
      return value === 'true';
    },
  });

  const usageQuery = useQuery({
    queryKey: ['dailyUsage'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(USAGE_KEY);
      if (!stored) return getDefaultUsage();
      const parsed = JSON.parse(stored) as DailyUsage;
      if (parsed.date !== getTodayString()) {
        return getDefaultUsage();
      }
      return parsed;
    },
  });

  useEffect(() => {
    if (subscriptionQuery.data !== undefined) {
      setIsPro(subscriptionQuery.data);
    }
  }, [subscriptionQuery.data]);

  useEffect(() => {
    if (usageQuery.data) {
      if (usageQuery.data.date !== getTodayString()) {
        setUsage(getDefaultUsage());
      } else {
        setUsage(usageQuery.data);
      }
    }
  }, [usageQuery.data]);

  const saveUsageMutation = useMutation({
    mutationFn: async (newUsage: DailyUsage) => {
      await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(newUsage));
      return newUsage;
    },
  });

  const saveSubscriptionMutation = useMutation({
    mutationFn: async (value: boolean) => {
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, value ? 'true' : 'false');
      return value;
    },
  });

  const drToxiRemaining = useMemo(() => {
    if (isPro) return Infinity;
    return Math.max(0, FREE_DRTOXI_LIMIT - usage.drToxiCount);
  }, [isPro, usage.drToxiCount]);

  const canUseDrToxi = useMemo(() => isPro || usage.drToxiCount < FREE_DRTOXI_LIMIT, [isPro, usage.drToxiCount]);

  const consumeDrToxi = useCallback(() => {
    if (isPro) return;
    const today = getTodayString();
    const current = usage.date === today ? usage : getDefaultUsage();
    const updated: DailyUsage = { ...current, date: today, drToxiCount: current.drToxiCount + 1 };
    setUsage(updated);
    saveUsageMutation.mutate(updated);
    console.log('[Subscription] Dr. Toxi message consumed:', updated.drToxiCount, '/', FREE_DRTOXI_LIMIT);
  }, [isPro, usage, saveUsageMutation]);

  const setPro = useCallback((value: boolean) => {
    setIsPro(value);
    saveSubscriptionMutation.mutate(value);
    console.log('[Subscription] Pro status set to:', value);
  }, [saveSubscriptionMutation]);

  const restorePurchase = useCallback(() => {
    console.log('[Subscription] Restore purchase - RevenueCat not yet integrated');
  }, []);

  return useMemo(() => ({
    isPro,
    drToxiRemaining,
    canUseDrToxi,
    consumeDrToxi,
    setPro,
    restorePurchase,
    drToxiLimit: FREE_DRTOXI_LIMIT,
    isLoading: subscriptionQuery.isLoading || usageQuery.isLoading,
  }), [isPro, drToxiRemaining, canUseDrToxi, consumeDrToxi, setPro, restorePurchase, subscriptionQuery.isLoading, usageQuery.isLoading]);
});
