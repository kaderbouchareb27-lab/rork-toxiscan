import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { ChevronLeft, MessageCircle, Share2, ChefHat, Store, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { t } from '@/utils/i18n';
import { useMeals } from '@/providers/MealHistoryProvider';
import {
  MEAL_TIER_AVATARS,
  MEAL_TIER_COLORS,
  MEAL_CATEGORY_COLORS,
  mealCategoryLabel,
  mealTierLabel,
  mealTierSubtitle,
} from '@/constants/mealAvatars';
import type { MealTier } from '@/utils/mealAnalysis';

const TIER_TO_VERDICT: Record<MealTier, 'approuve' | 'moderation' | 'warning' | 'danger'> = {
  green: 'approuve',
  yellow: 'moderation',
  orange: 'warning',
  red: 'danger',
};

export default function MealResultScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getMeal } = useMeals();
  const meal = useMemo(() => (typeof id === 'string' ? getMeal(id) : undefined), [id, getMeal]);

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
  const showAlternatives = meal.score >= 6 && meal.alternatives;

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

        {/* 3. Decorticated Dr. Toxi verdict */}
        {meal.verdictText ? (
          <View style={styles.verdictCard}>
            <View style={styles.verdictHeader}>
              <View style={[styles.verdictAvatarBubble, { backgroundColor: `${tierColor}1A` }]}>
                <Image source={{ uri: avatar }} style={styles.verdictAvatar} contentFit="contain" />
              </View>
              <Text style={[styles.verdictEyebrow, { color: tierColor }]}>{t('meal_verdict_eyebrow')}</Text>
            </View>
            <Text style={styles.verdictText}>{meal.verdictText}</Text>
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
              </View>
            </View>
          ))}
        </View>

        {/* 4. Alternatives — only when score ≥ 6 */}
        {showAlternatives && meal.alternatives ? (
          <>
            <Text style={styles.sectionTitle}>{t('meal_alt_title')}</Text>
            {meal.alternatives.home ? (
              <View style={[styles.altCard, { borderColor: 'rgba(46,158,52,0.25)' }]}>
                <View style={styles.altHeader}>
                  <View style={[styles.altIcon, { backgroundColor: 'rgba(46,158,52,0.12)' }]}>
                    <ChefHat color={Colors.primary} size={18} strokeWidth={2} />
                  </View>
                  <Text style={styles.altLabel}>{t('meal_alt_home')}</Text>
                </View>
                <Text style={styles.altText}>{meal.alternatives.home}</Text>
              </View>
            ) : null}
            {meal.alternatives.restaurant ? (
              <View style={[styles.altCard, { borderColor: 'rgba(232,115,10,0.22)' }]}>
                <View style={styles.altHeader}>
                  <View style={[styles.altIcon, { backgroundColor: 'rgba(232,115,10,0.12)' }]}>
                    <Store color="#E8730A" size={18} strokeWidth={2} />
                  </View>
                  <Text style={styles.altLabel}>{t('meal_alt_restaurant')}</Text>
                </View>
                <Text style={styles.altText}>{meal.alternatives.restaurant}</Text>
              </View>
            ) : null}
          </>
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

        <View style={{ height: 24 }} />
      </ScrollView>
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
  altCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 16, marginBottom: 12,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  altHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  altIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  altLabel: { fontSize: 15, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.2 },
  altText: { fontSize: 14.5, lineHeight: 21, color: Colors.text },
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
});
