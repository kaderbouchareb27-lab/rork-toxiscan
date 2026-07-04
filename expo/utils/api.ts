import { ScannedProduct, DetectedIngredient, UniversalAnalysisResult, ProductCategory, SubstanceDetected, RiskGroup, AdditiveInfo, AdditiveCategory, VerdictTier } from '@/types';
import { niveauRisqueToGroup } from '@/constants/additives';
import { z } from 'zod';
import { aiGenerateObject } from '@/utils/aiApi';
import { getAnalysisRegionPrompt } from '@/utils/regionDetection';
import { getHealthProfileAnalysisPrompt } from '@/utils/healthProfile';
import { t, isEnglish, isKorean, getDeviceLanguage, pick } from '@/utils/i18n';
import { INGREDIENTS_DATABASE, IngredientEntry, RiskLevel, DANGER_PREGNANCY, getLocalizedNote, localizedCirc } from '@/constants/ingredientsDatabase';
import { runGoogleVisionOcr, extractIngredientsBlock } from '@/utils/googleVisionOcr';
import {
  classifyCosmeticIngredient,
  getCosmeticNote,
  computeCosmeticVerdict,
  looksLikeCosmetic,
  CosmeticTier,
  CosmeticVerdictCounts,
} from '@/constants/cosmeticsDatabase';

// ═══════════════════════════════════════════════════════════════════════
// LOOKUP DÉTERMINISTE — l'IA NE CLASSE PAS, ELLE CHERCHE DANS LA BASE
// ═══════════════════════════════════════════════════════════════════════

function normalizeForLookup(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Keep ASCII alphanumerics AND Korean Hangul (syllables + conjoining/compatibility
    // jamo). NFD decomposes Hangul into jamo, but keyword and OCR input are normalized
    // identically, so decomposed forms still match each other consistently.
    .replace(/[^a-z0-9\s\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────
// INDEX DES MOTS-CLÉS — construit une seule fois au boot.
// Map de "keyword normalisé" → entry, plus une liste triée par longueur
// décroissante pour scanner rapidement les correspondances partielles.
// ─────────────────────────────────────────────────────────────────────

interface IndexedKeyword {
  readonly key: string;
  readonly entry: IngredientEntry;
}

const EXACT_KEYWORD_INDEX: Map<string, IngredientEntry> = (() => {
  const map = new Map<string, IngredientEntry>();
  const RISK_PRIORITY: Record<RiskLevel, number> = { danger: 0, probable: 1, possible: 2, aucun: 3 };
  for (const entry of INGREDIENTS_DATABASE) {
    for (const keyword of entry.keywords) {
      const norm = normalizeForLookup(keyword);
      if (!norm) continue;
      const existing = map.get(norm);
      if (!existing || RISK_PRIORITY[entry.risk] < RISK_PRIORITY[existing.risk]) {
        map.set(norm, entry);
      }
    }
  }
  return map;
})();

const SORTED_KEYWORDS: readonly IndexedKeyword[] = (() => {
  const list: IndexedKeyword[] = [];
  const seen = new Set<string>();
  for (const entry of INGREDIENTS_DATABASE) {
    for (const keyword of entry.keywords) {
      const norm = normalizeForLookup(keyword);
      if (!norm || norm.length < 3) continue;
      const dedupKey = `${norm}::${entry.risk}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      list.push({ key: norm, entry });
    }
  }
  // Tri par longueur décroissante pour que le mot-clé le plus spécifique
  // (ex. "sucre de canne") soit testé avant le plus générique ("sucre").
  list.sort((a, b) => b.key.length - a.key.length);
  return list;
})();

function lookupIngredient(ingredientName: string): IngredientEntry | null {
  const normalized = normalizeForLookup(ingredientName);
  if (!normalized) return null;

  // 1) Match exact — O(1) via Map
  const exact = EXACT_KEYWORD_INDEX.get(normalized);
  if (exact) return exact;

  // 2) Recherche par contenance : PRIORITÉ AU MOT-CLÉ LE PLUS LONG (le plus spécifique),
  //    puis au risque le plus élevé en cas d'égalité de longueur.
  //    Évite que "sucre de canne" soit classé via "sucre" (probable) au lieu de
  //    "sucre de canne" (possible), et que "lait de soja" soit classé via "soja"
  //    au lieu de "lait de soja".
  const RISK_PRIORITY: Record<RiskLevel, number> = { danger: 0, probable: 1, possible: 2, aucun: 3 };
  let bestMatch: IngredientEntry | null = null;
  let bestMatchLength = 0;
  let bestRiskPriority = 999;
  for (const { key, entry } of SORTED_KEYWORDS) {
    // Comme la liste est triée par longueur décroissante, dès qu'on a un match
    // et que les keywords suivants sont plus courts, ils ne peuvent plus battre.
    if (bestMatch && key.length < bestMatchLength) break;
    if (normalized.includes(key)) {
      const entryPriority = RISK_PRIORITY[entry.risk];
      if (
        key.length > bestMatchLength ||
        (key.length === bestMatchLength && entryPriority < bestRiskPriority)
      ) {
        bestMatch = entry;
        bestMatchLength = key.length;
        bestRiskPriority = entryPriority;
      }
    }
  }
  return bestMatch;
}

// Allergen declarations ("Contains: …", "May contain: …", "Peut contenir : …") are regulatory
// statements, NOT ingredients. They must never be parsed or badged.
const ALLERGEN_LINE_REGEX = /^(contains|contient|may contain|peut contenir)\s*:/i;

/**
 * Cross-references a single ingredient name against the shared food ingredient database.
 * Used by the meal-scan engine so a detected meal ingredient (e.g. "huile végétale") inherits
 * the exact same classification as the product scanner — keeping both modes consistent.
 * Returns the matched risk level + IARC/CIRC label, or null when the ingredient is unknown.
 */
export function classifyFoodIngredient(name: string): { risk: RiskLevel; circ: string } | null {
  const entry = lookupIngredient(name);
  if (!entry) return null;
  return { risk: entry.risk, circ: entry.circ };
}

// A compound ingredient like "Sugars (sugar, dextrose)" that lists refined sugar or dextrose
// among its sub-ingredients must always classify as ULTRA-PROCESSED (orange), never CAUTION.
const REFINED_SUGAR_TOKENS = ['sugars', 'sugar', 'sucres', 'sucre', 'dextrose'] as const;
const REFINED_SUGAR_ENTRY: IngredientEntry | null = lookupIngredient('sugars');

function isCompoundRefinedSugar(name: string): boolean {
  // Compound = lists sub-ingredients via a parenthesis or comma (e.g. "Sugars (sugar, dextrose)").
  if (!/[(),]/.test(name)) return false;
  const normalized = normalizeForLookup(name);
  if (!normalized) return false;
  return REFINED_SUGAR_TOKENS.some((t) => normalized.includes(t));
}

function computeBadgeGlobal(substances: { niveau_risque: RiskLevel }[]): RiskLevel {
  const dangerCount = substances.filter(s => s.niveau_risque === 'danger').length;
  const probableCount = substances.filter(s => s.niveau_risque === 'probable').length;
  const possibleCount = substances.filter(s => s.niveau_risque === 'possible').length;
  const aucunCount = substances.filter(s => s.niveau_risque === 'aucun').length;
  const total = substances.length;

  if (dangerCount >= 1) {
    console.log('[Badge] DANGER:', dangerCount, 'rouge(s)');
    return 'danger';
  }

  if (probableCount >= 4) {
    console.log('[Badge] PROBABLE: 4+ orange (' + probableCount + ')');
    return 'probable';
  }

  if (possibleCount >= 7) {
    console.log('[Badge] PROBABLE: 7+ jaune (' + possibleCount + ')');
    return 'probable';
  }

  if (probableCount >= 1 && probableCount <= 3) {
    const greenRatio = total > 0 ? aucunCount / total : 0;
    if (greenRatio >= 0.7) {
      console.log('[Badge] POSSIBLE: ' + probableCount + ' orange isolé(s) parmi ' + Math.round(greenRatio * 100) + '% vert → rétrogradé');
      return 'possible';
    }
    console.log('[Badge] PROBABLE: ' + probableCount + ' orange');
    return 'probable';
  }

  if (possibleCount >= 2) {
    console.log('[Badge] POSSIBLE: ' + possibleCount + ' jaune(s)');
    return 'possible';
  }

  console.log('[Badge] AUCUN: ' + aucunCount + ' vert');
  return 'aucun';
}

// ═══════════════════════════════════════════════════════════════════
// MOTEUR 6 TIERS — hiérarchie validée (du moins au plus grave) :
//   🟢 approved → 🟡 moderation → 🟠 processed (renommé, neutre) →
//   🟧 toxic (vermillon #E0480B) → 🔴 carcinogenic (Groupe 1 SEUL) →
//   🟥 ultra_toxic (bordeaux #722F37 — cancérigène G1/G2A + accumulation UP ≥ 6).
// Chaque ingrédient est d'abord classé dans un des 5 seaux : G1 / G2A / G2B /
// UP (marqueur ultra-transformé sans base cancérigène) / WATCH (jaune) / SAFE.
// Le rouge vif reste EXCLUSIVEMENT réservé au Groupe 1 confirmé.
// ═══════════════════════════════════════════════════════════════════

type IngredientBucket = 'g1' | 'g2a' | 'g2b' | 'up' | 'watch' | 'safe';

interface TierCounts {
  g1: number;
  g2a: number;
  g2b: number;
  up: number;
  watch: number;
  safe: number;
}

/** Classify one substance into its 6-tier bucket from risk level + IARC label. */
function bucketSubstance(s: { niveau_risque: RiskLevel; classification_circ?: string | null }): IngredientBucket {
  if (s.niveau_risque === 'danger') return 'g1';
  const circ = normalizeForLookup(s.classification_circ ?? '');
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
  const counts: TierCounts = { g1: 0, g2a: 0, g2b: 0, up: 0, watch: 0, safe: 0 };
  for (const s of substances) counts[bucketSubstance(s)] += 1;
  return counts;
}

/**
 * Computes the 6-tier verdict for a FOOD product using a balanced point system.
 * - SAFE  = -1 point (green ingredients compensate for problematic ones)
 * - WATCH = +1 point
 * - UP    = +3 points (1 orange ingredient counts like 3 yellow ones)
 * Final score = UP*3 + WATCH*1 - SAFE*1.
 *
 * Thresholds:
 * - ULTRA TOXIC 🟥 : (G1 ≥ 1 OU G2A ≥ 1) ET UP ≥ 6 — worst-of-both-worlds.
 * - CARCINOGENIC 🔴 : G1 ≥ 1 (confirmed Group 1 only).
 * - TOXIC 🟧       : G2A ≥ 1 OU G2B ≥ 1 OU score ≥ 7.
 * - PROCESSED 🟠   : score 4–6.
 * - MODERATION 🟡  : score 1–3.
 * - APPROVED 🟢    : score ≤ 0.
 *
 * This keeps simple products honest: 1 orange + 1 yellow + 2 greens = 2 points → Moderation,
 * 3 yellows = 3 points → Moderation, 4 yellows = 4 points → Processed.
 */
export function computeVerdictTier(substances: { niveau_risque: RiskLevel; classification_circ?: string | null }[]): VerdictTier {
  const c = countBuckets(substances);

  if ((c.g1 >= 1 || c.g2a >= 1) && c.up >= 6) {
    console.log('[Tier] ULTRA_TOXIC — G1:', c.g1, 'G2A:', c.g2a, 'UP:', c.up);
    return 'ultra_toxic';
  }
  if (c.g1 >= 1) {
    console.log('[Tier] CARCINOGENIC — G1:', c.g1);
    return 'carcinogenic';
  }
  if (c.g2a >= 1 || c.g2b >= 1) {
    console.log('[Tier] TOXIC — G2A:', c.g2a, 'G2B:', c.g2b);
    return 'toxic';
  }

  const score = c.up * 3 + c.watch * 1 - c.safe * 1;

  if (score >= 7) {
    console.log('[Tier] TOXIC — score:', score, 'UP:', c.up, 'WATCH:', c.watch, 'SAFE:', c.safe);
    return 'toxic';
  }
  if (score >= 4) {
    console.log('[Tier] PROCESSED — score:', score, 'UP:', c.up, 'WATCH:', c.watch, 'SAFE:', c.safe);
    return 'processed';
  }
  if (score >= 1) {
    console.log('[Tier] MODERATION — score:', score, 'UP:', c.up, 'WATCH:', c.watch, 'SAFE:', c.safe);
    return 'moderation';
  }
  console.log('[Tier] APPROVED — score:', score, 'SAFE:', c.safe);
  return 'approved';
}

/** Legacy 4-level badge derived from the 6-tier verdict (storage / riskGroup compat). */
function tierToLegacyBadge(tier: VerdictTier): RiskLevel {
  switch (tier) {
    case 'ultra_toxic':
    case 'carcinogenic': return 'danger';
    case 'toxic':
    case 'processed': return 'probable';
    case 'moderation': return 'possible';
    case 'approved':
    default: return 'aucun';
  }
}

/** 6-tier verdict derived from a legacy 4-level badge (cosmetic / non-food / old scans). */
export function legacyBadgeToTier(badge: RiskLevel): VerdictTier {
  switch (badge) {
    case 'danger': return 'carcinogenic';
    case 'probable': return 'processed';
    case 'possible': return 'moderation';
    case 'aucun':
    default: return 'approved';
  }
}

/** 6-tier verdict for a saved scan — uses the stored tier, falls back to riskGroup for old scans. */
export function verdictTierFromProduct(product: { verdictTier?: VerdictTier; riskGroup: RiskGroup }): VerdictTier {
  if (product.verdictTier) return product.verdictTier;
  switch (product.riskGroup) {
    case 'group1': return 'carcinogenic';
    case 'group2a': return 'processed';
    case 'group2b': return 'moderation';
    default: return 'approved';
  }
}

// ═══════════════════════════════════════════════════════════════════════
// COSMÉTIQUE — moteur d'analyse SÉPARÉ (🟣 TOXIC / 🟡 DISPUTED / 🟢 APPROVED)
// La détection (looksLikeCosmetic) route un produit cosmétique vers ce moteur
// au lieu du moteur alimentaire. Les tiers sont mappés sur le RiskLevel partagé
// (toxic→danger, disputed→possible, approved→aucun) pour réutiliser le stockage,
// l'historique et les badges, mais le VERDICT GLOBAL suit la règle cosmétique.
// ═══════════════════════════════════════════════════════════════════════

/** Map a cosmetic tier onto the shared RiskLevel used for storage/UI. */
function cosmeticTierToRisk(tier: CosmeticTier): RiskLevel {
  return tier === 'toxic' ? 'danger' : tier === 'disputed' ? 'possible' : 'aucun';
}

/** Localized classification label shown for a cosmetic ingredient. */
function cosmeticCircLabel(tier: CosmeticTier): string {
  if (tier === 'toxic') return pick({ en: 'Recognized hazardous', fr: 'Dangereux reconnu', ko: '유해 확인됨' });
  if (tier === 'disputed') return pick({ en: 'Controversial — divided science', fr: 'Controversé — science partagée', ko: '논란 — 과학적 의견 갈림' });
  return pick({ en: 'No known risk', fr: 'Sans risque connu', ko: '알려진 위험 없음' });
}

/** Build a SubstanceDetected for one cosmetic INCI ingredient (deterministic, no AI). */
function buildCosmeticSubstance(name: string): SubstanceDetected {
  const entry = classifyCosmeticIngredient(name);
  if (entry) {
    return {
      nom: name,
      code: null,
      classification_circ: cosmeticCircLabel(entry.tier),
      niveau_risque: cosmeticTierToRisk(entry.tier),
      explication: getCosmeticNote(entry),
      source_exposition: null,
      descriptionPending: false,
    };
  }
  // Unknown INCI → no known risk in our database (treated as APPROVED / neutral).
  return {
    nom: name,
    code: null,
    classification_circ: pick({ en: 'No known risk', fr: 'Sans risque connu', ko: '알려진 위험 없음' }),
    niveau_risque: 'aucun',
    explication: pick({
      en: `${name} is a functional cosmetic ingredient with no known risk in our database.`,
      fr: `${name} est un ingrédient cosmétique fonctionnel, sans risque connu dans notre base.`,
      ko: `${name}은(는) 데이터베이스에서 알려진 위험이 없는 기능성 화장품 성분입니다.`,
    }),
    source_exposition: null,
    descriptionPending: false,
  };
}

/** Classify a list of INCI ingredient names through the cosmetic engine. */
function classifyCosmeticNames(names: string[]): SubstanceDetected[] {
  return names
    .map((raw) => raw.trim())
    .filter((name) => name.length >= 2 && !ALLERGEN_LINE_REGEX.test(name))
    .map(buildCosmeticSubstance);
}

/** Global cosmetic badge derived from the per-ingredient tiers (≥1 TOXIC, ≥N DISPUTED…). */
function computeCosmeticBadgeGlobal(substances: { niveau_risque: RiskLevel }[]): RiskLevel {
  const counts: CosmeticVerdictCounts = {
    toxic: substances.filter((s) => s.niveau_risque === 'danger').length,
    disputed: substances.filter((s) => s.niveau_risque === 'possible').length,
    approved: substances.filter((s) => s.niveau_risque === 'aucun').length,
  };
  const tier = computeCosmeticVerdict(counts);
  console.log('[Cosmetic] verdict', tier, '— toxic:', counts.toxic, 'disputed:', counts.disputed, 'approved:', counts.approved);
  return cosmeticTierToRisk(tier);
}

// ═══════════════════════════════════════════════════════════════════════
// SCHÉMAS ZOD
// ═══════════════════════════════════════════════════════════════════════

const CATEGORY_VALUES = ['food', 'beverage', 'kitchen_utensil', 'clothing', 'cosmetic', 'household', 'electronics', 'furniture', 'toy', 'other'] as const;

const CATEGORY_ALIASES: Record<string, typeof CATEGORY_VALUES[number]> = {
  aliment: 'food', aliments: 'food', alimentaire: 'food', nourriture: 'food', food: 'food',
  boisson: 'beverage', boissons: 'beverage', drink: 'beverage', beverage: 'beverage',
  ustensile: 'kitchen_utensil', kitchen_utensil: 'kitchen_utensil',
  vetement: 'clothing', textile: 'clothing', clothing: 'clothing',
  cosmetique: 'cosmetic', cosmetic: 'cosmetic', hygiene: 'cosmetic',
  menager: 'household', household: 'household',
  electronique: 'electronics', electronics: 'electronics',
  meuble: 'furniture', furniture: 'furniture',
  jouet: 'toy', toy: 'toy',
  autre: 'other', other: 'other',
};

function normalizeKey(v: unknown): string {
  return String(v ?? '').toLowerCase().trim().replace(/[\s-]+/g, '_').replace(/[^a-z_]/g, '');
}

const categoryEnum = z.preprocess((v) => {
  const k = normalizeKey(v);
  return CATEGORY_ALIASES[k] ?? ((CATEGORY_VALUES as readonly string[]).includes(k) ? k : 'other');
}, z.enum(CATEGORY_VALUES));

const safeString = (fallback: string = '') =>
  z.preprocess((v) => (v === undefined || v === null ? fallback : typeof v === 'string' ? v : String(v)), z.string());

const aiAnalysisSchema = z.object({
  categorie_produit: categoryEnum,
  objet_identifie: safeString(''),
  materiau_detecte: safeString(''),
  ingredients_lus: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.object({
      nom: safeString(''),
      explication: safeString(''),
    }))
  ),
  erreur: safeString('').optional(),
});

// ═══════════════════════════════════════════════════════════════════════
// PROMPT — L'IA LIT + DÉCRIT, ELLE NE CLASSE PAS
// ═══════════════════════════════════════════════════════════════════════

const AI_PROMPT_FR = `Tu es ToxiScan, un assistant qui lit les étiquettes alimentaires et cosmétiques.

⚠️ RÈGLE ABSOLUE — TU NE CLASSES RIEN ⚠️

Ton rôle est UNIQUEMENT de :
1. Identifier le produit (marque + nom)
2. Lire chaque ingrédient de l'étiquette
3. Écrire une description PÉDAGOGIQUE et FRANCHE pour chaque ingrédient

TU NE DOIS JAMAIS classer un ingrédient comme "danger", "probable", "possible" ou "aucun".
TU NE DOIS JAMAIS écrire de niveau_risque ou de classification CIRC.
Le système Dr. Toxi fait cette classification automatiquement via une base de données interne.

═══ ÉTAPE 1 — IDENTIFIER LE PRODUIT ═══

objet_identifie = marque + produit (ex: "LU Prince", "Coca-Cola Zero", "Nutella").
Priorité : 1) nom Open Food Facts si fourni ; 2) texte/marque sur l'emballage ; 3) marques connues reconnues visuellement ; 4) si la MARQUE est illisible ou absente, NOMME LE PRODUIT PAR SON TYPE déduit des ingrédients (ex: "Biscuits", "Céréales", "Sauce tomate", "Boisson gazeuse", "Barre chocolatée", "Shampoing", "Yaourt", "Chips").

🚫 INTERDIT ABSOLU pour objet_identifie :
- N'écris JAMAIS "Objet inconnu", "Produit inconnu", "Inconnu", "Unknown", "N/A".
- N'écris JAMAIS la formule littérale "marque + produit" / "brand + product name" / "Nom du produit".
- Il y a TOUJOURS un type identifiable d'après les ingrédients — donne-le.

categorie_produit : food | beverage | cosmetic | household | other.

═══ ÉTAPE 2 — LIRE CHAQUE INGRÉDIENT EXHAUSTIVEMENT ═══

🚨 BUG FIX — LIGNES "Contient:" : Les lignes qui commencent par "Contient:" ou "Contains:" sont des DÉCLARATIONS D'ALLERGÈNES RÉGLEMENTAIRES, PAS des ingrédients. Ne les inclus JAMAIS dans ingredients_lus. Ignore-les complètement.

1. Trouve le bloc "Ingrédients :" / "INGREDIENTS:"
2. Découpe à chaque virgule/point-virgule → chaque segment = 1 ingrédient
3. Pour CHAQUE ingrédient, crée UNE entrée dans ingredients_lus avec :
   - nom : nom de l'ingrédient EN FRANÇAIS (traduis si étiquette anglaise)
   - explication : 3 à 5 phrases pédagogiques sur l'ingrédient
4. N'OMETS AUCUN ingrédient, même les ingrédients sains (eau, sel, farine, œufs, lait).

🚨🚨🚨 RÈGLE CRITIQUE — PRÉSERVER LE NOM EXACT DE L'INGRÉDIENT 🚨🚨🚨

C'EST LA RÈGLE LA PLUS IMPORTANTE. NE JAMAIS la violer.

❌ INTERDIT : abréger, simplifier, ou raccourcir un nom d'ingrédient.
❌ INTERDIT : remplacer un terme spécifique par un terme générique.
❌ INTERDIT : mélanger français et anglais dans le même nom.
❌ INTERDIT : faire des fautes d'orthographe sur les noms d'ingrédients.

✅ OBLIGATOIRE : PRÉSERVER chaque qualificatif (de canne, raffiné, hydrogéné, modifié, complet, inverti, évaporé, naturel, artificiel, etc.).

EXEMPLES CONCRETS :
• Si l'étiquette dit "cane sugar" → écris "Sucre de canne" — JAMAIS juste "Sucre"
• Si l'étiquette dit "invert cane syrup" → écris "Sirop de canne inverti" — JAMAIS "Sucres" ni "Sucres (inversé cane syrup)"
• Si l'étiquette dit "palm oil" → écris "Huile de palme" — JAMAIS "Huile végétale", JAMAIS "Huile de palmet" (l'orthographe correcte est PALME, pas PALMET)
• Si l'étiquette dit "refined sunflower oil" → écris "Huile de tournesol raffinée" — JAMAIS juste "Huile"
• Si l'étiquette dit "modified corn starch" → écris "Amidon de maïs modifié" — JAMAIS juste "Amidon"
• Si l'étiquette dit "natural vanilla flavor" → écris "Arôme naturel de vanille" — JAMAIS juste "Arôme"
• Si l'étiquette dit "hydrogenated soybean oil" → écris "Huile de soja hydrogénée" — JAMAIS "Huile de soja"
• Si l'étiquette dit "sodium nitrite" → écris "Nitrite de sodium" — JAMAIS juste "Sel"
• Si l'étiquette dit "evaporated cane juice" → écris "Jus de canne évaporé" — JAMAIS "Sucre"

Pourquoi c'est critique : la base de données ToxiScan classe DIFFÉREMMENT les ingrédients selon leur spécificité (Sucre = orange, Sucre de canne = jaune, Sirop de canne inverti = orange). Si tu simplifies, tu fausses la classification.

🟠 RÈGLE ABSOLUE HUILE DE PALME : l'huile de palme et TOUTES ses formes (palme, palmiste, oléine de palme, stéarine de palme, graisse de palme, shortening de palme — y compris « bio », « durable » ou « RSPO ») sont TOUJOURS classées ultra-transformées (orange minimum, Groupe 2A CIRC via 3-MCPD/esters de glycidol). JAMAIS vert, JAMAIS « approuvé », JAMAIS « sain ».

ORTHOGRAPHE OBLIGATOIRE :
• "palme" (PAS "palmet")
• "soja" (PAS "soya" en français standard)
• "colza" (PAS "canola" en français)
• "maïs" avec accent
• "hydrogénée" / "raffinée" / "modifiée" : accord féminin avec "huile" / "farine"

🌐 TRADUCTION OBLIGATOIRE — NOMS EN FRANÇAIS :
• "Natural flavors" → "Arômes naturels"
• "Artificial flavors" → "Arômes artificiels"
• "Modified milk ingredients" → "Ingrédients laitiers modifiés"
• "Wheat flour" → "Farine de blé"
• "Rapeseed oil" / "Canola oil" → "Huile de colza"
• "Palm oil" → "Huile de palme" (orthographe : PALME, jamais PALMET)
• "Refined palm oil" → "Huile de palme raffinée"
• "Palm kernel oil" → "Huile de palmiste"
• "Sunflower oil" → "Huile de tournesol"
• "High oleic sunflower oil" → "Huile de tournesol à haute teneur oléique"
• "Soybean oil" → "Huile de soja"
• "Hydrogenated [oil]" → "Huile [...] hydrogénée" — GARDE "hydrogénée"
• "Sugar" → "Sucre"
• "Cane sugar" → "Sucre de canne" (JAMAIS juste "Sucre")
• "Raw cane sugar" → "Sucre de canne roux"
• "Evaporated cane juice" / "Evaporated cane sugar" → "Jus de canne évaporé"
• "Cane syrup" → "Sirop de canne" (JAMAIS "Sucre")
• "Invert sugar" / "Inverted sugar" → "Sucre inverti"
• "Invert cane syrup" / "Invert cane sugar" → "Sirop de canne inverti"
• "Brown sugar" → "Sucre brun" ou "Sucre roux"
• "Salt" → "Sel"
• "Water" → "Eau"
• "Citric acid" → "Acide citrique"
• "Carbonated water" → "Eau gazéifiée"
• "Skim milk" → "Lait écrémé"
• "Glucose-fructose syrup" / "HFCS" / "High fructose corn syrup" → "Sirop de glucose-fructose"
• "Corn syrup" → "Sirop de maïs"
• "Yeast extract" → "Extrait de levure"
• "Soy lecithin" → "Lécithine de soja"
• "Sunflower lecithin" → "Lécithine de tournesol"
• "Concentrated fruit juice" → "Jus concentré"
• "Cassava root fiber" → "Fibre de racine de manioc"
• "Silicon dioxide" → "Dioxyde de silicium"
• "Vegetable oil" → "Huile végétale"
• "Modified corn starch" / "Modified cornstarch" → "Amidon de maïs modifié"
• "Modified wheat starch" → "Amidon de blé modifié"
• "Sodium nitrite" → "Nitrite de sodium" (JAMAIS "Sel")
• "Sodium chloride" → "Chlorure de sodium" ou "Sel"
• "Whole wheat flour" → "Farine de blé complète"

═══ ÉTAPE 3 — ÉCRIRE LA DESCRIPTION (TON FRANC ET PERCUTANT) ═══

🚨 RÈGLE ABSOLUE : NE JAMAIS RASSURER L'UTILISATEUR sur un ingrédient transformé/industriel.
🚨 INTERDIT d'écrire : "généralement sûr", "considéré comme sûr", "approuvé par les autorités", "sans danger connu", "présent naturellement dans les agrumes" (sans dire que celui utilisé est industriel).

L'utilisateur télécharge cette app PARCE QU'IL VEUT SAVOIR LA VÉRITÉ. Si tu rassures, tu trahis sa confiance.

Pour CHAQUE ingrédient, écris 3 à 5 phrases en français clair, tutoiement, TON FRANC.

⚠️ ADAPTE TON TON À LA NATURE RÉELLE DE L'INGRÉDIENT :

═══ TYPE 1 : INGRÉDIENTS SAINS / APPROUVÉS (eau, sel, fruits, légumes, huile d'olive vierge, miel, épices, assaisonnements, herbes aromatiques, vinaigre, lait, œufs, fromage, viande non transformée, poisson, levure naturelle, farine, riz, avoine, légumineuses, etc.) ═══

🟢 RÈGLE ABSOLUE POUR LES INGRÉDIENTS SAINS :
→ Ton 100% POSITIF, valorisant, court (2-3 phrases).
→ Mets en avant les BIENFAITS pour la santé (nutriments, vitamines, minéraux, rôle dans le corps).
→ INTERDIT d'ajouter une mise en garde du type "à consommer avec modération", "en quantité raisonnable", "attention à l'excès", "industriel", "transformé".
→ INTERDIT de chercher du négatif sur l'eau, le sel naturel, les épices, les herbes, les fruits, les légumes, la viande fraîche, le poisson, le fromage non transformé, les œufs.
→ Si l'ingrédient est APPROUVÉ, la description doit DONNER ENVIE de le consommer.

→ Exemple eau : "L'eau est essentielle à la vie. Elle hydrate, transporte les nutriments et régule la température corporelle. Excellente pour la santé."
→ Exemple farine de blé : "Céréale de base riche en glucides complexes et fibres. Apporte de l'énergie durable au corps."
→ Exemple épices / assaisonnements : "Les épices et herbes aromatiques sont naturelles et bénéfiques. Elles apportent saveur, antioxydants et composés anti-inflammatoires sans calories. Excellentes pour la cuisine maison."
→ Exemple sel : "Minéral essentiel au bon fonctionnement du corps (équilibre hydrique, transmission nerveuse). Présent naturellement dans de nombreux aliments."
→ Exemple fromage mozzarella : "Fromage italien traditionnel à pâte filée, source de protéines et de calcium. Apporte du goût et de la satiété."
→ Exemple poulet : "Viande maigre riche en protéines de qualité, en vitamines du groupe B et en sélénium. Excellent pour la construction musculaire."

═══ TYPE 2 : INGRÉDIENTS TRANSFORMÉS / CONTROVERSÉS (sucres, sirops, huiles raffinées, arômes, gommes, acide citrique industriel, lécithines, phosphates, sulfites, extrait de levure, gel de silice, etc.) ═══

🚨🚨 DISTINCTION OBLIGATOIRE — DEUX SOUS-TONS SELON LA GRAVITÉ 🚨🚨

▸ INGRÉDIENT ULTRA-TRANSFORMÉ / ORANGE (sucre, sirop de glucose-fructose, huile hydrogénée, huile raffinée, maltodextrine, dextrose, émulsifiants, arômes industriels, etc.) :
  La description DOIT TOUJOURS, sans exception :
  1. Expliquer COMMENT et POURQUOI l'ingrédient est industriellement transformé (procédé : raffinage, hydrogénation, solvants, haute température…).
  2. Expliquer POURQUOI il est dangereux pour la santé.
  3. Mentionner le lien avec le cancer ou une maladie grave (inflammation chronique, obésité, diabète, maladie cardiovasculaire, stéatose hépatique…) UNIQUEMENT quand il est RÉELLEMENT établi pour CET ingrédient (classement CIRC, ou preuve solide type sucre→diabète, gras trans→cardiovasculaire). Pour un marqueur PUREMENT ultra-transformé SANS lien maladie prouvé (vitamines de synthèse B3/B5/B6/B12, inositol, minéraux et sels industriels…), N'INVENTE AUCUN cancer : explique le procédé industriel et termine simplement par « marqueur d'aliment ultra-transformé (NOVA 4) ».
  4. NE JAMAIS mentionner un seul bienfait, ni un seul fait NEUTRE. INTERDIT d'écrire "en petite quantité c'est sûr", "apporte de l'énergie", "riche en…", "aide à…", "stabilise…", "sans danger", "index glycémique bas", "faible indice glycémique", "faible en calories", "facile à digérer", "sans gluten". Aucune phrase descriptive neutre type "sert d'agent levant" / "utilisé comme édulcorant" sans expliquer le danger.
  5. Ton DIRECT et FACTUEL, comme un médecin qui met en garde un patient.
  6. Description SPÉCIFIQUE à CET ingrédient — JAMAIS de description générique ni passe-partout.

  EXEMPLES OBLIGATOIRES (à reproduire dans cet esprit) :
  • Sucre / Sucre de canne : "Sucre industriel raffiné sans valeur nutritive. Nourrit les cellules cancéreuses, favorise l'obésité, la résistance à l'insuline et l'inflammation chronique — tous des facteurs majeurs de risque de cancer. À éviter."
  • Huile végétale hydrogénée : "Huile végétale hydrogénée industriellement. Le processus d'hydrogénation crée des gras trans qui favorisent l'inflammation chronique, obstruent les artères et sont directement liés à un risque accru de cancer. Évitez la consommation régulière."

  🚫🚫 ERREURS RÉELLES CONSTATÉES — À NE PLUS JAMAIS REPRODUIRE 🚫🚫
  • Sirop de glucose-fructose / HFCS : il est STRICTEMENT INTERDIT d'écrire "index glycémique bas" ou toute phrase positive/neutre. LA VÉRITÉ : son fructose isolé est métabolisé directement par le foie → stéatose hépatique non alcoolique, obésité, résistance à l'insuline et risque accru de cancer. "Sirop de glucose-fructose industriel extrait du maïs (souvent OGM). Son fructose isolé surcharge le foie et favorise la stéatose hépatique, l'obésité et l'inflammation chronique — facteurs de risque de cancer. À éviter."
  • Poudre à lever / agents levants ("leavening") : JAMAIS de description générique. Explique qu'ils contiennent des phosphates industriels (E450-E452) dont l'excès est lié à la calcification des artères et aux troubles rénaux, marqueur d'aliment transformé.
  • Arômes naturels ET artificiels : JAMAIS neutre. Composés industriels à composition secrète (extraits aux solvants, pétrochimie pour les artificiels), marqueurs certains d'ultra-transformation (NOVA 4).
  • Vitamines de synthèse (cyanocobalamine/B12, niacine/B3, B5, B6, inositol…) ET minéraux/sels industriels (carbonate de calcium, citrate de sodium…) : N'INVENTE JAMAIS de cancer. Explique qu'ils sont fabriqués par synthèse/fermentation industrielle pour re-fortifier ou stabiliser un produit appauvri, et que leur présence trahit un aliment ultra-transformé. Termine par « marqueur d'aliment ultra-transformé (NOVA 4). À éviter au quotidien. » SANS mot « cancer ».
  ⛔ Toute description d'ingrédient ORANGE (ultra-transformé) DOIT : (a) expliquer le procédé industriel, (b) ne JAMAIS rassurer ni citer un bienfait, (c) se terminer par une reco claire. Le mot « cancer » (ou une maladie grave) n'apparaît QUE s'il est réellement fondé pour cet ingrédient (CIRC / preuve solide) — sinon termine par « À éviter au quotidien — marqueur d'aliment ultra-transformé (NOVA 4) ». NE COLLE JAMAIS « cancer » par défaut sur une vitamine de synthèse, un minéral ou un sel industriel.

▸ INGRÉDIENT CONTROVERSÉ / JAUNE (acceptable occasionnellement : certains additifs modérés, acide citrique, gommes, conservateurs légers, etc.) :
  Description ÉQUILIBRÉE :
  1. Explique ce qu'est l'ingrédient.
  2. Mentionne pourquoi il est controversé ou potentiellement nocif.
  3. Dis qu'il peut se consommer occasionnellement mais PAS au quotidien.
  4. Court et factuel.

→ Cite TOUJOURS au moins une donnée précise : étude scientifique, autorité (EFSA, ANSES, OMS), nom de classe chimique, ou effet biologique nommé.
→ Termine TOUJOURS par une phrase qui guide l'utilisateur : "À limiter.", "Marqueur de produit ultra-transformé.", "Préférer une alternative naturelle."

EXEMPLES OBLIGATOIRES À SUIVRE :

• Sucre / Sucre de canne : "Le sucre raffiné est un glucide vide associé à l'obésité, au diabète de type 2 et à l'inflammation chronique. L'OMS recommande de ne pas dépasser 25g de sucres ajoutés par jour — la plupart des produits transformés en contiennent bien plus. Marqueur fort de produit ultra-transformé."

• Sirop de glucose-fructose : "Édulcorant industriel ultra-transformé extrait de l'amidon de maïs. Son fructose isolé est métabolisé directement par le foie et favorise la stéatose hépatique non alcoolique, l'insulinorésistance et l'obésité. Très différent du sucre des fruits entiers — à éviter au quotidien."

• Acide citrique : "L'acide citrique alimentaire (E330) n'est PAS extrait des agrumes : il est produit industriellement par fermentation du moisissure Aspergillus niger sur du sirop de maïs (souvent OGM). En excès, il érode l'émail dentaire et irrite les muqueuses digestives. Marqueur de produit transformé."

• Arômes naturels : "Le mot 'naturel' est trompeur. Ces arômes sont extraits avec des solvants industriels (hexane, alcool) et leur composition exacte reste secrète — pouvant inclure jusqu'à 100 substances chimiques. Marqueur certain de produit ultra-transformé. Les vrais aliments n'ont pas besoin d'arômes ajoutés."

• Huile végétale (non spécifiée) : "Mention floue qui cache souvent de l'huile de palme, de soja ou de colza raffinées — toutes problématiques. Ces huiles subissent un raffinage chimique (hexane, désodorisation à 240°C) qui crée des composés glycidyliques cancérogènes (3-MCPD). Un fabricant transparent précise toujours quelle huile il utilise."

• Huile de tournesol / colza raffinée : "Huile végétale raffinée riche en oméga-6 pro-inflammatoires. Le ratio oméga-6/oméga-3 dans l'alimentation occidentale moderne (20:1) est lié à l'inflammation chronique, aux maladies cardiovasculaires et à plusieurs cancers. Préférer l'huile d'olive vierge ou l'huile de colza pressée à froid."

• Gel de silice / Dioxyde de silicium (E551) : "Anti-agglomérant industriel sous forme de nanoparticules. L'EFSA a demandé en 2018 une réévaluation après que des études ont montré que les nanoparticules de silice peuvent traverser la barrière intestinale et s'accumuler dans le foie. Marqueur de produit ultra-transformé."

• Maltodextrine : "Glucide industriel ultra-transformé dérivé de l'amidon (souvent OGM). Son index glycémique est PLUS ÉLEVÉ que le sucre blanc (110 vs 65) et fait grimper la glycémie violemment. Étude 2012 : perturbe le microbiome intestinal. Marqueur d'aliment ultra-transformé."

• Dextrose : "Sucre simple industriel (glucose pur). Fait grimper la glycémie quasi instantanément. Marqueur d'aliment ultra-transformé — un vrai aliment n'a pas besoin de dextrose ajouté."

• Émulsifiants (E471, mono- et diglycérides) : "Émulsifiants industriels qui peuvent contenir jusqu'à 50% de graisses trans cachées (issues d'huiles partiellement hydrogénées). Études récentes (Nature 2015) : perturbent le microbiome intestinal et favorisent l'inflammation chronique. Marqueur de produit ultra-transformé."

• Lécithine de soja : "Émulsifiant extrait du soja avec des solvants chimiques (hexane). Le soja utilisé est OGM dans 94% des cas aux USA. Préférer la lécithine de tournesol (sans OGM ni solvant)."

• Extrait de levure : "C'est du MSG (glutamate monosodique) caché sous un nom plus 'naturel'. Contient naturellement du glutamate qui agit comme exhausteur de goût et excitotoxine. Évite si tu es sensible aux maux de tête, palpitations ou hypertension."

• Gommes (xanthane, guar, etc.) : "Polysaccharides bactériens produits par fermentation industrielle. Peuvent provoquer ballonnements, diarrhées et perturbation du microbiome chez les personnes sensibles. Marqueur de produit ultra-transformé."

• Sulfites (E220-E228) : "Conservateurs allergènes capables de déclencher crises d'asthme, urticaire et migraines. La mention 'contient des sulfites' est OBLIGATOIRE au-dessus de 10mg/kg car potentiellement dangereux. À éviter chez les asthmatiques."

• Phosphates ajoutés (E450-E452, E339-E341) : "Sels minéraux industriels qui augmentent dangereusement l'apport en phosphore. Études : excès lié à calcification des artères, troubles rénaux et risque cardiovasculaire accru. Très différents du phosphore naturel des aliments."

═══ TYPE 3 : INGRÉDIENTS CANCÉRIGÈNES / DANGEREUX (nitrites, formaldéhyde, métaux lourds, PFAS, parabens, phtalates, etc.) ═══

La description DOIT TOUJOURS, sans exception :
1. Indiquer clairement qu'il est classé CANCÉRIGÈNE par l'OMS ou le CIRC.
2. Expliquer le risque de cancer spécifique (quel mécanisme, quel organe).
3. NE JAMAIS mentionner un seul bienfait.
4. Ton DIRECT et ALARMANT — cet ingrédient cause le cancer.
→ Exemple nitrite de sodium (E250) : "Conservateur des charcuteries qui forme des nitrosamines cancérigènes lors de la cuisson. Classé cancérogène avéré Groupe 1 par le CIRC (OMS) — même catégorie que le tabac. À éviter, surtout chez les enfants."
→ Exemple parabens : "Conservateurs cosmétiques perturbateurs endocriniens — détectés dans des biopsies de cancer du sein (étude Darbre 2004). Mimétiques des œstrogènes. Plusieurs sont interdits en UE. À éviter absolument."

═══ INTERDICTIONS FORMELLES ═══

❌ JAMAIS écrire "généralement reconnu comme sûr" pour un ingrédient industriel
❌ JAMAIS écrire "sans risque" pour un ingrédient jaune ou orange
❌ JAMAIS écrire "approuvé par les autorités" — c'est une rassurance creuse
❌ JAMAIS dire que l'acide citrique vient des agrumes (il est industriel à 99%)
❌ JAMAIS minimiser un additif ("simplement utilisé pour", "juste un agent de...")
❌ JAMAIS inventer une classification Groupe 1/2A/2B
❌ JAMAIS écrire "Same as before", "Previously explained", "See previous explanation" ou toute référence à un ingrédient précédent. Chaque ingrédient doit avoir sa propre description complète et unique.
❌ Ne mets PAS de champs niveau_risque ou couleur — ils seront ignorés
❌ JAMAIS écrire de mise en garde sur un ingrédient sain (eau, sel, épices, herbes, fruits, légumes, fromage frais, œufs, viande non transformée, poisson)
❌ 🚨 BUG FIX — JAMAIS écrire de description GÉNÉRIQUE comme "X est un ingrédient naturel qui apporte saveur et texture". Chaque description doit être SPÉCIFIQUE à l'ingrédient — mentionne ce qu'il EST, d'où il vient, et son rôle ou effet concret.
❌ 🚨 BUG FIX — JAMAIS mélanger le français et l'anglais dans la même réponse. TOUS les noms d'ingrédients (nom) et TOUTES les descriptions (explication) doivent être EN FRANÇAIS UNIQUEMENT. Si l'OCR contient des noms anglais, TRADUIS-LES en français.

✅ TOUJOURS expliquer le PROCÉDÉ INDUSTRIEL derrière l'ingrédient
✅ TOUJOURS citer une donnée concrète (étude, % d'OGM, classification, effet biologique)
✅ TOUJOURS terminer par une recommandation claire pour l'utilisateur

═══ CAS PARTICULIERS ═══

PRODUITS BUCCAUX (dentifrice, bain de bouche) : Ajoute à la fin de chaque explication problématique : "Bon à savoir : ce produit est recraché, donc l'exposition est limitée."

GROSSESSE : Si l'ingrédient est dans cette liste, ajoute "⚠️ Déconseillé pendant la grossesse." dans son explication :
${DANGER_PREGNANCY.join(', ')}

═══ FORMAT JSON ATTENDU ═══

{
  "objet_identifie": "Nom du produit",
  "categorie_produit": "food",
  "materiau_detecte": "",
  "ingredients_lus": [
    { "nom": "Eau gazéifiée", "explication": "..." },
    { "nom": "Sucre de canne", "explication": "..." }
  ],
  "erreur": ""
}

Si la photo est illisible ET qu'aucune donnée Open Food Facts n'est fournie, mets erreur="Photo illisible".`;

const AI_PROMPT_EN = `You are ToxiScan, an assistant that reads food and cosmetic labels.

⚠️ ABSOLUTE RULE — YOU DO NOT CLASSIFY ANYTHING ⚠️

Your role is ONLY to:
1. Identify the product (brand + name)
2. Read each ingredient on the label
3. Write an EDUCATIONAL and FRANK description for each ingredient

You MUST NEVER classify ingredients. The Dr. Toxi system does it automatically.

═══ STEP 1 — IDENTIFY THE PRODUCT ═══

objet_identifie = brand + product name (e.g. "LU Prince", "Coca-Cola Zero", "Nutella").
Priority: 1) OpenFoodFacts name if provided; 2) text/brand on the packaging; 3) known brands recognized visually; 4) if the BRAND is unreadable or absent, NAME THE PRODUCT BY ITS TYPE deduced from the ingredients (e.g. "Cookies", "Cereal", "Tomato sauce", "Soda", "Chocolate bar", "Shampoo", "Yogurt", "Chips").

🚫 ABSOLUTELY FORBIDDEN for objet_identifie:
- NEVER write "Unknown object", "Unknown product", "Unknown", "N/A".
- NEVER write the literal template "brand + product name" or "Product name".
- There is ALWAYS an identifiable type from the ingredients — provide it.

categorie_produit: food | beverage | cosmetic | household | other.

═══ STEP 2 — READ EVERY INGREDIENT EXHAUSTIVELY ═══

🚨 BUG FIX — "Contains:" LINES: Lines starting with "Contains:" or "Contient:" are REGULATORY ALLERGEN DECLARATIONS, NOT ingredients. NEVER include them in ingredients_lus. Ignore them completely.

For EACH ingredient, create ONE entry in ingredients_lus with:
- nom: ingredient name IN ENGLISH (translate if French label)
- explication: 3-5 educational sentences

DO NOT OMIT any ingredient.

🚨🚨🚨 CRITICAL RULE — PRESERVE THE EXACT INGREDIENT NAME 🚨🚨🚨

THIS IS THE MOST IMPORTANT RULE. NEVER violate it.

❌ FORBIDDEN: shortening, simplifying, or abbreviating an ingredient name.
❌ FORBIDDEN: replacing a specific term with a generic one.
❌ FORBIDDEN: mixing languages in the same name.
❌ FORBIDDEN: misspelling ingredient names.

✅ MANDATORY: PRESERVE every qualifier (cane, refined, hydrogenated, modified, whole, invert, evaporated, natural, artificial, etc.).

CONCRETE EXAMPLES:
• If the label says "sucre de canne" → write "Cane sugar" — NEVER just "Sugar"
• If the label says "sirop de canne inverti" → write "Invert cane syrup" — NEVER just "Sugar"
• If the label says "huile de palme" → write "Palm oil" — NEVER "Vegetable oil"
• If the label says "huile de tournesol raffinée" → write "Refined sunflower oil" — NEVER just "Oil"
• If the label says "amidon de maïs modifié" → write "Modified corn starch" — NEVER just "Starch"
• If the label says "arôme naturel de vanille" → write "Natural vanilla flavor" — NEVER just "Flavor"
• If the label says "huile de soja hydrogénée" → write "Hydrogenated soybean oil" — NEVER "Soybean oil"
• If the label says "nitrite de sodium" → write "Sodium nitrite" — NEVER just "Salt"

Why this is critical: the ToxiScan database classifies ingredients DIFFERENTLY based on specificity (Sugar = orange, Cane sugar = yellow, Invert cane syrup = orange). If you simplify, you skew the classification.

🟠 ABSOLUTE PALM OIL RULE: palm oil and ALL its forms (palm, palm kernel, palm olein, palm stearin, palm fat, palm shortening — including "organic", "sustainable" or "RSPO certified") are ALWAYS classified ultra-processed (orange minimum, IARC Group 2A via 3-MCPD/glycidyl esters). NEVER green, NEVER "approved", NEVER "healthy".

SPELLING:
• "palm" not "palmet"
• "soy" or "soybean" — use consistently
• keep qualifiers: "refined", "hydrogenated", "modified", "whole"

═══ STEP 3 — WRITE THE DESCRIPTION (FRANK AND HARD-HITTING TONE) ═══

🚨 ABSOLUTE RULE: NEVER REASSURE the user about a processed/industrial ingredient.
🚨 FORBIDDEN to write: "generally safe", "considered safe", "approved by authorities", "no known harm", "naturally present in citrus" (without saying the industrial version is used).

The user downloaded this app BECAUSE THEY WANT THE TRUTH. If you reassure them, you betray their trust.

⚠️ ADAPT YOUR TONE TO THE REAL NATURE OF THE INGREDIENT:

═══ TYPE 1: HEALTHY / APPROVED INGREDIENTS (water, salt, fruits, vegetables, virgin olive oil, honey, spices, seasonings, herbs, vinegar, milk, eggs, cheese, unprocessed meat, fish, yeast, flour, rice, oats, legumes, etc.) ═══

🟢 ABSOLUTE RULE FOR HEALTHY INGREDIENTS:
→ 100% POSITIVE, valorizing tone. Short (2-3 sentences).
→ Highlight the HEALTH BENEFITS (nutrients, vitamins, minerals, role in the body).
→ FORBIDDEN to add warnings like "consume in moderation", "watch quantity", "beware of excess", "industrial", "processed".
→ FORBIDDEN to search for negatives about water, natural salt, spices, herbs, fruits, vegetables, fresh meat, fish, unprocessed cheese, eggs.
→ If the ingredient is APPROVED, the description must MAKE THE USER WANT to consume it.

→ Water: "Water is essential to life. It hydrates, transports nutrients, and regulates body temperature. Excellent for health."
→ Wheat flour: "Staple grain rich in complex carbs and fiber. Provides lasting energy to the body."
→ Spices / seasonings: "Spices and herbs are natural and beneficial. They add flavor, antioxidants and anti-inflammatory compounds without calories. Great for home cooking."
→ Salt: "Essential mineral for body function (water balance, nerve transmission). Naturally present in many foods."
→ Mozzarella cheese: "Traditional Italian pulled-curd cheese, a source of protein and calcium. Adds flavor and satiety."
→ Chicken: "Lean meat rich in high-quality protein, B vitamins and selenium. Excellent for muscle building."

═══ TYPE 2: PROCESSED / CONTROVERSIAL INGREDIENTS (sugars, syrups, refined oils, flavors, gums, industrial citric acid, lecithins, phosphates, sulfites, yeast extract, silica gel, etc.) ═══

🚨🚨 MANDATORY DISTINCTION — TWO SUB-TONES BASED ON SEVERITY 🚨🚨

▸ ULTRA-PROCESSED / ORANGE INGREDIENT (sugar, glucose-fructose syrup, hydrogenated oil, refined oil, maltodextrin, dextrose, emulsifiers, industrial flavors, etc.):
  The description MUST ALWAYS, no exception:
  1. Explain HOW and WHY the ingredient is industrially processed (the process: refining, hydrogenation, solvents, high heat…).
  2. Explain WHY it is dangerous for health.
  3. Mention the link to cancer or serious disease (chronic inflammation, obesity, diabetes, cardiovascular disease, fatty liver…) ONLY when it is GENUINELY established for THIS ingredient (IARC classification, or strong evidence like sugar→diabetes, trans fats→cardiovascular). For a PURELY ultra-processed marker with NO proven disease link (synthetic vitamins B3/B5/B6/B12, inositol, industrial minerals and salts…), do NOT invent any cancer: explain the industrial process and simply end with "a marker of ultra-processed food (NOVA 4)".
  4. NEVER mention a single benefit, and NEVER state a merely NEUTRAL fact. FORBIDDEN to write "in small amounts it's safe", "provides energy", "rich in…", "helps…", "stabilizes…", "generally regarded as safe", "low glycemic index", "low in calories", "easy to digest", "gluten free". No neutral descriptive phrase like "acts as a leavening agent" / "used as a sweetener" without explaining the danger.
  5. DIRECT and FACTUAL tone, like a doctor warning a patient.
  6. SPECIFIC to THIS ingredient — NEVER a generic or boilerplate description.

  MANDATORY EXAMPLES (reproduce in this spirit):
  • Sugar / Cane sugar: "Refined industrial sugar with zero nutritional value. Feeds cancer cells, promotes obesity, insulin resistance and chronic inflammation — all major cancer risk factors. Avoid."
  • Hydrogenated vegetable oil: "Industrially hydrogenated vegetable oil. The hydrogenation process creates trans fats that promote chronic inflammation, block arteries and are directly linked to increased cancer risk. Avoid regular consumption."

  🚫🚫 REAL ERRORS OBSERVED — MUST NEVER HAPPEN AGAIN 🚫🚫
  • High Fructose Corn Syrup / HFCS: it is STRICTLY FORBIDDEN to write "low glycemic index" or any positive/neutral phrase. THE TRUTH: its isolated fructose is metabolized directly by the liver → non-alcoholic fatty liver disease, obesity, insulin resistance and increased cancer risk. "Industrial sweetener extracted from corn (often GMO). Its isolated fructose overloads the liver and promotes fatty liver disease, obesity and chronic inflammation — cancer risk factors. Avoid."
  • Leavening / raising agents / baking powder: NEVER a generic description. Explain they contain industrial phosphates (E450-E452) whose excess is linked to artery calcification and kidney problems — a marker of processed food.
  • Natural AND artificial flavors: NEVER neutral. Industrial compounds with secret composition (solvent extraction, petrochemistry for artificial), certain markers of ultra-processing (NOVA 4).
  • Synthetic vitamins (cyanocobalamin/B12, niacin/B3, B5, B6, inositol…) AND industrial minerals/salts (calcium carbonate, sodium citrate…): NEVER invent cancer. Explain they are made by industrial synthesis/fermentation to re-fortify or stabilize a nutrient-stripped product, and that their presence betrays an ultra-processed food. End with "a marker of ultra-processed food (NOVA 4). Avoid regular consumption." WITHOUT the word "cancer".
  ⛔ Every ORANGE (ultra-processed) ingredient description MUST: (a) explain the industrial process, (b) NEVER reassure or cite a benefit, (c) end with a clear recommendation. The word "cancer" (or a serious disease) appears ONLY when genuinely grounded for this ingredient (IARC / strong evidence) — otherwise end with "Avoid regular consumption — a marker of ultra-processed food (NOVA 4)". NEVER slap "cancer" by default onto a synthetic vitamin, a mineral or an industrial salt.

▸ CONTROVERSIAL / YELLOW INGREDIENT (acceptable occasionally: some moderate additives, citric acid, gums, light preservatives, etc.):
  BALANCED description:
  1. Explain what the ingredient is.
  2. Mention why it is controversial or potentially harmful.
  3. Say it can be consumed occasionally but NOT daily.
  4. Short and factual.

→ ALWAYS cite at least one specific data point: scientific study, authority (EFSA, FDA, WHO), chemical class, or named biological effect.
→ ALWAYS end with guidance: "Limit consumption.", "Marker of ultra-processed food.", "Prefer a natural alternative."

MANDATORY EXAMPLES TO FOLLOW:

• Sugar / Cane sugar: "Refined sugar is an empty carbohydrate linked to obesity, type 2 diabetes, and chronic inflammation. The WHO recommends staying under 25g of added sugar per day — most processed products contain much more. Strong marker of ultra-processed food."

• Glucose-fructose syrup (HFCS): "Ultra-processed industrial sweetener extracted from corn starch. Its isolated fructose is metabolized directly by the liver and promotes non-alcoholic fatty liver disease, insulin resistance, and obesity. Very different from fruit sugar — avoid daily."

• Citric acid: "Food-grade citric acid (E330) is NOT extracted from citrus: it's industrially produced through fermentation of Aspergillus niger mold on corn syrup (often GMO). In excess, it erodes tooth enamel and irritates digestive mucosa. Marker of processed food."

• Natural flavors: "The word 'natural' is misleading. These flavors are extracted using industrial solvents (hexane, alcohol) and their exact composition remains secret — up to 100 chemical substances. Certain marker of ultra-processed food. Real foods don't need added flavors."

• Vegetable oil (unspecified): "Vague labeling that often hides palm, soy, or refined canola oil — all problematic. These oils undergo chemical refining (hexane, 240°C deodorization) creating carcinogenic glycidyl compounds (3-MCPD). A transparent manufacturer always specifies which oil they use."

• Refined sunflower / canola oil: "Refined vegetable oil high in pro-inflammatory omega-6. The modern Western omega-6/omega-3 ratio (20:1) is linked to chronic inflammation, cardiovascular disease, and several cancers. Prefer virgin olive oil or cold-pressed canola oil."

• Silica gel / Silicon dioxide (E551): "Industrial anti-caking agent in nanoparticle form. EFSA requested in 2018 a re-evaluation after studies showed silica nanoparticles can cross the intestinal barrier and accumulate in the liver. Marker of ultra-processed food."

• Maltodextrin: "Ultra-processed industrial carbohydrate derived from starch (often GMO). Its glycemic index is HIGHER than white sugar (110 vs 65) and spikes blood sugar violently. 2012 study: disrupts gut microbiome. Marker of ultra-processed food."

• Emulsifiers (E471, mono- and diglycerides): "Industrial emulsifiers that can contain up to 50% hidden trans fats (from partially hydrogenated oils). Recent studies (Nature 2015): disrupt gut microbiome and promote chronic inflammation. Marker of ultra-processed food."

• Yeast extract: "This is hidden MSG (monosodium glutamate) under a more 'natural' name. Naturally contains glutamate which acts as flavor enhancer and excitotoxin. Avoid if sensitive to headaches, palpitations, or hypertension."

═══ TYPE 3: CARCINOGENIC / DANGEROUS INGREDIENTS (nitrites, formaldehyde, heavy metals, PFAS, parabens, phthalates, etc.) ═══

The description MUST ALWAYS, no exception:
1. State clearly it is classified as CARCINOGENIC by the WHO or IARC.
2. Explain the specific cancer risk (which mechanism, which organ).
3. NEVER mention a single benefit.
4. DIRECT and ALARMING tone — this ingredient causes cancer.
→ Sodium nitrite (E250) example: "Preservative in processed meats that forms carcinogenic nitrosamines when cooked. Classified confirmed carcinogen Group 1 by IARC (WHO) — same category as tobacco. Avoid, especially for children."

═══ STRICT PROHIBITIONS ═══

❌ NEVER write "generally recognized as safe" for an industrial ingredient
❌ NEVER write "no risk" for a yellow or orange ingredient
❌ NEVER write "approved by authorities" — that's empty reassurance
❌ NEVER say citric acid comes from citrus (it's 99% industrial)
❌ NEVER minimize an additive ("simply used to", "just an agent of...")
❌ NEVER invent a Group 1/2A/2B classification
❌ NEVER write "Same as before", "Previously explained", "See previous explanation" or any reference to a previous ingredient. Every ingredient must have its own complete, unique description.
❌ NEVER add warnings on a healthy ingredient (water, salt, spices, herbs, fruits, vegetables, fresh cheese, eggs, unprocessed meat, fish)
❌ 🚨 BUG FIX — NEVER write a GENERIC description like "X is a natural ingredient that contributes flavor and texture." Every description must be SPECIFIC to the ingredient — mention what it IS, where it comes from, and its specific role or effect.
❌ 🚨 BUG FIX — NEVER mix French and English in the same response. ALL ingredient names (nom) and ALL descriptions (explication) must be in ENGLISH ONLY. If the OCR contains French names, TRANSLATE them to English.

✅ ALWAYS explain the INDUSTRIAL PROCESS behind the ingredient
✅ ALWAYS cite concrete data (study, % GMO, classification, biological effect)
✅ ALWAYS end with a clear recommendation

═══ EXPECTED JSON FORMAT ═══

{
  "objet_identifie": "Product name",
  "categorie_produit": "food",
  "materiau_detecte": "",
  "ingredients_lus": [
    { "nom": "Carbonated water", "explication": "..." }
  ],
  "erreur": ""
}`;

// Korean reuses the English instruction scaffold; the runtime language lock below
// forces Korean OUTPUT, which overrides the English-only wording inside AI_PROMPT_EN.
const AI_PROMPT = (isEnglish() || isKorean()) ? AI_PROMPT_EN : AI_PROMPT_FR;

// ═══════════════════════════════════════════════════════════════════════
// APPEL À L'IA
// ═══════════════════════════════════════════════════════════════════════

async function callAI(
  imageBase64: string,
  ocrText?: string,
  ocrIngredientsBlock?: string,
): Promise<z.infer<typeof aiAnalysisSchema>> {
  console.log('[API] Calling OpenAI — description-only mode...');

  // 🌐 LANGUAGE LOCK — passed explicitly at runtime so the model can NEVER mix languages.
  const lang = getDeviceLanguage();
  const targetEnglish = lang === 'en';
  const languageLock = lang === 'ko'
    ? `╔═══════════════════════════════════════════════╗
║  출력 언어 잠금 — 한국어만 사용              ║
╚═══════════════════════════════════════════════╝
앱 언어는 한국어입니다. 이 규칙은 아래의 다른 모든 규칙보다 우선합니다.
- 모든 성분명("nom")과 모든 설명("explication")은 반드시 한국어로만 작성해야 합니다.
- 라벨/OCR 텍스트가 프랑스어, 영어 또는 다른 언어라면, 작성하기 전에 모든 용어를 한국어로 번역하세요.
- JSON 출력 전체가 100% 한국어여야 합니다. 언어가 섞인 필드는 절대 안 됩니다. (성분명 옆에 원어를 괄호로 병기하는 것은 허용됩니다.)

`
    : targetEnglish
    ? `╔═══════════════════════════════════════════════╗
║  OUTPUT LANGUAGE LOCK — ENGLISH ONLY          ║
╚═══════════════════════════════════════════════╝
The app language is ENGLISH. This rule OVERRIDES everything else below.
- EVERY ingredient name ("nom") and EVERY description ("explication") MUST be written in ENGLISH ONLY.
- If the label / OCR text is in French (or any other language), TRANSLATE every term into English BEFORE writing it.
- NEVER output a single French word (no "et", "le", "la", "sucre", "huile", "naturel", "sain") and NEVER use accented words (é, è, à, ç…).
- The whole JSON output must be 100% English. No mixed-language fields, ever.

`
    : `╔═══════════════════════════════════════════════╗
║  VERROU DE LANGUE — FRANÇAIS UNIQUEMENT       ║
╚═══════════════════════════════════════════════╝
La langue de l'app est le FRANÇAIS. Cette règle PRIME sur tout le reste ci-dessous.
- CHAQUE nom d'ingrédient ("nom") et CHAQUE description ("explication") DOIT être écrit en FRANÇAIS UNIQUEMENT.
- Si l'étiquette / le texte OCR est en anglais (ou autre langue), TRADUIS chaque terme en français AVANT de l'écrire.
- N'écris JAMAIS un seul mot anglais (pas de "and", "the", "sugar", "oil", "natural", "healthy", "flavor").
- Toute la sortie JSON doit être 100% française. Aucune entrée en langue mélangée, jamais.

`;

  const regionPrompt = getAnalysisRegionPrompt();
  const healthProfilePrompt = getHealthProfileAnalysisPrompt();
  const systemParts: string[] = [languageLock, AI_PROMPT, regionPrompt, healthProfilePrompt];

  if (ocrText) {
    // BUG 4 FIX — Strip "Contains:" / "May contain:" allergen lines from OCR before sending to AI.
    const cleanedOcr = ocrText
      .split('\n')
      .filter(line => !ALLERGEN_LINE_REGEX.test(line.trim()))
      .join('\n');
    const cleanedBlock = ocrIngredientsBlock
      ? ocrIngredientsBlock
          .split('\n')
          .filter(line => !ALLERGEN_LINE_REGEX.test(line.trim()))
          .join('\n')
      : null;

    const ocrHeader = pick({
      en: '\n\n═══ GOOGLE VISION OCR — RAW TEXT ═══\nPRIMARY source for the ingredient list. NEVER omit an ingredient that appears in the OCR.\n--- FULL OCR TEXT ---\n',
      fr: '\n\n═══ OCR GOOGLE VISION — TEXTE BRUT ═══\nSource PRINCIPALE pour les ingrédients. N\'omets JAMAIS un ingrédient de l\'OCR.\n--- TEXTE OCR COMPLET ---\n',
      ko: '\n\n═══ GOOGLE VISION OCR — 원문 텍스트 ═══\n성분 목록의 주요 출처입니다. OCR에 나타난 성분을 절대 빠뜨리지 마세요.\n--- 전체 OCR 텍스트 ---\n',
    });
    systemParts.push(ocrHeader);
    systemParts.push(cleanedOcr.substring(0, 8000));
    if (cleanedBlock && cleanedBlock.length > 10) {
      systemParts.push(
        pick({
          en: '\n--- INGREDIENTS BLOCK (highest priority) ---\n',
          fr: '\n--- BLOC INGRÉDIENTS (priorité max) ---\n',
          ko: '\n--- 성분 블록 (최우선) ---\n',
        }),
      );
      systemParts.push(cleanedBlock.substring(0, 4000));
    }
    systemParts.push('\n--- END OCR ---\n');
  }

  const hasOcrIngredients = !!(ocrIngredientsBlock && ocrIngredientsBlock.length > 30);

  const result = await aiGenerateObject({
    system: systemParts.join(''),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: pick({
              en: 'Read every ingredient on the label and write a FRANK, EDUCATIONAL description for each. DO NOT classify ingredients — that is done automatically by the system. DO NOT reassure the user about processed ingredients. Write EVERYTHING (names and descriptions) in ENGLISH ONLY — translate any French term first, no French word allowed.',
              fr: 'Lis chaque ingrédient de l\'étiquette et écris une description FRANCHE et PÉDAGOGIQUE pour chacun. NE CLASSIFIE PAS les ingrédients — c\'est fait automatiquement par le système. NE RASSURE PAS l\'utilisateur sur les ingrédients transformés. Écris TOUT (noms et descriptions) en FRANÇAIS UNIQUEMENT — traduis tout terme anglais d\'abord, aucun mot anglais autorisé.',
              ko: '라벨의 모든 성분을 읽고 각 성분에 대해 솔직하고 교육적인 설명을 작성하세요. 성분을 분류하지 마세요 — 분류는 시스템이 자동으로 합니다. 가공 성분에 대해 사용자를 안심시키지 마세요. 모든 것(성분명과 설명)을 한국어로만 작성하세요.',
            })
          },
          ...(hasOcrIngredients ? [] : [{ type: 'image' as const, image: imageBase64 }]),
        ],
      },
    ],
    schema: aiAnalysisSchema,
    toolName: 'record_analysis',
    toolDescription: pick({ en: 'Record the product description.', fr: 'Enregistre la description du produit.', ko: '제품 설명을 기록합니다.' }),
    maxTokens: 2500,
  });

  console.log('[API] AI returned', result.ingredients_lus.length, 'ingredients');
  return result;
}

// ═══════════════════════════════════════════════════════════════════════
// CLASSIFICATION DÉTERMINISTE
// ═══════════════════════════════════════════════════════════════════════

// Marqueurs de ton NÉGATIF — si on les trouve dans la description d'un ingrédient classé VERT,
// c'est que l'IA a halluciné du négatif sur un ingrédient sain. On remplace alors l'explication.
const NEGATIVE_MARKERS_FOR_GREEN = [
  'industriel', 'industrielle', 'industriellement', 'industrial', 'industrially',
  'raffiné', 'raffine', 'raffinée', 'raffinee', 'refined',
  'solvant', 'solvants', 'solvent', 'solvents',
  'chimique', 'chimiques', 'chemical', 'chemicals', 'chemically',
  'dépourvu', 'depourvu', 'dépourvue', 'depourvue', 'devoid', 'stripped',
  'ultra-transformé', 'ultra-transforme', 'ultra-processed',
  'hexane',
  'ogm', 'gmo',
  'cancér', 'cancer', 'cancéro', 'cancero', 'carcinogen',
  'hypertension', 'cardiovasculaire', 'cardiovascular',
  'inflammation', 'inflammatoire', 'inflammatory',
  'à limiter', 'a limiter', 'limit consumption', 'à éviter', 'a eviter', 'avoid',
  'marqueur de produit', 'marker of', 'marker of ultra',
  'consommation excessive', 'excessive consumption',
  'préférer une alternative', 'preferer une alternative', 'prefer a natural', 'prefer an alternative',
  'inconvénient pour la santé', 'inconvenient pour la sante',
  // Disease / harm vocabulary — broadens recognition of a genuinely negative description.
  'obésit', 'obesit', 'obesity',
  'diabèt', 'diabet', 'diabetes',
  'stéatose', 'steatose', 'fatty liver', 'hépatique', 'hepatique',
  'métabolique', 'metabolique', 'metabolic',
  'tumeur', 'tumeurs', 'tumor', 'tumour',
  'maladie', 'disease',
  'nocif', 'nocive', 'harmful', 'nuisible',
  'toxique', 'toxic', 'toxine', 'toxin',
  'gras trans', 'graisses trans', 'trans fat', 'acides gras trans',
  'pic glycemique', 'pics glycemiques', 'pic de glycemie', 'pics de glycemie', 'spikes blood sugar', 'blood sugar spike',
  'synthétique', 'synthetique', 'synthetic',
  'pétrochimie', 'petrochimie', 'petrochemical',
  'perturbateur', 'perturbe', 'disrupt',
  'glycémique élevé', 'glycemique eleve', 'high glycemic', 'index glycemique eleve',
  // Korean negative markers — let the engine recognize a genuinely negative Korean
  // description (AI or DB note) so it is KEPT instead of replaced with a generic one.
  '발암', '암 위험', '암을', '암과', '암 및', '염증', '비만', '당뇨', '독성', '독소',
  '피하세요', '제한하세요', '제한하는', '초가공', '정제', '합성', '인공', '화학적', '용매', '헥산',
  '트랜스지방', '종양', '질환', '유해', '내분비 교란', '교란 물질', '신경독', '지방간',
  '대사 질환', '대사 증후군', '혈당', '오메가-6', '발암물질', '발암 물질', '중금속', '축적',
];

function hasNegativeTone(text: string): boolean {
  const lower = text.toLowerCase();
  return NEGATIVE_MARKERS_FOR_GREEN.some((kw) => lower.includes(kw));
}

// BUG 3 FIX — Marqueurs de ton POSITIF qui n'ont pas leur place sur un ingredient rouge/orange.
const POSITIVE_SPIN_MARKERS = [
  'natural', 'naturel', 'naturelle',
  'healthy', 'sain', 'saine', 'bienfait', 'benefique', 'beneficial',
  'safe', 'inoffensif', 'inoffensive', 'harmless',
  'approved', 'approuve', 'approuvee',
  'no concern', 'no risk', 'no health', 'pas de risque', 'pas de danger', 'sans danger', 'sans risque',
  'good for', 'bon pour', 'bonne pour', 'excellent', 'excellente',
  'generally recognized as safe', 'generally regarded as safe',
  'recommended', 'recommande', 'recommandee',
  'widely used', 'largement utilise', 'commonly used', 'couramment utilise',
  'essential nutrient', 'nutriment essentiel', 'essential mineral',
  'part of a balanced', 'balanced diet',
  'source of', 'source de', 'rich in', 'riche en',
  // Soft / minimizing phrases that must never appear on a red/orange ingredient.
  'in small amounts', 'in moderation', 'en petite quantite', 'en petites quantites', 'avec moderation',
  'helps', 'help to', 'aide a', 'aide au', 'contribue a', 'contributes to',
  'stabilize', 'stabilise', 'stabilizes', 'stabilise le ph', 'stabilizes ph', 'stabilize ph',
  'provides energy', 'quick energy', 'energie rapide', 'apporte de l energie', 'provides quick',
  'amino acid', 'acide amine', 'muscle repair', 'muscle building', 'reparation musculaire', 'construction musculaire',
  'nutritional value', 'valeur nutritive', 'valeur nutritionnelle',
  'vitamin', 'vitamine', 'mineral', 'minerale', 'antioxidant', 'antioxydant',
  'flavor', 'flavour', 'saveur', 'gout agreable', 'texture', 'palatable',
  'well tolerated', 'bien tolere', 'gras to', 'gras as',
  // Misleading "healthy-sounding" claims that must NEVER appear on a red/orange ingredient.
  'low glycemic', 'low-glycemic', 'low glycaemic', 'low gi', 'lower glycemic', 'lower the glycemic',
  'faible indice glycemique', 'indice glycemique bas', 'indice glycemique faible', 'faible ig',
  'low calorie', 'low-calorie', 'faible en calorie', 'peu calorique', 'pauvre en calorie',
  'low fat', 'fat free', 'fat-free', 'faible en gras', 'sans gras',
  'gluten free', 'gluten-free', 'sans gluten',
  'easily digestible', 'easy to digest', 'facile a digerer', 'facilement digestible', 'gentle on',
  'prebiotic', 'prebiotique', 'probiotic', 'probiotique',
  'wholesome', 'nourishing', 'nutritious', 'nutritif', 'nutritive', 'good source', 'great source',
  // Korean positive markers — flag reassuring spin wrongly placed on a red/orange ingredient.
  '건강에 좋', '풍부합니다', '풍부한', '유익균', '항산화', '항염', '면역력', '훌륭',
  '좋은 선택', '도움을 줍니다', '안심하고', '몸에 좋', '효능',
];

function hasPositiveSpin(text: string): boolean {
  const lower = text.toLowerCase();
  return POSITIVE_SPIN_MARKERS.some((kw) => lower.includes(kw));
}

// Disease-link markers — an ultra-processed/carcinogenic description MUST tie back to
// cancer, chronic inflammation, or a serious disease (rule #3).
const DISEASE_LINK_MARKERS = [
  'cancer', 'cancér', 'cancero', 'cancéro', 'carcinogen', 'carcinogène', 'carcinogene',
  'inflammation', 'inflammatoire', 'inflammatory',
  'obésit', 'obesit', 'obesity',
  'diabèt', 'diabet', 'diabetes',
  'cardiovascul',
  'stéatose', 'steatose', 'fatty liver', 'hépatique', 'hepatique',
  'métabolique', 'metabolique', 'metabolic',
  'tumeur', 'tumor', 'tumour',
  'maladie', 'disease',
  'neurotoxi', 'perturbateur endocrinien', 'endocrine',
  'rénaux', 'renaux', 'rénale', 'renale', 'kidney',
  // Korean disease-link markers.
  '발암', '암 위험', '암을', '암 및', '염증', '비만', '당뇨', '심혈관', '지방간',
  '대사 질환', '대사 증후군', '종양', '신장', '내분비 교란', '갑상선',
];

function hasDiseaseLink(text: string): boolean {
  const lower = text.toLowerCase();
  return DISEASE_LINK_MARKERS.some((kw) => lower.includes(kw));
}

// ─────────────────────────────────────────────────────────────────────
// SOURCE DE VÉRITÉ — base cancérigène / maladie d'un ingrédient.
// On ne lie un ingrédient au cancer ou à une maladie grave QUE si la base
// le justifie réellement : classification CIRC (Groupe 1/2A/2B) OU note déjà
// sourcée (obésité, diabète, stéatose…). Sinon un ingrédient ultra-transformé
// (vitamines de synthèse, minéraux/sels industriels…) est clôturé par le simple
// marqueur NOVA 4 — SANS inventer de lien avec le cancer.
// ─────────────────────────────────────────────────────────────────────

/** True when the CIRC classification itself encodes a carcinogenic basis. */
function circHasCancerBasis(circ: string): boolean {
  const c = normalizeForLookup(circ);
  return (
    c.includes('groupe 1') ||
    c.includes('groupe 2a') ||
    c.includes('groupe 2b') ||
    c.includes('cancer') ||
    c.includes('carcinogen') ||
    c.includes('benzene')
  );
}

/** True when an ingredient genuinely warrants a cancer/serious-disease mention. */
function entryHasCancerBasis(entry: IngredientEntry | null): boolean {
  if (!entry) return false;
  if (circHasCancerBasis(entry.circ)) return true;
  // A genuine disease link already curated in EITHER language note counts as a real basis.
  return hasDiseaseLink(entry.note ?? '') || hasDiseaseLink(entry.noteEn ?? '');
}

/** Closing clause for a cancer/disease-grounded ultra-processed ingredient. */
function diseaseClause(en: boolean): string {
  return pick({
    en: ' It is a marker of ultra-processed food linked to chronic inflammation and an increased risk of cancer and metabolic disease. Avoid regular consumption.',
    fr: ' C\'est un marqueur d\'aliment ultra-transformé lié à l\'inflammation chronique et à un risque accru de cancer et de maladies métaboliques. À éviter au quotidien.',
    ko: ' 만성 염증과 암 및 대사 질환 위험 증가와 관련된 초가공식품의 지표입니다. 정기적인 섭취를 피하세요.',
  });
}

/** Neutral NOVA 4 closer for ultra-processed ingredients WITHOUT a real cancer/disease basis. */
function novaClause(en: boolean, noteAlreadyHasMarker: boolean): string {
  if (noteAlreadyHasMarker) {
    return pick({ en: ' Avoid regular consumption (NOVA 4).', fr: ' À éviter au quotidien (NOVA 4).', ko: ' 정기적인 섭취를 피하세요 (NOVA 4).' });
  }
  return pick({
    en: ' Avoid regular consumption — a marker of ultra-processed food (NOVA 4).',
    fr: ' Éviter la consommation régulière — marqueur d\'aliment ultra-transformé (NOVA 4).',
    ko: ' 정기적인 섭취를 피하세요 — 초가공식품의 지표입니다 (NOVA 4).',
  });
}

// Force a SPECIFIC, negative description for red/orange ingredients (fallback generator level).
function buildNegativeDescription(name: string, risk: RiskLevel, entry: IngredientEntry | null): string {
  const en = isEnglish();
  const cancerBasis = entryHasCancerBasis(entry);
  // 1) Prefer the curated database note — it is ingredient-specific and accurate. We require a
  //    genuinely negative tone, then close it CORRECTLY: a cancer/disease link ONLY when the
  //    ingredient truly has that basis; otherwise a neutral NOVA 4 marker (never a fabricated cancer).
  const note = getLocalizedNote(entry)?.trim();
  if (note && hasNegativeTone(note)) {
    const lower = note.toLowerCase();
    // Already sourced with a disease link, or already an explicit NOVA 4 marker note → keep as-is.
    if (hasDiseaseLink(note) || /nova\s*4/.test(lower)) return note;
    if (cancerBasis) return note + diseaseClause(en);
    const noteHasMarker = lower.includes('marqueur') || lower.includes('marker');
    return note + novaClause(en, noteHasMarker);
  }
  // 2) No usable note → build a specific description from the ingredient name.
  const circInfo = entry?.circ ? ' (' + localizedCirc(entry.circ) + ')' : '';
  if (risk === 'danger') {
    if (cancerBasis) {
      return pick({
        en: name + ' is classified as a carcinogen' + circInfo + ' by the WHO/IARC — the same category of substances that cause cancer. Regular exposure damages cells and increases cancer risk, and it is especially harmful to children and pregnant women. This ingredient has NO health benefit; the food industry uses it only for preservation, color, or texture. Avoid it.',
        fr: name + ' est classé cancérigène' + circInfo + ' par l\'OMS/CIRC — la même catégorie de substances qui causent le cancer. Une exposition régulière endommage les cellules et augmente le risque de cancer, et c\'est particulièrement nocif pour les enfants et les femmes enceintes. Cet ingrédient n\'a AUCUN bénéfice santé ; l\'industrie ne l\'utilise que pour la conservation, la couleur ou la texture. À éviter.',
        ko: name + '은(는) WHO/IARC가 분류한 발암물질' + circInfo + '입니다 — 암을 유발하는 물질과 같은 범주입니다. 정기적인 노출은 세포를 손상시키고 암 위험을 높이며, 특히 어린이와 임산부에게 해롭습니다. 이 성분은 건강상 이점이 전혀 없으며, 식품 업계는 보존·착색·조질 용도로만 사용합니다. 피하세요.',
      });
    }
    // Dangerous but NOT carcinogenic (toxic / banned additive) — no fabricated cancer claim.
    return pick({
      en: name + ' is a toxic industrial substance' + circInfo + ', banned or restricted in food in several countries. It accumulates in the body and damages organs, with no health benefit whatsoever. Avoid it completely.',
      fr: name + ' est une substance industrielle toxique' + circInfo + ', interdite ou restreinte dans l\'alimentation de plusieurs pays. Elle s\'accumule dans l\'organisme et endommage les organes, sans aucun bénéfice santé. À éviter totalement.',
      ko: name + '은(는) 여러 나라에서 식품 사용이 금지되거나 제한된 독성 산업 물질' + circInfo + '입니다. 체내에 축적되어 장기를 손상시키며 건강상 이점이 전혀 없습니다. 완전히 피하세요.',
    });
  }
  // Orange (ultra-processed).
  if (cancerBasis) {
    return pick({
      en: name + ' is an ultra-processed industrial ingredient' + circInfo + '. It is produced through heavy chemical processing (refining, hydrogenation, solvents or high heat) that strips any nutritional value and creates compounds promoting chronic inflammation, obesity, type 2 diabetes and an increased risk of cancer. It has no real health benefit and is a marker of ultra-processed food (NOVA 4). Avoid regular consumption.',
      fr: name + ' est un ingrédient industriel ultra-transformé' + circInfo + '. Il est produit par un lourd procédé chimique (raffinage, hydrogénation, solvants, haute température) qui détruit toute valeur nutritive et crée des composés favorisant l\'inflammation chronique, l\'obésité, le diabète de type 2 et un risque accru de cancer. Il n\'a aucun bénéfice santé réel et c\'est un marqueur d\'aliment ultra-transformé (NOVA 4). À éviter au quotidien.',
      ko: name + '은(는) 초가공 산업 성분' + circInfo + '입니다. 정제·수소화·용매·고온 등 강력한 화학 공정으로 생산되어 영양가가 사라지고 만성 염증, 비만, 제2형 당뇨, 암 위험 증가를 유발하는 물질을 생성합니다. 실질적인 건강 이점이 없으며 초가공식품의 지표입니다(NOVA 4). 정기적인 섭취를 피하세요.',
    });
  }
  // Ultra-processed WITHOUT a proven cancer/disease basis (synthetic vitamins, industrial minerals/salts…).
  return pick({
    en: name + ' is an ultra-processed industrial ingredient' + circInfo + '. It is produced by a heavy industrial process that strips away any real nutritional value — a whole, natural food never needs it. Avoid regular consumption — a marker of ultra-processed food (NOVA 4).',
    fr: name + ' est un ingrédient industriel ultra-transformé' + circInfo + '. Il est produit par un lourd procédé industriel qui le prive de toute vraie valeur nutritive — un aliment entier et naturel n\'en a jamais besoin. Éviter la consommation régulière — marqueur d\'aliment ultra-transformé (NOVA 4).',
    ko: name + '은(는) 초가공 산업 성분' + circInfo + '입니다. 진짜 영양가를 없애는 강력한 산업 공정으로 만들어집니다 — 온전하고 자연스러운 식품에는 절대 필요 없는 성분입니다. 정기적인 섭취를 피하세요 — 초가공식품의 지표입니다(NOVA 4).',
  });
}

// BUG 1 FIX — No more generic fallback. Every description must be specific.
function buildPositiveFallback(name: string, note: string | undefined): string {
  if (note && note.trim() && !hasNegativeTone(note)) return note;
  // Use the specific ingredient name to craft a real description.
  const lowerName = name.toLowerCase();
  if (lowerName.includes('eau') || lowerName.includes('water')) {
    return pick({ en: 'Water is essential to life. It hydrates, transports nutrients, and regulates body temperature. Excellent for health.', fr: "L'eau est essentielle à la vie. Elle hydrate, transporte les nutriments et régule la température corporelle. Excellente pour la santé.", ko: '물은 생명에 필수적입니다. 수분을 공급하고 영양소를 운반하며 체온을 조절합니다. 건강에 매우 좋습니다.' });
  }
  if (lowerName.includes('sel') || lowerName.includes('salt')) {
    return pick({ en: 'Natural mineral essential for body function (water balance, nerve transmission). Healthy when consumed in moderation.', fr: 'Minéral essentiel au bon fonctionnement du corps (équilibre hydrique, transmission nerveuse). Sain consommé avec modération.', ko: '체내 기능(수분 균형, 신경 전달)에 필수적인 천연 미네랄입니다. 적당히 섭취하면 건강에 좋습니다.' });
  }
  if (lowerName.includes('huile') && (lowerName.includes('olive') || lowerName.includes('vierge'))) {
    return pick({ en: 'Cold-pressed virgin olive oil rich in monounsaturated fats and antioxidants. Excellent for heart health.', fr: "Huile d'olive vierge pressée à froid, riche en graisses mono-insaturées et antioxydants. Excellente pour la santé cardiovasculaire.", ko: '저온 압착한 엑스트라 버진 올리브유로 단일불포화지방과 항산화 물질이 풍부합니다. 심장 건강에 매우 좋습니다.' });
  }
  if (lowerName.includes('épice') || lowerName.includes('spice') || lowerName.includes('herb') || lowerName.includes('herbe') || lowerName.includes('poivre') || lowerName.includes('pepper') || lowerName.includes('cumin') || lowerName.includes('curcuma') || lowerName.includes('gingembre') || lowerName.includes('cannelle') || lowerName.includes('paprika') || lowerName.includes('piment') || lowerName.includes('basilic') || lowerName.includes('origan') || lowerName.includes('thym') || lowerName.includes('romarin')) {
    return pick({ en: 'Natural spice/herb with antioxidants and anti-inflammatory compounds. Adds flavor without calories. Excellent for home cooking.', fr: 'Épice ou herbe aromatique naturelle riche en antioxydants et composés anti-inflammatoires. Apporte saveur sans calories. Excellente pour la cuisine maison.', ko: '항산화 물질과 항염 성분이 풍부한 천연 향신료/허브입니다. 칼로리 없이 풍미를 더합니다. 집밥 요리에 훌륭합니다.' });
  }
  if (lowerName.includes('farine') && (lowerName.includes('complète') || lowerName.includes('whole'))) {
    return pick({ en: 'Whole grain flour rich in fiber, B vitamins, and minerals. Provides lasting energy and supports digestive health.', fr: 'Farine complète riche en fibres, vitamines B et minéraux. Apporte énergie durable et soutient la santé digestive.', ko: '식이섬유, 비타민 B, 미네랄이 풍부한 통곡물 가루입니다. 지속적인 에너지를 주고 소화 건강을 돕습니다.' });
  }
  if (lowerName.includes('farine') || lowerName.includes('flour')) {
    return pick({ en: 'Staple grain rich in complex carbohydrates and fiber. Provides lasting energy to the body.', fr: 'Céréale de base riche en glucides complexes et fibres. Apporte de l\'énergie durable au corps.', ko: '복합 탄수화물과 식이섬유가 풍부한 기본 곡물입니다. 몸에 지속적인 에너지를 공급합니다.' });
  }
  if (lowerName.includes('lait') || lowerName.includes('milk')) {
    return pick({ en: 'Natural source of calcium, protein, and vitamin D. Supports bone health and muscle function.', fr: 'Source naturelle de calcium, protéines et vitamine D. Soutient la santé osseuse et musculaire.', ko: '칼슘, 단백질, 비타민 D의 천연 공급원입니다. 뼈 건강과 근육 기능을 돕습니다.' });
  }
  if (lowerName.includes('œuf') || lowerName.includes('oeuf') || lowerName.includes('egg')) {
    return pick({ en: 'Whole eggs are a complete protein source rich in choline and B vitamins. Excellent nutritional value.', fr: 'Œuf entier, source de protéines complètes riche en choline et vitamines B. Excellente valeur nutritionnelle.', ko: '달걀은 콜린과 비타민 B가 풍부한 완전 단백질 공급원입니다. 영양가가 매우 높습니다.' });
  }
  if (lowerName.includes('fromage') || lowerName.includes('cheese') || lowerName.includes('mozzarella') || lowerName.includes('parmesan') || lowerName.includes('cheddar') || lowerName.includes('gouda') || lowerName.includes('emmental')) {
    return pick({ en: 'Traditional cheese, a source of protein and calcium. Contributes flavor and satiety.', fr: 'Fromage traditionnel, source de protéines et de calcium. Apporte goût et satiété.', ko: '전통 치즈로 단백질과 칼슘의 공급원입니다. 풍미와 포만감을 더합니다.' });
  }
  if (lowerName.includes('poulet') || lowerName.includes('chicken') || lowerName.includes('dinde') || lowerName.includes('turkey') || lowerName.includes('canard') || lowerName.includes('duck')) {
    return pick({ en: 'Lean poultry rich in high-quality protein, B vitamins, and selenium. Excellent for muscle building.', fr: 'Volaille maigre riche en protéines de qualité, vitamines B et sélénium. Excellent pour la construction musculaire.', ko: '양질의 단백질, 비타민 B, 셀레늄이 풍부한 담백한 가금류입니다. 근육 형성에 훌륭합니다.' });
  }
  if (lowerName.includes('bœuf') || lowerName.includes('boeuf') || lowerName.includes('beef') || lowerName.includes('porc') || lowerName.includes('pork') || lowerName.includes('agneau') || lowerName.includes('lamb') || lowerName.includes('veau') || lowerName.includes('veal')) {
    return pick({ en: 'Fresh unprocessed meat, a source of complete proteins, heme iron, and B12. Choose fresh cuts cooked simply.', fr: 'Viande fraîche non transformée, source de protéines complètes, fer héminique et B12. Préférer les morceaux frais cuisinés simplement.', ko: '가공하지 않은 신선한 고기로 완전 단백질, 헴철, 비타민 B12의 공급원입니다. 신선한 부위를 간단하게 조리해 드세요.' });
  }
  if (lowerName.includes('poisson') || lowerName.includes('fish') || lowerName.includes('saumon') || lowerName.includes('salmon') || lowerName.includes('thon') || lowerName.includes('tuna') || lowerName.includes('cabillaud') || lowerName.includes('cod')) {
    return pick({ en: 'Fresh fish, rich in high-quality protein and omega-3 fatty acids. Excellent for cardiovascular and brain health.', fr: 'Poisson frais riche en protéines de qualité et oméga-3. Excellent pour la santé cardiovasculaire et cérébrale.', ko: '양질의 단백질과 오메가-3가 풍부한 신선한 생선입니다. 심혈관과 뇌 건강에 매우 좋습니다.' });
  }
  if (lowerName.includes('fruit') || lowerName.includes('légume') || lowerName.includes('legume') || lowerName.includes('vegetable') || lowerName.includes('pomme') || lowerName.includes('apple') || lowerName.includes('banane') || lowerName.includes('carotte') || lowerName.includes('carrot') || lowerName.includes('tomate') || lowerName.includes('tomato')) {
    return pick({ en: 'Whole fruit or vegetable, rich in fiber, vitamins, minerals, and antioxidants. Essential for a balanced diet.', fr: 'Fruit ou légume entier, riche en fibres, vitamines, minéraux et antioxydants. Essentiel pour une alimentation équilibrée.', ko: '식이섬유, 비타민, 미네랄, 항산화 물질이 풍부한 온전한 과일/채소입니다. 균형 잡힌 식단에 필수적입니다.' });
  }
  if (lowerName.includes('vinaigre') || lowerName.includes('vinegar')) {
    return pick({ en: 'Natural vinegar from fermentation. Low-calorie flavor enhancer, beneficial for digestion.', fr: 'Vinaigre naturel issu de fermentation. Rehausseur de goût peu calorique, bénéfique pour la digestion.', ko: '발효로 만든 천연 식초입니다. 칼로리가 낮은 풍미 증진제로 소화에 도움을 줍니다.' });
  }
  if (lowerName.includes('miel') || lowerName.includes('honey')) {
    return pick({ en: 'Natural honey, rich in antioxidants and enzymes. A healthier sweetener than refined sugar when used in moderation.', fr: 'Miel naturel riche en antioxydants et enzymes. Édulcorant plus sain que le sucre raffiné, à utiliser avec modération.', ko: '항산화 물질과 효소가 풍부한 천연 꿀입니다. 적당히 사용하면 정제 설탕보다 건강한 감미료입니다.' });
  }
  if (lowerName.includes('levure') || lowerName.includes('yeast') || lowerName.includes('ferment') || lowerName.includes('culture')) {
    return pick({ en: 'Natural fermentation agent. Essential for bread and fermented foods. Beneficial for gut health.', fr: 'Agent de fermentation naturel. Essentiel pour le pain et les aliments fermentés. Bénéfique pour la flore intestinale.', ko: '천연 발효제입니다. 빵과 발효 식품에 필수적이며 장 건강에 유익합니다.' });
  }
  if (lowerName.includes('cacao') || lowerName.includes('cocoa') || lowerName.includes('chocolat') || lowerName.includes('chocolate')) {
    return pick({ en: 'Cocoa is rich in flavonoids and magnesium. Natural source of antioxidants with cardiovascular benefits.', fr: 'Cacao riche en flavonoïdes et magnésium. Source naturelle d\'antioxydants aux bénéfices cardiovasculaires.', ko: '코코아는 플라보노이드와 마그네슘이 풍부합니다. 심혈관에 이로운 천연 항산화 공급원입니다.' });
  }
  if (lowerName.includes('riz') || lowerName.includes('rice') || lowerName.includes('avoine') || lowerName.includes('oats') || lowerName.includes('quinoa') || lowerName.includes('céréale') || lowerName.includes('cereal') || lowerName.includes('grain')) {
    return pick({ en: 'Whole grain, a healthy source of complex carbohydrates and fiber. Provides slow-release energy.', fr: 'Céréale complète, source saine de glucides complexes et fibres. Fournit une énergie à libération lente.', ko: '복합 탄수화물과 식이섬유가 풍부한 건강한 통곡물입니다. 천천히 방출되는 에너지를 제공합니다.' });
  }
  if (lowerName.includes('noix') || lowerName.includes('nut') || lowerName.includes('amande') || lowerName.includes('almond') || lowerName.includes('noisette') || lowerName.includes('hazelnut') || lowerName.includes('cajou') || lowerName.includes('cashew') || lowerName.includes('pistache') || lowerName.includes('graine') || lowerName.includes('seed')) {
    return pick({ en: 'Nuts and seeds are rich in healthy fats, protein, fiber, and minerals. Excellent for heart health and satiety.', fr: 'Noix et graines riches en bonnes graisses, protéines, fibres et minéraux. Excellentes pour la santé cardiovasculaire et la satiété.', ko: '견과류와 씨앗은 건강한 지방, 단백질, 식이섬유, 미네랄이 풍부합니다. 심장 건강과 포만감에 훌륭합니다.' });
  }
  // Fallback descriptions must still be specific, not generic.
  return pick({
    en: `${name} is a natural ingredient. It is a source of nutrients that contributes to the nutritional value of this product.`,
    fr: `${name} est un ingrédient naturel. C'est une source de nutriments qui contribue à la valeur nutritionnelle de ce produit.`,
    ko: `${name}은(는) 천연 성분입니다. 이 제품의 영양 가치에 기여하는 영양소의 공급원입니다.`,
  });
}

// Markers used to classify UNKNOWN ingredients (not in the database). Shared between the
// AI path (classifyIngredients) and the instant local OCR path (classifyLocal) so the
// classification logic stays identical.
const INDUSTRIAL_MARKERS = ['chemically', 'industrially', 'synthetic', 'refined', 'imitation', 'modified', 'defatted', 'enriched', 'fortified', 'rehydrated', 'processed', 'extract', 'isolate', 'concentrate', 'hydrolyzed', 'chimiquement', 'industriellement', 'synthétique', 'synthetique', 'raffiné', 'raffine', 'modifié', 'modifie', 'déshydraté', 'deshydrate', 'enrichie', 'fortifié', 'fortifie', 'transformé', 'transforme', 'extrait', 'isolat', 'concentré', 'concentre', 'hydrolysé', 'hydrolyse'];
const WHOLE_FOOD_MARKERS = ['fresh ', 'frais ', 'entier', 'whole ', 'feuille', 'leaf'];

/** Deterministic risk for an ingredient absent from the database (unchanged heuristic). */
function classifyUnknownRisk(name: string, explication: string): RiskLevel {
  const lowerExplication = explication.toLowerCase();
  const lowerName = normalizeForLookup(name);
  const hasIndustrialMarker = INDUSTRIAL_MARKERS.some((kw) => lowerExplication.includes(kw) || lowerName.includes(kw));
  const isObviousWholeFood = WHOLE_FOOD_MARKERS.some((kw) => lowerName.includes(kw)) && !hasIndustrialMarker;
  return hasIndustrialMarker ? 'probable' : isObviousWholeFood ? 'aucun' : 'possible';
}

// ─────────────────────────────────────────────────────────────────────
// INSTANT LOCAL CLASSIFICATION — parses the OCR ingredient text directly and
// classifies it via the database WITHOUT waiting for the AI. Descriptions for
// known ingredients come straight from the database; unknown ingredients are
// marked `descriptionPending` so the AI can fill them in the background.
// ─────────────────────────────────────────────────────────────────────

/** Split the raw OCR ingredient block into individual ingredient names. */
function splitOcrIngredients(block: string): string[] {
  if (!block) return [];
  let text = block.replace(/\r/g, ' ');
  // Drop a leading "Ingrédients :" / "Ingredients:" header if present.
  const headerMatch = text.match(/ingr[ée]dien\w*\s*[:\-]?/i);
  if (headerMatch && headerMatch.index !== undefined) {
    text = text.substring(headerMatch.index + headerMatch[0].length);
  }
  // Split on commas / semicolons / newlines that are NOT inside parentheses or brackets.
  const segments: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[' || ch === '{') { depth++; current += ch; continue; }
    if (ch === ')' || ch === ']' || ch === '}') { depth = Math.max(0, depth - 1); current += ch; continue; }
    if (depth === 0 && (ch === ',' || ch === ';' || ch === '\n' || ch === '•' || ch === '|')) {
      if (current.trim()) segments.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) segments.push(current.trim());

  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const seg of segments) {
    let s = seg
      .replace(/\.+$/, '')
      .replace(/^[\s\-•*:]+/, '')
      .replace(/\b\d+([.,]\d+)?\s*%/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!s || s.length < 2) continue;
    if (/^(contient|contains|peut contenir|may contain|traces)/i.test(s)) continue;
    if (/^[\d\s.,%*]+$/.test(s)) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(s);
  }
  return cleaned;
}

// ─────────────────────────────────────────────────────────────────
// HUILE DE PALME — GARDE-FOU ABSOLU. Palm fat in ANY form (palm oil, palm kernel,
// olein, stearin, shortening, "sustainable"/organic included) is Group 2A via
// 3-MCPD/glycidyl esters → minimum ORANGE. Applied as deterministic post-processing
// on BOTH classification paths so neither OCR variants nor a mistaken AI answer can
// ever surface palm oil as green or yellow.
// ─────────────────────────────────────────────────────────────────

const PALM_FAT_CONTEXT = ['huile', 'oil', 'graisse', 'grease', 'fat', 'olein', 'oleine', 'stearin', 'stearine', 'shortening', 'matiere grasse', 'beurre de palme', 'palmiste', 'palm kernel', '팔유', '팔핵유'];
const PALM_FAT_EXCLUSIONS = ['sucre', 'sugar', 'palmitate', 'coeur de palmier', 'coeurs de palmier', 'heart of palm', 'hearts of palm', 'palm heart', '팔 설탕'];

/** True when the ingredient name designates a palm FAT (not palm sugar / hearts of palm / palmitate). */
function isPalmFatName(name: string): boolean {
  const n = normalizeForLookup(name);
  if (!n) return false;
  const mentionsPalm = n.includes('palm') || n.includes('팔유') || n.includes('팔핵');
  if (!mentionsPalm) return false;
  if (PALM_FAT_EXCLUSIONS.some((x) => n.includes(x))) return false;
  return PALM_FAT_CONTEXT.some((x) => n.includes(x));
}

/** Forces palm fat to at least ORANGE (Group 2A) with the curated database description. */
function enforcePalmOilFloor(sub: SubstanceDetected): SubstanceDetected {
  if (sub.niveau_risque === 'danger' || sub.niveau_risque === 'probable') return sub;
  if (!isPalmFatName(sub.nom)) return sub;
  const entry = lookupIngredient('huile de palme');
  console.log('[Classify] PALM OIL floor — "' + sub.nom + '" was ' + sub.niveau_risque + ' → forced probable (Groupe 2A).');
  return {
    ...sub,
    niveau_risque: 'probable',
    classification_circ: entry?.circ ?? 'Groupe 2A (3-MCPD/glycidol)',
    explication: buildNegativeDescription(sub.nom, 'probable', entry ?? null),
    descriptionPending: false,
  };
}

/** Classify ingredient names parsed locally from OCR. Known → DB description now; unknown → pending. */
function classifyLocal(names: string[]): SubstanceDetected[] {
  return names
    .map((raw) => raw.trim())
    .filter((name) => name.length >= 2 && !ALLERGEN_LINE_REGEX.test(name))
    .map((name) => {
      let entry = lookupIngredient(name);
      if (isCompoundRefinedSugar(name) && REFINED_SUGAR_ENTRY && (!entry || (entry.risk !== 'danger' && entry.risk !== 'probable'))) {
        entry = REFINED_SUGAR_ENTRY;
      }
      if (entry) {
        let explication = getLocalizedNote(entry) ?? '';
        if (entry.risk === 'aucun') {
          if (!explication || hasNegativeTone(explication)) {
            explication = buildPositiveFallback(name, getLocalizedNote(entry));
          }
        } else if (entry.risk === 'danger' || entry.risk === 'probable') {
          if (!explication || hasPositiveSpin(explication) || !hasNegativeTone(explication)) {
            explication = buildNegativeDescription(name, entry.risk, entry);
          }
        }
        return {
          nom: name,
          code: entry.code,
          classification_circ: entry.circ,
          niveau_risque: entry.risk,
          explication,
          source_exposition: null,
          descriptionPending: false,
        };
      }
      // Unknown ingredient → deterministic risk now, description filled later by the AI.
      const fallbackRisk = classifyUnknownRisk(name, '');
      return {
        nom: name,
        code: null,
        classification_circ: pick({ en: 'Not classified by IARC', fr: 'Non classé par le CIRC', ko: 'IARC 미분류' }),
        niveau_risque: fallbackRisk,
        explication: '',
        source_exposition: null,
        descriptionPending: true,
      };
    })
    .map(enforcePalmOilFloor);
}

function classifyIngredients(aiIngredients: { nom: string; explication: string }[]): SubstanceDetected[] {
  // BUG 4 FIX — Skip "Contains:" allergen declaration lines that the AI might still parse.
  const filtered = aiIngredients.filter((ing) => {
    const name = ing.nom.trim();
    if (ALLERGEN_LINE_REGEX.test(name)) {
      console.log('[Classify] SKIP allergen line: "' + name + '"');
      return false;
    }
    if (name.length < 2) {
      console.log('[Classify] SKIP empty/short name: "' + name + '"');
      return false;
    }
    return true;
  });
  return filtered.map((ing) => {
    let entry = lookupIngredient(ing.nom);
    if (isCompoundRefinedSugar(ing.nom) && REFINED_SUGAR_ENTRY && (!entry || (entry.risk !== 'danger' && entry.risk !== 'probable'))) {
      entry = REFINED_SUGAR_ENTRY;
    }

    if (entry) {
      console.log('[Classify] "' + ing.nom + '" → ' + entry.risk + ' (' + entry.circ + ')');

      let explication = ing.explication || (getLocalizedNote(entry) ?? '');

      // 🟢 Anti-contradiction : si l'ingredient est VERT mais l'IA a ecrit du negatif.
      if (entry.risk === 'aucun' && explication && hasNegativeTone(explication)) {
        explication = buildPositiveFallback(ing.nom, getLocalizedNote(entry));
        console.log('[Classify] GREEN override — "' + ing.nom + '" : AI tone was negative, replaced.');
      }

      // 🔴🟠 ULTRA-PROCESSED / CARCINOGENIC enforcement (rule applied at the post-processing level).
      // For a red/orange ingredient the description must ALWAYS be negative AND specific. We replace it
      // when it is missing, carries any positive spin, OR is merely neutral (no danger/disease tone) —
      // this is what catches cases like HFCS "low glycemic index" or a flavor described too softly.
      if (
        (entry.risk === 'danger' || entry.risk === 'probable') &&
        (!explication || hasPositiveSpin(explication) || !hasNegativeTone(explication))
      ) {
        explication = buildNegativeDescription(ing.nom, entry.risk, entry);
        console.log('[Classify] BADGE override — "' + ing.nom + '" (' + entry.risk + ') : forced specific negative description.');
      }

      return {
        nom: ing.nom,
        code: entry.code,
        classification_circ: entry.circ,
        niveau_risque: entry.risk,
        explication,
        source_exposition: null,
      };
    }

    // BUG 1 FIX — No more generic fallback for unknown ingredients.
    const explication = ing.explication || pick({
      en: `${ing.nom} is not listed in the ToxiScan database. Its health impact cannot be determined from available data.`,
      fr: `${ing.nom} n'est pas répertorié dans la base de données ToxiScan. Son impact sur la santé ne peut être déterminé à partir des données disponibles.`,
      ko: `${ing.nom}은(는) ToxiScan 데이터베이스에 등록되어 있지 않습니다. 현재 데이터로는 건강 영향을 판단할 수 없습니다.`,
    });
    // Fallback STRICT : un ingrédient inconnu = JAUNE par défaut (modération).
    // Un vrai ingrédient sain (eau, sel, œuf, épice…) doit être dans la base. Si on ne le connaît pas,
    // on ne peut PAS supposer qu'il est sain — surtout dans un produit industriel.
    // Seuls quelques mots-clés très spécifiques (fruits/légumes/herbes entiers) peuvent rester verts.
    const fallbackRisk: RiskLevel = classifyUnknownRisk(ing.nom, explication);
    console.log('[Classify] "' + ing.nom + '" → NON TROUVÉ → ' + fallbackRisk);
    // Even for unknown ingredients, an ULTRA-PROCESSED classification must carry a specific,
    // negative description — never a positive/neutral or generic "not listed" fallback.
    const finalExplication =
      fallbackRisk === 'probable' && (hasPositiveSpin(explication) || !hasNegativeTone(explication))
        ? buildNegativeDescription(ing.nom, 'probable', null)
        : explication;
    return {
      nom: ing.nom,
      code: null,
      classification_circ: pick({ en: 'Not classified by IARC', fr: 'Non classé par le CIRC', ko: 'IARC 미분류' }),
      niveau_risque: fallbackRisk,
      explication: finalExplication,
      source_exposition: null,
    };
  }).map(enforcePalmOilFloor);
}

// ═══════════════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════════════

const ANALYSIS_CACHE = new Map<string, UniversalAnalysisResult>();
const CACHE_MAX = 50;

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h);
}

// ═══════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════

export interface OcrData {
  fullText: string;
  ingredientsBlock: string | null;
}

export interface InstantScan {
  /** Instant result built locally from OCR (or the cached full result). */
  result: UniversalAnalysisResult;
  ocrData: OcrData;
  cacheKey: string | null;
  /** True when the result is the cached/final result — no AI enrichment needed. */
  cached: boolean;
  /** True when a usable instant local verdict was produced (at least one ingredient parsed). */
  instant: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// PRODUCT NAME — never display an "unknown product" placeholder. When the AI
// cannot read a brand/name (blurry photo, only the ingredient panel visible, or
// a template echo like "Unknown brand plus product name"), we fall back to a
// clean category label derived from what was actually read on the label.
// ─────────────────────────────────────────────────────────────────────

/** Localized human label used when no real product name could be identified. */
function genericProductName(category: ProductCategory): string {
  switch (category) {
    case 'beverage':        return pick({ en: 'Beverage', fr: 'Boisson', ko: '음료' });
    case 'cosmetic':        return pick({ en: 'Cosmetic product', fr: 'Produit cosmétique', ko: '화장품' });
    case 'household':       return pick({ en: 'Household product', fr: 'Produit ménager', ko: '생활용품' });
    case 'kitchen_utensil': return pick({ en: 'Kitchen item', fr: 'Ustensile de cuisine', ko: '주방용품' });
    case 'clothing':        return pick({ en: 'Textile item', fr: 'Article textile', ko: '섬유 제품' });
    case 'electronics':     return pick({ en: 'Electronic device', fr: 'Appareil électronique', ko: '전자기기' });
    case 'furniture':       return pick({ en: 'Furniture item', fr: 'Meuble', ko: '가구' });
    case 'toy':             return pick({ en: 'Toy', fr: 'Jouet', ko: '장난감' });
    case 'food':            return pick({ en: 'Food product', fr: 'Produit alimentaire', ko: '식품' });
    case 'other':
    default:                return pick({ en: 'Scanned product', fr: 'Produit scanné', ko: '스캔한 제품' });
  }
}

// Names the model sometimes returns when it cannot identify the product.
const EXACT_PLACEHOLDER_NAMES: ReadonlySet<string> = new Set([
  'na', 'n a', 'none', 'null', 'undefined', 'nan', 'tbd', 'product', 'produit',
  'item', 'objet', 'analyse', 'analyzing', 'analysing',
]);
const CONTAINS_UNKNOWN_REGEX = /(unknown|inconnu|unidentified|unnamed|non identifie|not identified)/;
const TEMPLATE_ECHO_REGEX = /(brand\s*(\+|plus|and|&)?\s*product|product\s+name|nom\s+(du\s+)?produit|marque\s*(\+|et)\s*(produit|nom))/;

/** True when `name` is empty or a generic placeholder rather than a real product name. */
function isPlaceholderName(name: string): boolean {
  const raw = (name ?? '').trim();
  if (raw.length < 2) return true;
  const norm = normalizeForLookup(raw);
  if (!norm) return true;
  if (EXACT_PLACEHOLDER_NAMES.has(norm)) return true;
  if (CONTAINS_UNKNOWN_REGEX.test(norm)) return true;
  if (TEMPLATE_ECHO_REGEX.test(norm)) return true;
  return false;
}

/** Guarantee a clean, non-"unknown" product name, deriving a category label when needed. */
function sanitizeProductName(rawName: string, category: ProductCategory): string {
  if (isPlaceholderName(rawName)) return genericProductName(category);
  return rawName.trim();
}

/** Assemble a full UniversalAnalysisResult from classified substances + product meta. */
function assembleResult(
  meta: { categorie_produit: ProductCategory; objet_identifie: string; materiau_detecte: string; erreur?: string },
  substances: SubstanceDetected[],
): UniversalAnalysisResult {
  const riskOrder: Record<RiskLevel, number> = { danger: 0, probable: 1, possible: 2, aucun: 3 };
  const sorted = [...substances].sort((a, b) => riskOrder[a.niveau_risque] - riskOrder[b.niveau_risque]);
  const isCosmetic = meta.categorie_produit === 'cosmetic';
  const nonFoodDomain: NonFoodDomain | null =
    meta.categorie_produit === 'household' ? 'household'
    : meta.categorie_produit === 'clothing' ? 'textile'
    : meta.categorie_produit === 'kitchen_utensil' ? 'kitchen'
    : null;
  // 🎯 6 TIERS pour l'alimentaire ; cosmétique et non-alimentaire gardent leurs échelles propres.
  let badge_global: RiskLevel;
  let verdict_tier: VerdictTier;
  if (isCosmetic) {
    badge_global = computeCosmeticBadgeGlobal(sorted);
    verdict_tier = legacyBadgeToTier(badge_global);
  } else if (nonFoodDomain) {
    badge_global = computeBadgeGlobal(sorted);
    verdict_tier = legacyBadgeToTier(badge_global);
  } else {
    verdict_tier = computeVerdictTier(sorted);
    badge_global = tierToLegacyBadge(verdict_tier);
  }
  const resume = isCosmetic
    ? generateCosmeticResume(badge_global, sorted)
    : nonFoodDomain
      ? generateNonFoodResume(nonFoodDomain, badge_global, sorted)
      : generateResume(verdict_tier, sorted);
  const recommandations = isCosmetic
    ? generateCosmeticRecommendations(badge_global, sorted)
    : nonFoodDomain
      ? generateNonFoodRecommendations(nonFoodDomain, badge_global)
      : generateRecommendations(badge_global, sorted);
  return {
    categorie_produit: meta.categorie_produit,
    objet_identifie: sanitizeProductName(meta.objet_identifie, meta.categorie_produit),
    materiau_detecte: meta.materiau_detecte || '',
    substances_detectees: sorted,
    badge_global,
    verdict_tier,
    resume,
    recommandations,
    alternatives_sures: [],
    alternatives_saines: [],
    erreur: meta.erreur || '',
  };
}

function buildErrorResult(messageKey: 'error_analyze_product' | 'error_process_photo'): UniversalAnalysisResult {
  return {
    categorie_produit: 'other',
    objet_identifie: genericProductName('other'),
    materiau_detecte: '',
    substances_detectees: [],
    badge_global: 'aucun',
    verdict_tier: 'approved',
    resume: '',
    recommandations: [],
    alternatives_sures: [],
    erreur: t(messageKey),
  };
}

// Lines that are clearly NOT a product name (label boilerplate) — skipped when guessing.
const NON_NAME_LINE_REGEX = /(ingr[ée]dien|valeurs?\s+nutri|nutrition\s+facts|best\s+before|à\s+consommer|conserv|fabriqu|distribu|emball|poids\s+net|net\s+w|contient|contains|allerg|www\.|https?:|\d{6,})/i;

/** Rough product-name guess from raw OCR text, shown instantly until the AI returns the real name. */
function guessProductName(fullText: string): string | null {
  const lines = fullText.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (NON_NAME_LINE_REGEX.test(line)) continue;
    if (line.length < 3 || line.length > 40) continue;
    if (/^[\d\s.,%*]+$/.test(line)) continue;
    // Require at least 3 letters so we never surface a barcode / weight / code line.
    if (line.replace(/[^a-zA-ZÀ-ÿ]/g, '').length < 3) continue;
    return line;
  }
  return null;
}

/** Fill any still-pending descriptions (used when the AI enrichment fails, to stop loading spinners). */
function finalizeInstant(result: UniversalAnalysisResult): UniversalAnalysisResult {
  const substances = result.substances_detectees.map((s) => {
    if (!s.descriptionPending) return s;
    let explication = s.explication?.trim() ?? '';
    if (!explication) {
      explication = s.niveau_risque === 'danger' || s.niveau_risque === 'probable'
        ? buildNegativeDescription(s.nom, s.niveau_risque, lookupIngredient(s.nom))
        : pick({
            en: `${s.nom} is not listed in the ToxiScan database. Its health impact cannot be determined from available data.`,
            fr: `${s.nom} n'est pas répertorié dans la base de données ToxiScan. Son impact sur la santé ne peut être déterminé à partir des données disponibles.`,
            ko: `${s.nom}은(는) ToxiScan 데이터베이스에 등록되어 있지 않습니다. 현재 데이터로는 건강 영향을 판단할 수 없습니다.`,
          });
    }
    return { ...s, explication, descriptionPending: false };
  });
  return { ...result, substances_detectees: substances };
}

async function runOcrStep(imageBase64: string): Promise<{ ocrData: OcrData; cacheKey: string | null }> {
  let ocrData: OcrData = { fullText: '', ingredientsBlock: null };
  try {
    const ocr = await runGoogleVisionOcr(imageBase64);
    ocrData = { fullText: ocr.fullText, ingredientsBlock: extractIngredientsBlock(ocr.fullText) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[API] OCR failed (non-blocking):', msg);
  }
  const cacheKey = ocrData.ingredientsBlock
    ? hashString(ocrData.ingredientsBlock.toLowerCase().replace(/\s+/g, ' ').trim())
    : null;
  return { ocrData, cacheKey };
}

/**
 * STEP 1 — Runs OCR then classifies the label locally via the database, producing an
 * INSTANT verdict (~1s) without waiting for the AI. Known ingredients carry their database
 * description immediately; unknown ones are flagged `descriptionPending` for the AI to fill.
 */
export async function scanOcrInstant(imageBase64: string): Promise<InstantScan> {
  const { ocrData, cacheKey } = await runOcrStep(imageBase64);

  if (cacheKey && ANALYSIS_CACHE.has(cacheKey)) {
    console.log('[API] Cache hit (instant)');
    return { result: ANALYSIS_CACHE.get(cacheKey)!, ocrData, cacheKey, cached: true, instant: true };
  }

  const source = ocrData.ingredientsBlock || ocrData.fullText;
  const names = splitOcrIngredients(source);
  // Detect a cosmetic INCI list and route it to the SEPARATE cosmetic engine.
  const isCosmetic = looksLikeCosmetic(names);
  const substances = isCosmetic ? classifyCosmeticNames(names) : classifyLocal(names);
  console.log('[API] Instant local classification —', substances.length, 'ingredients parsed from OCR', isCosmetic ? '(cosmetic)' : '(food)');

  // A clean OCR guess shows instantly; assembleResult sanitizes empty/placeholder
  // guesses into a category label so we never flash an "unknown product".
  const guessedName = guessProductName(ocrData.fullText) ?? '';
  const result = assembleResult(
    {
      categorie_produit: isCosmetic ? 'cosmetic' : 'food',
      objet_identifie: guessedName,
      materiau_detecte: '',
    },
    substances,
  );

  return { result, ocrData, cacheKey, cached: false, instant: substances.length > 0 };
}

/**
 * STEP 2 — Full AI analysis (runs in the background after the instant verdict). Reads the
 * label, writes descriptions for every ingredient, then classifies via the same database
 * logic. This is the authoritative final result and replaces the instant one.
 */
export async function scanAiEnrich(
  imageBase64: string,
  ocrData: OcrData,
  cacheKey: string | null,
  instantResult?: UniversalAnalysisResult,
): Promise<UniversalAnalysisResult> {
  const MAX_RETRIES = 2;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log('[API] AI enrich attempt', attempt);
      const aiResult = await callAI(
        imageBase64,
        ocrData.fullText || undefined,
        ocrData.ingredientsBlock || undefined,
      );
      if (!aiResult || !aiResult.categorie_produit) {
        throw new Error(pick({ en: 'Invalid AI result', fr: 'Résultat IA invalide', ko: 'AI 결과가 올바르지 않습니다' }));
      }

      // Cosmetic if the AI says so OR the INCI list clearly looks cosmetic.
      const aiNames = aiResult.ingredients_lus.map((i) => i.nom);
      const isCosmetic = aiResult.categorie_produit === 'cosmetic' || looksLikeCosmetic(aiNames);
      const substances = isCosmetic
        ? classifyCosmeticNames(aiNames)
        : classifyIngredients(aiResult.ingredients_lus);
      const result = assembleResult(
        {
          categorie_produit: isCosmetic ? 'cosmetic' : aiResult.categorie_produit,
          objet_identifie: aiResult.objet_identifie,
          materiau_detecte: aiResult.materiau_detecte || '',
          erreur: aiResult.erreur || '',
        },
        substances,
      );

      console.log('[API] Final:', result.objet_identifie, '— badge:', result.badge_global, '— substances:', substances.length);

      if (cacheKey && !result.erreur) {
        if (ANALYSIS_CACHE.size >= CACHE_MAX) {
          const firstKey = ANALYSIS_CACHE.keys().next().value;
          if (firstKey) ANALYSIS_CACHE.delete(firstKey);
        }
        ANALYSIS_CACHE.set(cacheKey, result);
      }
      return result;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[API] AI enrich error (attempt ' + attempt + '):', errorMsg);
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 250));
        continue;
      }
      // AI failed: keep the instant local verdict but stop the loading spinners.
      return instantResult ? finalizeInstant(instantResult) : buildErrorResult('error_analyze_product');
    }
  }
  return instantResult ? finalizeInstant(instantResult) : buildErrorResult('error_process_photo');
}

// ═══════════════════════════════════════════════════════════════════════
// RÉSUMÉS DÉTERMINISTES
// ═══════════════════════════════════════════════════════════════════════

function generateResume(tier: VerdictTier, substances: SubstanceDetected[]): string {
  const dangerSubst = substances.filter(s => s.niveau_risque === 'danger');
  const carcinogenNames = (dangerSubst.length > 0 ? dangerSubst : substances.filter(s => bucketSubstance(s) === 'g2a'))
    .slice(0, 2).map(s => s.nom).join(', ');

  if (tier === 'ultra_toxic') {
    return pick({
      en: `This is the worst of both worlds: this product contains carcinogen-linked ingredients${carcinogenNames ? ` (${carcinogenNames})` : ''} AND a massive accumulation of ultra-processed ingredients. The cumulative load multiplies the impact on inflammation, gut microbiome and metabolism. Do not consume it — find a clean alternative.`,
      fr: `C'est le pire des deux mondes : ce produit contient des ingrédients liés au cancer${carcinogenNames ? ` (${carcinogenNames})` : ''} ET une accumulation massive d'ingrédients ultra-transformés. La charge cumulée multiplie l'impact sur l'inflammation, le microbiote et le métabolisme. N'en consomme pas — trouve une alternative saine.`,
      ko: `최악의 조합입니다: 이 제품에는 암과 관련된 성분${carcinogenNames ? ` (${carcinogenNames})` : ''}과 초가공 성분의 대량 축적이 함께 들어 있습니다. 누적 부담이 염증, 장내 미생물, 대사에 미치는 영향을 증폭시킵니다. 섭취하지 마세요 — 깨끗한 대안을 찾으세요.`,
    });
  }

  if (tier === 'carcinogenic') {
    return pick({
      en: `This product contains ingredients classified as confirmed carcinogens (IARC Group 1)${carcinogenNames ? ` (${carcinogenNames})` : ''}. I strongly advise against consuming it — look for a healthier alternative.`,
      fr: `Ce produit contient des ingrédients classés cancérigènes avérés (Groupe 1 CIRC)${carcinogenNames ? ` (${carcinogenNames})` : ''}. Je te déconseille fortement d'en consommer — cherche une alternative plus saine.`,
      ko: `이 제품에는 확인된 발암물질(IARC 1군)로 분류된 성분${carcinogenNames ? ` (${carcinogenNames})` : ''}이 들어 있습니다. 섭취를 강력히 권하지 않습니다 — 더 건강한 대안을 찾아보세요.`,
    });
  }

  if (tier === 'toxic') {
    return pick({
      en: `This product crosses the toxicity threshold: it contains ingredients close to carcinogens (IARC 2A/2B) or a heavy accumulation of ultra-processed ingredients. Avoid it as much as possible and prefer a natural alternative.`,
      fr: `Ce produit franchit le seuil de toxicité : il contient des ingrédients proches des cancérigènes (CIRC 2A/2B) ou une forte accumulation d'ingrédients ultra-transformés. Évite-le autant que possible et préfère une alternative naturelle.`,
      ko: `이 제품은 독성 기준을 넘었습니다: 발암물질에 가까운 성분(IARC 2A/2B)이나 초가공 성분의 과다 축적이 포함되어 있습니다. 최대한 피하고 천연 대안을 선택하세요.`,
    });
  }

  if (tier === 'processed') {
    return pick({
      en: `This product is industrially processed: it contains several ultra-processed ingredients without serious danger. Consume it occasionally and prefer products with a short, natural ingredient list.`,
      fr: `Ce produit est transformé industriellement : il contient plusieurs ingrédients ultra-transformés, sans danger grave. Consomme-le occasionnellement et préfère des produits à liste courte et naturelle.`,
      ko: `이 제품은 산업적으로 가공된 제품입니다: 심각한 위험은 없지만 초가공 성분이 여러 개 들어 있습니다. 가끔만 드시고 성분이 짧고 자연스러운 제품을 선택하세요.`,
    });
  }

  if (tier === 'moderation') {
    return pick({
      en: `This product contains a few processed or controversial ingredients. You can consume it occasionally.`,
      fr: `Ce produit contient quelques ingrédients transformés ou controversés. Tu peux en consommer occasionnellement, mais évite d'en faire un aliment du quotidien.`,
      ko: `이 제품에는 가공되었거나 논란이 있는 성분이 몇 가지 들어 있습니다. 가끔은 드셔도 되지만 매일 먹는 식품으로 삼지는 마세요.`,
    });
  }

  return pick({
    en: `This product is overall very good. The vast majority of ingredients are natural and healthy.`,
    fr: `Ce produit est globalement très bon. La grande majorité des ingrédients sont naturels et sains.`,
    ko: `이 제품은 전반적으로 매우 좋습니다. 대부분의 성분이 자연스럽고 건강합니다.`,
  });
}

function generateRecommendations(badge: RiskLevel, substances: SubstanceDetected[]): string[] {
  const recs: string[] = [];

  const pregnancyIssues = substances.filter(s =>
    DANGER_PREGNANCY.some(p => normalizeForLookup(s.nom).includes(normalizeForLookup(p)))
  );
  if (pregnancyIssues.length > 0) {
    recs.push(pick({
      en: '⚠️ This product contains substances not recommended during pregnancy. Consult a healthcare professional.',
      fr: '⚠️ Ce produit contient des substances déconseillées pendant la grossesse. Consulte un professionnel de santé.',
      ko: '⚠️ 이 제품에는 임신 중 권장되지 않는 성분이 들어 있습니다. 의료 전문가와 상담하세요.',
    }));
  }

  if (badge === 'danger' || badge === 'probable') {
    recs.push(pick({
      en: 'Look for organic alternatives without controversial additives.',
      fr: 'Privilégie des alternatives bio sans additifs controversés.',
      ko: '논란이 있는 첨가물이 없는 유기농 대안을 우선하세요.',
    }));
    recs.push(pick({
      en: 'Read labels carefully and avoid ultra-processed products.',
      fr: 'Lis attentivement les étiquettes et évite les produits ultra-transformés.',
      ko: '라벨을 꼼꼼히 읽고 초가공 제품을 피하세요.',
    }));
  } else if (badge === 'possible') {
    recs.push(pick({
      en: 'Consume in moderation as part of a balanced diet.',
      fr: 'Consomme avec modération dans le cadre d\'une alimentation équilibrée.',
      ko: '균형 잡힌 식단의 일부로 적당히 드세요.',
    }));
  } else {
    recs.push(pick({
      en: 'Continue choosing products with simple and natural ingredients.',
      fr: 'Continue de choisir des produits avec des ingrédients simples et naturels.',
      ko: '간단하고 자연스러운 성분의 제품을 계속 선택하세요.',
    }));
  }

  return recs;
}

// ─────────────────────────────────────────────────────────────────────
// RÉSUMÉS + RECOMMANDATIONS COSMÉTIQUES (séparés de l'alimentaire)
// ─────────────────────────────────────────────────────────────────────

function generateCosmeticResume(badge: RiskLevel, substances: SubstanceDetected[]): string {
  if (badge === 'danger') {
    const names = substances.filter((s) => s.niveau_risque === 'danger').slice(0, 2).map((s) => s.nom).join(', ');
    return pick({
      en: `This cosmetic contains ingredients recognized as hazardous${names ? ` (${names})` : ''} — endocrine disruptors or substances linked to cancer. Avoid it and choose a clean alternative.`,
      fr: `Ce cosmétique contient des ingrédients reconnus dangereux${names ? ` (${names})` : ''} — perturbateurs endocriniens ou substances liées au cancer. À éviter, choisis une alternative clean.`,
      ko: `이 화장품에는 위험한 것으로 알려진 성분${names ? ` (${names})` : ''}이 들어 있습니다 — 내분비 교란 물질이나 암과 관련된 물질입니다. 사용을 피하고 클린 대안을 선택하세요.`,
    });
  }
  if (badge === 'possible') {
    return pick({
      en: `This cosmetic contains several controversial ingredients with divided science. Use it occasionally and prefer a cleaner formula.`,
      fr: `Ce cosmétique contient plusieurs ingrédients controversés à la science partagée. À utiliser occasionnellement, préfère une formule plus clean.`,
      ko: `이 화장품에는 과학적 의견이 갈리는 논란성 성분이 여러 개 들어 있습니다. 가끔만 사용하고 더 클린한 포뮬러를 선택하세요.`,
    });
  }
  return pick({
    en: `This cosmetic is made of ingredients with no known risk. A clean choice for your skin.`,
    fr: `Ce cosmétique est composé d'ingrédients sans risque connu. Un choix clean pour ta peau.`,
    ko: `이 화장품은 알려진 위험이 없는 성분으로 만들어졌습니다. 피부를 위한 클린한 선택입니다.`,
  });
}

function generateCosmeticRecommendations(badge: RiskLevel, substances: SubstanceDetected[]): string[] {
  const recs: string[] = [];

  const hasPregnancyRisk = substances.some((s) => {
    if (s.niveau_risque !== 'danger') return false;
    return classifyCosmeticIngredient(s.nom)?.pregnancyDanger === true;
  });
  if (hasPregnancyRisk) {
    recs.push(pick({
      en: '⚠️ This product contains ingredients to avoid during pregnancy. Ask a healthcare professional.',
      fr: '⚠️ Ce produit contient des ingrédients à éviter pendant la grossesse. Demande conseil à un professionnel de santé.',
      ko: '⚠️ 이 제품에는 임신 중 피해야 할 성분이 들어 있습니다. 의료 전문가에게 상담하세요.',
    }));
  }

  if (badge === 'danger') {
    recs.push(pick({
      en: 'Avoid this product and pick a "clean" / EWG Verified alternative.',
      fr: 'Évite ce produit et choisis une alternative « clean » / EWG Verified.',
      ko: '이 제품을 피하고 "클린" / EWG 인증 대안을 선택하세요.',
    }));
    recs.push(pick({
      en: 'Check the INCI list on the EWG Skin Deep or Yuka app before buying.',
      fr: 'Vérifie la liste INCI sur l\'app EWG Skin Deep ou Yuka avant d\'acheter.',
      ko: '구매 전 EWG Skin Deep 또는 Yuka 앱에서 성분(INCI) 목록을 확인하세요.',
    }));
  } else if (badge === 'possible') {
    recs.push(pick({
      en: 'Limit use and prefer fragrance-free, silicone-free formulas when possible.',
      fr: 'Limite l\'usage et préfère des formules sans parfum ni silicone quand c\'est possible.',
      ko: '사용을 제한하고 가능하면 무향·무실리콘 포뮬러를 선택하세요.',
    }));
  } else {
    recs.push(pick({
      en: 'Clean formula — you can use it with confidence.',
      fr: 'Formule clean — tu peux l\'utiliser en confiance.',
      ko: '클린 포뮬러입니다 — 안심하고 사용하세요.',
    }));
  }

  return recs;
}

// ─────────────────────────────────────────────────────────────────────
// VERDICTS NON-ALIMENTAIRES (ménager / textile / ustensile)
// Vocabulaire propre à chaque catégorie — JAMAIS de termes alimentaires
// ("ultra-transformé", "consommer", "cancérigène par ingestion"…).
// Le ménager parle produits chimiques/irritants, le textile parle
// fibres/teintures, l'ustensile parle matériaux/revêtements.
// ─────────────────────────────────────────────────────────────────────

type NonFoodDomain = 'household' | 'textile' | 'kitchen';

function generateNonFoodResume(domain: NonFoodDomain, badge: RiskLevel, substances: SubstanceDetected[]): string {
  const flagged = substances.filter((s) => s.niveau_risque !== 'aucun').slice(0, 2).map((s) => s.nom).join(', ');
  const named = flagged ? (isEnglish() ? ` (${flagged})` : ` (${flagged})`) : '';

  if (badge === 'aucun') {
    if (domain === 'household') return pick({ en: 'This household product has no known substance of concern in our database. A safer choice for your home.', fr: "Ce produit ménager ne contient aucune substance préoccupante connue dans notre base. Un choix plus sûr pour la maison.", ko: '이 생활용품에는 데이터베이스에서 알려진 우려 물질이 없습니다. 집을 위한 더 안전한 선택입니다.' });
    if (domain === 'textile') return pick({ en: 'This textile shows no known substance of concern. A healthy composition against the skin.', fr: "Ce textile ne présente aucune substance préoccupante connue. Une composition saine au contact de la peau.", ko: '이 섬유에는 알려진 우려 물질이 없습니다. 피부에 닿아도 건강한 구성입니다.' });
    return pick({ en: 'This kitchen item is made of materials with no known risk. A good choice for cooking.', fr: "Cet ustensile est fait de matériaux sans risque connu. Un bon choix pour cuisiner.", ko: '이 주방용품은 알려진 위험이 없는 소재로 만들어졌습니다. 요리에 좋은 선택입니다.' });
  }

  const severe = badge === 'danger' || badge === 'probable';
  if (domain === 'household') {
    return severe
      ? pick({ en: `This household product contains substances classified as hazardous${named}. Wear gloves, ventilate the room, keep it away from children — or choose a safer alternative.`, fr: `Ce produit ménager contient des substances classées dangereuses${named}. Porte des gants, aère la pièce, garde-le hors de portée des enfants — ou choisis une alternative plus sûre.`, ko: `이 생활용품에는 위험으로 분류된 물질${named}이 들어 있습니다. 장갑을 끼고 환기하며 어린이의 손이 닿지 않게 보관하거나 더 안전한 대안을 선택하세요.` })
      : pick({ en: 'This household product contains substances to handle with care. Ventilate and avoid prolonged skin contact.', fr: "Ce produit ménager contient des substances à manipuler avec précaution. Aère et évite le contact prolongé avec la peau.", ko: '이 생활용품에는 주의해서 다뤄야 할 물질이 있습니다. 환기하고 피부와의 장시간 접촉을 피하세요.' });
  }
  if (domain === 'textile') {
    return severe
      ? pick({ en: `This textile contains substances classified as hazardous${named} — dyes, finishes or PFAS. Wash it several times before wearing, or prefer certified fibres (OEKO-TEX, GOTS).`, fr: `Ce textile contient des substances classées dangereuses${named} — teintures, traitements ou PFAS. Lave-le plusieurs fois avant de le porter, ou privilégie des fibres certifiées (OEKO-TEX, GOTS).`, ko: `이 섬유에는 위험으로 분류된 물질${named}(염료, 마감 처리제 또는 PFAS)이 들어 있습니다. 착용 전 여러 번 세탁하거나 인증 섬유(OEKO-TEX, GOTS)를 선택하세요.` })
      : pick({ en: 'This textile contains substances worth watching. Prefer certified natural fibres and wash new garments before wearing.', fr: "Ce textile contient des substances à surveiller. Préfère des fibres naturelles certifiées et lave les vêtements neufs avant de les porter.", ko: '이 섬유에는 주의가 필요한 물질이 있습니다. 인증된 천연 섬유를 선택하고 새 옷은 착용 전에 세탁하세요.' });
  }
  // kitchen
  return severe
    ? pick({ en: `This kitchen item contains materials or coatings classified as hazardous${named}. Avoid heating it empty or at high temperature, or replace it with stainless steel, glass or cast iron.`, fr: `Cet ustensile contient des matériaux ou revêtements classés dangereux${named}. Évite de le chauffer à vide ou à haute température, ou remplace-le par de l'inox, du verre ou de la fonte.`, ko: `이 주방용품에는 위험으로 분류된 소재나 코팅${named}이 있습니다. 빈 상태로 또는 고온으로 가열하지 말거나 스테인리스, 유리, 주철로 교체하세요.` })
    : pick({ en: 'This kitchen item contains materials worth watching. Avoid heating it empty and prefer stainless steel, glass or cast iron.', fr: "Cet ustensile contient des matériaux à surveiller. Évite de le chauffer à vide et privilégie l'inox, le verre ou la fonte.", ko: '이 주방용품에는 주의가 필요한 소재가 있습니다. 빈 상태로 가열하지 말고 스테인리스, 유리, 주철을 선택하세요.' });
}

function generateNonFoodRecommendations(domain: NonFoodDomain, badge: RiskLevel): string[] {
  const recs: string[] = [];
  const severe = badge === 'danger' || badge === 'probable';
  if (domain === 'household') {
    if (severe) {
      recs.push(pick({ en: 'Ventilate, wear gloves and never mix cleaning products together.', fr: 'Aère, porte des gants et ne mélange jamais les produits ménagers entre eux.', ko: '환기하고 장갑을 끼며 세제를 절대 섞지 마세요.' }));
      recs.push(pick({ en: 'Prefer eco-labelled or fragrance-free cleaners, or a vinegar + water mix.', fr: "Préfère des nettoyants écolabellisés ou sans parfum, ou un mélange vinaigre + eau.", ko: '친환경 인증 또는 무향 세제나 식초+물 혼합액을 선택하세요.' }));
    } else {
      recs.push(pick({ en: 'Keep out of reach of children and store in a ventilated place.', fr: "Tenir hors de portée des enfants et ranger dans un endroit aéré.", ko: '어린이 손이 닿지 않는 곳, 환기되는 장소에 보관하세요.' }));
    }
    return recs;
  }
  if (domain === 'textile') {
    if (severe) {
      recs.push(pick({ en: 'Wash new garments 2–3 times before first wear to reduce residues.', fr: 'Lave les vêtements neufs 2 à 3 fois avant le premier port pour réduire les résidus.', ko: '잔여물을 줄이기 위해 새 옷은 처음 입기 전 2~3회 세탁하세요.' }));
      recs.push(pick({ en: 'Prefer OEKO-TEX or GOTS certified natural fibres (organic cotton, linen).', fr: 'Privilégie des fibres naturelles certifiées OEKO-TEX ou GOTS (coton bio, lin).', ko: 'OEKO-TEX 또는 GOTS 인증 천연 섬유(유기농 면, 린넨)를 선택하세요.' }));
    } else {
      recs.push(pick({ en: 'Wash before wearing and favour breathable natural fibres.', fr: 'Lave avant de porter et privilégie des fibres naturelles respirantes.', ko: '착용 전 세탁하고 통기성 좋은 천연 섬유를 선택하세요.' }));
    }
    return recs;
  }
  // kitchen
  if (severe) {
    recs.push(pick({ en: 'Never preheat non-stick pans empty and discard them once scratched.', fr: 'Ne préchauffe jamais une poêle antiadhésive à vide et jette-la dès qu\'elle est rayée.', ko: '논스틱 팬을 빈 상태로 예열하지 말고 긁히면 교체하세요.' }));
    recs.push(pick({ en: 'Prefer stainless steel, cast iron or glass for cooking and storage.', fr: "Privilégie l'inox, la fonte ou le verre pour cuisiner et conserver.", ko: '요리와 보관에는 스테인리스, 주철, 유리를 선택하세요.' }));
  } else {
    recs.push(pick({ en: 'Avoid overheating and use wooden or silicone utensils to protect the surface.', fr: 'Évite la surchauffe et utilise des ustensiles en bois ou silicone pour protéger la surface.', ko: '과열을 피하고 표면 보호를 위해 나무나 실리콘 도구를 사용하세요.' }));
  }
  return recs;
}

// ═══════════════════════════════════════════════════════════════════════
// CONVERSION VERS ScannedProduct
// ═══════════════════════════════════════════════════════════════════════

const CATEGORY_LABEL_KEYS: Record<ProductCategory, 'cat_label_food' | 'cat_label_beverage' | 'cat_label_kitchen' | 'cat_label_clothing' | 'cat_label_cosmetic' | 'cat_label_household' | 'cat_label_electronics' | 'cat_label_furniture' | 'cat_label_toy' | 'cat_label_other'> = {
  food: 'cat_label_food',
  beverage: 'cat_label_beverage',
  kitchen_utensil: 'cat_label_kitchen',
  clothing: 'cat_label_clothing',
  cosmetic: 'cat_label_cosmetic',
  household: 'cat_label_household',
  electronics: 'cat_label_electronics',
  furniture: 'cat_label_furniture',
  toy: 'cat_label_toy',
  other: 'cat_label_other',
};

export function getCategoryLabel(category: ProductCategory): string {
  const key = CATEGORY_LABEL_KEYS[category] ?? 'cat_label_other';
  return t(key);
}

/**
 * Brand line shown in lists/cards. Returns the real brand when available, otherwise a clean
 * category label (e.g. "Aliment", "Boisson") instead of an "Unknown brand" placeholder.
 */
export function getDisplayBrand(brand: string | undefined, category: ProductCategory | undefined): string {
  const trimmed = (brand ?? '').trim();
  if (trimmed && !isPlaceholderName(trimmed)) return trimmed;
  return getCategoryLabel(category ?? 'other');
}

export function universalResultToScannedProduct(
  result: UniversalAnalysisResult,
  photoUri: string,
): ScannedProduct {
  const riskGroup = niveauRisqueToGroup(result.badge_global);
  const verdictTier: VerdictTier = result.verdict_tier ?? legacyBadgeToTier(result.badge_global);
  console.log('[API] Final riskGroup:', riskGroup, '— tier:', verdictTier);

  const additiveCategory: AdditiveCategory =
    result.categorie_produit === 'cosmetic' ? 'cosmetic'
    : result.categorie_produit === 'household' ? 'household'
    : result.categorie_produit === 'kitchen_utensil' ? 'kitchen'
    : result.categorie_produit === 'clothing' ? 'textile'
    : 'food';

  const detectedAdditives: AdditiveInfo[] = result.substances_detectees
    .filter((s: SubstanceDetected) => s.niveau_risque !== 'aucun')
    .map((s: SubstanceDetected) => ({
      code: s.code ?? s.nom,
      name: s.nom,
      group: niveauRisqueToGroup(s.niveau_risque),
      category: additiveCategory,
      description: s.explication ?? '',
    }));

  const detectedIngredients: DetectedIngredient[] = result.substances_detectees.map((s: SubstanceDetected) => ({
    nom: s.nom,
    code: s.code,
    classification_circ: s.classification_circ,
    niveau_risque: s.niveau_risque,
    explication: s.explication,
    descriptionPending: s.descriptionPending,
  }));

  const productName = result.objet_identifie;
  const productBrand = '';
  const imageUrl = null;
  const ingredientsText = result.substances_detectees.map((s: SubstanceDetected) => s.nom).join(', ');

  return {
    barcode: `universal_${Date.now()}`,
    name: productName,
    brand: productBrand,
    imageUrl,
    riskGroup,
    detectedAdditives,
    scannedAt: new Date().toISOString(),
    categories: result.categorie_produit,
    ingredientsText,
    scanMethod: 'photo',
    photoUri,
    detectedIngredients,
    analysisSummary: result.resume,
    photoType: 'front',
    productCategory: result.categorie_produit,
    objectIdentified: result.objet_identifie,
    materialDetected: result.materiau_detecte,
    substances: result.substances_detectees,
    recommendations: result.recommandations,
    saferAlternatives: result.alternatives_sures,
    healthyAlternatives: result.alternatives_saines ?? [],
    verdictTier,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ALTERNATIVES POUR SCAN CODE-BARRES
// ═══════════════════════════════════════════════════════════════════════

interface LocalizedAlternative {
  readonly fr: { nom: string; raison: string };
  readonly en: { nom: string; raison: string };
  readonly ko: { nom: string; raison: string };
}

const ADDITIVE_ALTERNATIVES: Record<string, readonly LocalizedAlternative[]> = {
  'en:e250': [{ fr: { nom: 'Jambon sans nitrites (Fleury Michon)', raison: 'Sans conservateurs cancérogènes' }, en: { nom: 'Nitrite-free deli ham', raison: 'No carcinogenic preservatives' }, ko: { nom: '무첨가(무아질산염) 햄', raison: '발암성 보존료 없음' } }],
  'en:e249': [{ fr: { nom: 'Charcuterie bio sans nitrites', raison: 'Conservation naturelle sans nitrites' }, en: { nom: 'Organic nitrite-free deli meat', raison: 'Naturally preserved without nitrites' }, ko: { nom: '유기농 무아질산염 가공육', raison: '아질산염 없이 자연 보존' } }],
  'en:e951': [{ fr: { nom: 'Stévia ou érythritol', raison: 'Édulcorants naturels' }, en: { nom: 'Stevia or erythritol', raison: 'Natural sweeteners' }, ko: { nom: '스테비아 또는 에리스리퇴', raison: '천연 감미료' } }],
  'palm-oil': [{ fr: { nom: 'Huile d\'olive extra vierge', raison: 'Riche en oméga-3 anti-inflammatoires' }, en: { nom: 'Extra virgin olive oil', raison: 'Rich in anti-inflammatory omega-3' }, ko: { nom: '엑스트라 버진 올리브유', raison: '항염 오메가-3 풍부' } }],
  'pfas': [{ fr: { nom: 'Contenants en verre ou inox', raison: 'Sans polluants éternels' }, en: { nom: 'Glass or stainless steel containers', raison: 'Free of forever chemicals (PFAS)' }, ko: { nom: '유리 또는 스테인리스 용기', raison: '영구 화학물질(PFAS) 없음' } }],
};

export function generateBarcodeAlternatives(detectedAdditives: { code: string; name: string; group: string }[]): { nom: string; raison: string }[] {
  const seen = new Set<string>();
  const alternatives: { nom: string; raison: string }[] = [];

  for (const additive of detectedAdditives) {
    const alts = ADDITIVE_ALTERNATIVES[additive.code];
    if (alts) {
      for (const alt of alts) {
        const localized = pick({ en: alt.en, fr: alt.fr, ko: alt.ko });
        if (!seen.has(localized.nom)) {
          seen.add(localized.nom);
          alternatives.push(localized);
        }
      }
    }
  }

  return alternatives.slice(0, 6);
}