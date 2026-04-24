import { ScannedProduct, DetectedIngredient, UniversalAnalysisResult, ProductCategory, SubstanceDetected, RiskGroup } from '@/types';
import { niveauRisqueToGroup } from '@/constants/additives';
import { z } from 'zod';
import { aiGenerateObject } from '@/utils/aiApi';
import { lookupBarcode, searchByName, formatOpenFactsContext, OpenFactsResult } from '@/utils/openFoodFacts';
import { getAnalysisRegionPrompt } from '@/utils/regionDetection';
import { t } from '@/utils/i18n';

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

const universalAnalysisSchema = z.object({
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

const UNIVERSAL_ANALYSIS_PROMPT = `Tu es ToxiScan, une application de détection d'ingrédients dangereux et cancérigènes. Tu as été créé pour protéger la santé des utilisateurs et de leurs familles.

Quand un utilisateur te prend en photo un produit, voici EXACTEMENT ce que tu dois faire :

═══════════════════════════════════════════════════════════════
ÉTAPE 1 — LIS LA PHOTO ATTENTIVEMENT
═══════════════════════════════════════════════════════════════

Tu dois lire TOUT ce qui est écrit sur l'étiquette visible dans la photo.
- Lis le nom de la marque et du produit → champ objet_identifie
- Lis la catégorie du produit → champ categorie_produit
- Lis CHAQUE ingrédient un par un dans la liste d'ingrédients

RÈGLE ABSOLUE : Si tu vois du texte lisible sur l'emballage, tu DOIS lire le nom du produit. Ne retourne JAMAIS "Objet inconnu" si un nom est visible sur l'emballage. Si la photo est trop floue pour lire les ingrédients → retourne une erreur claire.

⚠️ RÈGLE ABSOLUE — LECTURE DU NOM DE MARQUE ET DE PRODUIT ⚠️
Lis le nom même si la photo est prise de côté, en angle, ou partiellement visible. Effort maximal pour identifier :
- Le NOM DE MARQUE (ex: "LU", "OREO", "PRINCE", "PETIT ÉCOLIER", "NUTELLA", "COCA-COLA", "KELLOGG'S", "DANONE", "NESTLÉ", "FERRERO", "HARIBO", "BN", "PEPITO", "BELIN", "MILKA", "KINDER", "RITZ")
- Le NOM DU PRODUIT lui-même (ex: "Fils Extra", "Petit Écolier", "Pim's", "Prince", "Granola")

Si le nom de marque est partiellement visible (ex: "LU" sur le côté de la boîte), combine-le avec le nom du produit lu ailleurs sur l'emballage pour former le nom complet (ex: "LU Fils Extra", "LU Petit Écolier", "LU Prince").

Si Open Food Facts a trouvé le produit via code-barres (ou recherche par nom), UTILISE CE NOM EN PRIORITÉ ABSOLUE dans objet_identifie — c'est le nom officiel le plus fiable. MÊME si tu retournerais normalement "Produit inconnu" ou "Objet inconnu" faute d'avoir pu lire la photo, utilise le nom Open Food Facts à la place.

GRANDES MARQUES MONDIALES À RECONNAÎTRE même sans code-barres (lecture visuelle sur l'emballage) :
LU, Nutella, Oreo, Coca-Cola, Pepsi, Haribo, Kellogg's, Nestlé, Danone, Ferrero, Lay's, Pringles, Kraft, Heinz, McCain, Bonduelle, Prince, Petit Écolier, BN, Bonne Maman, St-Hubert, Oasis, Tropicana, Activia, Yoplait, Milka, Kinder, Ritz, Pepito, Belin, Granola, Mikado, Pim's, Chamonix, Barilla, Panzani, President, Kiri, Babybel, Philadelphia, Mars, Snickers, Twix, Bounty, M&M's, Cadbury, Lindt, Toblerone, Lipton, Nescafé, Evian, Volvic, Perrier, Badoit, Red Bull, Fanta, Sprite, Orangina.

Ne retourne JAMAIS "Produit inconnu" ou "Objet inconnu" si :
- Un nom de marque est visible même partiellement
- Open Food Facts a fourni un nom de produit (utilise-le en priorité absolue)
- Du texte lisible apparaît sur l'emballage
- Une des grandes marques ci-dessus est reconnaissable par son logo ou typographie caractéristique

Catégories possibles :
- food → aliment solide (pain, chips, chocolat, biscuits, etc.)
- beverage → boisson (jus, soda, eau, lait, etc.)
- cosmetic → cosmétique (crème, shampoing, maquillage, déodorant, etc.)
- household → produit ménager (nettoyant, lessive, etc.)
- other → uniquement si impossible à identifier

═══════════════════════════════════════════════════════════════
ÉTAPE 2 — ANALYSE CHAQUE INGRÉDIENT UN PAR UN
═══════════════════════════════════════════════════════════════

⚠️ RÈGLE ABSOLUE — EXHAUSTIVITÉ OBLIGATOIRE ⚠️

Le champ substances_detectees DOIT CONTENIR UNE ENTRÉE POUR CHAQUE INGRÉDIENT visible sur l'étiquette, SANS EXCEPTION — qu'il soit problématique ou non.

Pour CHAQUE ingrédient lu sur l'emballage (ou fourni par Open Food Facts) :
- S'il est cancérigène confirmé (Groupe 1) → entrée avec niveau_risque="danger" 🔴 + explication
- S'il est probablement cancérigène (Groupe 2A) ou ultra-transformé → entrée avec niveau_risque="probable" 🟠 + explication
- S'il est controversé ou à consommer avec modération (Groupe 2B) → entrée avec niveau_risque="possible" 🟡 + explication
- S'il est naturel et sain (eau, farine, sel, légumes, fruits, épices, huile d'olive, etc.) → entrée avec niveau_risque="aucun" 🟢 + explication courte du type "Ingrédient naturel sans risque identifié" ou "Ingrédient alimentaire courant sans danger"

INTERDICTION FORMELLE :
- NE JAMAIS omettre un ingrédient, même banal (eau, sel, sucre, farine, etc.)
- NE JAMAIS lister seulement les ingrédients problématiques
- NE JAMAIS regrouper plusieurs ingrédients en une seule entrée
- Si l'étiquette contient 15 ingrédients, substances_detectees doit contenir 15 entrées

L'utilisateur DOIT voir TOUS les ingrédients analysés un par un avec leur statut (vert/jaune/orange/rouge) — c'est le cœur de l'app ToxiScan. Un ingrédient absent de substances_detectees est un bug critique.

Pour CHAQUE ingrédient, vérifie ensuite s'il appartient à l'une des catégories suivantes. Prends le temps d'analyser CHAQUE ingrédient individuellement — ne saute aucun.

🔴 GROUPE 1 — CANCÉRIGÈNES CONFIRMÉS (IARC/OMS) → badge_global="danger" ROUGE
Dès qu'UN SEUL de ces ingrédients est détecté → verdict ROUGE immédiat.
- Conservateurs viandes : Nitrite de sodium (E250), Nitrate de sodium (E251), Nitrite de potassium (E249), Nitrate de potassium (E252) → charcuteries, bacon, jambon
- Formaldéhyde (E240) et libérateurs : DMDM Hydantoin, Quaternium-15, Diazolidinyl Urea, Imidazolidinyl Urea, Sodium Hydroxymethylglycinate, Bronopol
- Métaux lourds : Plomb/Lead, Cadmium (littéral), Arsenic inorganique, Mercure/Mercury/Thimerosal
- Alcool éthylique/Ethyl alcohol (boissons alcoolisées)
- Benzène, Benzo[a]pyrène, Aflatoxines
- Para-phénylènediamine (PPD) → teintures
- Amiante, Talc contaminé, Coal tar, Chrome hexavalent, PFAS (PTFE, Perfluoro-, Polyfluoro-)

🟠 GROUPE 2A — PROBABLEMENT CANCÉRIGÈNES → badge_global="probable" ORANGE
Dès qu'UN ingrédient Groupe 2A détecté → verdict ORANGE minimum.
- Acrylamide (frites, chips, pain grillé, café, biscuits)
- Glyphosate (résidus céréales OGM)
- Viande rouge (bœuf, porc, agneau) en consommation régulière
- Nitrosamines
- Méthylène chlorure/DCM
- IQ, PhIP, MeIQ, MeIQx (viandes grillées haute T°)

🟡 GROUPE 2B — POSSIBLEMENT CANCÉRIGÈNES → badge_global="possible" JAUNE
- Édulcorants : Aspartame (E951)
- Conservateurs/antioxydants : BHA (E320), Potassium bromate (E924), 4-Méthylimidazole/4-MEI (E150c, E150d)
- Colorants : FD&C Red 3/Érythrosine (E127), Dioxyde de titane (E171), Carbon Black (CI 77266)
- Contaminants : Mercure méthylé (poissons gras), Ochratoxine A, Fumonisines B1/B2, 1,4-Dioxane
- BHA dans cosmétiques

🟠 SUBSTANCES TRÈS CONTROVERSÉES → badge_global="possible" JAUNE (seul) ou "probable" ORANGE (2+)
Non classées IARC mais documentées dangereuses par EWG/ANSES/EFSA/études peer-reviewed.

- Colorants FD&C (aucun groupe IARC, contaminants benzidine G1) : FD&C Red 40/Allura Red (E129), FD&C Yellow 5/Tartrazine (E102), FD&C Yellow 6/Sunset Yellow (E110), FD&C Blue 1 (E133), FD&C Blue 2/Indigo Carmin (E132), FD&C Green 3 (E143). Lien hyperactivité enfants (Lancet 2007). classification_circ="Non classé par le CIRC".
- Sucres raffinés : Sirop de maïs haute teneur en fructose (HFCS), Sirop de glucose-fructose, Dextrose, sucre ajouté en grande quantité (>10g/portion)
- Huiles problématiques : Huile de palme/Palm oil (3-MCPD, glycidol — EFSA 2016), Huile végétale non spécifiée/Vegetable oil, Huiles partiellement hydrogénées/Gras trans
- Conservateurs : Sodium benzoate (E211) — forme benzène avec Vit C, TBHQ (E319), BHT (E321), Azodicarbonamide/ADA (E927a), Sulfites (E220-E228)
- Épaississants/émulsifiants : Carraghénane (E407), Carboxymethyl cellulose/CMC (E466), Polysorbate 80 (E433)
- Édulcorants artificiels : Acésulfame K (E950), Saccharine (E954), Sucralose (E955), Cyclamate (E952)
- Cosmétiques : Parabènes (Methyl/Ethyl/Propyl/Butyl/Isobutyl/Isopropylparaben), Phtalates (DBP, DEHP, DEP), Cyclosiloxanes D4/D5, Triclosan/Irgasan, Phénoxyéthanol, Sels d'aluminium, Oxybenzone/Benzophénone-3, Hydroquinone, PEG et composés éthoxylés (-eth, SLES)
- Phosphates ajoutés industriellement (vieillissement accéléré, dommages vasculaires, santé rénale) :
  • Diphosphates (E450) → phosphates industriels, lié au vieillissement accéléré et dommages vasculaires (même famille que E339)
  • Polyphosphates (E452) → même problème que E450, risque cardiovasculaire
  • Pyrophosphates (E450a, E450b, E450c) → même famille phosphates ajoutés
  • Tripolyphosphate de sodium (E451) → phosphate industriel ajouté
  • Phosphates de sodium/potassium/calcium (E339, E340, E341, E343) → phosphates ajoutés industriellement
  Ces phosphates ajoutés doivent être signalés badge ORANGE (probable) — ne pas confondre avec les phosphates naturellement présents dans les aliments.
- Autres : Silice/Silica (E551) — controversé faible risque
- NON controversés (ne pas signaler) : Pectine (E440), Lécithine de tournesol (E322), Vitamine C/Acide ascorbique (E300)

🟠 INGRÉDIENTS ULTRA-TRANSFORMÉS À ÉVITER → badge_global="probable" ORANGE — ATTENTION
Pour CHACUN de ces ingrédients détectés, le message Dr. Toxi doit être : "Ingrédient artificiel ou ultra-transformé, possiblement lié au cancer selon certaines études. À éviter autant que possible."

Dès qu'UN SEUL de ces ingrédients est détecté → verdict ORANGE minimum (sauf si un Groupe 1 est présent → ROUGE prioritaire).

Amidons et dérivés industriels ultra-transformés :
- Maltodextrine → ultra-transformée, index glycémique très élevé, perturbe le microbiote
- Amidon modifié / Modified starch / Modified corn starch / Modified tapioca starch (E1404, E1412, E1422, E1450 et autres) → ultra-transformé chimiquement
- Dextrine → amidon ultra-transformé
- Sirop de riz → sucre ultra-raffiné, index glycémique élevé

Protéines et extraits industriels ultra-transformés :
- Protéines hydrolysées / Hydrolyzed proteins → ultra-transformées, contiennent souvent du glutamate libre
- Extrait de levure / Yeast extract → source de glutamate caché, ultra-transformé
- Caséinate de sodium / Sodium caseinate → protéine laitière ultra-transformée chimiquement
- Protéines de lait modifiées / Modified milk proteins → ultra-transformées
- Isolat de protéines de soja / Soy protein isolate → ultra-transformé
- Concentrat de protéines de lactosérum / Whey protein concentrate → ultra-transformé
- Jaune d'œuf modifié / Modified egg yolk → ultra-transformé
- Blanc d'œuf modifié / Modified egg white → ultra-transformé
- Crème lipolysée / Lipolyzed cream → produit laitier ultra-transformé industriellement (enzymes lipolytiques utilisées pour décomposer les graisses)

Huiles et graisses modifiées industriellement :
- Triglycérides à chaîne moyenne / MCT oil / Medium chain triglycerides → huile fractionnée/modifiée industriellement
- Huile de coco modifiée / Modified coconut oil → ultra-transformé
- Graisses interestérifiées / Interesterified fats → graisses modifiées industriellement

Huiles raffinées et graines (riches en oméga-6, inflammation, ultra-transformées) :
- Huile de canola / Canola oil / Huile de colza raffinée → oméga-6 en excès, procédé de raffinage chimique, pro-inflammatoire
- Huile de tournesol raffinée / Sunflower oil → oméga-6 en excès, pro-inflammatoire, ultra-raffinée
- Huile de pépin de raisin → très riche en oméga-6 pro-inflammatoire
- Huile de sésame raffinée → oméga-6 élevé, raffinage industriel
- Huile de soja / Soybean oil / Huile de soja raffinée → souvent OGM, oméga-6 en excès, ultra-raffinée
- Huile de maïs / Corn oil / Huile de maïs raffinée → souvent OGM, oméga-6 en excès, ultra-raffinée
- Huile de coton / Cottonseed oil → résidus de pesticides, gossypol toxique, ultra-raffinée

Enzymes non divulguées :
- Enzyme / Enzymes → origine et nature non divulguée, peut être issue d'OGM

Sucres ajoutés problématiques :
- Fructose ajouté (pur, isolé) → impact métabolique négatif, stéatose hépatique
- Sirop d'agave → très riche en fructose isolé, impact métabolique similaire au HFCS

Épaississants et gommes (troubles digestifs, perturbation du microbiote) :
- Gomme xanthane (E415) → perturbation du microbiote, ballonnements, études liées à l'inflammation intestinale
- Gomme de guar (E412) → troubles digestifs, perturbation du microbiote
- Gomme arabique (E414) → peut perturber la flore intestinale
- Gomme de caroube (E410) → troubles digestifs possibles, ultra-transformé

Arômes artificiels :
- Arômes artificiels → substances synthétiques, composition non divulguée, certaines potentiellement cancérigènes

Acides industriels :
- Acide citrique industriel (E330) → produit par fermentation Aspergillus niger, résidus de moisissures, inflammation possible. NOTE : seul l'acide citrique INDUSTRIEL (E330 ajouté) = ORANGE. L'acide citrique naturel présent dans les fruits = SAIN (ne pas signaler).

RÈGLE IMPORTANTE : Ces ingrédients reçoivent badge ORANGE (probable) — jamais rouge sauf si un Groupe 1 IARC est également présent. Classification_circ = "Non classé par le CIRC — Ultra-transformé".

⚠️ RÈGLE ABSOLUE DE DÉTECTION PAR MOTS-CLÉS ⚠️
Tout ingrédient contenant l'UN des mots suivants (en français OU en anglais) doit être AUTOMATIQUEMENT signalé comme SUBSTANCE CONTROVERSÉE avec niveau_risque="probable" 🟠 ORANGE minimum, SANS EXCEPTION :
- "modifié" / "modified" (ex: amidon modifié, jaune d'œuf modifié, modified corn starch)
- "hydrolysé" / "hydrolyzed" (ex: protéines hydrolysées, hydrolyzed soy protein)
- "isolat" / "isolate" (ex: isolat de protéines de soja, soy protein isolate)
- "concentrat" / "concentrate" (ex: concentrat de protéines, whey protein concentrate)
- "lipolysé" / "lipolyzed" (ex: crème lipolysée, lipolyzed butter oil)
- "interestérifié" / "interesterified"
- "hydrogéné" / "hydrogenated" (sauf "non hydrogéné" qui est sain)

Ces termes signalent TOUS un procédé industriel de transformation chimique/enzymatique. Même si l'ingrédient n'est pas listé explicitement ci-dessus, la présence de l'un de ces mots-clés = badge ORANGE automatique avec explication "Ingrédient ultra-transformé industriellement — procédé chimique/enzymatique altérant la matière première naturelle."

🟡 INGRÉDIENTS À CONSOMMER AVEC MODÉRATION → badge_global="possible" JAUNE
Pour CHACUN de ces ingrédients détectés, le message Dr. Toxi doit être : "Cet ingrédient peut contenir des allergènes cachés ou être issu d'un processus industriel. À consommer avec modération."

- Arômes naturels / natural flavours → composition non divulguée, peut contenir des allergènes cachés
- Huile végétale non spécifiée → inconnue, peut être huile de palme ou huile raffinée (passe en ORANGE si combinée à d'autres ingrédients ultra-transformés)

🟢 INGRÉDIENTS NATURELS SAINS — NE JAMAIS SIGNALER
Eau, Farine de blé/complète, Avoine, Riz, Sel, Vinaigre, Huile d'olive extra vierge, Huile de coco non hydrogénée, Beurre, Crème, Lait, Œufs, Levure, Bicarbonate, Légumes frais/séchés, Fruits frais/séchés, Épices naturelles, Cacao pur (PAS cadmium), Chocolat noir >70%, Noix, Amandes, Graines (chia, lin, tournesol), Protéines de lactosérum/Whey, Acide citrique naturel, Pectine, Lécithine tournesol, Vitamine C.

🟢 SUCRES NATURELS — TOUJOURS OK, NE JAMAIS SIGNALER peu importe la quantité :
- Sucre de coco, Rapadura, Muscovado, Panela, Sucre complet non raffiné
- Miel, Sirop d'érable, Sirop de datte, Sucre de datte
- Fruits frais, Fruits séchés, Purée de fruits sans sucre ajouté

🍬 RÈGLE SPÉCIALE — SUCRE BLANC RAFFINÉ (sucre, sugar, saccharose, sucre de canne raffiné, sucre inverti)
La position dans la liste d'ingrédients détermine le badge (les ingrédients sont listés par ordre de quantité décroissante) :
- 🟠 ORANGE (probable) — Si le sucre blanc raffiné est le 1er OU 2ème ingrédient listé (très grande quantité). Message Dr. Toxi : "Ce produit contient une très grande quantité de sucre raffiné. Le sucre en excès favorise l'inflammation, l'obésité et augmente le risque de cancer."
- 🟡 JAUNE (possible) — Si le sucre blanc raffiné apparaît en milieu de liste (quantité moyenne). Message : "Ce produit contient du sucre raffiné en quantité modérée. À consommer occasionnellement."
- 🟢 VERT (aucun) — Si le sucre apparaît en toute fin de liste OU si <5g de sucre par portion (quantité faible).

🟠 SUCRES ULTRA-RAFFINÉS — TOUJOURS ORANGE peu importe la quantité ou la position :
- Sirop de glucose-fructose / High Fructose Corn Syrup / HFCS
- Sirop de glucose
- Dextrose
- Sirop de maïs / Corn syrup
Message Dr. Toxi : "Sucre ultra-raffiné industriellement, impact métabolique négatif. À éviter."

═══════════════════════════════════════════════════════════════
ÉTAPE 3 — DÉTERMINE LE VERDICT FINAL (LOGIQUE COMPLÈTE)
═══════════════════════════════════════════════════════════════

Applique ces règles DANS L'ORDRE — le niveau le plus élevé l'emporte toujours :

🔴 PRODUIT CANCÉRIGÈNE — badge_global="danger"
- Déclenché dès qu'UN SEUL ingrédient ROUGE (Groupe 1 IARC) est détecté
- Le rouge écrase tout : peu importe combien d'autres ingrédients sont sains
- Dr. Toxi (resume) : "Attention ! Ce produit contient un ingrédient classé cancérigène par l'OMS. Je te déconseille fortement de le consommer régulièrement."

🟠 ATTENTION — badge_global="probable"
- Déclenché si au moins 1 ingrédient ORANGE (Groupe 2A ou ultra-transformé) est présent
- OU si 4 jaunes ou plus sont cumulés dans le produit
- Dr. Toxi (resume) : "Ce produit contient plusieurs substances controversées. Consomme-le très occasionnellement et cherche une alternative plus naturelle."

🟡 AVEC MODÉRATION — badge_global="possible"
- Déclenché si 2 ou 3 ingrédients JAUNES sont cumulés, sans aucun orange ni rouge
- Dr. Toxi (resume) : "Ce produit contient quelques ingrédients transformés. Tu peux en consommer mais évite d'en faire un aliment du quotidien."

🟢 APPROUVÉ — badge_global="aucun"
- Aucun ingrédient problématique détecté
- OU 1 seul jaune isolé avec une grande majorité d'ingrédients naturels sains
- Afficher TOUS les ingrédients avec badge vert ✅ OK pour montrer que chaque ingrédient a été vérifié
- Dr. Toxi (resume) : "Ce produit est globalement très bon. La grande majorité des ingrédients sont naturels et sains. C'est un excellent choix !"

═══════════════════════════════════════════════════════════════
RÈGLE D'AFFICHAGE — ORDRE DE substances_detectees
═══════════════════════════════════════════════════════════════
Toujours trier la liste substances_detectees dans cet ordre strict :
1. Rouges (niveau_risque="danger") en premier
2. Oranges (niveau_risque="probable") ensuite
3. Jaunes (niveau_risque="possible") ensuite
4. Verts (niveau_risque="aucun") à la fin

Ne JAMAIS cacher les jaunes quand il y a des oranges. Ne JAMAIS cacher les oranges quand il y a du rouge. TOUS les ingrédients doivent apparaître, peu importe le verdict global.

═══════════════════════════════════════════════════════════════
RÈGLE D'OR — NE PAS ÊTRE ALARMISTE
═══════════════════════════════════════════════════════════════
ToxiScan doit être honnête, factuel et bienveillant — jamais faire peur inutilement.
- Un produit avec 1 seul petit jaune isolé et une majorité d'ingrédients naturels sains reste un BON produit → verdict 🟢 APPROUVÉ
- Ne JAMAIS mettre ATTENTION ou AVEC MODÉRATION juste pour alarmer l'utilisateur
- Si les ingrédients sont majoritairement naturels (eau, farine complète, légumes, huile d'olive, œufs, etc.), le verdict doit refléter cette qualité
- L'objectif est d'informer intelligemment et avec bienveillance — pas de créer de l'anxiété alimentaire

RÈGLES ABSOLUES COMPLÉMENTAIRES :
- JAMAIS "aucun"/APPROUVÉ si huile végétale non spécifiée (quantité significative), dextrose, HFCS, sirop glucose, colorants FD&C, BHA, BHT, TBHQ, sodium benzoate, carraghénane, aspartame ou édulcorants artificiels sont présents.
- Le mot "probable" = RÉSERVÉ au Groupe 2A IARC et aux ingrédients ultra-transformés exclusivement.
- Ne jamais confondre CACAO (sain) avec CADMIUM (contaminant).
- niveau_risque (champ de substances_detectees) correspond au badge de chaque ingrédient individuel. badge_global correspond au verdict final du produit entier.

═══════════════════════════════════════════════════════════════
ÉTAPE 4 — RETOURNE LE JSON STRUCTURÉ
═══════════════════════════════════════════════════════════════

Remplis TOUS les champs :
- objet_identifie : Nom exact marque + produit lu sur l'emballage
- categorie_produit : food | beverage | cosmetic | household | other
- badge_global : danger | probable | possible | aucun
- niveau_risque : identique à badge_global
- resume : explication courte et claire en français standard (3-4 phrases max)
- substances_detectees : liste avec nom, code E, classification_circ (Groupe 1 | Groupe 2A | Groupe 2B | Controversé | Non classé par le CIRC), explication simple, source_exposition
- recommandations : conseils pratiques concrets
- alternatives_saines : 2-3 alternatives concrètes du même type selon pays utilisateur (Québec=ATTITUDE/Druide/Oneka ; France=Ecover/L'Arbre Vert/Cattier/Coslys)
- materiau_detecte : ""
- erreur : null (ou "Photo illisible. Veuillez reprendre." si floue)

EXEMPLES :
- Baguettes Grissol (huile végétale + dextrose + silice) → "possible" JAUNE
- Jambon avec nitrites E250 → "danger" ROUGE
- Coca-Cola (caramel E150d + acide phosphorique) → "possible" JAUNE min
- Nutella (huile de palme + sucre excès) → "possible" JAUNE min
- Eau minérale plate → "aucun" VERT

═══════════════════════════════════════════════════════════════
SECTION SPÉCIALE — PRODUITS COSMÉTIQUES (categorie_produit="cosmetic")
═══════════════════════════════════════════════════════════════

Si le produit est un cosmétique (crème, shampoing, maquillage, déodorant, vernis, teinture, crème solaire, dentifrice, parfum, produit bébé, etc.), applique EN PLUS les règles suivantes basées sur la base ToxiScan Cosmétiques V1 (Avril 2026 — sources IARC, EWG, ANSES, EFSA, FDA, Commission Européenne).

🔴 COSMÉTIQUES CANCÉRIGÈNES CONFIRMÉS (Groupe 1 IARC) → badge_global="danger" ROUGE
- Formaldéhyde / Formalin / Methylene glycol → vernis, lissages kératine, colles cils
- Libérateurs de formaldéhyde : DMDM Hydantoin, Quaternium-15, Diazolidinyl Urea, Imidazolidinyl Urea, Sodium Hydroxymethylglycinate, Bronopol → lotions, shampoings, produits bébé
- Benzène (contaminant dry shampoos, déodorants aérosols) → FDA recalls 2022-2023
- Talc contaminé à l'amiante (si non certifié asbestos-free) → poudres, fonds de teint, talc corporel, talc bébé. IMPORTANT : talc certifié asbestos-free = SAIN
- Para-phénylènediamine (PPD) / Resorcinol → teintures capillaires permanentes, henné noir
- Mercure / Thimerosal / Mercurio → crèmes éclaircissantes illégales, certains mascaras

🟠 COSMÉTIQUES PROBABLEMENT CANCÉRIGÈNES (Groupe 2A IARC) → badge_global="probable" ORANGE
- Nitrosamines (formation via DEA/TEA/MEA + conservateurs nitrosants) → mousses à raser, shampoings
- Huiles minérales raffinées (MOSH/MOAH) : Paraffinum Liquidum, Petrolatum, Mineral Oil, Cera Microcristallina → rouges à lèvres, baumes, crèmes bébé

🟡 COSMÉTIQUES POSSIBLEMENT CANCÉRIGÈNES (Groupe 2B IARC) → badge_global="possible" JAUNE
- Dioxyde de titane nanoparticules (Titanium Dioxide [nano]) → crèmes solaires, fonds de teint, poudres
- 1,4-Dioxane (contaminant produits éthoxylés, non listé) → présent si PEG, SLES, -eth dans la formule
- BHA / Butylated Hydroxyanisole → rouges à lèvres, maquillage
- Carbon Black / CI 77266 → mascaras, eye-liners, fards noirs

🟠 PERTURBATEURS ENDOCRINIENS COSMÉTIQUES → badge_global="probable" ORANGE si 2+, "possible" JAUNE si isolé
- Parabènes : Methylparaben, Ethylparaben, Propylparaben, Butylparaben, Isobutylparaben (INTERDIT UE), Isopropylparaben (INTERDIT UE)
- Phtalates : Dibutyl Phthalate/DBP, Diethylhexyl Phthalate/DEHP, Diethyl Phthalate/DEP (souvent cachés sous "Fragrance") — CMR reprotoxique, INTERDITS UE cosmétiques
- Cyclosiloxanes : Cyclopentasiloxane/D5, Cyclotetrasiloxane/D4 (INTERDIT UE rinçage), Cyclomethicone
- Triclosan / Irgasan → dentifrices, déodorants antibactériens
- Phénoxyéthanol → crèmes, démaquillants. INTERDIT France produits bébé <3 ans
- PFAS : PTFE, Perfluorooctyl Triethoxysilane, tout ingrédient "perfluoro-" ou "polyfluoro-" → fonds de teint longue tenue, mascaras waterproof
- Sels d'aluminium : Aluminum Chlorohydrate, Aluminum Zirconium Tetrachlorohydrex, Alum → antiperspirants
- Filtres UV chimiques : Oxybenzone/Benzophenone-3, Octinoxate/Ethylhexyl Methoxycinnamate, Homosalate, Octisalate → crèmes solaires
- Fragrance / Parfum synthétique → cache jusqu'à 300+ substances dont phtalates et muscs
- Hydroquinone (INTERDITE UE/Canada) → crèmes dépigmentantes
- PEG / Composés éthoxylés (PEG-xx, Polyethylene Glycol, -eth, SLES/Sodium Laureth Sulfate) → contamination 1,4-dioxane possible
- Acide salicylique >0.5% (CMR 2 reprotoxique, INTERDIT UE >0.5%) → produits anti-acné, exfoliants

🩷 DANGER GROSSESSE — À signaler dans resume ET recommandations
Si le produit cosmétique contient l'UN de ces ingrédients, AJOUTE en début de resume : "⚠️ DANGER GROSSESSE : " puis l'alerte, ET ajoute en première recommandation : "Ce produit contient des substances déconseillées ou interdites pendant la grossesse et l'allaitement. Consulte un professionnel de santé avant utilisation."
- Phtalates (DBP, DEHP, DEP)
- Cyclosiloxanes D4, D5
- Acide salicylique >0.5%
- PFAS (tout composé perfluoro/polyfluoro)
- Mercure, Thimerosal
- Formaldéhyde et libérateurs (DMDM Hydantoin, Quaternium-15, etc.)
- Parabènes Isobutylparaben, Isopropylparaben
- Hydroquinone
- Oxybenzone (filtre UV chimique)
- Retinol / Rétinyl palmitate (vitamine A haute concentration)

RÈGLES COSMÉTIQUES SPÉCIFIQUES :
- "Fragrance" ou "Parfum" seul = badge JAUNE minimum (controversé, masque souvent phtalates)
- Talc NON contaminé amiante (certifié asbestos-free) = SAIN, ne pas signaler
- BHT (E321) seul en cosmétique = Groupe 3 IARC, PAS cancérigène — badge controversé uniquement si combiné à d'autres
- PEG seuls = pas cancérigènes, mais mentionner risque contamination 1,4-dioxane
- Effet cocktail : si 3+ perturbateurs endocriniens cumulés en cosmétique → passer en ORANGE minimum
- Alternatives cosmétiques à suggérer : marques clean comme ATTITUDE (Québec), Druide, Oneka, Cattier (France), Coslys, Weleda, Cozie, Logona, certifications EcoCert/Cosmos/EWG Verified

LANGUE ET TON :
- TOUJOURS français standard (pas québécois)
- Ton bienveillant et clair — pas alarmiste, pas clinique
- Jamais de diagnostic médical. Factuel.`;

async function tryGenerateUniversalAnalysis(imageBase64: string, openFactsContext?: string): Promise<UniversalAnalysisResult> {
  console.log('[API] Calling OpenAI (gpt-4o) for universal analysis...');
  if (openFactsContext) {
    console.log('[API] Including Open Food Facts data in analysis prompt');
  }

  const regionPrompt = getAnalysisRegionPrompt();
  const systemParts: string[] = [UNIVERSAL_ANALYSIS_PROMPT, regionPrompt];
  if (openFactsContext) {
    systemParts.push('\n\n' + openFactsContext);
    systemParts.push('\nIMPORTANT : Tu as reçu des données Open Food Facts pour ce produit. Utilise la LISTE COMPLÈTE des ingrédients fournie par Open Food Facts pour une analyse plus précise. Croise ces données avec ta propre analyse visuelle de la photo. Si tu détectes des ingrédients sur la photo qui ne sont pas dans Open Food Facts, ajoute-les. Si Open Food Facts liste des additifs que tu ne vois pas sur la photo, inclus-les quand même car la base de données est fiable. Ta PRIORITÉ reste de chercher les substances cancérigènes et toxiques de notre base Dr.Toxi.');
  }

  const result = await aiGenerateObject({
    system: systemParts.join(''),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyse cette photo. 1) Lis la marque et le nom du produit visible sur l\'emballage et mets-le dans objet_identifie (jamais vide). 2) Détermine la catégorie correcte (food pour tout aliment solide, beverage pour boisson, etc.). 3) Lis TOUS les ingrédients visibles sur l\'étiquette et ajoute UNE ENTRÉE POUR CHACUN dans substances_detectees — y compris les ingrédients sains (eau, sel, farine, légumes, etc.) avec niveau_risque="aucun". N\'omets AUCUN ingrédient. Si tu vois 12 ingrédients, tu dois retourner 12 entrées. 4) Retourne le résultat structuré complet.' },
          { type: 'image', image: imageBase64 },
        ],
      },
    ],
    schema: universalAnalysisSchema,
    toolName: 'record_analysis',
    toolDescription: 'Enregistre l\'analyse structurée du produit scanné.',
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
            { type: 'text', text: 'Regarde cette photo d\'un produit. Retourne : 1) le code-barres (EAN-13, EAN-8, UPC-A, UPC-E) si visible et lisible — sinon null. 2) le NOM DU PRODUIT tel qu\'il est imprimé sur l\'emballage (ex: "Fils Extra", "Nutella", "Coca-Cola Zero") dans product_name_visible. 3) la MARQUE si visible (ex: "LU", "Ferrero", "Coca-Cola") dans brand_visible. Lis ce qui est écrit sur l\'emballage, même sans code-barres. Si rien n\'est lisible, mets null.' },
            { type: 'image', image: imageBase64 },
          ],
        },
      ],
      schema: preDetectionSchema,
      toolName: 'record_pre_detection',
      toolDescription: 'Enregistre le code-barres et le nom du produit détectés sur la photo.',
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
