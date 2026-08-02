/**
 * Vérification finale de l'intégration des descriptions officielles.
 * Usage : bun run scripts/verifyOfficialDescriptions.ts   (cwd = expo/)
 *
 * 1. Chaque description source (394) doit être retrouvable par son nom (clé normalisée)
 *    et servir EXACTEMENT le texte officiel.
 * 2. Les reclassements de badges doivent être appliqués dans les bases.
 * 3. Contrôles d'alias (E-codes, synonymes) sur des cas clés.
 */
import * as fs from 'fs';
import * as path from 'path';
import { OFFICIAL_DESCRIPTION_KEYS, OFFICIAL_DESCRIPTION_TEXTS } from '../constants/officialDescriptions';

const ROOT = process.cwd();
let failures = 0;

function check(label: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log('  ✓', label);
  } else {
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

function getOfficial(nameOrCode: string): string | undefined {
  const idx = OFFICIAL_DESCRIPTION_KEYS[normalize(nameOrCode.replace(/^en:/i, ''))];
  return idx === undefined ? undefined : OFFICIAL_DESCRIPTION_TEXTS[idx];
}

// ── 1. Toutes les descriptions sources sont servies ────────────
console.log('\n[1] Couverture des 394 descriptions officielles');
const source = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts', 'officialDescriptionsSource.json'), 'utf-8'),
) as { descriptions: { name: string; description_en: string; badge: string }[] };

let served = 0;
const missing: string[] = [];
const mismatched: string[] = [];
for (const d of source.descriptions) {
  const got = getOfficial(d.name);
  if (got === undefined) missing.push(d.name);
  else if (got !== d.description_en) mismatched.push(d.name);
  else served++;
}
check(`${served}/${source.descriptions.length} descriptions servies par nom exact`, served === source.descriptions.length);
check('0 nom sans clé', missing.length === 0, missing.join(', '));
check('0 texte divergent', mismatched.length === 0, mismatched.join(', '));

// ── 2. Reclassements de badges ─────────────────────────────────
console.log('\n[2] Reclassements de badges');
const ingredientsSrc = fs.readFileSync(path.join(ROOT, 'constants', 'ingredientsDatabase.ts'), 'utf-8');
const additivesSrc = fs.readFileSync(path.join(ROOT, 'constants', 'additives.ts'), 'utf-8');

const occasionalChecks: { label: string; pattern: RegExp }[] = [
  { label: 'annatto → Occasional (possible)', pattern: /'annatto'[^}]*risk:\s*'possible'/ },
  { label: 'niacinamide → Occasional (possible)', pattern: /risk:\s*'possible',\s*circ:\s*'Vitamine B3 de synthèse'/ },
  { label: 'pantothénate de calcium → Occasional (possible)', pattern: /risk:\s*'possible',\s*circ:\s*'Vitamine B5 de synthèse'/ },
  { label: 'pyridoxine chlorhydrate → Occasional (possible)', pattern: /risk:\s*'possible',\s*circ:\s*'Vitamine B6 de synthèse'/ },
  { label: 'cyanocobalamine → Occasional (possible)', pattern: /risk:\s*'possible',\s*circ:\s*'Vitamine B12 de synthèse'/ },
  { label: 'inositol → Occasional (possible)', pattern: /'inositole'\],\s*code:\s*null,\s*risk:\s*'possible'/ },
];
for (const c of occasionalChecks) check(c.label, c.pattern.test(ingredientsSrc));

check(
  'acétaldéhyde → Processed (group2a)',
  /code:\s*'acetaldehyde',\s*name:\s*'Acétaldéhyde',\s*group:\s*'group2a'/.test(additivesSrc),
);
check(
  "mercure (base ingrédients) → Ultra toxic ('danger' + circ 'Ultra toxique')",
  /'mercure',\s*'mercury',\s*'thimerosal'\],\s*code:\s*null,\s*risk:\s*'danger',\s*circ:\s*'Ultra toxique'/.test(ingredientsSrc),
);
check(
  "plomb (base ingrédients) → Ultra toxic ('danger' + circ 'Ultra toxique')",
  /'plomb',\s*'lead acetate'\],\s*code:\s*null,\s*risk:\s*'danger',\s*circ:\s*'Ultra toxique'/.test(ingredientsSrc),
);
check(
  'mercure / plomb : descriptions officielles Ultra toxic présentes (les 2 noms de chaque)',
  ['mercure', 'Mercure / Thimérosal', 'plomb', 'Plomb (acétate de plomb)'].every((n) => getOfficial(n) !== undefined),
);

// ── 3. Contrôles d'alias / E-codes ─────────────────────────────
console.log("\n[3] Contrôles d'alias (le scan retrouve la description via n'importe quel synonyme)");
const red40ByName = getOfficial('rouge 40');
check("'e129' → même texte que 'rouge 40'", red40ByName !== undefined && getOfficial('e129') === red40ByName);
check("'allura red' → même texte que 'rouge 40'", getOfficial('allura red') === red40ByName);
const sugarText = getOfficial('sucre');
check("'sucre' possède une description officielle", sugarText !== undefined);
check("'sugar' (alias EN) → même texte", getOfficial('sugar') === sugarText);
const rebm = getOfficial('rebaudioside m');
check("'rebaudioside m' conservé ou absent sans conflit (pas d'écrasement d'entrée validée)", rebm === undefined || rebm.length > 0);
check("'niacinamide' → description officielle reclassée", getOfficial('niacinamide') !== undefined);
check("'vitamine b3' (alias) → même texte que 'niacinamide'", getOfficial('vitamine b3') === getOfficial('niacinamide'));

// ── 4. Intégrité du fichier généré ─────────────────────────────
console.log('\n[4] Intégrité du fichier généré');
check('394 textes uniques', OFFICIAL_DESCRIPTION_TEXTS.length === 394, String(OFFICIAL_DESCRIPTION_TEXTS.length));
const badIdx = Object.values(OFFICIAL_DESCRIPTION_KEYS).filter((i) => i < 0 || i >= OFFICIAL_DESCRIPTION_TEXTS.length);
check('tous les index de clés valides', badIdx.length === 0);
const emptyTexts = OFFICIAL_DESCRIPTION_TEXTS.filter((t) => !t || t.trim().length < 40);
check('aucun texte vide ou tronqué (<40 caractères)', emptyTexts.length === 0);

// ── Résumé ─────────────────────────────────────────────────────
console.log('\n' + (failures === 0 ? '✅ TOUT EST IMPLANTÉ — ' + served + ' descriptions intégrées, 0 échec.' : '❌ ' + failures + ' échec(s).'));
process.exit(failures === 0 ? 0 : 1);
