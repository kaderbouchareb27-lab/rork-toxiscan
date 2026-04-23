import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const CLAUDE_MODEL = 'claude-sonnet-4-5';
const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const CLAUDE_VERSION = '2023-06-01';

function getApiKey(): string {
  const key =
    process.env.EXPO_PUBLIC_CLAUDE_API ??
    process.env.CLAUDE_API ??
    process.env.Claude_API;
  if (!key) {
    throw new Error(
      'Clé API Claude manquante. Ajoutez EXPO_PUBLIC_CLAUDE_API dans les variables d\'environnement.'
    );
  }
  return key;
}

type TextPart = { type: 'text'; text: string };
type ImagePart = { type: 'image'; image: string };

export type ClaudeMessage = {
  role: 'user' | 'assistant';
  content: string | Array<TextPart | ImagePart>;
};

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

function normalizeImage(raw: string): { media_type: string; data: string } {
  const dataUrlMatch = raw.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return { media_type: dataUrlMatch[1], data: dataUrlMatch[2] };
  }
  return { media_type: 'image/jpeg', data: raw };
}

function normalizeContent(
  content: ClaudeMessage['content']
): string | AnthropicContentBlock[] {
  if (typeof content === 'string') return content;
  return content.map<AnthropicContentBlock>((part) => {
    if (part.type === 'text') return { type: 'text', text: part.text };
    const img = normalizeImage(part.image);
    return {
      type: 'image',
      source: { type: 'base64', media_type: img.media_type, data: img.data },
    };
  });
}

async function callClaude(body: Record<string, unknown>): Promise<any> {
  const apiKey = getApiKey();
  console.log('[Claude] Calling', CLAUDE_MODEL);
  const res = await fetch(CLAUDE_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': CLAUDE_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('[Claude] API error', res.status, errText.substring(0, 500));
    throw new Error(`Claude API error ${res.status}: ${errText.substring(0, 300)}`);
  }
  return res.json();
}

export async function claudeGenerateText(params: {
  system?: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: params.maxTokens ?? 2048,
    messages: params.messages.map((m) => ({
      role: m.role,
      content: normalizeContent(m.content),
    })),
  };
  if (params.system) body.system = params.system;

  const data = await callClaude(body);
  const blocks: Array<{ type: string; text?: string }> = data.content ?? [];
  const textBlock = blocks.find((b) => b.type === 'text');
  return textBlock?.text ?? '';
}

export async function claudeGenerateObject<T>(params: {
  system?: string;
  messages: ClaudeMessage[];
  schema: z.ZodType<T>;
  toolName?: string;
  toolDescription?: string;
  maxTokens?: number;
}): Promise<T> {
  const toolName = params.toolName ?? 'record_result';
  const jsonSchema = zodToJsonSchema(params.schema, {
    target: 'openApi3',
    $refStrategy: 'none',
  }) as Record<string, unknown>;

  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: params.maxTokens ?? 4096,
    tools: [
      {
        name: toolName,
        description:
          params.toolDescription ??
          'Enregistre le résultat structuré de l\'analyse.',
        input_schema: jsonSchema,
      },
    ],
    tool_choice: { type: 'tool', name: toolName },
    messages: params.messages.map((m) => ({
      role: m.role,
      content: normalizeContent(m.content),
    })),
  };
  if (params.system) body.system = params.system;

  const data = await callClaude(body);
  const blocks: Array<{ type: string; name?: string; input?: unknown }> =
    data.content ?? [];
  const toolUse = blocks.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.input === undefined) {
    throw new Error('Claude n\'a pas retourné de résultat structuré.');
  }
  return params.schema.parse(toolUse.input);
}
