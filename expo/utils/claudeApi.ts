import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const MODEL_ID = 'openai/gpt-4o';

function getProxyConfig(): { url: string; apiKey: string } {
  const toolkitUrl = process.env.EXPO_PUBLIC_TOOLKIT_URL;
  const apiKey = process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY;
  if (!toolkitUrl || !apiKey) {
    throw new Error(
      "Configuration IA manquante. Les variables EXPO_PUBLIC_TOOLKIT_URL et EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY doivent être définies."
    );
  }
  return {
    url: `${toolkitUrl}/v2/vercel/v1/chat/completions`,
    apiKey,
  };
}

type TextPart = { type: 'text'; text: string };
type ImagePart = { type: 'image'; image: string };

export type ClaudeMessage = {
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
  content: ClaudeMessage['content']
): string | OpenAIContentBlock[] {
  if (typeof content === 'string') return content;
  return content.map<OpenAIContentBlock>((part) => {
    if (part.type === 'text') return { type: 'text', text: part.text };
    return { type: 'image_url', image_url: { url: toDataUrl(part.image) } };
  });
}

async function callChatCompletions(body: Record<string, unknown>): Promise<any> {
  const { url, apiKey } = getProxyConfig();
  console.log('[AI] Calling', MODEL_ID, 'via Rork proxy');
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
  messages: ClaudeMessage[]
): Array<{ role: string; content: string | OpenAIContentBlock[] }> {
  const out: Array<{ role: string; content: string | OpenAIContentBlock[] }> = [];
  if (system) out.push({ role: 'system', content: system });
  for (const m of messages) {
    out.push({ role: m.role, content: normalizeContent(m.content) });
  }
  return out;
}

export async function claudeGenerateText(params: {
  system?: string;
  messages: ClaudeMessage[];
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

export async function claudeGenerateObject<T>(params: {
  system?: string;
  messages: ClaudeMessage[];
  schema: z.ZodType<T>;
  toolName?: string;
  toolDescription?: string;
  maxTokens?: number;
}): Promise<T> {
  const toolName = params.toolName ?? 'record_result';
  const rawSchema = zodToJsonSchema(params.schema, {
    $refStrategy: 'none',
  }) as Record<string, unknown>;
  const { $schema: _s, definitions: _d, ...cleanSchema } = rawSchema as Record<string, unknown> & { $schema?: unknown; definitions?: unknown };
  const jsonSchema: Record<string, unknown> = {
    type: 'object',
    ...cleanSchema,
  };
  if (jsonSchema.type !== 'object') {
    jsonSchema.type = 'object';
  }

  const body: Record<string, unknown> = {
    model: MODEL_ID,
    max_tokens: params.maxTokens ?? 4096,
    messages: buildMessages(params.system, params.messages),
    tools: [
      {
        type: 'function',
        function: {
          name: toolName,
          description:
            params.toolDescription ??
            "Enregistre le résultat structuré de l'analyse.",
          parameters: jsonSchema,
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: toolName } },
  };

  const data = await callChatCompletions(body);
  const choice = data?.choices?.[0];
  const toolCalls = choice?.message?.tool_calls as
    | Array<{ function?: { name?: string; arguments?: string } }>
    | undefined;
  const call = toolCalls?.find((c) => c.function?.name === toolName) ?? toolCalls?.[0];
  const argsStr = call?.function?.arguments;
  if (!argsStr) {
    throw new Error("L'IA n'a pas retourné de résultat structuré.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(argsStr);
  } catch (e) {
    console.error('[AI] Failed to parse tool arguments:', argsStr.substring(0, 300));
    throw new Error("Réponse IA illisible.");
  }
  return params.schema.parse(parsed);
}
