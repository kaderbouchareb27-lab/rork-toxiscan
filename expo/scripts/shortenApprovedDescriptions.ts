/**
 * RÈGLE APPROVED (vert) : une description = UNE seule phrase courte disant en quoi
 * l'ingrédient est bénéfique pour le corps. Aucun détail superflu, aucune formule de
 * classement (« Il est classé approuvé car… »).
 *
 * Ce script parcourt scripts/officialDescriptionsSource.json, repère chaque fiche
 * badgée « Approved » qui compte plus d'une phrase et la condense hors ligne, puis
 * réécrit la source. Il est IDEMPOTENT et reprend là où il s'est arrêté : les
 * réécritures sont mises en cache dans scripts/approvedShortDescriptions.json.
 *
 * À relancer après chaque nouveau lot de fiches, puis enchaîner :
 *   bun run scripts/generateOfficialDescriptions.ts
 *   bun run scripts/translateOfficialDescriptions.ts
 *
 * Usage : bun run scripts/shortenApprovedDescriptions.ts   (cwd = expo/)
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, 'scripts', 'officialDescriptionsSource.json');
const CACHE_PATH = path.join(ROOT, 'scripts', 'approvedShortDescriptions.json');

const API_KEY = process.env.EXPO_PUBLIC_OPEN_AI;
if (!API_KEY) throw new Error('EXPO_PUBLIC_OPEN_AI manquant (.env)');

const MODEL = 'gpt-4.1-mini';
const BATCH_SIZE = 10;
const CONCURRENCY = 5;
/** Une fiche verte plus longue que cela est forcément à condenser. */
const MAX_APPROVED_LENGTH = 130;

interface SourceDescription {
  name: string;
  description_en: string;
  badge: string;
  lot: string;
}

/** Lots whose wording is imposed and displayed verbatim — never condensed. */
const VERBATIM_LOTS: ReadonlySet<string> = new Set(['13-fallback']);

const source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf-8')) as { descriptions: SourceDescription[] };

/** Number of complete sentences in a text (same counting as utils/api.ts). */
function countSentences(text: string): number {
  return text
    .split(/[.!?…]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2).length;
}

/** True when an Approved fiche already respects the one-short-sentence rule. */
function isShortEnough(text: string): boolean {
  return countSentences(text) <= 1 && text.trim().length <= MAX_APPROVED_LENGTH;
}

type Cache = Record<string, string>;
function loadCache(): Cache {
  if (!fs.existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')) as Cache;
  } catch {
    return {};
  }
}
const cache = loadCache();
function saveCache(): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), 'utf-8');
}

const SYSTEM = (n: number): string =>
  `You rewrite ingredient descriptions for a consumer food-safety app. Each input item is a HEALTHY, approved whole-food ingredient.
Rewrite each description into ONE single short sentence (maximum 18 words) that says how the ingredient BENEFITS the body.
Rules:
- Exactly one sentence, ending with a period. No semicolons, no lists of more than three nutrients.
- Keep the factual content of the original: never invent a benefit that is not implied by the source text.
- Say the benefit, not the manufacturing story, not the classification ("rated approved", "no known risk", "minimally processed" are forbidden).
- Do not start with the ingredient name unless it reads naturally; a nutrient-first phrasing is preferred ("Rich in ...").
- Plain consumer English, no marketing superlatives.
Respond ONLY with JSON: {"rewrites":[...]} containing exactly ${n} strings, in the same order as the input array.`;

async function rewriteBatch(items: SourceDescription[], attempt = 1): Promise<string[] | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM(items.length) },
          {
            role: 'user',
            content: JSON.stringify(items.map((d) => ({ ingredient: d.name, description: d.description_en }))),
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}') as { rewrites?: unknown };
    const out = parsed.rewrites;
    if (!Array.isArray(out) || out.length !== items.length) throw new Error('count mismatch');
    const strings = out.map((v) => String(v).trim());
    if (strings.some((s) => s.length < 15 || countSentences(s) > 1)) throw new Error('invalid rewrite shape');
    return strings;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 700 * attempt));
      return rewriteBatch(items, attempt + 1);
    }
    console.warn(`  ✗ lot échoué après ${attempt} essais : ${msg}`);
    return null;
  }
}

async function main(): Promise<void> {
  const approved = source.descriptions.filter((d) => d.badge === 'Approved' && !VERBATIM_LOTS.has(d.lot));
  const todo = approved.filter((d) => !isShortEnough(d.description_en) && !cache[d.description_en]);
  console.log('Fiches Approved :', approved.length);
  console.log('Déjà conformes  :', approved.filter((d) => isShortEnough(d.description_en)).length);
  console.log('En cache        :', approved.filter((d) => cache[d.description_en]).length);
  console.log('À condenser     :', todo.length);

  if (todo.length > 0) {
    const batches: SourceDescription[][] = [];
    for (let i = 0; i < todo.length; i += BATCH_SIZE) batches.push(todo.slice(i, i + BATCH_SIZE));
    let cursor = 0;
    let done = 0;
    async function worker(): Promise<void> {
      while (cursor < batches.length) {
        const chunk = batches[cursor++];
        const result = await rewriteBatch(chunk);
        if (result) {
          chunk.forEach((d, i) => {
            cache[d.description_en] = result[i];
          });
          saveCache();
        }
        done++;
        console.log(`  ${done}/${batches.length} lots`);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, () => worker()));
  }

  let rewritten = 0;
  for (const d of source.descriptions) {
    if (d.badge !== 'Approved') continue;
    const short = cache[d.description_en];
    if (short && short !== d.description_en) {
      d.description_en = short;
      rewritten++;
    }
  }
  fs.writeFileSync(SOURCE_PATH, JSON.stringify(source), 'utf-8');

  const stillLong = source.descriptions.filter((d) => d.badge === 'Approved' && !isShortEnough(d.description_en));
  console.log('\nRéécrites               :', rewritten);
  console.log('Encore trop longues     :', stillLong.length);
  for (const d of stillLong.slice(0, 15)) console.log('  •', d.name, '—', d.description_en.slice(0, 90));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
