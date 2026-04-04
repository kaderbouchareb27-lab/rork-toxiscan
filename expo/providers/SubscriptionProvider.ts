import { useState, useEffect, useMemo, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

type PurchasesPackage = any;
type CustomerInfo = any;

let Purchases: any = null;

if (Platform.OS !== 'web') {
  try {
    Purchases = require('react-native-purchases').default;
  } catch (e) {
    console.log('[RevenueCat] Failed to load react-native-purchases:', e);
  }
}

const USAGE_KEY = 'toxiscan_daily_usage';
const FREE_DRTOXI_LIMIT = 3;
const FREE_HISTORY_LIMIT = 3;
const ENTITLEMENT_ID = 'toxiscan_pro';

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

function getRCToken(): string {
  if (__DEV__ || Platform.OS === 'web') return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? '';
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  }) ?? '';
}

const isNative = Platform.OS !== 'web' && Purchases !== null;

if (isNative) {
  const rcToken = getRCToken();
  if (rcToken) {
    console.log('[RevenueCat] Configuring with token:', rcToken.substring(0, 12) + '...');
    Purchases.configure({ apiKey: rcToken });
  } else {
    console.warn('[RevenueCat] No API key found, purchases will not work');
  }
}

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [isPro, setIsPro] = useState<boolean>(false);
  const [usage, setUsage] = useState<DailyUsage>(getDefaultUsage());
  const queryClient = useQueryClient();

  const customerInfoQuery = useQuery({
    queryKey: ['customerInfo'],
    queryFn: async () => {
      if (!isNative) return null;
      try {
        const info = await Purchases.getCustomerInfo();
        console.log('[RevenueCat] Customer info fetched, entitlements:', JSON.stringify(Object.keys(info.entitlements.active)));
        return info;
      } catch (e) {
        console.log('[RevenueCat] Error fetching customer info:', e);
        return null;
      }
    },
    refetchInterval: 1000 * 60 * 5,
  });

  const offeringsQuery = useQuery({
    queryKey: ['offerings'],
    queryFn: async () => {
      if (!isNative) return null;
      try {
        const offerings = await Purchases.getOfferings();
        console.log('[RevenueCat] Offerings fetched:', offerings.current?.identifier);
        if (offerings.current?.availablePackages) {
          console.log('[RevenueCat] Available packages:', offerings.current.availablePackages.map((p: any) => p.identifier));
        }
        return offerings.current ?? null;
      } catch (e) {
        console.log('[RevenueCat] Error fetching offerings:', e);
        return null;
      }
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
    const data = customerInfoQuery.data;
    if (data) {
      const entitlements = data.entitlements?.active ?? {};
      const hasEntitlement = !!entitlements[ENTITLEMENT_ID];
      console.log('[RevenueCat] Has Dr.Toxi Pro entitlement:', hasEntitlement);
      setIsPro(hasEntitlement);
    }
  }, [customerInfoQuery.data]);

  useEffect(() => {
    if (usageQuery.data) {
      if (usageQuery.data.date !== getTodayString()) {
        setUsage(getDefaultUsage());
      } else {
        setUsage(usageQuery.data);
      }
    }
  }, [usageQuery.data]);

  useEffect(() => {
    if (!isNative) return;
    const listener = (info: CustomerInfo) => {
      console.log('[RevenueCat] Customer info updated via listener');
      const entitlements = info.entitlements?.active ?? {};
      const hasEntitlement = !!entitlements[ENTITLEMENT_ID];
      setIsPro(hasEntitlement);
      queryClient.setQueryData(['customerInfo'], info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [queryClient]);

  const saveUsageMutation = useMutation({
    mutationFn: async (newUsage: DailyUsage) => {
      await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(newUsage));
      return newUsage;
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      if (!isNative) throw new Error('Purchases not available on web');
      console.log('[RevenueCat] Purchasing package:', pkg.identifier);
      const result = await Purchases.purchasePackage(pkg);
      const activeEntitlements = result?.customerInfo?.entitlements?.active ?? {};
      console.log('[RevenueCat] Purchase result, entitlements:', JSON.stringify(Object.keys(activeEntitlements)));
      return result;
    },
    onSuccess: (result) => {
      const activeEntitlements = result?.customerInfo?.entitlements?.active ?? {};
      const hasEntitlement = !!activeEntitlements[ENTITLEMENT_ID];
      setIsPro(hasEntitlement);
      queryClient.setQueryData(['customerInfo'], result?.customerInfo ?? null);
      console.log('[RevenueCat] Purchase success, isPro:', hasEntitlement);
    },
    onError: (error: unknown) => {
      const err = error as { userCancelled?: boolean; message?: string };
      if (err.userCancelled) {
        console.log('[RevenueCat] Purchase cancelled by user');
      } else {
        console.log('[RevenueCat] Purchase error:', err.message ?? error);
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!isNative) throw new Error('Purchases not available on web');
      console.log('[RevenueCat] Restoring purchases...');
      const info = await Purchases.restorePurchases();
      const activeEntitlements = info?.entitlements?.active ?? {};
      console.log('[RevenueCat] Restore result, entitlements:', JSON.stringify(Object.keys(activeEntitlements)));
      const hasEntitlement = !!activeEntitlements[ENTITLEMENT_ID];
      return { info, hasEntitlement };
    },
    onSuccess: ({ info, hasEntitlement }) => {
      setIsPro(hasEntitlement);
      queryClient.setQueryData(['customerInfo'], info);
      console.log('[RevenueCat] Restore success, isPro:', hasEntitlement);
    },
    onError: (error: unknown) => {
      console.log('[RevenueCat] Restore error:', error);
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



  const purchasePackage = useCallback((pkg: PurchasesPackage) => {
    return purchaseMutation.mutateAsync(pkg);
  }, [purchaseMutation]);

  const restorePurchase = useCallback(async () => {
    const result = await restoreMutation.mutateAsync();
    return result.hasEntitlement;
  }, [restoreMutation]);

  const currentOffering = offeringsQuery.data ?? null;

  return useMemo(() => ({
    isPro,
    drToxiRemaining,
    canUseDrToxi,
    consumeDrToxi,
    restorePurchase,
    purchasePackage,
    currentOffering,
    purchaseInProgress: purchaseMutation.isPending,
    restoreInProgress: restoreMutation.isPending,
    drToxiLimit: FREE_DRTOXI_LIMIT,
    freeHistoryLimit: FREE_HISTORY_LIMIT,
    isLoading: customerInfoQuery.isLoading || usageQuery.isLoading,
  }), [isPro, drToxiRemaining, canUseDrToxi, consumeDrToxi, restorePurchase, purchasePackage, currentOffering, purchaseMutation.isPending, restoreMutation.isPending, customerInfoQuery.isLoading, usageQuery.isLoading]);
});
