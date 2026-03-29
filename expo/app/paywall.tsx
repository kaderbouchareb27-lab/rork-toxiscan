import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Check, Heart, X, Crown } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSubscription } from '@/providers/SubscriptionProvider';

type PlanType = 'annual' | 'monthly';

const ICON_URL = 'https://r2-pub.rork.com/generated-images/948662bd-b633-4d6d-84ad-982e7075e1fc.png';

export default function PaywallScreen() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { currentOffering, purchasePackage, restorePurchase, purchaseInProgress, restoreInProgress } = useSubscription();

  const monthlyPackage = currentOffering?.monthly ?? currentOffering?.availablePackages?.find(p => p.identifier === '$rc_monthly') ?? null;
  const annualPackage = currentOffering?.annual ?? currentOffering?.availablePackages?.find(p => p.identifier === '$rc_annual') ?? null;

  const monthlyPrice = monthlyPackage?.product?.priceString ?? '2,99 $';
  const annualPrice = annualPackage?.product?.priceString ?? '29,99 $';
  const annualMonthly = annualPackage?.product?.price != null
    ? `${(annualPackage.product.price / 12).toFixed(2).replace('.', ',')} ${annualPackage.product.currencyCode ?? '$'}`
    : '2,50 $';

  const handlePlanSelect = useCallback((plan: PlanType) => {
    console.log('[Paywall] Plan selected:', plan);
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    setSelectedPlan(plan);
  }, []);

  const handleSubscribe = useCallback(() => {
    const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
    if (!pkg) {
      console.log('[Paywall] No package available for plan:', selectedPlan);
      Alert.alert('Erreur', 'Impossible de charger les offres. Veuillez réessayer.');
      return;
    }
    console.log('[Paywall] Purchasing package:', pkg.identifier);
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    purchasePackage(pkg);
  }, [selectedPlan, annualPackage, monthlyPackage, purchasePackage]);

  const handleDismiss = useCallback(() => {
    console.log('[Paywall] Dismissed');
    router.back();
  }, []);

  const handleRestore = useCallback(() => {
    console.log('[Paywall] Restore tapped');
    restorePurchase();
  }, [restorePurchase]);

  const getContextTitle = () => {
    switch (source) {
      case 'drtoxi':
        return 'Discutez avec Dr. Toxi en illimité';
      case 'history':
        return 'Sauvegardez tout votre historique';
      case 'favorite':
        return 'Sauvegardez vos produits favoris';
      case 'alerts':
        return 'Alertes en temps réel';
      default:
        return 'Passez à ToxiScan Pro';
    }
  };

  const getContextSubtitle = () => {
    switch (source) {
      case 'drtoxi':
        return 'Vous avez utilisé vos 3 messages gratuits du jour';
      case 'history':
        return 'Sans abonnement, seuls les 3 derniers produits sont visibles';
      case 'favorite':
        return 'Les favoris sont une fonctionnalité exclusive ToxiScan Pro';
      case 'alerts':
        return 'Soyez alerté des nouveaux produits interdits, toxiques ou cancérigènes';
      default:
        return 'Débloquez toutes les fonctionnalités premium';
    }
  };

  const isLoading = purchaseInProgress || restoreInProgress;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={handleDismiss} testID="paywall-close" disabled={isLoading}>
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
          <BenefitRow icon={<Check color={Colors.white} size={14} strokeWidth={3} />} text="Dr. Toxi illimité" />
          <BenefitRow icon={<Check color={Colors.white} size={14} strokeWidth={3} />} text="Historique illimité" />
          <BenefitRow icon={<Check color={Colors.white} size={14} strokeWidth={3} />} text="Favoris produits" />
          <BenefitRow icon={<Check color={Colors.white} size={14} strokeWidth={3} />} text="Notifications rappel produits" />
        </View>

        <View style={styles.plansContainer}>
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
            onPress={() => handlePlanSelect('annual')}
            activeOpacity={0.8}
            testID="plan-annual"
            disabled={isLoading}
          >
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>Économisez 17%</Text>
            </View>
            <View style={styles.planRadio}>
              <View style={[styles.radioOuter, selectedPlan === 'annual' && styles.radioOuterSelected]}>
                {selectedPlan === 'annual' && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planTitle}>Annuel — {annualPrice}/an</Text>
              <Text style={styles.planSubtext}>soit {annualMonthly}/mois</Text>
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
              <Text style={styles.planTitle}>Mensuel — {monthlyPrice}/mois</Text>
            </View>
          </TouchableOpacity>
        </View>

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
              <Text style={styles.ctaButtonText}>Passer à ToxiScan Pro</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.donationRow}>
          <Heart color={Colors.primary} size={16} fill={Colors.primary} />
          <Text style={styles.donationText}>
            Pour chaque abonnement annuel, 5$ sont reversés à des associations qui aident les patients atteints de cancer à payer leurs traitements et médicaments.
          </Text>
        </View>

        <Text style={styles.legalText}>
          L'abonnement se renouvelle automatiquement.{'\n'}
          Annulez à tout moment dans les réglages de votre appareil.
        </Text>

        <TouchableOpacity onPress={handleRestore} style={styles.restoreButton} testID="paywall-restore" disabled={isLoading}>
          {restoreInProgress ? (
            <ActivityIndicator color={Colors.textSecondary} size="small" />
          ) : (
            <Text style={styles.restoreText}>Restaurer un achat</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function BenefitRow({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.checkCircle}>
        {icon ?? <Check color={Colors.white} size={14} strokeWidth={3} />}
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
    position: 'absolute' as const,
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    backgroundColor: Colors.white,
  },
  appIcon: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  benefitsContainer: {
    width: '100%',
    gap: 14,
    marginBottom: 28,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
  },
  plansContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 14,
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(52, 199, 89, 0.04)',
  },
  planBadge: {
    position: 'absolute' as const,
    top: -10,
    right: 14,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  planRadio: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  planSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ctaButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  donationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.06)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.12)',
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
    textDecorationLine: 'underline' as const,
  },
  bottomSpacer: {
    height: 20,
  },
});
