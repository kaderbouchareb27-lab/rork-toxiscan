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
  // Charcuteries spécifiques — toutes classées Groupe 1 IARC (cancérogène avéré)
  { keywords: ['pepperoni', 'pepperonis'], code: null, risk: 'danger', circ: 'Groupe 1', note: 'Charcuterie industrielle (porc/bœuf fermenté + nitrites). Classée cancérogène avéré Groupe 1 par l\'OMS. Riche en sodium et nitrates.' },
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

  // --- Groupe 2A IARC officiel ---
  { keywords: ['acrylamide'], code: null, risk: 'probable', circ: 'Groupe 2A' },
  { keywords: ['glyphosate'], code: null, risk: 'probable', circ: 'Groupe 2A' },
  { keywords: ['viande rouge', 'red meat'], code: null, risk: 'probable', circ: 'Groupe 2A' },

  // --- Huiles ultra-transformées → ORANGE ---
  { keywords: ['huile de palme', 'palm oil', 'graisses de palme', 'graisses vegetales', 'graisse de palme'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Contient du 3-MCPD et glycidol cancérigènes.' },
  { keywords: ['huile de colza', 'canola oil', 'rapeseed oil', 'huile de canola'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Huile raffinée industriellement. Préférer pressée à froid.' },
  { keywords: ['huile de tournesol', 'sunflower oil', 'huile de tournesol raffinee', 'huile de tournesol à haute teneur en acide oléique', 'high oleic sunflower oil'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Riche en oméga-6 pro-inflammatoires. Déséquilibre omega-6/omega-3.' },
  { keywords: ['huile de soja', 'soybean oil', 'soy oil'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Excès oméga-6. Souvent OGM.' },
  { keywords: ['huile de mais', 'corn oil', 'huile de maïs'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Excès oméga-6 pro-inflammatoire.' },
  { keywords: ['huile de coton', 'cottonseed oil'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Souvent OGM et résidus de pesticides.' },
  { keywords: ['huile vegetale', 'vegetable oil', 'huiles vegetales', 'corps gras vegetaux', 'huile végétale'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Composition non précisée, souvent palme ou colza raffinés.' },
  { keywords: ['hydrogenated', 'hydrogene', 'partiellement hydrogene', 'huile hydrogénée', 'graisse hydrogénée'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Contient des graisses trans.' },
  { keywords: ['gras trans', 'trans fat', 'acides gras trans'], code: null, risk: 'probable', circ: 'Ultra-transformé' },
  { keywords: ['graisse interesterifiee', 'interesterified', 'graisse interestérifiée'], code: null, risk: 'probable', circ: 'Ultra-transformé' },

  // --- Amidons modifiés → ORANGE ---
  { keywords: ['amidon modifie', 'amidon modifié', 'modified starch', 'fécule modifiée', 'fecula modifiee', 'fécule de pomme de terre modifiée', 'fecule de pomme de terre modifiee', 'modified potato starch', 'fécule modifiée de pomme de terre', 'e1404', 'e1412', 'e1422', 'e1450', 'modified cornstarch', 'modified corn starch', 'modified tapioca starch', 'modified potato starch', 'modified wheat starch', 'modified rice starch', 'corn starch modified'], code: 'E1404/E1412/E1422/E1450', risk: 'probable', circ: 'Ultra-transformé', note: 'Glucide industriel ultra-transformé à fort index glycémique.' },

  // --- Protéines industrielles → ORANGE ---
  { keywords: ['proteines hydrolysees', 'hydrolyzed protein', 'hydrolyse', 'hydrolyzed', 'protéines hydrolysées'], code: null, risk: 'probable', circ: 'Ultra-transformé' },
  { keywords: ['caseinate', 'caseinate de sodium', 'caséinate'], code: null, risk: 'probable', circ: 'Ultra-transformé' },
  { keywords: ['isolat de proteines', 'protein isolate', 'soy protein isolate', 'milk protein concentrate', 'pea protein isolate', 'isolat de protéines', 'proteine de soya texturee', 'protéine de soya texturée', 'textured soy protein', 'soja texturé', 'tsp', 'tvp'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Isolat protéique industriel ultra-transformé.' },
  { keywords: ['substances laitieres modifiees', 'substances laitières modifiées', 'modified milk ingredients', 'ingredients laitiers modifies', 'ingrédients laitiers modifiés'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Mélange industriel de protéines de lait modifiées. Marqueur d\'ultra-transformation.' },

  // --- Édulcorants problématiques → ORANGE ---
  { keywords: ['acesulfame', 'acesulfame k', 'acesulfame potassium', 'e950'], code: 'E950', risk: 'probable', circ: 'Perturbateur endocrinien', note: 'Dégrade le microbiome intestinal. Perturbateur endocrinien.' },
  { keywords: ['aspartame', 'e951'], code: 'E951', risk: 'probable', circ: 'Groupe 2B', note: 'Classé possiblement cancérigène par le CIRC en 2023.' },

  // --- Conservateurs dangereux → ORANGE ---
  { keywords: ['bha', 'butylhydroxyanisole', 'e320'], code: 'E320', risk: 'probable', circ: 'Groupe 2B', note: 'Perturbateur endocrinien, cancérigène possible.' },
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
  { keywords: ['caramel ammoniacal sulfite', 'sulfite ammonia caramel', 'caramel iv', 'e150d'], code: 'E150d', risk: 'probable', circ: 'Groupe 2B', note: 'Contient du 4-MEI classé Groupe 2B.' },

  // --- Émulsifiants perturbateurs microbiome → ORANGE ---
  { keywords: ['carraghenane', 'carrageenan', 'carraghénane', 'e407'], code: 'E407', risk: 'probable', circ: 'Inflammation intestinale', note: 'Lié à l\'inflammation intestinale et aux maladies inflammatoires.' },
  { keywords: ['cmc', 'carboxymethylcellulose', 'e466'], code: 'E466', risk: 'probable', circ: 'Perturbateur microbiome', note: 'Perturbe le microbiome intestinal.' },
  { keywords: ['polysorbate 80', 'polysorbate80', 'e433'], code: 'E433', risk: 'probable', circ: 'Perturbateur microbiome', note: 'Perturbe le microbiome, favorise l\'inflammation chronique.' },
  { keywords: ['polysorbate 60', 'polysorbate 65', 'polysorbate 40', 'polysorbate 20', 'e432', 'e434', 'e435', 'e436'], code: 'E432-E436', risk: 'probable', circ: 'Perturbateur microbiome' },

  // --- Exhausteurs excitotoxiques → ORANGE ---
  { keywords: ['msg', 'glutamate monosodique', 'monosodium glutamate', 'acide glutamique', 'e620', 'e621'], code: 'E620-E621', risk: 'probable', circ: 'Excitotoxine', note: 'Excitotoxine qui stimule excessivement les neurones.' },

  // --- Aluminium → ORANGE ---
  { keywords: ['silicate aluminium', 'aluminum silicate', 'silicate alumino-sodique', 'silicate alumino-potassique', 'silicate alumino-calcique', 'e554', 'e555', 'e556'], code: 'E554-E556', risk: 'probable', circ: 'Neurotoxique', note: 'Accumulation aluminium liée à Alzheimer.' },
  { keywords: ['ferrocyanure de sodium', 'sodium ferrocyanide', 'e535'], code: 'E535', risk: 'probable', circ: 'Toxique' },
  { keywords: ['phosphate aluminium sodium', 'sodium aluminum phosphate', 'phosphate acide d\'aluminium et de sodium', 'e541'], code: 'E541', risk: 'probable', circ: 'Neurotoxique', note: 'Aluminium neurotoxique lié à Alzheimer.' },

  // --- Additifs interdits → ORANGE ---
  { keywords: ['azodicarbonamide', 'e927a'], code: 'E927a', risk: 'probable', circ: 'Interdit UE' },
  { keywords: ['potassium bromate', 'e924'], code: 'E924', risk: 'probable', circ: 'Groupe 2B', note: 'Interdit en UE, Canada, Royaume-Uni.' },

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
  { keywords: ['sucre', 'sugar', 'saccharose', 'sucre blanc', 'sucre raffiné', 'sucre raffine'], code: null, risk: 'possible', circ: 'Sucre raffiné', note: 'Lié à obésité, diabète type 2 et inflammation chronique.' },
  { keywords: ['sucre de canne', 'cane sugar', 'sucre de canne roux', 'raw cane sugar'], code: null, risk: 'possible', circ: 'Sucre raffiné' },
  { keywords: ['sucres', 'sugars'], code: null, risk: 'possible', circ: 'Sucre raffiné', note: 'Sucres ajoutés. Consommer avec modération.' },
  { keywords: ['sirop de glucose-fructose', 'glucose-fructose syrup', 'hfcs', 'high fructose corn syrup', 'sirop de glucose fructose'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Lié à l\'obésité et syndrome métabolique.' },
  { keywords: ['sirop de glucose', 'glucose syrup', 'glucose-sirop'], code: null, risk: 'possible', circ: 'Ultra-transformé léger' },
  { keywords: ['sirop de mais', 'corn syrup', 'sirop de maïs'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Sirop industriel issu de maïs souvent OGM. Lié à obésité, stéatose hépatique et syndrome métabolique.' },
  { keywords: ['gelatine', 'gélatine', 'gelatin'], code: null, risk: 'possible', circ: 'Origine animale industrielle', note: 'Issue de peaux et os animaux (bovin/porc) traités à l\'acide ou la soude. Procédé industriel, qualité variable selon les sources.' },
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
  { keywords: ['arome artificiel', 'arôme artificiel', 'artificial flavor', 'artificial flavour', 'artificial flavors', 'artificial flavours', 'saveur artificielle', 'saveurs artificielles', 'aromes artificiels', 'arômes artificiels'], code: null, risk: 'possible', circ: 'Synthétique', note: 'Molécules synthétiques. Marqueur de produit ultra-transformé.' },

  // --- Émulsifiants modérés → JAUNE ---
  { keywords: ['emulsifiant', 'emulsifiants', 'émulsifiant', 'émulsifiants', 'emulsifier', 'emulsifiers', 'e471', 'mono et diglycerides', 'monoglycerides', 'diglycerides', 'mono- et diglycérides', 'monodiglycérides', 'mono and diglycerides', 'mono- and diglycerides'], code: 'E471', risk: 'possible', circ: 'Ultra-transformé léger', note: 'Peuvent contenir des graisses trans cachées.' },
  { keywords: ['lecithine de soja', 'soy lecithin', 'lécithine de soja', 'lecithin', 'lécithine'], code: 'E322', risk: 'possible', circ: 'OGM possible', note: 'Émulsifiant courant. Peut être OGM.' },
  { keywords: ['pgpr', 'polyglycerol polyricinoleate', 'e476'], code: 'E476', risk: 'possible', circ: 'Ultra-transformé léger' },
  { keywords: ['poudre a lever', 'poudres a lever', 'poudres à lever', 'baking powder', 'levure chimique', 'raising agents', 'agent levant', 'agents levants'], code: null, risk: 'possible', circ: 'Additif', note: 'Contient souvent des phosphates. Modération.' },

  // --- Gommes → JAUNE ---
  { keywords: ['gomme xanthane', 'xanthan gum', 'xanthan', 'e415'], code: 'E415', risk: 'possible', circ: 'Controversé', note: 'Peut perturber la digestion chez les personnes sensibles.' },
  { keywords: ['gomme guar', 'gomme de guar', 'guar gum', 'e412'], code: 'E412', risk: 'possible', circ: 'Controversé', note: 'Gélifiant industriel, peut causer ballonnements et inconforts digestifs.' },
  { keywords: ['gomme arabique', 'arabic gum', 'acacia gum', 'e414'], code: 'E414', risk: 'possible', circ: 'Controversé' },
  { keywords: ['gomme de caroube', 'carob gum', 'e410'], code: 'E410', risk: 'possible', circ: 'Controversé' },
  { keywords: ['gomme konjac', 'konjac gum', 'e425'], code: 'E425', risk: 'possible', circ: 'Controversé', note: 'Risque de blocage intestinal.' },
  { keywords: ['gomme tara', 'tara gum', 'e417'], code: 'E417', risk: 'possible', circ: 'Controversé' },
  { keywords: ['gomme gellane', 'gellan gum', 'e418'], code: 'E418', risk: 'possible', circ: 'Controversé' },
  { keywords: ['alginate', 'alginate de potassium', 'potassium alginate', 'alginate d\'ammonium', 'ammonium alginate', 'alginate de calcium', 'calcium alginate', 'e401', 'e402', 'e403', 'e404'], code: 'E401-E404', risk: 'possible', circ: 'Gélifiant marin', note: 'Gélifiant industriel marin. Marqueur d\'ultra-transformation.' },

  // --- Acide citrique → JAUNE ---
  { keywords: ['acide citrique', 'citric acid', 'e330', 'acidifiant acide citrique', 'acidifiant (acide citrique)', 'acidifiant: acide citrique'], code: 'E330', risk: 'possible', circ: 'Industriel', note: 'Produit par fermentation fongique. Peut éroder l\'émail dentaire.' },

  // --- Phosphates → JAUNE ---
  { keywords: ['diphosphate', 'e450'], code: 'E450', risk: 'possible', circ: 'Excès phosphates' },
  { keywords: ['tripolyphosphate', 'e451'], code: 'E451', risk: 'possible', circ: 'Excès phosphates' },
  { keywords: ['polyphosphate', 'e452'], code: 'E452', risk: 'possible', circ: 'Excès phosphates' },
  { keywords: ['phosphate de sodium', 'phosphate de potassium', 'phosphate de calcium', 'sodium phosphate', 'e339', 'e340', 'e341'], code: 'E339/E340/E341', risk: 'possible', circ: 'Excès phosphates', note: 'Excès lié à calcification artères et troubles rénaux.' },

  // --- Sels et acides industriels → JAUNE ---
  { keywords: ['chlorure de potassium', 'potassium chloride', 'e508'], code: 'E508', risk: 'possible', circ: 'Substitut de sel industriel', note: 'Minéral mais utilisé comme substitut de sel industriel. Procédé de raffinage. À modérer chez les personnes avec insuffisance rénale.' },
  { keywords: ['acide lactique', 'lactic acid', 'e270'], code: 'E270', risk: 'possible', circ: 'Souvent synthétique', note: 'Souvent produit par fermentation industrielle ou synthèse chimique, et non issu naturellement du lait.' },
  { keywords: ['acide malique', 'malic acid', 'e296'], code: 'E296', risk: 'possible', circ: 'Souvent synthétique', note: 'Industriellement synthétisé pour usage alimentaire (rarement extrait des fruits).' },
  { keywords: ['spiruline', 'spirulina', 'spirulina extract', 'extrait de spiruline'], code: null, risk: 'possible', circ: 'Extraction industrielle', note: 'Algue naturelle mais procédé d\'extraction et de séchage industriel lourd. Risque de contamination métaux lourds selon la source.' },
  { keywords: ['bouillon', 'broth', 'bouillon de porc', 'bouillon de poulet', 'bouillon de boeuf', 'bouillon de bœuf', 'bouillon de legumes', 'bouillon de légumes', 'chicken broth', 'pork broth', 'beef broth', 'vegetable broth', 'bouillon compose', 'bouillon composé'], code: null, risk: 'possible', circ: 'Transformé', note: 'Ingrédient composite transformé. Contient souvent du sel, des exhausteurs et des arômes ajoutés.' },
  { keywords: ['modified whey', 'whey modified', 'lactosérum modifié'], code: null, risk: 'possible', circ: 'Transformé', note: 'Protéine de lactosérum modifiée industriellement.' },
  { keywords: ['defatted soy flour', 'soy flour defatted', 'farine de soja dégraissée'], code: null, risk: 'possible', circ: 'Transformé', note: 'Farine de soja dégraissée industriellement, souvent OGM.' },
  { keywords: ['imitation mozzarella', 'imitation cheese', 'fromage imitation', 'rehydrated mozzarella', 'rehydrated cheese'], code: null, risk: 'possible', circ: 'Ultra-transformé', note: 'Fromage imitation ultra-transformé.' },
  // Fromages allégés / transformés / fondus → JAUNE (procédé industriel qui dénature)
  { keywords: ['fromage allege', 'fromage allégé', 'fromage faible en gras', 'fromage maigre', 'reduced fat cheese', 'low fat cheese', 'light cheese', 'mozzarella allegee', 'mozzarella allégée', 'mozzarella allege', 'mozzarella allégé', 'mozzarella a teneur reduite', 'mozzarella à teneur réduite', 'reduced fat mozzarella', 'part skim mozzarella'], code: null, risk: 'possible', circ: 'Transformé', note: 'Fromage à teneur réduite en matières grasses obtenu par procédé industriel qui modifie sa structure naturelle. Souvent additionné de stabilisants pour compenser la texture.' },
  { keywords: ['fromage fondu', 'fromage fondus', 'fromages fondus', 'processed cheese', 'cheese product', 'fromage transforme', 'fromage transformé', 'preparation fromagere', 'préparation fromagère'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Fromage fondu industriel avec sels de fonte (phosphates), émulsifiants et additifs. Marqueur d\'ultra-transformation.' },

  // --- Conservateurs modérés → JAUNE ---
  { keywords: ['sodium benzoate', 'benzoate de sodium', 'e211'], code: 'E211', risk: 'possible', circ: 'Controversé', note: 'Forme du benzène avec vitamine C dans certaines boissons.' },
  { keywords: ['bht', 'butylhydroxytoluene', 'e321'], code: 'E321', risk: 'possible', circ: 'Controversé' },
  { keywords: ['sulfite', 'sulphite', 'dioxyde de soufre', 'sulfur dioxide', 'e220', 'e221', 'e222', 'e223', 'e224', 'e225', 'e226', 'e227', 'e228'], code: 'E220-E228', risk: 'possible', circ: 'Allergène', note: 'Provoque des crises d\'asthme et réactions allergiques.' },
  { keywords: ['sorbate de potassium', 'potassium sorbate', 'e202'], code: 'E202', risk: 'possible', circ: 'Conservateur', note: 'Conservateur synthétique généralement bien toléré mais controversé.' },
  { keywords: ['propionate de calcium', 'calcium propionate', 'e282'], code: 'E282', risk: 'possible', circ: 'Conservateur', note: 'Lié à irritabilité et troubles du comportement chez l\'enfant.' },
  { keywords: ['erythorbate de sodium', 'érythorbate de sodium', 'sodium erythorbate', 'e316'], code: 'E316', risk: 'possible', circ: 'Antioxydant industriel', note: 'Antioxydant synthétique utilisé dans les charcuteries pour fixer les nitrites.' },

  // --- Colorants Groupe 2B → JAUNE ---
  { keywords: ['rouge 3', 'red 3', 'erythrosine', 'e127'], code: 'E127', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['bleu 2', 'blue 2', 'e132'], code: 'E132', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['vert 3', 'green 3', 'e143'], code: 'E143', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['dioxyde de titane', 'titanium dioxide', 'e171'], code: 'E171', risk: 'possible', circ: 'Groupe 2B', note: 'Interdit en alimentation en UE depuis 2022.' },
  { keywords: ['cochenille', 'carmine', 'carmin', 'cochineal', 'e120'], code: 'E120', risk: 'possible', circ: 'Allergène', note: 'Allergène fort, chocs anaphylactiques possibles.' },
  { keywords: ['caramel ammoniacal', 'caramel iii', 'e150c'], code: 'E150c', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['silice', 'silicon dioxide', 'gel de silice', 'silica gel', 'dioxyde de silicium', 'e551'], code: 'E551', risk: 'possible', circ: 'Nanoparticules', note: 'Anti-agglomérant en nanoparticules. EFSA 2018 : accumulation hépatique constatée.' },

  // --- Édulcorants Groupe 2B → JAUNE ---
  { keywords: ['saccharine', 'saccharin', 'e954'], code: 'E954', risk: 'possible', circ: 'Groupe 2B' },
  { keywords: ['sucralose', 'e955'], code: 'E955', risk: 'possible', circ: 'Groupe 2B', note: 'Perturbe le microbiome intestinal selon études récentes.' },
  { keywords: ['cyclamate', 'e952'], code: 'E952', risk: 'possible', circ: 'Groupe 2B' },

  // --- Extrait de levure → JAUNE ---
  { keywords: ['extrait de levure', 'yeast extract', 'extraits de levure'], code: null, risk: 'possible', circ: 'Glutamate caché', note: 'Contient du glutamate naturel — MSG caché.' },

  // --- Amplificateurs de goût → JAUNE ---
  { keywords: ['guanylate', 'inosinate', 'guanylate disodique', 'inosinate disodique', 'ribonucleotides', 'ribonucléotides', 'e626', 'e627', 'e628', 'e629', 'e630', 'e631', 'e632', 'e633', 'e634', 'e635'], code: 'E626-E635', risk: 'possible', circ: 'Amplificateur de goût', note: 'Souvent combiné avec MSG pour amplifier le goût umami.' },

  // --- NOUVEAUX 🟡 JAUNE ---
  { keywords: ['anthocyanes', 'anthocyanins', 'e163'], code: 'E163', risk: 'possible', circ: 'Naturel transformé', note: 'Naturel mais souvent extrait avec solvants industriels.' },
  { keywords: ['chlorophylle', 'chlorophylles', 'chlorophyll', 'chlorophyllines', 'e140', 'e141'], code: 'E140', risk: 'possible', circ: 'Naturel transformé', note: 'Naturel mais version industrielle souvent avec cuivre ajouté.' },
  { keywords: ['alpha-tocopherol', 'alpha tocopherol', 'alpha-tocophérol', 'tocopherols', 'tocophérols', 'e307'], code: 'E307', risk: 'possible', circ: 'Vitamine E synthétique', note: 'Vitamine E synthétique industrielle, moins biodisponible que la naturelle.' },
  { keywords: ['gamma-tocopherol', 'gamma tocopherol', 'gamma-tocophérol', 'e308'], code: 'E308', risk: 'possible', circ: 'Vitamine E synthétique', note: 'Forme synthétique de vitamine E, moins biodisponible.' },
  { keywords: ['delta-tocopherol', 'delta tocopherol', 'delta-tocophérol', 'e309'], code: 'E309', risk: 'possible', circ: 'Vitamine E synthétique', note: 'Forme synthétique de vitamine E, moins biodisponible.' },
  { keywords: ['acide succinique', 'succinic acid', 'e363'], code: 'E363', risk: 'possible', circ: 'Acidifiant industriel', note: 'Acidifiant industriel, peu étudié à long terme.' },
  { keywords: ['citrate triammonique', 'triammonium citrate', 'e380'], code: 'E380', risk: 'possible', circ: 'Sel ammonium', note: 'Sel d\'ammonium industriel, données toxicologiques limitées.' },
  { keywords: ['tanin ferrique', 'tanins ferriques', 'iron tannate', 'e181'], code: 'E181', risk: 'possible', circ: 'Stabilisant', note: 'Colorant/stabilisant peu étudié. Interaction avec absorption du fer.' },
  { keywords: ['or', 'gold', 'e175'], code: 'E175', risk: 'possible', circ: 'Métal inerte', note: 'Métal inerte mais nanoparticules d\'or de plus en plus controversées.' },
  { keywords: ['sulfate de magnesium', 'sulfate de magnésium', 'magnesium sulfate', 'sel d\'epsom', 'e518'], code: 'E518', risk: 'possible', circ: 'Laxatif', note: 'Laxatif industriel à doses élevées. Perturbation des électrolytes.' },
  { keywords: ['stearate de magnesium', 'stéarate de magnésium', 'magnesium stearate', 'e572'], code: 'E572', risk: 'possible', circ: 'Lubrifiant industriel', note: 'Agent lubrifiant industriel. Peut réduire l\'absorption des nutriments.' },
  { keywords: ['glucono-delta-lactone', 'gdl', 'glucono delta lactone', 'e575'], code: 'E575', risk: 'possible', circ: 'Acidifiant industriel', note: 'Acidifiant industriel par fermentation artificielle. Données long terme limitées.' },

  // --- Soja / lait en poudre / farine enrichie → JAUNE (transformés industriels) ---
  { keywords: ['soja', 'soy', 'soya'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Soja non spécifié dans un produit industriel = quasi toujours transformé (isolat, protéine texturée, lécithine, farine dégraissée). Souvent OGM (94% aux USA). Préférer le soja entier non transformé (tofu, edamame).' },
  { keywords: ['proteine de soja', 'protéine de soja', 'soy protein', 'proteines de soja', 'protéines de soja'], code: null, risk: 'probable', circ: 'Ultra-transformé', note: 'Protéine de soja industrielle extraite par solvants chimiques. Souvent OGM. Marqueur de produit ultra-transformé.' },
  { keywords: ['lait en poudre', 'milk powder', 'lait écrémé en poudre', 'lait ecreme en poudre', 'skimmed milk powder', 'poudre de lait', 'lait entier en poudre', 'whole milk powder'], code: null, risk: 'possible', circ: 'Ultra-transformé léger', note: 'Lait déshydraté industriellement par atomisation à haute température. Contient des oxystérols (cholestérol oxydé) liés à l\'inflammation cardiovasculaire.' },
  { keywords: ['farine de ble enrichie', 'farine de blé enrichie', 'enriched wheat flour', 'farine enrichie', 'enriched flour'], code: null, risk: 'possible', circ: 'Industriel', note: 'Farine raffinée appauvrie puis re-fortifiée artificiellement avec des vitamines de synthèse (fer, niacine, B1). Index glycémique élevé, fibres perdues.' },
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
  { keywords: ['sel', 'salt', 'sel marin', 'sel de mer', 'fleur de sel', 'sel iode', 'sel iodé'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Minéral essentiel au bon fonctionnement de l\'organisme (équilibre hydrique, transmission nerveuse). Problématique uniquement en excès. / Essential mineral for bodily functions (fluid balance, nerve transmission). Only problematic in excess.' },

  // --- Céréales et féculents ---
  { keywords: ['farine de ble', 'farine de blé', 'farine complete', 'wheat flour', 'whole wheat flour', 'whole flour'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['avoine', 'oat', 'flocons d\'avoine'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['riz', 'rice', 'riz complet', 'brown rice', 'vermicelles de riz'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['riz précuit', 'riz precuit', 'pre-cooked rice', 'precooked rice', 'parboiled rice'], code: null, risk: 'possible', circ: 'Céréale transformée', note: 'Céréale transformée aux nutriments réduits et à index glycémique élevé comparé au riz complet. / Processed grain with reduced nutrients and a high glycemic index compared to whole grain rice.' },
  { keywords: ['vermicelles de blé', 'vermicelles de ble', 'wheat vermicelli'], code: null, risk: 'possible', circ: 'Blé raffiné', note: 'Produit à base de blé raffiné, index glycémique élevé pouvant provoquer des pics de glycémie. / Refined wheat product with a high glycemic index that can cause blood sugar spikes.' },
  { keywords: ['quinoa'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['orge', 'barley'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sarrasin', 'buckwheat'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['epeautre', 'épeautre', 'spelt'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['amidon de ble', 'amidon de blé', 'wheat starch', 'fécule de pomme de terre', 'potato starch', 'fécule de maïs', 'cornstarch', 'amidon de mais', 'amidon de maïs', 'farine de mais', 'farine de maïs', 'farine de riz'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Amidon naturel non modifié.' },

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
  { keywords: ['fromage', 'cheese', 'fromage blanc', 'cheddar', 'fromage cheddar'], code: null, risk: 'aucun', circ: 'Naturel' },
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
  { keywords: ['oignon déshydraté', 'oignon vert déshydraté', 'dried onion', 'poudre d\'oignon', 'onion powder', 'poireau', 'poireau déshydraté'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Oignon naturel déshydraté utilisé comme aromate, conserve une partie des antioxydants de l\'oignon, généralement sans danger. / Natural dehydrated onion used for flavoring, retains some antioxidant properties of onions, generally safe.' },
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
  { keywords: ['sucre de coco', 'coconut sugar'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['miel', 'honey'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['sirop d\'erable', 'sirop d\'érable', 'maple syrup'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['erythritol', 'érythritol'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Édulcorant naturel fermenté. Sûr selon EFSA et FDA.' },
  { keywords: ['stevia', 'stévia', 'stevia leaf', 'extrait de stevia', 'extrait de stévia', 'extrait de feuilles de stevia', 'extrait de feuilles de stévia', 'rebaudioside', 'steviol', 'e960'], code: 'E960', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['xylitol'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Sûr pour humains. TOXIQUE pour chiens.' },
  { keywords: ['monk fruit', 'luo han guo', 'fruit du moine'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Acides et antioxydants naturels ---
  { keywords: ['vitamine c', 'acide ascorbique', 'ascorbic acid', 'e300'], code: 'E300', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['pectine', 'pectin', 'e440'], code: 'E440', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['lecithine de tournesol', 'sunflower lecithin', 'lécithine de tournesol'], code: 'E322', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['agar agar', 'agar-agar', 'e406'], code: 'E406', risk: 'aucun', circ: 'Naturel' },

  // --- Sels minéraux sûrs ---
  { keywords: ['citrate de potassium', 'potassium citrate', 'e332'], code: 'E332', risk: 'aucun', circ: 'Naturel' },
  { keywords: ['carbonate de sodium', 'sodium carbonate', 'e500'], code: 'E500', risk: 'aucun', circ: 'Naturel' },

  // --- Thés et plantes ---
  { keywords: ['the vert', 'thé vert', 'green tea', 'extrait de the vert', 'extrait de thé vert'], code: null, risk: 'aucun', circ: 'Naturel' },
  { keywords: ['the noir', 'thé noir', 'black tea', 'rooibos'], code: null, risk: 'aucun', circ: 'Naturel' },

  // --- Protéines et poissons naturels ---
  { keywords: ['saumon sauvage', 'wild salmon', 'sardine', 'sardines', 'maquereau', 'mackerel', 'anchois', 'anchovy'], code: null, risk: 'aucun', circ: 'Naturel', note: 'Riche en oméga-3.' },
  { keywords: ['porc', 'pork', 'bœuf', 'boeuf', 'beef', 'poulet', 'chicken', 'dinde', 'turkey'], code: null, risk: 'aucun', circ: 'Naturel' },

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