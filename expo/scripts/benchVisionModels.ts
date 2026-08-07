/**
 * BENCHMARK — modèles vision OpenRouter pour le scan d'étiquette produit.
 *
 * Mesure, sur de vraies photos d'étiquettes, la LATENCE et l'EXACTITUDE d'extraction
 * (nom du produit + liste d'ingrédients atomiques) afin de décider si le modèle vision
 * du scan produit (MEAL_VISION_MODEL_ID) doit changer.
 *
 * Usage : bun run scripts/benchVisionModels.ts [modele1 modele2 ...]   (cwd = expo/)
 */
import * as fs from 'fs';
import * as path from 'path';

const KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
if (!KEY) throw new Error('EXPO_PUBLIC_OPENROUTER_API_KEY manquant');

const URL = 'https://openrouter.ai/api/v1/chat/completions';
const LABEL_DIR = process.env.BENCH_LABELS ?? '/tmp/labels';
const TIMEOUT_MS = 45000;

const DEFAULT_MODELS = [
  'qwen/qwen3.7-plus',
  'qwen/qwen3.7-flash',
  'google/gemini-3.5-flash-lite',
  'google/gemini-3.1-flash-lite',
  'google/gemini-3.6-flash',
  'openai/gpt-5.6-luna',
  'minimax/minimax-m3',
  'stepfun/step-3.7-flash',
  'perceptron/perceptron-mk1',
  'z-ai/glm-5v-turbo',
];

const MODELS = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_MODELS;

const SYSTEM = `You read food packaging photos for a food-safety app.
Return ONLY JSON: {"objet_identifie":"...","categorie_produit":"food","ingredients":["...","..."]}
- objet_identifie = the commercial product name from the packaging front, never an ingredient.
- ingredients = FLAT array of ATOMIC ingredients. Explode all parentheses/brackets. No commas, parentheses or brackets inside a name. Keep ONE language (English).
- Ignore allergen lines ("Contains", "May contain") and nutrition tables.
No text before or after the JSON.`;

/** Each expectation is a list of accepted spellings (EN or FR) — the label languages differ. */
type Case = { readonly file: string; readonly expect: readonly (readonly string[])[] };

const CASES: readonly Case[] = [
  {
    file: 'twix.jpg',
    expect: [
      ['sugar', 'sucre'], ['glucose'], ['palm', 'palme'], ['wheat flour', 'farine de ble', 'farine de blé'],
      ['milk', 'lait'], ['cocoa butter', 'beurre de cacao'], ['salt', 'sel'], ['lecithin', 'lecithine', 'lécithine'],
    ],
  },
  {
    file: 'nutella.jpg',
    expect: [
      ['wheat flour', 'farine de ble', 'farine de blé'], ['sugar', 'sucre'], ['palm', 'palme'],
      ['hazelnut', 'noisette'], ['cocoa', 'cacao'], ['milk', 'lait'], ['lecithin', 'lecithine', 'lécithine'], ['salt', 'sel'],
    ],
  },
  {
    file: 'mars.jpg',
    expect: [
      ['sugar', 'sucre'], ['glucose'], ['milk', 'lait'], ['cocoa butter', 'beurre de cacao'],
      ['cocoa', 'cacao'], ['lecithin', 'lecithine', 'lécithine'], ['salt', 'sel'],
    ],
  },
  {
    file: 'cruesly.jpg',
    expect: [
      ['oat', 'avoine'], ['wheat', 'ble', 'blé'], ['glucose'], ['sunflower', 'tournesol'],
      ['sugar', 'sucre'], ['honey', 'miel'], ['salt', 'sel'],
    ],
  },
];

function toDataUrl(file: string): string {
  const buf = fs.readFileSync(path.join(LABEL_DIR, file));
  const mime = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence?.[1] ?? text;
  const a = body.indexOf('{');
  const b = body.lastIndexOf('}');
  return a !== -1 && b > a ? body.slice(a, b + 1) : body.trim();
}

type Outcome = {
  ok: boolean;
  ms: number;
  count: number;
  recall: number;
  nameOk: boolean;
  missing: string;
  atomic: boolean;
  name: string;
  error?: string;
};

async function runCase(model: string, c: Case, noReasoning = true): Promise<Outcome> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${KEY}`,
        'HTTP-Referer': 'https://toxiscan.app',
        'X-Title': 'ToxiScan bench',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        ...(noReasoning ? { reasoning: { enabled: false } } : {}),
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract the product name and every atomic ingredient. JSON only.' },
              { type: 'image_url', image_url: { url: toDataUrl(c.file), detail: 'high' } },
            ],
          },
        ],
      }),
    });
    const ms = Date.now() - started;
    if (!res.ok) {
      const t = await res.text();
      // Some endpoints (Gemini thinking models) refuse reasoning:{enabled:false} — retry once with it on.
      if (noReasoning && /reasoning is mandatory/i.test(t)) {
        clearTimeout(timer);
        return runCase(model, c, false);
      }
      return { ok: false, ms, count: 0, recall: 0, nameOk: false, missing: '', atomic: false, name: '', error: `${res.status} ${t.slice(0, 90)}` };
    }
    const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const raw = data.choices?.[0]?.message?.content;
    const text = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.map((b: { text?: string }) => b.text ?? '').join('') : '';
    const parsed = JSON.parse(extractJson(text)) as { objet_identifie?: string; ingredients?: unknown };
    const list = Array.isArray(parsed.ingredients) ? parsed.ingredients.map((x) => String(x)) : [];
    const joined = list.join(' | ').toLowerCase();
    const missed = c.expect.filter((alts) => !alts.some((a) => joined.includes(a)));
    const name = String(parsed.objet_identifie ?? '');
    const atomic = list.every((x) => !/[,;()\[\]/]/.test(x));
    // The name is only valid if it is not empty and not simply one of the extracted ingredients.
    const nameNorm = name.trim().toLowerCase();
    const nameOk = nameNorm.length > 2 && !list.some((x) => x.trim().toLowerCase() === nameNorm);
    return {
      ok: true,
      ms,
      count: list.length,
      recall: c.expect.length === 0 ? 1 : (c.expect.length - missed.length) / c.expect.length,
      nameOk,
      missing: missed.map((alts) => alts[0]).join(','),
      atomic,
      name,
    };
  } catch (err) {
    const ms = Date.now() - started;
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, ms, count: 0, recall: 0, nameOk: false, missing: '', atomic: false, name: '', error: msg.slice(0, 90) };
  } finally {
    clearTimeout(timer);
  }
}

async function benchModel(model: string): Promise<void> {
  const results = await Promise.all(CASES.map((c) => runCase(model, c)));
  const okRuns = results.filter((r) => r.ok);
  const avgMs = okRuns.length ? Math.round(okRuns.reduce((a, r) => a + r.ms, 0) / okRuns.length) : 0;
  const maxMs = okRuns.length ? Math.max(...okRuns.map((r) => r.ms)) : 0;
  const recall = okRuns.length ? okRuns.reduce((a, r) => a + r.recall, 0) / okRuns.length : 0;
  const names = results.filter((r) => r.nameOk).length;
  const atomic = okRuns.filter((r) => r.atomic).length;
  const counts = results.map((r) => (r.ok ? r.count : 'x')).join('/');
  console.log(
    `${model.padEnd(30)} ok ${okRuns.length}/${results.length}  avg ${String(avgMs).padStart(6)}ms  max ${String(maxMs).padStart(6)}ms` +
      `  recall ${(recall * 100).toFixed(0).padStart(3)}%  name ${names}/${results.length}  atomic ${atomic}/${okRuns.length}  n=${counts}`,
  );
  for (const [i, r] of results.entries()) {
    if (!r.ok) console.log(`   · ${CASES[i]!.file} ERROR ${r.error}`);
    else if (r.recall < 1 || !r.nameOk || !r.atomic)
      console.log(`   · ${CASES[i]!.file} recall ${(r.recall * 100).toFixed(0)}% missing=[${r.missing}] atomic=${r.atomic} name="${r.name}"`);
  }
}

async function main(): Promise<void> {
  console.log('Cas de test :', CASES.map((c) => c.file).join(', '));
  for (const model of MODELS) {
    await benchModel(model);
  }
}

void main();
