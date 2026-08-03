/**
 * Rédige HORS LIGNE les fiches officielles manquantes ou erronées listées par
 * scripts/verifyDescriptionIntegrity.ts (scripts/pendingFiches.json), puis les fusionne
 * dans scripts/officialDescriptionsSource.json.
 *
 * Règles imposées au modèle :
 *  • badge Approved (vert) → UNE seule phrase courte disant le bénéfice pour le corps ;
 *  • autres badges → 2 phrases factuelles, fidèles à la note déjà validée en base,
 *    sans invention (aucune allégation cancer qui ne figure pas dans la note).
 *
 * Pipeline complet :
 *   bun --preload ./scripts/lib/nativeStub.ts scripts/verifyDescriptionIntegrity.ts
 *   bun run scripts/writeMissingFiches.ts
 *   bun run scripts/generateOfficialDescriptions.ts
 *   bun run scripts/translateOfficialDescriptions.ts
 *   bun --preload ./scripts/lib/nativeStub.ts scripts/verifyDescriptionIntegrity.ts
 *
 * Usage : bun run scripts/writeMissingFiches.ts   (cwd = expo/)
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const PENDING_PATH = path.join(ROOT, 'scripts', 'pendingFiches.json');
const SOURCE_PATH = path.join(ROOT, 'scripts', 'officialDescriptionsSource.json');
const CACHE_PATH = path.join(ROOT, 'scripts', 'writtenFiches.json');

const API_KEY = process.env.EXPO_PUBLIC_OPEN_AI;
if (!API_KEY) throw new Error('EXPO_PUBLIC_OPEN_AI manquant (.env)');

const MODEL = 'gpt-4.1-mini';
const BATCH_SIZE = 8;
const CONCURRENCY = 5;
const LOT = '13-auto';

interface PendingFiche {
  name: string;
  badge: string;
  circ: string;
  noteEn: string;
  reason: string;
}
interface SourceDescription {
  name: string;
  description_en: string;
  badge: string;
  lot: string;
}

const pending = (JSON.parse(fs.readFileSync(PENDING_PATH, 'utf-8')) as { pending: PendingFiche[] }).pending;
const source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf-8')) as { descriptions: SourceDescription[] };

type Cache = Record<string, string>;
const cache: Cache = fs.existsSync(CACHE_PATH)
  ? (JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')) as Cache)
  : {};
function saveCache(): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache), 'utf-8');
}

/** First sentence of a text (used to enforce the one-sentence Approved rule). */
function firstSentence(text: string): string {
  const match = /^[\s\S]*?[.!?…](?=\s|$)/.exec(text.trim());
  const first = (match ? match[0] : text).trim();
  return first.length >= 25 ? first : text.trim();
}

/** Trims an Approved fiche to a single sentence; leaves the other badges untouched. */
function sanitize(text: string, item: PendingFiche): string {
  return item.badge === 'Approved' ? firstSentence(text) : text;
}

function countSentences(text: string): number {
  return text
    .split(/[.!?…]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2).length;
}

const SYSTEM = (n: number): string =>
  `You write the reference descriptions of a consumer food-safety app. Each input item gives an ingredient name, its badge, and the validated internal note the app already holds.
Write one description per item, in English, obeying the badge:
- badge "Approved": exactly ONE sentence, max 18 words, saying how the ingredient BENEFITS the body. Never mention classification, processing or risk.
- any other badge ("Occasional", "Processed", "Ultra toxic", "Carcinogenic"): exactly TWO sentences. First: what the ingredient is and what it does (keep the E-number if the note has one). Second: the concrete health consideration.
Absolute rules:
- Stay faithful to the note: never invent a cancer classification, an agency verdict, a ban or a figure that is not in the note.
- If the note is empty, describe only what is common knowledge about that ingredient, in the same shape.
- Never write "rated approved", "not in our database", "it is classified as" boilerplate, and never address the reader.
- Plain consumer English, factual, no marketing.
- The ingredient name may be French, Korean or accent-stripped: ALWAYS write about it using its natural ENGLISH name ("cranberries sechees" -> "dried cranberries", "huile de coco hydrogenee" -> "hydrogenated coconut oil"). Never copy the foreign spelling into the sentence.
Respond ONLY with JSON: {"fiches":[...]} containing exactly ${n} strings, in the same order as the input array.`;

async function writeBatch(items: PendingFiche[], attempt = 1): Promise<string[] | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3000,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM(items.length) },
          {
            role: 'user',
            content: JSON.stringify(
              items.map((p) => ({ ingredient: p.name, badge: p.badge, note: p.noteEn })),
            ),
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}') as { fiches?: unknown };
    const out = parsed.fiches;
    if (!Array.isArray(out) || out.length !== items.length) throw new Error('count mismatch');
    const strings = out.map((v, i) => sanitize(String(v).trim(), items[i]));
    strings.forEach((text, i) => {
      if (text.length < 20) throw new Error(`fiche trop courte : ${items[i].name}`);
    });
    return strings;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 700 * attempt));
      return writeBatch(items, attempt + 1);
    }
    console.warn(`  ✗ lot échoué après ${attempt} essais : ${msg}`);
    return null;
  }
}

async function main(): Promise<void> {
  const todo = pending.filter((p) => !cache[p.name]);
  console.log('Fiches à écrire :', pending.length, '• déjà en cache :', pending.length - todo.length);

  if (todo.length > 0) {
    const batches: PendingFiche[][] = [];
    for (let i = 0; i < todo.length; i += BATCH_SIZE) batches.push(todo.slice(i, i + BATCH_SIZE));
    let cursor = 0;
    let done = 0;
    async function worker(): Promise<void> {
      while (cursor < batches.length) {
        const chunk = batches[cursor++];
        const result = await writeBatch(chunk);
        if (result) {
          chunk.forEach((p, i) => {
            cache[p.name] = result[i];
          });
          saveCache();
        }
        done++;
        console.log(`  ${done}/${batches.length} lots`);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, () => worker()));
  }

  const byName = new Map<string, SourceDescription>();
  for (const d of source.descriptions) byName.set(d.name.toLowerCase(), d);

  let added = 0;
  let updated = 0;
  let skipped = 0;
  for (const p of pending) {
    const text = cache[p.name];
    if (!text) {
      skipped++;
      continue;
    }
    const existing = byName.get(p.name.toLowerCase());
    if (existing) {
      existing.description_en = text;
      existing.badge = p.badge;
      existing.lot = LOT;
      updated++;
    } else {
      const fiche: SourceDescription = { name: p.name, description_en: text, badge: p.badge, lot: LOT };
      source.descriptions.push(fiche);
      byName.set(p.name.toLowerCase(), fiche);
      added++;
    }
  }
  source.descriptions.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  fs.writeFileSync(SOURCE_PATH, JSON.stringify(source), 'utf-8');
  console.log('\nAjoutées :', added, '• mises à jour :', updated, '• non écrites :', skipped);
  console.log('Total fiches source :', source.descriptions.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
