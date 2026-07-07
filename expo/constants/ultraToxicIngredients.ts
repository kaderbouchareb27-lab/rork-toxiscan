// ═══════════════════════════════════════════════════════════════════════
// 🟥 ULTRA TOXIC — table de référence directe (lookup hardcodé, sans IA).
//
// 9 additifs interdits / bannis dans plusieurs pays. Pour ces ingrédients précis,
// la description est servie DIRECTEMENT depuis cette table (FR/EN/KO), sans jamais
// re-générer l'analyse par l'IA — pour la rapidité et l'exactitude. L'IA n'est
// appelée que pour les ingrédients ABSENTS de cette liste.
//
// RÈGLE N°1 (priorité absolue) : si un produit contient ≥ 2 ingrédients de cette
// liste, le verdict final est AUTOMATIQUEMENT ULTRA TOXIC — sauf s'il contient un
// cancérigène avéré Groupe 1 CIRC, qui reste prioritaire (voir verdictTier.ts).
//
// Ce module est volontairement SANS DÉPENDANCE (aucun import) pour rester pur,
// rapide au boot et testable de façon isolée.
// ═══════════════════════════════════════════════════════════════════════

export type UltraToxicLang = 'fr' | 'en' | 'ko';

export interface UltraToxicEntry {
  /** Stable identifier (used in logs and tests). */
  readonly id: string;
  /** E-code when it has one (matched exactly, case-insensitive). */
  readonly code: string | null;
  /** Match keywords: FR + EN + KO names and codes. */
  readonly keywords: readonly string[];
  /** Hardcoded description, one per app language. */
  readonly description: { readonly fr: string; readonly en: string; readonly ko: string };
}

/**
 * Sentinel `classification_circ` value stamped on an ingredient once it is
 * recognised as ULTRA TOXIC. The tier engine and the ingredient badge both
 * detect ultra-toxic ingredients through this exact value.
 */
export const ULTRA_TOXIC_CIRC = 'Ultra toxique';

/** True when a stored `classification_circ` marks the ingredient as ULTRA TOXIC. */
export function isUltraToxicCirc(circ?: string | null): boolean {
  return (circ ?? '') === ULTRA_TOXIC_CIRC;
}

export const ULTRA_TOXIC_INGREDIENTS: readonly UltraToxicEntry[] = [
  {
    id: 'potassium-bromate',
    code: 'E924',
    keywords: ['bromate de potassium', 'potassium bromate', 'bromate', 'e924', '브롬산칼륨'],
    description: {
      fr: 'Classé Groupe 2B (« possiblement cancérigène ») par le CIRC et 1B par l\'agence européenne. Cause des tumeurs rénales et thyroïdiennes chez l\'animal, endommage l\'ADN. Interdit au Canada, au Royaume-Uni, au Brésil et dans l\'UE.',
      en: 'Potassium bromate (E924) — Classified Group 2B ("possibly carcinogenic") by IARC and 1B by the European agency. Causes kidney and thyroid tumors in animals and damages DNA. Banned in Canada, the UK, Brazil and the EU.',
      ko: '브롬산칼륨 (E924) — 국제암연구소(IARC) 2B군(\'발암 가능성 있음\'), 유럽 기관 1B군으로 분류. 동물에서 신장 및 갑상선 종양을 유발하고 DNA를 손상시킴. 캐나다, 영국, 브라질, EU에서 금지됨.',
    },
  },
  {
    id: 'red-3-erythrosine',
    code: 'E127',
    keywords: ['rouge 3', 'red 3', 'red no. 3', 'red no 3', 'fd&c red 3', 'fd c red 3', 'erythrosine', 'érythrosine', 'erythrosin', 'e127', '에리트로신', '적색 3호', '적색3호'],
    description: {
      fr: 'Lié au cancer de la thyroïde dans les études animales. Interdit par la FDA en janvier 2025 et interdit dans l\'alimentaire au sein de l\'UE.',
      en: 'Red 3 / Erythrosine (E127) — Linked to thyroid cancer in animal studies. Banned by the FDA in January 2025 and banned in food across the EU.',
      ko: '적색 3호 / 에리트로신 (E127) — 동물 실험에서 갑상선암과 연관됨. 2025년 1월 미국 FDA가 금지했으며 EU 내 식품에서도 금지됨.',
    },
  },
  {
    id: 'titanium-dioxide',
    code: 'E171',
    keywords: ['dioxyde de titane', 'titanium dioxide', 'e171', '이산화티타늄', '이산화티탄'],
    description: {
      fr: 'Classé Groupe 2B. Peut provoquer des dommages à l\'ADN et aux chromosomes. Interdit dans l\'alimentaire dans toute l\'UE depuis 2022.',
      en: 'Titanium dioxide (E171) — Classified Group 2B. May cause DNA and chromosomal damage. Banned in food throughout the EU since 2022.',
      ko: '이산화티타늄 (E171) — 2B군으로 분류. DNA 및 염색체 손상을 일으킬 수 있음. 2022년부터 EU 전역에서 식품 사용 금지됨.',
    },
  },
  {
    id: 'bha',
    code: 'E320',
    keywords: ['bha', 'butylhydroxyanisole', 'butylated hydroxyanisole', 'hydroxyanisole butyle', 'hydroxyanisole butylé', 'e320', '부틸히드록시아니솔'],
    description: {
      fr: 'Classé Groupe 2B et « raisonnablement anticipé comme cancérigène » par le gouvernement américain. Perturbateur endocrinien. Sévèrement restreint en Europe.',
      en: 'BHA (E320) — Classified Group 2B and "reasonably anticipated to be a human carcinogen" by the US government. Endocrine disruptor. Severely restricted in Europe.',
      ko: 'BHA (부틸히드록시아니솔, E320) — 2B군으로 분류되며 미국 정부가 \'발암 가능 물질로 합리적으로 예상됨\'으로 지정. 내분비 교란 물질. 유럽에서 엄격히 제한됨.',
    },
  },
  {
    id: 'azodicarbonamide',
    code: 'E927a',
    keywords: ['azodicarbonamide', 'azodicarbonamide ada', 'e927a', '아조디카본아미드'],
    description: {
      fr: 'Génère de l\'uréthane (éthyl carbamate) à la cuisson, classé « probablement cancérigène » par le CIRC — un lien au cancer encore plus fort que le bromate. Interdit au Royaume-Uni, dans l\'UE et en Australie.',
      en: 'Azodicarbonamide (ADA) — Produces urethane (ethyl carbamate) during baking, classified "probably carcinogenic" by IARC — an even stronger cancer link than potassium bromate. Banned in the UK, the EU and Australia.',
      ko: '아조디카본아미드 (ADA) — 굽는 과정에서 우레탄(에틸카바메이트)을 생성하며, IARC가 \'발암 추정 물질\'로 분류 — 브롬산칼륨보다 발암 연관성이 더 강함. 영국, EU, 호주에서 금지됨.',
    },
  },
  {
    id: 'brominated-vegetable-oil',
    code: null,
    keywords: ['huile vegetale bromee', 'huile végétale bromée', 'brominated vegetable oil', 'bvo', '브롬화식물성유', '브롬화 식물성유'],
    description: {
      fr: 'Contient du brome qui s\'accumule dans le corps et affecte le système nerveux et la thyroïde. Interdit dans l\'UE, au Royaume-Uni et au Japon ; interdit par la FDA en 2024.',
      en: 'Brominated vegetable oil (BVO) — Contains bromine that accumulates in the body and affects the nervous system and thyroid. Banned in the EU, the UK and Japan; banned by the FDA in 2024.',
      ko: '브롬화식물성유 (BVO) — 체내에 축적되어 신경계와 갑상선에 영향을 주는 브롬을 함유. EU, 영국, 일본에서 금지되었으며 2024년 미국 FDA가 금지함.',
    },
  },
  {
    id: 'sodium-nitrite-nitrate',
    code: 'E250',
    keywords: ['nitrite de sodium', 'sodium nitrite', 'nitrate de sodium', 'sodium nitrate', 'e250', 'e251', '아질산나트륨', '질산나트륨'],
    description: {
      fr: 'Forment des nitrosamines, composés cancérigènes reconnus, lors de la cuisson et de la digestion. Fortement réglementés en Europe.',
      en: 'Sodium nitrite / nitrate (E250 / E251) — Form nitrosamines, recognized carcinogenic compounds, during cooking and digestion. Heavily regulated in Europe.',
      ko: '아질산나트륨 / 질산나트륨 (E250 / E251) — 조리 및 소화 과정에서 발암 물질로 알려진 니트로사민을 형성함. 유럽에서 엄격히 규제됨.',
    },
  },
  {
    id: 'propylparaben',
    code: 'E216',
    keywords: ['propylparaben', 'propylparabène', 'propylparabene', 'propyl paraben', 'e216', '프로필파라벤'],
    description: {
      fr: 'Perturbateur endocrinien affectant les hormones et la reproduction. Interdit dans l\'alimentaire dans l\'UE depuis 2006.',
      en: 'Propylparaben (E216) — Endocrine disruptor affecting hormones and reproduction. Banned in food in the EU since 2006.',
      ko: '프로필파라벤 (E216) — 호르몬과 생식에 영향을 미치는 내분비 교란 물질. 2006년부터 EU 식품에서 금지됨.',
    },
  },
  {
    id: 'red-40-allura-red',
    code: 'E129',
    keywords: ['rouge 40', 'red 40', 'allura red', 'rouge allura', 'fd&c red 40', 'fd c red 40', 'rouge #40', 'red #40', 'e129', '적색 40호', '적색40호', '알루라레드', '알루라 레드'],
    description: {
      fr: 'Colorant de synthèse dérivé du pétrole, retrouvé contaminé par des cancérigènes (benzidine) dans certaines études, et lié à l\'hyperactivité chez l\'enfant. Soumis à un avertissement obligatoire dans l\'UE.',
      en: 'Red 40 / Allura Red (E129) — Petroleum-derived synthetic dye, found contaminated with carcinogens (benzidine) in some studies and linked to hyperactivity in children. Subject to a mandatory warning label in the EU.',
      ko: '적색 40호 / 알루라레드 (E129) — 석유에서 추출한 합성 색소로, 일부 연구에서 발암 물질(벤지딘) 오염이 발견되었으며 아동의 과잉행동과 연관됨. EU에서 의무 경고 표시 대상.',
    },
  },
];

// ─────────────────────────────────────────────────────────────────────
// MATCHING — normalisation identique à l'index d'ingrédients (minuscule,
// sans accents, alphanum ASCII + Hangul conservés). Les mots-clés ASCII sont
// testés avec une frontière de mot pour éviter les faux positifs (« bha » ne
// doit PAS matcher un mot plus long) ; les mots-clés coréens en sous-chaîne.
// ─────────────────────────────────────────────────────────────────────

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAscii(s: string): boolean {
  return /^[\x00-\x7f]+$/.test(s);
}

function keywordMatches(haystack: string, keyword: string): boolean {
  const kw = normalize(keyword);
  if (!kw) return false;
  if (isAscii(kw)) {
    // Word-boundary match on the normalized (alphanumerics + spaces) haystack so a
    // short token like "bha" or "e320" never matches inside a longer word/code.
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?:^|[^a-z0-9])' + escaped + '(?:$|[^a-z0-9])').test(haystack);
  }
  return haystack.includes(kw);
}

/**
 * Returns the ULTRA TOXIC entry for a detected ingredient (by name and/or E-code),
 * or null when the ingredient is not one of the 9 banned additives.
 */
export function matchUltraToxicIngredient(name?: string | null, code?: string | null): UltraToxicEntry | null {
  const normName = normalize(name ?? '');
  const normCode = normalize(code ?? '');
  if (!normName && !normCode) return null;
  const haystack = `${normName} ${normCode}`.trim();

  for (const entry of ULTRA_TOXIC_INGREDIENTS) {
    if (entry.code && normCode && normalize(entry.code) === normCode) return entry;
    for (const kw of entry.keywords) {
      if (keywordMatches(haystack, kw)) return entry;
    }
  }
  return null;
}

/** Returns the hardcoded ULTRA TOXIC description in the requested app language. */
export function getUltraToxicDescription(entry: UltraToxicEntry, lang: UltraToxicLang): string {
  return entry.description[lang] ?? entry.description.fr;
}

/** Counts how many detected substances are ULTRA TOXIC (via the circ sentinel). */
export function countUltraToxicSubstances(substances: { classification_circ?: string | null }[]): number {
  return substances.reduce((n, s) => (isUltraToxicCirc(s.classification_circ) ? n + 1 : n), 0);
}
