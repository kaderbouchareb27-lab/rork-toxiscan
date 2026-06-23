import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { UtensilsCrossed, ChevronRight, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { t, tf } from '@/utils/i18n';
import { useWeeklyMealReport } from '@/providers/MealHistoryProvider';
import { MEAL_TIER_COLORS, mealCategoryLabel, mealTierLabel } from '@/constants/mealAvatars';
import type { MealTier } from '@/utils/mealAnalysis';
import ToxicityScoreRing from '@/components/ToxicityScoreRing';

const TIERS: MealTier[] = ['green', 'yellow', 'orange', 'red'];

function TrendChip({ direction, pct }: { direction: 'up' | 'down' | 'flat' | 'first'; pct: number }) {
  if (direction === 'first') {
    return (
      <View style={[styles.trendChip, { backgroundColor: 'rgba(46,158,52,0.1)' }]}>
        <Sparkles color={Colors.primary} size={13} />
        <Text style={[styles.trendText, { color: Colors.primary }]}>{t('weekly_trend_first')}</Text>
      </View>
    );
  }
  if (direction === 'flat') {
    return (
      <View style={[styles.trendChip, { backgroundColor: 'rgba(107,112,105,0.12)' }]}>
        <Minus color="#6B7069" size={13} />
        <Text style={[styles.trendText, { color: '#6B7069' }]}>{t('weekly_trend_flat')}</Text>
      </View>
    );
  }
  const up = direction === 'up';
  const color = up ? '#2E9E34' : '#D0260F';
  return (
    <View style={[styles.trendChip, { backgroundColor: up ? 'rgba(46,158,52,0.1)' : 'rgba(208,38,15,0.1)' }]}>
      {up ? <TrendingUp color={color} size={13} /> : <TrendingDown color={color} size={13} />}
      <Text style={[styles.trendText, { color }]}>{up ? tf('weekly_trend_up', pct) : tf('weekly_trend_down', pct)}</Text>
    </View>
  );
}

/**
 * Weekly meal dashboard — lives in Profile, OPEN to free users with their REAL data
 * (spec §8 / §13). It builds live as the user scans, which is the engine of the
 * desire to upgrade. The premium projection (full report) lives behind "See full report".
 */
export default function MealDashboard() {
  const report = useWeeklyMealReport(0);

  const openReport = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/weekly-report');
  }, []);

  if (report.count === 0) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <UtensilsCrossed color={Colors.primary} size={22} strokeWidth={2} />
        </View>
        <Text style={styles.emptyTitle}>{t('meal_dashboard_title')}</Text>
        <Text style={styles.emptyHint}>{t('weekly_no_meals_hint')}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={openReport} activeOpacity={0.9} testID="meal-dashboard">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <UtensilsCrossed color={Colors.primary} size={18} strokeWidth={2} />
          <Text style={styles.title}>{t('meal_dashboard_title')}</Text>
        </View>
        <ChevronRight color={Colors.textTertiary} size={18} />
      </View>

      <View style={styles.bodyRow}>
        <ToxicityScoreRing score={report.avgScore} tier={report.tier} size={104} stroke={11} caption={mealTierLabel(report.tier)} />
        <View style={styles.statsCol}>
          <Text style={styles.metaLabel}>{t('weekly_score_label')}</Text>
          <Text style={styles.mealsCount}>{tf('weekly_meals_scanned', report.count)}</Text>
          <TrendChip direction={report.trendDirection} pct={report.trendPct} />
        </View>
      </View>

      <View style={styles.distBarTrack}>
        {TIERS.map((tr) =>
          report.distribution[tr] > 0 ? (
            <View key={tr} style={{ flex: report.distribution[tr], backgroundColor: MEAL_TIER_COLORS[tr] }} />
          ) : null,
        )}
      </View>

      {report.problemCategory ? (
        <View style={styles.problemRow}>
          <Text style={styles.problemLabel}>{t('weekly_problem_ingredient')}</Text>
          <Text style={styles.problemValue}>
            {tf('weekly_problem_detected', mealCategoryLabel(report.problemCategory), report.problemCount)}
          </Text>
        </View>
      ) : null}

      <View style={styles.viewFullRow}>
        <Text style={styles.viewFullText}>{t('weekly_view_full')}</Text>
        <ChevronRight color={Colors.primary} size={16} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(46,158,52,0.14)',
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46,158,52,0.12)',
  },
  emptyIcon: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(46,158,52,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.2 },
  emptyHint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19, marginTop: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.2 },
  bodyRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  statsCol: { flex: 1, gap: 6 },
  metaLabel: { fontSize: 11, fontWeight: '700' as const, color: Colors.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' as const },
  mealsCount: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  trendChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  trendText: { fontSize: 12, fontWeight: '700' as const, letterSpacing: -0.1 },
  distBarTrack: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 16, backgroundColor: Colors.surfaceSecondary },
  problemRow: { marginTop: 14 },
  problemLabel: { fontSize: 11, fontWeight: '700' as const, color: Colors.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' as const },
  problemValue: { fontSize: 14.5, fontWeight: '700' as const, color: Colors.text, marginTop: 3 },
  viewFullRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderLight },
  viewFullText: { fontSize: 14, fontWeight: '700' as const, color: Colors.primary },
});
