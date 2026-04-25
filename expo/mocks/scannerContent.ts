import { isEnglish } from '@/utils/i18n';

export interface HealthAlert {
  id: string;
  title: string;
  summary: string;
  source: string;
  date: string;
}

export interface DailyFact {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const HEALTH_ALERTS_FR: HealthAlert[] = [
  {
    id: 'alert-1',
    title: 'États-Unis : le Red 3 (érythrosine) officiellement interdit dans les aliments par la FDA',
    summary: 'La FDA a finalement interdit le colorant Red 3 (E127) dans les aliments et médicaments ingérés. Ce colorant, classé cancérogène possible, était utilisé dans des bonbons, gâteaux et médicaments depuis des décennies malgré les preuves de son lien avec le cancer de la thyroïde chez l\'animal. Les fabricants ont jusqu\'en janvier 2027 pour reformuler leurs produits.',
    source: 'FDA - Federal Register, janvier 2025',
    date: '2025-01-15',
  },
  {
    id: 'alert-2',
    title: 'Canada : rappel de produits contenant du dioxyde de titane E171',
    summary: 'Santé Canada a intensifié la surveillance des produits contenant du dioxyde de titane (E171), un colorant blanc utilisé dans les confiseries, les sauces et les cosmétiques. L\'EFSA européenne considère cette substance comme non sûre en tant qu\'additif alimentaire en raison de préoccupations liées à la génotoxicité. L\'E171 est déjà interdit en France depuis 2020.',
    source: 'Santé Canada / EFSA',
    date: '2025-02-10',
  },
  {
    id: 'alert-3',
    title: 'France : nouvelle étude confirme les risques des nitrites dans la charcuterie',
    summary: 'Une étude de l\'ANSES confirme le lien entre la consommation de nitrites (E249, E250) dans la charcuterie et le risque accru de cancer colorectal. L\'agence recommande de réduire l\'exposition aux nitrites et nitrates ajoutés. Les nitrites sont classés cancérogènes avérés (Groupe 1) par le CIRC depuis 2015.',
    source: 'ANSES - Agence nationale de sécurité sanitaire',
    date: '2025-03-01',
  },
  {
    id: 'alert-4',
    title: 'OMS : l\'aspartame maintenu en catégorie possiblement cancérigène',
    summary: 'Le Centre international de recherche sur le cancer (CIRC) maintient la classification de l\'aspartame (E951) en Groupe 2B (possiblement cancérogène). Bien que la dose journalière admissible reste inchangée, les experts recommandent la prudence, notamment pour les consommateurs réguliers de boissons light et produits "sans sucre".',
    source: 'OMS / CIRC - Classification des agents cancérogènes',
    date: '2025-01-28',
  },
  {
    id: 'alert-5',
    title: 'Europe : les PFAS "polluants éternels" retrouvés dans des emballages alimentaires',
    summary: 'Une enquête européenne révèle la présence de PFAS (substances per- et polyfluoroalkylées) dans de nombreux emballages alimentaires, notamment les boîtes de pizza, les sachets de pop-corn micro-ondes et les emballages de restauration rapide. Ces "polluants éternels" sont liés à des cancers du rein et des testicules.',
    source: 'Agence européenne des produits chimiques (ECHA)',
    date: '2025-02-20',
  },
];

const HEALTH_ALERTS_EN: HealthAlert[] = [
  {
    id: 'alert-1',
    title: 'United States: Red 3 (erythrosine) officially banned from food by the FDA',
    summary: 'The FDA has finally banned Red 3 (E127) coloring in ingested food and medicines. This dye, classified as a possible carcinogen, was used in candy, cakes, and medications for decades despite evidence of its link to thyroid cancer in animals. Manufacturers have until January 2027 to reformulate their products.',
    source: 'FDA - Federal Register, January 2025',
    date: '2025-01-15',
  },
  {
    id: 'alert-2',
    title: 'Canada: recall of products containing titanium dioxide E171',
    summary: 'Health Canada has stepped up monitoring of products containing titanium dioxide (E171), a white coloring used in candy, sauces, and cosmetics. The European EFSA considers this substance unsafe as a food additive due to genotoxicity concerns. E171 has already been banned in France since 2020.',
    source: 'Health Canada / EFSA',
    date: '2025-02-10',
  },
  {
    id: 'alert-3',
    title: 'France: new study confirms the risks of nitrites in processed meat',
    summary: 'A study by ANSES confirms the link between consumption of nitrites (E249, E250) in processed meat and the increased risk of colorectal cancer. The agency recommends reducing exposure to added nitrites and nitrates. Nitrites have been classified as proven carcinogens (Group 1) by the IARC since 2015.',
    source: 'ANSES - French National Health Safety Agency',
    date: '2025-03-01',
  },
  {
    id: 'alert-4',
    title: 'WHO: aspartame maintained as a possible carcinogen',
    summary: 'The International Agency for Research on Cancer (IARC) maintains the classification of aspartame (E951) in Group 2B (possibly carcinogenic). Although the acceptable daily intake remains unchanged, experts recommend caution, especially for regular consumers of diet drinks and "sugar-free" products.',
    source: 'WHO / IARC - Classification of carcinogenic agents',
    date: '2025-01-28',
  },
  {
    id: 'alert-5',
    title: 'Europe: PFAS "forever chemicals" found in food packaging',
    summary: 'A European investigation reveals the presence of PFAS (per- and polyfluoroalkyl substances) in many food packagings, including pizza boxes, microwave popcorn bags, and fast-food wrappers. These "forever chemicals" are linked to kidney and testicular cancers.',
    source: 'European Chemicals Agency (ECHA)',
    date: '2025-02-20',
  },
];

export const HEALTH_ALERTS: HealthAlert[] = isEnglish() ? HEALTH_ALERTS_EN : HEALTH_ALERTS_FR;

const DAILY_FACTS_FR: DailyFact[] = [
  { id: 'fact-1', text: 'Le cancer colorectal a augmenté de 45% chez les moins de 50 ans depuis 1990.' },
  { id: 'fact-2', text: 'Chauffer du plastique au micro-ondes libère des microplastiques dans votre nourriture.' },
  { id: 'fact-3', text: 'Les nitrites dans la charcuterie sont classés cancérogènes avérés depuis 2015.' },
  { id: 'fact-4', text: 'Le brocoli contient du sulforaphane, un des composés anti-cancer les plus puissants connus.' },
  { id: 'fact-5', text: 'Une poêle en Teflon rayée peut libérer des PFOA, classés cancérogènes possibles par le CIRC.' },
  { id: 'fact-6', text: 'Le curcuma est l\'épice la plus étudiée pour ses propriétés anti-cancer, avec plus de 12 000 publications.' },
  { id: 'fact-7', text: 'Les colorants azoïques (E102, E110, E129) sont interdits dans les aliments pour enfants dans plusieurs pays.' },
  { id: 'fact-8', text: 'Un bocal en verre ne libère aucune substance chimique dans vos aliments, contrairement au plastique.' },
  { id: 'fact-9', text: 'L\'OMS estime que 30 à 50% des cancers pourraient être évités par une meilleure alimentation et mode de vie.' },
  { id: 'fact-10', text: 'Le formaldéhyde, classé cancérogène Groupe 1, se retrouve dans certains vêtements neufs non lavés.' },
  { id: 'fact-11', text: 'L\'huile d\'olive extra vierge contient de l\'oléocanthal, un anti-inflammatoire aussi puissant que l\'ibuprofène.' },
  { id: 'fact-12', text: 'Le dioxyde de titane (E171) est interdit en France depuis 2020, mais reste autorisé au Canada et aux USA.' },
  { id: 'fact-13', text: 'Les sachets de thé en plastique libèrent des milliards de microplastiques dans votre tasse à chaque infusion.' },
  { id: 'fact-14', text: 'Le glutamate monosodique (MSG) se cache sous plus de 40 noms différents sur les étiquettes.' },
  { id: 'fact-15', text: 'Les boîtes de conserve sont souvent recouvertes d\'un revêtement contenant du BPA, un perturbateur endocrinien.' },
  { id: 'fact-16', text: 'La fonte et l\'inox sont les matériaux les plus sûrs pour cuisiner à haute température.' },
  { id: 'fact-17', text: 'Les "arômes naturels" peuvent contenir jusqu\'à 100 substances chimiques différentes sous un seul nom.' },
  { id: 'fact-18', text: 'Le Red 40, interdit en Europe, est le colorant alimentaire le plus utilisé en Amérique du Nord.' },
  { id: 'fact-19', text: 'Laver vos vêtements neufs avant de les porter élimine une grande partie du formaldéhyde résiduel.' },
  { id: 'fact-20', text: 'Les PFAS, surnommés "polluants éternels", mettent des milliers d\'années à se décomposer dans l\'environnement.' },
  { id: 'fact-21', text: 'Des PFAS (polluants éternels) ont été retrouvés dans presque toutes les marques de lait pour bébé selon Consumer Reports.' },
  { id: 'fact-22', text: 'Le triclosan, présent dans certains dentifrices, est un perturbateur endocrinien interdit dans les savons.' },
  { id: 'fact-23', text: 'Le goudron de houille (coal tar) dans les shampoings antipelliculaires est classé cancérogène avéré Groupe 1.' },
  { id: 'fact-24', text: 'Les vêtements imperméables contiennent souvent des PFAS, des polluants éternels cancérogènes.' },
  { id: 'fact-25', text: 'Le chrome hexavalent utilisé dans le tannage du cuir est un cancérogène avéré Groupe 1 du CIRC.' },
  { id: 'fact-26', text: 'L\'eau de Javel produit des dioxines, classées cancérogènes avérés. Préférez le percarbonate de soude.' },
  { id: 'fact-27', text: 'Les lingettes pour bébé peuvent contenir du DMDM hydantoïne, un conservateur qui libère du formaldéhyde.' },
  { id: 'fact-28', text: 'Le polystyrène (plastique #6) peut libérer du styrène, cancérogène possible, surtout avec des aliments chauds.' },
  { id: 'fact-29', text: 'Le toluène dans les vernis à ongles est neurotoxique. Cherchez des vernis "3-free" ou "5-free".' },
  { id: 'fact-30', text: 'Les colorants azoïques dans les textiles peuvent libérer des amines aromatiques cancérigènes au contact de la peau.' },
  { id: 'fact-31', text: 'Le perchloréthylène utilisé dans le nettoyage à sec est classé cancérogène probable Groupe 2A.' },
  { id: 'fact-32', text: 'Le BPA dans les canettes de lait pour bébé liquide est un perturbateur endocrinien lié au cancer du sein.' },
  { id: 'fact-33', text: 'La vaisselle en mélamine peut libérer du formaldéhyde quand elle est chauffée. Ne l\'utilisez jamais au micro-ondes.' },
  { id: 'fact-34', text: 'Les isothiazolinones (MIT, CMIT) dans les produits ménagers sont des allergènes puissants.' },
  { id: 'fact-35', text: 'Le plomb dans certaines teintures pour cheveux est un cancérogène avéré et neurotoxique.' },
  { id: 'fact-36', text: 'Le cadmium est un métal lourd cancérigène (Groupe 1 CIRC) présent dans certains aliments comme le cacao, les céréales complètes et les crustacés. Une exposition régulière augmente le risque de cancer du rein et des poumons.' },
];

const DAILY_FACTS_EN: DailyFact[] = [
  { id: 'fact-1', text: 'Colorectal cancer has increased by 45% in people under 50 since 1990.' },
  { id: 'fact-2', text: 'Heating plastic in the microwave releases microplastics into your food.' },
  { id: 'fact-3', text: 'Nitrites in processed meat have been classified as proven carcinogens since 2015.' },
  { id: 'fact-4', text: 'Broccoli contains sulforaphane, one of the most powerful known anti-cancer compounds.' },
  { id: 'fact-5', text: 'A scratched Teflon pan can release PFOAs, classified as possible carcinogens by the IARC.' },
  { id: 'fact-6', text: 'Turmeric is the most studied spice for its anti-cancer properties, with over 12,000 publications.' },
  { id: 'fact-7', text: 'Azo dyes (E102, E110, E129) are banned in children\'s food in several countries.' },
  { id: 'fact-8', text: 'A glass jar releases no chemicals into your food, unlike plastic.' },
  { id: 'fact-9', text: 'The WHO estimates that 30 to 50% of cancers could be prevented through better diet and lifestyle.' },
  { id: 'fact-10', text: 'Formaldehyde, a Group 1 carcinogen, is found in some unwashed new clothes.' },
  { id: 'fact-11', text: 'Extra virgin olive oil contains oleocanthal, an anti-inflammatory as powerful as ibuprofen.' },
  { id: 'fact-12', text: 'Titanium dioxide (E171) has been banned in France since 2020 but remains legal in Canada and the USA.' },
  { id: 'fact-13', text: 'Plastic tea bags release billions of microplastics into your cup with each brew.' },
  { id: 'fact-14', text: 'Monosodium glutamate (MSG) hides under more than 40 different names on labels.' },
  { id: 'fact-15', text: 'Canned goods are often lined with a coating containing BPA, an endocrine disruptor.' },
  { id: 'fact-16', text: 'Cast iron and stainless steel are the safest materials for cooking at high temperatures.' },
  { id: 'fact-17', text: '"Natural flavors" can contain up to 100 different chemical substances under a single name.' },
  { id: 'fact-18', text: 'Red 40, banned in Europe, is the most used food coloring in North America.' },
  { id: 'fact-19', text: 'Washing your new clothes before wearing them removes much of the residual formaldehyde.' },
  { id: 'fact-20', text: 'PFAS, dubbed "forever chemicals", take thousands of years to break down in the environment.' },
  { id: 'fact-21', text: 'PFAS (forever chemicals) were found in almost all baby formula brands according to Consumer Reports.' },
  { id: 'fact-22', text: 'Triclosan, found in some toothpastes, is an endocrine disruptor banned in soaps.' },
  { id: 'fact-23', text: 'Coal tar in anti-dandruff shampoos is classified as a proven Group 1 carcinogen.' },
  { id: 'fact-24', text: 'Waterproof clothing often contains PFAS, carcinogenic forever chemicals.' },
  { id: 'fact-25', text: 'Hexavalent chromium used in leather tanning is a proven IARC Group 1 carcinogen.' },
  { id: 'fact-26', text: 'Bleach produces dioxins, classified as proven carcinogens. Prefer sodium percarbonate.' },
  { id: 'fact-27', text: 'Baby wipes may contain DMDM hydantoin, a preservative that releases formaldehyde.' },
  { id: 'fact-28', text: 'Polystyrene (plastic #6) can release styrene, a possible carcinogen, especially with hot food.' },
  { id: 'fact-29', text: 'Toluene in nail polish is neurotoxic. Look for "3-free" or "5-free" polishes.' },
  { id: 'fact-30', text: 'Azo dyes in textiles can release carcinogenic aromatic amines on skin contact.' },
  { id: 'fact-31', text: 'Perchloroethylene used in dry cleaning is classified as a probable Group 2A carcinogen.' },
  { id: 'fact-32', text: 'BPA in liquid baby formula cans is an endocrine disruptor linked to breast cancer.' },
  { id: 'fact-33', text: 'Melamine dishes can release formaldehyde when heated. Never use them in the microwave.' },
  { id: 'fact-34', text: 'Isothiazolinones (MIT, CMIT) in household products are powerful allergens.' },
  { id: 'fact-35', text: 'Lead in some hair dyes is a proven carcinogen and neurotoxicant.' },
  { id: 'fact-36', text: 'Cadmium is a heavy metal classified as a Group 1 carcinogen by the IARC, found in foods like cocoa, whole grains, and shellfish. Regular exposure increases the risk of kidney and lung cancer.' },
];

export const DAILY_FACTS: DailyFact[] = isEnglish() ? DAILY_FACTS_EN : DAILY_FACTS_FR;

const QUIZ_QUESTIONS_FR: QuizQuestion[] = [
  {
    id: 'quiz-1',
    question: 'Quel colorant alimentaire est interdit en Europe mais autorisé en Amérique du Nord ?',
    options: ['E150d (caramel)', 'Red 40 (E129)', 'E100 (curcumine)'],
    correctIndex: 1,
    explanation: 'Le Red 40 (Allura Red, E129) est l\'un des colorants azoïques les plus controversés. Il est interdit dans plusieurs pays européens en raison de ses liens avec l\'hyperactivité chez les enfants et des risques cancérogènes potentiels.',
  },
  {
    id: 'quiz-2',
    question: 'À quelle température le plastique commence-t-il à libérer des substances toxiques ?',
    options: ['50°C', '70°C', '100°C'],
    correctIndex: 1,
    explanation: 'Dès 70°C, les plastiques commencent à libérer des perturbateurs endocriniens comme le BPA et les phtalates. C\'est pourquoi il ne faut jamais chauffer de la nourriture dans un contenant en plastique au micro-ondes.',
  },
  {
    id: 'quiz-3',
    question: 'Quel est l\'aliment anti-cancer numéro 1 selon les études ?',
    options: ['Brocoli', 'Carotte', 'Tomate'],
    correctIndex: 0,
    explanation: 'Le brocoli contient du sulforaphane, un composé qui active les enzymes de détoxification du corps et inhibe la croissance des cellules cancéreuses. C\'est l\'aliment le plus étudié pour ses propriétés anti-cancer.',
  },
  {
    id: 'quiz-4',
    question: 'Quel additif est classé cancérogène avéré (Groupe 1) par le CIRC ?',
    options: ['Aspartame (E951)', 'Nitrite de sodium (E250)', 'Acide citrique (E330)'],
    correctIndex: 1,
    explanation: 'Les nitrites (E249, E250), utilisés comme conservateurs dans la charcuterie, sont classés cancérogènes avérés (Groupe 1) par le CIRC. Ils forment des nitrosamines cancérigènes dans l\'estomac.',
  },
  {
    id: 'quiz-5',
    question: 'Quel matériau est le plus sûr pour conserver les aliments ?',
    options: ['Plastique alimentaire', 'Aluminium', 'Verre'],
    correctIndex: 2,
    explanation: 'Le verre est chimiquement inerte : il ne libère aucune substance dans les aliments, quelle que soit la température. C\'est le matériau le plus sûr pour la conservation alimentaire.',
  },
  {
    id: 'quiz-6',
    question: 'Que signifie "arôme naturel" sur une étiquette ?',
    options: ['Extrait pur d\'un fruit ou légume', 'Peut contenir des dizaines de substances chimiques', 'Aucun risque pour la santé'],
    correctIndex: 1,
    explanation: 'Le terme "arôme naturel" est trompeur : il peut regrouper jusqu\'à 100 substances chimiques différentes, dont certaines sont produites par synthèse. La réglementation n\'oblige pas les fabricants à détailler la composition.',
  },
  {
    id: 'quiz-7',
    question: 'Combien de temps les PFAS ("polluants éternels") persistent-ils dans l\'environnement ?',
    options: ['10 ans', '100 ans', 'Des milliers d\'années'],
    correctIndex: 2,
    explanation: 'Les PFAS sont surnommés "polluants éternels" car leur structure chimique les rend pratiquement indestructibles. Ils s\'accumulent dans l\'eau, les sols et le corps humain pendant des milliers d\'années.',
  },
  {
    id: 'quiz-8',
    question: 'Quel est le meilleur réflexe quand vous achetez des vêtements neufs ?',
    options: ['Les porter directement', 'Les laver avant de les porter', 'Les aérer 24h'],
    correctIndex: 1,
    explanation: 'Les vêtements neufs contiennent souvent du formaldéhyde (Groupe 1 CIRC) utilisé comme anti-froissage. Un premier lavage élimine une grande partie de ces résidus chimiques potentiellement cancérigènes.',
  },
  {
    id: 'quiz-9',
    question: 'Pourquoi l\'huile de tournesol est-elle considérée comme problématique ?',
    options: ['Elle contient du cholestérol', 'Elle est riche en oméga-6 pro-inflammatoire', 'Elle est toujours OGM'],
    correctIndex: 1,
    explanation: 'L\'huile de tournesol est très riche en oméga-6, un acide gras pro-inflammatoire. L\'inflammation chronique est un facteur reconnu dans le développement de nombreux cancers. Préférez l\'huile d\'olive extra vierge.',
  },
  {
    id: 'quiz-10',
    question: 'Le dioxyde de titane (E171) est interdit dans les aliments dans quel pays ?',
    options: ['Canada', 'États-Unis', 'France'],
    correctIndex: 2,
    explanation: 'La France a interdit le E171 dans les aliments en 2020, suivie par l\'Union Européenne en 2022, en raison de préoccupations liées à la génotoxicité. Il reste autorisé au Canada et aux États-Unis.',
  },
  {
    id: 'quiz-11',
    question: 'Sous quel nom le glutamate (MSG) peut-il se cacher sur une étiquette ?',
    options: ['Vitamine C', 'Extrait de levure', 'Acide folique'],
    correctIndex: 1,
    explanation: 'L\'extrait de levure est une forme cachée de glutamate monosodique. Les fabricants l\'utilisent pour contourner les étiquetages obligatoires. D\'autres noms cachés : protéine hydrolysée, arôme naturel, autolysat de levure.',
  },
  {
    id: 'quiz-12',
    question: 'Quel pourcentage des cancers pourrait être évité selon l\'OMS ?',
    options: ['10 à 20%', '30 à 50%', '70 à 80%'],
    correctIndex: 1,
    explanation: 'L\'OMS estime que 30 à 50% des cancers pourraient être prévenus par une meilleure alimentation, l\'évitement des substances toxiques et un mode de vie sain. D\'où l\'importance de savoir ce que contiennent nos produits.',
  },
  {
    id: 'quiz-13',
    question: 'Quelle substance retrouve-t-on dans presque tous les laits pour bébé selon Consumer Reports ?',
    options: ['Vitamine D', 'PFAS (polluants éternels)', 'Calcium'],
    correctIndex: 1,
    explanation: 'Les PFAS (substances per- et polyfluoroalkylées) ont été retrouvés dans presque toutes les marques de lait pour bébé testées. Ces polluants éternels sont cancérogènes, perturbateurs endocriniens et affaiblissent le système immunitaire des bébés.',
  },
  {
    id: 'quiz-14',
    question: 'Quel conservateur dans les lingettes bébé libère du formaldéhyde ?',
    options: ['Vitamine E', 'DMDM Hydantoïne', 'Glycérine'],
    correctIndex: 1,
    explanation: 'La DMDM hydantoïne est un conservateur qui libère lentement du formaldéhyde, un cancérogène avéré Groupe 1 du CIRC. On le retrouve dans de nombreuses lingettes bébé, crèmes et shampoings.',
  },
  {
    id: 'quiz-15',
    question: 'Quelle substance dans les shampoings antipelliculaires est cancérogène avérée Groupe 1 ?',
    options: ['Zinc pyrithione', 'Goudron de houille (coal tar)', 'Kétoconazole'],
    correctIndex: 1,
    explanation: 'Le goudron de houille (coal tar) utilisé dans certains shampoings antipelliculaires est classé cancérogène avéré Groupe 1 par le CIRC. Préférez des alternatives naturelles comme l\'huile d\'arbre à thé.',
  },
  {
    id: 'quiz-16',
    question: 'Quel type de plastique contient du BPA ?',
    options: ['Plastique #1 (PET)', 'Plastique #7 (Polycarbonate)', 'Plastique #5 (PP)'],
    correctIndex: 1,
    explanation: 'Le polycarbonate (plastique #7) contient du BPA, un perturbateur endocrinien lié au cancer du sein et de la prostate. Préférez les contenants en verre, inox ou plastique #5 (PP) qui est plus sûr.',
  },
  {
    id: 'quiz-17',
    question: 'Pourquoi faut-il éviter l\'eau de Javel comme désinfectant ?',
    options: ['Elle sent mauvais', 'Elle produit des dioxines cancérogènes', 'Elle coûte cher'],
    correctIndex: 1,
    explanation: 'L\'eau de Javel (hypochlorite de sodium) produit des dioxines, des substances classées cancérogènes avérés. Le percarbonate de soude est une alternative naturelle et efficace pour désinfecter.',
  },
  {
    id: 'quiz-18',
    question: 'Quelle substance dans les vêtements imperméables est cancérogène ?',
    options: ['Coton traité', 'PFAS / PFC', 'Polyester simple'],
    correctIndex: 1,
    explanation: 'Les PFAS (perfluorochimiques) utilisés pour rendre les vêtements imperméables, anti-taches et anti-rides sont des polluants éternels cancérogènes et perturbateurs endocriniens.',
  },
  {
    id: 'quiz-19',
    question: 'Pourquoi la vaisselle en mélamine est-elle dangereuse ?',
    options: ['Elle casse facilement', 'Elle libère du formaldéhyde quand chauffée', 'Elle change de couleur'],
    correctIndex: 1,
    explanation: 'La vaisselle en mélamine peut libérer du formaldéhyde (cancérogène Groupe 1) lorsqu\'elle est chauffée. Il ne faut jamais l\'utiliser au micro-ondes ni y servir des aliments très chauds.',
  },
  {
    id: 'quiz-20',
    question: 'Que signifie un vernis à ongles "5-free" ?',
    options: ['Il coûte 5 dollars', 'Il est sans 5 substances toxiques (toluène, formaldéhyde, DBP, etc.)', 'Il sèche en 5 minutes'],
    correctIndex: 1,
    explanation: 'Un vernis "5-free" est formulé sans les 5 substances les plus toxiques : toluène (neurotoxique), formaldéhyde (cancérogène), DBP (phtalate), résine de formaldéhyde et camphre synthétique.',
  },
];

const QUIZ_QUESTIONS_EN: QuizQuestion[] = [
  { id: 'quiz-1', question: 'Which food coloring is banned in Europe but allowed in North America?', options: ['E150d (caramel)', 'Red 40 (E129)', 'E100 (curcumin)'], correctIndex: 1, explanation: 'Red 40 (Allura Red, E129) is one of the most controversial azo dyes. It is banned in several European countries due to its links with hyperactivity in children and potential carcinogenic risks.' },
  { id: 'quiz-2', question: 'At what temperature does plastic start releasing toxic substances?', options: ['50°C / 122°F', '70°C / 158°F', '100°C / 212°F'], correctIndex: 1, explanation: 'From 70°C (158°F), plastics begin releasing endocrine disruptors like BPA and phthalates. This is why you should never heat food in a plastic container in the microwave.' },
  { id: 'quiz-3', question: 'What is the #1 anti-cancer food according to studies?', options: ['Broccoli', 'Carrot', 'Tomato'], correctIndex: 0, explanation: 'Broccoli contains sulforaphane, a compound that activates the body\'s detoxification enzymes and inhibits cancer cell growth. It is the most studied food for its anti-cancer properties.' },
  { id: 'quiz-4', question: 'Which additive is classified as a proven carcinogen (Group 1) by the IARC?', options: ['Aspartame (E951)', 'Sodium nitrite (E250)', 'Citric acid (E330)'], correctIndex: 1, explanation: 'Nitrites (E249, E250), used as preservatives in processed meat, are classified as proven carcinogens (Group 1) by the IARC. They form carcinogenic nitrosamines in the stomach.' },
  { id: 'quiz-5', question: 'What material is safest for storing food?', options: ['Food-grade plastic', 'Aluminum', 'Glass'], correctIndex: 2, explanation: 'Glass is chemically inert: it releases no substances into food, regardless of temperature. It is the safest material for food storage.' },
  { id: 'quiz-6', question: 'What does "natural flavor" mean on a label?', options: ['Pure extract from a fruit or vegetable', 'Can contain dozens of chemical substances', 'No health risk'], correctIndex: 1, explanation: 'The term "natural flavor" is misleading: it can encompass up to 100 different chemical substances, some produced by synthesis. Regulations do not require manufacturers to detail the composition.' },
  { id: 'quiz-7', question: 'How long do PFAS ("forever chemicals") persist in the environment?', options: ['10 years', '100 years', 'Thousands of years'], correctIndex: 2, explanation: 'PFAS are called "forever chemicals" because their chemical structure makes them virtually indestructible. They accumulate in water, soil, and the human body for thousands of years.' },
  { id: 'quiz-8', question: 'What is the best reflex when buying new clothes?', options: ['Wear them right away', 'Wash them before wearing', 'Air them out for 24h'], correctIndex: 1, explanation: 'New clothes often contain formaldehyde (IARC Group 1) used as an anti-wrinkle agent. A first wash removes a large portion of these potentially carcinogenic chemical residues.' },
  { id: 'quiz-9', question: 'Why is sunflower oil considered problematic?', options: ['It contains cholesterol', 'It is rich in pro-inflammatory omega-6', 'It is always GMO'], correctIndex: 1, explanation: 'Sunflower oil is very rich in omega-6, a pro-inflammatory fatty acid. Chronic inflammation is a recognized factor in the development of many cancers. Prefer extra virgin olive oil.' },
  { id: 'quiz-10', question: 'Titanium dioxide (E171) is banned in food in which country?', options: ['Canada', 'United States', 'France'], correctIndex: 2, explanation: 'France banned E171 in food in 2020, followed by the European Union in 2022, due to genotoxicity concerns. It remains legal in Canada and the United States.' },
  { id: 'quiz-11', question: 'Under what name can glutamate (MSG) hide on a label?', options: ['Vitamin C', 'Yeast extract', 'Folic acid'], correctIndex: 1, explanation: 'Yeast extract is a hidden form of monosodium glutamate. Manufacturers use it to bypass mandatory labeling. Other hidden names: hydrolyzed protein, natural flavor, yeast autolysate.' },
  { id: 'quiz-12', question: 'What percentage of cancers could be prevented according to the WHO?', options: ['10 to 20%', '30 to 50%', '70 to 80%'], correctIndex: 1, explanation: 'The WHO estimates that 30 to 50% of cancers could be prevented through better diet, avoidance of toxic substances, and a healthy lifestyle. Hence the importance of knowing what our products contain.' },
  { id: 'quiz-13', question: 'Which substance is found in almost all baby formulas according to Consumer Reports?', options: ['Vitamin D', 'PFAS (forever chemicals)', 'Calcium'], correctIndex: 1, explanation: 'PFAS (per- and polyfluoroalkyl substances) were found in almost all baby formula brands tested. These forever chemicals are carcinogenic, endocrine disruptors, and weaken babies\' immune systems.' },
  { id: 'quiz-14', question: 'Which preservative in baby wipes releases formaldehyde?', options: ['Vitamin E', 'DMDM Hydantoin', 'Glycerin'], correctIndex: 1, explanation: 'DMDM hydantoin is a preservative that slowly releases formaldehyde, a proven IARC Group 1 carcinogen. It is found in many baby wipes, creams, and shampoos.' },
  { id: 'quiz-15', question: 'Which substance in anti-dandruff shampoos is a proven Group 1 carcinogen?', options: ['Zinc pyrithione', 'Coal tar', 'Ketoconazole'], correctIndex: 1, explanation: 'Coal tar used in some anti-dandruff shampoos is classified as a proven IARC Group 1 carcinogen. Prefer natural alternatives like tea tree oil.' },
  { id: 'quiz-16', question: 'Which type of plastic contains BPA?', options: ['Plastic #1 (PET)', 'Plastic #7 (Polycarbonate)', 'Plastic #5 (PP)'], correctIndex: 1, explanation: 'Polycarbonate (plastic #7) contains BPA, an endocrine disruptor linked to breast and prostate cancer. Prefer glass, stainless steel, or plastic #5 (PP) containers which are safer.' },
  { id: 'quiz-17', question: 'Why should you avoid bleach as a disinfectant?', options: ['It smells bad', 'It produces carcinogenic dioxins', 'It is expensive'], correctIndex: 1, explanation: 'Bleach (sodium hypochlorite) produces dioxins, substances classified as proven carcinogens. Sodium percarbonate is a natural and effective alternative for disinfecting.' },
  { id: 'quiz-18', question: 'Which substance in waterproof clothing is carcinogenic?', options: ['Treated cotton', 'PFAS / PFC', 'Plain polyester'], correctIndex: 1, explanation: 'PFAS (perfluorochemicals) used to make clothing waterproof, stain-resistant, and wrinkle-resistant are carcinogenic forever chemicals and endocrine disruptors.' },
  { id: 'quiz-19', question: 'Why is melamine dinnerware dangerous?', options: ['It breaks easily', 'It releases formaldehyde when heated', 'It changes color'], correctIndex: 1, explanation: 'Melamine dinnerware can release formaldehyde (Group 1 carcinogen) when heated. It should never be used in the microwave or for serving very hot food.' },
  { id: 'quiz-20', question: 'What does a "5-free" nail polish mean?', options: ['It costs $5', 'It is free of 5 toxic substances (toluene, formaldehyde, DBP, etc.)', 'It dries in 5 minutes'], correctIndex: 1, explanation: 'A "5-free" polish is formulated without the 5 most toxic substances: toluene (neurotoxic), formaldehyde (carcinogen), DBP (phthalate), formaldehyde resin, and synthetic camphor.' },
];

export const QUIZ_QUESTIONS: QuizQuestion[] = isEnglish() ? QUIZ_QUESTIONS_EN : QUIZ_QUESTIONS_FR;

export function getTodayAlerts(): HealthAlert[] {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const startIndex = dayOfYear % HEALTH_ALERTS.length;
  const alerts: HealthAlert[] = [];
  for (let i = 0; i < 3; i++) {
    alerts.push(HEALTH_ALERTS[(startIndex + i) % HEALTH_ALERTS.length]);
  }
  return alerts;
}

export function getTodayFact(): DailyFact {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_FACTS[dayOfYear % DAILY_FACTS.length];
}

export function getTodayFactIndex(): number {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return dayOfYear % DAILY_FACTS.length;
}

export function getTodayQuiz(): QuizQuestion {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return QUIZ_QUESTIONS[dayOfYear % QUIZ_QUESTIONS.length];
}
