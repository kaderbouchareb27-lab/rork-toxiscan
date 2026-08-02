import * as fs from 'fs';
import * as path from 'path';

// ── Lecture des fichiers source (sans import RN) ───────────────
const DB_DIR = path.join(process.cwd(), 'constants');

function readSource(file: string): string {
  return fs.readFileSync(path.join(DB_DIR, file), 'utf-8');
}

// ── Parse ingredientsDatabase.ts ───────────────────────────────
// On extrait chaque objet { keywords: [...], code: ..., risk: ..., circ: ... }
interface ParsedEntry {
  keywords: string[];
  code: string | null;
  risk: string;
  circ: string;
}

function parseIngredientsDatabase(src: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  // Match each object literal inside INGREDIENTS_DATABASE
  // We look for { keywords: [...], code: ..., risk: '...', circ: '...' }
  const objRegex = /\{\s*keywords:\s*\[([^\]]*)\]\s*,\s*code:\s*(?:'([^']*)'|"([^"]*)"|null)\s*,\s*risk:\s*'([^']*)'\s*,\s*circ:\s*'([^']*)'/g;
  let match: RegExpExecArray | null;
  while ((match = objRegex.exec(src)) !== null) {
    const keywordsRaw = match[1];
    const code = match[2] ?? match[3] ?? null;
    const risk = match[4];
    const circ = match[5];
    // Parse keywords array — each item is '...' or "..."
    const kwRegex = /'([^']*)'|"([^"]*)"/g;
    const keywords: string[] = [];
    let kwMatch: RegExpExecArray | null;
    while ((kwMatch = kwRegex.exec(keywordsRaw)) !== null) {
      keywords.push(kwMatch[1] ?? kwMatch[2]);
    }
    entries.push({ keywords, code, risk, circ });
  }
  return entries;
}

// ── Parse additives.ts ─────────────────────────────────────────
interface ParsedAdditive {
  code: string;
  name: string;
  group: string;
}

function parseAdditives(src: string): ParsedAdditive[] {
  const entries: ParsedAdditive[] = [];
  // Match: { code: '...', name: '...', group: '...', ... }
  // Some entries span multiple lines, so we use a multiline-aware regex
  const objRegex = /\{\s*code:\s*'([^']*)'\s*,\s*name:\s*'([^']*)'\s*,\s*group:\s*'([^']*)'/g;
  let match: RegExpExecArray | null;
  while ((match = objRegex.exec(src)) !== null) {
    entries.push({ code: match[1], name: match[2], group: match[3] });
  }
  return entries;
}

// ── Parse ultraToxicIngredients.ts ─────────────────────────────
interface ParsedUltraToxic {
  code: string | null;
  keywords: string[];
}

function parseUltraToxic(src: string): ParsedUltraToxic[] {
  const entries: ParsedUltraToxic[] = [];
  const objRegex = /\{\s*id:\s*'[^']*'\s*,\s*code:\s*(?:'([^']*)'|"([^"]*)"|null)\s*,\s*keywords:\s*\[([^\]]*)\]/g;
  let match: RegExpExecArray | null;
  while ((match = objRegex.exec(src)) !== null) {
    const code = match[1] ?? match[2] ?? null;
    const keywordsRaw = match[3];
    const kwRegex = /'([^']*)'|"([^"]*)"/g;
    const keywords: string[] = [];
    let kwMatch: RegExpExecArray | null;
    while ((kwMatch = kwRegex.exec(keywordsRaw)) !== null) {
      keywords.push(kwMatch[1] ?? kwMatch[2]);
    }
    entries.push({ code, keywords });
  }
  return entries;
}

// ── Badge mapping ──────────────────────────────────────────────
function riskToBadge(risk: string, circ: string): string {
  if (risk === 'danger') {
    return circ === 'Ultra toxique' ? 'Ultra toxic' : 'Carcinogenic';
  }
  if (risk === 'probable') return 'Processed';
  if (risk === 'possible') return 'Occasional';
  return 'Approved';
}

function groupToBadge(group: string): string {
  switch (group) {
    case 'group1': return 'Carcinogenic';
    case 'group2a': return 'Processed';
    case 'group2b': return 'Occasional';
    default: return 'Approved';
  }
}

function normalizeECode(code: string | null): string | null {
  if (!code) return null;
  const match = code.match(/e\d+/i);
  return match ? match[0].toUpperCase() : null;
}

// ── Build export entries ───────────────────────────────────────
interface ExportEntry {
  name: string;
  aliases: string[];
  badge: string;
  eNumber: string | null;
}

const entries: ExportEntry[] = [];
const seenByCode = new Set<string>();

function normalizeKey(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function addEntry(name: string, aliases: string[], badge: string, eNumber: string | null) {
  const normCode = normalizeECode(eNumber);

  // 1) Dedup par E-code : si on a déjà ce code, on fusionne les alias dans l'entrée existante
  if (normCode) {
    const existing = entries.find((e) => e.eNumber === normCode);
    if (existing) {
      const existingKeys = new Set(existing.aliases.map(normalizeKey));
      for (const a of aliases) {
        if (!existingKeys.has(normalizeKey(a))) existing.aliases.push(a);
      }
      return;
    }
    seenByCode.add(normCode);
  }

  // 2) Dedup par nom/alias : si le nom principal ou un alias matche une entrée existante, on fusionne
  const normName = normalizeKey(name);
  for (const existing of entries) {
    const existingKeys = new Set([normalizeKey(existing.name), ...existing.aliases.map(normalizeKey)]);
    const newKeys = [normName, ...aliases.map(normalizeKey)];
    if (newKeys.some((k) => existingKeys.has(k))) {
      for (const a of aliases) {
        if (!existingKeys.has(normalizeKey(a))) existing.aliases.push(a);
      }
      return;
    }
  }

  entries.push({ name, aliases: [...new Set(aliases)], badge, eNumber: normCode });
}

// Priorité : ingredientsDatabase (la plus riche) en premier,
// puis ultraToxic (descriptions hardcodées prioritaires pour le badge),
// puis additives (legacy/barcode, souvent doublonnés).

// 1) ultraToxicIngredients.ts — en premier pour que le badge Ultra toxic gagne
const ultraSrc = readSource('ultraToxicIngredients.ts');
const parsedUltra = parseUltraToxic(ultraSrc);
for (const entry of parsedUltra) {
  addEntry(entry.keywords[0], [...entry.keywords], 'Ultra toxic', entry.code);
}

// 2) ingredientsDatabase.ts
const ingredientsSrc = readSource('ingredientsDatabase.ts');
const parsedIngredients = parseIngredientsDatabase(ingredientsSrc);
for (const entry of parsedIngredients) {
  const primaryName = entry.keywords[0];
  addEntry(primaryName, [...entry.keywords], riskToBadge(entry.risk, entry.circ), entry.code);
}

// 3) additives.ts
const additivesSrc = readSource('additives.ts');
const parsedAdditives = parseAdditives(additivesSrc);
for (const additive of parsedAdditives) {
  const eNumber = normalizeECode(additive.code);
  const aliases = [additive.name];
  if (eNumber) aliases.push(eNumber);
  if (!eNumber && additive.code) aliases.push(additive.code);
  addEntry(additive.name, aliases, groupToBadge(additive.group), eNumber ?? additive.code);
}

// ── Tri ────────────────────────────────────────────────────────
const badgeOrder: Record<string, number> = {
  'Carcinogenic': 0,
  'Ultra toxic': 1,
  'Processed': 2,
  'Occasional': 3,
  'Approved': 4,
};
entries.sort((a, b) => {
  const badgeDiff = (badgeOrder[a.badge] ?? 9) - (badgeOrder[b.badge] ?? 9);
  if (badgeDiff !== 0) return badgeDiff;
  return a.name.localeCompare(b.name);
});

// ── Export JSON ────────────────────────────────────────────────
const jsonOutput = {
  exportDate: new Date().toISOString(),
  totalEntries: entries.length,
  badgeLegend: {
    'Carcinogenic': 'Cancérigène avéré (Groupe 1 IARC) — rouge',
    'Ultra toxic': 'Ultra toxique / interdit dans plusieurs pays — bordeaux',
    'Processed': 'Ultra-transformé / nocif — orange',
    'Occasional': 'À consommer avec modération — jaune',
    'Approved': 'Approuvé / naturel sain — vert',
  },
  ingredients: entries,
};

const jsonPath = path.join(process.cwd(), 'ingredients_export.json');
fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2), 'utf-8');

// ── Export CSV ─────────────────────────────────────────────────
const csvHeader = 'name,aliases,badge,eNumber';
const escapeCsv = (s: string): string => {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};
const csvRows = entries.map((e) => {
  const name = escapeCsv(e.name);
  const aliases = escapeCsv(e.aliases.join('; '));
  const badge = escapeCsv(e.badge);
  const eNum = e.eNumber ? escapeCsv(e.eNumber) : '';
  return `${name},${aliases},${badge},${eNum}`;
});
const csvContent = [csvHeader, ...csvRows].join('\n');
const csvPath = path.join(process.cwd(), 'ingredients_export.csv');
fs.writeFileSync(csvPath, csvContent, 'utf-8');

// ── Stats ──────────────────────────────────────────────────────
const stats = entries.reduce((acc, e) => {
  acc[e.badge] = (acc[e.badge] ?? 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log(`Export terminé : ${entries.length} ingrédients uniques`);
console.log('Sources : ingredientsDatabase.ts, additives.ts, ultraToxicIngredients.ts');
console.log('Répartition par badge :');
for (const [badge, count] of Object.entries(stats)) {
  console.log(`  ${badge}: ${count}`);
}
console.log(`\nJSON : ${jsonPath}`);
console.log(`CSV  : ${csvPath}`);
