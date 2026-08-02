/**
 * Génère expo/constants/officialDescriptions.ts à partir de
 * expo/scripts/officialDescriptionsSource.json (394 descriptions officielles EN).
 *
 * Chaque description est associée par NOM (correspondance exacte normalisée) à une
 * entrée des bases : ingredientsDatabase.ts, additives.ts, ultraToxicIngredients.ts,
 * cosmeticsDatabase.ts. Tous les mots-clés/alias/codes de l'entrée matchée deviennent
 * des clés de lookup, pour que le scan retrouve la description quel que soit l'alias lu.
 *
 * Usage : bun run scripts/generateOfficialDescriptions.ts   (cwd = expo/)
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const CONSTANTS_DIR = path.join(ROOT, 'constants');
const SOURCE_PATH = path.join(ROOT, 'scripts', 'officialDescriptionsSource.json');
const OUTPUT_PATH = path.join(CONSTANTS_DIR, 'officialDescriptions.ts');

/** Same normalization as normalizeForLookup in utils/api.ts (ASCII + Hangul kept). */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readSource(file: string): string {
  return fs.readFileSync(path.join(CONSTANTS_DIR, file), 'utf-8');
}

/** Extract quoted strings ('…' or "…") handling escaped quotes. */
function parseQuotedList(raw: string): string[] {
  const out: string[] = [];
  const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const val = (m[1] ?? m[2] ?? '').replace(/\\(['"\\])/g, '$1');
    if (val) out.push(val);
  }
  return out;
}

interface MatchableEntry {
  source: string;
  keys: string[];
}

const entries: MatchableEntry[] = [];

// 1) ingredientsDatabase.ts — { keywords: [...], code: ..., risk: '...', circ: '...' }
{
  const src = readSource('ingredientsDatabase.ts');
  const re = /\{\s*keywords:\s*\[([^\]]*)\]\s*,\s*code:\s*(?:'([^']*)'|"([^"]*)"|null)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const keywords = parseQuotedList(m[1]);
    const code = m[2] ?? m[3] ?? null;
    const keys = keywords.map(normalize);
    if (code) keys.push(normalize(code));
    entries.push({ source: 'ingredients', keys: keys.filter(Boolean) });
  }
}

// 2) additives.ts — { code: '...', name: '...', group: '...' }
{
  const src = readSource('additives.ts');
  const re = /\{\s*code:\s*'((?:[^'\\]|\\.)*)'\s*,\s*name:\s*'((?:[^'\\]|\\.)*)'\s*,\s*group:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const code = m[1].replace(/\\(['"\\])/g, '$1').replace(/^en:/i, '');
    const name = m[2].replace(/\\(['"\\])/g, '$1');
    entries.push({ source: 'additives', keys: [normalize(name), normalize(code)].filter(Boolean) });
  }
}

// 3) ultraToxicIngredients.ts — { id: '...', code: ..., keywords: [...] }
{
  const src = readSource('ultraToxicIngredients.ts');
  const re = /\{\s*id:\s*'[^']*'\s*,\s*code:\s*(?:'([^']*)'|null)\s*,\s*keywords:\s*\[([^\]]*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const code = m[1] ?? null;
    const keys = parseQuotedList(m[2]).map(normalize);
    if (code) keys.push(normalize(code));
    entries.push({ source: 'ultratoxic', keys: keys.filter(Boolean) });
  }
}

// 4) cosmeticsDatabase.ts — { keywords: [...], displayName: '...', displayNameEn: '...' }
{
  const src = readSource('cosmeticsDatabase.ts');
  const re = /\{\s*keywords:\s*\[([^\]]*)\]\s*,\s*displayName:\s*'((?:[^'\\]|\\.)*)'\s*,\s*displayNameEn:\s*'((?:[^'\\]|\\.)*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const keys = parseQuotedList(m[1]).map(normalize);
    keys.push(normalize(m[2].replace(/\\(['"\\])/g, '$1')));
    keys.push(normalize(m[3].replace(/\\(['"\\])/g, '$1')));
    entries.push({ source: 'cosmetics', keys: keys.filter(Boolean) });
  }
}

// ── Load merged source descriptions ────────────────────────────
interface SourceDescription {
  name: string;
  description_en: string;
  badge: string;
  lot: string;
}
const source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf-8')) as { descriptions: SourceDescription[] };
const descriptions = source.descriptions;

// ── Matching ───────────────────────────────────────────────────
const texts: string[] = [];
const keyToIndex = new Map<string, number>();
/** Keys claimed by an EXACT source-name match — never overwritten by keyword spreading. */
const exactKeys = new Set<string>();

const matched: string[] = [];
const unmatched: string[] = [];
const sourcesHit: Record<string, number> = {};

function textIndex(text: string): number {
  const existing = texts.indexOf(text);
  if (existing !== -1) return existing;
  texts.push(text);
  return texts.length - 1;
}

// Pass 1 — each description claims its own normalized name (exact priority).
for (const d of descriptions) {
  const key = normalize(d.name);
  if (!key) continue;
  const idx = textIndex(d.description_en);
  keyToIndex.set(key, idx);
  exactKeys.add(key);
}

// Pass 2 — spread every matched entry's keywords/aliases/codes onto the same text.
for (const d of descriptions) {
  const nameKey = normalize(d.name);
  if (!nameKey) continue;
  const idx = keyToIndex.get(nameKey);
  if (idx === undefined) continue;
  let found = false;
  for (const entry of entries) {
    if (!entry.keys.includes(nameKey)) continue;
    found = true;
    sourcesHit[entry.source] = (sourcesHit[entry.source] ?? 0) + 1;
    for (const k of entry.keys) {
      if (!k || exactKeys.has(k)) continue;
      if (!keyToIndex.has(k)) keyToIndex.set(k, idx);
    }
  }
  if (found) matched.push(d.name);
  else unmatched.push(d.name);
}

// ── Emit constants file ────────────────────────────────────────
const lines: string[] = [];
lines.push('// ═══════════════════════════════════════════════════════════════════════');
lines.push('// DESCRIPTIONS OFFICIELLES — AUTO-GÉNÉRÉ par scripts/generateOfficialDescriptions.ts');
lines.push('// NE PAS ÉDITER À LA MAIN. Source : scripts/officialDescriptionsSource.json.');
lines.push('//');
lines.push('// Textes anglais de référence, validés et sourcés (' + texts.length + ' descriptions,');
lines.push('// ' + keyToIndex.size + ' clés de lookup). L\'affichage FR/KO passe par la traduction');
lines.push('// automatique mise en cache (utils/officialDescriptions.ts). Quand une description');
lines.push('// officielle existe, elle remplace TOUTE génération IA pour cet ingrédient.');
lines.push('// ═══════════════════════════════════════════════════════════════════════');
lines.push('');
lines.push('/** English reference texts (index-addressed to avoid duplicating strings per alias). */');
lines.push('export const OFFICIAL_DESCRIPTION_TEXTS: readonly string[] = [');
for (const t of texts) {
  lines.push('  ' + JSON.stringify(t) + ',');
}
lines.push('];');
lines.push('');
lines.push('/** Normalized ingredient name/alias/E-code → index into OFFICIAL_DESCRIPTION_TEXTS. */');
lines.push('export const OFFICIAL_DESCRIPTION_KEYS: Readonly<Record<string, number>> = {');
const sortedKeys = [...keyToIndex.keys()].sort();
for (const k of sortedKeys) {
  lines.push('  ' + JSON.stringify(k) + ': ' + keyToIndex.get(k) + ',');
}
lines.push('};');
lines.push('');
fs.writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf-8');

// ── Report ─────────────────────────────────────────────────────
console.log('Descriptions sources     :', descriptions.length);
console.log('Textes uniques émis      :', texts.length);
console.log('Clés de lookup émises    :', keyToIndex.size);
console.log('Matchées à une entrée DB :', matched.length);
console.log('Sans correspondance DB   :', unmatched.length);
console.log('Par base :', JSON.stringify(sourcesHit));
if (unmatched.length > 0) {
  console.log('\n— NON MATCHÉES (la description reste servie par leur propre nom) —');
  for (const n of unmatched) console.log('  •', n);
}
console.log('\nÉcrit :', OUTPUT_PATH);
