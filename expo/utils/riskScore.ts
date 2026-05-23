import { AdditiveInfo, DetectedIngredient, SubstanceDetected } from '@/types';

const IARC_GROUP1_SUBSTANCES = [
  'nitrite', 'nitrate', 'formaldéhyde', 'formaldehyde', 'benzène', 'benzene',
  'amiante', 'asbestos',
  'viande transformée', 'processed meat', 'éthanol', 'ethanol',
  'acrylamide', 'goudron de houille', 'coal tar', 'chrome hexavalent',
  'pfas', 'polluants éternels', 'mélamine', 'melamine',
  'plomb', 'lead', 'mercure', 'mercury',
  'e249', 'e250', 'e251', 'e252', 'e240',
];

const IARC_GROUP1_KEYWORDS = [
  'groupe 1 circ', 'groupe 1 du circ', 'group 1 iarc', 'group 1 circ',
  'cancérogène avéré', 'cancerogene avere',
  'classé cancérogène avéré', 'classé groupe 1',
];

const IARC_GROUP2A_KEYWORDS = [
  'groupe 2a circ', 'groupe 2a du circ', 'group 2a iarc', 'group 2a circ',
  'cancérogène probable', 'cancerogene probable',
  'classé groupe 2a', 'probablement cancérogène',
];

const IARC_GROUP2B_KEYWORDS = [
  'groupe 2b circ', 'groupe 2b du circ', 'group 2b iarc', 'group 2b circ',
  'cancérogène possible', 'cancerogene possible',
  'classé groupe 2b', 'possiblement cancérogène',
];

const NOT_IARC_KEYWORDS = [
  'non classé', 'non classe', 'pas classé', 'pas classe',
  'non classée', 'pas classée', 'n\'est pas classé', 'n\'est pas classe',
  'non classé cancérogène', 'pas de classification cancérogène',
  'pas de classification directe', 'pas de classification cancérogène directe',
  'non classé par le circ', 'non classée par le circ',
  'aucun additif cancérogène', 'aucune substance cancérogène',
];

const CONTROVERSIAL_KEYWORDS = [
  'controversé', 'controverse', 'inflammat', 'pro-inflammat',
  'obésité', 'obesite', 'ultra-transform', 'perturbateur endocrinien',
  'hormonal', 'favorise le développement',
  'oméga-6', 'omega-6', 'indice glycémique', 'trompeur',
  'manque de transparence', 'excès de sucre',
  'excitotoxine', 'irritant',
];

export type SubstanceLevel = 'group1' | 'group2a' | 'group2b' | 'controversial' | 'safe';

function isExplicitlyNotIARC(text: string): boolean {
  return NOT_IARC_KEYWORDS.some(kw => text.includes(kw));
}

function detectIARCGroup(circ: string, explication: string, nom: string): SubstanceLevel | null {
  const combined = (circ + ' ' + explication).toLowerCase();
  const nomLower = nom.toLowerCase();

  if (isExplicitlyNotIARC(combined)) {
    console.log(`[RiskScore] "${nom}" explicitly NOT IARC classified`);
    return null;
  }

  if (IARC_GROUP1_KEYWORDS.some(kw => combined.includes(kw))) {
    console.log(`[RiskScore] "${nom}" matched Group 1 keywords -> group1`);
    return 'group1';
  }

  if (IARC_GROUP1_SUBSTANCES.some(s => nomLower.includes(s) || combined.includes(s))) {
    if (!isExplicitlyNotIARC(combined)) {
      console.log(`[RiskScore] "${nom}" matched Group 1 substance list -> group1`);
      return 'group1';
    }
  }

  if (IARC_GROUP2A_KEYWORDS.some(kw => combined.includes(kw))) {
    console.log(`[RiskScore] "${nom}" matched Group 2A keywords -> group2a`);
    return 'group2a';
  }

  if (IARC_GROUP2B_KEYWORDS.some(kw => combined.includes(kw))) {
    console.log(`[RiskScore] "${nom}" matched Group 2B keywords -> group2b`);
    return 'group2b';
  }

  return null;
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

  const iarcGroup = detectIARCGroup(circ, explication, substance.nom ?? '');
  if (iarcGroup) {
    return iarcGroup;
  }

  if (isExplicitlyNotIARC(combined)) {
    const hasControversialKeyword = CONTROVERSIAL_KEYWORDS.some(kw => combined.includes(kw));
    if (hasControversialKeyword) {
      console.log(`[RiskScore] "${substance.nom}" NOT IARC but has controversial keywords -> controversial`);
      return 'controversial';
    }
    console.log(`[RiskScore] "${substance.nom}" explicitly NOT IARC classified, no controversial keywords -> safe`);
    return 'safe';
  }

  if (substance.niveau_risque === 'danger') {
    if (circ.includes('groupe 1') || circ.includes('group 1')) return 'group1';
    if (circ.includes('groupe 2a') || circ.includes('group 2a')) return 'group2a';
    console.log(`[RiskScore] "${substance.nom}" niveau_risque=danger but no IARC group found -> controversial`);
    return 'controversial';
  }

  if (substance.niveau_risque === 'probable') {
    if (circ.includes('groupe 2a') || circ.includes('group 2a')) return 'group2a';
    console.log(`[RiskScore] "${substance.nom}" niveau_risque=probable but no IARC 2A found -> controversial`);
    return 'controversial';
  }

  if (substance.niveau_risque === 'possible') {
    if (circ.includes('groupe 2b') || circ.includes('group 2b')) return 'group2b';
    console.log(`[RiskScore] "${substance.nom}" niveau_risque=possible but no IARC 2B found -> controversial`);
    return 'controversial';
  }

  const isControversial = CONTROVERSIAL_KEYWORDS.some(kw => combined.includes(kw) || nom.includes(kw));
  if (isControversial) {
    console.log(`[RiskScore] "${substance.nom}" has controversial keywords -> controversial`);
    return 'controversial';
  }

  return 'safe';
}

export function classifyAdditiveLevel(additive: AdditiveInfo): SubstanceLevel {
  if (additive.group === 'none') return 'safe';

  const desc = additive.description.toLowerCase();
  const nom = additive.name.toLowerCase();

  if (isExplicitlyNotIARC(desc)) {
    const hasControversialKeyword = CONTROVERSIAL_KEYWORDS.some(kw => desc.includes(kw));
    if (hasControversialKeyword) {
      console.log(`[RiskScore] Additive "${additive.name}" NOT IARC but has controversial keywords -> controversial`);
      return 'controversial';
    }
    console.log(`[RiskScore] Additive "${additive.name}" explicitly NOT IARC, no controversial keywords -> safe`);
    return 'safe';
  }

  const iarcGroup = detectIARCGroup('', desc, additive.name);
  if (iarcGroup) {
    return iarcGroup;
  }

  if (additive.group === 'group1') {
    const hasGroup1Evidence = IARC_GROUP1_KEYWORDS.some(kw => desc.includes(kw)) ||
      IARC_GROUP1_SUBSTANCES.some(s => nom.includes(s) || desc.includes(s));
    if (hasGroup1Evidence) {
      console.log(`[RiskScore] Additive "${additive.name}" group1 with evidence -> group1`);
      return 'group1';
    }
    console.log(`[RiskScore] Additive "${additive.name}" marked group1 in DB -> group1`);
    return 'group1';
  }

  if (additive.group === 'group2a') {
    const has2AEvidence = IARC_GROUP2A_KEYWORDS.some(kw => desc.includes(kw));
    if (has2AEvidence) {
      console.log(`[RiskScore] Additive "${additive.name}" group2a with IARC 2A evidence -> group2a`);
      return 'group2a';
    }
    console.log(`[RiskScore] Additive "${additive.name}" marked group2a in DB but no IARC 2A evidence -> controversial`);
    return 'controversial';
  }

  if (additive.group === 'group2b') {
    const has2BEvidence = IARC_GROUP2B_KEYWORDS.some(kw => desc.includes(kw));
    if (has2BEvidence) {
      console.log(`[RiskScore] Additive "${additive.name}" group2b with IARC 2B evidence -> group2b`);
      return 'group2b';
    }
    console.log(`[RiskScore] Additive "${additive.name}" marked group2b in DB but no IARC 2B evidence -> controversial`);
    return 'controversial';
  }

  const hasControversialKeyword = CONTROVERSIAL_KEYWORDS.some(kw => desc.includes(kw));
  if (hasControversialKeyword) {
    console.log(`[RiskScore] Additive "${additive.name}" has controversial keywords -> controversial`);
    return 'controversial';
  }

  console.log(`[RiskScore] Additive "${additive.name}" no IARC/controversial keywords found -> safe`);
  return 'safe';
}

