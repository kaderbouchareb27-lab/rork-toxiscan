import { useState, useEffect, useMemo, useCallback } from 'react';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import {
  loadLifetimeUsage,
  incrementLifetimeUsage,
  incrementProductScan,
  todayLocalDateString,
  tagAppUserId,
  type LifetimeUsage,
} from '@/utils/usageStore';

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

// Freemium model (spec §13): product scan is FREE & UNLIMITED (the hook). Monetization
// is concentrated on the meal scan + Dr. Toxi chat, with LIFETIME counters (not per-day).
// The counters are persisted in the device Keychain (utils/usageStore) so an
// uninstall/reinstall can NEVER reset them, and are tagged with the RevenueCat appUserID.
const FREE_DRTOXI_LIMIT = 6; // lifetime chat messages
const FREE_MEAL_SCAN_LIMIT = 3; // lifetime meal scans
const FREE_PRODUCT_SCAN_PER_DAY = 3; // product scans per local day (resets daily)
const FREE_HISTORY_LIMIT = 3;
const ENTITLEMENT_ID = 'toxiscan_pro';

function getDefaultUsage(): LifetimeUsage {
  return { mealScanCount: 0, drToxiCount: 0, productScanCount: 0, productScanDay: '' };
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
  const [usage, setUsage] = useState<LifetimeUsage>(getDefaultUsage());
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
      console.log('[RevenueCat] Fetching offerings...');
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Offerings fetch timeout after 15s')), 15000)
      );
      try {
        const offerings = await Promise.race([
          Purchases.getOfferings(),
          timeoutPromise,
        ]);
        console.log('[RevenueCat] Offerings fetched:', offerings.current?.identifier);
        if (offerings.current?.availablePackages) {
          console.log('[RevenueCat] Available packages:', offerings.current.availablePackages.map((p: any) => p.identifier));
        }
        if (!offerings.current) {
          console.log('[RevenueCat] No current offering found');
        }
        return offerings.current ?? null;
      } catch (e) {
        console.log('[RevenueCat] Offerings fetch failed:', e);
        throw e;
      }
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 1000 * 60 * 5,
  });

  const usageQuery = useQuery({
    queryKey: ['lifetimeUsage'],
    queryFn: async () => loadLifetimeUsage(),
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
      setUsage(usageQuery.data);
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

  // Persist the RevenueCat appUserID alongside the counters for traceability.
  useEffect(() => {
    const appUserId = customerInfoQuery.data?.originalAppUserId as string | undefined;
    if (appUserId) void tagAppUserId(appUserId);
  }, [customerInfoQuery.data]);

  // Increments a lifetime counter in the persistent (Keychain-backed) store and
  // reconciles local state to the authoritative, monotonic value.
  const incrementUsageMutation = useMutation({
    mutationFn: async (field: 'mealScanCount' | 'drToxiCount') => {
      const appUserId = customerInfoQuery.data?.originalAppUserId as string | undefined;
      return incrementLifetimeUsage(field, appUserId);
    },
    onSuccess: (updated) => {
      setUsage(updated);
      queryClient.setQueryData(['lifetimeUsage'], updated);
    },
  });

  const incrementProductScanMutation = useMutation({
    mutationFn: async () => {
      const appUserId = customerInfoQuery.data?.originalAppUserId as string | undefined;
      return incrementProductScan(appUserId);
    },
    onSuccess: (updated) => {
      setUsage(updated);
      queryClient.setQueryData(['lifetimeUsage'], updated);
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

  // ── Dr. Toxi chat — 6 free messages, LIFETIME (the verdict of a meal scan is NOT a chat message) ──
  const drToxiRemaining = useMemo(() => {
    if (isPro) return Infinity;
    return Math.max(0, FREE_DRTOXI_LIMIT - usage.drToxiCount);
  }, [isPro, usage.drToxiCount]);

  const canUseDrToxi = useMemo(() => isPro || usage.drToxiCount < FREE_DRTOXI_LIMIT, [isPro, usage.drToxiCount]);

  const consumeDrToxi = useCallback(() => {
    if (isPro) return;
    // Optimistic bump for instant gating; the mutation persists & reconciles to the max.
    setUsage((current) => ({ ...current, drToxiCount: current.drToxiCount + 1 }));
    incrementUsageMutation.mutate('drToxiCount');
  }, [isPro, incrementUsageMutation]);

  // ── Meal scan — 3 free, LIFETIME (full verdict each time) ──
  const mealScanRemaining = useMemo(() => {
    if (isPro) return Infinity;
    return Math.max(0, FREE_MEAL_SCAN_LIMIT - usage.mealScanCount);
  }, [isPro, usage.mealScanCount]);

  const canMealScan = useMemo(() => isPro || usage.mealScanCount < FREE_MEAL_SCAN_LIMIT, [isPro, usage.mealScanCount]);

  const consumeMealScan = useCallback(() => {
    if (isPro) return;
    // Optimistic bump for instant gating; the mutation persists & reconciles to the max.
    setUsage((current) => ({ ...current, mealScanCount: current.mealScanCount + 1 }));
    incrementUsageMutation.mutate('mealScanCount');
  }, [isPro, incrementUsageMutation]);

  // ── Product scan — 3 free per local day (resets daily), then paywall ──
  const todayStr = todayLocalDateString();
  const productScanCountToday = usage.productScanDay === todayStr ? usage.productScanCount : 0;

  const productScanRemaining = useMemo(() => {
    if (isPro) return Infinity;
    return Math.max(0, FREE_PRODUCT_SCAN_PER_DAY - productScanCountToday);
  }, [isPro, productScanCountToday]);

  const canScan = useMemo(
    () => isPro || productScanCountToday < FREE_PRODUCT_SCAN_PER_DAY,
    [isPro, productScanCountToday],
  );

  const consumeScan = useCallback(() => {
    if (isPro) return;
    const today = todayLocalDateString();
    // Optimistic bump for instant gating; the mutation persists & reconciles.
    setUsage((current) => {
      const sameDay = current.productScanDay === today;
      return {
        ...current,
        productScanDay: today,
        productScanCount: sameDay ? current.productScanCount + 1 : 1,
      };
    });
    incrementProductScanMutation.mutate();
  }, [isPro, incrementProductScanMutation]);

  const purchasePackage = useCallback((pkg: PurchasesPackage) => {
    return purchaseMutation.mutateAsync(pkg);
  }, [purchaseMutation]);

  const restorePurchase = useCallback(async () => {
    const result = await restoreMutation.mutateAsync();
    return result.hasEntitlement;
  }, [restoreMutation]);

  const currentOffering = offeringsQuery.data ?? null;

  const refetchOfferings = useCallback(() => {
    console.log('[RevenueCat] Manual refetch of offerings triggered');
    return offeringsQuery.refetch();
  }, [offeringsQuery]);

  return useMemo(() => ({
    isPro,
    // Dr. Toxi chat (lifetime)
    drToxiRemaining,
    canUseDrToxi,
    consumeDrToxi,
    drToxiLimit: FREE_DRTOXI_LIMIT,
    // Meal scan (lifetime)
    canMealScan,
    mealScanRemaining,
    consumeMealScan,
    mealScanLimit: FREE_MEAL_SCAN_LIMIT,
    // Product scan (3 free per day, resets daily)
    canScan,
    scanRemaining: productScanRemaining,
    consumeScan,
    scanLimit: FREE_PRODUCT_SCAN_PER_DAY,
    // Purchases
    restorePurchase,
    purchasePackage,
    currentOffering,
    purchaseInProgress: purchaseMutation.isPending,
    restoreInProgress: restoreMutation.isPending,
    freeHistoryLimit: FREE_HISTORY_LIMIT,
    isLoading: customerInfoQuery.isLoading || usageQuery.isLoading,
    offeringsLoading: offeringsQuery.isLoading,
    offeringsError: offeringsQuery.isError,
    refetchOfferings,
  }), [isPro, drToxiRemaining, canUseDrToxi, consumeDrToxi, canMealScan, mealScanRemaining, consumeMealScan, canScan, productScanRemaining, consumeScan, restorePurchase, purchasePackage, currentOffering, purchaseMutation.isPending, restoreMutation.isPending, customerInfoQuery.isLoading, usageQuery.isLoading, offeringsQuery.isLoading, offeringsQuery.isError, refetchOfferings]);
});
