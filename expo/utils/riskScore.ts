import { AdditiveInfo, DetectedIngredient, SubstanceDetected } from '@/types';

export function calculateRiskScore(product: {
  detectedAdditives: AdditiveInfo[];
  detectedIngredients?: DetectedIngredient[];
  substances?: SubstanceDetected[];
  ingredientsText: string;
  riskGroup?: string;
}): number {
  let score = 0;
  let hasAnyRisk = false;

  for (const additive of product.detectedAdditives) {
    hasAnyRisk = true;
    if (additive.group === 'group1') score += 30;
    else if (additive.group === 'group2a') score += 20;
    else if (additive.group === 'group2b') score += 10;
    else score += 5;
  }

  if (product.substances) {
    for (const s of product.substances) {
      if (s.niveau_risque === 'danger') { score += 30; hasAnyRisk = true; }
      else if (s.niveau_risque === 'probable') { score += 20; hasAnyRisk = true; }
      else if (s.niveau_risque === 'possible') { score += 10; hasAnyRisk = true; }
    }
  }

  if (product.detectedIngredients) {
    for (const i of product.detectedIngredients) {
      if (i.niveau_risque === 'danger') { score += 30; hasAnyRisk = true; }
      else if (i.niveau_risque === 'probable') { score += 20; hasAnyRisk = true; }
      else if (i.niveau_risque === 'possible') { score += 10; hasAnyRisk = true; }
    }
  }

  const ingLower = (product.ingredientsText ?? '').toLowerCase();
  const controversialPatterns = [
    'tartrazine', 'jaune de quinol\u00e9ine', 'amarante', 'rouge allura', 'bleu brillant',
    'aspartame', 'ac\u00e9sulfame', 'sucralose', 'saccharine',
    'nitrite de sodium', 'nitrate de potassium', 'bha', 'bht',
    'e102', 'e104', 'e110', 'e122', 'e123', 'e124', 'e129', 'e131', 'e132', 'e133',
    'e950', 'e951', 'e952', 'e954', 'e955',
    'e249', 'e250', 'e251', 'e252', 'e320', 'e321',
  ];
  for (const pattern of controversialPatterns) {
    if (ingLower.includes(pattern)) { score += 5; hasAnyRisk = true; }
  }

  const firstIngredient = ingLower.split(',')[0] ?? '';
  const sugarTerms = ['sucre', 'sugar', 'glucose', 'fructose', 'sirop de glucose', 'glucose-fructose'];
  if (sugarTerms.some(t => firstIngredient.includes(t))) { score += 10; hasAnyRisk = true; }

  if (ingLower.includes('huile de palme') || ingLower.includes('palm oil')) { score += 5; hasAnyRisk = true; }

  if (!hasAnyRisk && product.riskGroup === 'none') {
    return 0;
  }

  if (!hasAnyRisk) {
    return 5;
  }

  return Math.min(score, 100);
}
