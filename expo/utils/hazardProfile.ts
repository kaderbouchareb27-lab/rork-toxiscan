/**
 * Bridge between the hazard registry (data) and the app (badges + UI labels).
 *
 * - `hazardEntryForKeywords` / `hazardEntryForName` resolve an ingredient to its hazard
 *   profile. ONLY the entries present in `constants/hazardRegistry.json` are resolved:
 *   the engine is never run over an unannotated ingredient (see the registry `_meta`).
 * - `computeEngineBadge` returns the COMPUTED badge for an annotated ingredient, skipping
 *   the `_manual_badge` entries (sugar / benignity axes the engine does not model).
 * - `advisoryPillText` / `iarcBadgeLabel` produce the localized UI strings.
 *
 * This module must NOT import `utils/api` (the ingredient database imports it, which would
 * create a cycle). Name resolution here is registry-only, by design.
 */
import {
  HAZARD_REGISTRY,
  HAZARD_REGISTRY_KEYS,
  isEngineDriven,
  normalizeHazardKey,
  type HazardRegistryEntry,
} from '@/constants/hazardRegistry';
import { computeBadge, type Advisory, type Badge, type BadgeResult, type IarcGroup, type Risk } from '@/utils/badgeEngine';
import { ULTRA_TOXIC_CIRC } from '@/constants/ultraToxicIngredients';
import { t } from '@/utils/i18n';

/**
 * Badge an ingredient CURRENTLY shows, from its stored risk + classification. Mirrors what
 * the ingredient row renders (the ultra-toxic sentinel wins over the generic risk mapping),
 * so the audit compares like with like.
 */
export function badgeFromRiskAndCirc(risk: Risk, circ: string | null | undefined): Badge {
  if (risk === 'danger') return circ === ULTRA_TOXIC_CIRC ? 'Ultra toxic' : 'Carcinogenic';
  if (risk === 'probable') return 'Processed';
  if (risk === 'possible') return 'Occasional';
  return 'Approved';
}

/** Registry entry whose key matches one of the ingredient's keywords EXACTLY. */
export function hazardEntryForKeywords(keywords: readonly string[]): HazardRegistryEntry | undefined {
  for (const keyword of keywords) {
    const entry = HAZARD_REGISTRY.get(normalizeHazardKey(keyword));
    if (entry) return entry;
  }
  return undefined;
}

/** True when `key` appears in `haystack` as a whole word (plural tolerated). */
function matchesWholeWord(haystack: string, key: string): boolean {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}s?(?:$|[^a-z0-9])`).test(haystack);
}

/**
 * Registry entry for a free-text ingredient name ("Espadon grillé", "foie de volaille").
 * Exact key first, then the LONGEST key appearing as a whole word — so "thon rouge"
 * resolves to `thon` while "tomate" never resolves to `mate`.
 */
export function hazardEntryForName(name: string): HazardRegistryEntry | undefined {
  const normalized = normalizeHazardKey(name);
  if (!normalized) return undefined;
  const exact = HAZARD_REGISTRY.get(normalized);
  if (exact) return exact;
  for (const key of HAZARD_REGISTRY_KEYS) {
    if (key.length < 4) continue;
    if (matchesWholeWord(normalized, key)) return HAZARD_REGISTRY.get(key);
  }
  return undefined;
}

/**
 * Badge computed by the rule engine, or null when the ingredient is not engine-driven
 * (absent from the registry, or carrying a `_manual_badge`).
 */
export function computeEngineBadge(entry: HazardRegistryEntry | undefined): BadgeResult | null {
  if (!isEngineDriven(entry)) return null;
  return computeBadge(entry);
}

/** Engine badge for an ingredient identified by its database keywords. */
export function computeEngineBadgeForKeywords(keywords: readonly string[]): BadgeResult | null {
  return computeEngineBadge(hazardEntryForKeywords(keywords));
}

/**
 * IARC group of a `classification_circ` string ("Groupe 1", "Groupe 2A (3-MCPD)"…).
 * Display-only inference used for ingredients that carry an IARC group in the database
 * but are not annotated in the registry, so the honest label is applied app-wide.
 */
export function iarcGroupFromCirc(circ: string | null | undefined): IarcGroup {
  const normalized = normalizeHazardKey(circ ?? '');
  if (!normalized) return null;
  if (/\b2a\b/.test(normalized)) return '2A';
  if (/\b2b\b/.test(normalized)) return '2B';
  if (/\bgroupe 1\b/.test(normalized) || /\bgroup 1\b/.test(normalized)) return '1';
  return null;
}

/** Localized IARC badge label — never prints "CARCINOGENIC" on a Group 2A substance. */
export function iarcBadgeLabel(group: IarcGroup): string | null {
  switch (group) {
    case '1':
      return t('iarc_label_group1');
    case '2A':
      return t('iarc_label_group2a');
    case '2B':
      return t('iarc_label_group2b');
    default:
      return null; // Group 3 / unclassified — never advertise a cancer claim
  }
}

/** Localized advisory pill text, rendered NEXT TO the badge (never inside it). */
export function advisoryPillText(advisory: Advisory | undefined): string | null {
  switch (advisory) {
    case 'avoid_all':
      return t('advisory_avoid_all');
    case 'avoid_vulnerable':
      return t('advisory_avoid_vulnerable');
    case 'limit':
      return t('advisory_limit');
    default:
      return null;
  }
}

export interface IngredientHazardDisplay {
  /** Advisory pill text, or null when the ingredient carries no advisory. */
  advisoryText: string | null;
  /** Raw advisory, used to pick the pill tone. */
  advisory: Advisory | null;
  /** Honest cancer label replacing the generic tier label, or null. */
  iarcLabel: string | null;
}

/**
 * Everything the ingredient row needs to render the honest label + the advisory pill.
 * Resolution order: registry annotation first, then the stored IARC classification.
 */
export function ingredientHazardDisplay(ingredient: {
  nom?: string | null;
  classification_circ?: string | null;
}): IngredientHazardDisplay {
  const entry = ingredient.nom ? hazardEntryForName(ingredient.nom) : undefined;
  const group = entry?.iarc ?? iarcGroupFromCirc(ingredient.classification_circ);
  const advisory = entry?.advisory ?? null;
  return {
    advisory,
    advisoryText: advisoryPillText(advisory),
    iarcLabel: iarcBadgeLabel(group ?? null),
  };
}
