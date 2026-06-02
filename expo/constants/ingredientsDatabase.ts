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
  { keywords: ['viande transformee', 'viande transformée', 'processed meat', 'charcuterie industrielle', 'charcuterie'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Cancérogène avéré. 50g/jour = +18% risque cancer colorectal.' },
  // Charcuteries spécifiques — Groupe 1 IARC (cancérogène avéré), sauf pepperoni traité comme ultra-transformé
  // (Pepperoni a été déplacé en ORANGE — voir section ultra-transformés)
  { keywords: ['salami', 'salamis'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Charcuterie fermentée avec nitrites. Cancérogène avéré Groupe 1 OMS.' },
  { keywords: ['saucisson', 'saucisson sec', 'dry sausage', 'cured sausage'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Charcuterie séchée aux nitrites. Cancérogène avéré Groupe 1 OMS.' },
  { keywords: ['chorizo'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Charcuterie espagnole aux nitrites. Cancérogène avéré Groupe 1 OMS.' },
  { keywords: ['mortadelle', 'mortadella'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Charcuterie industrielle. Cancérogène avéré Groupe 1 OMS.' },
  { keywords: ['bacon', 'lardons', 'lardon', 'pancetta', 'poitrine fumee', 'poitrine fumée'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Charcuterie fumée aux nitrites. Cancérogène avéré Groupe 1 OMS.' },
  { keywords: ['jambon', 'jambon cuit', 'jambon cru', 'jambon sec', 'jambon de paris', 'ham', 'cured ham', 'cooked ham', 'prosciutto', 'serrano'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Charcuterie aux nitrites (sauf mention "sans nitrites"). Cancérogène avéré Groupe 1 OMS.' },
  { keywords: ['saucisse', 'saucisses', 'sausage', 'sausages', 'merguez', 'chipolata', 'hot dog', 'hot dogs', 'hotdog', 'frankfurter', 'wiener'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Saucisse industrielle avec conservateurs nitrites. Cancérogène avéré Groupe 1 OMS.' },
  { keywords: ['pastrami', 'corned beef', 'viande des grisons', 'bresaola'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Viande séchée/fumée aux nitrites. Cancérogène avéré Groupe 1 OMS.' },
  { keywords: ['jerky', 'beef jerky', 'boeuf seche', 'bœuf séché'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Viande séchée industrielle (souvent avec nitrites). Cancérogène avéré Groupe 1 OMS.' },
  { keywords: ['nitrosamine', 'nitrosamines'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Cancérigène avéré formé par cuisson nitrites + viande.' },
  { keywords: ['hydroquinone'], code: null, risk: 'danger', circ: 'Interdit UE' },

  // --- NOUVEAUX 🔴 ROUGE ---
  { keywords: ['acide borique', 'boric acid', 'e284'], code: 'E284', risk: 'danger', circ: 'Toxique avéré', note: 'Toxique reproduction, accumulation rénale. Interdit alimentation dans plusieurs pays.' },
  { keywords: ['tetraborate de sodium', 'tétraborate de sodium', 'borax', 'sodium tetraborate', 'e285'], code: 'E285', risk: 'danger', circ: 'Toxique avéré', note: 'Interdit UE depuis 2010. Perturbateur endocrinien, toxique reproduction.' },
  { keywords: ['sulfate de cuivre', 'copper sulfate', 'e519'], code: 'E519', risk: 'danger', circ: 'Toxique avéré', note: 'Utilisé comme pesticide. Accumulation hépatique. Interdit alimentation humaine dans plusieurs pays.' },

  // ═══════════════════════════════════════════════════════════════
  // 🟠 ORANGE — ULTRA-TRANSFORMÉ (Groupe 2A IARC ou ultra-transformé sévère)
  // ═══════════════════════════════════════════════════════════════

  // --- Groupe 2A IARC officiel (probablement cancérogène = ORANGE, pas rouge) ---
  { keywords: ['acrylamide'], code: null, risk: 'probable', circ: 'Groupe 2A', note: 'Groupe 2A CIRC (probablement cancérogène) mais génotoxique confirmé chez l\'humain (forme des adduits ADN). L\'UE a fixé des seuils réglementaires obligatoires en 2017. Se forme à haute température dans chips, frites, café, biscuits, pain grillé.' },
  { keywords: ['glyphosate'], code: null, risk: 'probable', circ: 'Groupe 2A', note: 'Herbicide classé probablement cancérogène par le CIRC (2015). Lien établi avec lymphome non hodgkinien. Résidus fréquents dans céréales, légumineuses et produits transformés non bio.' },
  { keywords: ['viande rouge', 'red meat'], code: null, risk: 'probable', circ: 'Groupe 2A' },
  { keywords: ['hijiki'], code: null, risk: 'probable', circ: 'Groupe 1 (arsenic)', note: 'Algue brune japonaise contenant des niveaux élevés d\'arsenic inorganique (Groupe 1 CIRC, cancérogène avéré). Sa vente est déconseillée ou interdite au Canada, Royaume-Uni, Nouvelle-Zélande et Australie. Préférer wakame, nori ou kombu.' },

  // --- Huiles ultra-transformées → ORANGE ---
  // Huile de palme : Groupe 2A IARC (3-MCPD/glycidol = PROBABLEMENT cancérogène, pas Groupe 1) → ORANGE, pas rouge.
  { keywords: ['huile de palme', 'palm oil', 'graisse de palme', 'graisses de palme', 'huile de palme raffinee', 'huile de palme raffinée', 'refined palm oil', 'palm fruit oil', 'huile de palmiste', 'palm kernel oil'], code: null, risk: 'probable', circ: 'Groupe 2A (3-MCPD/glycidol)', note: 'Huile raffinée contenant du 3-MCPD et des esters de glycidol classés Groupe 2A CIRC (probablement cancérogène) à des niveaux préoccupants. L\'EFSA a fixé une DJA très basse en 2018. Procédé de raffinage à haute température. Désastre écologique (déforestation).' },
  { keywords: ['huile de colza', 'canola oil', 'rapeseed oil', 'huile de canola'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Huile raffinée industriellement. Préférer pressée à froid.' },
  { keywords: ['huile de tournesol', 'sunflower oil', 'huile de tournesol raffinee', 'huile de tournesol à haute teneur en acide oléique', 'high oleic sunflower oil'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Riche en oméga-6 pro-inflammatoires. Déséquilibre omega-6/omega-3.' },
  { keywords: ['huile de soja', 'soybean oil', 'soy oil'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Excès oméga-6. Souvent OGM.' },
  { keywords: ['huile de mais', 'corn oil', 'huile de maïs'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Excès oméga-6 pro-inflammatoire.' },
  { keywords: ['huile de coton', 'cottonseed oil'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Souvent OGM et résidus de pesticides.' },
  { keywords: ['huile vegetale', 'vegetable oil', 'huiles vegetales', 'corps gras vegetaux', 'huile végétale', 'graisses vegetales', 'graisses végétales', 'matiere grasse vegetale', 'matière grasse végétale'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Composition non précisée, souvent palme ou colza raffinés.' },
  { keywords: ['hydrogenated', 'hydrogene', 'partiellement hydrogene', 'huile hydrogénée', 'graisse hydrogénée'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Contient des graisses trans.' },
  { keywords: ['gras trans', 'trans fat', 'acides gras trans'], code: null, risk: 'probable', circ: 'Ultra-transformé' },
  { keywords: ['graisse interesterifiee', 'interesterified', 'graisse interestérifiée'], code: null, risk: 'probable', circ: 'Ultra-transformé' },

  // --- Amidons modifiés → ORANGE ---
  // Amidon modifié — 4 entrées séparées (E1404/E1412/E1422/E1450) pour que chaque code soit findable individuellement.
  { keywords: ['amidon modifie', 'amidon modifié', 'modified starch', 'fécule modifiée', 'fecula modifiee', 'modified cornstarch', 'modified corn starch', 'modified wheat starch', 'modified rice starch', 'modified tapioca starch', 'corn starch modified', 'amidon de mais oxyde', 'oxidized starch', 'e1404'], code: 'E1404', risk: 'probable', circ: 'Ultra-transformé', note: 'Amidon oxydé industriellement. Glucide ultra-transformé à fort index glycémique.' },
  { keywords: ['phosphate de diamidon', 'distarch phosphate', 'e1412'], code: 'E1412', risk: 'probable', circ: 'Ultra-transformé', note: 'Amidon réticulé par phosphate. Glucide ultra-transformé à fort index glycémique.' },
  { keywords: ['phosphate de diamidon acetyle', 'acetylated distarch phosphate', 'amidon modifié acétylé', 'fécule de pomme de terre modifiée', 'fecule de pomme de terre modifiee', 'modified potato starch', 'fécule modifiée de pomme de terre', 'e1422'], code: 'E1422', risk: 'probable', circ: 'Ultra-transformé', note: 'Amidon acétylé industriellement. Glucide ultra-transformé à fort index glycémique.' },
  { keywords: ['amidon hydroxypropyl', 'hydroxypropyl starch', 'hydroxypropyl distarch phosphate', 'e1450'], code: 'E1450', risk: 'probable', circ: 'Ultra-transformé', note: 'Amidon hydroxypropylé industriel. Glucide ultra-transformé à fort index glycémique.' },

  // --- Charcuteries / viandes transformées → ORANGE ---
  // Pepperoni, classé comme ultra-transformé (porc/bœuf fermenté + nitrites + additifs).
  { keywords: ['pepperoni', 'pepperonis'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Charcuterie ultra-transformée à base de viande fermentée, sel nitrité et additifs industriels. Riche en sodium, gras saturés et conservateurs. À éviter ou consommer très rarement.' },

  // --- Protéines industrielles → ORANGE ---
  { keywords: ['proteines hydrolysees', 'hydrolyzed protein', 'hydrolyse', 'hydrolyzed', 'protéines hydrolysées'], code: null, risk: 'probable', circ: 'Ultra-transformé' },
  { keywords: ['caseinate', 'caseinate de sodium', 'caséinate'], code: null, risk: 'probable', circ: 'Ultra-transformé' },
  { keywords: ['isolat de proteines', 'protein isolate', 'soy protein isolate', 'milk protein concentrate', 'pea protein isolate', 'isolat de protéines', 'proteine de soya texturee', 'protéine de soya texturée', 'textured soy protein', 'soja texturé', 'tsp', 'tvp'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Isolat protéique industriel ultra-transformé.' },
  { keywords: ['substances laitieres modifiees', 'substances laitières modifiées', 'modified milk ingredients', 'ingredients laitiers modifies', 'ingrédients laitiers modifiés'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Mélange industriel de protéines de lait modifiées. Marqueur d\'ultra-transformation.' },

  // --- Édulcorants problématiques → ORANGE ---
  { keywords: ['acesulfame', 'acesulfame k', 'acesulfame potassium', 'e950'], code: 'E950', risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Dégrade le microbiome intestinal. Perturbateur endocrinien.' },
  { keywords: ['aspartame', 'e951'], code: 'E951', risk: 'probable', circ: 'Groupe 2B', note: 'Interdit dans certains pays. Considéré cancérigène possible par le CIRC (Groupe 2B). À éviter.' },

  // --- Conservateurs dangereux → ORANGE ---
  { keywords: ['bha', 'butylhydroxyanisole', 'e320'], code: 'E320', risk: 'probable', circ: 'Groupe 2B', note: 'Interdit dans certains pays. Considéré cancérigène possible par le CIRC (Groupe 2B). À éviter.' },
  { keywords: ['tbhq', 'e319'], code: 'E319', risk: 'probable', circ: 'Ultra-transformé', note: 'Lié à tumeurs dans études animales.' },

  // --- Colorants azoïques et colorants jaunes/oranges → ORANGE ---
  { keywords: ['annatto', 'rocou', 'extrait d\'annatto', 'annatto extract', 'e160b'], code: 'E160b', risk: 'probable', circ: 'Hyperactivité', note: 'Colorant semi-synthétique (jaune/orange) lié à des réactions allergiques, à l\'hyperactivité chez l\'enfant et à des perturbations hormonales.' },
  { keywords: ['tartrazine', 'jaune 5', 'yellow 5', 'fd&c yellow 5', 'e102'], code: 'E102', risk: 'probable', circ: 'Hyperactivité', note: 'Colorant synthétique jaune lié à l\'hyperactivité chez l\'enfant, à des réactions allergiques et à des perturbations hormonales. Avertissement obligatoire en UE.' },
  { keywords: ['jaune 6', 'yellow 6', 'sunset yellow', 'jaune orange s', 'fd&c yellow 6', 'e110'], code: 'E110', risk: 'probable', circ: 'Hyperactivité', note: 'Colorant azoïque jaune/orange lié à l\'hyperactivité chez l\'enfant, allergies et perturbations hormonales.' },
  { keywords: ['ponceau 4r', 'rouge cochenille a', 'e124'], code: 'E124', risk: 'probable', circ: 'Hyperactivité', note: 'Interdit aux USA, lié à hyperactivité.' },
  { keywords: ['rouge 40', 'red 40', 'allura red', 'rouge allura', 'fd&c red 40', 'fd c red 40', 'fd&c couleur rouge 40', 'fd&c couleur rouge #40', 'rouge #40', 'red #40', 'e129'], code: 'E129', risk: 'probable', circ: 'Hyperactivité', note: 'Colorant alimentaire synthétique lié à l\'hyperactivité chez l\'enfant. Oxford 2024 : dommages ADN confirmés. Préoccupations cancérigènes documentées.' },
  { keywords: ['orange b'], code: null, risk: 'probable', circ: 'Hyperactivité', note: 'Colorant azoïque synthétique lié à des réactions allergiques, à l\'hyperactivité chez l\'enfant et à des perturbations hormonales.' },
  { keywords: ['azorubine', 'carmoisine', 'rouge azo', 'e122'], code: 'E122', risk: 'probable', circ: 'Hyperactivité', note: 'Colorant azoïque lié hyperactivité enfant. Interdit dans plusieurs pays.' },
  { keywords: ['bleu 1', 'blue 1', 'bleu brillant', 'bleu brillant fcf', 'brilliant blue', 'brilliant blue fcf', 'fd&c blue 1', 'fd c blue 1', 'fcf', 'e133'], code: 'E133', risk: 'probable', circ: 'Hyperactivité', note: 'Colorant synthétique pétrolier. Lié à hyperactivité, interdit dans plusieurs pays européens.' },
  { keywords: ['caramel ammoniacal sulfite', 'sulfite ammonia caramel', 'caramel iv', 'e150d'], code: 'E150d', risk: 'probable', circ: 'Groupe 2B', note: 'Colorant ultra-transformé obtenu par chauffage de sucres avec ammoniaque et sulfites. Contient du 4-MEI classé Groupe 2B CIRC (possiblement cancérogène). Présent dans les colas.' },
  { keywords: ['caramel ammoniacal', 'caramel iii', 'e150c'], code: 'E150c', risk: 'probable', circ: 'Groupe 2B', note: 'Colorant caramel ultra-transformé produit avec ammoniaque. Contient du 4-MEI (Groupe 2B CIRC).' },
  { keywords: ['caramel sulfite caustique', 'caustic sulfite caramel', 'caramel ii', 'e150b'], code: 'E150b', risk: 'probable', circ: 'Ultra-transformé', note: 'Colorant caramel ultra-transformé produit avec sulfites. Sous-produits controversés.' },
  { keywords: ['colorant caramel', 'caramel colour', 'caramel color', 'colour caramel'], code: 'E150', risk: 'probable', circ: 'Ultra-transformé', note: 'Colorant caramel industriel. Sans précision (b/c/d), il est généralement obtenu par procédés chimiques (ammoniaque/sulfites) générant du 4-MEI possiblement cancérogène (Groupe 2B CIRC).' },

  // --- Émulsifiants perturbateurs microbiome → ORANGE ---
  { keywords: ['carraghenane', 'carrageenan', 'carraghénane', 'e407'], code: 'E407', risk: 'probable', circ: 'Inflammation intestinale', note: 'Lié à l\'inflammation intestinale et aux maladies inflammatoires.' },
  { keywords: ['cmc', 'carboxymethylcellulose', 'e466'], code: 'E466', risk: 'probable', circ: 'Perturbateur microbiome', note: 'Perturbe le microbiome intestinal.' },
  { keywords: ['polysorbate 80', 'polysorbate80', 'e433'], code: 'E433', risk: 'probable', circ: 'Perturbateur microbiome', note: 'Perturbe le microbiome, favorise l\'inflammation chronique.' },
  // Polysorbates — entrées individuelles pour que chaque code soit findable.
  { keywords: ['polysorbate 20', 'e432'], code: 'E432', risk: 'probable', circ: 'Perturbateur microbiome' },
  { keywords: ['polysorbate 40', 'e434'], code: 'E434', risk: 'probable', circ: 'Perturbateur microbiome' },
  { keywords: ['polysorbate 60', 'e435'], code: 'E435', risk: 'probable', circ: 'Perturbateur microbiome' },
  { keywords: ['polysorbate 65', 'e436'], code: 'E436', risk: 'probable', circ: 'Perturbateur microbiome' },

  // --- Exhausteurs excitotoxiques → ORANGE ---
  // MSG / acide glutamique — entrées individuelles.
  { keywords: ['acide glutamique', 'glutamic acid', 'e620'], code: 'E620', risk: 'probable', circ: 'Excitotoxine', note: 'Excitotoxine, même famille que MSG.' },
  { keywords: ['msg', 'glutamate monosodique', 'monosodium glutamate', 'e621'], code: 'E621', risk: 'probable', circ: 'Excitotoxine', note: 'Excitotoxine qui stimule excessivement les neurones.' },

  // --- Aluminium → ORANGE ---
  // Silicates d'aluminium — entrées individuelles par code.
  { keywords: ['silicate alumino-sodique', 'sodium aluminosilicate', 'e554'], code: 'E554', risk: 'probable', circ: 'Neurotoxique', note: 'Accumulation aluminium liée à Alzheimer.' },
  { keywords: ['silicate alumino-potassique', 'potassium aluminosilicate', 'e555'], code: 'E555', risk: 'probable', circ: 'Neurotoxique', note: 'Accumulation aluminium liée à Alzheimer.' },
  { keywords: ['silicate alumino-calcique', 'calcium aluminosilicate', 'silicate aluminium', 'aluminum silicate', 'e556'], code: 'E556', risk: 'probable', circ: 'Neurotoxique', note: 'Accumulation aluminium liée à Alzheimer.' },
  { keywords: ['ferrocyanure de sodium', 'sodium ferrocyanide', 'e535'], code: 'E535', risk: 'probable', circ: 'Toxique' },
  { keywords: ['phosphate aluminium sodium', 'sodium aluminum phosphate', 'phosphate acide d\'aluminium et de sodium', 'e541'], code: 'E541', risk: 'probable', circ: 'Neurotoxique', note: 'Aluminium neurotoxique lié à Alzheimer.' },

  // --- Additifs interdits → ORANGE ---
  { keywords: ['azodicarbonamide', 'e927a'], code: 'E927a', risk: 'danger', circ: 'Interdit UE/Australie/Singapour', note: 'Interdit dans l\'UE, Australie et Singapour (amende prison à Singapour). Se dégrade à la cuisson en semicarbazide et uréthane, tous deux classés cancérigènes possibles (Groupe 2B). Surnommé "le chimique du tapis de yoga" car utilisé dans la fabrication de mousses plastiques.' },
  { keywords: ['potassium bromate', 'bromate de potassium', 'e924'], code: 'E924', risk: 'danger', circ: 'Groupe 2B — interdit mondial', note: 'Classé Groupe 2B par le CIRC, mais interdit en UE, Canada, Royaume-Uni, Chine, Brésil, Pérou et Nigéria pour cancers rénaux et thyroïdiens confirmés en études animales. Plus interdit que toléré dans le monde — son usage encore autorisé aux USA est très contesté.' },

  // --- Sels et minéraux industriels → ORANGE ---
  { keywords: ['citrate de sodium', 'sodium citrate', 'e331'], code: 'E331', risk: 'probable', circ: 'Ultra-transformé', note: 'Sel synthétisé industriellement, aucune forme naturelle. Marqueur d\'ultra-transformation.' },
  { keywords: ['carbonate de calcium', 'calcium carbonate', 'e170'], code: 'E170', risk: 'probable', circ: 'Ultra-transformé', note: 'Extraction et raffinage industriels lourds (mines). Procédé minier intensif.' },

  // --- Ingrédients industriels ultra-transformés → ORANGE ---
  { keywords: ['vinaigre en poudre', 'powdered vinegar', 'vinegar powder', 'poudre de vinaigre'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Procédé industriel avec agents épaississants (maltodextrine ou amidons). Loin du vinaigre liquide naturel.' },
  { keywords: ['tapioca dextrin', 'dextrine de tapioca', 'tapioca dextrine'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Glucide industriel ultra-transformé issu du manioc par hydrolyse acide ou enzymatique.' },
  { keywords: ['cire de carnauba', 'carnauba wax', 'e903'], code: 'E903', risk: 'probable', circ: 'Ultra-transformé', note: 'Cire végétale fortement raffinée industriellement, traitements solvants.' },
  { keywords: ['extrait d\'epices', 'extrait d\'épices', 'extraits d\'epices', 'extraits d\'épices', 'spice extract', 'spice extracts', 'oleoresins'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Extraction industrielle aux solvants (hexane, éthanol). Très éloigné de l\'épice entière.' },
  { keywords: ['concentre de fruits', 'concentré de fruits', 'concentres de fruits', 'concentrés de fruits', 'fruit concentrate', 'fruit concentrates', 'concentre de legumes', 'concentré de légumes', 'concentres de legumes', 'concentrés de légumes', 'vegetable concentrate', 'vegetable concentrates', 'concentres de fruits et legumes', 'concentrés de fruits et légumes'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Extraction industrielle par solvants ou centrifugation. Sucres concentrés, fibres perdues.' },
  { keywords: ['fumee naturelle', 'fumée naturelle', 'natural smoke', 'fumee', 'fumée', 'smoke flavor', 'smoke flavoring', 'arome de fumee', 'arôme de fumée'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Contient des HAP (hydrocarbures aromatiques polycycliques) issus de la combustion. Procédé industriel.' },

  // --- NOUVEAUX ADDITIFS 🟠 ORANGE ---
  { keywords: ['argent', 'silver', 'e174'], code: 'E174', risk: 'probable', circ: 'Nanoparticules métalliques', note: 'Nanoparticules métalliques, accumulation organes, argyrie irréversible.' },
  { keywords: ['edta', 'ethylenediaminetetraacetate', 'éthylènediaminetétraacétate', 'edta calcium disodique', 'calcium disodium edta', 'e385'], code: 'E385', risk: 'probable', circ: 'Chélateur industriel', note: 'Chélateur industriel qui perturbe l\'absorption des minéraux essentiels (zinc, fer, magnésium).' },
  { keywords: ['acides gras', 'fatty acids', 'e570'], code: 'E570', risk: 'probable', circ: 'Ultra-transformé', note: 'Souvent issus d\'huiles hydrogénées trans. Marqueur d\'ultra-transformation.' },
  { keywords: ['glycine', 'sel de sodium de la glycine', 'glycine sodium salt', 'e640'], code: 'E640', risk: 'probable', circ: 'Amplificateur de goût', note: 'Amplificateur de goût industriel, proche du MSG, excitotoxine potentielle.' },
  { keywords: ['butane', 'isobutane', 'propane', 'e943a', 'e943b'], code: 'E943a', risk: 'probable', circ: 'Gaz pétrolier', note: 'Gaz propulseur pétrolier industriel dans les aliments — aucune justification nutritionnelle.' },
  { keywords: ['charbon vegetal', 'charbon végétal', 'vegetable carbon', 'e153'], code: 'E153', risk: 'probable', circ: 'Ultra-transformé', note: 'Production industrielle à haute température. Absorbe médicaments et nutriments.' },
  { keywords: ['hydroxyde de sodium', 'sodium hydroxide', 'soude caustique', 'e524'], code: 'E524', risk: 'probable', circ: 'Caustique industriel', note: 'Agent chimique industriel corrosif. Résidu alcalin problématique.' },
  { keywords: ['hydroxyde de potassium', 'potassium hydroxide', 'e525'], code: 'E525', risk: 'probable', circ: 'Caustique industriel', note: 'Caustique industriel. Perturbateur de l\'équilibre acido-basique.' },
  { keywords: ['hydroxyde de calcium', 'calcium hydroxide', 'chaux', 'e526'], code: 'E526', risk: 'probable', circ: 'Caustique industriel', note: 'Industriel, irritant digestif. Usage alimentaire très controversé.' },
  { keywords: ['silicate de sodium', 'sodium silicate', 'e550'], code: 'E550', risk: 'probable', circ: 'Ultra-transformé', note: 'Composé industriel minéral. Données toxicologiques insuffisantes.' },
  { keywords: ['sulfate d\'ammonium', 'ammonium sulfate', 'e517'], code: 'E517', risk: 'probable', circ: 'Sel industriel', note: 'Sel d\'ammonium utilisé comme engrais agricole — présence alimentaire préoccupante.' },
  { keywords: ['phosphate d\'os', 'phosphate d os', 'bone phosphate', 'edible bone phosphate', 'e542'], code: 'E542', risk: 'probable', circ: 'Contamination métaux lourds', note: 'Extrait d\'os industriels. Risque de contamination métaux lourds (plomb, cadmium).' },

  // --- Perturbateurs endocriniens cosmétiques → ORANGE ---
  { keywords: ['parabene', 'paraben', 'methylparaben', 'ethylparaben', 'propylparaben', 'butylparaben', 'méthylparaben', 'propylparaben'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Détectés dans des tumeurs du sein.' },
  { keywords: ['phtalate', 'phthalate', 'dbp', 'dehp', 'dep'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['cyclosiloxane', 'cyclomethicone', 'cyclopentasiloxane'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['triclosan', 'irgasan'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Interdit dans les savons aux USA depuis 2017.' },
  { keywords: ['phenoxyethanol', 'phénoxyéthanol'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Interdit bébé <3 ans en France.' },
  { keywords: ['oxybenzone', 'benzophenone-3', 'benzophenone 3'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['octinoxate', 'homosalate', 'octisalate'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['aluminum chlorohydrate', 'aluminium zirconium', 'chlorhydrate d\'aluminium'], code: null, risk: 'probable', circ: 'Perturbateur endocrinien' },
  { keywords: ['paraffinum liquidum', 'petrolatum', 'mineral oil', 'huile minérale', 'huiles minérales', 'mineral oils'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Huiles minérales non raffinées classées Groupe 1 CIRC (cancérogène avéré). MOAH (hydrocarbures aromatiques) liés à cancers.' },

  // ═══════════════════════════════════════════════════════════════
  // 🟡 JAUNE — MODÉRATION (Groupe 2B IARC ou transformé modéré)
  // ═══════════════════════════════════════════════════════════════

  // --- Sucres et sirops → JAUNE ---
  { keywords: ['sirop de ble', 'sirop de blé', 'wheat syrup'], code: null, risk: 'possible', circ: 'Sucre raffiné', note: 'Sirop industriel à index glycémique élevé. Contient du gluten — déconseillé aux personnes intolérantes.' },
  { keywords: ['amidon', 'starch'], code: null, risk: 'possible', circ: 'Source ambiguë', note: 'Source non précisée — possiblement amidon de maïs modifié industriellement. Préférer un amidon avec source clairement identifiée (blé, riz, pomme de terre).' },
  { keywords: ['bicarbonate d ammonium', 'bicarbonate d\'ammonium', 'ammonium bicarbonate', 'e503'], code: 'E503', risk: 'possible', circ: 'Levant industriel', note: 'Agent levant industriel, additif borderline. Préférer le bicarbonate de sodium classique.' },
  { keywords: ['sucre', 'sugar', 'saccharose', 'sucrose', 'sucre blanc', 'white sugar', 'sucre raffiné', 'sucre raffine', 'refined sugar'], code: null, risk: 'probable', circ: 'Sucre raffiné', note: 'Sucre ultra-raffiné par procédé industriel, dépourvu de minéraux et vitamines. Fortement lié à l\'obésité, au diabète de type 2 et à l\'inflammation chronique. À éviter.' },
  { keywords: ['sucre de canne', 'cane sugar', 'sucre de canne roux', 'raw cane sugar', 'sucre roux', 'brown sugar', 'sucre brun', 'sucre blond', 'turbinado', 'demerara', 'sirop de canne', 'cane syrup', 'jus de canne', 'cane juice', 'jus de canne evapore', 'jus de canne évaporé', 'evaporated cane juice', 'evaporated cane sugar', 'sucre de canne evapore', 'sucre de canne évaporé', 'cane sugar evaporated'], code: null, risk: 'possible', circ: 'Sucre peu raffiné', note: 'Sucre peu transformé qui conserve une partie de la mélasse et des minéraux, mais reste à 90% du saccharose. Provoque les mêmes pics glycémiques que le sucre blanc et contribue à la prise de poids et au diabète de type 2. À consommer avec modération.' },
  // Sucres invertis (saccharose hydrolysé en glucose+fructose) — plus transformés que cane sugar → ORANGE.
  { keywords: ['sucre inverti', 'invert sugar', 'inverted sugar', 'sucre invert', 'invert cane sugar', 'sucre de canne inverti', 'sirop de canne inverti', 'invert cane syrup', 'inverti sucre', 'sirop inverti', 'invert syrup'], code: null, risk: 'probable', circ: 'Sucre hydrolysé industriel', note: 'Sucre industriel obtenu par hydrolyse chimique ou enzymatique du saccharose, qui le décompose en glucose + fructose. Plus sucrant que le sucre classique, fluidité accrue, utilisé dans les produits ultra-transformés. Mêmes effets métaboliques que le sucre raffiné — obésité, diabète de type 2, inflammation chronique. À éviter.' },
  { keywords: ['sucres', 'sugars'], code: null, risk: 'probable', circ: 'Sucre raffiné', note: 'Sucres ajoutés ultra-transformés liés à l\'obésité, au diabète de type 2 et à l\'inflammation chronique. Marqueur de produit ultra-transformé. À éviter.' },
  { keywords: ['sirop de glucose-fructose', 'glucose-fructose syrup', 'hfcs', 'high fructose corn syrup', 'sirop de glucose fructose', 'sirop de maïs à haute teneur en fructose', 'sirop de mais haute fructose'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Édulcorant industriel extrait du maïs (souvent OGM). Fortement lié à l\'obésité, au diabète de type 2, à la stéatose hépatique non alcoolique et au syndrome métabolique. À éviter.' },
  { keywords: ['sirop de glucose', 'glucose syrup', 'glucose-sirop', 'sirop de maïs', 'corn syrup'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Sucre raffiné industriel issu d\'hydrolyse enzymatique de l\'amidon. Provoque des pics glycémiques rapides, favorise prise de poids et résistance à l\'insuline.' },
  { keywords: ['sirop de mais', 'corn syrup', 'sirop de maïs'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Sirop industriel issu de maïs souvent OGM. Lié à obésité, stéatose hépatique et syndrome métabolique.' },
  { keywords: ['gelatine', 'gélatine', 'gelatin'], code: null, risk: 'possible', circ: 'Origine animale industrielle', note: 'Issue de peaux et os animaux (bovin/porc) traités à l\'acide ou la soude. Procédé industriel, qualité variable selon les sources.' },
  { keywords: ['sirop d\'agave', 'agave syrup', 'agave nectar', 'nectar d\'agave'], code: null, risk: 'possible', circ: 'Fructose isolé', note: 'Présenté comme naturel mais ultra-raffiné industriellement. Composé à 70-90% de fructose isolé qui surcharge le foie et favorise la stéatose hépatique non alcoolique. À consommer avec modération.' },
  { keywords: ['sirop de riz', 'rice syrup'], code: null, risk: 'possible', circ: 'Sucre transformé', note: 'Sirop industriel obtenu par hydrolyse enzymatique du riz. Index glycémique très élevé (98), provoque des pics de glycémie rapides. À consommer avec modération.' },
  { keywords: ['maltodextrine', 'maltodextrin'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Glucide ultra-transformé issu d\'hydrolyse industrielle de l\'amidon (souvent maïs OGM). Index glycémique très élevé (110, plus que le sucre blanc à 65). Perturbe le microbiome intestinal et favorise l\'inflammation.' },
  { keywords: ['dextrose'], code: null, risk: 'possible', circ: 'Sucre raffiné', note: 'Glucose isolé extrait industriellement de l\'amidon de maïs (souvent OGM). Provoque des pics glycémiques rapides et favorise la prise de poids et la résistance à l\'insuline.' },
  { keywords: ['dextrine'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Glucide ultra-transformé obtenu par hydrolyse acide ou enzymatique de l\'amidon. Index glycémique élevé, dépourvu de nutriments. Marqueur de produit industriel.' },
  { keywords: ['fructose'], code: null, risk: 'possible', circ: 'Sucre raffiné', note: 'Fructose isolé extrait industriellement, très différent du fructose des fruits entiers (sans fibres ni nutriments). Métabolisé uniquement par le foie, favorise la stéatose hépatique et le syndrome métabolique en excès. À consommer avec modération.' },
  { keywords: ['jus de raisin concentre', 'jus de raisin concentré', 'concentrated grape juice', 'raisin concentré'], code: null, risk: 'possible', circ: 'Sucre concentré', note: 'Jus de fruit dont l\'eau a été retirée industriellement pour concentrer les sucres. Index glycémique élevé, fibres perdues. Utilisé comme alternative marketing au sucre ajouté mais avec les mêmes effets.' },
  { keywords: ['jus de pommes concentre', 'jus de pommes concentré', 'concentrated apple juice'], code: null, risk: 'possible', circ: 'Sucre concentré', note: 'Jus de pomme concentré industriellement, dépourvu de fibres. Index glycémique élevé, équivaut à du sucre liquide. À modérer.' },
  { keywords: ['jus concentre', 'jus concentré', 'fruit juice concentrate', 'concentrated fruit juice'], code: null, risk: 'possible', circ: 'Sucre concentré', note: 'Sucres concentrés industriellement à partir de fruits, sans fibres. Index glycémique élevé, utilisé pour contourner la mention « sucre ajouté ». À modérer.' },

  // --- Huile de pépin de raisin → JAUNE ---
  { keywords: ['huile de pepin de raisin', 'grapeseed oil', 'pépins de raisin'], code: null, risk: 'possible', circ: 'Raffinée riche oméga-6', note: 'Très riche en oméga-6 pro-inflammatoires.' },

  // --- Arômes → JAUNE ---
  { keywords: ['arome naturel', 'arôme naturel', 'aromes naturels', 'arômes naturels', 'natural flavor', 'natural flavour', 'natural flavors', 'natural flavours', 'arome', 'arôme', 'aromes', 'arômes', 'flavour', 'flavor', 'flavouring', 'flavoring'], code: null, risk: 'possible', circ: 'Composition opaque', note: 'Souvent extraits avec solvants industriels. Composition non divulguée.' },
  { keywords: ['arome artificiel', 'arôme artificiel', 'artificial flavor', 'artificial flavour', 'artificial flavors', 'artificial flavours', 'saveur artificielle', 'saveurs artificielles', 'aromes artificiels', 'arômes artificiels'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Molécules entièrement synthétiques issues de la pétrochimie pour imiter des goûts naturels. Marqueur indiscutable de produit ultra-transformé (NOVA 4). Composition non divulguée, allergènes possibles cachés.' },

  // --- Émulsifiants modérés → JAUNE ---
  { keywords: ['emulsifiant', 'emulsifiants', 'émulsifiant', 'émulsifiants', 'emulsifier', 'emulsifiers', 'e471', 'mono et diglycerides', 'monoglycerides', 'diglycerides', 'mono- et diglycérides', 'monodiglycérides', 'mono and diglycerides', 'mono- and diglycerides'], code: 'E471', risk: 'possible', circ: 'Ultra-transformé léger', note: 'Peuvent contenir des graisses trans cachées.' },
  { keywords: ['lecithine de soja', 'soy lecithin', 'lécithine de soja', 'lecithin', 'lécithine'], code: 'E322', risk: 'possible', circ: 'OGM possible', note: 'Émulsifiant courant. Peut être OGM.' },
  { keywords: ['pgpr', 'polyglycerol polyricinoleate', 'e476'], code: 'E476', risk: 'probable', circ: 'Ultra-transformé', note: 'Émulsifiant industriel obtenu par estérification d\'huile de ricin avec polyglycérol. Utilisé dans le chocolat industriel pour réduire la quantité de beurre de cacao. Marqueur d\'ultra-transformation, peut causer troubles digestifs.' },
  { keywords: ['poudre a lever', 'poudres a lever', 'poudres à lever', 'baking powder', 'levure chimique', 'raising agents', 'raising agent', 'agent levant', 'agents levants', 'leavening', 'leavening agent', 'leavening agents', 'leavening agent(s)'], code: null, risk: 'possible', circ: 'Levant industriel', note: 'Agent levant industriel souvent à base de phosphates (E450-E452) ou de sels d\'aluminium. L\'excès de phosphates ajoutés est lié à la calcification des artères et aux troubles rénaux. Acceptable occasionnellement, à éviter au quotidien.' },

  // --- Gommes → JAUNE ---
  { keywords: ['gomme xanthane', 'xanthan gum', 'xanthan', 'e415'], code: 'E415', risk: 'possible', circ: 'Controversé', note: 'Peut perturber la digestion chez les personnes sensibles.' },
  { keywords: ['gomme guar', 'gomme de guar', 'guar gum', 'e412'], code: 'E412', risk: 'possible', circ: 'Controversé', note: 'Gélifiant industriel, peut causer ballonnements et inconforts digestifs.' },
  { keywords: ['gomme arabique', 'arabic gum', 'acacia gum', 'e414'], code: 'E414', risk: 'possible', circ: 'Industriel', note: 'Gomme naturelle extraite de l\'acacia, généralement bien tolérée. Peut causer ballonnements et inconfort digestif en excès chez les personnes sensibles. Souvent présente dans les produits ultra-transformés.' },
  { keywords: ['gomme de caroube', 'carob gum', 'e410'], code: 'E410', risk: 'possible', circ: 'Industriel', note: 'Épaississant industriel extrait de la caroube. Peut provoquer des troubles digestifs (ballonnements, gaz) et des allergies chez les nourrissons. Utilisée dans les produits transformés.' },
  { keywords: ['gomme konjac', 'konjac gum', 'e425'], code: 'E425', risk: 'possible', circ: 'Controversé', note: 'Risque de blocage intestinal.' },
  { keywords: ['gomme tara', 'tara gum', 'e417'], code: 'E417', risk: 'possible', circ: 'Industriel', note: 'Épaississant industriel peu étudié à long terme. Peut causer troubles digestifs (ballonnements, gaz). Présence dans un produit indique une transformation industrielle.' },
  { keywords: ['gomme gellane', 'gellan gum', 'e418'], code: 'E418', risk: 'possible', circ: 'Industriel', note: 'Gélifiant industriel produit par fermentation bactérienne en bioréacteur. Effets digestifs à haute dose (ballonnements). Marqueur de produit ultra-transformé.' },
  // Alginates — entrées individuelles par code.
  { keywords: ['alginate', 'alginate de sodium', 'sodium alginate', 'e401'], code: 'E401', risk: 'possible', circ: 'Gélifiant marin', note: 'Gélifiant industriel marin. Marqueur d\'ultra-transformation.' },
  { keywords: ['alginate de potassium', 'potassium alginate', 'e402'], code: 'E402', risk: 'possible', circ: 'Gélifiant marin', note: 'Gélifiant industriel marin. Marqueur d\'ultra-transformation.' },
  { keywords: ['alginate d\'ammonium', 'ammonium alginate', 'e403'], code: 'E403', risk: 'possible', circ: 'Gélifiant marin', note: 'Gélifiant industriel marin. Marqueur d\'ultra-transformation.' },
  { keywords: ['alginate de calcium', 'calcium alginate', 'e404'], code: 'E404', risk: 'possible', circ: 'Gélifiant marin', note: 'Gélifiant industriel marin. Marqueur d\'ultra-transformation.' },

  // --- Acide citrique → JAUNE ---
  { keywords: ['acide citrique', 'citric acid', 'e330', 'acidifiant acide citrique', 'acidifiant (acide citrique)', 'acidifiant: acide citrique'], code: 'E330', risk: 'possible', circ: 'Industriel', note: 'Produit par fermentation fongique. Peut éroder l\'émail dentaire.' },

  // --- Phosphates → JAUNE ---
  { keywords: ['diphosphate', 'e450'], code: 'E450', risk: 'possible', circ: 'Excès phosphates', note: 'Phosphate industriel utilisé comme stabilisant. L\'excès de phosphates est lié à la calcification des artères, aux troubles rénaux et à la fragilité osseuse. À modérer.' },
  { keywords: ['tripolyphosphate', 'e451'], code: 'E451', risk: 'possible', circ: 'Excès phosphates', note: 'Phosphate industriel utilisé comme stabilisant. L\'excès de phosphates est lié à la calcification artérielle, aux troubles rénaux et à la fragilité osseuse. À modérer.' },
  { keywords: ['polyphosphate', 'e452'], code: 'E452', risk: 'possible', circ: 'Excès phosphates', note: 'Phosphate industriel utilisé comme stabilisant et rétenteur d\'eau dans la charcuterie. L\'excès de phosphates est lié à la calcification artérielle et aux troubles rénaux. À modérer.' },
  // Phosphates de sodium/potassium/calcium — entrées individuelles par code.
  { keywords: ['phosphate de sodium', 'sodium phosphate', 'e339'], code: 'E339', risk: 'possible', circ: 'Excès phosphates', note: 'Excès lié à calcification artères et troubles rénaux.' },
  { keywords: ['phosphate de potassium', 'potassium phosphate', 'e340'], code: 'E340', risk: 'possible', circ: 'Excès phosphates', note: 'Excès lié à calcification artères et troubles rénaux.' },
  { keywords: ['phosphate de calcium', 'calcium phosphate', 'e341'], code: 'E341', risk: 'possible', circ: 'Excès phosphates', note: 'Excès lié à calcification artères et troubles rénaux.' },

  // --- Sels et acides industriels → JAUNE ---
  { keywords: ['chlorure de potassium', 'potassium chloride', 'e508'], code: 'E508', risk: 'possible', circ: 'Substitut de sel industriel', note: 'Minéral mais utilisé comme substitut de sel industriel. Procédé de raffinage. À modérer chez les personnes avec insuffisance rénale.' },
  { keywords: ['acide lactique', 'lactic acid', 'e270'], code: 'E270', risk: 'possible', circ: 'Souvent synthétique', note: 'Souvent produit par fermentation industrielle ou synthèse chimique, et non issu naturellement du lait.' },
  { keywords: ['acide malique', 'malic acid', 'e296'], code: 'E296', risk: 'possible', circ: 'Souvent synthétique', note: 'Industriellement synthétisé pour usage alimentaire (rarement extrait des fruits).' },
  { keywords: ['spiruline', 'spirulina', 'spirulina extract', 'extrait de spiruline'], code: null, risk: 'possible', circ: 'Extraction industrielle', note: 'Algue naturelle mais procédé d\'extraction et de séchage industriel lourd. Risque de contamination métaux lourds selon la source.' },
  { keywords: ['bouillon', 'broth', 'bouillon de porc', 'bouillon de poulet', 'bouillon de boeuf', 'bouillon de bœuf', 'bouillon de legumes', 'bouillon de légumes', 'chicken broth', 'pork broth', 'beef broth', 'vegetable broth', 'bouillon compose', 'bouillon composé'], code: null, risk: 'possible', circ: 'Transformé', note: 'Ingrédient composite transformé. Contient souvent du sel, des exhausteurs et des arômes ajoutés.' },
  { keywords: ['modified whey', 'whey modified', 'lactosérum modifié'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Protéine de lactosérum modifiée industriellement par procédés chimiques ou enzymatiques. Marqueur d\'ultra-transformation, dénaturée par rapport au lactosérum naturel.' },
  { keywords: ['defatted soy flour', 'soy flour defatted', 'farine de soja dégraissée'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Farine de soja dégraissée industriellement par extraction à l\'hexane (solvant pétrolier). Souvent OGM (94% du soja aux USA). Marqueur de produit ultra-transformé.' },
  { keywords: ['imitation mozzarella', 'imitation cheese', 'fromage imitation', 'rehydrated mozzarella', 'rehydrated cheese'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Fromage imitation ultra-transformé fabriqué à partir d\'huiles végétales raffinées, amidons modifiés et arômes. Sans valeur nutritionnelle du vrai fromage. À éviter.' },
  // Fromages allégés / transformés / fondus → JAUNE (procédé industriel qui dénature)
  { keywords: ['fromage allege', 'fromage allégé', 'fromage faible en gras', 'fromage maigre', 'reduced fat cheese', 'low fat cheese', 'light cheese', 'mozzarella allegee', 'mozzarella allégée', 'mozzarella allege', 'mozzarella allégé', 'mozzarella a teneur reduite', 'mozzarella à teneur réduite', 'reduced fat mozzarella', 'part skim mozzarella'], code: null, risk: 'possible', circ: 'Transformé', note: 'Fromage à teneur réduite en matières grasses obtenu par procédé industriel qui modifie sa structure naturelle. Souvent additionné de stabilisants pour compenser la texture.' },
  { keywords: ['fromage fondu', 'fromage fondus', 'fromages fondus', 'processed cheese', 'cheese product', 'fromage transforme', 'fromage transformé', 'preparation fromagere', 'préparation fromagère'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Fromage fondu industriel avec sels de fonte (phosphates E450-E452), émulsifiants et additifs. Marqueur indiscutable d\'ultra-transformation, riche en sodium et additifs cachés. À éviter.' },

  // --- Conservateurs modérés → JAUNE ---
  { keywords: ['sodium benzoate', 'benzoate de sodium', 'e211'], code: 'E211', risk: 'possible', circ: 'Controversé', note: 'Forme du benzène avec vitamine C dans certaines boissons.' },
  { keywords: ['benzoate de potassium', 'potassium benzoate', 'e212'], code: 'E212', risk: 'probable', circ: 'Formation de benzène', note: 'Conservateur industriel synthétique. Peut former du benzène — cancérigène avéré Groupe 1 CIRC (leucémie) — au contact de l\'acide ascorbique (vitamine C), combinaison fréquente dans les sodas. Lié à hyperactivité chez l\'enfant.' },
  { keywords: ['citrate de potassium', 'potassium citrate', 'e332'], code: 'E332', risk: 'possible', circ: 'Sel industriel', note: 'Sel synthétisé industriellement (réaction acide citrique + hydroxyde de potassium). Aucune forme naturelle dans l\'alimentation. Marqueur d\'ultra-transformation. Effet laxatif en excès.' },
  { keywords: ['extrait de stevia', 'extrait de stévia', 'stevia extract', 'rebaudioside', 'rebaudioside a', 'reb-a', 'steviol glycosides', 'glycosides de stéviol', 'glycosides de steviol', 'e960'], code: 'E960', risk: 'possible', circ: 'Édulcorant purifié', note: 'Extrait industriel ultra-purifié de la feuille de stévia (rebaudioside A à 95%+) obtenu par solvants (éthanol, méthanol). Très différent de la feuille brute. Peut perturber le microbiome intestinal. Arrière-goût réglissé.' },
  { keywords: ['bht', 'butylhydroxytoluene', 'e321'], code: 'E321', risk: 'possible', circ: 'Antioxydant synthétique', note: 'Antioxydant synthétique controversé pouvant provoquer des effets hépatiques et thyroïdiens à fortes doses (études animales). Classé Groupe 3 IARC (preuves insuffisantes), mais soupçonné perturbateur endocrinien. À éviter chez les enfants.' },
  // Sulfites — entrées individuelles par code (E220 à E228).
  { keywords: ['dioxyde de soufre', 'sulfur dioxide', 'sulfite', 'sulphite', 'e220'], code: 'E220', risk: 'possible', circ: 'Allergène', note: 'Sulfite. Provoque crises d\'asthme et réactions allergiques.' },
  { keywords: ['sulfite de sodium', 'sodium sulphite', 'sodium sulfite', 'e221'], code: 'E221', risk: 'possible', circ: 'Allergène', note: 'Sulfite. Allergène, déclenche crises d\'asthme.' },
  { keywords: ['bisulfite de sodium', 'sodium bisulphite', 'sodium bisulfite', 'e222'], code: 'E222', risk: 'possible', circ: 'Allergène', note: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { keywords: ['metabisulfite de sodium', 'sodium metabisulphite', 'sodium metabisulfite', 'e223'], code: 'E223', risk: 'possible', circ: 'Allergène', note: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { keywords: ['metabisulfite de potassium', 'potassium metabisulphite', 'potassium metabisulfite', 'e224'], code: 'E224', risk: 'possible', circ: 'Allergène', note: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { keywords: ['sulfite de potassium', 'potassium sulphite', 'potassium sulfite', 'e225'], code: 'E225', risk: 'possible', circ: 'Allergène', note: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { keywords: ['sulfite de calcium', 'calcium sulphite', 'calcium sulfite', 'e226'], code: 'E226', risk: 'possible', circ: 'Allergène', note: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { keywords: ['bisulfite de calcium', 'calcium bisulphite', 'calcium bisulfite', 'e227'], code: 'E227', risk: 'possible', circ: 'Allergène', note: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { keywords: ['bisulfite de potassium', 'potassium bisulphite', 'potassium bisulfite', 'e228'], code: 'E228', risk: 'possible', circ: 'Allergène', note: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { keywords: ['sorbate de potassium', 'potassium sorbate', 'e202'], code: 'E202', risk: 'possible', circ: 'Conservateur', note: 'Conservateur synthétique généralement bien toléré mais controversé.' },
  { keywords: ['propionate de calcium', 'calcium propionate', 'e282'], code: 'E282', risk: 'possible', circ: 'Conservateur', note: 'Lié à irritabilité et troubles du comportement chez l\'enfant.' },
  { keywords: ['erythorbate de sodium', 'érythorbate de sodium', 'sodium erythorbate', 'e316'], code: 'E316', risk: 'possible', circ: 'Antioxydant industriel', note: 'Antioxydant synthétique utilisé dans les charcuteries pour fixer les nitrites.' },

  // Red 3 / Érythrosine — colorant à éviter (interdit FDA 2024 pour cancers thyroïdiens)
  { keywords: ['rouge 3', 'red 3', 'red no. 3', 'red no 3', 'fd&c red 3', 'fd&c red no. 3', 'erythrosine', 'érythrosine', 'erythrosin', 'e127'], code: 'E127', risk: 'probable', circ: 'Colorant à éviter', note: 'Colorant rouge synthétique — interdit par la FDA aux USA en janvier 2024 pour cancers thyroïdiens prouvés en études animales. Présent dans bonbons, cerises confites, gâteaux industriels, sirops, certains médicaments.' },

  // --- Colorants synthétiques à éviter → ORANGE ---
  { keywords: ['bleu 2', 'blue 2', 'indigotine', 'indigo carmine', 'fd&c blue 2', 'e132'], code: 'E132', risk: 'probable', circ: 'Colorant à éviter', note: 'Colorant synthétique pétrolier lié à hyperactivité et réactions allergiques. À éviter.' },
  { keywords: ['jaune de quinoléine', 'jaune quinoléine', 'quinoline yellow', 'quinoléine yellow', 'e104'], code: 'E104', risk: 'probable', circ: 'Colorant à éviter', note: 'Colorant synthétique lié à hyperactivité chez l\'enfant. Interdit aux USA, Norvège, Japon. Avertissement obligatoire en UE.' },
  { keywords: ['vert 3', 'green 3', 'e143'], code: 'E143', risk: 'probable', circ: 'Groupe 2B', note: 'Colorant synthétique pétrolier interdit dans toute l\'Union européenne pour preuves de cancérogénicité en études animales. Classé Groupe 2B IARC. À éviter absolument.' },
  { keywords: ['dioxyde de titane', 'titanium dioxide', 'e171'], code: 'E171', risk: 'probable', circ: 'Nanoparticules', note: 'Interdit en alimentation en UE depuis 2022. EFSA 2021 : génotoxicité ne peut être exclue. À éviter.' },
  { keywords: ['cochenille', 'carmine', 'carmin', 'cochineal', 'e120'], code: 'E120', risk: 'possible', circ: 'Allergène', note: 'Allergène fort, chocs anaphylactiques possibles.' },

  { keywords: ['silice', 'silicon dioxide', 'gel de silice', 'silica gel', 'dioxyde de silicium', 'e551'], code: 'E551', risk: 'possible', circ: 'Nanoparticules', note: 'Anti-agglomérant en nanoparticules. EFSA 2018 : accumulation hépatique constatée.' },

  // --- Édulcorants Groupe 2B → JAUNE ---
  { keywords: ['saccharine', 'saccharin', 'e954'], code: 'E954', risk: 'probable', circ: 'Groupe 2B', note: 'Édulcorant synthétique classé Groupe 2B IARC (possiblement cancérogène) puis déclassé en 1999, mais reste controversé. Perturbe le microbiome intestinal et favorise l\'intolérance au glucose. À éviter.' },
  { keywords: ['sucralose', 'e955'], code: 'E955', risk: 'probable', circ: 'Groupe 2B', note: 'Édulcorant synthétique chloré (dérivé chimique du sucre). Perturbe le microbiome intestinal et libère des composés génotoxiques à la cuisson selon des études récentes. À éviter.' },
  { keywords: ['cyclamate', 'e952'], code: 'E952', risk: 'probable', circ: 'Groupe 2B', note: 'Édulcorant synthétique interdit aux USA depuis 1969 pour suspicion de cancer de la vessie en études animales. Classé Groupe 2B IARC (possiblement cancérogène). À éviter.' },

  // --- Extrait de levure → JAUNE ---
  { keywords: ['extrait de levure', 'yeast extract', 'extraits de levure'], code: null, risk: 'possible', circ: 'Glutamate caché', note: 'Contient du glutamate naturel — MSG caché.' },

  // --- Amplificateurs de goût → JAUNE ---
  // Ribonucléotides amplificateurs de goût — entrées individuelles par code (E626 à E635).
  { keywords: ['acide guanylique', 'guanylic acid', 'e626'], code: 'E626', risk: 'possible', circ: 'Amplificateur de goût', note: 'Amplificateur ribonucléotide, souvent combiné avec MSG.' },
  { keywords: ['guanylate disodique', 'disodium guanylate', 'e627'], code: 'E627', risk: 'possible', circ: 'Amplificateur de goût', note: 'Amplificateur ribonucléotide, souvent combiné avec MSG.' },
  { keywords: ['guanylate dipotassique', 'dipotassium guanylate', 'e628'], code: 'E628', risk: 'possible', circ: 'Amplificateur de goût', note: 'Amplificateur ribonucléotide.' },
  { keywords: ['guanylate de calcium', 'calcium guanylate', 'e629'], code: 'E629', risk: 'possible', circ: 'Amplificateur de goût', note: 'Amplificateur ribonucléotide.' },
  { keywords: ['acide inosinique', 'inosinic acid', 'e630'], code: 'E630', risk: 'possible', circ: 'Amplificateur de goût', note: 'Amplificateur ribonucléotide.' },
  { keywords: ['inosinate disodique', 'disodium inosinate', 'e631'], code: 'E631', risk: 'possible', circ: 'Amplificateur de goût', note: 'Amplificateur ribonucléotide, souvent combiné avec MSG.' },
  { keywords: ['inosinate dipotassique', 'dipotassium inosinate', 'e632'], code: 'E632', risk: 'possible', circ: 'Amplificateur de goût', note: 'Amplificateur ribonucléotide.' },
  { keywords: ['inosinate de calcium', 'calcium inosinate', 'e633'], code: 'E633', risk: 'possible', circ: 'Amplificateur de goût', note: 'Amplificateur ribonucléotide.' },
  { keywords: ['ribonucléotides calciques', 'calcium ribonucleotides', 'e634'], code: 'E634', risk: 'possible', circ: 'Amplificateur de goût', note: 'Amplificateur ribonucléotide.' },
  { keywords: ['ribonucleotides', 'ribonucléotides', 'ribonucléotides disodiques', 'disodium ribonucleotides', 'guanylate', 'inosinate', 'e635'], code: 'E635', risk: 'possible', circ: 'Amplificateur de goût', note: 'Amplificateur ribonucléotide, mélange E627 + E631. Souvent combiné avec MSG.' },

  // --- NOUVEAUX 🟡 JAUNE ---
  { keywords: ['anthocyanes', 'anthocyanins', 'e163'], code: 'E163', risk: 'possible', circ: 'Naturel transformé', note: 'Naturel mais souvent extrait avec solvants industriels.' },
  { keywords: ['chlorophylle', 'chlorophylles', 'chlorophyll', 'chlorophyllines', 'e140', 'e141'], code: 'E140', risk: 'possible', circ: 'Naturel transformé', note: 'Naturel mais version industrielle souvent avec cuivre ajouté.' },
  { keywords: ['alpha-tocopherol', 'alpha tocopherol', 'alpha-tocophérol', 'tocopherol', 'tocopherols', 'tocophérol', 'tocophérols', 'mixed tocopherols', 'tocophérols mélangés', 'vitamine e', 'vitamin e', 'e307'], code: 'E307', risk: 'aucun', circ: 'Naturel', note: 'Vitamine E, antioxydant naturel présent dans les plantes et les aliments (huiles végétales, noix, graines). Ingrédient naturel sans danger.' },
  { keywords: ['gamma-tocopherol', 'gamma tocopherol', 'gamma-tocophérol', 'e308'], code: 'E308', risk: 'possible', circ: 'Vitamine E synthétique', note: 'Forme synthétique de vitamine E, moins biodisponible.' },
  { keywords: ['delta-tocopherol', 'delta tocopherol', 'delta-tocophérol', 'e309'], code: 'E309', risk: 'possible', circ: 'Vitamine E synthétique', note: 'Forme synthétique de vitamine E, moins biodisponible.' },
  { keywords: ['acide succinique', 'succinic acid', 'e363'], code: 'E363', risk: 'possible', circ: 'Acidifiant industriel', note: 'Acidifiant industriel, peu étudié à long terme.' },
  { keywords: ['citrate triammonique', 'triammonium citrate', 'e380'], code: 'E380', risk: 'possible', circ: 'Sel ammonium', note: 'Sel d\'ammonium industriel, données toxicologiques limitées.' },
  { keywords: ['tanin ferrique', 'tanins ferriques', 'iron tannate', 'e181'], code: 'E181', risk: 'possible', circ: 'Stabilisant', note: 'Colorant/stabilisant peu étudié. Interaction avec absorption du fer.' },
  { keywords: ['or', 'gold', 'e175'], code: 'E175', risk: 'possible', circ: 'Métal inerte', note: 'Métal inerte mais nanoparticules d\'or de plus en plus controversées.' },
  { keywords: ['sulfate de magnesium', 'sulfate de magnésium', 'magnesium sulfate', 'sel d\'epsom', 'e518'], code: 'E518', risk: 'possible', circ: 'Laxatif', note: 'Laxatif industriel à doses élevées. Perturbation des électrolytes.' },
  { keywords: ['stearate de magnesium', 'stéarate de magnésium', 'magnesium stearate', 'e572'], code: 'E572', risk: 'possible', circ: 'Lubrifiant industriel', note: 'Agent lubrifiant industriel. Peut réduire l\'absorption des nutriments.' },
  { keywords: ['glucono-delta-lactone', 'gdl', 'glucono delta lactone', 'e575'], code: 'E575', risk: 'possible', circ: 'Acidifiant industriel', note: 'Acidifiant industriel par fermentation artificielle. Données long terme limitées.' },

  // --- Poissons à modérer → JAUNE ---
  { keywords: ['thon', 'tuna'], code: null, risk: 'possible', circ: 'Contamination mercure', note: 'Poisson prédateur accumulant le mercure (méthylmercure neurotoxique). Riche en omaéga-3 et protéines, mais à modérer : max 1×/semaine pour un adulte, déconseillé aux femmes enceintes et jeunes enfants. Préférer les petits poissons gras (sardine, maquereau).' },
  { keywords: ['tilapia', 'pangasius'], code: null, risk: 'possible', circ: 'Élevage industriel', note: 'Poissons d\'élevage intensif (Asie du Sud-Est principalement) souvent nourris avec des déchets et traités aux antibiotiques. Faible teneur en oméga-3, ratio oméga-6/oméga-3 défavorable. Préférer poissons sauvages ou élevage bio européen.' },
  { keywords: ['tarama', 'taramasalata'], code: null, risk: 'possible', circ: 'Ultra-transformé', note: 'Préparation industrielle à base d\'œufs de poisson, huile, colorants (E124 rouge cochenille ou betterave) et conservateurs. Loin du produit traditionnel grec.' },
  { keywords: ['tobiko', 'masago'], code: null, risk: 'possible', circ: 'Coloré artificiellement', note: 'Œufs de poisson volant souvent teintés artificiellement (E102 jaune, E124 rouge, vert chlorophylle ou encre de seiche industrielle). Le produit nature reste correct mais rare.' },

  // --- Sucres complets → JAUNE (moins raffinés mais restent du sucre) ---
  { keywords: ['sucre de canne complet', 'rapadura', 'panela', 'muscovado', 'sucanat', 'jaggery', 'gur', 'sucre de palme', 'palm sugar', 'mélasse', 'melasse', 'molasses', 'mélasse noire', 'blackstrap molasses', 'sirop de sorgho', 'sorghum syrup'], code: null, risk: 'possible', circ: 'Sucre complet', note: 'Sucres non raffinés contenant encore des minéraux (fer, calcium, potassium), mais restent composés à 70-90% de saccharose. Mêmes effets métaboliques que le sucre blanc en quantité équivalente. À consommer avec modération.' },

  // --- Carbonate de sodium → JAUNE (additif industriel) ---
  { keywords: ['carbonate de sodium', 'sodium carbonate', 'e500'], code: 'E500', risk: 'possible', circ: 'Sel industriel', note: 'Sel alcalin obtenu par le procédé Solvay (saumure + ammoniaque + calcaire). Différent du bicarbonate de sodium naturel. Utilisé comme régulateur d\'acidité et agent levant industriel.' },

  // --- Soja / lait en poudre / farine enrichie → JAUNE (transformés industriels) ---
  { keywords: ['soja', 'soy', 'soya'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Soja non spécifié dans un produit industriel = quasi toujours transformé (isolat, protéine texturée, lécithine, farine dégraissée). Souvent OGM (94% aux USA). Préférer le soja entier non transformé (tofu, edamame).' },
  { keywords: ['proteine de soja', 'protéine de soja', 'soy protein', 'proteines de soja', 'protéines de soja'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Protéine de soja industrielle extraite par solvants chimiques. Souvent OGM. Marqueur de produit ultra-transformé.' },
  { keywords: ['lait en poudre', 'milk powder', 'lait écrémé en poudre', 'lait ecreme en poudre', 'skimmed milk powder', 'poudre de lait', 'lait entier en poudre', 'whole milk powder'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Lait déshydraté industriellement par atomisation à haute température. Contient des oxystérols (cholestérol oxydé) liés à l\'inflammation cardiovasculaire.' },
  { keywords: ['farine de ble enrichie', 'farine de blé enrichie', 'enriched wheat flour', 'farine enrichie', 'enriched flour'], code: null, risk: 'possible', circ: 'Industriel', note: 'Farine raffinée appauvrie puis re-fortifiée artificiellement avec des vitamines de synthèse (fer, niacine, B1). Index glycémique élevé, fibres perdues.' },

  // --- Vitamines de synthèse → ORANGE (additifs industriels ultra-transformés) ---
  { keywords: ['cyanocobalamine', 'cyanocobalamin', 'vitamine b12', 'vitamin b12', 'b12'], code: null, risk: 'probable', circ: 'Vitamine B12 de synthèse', note: 'Forme synthétique de vitamine B12 fabriquée par fermentation bactérienne industrielle puis stabilisée avec une molécule de cyanure (cyanocobalamine), une forme qui n\'existe pas dans la nature. Ajoutée pour fortifier artificiellement des produits ultra-transformés appauvris en nutriments. Sa présence est un marqueur d\'aliment ultra-transformé (NOVA 4) : un vrai aliment n\'a pas besoin d\'être re-vitaminé. Moins biodisponible que la B12 naturelle des aliments entiers.' },
  { keywords: ['niacinamide', 'nicotinamide', 'vitamine b3', 'vitamin b3', 'niacine', 'niacin', 'vitamine pp'], code: null, risk: 'probable', circ: 'Vitamine B3 de synthèse', note: 'Forme synthétique de vitamine B3 produite par synthèse chimique industrielle à partir de dérivés du pétrole (3-cyanopyridine). Ajoutée pour re-fortifier artificiellement des produits raffinés dont la transformation a détruit les vitamines d\'origine. Sa présence signale un aliment ultra-transformé (NOVA 4). À doses élevées et répétées, peut surcharger le foie ; rien à voir avec la niacine apportée naturellement par les aliments entiers.' },
  { keywords: ['pantothenate de calcium', 'pantothénate de calcium', 'calcium pantothenate', 'd-pantothenate de calcium', 'd-pantothénate de calcium', 'vitamine b5', 'vitamin b5'], code: null, risk: 'probable', circ: 'Vitamine B5 de synthèse', note: 'Sel de calcium de la vitamine B5 obtenu par synthèse chimique industrielle (condensation du pantolactone avec la bêta-alanine). C\'est un additif de fortification artificielle utilisé pour compenser les nutriments détruits lors de l\'ultra-transformation. Sa présence est un marqueur d\'aliment ultra-transformé (NOVA 4) : un produit naturel et complet n\'a jamais besoin de B5 ajoutée en laboratoire.' },
  { keywords: ['pyridoxine chlorhydrate', 'chlorhydrate de pyridoxine', 'pyridoxine hydrochloride', 'pyridoxine hcl', 'hcl de pyridoxine', 'vitamine b6', 'vitamin b6'], code: null, risk: 'probable', circ: 'Vitamine B6 de synthèse', note: 'Forme synthétique de vitamine B6 fabriquée par synthèse chimique industrielle puis salifiée à l\'acide chlorhydrique. Ajoutée pour re-fortifier artificiellement des produits raffinés appauvris. Sa présence est un marqueur d\'aliment ultra-transformé (NOVA 4). Une supplémentation synthétique répétée à fortes doses peut devenir neurotoxique (neuropathie périphérique), contrairement à la B6 des aliments entiers.' },
  { keywords: ['inositol', 'myo-inositol', 'myo inositol', 'inositole'], code: null, risk: 'probable', circ: 'Additif de synthèse', note: 'Composé produit industriellement par hydrolyse acide de l\'acide phytique extrait du maïs (souvent OGM), puis purifié chimiquement. Ajouté comme additif de fortification ou de texture dans des produits ultra-transformés, notamment les boissons énergisantes et formules industrielles. Sa présence isolée est un marqueur d\'aliment ultra-transformé (NOVA 4), très éloigné de l\'inositol naturellement présent dans les aliments entiers.' },
  { keywords: ['cheddar deshydrate', 'cheddar déshydraté', 'dehydrated cheddar', 'dried cheese', 'poudre de fromage', 'cheese powder'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Fromage déshydraté industriellement, souvent additionné de sels de fonte, anti-agglomérants et arômes pour la stabilité.' },

  // --- Cosmétique modéré → JAUNE ---
  { keywords: ['fragrance', 'parfum'], code: null, risk: 'possible', circ: 'Composition opaque', note: 'Composition non divulguée. Peut contenir des allergènes.' },
  { keywords: ['peg-', 'sles', 'sodium laureth sulfate'], code: null, risk: 'possible', circ: 'Controversé', note: 'Peut contenir du 1,4-dioxane cancérigène.' },
  { keywords: ['inuline', 'inuline d\'agave'], code: null, risk: 'possible', circ: 'Controversé', note: 'Généralement bénéfique mais peut causer inconforts digestifs en excès.' },

  // ═══════════════════════════════════════════════════════════════
  // 🟢 VERT — APPROUVÉ (Naturel sain)
  // ═══════════════════════════════════════════════════════════════

  // --- Base ---
  { keywords: ['eau', 'water', 'aqua', 'eau gazeifiee', 'eau gazéifiée', 'carbonated water', 'sparkling water', 'eau pétillante', 'eau minérale'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sel', 'salt', 'sel marin', 'sel de mer', 'sea salt', 'fleur de sel', 'sel iode', 'sel iodé', 'iodized salt', 'iodised salt', 'sel iodé fin', 'sel de table', 'table salt', 'sel fin', 'fine salt', 'sel rose', 'pink salt', 'sel de l\'himalaya', 'sel d\'himalaya', 'sel himalayen', 'himalayan salt', 'himalayan pink salt', 'sel gemme', 'rock salt', 'sel casher', 'kosher salt', 'sel gris', 'grey salt', 'gray salt', 'sel de guérande', 'sel de guerande', 'sel de cuisine', 'cooking salt', 'sel non iodé', 'sel non iode', 'non-iodized salt', 'chlorure de sodium', 'sodium chloride'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Minéral essentiel au bon fonctionnement de l\'organisme (équilibre hydrique, transmission nerveuse). Problématique uniquement en excès.' },

  // --- Céréales et féculents ---
  { keywords: ['ble', 'blé', 'wheat', 'grain de blé', 'grain de ble', 'wheat grain', 'blé entier', 'ble entier', 'whole wheat', 'farine de ble', 'farine de blé', 'farine complete', 'farine complète', 'farine de blé complète', 'wheat flour', 'whole wheat flour', 'whole flour', 'farine intégrale'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Céréale de base nutritive, source de glucides complexes, fibres, protéines végétales et vitamines du groupe B. La version complète conserve le son et le germe, riches en minéraux.' },
  { keywords: ['avoine', 'oat', 'flocons d\'avoine'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['riz', 'rice', 'riz complet', 'brown rice', 'vermicelles de riz'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['riz précuit', 'riz precuit', 'pre-cooked rice', 'precooked rice', 'parboiled rice'], code: null, risk: 'possible', circ: 'Céréale transformée', note: 'Riz précuit industriellement aux nutriments réduits et à index glycémique très élevé (≅90). Provoque des pics de glycémie rapides. Préférer le riz complet ou semi-complet.' },
  { keywords: ['vermicelles de blé', 'vermicelles de ble', 'wheat vermicelli'], code: null, risk: 'possible', circ: 'Blé raffiné', note: 'Produit à base de blé raffiné dépourvu de son et de germe, donc pauvre en fibres et nutriments. Index glycémique élevé, provoque des pics de glycémie. Préférer les versions complètes.' },
  { keywords: ['quinoa'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['orge', 'barley'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sarrasin', 'buckwheat'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['epeautre', 'épeautre', 'spelt'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['amidon de ble', 'amidon de blé', 'wheat starch', 'fécule de pomme de terre', 'potato starch', 'farine de riz', 'rice flour', 'amidon de riz', 'rice starch', 'amidon de pomme de terre'], code: null, risk: 'possible', circ: 'Transformé', note: 'Amidon extrait par procédé industriel. Glucide raffiné à index glycémique élevé, peu de nutriments. À modérer (le grain entier reste préférable).' },
  // Fécule de tapioca — GREEN (naturelle issue du manioc, protéines zéro additifs)
  { keywords: ['fécule de tapioca', 'fecule de tapioca', 'amidon de tapioca', 'tapioca starch', 'tapioca flour', 'farine de tapioca'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Amidon naturel extrait de la racine de manioc, sans gluten. Source d\'énergie facilement digestible. Utilisée traditionnellement en cuisine d\'Amérique du Sud et d\'Asie.' },
  { keywords: ['fécule de maïs', 'fecule de mais', 'cornstarch', 'corn starch', 'amidon de mais', 'amidon de maïs', 'farine de mais', 'farine de maïs'], code: null, risk: 'possible', circ: 'Transformé', note: 'Amidon extrait du maïs (souvent OGM hors UE) via procédé industriel. Glucide raffiné à index glycémique élevé, peu de nutriments. À modérer.' },

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
  { keywords: ['lait ecreme', 'lait écrémé', 'skim milk', 'skimmed milk'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['yaourt', 'yogurt', 'yoghurt'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['fromage', 'cheese', 'fromage blanc'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['oeuf', 'oeufs', 'egg', 'eggs', 'œuf', 'œufs'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['blanc d\'oeuf', 'blanc d\'œuf', 'blancs d\'oeufs', 'blancs d\'œufs', 'egg white', 'egg whites', 'albumen', 'albumine d\'oeuf', 'egg white powder', 'blanc d\'oeuf en poudre'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Blanc d\'œuf, ingrédient naturel issu de l\'œuf. Protéine pure de haute qualité.' },
  { keywords: ['whey', 'lactoserum', 'lactosérum', 'petit-lait', 'petit lait', 'whey protein', 'proteine de lactoserum', 'protéine de lactosérum', 'proteine de petit-lait'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Lactosérum (petit-lait), sous-produit naturel de la fabrication du fromage, riche en protéines.' },

  // --- Viandes fraîches non transformées ---
  // Viande brute (non charcutée, sans nitrites/additifs) — source de protéines, fer héminique et B12.
  { keywords: ['bœuf', 'boeuf', 'beef', 'porc', 'pork', 'agneau', 'lamb', 'veau', 'veal'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Viande non transformée, source de protéines complètes, fer héminique et vitamine B12. Préférer les morceaux frais (steak, rôti, escalope) cuisinés simplement à la viande transformée (charcuterie).' },
  { keywords: ['poulet', 'chicken', 'volaille', 'poultry', 'dinde', 'turkey', 'canard', 'duck'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Volaille fraîche non transformée, source de protéines maigres, vitamines B et minéraux.' },

  // --- Levures et ferments ---
  { keywords: ['levure', 'yeast', 'levure seche', 'levure sèche', 'dried yeast', 'levure boulangere', 'levure boulangère'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['bicarbonate', 'bicarbonate de sodium', 'sodium bicarbonate', 'baking soda'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['ferments lactiques', 'lactic cultures', 'live cultures', 'lactobacillus', 'probiotique', 'culture bactérienne', 'cultures bactériennes', 'bacterial culture', 'bacterial cultures', 'cultures actives', 'active cultures', 'bifidobacterium', 'streptococcus thermophilus'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Cultures bactériennes naturelles utilisées pour la fermentation (yaourts, fromages, kéfir). Bénéfiques pour le microbiote intestinal.' },

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
  { keywords: ['pois chiches', 'chickpeas', 'pois chiche', 'pois secs'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['haricots', 'beans', 'haricot'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['tofu', 'edamame', 'feve de soya', 'fève de soya', 'soya bean', 'soybean whole', 'graines de soja entieres', 'graines de soja entières'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Soja entier non transformé, source de protéines végétales complètes.' },

  // --- Fruits et légumes ---
  { keywords: ['fruit', 'legume', 'vegetable'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['pomme', 'apple', 'poire', 'pear', 'banane', 'banana', 'citron', 'lemon'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['tomate', 'tomato', 'tomates', 'tomatoes', 'concentre de tomate', 'concentré de tomate', 'tomato paste', 'puree de tomate', 'purée de tomate', 'poudre de tomate', 'tomato powder', 'tomates séchées au soleil', 'sun dried tomatoes'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['carotte', 'carrot', 'carottes', 'carrots', 'carotte déshydratée'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['epinard', 'épinard', 'spinach', 'brocoli', 'broccoli', 'brocoli séché', 'brocoli sec', 'chou', 'chou déshydraté', 'cabbage'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['raisin', 'grape', 'raisins', 'grapes'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['fraise', 'strawberry', 'myrtille', 'blueberry', 'framboise', 'raspberry'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['fibre de racine de manioc', 'cassava root fiber', 'manioc', 'cassava', 'tapioca'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Fibre naturelle prébiotique.' },
  { keywords: ['mais déshydraté', 'maïs déshydraté', 'dried corn', 'mais', 'maïs'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['oignon déshydraté', 'oignon vert déshydraté', 'dried onion', 'poudre d\'oignon', 'onion powder', 'poireau', 'poireau déshydraté'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Oignon naturel déshydraté utilisé comme aromate, conserve une partie des antioxydants de l\'oignon, généralement sans danger.' },
  { keywords: ['poudre de céleri', 'celery powder', 'céleri'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Épices et aromates ---
  { keywords: ['gingembre', 'ginger'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['curcuma', 'turmeric'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['cannelle', 'cinnamon'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['vanille', 'vanilla', 'extrait de vanille', 'vanilla extract', 'gousse de vanille'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['poivre', 'pepper', 'paprika', 'extrait de paprika', 'paprika extract', 'cumin', 'origan', 'oregano', 'basilic', 'basil', 'thym', 'thyme', 'romarin', 'rosemary'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['ail', 'garlic', 'oignon', 'onion', 'echalote', 'échalote', 'shallot', 'poudre d\'ail', 'garlic powder'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['epices', 'épices', 'spices', 'herbes', 'herbs', 'fines herbes', 'assaisonnement', 'assaisonnements', 'seasoning', 'seasonings', 'melange d epices', 'mélange d\'épices', 'spice mix', 'spice blend', 'spice mixture', 'epices mixtes', 'épices mixtes', 'mixed spices', 'aromates', 'condiments', 'condiment'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Les épices, herbes et assaisonnements naturels sont sains et riches en antioxydants. Aucun risque identifié à doses culinaires normales.' },
  // (Annatto / Rocou / E160b déplacé en ORANGE — voir colorants azoïques)

  // --- Sucres naturels ---
  { keywords: ['sucre de coco', 'coconut sugar', 'sucre de fleur de coco', 'coconut flower sugar'], code: null, risk: 'possible', circ: 'Sucre naturel', note: 'Sucre naturel issu de la sève de fleur de cocotier, contient quelques minéraux (potassium, zinc) et un index glycémique légèrement plus bas que le sucre blanc. Reste composé à ~80% de saccharose, mêmes effets métaboliques que le sucre blanc en quantité équivalente. À consommer avec modération.' },
  { keywords: ['miel', 'honey'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sirop d\'erable', 'sirop d\'érable', 'maple syrup', 'sucre d\'érable', 'maple sugar'], code: null, risk: 'possible', circ: 'Sucre naturel', note: 'Sève d\'érable concentrée, contient des antioxydants et minéraux (manganèse, zinc). Index glycémique modéré (~54) mais reste un sucre concentré. À consommer avec modération.' },
  // Sirop d'érable déshydraté — GREEN (naturel, méthode artisanale par déshydratation)
  { keywords: ['sirop d\'érable déshydraté', 'sirop d\'erable deshydrate', 'sirop erable deshydrate', 'sirop érable déshydraté', 'dehydrated maple syrup', 'maple syrup powder', 'sucre d\'érable granulé', 'granulated maple sugar'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Sirop d\'érable simplement déshydraté, sans additif ni raffinage chimique. Conserve les antioxydants et minéraux naturels (manganèse, zinc). Sucre naturel non raffiné à utiliser comme alternative au sucre blanc.' },
  { keywords: ['erythritol', 'érythritol'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Édulcorant naturel fermenté. Sûr selon EFSA et FDA.' },
  { keywords: ['stevia leaf', 'feuilles de stevia', 'feuilles de stévia', 'stévia entière', 'stevia entiere', 'poudre de stévia', 'poudre de stevia'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Feuille de stévia entière ou en poudre — édulcorant naturel sans calories.' },
  { keywords: ['xylitol'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Sûr pour humains. TOXIQUE pour chiens.' },
  { keywords: ['monk fruit', 'luo han guo', 'fruit du moine'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Acides et antioxydants naturels ---
  { keywords: ['vitamine c', 'acide ascorbique', 'ascorbic acid', 'e300'], code: 'E300', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['pectine', 'pectin', 'e440'], code: 'E440', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['lecithine de tournesol', 'sunflower lecithin', 'lécithine de tournesol'], code: 'E322', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['agar agar', 'agar-agar', 'e406'], code: 'E406', risk: 'aucun', circ: 'Naturel' },

  // --- Sels minéraux sûrs ---



  // --- Thés et plantes ---
  { keywords: ['the vert', 'thé vert', 'green tea', 'extrait de the vert', 'extrait de thé vert'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['the noir', 'thé noir', 'black tea', 'rooibos'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['cafe', 'café', 'coffee', 'grains de cafe', 'grains de café', 'coffee beans', 'extrait de cafe', 'extrait de café', 'coffee extract'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Boisson naturelle obtenue à partir de grains torréfiés. Riche en antioxydants (polyphénols). Aucun risque de cancer identifié — le CIRC a retiré le café de sa liste de cancérogènes possibles en 2016.' },

  // --- Stimulants naturels — JAUNE (sains mais à modérer) ---
  { keywords: ['cafeine', 'caféine', 'caffeine', 'cafeine anhydre', 'caféine anhydre', 'anhydrous caffeine', 'caffeine anhydrous'], code: null, risk: 'possible', circ: 'Naturel — à modérer', note: 'Stimulant naturel présent dans le café, le thé, le cacao et le guarana. Aucun lien avéré avec le cancer, bénéfices reconnus sur la vigilance et la performance cognitive. À modérer : max 400 mg/jour pour un adulte (≈ 4 cafés), 200 mg/jour pendant la grossesse.' },
  { keywords: ['guarana', 'extrait de guarana', 'guarana extract'], code: null, risk: 'possible', circ: 'Naturel — à modérer', note: 'Plante amazonienne riche en caféine naturelle. Effet stimulant prolongé. Sans danger en quantité raisonnable mais à éviter chez les enfants et femmes enceintes.' },
  { keywords: ['theine', 'théine', 'theobromine', 'théobromine'], code: null, risk: 'possible', circ: 'Naturel — à modérer', note: 'Alcaloïdes naturels du thé et du cacao, proches de la caféine. Effet stimulant doux. À modérer en cas de sensibilité.' },
  { keywords: ['taurine'], code: null, risk: 'possible', circ: 'Acide aminé', note: 'Acide aminé naturellement présent dans le corps et certains aliments (viande, poisson). Dans les boissons énergisantes, il est produit par synthèse. Sans danger aux doses usuelles selon l\'EFSA, mais à modérer en combinaison avec la caféine.' },
  { keywords: ['ginseng', 'extrait de ginseng', 'ginseng extract'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Plante adaptogène traditionnelle. Soutient la vitalité et la concentration.' },

  // --- Protéines et poissons naturels ---
  { keywords: ['saumon sauvage', 'wild salmon', 'sardine', 'sardines', 'maquereau', 'mackerel', 'anchois', 'anchovy'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Riche en oméga-3.' },
  { keywords: ['poulet', 'chicken', 'dinde', 'turkey'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Volailles maigres, sources de protéines de qualité. Non classées par l\'OMS.' },

  // ═══════════════════════════════════════════════════════════════
  // 🟢 EXPANSION MONDIALE — Aliments naturels du monde entier
  // ═══════════════════════════════════════════════════════════════

  // --- Fruits du monde ---
  { keywords: ['orange', 'oranges', 'mandarine', 'mandarin', 'clementine', 'clémentine', 'tangerine', 'pamplemousse', 'grapefruit', 'pomelo', 'lime', 'citron vert', 'kumquat', 'yuzu', 'bergamote', 'bergamot'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['peche', 'pêche', 'peach', 'nectarine', 'abricot', 'apricot', 'prune', 'plum', 'pruneau', 'prunes', 'cerise', 'cherry', 'cerises'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['mure', 'mûre', 'blackberry', 'cassis', 'blackcurrant', 'groseille', 'currant', 'redcurrant', 'cranberry', 'canneberge', 'airelle', 'baie de goji', 'goji berry', 'goji', 'sureau', 'elderberry', 'açai', 'acai'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['mangue', 'mango', 'ananas', 'pineapple', 'papaye', 'papaya', 'goyave', 'guava', 'fruit de la passion', 'passion fruit', 'maracuja', 'litchi', 'lychee', 'longane', 'longan', 'ramboutan', 'rambutan', 'mangoustan', 'mangosteen', 'durian', 'jacquier', 'jackfruit', 'fruit du dragon', 'dragon fruit', 'pitaya', 'carambole', 'starfruit', 'kaki', 'persimmon', 'corossol', 'soursop', 'guanabana', 'cherimoya', 'sapote'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['noix de coco', 'coconut', 'pulpe de coco', 'lait de coco', 'coconut milk', 'creme de coco', 'crème de coco', 'coconut cream', 'eau de coco', 'coconut water'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['avocat', 'avocado', 'olive', 'olives'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['figue', 'fig', 'figues', 'figs', 'datte', 'dates', 'dattes', 'medjool', 'datte medjool', 'raisin sec', 'raisins secs', 'sultanines', 'sultanas', 'cranberries séchées'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['grenade', 'pomegranate', 'kiwi', 'kiwis', 'melon', 'pasteque', 'pastèque', 'watermelon', 'cantaloup', 'cantaloupe'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['rhubarbe', 'rhubarb', 'coing', 'quince', 'mirabelle', 'reine claude', 'reine-claude', 'griotte'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['plantain', 'banane plantain', 'banana plantain', 'tamarin', 'tamarind', 'tamarillo', 'physalis', 'feijoa'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Légumes du monde ---
  { keywords: ['pomme de terre', 'potato', 'patate', 'patate douce', 'sweet potato', 'igname', 'yam', 'taro', 'malanga', 'topinambour', 'jerusalem artichoke', 'panais', 'parsnip', 'rutabaga', 'navet', 'turnip', 'radis', 'radish', 'daikon', 'radis noir', 'betterave', 'beetroot', 'beet'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['courgette', 'zucchini', 'courgettes', 'courge', 'squash', 'butternut', 'potiron', 'pumpkin', 'citrouille', 'pâtisson', 'patisson', 'concombre', 'cucumber', 'cornichon', 'pickle', 'gherkin', 'aubergine', 'eggplant', 'brinjal', 'poivron', 'pepper', 'bell pepper', 'piment', 'chili', 'chile', 'jalapeno', 'jalapeño', 'habanero', 'serrano', 'poblano', 'piment d\'espelette', 'piment doux', 'paprika doux'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['chou-fleur', 'cauliflower', 'chou de bruxelles', 'brussels sprouts', 'chou rouge', 'red cabbage', 'chou frise', 'chou frisé', 'kale', 'chou kale', 'pak choi', 'bok choy', 'chou chinois', 'napa cabbage', 'choucroute', 'sauerkraut', 'kimchi'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['salade', 'laitue', 'lettuce', 'roquette', 'arugula', 'rocket', 'mache', 'mâche', 'cresson', 'watercress', 'endive', 'chicoree', 'chicorée', 'frisée', 'scarole', 'romaine', 'iceberg', 'pousses d\'epinard', 'baby spinach'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['celeri', 'céleri', 'celery', 'celeri-rave', 'céleri-rave', 'celeriac', 'fenouil', 'fennel', 'asperge', 'asparagus', 'artichaut', 'artichoke', 'cardon', 'cardoon', 'bette', 'blette', 'swiss chard', 'silverbeet'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['poireau', 'leek', 'ciboule', 'cebette', 'oignon vert', 'green onion', 'scallion', 'spring onion', 'ciboulette', 'chives', 'ail des ours', 'wild garlic'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['petits pois', 'green peas', 'peas', 'pois mange-tout', 'snow peas', 'sugar snap peas', 'fève', 'feve', 'fava beans', 'broad beans', 'haricot vert', 'haricots verts', 'green beans', 'string beans', 'haricot rouge', 'kidney beans', 'haricot noir', 'black beans', 'haricot blanc', 'white beans', 'haricot pinto', 'pinto beans', 'flageolet', 'cannellini', 'borlotti', 'azuki', 'mungo', 'mung beans', 'pois cassés', 'split peas', 'pois cassés jaunes', 'yellow split peas', 'lentilles corail', 'red lentils', 'lentilles vertes', 'lentilles du puy', 'lentilles noires', 'beluga lentils'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['champignon', 'mushroom', 'champignons', 'mushrooms', 'champignon de paris', 'button mushroom', 'cremini', 'portobello', 'shiitake', 'maitake', 'enoki', 'pleurote', 'oyster mushroom', 'girolle', 'chanterelle', 'cèpe', 'cepe', 'porcini', 'morille', 'morel', 'truffe', 'truffle'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['okra', 'gombo', 'bamboo', 'pousses de bambou', 'bamboo shoots', 'germes de soja', 'bean sprouts', 'pousses de haricot mungo', 'lotus root', 'racine de lotus'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Céréales et pseudo-céréales ---
  { keywords: ['millet', 'millet brun', 'sorgho', 'sorghum', 'teff', 'amarante', 'amaranth', 'fonio', 'kamut', 'khorasan', 'seigle', 'rye', 'farine de seigle', 'son d\'avoine', 'oat bran', 'son de blé', 'wheat bran', 'germe de blé', 'wheat germ', 'boulgour', 'bulgur', 'couscous', 'semoule', 'semolina', 'polenta', 'gruau', 'porridge', 'muesli', 'flocons de quinoa', 'flocons d\'epeautre', 'flocons de sarrasin'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['pates completes', 'pâtes complètes', 'whole wheat pasta', 'pates de blé entier', 'pâtes de blé entier', 'pates au quinoa', 'pâtes au quinoa', 'soba', 'nouilles soba', 'udon', 'somen', 'nouilles de riz', 'rice noodles'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['riz basmati', 'basmati rice', 'riz jasmin', 'jasmine rice', 'riz arborio', 'arborio rice', 'riz noir', 'black rice', 'riz rouge', 'red rice', 'riz sauvage', 'wild rice', 'riz thai', 'thai rice'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Viandes et poissons ---
  { keywords: ['agneau', 'lamb', 'mouton', 'mutton', 'chevre', 'chèvre', 'goat', 'veau', 'veal', 'lapin', 'rabbit', 'canard', 'duck', 'oie', 'goose', 'pintade', 'guinea fowl', 'caille', 'quail', 'pigeon', 'faisan', 'pheasant', 'gibier', 'venison', 'cerf', 'chevreuil', 'sanglier', 'wild boar', 'bison', 'autruche', 'ostrich', 'kangourou', 'kangaroo'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['foie', 'liver', 'foie de volaille', 'rognon', 'rognons', 'kidney', 'cœur', 'coeur', 'heart', 'abats', 'offal', 'langue', 'tongue'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Abats riches en fer, vitamine B12 et vitamine A.' },
  { keywords: ['cabillaud', 'morue', 'cod', 'lieu', 'pollock', 'haddock', 'eglefin', 'églefin', 'merlu', 'hake', 'sole', 'bar', 'sea bass', 'loup', 'dorade', 'bream', 'rouget', 'red mullet', 'lotte', 'monkfish', 'turbot', 'flétan', 'fletan', 'halibut', 'truite', 'trout', 'omble', 'hareng', 'herring', 'esturgeon', 'sturgeon', 'merlan', 'whiting', 'saint-pierre', 'john dory'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['crevette', 'shrimp', 'prawn', 'crevettes', 'gambas', 'langoustine', 'langouste', 'lobster', 'homard', 'crabe', 'crab', 'tourteau', 'araignée de mer', 'ecrevisse', 'écrevisse', 'crayfish', 'huitre', 'huître', 'oyster', 'oysters', 'moule', 'moules', 'mussel', 'mussels', 'palourde', 'clam', 'clams', 'coque', 'cockle', 'saint-jacques', 'coquille saint-jacques', 'scallop', 'scallops', 'bulot', 'bigorneau', 'whelk', 'oursin', 'sea urchin', 'poulpe', 'pieuvre', 'octopus', 'calamar', 'calmar', 'squid', 'encornet', 'seiche', 'cuttlefish', 'algue', 'algues', 'seaweed', 'nori', 'kombu', 'wakame', 'dulse', 'agar'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['caviar', 'oeufs de poisson', 'œufs de poisson', 'fish roe', 'roe', 'oeufs de saumon', 'œufs de saumon', 'salmon roe'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Produits laitiers du monde ---
  { keywords: ['ricotta', 'mozzarella', 'parmesan', 'parmigiano', 'pecorino', 'grana padano', 'mascarpone', 'gorgonzola', 'taleggio', 'asiago', 'provolone', 'burrata', 'stracciatella', 'scamorza'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['feta', 'halloumi', 'manchego', 'queso fresco', 'paneer', 'labneh', 'kashkaval', 'kefalotyri'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['brie', 'camembert', 'roquefort', 'comté', 'comte', 'gruyere', 'gruyère', 'emmental', 'reblochon', 'munster', 'morbier', 'tomme', 'tomme de savoie', 'cantal', 'saint-nectaire', 'beaufort', 'mimolette', 'maroilles', 'bleu', 'bleu d\'auvergne', 'fourme d\'ambert', 'epoisses', 'époisses', 'crottin', 'chevre frais', 'chèvre frais', 'goat cheese', 'sainte-maure', 'valençay', 'banon', 'gouda', 'edam', 'maasdam', 'beaufort', 'tete de moine', 'tête de moine'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['kefir', 'kéfir', 'skyr', 'lassi', 'ayran', 'doogh', 'leben', 'kumis', 'koumis', 'yaourt grec', 'greek yogurt', 'yaourt nature', 'plain yogurt', 'yaourt bulgare'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['ghee', 'beurre clarifié', 'beurre clarifie', 'clarified butter', 'beurre de baratte', 'beurre cru', 'raw butter'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['lait de chevre', 'lait de chèvre', 'goat milk', 'lait de brebis', 'sheep milk', 'lait de bufflonne', 'buffalo milk', 'lait cru', 'raw milk', 'babeurre', 'buttermilk'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['lait d\'amande', 'almond milk', 'lait d\'avoine', 'oat milk', 'lait de soja', 'soy milk', 'lait de riz', 'rice milk', 'lait de noisette', 'hazelnut milk', 'lait de coco', 'coconut milk', 'boisson vegetale', 'boisson végétale', 'plant milk'], code: null, risk: 'aucun', circ: 'Naturel', note: 'À privilégier sans sucres ajoutés et sans additifs.' },

  // --- Noix et graines ---
  { keywords: ['noix du bresil', 'noix du brésil', 'brazil nut', 'noix de pecan', 'noix de pécan', 'pecan', 'noix de macadamia', 'macadamia', 'pignon de pin', 'pine nut', 'pinenut', 'noix de pili', 'pili nut', 'chataigne', 'châtaigne', 'marron', 'chestnut', 'arachide', 'cacahuete', 'cacahuète', 'peanut', 'peanuts', 'beurre de cacahuete', 'beurre de cacahuète', 'peanut butter', 'beurre d\'amande', 'almond butter', 'tahini', 'tahin', 'purée de sésame', 'beurre de noix de cajou', 'cashew butter'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['graines de courge', 'pumpkin seeds', 'pepitas', 'graines de pavot', 'poppy seeds', 'graines de fenouil', 'fennel seeds', 'graines de cumin', 'graines de coriandre', 'coriander seeds', 'graines de moutarde', 'mustard seeds', 'graines de fenugrec', 'fenugreek seeds', 'graines de nigelle', 'nigella seeds', 'graines de chanvre', 'hemp seeds'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Épices et herbes du monde ---
  { keywords: ['coriandre', 'cilantro', 'coriander', 'persil', 'parsley', 'aneth', 'dill', 'estragon', 'tarragon', 'menthe', 'mint', 'menthe poivree', 'menthe poivrée', 'peppermint', 'spearmint', 'sauge', 'sage', 'sarriette', 'savory', 'marjolaine', 'marjoram', 'laurier', 'bay leaf', 'feuille de laurier', 'verveine', 'verbena', 'melisse', 'mélisse', 'lemon balm', 'lavande', 'lavender', 'hysope', 'hyssop', 'angelique', 'angélique', 'livèche', 'lovage'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['cardamome', 'cardamom', 'clou de girofle', 'clove', 'cloves', 'noix de muscade', 'nutmeg', 'macis', 'mace', 'anis', 'anise', 'anis etoile', 'anis étoilé', 'star anise', 'badiane', 'fenugrec', 'fenugreek', 'safran', 'saffron', 'sumac', 'zaatar', 'za\'atar', 'ras el hanout', 'baharat', 'dukkah', 'garam masala', 'curry', 'curry powder', 'massala', 'masala', 'tandoori', 'cinq epices', 'cinq-épices', 'five spice', 'sichuan pepper', 'poivre de sichuan', 'poivre noir', 'black pepper', 'poivre blanc', 'white pepper', 'poivre rose', 'pink pepper', 'poivre vert', 'green pepper', 'poivre de cayenne', 'cayenne pepper', 'piment de la jamaique', 'piment de la jamaïque', 'allspice', 'piment fumé', 'smoked paprika', 'paprika fumé', 'pimenton', 'pimentón'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['feuille de kaffir', 'kaffir lime leaf', 'citronnelle', 'lemongrass', 'galanga', 'galangal', 'curcuma frais', 'fresh turmeric', 'racine de gingembre', 'ginger root', 'wasabi', 'raifort', 'horseradish', 'feuille de curry', 'curry leaf'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['herbes de provence', 'bouquet garni', 'fines herbes', 'persillade', 'gremolata', 'chimichurri'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Sauces et condiments naturels ---
  { keywords: ['moutarde', 'mustard', 'moutarde de dijon', 'dijon mustard', 'moutarde a l\'ancienne', 'whole grain mustard', 'wasabi', 'sauce soja', 'sauce soya', 'soy sauce', 'shoyu', 'tamari', 'sauce poisson', 'fish sauce', 'nuoc mam', 'nam pla', 'sauce huitre', 'sauce d\'huître', 'oyster sauce', 'sauce hoisin', 'hoisin', 'miso', 'pate miso', 'pâte miso', 'pate de soja fermente', 'natto', 'tempeh'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Aliments fermentés traditionnels, riches en probiotiques.' },
  { keywords: ['harissa', 'sambal', 'sambal oelek', 'sriracha maison', 'gochujang', 'doubanjiang', 'pâte de piment', 'chili paste', 'pâte de curry', 'curry paste', 'pesto', 'tapenade', 'pâte d\'olive', 'pâte d\'anchois', 'anchovy paste', 'pâte de tomate', 'concentré de tomate'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['tahini', 'humus maison', 'hummus', 'baba ganoush', 'tzatziki', 'guacamole', 'salsa verde', 'romesco', 'aioli', 'aïoli'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['cornichon naturel', 'pickle naturel', 'légumes lacto-fermentés', 'lacto-fermented vegetables', 'kombucha', 'kvass'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Aliments fermentés probiotiques traditionnels.' },

  // --- Sucres et édulcorants naturels ---
  { keywords: ['sirop de yacon', 'yacon syrup', 'sirop de dattes', 'date syrup'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['allulose', 'tagatose', 'fruit du moine en poudre', 'monk fruit extract', 'inuline de chicoree', 'inuline de chicorée'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Cuisines du monde — ingrédients ---
  { keywords: ['levain', 'sourdough', 'levain naturel', 'natural starter', 'masa harina', 'nixtamal', 'tortilla de maïs', 'corn tortilla', 'pita maison', 'pain pita', 'pain plat', 'flatbread', 'naan maison', 'chapati', 'roti', 'injera', 'lavash', 'pain au levain'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['couscous complet', 'whole couscous', 'freekeh', 'farro', 'epeautre perlé', 'orge perlé', 'pearled barley'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Boissons naturelles ---
  { keywords: ['eau de source', 'spring water', 'eau filtree', 'eau filtrée', 'tisane', 'infusion', 'herbal tea', 'thé blanc', 'white tea', 'thé oolong', 'oolong', 'thé pu-erh', 'pu-erh', 'matcha', 'thé matcha', 'maté', 'mate', 'yerba mate', 'yerba maté', 'hibiscus', 'karkadé', 'camomille', 'chamomile', 'verveine citronnelle', 'menthe poivrée infusion', 'rooibos vanille', 'chicorée', 'chicory'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['jus de fruits frais', 'fresh fruit juice', 'jus pressé', 'jus pressé à froid', 'cold-pressed juice', 'jus de légumes', 'vegetable juice', 'smoothie maison'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Privilégier les jus frais sans sucre ajouté.' },

  // --- Superaliments ---
  { keywords: ['spiruline en poudre', 'chlorella', 'klamath', 'maca', 'poudre de maca', 'ashwagandha', 'reishi', 'cordyceps', 'lion\'s mane', 'hericium', 'baobab', 'poudre de baobab', 'moringa', 'poudre de moringa', 'caroube', 'carob powder', 'cacao cru', 'raw cacao', 'feves de cacao', 'fèves de cacao', 'cacao nibs', 'eclats de cacao', 'éclats de cacao'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['gelée royale', 'royal jelly', 'propolis', 'pollen', 'pollen frais', 'bee pollen'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Huiles vierges naturelles ---
  { keywords: ['huile de chanvre', 'hemp oil', 'huile de pepins de courge', 'pumpkin seed oil', 'huile de germe de blé', 'wheat germ oil', 'huile d\'argan', 'argan oil', 'huile de macadamia', 'macadamia oil', 'huile de noix de coco vierge', 'virgin coconut oil', 'huile de cameline', 'camelina oil', 'huile de perilla', 'huile de périlla', 'perilla oil'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Huiles vierges pressées à froid, riches en oméga-3 et acides gras essentiels.' },

  // --- Vinaigres et fermentations ---
  { keywords: ['vinaigre de riz', 'rice vinegar', 'vinaigre de xeres', 'vinaigre de xérès', 'sherry vinegar', 'vinaigre de framboise', 'raspberry vinegar', 'vinaigre de noix de coco', 'coconut vinegar', 'vinaigre de malt', 'malt vinegar', 'vinaigre de champagne'], code: null, risk: 'aucun', circ: 'Naturel' },

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
  'acide borique', 'borax',
  'sulfate de cuivre',
] as const;

