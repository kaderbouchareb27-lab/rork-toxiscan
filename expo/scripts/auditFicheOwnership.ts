/**
 * AUDIT « À QUI APPARTIENT LA FICHE » — détecte le bug d'appariement à sa RACINE.
 *
 * Usage : bun --preload ./scripts/lib/nativeStub.ts scripts/auditFicheOwnership.ts
 *         (cwd = expo/ — le préchargement bouchonne react-native/expo pour exécuter
 *          LE VRAI code de résolution de utils/api.ts.)
 *
 * POURQUOI CE SCRIPT EXISTE (cause du bug corrigé trois fois de suite) :
 * une entrée de ingredientsDatabase.ts regroupe plusieurs mots-clés. Quand un mot-clé
 * n'a pas de fiche à SON nom, deux mécanismes lui servent celle du mot-clé principal
 * de l'entrée :
 *   1. scripts/generateOfficialDescriptions.ts (passe 2) diffuse la fiche de la tête
 *      d'entrée sur TOUS ses autres mots-clés ;
 *   2. utils/api.ts retombe sur `getOfficialEn(entry.keywords[0])`.
 * Tant que l'entrée ne regroupe que des synonymes (« figue » / « fig » / « figues »)
 * c'est exactement le comportement voulu. Dès qu'elle regroupe des aliments DIFFÉRENTS
 * (« figue » + « datte » + « raisin sec »), la datte hérite de la fiche de la figue.
 *
 * scripts/verifyDescriptionIntegrity.ts ne pouvait PAS voir ces cas : il considérait
 * tout mot-clé de l'entrée trouvée comme propriétaire légitime du texte. Ce script-ci
 * contrôle l'appartenance au niveau du MOT-CLÉ, pas de l'entrée :
 *
 *   une fiche est DE FAMILLE quand son texte parle de la catégorie sans nommer
 *   l'ingrédient pour lequel elle a été écrite (« Pulses provide plant protein… »
 *   pour l'entrée « petits pois ») : tous les membres de la famille peuvent
 *   légitimement l'afficher.
 *
 *   une fiche est SPÉCIFIQUE quand son texte nomme son propre ingrédient
 *   (« Dried figs provide fiber… », « Brazil nuts and pure nut butters… »).
 *   Elle n'appartient alors qu'à cet ingrédient : tout autre mot-clé qui l'affiche
 *   est signalé, sauf si
 *     (a) la fiche est écrite à son nom exact, ou
 *     (b) il est une variante morphologique du nom de la fiche
 *         (pluriel, forme qualifiée : « figues » ⊂ « figue »), ou
 *     (c) le texte nomme explicitement cet ingrédient aussi, ou
 *     (d) le couple est déclaré synonyme dans scripts/ficheAliasLexicon.json
 *         (traductions FR/EN/KO : « pomme » = « apple »), ou
 *     (e) la fiche est classée sous le code E de l'ingrédient (même substance réglementaire :
 *         « gomme xanthane » et « xanthan gum » partagent la fiche de E415).
 *
 * Tout le reste est signalé : soit l'ingrédient mérite sa propre fiche, soit le
 * synonyme doit être déclaré dans le lexique. Un nouveau mot-clé ajouté à la base
 * ne peut donc plus hériter silencieusement de la fiche du voisin.
 */
import * as fs from 'fs';
import * as path from 'path';
import { classifyLocal, lookupIngredient } from '@/utils/api';
import { INGREDIENTS_DATABASE, IngredientEntry } from '@/constants/ingredientsDatabase';
import { isOfficialEnText } from '@/utils/officialDescriptions';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, 'scripts', 'officialDescriptionsSource.json');
const LEXICON_PATH = path.join(ROOT, 'scripts', 'ficheAliasLexicon.json');

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

const STOPWORDS: ReadonlySet<string> = new Set([
  'de', 'du', 'des', 'd', 'la', 'le', 'les', 'au', 'aux', 'en', 'et',
  'of', 'and', 'the', 'a', 'with', 'from', 'or', 'in',
]);

/** Crude stem so « figues » ≈ « figue » and « nuts » ≈ « nut ». */
function stem(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith('es')) w = w.slice(0, -2);
  else if (w.length > 3 && (w.endsWith('s') || w.endsWith('x'))) w = w.slice(0, -1);
  return w;
}

function tokens(s: string): string[] {
  return normalize(s)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

function tokenSet(s: string): Set<string> {
  return new Set(tokens(s));
}

function isSubset(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0) return false;
  for (const t of a) if (!b.has(t)) return false;
  return true;
}

/** Edit distance capped at 2 — « bresil » ≈ « brazil », « figue » ≈ « fig ». */
function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = current;
    }
  }
  return prev[b.length];
}

/**
 * Loose word equality across languages and inflections: identical stems, one a prefix
 * of the other (« fig » / « figue »), or a one-letter difference (« bresil » / « brazil »).
 */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const long = a.length >= b.length ? a : b;
  const short = a.length >= b.length ? b : a;
  if (short.length >= 3 && long.startsWith(short)) return true;
  return short.length >= 5 && editDistance(a, b) <= 1;
}

function mentions(haystack: Iterable<string>, word: string): boolean {
  for (const t of haystack) if (sameWord(t, word)) return true;
  return false;
}

// ── Fiches officielles : texte → noms sources ──────────────────
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
const ficheNames = new Set(source.descriptions.map((d) => normalize(d.name)));

// ── Lexique de synonymes déclarés (traductions, noms commerciaux) ──
interface Lexicon {
  /** Each group lists words that name the SAME substance across languages. */
  synonyms: string[][];
}
const lexicon: Lexicon = fs.existsSync(LEXICON_PATH)
  ? (JSON.parse(fs.readFileSync(LEXICON_PATH, 'utf-8')) as Lexicon)
  : { synonyms: [] };

/** Stemmed word → id of its synonym group. */
const synonymGroup = new Map<string, number>();
lexicon.synonyms.forEach((group, id) => {
  for (const word of group) for (const t of tokens(word)) synonymGroup.set(t, id);
});

/** Translate a token to its group id, so « pomme » and « apple » compare equal. */
function canonicalTokens(s: string): Set<string> {
  const out = new Set<string>();
  for (const t of tokens(s)) {
    const group = synonymGroup.get(t);
    out.add(group === undefined ? t : `#${group}`);
  }
  return out;
}

/**
 * Category words that name a FAMILY, never a single ingredient. A fiche whose text opens
 * on one of these describes the whole family, so every member may display it.
 */
const CATEGORY_WORDS: ReadonlySet<string> = new Set(
  [
    'shellfish', 'seafood', 'fish', 'crustacean', 'mollusc', 'mollusk', 'pulse', 'legume',
    'bean', 'nut', 'seed', 'berry', 'citru', 'fruit', 'vegetable', 'green', 'leafy', 'herb',
    'spice', 'grain', 'cereal', 'cheese', 'dairy', 'milk', 'meat', 'poultry', 'squash',
    'melon', 'mushroom', 'root', 'tuber', 'oil', 'flour', 'starch', 'sugar', 'sweetener',
    'additive', 'colour', 'color', 'preservative', 'emulsifier', 'thickener', 'flavouring',
    'flavoring', 'stabiliser', 'stabilizer', 'antioxidant', 'acid', 'salt', 'gum', 'fibre',
    'fiber', 'protein', 'extract', 'powder', 'juice', 'syrup', 'butter', 'paste', 'water',
  ].map(stem),
);

/** First sentence of the fiche — where a specific fiche names its own ingredient. */
function firstSentence(text: string): string {
  return text.split(/[.!?…]/)[0] ?? text;
}

/**
 * True when the fiche text names the ingredient it was written for — the sign of a
 * SPECIFIC fiche (« Dried figs… » for « figue »). A family fiche (« Pulses provide… »
 * for « petits pois ») never repeats its own ingredient name.
 */
function isSpecificFiche(sourceName: string, text: string): boolean {
  const subject = new Set(tokens(firstSentence(text)));
  return tokens(sourceName).some((word) => !CATEGORY_WORDS.has(word) && mentions(subject, word));
}

/** « e415 », « e553b »… — a fiche filed under an E-code belongs to that additive, whatever its trade name. */
function isECode(s: string): boolean {
  return /^e\s?\d{3,4}\s?[a-z]?$/.test(s.trim());
}

/** True when the keyword may legitimately display a fiche written for `sourceName`. */
function ownsFiche(keyword: string, sourceName: string, text: string, code: string | null): boolean {
  const key = normalize(keyword);
  if (key === sourceName) return true; // (a) fiche écrite à son nom

  // (e) fiche classée sous le code E de l'ingrédient : « gomme xanthane » et « xanthan gum »
  // partagent légitimement la fiche de E415, c'est la MÊME substance réglementaire.
  if (isECode(sourceName) && code && normalize(code.replace(/^en:/i, '')) === sourceName) return true;

  const keyTokens = canonicalTokens(key);
  const sourceTokens = canonicalTokens(sourceName);
  // (b) variante morphologique / forme qualifiée du même ingrédient, (d) synonyme déclaré
  if (isSubset(keyTokens, sourceTokens) || isSubset(sourceTokens, keyTokens)) return true;

  // Fiche de famille : le texte ne revendique aucun ingrédient précis.
  if (!isSpecificFiche(sourceName, text)) return true;

  // (c) le texte de la fiche nomme aussi explicitement cet ingrédient
  const textTokens = tokens(text);
  const identity = tokens(key).filter((word) => !CATEGORY_WORDS.has(word));
  if (identity.length > 0 && identity.every((word) => mentions(textTokens, word))) return true;

  return false;
}

interface Flag {
  entryHead: string;
  keyword: string;
  ficheFor: string;
  text: string;
}

const flags: Flag[] = [];
let checked = 0;
let inherited = 0;

for (const entry of INGREDIENTS_DATABASE) {
  for (const keyword of entry.keywords) {
    const key = normalize(keyword);
    if (!key) continue;
    checked++;
    // Un mot-clé qui possède sa propre fiche ne peut pas hériter de celle du voisin.
    if (ficheNames.has(key)) continue;

    const substance = classifyLocal([keyword])[0];
    const served = (substance?.explication ?? '').trim();
    if (!served || !isOfficialEnText(served)) continue;

    const sourceNames = textToNames.get(served) ?? [];
    if (sourceNames.length === 0) continue;
    inherited++;
    const resolvedEntry = lookupIngredient(keyword) ?? entry;
    const code = resolvedEntry.code ?? entry.code ?? null;
    if (sourceNames.some((sourceName) => ownsFiche(keyword, sourceName, served, code))) continue;

    // Le mot-clé peut aussi être résolu vers une AUTRE entrée que celle qui le contient
    // (mot-clé plus long ailleurs) : on rapporte l'entrée réellement utilisée.
    flags.push({
      entryHead: resolvedEntry.keywords[0],
      keyword,
      ficheFor: sourceNames.join(' / '),
      text: served,
    });
  }
}

// ── Rapport groupé par entrée ──────────────────────────────────
const byEntry = new Map<string, Flag[]>();
for (const flag of flags) {
  const list = byEntry.get(flag.entryHead) ?? [];
  list.push(flag);
  byEntry.set(flag.entryHead, list);
}

console.log('\nMots-clés contrôlés            :', checked);
console.log('Mots-clés héritant d\'une fiche :', inherited);
console.log('Entrées de la base             :', INGREDIENTS_DATABASE.length);
console.log(`\n[${flags.length === 0 ? '✓' : '✗'}] Mots-clés affichant la fiche d'un AUTRE ingrédient : ${flags.length} (${byEntry.size} entrées)`);

for (const [head, list] of [...byEntry.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n  ▸ entrée « ${head} »`);
  for (const flag of list) {
    console.log(`      • « ${flag.keyword} » ← fiche de « ${flag.ficheFor} » : « ${flag.text.slice(0, 80)}… »`);
  }
}

const REPORT_PATH = path.join(ROOT, 'scripts', 'ficheOwnershipReport.json');
fs.writeFileSync(REPORT_PATH, JSON.stringify({ flags }, null, 2), 'utf-8');
console.log(`\n[i] Rapport exporté : ${flags.length} cas → scripts/ficheOwnershipReport.json`);

// ── Liste de travail pour scripts/writeMissingFiches.ts ────────
// Chaque mot-clé signalé reçoit une fiche À SON NOM : une clé exacte l'emporte toujours
// sur la diffusion depuis la tête d'entrée, donc l'héritage fautif disparaît définitivement.
function badgeForEntry(entry: IngredientEntry): string {
  if (entry.risk === 'aucun') return 'Approved';
  if (entry.risk === 'possible') return 'Occasional';
  if (entry.risk === 'probable') return 'Processed';
  return normalize(entry.circ).includes('groupe 1') ? 'Carcinogenic' : 'Ultra toxic';
}

interface PendingFiche {
  name: string;
  badge: string;
  circ: string;
  noteEn: string;
  reason: 'wrong-fiche';
}

const pending = new Map<string, PendingFiche>();
for (const flag of flags) {
  const key = normalize(flag.keyword);
  if (!key || pending.has(key)) continue;
  const entry = lookupIngredient(flag.keyword);
  pending.set(key, {
    name: key,
    badge: entry ? badgeForEntry(entry) : 'Occasional',
    circ: entry?.circ ?? '',
    noteEn: entry?.noteEn ?? entry?.note ?? '',
    reason: 'wrong-fiche',
  });
}
const PENDING_PATH = path.join(ROOT, 'scripts', 'pendingFiches.json');
fs.writeFileSync(PENDING_PATH, JSON.stringify({ pending: [...pending.values()] }, null, 2), 'utf-8');
console.log(`[i] Fiches à rédiger exportées : ${pending.size} → scripts/pendingFiches.json`);
console.log(
  flags.length === 0
    ? '\n✅ Chaque mot-clé affiche une fiche écrite pour LUI (ou un synonyme déclaré).\n'
    : `\n❌ ${flags.length} mot(s)-clé(s) à corriger : écrire leur fiche, ou déclarer le synonyme dans scripts/ficheAliasLexicon.json.\n`,
);
process.exit(flags.length === 0 ? 0 : 1);
