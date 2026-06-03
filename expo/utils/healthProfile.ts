import { isEnglish } from '@/utils/i18n';

/**
 * Dr. Toxi profile memory.
 *
 * The user tells Dr. Toxi once who they are (pregnant, avoiding sugar, vegan…)
 * and he remembers it to personalize every analysis and recommend the right
 * alternatives. This mirrors the cached-module pattern used by
 * {@link ./regionDetection}: the provider persists the profile and pushes it
 * into a module-level cache here, which the (non-React) prompt builders read at
 * send/scan time.
 *
 * IMPORTANT: the profile NEVER changes an ingredient's official color verdict
 * (the database + scan remain the single source of truth). It only steers the
 * tone, the warnings, and which alternatives get suggested.
 */

export type HealthPrefId =
  | 'pregnant'
  | 'breastfeeding'
  | 'kids'
  | 'avoid_sugar'
  | 'avoid_sweeteners'
  | 'avoid_additives'
  | 'low_sodium'
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'lactose_free';

export type HealthPrefGroup = 'life' | 'diet';

export interface HealthProfile {
  prefs: HealthPrefId[];
  note: string;
}

export const EMPTY_HEALTH_PROFILE: HealthProfile = { prefs: [], note: '' };

export interface HealthPrefMeta {
  id: HealthPrefId;
  group: HealthPrefGroup;
  /** lucide-react-native icon name, resolved to a component in the UI */
  icon: string;
  labelFr: string;
  labelEn: string;
  /** Short directive injected into the AI prompt when this pref is active */
  aiFr: string;
  aiEn: string;
}

export const HEALTH_PREFS: HealthPrefMeta[] = [
  {
    id: 'pregnant',
    group: 'life',
    icon: 'HeartPulse',
    labelFr: 'Enceinte',
    labelEn: 'Pregnant',
    aiFr: "elle est enceinte : redouble de vigilance sur l'alcool, la charcuterie (nitrites + listériose), la caféine et les additifs controversés ; rassure avec tact, sans l'alarmer",
    aiEn: 'she is pregnant: be extra careful about alcohol, cured meats (nitrites + listeria), caffeine and controversial additives; reassure gently without alarming her',
  },
  {
    id: 'breastfeeding',
    group: 'life',
    icon: 'Baby',
    labelFr: 'J\u2019allaite',
    labelEn: 'Breastfeeding',
    aiFr: "elle allaite : même prudence que pendant la grossesse, privilégie toujours le plus naturel et le moins transformé possible",
    aiEn: 'she is breastfeeding: same caution as pregnancy, always favor the most natural, least processed option',
  },
  {
    id: 'kids',
    group: 'life',
    icon: 'Users',
    labelFr: 'Pour mes enfants',
    labelEn: 'For my kids',
    aiFr: "il fait les courses pour ses enfants : traque en priorité les colorants azoïques, le sucre ajouté et les additifs, et propose des alternatives adaptées aux enfants",
    aiEn: 'they shop for their kids: prioritize spotting azo dyes, added sugar and additives, and suggest kid-friendly alternatives',
  },
  {
    id: 'avoid_sugar',
    group: 'diet',
    icon: 'Candy',
    labelFr: 'J\u2019évite le sucre',
    labelEn: 'Avoiding sugar',
    aiFr: "il évite le sucre : repère et signale tous les sucres ajoutés et sirops, et oriente vers des versions sans sucre ajouté",
    aiEn: 'they avoid sugar: spot and flag every added sugar and syrup, and steer toward no-added-sugar versions',
  },
  {
    id: 'avoid_sweeteners',
    group: 'diet',
    icon: 'FlaskConical',
    labelFr: 'J\u2019évite les édulcorants',
    labelEn: 'Avoiding sweeteners',
    aiFr: "il évite les édulcorants de synthèse (aspartame, sucralose, acésulfame K) : préfère-lui des produits sans édulcorant artificiel",
    aiEn: 'they avoid artificial sweeteners (aspartame, sucralose, acesulfame K): favor products with no synthetic sweetener',
  },
  {
    id: 'avoid_additives',
    group: 'diet',
    icon: 'TestTube',
    labelFr: 'Zéro additif',
    labelEn: 'No additives',
    aiFr: "il veut zéro additif : vise les listes d'ingrédients les plus courtes, sans code E controversé",
    aiEn: 'they want zero additives: aim for the shortest ingredient lists, with no controversial E-number',
  },
  {
    id: 'low_sodium',
    group: 'diet',
    icon: 'Heart',
    labelFr: 'Peu de sel',
    labelEn: 'Low salt',
    aiFr: "il surveille son sel (cœur / tension) : signale les produits très salés et propose des options pauvres en sodium",
    aiEn: 'they watch their salt (heart / blood pressure): flag very salty products and suggest low-sodium options',
  },
  {
    id: 'vegetarian',
    group: 'diet',
    icon: 'Salad',
    labelFr: 'Végétarien',
    labelEn: 'Vegetarian',
    aiFr: "il est végétarien : ne propose jamais d'alternative à base de viande ou de poisson",
    aiEn: 'they are vegetarian: never suggest a meat- or fish-based alternative',
  },
  {
    id: 'vegan',
    group: 'diet',
    icon: 'Sprout',
    labelFr: 'Végan',
    labelEn: 'Vegan',
    aiFr: "il est végan : propose uniquement des alternatives 100% végétales (ni viande, ni poisson, ni œuf, ni lait, ni miel)",
    aiEn: 'they are vegan: only suggest 100% plant-based alternatives (no meat, fish, egg, dairy or honey)',
  },
  {
    id: 'gluten_free',
    group: 'diet',
    icon: 'WheatOff',
    labelFr: 'Sans gluten',
    labelEn: 'Gluten-free',
    aiFr: "il mange sans gluten : quand tu proposes une alternative, choisis-la sans gluten (le gluten ne change JAMAIS le verdict toxicité, ce n'est pas une question d'allergie)",
    aiEn: 'they eat gluten-free: when suggesting an alternative, pick a gluten-free one (gluten NEVER changes the toxicity verdict, this is not an allergy matter)',
  },
  {
    id: 'lactose_free',
    group: 'diet',
    icon: 'MilkOff',
    labelFr: 'Sans lactose',
    labelEn: 'Lactose-free',
    aiFr: "il évite le lactose : propose des alternatives sans lactose (sans changer le verdict toxicité)",
    aiEn: 'they avoid lactose: suggest lactose-free alternatives (without changing the toxicity verdict)',
  },
];

export function getHealthPrefMeta(id: HealthPrefId): HealthPrefMeta | undefined {
  return HEALTH_PREFS.find((p) => p.id === id);
}

export function getHealthPrefLabel(meta: HealthPrefMeta): string {
  return isEnglish() ? meta.labelEn : meta.labelFr;
}

// ─── Module cache (read by the non-React prompt builders) ────────────────────

let cachedHealthProfile: HealthProfile = EMPTY_HEALTH_PROFILE;

export function setCachedHealthProfile(profile: HealthProfile | null): void {
  cachedHealthProfile = profile ?? EMPTY_HEALTH_PROFILE;
}

export function getCachedHealthProfile(): HealthProfile {
  return cachedHealthProfile;
}

export function hasHealthProfile(): boolean {
  return cachedHealthProfile.prefs.length > 0 || cachedHealthProfile.note.trim().length > 0;
}

function getActiveInstructions(): string[] {
  const en = isEnglish();
  const lines: string[] = [];
  for (const id of cachedHealthProfile.prefs) {
    const meta = getHealthPrefMeta(id);
    if (meta) lines.push(`- ${en ? meta.aiEn : meta.aiFr}`);
  }
  const note = cachedHealthProfile.note.trim();
  if (note) {
    lines.push(en ? `- in their own words: "${note}"` : `- dans ses mots : « ${note} »`);
  }
  return lines;
}

/**
 * Profile block injected into the Dr. Toxi CHAT system prompt.
 * Returns '' when the profile is empty so it never bloats the prompt.
 */
export function getHealthProfilePrompt(): string {
  if (!hasHealthProfile()) return '';
  const lines = getActiveInstructions();
  if (lines.length === 0) return '';

  if (isEnglish()) {
    return `\n\n--- USER PROFILE (your personal memory) ---\nThe user trusted you with their situation. You remember it and weave it into your answers like a friend who knows their priorities. It NEVER changes an ingredient's official color (the database and the scan always win) — it shapes your warnings, your tone and especially which ALTERNATIVES you suggest.\nWhat you know about them:\n${lines.join('\n')}\nKeep it natural: don't repeat it in every sentence, just use it when it's relevant.`;
  }
  return `\n\n--- PROFIL DE L'UTILISATEUR (ta mémoire personnelle) ---\nL'utilisateur t'a confié sa situation. Tu t'en souviens et tu en tiens compte dans tes réponses, comme un ami qui connaît ses priorités. Ça NE change JAMAIS la couleur officielle d'un ingrédient (la base et le scan priment toujours) — ça oriente tes mises en garde, ton ton, et surtout les ALTERNATIVES que tu proposes.\nCe que tu sais sur lui :\n${lines.join('\n')}\nReste naturel : ne le répète pas à chaque phrase, glisse-le seulement quand c'est pertinent.`;
}

/**
 * Profile block injected into the SCAN analysis system prompt.
 * The scan classification stays automatic — the profile only personalizes the
 * summary, recommendations and which alternatives are highlighted.
 */
export function getHealthProfileAnalysisPrompt(): string {
  if (!hasHealthProfile()) return '';
  const lines = getActiveInstructions();
  if (lines.length === 0) return '';

  if (isEnglish()) {
    return `\n\n--- USER PROFILE (personalization) ---\nTake the user's situation into account ONLY to personalize the summary (resume), the recommendations and the alternatives — NEVER to change the ingredient classification or the badge (that is automatic).\n${lines.join('\n')}`;
  }
  return `\n\n--- PROFIL DE L'UTILISATEUR (personnalisation) ---\nTiens compte de la situation de l'utilisateur UNIQUEMENT pour personnaliser le résumé (resume), les recommandations et les alternatives — JAMAIS pour changer la classification des ingrédients ni le badge (c'est automatique).\n${lines.join('\n')}`;
}
