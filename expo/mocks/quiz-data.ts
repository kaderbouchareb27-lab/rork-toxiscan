export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'quiz-1',
    question: 'Quel colorant alimentaire est interdit en Europe mais autorisé en Amérique du Nord ?',
    options: ['E150d (caramel)', 'Red 40 (E129)', 'E100 (curcumine)'],
    correctIndex: 1,
    explanation: 'Le Red 40 (Allura Red, E129) est l\'un des colorants azoïques les plus utilisés en Amérique du Nord. Il est lié à l\'hyperactivité chez les enfants et est restreint ou interdit dans plusieurs pays européens.',
  },
  {
    id: 'quiz-2',
    question: 'À quelle température le plastique commence à libérer des substances toxiques ?',
    options: ['50°C', '70°C', '100°C'],
    correctIndex: 1,
    explanation: 'Dès 70°C, les plastiques commencent à libérer des perturbateurs endocriniens comme le BPA et les phtalates. C\'est pourquoi il ne faut jamais chauffer de la nourriture dans un contenant en plastique au micro-ondes.',
  },
  {
    id: 'quiz-3',
    question: 'Quel est l\'aliment anti-cancer numéro 1 selon les études ?',
    options: ['Brocoli', 'Carotte', 'Tomate'],
    correctIndex: 0,
    explanation: 'Le brocoli contient du sulforaphane, un composé étudié dans plus de 3000 études scientifiques pour ses propriétés anti-cancer. Il active les enzymes de détoxification et inhibe la croissance des cellules cancéreuses.',
  },
  {
    id: 'quiz-4',
    question: 'Combien de microplastiques ingère-t-on en moyenne par semaine ?',
    options: ['1 gramme', '5 grammes', '10 grammes'],
    correctIndex: 1,
    explanation: '5 grammes, soit l\'équivalent d\'une carte de crédit ! Les principales sources sont l\'eau en bouteille plastique, les emballages alimentaires et les fruits de mer. Privilégiez le verre et l\'eau filtrée.',
  },
  {
    id: 'quiz-5',
    question: 'Quel matériau de cuisson est le plus sûr pour la santé ?',
    options: ['Teflon', 'Fonte', 'Aluminium'],
    correctIndex: 1,
    explanation: 'La fonte est le matériau de cuisson le plus sûr. Elle ne libère aucune substance toxique et dure toute une vie. Le Teflon rayé libère des PFAS cancérogènes, et l\'aluminium peut migrer dans les aliments acides.',
  },
  {
    id: 'quiz-6',
    question: 'Que signifie "arôme naturel" sur une étiquette ?',
    options: ['Un arôme issu directement du fruit', 'Un mélange pouvant contenir jusqu\'à 100 substances chimiques', 'Un arôme certifié bio'],
    correctIndex: 1,
    explanation: 'Le terme "arôme naturel" est trompeur : il peut contenir jusqu\'à 100 substances chimiques différentes sans obligation de les nommer individuellement. Seule l\'origine initiale doit être naturelle, pas le processus de fabrication.',
  },
  {
    id: 'quiz-7',
    question: 'Le dioxyde de titane (E171) est interdit dans quel pays ?',
    options: ['Canada', 'France', 'États-Unis'],
    correctIndex: 1,
    explanation: 'La France a interdit le dioxyde de titane (E171) dans les aliments depuis 2020, suivie par l\'Union Européenne en 2022. Ce nanoparticule peut traverser la barrière intestinale. Il reste autorisé au Canada et aux USA.',
  },
  {
    id: 'quiz-8',
    question: 'Quel pourcentage des canettes contient encore du BPA ?',
    options: ['20%', '40%', '60%'],
    correctIndex: 2,
    explanation: '60% des canettes de boisson contiennent encore du bisphénol A (BPA) dans leur revêtement intérieur. Le BPA est un perturbateur endocrinien classé cancérogène possible. Préférez les bouteilles en verre.',
  },
  {
    id: 'quiz-9',
    question: 'Le MSG (glutamate monosodique) est souvent caché sous quel nom ?',
    options: ['Vitamine C', 'Extrait de levure', 'Acide folique'],
    correctIndex: 1,
    explanation: 'L\'extrait de levure est une forme cachée de glutamate monosodique (MSG). D\'autres noms cachés incluent : protéine hydrolysée, arôme naturel, assaisonnement. Lisez toujours les étiquettes attentivement.',
  },
  {
    id: 'quiz-10',
    question: 'Quelle huile de cuisson est la plus anti-inflammatoire ?',
    options: ['Huile de tournesol', 'Huile de canola', 'Huile d\'olive extra vierge'],
    correctIndex: 2,
    explanation: 'L\'huile d\'olive extra vierge contient de l\'oléocanthal, un anti-inflammatoire naturel aussi puissant que l\'ibuprofène. Les huiles de tournesol et canola sont riches en oméga-6 pro-inflammatoires.',
  },
  {
    id: 'quiz-11',
    question: 'Pourquoi faut-il laver les vêtements neufs avant de les porter ?',
    options: ['Pour enlever la poussière', 'Pour éliminer le formaldéhyde', 'Pour assouplir le tissu'],
    correctIndex: 1,
    explanation: 'Les vêtements neufs sont traités au formaldéhyde (cancérogène Groupe 1) pour résister aux plis et aux moisissures pendant le transport. Un premier lavage élimine une grande partie de cette substance dangereuse.',
  },
  {
    id: 'quiz-12',
    question: 'Combien de substances chimiques peut cacher le terme "parfum" sur une étiquette ?',
    options: ['5 à 10', '20 à 50', '50 à 200'],
    correctIndex: 2,
    explanation: 'Le terme "parfum" ou "fragrance" peut cacher entre 50 et 200 substances chimiques différentes, dont des perturbateurs endocriniens et des allergènes. Les fabricants ne sont pas obligés de les détailler.',
  },
  {
    id: 'quiz-13',
    question: 'Quel est le conservateur le plus dangereux dans la charcuterie ?',
    options: ['Sel (NaCl)', 'Nitrite de sodium (E250)', 'Acide ascorbique (E300)'],
    correctIndex: 1,
    explanation: 'Le nitrite de sodium (E250) est classé cancérogène avéré (Groupe 1) par le CIRC. Dans l\'estomac, il se transforme en nitrosamines, des composés hautement cancérogènes. Choisissez de la charcuterie sans nitrites.',
  },
  {
    id: 'quiz-14',
    question: 'Les PFAS "polluants éternels" se trouvent dans quel objet du quotidien ?',
    options: ['Poêles antiadhésives', 'Casseroles en inox', 'Bols en céramique'],
    correctIndex: 0,
    explanation: 'Les PFAS se trouvent dans les poêles antiadhésives (Teflon), les emballages anti-graisse et les vêtements imperméables. Ils ne se décomposent jamais dans l\'environnement et s\'accumulent dans le corps humain.',
  },
  {
    id: 'quiz-15',
    question: 'Quel pays a le taux de cancer le plus bas des pays développés ?',
    options: ['Suisse', 'Japon', 'Norvège'],
    correctIndex: 1,
    explanation: 'Le Japon a le taux de cancer le plus bas des pays développés, grâce à une alimentation riche en poisson, légumes, thé vert et aliments fermentés, avec très peu de produits ultra-transformés.',
  },
];

export function getTodayQuiz(): QuizQuestion {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return QUIZ_QUESTIONS[dayOfYear % QUIZ_QUESTIONS.length];
}
