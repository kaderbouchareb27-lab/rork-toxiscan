import { z } from 'zod';

const MODEL_ID = 'gpt-4o';
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

function getOpenAIConfig(): { url: string; apiKey: string } {
  const apiKey = process.env.EXPO_PUBLIC_OPEN_AI;
  if (!apiKey) {
    throw new Error(
      "Configuration IA manquante. La variable d'environnement EXPO_PUBLIC_OPEN_AI doit être définie."
    );
  }
  return {
    url: OPENAI_CHAT_URL,
    apiKey,
  };
}

type TextPart = { type: 'text'; text: string };
type ImagePart = { type: 'image'; image: string };

export type AIMessage = {
  role: 'user' | 'assistant';
  content: string | Array<TextPart | ImagePart>;
};

type OpenAIContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

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
    return { type: 'image_url', image_url: { url: toDataUrl(part.image) } };
  });
}

async function callChatCompletions(body: Record<string, unknown>): Promise<any> {
  const { url, apiKey } = getOpenAIConfig();
  console.log('[AI] Calling', MODEL_ID, 'directly via OpenAI API');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
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
  const jsonInstruction = "\n\nIMPORTANT : Réponds UNIQUEMENT avec un objet JSON valide (pas de texte avant ni après, pas de backticks). L'objet JSON doit contenir tous les champs décrits ci-dessus.";
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
    throw new Error("L'IA n'a pas retourné de résultat structuré.");
  }
  const jsonStr = extractJsonBlock(contentStr);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('[AI] Failed to parse JSON response:', contentStr.substring(0, 500));
    throw new Error("Réponse IA illisible.");
  }
  return params.schema.parse(parsed);
}
