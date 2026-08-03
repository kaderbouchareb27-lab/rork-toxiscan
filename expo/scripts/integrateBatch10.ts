/**
 * Intègre le lot 10 (fichiers fournis : orphelins + additifs E manquants,
 * contaminants alimentaires, cosmétiques manquants).
 *
 * - Crée les entrées absentes dans constants/ingredientsDatabase.ts (aliments)
 *   et constants/cosmeticsDatabase.ts (cosmétiques), avec le badge du fichier.
 * - Les notes FR/EN/KO sont les descriptions officielles validées
 *   (scripts/officialDescriptionsSource.json + traductions figées
 *   scripts/officialDescriptionsTranslations.json), donc `fixed: true`.
 *
 * Idempotent : une entrée déjà présente (par nom normalisé) n'est jamais recréée.
 *
 * Usage : bun run scripts/integrateBatch10.ts   (cwd = expo/)
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const CONSTANTS = path.join(ROOT, 'constants');
const ENTRIES_PATH = path.join(ROOT, 'scripts', 'newEntriesBatch10.json');
const SOURCE_PATH = path.join(ROOT, 'scripts', 'officialDescriptionsSource.json');
const CACHE_PATH = path.join(ROOT, 'scripts', 'officialDescriptionsTranslations.json');

type Badge = 'Approved' | 'Occasional' | 'Processed' | 'Carcinogenic' | 'Ultra toxic';

interface NewEntry {
  readonly name: string;
  readonly target: 'food' | 'cosmetic';
  readonly badge: Badge;
  readonly keywords: readonly string[];
  readonly code?: string | null;
  readonly circ?: string;
  readonly displayName?: string;
  readonly displayNameEn?: string;
  readonly displayNameKo?: string;
  readonly pregnancyDanger?: boolean;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const { entries } = JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf-8')) as { entries: NewEntry[] };
const source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf-8')) as {
  descriptions: { name: string; description_en: string }[];
};
const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')) as {
  fr: Record<string, string>;
  ko: Record<string, string>;
};

const enByName = new Map(source.descriptions.map((d) => [normalize(d.name), d.description_en] as const));

/** Existing normalized keys per database, so the script never duplicates an entry. */
function existingKeys(file: string, re: RegExp): Set<string> {
  const src = fs.readFileSync(path.join(CONSTANTS, file), 'utf-8');
  const keys = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const list = m[1];
    const q = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
    let k: RegExpExecArray | null;
    while ((k = q.exec(list)) !== null) {
      const v = (k[1] ?? k[2] ?? '').replace(/\\(['"\\])/g, '$1');
      if (v) keys.add(normalize(v));
    }
  }
  return keys;
}

const foodKeys = existingKeys('ingredientsDatabase.ts', /keywords:\s*\[([^\]]*)\]/g);
const cosmeticKeys = existingKeys('cosmeticsDatabase.ts', /keywords:\s*\[([^\]]*)\]/g);

const RISK_BY_BADGE: Record<Badge, string> = {
  Approved: 'aucun',
  Occasional: 'possible',
  Processed: 'probable',
  Carcinogenic: 'danger',
  'Ultra toxic': 'danger',
};

const TIER_BY_BADGE: Partial<Record<Badge, string>> = {
  Approved: 'approved',
  Occasional: 'disputed',
  'Ultra toxic': 'toxic',
};

function q(s: string): string {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function texts(name: string): { en: string; fr: string; ko: string } {
  const en = enByName.get(normalize(name));
  if (!en) throw new Error(`Description officielle manquante pour « ${name} »`);
  const fr = cache.fr[en];
  const ko = cache.ko[en];
  if (!fr || !ko) throw new Error(`Traduction FR/KO manquante pour « ${name} »`);
  return { en, fr, ko };
}

const foodLines: string[] = [];
const cosmeticLines: string[] = [];
const skipped: string[] = [];
const created: { name: string; badge: Badge; target: string }[] = [];

for (const e of entries) {
  const existing = e.target === 'food' ? foodKeys : cosmeticKeys;
  const already = e.keywords.some((k) => existing.has(normalize(k)));
  if (already) {
    skipped.push(`${e.name} (${e.target})`);
    continue;
  }
  const { en, fr, ko } = texts(e.name);
  if (e.target === 'food') {
    const circ = e.badge === 'Ultra toxic' ? 'Ultra toxique' : (e.circ ?? 'Transformé');
    foodLines.push(
      `  { keywords: [${e.keywords.map(q).join(', ')}], code: ${e.code ? q(e.code) : 'null'}, ` +
        `risk: ${q(RISK_BY_BADGE[e.badge])}, circ: ${q(circ)}, note: ${q(fr)}, noteEn: ${q(en)}, noteKo: ${q(ko)}, fixed: true },`,
    );
  } else {
    const tier = TIER_BY_BADGE[e.badge];
    if (!tier) throw new Error(`Badge cosmétique non supporté : ${e.badge} (${e.name})`);
    cosmeticLines.push(
      '  {\n' +
        `    keywords: [${e.keywords.map(q).join(', ')}],\n` +
        `    displayName: ${q(e.displayName ?? e.name)},\n` +
        `    displayNameEn: ${q(e.displayNameEn ?? e.name)},\n` +
        (e.displayNameKo ? `    displayNameKo: ${q(e.displayNameKo)},\n` : '') +
        `    tier: ${q(tier)},\n` +
        `    note: ${q(fr)},\n` +
        `    noteEn: ${q(en)},\n` +
        `    noteKo: ${q(ko)},\n` +
        (e.pregnancyDanger ? '    pregnancyDanger: true,\n' : '') +
        '  },',
    );
  }
  created.push({ name: e.name, badge: e.badge, target: e.target });
}

function insertBefore(file: string, marker: string, block: string): void {
  const p = path.join(CONSTANTS, file);
  const src = fs.readFileSync(p, 'utf-8');
  const idx = src.lastIndexOf(marker);
  if (idx === -1) throw new Error(`Marqueur introuvable dans ${file} : ${marker}`);
  const next = src.slice(0, idx) + block + src.slice(idx);
  fs.writeFileSync(p, next, 'utf-8');
}

if (foodLines.length > 0) {
  const block =
    '\n  // ═══════════════════════════════════════════════════════════════\n' +
    '  // LOT 10 — additifs E, contaminants et ingrédients manquants (badges + descriptions officielles)\n' +
    '  // ═══════════════════════════════════════════════════════════════\n' +
    foodLines.join('\n') +
    '\n';
  insertBefore('ingredientsDatabase.ts', '] as const;\n\nexport const DANGER_PREGNANCY', block);
}

if (cosmeticLines.length > 0) {
  const block =
    '\n  // ───────────────────────────────────────────────────────────────\n' +
    '  // LOT 10 — ingrédients cosmétiques manquants (parfums interdits, acides, actifs, émollients)\n' +
    '  // ───────────────────────────────────────────────────────────────\n' +
    cosmeticLines.join('\n') +
    '\n';
  insertBefore('cosmeticsDatabase.ts', '\n];\n\n/**', block);
}

console.log('Entrées créées :', created.length);
console.log('  • aliments   :', created.filter((c) => c.target === 'food').length);
console.log('  • cosmétiques:', created.filter((c) => c.target === 'cosmetic').length);
for (const c of created) console.log(`    - ${c.name} → ${c.badge}`);
console.log('\nDéjà présentes (inchangées) :', skipped.length);
for (const s of skipped) console.log('    -', s);
