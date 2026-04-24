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
      headers: { 'User-Agent': 'Dr.Toxi/1.0 (contact@toxiscan.com)' },
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

const SEARCH_BASES = [
  { url: 'https://world.openfoodfacts.org/cgi/search.pl', source: 'openfoodfacts' as const },
  { url: 'https://world.openbeautyfacts.org/cgi/search.pl', source: 'openbeautyfacts' as const },
  { url: 'https://world.openproductsfacts.org/cgi/search.pl', source: 'openproductsfacts' as const },
];

async function searchFromSource(
  query: string,
  baseUrl: string,
  source: 'openfoodfacts' | 'openbeautyfacts' | 'openproductsfacts',
  timeoutMs: number = 5000,
): Promise<OpenFactsResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${baseUrl}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5&fields=${FIELDS}`;
    console.log(`[OpenFacts] Search from ${source}: "${query}"`);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Dr.Toxi/1.0 (contact@toxiscan.com)' },
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.log(`[OpenFacts] Search ${source} returned ${response.status}`);
      return { found: false, source: null, product: null, ingredientsList: [], additivesList: [] };
    }

    const data = await response.json();
    const products: unknown[] = Array.isArray(data?.products) ? data.products : [];
    if (products.length === 0) {
      console.log(`[OpenFacts] No search results in ${source}`);
      return { found: false, source: null, product: null, ingredientsList: [], additivesList: [] };
    }

    const p = (products.find((prod): prod is Record<string, unknown> => {
      if (!prod || typeof prod !== 'object') return false;
      const pr = prod as Record<string, unknown>;
      return typeof pr.ingredients_text === 'string' && (pr.ingredients_text as string).length > 0;
    }) ?? products[0]) as Record<string, unknown>;

    const product: OpenFoodFactsProduct = {
      code: typeof p.code === 'string' ? p.code : '',
      product_name: typeof p.product_name === 'string' ? p.product_name : '',
      brands: typeof p.brands === 'string' ? p.brands : '',
      ingredients_text: typeof p.ingredients_text === 'string' ? p.ingredients_text : '',
      additives_tags: Array.isArray(p.additives_tags) ? (p.additives_tags as string[]) : [],
      nutriments: (p.nutriments as Record<string, number | string>) ?? {},
      nova_group: typeof p.nova_group === 'number' ? p.nova_group : null,
      nutriscore_grade: typeof p.nutriscore_grade === 'string' ? p.nutriscore_grade : null,
      image_url: typeof p.image_url === 'string' ? p.image_url : null,
      image_ingredients_url: typeof p.image_ingredients_url === 'string' ? p.image_ingredients_url : null,
      categories: typeof p.categories === 'string' ? p.categories : '',
      labels: typeof p.labels === 'string' ? p.labels : '',
      allergens: typeof p.allergens === 'string' ? p.allergens : '',
      traces: typeof p.traces === 'string' ? p.traces : '',
      quantity: typeof p.quantity === 'string' ? p.quantity : '',
      packaging: typeof p.packaging === 'string' ? p.packaging : '',
    };

    if (!product.product_name && !product.ingredients_text) {
      return { found: false, source: null, product: null, ingredientsList: [], additivesList: [] };
    }

    const ingredientsList = parseIngredients(product.ingredients_text);
    const additivesList = normalizeAdditives(product.additives_tags);

    console.log(`[OpenFacts] Search match in ${source}: "${product.product_name}" by ${product.brands}`);
    return { found: true, source, product, ingredientsList, additivesList };
  } catch (error: unknown) {
    clearTimeout(timer);
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`[OpenFacts] Search error ${source}: ${msg}`);
    return { found: false, source: null, product: null, ingredientsList: [], additivesList: [] };
  }
}

export async function searchByName(query: string): Promise<OpenFactsResult> {
  const q = query.trim();
  if (q.length < 3) {
    return { found: false, source: null, product: null, ingredientsList: [], additivesList: [] };
  }
  console.log(`[OpenFacts] Searching by name: "${q}"`);
  for (const { url, source } of SEARCH_BASES) {
    const result = await searchFromSource(q, url, source);
    if (result.found) return result;
  }
  console.log('[OpenFacts] Name search found no product');
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
  lines.push('IMPORTANT : Utilise ces données comme source complémentaire. Ta PRIORITÉ reste de chercher les ingrédients cancérigènes et toxiques de notre base Dr.Toxi. Open Food Facts enrichit les données mais ton analyse toxicologique est le coeur de Dr.Toxi.');

  return lines.join('\n');
}
