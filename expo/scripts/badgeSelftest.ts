/**
 * Badge engine self-test — 24 cases covering the edge cases.
 *
 *   cd expo && bun scripts/badgeSelftest.ts
 *
 * Run it after ANY change to the engine. 24/24 must pass; with CI=1 a single
 * failure exits non-zero and fails the build.
 */
import { computeBadge, type Badge, type HazardProfile } from '@/utils/badgeEngine';

const cases: [string, HazardProfile, Badge][] = [
  // --- the 2A split: same IARC group, three different badges, all justified
  ['nitrite (additif)', { iarc: '2A', origin: 'additive' }, 'Carcinogenic'],
  ['acrylamide (cuisson)', { iarc: '2A', origin: 'contaminant' }, 'Processed'],
  ['viande rouge', { iarc: '2A', origin: 'whole_food' }, 'Occasional'],
  ['talc', { iarc: '2A', origin: 'additive' }, 'Carcinogenic'],
  ['mate (trop chaud)', { iarc: '2A', origin: 'whole_food' }, 'Occasional'],
  // --- Group 1
  ['pepperoni', { iarc: '1', origin: 'whole_food' }, 'Carcinogenic'],
  ['hijiki', { iarc: '1', origin: 'whole_food', advisory: 'avoid_all' }, 'Carcinogenic'],
  // --- ban for harm vs ban for missing data
  ['dioxyde de titane', { origin: 'additive', regulatory: 'banned_toxicity' }, 'Ultra toxic'],
  ['calcium sorbate', { origin: 'additive', regulatory: 'banned_datagap' }, 'Processed'],
  // --- non-cancer severe hazard
  ['plomb', { origin: 'contaminant', hazard: 'no_safe_level' }, 'Ultra toxic'],
  ['ppd', { origin: 'additive', hazard: 'acute_severe' }, 'Ultra toxic'],
  ['acide borique', { origin: 'additive', hazard: 'reprotoxic' }, 'Ultra toxic'],
  // --- downgrades: evidence lighter than the old badge
  ['sulfate de cuivre', { origin: 'additive', regulatory: 'restricted' }, 'Processed'],
  // --- THE FIX: intrinsic nutrient vs contaminant, both on a whole food
  ['foie (vit. A)', { origin: 'whole_food', advisory: 'avoid_vulnerable' }, 'Approved'],
  ['noix du bresil (Se)', { origin: 'whole_food', advisory: 'limit' }, 'Approved'],
  ['kombu (iode)', { origin: 'whole_food', advisory: 'limit' }, 'Approved'],
  ['brie (listeria ok)', { origin: 'whole_food', advisory: 'avoid_vulnerable' }, 'Approved'],
  ['espadon (mercure)', { origin: 'whole_food', advisory: 'avoid_vulnerable', contaminant: 'methylmercury' }, 'Occasional'],
  ['thon (mercure)', { origin: 'whole_food', advisory: 'limit', contaminant: 'methylmercury' }, 'Occasional'],
  ['lait cru (pathog.)', { origin: 'whole_food', advisory: 'avoid_vulnerable', contaminant: 'pathogens' }, 'Occasional'],
  // --- misc
  ['saccharine (Gr.3)', { iarc: '3', origin: 'additive' }, 'Processed'],
  ['aspartame', { iarc: '2B', origin: 'additive' }, 'Processed'],
  ['allulose (non aut.)', { origin: 'additive', regulatory: 'unauthorised_novel' }, 'Occasional'],
  ['pomme', { origin: 'whole_food' }, 'Approved'],
];

let fail = 0;
for (const [name, profile, expected] of cases) {
  const result = computeBadge(profile);
  const ok = result.badge === expected;
  if (!ok) fail += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(22)} -> ${result.badge.padEnd(13)} ${result.rule}`);
}

console.log(fail === 0 ? `\nAll ${cases.length} rule cases pass.` : `\n${fail} FAILED out of ${cases.length}`);
if (fail > 0) process.exit(1);
