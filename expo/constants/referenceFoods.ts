// ═══════════════════════════════════════════════════════════════════════
// REFERENCE / ANCHOR FOODS — popular dishes from the app's three locales
// (🇰🇷 Korea, 🇺🇸 USA, 🇫🇷 France) plus the Italian / global classics everyone
// scans. The meal AI is a universal DETECTOR but it tends to IDEALIZE a dish
// into a clean homemade recipe, which scores popular junk far too leniently.
//
// Each anchor pins a dish to reality with TWO deterministic levers used by the
// scoring engine (see mealAnalysis.ts):
//   • floor   — a minimum /10 toxicity score the dish can NEVER drop below.
//   • markers — the definitional refined / processed / sweet components the AI
//               commonly omits, injected (deduped by category) so the visible
//               breakdown stays COHERENT with the floor.
//   • industrial — when the dish is inherently mass-produced (deep-fried,
//               instant, chain street food): also applies the documented
//               fast-food manufacturing markers.
//
// IMPORTANT: genuinely healthy dishes (salade, saumon grillé + légumes, bibimbap,
// sushi, ratatouille, soupe de légumes…) are DELIBERATELY ABSENT. The engine
// already scores them green by default (base = 1), so anchoring them would do
// nothing — and we want that green contrast to stay intact.
// ═══════════════════════════════════════════════════════════════════════

import type { MealCategory } from '@/utils/mealAnalysis';

/** Junk families an anchor can inject as a visible breakdown ingredient. */
export type FoodMarker = Extract<
  MealCategory,
  'processed' | 'added_sugar' | 'refined_oil' | 'refined_flour' | 'excess_salt' | 'additive'
>;

export type FoodOrigin = 'korea' | 'usa' | 'france' | 'italy' | 'global';

export interface ReferenceFood {
  /** Canonical English id, for documentation only. */
  readonly id: string;
  /**
   * Lowercase, accent-insensitive keywords matched as substrings against the dish
   * name (FR / EN / KO). The LONGEST matching keyword wins, so a specific dish
   * ("steak frites") beats a generic one ("frites"). NEVER use a keyword that is a
   * common substring of a healthy dish (e.g. bare "salade", "chicken", "cake").
   */
  readonly keywords: readonly string[];
  readonly origin: FoodOrigin;
  /** Minimum toxicity score (0-10). The dish can never read below this floor. */
  readonly floor: number;
  /** Definitional junk markers ensured present in the breakdown (deduped by category). */
  readonly markers?: readonly FoodMarker[];
  /** Inherently mass-produced — also applies the fast-food manufacturing markers. */
  readonly industrial?: boolean;
}

// Tier reference (mealAnalysis.scoreToTier): green ≤3 · yellow 4-5 · orange 6-8 · red 9-10.
export const REFERENCE_FOODS: readonly ReferenceFood[] = [
  // ───────────────────────── 🇰🇷 KOREA ─────────────────────────
  { id: 'tteokbokki', keywords: ['tteokbokki', 'ddeokbokki', 'teokbokki', 'topokki', '떡볶이'], origin: 'korea', floor: 6, markers: ['added_sugar', 'refined_flour', 'excess_salt'] },
  { id: 'instant_ramyeon', keywords: ['ramyeon', 'ramyun', 'instant ramen', 'instant noodle', 'instant noodles', 'cup noodle', 'cup noodles', 'nouilles instantanees', '라면'], origin: 'korea', floor: 6, industrial: true, markers: ['refined_flour', 'additive', 'excess_salt'] },
  { id: 'ramen', keywords: ['ramen', 'udon', 'soba'], origin: 'global', floor: 5, markers: ['refined_flour', 'excess_salt'] },
  { id: 'korean_fried_chicken', keywords: ['korean fried chicken', 'yangnyeom', 'dakgangjeong', 'poulet frit coreen', '양념치킨', '후라이드치킨', '닭강정', '치킨'], origin: 'korea', floor: 6, industrial: true, markers: ['refined_oil', 'refined_flour', 'added_sugar'] },
  { id: 'jajangmyeon', keywords: ['jajangmyeon', 'jjajangmyeon', 'jajangmyun', '짜장면', '자장면'], origin: 'korea', floor: 5, markers: ['refined_flour', 'added_sugar', 'refined_oil'] },
  { id: 'jjamppong', keywords: ['jjamppong', 'jjampong', 'champon', '짬뽕'], origin: 'korea', floor: 5, markers: ['refined_flour', 'excess_salt', 'refined_oil'] },
  { id: 'japchae', keywords: ['japchae', 'chapchae', '잡채'], origin: 'korea', floor: 4, markers: ['refined_oil', 'added_sugar'] },
  { id: 'kimbap', keywords: ['kimbap', 'gimbap', '김밥'], origin: 'korea', floor: 4, markers: ['processed'] },
  { id: 'korean_corn_dog', keywords: ['korean corn dog', 'korean hot dog', 'gamja hotdog', '핫도그', '콘도그'], origin: 'korea', floor: 7, industrial: true, markers: ['processed', 'refined_flour', 'added_sugar'] },
  { id: 'budae_jjigae', keywords: ['budae jjigae', 'budaejjigae', 'army stew', 'army base stew', '부대찌개'], origin: 'korea', floor: 7, markers: ['processed', 'excess_salt', 'additive'] },
  { id: 'samgyeopsal', keywords: ['samgyeopsal', 'pork belly', 'grilled pork belly', '삼겹살'], origin: 'korea', floor: 6, markers: ['excess_salt'] },
  { id: 'bulgogi', keywords: ['bulgogi', '불고기'], origin: 'korea', floor: 6, markers: ['added_sugar'] },
  { id: 'tonkatsu', keywords: ['tonkatsu', 'donkatsu', 'katsu', 'porc pane', '돈가스'], origin: 'korea', floor: 6, markers: ['refined_flour', 'refined_oil'] },
  { id: 'sundae_bloodsausage', keywords: ['순대'], origin: 'korea', floor: 5, markers: ['processed', 'excess_salt'] },
  { id: 'hotteok', keywords: ['hotteok', 'hoddeok', '호떡'], origin: 'korea', floor: 6, markers: ['added_sugar', 'refined_flour', 'refined_oil'] },
  { id: 'bingsu', keywords: ['bingsu', 'patbingsu', 'bingsoo', '빙수'], origin: 'korea', floor: 5, markers: ['added_sugar'] },
  { id: 'soju', keywords: ['soju', '소주'], origin: 'korea', floor: 6 },
  { id: 'spam', keywords: ['spam', 'luncheon meat', '스팸'], origin: 'korea', floor: 6, markers: ['processed', 'excess_salt'] },

  // ───────────────────────── 🇺🇸 USA ─────────────────────────
  { id: 'burger', keywords: ['burger', 'hamburger', 'cheeseburger', 'whopper', 'big mac', '버거', '햄버거'], origin: 'usa', floor: 5, markers: ['refined_flour'] },
  { id: 'hot_dog', keywords: ['hot dog', 'hotdog', 'hot-dog'], origin: 'usa', floor: 6, markers: ['processed', 'refined_flour'] },
  { id: 'fries', keywords: ['fries', 'french fries', 'frites', 'patatas fritas', '감자튀김'], origin: 'usa', floor: 5, markers: ['refined_oil', 'excess_salt'] },
  { id: 'fried_chicken', keywords: ['fried chicken', 'poulet frit', 'crispy chicken', 'chicken wings', 'buffalo wings', 'ailes de poulet', 'chicken tenders'], origin: 'usa', floor: 6, markers: ['refined_oil', 'refined_flour'] },
  { id: 'chicken_nuggets', keywords: ['nuggets', 'chicken nugget', 'nugget'], origin: 'usa', floor: 6, industrial: true, markers: ['processed', 'refined_flour', 'refined_oil'] },
  { id: 'mac_and_cheese', keywords: ['mac and cheese', 'macaroni and cheese', 'mac n cheese', 'macaroni au fromage'], origin: 'usa', floor: 5, markers: ['refined_flour', 'processed'] },
  { id: 'bbq_ribs', keywords: ['bbq ribs', 'barbecue ribs', 'pork ribs', 'travers de porc', 'cotes levees'], origin: 'usa', floor: 6, markers: ['added_sugar'] },
  { id: 'nachos', keywords: ['nachos', 'nacho'], origin: 'usa', floor: 5, markers: ['processed', 'refined_oil', 'excess_salt'] },
  { id: 'onion_rings', keywords: ['onion rings', 'onion ring'], origin: 'usa', floor: 5, markers: ['refined_oil', 'refined_flour'] },
  { id: 'poutine', keywords: ['poutine'], origin: 'usa', floor: 6, industrial: true, markers: ['refined_oil', 'excess_salt', 'processed'] },
  { id: 'donut', keywords: ['donut', 'doughnut', 'beignet', '도넛'], origin: 'usa', floor: 6, markers: ['added_sugar', 'refined_flour', 'refined_oil'] },
  { id: 'pancakes', keywords: ['pancake', 'pancakes', '팬케이크'], origin: 'usa', floor: 5, markers: ['refined_flour', 'added_sugar'] },
  { id: 'waffle', keywords: ['waffle', 'gaufre', '와플'], origin: 'usa', floor: 5, markers: ['refined_flour', 'added_sugar'] },
  { id: 'bagel', keywords: ['bagel', '베이글'], origin: 'usa', floor: 3, markers: ['refined_flour'] },
  { id: 'cinnamon_roll', keywords: ['cinnamon roll', 'cinnamon bun', 'roll a la cannelle'], origin: 'usa', floor: 6, markers: ['added_sugar', 'refined_flour'] },
  { id: 'brownie', keywords: ['brownie', '브라우니'], origin: 'usa', floor: 6, markers: ['added_sugar', 'refined_flour'] },
  { id: 'cookie', keywords: ['cookie', 'cookies', 'biscuit', '쿠키'], origin: 'usa', floor: 5, markers: ['added_sugar', 'refined_flour'] },
  { id: 'cheesecake', keywords: ['cheesecake', '치즈케이크'], origin: 'usa', floor: 6, markers: ['added_sugar', 'refined_flour'] },
  { id: 'pie_sweet', keywords: ['apple pie', 'pumpkin pie', 'pecan pie', 'tarte aux pommes'], origin: 'usa', floor: 6, markers: ['added_sugar', 'refined_flour'] },
  { id: 'milkshake', keywords: ['milkshake', 'milk shake', 'frappuccino', '밀크쉐이크'], origin: 'usa', floor: 6, markers: ['added_sugar'] },
  { id: 'soda', keywords: ['soda', 'cola', 'coca-cola', 'soft drink', 'soft-drink', 'limonade', 'energy drink', 'red bull', '콜라', '탄산음료'], origin: 'usa', floor: 6, markers: ['added_sugar', 'additive'] },
  { id: 'corn_dog', keywords: ['corn dog', 'corndog'], origin: 'usa', floor: 7, industrial: true, markers: ['processed', 'refined_flour', 'refined_oil'] },
  { id: 'bacon', keywords: ['bacon', '베이컨'], origin: 'usa', floor: 6, markers: ['excess_salt'] },
  { id: 'cheesesteak', keywords: ['cheesesteak', 'philly'], origin: 'usa', floor: 6, markers: ['refined_flour', 'processed'] },
  { id: 'club_sandwich', keywords: ['club sandwich', 'blt'], origin: 'usa', floor: 5, markers: ['processed', 'refined_flour'] },
  { id: 'sandwich', keywords: ['sandwich', 'sandwiches', '샌드위치'], origin: 'usa', floor: 4, markers: ['refined_flour'] },
  { id: 'sugary_cereal', keywords: ['cereal', 'cereales', 'frosted flakes', 'corn flakes', 'cornflakes', '시리얼'], origin: 'usa', floor: 5, markers: ['added_sugar', 'refined_flour'] },
  { id: 'pbj', keywords: ['pb&j', 'pbj', 'peanut butter and jelly', 'peanut butter jelly'], origin: 'usa', floor: 4, markers: ['added_sugar', 'refined_flour'] },
  { id: 'caramel_popcorn', keywords: ['caramel popcorn', 'buttered popcorn', 'popcorn caramel', 'popcorn sucre'], origin: 'usa', floor: 5, markers: ['added_sugar'] },

  // ───────────────────────── 🇫🇷 FRANCE ─────────────────────────
  { id: 'croissant', keywords: ['croissant', '크루아상'], origin: 'france', floor: 5, markers: ['refined_flour'] },
  { id: 'pain_au_chocolat', keywords: ['pain au chocolat', 'chocolatine', 'chocolate croissant'], origin: 'france', floor: 6, markers: ['added_sugar', 'refined_flour'] },
  { id: 'baguette', keywords: ['baguette', 'pain blanc', 'white bread', 'pain de mie', '식빵'], origin: 'france', floor: 3, markers: ['refined_flour'] },
  { id: 'quiche', keywords: ['quiche', 'quiche lorraine'], origin: 'france', floor: 6, markers: ['refined_flour', 'processed'] },
  { id: 'croque_monsieur', keywords: ['croque monsieur', 'croque-monsieur', 'croque madame'], origin: 'france', floor: 6, markers: ['refined_flour', 'processed'] },
  { id: 'steak_frites', keywords: ['steak frites', 'steak-frites', 'entrecote frites', 'bavette frites'], origin: 'france', floor: 6, markers: ['refined_oil', 'excess_salt'] },
  { id: 'crepe', keywords: ['crepe', 'crepes', '크레페'], origin: 'france', floor: 4, markers: ['refined_flour', 'added_sugar'] },
  { id: 'pain_perdu', keywords: ['pain perdu', 'french toast', 'french-toast'], origin: 'france', floor: 5, markers: ['added_sugar', 'refined_flour'] },
  { id: 'macaron', keywords: ['macaron', 'macaroon', '마카롱'], origin: 'france', floor: 5, markers: ['added_sugar'] },
  { id: 'eclair', keywords: ['eclair'], origin: 'france', floor: 6, markers: ['added_sugar', 'refined_flour'] },
  { id: 'mille_feuille', keywords: ['mille-feuille', 'mille feuille', 'millefeuille', 'napoleon pastry'], origin: 'france', floor: 6, markers: ['added_sugar', 'refined_flour'] },
  { id: 'tarte', keywords: ['tarte', 'tarte tatin', 'flan patissier', 'far breton'], origin: 'france', floor: 5, markers: ['added_sugar', 'refined_flour'] },
  { id: 'profiteroles', keywords: ['profiterole', 'profiteroles', 'chou a la creme', 'choux chantilly'], origin: 'france', floor: 6, markers: ['added_sugar', 'refined_flour'] },
  { id: 'cassoulet', keywords: ['cassoulet'], origin: 'france', floor: 6, markers: ['processed', 'excess_salt'] },
  { id: 'charcuterie', keywords: ['charcuterie', 'saucisson', 'rillettes', 'terrine', 'planche de charcuterie'], origin: 'france', floor: 6, markers: ['excess_salt'] },
  { id: 'foie_gras', keywords: ['foie gras'], origin: 'france', floor: 5, markers: ['excess_salt'] },
  { id: 'raclette', keywords: ['raclette', 'tartiflette', 'fondue savoyarde', 'fondue'], origin: 'france', floor: 6, markers: ['processed', 'excess_salt'] },
  { id: 'gratin', keywords: ['gratin dauphinois', 'gratin'], origin: 'france', floor: 4, markers: ['excess_salt'] },
  { id: 'hachis_parmentier', keywords: ['hachis parmentier', 'shepherds pie', 'cottage pie'], origin: 'france', floor: 5, markers: ['refined_oil'] },
  { id: 'blanquette', keywords: ['blanquette'], origin: 'france', floor: 5, markers: ['excess_salt'] },
  { id: 'cordon_bleu', keywords: ['cordon bleu'], origin: 'france', floor: 6, industrial: true, markers: ['refined_flour', 'processed'] },
  { id: 'confit_canard', keywords: ['confit de canard', 'duck confit'], origin: 'france', floor: 5, markers: ['excess_salt'] },

  // ───────────────────── 🇮🇹 ITALY / 🌍 GLOBAL ─────────────────────
  { id: 'pizza', keywords: ['pizza', '피자'], origin: 'italy', floor: 4, markers: ['refined_flour'] },
  { id: 'carbonara', keywords: ['carbonara'], origin: 'italy', floor: 6, markers: ['refined_flour', 'processed'] },
  { id: 'lasagna', keywords: ['lasagna', 'lasagne', 'bolognese', 'bolognaise'], origin: 'italy', floor: 5, markers: ['refined_flour'] },
  { id: 'pasta', keywords: ['pasta', 'pates', 'spaghetti', 'penne', 'tagliatelle', 'fettuccine', '파스타'], origin: 'italy', floor: 3, markers: ['refined_flour'] },
  { id: 'risotto', keywords: ['risotto'], origin: 'italy', floor: 4, markers: ['excess_salt'] },
  { id: 'kebab', keywords: ['kebab', 'kebap', 'doner', 'durum', 'shawarma', 'chawarma', '케밥'], origin: 'global', floor: 6, industrial: true, markers: ['refined_flour', 'processed'] },
  { id: 'tacos_burrito', keywords: ['tacos', 'taco', 'burrito', 'quesadilla', 'fajita', 'enchilada'], origin: 'global', floor: 5, markers: ['refined_flour', 'processed', 'refined_oil'] },
  { id: 'fish_and_chips', keywords: ['fish and chips', 'fish n chips', 'fish & chips'], origin: 'global', floor: 6, markers: ['refined_oil', 'refined_flour', 'excess_salt'] },
  { id: 'fried_rice', keywords: ['fried rice', 'riz frit', 'nasi goreng', '볶음밥'], origin: 'global', floor: 4, markers: ['refined_oil', 'excess_salt'] },
  { id: 'fried_spring_roll', keywords: ['nems', 'egg roll', 'rouleau imperial', 'fried spring roll'], origin: 'global', floor: 4, markers: ['refined_oil', 'refined_flour'] },
  { id: 'dumplings', keywords: ['gyoza', 'mandu', 'dumpling', 'dumplings', 'potsticker', 'jiaozi', 'raviolis chinois', '만두'], origin: 'global', floor: 4, markers: ['refined_flour', 'refined_oil'] },
  { id: 'pad_thai', keywords: ['pad thai', 'phad thai'], origin: 'global', floor: 5, markers: ['added_sugar', 'refined_oil', 'excess_salt'] },
  { id: 'ice_cream', keywords: ['ice cream', 'glace', 'gelato', 'creme glacee', 'ice cream sundae', '아이스크림'], origin: 'global', floor: 6, markers: ['added_sugar'] },
  { id: 'churros', keywords: ['churro', 'churros'], origin: 'global', floor: 6, markers: ['added_sugar', 'refined_flour', 'refined_oil'] },
  { id: 'cake', keywords: ['gateau', 'cupcake', 'muffin', 'birthday cake', 'layer cake', 'sponge cake', '케이크', '머핀'], origin: 'global', floor: 6, markers: ['added_sugar', 'refined_flour'] },
  { id: 'candy_chocolate', keywords: ['chocolate bar', 'milk chocolate', 'chocolat au lait', 'candy', 'bonbon', 'gummies', 'haribo', '사탕'], origin: 'global', floor: 6, markers: ['added_sugar'] },
  { id: 'pretzel', keywords: ['pretzel', 'bretzel'], origin: 'global', floor: 4, markers: ['refined_flour', 'excess_salt'] },
];
