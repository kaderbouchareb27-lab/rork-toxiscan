/**
 * APPLIQUE le lot de corrections vérifiées (scripts/verifiedCorrections.json) à la base :
 *
 *  • constants/ingredientsDatabase.ts  → badge (risk/circ), mots-clés, notes EN/FR/KO ;
 *  • scripts/officialDescriptionsSource.json → la fiche officielle affichée dans l'app.
 *
 * Actions supportées (champ `_action` du lot) :
 *   REPLACE  écrase l'entrée existante portant ce `name`
 *   ADD      crée une nouvelle entrée
 *   SPLIT    crée une nouvelle entrée et retire ses alias de l'entrée parente
 *   DELETE   supprime l'entrée
 *
 * RÈGLE D'APPARIEMENT (cause racine du bug historique « description d'un autre
 * ingrédient ») : un mot-clé n'appartient qu'à UNE entrée. Les revendications du lot
 * sont prioritaires ; tout mot-clé revendiqué est retiré des autres entrées, et une
 * entrée qui perd tous ses mots-clés est supprimée (doublon absorbé). Une fiche d'alias
 * qui contredirait le nouveau badge (ou qui appartient à une entrée supprimée) est retirée ;
 * une fiche d'alias cohérente et plus spécifique (« sardine » sous « saumon sauvage ») est
 * conservée, et le code E d'une entrée reçoit toujours le texte corrigé.
 *
 * Le script est IDEMPOTENT et se relance : au 2ᵉ passage (après
 * scripts/translateOfficialDescriptions.ts) il complète `note` (FR) et `noteKo` depuis
 * le cache de traduction.
 *
 * Usage : bun run scripts/applyVerifiedCorrections.ts            (cwd = expo/)
 *         bun run scripts/applyVerifiedCorrections.ts --dry      (simulation)
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, 'constants', 'ingredientsDatabase.ts');
const CORRECTIONS_PATH = path.join(ROOT, 'scripts', 'verifiedCorrections.json');
const SOURCE_PATH = path.join(ROOT, 'scripts', 'officialDescriptionsSource.json');
const TRANSLATIONS_PATH = path.join(ROOT, 'scripts', 'officialDescriptionsTranslations.json');
const REPORT_PATH = path.join(ROOT, 'scripts', 'verifiedCorrectionsReport.json');

const DRY_RUN = process.argv.includes('--dry');
/** Lot marker: these texts are imposed by the product owner and displayed verbatim. */
const LOT = '14-verified';

type Action = 'REPLACE' | 'ADD' | 'DELETE' | 'SPLIT';
type Badge = 'Approved' | 'Occasional' | 'Processed' | 'Ultra toxic' | 'Carcinogenic';
type Risk = 'aucun' | 'possible' | 'probable' | 'danger';

interface Correction {
  readonly _action: Action;
  readonly _priority: string;
  readonly _reason: string;
  readonly _source?: string;
  readonly name: string;
  readonly description_en?: string;
  readonly badge?: Badge;
  readonly risk?: Risk;
  readonly aliases?: readonly string[];
}

interface SourceDescription {
  name: string;
  description_en: string;
  badge: string;
  lot: string;
}

/** Same normalization as normalizeForLookup in utils/api.ts. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function quote(value: string): string {
  return "'" + value.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function parseQuotedList(raw: string): string[] {
  const out: string[] = [];
  const re = /'((?:[^'\\]|\\.)*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) out.push(m[1].replace(/\\(['\\])/g, '$1'));
  return out;
}

// ── 1) Lecture de la base ──────────────────────────────────────────
interface DbEntry {
  line: number;
  keywords: string[];
  code: string | null;
  risk: Risk;
  circ: string;
  note: string;
  deleted: boolean;
  rewritten: boolean;
}

const dbLines = fs.readFileSync(DB_PATH, 'utf-8').split('\n');
const ENTRY_RE = /^(\s*)\{ keywords: \[(.*?)\], code: (null|'(?:[^'\\]|\\.)*'), risk: '(\w+)', circ: '((?:[^'\\]|\\.)*)'/;
const NOTE_RE = /, note: '((?:[^'\\]|\\.)*)'/;

const entries: DbEntry[] = [];
for (let i = 0; i < dbLines.length; i++) {
  const m = ENTRY_RE.exec(dbLines[i]);
  if (!m) continue;
  const codeRaw = m[3];
  const noteMatch = NOTE_RE.exec(dbLines[i]);
  entries.push({
    line: i,
    keywords: parseQuotedList(m[2]),
    code: codeRaw === 'null' ? null : codeRaw.slice(1, -1).replace(/\\(['\\])/g, '$1'),
    risk: m[4] as Risk,
    circ: m[5].replace(/\\(['\\])/g, '$1'),
    note: noteMatch ? noteMatch[1].replace(/\\(['\\])/g, '$1') : '',
    deleted: false,
    rewritten: false,
  });
}
if (entries.length === 0) throw new Error('Aucune entrée parsée dans ingredientsDatabase.ts');

const corrections = (JSON.parse(fs.readFileSync(CORRECTIONS_PATH, 'utf-8')) as { corrections: Correction[] }).corrections;

// ── 2) Propriété des mots-clés : une revendication = une seule entrée ──
/** normalized keyword → index of the correction owning it. */
const owner = new Map<string, number>();
const report: string[] = [];

function claim(index: number, keywords: readonly string[]): string[] {
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const keyword of keywords) {
    const key = normalize(keyword);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const existing = owner.get(key);
    if (existing !== undefined && existing !== index) {
      report.push(
        `mot-clé « ${keyword} » revendiqué par « ${corrections[index].name} » → conservé pour « ${corrections[existing].name} » (entrée plus spécifique)`,
      );
      continue;
    }
    owner.set(key, index);
    kept.push(keyword);
  }
  return kept;
}

/** Final keyword list per correction (index-aligned with `corrections`). */
const claimedKeywords = new Map<number, string[]>();
// Pass A — the NEW dedicated entries claim first (« riz blanc » owns « riz »/« rice »).
corrections.forEach((c, i) => {
  if (c._action !== 'ADD' && c._action !== 'SPLIT') return;
  claimedKeywords.set(i, claim(i, [c.name, ...(c.aliases ?? [])]));
});
// Pass B — the corrected existing entries take what is left.
corrections.forEach((c, i) => {
  if (c._action !== 'REPLACE') return;
  claimedKeywords.set(i, claim(i, [c.name, ...(c.aliases ?? [])]));
});

// ── 3) Résolution de l'entrée cible ────────────────────────────────
function byHead(name: string): DbEntry | undefined {
  const key = normalize(name);
  return entries.find((e) => !e.deleted && normalize(e.keywords[0] ?? '') === key);
}

/**
 * The database entry a correction must rewrite. The head is tried first (so re-running the
 * script updates the SAME entry instead of creating a duplicate), then the correction name.
 * An alias match is only accepted for REPLACE and only when that entry's head is not owned
 * by another correction — otherwise « riz » would overwrite the new « riz blanc » entry.
 */
function findTarget(correction: Correction, index: number, head: string): DbEntry | undefined {
  const direct = byHead(head) ?? byHead(correction.name);
  if (direct) return direct;
  if (correction._action !== 'REPLACE') return undefined;
  const key = normalize(correction.name);
  return entries.find((e) => {
    if (e.deleted || !e.keywords.some((k) => normalize(k) === key)) return false;
    const entryOwner = owner.get(normalize(e.keywords[0] ?? ''));
    return entryOwner === undefined || entryOwner === index;
  });
}

/**
 * Keywords used by the OTHER databases (cosmetics, additives) under a different head.
 * A description written for such a head spreads onto every keyword of that entry, so a
 * corrected alias listed there needs a fiche filed under its OWN name to win the lookup.
 */
function foreignKeywords(): Set<string> {
  const keys = new Set<string>();
  const cosmetics = fs.readFileSync(path.join(ROOT, 'constants', 'cosmeticsDatabase.ts'), 'utf-8');
  const re = /keywords: \[([^\]]*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cosmetics)) !== null) {
    for (const keyword of parseQuotedList(m[1])) keys.add(normalize(keyword));
  }
  const additives = fs.readFileSync(path.join(ROOT, 'constants', 'additives.ts'), 'utf-8');
  const nameRe = /name: '((?:[^'\\]|\\.)*)'/g;
  while ((m = nameRe.exec(additives)) !== null) keys.add(normalize(m[1].replace(/\\(['\\])/g, '$1')));
  return keys;
}
const FOREIGN_KEYWORDS = foreignKeywords();

/**
 * Priorities where the corrected text REPLACES every alias fiche, even a coherent one:
 * these lots carry a safety warning or fix a factual claim, so an older alias sheet that
 * omits it (« bamboo shoots » without the boiling warning) must not survive.
 */
const OVERRIDE_PRIORITIES: ReadonlySet<string> = new Set([
  'SAFETY',
  'FACTUAL ERROR',
  'MISLEADING',
  'INTERNAL CONTRADICTION',
  'WEAK CLAIM',
]);

const E_CODE_RE = /^e\s?(\d{3,4})\s?([a-z]{0,2})$/;
function eCodeFrom(keywords: readonly string[]): string | null {
  for (const keyword of keywords) {
    const m = E_CODE_RE.exec(normalize(keyword));
    if (m) return 'E' + m[1] + m[2];
  }
  return null;
}

const DEFAULT_CIRC: Readonly<Record<Badge, string>> = {
  Approved: 'Naturel',
  Occasional: 'À consommer avec modération',
  Processed: 'Transformé',
  'Ultra toxic': 'Ultra toxique',
  Carcinogenic: 'Groupe 1',
};

function badgeOf(risk: Risk, circ: string): Badge {
  if (risk === 'aucun') return 'Approved';
  if (risk === 'possible') return 'Occasional';
  if (risk === 'probable') return 'Processed';
  return normalize(circ).includes('groupe 1') ? 'Carcinogenic' : 'Ultra toxic';
}

/**
 * Classifications a `circ` value imposes, mirroring scripts/auditIngredientCoherence.ts:
 * « Naturel » means a raw food (green only), « Ultra-transformé » is orange minimum, and
 * « Ultra toxique » is the sentinel reserved for the ULTRA TOXIC tier.
 */
const CIRC_CONSTRAINTS: readonly { readonly match: RegExp; readonly allowed: readonly Risk[] }[] = [
  { match: /^Groupe 1( |$|\()/, allowed: ['danger'] },
  { match: /^Groupe 2A/, allowed: ['probable', 'danger'] },
  { match: /^Groupe 2B/, allowed: ['possible', 'probable', 'danger'] },
  { match: /^Ultra toxique$/, allowed: ['danger'] },
  { match: /^Naturel$/, allowed: ['aucun'] },
  { match: /^Ultra-transformé$/, allowed: ['probable', 'danger'] },
  { match: /^Interdit UE/, allowed: ['danger', 'probable'] },
  { match: /^Toxique avéré$/, allowed: ['danger'] },
  { match: /^Perturbateur endocrinien$/, allowed: ['danger', 'probable'] },
];

function circAllows(circ: string, risk: Risk): boolean {
  return CIRC_CONSTRAINTS.every((rule) => !rule.match.test(circ) || rule.allowed.includes(risk));
}

/**
 * `circ` compatible with the requested badge: the existing (often more informative) value
 * is kept when it still matches the new risk level, otherwise the tier default is used.
 * Ultra toxic always gets the exact sentinel read by the verdict engine, and a natural food
 * moved to Occasional becomes « Naturel — à modérer » rather than plain « Naturel ».
 */
function circFor(badge: Badge, risk: Risk, existing: string | null): string {
  if (badge === 'Ultra toxic') return DEFAULT_CIRC['Ultra toxic'];
  if (existing === 'Naturel' && risk === 'possible') return 'Naturel — à modérer';
  if (existing && badgeOf(risk, existing) === badge && circAllows(existing, risk)) return existing;
  return DEFAULT_CIRC[badge];
}

// ── 4) Traductions figées (2ᵉ passage) ─────────────────────────────
type Lang = 'fr' | 'ko';
type TranslationCache = Record<Lang, Record<string, string>>;
const translations: TranslationCache = fs.existsSync(TRANSLATIONS_PATH)
  ? (() => {
      const raw = JSON.parse(fs.readFileSync(TRANSLATIONS_PATH, 'utf-8')) as Partial<TranslationCache>;
      return { fr: raw.fr ?? {}, ko: raw.ko ?? {} };
    })()
  : { fr: {}, ko: {} };

// ── 5) Écriture des entrées ────────────────────────────────────────
function entryLine(indent: string, keywords: readonly string[], code: string | null, risk: Risk, circ: string, en: string): string {
  const fr = translations.fr[en] ?? '';
  const ko = translations.ko[en] ?? '';
  const parts = [
    `keywords: [${keywords.map(quote).join(', ')}]`,
    `code: ${code ? quote(code) : 'null'}`,
    `risk: ${quote(risk)}`,
    `circ: ${quote(circ)}`,
    `note: ${quote(fr || en)}`,
    `noteEn: ${quote(en)}`,
  ];
  if (ko) parts.push(`noteKo: ${quote(ko)}`);
  parts.push('fixed: true');
  return `${indent}{ ${parts.join(', ')} },`;
}

const INDENT = '  ';
const created: string[] = [];
const updated: string[] = [];
const removed: string[] = [];
/** head name of every correction, used to file the official fiche. */
const ficheByName = new Map<string, { description: string; badge: Badge }>();
/** Alias → badge of the corrected entry it now belongs to (fiche coherence check). */
const aliasBadge = new Map<string, Badge>();

corrections.forEach((c, i) => {
  if (c._action === 'DELETE') {
    const target = byHead(c.name) ?? entries.find((e) => !e.deleted && e.keywords.some((k) => normalize(k) === normalize(c.name)));
    if (!target) {
      report.push(`DELETE « ${c.name} » : entrée introuvable (déjà supprimée ?)`);
      return;
    }
    const orphans = target.keywords.filter((k) => !owner.has(normalize(k)));
    if (orphans.length > 0) report.push(`DELETE « ${c.name} » : mots-clés non repris ailleurs → ${orphans.join(', ')}`);
    target.deleted = true;
    removed.push(target.keywords[0]);
    return;
  }

  const claimed = claimedKeywords.get(i) ?? [];
  const badge = c.badge as Badge;
  const risk = c.risk as Risk;
  const description = (c.description_en ?? '').trim();
  if (claimed.length === 0 || !badge || !risk || !description) {
    report.push(`⚠️ correction « ${c.name} » incomplète (mots-clés/badge/risk/description) — ignorée`);
    return;
  }

  const head = claimed[0];
  const target = findTarget(c, i, head);

  // The correction's alias list is authoritative, but the aliases ALREADY in the database
  // that no other correction claims are kept — a lot never lists the Korean or accented
  // spellings, and dropping them would silently stop the scanner recognising them.
  const keywords = [...claimed];
  const seen = new Set(claimed.map(normalize));
  const inherited: string[] = [];
  for (const keyword of target?.keywords ?? []) {
    const key = normalize(keyword);
    if (!key || seen.has(key)) continue;
    const claimant = owner.get(key);
    if (claimant !== undefined && claimant !== i) continue;
    seen.add(key);
    keywords.push(keyword);
    inherited.push(keyword);
  }
  if (inherited.length > 0) report.push(`« ${head} » : alias existants conservés → ${inherited.join(', ')}`);

  if (normalize(head) !== normalize(c.name)) {
    report.push(`« ${c.name} » : tête d'entrée déplacée sur « ${head} » (le nom générique appartient à une entrée dédiée)`);
  }
  ficheByName.set(normalize(head), { description, badge });
  for (const keyword of keywords.slice(1)) {
    const key = normalize(keyword);
    // An E-code IS the substance: its fiche must carry the corrected text, otherwise the
    // code lookup (tried BEFORE the name in utils/api.ts) keeps serving the old claim.
    // Same for an alias also listed in the cosmetics/additives databases: without its own
    // fiche it would inherit the description of THEIR entry head.
    if (E_CODE_RE.test(key) || FOREIGN_KEYWORDS.has(key) || OVERRIDE_PRIORITIES.has(c._priority)) {
      ficheByName.set(key, { description, badge });
    } else {
      aliasBadge.set(key, badge);
    }
  }

  if (c._action === 'REPLACE' && !target) report.push(`REPLACE « ${c.name} » : entrée absente → créée`);

  // An inherited E-code is dropped when ANOTHER entry lists it as a keyword: the code is
  // looked up before the name, so sharing E322 made sunflower lecithin serve the soy fiche.
  const inheritedCode = target?.code ?? null;
  const codeKey = normalize(inheritedCode ?? '');
  const codeIsShared =
    codeKey.length > 0 &&
    !keywords.some((k) => normalize(k) === codeKey) &&
    entries.some((e) => e !== target && !e.deleted && e.keywords.some((k) => normalize(k) === codeKey));
  if (codeIsShared) report.push(`« ${head} » : code ${inheritedCode} retiré (déjà porté par une autre entrée)`);
  const code = eCodeFrom(keywords) ?? (codeIsShared ? null : inheritedCode);
  const circ = circFor(badge, risk, target?.circ ?? null);
  const line = entryLine(INDENT, keywords, code, risk, circ, description);

  if (target) {
    dbLines[target.line] = line;
    target.keywords = [...keywords];
    target.risk = risk;
    target.circ = circ;
    target.rewritten = true;
    updated.push(head);
  } else {
    created.push(line);
    entries.push({ line: -1, keywords: [...keywords], code, risk, circ, note: '', deleted: false, rewritten: true });
  }
});

// ── 6) Un mot-clé = une seule entrée : nettoyage des autres entrées ─
for (const entry of entries) {
  if (entry.deleted || entry.rewritten || entry.line < 0) continue;
  const kept = entry.keywords.filter((k) => !owner.has(normalize(k)));
  if (kept.length === entry.keywords.length) continue;
  const lost = entry.keywords.filter((k) => owner.has(normalize(k)));
  if (kept.length === 0) {
    entry.deleted = true;
    removed.push(entry.keywords[0]);
    report.push(`entrée « ${entry.keywords[0] } » supprimée : tous ses mots-clés sont repris par les entrées corrigées`);
    continue;
  }
  report.push(`entrée « ${entry.keywords[0]} » : mots-clés retirés (repris ailleurs) → ${lost.join(', ')}`);
  dbLines[entry.line] = dbLines[entry.line].replace(
    ENTRY_RE,
    (_full, indent: string) => `${indent}{ keywords: [${kept.map(quote).join(', ')}], code: ${entry.code ? quote(entry.code) : 'null'}, risk: ${quote(entry.risk)}, circ: ${quote(entry.circ)}`,
  );
  entry.keywords = kept;
}

// ── 7) Émission du fichier base ────────────────────────────────────
const deletedLines = new Set(entries.filter((e) => e.deleted && e.line >= 0).map((e) => e.line));
const outLines: string[] = [];
for (let i = 0; i < dbLines.length; i++) {
  if (deletedLines.has(i)) continue;
  outLines.push(dbLines[i]);
}
if (created.length > 0) {
  const openIndex = outLines.findIndex((l) => l.includes('export const INGREDIENTS_DATABASE'));
  const closingOffset = outLines.slice(openIndex + 1).findIndex((l) => /^\]( as const)?;\s*$/.test(l));
  if (openIndex === -1 || closingOffset === -1) throw new Error('Fin du tableau INGREDIENTS_DATABASE introuvable');
  const closingIndex = openIndex + 1 + closingOffset;
  const banner = [
    '',
    '  // ═══════════════════════════════════════════════════════════════',
    '  // LOT VÉRIFIÉ ' + LOT + ' — entrées ajoutées / dégroupées (scripts/verifiedCorrections.json)',
    '  // ═══════════════════════════════════════════════════════════════',
  ];
  outLines.splice(closingIndex, 0, ...banner, ...created);
}

// ── 8) Fiches officielles ──────────────────────────────────────────
const source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf-8')) as { descriptions: SourceDescription[] };
const byName = new Map<string, SourceDescription>();
for (const d of source.descriptions) byName.set(normalize(d.name), d);

let ficheAdded = 0;
let ficheUpdated = 0;
for (const [name, { description, badge }] of ficheByName) {
  const existing = byName.get(name);
  if (existing) {
    existing.description_en = description;
    existing.badge = badge;
    existing.lot = LOT;
    ficheUpdated++;
  } else {
    const fiche: SourceDescription = { name, description_en: description, badge, lot: LOT };
    source.descriptions.push(fiche);
    byName.set(name, fiche);
    ficheAdded++;
  }
}

/** Every keyword still present in the database after the corrections. */
const liveKeywords = new Set<string>();
for (const entry of entries) {
  if (entry.deleted) continue;
  for (const keyword of entry.keywords) liveKeywords.add(normalize(keyword));
}

// Stale fiches are dropped: an alias fiche whose badge contradicts the corrected entry
// (« sucre de coco » green while the entry is now Occasional) and any fiche left over from
// a deleted entry. A coherent, more specific alias fiche (« sardine ») is kept.
const shadowed: string[] = [];
source.descriptions = source.descriptions.filter((d) => {
  const key = normalize(d.name);
  if (ficheByName.has(key)) return true;
  const badge = aliasBadge.get(key);
  if (badge !== undefined && d.badge !== badge) {
    shadowed.push(`${d.name} (${d.badge} → ${badge})`);
    return false;
  }
  if (!liveKeywords.has(key) && removed.some((head) => normalize(head) === key)) {
    shadowed.push(`${d.name} (entrée supprimée)`);
    return false;
  }
  return true;
});
source.descriptions.sort((a, b) => a.name.localeCompare(b.name, 'en'));

// ── 9) Écriture ────────────────────────────────────────────────────
if (!DRY_RUN) {
  fs.writeFileSync(DB_PATH, outLines.join('\n'), 'utf-8');
  fs.writeFileSync(SOURCE_PATH, JSON.stringify(source), 'utf-8');
  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify({ lot: LOT, created: created.length, updated: updated.length, removed, shadowed, notes: report }, null, 2),
    'utf-8',
  );
}

console.log(DRY_RUN ? '— SIMULATION (aucune écriture) —' : '— APPLIQUÉ —');
console.log('Corrections lues        :', corrections.length);
console.log('Entrées mises à jour    :', updated.length);
console.log('Entrées créées          :', created.length);
console.log('Entrées supprimées      :', removed.length, removed.length > 0 ? `(${removed.join(', ')})` : '');
console.log('Fiches officielles      :', ficheAdded, 'ajoutées •', ficheUpdated, 'mises à jour •', shadowed.length, 'obsolètes retirées');
console.log('Traductions disponibles :', Object.keys(translations.fr).length, 'FR •', Object.keys(translations.ko).length, 'KO');
if (report.length > 0) {
  console.log('\n— Journal —');
  for (const line of report) console.log('  •', line);
}
if (!DRY_RUN) console.log('\nRapport :', REPORT_PATH);
