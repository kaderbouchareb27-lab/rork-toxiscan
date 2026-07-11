// ═══════════════════════════════════════════════════════════════════
// MOTEUR DE VERDICT — 5 TIERS (pur, sans dépendance RN/i18n → testable isolément)
//   🟢 approved → 🟡 moderation → 🟠 processed → 🟥 ultra_toxic (bordeaux #722F37)
//   → 🔴 carcinogenic (Groupe 1 CIRC SEUL).
//
// Ordre de priorité des badges (du plus fort au plus faible) — spec produit :
//   1. CANCÉRIGÈNE   : ≥ 1 cancérigène avéré Groupe 1 CIRC — priorité MAX.
//   2. ULTRA TOXIC   : ≥ 1 ingrédient de la liste ULTRA TOXIC (RÈGLE N°1 : ≥ 2 = override
//                      total, aucun downgrade possible), OU les déclencheurs historiques
//                      (2A ≥ 1, 2B ≥ 2, 10+ orange).
//   3. PROCESSED     : ≥ 4 ingrédients orange (ultra-transformés) — seuil relevé pour ne plus
//                      déclencher « Transformé » avec seulement 2 ingrédients transformés.
//   4. MODERATION    : 1 à 3 orange, ou 3+ jaunes.
//   5. APPROVED      : sinon.
// ═══════════════════════════════════════════════════════════════════

import type { VerdictTier, RiskGroup, ProductCategory } from '@/types';
import { isUltraToxicCirc } from '@/constants/ultraToxicIngredients';

/** Shared 4-level per-ingredient risk (identical to the DB `RiskLevel` union). */
export type RiskLevel = 'danger' | 'probable' | 'possible' | 'aucun';

type IngredientBucket = 'g1' | 'ultra' | 'g2a' | 'g2b' | 'up' | 'watch' | 'safe';

interface TierCounts {
  g1: number;
  ultra: number;
  g2a: number;
  g2b: number;
  up: number;
  watch: number;
  safe: number;
}

/** Minimal normaliser to detect IARC 2A/2B inside a `classification_circ` string. */
function normalizeCirc(circ: string): string {
  return circ.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Classify one substance into its bucket. ULTRA TOXIC ingredients (stamped with the
 * dedicated circ sentinel) get their OWN bucket so they never inflate the Group 1
 * carcinogen count — a genuine Group 1 additive (e.g. sodium nitrite, circ "Groupe 1")
 * still buckets as g1 and keeps priority.
 */
export function bucketSubstance(s: { niveau_risque: RiskLevel; classification_circ?: string | null }): IngredientBucket {
  if (isUltraToxicCirc(s.classification_circ)) return 'ultra';
  if (s.niveau_risque === 'danger') return 'g1';
  const circ = normalizeCirc(s.classification_circ ?? '');
  const is2a = /\b2a\b/.test(circ);
  const is2b = /\b2b\b/.test(circ);
  if (s.niveau_risque === 'probable') {
    if (is2a) return 'g2a';
    if (is2b) return 'g2b';
    return 'up';
  }
  if (s.niveau_risque === 'possible') {
    if (is2b) return 'g2b';
    return 'watch';
  }
  return 'safe';
}

function countBuckets(substances: { niveau_risque: RiskLevel; classification_circ?: string | null }[]): TierCounts {
  const counts: TierCounts = { g1: 0, ultra: 0, g2a: 0, g2b: 0, up: 0, watch: 0, safe: 0 };
  for (const s of substances) counts[bucketSubstance(s)] += 1;
  return counts;
}

// Global « Transformé » verdict requires at least 4 processed (orange) ingredients —
// 1-3 orange now fall to MODERATION instead of tipping the whole product.
const PROCESSED_MIN_ORANGE = 4;
const ULTRA_TOXIC_MIN_ORANGE = 10;
const MODERATION_MIN_WATCH = 3;

/**
 * Computes the 5-tier verdict for a FOOD product using STRICT count-based rules,
 * following the product priority order (carcinogenic > ultra toxic > processed > …).
 */
export function computeVerdictTier(substances: { niveau_risque: RiskLevel; classification_circ?: string | null }[]): VerdictTier {
  const c = countBuckets(substances);
  // Count the badges EXACTLY as they appear on screen: every 'probable' ingredient shows
  // the orange INDUSTRIAL badge. ULTRA TOXIC ingredients are 'danger' + sentinel circ, so
  // they land in the `ultra` bucket and are NOT counted as orange (no double counting).
  const orange = substances.filter((s) => s.niveau_risque === 'probable').length;
  const yellow = substances.filter((s) => s.niveau_risque === 'possible').length;

  // Priority #1 — a confirmed IARC Group 1 carcinogen (e.g. sodium nitrite/nitrate) outranks
  // everything, INCLUDING ULTRA TOXIC.
  if (c.g1 >= 1) {
    console.log('[Tier] CARCINOGENIC — G1:', c.g1);
    return 'carcinogenic';
  }

  // Priority #2 — RULE #1: any ingredient from the ULTRA TOXIC list forces ULTRA TOXIC.
  // With ≥ 2 it is an absolute override (nothing below carcinogenic can downgrade it),
  // and a single one already matches the ingredient's own ULTRA TOXIC badge. The historical
  // triggers (IARC 2A ≥ 1, 2B ≥ 2, 10+ orange) are preserved.
  if (c.ultra >= 1 || c.g2a >= 1 || c.g2b >= 2 || orange >= ULTRA_TOXIC_MIN_ORANGE) {
    console.log('[Tier] ULTRA_TOXIC — ULTRA:', c.ultra, 'G2A:', c.g2a, 'G2B:', c.g2b, 'ORANGE:', orange);
    return 'ultra_toxic';
  }

  if (orange >= PROCESSED_MIN_ORANGE) {
    console.log('[Tier] PROCESSED — ORANGE:', orange, '(threshold', PROCESSED_MIN_ORANGE + ')');
    return 'processed';
  }
  if (orange >= 1 || yellow >= MODERATION_MIN_WATCH) {
    console.log('[Tier] MODERATION — ORANGE:', orange, 'YELLOW:', yellow, 'SAFE:', c.safe);
    return 'moderation';
  }
  console.log('[Tier] APPROVED — YELLOW:', yellow, 'SAFE:', c.safe);
  return 'approved';
}

/** Legacy 4-level badge derived from the 5-tier verdict (storage / riskGroup compat). */
export function tierToLegacyBadge(tier: VerdictTier): RiskLevel {
  switch (tier) {
    case 'ultra_toxic':
    case 'carcinogenic': return 'danger';
    case 'processed': return 'probable';
    case 'moderation': return 'possible';
    case 'approved':
    default: return 'aucun';
  }
}

/** 5-tier verdict derived from a legacy 4-level badge (cosmetic / non-food / old scans). */
export function legacyBadgeToTier(badge: RiskLevel): VerdictTier {
  switch (badge) {
    case 'danger': return 'carcinogenic';
    case 'probable': return 'processed';
    case 'possible': return 'moderation';
    case 'aucun':
    default: return 'approved';
  }
}

/** Categories that do NOT use the food tier engine (they have their own scales). */
const NON_FOOD_TIER_CATEGORIES: readonly ProductCategory[] = ['cosmetic', 'household', 'clothing', 'kitchen_utensil'];

/**
 * 5-tier verdict for a saved scan. For FOOD products with stored ingredient details,
 * the tier is ALWAYS recomputed live from the per-ingredient badges — so the global
 * verdict can never contradict the badges shown on screen, and old scans automatically
 * follow the latest rules without rescanning. Cosmetic/non-food scans keep their
 * stored tier (separate engines), and legacy scans fall back to riskGroup.
 */
export function verdictTierFromProduct(product: {
  verdictTier?: VerdictTier;
  riskGroup: RiskGroup;
  productCategory?: ProductCategory;
  detectedIngredients?: { niveau_risque: RiskLevel; classification_circ?: string | null }[];
}): VerdictTier {
  const isFoodEngine = !product.productCategory || !NON_FOOD_TIER_CATEGORIES.includes(product.productCategory);
  if (isFoodEngine && product.detectedIngredients && product.detectedIngredients.length > 0) {
    return computeVerdictTier(product.detectedIngredients);
  }
  if (product.verdictTier) return product.verdictTier;
  switch (product.riskGroup) {
    case 'group1': return 'carcinogenic';
    case 'group2a': return 'processed';
    case 'group2b': return 'moderation';
    default: return 'approved';
  }
}
