import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { ChevronLeft, Lock, TrendingUp, Sparkles, Crown, Trophy, Flame } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { t, tf, pick } from '@/utils/i18n';
import { useWeeklyMealReport, type WeeklyReport, type MealRecord } from '@/providers/MealHistoryProvider';
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
    en: `This week I looked at ${count} of your meals — average ToxiScan score ${avgScore}/10. ${good ? 'Your plate is looking clean — keep this rhythm going.' : "A few heavy meals slipped in, but nothing we can't fix together."}`,
    fr: `Cette semaine j'ai regardé ${count} de tes repas — score ToxiScan moyen ${avgScore}/10. ${good ? 'Ton assiette est propre, garde ce rythme.' : "Quelques repas lourds se sont glissés, mais rien qu'on ne puisse corriger ensemble."}`,
    ko: `이번 주에 식사 ${count}개를 살펴봤어요 — 평균 ToxiScan 점수 ${avgScore}/10이에요. ${good ? '식단이 깨끗해요, 이 리듬을 유지해 보세요.' : '조금 무거운 식사가 몇 번 있었지만, 함께 바로잡을 수 있어요.'}`,
  });
}

// ── Narrative weekly coaching: read the REAL ingredient counter across the week and
// surface the single biggest IMBALANCE in any direction, always nudging back toward the
// center (a bit of everything) — never toward an extreme. When the week is already
// balanced it simply praises, without inventing a problem. All copy is data-driven.
const MEAT_TOKENS: readonly string[] = ['beef', 'boeuf', 'steak', 'burger', 'hamburger', 'viande', 'meat', 'poulet', 'chicken', 'porc', 'pork', 'jambon', 'jamon', 'bacon', 'saucisse', 'sausage', 'salami', 'chorizo', 'pepperoni', 'charcuterie', 'lardon', 'agneau', 'lamb', 'veau', 'dinde', 'turkey', 'canard', 'merguez', 'nugget', 'kebab', 'cotelette', 'boulette', 'meatball', 'cote de', '고기', '소고기', '돼지고기', '닭고기', '햄', '베이컨', '소시지', '삼겹살'];
const FISH_TOKENS: readonly string[] = ['poisson', 'fish', 'saumon', 'salmon', 'thon', 'tuna', 'sardine', 'maquereau', 'mackerel', 'cabillaud', 'morue', 'crevette', 'shrimp', 'gambas', 'seafood', 'fruits de mer', 'truite', 'trout', 'hareng', 'anchois', 'anchovy', 'crabe', 'moule', 'calamar', 'squid', '생선', '연어', '참치', '새우', '고등어', '오징어'];
const LEGUME_TOKENS: readonly string[] = ['lentille', 'lentil', 'pois chiche', 'chickpea', 'haricot', 'bean', 'feve', 'soja', 'soy', 'tofu', 'tempeh', 'edamame', 'legumineuse', 'dal', 'dahl', 'hummus', 'houmous', '콩', '두부', '렌틸', '병아리콩'];
const VEG_TOKENS: readonly string[] = ['salade', 'salad', 'legume', 'vegetable', 'veggie', 'tomate', 'tomato', 'brocoli', 'broccoli', 'epinard', 'spinach', 'carotte', 'carrot', 'courgette', 'zucchini', 'poivron', 'bell pepper', 'concombre', 'cucumber', 'laitue', 'lettuce', 'chou', 'cabbage', 'haricot vert', 'green bean', 'aubergine', 'eggplant', 'champignon', 'mushroom', 'oignon', 'onion', 'avocat', 'avocado', 'kale', 'roquette', 'arugula', 'crudite', 'poireau', 'leek', 'asperge', 'asparagus', 'betterave', 'beet', '채소', '샐러드', '토마토', '브로콜리', '시금치', '당근', '양배추', '버섯'];
const EXTRA_PROTEIN_TOKENS: readonly string[] = ['oeuf', 'egg', 'omelette', 'yaourt grec', 'greek yogurt', 'skyr', 'fromage blanc', 'cottage', '계란', '달걀'];
const PROCESSED_SET: readonly MealCategory[] = ['processed', 'refined_oil', 'refined_flour', 'additive'];

function normName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function mealHasToken(meal: MealRecord, tokens: readonly string[]): boolean {
  return meal.ingredients.some((ing) => {
    const n = normName(ing.name);
    return tokens.some((tk) => n.includes(tk));
  });
}

function mealHasCategory(meal: MealRecord, cats: readonly MealCategory[]): boolean {
  return meal.ingredients.some((ing) => cats.includes(ing.category));
}

/**
 * Builds Dr. Toxi's personalized, narrative weekly advice from the REAL meals of the
 * week. It detects the dominant imbalance (too much meat, recurring sugar, too much
 * ultra-processed, lots of veg but little protein…) and always steers back toward a
 * realistic balance — a bit of everything — never toward an extreme. If the week is
 * already balanced it simply praises, without inventing a problem.
 */
function buildDrAdvice(report: WeeklyReport): string {
  const n = report.count;
  if (n < 2) {
    return pick({
      en: `Just one meal analyzed this week so far — scan two or three more and I'll tell you exactly what to rebalance, no guessing.`,
      fr: `Une seule analyse cette semaine pour l'instant — scanne encore deux ou trois repas et je te dirai précisément quoi rééquilibrer, sans rien inventer.`,
      ko: `이번 주엔 아직 한 끼만 분석됐어요 — 두세 끼만 더 스캔하면 추측 없이 무엇을 균형 잡아야 할지 정확히 알려줄게요.`,
    });
  }

  const meals = report.meals;
  const meatN = meals.filter((m) => mealHasToken(m, MEAT_TOKENS)).length;
  const vegN = meals.filter((m) => mealHasToken(m, VEG_TOKENS)).length;
  const sugarN = meals.filter((m) => mealHasCategory(m, ['added_sugar'])).length;
  const processedN = meals.filter((m) => mealHasCategory(m, PROCESSED_SET)).length;
  const proteinN = meals.filter(
    (m) =>
      mealHasToken(m, MEAT_TOKENS) ||
      mealHasToken(m, FISH_TOKENS) ||
      mealHasToken(m, LEGUME_TOKENS) ||
      mealHasToken(m, EXTRA_PROTEIN_TOKENS),
  ).length;

  // 1) Meat-heavy + few vegetables → vary the protein, add greens.
  if (meatN >= 2 && meatN / n >= 0.5 && vegN / n < 0.5) {
    return pick({
      en: `This week, meat shows up in ${meatN} of your ${n} meals — try alternating with fish, legumes or a few more vegetables to vary your protein. Nothing serious, just a small rebalance and your plate is spot on.`,
      fr: `Cette semaine, la viande revient dans ${meatN} de tes ${n} repas — essaie d'alterner avec du poisson, des légumineuses ou un peu plus de légumes pour varier les protéines. Rien de grave, juste un petit rééquilibrage et ton assiette sera nickel.`,
      ko: `이번 주엔 ${n}끼 중 ${meatN}끼에 고기가 들어갔어요 — 생선, 콩류, 또는 채소를 조금 더 곁들여 단백질을 다양화해 보세요. 큰 문제는 아니고, 살짝만 균형을 잡으면 완벽해요.`,
    });
  }

  // 2) Sugar recurring across the week → reduce / swap, don't cut everything.
  if (sugarN >= 2 && sugarN / n >= 0.5) {
    return pick({
      en: `I spotted added sugar in ${sugarN} of your ${n} meals this week — no need to cut it all, just swap one for fruit or plain yogurt. Your body will thank you without giving anything up.`,
      fr: `J'ai repéré du sucre ajouté dans ${sugarN} de tes ${n} repas cette semaine — pas besoin de tout couper, remplace-en juste un par un fruit ou un yaourt nature. Ton corps te dira merci sans rien sacrifier.`,
      ko: `이번 주 ${n}끼 중 ${sugarN}끼에서 첨가당이 보였어요 — 전부 끊을 필요는 없어요. 한 끼만 과일이나 플레인 요거트로 바꿔보세요. 무리 없이 몸이 좋아질 거예요.`,
    });
  }

  // 3) Ultra-processed recurring → one more whole-food / home-cooked meal.
  if (processedN >= 2 && processedN / n >= 0.5) {
    return pick({
      en: `A lot of ultra-processed food landed on your plate this week (${processedN} of ${n} meals). Aim for one more home-cooked meal built on whole, recognizable ingredients — it's your best lever to lift the score.`,
      fr: `Beaucoup d'ultra-transformé est passé dans ton assiette cette semaine (${processedN} repas sur ${n}). Vise un repas maison de plus, à base d'aliments bruts et reconnaissables — c'est ton meilleur levier pour faire grimper le score.`,
      ko: `이번 주엔 초가공식품이 식탁에 자주 올라왔어요 (${n}끼 중 ${processedN}끼). 가공되지 않은, 알아볼 수 있는 재료로 만든 집밥을 한 끼만 더 해보세요 — 점수를 올리는 가장 좋은 방법이에요.`,
    });
  }

  // 4) Plenty of vegetables but little protein → add a bit more protein.
  if (vegN / n >= 0.5 && proteinN / n < 0.4) {
    return pick({
      en: `Great week on the vegetable front! Your meals are a little light on protein though — add an egg, some fish, tofu or legumes to stay full till the next meal. Balance is a bit of everything.`,
      fr: `Belle semaine côté légumes ! En revanche tes repas manquent un peu de protéines — ajoute un œuf, du poisson, du tofu ou des légumineuses pour tenir jusqu'au prochain repas sans fringale. L'équilibre, c'est un peu de tout.`,
      ko: `채소는 훌륭한 한 주였어요! 다만 단백질이 조금 부족해요 — 계란, 생선, 두부, 콩류를 더해 다음 식사까지 든든하게 채워보세요. 균형은 골고루 먹는 거예요.`,
    });
  }

  // 5) Already balanced → genuine praise (high score) or a gentle nudge (lower score).
  if (report.avgScore >= 6) {
    return pick({
      en: `Honestly, a well-balanced week — a bit of everything, in good proportions, with no excess creeping back. That's exactly the right habit: keep this up, I've got nothing to add.`,
      fr: `Franchement, semaine bien équilibrée — un peu de tout, dans de bonnes proportions, sans excès qui revient. C'est exactement le bon réflexe : continue sur cette lancée, je n'ai rien à redire.`,
      ko: `솔직히 균형 잡힌 한 주였어요 — 골고루, 좋은 비율로, 반복되는 과함도 없었어요. 딱 좋은 습관이에요: 이대로 쭉 가요, 더 보탤 말이 없네요.`,
    });
  }
  return pick({
    en: `No major imbalance this week, but we can aim a notch higher — one more whole, colorful meal with both vegetables and protein would be enough to move your score. Small step, real effect.`,
    fr: `Pas de gros déséquilibre cette semaine, mais on peut viser un cran au-dessus — un repas brut et coloré de plus, avec légumes ET protéines, suffirait à faire bouger ton score. Petit pas, vrai effet.`,
    ko: `이번 주엔 큰 불균형은 없었어요. 다만 한 단계 더 올려볼 수 있어요 — 채소와 단백질을 함께 담은, 가공 안 된 다채로운 식사를 한 끼만 더 해보면 점수가 움직일 거예요. 작은 한 걸음이 진짜 효과를 내요.`,
  });
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
                <View style={styles.adviceRow}>
                  <View style={styles.adviceAvatarWrap}>
                    <Image source={{ uri: MEAL_TIER_AVATARS.green }} style={styles.adviceAvatar} contentFit="contain" />
                  </View>
                  <View style={styles.adviceBubble}>
                    <Text style={styles.adviceText}>{buildDrAdvice(report)}</Text>
                  </View>
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
  adviceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 14 },
  adviceAvatarWrap: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(46,158,52,0.1)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(46,158,52,0.18)',
  },
  adviceAvatar: { width: 44, height: 44 },
  adviceBubble: {
    flex: 1, backgroundColor: 'rgba(46,158,52,0.08)', borderRadius: 20, borderTopLeftRadius: 6,
    paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(46,158,52,0.16)',
  },
  adviceText: { fontSize: 14.5, lineHeight: 22, color: Colors.text, fontWeight: '500' as const },
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
