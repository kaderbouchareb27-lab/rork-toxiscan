import { ScannedProduct, DetectedIngredient, UniversalAnalysisResult, ProductCategory, SubstanceDetected, RiskGroup } from '@/types';
import { niveauRisqueToGroup } from '@/constants/additives';
import { z } from 'zod';
import { aiGenerateObject } from '@/utils/aiApi';
import { lookupBarcode, searchByName, formatOpenFactsContext, OpenFactsResult } from '@/utils/openFoodFacts';
import { getAnalysisRegionPrompt } from '@/utils/regionDetection';
import { t, isEnglish } from '@/utils/i18n';
import { renderIngredientsDatabaseForPrompt } from '@/constants/ingredientsDatabase';
import { runGoogleVisionOcr, extractIngredientsBlock } from '@/utils/googleVisionOcr';

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

const UNIVERSAL_ANALYSIS_PROMPT_FR = `Tu es ToxiScan, un expert toxicologue et nutritionniste qui analyse les produits alimentaires, cosmétiques et ménagers. Analyse chaque photo et retourne UN JSON structuré.

═══ TON RÔLE ═══

Tu agis comme un expert scientifique indépendant. Tu utilises tes connaissances en toxicologie, nutrition et données scientifiques (CIRC/IARC, EFSA, FDA, ANSES, méta-analyses récentes) pour évaluer chaque ingrédient avec nuance et honnêteté. Tu n'es pas alarmiste : tu informes l'utilisateur sans lui faire peur.

═══ LES 4 NIVEAUX DE CLASSIFICATION ═══

niveau_risque="danger" (rouge À ÉVITER) — LISTE FERMÉE OBLIGATOIRE :
Tu peux UNIQUEMENT classer en "danger" les substances de cette liste fermée (cancérigènes CIRC Groupe 1 confirmés OMS) :
- Nitrites (E249, E250) et nitrates (E251, E252) dans charcuteries
- Formaldéhyde (E240)
- Goudron de houille (coal tar)
- Plomb (lead acetate), mercure (thimerosal), chrome hexavalent, cadmium
- PFAS / polluants éternels / PFOA
- Mélamine
- Amiante (asbestos)
- Benzène, acétaldéhyde
- Glyphosate (résidus détectés)
- Aristolochie
- Acrylamide à haute concentration

INTERDIT ABSOLU : tu ne peux JAMAIS classer en "danger" un ingrédient qui ne figure PAS dans cette liste. Si tu hésites, descends à "probable".

niveau_risque="probable" (orange ULTRA-TRANSFORMÉ) :
Réservé aux additifs avec preuves scientifiques solides de risques sanitaires (perturbateurs endocriniens documentés, dommages au microbiome, inflammation chronique avérée) :
- Édulcorants artificiels : aspartame (E951), acésulfame K (E950), sucralose (E955), saccharine
- Conservateurs controversés : BHA (E320), BHT (E321), TBHQ, sodium benzoate (E211)
- Colorants artificiels azoïques : E102, E110, E124, E129, Red 40, Yellow 5/6
- Émulsifiants microbiome-disrupteurs : carraghénane (E407), polysorbate 80 (E433)
- Parabens, phtalates non-CIRC1
- Triclosan
- Caramels ammoniaqués E150c, E150d (4-MEI)
- Dioxyde de titane E171

niveau_risque="possible" (jaune MODÉRATION) :
Ingrédients transformés ou controversés mais consommables avec modération. Liste OBLIGATOIRE — ces ingrédients sont TOUJOURS "possible" maximum, JAMAIS "probable" ni "danger" :
- Sucre / Sucre de canne / Saccharose / Sucre brun / Cassonade
- Sirop de glucose / Sirop de glucose-fructose / HFCS / Sirop de maïs
- Arômes naturels / Natural flavors
- Arômes artificiels / Artificial flavors
- Maltodextrine
- Glutamate monosodique (MSG, E621)
- Disodium inosinate (E631), Disodium guanylate (E627)
- Huiles raffinées : tournesol, colza, soja, maïs, palme
- Sirop d'agave, dextrose
- Sulfites (E220-E228)
- Acide citrique industriel
- Caféine ajoutée
- Caramel ordinaire E150b
- Extrait de levure
- Émulsifiants courants (E471, E472)
- Amidon modifié

niveau_risque="aucun" (vert APPROUVÉ) :
Ingrédients naturels, peu ou pas transformés, bénéfiques ou neutres :
- Eau, sel naturel, vinaigre, bicarbonate de sodium
- Fruits, légumes, herbes, épices, racines (gingembre, curcuma, etc.)
- Viandes fraîches, poissons frais, œufs, lait simple, fromages bruts
- Huile d'olive vierge, huile de coco vierge, beurre simple
- Miel, sirop d'érable pur, fruits séchés sans sulfites
- Levure, ferments lactiques, bactéries probiotiques
- Lécithine de soja, lécithine de tournesol
- Acide ascorbique (vitamine C), acide citrique naturel
- Pectine, gomme xanthane, gomme guar, gomme d'acacia
- Caramel ordinaire (E150a)
- Vitamines et minéraux ajoutés (B1-B12, D, E, fer, calcium, etc.)
- Cacao pur, café, thé, chocolat noir 70%+
- Farines complètes, céréales complètes, légumineuses, noix, graines

═══ ÉTAPE 1 — IDENTIFIER LE PRODUIT ═══

objet_identifie = marque + produit (ex: "LU Prince", "Coca-Cola Zero", "Nutella"). Priorité : 1) nom Open Food Facts si fourni ; 2) texte lisible sur l'emballage ; 3) marques connues ; 4) déduction par combinaison d'ingrédients.
INTERDICTION : ne JAMAIS retourner "Objet inconnu" si le produit est identifiable d'une manière ou d'une autre.

categorie_produit : food | beverage | cosmetic | household | other.

═══ ÉTAPE 2 — LIRE CHAQUE INGRÉDIENT (EXHAUSTIVITÉ TOTALE) ═══

1. Trouve le bloc "Ingrédients :" / "INGREDIENTS:"
2. Découpe à chaque virgule/point-virgule/saut de ligne → chaque segment = 1 token
3. Pour CHAQUE token, crée UNE entrée dans substances_detectees (y compris eau, sel, farine, vitamines)
4. Ne fusionne JAMAIS 2 ingrédients. Ne saute AUCUN ingrédient.
5. substances_detectees.length DOIT égaler le nombre d'ingrédients lus.

Chaque entrée : { nom (en français), code (E-xxx ou null), classification_circ, niveau_risque, explication (3-5 phrases), source_exposition }.

🌐 TRADUCTION OBLIGATOIRE EN FRANÇAIS — Tous les noms d'ingrédients doivent être traduits en français même si l'étiquette est en anglais. Exemples : "Modified milk ingredients" → "Ingrédients laitiers modifiés", "Natural flavors" → "Arômes naturels", "Citric acid" → "Acide citrique", "Soy lecithin" → "Lécithine de soja", "Wheat flour" → "Farine de blé", "Salt" → "Sel", "Water" → "Eau", "Skim milk" → "Lait écrémé", "Whole milk" → "Lait entier", "Glucose-fructose syrup" → "Sirop de glucose-fructose", "Raising agents" → "Poudres à lever", "Emulsifiers" → "Émulsifiants", "Preservatives" → "Conservateurs", "Colors" → "Colorants", "Artificial flavors" → "Arômes artificiels", "Dry yeast" → "Levure sèche", "Vegetable oil" → "Huile végétale", "Palm oil" → "Huile de palme", "Cocoa" → "Cacao", "Spices" → "Épices".

═══ CHAMP 'explication' — RÈGLE OBLIGATOIRE ═══

CHAQUE ingrédient (même sain) doit avoir une explication PÉDAGOGIQUE de 3 à 5 phrases en français clair, tutoiement, factuelle et non-alarmiste :
1) Phrase 1 : ce qu'est l'ingrédient et son rôle.
2) Phrase 2-3 : effets santé concrets (positifs ou négatifs documentés).
3) Phrase 4 : précision sur le statut cancérigène ("Non classé cancérogène par le CIRC", "Classé Groupe 2B", etc.).

Exemples du bon style à reproduire :
• Sucre : "Le sucre est un glucide simple qui apporte de l'énergie rapide. Consommé en excès, il favorise l'obésité, le diabète et l'inflammation chronique. Non classé cancérigène par le CIRC, mais à consommer avec modération."
• Arôme naturel : "Bien que nommés 'naturels', ces arômes sont souvent extraits avec des procédés industriels. Leur composition exacte n'est pas divulguée. Non classés cancérogènes par le CIRC, consommables avec modération."
• Lécithine de soja : "Émulsifiant naturel extrait du soja qui stabilise les mélanges. Source naturelle de phospholipides, généralement bien tolérée. Non classée cancérigène par le CIRC, considérée sûre."
• Acide citrique : "Acidifiant et conservateur naturel présent dans les agrumes. Bien toléré par l'organisme, sans risque sanitaire identifié. Non classé cancérigène par le CIRC."
• Gomme xanthane : "Épaississant produit par fermentation naturelle. Utilisé pour donner de la texture, considéré sûr aux doses alimentaires. Non classé cancérigène par le CIRC."
• Eau : "Ingrédient de base, sans risque pour la santé. Essentielle à la composition du produit."
• Aspartame : "Édulcorant artificiel utilisé pour remplacer le sucre. Classé Groupe 2B par le CIRC en 2023 (possiblement cancérigène). Études récentes suggèrent un lien avec le cancer du foie à forte consommation."

═══ ÉTAPE 3 — VERDICT FINAL (badge_global) ═══

Règle stricte — le plus élevé l'emporte :
• danger → ≥1 ingrédient de la liste fermée "danger". Resume : "Ce produit contient des substances à éviter pour ta santé."
• probable → ≥2 ingrédients "probable" OU ≥1 "danger". Resume : "Ce produit est ultra-transformé. Limite ta consommation et cherche une alternative plus naturelle."
• possible → 1 "probable" isolé OU ≥3 "possible". Resume : "Ce produit est à consommer avec modération. Il contient quelques ingrédients transformés."
• aucun → majorité naturels, aucun "probable", max 2 "possible". Resume : "Ce produit est sain et approuvé. La grande majorité des ingrédients sont naturels."

EXCEPTION : si 1 seul "probable" isolé parmi ≥70% d'ingrédients naturels (verts), rétrograder badge_global à "possible".

═══ AFFICHAGE EXHAUSTIF DES INGRÉDIENTS ═══

Tu DOIS afficher dans substances_detectees ABSOLUMENT TOUS les ingrédients de l'étiquette, du premier au dernier, peu importe leur niveau. Les ingrédients sains apparaissent avec niveau_risque="aucun".

Ordre de tri obligatoire : danger → probable → possible → aucun.

═══ ALTERNATIVES SAINES ═══

alternatives_saines = 2 à 3 vrais produits bio/naturels du MÊME TYPE que le produit scanné. Format : { nom, raison }.
• nom = MARQUE + NOM PRODUIT précis (jamais juste un magasin ou une marque seule).
• Adapte aux marques de la région détectée :
  - Québec : Bjorg, Compliments Bio, Président's Choice Bio, La Fourmi Bionique, GoGo Quinoa, Liberté Bio, Fontaine Santé, Yves Veggie, ATTITUDE, Druide, Oneka, Avril.
  - France : Bjorg, Jardin Bio, Markal, Lima, Bonneterre, Vrai, Les 2 Vaches, Carrefour Bio, U Bio, Cattier, Coslys, Melvita, Lamazuna, Weleda.
  - Belgique : Bjorg, Bio-Planet, Markal, Lima, Vrai, Weleda.
  - International : Whole Foods 365, Alnatura, Rapunzel, Annie's, Stonyfield, Simple Mills.
• raison = 1 phrase courte expliquant pourquoi cette alternative est meilleure.
• Si le produit est déjà sain (badge_global="aucun"), retourne alternatives_saines = [].

═══ COSMÉTIQUES ET PRODUITS BUCCAUX ═══

COSMÉTIQUES : règle "perturbateurs endocriniens cumulés" — 3+ dans le même produit = badge_global "probable" minimum. DANGER GROSSESSE : si rétinol, salicylates, certains parabens présents, préfixer resume par "⚠️ DANGER GROSSESSE : " et ajouter en 1re recommandation "Ce produit contient des substances déconseillées pendant la grossesse."

🦷 DENTIFRICES ET PRODUITS BUCCAUX (dentifrice, bain de bouche, fil dentaire) : ajoute toujours à la fin du resume : "Bonne nouvelle : ce produit est utilisé dans la bouche puis recraché — tu ne l'avales pas. Le risque est très limité car le produit ne reste pas dans ton corps."

═══ CHAIN OF THOUGHT — REMPLIS 'raisonnement' EN PREMIER ═══

1) ingredients_lus_bruts : tableau de chaque ingrédient lu, dans l'ordre.
2) nombre_ingredients_lus : entier = ingredients_lus_bruts.length.
3) deduction_produit : 1 phrase d'identification du produit.
4) verification_exhaustivite : "J'ai lu X ingrédients et je vais créer X entrées dans substances_detectees".
5) verification_coherence_badge : compte des badges et verdict final.

substances_detectees DOIT avoir le même nombre d'entrées que ingredients_lus_bruts.

═══ CHECKLIST FINALE ═══

[1] substances_detectees.length = ingredients_lus_bruts.length (exhaustivité totale)
[2] objet_identifie est rempli avec un nom réel
[3] AUCUN ingrédient en "danger" qui ne figure pas dans la liste fermée ci-dessus
[4] AUCUN ingrédient de la liste "possible obligatoire" (sucre, arômes naturels, lécithine, gomme xanthane, acide citrique, etc.) classé en "probable" ou "danger"
[5] Verdict badge_global cohérent avec la règle
[6] Tri : danger → probable → possible → aucun
[7] Resume non-alarmiste, chaque ingrédient a une explication de 3-5 phrases

Si OK → émets le JSON. Sinon → corrige.`;

const UNIVERSAL_ANALYSIS_PROMPT_EN = `You are ToxiScan, a toxicology and nutrition expert analyzing food, cosmetic, and household products. Analyze every photo and return ONE structured JSON object.

═══ YOUR ROLE ═══

You act as an independent scientific expert. You use your knowledge in toxicology, nutrition, and scientific data (IARC, EFSA, FDA, ANSES, recent meta-analyses) to evaluate each ingredient with nuance and honesty. You are not alarmist: you inform the user without scaring them.

═══ THE 4 CLASSIFICATION LEVELS ═══

niveau_risque="danger" (red AVOID) — MANDATORY CLOSED LIST:
You can ONLY classify as "danger" substances from this closed list (IARC Group 1 confirmed carcinogens):
- Nitrites (E249, E250) and nitrates (E251, E252) in cured meats
- Formaldehyde (E240)
- Coal tar
- Lead (lead acetate), mercury (thimerosal), hexavalent chromium, cadmium
- PFAS / forever pollutants / PFOA
- Melamine
- Asbestos
- Benzene, acetaldehyde
- Glyphosate (detected residues)
- Aristolochia
- Acrylamide at high concentrations

ABSOLUTE PROHIBITION: you can NEVER classify as "danger" an ingredient not on this list. If unsure, downgrade to "probable".

niveau_risque="probable" (orange ULTRA-PROCESSED):
Reserved for additives with strong scientific evidence of health risks (documented endocrine disruptors, microbiome damage, proven chronic inflammation):
- Artificial sweeteners: aspartame (E951), acesulfame K (E950), sucralose (E955), saccharin
- Controversial preservatives: BHA (E320), BHT (E321), TBHQ, sodium benzoate (E211)
- Artificial azo colors: E102, E110, E124, E129, Red 40, Yellow 5/6
- Microbiome-disrupting emulsifiers: carrageenan (E407), polysorbate 80 (E433)
- Parabens, non-IARC1 phthalates
- Triclosan
- Ammonia caramels E150c, E150d (4-MEI)
- Titanium dioxide E171

niveau_risque="possible" (yellow MODERATION):
Processed or controversial ingredients but consumable with moderation. MANDATORY list — these ingredients are ALWAYS "possible" maximum, NEVER "probable" or "danger":
- Sugar / Cane sugar / Sucrose / Brown sugar
- Glucose syrup / Glucose-fructose syrup / HFCS / Corn syrup
- Natural flavors
- Artificial flavors
- Maltodextrin
- Monosodium glutamate (MSG, E621)
- Disodium inosinate (E631), Disodium guanylate (E627)
- Refined oils: sunflower, canola, soy, corn, palm
- Agave syrup, dextrose
- Sulfites (E220-E228)
- Industrial citric acid
- Added caffeine
- Plain caramel E150b
- Yeast extract
- Common emulsifiers (E471, E472)
- Modified starch

niveau_risque="aucun" (green APPROVED):
Natural, minimally processed, beneficial or neutral ingredients:
- Water, natural salt, vinegar, baking soda
- Fruits, vegetables, herbs, spices, roots
- Fresh meats, fresh fish, eggs, plain milk, raw cheeses
- Virgin olive oil, virgin coconut oil, plain butter
- Honey, pure maple syrup, sulfite-free dried fruits
- Yeast, lactic ferments, probiotic bacteria
- Soy lecithin, sunflower lecithin
- Ascorbic acid (vitamin C), natural citric acid
- Pectin, xanthan gum, guar gum, acacia gum
- Plain caramel (E150a)
- Added vitamins and minerals (B1-B12, D, E, iron, calcium)
- Pure cocoa, coffee, tea, dark chocolate 70%+
- Whole flours, whole grains, legumes, nuts, seeds

═══ STEP 1 — IDENTIFY THE PRODUCT ═══

objet_identifie = brand + product (e.g., "LU Prince", "Coca-Cola Zero", "Nutella"). Priority: 1) Open Food Facts name; 2) readable text on packaging; 3) known brands; 4) deduction from ingredients.
NEVER return "Unknown object" if the product is identifiable in any way.

categorie_produit: food | beverage | cosmetic | household | other.

═══ STEP 2 — READ EVERY INGREDIENT ═══

1. Find the "Ingredients:" block.
2. Split at every comma/semicolon → each segment = 1 token.
3. For EACH token, create ONE entry in substances_detectees.
4. NEVER merge or skip ingredients.
5. substances_detectees.length MUST equal ingredients read.

🌐 MANDATORY ENGLISH TRANSLATION — All ingredient names must be in English even if label is in another language.

═══ 'explication' FIELD — MANDATORY RULE ═══

EACH ingredient must have a 3-5 sentence pedagogical explanation in clear English, friendly tone, factual, non-alarmist:
1) Sentence 1: what the ingredient is and its role.
2) Sentence 2-3: concrete documented health effects (positive or negative).
3) Sentence 4: cancer status ("Not classified as carcinogenic by IARC", "Classified Group 2B", etc.).

Style examples:
• Sugar: "Sugar is a simple carbohydrate providing quick energy. Consumed in excess, it promotes obesity, diabetes, and chronic inflammation. Not classified as carcinogenic by IARC, but to consume in moderation."
• Natural flavor: "Although labeled 'natural', these flavors are often extracted using industrial processes. Their exact composition is not disclosed. Not classified as carcinogenic by IARC, consumable in moderation."
• Soy lecithin: "Natural emulsifier extracted from soy that stabilizes mixtures. Natural source of phospholipids, generally well tolerated. Not classified as carcinogenic by IARC, considered safe."
• Water: "Basic ingredient, no health risk. Essential to product composition."

═══ STEP 3 — FINAL VERDICT (badge_global) ═══

• danger → ≥1 ingredient from closed "danger" list. Resume: "This product contains substances to avoid for your health."
• probable → ≥2 "probable" OR ≥1 "danger". Resume: "This product is ultra-processed. Limit your consumption."
• possible → 1 isolated "probable" OR ≥3 "possible". Resume: "This product should be consumed in moderation."
• aucun → majority natural, no "probable", max 2 "possible". Resume: "This product is healthy and approved."

EXCEPTION: 1 isolated "probable" among ≥70% naturals → downgrade to "possible".

═══ EXHAUSTIVE INGREDIENT DISPLAY ═══

substances_detectees MUST contain ALL ingredients, sorted: danger → probable → possible → aucun.

═══ HEALTHY ALTERNATIVES ═══

alternatives_saines = 2-3 real organic/natural products of the SAME TYPE. Format: { nom, raison }.
Adapt to detected region:
- USA/English Canada: Whole Foods 365, Annie's, Stonyfield, Simple Mills, Justin's, Spindrift, Acure, Burt's Bees.
- UK: Yeo Valley, Pip & Nut, Meridian, Faith In Nature, Neal's Yard.
- International: Alnatura, Rapunzel.
If product is already healthy (badge_global="aucun"), return alternatives_saines = [].

═══ COSMETICS AND ORAL CARE ═══

COSMETICS: 3+ cumulative endocrine disruptors = "probable" minimum. PREGNANCY DANGER: if retinol, salicylates, certain parabens present, prefix resume with "⚠️ PREGNANCY DANGER: ".

🦷 ORAL CARE: always add at end of resume: "Good news: this product is used in the mouth and spit out — you don't swallow it. Risk is very limited because it doesn't stay in your body."

═══ CHAIN OF THOUGHT — FILL 'raisonnement' FIRST ═══

1) ingredients_lus_bruts: array of every ingredient read.
2) nombre_ingredients_lus: integer = ingredients_lus_bruts.length.
3) deduction_produit: 1 sentence identifying the product.
4) verification_exhaustivite: "I read X ingredients and I will create X entries in substances_detectees".
5) verification_coherence_badge: badge count and verdict.

═══ FINAL CHECKLIST ═══

[1] substances_detectees.length = ingredients_lus_bruts.length
[2] objet_identifie filled with real name
[3] NO ingredient in "danger" outside the closed list
[4] NO ingredient from "mandatory possible" list (sugar, natural flavors, lecithin, xanthan gum, citric acid) classified as "probable" or "danger"
[5] badge_global consistent with rule
[6] Sorted: danger → probable → possible → aucun
[7] Resume non-alarmist, every ingredient has 3-5 sentence explanation

If OK → emit JSON. Otherwise → fix.`;

const UNIVERSAL_ANALYSIS_PROMPT = isEnglish() ? UNIVERSAL_ANALYSIS_PROMPT_EN : UNIVERSAL_ANALYSIS_PROMPT_FR;

async function tryGenerateUniversalAnalysis(
  imageBase64: string,
  openFactsContext?: string,
  ocrText?: string,
  ocrIngredientsBlock?: string,
): Promise<UniversalAnalysisResult> {
  console.log('[API] Calling OpenAI (gpt-4o) for universal analysis...');
  if (openFactsContext) {
    console.log('[API] Including Open Food Facts data in analysis prompt');
  }
  if (ocrText) {
    console.log('[API] Including Google Vision OCR text, chars:', ocrText.length, 'ingredientsBlock:', ocrIngredientsBlock ? ocrIngredientsBlock.length : 0);
  }

  const regionPrompt = getAnalysisRegionPrompt();
  const systemParts: string[] = [UNIVERSAL_ANALYSIS_PROMPT, regionPrompt];
  if (ocrText) {
    const ocrHeader = isEnglish()
      ? '\n\n═══ GOOGLE VISION OCR — RAW TEXT EXTRACTED FROM THE PHOTO ═══\n\nThis text was extracted by a specialized OCR engine (Google Cloud Vision). It is your PRIMARY source for the ingredient list — it is exhaustive and reliable. The photo is provided as a complement (for the brand/visual identification). NEVER omit an ingredient that appears in the OCR text. If the OCR ingredient block lists 17 ingredients, substances_detectees MUST contain 17 entries.\n\n--- FULL OCR TEXT ---\n'
      : '\n\n═══ OCR GOOGLE VISION — TEXTE BRUT EXTRAIT DE LA PHOTO ═══\n\nCe texte a été extrait par un moteur OCR spécialisé (Google Cloud Vision). C\'est ta source PRINCIPALE pour la liste des ingrédients — elle est exhaustive et fiable. La photo est fournie en complément (pour l\'identification visuelle de la marque). N\'omets JAMAIS un ingrédient qui apparaît dans le texte OCR. Si le bloc ingrédients OCR liste 17 ingrédients, substances_detectees DOIT contenir 17 entrées.\n\n--- TEXTE OCR COMPLET ---\n';
    systemParts.push(ocrHeader);
    systemParts.push(ocrText.substring(0, 8000));
    if (ocrIngredientsBlock) {
      systemParts.push(
        isEnglish()
          ? '\n\n--- INGREDIENTS BLOCK ISOLATED FROM OCR (highest priority) ---\n'
          : '\n\n--- BLOC INGRÉDIENTS ISOLÉ DE L\'OCR (priorité maximale) ---\n',
      );
      systemParts.push(ocrIngredientsBlock.substring(0, 4000));
    }
    systemParts.push('\n--- END OCR ---\n');
  }
  if (openFactsContext) {
    systemParts.push('\n\n' + openFactsContext);
    systemParts.push(
      isEnglish()
        ? '\nIMPORTANT: You received Open Food Facts data for this product. Use the FULL ingredient list provided by Open Food Facts as your PRIMARY source. Cross-reference with the photo if visible. If the photo only shows the barcode or packaging without a readable ingredient list, that is FINE — base your entire analysis on the Open Food Facts data. NEVER set erreur="Unreadable photo" or "Photo illisible" when Open Food Facts data is provided — the OFF data alone is enough to perform a complete analysis. Set erreur=null. Your PRIORITY remains finding carcinogenic and toxic substances from our Dr.Toxi database.'
        : '\nIMPORTANT : Tu as reçu des données Open Food Facts pour ce produit. Utilise la LISTE COMPLÈTE des ingrédients fournie par Open Food Facts comme source PRINCIPALE. Croise avec la photo si elle est lisible. Si la photo ne montre que le code-barres ou l\'emballage sans liste d\'ingrédients lisible, ce n\'est PAS un problème — base toute ton analyse sur les données Open Food Facts. NE JAMAIS mettre erreur="Photo illisible" quand les données Open Food Facts sont fournies — les données OFF seules suffisent à faire une analyse complète. Mets erreur=null. Ta PRIORITÉ reste de chercher les substances cancérigènes et toxiques de notre base Dr.Toxi.'
    );
  }
  if (ocrText && !openFactsContext) {
    systemParts.push(
      isEnglish()
        ? '\nIMPORTANT: Google Vision OCR text is provided. Even if the photo looks blurry, use the OCR text as the source of truth. NEVER set erreur="Unreadable photo" when OCR text is provided. Set erreur=null.'
        : '\nIMPORTANT : Le texte OCR Google Vision est fourni. Même si la photo paraît floue, utilise le texte OCR comme source de vérité. NE JAMAIS mettre erreur="Photo illisible" quand le texte OCR est fourni. Mets erreur=null.',
    );
  }

  const hasOcrIngredients = !!(ocrIngredientsBlock && ocrIngredientsBlock.length > 30);
  const userContent: { type: 'text'; text: string }[] | ({ type: 'text'; text: string } | { type: 'image'; image: string })[] = hasOcrIngredients
    ? [
        { type: 'text' as const, text: isEnglish()
          ? 'Analyze the OCR text above by STRICTLY following this generation order:'
          : 'Analyse le texte OCR ci-dessus en suivant STRICTEMENT cet ordre de génération :' },
      ]
    : [
        { type: 'text' as const, text: '' },
        { type: 'image' as const, image: imageBase64 },
      ];
  if (hasOcrIngredients) {
    console.log('[API] Skipping image to GPT (OCR text sufficient) — faster + cheaper');
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
          ...(hasOcrIngredients ? [] : [{ type: 'image' as const, image: imageBase64 }]),
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

function extractBarcodeFromOcr(text: string): string | null {
  if (!text) return null;
  const candidates = text.match(/\b\d{8,14}\b/g);
  if (!candidates || candidates.length === 0) return null;
  const valid = candidates.filter(c => c.length === 8 || c.length === 12 || c.length === 13 || c.length === 14);
  if (valid.length === 0) return null;
  valid.sort((a, b) => b.length - a.length);
  return valid[0];
}

function extractProductNameFromOcr(text: string): string {
  if (!text) return '';
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const stopWords = /ingr[ée]dients?|nutrition|valeurs?|conserver|fabriqu|produit\s+par|distribu|net\s+weight|poids\s+net|best\s+before|allerg|contient/i;
  const candidates: string[] = [];
  for (const line of lines.slice(0, 10)) {
    if (stopWords.test(line)) continue;
    if (/^\d+$/.test(line)) continue;
    if (line.length < 3 || line.length > 60) continue;
    candidates.push(line);
    if (candidates.length >= 3) break;
  }
  return candidates.join(' ').trim();
}

async function tryFetchOpenFactsDataFromOcr(ocrText: string): Promise<{ context: string; offResult: OpenFactsResult | null }> {
  try {
    const barcode = extractBarcodeFromOcr(ocrText);
    if (barcode) {
      console.log('[API] Barcode extracted from OCR:', barcode);
      const offResult = await lookupBarcode(barcode);
      if (offResult.found) {
        const context = formatOpenFactsContext(offResult);
        console.log('[API] Open Food Facts data found via OCR barcode, context length:', context.length);
        return { context, offResult };
      }
      console.log('[API] OCR barcode not found in Open Food Facts');
    }

    const searchQuery = extractProductNameFromOcr(ocrText);
    if (searchQuery.length >= 3) {
      console.log('[API] Trying Open Food Facts search by OCR name:', searchQuery);
      const offResult = await searchByName(searchQuery);
      if (offResult.found) {
        const context = formatOpenFactsContext(offResult);
        console.log('[API] Open Food Facts data found via OCR name search, context length:', context.length);
        return { context, offResult };
      }
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

const ANALYSIS_CACHE = new Map<string, UniversalAnalysisResult & { openFactsData?: OpenFactsResult | null }>();
const CACHE_MAX = 50;

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h);
}

export async function analyzeUniversalPhoto(imageBase64: string): Promise<UniversalAnalysisResult & { openFactsData?: OpenFactsResult | null }> {
  const MAX_RETRIES = 2;

  let ocrData: { fullText: string; ingredientsBlock: string | null } = { fullText: '', ingredientsBlock: null };
  try {
    const ocr = await runGoogleVisionOcr(imageBase64);
    ocrData = { fullText: ocr.fullText, ingredientsBlock: extractIngredientsBlock(ocr.fullText) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[API] Google Vision OCR failed (non-blocking):', msg);
  }

  const cacheKey = ocrData.ingredientsBlock
    ? hashString(ocrData.ingredientsBlock.toLowerCase().replace(/\s+/g, ' ').trim())
    : null;
  if (cacheKey && ANALYSIS_CACHE.has(cacheKey)) {
    console.log('[API] Cache hit — returning cached analysis instantly');
    return ANALYSIS_CACHE.get(cacheKey)!;
  }

  const { context: offContext, offResult } = await tryFetchOpenFactsDataFromOcr(ocrData.fullText);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log('[API] Universal analysis attempt', attempt, '/', MAX_RETRIES);

      const rawResult = await tryGenerateUniversalAnalysis(
        imageBase64,
        offContext || undefined,
        ocrData.fullText || undefined,
        ocrData.ingredientsBlock || undefined,
      );

      if (!rawResult || !rawResult.categorie_produit) {
        console.error('[API] Invalid result structure, retrying...');
        throw new Error(isEnglish() ? 'Invalid result received' : 'Résultat invalide reçu');
      }

      const result = enforceExhaustiveSubstances(rawResult);

      if (result.erreur && offResult?.found && offResult.product) {
        console.log('[API] AI returned erreur="' + result.erreur + '" but Open Food Facts found the product. Clearing erreur and using OFF data.');
        result.erreur = '';
      }

      console.log('[API] Universal analysis result:', result.categorie_produit, result.objet_identifie, 'substances:', result.substances_detectees.length, 'badge_global:', result.badge_global);
      const finalResult = { ...result, openFactsData: offResult };
      if (cacheKey && !result.erreur) {
        if (ANALYSIS_CACHE.size >= CACHE_MAX) {
          const firstKey = ANALYSIS_CACHE.keys().next().value;
          if (firstKey) ANALYSIS_CACHE.delete(firstKey);
        }
        ANALYSIS_CACHE.set(cacheKey, finalResult);
      }
      return finalResult;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[API] Universal analysis error (attempt ' + attempt + '):', errorMsg);

      if (attempt < MAX_RETRIES) {
        const delay = 250;
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
  if (controversialCount >= 5 && groupPriority[riskGroup] < groupPriority['group2b']) {
    console.log('[API] Cumulative rule applied: ' + controversialCount + ' controversial substances (5+), upgrading to YELLOW (group2b)');
    return 'group2b';
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
    (s: SubstanceDetected) => s.niveau_risque === 'danger' || s.niveau_risque === 'probable'
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