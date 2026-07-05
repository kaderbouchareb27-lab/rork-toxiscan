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

Use web search to find ONE real, specific, currently-available product (exact brand name + exact product name) sold at one of the stores listed above, that is a genuinely cleaner alternative to "${params.productName}" (similar use-case, but without the problematic ingredients or far fewer of them). It MUST be a real product you can verify exists right now — never invent a brand or a fictional product.

Then, still using web search, try to find a DIRECT image URL of that product's real packaging photo (from the retailer's product page, the brand's official site, or a well-known CDN). Only include imageUrl if you found an actual working direct image link (ending in a common image extension or from a recognizable CDN path) — leave it empty string if unsure, never guess a URL.

${langInstruction}

Respond with ONLY a JSON object, no other text, in this exact shape:
{"nom": "Brand + Product Name", "magasin": "Store name", "raison": "One short sentence, in the required language, on why it's genuinely cleaner", "imageUrl": "https://... or empty string"}`;

  try {
    const result = await generateText({
      model: gateway(MODEL_ID),
      prompt,
      tools: { web_search: anthropic.tools.webSearch_20250305({ maxUses: 3 }) },
    });

    const parsed = extractJson<{ nom?: string; magasin?: string; raison?: string; imageUrl?: string }>(result.text);
    if (!parsed?.nom || !parsed?.raison) {
      return { alternative: null, error: 'no_result' };
    }

    let imageUrl = (parsed.imageUrl ?? '').trim();
    if (imageUrl && !(await isImageReachable(imageUrl))) {
      imageUrl = '';
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
