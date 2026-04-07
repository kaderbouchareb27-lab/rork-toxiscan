import { AdditiveInfo, DetectedIngredient, SubstanceDetected } from '@/types';

const IARC_KEYWORDS = [
  'groupe 1', 'group 1', 'groupe 2a', 'group 2a', 'groupe 2b', 'group 2b',
  'circ', 'iarc', 'cancérogène avéré', 'cancérogène probable', 'cancérogène possible',
  'cancerogene avere', 'cancerogene probable', 'cancerogene possible',
  'classé cancérogène', 'classe cancerogene',
];

const CONTROVERSIAL_KEYWORDS = [
  'controversé', 'controverse', 'inflammat', 'pro-inflammat',
  'obésité', 'obesite', 'ultra-transform', 'perturbateur endocrinien',
  'hormonal', 'favorise le cancer', 'favorise le développement',
  'oméga-6', 'omega-6', 'indice glycémique',
];

export type SubstanceLevel = 'carcinogen' | 'controversial' | 'safe';

export function classifySubstanceLevel(substance: {
  classification_circ?: string;
  niveau_risque: string;
  explication?: string | null;
}): SubstanceLevel {
  if (substance.niveau_risque === 'aucun') {
    return 'safe';
  }

  const circ = (substance.classification_circ ?? '').toLowerCase();
  const explication = (substance.explication ?? '').toLowerCase();
  const combined = circ + ' ' + explication;

  const isIARC = IARC_KEYWORDS.some(kw => combined.includes(kw));

  if (isIARC && substance.niveau_risque === 'danger') return 'carcinogen';
  if (isIARC && substance.niveau_risque === 'probable') return 'carcinogen';
  if (isIARC && substance.niveau_risque === 'possible') return 'carcinogen';

  if (circ.includes('non classé') || circ.includes('non classe') || circ.includes('pas classé') || circ.includes('pas classe')) {
    return 'controversial';
  }

  const isControversial = CONTROVERSIAL_KEYWORDS.some(kw => combined.includes(kw));
  if (isControversial) return 'controversial';

  if (substance.niveau_risque === 'danger') return 'carcinogen';
  if (substance.niveau_risque === 'probable') return 'controversial';
  if (substance.niveau_risque === 'possible') return 'controversial';

  return 'safe';
}

export function classifyAdditiveLevel(additive: AdditiveInfo): SubstanceLevel {
  if (additive.group === 'group1' || additive.group === 'group2a' || additive.group === 'group2b') {
    const desc = additive.description.toLowerCase();
    const isIARC = IARC_KEYWORDS.some(kw => desc.includes(kw));
    if (isIARC) return 'carcinogen';

    const isControversial = CONTROVERSIAL_KEYWORDS.some(kw => desc.includes(kw));
    if (isControversial) return 'controversial';

    if (additive.group === 'group1') return 'carcinogen';
    return 'controversial';
  }
  return 'safe';
}

export function calculateRiskScore(product: {
  detectedAdditives: AdditiveInfo[];
  detectedIngredients?: DetectedIngredient[];
  substances?: SubstanceDetected[];
  ingredientsText: string;
  riskGroup?: string;
}): number {
  let score = 0;
  let hasCarcinogen = false;
  let hasControversial = false;

  for (const additive of product.detectedAdditives) {
    const level = classifyAdditiveLevel(additive);
    if (level === 'carcinogen') { score += 30; hasCarcinogen = true; }
    else if (level === 'controversial') { score += 10; hasControversial = true; }
  }

  if (product.substances) {
    for (const s of product.substances) {
      const level = classifySubstanceLevel(s);
      if (level === 'carcinogen') { score += 30; hasCarcinogen = true; }
      else if (level === 'controversial') { score += 10; hasControversial = true; }
    }
  }

  if (product.detectedIngredients) {
    for (const i of product.detectedIngredients) {
      const level = classifySubstanceLevel({
        classification_circ: i.classification_circ,
        niveau_risque: i.niveau_risque,
        explication: i.explication,
      });
      if (level === 'carcinogen') { score += 30; hasCarcinogen = true; }
      else if (level === 'controversial') { score += 10; hasControversial = true; }
    }
  }

  const ingLower = (product.ingredientsText ?? '').toLowerCase();
  const carcinogenPatterns = [
    'nitrite de sodium', 'nitrate de potassium', 'formaldéhyde', 'formaldehyde',
    'e249', 'e250', 'e251', 'e252', 'e240',
  ];
  for (const pattern of carcinogenPatterns) {
    if (ingLower.includes(pattern)) { score += 20; hasCarcinogen = true; }
  }

  const controversialPatterns = [
    'tartrazine', 'jaune de quinoléine', 'amarante', 'rouge allura', 'bleu brillant',
    'aspartame', 'acésulfame', 'sucralose', 'saccharine',
    'bha', 'bht',
    'e102', 'e104', 'e110', 'e122', 'e123', 'e124', 'e129', 'e131', 'e132', 'e133',
    'e950', 'e951', 'e952', 'e954', 'e955',
    'e320', 'e321',
  ];
  for (const pattern of controversialPatterns) {
    if (ingLower.includes(pattern)) { score += 5; hasControversial = true; }
  }

  const firstIngredient = ingLower.split(',')[0] ?? '';
  const sugarTerms = ['sucre', 'sugar', 'glucose', 'fructose', 'sirop de glucose', 'glucose-fructose'];
  if (sugarTerms.some(t => firstIngredient.includes(t))) { score += 10; hasControversial = true; }

  if (ingLower.includes('huile de palme') || ingLower.includes('palm oil')) { score += 5; hasControversial = true; }

  if (!hasCarcinogen && !hasControversial && product.riskGroup === 'none') {
    return 0;
  }

  if (!hasCarcinogen && !hasControversial) {
    return 5;
  }

  if (hasCarcinogen) {
    return Math.max(Math.min(score, 100), 71);
  }

  if (hasControversial) {
    return Math.max(Math.min(score, 70), 41);
  }

  return Math.min(score, 100);
}
