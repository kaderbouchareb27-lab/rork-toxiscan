// ═══════════════════════════════════════════════════════════════════════
// COMPARAISON DE PRODUITS — logique pure (aucun import RN).
//
// On compare deux produits déjà analysés (mêmes données que l'écran résultat :
// badge, ToxiScore, liste d'ingrédients). La note et le gagnant sont 100 %
// déterministes (computeToxiScore + règle d'égalité) ; le verdict (gagnant, scores
// et noms de produits) est lui aussi 100 % déterministe — jamais généré par l'IA.
//
// Rappel sémantique (utils/toxiScore.ts) : le ToxiScore affiché est en fait un
// score SANTÉ — plus haut = mieux. Vert 8-10, jaune 6-7, orange 4-5, rouge 0-3.
// Le gagnant est donc celui qui a la note LA PLUS HAUTE.
// ═══════════════════════════════════════════════════════════════════════

import type { ScannedProduct, DetectedIngredient, SubstanceDetected } from '@/types';
import { verdictTierFromProduct } from '@/utils/api';
import { computeToxiScore, ingredientLevel } from '@/utils/toxiScore';
import type { ToxiScoreLevel, ToxiIngredientLevel } from '@/utils/toxiScore';
import { pick } from '@/utils/i18n';

/** Verdict affiché sur la carte (même union que DrToxiVerdict). */
export type CompareVerdictLevel = 'danger' | 'ultratoxic' | 'warning' | 'moderation' | 'approuve';

/** Badge d'un ingrédient (même union que le produit). */
export type CompareIngredientLevel = ToxiIngredientLevel;

type IngredientLike = DetectedIngredient | SubstanceDetected;

/** Verdict d'un produit dérivé de son tier déterministe (api.ts). */
export function verdictLevelFromProduct(p: ScannedProduct): CompareVerdictLevel {
  switch (verdictTierFromProduct(p)) {
    case 'ultra_toxic': return 'ultratoxic';
    case 'carcinogenic': return 'danger';
    case 'processed': return 'warning';
    case 'moderation': return 'moderation';
    case 'approved':
    default: return 'approuve';
  }
}

/** Ingédients d'un produit, dans l'ordre préféré par l'écran résultat. */
function productIngredients(p: ScannedProduct): IngredientLike[] {
  return p.detectedIngredients && p.detectedIngredients.length > 0
    ? p.detectedIngredients
    : p.substances ?? [];
}

/** 0 = le pire, 4 = vert. Sert à trier les ingrédients « du plus grave au moins grave ». */
function severityRank(level: CompareIngredientLevel): number {
  switch (level) {
    case 'danger': return 0;
    case 'ultratoxic': return 1;
    case 'probable': return 2;
    case 'possible': return 3;
    default: return 4;
  }
}

/** « Rouge/orange » = cancérigène, ultra toxique ou transformé. */
function isRedOrange(level: CompareIngredientLevel): boolean {
  return level === 'danger' || level === 'ultratoxic' || level === 'probable';
}

/** Normalisation souple pour comparer deux noms d'ingrédients. */
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\uac00-\ud7af]+/g, ' ')
    .trim();
}

/** Clés d'équivalence d'un ingrédient : son nom normalisé + son code (E-numéro). */
function ingredientKeys(ing: IngredientLike): string[] {
  const keys: string[] = [];
  const name = normalizeIngredientName(ing.nom);
  if (name) keys.push('name:' + name);
  const code = (ing.code ?? '').trim().toLowerCase();
  if (code) keys.push('code:' + code);
  return keys;
}

export interface ComparisonSide {
  product: ScannedProduct;
  verdictLevel: CompareVerdictLevel;
  toxiScore: number;
  ingredients: IngredientLike[];
  isCosmetic: boolean;
  redOrangeCount: number;
}

export interface CompareDifference {
  name: string;
  level: CompareIngredientLevel;
  /** 'A' = ingrédient présent uniquement dans le produit A, 'B' = uniquement dans B. */
  side: 'A' | 'B';
}

export interface ComparisonResult {
  sideA: ComparisonSide;
  sideB: ComparisonSide;
  scoreA: number;
  scoreB: number;
  delta: number;
  winner: 'A' | 'B' | 'tie';
  redOrangeA: number;
  redOrangeB: number;
  differences: CompareDifference[];
}

function buildSide(p: ScannedProduct): ComparisonSide {
  const ingredients = productIngredients(p);
  const verdictLevel = verdictLevelFromProduct(p);
  const redOrangeCount = ingredients.filter((i) => isRedOrange(ingredientLevel(i))).length;
  return {
    product: p,
    verdictLevel,
    toxiScore: computeToxiScore(verdictLevel as ToxiScoreLevel, ingredients),
    ingredients,
    isCosmetic: p.productCategory === 'cosmetic',
    redOrangeCount,
  };
}

/**
 * Calcule la comparaison déterministe entre deux produits.
 * Le gagnant suit la règle du spec : note la plus haute ; si les notes sont
 * égales et qu'aucun ingrédient Ultra toxic/Processed ne diffère, égalité ;
 * sinon départage par le nombre de badges rouges/oranges (le moins = meilleur).
 */
export function computeComparison(a: ScannedProduct, b: ScannedProduct): ComparisonResult {
  const sideA = buildSide(a);
  const sideB = buildSide(b);

  // Clés d'équivalence de B (nom normalisé + codes E) pour exclure les identiques/équivalents.
  const bKeys = new Set<string>();
  for (const ing of sideB.ingredients) {
    for (const key of ingredientKeys(ing)) bKeys.add(key);
  }
  const aKeys = new Set<string>();
  for (const ing of sideA.ingredients) {
    for (const key of ingredientKeys(ing)) aKeys.add(key);
  }

  const differences: CompareDifference[] = [];

  // Uniquement dans A : pas présent (ni équivalent) dans B, badge non-vert.
  for (const ing of sideA.ingredients) {
    const level = ingredientLevel(ing);
    if (level === 'aucun') continue;
    const shared = ingredientKeys(ing).some((k) => bKeys.has(k));
    if (!shared) differences.push({ name: ing.nom, level, side: 'A' });
  }
  // Uniquement dans B : pas présent (ni équivalent) dans A, badge non-vert.
  for (const ing of sideB.ingredients) {
    const level = ingredientLevel(ing);
    if (level === 'aucun') continue;
    const shared = ingredientKeys(ing).some((k) => aKeys.has(k));
    if (!shared) differences.push({ name: ing.nom, level, side: 'B' });
  }

  differences.sort((x, y) => severityRank(x.level) - severityRank(y.level));

  const scoreA = sideA.toxiScore;
  const scoreB = sideB.toxiScore;
  const delta = Math.abs(scoreA - scoreB);

  // Un ingrédient « sévère » qui diffère (danger / ultratoxic / probable) casse l'égalité.
  const severeDiff = differences.some((d) => d.level === 'danger' || d.level === 'ultratoxic' || d.level === 'probable');

  let winner: 'A' | 'B' | 'tie';
  if (scoreA === scoreB) {
    winner = severeDiff ? (sideA.redOrangeCount <= sideB.redOrangeCount ? 'A' : 'B') : 'tie';
  } else {
    winner = scoreA > scoreB ? 'A' : 'B';
  }

  return {
    sideA,
    sideB,
    scoreA,
    scoreB,
    delta,
    winner,
    redOrangeA: sideA.redOrangeCount,
    redOrangeB: sideB.redOrangeCount,
    differences,
  };
}

export interface ComparisonVerdict {
  winner: 'A' | 'B' | 'tie';
  verdict: string;
}

/**
 * Verdict déterministe (repli immédiat et sûr). Nomme le gagnant puis cite une
 * différence concrète quand elle existe. Jamais de jargon.
 */
export function deterministicVerdict(
  a: ScannedProduct,
  b: ScannedProduct,
  comparison: ComparisonResult,
): ComparisonVerdict {
  const { winner, scoreA, scoreB, differences } = comparison;

  if (winner === 'tie') {
    return {
      winner: 'tie',
      verdict: pick({
        en: 'No real difference between these two — either choice is fine.',
        fr: 'Pas de vraie différence entre les deux — choisis librement.',
        ko: '두 제품 간 실질적인 차이가 없어요 — 자유롭게 선택하세요.',
      }),
    };
  }

  const winnerName = winner === 'A' ? a.name : b.name;
  const loserName = winner === 'A' ? b.name : a.name;
  const winScore = winner === 'A' ? scoreA : scoreB;
  const loseScore = winner === 'A' ? scoreB : scoreA;
  const top = differences[0]?.name;

  return {
    winner,
    verdict: pick({
      en: top
        ? `"${winnerName}" wins (${winScore}/10 vs ${loseScore}/10) — it avoids ${top}, which is in "${loserName}".`
        : `"${winnerName}" wins (${winScore}/10 vs ${loseScore}/10).`,
      fr: top
        ? `« ${winnerName} » gagne (${winScore}/10 contre ${loseScore}/10) — il évite « ${top} », présent dans « ${loserName} ».`
        : `« ${winnerName} » gagne (${winScore}/10 contre ${loseScore}/10).`,
      ko: top
        ? `"${winnerName}"이 더 좋아요 (${winScore}/10 vs ${loseScore}/10) — "${loserName}"에 있는 ${top}이(가) 없거든요.`
        : `"${winnerName}"이 더 좋아요 (${winScore}/10 vs ${loseScore}/10).`,
    }),
  };
}
