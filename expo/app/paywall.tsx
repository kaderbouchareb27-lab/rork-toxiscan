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
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart3,
  Check,
  ChevronRight,
  Crown,
  Heart,
  LockKeyhole,
  MessageCircle,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient as __useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { DR_TOXI_DEFAULT_AVATAR_URI } from '@/constants/drToxiAvatars';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { t, tf } from '@/utils/i18n';

let Purchases: any = null;
if (Platform.OS !== 'web') {
  try {
    Purchases = require('react-native-purchases').default;
  } catch {
    console.log('[Paywall] Failed to load react-native-purchases');
  }
}

type PlanType = 'annual' | 'monthly';

function findPlanPackage(offering: any, plan: PlanType): any {
  if (!offering) return null;

  const directPackage = plan === 'annual' ? offering.annual : offering.monthly;
  if (directPackage) return directPackage;

  const availablePackages: any[] = Array.isArray(offering.availablePackages)
    ? offering.availablePackages
    : [];
  const planPattern = plan === 'annual' ? /(annual|yearly|year|p1y)/i : /(monthly|month|p1m)/i;

  return availablePackages.find((pkg: any) => {
    const signature = [
      pkg?.identifier,
      pkg?.packageType,
      pkg?.product?.identifier,
      pkg?.product?.subscriptionPeriod,
      pkg?.product?.defaultOption?.billingPeriod,
    ].filter(Boolean).join(' ');
    return planPattern.test(signature);
  }) ?? null;
}

const PAYWALL_BG = '#F5F0E8';
const FALLBACK_MONTHLY_PRICE = '4,99 CA$';
const FALLBACK_ANNUAL_PRICE = '29,99 CA$';
const FALLBACK_ANNUAL_MONTHLY = '2,50 CA$';
// Fallback savings when live prices are unavailable: 4,99 × 12 = 59,88 vs 29,99 → ~50%
const FALLBACK_SAVINGS_PERCENT = 50;

function formatAnnualMonthly(price: number | null | undefined, currencyCode: string | null | undefined): string {
  if (price == null) {
    return FALLBACK_ANNUAL_MONTHLY;
  }

  const monthlyEquivalent = (price / 12).toFixed(2).replace('.', ',');
  const suffix = currencyCode === 'CAD' || !currencyCode ? 'CA$' : currencyCode;
  return `${monthlyEquivalent} ${suffix}`;
}

function getFreeTrialDays(pkg: any): number | null {
  const introPrice = pkg?.product?.introPrice;
  const introPriceValue = introPrice?.price ?? introPrice?.priceAmountMicros;
  if (introPrice && Number(introPriceValue) === 0) {
    const units = Number(introPrice.periodNumberOfUnits ?? 1);
    const unit = String(introPrice.periodUnit ?? '').toLowerCase();
    if (unit.includes('day')) return units;
    if (unit.includes('week')) return units * 7;
    if (unit.includes('month')) return units * 30;
  }

  const freePhase = pkg?.product?.defaultOption?.freePhase;
  if (freePhase) {
    const isoPeriod = String(freePhase.billingPeriod?.iso8601 ?? freePhase.billingPeriod ?? '');
    const dayMatch = isoPeriod.match(/^P(\d+)D$/i);
    if (dayMatch) return Number(dayMatch[1]);
    const weekMatch = isoPeriod.match(/^P(\d+)W$/i);
    if (weekMatch) return Number(weekMatch[1]) * 7;
  }

  return null;
}

export default function PaywallScreen() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { currentOffering, purchasePackage, restorePurchase, purchaseInProgress, restoreInProgress, offeringsLoading, refetchOfferings } = useSubscription();
  const queryClient = __useQueryClient();

  console.log('[Paywall] Rendering paywall, source:', source, 'offering:', currentOffering?.identifier, 'loading:', offeringsLoading);

  useEffect(() => {
    if (!currentOffering && !offeringsLoading) {
      console.log('[Paywall] No offering available, triggering refetch');
      refetchOfferings();
    }
  }, [currentOffering, offeringsLoading, refetchOfferings]);

  const monthlyPackage = findPlanPackage(currentOffering, 'monthly');
  const annualPackage = findPlanPackage(currentOffering, 'annual');

  const monthlyPrice = monthlyPackage?.product?.priceString ?? FALLBACK_MONTHLY_PRICE;
  const annualPrice = annualPackage?.product?.priceString ?? FALLBACK_ANNUAL_PRICE;
  const annualMonthly = useMemo(() => {
    return formatAnnualMonthly(annualPackage?.product?.price, annualPackage?.product?.currencyCode);
  }, [annualPackage?.product?.currencyCode, annualPackage?.product?.price]);

  const savingsPercent = useMemo(() => {
    const monthly = monthlyPackage?.product?.price;
    const annual = annualPackage?.product?.price;
    if (typeof monthly === 'number' && typeof annual === 'number' && monthly > 0) {
      const pct = Math.round((1 - annual / (monthly * 12)) * 100);
      if (pct > 0) return pct;
    }
    return FALLBACK_SAVINGS_PERCENT;
  }, [monthlyPackage?.product?.price, annualPackage?.product?.price]);

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
      case 'scan':
      case 'product': return t('paywall_scan');
      case 'meal': return t('paywall_meal');
      case 'report': return t('paywall_report');
      default: return t('paywall_default');
    }
  };

  const getContextSubtitle = (): string => {
    switch (source) {
      case 'drtoxi': return t('paywall_sub_drtoxi');
      case 'history': return t('paywall_sub_history');
      case 'favorite': return t('paywall_sub_favorite');
      case 'alerts': return t('paywall_sub_alerts');
      case 'scan':
      case 'product': return t('paywall_sub_scan');
      case 'meal': return t('paywall_sub_meal');
      case 'report': return t('paywall_sub_report');
      default: return t('paywall_sub_default');
    }
  };

  const isLoading = purchaseInProgress || restoreInProgress;
  const insets = useSafeAreaInsets();
  const isMandatory = source === 'scan' || source === 'product' || source === 'drtoxi';

  const billedAmount = selectedPlan === 'annual' ? annualPrice : monthlyPrice;
  const billedPeriod = selectedPlan === 'annual' ? t('per_year') : t('per_month');
  const selectedPackage = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
  const freeTrialDays = getFreeTrialDays(selectedPackage);
  const hasFreeTrial = freeTrialDays !== null;
  const ctaLabel = hasFreeTrial
    ? tf('start_free_trial_days', freeTrialDays)
    : tf('subscribe_for_price', billedAmount, billedPeriod);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFF9EE', '#F2F7EA', '#EEF9F0']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      {!isMandatory && (
        <TouchableOpacity style={[styles.closeButton, { top: insets.top + 12 }]} onPress={handleDismiss} testID="paywall-close" disabled={isLoading}>
          <View style={styles.closeCircle}>
            <X color={Colors.textSecondary} size={18} />
          </View>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 286 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <LinearGradient colors={['#071F12', '#0F4A25', '#2E9E34']} locations={[0, 0.58, 1]} style={styles.heroCard}>
          <View style={styles.heroShine} />
          <View style={styles.heroOrbOne} />
          <View style={styles.heroOrbTwo} />
          <View style={styles.heroOrbThree} />

          <View style={styles.heroTopRow}>
            <View style={styles.avatarHaloOuter}>
              <View style={styles.avatarHalo}>
                <Image source={{ uri: DR_TOXI_DEFAULT_AVATAR_URI }} style={styles.drToxiAvatar} contentFit="contain" />
              </View>
            </View>
            <View style={styles.proBadge}>
              <Crown color="#FFF2B8" size={15} strokeWidth={2.5} />
              <Text style={styles.proBadgeText}>{t('paywall_pro_badge')}</Text>
            </View>
          </View>

          <View style={styles.limitPill}>
            <LockKeyhole color="#D9FBE1" size={14} strokeWidth={2.6} />
            <Text style={styles.limitPillText}>{t('paywall_limit_reached')}</Text>
          </View>
          <Text style={styles.premiumLabel}>{t('paywall_premium_label')}</Text>
          <Text style={styles.title}>{getContextTitle()}</Text>
          <Text style={styles.subtitle}>{getContextSubtitle()}</Text>

          <View style={styles.heroPromiseCard}>
            <View style={styles.promiseIconShell}>
              <Sparkles color="#2E9E34" size={17} strokeWidth={2.6} />
            </View>
            <Text style={styles.heroPromiseText}>{t('paywall_marketing_promise')}</Text>
          </View>

          <View style={styles.valueGrid}>
            <ValuePill value={t('paywall_value_unlimited')} label={t('paywall_value_unlimited_sub')} />
            <ValuePill value={t('paywall_value_ai')} label={t('paywall_value_ai_sub')} />
            <ValuePill value={t('paywall_value_impact')} label={t('paywall_value_impact_sub')} />
          </View>

          <View style={styles.trustRow}>
            <TrustChip icon={<ShieldCheck color="#D9FBE1" size={14} strokeWidth={2.4} />} text={t('paywall_trust_secure')} />
            <TrustChip icon={<Sparkles color="#D9FBE1" size={14} strokeWidth={2.4} />} text={t('paywall_trust_premium_ai')} />
          </View>
        </LinearGradient>

        <View style={styles.benefitsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>{t('paywall_included_eyebrow')}</Text>
            <Text style={styles.sectionTitle}>{t('paywall_included_title')}</Text>
          </View>
          <BenefitRow icon={<ScanLine color={Colors.primary} size={19} strokeWidth={2.5} />} title={t('benefit_unlimited_product_scans')} description={t('benefit_unlimited_product_scans_desc')} />
          <BenefitRow icon={<Utensils color={Colors.primary} size={19} strokeWidth={2.5} />} title={t('benefit_unlimited_meal_scans')} description={t('benefit_unlimited_meal_scans_desc')} />
          <BenefitRow icon={<BarChart3 color={Colors.primary} size={19} strokeWidth={2.5} />} title={t('benefit_weekly_report')} description={t('benefit_weekly_report_desc')} />
          <BenefitRow icon={<Sparkles color={Colors.primary} size={19} strokeWidth={2.5} />} title={t('benefit_recommendations')} description={t('benefit_recommendations_desc')} />
          <BenefitRow icon={<MessageCircle color={Colors.primary} size={19} strokeWidth={2.5} />} title={t('benefit_unlimited_drtoxi')} description={t('benefit_unlimited_drtoxi_desc')} />
        </View>

        <View style={styles.donationRow}>
          <View style={styles.heartShell}>
            <Heart color={Colors.primary} size={18} fill={Colors.primary} />
          </View>
          <View style={styles.donationCopy}>
            <Text style={styles.donationTitle}>{t('paywall_impact_title')}</Text>
            <Text style={styles.donationText}>{t('donation_text')}</Text>
          </View>
        </View>

        <Text style={styles.legalText}>{t('legal_text')}</Text>

        <View style={styles.legalLinksRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://spiny-waltz-902.notion.site/Conditions-d-utilisation-33586d85fa4b801fa0a6d69dfbdf9d1e')}>
            <Text style={styles.legalLinkText}>{t('terms_of_use')}</Text>
          </TouchableOpacity>
          <Text style={styles.legalLinkSeparator}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://spiny-waltz-902.notion.site/Politique-de-confidentialit-ToxiScan-33286d85fa4b808f9170ea136941f2cc')}>
            <Text style={styles.legalLinkText}>{t('privacy_policy')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.footerPlansRow} accessibilityRole="radiogroup">
          <TouchableOpacity
            style={[styles.footerPlanCard, selectedPlan === 'monthly' && styles.footerPlanCardSelected]}
            onPress={() => handlePlanSelect('monthly')}
            activeOpacity={0.84}
            testID="plan-monthly"
            disabled={isLoading}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedPlan === 'monthly', disabled: isLoading }}
          >
            <View style={styles.footerPlanHeader}>
              <Text style={styles.footerPlanName}>{t('paywall_monthly_label')}</Text>
              <View style={[styles.footerRadioOuter, selectedPlan === 'monthly' && styles.footerRadioOuterSelected]}>
                {selectedPlan === 'monthly' && <View style={styles.footerRadioInner} />}
              </View>
            </View>
            <Text style={styles.footerPlanPrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{monthlyPrice}</Text>
            <Text style={styles.footerPlanPeriod}>{t('paywall_per_month')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.footerPlanCard, selectedPlan === 'annual' && styles.footerPlanCardSelected]}
            onPress={() => handlePlanSelect('annual')}
            activeOpacity={0.84}
            testID="plan-annual"
            disabled={isLoading}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedPlan === 'annual', disabled: isLoading }}
          >
            <View style={styles.footerSavingsBadge}>
              <Text style={styles.footerSavingsBadgeText}>{tf('save_percent', savingsPercent)}</Text>
            </View>
            <View style={styles.footerPlanHeader}>
              <Text style={styles.footerPlanName}>{t('paywall_annual_label')}</Text>
              <View style={[styles.footerRadioOuter, selectedPlan === 'annual' && styles.footerRadioOuterSelected]}>
                {selectedPlan === 'annual' && <View style={styles.footerRadioInner} />}
              </View>
            </View>
            <Text style={styles.footerPlanPrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{annualPrice}</Text>
            <Text style={styles.footerPlanPeriod}>{t('paywall_per_year')} · {tf('monthly_equivalent', annualMonthly)}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerBillingNote} testID="paywall-billed-amount" numberOfLines={2}>
          {hasFreeTrial
            ? tf('paywall_dynamic_trial_note', freeTrialDays, billedAmount, billedPeriod)
            : tf('paywall_no_trial_note', billedAmount, billedPeriod)}
        </Text>
        <View style={styles.ctaMetaRow}>
          <ShieldCheck color={Colors.primary} size={13} strokeWidth={2.5} />
          <Text style={styles.ctaMetaText}>{t('paywall_secure_purchase')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.ctaButton, isLoading && styles.ctaButtonDisabled]}
          onPress={handleSubscribe}
          activeOpacity={0.88}
          testID="paywall-subscribe"
          disabled={isLoading}
        >
          <LinearGradient colors={['#34B244', '#229C31', '#147624']} style={styles.ctaGradient}>
            {purchaseInProgress ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <Crown color={Colors.white} size={20} strokeWidth={2.6} />
                <Text style={styles.ctaButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76}>{ctaLabel}</Text>
                <ChevronRight color={Colors.white} size={20} strokeWidth={2.8} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRestore} style={styles.restoreButton} testID="paywall-restore" disabled={isLoading}>
          {restoreInProgress ? (
            <ActivityIndicator color={Colors.textSecondary} size="small" />
          ) : (
            <Text style={styles.restoreText}>{t('restore_purchases')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TrustChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.trustChip}>
      {icon}
      <Text style={styles.trustChipText}>{text}</Text>
    </View>
  );
}

function ValuePill({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.valuePill}>
      <Text style={styles.valuePillValue}>{value}</Text>
      <Text style={styles.valuePillLabel}>{label}</Text>
    </View>
  );
}

function BenefitRow({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <LinearGradient colors={['#FFFFFF', '#F7FFF8']} style={styles.benefitRow}>
      <View style={styles.benefitIconShell}>{icon}</View>
      <View style={styles.benefitCopy}>
        <Text style={styles.benefitText}>{title}</Text>
        <Text style={styles.benefitDescription}>{description}</Text>
      </View>
      <View style={styles.benefitCheckCircle}>
        <Check color={Colors.white} size={13} strokeWidth={3} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAYWALL_BG,
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -150,
    right: -130,
    width: 310,
    height: 310,
    borderRadius: 155,
    backgroundColor: 'rgba(46, 158, 52, 0.18)',
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: 86,
    left: -130,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 183, 77, 0.18)',
  },
  closeButton: {
    position: 'absolute',
    right: 18,
    zIndex: 10,
  },
  closeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0E2B1B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  scrollContent: {
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  heroCard: {
    width: '100%',
    minHeight: 470,
    borderRadius: 38,
    padding: 22,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#12391F',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.30,
    shadowRadius: 34,
    elevation: 12,
  },
  heroShine: {
    position: 'absolute',
    top: -118,
    left: -88,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroOrbOne: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    top: -72,
    right: -62,
  },
  heroOrbTwo: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 210, 111, 0.18)',
    bottom: -58,
    left: -54,
  },
  heroOrbThree: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    right: 28,
    bottom: 134,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  avatarHaloOuter: {
    width: 106,
    height: 106,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#071F12',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
  },
  avatarHalo: {
    width: 92,
    height: 92,
    borderRadius: 31,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.78)',
  },
  drToxiAvatar: {
    width: 80,
    height: 80,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.26)',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  proBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 0.4,
  },
  limitPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(8, 28, 16, 0.42)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(217, 251, 225, 0.16)',
  },
  limitPillText: {
    color: '#D9FBE1',
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
  },
  premiumLabel: {
    color: '#B9F7C5',
    fontSize: 12,
    fontWeight: '900' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  title: {
    fontSize: 34,
    fontWeight: '900' as const,
    color: Colors.white,
    lineHeight: 38,
    letterSpacing: -1.25,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.86)',
    lineHeight: 23,
    fontWeight: '600' as const,
    marginBottom: 14,
  },
  heroPromiseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 20,
    padding: 12,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.70)',
  },
  promiseIconShell: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: 'rgba(46, 158, 52, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPromiseText: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800' as const,
  },
  valueGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  valuePill: {
    flex: 1,
    minHeight: 62,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  valuePillValue: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900' as const,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  valuePillLabel: {
    color: 'rgba(232, 255, 238, 0.78)',
    fontSize: 10,
    fontWeight: '800' as const,
    textAlign: 'center',
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  trustChipText: {
    color: '#E8FFEE',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  benefitsContainer: {
    width: '100%',
    gap: 10,
    marginBottom: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 30,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.86)',
    shadowColor: '#132819',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.09,
    shadowRadius: 28,
    elevation: 5,
  },
  sectionHeader: {
    marginBottom: 6,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: Colors.primary,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '900' as const,
    color: Colors.text,
    letterSpacing: -0.55,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(46, 158, 52, 0.08)',
  },
  benefitIconShell: {
    width: 40,
    height: 40,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 158, 52, 0.10)',
  },
  benefitCopy: {
    flex: 1,
  },
  benefitCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: Colors.text,
    lineHeight: 19,
  },
  benefitDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  footerPlansRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 9,
  },
  footerPlanCard: {
    flex: 1,
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(40, 36, 28, 0.12)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 9,
  },
  footerPlanCardSelected: {
    borderColor: '#2E9E34',
    borderWidth: 2,
    backgroundColor: '#F1FFF4',
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  footerPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  footerPlanName: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '900' as const,
    letterSpacing: -0.2,
  },
  footerPlanPrice: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  footerPlanPeriod: {
    color: Colors.textSecondary,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '700' as const,
    marginTop: 1,
  },
  footerRadioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CFC8BD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerRadioOuterSelected: {
    borderColor: '#2E9E34',
  },
  footerRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E9E34',
  },
  footerSavingsBadge: {
    position: 'absolute',
    top: -10,
    right: 8,
    zIndex: 2,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F26A32',
    shadowColor: '#F26A32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 5,
  },
  footerSavingsBadgeText: {
    color: Colors.white,
    fontSize: 9.5,
    fontWeight: '900' as const,
    letterSpacing: 0.1,
  },
  donationRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    marginBottom: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 26,
    padding: 17,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.84)',
    shadowColor: '#102819',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  heartShell: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(46, 158, 52, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donationCopy: {
    flex: 1,
  },
  donationTitle: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '900' as const,
    marginBottom: 4,
  },
  donationText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  legalText: {
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 6,
    marginBottom: 14,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  legalLinkText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
    fontWeight: '600' as const,
  },
  legalLinkSeparator: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 14,
    backgroundColor: 'rgba(250, 248, 241, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(45, 106, 79, 0.10)',
    shadowColor: '#102819',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.10,
    shadowRadius: 26,
    elevation: 14,
  },
  footerBillingNote: {
    color: Colors.textSecondary,
    fontSize: 10.5,
    fontWeight: '600' as const,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 5,
    paddingHorizontal: 6,
  },
  ctaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 7,
  },
  ctaMetaText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  ctaButton: {
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.38,
    shadowRadius: 26,
    elevation: 12,
  },
  ctaGradient: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaButtonText: {
    flexShrink: 1,
    color: Colors.white,
    fontSize: 18,
    fontWeight: '900' as const,
    letterSpacing: -0.45,
  },
  restoreButton: {
    alignSelf: 'center',
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  restoreText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
    fontWeight: '700' as const,
  },
});
