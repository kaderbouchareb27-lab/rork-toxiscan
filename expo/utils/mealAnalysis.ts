import { z } from 'zod';
import { aiGenerateObject } from '@/utils/aiApi';
import { classifyFoodIngredient } from '@/utils/api';
import { getAnalysisRegionPrompt } from '@/utils/regionDetection';
import { pick } from '@/utils/i18n';

// ═══════════════════════════════════════════════════════════════════════
// MEAL SCAN — types
// "Scan my meal" is a SEPARATE workflow from the product scan. At the level of
// a single scan we judge the TOXICITY of the dish (ToxiScan DNA, IARC). The /10
// score is EXCLUSIVE to this mode. Higher = worse (inverted scale).
// ═══════════════════════════════════════════════════════════════════════

export type MealCategory =
  | 'carcinogen_g1'
  | 'carcinogen_2a'
  | 'carcinogen_2b'
  | 'processed'
  | 'added_sugar'
  | 'refined_oil'
  | 'excess_salt'
  | 'additive'
  | 'healthy'
  | 'neutral';

export type MealTier = 'green' | 'yellow' | 'orange' | 'red';

export interface MealIngredient {
  id: string;
  name: string;
  category: MealCategory;
  /** GRAVE = dangerous / IARC-classified (carcinogen). Distinct from "not healthy". */
  isGrave: boolean;
  /** Short educational note (language-aware). Empty for manually added items. */
  note: string;
}

export interface MealAlternatives {
  home: string;
  restaurant: string;
}

const CARCINOGEN_CATEGORIES: readonly MealCategory[] = ['carcinogen_g1', 'carcinogen_2a', 'carcinogen_2b'];
const JUNK_FAMILY_CATEGORIES: readonly MealCategory[] = ['processed', 'added_sugar', 'refined_oil', 'excess_salt', 'additive'];

export function isCarcinogenCategory(c: MealCategory): boolean {
  return CARCINOGEN_CATEGORIES.includes(c);
}

let idCounter = 0;
export function newMealIngredientId(): string {
  idCounter += 1;
  return `mi_${Date.now().toString(36)}_${idCounter}`;
}

// ─────────────────────────────────────────────────────────────────────
// LOCAL CROSS-REFERENCE — reuse the product scanner's ingredient database so
// a detected meal ingredient inherits the exact same classification (spec §2).
// ─────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const SUGAR_TOKENS = ['sugar', 'sucre', 'sirop', 'syrup', 'dextrose', 'glucose', 'fructose', 'saccharose', 'sucrose', 'maltodextrin', '설탕', '시럽', '당'];
const OIL_TOKENS = ['oil', 'huile', 'graisse', 'margarine', 'shortening', '기름', '유'];
const SALT_TOKENS = ['salt', 'sel', 'sodium', 'soy sauce', 'sauce soja', 'gochujang', 'doenjang', 'ganjang', '간장', '소금', '된장', '고추장'];
const ADDITIVE_TOKENS = ['colorant', 'colour', 'color', 'dye', 'additive', 'additif', 'e1', 'e2', 'e4', 'e5', 'msg', 'glutamate', 'nitrite', 'benzoate', 'sulfite', '색소', '첨가물'];

function familyFromName(name: string, fallback: MealCategory): MealCategory {
  const n = normalize(name);
  if (SUGAR_TOKENS.some((t) => n.includes(t))) return 'added_sugar';
  if (OIL_TOKENS.some((t) => n.includes(t))) return 'refined_oil';
  if (ADDITIVE_TOKENS.some((t) => n.includes(t))) return 'additive';
  if (SALT_TOKENS.some((t) => n.includes(t))) return 'excess_salt';
  return fallback;
}

function normalizeAiCategory(raw: string): MealCategory {
  const k = normalize(raw).replace(/[\s-]+/g, '_');
  const all: MealCategory[] = ['carcinogen_g1', 'carcinogen_2a', 'carcinogen_2b', 'processed', 'added_sugar', 'refined_oil', 'excess_salt', 'additive', 'healthy', 'neutral'];
  if ((all as string[]).includes(k)) return k as MealCategory;
  if (k.includes('carcinogen') || k.includes('cancer')) return 'carcinogen_2b';
  if (k.includes('sugar') || k.includes('sucre')) return 'added_sugar';
  if (k.includes('oil') || k.includes('huile')) return 'refined_oil';
  if (k.includes('salt') || k.includes('sel') || k.includes('sodium')) return 'excess_salt';
  if (k.includes('additive') || k.includes('color') || k.includes('additif')) return 'additive';
  if (k.includes('process')) return 'processed';
  if (k.includes('health') || k.includes('sain') || k.includes('veg') || k.includes('fruit')) return 'healthy';
  return 'neutral';
}

/**
 * Classifies one meal ingredient. The local database is used IN PRIORITY (spec §2):
 * when ToxiScan already knows the ingredient (e.g. vegetable oil → orange), we inherit
 * that classification; only unknown ingredients fall back to the AI's category hint.
 */
export function classifyMealIngredient(name: string, aiCategoryHint?: string): { category: MealCategory; isGrave: boolean } {
  const db = classifyFoodIngredient(name);
  if (db) {
    const circ = normalize(db.circ);
    if (circ.includes('groupe 2a') || circ.includes('group 2a')) return { category: 'carcinogen_2a', isGrave: true };
    if (circ.includes('groupe 2b') || circ.includes('group 2b')) return { category: 'carcinogen_2b', isGrave: true };
    if (db.risk === 'danger') return { category: 'carcinogen_g1', isGrave: true };
    if (db.risk === 'probable') return { category: familyFromName(name, 'processed'), isGrave: false };
    if (db.risk === 'possible') return { category: familyFromName(name, 'additive'), isGrave: false };
    return { category: 'healthy', isGrave: false };
  }
  if (aiCategoryHint) {
    const cat = normalizeAiCategory(aiCategoryHint);
    return { category: cat, isGrave: isCarcinogenCategory(cat) };
  }
  return { category: 'neutral', isGrave: false };
}

// ─────────────────────────────────────────────────────────────────────
// THE SCORE — /10 TOXICITY (spec §4). Higher = worse. Deterministic so the
// confirmation screen can recompute it LIVE on every manual edit.
// ─────────────────────────────────────────────────────────────────────

export function computeMealScore(ingredients: MealIngredient[]): number {
  if (ingredients.length === 0) return 0;

  const graveCount = ingredients.filter((i) => i.isGrave || isCarcinogenCategory(i.category)).length;

  // TEMPS 1 — floor set by the most serious ingredient (IARC group 1/2A/2B).
  const base = graveCount > 0 ? 6 : 1;

  // TEMPS 2 — accumulation: each junk family makes the score climb.
  const sugarCount = ingredients.filter((i) => i.category === 'added_sugar').length;
  const oilCount = ingredients.filter((i) => i.category === 'refined_oil').length;
  const processedCount = ingredients.filter((i) => i.category === 'processed').length;
  const additiveCount = ingredients.filter((i) => i.category === 'additive').length;
  const saltCount = ingredients.filter((i) => i.category === 'excess_salt').length;

  let accumulation = 0;
  if (sugarCount > 0) accumulation += Math.min(sugarCount, 3); // massive sugar → up to +3
  if (oilCount > 0) accumulation += Math.min(oilCount, 2);
  if (processedCount > 0) accumulation += Math.min(processedCount, 3);
  if (additiveCount > 0) accumulation += Math.min(additiveCount, 2);
  if (saltCount > 0) accumulation += 1;
  accumulation = Math.min(accumulation, 8);

  // TEMPS 3 — health bonus: raw foods, vegetables, clean cooking bring it down.
  const healthyCount = ingredients.filter((i) => i.category === 'healthy').length;
  let bonus = 0;
  if (graveCount === 0) {
    if (healthyCount >= 3) bonus = -2;
    else if (healthyCount >= 1) bonus = -1;
  }

  let score = base + accumulation + bonus;

  // Ultra-processed bomb: 4+ junk families and nothing fresh → nudge up.
  const junkFamilies = JUNK_FAMILY_CATEGORIES.filter((fam) => ingredients.some((i) => i.category === fam)).length;
  if (graveCount === 0 && junkFamilies >= 4 && healthyCount === 0) score += 1;

  // Bounds: accumulation alone caps at 9; the full 10 needs IARC + massive accumulation.
  score = Math.max(0, Math.min(10, score));
  if (graveCount === 0) score = Math.min(score, 9);
  if (score === 10 && !(graveCount > 0 && accumulation >= 4)) score = 9;
  if (graveCount === 0) score = Math.max(score, 1);

  return Math.round(score);
}

export function scoreToTier(score: number): MealTier {
  if (score <= 3) return 'green';
  if (score <= 5) return 'yellow';
  if (score <= 8) return 'orange';
  return 'red';
}

// ═══════════════════════════════════════════════════════════════════════
// AI — STEP 1: detect the dish + its ingredients from the photo
// ═══════════════════════════════════════════════════════════════════════

const safeString = (fallback = '') =>
  z.preprocess((v) => (v === undefined || v === null ? fallback : typeof v === 'string' ? v : String(v)), z.string());

const detectSchema = z.object({
  dish_name: safeString(''),
  ingredients: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(
      z.object({
        name: safeString(''),
        category: safeString('neutral'),
        is_grave: z.preprocess((v) => v === true || v === 'true' || v === 1, z.boolean()),
        note: safeString(''),
      }),
    ),
  ),
});

const DETECT_SYSTEM = `You are Dr. Toxi, an expert in food toxicity (WHO/IARC classification) AND nutrition. You analyze a PHOTO of a real meal.

TASK:
1. Identify the dish in a few words (dish_name).
2. List the ingredients you can reasonably infer are in this dish (photo + typical recipe). Include the usual hidden ones a real recipe would contain (oils, sugar, sauces, condiments) but stay realistic — do not invent rare additives.
3. For EACH ingredient set:
   - name: the ingredient name in the user's language.
   - category: EXACTLY one of: carcinogen_g1 | carcinogen_2a | carcinogen_2b | processed | added_sugar | refined_oil | excess_salt | additive | healthy | neutral
   - is_grave: true ONLY if dangerous / IARC-classified (carcinogen). NEVER true for merely processed/sugary/fatty food.
   - note: ONE short, frank, educational sentence about this ingredient, in the user's language.

GOLDEN RULE (spec §4): NEVER label sugar, fat or processed food as "carcinogenic". Always distinguish SERIOUS (dangerous / IARC) from NOT HEALTHY (processed / sugary / fatty). A sugary cake is "ultra-processed and very sweet" — never "carcinogenic".

Return 4 to 12 ingredients. Output JSON only.`;

const DETECT_INSTRUCTION = pick({
  en: 'Analyze this meal photo and return the dish name and its ingredients.',
  fr: "Analyse cette photo de repas et retourne le nom du plat et ses ingrédients.",
  ko: '이 식사 사진을 분석해서 음식 이름과 재료를 알려주세요.',
});

export interface DetectedMeal {
  dishName: string;
  ingredients: MealIngredient[];
}

/**
 * STEP 1 — vision detection. Returns the dish name + a classified ingredient list
 * (each ingredient cross-referenced against the local database in priority).
 */
export async function detectMealFromPhoto(imageBase64: string): Promise<DetectedMeal> {
  const system = DETECT_SYSTEM + getAnalysisRegionPrompt();
  const raw = await aiGenerateObject({
    system,
    schema: detectSchema,
    maxTokens: 1600,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: DETECT_INSTRUCTION },
          { type: 'image', image: imageBase64 },
        ],
      },
    ],
  });

  const seen = new Set<string>();
  const ingredients: MealIngredient[] = [];
  for (const item of raw.ingredients) {
    const name = item.name.trim();
    if (!name || name.length < 2) continue;
    const key = normalize(name);
    if (seen.has(key)) continue;
    seen.add(key);
    const { category, isGrave } = classifyMealIngredient(name, item.category);
    ingredients.push({ id: newMealIngredientId(), name, category, isGrave, note: item.note.trim() });
  }

  return {
    dishName: raw.dish_name.trim() || pick({ en: 'My meal', fr: 'Mon repas', ko: '내 식사' }),
    ingredients,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// AI — STEP 2: write the decorticated verdict + alternatives for the FINAL
// (possibly hand-edited) ingredient list, in tone matching the computed tier.
// ═══════════════════════════════════════════════════════════════════════

const verdictSchema = z.object({
  verdict_text: safeString(''),
  alternative_home: safeString(''),
  alternative_restaurant: safeString(''),
});

const TONE_BY_TIER: Record<MealTier, string> = {
  green: 'warm and congratulatory — celebrate this good choice',
  yellow: 'kind but lucid — fine occasionally, not every day',
  orange: 'serious and pedagogical — clearly explain why to find better',
  red: 'firm but NEVER guilt-tripping — you are an ally, not a scolding teacher',
};

export interface MealVerdict {
  verdictText: string;
  alternatives: MealAlternatives | null;
}

/**
 * STEP 2 — generates the ingredient-by-ingredient verdict and (when score ≥ 6)
 * a home + restaurant alternative, in the active language and tier-appropriate tone.
 */
export async function generateMealVerdict(
  dishName: string,
  ingredients: MealIngredient[],
  score: number,
  tier: MealTier,
): Promise<MealVerdict> {
  const needsAlternatives = score >= 6;
  const ingredientLines = ingredients
    .map((i) => `- ${i.name} [${i.category}${i.isGrave ? ', GRAVE' : ''}]`)
    .join('\n');

  const system = `You are Dr. Toxi, an expert in food toxicity (WHO/IARC) AND nutrition. Write the verdict for a scanned meal.

DISH: ${dishName}
TOXICITY SCORE: ${score}/10 (higher = worse). Tier: ${tier}.
INGREDIENTS (category in brackets, GRAVE = dangerous/IARC):
${ingredientLines}

WRITE:
1. verdict_text: a broken-down, ingredient-by-ingredient verdict (e.g. "The ham contains sodium nitrites (carcinogenic). The oil is refined. The cheese is fine. The tomato is healthy."). Pedagogical, clear, 3-6 sentences. Tone: ${TONE_BY_TIER[tier]}.
   GOLDEN RULE: NEVER call sugar/fat/processed food "carcinogenic". Distinguish SERIOUS (dangerous/IARC) from NOT HEALTHY (processed/sugary/fatty).
${needsAlternatives
      ? `2. alternative_home: a HEALTHY and SIMILAR homemade version of the SAME dish (stay close to the craving — a pizza lover wants a better pizza, not a salad). One or two sentences.
3. alternative_restaurant: what TYPE of dish to pick instead next time at a restaurant. One sentence.`
      : `2. alternative_home: "" (empty — score below 6, no alternatives needed)
3. alternative_restaurant: "" (empty)`}

Respond in the user's app language. Output JSON only.`;

  const raw = await aiGenerateObject({
    system: system + getAnalysisRegionPrompt(),
    schema: verdictSchema,
    maxTokens: 900,
    messages: [
      { role: 'user', content: pick({ en: 'Write the verdict for this meal.', fr: 'Rédige le verdict pour ce repas.', ko: '이 식사에 대한 판정을 작성해 주세요.' }) },
    ],
  });

  const home = raw.alternative_home.trim();
  const restaurant = raw.alternative_restaurant.trim();
  return {
    verdictText: raw.verdict_text.trim(),
    alternatives: needsAlternatives && (home || restaurant) ? { home, restaurant } : null,
  };
}
