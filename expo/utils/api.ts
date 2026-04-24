import { ScannedProduct, DetectedIngredient, UniversalAnalysisResult, ProductCategory, SubstanceDetected, RiskGroup } from '@/types';
import { niveauRisqueToGroup } from '@/constants/additives';
import { z } from 'zod';
import { aiGenerateObject } from '@/utils/aiApi';
import { lookupBarcode, searchByName, formatOpenFactsContext, OpenFactsResult } from '@/utils/openFoodFacts';
import { getAnalysisRegionPrompt } from '@/utils/regionDetection';
import { t } from '@/utils/i18n';
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

const UNIVERSAL_ANALYSIS_PROMPT = `Tu es ToxiScan. Analyse chaque photo et retourne UN JSON structuré.

═══ BASE DE DONNÉES INGRÉDIENTS (source unique — applique-la strictement) ═══

${INGREDIENTS_DB_TEXT}

Règle de classification : pour chaque ingrédient détecté, cherche une correspondance par mot-clé dans la base ci-dessus (insensible à la casse, accents, pluriels). Si trouvé → utilise EXACTEMENT son niveau_risque et sa classification_circ. Si non trouvé → niveau_risque="aucun" avec classification_circ="Non classé par le CIRC".

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
• Arômes naturels et artificiels : "Les arômes artificiels sont controversés car leur composition est peu transparente — ils peuvent contenir des dizaines de molécules non listées. Ils ne sont pas classés cancérigènes mais la consommation régulière d'additifs chimiques est à limiter."
• Colorants (non spécifiés) : "Certaines variétés de colorants peuvent être controversées, surtout les colorants azoïques ou artificiels (E102, E110, E124). Le fabricant ne précise pas ici lesquels, donc principe de précaution. Non classés cancérogènes par le CIRC dans leur ensemble."
• Taurine : "La taurine est un acide aminé synthétique ajouté comme stimulant dans les boissons énergisantes. À haute dose elle peut provoquer des effets cardiovasculaires (palpitations, hypertension), surtout combinée à la caféine. Non classée cancérogène mais sa consommation régulière reste controversée."
• Eau : "Ingrédient de base, sans risque pour la santé. Essentiel à la composition du produit."

CAS SPÉCIAL BOISSONS ÉNERGISANTES (Red Bull, Monster, Rockstar, Bang) : Taurine, Caféine ajoutée, Inositol, Glucuronolactone, Natural/Artificial Flavors, Niacinamide, Pyridoxine HCl, Calcium Pantothenate, Cyanocobalamin = ORANGE (dans un aliment normal ces vitamines B = VERT).

COSMÉTIQUES : règle "perturbateurs endocriniens cumulés" — 3+ dans le même produit = ORANGE minimum. DANGER GROSSESSE : si l'un de ces ingrédients est présent, préfixer resume par "⚠️ DANGER GROSSESSE : " et ajouter en 1re recommandation "Ce produit contient des substances déconseillées pendant la grossesse. Consulte un professionnel de santé."

═══ ÉTAPE 3 — VERDICT FINAL (badge_global) ═══

Règle stricte — le plus élevé l'emporte :
• danger → ≥1 ingrédient Groupe 1. Resume : "Attention ! Ce produit contient un ingrédient classé cancérigène par l'OMS. Je te déconseille fortement d'en consommer régulièrement."
• probable → ≥1 ingrédient ORANGE OU ≥4 jaunes. Resume : "Ce produit contient plusieurs substances controversées. Consomme-le très occasionnellement et cherche une alternative plus naturelle."
• possible → 2-3 jaunes, aucun orange/rouge. Resume : "Ce produit contient quelques ingrédients transformés. Tu peux en consommer mais évite d'en faire un aliment du quotidien."
• aucun → 0-1 jaune isolé parmi des naturels sains. Resume : "Ce produit est globalement très bon. La grande majorité des ingrédients sont naturels et sains."

Interdits absolus pour "aucun" : HFCS, dextrose, sirop de glucose, colorants FD&C, BHA, BHT, TBHQ, sodium benzoate, carraghénane, aspartame, acésulfame K, sucralose, nitrites/nitrates.

Tri obligatoire de substances_detectees : danger → probable → possible → aucun.

═══ SORTIE JSON ═══

Champs : objet_identifie, categorie_produit, badge_global, resume (3-4 phrases français standard, bienveillant, non-alarmiste), substances_detectees (TOUS les ingrédients), recommandations, alternatives_saines (2-3 selon pays : Québec=ATTITUDE/Druide/Oneka ; France=Cattier/Coslys/Ecover), materiau_detecte="", erreur=null (ou "Photo illisible" si floue).

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
[4] COHÉRENCE VERDICT : 1+ danger → badge="danger" ; 1+ probable ou 4+ possible → "probable" ; 2-3 possible → "possible" ; sinon → "aucun".
[5] INTERDITS ABSOLUS — badge_global="aucun" n'est pas utilisé si la liste contient HFCS, dextrose, FD&C, BHA/BHT/TBHQ, benzoate, carraghénane, édulcorants artificiels, nitrites.
[6] TRI — substances_detectees trié danger → probable → possible → aucun.
[7] RESUME — Correspond au badge_global et reste non-alarmiste si verdict vert.
[8] RELECTURE — Relis la liste de gauche à droite ; chaque ingrédient s'y trouve bien avec son badge.

Si la checklist passe → émets le JSON. Sinon → corrige.`;

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
          { type: 'text', text: 'Analyse cette photo en suivant STRICTEMENT cet ordre de génération :\n\nÉTAPE 0 (raisonnement) — AVANT tout autre champ, remplis "raisonnement" :\n  • ingredients_lus_bruts : liste chaque ingrédient de l\'étiquette, un par un, séparé à chaque virgule/point-virgule. N\'en saute AUCUN.\n  • nombre_ingredients_lus : le nombre exact d\'éléments ci-dessus.\n  • deduction_produit : comment tu identifies le produit (nom, marque, ou déduction).\n  • verification_exhaustivite : phrase "J\'ai lu X ingrédients et je vais créer X entrées dans substances_detectees".\n  • verification_coherence_badge : compte des badges et verdict final.\n\nÉTAPE 1 — objet_identifie (marque + nom, jamais "Objet inconnu" si texte/ingrédients lisibles).\nÉTAPE 2 — categorie_produit.\nÉTAPE 3 — substances_detectees : pour CHAQUE élément de ingredients_lus_bruts, crée UNE entrée (même nom, même ordre). substances_detectees.length DOIT égaler nombre_ingredients_lus. Inclure les ingrédients sains (eau, sel, farine, légumes) avec niveau_risque="aucun".\nÉTAPE 4 — badge_global, resume, recommandations, alternatives_saines.\n\nSi tu t\'aperçois que substances_detectees.length ≠ nombre_ingredients_lus, CORRIGE substances_detectees avant de finir — ne tronque jamais la liste.' },
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
