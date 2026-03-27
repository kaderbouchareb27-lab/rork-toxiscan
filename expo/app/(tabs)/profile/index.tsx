import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Shield, FileText, HelpCircle, Eye, Mail, Star, Crown, UtensilsCrossed, Shirt, Package, Droplets, SprayCan, Apple, Info, Brain } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useQuiz } from '@/providers/QuizProvider';

export default function ProfileScreen() {
  const { stats } = useScanHistory();
  const { isPro } = useSubscription();
  const { totalCorrect, totalAnswered } = useQuiz();

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
          style={[styles.card, isPro && styles.proCard]}
          onPress={isPro ? undefined : () => handleMenuPress('/paywall?source=profile')}
          activeOpacity={isPro ? 1 : 0.8}
          testID="subscription-card"
        >
          <View style={styles.subscriptionRow}>
            {isPro ? (
              <Crown color={Colors.primary} size={20} />
            ) : (
              <Shield color={Colors.textSecondary} size={20} />
            )}
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionLabel}>
                {isPro ? 'ToxiScan Pro' : 'ToxiScan Gratuit'}
              </Text>
              <Text style={[styles.subscriptionStatus, !isPro && styles.subscriptionStatusFree]}>
                {isPro ? 'Dr. Toxi illimité, historique illimité, favoris, notifications' : 'Scans photo illimités — 3 messages Dr. Toxi/jour — 3 produits en historique'}
              </Text>
            </View>
            {!isPro && <ChevronRight color={Colors.textTertiary} size={16} />}
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

        {totalAnswered > 0 && (
          <View style={styles.card}>
            <View style={styles.quizScoreHeader}>
              <Brain color={Colors.primary} size={18} />
              <Text style={styles.cardTitle}>Quiz Santé</Text>
            </View>
            <View style={styles.quizScoreRow}>
              <View style={styles.quizScoreStat}>
                <Text style={styles.quizScoreNumber}>{totalCorrect}</Text>
                <Text style={styles.quizScoreLabel}>Bonnes réponses</Text>
              </View>
              <View style={styles.quizScoreDivider} />
              <View style={styles.quizScoreStat}>
                <Text style={styles.quizScoreNumber}>{totalAnswered}</Text>
                <Text style={styles.quizScoreLabel}>Questions</Text>
              </View>
              <View style={styles.quizScoreDivider} />
              <View style={styles.quizScoreStat}>
                <Text style={[styles.quizScoreNumber, { color: Colors.primary }]}>
                  {totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0}%
                </Text>
                <Text style={styles.quizScoreLabel}>Réussite</Text>
              </View>
            </View>
          </View>
        )}

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
  quizScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  quizScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  quizScoreStat: {
    alignItems: 'center',
    flex: 1,
  },
  quizScoreNumber: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  quizScoreLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  quizScoreDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 16,
  },
});
