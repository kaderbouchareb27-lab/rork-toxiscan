/**
 * Intègre le LOT 11 — document Word « ToxiScan Food Additive Descriptions for Rork »
 * (81 additifs E, badge + catégorie + description anglaise validée).
 *
 * Le document fait FOI : quand un additif existe déjà en base avec un autre badge,
 * son badge, son `circ` et sa description sont réalignés sur le document.
 *
 * Deux étapes (le script est idempotent) :
 *   1. `bun run scripts/integrateBatch11.ts --merge-source`
 *      → fusionne les 81 descriptions EN dans scripts/officialDescriptionsSource.json.
 *      Ensuite : generateOfficialDescriptions.ts puis translateOfficialDescriptions.ts.
 *   2. `bun run scripts/integrateBatch11.ts --apply-db`
 *      → crée / met à jour les entrées de constants/ingredientsDatabase.ts avec les
 *      notes FR/EN/KO figées (`fixed: true`).
 *
 * `--dry-run` affiche le plan sans rien écrire.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const CONSTANTS = path.join(ROOT, 'constants');
const DB_PATH = path.join(CONSTANTS, 'ingredientsDatabase.ts');
const BATCH_PATH = path.join(ROOT, 'scripts', 'newEntriesBatch11.json');
const SOURCE_PATH = path.join(ROOT, 'scripts', 'officialDescriptionsSource.json');
const CACHE_PATH = path.join(ROOT, 'scripts', 'officialDescriptionsTranslations.json');

type Badge = 'Approved' | 'Occasional' | 'Processed' | 'Carcinogenic' | 'Ultra toxic';

interface BatchEntry {
  readonly name: string;
  readonly code: string;
  readonly badge: Badge;
  readonly circ: string;
  readonly category: string;
  readonly description_en: string;
  readonly keywords: readonly string[];
}

const RISK_BY_BADGE: Record<Badge, string> = {
  Approved: 'aucun',
  Occasional: 'possible',
  Processed: 'probable',
  Carcinogenic: 'danger',
  'Ultra toxic': 'danger',
};

/** Entrées gérées ailleurs : ne jamais dupliquer dans ingredientsDatabase.ts. */
const SKIP_DB_CODES = new Set(['E216']); // E216 vit dans ultraToxicIngredients.ts (déjà ULTRA TOXIC).

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const MERGE_SOURCE = args.has('--merge-source');
const APPLY_DB = args.has('--apply-db');

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function q(s: string): string {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

const { entries } = JSON.parse(fs.readFileSync(BATCH_PATH, 'utf-8')) as { entries: BatchEntry[] };

// ─────────────────────────────────────────────────────────────────
// ÉTAPE 1 — fusion des descriptions anglaises dans la source officielle
// ─────────────────────────────────────────────────────────────────
if (MERGE_SOURCE) {
  interface SourceDescription {
    name: string;
    description_en: string;
    badge: string;
    lot: string;
  }
  const source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf-8')) as { descriptions: SourceDescription[] };
  const byName = new Map(source.descriptions.map((d) => [normalize(d.name), d] as const));

  let added = 0;
  let replaced = 0;
  for (const e of entries) {
    const key = normalize(e.name);
    const existing = byName.get(key);
    if (!existing) {
      const rec: SourceDescription = { name: e.name, description_en: e.description_en, badge: e.badge, lot: '11' };
      source.descriptions.push(rec);
      byName.set(key, rec);
      added++;
      continue;
    }
    if (existing.description_en !== e.description_en || existing.badge !== e.badge) {
      console.log(`  ↻ remplacé : ${e.name} (${existing.badge} → ${e.badge})`);
      existing.description_en = e.description_en;
      existing.badge = e.badge;
      existing.lot = '11';
      replaced++;
    }
  }
  source.descriptions.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  if (!DRY) fs.writeFileSync(SOURCE_PATH, JSON.stringify(source, null, 2) + '\n', 'utf-8');
  console.log(`Source officielle : +${added} ajoutées, ${replaced} remplacées → ${source.descriptions.length} descriptions.`);
}

// ─────────────────────────────────────────────────────────────────
// ÉTAPE 2 — création / mise à jour des entrées de la base aliments
// ─────────────────────────────────────────────────────────────────
if (APPLY_DB) {
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')) as { fr: Record<string, string>; ko: Record<string, string> };
  let db = fs.readFileSync(DB_PATH, 'utf-8');
  const lines = db.split('\n');

  interface DbLine {
    index: number;
    keywords: string[];
    code: string | null;
  }
  const dbLines: DbLine[] = [];
  const LINE_RE = /^\s*\{\s*keywords:\s*\[([^\]]*)\]\s*,\s*code:\s*(?:'([^']*)'|null)/;
  lines.forEach((line, index) => {
    const m = LINE_RE.exec(line);
    if (!m) return;
    const kw: string[] = [];
    const re = /'((?:[^'\\]|\\.)*)'/g;
    let k: RegExpExecArray | null;
    while ((k = re.exec(m[1])) !== null) kw.push(k[1].replace(/\\(['"\\])/g, '$1'));
    dbLines.push({ index, keywords: kw, code: m[2] ?? null });
  });

  const created: string[] = [];
  const updated: string[] = [];
  const conflicts: string[] = [];
  const newLines: string[] = [];

  for (const e of entries) {
    if (SKIP_DB_CODES.has(e.code)) continue;
    const en = e.description_en;
    const fr = cache.fr[en];
    const ko = cache.ko[en];
    if (!fr || !ko) throw new Error(`Traduction FR/KO manquante pour « ${e.name} » (${e.code})`);

    const wanted = new Set(e.keywords.map(normalize));
    const matches = dbLines.filter(
      (l) => (l.code !== null && l.code.toLowerCase() === e.code.toLowerCase()) || l.keywords.some((k) => wanted.has(normalize(k))),
    );

    const build = (keywords: string[]): string =>
      `  { keywords: [${keywords.map(q).join(', ')}], code: ${q(e.code)}, risk: ${q(RISK_BY_BADGE[e.badge])}, ` +
      `circ: ${q(e.circ)}, note: ${q(fr)}, noteEn: ${q(en)}, noteKo: ${q(ko)}, fixed: true },`;

    if (matches.length === 0) {
      newLines.push(build([...e.keywords]));
      created.push(`${e.code} ${e.name} → ${e.badge}`);
      continue;
    }
    if (matches.length > 1) {
      conflicts.push(`${e.code} ${e.name} → ${matches.length} entrées existantes (lignes ${matches.map((m) => m.index + 1).join(', ')})`);
      continue;
    }
    const target = matches[0];
    const merged = [...target.keywords];
    for (const k of e.keywords) if (!merged.some((m) => normalize(m) === normalize(k))) merged.push(k);
    lines[target.index] = build(merged);
    updated.push(`${e.code} ${e.name} → ${e.badge} (ligne ${target.index + 1})`);
  }

  db = lines.join('\n');
  if (newLines.length > 0) {
    const marker = '] as const;\n\nexport const DANGER_PREGNANCY';
    const idx = db.lastIndexOf(marker);
    if (idx === -1) throw new Error('Marqueur introuvable dans ingredientsDatabase.ts');
    const block =
      '\n  // ═══════════════════════════════════════════════════════════════\n' +
      '  // LOT 11 — additifs E du document officiel (badge + description validés)\n' +
      '  // ═══════════════════════════════════════════════════════════════\n' +
      newLines.join('\n') +
      '\n';
    db = db.slice(0, idx) + block + db.slice(idx);
  }
  if (!DRY) fs.writeFileSync(DB_PATH, db, 'utf-8');

  console.log(`\nCréées : ${created.length}`);
  for (const c of created) console.log('  +', c);
  console.log(`\nMises à jour (badge/description alignés sur le document) : ${updated.length}`);
  for (const u of updated) console.log('  ↻', u);
  console.log(`\nConflits (plusieurs entrées, à traiter à la main) : ${conflicts.length}`);
  for (const c of conflicts) console.log('  !', c);
}

if (!MERGE_SOURCE && !APPLY_DB) console.log('Rien à faire : passez --merge-source et/ou --apply-db.');
