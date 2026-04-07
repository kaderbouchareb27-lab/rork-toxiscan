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

export default function ProfileScreen() {
  const { stats } = useScanHistory();
  const { isPro } = useSubscription();
  const { totalCorrect, totalAnswered } = useQuiz();
  const { unlockedCount, totalCount, shareCount } = useBadges();

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
          'Nous contacter',
          'Envoyez-nous un courriel à :\ncontact@toxiscan.com',
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert(
        'Nous contacter',
        'Envoyez-nous un courriel à :\ncontact@toxiscan.com',
        [{ text: 'OK' }]
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
        'Merci !',
        'La notation sera disponible une fois l\'app publiée sur l\'App Store. Merci pour votre soutien !',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.log('[Profile] StoreReview error:', error);
      Alert.alert(
        'Merci !',
        'La notation sera disponible une fois l\'app publiée sur l\'App Store. Merci pour votre soutien !',
        [{ text: 'OK' }]
      );
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Profil</Text>

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
                {isPro ? 'Dr.Toxi Pro' : 'Dr.Toxi Gratuit'}
              </Text>
              <Text style={[styles.subscriptionStatus, !isPro && styles.subscriptionStatusFree]}>
                {isPro ? 'Actif — Dr. Toxi illimité, historique complet' : 'Dr. Toxi illimité, historique illimité, favoris'}
              </Text>
            </View>
            {isPro ? (
              <Text style={styles.proActiveBadge}>Actif</Text>
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
              <Text style={styles.badgesCardTitle}>Mes badges</Text>
              <Text style={styles.badgesCardCount}>{unlockedCount}/{totalCount} débloqués</Text>
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Statistiques</Text>
          <Text style={styles.statsTotal}>{stats.total} produit{stats.total !== 1 ? 's' : ''} analysé{stats.total !== 1 ? 's' : ''}</Text>

          {stats.total > 0 && (
            <View style={styles.statsBreakdown}>
              <StatBar label="Danger" count={stats.danger} max={maxStat} color={Colors.danger} />
              <StatBar label="Probable" count={stats.probable} max={maxStat} color={Colors.warning} />
              <StatBar label="Possible" count={stats.possible} max={maxStat} color={Colors.caution} />
              <StatBar label="OK" count={stats.safe} max={maxStat} color={Colors.safe} />
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
              <Text style={styles.quizCardTitle}>Quiz Santé</Text>
              <Text style={styles.quizCardSubtitle}>
                {totalAnswered > 0
                  ? `${totalCorrect}/${totalAnswered} bonnes réponses (${Math.round((totalCorrect / totalAnswered) * 100)}%)`
                  : '10 questions pour tester vos connaissances'}
              </Text>
            </View>
          </View>
          <ChevronRight color={Colors.primary} size={18} />
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dr.Toxi détecte les risques dans :</Text>
          <View style={styles.categoriesGrid}>
            <CategoryItem icon={<Apple color={Colors.primary} size={16} />} label="Aliments et boissons" />
            <CategoryItem icon={<Droplets color={Colors.primary} size={16} />} label="Cosmétiques et soins" />
            <CategoryItem icon={<SprayCan color={Colors.primary} size={16} />} label="Produits ménagers" />
            <CategoryItem icon={<UtensilsCrossed color={Colors.primary} size={16} />} label="Ustensiles de cuisine" />
            <CategoryItem icon={<Shirt color={Colors.primary} size={16} />} label="Vêtements et textiles" />
            <CategoryItem icon={<Package color={Colors.primary} size={16} />} label="Contenants et emballages" />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations</Text>

          <MenuItem
            icon={<FileText color={Colors.textSecondary} size={18} />}
            label="Politique de confidentialité"
            onPress={() => handleMenuPress('/privacy')}
            testID="privacy-link"
          />
          <MenuItem
            icon={<ScrollText color={Colors.textSecondary} size={18} />}
            label="Conditions d'utilisation"
            onPress={() => Linking.openURL('https://spiny-waltz-902.notion.site/Conditions-d-utilisation-33586d85fa4b801fa0a6d69dfbdf9d1e')}
            testID="terms-link"
          />
          <MenuItem
            icon={<HelpCircle color={Colors.textSecondary} size={18} />}
            label="FAQ"
            onPress={() => handleMenuPress('/faq')}
            testID="faq-link"
          />
          <MenuItem
            icon={<Eye color={Colors.textSecondary} size={18} />}
            label="Transparence IA"
            onPress={() => handleMenuPress('/transparency')}
            testID="transparency-link"
          />
          <MenuItem
            icon={<Mail color={Colors.textSecondary} size={18} />}
            label="Nous contacter"
            onPress={handleContact}
            testID="contact-link"
          />
          <MenuItem
            icon={<Info color={Colors.textSecondary} size={18} />}
            label="À propos"
            onPress={() => handleMenuPress('/about')}
            testID="about-link"
          />
          <MenuItem
            icon={<Star color={Colors.textSecondary} size={18} />}
            label="Noter l'app"
            onPress={handleRateApp}
            testID="rate-link"
          />
        </View>

        <Text style={styles.versionText}>ToxiScan v{Constants.expoConfig?.version ?? '8.0.0'}</Text>
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
      <Text style={styles.statLabel}>{label}</Text>
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
    shadowColor: '#237A28',
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
    width: 65,
    fontSize: 13,
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
