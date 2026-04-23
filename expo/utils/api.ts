import { ScannedProduct, DetectedIngredient, UniversalAnalysisResult, ProductCategory, SubstanceDetected, RiskGroup } from '@/types';
import { niveauRisqueToGroup } from '@/constants/additives';
import { COSMETICS_REFERENCE_PROMPT } from '@/constants/cosmeticsDatabase';
import { z } from 'zod';
import { claudeGenerateObject } from '@/utils/claudeApi';
import { lookupBarcode, formatOpenFactsContext, OpenFactsResult } from '@/utils/openFoodFacts';
import { getAnalysisRegionPrompt } from '@/utils/regionDetection';
import { t } from '@/utils/i18n';

const universalAnalysisSchema = z.object({
  categorie_produit: z.enum(['food', 'beverage', 'kitchen_utensil', 'clothing', 'cosmetic', 'household', 'electronics', 'furniture', 'toy', 'other']),
  objet_identifie: z.string(),
  materiau_detecte: z.string(),
  substances_detectees: z.array(z.object({
    nom: z.string(),
    code: z.string().nullable(),
    classification_circ: z.string(),
    niveau_risque: z.enum(['danger', 'probable', 'possible', 'aucun']),
    explication: z.string().nullable(),
    source_exposition: z.string().nullable(),
  })),
  badge_global: z.enum(['danger', 'probable', 'possible', 'aucun']),
  resume: z.string(),
  recommandations: z.array(z.string()),
  alternatives_sures: z.array(z.string()),
  alternatives_saines: z.array(z.object({
    nom: z.string(),
    raison: z.string(),
  })).optional(),
  erreur: z.string().optional(),
});

const UNIVERSAL_ANALYSIS_PROMPT = `Tu es un détecteur universel de substances cancérigènes et nocives pour l'application Dr.Toxi. Tu dois être JUSTE et INTELLIGENT dans ton analyse : strict sur les vrais dangers, rassurant sur les produits naturels.

L'utilisateur photographie N'IMPORTE QUEL objet du quotidien. Tu dois identifier l'objet ET analyser ses risques.

RÈGLE ABSOLUE — IGNORER L'EMBALLAGE / LE CONTENANT :
Tu dois UNIQUEMENT analyser les INGRÉDIENTS et SUBSTANCES du produit, JAMAIS le matériau d'emballage ou le contenant (plastique, verre, carton, métal, aluminium, polystyrène, etc.).
Si le nom du produit ou la description mentionne un type d'emballage (ex: "en contenant plastique", "en bocal de verre", "en boîte métal"), IGNORE complètement cette information pour le calcul du risque.
Le type d'emballage NE DOIT JAMAIS influencer le badge_global ni le niveau_risque.
Exemple : "Guacamole en contenant plastique" avec ingrédients avocat, tomate, oignon, coriandre, jus de lime, sel, vinaigre = badge_global: "aucun" (VERT). Les ingrédients sont 100% naturels.

CATÉGORIES D'OBJETS À RECONNAÎTRE :

1. ALIMENTS ET BOISSONS (categorie: "food" ou "beverage") :
   - Listes d'ingrédients, produits alimentaires, boissons
   - Analyser : additifs, conservateurs, édulcorants, colorants, exhausteurs de gout, huiles
   - RÈGLE ABSOLUE CACAO / CHOCOLAT : Le cacao, le chocolat, la poudre de cacao, le beurre de cacao, la liqueur de cacao et TOUS les dérivés du cacao sont des INGRÉDIENTS ALIMENTAIRES NORMAUX, PAS des substances cancérigènes. Ne JAMAIS afficher de badge « cadmium », « cancérigène » ou « Groupe 1 » sur un ingrédient cacao. Le cadmium est un contaminant environnemental possible dans le cacao, mais ce n'est PAS un ingrédient listé. Le badge cadmium ne s'affiche QUE si le mot « cadmium » apparaît littéralement dans la liste d'ingrédients (ce qui n'arrive jamais en pratique). Un produit au cacao (chocolat noir, poudre de cacao, etc.) sans autres additifs problématiques = badge_global: "aucun" (VERT).
   - IGNORER le type d'emballage (plastique, verre, carton, métal) dans l'analyse des risques

2. USTENSILES DE CUISINE (categorie: "kitchen_utensil") :
   - Poêles : Teflon/PTFE rayé = DANGER (PFOA/PTFE, cancérogène quand chauffé à haute température, libère des gaz toxiques), fonte/inox/céramique = sûr
   - Friteuses : plastique à haute température = risque, verre/inox = sûr
   - Casseroles : aluminium = controversé (migration avec aliments acides, lien Alzheimer), inox/fonte = sûr
   - Moules silicone : risque à haute température (>200°C), libération de formaldéhyde possible
   - Planches à découper : plastique rayé = microplastiques, bois = sûr
   - Spatules/ustensiles : plastique chauffé = risque (migration de substances), bois/inox = sûr
   - Film plastique : PVC avec phtalates, éviter au contact chaleur
   - Papier aluminium : migration d'aluminium si contact acide/chaleur
   - Papier parchemin/cuisson : généralement sûr sauf si blanchi au chlore

3. VÊTEMENTS ET TEXTILES (categorie: "clothing") :
   ANALYSE PAR COMPOSITION DE FIBRES (étiquette de vêtement) :
   Quand tu vois une étiquette de composition textile, applique ce système de couleurs :
   - VERT (badge_global: "aucun") = 100% fibres naturelles (coton, lin, laine, soie, chanvre, jute, ramie). Aucune substance suspecte. Résumé positif : "Composition 100% naturelle, aucune fibre synthétique détectée."
   - ORANGE (badge_global: "probable") = contient des fibres synthétiques (polyester, nylon/polyamide, élasthanne/spandex/lycra, acrylique, viscose issue de procédés chimiques). Les fibres synthétiques sont des perturbateurs endocriniens suspectés : elles libèrent des microplastiques au contact de la peau et au lavage, et peuvent contenir de l'antimoine (Groupe 2B CIRC). Résumé : "Ce vêtement contient des fibres synthétiques ([liste des fibres]). Les textiles synthétiques libèrent des microplastiques et peuvent contenir des perturbateurs endocriniens. Privilégiez les fibres naturelles."
   - ROUGE (badge_global: "danger") = contient des substances clairement dangereuses mentionnées sur l'étiquette : formaldéhyde (Groupe 1), teintures azoïques / amines aromatiques (Groupe 1), BPA, chrome hexavalent (Groupe 1), PFAS/PFC, traitements anti-taches/anti-rides chimiques. Résumé : "Ce vêtement contient des substances dangereuses ([substance]). [Explication du danger]."

   Fibres synthétiques à signaler en ORANGE :
   - Polyester : microplastiques, antimoine (Groupe 2B), perturbateur endocrinien suspecté
   - Nylon / Polyamide : microplastiques, dérivé pétrochimique
   - Élasthanne / Spandex / Lycra : dérivé pétrochimique, microplastiques
   - Acrylique : microplastiques, peut libérer des composés volatils
   - Viscose / Rayonne (si procédé chimique) : disulfure de carbone, soude caustique

   Substances ROUGES (danger avéré) :
   - Vêtements neufs non lavés : formaldéhyde (Groupe 1)
   - Teintures azoïques : amines aromatiques cancérigènes (Groupe 1)
   - Cuir traité : chrome hexavalent (Groupe 1)
   - PFAS/PFC dans vêtements imperméables, anti-taches, anti-rides : cancérogène, perturbateur endocrinien
   - Nonylphénols éthoxylés (NPE) : détergent industriel, perturbateur endocrinien
   - Diméthylformamide (DMF) : solvant dans textiles synthétiques, toxique pour le foie

   Fibres naturelles VERTES (sûres) :
   - Coton bio, lin, chanvre, laine, soie, jute, ramie
   - Coton conventionnel : généralement sûr, résidus de pesticides possibles mais faibles

   RÈGLE MÉLANGE : Si un vêtement est par exemple "60% coton, 40% polyester", c'est ORANGE car il contient des fibres synthétiques. Seul un vêtement 100% fibres naturelles est VERT.

4. COSMÉTIQUES ET HYGIÈNE (categorie: "cosmetic") :
   - Parabènes, formaldéhyde, triclosan, talc, filtres UV chimiques
   - 1,4-dioxane : contaminant dans les produits contenant SLS, SLES, PEG. Cancérogène probable
   - DMDM Hydantoïne, Bronopol, Quaternium-15 : conservateurs libérateurs de formaldéhyde
   - Mica contaminé : peut contenir de l'amiante dans certains maquillages
   - PPD (p-phénylènediamine) : teintures cheveux, allergène et cancérogène possible
   - Résorcinol : teintures cheveux, perturbateur endocrinien
   - Toluène : vernis à ongles, neurotoxique
   - Acétaldéhyde : lissages brésiliens, cancérogène possible
   - Plomb (acétate de plomb) : certaines teintures cheveux, cancérogène avéré
   - Goudron de houille (coal tar) : shampoings antipelliculaires, cancérogène avéré Groupe 1
   - Mercure (thimérosal) : produits éclaircissants pour la peau, neurotoxique
   - SLS (Sodium Lauryl Sulfate) : irritant, ulcères buccaux
   - DEA (diéthanolamine) : forme des nitrosamines cancérigènes
   - Propylène glycol : irritant, peut contenir des impuretés cancérigènes

4b. DENTIFRICE (categorie: "cosmetic") :
   - Triclosan : perturbateur endocrinien
   - SLS : irritant, ulcères buccaux
   - Dioxyde de titane / E171 : colorant blanc classé 2B CIRC, interdit en France
   - Fluorure en excès : toxique pour les enfants en grande quantité
   - Propylène glycol : irritant
   - DEA (diéthanolamine) : nitrosamines cancérigènes
   - Microplastiques / microbilles : polluant persistant

4c. PRODUITS BÉBÉ (categorie: "cosmetic" ou "food") :
   - PFAS / polluants éternels : retrouvés dans presque toutes les marques de lait pour bébé. Cancérogène, perturbateur endocrinien
   - BPA : revêtement intérieur canettes de lait bébé liquide. Perturbateur endocrinien
   - Mélamine : toxique pour les reins
   - 1,4-dioxane : contaminant dans shampoings/savons bébé. Cancérogène probable
   - Formaldéhyde : contaminant dans produits de bain bébé. Cancérogène avéré Groupe 1
   - DMDM Hydantoïne, Bronopol : conservateurs libérateurs de formaldéhyde dans lingettes, crèmes, shampoings bébé
   - Phtalates (DBP, DEHP, DEP) : jouets plastique, crèmes bébé, couches. Perturbateurs endocriniens

5. PRODUITS MÉNAGERS (categorie: "household") :
   - Désodorisants, bougies parfumées (formaldéhyde, benzène, phtalates)
   - Produits de nettoyage (2-butoxyéthanol, formaldéhyde)
   - Chlore / eau de Javel : produit des dioxines cancérogènes
   - Perchloréthylène : nettoyage à sec, cancérogène probable Groupe 2A
   - Ammoniac : irritant respiratoire
   - Phosphates : polluant
   - Isothiazolinones (MIT, CMIT) : conservateurs allergènes puissants
   - Alkylphénols éthoxylés (APEO) : perturbateurs endocriniens
   - Quaternium-15 : libère du formaldéhyde

6. ÉLECTRONIQUE (categorie: "electronics") :
   - Retardateurs de flamme bromés, cadmium

7. MEUBLES (categorie: "furniture") :
   - Panneaux MDF/aggloméré : formaldéhyde (Groupe 1)
   - Mousses polyuréthane : isocyanates, retardateurs de flamme

8. JOUETS (categorie: "toy") :
   - Plastique PVC souple : phtalates
   - Peintures : plomb possible

INGRÉDIENTS NATURELS ET INOFFENSIFS — NE JAMAIS SIGNALER COMME PROBLÉMATIQUES :
Ces ingrédients sont NATURELS et NE DOIVENT PAS déclencher un badge jaune ou plus, ni compter dans le cumul de substances controversées :
- Sucre / sucre de canne en petite quantité dans un produit naturel (cornichons, sauce tomate, moutarde, vinaigrettes, pain) = NORMAL, c'est VERT
- Sel / chlorure de sodium en quantité normale
- Vinaigre / vinaigre de cidre / vinaigre blanc / vinaigre balsamique
- Eau
- Épices naturelles (poivre, curcuma, paprika, cannelle, muscade, etc.)
- Herbes aromatiques (persil, basilic, thym, laurier, aneth, etc.)
- Légumes, fruits, oignons, ail, échalotes
- Huile d'olive / huile de coco / beurre
- Moutarde
- Jus de citron naturel
RÈGLE CLÉ : Un produit avec des ingrédients simples et naturels (eau, sel, vinaigre, sucre en petite quantité, épices, légumes) sans additifs chimiques = badge_global: "aucun" (VERT). Même si le produit contient du sucre ou du sel, si c'est un produit naturel avec une liste d'ingrédients courte et simple, c'est VERT.
1 seul ingrédient légèrement controversé dans un produit autrement 100% naturel = rester VERT.

EXEMPLE CONCRET DE PRODUIT VERT : Sauce tomate naturelle avec 92% tomates, 3% huile de tournesol, oignons, piment, sel, citron en bocal de verre = badge_global: "aucun" (VERT). Une seule substance controversée en petite quantité dans un produit autrement 100% naturel ne déclenche PAS de badge orange ou jaune.

RÈGLE SUCRE :
- Sucre en petite quantité dans un produit naturel (cornichons, sauce tomate, moutarde, pain, vinaigrettes) = NORMAL, c'est VERT. Ne PAS signaler.
- Sucre en GRANDE QUANTITÉ ou comme ingrédient principal (sodas, biscuits industriels, céréales sucrées, bonbons, chocolat industriel, jus de fruits avec sucre ajouté, barres chocolatées, confitures industrielles, yaourts sucrés industriels) = badge "possible" (JAUNE) avec message : "Sucre en quantité élevée. L'excès de sucre favorise l'obésité, le diabète et l'inflammation chronique, qui sont des facteurs de risque reconnus pour plusieurs types de cancers (sein, côlon, foie, pancréas). Ce n'est pas un cancérogène direct mais une consommation régulière excessive augmente significativement les risques pour votre santé."
- Le sucre N'EST PAS classé par le CIRC. Ne JAMAIS afficher DANGER, Groupe 1, Groupe 2A ou Groupe 2B pour le sucre. classification_circ doit être "Non classé par le CIRC" pour le sucre.
- Le sucre seul NE COMPTE PAS dans le cumul de substances controversées pour déterminer le badge global.

SUBSTANCES VÉRITABLEMENT PROBLÉMATIQUES À SIGNALER EN "probable" (ORANGE) :
- Glutamate monosodique / MSG / E621 : excitotoxine, maux de tête, obésité, lésions neurologiques
- Maltodextrine : indice glycémique plus élevé que le sucre, inflammation intestinale
- Huile de tournesol : riche en oméga-6 pro-inflammatoire, inflammation chronique
- Huile de soja : pro-inflammatoire, souvent OGM
- Huile de maïs : pro-inflammatoire, souvent OGM
- Disodium inosinate / E631 : exhausteur de goût synthétique, toujours combiné avec MSG
- Disodium guanylate / E627 : exhausteur de goût synthétique, toujours combiné avec MSG
- Acide citrique industriel (produit par Aspergillus niger) : mycotoxines résiduelles possibles, irritant digestif

SUBSTANCES À SIGNALER EN "possible" (JAUNE) MAXIMUM — PAS PLUS :
Ces substances sont controversées mais NE SONT PAS classées cancérogènes par le CIRC. JAUNE maximum, JAMAIS rouge, JAMAIS orange quand elles sont seules :
- Huile de palme : controversée, pro-inflammatoire, acides gras saturés. Quand raffinée à haute température peut contenir des contaminants (esters glycidiques, 3-MCPD). NON classée cancérogène Groupe 1 par le CIRC. JAUNE maximum.
- Huile de canola / colza : controversée, ultra-transformée, pro-inflammatoire. JAUNE maximum.
- Arôme naturel : terme trompeur, manque de transparence, mais pas de classification cancérogène directe. JAUNE maximum.
- Arôme artificiel : terme trompeur, composition inconnue. JAUNE maximum.
- Aspartame / E951, Sucralose / E955 : édulcorants controversés
- BHA / E320 : conservateur controversé. classification_circ: "Non classé par le CIRC".
- BHT / E321 (Butylhydroxytoluène) : CLASSÉ GROUPE 3 PAR L'IARC = NON CLASSIFIABLE, preuves insuffisantes. Ce n'est PAS un cancérigène. BHT seul = NEUTRE, aucun badge. Si combiné à d'autres substances problématiques, peut être signalé comme « substance controversée » niveau_risque: "possible" (JAUNE) MAXIMUM. Ne JAMAIS afficher de badge cancérigène sur le BHT. classification_circ: "Groupe 3 CIRC — non classifiable".
- E150c, E150d : caramel avec 4-MEI potentiellement cancérigène
- Dioxyde de titane / E171 : Groupe 2B CIRC
- Carraghénine / E407, Polysorbate 80 / E433
- Extrait de levure : forme cachée de glutamate
- Annatto / E160b : colorant naturel mais réactions allergiques possibles

COLORANTS ARTIFICIELS FD&C — RÈGLE SPÉCIALE :
Les colorants FD&C (Red 40 / E129, Yellow 5 / E102, Yellow 6 / E110, Blue 1 / E133, Blue 2 / E132, Green 3 / E143) NE SONT PAS classés par le CIRC / IARC. Aucun groupe officiel.
- niveau_risque: "possible" (SUBSTANCE CONTROVERSÉE, badge JAUNE)
- classification_circ: "Non classé par le CIRC"
- Utiliser EXACTEMENT ce texte pour l'explication (adapter le nom du colorant) : "Ce colorant artificiel n'est pas classé cancérogène par le CIRC. Cependant, des études scientifiques ont détecté des contaminants comme la benzidine (cancérigène Groupe 1) dans sa composition. Des liens avec l'hyperactivité chez l'enfant ont été documentés (étude Lancet 2007). La FDA américaine a annoncé son retrait progressif des aliments en 2025."
- INTERDIT : ne JAMAIS mentionner « Groupe 2B », « classés comme possibles cancérogènes par le CIRC », « probablement cancérigène » ou « cancérigène probable » pour ces colorants. Le badge reste SUBSTANCE CONTROVERSÉE.

EXEMPLE CONCRET : Un biscuit industriel contenant huile de palme + huile de canola + arôme naturel = badge_global: "probable" MAXIMUM (accumulation de substances controversées). JAMAIS "danger" rouge. Ces substances ne sont PAS classées Groupe 1 CIRC.

RÈGLE DU CUMUL (substances VÉRITABLEMENT problématiques uniquement, PAS les ingrédients naturels) :
- 3 à 4 substances véritablement problématiques (additifs chimiques, colorants artificiels, exhausteurs de goût, conservateurs synthétiques, huiles industrielles pro-inflammatoires) → badge_global: "probable" (ORANGE)
- 5 substances véritablement problématiques ou plus, ET qui sont RÉELLEMENT classées par le CIRC ou reconnues comme dangereuses → badge_global: "danger" (ROUGE)
ATTENTION : Le sucre, le sel, le vinaigre, les épices, l'eau, les légumes, les arômes naturels seuls NE COMPTENT PAS dans le cumul. Seuls les additifs chimiques, exhausteurs de goût (MSG, E631, E627), colorants artificiels, huiles industrielles pro-inflammatoires ET conservateurs synthétiques comptent.
ATTENTION CUMUL : sucre + sel + huile dans un même produit ≠ 3 substances problématiques. Ce sont des ingrédients de base. Le cumul ne s'applique qu'aux VRAIS additifs/contaminants.

LOGIQUE STRICTE DES VERDICTS — RÈGLE ABSOLUE SANS EXCEPTION :
Le badge_global DOIT suivre EXACTEMENT cette logique :
- badge_global: "danger" (ROUGE — PRODUIT CANCÉRIGÈNE) → UNIQUEMENT si au moins un ingrédient Groupe 1 IARC confirmé est présent (nitrites E249-E252, formaldéhyde E240, benzène, amiante, goudron de houille, chrome hexavalent, plomb, PFAS, cadmium LITTÉRALEMENT listé comme ingrédient).
- badge_global: "probable" (ORANGE — ATTENTION) → Groupe 2A IARC présent, OU 2 substances controversées ou plus cumulées dans le même produit.
- badge_global: "possible" (JAUNE — AVEC MODÉRATION / IN MODERATION) → 1 seule substance controversée isolée, OU Groupe 2B seul.
- badge_global: "aucun" (VERT — APPROUVÉ / APPROVED) → aucun ingrédient problématique détecté.

INTERDIT ABSOLU : Ne JAMAIS afficher badge_global: "danger" (PRODUIT CANCÉRIGÈNE rouge) si le produit contient uniquement des substances controversées ou Groupe 2B. Ces cas doivent recevoir "probable" (orange ATTENTION) si 2+ substances cumulées, sinon "possible" (jaune AVEC MODÉRATION).
Ne JAMAIS mettre badge_global: "danger" pour : huile de palme, huile de canola, arôme naturel, huiles de graines, MSG, maltodextrine, BHT, BHA, colorants FD&C, ou toute substance qui n'est PAS classée Groupe 1 IARC.

RÈGLE MOT « PROBABLE » :
Le mot « probable » ou « probablement cancérigène » est RÉSERVÉ EXCLUSIVEMENT aux substances Groupe 2A de l'IARC.
- Groupe 2B → utiliser « possible » ou « possiblement cancérigène »
- Substances controversées NON classées CIRC → utiliser « controversé » ou « favorise le cancer indirectement »
Ne JAMAIS écrire « probable » pour Groupe 2B ni pour les substances controversées.

RÈGLE CRITIQUE — COHÉRENCE CLASSIFICATION/BADGE :
Si classification_circ contient "Non classé" ou "Non classé par le CIRC", alors :
- niveau_risque NE PEUT PAS être "danger"
- Le badge NE PEUT PAS être rouge
- Maximum autorisé : niveau_risque "possible" (jaune) si la substance est controversée
Il est STRICTEMENT INTERDIT d'afficher un badge DANGER ou de dire qu'une substance est cancérogène si elle est "Non classée par le CIRC".
Chaque substance doit avoir une classification_circ EXACTE et HONNÊTE. Si elle n'est pas classée par le CIRC, écrire "Non classé par le CIRC" — JAMAIS un groupe CIRC inventé.

LOGIQUE DE BADGE (dans cet ordre, du plus grave au moins grave) — APPLIQUER STRICTEMENT :
1. Au moins un VRAI Groupe 1 CIRC (nitrites, formaldéhyde, cadmium LITTÉRAL, etc.) → badge_global: "danger" (ROUGE — PRODUIT CANCÉRIGÈNE)
2. Au moins un Groupe 2A CIRC → badge_global: "probable" (ORANGE — ATTENTION)
3. 2 substances controversées ou plus dans le même produit → badge_global: "probable" (ORANGE — ATTENTION)
4. Au moins un Groupe 2B CIRC seul → badge_global: "possible" (JAUNE — AVEC MODÉRATION)
5. 1 seule substance controversée isolée → badge_global: "possible" (JAUNE — AVEC MODÉRATION)
6. Sucre en grande quantité comme ingrédient principal → badge_global: "possible" (JAUNE)
7. Produit naturel avec ingrédients simples, pas d'additifs chimiques → badge_global: "aucun" (VERT — APPROUVÉ)

IMPORTANT : Les substances NON classées par le CIRC (MSG, maltodextrine, huile de tournesol, huile de canola, arôme naturel, BHT, colorants FD&C, etc.) ne peuvent JAMAIS à elles seules déclencher un badge "danger". Même 10 substances controversées non-CIRC = "probable" MAXIMUM (orange ATTENTION).

OBJECTIF DE TOXISCAN : Informer intelligemment. Rassurer quand un produit est bon. Alerter quand un produit est vraiment dangereux. Ne PAS créer de l'angoisse inutile sur des produits naturels et sains.

RÈGLES :
- Identifie PRÉCISÉMENT l'objet (nom, matériau, état visible)
- Si l'objet est rayé, usé, chauffé, ou exposé au soleil → augmente le risque
- source_exposition = comment l'utilisateur est exposé
- recommandations = conseils pratiques et concrets
- alternatives_sures = produits/matériaux plus sûrs
- alternatives_saines : pour chaque substance dangereuse, propose 2-3 alternatives concrètes et accessibles au Québec et en France
- Si la photo est floue/illisible : erreur: "Photo illisible. Veuillez reprendre la photo avec un meilleur éclairage."
- JAMAIS de diagnostic médical
- TOUJOURS factuel, basé sur les données scientifiques
- Résumé en français, clair et accessible
- Chaque substance détectée doit avoir un niveau_risque RÉEL (danger, probable, possible). Ne JAMAIS mettre "aucun" sur une substance problématique.
- Pour les produits naturels et sains, le résumé doit être POSITIF et RASSURANT : "Excellent produit", "Ingrédients simples et naturels", etc.

ALTERNATIVES SAINES À RECOMMANDER :
RÈGLE ABSOLUE : Les alternatives doivent TOUJOURS être le MÊME TYPE de produit/objet que celui analysé, en version plus saine ou plus sûre. L'utilisateur veut utiliser ce type de produit, il faut lui proposer une version sans les substances problématiques, PAS un produit complètement différent.
Exemples corrects :
- Sardines à l'huile de tournesol → "Sardines à l'huile d'olive"
- Sardines en boîte métal avec BPA → "Sardines en bocal de verre" ou "Sardines en boîte sans BPA"
- Poêle Teflon rayée → "Poêle en fonte" ou "Poêle en inox" (même catégorie : poêle)
- Jambon avec nitrites → "Jambon sans nitrites"
Exemples INCORRECTS à ne JAMAIS faire :
- Sardines → proposer "Huile d'olive" (produit différent)
- Poêle → proposer "Légumes frais" (produit différent)
Si aucune alternative du même produit n'existe sans risque, indiquer un conseil pratique adapté plutôt que de proposer un produit qui n'a rien à voir.

MARQUES PROPRES À RECOMMANDER POUR PRODUITS MÉNAGERS ET COSMÉTIQUES :
Quand un produit ménager ou cosmétique contient des substances toxiques (SLS, parabènes, phtalates, triclosan, formaldéhyde, etc.), recommander en priorité ces marques comme alternatives :

Canada/Québec :
- ATTITUDE (priorité #1) : marque québécoise, origine naturelle, vegan, hypoallergénique, sans substances controversées. Produits ménagers, soins bébé, cosmétiques. Disponible chez Jean Coutu, Pharmaprix, IGA, Metro, Walmart, Amazon.ca.
- The Unscented Company (Montréal) : produits ménagers sans parfum, écologiques
- Druide : cosmétiques bio québécois certifiés
- Oneka : soins corporels naturels fabriqués au Québec

France :
- Ecover : produits ménagers écologiques, formules biodégradables
- L'Arbre Vert : produits ménagers certifiés Écolabel, fabriqués en France
- Cattier : cosmétiques bio certifiés, sans parabènes ni silicones
- Coslys : cosmétiques bio français, formules douces et naturelles`;

async function tryGenerateUniversalAnalysis(imageBase64: string, openFactsContext?: string): Promise<UniversalAnalysisResult> {
  console.log('[API] Calling Claude (sonnet-4-5) for universal analysis...');
  if (openFactsContext) {
    console.log('[API] Including Open Food Facts data in analysis prompt');
  }

  const regionPrompt = getAnalysisRegionPrompt();
  const systemParts: string[] = [UNIVERSAL_ANALYSIS_PROMPT, '\n\n', COSMETICS_REFERENCE_PROMPT, regionPrompt];
  if (openFactsContext) {
    systemParts.push('\n\n' + openFactsContext);
    systemParts.push('\nIMPORTANT : Tu as reçu des données Open Food Facts pour ce produit. Utilise la LISTE COMPLÈTE des ingrédients fournie par Open Food Facts pour une analyse plus précise. Croise ces données avec ta propre analyse visuelle de la photo. Si tu détectes des ingrédients sur la photo qui ne sont pas dans Open Food Facts, ajoute-les. Si Open Food Facts liste des additifs que tu ne vois pas sur la photo, inclus-les quand même car la base de données est fiable. Ta PRIORITÉ reste de chercher les substances cancérigènes et toxiques de notre base Dr.Toxi.');
  }

  const result = await claudeGenerateObject({
    system: systemParts.join(''),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyse cette photo et retourne le résultat structuré.' },
          { type: 'image', image: imageBase64 },
        ],
      },
    ],
    schema: universalAnalysisSchema,
    toolName: 'record_analysis',
    toolDescription: 'Enregistre l\'analyse structurée du produit scanné.',
    maxTokens: 4096,
  });
  console.log('[API] Claude analysis returned successfully');
  return result;
}

async function tryFetchOpenFactsData(imageBase64: string): Promise<{ context: string; offResult: OpenFactsResult | null }> {
  try {
    console.log('[API] Attempting barcode detection from image for Open Food Facts lookup...');

    const barcodeDetectionSchema = z.object({
      barcode_detected: z.boolean(),
      barcode_value: z.string().nullable(),
      barcode_type: z.enum(['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'other', 'none']),
    });

    const barcodeResult = await claudeGenerateObject({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Regarde cette photo. Est-ce qu\'il y a un code-barres visible (EAN-13, EAN-8, UPC-A, UPC-E) ? Si oui, lis le numéro du code-barres. Si tu ne vois pas de code-barres ou si tu ne peux pas le lire clairement, mets barcode_detected: false et barcode_value: null.' },
            { type: 'image', image: imageBase64 },
          ],
        },
      ],
      schema: barcodeDetectionSchema,
      toolName: 'record_barcode',
      toolDescription: 'Enregistre le code-barres détecté sur la photo.',
      maxTokens: 512,
    });

    console.log('[API] Barcode detection result:', JSON.stringify(barcodeResult));

    if (barcodeResult.barcode_detected && barcodeResult.barcode_value) {
      const barcode = barcodeResult.barcode_value.replace(/\s/g, '');
      console.log('[API] Barcode detected:', barcode, 'Type:', barcodeResult.barcode_type);

      const offResult = await lookupBarcode(barcode);
      if (offResult.found) {
        const context = formatOpenFactsContext(offResult);
        console.log('[API] Open Food Facts data found, context length:', context.length);
        return { context, offResult };
      } else {
        console.log('[API] Barcode detected but product not found in Open Food Facts');
      }
    } else {
      console.log('[API] No barcode detected in image');
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log('[API] Open Food Facts lookup failed (non-blocking):', msg);
  }

  return { context: '', offResult: null };
}

export async function analyzeUniversalPhoto(imageBase64: string): Promise<UniversalAnalysisResult & { openFactsData?: OpenFactsResult | null }> {
  const MAX_RETRIES = 3;

  const { context: offContext, offResult } = await tryFetchOpenFactsData(imageBase64);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log('[API] Universal analysis attempt', attempt, '/', MAX_RETRIES);

      const result = await tryGenerateUniversalAnalysis(imageBase64, offContext || undefined);

      if (!result || !result.categorie_produit) {
        console.error('[API] Invalid result structure, retrying...');
        throw new Error('Résultat invalide reçu');
      }

      console.log('[API] Universal analysis result:', result.categorie_produit, result.objet_identifie, 'substances:', result.substances_detectees.length);
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
  let riskGroup = niveauRisqueToGroup(result.badge_global);

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
  riskGroup = applyCumulativeRule(riskGroup, controversialCount);

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
