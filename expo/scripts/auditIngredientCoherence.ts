/**
 * AUDIT TOTAL de la base d'ingrédients.
 * Usage : bun run scripts/auditIngredientCoherence.ts   (cwd = expo/)
 *
 * Vérifie, pour CHAQUE entrée :
 *   [A] structure  — code ↔ mot-clé E, doublons de mots-clés, description présente ;
 *   [B] badge ↔ circ — la classification impose le niveau de risque ;
 *   [C] badge ↔ texte — la description ne doit pas contredire le badge ;
 *   [D] texte ↔ ingrédient — le code E cité doit être celui de l'entrée, et deux
 *       ingrédients différents ne doivent pas partager la même description ;
 *   [E] ULTRA TOXIC — les 9 additifs bannis doivent porter le bon badge.
 */
import * as fs from 'fs';
import * as path from 'path';
import { OFFICIAL_DESCRIPTION_KEYS, OFFICIAL_DESCRIPTION_TEXTS } from '../constants/officialDescriptions';

const ROOT = process.cwd();

interface Entry {
  line: number;
  keywords: string[];
  code: string | null;
  risk: 'danger' | 'probable' | 'possible' | 'aucun';
  circ: string;
  note: string;
  noteEn: string;
}

interface Issue {
  section: string;
  entry: string;
  detail: string;
}

const issues: Issue[] = [];
function flag(section: string, entry: string, detail: string): void {
  issues.push({ section, entry, detail });
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unquote(raw: string): string {
  return raw.replace(/\\(['"\\])/g, '$1');
}

function field(line: string, name: string): string | null {
  const re = new RegExp(`\\b${name}:\\s*'((?:\\\\.|[^'\\\\])*)'`);
  const m = re.exec(line);
  return m ? unquote(m[1]) : null;
}

// ── Parsing ────────────────────────────────────────────────────
const dbSrc = fs.readFileSync(path.join(ROOT, 'constants', 'ingredientsDatabase.ts'), 'utf-8');
const entries: Entry[] = [];
dbSrc.split('\n').forEach((line, i) => {
  if (!line.trim().startsWith('{ keywords:')) return;
  const kwRaw = /keywords:\s*\[([^\]]*)\]/.exec(line)?.[1] ?? '';
  const keywords: string[] = [];
  const kwRe = /'((?:\\.|[^'\\])*)'/g;
  let m: RegExpExecArray | null;
  while ((m = kwRe.exec(kwRaw)) !== null) keywords.push(unquote(m[1]));
  const riskRaw = field(line, 'risk');
  if (!riskRaw) return;
  entries.push({
    line: i + 1,
    keywords,
    code: field(line, 'code'),
    risk: riskRaw as Entry['risk'],
    circ: field(line, 'circ') ?? '',
    note: field(line, 'note') ?? '',
    noteEn: field(line, 'noteEn') ?? '',
  });
});

const label = (e: Entry): string => `${e.keywords[0]}${e.code ? ` (${e.code})` : ''} L${e.line}`;

/** Official English description served for an entry (by code, then by canonical keyword). */
function officialFor(e: Entry): string | undefined {
  for (const key of [e.code, ...e.keywords]) {
    if (!key) continue;
    const idx = OFFICIAL_DESCRIPTION_KEYS[normalize(key)];
    if (idx !== undefined) return OFFICIAL_DESCRIPTION_TEXTS[idx];
  }
  return undefined;
}

console.log(`\n📊 ${entries.length} entrées analysées\n`);

// ── [A] Structure ──────────────────────────────────────────────
// Un code E doit être trouvable par au moins UNE entrée (plusieurs entrées peuvent
// partager un code, ex. lécithine de soja / de tournesol = E322).
const ownedCodes = new Set<string>();
for (const e of entries) {
  for (const k of e.keywords) if (/^e\d/.test(normalize(k))) ownedCodes.add(normalize(k));
}
const seen = new Map<string, Entry>();
for (const e of entries) {
  if (e.code && /^e\d/i.test(e.code) && !ownedCodes.has(normalize(e.code))) {
    flag('A', label(e), `code ${e.code} introuvable par le nom "${e.code}" (aucune entrée ne le porte en mot-clé)`);
  }
  for (const k of e.keywords) {
    const key = normalize(k);
    if (!key) continue;
    const prev = seen.get(key);
    if (prev && prev !== e) {
      if (prev.risk !== e.risk) {
        flag('A', label(e), `mot-clé "${k}" déjà utilisé par ${label(prev)} avec un badge DIFFÉRENT (${prev.risk} vs ${e.risk})`);
      } else {
        flag('A', label(e), `mot-clé "${k}" dupliqué avec ${label(prev)}`);
      }
    } else if (!prev) seen.set(key, e);
  }
  if (!e.note && !officialFor(e)) flag('A', label(e), 'aucune description (ni note FR, ni officielle)');
  if (e.note && !e.noteEn) flag('A', label(e), 'note FR sans traduction EN');
}

/** Écarts assumés et documentés (le badge est volontairement différent de la lettre du texte). */
const JUSTIFIED: Record<string, string> = {
  hijiki: "le Groupe 1 concerne l'arsenic (contaminant), pas l'algue elle-même — badge orange assumé",
  mate: 'le Groupe 2A vise la boisson très chaude (> 65 °C), pas la plante — badge jaune assumé (moteur R17bis)',
  'viande rouge':
    'le Groupe 2A vise une consommation élevée ; la décision produit est « Occasionnel » (modération CIRC), pas un badge orange — lot vérifié',
};

// ── [B] Badge ↔ circ ───────────────────────────────────────────
const CIRC_RULES: { match: RegExp; allowed: Entry['risk'][]; why: string }[] = [
  { match: /^Groupe 1( |$|\()/, allowed: ['danger'], why: 'Groupe 1 CIRC = cancérigène avéré' },
  { match: /^Groupe 2A/, allowed: ['probable', 'danger'], why: 'Groupe 2A = probablement cancérigène' },
  { match: /^Groupe 2B/, allowed: ['possible', 'probable', 'danger'], why: 'Groupe 2B = possiblement cancérigène' },
  { match: /^Ultra toxique$/, allowed: ['danger'], why: 'ULTRA TOXIC = badge danger + sentinelle circ' },
  { match: /^Naturel$/, allowed: ['aucun'], why: 'Naturel = aliment brut' },
  { match: /^Ultra-transformé$/, allowed: ['probable', 'danger'], why: 'Ultra-transformé = badge orange minimum' },
  { match: /^Interdit UE/, allowed: ['danger', 'probable'], why: 'substance interdite' },
  { match: /^Toxique avéré$/, allowed: ['danger'], why: 'toxicité avérée' },
  { match: /^Perturbateur endocrinien$/, allowed: ['danger', 'probable'], why: 'perturbateur endocrinien' },
];
for (const e of entries) {
  for (const rule of CIRC_RULES) {
    if (!rule.match.test(e.circ)) continue;
    if (!rule.allowed.includes(e.risk)) {
      const justification = JUSTIFIED[normalize(e.keywords[0])];
      if (justification) {
        console.log(`   ℹ️  ${label(e)} — écart assumé : ${justification}`);
      } else {
        flag('B', label(e), `circ « ${e.circ} » (${rule.why}) mais badge '${e.risk}' — attendu ${rule.allowed.join('/')}`);
      }
    }
  }
}

// ── [C] Badge ↔ contenu de la description ──────────────────────
const CONTRADICTIONS: { risk: Entry['risk'][]; pattern: RegExp; why: string }[] = [
  {
    risk: ['aucun'],
    pattern: /cancerogene|cancerigene|carcinogen|groupe 1|group 1|groupe 2a|group 2a|interdit dans l ue|banned in the eu|perturbateur endocrinien|endocrine disruptor|ultra transforme|ultra processed/,
    why: 'badge VERT mais la description signale un risque avéré',
  },
  {
    risk: ['danger'],
    pattern: /aucun risque|sans danger|parfaitement sur|totalement sur|no health concern|no safety concern|completely safe|one of the most benign|bien tolere/,
    why: 'badge ROUGE mais la description dit que c’est sûr',
  },
  {
    risk: ['probable', 'possible'],
    pattern: /groupe 1 circ|iarc group 1|cancerogene avere|confirmed human carcinogen/,
    why: 'badge orange/jaune mais la description parle d’un cancérigène avéré (Groupe 1)',
  },
  {
    risk: ['possible'],
    pattern: /groupe 2a|group 2a|probablement cancerigene|probably carcinogenic/,
    why: 'badge JAUNE mais la description cite un classement Groupe 2A',
  },
];
/**
 * Une mention de risque peut être NIÉE (« ce n'est PAS un cancérogène avéré », « le CIRC a
 * retiré le café de sa liste »). On ignore alors la correspondance : seule une affirmation
 * compte comme contradiction.
 */
const NEGATION = /\b(pas|non|aucun|aucune|jamais|ni|sans|retire|retiree|exclut|contrairement|au meme titre que|plutot que|not|no|never|unlike|removed|rather than|does not|is not|are not)\b/;
function isNegated(haystack: string, index: number): boolean {
  const clauseStart = Math.max(0, haystack.lastIndexOf('.', index) + 1, haystack.lastIndexOf(',', index) + 1);
  const before = haystack.slice(clauseStart, index);
  const sentenceStart = Math.max(0, haystack.lastIndexOf('.', index) + 1);
  return NEGATION.test(before) || NEGATION.test(haystack.slice(sentenceStart, index));
}

/** [D] Fiches vérifiées qui citent volontairement la FAMILLE d'additifs plutôt que leur code. */
const JUSTIFIED_CODES: Record<string, string> = {
  'cire de carnauba': 'la fiche compare E903 à la cire de candelilla (E902) — conclusion EFSA commune',
  'd alpha tocopherol': "la fiche cite la réévaluation EFSA de la famille des tocophérols (E306-E309), dont E307a fait partie",
  'calcium sorbate': "la fiche cite l'ADI de groupe des sorbates (E200/E202), dont E203 a justement été exclu",
};

for (const e of entries) {
  const haystack = normalize(`${e.note} ${e.noteEn} ${officialFor(e) ?? ''}`);
  const justification = JUSTIFIED[normalize(e.keywords[0])];
  for (const c of CONTRADICTIONS) {
    if (!c.risk.includes(e.risk)) continue;
    c.pattern.lastIndex = 0;
    const hit = c.pattern.exec(haystack);
    if (!hit || isNegated(haystack, hit.index)) continue;
    if (justification) {
      console.log(`   ℹ️  ${label(e)} — écart assumé : ${justification}`);
      continue;
    }
    flag('C', label(e), `${c.why} — « …${hit[0]}… »`);
  }
}

// ── [D] Description ↔ ingrédient ───────────────────────────────
const codeInText = /\bE\s?(\d{3,4}[a-z]?)\b/gi;
for (const e of entries) {
  const cited = new Set<string>();
  let m: RegExpExecArray | null;
  const text = `${e.note} ${e.noteEn}`;
  codeInText.lastIndex = 0;
  while ((m = codeInText.exec(text)) !== null) cited.add(`e${m[1].toLowerCase()}`);
  if (cited.size === 0) continue;
  void officialFor;
  const own = e.code ? normalize(e.code) : null;
  const kwCodes = new Set(e.keywords.map(normalize).filter((k) => /^e\d/.test(k)));
  if (own) kwCodes.add(own);
  const foreign = [...cited].filter((c) => !kwCodes.has(c));
  // Une description peut légitimement citer un additif voisin ; on ne signale que
  // le cas où AUCUN code cité n'est celui de l'entrée (texte écrit pour un autre additif).
  if (own && foreign.length === cited.size) {
    const justification = JUSTIFIED_CODES[normalize(e.keywords[0])];
    if (justification) {
      console.log(`   ℹ️  ${label(e)} — écart assumé : ${justification}`);
    } else {
      flag('D', label(e), `la description cite ${[...cited].map((c) => c.toUpperCase()).join(', ')} mais jamais ${e.code}`);
    }
  }
}

const byTextEn = new Map<string, Entry[]>();
for (const e of entries) {
  const text = e.noteEn || officialFor(e);
  if (!text) continue;
  const list = byTextEn.get(text) ?? [];
  list.push(e);
  byTextEn.set(text, list);
}
for (const [, list] of byTextEn) {
  if (list.length < 2) continue;
  flag('D', list.map(label).join(' / '), `${list.length} ingrédients DIFFÉRENTS partagent exactement la même description`);
}

// ── [E] ULTRA TOXIC ────────────────────────────────────────────
const ultraSrc = fs.readFileSync(path.join(ROOT, 'constants', 'ultraToxicIngredients.ts'), 'utf-8');
const ultraKeywords = new Set<string>();
for (const block of ultraSrc.split(/\{\s*\n\s*id:/).slice(1)) {
  const kwRaw = /keywords:\s*\[([^\]]*)\]/.exec(block)?.[1] ?? '';
  const kwRe = /'((?:\\.|[^'\\])*)'/g;
  let m: RegExpExecArray | null;
  while ((m = kwRe.exec(kwRaw)) !== null) {
    const key = normalize(unquote(m[1]));
    if (key) ultraKeywords.add(key);
  }
}
// enforceUltraToxicFloor() (utils/api.ts) remonte ces ingrédients à 'danger' + circ
// « Ultra toxique » au moment du scan ; la base doit au minimum les marquer 'probable'.
for (const e of entries) {
  const isUltra = e.keywords.some((k) => ultraKeywords.has(normalize(k)));
  if (isUltra && e.risk !== 'danger' && e.risk !== 'probable') {
    flag('E', label(e), `figure dans la liste ULTRA TOXIC mais badge '${e.risk}' (attendu 'danger' ou 'probable')`);
  }
}

// ── Rapport ────────────────────────────────────────────────────
const SECTION_TITLES: Record<string, string> = {
  A: 'STRUCTURE (codes, doublons, descriptions manquantes)',
  B: 'BADGE ↔ CLASSIFICATION (circ)',
  C: 'BADGE ↔ CONTENU DE LA DESCRIPTION',
  D: 'DESCRIPTION ↔ INGRÉDIENT',
  E: 'ULTRA TOXIC',
};
for (const section of ['A', 'B', 'C', 'D', 'E']) {
  const list = issues.filter((i) => i.section === section);
  console.log(`\n[${section}] ${SECTION_TITLES[section]} — ${list.length} problème(s)`);
  for (const i of list) console.log(`   ✗ ${i.entry}\n      → ${i.detail}`);
}

console.log(issues.length === 0 ? '\n✅ Base cohérente\n' : `\n❌ ${issues.length} incohérence(s)\n`);
process.exit(0);
