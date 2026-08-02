/**
 * Pré-traduit HORS LIGNE les descriptions officielles anglaises en FR et KO,
 * puis fige le résultat dans expo/constants/officialDescriptionsI18n.ts.
 *
 * L'anglais (constants/officialDescriptions.ts) reste la référence : ce script
 * ne fait que traduire, jamais reformuler ni enrichir.
 *
 * Reprise possible : le cache scripts/officialDescriptionsTranslations.json est
 * relu à chaque exécution, seuls les textes manquants sont envoyés à l'IA.
 *
 * Usage : bun run scripts/translateOfficialDescriptions.ts   (cwd = expo/)
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const EN_PATH = path.join(ROOT, 'constants', 'officialDescriptions.ts');
const CACHE_PATH = path.join(ROOT, 'scripts', 'officialDescriptionsTranslations.json');
const OUTPUT_PATH = path.join(ROOT, 'constants', 'officialDescriptionsI18n.ts');

const API_KEY = process.env.EXPO_PUBLIC_OPEN_AI;
if (!API_KEY) throw new Error('EXPO_PUBLIC_OPEN_AI manquant (.env)');

const MODEL = 'gpt-4.1-mini';
const BATCH_SIZE = 8;
const CONCURRENCY = 6;

// ── 1) Lire les textes anglais de référence ──────────────────────
function readEnglishTexts(): string[] {
  const src = fs.readFileSync(EN_PATH, 'utf-8');
  const start = src.indexOf('OFFICIAL_DESCRIPTION_TEXTS: readonly string[] = [');
  if (start === -1) throw new Error('OFFICIAL_DESCRIPTION_TEXTS introuvable');
  const arrStart = src.indexOf('= [', start) + 2;
  const arrEnd = src.indexOf('\n];', arrStart);
  const body = src.slice(arrStart + 1, arrEnd).trim().replace(/,\s*$/, '');
  return JSON.parse('[' + body + ']') as string[];
}

const EN_TEXTS = readEnglishTexts();
console.log('Textes anglais de référence :', EN_TEXTS.length);

// ── 2) Cache de reprise ──────────────────────────────────────────
type Lang = 'fr' | 'ko';
type Cache = Record<Lang, Record<string, string>>;

function loadCache(): Cache {
  if (!fs.existsSync(CACHE_PATH)) return { fr: {}, ko: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')) as Partial<Cache>;
    return { fr: raw.fr ?? {}, ko: raw.ko ?? {} };
  } catch {
    return { fr: {}, ko: {} };
  }
}

const cache = loadCache();
function saveCache(): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache), 'utf-8');
}

// ── 3) Appel de traduction ───────────────────────────────────────
const LANG_NAME: Record<Lang, string> = { fr: 'French', ko: 'Korean' };

const SYSTEM = (lang: Lang, n: number): string =>
  `You are a professional translator for a consumer food-safety mobile app. Translate each English ingredient description into ${LANG_NAME[lang]}.
Rules:
- Preserve the exact factual meaning: no additions, no omissions, no reinterpretation, no softening.
- Keep E-numbers (E129), chemical names, agency acronyms (IARC, EFSA, FDA, EU, WHO, ANSES, JECFA) and every figure/unit unchanged.
- Translate IARC group wording naturally (e.g. "Group 2B" -> ${lang === 'fr' ? '"groupe 2B"' : '"그룹 2B"'}).
- Keep the same number of sentences and the same tone: factual, clear, consumer-friendly.
- ${lang === 'fr' ? 'Français de France, vouvoiement neutre évité : formulation impersonnelle.' : '자연스러운 한국어 존댓말(-습니다 체)로 작성하세요.'}
Respond ONLY with JSON: {"translations":[...]} containing exactly ${n} strings, in the same order as the input array.`;

async function translateBatch(lang: Lang, chunk: string[], attempt = 1): Promise<string[] | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM(lang, chunk.length) },
          { role: 'user', content: JSON.stringify(chunk) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(content) as { translations?: unknown };
    const out = parsed.translations;
    if (!Array.isArray(out) || out.length !== chunk.length) {
      throw new Error(`count mismatch (${Array.isArray(out) ? out.length : 'n/a'} vs ${chunk.length})`);
    }
    const strings = out.map((v) => String(v).trim());
    if (strings.some((s) => s.length === 0)) throw new Error('empty translation');
    return strings;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 800 * attempt));
      return translateBatch(lang, chunk, attempt + 1);
    }
    console.warn(`  ✗ batch échoué (${lang}) après ${attempt} essais : ${msg}`);
    return null;
  }
}

async function runLang(lang: Lang): Promise<void> {
  const missing = EN_TEXTS.filter((t) => !cache[lang][t]);
  console.log(`\n[${lang}] à traduire : ${missing.length} / ${EN_TEXTS.length}`);
  if (missing.length === 0) return;

  const batches: string[][] = [];
  for (let i = 0; i < missing.length; i += BATCH_SIZE) batches.push(missing.slice(i, i + BATCH_SIZE));

  let done = 0;
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < batches.length) {
      const chunk = batches[cursor++];
      const result = await translateBatch(lang, chunk);
      if (result) {
        chunk.forEach((en, i) => {
          cache[lang][en] = result[i];
        });
        saveCache();
      }
      done++;
      if (done % 5 === 0 || done === batches.length) {
        console.log(`  [${lang}] ${done}/${batches.length} lots — ${Object.keys(cache[lang]).length} textes en cache`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, () => worker()));
}

// ── 4) Émission du fichier figé ──────────────────────────────────
function emit(): void {
  const frCount = EN_TEXTS.filter((t) => cache.fr[t]).length;
  const koCount = EN_TEXTS.filter((t) => cache.ko[t]).length;

  const lines: string[] = [];
  lines.push('// ═══════════════════════════════════════════════════════════════════════');
  lines.push('// TRADUCTIONS OFFICIELLES FIGÉES — AUTO-GÉNÉRÉ par');
  lines.push('// scripts/translateOfficialDescriptions.ts. NE PAS ÉDITER À LA MAIN.');
  lines.push('//');
  lines.push('// Traductions FR/KO des textes anglais de référence, alignées par INDEX sur');
  lines.push('// OFFICIAL_DESCRIPTION_TEXTS (constants/officialDescriptions.ts).');
  lines.push(`// FR : ${frCount}/${EN_TEXTS.length} — KO : ${koCount}/${EN_TEXTS.length}.`);
  lines.push('// Une chaîne vide signifie « pas de traduction figée » → repli anglais.');
  lines.push('// ═══════════════════════════════════════════════════════════════════════');
  lines.push('');
  for (const [lang, label] of [
    ['fr', 'FR'],
    ['ko', 'KO'],
  ] as const) {
    lines.push(`/** ${label} translations, index-aligned with OFFICIAL_DESCRIPTION_TEXTS. */`);
    lines.push(`export const OFFICIAL_DESCRIPTIONS_${label}: readonly string[] = [`);
    for (const en of EN_TEXTS) lines.push('  ' + JSON.stringify(cache[lang][en] ?? '') + ',');
    lines.push('];');
    lines.push('');
  }
  fs.writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf-8');
  console.log(`\nÉcrit : ${OUTPUT_PATH}`);
  console.log(`FR : ${frCount}/${EN_TEXTS.length}  •  KO : ${koCount}/${EN_TEXTS.length}`);
}

async function main(): Promise<void> {
  await runLang('fr');
  await runLang('ko');
  emit();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
