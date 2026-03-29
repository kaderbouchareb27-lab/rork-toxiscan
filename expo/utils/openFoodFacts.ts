export interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  brands: string;
  ingredients_text: string;
  additives_tags: string[];
  nutriments: Record<string, number | string>;
  nova_group: number | null;
  nutriscore_grade: string | null;
  image_url: string | null;
  image_ingredients_url: string | null;
  categories: string;
  labels: string;
  allergens: string;
  traces: string;
  quantity: string;
  packaging: string;
}

export interface OpenFactsResult {
  found: boolean;
  source: 'openfoodfacts' | 'openbeautyfacts' | 'openproductsfacts' | null;
  product: OpenFoodFactsProduct | null;
  ingredientsList: string[];
  additivesList: string[];
}

const API_BASES = [
  { url: 'https://world.openfoodfacts.org/api/v2/product', source: 'openfoodfacts' as const },
  { url: 'https://world.openbeautyfacts.org/api/v2/product', source: 'openbeautyfacts' as const },
  { url: 'https://world.openproductsfacts.org/api/v2/product', source: 'openproductsfacts' as const },
];

const FIELDS = [
  'code',
  'product_name',
  'brands',
  'ingredients_text',
  'additives_tags',
  'nutriments',
  'nova_group',
  'nutriscore_grade',
  'image_url',
  'image_ingredients_url',
  'categories',
  'labels',
  'allergens',
  'traces',
  'quantity',
  'packaging',
].join(',');

function parseIngredients(ingredientsText: string): string[] {
  if (!ingredientsText) return [];
  return ingredientsText
    .replace(/\([^)]*\)/g, '')
    .split(/[,;]/)
    .map(i => i.replace(/[\d.]+\s*%/g, '').trim())
    .filter(i => i.length > 1);
}

function normalizeAdditives(tags: string[]): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  return tags.map(t => t.toLowerCase().trim());
}

async function fetchFromSource(
  barcode: string,
  baseUrl: string,
  source: 'openfoodfacts' | 'openbeautyfacts' | 'openproductsfacts',
  timeoutMs: number = 5000,
): Promise<OpenFactsResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${baseUrl}/${barcode}?fields=${FIELDS}`;
    console.log(`[OpenFacts] Fetching from ${source}: ${url}`);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ToxiScan/1.0 (contact@toxiscan.com)' },
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.log(`[OpenFacts] ${source} returned status ${response.status}`);
      return { found: false, source: null, product: null, ingredientsList: [], additivesList: [] };
    }

    const data = await response.json();

    if (!data || data.status === 0 || !data.product) {
      console.log(`[OpenFacts] Product not found in ${source}`);
      return { found: false, source: null, product: null, ingredientsList: [], additivesList: [] };
    }

    const p = data.product;
    const product: OpenFoodFactsProduct = {
      code: p.code ?? barcode,
      product_name: p.product_name ?? '',
      brands: p.brands ?? '',
      ingredients_text: p.ingredients_text ?? '',
      additives_tags: p.additives_tags ?? [],
      nutriments: p.nutriments ?? {},
      nova_group: p.nova_group ?? null,
      nutriscore_grade: p.nutriscore_grade ?? null,
      image_url: p.image_url ?? null,
      image_ingredients_url: p.image_ingredients_url ?? null,
      categories: p.categories ?? '',
      labels: p.labels ?? '',
      allergens: p.allergens ?? '',
      traces: p.traces ?? '',
      quantity: p.quantity ?? '',
      packaging: p.packaging ?? '',
    };

    const ingredientsList = parseIngredients(product.ingredients_text);
    const additivesList = normalizeAdditives(product.additives_tags);

    console.log(`[OpenFacts] Found in ${source}: "${product.product_name}" by ${product.brands}`);
    console.log(`[OpenFacts] Ingredients: ${ingredientsList.length}, Additives: ${additivesList.length}`);

    return { found: true, source, product, ingredientsList, additivesList };
  } catch (error: unknown) {
    clearTimeout(timer);
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`[OpenFacts] Error fetching from ${source}: ${msg}`);
    return { found: false, source: null, product: null, ingredientsList: [], additivesList: [] };
  }
}

export async function lookupBarcode(barcode: string): Promise<OpenFactsResult> {
  console.log(`[OpenFacts] Looking up barcode: ${barcode}`);

  for (const { url, source } of API_BASES) {
    const result = await fetchFromSource(barcode, url, source);
    if (result.found) {
      return result;
    }
  }

  console.log('[OpenFacts] Product not found in any database');
  return { found: false, source: null, product: null, ingredientsList: [], additivesList: [] };
}

export function formatOpenFactsContext(result: OpenFactsResult): string {
  if (!result.found || !result.product) return '';

  const p = result.product;
  const lines: string[] = [];

  lines.push('=== DONNÉES OPEN FOOD FACTS (source complémentaire vérifiée) ===');
  if (p.product_name) lines.push(`Nom du produit : ${p.product_name}`);
  if (p.brands) lines.push(`Marque : ${p.brands}`);
  if (p.quantity) lines.push(`Quantité : ${p.quantity}`);
  if (p.categories) lines.push(`Catégories : ${p.categories}`);

  if (p.ingredients_text) {
    lines.push(`Liste complète des ingrédients : ${p.ingredients_text}`);
  }

  if (p.additives_tags && p.additives_tags.length > 0) {
    lines.push(`Additifs identifiés par Open Food Facts : ${p.additives_tags.map(t => t.replace('en:', '').toUpperCase()).join(', ')}`);
  }

  if (p.nutriscore_grade) {
    lines.push(`Nutri-Score : ${p.nutriscore_grade.toUpperCase()}`);
  }
  if (p.nova_group) {
    lines.push(`Groupe NOVA (transformation) : ${p.nova_group} (1=pas transformé, 4=ultra-transformé)`);
  }

  if (p.labels) lines.push(`Labels : ${p.labels}`);
  if (p.allergens) lines.push(`Allergènes : ${p.allergens}`);
  if (p.traces) lines.push(`Traces : ${p.traces}`);
  if (p.packaging) lines.push(`Emballage : ${p.packaging}`);

  lines.push('=== FIN DES DONNÉES OPEN FOOD FACTS ===');
  lines.push('IMPORTANT : Utilise ces données comme source complémentaire. Ta PRIORITÉ reste de chercher les ingrédients cancérigènes et toxiques de notre base ToxiScan. Open Food Facts enrichit les données mais ton analyse toxicologique est le coeur de ToxiScan.');

  return lines.join('\n');
}
