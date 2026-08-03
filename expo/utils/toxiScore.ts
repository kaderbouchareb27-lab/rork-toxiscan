// ═══════════════════════════════════════════════════════════════════════
// TOXISCORE /10 — note globale 100 % déterministe (aucune IA).
//
// RÈGLE : le PIRE ingrédient du produit fixe la TRANCHE de note, jamais une
// moyenne. La tranche est lue directement sur le verdict affiché (qui est
// lui-même dérivé du badge le plus sévère), donc la note et le verdict ne
// peuvent JAMAIS se contredire.
//
//   🔴 Cancérigène  → 0-1
//   🟥 Ultra toxique → 2-3
//   🟠 Transformé    → 4-5
//   🟡 Occasionnel   → 6-7
//   🟢 Approuvé      → 8-10
//
// À l'intérieur de la tranche, la PROPORTION d'ingrédients « propres »
// (Approuvé + Occasionnel) sur le total donne le chiffre exact : beaucoup de
// propres → haut de la tranche, beaucoup de problématiques → bas de la tranche.
//
// La note /10 existe UNIQUEMENT au niveau du PRODUIT (carte de verdict en haut).
// Les ingrédients de la liste n'affichent que leur badge de couleur, sans chiffre.
//
// Module volontairement pur (aucun import RN/i18n) → testable isolément.
// ═══════════════════════════════════════════════════════════════════════

import { isUltraToxicCirc } from '@/constants/ultraToxicIngredients';

/** Verdict shown on the result card (same union as DrToxiVerdict). */
export type ToxiScoreLevel = 'danger' | 'ultratoxic' | 'warning' | 'moderation' | 'approuve';

/** Per-ingredient badge level (same union as the product screen's DisplayLevel). */
export type ToxiIngredientLevel = 'danger' | 'ultratoxic' | 'probable' | 'possible' | 'aucun';

interface ScoreBand {
  readonly min: number;
  readonly max: number;
}

/** Score band per verdict level — the worst ingredient decides which band applies. */
const SCORE_BANDS: Readonly<Record<ToxiScoreLevel, ScoreBand>> = {
  danger: { min: 0, max: 1 },
  ultratoxic: { min: 2, max: 3 },
  warning: { min: 4, max: 5 },
  moderation: { min: 6, max: 7 },
  approuve: { min: 8, max: 10 },
};

/** Minimal shape needed to score an ingredient (works for both stored ingredient types). */
export interface ScorableIngredient {
  readonly niveau_risque?: string | null;
  readonly classification_circ?: string | null;
}

/**
 * Badge level of a single ingredient. Identical logic to the product screen's
 * `getDisplayLevel`: the ULTRA TOXIC sentinel wins over the raw risk level.
 */
export function ingredientLevel(ing: ScorableIngredient): ToxiIngredientLevel {
  if (isUltraToxicCirc(ing.classification_circ)) return 'ultratoxic';
  switch (ing.niveau_risque) {
    case 'danger': return 'danger';
    case 'probable': return 'probable';
    case 'possible': return 'possible';
    default: return 'aucun';
  }
}

/** An ingredient counts as "clean" when it is Approved (green) or Occasional (yellow). */
function isCleanLevel(level: ToxiIngredientLevel): boolean {
  return level === 'aucun' || level === 'possible';
}

/** Places a 0→1 clean ratio inside a band (0 = bottom of the band, 1 = top). */
function scoreInBand(band: ScoreBand, cleanRatio: number): number {
  const clamped = Math.min(1, Math.max(0, cleanRatio));
  return band.min + Math.round(clamped * (band.max - band.min));
}

/**
 * ToxiScore /10 of a whole product.
 *
 * @param level      Verdict shown on the card (band selector — always in sync with the badge).
 * @param ingredients Every detected ingredient, used only to position the score inside the band.
 */
export function computeToxiScore(level: ToxiScoreLevel, ingredients: readonly ScorableIngredient[]): number {
  const band = SCORE_BANDS[level];
  const total = ingredients.length;
  if (total === 0) return scoreInBand(band, 0.5);
  const cleanCount = ingredients.filter((ing) => isCleanLevel(ingredientLevel(ing))).length;
  return scoreInBand(band, cleanCount / total);
}
