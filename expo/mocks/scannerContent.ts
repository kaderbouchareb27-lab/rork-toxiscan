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

export const HEALTH_ALERTS: HealthAlert[] = [
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

export const DAILY_FACTS: DailyFact[] = [
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
];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
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
