/**
 * ToxiScan — Badge engine.
 *
 * The badge is COMPUTED, never hand-picked. Adding a new ingredient can no
 * longer create an inconsistency: fill the hazard fields, the badge follows.
 *
 * Two axes are kept separate on purpose:
 *   - badge    = hazard tier (what colour the user sees)
 *   - advisory = "who should avoid this" (rendered as a separate pill in the UI)
 * A clean whole food can be dangerous for a subgroup (swordfish, liver, raw
 * milk, blue cheese). Forcing that into the badge is what broke the old system.
 *
 * This module is deliberately DEPENDENCY-FREE (no react-native, no i18n) so the
 * CI self-test and the audit can run it as pure logic.
 */

export type IarcGroup = '1' | '2A' | '2B' | '3' | null;

export type Origin =
  | 'additive' // deliberately added by the manufacturer
  | 'contaminant' // unintended: pollutant, residue, cooking by-product
  | 'processed_ingredient' // refined/technical, no hazard classification
  | 'whole_food'; // the food itself

export type Regulatory =
  | 'banned_toxicity' // delisted because harm was demonstrated
  | 'banned_datagap' // delisted because data were missing (NOT the same)
  | 'unauthorised_novel' // never authorised in this market
  | 'restricted' // authorised with a cap or warning label
  | 'authorised'
  | null;

export type Hazard =
  | 'no_safe_level' // heavy metals: no threshold considered safe
  | 'acute_severe' // severe non-cancer toxicity (PPD, paraquat)
  | 'reprotoxic' // classified toxic to reproduction
  | null;

export type Advisory =
  | 'avoid_all' // agencies advise everyone not to eat it
  | 'avoid_vulnerable' // pregnancy / children / immunocompromised
  | 'limit' // explicit portion limit
  | null;

export type Badge = 'Carcinogenic' | 'Ultra toxic' | 'Processed' | 'Occasional' | 'Approved';

export type Risk = 'danger' | 'probable' | 'possible' | 'aucun';

export interface HazardProfile {
  iarc?: IarcGroup;
  origin: Origin;
  regulatory?: Regulatory;
  hazard?: Hazard;
  advisory?: Advisory;
  /**
   * Name of the contaminant driving the advisory, when there is one.
   * This separates two very different situations that both produce an
   * advisory on a whole food:
   *   - liver      -> too much of an intrinsic nutrient (vitamin A). Still an
   *                   excellent food. Stays green, carries the pill.
   *   - swordfish  -> carries something that does not belong there
   *                   (methylmercury). Downgraded.
   * Without this field the engine rated swordfish the same as liver.
   */
  contaminant?: string;
}

export interface BadgeResult {
  badge: Badge;
  risk: Risk;
  /** Which rule fired — shown in the audit, never to the user. */
  rule: string;
  iarcLabel: string | null;
}

export const RISK_BY_BADGE: Readonly<Record<Badge, Risk>> = {
  'Carcinogenic': 'danger',
  'Ultra toxic': 'danger',
  'Processed': 'probable',
  'Occasional': 'possible',
  'Approved': 'aucun',
};

/**
 * Display label for the IARC group. Replaces the old behaviour of printing
 * "CARCINOGENIC" on a Group 2A substance, which was technically false.
 */
export function iarcLabel(group: IarcGroup): string | null {
  switch (group) {
    case '1':
      return 'Confirmed carcinogen';
    case '2A':
      return 'Probably carcinogenic';
    case '2B':
      return 'May cause cancer';
    case '3':
      return null; // not classifiable — never advertise this
    default:
      return null;
  }
}

/**
 * Rules are evaluated in strict order. First match wins.
 */
export function computeBadge(p: HazardProfile): BadgeResult {
  const label = iarcLabel(p.iarc ?? null);
  const out = (badge: Badge, rule: string): BadgeResult => ({
    badge,
    risk: RISK_BY_BADGE[badge],
    rule,
    iarcLabel: label,
  });

  // --- Tier 1: severe non-cancer hazard, or banned because harm was shown ---
  if (p.hazard === 'no_safe_level') return out('Ultra toxic', 'R1 no safe exposure level');
  if (p.hazard === 'acute_severe') return out('Ultra toxic', 'R2 severe acute toxicity');
  if (p.hazard === 'reprotoxic') return out('Ultra toxic', 'R3 classified toxic to reproduction');
  if (p.regulatory === 'banned_toxicity') return out('Ultra toxic', 'R4 delisted for demonstrated harm');

  // --- Tier 2: cancer classification ---
  if (p.iarc === '1') return out('Carcinogenic', 'R5 IARC Group 1');

  if (p.iarc === '2A') {
    // A 2A substance the manufacturer chose to add is avoidable.
    // A 2A contaminant or cooking by-product is not. That distinction is
    // the whole reason nitrite is red and acrylamide is orange.
    if (p.origin === 'additive' || p.advisory === 'avoid_all') {
      return out('Carcinogenic', 'R6 IARC 2A, deliberately added or avoid-all');
    }
    if (p.origin === 'contaminant') return out('Processed', 'R7 IARC 2A, unavoidable contaminant');
    if (p.origin === 'whole_food') return out('Occasional', 'R8 IARC 2A, whole food');
    return out('Processed', 'R9 IARC 2A, processed ingredient');
  }

  if (p.iarc === '2B') return out('Processed', 'R10 IARC Group 2B');

  // --- Tier 3: regulatory status without a cancer classification ---
  // A data gap is NOT proof of harm. E203 was Ultra toxic for this reason.
  if (p.regulatory === 'banned_datagap') return out('Processed', 'R11 delisted for missing data, not for harm');
  if (p.regulatory === 'unauthorised_novel') return out('Occasional', 'R12 not authorised in this market');

  // --- Tier 4: advisories on otherwise clean foods ---
  if (p.advisory === 'avoid_all') return out('Processed', 'R13 agencies advise avoiding');

  // A food carrying a contaminant is downgraded even when it is otherwise clean.
  if (p.contaminant && (p.advisory === 'avoid_vulnerable' || p.advisory === 'limit')) {
    return out('Occasional', `R14 advisory driven by ${p.contaminant}`);
  }

  if (p.advisory === 'avoid_vulnerable' && p.origin !== 'whole_food') {
    return out('Occasional', 'R15 advisory, not a whole food');
  }
  // A whole food whose advisory comes from an intrinsic nutrient keeps its
  // badge; the advisory is surfaced as a separate pill. Liver stays green AND
  // carries the pregnancy warning. Brazil nuts stay green with a portion pill.

  // --- Tier 5: degree of processing ---
  if (p.origin === 'additive' || p.origin === 'processed_ingredient') {
    return out('Processed', 'R16 additive or refined ingredient');
  }

  return out('Approved', 'R17 whole food, no hazard on file');
}

/**
 * The advisory pill, rendered next to the badge. This is what makes it
 * possible to keep liver green while still warning pregnant users.
 */
export function advisoryPill(a: Advisory): string | null {
  switch (a) {
    case 'avoid_all':
      return 'Health agencies advise avoiding';
    case 'avoid_vulnerable':
      return 'Not advised in pregnancy or for children';
    case 'limit':
      return 'Keep to a limited portion';
    default:
      return null;
  }
}
