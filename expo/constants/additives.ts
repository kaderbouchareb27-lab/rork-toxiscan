import { AdditiveInfo, RiskGroup } from '@/types';
import { t } from '@/utils/i18n';

export const ADDITIVES_DATABASE: AdditiveInfo[] = [
  // ═══════════════════════════════════════════════════════════════
  // 🔴 GROUPE 1 — CANCÉROGÈNES AVÉRÉS (IARC officiel ou interdit santé)
  // ═══════════════════════════════════════════════════════════════

  // --- Nitrites & Nitrates ---
  { code: 'en:e249', name: 'Nitrite de potassium', group: 'group1', description: 'Conservateur de charcuterie. Forme des nitrosamines cancérogènes lors de la cuisson. Classé cancérogène avéré par le CIRC (Groupe 1) via la viande transformée.' },
  { code: 'en:e250', name: 'Nitrite de sodium', group: 'group1', description: 'Conservateur utilisé dans les charcuteries (jambon, bacon, saucisson). Forme des nitrosamines cancérogènes (Groupe 1 CIRC) lors de la cuisson. À éviter le plus possible.' },
  { code: 'en:e251', name: 'Nitrate de sodium', group: 'group1', description: 'Conservateur qui se transforme en nitrites puis en nitrosamines dans l\'organisme. Lié au cancer colorectal et de l\'estomac.' },
  { code: 'en:e252', name: 'Nitrate de potassium', group: 'group1', description: 'Conservateur de charcuterie. Se transforme en nitrosamines cancérogènes (Groupe 1 CIRC).' },

  // --- Formaldéhyde et libérateurs ---
  { code: 'en:e240', name: 'Formaldéhyde', group: 'group1', description: 'Cancérogène avéré (Groupe 1 CIRC). Lié au cancer du nasopharynx et à la leucémie. Interdit en cosmétique UE.' },
  { code: 'dmdm-hydantoin', name: 'DMDM Hydantoïne', group: 'group1', description: 'Conservateur qui libère du formaldéhyde cancérogène. Présent dans les lingettes bébé, crèmes, shampoings.' },
  { code: 'quaternium-15', name: 'Quaternium-15', group: 'group1', description: 'Conservateur qui libère du formaldéhyde cancérogène. À éviter en cosmétique.' },
  { code: 'bronopol', name: 'Bronopol', group: 'group1', description: 'Conservateur qui libère du formaldéhyde. Peut former des nitrosamines.' },
  { code: 'diazolidinyl-urea', name: 'Diazolidinyl Urea', group: 'group1', description: 'Libérateur de formaldéhyde. Allergène sensibilisant.' },
  { code: 'imidazolidinyl-urea', name: 'Imidazolidinyl Urea', group: 'group1', description: 'Libérateur de formaldéhyde. Conservateur cosmétique à éviter.' },

  // --- Métaux lourds et toxines ---
  { code: 'aflatoxine', name: 'Aflatoxines', group: 'group1', description: 'Mycotoxines cancérogènes avérées (Groupe 1 CIRC). Cancer du foie. Contamination possible des arachides, maïs.' },
  { code: 'benzene', name: 'Benzène', group: 'group1', description: 'Solvant cancérogène avéré (leucémie). Peut se former dans les sodas combinant vitamine C + benzoate de sodium.' },
  { code: 'mercury-thimerosal', name: 'Mercure / Thimérosal', group: 'group1', description: 'Métal lourd cancérogène et neurotoxique. Interdit en cosmétique UE.' },
  { code: 'cadmium', name: 'Cadmium', group: 'group1', description: 'Métal lourd cancérogène avéré (Groupe 1 CIRC). Cancer du poumon, rein, prostate.' },
  { code: 'arsenic', name: 'Arsenic', group: 'group1', description: 'Métal lourd cancérogène avéré. Cancer de la peau, poumon, vessie.' },
  { code: 'lead-acetate', name: 'Plomb (acétate de plomb)', group: 'group1', description: 'Cancérogène avéré, neurotoxique. Interdit dans les cosmétiques UE.' },

  // --- PFAS / Polluants éternels ---
  { code: 'pfas', name: 'PFAS / Polluants éternels', group: 'group1', description: 'PFOA classé Groupe 1 CIRC depuis 2023. Cancérogène, perturbateur endocrinien, affaiblit le système immunitaire. Présent dans emballages alimentaires antigraisse.' },
  { code: 'pfas-textile', name: 'PFAS / PFC dans textiles', group: 'group1', description: 'Présents dans les vêtements imperméables, anti-taches. Cancérogène, perturbateur endocrinien.' },

  // --- Cosmétique cancérogène ---
  { code: 'coal-tar', name: 'Goudron de houille (coal tar)', group: 'group1', description: 'Cancérogène avéré (Groupe 1 CIRC). Présent dans certains shampoings antipelliculaires. À éviter.' },
  { code: 'chrome-vi', name: 'Chrome hexavalent (Cr VI)', group: 'group1', description: 'Utilisé dans le tannage du cuir. Cancérogène avéré Groupe 1 CIRC.' },

  // --- Additifs interdits ---
  { code: 'en:e927a', name: 'Azodicarbonamide', group: 'group1', description: 'Interdit dans l\'UE depuis 2005. Libère du semicarbazide cancérogène lors de la cuisson.' },
  { code: 'en:e924', name: 'Bromate de potassium', group: 'group1', description: 'Interdit en UE, Canada, Royaume-Uni. Cancérogène possible (Groupe 2B CIRC).' },
  { code: 'en:e173', name: 'Aluminium (colorant)', group: 'group1', description: 'Métal neurotoxique lié à la maladie d\'Alzheimer.' },
  { code: 'en:e535', name: 'Ferrocyanure de sodium', group: 'group1', description: 'Peut libérer du cyanure en milieu acide. Toxique à doses élevées.' },
  { code: 'en:e541', name: 'Phosphate d\'aluminium sodium', group: 'group1', description: 'Contient de l\'aluminium neurotoxique lié à Alzheimer.' },

  // --- Mélamine ---
  { code: 'melamine', name: 'Mélamine', group: 'group1', description: 'Toxique pour les reins. Peut causer des calculs rénaux et une insuffisance rénale.' },

  // --- Hydroquinone ---
  { code: 'hydroquinone', name: 'Hydroquinone', group: 'group1', description: 'Agent éclaircissant interdit en Europe. Lié à l\'ochronose et aux cancers cutanés.' },

  // --- Azoïques textile ---
  { code: 'azo-dyes', name: 'Colorants azoïques textiles', group: 'group1', description: 'Peuvent libérer des amines aromatiques cancérogènes par contact cutané.' },


  // ═══════════════════════════════════════════════════════════════
  // 🟠 GROUPE 2A — PROBABLEMENT CANCÉROGÈNES / PROBLÉMATIQUES MAJEURS
  // ═══════════════════════════════════════════════════════════════

  // --- Groupe 2A IARC officiel ---
  { code: 'acrylamide', name: 'Acrylamide', group: 'group2a', description: 'Se forme à haute température (chips, frites, café). Classé probablement cancérogène par le CIRC (Groupe 2A).' },
  { code: 'glyphosate', name: 'Glyphosate', group: 'group2a', description: 'Herbicide classé probablement cancérogène par le CIRC (2015).' },
  { code: 'viande-rouge', name: 'Viande rouge', group: 'group2a', description: 'Probablement cancérogène (Groupe 2A CIRC). Lien avec cancer colorectal. Limiter à 500g/semaine.' },

  // --- Édulcorant problématique ---
  { code: 'en:e951', name: 'Aspartame', group: 'group2a', description: 'Classé possiblement cancérogène (Groupe 2B CIRC) en juillet 2023. Présent dans sodas light, chewing-gums sans sucre. À limiter.' },
  { code: 'en:e950', name: 'Acésulfame potassium', group: 'group2a', description: 'Perturbateur du microbiome intestinal. Lien suspecté avec diabète. À limiter.' },

  // --- Conservateurs problématiques ---
  { code: 'en:e320', name: 'BHA (Butylhydroxyanisole)', group: 'group2a', description: 'Classé cancérogène possible (Groupe 2B CIRC). Perturbateur endocrinien. À éviter.' },
  { code: 'en:e319', name: 'TBHQ (Tert-butylhydroquinone)', group: 'group2a', description: 'Lié à des tumeurs dans des études animales. Limité en UE.' },

  // --- Colorants azoïques (hyperactivité enfant) ---
  { code: 'en:e102', name: 'Tartrazine / Yellow 5', group: 'group2a', description: 'Colorant azoïque lié à l\'hyperactivité chez l\'enfant. Avertissement obligatoire en UE. Souvent contaminé par la benzidine.' },
  { code: 'en:e110', name: 'Jaune orangé S / Yellow 6', group: 'group2a', description: 'Colorant azoïque lié à l\'hyperactivité chez l\'enfant. Avertissement obligatoire en UE.' },
  { code: 'en:e124', name: 'Rouge cochenille A / Ponceau 4R', group: 'group2a', description: 'Colorant azoïque interdit aux USA. Lié à l\'hyperactivité chez l\'enfant.' },
  { code: 'en:e129', name: 'Rouge allura / Red 40', group: 'group2a', description: 'Colorant azoïque lié à l\'hyperactivité chez l\'enfant. Avertissement obligatoire en UE.' },
  { code: 'en:e122', name: 'Azorubine / Carmoisine', group: 'group2a', description: 'Colorant azoïque lié à l\'hyperactivité chez l\'enfant.' },
  { code: 'en:e150d', name: 'Caramel ammoniaqué sulfite (Caramel IV)', group: 'group2a', description: 'Contient du 4-MEI classé possiblement cancérogène (Groupe 2B CIRC). Présent dans sodas colas.' },

  // --- Émulsifiants nocifs pour le microbiome ---
  { code: 'en:e407', name: 'Carraghénane / Carraghénine', group: 'group2a', description: 'Lié à l\'inflammation intestinale et au syndrome du côlon irritable. Études récentes alarmantes.' },
  { code: 'en:e433', name: 'Polysorbate 80', group: 'group2a', description: 'Perturbe le microbiome intestinal selon études (Nature 2015). Lien avec inflammation.' },
  { code: 'en:e466', name: 'CMC / Carboxyméthylcellulose', group: 'group2a', description: 'Lié à l\'inflammation intestinale dans études récentes.' },
  { code: 'en:e432', name: 'Polysorbate 20', group: 'group2a', description: 'Émulsifiant industriel qui perturbe le microbiome intestinal.' },
  { code: 'en:e434', name: 'Polysorbate 40', group: 'group2a', description: 'Émulsifiant industriel qui perturbe le microbiome intestinal.' },
  { code: 'en:e435', name: 'Polysorbate 60', group: 'group2a', description: 'Émulsifiant industriel qui perturbe le microbiome intestinal.' },
  { code: 'en:e436', name: 'Polysorbate 65', group: 'group2a', description: 'Émulsifiant industriel qui perturbe le microbiome intestinal.' },

  // --- Exhausteur de goût excitotoxique ---
  { code: 'en:e621', name: 'Glutamate monosodique (MSG)', group: 'group2a', description: 'Excitotoxine qui stimule excessivement les neurones. Maux de tête, palpitations possibles. Marqueur d\'ultra-transformé.' },
  { code: 'en:e620', name: 'Acide glutamique', group: 'group2a', description: 'Excitotoxine, même famille que MSG.' },

  // --- Huiles vraiment problématiques ---
  { code: 'palm-oil', name: 'Huile de palme', group: 'group2a', description: 'Riche en acides gras saturés. Contaminants 3-MCPD et glycidol (Groupe 2A CIRC) formés lors du raffinage à haute température.' },
  { code: 'hydrogenated-oil', name: 'Huile hydrogénée / Gras trans', group: 'group2a', description: 'Contient des gras trans liés aux maladies cardiovasculaires. Interdit aux USA depuis 2018.' },

  // --- Aluminium ---
  { code: 'en:e554', name: 'Silicate aluminium sodium', group: 'group2a', description: 'Contient de l\'aluminium biodisponible. Accumulation neurologique préoccupante.' },
  { code: 'en:e555', name: 'Silicate aluminium potassium', group: 'group2a', description: 'Aluminium biodisponible, accumulation neurologique.' },
  { code: 'en:e556', name: 'Silicate aluminium calcium', group: 'group2a', description: 'Aluminium biodisponible, accumulation neurologique.' },
  { code: 'aluminium-deodorant', name: 'Aluminium chlorohydrate (déodorants)', group: 'group2a', description: 'Sels d\'aluminium dans déodorants. Lien suspecté avec cancer du sein.' },

  // --- Cosmétiques perturbateurs endocriniens ---
  { code: 'parabens', name: 'Parabènes (méthyl, éthyl, propyl, butyl)', group: 'group2a', description: 'Perturbateurs endocriniens qui miment l\'œstrogène. Liens suspectés cancer du sein.' },
  { code: 'phthalate-dbp', name: 'Phtalate DBP', group: 'group2a', description: 'Perturbateur endocrinien interdit dans les jouets UE. Affecte la fertilité masculine.' },
  { code: 'phthalate-dehp', name: 'Phtalate DEHP', group: 'group2a', description: 'Perturbateur endocrinien interdit dans les jouets UE. Affecte la fertilité.' },
  { code: 'cyclosiloxane-d4', name: 'Cyclotétrasiloxane D4', group: 'group2a', description: 'Perturbateur endocrinien. Restrictions UE.' },
  { code: 'cyclosiloxane-d5', name: 'Cyclopentasiloxane D5', group: 'group2a', description: 'Perturbateur endocrinien. Restrictions UE.' },
  { code: 'triclosan', name: 'Triclosan', group: 'group2a', description: 'Perturbateur endocrinien. Interdit dans les savons antibactériens FDA.' },
  { code: 'oxybenzone', name: 'Oxybenzone (Benzophenone-3)', group: 'group2a', description: 'Filtre solaire perturbateur hormonal. Interdit dans certaines zones marines.' },
  { code: 'octinoxate', name: 'Octinoxate', group: 'group2a', description: 'Filtre solaire perturbateur hormonal.' },
  { code: 'bpa', name: 'BPA (Bisphénol A)', group: 'group2a', description: 'Perturbateur endocrinien dans plastiques. Lié au cancer du sein et de la prostate.' },
  { code: 'phenoxyethanol', name: 'Phénoxyéthanol', group: 'group2a', description: 'Interdit aux bébés <3 ans en France. Effets hépatiques.' },
  { code: 'phthalates-fragrance', name: 'Phtalates (parfums)', group: 'group2a', description: 'Présents dans parfums d\'ambiance, bougies. Perturbateurs endocriniens.' },

  // --- Huiles minérales ---
  { code: 'mineral-oil', name: 'Huile minérale (paraffinum, petrolatum)', group: 'group2a', description: 'Dérivés pétroliers. Non raffinés = Groupe 2A IARC.' },

  // --- Produits ménagers toxiques ---
  { code: '2-butoxyethanol', name: '2-Butoxyéthanol', group: 'group2a', description: 'Présent dans nettoyants vitres. Toxique pour foie et reins.' },
  { code: 'chlorine-bleach', name: 'Eau de Javel (hypochlorite)', group: 'group2a', description: 'Produit des dioxines cancérogènes. Irritant respiratoire puissant.' },
  { code: 'perchloroethylene', name: 'Perchloréthylène', group: 'group2a', description: 'Nettoyage à sec. Cancérogène probable Groupe 2A CIRC.' },
  { code: 'mit-cmit', name: 'Isothiazolinones (MIT, CMIT)', group: 'group2a', description: 'Conservateurs ménagers. Allergènes puissants, sensibilisants cutanés sévères.' },
  { code: 'apeo', name: 'Alkylphénols éthoxylés (APEO)', group: 'group2a', description: 'Détergents. Perturbateurs endocriniens.' },
  { code: 'dmf', name: 'Diméthylformamide (DMF)', group: 'group2a', description: 'Solvant textiles synthétiques. Toxique pour le foie.' },
  { code: 'npe', name: 'Nonylphénols éthoxylés (NPE)', group: 'group2a', description: 'Détergent industriel. Perturbateur endocrinien puissant.' },
  { code: '1-4-dioxane', name: '1,4-Dioxane', group: 'group2a', description: 'Contaminant cancérogène probable dans certains shampoings.' },
  { code: 'dea', name: 'DEA (Diéthanolamine)', group: 'group2a', description: 'Forme des nitrosamines cancérogènes. À éviter.' },


  // ═══════════════════════════════════════════════════════════════
  // 🟡 GROUPE 2B — POSSIBLEMENT CANCÉROGÈNES / MODÉRATION
  // (la plupart des additifs courants tombent ici — pas alarmant)
  // ═══════════════════════════════════════════════════════════════

  // --- Édulcorants Groupe 2B ---
  { code: 'en:e954', name: 'Saccharine', group: 'group2b', description: 'Anciennement Groupe 2B IARC (déclassé en 1999 mais reste controversé).' },
  { code: 'en:e955', name: 'Sucralose', group: 'group2b', description: 'Effets sur le microbiome intestinal. À modérer.' },
  { code: 'en:e952', name: 'Cyclamate', group: 'group2b', description: 'Interdit aux USA depuis 1969. Autorisé en UE avec limites.' },

  // --- Colorants Groupe 2B ---
  { code: 'en:e127', name: 'Érythrosine / Red 3', group: 'group2b', description: 'Interdit dans les produits topiques aux USA depuis 1990. Études animales montrent tumeurs thyroïdiennes.' },
  { code: 'en:e133', name: 'Bleu brillant / Blue 1', group: 'group2b', description: 'Colorant artificiel. Allergies possibles. À limiter.' },
  { code: 'en:e132', name: 'Indigotine / Blue 2', group: 'group2b', description: 'Colorant artificiel. Allergies possibles.' },
  { code: 'en:e143', name: 'Vert solide FCF / Green 3', group: 'group2b', description: 'Colorant artificiel interdit en UE.' },
  { code: 'en:e171', name: 'Dioxyde de titane', group: 'group2b', description: 'Interdit comme additif alimentaire en UE depuis 2022. Nanoparticules suspectes (Groupe 2B CIRC).' },
  { code: 'en:e160b', name: 'Annatto / Rocou', group: 'group2b', description: 'Colorant naturel. Allergies possibles chez certaines personnes sensibles.' },
  { code: 'en:e120', name: 'Cochenille / Carmin', group: 'group2b', description: 'Colorant rouge naturel mais allergène fort, chocs anaphylactiques possibles.' },
  { code: 'carbon-black', name: 'Noir de carbone', group: 'group2b', description: 'Nanoparticules controversées (Groupe 2B CIRC).' },

  // --- Caramels colorants ---
  { code: 'en:e150c', name: 'Caramel ammoniaqué (III)', group: 'group2b', description: 'Contient 4-MEI. À modérer.' },
  { code: 'en:e150b', name: 'Caramel de sulfite caustique', group: 'group2b', description: 'Sous-produits controversés.' },

  // --- Conservateurs courants ---
  { code: 'en:e211', name: 'Benzoate de sodium', group: 'group2b', description: 'Conservateur courant. Peut former du benzène cancérogène avec vitamine C dans certaines boissons.' },
  { code: 'en:e210', name: 'Acide benzoïque', group: 'group2b', description: 'Conservateur, peut former du benzène avec vitamine C.' },
  { code: 'en:e321', name: 'BHT (Butylhydroxytoluène)', group: 'group2b', description: 'Antioxydant synthétique. Effets hépatiques à fortes doses. Classé Groupe 3 IARC (preuves insuffisantes).' },

  // --- Sulfites (modération) ---
  { code: 'en:e220', name: 'Dioxyde de soufre', group: 'group2b', description: 'Sulfite. Provoque crises d\'asthme et réactions allergiques sévères.' },
  { code: 'en:e221', name: 'Sulfite de sodium', group: 'group2b', description: 'Sulfite. Allergène, déclenche crises d\'asthme.' },
  { code: 'en:e222', name: 'Bisulfite de sodium', group: 'group2b', description: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { code: 'en:e223', name: 'Métabisulfite de sodium', group: 'group2b', description: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { code: 'en:e224', name: 'Métabisulfite de potassium', group: 'group2b', description: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { code: 'en:e225', name: 'Sulfite de potassium', group: 'group2b', description: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { code: 'en:e226', name: 'Sulfite de calcium', group: 'group2b', description: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { code: 'en:e227', name: 'Bisulfite de calcium', group: 'group2b', description: 'Sulfite. Réactions allergiques et asthme possibles.' },
  { code: 'en:e228', name: 'Bisulfite de potassium', group: 'group2b', description: 'Sulfite. Réactions allergiques et asthme possibles.' },

  // --- Exhausteurs (amplificateurs MSG) ---
  { code: 'en:e631', name: 'Inosinate disodique', group: 'group2b', description: 'Amplifie l\'effet du MSG. Marqueur d\'ultra-transformé.' },
  { code: 'en:e627', name: 'Guanylate disodique', group: 'group2b', description: 'Amplifie l\'effet du MSG. Marqueur d\'ultra-transformé.' },
  { code: 'en:e635', name: '5\'-Ribonucléotide disodique', group: 'group2b', description: 'Amplificateur MSG.' },

  // --- Sucres et sirops (MODÉRATION, pas alarmant) ---
  { code: 'maltodextrine', name: 'Maltodextrine', group: 'group2b', description: 'Glucide ultra-transformé, index glycémique élevé. À modérer.' },
  { code: 'glucose-syrup', name: 'Sirop de glucose', group: 'group2b', description: 'Sirop industriel. À modérer.' },
  { code: 'hfcs', name: 'Sirop de glucose-fructose / HFCS', group: 'group2b', description: 'Sirop à teneur élevée en fructose. Lien obésité, stéatose hépatique.' },
  { code: 'dextrose', name: 'Dextrose', group: 'group2b', description: 'Sucre rapide industriel.' },
  { code: 'corn-syrup', name: 'Sirop de maïs', group: 'group2b', description: 'Sirop industriel sucrant.' },
  { code: 'agave-syrup', name: 'Sirop d\'agave', group: 'group2b', description: 'Présenté comme naturel mais très riche en fructose isolé.' },
  { code: 'rice-syrup', name: 'Sirop de riz', group: 'group2b', description: 'Sirop transformé, index glycémique élevé.' },
  { code: 'fructose-added', name: 'Fructose ajouté', group: 'group2b', description: 'Fructose isolé. Lien stéatose hépatique en excès.' },
  { code: 'refined-sugar', name: 'Sucre blanc raffiné', group: 'group2b', description: 'Consommer avec modération. Lié à obésité, diabète, inflammation.' },

  // --- Arômes ---
  { code: 'natural-flavor', name: 'Arôme naturel', group: 'group2b', description: 'Composition non détaillée. Souvent extrait chimiquement malgré "naturel". Manque de transparence.' },
  { code: 'artificial-flavor', name: 'Arôme artificiel', group: 'group2b', description: 'Molécules synthétiques. Marqueur de produit ultra-transformé.' },

  // --- Huiles raffinées (modération) ---
  { code: 'sunflower-oil', name: 'Huile de tournesol raffinée', group: 'group2b', description: 'Excès oméga-6 pro-inflammatoire. Préférer pressée à froid ou huile d\'olive.' },
  { code: 'canola-oil', name: 'Huile de canola / colza raffinée', group: 'group2b', description: 'Raffinée industriellement. Préférer pressée à froid ou huile d\'olive.' },
  { code: 'soybean-oil', name: 'Huile de soja', group: 'group2b', description: 'Riche en oméga-6 pro-inflammatoire. Souvent OGM.' },
  { code: 'corn-oil', name: 'Huile de maïs', group: 'group2b', description: 'Riche en oméga-6 pro-inflammatoire. Souvent OGM.' },
  { code: 'cottonseed-oil', name: 'Huile de coton', group: 'group2b', description: 'Souvent OGM. Résidus de pesticides possibles.' },
  { code: 'vegetable-oil', name: 'Huile végétale (non spécifiée)', group: 'group2b', description: 'Composition non précisée. Souvent palme ou colza raffinés.' },
  { code: 'grapeseed-oil', name: 'Huile de pépin de raisin', group: 'group2b', description: 'Très riche en oméga-6 pro-inflammatoire.' },

  // --- Protéines industrielles ---
  { code: 'hydrolyzed-protein', name: 'Protéines hydrolysées', group: 'group2b', description: 'Protéine industrielle. Peut contenir glutamate libre caché.' },
  { code: 'protein-isolate', name: 'Isolat de protéines (whey, soja, lait)', group: 'group2b', description: 'Protéines industrielles isolées. Pas les concentrés naturels de fruits/tomate.' },
  { code: 'yeast-extract', name: 'Extrait de levure', group: 'group2b', description: 'Contient du glutamate naturel, équivalent MSG caché.' },
  { code: 'sodium-caseinate', name: 'Caséinate de sodium', group: 'group2b', description: 'Protéine de lait industrielle.' },

  // --- Émulsifiants modérés ---
  { code: 'en:e471', name: 'Mono- et diglycérides E471', group: 'group2b', description: 'Émulsifiant industriel. Peut contenir traces de gras trans cachées.' },
  { code: 'en:e476', name: 'PGPR (Polyglycerol polyricinoleate)', group: 'group2b', description: 'Émulsifiant dans chocolat industriel.' },
  { code: 'en:e322', name: 'Lécithine de soja', group: 'group2b', description: 'Émulsifiant courant. Souvent OGM. Préférer lécithine de tournesol.' },
  { code: 'en:e463', name: 'Hydroxypropyl cellulose', group: 'group2b', description: 'Dérivé industriel de la cellulose.' },
  { code: 'en:e464', name: 'Hydroxypropyl méthylcellulose', group: 'group2b', description: 'Dérivé industriel de la cellulose.' },
  { code: 'en:e465', name: 'Méthyl éthyl cellulose', group: 'group2b', description: 'Dérivé industriel de la cellulose.' },

  // --- Phosphates ---
  { code: 'en:e450', name: 'Diphosphates', group: 'group2b', description: 'Excès de phosphates lié à problèmes cardiaques et osseux.' },
  { code: 'en:e451', name: 'Triphosphates', group: 'group2b', description: 'Excès de phosphates dans l\'alimentation moderne.' },
  { code: 'en:e452', name: 'Polyphosphates', group: 'group2b', description: 'Excès de phosphates.' },
  { code: 'en:e339', name: 'Phosphate de sodium', group: 'group2b', description: 'Sel phosphaté, modération.' },
  { code: 'en:e340', name: 'Phosphate de potassium', group: 'group2b', description: 'Sel phosphaté, modération.' },
  { code: 'en:e341', name: 'Phosphate de calcium', group: 'group2b', description: 'Sel phosphaté, modération.' },

  // --- Gommes (généralement OK mais modération) ---
  { code: 'en:e415', name: 'Gomme xanthane', group: 'group2b', description: 'Épaississant industriel. Effets digestifs à haute dose.' },
  { code: 'en:e412', name: 'Gomme de guar', group: 'group2b', description: 'Épaississant, effets digestifs possibles.' },
  { code: 'en:e417', name: 'Gomme tara', group: 'group2b', description: 'Peu étudiée, effets digestifs possibles.' },
  { code: 'en:e418', name: 'Gomme gellane', group: 'group2b', description: 'Effets digestifs à haute dose.' },
  { code: 'en:e425', name: 'Gomme konjac', group: 'group2b', description: 'Risque de blocage intestinal et étouffement chez les enfants.' },
  { code: 'en:e416', name: 'Gomme karaya', group: 'group2b', description: 'Allergène pouvant provoquer des réactions.' },

  // --- Acides industriels ---
  { code: 'citric-acid-industrial', name: 'Acide citrique industriel', group: 'group2b', description: 'Très courant. Produit par fermentation Aspergillus. Sûr pour la plupart, irritant possible chez sensibles.' },

  // --- Cosmétiques modérés ---
  { code: 'fragrance', name: 'Fragrance / Parfum', group: 'group2b', description: 'Composition non divulguée, peut contenir des dizaines de molécules cachées.' },
  { code: 'sls', name: 'SLS (Sodium Lauryl Sulfate)', group: 'group2b', description: 'Tensioactif irritant. Peut causer des ulcères buccaux. Préférer formules sans sulfates.' },
  { code: 'sles', name: 'SLES (Sodium Laureth Sulfate)', group: 'group2b', description: 'Contamination possible au 1,4-dioxane cancérogène.' },
  { code: 'propylene-glycol', name: 'Propylène glycol', group: 'group2b', description: 'Irritant, contamination possible.' },
  { code: 'ppd', name: 'PPD (P-Phénylènediamine)', group: 'group2b', description: 'Teinture capillaire. Allergène sévère, suspect cancer vessie.' },
  { code: 'resorcinol', name: 'Résorcinol', group: 'group2b', description: 'Teintures cheveux. Perturbateur endocrinien.' },
  { code: 'toluene', name: 'Toluène', group: 'group2b', description: 'Vernis à ongles. Neurotoxique, cancérogène possible.' },
  { code: 'acetaldehyde', name: 'Acétaldéhyde', group: 'group2b', description: 'Lissages brésiliens. Cancérogène possible Groupe 2B.' },
  { code: 'microplastics', name: 'Microplastiques / Microbilles', group: 'group2b', description: 'Polluant persistant. S\'accumule dans l\'organisme.' },
  { code: 'mica-contaminated', name: 'Mica contaminé', group: 'group2b', description: 'Peut contenir de l\'amiante dans certains maquillages.' },
  { code: 'phthalate-dep', name: 'Phtalate DEP', group: 'group2b', description: 'Perturbateur endocrinien moins toxique que DBP/DEHP.' },

  // --- Glycérol ---
  { code: 'en:e422', name: 'Glycérol / Glycérine', group: 'group2b', description: 'Sûr en petite quantité. Le glycérol industriel peut contenir des contaminants (3-MCPD, esters glycidiques).' },

  // --- Produits ménagers modérés ---
  { code: 'ammonia', name: 'Ammoniac', group: 'group2b', description: 'Nettoyants. Irritant respiratoire puissant.' },
  { code: 'phosphates-detergent', name: 'Phosphates (détergents)', group: 'group2b', description: 'Polluant environnemental. Toxique à haute dose.' },

  // --- Ustensiles ---
  { code: 'pfoa-ptfe', name: 'PFOA / PTFE (Teflon)', group: 'group2b', description: 'Poêles antiadhésives. Cancérogène quand chauffé à haute température. Libère gaz toxiques.' },
  { code: 'aluminum-cookware', name: 'Aluminium (casseroles, papier)', group: 'group2b', description: 'Lié à Alzheimer. Migration accrue avec aliments acides.' },
  { code: 'polycarbonate-7', name: 'Polycarbonate (plastique #7)', group: 'group2b', description: 'Contient du BPA. Perturbateur endocrinien.' },
  { code: 'pvc-3', name: 'PVC (plastique #3)', group: 'group2b', description: 'Contient des phtalates. Ne jamais chauffer.' },
  { code: 'polystyrene-6', name: 'Polystyrène (plastique #6)', group: 'group2b', description: 'Peut libérer du styrène. Éviter avec aliments chauds.' },
  { code: 'melamine-cookware', name: 'Mélamine (vaisselle)', group: 'group2b', description: 'Peut libérer du formaldéhyde quand chauffée. Ne jamais utiliser au micro-ondes.' },
  { code: 'antimony', name: 'Antimoine', group: 'group2b', description: 'Présent dans le polyester. Potentiellement cancérigène.' },


  // ═══════════════════════════════════════════════════════════════
  // 🟢 SÛRS — ADDITIFS NATURELS OU NEUTRES
  // ═══════════════════════════════════════════════════════════════

  { code: 'en:e150a', name: 'Caramel ordinaire (E150a)', group: 'none', description: 'Caramel simple, généralement considéré sûr.' },
  { code: 'en:e300', name: 'Acide ascorbique / Vitamine C', group: 'none', description: 'Vitamine C, antioxydant naturel sûr.' },
  { code: 'en:e306', name: 'Vitamine E naturelle (tocophérol)', group: 'none', description: 'Antioxydant naturel sûr.' },
  { code: 'en:e330', name: 'Acide citrique', group: 'none', description: 'Acide naturel, sûr pour la plupart. Très courant.' },
  { code: 'en:e331', name: 'Citrate de sodium', group: 'none', description: 'Sel d\'acide citrique, sûr.' },
  { code: 'en:e332', name: 'Citrate de potassium', group: 'none', description: 'Sel d\'acide citrique, sûr.' },
  { code: 'en:e270', name: 'Acide lactique', group: 'none', description: 'Acide naturel issu de fermentation, sûr.' },
  { code: 'en:e296', name: 'Acide malique', group: 'none', description: 'Acide naturel des fruits, sûr.' },
  { code: 'en:e334', name: 'Acide tartrique', group: 'none', description: 'Acide naturel du raisin, sûr.' },
  { code: 'en:e440', name: 'Pectine', group: 'none', description: 'Fibre naturelle extraite de fruits, sûre.' },
  { code: 'en:e406', name: 'Agar-agar', group: 'none', description: 'Gélifiant naturel à base d\'algues, sûr.' },
  { code: 'en:e414', name: 'Gomme arabique / Acacia', group: 'none', description: 'Fibre naturelle, généralement bien tolérée.' },
  { code: 'en:e410', name: 'Gomme de caroube', group: 'none', description: 'Épaississant naturel à base de caroube, sûr.' },
  { code: 'en:e163', name: 'Anthocyanes', group: 'none', description: 'Colorant naturel antioxydant, bénéfique.' },
  { code: 'en:e170', name: 'Carbonate de calcium', group: 'none', description: 'Source naturelle de calcium, sûre.' },
  { code: 'en:e500', name: 'Carbonate de sodium', group: 'none', description: 'Bicarbonate, sûr.' },
  { code: 'en:e504', name: 'Carbonate de magnésium', group: 'none', description: 'Sel minéral naturel, sûr.' },
  { code: 'en:e508', name: 'Chlorure de potassium', group: 'none', description: 'Sel minéral, sûr.' },
  { code: 'en:e322-sunflower', name: 'Lécithine de tournesol', group: 'none', description: 'Émulsifiant naturel sans OGM, sûr.' },
  { code: 'en:e960', name: 'Stévia / Steviol glycosides', group: 'none', description: 'Édulcorant naturel issu de la stévia, sûr.' },
  { code: 'erythritol', name: 'Érythritol', group: 'none', description: 'Édulcorant naturel fermenté, considéré sûr par EFSA et FDA.' },
  { code: 'monk-fruit', name: 'Fruit du moine / Monk fruit', group: 'none', description: 'Édulcorant naturel, sûr.' },
  { code: 'allulose', name: 'Allulose', group: 'none', description: 'Sucre rare naturel, faible impact glycémique.' },
  { code: 'xylitol', name: 'Xylitol', group: 'none', description: 'Édulcorant naturel sûr pour humains (TOXIQUE pour chiens).' },
  { code: 'en:e392', name: 'Extrait de romarin', group: 'none', description: 'Antioxydant naturel, sûr.' },
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

  // Règle cumulative : si 4+ additifs ORANGE détectés, garde ORANGE
  // (PAS d'upgrade automatique vers ORANGE si juste des JAUNES)
  const orangeCount = detected.filter(a => a.group === 'group2a').length;
  if (orangeCount >= 4 && groupPriority[worstGroup] < groupPriority['group2a']) {
    worstGroup = 'group2a';
    console.log('[Additives] Cumulative rule: 4+ ORANGE additives detected, keeping ORANGE');
  }

  return { riskGroup: worstGroup, detectedAdditives: detected };
}

export function getRiskBadgeInfo(group: RiskGroup): { label: string; sublabel: string; color: string } {
  switch (group) {
    case 'group1':
      return { label: t('risk_danger_label'), sublabel: t('risk_danger_sub_g1'), color: '#FF3B30' };
    case 'group2a':
      return { label: t('risk_warning_label'), sublabel: t('risk_warning_sub'), color: '#E8640A' };
    case 'group2b':
      return { label: t('risk_moderation_label'), sublabel: t('risk_caution_sub'), color: '#F5C000' };
    case 'none':
    default:
      return { label: t('risk_approved_label'), sublabel: t('risk_approved_sub'), color: '#2E9E34' };
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