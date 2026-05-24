import { AdditiveInfo } from '@/types';

export interface CosmeticIngredient {
  inci: string[];
  displayName: string;
  products: string;
  classification: 'group1' | 'group2a' | 'group2b' | 'endocrine' | 'cmr';
  riskGroup: 'group1' | 'group2a' | 'group2b' | 'none';
  sources: string;
  risks: string;
  pregnancyRisk: string;
  pregnancyDanger: boolean;
  badge: string;
}

export const COSMETICS_DATABASE: CosmeticIngredient[] = [
  {
    inci: ['formaldehyde', 'formalin', 'methylene glycol'],
    displayName: 'Formaldéhyde / Formol',
    products: 'Vernis à ongles, défrisants, lissages kératine, colles cils, shampoings',
    classification: 'group1',
    riskGroup: 'group1',
    sources: 'IARC Vol.100F (2012) — cancérigène confirmé',
    risks: 'Cancer du nasopharynx, leucémie. Irritation yeux, peau, voies respiratoires.',
    pregnancyRisk: 'À ÉVITER ABSOLUMENT. Franchit la barrière placentaire. Risque malformations fœtales.',
    pregnancyDanger: true,
    badge: 'CANCÉRIGÈNE',
  },
  {
    inci: ['dmdm hydantoin', 'quaternium-15', 'diazolidinyl urea', 'imidazolidinyl urea', 'sodium hydroxymethylglycinate', 'bronopol'],
    displayName: 'Libérateurs de formaldéhyde',
    products: 'Lotions, shampoings, après-shampoings, nettoyants visage, produits bébé',
    classification: 'group1',
    riskGroup: 'group1',
    sources: 'IARC Vol.100F — libèrent formaldéhyde Groupe 1. Quaternium-15 interdit UE 2017.',
    risks: 'Libèrent du formaldéhyde en continu sur la peau. Cancer confirmé via formaldéhyde.',
    pregnancyRisk: 'À ÉVITER. Absorption cutanée continue. Risque fœtal identique au formaldéhyde.',
    pregnancyDanger: true,
    badge: 'CANCÉRIGÈNE',
  },
  {
    inci: ['benzene'],
    displayName: 'Benzène (contaminant)',
    products: 'Dry shampoos en spray, déodorants aérosols, sprays coiffants',
    classification: 'group1',
    riskGroup: 'group1',
    sources: 'IARC Vol.29, 100F. FDA recalls 2022-2023 (Procter & Gamble, Unilever).',
    risks: 'Leucémie, lymphome. Détecté en 2022 dans 70+ marques de dry shampoo aux USA.',
    pregnancyRisk: 'CRITIQUE. Inhalation directe. Exposition fœtale par inhalation maternelle.',
    pregnancyDanger: true,
    badge: 'CANCÉRIGÈNE',
  },
  {
    inci: ['talc'],
    displayName: 'Talc (si non certifié asbestos-free)',
    products: 'Poudres de maquillage, fond de teint, fards, talcs corporels, poudres pour bébé',
    classification: 'group1',
    riskGroup: 'group1',
    sources: 'IARC Vol.93, 100C (amiante). Johnson & Johnson condamné 2024 — cancer ovaire.',
    risks: 'Cancer des ovaires (usage génital), mésothéliome, cancer du poumon (si contaminé amiante).',
    pregnancyRisk: 'CRITIQUE pour femmes enceintes. Cancer ovaire lié à usage génital du talc.',
    pregnancyDanger: true,
    badge: 'CANCÉRIGÈNE',
  },
  {
    inci: ['p-phenylenediamine', 'ppd', 'resorcinol'],
    displayName: 'Para-phénylènediamine (PPD) / Colorants azoïques capillaires',
    products: 'Teintures capillaires permanentes, colorations, henné noir',
    classification: 'group1',
    riskGroup: 'group1',
    sources: 'IARC Vol.99 (2010) — usage professionnel colorations = Groupe 1.',
    risks: 'Cancer de la vessie (coiffeurs, exposition professionnelle). Dermatites allergiques sévères.',
    pregnancyRisk: 'Usage fréquent à éviter pendant grossesse. Absorption cutanée significative.',
    pregnancyDanger: false,
    badge: 'CANCÉRIGÈNE',
  },
  {
    inci: ['mercury', 'thimerosal', 'mercurio'],
    displayName: 'Mercure / Thiomersal',
    products: 'Crèmes éclaircissantes illégales, certains mascaras',
    classification: 'group1',
    riskGroup: 'group1',
    sources: 'IARC Vol.58, 100C — mercure Groupe 1. Interdit cosmétiques UE, Canada, USA.',
    risks: 'Neurotoxique sévère. Cancérigène confirmé. Atteintes rénales.',
    pregnancyRisk: 'EXTRÊMEMENT DANGEREUX. Neurotoxique fœtal. Franchit barrière placentaire.',
    pregnancyDanger: true,
    badge: 'CANCÉRIGÈNE',
  },
  {
    inci: ['dea', 'tea', 'mea', 'diethanolamine', 'triethanolamine', 'monoethanolamine'],
    displayName: 'Nitrosamines (DEA/TEA/MEA + conservateurs nitrosants)',
    products: 'Mousses à raser, crèmes, lotions, shampoings',
    classification: 'group2a',
    riskGroup: 'group2a',
    sources: 'IARC — nitrosamines spécifiques Groupe 2A. Formation in situ si DEA/TEA + nitrites.',
    risks: 'Formation de nitrosamines cancérigènes dans le produit ou sur la peau.',
    pregnancyRisk: 'Éviter produits combinant DEA/TEA avec conservateurs nitrosants.',
    pregnancyDanger: false,
    badge: 'PROBABLEMENT CANCÉRIGÈNE',
  },
  {
    inci: ['paraffinum liquidum', 'petrolatum', 'mineral oil', 'cera microcristallina'],
    displayName: 'Huiles minérales raffinées (MOSH/MOAH)',
    products: 'Rouges à lèvres, baumes lèvres, crèmes, huiles corporelles, produits bébé',
    classification: 'group2a',
    riskGroup: 'group2a',
    sources: 'IARC Vol.33, 100F. Huiles raffinées = Groupe 2A ou 3 selon raffinage. EFSA/ANSES : MOAH préoccupants.',
    risks: 'Accumulation dans les tissus (ganglions lymphatiques, foie). MOAH potentiellement génotoxiques.',
    pregnancyRisk: 'Absorption par ingestion (rouges à lèvres). Accumulation dans lait maternel documentée.',
    pregnancyDanger: false,
    badge: 'PROBABLEMENT CANCÉRIGÈNE',
  },
  {
    inci: ['titanium dioxide', 'titanium dioxide [nano]', 'ci 77891'],
    displayName: 'Dioxyde de titane nanoparticules',
    products: 'Crèmes solaires, fonds de teint, poudres, dentifrices, crèmes de jour',
    classification: 'group2b',
    riskGroup: 'group2b',
    sources: 'IARC Vol.93 (2010) — TiO2 par inhalation = Groupe 2B. ANSES 2019 : nano = cancérigène suspecté.',
    risks: 'Pénétration cutanée des nanoparticules. Stress oxydatif cellulaire.',
    pregnancyRisk: 'Éviter sprays solaires contenant TiO2 nano (inhalation). Crème = risque moindre.',
    pregnancyDanger: false,
    badge: 'PEUT CAUSER LE CANCER',
  },
  {
    inci: ['1,4-dioxane'],
    displayName: '1,4-Dioxane (contaminant PEG/SLES)',
    products: 'Shampoings, gels douche, bains moussants (contenant PEG, SLES, eth)',
    classification: 'group2b',
    riskGroup: 'group2b',
    sources: 'IARC Vol.71 (1999) — Groupe 2B. NTP : raisonnablement anticancérigène.',
    risks: 'Contaminant de fabrication. N\'apparaît PAS sur l\'étiquette. Présent si ingrédient en -eth, PEG, oxynol.',
    pregnancyRisk: 'Absorption cutanée. À éviter pendant grossesse. Chercher produits certifiés 1,4-dioxane free.',
    pregnancyDanger: false,
    badge: 'PEUT CAUSER LE CANCER',
  },
  {
    inci: ['bha', 'butylated hydroxyanisole'],
    displayName: 'BHA — Butylhydroxyanisole',
    products: 'Rouges à lèvres, fards, crèmes, produits de maquillage',
    classification: 'group2b',
    riskGroup: 'group2b',
    sources: 'IARC Vol.40 (1986) — Groupe 2B. Commission UE : perturbateur endocrinien cat.1.',
    risks: 'Perturbateur endocrinien. Imite les œstrogènes. Lié aux cancers hormono-dépendants.',
    pregnancyRisk: 'Perturbateur endocrinien confirmé. À éviter absolument pendant grossesse.',
    pregnancyDanger: true,
    badge: 'PEUT CAUSER LE CANCER',
  },
  {
    inci: ['carbon black', 'ci 77266'],
    displayName: 'Carbon Black / Noir de carbone',
    products: 'Mascaras, eye-liners, fards à paupières noirs, crayons yeux',
    classification: 'group2b',
    riskGroup: 'group2b',
    sources: 'IARC Vol.93 (2006) — Groupe 2B par inhalation. EWG : contaminants HAP.',
    risks: 'Contaminant HAP (hydrocarbures aromatiques polycycliques) cancérigènes potentiels.',
    pregnancyRisk: 'Éviter mascara et eye-liner contenant Carbon Black pendant grossesse.',
    pregnancyDanger: false,
    badge: 'PEUT CAUSER LE CANCER',
  },
  {
    inci: ['methylparaben', 'ethylparaben', 'propylparaben', 'butylparaben', 'isobutylparaben', 'isopropylparaben'],
    displayName: 'Parabènes',
    products: 'Crèmes, lotions, shampoings, après-shampoings, maquillage, déodorants',
    classification: 'endocrine',
    riskGroup: 'group2b',
    sources: 'Aucun groupe IARC officiel. Isobutyl/Isopropylparaben INTERDITS UE. ANSES : perturbateurs endocriniens établis. Darbre 2004 : détectés dans tumeurs du sein.',
    risks: 'Miment les œstrogènes. Détectés dans tumeurs du sein. Lien probable cancer sein/ovaires.',
    pregnancyRisk: 'CRITIQUE grossesse. Perturbent le développement hormonal fœtal. Détectés dans urine fœtus.',
    pregnancyDanger: true,
    badge: 'FAVORISE LE CANCER',
  },
  {
    inci: ['dibutyl phthalate', 'dbp', 'diethylhexyl phthalate', 'dehp', 'diethyl phthalate', 'dep'],
    displayName: 'Phtalates',
    products: 'Vernis à ongles, parfums, fixatifs, lotions, produits coiffants (souvent cachés sous "Fragrance")',
    classification: 'cmr',
    riskGroup: 'group2a',
    sources: 'DBP, DEHP : CMR catégorie 2 reprotoxiques. Interdits cosmétiques UE. DEHP : Groupe 2B IARC.',
    risks: 'Perturbateurs endocriniens puissants. Miment les œstrogènes. Lien cancer sein/ovaires.',
    pregnancyRisk: 'CRITIQUE. Fausses couches, faible poids naissance (méta-analyse 2024). Éviter ABSOLUMENT.',
    pregnancyDanger: true,
    badge: 'FAVORISE LE CANCER',
  },
  {
    inci: ['cyclopentasiloxane', 'd5', 'cyclotetrasiloxane', 'd4', 'cyclomethicone'],
    displayName: 'Cyclosiloxanes (D4, D5)',
    products: 'Produits coiffants, sérums capillaires, déodorants, crèmes légères',
    classification: 'endocrine',
    riskGroup: 'group2b',
    sources: 'D4 : perturbateur endocrinien, toxique reproduction. D4 interdit rinçage UE. D5 restreint UE 2020.',
    risks: 'D4 : toxique pour la reproduction. Perturbateur hormonal. Persistant dans l\'environnement.',
    pregnancyRisk: 'D4 INTERDIT en Europe. À éviter pendant grossesse. D5 : éviter par précaution.',
    pregnancyDanger: true,
    badge: 'FAVORISE LE CANCER',
  },
  {
    inci: ['triclosan', 'irgasan'],
    displayName: 'Triclosan',
    products: 'Dentifrices, déodorants, savons antibactériens, crèmes, rasoirs',
    classification: 'endocrine',
    riskGroup: 'group2b',
    sources: 'Aucun groupe IARC. FDA interdit savons antibactériens USA 2017. EFSA/ANSES : perturbateur endocrinien.',
    risks: 'Perturbe hormones thyroïdiennes et reproductives. Résistance antibiotique.',
    pregnancyRisk: 'Éviter pendant grossesse. Absorption cutanée significative. Impact développement fœtal.',
    pregnancyDanger: false,
    badge: 'FAVORISE LE CANCER',
  },
  {
    inci: ['phenoxyethanol'],
    displayName: 'Phénoxyéthanol',
    products: 'Crèmes, lotions, sérums, démaquillants, produits bébé',
    classification: 'endocrine',
    riskGroup: 'group2b',
    sources: 'Aucun groupe IARC. EFSA : restreint en France produits bébé <3 ans. ANSES : perturbateur endocrinien suspecté.',
    risks: 'Perturbateur endocrinien suspecté. Neurotoxicité potentielle à hautes doses.',
    pregnancyRisk: 'INTERDIT en France dans produits pour bébés. À éviter pendant grossesse et allaitement.',
    pregnancyDanger: false,
    badge: 'FAVORISE LE CANCER',
  },
  {
    inci: ['ptfe', 'perfluorooctyl triethoxysilane', 'perfluoro', 'polyfluoro', 'pfas', 'pfoa'],
    displayName: 'PFAS — Substances per/polyfluoroalkylées',
    products: 'Fond de teint longue tenue, mascaras waterproof, rouges à lèvres, fards, crèmes anti-âge',
    classification: 'cmr',
    riskGroup: 'group2a',
    sources: 'EPA : PFOA cancérigène probable. FDA 2024 : trouvé dans 1700+ produits cosmétiques.',
    risks: 'Cancers (rein, testicule). Perturbation endocrinienne. Dommages foie. S\'accumulent dans l\'organisme.',
    pregnancyRisk: 'CRITIQUE. Traversent le placenta. Détectés dans lait maternel. Éviter ABSOLUMENT.',
    pregnancyDanger: true,
    badge: 'FAVORISE LE CANCER',
  },
  {
    inci: ['aluminum chlorohydrate', 'aluminum zirconium tetrachlorohydrex', 'alum'],
    displayName: 'Sels d\'aluminium',
    products: 'Déodorants antiperspirants, anti-transpirants',
    classification: 'endocrine',
    riskGroup: 'group2b',
    sources: 'Aucun groupe IARC. ANSES 2020 : perturbateur endocrinien suspecté. Darbre : lien possible cancer sein.',
    risks: 'Absorption cutanée sous les aisselles. Propriétés œstrogéniques suspectées. Neurotoxicité.',
    pregnancyRisk: 'Éviter antiperspirants pendant grossesse et allaitement. Préférer pierre d\'alun.',
    pregnancyDanger: false,
    badge: 'FAVORISE LE CANCER',
  },
  {
    inci: ['oxybenzone', 'benzophenone-3', 'octinoxate', 'ethylhexyl methoxycinnamate', 'homosalate', 'octisalate'],
    displayName: 'Filtres UV chimiques',
    products: 'Crèmes solaires, crèmes de jour avec SPF, maquillage teinté SPF',
    classification: 'endocrine',
    riskGroup: 'group2b',
    sources: 'Aucun groupe IARC. FDA 2019 : oxybenzone absorption systémique confirmée. Hawaï : interdit.',
    risks: 'Oxybenzone : perturbe hormones. Absorption systémique confirmée. Détecté dans sang, urine, lait.',
    pregnancyRisk: 'CRITIQUE grossesse. Oxybenzone détecté dans lait maternel. Préférer filtres minéraux (zinc oxyde).',
    pregnancyDanger: true,
    badge: 'FAVORISE LE CANCER',
  },
  {
    inci: ['fragrance', 'parfum'],
    displayName: 'Fragrance / Parfum synthétique',
    products: 'Tous produits parfumés : crèmes, shampoings, déodorants, maquillage',
    classification: 'endocrine',
    riskGroup: 'group2b',
    sources: 'Aucun groupe IARC. Mention "Fragrance" cache jusqu\'à 300+ substances, souvent phtalates.',
    risks: 'Cache des phtalates (perturbateurs endocriniens), muscs synthétiques, allergènes.',
    pregnancyRisk: 'Éviter parfums synthétiques pendant grossesse. Préférer "fragrance-free" ou "parfum naturel".',
    pregnancyDanger: false,
    badge: 'FAVORISE LE CANCER',
  },
  {
    inci: ['hydroquinone'],
    displayName: 'Hydroquinone',
    products: 'Crèmes dépigmentantes, sérums anti-taches, produits éclaircissants',
    classification: 'endocrine',
    riskGroup: 'group2b',
    sources: 'Groupe 3 IARC (données insuffisantes). Interdite cosmétiques UE, Canada. Prop 65 California.',
    risks: 'Mutagène in vitro. Perturbateur endocrinien. Neurotoxique à hautes doses.',
    pregnancyRisk: 'INTERDITE en Europe dans cosmétiques. À éviter absolument pendant grossesse.',
    pregnancyDanger: true,
    badge: 'FAVORISE LE CANCER',
  },
  {
    inci: ['peg', 'polyethylene glycol', 'sodium laureth sulfate', 'sles'],
    displayName: 'PEG / Composés éthoxylés (SLES, PEG-xx)',
    products: 'Shampoings, gels douche, crèmes, démaquillants, dentifrices',
    classification: 'endocrine',
    riskGroup: 'group2b',
    sources: 'Aucun groupe IARC pour PEG eux-mêmes. Contaminés 1,4-dioxane (Groupe 2B). Oxyde d\'éthylène (fabrication) = Groupe 1.',
    risks: 'Contamination 1,4-dioxane possible. Augmentent perméabilité cutanée (pénétration autres substances).',
    pregnancyRisk: 'Éviter produits avec SLES, PEG pendant grossesse. Augmentent absorption des autres substances.',
    pregnancyDanger: false,
    badge: 'FAVORISE LE CANCER',
  },
  {
    inci: ['salicylic acid'],
    displayName: 'Acide salicylique en grande quantité (>0.5%)',
    products: 'Produits anti-acné, exfoliants, toners, shampooings antipelliculaires',
    classification: 'cmr',
    riskGroup: 'group2a',
    sources: 'CMR 2 reprotoxique — Commission Européenne. Interdit >0.5% en cosmétiques UE.',
    risks: 'Reprotoxique suspecté. Passage systémique possible à concentrations élevées.',
    pregnancyRisk: 'INTERDIT en Europe >0.5% pour produits corps/visage. Éviter ABSOLUMENT pendant grossesse.',
    pregnancyDanger: true,
    badge: 'FAVORISE LE CANCER',
  },
];

export function findCosmeticIngredient(ingredientText: string): CosmeticIngredient | undefined {
  const normalized = ingredientText.toLowerCase().trim();
  return COSMETICS_DATABASE.find(c =>
    c.inci.some(i => normalized.includes(i.toLowerCase()))
  );
}

export function analyzeCosmeticIngredients(ingredients: string[]): {
  detected: CosmeticIngredient[];
  hasPregnancyDanger: boolean;
} {
  const detected: CosmeticIngredient[] = [];
  const seen = new Set<string>();

  for (const ing of ingredients) {
    const found = findCosmeticIngredient(ing);
    if (found && !seen.has(found.displayName)) {
      seen.add(found.displayName);
      detected.push(found);
    }
  }

  return {
    detected,
    hasPregnancyDanger: detected.some(d => d.pregnancyDanger),
  };
}

