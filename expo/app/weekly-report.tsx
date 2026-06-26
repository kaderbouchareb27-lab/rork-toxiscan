import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { ChevronLeft, Lock, TrendingUp, Sparkles, Crown, Trophy, Flame } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { t, tf, pick } from '@/utils/i18n';
import { useWeeklyMealReport, type WeeklyReport } from '@/providers/MealHistoryProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import {
  MEAL_TIER_AVATARS,
  MEAL_TIER_COLORS,
  mealCategoryLabel,
  mealTierLabel,
} from '@/constants/mealAvatars';
import type { MealCategory, MealTier } from '@/utils/mealAnalysis';
import ToxicityScoreRing from '@/components/ToxicityScoreRing';

const TIERS: MealTier[] = ['green', 'yellow', 'orange', 'red'];

function buildDrIntro(report: WeeklyReport): string {
  const { count, avgScore } = report;
  const good = avgScore >= 6;
  return pick({
    en: `This week I looked at ${count} of your meals — average health score ${avgScore}/10. ${good ? 'Your plate is looking clean — keep this rhythm going.' : "A few heavy meals slipped in, but nothing we can't fix together."}`,
    fr: `Cette semaine j'ai regardé ${count} de tes repas — score de santé moyen ${avgScore}/10. ${good ? 'Ton assiette est propre, garde ce rythme.' : "Quelques repas lourds se sont glissés, mais rien qu'on ne puisse corriger ensemble."}`,
    ko: `이번 주에 식사 ${count}개를 살펴봤어요 — 평균 건강 점수 ${avgScore}/10이에요. ${good ? '식단이 깨끗해요, 이 리듬을 유지해 보세요.' : '조금 무거운 식사가 몇 번 있었지만, 함께 바로잡을 수 있어요.'}`,
  });
}

function categoryReco(cat: MealCategory): string {
  switch (cat) {
    case 'added_sugar':
      return pick({ en: 'Swap one sugary drink or dessert for fruit or water — your biggest lever this week.', fr: "Remplace une boisson sucrée ou un dessert par un fruit ou de l'eau — ton plus gros levier cette semaine.", ko: '단 음료나 디저트 하나를 과일이나 물로 바꿔보세요 — 이번 주 가장 큰 변화 포인트예요.' });
    case 'refined_oil':
      return pick({ en: 'Cook with extra-virgin olive oil instead of refined vegetable oils.', fr: "Cuisine à l'huile d'olive vierge plutôt qu'avec des huiles végétales raffinées.", ko: '정제 식용유 대신 엑스트라 버진 올리브유로 요리해 보세요.' });
    case 'processed':
      return pick({ en: 'Cook one more meal from scratch this week — even a simple one counts.', fr: "Cuisine un repas maison de plus cette semaine — même simple, ça compte.", ko: '이번 주에 집밥을 한 끼 더 해보세요 — 간단해도 충분해요.' });
    case 'excess_salt':
      return pick({ en: 'Go easy on sauces and seasonings high in sodium; taste before you salt.', fr: 'Allège les sauces et assaisonnements salés ; goûte avant de saler.', ko: '나트륨이 높은 소스와 양념을 줄이고, 소금을 넣기 전에 맛보세요.' });
    case 'additive':
      return pick({ en: 'Pick products with shorter ingredient lists and fewer colorings/additives.', fr: "Choisis des produits aux listes d'ingrédients plus courtes, avec moins de colorants/additifs.", ko: '성분표가 짧고 색소·첨가물이 적은 제품을 고르세요.' });
    case 'carcinogen_g1':
    case 'carcinogen_2a':
    case 'carcinogen_2b':
      return pick({ en: 'Cut back on processed/cured meats — they carry the heaviest risk on your plate.', fr: 'Réduis les charcuteries/viandes transformées — c\'est le risque le plus lourd de ton assiette.', ko: '가공육·염장육을 줄이세요 — 식단에서 가장 위험이 큰 부분이에요.' });
    default:
      return pick({ en: 'Add one more vegetable to your next plate.', fr: 'Ajoute un légume de plus à ta prochaine assiette.', ko: '다음 식사에 채소를 하나 더 추가해 보세요.' });
  }
}

function buildRecommendations(report: WeeklyReport): string[] {
  const recs: string[] = [];
  if (report.problemCategory) recs.push(categoryReco(report.problemCategory));
  recs.push(
    report.avgScore >= 6
      ? pick({ en: 'Keep prioritizing whole, recognizable foods — it is working.', fr: "Continue de privilégier des aliments bruts et reconnaissables — ça marche.", ko: '가공되지 않은, 알아볼 수 있는 음식을 계속 우선하세요 — 효과가 있어요.' })
      : pick({ en: 'Aim for one clearly green meal a day next week.', fr: 'Vise un repas clairement vert par jour la semaine prochaine.', ko: '다음 주엔 하루에 확실히 초록인 식사를 한 끼 목표로 해보세요.' }),
  );
  return recs;
}

export default function WeeklyReportScreen() {
  const report = useWeeklyMealReport(0);
  const w1 = useWeeklyMealReport(-1);
  const w2 = useWeeklyMealReport(-2);
  const w3 = useWeeklyMealReport(-3);
  const { isPro } = useSubscription();

  const goPaywall = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/paywall?source=report');
  }, []);

  const tierColor = MEAL_TIER_COLORS[report.tier];
  const trendWeeks = [w3, w2, w1, report];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('weekly_report_title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {report.count === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('weekly_no_meals')}</Text>
            <Text style={styles.emptyHint}>{t('weekly_no_meals_hint')}</Text>
          </View>
        ) : (
          <>
            {/* Dr. Toxi intro (everyone) */}
            <View style={styles.introCard}>
              <Image source={{ uri: MEAL_TIER_AVATARS[report.tier] }} style={styles.introAvatar} contentFit="contain" />
              <View style={styles.introTextCol}>
                <Text style={styles.introLabel}>{t('weekly_dr_intro_label')}</Text>
                <Text style={styles.introText}>{buildDrIntro(report)}</Text>
              </View>
            </View>

            {/* Big weekly score (everyone, real) */}
            <View style={styles.scoreWrap}>
              <ToxicityScoreRing score={report.avgScore} tier={report.tier} size={184} label={t('weekly_score_label')} caption={mealTierLabel(report.tier)} />
              <Text style={styles.mealsScanned}>{tf('weekly_meals_scanned', report.count)}</Text>
            </View>

            {/* Distribution (everyone, real) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('weekly_distribution')}</Text>
              <View style={styles.distBarTrack}>
                {TIERS.map((tr) =>
                  report.distribution[tr] > 0 ? (
                    <View key={tr} style={{ flex: report.distribution[tr], backgroundColor: MEAL_TIER_COLORS[tr] }} />
                  ) : null,
                )}
              </View>
              <View style={styles.legendRow}>
                {TIERS.map((tr) => (
                  <View key={tr} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: MEAL_TIER_COLORS[tr] }]} />
                    <Text style={styles.legendText}>{mealTierLabel(tr)}</Text>
                    <Text style={styles.legendCount}>{report.distribution[tr]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Problem ingredient (everyone, real) */}
            {report.problemCategory ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('weekly_problem_ingredient')}</Text>
                <Text style={styles.problemValue}>
                  {tf('weekly_problem_detected', mealCategoryLabel(report.problemCategory), report.problemCount)}
                </Text>
              </View>
            ) : null}

            {/* Best / worst meal (everyone, real) */}
            {report.bestMeal || report.worstMeal ? (
              <View style={styles.bestWorstRow}>
                {report.bestMeal ? (
                  <TouchableOpacity style={[styles.bwCard, { borderColor: 'rgba(46,158,52,0.25)' }]} onPress={() => router.push(`/meal/${report.bestMeal!.id}`)} activeOpacity={0.85}>
                    <Trophy color="#2E9E34" size={18} />
                    <Text style={styles.bwLabel}>{t('weekly_best_meal')}</Text>
                    <Text style={styles.bwDish} numberOfLines={1}>{report.bestMeal.dishName}</Text>
                    <Text style={[styles.bwScore, { color: MEAL_TIER_COLORS[report.bestMeal.tier] }]}>{report.bestMeal.score}/10</Text>
                  </TouchableOpacity>
                ) : null}
                {report.worstMeal && report.worstMeal.id !== report.bestMeal?.id ? (
                  <TouchableOpacity style={[styles.bwCard, { borderColor: 'rgba(208,38,15,0.22)' }]} onPress={() => router.push(`/meal/${report.worstMeal!.id}`)} activeOpacity={0.85}>
                    <Flame color="#D0260F" size={18} />
                    <Text style={styles.bwLabel}>{t('weekly_worst_meal')}</Text>
                    <Text style={styles.bwDish} numberOfLines={1}>{report.worstMeal.dishName}</Text>
                    <Text style={[styles.bwScore, { color: MEAL_TIER_COLORS[report.worstMeal.tier] }]}>{report.worstMeal.score}/10</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {/* End message (everyone) */}
            <View style={[styles.endCard, { backgroundColor: `${tierColor}14` }]}>
              <Text style={[styles.endText, { color: report.avgScore >= 6 ? '#0B7A2D' : '#A94F05' }]}>
                {report.avgScore >= 6 ? t('weekly_end_good') : t('weekly_end_improve')}
              </Text>
            </View>

            {/* Premium projection — trend + recommendations */}
            {isPro ? (
              <>
                <Text style={styles.sectionTitle}>{t('weekly_locked_trend')}</Text>
                <View style={styles.card}>
                  <View style={styles.trendBars}>
                    {trendWeeks.map((wk, i) => {
                      const h = Math.max(6, (wk.count > 0 ? wk.avgScore : 0) * 9 + 6);
                      return (
                        <View key={i} style={styles.trendBarCol}>
                          <View style={styles.trendBarTrack}>
                            <View style={[styles.trendBarFill, { height: h, backgroundColor: wk.count > 0 ? MEAL_TIER_COLORS[wk.tier] : Colors.border }]} />
                          </View>
                          <Text style={styles.trendBarLabel}>{wk.count > 0 ? wk.avgScore : '—'}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <Text style={styles.sectionTitle}>{t('weekly_locked_reco')}</Text>
                <View style={styles.card}>
                  {buildRecommendations(report).map((rec, i) => (
                    <View key={i} style={styles.recoRow}>
                      <Sparkles color={Colors.primary} size={16} />
                      <Text style={styles.recoText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.lockedCard}>
                <View style={styles.lockedIconWrap}>
                  <Lock color="#A94F05" size={20} strokeWidth={2.2} />
                </View>
                <Text style={styles.lockedTitle}>{t('weekly_locked_title')}</Text>
                <View style={styles.lockedList}>
                  <View style={styles.lockedItem}><TrendingUp color={Colors.textSecondary} size={15} /><Text style={styles.lockedItemText}>{t('weekly_locked_trend')}</Text></View>
                  <View style={styles.lockedItem}><Sparkles color={Colors.textSecondary} size={15} /><Text style={styles.lockedItemText}>{t('weekly_locked_reco')}</Text></View>
                  <View style={styles.lockedItem}><Trophy color={Colors.textSecondary} size={15} /><Text style={styles.lockedItemText}>{t('weekly_locked_report')}</Text></View>
                </View>
                <Text style={styles.lockedCta}>
                  {report.problemCategory
                    ? tf('weekly_locked_cta_data', mealCategoryLabel(report.problemCategory), report.problemCount)
                    : t('weekly_locked_cta_generic')}
                </Text>
                <TouchableOpacity style={styles.unlockButton} onPress={goPaywall} activeOpacity={0.9} testID="weekly-unlock">
                  <Crown color={Colors.white} size={18} />
                  <Text style={styles.unlockButtonText}>{t('weekly_free_trial')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary },
  headerTitle: { fontSize: 18, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800' as const, color: Colors.text },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  introCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.surface, borderRadius: 22, padding: 16, marginTop: 6,
    borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  introAvatar: { width: 52, height: 52 },
  introTextCol: { flex: 1 },
  introLabel: { fontSize: 11, fontWeight: '800' as const, color: Colors.primary, letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 4 },
  introText: { fontSize: 14.5, lineHeight: 21, color: Colors.text },
  scoreWrap: { alignItems: 'center', marginTop: 22, marginBottom: 8 },
  mealsScanned: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary, marginTop: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 18, marginTop: 14,
    borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '800' as const, color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' as const, marginBottom: 12 },
  distBarTrack: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: Colors.surfaceSecondary },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' as const },
  legendCount: { fontSize: 13, fontWeight: '800' as const, color: Colors.text },
  problemValue: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  bestWorstRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  bwCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 18, padding: 14, borderWidth: 1.5, gap: 4 },
  bwLabel: { fontSize: 11, fontWeight: '700' as const, color: Colors.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' as const, marginTop: 4 },
  bwDish: { fontSize: 14.5, fontWeight: '700' as const, color: Colors.text },
  bwScore: { fontSize: 18, fontWeight: '800' as const, marginTop: 2 },
  endCard: { borderRadius: 18, padding: 18, marginTop: 14 },
  endText: { fontSize: 15, fontWeight: '700' as const, lineHeight: 22, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3, marginTop: 24, marginBottom: 2 },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 110, paddingTop: 8 },
  trendBarCol: { alignItems: 'center', gap: 8, flex: 1 },
  trendBarTrack: { flex: 1, justifyContent: 'flex-end' },
  trendBarFill: { width: 26, borderRadius: 8 },
  trendBarLabel: { fontSize: 12, fontWeight: '700' as const, color: Colors.textSecondary },
  recoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  recoText: { flex: 1, fontSize: 14.5, lineHeight: 21, color: Colors.text },
  lockedCard: {
    backgroundColor: Colors.surface, borderRadius: 22, padding: 20, marginTop: 24,
    borderWidth: 1.5, borderColor: 'rgba(169,79,5,0.22)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 3,
  },
  lockedIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(169,79,5,0.1)', alignItems: 'center', justifyContent: 'center' },
  lockedTitle: { fontSize: 19, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3, marginTop: 14 },
  lockedList: { gap: 10, marginTop: 14 },
  lockedItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lockedItemText: { fontSize: 14.5, color: Colors.textSecondary, fontWeight: '600' as const },
  lockedCta: { fontSize: 14, lineHeight: 21, color: Colors.text, marginTop: 16 },
  unlockButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, marginTop: 16,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.26, shadowRadius: 14, elevation: 5,
  },
  unlockButtonText: { color: Colors.white, fontSize: 16, fontWeight: '800' as const, letterSpacing: -0.2 },
});
