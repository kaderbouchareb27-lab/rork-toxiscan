import { z } from 'zod';
import { aiGenerateObject, MEAL_VISION_MODEL_ID, MEAL_VISION_PROVIDER } from '@/utils/aiApi';
import { classifyFoodIngredient } from '@/utils/api';
import { getAnalysisRegionPrompt } from '@/utils/regionDetection';
import { getHealthProfileAnalysisPrompt } from '@/utils/healthProfile';
import { pick } from '@/utils/i18n';
import { REFERENCE_FOODS, type ReferenceFood, type FoodMarker } from '@/constants/referenceFoods';

// ═══════════════════════════════════════════════════════════════════════
// MEAL SCAN — types
// "Scan my meal" is a SEPARATE workflow from the product scan. At the level of
// a single scan we judge the dish (ToxiScan DNA, IARC). The /10 score shown to the
// user is a HEALTH score: higher = BETTER (10 = excellent, 0 = very toxic).
// Internally the engine still computes a TOXICITY value and inverts it at the
// boundary (health = 10 − toxicity), so all the tuned floors stay unchanged.
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
// Categories rendered as an ORANGE dot in the UI (see MEAL_CATEGORY_COLORS). The coherence
// floor keys off this exact set so the final tier can never contradict the number of orange
// dots the user sees in the ingredient list (spec).
const ORANGE_TIER_CATEGORIES: readonly MealCategory[] = ['processed', 'added_sugar', 'refined_oil', 'refined_flour'];

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
const WHOLE_GRAIN_TOKENS = ['complet', 'complete', 'whole', 'wholemeal', 'wholegrain', 'integral', 'multigrain', 'multicereal', 'multicereales', 'seigle', 'rye', 'sarrasin', 'buckwheat', 'bran', 'levain', 'sourdough', 'epeautre', 'spelt', 'pumpernickel', '통밀', '현미', '잡곡', '호밀', '사워도우'];

// Genuinely-healthy items that are only INCIDENTAL to a drink/dish (the milk in a coffee,
// a splash of cream) must NOT earn the health bonus (spec fix §4).
const INCIDENTAL_HEALTHY_TOKENS = ['milk', 'lait', 'cream', 'creme', 'latte', '우유', '크림', '라떼'];

// A meal whose MAIN element is a viennoiserie / pastry / sweet dessert can NEVER be green
// (spec guardrail). Tokens picked to avoid collisions (no 'pie'/'tart'/'macaron').
const DESSERT_BASE_TOKENS = ['croissant', 'viennoiserie', 'pastry', 'patisserie', 'brioche', 'cake', 'gateau', 'donut', 'doughnut', 'muffin', 'cupcake', 'cookie', 'biscuit', 'dessert', 'tarte', 'waffle', 'gaufre', 'pancake', 'crepe', 'beignet', 'churro', 'brownie', 'pudding', 'glace', 'gelato', 'candy', 'bonbon', 'danish', 'scone', 'chausson', '디저트', '케이크', '쿠키', '도넛', '크루아상', '아이스크림', '페이스트리', '와플', '파이'];

// Fast-food / quick-service / industrial-production signals. A dish from this context is
// NEVER an idealized homemade recipe: it carries documented manufacturing markers (processed
// cheese & dough, refined frying oil, excess salt) even when not individually visible (spec).
const FAST_FOOD_NAME_TOKENS = ['fast food', 'fast-food', 'fastfood', 'junk food', 'junkfood', 'malbouffe', 'restauration rapide', 'a emporter', 'takeaway', 'take-away', 'take out', 'take-out', 'drive-in', 'mcdo', 'mcdonald', 'burger king', 'kfc', 'domino', 'pizza hut', 'papa john', 'subway', 'five guys', 'taco bell', 'wendy', 'popeyes', 'chipotle', 'little caesars', 'sbarro', 'chick-fil', 'in-n-out', 'shake shack', 'dairy queen', 'jollibee', 'nando', 'lotteria', 'panda express', '패스트푸드', '맥도날드', '버거킹', '롯데리아', '피자헛', '도미노'];
// Cheese names: on a fast-food dish these are industrial processed blends, not fresh cheese.
const CHEESE_NAME_TOKENS = ['cheese', 'fromage', 'mozzarella', 'mozza', 'cheddar', 'queso', 'formaggio', 'gouda', 'emmental', 'gruyere', 'parmesan', 'provolone', '치즈', '모짜렐라', '체다'];

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

/** True when a dish name names a fast-food chain or explicitly calls it fast food / takeaway. */
function isFastFoodName(name: string): boolean {
  const n = normalize(name);
  return FAST_FOOD_NAME_TOKENS.some((tk) => n.includes(normalize(tk)));
}

function isCheeseName(name: string): boolean {
  const n = normalize(name);
  return CHEESE_NAME_TOKENS.some((tk) => n.includes(tk));
}

// ─────────────────────────────────────────────────────────────────────
// TRUTH-IN-LABELING — only PROCESSED / CURED meat (charcuterie) is an IARC Group 1
// carcinogen. Plain, unprocessed meat is NOT: fresh poultry & fish are lean whole foods,
// and fresh red meat / ground (minced) beef is plain meat to eat in moderation — never a
// "carcinogen". This guard runs BEFORE the database/AI hint so a plain burger patty, ground
// beef or chicken can never carry the red "Carcinogenic / GRAVE" badge (user accuracy fix).
// ─────────────────────────────────────────────────────────────────────

// Cured / processed / deli meat — the ONLY meat that is genuinely IARC Group 1 (carcinogen).
const PROCESSED_MEAT_TOKENS = ['jambon', 'bacon', 'lardon', 'saucisse', 'saucisson', 'sausage', 'hot dog', 'hotdog', 'salami', 'chorizo', 'mortadelle', 'mortadella', 'pastrami', 'jerky', 'charcuterie', 'pepperoni', 'cordon bleu', 'prosciutto', 'serrano', 'merguez', 'chipolata', 'frankfurter', 'wiener', 'corned beef', 'grisons', 'bresaola', 'viande transforme', 'processed meat', 'deli meat', 'nugget', 'pane', 'breaded', 'fume', 'smoked', 'spam', 'luncheon', 'cervelas', 'andouille', 'boudin', 'rillette', 'pate', 'foie gras', 'knack', 'kebab', 'doner', 'cured', 'ham '];
// Fresh poultry & fish — lean whole foods, never carcinogenic.
const POULTRY_FISH_TOKENS = ['poulet', 'chicken', 'volaille', 'poultry', 'dinde', 'turkey', 'poisson', 'fish', 'saumon', 'salmon', 'thon', 'tuna', 'cabillaud', 'colin', 'merlu', 'truite', 'trout', 'sardine', 'maquereau', 'mackerel', 'crevette', 'shrimp', 'fruits de mer', 'seafood'];
// Fresh red meat incl. ground / minced beef — plain meat, moderation, NOT a carcinogen.
const RED_MEAT_TOKENS = ['viande hachee', 'steak hache', 'boeuf hache', 'ground beef', 'ground meat', 'minced meat', 'minced beef', 'viande rouge', 'red meat', 'boeuf', 'beef', 'steak', 'porc', 'pork', 'agneau', 'lamb', 'veau', 'veal', 'entrecote', 'bavette', 'rosbif', 'rosbeef', 'viande'];

/**
 * Returns the honest category for PLAIN, unprocessed meat, or null when the name is a
 * processed/cured meat (which must fall through to the database → carcinogen_g1) or not meat
 * at all. Poultry & fish → healthy; fresh red meat / ground beef → neutral. NEVER grave.
 */
function plainMeatCategory(name: string): MealCategory | null {
  const n = normalize(name);
  if (PROCESSED_MEAT_TOKENS.some((tk) => n.includes(normalize(tk)))) return null;
  if (POULTRY_FISH_TOKENS.some((tk) => n.includes(normalize(tk)))) return 'healthy';
  if (RED_MEAT_TOKENS.some((tk) => n.includes(normalize(tk)))) return 'neutral';
  return null;
}

/**
 * Applies the documented fast-food / industrial manufacturing markers to a detected meal
 * (spec): industrial cheese is processed (not fresh), refined frying oil and excess salt are
 * standard. Mutates the list in place, de-duplicating by category so a marker is never stacked
 * twice. Guarantees a mass-produced dish is never scored like an idealized homemade recipe.
 */
function applyFastFoodMarkers(ingredients: MealIngredient[]): void {
  // 1. Industrial cheese is a processed blend, not fresh — bump any benign cheese to processed.
  for (const ing of ingredients) {
    if (isCheeseName(ing.name) && (ing.category === 'healthy' || ing.category === 'neutral')) {
      ing.category = 'processed';
      ing.isGrave = false;
      if (!ing.note) {
        ing.note = pick({
          en: 'Industrial fast-food cheese — usually a processed blend, not fresh cheese.',
          fr: 'Fromage de fast-food industriel — souvent un mélange transformé, pas du fromage frais.',
          ko: '패스트푸드 가공 치즈 — 신선한 치즈가 아닌 가공 혼합물인 경우가 많습니다.',
        });
      }
    }
  }
  // 2. Refined frying / cooking oil — a fast-food standard, even when not visible.
  if (!ingredients.some((i) => i.category === 'refined_oil')) {
    ingredients.push({
      id: newMealIngredientId(),
      name: pick({ en: 'Refined oil', fr: 'Huile raffinée', ko: '정제유' }),
      category: 'refined_oil',
      isGrave: false,
      note: pick({
        en: 'Industrial frying & cooking oil, refined at high heat — a fast-food standard.',
        fr: 'Huile de friture et de cuisson industrielle, raffinée à haute température — un standard du fast-food.',
        ko: '고온에서 정제된 산업용 튀김·조리유 — 패스트푸드의 표준입니다.',
      }),
      intensity: 'normal',
    });
  }
  // 3. Excess salt — fast-food dishes are among the saltiest on the market.
  if (!ingredients.some((i) => i.category === 'excess_salt')) {
    ingredients.push({
      id: newMealIngredientId(),
      name: pick({ en: 'Excess salt', fr: 'Excès de sel', ko: '과도한 나트륨' }),
      category: 'excess_salt',
      isGrave: false,
      note: pick({
        en: 'Fast-food dishes are among the saltiest on the market, far above daily needs.',
        fr: 'Les plats de fast-food sont parmi les plus salés du marché, bien au-delà des besoins quotidiens.',
        ko: '패스트푸드는 시장에서 가장 짠 음식 중 하나로 일일 권장량을 훨씬 초과합니다.',
      }),
      intensity: 'normal',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────
// REFERENCE / ANCHOR FOODS — pin popular dishes to a realistic toxicity so the
// AI's idealized "clean homemade recipe" view can never score known junk too
// green. See constants/referenceFoods.ts for the database.
// ─────────────────────────────────────────────────────────────────────

/** A single localized junk-family marker, used to keep the breakdown coherent with the floor. */
function markerIngredient(cat: FoodMarker): MealIngredient {
  const info: Record<FoodMarker, { name: string; note: string }> = {
    processed: {
      name: pick({ en: 'Ultra-processed component', fr: 'Composant ultra-transformé', ko: '초가공 성분' }),
      note: pick({
        en: 'Industrial ultra-processed ingredient — not part of a clean home recipe.',
        fr: 'Ingrédient industriel ultra-transformé — pas une recette maison propre.',
        ko: '산업용 초가공 재료 — 깨끗한 가정식 재료가 아닙니다.',
      }),
    },
    added_sugar: {
      name: pick({ en: 'Added sugar', fr: 'Sucre ajouté', ko: '첨가당' }),
      note: pick({
        en: 'Added sugar — empty calories that spike blood sugar.',
        fr: 'Sucre ajouté — calories vides qui font grimper la glycémie.',
        ko: '첨가당 — 혈당을 급격히 올리는 빈 칼로리.',
      }),
    },
    refined_oil: {
      name: pick({ en: 'Refined oil', fr: 'Huile raffinée', ko: '정제유' }),
      note: pick({
        en: 'Refined cooking oil, high in pro-inflammatory omega-6.',
        fr: 'Huile de cuisson raffinée, riche en oméga-6 pro-inflammatoires.',
        ko: '염증을 유발하는 오메가-6가 많은 정제 조리유.',
      }),
    },
    refined_flour: {
      name: pick({ en: 'Refined flour', fr: 'Farine raffinée', ko: '정제 밀가루' }),
      note: pick({
        en: 'Refined white flour / dough — fast carbs stripped of fiber.',
        fr: 'Farine blanche raffinée / pâte — glucides rapides sans fibres.',
        ko: '정제 흰 밀가루·반죽 — 식이섬유가 제거된 빠른 탄수화물.',
      }),
    },
    excess_salt: {
      name: pick({ en: 'Excess salt', fr: 'Excès de sel', ko: '과도한 나트륨' }),
      note: pick({
        en: 'High in salt, well above daily needs.',
        fr: 'Riche en sel, bien au-delà des besoins quotidiens.',
        ko: '일일 권장량을 훨씬 초과하는 높은 나트륨.',
      }),
    },
    additive: {
      name: pick({ en: 'Industrial additives', fr: 'Additifs industriels', ko: '산업용 첨가물' }),
      note: pick({
        en: 'Industrial additives — flavor enhancers, preservatives, colorings.',
        fr: 'Additifs industriels — exhausteurs de goût, conservateurs, colorants.',
        ko: '산업용 첨가물 — 향미증진제, 보존료, 착색료.',
      }),
    },
  };
  const { name, note } = info[cat];
  return { id: newMealIngredientId(), name, category: cat, isGrave: false, note, intensity: 'normal' };
}

/** Ensures each given junk-family marker is present in the list (deduped by category). */
function ensureMarkers(ingredients: MealIngredient[], cats: readonly FoodMarker[]): void {
  for (const cat of cats) {
    if (ingredients.some((i) => i.category === cat)) continue;
    ingredients.push(markerIngredient(cat));
  }
}

/**
 * Matches a dish name against the reference / anchor food database (longest keyword wins).
 * Returns the anchor whose floor + markers pin the dish to a realistic toxicity, or null for
 * an unknown / genuinely-healthy dish (which the engine scores green by default).
 */
export function matchReferenceFood(dishName: string | undefined): ReferenceFood | null {
  if (!dishName) return null;
  const n = normalize(dishName);
  if (!n) return null;
  let best: ReferenceFood | null = null;
  let bestLen = 0;
  for (const food of REFERENCE_FOODS) {
    for (const kw of food.keywords) {
      const k = normalize(kw);
      if (k.length > bestLen && n.includes(k)) {
        best = food;
        bestLen = k.length;
      }
    }
  }
  return best;
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
  // TRUTH-IN-LABELING (user accuracy fix): plain unprocessed meat (fresh red meat,
  // ground/minced beef, poultry, fish) is NEVER a carcinogen — only processed/cured meat is.
  // Resolve it here, before the database or the AI hint, so it can never get the red
  // "carcinogenic / GRAVE" badge. Processed meat names (ham, bacon, sausage…) return null and
  // fall through to the database, which correctly classifies them as Group 1.
  const plainMeat = plainMeatCategory(name);
  if (plainMeat) return { category: plainMeat, isGrave: false };

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
// THE SCORE — /10 HEALTH score (spec §4). Higher = BETTER. The engine computes a
// TOXICITY value internally (all floors keyed on "higher = worse") then inverts it
// at the very end: health = 10 − toxicity. Deterministic so the confirmation screen
// can recompute it LIVE on every manual edit.
// ─────────────────────────────────────────────────────────────────────

export function computeMealScore(ingredients: MealIngredient[], dishName?: string): number {
  // An empty plate has nothing toxic → top health score (green).
  if (ingredients.length === 0) return 10;

  // The most serious carcinogen present. Group 1 (processed/cured meat, nitrites) is the real
  // meat carcinogen — plain fresh/ground meat, poultry and fish are NOT carcinogens and never
  // reach here. Group 1 is distinguished from industrial Group 2A/2B substances; only Group 1
  // can unlock a full 10 (internal toxicity).
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

  // COHERENCE FLOOR (spec): the final tier must never contradict the ORANGE dots the user
  // sees in the ingredient list. Like the IARC floor, but for accumulation — a meal showing
  // 2+ orange (ultra-processed) ingredients can never read "good meal" (green): yellow minimum.
  // 3+ orange ingredients land at "toxic" (orange) minimum. Salt/additive (yellow dots) still
  // add accumulation points but don't trigger this floor on their own.
  const orangeCount = ingredients.filter((i) => ORANGE_TIER_CATEGORIES.includes(i.category)).length;
  if (orangeCount >= 3) score = Math.max(score, 6);
  else if (orangeCount >= 2) score = Math.max(score, 4);

  // REFERENCE / ANCHOR FOOD FLOOR (spec): a popular indulgent dish (pizza, burger, fried
  // chicken, tteokbokki, ramyeon, croissant, donut…) carries a known realistic minimum, so the
  // AI's idealized "clean homemade recipe" view can never push it too green. Genuinely healthy
  // dishes have no anchor and stay green. Keyed on the dish name → recomputes live on edits.
  const anchor = matchReferenceFood(dishName);
  if (anchor) score = Math.max(score, anchor.floor);

  // ── Bounds (spec §4 + the 10/10 tightening) ──
  // The full 10 is RESERVED for a CIRC group-1 carcinogen (processed/cured meat, nitrites)
  // COMBINED with heavy accumulation (added sugar + refined oils + ultra-processing).
  // A group 2A/2B carcinogen (industrial substances such as acrylamide) or pure accumulation
  // CAPS AT 9 — never a full 10, so an ordinary junky dish can't reach 10.
  const heavyAccumulation = hasSugar && hasOil && hasProcessed;
  const canReachTen = hasG1 && heavyAccumulation;
  if (!canReachTen) score = Math.min(score, 9);
  // A PERFECT meal must reach 10/10 health (toxicity 0): no carcinogen, no junk family at
  // all, and at least one genuine whole food. Otherwise, a non-carcinogen meal keeps a floor
  // of 1 toxicity (health capped at 9) so a purely neutral/empty plate isn't rated perfect.
  const hasAnyJunk = JUNK_FAMILY_CATEGORIES.some((fam) => ingredients.some((i) => i.category === fam));
  const isCleanHealthyMeal = !hasCarcinogen && !hasAnyJunk && effectiveHealthy >= 1;
  if (!hasCarcinogen && !isCleanHealthyMeal) score = Math.max(score, 1);

  // `score` here is the internal TOXICITY (higher = worse). The app displays a HEALTH
  // score (higher = better), so invert at the boundary. A carcinogen toxicity floor of 6
  // therefore becomes a health CAP of 4, exactly as specified.
  return 10 - Math.round(score);
}

/**
 * Maps a /10 HEALTH score to its tier (spec): 8-10 green, 5-7 yellow, 3-4 orange, 0-2 red.
 * Higher score = healthier = greener.
 */
export function scoreToTier(score: number): MealTier {
  if (score >= 8) return 'green';
  if (score >= 5) return 'yellow';
  if (score >= 3) return 'orange';
  return 'red';
}

// ═══════════════════════════════════════════════════════════════════════
// AI — STEP 1: detect the dish + its ingredients from the photo
// ═══════════════════════════════════════════════════════════════════════

const safeString = (fallback = '') =>
  z.preprocess((v) => (v === undefined || v === null ? fallback : typeof v === 'string' ? v : String(v)), z.string());

const detectSchema = z.object({
  dish_name: safeString(''),
  // Whether the dish comes from a fast-food / quick-service / industrial context (spec).
  is_fast_food: z.preprocess((v) => v === true || v === 'true' || v === 1, z.boolean()),
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

// Shared ingredient rules — kept identical between photo detection and text re-analysis so a
// dish classifies the same way whether it was seen or named by the user.
const MEAL_INGREDIENT_RULES = `2. ALWAYS identify the MAIN / BASE food of the dish FIRST — the pastry, bread, dough, batter, noodles, rice or protein the dish is built on — not only the toppings or fillings. A "chocolate croissant" MUST list the viennoiserie pastry itself (refined flour + butter), not just the chocolate. A "pizza" must list the dough; a "burger" the bun and the patty. THEN add toppings, sauces and the usual hidden ingredients a real recipe contains (oils, sugar, sauces, condiments). Stay realistic — do not invent rare additives.
3. For EACH ingredient set:
   - name: the ingredient name in the user's language.
   - category: EXACTLY one of: carcinogen_g1 | carcinogen_2a | carcinogen_2b | processed | added_sugar | refined_oil | refined_flour | excess_salt | additive | healthy | neutral
   - is_grave: true ONLY if dangerous / IARC-classified (carcinogen). NEVER true for merely processed/sugary/fatty food.
   - intensity: "high" ONLY for added_sugar when the sugar is MASSIVE / DOMINANT (desserts, pastries, candy, sodas, sweet drinks, syrupy dishes); otherwise "normal". Always "normal" for non-sugar ingredients.
   - note: ONE VERY SHORT educational note (maximum 10 words), frank, in the user's language. Never longer.

CLASSIFICATION GUIDANCE:
- ONLY processed / cured / deli meat (ham, bacon, sausage, hot dog, salami, pepperoni, chorizo, charcuterie, anything cured or smoked with nitrites) → carcinogen_g1 (IARC Group 1, GRAVE).
- PLAIN, UNPROCESSED meat is NOT carcinogenic and must NEVER be carcinogen_* and NEVER is_grave. Fresh poultry and fish (chicken, turkey, salmon…) → healthy. Fresh red meat — beef, GROUND / MINCED beef ("viande hachée"), steak, pork, lamb → neutral (eat in moderation, but NOT a carcinogen). A plain beef patty or ground beef is ordinary fresh meat, exactly like a steak — NEVER label it carcinogenic or GRAVE. Chicken is just chicken; ground meat is just meat.
- Refined oils (palm, canola, sunflower, soy, deep-frying oil) → refined_oil.
- Refined-flour / refined-carb base (white flour, viennoiserie & pastry dough, white bread, croissant, brioche, cake, cookies, donuts, white bun) → refined_flour. Whole-grain / wholemeal bread → healthy.
- Other visibly industrial components (processed cheese, industrial sauces, nuggets) → processed.
- "neutral" is RESERVED for ingredients with truly no nutritional impact: water, plain spices, herbs, black coffee, tea, vinegar. A clearly SWEET or PROCESSED item (chocolate powder, syrups, sweet sauces, frosting, sweet toppings) is NEVER "neutral" — classify it as added_sugar (or processed).
- Milk and cream are "healthy" at most; as an incidental drink component they do NOT make a sugary/pastry meal healthy.

FAST-FOOD / INDUSTRIAL CONTEXT (spec — critical, do NOT skip):
- Judge whether the dish comes from a FAST-FOOD / quick-service / industrial / mass-produced setting. Photo signals: branded wrappers, cardboard boxes, fast-food trays, paper bags, uniform machine-made shapes, glossy melted processed cheese, deep-fried glaze, a chain's signature plating. Text signals: the user names a chain (McDonald's, Burger King, KFC, Domino's, Pizza Hut, Subway, Quick…) or says "fast food", "takeaway", "junk food".
- Output a top-level boolean "is_fast_food": true when this context is present, otherwise false.
- When is_fast_food is true, do NOT decompose the dish as an idealized homemade recipe. Apply the documented fast-food manufacturing markers EVEN IF not individually visible: the cheese is industrial/processed (category "processed", never "healthy"), refined frying/cooking oil is used (include a refined_oil ingredient), and the dish is heavily salted (include an excess_salt ingredient). Fast-food pizzas, burgers and fried items are among the saltiest, oiliest and most processed foods on the market — your ingredient list must reflect that, not a clean home kitchen.
- A genuinely homemade or made-to-order restaurant dish keeps is_fast_food false and is analyzed normally.

POPULAR DISHES (pizza, burger, fried chicken, fries, tacos, kebab, ramen / ramyeon, tteokbokki, japchae, pasta, lasagna, croissant, pain au chocolat, donut, cake, ice cream…): these everyday restaurant, street-food and packaged dishes — Korean, American and French comfort foods included — are NOT idealized homemade recipes either. Always surface their real refined and processed building blocks: the refined-flour dough / bun / noodles / pastry, the frying or cooking oil, the sugar in sweet sauces and desserts, and the salt — never a stripped-down clean version.

GOLDEN RULE (spec §4): NEVER label sugar, fat, refined flour or processed food as "carcinogenic". NEVER label plain fresh meat, ground/minced meat, poultry or fish as "carcinogenic" either — only PROCESSED / CURED meat (charcuterie: ham, bacon, sausage, salami) is. Always distinguish SERIOUS (dangerous / IARC) from NOT HEALTHY (processed / sugary / fatty / refined). A sugary cake is "ultra-processed and very sweet" — never "carcinogenic".

SPEED RULE: be concise. Return 4 to 8 ingredients MAXIMUM (only the most impactful ones — merge minor duplicates), plus the top-level "is_fast_food" boolean. Output compact JSON only, no prose, no reasoning.`;

const DETECT_SYSTEM = `You are Dr. Toxi, an expert in food toxicity (WHO/IARC classification) AND nutrition. You analyze a PHOTO of a real meal.

TASK:
1. Identify the dish in a few words (dish_name).
${MEAL_INGREDIENT_RULES}`;

// Text re-analysis prompt. The user has TYPED or CORRECTED the dish themselves, so their
// words are authoritative and OVERRIDE any earlier photo guess (spec: manual input wins).
const DETECT_FROM_TEXT_SYSTEM = `You are Dr. Toxi, an expert in food toxicity (WHO/IARC classification) AND nutrition. The user has TYPED or CORRECTED the exact dish themselves. Their description is AUTHORITATIVE and OVERRIDES any earlier photo-based guess: analyze EXACTLY the dish they name and NEVER substitute or revert to a different dish. If the user's words name a fast-food chain or call the dish fast food / takeaway / junk food, treat that as authoritative fast-food context: set is_fast_food true and apply the fast-food markers below.

TASK:
1. Use the user's own words as dish_name (fix only obvious spelling) — do NOT rename it to a different dish.
${MEAL_INGREDIENT_RULES}`;

const DETECT_INSTRUCTION = pick({
  en: 'Analyze this meal photo and return the dish name and its ingredients.',
  fr: "Analyse cette photo de repas et retourne le nom du plat et ses ingrédients.",
  ko: '이 식사 사진을 분석해서 음식 이름과 재료를 알려주세요.',
});

function detectFromTextInstruction(dishName: string): string {
  return pick({
    en: `The user states this meal is exactly: "${dishName}". Analyze THIS dish — list the real ingredients of a typical "${dishName}" (including its main / base food) and classify each one. Do not revert to any other dish.`,
    fr: `L'utilisateur indique que ce repas est exactement : « ${dishName} ». Analyse CE plat — liste les vrais ingrédients d'un(e) « ${dishName} » typique (y compris son aliment principal / de base) et classe chacun. Ne reviens jamais à un autre plat.`,
    ko: `사용자가 이 식사는 정확히 "${dishName}"라고 합니다. 이 음식을 분석하세요 — 일반적인 "${dishName}"의 실제 재료(주재료 포함)를 나열하고 각각 분류하세요. 다른 음식으로 되돌리지 마세요.`,
  });
}

/**
 * Hard language lock for the meal flow, resolved at request time from the APP language.
 * The dish name, EVERY ingredient name, EVERY note and the verdict must be written in that
 * language ONLY — never mixed. Mirrors the product scanner's lock and guarantees Korean can
 * never leak into an English app (or vice-versa), even when the dish or the photo's text is
 * in another language. Prepended to every meal AI system prompt.
 */
function mealLanguageLock(): string {
  return pick({
    en: 'ABSOLUTE LANGUAGE RULE (overrides everything below): the app language is ENGLISH. Write dish_name, EVERY ingredient name, EVERY note and the verdict in ENGLISH ONLY. Translate any foreign dish or ingredient into English (keep the original in parentheses only when truly useful). NEVER output a Korean or French word. The entire JSON must be 100% English.',
    fr: "RÈGLE DE LANGUE ABSOLUE (prime sur tout ce qui suit) : la langue de l'app est le FRANÇAIS. Écris dish_name, CHAQUE nom d'ingrédient, CHAQUE note et le verdict en FRANÇAIS UNIQUEMENT. Traduis tout plat ou ingrédient étranger en français (garde l'original entre parenthèses seulement si c'est vraiment utile). N'écris JAMAIS un mot coréen ou anglais. Tout le JSON doit être 100% français.",
    ko: '절대 언어 규칙(아래의 모든 규칙에 우선): 앱 언어는 한국어입니다. dish_name, 모든 재료 이름, 모든 note, 그리고 verdict를 반드시 한국어로만 작성하세요. 외국 음식이나 재료는 한국어로 번역하세요(정말 필요할 때만 원어를 괄호로 병기). 영어나 프랑스어 단어를 절대 쓰지 마세요. 전체 JSON은 100% 한국어여야 합니다.',
  });
}

export interface DetectedMeal {
  dishName: string;
  ingredients: MealIngredient[];
}

/** Shared post-processing: dedupe + cross-reference each detected ingredient against the DB. */
function buildDetectedMeal(raw: z.infer<typeof detectSchema>, fallbackName: string): DetectedMeal {
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
  const dishName = raw.dish_name.trim() || fallbackName;
  // Reference / anchor food — match the dish against the popular-dishes database so a known
  // indulgent dish carries its definitional refined / processed / sweet markers (spec).
  const anchor = matchReferenceFood(dishName) ?? matchReferenceFood(fallbackName);
  // Fast-food / industrial context — flagged by the AI from the photo, detected from a chain
  // name in the dish name, or inherent to the anchored dish (deep-fried, instant, chain street
  // food): apply the documented manufacturing markers so a mass-produced dish is never scored
  // like an idealized homemade recipe (spec).
  if (raw.is_fast_food || isFastFoodName(dishName) || isFastFoodName(fallbackName) || anchor?.industrial) {
    applyFastFoodMarkers(ingredients);
  }
  // Inject the anchor's definitional junk markers (deduped) so the breakdown the user sees
  // stays coherent with the reference-food score floor applied in computeMealScore.
  if (anchor?.markers && anchor.markers.length > 0) {
    ensureMarkers(ingredients, anchor.markers);
  }
  return { dishName, ingredients };
}

/**
 * STEP 1 — vision detection. Returns the dish name + a classified ingredient list
 * (each ingredient cross-referenced against the local database in priority).
 */
export async function detectMealFromPhoto(imageBase64: string): Promise<DetectedMeal> {
  const startedAt = Date.now();
  const raw = await aiGenerateObject({
    system: mealLanguageLock() + '\n\n' + DETECT_SYSTEM + getAnalysisRegionPrompt(),
    schema: detectSchema,
    maxTokens: 1000,
    model: MEAL_VISION_MODEL_ID,
    provider: MEAL_VISION_PROVIDER,
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
  console.log('[MealScan] Photo detection took', Date.now() - startedAt, 'ms');
  return buildDetectedMeal(raw, pick({ en: 'My meal', fr: 'Mon repas', ko: '내 식사' }));
}

/**
 * TEXT RE-ANALYSIS — the user corrected (or typed) the dish name. The text is the source of
 * truth: we re-detect the ingredient list for THAT dish (never the photo guess), cross-reference
 * each ingredient against the local database, then the score recomputes from the fresh list.
 */
export async function detectMealFromText(dishName: string): Promise<DetectedMeal> {
  const cleanName = dishName.trim();
  const startedAt = Date.now();
  const raw = await aiGenerateObject({
    system: mealLanguageLock() + '\n\n' + DETECT_FROM_TEXT_SYSTEM + getAnalysisRegionPrompt(),
    schema: detectSchema,
    maxTokens: 1000,
    model: MEAL_VISION_MODEL_ID,
    provider: MEAL_VISION_PROVIDER,
    messages: [{ role: 'user', content: detectFromTextInstruction(cleanName) }],
  });
  console.log('[MealScan] Text re-analysis took', Date.now() - startedAt, 'ms');
  const detected = buildDetectedMeal(raw, cleanName);
  // The user's typed name is authoritative — keep it verbatim over any AI rewrite.
  return { dishName: cleanName || detected.dishName, ingredients: detected.ingredients };
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
  // Low HEALTH score = toxic meal → offer healthier alternatives (was toxicity ≥ 6).
  const needsAlternatives = score <= 4;
  const ingredientLines = ingredients
    .map((i) => `- ${i.name} [${i.category}${i.isGrave ? ', GRAVE' : ''}]`)
    .join('\n');

  const system = `You are Dr. Toxi, an expert in food toxicity (WHO/IARC) AND nutrition. Write the verdict for a scanned meal.

DISH: ${dishName}
HEALTH SCORE: ${score}/10 (higher = BETTER, lower = more toxic). Tier: ${tier}.
INGREDIENTS (category in brackets, GRAVE = dangerous/IARC):
${ingredientLines}

WRITE:
1. verdict_text: a broken-down, ingredient-by-ingredient verdict (e.g. "The ham contains sodium nitrites (carcinogenic). The oil is refined. The cheese is fine. The tomato is healthy."). Pedagogical, clear, 3-6 sentences. Tone: ${TONE_BY_TIER[tier]}.
   GOLDEN RULE: NEVER call sugar/fat/refined flour/processed food "carcinogenic". Distinguish SERIOUS (dangerous/IARC) from NOT HEALTHY (processed/sugary/fatty/refined).
   HEALTH IMPACT (MANDATORY — every verdict, no exception): after the breakdown, ALWAYS finish by explaining the CONCRETE health impact of eating this kind of meal on the body.
     - Healthy meal (high score / green): explain the real BENEFITS these foods bring — sustained energy, vitamins & minerals, fiber, quality protein, antioxidants, protection for the heart, gut and immune system — in a motivating, encouraging tone.
     - Unhealthy meal (lower score / orange-red): honestly explain the real HEALTH RISKS of eating this kind of meal regularly — weight gain, blood-sugar spikes, higher type-2 diabetes risk, chronic inflammation, cardiovascular strain — truthful but WITHOUT scaremongering and never guilt-tripping.
     In French, always use tutoiement ("tu").
${needsAlternatives
      ? `2. alternative_home: a HEALTHY and SIMILAR homemade version of the SAME dish (stay close to the craving — a pizza lover wants a better pizza, not a salad). One or two sentences.
3. alternative_restaurant: what TYPE of dish to pick instead next time at a restaurant. One sentence.`
      : `2. alternative_home: "" (empty — health score is high enough, no alternatives needed)
3. alternative_restaurant: "" (empty)`}

Respond in the user's app language. Output JSON only.`;

  const startedAt = Date.now();
  const raw = await aiGenerateObject({
    system: mealLanguageLock() + '\n\n' + system + getAnalysisRegionPrompt() + getHealthProfileAnalysisPrompt(),
    schema: verdictSchema,
    maxTokens: 900,
    messages: [
      { role: 'user', content: pick({ en: 'Write the verdict for this meal.', fr: 'Rédige le verdict pour ce repas.', ko: '이 식사에 대한 판정을 작성해 주세요.' }) },
    ],
  });
  console.log('[MealScan] Verdict generation took', Date.now() - startedAt, 'ms');

  const home = raw.alternative_home.trim();
  const restaurant = raw.alternative_restaurant.trim();
  return {
    verdictText: raw.verdict_text.trim(),
    alternatives: needsAlternatives && (home || restaurant) ? { home, restaurant } : null,
  };
}
