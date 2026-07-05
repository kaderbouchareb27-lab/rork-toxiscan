import { createGateway, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { HealthyAlternative } from '@/types';
import { getResponseLanguage, getResponseStoreRegion, getLanguageInstruction, getRegionStoreContext } from '@/utils/regionDetection';

const TOOLKIT_URL = process.env.EXPO_PUBLIC_TOOLKIT_URL;
const SECRET_KEY = process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY;

const gateway = createGateway({
  baseURL: `${TOOLKIT_URL}/v2/vercel/v3/ai`,
  apiKey: SECRET_KEY,
});

/**
 * Two-attempt strategy for reliability on-device: the flagship Opus model first
 * (best real-world accuracy on "does this exact product exist at this exact
 * store"), then Sonnet as a faster fallback if Opus times out or errors.
 * Both support Anthropic's native web search.
 */
const ATTEMPTS: { readonly model: string; readonly timeoutMs: number; readonly maxSearches: number }[] = [
  { model: 'anthropic/claude-opus-4.8', timeoutMs: 55000, maxSearches: 6 },
  { model: 'anthropic/claude-sonnet-5', timeoutMs: 45000, maxSearches: 5 },
];

const MAX_ALTERNATIVES = 3;

interface RawAlternative {
  nom?: string;
  magasin?: string;
  raison?: string;
  imageUrl?: string;
  searchName?: string;
}

/**
 * Tolerant JSON extraction: handles fenced blocks, preamble text before the
 * JSON, a top-level {"alternatives":[...]} object, a bare array, or a single
 * object (legacy single-alternative shape).
 */
function parseAlternatives(text: string): RawAlternative[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();

  const objStart = raw.indexOf('{');
  const arrStart = raw.indexOf('[');

  let candidate = '';
  if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) {
    candidate = raw.slice(arrStart, raw.lastIndexOf(']') + 1);
  } else if (objStart !== -1) {
    candidate = raw.slice(objStart, raw.lastIndexOf('}') + 1);
  }
  if (!candidate) return [];

  try {
    const parsed: unknown = JSON.parse(candidate);
    if (Array.isArray(parsed)) return parsed as RawAlternative[];
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as { alternatives?: unknown } & RawAlternative;
      if (Array.isArray(obj.alternatives)) return obj.alternatives as RawAlternative[];
      if (typeof obj.nom === 'string') return [obj];
    }
    return [];
  } catch {
    return [];
  }
}

/** Quick reachability check so a hallucinated image URL never renders as a broken image. */
async function isImageReachable(url: string): Promise<boolean> {
  if (!/^https:\/\//i.test(url)) return false;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return false;
    const type = res.headers.get('content-type') ?? '';
    return type.startsWith('image/');
  } catch {
    return false;
  }
}

interface OffSearchProduct {
  product_name?: string;
  brands?: string | string[];
  image_front_url?: string;
}

/**
 * Fallback photo source: retailer CDNs (Metro, Walmart, Target…) usually block app
 * requests with anti-bot challenges (403), so the model's imageUrl often fails the
 * reachability check. Open Food Facts hosts real packaging photos on an open CDN,
 * so we search it by the alternative's exact name and take the best match's photo.
 */
async function findOpenFoodFactsImage(productName: string): Promise<string | null> {
  try {
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(productName)}&page_size=5&fields=product_name,brands,image_front_url`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ToxiScan/1.0' } });
    if (!res.ok) return null;
    const data = (await res.json()) as { hits?: OffSearchProduct[] };
    const products = data.hits ?? [];

    // Prefer a result whose brand or name overlaps the searched name (avoids grabbing
    // a random product photo when OFF has no real match).
    const needle = productName.toLowerCase();
    const scored = products
      .filter((p) => typeof p.image_front_url === 'string' && p.image_front_url.startsWith('https://'))
      .map((p) => {
        const rawBrand = Array.isArray(p.brands) ? p.brands[0] ?? '' : p.brands ?? '';
        const brand = rawBrand.toLowerCase();
        const name = (p.product_name ?? '').toLowerCase();
        const brandHit = brand.length > 2 && needle.includes(brand.split(',')[0].trim()) ? 2 : 0;
        const nameWords = name.split(/\s+/).filter((w) => w.length > 3);
        const nameHits = nameWords.filter((w) => needle.includes(w)).length;
        return { url: p.image_front_url as string, score: brandHit + nameHits };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    return best && best.score >= 2 ? best.url : null;
  } catch {
    return null;
  }
}

/** Resolves the best displayable photo for one alternative (model URL → OFF fallback → none). */
async function resolveImage(alt: RawAlternative): Promise<string | undefined> {
  let imageUrl = (alt.imageUrl ?? '').trim();
  if (imageUrl && !(await isImageReachable(imageUrl))) {
    imageUrl = '';
  }
  if (!imageUrl) {
    const searchName = (alt.searchName ?? '').trim() || (alt.nom ?? '').trim();
    if (searchName) {
      imageUrl = (await findOpenFoodFactsImage(searchName)) ?? '';
    }
  }
  return imageUrl || undefined;
}

export interface RealAlternativesResult {
  alternatives: HealthyAlternative[];
  error?: string;
}

// ─────────────────────────────────────────────
// Session cache: one paid web search per product per app session, and results
// survive leaving/reopening the product screen.
// ─────────────────────────────────────────────
const alternativesCache = new Map<string, HealthyAlternative[]>();

function cacheKey(productName: string, verdictTier: string): string {
  return `${productName.trim().toLowerCase()}|${verdictTier}|${getResponseLanguage()}`;
}

/** Returns previously found alternatives for this product in this session, if any. */
export function getCachedRealAlternatives(productName: string, verdictTier: string): HealthyAlternative[] | null {
  return alternativesCache.get(cacheKey(productName, verdictTier)) ?? null;
}

function buildPrompt(params: { productName: string; badIngredients: string[]; verdictTier: string }): string {
  const language = getResponseLanguage();
  const region = getResponseStoreRegion();
  const storeContext = getRegionStoreContext(region);
  const langInstruction = getLanguageInstruction(language);
  const worstIngredients = params.badIngredients.slice(0, 5).join(', ') || 'none listed';

  return `You are helping a user of a food-scanning app find real, currently sold, healthier alternatives to a product they just scanned.

SCANNED PRODUCT: "${params.productName}"
VERDICT: ${params.verdictTier} (bad — user wants to avoid it)
PROBLEMATIC INGREDIENTS: ${worstIngredients}

${storeContext}

Use web search to find ${MAX_ALTERNATIVES} real, specific, currently-available products (exact brand name + exact product name, each from a DIFFERENT brand) sold at the stores listed above, that are genuinely cleaner alternatives to "${params.productName}". If you can only verify 1 or 2 real products, return only those — never invent one to fill the list. STRICT RULES for every alternative:
1. SAME product category and use-case — chocolate must be replaced by chocolate, chips by chips, soda by a sparkling drink, cereal by cereal. Never suggest a different food type (e.g. never "eat fruit instead of chocolate").
2. Genuinely cleaner ingredient list — no IARC-classified ingredients, no artificial flavors/colors/sweeteners, fewer and simpler ingredients overall. Prefer better fats when relevant (e.g. olive or avocado oil instead of refined sunflower/palm oil).
3. It MUST be a real product you can verify exists right now at one of the listed stores — never invent a brand or a fictional product.

For each alternative, try to find a DIRECT image URL of its real packaging photo. IMPORTANT — grocery retailer CDNs (metro.ca, walmart, target, iga…) block mobile apps with anti-bot 403s, so PREFER these sources in order: (1) images.openfoodfacts.org, (2) the brand's official website product page, (3) m.media-amazon.com. Only include imageUrl if you found an actual direct image link (ending in .jpg/.png/.webp or a recognizable image CDN path) — use empty string if unsure, never guess a URL. Do not spend more than 1 extra search on images.

Each alternative must also include "searchName": the product's plain ENGLISH brand + product name (e.g. "Camino Organic 71% Dark Chocolate") regardless of the answer language — it is used for a database photo lookup.

${langInstruction}

Respond with ONLY a JSON object, no other text, in this exact shape:
{"alternatives": [{"nom": "Brand + Product Name", "magasin": "Store name", "raison": "One short sentence, in the required language, on why it's genuinely cleaner", "imageUrl": "https://... or empty string", "searchName": "English brand + product name"}]}`;
}

/**
 * Finds up to ${MAX_ALTERNATIVES} real, currently-sold alternative products (specific
 * brand, specific store, real packaging photo when findable) for a product that scored
 * badly. Uses Claude's native web search so results reflect the actual current market.
 * Reliability: hard timeout per attempt + automatic retry on a faster fallback model,
 * so one slow/failed request never leaves the user with nothing. On-demand only.
 */
export async function findRealAlternatives(params: {
  productName: string;
  badIngredients: string[];
  verdictTier: string;
}): Promise<RealAlternativesResult> {
  if (!TOOLKIT_URL || !SECRET_KEY) {
    return { alternatives: [], error: 'missing_config' };
  }

  const key = cacheKey(params.productName, params.verdictTier);
  const cached = alternativesCache.get(key);
  if (cached && cached.length > 0) {
    return { alternatives: cached };
  }

  const prompt = buildPrompt(params);
  let lastError = 'no_result';

  for (const attempt of ATTEMPTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), attempt.timeoutMs);
    try {
      console.log(`[realAlternatives] trying ${attempt.model} (timeout ${attempt.timeoutMs / 1000}s)`);
      const result = await generateText({
        model: gateway(attempt.model),
        prompt,
        abortSignal: controller.signal,
        tools: { web_search: anthropic.tools.webSearch_20250305({ maxUses: attempt.maxSearches }) },
      });
      clearTimeout(timer);

      const rawList = parseAlternatives(result.text)
        .filter((a) => typeof a.nom === 'string' && a.nom.trim().length > 0 && typeof a.raison === 'string' && a.raison.trim().length > 0)
        .slice(0, MAX_ALTERNATIVES);

      if (rawList.length === 0) {
        console.log(`[realAlternatives] ${attempt.model} returned no parsable alternatives`);
        lastError = 'no_result';
        continue;
      }

      const images = await Promise.all(rawList.map((a) => resolveImage(a)));
      const alternatives: HealthyAlternative[] = rawList.map((a, i) => ({
        nom: (a.nom ?? '').trim(),
        raison: (a.raison ?? '').trim(),
        magasin: (a.magasin ?? '').trim() || undefined,
        imageUrl: images[i],
      }));

      alternativesCache.set(key, alternatives);
      return { alternatives };
    } catch (e) {
      clearTimeout(timer);
      const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      console.log(`[realAlternatives] ${attempt.model} failed:`, message);
      lastError = controller.signal.aborted ? 'timeout' : 'request_failed';
    }
  }

  return { alternatives: [], error: lastError };
}
