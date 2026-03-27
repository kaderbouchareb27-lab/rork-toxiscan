export interface DailyFact {
  id: string;
  text: string;
}

export const DAILY_FACTS: DailyFact[] = [
  { id: 'fact-1', text: 'Le cancer colorectal a augmenté de 45% chez les moins de 50 ans depuis 1990.' },
  { id: 'fact-2', text: 'Chauffer du plastique au micro-ondes libère des microplastiques dans votre nourriture.' },
  { id: 'fact-3', text: 'Les nitrites dans la charcuterie sont classés cancérogènes avérés (Groupe 1) depuis 2015.' },
  { id: 'fact-4', text: 'Le brocoli contient du sulforaphane, un puissant composé anti-cancer étudié dans plus de 3000 études.' },
  { id: 'fact-5', text: 'Un Européen ingère en moyenne 5 grammes de microplastiques par semaine, soit l\'équivalent d\'une carte de crédit.' },
  { id: 'fact-6', text: 'Le curcuma est l\'un des anti-inflammatoires naturels les plus puissants. Ajoutez du poivre noir pour multiplier son absorption par 2000%.' },
  { id: 'fact-7', text: 'Les poêles en Teflon rayées libèrent des PFAS "polluants éternels" qui restent dans votre corps pendant des années.' },
  { id: 'fact-8', text: 'Le formaldéhyde, cancérogène avéré (Groupe 1), se trouve dans les meubles en aggloméré, les vêtements neufs et certains cosmétiques.' },
  { id: 'fact-9', text: 'Les bocaux en verre ne libèrent aucune substance dans vos aliments, contrairement au plastique et aux canettes.' },
  { id: 'fact-10', text: 'L\'huile d\'olive extra vierge contient de l\'oléocanthal, un composé anti-inflammatoire aussi puissant que l\'ibuprofène.' },
  { id: 'fact-11', text: 'Le glutamate monosodique (MSG/E621) est caché sous de nombreux noms : extrait de levure, arôme naturel, protéine hydrolysée.' },
  { id: 'fact-12', text: 'Les colorants azoïques (E102, E110, E129) sont interdits dans certains pays mais toujours autorisés en Amérique du Nord.' },
  { id: 'fact-13', text: 'Laver vos vêtements neufs avant de les porter élimine une grande partie du formaldéhyde utilisé dans le traitement des textiles.' },
  { id: 'fact-14', text: 'Le BPA (bisphénol A) présent dans les plastiques et canettes est un perturbateur endocrinien détectable dans 93% de la population.' },
  { id: 'fact-15', text: 'Les aliments ultra-transformés représentent 50% des calories consommées en Amérique du Nord.' },
  { id: 'fact-16', text: 'La fonte et l\'inox sont les matériaux de cuisson les plus sûrs. Ils ne libèrent aucune substance toxique, même à haute température.' },
  { id: 'fact-17', text: 'Le dioxyde de titane (E171) est interdit en France depuis 2020 mais reste autorisé au Canada et aux États-Unis.' },
  { id: 'fact-18', text: 'Les fruits et légumes biologiques contiennent en moyenne 48% moins de résidus de pesticides que les conventionnels.' },
  { id: 'fact-19', text: 'L\'aspartame (E951) est classé "possiblement cancérogène" (Groupe 2B) par le CIRC depuis 2023.' },
  { id: 'fact-20', text: 'Conserver vos aliments dans des contenants en verre au lieu du plastique réduit votre exposition aux perturbateurs endocriniens de 60%.' },
  { id: 'fact-21', text: 'Les PFAS "polluants éternels" sont présents dans les poêles antiadhésives, les emballages anti-graisse et les vêtements imperméables.' },
  { id: 'fact-22', text: 'Le thé vert contient des catéchines, des antioxydants puissants qui inhibent la croissance des cellules cancéreuses in vitro.' },
  { id: 'fact-23', text: 'Les nanoplastiques des bouteilles en plastique peuvent traverser la barrière intestinale et s\'accumuler dans vos organes.' },
  { id: 'fact-24', text: 'La maltodextrine, présente dans de nombreux produits ultra-transformés, a un indice glycémique plus élevé que le sucre blanc.' },
  { id: 'fact-25', text: 'Les bougies parfumées peuvent libérer du formaldéhyde et du benzène, deux cancérogènes avérés (Groupe 1).' },
  { id: 'fact-26', text: 'Manger 5 portions de fruits et légumes par jour réduit le risque de cancer de 20% selon l\'OMS.' },
  { id: 'fact-27', text: 'Le chrome hexavalent, cancérogène avéré, se trouve dans certains cuirs traités et bijoux fantaisie bas de gamme.' },
  { id: 'fact-28', text: 'L\'arôme "naturel" sur une étiquette peut contenir jusqu\'à 100 substances chimiques différentes sans obligation de les nommer.' },
  { id: 'fact-29', text: 'Les planches à découper en plastique rayées accumulent des bactéries et libèrent des microplastiques. Préférez le bois.' },
  { id: 'fact-30', text: 'Le Japon a le taux de cancer le plus bas des pays développés, avec une alimentation riche en poisson, légumes et thé vert.' },
];

export function getTodayFacts(): DailyFact[] {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const startIndex = dayOfYear % DAILY_FACTS.length;
  const facts: DailyFact[] = [];
  for (let i = 0; i < 5; i++) {
    facts.push(DAILY_FACTS[(startIndex + i) % DAILY_FACTS.length]);
  }
  return facts;
}
