/**
 * ToxiScore engine self-test — note /10 100 % déterministe + alignement badge/tier.
 *
 *   cd expo && bun scripts/toxiScoreSelftest.ts
 *
 * Run it after ANY change to utils/toxiScore.ts or utils/verdictTier.ts.
 * Every case must pass; a single failure exits non-zero (CI-friendly).
 *
 * Covers:
 *  - valeurs exactes attendues (exemples produit réels : Doritos-like, Roulba-like…),
 *  - invariant « le score reste dans la tranche du badge, quels que soient les ingrédients »,
 *  - monotonie (plus d'ingrédients nocifs → note plus basse dans la même tranche),
 *  - arrondi à 1 décimale, déterminisme, régression de l'ancien bug (note fixe par badge),
 *  - alignement tier de verdict (verdictTier.ts) ↔ tranche de score.
 */
import { computeToxiScore, ingredientLevel } from '@/utils/toxiScore';
import type { ToxiScoreLevel } from '@/utils/toxiScore';
import { computeVerdictTier } from '@/utils/verdictTier';
import type { RiskLevel } from '@/utils/verdictTier';
import type { VerdictTier } from '@/types';

const BANDS: Record<ToxiScoreLevel, [number, number]> = {
  danger: [0, 1.9],
  ultratoxic: [2, 3.9],
  warning: [4, 5.9],
  moderation: [6, 7.9],
  approuve: [8, 10],
};

type Severity = 'aucun' | 'possible' | 'probable' | 'ultratoxic' | 'danger';
type Ing = { niveau_risque: RiskLevel; classification_circ: string | null };

/** Bâtit un ingrédient. « ultratoxic » est estampillé avec le sentinel circ. */
function ing(level: Severity, circ: string | null = null): Ing {
  if (level === 'ultratoxic') return { niveau_risque: 'danger', classification_circ: 'Ultra toxique' };
  return { niveau_risque: level, classification_circ: circ };
}

function mix(...entries: [Severity, number][]): Ing[] {
  const out: Ing[] = [];
  for (const [level, count] of entries) {
    for (let i = 0; i < count; i++) out.push(ing(level));
  }
  return out;
}

function tierToLevel(tier: VerdictTier): ToxiScoreLevel {
  switch (tier) {
    case 'ultra_toxic': return 'ultratoxic';
    case 'carcinogenic': return 'danger';
    case 'processed': return 'warning';
    case 'moderation': return 'moderation';
    case 'approved':
    default: return 'approuve';
  }
}

let total = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = ''): void {
  total += 1;
  if (!ok) fail += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

// ─────────────────────────────────────────────────────────────────────
// 1. Valeurs exactes attendues (la décimale suit la sévérité cumulée)
// ─────────────────────────────────────────────────────────────────────
const exactCases: [string, ToxiScoreLevel, Ing[], number][] = [
  ['Occasionnel : 2 jaunes + 8 verts', 'moderation', mix(['possible', 2], ['aucun', 8]), 7.5],
  ['Occasionnel : 8 jaunes + 2 verts', 'moderation', mix(['possible', 8], ['aucun', 2]), 6.4],
  ['Occasionnel : 100 % jaune', 'moderation', mix(['possible', 10]), 6.0],
  ['Occasionnel : 100 % vert', 'moderation', mix(['aucun', 10]), 7.9],
  ['Occasionnel : 2 orange isolés + 8 verts', 'moderation', mix(['probable', 2], ['aucun', 8]), 7.1],
  ['Occasionnel : 3 orange (plafond de tranche)', 'moderation', mix(['probable', 3]), 6.0],
  ['Ultra toxique : 1 rouge + 4 verts (produit court)', 'ultratoxic', mix(['ultratoxic', 1], ['aucun', 4]), 3.5],
  ['Ultra toxique : 1 rouge + 7 transformés + 2 verts (Doritos-like)', 'ultratoxic', mix(['ultratoxic', 1], ['probable', 7], ['aucun', 2]), 2.8],
  ['Ultra toxique : rouge seul', 'ultratoxic', mix(['ultratoxic', 1]), 2.0],
  ['Ultra toxique : 1 rouge + 9 verts', 'ultratoxic', mix(['ultratoxic', 1], ['aucun', 9]), 3.7],
  ['Cancérigène : 1 + 9 verts', 'danger', mix(['danger', 1], ['aucun', 9]), 1.7],
  ['Cancérigène : seul', 'danger', mix(['danger', 1]), 0.0],
  ['Cancérigène : 2 + 8 verts', 'danger', mix(['danger', 2], ['aucun', 8]), 1.5],
  ['Transformé : 6 orange + 4 verts', 'warning', mix(['probable', 6], ['aucun', 4]), 4.8],
  ['Transformé : 100 % orange', 'warning', mix(['probable', 10]), 4.0],
  ['Transformé : 4 orange + 6 jaunes', 'warning', mix(['probable', 4], ['possible', 6]), 4.6],
  ['Approuvé : 100 % vert', 'approuve', mix(['aucun', 10]), 10.0],
  ['Approuvé : 2 jaunes + 8 verts', 'approuve', mix(['possible', 2], ['aucun', 8]), 9.6],
  ['Approuvé : 100 % jaune', 'approuve', mix(['possible', 10]), 8.0],
  ['Liste vide — Cancérigène → milieu de tranche', 'danger', [], 1.0],
  ['Liste vide — Ultra toxique → milieu de tranche', 'ultratoxic', [], 3.0],
  ['Liste vide — Transformé → milieu de tranche', 'warning', [], 5.0],
  ['Liste vide — Occasionnel → milieu de tranche', 'moderation', [], 7.0],
  ['Liste vide — Approuvé → milieu de tranche', 'approuve', [], 9.0],
];

for (const [name, level, ingredients, expected] of exactCases) {
  const score = computeToxiScore(level, ingredients);
  check(name, score === expected, `got ${score}, expected ${expected}`);
}

// ─────────────────────────────────────────────────────────────────────
// 2. ingredientLevel — sentinel Ultra toxique et niveaux de base
// ─────────────────────────────────────────────────────────────────────
const levelCases: [string, { niveau_risque?: string | null; classification_circ?: string | null }, string][] = [
  ['sentinel Ultra toxique sur « possible »', { niveau_risque: 'possible', classification_circ: 'Ultra toxique' }, 'ultratoxic'],
  ['sentinel Ultra toxique sur « danger »', { niveau_risque: 'danger', classification_circ: 'Ultra toxique' }, 'ultratoxic'],
  ['CIRC Groupe 1 → danger', { niveau_risque: 'danger', classification_circ: 'Groupe 1' }, 'danger'],
  ['CIRC Groupe 2B → probable', { niveau_risque: 'probable', classification_circ: 'Groupe 2B' }, 'probable'],
  ['possible → possible', { niveau_risque: 'possible', classification_circ: null }, 'possible'],
  ['aucun → aucun', { niveau_risque: 'aucun', classification_circ: null }, 'aucun'],
  ['sans niveau_risque → aucun', { niveau_risque: null, classification_circ: null }, 'aucun'],
  ['niveau inconnu → aucun', { niveau_risque: 'inconnu', classification_circ: null }, 'aucun'],
];

for (const [name, input, expected] of levelCases) {
  const result = ingredientLevel(input);
  check(`ingredientLevel : ${name}`, result === expected, `got ${result}`);
}

// ─────────────────────────────────────────────────────────────────────
// 3. Alignement tier de verdict (verdictTier.ts) ↔ tranche de score :
//    le score ne peut JAMAIS contredire le badge affiché.
// ─────────────────────────────────────────────────────────────────────
const tierCases: [string, Ing[], ToxiScoreLevel][] = [
  ['4 orange + 6 verts → Transformé', mix(['probable', 4], ['aucun', 6]), 'warning'],
  ['2 jaunes + 8 verts → Approuvé', mix(['possible', 2], ['aucun', 8]), 'approuve'],
  ['3 jaunes → Occasionnel', mix(['possible', 3]), 'moderation'],
  ['1 ultra-toxique + 4 verts → Ultra toxique', mix(['ultratoxic', 1], ['aucun', 4]), 'ultratoxic'],
  ['1 Groupe 1 + 9 verts → Cancérigène', [ing('danger', 'Groupe 1'), ...mix(['aucun', 9])], 'danger'],
  ['2 orange isolés + 8 verts → Occasionnel', mix(['probable', 2], ['aucun', 8]), 'moderation'],
  ['10 orange → Ultra toxique (escalade)', mix(['probable', 10]), 'ultratoxic'],
];

for (const [name, ingredients, expectedLevel] of tierCases) {
  const tier = computeVerdictTier(ingredients);
  const level = tierToLevel(tier);
  const score = computeToxiScore(level, ingredients);
  const [min, max] = BANDS[level];
  const inBand = score >= min && score <= max;
  check(
    `Tier + score alignés : ${name}`,
    level === expectedLevel && inBand,
    `tier=${tier} score=${score} band=[${min},${max}]`,
  );
}

// ─────────────────────────────────────────────────────────────────────
// 4. Invariants globaux : 500 tirages aléatoires × 5 tranches
// ─────────────────────────────────────────────────────────────────────
const severities: Severity[] = ['aucun', 'possible', 'probable', 'ultratoxic', 'danger'];
let bandViolations = 0;
let roundingViolations = 0;
for (const level of Object.keys(BANDS) as ToxiScoreLevel[]) {
  for (let t = 0; t < 500; t++) {
    const size = 1 + Math.floor(Math.random() * 12);
    const list: Ing[] = [];
    for (let i = 0; i < size; i++) {
      list.push(ing(severities[Math.floor(Math.random() * severities.length)]));
    }
    const score = computeToxiScore(level, list);
    const [min, max] = BANDS[level];
    if (score < min || score > max) bandViolations += 1;
    if (score !== Math.round(score * 10) / 10) roundingViolations += 1;
  }
}
check('2500 tirages : le score reste toujours dans la tranche du badge', bandViolations === 0, `${bandViolations} violations`);
check('2500 tirages : toujours 1 décimale maximum', roundingViolations === 0, `${roundingViolations} violations`);

// ─────────────────────────────────────────────────────────────────────
// 5. Monotonie : plus d'ingrédients nocifs → note ≤, jamais mieux
// ─────────────────────────────────────────────────────────────────────
const monoCases: [string, ToxiScoreLevel, Ing[], Ing[]][] = [
  ['Occasionnel : 0 jaune ≥ 2 jaunes', 'moderation', mix(['aucun', 10]), mix(['possible', 2], ['aucun', 8])],
  ['Occasionnel : 2 jaunes ≥ 8 jaunes', 'moderation', mix(['possible', 2], ['aucun', 8]), mix(['possible', 8], ['aucun', 2])],
  ['Occasionnel : 8 jaunes ≥ 10 jaunes', 'moderation', mix(['possible', 8], ['aucun', 2]), mix(['possible', 10])],
  ['Transformé : 4 orange ≥ 9 orange', 'warning', mix(['probable', 4], ['aucun', 6]), mix(['probable', 9], ['aucun', 1])],
  ['Ultra toxique : 1 rouge ≥ 1 rouge + 7 orange', 'ultratoxic', mix(['ultratoxic', 1], ['aucun', 9]), mix(['ultratoxic', 1], ['probable', 7], ['aucun', 2])],
  ['Cancérigène : 1 ≥ 2', 'danger', mix(['danger', 1], ['aucun', 9]), mix(['danger', 2], ['aucun', 8])],
];

for (const [name, level, cleaner, dirtier] of monoCases) {
  const a = computeToxiScore(level, cleaner);
  const b = computeToxiScore(level, dirtier);
  check(`Monotonie : ${name}`, a >= b, `${a} vs ${b}`);
}

// ─────────────────────────────────────────────────────────────────────
// 6. Déterminisme + régression de l'ancien bug (note fixe par badge)
// ─────────────────────────────────────────────────────────────────────
const d1 = computeToxiScore('moderation', mix(['possible', 3], ['aucun', 7]));
const d2 = computeToxiScore('moderation', mix(['possible', 3], ['aucun', 7]));
check('Déterminisme : même entrée → même note', d1 === d2, `${d1} vs ${d2}`);

const few = computeToxiScore('moderation', mix(['possible', 2], ['aucun', 8]));
const many = computeToxiScore('moderation', mix(['possible', 8], ['aucun', 2]));
check(
  'Régression : 2 jaunes ≠ 8 jaunes ≠ 7 (l\'ancien bug donnait 7 partout)',
  few !== many && few !== 7,
  `${few} vs ${many}`,
);

console.log(fail === 0 ? `\nAll ${total} cases pass.` : `\n${fail} FAILED out of ${total}`);
if (fail > 0) process.exit(1);
