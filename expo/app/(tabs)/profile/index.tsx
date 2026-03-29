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
import { ChevronRight, FileText, HelpCircle, Eye, Mail, Star, UtensilsCrossed, Shirt, Package, Droplets, SprayCan, Apple, Info, Brain, Trophy, Share2, Gift } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
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
    const url = 'mailto:kader@toxiscan.com';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Nous contacter',
          'Envoyez-nous un courriel à :\nkader@toxiscan.com',
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert(
        'Nous contacter',
        'Envoyez-nous un courriel à :\nkader@toxiscan.com',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const handleMenuPress = useCallback((route: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route as never);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Profil</Text>

        <TouchableOpacity
          style={[styles.card, isPro ? styles.proCard : styles.freeCard]}
          onPress={() => handleMenuPress('/paywall?source=profile')}
          activeOpacity={0.8}
          testID="subscription-card"
        >
          <View style={styles.subscriptionRow}>
            <Image
              source={{ uri: DR_TOXI_AVATAR }}
              style={styles.subscriptionAvatar}
            />
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionLabel}>
                {isPro ? 'ToxiScan Pro' : 'ToxiScan Pro'}
              </Text>
              <Text style={[styles.subscriptionStatus, !isPro && styles.subscriptionStatusFree]}>
                {isPro ? 'Dr. Toxi illimité, historique illimité, favoris, notifications' : 'Dr. Toxi illimité, historique illimité, favoris, notifications'}
              </Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={16} />
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
          <Text style={styles.cardTitle}>ToxiScan détecte les risques dans :</Text>
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
            onPress={() => { console.log('[Profile] Rate app tapped'); }}
            testID="rate-link"
          />
        </View>

        <View style={styles.partnerCard}>
          <View style={styles.partnerIconContainer}>
            <Gift color={Colors.textTertiary} size={20} />
          </View>
          <Text style={styles.partnerTitle}>Offres partenaires</Text>
          <Text style={styles.partnerText}>Bientôt disponible — des offres exclusives de marques bio pour nos utilisateurs les plus actifs</Text>
        </View>

        <Text style={styles.versionText}>ToxiScan v2.0.0</Text>
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
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    paddingTop: 16,
    paddingBottom: 20,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  proCard: {
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    backgroundColor: 'rgba(52, 199, 89, 0.04)',
  },
  freeCard: {
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.15)',
  },
  subscriptionAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  subscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  subscriptionStatus: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  subscriptionStatusFree: {
    color: Colors.textSecondary,
  },
  statsTotal: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  statsBreakdown: {
    gap: 10,
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
  },
  statBarBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceSecondary,
    overflow: 'hidden',
  },
  statBarFill: {
    height: 8,
    borderRadius: 4,
  },
  statCount: {
    width: 24,
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'right',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  categoriesGrid: {
    gap: 10,
  },
  categoryItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  categoryLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(52, 199, 89, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.12)',
  },
  quizCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  quizIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizCardContent: {
    flex: 1,
  },
  quizCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  quizCardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badgesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  badgesCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  badgesTrophyContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    marginTop: 2,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
  },
  shareCountChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  partnerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  partnerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  partnerTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  partnerText: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 16,
  },
});
// Profile screen
