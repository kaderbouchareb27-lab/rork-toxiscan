/**
 * VÉRIFICATION AUTOMATIQUE de toute la base : nom ↔ badge ↔ description affichée.
 *
 * Usage : bun --preload ./scripts/lib/nativeStub.ts scripts/verifyDescriptionIntegrity.ts
 *         (cwd = expo/ — le préchargement bouchonne react-native/expo pour que le script
 *          exécute LE VRAI code de résolution de utils/api.ts, pas une copie qui dérive.)
 *
 * Trois familles de contrôles, sur CHAQUE mot-clé de la base (+ variantes plurielles) :
 *
 *  (a) FORMULE DE SECOURS GÉNÉRIQUE — le texte affiché contient encore une phrase de
 *      remplissage (« It is rated acceptable because it is refined or processed… ») :
 *        • ÉCHEC si une fiche officielle existe pour cet ingrédient (elle est ignorée) ;
 *        • MANQUE si aucune fiche officielle n'existe (fiche à écrire).
 *
 *  (b) MAUVAIS APPARIEMENT — le texte affiché est la fiche officielle écrite pour le NOM
 *      d'un AUTRE ingrédient (« pommes de terre » qui affiche la fiche de « pomme »).
 *
 *  (c) RÈGLE APPROVED — un ingrédient vert doit afficher UNE seule phrase courte.
 */
import * as fs from 'fs';
import * as path from 'path';
import { classifyLocal, lookupIngredient } from '@/utils/api';
import { INGREDIENTS_DATABASE, IngredientEntry } from '@/constants/ingredientsDatabase';
import { getOfficialEn, isOfficialEnText } from '@/utils/officialDescriptions';
import { ADDITIVES_DATABASE, getAdditiveDescription } from '@/constants/additives';
import { matchUltraToxicIngredient } from '@/constants/ultraToxicIngredients';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, 'scripts', 'officialDescriptionsSource.json');

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

// ── Fragments de remplissage générés par utils/api.ts (aucune valeur ingrédient) ──
const GENERIC_FRAGMENTS: readonly string[] = [
  'It is rated acceptable because it is refined or processed',
  'An occasional intake poses no problem',
  'It is rated industrial because it is produced by a heavy industrial process',
  'Repeated consumption is linked to metabolic disorders',
  'It sits at the highest risk level because health agencies link it',
  'Every repeated exposure accumulates in the body',
  'is a natural, minimally processed food that nourishes the body',
  'are a natural, minimally processed food that nourishes the body',
];

function genericFragment(text: string): string | null {
  return GENERIC_FRAGMENTS.find((f) => text.includes(f)) ?? null;
}

// ── Fiches officielles : texte → noms sources pour lesquels il a été écrit ──
interface SourceDescription {
  name: string;
  description_en: string;
  badge: string;
  lot: string;
}
const source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf-8')) as { descriptions: SourceDescription[] };
const textToNames = new Map<string, string[]>();
for (const d of source.descriptions) {
  const list = textToNames.get(d.description_en) ?? [];
  list.push(normalize(d.name));
  textToNames.set(d.description_en, list);
}

/** Normalized keyword → entries owning it as an EXACT keyword (to spot a stolen fiche). */
const keywordOwners = new Map<string, IngredientEntry[]>();
for (const entry of INGREDIENTS_DATABASE) {
  for (const keyword of entry.keywords) {
    const key = normalize(keyword);
    if (!key) continue;
    const list = keywordOwners.get(key) ?? [];
    list.push(entry);
    keywordOwners.set(key, list);
  }
}

/**
 * Names to test: every database keyword plus a realistic plural variant — French plural on
 * the head noun (« pomme de terre » → « pommes de terre »), English plural on the last word
 * (« palm fruit oil » → « palm fruit oils »). Labels are what a real label shows.
 */
function testNames(): string[] {
  const names = new Set<string>();
  for (const entry of INGREDIENTS_DATABASE) {
    for (const keyword of entry.keywords) {
      const key = keyword.trim();
      if (key.length < 2 || /\d/.test(key)) {
        if (key.length >= 2) names.add(key);
        continue;
      }
      names.add(key);
      const words = key.split(' ');
      const isFrenchCompound = / (?:de|du|des|d|a|au|aux) /.test(` ${key} `);
      if (isFrenchCompound && !words[0].endsWith('s')) {
        names.add([words[0] + 's', ...words.slice(1)].join(' '));
      } else if (!key.endsWith('s') && !key.endsWith('x')) {
        names.add([...words.slice(0, -1), words[words.length - 1] + 's'].join(' '));
      }
    }
  }
  return [...names];
}

/** The official English text reachable for a scanned name (same order as utils/api.ts). */
function officialFor(name: string, entry: IngredientEntry | null): string | undefined {
  return (
    getOfficialEn(name, entry?.code ?? null) ??
    (entry ? getOfficialEn(entry.keywords[0] ?? null, entry.code) : undefined)
  );
}

/** Words that carry no substance identity (« huile DE colza »). */
const STOPWORDS: ReadonlySet<string> = new Set(['de', 'du', 'des', 'd', 'la', 'le', 'les', 'au', 'aux', 'of', 'and', 'the', 'a']);

function identityTokens(s: string): Set<string> {
  return new Set(normalize(s).split(' ').filter((w) => w.length > 0 && !STOPWORDS.has(w)));
}

function isSubset(a: Set<string>, b: Set<string>): boolean {
  for (const token of a) if (!b.has(token)) return false;
  return true;
}

/**
 * True when an official text was legitimately written for this ingredient.
 * A fiche belongs when its source name and one of the names of the matched entry describe
 * the SAME substance: identical identity tokens, or one is a qualified form of the other
 * (« alpha tocopherol » ⊆ « d alpha tocopherol », « huile de colza » ⊆ « huile de canola
 * colza raffinée »). « nitrite de sodium » vs « nitrate de sodium » stays a mismatch.
 */
function officialBelongsTo(text: string, name: string, entry: IngredientEntry | null): boolean {
  const sourceNames = textToNames.get(text);
  if (!sourceNames || sourceNames.length === 0) return true; // text absent from the source → nothing to compare
  // The palm-fat and ULTRA TOXIC floors serve the fiche of THEIR OWN entry, whatever the
  // scanned wording (« graisse de palmiste » → palm fiche), so those names count as owners.
  const floorEntries: IngredientEntry[] = [];
  if (/palm|palmiste/.test(normalize(name))) {
    const palm = lookupIngredient('huile de palme');
    if (palm) floorEntries.push(palm);
  }
  const ultraToxic = matchUltraToxicIngredient(name, entry?.code ?? null);
  const owned = [
    normalize(name),
    ...(entry?.keywords ?? []).map(normalize),
    ...(entry?.code ? [normalize(entry.code)] : []),
    ...floorEntries.flatMap((e) => [...e.keywords.map(normalize), ...(e.code ? [normalize(e.code)] : [])]),
    ...(ultraToxic ? [...ultraToxic.keywords.map(normalize), ...(ultraToxic.code ? [normalize(ultraToxic.code)] : [])] : []),
  ];
  const ownedTokens = owned.filter(Boolean).map(identityTokens);
  return sourceNames.some((sourceName) => {
    if (owned.includes(sourceName)) return true;
    const sourceTokens = identityTokens(sourceName);
    return ownedTokens.some((tokens) => isSubset(tokens, sourceTokens) || isSubset(sourceTokens, tokens));
  });
}

/**
 * Fiches whose wording is imposed by the product owner and must be displayed verbatim,
 * even when the ingredient is green and the one-sentence rule would shorten them.
 */
const VERBATIM_LOTS: ReadonlySet<string> = new Set(['13-fallback']);
const VERBATIM_TEXTS: ReadonlySet<string> = new Set(
  source.descriptions.filter((d) => VERBATIM_LOTS.has(d.lot)).map((d) => d.description_en),
);

/** Sentence count, identical to the runtime rule in utils/api.ts. */
function countSentences(text: string): number {
  return text
    .split(/[.!?…]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2).length;
}

const MAX_APPROVED_LENGTH = 170;

interface Failure {
  kind: 'fallback-over-official' | 'mismatch' | 'approved-too-long' | 'empty';
  name: string;
  detail: string;
  /** Aliases sharing the same served text are one single problem — reported once. */
  groupKey?: string;
}

const failures: Failure[] = [];
/** Ingredients with NO official fiche that fall back to generic filler wording. */
const missingFiches = new Map<string, string>();

/** Work list consumed by scripts/writeMissingFiches.ts (fiche à écrire pour cet ingrédient). */
interface PendingFiche {
  /** Name the fiche must be filed under (an entry head, so every alias inherits it). */
  name: string;
  badge: string;
  circ: string;
  /** Validated English note already in the database, if any — the fiche must stay faithful to it. */
  noteEn: string;
  reason: 'no-fiche' | 'wrong-fiche';
}
const pending = new Map<string, PendingFiche>();

function badgeForEntry(entry: IngredientEntry): string {
  if (entry.risk === 'aucun') return 'Approved';
  if (entry.risk === 'possible') return 'Occasional';
  if (entry.risk === 'probable') return 'Processed';
  return normalize(entry.circ).includes('groupe 1') ? 'Carcinogenic' : 'Ultra toxic';
}

function addPending(entry: IngredientEntry | null, fallbackName: string, reason: PendingFiche['reason']): void {
  const name = entry?.keywords[0] ?? fallbackName;
  if (!name || pending.has(normalize(name))) return;
  pending.set(normalize(name), {
    name,
    badge: entry ? badgeForEntry(entry) : 'Occasional',
    circ: entry?.circ ?? '',
    noteEn: entry?.noteEn ?? entry?.note ?? '',
    reason,
  });
}

/**
 * An alias that displays ANOTHER ingredient's fiche needs a fiche filed under its OWN name:
 * an exact source name always wins over a fiche spread from a neighbouring entry.
 */
function addPendingAlias(name: string, entry: IngredientEntry | null): void {
  const key = normalize(name);
  if (!key || pending.has(key)) return;
  pending.set(key, {
    name: key,
    badge: entry ? badgeForEntry(entry) : 'Occasional',
    circ: entry?.circ ?? '',
    noteEn: entry?.noteEn ?? entry?.note ?? '',
    reason: 'wrong-fiche',
  });
}

const names = testNames();
for (const name of names) {
  const entry = lookupIngredient(name);
  const substance = classifyLocal([name])[0];
  const served = (substance?.explication ?? '').trim();
  const canonical = entry?.keywords[0] ?? '—';

  if (!served) {
    if (substance?.descriptionPending !== true) failures.push({ kind: 'empty', name, detail: 'texte vide' });
    continue;
  }

  const official = officialFor(name, entry);

  // (a) formule de secours générique
  const fragment = genericFragment(served);
  if (fragment) {
    if (official) {
      failures.push({
        kind: 'fallback-over-official',
        name,
        detail: `fiche officielle ignorée (« ${official.slice(0, 60)}… ») → « …${fragment} »`,
      });
    } else {
      missingFiches.set(canonical, name);
      addPending(entry, name, 'no-fiche');
    }
  }

  // (b) mauvais appariement nom ↔ description
  if (isOfficialEnText(served) && !officialBelongsTo(served, name, entry)) {
    const writtenFor = (textToNames.get(served) ?? []).join(' / ');
    const stolenFrom = (textToNames.get(served) ?? [])
      .flatMap((n) => keywordOwners.get(n) ?? [])
      .find((e) => e !== entry);
    failures.push({
      kind: 'mismatch',
      name,
      detail: `affiche la fiche écrite pour « ${writtenFor} »${stolenFrom ? ` (entrée « ${stolenFrom.keywords[0]} »)` : ''} — entrée trouvée : « ${canonical} »`,
      groupKey: `${canonical}::${served}`,
    });
    addPending(entry, name, 'wrong-fiche');
    addPendingAlias(name, entry);
  }

  // (c) règle Approved : une seule phrase courte
  if (
    substance?.niveau_risque === 'aucun' &&
    !VERBATIM_TEXTS.has(served) &&
    (countSentences(served) > 1 || served.length > MAX_APPROVED_LENGTH)
  ) {
    failures.push({
      kind: 'approved-too-long',
      name,
      detail: `${countSentences(served)} phrase(s), ${served.length} caractères — « ${served.slice(0, 90)}… »`,
      groupKey: served,
    });
  }
}

// ── Additifs (écran additifs — chemin getAdditiveDescription) ──
for (const additive of ADDITIVES_DATABASE) {
  const served = getAdditiveDescription(additive).trim();
  if (!served) {
    failures.push({ kind: 'empty', name: `${additive.code} ${additive.name}`, detail: 'description vide' });
    continue;
  }
  const fragment = genericFragment(served);
  if (fragment) {
    failures.push({
      kind: 'fallback-over-official',
      name: `${additive.code} ${additive.name}`,
      detail: `formule générique : « …${fragment} »`,
    });
  }
  if (isOfficialEnText(served)) {
    const sourceNames = textToNames.get(served) ?? [];
    const additiveCode = normalize(additive.code.replace(/^en:/i, ''));
    const additiveTokens = identityTokens(additive.name);
    // A fiche belongs to an additive when it was written for the same E-code, when the fiche
    // text names that code, or when the names describe the same substance.
    const belongs =
      sourceNames.length === 0 ||
      sourceNames.some((sourceName) => {
        if (sourceName === normalize(additive.name) || sourceName === additiveCode) return true;
        const sourceCode = lookupIngredient(sourceName)?.code;
        if (sourceCode && additiveCode && normalize(sourceCode) === additiveCode) return true;
        if (additiveCode.startsWith('e') && normalize(served).includes(additiveCode)) return true;
        const tokens = identityTokens(sourceName);
        return isSubset(tokens, additiveTokens) || isSubset(additiveTokens, tokens);
      });
    if (!belongs) {
      failures.push({
        kind: 'mismatch',
        name: `${additive.code} ${additive.name}`,
        detail: `affiche la fiche écrite pour « ${sourceNames.join(' / ')} »`,
      });
      // Filed under the ADDITIVE's own name: the matched ingredient entry usually already
      // has a correct fiche (PTFE), what is missing is one for the additive itself (PFAS).
      const additiveBadge = additive.group === 'group1' || additive.group === 'group2a' ? 'Carcinogenic' : 'Processed';
      const additiveNote = additive.descriptionEn ?? additive.description;
      pending.set(normalize(additive.name), {
        name: additive.name,
        badge: additiveBadge,
        circ: additive.group,
        noteEn: additiveNote,
        reason: 'wrong-fiche',
      });
      // Non-E codes ('pfas', 'sles') are looked up BEFORE the name, so they need their own fiche.
      const codeKey = normalize(additive.code.replace(/^en:/i, ''));
      if (codeKey && !/^e\d/.test(codeKey) && !pending.has(codeKey)) {
        pending.set(codeKey, {
          name: codeKey,
          badge: additiveBadge,
          circ: additive.group,
          noteEn: additiveNote,
          reason: 'wrong-fiche',
        });
      }
    }
  }
}

// ── Rapport ────────────────────────────────────────────────────
const byKind = (kind: Failure['kind']): Failure[] => failures.filter((f) => f.kind === kind);
const LABELS: Record<Failure['kind'], string> = {
  'fallback-over-official': 'Formule générique alors qu’une fiche officielle existe',
  mismatch: 'Description d’un AUTRE ingrédient',
  'approved-too-long': 'Ingrédient vert : description trop longue (règle 1 phrase)',
  empty: 'Description vide',
};

console.log('\nNoms testés            :', names.length);
console.log('Entrées base           :', INGREDIENTS_DATABASE.length);
console.log('Additifs testés        :', ADDITIVES_DATABASE.length);

/** One line per distinct problem: aliases serving the same wrong text are grouped. */
function dedupe(list: Failure[]): { failure: Failure; aliases: number }[] {
  const groups = new Map<string, { failure: Failure; aliases: number }>();
  for (const failure of list) {
    const key = failure.groupKey ?? `${failure.kind}::${failure.name}`;
    const existing = groups.get(key);
    if (existing) existing.aliases++;
    else groups.set(key, { failure, aliases: 1 });
  }
  return [...groups.values()];
}

for (const kind of Object.keys(LABELS) as Failure['kind'][]) {
  const list = byKind(kind);
  const groups = dedupe(list);
  console.log(
    `\n[${groups.length === 0 ? '✓' : '✗'}] ${LABELS[kind]} : ${groups.length}` +
      (list.length === groups.length ? '' : ` (${list.length} noms/alias)`),
  );
  for (const { failure, aliases } of groups.slice(0, 40)) {
    console.log(`   • « ${failure.name} »${aliases > 1 ? ` (+${aliases - 1} alias)` : ''} — ${failure.detail}`);
  }
  if (groups.length > 40) console.log(`   … et ${groups.length - 40} autres`);
}

console.log(`\n[i] Sans fiche officielle (texte de secours générique) : ${missingFiches.size}`);
for (const [canonical, name] of [...missingFiches.entries()].slice(0, 40)) {
  console.log(`   • ${canonical}${canonical === name ? '' : ` (via « ${name} »)`}`);
}
if (missingFiches.size > 40) console.log(`   … et ${missingFiches.size - 40} autres`);

// Liste de travail pour scripts/writeMissingFiches.ts (fiches à rédiger hors ligne).
const PENDING_PATH = path.join(ROOT, 'scripts', 'pendingFiches.json');
fs.writeFileSync(PENDING_PATH, JSON.stringify({ pending: [...pending.values()] }, null, 2), 'utf-8');
console.log(`\n[i] Fiches à rédiger exportées : ${pending.size} → scripts/pendingFiches.json`);

const distinctProblems = dedupe(failures).length;
console.log(
  failures.length === 0
    ? '\n✅ Base cohérente : aucune fiche volée, aucune formule générique par-dessus une fiche officielle.\n'
    : `\n❌ ${distinctProblems} problème(s) distinct(s) à corriger (${failures.length} noms concernés).\n`,
);
process.exit(failures.length === 0 ? 0 : 1);
