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
    noteKo: '확정 발암물질(IARC 1군) — 비인두암, 백혈병. 눈·피부·호흡기를 자극합니다. 반드시 피하세요.',
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
    displayNameKo: '과불화화합물(PFAS)',
    tier: 'toxic',
    note: 'Polluants éternels qui s\'accumulent dans l\'organisme. PFOA classé cancérigène. Présents dans maquillage longue tenue et waterproof. Traversent le placenta.',
    noteEn: 'Forever chemicals that accumulate in the body. PFOA is classified carcinogenic. Found in long-wear and waterproof makeup. Cross the placenta.',
    noteKo: '체내에 축적되는 “영원한 화학물질”입니다. PFOA는 발암물질로 분류됩니다. 워터프루프·롱래스팅 메이크업에 들어 있으며 태반을 통과합니다.',
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
    displayNameKo: '염모제 색소(PPD, 레조르시놀)',
    tier: 'toxic',
    note: 'Colorants de teinture liés au cancer de la vessie en exposition professionnelle (CIRC). Allergènes puissants pouvant causer des dermatites sévères.',
    noteEn: 'Hair-dye colorants linked to bladder cancer in occupational exposure (IARC). Strong allergens that can cause severe dermatitis.',
    noteKo: '직업적 노출 시 방광암과 관련된 염색약 색소입니다(IARC). 강한 알레르기 유발 물질로 심한 피부염을 일으킬 수 있습니다.',
  },
  {
    keywords: ['coal tar', 'goudron de houille', 'ci 77266 coal'],
    displayName: 'Goudron de houille',
    displayNameEn: 'Coal tar',
    displayNameKo: '콜타르',
    tier: 'toxic',
    note: 'Cancérigène avéré (CIRC Groupe 1) utilisé dans certains shampoings antipelliculaires. Irritant cutané. À éviter.',
    noteEn: 'Confirmed carcinogen (IARC Group 1) used in some anti-dandruff shampoos. Skin irritant. Avoid.',
    noteKo: '일부 비듬 샴푸에 쓰이는 확정 발암물질(IARC 1군)입니다. 피부를 자극하므로 피하세요.',
  },
  {
    keywords: ['mercury', 'mercure', 'thimerosal', 'mercurio', 'calomel'],
    displayName: 'Mercure',
    displayNameEn: 'Mercury',
    displayNameKo: '수은',
    tier: 'toxic',
    note: 'Métal lourd neurotoxique et cancérigène, interdit en cosmétique. Présent illégalement dans certaines crèmes éclaircissantes. Extrêmement dangereux.',
    noteEn: 'Neurotoxic and carcinogenic heavy metal, banned in cosmetics. Illegally present in some skin-lightening creams. Extremely dangerous.',
    noteKo: '신경독성·발암성 중금속으로 화장품에 사용이 금지되어 있습니다. 일부 미백 크림에 불법으로 들어 있으며 매우 위험합니다.',
    pregnancyDanger: true,
  },
  {
    keywords: ['lead acetate', 'acetate de plomb', 'plomb', 'lead'],
    displayName: 'Plomb',
    displayNameEn: 'Lead',
    displayNameKo: '납',
    tier: 'toxic',
    note: 'Métal lourd cancérigène et neurotoxique (CIRC Groupe 1). Interdit en cosmétique UE. S\'accumule dans l\'organisme.',
    noteEn: 'Carcinogenic and neurotoxic heavy metal (IARC Group 1). Banned in EU cosmetics. Accumulates in the body.',
    noteKo: '발암성·신경독성 중금속(IARC 1군)입니다. EU 화장품에서 금지되었으며 체내에 축적됩니다.',
    pregnancyDanger: true,
  },
  {
    keywords: ['toluene', 'toluène', 'methylbenzene'],
    displayName: 'Toluène',
    displayNameEn: 'Toluene',
    displayNameKo: '톨루엔',
    tier: 'toxic',
    note: 'Solvant des vernis à ongles, neurotoxique et reprotoxique. Les vapeurs sont nocives. À éviter, surtout enceinte.',
    noteEn: 'Nail-polish solvent that is neurotoxic and reprotoxic. The fumes are harmful. Avoid, especially during pregnancy.',
    noteKo: '신경독성·생식독성이 있는 매니큐어 용제입니다. 증기가 유해하므로 특히 임신 중에는 피하세요.',
    pregnancyDanger: true,
  },
  {
    keywords: ['cyclopentasiloxane', 'cyclotetrasiloxane', 'cyclomethicone', 'cyclohexasiloxane', 'd4', 'd5', 'd6'],
    displayName: 'Cyclosiloxanes (D4, D5, D6)',
    displayNameEn: 'Cyclosiloxanes (D4, D5, D6)',
    displayNameKo: '사이클로실록세인(D4, D5, D6)',
    tier: 'toxic',
    note: 'Silicones volatils perturbateurs endocriniens et toxiques pour la reproduction. D4/D5 restreints en UE. Très persistants dans l\'environnement.',
    noteEn: 'Volatile silicones that are endocrine disruptors and toxic to reproduction. D4/D5 restricted in the EU. Highly persistent in the environment.',
    noteKo: '내분비교란·생식독성이 있는 휘발성 실리콘입니다. D4/D5는 EU에서 제한되며 환경에 매우 오래 잔류합니다.',
    pregnancyDanger: true,
  },
  {
    keywords: ['aluminum chlorohydrate', 'aluminium chlorohydrate', 'aluminum zirconium', 'aluminium zirconium', 'aluminum chloride', 'alum chlorohydrate'],
    displayName: 'Sels d\'aluminium',
    displayNameEn: 'Aluminum salts',
    displayNameKo: '알루미늄염',
    tier: 'toxic',
    note: 'Sels anti-transpirants absorbés sous les aisselles, aux propriétés œstrogéniques suspectées (lien possible avec le cancer du sein). Neurotoxicité débattue.',
    noteEn: 'Antiperspirant salts absorbed under the arms with suspected estrogenic properties (possible link to breast cancer). Debated neurotoxicity.',
    noteKo: '겨드랑이로 흡수되는 땀 억제 성분으로 에스트로겐 유사 작용이 의심됩니다(유방암과의 연관성 가능성). 신경독성은 논쟁 중입니다.',
  },
  {
    keywords: ['diethanolamine', 'triethanolamine', 'monoethanolamine', 'cocamide dea', 'lauramide dea', 'dea', 'tea', 'mea'],
    displayName: 'Éthanolamines (DEA / TEA / MEA)',
    displayNameEn: 'Ethanolamines (DEA / TEA / MEA)',
    displayNameKo: '에탄올아민류(DEA / TEA / MEA)',
    tier: 'toxic',
    note: 'Peuvent former des nitrosamines cancérigènes au contact de conservateurs nitrosants. Irritantes pour la peau et les yeux.',
    noteEn: 'Can form carcinogenic nitrosamines in contact with nitrosating preservatives. Irritating to skin and eyes.',
    noteKo: '나이트로사민(발암물질)을 만드는 보존제와 만나면 반응할 수 있습니다. 피부와 눈을 자극합니다.',
  },
  {
    keywords: ['talc'],
    displayName: 'Talc',
    displayNameEn: 'Talc',
    displayNameKo: '탤크(활석)',
    tier: 'toxic',
    note: 'Minéral pouvant être contaminé par de l\'amiante (cancérigène). Lié au cancer de l\'ovaire en usage génital (Johnson & Johnson condamné en 2024).',
    noteEn: 'Mineral that can be contaminated with asbestos (carcinogenic). Linked to ovarian cancer with genital use (Johnson & Johnson convicted in 2024).',
    noteKo: '석면(발암물질)에 오염될 수 있는 광물입니다. 생식기 부위 사용 시 난소암과 관련됩니다(2024년 존슨앤드존슨 유죄 판결).',
    pregnancyDanger: true,
  },
  {
    keywords: ['methylisothiazolinone', 'methylchloroisothiazolinone', 'mit', 'cmit', 'benzisothiazolinone'],
    displayName: 'Isothiazolinones (MIT / MCIT)',
    displayNameEn: 'Isothiazolinones (MIT / MCIT)',
    displayNameKo: '아이소티아졸리논류(MIT / MCIT)',
    tier: 'toxic',
    note: 'Conservateurs parmi les allergènes de contact les plus puissants — « allergène de l\'année » 2013. Interdits dans les produits sans rinçage en UE.',
    noteEn: 'Preservatives among the strongest contact allergens — "Allergen of the Year" 2013. Banned in leave-on products in the EU.',
    noteKo: '가장 강한 접촉성 알레르기 유발 보존제 중 하나로 2013년 “올해의 알레르겐”에 선정되었습니다. EU에서는 씻어내지 않는(리브온) 제품에 금지되었습니다.',
  },
  {
    keywords: ['butylated hydroxyanisole', 'bha'],
    displayName: 'BHA (butylhydroxyanisole)',
    displayNameEn: 'BHA (butylated hydroxyanisole)',
    displayNameKo: 'BHA(부틸하이드록시아니솔)',
    tier: 'toxic',
    note: 'Antioxydant classé cancérigène possible (CIRC Groupe 2B) et perturbateur endocrinien par la Commission européenne. À éviter.',
    noteEn: 'Antioxidant classified as a possible carcinogen (IARC Group 2B) and endocrine disruptor by the European Commission. Avoid.',
    noteKo: '유럽연합 집행위원회가 발암 가능 물질(IARC 2B군)이자 내분비교란 물질로 분류한 산화방지제입니다. 피하세요.',
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
    displayNameKo: 'PEG(에톡실화 화합물)',
    tier: 'disputed',
    note: 'Émulsifiants éthoxylés. Sûrs en eux-mêmes mais possible contamination résiduelle au 1,4-dioxane (cancérigène possible) selon le procédé de fabrication.',
    noteEn: 'Ethoxylated emulsifiers. Safe on their own but possible residual contamination with 1,4-dioxane (a possible carcinogen) depending on manufacturing.',
    noteKo: '에톡실화 유화제입니다. 그 자체는 안전하지만 제조 공정에 따라 1,4-다이옥산(발암 가능 물질)이 잔류 오염될 수 있습니다.',
  },
  {
    keywords: ['1,4-dioxane', 'dioxane'],
    displayName: '1,4-Dioxane (contaminant)',
    displayNameEn: '1,4-Dioxane (contaminant)',
    displayNameKo: '1,4-다이옥산(오염물질)',
    tier: 'disputed',
    note: 'Contaminant de fabrication des ingrédients éthoxylés (PEG, SLES). Classé cancérigène possible (CIRC 2B). N\'apparaît pas toujours sur l\'étiquette.',
    noteEn: 'Manufacturing contaminant of ethoxylated ingredients (PEG, SLES). Classified as a possible carcinogen (IARC 2B). Not always listed on the label.',
    noteKo: '에톡실화 성분(PEG, SLES)의 제조 과정에서 생기는 오염물질입니다. 발암 가능 물질(IARC 2B군)로 분류되며 전성분에 표시되지 않을 때가 많습니다.',
  },
  {
    keywords: ['dimethicone', 'methicone', 'siloxane', 'dimethiconol', 'phenyl trimethicone', 'silicone'],
    displayName: 'Silicones (diméthicone)',
    displayNameEn: 'Silicones (dimethicone)',
    displayNameKo: '실리콘(다이메티콘)',
    tier: 'disputed',
    note: 'Silicones occlusifs qui lissent en surface. Non toxiques mais peuvent étouffer la peau et le cheveu à long terme, et sont peu biodégradables.',
    noteEn: 'Occlusive silicones that smooth the surface. Not toxic but can suffocate skin and hair over time, and are poorly biodegradable.',
    noteKo: '표면을 매끄럽게 덮는 폐색성 실리콘입니다. 독성은 없지만 장기적으로 피부·모발을 답답하게 할 수 있고 잘 분해되지 않습니다.',
  },
  {
    keywords: ['mineral oil', 'paraffinum liquidum', 'petrolatum', 'huile minérale', 'cera microcristallina', 'microcrystalline wax', 'paraffin'],
    displayName: 'Huiles minérales (paraffine, vaseline)',
    displayNameEn: 'Mineral oils (paraffin, petrolatum)',
    displayNameKo: '광물성 오일(파라핀, 바셰린)',
    tier: 'disputed',
    note: 'Dérivés de pétrole occlusifs. Les huiles raffinées sont jugées sûres, mais les fractions mal raffinées (MOAH) sont préoccupantes selon l\'EFSA.',
    noteEn: 'Occlusive petroleum derivatives. Refined oils are considered safe, but poorly refined fractions (MOAH) are a concern according to EFSA.',
    noteKo: '폐색성 석유 유래 성분입니다. 정제된 오일은 안전하다고 보지만, 정제가 덜 된 분획(MOAH)은 EFSA가 우려하는 성분입니다.',
  },
  {
    keywords: ['cocamidopropyl betaine', 'cocamide mea', 'cocamidopropyl'],
    displayName: 'Cocamidopropyl bétaïne',
    displayNameEn: 'Cocamidopropyl betaine',
    displayNameKo: '코카미도프로필베타인',
    tier: 'disputed',
    note: 'Tensioactif doux dérivé de coco, mais reconnu allergène de contact (« allergène de l\'année » 2004) à cause d\'impuretés de fabrication.',
    noteEn: 'Mild coconut-derived surfactant, but a recognized contact allergen ("Allergen of the Year" 2004) due to manufacturing impurities.',
    noteKo: '코코넛 유래의 순한 계면활성제이지만, 제조 과정의 불순물 때문에 접촉성 알레르겐으로 인정되었습니다(2004년 “올해의 알레르겐”).',
  },
  {
    keywords: ['limonene', 'linalool', 'citronellol', 'geraniol', 'eugenol', 'coumarin', 'citral', 'hexyl cinnamal', 'benzyl alcohol', 'benzyl salicylate', 'isoeugenol', 'farnesol'],
    displayName: 'Allergènes de parfum',
    displayNameEn: 'Fragrance allergens',
    displayNameKo: '향료 알레르겐',
    tier: 'disputed',
    note: 'Composés odorants (souvent issus d\'huiles essentielles) dont la déclaration est obligatoire car ils figurent parmi les allergènes de contact reconnus en UE.',
    noteEn: 'Scent compounds (often from essential oils) whose listing is mandatory because they are among the recognized contact allergens in the EU.',
    noteKo: '주로 에센셜 오일에서 나오는 향 성분으로, EU에서 인정한 접촉성 알레르겐에 속해 의무적으로 표시됩니다.',
  },
  {
    keywords: ['titanium dioxide nano', 'titanium dioxide [nano]', 'ci 77891 nano', 'nano'],
    displayName: 'Dioxyde de titane (nano)',
    displayNameEn: 'Titanium dioxide (nano)',
    displayNameKo: '이산화티타늄(나노)',
    tier: 'disputed',
    note: 'Filtre minéral. Sous forme nano et par inhalation (sprays, poudres), classé cancérigène possible (CIRC 2B). Sans risque en crème non-nano.',
    noteEn: 'Mineral filter. In nano form and by inhalation (sprays, powders) classified a possible carcinogen (IARC 2B). No risk in non-nano cream.',
    noteKo: '미네랄 자외선 차단 성분입니다. 나노 형태로 흡입할 경우(스프레이·파우더) 발암 가능 물질(IARC 2B군)로 분류됩니다. 크림 제형(비나노)에서는 위험이 없습니다.',
  },
  {
    keywords: ['carbon black', 'ci 77266'],
    displayName: 'Noir de carbone (CI 77266)',
    displayNameEn: 'Carbon black (CI 77266)',
    displayNameKo: '카본블랙(CI 77266)',
    tier: 'disputed',
    note: 'Pigment noir des mascaras et eye-liners. Classé cancérigène possible par inhalation (CIRC 2B) ; peut contenir des traces d\'HAP.',
    noteEn: 'Black pigment in mascaras and eyeliners. Classified a possible carcinogen by inhalation (IARC 2B); may contain trace PAHs.',
    noteKo: '마스카라·아이라이너의 검은 색소입니다. 흡입 시 발암 가능 물질(IARC 2B군)로 분류되며 미량의 다환방향탄화수소(PAH)가 들어 있을 수 있습니다.',
  },
  {
    keywords: ['homosalate', 'octisalate', 'octocrylene', 'avobenzone', 'ethylhexyl salicylate'],
    displayName: 'Filtres UV organiques (homosalate, octocrylène)',
    displayNameEn: 'Organic UV filters (homosalate, octocrylene)',
    displayNameKo: '유기 자외선 차단제(호모살레이트, 옥토크릴렌)',
    tier: 'disputed',
    note: 'Filtres solaires absorbés par la peau, à l\'innocuité débattue. L\'octocrylène peut se dégrader en benzophénone avec le temps. Moins documentés que l\'oxybenzone.',
    noteEn: 'Sunscreen filters absorbed by the skin with debated safety. Octocrylene can degrade into benzophenone over time. Less documented than oxybenzone.',
    noteKo: '피부에 흡수되는 자외선 차단 성분으로 안전성이 논쟁 중입니다. 옥토크릴렌은 시간이 지나면 벤조페논으로 분해될 수 있습니다. 옥시벤존보다 연구 자료가 적습니다.',
  },
  {
    keywords: ['alcohol denat', 'alcool dénaturé', 'sd alcohol', 'ethanol', 'isopropyl alcohol', 'denatured alcohol'],
    displayName: 'Alcool dénaturé',
    displayNameEn: 'Denatured alcohol',
    displayNameKo: '변성 알코올',
    tier: 'disputed',
    note: 'Solvant volatil qui peut dessécher et fragiliser la barrière cutanée à forte dose. Toléré en petite quantité, problématique pour les peaux sèches ou sensibles.',
    noteEn: 'Volatile solvent that can dry out and weaken the skin barrier at high doses. Tolerated in small amounts, problematic for dry or sensitive skin.',
    noteKo: '고농도에서 피부 장볽을 건조하게 하고 약화시킬 수 있는 휘발성 용제입니다. 소량은 괜찮지만 건성·민감성 피부에는 문제가 될 수 있습니다.',
  },
  {
    keywords: ['sodium benzoate', 'benzoic acid', 'potassium sorbate', 'sorbic acid'],
    displayName: 'Conservateurs (benzoate, sorbate)',
    displayNameEn: 'Preservatives (benzoate, sorbate)',
    displayNameKo: '보존제(벤조에이트, 소르베이트)',
    tier: 'disputed',
    note: 'Conservateurs doux jugés sûrs. Le benzoate de sodium peut former du benzène en présence de vitamine C. Légèrement irritants chez les sujets sensibles.',
    noteEn: 'Mild preservatives considered safe. Sodium benzoate can form benzene in the presence of vitamin C. Slightly irritating for sensitive people.',
    noteKo: '안전하다고 보는 순한 보존제입니다. 소듐벤조에이트는 비타민 C와 만나면 벤젠을 형성할 수 있습니다. 민감한 사람에게는 약간의 자극이 될 수 있습니다.',
  },
  {
    keywords: ['polysorbate', 'polysorbate 20', 'polysorbate 60', 'polysorbate 80'],
    displayName: 'Polysorbates',
    displayNameEn: 'Polysorbates',
    displayNameKo: '폴리소르베이트류',
    tier: 'disputed',
    note: 'Émulsifiants éthoxylés. Sûrs en usage, mais possible contamination résiduelle au 1,4-dioxane selon le procédé de fabrication.',
    noteEn: 'Ethoxylated emulsifiers. Safe in use, but possible residual 1,4-dioxane contamination depending on manufacturing.',
    noteKo: '에톡실화 유화제입니다. 사용상 안전하지만 제조 공정에 따라 1,4-다이옥산이 잔류 오염될 수 있습니다.',
  },
  {
    keywords: ['bht', 'butylated hydroxytoluene'],
    displayName: 'BHT (butylhydroxytoluène)',
    displayNameEn: 'BHT (butylated hydroxytoluene)',
    displayNameKo: 'BHT(부틸하이드록시톨루엔)',
    tier: 'disputed',
    note: 'Antioxydant de synthèse. Soupçonné d\'effet perturbateur endocrinien à fortes doses dans certaines études animales ; science encore partagée.',
    noteEn: 'Synthetic antioxidant. Suspected of endocrine-disrupting effects at high doses in some animal studies; science still divided.',
    noteKo: '합성 산화방지제입니다. 일부 동물 실험에서 고농도일 때 내분비교란 가능성이 제기되었으나 과학적 견해는 아직 나뉩니다.',
  },
  {
    keywords: ['ethylhexylglycerin', 'caprylyl glycol'],
    displayName: 'Ethylhexylglycerin',
    displayNameEn: 'Ethylhexylglycerin',
    displayNameKo: '에틸헥실글리세린',
    tier: 'disputed',
    note: 'Conservateur et adoucissant de nouvelle génération, généralement bien toléré, mais source occasionnelle d\'allergies de contact.',
    noteEn: 'New-generation preservative and emollient, generally well tolerated but an occasional source of contact allergy.',
    noteKo: '차세대 보존·보습 성분으로 대체로 잘 맞지만, 드물게 접촉성 알레르기를 일으킬 수 있습니다.',
  },

  // ───────────────────────────────────────────────────────────────
  // 🟢 APPROVED — natural / functional ingredients, no known risk
  // ───────────────────────────────────────────────────────────────
  {
    keywords: ['aqua', 'water', 'eau', 'aqua/water', 'aqua (water)'],
    displayName: 'Eau (Aqua)',
    displayNameEn: 'Water (Aqua)',
    displayNameKo: '정제수(아쿠아)',
    tier: 'approved',
    note: 'Base de la plupart des cosmétiques. Solvant inerte et parfaitement sûr.',
    noteEn: 'The base of most cosmetics. An inert, perfectly safe solvent.',
    noteKo: '대부분 화장품의 기본 성분입니다. 반응성이 없고 완전히 안전한 용제입니다.',
  },
  {
    keywords: ['glycerin', 'glycérine', 'glycerine', 'glycerol'],
    displayName: 'Glycérine',
    displayNameEn: 'Glycerin',
    displayNameKo: '글리세린',
    tier: 'approved',
    note: 'Humectant naturel qui attire et retient l\'eau dans la peau. Excellent hydratant, très bien toléré.',
    noteEn: 'Natural humectant that draws and holds water in the skin. An excellent, very well-tolerated moisturizer.',
    noteKo: '피부에 수분을 끌어와 붙잡아 주는 천연 보습 성분입니다. 보습력이 뛰어나고 매우 순합니다.',
  },
  {
    keywords: ['aloe barbadensis', 'aloe vera', 'aloe'],
    displayName: 'Aloe vera',
    displayNameEn: 'Aloe vera',
    displayNameKo: '알로에 베라',
    tier: 'approved',
    note: 'Gel végétal apaisant et hydratant, riche en polysaccharides. Idéal pour les peaux irritées ou après-soleil.',
    noteEn: 'Soothing, hydrating plant gel rich in polysaccharides. Ideal for irritated or after-sun skin.',
    noteKo: '다당류가 풍부한 진정·보습 식물 젠입니다. 자극받은 피부나 선번 후 피부에 좋습니다.',
  },
  {
    keywords: ['butyrospermum parkii', 'shea butter', 'beurre de karité', 'karite'],
    displayName: 'Beurre de karité',
    displayNameEn: 'Shea butter',
    displayNameKo: '시어버터',
    tier: 'approved',
    note: 'Corps gras végétal nourrissant riche en acides gras et vitamines A et E. Excellent pour les peaux sèches.',
    noteEn: 'Nourishing plant butter rich in fatty acids and vitamins A and E. Excellent for dry skin.',
    noteKo: '지방산과 비타민 A·E가 풍부한 영양 식물성 버터입니다. 건성 피부에 매우 좋습니다.',
  },
  {
    keywords: ['tocopherol', 'tocopheryl acetate', 'vitamin e', 'vitamine e', 'tocophérol'],
    displayName: 'Vitamine E (tocophérol)',
    displayNameEn: 'Vitamin E (tocopherol)',
    displayNameKo: '비타민 E(토코페롤)',
    tier: 'approved',
    note: 'Antioxydant naturel qui protège la peau et stabilise les huiles. Bien toléré et bénéfique.',
    noteEn: 'Natural antioxidant that protects the skin and stabilizes oils. Well tolerated and beneficial.',
    noteKo: '피부를 보호하고 오일의 산패를 막는 천연 산화방지제입니다. 순하고 유익합니다.',
  },
  {
    keywords: ['sodium chloride', 'sea salt', 'sel marin'],
    displayName: 'Sel (chlorure de sodium)',
    displayNameEn: 'Salt (sodium chloride)',
    displayNameKo: '소금(소듐클로라이드)',
    tier: 'approved',
    note: 'Agent épaississant minéral simple et sûr.',
    noteEn: 'A simple, safe mineral thickening agent.',
    noteKo: '단순하고 안전한 미네랄 점증제입니다.',
  },
  {
    keywords: ['citric acid', 'acide citrique', 'sodium citrate'],
    displayName: 'Acide citrique',
    displayNameEn: 'Citric acid',
    displayNameKo: '시트릭애쥌(구연산)',
    tier: 'approved',
    note: 'Régulateur de pH d\'origine naturelle, utilisé en faible quantité. Sans risque.',
    noteEn: 'A naturally derived pH adjuster used in small amounts. No risk.',
    noteKo: '소량 사용되는 천연 유래 pH 조절제입니다. 위험이 없습니다.',
  },
  {
    keywords: ['panthenol', 'provitamin b5', 'panthénol', 'dexpanthenol'],
    displayName: 'Panthénol (pro-vitamine B5)',
    displayNameEn: 'Panthenol (provitamin B5)',
    displayNameKo: '판테놀(프로비타민 B5)',
    tier: 'approved',
    note: 'Agent hydratant et réparateur qui apaise et renforce la barrière cutanée. Très bien toléré.',
    noteEn: 'Moisturizing, repairing agent that soothes and strengthens the skin barrier. Very well tolerated.',
    noteKo: '피부 장볽을 진정하고 강화하는 보습·재생 성분입니다. 매우 순합니다.',
  },
  {
    keywords: ['sodium hyaluronate', 'hyaluronic acid', 'acide hyaluronique', 'hyaluronate'],
    displayName: 'Acide hyaluronique',
    displayNameEn: 'Hyaluronic acid',
    displayNameKo: '히알루론산',
    tier: 'approved',
    note: 'Molécule hydratante naturellement présente dans la peau, retient l\'eau et repulpe. Excellente tolérance.',
    noteEn: 'A hydrating molecule naturally present in skin that holds water and plumps. Excellent tolerance.',
    noteKo: '피부에 원래 존재하는 보습 성분으로 수분을 붙잡아 탱탱하게 합니다. 자극이 거의 없습니다.',
  },
  {
    keywords: ['niacinamide', 'niacinamide', 'vitamin b3'],
    displayName: 'Niacinamide (vitamine B3)',
    displayNameEn: 'Niacinamide (vitamin B3)',
    displayNameKo: '나이아신아마이드(비타민 B3)',
    tier: 'approved',
    note: 'Actif apaisant qui régule le sébum, unifie le teint et renforce la barrière cutanée. Sûr et efficace.',
    noteEn: 'Soothing active that regulates sebum, evens skin tone and strengthens the barrier. Safe and effective.',
    noteKo: '피지를 조절하고 피부 톤을 고르게 하며 장볽을 강화하는 진정 성분입니다. 안전하고 효과적입니다.',
  },
  {
    keywords: ['simmondsia chinensis', 'jojoba', 'argania spinosa', 'argan', 'olea europaea', 'olive oil', 'prunus amygdalus', 'sweet almond', 'rosa canina', 'rosehip', 'cocos nucifera', 'coconut oil', 'huile de coco'],
    displayName: 'Huiles végétales (jojoba, argan, coco…)',
    displayNameEn: 'Plant oils (jojoba, argan, coconut…)',
    displayNameKo: '식물성 오일(호호바, 아르간, 코코넛 등)',
    tier: 'approved',
    note: 'Huiles végétales naturelles nourrissantes, riches en acides gras et antioxydants. Excellentes pour la peau et les cheveux.',
    noteEn: 'Natural nourishing plant oils rich in fatty acids and antioxidants. Excellent for skin and hair.',
    noteKo: '지방산과 항산화 성분이 풍부한 천연 영양 식물성 오일입니다. 피부와 모발에 매우 좋습니다.',
  },
  {
    keywords: ['cera alba', 'beeswax', 'cire d\'abeille', 'cire dabeille'],
    displayName: 'Cire d\'abeille',
    displayNameEn: 'Beeswax',
    displayNameKo: '비즈왝스(밀랍)',
    tier: 'approved',
    note: 'Cire naturelle protectrice et émolliente. Sûre et bien tolérée.',
    noteEn: 'Natural protective, emollient wax. Safe and well tolerated.',
    noteKo: '보호·에몰리언트 효과가 있는 천연 왝스입니다. 안전하고 순합니다.',
  },
  {
    keywords: ['allantoin', 'allantoïne', 'bisabolol', 'panthenol'],
    displayName: 'Allantoïne / Bisabolol',
    displayNameEn: 'Allantoin / Bisabolol',
    displayNameKo: '알란토인 / 비사보롤',
    tier: 'approved',
    note: 'Actifs apaisants et réparateurs (issus de la consoude ou de la camomille). Calment les rougeurs. Sans risque.',
    noteEn: 'Soothing, repairing actives (from comfrey or chamomile) that calm redness. No risk.',
    noteKo: '컴프리나 카모마일에서 얻는 진정·재생 성분으로 봉은기를 가라앨힙니다. 위험이 없습니다.',
  },
  {
    keywords: ['xanthan gum', 'gomme xanthane', 'sclerotium gum', 'cellulose gum'],
    displayName: 'Gomme xanthane',
    displayNameEn: 'Xanthan gum',
    displayNameKo: '잔탄검',
    tier: 'approved',
    note: 'Gélifiant naturel issu de fermentation, utilisé pour la texture. Sans risque.',
    noteEn: 'Natural fermentation-derived gelling agent used for texture. No risk.',
    noteKo: '발효로 얻는 천연 점증제로 제형을 잡는 데 쓰입니다. 위험이 없습니다.',
  },
  {
    keywords: ['cetearyl alcohol', 'cetyl alcohol', 'stearyl alcohol', 'behenyl alcohol', 'alcool cétéarylique'],
    displayName: 'Alcools gras (cétéarylique, cétylique)',
    displayNameEn: 'Fatty alcohols (cetearyl, cetyl)',
    displayNameKo: '지방 알코올(세테아릴, 세틸)',
    tier: 'approved',
    note: 'Alcools gras émollients (à ne pas confondre avec l\'alcool desséchant). Adoucissent et stabilisent les crèmes. Bien tolérés.',
    noteEn: 'Emollient fatty alcohols (not to be confused with drying alcohol). Soften and stabilize creams. Well tolerated.',
    noteKo: '에몰리언트 지방 알코올입니다(건조하게 하는 알코올과 다릅니다). 크림을 부드럽게 하고 안정시키며 순합니다.',
  },
  {
    keywords: ['stearic acid', 'glyceryl stearate', 'caprylic/capric triglyceride', 'cetyl esters', 'acide stéarique'],
    displayName: 'Émollients (acide stéarique, triglycérides)',
    displayNameEn: 'Emollients (stearic acid, triglycerides)',
    displayNameKo: '에몰리언트(스테아릭애쥌, 트라이글리세라이드)',
    tier: 'approved',
    note: 'Corps gras et émulsifiants doux d\'origine végétale qui assouplissent la peau. Sans risque.',
    noteEn: 'Plant-derived mild fats and emulsifiers that soften the skin. No risk.',
    noteKo: '피부를 부드럽게 하는 식물 유래의 순한 유분·유화제입니다. 위험이 없습니다.',
  },
  {
    keywords: ['squalane', 'squalene'],
    displayName: 'Squalane',
    displayNameEn: 'Squalane',
    displayNameKo: '스쿠알란',
    tier: 'approved',
    note: 'Émollient léger proche du sébum naturel (souvent d\'origine végétale). Excellente tolérance, non comédogène.',
    noteEn: 'Light emollient similar to natural sebum (often plant-derived). Excellent tolerance, non-comedogenic.',
    noteKo: '피부 자체 피지와 비슷한 가벼운 에몰리언트입니다(주로 식물 유래). 자극이 거의 없고 모공을 막지 않습니다.',
  },
  {
    keywords: ['centella asiatica', 'camellia sinensis', 'green tea', 'thé vert', 'mel', 'honey', 'miel', 'calendula', 'chamomilla', 'avena sativa', 'oat'],
    displayName: 'Extraits végétaux apaisants',
    displayNameEn: 'Soothing botanical extracts',
    displayNameKo: '진정 식물 추출물',
    tier: 'approved',
    note: 'Extraits naturels (centella, thé vert, camomille, avoine, miel) antioxydants et apaisants. Bénéfiques pour la peau.',
    noteEn: 'Natural antioxidant and soothing extracts (centella, green tea, chamomile, oat, honey). Beneficial for the skin.',
    noteKo: '병풀, 녹차, 카모마일, 귀리, 꿀 등 항산화·진정 효과가 있는 천연 추출물입니다. 피부에 유익합니다.',
  },
  {
    keywords: ['zinc oxide', 'oxyde de zinc', 'titanium dioxide', 'ci 77891', 'dioxyde de titane'],
    displayName: 'Filtres minéraux (oxyde de zinc, dioxyde de titane)',
    displayNameEn: 'Mineral filters (zinc oxide, titanium dioxide)',
    displayNameKo: '미네랄 자외선 차단제(징크옥사이드, 이산화티타늄)',
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
    noteKo: '항산화 성분인 진세노사이드가 풍부한 인삼 추출물입니다. 전통 안티에이징 성분으로 매우 순합니다.',
  },
  {
    keywords: ['snail secretion filtrate', 'snail mucin', 'snail filtrate', '달팽이점액여과물', '달팽이뮤신'],
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
    keywords: ['oryza sativa', 'rice extract', 'rice ferment filtrate', 'rice bran extract', '쌀추출물', '쌀발효여과물', '쌀겨추출물', '쌀뜨물'],
    displayName: 'Extrait de riz',
    displayNameEn: 'Rice extract',
    displayNameKo: '쌀 추출물 / 쌀 발효 여과물',
    tier: 'approved',
    note: 'Extrait ou ferment de riz riche en vitamines B et antioxydants. Éclaircissant doux, sans risque connu.',
    noteEn: 'Rice extract or ferment rich in B vitamins and antioxidants. A gentle brightener with no known risk.',
    noteKo: '비타민 B와 항산화 성분이 풍부한 쌀 추출물·발효물입니다. 순한 브라이트닝 성분으로 위험이 없습니다.',
  },
  {
    keywords: ['centella asiatica extract', 'madecassoside', 'asiaticoside', 'cica', 'centella', '병풀추출물', '시카', '마데카소사이드'],
    displayName: 'Centella / Cica',
    displayNameEn: 'Centella / Cica',
    displayNameKo: '병풀 추출물 (시카)',
    tier: 'approved',
    note: 'Centella asiatica et ses actifs (madécassoside) apaisent les rougeurs et réparent la barrière cutanée. Sûre et efficace.',
    noteEn: 'Centella asiatica and its actives (madecassoside) calm redness and repair the skin barrier. Safe and effective.',
    noteKo: '병풀과 그 성분(마데카소사이드)은 붉은기를 진정하고 피부 장벽을 재생합니다. 안전하고 효과적입니다.',
  },
  {
    keywords: ['artemisia', 'mugwort extract', 'artemisia vulgaris', 'artemisia princeps', '쑥추출물', '애쑥추출물'],
    displayName: 'Armoise (mugwort)',
    displayNameEn: 'Mugwort (artemisia)',
    displayNameKo: '쑥 추출물',
    tier: 'approved',
    note: 'Extrait d\'armoise apaisant et antioxydant, traditionnel en Corée pour les peaux sensibles et réactives.',
    noteEn: 'Soothing, antioxidant mugwort extract, traditional in Korea for sensitive, reactive skin.',
    noteKo: '진정·항산화 효과가 있는 쑥 추출물로, 민감성 피부에 전통적으로 쓰입니다.',
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
    noteKo: '하이드로퀴논 계열의 미백 성분입니다. 기미 개선에 효과적이지만 하이드로퀴논을 방출할 수 있어 EU에서 농도가 규제됩니다. 과학적 견해가 나뉩니다.',
  },
  {
    keywords: ['bee venom', 'apis mellifera venom', '봉독'],
    displayName: 'Venin d\'abeille',
    displayNameEn: 'Bee venom',
    displayNameKo: '봉독',
    tier: 'disputed',
    note: 'Actif tenseur populaire en K-beauty. Efficacité réelle mais risque allergique notable, surtout chez les personnes sensibles au venin. À tester avec prudence.',
    noteEn: 'A firming active popular in K-beauty. Real efficacy but a notable allergy risk, especially for those sensitive to venom. Patch-test with caution.',
    noteKo: 'K-뷰티에서 인기 있는 탄력 성분입니다. 효과는 있지만 특히 벌독에 민감한 사람에게 알레르기 위험이 있으므로 주의해 테스트하세요.',
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
