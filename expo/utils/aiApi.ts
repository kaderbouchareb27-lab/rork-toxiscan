import { z } from 'zod';
import { pick } from '@/utils/i18n';

// ═══════════════════════════════════════════════════════════════════════
// AI PROVIDERS — clean toggle.
// Two OpenAI-compatible providers (/chat/completions) are wired:
//   • 'openai'     → api.openai.com   (key = EXPO_PUBLIC_OPEN_AI)
//   • 'openrouter' → openrouter.ai    (key = EXPO_PUBLIC_OPENROUTER_API_KEY)
// To re-route a flow to another model/provider, just change the MEAL_VISION_*
// or TEXT_* constants below — nothing else in the app needs to change.
// ═══════════════════════════════════════════════════════════════════════

export type AIProvider = 'openai' | 'openrouter';

/**
 * Text-only model: Dr. Toxi chat (aiGenerateText) and product-label description
 * enrichment (aiGenerateObject via callAI). Fast and cheap — does NOT handle images.
 */
const TEXT_MODEL_ID = 'gpt-4.1-nano';
const TEXT_PROVIDER: AIProvider = 'openai';

/**
 * Meal-scan VISION model: photo recognition + the authoritative text re-analysis.
 * Currently routed through OpenRouter → Qwen3.7 Plus.
 * To revert to the previous OpenAI setup, set:
 *   MEAL_VISION_PROVIDER = 'openai'  and  MEAL_VISION_MODEL_ID = 'gpt-4o'.
 * (gpt-4o is validated for fine-grained food recognition; gpt-4.1-nano is too weak.)
 */
export const MEAL_VISION_MODEL_ID = 'qwen/qwen3.7-plus';
export const MEAL_VISION_PROVIDER: AIProvider = 'openrouter';

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

async function callChatCompletions(
  body: Record<string, unknown>,
  provider: AIProvider
): Promise<any> {
  const { url, apiKey, extraHeaders } = getProviderConfig(provider);
  console.log('[AI] Calling', body.model ?? TEXT_MODEL_ID, 'via', provider);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('[AI] API error', res.status, errText.substring(0, 500));
    throw new Error(`AI API error ${res.status}: ${errText.substring(0, 300)}`);
  }
  return res.json();
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
  } catch (e) {
    console.error('[AI] Failed to parse JSON response:', contentStr.substring(0, 500));
    throw new Error(pick({ en: 'Unreadable AI response.', fr: 'Réponse IA illisible.', ko: 'AI 응답을 읽을 수 없습니다.' }));
  }
  return params.schema.parse(parsed);
}
