import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, FileText, HelpCircle, Eye, Mail, Star, UtensilsCrossed, Shirt, Package, Droplets, SprayCan, Apple, Info, Brain, Trophy, Share2, Check, Crown, ScrollText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';
import Colors from '@/constants/colors';
import { router } from 'expo-router';

const DR_TOXI_AVATAR = 'https://r2-pub.rork.com/generated-images/97a5e938-5054-43f6-b4a0-83e39183f2a6.png';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useQuiz } from '@/providers/QuizProvider';
import { useBadges } from '@/providers/BadgesProvider';
import { useHealthProfile } from '@/providers/HealthProfileProvider';
import { t, tf } from '@/utils/i18n';

export default function ProfileScreen() {
  const { stats } = useScanHistory();
  const { isPro } = useSubscription();
  const { totalCorrect, totalAnswered } = useQuiz();
  const { unlockedCount, totalCount, shareCount } = useBadges();
  const { activeCount: healthActiveCount } = useHealthProfile();

  const maxStat = Math.max(stats.danger, stats.probable, stats.possible, stats.safe, 1);

  const handleContact = useCallback(async () => {
    console.log('[Profile] Contact tapped');
    const url = 'mailto:contact@toxiscan.com';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          t('contact_email_title'),
          t('contact_email_body'),
          [{ text: t('ok') }]
        );
      }
    } catch {
      Alert.alert(
        t('contact_email_title'),
        t('contact_email_body'),
        [{ text: t('ok') }]
      );
    }
  }, []);

  const handleMenuPress = useCallback((route: string) => {
    console.log('[Profile] Navigating to:', route);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route as never);
  }, []);

  const handleRateApp = useCallback(async () => {
    console.log('[Profile] Rate app tapped');
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      if (Platform.OS !== 'web') {
        const isAvailable = await StoreReview.isAvailableAsync();
        console.log('[Profile] StoreReview isAvailable:', isAvailable);
        if (isAvailable) {
          await StoreReview.requestReview();
          return;
        }
      }
      Alert.alert(
        t('rate_thanks'),
        t('rate_unavailable'),
        [{ text: t('ok') }]
      );
    } catch (error) {
      console.log('[Profile] StoreReview error:', error);
      Alert.alert(
        t('rate_thanks'),
        t('rate_unavailable'),
        [{ text: t('ok') }]
      );
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('profile_title')}</Text>

        <TouchableOpacity
          style={[styles.card, isPro ? styles.proCard : styles.freeCard]}
          onPress={() => !isPro && handleMenuPress('/paywall?source=profile')}
          activeOpacity={isPro ? 1 : 0.8}
          testID="subscription-card"
        >
          <View style={styles.subscriptionRow}>
            {isPro ? (
              <View style={styles.proCheckCircle}>
                <Check color={Colors.white} size={18} strokeWidth={3} />
              </View>
            ) : (
              <Image
                source={{ uri: DR_TOXI_AVATAR }}
                style={styles.subscriptionAvatar}
              />
            )}
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionLabel}>
                {isPro ? t('drtoxi_pro') : t('drtoxi_free')}
              </Text>
              <Text style={[styles.subscriptionStatus, !isPro && styles.subscriptionStatusFree]}>
                {isPro ? t('pro_active_desc') : t('free_desc')}
              </Text>
            </View>
            {isPro ? (
              <Text style={styles.proActiveBadge}>{t('active')}</Text>
            ) : (
              <View style={styles.upgradeButton}>
                <Crown color={Colors.white} size={14} />
                <Text style={styles.upgradeButtonText}>Pro</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.badgesCard}
          onPress={() => handleMenuPress('/badges')}
          activeOpacity={0.8}
          testID="badges-card"
        >
          <View style={styles.badgesCardLeft}>
            <View style={styles.badgesTrophyContainer}>
              <Trophy color="#FFD700" size={22} strokeWidth={1.8} />
            </View>
            <View style={styles.badgesCardInfo}>
              <Text style={styles.badgesCardTitle}>{t('my_badges')}</Text>
              <Text style={styles.badgesCardCount}>{unlockedCount}/{totalCount} {t('unlocked')}</Text>
            </View>
          </View>
          <View style={styles.badgesCardRight}>
            <View style={styles.shareCountChip}>
              <Share2 color={Colors.primary} size={12} />
              <Text style={styles.shareCountChipText}>{shareCount}</Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={16} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.healthProfileCard}
          onPress={() => handleMenuPress('/health-profile')}
          activeOpacity={0.8}
          testID="health-profile-card"
        >
          <View style={styles.healthProfileLeft}>
            <Image source={{ uri: DR_TOXI_AVATAR }} style={styles.healthProfileAvatar} />
            <View style={styles.healthProfileInfo}>
              <Text style={styles.healthProfileTitle}>{t('health_profile_card_title')}</Text>
              <Text style={styles.healthProfileSubtitle}>
                {healthActiveCount > 0 ? tf('health_profile_active', healthActiveCount) : t('health_profile_card_empty')}
              </Text>
            </View>
          </View>
          <ChevronRight color={Colors.primary} size={18} />
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('statistics')}</Text>
          <Text style={styles.statsTotal}>{tf('products_analyzed', stats.total)}</Text>

          {stats.total > 0 && (
            <View style={styles.statsBreakdown}>
              <StatBar label={t('stat_danger')} count={stats.danger} max={maxStat} color="#D0260F" />
              <StatBar label={t('stat_probable')} count={stats.probable} max={maxStat} color="#E8730A" />
              <StatBar label={t('stat_possible')} count={stats.possible} max={maxStat} color="#EAB308" />
              <StatBar label={t('stat_safe')} count={stats.safe} max={maxStat} color="#2E9E34" />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.quizCard}
          onPress={() => {
            if (Platform.OS !== 'web') {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            router.push('/quiz');
          }}
          activeOpacity={0.8}
          testID="quiz-launch"
        >
          <View style={styles.quizCardLeft}>
            <View style={styles.quizIconContainer}>
              <Brain color={Colors.primary} size={20} strokeWidth={2} />
            </View>
            <View style={styles.quizCardContent}>
              <Text style={styles.quizCardTitle}>{t('health_quiz')}</Text>
              <Text style={styles.quizCardSubtitle}>
                {totalAnswered > 0
                  ? tf('quiz_score', totalCorrect, totalAnswered, Math.round((totalCorrect / totalAnswered) * 100))
                  : t('quiz_invite')}
              </Text>
            </View>
          </View>
          <ChevronRight color={Colors.primary} size={18} />
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('detects_risks_in')}</Text>
          <View style={styles.categoriesGrid}>
            <CategoryItem icon={<Apple color={Colors.primary} size={16} />} label={t('cat_food_drinks')} />
            <CategoryItem icon={<Droplets color={Colors.primary} size={16} />} label={t('cat_cosmetics_care')} />
            <CategoryItem icon={<SprayCan color={Colors.primary} size={16} />} label={t('cat_household_products')} />
            <CategoryItem icon={<UtensilsCrossed color={Colors.primary} size={16} />} label={t('cat_kitchen_utensils')} />
            <CategoryItem icon={<Shirt color={Colors.primary} size={16} />} label={t('cat_clothing_textiles')} />
            <CategoryItem icon={<Package color={Colors.primary} size={16} />} label={t('cat_containers')} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('info_title')}</Text>

          <MenuItem
            icon={<FileText color={Colors.textSecondary} size={18} />}
            label={t('privacy_policy')}
            onPress={() => handleMenuPress('/privacy')}
            testID="privacy-link"
          />
          <MenuItem
            icon={<ScrollText color={Colors.textSecondary} size={18} />}
            label={t('terms_of_use')}
            onPress={() => Linking.openURL('https://spiny-waltz-902.notion.site/Conditions-d-utilisation-33586d85fa4b801fa0a6d69dfbdf9d1e')}
            testID="terms-link"
          />
          <MenuItem
            icon={<HelpCircle color={Colors.textSecondary} size={18} />}
            label={t('faq_label')}
            onPress={() => handleMenuPress('/faq')}
            testID="faq-link"
          />
          <MenuItem
            icon={<Eye color={Colors.textSecondary} size={18} />}
            label={t('ai_transparency')}
            onPress={() => handleMenuPress('/transparency')}
            testID="transparency-link"
          />
          <MenuItem
            icon={<Mail color={Colors.textSecondary} size={18} />}
            label={t('contact_us')}
            onPress={handleContact}
            testID="contact-link"
          />
          <MenuItem
            icon={<Info color={Colors.textSecondary} size={18} />}
            label={t('about_label')}
            onPress={() => handleMenuPress('/about')}
            testID="about-link"
          />
          <MenuItem
            icon={<Star color={Colors.textSecondary} size={18} />}
            label={t('rate_app')}
            onPress={handleRateApp}
            testID="rate-link"
          />
        </View>

        <Text style={styles.versionText}>ToxiScan v2.3</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, onPress, testID }: { icon: React.ReactNode; label: string; onPress: () => void; testID?: string }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7} testID={testID}>
      {icon}
      <Text style={styles.menuLabel}>{label}</Text>
      <ChevronRight color={Colors.textTertiary} size={16} />
    </TouchableOpacity>
  );
}

function CategoryItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.categoryItem}>
      {icon}
      <Text style={styles.categoryLabel}>{label}</Text>
    </View>
  );
}

function StatBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const widthPercent = max > 0 ? (count / max) * 100 : 0;
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{label}</Text>
      <View style={styles.statBarBackground}>
        <View style={[styles.statBarFill, { width: `${Math.max(widthPercent, 2)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.statCount}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.text,
    paddingTop: 16,
    paddingBottom: 20,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  proCard: {
    borderWidth: 1.5,
    borderColor: 'rgba(46, 158, 52, 0.25)',
    backgroundColor: '#F7FDF9',
  },
  freeCard: {
    borderWidth: 1,
    borderColor: 'rgba(46, 158, 52, 0.12)',
  },
  subscriptionAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  subscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionLabel: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  subscriptionStatus: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 3,
    fontWeight: '500' as const,
    lineHeight: 17,
  },
  subscriptionStatusFree: {
    color: Colors.textSecondary,
  },
  proCheckCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#2E9E34',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proActiveBadge: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
    backgroundColor: 'rgba(46, 158, 52, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2E9E34',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  statsTotal: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  statsBreakdown: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statLabel: {
    width: 86,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  statBarBackground: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surfaceSecondary,
    overflow: 'hidden',
  },
  statBarFill: {
    height: 10,
    borderRadius: 5,
  },
  statCount: {
    width: 28,
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'right' as const,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  categoriesGrid: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 2,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  healthProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(46, 158, 52, 0.12)',
  },
  healthProfileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  healthProfileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  healthProfileInfo: {
    flex: 1,
  },
  healthProfileTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  healthProfileSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(46, 158, 52, 0.12)',
  },
  quizCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  quizIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(46, 158, 52, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizCardContent: {
    flex: 1,
  },
  quizCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  quizCardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  badgesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  badgesCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  badgesTrophyContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgesCardInfo: {
    flex: 1,
  },
  badgesCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  badgesCardCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  badgesCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareCountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(46, 158, 52, 0.08)',
  },
  shareCountChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 20,
    marginBottom: 8,
  },
});
