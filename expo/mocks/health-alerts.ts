export interface HealthAlert {
  id: string;
  title: string;
  summary: string;
  source: string;
  date: string;
}

export const HEALTH_ALERTS: HealthAlert[] = [
  {
    id: 'alert-1',
    title: 'États-Unis : le Red 3 (érythrosine) officiellement interdit dans les aliments par la FDA',
    summary: 'La FDA a finalement interdit le colorant Red 3 (E127) dans les aliments et médicaments ingérés. Ce colorant, utilisé depuis des décennies, est lié au cancer de la thyroïde chez les rats. Les fabricants ont jusqu\'à janvier 2027 pour reformuler leurs produits. ToxiScan le signale déjà comme substance à risque possible (jaune).',
    source: 'FDA, janvier 2025',
    date: '2025-01-15',
  },
  {
    id: 'alert-2',
    title: 'Canada : rappel de produits contenant du dioxyde de titane E171',
    summary: 'Santé Canada a émis un avis de rappel pour plusieurs produits alimentaires importés contenant du dioxyde de titane (E171), interdit en France depuis 2020. Cette substance nanoparticulaire peut traverser la barrière intestinale et est classée possiblement cancérogène (Groupe 2B) par le CIRC.',
    source: 'Santé Canada, 2025',
    date: '2025-02-10',
  },
  {
    id: 'alert-3',
    title: 'France : nouvelle étude confirme les risques des nitrites dans la charcuterie',
    summary: 'Une étude de l\'INSERM confirme que la consommation régulière de nitrites (E249, E250) dans la charcuterie augmente significativement le risque de cancer colorectal. L\'ANSES recommande de limiter la consommation à 150g de charcuterie par semaine maximum. Privilégiez les charcuteries sans nitrites.',
    source: 'INSERM / ANSES, 2025',
    date: '2025-03-05',
  },
  {
    id: 'alert-4',
    title: 'OMS : l\'aspartame maintenu en catégorie possiblement cancérigène',
    summary: 'L\'Organisation Mondiale de la Santé maintient l\'aspartame (E951) en catégorie 2B "possiblement cancérogène". Le JECFA recommande de ne pas dépasser 40mg/kg de poids corporel par jour. Une canette de soda light contient environ 200mg d\'aspartame. ToxiScan le signale en jaune.',
    source: 'OMS / CIRC, 2024',
    date: '2024-12-20',
  },
  {
    id: 'alert-5',
    title: 'Europe : les PFAS "polluants éternels" bientôt interdits dans les emballages alimentaires',
    summary: 'L\'Union Européenne prépare une interdiction des PFAS (substances per- et polyfluoroalkylées) dans les emballages alimentaires. Ces "polluants éternels" sont liés à des cancers du rein et des testicules. On les trouve dans les emballages anti-graisse, les poêles antiadhésives et certains textiles imperméables.',
    source: 'Commission Européenne, 2025',
    date: '2025-01-28',
  },
  {
    id: 'alert-6',
    title: 'Étude : les microplastiques détectés dans 90% des bouteilles d\'eau en plastique',
    summary: 'Une étude publiée dans PNAS révèle que les bouteilles d\'eau en plastique contiennent en moyenne 240 000 nanoplastiques par litre. Ces particules peuvent traverser les membranes cellulaires et s\'accumuler dans les organes. Conseil : privilégiez les bouteilles en verre ou l\'eau filtrée.',
    source: 'PNAS / Columbia University, 2024',
    date: '2024-11-15',
  },
  {
    id: 'alert-7',
    title: 'Alerte : le BPA toujours présent dans 60% des canettes de boisson',
    summary: 'Malgré les promesses des industriels, une analyse indépendante révèle que 60% des canettes de boisson contiennent encore du bisphénol A (BPA) dans leur revêtement intérieur. Le BPA est un perturbateur endocrinien classé Groupe 2B par le CIRC. Privilégiez les bouteilles en verre.',
    source: 'Environmental Health Perspectives, 2025',
    date: '2025-02-22',
  },
  {
    id: 'alert-8',
    title: 'Québec : mise en garde contre les ustensiles de cuisine en mélamine',
    summary: 'L\'INSPQ met en garde contre l\'utilisation d\'assiettes et bols en mélamine avec des aliments chauds. La mélamine migre dans les aliments à partir de 70°C et est classée cancérogène possible. Ne jamais utiliser au micro-ondes. Privilégiez la céramique, le verre ou l\'inox.',
    source: 'INSPQ, 2025',
    date: '2025-03-12',
  },
];

export function getTodayAlerts(): HealthAlert[] {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const startIndex = (dayOfYear * 2) % HEALTH_ALERTS.length;
  const alerts: HealthAlert[] = [];
  for (let i = 0; i < 3; i++) {
    alerts.push(HEALTH_ALERTS[(startIndex + i) % HEALTH_ALERTS.length]);
  }
  return alerts;
}
