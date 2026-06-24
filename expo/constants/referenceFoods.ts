// ═══════════════════════════════════════════════════════════════════════
// REFERENCE / ANCHOR FOODS — popular dishes from the app's core locales
// (🇰🇷 Korea, 🇺🇸 USA, 🇫🇷 France) plus the Italian, 🇯🇵 Japanese, 🇲🇽 Mexican,
// 🇮🇳 Indian and 🌏 Southeast-Asian classics everyone scans.
// The meal AI is a universal DETECTOR but it tends to IDEALIZE a dish
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

export type FoodOrigin =
  | 'korea'
  | 'usa'
  | 'france'
  | 'italy'
  | 'japan'
  | 'mexico'
  | 'india'
  | 'southeast_asia'
  | 'global';

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
  { id: 'galbi', keywords: ['galbi', 'kalbi', 'galbijjim', 'la galbi', 'short ribs', '갈비', '갈비찜'], origin: 'korea', floor: 6, markers: ['added_sugar', 'excess_salt'] },
  { id: 'dakgalbi', keywords: ['dakgalbi', 'dak galbi', '닭갈비'], origin: 'korea', floor: 5, markers: ['added_sugar', 'refined_oil'] },
  { id: 'jeyuk_bokkeum', keywords: ['jeyuk bokkeum', 'jeyukbokkeum', 'spicy stir-fried pork', '제육볶음'], origin: 'korea', floor: 5, markers: ['added_sugar', 'refined_oil'] },
  { id: 'tangsuyuk', keywords: ['tangsuyuk', 'sweet and sour pork', '탕수육'], origin: 'korea', floor: 6, industrial: true, markers: ['refined_flour', 'added_sugar', 'refined_oil'] },
  { id: 'gamjatang', keywords: ['gamjatang', 'gamja tang', 'pork bone soup', '감자탕'], origin: 'korea', floor: 5, markers: ['excess_salt'] },
  { id: 'korean_pancake', keywords: ['pajeon', 'haemul pajeon', 'kimchijeon', 'buchimgae', 'bindaetteok', 'korean pancake', '파전', '부침개'], origin: 'korea', floor: 5, markers: ['refined_flour', 'refined_oil'] },
  { id: 'gopchang', keywords: ['gopchang', 'makchang', '곱창', '막창'], origin: 'korea', floor: 5, markers: ['excess_salt'] },
  { id: 'malatang', keywords: ['malatang', 'mala xiang guo', '마라탕'], origin: 'korea', floor: 5, markers: ['refined_oil', 'excess_salt'] },
  { id: 'bungeoppang', keywords: ['bungeoppang', 'gukhwappang', 'fish-shaped bread', '붕어빵', '국화빵'], origin: 'korea', floor: 5, markers: ['added_sugar', 'refined_flour'] },
  { id: 'yakgwa', keywords: ['yakgwa', '약과'], origin: 'korea', floor: 6, markers: ['added_sugar', 'refined_flour', 'refined_oil'] },
  { id: 'dalgona', keywords: ['dalgona', 'ppopgi', '달고나'], origin: 'korea', floor: 6, markers: ['added_sugar'] },

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
  { id: 'meatloaf', keywords: ['meatloaf', 'meat loaf', 'pain de viande'], origin: 'usa', floor: 5, markers: ['processed', 'excess_salt'] },
  { id: 'chili_con_carne', keywords: ['chili con carne', 'chilli con carne'], origin: 'usa', floor: 4, markers: ['excess_salt'] },
  { id: 'grilled_cheese', keywords: ['grilled cheese', 'grilled-cheese'], origin: 'usa', floor: 5, markers: ['refined_flour', 'processed'] },
  { id: 'pulled_pork', keywords: ['pulled pork', 'porc effiloche'], origin: 'usa', floor: 5, markers: ['added_sugar'] },
  { id: 'cornbread', keywords: ['cornbread', 'corn bread'], origin: 'usa', floor: 4, markers: ['refined_flour', 'added_sugar'] },
  { id: 'biscuits_gravy', keywords: ['biscuits and gravy', 'biscuit and gravy', 'sausage gravy'], origin: 'usa', floor: 6, markers: ['refined_flour', 'refined_oil', 'excess_salt'] },
  { id: 'sloppy_joe', keywords: ['sloppy joe'], origin: 'usa', floor: 5, markers: ['added_sugar', 'refined_flour'] },
  { id: 'chicken_sandwich', keywords: ['chicken sandwich', 'fried chicken sandwich', 'crispy chicken sandwich', 'chicken burger'], origin: 'usa', floor: 5, markers: ['refined_flour'] },
  { id: 'jerky', keywords: ['beef jerky', 'jerky'], origin: 'usa', floor: 6, markers: ['processed', 'excess_salt'] },
  { id: 'pop_tart', keywords: ['pop tart', 'pop-tart', 'poptart', 'toaster pastry'], origin: 'usa', floor: 6, industrial: true, markers: ['added_sugar', 'refined_flour'] },
  { id: 'snack_cake', keywords: ['twinkie', 'snack cake', 'swiss roll'], origin: 'usa', floor: 6, industrial: true, markers: ['added_sugar', 'refined_flour'] },
  { id: 'granola_bar', keywords: ['granola bar', 'cereal bar', 'barre de cereales'], origin: 'usa', floor: 5, markers: ['added_sugar'] },
  { id: 'deli_meat', keywords: ['deli meat', 'ham sandwich', 'jambon', 'sliced ham', 'turkey slices', 'cold cut', 'cold cuts'], origin: 'usa', floor: 6, markers: ['processed', 'excess_salt'] },
  { id: 'sausage', keywords: ['sausage', 'saucisse', 'merguez', 'chipolata', 'bratwurst'], origin: 'usa', floor: 6, markers: ['processed', 'excess_salt'] },
  { id: 'pepperoni', keywords: ['pepperoni', 'salami', 'chorizo', 'cured meat'], origin: 'usa', floor: 6, markers: ['processed', 'excess_salt'] },

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
  { id: 'brioche', keywords: ['brioche', 'pain au lait', 'pain brioche'], origin: 'france', floor: 5, markers: ['added_sugar', 'refined_flour'] },
  { id: 'chausson_pommes', keywords: ['chausson aux pommes', 'apple turnover'], origin: 'france', floor: 5, markers: ['added_sugar', 'refined_flour', 'refined_oil'] },
  { id: 'madeleine', keywords: ['madeleine', 'financier', 'canele'], origin: 'france', floor: 5, markers: ['added_sugar', 'refined_flour'] },
  { id: 'creme_brulee', keywords: ['creme brulee', 'creme caramel', 'creme catalane'], origin: 'france', floor: 5, markers: ['added_sugar'] },
  { id: 'mousse_chocolat', keywords: ['mousse au chocolat', 'chocolate mousse'], origin: 'france', floor: 5, markers: ['added_sugar'] },
  { id: 'kouign_amann', keywords: ['kouign amann', 'kouign-amann'], origin: 'france', floor: 6, markers: ['added_sugar', 'refined_flour', 'refined_oil'] },
  { id: 'palmier', keywords: ['palmier', 'chouquette', 'pain aux raisins'], origin: 'france', floor: 5, markers: ['added_sugar', 'refined_flour'] },
  { id: 'choucroute', keywords: ['choucroute', 'sauerkraut'], origin: 'france', floor: 6, markers: ['processed', 'excess_salt'] },
  { id: 'boeuf_bourguignon', keywords: ['boeuf bourguignon', 'beef bourguignon', 'coq au vin'], origin: 'france', floor: 4, markers: ['excess_salt'] },
  { id: 'andouillette', keywords: ['andouillette', 'boudin noir', 'boudin'], origin: 'france', floor: 6, markers: ['processed', 'excess_salt'] },
  { id: 'confiserie', keywords: ['nougat', 'calisson', 'pate de fruits', 'marshmallow', 'guimauve'], origin: 'france', floor: 5, markers: ['added_sugar'] },

  // ───────────────────── 🇮🇹 ITALY / 🌍 GLOBAL ─────────────────────
  { id: 'pizza', keywords: ['pizza', '피자'], origin: 'italy', floor: 4, markers: ['refined_flour'] },
  { id: 'carbonara', keywords: ['carbonara'], origin: 'italy', floor: 6, markers: ['refined_flour', 'processed'] },
  { id: 'lasagna', keywords: ['lasagna', 'lasagne', 'bolognese', 'bolognaise'], origin: 'italy', floor: 5, markers: ['refined_flour'] },
  { id: 'pasta', keywords: ['pasta', 'pates', 'spaghetti', 'penne', 'tagliatelle', 'fettuccine', '파스타'], origin: 'italy', floor: 3, markers: ['refined_flour'] },
  { id: 'risotto', keywords: ['risotto'], origin: 'italy', floor: 4, markers: ['excess_salt'] },
  { id: 'kebab', keywords: ['kebab', 'kebap', 'doner', 'durum', 'shawarma', 'chawarma', 'gyro', 'gyros', '케밥'], origin: 'global', floor: 6, industrial: true, markers: ['refined_flour', 'processed'] },
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
  { id: 'gnocchi', keywords: ['gnocchi'], origin: 'italy', floor: 3, markers: ['refined_flour'] },
  { id: 'ravioli', keywords: ['ravioli', 'tortellini', 'tortelloni', 'agnolotti'], origin: 'italy', floor: 4, markers: ['refined_flour'] },
  { id: 'focaccia', keywords: ['focaccia', 'panini', 'panino', 'ciabatta'], origin: 'italy', floor: 4, markers: ['refined_flour', 'refined_oil'] },
  { id: 'calzone', keywords: ['calzone', 'stromboli'], origin: 'italy', floor: 5, markers: ['refined_flour'] },
  { id: 'arancini', keywords: ['arancini', 'arancino', 'suppli'], origin: 'italy', floor: 5, markers: ['refined_oil', 'refined_flour'] },
  { id: 'tiramisu', keywords: ['tiramisu'], origin: 'italy', floor: 6, markers: ['added_sugar', 'refined_flour'] },
  { id: 'cannoli', keywords: ['cannoli', 'cannolo'], origin: 'italy', floor: 6, markers: ['added_sugar', 'refined_flour', 'refined_oil'] },
  { id: 'bubble_tea', keywords: ['bubble tea', 'boba', 'milk tea', 'tapioca tea', '버블티'], origin: 'global', floor: 6, markers: ['added_sugar'] },
  { id: 'chow_mein', keywords: ['chow mein', 'lo mein', 'chao mian', 'yakisoba'], origin: 'global', floor: 5, markers: ['refined_flour', 'refined_oil', 'excess_salt'] },
  { id: 'sweet_and_sour', keywords: ['sweet and sour', 'general tso', 'orange chicken', 'sesame chicken'], origin: 'global', floor: 6, industrial: true, markers: ['added_sugar', 'refined_flour', 'refined_oil'] },
  { id: 'bao_bun', keywords: ['bao bun', 'baozi', 'char siu bao', 'steamed bun', 'mantou'], origin: 'global', floor: 4, markers: ['refined_flour'] },
  { id: 'samosa', keywords: ['samosa', 'samoussa'], origin: 'global', floor: 5, markers: ['refined_oil', 'refined_flour'] },
  { id: 'naan', keywords: ['naan', 'cheese naan', 'garlic naan'], origin: 'global', floor: 4, markers: ['refined_flour'] },
  { id: 'butter_chicken', keywords: ['butter chicken', 'tikka masala', 'chicken tikka masala', 'korma', 'massaman'], origin: 'global', floor: 5, markers: ['refined_oil'] },
  { id: 'biryani', keywords: ['biryani', 'biriyani'], origin: 'global', floor: 4, markers: ['refined_oil'] },
  { id: 'empanada', keywords: ['empanada', 'empanadas'], origin: 'global', floor: 5, markers: ['refined_flour', 'refined_oil'] },
  { id: 'egg_tart', keywords: ['egg tart', 'dan tat', 'pastel de nata', 'portuguese tart', '에그타르트'], origin: 'global', floor: 5, markers: ['added_sugar', 'refined_flour'] },
  { id: 'mochi', keywords: ['mochi', 'daifuku', 'dorayaki', 'taiyaki'], origin: 'global', floor: 5, markers: ['added_sugar', 'refined_flour'] },
  { id: 'sausage_roll', keywords: ['sausage roll', 'meat pie', 'pork pie'], origin: 'global', floor: 6, markers: ['processed', 'refined_flour', 'excess_salt'] },
  { id: 'potato_chips', keywords: ['potato chips', 'crisps', 'pringles', 'doritos'], origin: 'global', floor: 5, markers: ['refined_oil', 'excess_salt'] },

  // ───────────────────────── 🇯🇵 JAPAN ─────────────────────────
  // (sushi, sashimi, edamame, miso soup, onigiri… deliberately absent — stay green)
  { id: 'japanese_curry', keywords: ['japanese curry', 'katsu curry', 'kare raisu', 'curry rice', 'カレー'], origin: 'japan', floor: 5, markers: ['refined_flour', 'refined_oil'] },
  { id: 'katsudon', keywords: ['katsudon', 'カツ丼'], origin: 'japan', floor: 6, markers: ['refined_flour', 'refined_oil', 'added_sugar'] },
  { id: 'gyudon', keywords: ['gyudon', 'oyakodon', 'butadon', '牛丼'], origin: 'japan', floor: 4, markers: ['added_sugar', 'excess_salt'] },
  { id: 'karaage', keywords: ['karaage', 'kara-age', 'chicken karaage', '가라아게'], origin: 'japan', floor: 6, markers: ['refined_oil', 'refined_flour'] },
  { id: 'tempura', keywords: ['tempura', '天ぷら', '텐푸라'], origin: 'japan', floor: 5, markers: ['refined_oil', 'refined_flour'] },
  { id: 'takoyaki', keywords: ['takoyaki', '타코야키'], origin: 'japan', floor: 5, markers: ['refined_flour', 'refined_oil'] },
  { id: 'okonomiyaki', keywords: ['okonomiyaki', '오코노미야키'], origin: 'japan', floor: 5, markers: ['refined_flour', 'refined_oil', 'added_sugar'] },
  { id: 'yakitori', keywords: ['yakitori', 'yakiton', '야키토리'], origin: 'japan', floor: 4, markers: ['added_sugar', 'excess_salt'] },

  // ───────────────────────── 🇲🇽 MEXICO ─────────────────────────
  // (tacos/burrito/quesadilla/nachos/churros already covered above; guacamole,
  //  ceviche, pico de gallo deliberately absent — stay green)
  { id: 'tamale', keywords: ['tamale', 'tamales', 'tamal'], origin: 'mexico', floor: 5, markers: ['refined_oil'] },
  { id: 'chilaquiles', keywords: ['chilaquiles'], origin: 'mexico', floor: 5, markers: ['refined_oil', 'refined_flour'] },
  { id: 'mexican_fried', keywords: ['chimichanga', 'flauta', 'flautas', 'taquito', 'taquitos', 'rolled taco'], origin: 'mexico', floor: 6, industrial: true, markers: ['refined_oil', 'refined_flour'] },
  { id: 'carnitas', keywords: ['carnitas', 'al pastor', 'barbacoa'], origin: 'mexico', floor: 5, markers: ['refined_oil', 'excess_salt'] },
  { id: 'elote', keywords: ['elote', 'esquites', 'mexican street corn'], origin: 'mexico', floor: 4, markers: ['refined_oil', 'excess_salt'] },
  { id: 'horchata', keywords: ['horchata'], origin: 'mexico', floor: 5, markers: ['added_sugar'] },
  { id: 'tres_leches', keywords: ['tres leches', 'pastel de tres leches'], origin: 'mexico', floor: 6, markers: ['added_sugar', 'refined_flour'] },
  { id: 'tortilla_chips', keywords: ['tortilla chips', 'totopos', 'corn chips'], origin: 'mexico', floor: 5, markers: ['refined_oil', 'excess_salt'] },
  { id: 'refried_beans', keywords: ['refried beans', 'frijoles refritos'], origin: 'mexico', floor: 4, markers: ['refined_oil'] },

  // ───────────────────────── 🇮🇳 INDIA ─────────────────────────
  // (butter chicken / biryani / samosa / naan already covered above; dal, plain
  //  roti/chapati, idli, tandoori veg, raita deliberately absent — stay green)
  { id: 'pakora', keywords: ['pakora', 'onion bhaji', 'aloo tikki'], origin: 'india', floor: 5, markers: ['refined_oil', 'refined_flour'] },
  { id: 'gulab_jamun', keywords: ['gulab jamun'], origin: 'india', floor: 7, markers: ['added_sugar', 'refined_flour', 'refined_oil'] },
  { id: 'jalebi', keywords: ['jalebi', 'imarti'], origin: 'india', floor: 7, markers: ['added_sugar', 'refined_oil', 'refined_flour'] },
  { id: 'paratha', keywords: ['paratha', 'poori', 'bhatura', 'bhature'], origin: 'india', floor: 5, markers: ['refined_flour', 'refined_oil'] },
  { id: 'indian_chaat', keywords: ['chaat', 'pani puri', 'bhel puri', 'sev puri', 'vada pav', 'pav bhaji'], origin: 'india', floor: 5, markers: ['refined_oil', 'refined_flour'] },
  { id: 'mango_lassi', keywords: ['mango lassi', 'sweet lassi'], origin: 'india', floor: 4, markers: ['added_sugar'] },
  { id: 'paneer_curry', keywords: ['malai kofta', 'paneer butter masala', 'paneer makhani', 'shahi paneer', 'butter paneer'], origin: 'india', floor: 5, markers: ['refined_oil'] },

  // ───────────────────── 🇹🇭 🇻🇳 SOUTHEAST ASIA ─────────────────────
  // (pad thai / fried rice / fried spring rolls / dumplings / bao already covered;
  //  pho, fresh summer rolls, som tam, tom yum deliberately absent — stay green)
  { id: 'thai_curry', keywords: ['thai curry', 'green curry', 'red curry', 'panang'], origin: 'southeast_asia', floor: 4, markers: ['added_sugar', 'excess_salt'] },
  { id: 'mango_sticky_rice', keywords: ['mango sticky rice', 'khao niao mamuang'], origin: 'southeast_asia', floor: 5, markers: ['added_sugar'] },
  { id: 'banh_mi', keywords: ['banh mi'], origin: 'southeast_asia', floor: 5, markers: ['refined_flour', 'processed'] },
  { id: 'bun_cha', keywords: ['bun cha'], origin: 'southeast_asia', floor: 4, markers: ['added_sugar', 'excess_salt'] },
  { id: 'laksa', keywords: ['laksa'], origin: 'southeast_asia', floor: 5, markers: ['refined_oil', 'excess_salt'] },
  { id: 'char_kway_teow', keywords: ['char kway teow', 'char kuey teow', 'kway teow'], origin: 'southeast_asia', floor: 5, markers: ['refined_oil', 'excess_salt'] },
  { id: 'satay', keywords: ['satay', 'sate ayam'], origin: 'southeast_asia', floor: 4, markers: ['added_sugar'] },
  { id: 'roti_canai', keywords: ['roti canai', 'roti prata', 'roti telur'], origin: 'southeast_asia', floor: 5, markers: ['refined_flour', 'refined_oil'] },
  { id: 'nasi_lemak', keywords: ['nasi lemak'], origin: 'southeast_asia', floor: 5, markers: ['refined_oil', 'excess_salt'] },
];
