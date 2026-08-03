/**
 * Rewrites the HAND-WRITTEN badge of every engine-driven entry in
 * `constants/ingredientsDatabase.ts` with the badge computed by `utils/badgeEngine`.
 *
 *   cd expo && bun --preload ./scripts/lib/nativeStub.ts scripts/syncEngineBadges.ts
 *
 * A badge is never typed in by hand on an annotated ingredient: annotate it in
 * `constants/hazardRegistry.json`, run this script, and `scripts/badgeAudit.ts` verifies
 * the result in CI. Entries absent from the registry are never touched.
 */
import * as fs from 'fs';
import * as path from 'path';
import { computeBadge, RISK_BY_BADGE, type Badge } from '@/utils/badgeEngine';
import { HAZARD_REGISTRY, isEngineDriven, normalizeHazardKey, type HazardRegistryEntry } from '@/constants/hazardRegistry';
import { ULTRA_TOXIC_CIRC } from '@/constants/ultraToxicIngredients';

const DB_PATH = path.join(process.cwd(), 'constants', 'ingredientsDatabase.ts');

/** Same rule as `engineCirc` in the database module — kept in sync deliberately. */
function targetCirc(currentCirc: string, badge: Badge, profile: HazardRegistryEntry): string {
  if (badge === 'Ultra toxic') return ULTRA_TOXIC_CIRC;
  const iarc = profile.iarc ?? null;
  if (iarc === '1') return currentCirc.includes('Groupe 1') ? currentCirc : 'Groupe 1';
  if (iarc === '2A') return currentCirc.includes('2A') ? currentCirc : 'Groupe 2A';
  if (iarc === '2B') return currentCirc.includes('2B') ? currentCirc : 'Groupe 2B';
  if (currentCirc !== ULTRA_TOXIC_CIRC) return currentCirc;
  if (profile.regulatory === 'banned_datagap' || profile.regulatory === 'banned_toxicity') return 'Interdit UE';
  if (profile.origin === 'whole_food') return 'Naturel — à modérer';
  return 'Transformé';
}

const KEYWORDS_RE = /keywords:\s*\[([^\]]*)\]/;
const RISK_RE = /risk:\s*'([^']*)'/;
const CIRC_RE = /circ:\s*'((?:[^'\\]|\\.)*)'/;

const lines = fs.readFileSync(DB_PATH, 'utf-8').split('\n');
const changed: string[] = [];

const updated = lines.map((line) => {
  const keywordsMatch = KEYWORDS_RE.exec(line);
  if (!keywordsMatch || !RISK_RE.test(line) || !CIRC_RE.test(line)) return line;

  const keywords = [...keywordsMatch[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'"));
  let profile: HazardRegistryEntry | undefined;
  for (const keyword of keywords) {
    const candidate = HAZARD_REGISTRY.get(normalizeHazardKey(keyword));
    if (candidate) {
      profile = candidate;
      break;
    }
  }
  if (!isEngineDriven(profile)) return line;

  const result = computeBadge(profile);
  const currentRisk = RISK_RE.exec(line)?.[1] ?? '';
  const currentCirc = (CIRC_RE.exec(line)?.[1] ?? '').replace(/\\'/g, "'");
  const nextRisk = RISK_BY_BADGE[result.badge];
  const nextCirc = targetCirc(currentCirc, result.badge, profile);
  if (currentRisk === nextRisk && currentCirc === nextCirc) return line;

  changed.push(
    `${(keywords[0] ?? '?').padEnd(26)} risk ${currentRisk} → ${nextRisk} · circ "${currentCirc}" → "${nextCirc}"  [${result.rule}]`,
  );
  return line
    .replace(RISK_RE, `risk: '${nextRisk}'`)
    .replace(CIRC_RE, `circ: '${nextCirc.replace(/'/g, "\\'")}'`);
});

fs.writeFileSync(DB_PATH, updated.join('\n'), 'utf-8');
console.log(`${changed.length} entrée(s) réalignée(s) sur le moteur :`);
changed.forEach((l) => console.log('  ' + l));
