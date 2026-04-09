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
  { code: 'canola-oil', name: 'Huile de canola / colza', group: 'group2b', description: 'Huile ultra-transformée, riche en oméga-6 pro-inflammatoire. Controversée pour sa contribution à l\'inflammation chronique. Privilégiez l\'huile d\'olive, l\'huile de coco ou le beurre.' },
  { code: 'palm-oil', name: 'Huile de palme', group: 'group2b', description: 'Substance controversée : riche en acides gras saturés, pro-inflammatoire. Quand raffinée à haute température, peut contenir des contaminants (esters glycidiques, 3-MCPD) classés possiblement cancérogènes. Non classée cancérogène par le CIRC.' },
  { code: 'soybean-oil', name: 'Huile de soja', group: 'group2a', description: 'Huile riche en oméga-6 pro-inflammatoire, souvent OGM. Contribue à l\'inflammation chronique. Privilégiez l\'huile d\'olive, l\'huile de coco ou le beurre.' },
  { code: 'corn-oil', name: 'Huile de maïs', group: 'group2a', description: 'Huile riche en oméga-6 pro-inflammatoire, souvent OGM. Contribue à l\'inflammation chronique. Privilégiez l\'huile d\'olive, l\'huile de coco ou le beurre.' },
  { code: 'en:e631', name: 'Disodium inosinate', group: 'group2a', description: 'Exhausteur de goût synthétique, presque toujours combiné avec du MSG. Marqueur de produit ultra-transformé.' },
  { code: 'en:e627', name: 'Disodium guanylate', group: 'group2a', description: 'Exhausteur de goût synthétique, presque toujours combiné avec du MSG. Marqueur de produit ultra-transformé.' },
  { code: 'citric-acid-industrial', name: 'Acide citrique industriel', group: 'group2a', description: 'Produit par fermentation d\'Aspergillus niger (champignon noir). Peut contenir des mycotoxines résiduelles, irritant digestif. Ce n\'est PAS le même acide citrique que celui du citron.' },
  { code: 'natural-flavor', name: 'Arôme naturel', group: 'group2b', description: 'Terme trompeur qui peut contenir des dizaines de substances chimiques cachées sous un seul nom. Manque de transparence, mais pas de classification cancérogène directe.' },

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

  // LAIT POUR BÉBÉ ET PRODUITS BÉBÉ
  { code: 'pfas', name: 'PFAS / Polluants éternels (perfluoroalkyl)', group: 'group1', description: 'Retrouvés dans presque toutes les marques de lait pour bébé selon Consumer Reports. Cancérogène, perturbateur endocrinien, affaiblit le système immunitaire des bébés.' },
  { code: 'bpa', name: 'BPA (Bisphénol A)', group: 'group2a', description: 'Présent dans le revêtement intérieur des canettes de lait pour bébé liquide. Perturbateur endocrinien, lié au cancer du sein et de la prostate.' },
  { code: 'melamine', name: 'Mélamine', group: 'group1', description: 'Utilisée dans certains laits pour bébé. Toxique pour les reins, peut causer des calculs rénaux et une insuffisance rénale.' },
  { code: '1-4-dioxane', name: '1,4-Dioxane', group: 'group2a', description: 'Contaminant dans les shampoings et savons pour bébé. Cancérogène probable selon le CIRC.' },
  { code: 'dmdm-hydantoin', name: 'DMDM Hydantoïne', group: 'group2a', description: 'Conservateur qui libère du formaldéhyde. Présent dans les lingettes bébé, crèmes, shampoings.' },
  { code: 'bronopol', name: 'Bronopol', group: 'group2a', description: 'Conservateur qui libère du formaldéhyde. Présent dans les lingettes bébé et produits de soins.' },
  { code: 'phthalate-dbp', name: 'Phtalate DBP (Dibutyl phtalate)', group: 'group2a', description: 'Perturbateur endocrinien présent dans les jouets en plastique, crèmes bébé, couches.' },
  { code: 'phthalate-dehp', name: 'Phtalate DEHP', group: 'group2a', description: 'Perturbateur endocrinien présent dans les jouets en plastique souple, dispositifs médicaux, couches.' },
  { code: 'phthalate-dep', name: 'Phtalate DEP (Diéthyl phtalate)', group: 'group2b', description: 'Perturbateur endocrinien présent dans les cosmétiques et parfums pour bébé.' },

  // DENTIFRICE
  { code: 'triclosan', name: 'Triclosan', group: 'group2a', description: 'Antibactérien, perturbateur endocrinien. Interdit dans les savons mais encore dans certains dentifrices.' },
  { code: 'sls', name: 'SLS (Sodium Lauryl Sulfate)', group: 'group2b', description: 'Irritant, peut provoquer des ulcères buccaux. Présent dans les dentifrices et shampoings.' },
  { code: 'propylene-glycol', name: 'Propylène glycol', group: 'group2b', description: 'Irritant, peut être contaminé par des impuretés cancérigènes. Présent dans dentifrices et cosmétiques.' },
  { code: 'dea', name: 'DEA (Diéthanolamine)', group: 'group2a', description: 'Réagit avec d\'autres ingrédients pour former des nitrosamines cancérigènes. Présent dans certains dentifrices et cosmétiques.' },
  { code: 'microplastics', name: 'Microplastiques / Microbilles', group: 'group2b', description: 'Polluant persistant présent dans certains dentifrices et exfoliants. S\'accumule dans l\'organisme.' },

  // VÊTEMENTS ET TEXTILES (compléments)
  { code: 'pfas-textile', name: 'PFAS / PFC dans textiles', group: 'group1', description: 'Présents dans les vêtements imperméables, anti-taches, anti-rides. Cancérogène, perturbateur endocrinien.' },
  { code: 'azo-dyes', name: 'Colorants azoïques textiles', group: 'group1', description: 'Utilisés dans les textiles colorés, peuvent libérer des amines aromatiques cancérigènes.' },
  { code: 'npe', name: 'Nonylphénols éthoxylés (NPE)', group: 'group2a', description: 'Détergent industriel pour textiles. Perturbateur endocrinien puissant.' },
  { code: 'chrome-vi', name: 'Chrome hexavalent (Cr VI)', group: 'group1', description: 'Utilisé dans le tannage du cuir. Cancérogène avéré Groupe 1 CIRC.' },
  { code: 'dmf', name: 'Diméthylformamide (DMF)', group: 'group2a', description: 'Solvant dans les textiles synthétiques. Toxique pour le foie.' },
  { code: 'antimony', name: 'Antimoine', group: 'group2b', description: 'Présent dans le polyester. Potentiellement cancérigène.' },

  // PRODUITS MÉNAGERS (compléments)
  { code: '2-butoxyethanol', name: '2-Butoxyéthanol', group: 'group2a', description: 'Présent dans les nettoyants pour vitres et multi-surfaces. Toxique pour le foie et les reins.' },
  { code: 'ammonia', name: 'Ammoniac', group: 'group2b', description: 'Présent dans les nettoyants. Irritant respiratoire puissant.' },
  { code: 'chlorine-bleach', name: 'Chlore / Eau de Javel (hypochlorite de sodium)', group: 'group2a', description: 'Produit des dioxines, cancérogènes avérés. Irritant respiratoire.' },
  { code: 'perchloroethylene', name: 'Perchloréthylène', group: 'group2a', description: 'Utilisé dans le nettoyage à sec. Cancérogène probable Groupe 2A CIRC.' },
  { code: 'phosphates', name: 'Phosphates', group: 'group2b', description: 'Présents dans les détergents. Polluant environnemental, toxique à haute dose.' },
  { code: 'phthalates-fragrance', name: 'Phtalates (parfums d\'ambiance)', group: 'group2a', description: 'Présents dans les parfums d\'ambiance, bougies parfumées, désodorisants. Perturbateurs endocriniens.' },
  { code: 'apeo', name: 'Alkylphénols éthoxylés (APEO)', group: 'group2a', description: 'Présents dans les détergents. Perturbateurs endocriniens.' },
  { code: 'mit-cmit', name: 'Isothiazolinones (MIT, CMIT)', group: 'group2a', description: 'Conservateurs dans les produits ménagers. Allergènes puissants, sensibilisants cutanés.' },
  { code: 'quaternium-15', name: 'Quaternium-15', group: 'group2a', description: 'Conservateur qui libère du formaldéhyde. Présent dans certains produits ménagers et cosmétiques.' },

  // COSMÉTIQUES (compléments)
  { code: 'mica-contaminated', name: 'Mica contaminé', group: 'group2b', description: 'Peut contenir de l\'amiante dans certains maquillages. Risque d\'inhalation de fibres cancérigènes.' },
  { code: 'ppd', name: 'P-Phénylènediamine (PPD)', group: 'group2b', description: 'Présent dans les teintures pour cheveux. Allergène puissant et cancérogène possible.' },
  { code: 'resorcinol', name: 'Résorcinol', group: 'group2b', description: 'Présent dans les teintures pour cheveux. Perturbateur endocrinien.' },
  { code: 'toluene', name: 'Toluène', group: 'group2b', description: 'Présent dans les vernis à ongles. Neurotoxique, cancérogène possible.' },
  { code: 'acetaldehyde', name: 'Acétaldéhyde', group: 'group2b', description: 'Présent dans les lissages brésiliens. Cancérogène possible.' },
  { code: 'lead-acetate', name: 'Plomb (acétate de plomb)', group: 'group1', description: 'Présent dans certaines teintures pour cheveux. Cancérogène avéré, neurotoxique.' },
  { code: 'coal-tar', name: 'Goudron de houille (coal tar)', group: 'group1', description: 'Présent dans les shampoings antipelliculaires. Cancérogène avéré Groupe 1 CIRC.' },
  { code: 'mercury-thimerosal', name: 'Mercure (thimérosal)', group: 'group1', description: 'Présent dans certains produits éclaircissants pour la peau. Neurotoxique puissant.' },

  // USTENSILES ET CONTENANTS (compléments)
  { code: 'pfoa-ptfe', name: 'PFOA / PTFE (Teflon)', group: 'group2b', description: 'Présent dans les poêles antiadhésives. Cancérogène quand chauffé à haute température. Libère des gaz toxiques.' },
  { code: 'aluminum', name: 'Aluminium (casseroles/papier)', group: 'group2b', description: 'Présent dans les casseroles et papier aluminium. Lié à Alzheimer, controversé pour le cancer. Migration accrue avec aliments acides.' },
  { code: 'melamine-cookware', name: 'Mélamine (vaisselle)', group: 'group2a', description: 'Peut libérer du formaldéhyde quand chauffée. Ne jamais utiliser au micro-ondes.' },
  { code: 'polycarbonate-7', name: 'Polycarbonate (plastique #7)', group: 'group2a', description: 'Contient du BPA. Perturbateur endocrinien, à éviter pour les contenants alimentaires.' },
  { code: 'pvc-3', name: 'PVC (plastique #3)', group: 'group2a', description: 'Contient des phtalates. Perturbateur endocrinien, ne jamais chauffer.' },
  { code: 'polystyrene-6', name: 'Polystyrène (plastique #6)', group: 'group2b', description: 'Peut libérer du styrène, cancérogène possible Groupe 2B CIRC. Éviter avec aliments chauds.' },

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
      return { label: 'DANGER', sublabel: 'Cancérigène confirmé (Groupe 1 CIRC)', color: '#FF3B30' };
    case 'group2a':
      return { label: 'DANGER', sublabel: 'Probablement cancérigène (Groupe 2A CIRC)', color: '#FF3B30' };
    case 'group2b':
      return { label: 'PRUDENCE', sublabel: 'Possiblement cancérigène (Groupe 2B CIRC)', color: '#FF9500' };
    case 'none':
    default:
      return { label: 'APPROUVÉ', sublabel: 'Aucune substance cancérigène détectée', color: '#2E9E34' };
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
