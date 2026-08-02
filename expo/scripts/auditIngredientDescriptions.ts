/**
 * Audit des descriptions d'ingrédients.
 * Usage : bun run scripts/auditIngredientDescriptions.ts   (cwd = expo/)
 *
 * 1. Chaque entrée de la base a une description FR/EN/KO ou une description officielle.
 * 2. Aucun texte générique « n'est pas répertorié dans la base ToxiScan… » ne subsiste.
 * 3. Les ingrédients inconnus reçoivent une description de famille (moteur de connaissance).
 */
import * as fs from 'fs';
import * as path from 'path';
import { OFFICIAL_DESCRIPTION_KEYS } from '../constants/officialDescriptions';

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

// ── 1. Entrées de la base sans description ─────────────────────
console.log('\n[1] Descriptions de la base ingrédients');
const dbSrc = fs.readFileSync(path.join(ROOT, 'constants', 'ingredientsDatabase.ts'), 'utf-8');
const entryRegex = /\{\s*keywords:\s*\[([^\]]*)\][^\n]*?\n?/g;
const lines = dbSrc.split('\n').filter((l) => l.trim().startsWith('{ keywords:'));
let withoutNote = 0;
const orphans: string[] = [];
for (const line of lines) {
  const kwMatch = /keywords:\s*\[([^\]]*)\]/.exec(line);
  if (!kwMatch) continue;
  const firstKeyword = /'((?:[^'\\]|\\.)*)'/.exec(kwMatch[1])?.[1] ?? '?';
  const hasNote = /\bnote:\s*'/.test(line);
  const hasOfficial = OFFICIAL_DESCRIPTION_KEYS[normalize(firstKeyword)] !== undefined;
  if (!hasNote && !hasOfficial) {
    withoutNote++;
    orphans.push(firstKeyword);
  }
}
void entryRegex;
console.log('  •', lines.length, 'entrées analysées');
check('0 entrée sans description (note ou officielle)', withoutNote === 0, orphans.slice(0, 20).join(', '));

// ── 2. Plus aucun texte générique « non répertorié » ───────────
console.log('\n[2] Textes génériques supprimés');
const GENERIC_PATTERNS = [
  "n'est pas répertorié dans la base",
  "n'est pas répertorié individuellement",
  'is not listed in the ToxiScan database',
  'is not individually listed in the ToxiScan database',
  '데이터베이스에 등록되어 있지 않습니다',
  '데이터베이스에 개별 등록되어 있지 않습니다',
];
const SOURCE_FILES = ['utils/api.ts', 'utils/ingredientKnowledge.ts', 'utils/officialDescriptions.ts', 'constants/ingredientsDatabase.ts', 'app/product/[barcode].tsx'];
const offenders: string[] = [];
for (const file of SOURCE_FILES) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  const src = fs.readFileSync(full, 'utf-8');
  src.split('\n').forEach((line, i) => {
    // Les commentaires expliquant la règle sont autorisés.
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    for (const pattern of GENERIC_PATTERNS) {
      if (line.includes(pattern)) offenders.push(`${file}:${i + 1}`);
    }
  });
}
check('0 occurrence du texte générique dans le code', offenders.length === 0, offenders.join(', '));

// ── 3. Moteur de connaissance : familles couvertes ─────────────
console.log('\n[3] Moteur de connaissance (ingrédients inconnus)');
const knowledgeSrc = fs.readFileSync(path.join(ROOT, 'utils', 'ingredientKnowledge.ts'), 'utf-8');
const ruleIds = [...knowledgeSrc.matchAll(/^\s{4}id:\s*'([^']+)'/gm)].map((m) => m[1]);
console.log('  •', ruleIds.length, 'familles :', ruleIds.join(', '));
check('≥ 20 familles couvertes', ruleIds.length >= 20);
check('famille « coloring » présente', ruleIds.includes('coloring'));
check('repli par badge présent (buildRiskReasonDescription)', knowledgeSrc.includes('export function buildRiskReasonDescription'));

// ── 4. Entrée « Colorants » ────────────────────────────────────
console.log('\n[4] Entrée « Colorants »');
const colorantLine = lines.find((l) => /keywords:\s*\['colorant',/.test(l));
check('entrée présente', Boolean(colorantLine));
if (colorantLine) {
  check("badge = Transformé (orange / risk 'probable')", /risk:\s*'probable'/.test(colorantLine) && /circ:\s*'Transformé'/.test(colorantLine));
  check('description figée (fixed: true)', /fixed:\s*true/.test(colorantLine));
  check(
    'texte exact demandé',
    colorantLine.includes("Additifs utilisés pour donner ou renforcer la couleur d\\'un aliment.") &&
      colorantLine.includes('La présence de colorants indique surtout un produit transformé.'),
  );
}

console.log(failures === 0 ? '\n✅ Audit OK\n' : `\n❌ ${failures} échec(s)\n`);
process.exit(failures === 0 ? 0 : 1);
