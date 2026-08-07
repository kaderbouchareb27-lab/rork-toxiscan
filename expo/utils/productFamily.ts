/**
 * MOTEUR DE FAMILLES PRODUIT — déduction déterministe du TYPE de produit à partir de la
 * signature d'ingrédients, croisée avec les indices visuels lus sur la photo.
 *
 * Pourquoi ce module existe : quand la photo ne montre que le dos de l'emballage, aucun nom
 * commercial n'est lisible. L'ancienne heuristique déduisait alors « Corn chips » dès qu'elle
 * voyait « maïs » (présent dans « sirop de glucose de maïs ») + une huile — un sachet de
 * bonbons colorés se retrouvait donc nommé « Corn chips ».
 *
 * Deux garde-fous :
 *  1. Chaque famille exige une BASE réelle (farine de maïs / masa, pas un sirop de glucose de
 *     maïs) et rejette les marqueurs des familles concurrentes.
 *  2. `isNameContradicted` permet de VÉTO un nom (lu par l'OCR ou proposé par l'IA) qui
 *     affirme une famille incompatible avec la signature d'ingrédients.
 */
import { pick } from '@/utils/i18n';

export type ProductFamily =
  | 'chewing-gum'
  | 'candy'
  | 'chocolate'
  | 'potato-chips'
  | 'corn-chips'
  | 'biscuit'
  | 'bakery'
  | 'breakfast-cereal'
  | 'processed-meat'
  | 'dairy-dessert'
  | 'sweet-drink'
  | 'condiment'
  | 'pasta';

/** Coarse group used for the name veto: two different groups = incompatible claims. */
export type FamilyGroup =
  | 'confectionery'
  | 'chocolate'
  | 'salty-snack'
  | 'bakery'
  | 'cereal'
  | 'meat'
  | 'dairy'
  | 'drink'
  | 'condiment'
  | 'pasta';

const FAMILY_GROUP: Record<ProductFamily, FamilyGroup> = {
  'chewing-gum': 'confectionery',
  candy: 'confectionery',
  chocolate: 'chocolate',
  'potato-chips': 'salty-snack',
  'corn-chips': 'salty-snack',
  biscuit: 'bakery',
  bakery: 'bakery',
  'breakfast-cereal': 'cereal',
  'processed-meat': 'meat',
  'dairy-dessert': 'dairy',
  'sweet-drink': 'drink',
  condiment: 'condiment',
  pasta: 'pasta',
};

const FAMILY_LABEL: Record<ProductFamily, { en: string; fr: string; ko: string }> = {
  'chewing-gum': { en: 'Chewing gum', fr: 'Chewing-gum', ko: '껌' },
  candy: { en: 'Candy', fr: 'Bonbons', ko: '사탕' },
  chocolate: { en: 'Chocolate confection', fr: 'Confiserie chocolatée', ko: '초콜릿 과자' },
  'potato-chips': { en: 'Potato chips', fr: 'Chips de pommes de terre', ko: '감자칩' },
  'corn-chips': { en: 'Corn chips', fr: 'Chips de maïs', ko: '옥수수칩' },
  biscuit: { en: 'Sweet biscuit', fr: 'Biscuit sucré', ko: '단과자' },
  bakery: { en: 'Bakery product', fr: 'Produit de boulangerie', ko: '빵류' },
  'breakfast-cereal': { en: 'Breakfast cereal', fr: 'Céréales de petit-déjeuner', ko: '아침 시리얼' },
  'processed-meat': { en: 'Processed meat', fr: 'Viande transformée', ko: '가공육' },
  'dairy-dessert': { en: 'Dairy dessert', fr: 'Dessert lacté', ko: '유제품 디저트' },
  'sweet-drink': { en: 'Sweetened beverage', fr: 'Boisson sucrée', ko: '가당 음료' },
  condiment: { en: 'Condiment sauce', fr: 'Sauce condiment', ko: '소스류' },
  pasta: { en: 'Pasta or noodles', fr: 'Pâtes ou nouilles', ko: '면류' },
};

/** Same normalization as utils/api.ts (ASCII + Hangul kept), duplicated to keep this module standalone. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────
// SIGNAUX
// Chaque signal est un test sur la liste normalisée d'ingrédients. Les DÉRIVÉS d'une
// matière première (sirop de glucose de maïs, amidon de maïs, huile de maïs…) ne comptent
// JAMAIS comme la base « maïs » : c'est exactement le piège qui nommait un bonbon « Corn chips ».
// ─────────────────────────────────────────────────────────────────────

/** Corn derivatives that must NOT be read as "the product is made of corn". */
const CORN_DERIVATIVE_REGEX =
  /(sirop (de )?(glucose|fructose|mais)|glucose[- ]?fructose|corn syrup|high fructose|amidon|starch|fecule|maltodextrin|maltodextrine|huile de mais|corn oil|dextrose|corn fib|fibre de mais|proteine de mais|corn protein|zein)/;

/** A genuine corn/maize BASE (the product is literally made of ground corn). */
const CORN_BASE_REGEX =
  /(farine de mais|maize flour|corn flour|cornmeal|corn meal|semoule de mais|masa|tortilla|mais moulu|ground corn|corn grits|gritz|whole corn|mais entier|nixtamal|polenta|옥수수 가루|옥수수분)/;

const POTATO_BASE_REGEX =
  /(pomme de terre|pommes de terre|potatoes?|flocons? de pomme de terre|potato flakes|granules de pomme de terre|감자)/;
const POTATO_DERIVATIVE_REGEX = /(amidon de pomme de terre|potato starch|fecule de pomme de terre|proteine de pomme de terre)/;

const FRYING_FAT_REGEX =
  /(huile de (tournesol|palme|colza|coton|arachide|mais|olive|carthame|soja)|huiles? vegetales?|(sunflower|palm|rapeseed|canola|cottonseed|peanut|corn|safflower|soybean|vegetable) oil|graisse (vegetale|de palme)|shortening|palm fat|식용유|해바라기유|팜유)/;

const SUGAR_BASE_REGEX =
  /(sucre|sugar|sirop de glucose|glucose syrup|sirop de mais|corn syrup|sirop de fructose|glucose[- ]?fructose|high fructose|isoglucose|sirop de sucre|dextrose|saccharose|sucrose|sirop de riz|rice syrup|melasse|molasses|설탕|물엿|포도당)/;

/**
 * Synthetic colours — a strong confectionery marker. Named dyes and E-numbers only: the bare
 * words « colorant » / « dye » would also match caramel colour in a cola, and a soda is not a sweet.
 */
const SYNTHETIC_DYE_REGEX =
  /(\be1(0[24689]|1[02457]|2[24]|3[12489]|4[236]|5[15])[a-f]?\b|allura|tartrazine|sunset yellow|jaune orange|brilliant blue|bleu brillant|indigotine|carmoisine|azorubine|ponceau|erythrosine|quinoline|patent blue|bleu patente|fast green|vert solide|(red|rouge|yellow|jaune|blue|bleu|green|vert) ?#?(1|2|3|5|6|33|40)\b|aluminium lake|aluminum lake)/;

/** Gelling / texturising agents typical of gummies and jellies. */
const CANDY_GELLING_REGEX =
  /(gelatine|gelatin|pectine|pectin|gomme arabique|gum arabic|amidon modifie|modified starch|carraghenane|carrageenan|gomme xanthane|젤라틴|펙틴)/;

/** Souring agents typical of sweets and sour candies. */
const ACIDULANT_REGEX =
  /(acide citrique|citric acid|acide malique|malic acid|acide tartrique|tartaric acid|acide lactique|lactic acid|acide fumarique|구연산|사과산)/;

/** Surface glazing agents used almost exclusively on sweets, coated candies and tablets. */
const CANDY_GLAZING_REGEX =
  /(cire de carnauba|carnauba|shellac|gomme laque|confectioner s glaze|confectioners glaze|glacage de confiseur|cire d abeille|beeswax|\be90[1-4]\b|카르나우바|셸락)/;

const CHEWING_GUM_REGEX = /(gum base|gomme base|base de gomme|chewing gum|base gomme a macher|껌 베이스)/;
const COCOA_REGEX = /(cacao|cocoa|chocolat|chocolate|beurre de cacao|cocoa butter|카카오|코코아|초콜릿)/;
const WHEAT_FLOUR_REGEX = /(farine de (ble|froment|epeautre|seigle)|wheat flour|rye flour|spelt flour|farine complete|밀가루)/;
const GENERIC_FLOUR_REGEX = /(\bfarines?\b|\bflour\b|semoule|semolina)/;
const YEAST_REGEX = /(levure|yeast|levain|sourdough|이스트|효모)/;
const BUTTER_FAT_REGEX = /(beurre|butter|margarine|matiere grasse|버터)/;
const CEREAL_FLAKE_REGEX =
  /(avoine|\boats?\b|flocons?|flakes?|cereales?|cereals?|granola|muesli|riz souffle|puffed rice|ble complet|whole wheat|오트|시리얼|귀리)/;
const HONEY_REGEX = /(miel|honey|sirop d erable|maple syrup|꿀)/;
const MEAT_REGEX =
  /(porc|pork|boeuf|beef|poulet|chicken|dinde|turkey|jambon|ham|bacon|viande|\bmeat\b|saucisse|sausage|salami|chorizo|돼지|소고기|닭고기)/;
const CURING_REGEX = /(nitrite|nitrate|\be25[0-2]\b|sel nitrite|curing salt|아질산)/;
const DAIRY_REGEX = /(lait|\bmilk\b|creme|cream|yaourt|yogourt|yogurt|fromage|cheese|우유|크림|요구르트)/;
const WATER_BASE_REGEX = /(\beau\b|eau gazeifiee|carbonated water|\bwater\b|sparkling water|\b물\b|정제수)/;
const SWEETENER_REGEX = /(aspartame|sucralose|stevia|acesulfame|saccharine|cyclamate|\be95[0-5]\b|아스파탐|수크랄로스)/;
const CONDIMENT_BASE_REGEX = /(vinaigre|vinegar|tomate|tomato|moutarde|mustard|식초|토마토|겨자)/;
const SALT_REGEX = /(\bsels?\b|\bsalt\b|소금)/;
const PASTA_REGEX =
  /(pate alimentaire|pates alimentaires|\bpasta\b|nouille|noodle|vermicelle|spaghetti|macaroni|semoule de ble dur|durum wheat semolina|durum semolina|ble dur|\b면\b|국수)/;
const SEASONING_REGEX = /(arome|aroma|flavour|flavor|glutamate|assaisonnement|seasoning|\be62[0-5]\b|조미|향료)/;

export type FamilyDetection = {
  readonly family: ProductFamily;
  readonly group: FamilyGroup;
  readonly label: string;
  /** `signature` = matched a real family signature. `weak` = sweet/salty guess only. */
  readonly confidence: 'signature' | 'weak';
};

type Signals = {
  readonly cornBase: boolean;
  readonly potatoBase: boolean;
  readonly fryingFat: boolean;
  readonly sugar: boolean;
  readonly dye: boolean;
  readonly gelling: boolean;
  readonly acidulant: boolean;
  readonly glazing: boolean;
  readonly gumBase: boolean;
  readonly cocoa: boolean;
  readonly wheatFlour: boolean;
  readonly anyFlour: boolean;
  readonly yeast: boolean;
  readonly butterFat: boolean;
  readonly cerealFlake: boolean;
  readonly honey: boolean;
  readonly meat: boolean;
  readonly curing: boolean;
  readonly dairy: boolean;
  readonly water: boolean;
  readonly sweetener: boolean;
  readonly condimentBase: boolean;
  readonly salt: boolean;
  readonly pasta: boolean;
  readonly seasoning: boolean;
};

/**
 * Reads every signal from the ingredient list. Corn and potato bases are detected on the
 * INDIVIDUAL ingredient (so "sirop de glucose de maïs" can be excluded as a derivative),
 * every other signal is matched on the joined list.
 */
function readSignals(ingredientNames: readonly string[]): Signals {
  const items = ingredientNames.map((n) => normalize(n)).filter((n) => n.length > 0);
  const joined = items.join(' | ');

  const cornBase = items.some((item) => CORN_BASE_REGEX.test(item) && !CORN_DERIVATIVE_REGEX.test(item));
  const potatoBase = items.some((item) => POTATO_BASE_REGEX.test(item) && !POTATO_DERIVATIVE_REGEX.test(item));

  return {
    cornBase,
    potatoBase,
    fryingFat: FRYING_FAT_REGEX.test(joined),
    sugar: SUGAR_BASE_REGEX.test(joined),
    dye: SYNTHETIC_DYE_REGEX.test(joined),
    gelling: CANDY_GELLING_REGEX.test(joined),
    acidulant: ACIDULANT_REGEX.test(joined),
    glazing: CANDY_GLAZING_REGEX.test(joined),
    gumBase: CHEWING_GUM_REGEX.test(joined),
    cocoa: COCOA_REGEX.test(joined),
    wheatFlour: WHEAT_FLOUR_REGEX.test(joined),
    anyFlour: GENERIC_FLOUR_REGEX.test(joined),
    yeast: YEAST_REGEX.test(joined),
    butterFat: BUTTER_FAT_REGEX.test(joined),
    cerealFlake: CEREAL_FLAKE_REGEX.test(joined),
    honey: HONEY_REGEX.test(joined),
    meat: MEAT_REGEX.test(joined),
    curing: CURING_REGEX.test(joined),
    dairy: DAIRY_REGEX.test(joined),
    water: WATER_BASE_REGEX.test(joined),
    sweetener: SWEETENER_REGEX.test(joined),
    condimentBase: CONDIMENT_BASE_REGEX.test(joined),
    salt: SALT_REGEX.test(joined),
    pasta: PASTA_REGEX.test(joined),
    seasoning: SEASONING_REGEX.test(joined),
  };
}

/**
 * Ordered signatures. Confectionery comes BEFORE the fried-snack families: a bag of coloured
 * sweets contains corn glucose syrup and a glazing wax, never a frying base.
 */
function matchFamily(s: Signals): ProductFamily | null {
  if (s.gumBase) return 'chewing-gum';

  // CANDY — sugar base + at least two confectionery markers (dye / gelling / glazing /
  // acidulant), and no competing base: no fried/baked base, no cocoa, no meat, and no water
  // base (water + sugar + colour is a soda, not a sweet).
  const candyMarkers = [s.dye, s.gelling, s.glazing, s.acidulant].filter(Boolean).length;
  const noCompetingBase = !s.cornBase && !s.potatoBase && !s.wheatFlour && !s.yeast && !s.water && !s.cocoa && !s.meat;
  if (s.sugar && candyMarkers >= 2 && noCompetingBase) return 'candy';
  // A single very strong marker is enough when the list has no fat, no flour and no dairy —
  // typical hard candy / jelly (sugar + glucose syrup + acid + colour).
  if (s.sugar && candyMarkers >= 1 && noCompetingBase && !s.anyFlour && !s.fryingFat && !s.dairy) {
    return 'candy';
  }

  if (s.cocoa && s.sugar && !s.meat) return 'chocolate';
  if (s.potatoBase && s.fryingFat) return 'potato-chips';
  if (s.cornBase && s.fryingFat) return 'corn-chips';
  if (s.meat && (s.curing || s.salt)) return 'processed-meat';
  if (s.cerealFlake && (s.sugar || s.honey) && !s.wheatFlour) return 'breakfast-cereal';
  if (s.anyFlour && s.sugar && (s.butterFat || s.fryingFat)) return 'biscuit';
  if (s.anyFlour && s.yeast) return 'bakery';
  if (s.pasta && !s.sugar) return 'pasta';
  if (s.dairy && s.sugar && !s.anyFlour) return 'dairy-dessert';
  if (s.water && (s.sugar || s.sweetener)) return 'sweet-drink';
  if (s.condimentBase && (s.sugar || s.salt)) return 'condiment';
  return null;
}

/**
 * Deduce the product family from the ingredient list. Returns `null` only when the list is
 * empty — otherwise a `weak` sweet/salty guess is returned so the UI is never blank.
 *
 * `visualHint` is the free-text product type the vision model read off the PHOTO (shape,
 * colour, packaging). It can only pick between families the ingredients already allow, so a
 * hallucinated visual guess can never override the label.
 */
export function detectProductFamily(
  ingredientNames: readonly string[],
  visualHint?: string | null,
): FamilyDetection | null {
  if (ingredientNames.length === 0) return null;
  const signals = readSignals(ingredientNames);
  const matched = matchFamily(signals);

  if (matched) {
    // The photo can REFINE within the same group (corn chips vs potato chips, candy vs gum),
    // never jump to another group.
    const fromVisual = visualHint ? familyAssertedByName(visualHint) : null;
    if (fromVisual && FAMILY_GROUP[fromVisual] === FAMILY_GROUP[matched] && fromVisual !== matched) {
      console.log('[Family] Visual hint refined', matched, '→', fromVisual);
      return { family: fromVisual, group: FAMILY_GROUP[fromVisual], label: pick(FAMILY_LABEL[fromVisual]), confidence: 'signature' };
    }
    return { family: matched, group: FAMILY_GROUP[matched], label: pick(FAMILY_LABEL[matched]), confidence: 'signature' };
  }

  // No signature: the photo alone may still identify the family (a visibly fried crisp bag
  // whose ingredient list is unreadable). Only trusted when the ingredients don't object.
  const fromVisual = visualHint ? familyAssertedByName(visualHint) : null;
  if (fromVisual) {
    console.log('[Family] No ingredient signature — using visual hint', fromVisual);
    return { family: fromVisual, group: FAMILY_GROUP[fromVisual], label: pick(FAMILY_LABEL[fromVisual]), confidence: 'weak' };
  }
  return null;
}

/** Sharper-than-nothing label when no family could be deduced. */
export function weakProductLabel(ingredientNames: readonly string[]): string {
  const s = readSignals(ingredientNames);
  if (s.sugar) return pick({ en: 'Sweet product', fr: 'Produit sucré', ko: '단 제품' });
  if (s.salt || s.seasoning) return pick({ en: 'Processed snack', fr: 'Snack transformé', ko: '가공 스낵' });
  return pick({ en: 'Processed food', fr: 'Aliment transformé', ko: '가공식품' });
}

// ─────────────────────────────────────────────────────────────────────
// VÉTO DE NOM — un nom qui affirme une famille incompatible est rejeté.
// ─────────────────────────────────────────────────────────────────────

const NAME_FAMILY_PATTERNS: readonly { readonly family: ProductFamily; readonly regex: RegExp }[] = [
  { family: 'chewing-gum', regex: /(chewing gum|chewing-gum|\bgums?\b|\bgum\b|껌)/ },
  {
    family: 'candy',
    regex: /(bonbons?|candies|\bcandy\b|confiserie|confectionery|gummies|gummy|gomme a macher|jelly beans?|dragees?|marshmallow|guimauve|nounours|reglisse|licorice|lollipop|sucette|caramels?|toffee|nougat|사탕|젤리)/,
  },
  { family: 'chocolate', regex: /(chocolats?|chocolate|praline|truffe|초콜릿)/ },
  { family: 'potato-chips', regex: /(chips de pomme|potato chips|potato crisps|감자칩)/ },
  { family: 'corn-chips', regex: /(chips de mais|corn chips|tortilla chips|nachos|doritos|tostitos|옥수수칩)/ },
  { family: 'biscuit', regex: /(biscuits?|cookies?|crackers?|galettes?|sables?|wafers?|gaufrettes?|비스킷|쿠키)/ },
  { family: 'bakery', regex: /(pains?|\bbread\b|brioche|baguette|viennoiserie|croissant|muffins?|\bcakes?\b|빵)/ },
  { family: 'breakfast-cereal', regex: /(cereales|cereals?|granola|muesli|flocons|porridge|시리얼)/ },
  { family: 'processed-meat', regex: /(jambon|\bham\b|saucisses?|sausages?|bacon|salami|chorizo|charcuterie|pate|nuggets?|햄|소시지)/ },
  { family: 'dairy-dessert', regex: /(yaourts?|yogourts?|yogurts?|creme dessert|flan|glace|ice cream|fromage blanc|요구르트|아이스크림)/ },
  { family: 'sweet-drink', regex: /(sodas?|colas?|limonade|lemonade|boissons?|drinks?|jus\b|juice|nectar|energy drink|the glace|iced tea|음료|주스)/ },
  { family: 'condiment', regex: /(ketchup|mayonnaise|moutarde|mustard|sauces?|vinaigrette|dressing|소스|케첩)/ },
  { family: 'pasta', regex: /(pates?\b|\bpasta\b|spaghetti|macaroni|nouilles?|noodles?|ramen|lasagnes?|국수|파스타)/ },
  // Generic "chips" LAST so "chips de maïs" and "potato chips" win first.
  { family: 'potato-chips', regex: /(\bchips\b|\bcrisps\b|칩스)/ },
];

/** The product family a free-text name claims, or null when the name asserts nothing. */
export function familyAssertedByName(name: string): ProductFamily | null {
  const norm = normalize(name);
  if (!norm) return null;
  for (const { family, regex } of NAME_FAMILY_PATTERNS) {
    if (regex.test(norm)) return family;
  }
  return null;
}

/**
 * Pairs of groups that CANNOT describe the same product. Deliberately narrow: a real brand
 * name must never be rejected. "Nutella Biscuit" (bakery name, chocolate signature) stays,
 * because bakery↔chocolate is not a conflict — a salty crisp name on a candy list is.
 */
const CONFLICTING_GROUPS: readonly (readonly [FamilyGroup, FamilyGroup])[] = [
  ['salty-snack', 'confectionery'],
  ['salty-snack', 'chocolate'],
  ['salty-snack', 'drink'],
  ['salty-snack', 'dairy'],
  ['confectionery', 'meat'],
  ['confectionery', 'condiment'],
  ['chocolate', 'meat'],
  ['drink', 'meat'],
  ['drink', 'salty-snack'],
  ['meat', 'cereal'],
  ['pasta', 'confectionery'],
  ['pasta', 'drink'],
];

function groupsConflict(a: FamilyGroup, b: FamilyGroup): boolean {
  if (a === b) return false;
  return CONFLICTING_GROUPS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/**
 * True when `name` claims a product family that the ingredient signature rules out — e.g.
 * "Corn chips" on a list of synthetic dyes + sugar + gelatin. Only fires on a high-confidence
 * signature detection, so an unreadable label never discards a legitimately read name.
 */
export function isNameContradicted(name: string, detected: FamilyDetection | null): boolean {
  if (!detected || detected.confidence !== 'signature') return false;
  const asserted = familyAssertedByName(name);
  if (!asserted) return false;
  const conflict = groupsConflict(FAMILY_GROUP[asserted], detected.group);
  if (conflict) {
    console.log('[Family] Name "' + name + '" claims ' + asserted + ' but ingredients say ' + detected.family + ' → rejected');
  }
  return conflict;
}

/** Exposed for the selftest so expectations stay readable. */
export function familyGroupOf(family: ProductFamily): FamilyGroup {
  return FAMILY_GROUP[family];
}
