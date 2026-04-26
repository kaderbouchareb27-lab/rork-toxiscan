import { ScannedProduct, DetectedIngredient, UniversalAnalysisResult, ProductCategory, SubstanceDetected, RiskGroup } from '@/types';
import { niveauRisqueToGroup } from '@/constants/additives';
import { z } from 'zod';
import { aiGenerateObject } from '@/utils/aiApi';
import { lookupBarcode, searchByName, formatOpenFactsContext, OpenFactsResult } from '@/utils/openFoodFacts';
import { getAnalysisRegionPrompt } from '@/utils/regionDetection';
import { t, isEnglish } from '@/utils/i18n';
import { renderIngredientsDatabaseForPrompt } from '@/constants/ingredientsDatabase';

const CATEGORY_VALUES = ['food', 'beverage', 'kitchen_utensil', 'clothing', 'cosmetic', 'household', 'electronics', 'furniture', 'toy', 'other'] as const;
const RISK_VALUES = ['danger', 'probable', 'possible', 'aucun'] as const;

const CATEGORY_ALIASES: Record<string, typeof CATEGORY_VALUES[number]> = {
  aliment: 'food', aliments: 'food', alimentaire: 'food', nourriture: 'food', food: 'food',
  boisson: 'beverage', boissons: 'beverage', drink: 'beverage', beverage: 'beverage',
  ustensile: 'kitchen_utensil', ustensile_cuisine: 'kitchen_utensil', kitchen: 'kitchen_utensil', cuisine: 'kitchen_utensil', kitchen_utensil: 'kitchen_utensil',
  vetement: 'clothing', vetements: 'clothing', textile: 'clothing', clothing: 'clothing',
  cosmetique: 'cosmetic', cosmetiques: 'cosmetic', cosmetic: 'cosmetic', hygiene: 'cosmetic',
  menager: 'household', menagers: 'household', nettoyage: 'household', household: 'household',
  electronique: 'electronics', electroniques: 'electronics', electronics: 'electronics',
  meuble: 'furniture', meubles: 'furniture', mobilier: 'furniture', furniture: 'furniture',
  jouet: 'toy', jouets: 'toy', toy: 'toy',
  autre: 'other', other: 'other', divers: 'other', inconnu: 'other',
};

const RISK_ALIASES: Record<string, typeof RISK_VALUES[number]> = {
  danger: 'danger', dangereux: 'danger', rouge: 'danger', red: 'danger', high: 'danger', eleve: 'danger', cancerigene: 'danger',
  probable: 'probable', probablement: 'probable', orange: 'probable', medium: 'probable', moyen: 'probable',
  possible: 'possible', possiblement: 'possible', jaune: 'possible', yellow: 'possible', low: 'possible', faible: 'possible',
  moderation: 'possible', avec_moderation: 'possible', moderer: 'possible', moderate: 'possible', caution: 'possible', warning: 'possible', attention: 'possible', mise_en_garde: 'possible', prudence: 'possible', controverse: 'possible', controversial: 'possible',
  aucun: 'aucun', none: 'aucun', vert: 'aucun', green: 'aucun', safe: 'aucun', sur: 'aucun', approuve: 'aucun', approved: 'aucun', ok: 'aucun',
};

function normalizeKey(v: unknown): string {
  return String(v ?? '').toLowerCase().trim().replace(/[\s-]+/g, '_').replace(/[^a-z_]/g, '');
}

const categoryEnum = z.preprocess((v) => {
  const k = normalizeKey(v);
  return CATEGORY_ALIASES[k] ?? (CATEGORY_VALUES as readonly string[]).includes(k) ? (CATEGORY_ALIASES[k] ?? k) : 'other';
}, z.enum(CATEGORY_VALUES));

const riskEnum = z.preprocess((v) => {
  const k = normalizeKey(v);
  const mapped = RISK_ALIASES[k] ?? ((RISK_VALUES as readonly string[]).includes(k) ? k : null);
  if (mapped === null) {
    console.warn('[API] Unknown risk value from AI:', JSON.stringify(v), '-> defaulting to possible (not aucun) for safety');
    return 'possible';
  }
  return mapped;
}, z.enum(RISK_VALUES));

const safeString = (fallback: string = '') =>
  z.preprocess((v) => (v === undefined || v === null ? fallback : typeof v === 'string' ? v : String(v)), z.string());

const safeNullableString = z.preprocess(
  (v) => (v === undefined ? null : typeof v === 'string' || v === null ? v : String(v)),
  z.string().nullable(),
);

const raisonnementSchema = z.object({
  ingredients_lus_bruts: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(safeString(''))),
  nombre_ingredients_lus: z.preprocess((v) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
    return 0;
  }, z.number()),
  deduction_produit: safeString(''),
  verification_exhaustivite: safeString(''),
  verification_coherence_badge: safeString(''),
}).partial().optional();

const universalAnalysisSchema = z.object({
  raisonnement: raisonnementSchema,
  categorie_produit: categoryEnum,
  objet_identifie: safeString('Objet inconnu'),
  materiau_detecte: safeString(''),
  substances_detectees: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.object({
      nom: safeString(''),
      code: safeNullableString,
      classification_circ: safeString(''),
      niveau_risque: riskEnum,
      explication: safeNullableString,
      source_exposition: safeNullableString,
    })),
  ),
  badge_global: riskEnum,
  resume: safeString(''),
  recommandations: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(safeString(''))),
  alternatives_sures: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(safeString(''))),
  alternatives_saines: z.preprocess(
    (v) => {
      if (!Array.isArray(v)) return [];
      return v.map((item) => {
        if (typeof item === 'string') return { nom: item, raison: '' };
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          return {
            nom: typeof obj.nom === 'string' ? obj.nom : '',
            raison: typeof obj.raison === 'string' ? obj.raison : '',
          };
        }
        return { nom: '', raison: '' };
      });
    },
    z.array(z.object({
      nom: safeString(''),
      raison: safeString(''),
    })),
  ).optional(),
  erreur: safeString('').optional(),
});

const INGREDIENTS_DB_TEXT = renderIngredientsDatabaseForPrompt();

const UNIVERSAL_ANALYSIS_PROMPT_FR = `Tu es ToxiScan. Analyse chaque photo et retourne UN JSON structuré.

═══ BASE DE DONNÉES INGRÉDIENTS (source unique — applique-la strictement) ═══

${INGREDIENTS_DB_TEXT}

Règle de classification : pour chaque ingrédient détecté, cherche une correspondance par mot-clé dans la base ci-dessus (insensible à la casse, accents, pluriels). Si trouvé → utilise EXACTEMENT son niveau_risque et sa classification_circ. Si non trouvé → niveau_risque="aucun" avec classification_circ="Non classé par le CIRC".

═══ RÈGLE ANTI-ALARMISME (PRIORITÉ ABSOLUE) ═══

Ne classe JAMAIS un ingrédient en "Groupe 2A" (probablement cancérigène) ou "Groupe 1" (cancérigène avéré) si ce classement n'est pas EXPLICITEMENT listé dans la base de données ci-dessus pour cet ingrédient précis. La classification CIRC est une décision officielle de l'OMS — tu ne peux pas l'inventer.

Liste fermée des ingrédients que tu peux classer "Groupe 2A" : UNIQUEMENT ceux qui apparaissent littéralement avec "Groupe 2A" dans la base ci-dessus (ex: viandes rouges cuites à haute température, acrylamide, nitrates/nitrites transformés en nitrosamines, glyphosate). Même chose pour "Groupe 1" et "Groupe 2B".

Pour tout autre ingrédient non classé par le CIRC :
• Si c'est un additif industriel controversé (sirop, édulcorant, exhausteur, colorant artificiel) → classification_circ="Controversé" ou "Ultra-transformé", niveau_risque="probable" ou "possible" — JAMAIS "danger".
• Si c'est un ingrédient sain ou neutre (eau, sel, farine, légumes, fruits, viandes fraîches, œufs, lait, huile d'olive, épices) → classification_circ="Naturel" ou "Non classé par le CIRC", niveau_risque="aucun".
• Le simple fait qu'un ingrédient soit transformé ne suffit PAS à le rendre cancérigène. Reste factuel.

Règle des 2 ingrédients : si le produit ne contient QUE 1 ou 2 ingrédients au total (ex: "Lait, Ferments" ou "Eau, Sucre"), sois EXTRA prudent avec les classements ORANGE/ROUGE. Un yaourt nature, un fromage blanc, un jus pur, une viande fraîche ne doivent JAMAIS être classés "probable" ou "danger" sans raison CIRC explicite.

Interdit : écrire "substance cancérigène Groupe 2A" dans une explication si la base ne liste PAS cet ingrédient comme Groupe 2A. Utilise plutôt : "ingrédient controversé", "transformation industrielle", "à consommer avec modération", "non classé cancérigène par le CIRC".

Règles par mot-clé (toujours ORANGE, priorité sur la base) : "modifié/modified", "hydrolysé/hydrolyzed", "isolat/isolate", "concentrat/concentrate", "lipolysé/lipolyzed", "interestérifié/interesterified", "hydrogéné/hydrogenated" (sauf "non hydrogéné").

Règle sucre blanc raffiné (sucre/sugar/saccharose) selon position dans la liste : 1er-2e ingrédient → ORANGE ; milieu → JAUNE ; fin ou <5g/portion → VERT.

═══ ÉTAPE 1 — IDENTIFIER LE PRODUIT ═══

objet_identifie = marque + produit (ex: "LU Prince", "Coca-Cola Zero", "Nutella").
Priorité : 1) nom Open Food Facts si fourni ; 2) texte lisible sur l'emballage ; 3) marques connues reconnaissables ; 4) déduction par combinaison d'ingrédients (lait+ferments→Fromage ; farine+sucre+beurre+œufs→Biscuit ; eau+houblon+malt→Bière ; aqua+glycerin+parfum→Cosmétique ; tensioactifs+parfum→Shampoing).
INTERDICTION : ne JAMAIS retourner "Objet inconnu" si un nom OFF existe, du texte est lisible, une marque est reconnaissable, ou une liste d'ingrédients est lisible.

categorie_produit : food | beverage | cosmetic | household | other.

═══ ÉTAPE 2 — LIRE CHAQUE INGRÉDIENT (EXHAUSTIVITÉ CRITIQUE) ═══

1. Trouve le bloc "Ingrédients :" / "INGREDIENTS:"
2. Découpe à chaque virgule/point-virgule/saut de ligne → chaque segment = 1 token
3. Pour CHAQUE token, crée UNE entrée dans substances_detectees (y compris eau, sel, farine, vitamines)
4. Si la liste a N virgules → substances_detectees doit avoir ≥ N+1 entrées
5. Ne fusionne JAMAIS 2 ingrédients. Ne saute AUCUN ingrédient banal.

Chaque entrée : { nom, code (E-xxx ou null), classification_circ, niveau_risque (danger|probable|possible|aucun), explication (OBLIGATOIRE 3 à 5 phrases détaillées), source_exposition }.

RÈGLE CRITIQUE — CHAMP 'explication' : CHAQUE ingrédient (même sain) doit avoir une explication PÉDAGOGIQUE de 3 à 5 phrases en français clair, tutoiement, non-alarmiste. Structure obligatoire :
  1) Phrase 1 : ce qu'est l'ingrédient / son rôle dans le produit (1 phrase simple).
  2) Phrase 2-3 : pourquoi il est controversé OU pourquoi il est sain — cite les effets santé concrets (obésité, diabète, inflammation, cancer du sein/côlon/foie, palpitations, perturbateur endocrinien, allergies, effets cardiovasculaires, etc.).
  3) Phrase 4 : précision sur le classement cancérigène (ex: "Ce n'est pas un cancérogène direct mais la consommation régulière excessive nuit à la santé." / "Classé Groupe 2B par le CIRC (possiblement cancérigène)." / "Non classé cancérogène par le CIRC.").
  4) Ne JAMAIS écrire une explication générique du type "additif controversé, à vérifier". Toujours DÉTAILLER les risques réels.

EXEMPLES de bonnes explications (reproduis ce style) :
• Sucrose : "Le sucre en grande quantité favorise l'obésité, le diabète et l'inflammation chronique, des facteurs de risque reconnus pour plusieurs types de cancers (sein, côlon, foie, pancréas). Ce n'est pas un cancérogène direct mais la consommation régulière excessive nuit à la santé."
• Arômes naturels : "Bien que nommés 'naturels', ces arômes sont souvent extraits avec des procédés chimiques industriels (solvants comme hexane, distillation moléculaire). Leur composition exacte n'est pas divulguée et peut contenir des dizaines de molécules cachées. Ils ne sont pas classés cancérigènes par le CIRC, mais leur consommation régulière reste controversée."
• Colorants (non spécifiés) : "Certaines variétés de colorants peuvent être controversées, surtout les colorants azoïques ou artificiels (E102, E110, E124). Le fabricant ne précise pas ici lesquels, donc principe de précaution. Non classés cancérogènes par le CIRC dans leur ensemble."
• Taurine : "La taurine est un acide aminé synthétique ajouté comme stimulant dans les boissons énergisantes. À haute dose elle peut provoquer des effets cardiovasculaires (palpitations, hypertension), surtout combinée à la caféine. Non classée cancérogène mais sa consommation régulière reste controversée."
• Eau : "Ingrédient de base, sans risque pour la santé. Essentiel à la composition du produit."

CAS SPÉCIAL BOISSONS ÉNERGISANTES (Red Bull, Monster, Rockstar, Bang) : Taurine, Caféine ajoutée, Inositol, Glucuronolactone, Natural/Artificial Flavors, Niacinamide, Pyridoxine HCl, Calcium Pantothenate, Cyanocobalamin = ORANGE (dans un aliment normal ces vitamines B = VERT).

COSMÉTIQUES : règle "perturbateurs endocriniens cumulés" — 3+ dans le même produit = ORANGE minimum. DANGER GROSSESSE : si l'un de ces ingrédients est présent, préfixer resume par "⚠️ DANGER GROSSESSE : " et ajouter en 1re recommandation "Ce produit contient des substances déconseillées pendant la grossesse. Consulte un professionnel de santé."

🦷 MESSAGE DR. TOXI POUR DENTIFRICES ET PRODUITS BUCCAUX (dentifrice, bain de bouche, fil dentaire, spray haleine, gel dentaire) :
Quel que soit le verdict, AJOUTE TOUJOURS cette précision à la fin du champ resume :
"Bonne nouvelle : ce produit est utilisé dans la bouche puis recraché — tu ne l'avales pas. Même s'il contient des ingrédients controversés, le risque est très limité car le produit ne reste pas dans ton corps. Reste vigilant sur les ingrédients vraiment problématiques (formaldéhyde, parabènes, triclosan, métaux lourds) qui peuvent être absorbés par les muqueuses, mais pas de panique pour les conservateurs courants."
Cette précision rassure l'utilisateur tout en restant factuel.

═══ ÉTAPE 3 — VERDICT FINAL (badge_global) ═══

Règle stricte — le plus élevé l'emporte :
• danger → ≥1 ingrédient Groupe 1 EXPLICITEMENT listé comme tel dans la base. Resume : "Attention ! Ce produit contient un ingrédient classé cancérigène par l'OMS (Groupe 1 CIRC). Je te déconseille fortement d'en consommer régulièrement."
• probable → ≥2 ingrédients ORANGE OU ≥1 ROUGE OU ≥5 jaunes cumulés. EXCEPTION : si 1 seul orange isolé avec majorité d'ingrédients naturels (≥70% verts), rétrograder à "possible" (jaune). Resume : "Ce produit contient plusieurs substances controversées ou ultra-transformées. Consomme-le très occasionnellement et cherche une alternative plus naturelle." INTERDIT d'écrire "cancérigène par l'OMS", "classé cancérigène", "Groupe 1" ou "Groupe 2A" dans le resume si aucun ingrédient n'est réellement listé comme tel dans la base.
• possible → 2-3 jaunes, aucun orange/rouge. Resume : "Ce produit contient quelques ingrédients transformés. Tu peux en consommer mais évite d'en faire un aliment du quotidien." INTERDIT d'écrire "cancérigène" dans ce resume.
• aucun → 0-1 jaune isolé parmi des naturels sains. Resume : "Ce produit est globalement très bon. La grande majorité des ingrédients sont naturels et sains."

Interdits absolus pour "aucun" : HFCS, dextrose, sirop de glucose, colorants FD&C, BHA, BHT, TBHQ, sodium benzoate, carraghénane, aspartame, acésulfame K, sucralose, nitrites/nitrates.

⚠️ RÈGLE ABSOLUE D'AFFICHAGE DES SUBSTANCES — EXHAUSTIVITÉ TOTALE ⚠️
Tu DOIS afficher dans substances_detectees ABSOLUMENT TOUS les ingrédients de la liste, du PREMIER au DERNIER, SANS EXCEPTION, quel que soit le verdict final (rouge, orange, jaune ou vert).

RÈGLE D'OR : substances_detectees.length DOIT être STRICTEMENT ÉGAL au nombre d'ingrédients lus sur l'étiquette (ingredients_lus_bruts.length).

• Si l'étiquette contient 15 ingrédients → 15 entrées (peu importe leur couleur).
• Si l'étiquette contient 8 ingrédients → 8 entrées (peu importe leur couleur).
• Chaque ingrédient reçoit SA propre couleur réelle (rouge, orange, jaune ou vert) selon la base de données.
• Les ingrédients sains (eau, sel, farine, œufs, lait, huile de colza, levure, amidon, etc.) doivent apparaître AVEC un badge VERT (niveau_risque="aucun") et l'explication courte "Ingrédient naturel sans risque identifié".
• Les sous-ingrédients entre parenthèses peuvent être regroupés dans le même nom (ex: "Poudres à lever (diphosphates, carbonates de sodium)" = 1 entrée), mais aucun ingrédient principal ne doit être omis.

ORDRE D'AFFICHAGE — tri obligatoire de substances_detectees :
1. D'abord tous les ROUGES (danger)
2. Ensuite tous les ORANGES (probable)
3. Ensuite tous les JAUNES (possible)
4. Enfin tous les VERTS (aucun) — TOUJOURS inclus, jamais omis

INTERDIT ABSOLU :
- Ne JAMAIS omettre un ingrédient sain sous prétexte que le verdict est orange ou rouge.
- Ne JAMAIS s'arrêter aux ingrédients problématiques. La liste doit être complète.
- Ne JAMAIS afficher seulement 4 ingrédients quand l'étiquette en contient 15.
- Exemple concret : si une génoise contient (Sucre, Farine de blé, Huile de colza, Œufs, Chocolat en poudre, Pâte de noisette, Lait écrémé, Sirop de glucose-fructose, Poudres à lever, Émulsifiants E471, Sel, Acide citrique, Amidon de blé, Arômes naturels, Levure sèche) → tu DOIS afficher les 15 ingrédients (4 jaunes + 11 verts), pas seulement les 4 problématiques.

═══ SORTIE JSON ═══

Champs : objet_identifie, categorie_produit, badge_global, resume (3-4 phrases français standard, bienveillant, non-alarmiste), substances_detectees (TOUS les ingrédients), recommandations, alternatives_saines, materiau_detecte="", erreur=null (ou "Photo illisible" si floue).

═══ RÈGLE CRITIQUE — alternatives_saines (ALTERNATIVES RÉELLES DU MÊME TYPE DE PRODUIT) ═══

alternatives_saines DOIT contenir 2 à 3 vrais produits bio/naturels du MÊME TYPE que le produit scanné (pas des noms de magasins, pas des marques génériques sans produit). Chaque entrée = { nom, raison }.

• nom = MARQUE + NOM DU PRODUIT précis du même type que celui scanné. Exemples concrets :
  - Si produit scanné = mayonnaise industrielle → nom = "Mayonnaise bio Bjorg" / "Mayonnaise Vegenaise (Follow Your Heart)" / "Mayonnaise bio Avril (marque maison)".
  - Si produit scanné = biscuits / gâteaux industriels → nom = "Biscuits Petit Déjeuner Bio Bjorg" / "Cookies bio Generous" / "Petits gâteaux Lima Bio".
  - Si produit scanné = soda → nom = "Lemonaid Bio" / "Whole Earth Cola Bio" / "Eau pétillante Perrier nature".
  - Si produit scanné = nutella → nom = "Pâte à tartiner Jean Hervé Noisettes-Cacao" / "Nocciolata Bio Rigoni di Asiago" / "Pâte à tartiner Bjorg Cacao Noisettes".
  - Si produit scanné = céréales sucrées → nom = "Muesli bio Bjorg" / "Granola Michel et Augustin Bio" / "Flocons d'avoine Markal Bio".
  - Si produit scanné = yaourt aromatisé → nom = "Yaourt nature bio Les 2 Vaches" / "Yaourt brebis bio Vrai" / "Yaourt nature bio Sojade (végétal)".
  - Si produit scanné = shampoing → nom = "Shampoing doux Cattier Bio" / "Shampoing solide Lamazuna" / "Shampoing ATTITUDE Super Leaves".
• raison = 1 phrase courte expliquant POURQUOI cette alternative est meilleure ("Sans additifs ni huile de palme, ingrédients bio simples", "Recette courte avec œufs frais et huile de tournesol bio", etc.).
• Adapte les marques à la région détectée :
  - Québec : Bjorg, Compliments Bio, Irrésistibles Choix du Président Bio, La Fourmi Bionique, GoGo Quinoa, Liberté Bio, Fontaine Santé, Yves Veggie, ATTITUDE, Druide, Oneka, Avril (marque maison).
  - France : Bjorg, Jardin Bio, Markal, Lima, Bonneterre, Vrai, Les 2 Vaches, Carrefour Bio, U Bio, Cattier, Coslys, Melvita, Centifolia, Lamazuna, Weleda.
  - Belgique : Bjorg, Bio-Planet (MDD), Markal, Lima, Vrai, Weleda, Kneipp.
  - Autres : suggère des marques bio internationales connues (Whole Foods 365, Alnatura, Rapunzel, Ecover, Seventh Generation).
• INTERDICTIONS pour alternatives_saines :
  - NE JAMAIS écrire un simple nom de magasin (ex: "Avril Supermarché Santé", "Rachelle Béry", "Liberté Bio" tout seul) — ce sont des magasins, pas des produits.
  - NE JAMAIS répéter une marque sans produit précis (ex: "Bjorg" tout seul = INTERDIT, écris "Mayonnaise bio Bjorg").
  - NE JAMAIS proposer une alternative d'un type différent (ex: pour une mayonnaise scannée, ne propose pas un yaourt).
  - Si le produit scanné est déjà sain (badge_global=aucun), retourne alternatives_saines = [].

classification_circ accepté : "Groupe 1" | "Groupe 2A" | "Groupe 2B" | "Controversé" | "Ultra-transformé" | "Perturbateur endocrinien" | "Naturel" | "Non classé par le CIRC".

Ne confonds JAMAIS CACAO (sain) avec CADMIUM (contaminant).

═══ CHAIN OF THOUGHT OBLIGATOIRE — REMPLIS 'raisonnement' AVANT TOUT LE RESTE ═══

AVANT de générer les autres champs, remplis OBLIGATOIREMENT l'objet "raisonnement" avec :

1) ingredients_lus_bruts : tableau de CHAQUE ingrédient lu sur l'étiquette, exactement tel qu'écrit, un par un, séparés à chaque virgule. Ex: ["Eau gazéifiée", "Sucre", "Caféine", "Taurine", "Glucuronolactone", "Inositol", "Niacinamide", "Calcium Pantothenate", "Pyridoxine HCl", "Cyanocobalamin", "Arômes artificiels", "Colorants"]. N'écris JAMAIS une liste vide si la photo contient du texte d'ingrédients.

2) nombre_ingredients_lus : nombre entier = ingredients_lus_bruts.length. Ce nombre servira à vérifier que substances_detectees contient le MÊME nombre d'entrées.

3) deduction_produit : 1 phrase expliquant comment tu identifies le produit (nom lu / marque / code-barres / déduction par ingrédients).

4) verification_exhaustivite : écris littéralement "J'ai lu X ingrédients et je vais créer X entrées dans substances_detectees" (remplace X par ton nombre). Si tu ne peux pas, recommence la lecture.

5) verification_coherence_badge : 1 phrase qui liste le compte des badges (ex: "2 danger, 5 probable, 3 possible, 4 aucun → badge_global=probable") et confirme que badge_global correspond à la règle.

Ce raisonnement DOIT être écrit AVANT les autres champs. substances_detectees doit ensuite contenir UNE ENTRÉE par élément de ingredients_lus_bruts (même nom, même ordre de lecture), et nombre_ingredients_lus DOIT égaler substances_detectees.length.

═══ CHECKLIST DE VALIDATION OBLIGATOIRE (avant de répondre) ═══

Réponds mentalement OUI à chaque question. Si une seule réponse est NON → recommence.

[1] EXHAUSTIVITÉ — Combien d'ingrédients sur l'étiquette (virgules + 1) ? Ce nombre DOIT égaler le nombre d'entrées dans substances_detectees. 15 ingrédients lus = 15 entrées, pas 14.
[2] IDENTIFICATION — objet_identifie est-il rempli avec un nom réel ? Jamais "Objet inconnu" si texte/ingrédients lisibles.
[3] CLASSIFICATION — Chaque entrée a-t-elle été cherchée dans la BASE DE DONNÉES ci-dessus et a-t-elle le niveau_risque EXACT issu de la base ?
[4] COHÉRENCE VERDICT : 1+ danger → badge="danger" ; 2+ probable OU 5+ possible → "probable" (EXCEPTION : 1 seul probable isolé parmi ≥70% naturels → rétrograder à "possible") ; 2-4 possible → "possible" ; sinon → "aucun".
[5] INTERDITS ABSOLUS — badge_global="aucun" n'est pas utilisé si la liste contient HFCS, dextrose, FD&C, BHA/BHT/TBHQ, benzoate, carraghénane, édulcorants artificiels, nitrites.
[5bis] ANTI-ALARMISME — Aucun ingrédient n'est classé "Groupe 1" ou "Groupe 2A" sans correspondance EXPLICITE dans la base de données. Si tu as mis "Groupe 2A" ou "Groupe 1" quelque part, vérifie que l'ingrédient exact est listé comme tel dans la base — sinon, rétrograde à "Controversé" + niveau_risque="possible" ou "probable". Le champ 'resume' ne doit JAMAIS contenir "cancérigène par l'OMS", "classé cancérigène", "Groupe 1" ou "Groupe 2A" si aucune substance_detectee n'a réellement cette classification_circ. Utilise plutôt "substances controversées", "ultra-transformé", "additifs industriels".
[5ter] PRODUIT SIMPLE — Si le produit a ≤2 ingrédients naturels (lait+ferments, eau+café, viande fraîche, fruit/légume brut), badge_global doit être "aucun" sauf preuve CIRC formelle. Ne diabolise pas les aliments basiques.
[6] TRI — substances_detectees trié danger → probable → possible → aucun.
[7] RESUME — Correspond au badge_global et reste non-alarmiste si verdict vert.
[8] RELECTURE — Relis la liste de gauche à droite ; chaque ingrédient s'y trouve bien avec son badge.

Si la checklist passe → émets le JSON. Sinon → corrige.`;

const UNIVERSAL_ANALYSIS_PROMPT_EN = `You are ToxiScan. Analyze every photo and return ONE structured JSON object.

═══ INGREDIENT DATABASE (single source — apply it strictly) ═══

${INGREDIENTS_DB_TEXT}

Classification rule: for each detected ingredient, look for a keyword match in the database above (case-insensitive, accent-insensitive, plurals). If found → use EXACTLY its niveau_risque and classification_circ. If not found → niveau_risque="aucun" with classification_circ="Not classified by IARC".

═══ ANTI-ALARMIST RULE (ABSOLUTE PRIORITY) ═══

NEVER classify an ingredient as "Group 2A" (probably carcinogenic) or "Group 1" (confirmed carcinogen) if that classification is not EXPLICITLY listed in the database above for that exact ingredient. The IARC classification is an official WHO decision — you cannot make it up.

Closed list of ingredients you may classify as "Group 2A": ONLY those literally listed with "Groupe 2A" in the database above (e.g., red meats cooked at high temperature, acrylamide, nitrates/nitrites turned into nitrosamines, glyphosate). Same for "Group 1" and "Group 2B".

For any other ingredient not classified by IARC:
• If it's a controversial industrial additive (syrup, sweetener, flavor enhancer, artificial color) → classification_circ="Controversial" or "Ultra-processed", niveau_risque="probable" or "possible" — NEVER "danger".
• If it's a healthy or neutral ingredient (water, salt, flour, vegetables, fruits, fresh meats, eggs, milk, olive oil, spices) → classification_circ="Natural" or "Not classified by IARC", niveau_risque="aucun".
• The mere fact that an ingredient is processed is NOT enough to make it carcinogenic. Stay factual.

2-ingredient rule: if the product contains ONLY 1 or 2 ingredients total (e.g., "Milk, Cultures" or "Water, Sugar"), be EXTRA careful with ORANGE/RED ratings. Plain yogurt, fromage blanc, pure juice, fresh meat must NEVER be classified "probable" or "danger" without an explicit IARC reason.

Forbidden: writing "Group 2A carcinogen" in an explanation if the database does NOT list that ingredient as Group 2A. Use instead: "controversial ingredient", "industrial processing", "to consume in moderation", "not classified as carcinogenic by IARC".

Keyword rules (always ORANGE, takes priority over the database): "modified", "hydrolyzed", "isolate", "concentrate", "lipolyzed", "interesterified", "hydrogenated" (except "non-hydrogenated").

Refined white sugar rule (sugar/sucrose) based on position in the list: 1st-2nd ingredient → ORANGE; middle → YELLOW; end or <5g/serving → GREEN.

═══ STEP 1 — IDENTIFY THE PRODUCT ═══

objet_identifie = brand + product (e.g., "LU Prince", "Coca-Cola Zero", "Nutella").
Priority: 1) Open Food Facts name if provided; 2) readable text on the packaging; 3) recognizable known brands; 4) deduction from ingredient combinations (milk+cultures→Cheese; flour+sugar+butter+eggs→Cookie; water+hops+malt→Beer; aqua+glycerin+fragrance→Cosmetic; surfactants+fragrance→Shampoo).
FORBIDDEN: NEVER return "Unknown object" if an OFF name exists, text is readable, a brand is recognizable, or an ingredient list is readable.

categorie_produit: food | beverage | cosmetic | household | other.

═══ STEP 2 — READ EVERY INGREDIENT (CRITICAL EXHAUSTIVENESS) ═══

1. Find the "Ingredients:" / "INGREDIENTS:" block
2. Split at every comma/semicolon/line break → each segment = 1 token
3. For EACH token, create ONE entry in substances_detectees (including water, salt, flour, vitamins)
4. If the list has N commas → substances_detectees must have ≥ N+1 entries
5. NEVER merge 2 ingredients. NEVER skip a mundane ingredient.

Each entry: { nom, code (E-xxx or null), classification_circ, niveau_risque (danger|probable|possible|aucun), explication (MANDATORY 3 to 5 detailed sentences), source_exposition }.

CRITICAL RULE — 'explication' FIELD: EACH ingredient (even healthy ones) must have an EDUCATIONAL explanation of 3 to 5 sentences in clear English, friendly tone, non-alarmist. Mandatory structure:
  1) Sentence 1: what the ingredient is / its role in the product (1 simple sentence).
  2) Sentence 2-3: why it's controversial OR why it's healthy — cite concrete health effects (obesity, diabetes, inflammation, breast/colon/liver cancer, palpitations, endocrine disruptor, allergies, cardiovascular effects, etc.).
  3) Sentence 4: precision on cancer classification (e.g., "This is not a direct carcinogen but regular excessive consumption is harmful to health." / "Classified Group 2B by IARC (possibly carcinogenic)." / "Not classified as carcinogenic by IARC.").
  4) NEVER write a generic explanation like "controversial additive, to verify". Always DETAIL the real risks.

EXAMPLES of good explanations (reproduce this style):
• Sucrose: "Sugar in large quantities promotes obesity, diabetes, and chronic inflammation, recognized risk factors for several types of cancer (breast, colon, liver, pancreas). It's not a direct carcinogen but regular excessive consumption is harmful to health."
• Natural flavors: "Although labeled 'natural', these flavors are often extracted using industrial chemical processes (solvents like hexane, molecular distillation). Their exact composition is not disclosed and can contain dozens of undisclosed molecules. They are not classified as carcinogenic by IARC, but their regular consumption remains controversial."
• Colors (unspecified): "Some color varieties can be controversial, especially azo or artificial colors (E102, E110, E124). The manufacturer doesn't specify which here, so a precautionary principle applies. Not classified as carcinogenic by IARC as a whole."
• Taurine: "Taurine is a synthetic amino acid added as a stimulant in energy drinks. At high doses it can cause cardiovascular effects (palpitations, hypertension), especially combined with caffeine. Not classified as carcinogenic but its regular consumption remains controversial."
• Water: "Basic ingredient, no health risk. Essential to the product's composition."

SPECIAL CASE ENERGY DRINKS (Red Bull, Monster, Rockstar, Bang): Taurine, added Caffeine, Inositol, Glucuronolactone, Natural/Artificial Flavors, Niacinamide, Pyridoxine HCl, Calcium Pantothenate, Cyanocobalamin = ORANGE (in a normal food, these B vitamins = GREEN).

COSMETICS: "cumulative endocrine disruptors" rule — 3+ in the same product = ORANGE minimum. PREGNANCY DANGER: if any of these ingredients is present, prefix resume with "⚠️ PREGNANCY DANGER: " and add as 1st recommendation "This product contains substances not recommended during pregnancy. Consult a healthcare professional."

🦷 DR. TOXI MESSAGE FOR TOOTHPASTE AND ORAL CARE PRODUCTS (toothpaste, mouthwash, dental floss, breath spray, dental gel):
Regardless of the verdict, ALWAYS ADD this clarification at the end of the resume field:
"Good news: this product is used in the mouth and spit out — you don't swallow it. Even if it contains controversial ingredients, the risk is very limited because the product doesn't stay in your body. Stay vigilant about truly problematic ingredients (formaldehyde, parabens, triclosan, heavy metals) that can be absorbed through oral mucosa, but no need to panic about common preservatives."
This clarification reassures the user while staying factual.

═══ STEP 3 — FINAL VERDICT (badge_global) ═══

Strict rule — the highest wins:
• danger → ≥1 ingredient explicitly listed as Group 1 in the database. Resume: "Warning! This product contains an ingredient classified as carcinogenic by the WHO (IARC Group 1). I strongly advise against consuming it regularly."
• probable → ≥2 ORANGE ingredients OR ≥1 RED OR ≥5 yellows cumulated. EXCEPTION: if only 1 isolated orange with a majority of natural ingredients (≥70% green), downgrade to "possible" (yellow). Resume: "This product contains several controversial or ultra-processed substances. Consume it only occasionally and look for a more natural alternative." FORBIDDEN to write "WHO carcinogen", "classified as carcinogenic", "Group 1" or "Group 2A" in the resume if no ingredient is actually listed as such in the database.
• possible → 2-3 yellows, no orange/red. Resume: "This product contains a few processed ingredients. You can consume it but avoid making it an everyday food." FORBIDDEN to write "carcinogenic" in this resume.
• aucun → 0-1 isolated yellow among healthy naturals. Resume: "This product is overall very good. The vast majority of ingredients are natural and healthy."

Absolute prohibitions for "aucun": HFCS, dextrose, glucose syrup, FD&C colors, BHA, BHT, TBHQ, sodium benzoate, carrageenan, aspartame, acesulfame K, sucralose, nitrites/nitrates.

⚠️ ABSOLUTE SUBSTANCE DISPLAY RULE — TOTAL EXHAUSTIVENESS ⚠️
You MUST display in substances_detectees ABSOLUTELY ALL ingredients on the label, from the FIRST to the LAST, NO EXCEPTION, regardless of the final verdict (red, orange, yellow, or green).

GOLDEN RULE: substances_detectees.length MUST be STRICTLY EQUAL to the number of ingredients read on the label (ingredients_lus_bruts.length).

• If the label contains 15 ingredients → 15 entries (regardless of their color).
• If the label contains 8 ingredients → 8 entries (regardless of their color).
• Each ingredient gets ITS own real color (red, orange, yellow, or green) according to the database.
• Healthy ingredients (water, salt, flour, eggs, milk, rapeseed oil, yeast, starch, etc.) must appear WITH a GREEN badge (niveau_risque="aucun") and the short explanation "Natural ingredient, no identified risk".
• Sub-ingredients in parentheses may be grouped under the same name (e.g., "Raising agents (diphosphates, sodium carbonates)" = 1 entry), but no main ingredient may be omitted.

DISPLAY ORDER — mandatory sorting of substances_detectees:
1. First all REDS (danger)
2. Then all ORANGES (probable)
3. Then all YELLOWS (possible)
4. Finally all GREENS (aucun) — ALWAYS included, never omitted

ABSOLUTELY FORBIDDEN:
- NEVER omit a healthy ingredient because the verdict is orange or red.
- NEVER stop at problematic ingredients. The list must be complete.
- NEVER show only 4 ingredients when the label contains 15.
- Concrete example: if a sponge cake contains (Sugar, Wheat flour, Rapeseed oil, Eggs, Chocolate powder, Hazelnut paste, Skimmed milk, Glucose-fructose syrup, Raising agents, Emulsifiers E471, Salt, Citric acid, Wheat starch, Natural flavors, Dry yeast) → you MUST display all 15 ingredients (4 yellow + 11 green), not just the 4 problematic ones.

═══ JSON OUTPUT ═══

Fields: objet_identifie, categorie_produit, badge_global, resume (3-4 sentences in standard English, friendly, non-alarmist), substances_detectees (ALL ingredients), recommandations, alternatives_saines, materiau_detecte="", erreur=null (or "Unreadable photo" if blurry).

═══ CRITICAL RULE — alternatives_saines (REAL ALTERNATIVES OF THE SAME PRODUCT TYPE) ═══

alternatives_saines MUST contain 2 to 3 real organic/natural products of the SAME TYPE as the scanned product (not store names, not generic brands without products). Each entry = { nom, raison }.

• nom = BRAND + precise PRODUCT NAME of the same type as the scanned one. Concrete examples (USA market focus):
  - Scanned product = industrial mayonnaise → nom = "Sir Kensington's Organic Mayo" / "Primal Kitchen Avocado Oil Mayo" / "Vegenaise (Follow Your Heart)".
  - Scanned product = industrial cookies/cakes → nom = "Simple Mills Almond Flour Cookies" / "Tate's Bake Shop Organic" / "Annie's Organic Bunny Cookies".
  - Scanned product = soda → nom = "Spindrift Sparkling Water" / "Olipop Classic Root Beer" / "LaCroix Plain Sparkling Water".
  - Scanned product = nutella → nom = "Justin's Chocolate Hazelnut Butter" / "Nuttzo Power Fuel" / "Nocciolata Organic Hazelnut Spread".
  - Scanned product = sugary cereals → nom = "One Degree Organic Sprouted Oats" / "Bob's Red Mill Organic Granola" / "Nature's Path Heritage Flakes".
  - Scanned product = flavored yogurt → nom = "Stonyfield Organic Plain Yogurt" / "Siggi's Plain Skyr" / "Maple Hill Organic Whole Milk Yogurt".
  - Scanned product = shampoo → nom = "Acure Curiously Clarifying Shampoo" / "Everyone 3-in-1 Soap" / "ATTITUDE Super Leaves Shampoo".
• raison = 1 short sentence explaining WHY this alternative is better ("No additives or palm oil, simple organic ingredients", "Short recipe with fresh eggs and organic sunflower oil", etc.).
• Adapt the brands to the detected region:
  - USA / English Canada: Whole Foods 365, Annie's, Stonyfield, Simple Mills, Justin's, Spindrift, Olipop, Siete Foods, Acure, Everyone, Native, Burt's Bees, Weleda, Dr. Bronner's.
  - UK / Ireland: Yeo Valley Organic, Pip & Nut, Meridian, Tyrrells, Pipers, Dorset Cereals, Faith In Nature, Neal's Yard, Weleda.
  - Quebec: Bjorg, Compliments Bio, Président's Choice Organics, La Fourmi Bionique, GoGo Quinoa, Liberty Organic, Fontaine Santé, Yves Veggie, ATTITUDE, Druide, Oneka, Avril (house brand).
  - France: Bjorg, Jardin Bio, Markal, Lima, Bonneterre, Vrai, Les 2 Vaches, Carrefour Bio, U Bio, Cattier, Coslys, Melvita, Centifolia, Lamazuna, Weleda.
  - Belgium: Bjorg, Bio-Planet (private label), Markal, Lima, Vrai, Weleda, Kneipp.
  - Other: suggest known international organic brands (Whole Foods 365, Alnatura, Rapunzel, Ecover, Seventh Generation).
• PROHIBITIONS for alternatives_saines:
  - NEVER write a plain store name (e.g., "Whole Foods", "Trader Joe's" alone) — those are stores, not products.
  - NEVER repeat a brand without a precise product (e.g., "Bjorg" alone = FORBIDDEN, write "Bjorg Organic Mayo").
  - NEVER suggest an alternative of a different type (e.g., for a scanned mayo, don't suggest a yogurt).
  - If the scanned product is already healthy (badge_global=aucun), return alternatives_saines = [].

classification_circ accepted: "Group 1" | "Group 2A" | "Group 2B" | "Controversial" | "Ultra-processed" | "Endocrine disruptor" | "Natural" | "Not classified by IARC".

NEVER confuse CACAO (healthy) with CADMIUM (contaminant).

═══ MANDATORY CHAIN OF THOUGHT — FILL 'raisonnement' BEFORE ANYTHING ELSE ═══

BEFORE generating the other fields, MANDATORILY fill the "raisonnement" object with:

1) ingredients_lus_bruts: array of EVERY ingredient read on the label, exactly as written, one by one, separated at every comma. Ex: ["Carbonated water", "Sugar", "Caffeine", "Taurine", "Glucuronolactone", "Inositol", "Niacinamide", "Calcium Pantothenate", "Pyridoxine HCl", "Cyanocobalamin", "Artificial flavors", "Colors"]. NEVER write an empty list if the photo contains ingredient text.

2) nombre_ingredients_lus: integer = ingredients_lus_bruts.length. This number will be used to verify that substances_detectees contains the SAME number of entries.

3) deduction_produit: 1 sentence explaining how you identify the product (read name / brand / barcode / deduction by ingredients).

4) verification_exhaustivite: literally write "I read X ingredients and I will create X entries in substances_detectees" (replace X with your number). If you can't, restart the reading.

5) verification_coherence_badge: 1 sentence listing the badge count (e.g., "2 danger, 5 probable, 3 possible, 4 aucun → badge_global=probable") and confirming that badge_global matches the rule.

This raisonnement MUST be written BEFORE the other fields. substances_detectees must then contain ONE ENTRY per element of ingredients_lus_bruts (same name, same reading order), and nombre_ingredients_lus MUST equal substances_detectees.length.

═══ MANDATORY VALIDATION CHECKLIST (before responding) ═══

Mentally answer YES to each question. If a single answer is NO → restart.

[1] EXHAUSTIVENESS — How many ingredients on the label (commas + 1)? This number MUST equal the number of entries in substances_detectees. 15 ingredients read = 15 entries, not 14.
[2] IDENTIFICATION — Is objet_identifie filled with a real name? Never "Unknown object" if text/ingredients are readable.
[3] CLASSIFICATION — Has each entry been searched in the DATABASE above and assigned the EXACT niveau_risque from the database?
[4] VERDICT CONSISTENCY: 1+ danger → badge="danger"; 2+ probable OR 5+ possible → "probable" (EXCEPTION: 1 isolated probable among ≥70% naturals → downgrade to "possible"); 2-4 possible → "possible"; otherwise → "aucun".
[5] ABSOLUTE PROHIBITIONS — badge_global="aucun" is not used if the list contains HFCS, dextrose, FD&C, BHA/BHT/TBHQ, benzoate, carrageenan, artificial sweeteners, nitrites.
[5bis] ANTI-ALARMISM — No ingredient is classified "Group 1" or "Group 2A" without an EXPLICIT match in the database. If you put "Group 2A" or "Group 1" somewhere, verify the exact ingredient is listed as such in the database — otherwise downgrade to "Controversial" + niveau_risque="possible" or "probable". The 'resume' field must NEVER contain "WHO carcinogen", "classified as carcinogenic", "Group 1" or "Group 2A" if no substance_detectee actually has that classification_circ. Use instead "controversial substances", "ultra-processed", "industrial additives".
[5ter] SIMPLE PRODUCT — If the product has ≤2 natural ingredients (milk+cultures, water+coffee, fresh meat, raw fruit/vegetable), badge_global must be "aucun" unless formal IARC proof. Do not demonize basic foods.
[6] SORTING — substances_detectees sorted danger → probable → possible → aucun.
[7] RESUME — Matches badge_global and stays non-alarmist if verdict is green.
[8] RE-READING — Re-read the list left to right; each ingredient is there with its badge.

If the checklist passes → emit the JSON. Otherwise → fix.`;

const UNIVERSAL_ANALYSIS_PROMPT = isEnglish() ? UNIVERSAL_ANALYSIS_PROMPT_EN : UNIVERSAL_ANALYSIS_PROMPT_FR;

async function tryGenerateUniversalAnalysis(imageBase64: string, openFactsContext?: string): Promise<UniversalAnalysisResult> {
  console.log('[API] Calling OpenAI (gpt-4o) for universal analysis...');
  if (openFactsContext) {
    console.log('[API] Including Open Food Facts data in analysis prompt');
  }

  const regionPrompt = getAnalysisRegionPrompt();
  const systemParts: string[] = [UNIVERSAL_ANALYSIS_PROMPT, regionPrompt];
  if (openFactsContext) {
    systemParts.push('\n\n' + openFactsContext);
    systemParts.push(
      isEnglish()
        ? '\nIMPORTANT: You received Open Food Facts data for this product. Use the FULL ingredient list provided by Open Food Facts for a more accurate analysis. Cross-reference this data with your own visual analysis of the photo. If you detect ingredients in the photo that are not in Open Food Facts, add them. If Open Food Facts lists additives you don\'t see in the photo, include them anyway because the database is reliable. Your PRIORITY remains finding carcinogenic and toxic substances from our Dr.Toxi database.'
        : '\nIMPORTANT : Tu as reçu des données Open Food Facts pour ce produit. Utilise la LISTE COMPLÈTE des ingrédients fournie par Open Food Facts pour une analyse plus précise. Croise ces données avec ta propre analyse visuelle de la photo. Si tu détectes des ingrédients sur la photo qui ne sont pas dans Open Food Facts, ajoute-les. Si Open Food Facts liste des additifs que tu ne vois pas sur la photo, inclus-les quand même car la base de données est fiable. Ta PRIORITÉ reste de chercher les substances cancérigènes et toxiques de notre base Dr.Toxi.'
    );
  }

  const result = await aiGenerateObject({
    system: systemParts.join(''),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: isEnglish()
            ? 'Analyze this photo by STRICTLY following this generation order:\n\nSTEP 0 (raisonnement) — BEFORE any other field, fill "raisonnement":\n  • ingredients_lus_bruts: list every ingredient on the label, one by one, separated at every comma/semicolon. SKIP NONE.\n  • nombre_ingredients_lus: the exact count of the elements above.\n  • deduction_produit: how you identify the product (name, brand, or deduction).\n  • verification_exhaustivite: phrase "I read X ingredients and I will create X entries in substances_detectees".\n  • verification_coherence_badge: badge count and final verdict.\n\nSTEP 1 — objet_identifie (brand + name, never "Unknown object" if text/ingredients are readable).\nSTEP 2 — categorie_produit.\nSTEP 3 — substances_detectees: for EACH element of ingredients_lus_bruts, create ONE entry (same name, same order). substances_detectees.length MUST equal nombre_ingredients_lus. Include healthy ingredients (water, salt, flour, vegetables) with niveau_risque="aucun".\nSTEP 4 — badge_global, resume, recommandations, alternatives_saines.\n\nIf you notice that substances_detectees.length ≠ nombre_ingredients_lus, FIX substances_detectees before finishing — never truncate the list.'
            : 'Analyse cette photo en suivant STRICTEMENT cet ordre de génération :\n\nÉTAPE 0 (raisonnement) — AVANT tout autre champ, remplis "raisonnement" :\n  • ingredients_lus_bruts : liste chaque ingrédient de l\'étiquette, un par un, séparé à chaque virgule/point-virgule. N\'en saute AUCUN.\n  • nombre_ingredients_lus : le nombre exact d\'éléments ci-dessus.\n  • deduction_produit : comment tu identifies le produit (nom, marque, ou déduction).\n  • verification_exhaustivite : phrase "J\'ai lu X ingrédients et je vais créer X entrées dans substances_detectees".\n  • verification_coherence_badge : compte des badges et verdict final.\n\nÉTAPE 1 — objet_identifie (marque + nom, jamais "Objet inconnu" si texte/ingrédients lisibles).\nÉTAPE 2 — categorie_produit.\nÉTAPE 3 — substances_detectees : pour CHAQUE élément de ingredients_lus_bruts, crée UNE entrée (même nom, même ordre). substances_detectees.length DOIT égaler nombre_ingredients_lus. Inclure les ingrédients sains (eau, sel, farine, légumes) avec niveau_risque="aucun".\nÉTAPE 4 — badge_global, resume, recommandations, alternatives_saines.\n\nSi tu t\'aperçois que substances_detectees.length ≠ nombre_ingredients_lus, CORRIGE substances_detectees avant de finir — ne tronque jamais la liste.' },
          { type: 'image', image: imageBase64 },
        ],
      },
    ],
    schema: universalAnalysisSchema,
    toolName: 'record_analysis',
    toolDescription: isEnglish() ? 'Record the structured analysis of the scanned product.' : 'Enregistre l\'analyse structurée du produit scanné.',
    maxTokens: 3000,
  });
  console.log('[API] OpenAI analysis returned successfully');
  return result;
}

async function tryFetchOpenFactsData(imageBase64: string): Promise<{ context: string; offResult: OpenFactsResult | null }> {
  try {
    console.log('[API] Attempting barcode + product name detection from image for Open Food Facts lookup...');

    const preDetectionSchema = z.object({
      barcode_detected: z.boolean(),
      barcode_value: z.string().nullable(),
      barcode_type: z.enum(['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'other', 'none']),
      product_name_visible: z.string().nullable(),
      brand_visible: z.string().nullable(),
    });

    const preResult = await aiGenerateObject({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: isEnglish()
              ? 'Look at this photo of a product. Return: 1) the barcode (EAN-13, EAN-8, UPC-A, UPC-E) if visible and readable — otherwise null. 2) the PRODUCT NAME as printed on the packaging (e.g., "Fils Extra", "Nutella", "Coca-Cola Zero") in product_name_visible. 3) the BRAND if visible (e.g., "LU", "Ferrero", "Coca-Cola") in brand_visible. Read what is written on the packaging, even without a barcode. If nothing is readable, set to null.'
              : 'Regarde cette photo d\'un produit. Retourne : 1) le code-barres (EAN-13, EAN-8, UPC-A, UPC-E) si visible et lisible — sinon null. 2) le NOM DU PRODUIT tel qu\'il est imprimé sur l\'emballage (ex: "Fils Extra", "Nutella", "Coca-Cola Zero") dans product_name_visible. 3) la MARQUE si visible (ex: "LU", "Ferrero", "Coca-Cola") dans brand_visible. Lis ce qui est écrit sur l\'emballage, même sans code-barres. Si rien n\'est lisible, mets null.' },
            { type: 'image', image: imageBase64 },
          ],
        },
      ],
      schema: preDetectionSchema,
      toolName: 'record_pre_detection',
      toolDescription: isEnglish() ? 'Record the barcode and product name detected in the photo.' : 'Enregistre le code-barres et le nom du produit détectés sur la photo.',
      maxTokens: 512,
    });

    console.log('[API] Pre-detection result:', JSON.stringify(preResult));

    if (preResult.barcode_detected && preResult.barcode_value) {
      const barcode = preResult.barcode_value.replace(/\s/g, '');
      console.log('[API] Barcode detected:', barcode, 'Type:', preResult.barcode_type);

      const offResult = await lookupBarcode(barcode);
      if (offResult.found) {
        const context = formatOpenFactsContext(offResult);
        console.log('[API] Open Food Facts data found via barcode, context length:', context.length);
        return { context, offResult };
      }
      console.log('[API] Barcode detected but product not found in Open Food Facts');
    } else {
      console.log('[API] No barcode detected in image');
    }

    const nameParts: string[] = [];
    if (preResult.brand_visible) nameParts.push(preResult.brand_visible);
    if (preResult.product_name_visible) nameParts.push(preResult.product_name_visible);
    const searchQuery = nameParts.join(' ').trim();

    if (searchQuery.length >= 3) {
      console.log('[API] Trying Open Food Facts search by name:', searchQuery);
      const offResult = await searchByName(searchQuery);
      if (offResult.found) {
        const context = formatOpenFactsContext(offResult);
        console.log('[API] Open Food Facts data found via name search, context length:', context.length);
        return { context, offResult };
      }
      console.log('[API] No name match in Open Food Facts');
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log('[API] Open Food Facts lookup failed (non-blocking):', msg);
  }

  return { context: '', offResult: null };
}

function normalizeNameForCompare(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function enforceExhaustiveSubstances(result: UniversalAnalysisResult): UniversalAnalysisResult {
  const rawList = result.raisonnement?.ingredients_lus_bruts;
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return result;
  }
  const cleanRaw = rawList
    .map((s) => String(s ?? '').trim())
    .filter((s) => s.length > 0);
  if (cleanRaw.length === 0) return result;
  if (result.substances_detectees.length >= cleanRaw.length) {
    return result;
  }

  console.warn('[API] AI returned only', result.substances_detectees.length, 'substances but ingredients_lus_bruts has', cleanRaw.length, '— padding missing ingredients with VERT/aucun');

  const existingNorm = new Set(
    result.substances_detectees.map((s) => normalizeNameForCompare(s.nom))
  );
  const padded = [...result.substances_detectees];
  for (const raw of cleanRaw) {
    const norm = normalizeNameForCompare(raw);
    if (norm.length === 0) continue;
    const alreadyPresent = Array.from(existingNorm).some(
      (n) => n.length > 0 && (n === norm || n.includes(norm) || norm.includes(n))
    );
    if (alreadyPresent) continue;
    existingNorm.add(norm);
    padded.push({
      nom: raw,
      code: null,
      classification_circ: isEnglish() ? 'Not classified by IARC' : 'Non classé par le CIRC',
      niveau_risque: 'aucun',
      explication: isEnglish()
        ? 'Natural ingredient, no identified risk.'
        : 'Ingrédient naturel sans risque identifié.',
      source_exposition: null,
    });
  }
  console.log('[API] After padding, substances_detectees has', padded.length, 'entries');
  return { ...result, substances_detectees: padded };
}

export async function analyzeUniversalPhoto(imageBase64: string): Promise<UniversalAnalysisResult & { openFactsData?: OpenFactsResult | null }> {
  const MAX_RETRIES = 3;

  const { context: offContext, offResult } = await tryFetchOpenFactsData(imageBase64);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log('[API] Universal analysis attempt', attempt, '/', MAX_RETRIES);

      const rawResult = await tryGenerateUniversalAnalysis(imageBase64, offContext || undefined);

      if (!rawResult || !rawResult.categorie_produit) {
        console.error('[API] Invalid result structure, retrying...');
        throw new Error(isEnglish() ? 'Invalid result received' : 'Résultat invalide reçu');
      }

      const result = enforceExhaustiveSubstances(rawResult);

      console.log('[API] Universal analysis result:', result.categorie_produit, result.objet_identifie, 'substances:', result.substances_detectees.length, 'badge_global:', result.badge_global);
      return { ...result, openFactsData: offResult };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[API] Universal analysis error (attempt ' + attempt + '):', errorMsg);

      if (attempt < MAX_RETRIES) {
        const delay = attempt * 1500;
        console.log('[API] Retrying in ' + delay + 'ms...');
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return {
        categorie_produit: 'other',
        objet_identifie: 'Unknown object',
        materiau_detecte: '',
        substances_detectees: [],
        badge_global: 'aucun',
        resume: '',
        recommandations: [],
        alternatives_sures: [],
        erreur: t('error_analyze_product'),
      };
    }
  }

  return {
    categorie_produit: 'other',
    objet_identifie: 'Unknown object',
    materiau_detecte: '',
    substances_detectees: [],
    badge_global: 'aucun',
    resume: '',
    recommandations: [],
    alternatives_sures: [],
    erreur: t('error_process_photo'),
  };
}

function applyCumulativeRule(riskGroup: RiskGroup, controversialCount: number): RiskGroup {
  const groupPriority: Record<RiskGroup, number> = { group1: 3, group2a: 2, group2b: 1, none: 0 };
  if (controversialCount >= 3 && groupPriority[riskGroup] < groupPriority['group2a']) {
    console.log('[API] Cumulative rule applied: ' + controversialCount + ' controversial substances (3+), upgrading to ORANGE (group2a max for non-IARC)');
    return 'group2a';
  }
  return riskGroup;
}

const CATEGORY_LABEL_KEYS: Record<ProductCategory, 'cat_label_food' | 'cat_label_beverage' | 'cat_label_kitchen' | 'cat_label_clothing' | 'cat_label_cosmetic' | 'cat_label_household' | 'cat_label_electronics' | 'cat_label_furniture' | 'cat_label_toy' | 'cat_label_other'> = {
  food: 'cat_label_food',
  beverage: 'cat_label_beverage',
  kitchen_utensil: 'cat_label_kitchen',
  clothing: 'cat_label_clothing',
  cosmetic: 'cat_label_cosmetic',
  household: 'cat_label_household',
  electronics: 'cat_label_electronics',
  furniture: 'cat_label_furniture',
  toy: 'cat_label_toy',
  other: 'cat_label_other',
};

export function getCategoryLabel(category: ProductCategory): string {
  const key = CATEGORY_LABEL_KEYS[category] ?? 'cat_label_other';
  return t(key);
}

const ADDITIVE_ALTERNATIVES: Record<string, { nom: string; raison: string }[]> = {
  'en:e249': [{ nom: 'Jambon sans nitrites (Fleury Michon, Les Artisans)', raison: 'Sans conservateurs cancérogènes, goût préservé naturellement' }, { nom: 'Charcuterie bio sans nitrites ajoutés', raison: 'Processus de conservation naturel sans nitrites synthétiques' }],
  'en:e250': [{ nom: 'Jambon sans nitrites (Fleury Michon, Les Artisans)', raison: 'Sans conservateurs cancérogènes, goût préservé naturellement' }, { nom: 'Viandes fraîches non transformées', raison: 'Aucun additif ajouté, source de protéines saine' }],
  'en:e251': [{ nom: 'Charcuterie bio sans nitrates ajoutés', raison: 'Conservation naturelle sans substances cancérogènes' }],
  'en:e252': [{ nom: 'Charcuterie bio sans nitrates ajoutés', raison: 'Conservation naturelle sans substances cancérogènes' }],
  'en:e240': [{ nom: 'Produits certifiés bio', raison: 'Le formaldéhyde est interdit dans les produits bio' }],
  'en:e129': [{ nom: 'Produits colorés naturellement (betterave, paprika)', raison: 'Colorants naturels sans risque pour la santé' }, { nom: 'Bonbons bio sans colorants artificiels', raison: 'Couleurs naturelles issues de fruits et légumes' }],
  'en:e102': [{ nom: 'Produits colorés au curcuma ou au safran', raison: 'Colorants naturels jaunes sans effet sur l\'hyperactivité' }, { nom: 'Aliments sans colorants artificiels', raison: 'Évite les risques allergiques et l\'hyperactivité' }],
  'en:e110': [{ nom: 'Produits colorés naturellement (carottes, curcuma)', raison: 'Colorants naturels orangés sans risque' }],
  'en:e133': [{ nom: 'Produits colorés à la spiruline', raison: 'Colorant bleu naturel riche en nutriments' }],
  'en:e132': [{ nom: 'Produits colorés à la spiruline', raison: 'Colorant bleu naturel sans risque' }],
  'en:e127': [{ nom: 'Produits sans colorants artificiels', raison: 'Évite l\'érythrosine classée cancérogène possible' }],
  'en:e150c': [{ nom: 'Produits avec caramel naturel (E150a)', raison: 'Caramel simple sans 4-MEI cancérigène' }],
  'en:e150d': [{ nom: 'Produits avec caramel naturel (E150a)', raison: 'Caramel simple sans 4-MEI cancérigène' }],
  'en:e951': [{ nom: 'Stévia naturelle ou érythritol', raison: 'Édulcorants naturels sans classification cancérogène' }, { nom: 'Miel ou sirop d\'érable', raison: 'Sucrants naturels avec des nutriments bénéfiques' }],
  'en:e955': [{ nom: 'Stévia naturelle', raison: 'Édulcorant naturel sans effet sur l\'ADN' }, { nom: 'Érythritol', raison: 'Édulcorant bien toléré, sans impact sur le microbiome' }],
  'en:e950': [{ nom: 'Stévia naturelle ou érythritol', raison: 'Édulcorants naturels sans risque identifié' }],
  'en:e320': [{ nom: 'Produits avec vitamine E naturelle comme antioxydant', raison: 'Antioxydant naturel sans classification cancérogène' }],
  'en:e321': [{ nom: 'Produits avec vitamine E naturelle', raison: 'Antioxydant naturel, non perturbateur endocrinien' }],
  'en:e407': [{ nom: 'Produits avec gomme d\'acacia ou lécithine de tournesol', raison: 'Épaississants naturels sans effet inflammatoire' }],
  'en:e433': [{ nom: 'Produits avec lécithine de tournesol', raison: 'Émulsifiant naturel sans perturbation du microbiome' }],
  'en:e171': [{ nom: 'Produits sans dioxyde de titane', raison: 'Interdit en France, évitez les produits importés qui en contiennent' }],
  'en:e220': [{ nom: 'Vin bio sans sulfites ajoutés', raison: 'Conservation naturelle sans réactions allergiques' }, { nom: 'Fruits secs bio sans sulfites', raison: 'Séchage naturel sans conservateurs irritants' }],
  'en:e221': [{ nom: 'Produits bio sans sulfites ajoutés', raison: 'Conservation naturelle, moins de réactions allergiques' }],
  'en:e222': [{ nom: 'Produits bio sans sulfites', raison: 'Évite les réactions allergiques et l\'asthme' }],
  'en:e223': [{ nom: 'Produits bio sans sulfites', raison: 'Évite les réactions allergiques et l\'asthme' }],
  'en:e224': [{ nom: 'Produits bio sans sulfites', raison: 'Évite les réactions allergiques et l\'asthme' }],
  'en:e422': [{ nom: 'Produits avec glycérol végétal certifié', raison: 'Sans contaminants 3-MCPD et esters glycidiques' }],
  'palm-oil': [{ nom: 'Huile d\'olive extra vierge', raison: 'Riche en oméga-3 anti-inflammatoires, sans contaminants de raffinage' }, { nom: 'Huile de coco vierge', raison: 'Stable à haute température, sans acides gras trans' }, { nom: 'Beurre bio', raison: 'Source naturelle de graisses sans transformation industrielle' }],
  'canola-oil': [{ nom: 'Huile d\'olive extra vierge', raison: 'Riche en oméga-3 anti-inflammatoires, pressée à froid' }, { nom: 'Huile de coco vierge', raison: 'Stable à haute température, sans oméga-6 pro-inflammatoire' }, { nom: 'Beurre bio', raison: 'Source naturelle de graisses sans transformation industrielle' }],
  'sunflower-oil': [{ nom: 'Huile d\'olive extra vierge', raison: 'Riche en oméga-3, anti-inflammatoire naturel' }, { nom: 'Huile d\'avocat', raison: 'Stable à haute température, profil lipidique équilibré' }],
  'grapeseed-oil': [{ nom: 'Huile d\'olive extra vierge', raison: 'Meilleur ratio oméga-3/oméga-6' }, { nom: 'Huile de coco', raison: 'Stable à la cuisson, sans excès d\'oméga-6' }],
  'soybean-oil': [{ nom: 'Huile d\'olive extra vierge', raison: 'Non OGM, anti-inflammatoire naturel' }, { nom: 'Huile de coco vierge', raison: 'Sans OGM, stable à haute température' }],
  'corn-oil': [{ nom: 'Huile d\'olive extra vierge', raison: 'Non OGM, riche en antioxydants' }, { nom: 'Beurre bio', raison: 'Sans OGM, source naturelle de vitamines A et D' }],
  'maltodextrine': [{ nom: 'Produits sucrés au miel ou sirop d\'érable', raison: 'Index glycémique plus bas, avec nutriments naturels' }, { nom: 'Fécule de tapioca', raison: 'Alternative naturelle avec un impact glycémique modéré' }],
  'en:e621': [{ nom: 'Herbes fraîches et épices naturelles', raison: 'Rehaussent le goût naturellement sans excitotoxines' }, { nom: 'Bouillon maison', raison: 'Saveur umami naturelle sans additifs synthétiques' }],
  'en:e631': [{ nom: 'Épices naturelles (curcuma, paprika, herbes)', raison: 'Goût riche sans exhausteurs synthétiques' }],
  'en:e627': [{ nom: 'Épices naturelles (curcuma, paprika, herbes)', raison: 'Goût riche sans exhausteurs synthétiques' }],
  'natural-flavor': [{ nom: 'Produits avec ingrédients nommés explicitement', raison: 'Transparence totale sur ce que vous consommez' }],
  'citric-acid-industrial': [{ nom: 'Jus de citron naturel', raison: 'Acide citrique naturel sans mycotoxines résiduelles' }],
  'yeast-extract': [{ nom: 'Herbes et épices naturelles', raison: 'Rehaussent le goût sans glutamate caché' }],
  'artificial-flavor': [{ nom: 'Produits aromatisés naturellement aux fruits ou épices', raison: 'Arômes réels issus de vrais aliments' }],
  'en:e160b': [{ nom: 'Produits colorés au curcuma ou paprika', raison: 'Colorants naturels sans risque allergique' }],
  'pfas': [{ nom: 'Produits certifiés sans PFAS', raison: 'Évite les polluants éternels cancérogènes' }, { nom: 'Contenants en verre ou inox', raison: 'Aucune contamination par les PFAS' }],
  'bpa': [{ nom: 'Contenants en verre', raison: 'Aucun BPA, matériau inerte' }, { nom: 'Biberons en verre ou sans BPA certifié', raison: 'Plus sûr pour les bébés' }],
  'melamine': [{ nom: 'Lait bio certifié', raison: 'Contrôles stricts, sans mélamine' }],
  '1-4-dioxane': [{ nom: 'Produits certifiés EWG Verified ou EcoCert', raison: 'Formules sans contaminants cancérigènes' }],
  'dmdm-hydantoin': [{ nom: 'Produits sans conservateurs libérateurs de formaldéhyde', raison: 'Cherchez la mention "sans formaldéhyde" ou certifications bio' }],
  'bronopol': [{ nom: 'Lingettes à l\'eau ou au liniment', raison: 'Sans conservateurs chimiques pour la peau de bébé' }],
  'triclosan': [{ nom: 'Dentifrice sans triclosan', raison: 'Évite le perturbateur endocrinien' }, { nom: 'Savon de Marseille', raison: 'Antibactérien naturel sans triclosan' }],
  'sls': [{ nom: 'Dentifrice ou shampoing sans SLS/SLES', raison: 'Moins irritant pour les muqueuses et le cuir chevelu' }],
  'dea': [{ nom: 'Cosmétiques certifiés bio sans DEA', raison: 'Évite la formation de nitrosamines cancérigènes' }],
  'ppd': [{ nom: 'Teinture végétale (henné)', raison: 'Colorant naturel sans PPD ni produits chimiques' }],
  'toluene': [{ nom: 'Vernis à ongles "3-free" ou "5-free"', raison: 'Formule sans toluène, formaldéhyde ni DBP' }],
  'coal-tar': [{ nom: 'Shampoing antipelliculaire naturel (arbre à thé, huile de coco)', raison: 'Sans goudron de houille cancérigène' }],
  'lead-acetate': [{ nom: 'Teinture végétale sans plomb', raison: 'Évite le plomb cancérogène et neurotoxique' }],
  'mercury-thimerosal': [{ nom: 'Crème éclaircissante certifiée sans mercure', raison: 'Évite le mercure neurotoxique' }],
  'pfoa-ptfe': [{ nom: 'Poêle en fonte ou en inox', raison: 'Pas de revêtement antiadhésif toxique' }, { nom: 'Poêle en céramique', raison: 'Alternative sans PFOA ni PTFE' }],
  'aluminum': [{ nom: 'Casserole en inox ou en fonte', raison: 'Pas de migration d\'aluminium' }],
  'polycarbonate-7': [{ nom: 'Contenant en verre ou en inox', raison: 'Sans BPA, matériaux inertes' }],
  'pvc-3': [{ nom: 'Film alimentaire en cire d\'abeille', raison: 'Alternative naturelle sans phtalates' }],
  'polystyrene-6': [{ nom: 'Contenant en verre ou carton certifié', raison: 'Sans styrène cancérigène' }],
  '2-butoxyethanol': [{ nom: 'Nettoyant au vinaigre blanc et bicarbonate', raison: 'Nettoyant naturel sans substances toxiques' }],
  'chlorine-bleach': [{ nom: 'Percarbonate de soude', raison: 'Désinfectant naturel sans dioxines' }],
  'perchloroethylene': [{ nom: 'Nettoyage à l\'eau ou nettoyage vert', raison: 'Évite le solvant cancérigène du nettoyage à sec' }],
  'mit-cmit': [{ nom: 'Produits ménagers certifiés EcoCert', raison: 'Sans isothiazolinones allergènes' }],
  'quaternium-15': [{ nom: 'Produits sans conservateurs libérateurs de formaldéhyde', raison: 'Évite l\'exposition au formaldéhyde cancérigène' }],
  'phthalate-dbp': [{ nom: 'Jouets en bois naturel ou certifiés sans phtalates', raison: 'Plus sûr pour les enfants, sans perturbateurs endocriniens' }],
  'phthalate-dehp': [{ nom: 'Jouets en bois ou silicone alimentaire', raison: 'Sans phtalates perturbateurs endocriniens' }],
  'resorcinol': [{ nom: 'Teinture végétale', raison: 'Sans résorcinol perturbateur endocrinien' }],
  'melamine-cookware': [{ nom: 'Vaisselle en verre, porcelaine ou bambou', raison: 'Pas de libération de formaldéhyde' }],
};

export function generateBarcodeAlternatives(detectedAdditives: { code: string; name: string; group: string }[]): { nom: string; raison: string }[] {
  const seen = new Set<string>();
  const alternatives: { nom: string; raison: string }[] = [];

  for (const additive of detectedAdditives) {
    const alts = ADDITIVE_ALTERNATIVES[additive.code];
    if (alts) {
      for (const alt of alts) {
        if (!seen.has(alt.nom)) {
          seen.add(alt.nom);
          alternatives.push(alt);
        }
      }
    }
  }

  return alternatives.slice(0, 6);
}

export function universalResultToScannedProduct(
  result: UniversalAnalysisResult & { openFactsData?: OpenFactsResult | null },
  photoUri: string,
): ScannedProduct {
  console.log('[API] Mapping badge_global to riskGroup. AI badge_global:', result.badge_global);
  let riskGroup = niveauRisqueToGroup(result.badge_global);
  console.log('[API] Initial riskGroup from badge_global:', riskGroup);

  const detectedAdditives = result.substances_detectees
    .filter((s: SubstanceDetected) => s.niveau_risque !== 'aucun')
    .map((s: SubstanceDetected) => ({
      code: s.code ?? s.nom,
      name: s.nom,
      group: niveauRisqueToGroup(s.niveau_risque),
      description: s.explication ?? '',
    }));

  const controversialCount = result.substances_detectees.filter(
    (s: SubstanceDetected) => s.niveau_risque !== 'aucun'
  ).length;

  if (riskGroup === 'none' && detectedAdditives.length > 0) {
    const groupPriority: Record<RiskGroup, number> = { group1: 3, group2a: 2, group2b: 1, none: 0 };
    const highestSubstance = detectedAdditives.reduce<RiskGroup>((max, a) => {
      return groupPriority[a.group] > groupPriority[max] ? a.group : max;
    }, 'none');
    console.warn('[API] badge_global said none but substances detected. Upgrading riskGroup to:', highestSubstance);
    riskGroup = highestSubstance;
  }

  riskGroup = applyCumulativeRule(riskGroup, controversialCount);
  console.log('[API] Final riskGroup after cumulative rule:', riskGroup, 'controversial:', controversialCount);

  const detectedIngredients: DetectedIngredient[] = result.substances_detectees.map((s: SubstanceDetected) => ({
    nom: s.nom,
    code: s.code,
    classification_circ: s.classification_circ,
    niveau_risque: s.niveau_risque,
    explication: s.explication,
  }));

  const off = result.openFactsData;
  const hasOffData = off?.found && off.product;
  const offProduct = off?.product;

  const productName = hasOffData && offProduct?.product_name
    ? offProduct.product_name
    : result.objet_identifie;

  const productBrand = hasOffData && offProduct?.brands
    ? offProduct.brands
    : '';

  const imageUrl = hasOffData && offProduct?.image_url
    ? offProduct.image_url
    : null;

  const ingredientsText = hasOffData && offProduct?.ingredients_text
    ? offProduct.ingredients_text
    : result.substances_detectees.map((s: SubstanceDetected) => s.nom).join(', ');

  const nutriScore = hasOffData && offProduct?.nutriscore_grade
    ? offProduct.nutriscore_grade.toUpperCase()
    : undefined;

  const novaGroup = hasOffData && offProduct?.nova_group
    ? offProduct.nova_group
    : undefined;

  const offSource = off?.source ?? undefined;

  if (hasOffData) {
    console.log('[API] Enriching product with Open Food Facts data:', offProduct?.product_name, offProduct?.brands);
  }

  return {
    barcode: `universal_${Date.now()}`,
    name: productName,
    brand: productBrand,
    imageUrl,
    riskGroup,
    detectedAdditives,
    scannedAt: new Date().toISOString(),
    categories: result.categorie_produit,
    ingredientsText,
    scanMethod: 'photo',
    photoUri,
    detectedIngredients,
    analysisSummary: result.resume,
    photoType: 'front',
    productCategory: result.categorie_produit,
    objectIdentified: result.objet_identifie,
    materialDetected: result.materiau_detecte,
    substances: result.substances_detectees,
    recommendations: result.recommandations,
    saferAlternatives: result.alternatives_sures,
    healthyAlternatives: result.alternatives_saines ?? [],
    nutriScore,
    novaGroup,
    offSource,
  };
}
