export type RiskLevel = 'danger' | 'probable' | 'possible' | 'aucun';

export interface IngredientEntry {
  readonly keywords: readonly string[];
  readonly code: string | null;
  readonly risk: RiskLevel;
  readonly circ: string;
  readonly note?: string;
}

export const INGREDIENTS_DATABASE: readonly IngredientEntry[] = [
  // ═══════════════════════════════════════════════════════════════
  // 🔴 ROUGE — DANGER (Groupe 1 IARC officiel)
  // ═══════════════════════════════════════════════════════════════
  { keywords: ['nitrite de sodium', 'sodium nitrite'], code: 'E250', risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['nitrite de potassium', 'potassium nitrite'], code: 'E249', risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['nitrate de sodium', 'sodium nitrate'], code: 'E251', risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['nitrate de potassium', 'potassium nitrate'], code: 'E252', risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['formaldehyde', 'formaldéhyde', 'formalin', 'methylene glycol'], code: 'E240', risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['dmdm hydantoin'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Libérateur de formaldéhyde' },
  { keywords: ['quaternium-15', 'quaternium 15'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Libérateur de formaldéhyde' },
  { keywords: ['diazolidinyl urea'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Libérateur de formaldéhyde' },
  { keywords: ['imidazolidinyl urea'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Libérateur de formaldéhyde' },
  { keywords: ['bronopol'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['plomb', 'lead'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['cadmium'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['arsenic'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['mercure', 'mercury', 'thimerosal'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['benzene'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['aflatoxine', 'aflatoxin'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['ppd', 'para-phenylenediamine'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['coal tar', 'goudron de houille'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['ptfe', 'perfluoro', 'polyfluoro', 'pfas'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['alcool ethylique', 'ethanol (boisson)'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Uniquement dans boissons alcoolisées' },
  { keywords: ['viande transformee', 'viande transformée', 'processed meat', 'charcuterie industrielle'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Cancérogène avéré (cancer colorectal). 50g/jour = +18% de risque.' },
  { keywords: ['nitrosamine', 'nitrosamines'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Cancérigène avéré formé par cuisson nitrites + viande.' },

  // ═══════════════════════════════════════════════════════════════
  // 🟠 ORANGE — PROBABLE (Groupe 2A IARC, ultra-transformé sévère)
  // ═══════════════════════════════════════════════════════════════

  // --- Groupe 2A IARC officiel ---
  { keywords: ['acrylamide'], code: null, risk: 'probable', circ: 'Groupe 2A' },
  { keywords: ['glyphosate'], code: null, risk: 'probable', circ: 'Groupe 2A' },
  { keywords: ['viande rouge'], code: null, risk: 'probable', circ: 'Groupe 2A' },

  // --- Ultra-transformés sévères (gardés en orange) ---
  { keywords: ['amidon modifie', 'modified starch'], code: 'E1404/E1412/E1422/E1450', risk: 'probable', circ: 'Ultra-transformé' },
  { keywords: ['proteines hydrolysees', 'hydrolyzed protein', 'hydrolyse', 'hydrolyzed'], code: null, risk: 'probable', circ: 'Ultra-transformé' },
  { keywords: ['caseinate', 'caseinate de sodium'], code: null, risk: 'probable', circ: 'Ultra-transformé' },
  { keywords: ['isolat de proteines', 'protein isolate', 'whey protein concentrate', 'soy protein isolate', 'milk protein concentrate', 'casein isolate', 'pea protein isolate'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'S\'applique UNIQUEMENT aux protéines industrielles. PAS aux concentrés naturels (jus de fruits, tomate, etc.)' },
  { keywords: ['graisse interesterifiee', 'interesterified'], code: null, risk: 'probable', circ: 'Ultra-transformé' },
  { keywords: ['huile de palme', 'palm oil'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: '3-MCPD, glycidol' },
  { keywords: ['hydrogenated', 'hydrogene', 'partiellement hydrogene'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Sauf mention non hydrogéné' },
  { keywords: ['gras trans', 'trans fat'], code: null, risk: 'probable', circ: 'Ultra-transformé' },

  // --- Édulcorants problématiques ---
  { keywords: ['acesulfame', 'acesulfame k', 'acesulfame potassium'], code: 'E950', risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Toujours ORANGE — perturbateur endocrinien qui dégrade le microbiome intestinal.' },
  { keywords: ['aspartame'], code: 'E951', risk: 'probable', circ: 'Groupe 2B', note: 'Classé possiblement cancérigène par le CIRC en 2023.' },

  // --- Conservateurs cancérigènes ---
  { keywords: ['bha', 'butylhydroxyanisole'], code: 'E320', risk: 'probable', circ: 'Groupe 2B', note: 'Classé cancérigène possible (Groupe 2B CIRC), perturbateur endocrinien.' },
  { keywords: ['tbhq'], code: 'E319', risk: 'probable', circ: 'Ultra-transformé', note: 'Lié à des tumeurs dans des études animales, limité en Europe.' },

  // --- Colorants azoïques (lien hyperactivité) ---
  { keywords: ['jaune 5', 'yellow 5', 'tartrazine'], code: 'E102', risk: 'probable', circ: 'Hyperactivité', note: 'Colorant azoïque lié à l\'hyperactivité chez l\'enfant.' },
  { keywords: ['jaune 6', 'yellow 6', 'sunset yellow', 'jaune orange s'], code: 'E110', risk: 'probable', circ: 'Hyperactivité', note: 'Colorant azoïque lié à l\'hyperactivité chez l\'enfant.' },
  { keywords: ['rouge cochenille a', 'ponceau 4r'], code: 'E124', risk: 'probable', circ: 'Hyperactivité', note: 'Colorant azoïque interdit aux USA, lié à hyperactivité.' },
  { keywords: ['rouge 40', 'red 40', 'allura red'], code: 'E129', risk: 'probable', circ: 'Hyperactivité', note: 'Colorant azoïque lié à l\'hyperactivité chez l\'enfant.' },
  { keywords: ['caramel ammoniacal sulfite', 'sulfite ammonia caramel', 'caramel iv'], code: 'E150d', risk: 'probable', circ: 'Groupe 2B', note: 'Contient du 4-MEI classé Groupe 2B (sodas, colas).' },

  // --- Émulsifiants problématiques microbiome ---
  { keywords: ['carraghenane', 'carrageenan'], code: 'E407', risk: 'probable', circ: 'Inflammation intestinale', note: 'Lié à l\'inflammation intestinale.' },
  { keywords: ['cmc', 'carboxymethylcellulose'], code: 'E466', risk: 'probable', circ: 'Perturbateur microbiome' },
  { keywords: ['polysorbate 80', 'polysorbate'], code: 'E433', risk: 'probable', circ: 'Perturbateur microbiome' },
  { keywords: ['polysorbate 60', 'polysorbate 65', 'polysorbate 40', 'polysorbate 20'], code: 'E432-E436', risk: 'probable', circ: 'Perturbateur microbiome', note: 'Perturbent le microbiome intestinal, favorisent l\'inflammation chronique.' },

  // --- Exhausteurs excitotoxiques ---
  { keywords: ['msg', 'glutamate monosodique', 'monosodium glutamate', 'acide glutamique'], code: 'E620-E621', risk: 'probable', circ: 'Excitotoxine', note: 'Excitotoxine qui stimule excessivement les neurones.' },

  // --- Aluminium ---
  { keywords: ['silicate aluminium', 'aluminum silicate'], code: 'E554-E556', risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Contiennent de l\'aluminium biodisponible, accumulation neurologique préoccupante.' },
  { keywords: ['aluminium colorant', 'aluminum e173'], code: 'E173', risk: 'probable', circ: 'Neurotoxique', note: 'Métal neurotoxique lié à Alzheimer.' },
  { keywords: ['ferrocyanure de sodium', 'sodium ferrocyanide'], code: 'E535', risk: 'probable', circ: 'Toxique', note: 'Libère du cyanure en milieu acide, toxique à doses élevées.' },
  { keywords: ['phosphate acide aluminium sodium', 'sodium aluminum phosphate'], code: 'E541', risk: 'probable', circ: 'Neurotoxique', note: 'Contient de l\'aluminium neurotoxique lié à Alzheimer.' },

  // --- Additifs interdits / très problématiques ---
  { keywords: ['azodicarbonamide'], code: 'E927a', risk: 'probable', circ: 'Interdit UE' },
  { keywords: ['potassium bromate'], code: 'E924', risk: 'probable', circ: 'Groupe 2B', note: 'Interdit en UE, Canada, Royaume-Uni.' },

  // --- Perturbateurs endocriniens cosmétiques ---
  { keywords: ['parabene', 'paraben', 'methylparaben', 'ethylparaben', 'propylparaben', 'butylparaben'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['phtalate', 'phthalate', 'dbp', 'dehp', 'dep'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['cyclosiloxane', 'cyclomethicone', 'd4', 'd5'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['triclosan', 'irgasan'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['phenoxyethanol'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Interdit bébé <3 ans en France' },
  { keywords: ['oxybenzone', 'benzophenone-3'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['octinoxate', 'homosalate', 'octisalate'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['aluminum chlorohydrate', 'aluminium zirconium'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['hydroquinone'], code: null, risk: 'probable', circ: 'Interdit UE' },
  { keywords: ['paraffinum liquidum', 'petrolatum', 'mineral oil'], code: null, risk: 'probable', circ: 'Groupe 2A', note: 'Huiles minérales raffinées' },

  // ═══════════════════════════════════════════════════════════════
  // 🟡 JAUNE — POSSIBLE (Modération, ultra-transformé léger)
  // ═══════════════════════════════════════════════════════════════

  // --- Sucres et sirops (TOUS en JAUNE désormais) ---
  { keywords: ['sucre', 'sugar', 'saccharose', 'sucre de canne raffine', 'sucre blanc'], code: null, risk: 'possible', circ: 'Sucre raffiné', note: 'Modération. Lié à obésité, diabète, inflammation.' },
  { keywords: ['sucre de canne', 'cane sugar'], code: null, risk: 'possible', circ: 'Sucre raffiné' },
  { keywords: ['sucres concentres', 'concentrated sugars'], code: null, risk: 'possible', circ: 'Sucre raffiné' },
  { keywords: ['maltodextrine', 'maltodextrin'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Glucide industriel, index glycémique élevé. Modération.' },
  { keywords: ['sirop de glucose', 'glucose syrup'], code: null, risk: 'possible', circ: 'Ultra-transformé léger' },
  { keywords: ['sirop de glucose-fructose', 'hfcs', 'high fructose corn syrup'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Sirop riche en fructose, lien obésité.' },
  { keywords: ['sirop de mais', 'corn syrup'], code: null, risk: 'possible', circ: 'Ultra-transformé léger' },
  { keywords: ['sirop d\'agave', 'agave syrup'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Présenté comme naturel mais riche en fructose isolé.' },
  { keywords: ['sirop de riz', 'rice syrup'], code: null, risk: 'possible', circ: 'Ultra-transformé léger' },
  { keywords: ['dextrose'], code: null, risk: 'possible', circ: 'Sucre raffiné' },
  { keywords: ['dextrine'], code: null, risk: 'possible', circ: 'Ultra-transformé léger' },
  { keywords: ['fructose ajoute', 'fructose isole'], code: null, risk: 'possible', circ: 'Sucre raffiné' },

  // --- Huiles raffinées (en JAUNE car transformées mais pas alarmant) ---
  { keywords: ['huile de colza raffinee', 'canola raffinee', 'huile de colza', 'canola oil', 'rapeseed oil'], code: null, risk: 'possible', circ: 'Raffinée', note: 'Procédé industriel. Préférer pressée à froid.' },
  { keywords: ['huile de tournesol raffinee', 'sunflower oil refined', 'huile de tournesol', 'sunflower oil'], code: null, risk: 'possible', circ: 'Raffinée riche oméga-6', note: 'Excès oméga-6 pro-inflammatoire. Préférer pressée à froid.' },
  { keywords: ['huile de pepin de raisin', 'grapeseed oil'], code: null, risk: 'possible', circ: 'Raffinée riche oméga-6', note: 'Très riche en oméga-6 pro-inflammatoires.' },
  { keywords: ['huile de soja', 'soybean oil'], code: null, risk: 'possible', circ: 'Raffinée riche oméga-6', note: 'Excès oméga-6 pro-inflammatoire. Souvent OGM.' },
  { keywords: ['huile de mais', 'corn oil'], code: null, risk: 'possible', circ: 'Raffinée riche oméga-6', note: 'Excès oméga-6 pro-inflammatoire.' },
  { keywords: ['huile de coton', 'cottonseed oil'], code: null, risk: 'possible', circ: 'Raffinée', note: 'Souvent OGM et résidus de pesticides.' },
  { keywords: ['huile vegetale', 'vegetable oil'], code: null, risk: 'possible', circ: 'Raffinée non spécifiée', note: 'Composition non précisée, souvent palme ou colza raffinés.' },

  // --- Arômes ---
  { keywords: ['arome naturel', 'natural flavor', 'natural flavour'], code: null, risk: 'possible', circ: 'Composition opaque' },
  { keywords: ['arome artificiel', 'artificial flavor', 'artificial flavour'], code: null, risk: 'possible', circ: 'Synthétique', note: 'Molécules synthétiques. Marqueur de produit ultra-transformé.' },
  { keywords: ['natural and artificial flavors'], code: null, risk: 'possible', circ: 'Composition opaque' },

  // --- Gommes ---
  { keywords: ['gomme xanthane', 'xanthan'], code: 'E415', risk: 'possible', circ: 'Controversé' },
  { keywords: ['gomme guar', 'guar gum'], code: 'E412', risk: 'possible', circ: 'Controversé' },
  { keywords: ['gomme arabique', 'arabic gum'], code: 'E414', risk: 'possible', circ: 'Controversé' },
  { keywords: ['gomme de caroube', 'carob gum'], code: 'E410', risk: 'possible', circ: 'Controversé' },
  { keywords: ['alginate'], code: 'E402-E404', risk: 'possible', circ: 'Controversé', note: 'Peuvent perturber l\'absorption des minéraux en excès.' },
  { keywords: ['gomme tara', 'tara gum'], code: 'E417', risk: 'possible', circ: 'Controversé', note: 'Peu étudiée, effets digestifs possibles en grande quantité.' },
  { keywords: ['gomme gellane', 'gellan gum'], code: 'E418', risk: 'possible', circ: 'Controversé', note: 'Effets digestifs possibles à haute dose.' },
  { keywords: ['gomme konjac', 'konjac gum'], code: 'E425', risk: 'possible', circ: 'Controversé', note: 'Risque de blocage intestinal, danger d\'étouffement chez les enfants.' },
  { keywords: ['gomme karaya', 'karaya gum'], code: 'E416', risk: 'possible', circ: 'Allergène', note: 'Allergène reconnu pouvant provoquer des réactions sévères.' },

  // --- Acide citrique ---
  { keywords: ['acide citrique', 'citric acid', 'acide citrique industriel'], code: 'E330', risk: 'possible', circ: 'Industriel courant', note: 'Très courant et généralement sûr.' },

  // --- Phosphates ---
  { keywords: ['diphosphate'], code: 'E450', risk: 'possible', circ: 'Excès phosphates' },
  { keywords: ['tripolyphosphate'], code: 'E451', risk: 'possible', circ: 'Excès phosphates' },
  { keywords: ['polyphosphate'], code: 'E452', risk: 'possible', circ: 'Excès phosphates' },
  { keywords: ['phosphate de sodium', 'phosphate de potassium', 'phosphate de calcium'], code: 'E339/E340/E341/E343', risk: 'possible', circ: 'Excès phosphates' },

  // --- Conservateurs ---
  { keywords: ['sodium benzoate', 'benzoate de sodium'], code: 'E211', risk: 'possible', circ: 'Controversé', note: 'Forme du benzène cancérigène avec vitamine C dans certaines boissons.' },
  { keywords: ['bht', 'butylhydroxytoluene'], code: 'E321', risk: 'possible', circ: 'Controversé', note: 'Antioxydant synthétique. Effets hépatiques à fortes doses.' },
  { keywords: ['sulfite', 'sulphite', 'dioxyde de soufre', 'sulfur dioxide'], code: 'E220-E228', risk: 'possible', circ: 'Allergène', note: 'Provoque des crises d\'asthme et réactions allergiques sévères.' },

  // --- Émulsifiants modérés ---
  { keywords: ['mono et diglycerides', 'monoglycerides', 'diglycerides', 'mono and diglycerides'], code: 'E471', risk: 'possible', circ: 'Ultra-transformé léger', note: 'Peuvent contenir des graisses trans cachées issues d\'huiles hydrogénées.' },
  { keywords: ['pgpr', 'polyglycerol polyricinoleate'], code: 'E476', risk: 'possible', circ: 'Ultra-transformé léger', note: 'Effets sur le foie et les reins à fortes doses.' },
  { keywords: ['lecithine de soja', 'soy lecithin'], code: 'E322', risk: 'possible', circ: 'OGM possible', note: 'Émulsifiant courant. Privilégier la lécithine de tournesol (sans OGM).' },
  { keywords: ['cellulose modifiee', 'modified cellulose', 'methylcellulose', 'hydroxypropyl methylcellulose'], code: 'E463-E465', risk: 'possible', circ: 'Ultra-transformé léger', note: 'Dérivés chimiques industriels affectant le microbiome.' },
  { keywords: ['phosphatides ammonium', 'ammonium phosphatides'], code: 'E442', risk: 'possible', circ: 'Controversé', note: 'Peu étudié à long terme.' },
  { keywords: ['ester acide gras', 'fatty acid ester'], code: 'E474-E496', risk: 'possible', circ: 'Controversé', note: 'Émulsifiants industriels à tolérance digestive variable.' },

  // --- Édulcorants Groupe 2B ---
  { keywords: ['saccharine'], code: 'E954', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['sucralose'], code: 'E955', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['cyclamate'], code: 'E952', risk: 'possible', circ: 'Groupe 2B' },

  // --- Colorants Groupe 2B ---
  { keywords: ['rouge 3', 'red 3', 'erythrosine'], code: 'E127', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['bleu 1', 'blue 1'], code: 'E133', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['bleu 2', 'blue 2'], code: 'E132', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['vert 3', 'green 3'], code: 'E143', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['dioxyde de titane', 'titanium dioxide'], code: 'E171', risk: 'possible', circ: 'Groupe 2B', note: 'Interdit comme additif alimentaire en UE depuis 2022.' },
  { keywords: ['carbon black'], code: 'CI 77266', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['silice', 'silicon dioxide'], code: 'E551', risk: 'possible', circ: 'Controversé' },
  { keywords: ['cochenille carmin', 'carmine', 'cochineal'], code: 'E120', risk: 'possible', circ: 'Allergène', note: 'Allergène fort, chocs anaphylactiques possibles.' },
  { keywords: ['caramel ammoniacal', 'caramel au sulfite', 'caramel iii'], code: 'E150c', risk: 'possible', circ: 'Groupe 2B', note: '4-MEI' },
  { keywords: ['chlorophylle cuivree', 'copper chlorophyll'], code: 'E141', risk: 'possible', circ: 'Controversé', note: 'Contient du cuivre, accumulation possible.' },
  { keywords: ['sulfate de cuivre', 'copper sulfate'], code: 'E519', risk: 'possible', circ: 'Controversé', note: 'Toxique à doses élevées, accumulation hépatique possible.' },

  // --- Protéines industrielles légères ---
  { keywords: ['extrait de levure', 'yeast extract'], code: null, risk: 'possible', circ: 'Glutamate caché', note: 'Contient du glutamate naturel, équivalent à du MSG caché.' },
  { keywords: ['mct oil', 'huile mct'], code: null, risk: 'possible', circ: 'Ultra-transformé léger' },

  // --- Amplificateurs de goût ---
  { keywords: ['guanylate', 'inosinate'], code: 'E626-E635', risk: 'possible', circ: 'Amplificateur de goût', note: 'Amplificateurs de MSG.' },

  // --- Cosmétique modéré ---
  { keywords: ['fragrance', 'parfum'], code: null, risk: 'possible', circ: 'Controversé', note: 'Composition non divulguée' },
  { keywords: ['peg-', 'sles', 'sodium laureth sulfate'], code: null, risk: 'possible', circ: 'Controversé', note: 'Contamination 1,4-dioxane' },

  // --- Boissons énergisantes (contexte) ---
  { keywords: ['taurine'], code: null, risk: 'possible', circ: 'Boisson énergisante', note: 'ORANGE uniquement dans boissons énergisantes. Sinon JAUNE.' },
  { keywords: ['cafeine ajoutee', 'caffeine'], code: null, risk: 'possible', circ: 'Stimulant', note: 'ORANGE uniquement si boisson énergisante. VERT si café naturel, thé, kombucha.' },
  { keywords: ['inositol'], code: null, risk: 'possible', circ: 'Controversé', note: 'ORANGE uniquement si boisson énergisante. VERT si nutriment naturel.' },
  { keywords: ['glucuronolactone'], code: null, risk: 'possible', circ: 'Boisson énergisante' },
  { keywords: ['niacinamide', 'pyridoxine hcl', 'calcium pantothenate', 'cyanocobalamin'], code: null, risk: 'possible', circ: 'Synthétique', note: 'Uniquement ORANGE en boisson énergisante (sinon vert).' },

  // --- Anthocyanes ---
  { keywords: ['anthocyane', 'anthocyanin'], code: 'E163', risk: 'aucun', circ: 'Naturel', note: 'Colorants naturels antioxydants, généralement bénéfiques.' },

  // --- Viandes conventionnelles (en JAUNE plutôt que orange) ---
  { keywords: ['poulet conventionnel', 'conventional chicken', 'poulet d\'élevage'], code: null, risk: 'possible', circ: 'Élevage intensif', note: 'Élevage intensif. Privilégier le poulet bio sans antibiotiques.' },
  { keywords: ['boeuf conventionnel', 'conventional beef', 'beef'], code: null, risk: 'possible', circ: 'Élevage intensif', note: 'Élevage intensif. Privilégier le bœuf grass-fed bio.' },
  { keywords: ['porc conventionnel', 'conventional pork', 'pork'], code: null, risk: 'possible', circ: 'Élevage intensif', note: 'Élevage intensif. Privilégier le porc élevé en plein air.' },
  { keywords: ['saumon d\'élevage', 'farmed salmon', 'atlantic salmon'], code: null, risk: 'possible', circ: 'Élevage intensif', note: 'Colorants artificiels possibles. Privilégier le saumon sauvage.' },
  { keywords: ['poulet bio', 'organic chicken', 'poulet biologique', 'free-range chicken bio'], code: null, risk: 'possible', circ: 'Naturel', note: 'Bon choix — sans antibiotiques ni hormones.' },
  { keywords: ['boeuf grass-fed', 'grass-fed beef', 'bœuf bio', 'organic beef'], code: null, risk: 'possible', circ: 'Naturel', note: 'Bien meilleur que le bœuf industriel.' },

  // ═══════════════════════════════════════════════════════════════
  // 🟢 VERT — AUCUN (Naturel sain)
  // ═══════════════════════════════════════════════════════════════

  // --- Base ---
  { keywords: ['eau', 'water', 'aqua', 'eau gazeifiee', 'carbonated water', 'sparkling water'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sel', 'salt', 'sel marin', 'sel de mer', 'fleur de sel'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Céréales et féculents ---
  { keywords: ['farine de ble', 'farine complete', 'wheat flour', 'whole flour'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['avoine', 'oat'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['riz', 'rice', 'riz complet', 'brown rice'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['quinoa'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['orge', 'barley'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sarrasin', 'buckwheat'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['millet'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['epeautre', 'spelt'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['amidon de ble', 'wheat starch'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Amidon naturel (pas modifié).' },

  // --- Vinaigres ---
  { keywords: ['vinaigre', 'vinegar', 'vinaigre de cidre', 'vinaigre balsamique'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Huiles saines (vraies non raffinées) ---
  { keywords: ['huile d\'olive extra vierge', 'extra virgin olive oil'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['huile de coco vierge', 'coconut oil virgin', 'huile de coco non raffinee'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Non hydrogénée uniquement' },
  { keywords: ['huile d\'avocat', 'avocado oil'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['huile de lin', 'flaxseed oil', 'linseed oil'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Riche en oméga-3.' },
  { keywords: ['huile de noix', 'walnut oil'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['huile de sesame', 'sesame oil'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['huile de chanvre', 'hemp oil'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Produits laitiers ---
  { keywords: ['beurre', 'butter'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['creme', 'cream'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['lait', 'milk'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['lait ecreme', 'skim milk', 'skimmed milk'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['yaourt', 'yogurt'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['fromage blanc', 'cottage cheese'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['oeuf', 'egg'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Levures et ferments ---
  { keywords: ['levure', 'yeast'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Pas extrait de levure' },
  { keywords: ['lactobacillus', 'bifidobacterium', 'probiotique', 'probiotic', 'ferments lactiques', 'lactic cultures', 'live cultures'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Bicarbonate & levants ---
  { keywords: ['bicarbonate'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['poudre a lever', 'baking powder', 'levure chimique', 'raising agents'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Cacao ---
  { keywords: ['cacao', 'cocoa'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Ne pas confondre avec cadmium' },
  { keywords: ['beurre de cacao', 'cocoa butter'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['chocolat noir 70', 'dark chocolate 70'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Noix & graines ---
  { keywords: ['noix', 'amande', 'almond', 'nuts'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['noisette', 'hazelnut', 'pate de noisette'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['noix de cajou', 'cashew'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['pistache', 'pistachio'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['noix de pecan', 'pecan'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['noix de macadamia', 'macadamia'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de chia', 'chia seeds'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de lin', 'flax seeds'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de tournesol', 'sunflower seeds'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de courge', 'pumpkin seeds'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de sesame', 'sesame seeds'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Légumineuses ---
  { keywords: ['lentilles', 'lentils'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['pois chiches', 'chickpeas'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['haricots', 'beans'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Protéines naturelles ---
  { keywords: ['whey', 'proteines de lactoserum'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Sauf isolat/concentrat' },
  { keywords: ['saumon sauvage', 'wild salmon', 'wild-caught salmon'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Riche en oméga-3.' },
  { keywords: ['sardine', 'sardines'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Riche en oméga-3, peu de mercure.' },
  { keywords: ['maquereau', 'mackerel'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['anchois', 'anchovy'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Émulsifiants naturels ---
  { keywords: ['pectine', 'pectin'], code: 'E440', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['lecithine de tournesol', 'sunflower lecithin'], code: 'E322', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['agar agar', 'agar-agar'], code: 'E406', risk: 'aucun', circ: 'Naturel', note: 'Gélifiant naturel à base d\'algues.' },

  // --- Acides naturels ---
  { keywords: ['vitamine c', 'acide ascorbique', 'ascorbic acid'], code: 'E300', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['acide lactique', 'lactic acid'], code: 'E270', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['acide malique', 'malic acid'], code: 'E296', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['acide tartrique', 'tartaric acid'], code: 'E334', risk: 'aucun', circ: 'Naturel' },

  // --- Sucres naturels ---
  { keywords: ['sucre de coco', 'coconut sugar'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['rapadura', 'muscovado', 'panela'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['miel', 'honey'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sirop d\'erable', 'maple syrup'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sirop de datte', 'date syrup'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['erythritol'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Édulcorant naturel fermenté, considéré sûr par EFSA et FDA (GRAS)' },
  { keywords: ['stevia', 'stevia leaf', 'rebaudioside', 'steviol'], code: 'E960', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['monk fruit', 'luo han guo', 'fruit du moine'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['allulose'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['xylitol'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Sûr pour humains, TOXIQUE pour chiens.' },

  // --- Fruits & légumes ---
  { keywords: ['fruit', 'legume', 'vegetable'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['avocat', 'avocado'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['banane', 'banana'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['pomme', 'apple'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['fraise', 'strawberry'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['myrtille', 'blueberry'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['framboise', 'raspberry'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['tomate', 'tomato'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['carotte', 'carrot'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['epinard', 'spinach'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['brocoli', 'broccoli'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['concentre de jus', 'fruit juice concentrate', 'concentre de fruits', 'jus concentre', 'concentre de tomate'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['puree de fruits', 'fruit puree', 'puree de tomate'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Épices et aromates ---
  { keywords: ['gingembre', 'ginger'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['curcuma', 'turmeric'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['cannelle', 'cinnamon'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['vanille', 'vanilla', 'extrait de vanille', 'vanilla extract'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['poivre', 'pepper'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['paprika'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['cumin'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['origan', 'oregano'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['basilic', 'basil'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['thym', 'thyme'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['romarin', 'rosemary'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['ail', 'garlic'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['oignon', 'onion'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['epices', 'spices'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Thés ---
  { keywords: ['extrait de the vert', 'green tea extract', 'extrait de the', 'the vert'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['the noir', 'black tea'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['rooibos'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Sels minéraux sûrs ---
  { keywords: ['carbonate de magnesium', 'magnesium carbonate'], code: 'E504', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['citrate de sodium', 'sodium citrate'], code: 'E331', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['citrate de potassium', 'potassium citrate'], code: 'E332', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['chlorure de potassium', 'potassium chloride'], code: 'E508', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['carbonate de calcium', 'calcium carbonate'], code: 'E170', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['carbonate de sodium', 'sodium carbonate'], code: 'E500', risk: 'aucun', circ: 'Naturel' },

  // --- Antioxydants naturels ---
  { keywords: ['vitamine e naturelle', 'tocopherol naturel', 'natural tocopherol'], code: 'E306', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['extrait de romarin', 'rosemary extract'], code: 'E392', risk: 'aucun', circ: 'Naturel' },
] as const;

export const DANGER_PREGNANCY: readonly string[] = [
  'phtalate', 'dbp', 'dehp', 'dep',
  'cyclosiloxane', 'd4', 'd5',
  'acide salicylique',
  'pfas', 'perfluoro',
  'mercure', 'mercury', 'thimerosal',
  'formaldehyde', 'dmdm hydantoin', 'quaternium-15',
  'isobutylparaben', 'isopropylparaben',
  'hydroquinone',
  'oxybenzone',
  'retinol', 'retinyl palmitate',
] as const;

export function renderIngredientsDatabaseForPrompt(): string {
  const byRisk: Record<RiskLevel, IngredientEntry[]> = {
    danger: [], probable: [], possible: [], aucun: [],
  };
  for (const e of INGREDIENTS_DATABASE) byRisk[e.risk].push(e);

  const renderGroup = (label: string, entries: IngredientEntry[]): string => {
    const lines = entries.map((e) => {
      const kw = e.keywords.join(' | ');
      const code = e.code ? ` [${e.code}]` : '';
      const note = e.note ? ` — ${e.note}` : '';
      return `  • ${kw}${code} → ${e.circ}${note}`;
    });
    return `${label}\n${lines.join('\n')}`;
  };

  return [
    renderGroup('ROUGE (danger — Groupe 1 IARC) :', byRisk.danger),
    renderGroup('ORANGE (probable — Groupe 2A IARC ou Ultra-transformé sévère) :', byRisk.probable),
    renderGroup('JAUNE (possible — Groupe 2B IARC ou Controversé, MODÉRATION) :', byRisk.possible),
    renderGroup('VERT (aucun — Naturel sain) :', byRisk.aucun),
    `DANGER GROSSESSE (préfixer resume par "⚠️ DANGER GROSSESSE : ") : ${DANGER_PREGNANCY.join(', ')}`,
  ].join('\n\n');
}