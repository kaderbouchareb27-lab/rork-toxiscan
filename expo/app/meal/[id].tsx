import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { ChevronLeft, MessageCircle, Share2, ChefHat, AlertTriangle, UserCheck, Megaphone, Leaf, ArrowRight, ChevronDown, ChevronUp, Flame, Beef, Wheat, Droplet, ShieldAlert } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { t, pick } from '@/utils/i18n';
import { useMeals } from '@/providers/MealHistoryProvider';
import { useHealthProfile } from '@/providers/HealthProfileProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { getProfileScanAlerts } from '@/utils/healthProfile';
import {
  MEAL_TIER_AVATARS,
  MEAL_TIER_COLORS,
  MEAL_CATEGORY_COLORS,
  mealCategoryLabel,
  mealTierLabel,
  mealTierSubtitle,
} from '@/constants/mealAvatars';
import type { MealTier } from '@/utils/mealAnalysis';
import { maybeRequestReviewAfterPositiveScan } from '@/utils/reviewPrompt';
import MealConfetti from '@/components/MealConfetti';
import NearbyStores from '@/components/NearbyStores';
import { findHealthierMealRecipe, getCachedHealthierRecipe, type HealthierRecipe } from '@/utils/mealRecipe';
import { ingredientHazardDisplay } from '@/utils/hazardProfile';
import type { Advisory } from '@/utils/badgeEngine';

/**
 * Advisory pill tone. The pill sits NEXT TO the ingredient, never inside its badge: a food
 * can be excellent (liver, brie, shrimp, Brazil nuts) and still carry a targeted warning.
 */
function advisoryTone(advisory: Advisory): { bg: string; border: string; fg: string } {
  switch (advisory) {
    case 'avoid_all':
      return { bg: '#FCE9E4', border: '#F2C7BB', fg: '#9A2B12' };
    case 'avoid_vulnerable':
      return { bg: '#FDF2DC', border: '#EFDCAE', fg: '#8A5A08' };
    default:
      return { bg: '#EFF3EB', border: '#DBE3D1', fg: '#4C6044' };
  }
}

const TIER_TO_VERDICT: Record<MealTier, 'approuve' | 'moderation' | 'warning' | 'danger'> = {
  green: 'approuve',
  yellow: 'moderation',
  orange: 'warning',
  red: 'danger',
};

export default function MealResultScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getMeal } = useMeals();
  const { profile: healthProfile } = useHealthProfile();
  const { isPro } = useSubscription();
  const meal = useMemo(() => (typeof id === 'string' ? getMeal(id) : undefined), [id, getMeal]);
  const hasRequestedReview = useRef<boolean>(false);

  // The verdict shows 3-4 short bullets by default (readable in seconds); the full
  // ingredient-by-ingredient paragraph stays one tap away behind "See more".
  const [isVerdictExpanded, setIsVerdictExpanded] = useState<boolean>(false);
  const toggleVerdict = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setIsVerdictExpanded((p) => !p);
  }, []);

  // Confetti celebration — fires ONCE when a perfect 10/10 meal result appears.
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const hasCelebrated = useRef<boolean>(false);
  useEffect(() => {
    if (!meal || hasCelebrated.current) return;
    if (meal.score >= 10) {
      hasCelebrated.current = true;
      setShowConfetti(true);
    }
  }, [meal]);

  // Healthier-recipe alternative (on-demand). Generated only when the user taps the
  // "Alternatives" button; cached for the session so it reappears instantly on re-open.
  const [recipe, setRecipe] = useState<HealthierRecipe | null>(null);
  const [isFindingRecipe, setIsFindingRecipe] = useState<boolean>(false);
  const [recipeError, setRecipeError] = useState<boolean>(false);
  useEffect(() => {
    if (!meal) return;
    const cached = getCachedHealthierRecipe(meal.dishName);
    if (cached) setRecipe(cached);
  }, [meal]);

  // Personalized profile alerts: cross the user's health profile (pregnancy,
  // vegetarian/vegan, zero-additive, allergies…) with the ingredients ACTUALLY
  // detected in this meal. Advisory only — never changes the toxicity score.
  const profileAlerts = useMemo(() => {
    if (!meal) return [];
    const flaggedCount = meal.ingredients.filter((ing) => ing.isGrave || ing.category === 'additive').length;
    return getProfileScanAlerts(
      healthProfile,
      meal.ingredients.map((ing) => ({ nom: ing.name })),
      flaggedCount,
    );
  }, [meal, healthProfile]);

  // After a POSITIVE (green "Bon repas") meal verdict, ask for Apple's native
  // in-app review. Only on a good outcome, only via the system sheet, capped to
  // Apple's 3×/year (enforced in the helper). Toxic meals never ask.
  useEffect(() => {
    if (!meal || hasRequestedReview.current) return;
    if (meal.tier !== 'green') return;
    hasRequestedReview.current = true;
    void maybeRequestReviewAfterPositiveScan(true);
  }, [meal]);

  const handleAskDrToxi = useCallback(() => {
    if (!meal) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/dr-toxi',
      params: {
        productName: meal.dishName,
        productBarcode: meal.id,
        productVerdict: TIER_TO_VERDICT[meal.tier],
        productSummary: meal.verdictText,
      },
    });
  }, [meal]);

  const handleShare = useCallback(async () => {
    if (!meal) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${meal.dishName} — ${t('meal_toxicity_level')}: ${meal.score}/10 (${mealTierLabel(meal.tier)})\n\n${meal.verdictText}\n\n${t('share_drtoxi_suffix')}`,
      });
    } catch (e) {
      console.log('[MealResult] Share error:', e);
    }
  }, [meal]);

  const handleFindAlternatives = useCallback(async () => {
    if (!meal) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsFindingRecipe(true);
    setRecipeError(false);
    const result = await findHealthierMealRecipe({
      dishName: meal.dishName,
      ingredients: meal.ingredients,
      score: meal.score,
    });
    if (result) {
      setRecipe(result);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setRecipeError(true);
    }
    setIsFindingRecipe(false);
  }, [meal]);

  if (!meal) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft color={Colors.text} size={24} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('meal_not_found')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tierColor = MEAL_TIER_COLORS[meal.tier];
  const avatar = MEAL_TIER_AVATARS[meal.tier];
  const bullets = meal.verdictBullets ?? [];
  const nutrition = meal.nutrition ?? null;
  // Meals that aren't great (health score ≤ 6) get a healthier-recipe alternative;
  // a good meal (7+) needs none, so the whole section is hidden.
  const showAlternatives = meal.score <= 6;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{meal.dishName}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Reactive avatar + 2. Toxicity badge + score */}
        <View style={[styles.hero, { backgroundColor: tierColor, shadowColor: tierColor }]}>
          <View style={styles.avatarHalo}>
            <Image source={{ uri: avatar }} style={styles.avatar} contentFit="contain" />
          </View>
          <Text style={styles.heroEyebrow}>{t('meal_toxicity_level')}</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.heroScore}>{meal.score}</Text>
            <Text style={styles.heroOutOf}>/10</Text>
          </View>
          <Text style={styles.heroTier}>{mealTierLabel(meal.tier)}</Text>
          <Text style={styles.heroSub}>{mealTierSubtitle(meal.tier)}</Text>
        </View>

        {/* 3. Dr. Toxi verdict — short bullets first, full breakdown behind "See more" */}
        {bullets.length > 0 || meal.verdictText ? (
          <View style={styles.verdictCard}>
            <View style={styles.verdictHeader}>
              <View style={[styles.verdictAvatarBubble, { backgroundColor: `${tierColor}1A` }]}>
                <Image source={{ uri: avatar }} style={styles.verdictAvatar} contentFit="contain" />
              </View>
              <Text style={[styles.verdictEyebrow, { color: tierColor }]}>{t('meal_verdict_eyebrow')}</Text>
            </View>

            {bullets.length > 0 ? (
              <View style={styles.bulletList}>
                {bullets.map((b, i) => (
                  <View key={`vb-${i}`} style={styles.bulletRow} testID={`meal-verdict-bullet-${i}`}>
                    <View style={[styles.bulletDot, { backgroundColor: tierColor }]} />
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.verdictText}>{meal.verdictText}</Text>
            )}

            {bullets.length > 0 && meal.verdictText ? (
              <>
                {isVerdictExpanded ? <Text style={styles.verdictTextExpanded}>{meal.verdictText}</Text> : null}
                <TouchableOpacity
                  style={styles.seeMoreBtn}
                  onPress={toggleVerdict}
                  activeOpacity={0.7}
                  testID="meal-verdict-toggle"
                >
                  <Text style={[styles.seeMoreText, { color: tierColor }]}>
                    {isVerdictExpanded ? t('meal_verdict_see_less') : t('meal_verdict_see_more')}
                  </Text>
                  {isVerdictExpanded
                    ? <ChevronUp color={tierColor} size={15} strokeWidth={2.6} />
                    : <ChevronDown color={tierColor} size={15} strokeWidth={2.6} />}
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        ) : null}

        {/* Estimated nutrition — inferred from the detected ingredients, never measured */}
        {nutrition ? (
          <>
            <Text style={styles.sectionTitle}>{t('meal_nutrition_title')}</Text>
            <View style={styles.nutritionCard}>
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionCell} testID="meal-nutrition-calories">
                  <Flame color="#E8730A" size={17} strokeWidth={2.2} />
                  <Text style={styles.nutritionValue}>{nutrition.calories}</Text>
                  <Text style={styles.nutritionUnit}>kcal</Text>
                  <Text style={styles.nutritionLabel}>{t('nutri_calories')}</Text>
                </View>
                <View style={styles.nutritionCell} testID="meal-nutrition-protein">
                  <Beef color="#C2410C" size={17} strokeWidth={2.2} />
                  <Text style={styles.nutritionValue}>{nutrition.protein}</Text>
                  <Text style={styles.nutritionUnit}>g</Text>
                  <Text style={styles.nutritionLabel}>{t('nutri_protein')}</Text>
                </View>
                <View style={styles.nutritionCell} testID="meal-nutrition-carbs">
                  <Wheat color="#B45309" size={17} strokeWidth={2.2} />
                  <Text style={styles.nutritionValue}>{nutrition.carbs}</Text>
                  <Text style={styles.nutritionUnit}>g</Text>
                  <Text style={styles.nutritionLabel}>{t('nutri_carbs')}</Text>
                </View>
                <View style={styles.nutritionCell} testID="meal-nutrition-fat">
                  <Droplet color="#0E7490" size={17} strokeWidth={2.2} />
                  <Text style={styles.nutritionValue}>{nutrition.fat}</Text>
                  <Text style={styles.nutritionUnit}>g</Text>
                  <Text style={styles.nutritionLabel}>{t('nutri_fat')}</Text>
                </View>
              </View>
              <Text style={styles.nutritionDisclaimer}>{t('meal_nutrition_disclaimer')}</Text>
            </View>
          </>
        ) : null}

        {/* Personalized alerts based on the user's health profile */}
        {profileAlerts.length > 0 ? (
          <View style={styles.profileAlertsWrap}>
            <View style={styles.profileAlertsHeader}>
              <UserCheck color={Colors.primary} size={16} />
              <Text style={styles.profileAlertsHeaderText}>
                {pick({ en: 'For your profile', fr: 'Pour ton profil', ko: '당신의 프로필을 위해' })}
              </Text>
            </View>
            {profileAlerts.map((alert) => (
              <View
                key={`profile-alert-${alert.prefId}`}
                style={[styles.profileAlertCard, alert.isAllergen === true && styles.profileAlertCardAllergen]}
                testID={`meal-profile-alert-${alert.prefId}`}
              >
                <Text style={[styles.profileAlertTitle, alert.isAllergen === true && styles.profileAlertTitleAllergen]}>
                  {alert.title}
                </Text>
                <Text style={styles.profileAlertMessage}>{alert.message}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Ingredient-by-ingredient breakdown */}
        <Text style={styles.sectionTitle}>{t('meal_ingredients_title')}</Text>
        <View style={styles.ingredientsCard}>
          {meal.ingredients.map((ing, idx) => (
            <View
              key={ing.id}
              style={[styles.ingredientRow, idx === meal.ingredients.length - 1 && styles.ingredientRowLast]}
            >
              <View style={[styles.dot, { backgroundColor: MEAL_CATEGORY_COLORS[ing.category] }]} />
              <View style={styles.ingredientText}>
                <View style={styles.ingredientNameRow}>
                  <Text style={styles.ingredientName}>{ing.name}</Text>
                  {ing.isGrave ? (
                    <View style={styles.graveTag}>
                      <AlertTriangle color="#D0260F" size={10} strokeWidth={2.4} />
                      <Text style={styles.graveTagText}>{t('meal_grave_tag')}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.ingredientCat, { color: MEAL_CATEGORY_COLORS[ing.category] }]}>
                  {mealCategoryLabel(ing.category)}
                </Text>
                {ing.note ? <Text style={styles.ingredientNote}>{ing.note}</Text> : null}
                {(() => {
                  const hazard = ingredientHazardDisplay({ nom: ing.name });
                  if (!hazard.advisoryText) return null;
                  const tone = advisoryTone(hazard.advisory);
                  return (
                    <View
                      style={[styles.advisoryPill, { backgroundColor: tone.bg, borderColor: tone.border }]}
                      testID={`meal-advisory-${ing.id}`}
                    >
                      <ShieldAlert color={tone.fg} size={12} strokeWidth={2.6} />
                      <Text style={[styles.advisoryPillText, { color: tone.fg }]}>{hazard.advisoryText}</Text>
                    </View>
                  );
                })()}
              </View>
            </View>
          ))}
        </View>

        {/* 4. Healthier alternative — only for meals that aren't great (score ≤ 6).
            A tap generates a same-spirit healthier recipe (full shopping list) plus a
            geolocated finder for where to buy the ingredients near the user. */}
        {showAlternatives ? (
          recipe ? (
            <>
              <Text style={styles.sectionTitle}>
                {pick({ en: 'A healthier version', fr: 'Une version plus saine', ko: '더 건강한 버전' })}
              </Text>
              <View style={styles.recipeCard}>
                <View style={styles.recipeHeader}>
                  <View style={styles.recipeIcon}>
                    <ChefHat color={Colors.primary} size={18} strokeWidth={2} />
                  </View>
                  <Text style={styles.recipeTitle}>{recipe.title}</Text>
                </View>
                {recipe.intro ? <Text style={styles.recipeIntro}>{recipe.intro}</Text> : null}

                {recipe.swaps.length > 0 ? (
                  <View style={styles.swapsWrap}>
                    {recipe.swaps.map((s, i) => (
                      <View key={`swap-${i}`} style={styles.swapRow}>
                        <Text style={styles.swapFrom} numberOfLines={2}>{s.from}</Text>
                        <ArrowRight color={Colors.primary} size={15} strokeWidth={2.4} />
                        <Text style={styles.swapTo} numberOfLines={2}>{s.to}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <Text style={styles.recipeSubtitle}>
                  {pick({ en: 'Shopping list', fr: 'Liste des ingrédients', ko: '재료 목록' })}
                </Text>
                <View style={styles.ingredientChipsWrap}>
                  {recipe.ingredients.map((ing, i) => (
                    <View key={`ri-${i}`} style={styles.ingredientChip}>
                      <Text style={styles.ingredientChipText}>{ing}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionTitle}>
                {pick({ en: 'Where to buy near you', fr: 'Où acheter près de toi', ko: '내 주변에서 사는 곳' })}
              </Text>
              <NearbyStores />
            </>
          ) : (
            <TouchableOpacity
              style={styles.altButton}
              onPress={handleFindAlternatives}
              activeOpacity={0.9}
              disabled={isFindingRecipe}
              testID="meal-find-alternatives"
            >
              {isFindingRecipe ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Leaf color={Colors.white} size={19} strokeWidth={2.2} />
              )}
              <Text style={styles.altButtonText}>
                {isFindingRecipe
                  ? pick({ en: 'Cooking up a healthier version…', fr: 'Je te prépare une version plus saine…', ko: '더 건강한 버전을 준비 중…' })
                  : recipeError
                    ? pick({ en: 'No luck — tap to try again', fr: 'Échec — réessayer', ko: '실패 — 다시 시도' })
                    : pick({ en: 'See a healthier alternative', fr: 'Voir une alternative plus saine', ko: '더 건강한 대안 보기' })}
              </Text>
            </TouchableOpacity>
          )
        ) : null}

        {/* Actions */}
        <TouchableOpacity style={styles.askButton} onPress={handleAskDrToxi} activeOpacity={0.9} testID="meal-ask-drtoxi">
          <MessageCircle color={Colors.white} size={20} strokeWidth={2} />
          <Text style={styles.askButtonText}>{t('ask_dr_toxi')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8} testID="meal-share">
          <Share2 color={Colors.primary} size={18} strokeWidth={2} />
          <Text style={styles.shareButtonText}>{t('meal_share_result')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.denounceButton}
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(isPro ? `/hub-denounce?scanKind=meal&refId=${encodeURIComponent(meal.id)}` : '/paywall');
          }}
          activeOpacity={0.8}
          testID="denounce-meal"
        >
          <Megaphone color="#D0260F" size={18} strokeWidth={2.2} />
          <Text style={styles.denounceButtonText}>{pick({ en: 'Share to NonToxic Hub', fr: 'Partager au NonToxic Hub', ko: 'NonToxic Hub에 공유하기' })}</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
      <MealConfetti active={showConfetti} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.2 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 15, color: Colors.textSecondary },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  hero: {
    alignItems: 'center', borderRadius: 28, paddingVertical: 26, paddingHorizontal: 22, marginTop: 6,
    shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.26, shadowRadius: 26, elevation: 9,
  },
  avatarHalo: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', marginBottom: 14,
  },
  avatar: { width: 84, height: 84 },
  heroEyebrow: { fontSize: 11.5, fontWeight: '900' as const, color: 'rgba(255,255,255,0.82)', letterSpacing: 1.4, textTransform: 'uppercase' as const },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  heroScore: { fontSize: 66, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: -2, lineHeight: 70 },
  heroOutOf: { fontSize: 24, fontWeight: '700' as const, color: 'rgba(255,255,255,0.78)', marginLeft: 2 },
  heroTier: { fontSize: 24, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: -0.4, marginTop: 4 },
  heroSub: { fontSize: 14.5, fontWeight: '600' as const, color: 'rgba(255,255,255,0.9)', marginTop: 3 },
  verdictCard: {
    backgroundColor: Colors.surface, borderRadius: 22, padding: 18, marginTop: 16,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  verdictHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  verdictAvatarBubble: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  verdictAvatar: { width: 32, height: 32 },
  verdictEyebrow: { fontSize: 12, fontWeight: '900' as const, letterSpacing: 1 },
  verdictText: { fontSize: 15.5, lineHeight: 23, color: Colors.text },
  bulletList: { gap: 11 },
  bulletRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10 },
  bulletDot: { width: 7, height: 7, borderRadius: 4, marginTop: 7.5 },
  bulletText: { flex: 1, fontSize: 15.5, lineHeight: 21, color: Colors.text, fontWeight: '600' as const, letterSpacing: -0.2 },
  verdictTextExpanded: { fontSize: 14.5, lineHeight: 22, color: Colors.textSecondary, marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderLight },
  seeMoreBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, marginTop: 12, alignSelf: 'flex-start' as const, paddingVertical: 6, paddingRight: 6 },
  seeMoreText: { fontSize: 13.5, fontWeight: '800' as const, letterSpacing: -0.2 },
  nutritionCard: {
    backgroundColor: Colors.surface, borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  nutritionGrid: { flexDirection: 'row' as const, alignItems: 'flex-start' as const },
  nutritionCell: { flex: 1, alignItems: 'center' as const, gap: 2 },
  nutritionValue: { fontSize: 21, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.6, marginTop: 4 },
  nutritionUnit: { fontSize: 11, fontWeight: '700' as const, color: Colors.textTertiary, letterSpacing: 0.2 },
  nutritionLabel: { fontSize: 12.5, fontWeight: '600' as const, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' as const },
  nutritionDisclaimer: { fontSize: 11.5, lineHeight: 16, color: Colors.textTertiary, marginTop: 14, textAlign: 'center' as const },
  sectionTitle: { fontSize: 17, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3, marginTop: 24, marginBottom: 12 },
  ingredientsCard: {
    backgroundColor: Colors.surface, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  ingredientRowLast: { borderBottomWidth: 0 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  ingredientText: { flex: 1 },
  ingredientNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ingredientName: { fontSize: 15.5, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.2 },
  graveTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(208,38,15,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  graveTagText: { fontSize: 10, fontWeight: '900' as const, color: '#D0260F', letterSpacing: 0.4 },
  ingredientCat: { fontSize: 12.5, fontWeight: '700' as const, marginTop: 2 },
  ingredientNote: { fontSize: 13.5, lineHeight: 19, color: Colors.textSecondary, marginTop: 4 },
  advisoryPill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  advisoryPillText: { fontSize: 11, lineHeight: 14, fontWeight: '800' as const, letterSpacing: -0.05 },
  altButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: 18, paddingVertical: 16, marginTop: 4,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.26, shadowRadius: 16, elevation: 6,
  },
  altButtonText: { color: Colors.white, fontSize: 16, fontWeight: '800' as const, letterSpacing: -0.2 },
  recipeCard: {
    backgroundColor: Colors.surface, borderRadius: 22, padding: 18, marginBottom: 4,
    borderWidth: 1, borderColor: 'rgba(46,158,52,0.28)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  recipeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  recipeIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46,158,52,0.12)' },
  recipeTitle: { flex: 1, fontSize: 16.5, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3 },
  recipeIntro: { fontSize: 14.5, lineHeight: 21, color: Colors.textSecondary, marginBottom: 4 },
  swapsWrap: { marginTop: 12, gap: 8, backgroundColor: 'rgba(46,158,52,0.06)', borderRadius: 14, padding: 12 },
  swapRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swapFrom: { flex: 1, textAlign: 'right' as const, fontSize: 13.5, color: Colors.textSecondary, textDecorationLine: 'line-through' as const, fontWeight: '600' as const },
  swapTo: { flex: 1, fontSize: 13.5, color: Colors.primary, fontWeight: '800' as const },
  recipeSubtitle: { fontSize: 12.5, fontWeight: '800' as const, color: Colors.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' as const, marginTop: 16, marginBottom: 10 },
  ingredientChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ingredientChip: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7, borderWidth: 1, borderColor: Colors.borderLight },
  ingredientChipText: { fontSize: 13.5, color: Colors.text, fontWeight: '600' as const },
  askButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: 18, paddingVertical: 17, marginTop: 22,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.26, shadowRadius: 16, elevation: 6,
  },
  askButtonText: { color: Colors.white, fontSize: 16.5, fontWeight: '800' as const, letterSpacing: -0.2 },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: 16, paddingVertical: 15, marginTop: 12,
    borderWidth: 1.5, borderColor: 'rgba(46,158,52,0.3)',
  },
  shareButtonText: { color: Colors.primary, fontSize: 15, fontWeight: '700' as const },
  denounceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 16, paddingVertical: 15, marginTop: 12, borderWidth: 1.5, borderColor: 'rgba(208,38,15,0.22)' },
  denounceButtonText: { color: '#D0260F', fontSize: 15, fontWeight: '700' as const },
  profileAlertsWrap: { marginTop: 18, gap: 8 },
  profileAlertsHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7, marginBottom: 2 },
  profileAlertsHeaderText: { fontSize: 13, fontWeight: '700' as const, color: Colors.primary, textTransform: 'uppercase' as const, letterSpacing: 0.4 },
  profileAlertCard: { backgroundColor: 'rgba(46, 158, 52, 0.06)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.18)', borderLeftWidth: 4, borderLeftColor: Colors.primary },
  profileAlertCardAllergen: { backgroundColor: 'rgba(214, 69, 69, 0.07)', borderColor: 'rgba(214, 69, 69, 0.22)', borderLeftColor: '#D64545' },
  profileAlertTitle: { fontSize: 13.5, fontWeight: '800' as const, color: Colors.primary, marginBottom: 3 },
  profileAlertTitleAllergen: { color: '#D64545' },
  profileAlertMessage: { fontSize: 14, lineHeight: 20, color: '#1A1A1A', fontWeight: '500' as const },
});
