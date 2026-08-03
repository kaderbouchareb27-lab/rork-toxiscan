import { AdditiveInfo, RiskGroup, ProductCategory, AdditiveCategory } from '@/types';
import { t, getDeviceLanguage, pick } from '@/utils/i18n';
import { getOfficialEn, localizeOfficialText } from '@/utils/officialDescriptions';

export const ADDITIVES_DATABASE: AdditiveInfo[] = [
  // ═══════════════════════════════════════════════════════════════
  // 🔴 GROUPE 1 — CANCÉROGÈNES AVÉRÉS (IARC officiel ou interdit santé)
  // ═══════════════════════════════════════════════════════════════

  // --- Nitrites & Nitrates (FOOD) ---
  { code: 'en:e249', name: 'Nitrite de potassium', group: 'group1', category: 'food', description: 'Conservateur de charcuterie. Forme des nitrosamines cancérogènes lors de la cuisson. Classé cancérogène avéré par le CIRC (Groupe 1) via la viande transformée.' },
  { code: 'en:e250', name: 'Nitrite de sodium', group: 'group1', category: 'food', description: 'Conservateur utilisé dans les charcuteries (jambon, bacon, saucisson). Forme des nitrosamines cancérogènes (Groupe 1 CIRC) lors de la cuisson. À éviter le plus possible.' },
  { code: 'en:e251', name: 'Nitrate de sodium', group: 'group1', category: 'food', description: 'Conservateur qui se transforme en nitrites puis en nitrosamines dans l\'organisme. Lié au cancer colorectal et de l\'estomac.' },
  { code: 'en:e252', name: 'Nitrate de potassium', group: 'group1', category: 'food', description: 'Conservateur de charcuterie. Se transforme en nitrosamines cancérogènes (Groupe 1 CIRC).' },

  // --- Formaldéhyde et libérateurs ---
  { code: 'en:e240', name: 'Formaldéhyde', group: 'group1', category: 'food', description: 'Cancérogène avéré (Groupe 1 CIRC). Lié au cancer du nasopharynx et à la leucémie. Interdit en cosmétique UE.' },
  {
    code: 'dmdm-hydantoin', name: 'DMDM Hydantoïne', group: 'group1', category: 'cosmetic',
    description: 'Conservateur cosmétique libérateur de formaldéhyde, classé cancérigène par le CIRC (Groupe 1). Sensibilisant cutané, présent dans lingettes bébé, crèmes et shampoings. Éviter tout contact.',
    descriptionEn: 'Cosmetic preservative that releases carcinogenic formaldehyde (IARC Group 1). Skin sensitizer found in baby wipes, creams and shampoos. Avoid all contact.',
  },
  {
    code: 'quaternium-15', name: 'Quaternium-15', group: 'group1', category: 'cosmetic',
    description: 'Conservateur cosmétique libérateur de formaldéhyde (cancérigène CIRC Groupe 1). Sensibilisant cutané puissant. Éviter tout contact.',
    descriptionEn: 'Cosmetic preservative that releases carcinogenic formaldehyde (IARC Group 1). Strong skin sensitizer. Avoid all contact.',
  },
  {
    code: 'bronopol', name: 'Bronopol', group: 'group1', category: 'cosmetic',
    description: 'Conservateur cosmétique libérateur de formaldéhyde. Peut former des nitrosamines cancérigènes au contact de la peau. Allergène cutané. Éviter tout contact.',
    descriptionEn: 'Cosmetic preservative that releases formaldehyde and can form carcinogenic nitrosamines on skin. Known skin allergen. Avoid all contact.',
  },
  {
    code: 'diazolidinyl-urea', name: 'Diazolidinyl Urea', group: 'group1', category: 'cosmetic',
    description: 'Libérateur de formaldéhyde (CIRC Groupe 1) en cosmétique. Sensibilisant cutané pouvant déclencher dermatites de contact. Éviter tout contact.',
    descriptionEn: 'Formaldehyde-releasing cosmetic preservative (IARC Group 1). Skin sensitizer that can trigger contact dermatitis. Avoid all contact.',
  },
  {
    code: 'imidazolidinyl-urea', name: 'Imidazolidinyl Urea', group: 'group1', category: 'cosmetic',
    description: 'Conservateur cosmétique libérateur de formaldéhyde. Allergène cutané sensibilisant. Éviter tout contact.',
    descriptionEn: 'Formaldehyde-releasing cosmetic preservative. Skin allergen and sensitizer. Avoid all contact.',
  },

  // --- Métaux lourds et toxines ---
  { code: 'aflatoxine', name: 'Aflatoxines', group: 'group1', category: 'food', description: 'Mycotoxines cancérogènes avérées (Groupe 1 CIRC). Cancer du foie. Contamination possible des arachides, maïs.' },
  { code: 'benzene', name: 'Benzène', group: 'group1', category: 'food', description: 'Solvant cancérogène avéré (leucémie). Peut se former dans les sodas combinant vitamine C + benzoate de sodium.' },
  {
    code: 'mercury-thimerosal', name: 'Mercure / Thimérosal', group: 'group1', category: 'cosmetic',
    description: 'Métal lourd cancérigène et neurotoxique. Interdit en cosmétique UE. Toxique par contact cutané et inhalation. Éviter tout contact.',
    descriptionEn: 'Heavy metal classified carcinogenic and neurotoxic. Banned in EU cosmetics. Toxic via skin contact and inhalation. Avoid all contact.',
  },
  { code: 'cadmium', name: 'Cadmium', group: 'group1', category: 'food', description: 'Métal lourd cancérogène avéré (Groupe 1 CIRC). Cancer du poumon, rein, prostate.' },
  { code: 'arsenic', name: 'Arsenic', group: 'group1', category: 'food', description: 'Métal lourd cancérogène avéré. Cancer de la peau, poumon, vessie.' },
  {
    code: 'lead-acetate', name: 'Plomb (acétate de plomb)', group: 'group1', category: 'cosmetic',
    description: 'Cancérigène avéré (CIRC Groupe 1) et neurotoxique. Interdit en cosmétique UE. Éviter tout contact.',
    descriptionEn: 'Confirmed carcinogen (IARC Group 1) and neurotoxin. Banned in EU cosmetics. Avoid all contact.',
  },

  // --- PFAS / Polluants éternels ---
  {
    code: 'pfas', name: 'PFAS / Polluants éternels', group: 'group1', category: 'packaging',
    description: 'PFOA classé cancérigène CIRC Groupe 1 depuis 2023. Présents dans emballages alimentaires antigraisse, papiers traités. Migration vers le contenu. Éviter tout contact prolongé.',
    descriptionEn: 'PFOA classified IARC Group 1 carcinogen since 2023. Found in grease-resistant food packaging and treated paper. Can migrate into contents. Avoid prolonged contact.',
  },
  {
    code: 'pfas-textile', name: 'PFAS / PFC dans textiles', group: 'group1', category: 'textile',
    description: 'Présents dans vêtements imperméables, anti-taches et anti-feu. Cancérigènes et perturbateurs endocriniens par contact cutané prolongé. Éviter tout contact prolongé.',
    descriptionEn: 'Used in waterproof, stain-resistant and flame-retardant clothing. Carcinogenic and endocrine-disrupting via prolonged skin contact. Avoid prolonged contact.',
  },

  // --- Cosmétique cancérogène ---
  {
    code: 'coal-tar', name: 'Goudron de houille (coal tar)', group: 'group1', category: 'cosmetic',
    description: 'Cancérigène avéré (CIRC Groupe 1) utilisé dans certains shampoings antipelliculaires. Irritant cutané. Éviter tout contact.',
    descriptionEn: 'Confirmed carcinogen (IARC Group 1) used in some anti-dandruff shampoos. Skin irritant. Avoid all contact.',
  },
  {
    code: 'chrome-vi', name: 'Chrome hexavalent (Cr VI)', group: 'group1', category: 'textile',
    description: 'Utilisé dans le tannage du cuir. Cancérigène avéré CIRC Groupe 1 par contact cutané. Provoque eczémas et brûlures. Éviter tout contact.',
    descriptionEn: 'Used in leather tanning. Confirmed carcinogen (IARC Group 1) via skin contact. Causes eczema and burns. Avoid all contact.',
  },

  // --- Additifs interdits ---
  { code: 'en:e927a', name: 'Azodicarbonamide', group: 'group1', category: 'food', description: 'Interdit dans l\'UE depuis 2005. Libère du semicarbazide cancérogène lors de la cuisson.' },
  { code: 'en:e924', name: 'Bromate de potassium', group: 'group1', category: 'food', description: 'Interdit en UE, Canada, Royaume-Uni. Cancérogène possible (Groupe 2B CIRC).' },
  { code: 'en:e173', name: 'Aluminium (colorant)', group: 'group1', category: 'food', description: 'Métal neurotoxique lié à la maladie d\'Alzheimer.' },
  { code: 'en:e535', name: 'Ferrocyanure de sodium', group: 'group1', category: 'food', description: 'Peut libérer du cyanure en milieu acide. Toxique à doses élevées.' },
  { code: 'en:e541', name: 'Phosphate d\'aluminium sodium', group: 'group1', category: 'food', description: 'Contient de l\'aluminium neurotoxique lié à Alzheimer.' },

  // --- Mélamine (food contaminant) ---
  { code: 'melamine', name: 'Mélamine', group: 'group1', category: 'food', description: 'Toxique pour les reins. Peut causer des calculs rénaux et une insuffisance rénale.' },

  // --- Hydroquinone ---
  {
    code: 'hydroquinone', name: 'Hydroquinone', group: 'group1', category: 'cosmetic',
    description: 'Agent éclaircissant cutané cancérigène (CIRC Groupe 1), interdit en Europe en cosmétique. Provoque ochronose et lésions cutanées. Éviter tout contact.',
    descriptionEn: 'Skin-lightening agent classified carcinogenic (IARC Group 1), banned in EU cosmetics. Causes ochronosis and skin lesions. Avoid all contact.',
  },

  // --- Azoïques textile ---
  {
    code: 'azo-dyes', name: 'Colorants azoïques textiles', group: 'group1', category: 'textile',
    description: 'Peuvent libérer des amines aromatiques cancérigènes par contact cutané prolongé. Allergènes puissants. Éviter tout contact prolongé.',
    descriptionEn: 'Can release carcinogenic aromatic amines via prolonged skin contact. Strong allergens. Avoid prolonged contact.',
  },


  // ═══════════════════════════════════════════════════════════════
  // 🟠 GROUPE 2A — PROBABLEMENT CANCÉROGÈNES / PROBLÉMATIQUES MAJEURS
  // ═══════════════════════════════════════════════════════════════

  // --- Groupe 2A IARC officiel (food) ---
  { code: 'acrylamide', name: 'Acrylamide', group: 'group1', category: 'food', description: 'Groupe 2A CIRC mais génotoxique confirmé chez l\'humain (forme des adduits ADN). L\'UE a fixé des seuils réglementaires obligatoires en 2017. Se forme à haute température dans chips, frites, café, biscuits, pain grillé.' },
  { code: 'glyphosate', name: 'Glyphosate', group: 'group1', category: 'food', description: 'Herbicide classé probablement cancérogène par le CIRC (2015). Lien établi avec lymphome non hodgkinien. Résidus fréquents dans céréales, légumineuses et produits transformés non bio.' },
  { code: 'viande-rouge', name: 'Viande rouge', group: 'group2a', category: 'food', description: 'Probablement cancérogène (Groupe 2A CIRC). Lien avec cancer colorectal. Limiter à 500g/semaine.' },

  // --- Édulcorant problématique ---
  { code: 'en:e951', name: 'Aspartame', group: 'group2a', category: 'food', description: 'Interdit dans certains pays. Considéré cancérigène possible par le CIRC (Groupe 2B). À éviter.' },
  { code: 'en:e950', name: 'Acésulfame potassium', group: 'group2a', category: 'food', description: 'Perturbateur du microbiome intestinal. Lien suspecté avec diabète. À limiter.' },

  // --- Conservateurs problématiques ---
  { code: 'en:e320', name: 'BHA (Butylhydroxyanisole)', group: 'group2a', category: 'food', description: 'Interdit dans certains pays. Considéré cancérigène possible par le CIRC (Groupe 2B). À éviter.' },
  { code: 'en:e319', name: 'TBHQ (Tert-butylhydroquinone)', group: 'group2a', category: 'food', description: 'Conservateur de synthèse dérivé du pétrole. Non classé cancérigène par le CIRC. Des études animales à hautes doses suggèrent des effets sur le système immunitaire et un stress oxydatif. Additif autorisé dans l\'UE mais à limiter.' },

  // --- Colorants azoïques (hyperactivité enfant) ---
  { code: 'en:e102', name: 'Tartrazine / Yellow 5', group: 'group2a', category: 'food', description: 'Colorant azoïque lié à l\'hyperactivité chez l\'enfant. Avertissement obligatoire en UE. Souvent contaminé par la benzidine.' },
  { code: 'en:e110', name: 'Jaune orangé S / Yellow 6', group: 'group2a', category: 'food', description: 'Colorant azoïque lié à l\'hyperactivité chez l\'enfant. Avertissement obligatoire en UE.' },
  { code: 'en:e124', name: 'Rouge cochenille A / Ponceau 4R', group: 'group2a', category: 'food', description: 'Colorant azoïque interdit aux USA. Lié à l\'hyperactivité chez l\'enfant.' },
  { code: 'en:e129', name: 'Rouge allura / Red 40', group: 'group2a', category: 'food', description: 'Colorant alimentaire synthétique (E129 / Allura Red) lié à l\'hyperactivité chez l\'enfant. Études Oxford 2024 : dommages ADN documentés. Préoccupations cancérigènes possibles.' },
  { code: 'orange-b', name: 'Orange B', group: 'group2a', category: 'food', description: 'Colorant azoïque synthétique lié à des réactions allergiques, à l\'hyperactivité chez l\'enfant et à des perturbations hormonales.' },
  { code: 'en:e122', name: 'Azorubine / Carmoisine', group: 'group2a', category: 'food', description: 'Colorant azoïque lié à l\'hyperactivité chez l\'enfant.' },
  { code: 'en:e150d', name: 'Caramel ammoniaqué sulfite (Caramel IV)', group: 'group2a', category: 'food', description: 'Colorant caramel ultra-transformé obtenu par chauffage de sucres avec ammoniaque et sulfites. Contient du 4-MEI classé Groupe 2B CIRC (possiblement cancérogène). Présent dans les colas. À éviter.' },

  // --- Émulsifiants nocifs pour le microbiome ---
  { code: 'en:e407', name: 'Carraghénane / Carraghénine', group: 'group2a', category: 'food', description: 'Lié à l\'inflammation intestinale et au syndrome du côlon irritable. Études récentes alarmantes.' },
  { code: 'en:e433', name: 'Polysorbate 80', group: 'group2a', category: 'food', description: 'Perturbe le microbiome intestinal selon études (Nature 2015). Lien avec inflammation.' },
  { code: 'en:e466', name: 'CMC / Carboxyméthylcellulose', group: 'group2a', category: 'food', description: 'Lié à l\'inflammation intestinale dans études récentes.' },
  { code: 'en:e432', name: 'Polysorbate 20', group: 'group2a', category: 'food', description: 'Émulsifiant industriel qui perturbe le microbiome intestinal.' },
  { code: 'en:e434', name: 'Polysorbate 40', group: 'group2a', category: 'food', description: 'Émulsifiant industriel qui perturbe le microbiome intestinal.' },
  { code: 'en:e435', name: 'Polysorbate 60', group: 'group2a', category: 'food', description: 'Émulsifiant industriel qui perturbe le microbiome intestinal.' },
  { code: 'en:e436', name: 'Polysorbate 65', group: 'group2a', category: 'food', description: 'Émulsifiant industriel qui perturbe le microbiome intestinal.' },

  // --- Exhausteur de goût excitotoxique ---
  { code: 'en:e621', name: 'Glutamate monosodique (MSG)', group: 'group2a', category: 'food', description: 'Excitotoxine qui stimule excessivement les neurones. Maux de tête, palpitations possibles. Marqueur d\'ultra-transformé.' },
  { code: 'en:e620', name: 'Acide glutamique', group: 'group2a', category: 'food', description: 'Excitotoxine, même famille que MSG.' },

  // --- Huiles vraiment problématiques ---
  // Groupe 2A CIRC (3-MCPD/glycidol = PROBABLEMENT cancérogène) → orange, cohérent avec ingredientsDatabase. Jamais vert, jamais rouge Groupe 1.
  { code: 'palm-oil', name: 'Huile de palme', group: 'group2a', category: 'food', description: 'Huile raffinée contenant du 3-MCPD et des esters de glycidol classés Groupe 2A CIRC (probablement cancérogène) à des niveaux préoccupants. L\'EFSA a fixé une DJA très basse en 2018. Procédé de raffinage à haute température. Désastre écologique (déforestation).' },
  { code: 'hydrogenated-oil', name: 'Huile hydrogénée / Gras trans', group: 'group2a', category: 'food', description: 'Contient des gras trans liés aux maladies cardiovasculaires. Interdit aux USA depuis 2018.' },

  // --- Aluminium ---
  { code: 'en:e554', name: 'Silicate aluminium sodium', group: 'group2a', category: 'food', description: 'Contient de l\'aluminium biodisponible. Accumulation neurologique préoccupante.' },
  { code: 'en:e555', name: 'Silicate aluminium potassium', group: 'group2a', category: 'food', description: 'Aluminium biodisponible, accumulation neurologique.' },
  { code: 'en:e556', name: 'Silicate aluminium calcium', group: 'group2a', category: 'food', description: 'Aluminium biodisponible, accumulation neurologique.' },
  {
    code: 'aluminium-deodorant', name: 'Aluminium chlorohydrate (déodorants)', group: 'group2a', category: 'cosmetic',
    description: 'Sels d\'aluminium présents dans déodorants antitranspirants. Lien suspecté avec cancer du sein par absorption cutanée. Éviter contact prolongé sur peau lésée.',
    descriptionEn: 'Aluminum salts in antiperspirant deodorants. Suspected link with breast cancer through skin absorption. Avoid prolonged contact with broken skin.',
  },

  // --- Cosmétiques perturbateurs endocriniens ---
  {
    code: 'parabens', name: 'Parabènes (méthyl, éthyl, propyl, butyl)', group: 'group2a', category: 'cosmetic',
    description: 'Conservateurs cosmétiques perturbateurs endocriniens qui miment l\'œstrogène. Liens suspectés avec cancer du sein. Allergènes connus. Éviter contact prolongé.',
    descriptionEn: 'Cosmetic preservatives that act as endocrine disruptors and mimic estrogen. Suspected links with breast cancer. Known allergens. Avoid prolonged contact.',
  },
  {
    code: 'phthalate-dbp', name: 'Phtalate DBP', group: 'group2a', category: 'cosmetic',
    description: 'Plastifiant perturbateur endocrinien, interdit dans jouets et cosmétiques UE. Reprotoxique. Éviter tout contact.',
    descriptionEn: 'Plasticizer and endocrine disruptor, banned in EU toys and cosmetics. Reproductive toxin. Avoid all contact.',
  },
  {
    code: 'phthalate-dehp', name: 'Phtalate DEHP', group: 'group2a', category: 'cosmetic',
    description: 'Plastifiant perturbateur endocrinien, interdit dans jouets et cosmétiques UE. Reprotoxique. Éviter tout contact.',
    descriptionEn: 'Plasticizer and endocrine disruptor, banned in EU toys and cosmetics. Reproductive toxin. Avoid all contact.',
  },
  {
    code: 'cyclosiloxane-d4', name: 'Cyclotétrasiloxane D4', group: 'group2a', category: 'cosmetic',
    description: 'Silicone cyclique perturbateur endocrinien, restreint en cosmétique UE. Bioaccumulation cutanée. Éviter contact prolongé.',
    descriptionEn: 'Cyclic silicone classified as endocrine disruptor, restricted in EU cosmetics. Skin bioaccumulation. Avoid prolonged contact.',
  },
  {
    code: 'cyclosiloxane-d5', name: 'Cyclopentasiloxane D5', group: 'group2a', category: 'cosmetic',
    description: 'Silicone cyclique perturbateur endocrinien, restreint en cosmétique UE. Éviter contact prolongé.',
    descriptionEn: 'Cyclic silicone classified as endocrine disruptor, restricted in EU cosmetics. Avoid prolonged contact.',
  },
  {
    code: 'triclosan', name: 'Triclosan', group: 'group2a', category: 'cosmetic',
    description: 'Antibactérien cosmétique perturbateur endocrinien. Interdit FDA dans les savons antibactériens. Sensibilisant cutané. Éviter tout contact.',
    descriptionEn: 'Cosmetic antibacterial agent and endocrine disruptor. Banned by FDA in antibacterial soaps. Skin sensitizer. Avoid all contact.',
  },
  {
    code: 'oxybenzone', name: 'Oxybenzone (Benzophenone-3)', group: 'group2a', category: 'cosmetic',
    description: 'Filtre solaire perturbateur hormonal. Allergène cutané, interdit dans certaines zones marines. Éviter tout contact.',
    descriptionEn: 'Sunscreen filter and hormone disruptor. Skin allergen, banned in some marine zones. Avoid all contact.',
  },
  {
    code: 'octinoxate', name: 'Octinoxate', group: 'group2a', category: 'cosmetic',
    description: 'Filtre solaire perturbateur hormonal. Allergène cutané. Éviter tout contact.',
    descriptionEn: 'Sunscreen filter and hormone disruptor. Skin allergen. Avoid all contact.',
  },
  {
    code: 'bpa', name: 'BPA (Bisphénol A)', group: 'group2a', category: 'packaging',
    description: 'Présent dans plastiques alimentaires et tickets de caisse. Perturbateur endocrinien lié à cancer du sein et de la prostate. Migration possible vers le contenu. Éviter contact avec contenus chauds ou gras.',
    descriptionEn: 'Found in food plastics and thermal receipts. Endocrine disruptor linked to breast and prostate cancer. Can migrate into contents. Avoid contact with hot or fatty contents.',
  },
  {
    code: 'phenoxyethanol', name: 'Phénoxyéthanol', group: 'group2a', category: 'cosmetic',
    description: 'Conservateur cosmétique. Interdit aux bébés <3 ans en France. Sensibilisant cutané. Éviter contact prolongé.',
    descriptionEn: 'Cosmetic preservative. Banned for babies under 3 in France. Skin sensitizer. Avoid prolonged contact.',
  },
  {
    code: 'phthalates-fragrance', name: 'Phtalates (parfums)', group: 'group2a', category: 'cosmetic',
    description: 'Phtalates présents dans parfums d\'ambiance, bougies et eaux de toilette. Perturbateurs endocriniens par inhalation. Éviter exposition prolongée.',
    descriptionEn: 'Phthalates found in air fresheners, candles and eaux de toilette. Endocrine disruptors via inhalation. Avoid prolonged exposure.',
  },

  // --- Huiles minérales (cosmetic context) ---
  {
    code: 'mineral-oil', name: 'Huile minérale (paraffinum, petrolatum)', group: 'group1', category: 'cosmetic',
    description: 'L\'huile minérale est un dérivé pétrolier classé cancérigène par le CIRC (Centre International de Recherche sur le Cancer). Une consommation régulière augmente le risque de développer un cancer. À éviter absolument.',
    descriptionEn: 'Mineral oil is a petroleum derivative classified as a carcinogen by the IARC (International Agency for Research on Cancer). Regular consumption increases the risk of developing cancer. Avoid completely.',
  },

  // --- Produits ménagers toxiques ---
  {
    code: '2-butoxyethanol', name: '2-Butoxyéthanol', group: 'group2a', category: 'household',
    description: 'Solvant présent dans nettoyants vitres et dégraissants. Toxique pour le foie et les reins par inhalation. Irritant respiratoire. Tenir hors de portée des enfants, ventiler.',
    descriptionEn: 'Solvent in glass cleaners and degreasers. Toxic to liver and kidneys via inhalation. Respiratory irritant. Keep away from children, ventilate.',
  },
  {
    code: 'chlorine-bleach', name: 'Eau de Javel (hypochlorite)', group: 'group2a', category: 'household',
    description: 'Hypochlorite de sodium. Peut produire des dioxines cancérigènes lors de mélanges. Irritant respiratoire et oculaire puissant. Toxique en cas d\'ingestion. Tenir hors de portée des enfants, ne jamais mélanger.',
    descriptionEn: 'Sodium hypochlorite. Can produce carcinogenic dioxins when mixed. Strong respiratory and eye irritant. Toxic if ingested. Keep away from children, never mix with other cleaners.',
  },
  {
    code: 'perchloroethylene', name: 'Perchloréthylène', group: 'group2a', category: 'household',
    description: 'Solvant de nettoyage à sec. Cancérigène probable (CIRC Groupe 2A) par inhalation et contact cutané. Aérer les vêtements traités avant port.',
    descriptionEn: 'Dry-cleaning solvent. Probable carcinogen (IARC Group 2A) via inhalation and skin contact. Air out treated garments before wearing.',
  },
  {
    code: 'mit-cmit', name: 'Isothiazolinones (MIT, CMIT)', group: 'group2a', category: 'household',
    description: 'Conservateurs ménagers. Allergènes puissants, sensibilisants cutanés sévères pouvant provoquer eczémas. Éviter contact prolongé.',
    descriptionEn: 'Household preservatives. Strong allergens and severe skin sensitizers that can cause eczema. Avoid prolonged contact.',
  },
  {
    code: 'apeo', name: 'Alkylphénols éthoxylés (APEO)', group: 'group2a', category: 'household',
    description: 'Détergents perturbateurs endocriniens. Toxiques pour la vie aquatique. Éviter contact prolongé.',
    descriptionEn: 'Detergents that act as endocrine disruptors. Toxic to aquatic life. Avoid prolonged contact.',
  },
  {
    code: 'dmf', name: 'Diméthylformamide (DMF)', group: 'group2a', category: 'textile',
    description: 'Solvant utilisé pour textiles synthétiques et cuir. Toxique pour le foie par contact cutané et inhalation. Éviter contact prolongé.',
    descriptionEn: 'Solvent used for synthetic textiles and leather. Toxic to the liver via skin contact and inhalation. Avoid prolonged contact.',
  },
  {
    code: 'npe', name: 'Nonylphénols éthoxylés (NPE)', group: 'group2a', category: 'household',
    description: 'Détergent industriel perturbateur endocrinien puissant. Toxique aquatique persistant. Éviter tout contact.',
    descriptionEn: 'Industrial detergent and strong endocrine disruptor. Persistent aquatic toxin. Avoid all contact.',
  },
  {
    code: '1-4-dioxane', name: '1,4-Dioxane', group: 'group2a', category: 'cosmetic',
    description: 'Contaminant cancérigène probable présent dans certains shampoings et tensioactifs. Toxique par absorption cutanée. Éviter tout contact.',
    descriptionEn: 'Probable carcinogen contaminant found in some shampoos and surfactants. Toxic via skin absorption. Avoid all contact.',
  },
  {
    code: 'dea', name: 'DEA (Diéthanolamine)', group: 'group2a', category: 'cosmetic',
    description: 'Tensioactif cosmétique. Peut former des nitrosamines cancérigènes au contact d\'autres ingrédients. Allergène cutané. Éviter tout contact.',
    descriptionEn: 'Cosmetic surfactant. Can form carcinogenic nitrosamines when combined with other ingredients. Skin allergen. Avoid all contact.',
  },


  // ═══════════════════════════════════════════════════════════════
  // 🟡 GROUPE 2B — POSSIBLEMENT CANCÉROGÈNES / MODÉRATION
  // (la plupart des additifs courants tombent ici — pas alarmant)
  // ═══════════════════════════════════════════════════════════════

  // --- Édulcorants Groupe 2B (food) ---
  { code: 'en:e954', name: 'Saccharine', group: 'group2a', category: 'food', description: 'Édulcorant synthétique classé Groupe 2B IARC (possiblement cancérogène) puis déclassé en 1999, mais reste controversé. Perturbe le microbiome intestinal et favorise l\'intolérance au glucose. À éviter.' },
  { code: 'en:e955', name: 'Sucralose', group: 'group2a', category: 'food', description: 'Édulcorant synthétique chloré (dérivé chimique du sucre). Perturbe le microbiome intestinal et libère des composés génotoxiques à la cuisson selon des études récentes. À éviter.' },
  { code: 'en:e952', name: 'Cyclamate', group: 'group2a', category: 'food', description: 'Édulcorant synthétique interdit aux USA depuis 1969 pour suspicion de cancer de la vessie en études animales. Classé Groupe 2B IARC (possiblement cancérogène). À éviter.' },

  // --- Colorants Groupe 2B (food) ---
  { code: 'en:e127', name: 'Érythrosine / Red 3', group: 'group2b', category: 'food', description: 'Interdit dans les produits topiques aux USA depuis 1990. Études animales montrent tumeurs thyroïdiennes.' },
  { code: 'en:e133', name: 'Bleu brillant / Blue 1', group: 'group2b', category: 'food', description: 'Colorant artificiel. Allergies possibles. À limiter.' },
  { code: 'en:e132', name: 'Indigotine / Blue 2', group: 'group2b', category: 'food', description: 'Colorant artificiel. Allergies possibles.' },
  { code: 'en:e143', name: 'Vert solide FCF / Green 3', group: 'group2a', category: 'food', description: 'Colorant synthétique pétrolier interdit dans toute l\'Union européenne pour preuves de cancérogénicité en études animales. Classé Groupe 2B IARC. À éviter absolument.' },
  { code: 'en:e171', name: 'Dioxyde de titane', group: 'group2b', category: 'food', description: 'Interdit comme additif alimentaire en UE depuis 2022. Nanoparticules suspectes (Groupe 2B CIRC).' },
  { code: 'en:e160b', name: 'Annatto / Rocou', group: 'group2a', category: 'food', description: 'Colorant semi-synthétique jaune/orange (E160b) lié à des réactions allergiques, à l\'hyperactivité chez l\'enfant et à des perturbations hormonales.' },
  { code: 'en:e120', name: 'Cochenille / Carmin', group: 'group2b', category: 'food', description: 'Colorant rouge naturel mais allergène fort, chocs anaphylactiques possibles.' },
  {
    code: 'carbon-black', name: 'Noir de carbone', group: 'group2b', category: 'cosmetic',
    description: 'Pigment cosmétique (eye-liner, mascara). Nanoparticules controversées (CIRC Groupe 2B). Allergène cutané possible. Éviter contact prolongé avec les muqueuses.',
    descriptionEn: 'Cosmetic pigment (eye-liner, mascara). Controversial nanoparticles (IARC Group 2B). Possible skin allergen. Avoid prolonged contact with mucous membranes.',
  },

  // --- Caramels colorants ---
  { code: 'en:e150c', name: 'Caramel ammoniaqué (III)', group: 'group2a', category: 'food', description: 'Colorant caramel ultra-transformé produit avec ammoniaque. Contient du 4-MEI classé Groupe 2B CIRC (possiblement cancérogène). À éviter.' },
  { code: 'en:e150b', name: 'Caramel de sulfite caustique', group: 'group2a', category: 'food', description: 'Colorant caramel ultra-transformé produit avec sulfites. Sous-produits controversés. À éviter.' },
  { code: 'caramel-colour', name: 'Colorant caramel', group: 'group2a', category: 'food', description: 'Colorant caramel industriel. Sans précision (b/c/d), il est généralement obtenu par procédés chimiques (ammoniaque/sulfites) générant du 4-MEI possiblement cancérogène (Groupe 2B CIRC). À éviter.' },

  // --- Conservateurs courants ---
  { code: 'en:e211', name: 'Benzoate de sodium', group: 'group2b', category: 'food', description: 'Conservateur courant. Peut former du benzène cancérogène avec vitamine C dans certaines boissons.' },
  { code: 'en:e212', name: 'Benzoate de potassium', group: 'group2b', category: 'food', description: 'Conservateur industriel synthétique. Peut former du benzène cancérigène (Groupe 1 CIRC) au contact de l\'acide ascorbique (vitamine C) — fréquent dans les sodas. Lié à hyperactivité chez l\'enfant.' },
  { code: 'en:e210', name: 'Acide benzoïque', group: 'group2b', category: 'food', description: 'Conservateur, peut former du benzène avec vitamine C.' },
  { code: 'en:e321', name: 'BHT (Butylhydroxytoluène)', group: 'group2b', category: 'food', description: 'Antioxydant synthétique controversé pouvant provoquer des effets hépatiques et thyroïdiens à fortes doses (études animales). Classé Groupe 3 IARC (preuves insuffisantes), mais soupçonné perturbateur endocrinien. À éviter chez les enfants.' },

  // --- Sulfites (modération) ---
  { code: 'en:e220', name: 'Dioxyde de soufre', group: 'group2b', category: 'food', description: 'Sulfite. Provoque crises d\'asthme et réactions allergiques sévères.' },
  { code: 'en:e221', name: 'Sulfite de sodium', group: 'group2b', category: 'food', description: 'Sulfite. Allergène, déclenche crises d\'asthme.' },
  { code: 'en:e222', name: 'Bisulfite de sodium', group: 'group2b', category: 'food', description: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { code: 'en:e223', name: 'Métabisulfite de sodium', group: 'group2b', category: 'food', description: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { code: 'en:e224', name: 'Métabisulfite de potassium', group: 'group2b', category: 'food', description: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { code: 'en:e225', name: 'Sulfite de potassium', group: 'group2b', category: 'food', description: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { code: 'en:e226', name: 'Sulfite de calcium', group: 'group2b', category: 'food', description: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { code: 'en:e227', name: 'Bisulfite de calcium', group: 'group2b', category: 'food', description: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { code: 'en:e228', name: 'Bisulfite de potassium', group: 'group2b', category: 'food', description: 'Sulfite. Réactions allergiques et asthme possibles.' },

  // --- Exhausteurs (amplificateurs MSG) ---
  { code: 'en:e631', name: 'Inosinate disodique', group: 'group2b', category: 'food', description: 'Amplifie l\'effet du MSG. Marqueur d\'ultra-transformé.' },
  { code: 'en:e627', name: 'Guanylate disodique', group: 'group2b', category: 'food', description: 'Amplifie l\'effet du MSG. Marqueur d\'ultra-transformé.' },
  { code: 'en:e635', name: '5\'-Ribonucléotide disodique', group: 'group2b', category: 'food', description: 'Exhausteur de goût associant généralement les inosinates et guanylates (E627/E631), souvent utilisé avec le glutamate pour renforcer l\'umami. Autorisé aux doses réglementées, mais il apporte des purines et signale surtout une formulation alimentaire transformée.' },

  // --- Sucres et sirops (MODÉRATION, pas alarmant) ---
  { code: 'maltodextrine', name: 'Maltodextrine', group: 'group2a', category: 'food', description: 'Glucide ultra-transformé issu d\'hydrolyse industrielle de l\'amidon (souvent maïs OGM). Index glycémique très élevé (110, plus que le sucre blanc à 65). Perturbe le microbiome intestinal et favorise l\'inflammation.' },
  { code: 'glucose-syrup', name: 'Sirop de glucose', group: 'group2a', category: 'food', description: 'Sucre raffiné industriel issu d\'hydrolyse enzymatique de l\'amidon. Provoque des pics glycémiques rapides, favorise prise de poids et résistance à l\'insuline. À éviter.' },
  { code: 'hfcs', name: 'Sirop de glucose-fructose / HFCS', group: 'group2a', category: 'food', description: 'Édulcorant industriel ultra-transformé extrait du maïs (souvent OGM). Fortement lié à l\'obésité, au diabète de type 2, à la stéatose hépatique non alcoolique et au syndrome métabolique. À éviter.' },
  { code: 'dextrose', name: 'Dextrose', group: 'group2b', category: 'food', description: 'Glucose isolé extrait industriellement de l\'amidon de maïs (souvent OGM). Provoque des pics glycémiques rapides et favorise la prise de poids et la résistance à l\'insuline.' },
  { code: 'corn-syrup', name: 'Sirop de maïs', group: 'group2a', category: 'food', description: 'Sirop industriel issu de maïs souvent OGM. Lié à obésité, stéatose hépatique et syndrome métabolique.' },
  { code: 'gelatin', name: 'Gélatine', group: 'group2b', category: 'food', description: 'Issue de peaux et os animaux (bovin/porc) traités industriellement à l\'acide ou à la soude. Procédé chimique dénaturant, qualité variable selon les sources.' },
  { code: 'agave-syrup', name: 'Sirop d\'agave', group: 'group2b', category: 'food', description: 'Présenté comme naturel mais ultra-raffiné industriellement. Composé à 70-90% de fructose isolé qui surcharge le foie et favorise la stéatose hépatique non alcoolique. À modérer.' },
  { code: 'rice-syrup', name: 'Sirop de riz', group: 'group2b', category: 'food', description: 'Sirop industriel obtenu par hydrolyse enzymatique du riz. Index glycémique très élevé (98), provoque des pics de glycémie rapides. À modérer.' },
  { code: 'fructose-added', name: 'Fructose ajouté', group: 'group2b', category: 'food', description: 'Fructose isolé extrait industriellement, très différent du fructose des fruits entiers (sans fibres ni nutriments). Métabolisé uniquement par le foie, favorise la stéatose hépatique et le syndrome métabolique en excès.' },
  { code: 'refined-sugar', name: 'Sucre blanc raffiné', group: 'group2b', category: 'food', description: 'Consommer avec modération. Lié à obésité, diabète, inflammation.' },

  // --- Arômes ---
  { code: 'natural-flavor', name: 'Arôme naturel', group: 'group2b', category: 'food', description: 'Composition non divulguée. Souvent extrait avec solvants industriels (hexane, éthanol) malgré la mention « naturel ». Marque généralement un produit transformé.' },
  { code: 'artificial-flavor', name: 'Arôme artificiel', group: 'group2a', category: 'food', description: 'Molécules entièrement synthétiques issues de la pétrochimie pour imiter des goûts naturels. Marqueur indiscutable de produit ultra-transformé (NOVA 4). Composition non divulguée, allergènes possibles cachés.' },

  // --- Huiles raffinées (modération) ---
  { code: 'sunflower-oil', name: 'Huile de tournesol raffinée', group: 'group2b', category: 'food', description: 'Excès oméga-6 pro-inflammatoire. Préférer pressée à froid ou huile d\'olive.' },
  { code: 'canola-oil', name: 'Huile de canola / colza raffinée', group: 'group2b', category: 'food', description: 'Raffinée industriellement. Préférer pressée à froid ou huile d\'olive.' },
  { code: 'soybean-oil', name: 'Huile de soja', group: 'group2b', category: 'food', description: 'Riche en oméga-6 pro-inflammatoire. Souvent OGM.' },
  { code: 'corn-oil', name: 'Huile de maïs', group: 'group2b', category: 'food', description: 'Riche en oméga-6 pro-inflammatoire. Souvent OGM.' },
  { code: 'cottonseed-oil', name: 'Huile de coton', group: 'group2b', category: 'food', description: 'Souvent OGM. Résidus de pesticides possibles.' },
  { code: 'vegetable-oil', name: 'Huile végétale (non spécifiée)', group: 'group2b', category: 'food', description: 'Composition non précisée. Souvent palme ou colza raffinés.' },
  { code: 'grapeseed-oil', name: 'Huile de pépin de raisin', group: 'group2b', category: 'food', description: 'Très riche en oméga-6 pro-inflammatoire.' },

  // --- Protéines industrielles ---
  { code: 'hydrolyzed-protein', name: 'Protéines hydrolysées', group: 'group2b', category: 'food', description: 'Protéine industrielle. Peut contenir glutamate libre caché.' },
  { code: 'protein-isolate', name: 'Isolat de protéines (whey, soja, lait)', group: 'group2b', category: 'food', description: 'Protéines industrielles isolées. Pas les concentrés naturels de fruits/tomate.' },
  { code: 'yeast-extract', name: 'Extrait de levure', group: 'group2b', category: 'food', description: 'Contient du glutamate naturel, équivalent MSG caché.' },
  { code: 'sodium-caseinate', name: 'Caséinate de sodium', group: 'group2b', category: 'food', description: 'Protéine de lait industrielle.' },

  // --- Émulsifiants modérés ---
  { code: 'en:e471', name: 'Mono- et diglycérides E471', group: 'group2b', category: 'food', description: 'Émulsifiant industriel pouvant contenir des traces cachées de gras trans. Marqueur de produit transformé.' },
  { code: 'en:e476', name: 'PGPR (Polyglycerol polyricinoleate)', group: 'group2a', category: 'food', description: 'Émulsifiant industriel obtenu par estérification d\'huile de ricin avec polyglycérol. Utilisé dans le chocolat industriel pour réduire la quantité de beurre de cacao. Marqueur d\'ultra-transformation, peut causer des troubles digestifs.' },
  { code: 'en:e322', name: 'Lécithine de soja', group: 'group2b', category: 'food', description: 'Émulsifiant courant souvent issu de soja OGM, extrait avec solvants comme l\'hexane. Préférer la lécithine de tournesol non OGM.' },
  { code: 'en:e463', name: 'Hydroxypropyl cellulose', group: 'group2b', category: 'food', description: 'Dérivé industriel de la cellulose.' },
  { code: 'en:e464', name: 'Hydroxypropyl méthylcellulose', group: 'group2b', category: 'food', description: 'Dérivé industriel de la cellulose.' },
  { code: 'en:e465', name: 'Méthyl éthyl cellulose', group: 'group2b', category: 'food', description: 'Dérivé industriel de la cellulose.' },

  // --- Phosphates ---
  { code: 'en:e450', name: 'Diphosphates', group: 'group2b', category: 'food', description: 'Phosphate industriel utilisé comme stabilisant. L\'excès de phosphates est lié à la calcification des artères, aux troubles rénaux et à la fragilité osseuse. À modérer.' },
  { code: 'en:e451', name: 'Triphosphates', group: 'group2b', category: 'food', description: 'Phosphate industriel utilisé comme stabilisant. L\'excès est lié à la calcification artérielle, aux troubles rénaux et à la fragilité osseuse. À modérer.' },
  { code: 'en:e452', name: 'Polyphosphates', group: 'group2b', category: 'food', description: 'Phosphate industriel utilisé comme rétenteur d\'eau dans la charcuterie. L\'excès est lié à la calcification artérielle et aux troubles rénaux. À modérer.' },
  { code: 'en:e339', name: 'Phosphate de sodium', group: 'group2b', category: 'food', description: 'Sel phosphaté industriel. L\'excès de phosphates est lié à la calcification artérielle et aux troubles rénaux. À modérer.' },
  { code: 'en:e340', name: 'Phosphate de potassium', group: 'group2b', category: 'food', description: 'Sel phosphaté industriel. L\'excès est lié à la calcification artérielle et aux troubles rénaux. À modérer.' },
  { code: 'en:e341', name: 'Phosphate de calcium', group: 'group2b', category: 'food', description: 'Sel phosphaté industriel. L\'excès est lié à la calcification artérielle et aux troubles rénaux. À modérer.' },

  // --- Gommes (généralement OK mais modération) ---
  { code: 'en:e415', name: 'Gomme xanthane', group: 'group2b', category: 'food', description: 'Épaississant industriel produit par fermentation bactérienne. Peut perturber la digestion (ballonnements, gaz) chez les personnes sensibles. Marqueur de produit transformé.' },
  { code: 'en:e412', name: 'Gomme de guar', group: 'group2b', category: 'food', description: 'Gélifiant industriel pouvant causer ballonnements, gaz et inconforts digestifs en excès. Marqueur de produit transformé.' },
  { code: 'en:e417', name: 'Gomme tara', group: 'group2b', category: 'food', description: 'Épaississant industriel peu étudié à long terme. Peut causer troubles digestifs. Présence dans un produit indique une transformation industrielle.' },
  { code: 'en:e418', name: 'Gomme gellane', group: 'group2b', category: 'food', description: 'Gélifiant industriel produit par fermentation bactérienne en bioréacteur. Effets digestifs à haute dose. Marqueur de produit ultra-transformé.' },
  { code: 'en:e425', name: 'Gomme konjac', group: 'group2b', category: 'food', description: 'Risque de blocage intestinal et étouffement chez les enfants.' },
  { code: 'en:e416', name: 'Gomme karaya', group: 'group2b', category: 'food', description: 'Allergène pouvant provoquer des réactions.' },

  // --- Acides industriels ---
  { code: 'citric-acid-industrial', name: 'Acide citrique industriel', group: 'group2b', category: 'food', description: 'Très courant. Produit par fermentation Aspergillus. Sûr pour la plupart, irritant possible chez sensibles.' },

  // --- Cosmétiques modérés ---
  {
    code: 'fragrance', name: 'Fragrance / Parfum', group: 'group2b', category: 'cosmetic',
    description: 'Composition non divulguée pouvant contenir des dizaines de molécules cachées. Allergènes fréquents, sensibilisants cutanés. Éviter contact prolongé en cas de peau sensible.',
    descriptionEn: 'Undisclosed composition that may contain dozens of hidden molecules. Frequent allergens and skin sensitizers. Avoid prolonged contact on sensitive skin.',
  },
  {
    code: 'sls', name: 'SLS (Sodium Lauryl Sulfate)', group: 'group2b', category: 'cosmetic',
    description: 'Tensioactif cosmétique irritant. Peut causer ulcères buccaux et dessèchement cutané. Préférer formules sans sulfates. Éviter contact prolongé.',
    descriptionEn: 'Irritating cosmetic surfactant. Can cause mouth ulcers and skin dryness. Prefer sulfate-free formulas. Avoid prolonged contact.',
  },
  {
    code: 'sles', name: 'SLES (Sodium Laureth Sulfate)', group: 'group2b', category: 'cosmetic',
    description: 'Tensioactif cosmétique. Contamination possible au 1,4-dioxane cancérigène. Irritant cutané et oculaire. Éviter contact prolongé.',
    descriptionEn: 'Cosmetic surfactant. Possible contamination with carcinogenic 1,4-dioxane. Skin and eye irritant. Avoid prolonged contact.',
  },
  {
    code: 'propylene-glycol', name: 'Propylène glycol', group: 'group2b', category: 'cosmetic',
    description: 'Solvant cosmétique. Allergène cutané possible, contamination possible. Éviter contact prolongé.',
    descriptionEn: 'Cosmetic solvent. Possible skin allergen, possible contamination. Avoid prolonged contact.',
  },
  {
    code: 'ppd', name: 'PPD (P-Phénylènediamine)', group: 'group2b', category: 'cosmetic',
    description: 'Teinture capillaire. Allergène sévère pouvant provoquer chocs anaphylactiques. Suspect cancer vessie. Éviter tout contact direct avec le cuir chevelu.',
    descriptionEn: 'Hair dye. Severe allergen that can trigger anaphylactic reactions. Suspected bladder cancer link. Avoid direct contact with scalp.',
  },
  {
    code: 'resorcinol', name: 'Résorcinol', group: 'group2b', category: 'cosmetic',
    description: 'Composant de teintures capillaires. Perturbateur endocrinien et allergène cutané. Éviter contact prolongé.',
    descriptionEn: 'Hair dye component. Endocrine disruptor and skin allergen. Avoid prolonged contact.',
  },
  {
    code: 'toluene', name: 'Toluène', group: 'group2b', category: 'cosmetic',
    description: 'Solvant utilisé dans vernis à ongles. Neurotoxique par inhalation, cancérigène possible. Bien ventiler lors de l\'application, éviter inhalation prolongée.',
    descriptionEn: 'Solvent used in nail polish. Neurotoxic via inhalation, possible carcinogen. Ventilate well during use, avoid prolonged inhalation.',
  },
  {
    code: 'acetaldehyde', name: 'Acétaldéhyde', group: 'group2a', category: 'cosmetic',
    description: 'Présent dans lissages brésiliens. Cancérigène possible (CIRC Groupe 2B) par inhalation. Irritant respiratoire. Éviter exposition prolongée.',
    descriptionEn: 'Found in Brazilian hair-straightening treatments. Possible carcinogen (IARC Group 2B) via inhalation. Respiratory irritant. Avoid prolonged exposure.',
  },
  {
    code: 'microplastics', name: 'Microplastiques / Microbilles', group: 'group2b', category: 'cosmetic',
    description: 'Microbilles plastiques dans gommages et dentifrices. Polluants persistants qui s\'accumulent dans l\'organisme. Préférer produits sans microplastiques.',
    descriptionEn: 'Plastic microbeads in scrubs and toothpastes. Persistent pollutants that accumulate in the body. Choose microplastic-free products.',
  },
  {
    code: 'mica-contaminated', name: 'Mica contaminé', group: 'group2b', category: 'cosmetic',
    description: 'Mica cosmétique pouvant contenir des traces d\'amiante (cancérigène CIRC Groupe 1). Risque par inhalation lors d\'application en poudre. Éviter poudres non certifiées.',
    descriptionEn: 'Cosmetic mica that may contain traces of asbestos (IARC Group 1 carcinogen). Risk via inhalation when applied as powder. Avoid uncertified powders.',
  },
  {
    code: 'phthalate-dep', name: 'Phtalate DEP', group: 'group2b', category: 'cosmetic',
    description: 'Phtalate plastifiant moins toxique que DBP/DEHP mais perturbateur endocrinien. Éviter contact prolongé.',
    descriptionEn: 'Phthalate plasticizer, less toxic than DBP/DEHP but still an endocrine disruptor. Avoid prolonged contact.',
  },

  // --- Glycérol ---
  { code: 'en:e422', name: 'Glycérol / Glycérine', group: 'group2b', category: 'food', description: 'Sûr en petite quantité. Le glycérol industriel peut contenir des contaminants (3-MCPD, esters glycidiques).' },

  // --- Produits ménagers modérés ---
  {
    code: 'ammonia', name: 'Ammoniac', group: 'group2b', category: 'household',
    description: 'Présent dans nettoyants. Irritant respiratoire et oculaire puissant par inhalation. Ne jamais mélanger avec eau de Javel. Tenir hors de portée des enfants, ventiler.',
    descriptionEn: 'Found in cleaners. Strong respiratory and eye irritant via inhalation. Never mix with bleach. Keep away from children, ventilate.',
  },
  {
    code: 'phosphates-detergent', name: 'Phosphates (détergents)', group: 'group2b', category: 'household',
    description: 'Polluants environnementaux persistants. Toxiques pour la vie aquatique. Préférer détergents sans phosphates.',
    descriptionEn: 'Persistent environmental pollutants. Toxic to aquatic life. Prefer phosphate-free detergents.',
  },

  // --- Ustensiles ---
  {
    code: 'pfoa-ptfe', name: 'PFOA / PTFE (Teflon)', group: 'group2b', category: 'kitchen',
    description: 'Revêtement antiadhésif de poêles. Libère des gaz toxiques quand chauffé à haute température (>260°C). Tenir hors de portée des enfants, ne jamais préchauffer à vide.',
    descriptionEn: 'Non-stick pan coating. Releases toxic fumes when heated above 260°C (500°F). Keep away from children, never preheat empty.',
  },
  {
    code: 'aluminum-cookware', name: 'Aluminium (casseroles, papier)', group: 'group2b', category: 'kitchen',
    description: 'Casseroles et papier aluminium. Migration accrue avec aliments acides. Lien suspecté avec maladie d\'Alzheimer. Éviter contact prolongé avec aliments acides ou très chauds.',
    descriptionEn: 'Aluminum pans and foil. Increased migration with acidic foods. Suspected link with Alzheimer\'s disease. Avoid prolonged contact with acidic or very hot foods.',
  },
  {
    code: 'polycarbonate-7', name: 'Polycarbonate (plastique #7)', group: 'group2b', category: 'packaging',
    description: 'Contient du BPA, perturbateur endocrinien. Migration possible vers le contenu, surtout chauffé. Ne pas chauffer, ne pas utiliser pour contenus chauds.',
    descriptionEn: 'Contains BPA, an endocrine disruptor. Can migrate into contents, especially when heated. Do not heat, do not use for hot contents.',
  },
  {
    code: 'pvc-3', name: 'PVC (plastique #3)', group: 'group2b', category: 'packaging',
    description: 'Contient des phtalates plastifiants. Ne jamais chauffer. Tenir hors de portée des enfants pour usage avec contenus chauds.',
    descriptionEn: 'Contains phthalate plasticizers. Never heat. Keep away from children when used with hot contents.',
  },
  {
    code: 'polystyrene-6', name: 'Polystyrène (plastique #6)', group: 'group2b', category: 'packaging',
    description: 'Peut libérer du styrène, cancérigène possible. Éviter avec contenus chauds ou gras. Ne pas chauffer.',
    descriptionEn: 'Can release styrene, a possible carcinogen. Avoid with hot or fatty contents. Do not heat.',
  },
  {
    code: 'melamine-cookware', name: 'Mélamine (vaisselle)', group: 'group2b', category: 'kitchen',
    description: 'Vaisselle en mélamine. Peut libérer du formaldéhyde quand chauffée. Ne jamais utiliser au micro-ondes ni avec liquides très chauds. Tenir hors de portée des enfants pour usage en chaleur.',
    descriptionEn: 'Melamine dishware. Can release formaldehyde when heated. Never use in microwave or with very hot liquids. Keep away from children for hot uses.',
  },
  {
    code: 'antimony', name: 'Antimoine', group: 'group2b', category: 'textile',
    description: 'Catalyseur résiduel présent dans le polyester. Potentiellement cancérigène par contact cutané prolongé. Laver les vêtements neufs avant port.',
    descriptionEn: 'Residual catalyst found in polyester. Potential carcinogen via prolonged skin contact. Wash new garments before wearing.',
  },


  // ═══════════════════════════════════════════════════════════════
  // 🟢 SÛRS — ADDITIFS NATURELS OU NEUTRES (FOOD)
  // ═══════════════════════════════════════════════════════════════

  { code: 'en:e150a', name: 'Caramel ordinaire (E150a)', group: 'none', category: 'food', description: 'Caramel simple, généralement considéré sûr.' },
  { code: 'en:e300', name: 'Acide ascorbique / Vitamine C', group: 'none', category: 'food', description: 'Vitamine C, antioxydant naturel sûr.' },
  { code: 'en:e306', name: 'Vitamine E naturelle (tocophérol)', group: 'none', category: 'food', description: 'Antioxydant naturel sûr.' },
  { code: 'en:e330', name: 'Acide citrique', group: 'none', category: 'food', description: 'Acide naturel, sûr pour la plupart. Très courant.' },
  { code: 'en:e331', name: 'Citrate de sodium', group: 'group2a', category: 'food', description: 'Sel synthétisé industriellement, aucune forme naturelle. Marqueur d\'ultra-transformation.' },
  { code: 'en:e332', name: 'Citrate de potassium', group: 'group2b', category: 'food', description: 'Sel synthétisé industriellement (acide citrique + hydroxyde de potassium). Aucune forme naturelle. Marqueur d\'ultra-transformation. Effet laxatif en excès.' },
  { code: 'en:e270', name: 'Acide lactique', group: 'group2b', category: 'food', description: 'Souvent produit par fermentation industrielle ou synthèse chimique, non issu naturellement du lait.' },
  { code: 'en:e296', name: 'Acide malique', group: 'group2b', category: 'food', description: 'Industriellement synthétisé pour usage alimentaire, rarement extrait des fruits.' },
  { code: 'en:e334', name: 'Acide tartrique', group: 'none', category: 'food', description: 'Acide naturel du raisin, sûr.' },
  { code: 'en:e440', name: 'Pectine', group: 'none', category: 'food', description: 'Fibre naturelle extraite de fruits, sûre.' },
  { code: 'en:e406', name: 'Agar-agar', group: 'none', category: 'food', description: 'Gélifiant naturel à base d\'algues, sûr.' },
  { code: 'en:e414', name: 'Gomme arabique / Acacia', group: 'none', category: 'food', description: 'Fibre naturelle, généralement bien tolérée.' },
  { code: 'en:e410', name: 'Gomme de caroube', group: 'none', category: 'food', description: 'Épaississant naturel à base de caroube, sûr.' },
  { code: 'en:e163', name: 'Anthocyanes', group: 'none', category: 'food', description: 'Colorant naturel antioxydant, bénéfique.' },
  { code: 'en:e170', name: 'Carbonate de calcium', group: 'group2a', category: 'food', description: 'Extraction et raffinage industriels lourds (mines). Procédé minier intensif.' },
  { code: 'en:e500', name: 'Carbonate de sodium', group: 'none', category: 'food', description: 'Famille de régulateurs d\'acidité et d\'agents levants comprenant le carbonate et le bicarbonate de sodium (E500). Ils sont autorisés aux doses alimentaires usuelles ; leur principal effet nutritionnel est une contribution supplémentaire en sodium.' },
  { code: 'en:e504', name: 'Carbonate de magnésium', group: 'none', category: 'food', description: 'Sel minéral naturel, sûr.' },
  { code: 'en:e508', name: 'Chlorure de potassium', group: 'group2b', category: 'food', description: 'Minéral mais utilisé comme substitut de sel industriel. À modérer chez les personnes avec insuffisance rénale.' },
  { code: 'en:e322-sunflower', name: 'Lécithine de tournesol', group: 'none', category: 'food', description: 'Émulsifiant naturel sans OGM, sûr.' },
  { code: 'en:e960', name: 'Stévia / Steviol glycosides', group: 'group2b', category: 'food', description: 'Édulcorant d\'origine naturelle extrait des feuilles de Stevia rebaudiana, purifié industriellement. Zéro calorie, sans danger connu aux doses usuelles (DJA EFSA : 4 mg/kg/jour). Signale un produit transformé, sans plus.' },
  { code: 'erythritol', name: 'Érythritol', group: 'none', category: 'food', description: 'Édulcorant naturel fermenté, considéré sûr par EFSA et FDA.' },
  { code: 'monk-fruit', name: 'Fruit du moine / Monk fruit', group: 'none', category: 'food', description: 'Édulcorant naturel, sûr.' },
  { code: 'allulose', name: 'Allulose', group: 'none', category: 'food', description: 'Sucre rare naturel, faible impact glycémique.' },
  { code: 'xylitol', name: 'Xylitol', group: 'none', category: 'food', description: 'Édulcorant naturel sûr pour humains (TOXIQUE pour chiens).' },
  { code: 'en:e392', name: 'Extrait de romarin', group: 'none', category: 'food', description: 'Antioxydant naturel, sûr.' },
];

/**
 * Normalize a name for fuzzy matching (lowercase, strip accents, parentheses,
 * non-alphanumeric chars).
 */
function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Find an additive entry by ingredient name. If a category is given, prefer
 * entries matching that category before falling back to any match.
 */
export function findAdditiveByName(
  name: string,
  category?: AdditiveCategory,
): AdditiveInfo | undefined {
  const target = normalizeName(name);
  if (target.length === 0) return undefined;

  const candidates: AdditiveInfo[] = [];
  for (const a of ADDITIVES_DATABASE) {
    const additiveName = normalizeName(a.name);
    if (additiveName.length === 0) continue;
    if (additiveName === target) {
      candidates.push(a);
      continue;
    }
    // Token-based partial match: every token of the shorter name appears in the other.
    const aTokens = additiveName.split(' ').filter(t => t.length >= 3);
    const tTokens = target.split(' ').filter(t => t.length >= 3);
    if (aTokens.length === 0 || tTokens.length === 0) continue;
    const [shorter, longer] = aTokens.length <= tTokens.length
      ? [aTokens, target]
      : [tTokens, additiveName];
    if (shorter.every(tok => longer.includes(tok))) {
      candidates.push(a);
    }
  }

  if (candidates.length === 0) return undefined;
  if (category) {
    const sameCat = candidates.find(c => c.category === category);
    if (sameCat) return sameCat;
  }
  return candidates[0];
}

/**
 * Returns the description in the active language, falling back to FR if no EN.
 * An OFFICIAL (validated) description always wins over the legacy texts below —
 * English reference, auto-translated for FR/KO display when the cache has it.
 */
export function getAdditiveDescription(a: AdditiveInfo): string {
  const officialEn = getOfficialEn(a.name, a.code);
  if (officialEn) return localizeOfficialText(officialEn);
  const lang = getDeviceLanguage();
  if (lang === 'ko' && a.descriptionKo && a.descriptionKo.trim().length > 0) {
    return a.descriptionKo;
  }
  if ((lang === 'en' || lang === 'ko') && a.descriptionEn && a.descriptionEn.trim().length > 0) {
    return a.descriptionEn;
  }
  return a.description;
}

/**
 * Maps a ScannedProduct.productCategory to the AdditiveCategory used for badges.
 */
export function productCategoryToAdditiveCategory(cat?: ProductCategory): AdditiveCategory {
  switch (cat) {
    case 'cosmetic':       return 'cosmetic';
    case 'household':      return 'household';
    case 'kitchen_utensil':return 'kitchen';
    case 'clothing':       return 'textile';
    case 'food':
    case 'beverage':
    default:               return 'food';
  }
}

/**
 * Returns a category-appropriate badge for the given risk group.
 * Food keeps the existing labels. Non-food categories use language suited to their context.
 */
export function getRiskBadgeInfo(
  group: RiskGroup,
  category: AdditiveCategory = 'food',
): { label: string; sublabel: string; color: string } {
  // Food — preserve existing labels (handled via i18n)
  if (category === 'food') {
    switch (group) {
      case 'group1':
        return { label: t('risk_danger_label'), sublabel: t('risk_danger_sub_g1'), color: '#D0260F' };
      case 'group2a':
        return { label: pick({ fr: 'NOCIF', en: 'HARMFUL', ko: '유해' }), sublabel: t('risk_warning_sub'), color: '#E8730A' };
      case 'group2b':
        return { label: pick({ fr: 'À ÉVITER', en: 'AVOID', ko: '피하세요' }), sublabel: t('risk_caution_sub'), color: '#EAB308' };
      case 'none':
      default:
        return { label: t('risk_approved_label'), sublabel: t('risk_approved_sub'), color: '#2E9E34' };
    }
  }

  // Cosmetic — uses the separate TOXIC / DISPUTED / APPROVED scale.
  if (category === 'cosmetic') {
    switch (group) {
      case 'group1':
      case 'group2a':
        return {
          label: pick({ fr: 'TOXIQUE', en: 'TOXIC', ko: '독성' }),
          sublabel: pick({ fr: 'Ingrédient reconnu dangereux — à éviter', en: 'Recognized hazardous ingredient — avoid this product', ko: '유해 성분으로 확인됨 — 이 제품을 피하세요' }),
          color: '#7C3AED',
        };
      case 'group2b':
        return {
          label: pick({ fr: 'CONTESTÉ', en: 'DISPUTED', ko: '논란 있음' }),
          sublabel: pick({ fr: 'Controversé — science partagée, à utiliser avec prudence', en: 'Controversial — divided science, use with caution', ko: '논란 — 과학적 의견이 갈림, 주의해서 사용' }),
          color: '#EAB308',
        };
      case 'none':
      default:
        return {
          label: pick({ fr: 'APPROUVÉ', en: 'APPROVED', ko: '승인됨' }),
          sublabel: pick({ fr: 'Sans risque connu — clean pour ta peau', en: 'No known risk — clean for your skin', ko: '알려진 위험 없음 — 피부에 안전' }),
          color: '#2E9E34',
        };
    }
  }

  // Household / Kitchen / Textile / Packaging — shared labels
  switch (group) {
    case 'group1':
      return {
        label: pick({ fr: 'CANCÉRIGÈNE', en: 'CARCINOGENIC', ko: '발암성' }),
        sublabel: pick({ fr: 'Classé cancérigène par le CIRC — éviter tout contact', en: 'Classified carcinogenic by IARC — avoid all contact', ko: 'IARC가 발암물질로 분류 — 모든 접촉을 피하세요' }),
        color: '#D0260F',
      };
    case 'group2a':
      return {
        label: pick({ fr: 'DANGEREUX', en: 'HAZARDOUS', ko: '위험' }),
        sublabel: pick({ fr: 'Toxique en cas d\'ingestion ou d\'inhalation', en: 'Toxic if ingested or inhaled', ko: '섭취하거나 흡입하면 독성' }),
        color: '#E8730A',
      };
    case 'group2b':
      return {
        label: pick({ fr: 'PRÉCAUTION', en: 'CAUTION', ko: '주의' }),
        sublabel: pick({ fr: 'Tenir hors de portée des enfants, éviter contact prolongé', en: 'Keep away from children, avoid prolonged contact', ko: '어린이 손이 닿지 않는 곳에 보관, 장시간 접촉을 피하세요' }),
        color: '#EAB308',
      };
    case 'none':
    default:
      return {
        label: pick({ fr: 'SÉCURITAIRE', en: 'SAFE', ko: '안전' }),
        sublabel: pick({ fr: 'Sûr à l\'usage', en: 'Safe for use', ko: '사용해도 안전' }),
        color: '#2E9E34',
      };
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
