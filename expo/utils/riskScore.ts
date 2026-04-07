import { AdditiveInfo, DetectedIngredient, SubstanceDetected } from '@/types';

const IARC_GROUP1_SUBSTANCES = [
  'nitrite', 'nitrate', 'formaldéhyde', 'formaldehyde', 'benzène', 'benzene',
  'amiante', 'asbestos', 'bha', 'butylhydroxyanisole',
  'viande transformée', 'processed meat', 'éthanol', 'ethanol',
  'acrylamide', 'goudron de houille', 'coal tar', 'chrome hexavalent',
  'pfas', 'polluants éternels', 'mélamine', 'melamine',
  'plomb', 'lead', 'mercure', 'mercury', 'colorants azoïques textiles',
  'e249', 'e250', 'e251', 'e252', 'e240',
];

const IARC_CONFIRMED_KEYWORDS = [
  'groupe 1 circ', 'groupe 1 du circ', 'group 1 iarc', 'group 1 circ',
  'cancérogène avéré', 'cancerogene avere',
  'classé cancérogène avéré', 'classé groupe 1',
];

const IARC_PROBABLE_KEYWORDS = [
  'groupe 2a circ', 'groupe 2a du circ', 'group 2a iarc', 'group 2a circ',
  'cancérogène probable', 'cancerogene probable',
  'classé groupe 2a',
];

const IARC_POSSIBLE_KEYWORDS = [
  'groupe 2b circ', 'groupe 2b du circ', 'group 2b iarc', 'group 2b circ',
  'cancérogène possible', 'cancerogene possible',
  'classé groupe 2b', 'possiblement cancérogène',
];

const NOT_IARC_KEYWORDS = [
  'non classé', 'non classe', 'pas classé', 'pas classe',
  'non classée', 'pas classée', 'n\'est pas classé', 'n\'est pas classe',
  'non classé cancérogène', 'pas de classification cancérogène',
  'pas de classification directe',
];

const CONTROVERSIAL_KEYWORDS = [
  'controversé', 'controverse', 'inflammat', 'pro-inflammat',
  'obésité', 'obesite', 'ultra-transform', 'perturbateur endocrinien',
  'hormonal', 'favorise le cancer', 'favorise le développement',
  'oméga-6', 'omega-6', 'indice glycémique', 'trompeur',
  'manque de transparence', 'excès de sucre',
];

export type SubstanceLevel = 'carcinogen' | 'controversial' | 'safe';

function isExplicitlyNotIARC(text: string): boolean {
  return NOT_IARC_KEYWORDS.some(kw => text.includes(kw));
}

function isConfirmedIARCCarcinogen(circ: string, explication: string, nom: string): boolean {
  const combined = circ + ' ' + explication;
  if (isExplicitlyNotIARC(combined)) return false;

  if (IARC_CONFIRMED_KEYWORDS.some(kw => combined.includes(kw))) return true;
  if (IARC_PROBABLE_KEYWORDS.some(kw => combined.includes(kw))) return true;
  if (IARC_POSSIBLE_KEYWORDS.some(kw => combined.includes(kw))) return true;

  const nomLower = nom.toLowerCase();
  if (IARC_GROUP1_SUBSTANCES.some(s => nomLower.includes(s) || combined.includes(s))) {
    if (!isExplicitlyNotIARC(combined)) return true;
  }

  return false;
}

export function classifySubstanceLevel(substance: {
  classification_circ?: string;
  niveau_risque: string;
  explication?: string | null;
  nom?: string;
}): SubstanceLevel {
  if (substance.niveau_risque === 'aucun') {
    return 'safe';
  }

  const circ = (substance.classification_circ ?? '').toLowerCase();
  const explication = (substance.explication ?? '').toLowerCase();
  const nom = (substance.nom ?? '').toLowerCase();
  const combined = circ + ' ' + explication;

  if (isExplicitlyNotIARC(combined)) {
    console.log(`[RiskScore] "${substance.nom}" explicitly NOT IARC classified -> controversial`);
    return 'controversial';
  }

  if (isConfirmedIARCCarcinogen(circ, explication, nom)) {
    console.log(`[RiskScore] "${substance.nom}" confirmed IARC carcinogen -> carcinogen`);
    return 'carcinogen';
  }

  const isControversial = CONTROVERSIAL_KEYWORDS.some(kw => combined.includes(kw));
  if (isControversial) {
    console.log(`[RiskScore] "${substance.nom}" has controversial keywords -> controversial`);
    return 'controversial';
  }

  if (substance.niveau_risque === 'danger') {
    if (circ.includes('groupe 1') || circ.includes('group 1')) return 'carcinogen';
    console.log(`[RiskScore] "${substance.nom}" niveau_risque=danger but no IARC confirmation -> controversial`);
    return 'controversial';
  }

  if (substance.niveau_risque === 'probable' || substance.niveau_risque === 'possible') {
    console.log(`[RiskScore] "${substance.nom}" niveau_risque=${substance.niveau_risque} -> controversial`);
    return 'controversial';
  }

  return 'safe';
}

export function classifyAdditiveLevel(additive: AdditiveInfo): SubstanceLevel {
  if (additive.group === 'none') return 'safe';

  const desc = additive.description.toLowerCase();
  const nom = additive.name.toLowerCase();

  if (isExplicitlyNotIARC(desc)) {
    console.log(`[RiskScore] Additive "${additive.name}" explicitly NOT IARC -> controversial`);
    return 'controversial';
  }

  if (isConfirmedIARCCarcinogen('', desc, nom)) {
    console.log(`[RiskScore] Additive "${additive.name}" confirmed IARC carcinogen`);
    return 'carcinogen';
  }

  if (additive.group === 'group1') {
    return 'carcinogen';
  }

  return 'controversial';
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
        nom: i.nom,
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
