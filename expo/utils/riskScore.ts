import { AdditiveInfo, DetectedIngredient, SubstanceDetected } from '@/types';

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
    if (additive.group === 'group1') { score += 30; hasCarcinogen = true; }
    else if (additive.group === 'group2a') { score += 20; hasCarcinogen = true; }
    else if (additive.group === 'group2b') { score += 15; hasCarcinogen = true; }
    else if (additive.group !== 'none') { score += 5; hasControversial = true; }
  }

  if (product.substances) {
    for (const s of product.substances) {
      if (s.niveau_risque === 'danger') { score += 30; hasCarcinogen = true; }
      else if (s.niveau_risque === 'probable') { score += 20; hasCarcinogen = true; }
      else if (s.niveau_risque === 'possible') { score += 15; hasCarcinogen = true; }
    }
  }

  if (product.detectedIngredients) {
    for (const i of product.detectedIngredients) {
      if (i.niveau_risque === 'danger') { score += 30; hasCarcinogen = true; }
      else if (i.niveau_risque === 'probable') { score += 20; hasCarcinogen = true; }
      else if (i.niveau_risque === 'possible') { score += 15; hasCarcinogen = true; }
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
