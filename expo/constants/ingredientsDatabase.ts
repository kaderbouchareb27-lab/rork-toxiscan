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
  // 🔴 ROUGE — DANGER (Cancérigène avéré Groupe 1 IARC)
  // ═══════════════════════════════════════════════════════════════
  { keywords: ['nitrite de sodium', 'sodium nitrite', 'e250'], code: 'E250', risk: 'danger', circ: 'Groupe 1', note: 'Cancérogène avéré. Forme des nitrosamines cancérigènes.' },
  { keywords: ['nitrite de potassium', 'potassium nitrite', 'e249'], code: 'E249', risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['nitrate de sodium', 'sodium nitrate', 'e251'], code: 'E251', risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['nitrate de potassium', 'potassium nitrate', 'e252'], code: 'E252', risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['formaldehyde', 'formaldéhyde', 'formalin', 'methylene glycol', 'e240'], code: 'E240', risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['dmdm hydantoin', 'dmdm hydantoïne'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Libérateur de formaldéhyde' },
  { keywords: ['quaternium-15', 'quaternium 15'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Libérateur de formaldéhyde' },
  { keywords: ['diazolidinyl urea', 'diazolidinyl urée'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Libérateur de formaldéhyde' },
  { keywords: ['imidazolidinyl urea', 'imidazolidinyl urée'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Libérateur de formaldéhyde' },
  { keywords: ['bronopol'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['plomb', 'lead acetate'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['cadmium'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['arsenic'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['mercure', 'mercury', 'thimerosal'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['benzene', 'benzène'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['aflatoxine', 'aflatoxin'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['ppd', 'para-phenylenediamine', 'p-phenylenediamine'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['coal tar', 'goudron de houille'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['ptfe', 'perfluoro', 'polyfluoro', 'pfas', 'teflon'], code: null, risk: 'danger', circ: 'Groupe 1' },
  { keywords: ['alcool ethylique', 'ethanol boisson', 'alcool'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Dans les boissons alcoolisées uniquement' },
  { keywords: ['viande transformee', 'viande transformée', 'processed meat', 'charcuterie industrielle'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Cancérogène avéré. 50g/jour = +18% risque cancer colorectal.' },
  { keywords: ['nitrosamine', 'nitrosamines'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Cancérigène avéré formé par cuisson nitrites + viande.' },
  { keywords: ['hydroquinone'], code: null, risk: 'danger', circ: 'Interdit UE' },

  // ═══════════════════════════════════════════════════════════════
  // 🟠 ORANGE — ULTRA-TRANSFORMÉ (Groupe 2A IARC ou ultra-transformé sévère)
  // ═══════════════════════════════════════════════════════════════

  // --- Groupe 2A IARC officiel ---
  { keywords: ['acrylamide'], code: null, risk: 'probable', circ: 'Groupe 2A' },
  { keywords: ['glyphosate'], code: null, risk: 'probable', circ: 'Groupe 2A' },
  { keywords: ['viande rouge', 'red meat'], code: null, risk: 'probable', circ: 'Groupe 2A' },

  // --- Huiles ultra-transformées → ORANGE ---
  { keywords: ['huile de palme', 'palm oil', 'graisses de palme', 'graisses vegetales', 'graisse de palme'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Contient du 3-MCPD et glycidol cancérigènes.' },
  { keywords: ['huile de colza', 'canola oil', 'rapeseed oil', 'huile de canola'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Huile raffinée industriellement. Préférer pressée à froid.' },
  { keywords: ['huile de tournesol', 'sunflower oil', 'huile de tournesol raffinee'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Riche en oméga-6 pro-inflammatoires. Déséquilibre omega-6/omega-3.' },
  { keywords: ['huile de soja', 'soybean oil', 'soy oil'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Excès oméga-6. Souvent OGM.' },
  { keywords: ['huile de mais', 'corn oil', 'huile de maïs'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Excès oméga-6 pro-inflammatoire.' },
  { keywords: ['huile de coton', 'cottonseed oil'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Souvent OGM et résidus de pesticides.' },
  { keywords: ['huile vegetale', 'vegetable oil', 'huiles vegetales', 'corps gras vegetaux'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Composition non précisée, souvent palme ou colza raffinés.' },
  { keywords: ['hydrogenated', 'hydrogene', 'partiellement hydrogene', 'huile hydrogénée', 'graisse hydrogénée'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Contient des graisses trans.' },
  { keywords: ['gras trans', 'trans fat', 'acides gras trans'], code: null, risk: 'probable', circ: 'Ultra-transformé' },
  { keywords: ['graisse interesterifiee', 'interesterified', 'graisse interestérifiée'], code: null, risk: 'probable', circ: 'Ultra-transformé' },

  // --- Amidons modifiés → ORANGE ---
  { keywords: ['amidon modifie', 'amidon modifié', 'modified starch', 'fécule modifiée', 'fecula modifiee', 'e1404', 'e1412', 'e1422', 'e1450'], code: 'E1404/E1412/E1422/E1450', risk: 'probable', circ: 'Ultra-transformé', note: 'Glucide industriel ultra-transformé à fort index glycémique.' },

  // --- Protéines industrielles → ORANGE ---
  { keywords: ['proteines hydrolysees', 'hydrolyzed protein', 'hydrolyse', 'hydrolyzed', 'protéines hydrolysées'], code: null, risk: 'probable', circ: 'Ultra-transformé' },
  { keywords: ['caseinate', 'caseinate de sodium', 'caséinate'], code: null, risk: 'probable', circ: 'Ultra-transformé' },
  { keywords: ['isolat de proteines', 'protein isolate', 'soy protein isolate', 'milk protein concentrate', 'pea protein isolate', 'isolat de protéines'], code: null, risk: 'probable', circ: 'Ultra-transformé' },

  // --- Édulcorants problématiques → ORANGE ---
  { keywords: ['acesulfame', 'acesulfame k', 'acesulfame potassium', 'e950'], code: 'E950', risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Dégrade le microbiome intestinal. Perturbateur endocrinien.' },
  { keywords: ['aspartame', 'e951'], code: 'E951', risk: 'probable', circ: 'Groupe 2B', note: 'Classé possiblement cancérigène par le CIRC en 2023.' },

  // --- Conservateurs dangereux → ORANGE ---
  { keywords: ['bha', 'butylhydroxyanisole', 'e320'], code: 'E320', risk: 'probable', circ: 'Groupe 2B', note: 'Perturbateur endocrinien, cancérigène possible.' },
  { keywords: ['tbhq', 'e319'], code: 'E319', risk: 'probable', circ: 'Ultra-transformé', note: 'Lié à tumeurs dans études animales.' },

  // --- Colorants azoïques → ORANGE ---
  { keywords: ['tartrazine', 'jaune 5', 'yellow 5', 'e102'], code: 'E102', risk: 'probable', circ: 'Hyperactivité', note: 'Lié à l\'hyperactivité chez l\'enfant. Interdit sans avertissement.' },
  { keywords: ['jaune 6', 'yellow 6', 'sunset yellow', 'jaune orange s', 'e110'], code: 'E110', risk: 'probable', circ: 'Hyperactivité', note: 'Colorant azoïque lié à l\'hyperactivité chez l\'enfant.' },
  { keywords: ['ponceau 4r', 'rouge cochenille a', 'e124'], code: 'E124', risk: 'probable', circ: 'Hyperactivité', note: 'Interdit aux USA, lié à hyperactivité.' },
  { keywords: ['rouge 40', 'red 40', 'allura red', 'e129'], code: 'E129', risk: 'probable', circ: 'Hyperactivité', note: 'Colorant azoïque. Oxford 2024 : dommages ADN confirmés.' },
  { keywords: ['caramel ammoniacal sulfite', 'sulfite ammonia caramel', 'caramel iv', 'e150d'], code: 'E150d', risk: 'probable', circ: 'Groupe 2B', note: 'Contient du 4-MEI classé Groupe 2B.' },

  // --- Émulsifiants perturbateurs microbiome → ORANGE ---
  { keywords: ['carraghenane', 'carrageenan', 'carraghénane', 'e407'], code: 'E407', risk: 'probable', circ: 'Inflammation intestinale', note: 'Lié à l\'inflammation intestinale et aux maladies inflammatoires.' },
  { keywords: ['cmc', 'carboxymethylcellulose', 'e466'], code: 'E466', risk: 'probable', circ: 'Perturbateur microbiome', note: 'Perturbe le microbiome intestinal.' },
  { keywords: ['polysorbate 80', 'polysorbate80', 'e433'], code: 'E433', risk: 'probable', circ: 'Perturbateur microbiome', note: 'Perturbe le microbiome, favorise l\'inflammation chronique.' },
  { keywords: ['polysorbate 60', 'polysorbate 65', 'polysorbate 40', 'polysorbate 20', 'e432', 'e434', 'e435', 'e436'], code: 'E432-E436', risk: 'probable', circ: 'Perturbateur microbiome' },

  // --- Exhausteurs excitotoxiques → ORANGE ---
  { keywords: ['msg', 'glutamate monosodique', 'monosodium glutamate', 'acide glutamique', 'e620', 'e621'], code: 'E620-E621', risk: 'probable', circ: 'Excitotoxine', note: 'Excitotoxine qui stimule excessivement les neurones.' },

  // --- Aluminium → ORANGE ---
  { keywords: ['silicate aluminium', 'aluminum silicate', 'e554', 'e555', 'e556'], code: 'E554-E556', risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Accumulation neurologique préoccupante.' },
  { keywords: ['ferrocyanure de sodium', 'sodium ferrocyanide', 'e535'], code: 'E535', risk: 'probable', circ: 'Toxique' },
  { keywords: ['phosphate aluminium sodium', 'sodium aluminum phosphate', 'e541'], code: 'E541', risk: 'probable', circ: 'Neurotoxique', note: 'Aluminium neurotoxique lié à Alzheimer.' },

  // --- Additifs interdits → ORANGE ---
  { keywords: ['azodicarbonamide', 'e927a'], code: 'E927a', risk: 'probable', circ: 'Interdit UE' },
  { keywords: ['potassium bromate', 'e924'], code: 'E924', risk: 'probable', circ: 'Groupe 2B', note: 'Interdit en UE, Canada, Royaume-Uni.' },

  // --- Perturbateurs endocriniens cosmétiques → ORANGE ---
  { keywords: ['parabene', 'paraben', 'methylparaben', 'ethylparaben', 'propylparaben', 'butylparaben', 'méthylparaben', 'propylparaben'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Détectés dans des tumeurs du sein.' },
  { keywords: ['phtalate', 'phthalate', 'dbp', 'dehp', 'dep'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['cyclosiloxane', 'cyclomethicone', 'cyclopentasiloxane'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['triclosan', 'irgasan'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Interdit dans les savons aux USA depuis 2017.' },
  { keywords: ['phenoxyethanol', 'phénoxyéthanol'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Interdit bébé <3 ans en France.' },
  { keywords: ['oxybenzone', 'benzophenone-3', 'benzophenone 3'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['octinoxate', 'homosalate', 'octisalate'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['aluminum chlorohydrate', 'aluminium zirconium', 'chlorhydrate d\'aluminium'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['paraffinum liquidum', 'petrolatum', 'mineral oil', 'huile minérale'], code: null, risk: 'probable', circ: 'Groupe 2A', note: 'Huiles minérales raffinées cancérigènes probables.' },

  // ═══════════════════════════════════════════════════════════════
  // 🟡 JAUNE — MODÉRATION (Groupe 2B IARC ou transformé modéré)
  // ═══════════════════════════════════════════════════════════════

  // --- Sucres et sirops → JAUNE ---
  { keywords: ['sucre', 'sugar', 'saccharose', 'sucre blanc', 'sucre raffiné', 'sucre raffine'], code: null, risk: 'possible', circ: 'Sucre raffiné', note: 'Lié à obésité, diabète type 2 et inflammation chronique.' },
  { keywords: ['sucre de canne', 'cane sugar', 'sucre de canne roux', 'raw cane sugar'], code: null, risk: 'possible', circ: 'Sucre raffiné' },
  { keywords: ['sucres', 'sugars'], code: null, risk: 'possible', circ: 'Sucre raffiné', note: 'Sucres ajoutés. Consommer avec modération.' },
  { keywords: ['sirop de glucose-fructose', 'glucose-fructose syrup', 'hfcs', 'high fructose corn syrup', 'sirop de glucose fructose'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Lié à l\'obésité et syndrome métabolique.' },
  { keywords: ['sirop de glucose', 'glucose syrup', 'glucose-sirop'], code: null, risk: 'possible', circ: 'Ultra-transformé léger' },
  { keywords: ['sirop de mais', 'corn syrup', 'sirop de maïs'], code: null, risk: 'possible', circ: 'Ultra-transformé léger' },
  { keywords: ['sirop d\'agave', 'agave syrup', 'agave nectar', 'nectar d\'agave'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Riche en fructose isolé.' },
  { keywords: ['sirop de riz', 'rice syrup'], code: null, risk: 'possible', circ: 'Ultra-transformé léger' },
  { keywords: ['maltodextrine', 'maltodextrin'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Index glycémique très élevé.' },
  { keywords: ['dextrose'], code: null, risk: 'possible', circ: 'Sucre raffiné' },
  { keywords: ['dextrine'], code: null, risk: 'possible', circ: 'Ultra-transformé léger' },
  { keywords: ['fructose'], code: null, risk: 'possible', circ: 'Sucre raffiné', note: 'Fructose isolé — différent des fruits entiers.' },
  { keywords: ['jus de raisin concentre', 'jus de raisin concentré', 'concentrated grape juice', 'raisin concentré'], code: null, risk: 'possible', circ: 'Sucre concentré', note: 'Sucres concentrés à fort index glycémique.' },
  { keywords: ['jus de pommes concentre', 'jus de pommes concentré', 'concentrated apple juice'], code: null, risk: 'possible', circ: 'Sucre concentré' },
  { keywords: ['jus concentre', 'jus concentré', 'fruit juice concentrate', 'concentrated fruit juice'], code: null, risk: 'possible', circ: 'Sucre concentré' },

  // --- Huile de pépin de raisin → JAUNE ---
  { keywords: ['huile de pepin de raisin', 'grapeseed oil', 'pépins de raisin'], code: null, risk: 'possible', circ: 'Raffinée riche oméga-6', note: 'Très riche en oméga-6 pro-inflammatoires.' },

  // --- Arômes → JAUNE ---
  { keywords: ['arome naturel', 'arôme naturel', 'aromes naturels', 'arômes naturels', 'natural flavor', 'natural flavour', 'natural flavors', 'natural flavours', 'arome', 'arôme', 'aromes', 'arômes', 'flavour', 'flavor', 'flavouring', 'flavoring'], code: null, risk: 'possible', circ: 'Composition opaque', note: 'Souvent extraits avec solvants industriels. Composition non divulguée.' },
  { keywords: ['arome artificiel', 'arôme artificiel', 'artificial flavor', 'artificial flavour', 'artificial flavors'], code: null, risk: 'possible', circ: 'Synthétique', note: 'Molécules synthétiques. Marqueur de produit ultra-transformé.' },

  // --- Émulsifiants modérés → JAUNE ---
  { keywords: ['emulsifiant', 'emulsifiants', 'émulsifiant', 'émulsifiants', 'emulsifier', 'emulsifiers', 'e471', 'mono et diglycerides', 'monoglycerides', 'diglycerides', 'mono- et diglycérides', 'monodiglycérides', 'mono and diglycerides', 'mono- and diglycerides'], code: 'E471', risk: 'possible', circ: 'Ultra-transformé léger', note: 'Peuvent contenir des graisses trans cachées.' },
  { keywords: ['lecithine de soja', 'soy lecithin', 'lécithine de soja', 'lecithin', 'lécithine'], code: 'E322', risk: 'possible', circ: 'OGM possible', note: 'Émulsifiant courant. Peut être OGM.' },
  { keywords: ['pgpr', 'polyglycerol polyricinoleate', 'e476'], code: 'E476', risk: 'possible', circ: 'Ultra-transformé léger' },
  { keywords: ['poudre a lever', 'poudres a lever', 'poudres à lever', 'baking powder', 'levure chimique', 'raising agents', 'agent levant', 'agents levants'], code: null, risk: 'possible', circ: 'Additif', note: 'Contient souvent des phosphates. Modération.' },

  // --- Gommes → JAUNE ---
  { keywords: ['gomme xanthane', 'xanthan gum', 'xanthan', 'e415'], code: 'E415', risk: 'possible', circ: 'Controversé', note: 'Peut perturber la digestion chez les personnes sensibles.' },
  { keywords: ['gomme guar', 'guar gum', 'e412'], code: 'E412', risk: 'possible', circ: 'Controversé' },
  { keywords: ['gomme arabique', 'arabic gum', 'acacia gum', 'e414'], code: 'E414', risk: 'possible', circ: 'Controversé' },
  { keywords: ['gomme de caroube', 'carob gum', 'e410'], code: 'E410', risk: 'possible', circ: 'Controversé' },
  { keywords: ['gomme konjac', 'konjac gum', 'e425'], code: 'E425', risk: 'possible', circ: 'Controversé', note: 'Risque de blocage intestinal.' },
  { keywords: ['gomme tara', 'tara gum', 'e417'], code: 'E417', risk: 'possible', circ: 'Controversé' },
  { keywords: ['gomme gellane', 'gellan gum', 'e418'], code: 'E418', risk: 'possible', circ: 'Controversé' },
  { keywords: ['alginate', 'e402', 'e403', 'e404'], code: 'E402-E404', risk: 'possible', circ: 'Controversé' },

  // --- Acide citrique → JAUNE ---
  { keywords: ['acide citrique', 'citric acid', 'e330', 'acidifiant acide citrique', 'acidifiant (acide citrique)', 'acidifiant: acide citrique'], code: 'E330', risk: 'possible', circ: 'Industriel', note: 'Produit par fermentation fongique. Peut éroder l\'émail dentaire.' },

  // --- Phosphates → JAUNE ---
  { keywords: ['diphosphate', 'e450'], code: 'E450', risk: 'possible', circ: 'Excès phosphates' },
  { keywords: ['tripolyphosphate', 'e451'], code: 'E451', risk: 'possible', circ: 'Excès phosphates' },
  { keywords: ['polyphosphate', 'e452'], code: 'E452', risk: 'possible', circ: 'Excès phosphates' },
  { keywords: ['phosphate de sodium', 'phosphate de potassium', 'phosphate de calcium', 'e339', 'e340', 'e341'], code: 'E339/E340/E341', risk: 'possible', circ: 'Excès phosphates' },

  // --- Conservateurs modérés → JAUNE ---
  { keywords: ['sodium benzoate', 'benzoate de sodium', 'e211'], code: 'E211', risk: 'possible', circ: 'Controversé', note: 'Forme du benzène avec vitamine C dans certaines boissons.' },
  { keywords: ['bht', 'butylhydroxytoluene', 'e321'], code: 'E321', risk: 'possible', circ: 'Controversé' },
  { keywords: ['sulfite', 'sulphite', 'dioxyde de soufre', 'sulfur dioxide', 'e220', 'e221', 'e222', 'e223', 'e224', 'e225', 'e226', 'e227', 'e228'], code: 'E220-E228', risk: 'possible', circ: 'Allergène', note: 'Provoque des crises d\'asthme et réactions allergiques.' },
  { keywords: ['sorbate de potassium', 'potassium sorbate', 'e202'], code: 'E202', risk: 'possible', circ: 'Conservateur', note: 'Conservateur synthétique généralement bien toléré mais controversé.' },
  { keywords: ['propionate de calcium', 'calcium propionate', 'e282'], code: 'E282', risk: 'possible', circ: 'Conservateur', note: 'Lié à irritabilité et troubles du comportement chez l\'enfant.' },

  // --- Colorants Groupe 2B → JAUNE ---
  { keywords: ['rouge 3', 'red 3', 'erythrosine', 'e127'], code: 'E127', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['bleu 1', 'blue 1', 'e133'], code: 'E133', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['bleu 2', 'blue 2', 'e132'], code: 'E132', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['vert 3', 'green 3', 'e143'], code: 'E143', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['dioxyde de titane', 'titanium dioxide', 'e171'], code: 'E171', risk: 'possible', circ: 'Groupe 2B', note: 'Interdit en alimentation en UE depuis 2022.' },
  { keywords: ['cochenille', 'carmine', 'carmin', 'cochineal', 'e120'], code: 'E120', risk: 'possible', circ: 'Allergène', note: 'Allergène fort, chocs anaphylactiques possibles.' },
  { keywords: ['caramel ammoniacal', 'caramel iii', 'e150c'], code: 'E150c', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['silice', 'silicon dioxide', 'e551'], code: 'E551', risk: 'possible', circ: 'Controversé' },

  // --- Édulcorants Groupe 2B → JAUNE ---
  { keywords: ['saccharine', 'saccharin', 'e954'], code: 'E954', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['sucralose', 'e955'], code: 'E955', risk: 'possible', circ: 'Groupe 2B', note: 'Perturbe le microbiome intestinal selon études récentes.' },
  { keywords: ['cyclamate', 'e952'], code: 'E952', risk: 'possible', circ: 'Groupe 2B' },

  // --- Extrait de levure → JAUNE ---
  { keywords: ['extrait de levure', 'yeast extract', 'extraits de levure'], code: null, risk: 'possible', circ: 'Glutamate caché', note: 'Contient du glutamate naturel — MSG caché.' },

  // --- Amplificateurs de goût → JAUNE ---
  { keywords: ['guanylate', 'inosinate', 'e626', 'e627', 'e628', 'e629', 'e630', 'e631', 'e632', 'e633', 'e634', 'e635'], code: 'E626-E635', risk: 'possible', circ: 'Amplificateur de goût' },

  // --- Cosmétique modéré → JAUNE ---
  { keywords: ['fragrance', 'parfum'], code: null, risk: 'possible', circ: 'Composition opaque', note: 'Composition non divulguée. Peut contenir des allergènes.' },
  { keywords: ['peg-', 'sles', 'sodium laureth sulfate'], code: null, risk: 'possible', circ: 'Controversé', note: 'Peut contenir du 1,4-dioxane cancérigène.' },
  { keywords: ['inuline', 'inuline d\'agave'], code: null, risk: 'possible', circ: 'Controversé', note: 'Généralement bénéfique mais peut causer inconforts digestifs en excès.' },

  // ═══════════════════════════════════════════════════════════════
  // 🟢 VERT — APPROUVÉ (Naturel sain)
  // ═══════════════════════════════════════════════════════════════

  // --- Base ---
  { keywords: ['eau', 'water', 'aqua', 'eau gazeifiee', 'eau gazéifiée', 'carbonated water', 'sparkling water', 'eau pétillante', 'eau minérale'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sel', 'salt', 'sel marin', 'sel de mer', 'fleur de sel', 'sel iode', 'sel iodé'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Céréales et féculents ---
  { keywords: ['farine de ble', 'farine de blé', 'farine complete', 'wheat flour', 'whole wheat flour', 'whole flour'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['avoine', 'oat', 'flocons d\'avoine'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['riz', 'rice', 'riz complet', 'brown rice'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['quinoa'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['orge', 'barley'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sarrasin', 'buckwheat'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['epeautre', 'épeautre', 'spelt'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['amidon de ble', 'amidon de blé', 'wheat starch', 'fécule de pomme de terre', 'potato starch', 'fécule de maïs', 'cornstarch'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Amidon naturel non modifié.' },

  // --- Vinaigres ---
  { keywords: ['vinaigre', 'vinegar', 'vinaigre de cidre', 'vinaigre de cidre de pomme', 'apple cider vinegar', 'vinaigre balsamique', 'vinaigre de vin'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Huiles saines ---
  { keywords: ['huile d\'olive', 'huile d\'olive extra vierge', 'extra virgin olive oil', 'olive oil'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['huile de coco vierge', 'coconut oil', 'huile de noix de coco', 'virgin coconut oil'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['huile d\'avocat', 'avocado oil'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['huile de lin', 'flaxseed oil', 'linseed oil'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['huile de noix', 'walnut oil'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['huile de sesame', 'huile de sésame', 'sesame oil'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Produits laitiers ---
  { keywords: ['beurre', 'butter'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['creme', 'crème', 'cream', 'creme fraiche', 'crème fraîche'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['lait', 'milk', 'lait entier', 'whole milk'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['lait ecreme', 'lait écrémé', 'skim milk', 'skimmed milk', 'lait en poudre', 'milk powder', 'lait écrémé en poudre', 'skimmed milk powder'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['yaourt', 'yogurt', 'yoghurt'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['fromage', 'cheese', 'fromage blanc'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['oeuf', 'oeufs', 'egg', 'eggs', 'œuf', 'œufs'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Levures et ferments ---
  { keywords: ['levure', 'yeast', 'levure seche', 'levure sèche', 'dried yeast', 'levure boulangere', 'levure boulangère'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['bicarbonate', 'bicarbonate de sodium', 'sodium bicarbonate', 'baking soda'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['ferments lactiques', 'lactic cultures', 'live cultures', 'lactobacillus', 'probiotique'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Cacao et chocolat ---
  { keywords: ['cacao', 'cocoa', 'chocolat en poudre', 'cacao en poudre', 'cocoa powder'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['beurre de cacao', 'cocoa butter'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['pate de cacao', 'pâte de cacao', 'cocoa mass', 'chocolate liquor'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Noix, graines et beurres ---
  { keywords: ['noisette', 'hazelnut', 'noisettes', 'hazelnuts', 'pate de noisette', 'pâte de noisette', 'hazelnut paste'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['amande', 'almond', 'amandes', 'almonds'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['noix', 'nuts', 'walnuts', 'noix de cajou', 'cashew', 'pistache', 'pistachio'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de chia', 'chia seeds', 'chia'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de lin', 'flax seeds', 'lin'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de tournesol', 'sunflower seeds'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de sesame', 'graines de sésame', 'sesame seeds', 'sésame'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Légumineuses ---
  { keywords: ['lentilles', 'lentils'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['pois chiches', 'chickpeas', 'pois chiche'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['haricots', 'beans', 'haricot'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['soja', 'soy', 'tofu'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Non OGM et non transformé. Modération recommandée.' },

  // --- Fruits et légumes ---
  { keywords: ['fruit', 'legume', 'vegetable'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['pomme', 'apple', 'poire', 'pear', 'banane', 'banana', 'citron', 'lemon'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['tomate', 'tomato', 'tomates', 'tomatoes', 'concentre de tomate', 'concentré de tomate', 'tomato paste', 'puree de tomate', 'purée de tomate'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['carotte', 'carrot', 'carottes', 'carrots'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['epinard', 'épinard', 'spinach', 'brocoli', 'broccoli'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['raisin', 'grape', 'raisins', 'grapes'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['fraise', 'strawberry', 'myrtille', 'blueberry', 'framboise', 'raspberry'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['fibre de racine de manioc', 'cassava root fiber', 'manioc', 'cassava', 'tapioca'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Fibre naturelle prébiotique.' },

  // --- Épices et aromates ---
  { keywords: ['gingembre', 'ginger'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['curcuma', 'turmeric'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['cannelle', 'cinnamon'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['vanille', 'vanilla', 'extrait de vanille', 'vanilla extract', 'gousse de vanille'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['poivre', 'pepper', 'paprika', 'cumin', 'origan', 'oregano', 'basilic', 'basil', 'thym', 'thyme', 'romarin', 'rosemary'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['ail', 'garlic', 'oignon', 'onion', 'echalote', 'échalote', 'shallot'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['epices', 'épices', 'spices', 'herbes', 'herbs', 'fines herbes'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Sucres naturels ---
  { keywords: ['sucre de coco', 'coconut sugar'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['miel', 'honey'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sirop d\'erable', 'sirop d\'érable', 'maple syrup'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['erythritol', 'érythritol'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Édulcorant naturel fermenté. Sûr selon EFSA et FDA.' },
  { keywords: ['stevia', 'stévia', 'stevia leaf', 'extrait de stevia', 'extrait de stévia', 'extrait de feuilles de stevia', 'extrait de feuilles de stévia', 'rebaudioside', 'steviol', 'e960'], code: 'E960', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['xylitol'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Sûr pour humains. TOXIQUE pour chiens.' },
  { keywords: ['monk fruit', 'luo han guo', 'fruit du moine'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Acides et antioxydants naturels ---
  { keywords: ['vitamine c', 'acide ascorbique', 'ascorbic acid', 'e300'], code: 'E300', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['acide lactique', 'lactic acid', 'e270'], code: 'E270', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['acide malique', 'malic acid', 'e296'], code: 'E296', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['pectine', 'pectin', 'e440'], code: 'E440', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['lecithine de tournesol', 'sunflower lecithin', 'lécithine de tournesol'], code: 'E322', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['agar agar', 'agar-agar', 'e406'], code: 'E406', risk: 'aucun', circ: 'Naturel' },

  // --- Sels minéraux sûrs ---
  { keywords: ['citrate de sodium', 'sodium citrate', 'e331'], code: 'E331', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['citrate de potassium', 'potassium citrate', 'e332'], code: 'E332', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['chlorure de potassium', 'potassium chloride', 'e508'], code: 'E508', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['carbonate de calcium', 'calcium carbonate', 'e170'], code: 'E170', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['carbonate de sodium', 'sodium carbonate', 'e500'], code: 'E500', risk: 'aucun', circ: 'Naturel' },

  // --- Thés et plantes ---
  { keywords: ['the vert', 'thé vert', 'green tea', 'extrait de the vert', 'extrait de thé vert'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['the noir', 'thé noir', 'black tea', 'rooibos'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Protéines et poissons naturels ---
  { keywords: ['saumon sauvage', 'wild salmon', 'sardine', 'sardines', 'maquereau', 'mackerel', 'anchois', 'anchovy'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Riche en oméga-3.' },

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
  'alcool', 'alcohol',
  'aspartame',
  'nitrite',
] as const;

export function renderIngredientsDatabaseForPrompt(): string {
  const byRisk: Record<RiskLevel, IngredientEntry[]> = {
    danger: [], probable: [], possible: [], aucun: [],
  };
  for (const e of INGREDIENTS_DATABASE) byRisk[e.risk].push(e as IngredientEntry);

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
    renderGroup('🔴 ROUGE (danger — Cancérigène avéré Groupe 1 IARC) :', byRisk.danger),
    renderGroup('🟠 ORANGE (probable — Ultra-transformé sévère / Groupe 2A IARC) :', byRisk.probable),
    renderGroup('🟡 JAUNE (possible — Modération / Groupe 2B IARC) :', byRisk.possible),
    renderGroup('🟢 VERT (aucun — Naturel sain) :', byRisk.aucun),
    `⚠️ DANGER GROSSESSE : ${DANGER_PREGNANCY.join(', ')}`,
  ].join('\n\n');
}