import { pick } from '@/utils/i18n';
import type { RiskLevel } from '@/constants/ingredientsDatabase';

// ═══════════════════════════════════════════════════════════════════════
// CONNAISSANCE INGRÉDIENTS — moteur de secours DÉTERMINISTE.
//
// Objectif : un ingrédient absent de la base ne doit JAMAIS afficher un message
// générique du type « X n'est pas répertorié dans la base ToxiScan… ». À la place,
// on raisonne sur la FAMILLE technologique de l'ingrédient (colorant, conservateur,
// émulsifiant, amidon modifié, extrait, épice, etc.) et on explique en 2-3 phrases
// ce que c'est, pourquoi il reçoit ce badge et l'impact concret.
//
// Ce module est pur (pas d'IA, pas de réseau) : il fonctionne hors ligne et
// instantanément. Il sert aussi de filet quand l'appel IA échoue.
// ═══════════════════════════════════════════════════════════════════════

export interface IngredientKnowledge {
  /** Badge deduced from the ingredient family. */
  readonly risk: RiskLevel;
  /** French `circ` label (localized downstream by localizedCirc). */
  readonly circ: string;
  /** Ready-to-display description in the current app language. */
  readonly description: string;
  /** Family id — useful for logs/debug. */
  readonly family: string;
}

interface KnowledgeRule {
  readonly id: string;
  /** Normalized substrings (accent-free, lowercase) that identify the family. */
  readonly match: readonly string[];
  /** Normalized substrings that disqualify the rule (more specific family wins). */
  readonly exclude?: readonly string[];
  readonly risk: RiskLevel;
  readonly circ: string;
  readonly en: string;
  readonly fr: string;
  readonly ko: string;
}

/** Same normalization as the database lookup (ASCII + Hangul kept). */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────
// RÈGLES PAR FAMILLE — ordonnées de la plus spécifique à la plus large.
// La première règle qui matche gagne, donc « arome de fumee » doit précéder « arome ».
// ─────────────────────────────────────────────────────────────────────

const RULES: readonly KnowledgeRule[] = [
  // ── Colorants ──────────────────────────────────────────────────────
  {
    id: 'coloring',
    match: ['colorant', 'colorants', 'colouring', 'coloring', 'colourant', 'food colour', 'food color', 'artificial colour', 'artificial color', 'couleur alimentaire', 'color added', 'colour added', '착색료', '색소'],
    risk: 'probable',
    circ: 'Transformé',
    en: 'Additives used to give or reinforce the colour of a food. This wording does not say which colourings are present. Their safety depends on the specific substance used. The presence of colourings mainly indicates a processed product.',
    fr: "Additifs utilisés pour donner ou renforcer la couleur d'un aliment. Cette mention ne précise pas quels colorants sont présents. Leur sécurité dépend de la substance utilisée. La présence de colorants indique surtout un produit transformé.",
    ko: '식품의 색을 내거나 강화하기 위해 사용하는 첨가물입니다. 이 표기만으로는 어떤 색소가 들어 있는지 알 수 없습니다. 안전성은 실제 사용된 물질에 따라 달라집니다. 색소의 존재는 무엇보다 가공식품임을 나타냅니다.',
  },
  // ── Arômes ─────────────────────────────────────────────────────────
  {
    id: 'smoke-flavour',
    match: ['arome de fumee', 'aromes de fumee', 'fumee liquide', 'smoke flavour', 'smoke flavor', 'liquid smoke', '훈연향'],
    risk: 'probable',
    circ: 'Ultra-transformé',
    en: 'A concentrate obtained by condensing wood smoke, used to imitate smoking without a smokehouse. The condensates carry polycyclic aromatic hydrocarbons, which is why EFSA re-evaluated several smoke flavourings and the EU is phasing most of them out. It is a marker of ultra-processed food.',
    fr: "Concentré obtenu en condensant de la fumée de bois, utilisé pour imiter le fumage sans fumoir. Les condensats apportent des hydrocarbures aromatiques polycycliques, ce qui a conduit l'EFSA à réévaluer plusieurs arômes de fumée et l'UE à en retirer la plupart. C'est un marqueur d'aliment ultra-transformé.",
    ko: '나무 연기를 응축해 만든 농축액으로, 훈연 설비 없이 훈제 향을 냅니다. 응축물에는 다환방향족탄화수소가 포함되어 EFSA가 여러 훈연향을 재평가했고 EU는 대부분을 단계적으로 퇴출하고 있습니다. 초가공식품의 지표입니다.',
  },
  {
    id: 'natural-flavour',
    match: ['arome naturel', 'aromes naturels', 'natural flavour', 'natural flavor', 'natural flavouring', 'natural flavoring', '천연향료'],
    risk: 'possible',
    circ: 'Transformé',
    en: 'A flavour mixture extracted from a natural source, then concentrated in a factory. The label never says which molecules or solvents are involved, so it stays a black box. It is harmless at the doses used but signals an industrial recipe rather than a whole food.',
    fr: "Mélange aromatique extrait d'une source naturelle, puis concentré en usine. L'étiquette ne dit jamais quelles molécules ni quels solvants sont utilisés, cela reste donc une boîte noire. Sans danger aux doses employées, mais c'est le signe d'une recette industrielle plutôt que d'un aliment brut.",
    ko: '천연 원료에서 추출한 뒤 공장에서 농축한 향미 혼합물입니다. 어떤 분자나 용매가 쓰였는지 라벨에 표시되지 않아 내용이 불투명합니다. 사용량 수준에서는 해롭지 않지만, 원물이 아닌 산업적 레시피임을 보여줍니다.',
  },
  {
    id: 'flavour',
    match: ['arome', 'aromes', 'aromatisant', 'flavouring', 'flavoring', 'flavour', 'flavor', 'artificial flavour', 'artificial flavor', '향료', '합성향료'],
    exclude: ['naturel', 'natural', 'fumee', 'smoke'],
    risk: 'probable',
    circ: 'Ultra-transformé',
    en: 'An industrial flavour concentrate, usually synthesised in a lab, added to recreate a taste the recipe does not really contain. Its exact composition is never disclosed on the label. It has no nutritional value and is one of the clearest markers of ultra-processed food.',
    fr: "Concentré aromatique industriel, le plus souvent synthétisé en laboratoire, ajouté pour recréer un goût que la recette ne contient pas réellement. Sa composition exacte n'est jamais divulguée sur l'étiquette. Il n'apporte aucune valeur nutritive et c'est l'un des marqueurs les plus nets d'aliment ultra-transformé.",
    ko: '실험실에서 합성한 산업용 향미 농축물로, 실제로는 들어 있지 않은 맛을 재현하기 위해 첨가합니다. 정확한 조성은 라벨에 공개되지 않습니다. 영양가는 전혀 없으며 초가공식품을 가장 분명하게 보여주는 지표 중 하나입니다.',
  },
  // ── Conservateurs / antioxydants ───────────────────────────────────
  {
    id: 'preservative',
    match: ['conservateur', 'conservateurs', 'preservative', 'preservatives', 'agent de conservation', '보존료', '방부제'],
    risk: 'probable',
    circ: 'Ultra-transformé',
    en: 'A preservative added to extend shelf life by blocking microbes or oxidation. The label does not say which molecule is used, and this family ranges from harmless (vitamin C) to strongly debated (nitrites, sulphites, parabens). Its presence means the product could not keep on its own — a marker of industrial processing.',
    fr: "Conservateur ajouté pour allonger la durée de vie en bloquant les micro-organismes ou l'oxydation. L'étiquette ne dit pas quelle molécule est utilisée, et cette famille va de l'inoffensif (vitamine C) au très discuté (nitrites, sulfites, parabènes). Sa présence signifie que le produit ne se conservait pas seul — un marqueur de transformation industrielle.",
    ko: '미생물 번식이나 산화를 막아 유통기한을 늘리기 위해 넣는 보존료입니다. 어떤 물질인지 라벨에 표시되지 않으며, 이 계열은 무해한 것(비타민 C)부터 논란이 큰 것(아질산염, 아황산염, 파라벤)까지 다양합니다. 제품이 스스로 보존되지 않는다는 뜻으로 산업적 가공의 지표입니다.',
  },
  {
    id: 'antioxidant-additive',
    match: ['antioxygene', 'antioxydant', 'antioxidant', 'anti oxydant', '산화방지제'],
    risk: 'possible',
    circ: 'Transformé',
    en: 'An additive that slows the oxidation of fats and colours so the product does not turn rancid. Many are benign (vitamin C, vitamin E, rosemary extract) but synthetic ones such as BHA and BHT are far more debated. Rated occasional because the label does not say which one is used.',
    fr: "Additif qui ralentit l'oxydation des graisses et des couleurs pour éviter le rancissement. Beaucoup sont anodins (vitamine C, vitamine E, extrait de romarin), mais les versions synthétiques comme le BHA et le BHT sont bien plus discutées. Classé occasionnel car l'étiquette ne précise pas laquelle est utilisée.",
    ko: '지방과 색의 산화를 늦춰 산패를 막는 첨가물입니다. 비타민 C·E, 로즈마리 추출물처럼 무난한 것도 많지만 BHA·BHT 같은 합성물은 논란이 큽니다. 어떤 물질인지 표시되지 않아 가끔 섭취 등급입니다.',
  },
  // ── Texture ────────────────────────────────────────────────────────
  {
    id: 'emulsifier',
    match: ['emulsifiant', 'emulsifiants', 'emulsifier', 'emulsifiers', '유화제'],
    risk: 'probable',
    circ: 'Perturbateur microbiome',
    en: 'An emulsifier forces water and fat to stay mixed in a product where they never would naturally. Research on this family (polysorbates, carboxymethylcellulose, mono- and diglycerides) links regular intake to thinning of the gut mucus layer and low-grade intestinal inflammation. It is a reliable marker of an ultra-processed recipe.',
    fr: "Un émulsifiant force l'eau et le gras à rester mélangés dans un produit où ils ne le feraient jamais naturellement. Les travaux sur cette famille (polysorbates, carboxyméthylcellulose, mono- et diglycérides) associent une consommation régulière à un amincissement du mucus intestinal et à une inflammation intestinale de bas grade. C'est un marqueur fiable de recette ultra-transformée.",
    ko: '유화제는 자연 상태에서는 섞이지 않는 물과 지방을 강제로 결합시킵니다. 폴리소르베이트, 카복시메틸셀룰로스, 모노·디글리세리드 등 이 계열은 장 점액층을 얇게 만들고 저강도 장 염증과 관련된다는 연구가 있습니다. 초가공 레시피의 확실한 지표입니다.',
  },
  {
    id: 'thickener',
    match: ['epaississant', 'epaississants', 'thickener', 'thickeners', 'gelifiant', 'gelling agent', 'stabilisant', 'stabilisants', 'stabilizer', 'stabiliser', '증점제', '안정제', '겔화제'],
    risk: 'possible',
    circ: 'Transformé',
    en: 'A texturing additive (gum, cellulose or starch derivative) used to thicken, gel or hold a product together. Most are not absorbed and behave like fibre, though some, such as carrageenan, are studied for gut irritation. Rated occasional: technically useful, but it signals a texture built by the factory rather than by the ingredients.',
    fr: "Additif de texture (gomme, cellulose ou dérivé d'amidon) utilisé pour épaissir, gélifier ou tenir un produit. La plupart ne sont pas absorbés et se comportent comme des fibres, même si certains, comme le carraghénane, sont étudiés pour une irritation intestinale. Classé occasionnel : techniquement utile, mais il signale une texture fabriquée en usine plutôt que par les ingrédients.",
    ko: '점도를 높이거나 겔화하거나 형태를 유지하기 위해 쓰는 질감 첨가물(검, 셀룰로스, 전분 유도체)입니다. 대부분 흡수되지 않고 식이섬유처럼 작용하지만 카라기난처럼 장 자극이 연구되는 것도 있습니다. 기술적으로는 유용하나 공장에서 만든 질감임을 뜻하므로 가끔 섭취 등급입니다.',
  },
  {
    id: 'modified-starch',
    match: ['amidon modifie', 'amidons modifies', 'modified starch', 'modified corn starch', 'modified food starch', 'fecule modifiee', '변성전분', '가공전분'],
    risk: 'probable',
    circ: 'Ultra-transformé',
    en: 'Starch chemically or enzymatically altered so it thickens on demand and survives freezing, heating and long storage. The modification strips it of the fibre and micronutrients of the original grain or tuber, leaving fast-absorbed carbohydrate. It exists only in industrial recipes and is a NOVA 4 marker.',
    fr: "Amidon modifié chimiquement ou par enzymes pour épaissir à la demande et résister à la congélation, à la chaleur et au stockage. La modification le prive des fibres et micronutriments de la céréale ou du tubercule d'origine, ne laissant qu'un glucide à absorption rapide. Il n'existe que dans les recettes industrielles : marqueur NOVA 4.",
    ko: '화학적·효소적으로 변형해 원하는 대로 점도를 내고 냉동·가열·장기 보관에도 견디게 만든 전분입니다. 변성 과정에서 원래 곡물이나 덩이줄기의 식이섬유와 미량영양소가 사라지고 빠르게 흡수되는 탄수화물만 남습니다. 산업적 레시피에만 존재하는 NOVA 4 지표입니다.',
  },
  {
    id: 'anticaking',
    match: ['anti agglomerant', 'antiagglomerant', 'anticaking', 'anti caking', 'agent anti agglomerant', '고결방지제'],
    risk: 'possible',
    circ: 'Transformé',
    en: 'A powder additive (silicates, stearates, silica) that keeps dry products flowing instead of clumping. It is used in tiny amounts and passes through the body largely unabsorbed. Rated occasional: technically inert, but it only exists in powdered industrial preparations.',
    fr: "Additif poudreux (silicates, stéarates, silice) qui empêche les produits secs de s'agglomérer. Il est utilisé en très petite quantité et traverse l'organisme sans être réellement absorbé. Classé occasionnel : techniquement inerte, mais il n'existe que dans les préparations industrielles en poudre.",
    ko: '건조 제품이 굳지 않고 잘 흐르도록 넣는 분말 첨가물(규산염, 스테아르산염, 실리카)입니다. 극소량만 쓰이며 대부분 흡수되지 않고 배출됩니다. 사실상 불활성이지만 분말형 공산품에만 존재하므로 가끔 섭취 등급입니다.',
  },
  {
    id: 'humectant',
    match: ['humectant', 'agent humidifiant', 'moisture retention', '습윤제'],
    risk: 'possible',
    circ: 'Transformé',
    en: 'A humectant (glycerol, sorbitol, propylene glycol) holds water inside a product so it stays soft for weeks. Most are sugar alcohols that can cause bloating in larger amounts. Rated occasional: harmless in small doses, but it is there to extend industrial shelf life.',
    fr: "Un humectant (glycérol, sorbitol, propylène glycol) retient l'eau dans le produit pour qu'il reste moelleux pendant des semaines. Ce sont souvent des polyols, qui peuvent provoquer des ballonnements à dose élevée. Classé occasionnel : anodin à faible dose, mais il sert à prolonger une conservation industrielle.",
    ko: '글리세롤, 소르비톨, 프로필렌글리콜 같은 습윤제는 제품 속 수분을 붙잡아 몇 주 동안 촉촉함을 유지합니다. 대부분 당알코올이라 많이 먹으면 복부 팽만을 일으킬 수 있습니다. 소량은 무해하지만 산업적 유통기한 연장을 위한 성분이라 가끔 섭취 등급입니다.',
  },
  // ── Goût ───────────────────────────────────────────────────────────
  {
    id: 'flavour-enhancer',
    match: ['exhausteur', 'exhausteurs', 'flavour enhancer', 'flavor enhancer', 'rehausseur de gout', '향미증진제'],
    risk: 'probable',
    circ: 'Amplificateur de goût',
    en: 'A flavour enhancer (glutamates, ribonucleotides) amplifies savoury taste so a thin recipe still feels rich. It adds nothing nutritionally and makes ultra-processed food more moreish, which is linked to overeating. Its presence means the taste comes from additives rather than real ingredients.',
    fr: "Un exhausteur de goût (glutamates, ribonucléotides) amplifie la sensation savoureuse pour qu'une recette pauvre paraisse riche. Il n'apporte rien sur le plan nutritionnel et rend les aliments ultra-transformés plus difficiles à arrêter, ce qui est associé à la suralimentation. Sa présence signifie que le goût vient des additifs, pas des vrais ingrédients.",
    ko: '글루탐산염이나 리보뉴클레오타이드 같은 향미증진제는 빈약한 레시피도 풍부하게 느껴지도록 감칠맛을 증폭합니다. 영양적으로는 아무 기여가 없고 초가공식품을 계속 먹게 만들어 과식과 연관됩니다. 맛이 진짜 재료가 아닌 첨가물에서 온다는 뜻입니다.',
  },
  {
    id: 'sweetener',
    match: ['edulcorant', 'edulcorants', 'sweetener', 'sweeteners', 'artificial sweetener', '감미료', '인공감미료'],
    risk: 'probable',
    circ: 'Ultra-transformé',
    en: 'An intense sweetener replaces sugar with a molecule hundreds of times sweeter, for no calories. WHO advised in 2023 against using non-sugar sweeteners for weight control, and this family keeps the taste for very sweet food alive. It is a defining marker of ultra-processed products.',
    fr: "Un édulcorant intense remplace le sucre par une molécule des centaines de fois plus sucrée, sans calories. L'OMS a déconseillé en 2023 l'usage des édulcorants non caloriques pour contrôler le poids, et cette famille entretient le goût pour le très sucré. C'est un marqueur caractéristique des produits ultra-transformés.",
    ko: '고감미도 감미료는 설탕 대신 수백 배 단 분자를 사용해 열량 없이 단맛을 냅니다. WHO는 2023년 체중 조절 목적의 비당류 감미료 사용을 권고하지 않았고, 이 계열은 강한 단맛에 대한 선호를 유지시킵니다. 초가공식품의 대표적 지표입니다.',
  },
  {
    id: 'acidity',
    match: ['acidifiant', 'correcteur d acidite', 'acidity regulator', 'acidulant', 'ph regulator', '산도조절제'],
    risk: 'possible',
    circ: 'Transformé',
    en: 'An acidity regulator (citric, malic, lactic or phosphoric acid) adjusts pH for taste and preservation. Most are well tolerated, though phosphoric acid in colas is linked to lower bone density with heavy intake. Rated occasional: benign in itself, but it belongs to industrial formulation.',
    fr: "Un correcteur d'acidité (acide citrique, malique, lactique ou phosphorique) ajuste le pH pour le goût et la conservation. La plupart sont bien tolérés, même si l'acide phosphorique des colas est associé à une densité osseuse plus faible en cas de consommation importante. Classé occasionnel : anodin en soi, mais il relève de la formulation industrielle.",
    ko: '구연산, 사과산, 젖산, 인산 등 산도조절제는 맛과 보존을 위해 pH를 조절합니다. 대부분 잘 견디지만 콜라의 인산은 과다 섭취 시 골밀도 저하와 관련됩니다. 그 자체는 무난하나 산업적 배합의 일부이므로 가끔 섭취 등급입니다.',
  },
  // ── Structure / procédés ───────────────────────────────────────────
  {
    id: 'raising-agent',
    match: ['poudre a lever', 'agent levant', 'raising agent', 'leavening', 'baking powder', 'levure chimique', '팽창제'],
    risk: 'possible',
    circ: 'Transformé',
    en: 'A raising agent releases carbon dioxide so dough puffs up without long fermentation. The usual mix (bicarbonate plus an acid salt) is chemically simple, but phosphate-based versions add to an already high phosphate intake. Rated occasional rather than problematic.',
    fr: "Un agent levant libère du gaz carbonique pour faire gonfler la pâte sans longue fermentation. Le mélange habituel (bicarbonate plus sel acide) est chimiquement simple, mais les versions à base de phosphates alourdissent un apport en phosphates déjà élevé. Classé occasionnel plutôt que problématique.",
    ko: '팽창제는 이산화탄소를 내보내 오랜 발효 없이 반죽을 부풀립니다. 일반적인 조합(중탄산염+산성염)은 단순하지만 인산염 계열은 이미 높은 인 섭취를 더 늘립니다. 문제라기보다는 가끔 섭취 등급입니다.',
  },
  {
    id: 'hydrogenated',
    match: ['hydrogene', 'hydrogenee', 'hydrogenated', 'partially hydrogenated', 'interesterifie', 'interesterified', '경화유', '부분경화'],
    risk: 'probable',
    circ: 'Ultra-transformé',
    en: 'Hydrogenation hardens a liquid oil by forcing hydrogen into it under pressure, which can create trans fats. Trans fats raise LDL cholesterol, lower HDL and are directly linked to cardiovascular disease, which is why the WHO called for their elimination. Avoid regular consumption.',
    fr: "L'hydrogénation durcit une huile liquide en y forçant de l'hydrogène sous pression, ce qui peut créer des acides gras trans. Les gras trans augmentent le cholestérol LDL, abaissent le HDL et sont directement liés aux maladies cardiovasculaires, d'où l'appel de l'OMS à les éliminer. À éviter au quotidien.",
    ko: '경화 공정은 압력 하에서 수소를 주입해 액체 기름을 굳히며 이 과정에서 트랜스지방이 생길 수 있습니다. 트랜스지방은 LDL 콜레스테롤을 높이고 HDL을 낮추며 심혈관 질환과 직접 관련되어 WHO가 퇴출을 촉구했습니다. 정기적인 섭취를 피하세요.',
  },
  {
    id: 'protein-isolate',
    match: ['isolat', 'isolate', 'proteine hydrolysee', 'hydrolysed protein', 'hydrolyzed protein', 'hydrolysat', 'proteine texturee', 'textured protein', 'concentre de proteine', 'protein concentrate', '분리단백', '가수분해단백'],
    risk: 'probable',
    circ: 'Ultra-transformé',
    en: 'A protein fraction stripped from its original food using heat, acid, enzymes or solvents until only the protein remains. The process removes the fibre, fat and micronutrients that came with it and often leaves free glutamate behind. It exists only inside industrial formulations — a NOVA 4 marker.',
    fr: "Fraction protéique extraite de son aliment d'origine par chaleur, acide, enzymes ou solvants jusqu'à ne garder que la protéine. Le procédé retire les fibres, les lipides et les micronutriments qui l'accompagnaient et laisse souvent du glutamate libre. Cela n'existe que dans les formulations industrielles — marqueur NOVA 4.",
    ko: '열·산·효소·용매로 원래 식품에서 단백질만 남기고 분리한 성분입니다. 함께 있던 식이섬유, 지방, 미량영양소가 제거되고 유리 글루탐산이 남는 경우가 많습니다. 산업적 배합에만 존재하는 NOVA 4 지표입니다.',
  },
  {
    id: 'yeast-extract',
    match: ['extrait de levure', 'yeast extract', 'autolysed yeast', 'autolyzed yeast', '효모추출물'],
    risk: 'probable',
    circ: 'Amplificateur de goût',
    en: 'Yeast cells broken open so their savoury compounds are released, producing free glutamate — the same molecule as MSG, without having to declare an additive. It is used to make a thin recipe taste rich and is one of the clearest signs of an ultra-processed product.',
    fr: "Cellules de levure éclatées pour libérer leurs composés savoureux, ce qui produit du glutamate libre — la même molécule que le glutamate ajouté, sans avoir à déclarer un additif. Il sert à donner du corps à une recette pauvre et c'est l'un des signes les plus clairs d'un produit ultra-transformé.",
    ko: '효모 세포를 파쇄해 감칠맛 성분을 방출시킨 것으로, 첨가물로 표기하지 않고도 MSG와 같은 유리 글루탐산을 얻습니다. 빈약한 레시피에 풍미를 더하는 데 쓰이며 초가공식품임을 가장 분명히 보여주는 신호 중 하나입니다.',
  },
  {
    id: 'maltodextrin',
    match: ['maltodextrine', 'maltodextrin', 'dextrine', 'dextrin', '말토덱스트린'],
    risk: 'probable',
    circ: 'Sucre hydrolysé industriel',
    en: 'A starch broken down industrially into short glucose chains used as a filler, carrier or texturiser. Despite tasting barely sweet it has a glycaemic index higher than table sugar, so it spikes blood glucose quickly. It carries no nutrients and is a marker of ultra-processed food.',
    fr: "Amidon découpé industriellement en courtes chaînes de glucose, utilisé comme charge, support ou texturant. Bien qu'il ait à peine un goût sucré, son index glycémique est supérieur à celui du sucre de table : il fait donc monter la glycémie très vite. Il n'apporte aucun nutriment et c'est un marqueur d'aliment ultra-transformé.",
    ko: '전분을 산업적으로 분해해 짧은 포도당 사슬로 만든 성분으로 증량제·운반체·질감 조절제로 쓰입니다. 단맛은 거의 없지만 혈당지수는 설탕보다 높아 혈당을 빠르게 올립니다. 영양소는 없으며 초가공식품의 지표입니다.',
  },
  {
    id: 'glucose-syrup',
    match: ['sirop de glucose', 'sirop de mais', 'glucose syrup', 'corn syrup', 'sirop de fructose', 'fructose syrup', 'glucose fructose', 'invert sugar', 'sucre inverti', '물엿', '액상과당'],
    risk: 'probable',
    circ: 'Sucre hydrolysé industriel',
    en: 'A liquid sugar produced by breaking starch down with acids or enzymes, chosen because it is cheap and never crystallises. It delivers fast sugar with no fibre, and high intake of fructose-rich syrups is linked to fatty liver and insulin resistance. Avoid regular consumption.',
    fr: "Sucre liquide obtenu en découpant de l'amidon avec des acides ou des enzymes, choisi parce qu'il est bon marché et ne cristallise pas. Il apporte du sucre rapide sans aucune fibre, et une forte consommation de sirops riches en fructose est liée à la stéatose hépatique et à la résistance à l'insuline. À éviter au quotidien.",
    ko: '전분을 산이나 효소로 분해해 만든 액상 당으로, 값싸고 결정화되지 않아 널리 쓰입니다. 식이섬유 없이 빠른 당만 공급하며 과당이 많은 시럽의 과다 섭취는 지방간과 인슐린 저항성과 관련됩니다. 정기적인 섭취를 피하세요.',
  },
  {
    id: 'vegetable-oil',
    match: ['huile vegetale', 'huiles vegetales', 'vegetable oil', 'matiere grasse vegetale', 'graisse vegetale', 'vegetable fat', '식물성유지', '식물성기름'],
    risk: 'probable',
    circ: 'Ultra-transformé',
    en: 'An unspecified refined vegetable oil, meaning the manufacturer can switch source (palm, rapeseed, sunflower) without changing the label. Refining uses high heat and solvents, which strips antioxidants and can leave process contaminants. The vagueness itself is a marker of industrial formulation.',
    fr: "Huile végétale raffinée non précisée : le fabricant peut changer de source (palme, colza, tournesol) sans modifier l'étiquette. Le raffinage utilise de hautes températures et des solvants, ce qui détruit les antioxydants et peut laisser des contaminants de procédé. Ce flou est en soi un marqueur de formulation industrielle.",
    ko: '어떤 기름인지 명시하지 않은 정제 식물성 유지로, 제조사가 라벨을 바꾸지 않고 원료(팜, 유채, 해바라기)를 교체할 수 있습니다. 정제에는 고온과 용매가 쓰여 항산화 성분이 사라지고 공정 오염물이 남을 수 있습니다. 이 모호함 자체가 산업적 배합의 지표입니다.',
  },
  {
    id: 'gum',
    match: ['gomme', 'gum', '검류'],
    exclude: ['chewing', 'gomme arabique naturelle'],
    risk: 'possible',
    circ: 'Transformé',
    en: 'A plant or fermentation-derived gum used to thicken and stabilise. It is not digested and behaves like soluble fibre, though larger amounts can cause bloating in sensitive people. Rated occasional: not harmful, but it is there to build an industrial texture.',
    fr: "Gomme d'origine végétale ou obtenue par fermentation, utilisée pour épaissir et stabiliser. Elle n'est pas digérée et se comporte comme une fibre soluble, même si des quantités importantes peuvent provoquer des ballonnements chez les personnes sensibles. Classée occasionnelle : sans danger, mais elle sert à fabriquer une texture industrielle.",
    ko: '식물 또는 발효로 얻은 검으로 점도를 높이고 안정화하는 데 씁니다. 소화되지 않고 수용성 식이섬유처럼 작용하지만 많은 양은 민감한 사람에게 복부 팽만을 유발할 수 있습니다. 해롭지는 않으나 산업적 질감을 위한 성분이라 가끔 섭취 등급입니다.',
  },
  {
    id: 'enzyme',
    match: ['enzyme', 'enzymes', 'amylase', 'protease', 'lipase', 'transglutaminase', '효소'],
    risk: 'possible',
    circ: 'Transformé',
    en: 'A processing enzyme used to soften dough, clarify a liquid or bind proteins, then largely destroyed by cooking. Enzymes are not usually listed individually and are considered safe at the levels used. Rated occasional because their presence marks an industrial process.',
    fr: "Enzyme de transformation utilisée pour assouplir une pâte, clarifier un liquide ou lier des protéines, puis largement détruite à la cuisson. Les enzymes ne sont généralement pas listées individuellement et sont considérées comme sûres aux doses employées. Classée occasionnelle car leur présence marque un procédé industriel.",
    ko: '반죽을 부드럽게 하거나 액체를 맑게 하거나 단백질을 결합시키는 가공 효소로, 대부분 가열 과정에서 파괴됩니다. 개별 표시는 잘 하지 않으며 사용량 수준에서 안전하다고 평가됩니다. 산업 공정을 뜻하므로 가끔 섭취 등급입니다.',
  },
  {
    id: 'glazing',
    match: ['agent d enrobage', 'glazing agent', 'agent de glacage', 'cire d enrobage', '피막제'],
    risk: 'possible',
    circ: 'Transformé',
    en: 'A coating agent (wax, shellac, refined oil) applied to the surface to add shine or slow drying. It stays on the outside and is barely absorbed. Rated occasional: cosmetic rather than nutritional, and typical of industrial presentation.',
    fr: "Agent d'enrobage (cire, gomme-laque, huile raffinée) appliqué en surface pour donner du brillant ou ralentir le dessèchement. Il reste à l'extérieur et n'est quasiment pas absorbé. Classé occasionnel : cosmétique plutôt que nutritionnel, et typique d'une présentation industrielle.",
    ko: '표면에 광택을 주거나 건조를 늦추기 위해 바르는 피막제(왁스, 셸락, 정제유)입니다. 겉면에 남아 거의 흡수되지 않습니다. 영양보다는 외관용이며 산업적 포장의 특징이라 가끔 섭취 등급입니다.',
  },
  {
    id: 'firming-bulking',
    match: ['affermissant', 'firming agent', 'agent de charge', 'bulking agent', 'sequestrant', 'sequestrant', 'agent moussant', 'foaming agent', 'antimoussant', 'anti moussant', 'antifoaming', 'propulseur', 'propellant', 'gaz d emballage', 'packaging gas', '팽창보조제', '충전제'],
    risk: 'possible',
    circ: 'Transformé',
    en: 'A technical additive used to keep structure, add volume or control gas during manufacturing. It has no nutritional role and is used in very small amounts. Rated occasional: harmless in itself, but it only appears in industrially assembled foods.',
    fr: "Additif technique servant à tenir la structure, ajouter du volume ou contrôler les gaz pendant la fabrication. Il n'a aucun rôle nutritionnel et est utilisé en très faible quantité. Classé occasionnel : anodin en soi, mais il n'apparaît que dans des aliments assemblés industriellement.",
    ko: '제조 과정에서 구조를 유지하거나 부피를 늘리거나 가스를 조절하기 위한 기술적 첨가물입니다. 영양적 역할은 없고 극소량만 사용됩니다. 그 자체는 무해하나 산업적으로 조립된 식품에만 등장하므로 가끔 섭취 등급입니다.',
  },
  {
    id: 'added-vitamin',
    match: ['vitamine ajoutee', 'added vitamin', 'enrichi en vitamine', 'fortified with', 'premelange de vitamines', 'vitamin premix', 'mineral premix', '비타민 강화'],
    risk: 'possible',
    circ: 'Transformé',
    en: 'A synthetic vitamin or mineral added back after processing, usually because refining destroyed the original ones. The nutrient itself is useful, but fortification signals a food that lost its natural nutrient content along the way. Rated occasional rather than beneficial.',
    fr: "Vitamine ou minéral de synthèse rajouté après transformation, généralement parce que le raffinage a détruit ceux d'origine. Le nutriment en lui-même est utile, mais l'enrichissement signale un aliment qui a perdu ses nutriments naturels en cours de route. Classé occasionnel plutôt que bénéfique.",
    ko: '가공 과정에서 원래 영양소가 파괴되어 나중에 다시 넣은 합성 비타민·미네랄입니다. 영양소 자체는 유용하지만, 강화 표시는 그 식품이 자연 영양소를 잃었다는 신호입니다. 유익하다기보다 가끔 섭취 등급입니다.',
  },
  {
    id: 'added-fibre',
    match: ['fibre ajoutee', 'added fibre', 'added fiber', 'inuline', 'inulin', 'polydextrose', 'fibre de chicoree', 'chicory fibre', 'oligofructose', '이눌린', '식이섬유 첨가'],
    risk: 'possible',
    circ: 'Transformé',
    en: 'An isolated fibre added to raise the fibre figure on the label without using whole foods. It does feed gut bacteria, but in concentrated form it commonly causes bloating and gas. Rated occasional: useful on paper, yet a sign of a reconstructed recipe.',
    fr: "Fibre isolée ajoutée pour gonfler le chiffre « fibres » de l'étiquette sans utiliser d'aliments complets. Elle nourrit bien le microbiote, mais sous forme concentrée elle provoque fréquemment ballonnements et gaz. Classée occasionnelle : utile sur le papier, mais signe d'une recette reconstituée.",
    ko: '통곡물 대신 라벨의 식이섬유 수치를 올리기 위해 넣은 분리 식이섬유입니다. 장내 세균에 도움이 되지만 농축 형태에서는 복부 팽만과 가스를 자주 일으킵니다. 서류상 유용하나 재구성된 레시피의 신호라 가끔 섭취 등급입니다.',
  },
  {
    id: 'concentrate-extract',
    match: ['concentre', 'concentrate', 'extrait', 'extract', 'poudre de', 'powder', 'deshydrate', 'dehydrated', 'lyophilise', 'freeze dried', '농축', '추출물', '분말'],
    exclude: ['extrait de levure', 'yeast extract', 'extrait de romarin', 'rosemary extract', 'extrait de vanille', 'vanilla extract'],
    risk: 'possible',
    circ: 'Naturel transformé',
    en: 'A food reduced to concentrated, dried or extracted form so it keeps and doses easily. The base ingredient can be perfectly healthy, but concentrating it removes water and fibre and increases sugar or salt density. Rated occasional: acceptable in small amounts, less good than the whole food.',
    fr: "Aliment réduit sous forme concentrée, séchée ou extraite pour se conserver et se doser facilement. L'ingrédient de départ peut être parfaitement sain, mais la concentration retire l'eau et les fibres et augmente la densité en sucre ou en sel. Classé occasionnel : acceptable en petite quantité, moins bon que l'aliment entier.",
    ko: '보관과 계량이 쉽도록 농축·건조·추출한 식품입니다. 원재료는 건강할 수 있지만 농축 과정에서 수분과 식이섬유가 빠지고 당이나 나트륨 밀도가 높아집니다. 소량은 괜찮지만 통식품보다는 못하므로 가끔 섭취 등급입니다.',
  },
  // ── Familles naturelles ────────────────────────────────────────────
  {
    id: 'spice-herb',
    match: ['epice', 'epices', 'spice', 'spices', 'herbe aromatique', 'herbes', 'herb', 'herbs', 'assaisonnement naturel', '향신료', '허브'],
    exclude: ['melange assaisonnement', 'seasoning mix'],
    risk: 'aucun',
    circ: 'Naturel',
    en: 'Dried plant parts used purely for aroma and taste, with antioxidant and anti-inflammatory compounds of their own. They add flavour without calories, salt or additives. Approved: seasoning with spices is exactly what replaces industrial flavourings.',
    fr: "Parties de plantes séchées utilisées uniquement pour l'arôme et le goût, avec leurs propres composés antioxydants et anti-inflammatoires. Elles apportent de la saveur sans calories, sans sel et sans additif. Approuvé : assaisonner avec des épices, c'est précisément ce qui remplace les arômes industriels.",
    ko: '향과 맛만을 위해 사용하는 건조 식물 재료로, 자체적인 항산화·항염 성분을 지닙니다. 열량, 나트륨, 첨가물 없이 풍미를 더합니다. 산업용 향료를 대체하는 방법이므로 승인 등급입니다.',
  },
];

/** Generic E-number that is not individually curated (E100–E1520). */
const E_NUMBER_REGEX = /^e\s?\d{3,4}[a-z]{0,2}$/;

function localizedRuleText(rule: KnowledgeRule): string {
  return pick({ en: rule.en, fr: rule.fr, ko: rule.ko });
}

/** Description used for an unrecognized E-number additive. */
function unknownAdditiveDescription(): string {
  return pick({
    en: 'A food additive identified only by its E number, so the label does not say what it actually does in the recipe. E-numbered additives are authorised but exist to preserve, colour, texture or flavour an industrial preparation. Its presence classifies the product as processed.',
    fr: "Additif alimentaire identifié uniquement par son numéro E : l'étiquette ne dit donc pas ce qu'il fait réellement dans la recette. Les additifs à numéro E sont autorisés, mais ils servent à conserver, colorer, texturer ou aromatiser une préparation industrielle. Sa présence classe le produit comme transformé.",
    ko: 'E 번호로만 표시된 식품첨가물이라 실제로 어떤 역할을 하는지 라벨만으로는 알 수 없습니다. E 번호 첨가물은 허가된 물질이지만 산업적 배합을 보존·착색·질감화·향미화하기 위해 존재합니다. 이 성분의 존재는 제품을 가공식품으로 분류하게 합니다.',
  });
}

/**
 * Deterministic, family-based knowledge for an ingredient that is NOT in the
 * curated database. Returns null when no family is recognized — the caller then
 * uses `buildRiskReasonDescription` (never a "not listed" message).
 */
export function getIngredientKnowledge(name: string): IngredientKnowledge | null {
  const n = normalize(name);
  if (!n) return null;

  for (const rule of RULES) {
    if (rule.exclude?.some((x) => n.includes(normalize(x)))) continue;
    if (!rule.match.some((m) => n.includes(normalize(m)))) continue;
    return { risk: rule.risk, circ: rule.circ, description: localizedRuleText(rule), family: rule.id };
  }

  if (E_NUMBER_REGEX.test(n.replace(/\s+/g, ' ').trim())) {
    return { risk: 'probable', circ: 'Transformé', family: 'e-number', description: unknownAdditiveDescription() };
  }

  return null;
}

/**
 * Last-resort description: explains WHY the ingredient carries this badge, using the
 * ingredient name. Never says "not listed in the database" — the user must always read
 * a concrete reason (processed / occasional / acceptable / to avoid).
 */
export function buildRiskReasonDescription(name: string, risk: RiskLevel): string {
  const label = name.trim();
  switch (risk) {
    case 'danger':
      return pick({
        en: `${label} is treated at the highest risk level: substances of this type are either classified as carcinogenic by health agencies or restricted in food in several countries. There is no nutritional benefit that would justify the exposure. Avoid it rather than simply limiting it.`,
        fr: `${label} est traité au niveau de risque le plus élevé : les substances de ce type sont soit classées cancérigènes par les agences sanitaires, soit restreintes dans l'alimentation de plusieurs pays. Aucun bénéfice nutritionnel ne justifie cette exposition. À éviter plutôt qu'à simplement limiter.`,
        ko: `${label}은(는) 최고 위험 등급으로 다룹니다: 이런 유형의 물질은 보건 당국이 발암물질로 분류했거나 여러 나라에서 식품 사용이 제한된 경우가 많습니다. 이 노출을 정당화할 영양적 이점은 없습니다. 줄이기보다 피하세요.`,
      });
    case 'probable':
      return pick({
        en: `${label} is an industrially produced ingredient: its name indicates a factory process (refining, extraction, hydrolysis or chemical modification) rather than a whole food. That processing removes fibre and micronutrients while adding nothing the body needs. It is a marker of ultra-processed food (NOVA 4), so limit regular consumption.`,
        fr: `${label} est un ingrédient d'origine industrielle : son nom indique un procédé d'usine (raffinage, extraction, hydrolyse ou modification chimique) plutôt qu'un aliment entier. Cette transformation retire les fibres et les micronutriments sans rien apporter d'utile au corps. C'est un marqueur d'aliment ultra-transformé (NOVA 4) : à limiter au quotidien.`,
        ko: `${label}은(는) 산업적으로 생산된 성분입니다: 이름 자체가 통식품이 아니라 정제·추출·가수분해·화학적 변형 같은 공장 공정을 가리킵니다. 이런 가공은 식이섬유와 미량영양소를 없애면서 몸에 필요한 것은 더하지 않습니다. 초가공식품(NOVA 4)의 지표이므로 정기적인 섭취를 제한하세요.`,
      });
    case 'possible':
      return pick({
        en: `${label} is an ingredient whose impact depends on how it was produced and how much of it you eat. It carries no proven serious risk, but it is typical of a prepared recipe rather than a raw food, so it is rated occasional. Fine now and then, not something to eat every day.`,
        fr: `${label} est un ingrédient dont l'impact dépend de son mode de production et de la quantité consommée. Il ne présente aucun risque grave démontré, mais il est typique d'une recette préparée plutôt que d'un aliment brut : il est donc classé occasionnel. Correct de temps en temps, pas au quotidien.`,
        ko: `${label}은(는) 어떻게 만들어졌고 얼마나 먹느냐에 따라 영향이 달라지는 성분입니다. 입증된 심각한 위험은 없지만 원물보다는 조리·배합된 레시피에 가까워 가끔 섭취 등급입니다. 이따금은 괜찮지만 매일 먹을 성분은 아닙니다.`,
      });
    default:
      return pick({
        en: `${label} is a whole, minimally processed food ingredient: it goes into the recipe close to its natural state, without chemical transformation. It keeps its own fibre, vitamins and minerals, and no health risk is identified at normal food levels. Approved.`,
        fr: `${label} est un ingrédient alimentaire entier et peu transformé : il entre dans la recette proche de son état naturel, sans transformation chimique. Il conserve ses fibres, ses vitamines et ses minéraux, et aucun risque santé n'est identifié aux doses alimentaires habituelles. Approuvé.`,
        ko: `${label}은(는) 화학적 변형 없이 자연 상태에 가깝게 배합에 들어가는 통·최소 가공 식품 성분입니다. 자체 식이섬유, 비타민, 미네랄을 그대로 지니며 일반적인 식품 섭취량에서 알려진 건강 위험이 없습니다. 승인 등급입니다.`,
      });
  }
}

/**
 * Always returns a concrete description for an ingredient absent from the database:
 * the family-based knowledge when recognized, otherwise a badge-reason explanation.
 */
export function describeUnknownIngredient(name: string, risk: RiskLevel): string {
  return getIngredientKnowledge(name)?.description ?? buildRiskReasonDescription(name, risk);
}
