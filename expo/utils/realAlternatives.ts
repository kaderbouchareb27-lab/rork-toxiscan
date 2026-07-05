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

// Claude Opus 4.8 — Anthropic's newest flagship, tool-use + native web search built in.
// Picked for real-world accuracy on "does this exact product exist at this exact store"
// rather than the cheaper Haiku/Sonnet tiers, since a wrong brand/store here is worse
// than a slower answer.
const MODEL_ID = 'anthropic/claude-opus-4.8';

/** Loose parse of a fenced or raw JSON object out of a model's text reply. */
function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
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

export interface RealAlternativeResult {
  alternative: HealthyAlternative | null;
  error?: string;
}

/**
 * Finds ONE real, currently-sold alternative product (specific brand, specific store,
 * with a real packaging photo when findable) for a product that scored badly. Uses
 * Claude's native web search so the result reflects the actual current market, not the
 * app's static ingredient database. On-demand only (called from a button tap).
 */
export async function findRealAlternative(params: {
  productName: string;
  badIngredients: string[];
  verdictTier: string;
}): Promise<RealAlternativeResult> {
  if (!TOOLKIT_URL || !SECRET_KEY) {
    return { alternative: null, error: 'missing_config' };
  }

  const language = getResponseLanguage();
  const region = getResponseStoreRegion();
  const storeContext = getRegionStoreContext(region);
  const langInstruction = getLanguageInstruction(language);
  const worstIngredients = params.badIngredients.slice(0, 5).join(', ') || 'none listed';

  const prompt = `You are helping a user of a food-scanning app find ONE real, currently sold, healthier alternative to a product they just scanned.

SCANNED PRODUCT: "${params.productName}"
VERDICT: ${params.verdictTier} (bad — user wants to avoid it)
PROBLEMATIC INGREDIENTS: ${worstIngredients}

${storeContext}

Use web search to find ONE real, specific, currently-available product (exact brand name + exact product name) sold at one of the stores listed above, that is a genuinely cleaner alternative to "${params.productName}". STRICT RULES for the alternative:
1. SAME product category and use-case — chips must be replaced by chips, soda by a sparkling drink, cereal by cereal, cookies by cookies. Never suggest a different food type (e.g. never "eat fruit instead of chips").
2. Genuinely cleaner ingredient list — no IARC-classified ingredients, no artificial flavors/colors/sweeteners, fewer and simpler ingredients overall. Prefer better fats when relevant (e.g. olive or avocado oil instead of refined sunflower/palm oil).
3. It MUST be a real product you can verify exists right now at one of the listed stores — never invent a brand or a fictional product.

Then, still using web search, try to find a DIRECT image URL of that product's real packaging photo. IMPORTANT — grocery retailer CDNs (metro.ca, walmart, target, iga…) block mobile apps with anti-bot 403s, so PREFER these sources in order: (1) images.openfoodfacts.org (search "openfoodfacts <brand> <product>"), (2) the brand's official website product page, (3) m.media-amazon.com. Only include imageUrl if you found an actual direct image link (ending in .jpg/.png/.webp or a recognizable image CDN path) — leave it empty string if unsure, never guess a URL.

Also include "searchName": the product's plain ENGLISH brand + product name (e.g. "Hardbite Avocado Oil Black Sea Salt Chips") regardless of the answer language — it is used for a database photo lookup.

${langInstruction}

Respond with ONLY a JSON object, no other text, in this exact shape:
{"nom": "Brand + Product Name", "magasin": "Store name", "raison": "One short sentence, in the required language, on why it's genuinely cleaner", "imageUrl": "https://... or empty string", "searchName": "English brand + product name"}`;

  try {
    const result = await generateText({
      model: gateway(MODEL_ID),
      prompt,
      tools: { web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }) },
    });

    const parsed = extractJson<{ nom?: string; magasin?: string; raison?: string; imageUrl?: string; searchName?: string }>(result.text);
    if (!parsed?.nom || !parsed?.raison) {
      return { alternative: null, error: 'no_result' };
    }

    let imageUrl = (parsed.imageUrl ?? '').trim();
    if (imageUrl && !(await isImageReachable(imageUrl))) {
      imageUrl = '';
    }
    if (!imageUrl) {
      // Retailer CDNs frequently 403 — fall back to Open Food Facts real packaging photos.
      const searchName = (parsed.searchName ?? '').trim() || parsed.nom.trim();
      imageUrl = (await findOpenFoodFactsImage(searchName)) ?? '';
    }

    return {
      alternative: {
        nom: parsed.nom.trim(),
        raison: parsed.raison.trim(),
        magasin: (parsed.magasin ?? '').trim() || undefined,
        imageUrl: imageUrl || undefined,
      },
    };
  } catch (e) {
    console.log('[realAlternatives] findRealAlternative error:', e);
    return { alternative: null, error: 'request_failed' };
  }
}
