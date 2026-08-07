import { z } from 'zod';
import { pick } from '@/utils/i18n';

// ═══════════════════════════════════════════════════════════════════════
// AI PROVIDERS — clean toggle.
// Two OpenAI-compatible providers (/chat/completions) are wired:
//   • 'openai'     → api.openai.com   (key = EXPO_PUBLIC_OPEN_AI)
//   • 'openrouter' → openrouter.ai    (key = EXPO_PUBLIC_OPENROUTER_API_KEY)
// To re-route a flow to another model/provider, just change the MEAL_VISION_*,
// LABEL_VISION_* or TEXT_* constants below — nothing else in the app needs to change.
// ═══════════════════════════════════════════════════════════════════════

export type AIProvider = 'openai' | 'openrouter';

/**
 * Text-only model: Dr. Toxi chat (aiGenerateText) and product-label description
 * enrichment (aiGenerateObject via callAI). Fast and cheap — does NOT handle images.
 */
const TEXT_MODEL_ID = 'gpt-4.1-nano';
const TEXT_PROVIDER: AIProvider = 'openai';

/**
 * MEAL PHOTO model: recognising a cooked dish on a plate (utils/mealAnalysis.ts).
 * Routed through OpenRouter → GPT-5.6 Luna.
 *
 * Reading a printed label and recognising a cooked dish are NOT the same job, so they
 * deliberately use different models. Benchmarked on 6 real meal photos, in EN/FR/KO
 * (scripts/benchMealModels.ts). Luna won every criterion at once:
 *   • latency 556-760 ms avg, worst case ~1.4 s — vs 5.5 s avg / 10 s peak for
 *     gemini-3.5-flash-lite, which cannot disable its hidden reasoning and therefore
 *     spends seconds "thinking" about a plate of pasta.
 *   • dish named correctly 6/6 and BASE food listed 6/6 (the pizza dough, the burger bun
 *     + patty, the croissant pastry) — the prompt rule models most often skip.
 *   • ingredient recall 93-97 % (vs 78 % gemini-3.5-flash-lite, 69 % qwen3.7-plus).
 *   • golden rule 6/6: never labels a plain food "carcinogenic".
 *   • language lock held 6/6 in French AND Korean — no leakage either way.
 * minimax-m3 reached 100 % recall but peaks at 6.5 s; gemini-3.6-flash truncated its
 * JSON on 4/6 photos at maxTokens 1000.
 */
export const MEAL_VISION_MODEL_ID = 'openai/gpt-5.6-luna';
export const MEAL_VISION_PROVIDER: AIProvider = 'openrouter';

/**
 * PRODUCT LABEL model: atomic ingredient extraction from a packaging photo (utils/api.ts).
 * Routed through OpenRouter → Gemini 3.5 Flash-Lite.
 *
 * Stated explicitly instead of relying on the TEXT_* fallback, so the label flow can never
 * silently inherit a model change made for the meal flow (which is exactly what used to
 * happen when both flows shared one constant).
 *
 * Benchmarked on 4 real label photos (Twix, Nutella, Mars, Cruesly) against the previous
 * gpt-4.1-nano baseline and every OpenRouter candidate (scripts/benchVisionModels.ts), 3 runs
 * each for the top two to rule out noise:
 *   • gpt-4.1-nano (previous): recall only 54 %, and named Twix "unknown" — too weak on
 *     ingredient lists split across multiple label photos.
 *   • gemini-3.1-flash-lite: same 87 % recall, but slower — avg ~2.4 s / worst-case ~5.4 s
 *     across 3 runs, vs ~1.9 s / ~4.5 s for 3.5 Flash-Lite.
 *   • gemini-3.5-flash-lite (chosen): recall 87 % on all 3 runs (same 3 misses every time —
 *     deterministic, not noise), product name and atomic split 100 % correct, fastest of the
 *     two Gemini finalists.
 *   • qwen3.7-plus/flash, minimax-m3, perceptron-mk1, glm-5v-turbo: all recall ≤ 80 %.
 *   • gpt-5.6-luna (the meal-flow winner) and gemini-3.6-flash/stepfun-3.7-flash: disqualified
 *     outright — luna returned 0 ingredients on the Twix photo, the other two broke JSON
 *     parsing on 2-4 of the 4 photos. Confirms a label photo and a plate of food are different
 *     jobs — the best model for one can fail outright on the other.
 * Do not change this without re-running that benchmark on real label photos.
 */
export const LABEL_VISION_MODEL_ID = 'google/gemini-3.5-flash-lite';
export const LABEL_VISION_PROVIDER: AIProvider = 'openrouter';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface ProviderConfig {
  url: string;
  apiKey: string;
  extraHeaders: Record<string, string>;
}

function missingKeyError(varName: string): Error {
  return new Error(
    pick({
      en: `AI configuration is missing. The ${varName} environment variable must be set.`,
      fr: `Configuration IA manquante. La variable d'environnement ${varName} doit être définie.`,
      ko: `AI 구성이 누락되었습니다. ${varName} 환경 변수를 설정해야 합니다.`,
    })
  );
}

function getProviderConfig(provider: AIProvider): ProviderConfig {
  if (provider === 'openrouter') {
    const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) throw missingKeyError('EXPO_PUBLIC_OPENROUTER_API_KEY');
    return {
      url: OPENROUTER_CHAT_URL,
      apiKey,
      // OpenRouter recommends these for attribution; harmless if ignored.
      extraHeaders: {
        'HTTP-Referer': 'https://toxiscan.app',
        'X-Title': 'ToxiScan',
      },
    };
  }
  const apiKey = process.env.EXPO_PUBLIC_OPEN_AI;
  if (!apiKey) throw missingKeyError('EXPO_PUBLIC_OPEN_AI');
  return { url: OPENAI_CHAT_URL, apiKey, extraHeaders: {} };
}

type TextPart = { type: 'text'; text: string };
type ImagePart = { type: 'image'; image: string };

export type AIMessage = {
  role: 'user' | 'assistant';
  content: string | Array<TextPart | ImagePart>;
};

type OpenAIContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

function toDataUrl(raw: string): string {
  if (raw.startsWith('data:')) return raw;
  return `data:image/jpeg;base64,${raw}`;
}

function normalizeContent(
  content: AIMessage['content']
): string | OpenAIContentBlock[] {
  if (typeof content === 'string') return content;
  return content.map<OpenAIContentBlock>((part) => {
    if (part.type === 'text') return { type: 'text', text: part.text };
    return { type: 'image_url', image_url: { url: toDataUrl(part.image), detail: 'high' } };
  });
}

/**
 * Some endpoints (Gemini via OpenRouter) reject `reasoning: { enabled: false }` outright
 * with "Reasoning is mandatory for this endpoint and cannot be disabled". Detect that
 * exact refusal so we can retry once without the flag instead of failing the scan.
 */
function isMandatoryReasoningError(status: number, errText: string): boolean {
  if (status !== 400 && status !== 422) return false;
  return /reasoning is mandatory|cannot be disabled/i.test(errText);
}

async function callChatCompletions(
  body: Record<string, unknown>,
  provider: AIProvider
): Promise<any> {
  const { url, apiKey, extraHeaders } = getProviderConfig(provider);
  console.log('[AI] Calling', body.model ?? TEXT_MODEL_ID, 'via', provider);
  const started = Date.now();
  const post = async (payload: Record<string, unknown>): Promise<Response> =>
    fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify(payload),
    });

  let res = await post(body);
  if (!res.ok) {
    const errText = await res.text();
    if (isMandatoryReasoningError(res.status, errText) && 'reasoning' in body) {
      console.log('[AI] Endpoint requires reasoning — retrying without the disable flag');
      const { reasoning: _omitted, ...withReasoning } = body;
      res = await post(withReasoning);
      if (!res.ok) {
        const retryErr = await res.text();
        console.error('[AI] API error', res.status, retryErr.substring(0, 500));
        throw new Error(`AI API error ${res.status}: ${retryErr.substring(0, 300)}`);
      }
    } else {
      console.error('[AI] API error', res.status, errText.substring(0, 500));
      throw new Error(`AI API error ${res.status}: ${errText.substring(0, 300)}`);
    }
  }
  const json = await res.json();
  console.log('[AI] Completed in', Date.now() - started, 'ms');
  return json;
}

function buildMessages(
  system: string | undefined,
  messages: AIMessage[]
): Array<{ role: string; content: string | OpenAIContentBlock[] }> {
  const out: Array<{ role: string; content: string | OpenAIContentBlock[] }> = [];
  if (system) out.push({ role: 'system', content: system });
  for (const m of messages) {
    out.push({ role: m.role, content: normalizeContent(m.content) });
  }
  return out;
}

export async function aiGenerateText(params: {
  system?: string;
  messages: AIMessage[];
  maxTokens?: number;
  model?: string;
  provider?: AIProvider;
}): Promise<string> {
  const provider = params.provider ?? TEXT_PROVIDER;
  const body: Record<string, unknown> = {
    model: params.model ?? TEXT_MODEL_ID,
    max_tokens: params.maxTokens ?? 2048,
    messages: buildMessages(params.system, params.messages),
    // SPEED: hybrid-reasoning models (Qwen3…) silently "think" for hundreds of tokens
    // before answering. OpenRouter normalizes this flag and ignores it on models
    // without reasoning — disabling it cuts several seconds per call.
    ...(provider === 'openrouter' ? { reasoning: { enabled: false } } : {}),
  };

  const data = await callChatCompletions(body, provider);
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text?: string }) => b.text ?? '')
      .join('');
  }
  return '';
}

function extractJsonBlock(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) return fenceMatch[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.substring(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

export async function aiGenerateObject<T>(params: {
  system?: string;
  messages: AIMessage[];
  schema: z.ZodType<T>;
  toolName?: string;
  toolDescription?: string;
  maxTokens?: number;
  model?: string;
  provider?: AIProvider;
}): Promise<T> {
  const jsonInstruction = pick({
    en: '\n\nIMPORTANT: Respond ONLY with a valid JSON object (no text before or after, no backticks). The JSON object must contain all the fields described above.',
    fr: "\n\nIMPORTANT : Réponds UNIQUEMENT avec un objet JSON valide (pas de texte avant ni après, pas de backticks). L'objet JSON doit contenir tous les champs décrits ci-dessus.",
    ko: '\n\n중요: 위에서 설명한 모든 필드를 포함하는 유효한 JSON 객체로만 응답하세요 (앞뒤에 텍스트 없이, 백틱 없이).',
  });
  const systemWithJson = (params.system ?? '') + jsonInstruction;
  const provider = params.provider ?? TEXT_PROVIDER;

  const body: Record<string, unknown> = {
    model: params.model ?? TEXT_MODEL_ID,
    max_tokens: params.maxTokens ?? 4096,
    messages: buildMessages(systemWithJson, params.messages),
    // OpenAI reliably supports JSON mode; some OpenRouter models reject it, so we
    // rely on the strong JSON instruction + extractJsonBlock fallback there.
    ...(provider === 'openai' ? { response_format: { type: 'json_object' as const } } : {}),
    // SPEED: disable hidden "thinking" on hybrid-reasoning models (Qwen3…) — the meal
    // vision call must answer directly. OpenRouter ignores this on non-reasoning models.
    ...(provider === 'openrouter' ? { reasoning: { enabled: false } } : {}),
  };

  const data = await callChatCompletions(body, provider);
  const choice = data?.choices?.[0];
  const rawContent = choice?.message?.content;
  let contentStr = '';
  if (typeof rawContent === 'string') {
    contentStr = rawContent;
  } else if (Array.isArray(rawContent)) {
    contentStr = rawContent
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text?: string }) => b.text ?? '')
      .join('');
  }
  if (!contentStr) {
    throw new Error(
      pick({
        en: 'The AI did not return a structured result.',
        fr: "L'IA n'a pas retourné de résultat structuré.",
        ko: 'AI가 구조화된 결과를 반환하지 않았습니다.',
      })
    );
  }
  const jsonStr = extractJsonBlock(contentStr);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('[AI] Failed to parse JSON response:', contentStr.substring(0, 500));
    throw new Error(pick({ en: 'Unreadable AI response.', fr: 'Réponse IA illisible.', ko: 'AI 응답을 읽을 수 없습니다.' }));
  }
  return params.schema.parse(parsed);
}
