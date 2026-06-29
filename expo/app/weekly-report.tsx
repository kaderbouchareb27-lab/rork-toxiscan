import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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

interface LangText {
  en: string;
  fr: string;
  ko: string;
}

const EMPTY_LANG: LangText = { en: '', fr: '', ko: '' };

/** A harmful family the weekly diagnosis can detect, name, and give a concrete fix for. */
interface HarmDef {
  key: 'meat' | 'sugar' | 'processed' | 'salt' | 'additive';
  test: (m: MealRecord) => boolean;
  /** "a lot of ___" noun (EN). */
  en: string;
  /** French mass form after "beaucoup ___" (e.g. "de viande", "d'additifs"). */
  frDe: string;
  /** French partitive form after "tu as eu ___" (e.g. "de la viande", "du sel"). */
  frPart: string;
  /** Korean noun. */
  ko: string;
  /** Korean subject particle that follows the noun (이 / 가). */
  koGa: string;
  /** One concrete first-step fix, language-aware. */
  fix: LangText;
}

const HARM_DEFS: readonly HarmDef[] = [
  {
    key: 'meat',
    test: (m) => mealHasToken(m, MEAT_TOKENS),
    en: 'meat',
    frDe: 'de viande',
    frPart: 'de la viande',
    ko: '고기',
    koGa: '가',
    fix: {
      en: 'Alternate with fish or legumes and add a handful of greens',
      fr: `Alterne avec du poisson ou des légumineuses et ajoute une poignée de légumes verts`,
      ko: '생선이나 콩류와 번갈아 먹고 채소를 곁들여요',
    },
  },
  {
    key: 'sugar',
    test: (m) => mealHasCategory(m, ['added_sugar']),
    en: 'added sugar',
    frDe: 'de sucre ajouté',
    frPart: 'du sucre ajouté',
    ko: '첨가당',
    koGa: '이',
    fix: {
      en: 'Swap one sweet item for fruit or plain yogurt',
      fr: 'Remplace un aliment sucré par un fruit ou un yaourt nature',
      ko: '단 음식 하나를 과일이나 플레인 요거트로 바꿔요',
    },
  },
  {
    key: 'processed',
    test: (m) => mealHasCategory(m, ['processed', 'refined_oil', 'refined_flour']),
    en: 'ultra-processed food',
    frDe: 'de produits ultra-transformés',
    frPart: 'des produits ultra-transformés',
    ko: '초가공식품',
    koGa: '이',
    fix: {
      en: 'Cook one more meal from whole, recognizable ingredients',
      fr: `Cuisine un repas de plus à partir d'aliments bruts et reconnaissables`,
      ko: '알아볼 수 있는 자연 재료로 한 끼 더 만들어요',
    },
  },
  {
    key: 'salt',
    test: (m) => mealHasCategory(m, ['excess_salt']),
    en: 'excess salt',
    frDe: 'de sel',
    frPart: 'du sel',
    ko: '염분',
    koGa: '이',
    fix: {
      en: 'Season lighter and lean on herbs and spices instead of salt',
      fr: `Assaisonne plus léger et mise sur les herbes et épices plutôt que le sel`,
      ko: '간을 약하게 하고 소금 대신 허브와 향신료를 활용해요',
    },
  },
  {
    key: 'additive',
    test: (m) => mealHasCategory(m, ['additive']),
    en: 'additives',
    frDe: `d'additifs`,
    frPart: 'des additifs',
    ko: '첨가물',
    koGa: '이',
    fix: {
      en: 'Pick less industrial versions with shorter ingredient lists',
      fr: `Choisis des versions moins industrielles, aux listes d'ingrédients plus courtes`,
      ko: '성분표가 짧은 덜 가공된 제품을 골라요',
    },
  },
];

/** Calendar-day key (local time) used to detect same-day repetition of a harm. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Dish names of up to `max` distinct meals matching `test`, in scan order. */
function culpritNames(meals: readonly MealRecord[], test: (m: MealRecord) => boolean, max: number): string[] {
  const names: string[] = [];
  for (const m of meals) {
    const name = (m.dishName ?? '').trim();
    if (name && test(m) && !names.includes(name)) {
      names.push(name);
      if (names.length >= max) break;
    }
  }
  return names;
}

/** Parenthetical "(e.g. X, Y)" naming the responsible meals, or empty when none. */
function culpritTag(names: string[]): LangText {
  if (names.length === 0) return EMPTY_LANG;
  const list = names.join(', ');
  return { en: ` (e.g. ${list})`, fr: ` (ex. ${list})`, ko: ` (예: ${list})` };
}

/** Joins narrative fragments into one paragraph per language. */
function joinLang(parts: readonly LangText[]): LangText {
  return {
    en: parts.map((p) => p.en).filter(Boolean).join(' '),
    fr: parts.map((p) => p.fr).filter(Boolean).join(' '),
    ko: parts.map((p) => p.ko).filter(Boolean).join(' '),
  };
}

/**
 * Builds Dr. Toxi's full weekly DIAGNOSIS from the REAL meals of the week. It crosses
 * several signals at once (meat vs vegetables/protein, recurring sugar, salt,
 * ultra-processed, additives), detects same-day over-repetition of a single harmful
 * family (per calendar day, not just the weekly total), names the meals actually
 * responsible, and always steers back toward an athlete-level variety — a bit of
 * everything — never toward an extreme. A genuinely balanced week is simply praised.
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

  // Balance reference (variety): vegetable presence and total protein coverage.
  const vegN = meals.filter((m) => mealHasToken(m, VEG_TOKENS)).length;
  const proteinN = meals.filter(
    (m) =>
      mealHasToken(m, MEAT_TOKENS) ||
      mealHasToken(m, FISH_TOKENS) ||
      mealHasToken(m, LEGUME_TOKENS) ||
      mealHasToken(m, EXTRA_PROTEIN_TOKENS),
  ).length;

  // CROSS-SIGNAL — every harmful family that is notable this week (≥2 meals AND ≥40%),
  // strongest first, so several problems can be surfaced together (not just the top one).
  const signals = HARM_DEFS.map((def) => ({
    def,
    count: meals.filter((m) => def.test(m)).length,
  }))
    .filter((s) => s.count >= 2 && s.count / n >= 0.4)
    .sort((a, b) => b.count - a.count);

  // SAME-DAY REPETITION — a single harmful family landing in ≥3 meals on ONE calendar
  // day, independent of the weekly total. Keeps the worst such day across all families.
  let conc: { def: HarmDef; count: number; names: string[] } | null = null;
  for (const def of HARM_DEFS) {
    const perDay = new Map<string, MealRecord[]>();
    for (const m of meals) {
      if (!def.test(m)) continue;
      const k = dayKey(m.scannedAt);
      const arr = perDay.get(k) ?? [];
      arr.push(m);
      perDay.set(k, arr);
    }
    let worst: MealRecord[] = [];
    perDay.forEach((arr) => {
      if (arr.length > worst.length) worst = arr;
    });
    if (worst.length >= 3 && (!conc || worst.length > conc.count)) {
      conc = { def, count: worst.length, names: culpritNames(worst, def.test, 2) };
    }
  }

  const lowProtein = vegN / n >= 0.5 && proteinN / n < 0.4;

  // ── Nothing flagged and no daily spike → honest praise or a gentle protein nudge,
  //    never an invented problem (keeps the balance-not-extreme philosophy).
  if (signals.length === 0 && !conc) {
    if (lowProtein) {
      return pick({
        en: `Strong week on vegetables — but protein is running a little light across your meals. Add eggs, fish, tofu or legumes so each plate stays as complete as an athlete's. Balance is a bit of everything, in the right proportions.`,
        fr: `Belle semaine côté légumes — mais les protéines sont un peu justes sur l'ensemble de tes repas. Ajoute des œufs, du poisson, du tofu ou des légumineuses pour que chaque assiette reste aussi complète que celle d'un sportif. L'équilibre, c'est un peu de tout, dans les bonnes proportions.`,
        ko: `채소는 훌륭한 한 주였어요 — 다만 전체적으로 단백질이 조금 부족해요. 계란, 생선, 두부, 콩류를 더해 매 끼를 운동선수처럼 완성해 보세요. 균형은 좋은 비율로 골고루 먹는 거예요.`,
      });
    }
    if (report.avgScore >= 6) {
      return pick({
        en: `Honestly, a well-balanced week — a bit of everything, in good proportions, with no excess creeping back across your meals. That's exactly how a top athlete eats: keep this variety going, I've got nothing to add.`,
        fr: `Franchement, semaine bien équilibrée — un peu de tout, dans de bonnes proportions, sans excès qui revient sur l'ensemble de tes repas. C'est exactement comme mange un sportif de haut niveau : garde cette variété, je n'ai rien à redire.`,
        ko: `솔직히 균형 잡힌 한 주였어요 — 모든 식사를 통틀어 골고루, 좋은 비율로, 반복되는 과함도 없었어요. 최고 수준의 운동선수가 먹는 방식이에요: 이 다양함을 유지해요, 더 보탤 말이 없네요.`,
      });
    }
    return pick({
      en: `No single imbalance jumps out this week, but we can aim a notch higher — one more whole, colorful plate with both vegetables and protein and you're eating like an athlete. Small step, real effect.`,
      fr: `Aucun déséquilibre net cette semaine, mais on peut viser un cran au-dessus — une assiette brute et colorée de plus, avec légumes ET protéines, et tu manges comme un sportif. Petit pas, vrai effet.`,
      ko: `이번 주엔 뚜렷한 불균형은 없어요. 다만 한 단계 더 올려볼 수 있어요 — 채소와 단백질을 함께 담은 자연식 한 끼만 더하면 운동선수처럼 먹는 거예요. 작은 한 걸음이 진짜 효과를 내요.`,
    });
  }

  // ── At least one finding → assemble a complete, cross-signal narrative diagnosis.
  const parts: LangText[] = [];
  const dominant: HarmDef = signals[0]?.def ?? conc?.def ?? HARM_DEFS[0];

  if (signals.length >= 2) {
    const a = signals[0];
    const b = signals[1];
    parts.push({
      en: `This week two things stand out together — a lot of ${a.def.en} (${a.count}/${n} meals) and ${b.def.en} (${b.count}/${n}).`,
      fr: `Cette semaine, deux choses ressortent ensemble — beaucoup ${a.def.frDe} (${a.count}/${n} repas) et ${b.def.frDe} (${b.count}/${n}).`,
      ko: `이번 주엔 두 가지가 함께 눈에 띄어요 — ${a.def.ko} (${n}끼 중 ${a.count}끼), 그리고 ${b.def.ko} (${b.count}끼).`,
    });
    const names = culpritNames(meals, dominant.test, 2);
    if (names.length > 0) {
      const list = names.join(', ');
      parts.push({
        en: `Main culprits: ${list}.`,
        fr: `Principaux responsables : ${list}.`,
        ko: `주된 원인: ${list}.`,
      });
    }
  } else if (signals.length === 1) {
    const a = signals[0];
    const tag = culpritTag(culpritNames(meals, a.def.test, 2));
    parts.push({
      en: `This week I'm seeing a lot of ${a.def.en} in your meals — ${a.count} of ${n}${tag.en}.`,
      fr: `Cette semaine, je vois beaucoup ${a.def.frDe} dans tes repas — ${a.count} sur ${n}${tag.fr}.`,
      ko: `이번 주엔 ${a.def.ko}${a.def.koGa} 식사에 자주 보였어요 — ${n}끼 중 ${a.count}끼${tag.ko}.`,
    });
  }

  if (conc) {
    const ctag = culpritTag(conc.names);
    parts.push({
      en: `And on a single day, ${conc.def.en} came back ${conc.count} times${ctag.en} — too concentrated. The problem isn't the food itself, it's repeating the same one without variety.`,
      fr: `Et sur une même journée, tu as eu ${conc.def.frPart} dans ${conc.count} repas${ctag.fr} — trop concentré. Le souci, ce n'est pas l'aliment, c'est de le répéter sans varier.`,
      ko: `그리고 같은 날 ${conc.def.ko}${conc.def.koGa} ${conc.count}번이나 반복됐어요${ctag.ko} — 너무 몰렸어요. 문제는 음식 자체가 아니라 다양하게 먹지 않고 같은 걸 반복하는 거예요.`,
    });
  }

  parts.push({
    en: `${dominant.fix.en}. Nothing to ban — just more variety, the way a top athlete eats: whole foods and a bit of everything across the week (vegetables, fish, legumes, healthy starches), never too much of one thing.`,
    fr: `${dominant.fix.fr}. Rien à bannir — juste plus de variété, comme mange un sportif de haut niveau : des aliments bruts et un peu de tout sur la semaine (légumes, poisson, légumineuses, féculents sains), jamais trop d'une seule chose.`,
    ko: `${dominant.fix.ko}. 금지할 건 없어요 — 그저 최고 수준의 운동선수처럼 더 다양하게: 자연식과 한 주 동안 골고루(채소, 생선, 콩류, 건강한 탄수화물), 한 가지에 치우치지 않게요.`,
  });

  return pick(joinLang(parts));
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
            <LinearGradient colors={['#FFFFFF', '#FFFDF8', '#F5F1E8']} style={styles.scoreHero}>
              <View style={[styles.scoreHalo, { backgroundColor: `${tierColor}12` }]} />
              <View style={styles.scoreHeroTopRow}>
                <View style={[styles.scoreStatusDot, { backgroundColor: tierColor }]} />
                <Text style={styles.scoreHeroEyebrow}>{t('weekly_score_label')}</Text>
              </View>
              <View style={styles.scoreRingShell}>
                <ToxicityScoreRing score={report.avgScore} tier={report.tier} size={196} label={t('weekly_score_label')} caption={mealTierLabel(report.tier)} />
              </View>
              <View style={styles.mealsPill}>
                <Sparkles color={tierColor} size={15} strokeWidth={2.4} />
                <Text style={styles.mealsScanned}>{tf('weekly_meals_scanned', report.count)}</Text>
              </View>
            </LinearGradient>

            {/* Distribution (everyone, real) */}
            <View style={styles.cardPremium}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleMark} />
                <Text style={styles.cardTitle}>{t('weekly_distribution')}</Text>
              </View>
              <View style={styles.distBarOuter}>
                <View style={styles.distBarTrack}>
                  {TIERS.map((tr) =>
                    report.distribution[tr] > 0 ? (
                      <View key={tr} style={{ flex: report.distribution[tr], backgroundColor: MEAL_TIER_COLORS[tr] }} />
                    ) : null,
                  )}
                </View>
              </View>
              <View style={styles.legendGrid}>
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
              <View style={styles.culpritCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.cardTitleMark, styles.culpritMark]} />
                  <Text style={styles.cardTitle}>{t('weekly_problem_ingredient')}</Text>
                </View>
                <View style={styles.problemValueBox}>
                  <Text style={styles.problemValue}>
                    {tf('weekly_problem_detected', mealCategoryLabel(report.problemCategory), report.problemCount)}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Best / worst meal (everyone, real) */}
            {report.bestMeal || report.worstMeal ? (
              <View style={styles.bestWorstRow}>
                {report.bestMeal ? (
                  <TouchableOpacity style={[styles.bwCard, styles.bwCardGood]} onPress={() => router.push(`/meal/${report.bestMeal!.id}`)} activeOpacity={0.85}>
                    <View style={styles.bwTopRow}>
                      <View style={[styles.bwIconWrap, styles.bwIconGood]}>
                        <Trophy color="#2E9E34" size={18} strokeWidth={2.3} />
                      </View>
                      <Text style={[styles.bwScoreMini, { color: MEAL_TIER_COLORS[report.bestMeal.tier] }]}>{report.bestMeal.score}/10</Text>
                    </View>
                    <Text style={styles.bwLabel}>{t('weekly_best_meal')}</Text>
                    <Text style={styles.bwDish} numberOfLines={2}>{report.bestMeal.dishName}</Text>
                  </TouchableOpacity>
                ) : null}
                {report.worstMeal && report.worstMeal.id !== report.bestMeal?.id ? (
                  <TouchableOpacity style={[styles.bwCard, styles.bwCardRisk]} onPress={() => router.push(`/meal/${report.worstMeal!.id}`)} activeOpacity={0.85}>
                    <View style={styles.bwTopRow}>
                      <View style={[styles.bwIconWrap, styles.bwIconRisk]}>
                        <Flame color="#D0260F" size={18} strokeWidth={2.3} />
                      </View>
                      <Text style={[styles.bwScoreMini, { color: MEAL_TIER_COLORS[report.worstMeal.tier] }]}>{report.worstMeal.score}/10</Text>
                    </View>
                    <Text style={styles.bwLabel}>{t('weekly_worst_meal')}</Text>
                    <Text style={styles.bwDish} numberOfLines={2}>{report.worstMeal.dishName}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {/* End message (everyone) */}
            <View style={[styles.endCard, { backgroundColor: `${tierColor}14`, borderColor: `${tierColor}26` }]}>
              <Text style={[styles.endText, { color: report.avgScore >= 6 ? '#0B7A2D' : '#A94F05' }]}>
                {report.avgScore >= 6 ? t('weekly_end_good') : t('weekly_end_improve')}
              </Text>
            </View>

            {/* Premium projection — trend + recommendations */}
            {isPro ? (
              <>
                <Text style={styles.sectionTitle}>{t('weekly_locked_trend')}</Text>
                <LinearGradient colors={['#FFFFFF', '#FFFDF8']} style={styles.trendCard}>
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
                </LinearGradient>

                <Text style={styles.sectionTitle}>{t('weekly_locked_reco')}</Text>
                <View style={styles.adviceCard}>
                  <View style={styles.adviceAvatarWrap}>
                    <Image source={{ uri: MEAL_TIER_AVATARS.green }} style={styles.adviceAvatar} contentFit="contain" />
                  </View>
                  <View style={styles.adviceBubble}>
                    <View style={styles.adviceTail} />
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
    flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: Colors.surface, borderRadius: 26, padding: 18, marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(232,225,214,0.9)', shadowColor: '#111814', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.07, shadowRadius: 24, elevation: 4,
  },
  introAvatar: { width: 58, height: 58 },
  introTextCol: { flex: 1 },
  introLabel: { fontSize: 12, fontWeight: '900' as const, color: Colors.primary, letterSpacing: 1.4, textTransform: 'uppercase' as const, marginBottom: 6 },
  introText: { fontSize: 15.5, lineHeight: 23.5, color: Colors.text, fontWeight: '500' as const, letterSpacing: -0.15 },
  scoreHero: {
    alignItems: 'center', marginTop: 18, marginBottom: 8, borderRadius: 34, paddingVertical: 22, paddingHorizontal: 18,
    borderWidth: 1, borderColor: 'rgba(232,225,214,0.9)', overflow: 'hidden',
    shadowColor: '#111814', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.08, shadowRadius: 30, elevation: 5,
  },
  scoreHalo: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: 42, alignSelf: 'center' },
  scoreHeroTopRow: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8, backgroundColor: 'rgba(244,241,234,0.72)',
    borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7, marginBottom: 8,
  },
  scoreStatusDot: { width: 7, height: 7, borderRadius: 4 },
  scoreHeroEyebrow: { fontSize: 10.5, fontWeight: '900' as const, color: Colors.textSecondary, letterSpacing: 1.1, textTransform: 'uppercase' as const },
  scoreRingShell: {
    backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 120, padding: 8,
    shadowColor: '#111814', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 2,
  },
  mealsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 9,
  },
  mealsScanned: { fontSize: 14.5, fontWeight: '800' as const, color: Colors.textSecondary, letterSpacing: -0.1 },
  cardPremium: {
    backgroundColor: Colors.surface, borderRadius: 26, padding: 20, marginTop: 16,
    borderWidth: 1, borderColor: 'rgba(232,225,214,0.9)', shadowColor: '#111814', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 },
  cardTitleMark: { width: 4, height: 18, borderRadius: 99, backgroundColor: Colors.primary },
  cardTitle: { fontSize: 13, fontWeight: '900' as const, color: Colors.textSecondary, letterSpacing: 0.9, textTransform: 'uppercase' as const },
  distBarOuter: { backgroundColor: '#F9F5EC', borderRadius: 999, padding: 5, borderWidth: 1, borderColor: Colors.borderLight },
  distBarTrack: { flexDirection: 'row', height: 20, borderRadius: 999, overflow: 'hidden', backgroundColor: Colors.surfaceSecondary },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8,
  },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 13.5, color: Colors.textSecondary, fontWeight: '700' as const, letterSpacing: -0.1 },
  legendCount: { fontSize: 14, fontWeight: '900' as const, color: Colors.text, fontVariant: ['tabular-nums'] },
  culpritCard: {
    backgroundColor: Colors.surface, borderRadius: 26, padding: 20, marginTop: 16,
    borderWidth: 1, borderColor: 'rgba(232,225,214,0.9)', shadowColor: '#111814', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4,
  },
  culpritMark: { backgroundColor: Colors.caution },
  problemValueBox: { backgroundColor: '#FFFBF0', borderRadius: 18, paddingHorizontal: 15, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(234,179,8,0.18)' },
  problemValue: { fontSize: 18, lineHeight: 24, fontWeight: '900' as const, color: Colors.text, letterSpacing: -0.4 },
  bestWorstRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  bwCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 24, padding: 16, borderWidth: 1.5, minHeight: 142,
    shadowColor: '#111814', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 3,
  },
  bwCardGood: { borderColor: 'rgba(46,158,52,0.25)', backgroundColor: '#FEFFFC' },
  bwCardRisk: { borderColor: 'rgba(208,38,15,0.22)', backgroundColor: '#FFFDFB' },
  bwTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  bwIconWrap: { width: 34, height: 34, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bwIconGood: { backgroundColor: 'rgba(46,158,52,0.1)' },
  bwIconRisk: { backgroundColor: 'rgba(208,38,15,0.08)' },
  bwScoreMini: { fontSize: 17, fontWeight: '900' as const, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  bwLabel: { fontSize: 10.5, fontWeight: '900' as const, color: Colors.textTertiary, letterSpacing: 0.85, textTransform: 'uppercase' as const, marginBottom: 7 },
  bwDish: { fontSize: 16, lineHeight: 20.5, fontWeight: '900' as const, color: Colors.text, letterSpacing: -0.35 },
  endCard: { borderRadius: 24, paddingHorizontal: 20, paddingVertical: 22, marginTop: 18, borderWidth: 1 },
  endText: { fontSize: 17, fontWeight: '900' as const, lineHeight: 25, textAlign: 'center', letterSpacing: -0.3 },
  sectionTitle: { fontSize: 24, fontWeight: '900' as const, color: Colors.text, letterSpacing: -0.8, marginTop: 30, marginBottom: 10 },
  trendCard: {
    borderRadius: 26, padding: 20, borderWidth: 1, borderColor: 'rgba(232,225,214,0.9)',
    shadowColor: '#111814', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4,
  },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 126, paddingTop: 10 },
  trendBarCol: { alignItems: 'center', gap: 9, flex: 1 },
  trendBarTrack: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', width: 34, backgroundColor: '#F3EEE5', borderRadius: 14, padding: 4 },
  trendBarFill: { width: 26, borderRadius: 12 },
  trendBarLabel: { fontSize: 14, fontWeight: '900' as const, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
  adviceCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 6 },
  adviceAvatarWrap: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(46,158,52,0.1)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(46,158,52,0.2)',
    shadowColor: '#2E9E34', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 3,
  },
  adviceAvatar: { width: 52, height: 52 },
  adviceBubble: {
    flex: 1, backgroundColor: '#F0FAEF', borderRadius: 26, borderTopLeftRadius: 8,
    paddingHorizontal: 18, paddingVertical: 17, borderWidth: 1.3, borderColor: 'rgba(46,158,52,0.2)',
    shadowColor: '#111814', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 18, elevation: 3,
  },
  adviceTail: {
    position: 'absolute', left: -7, top: 18, width: 14, height: 14, backgroundColor: '#F0FAEF',
    borderLeftWidth: 1.3, borderBottomWidth: 1.3, borderColor: 'rgba(46,158,52,0.2)', transform: [{ rotate: '45deg' }],
  },
  adviceText: { fontSize: 15.5, lineHeight: 25, color: Colors.text, fontWeight: '600' as const, letterSpacing: -0.18 },
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
