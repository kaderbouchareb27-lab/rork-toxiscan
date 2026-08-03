/**
 * Typed access to `hazardRegistry.json` — the ONLY file to edit when annotating an
 * ingredient. Fill `origin` (mandatory) plus any of iarc / regulatory / hazard /
 * advisory / contaminant that apply; the badge is then computed by `utils/badgeEngine`.
 *
 * KNOWN LIMIT (documented in the registry `_meta` block): only the entries present in
 * this registry are engine-driven. Everything else keeps its hand-set badge — running
 * the engine's default over unannotated additives would push every benign authorised
 * additive (gums, citrates, lactates, phosphates) from Occasional to Processed, and
 * that "benignity" axis is editorial, not a hazard rule.
 */
import registryJson from './hazardRegistry.json';
import type { Advisory, Badge, Hazard, HazardProfile, IarcGroup, Origin, Regulatory } from '@/utils/badgeEngine';

export interface HazardRegistryEntry extends HazardProfile {
  readonly iarc?: IarcGroup;
  readonly origin: Origin;
  readonly regulatory?: Regulatory;
  readonly hazard?: Hazard;
  readonly advisory?: Advisory;
  readonly contaminant?: string;
  /** Badge the entry carried before the engine took over — audit trail only. */
  readonly _was?: string;
  readonly _note?: string;
  /**
   * Editorial badge kept BY HAND. The engine skips these entries entirely: their tier
   * comes from a nutrition axis (WHO free sugars) or from a benignity judgement among
   * authorised additives, neither of which the engine models.
   */
  readonly _manual_badge?: Badge;
}

interface RegistryFile {
  readonly _meta: Readonly<Record<string, string>>;
  readonly ingredients: Readonly<Record<string, unknown>>;
}

/**
 * Same normalisation as the ingredient lookup index (lowercase, accents stripped,
 * punctuation collapsed to spaces) so a registry key matches a database keyword exactly.
 * Kept dependency-free on purpose: this module must stay importable by the pure scripts.
 */
export function normalizeHazardKey(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const file = registryJson as unknown as RegistryFile;

export const HAZARD_REGISTRY_META: Readonly<Record<string, string>> = file._meta;

/** Registry entries keyed by their normalised name. `_comment_*` rows are dropped. */
export const HAZARD_REGISTRY: ReadonlyMap<string, HazardRegistryEntry> = (() => {
  const map = new Map<string, HazardRegistryEntry>();
  for (const [rawKey, value] of Object.entries(file.ingredients)) {
    if (rawKey.startsWith('_comment')) continue;
    if (typeof value !== 'object' || value === null) continue;
    const key = normalizeHazardKey(rawKey);
    if (!key) continue;
    map.set(key, value as HazardRegistryEntry);
  }
  return map;
})();

/** Registry keys sorted longest-first, for word-boundary matching on free-text names. */
export const HAZARD_REGISTRY_KEYS: readonly string[] = [...HAZARD_REGISTRY.keys()].sort(
  (a, b) => b.length - a.length,
);

/** True when the engine owns this entry's badge (annotated and not hand-overridden). */
export function isEngineDriven(entry: HazardRegistryEntry | undefined): entry is HazardRegistryEntry {
  return entry !== undefined && entry._manual_badge === undefined;
}
