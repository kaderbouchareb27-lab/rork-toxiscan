import { isEnglish, pick } from '@/utils/i18n';

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
  labelKo: string;
  /** Short directive injected into the AI prompt when this pref is active */
  aiFr: string;
  aiEn: string;
  aiKo: string;
}

export const HEALTH_PREFS: HealthPrefMeta[] = [
  {
    id: 'pregnant',
    group: 'life',
    icon: 'HeartPulse',
    labelFr: 'Enceinte',
    labelEn: 'Pregnant',
    labelKo: '임신 중',
    aiFr: "elle est enceinte : redouble de vigilance sur l'alcool, la charcuterie (nitrites + listériose), la caféine et les additifs controversés ; rassure avec tact, sans l'alarmer",
    aiEn: 'she is pregnant: be extra careful about alcohol, cured meats (nitrites + listeria), caffeine and controversial additives; reassure gently without alarming her',
    aiKo: '임신 중입니다: 알코올, 가공육(아질산염 + 리스테리아), 카페인, 논란이 있는 첨가물에 특히 주의하세요. 겁주지 말고 부드럽게 안심시켜 주세요',
  },
  {
    id: 'breastfeeding',
    group: 'life',
    icon: 'Baby',
    labelFr: 'J\u2019allaite',
    labelEn: 'Breastfeeding',
    labelKo: '모유 수유 중',
    aiFr: "elle allaite : même prudence que pendant la grossesse, privilégie toujours le plus naturel et le moins transformé possible",
    aiEn: 'she is breastfeeding: same caution as pregnancy, always favor the most natural, least processed option',
    aiKo: '모유 수유 중입니다: 임신 때와 같은 주의가 필요하며, 항상 가장 자연스럽고 덜 가공된 선택을 우선하세요',
  },
  {
    id: 'kids',
    group: 'life',
    icon: 'Users',
    labelFr: 'Pour mes enfants',
    labelEn: 'For my kids',
    labelKo: '아이를 위해',
    aiFr: "il fait les courses pour ses enfants : traque en priorité les colorants azoïques, le sucre ajouté et les additifs, et propose des alternatives adaptées aux enfants",
    aiEn: 'they shop for their kids: prioritize spotting azo dyes, added sugar and additives, and suggest kid-friendly alternatives',
    aiKo: '아이를 위해 장을 봅니다: 아조 색소, 첨가당, 첨가물을 우선적으로 찾아내고 아이에게 적합한 대안을 제안하세요',
  },
  {
    id: 'avoid_sugar',
    group: 'diet',
    icon: 'Candy',
    labelFr: 'J\u2019évite le sucre',
    labelEn: 'Avoiding sugar',
    labelKo: '설탕을 피해요',
    aiFr: "il évite le sucre : repère et signale tous les sucres ajoutés et sirops, et oriente vers des versions sans sucre ajouté",
    aiEn: 'they avoid sugar: spot and flag every added sugar and syrup, and steer toward no-added-sugar versions',
    aiKo: '설탕을 피합니다: 모든 첨가당과 시럽을 찾아 표시하고 무첨가당 제품으로 안내하세요',
  },
  {
    id: 'avoid_sweeteners',
    group: 'diet',
    icon: 'FlaskConical',
    labelFr: 'J\u2019évite les édulcorants',
    labelEn: 'Avoiding sweeteners',
    labelKo: '감미료를 피해요',
    aiFr: "il évite les édulcorants de synthèse (aspartame, sucralose, acésulfame K) : préfère-lui des produits sans édulcorant artificiel",
    aiEn: 'they avoid artificial sweeteners (aspartame, sucralose, acesulfame K): favor products with no synthetic sweetener',
    aiKo: '인공 감미료(아스파탄, 수크랄로스, 아세설팜칼률)를 피합니다: 합성 감미료가 없는 제품을 우선하세요',
  },
  {
    id: 'avoid_additives',
    group: 'diet',
    icon: 'TestTube',
    labelFr: 'Zéro additif',
    labelEn: 'No additives',
    labelKo: '무첨가물',
    aiFr: "il veut zéro additif : vise les listes d'ingrédients les plus courtes, sans code E controversé",
    aiEn: 'they want zero additives: aim for the shortest ingredient lists, with no controversial E-number',
    aiKo: '첨가물을 원하지 않습니다: 가장 짧은 성분표, 논란이 있는 E 번호가 없는 제품을 목표로 하세요',
  },
  {
    id: 'low_sodium',
    group: 'diet',
    icon: 'Heart',
    labelFr: 'Peu de sel',
    labelEn: 'Low salt',
    labelKo: '저염',
    aiFr: "il surveille son sel (cœur / tension) : signale les produits très salés et propose des options pauvres en sodium",
    aiEn: 'they watch their salt (heart / blood pressure): flag very salty products and suggest low-sodium options',
    aiKo: '염분(심장/혈압)을 관리합니다: 매우 짠 제품을 표시하고 저나트륨 옵션을 제안하세요',
  },
  {
    id: 'vegetarian',
    group: 'diet',
    icon: 'Salad',
    labelFr: 'Végétarien',
    labelEn: 'Vegetarian',
    labelKo: '채식',
    aiFr: "il est végétarien : ne propose jamais d'alternative à base de viande ou de poisson",
    aiEn: 'they are vegetarian: never suggest a meat- or fish-based alternative',
    aiKo: '채식주의자입니다: 고기나 생선 기반 대안을 절대 제안하지 마세요',
  },
  {
    id: 'vegan',
    group: 'diet',
    icon: 'Sprout',
    labelFr: 'Végan',
    labelEn: 'Vegan',
    labelKo: '비건',
    aiFr: "il est végan : propose uniquement des alternatives 100% végétales (ni viande, ni poisson, ni œuf, ni lait, ni miel)",
    aiEn: 'they are vegan: only suggest 100% plant-based alternatives (no meat, fish, egg, dairy or honey)',
    aiKo: '비건입니다: 100% 식물성 대안만 제안하세요(고기, 생선, 달걀, 유제품, 꿀 없음)',
  },
  {
    id: 'gluten_free',
    group: 'diet',
    icon: 'WheatOff',
    labelFr: 'Sans gluten',
    labelEn: 'Gluten-free',
    labelKo: '글루텔 프리',
    aiFr: "il mange sans gluten : quand tu proposes une alternative, choisis-la sans gluten (le gluten ne change JAMAIS le verdict toxicité, ce n'est pas une question d'allergie)",
    aiEn: 'they eat gluten-free: when suggesting an alternative, pick a gluten-free one (gluten NEVER changes the toxicity verdict, this is not an allergy matter)',
    aiKo: '글루텔 프리로 먹습니다: 대안을 제안할 때 글루텔 프리로 고르세요(글루텔은 독성 판정을 절대 바꾸지 않으며, 알레르기 문제가 아닙니다)',
  },
  {
    id: 'lactose_free',
    group: 'diet',
    icon: 'MilkOff',
    labelFr: 'Sans lactose',
    labelEn: 'Lactose-free',
    labelKo: '유당 프리',
    aiFr: "il évite le lactose : propose des alternatives sans lactose (sans changer le verdict toxicité)",
    aiEn: 'they avoid lactose: suggest lactose-free alternatives (without changing the toxicity verdict)',
    aiKo: '유당을 피합니다: 유당 프리 대안을 제안하세요(독성 판정은 바꾸지 않음)',
  },
];

export function getHealthPrefMeta(id: HealthPrefId): HealthPrefMeta | undefined {
  return HEALTH_PREFS.find((p) => p.id === id);
}

export function getHealthPrefLabel(meta: HealthPrefMeta): string {
  return pick({ en: meta.labelEn, fr: meta.labelFr, ko: meta.labelKo });
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
  const lines: string[] = [];
  for (const id of cachedHealthProfile.prefs) {
    const meta = getHealthPrefMeta(id);
    if (meta) lines.push(`- ${pick({ en: meta.aiEn, fr: meta.aiFr, ko: meta.aiKo })}`);
  }
  const note = cachedHealthProfile.note.trim();
  if (note) {
    lines.push(pick({ en: `- in their own words: "${note}"`, fr: `- dans ses mots : « ${note} »`, ko: `- 본인의 말로: "${note}"` }));
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

  return pick({
    en: `\n\n--- USER PROFILE (your personal memory) ---\nThe user trusted you with their situation. You remember it and weave it into your answers like a friend who knows their priorities. It NEVER changes an ingredient's official color (the database and the scan always win) — it shapes your warnings, your tone and especially which ALTERNATIVES you suggest.\nWhat you know about them:\n${lines.join('\n')}\nKeep it natural: don't repeat it in every sentence, just use it when it's relevant.`,
    fr: `\n\n--- PROFIL DE L'UTILISATEUR (ta mémoire personnelle) ---\nL'utilisateur t'a confié sa situation. Tu t'en souviens et tu en tiens compte dans tes réponses, comme un ami qui connaît ses priorités. Ça NE change JAMAIS la couleur officielle d'un ingrédient (la base et le scan priment toujours) — ça oriente tes mises en garde, ton ton, et surtout les ALTERNATIVES que tu proposes.\nCe que tu sais sur lui :\n${lines.join('\n')}\nReste naturel : ne le répète pas à chaque phrase, glisse-le seulement quand c'est pertinent.`,
    ko: `\n\n--- 사용자 프로필(당신의 개인 메모리) ---\n사용자가 자신의 상황을 당신에게 터놓았습니다. 그것을 기억하고, 상대의 우선순위를 아는 친구처럼 답변에 자연스럽게 녹여내세요. 이것은 성분의 공식 채점 색을 절대 바꾸지 않으며(데이터베이스와 스캔이 항상 우선) — 경고, 어조, 특히 제안하는 대안을 조정합니다.\n사용자에 대해 아는 것:\n${lines.join('\n')}\n자연스럽게 유지하세요: 모든 문장에서 반복하지 말고 관련있을 때만 활용하세요.`,
  });
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

  return pick({
    en: `\n\n--- USER PROFILE (personalization) ---\nTake the user's situation into account ONLY to personalize the summary (resume), the recommendations and the alternatives — NEVER to change the ingredient classification or the badge (that is automatic).\n${lines.join('\n')}`,
    fr: `\n\n--- PROFIL DE L'UTILISATEUR (personnalisation) ---\nTiens compte de la situation de l'utilisateur UNIQUEMENT pour personnaliser le résumé (resume), les recommandations et les alternatives — JAMAIS pour changer la classification des ingrédients ni le badge (c'est automatique).\n${lines.join('\n')}`,
    ko: `\n\n--- 사용자 프로필(개인화) ---\n사용자의 상황은 요약(resume), 권장 사항, 대안을 개인화하는 데만 활용하세요 — 성분 분류나 배지는 절대 바꾸지 마세요(그것은 자동입니다).\n${lines.join('\n')}`,
  });
}
