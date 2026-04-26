import { isEnglish } from '@/utils/i18n';

const GOOGLE_VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';

function getApiKey(): string {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error(
      isEnglish()
        ? 'Google Vision API key is missing. Set EXPO_PUBLIC_GOOGLE_VISION_API_KEY.'
        : "Clé API Google Vision manquante. Définis EXPO_PUBLIC_GOOGLE_VISION_API_KEY.",
    );
  }
  return apiKey;
}

function stripDataUrlPrefix(b64: string): string {
  if (b64.startsWith('data:')) {
    const idx = b64.indexOf(',');
    return idx >= 0 ? b64.substring(idx + 1) : b64;
  }
  return b64;
}

export type GoogleVisionOcrResult = {
  fullText: string;
  detectedLocale: string | null;
  blocks: number;
  isEmpty: boolean;
};

export async function runGoogleVisionOcr(imageBase64: string): Promise<GoogleVisionOcrResult> {
  const apiKey = getApiKey();
  const cleanBase64 = stripDataUrlPrefix(imageBase64);

  console.log('[GoogleVision] Starting OCR, base64 length:', cleanBase64.length);

  const body = {
    requests: [
      {
        image: { content: cleanBase64 },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
        ],
        imageContext: {
          languageHints: ['fr', 'en', 'es', 'de', 'it', 'pt'],
        },
      },
    ],
  };

  const url = `${GOOGLE_VISION_URL}?key=${encodeURIComponent(apiKey)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (networkError) {
    const msg = networkError instanceof Error ? networkError.message : String(networkError);
    console.error('[GoogleVision] Network error:', msg);
    throw new Error(
      isEnglish() ? 'Could not reach Google Vision API.' : 'Impossible de joindre Google Vision API.',
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error('[GoogleVision] API error', res.status, errText.substring(0, 500));
    throw new Error(`Google Vision error ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  const response = data?.responses?.[0];
  if (response?.error) {
    console.error('[GoogleVision] Response error:', response.error);
    throw new Error(`Google Vision: ${response.error.message ?? 'unknown error'}`);
  }

  const fullTextAnnotation = response?.fullTextAnnotation;
  const fullText: string = typeof fullTextAnnotation?.text === 'string' ? fullTextAnnotation.text : '';
  const pages = Array.isArray(fullTextAnnotation?.pages) ? fullTextAnnotation.pages : [];
  let blocks = 0;
  let detectedLocale: string | null = null;
  for (const page of pages) {
    if (Array.isArray(page?.blocks)) blocks += page.blocks.length;
    const langs = page?.property?.detectedLanguages;
    if (!detectedLocale && Array.isArray(langs) && langs[0]?.languageCode) {
      detectedLocale = String(langs[0].languageCode);
    }
  }

  const cleaned = fullText.trim();
  const result: GoogleVisionOcrResult = {
    fullText: cleaned,
    detectedLocale,
    blocks,
    isEmpty: cleaned.length === 0,
  };
  console.log('[GoogleVision] OCR done. chars:', cleaned.length, 'blocks:', blocks, 'locale:', detectedLocale);
  return result;
}

const INGREDIENT_HEADERS = [
  'ingrédients',
  'ingredients',
  'ingrediënten',
  'zutaten',
  'ingredienti',
  'ingredientes',
];

export function extractIngredientsBlock(rawText: string): string | null {
  if (!rawText) return null;
  const lower = rawText.toLowerCase();
  let bestIdx = -1;
  for (const header of INGREDIENT_HEADERS) {
    const idx = lower.indexOf(header);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
    }
  }
  if (bestIdx === -1) return null;
  const sub = rawText.substring(bestIdx);
  const stopMatch = sub.search(/\n\s*(valeurs?\s+nutritionnelle|nutrition\s+facts|à\s+conserver|conserver\s+à|best\s+before|à\s+consommer|emballé|fabriqué|produit\s+par|distribué|net\s+weight|poids\s+net|contient\s+du\s+gluten)/i);
  const block = stopMatch > 0 ? sub.substring(0, stopMatch) : sub;
  return block.trim();
}
