import { z } from 'zod';
import { isEnglish } from '@/utils/i18n';

const MODEL_ID = 'openai/gpt-4o';
const TOOLKIT_URL = process.env.EXPO_PUBLIC_TOOLKIT_URL ?? 'https://toolkit.rork.com';
const TOOLKIT_SECRET = process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY ?? '';
const PROXY_CHAT_URL = `${TOOLKIT_URL}/v2/vercel/v1/chat/completions`;

const REQUEST_TIMEOUT_MS = 30_000;

function getProxyConfig(): { url: string; apiKey: string } {
  if (!TOOLKIT_SECRET) {
    throw new Error(
      isEnglish()
        ? 'AI configuration is missing. The Rork toolkit secret is not set.'
        : "Configuration IA manquante. La clé du toolkit Rork n'est pas définie."
    );
  }
  return { url: PROXY_CHAT_URL, apiKey: TOOLKIT_SECRET };
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

function timeoutErrorMessage(): string {
  return isEnglish()
    ? 'Analysis took too long. Check your connection and try again.'
    : 'L’analyse a pris trop de temps. Vérifie ta connexion et réessaie.';
}

async function callChatCompletions(body: Record<string, unknown>): Promise<any> {
  const { url, apiKey } = getProxyConfig();
  console.log('[AI] Calling', MODEL_ID, 'via Rork toolkit proxy (timeout', REQUEST_TIMEOUT_MS, 'ms)');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('[AI] Aborting request after', REQUEST_TIMEOUT_MS, 'ms timeout');
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const name = (err as { name?: string } | null)?.name ?? '';
    if (name === 'AbortError') {
      throw new Error(timeoutErrorMessage());
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AI] Network error:', msg);
    throw new Error(
      isEnglish()
        ? 'Could not reach the AI service. Check your connection and try again.'
        : 'Impossible de joindre le service IA. Vérifie ta connexion et réessaie.'
    );
  }
  clearTimeout(timeoutId);

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
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: MODEL_ID,
    max_tokens: params.maxTokens ?? 2048,
    messages: buildMessages(params.system, params.messages),
  };

  const data = await callChatCompletions(body);
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
}): Promise<T> {
  const jsonInstruction = isEnglish()
    ? '\n\nIMPORTANT: Respond ONLY with a valid JSON object (no text before or after, no backticks). The JSON object must contain all the fields described above.'
    : "\n\nIMPORTANT : Réponds UNIQUEMENT avec un objet JSON valide (pas de texte avant ni après, pas de backticks). L'objet JSON doit contenir tous les champs décrits ci-dessus.";
  const systemWithJson = (params.system ?? '') + jsonInstruction;

  const body: Record<string, unknown> = {
    model: MODEL_ID,
    max_tokens: params.maxTokens ?? 4096,
    messages: buildMessages(systemWithJson, params.messages),
    response_format: { type: 'json_object' },
  };

  const data = await callChatCompletions(body);
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
      isEnglish()
        ? 'The AI did not return a structured result.'
        : "L'IA n'a pas retourné de résultat structuré."
    );
  }
  const jsonStr = extractJsonBlock(contentStr);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('[AI] Failed to parse JSON response:', contentStr.substring(0, 500));
    throw new Error(isEnglish() ? 'Unreadable AI response.' : 'Réponse IA illisible.');
  }
  return params.schema.parse(parsed);
}
