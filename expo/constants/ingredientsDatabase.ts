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
  // 🔴 ROUGE — DANGER (Groupe 1 IARC officiel ou interdit santé)
  // Source: IARC Monographs, EFSA, FDA bans
  // ═══════════════════════════════════════════════════════════════

  // --- Nitrites & Nitrates (charcuterie industrielle) ---
  { keywords: ['nitrite de sodium', 'sodium nitrite'], code: 'E250', risk: 'danger', circ: 'Groupe 1', note: 'Forme des nitrosamines cancérigènes lors de la cuisson de la viande.' },
  { keywords: ['nitrite de potassium', 'potassium nitrite'], code: 'E249', risk: 'danger', circ: 'Groupe 1', note: 'Forme des nitrosamines cancérigènes lors de la cuisson de la viande.' },
  { keywords: ['nitrate de sodium', 'sodium nitrate'], code: 'E251', risk: 'danger', circ: 'Groupe 1', note: 'Convertit en nitrites puis nitrosamines dans le corps.' },
  { keywords: ['nitrate de potassium', 'potassium nitrate'], code: 'E252', risk: 'danger', circ: 'Groupe 1', note: 'Convertit en nitrites puis nitrosamines dans le corps.' },
  { keywords: ['nitrosamine', 'nitrosamines'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Cancérigène avéré formé par cuisson nitrites + viande.' },

  // --- Toxines & contaminants (Groupe 1 IARC) ---
  { keywords: ['aflatoxine', 'aflatoxin'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Mycotoxine cancérigène avérée (cancer du foie).' },
  { keywords: ['benzene'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Solvant cancérigène avéré (leucémie).' },
  { keywords: ['formaldehyde', 'formaldéhyde', 'formalin', 'methylene glycol'], code: 'E240', risk: 'danger', circ: 'Groupe 1', note: 'Cancérigène avéré (nasopharynx, leucémie). Interdit en cosmétique UE.' },

  // --- Métaux lourds ---
  { keywords: ['plomb', 'lead acetate'], code: null, risk: 'danger', circ: 'Groupe 2A', note: 'Neurotoxique, cancérigène probable. Interdit en cosmétique UE.' },
  { keywords: ['cadmium'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Métal lourd cancérigène avéré (poumon, rein).' },
  { keywords: ['arsenic'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Cancérigène avéré (peau, poumon, vessie).' },
  { keywords: ['mercure', 'mercury', 'thimerosal'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Neurotoxique sévère. Interdit en cosmétique UE.' },

  // --- Libérateurs de formaldéhyde (cosmétique) ---
  { keywords: ['dmdm hydantoin'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Libère du formaldéhyde cancérigène avéré.' },
  { keywords: ['quaternium-15', 'quaternium 15'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Libère du formaldéhyde cancérigène avéré.' },
  { keywords: ['diazolidinyl urea'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Libère du formaldéhyde cancérigène avéré.' },
  { keywords: ['imidazolidinyl urea'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Libère du formaldéhyde cancérigène avéré.' },
  { keywords: ['bronopol', '2-bromo-2-nitropropane'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Libère du formaldéhyde, peut former des nitrosamines.' },

  // --- Cosmétique cancérigène / interdit ---
  { keywords: ['ppd', 'para-phenylenediamine', 'p-phenylenediamine'], code: null, risk: 'danger', circ: 'Groupe 2B', note: 'Teinture capillaire allergisante sévère, suspecte cancer vessie.' },
  { keywords: ['coal tar', 'goudron de houille'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Cancérigène avéré. Interdit en cosmétique UE.' },
  { keywords: ['hydroquinone'], code: null, risk: 'danger', circ: 'Interdit UE', note: 'Agent éclaircissant interdit en Europe. Lié à ochronose et cancers cutanés.' },

  // --- PFAS / Téflon ---
  { keywords: ['ptfe', 'perfluoro', 'polyfluoro', 'pfas', 'pfoa'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Polluants éternels. PFOA classé Groupe 1 IARC en 2023.' },

  // --- Alcool ---
  { keywords: ['ethanol boisson', 'alcool ethylique boisson'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'L\'alcool dans les boissons est cancérigène avéré (Groupe 1 IARC).' },

  // --- Additifs interdits ou très problématiques ---
  { keywords: ['azodicarbonamide'], code: 'E927a', risk: 'danger', circ: 'Interdit UE', note: 'Interdit en UE depuis 2005. Libère du semicarbazide cancérigène.' },
  { keywords: ['potassium bromate', 'bromate de potassium'], code: 'E924', risk: 'danger', circ: 'Groupe 2B', note: 'Interdit en UE, Canada, Royaume-Uni. Cancérigène possible.' },


  // ═══════════════════════════════════════════════════════════════
  // 🟠 ORANGE — PROBABLE (Groupe 2A IARC, ultra-transformé sévère, perturbateurs endocriniens)
  // ═══════════════════════════════════════════════════════════════

  // --- Groupe 2A officiel IARC ---
  { keywords: ['acrylamide'], code: null, risk: 'probable', circ: 'Groupe 2A', note: 'Se forme à haute température (chips, frites, café). Probablement cancérigène.' },
  { keywords: ['glyphosate'], code: null, risk: 'probable', circ: 'Groupe 2A', note: 'Herbicide classé probablement cancérigène par le CIRC (2015).' },
  { keywords: ['viande rouge'], code: null, risk: 'probable', circ: 'Groupe 2A', note: 'Probablement cancérigène (cancer colorectal). Limiter à 500g/semaine.' },
  { keywords: ['viande transformee', 'viande transformée', 'processed meat', 'charcuterie'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Cancérigène avéré (cancer colorectal). 50g/jour = +18% de risque.' },

  // --- Gras trans / huiles hydrogénées (les vraies coupables) ---
  { keywords: ['gras trans', 'trans fat', 'acide gras trans'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Augmente maladies cardiovasculaires. Interdit aux USA depuis 2018.' },
  { keywords: ['huile hydrogenee', 'hydrogenated oil', 'partiellement hydrogene', 'partially hydrogenated'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Contient des gras trans, sauf mention "non hydrogéné".' },
  { keywords: ['graisse interesterifiee', 'interesterified fat'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Remplaçant des gras trans, effets métaboliques préoccupants.' },

  // --- Huile de palme (vraiment problématique) ---
  { keywords: ['huile de palme', 'palm oil'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Riche en acides gras saturés. Contaminants 3-MCPD et glycidol (Groupe 2A) lors du raffinage.' },

  // --- Édulcorants artificiels controversés ---
  { keywords: ['aspartame'], code: 'E951', risk: 'probable', circ: 'Groupe 2B', note: 'Classé possiblement cancérigène par le CIRC en juillet 2023.' },
  { keywords: ['acesulfame', 'acesulfame k', 'acesulfame potassium'], code: 'E950', risk: 'probable', circ: 'Perturbateur métabolique', note: 'Perturbe le microbiome intestinal. Lien suspecté avec diabète.' },

  // --- Conservateurs cancérigènes ---
  { keywords: ['bha', 'butylhydroxyanisole', 'butylated hydroxyanisole'], code: 'E320', risk: 'probable', circ: 'Groupe 2B', note: 'Classé cancérigène possible par le CIRC. Perturbateur endocrinien.' },
  { keywords: ['tbhq', 'tert-butylhydroquinone'], code: 'E319', risk: 'probable', circ: 'Ultra-transformé', note: 'Lié à des tumeurs dans des études animales. Limité en UE.' },

  // --- Colorants azoïques (vraiment problématiques) ---
  { keywords: ['jaune 5', 'yellow 5', 'tartrazine'], code: 'E102', risk: 'probable', circ: 'Allergène/Hyperactivité', note: 'Lié à l\'hyperactivité chez l\'enfant. Avertissement obligatoire en UE.' },
  { keywords: ['jaune 6', 'yellow 6', 'sunset yellow', 'jaune orange s'], code: 'E110', risk: 'probable', circ: 'Allergène/Hyperactivité', note: 'Colorant azoïque. Lié à l\'hyperactivité. Avertissement obligatoire en UE.' },
  { keywords: ['rouge cochenille a', 'ponceau 4r'], code: 'E124', risk: 'probable', circ: 'Allergène/Hyperactivité', note: 'Colorant azoïque. Interdit aux USA. Lié à l\'hyperactivité.' },
  { keywords: ['rouge 40', 'red 40', 'allura red'], code: 'E129', risk: 'probable', circ: 'Allergène/Hyperactivité', note: 'Colorant azoïque. Lié à l\'hyperactivité chez l\'enfant.' },
  { keywords: ['caramel ammoniacal', 'caramel au sulfite', 'caramel iv', 'sulfite ammonia caramel'], code: 'E150d', risk: 'probable', circ: 'Groupe 2B', note: 'Contient du 4-MEI classé Groupe 2B (sodas, colas).' },

  // --- Émulsifiants nocifs pour le microbiome ---
  { keywords: ['carraghenane', 'carrageenan'], code: 'E407', risk: 'probable', circ: 'Inflammation intestinale', note: 'Lié à l\'inflammation intestinale et au syndrome du côlon irritable.' },
  { keywords: ['polysorbate 80'], code: 'E433', risk: 'probable', circ: 'Perturbateur microbiome', note: 'Perturbe le microbiome intestinal selon études récentes (Nature 2015).' },
  { keywords: ['polysorbate 60', 'polysorbate 65', 'polysorbate 40', 'polysorbate 20'], code: 'E432-E436', risk: 'probable', circ: 'Perturbateur microbiome', note: 'Émulsifiants industriels qui perturbent le microbiome intestinal.' },
  { keywords: ['cmc', 'carboxymethylcellulose'], code: 'E466', risk: 'probable', circ: 'Perturbateur microbiome', note: 'Lié à l\'inflammation intestinale dans études récentes.' },

  // --- Exhausteurs de goût excitotoxiques ---
  { keywords: ['msg', 'glutamate monosodique', 'monosodium glutamate', 'acide glutamique'], code: 'E620-E621', risk: 'probable', circ: 'Excitotoxine', note: 'Excitotoxine qui stimule excessivement les neurones. Maux de tête possibles.' },

  // --- Aluminium (neurotoxique) ---
  { keywords: ['aluminium colorant', 'aluminum lake', 'e173'], code: 'E173', risk: 'probable', circ: 'Neurotoxique', note: 'Lien suspecté avec maladie d\'Alzheimer.' },
  { keywords: ['phosphate aluminium sodium', 'sodium aluminum phosphate'], code: 'E541', risk: 'probable', circ: 'Neurotoxique', note: 'Contient de l\'aluminium biodisponible.' },
  { keywords: ['silicate aluminium', 'aluminum silicate'], code: 'E554-E556', risk: 'probable', circ: 'Neurotoxique', note: 'Aluminium biodisponible, accumulation neurologique.' },
  { keywords: ['aluminum chlorohydrate', 'aluminium zirconium', 'aluminium chlorohydrate'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Sels d\'aluminium dans déodorants, lien suspecté cancer du sein.' },

  // --- Perturbateurs endocriniens (cosmétiques) ---
  { keywords: ['parabene', 'paraben', 'methylparaben', 'ethylparaben', 'propylparaben', 'butylparaben'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Mimique l\'œstrogène. Liens suspectés cancer du sein.' },
  { keywords: ['phtalate', 'phthalate', 'dbp', 'dehp', 'dep', 'dibutyl phthalate'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Perturbe la fertilité et le développement. Interdits dans jouets UE.' },
  { keywords: ['cyclosiloxane', 'cyclomethicone', 'cyclopentasiloxane', 'd4', 'd5'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien', note: 'D4 et D5 perturbateurs endocriniens. Restrictions UE.' },
  { keywords: ['triclosan', 'irgasan'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Perturbe la thyroïde. Interdit dans savons antibactériens FDA.' },
  { keywords: ['oxybenzone', 'benzophenone-3'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Filtre solaire perturbateur hormonal. Interdit dans certaines zones marines.' },
  { keywords: ['octinoxate', 'homosalate', 'octisalate', 'ethylhexyl methoxycinnamate'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Filtres solaires perturbateurs hormonaux.' },
  { keywords: ['phenoxyethanol'], code: null, risk: 'probable', circ: 'Allergène/Hépatotoxique', note: 'Interdit aux bébés <3 ans en France. Effets hépatiques.' },

  // --- Huiles minérales ---
  { keywords: ['paraffinum liquidum', 'petrolatum', 'mineral oil', 'huile minerale'], code: null, risk: 'probable', circ: 'Groupe 2A non-raffinées', note: 'Dérivés pétroliers. Non raffinées = Groupe 2A IARC.' },


  // ═══════════════════════════════════════════════════════════════
  // 🟡 JAUNE — POSSIBLE (Groupe 2B IARC, controversé, ultra-transformé léger, MODÉRATION)
  // C'EST ICI QUE BEAUCOUP D'INGRÉDIENTS DOIVENT TOMBER
  // ═══════════════════════════════════════════════════════════════

  // --- Sucres et sirops (modération, pas alarmiste) ---
  { keywords: ['sucre', 'sugar', 'saccharose', 'sucre de canne raffine', 'sucre blanc'], code: null, risk: 'possible', circ: 'Sucre raffiné', note: 'Consommer avec modération. Lié à obésité, diabète, inflammation.' },
  { keywords: ['sucre de canne', 'cane sugar'], code: null, risk: 'possible', circ: 'Sucre raffiné', note: 'Sucre rapide, à consommer avec modération.' },
  { keywords: ['sucres concentres', 'concentrated sugars', 'sucre concentre'], code: null, risk: 'possible', circ: 'Sucre raffiné', note: 'Forme concentrée de sucres, à modérer.' },
  { keywords: ['maltodextrine', 'maltodextrin'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Glucide ultra-transformé, index glycémique élevé. Modération.' },
  { keywords: ['sirop de glucose', 'glucose syrup'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Sirop industriel, à modérer.' },
  { keywords: ['sirop de glucose-fructose', 'hfcs', 'high fructose corn syrup'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Sirop à teneur élevée en fructose, lien obésité.' },
  { keywords: ['sirop de mais', 'corn syrup'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Sirop industriel.' },
  { keywords: ['sirop d\'agave', 'agave syrup'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Présenté comme naturel mais riche en fructose isolé.' },
  { keywords: ['sirop de riz', 'rice syrup'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Sirop transformé, index glycémique élevé.' },
  { keywords: ['dextrose'], code: null, risk: 'possible', circ: 'Sucre raffiné', note: 'Sucre rapide industriel.' },
  { keywords: ['fructose ajoute', 'added fructose', 'fructose isole'], code: null, risk: 'possible', circ: 'Sucre raffiné', note: 'Fructose isolé, lien stéatose hépatique.' },
  { keywords: ['dextrine'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Amidon hydrolysé partiellement.' },
  { keywords: ['amidon modifie', 'modified starch', 'modified corn starch'], code: 'E1404/E1412/E1422/E1450', risk: 'possible', circ: 'Ultra-transformé léger', note: 'Amidon traité chimiquement. Très courant.' },

  // --- Arômes ---
  { keywords: ['arome naturel', 'natural flavor', 'natural flavour', 'aromes naturels'], code: null, risk: 'possible', circ: 'Composition opaque', note: 'Composition non détaillée. Souvent extraite chimiquement malgré "naturel".' },
  { keywords: ['arome artificiel', 'artificial flavor', 'artificial flavour', 'aromes artificiels'], code: null, risk: 'possible', circ: 'Synthétique', note: 'Molécules synthétiques. Pas cancérigène mais signale produit ultra-transformé.' },
  { keywords: ['natural and artificial flavors'], code: null, risk: 'possible', circ: 'Composition opaque', note: 'Mélange arômes naturels et synthétiques.' },

  // --- Édulcorants Groupe 2B IARC ---
  { keywords: ['saccharine'], code: 'E954', risk: 'possible', circ: 'Groupe 2B historique', note: 'Anciennement Groupe 2B IARC (déclassé en 1999 mais reste controversé).' },
  { keywords: ['sucralose'], code: 'E955', risk: 'possible', circ: 'Controversé', note: 'Effets sur microbiome intestinal. À modérer.' },
  { keywords: ['cyclamate'], code: 'E952', risk: 'possible', circ: 'Interdit USA', note: 'Interdit aux USA depuis 1969. Autorisé en UE.' },

  // --- Colorants Groupe 2B / controversés ---
  { keywords: ['rouge 3', 'red 3', 'erythrosine'], code: 'E127', risk: 'possible', circ: 'Groupe 2B', note: 'Interdit dans les produits topiques aux USA depuis 1990.' },
  { keywords: ['bleu 1', 'blue 1', 'brilliant blue'], code: 'E133', risk: 'possible', circ: 'Controversé', note: 'Colorant artificiel, allergies possibles.' },
  { keywords: ['bleu 2', 'blue 2', 'indigotine'], code: 'E132', risk: 'possible', circ: 'Controversé', note: 'Colorant artificiel, allergies possibles.' },
  { keywords: ['vert 3', 'green 3'], code: 'E143', risk: 'possible', circ: 'Controversé', note: 'Colorant artificiel, interdit en UE.' },
  { keywords: ['dioxyde de titane', 'titanium dioxide'], code: 'E171', risk: 'possible', circ: 'Groupe 2B', note: 'Interdit comme additif alimentaire en UE depuis 2022. Nanoparticules suspectes.' },
  { keywords: ['carbon black', 'noir de carbone'], code: 'CI 77266', risk: 'possible', circ: 'Groupe 2B', note: 'Colorant noir, nanoparticules controversées.' },
  { keywords: ['cochenille carmin', 'carmine', 'cochineal'], code: 'E120', risk: 'possible', circ: 'Allergène', note: 'Colorant rouge naturel mais allergène fort, chocs anaphylactiques possibles.' },

  // --- Conservateurs controversés ---
  { keywords: ['sodium benzoate', 'benzoate de sodium', 'acide benzoique'], code: 'E211', risk: 'possible', circ: 'Controversé', note: 'Forme du benzène cancérigène avec vitamine C dans certaines boissons.' },
  { keywords: ['sulfite', 'sulphite', 'dioxyde de soufre', 'sulfur dioxide'], code: 'E220-E228', risk: 'possible', circ: 'Allergène', note: 'Allergène fort, déclenche crises d\'asthme. Modération.' },
  { keywords: ['bht', 'butylhydroxytoluene', 'butylated hydroxytoluene'], code: 'E321', risk: 'possible', circ: 'Controversé', note: 'Antioxydant synthétique. Effets hépatiques à fortes doses.' },

  // --- Émulsifiants modérés ---
  { keywords: ['mono et diglycerides', 'monoglycerides', 'diglycerides', 'mono and diglycerides'], code: 'E471', risk: 'possible', circ: 'Ultra-transformé léger', note: 'Émulsifiant industriel. Peut contenir traces gras trans cachées.' },
  { keywords: ['pgpr', 'polyglycerol polyricinoleate'], code: 'E476', risk: 'possible', circ: 'Ultra-transformé léger', note: 'Émulsifiant industriel dans chocolat industriel.' },
  { keywords: ['lecithine de soja', 'soy lecithin', 'soja lecithine'], code: 'E322', risk: 'possible', circ: 'OGM possible', note: 'Émulsifiant courant. Privilégier la lécithine de tournesol (sans OGM).' },
  { keywords: ['cellulose modifiee', 'modified cellulose', 'methylcellulose', 'hydroxypropyl methylcellulose'], code: 'E463-E465', risk: 'possible', circ: 'Ultra-transformé léger', note: 'Dérivés industriels de la cellulose.' },

  // --- Phosphates (excès dans alimentation moderne) ---
  { keywords: ['diphosphate'], code: 'E450', risk: 'possible', circ: 'Excès phosphates', note: 'Excès de phosphates lié à problèmes cardiaques et osseux.' },
  { keywords: ['tripolyphosphate'], code: 'E451', risk: 'possible', circ: 'Excès phosphates', note: 'Excès de phosphates lié à problèmes cardiaques.' },
  { keywords: ['polyphosphate'], code: 'E452', risk: 'possible', circ: 'Excès phosphates', note: 'Excès de phosphates dans l\'alimentation moderne.' },
  { keywords: ['phosphate de sodium', 'phosphate de potassium', 'phosphate de calcium'], code: 'E339-E343', risk: 'possible', circ: 'Excès phosphates', note: 'Sels phosphatés, modération.' },

  // --- Gommes (généralement OK mais modération) ---
  { keywords: ['gomme xanthane', 'xanthan gum', 'xanthan'], code: 'E415', risk: 'possible', circ: 'Controversé', note: 'Épaississant industriel. Effets digestifs à haute dose.' },
  { keywords: ['gomme guar', 'guar gum'], code: 'E412', risk: 'possible', circ: 'Controversé', note: 'Épaississant, effets digestifs possibles.' },
  { keywords: ['gomme arabique', 'arabic gum', 'gomme d\'acacia'], code: 'E414', risk: 'possible', circ: 'Naturel', note: 'Fibre naturelle, généralement bien tolérée.' },
  { keywords: ['gomme de caroube', 'carob gum', 'locust bean gum'], code: 'E410', risk: 'possible', circ: 'Naturel', note: 'Épaississant naturel à base de caroube.' },
  { keywords: ['gomme tara', 'tara gum'], code: 'E417', risk: 'possible', circ: 'Naturel', note: 'Peu étudiée, effets digestifs possibles.' },
  { keywords: ['gomme gellane', 'gellan gum'], code: 'E418', risk: 'possible', circ: 'Controversé', note: 'Effets digestifs à haute dose.' },
  { keywords: ['gomme konjac', 'konjac gum'], code: 'E425', risk: 'possible', circ: 'Risque étouffement', note: 'Risque de blocage intestinal et étouffement chez les enfants.' },
  { keywords: ['gomme karaya', 'karaya gum'], code: 'E416', risk: 'possible', circ: 'Allergène', note: 'Allergène pouvant provoquer des réactions.' },

  // --- Huiles raffinées (à modérer mais pas alarmer) ---
  { keywords: ['huile vegetale', 'vegetable oil'], code: null, risk: 'possible', circ: 'Raffinée non spécifiée', note: 'Composition non précisée, souvent palme ou colza raffinés.' },
  { keywords: ['huile de soja', 'soybean oil'], code: null, risk: 'possible', circ: 'Raffinée riche oméga-6', note: 'Excès oméga-6 pro-inflammatoire. Souvent OGM.' },
  { keywords: ['huile de mais', 'corn oil'], code: null, risk: 'possible', circ: 'Raffinée riche oméga-6', note: 'Excès oméga-6 pro-inflammatoire.' },
  { keywords: ['huile de coton', 'cottonseed oil'], code: null, risk: 'possible', circ: 'Raffinée', note: 'Souvent OGM et résidus de pesticides.' },
  { keywords: ['huile de colza raffinee', 'refined canola oil'], code: null, risk: 'possible', circ: 'Raffinée', note: 'Procédé industriel. Préférer pressée à froid.' },
  { keywords: ['huile de tournesol raffinee', 'refined sunflower oil'], code: null, risk: 'possible', circ: 'Raffinée riche oméga-6', note: 'Excès oméga-6. Préférer pressée à froid.' },
  { keywords: ['huile de pepin de raisin', 'grapeseed oil'], code: null, risk: 'possible', circ: 'Raffinée riche oméga-6', note: 'Très riche en oméga-6 pro-inflammatoires.' },

  // --- Protéines industrielles ---
  { keywords: ['proteines hydrolysees', 'hydrolyzed protein', 'hydrolyse', 'hydrolyzed'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Protéine industrielle. Peut contenir glutamate libre.' },
  { keywords: ['isolat de proteines', 'protein isolate', 'whey protein isolate', 'soy protein isolate', 'milk protein concentrate', 'casein isolate', 'pea protein isolate'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Protéines industrielles isolées. PAS aux concentrés de fruits/tomate.' },
  { keywords: ['caseinate', 'caseinate de sodium', 'sodium caseinate'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Protéine de lait industrielle.' },
  { keywords: ['extrait de levure', 'yeast extract'], code: null, risk: 'possible', circ: 'Glutamate caché', note: 'Contient du glutamate naturel, équivalent à du MSG caché.' },
  { keywords: ['mct oil', 'huile mct'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Triglycérides à chaîne moyenne extraits chimiquement.' },

  // --- Acides & autres ---
  { keywords: ['acide citrique', 'acide citrique industriel', 'citric acid'], code: 'E330', risk: 'possible', circ: 'Industriel sûr', note: 'Très courant. Produit par fermentation Aspergillus. Sûr pour la plupart.' },
  { keywords: ['guanylate', 'inosinate', 'disodium guanylate', 'disodium inosinate'], code: 'E626-E635', risk: 'possible', circ: 'Amplificateur de goût', note: 'Amplifie l\'effet du MSG.' },
  { keywords: ['silice', 'silicon dioxide', 'dioxyde de silicium'], code: 'E551', risk: 'possible', circ: 'Nanoparticules', note: 'Anti-agglomérant. Nanoparticules controversées.' },
  { keywords: ['glucuronolactone'], code: null, risk: 'possible', circ: 'Boisson énergisante', note: 'Synthétique. À éviter en grandes quantités.' },

  // --- Boissons énergisantes (ORANGE seulement dans ce contexte) ---
  { keywords: ['taurine'], code: null, risk: 'possible', circ: 'Boisson énergisante', note: 'Acide aminé synthétique. ORANGE si boisson énergisante combinée à caféine.' },
  { keywords: ['cafeine ajoutee', 'added caffeine'], code: null, risk: 'possible', circ: 'Stimulant', note: 'Caféine ajoutée. Modération, surtout chez jeunes et femmes enceintes.' },
  { keywords: ['inositol'], code: null, risk: 'possible', circ: 'Boisson énergisante', note: 'Nutriment. ORANGE seulement si boisson énergisante.' },

  // --- Vitamines synthétiques en boisson énergisante ---
  { keywords: ['niacinamide', 'pyridoxine hcl', 'calcium pantothenate', 'cyanocobalamin', 'cobalamin synthetique'], code: null, risk: 'possible', circ: 'Synthétique', note: 'Vitamines synthétiques (sûres dans aliments normaux, controversées en megadoses).' },

  // --- Cosmétique modéré ---
  { keywords: ['fragrance', 'parfum'], code: null, risk: 'possible', circ: 'Composition opaque', note: 'Composition non divulguée, peut contenir des dizaines de molécules.' },
  { keywords: ['peg-', 'sles', 'sodium laureth sulfate', 'sodium lauryl sulfate', 'sls'], code: null, risk: 'possible', circ: 'Irritant/Contamination 1,4-dioxane', note: 'Tensioactif irritant, contamination possible au 1,4-dioxane cancérigène.' },

  // --- Viandes conventionnelles (modération, pas alarme) ---
  { keywords: ['poulet conventionnel', 'conventional chicken'], code: null, risk: 'possible', circ: 'Élevage intensif', note: 'Élevage intensif. Privilégier le bio ou fermier.' },
  { keywords: ['boeuf conventionnel', 'conventional beef'], code: null, risk: 'possible', circ: 'Élevage intensif', note: 'Élevage intensif. Privilégier grass-fed bio.' },
  { keywords: ['porc conventionnel', 'conventional pork'], code: null, risk: 'possible', circ: 'Élevage intensif', note: 'Élevage intensif. Privilégier élevage plein air.' },
  { keywords: ['saumon d\'elevage', 'farmed salmon', 'atlantic salmon'], code: null, risk: 'possible', circ: 'Élevage intensif', note: 'Colorants, antibiotiques possibles. Préférer saumon sauvage.' },

  // --- Couleurs / colorants Groupe 2B & autres ---
  { keywords: ['chlorophylle cuivree', 'copper chlorophyll'], code: 'E141', risk: 'possible', circ: 'Controversé', note: 'Contient du cuivre, accumulation possible.' },
  { keywords: ['sulfate de cuivre', 'copper sulfate'], code: 'E519', risk: 'possible', circ: 'Controversé', note: 'Toxique à doses élevées.' },
  { keywords: ['ferrocyanure de sodium', 'sodium ferrocyanide'], code: 'E535', risk: 'possible', circ: 'Controversé', note: 'Anti-agglomérant dans le sel. Stable en conditions normales.' },

  // --- Alginates ---
  { keywords: ['alginate'], code: 'E402-E404', risk: 'possible', circ: 'Naturel', note: 'Extrait d\'algues, généralement sûr.' },
  { keywords: ['phosphatides ammonium', 'ammonium phosphatides'], code: 'E442', risk: 'possible', circ: 'Controversé', note: 'Émulsifiant peu étudié à long terme.' },
  { keywords: ['ester acide gras', 'fatty acid ester'], code: 'E474-E496', risk: 'possible', circ: 'Industriel', note: 'Émulsifiants industriels variés.' },


  // ═══════════════════════════════════════════════════════════════
  // 🟢 VERT — AUCUN (Naturel sain, non transformé)
  // ═══════════════════════════════════════════════════════════════

  // --- Base ---
  { keywords: ['eau', 'water', 'aqua', 'eau gazeifiee', 'carbonated water', 'sparkling water'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Ingrédient de base essentiel.' },
  { keywords: ['sel', 'salt', 'sel marin', 'sel de mer', 'fleur de sel'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Sel naturel, à consommer raisonnablement.' },

  // --- Céréales et féculents ---
  { keywords: ['farine de ble', 'farine complete', 'wheat flour', 'whole flour', 'farine integrale'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['avoine', 'oat', 'flocons d\'avoine'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['riz', 'rice', 'riz complet', 'brown rice'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['quinoa'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['orge', 'barley'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sarrasin', 'buckwheat'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['millet'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['epeautre', 'spelt'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['amidon de ble', 'wheat starch', 'amidon naturel'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Amidon naturel (pas modifié).' },

  // --- Huiles saines ---
  { keywords: ['huile d\'olive extra vierge', 'extra virgin olive oil', 'huile d\'olive vierge'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Riche en oméga-3 et antioxydants.' },
  { keywords: ['huile de coco vierge', 'virgin coconut oil', 'huile de coco non raffinee'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Non hydrogénée uniquement.' },
  { keywords: ['huile d\'avocat', 'avocado oil'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['huile de lin', 'flaxseed oil', 'linseed oil'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Riche en oméga-3.' },
  { keywords: ['huile de noix', 'walnut oil'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['huile de sesame', 'sesame oil'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['huile de chanvre', 'hemp oil'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Produits laitiers entiers ---
  { keywords: ['beurre', 'butter', 'beurre fermier'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['creme', 'cream', 'creme fraiche', 'heavy cream'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['lait', 'milk', 'lait entier', 'whole milk', 'lait frais'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['lait ecreme', 'skim milk', 'skimmed milk', 'lait demi-ecreme'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['yaourt', 'yogurt', 'yaourt nature'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['fromage blanc', 'fromage frais', 'cottage cheese'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['oeuf', 'egg', 'oeufs frais', 'whole eggs'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['whey naturel', 'lactoserum', 'whey concentrate naturel'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Sauf isolat industriel.' },

  // --- Levures et ferments ---
  { keywords: ['levure', 'yeast', 'levure seche', 'levure boulanger'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Pas extrait de levure.' },
  { keywords: ['lactobacillus', 'bifidobacterium', 'probiotique', 'probiotic', 'ferments lactiques', 'lactic cultures', 'live cultures'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Vinaigres ---
  { keywords: ['vinaigre', 'vinegar', 'vinaigre de cidre', 'vinaigre balsamique', 'apple cider vinegar'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Levants & acides naturels ---
  { keywords: ['bicarbonate', 'baking soda', 'bicarbonate de sodium'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['poudre a lever', 'baking powder', 'levure chimique', 'raising agents'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['vitamine c', 'acide ascorbique', 'ascorbic acid'], code: 'E300', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['acide lactique', 'lactic acid'], code: 'E270', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['acide malique', 'malic acid'], code: 'E296', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['acide tartrique', 'tartaric acid'], code: 'E334', risk: 'aucun', circ: 'Naturel' },

  // --- Sucres naturels ---
  { keywords: ['miel', 'honey', 'miel brut'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sirop d\'erable', 'maple syrup', 'sirop d\'erable pur'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sirop de datte', 'date syrup'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sucre de coco', 'coconut sugar'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['rapadura', 'muscovado', 'panela', 'sucre complet'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['stevia', 'stevia leaf', 'rebaudioside', 'steviol'], code: 'E960', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['monk fruit', 'luo han guo', 'fruit du moine'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['erythritol'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Édulcorant naturel fermenté, considéré sûr par EFSA et FDA.' },
  { keywords: ['allulose'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['xylitol'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Sûr pour humains, TOXIQUE pour chiens.' },

  // --- Émulsifiants naturels ---
  { keywords: ['pectine', 'pectin'], code: 'E440', risk: 'aucun', circ: 'Naturel', note: 'Fibre naturelle extraite de fruits.' },
  { keywords: ['lecithine de tournesol', 'sunflower lecithin'], code: 'E322', risk: 'aucun', circ: 'Naturel', note: 'Émulsifiant naturel sans OGM.' },
  { keywords: ['agar agar', 'agar-agar'], code: 'E406', risk: 'aucun', circ: 'Naturel', note: 'Gélifiant naturel à base d\'algues.' },
  { keywords: ['anthocyane', 'anthocyanin'], code: 'E163', risk: 'aucun', circ: 'Naturel', note: 'Colorant naturel antioxydant.' },

  // --- Cacao et chocolat (le vrai) ---
  { keywords: ['cacao', 'cocoa', 'cacao pur', 'pate de cacao', 'cocoa mass'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Ne pas confondre avec cadmium.' },
  { keywords: ['beurre de cacao', 'cocoa butter'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['chocolat noir 70', 'dark chocolate 70', 'chocolat noir', 'dark chocolate'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Chocolat noir 70%+ : riche en antioxydants.' },

  // --- Noix, graines, légumineuses ---
  { keywords: ['noix', 'walnut', 'walnuts'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['amande', 'almond', 'almonds'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['noisette', 'hazelnut', 'hazelnuts', 'pate de noisette'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['noix de cajou', 'cashew'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['pistache', 'pistachio'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['noix de pecan', 'pecan'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['noix de macadamia', 'macadamia'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['noix du bresil', 'brazil nut'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de chia', 'chia seeds'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de lin', 'flax seeds', 'linseed'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de tournesol', 'sunflower seeds'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de courge', 'pumpkin seeds'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de sesame', 'sesame seeds'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['lentilles', 'lentils'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['pois chiches', 'chickpeas', 'garbanzo'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['haricots', 'beans'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Fruits & légumes ---
  { keywords: ['fruit', 'fruits', 'legume', 'legumes', 'vegetable', 'vegetables'], code: null, risk: 'aucun', circ: 'Naturel' },
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
  { keywords: ['concentre de jus', 'fruit juice concentrate', 'concentre de fruits', 'jus concentre', 'concentre de tomate', 'tomato concentrate'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Concentrés naturels (pas protéines industrielles).' },
  { keywords: ['puree de fruits', 'fruit puree', 'puree de tomate', 'tomato puree'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Épices et aromates ---
  { keywords: ['gingembre', 'ginger'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['curcuma', 'turmeric'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['cannelle', 'cinnamon'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['vanille', 'vanilla', 'extrait de vanille', 'vanilla extract', 'gousse de vanille'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['poivre', 'pepper', 'poivre noir'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['paprika'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['cumin'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['origan', 'oregano'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['basilic', 'basil'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['thym', 'thyme'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['romarin', 'rosemary'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['ail', 'garlic'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['oignon', 'onion'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['epices', 'spices'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Thés & infusions ---
  { keywords: ['extrait de the vert', 'green tea extract', 'extrait de the', 'the vert', 'green tea'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['the noir', 'black tea'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['rooibos'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Sels minéraux sûrs ---
  { keywords: ['carbonate de magnesium', 'magnesium carbonate'], code: 'E504', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['citrate de sodium', 'sodium citrate'], code: 'E331', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['citrate de potassium', 'potassium citrate'], code: 'E332', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['chlorure de potassium', 'potassium chloride'], code: 'E508', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['carbonate de calcium', 'calcium carbonate'], code: 'E170', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['carbonate de sodium', 'sodium carbonate'], code: 'E500', risk: 'aucun', circ: 'Naturel' },

  // --- Protéines animales saines ---
  { keywords: ['saumon sauvage', 'wild salmon', 'wild-caught salmon'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Riche en oméga-3.' },
  { keywords: ['poulet bio', 'organic chicken', 'poulet biologique', 'free-range chicken bio'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Sans antibiotiques ni hormones.' },
  { keywords: ['boeuf grass-fed', 'grass-fed beef', 'bœuf bio', 'organic beef', 'boeuf bio'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Élevage à l\'herbe, meilleur profil nutritionnel.' },
  { keywords: ['oeufs bio', 'organic eggs', 'oeufs fermiers'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sardine', 'sardines'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Riche en oméga-3, peu de mercure.' },
  { keywords: ['maquereau', 'mackerel'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['anchois', 'anchovy'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Antioxydants naturels ---
  { keywords: ['vitamine e naturelle', 'tocopherol naturel', 'natural tocopherol'], code: 'E306', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['rosmarin extrait', 'rosemary extract'], code: 'E392', risk: 'aucun', circ: 'Naturel' },
] as const;

export const DANGER_PREGNANCY: readonly string[] = [
  'phtalate', 'dbp', 'dehp', 'dep',
  'cyclosiloxane', 'd4', 'd5',
  'acide salicylique', 'salicylic acid',
  'pfas', 'perfluoro', 'pfoa',
  'mercure', 'mercury', 'thimerosal',
  'formaldehyde', 'dmdm hydantoin', 'quaternium-15',
  'isobutylparaben', 'isopropylparaben',
  'hydroquinone',
  'oxybenzone', 'octinoxate',
  'retinol', 'retinyl palmitate', 'vitamine a synthetique',
  'plomb', 'lead',
  'aflatoxine',
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
    renderGroup('ROUGE (danger — Groupe 1 IARC officiel ou interdit) :', byRisk.danger),
    renderGroup('ORANGE (probable — Groupe 2A IARC, perturbateurs endocriniens, ultra-transformés sévères) :', byRisk.probable),
    renderGroup('JAUNE (possible — Groupe 2B IARC, controversés, ultra-transformés légers, MODÉRATION) :', byRisk.possible),
    renderGroup('VERT (aucun — Naturel sain) :', byRisk.aucun),
    `DANGER GROSSESSE (préfixer resume par "⚠️ DANGER GROSSESSE : ") : ${DANGER_PREGNANCY.join(', ')}`,
  ].join('\n\n');
}