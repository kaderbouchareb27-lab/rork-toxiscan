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
  | 'refined_flour'
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
  /**
   * Sugar INTENSITY (spec §4 tightening). Only meaningful for `added_sugar`:
   * 'high' = massive / dominant sugar (desserts, pastries, sodas) → +2 to the score,
   * otherwise present sugar → +1. Defaults to 'normal' when omitted.
   */
  intensity?: 'normal' | 'high';
}

export interface MealAlternatives {
  home: string;
  restaurant: string;
}

const CARCINOGEN_CATEGORIES: readonly MealCategory[] = ['carcinogen_g1', 'carcinogen_2a', 'carcinogen_2b'];
const JUNK_FAMILY_CATEGORIES: readonly MealCategory[] = ['processed', 'added_sugar', 'refined_oil', 'refined_flour', 'excess_salt', 'additive'];

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

// Sweet / added-sugar signals. Includes chocolate (sweetened chocolate powder, spreads,
// candy) so a clearly sweet topping is NEVER mislabeled "neutral" (spec fix §2). Pure
// unsweetened cocoa/cacao is deliberately EXCLUDED so the database can keep it green.
const SUGAR_TOKENS = ['sugar', 'sucre', 'sirop', 'syrup', 'dextrose', 'glucose', 'fructose', 'saccharose', 'sucrose', 'maltodextrin', 'chocolat', 'chocolate', 'choco', 'caramel', 'nutella', 'praline', 'candy', 'bonbon', 'frosting', 'icing', 'glaze', 'confiture', 'marmalade', 'jam', '설탕', '시럽', '당', '초콜릿', '사탕', '잼', '카라멜'];
const OIL_TOKENS = ['oil', 'huile', 'graisse', 'margarine', 'shortening', '기름', '유'];
const SALT_TOKENS = ['salt', 'sel', 'sodium', 'soy sauce', 'sauce soja', 'gochujang', 'doenjang', 'ganjang', '간장', '소금', '된장', '고추장'];
const ADDITIVE_TOKENS = ['colorant', 'colour', 'color', 'dye', 'additive', 'additif', 'e1', 'e2', 'e4', 'e5', 'msg', 'glutamate', 'nitrite', 'benzoate', 'sulfite', '색소', '첨가물'];

// Refined flour / refined carbs family (spec fix §3): white flour, viennoiseries, pastries,
// white bread. Whole-grain variants are excluded — they stay healthy.
const REFINED_FLOUR_TOKENS = ['flour', 'farine', 'viennoiserie', 'pastry', 'patisserie', 'croissant', 'brioche', 'baguette', 'pain', 'bun', 'dough', 'biscuit', 'cookie', 'cake', 'gateau', 'donut', 'doughnut', 'muffin', 'cupcake', 'bagel', 'pancake', 'waffle', 'gaufre', 'crepe', 'toast', 'scone', 'danish', 'pretzel', 'pita', '밀가루', '빵', '크루아상', '페이스트리', '베이글', '케이크', '쿠키', '도넛'];
const WHOLE_GRAIN_TOKENS = ['complet', 'complete', 'whole', 'wholemeal', 'wholegrain', 'integral', 'multigrain', 'multicereal', 'seigle', 'rye', 'sarrasin', 'buckwheat', 'bran', '통밀', '현미', '잡곡', '호밀'];

// Genuinely-healthy items that are only INCIDENTAL to a drink/dish (the milk in a coffee,
// a splash of cream) must NOT earn the health bonus (spec fix §4).
const INCIDENTAL_HEALTHY_TOKENS = ['milk', 'lait', 'cream', 'creme', 'latte', '우유', '크림', '라떼'];

// A meal whose MAIN element is a viennoiserie / pastry / sweet dessert can NEVER be green
// (spec guardrail). Tokens picked to avoid collisions (no 'pie'/'tart'/'macaron').
const DESSERT_BASE_TOKENS = ['croissant', 'viennoiserie', 'pastry', 'patisserie', 'brioche', 'cake', 'gateau', 'donut', 'doughnut', 'muffin', 'cupcake', 'cookie', 'biscuit', 'dessert', 'tarte', 'waffle', 'gaufre', 'pancake', 'crepe', 'beignet', 'churro', 'brownie', 'pudding', 'glace', 'gelato', 'candy', 'bonbon', 'danish', 'scone', 'chausson', '디저트', '케이크', '쿠키', '도넛', '크루아상', '아이스크림', '페이스트리', '와플', '파이'];

function isRefinedFlourName(n: string): boolean {
  if (WHOLE_GRAIN_TOKENS.some((t) => n.includes(t))) return false;
  return REFINED_FLOUR_TOKENS.some((t) => n.includes(t));
}

/**
 * Returns the junk family a name clearly belongs to, or null if none. Used as the
 * classification fallback and to rescue items the AI/database mislabeled.
 */
function junkFamilyFromName(name: string): MealCategory | null {
  const n = normalize(name);
  if (SUGAR_TOKENS.some((t) => n.includes(t))) return 'added_sugar';
  if (OIL_TOKENS.some((t) => n.includes(t))) return 'refined_oil';
  if (ADDITIVE_TOKENS.some((t) => n.includes(t))) return 'additive';
  if (SALT_TOKENS.some((t) => n.includes(t))) return 'excess_salt';
  if (isRefinedFlourName(n)) return 'refined_flour';
  return null;
}

/**
 * NARROW rescue used ONLY on items the database/AI marked benign (healthy/neutral). Limited
 * to SWEET and REFINED-FLOUR signals so genuinely healthy foods (virgin olive oil, salt as a
 * seasoning, vegetables) are never wrongly demoted (spec fix §2/§3).
 */
function benignOverrideFromName(name: string): MealCategory | null {
  const n = normalize(name);
  if (SUGAR_TOKENS.some((t) => n.includes(t))) return 'added_sugar';
  if (isRefinedFlourName(n)) return 'refined_flour';
  return null;
}

/** Incidental drink components (milk/cream in a coffee) — excluded from the health bonus. */
function isIncidentalHealthy(name: string): boolean {
  const n = normalize(name);
  if (n.includes('laitue') || n.includes('lettuce')) return false; // lettuce is a real vegetable
  return INCIDENTAL_HEALTHY_TOKENS.some((t) => n.includes(t));
}

/** True when the dish's main element is a viennoiserie / pastry / sweet dessert. */
function hasDessertBase(ingredients: MealIngredient[], dishName?: string): boolean {
  const haystacks = ingredients.map((i) => normalize(i.name));
  if (dishName) haystacks.push(normalize(dishName));
  return haystacks.some((h) => DESSERT_BASE_TOKENS.some((tk) => h.includes(tk)));
}

function familyFromName(name: string, fallback: MealCategory): MealCategory {
  return junkFamilyFromName(name) ?? fallback;
}

function normalizeAiCategory(raw: string): MealCategory {
  const k = normalize(raw).replace(/[\s-]+/g, '_');
  const all: MealCategory[] = ['carcinogen_g1', 'carcinogen_2a', 'carcinogen_2b', 'processed', 'added_sugar', 'refined_oil', 'refined_flour', 'excess_salt', 'additive', 'healthy', 'neutral'];
  if ((all as string[]).includes(k)) return k as MealCategory;
  if (k.includes('carcinogen') || k.includes('cancer')) return 'carcinogen_2b';
  if (k.includes('sugar') || k.includes('sucre')) return 'added_sugar';
  if (k.includes('flour') || k.includes('farine') || k.includes('refined_carb') || k.includes('refined_flour') || k.includes('refined_grain')) return 'refined_flour';
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
    // db.risk === 'aucun' (database says benign): still rescue clearly sweet / refined-flour
    // items the database keeps green (e.g. chocolate powder, white flour) so a pastry or a
    // sweet topping never counts as healthy (spec fix §2/§3).
    const benign = benignOverrideFromName(name);
    return benign ? { category: benign, isGrave: false } : { category: 'healthy', isGrave: false };
  }
  if (aiCategoryHint) {
    const cat = normalizeAiCategory(aiCategoryHint);
    // SAFETY NET: the AI must not bury a clearly sweet / refined item under "neutral" or
    // "healthy". When the NAME signals sugar or refined flour, trust the name (spec §2).
    if (cat === 'neutral' || cat === 'healthy') {
      const benign = benignOverrideFromName(name);
      if (benign) return { category: benign, isGrave: false };
    }
    return { category: cat, isGrave: isCarcinogenCategory(cat) };
  }
  // Final fallback for manually-typed items: catch obvious junk families by name
  // (e.g. "2 sucres", "croissant", "huile", "sel") so the live score reacts to manual edits.
  return { category: familyFromName(name, 'neutral'), isGrave: false };
}

// ─────────────────────────────────────────────────────────────────────
// THE SCORE — /10 TOXICITY (spec §4). Higher = worse. Deterministic so the
// confirmation screen can recompute it LIVE on every manual edit.
// ─────────────────────────────────────────────────────────────────────

export function computeMealScore(ingredients: MealIngredient[], dishName?: string): number {
  if (ingredients.length === 0) return 0;

  // The most serious carcinogen present. Group 1 (processed/cured meat, nitrites) is
  // distinguished from Group 2A/2B (e.g. red meat) — only Group 1 can unlock a full 10.
  const hasG1 = ingredients.some((i) => i.category === 'carcinogen_g1');
  const hasCarcinogen = ingredients.some((i) => isCarcinogenCategory(i.category) || i.isGrave);

  // TEMPS 1 — floor set by the most serious ingredient (IARC group 1/2A/2B).
  const base = hasCarcinogen ? 6 : 1;

  // TEMPS 2 — accumulation: each junk family makes the score climb.
  const sugarCount = ingredients.filter((i) => i.category === 'added_sugar').length;
  const massiveSugar = ingredients.some((i) => i.category === 'added_sugar' && i.intensity === 'high');
  const oilCount = ingredients.filter((i) => i.category === 'refined_oil').length;
  const processedCount = ingredients.filter((i) => i.category === 'processed').length;
  const additiveCount = ingredients.filter((i) => i.category === 'additive').length;
  const saltCount = ingredients.filter((i) => i.category === 'excess_salt').length;
  const flourCount = ingredients.filter((i) => i.category === 'refined_flour').length;

  const hasSugar = sugarCount > 0;
  const hasOil = oilCount > 0;
  const hasProcessed = processedCount > 0;
  const hasFlour = flourCount > 0;

  let accumulation = 0;
  // Sugar by INTENSITY (spec §4 tightening): present → +1, massive/dominant → +2.
  // Several distinct added-sugar sources is also treated as a massive dose.
  if (hasSugar) accumulation += (massiveSugar || sugarCount >= 2) ? 2 : 1;
  if (hasOil) accumulation += Math.min(oilCount, 2);
  if (hasProcessed) accumulation += Math.min(processedCount, 3);
  if (additiveCount > 0) accumulation += Math.min(additiveCount, 2);
  if (saltCount > 0) accumulation += 1;
  // Refined flour / refined carbs family (spec fix §3): white flour, viennoiseries, pastries, white bread.
  if (hasFlour) accumulation += 1;
  accumulation = Math.min(accumulation, 8);

  // TEMPS 3 — health bonus: ONLY genuine whole foods that actually compose the meal
  // (vegetables, fruits, whole grains, lean grilled/steamed proteins). Incidental drink
  // components (the milk in a coffee, a splash of cream) never count (spec fix §4).
  const effectiveHealthy = ingredients.filter((i) => i.category === 'healthy' && !isIncidentalHealthy(i.name)).length;
  let bonus = 0;
  if (!hasCarcinogen) {
    if (effectiveHealthy >= 3) bonus = -2;
    else if (effectiveHealthy >= 1) bonus = -1;
  }
  // The bonus must NEVER pull a junky meal into green: when added sugar coexists with
  // ultra-processing / refined oil / refined flour, cancel the discount (spec fix §4).
  const junkyContext = hasSugar && (hasProcessed || hasOil || hasFlour || additiveCount > 0);
  if (junkyContext) bonus = 0;

  let score = base + accumulation + bonus;

  // Ultra-processed "bomb" nudges (no carcinogen, nothing fresh): push junk/desserts
  // into the 8-9 range so an ultra-sweet dessert doesn't land at 6-7.
  const junkFamilies = JUNK_FAMILY_CATEGORIES.filter((fam) => ingredients.some((i) => i.category === fam)).length;
  if (!hasCarcinogen && effectiveHealthy === 0) {
    if (junkFamilies >= 4) score += 1; // many junk families stacked together
    if (massiveSugar && junkFamilies >= 2) score += 1; // dominant-sugar dessert / pastry
  }

  score = Math.max(0, Math.min(10, score));

  // GUARDRAIL (spec): a meal whose MAIN element is a viennoiserie / pastry / sweet dessert
  // can NEVER be green. Yellow minimum (floor 5) — e.g. a chocolate croissant.
  if (hasDessertBase(ingredients, dishName)) score = Math.max(score, 5);

  // ── Bounds (spec §4 + the 10/10 tightening) ──
  // The full 10 is RESERVED for a CIRC group-1 carcinogen (processed/cured meat, nitrites)
  // COMBINED with heavy accumulation (added sugar + refined oils + ultra-processing).
  // A group 2A/2B carcinogen (e.g. red meat) or pure accumulation CAPS AT 9 — never a full
  // 10, so an ordinary dish (burger + fries with red meat) can't reach 10.
  const heavyAccumulation = hasSugar && hasOil && hasProcessed;
  const canReachTen = hasG1 && heavyAccumulation;
  if (!canReachTen) score = Math.min(score, 9);
  if (!hasCarcinogen) score = Math.max(score, 1);

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
        intensity: z.preprocess(
          (v) => (v === 'high' || v === 'massive' || v === 'dominant' ? 'high' : 'normal'),
          z.enum(['normal', 'high']),
        ),
        note: safeString(''),
      }),
    ),
  ),
});

const DETECT_SYSTEM = `You are Dr. Toxi, an expert in food toxicity (WHO/IARC classification) AND nutrition. You analyze a PHOTO of a real meal.

TASK:
1. Identify the dish in a few words (dish_name).
2. ALWAYS identify the MAIN / BASE food of the dish FIRST — the pastry, bread, dough, batter, noodles, rice or protein the dish is built on — not only the toppings or fillings. A "chocolate croissant" MUST list the viennoiserie pastry itself (refined flour + butter), not just the chocolate. A "pizza" must list the dough; a "burger" the bun and the patty. THEN add toppings, sauces and the usual hidden ingredients a real recipe contains (oils, sugar, sauces, condiments). Stay realistic — do not invent rare additives.
3. For EACH ingredient set:
   - name: the ingredient name in the user's language.
   - category: EXACTLY one of: carcinogen_g1 | carcinogen_2a | carcinogen_2b | processed | added_sugar | refined_oil | refined_flour | excess_salt | additive | healthy | neutral
   - is_grave: true ONLY if dangerous / IARC-classified (carcinogen). NEVER true for merely processed/sugary/fatty food.
   - intensity: "high" ONLY for added_sugar when the sugar is MASSIVE / DOMINANT (desserts, pastries, candy, sodas, sweet drinks, syrupy dishes); otherwise "normal". Always "normal" for non-sugar ingredients.
   - note: ONE short, frank, educational sentence about this ingredient, in the user's language.

CLASSIFICATION GUIDANCE:
- Processed / cured meat (ham, bacon, sausage, hot dog, salami, pepperoni, nitrites) → carcinogen_g1 (IARC Group 1, GRAVE).
- Red meat cooked in the dish (beef patty, ground beef, steak, pork, lamb) → carcinogen_2a (IARC Group 2A, GRAVE — it raises the score but is NOT Group 1).
- Refined oils (palm, canola, sunflower, soy, deep-frying oil) → refined_oil.
- Refined-flour / refined-carb base (white flour, viennoiserie & pastry dough, white bread, croissant, brioche, cake, cookies, donuts, white bun) → refined_flour. Whole-grain / wholemeal bread → healthy.
- Other visibly industrial components (processed cheese, industrial sauces, nuggets) → processed.
- "neutral" is RESERVED for ingredients with truly no nutritional impact: water, plain spices, herbs, black coffee, tea, vinegar. A clearly SWEET or PROCESSED item (chocolate powder, syrups, sweet sauces, frosting, sweet toppings) is NEVER "neutral" — classify it as added_sugar (or processed).
- Milk and cream are "healthy" at most; as an incidental drink component they do NOT make a sugary/pastry meal healthy.

GOLDEN RULE (spec §4): NEVER label sugar, fat, refined flour or processed food as "carcinogenic". Always distinguish SERIOUS (dangerous / IARC) from NOT HEALTHY (processed / sugary / fatty / refined). A sugary cake is "ultra-processed and very sweet" — never "carcinogenic".

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
    const intensity: 'normal' | 'high' = item.intensity === 'high' ? 'high' : 'normal';
    ingredients.push({ id: newMealIngredientId(), name, category, isGrave, note: item.note.trim(), intensity });
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
   GOLDEN RULE: NEVER call sugar/fat/refined flour/processed food "carcinogenic". Distinguish SERIOUS (dangerous/IARC) from NOT HEALTHY (processed/sugary/fatty/refined).
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
