/**
 * ToxiScan — badge audit.
 *
 *   cd expo && bun --preload ./scripts/lib/nativeStub.ts scripts/badgeAudit.ts
 *   CI=1 …                                  → exits 1 on any divergence
 *
 * Runs the badge engine over the whole database and reports every entry whose STORED badge
 * (the hand-written literal in `constants/ingredientsDatabase.ts`) does not match the
 * computed one. Wired into CI: a mismatch fails the build. That is what makes the
 * inconsistency impossible to reintroduce.
 *
 * Scope, on purpose (see the registry `_meta.known_limit`):
 *   - only the entries present in `constants/hazardRegistry.json` are checked;
 *   - `_manual_badge` entries are skipped — their tier comes from a nutrition/benignity
 *     axis (WHO free sugars) that the engine deliberately does not model.
 */
import { computeBadge } from '@/utils/badgeEngine';
import { badgeFromRiskAndCirc } from '@/utils/hazardProfile';
import { HAZARD_REGISTRY, normalizeHazardKey } from '@/constants/hazardRegistry';
import { INGREDIENTS_DATABASE_RAW, type IngredientEntry } from '@/constants/ingredientsDatabase';

interface Row {
  readonly key: string;
  readonly name: string;
  readonly stored: string;
  readonly computed: string;
  readonly rule: string;
  readonly note?: string;
}

function entryForKey(key: string): IngredientEntry | undefined {
  return INGREDIENTS_DATABASE_RAW.find((entry) =>
    entry.keywords.some((keyword) => normalizeHazardKey(keyword) === key),
  );
}

const changes: Row[] = [];
const confirms: Row[] = [];
const manual: string[] = [];
const orphanKeys: string[] = [];

for (const [key, registryEntry] of HAZARD_REGISTRY) {
  const entry = entryForKey(key);
  if (!entry) {
    orphanKeys.push(key);
    continue;
  }
  const manualBadge = registryEntry._manual_badge;
  if (manualBadge !== undefined) {
    manual.push(`${key} → kept by hand: ${manualBadge}`);
    continue;
  }
  const result = computeBadge(registryEntry);
  const stored = badgeFromRiskAndCirc(entry.risk, entry.circ);
  const row: Row = {
    key,
    name: entry.keywords[0] ?? key,
    stored,
    computed: result.badge,
    rule: result.rule,
    note: registryEntry._note,
  };
  if (stored === result.badge) confirms.push(row);
  else changes.push(row);
}

const line = (r: Row): string =>
  `${r.name.padEnd(28)} ${r.stored.padEnd(13)} -> ${r.computed.padEnd(13)} [${r.rule}]` +
  (r.note ? `\n    ${r.note}` : '');

console.log('='.repeat(78));
console.log(`BADGE CHANGES  (${changes.length})`);
console.log('='.repeat(78));
changes.forEach((r) => console.log(line(r)));

console.log('\n' + '='.repeat(78));
console.log(`CONFIRMED — engine agrees with the stored badge  (${confirms.length})`);
console.log('='.repeat(78));
confirms.forEach((r) => console.log(line(r)));

console.log('\n' + '='.repeat(78));
console.log(`SKIPPED — hand-set badge, nutrition/benignity axis  (${manual.length})`);
console.log('='.repeat(78));
manual.forEach((l) => console.log(l));

console.log('\n' + '='.repeat(78));
console.log(`REGISTRY KEYS WITH NO DATABASE ENTRY  (${orphanKeys.length})`);
console.log('='.repeat(78));
console.log('These annotations match no ingredient keyword — dead data, or a keyword typo.');
console.log(orphanKeys.join(', ') || '(none)');

const engineDriven = changes.length + confirms.length;
console.log(
  `\n${engineDriven} engine-driven entries checked · ${INGREDIENTS_DATABASE_RAW.length - engineDriven} keep their hand-set badge (not annotated).`,
);

if (process.env.CI && (changes.length > 0 || orphanKeys.length > 0)) {
  console.error(
    `\nFAIL: ${changes.length} badge(s) diverge from the rule, ${orphanKeys.length} orphan registry key(s).`,
  );
  process.exit(1);
}
