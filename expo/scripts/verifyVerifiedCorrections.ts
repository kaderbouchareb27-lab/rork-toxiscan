/**
 * VÉRIFIE que le lot scripts/verifiedCorrections.json est intégralement appliqué, en
 * rejouant le VRAI moteur de résolution de l'app (utils/api.ts) pour chaque nom et chaque
 * alias du lot :
 *
 *   1. l'ingrédient est bien reconnu (aucun manquant) ;
 *   2. il tombe sur l'entrée attendue (pas sur une entrée voisine) ;
 *   3. son badge est celui demandé (Approved / Occasional / Processed / Ultra toxic / Carcinogenic) ;
 *   4. le texte affiché est celui du lot — ou, pour un alias, SA PROPRE fiche officielle
 *      classée à son nom exact et de même badge (« sardine » garde sa fiche sardine sous
 *      l'entrée « saumon sauvage »). Les lots SAFETY / FACTUAL ERROR n'ont pas cette
 *      tolérance : leur texte doit être servi tel quel, alias compris.
 *
 * Usage : bun --preload ./scripts/lib/nativeStub.ts scripts/verifyVerifiedCorrections.ts
 *         (cwd = expo/)
 */
import * as fs from 'fs';
import * as path from 'path';
import { classifyLocal, lookupIngredient } from '@/utils/api';
import { INGREDIENTS_DATABASE, IngredientEntry } from '@/constants/ingredientsDatabase';

const ROOT = process.cwd();
const CORRECTIONS_PATH = path.join(ROOT, 'scripts', 'verifiedCorrections.json');

type Badge = 'Approved' | 'Occasional' | 'Processed' | 'Ultra toxic' | 'Carcinogenic';

interface Correction {
  readonly _action: 'REPLACE' | 'ADD' | 'DELETE' | 'SPLIT';
  readonly _priority: string;
  readonly name: string;
  readonly description_en?: string;
  readonly badge?: Badge;
  readonly aliases?: readonly string[];
}

interface SourceDescription {
  name: string;
  description_en: string;
  badge: string;
  lot: string;
}

/** Same list as scripts/applyVerifiedCorrections.ts: no alias tolerance for these lots. */
const OVERRIDE_PRIORITIES: ReadonlySet<string> = new Set([
  'SAFETY',
  'FACTUAL ERROR',
  'MISLEADING',
  'INTERNAL CONTRADICTION',
  'WEAK CLAIM',
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function badgeForEntry(entry: IngredientEntry): Badge {
  if (entry.risk === 'aucun') return 'Approved';
  if (entry.risk === 'possible') return 'Occasional';
  if (entry.risk === 'probable') return 'Processed';
  return normalize(entry.circ).includes('groupe 1') ? 'Carcinogenic' : 'Ultra toxic';
}

const corrections = (JSON.parse(fs.readFileSync(CORRECTIONS_PATH, 'utf-8')) as { corrections: Correction[] }).corrections;
const source = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts', 'officialDescriptionsSource.json'), 'utf-8'),
) as { descriptions: SourceDescription[] };
const ficheByName = new Map<string, SourceDescription>();
for (const d of source.descriptions) ficheByName.set(normalize(d.name), d);

// Keyword ownership, replayed exactly like the apply script: the dedicated NEW entries
// claim first, so « riz » belongs to « riz blanc » and not to the brown-rice correction.
const owner = new Map<string, number>();
const claimedKeywords = new Map<number, string[]>();
function claim(index: number, keywords: readonly string[]): string[] {
  const kept: string[] = [];
  for (const keyword of keywords) {
    const key = normalize(keyword);
    if (!key) continue;
    const existing = owner.get(key);
    if (existing !== undefined && existing !== index) continue;
    if (kept.some((k) => normalize(k) === key)) continue;
    owner.set(key, index);
    kept.push(keyword);
  }
  return kept;
}
corrections.forEach((c, i) => {
  if (c._action === 'ADD' || c._action === 'SPLIT') claimedKeywords.set(i, claim(i, [c.name, ...(c.aliases ?? [])]));
});
corrections.forEach((c, i) => {
  if (c._action === 'REPLACE') claimedKeywords.set(i, claim(i, [c.name, ...(c.aliases ?? [])]));
});

interface Problem {
  kind: 'absent' | 'entree' | 'badge' | 'texte';
  correction: string;
  keyword: string;
  detail: string;
}
const problems: Problem[] = [];
let checked = 0;

corrections.forEach((correction, index) => {
  if (correction._action === 'DELETE') {
    const stillThere = INGREDIENTS_DATABASE.find((e) => normalize(e.keywords[0] ?? '') === normalize(correction.name));
    if (stillThere) {
      problems.push({ kind: 'entree', correction: correction.name, keyword: correction.name, detail: 'entrée toujours présente alors qu\'elle devait être supprimée' });
    }
    return;
  }
  const badge = correction.badge;
  const expected = (correction.description_en ?? '').trim();
  const keywords = claimedKeywords.get(index) ?? [];
  if (!badge || !expected || keywords.length === 0) return;

  const head = keywords[0];
  const ownerEntry = INGREDIENTS_DATABASE.find((e) => normalize(e.keywords[0] ?? '') === normalize(head));
  if (!ownerEntry) {
    problems.push({ kind: 'absent', correction: correction.name, keyword: head, detail: 'aucune entrée de la base ne porte ce nom' });
    return;
  }

  for (const keyword of keywords) {
    checked++;
    const entry = lookupIngredient(keyword);
    if (!entry) {
      problems.push({ kind: 'absent', correction: correction.name, keyword, detail: 'non reconnu par le moteur' });
      continue;
    }
    if (entry !== ownerEntry) {
      problems.push({
        kind: 'entree',
        correction: correction.name,
        keyword,
        detail: `résolu vers l'entrée « ${entry.keywords[0]} » au lieu de « ${ownerEntry.keywords[0]} »`,
      });
      continue;
    }
    const actualBadge = badgeForEntry(entry);
    if (actualBadge !== badge) {
      problems.push({ kind: 'badge', correction: correction.name, keyword, detail: `badge ${actualBadge} au lieu de ${badge}` });
    }
    const served = (classifyLocal([keyword])[0]?.explication ?? '').trim();
    if (served === expected) continue;
    const ownFiche = ficheByName.get(normalize(keyword));
    const keepsOwnFiche =
      !OVERRIDE_PRIORITIES.has(correction._priority) &&
      normalize(keyword) !== normalize(head) &&
      ownFiche !== undefined &&
      ownFiche.description_en === served &&
      ownFiche.badge === badge;
    if (keepsOwnFiche) continue;
    problems.push({
      kind: 'texte',
      correction: correction.name,
      keyword,
      detail: served.length === 0 ? 'texte vide' : `texte servi ≠ texte vérifié — « ${served.slice(0, 80)}… »`,
    });
  }
});

const LABELS: Record<Problem['kind'], string> = {
  absent: 'Ingrédient MANQUANT (non reconnu)',
  entree: 'Résolu vers une AUTRE entrée',
  badge: 'Badge différent du lot',
  texte: 'Texte affiché différent du lot',
};

console.log('\nCorrections du lot     :', corrections.length);
console.log('Noms + alias contrôlés :', checked);
console.log('Entrées base           :', INGREDIENTS_DATABASE.length);

for (const kind of Object.keys(LABELS) as Problem['kind'][]) {
  const list = problems.filter((p) => p.kind === kind);
  console.log(`\n[${list.length === 0 ? '✓' : '✗'}] ${LABELS[kind]} : ${list.length}`);
  for (const p of list.slice(0, 40)) console.log(`   • « ${p.keyword} » (lot « ${p.correction} ») — ${p.detail}`);
  if (list.length > 40) console.log(`   … et ${list.length - 40} autres`);
}

console.log(
  problems.length === 0
    ? '\n✅ Lot intégralement appliqué : chaque ingrédient est reconnu, badgé et décrit comme demandé.\n'
    : `\n❌ ${problems.length} écart(s) avec le lot vérifié.\n`,
);
process.exit(problems.length === 0 ? 0 : 1);
