// ═══════════════════════════════════════════════════════════════════════
// MODE COURSES — logique pure (aucun import RN).
//
// Une session de courses est une liste d'items. Chaque item porte un verdict
// (déterministe, réutilisé du scan) et un ToxiScore /10. Le score global de la
// liste est une simple moyenne des ToxiScores (plus haut = plus sain), arrondie
// à 1 décimale — exactement le « 7.2/10 » du compteur.
// ═══════════════════════════════════════════════════════════════════════

import { z } from 'zod';
import type { ScannedProduct, ProductCategory } from '@/types';
import { verdictLevelFromProduct } from '@/utils/productComparison';
import type { CompareVerdictLevel } from '@/utils/productComparison';
import { computeToxiScore } from '@/utils/toxiScore';
import { aiGenerateObject } from '@/utils/aiApi';
import { pick } from '@/utils/i18n';

/** Verdict d'un item (même union que le verdict produit). */
export type ShoppingVerdictLevel = CompareVerdictLevel;

export type ShoppingItemSource = 'scan' | 'manual' | 'alternative';

export interface ShoppingItem {
  id: string;
  name: string;
  verdictLevel: ShoppingVerdictLevel;
  toxiScore: number;
  isCosmetic: boolean;
  checked: boolean;
  source: ShoppingItemSource;
  /** Produit scanné complet (pour retrouver « Voir une alternative »). Absent pour les ajouts manuels / alternatives. */
  product?: ScannedProduct;
}

export type ShoppingTier = 'green' | 'yellow' | 'orange' | 'red';

/** Couleur de tranche d'un verdict : vert approuvé, jaune occasionnel, orange transformé, rouge toxique. */
export function shoppingTier(level: ShoppingVerdictLevel): ShoppingTier {
  switch (level) {
    case 'approuve': return 'green';
    case 'moderation': return 'yellow';
    case 'warning': return 'orange';
    case 'danger':
    case 'ultratoxic': return 'red';
  }
}

/** Couleur du badge d'un item, alignée sur l'écran résultat (food vs cosmétique). */
export function shoppingVerdictColor(level: ShoppingVerdictLevel, isCosmetic: boolean): string {
  if (isCosmetic) {
    switch (level) {
      case 'danger':
      case 'ultratoxic': return '#7C3AED';
      case 'warning':
      case 'moderation': return '#EAB308';
      default: return '#2E9E34';
    }
  }
  switch (level) {
    case 'danger': return '#D0260F';
    case 'ultratoxic': return '#722F37';
    case 'warning': return '#E8730A';
    case 'moderation': return '#EAB308';
    default: return '#2E9E34';
  }
}

/** Libellé du badge d'un item, aligné sur l'écran résultat. */
export function shoppingVerdictLabel(level: ShoppingVerdictLevel, isCosmetic: boolean): string {
  if (isCosmetic) {
    switch (level) {
      case 'danger':
      case 'ultratoxic': return pick({ en: 'Toxic', fr: 'Toxique', ko: '독성' });
      case 'warning':
      case 'moderation': return pick({ en: 'Disputed', fr: 'Contesté', ko: '논란 있음' });
      default: return pick({ en: 'Approved', fr: 'Approuvé', ko: '승인됨' });
    }
  }
  switch (level) {
    case 'danger': return pick({ en: 'Carcinogenic', fr: 'Cancérigène', ko: '발암성' });
    case 'ultratoxic': return pick({ en: 'Ultra toxic', fr: 'Ultra toxique', ko: '초독성' });
    case 'warning': return pick({ en: 'Processed', fr: 'Transformé', ko: '가공됨' });
    case 'moderation': return pick({ en: 'Occasional', fr: 'Occasionnel', ko: '가끔' });
    default: return pick({ en: 'Healthy', fr: 'Sain', ko: '건강함' });
  }
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Item créé à partir d'un produit scanné (badge + ToxiScore déterministes). */
export function shoppingItemFromProduct(product: ScannedProduct): ShoppingItem {
  const verdictLevel = verdictLevelFromProduct(product);
  const ingredients = product.detectedIngredients && product.detectedIngredients.length > 0
    ? product.detectedIngredients
    : product.substances ?? [];
  return {
    id: newId('scan'),
    name: product.name,
    verdictLevel,
    toxiScore: computeToxiScore(verdictLevel, ingredients),
    isCosmetic: product.productCategory === 'cosmetic',
    checked: false,
    source: 'scan',
    product,
  };
}

/** Ajout manuel d'un aliment simple (légume, fruit, œuf, viande, riz…) → vert automatique. */
export function manualShoppingItem(name: string): ShoppingItem {
  return {
    id: newId('manual'),
    name,
    verdictLevel: 'approuve',
    toxiScore: 9,
    isCosmetic: false,
    checked: false,
    source: 'manual',
  };
}

/** Alternative choisie par l'utilisateur → ajoutée comme un choix sain (vert). */
export function alternativeShoppingItem(name: string): ShoppingItem {
  return {
    id: newId('alt'),
    name,
    verdictLevel: 'approuve',
    toxiScore: 9,
    isCosmetic: false,
    checked: false,
    source: 'alternative',
  };
}

export interface ShoppingDistribution {
  green: number;
  yellow: number;
  orange: number;
  red: number;
}

export function shoppingDistribution(items: ShoppingItem[]): ShoppingDistribution {
  const dist: ShoppingDistribution = { green: 0, yellow: 0, orange: 0, red: 0 };
  for (const item of items) dist[shoppingTier(item.verdictLevel)] += 1;
  return dist;
}

/** Moyenne des ToxiScores, arrondie à 1 décimale (0 si liste vide). */
export function averageShoppingScore(items: ShoppingItem[]): number {
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, item) => acc + item.toxiScore, 0);
  return Math.round((sum / items.length) * 10) / 10;
}

/** Couleur du score moyen d'une session (≥8 vert, ≥5 jaune, ≥3 orange, sinon rouge). */
export function shoppingScoreColor(score: number): string {
  if (score >= 8) return '#2E9E34';
  if (score >= 5) return '#EAB308';
  if (score >= 3) return '#E8730A';
  return '#D0260F';
}

/** Catégorie d'affichage d'un item dans la liste du mode courses. */
export type ShoppingCategory = 'produce' | 'fresh' | 'grocery' | 'cosmetic' | 'other';

/** Ordre d'affichage des sections : produits frais d'abord, cosmétiques et autres à la fin. */
export const SHOPPING_CATEGORY_ORDER: readonly ShoppingCategory[] = [
  'produce',
  'fresh',
  'grocery',
  'cosmetic',
  'other',
];

/** Libellé localisé d'une section. */
export function shoppingCategoryLabel(category: ShoppingCategory): string {
  switch (category) {
    case 'produce':
      return pick({ en: 'Fruits & Vegetables', fr: 'Fruits & Légumes', ko: '과일 & 채소' });
    case 'fresh':
      return pick({ en: 'Fresh', fr: 'Frais', ko: '신선식품' });
    case 'grocery':
      return pick({ en: 'Grocery', fr: 'Épicerie', ko: '식료품' });
    case 'cosmetic':
      return pick({ en: 'Cosmetics', fr: 'Cosmétiques', ko: '화장품' });
    case 'other':
      return pick({ en: 'Other', fr: 'Autres', ko: '기타' });
  }
}

/** Catégories produits « non alimentaires » → section Autres. */
const NON_FOOD_PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  'kitchen_utensil',
  'clothing',
  'household',
  'electronics',
  'furniture',
  'toy',
];

// Mots-clés sans accents (le nom est normalisé avant comparaison). Latin = mot
// entier (évite « lait » dans « laitue »), coréen = sous-chaîne.
const GROCERY_FORCE_KEYWORDS: readonly string[] = [
  'jus', 'juice', 'soda', 'boisson', 'drink', 'sauce', 'soupe', 'soup',
  'confiture', 'jam', 'conserve', 'canned', 'sirop', 'syrup', 'cereale', 'cereal',
  'chocolat', 'chocolate', 'biscuit', 'cookie', 'gateau', 'cake', 'bonbon', 'candy',
  'caramel', 'miel', 'honey', 'huile', 'oil', 'vinaigre', 'vinegar', 'moutarde',
  'mustard', 'ketchup', 'mayonnaise',
  '주스', '탄산음료', '음료', '소스', '수프', '잼', '통조림', '시럽', '시리얼',
  '초콜릿', '비스킷', '과자', '케이크', '사탕', '캐러멜', '꿀', '기름', '식초',
  '겨자', '케첩', '마요네즈',
];

const PRODUCE_KEYWORDS: readonly string[] = [
  'legume', 'legumes', 'fruit', 'fruits', 'pomme', 'banane', 'orange', 'citron',
  'fraise', 'framboise', 'myrtille', 'raisin', 'poire', 'peche', 'abricot', 'melon',
  'pasteque', 'ananas', 'mangue', 'kiwi', 'tomate', 'carotte', 'salade', 'laitue',
  'epinard', 'epinards', 'brocoli', 'chou', 'courgette', 'concombre', 'poivron',
  'oignon', 'ail', 'patate', 'haricot', 'haricots', 'avocat', 'celeri', 'poireau',
  'champignon', 'aubergine', 'artichaut', 'endive', 'navet', 'radis', 'betterave',
  'vegetable', 'vegetables', 'apple', 'banana', 'lemon',
  'lime', 'strawberry', 'raspberry', 'blueberry', 'grape', 'grapes', 'pear', 'peach',
  'apricot', 'watermelon', 'pineapple', 'mango', 'tomato', 'tomatoes',
  'carrot', 'salad', 'lettuce', 'spinach', 'broccoli', 'cabbage', 'zucchini', 'cucumber',
  'pepper', 'onion', 'garlic', 'potato', 'potatoes', 'bean', 'beans', 'pea', 'peas',
  'avocado', 'celery', 'leek', 'mushroom', 'eggplant', 'artichoke', 'turnip', 'radish',
  'beet', 'corn',
  '과일', '채소', '야채', '사과', '바나나', '오렌지', '레몬', '라임', '딸기', '라즈베리',
  '블루베리', '포도', '배', '복숭아', '살구', '멜론', '수박', '파인애플', '망고', '키위',
  '토마토', '당근', '샐러드', '상추', '시금치', '브로콜리', '양배추', '호박', '오이',
  '고추', '피망', '양파', '마늘', '감자', '콩', '완두콩', '아보카도', '셀러리', '대파',
  '부추', '버섯', '가지', '아티초크', '무', '비트', '옥수수',
];

const FRESH_KEYWORDS: readonly string[] = [
  'viande', 'boeuf', 'poulet', 'porc', 'agneau', 'dinde', 'jambon', 'saucisse',
  'charcuterie', 'poisson', 'saumon', 'thon', 'crevette', 'fruit de mer', 'fruits de mer',
  'oeuf', 'oeufs', 'lait', 'yaourt', 'yogourt', 'fromage', 'beurre', 'creme',
  'creme fraiche', 'pain', 'baguette', 'boulangerie', 'burrata', 'mozzarella', 'ricotta',
  'camembert', 'brie',
  'meat', 'beef', 'chicken', 'pork', 'lamb', 'turkey', 'ham', 'sausage', 'bacon', 'fish',
  'salmon', 'tuna', 'shrimp', 'seafood', 'egg', 'eggs', 'milk', 'yogurt', 'yoghurt',
  'cheese', 'butter', 'cream', 'bread', 'baguette', 'bakery',
  '고기', '소고기', '쇠고기', '닭고기', '돼지고기', '양고기', '칠면조', '햄', '소시지',
  '베이컨', '생선', '연어', '참치', '새우', '해산물', '달걀', '계란', '우유', '요거트',
  '요구르트', '치즈', '버터', '크림', '빵', '바게트',
];

function normalizeCategoryText(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchesCategoryKeywords(name: string, keywords: readonly string[]): boolean {
  for (const keyword of keywords) {
    if (/^[a-z0-9\s]+$/.test(keyword)) {
      // Mot latin : correspondance mot entier pour éviter « lait » dans « laitue ».
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(name)) return true;
    } else if (name.includes(keyword)) {
      // Coréen (pas d'espaces entre syllabes) : sous-chaîne.
      return true;
    }
  }
  return false;
}

/** Détermine la section d'affichage d'un item (déterministe, sans IA). */
export function shoppingCategory(item: ShoppingItem): ShoppingCategory {
  if (item.isCosmetic) return 'cosmetic';

  const productCategory = item.product?.productCategory;
  if (productCategory && NON_FOOD_PRODUCT_CATEGORIES.includes(productCategory)) return 'other';

  // Nom + catégorie OpenFoodFacts + objet identifié (pour les scans).
  const haystack = normalizeCategoryText(
    [item.name, item.product?.categories, item.product?.objectIdentified].filter(Boolean).join(' '),
  );

  if (matchesCategoryKeywords(haystack, GROCERY_FORCE_KEYWORDS)) return 'grocery';
  if (matchesCategoryKeywords(haystack, FRESH_KEYWORDS)) return 'fresh';
  if (matchesCategoryKeywords(haystack, PRODUCE_KEYWORDS)) return 'produce';
  return 'grocery';
}

/** Items orange/rouge, triés du plus grave au moins grave (pour le bilan). */
export function problematicShoppingItems(items: ShoppingItem[]): ShoppingItem[] {
  const rank: Record<ShoppingTier, number> = { red: 0, orange: 1, yellow: 2, green: 3 };
  return items
    .filter((item) => {
      const tier = shoppingTier(item.verdictLevel);
      return tier === 'orange' || tier === 'red';
    })
    .slice()
    .sort((a, b) => rank[shoppingTier(a.verdictLevel)] - rank[shoppingTier(b.verdictLevel)]);
}

function badgeForPrompt(level: ShoppingVerdictLevel): string {
  switch (level) {
    case 'danger': return 'CARCINOGENIC';
    case 'ultratoxic': return 'ULTRA TOXIC';
    case 'warning': return 'PROCESSED';
    case 'moderation': return 'OCCASIONAL';
    default: return 'APPROVED';
  }
}

/** Repli déterministe du commentaire de bilan — ton positif, jamais de jargon. */
export function deterministicShoppingComment(dist: ShoppingDistribution, score: number, total: number): string {
  if (total === 0) {
    return pick({
      en: 'Your list is empty — add a few products to see a score.',
      fr: 'Ta liste est vide — ajoute quelques produits pour voir ton score.',
      ko: '목록이 비어 있어요 — 제품을 추가하면 점수가 표시됩니다.',
    });
  }
  if (dist.red + dist.orange === 0) {
    return pick({
      en: '100% clean basket — great choices, you can take everything without hesitation.',
      fr: 'Panier 100 % clean — excellents choix, tu peux tout prendre sans hésiter.',
      ko: '100% 클린 장바구니예요 — 훌륭한 선택, 망설이지 않고 담으세요.',
    });
  }
  if (score >= 7) {
    return pick({
      en: 'A strong list led by good choices — a couple of small swaps will make it perfect.',
      fr: 'Belle liste portée par de bons choix — un ou deux petits remplacements et ce sera parfait.',
      ko: '좋은 선택이 주를 이루는 훌륭한 목록이에요 — 한두 가지만 바꾸면 완벽해요.',
    });
  }
  if (score >= 5) {
    return pick({
      en: 'Good start! Replace the orange and red items first and your score will climb fast.',
      fr: 'Bon départ ! Remplace d’abord les produits orange/rouge et ton score grimpera vite.',
      ko: '좋은 시작이에요! 주황색·빨간색 제품부터 바꾸면 점수가 빠르게 올라요.',
    });
  }
  return pick({
    en: 'The average is low, but that is exactly why we compare — swap the red items first and it will climb quickly.',
    fr: 'La moyenne est basse, mais c’est justement pour ça qu’on compare — remplace les rouges en priorité et ça remontera vite.',
    ko: '평균이 낮지만, 비교하는 이유가 바로 이거예요 — 빨간색부터 바꾸면 금방 올라가요.',
  });
}

const ShoppingSummarySchema = z.object({
  score_global: z.number(),
  commentaire: z.string(),
});

/**
 * Bilan de liste Dr. Toxi : le score global est DÉTERMINISTE (moyenne), seule la
 * phrase est générée par l'IA (ton positif, ce qui va bien d'abord). Repli
 * déterministe si l'IA échoue.
 */
export async function generateShoppingSummary(items: ShoppingItem[]): Promise<{ score: number; commentaire: string }> {
  const score = averageShoppingScore(items);
  const dist = shoppingDistribution(items);
  const fallback = deterministicShoppingComment(dist, score, items.length);

  try {
    const language = pick({ en: 'English', fr: 'French', ko: 'Korean' });
    const problematic = problematicShoppingItems(items)
      .map((item) => `${item.name} (${badgeForPrompt(item.verdictLevel)}, ${item.toxiScore}/10)`)
      .join(', ');

    const result = await aiGenerateObject({
      system:
        'You are Dr. Toxi, the mascot ingredient-analysis expert of the ToxiScan app. ' +
        'Summarize a full shopping list. Rules: ' +
        'answer in 2 to 3 sentences maximum, positive and encouraging tone even if the score is low; ' +
        'mention what is good in the list FIRST, before the areas to improve; ' +
        'do NOT list all the problematic products in the text (they are already shown separately) — stay general; ' +
        'no scientific jargon, short sentences. ' +
        'Write the comment in ' + language + '.',
      messages: [
        {
          role: 'user',
          content:
            `Liste : ${items.length} produits, répartition ${dist.green} verts, ${dist.yellow} jaunes, ${dist.orange} oranges, ${dist.red} rouges\n` +
            `Score global : ${score}/10\n` +
            `Produits problématiques : ${problematic || 'aucun'}`,
        },
      ],
      schema: ShoppingSummarySchema,
      maxTokens: 220,
    });

    const commentaire = (result.commentaire ?? '').trim();
    return commentaire ? { score, commentaire } : { score, commentaire: fallback };
  } catch (err) {
    console.warn('[shopping] AI summary failed — deterministic comment kept:', err instanceof Error ? err.message : String(err));
    return { score, commentaire: fallback };
  }
}
