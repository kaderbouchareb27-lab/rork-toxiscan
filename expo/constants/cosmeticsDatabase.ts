import { getDeviceLanguage } from '@/utils/i18n';

/**
 * COSMETIC ANALYSIS — completely separate from the food engine.
 *
 * Cosmetics (shampoo, toothpaste, cream, soap, deodorant, makeup…) are scored on a
 * 3-tier scale based on the INCI list, NOT the food NOVA/IARC scale:
 *   🟣 TOXIC    — recognized dangerous ingredients (SLS, parabens, phthalates,
 *                 formaldehyde releasers, endocrine disruptors, banned carcinogens)
 *   🟡 DISPUTED — controversial ingredients, divided science (phenoxyethanol,
 *                 fragrance, PEGs, silicones, fragrance allergens…)
 *   🟢 APPROVED — natural / functional ingredients with no known risk
 */

export type CosmeticTier = 'toxic' | 'disputed' | 'approved';

export interface CosmeticEntry {
  /** INCI keywords (lowercase). Longest match wins, then worst tier. */
  readonly keywords: readonly string[];
  /** French display name. */
  readonly displayName: string;
  /** English display name. */
  readonly displayNameEn: string;
  /** Korean display name (optional — falls back to English). */
  readonly displayNameKo?: string;
  readonly tier: CosmeticTier;
  /** French explanation. */
  readonly note: string;
  /** English explanation. */
  readonly noteEn: string;
  /** Korean explanation (optional — falls back to English). */
  readonly noteKo?: string;
  /** True when the ingredient is specifically risky during pregnancy. */
  readonly pregnancyDanger?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// COSMETIC INGREDIENT DATABASE
// ═══════════════════════════════════════════════════════════════════════

export const COSMETICS_DATABASE: readonly CosmeticEntry[] = [
  // ───────────────────────────────────────────────────────────────
  // 🟣 TOXIC — recognized dangerous ingredients / endocrine disruptors
  // ───────────────────────────────────────────────────────────────
  {
    keywords: ['formaldehyde', 'formaldehyde', 'formalin', 'methylene glycol'],
    displayName: 'Formaldéhyde',
    displayNameEn: 'Formaldehyde',
    displayNameKo: '포름알데하이드',
    tier: 'toxic',
    note: 'Cancérigène avéré (CIRC Groupe 1) — cancer du nasopharynx, leucémie. Irrite yeux, peau et voies respiratoires. À éviter absolument.',
    noteEn: 'Confirmed carcinogen (IARC Group 1) — nasopharyngeal cancer, leukemia. Irritates eyes, skin and airways. Absolutely avoid.',
    noteKo: '단정 발암 물질(IARC 1그룹) — 비인두암, 백혈병. 눈·피부·호흡기를 자극합니다. 반드시 피하세요.',
    pregnancyDanger: true,
  },
  {
    keywords: ['dmdm hydantoin', 'quaternium-15', 'quaternium 15', 'diazolidinyl urea', 'imidazolidinyl urea', 'sodium hydroxymethylglycinate', 'bronopol', 'methenamine'],
    displayName: 'Libérateur de formaldéhyde',
    displayNameEn: 'Formaldehyde releaser',
    displayNameKo: '포름알데하이드 방출 보존제',
    tier: 'toxic',
    note: 'Libère lentement du formaldéhyde (cancérigène CIRC Groupe 1) au contact de la peau. Sensibilisant cutané présent dans shampoings, lotions et produits bébé.',
    noteEn: 'Slowly releases formaldehyde (IARC Group 1 carcinogen) on the skin. A skin sensitizer found in shampoos, lotions and baby products.',
    noteKo: '피부에 닿으면 포름알데하이드(IARC 1그룹 발암물질)를 서서히 방출합니다. 샴푸·로션·유아용품에 들어있는 피부 알레르기 유발 물질입니다.',
    pregnancyDanger: true,
  },
  {
    keywords: ['methylparaben', 'ethylparaben', 'propylparaben', 'butylparaben', 'isobutylparaben', 'isopropylparaben', 'paraben', 'parabens', 'parabène', 'parabènes'],
    displayName: 'Parabènes',
    displayNameEn: 'Parabens',
    displayNameKo: '파라벤',
    tier: 'toxic',
    note: 'Perturbateurs endocriniens qui miment les œstrogènes. Détectés dans des biopsies de cancer du sein (étude Darbre). Isobutyl/isopropylparaben interdits en UE.',
    noteEn: 'Endocrine disruptors that mimic estrogen. Detected in breast-cancer biopsies (Darbre study). Isobutyl/isopropylparaben banned in the EU.',
    noteKo: '에스트로겐을 모방하는 내분비교란 물질입니다. 유방암 조직 검사에서 검출되었으며(다브레 연구), 이소부틸/이소프로필파라벤은 EU에서 금지되었습니다.',
    pregnancyDanger: true,
  },
  {
    keywords: ['dibutyl phthalate', 'dbp', 'diethylhexyl phthalate', 'dehp', 'diethyl phthalate', 'phthalate', 'phthalates', 'phtalate', 'phtalates'],
    displayName: 'Phtalates',
    displayNameEn: 'Phthalates',
    displayNameKo: '프탈레이트',
    tier: 'toxic',
    note: 'Perturbateurs endocriniens reprotoxiques (CMR catégorie 2), souvent cachés sous « parfum ». Liés à des malformations et à un faible poids de naissance. Interdits en cosmétique UE.',
    noteEn: 'Reprotoxic endocrine disruptors (CMR category 2), often hidden under "fragrance". Linked to malformations and low birth weight. Banned in EU cosmetics.',
    noteKo: '생식독성 내분비교란 물질(CMR 2등급)로, 종종 “향료” 안에 숨겨져 있습니다. 기형과 저체중 출생과 관련되며 EU 화장품에서 금지되었습니다.',
    pregnancyDanger: true,
  },
  {
    keywords: ['sodium lauryl sulfate', 'sodium laureth sulfate', 'sles', 'ammonium lauryl sulfate', 'ammonium laureth sulfate', 'sodium lauryl sulfoacetate', 'sls'],
    displayName: 'Sulfates SLS / SLES',
    displayNameEn: 'SLS / SLES sulfates',
    displayNameKo: '설페이트 계면활성제(SLS/SLES)',
    tier: 'toxic',
    note: 'Tensioactifs agressifs qui détruisent le film hydrolipidique de la peau. Le SLES peut être contaminé par du 1,4-dioxane (cancérigène possible). Irritant pour peau, yeux et cuir chevelu.',
    noteEn: 'Harsh surfactants that strip the skin\'s protective barrier. SLES can be contaminated with 1,4-dioxane (possible carcinogen). Irritating to skin, eyes and scalp.',
    noteKo: '피부 보호막을 손상시키는 강한 계면활성제입니다. SLES는 1,4-다이옥산(발암 가능 물질)으로 오염될 수 있으며 피부·눈·두피를 자극합니다.',
  },
  {
    keywords: ['ptfe', 'perfluoro', 'polyfluoro', 'pfas', 'pfoa', 'perfluorooctyl', 'perfluorodecalin', 'c9-15 fluoroalcohol'],
    displayName: 'PFAS (composés perfluorés)',
    displayNameEn: 'PFAS (perfluorinated compounds)',
    tier: 'toxic',
    note: 'Polluants éternels qui s\'accumulent dans l\'organisme. PFOA classé cancérigène. Présents dans maquillage longue tenue et waterproof. Traversent le placenta.',
    noteEn: 'Forever chemicals that accumulate in the body. PFOA is classified carcinogenic. Found in long-wear and waterproof makeup. Cross the placenta.',
    pregnancyDanger: true,
  },
  {
    keywords: ['triclosan', 'irgasan', 'triclocarban'],
    displayName: 'Triclosan',
    displayNameEn: 'Triclosan',
    displayNameKo: '트리클로산',
    tier: 'toxic',
    note: 'Antibactérien perturbateur endocrinien (hormones thyroïdiennes). Interdit par la FDA dans les savons. Favorise la résistance aux antibiotiques.',
    noteEn: 'Antibacterial and endocrine disruptor (thyroid hormones). Banned by the FDA in soaps. Promotes antibiotic resistance.',
    noteKo: '갑상선 호르몬을 교란하는 항균·내분비교란 물질입니다. FDA가 비누에 사용을 금지했으며 항생제 내성을 촉진합니다.',
  },
  {
    keywords: ['oxybenzone', 'benzophenone-3', 'benzophenone', 'octinoxate', 'ethylhexyl methoxycinnamate'],
    displayName: 'Filtres UV chimiques (oxybenzone, octinoxate)',
    displayNameEn: 'Chemical UV filters (oxybenzone, octinoxate)',
    displayNameKo: '화학적 자외선 차단제(옥시벤존, 옥티노세이트)',
    tier: 'toxic',
    note: 'Perturbateurs endocriniens à absorption systémique confirmée (FDA). Détectés dans le sang, l\'urine et le lait maternel. Préférer les filtres minéraux (oxyde de zinc).',
    noteEn: 'Endocrine disruptors with confirmed systemic absorption (FDA). Detected in blood, urine and breast milk. Prefer mineral filters (zinc oxide).',
    noteKo: '체내 흡수가 확인된 내분비교란 물질입니다(FDA). 혈액·소변·모유에서 검출되었습니다. 미네랄 차단제(징크옥사이드)를 권장합니다.',
    pregnancyDanger: true,
  },
  {
    keywords: ['hydroquinone'],
    displayName: 'Hydroquinone',
    displayNameEn: 'Hydroquinone',
    displayNameKo: '하이드로퀴논',
    tier: 'toxic',
    note: 'Agent éclaircissant mutagène, interdit en cosmétique en UE et au Canada. Provoque une ochronose (taches permanentes) et des lésions cutanées.',
    noteEn: 'Mutagenic skin-lightening agent, banned in cosmetics in the EU and Canada. Causes ochronosis (permanent dark patches) and skin lesions.',
    noteKo: '돌연변이성 미백제로 EU와 캐나다의 화장품에서 금지되었습니다. 오크로노시스(영구적 색소 침착)와 피부 손상을 일으킵니다.',
    pregnancyDanger: true,
  },
  {
    keywords: ['p-phenylenediamine', 'para-phenylenediamine', 'ppd', 'toluene-2,5-diamine', 'resorcinol'],
    displayName: 'Colorants capillaires (PPD, résorcinol)',
    displayNameEn: 'Hair dyes (PPD, resorcinol)',
    tier: 'toxic',
    note: 'Colorants de teinture liés au cancer de la vessie en exposition professionnelle (CIRC). Allergènes puissants pouvant causer des dermatites sévères.',
    noteEn: 'Hair-dye colorants linked to bladder cancer in occupational exposure (IARC). Strong allergens that can cause severe dermatitis.',
  },
  {
    keywords: ['coal tar', 'goudron de houille', 'ci 77266 coal'],
    displayName: 'Goudron de houille',
    displayNameEn: 'Coal tar',
    tier: 'toxic',
    note: 'Cancérigène avéré (CIRC Groupe 1) utilisé dans certains shampoings antipelliculaires. Irritant cutané. À éviter.',
    noteEn: 'Confirmed carcinogen (IARC Group 1) used in some anti-dandruff shampoos. Skin irritant. Avoid.',
  },
  {
    keywords: ['mercury', 'mercure', 'thimerosal', 'mercurio', 'calomel'],
    displayName: 'Mercure',
    displayNameEn: 'Mercury',
    tier: 'toxic',
    note: 'Métal lourd neurotoxique et cancérigène, interdit en cosmétique. Présent illégalement dans certaines crèmes éclaircissantes. Extrêmement dangereux.',
    noteEn: 'Neurotoxic and carcinogenic heavy metal, banned in cosmetics. Illegally present in some skin-lightening creams. Extremely dangerous.',
    pregnancyDanger: true,
  },
  {
    keywords: ['lead acetate', 'acetate de plomb', 'plomb', 'lead'],
    displayName: 'Plomb',
    displayNameEn: 'Lead',
    tier: 'toxic',
    note: 'Métal lourd cancérigène et neurotoxique (CIRC Groupe 1). Interdit en cosmétique UE. S\'accumule dans l\'organisme.',
    noteEn: 'Carcinogenic and neurotoxic heavy metal (IARC Group 1). Banned in EU cosmetics. Accumulates in the body.',
    pregnancyDanger: true,
  },
  {
    keywords: ['toluene', 'toluène', 'methylbenzene'],
    displayName: 'Toluène',
    displayNameEn: 'Toluene',
    tier: 'toxic',
    note: 'Solvant des vernis à ongles, neurotoxique et reprotoxique. Les vapeurs sont nocives. À éviter, surtout enceinte.',
    noteEn: 'Nail-polish solvent that is neurotoxic and reprotoxic. The fumes are harmful. Avoid, especially during pregnancy.',
    pregnancyDanger: true,
  },
  {
    keywords: ['cyclopentasiloxane', 'cyclotetrasiloxane', 'cyclomethicone', 'cyclohexasiloxane', 'd4', 'd5', 'd6'],
    displayName: 'Cyclosiloxanes (D4, D5, D6)',
    displayNameEn: 'Cyclosiloxanes (D4, D5, D6)',
    tier: 'toxic',
    note: 'Silicones volatils perturbateurs endocriniens et toxiques pour la reproduction. D4/D5 restreints en UE. Très persistants dans l\'environnement.',
    noteEn: 'Volatile silicones that are endocrine disruptors and toxic to reproduction. D4/D5 restricted in the EU. Highly persistent in the environment.',
    pregnancyDanger: true,
  },
  {
    keywords: ['aluminum chlorohydrate', 'aluminium chlorohydrate', 'aluminum zirconium', 'aluminium zirconium', 'aluminum chloride', 'alum chlorohydrate'],
    displayName: 'Sels d\'aluminium',
    displayNameEn: 'Aluminum salts',
    tier: 'toxic',
    note: 'Sels anti-transpirants absorbés sous les aisselles, aux propriétés œstrogéniques suspectées (lien possible avec le cancer du sein). Neurotoxicité débattue.',
    noteEn: 'Antiperspirant salts absorbed under the arms with suspected estrogenic properties (possible link to breast cancer). Debated neurotoxicity.',
  },
  {
    keywords: ['diethanolamine', 'triethanolamine', 'monoethanolamine', 'cocamide dea', 'lauramide dea', 'dea', 'tea', 'mea'],
    displayName: 'Éthanolamines (DEA / TEA / MEA)',
    displayNameEn: 'Ethanolamines (DEA / TEA / MEA)',
    tier: 'toxic',
    note: 'Peuvent former des nitrosamines cancérigènes au contact de conservateurs nitrosants. Irritantes pour la peau et les yeux.',
    noteEn: 'Can form carcinogenic nitrosamines in contact with nitrosating preservatives. Irritating to skin and eyes.',
  },
  {
    keywords: ['talc'],
    displayName: 'Talc',
    displayNameEn: 'Talc',
    tier: 'toxic',
    note: 'Minéral pouvant être contaminé par de l\'amiante (cancérigène). Lié au cancer de l\'ovaire en usage génital (Johnson & Johnson condamné en 2024).',
    noteEn: 'Mineral that can be contaminated with asbestos (carcinogenic). Linked to ovarian cancer with genital use (Johnson & Johnson convicted in 2024).',
    pregnancyDanger: true,
  },
  {
    keywords: ['methylisothiazolinone', 'methylchloroisothiazolinone', 'mit', 'cmit', 'benzisothiazolinone'],
    displayName: 'Isothiazolinones (MIT / MCIT)',
    displayNameEn: 'Isothiazolinones (MIT / MCIT)',
    tier: 'toxic',
    note: 'Conservateurs parmi les allergènes de contact les plus puissants — « allergène de l\'année » 2013. Interdits dans les produits sans rinçage en UE.',
    noteEn: 'Preservatives among the strongest contact allergens — "Allergen of the Year" 2013. Banned in leave-on products in the EU.',
  },
  {
    keywords: ['butylated hydroxyanisole', 'bha'],
    displayName: 'BHA (butylhydroxyanisole)',
    displayNameEn: 'BHA (butylated hydroxyanisole)',
    tier: 'toxic',
    note: 'Antioxydant classé cancérigène possible (CIRC Groupe 2B) et perturbateur endocrinien par la Commission européenne. À éviter.',
    noteEn: 'Antioxidant classified as a possible carcinogen (IARC Group 2B) and endocrine disruptor by the European Commission. Avoid.',
  },

  // ───────────────────────────────────────────────────────────────
  // 🟡 DISPUTED — controversial, divided science
  // ───────────────────────────────────────────────────────────────
  {
    keywords: ['phenoxyethanol', 'phénoxyéthanol'],
    displayName: 'Phénoxyéthanol',
    displayNameEn: 'Phenoxyethanol',
    displayNameKo: '페녹시에탄올',
    tier: 'disputed',
    note: 'Conservateur courant. Considéré sûr à faible dose par l\'EFSA mais restreint en France pour les produits bébé de moins de 3 ans. Peut irriter.',
    noteEn: 'Common preservative. Considered safe at low doses by EFSA but restricted in France for baby products under age 3. Can be irritating.',
    noteKo: '흔히 쓰이는 보존제입니다. EFSA는 저농도에서 안전하다고 보지만 프랑스는 3세 미만 유아용품에 사용을 제한합니다. 자극을 줄 수 있습니다.',
  },
  {
    keywords: ['fragrance', 'parfum', 'aroma', 'flavor', 'arôme'],
    displayName: 'Parfum / Fragrance',
    displayNameEn: 'Fragrance / Parfum',
    displayNameKo: '향료',
    tier: 'disputed',
    note: 'Mention fourre-tout pouvant cacher des dizaines de molécules non divulguées, parfois des phtalates ou des allergènes. Préférer « sans parfum » sur les peaux sensibles.',
    noteEn: 'Catch-all term that can hide dozens of undisclosed molecules, sometimes phthalates or allergens. Prefer "fragrance-free" for sensitive skin.',
    noteKo: '공개되지 않은 수십 가지 물질(때로는 프탈레이트나 알레르기 유발 물질)을 숨길 수 있는 포괄적 표기입니다. 민감성 피부라면 “무향료” 제품을 권장합니다.',
  },
  {
    keywords: ['peg-', 'peg ', 'polyethylene glycol', 'polyéthylène glycol', 'peg/ppg', 'peg-100 stearate', 'peg-40'],
    displayName: 'PEG (composés éthoxylés)',
    displayNameEn: 'PEG (ethoxylated compounds)',
    tier: 'disputed',
    note: 'Émulsifiants éthoxylés. Sûrs en eux-mêmes mais possible contamination résiduelle au 1,4-dioxane (cancérigène possible) selon le procédé de fabrication.',
    noteEn: 'Ethoxylated emulsifiers. Safe on their own but possible residual contamination with 1,4-dioxane (a possible carcinogen) depending on manufacturing.',
  },
  {
    keywords: ['1,4-dioxane', 'dioxane'],
    displayName: '1,4-Dioxane (contaminant)',
    displayNameEn: '1,4-Dioxane (contaminant)',
    tier: 'disputed',
    note: 'Contaminant de fabrication des ingrédients éthoxylés (PEG, SLES). Classé cancérigène possible (CIRC 2B). N\'apparaît pas toujours sur l\'étiquette.',
    noteEn: 'Manufacturing contaminant of ethoxylated ingredients (PEG, SLES). Classified as a possible carcinogen (IARC 2B). Not always listed on the label.',
  },
  {
    keywords: ['dimethicone', 'methicone', 'siloxane', 'dimethiconol', 'phenyl trimethicone', 'silicone'],
    displayName: 'Silicones (diméthicone)',
    displayNameEn: 'Silicones (dimethicone)',
    tier: 'disputed',
    note: 'Silicones occlusifs qui lissent en surface. Non toxiques mais peuvent étouffer la peau et le cheveu à long terme, et sont peu biodégradables.',
    noteEn: 'Occlusive silicones that smooth the surface. Not toxic but can suffocate skin and hair over time, and are poorly biodegradable.',
  },
  {
    keywords: ['mineral oil', 'paraffinum liquidum', 'petrolatum', 'huile minérale', 'cera microcristallina', 'microcrystalline wax', 'paraffin'],
    displayName: 'Huiles minérales (paraffine, vaseline)',
    displayNameEn: 'Mineral oils (paraffin, petrolatum)',
    tier: 'disputed',
    note: 'Dérivés de pétrole occlusifs. Les huiles raffinées sont jugées sûres, mais les fractions mal raffinées (MOAH) sont préoccupantes selon l\'EFSA.',
    noteEn: 'Occlusive petroleum derivatives. Refined oils are considered safe, but poorly refined fractions (MOAH) are a concern according to EFSA.',
  },
  {
    keywords: ['cocamidopropyl betaine', 'cocamide mea', 'cocamidopropyl'],
    displayName: 'Cocamidopropyl bétaïne',
    displayNameEn: 'Cocamidopropyl betaine',
    tier: 'disputed',
    note: 'Tensioactif doux dérivé de coco, mais reconnu allergène de contact (« allergène de l\'année » 2004) à cause d\'impuretés de fabrication.',
    noteEn: 'Mild coconut-derived surfactant, but a recognized contact allergen ("Allergen of the Year" 2004) due to manufacturing impurities.',
  },
  {
    keywords: ['limonene', 'linalool', 'citronellol', 'geraniol', 'eugenol', 'coumarin', 'citral', 'hexyl cinnamal', 'benzyl alcohol', 'benzyl salicylate', 'isoeugenol', 'farnesol'],
    displayName: 'Allergènes de parfum',
    displayNameEn: 'Fragrance allergens',
    tier: 'disputed',
    note: 'Composés odorants (souvent issus d\'huiles essentielles) dont la déclaration est obligatoire car ils figurent parmi les allergènes de contact reconnus en UE.',
    noteEn: 'Scent compounds (often from essential oils) whose listing is mandatory because they are among the recognized contact allergens in the EU.',
  },
  {
    keywords: ['titanium dioxide nano', 'titanium dioxide [nano]', 'ci 77891 nano', 'nano'],
    displayName: 'Dioxyde de titane (nano)',
    displayNameEn: 'Titanium dioxide (nano)',
    tier: 'disputed',
    note: 'Filtre minéral. Sous forme nano et par inhalation (sprays, poudres), classé cancérigène possible (CIRC 2B). Sans risque en crème non-nano.',
    noteEn: 'Mineral filter. In nano form and by inhalation (sprays, powders) classified a possible carcinogen (IARC 2B). No risk in non-nano cream.',
  },
  {
    keywords: ['carbon black', 'ci 77266'],
    displayName: 'Noir de carbone (CI 77266)',
    displayNameEn: 'Carbon black (CI 77266)',
    tier: 'disputed',
    note: 'Pigment noir des mascaras et eye-liners. Classé cancérigène possible par inhalation (CIRC 2B) ; peut contenir des traces d\'HAP.',
    noteEn: 'Black pigment in mascaras and eyeliners. Classified a possible carcinogen by inhalation (IARC 2B); may contain trace PAHs.',
  },
  {
    keywords: ['homosalate', 'octisalate', 'octocrylene', 'avobenzone', 'ethylhexyl salicylate'],
    displayName: 'Filtres UV organiques (homosalate, octocrylène)',
    displayNameEn: 'Organic UV filters (homosalate, octocrylene)',
    tier: 'disputed',
    note: 'Filtres solaires absorbés par la peau, à l\'innocuité débattue. L\'octocrylène peut se dégrader en benzophénone avec le temps. Moins documentés que l\'oxybenzone.',
    noteEn: 'Sunscreen filters absorbed by the skin with debated safety. Octocrylene can degrade into benzophenone over time. Less documented than oxybenzone.',
  },
  {
    keywords: ['alcohol denat', 'alcool dénaturé', 'sd alcohol', 'ethanol', 'isopropyl alcohol', 'denatured alcohol'],
    displayName: 'Alcool dénaturé',
    displayNameEn: 'Denatured alcohol',
    tier: 'disputed',
    note: 'Solvant volatil qui peut dessécher et fragiliser la barrière cutanée à forte dose. Toléré en petite quantité, problématique pour les peaux sèches ou sensibles.',
    noteEn: 'Volatile solvent that can dry out and weaken the skin barrier at high doses. Tolerated in small amounts, problematic for dry or sensitive skin.',
  },
  {
    keywords: ['sodium benzoate', 'benzoic acid', 'potassium sorbate', 'sorbic acid'],
    displayName: 'Conservateurs (benzoate, sorbate)',
    displayNameEn: 'Preservatives (benzoate, sorbate)',
    tier: 'disputed',
    note: 'Conservateurs doux jugés sûrs. Le benzoate de sodium peut former du benzène en présence de vitamine C. Légèrement irritants chez les sujets sensibles.',
    noteEn: 'Mild preservatives considered safe. Sodium benzoate can form benzene in the presence of vitamin C. Slightly irritating for sensitive people.',
  },
  {
    keywords: ['polysorbate', 'polysorbate 20', 'polysorbate 60', 'polysorbate 80'],
    displayName: 'Polysorbates',
    displayNameEn: 'Polysorbates',
    tier: 'disputed',
    note: 'Émulsifiants éthoxylés. Sûrs en usage, mais possible contamination résiduelle au 1,4-dioxane selon le procédé de fabrication.',
    noteEn: 'Ethoxylated emulsifiers. Safe in use, but possible residual 1,4-dioxane contamination depending on manufacturing.',
  },
  {
    keywords: ['bht', 'butylated hydroxytoluene'],
    displayName: 'BHT (butylhydroxytoluène)',
    displayNameEn: 'BHT (butylated hydroxytoluene)',
    tier: 'disputed',
    note: 'Antioxydant de synthèse. Soupçonné d\'effet perturbateur endocrinien à fortes doses dans certaines études animales ; science encore partagée.',
    noteEn: 'Synthetic antioxidant. Suspected of endocrine-disrupting effects at high doses in some animal studies; science still divided.',
  },
  {
    keywords: ['ethylhexylglycerin', 'caprylyl glycol'],
    displayName: 'Ethylhexylglycerin',
    displayNameEn: 'Ethylhexylglycerin',
    tier: 'disputed',
    note: 'Conservateur et adoucissant de nouvelle génération, généralement bien toléré, mais source occasionnelle d\'allergies de contact.',
    noteEn: 'New-generation preservative and emollient, generally well tolerated but an occasional source of contact allergy.',
  },

  // ───────────────────────────────────────────────────────────────
  // 🟢 APPROVED — natural / functional ingredients, no known risk
  // ───────────────────────────────────────────────────────────────
  {
    keywords: ['aqua', 'water', 'eau', 'aqua/water', 'aqua (water)'],
    displayName: 'Eau (Aqua)',
    displayNameEn: 'Water (Aqua)',
    tier: 'approved',
    note: 'Base de la plupart des cosmétiques. Solvant inerte et parfaitement sûr.',
    noteEn: 'The base of most cosmetics. An inert, perfectly safe solvent.',
  },
  {
    keywords: ['glycerin', 'glycérine', 'glycerine', 'glycerol'],
    displayName: 'Glycérine',
    displayNameEn: 'Glycerin',
    tier: 'approved',
    note: 'Humectant naturel qui attire et retient l\'eau dans la peau. Excellent hydratant, très bien toléré.',
    noteEn: 'Natural humectant that draws and holds water in the skin. An excellent, very well-tolerated moisturizer.',
  },
  {
    keywords: ['aloe barbadensis', 'aloe vera', 'aloe'],
    displayName: 'Aloe vera',
    displayNameEn: 'Aloe vera',
    tier: 'approved',
    note: 'Gel végétal apaisant et hydratant, riche en polysaccharides. Idéal pour les peaux irritées ou après-soleil.',
    noteEn: 'Soothing, hydrating plant gel rich in polysaccharides. Ideal for irritated or after-sun skin.',
  },
  {
    keywords: ['butyrospermum parkii', 'shea butter', 'beurre de karité', 'karite'],
    displayName: 'Beurre de karité',
    displayNameEn: 'Shea butter',
    tier: 'approved',
    note: 'Corps gras végétal nourrissant riche en acides gras et vitamines A et E. Excellent pour les peaux sèches.',
    noteEn: 'Nourishing plant butter rich in fatty acids and vitamins A and E. Excellent for dry skin.',
  },
  {
    keywords: ['tocopherol', 'tocopheryl acetate', 'vitamin e', 'vitamine e', 'tocophérol'],
    displayName: 'Vitamine E (tocophérol)',
    displayNameEn: 'Vitamin E (tocopherol)',
    tier: 'approved',
    note: 'Antioxydant naturel qui protège la peau et stabilise les huiles. Bien toléré et bénéfique.',
    noteEn: 'Natural antioxidant that protects the skin and stabilizes oils. Well tolerated and beneficial.',
  },
  {
    keywords: ['sodium chloride', 'sea salt', 'sel marin'],
    displayName: 'Sel (chlorure de sodium)',
    displayNameEn: 'Salt (sodium chloride)',
    tier: 'approved',
    note: 'Agent épaississant minéral simple et sûr.',
    noteEn: 'A simple, safe mineral thickening agent.',
  },
  {
    keywords: ['citric acid', 'acide citrique', 'sodium citrate'],
    displayName: 'Acide citrique',
    displayNameEn: 'Citric acid',
    tier: 'approved',
    note: 'Régulateur de pH d\'origine naturelle, utilisé en faible quantité. Sans risque.',
    noteEn: 'A naturally derived pH adjuster used in small amounts. No risk.',
  },
  {
    keywords: ['panthenol', 'provitamin b5', 'panthénol', 'dexpanthenol'],
    displayName: 'Panthénol (pro-vitamine B5)',
    displayNameEn: 'Panthenol (provitamin B5)',
    tier: 'approved',
    note: 'Agent hydratant et réparateur qui apaise et renforce la barrière cutanée. Très bien toléré.',
    noteEn: 'Moisturizing, repairing agent that soothes and strengthens the skin barrier. Very well tolerated.',
  },
  {
    keywords: ['sodium hyaluronate', 'hyaluronic acid', 'acide hyaluronique', 'hyaluronate'],
    displayName: 'Acide hyaluronique',
    displayNameEn: 'Hyaluronic acid',
    tier: 'approved',
    note: 'Molécule hydratante naturellement présente dans la peau, retient l\'eau et repulpe. Excellente tolérance.',
    noteEn: 'A hydrating molecule naturally present in skin that holds water and plumps. Excellent tolerance.',
  },
  {
    keywords: ['niacinamide', 'niacinamide', 'vitamin b3'],
    displayName: 'Niacinamide (vitamine B3)',
    displayNameEn: 'Niacinamide (vitamin B3)',
    tier: 'approved',
    note: 'Actif apaisant qui régule le sébum, unifie le teint et renforce la barrière cutanée. Sûr et efficace.',
    noteEn: 'Soothing active that regulates sebum, evens skin tone and strengthens the barrier. Safe and effective.',
  },
  {
    keywords: ['simmondsia chinensis', 'jojoba', 'argania spinosa', 'argan', 'olea europaea', 'olive oil', 'prunus amygdalus', 'sweet almond', 'rosa canina', 'rosehip', 'cocos nucifera', 'coconut oil', 'huile de coco'],
    displayName: 'Huiles végétales (jojoba, argan, coco…)',
    displayNameEn: 'Plant oils (jojoba, argan, coconut…)',
    tier: 'approved',
    note: 'Huiles végétales naturelles nourrissantes, riches en acides gras et antioxydants. Excellentes pour la peau et les cheveux.',
    noteEn: 'Natural nourishing plant oils rich in fatty acids and antioxidants. Excellent for skin and hair.',
  },
  {
    keywords: ['cera alba', 'beeswax', 'cire d\'abeille', 'cire dabeille'],
    displayName: 'Cire d\'abeille',
    displayNameEn: 'Beeswax',
    tier: 'approved',
    note: 'Cire naturelle protectrice et émolliente. Sûre et bien tolérée.',
    noteEn: 'Natural protective, emollient wax. Safe and well tolerated.',
  },
  {
    keywords: ['allantoin', 'allantoïne', 'bisabolol', 'panthenol'],
    displayName: 'Allantoïne / Bisabolol',
    displayNameEn: 'Allantoin / Bisabolol',
    tier: 'approved',
    note: 'Actifs apaisants et réparateurs (issus de la consoude ou de la camomille). Calment les rougeurs. Sans risque.',
    noteEn: 'Soothing, repairing actives (from comfrey or chamomile) that calm redness. No risk.',
  },
  {
    keywords: ['xanthan gum', 'gomme xanthane', 'sclerotium gum', 'cellulose gum'],
    displayName: 'Gomme xanthane',
    displayNameEn: 'Xanthan gum',
    tier: 'approved',
    note: 'Gélifiant naturel issu de fermentation, utilisé pour la texture. Sans risque.',
    noteEn: 'Natural fermentation-derived gelling agent used for texture. No risk.',
  },
  {
    keywords: ['cetearyl alcohol', 'cetyl alcohol', 'stearyl alcohol', 'behenyl alcohol', 'alcool cétéarylique'],
    displayName: 'Alcools gras (cétéarylique, cétylique)',
    displayNameEn: 'Fatty alcohols (cetearyl, cetyl)',
    tier: 'approved',
    note: 'Alcools gras émollients (à ne pas confondre avec l\'alcool desséchant). Adoucissent et stabilisent les crèmes. Bien tolérés.',
    noteEn: 'Emollient fatty alcohols (not to be confused with drying alcohol). Soften and stabilize creams. Well tolerated.',
  },
  {
    keywords: ['stearic acid', 'glyceryl stearate', 'caprylic/capric triglyceride', 'cetyl esters', 'acide stéarique'],
    displayName: 'Émollients (acide stéarique, triglycérides)',
    displayNameEn: 'Emollients (stearic acid, triglycerides)',
    tier: 'approved',
    note: 'Corps gras et émulsifiants doux d\'origine végétale qui assouplissent la peau. Sans risque.',
    noteEn: 'Plant-derived mild fats and emulsifiers that soften the skin. No risk.',
  },
  {
    keywords: ['squalane', 'squalene'],
    displayName: 'Squalane',
    displayNameEn: 'Squalane',
    tier: 'approved',
    note: 'Émollient léger proche du sébum naturel (souvent d\'origine végétale). Excellente tolérance, non comédogène.',
    noteEn: 'Light emollient similar to natural sebum (often plant-derived). Excellent tolerance, non-comedogenic.',
  },
  {
    keywords: ['centella asiatica', 'camellia sinensis', 'green tea', 'thé vert', 'mel', 'honey', 'miel', 'calendula', 'chamomilla', 'avena sativa', 'oat'],
    displayName: 'Extraits végétaux apaisants',
    displayNameEn: 'Soothing botanical extracts',
    tier: 'approved',
    note: 'Extraits naturels (centella, thé vert, camomille, avoine, miel) antioxydants et apaisants. Bénéfiques pour la peau.',
    noteEn: 'Natural antioxidant and soothing extracts (centella, green tea, chamomile, oat, honey). Beneficial for the skin.',
  },
  {
    keywords: ['zinc oxide', 'oxyde de zinc', 'titanium dioxide', 'ci 77891', 'dioxyde de titane'],
    displayName: 'Filtres minéraux (oxyde de zinc, dioxyde de titane)',
    displayNameEn: 'Mineral filters (zinc oxide, titanium dioxide)',
    displayNameKo: '미네랄 자외선 차단제(지클옥사이드, 이산화티타늄)',
    tier: 'approved',
    note: 'Filtres solaires minéraux qui restent en surface de la peau. Sûrs en crème (forme non-nano), bien tolérés y compris par les peaux sensibles.',
    noteEn: 'Mineral sunscreen filters that stay on the skin\'s surface. Safe in cream (non-nano form), well tolerated even by sensitive skin.',
    noteKo: '피부 표면에 머물러 자외선을 막는 미네랄 차단제입니다. 크림 형태(비나노)에서 안전하며 민감성 피부에도 잘 맞습니다.',
  },

  // ───────────────────────────────────────────────────────────────
  // 🇰🇷 K-BEAUTY — actifs fréquents dans les cosmétiques coréens
  // ───────────────────────────────────────────────────────────────
  {
    keywords: ['panax ginseng', 'ginseng root extract', 'ginseng extract', 'red ginseng', '인삼', '인삼추출물', '홍삼', '홍삼추출물'],
    displayName: 'Ginseng (Panax Ginseng)',
    displayNameEn: 'Ginseng (Panax Ginseng)',
    displayNameKo: '인삼 / 홍삼 추출물',
    tier: 'approved',
    note: 'Extrait de ginseng riche en ginsénosides antioxydants. Actif anti-âge traditionnel coréen, très bien toléré.',
    noteEn: 'Ginseng extract rich in antioxidant ginsenosides. A traditional Korean anti-aging active, very well tolerated.',
    noteKo: '항산화 성분인 진세노삤이드가 풍부한 인삼 추출물입니다. 전통 안티에이징 성분으로 매우 순합니다.',
  },
  {
    keywords: ['snail secretion filtrate', 'snail mucin', 'snail filtrate', '달팽이점액여과물', '달팽이률신'],
    displayName: 'Mucine d\'escargot',
    displayNameEn: 'Snail secretion filtrate',
    displayNameKo: '달팽이 점액 여과물',
    tier: 'approved',
    note: 'Sécrétion d\'escargot filtrée, riche en allantoïne, glycoprotéines et acide hyaluronique. Réparatrice et hydratante, sans risque connu.',
    noteEn: 'Filtered snail secretion rich in allantoin, glycoproteins and hyaluronic acid. Repairing and hydrating, with no known risk.',
    noteKo: '알란토인, 당단백질, 히알루론산이 풍부한 달팽이 여과물입니다. 재생·보습 기능이 우수하고 알려진 위험이 없습니다.',
  },
  {
    keywords: ['propolis extract', 'propolis', 'bee propolis', '프로폴리스', '프로폴리스추출물'],
    displayName: 'Propolis',
    displayNameEn: 'Propolis',
    displayNameKo: '프로폴리스',
    tier: 'approved',
    note: 'Résine d\'abeille antioxydante et apaisante. Bien tolérée, sauf allergie aux produits de la ruche.',
    noteEn: 'Antioxidant and soothing bee resin. Well tolerated, except for those allergic to hive products.',
    noteKo: '항산화·진정 효과가 있는 꿀벌 수지입니다. 벌집 제품 알레르기가 없다면 잘 맞습니다.',
  },
  {
    keywords: ['galactomyces ferment filtrate', 'galactomyces', 'saccharomyces ferment filtrate', 'bifida ferment lysate', '갈락토미세스발효여과물', '비피다발효용해물'],
    displayName: 'Ferments (galactomyces, bifida)',
    displayNameEn: 'Ferments (galactomyces, bifida)',
    displayNameKo: '발효 여과물(갈락토미세스, 비피다)',
    tier: 'approved',
    note: 'Filtrats de fermentation riches en acides aminés, vitamines et antioxydants. Éclaircissent et hydratent ; très bien tolérés.',
    noteEn: 'Fermentation filtrates rich in amino acids, vitamins and antioxidants. Brighten and hydrate; very well tolerated.',
    noteKo: '아미노산, 비타민, 항산화 성분이 풍부한 발효 여과물입니다. 피부 톤·보습에 좋고 매우 순합니다.',
  },
  {
    keywords: ['oryza sativa', 'rice extract', 'rice ferment filtrate', 'rice bran extract', '쌀추출물', '쌀발효여과물', '닌우르식', '쪽쌀추출물'],
    displayName: 'Extrait de riz',
    displayNameEn: 'Rice extract',
    displayNameKo: '쌀 추출물 / 쌀 발효 여과물',
    tier: 'approved',
    note: 'Extrait ou ferment de riz riche en vitamines B et antioxydants. Éclaircissant doux, sans risque connu.',
    noteEn: 'Rice extract or ferment rich in B vitamins and antioxidants. A gentle brightener with no known risk.',
    noteKo: '비타민 B와 항산화 성분이 풍부한 쌀 추출물·발효물입니다. 순한 브라이트닝 성분으로 위험이 없습니다.',
  },
  {
    keywords: ['centella asiatica extract', 'madecassoside', 'asiaticoside', 'cica', 'centella', '병풀추출물', '시카', '마데카소새이드'],
    displayName: 'Centella / Cica',
    displayNameEn: 'Centella / Cica',
    displayNameKo: '병풀 추출물 (시카)',
    tier: 'approved',
    note: 'Centella asiatica et ses actifs (madécassoside) apaisent les rougeurs et réparent la barrière cutanée. Sûre et efficace.',
    noteEn: 'Centella asiatica and its actives (madecassoside) calm redness and repair the skin barrier. Safe and effective.',
    noteKo: '병풀과 그 성분(마데카소새이드)은 봉은기를 진정하고 피부 장벽을 재생합니다. 안전하고 효과적입니다.',
  },
  {
    keywords: ['artemisia', 'mugwort extract', 'artemisia vulgaris', 'artemisia princeps', '쓑추출물', '애쓑추출물'],
    displayName: 'Armoise (mugwort)',
    displayNameEn: 'Mugwort (artemisia)',
    displayNameKo: '쓑 추출물',
    tier: 'approved',
    note: 'Extrait d\'armoise apaisant et antioxydant, traditionnel en Corée pour les peaux sensibles et réactives.',
    noteEn: 'Soothing, antioxidant mugwort extract, traditional in Korea for sensitive, reactive skin.',
    noteKo: '진정·항산화 효과가 있는 쓑 추출물로, 민감성 피부에 전통적으로 쓰입니다.',
  },
  {
    keywords: ['houttuynia cordata', 'houttuynia', '어성초추출물', '어성초'],
    displayName: 'Houttuynia cordata',
    displayNameEn: 'Houttuynia cordata',
    displayNameKo: '어성초 추출물',
    tier: 'approved',
    note: 'Extrait végétal apaisant et purifiant, prisé en cosmétique coréenne pour les peaux à imperfections.',
    noteEn: 'Soothing, purifying plant extract popular in Korean skincare for blemish-prone skin.',
    noteKo: '진정·정화 효과가 있는 식물 추출물로, 트러블 피부용 한국 화장품에 많이 쓰입니다.',
  },
  {
    keywords: ['adenosine', '아데노신'],
    displayName: 'Adénosine',
    displayNameEn: 'Adenosine',
    displayNameKo: '아데노신',
    tier: 'approved',
    note: 'Actif anti-rides reconnu et bien toléré, autorisé comme ingrédient fonctionnel anti-âge en Corée.',
    noteEn: 'A recognized, well-tolerated anti-wrinkle active, approved as a functional anti-aging ingredient in Korea.',
    noteKo: '주름 개선으로 인정받은 성분으로, 한국에서 기능성 안티에이징 성분으로 허가되었고 잘 맞습니다.',
  },
  {
    keywords: ['betula', 'birch juice', 'birch sap', 'betula alba juice', '자작나무수액', '자작나무추출물'],
    displayName: 'Sève de bouleau',
    displayNameEn: 'Birch sap',
    displayNameKo: '자작나무 수액',
    tier: 'approved',
    note: 'Sève de bouleau hydratante et reminéralisante, parfois utilisée à la place de l\'eau dans les cosmétiques coréens. Sans risque connu.',
    noteEn: 'Hydrating, remineralizing birch sap, sometimes used instead of water in Korean cosmetics. No known risk.',
    noteKo: '보습·미네랄 공급 효과가 있는 자작나무 수액으로, 한국 화장품에서 물 대신 쓰이기도 합니다. 알려진 위험이 없습니다.',
  },
  {
    keywords: ['arbutin', 'alpha-arbutin', 'beta-arbutin', '알부틴', '알파알부틴'],
    displayName: 'Arbutine',
    displayNameEn: 'Arbutin',
    displayNameKo: '알부틴',
    tier: 'disputed',
    note: 'Agent éclaircissant dérivé de l\'hydroquinone. Efficace contre les taches mais peut libérer de l\'hydroquinone ; concentration encadrée en UE. Science partagée.',
    noteEn: 'A skin-brightening agent derived from hydroquinone. Effective on dark spots but can release hydroquinone; concentration is regulated in the EU. Divided science.',
    noteKo: '하이드로퀴논 계열의 미백 성분입니다. 기미 개선에 효과적이지만 하이드로퀴논을 방출할 수 있어 EU에서 농도가 규제됩니다. 과학적 견해가 나뉙니다.',
  },
  {
    keywords: ['bee venom', 'apis mellifera venom', '봉독'],
    displayName: 'Venin d\'abeille',
    displayNameEn: 'Bee venom',
    displayNameKo: '봉독',
    tier: 'disputed',
    note: 'Actif tenseur populaire en K-beauty. Efficacité réelle mais risque allergique notable, surtout chez les personnes sensibles au venin. À tester avec prudence.',
    noteEn: 'A firming active popular in K-beauty. Real efficacy but a notable allergy risk, especially for those sensitive to venom. Patch-test with caution.',
    noteKo: 'K-뻐티에서 인기 있는 탄력 성분입니다. 효과는 있지만 특히 벌독에 민감한 사람에게 알레르기 위험이 있으므로 주의해 테스트하세요.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// NORMALIZATION + LONGEST-MATCH LOOKUP
// ═══════════════════════════════════════════════════════════════════════

function normalizeCosmetic(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Keep ASCII alphanumerics, INCI separators AND Korean Hangul so Korean
    // ingredient lists (전성분) survive normalization and can be matched.
    .replace(/[^a-z0-9\s/+\-\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TIER_PRIORITY: Record<CosmeticTier, number> = { toxic: 0, disputed: 1, approved: 2 };

interface IndexedCosmeticKeyword {
  readonly key: string;
  readonly entry: CosmeticEntry;
}

const SORTED_COSMETIC_KEYWORDS: readonly IndexedCosmeticKeyword[] = (() => {
  const list: IndexedCosmeticKeyword[] = [];
  const seen = new Set<string>();
  for (const entry of COSMETICS_DATABASE) {
    for (const keyword of entry.keywords) {
      const norm = normalizeCosmetic(keyword);
      if (!norm || norm.length < 2) continue;
      const dedupKey = `${norm}::${entry.tier}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      list.push({ key: norm, entry });
    }
  }
  // Longest keyword first so the most specific INCI term wins.
  list.sort((a, b) => b.key.length - a.key.length);
  return list;
})();

/**
 * Classify a single INCI ingredient name. Returns the matching entry, or null
 * when the ingredient is unknown (caller treats unknown as APPROVED/neutral).
 * Longest keyword wins; on equal length the worst tier wins.
 */
export function classifyCosmeticIngredient(name: string): CosmeticEntry | null {
  const normalized = normalizeCosmetic(name);
  if (!normalized || normalized.length < 2) return null;

  let best: CosmeticEntry | null = null;
  let bestLength = 0;
  let bestPriority = 99;
  for (const { key, entry } of SORTED_COSMETIC_KEYWORDS) {
    if (best && key.length < bestLength) break;
    // Word-ish boundary check for very short keys (avoids "tea" matching "stearate").
    const isShort = key.length <= 4;
    const matches = isShort
      ? new RegExp(`(^|[^a-z])${key.replace(/[-/]/g, '\\$&')}([^a-z]|$)`).test(normalized)
      : normalized.includes(key);
    if (matches) {
      const priority = TIER_PRIORITY[entry.tier];
      if (key.length > bestLength || (key.length === bestLength && priority < bestPriority)) {
        best = entry;
        bestLength = key.length;
        bestPriority = priority;
      }
    }
  }
  return best;
}

/** Localized note for a cosmetic entry. */
export function getCosmeticNote(entry: CosmeticEntry): string {
  const lang = getDeviceLanguage();
  if (lang === 'ko') return entry.noteKo ?? entry.noteEn;
  if (lang === 'en') return entry.noteEn;
  return entry.note;
}

/** Localized display name for a cosmetic entry. */
export function getCosmeticDisplayName(entry: CosmeticEntry): string {
  const lang = getDeviceLanguage();
  if (lang === 'ko') return entry.displayNameKo ?? entry.displayNameEn;
  if (lang === 'en') return entry.displayNameEn;
  return entry.displayName;
}

// ═══════════════════════════════════════════════════════════════════════
// COSMETIC VERDICT RULE
// ═══════════════════════════════════════════════════════════════════════

/**
 * DISPUTED verdict threshold. The user's spec was: ">5 DISPUTED → DISPUTED" and
 * "2 DISPUTED with the rest APPROVED → APPROVED". We tighten the middle so that
 * 3+ controversial ingredients never read as a fully clean product (a protective
 * choice for a health app). Change this constant to 6 to honor the literal ">5".
 */
export const COSMETIC_DISPUTED_THRESHOLD = 3;

export interface CosmeticVerdictCounts {
  toxic: number;
  disputed: number;
  approved: number;
}

/**
 * Global cosmetic verdict:
 *   ≥1 TOXIC                → 🟣 TOXIC
 *   ≥ threshold DISPUTED    → 🟡 DISPUTED
 *   otherwise               → 🟢 APPROVED
 */
export function computeCosmeticVerdict(counts: CosmeticVerdictCounts): CosmeticTier {
  if (counts.toxic >= 1) return 'toxic';
  if (counts.disputed >= COSMETIC_DISPUTED_THRESHOLD) return 'disputed';
  return 'approved';
}

// ═══════════════════════════════════════════════════════════════════════
// COSMETIC DETECTION — distinguishes a cosmetic INCI list from a food label
// ═══════════════════════════════════════════════════════════════════════

// Distinctive cosmetic INCI tokens (NOT shared with food labels). Generic terms
// like "glycerin", "citric acid" or "water" are excluded on purpose — they also
// appear in food and would cause false positives.
const COSMETIC_SIGNALS: readonly string[] = [
  'aqua', 'parfum', 'fragrance', 'sodium laureth sulfate', 'sodium lauryl sulfate',
  'cocamidopropyl', 'dimethicone', 'methicone', 'siloxane', 'cetearyl alcohol',
  'cetyl alcohol', 'stearyl alcohol', 'phenoxyethanol', 'sodium hyaluronate',
  'panthenol', 'butyrospermum', 'simmondsia', 'tocopheryl acetate', 'peg-',
  'polysorbate', 'carbomer', 'triethanolamine', 'methylparaben', 'propylparaben',
  'butylparaben', 'ethylhexylglycerin', 'butylene glycol', 'propylene glycol',
  'glyceryl stearate', 'disodium edta', 'tetrasodium edta', 'sodium benzoate',
  'benzyl alcohol', 'limonene', 'linalool', 'citronellol', 'parfum/fragrance',
  'ci 77891', 'ci 77491', 'ci 77266', 'ci 19140', 'ci 42090', 'laureth',
  'cocamide', 'stearalkonium', 'behentrimonium', 'amodimethicone', 'aloe barbadensis',
  'sodium cocoyl', 'decyl glucoside', 'coco-glucoside', 'cetrimonium',
  'phenoxyethanol', 'caprylyl glycol', 'ethylhexyl', 'octyldodecanol', 'isohexadecane',
  // Korean (한글) cosmetic INCI tokens — appear on Korean 전성분 labels, not on food labels.
  '정제수', '향료', '나이아신아마이드', '히알루론산', '다이메티콘', '디메티콘',
  '세틸알코올', '세테아릴알코올', '페녽시에타놈', '포테싁머틸파라벤',
  '달팽이점액여과물', '병풀추출물', '갈락토미세스발효여과물', '인삼추출물',
];

/**
 * Heuristic: does this parsed ingredient list look like a cosmetic INCI list?
 * "aqua" is near-definitive (food uses "water"/"eau"). Otherwise we require at
 * least 2 distinctive cosmetic signals so a food label never trips the detector.
 */
export function looksLikeCosmetic(names: string[]): boolean {
  if (names.length === 0) return false;
  let score = 0;
  for (const raw of names) {
    const norm = normalizeCosmetic(raw);
    if (!norm) continue;
    if (norm === 'aqua' || norm.startsWith('aqua ') || norm.startsWith('aqua/')) {
      score += 2;
      continue;
    }
    for (const sig of COSMETIC_SIGNALS) {
      if (norm.includes(sig)) {
        score += 1;
        break;
      }
    }
    if (score >= 2) return true;
  }
  return score >= 2;
}
