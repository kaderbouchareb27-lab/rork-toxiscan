import { DR_TOXI_BADGE_AVATARS } from '@/constants/drToxiAvatars';
import { t, pick } from '@/utils/i18n';
import { scoreToTier, type MealCategory, type MealTier } from '@/utils/mealAnalysis';

/**
 * The 4 reactive Dr. Toxi avatars for the meal score (spec §6). Same broccoli
 * character, 4 emotions — reused from the verdict badge avatars so the meal mode
 * stays visually consistent with the product scanner:
 *   green  → proud / approving   (approuve)
 *   yellow → neutral / mixed      (moderation)
 *   orange → worried / serious    (warning)
 *   red    → alarmed              (danger)
 */
export const MEAL_TIER_AVATARS: Record<MealTier, string> = {
  green: DR_TOXI_BADGE_AVATARS.approuve,
  yellow: DR_TOXI_BADGE_AVATARS.moderation,
  orange: DR_TOXI_BADGE_AVATARS.warning,
  red: DR_TOXI_BADGE_AVATARS.danger,
};

/** Tier accent colors (spec §5). Tasteful, brand-aligned. */
export const MEAL_TIER_COLORS: Record<MealTier, string> = {
  green: '#2E9E34',
  yellow: '#EAB308',
  orange: '#E8730A',
  red: '#D0260F',
};

/** Soft tinted backgrounds for tier cards / rings. */
export const MEAL_TIER_SOFT: Record<MealTier, string> = {
  green: 'rgba(46,158,52,0.12)',
  yellow: 'rgba(234,179,8,0.14)',
  orange: 'rgba(232,115,10,0.13)',
  red: 'rgba(208,38,15,0.12)',
};

/** Per-ingredient dot colors used in the decorticated verdict list. */
export const MEAL_CATEGORY_COLORS: Record<MealCategory, string> = {
  carcinogen_g1: '#D0260F',
  carcinogen_2a: '#D0260F',
  carcinogen_2b: '#D0260F',
  processed: '#E8730A',
  refined_oil: '#E8730A',
  added_sugar: '#E8730A',
  refined_flour: '#E8730A',
  excess_salt: '#EAB308',
  additive: '#EAB308',
  healthy: '#2E9E34',
  neutral: '#9AA39E',
};

/** Localized label for an ingredient category. */
export function mealCategoryLabel(c: MealCategory): string {
  switch (c) {
    case 'carcinogen_g1':
    case 'carcinogen_2a':
    case 'carcinogen_2b':
      return t('mcat_carcinogen');
    case 'processed':
      return t('mcat_processed');
    case 'added_sugar':
      return t('mcat_added_sugar');
    case 'refined_oil':
      return t('mcat_refined_oil');
    case 'refined_flour':
      return t('mcat_refined_flour');
    case 'excess_salt':
      return t('mcat_excess_salt');
    case 'additive':
      return t('mcat_additive');
    case 'healthy':
      return t('mcat_healthy');
    case 'neutral':
      return t('mcat_neutral');
  }
}

/** Localized tier name + subtitle (spec §5). */
export function mealTierLabel(tier: MealTier): string {
  return t(`tier_${tier}` as 'tier_green');
}
export function mealTierSubtitle(tier: MealTier): string {
  return t(`tier_${tier}_sub` as 'tier_green_sub');
}

/**
 * Caption for a numeric meal SCORE (0–10, higher = healthier). English uses a
 * 5-band scale that better reflects the scale (Excellent/Good/Decent/Poor/Very
 * toxic); French and Korean keep the existing 4-tier wording unchanged.
 */
export function mealScoreLabel(score: number): string {
  const en =
    score >= 9 ? 'Excellent'
    : score >= 7 ? 'Good'
    : score >= 5 ? 'Decent'
    : score >= 3 ? 'Poor'
    : 'Very toxic';
  const fallback = mealTierLabel(scoreToTier(score));
  return pick({ en, fr: fallback, ko: fallback });
}
