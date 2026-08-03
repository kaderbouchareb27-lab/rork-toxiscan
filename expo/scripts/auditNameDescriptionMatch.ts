/**
 * Audit de l'ASSOCIATION nom d'ingrédient ↔ description.
 * Usage : bun run scripts/auditNameDescriptionMatch.ts   (cwd = expo/)
 *
 * Rejoue la résolution du scanner (utils/api.ts) SANS dépendance React Native :
 *   1. lookup du nom dans la base (mot-clé le plus long, substance nommée > famille générique) ;
 *   2. description officielle par nom, par code E, puis par mot-clé canonique de l'entrée.
 *
 * Il vérifie ensuite que chaque nom testé reçoit BIEN sa propre description
 * (et pas celle d'un ingrédient voisin), et signale toute clé officielle qui
 * pointerait vers un texte écrit pour une AUTRE forme physique
 * (protéine / amidon / farine / poudre / huile / lait / extrait…).
 */
import * as fs from 'fs';
import * as path from 'path';
import { OFFICIAL_DESCRIPTION_KEYS, OFFICIAL_DESCRIPTION_TEXTS } from '../constants/officialDescriptions';

const ROOT = process.cwd();
let failures = 0;

function check(label: string, ok: boolean, detail?: string): void {
  if (ok) console.log('  ✓', label);
  else {
    failures++;
    console.error('  ✗', label, detail ? '— ' + detail : '');
  }
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

interface Entry {
  keywords: string[];
  code: string | null;
  risk: string;
}

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

const dbSrc = fs.readFileSync(path.join(ROOT, 'constants', 'ingredientsDatabase.ts'), 'utf-8');
const entries: Entry[] = [];
{
  const re = /\{\s*keywords:\s*\[([^\]]*)\]\s*,\s*code:\s*(?:'([^']*)'|"([^"]*)"|null)\s*,\s*risk:\s*'([a-z]+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(dbSrc)) !== null) {
    entries.push({ keywords: parseQuotedList(m[1]), code: m[2] ?? m[3] ?? null, risk: m[4] });
  }
}

const GENERIC_CATEGORY_KEYWORDS = new Set(
  [
    'colorant', 'colorants', 'colorant alimentaire', 'colorants alimentaires', 'colouring', 'colourings',
    'coloring', 'colorings', 'food colouring', 'food coloring', 'artificial colour', 'artificial color',
    'artificial colours', 'artificial colors', 'added colour', 'added color', 'colour added', 'color added',
    'conservateur', 'conservateurs', 'preservative', 'preservatives',
    'emulsifiant', 'emulsifiants', 'emulsifier', 'emulsifiers',
    'epaississant', 'epaississants', 'thickener', 'thickeners',
    'stabilisant', 'stabilisants', 'stabilizer', 'stabiliser', 'stabilizers',
    'antioxydant', 'antioxydants', 'antioxidant', 'antioxidants',
    'acidifiant', 'acidifiants', 'correcteur d acidite', 'acidity regulator', 'acidity regulators',
    'edulcorant', 'edulcorants', 'sweetener', 'sweeteners',
    'exhausteur de gout', 'flavour enhancer', 'flavor enhancer',
    'anti agglomerant', 'antiagglomerant', 'anticaking agent', 'anti caking agent',
    'gelifiant', 'gelifiants', 'gelling agent', 'humectant', 'agent de charge', 'agent d enrobage',
    'affermissant', 'additif', 'additifs', 'additive', 'additives',
  ].map(normalize),
);

const RISK_PRIORITY: Record<string, number> = { danger: 0, probable: 1, possible: 2, aucun: 3 };
const indexed: { key: string; entry: Entry }[] = [];
const exactIndex = new Map<string, Entry>();
for (const entry of entries) {
  for (const keyword of entry.keywords) {
    const key = normalize(keyword);
    if (!key) continue;
    const existing = exactIndex.get(key);
    if (!existing || RISK_PRIORITY[entry.risk] < RISK_PRIORITY[existing.risk]) exactIndex.set(key, entry);
    if (key.length >= 3) indexed.push({ key, entry });
  }
}
indexed.sort((a, b) => b.key.length - a.key.length);

function lookup(name: string): Entry | null {
  const normalized = normalize(name);
  const exact = exactIndex.get(normalized);
  if (exact) return exact;
  let best: Entry | null = null;
  let bestLen = 0;
  let bestKey = '';
  let bestRisk = 999;
  for (const { key, entry } of indexed) {
    if (best && key.length < bestLen) break;
    if (!normalized.includes(key)) continue;
    if (key.length > bestLen || (key.length === bestLen && RISK_PRIORITY[entry.risk] < bestRisk)) {
      best = entry;
      bestLen = key.length;
      bestKey = key;
      bestRisk = RISK_PRIORITY[entry.risk];
    }
  }
  if (best && GENERIC_CATEGORY_KEYWORDS.has(bestKey)) {
    for (const { key, entry } of indexed) {
      if (entry.code === null || key === bestKey || GENERIC_CATEGORY_KEYWORDS.has(key)) continue;
      if (normalized.includes(key)) return entry;
    }
  }
  return best;
}

function official(nameOrCode?: string | null): string | undefined {
  if (!nameOrCode) return undefined;
  const idx = OFFICIAL_DESCRIPTION_KEYS[normalize(String(nameOrCode).replace(/^en:/i, ''))];
  return idx === undefined ? undefined : OFFICIAL_DESCRIPTION_TEXTS[idx];
}

/** Same resolution order as officialDescriptionEnFor() in utils/api.ts. */
function resolveDescription(name: string): { entry: Entry | null; text: string | undefined } {
  const entry = lookup(name);
  const text =
    official(entry?.code) ?? official(name) ?? (entry ? official(entry.keywords[0]) ?? official(entry.code) : undefined);
  return { entry, text };
}

// ── 1. Les ingrédients ne doivent PAS partager la description d'un voisin ──
console.log("\n[1] Chaque nom reçoit SA propre description");

/** name → mot(s) qui DOIVENT figurer dans le texte servi (preuve que c'est le bon ingrédient). */
const MUST_CONTAIN: { name: string; expect: RegExp; forbid?: RegExp }[] = [
  { name: 'amidon de pomme de terre', expect: /potato/i, forbid: /wheat starch/i },
  { name: 'fécule de pomme de terre', expect: /potato/i, forbid: /wheat starch/i },
  { name: 'potato starch', expect: /potato/i, forbid: /wheat starch/i },
  { name: 'amidon de blé', expect: /wheat starch/i },
  { name: 'farine de riz', expect: /rice/i, forbid: /wheat/i },
  { name: 'protéine de blé', expect: /gluten/i, forbid: /wholemeal|whole wheat flour/i },
  { name: 'protéine de pois chiche', expect: /chickpea/i, forbid: /isolated from yellow peas/i },
  { name: 'protéine de pois', expect: /pea/i, forbid: /chickpea/i },
  { name: 'farine de pois', expect: /milled|flour/i, forbid: /isolated/i },
  { name: 'petit-lait en poudre', expect: /whey/i, forbid: /Milk dried at high temperature/i },
  { name: 'lait en poudre', expect: /milk/i, forbid: /whey/i },
  { name: 'nutriments extraits de brocoli', expect: /broccoli/i, forbid: /spinach/i },
  { name: "nutriments extraits d'épinard", expect: /spinach/i, forbid: /broccoli/i },
  { name: 'brocoli', expect: /broccoli/i, forbid: /spinach/i },
  { name: 'épinard', expect: /spinach/i, forbid: /broccoli/i },
  { name: 'chou', expect: /cabbage/i, forbid: /spinach/i },
  { name: 'farine de maïs', expect: /corn/i, forbid: /Cornstarch extracted/i },
  { name: 'fécule de maïs', expect: /cornstarch/i },
  { name: "poudre d'oignon", expect: /onion/i, forbid: /leek/i },
  { name: 'poireau', expect: /leek/i },
  { name: 'agar', expect: /seaweed|sea vegetable|agar/i, forbid: /shellfish/i },
  { name: 'fruit du moine', expect: /luo han guo|monk/i, forbid: /allulose|rare sugar found naturally in figs/i },
  { name: 'colorant annatto', expect: /achiote|annatto/i, forbid: /does not say which colourings/i },
];

for (const t of MUST_CONTAIN) {
  const { entry, text } = resolveDescription(t.name);
  const canonical = entry?.keywords[0] ?? '—';
  const ok = Boolean(text) && t.expect.test(text ?? '') && (!t.forbid || !t.forbid.test(text ?? ''));
  check(`« ${t.name} » → ${canonical}`, ok, text ? text.slice(0, 110) : 'aucune description officielle');
}

// ── 2. Badge attendu sur les cas signalés ──────────────────────
console.log('\n[2] Badges');
const BADGES: { name: string; risk: string }[] = [
  { name: 'colorant annatto', risk: 'possible' },
  { name: 'annatto', risk: 'possible' },
  { name: 'colorants', risk: 'probable' },
  { name: 'amidon de pomme de terre', risk: 'possible' },
  { name: 'petit-lait en poudre', risk: 'possible' },
  { name: 'brocoli', risk: 'aucun' },
];
for (const b of BADGES) {
  const entry = lookup(b.name);
  check(`« ${b.name} » → risk '${b.risk}'`, entry?.risk === b.risk, `obtenu : ${entry?.risk ?? 'aucune entrée'}`);
}

// ── 3. Aucune clé officielle ne décrit une AUTRE forme physique ─
console.log('\n[3] Formes physiques (protéine / amidon / farine / poudre / huile…)');
const FORM_WORDS: Record<string, string> = {
  proteine: 'protein', proteines: 'protein', protein: 'protein', proteins: 'protein',
  isolat: 'isolate', isolate: 'isolate', concentre: 'concentrate', concentrate: 'concentrate',
  amidon: 'starch', amidons: 'starch', starch: 'starch', fecule: 'starch',
  farine: 'flour', flour: 'flour', semoule: 'flour',
  poudre: 'powder', powder: 'powder', powdered: 'powder',
  huile: 'oil', oil: 'oil', beurre: 'butter', butter: 'butter',
  lait: 'milk', milk: 'milk', creme: 'cream', cream: 'cream',
  sirop: 'syrup', syrup: 'syrup', jus: 'juice', juice: 'juice',
  extrait: 'extract', extract: 'extract', fibre: 'fibre', fibres: 'fibre', fiber: 'fibre',
  hydrolysat: 'hydrolysate', hydrolyzed: 'hydrolysate',
  graisse: 'fat', graisses: 'fat', fat: 'fat',
  nutriments: 'nutrients', nutrients: 'nutrients',
};
function formSignature(key: string): string {
  const forms = new Set<string>();
  for (const word of key.split(' ')) {
    const form = FORM_WORDS[word];
    if (form) forms.add(form);
  }
  return [...forms].sort().join('+');
}
const source = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts', 'officialDescriptionsSource.json'), 'utf-8'),
) as { descriptions: { name: string; description_en: string }[] };
const textToNames = new Map<string, string[]>();
for (const d of source.descriptions) {
  const list = textToNames.get(d.description_en) ?? [];
  list.push(d.name);
  textToNames.set(d.description_en, list);
}
const formConflicts: string[] = [];
for (const [key, idx] of Object.entries(OFFICIAL_DESCRIPTION_KEYS)) {
  const names = textToNames.get(OFFICIAL_DESCRIPTION_TEXTS[idx]) ?? [];
  const keyForm = formSignature(key);
  if (names.some((n) => formSignature(normalize(n)) === keyForm)) continue;
  formConflicts.push(`${key} → ${names[0]}`);
}
check('0 clé officielle servant une autre forme physique', formConflicts.length === 0, formConflicts.slice(0, 15).join(' | '));

console.log(failures === 0 ? '\n✅ Associations correctes\n' : `\n❌ ${failures} association(s) incorrecte(s)\n`);
process.exit(failures === 0 ? 0 : 1);
