import { AdditiveInfo, RiskGroup } from '@/types';

export const ADDITIVES_DATABASE: AdditiveInfo[] = [
  // GROUPE 1 — Cancérogènes avérés
  { code: 'en:e249', name: 'Nitrite de potassium', group: 'group1', description: 'Conservateur classé cancérogène avéré par le CIRC. Peut former des nitrosamines cancérogènes.' },
  { code: 'en:e250', name: 'Nitrite de sodium', group: 'group1', description: 'Conservateur utilisé dans les charcuteries. Classé cancérogène avéré (Groupe 1) par le CIRC.' },
  { code: 'en:e251', name: 'Nitrate de sodium', group: 'group1', description: 'Conservateur qui peut se transformer en nitrites dans l\'organisme. Classé cancérogène avéré.' },
  { code: 'en:e252', name: 'Nitrate de potassium', group: 'group1', description: 'Conservateur classé cancérogène avéré. Utilisé dans les viandes transformées.' },
  { code: 'en:e240', name: 'Formaldéhyde', group: 'group1', description: 'Substance classée cancérogène avéré par le CIRC. Interdit dans l\'alimentation dans de nombreux pays.' },

  // GROUPE 2A — Probablement cancérogènes / RISQUE PROBABLE
  { code: 'en:e110', name: 'Jaune orangé S / Yellow 6', group: 'group2a', description: 'Colorant azoïque lié à l\'hyperactivité chez l\'enfant. Interdit ou restreint dans plusieurs pays.' },
  { code: 'en:e129', name: 'Rouge allura / Red 40', group: 'group2a', description: 'Colorant azoïque lié à l\'hyperactivité chez l\'enfant. Interdit dans plusieurs pays européens. Réactions allergiques possibles.' },
  { code: 'en:e102', name: 'Tartrazine / Yellow 5', group: 'group2a', description: 'Colorant azoïque controversé, lié à l\'hyperactivité et aux réactions allergiques. Interdit ou restreint dans plusieurs pays.' },
  { code: 'en:e621', name: 'Glutamate monosodique (MSG)', group: 'group2a', description: 'Excitotoxine liée à des maux de tête, obésité et lésions neurologiques dans les études animales. Exhausteur de goût omniprésent dans les produits ultra-transformés.' },
  { code: 'maltodextrine', name: 'Maltodextrine', group: 'group2a', description: 'Indice glycémique plus élevé que le sucre. Liée à l\'inflammation intestinale et nourrit les bactéries nocives du microbiome.' },
  { code: 'sunflower-oil', name: 'Huile de tournesol', group: 'group2a', description: 'Huile riche en oméga-6 pro-inflammatoire. Contribue à l\'inflammation chronique qui favorise le développement du cancer. Privilégiez l\'huile d\'olive, l\'huile de coco ou le beurre.' },
  { code: 'canola-oil', name: 'Huile de canola / colza', group: 'group2a', description: 'Huile ultra-transformée, riche en oméga-6 pro-inflammatoire. Contribue à l\'inflammation chronique. Privilégiez l\'huile d\'olive, l\'huile de coco ou le beurre.' },
  { code: 'soybean-oil', name: 'Huile de soja', group: 'group2a', description: 'Huile riche en oméga-6 pro-inflammatoire, souvent OGM. Contribue à l\'inflammation chronique. Privilégiez l\'huile d\'olive, l\'huile de coco ou le beurre.' },
  { code: 'corn-oil', name: 'Huile de maïs', group: 'group2a', description: 'Huile riche en oméga-6 pro-inflammatoire, souvent OGM. Contribue à l\'inflammation chronique. Privilégiez l\'huile d\'olive, l\'huile de coco ou le beurre.' },
  { code: 'en:e631', name: 'Disodium inosinate', group: 'group2a', description: 'Exhausteur de goût synthétique, presque toujours combiné avec du MSG. Marqueur de produit ultra-transformé.' },
  { code: 'en:e627', name: 'Disodium guanylate', group: 'group2a', description: 'Exhausteur de goût synthétique, presque toujours combiné avec du MSG. Marqueur de produit ultra-transformé.' },
  { code: 'citric-acid-industrial', name: 'Acide citrique industriel', group: 'group2a', description: 'Produit par fermentation d\'Aspergillus niger (champignon noir). Peut contenir des mycotoxines résiduelles, irritant digestif. Ce n\'est PAS le même acide citrique que celui du citron.' },
  { code: 'natural-flavor', name: 'Arôme naturel', group: 'group2a', description: 'Terme trompeur qui peut contenir des dizaines de substances chimiques cachées sous un seul nom. Manque total de transparence.' },

  // GROUPE 2B — Possiblement cancérogènes / RISQUE POSSIBLE
  { code: 'en:e150c', name: 'Caramel ammoniaqué', group: 'group2b', description: 'Colorant caramel contenant du 4-MEI, possiblement cancérogène selon le CIRC.' },
  { code: 'en:e150d', name: 'Caramel au sulfite d\'ammonium', group: 'group2b', description: 'Colorant caramel contenant du 4-MEI, classé possiblement cancérogène.' },
  { code: 'en:e171', name: 'Dioxyde de titane', group: 'group2b', description: 'Colorant blanc interdit en France depuis 2020. Classé possiblement cancérogène par le CIRC.' },
  { code: 'en:e951', name: 'Aspartame', group: 'group2b', description: 'Édulcorant classé possiblement cancérogène (Groupe 2B) par le CIRC en 2023.' },
  { code: 'en:e320', name: 'BHA (Butylhydroxyanisole)', group: 'group2b', description: 'Antioxydant classé possiblement cancérogène par le CIRC.' },
  { code: 'en:e321', name: 'BHT (Butylhydroxytoluène)', group: 'group2b', description: 'Antioxydant controversé, classé possiblement cancérogène. Perturbateur endocrinien suspecté.' },
  { code: 'en:e950', name: 'Acésulfame potassium', group: 'group2b', description: 'Édulcorant en évaluation, classé possiblement cancérogène.' },
  { code: 'en:e127', name: 'Érythrosine / Red 3', group: 'group2b', description: 'Colorant classé cancérogène possible. Interdit dans les cosmétiques aux États-Unis. Lié à des tumeurs thyroïdiennes dans les études animales.' },
  { code: 'en:e133', name: 'Bleu brillant / Blue 1', group: 'group2b', description: 'Colorant synthétique controversé. Peut traverser la barrière hémato-encéphalique. Réactions allergiques possibles.' },
  { code: 'en:e132', name: 'Indigotine / Blue 2', group: 'group2b', description: 'Colorant synthétique controversé. Études animales montrent des tumeurs cérébrales possibles.' },
  { code: 'en:e150b', name: 'Caramel de sulfite caustique', group: 'group2b', description: 'Colorant caramel pouvant contenir des sous-produits controversés.' },
  { code: 'en:e407', name: 'Carraghénine / Carraghénane', group: 'group2b', description: 'Épaississant controversé. Études animales montrent inflammation intestinale et tumeurs. Perturbation du microbiome.' },
  { code: 'en:e433', name: 'Polysorbate 80', group: 'group2b', description: 'Émulsifiant controversé lié à l\'inflammation intestinale et la perturbation du microbiome.' },
  { code: 'en:e955', name: 'Sucralose', group: 'group2b', description: 'Édulcorant artificiel controversé. Études récentes montrent des dommages possibles à l\'ADN et une perturbation du microbiome intestinal.' },
  { code: 'grapeseed-oil', name: 'Huile de pépin de raisin', group: 'group2b', description: 'Huile riche en oméga-6 pro-inflammatoire à haute consommation. Privilégiez l\'huile d\'olive, l\'huile de coco ou le beurre.' },
  { code: 'artificial-flavor', name: 'Arôme artificiel', group: 'group2b', description: 'Substance synthétique dont la composition exacte est inconnue. Manque de transparence.' },
  { code: 'yeast-extract', name: 'Extrait de levure', group: 'group2b', description: 'Forme cachée de glutamate. Utilisé pour rehausser le goût sans déclarer du MSG directement.' },
  { code: 'en:e160b', name: 'Annatto / Rocou', group: 'group2b', description: 'Colorant naturel mais peut causer des réactions allergiques chez certaines personnes sensibles.' },

  // CONSERVATEURS — Sulfites
  { code: 'en:e220', name: 'Dioxyde de soufre', group: 'group2b', description: 'Sulfite pouvant provoquer des réactions allergiques et de l\'asthme. Controversé.' },
  { code: 'en:e221', name: 'Sulfite de sodium', group: 'group2b', description: 'Sulfite pouvant provoquer des réactions allergiques et de l\'asthme.' },
  { code: 'en:e222', name: 'Bisulfite de sodium', group: 'group2b', description: 'Sulfite controversé, réactions allergiques et asthme possibles.' },
  { code: 'en:e223', name: 'Métabisulfite de sodium', group: 'group2b', description: 'Sulfite controversé, réactions allergiques et asthme possibles.' },
  { code: 'en:e224', name: 'Métabisulfite de potassium', group: 'group2b', description: 'Sulfite controversé, réactions allergiques et asthme possibles.' },
  { code: 'en:e225', name: 'Sulfite de potassium', group: 'group2b', description: 'Sulfite controversé, réactions allergiques et asthme possibles.' },
  { code: 'en:e226', name: 'Sulfite de calcium', group: 'group2b', description: 'Sulfite controversé, réactions allergiques et asthme possibles.' },
  { code: 'en:e227', name: 'Bisulfite de calcium', group: 'group2b', description: 'Sulfite controversé, réactions allergiques et asthme possibles.' },
  { code: 'en:e228', name: 'Bisulfite de potassium', group: 'group2b', description: 'Sulfite controversé, réactions allergiques et asthme possibles.' },

  // GLYCÉROL
  { code: 'en:e422', name: 'Glycérol / Glycérine', group: 'group2b', description: 'Généralement considéré sûr en petite quantité, mais le glycérol industriel peut contenir des contaminants (3-MCPD et esters glycidiques) classés cancérogènes possibles par le CIRC. Privilégiez les produits utilisant du glycérol d\'origine végétale certifié.' },

  // ADDITIFS GÉNÉRALEMENT SÛRS mais signalés
  { code: 'en:e150a', name: 'Caramel ordinaire', group: 'none', description: 'Colorant caramel simple, généralement considéré sûr.' },
  { code: 'en:e415', name: 'Gomme xanthane', group: 'none', description: 'Épaississant généralement considéré sûr. Additif courant dans l\'industrie alimentaire.' },
  { code: 'en:e412', name: 'Gomme de guar', group: 'none', description: 'Épaississant généralement considéré sûr. Additif courant dans l\'industrie alimentaire.' },
];

export function findAdditiveByCode(code: string): AdditiveInfo | undefined {
  const normalized = code.toLowerCase().replace(/\s/g, '');
  return ADDITIVES_DATABASE.find(a => a.code === normalized);
}

export function analyzeAdditives(additiveTags: string[]): { riskGroup: RiskGroup; detectedAdditives: AdditiveInfo[] } {
  const detected: AdditiveInfo[] = [];

  for (const tag of additiveTags) {
    const additive = findAdditiveByCode(tag);
    if (additive) {
      detected.push(additive);
    }
  }

  const groupPriority: Record<RiskGroup, number> = { group1: 3, group2a: 2, group2b: 1, none: 0 };
  let worstGroup: RiskGroup = 'none';
  for (const additive of detected) {
    if (groupPriority[additive.group] > groupPriority[worstGroup]) {
      worstGroup = additive.group;
    }
  }

  const controversialCount = detected.filter(a => a.group !== 'none').length;
  if (controversialCount >= 3 && groupPriority[worstGroup] < groupPriority['group2a']) {
    worstGroup = 'group2a';
    console.log('[Additives] Cumulative rule applied: 3+ controversial substances detected, upgrading to ORANGE');
  }

  return { riskGroup: worstGroup, detectedAdditives: detected };
}

export function getRiskBadgeInfo(group: RiskGroup): { label: string; sublabel: string; color: string } {
  switch (group) {
    case 'group1':
      return { label: 'DANGER', sublabel: 'Cancérogène avéré (Groupe 1)', color: '#FF3B30' };
    case 'group2a':
      return { label: 'DÉTECTÉ', sublabel: 'Substance à risque (Groupe 2A)', color: '#FF9500' };
    case 'group2b':
      return { label: 'DÉTECTÉ', sublabel: 'Substance controversée (Groupe 2B)', color: '#FFCC00' };
    case 'none':
    default:
      return { label: 'AUCUN RISQUE IDENTIFIÉ', sublabel: '', color: '#34C759' };
  }
}

export function niveauRisqueToGroup(niveau: string): RiskGroup {
  switch (niveau) {
    case 'danger': return 'group1';
    case 'probable': return 'group2a';
    case 'possible': return 'group2b';
    default: return 'none';
  }
}
