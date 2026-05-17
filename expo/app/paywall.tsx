import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Check, Heart, X, Crown, RefreshCw } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient as __useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { t, tf } from '@/utils/i18n';

let Purchases: any = null;
if (Platform.OS !== 'web') {
  try {
    Purchases = require('react-native-purchases').default;
  } catch (e) {
    console.log('[Paywall] Failed to load react-native-purchases');
  }
}

type PlanType = 'annual' | 'monthly';

const ICON_URL = 'https://r2-pub.rork.com/generated-images/3e815a64-7d01-4c73-af0a-f66395fbf225.png';
const FALLBACK_MONTHLY_PRICE = '2,99 CA$';
const FALLBACK_ANNUAL_PRICE = '29,99 CA$';
const FALLBACK_ANNUAL_MONTHLY = '2,50 CA$';

function formatAnnualMonthly(price: number | null | undefined, currencyCode: string | null | undefined): string {
  if (price == null) {
    return FALLBACK_ANNUAL_MONTHLY;
  }

  const monthlyEquivalent = (price / 12).toFixed(2).replace('.', ',');
  const suffix = currencyCode === 'CAD' || !currencyCode ? 'CA$' : currencyCode;
  return `${monthlyEquivalent} ${suffix}`;
}

export default function PaywallScreen() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { currentOffering, purchasePackage, restorePurchase, purchaseInProgress, restoreInProgress, offeringsLoading, offeringsError, refetchOfferings } = useSubscription();
  const queryClient = __useQueryClient();

  console.log('[Paywall] Rendering paywall, source:', source, 'offering:', currentOffering?.identifier, 'loading:', offeringsLoading, 'error:', offeringsError);

  useEffect(() => {
    if (!currentOffering && !offeringsLoading) {
      console.log('[Paywall] No offering available, triggering refetch');
      refetchOfferings();
    }
  }, [currentOffering, offeringsLoading, refetchOfferings]);

  const [retrying, setRetrying] = useState<boolean>(false);

  const handleRetryOfferings = useCallback(async () => {
    console.log('[Paywall] User tapped retry offerings');
    setRetrying(true);
    try {
      await refetchOfferings();
    } catch (e) {
      console.log('[Paywall] Retry failed:', e);
    } finally {
      setRetrying(false);
    }
  }, [refetchOfferings]);

  const monthlyPackage = currentOffering?.monthly ?? currentOffering?.availablePackages?.find((p: { identifier: string }) => p.identifier === '$rc_monthly') ?? null;
  const annualPackage = currentOffering?.annual ?? currentOffering?.availablePackages?.find((p: { identifier: string }) => p.identifier === '$rc_annual') ?? null;

  const monthlyPrice = monthlyPackage?.product?.priceString ?? FALLBACK_MONTHLY_PRICE;
  const annualPrice = annualPackage?.product?.priceString ?? FALLBACK_ANNUAL_PRICE;
  const annualMonthly = useMemo(() => {
    return formatAnnualMonthly(annualPackage?.product?.price, annualPackage?.product?.currencyCode);
  }, [annualPackage?.product?.currencyCode, annualPackage?.product?.price]);

  const handlePlanSelect = useCallback((plan: PlanType) => {
    console.log('[Paywall] Plan selected:', plan);
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    setSelectedPlan(plan);
  }, []);

  const handleSubscribe = useCallback(async () => {
    const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage;

    if (!pkg) {
      console.log('[Paywall] No package available for plan:', selectedPlan);
      Alert.alert(t('purchase_error'), t('purchase_load_error'));
      return;
    }

    console.log('[Paywall] Purchasing package:', pkg.identifier);

    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      const result = await purchasePackage(pkg);
      const activeEntitlements = result?.customerInfo?.entitlements?.active ?? {};
      const confirmed = !!activeEntitlements['toxiscan_pro'];
      console.log('[Paywall] Purchase completed, entitlement confirmed:', confirmed);
      if (Platform.OS !== 'web' && Purchases) {
        try {
          const freshInfo = await Purchases.getCustomerInfo();
          console.log('[Paywall] Fresh customer info fetched post-purchase');
          queryClient.setQueryData(['customerInfo'], freshInfo);
        } catch (e) {
          console.log('[Paywall] Error refreshing customer info:', e);
        }
      }
      Alert.alert(
        t('purchase_ready'),
        t('purchase_success'),
        [{ text: t('ok'), onPress: () => router.replace('/') }]
      );
    } catch (error: unknown) {
      const err = error as { userCancelled?: boolean; code?: number; message?: string };
      console.log('[Paywall] Purchase error:', JSON.stringify(error));
      
      if (err.userCancelled) {
        console.log('[Paywall] Purchase cancelled by user');
        return;
      }

      if (Platform.OS !== 'web' && Purchases) {
        try {
          console.log('[Paywall] Checking entitlement after error...');
          const freshInfo = await Purchases.getCustomerInfo();
          const activeEntitlements = freshInfo?.entitlements?.active ?? {};
          const hasEntitlement = !!activeEntitlements['toxiscan_pro'];
          console.log('[Paywall] Post-error entitlement check:', hasEntitlement);
          queryClient.setQueryData(['customerInfo'], freshInfo);
          
          if (hasEntitlement) {
            Alert.alert(
              t('purchase_ready'),
              t('purchase_success'),
              [{ text: t('ok'), onPress: () => router.replace('/') }]
            );
            return;
          }
        } catch (recheckError) {
          console.log('[Paywall] Error rechecking entitlement:', recheckError);
        }
      }

      Alert.alert(t('purchase_error'), t('purchase_failed'));
    }
  }, [annualPackage, monthlyPackage, purchasePackage, selectedPlan, queryClient]);

  const handleDismiss = useCallback(() => {
    console.log('[Paywall] Dismissed from source:', source);
    router.back();
  }, [source]);

  const handleRestore = useCallback(async () => {
    console.log('[Paywall] Restore tapped');
    try {
      const hasEntitlement = await restorePurchase();
      if (hasEntitlement) {
        if (Platform.OS !== 'web' && Purchases) {
          try {
            const freshInfo = await Purchases.getCustomerInfo();
            queryClient.setQueryData(['customerInfo'], freshInfo);
            console.log('[Paywall] Refreshed customer info after restore');
          } catch (e) {
            console.log('[Paywall] Error refreshing after restore:', e);
          }
        }
        Alert.alert(
          t('subscription_restored'),
          t('subscription_restored_desc'),
          [{ text: t('great'), onPress: () => router.replace('/') }]
        );
      } else {
        Alert.alert(t('no_subscription'), t('no_subscription_desc'));
      }
    } catch (error: unknown) {
      console.log('[Paywall] Restore error:', error);
      Alert.alert(t('purchase_error'), t('restore_error'));
    }
  }, [restorePurchase, queryClient]);

  const getContextTitle = (): string => {
    switch (source) {
      case 'drtoxi': return t('paywall_drtoxi');
      case 'history': return t('paywall_history');
      case 'favorite': return t('paywall_favorite');
      case 'alerts': return t('paywall_alerts');
      case 'scan': return t('paywall_scan');
      default: return t('paywall_default');
    }
  };

  const getContextSubtitle = (): string => {
    switch (source) {
      case 'drtoxi': return t('paywall_sub_drtoxi');
      case 'history': return t('paywall_sub_history');
      case 'favorite': return t('paywall_sub_favorite');
      case 'alerts': return t('paywall_sub_alerts');
      case 'scan': return t('paywall_sub_scan');
      default: return t('paywall_sub_default');
    }
  };

  const isLoading = purchaseInProgress || restoreInProgress;
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.closeButton, { top: insets.top + 12 }]} onPress={handleDismiss} testID="paywall-close" disabled={isLoading}>
        <View style={styles.closeCircle}>
          <X color={Colors.textSecondary} size={18} />
        </View>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.iconContainer}>
          <Image source={{ uri: ICON_URL }} style={styles.appIcon} contentFit="contain" />
        </View>

        <Text style={styles.title}>{getContextTitle()}</Text>
        <Text style={styles.subtitle}>{getContextSubtitle()}</Text>

        <View style={styles.benefitsContainer}>
          <BenefitRow text={t('benefit_unlimited_drtoxi')} />
          <BenefitRow text={t('benefit_unlimited_history')} />
          <BenefitRow text={t('benefit_favorites')} />
          <BenefitRow text={t('benefit_notifications')} />
        </View>

        {(offeringsLoading || retrying) && !currentOffering ? (
          <View style={styles.loadingOfferings}>
            <ActivityIndicator color="#2E9E34" size="large" />
            <Text style={styles.loadingOfferingsText}>{t('loading_offers')}</Text>
          </View>
        ) : offeringsError && !currentOffering ? (
          <View style={styles.errorOfferings}>
            <Text style={styles.errorOfferingsText}>{t('purchase_load_error')}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetryOfferings} activeOpacity={0.7}>
              <RefreshCw color={Colors.white} size={16} />
              <Text style={styles.retryButtonText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.plansContainer}>
            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
              onPress={() => handlePlanSelect('annual')}
              activeOpacity={0.8}
              testID="plan-annual"
              disabled={isLoading}
            >
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{t('save_45')}</Text>
              </View>
              <View style={styles.planRadio}>
                <View style={[styles.radioOuter, selectedPlan === 'annual' && styles.radioOuterSelected]}>
                  {selectedPlan === 'annual' && <View style={styles.radioInner} />}
                </View>
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planTitle}>{tf('annual_plan', annualPrice)}</Text>
                <Text style={styles.planSubtext}>{tf('monthly_equivalent', annualMonthly)}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
              onPress={() => handlePlanSelect('monthly')}
              activeOpacity={0.8}
              testID="plan-monthly"
              disabled={isLoading}
            >
              <View style={styles.planRadio}>
                <View style={[styles.radioOuter, selectedPlan === 'monthly' && styles.radioOuterSelected]}>
                  {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
                </View>
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planTitle}>{tf('monthly_plan', monthlyPrice)}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.ctaButton, isLoading && styles.ctaButtonDisabled]}
          onPress={handleSubscribe}
          activeOpacity={0.85}
          testID="paywall-subscribe"
          disabled={isLoading}
        >
          {purchaseInProgress ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Crown color={Colors.white} size={20} />
              <Text style={styles.ctaButtonText}>{t('upgrade_pro')}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.donationRow}>
          <Heart color={Colors.primary} size={16} fill={Colors.primary} />
          <Text style={styles.donationText}>
            {t('donation_text')}
          </Text>
        </View>

        <Text style={styles.legalText}>
          {t('legal_text')}
        </Text>

        <TouchableOpacity onPress={handleRestore} style={styles.restoreButton} testID="paywall-restore" disabled={isLoading}>
          {restoreInProgress ? (
            <ActivityIndicator color={Colors.textSecondary} size="small" />
          ) : (
            <Text style={styles.restoreText}>{t('restore_purchases')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.legalLinksRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://spiny-waltz-902.notion.site/Conditions-d-utilisation-33586d85fa4b801fa0a6d69dfbdf9d1e')}>
            <Text style={styles.legalLinkText}>{t('terms_of_use')}</Text>
          </TouchableOpacity>
          <Text style={styles.legalLinkSeparator}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://spiny-waltz-902.notion.site/Politique-de-confidentialit-ToxiScan-33286d85fa4b808f9170ea136941f2cc')}>
            <Text style={styles.legalLinkText}>{t('privacy_policy')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function BenefitRow({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.checkCircle}>
        <Check color={Colors.white} size={14} strokeWidth={3} />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  closeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    backgroundColor: Colors.white,
  },
  appIcon: {
    width: 88,
    height: 88,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  benefitsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2E9E34',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  plansContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  planCardSelected: {
    borderColor: '#2E9E34',
    backgroundColor: '#F7FDF9',
    shadowColor: '#2E9E34',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  planBadge: {
    position: 'absolute',
    top: -11,
    right: 16,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  planRadio: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#2E9E34',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2E9E34',
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.1,
  },
  planSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  ctaButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2E9E34',
    paddingVertical: 20,
    borderRadius: 18,
    marginBottom: 20,
    shadowColor: '#237A28',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: -0.2,
  },
  donationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  donationText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 19,
  },
  legalText: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  restoreButton: {
    marginBottom: 12,
    paddingVertical: 8,
  },
  restoreText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  legalLinkText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  legalLinkSeparator: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  bottomSpacer: {
    height: 20,
  },
  loadingOfferings: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
    marginBottom: 24,
  },
  loadingOfferingsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  errorOfferings: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 16,
    marginBottom: 24,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  errorOfferingsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2E9E34',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
