import { HealthyAlternative, ProductCategory } from '@/types';
import { getResponseLanguage, getResponseStoreRegion, getLanguageInstruction, getRegionStores, UserRegion } from '@/utils/regionDetection';

const TOOLKIT_URL = process.env.EXPO_PUBLIC_TOOLKIT_URL;
const SECRET_KEY = process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY;

/**
 * Plain fetch to the Rork proxy chat-completions endpoint with Perplexity Sonar
 * models (web search is built into the model, no tool plumbing). A raw fetch is
 * the only approach that is 100% reliable inside React Native on-device — the
 * Vercel AI SDK gateway path hangs silently on Hermes.
 */
const CHAT_COMPLETIONS_URL = `${TOOLKIT_URL}/v2/vercel/v1/chat/completions`;

// Sonar Pro (stronger web search + reasoning) goes FIRST: the cheap Sonar model
// was fabricating products that don't exist (e.g. "avocado oil" from a granola
// brand) and mismatching the product type. Plain Sonar stays as a fallback so a
// Pro outage never leaves the user without results.
const ATTEMPTS: { readonly model: string; readonly timeoutMs: number }[] = [
  { model: 'perplexity/sonar-pro', timeoutMs: 35000 },
  { model: 'perplexity/sonar', timeoutMs: 30000 },
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
 * JSON, citation markers like [1], a top-level {"alternatives":[...]} object,
 * a bare array, or a single object (legacy single-alternative shape).
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(productName)}&page_size=5&fields=product_name,brands,image_front_url`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ToxiScan/1.0' }, signal: controller.signal });
    clearTimeout(timer);
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
        return { url: p.image_front_url as string, score: brandHit + nameHits, nameHits };
      })
      .sort((a, b) => b.score - a.score);

    // A brand-only hit is NOT enough: it used to show a photo of ANY product from
    // that brand (e.g. a granola bag for an "oil"). The PRODUCT name must overlap too.
    const best = scored[0];
    return best && best.score >= 2 && best.nameHits >= 1 ? best.url : null;
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

/**
 * The single most important constraint: an alternative must be the SAME KIND of
 * product, consumed the exact same way, only cleaner. A beverage can only be
 * replaced by another beverage — never a bar, snack, or powder. This phrasing is
 * what stops the model from latching onto a keyword ("protein", "whey") and
 * suggesting the wrong format (e.g. protein bars for a protein drink).
 */
function describeFormat(category?: ProductCategory): string {
  if (category === 'beverage') {
    return `"${'{PRODUCT}'}" is a DRINK / BEVERAGE — it is CONSUMED BY DRINKING. Every single alternative MUST also be a drink you consume by drinking (a cleaner bottled or canned beverage, protein drink/shake, sparkling water, juice, kombucha, etc.). NEVER suggest a bar, snack, powder, chocolate, or anything that is EATEN rather than drunk.`;
  }
  return `Match the EXACT sub-type of "${'{PRODUCT}'}" and how it is consumed: chips → chips, chocolate → chocolate, cereal → cereal, yogurt → yogurt, cookies → cookies, mayonnaise → a cleaner mayonnaise (e.g. avocado-oil or olive-oil mayo), ketchup → a cleaner ketchup, salad dressing → a cleaner dressing, cooking oil → a better cooking oil, soda → a cleaner sparkling drink. Never swap it for a different kind of food (e.g. never "eat fruit instead of chips", never a bottle of plain oil instead of a mayonnaise).`;
}

const REGION_DISPLAY_NAMES: Record<UserRegion, string> = {
  quebec: 'Québec / Canada',
  canada_other: 'Canada (English)',
  france: 'France',
  usa: 'United States',
  belgium: 'Belgique',
  switzerland: 'Suisse',
  korea: '대한민국 (South Korea)',
};

/**
 * Stores-only region context. Deliberately does NOT include the "recommended clean
 * brands" list used elsewhere: with a brand list in the prompt, the search model
 * fabricated non-existent products for those exact brands (e.g. "La Fourmi Bionique
 * Avocado Oil" — a granola maker). Stores are safe to inject; brands are not.
 */
function buildStoreContext(region: UserRegion): string {
  const stores = getRegionStores(region);
  return `USER REGION: ${REGION_DISPLAY_NAMES[region]}
Stores the user can shop at: ${stores.join(', ')}
RULE: every alternative must be sold at one of these stores (or a store that really exists in this region). Never name a store from another country.`;
}

function buildPrompt(params: { productName: string; badIngredients: string[]; verdictTier: string; productCategory?: ProductCategory; ingredients?: string[] }): string {
  const language = getResponseLanguage();
  const region = getResponseStoreRegion();
  const storeContext = buildStoreContext(region);
  const langInstruction = getLanguageInstruction(language);
  const worstIngredients = params.badIngredients.slice(0, 5).join(', ') || 'none listed';
  const fullIngredients = (params.ingredients ?? []).slice(0, 14).join(', ');
  const formatConstraint = describeFormat(params.productCategory).replace(/\{PRODUCT\}/g, params.productName);

  return `You are helping a user of a food-scanning app find real, currently sold, healthier alternatives to a product they just scanned.

SCANNED PRODUCT: "${params.productName}"
${fullIngredients ? `FULL INGREDIENT LIST ON ITS LABEL: ${fullIngredients}\n` : ''}VERDICT: ${params.verdictTier} (bad — user wants to avoid it)
PROBLEMATIC INGREDIENTS: ${worstIngredients}

${storeContext}

STEP 0 — IDENTIFY THE TRUE PRODUCT TYPE FIRST:
The scanned name may be imprecise or auto-generated. Deduce what this product actually IS from its full ingredient list above before searching. Examples: vegetable oil + egg yolk + vinegar + mustard = a MAYONNAISE (→ suggest cleaner mayonnaises, NEVER bottles of plain oil); carbonated water + sugar + caffeine = a COLA (→ cleaner sodas); milk + cultures = a YOGURT. All alternatives must match this TRUE type.

Search the web and find ${MAX_ALTERNATIVES} real, specific, currently-available products (exact brand name + exact product name, each from a DIFFERENT brand) sold at the stores listed above, that are genuinely cleaner alternatives to "${params.productName}".

#1 RULE — SAME KIND OF PRODUCT, SAME FORMAT (most important, never break this):
Every alternative must be the SAME type of product as the TRUE type identified in STEP 0, consumed the exact same way — only with a cleaner ingredient list. ${formatConstraint}
Before finalizing, re-check EACH alternative: is it consumed the same way (drunk vs eaten) and is it truly the same kind of product? If not, discard it and find one that is.

#2 RULE — ONLY PRODUCTS THAT REALLY EXIST (never break this either):
- Every brand + product combination MUST be verifiable on the current web (retailer page, the brand's own site, or Open Food Facts). A brand making granola does NOT make cooking oil — NEVER attach a plausible-sounding product to a brand that doesn't make it.
- If you cannot verify a brand+product combination, DROP it and find one you can verify.

OTHER RULES:
- Genuinely cleaner ingredient list — no IARC-classified ingredients, no artificial flavors/colors/sweeteners, fewer and simpler ingredients overall. Prefer better fats when relevant (e.g. olive or avocado oil instead of refined sunflower/canola/palm oil).
- If you can only verify 1 or 2 real SAME-FORMAT products, return only those — never invent one, and NEVER pad the list with a different kind of product just to reach ${MAX_ALTERNATIVES}.

For imageUrl: only include a DIRECT packaging photo URL if you actually found one from images.openfoodfacts.org, a brand's official website, or m.media-amazon.com (grocery retailer CDNs like metro.ca / walmart / target block mobile apps). Use empty string if unsure — never guess a URL.

Each alternative must also include "searchName": the product's plain ENGLISH brand + product name (e.g. "Camino Organic 71% Dark Chocolate") regardless of the answer language — it is used for a database photo lookup.

${langInstruction}

Respond with ONLY a JSON object, no other text, no citations, no markdown, in this exact shape:
{"alternatives": [{"nom": "Brand + Product Name", "magasin": "Store name", "raison": "One short sentence, in the required language, on why it's genuinely cleaner", "imageUrl": "https://... or empty string", "searchName": "English brand + product name"}]}`;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

/** One raw chat-completions call with a hard timeout. Returns the assistant text. */
async function callModel(model: string, prompt: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SECRET_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as ChatCompletionResponse;
    return data.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Finds up to ${MAX_ALTERNATIVES} real, currently-sold alternative products (specific
 * brand, specific store, real packaging photo when findable) for a product that scored
 * badly. Uses Perplexity Sonar (built-in web search) via a plain fetch to the Rork
 * proxy — no AI SDK, so it works reliably on-device. Hard timeout per attempt +
 * automatic retry on a faster model, so one slow/failed request never leaves the
 * user with an infinite spinner. On-demand only.
 */
export async function findRealAlternatives(params: {
  productName: string;
  badIngredients: string[];
  verdictTier: string;
  productCategory?: ProductCategory;
  /** Full ingredient list from the label — lets the model infer the TRUE product type even when the scanned name is imprecise. */
  ingredients?: string[];
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
    try {
      console.log(`[realAlternatives] trying ${attempt.model} (timeout ${attempt.timeoutMs / 1000}s)`);
      const text = await callModel(attempt.model, prompt, attempt.timeoutMs);

      const rawList = parseAlternatives(text)
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
      const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      console.log(`[realAlternatives] ${attempt.model} failed:`, message);
      lastError = message.includes('Abort') ? 'timeout' : 'request_failed';
    }
  }

  return { alternatives: [], error: lastError };
}
