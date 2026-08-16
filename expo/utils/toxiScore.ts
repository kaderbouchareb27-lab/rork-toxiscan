// ═══════════════════════════════════════════════════════════════════════
// TOXISCORE /10 — note globale 100 % déterministe (aucune IA).
//
// RÈGLE : le PIRE ingrédient du produit fixe la TRANCHE de note, jamais une
// moyenne. La tranche est lue directement sur le verdict affiché (qui est
// lui-même dérivé du badge le plus sévère), donc la note et le verdict ne
// peuvent JAMAIS se contredire.
//
//   🔴 Cancérigène  → 0.0 - 1.9
//   🟥 Ultra toxique → 2.0 - 3.9
//   🟠 Transformé    → 4.0 - 5.9
//   🟡 Occasionnel   → 6.0 - 7.9
//   🟢 Approuvé      → 8.0 - 10.0
//
// À l'intérieur de la tranche, la SÉVÉRITÉ PONDÉRÉE des ingrédients donne la
// décimale exacte : deux produits « Occasionnel » — l'un avec 2 ingrédients
// discutables, l'autre avec 8 — ne reçoivent plus la même note. Chaque badge
// d'ingrédient pèse : Approuvé 0, Occasionnel 1, Transformé 2, Ultra toxique 3,
// Cancérigène 4. La sévérité cumulée, ramenée à la sévérité du pire badge,
// positionne la note entre le bas et le haut de la tranche (1 décimale).
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
  danger: { min: 0, max: 1.9 },
  ultratoxic: { min: 2, max: 3.9 },
  warning: { min: 4, max: 5.9 },
  moderation: { min: 6, max: 7.9 },
  approuve: { min: 8, max: 10 },
};

/** Severity of each ingredient badge (higher = worse). */
const SEVERITY: Readonly<Record<ToxiIngredientLevel, number>> = {
  danger: 4,
  ultratoxic: 3,
  probable: 2,
  possible: 1,
  aucun: 0,
};

/** Severity of the "worst" badge that fixes the band (danger=4 … approuve=0). */
const LEVEL_SEVERITY: Readonly<Record<ToxiScoreLevel, number>> = {
  danger: 4,
  ultratoxic: 3,
  warning: 2,
  moderation: 1,
  approuve: 0,
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

/** Rounds to 1 decimal — the granularity displayed by the ToxiScore. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
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
  if (total === 0) return round1(band.min + (band.max - band.min) / 2);

  // `approuve` has a nominal severity of 0, but can still carry a couple of
  // "possible" (Occasional) ingredients that should nudge the note below 10.
  const worstSeverity = Math.max(1, LEVEL_SEVERITY[level]);

  let severitySum = 0;
  for (const ing of ingredients) {
    severitySum += SEVERITY[ingredientLevel(ing)];
  }

  // badness ∈ [0, 1] : 0 = all clean, 1 = every ingredient at the worst level.
  // Each ingredient is normalised against the band's worst severity, so a
  // "possible" (1) counts half as much as a "probable" (2), etc.
  const badness = Math.min(1, severitySum / (total * worstSeverity));
  const purity = 1 - badness;

  return round1(band.min + (band.max - band.min) * purity);
}
