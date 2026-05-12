import { ScannedProduct, DetectedIngredient, UniversalAnalysisResult, ProductCategory, SubstanceDetected, RiskGroup } from '@/types';
import { niveauRisqueToGroup } from '@/constants/additives';
import { z } from 'zod';
import { aiGenerateObject } from '@/utils/aiApi';
import { lookupBarcode, searchByName, formatOpenFactsContext, OpenFactsResult } from '@/utils/openFoodFacts';
import { getAnalysisRegionPrompt } from '@/utils/regionDetection';
import { t, isEnglish } from '@/utils/i18n';
import { INGREDIENTS_DATABASE, IngredientEntry, RiskLevel, DANGER_PREGNANCY } from '@/constants/ingredientsDatabase';
import { runGoogleVisionOcr, extractIngredientsBlock } from '@/utils/googleVisionOcr';

// ═══════════════════════════════════════════════════════════════════════
// LOOKUP DÉTERMINISTE — l'IA NE CLASSE PAS, ELLE CHERCHE DANS LA BASE
// ═══════════════════════════════════════════════════════════════════════

function normalizeForLookup(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lookupIngredient(ingredientName: string): IngredientEntry | null {
  const normalized = normalizeForLookup(ingredientName);
  if (!normalized) return null;

  // Recherche exacte d'abord
  for (const entry of INGREDIENTS_DATABASE) {
    for (const keyword of entry.keywords) {
      if (normalizeForLookup(keyword) === normalized) {
        return entry;
      }
    }
  }

  // Recherche par contenance (le plus long mot-clé matchant gagne)
  let bestMatch: IngredientEntry | null = null;
  let bestMatchLength = 0;
  for (const entry of INGREDIENTS_DATABASE) {
    for (const keyword of entry.keywords) {
      const normKeyword = normalizeForLookup(keyword);
      if (normKeyword.length < 3) continue;
      if (normalized.includes(normKeyword) && normKeyword.length > bestMatchLength) {
        bestMatch = entry;
        bestMatchLength = normKeyword.length;
      }
    }
  }
  return bestMatch;
}

function computeBadgeGlobal(substances: { niveau_risque: RiskLevel }[]): RiskLevel {
  const dangerCount = substances.filter(s => s.niveau_risque === 'danger').length;
  const probableCount = substances.filter(s => s.niveau_risque === 'probable').length;
  const possibleCount = substances.filter(s => s.niveau_risque === 'possible').length;
  const aucunCount = substances.filter(s => s.niveau_risque === 'aucun').length;
  const total = substances.length;

  if (dangerCount >= 1) {
    console.log('[Badge] DANGER:', dangerCount, 'rouge(s)');
    return 'danger';
  }

  if (probableCount >= 4) {
    console.log('[Badge] PROBABLE: 4+ orange (' + probableCount + ')');
    return 'probable';
  }

  if (possibleCount >= 7) {
    console.log('[Badge] PROBABLE: 7+ jaune (' + possibleCount + ')');
    return 'probable';
  }

  if (probableCount >= 1 && probableCount <= 3) {
    const greenRatio = total > 0 ? aucunCount / total : 0;
    if (greenRatio >= 0.7) {
      console.log('[Badge] POSSIBLE: ' + probableCount + ' orange isolé(s) parmi ' + Math.round(greenRatio * 100) + '% vert → rétrogradé');
      return 'possible';
    }
    console.log('[Badge] PROBABLE: ' + probableCount + ' orange');
    return 'probable';
  }

  if (possibleCount >= 2) {
    console.log('[Badge] POSSIBLE: ' + possibleCount + ' jaune(s)');
    return 'possible';
  }

  console.log('[Badge] AUCUN: ' + aucunCount + ' vert');
  return 'aucun';
}

// ═══════════════════════════════════════════════════════════════════════
// SCHÉMAS ZOD
// ═══════════════════════════════════════════════════════════════════════

const CATEGORY_VALUES = ['food', 'beverage', 'kitchen_utensil', 'clothing', 'cosmetic', 'household', 'electronics', 'furniture', 'toy', 'other'] as const;

const CATEGORY_ALIASES: Record<string, typeof CATEGORY_VALUES[number]> = {
  aliment: 'food', aliments: 'food', alimentaire: 'food', nourriture: 'food', food: 'food',
  boisson: 'beverage', boissons: 'beverage', drink: 'beverage', beverage: 'beverage',
  ustensile: 'kitchen_utensil', kitchen_utensil: 'kitchen_utensil',
  vetement: 'clothing', textile: 'clothing', clothing: 'clothing',
  cosmetique: 'cosmetic', cosmetic: 'cosmetic', hygiene: 'cosmetic',
  menager: 'household', household: 'household',
  electronique: 'electronics', electronics: 'electronics',
  meuble: 'furniture', furniture: 'furniture',
  jouet: 'toy', toy: 'toy',
  autre: 'other', other: 'other',
};

function normalizeKey(v: unknown): string {
  return String(v ?? '').toLowerCase().trim().replace(/[\s-]+/g, '_').replace(/[^a-z_]/g, '');
}

const categoryEnum = z.preprocess((v) => {
  const k = normalizeKey(v);
  return CATEGORY_ALIASES[k] ?? ((CATEGORY_VALUES as readonly string[]).includes(k) ? k : 'other');
}, z.enum(CATEGORY_VALUES));

const safeString = (fallback: string = '') =>
  z.preprocess((v) => (v === undefined || v === null ? fallback : typeof v === 'string' ? v : String(v)), z.string());

const aiAnalysisSchema = z.object({
  categorie_produit: categoryEnum,
  objet_identifie: safeString('Objet inconnu'),
  materiau_detecte: safeString(''),
  ingredients_lus: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.object({
      nom: safeString(''),
      explication: safeString(''),
    }))
  ),
  erreur: safeString('').optional(),
});

// ═══════════════════════════════════════════════════════════════════════
// PROMPT — L'IA LIT + DÉCRIT, ELLE NE CLASSE PAS
// ═══════════════════════════════════════════════════════════════════════

const AI_PROMPT_FR = `Tu es ToxiScan, un assistant qui lit les étiquettes alimentaires et cosmétiques.

⚠️ RÈGLE ABSOLUE — TU NE CLASSES RIEN ⚠️

Ton rôle est UNIQUEMENT de :
1. Identifier le produit (marque + nom)
2. Lire chaque ingrédient de l'étiquette
3. Écrire une description PÉDAGOGIQUE pour chaque ingrédient

TU NE DOIS JAMAIS classer un ingrédient comme "danger", "probable", "possible" ou "aucun".
TU NE DOIS JAMAIS écrire de niveau_risque ou de classification CIRC.
Le système Dr. Toxi fait cette classification automatiquement via une base de données interne.
Si tu ajoutes une classification, elle sera IGNORÉE et écrasée par la base de données.

═══ ÉTAPE 1 — IDENTIFIER LE PRODUIT ═══

objet_identifie = marque + produit (ex: "LU Prince", "Coca-Cola Zero", "Nutella").
Priorité : 1) nom Open Food Facts si fourni ; 2) texte sur l'emballage ; 3) marques connues ; 4) déduction par ingrédients.
JAMAIS "Objet inconnu" si du texte est lisible.

categorie_produit : food | beverage | cosmetic | household | other.

═══ ÉTAPE 2 — LIRE CHAQUE INGRÉDIENT EXHAUSTIVEMENT ═══

1. Trouve le bloc "Ingrédients :" / "INGREDIENTS:"
2. Découpe à chaque virgule/point-virgule → chaque segment = 1 ingrédient
3. Pour CHAQUE ingrédient, crée UNE entrée dans ingredients_lus avec :
   - nom : nom de l'ingrédient EN FRANÇAIS (traduis si étiquette anglaise)
   - explication : 3 à 5 phrases pédagogiques sur l'ingrédient
4. N'OMETS AUCUN ingrédient, même les ingrédients sains (eau, sel, farine, œufs, lait).

🌐 TRADUCTION OBLIGATOIRE — NOMS EN FRANÇAIS :
• "Natural flavors" → "Arômes naturels"
• "Modified milk ingredients" → "Ingrédients laitiers modifiés"
• "Wheat flour" → "Farine de blé"
• "Rapeseed oil" / "Canola oil" → "Huile de colza"
• "Sugar" → "Sucre"
• "Salt" → "Sel"
• "Water" → "Eau"
• "Citric acid" → "Acide citrique"
• "Carbonated water" → "Eau gazéifiée"
• "Skim milk" → "Lait écrémé"
• "Glucose-fructose syrup" → "Sirop de glucose-fructose"
• "Yeast extract" → "Extrait de levure"
• "Soy lecithin" → "Lécithine de soja"
• "Cane sugar" → "Sucre de canne"
• "Concentrated fruit juice" → "Jus concentré"
• "Cassava root fiber" → "Fibre de racine de manioc"

═══ ÉTAPE 3 — ÉCRIRE LA DESCRIPTION ═══

Pour CHAQUE ingrédient, écris 3 à 5 phrases en français clair, tutoiement, ton bienveillant et NON-ALARMISTE.

Structure :
1) Phrase 1 : Ce qu'est l'ingrédient et son rôle dans le produit.
2) Phrase 2-3 : Effets santé (positifs ou négatifs) — sois factuel.
3) Phrase 4 : Précision sur le classement cancérigène SI applicable. Reste mesuré.

EXEMPLES :
• Eau : "Ingrédient de base, sans risque pour la santé. Essentiel à la composition du produit."
• Sucre de canne : "Le sucre raffiné consommé en excès favorise l'obésité, le diabète et l'inflammation. Ce n'est pas un cancérogène direct mais sa consommation régulière nuit à la santé. À consommer avec modération."
• Arômes naturels : "Bien que nommés 'naturels', ces arômes sont souvent extraits avec des procédés chimiques industriels. Leur composition exacte n'est pas divulguée. Non classés cancérigènes par le CIRC, mais leur consommation régulière reste controversée."
• Huile de tournesol : "Huile végétale raffinée riche en oméga-6 pro-inflammatoires. À consommer avec modération. Préférer une huile pressée à froid ou l'huile d'olive."
• Eau gazéifiée : "Eau pétillante sans risque pour la santé. Hydratante comme l'eau plate."

INTERDIT :
- N'écris JAMAIS "à éviter" ou "très dangereux" sauf pour les vrais cancérigènes Groupe 1 IARC (nitrites, formaldéhyde, etc.).
- N'invente JAMAIS une classification Groupe 1/2A/2B.
- Ne mets PAS de champs niveau_risque, classification_circ ou couleur — ils seront ignorés.

═══ CAS PARTICULIERS ═══

PRODUITS BUCCAUX (dentifrice, bain de bouche) : Ajoute à la fin de chaque explication problématique : "Bon à savoir : ce produit est recraché, donc l'exposition est limitée."

GROSSESSE : Si l'ingrédient est dans cette liste, ajoute "⚠️ Déconseillé pendant la grossesse." dans son explication :
${DANGER_PREGNANCY.join(', ')}

═══ FORMAT JSON ATTENDU ═══

{
  "objet_identifie": "Nom du produit",
  "categorie_produit": "food",
  "materiau_detecte": "",
  "ingredients_lus": [
    { "nom": "Eau gazéifiée", "explication": "..." },
    { "nom": "Sucre de canne", "explication": "..." }
  ],
  "erreur": ""
}

Si la photo est illisible ET qu'aucune donnée Open Food Facts n'est fournie, mets erreur="Photo illisible".`;

const AI_PROMPT_EN = `You are ToxiScan, an assistant that reads food and cosmetic labels.

⚠️ ABSOLUTE RULE — YOU DO NOT CLASSIFY ANYTHING ⚠️

Your role is ONLY to:
1. Identify the product (brand + name)
2. Read each ingredient on the label
3. Write an EDUCATIONAL description for each ingredient

You MUST NEVER classify ingredients. The Dr. Toxi system does it automatically.

═══ STEP 1 — IDENTIFY THE PRODUCT ═══

objet_identifie = brand + product name. NEVER "Unknown object" if text is readable.
categorie_produit: food | beverage | cosmetic | household | other.

═══ STEP 2 — READ EVERY INGREDIENT EXHAUSTIVELY ═══

For EACH ingredient, create ONE entry in ingredients_lus with:
- nom: ingredient name IN ENGLISH (translate if French label)
- explication: 3-5 educational sentences

DO NOT OMIT any ingredient.

═══ STEP 3 — WRITE THE DESCRIPTION ═══

Structure:
1) What the ingredient is.
2) Health effects.
3) Cancer classification IF applicable. Stay measured.

EXAMPLES:
• Water: "Basic ingredient, no health risk."
• Cane sugar: "Refined sugar consumed in excess promotes obesity, diabetes and inflammation. Not a direct carcinogen but regular consumption is harmful. Consume in moderation."
• Natural flavors: "Although labeled 'natural', these flavors are often extracted using industrial chemical processes. Their exact composition is not disclosed. Not classified as carcinogenic by IARC, but regular consumption remains controversial."

FORBIDDEN:
- Never write "avoid" except for true Group 1 IARC carcinogens (nitrites, formaldehyde, etc.).
- Never invent classifications.
- Do NOT add risk_level fields — they will be ignored.

═══ EXPECTED JSON FORMAT ═══

{
  "objet_identifie": "Product name",
  "categorie_produit": "food",
  "materiau_detecte": "",
  "ingredients_lus": [
    { "nom": "Carbonated water", "explication": "..." }
  ],
  "erreur": ""
}`;

const AI_PROMPT = isEnglish() ? AI_PROMPT_EN : AI_PROMPT_FR;

// ═══════════════════════════════════════════════════════════════════════
// APPEL À L'IA
// ═══════════════════════════════════════════════════════════════════════

async function callAI(
  imageBase64: string,
  openFactsContext?: string,
  ocrText?: string,
  ocrIngredientsBlock?: string,
): Promise<z.infer<typeof aiAnalysisSchema>> {
  console.log('[API] Calling OpenAI — description-only mode...');

  const regionPrompt = getAnalysisRegionPrompt();
  const systemParts: string[] = [AI_PROMPT, regionPrompt];

  if (ocrText) {
    const ocrHeader = isEnglish()
      ? '\n\n═══ GOOGLE VISION OCR — RAW TEXT ═══\nPRIMARY source for the ingredient list. NEVER omit an ingredient that appears in the OCR.\n--- FULL OCR TEXT ---\n'
      : '\n\n═══ OCR GOOGLE VISION — TEXTE BRUT ═══\nSource PRINCIPALE pour les ingrédients. N\'omets JAMAIS un ingrédient de l\'OCR.\n--- TEXTE OCR COMPLET ---\n';
    systemParts.push(ocrHeader);
    systemParts.push(ocrText.substring(0, 8000));
    if (ocrIngredientsBlock) {
      systemParts.push(
        isEnglish()
          ? '\n--- INGREDIENTS BLOCK (highest priority) ---\n'
          : '\n--- BLOC INGRÉDIENTS (priorité max) ---\n',
      );
      systemParts.push(ocrIngredientsBlock.substring(0, 4000));
    }
    systemParts.push('\n--- END OCR ---\n');
  }

  if (openFactsContext) {
    systemParts.push('\n\n' + openFactsContext);
    systemParts.push(
      isEnglish()
        ? '\nUse the FULL Open Food Facts ingredient list as PRIMARY source. Set erreur=null.'
        : '\nUtilise la liste COMPLÈTE Open Food Facts comme source PRINCIPALE. Mets erreur=null.'
    );
  }

  const hasOcrIngredients = !!(ocrIngredientsBlock && ocrIngredientsBlock.length > 30);

  const result = await aiGenerateObject({
    system: systemParts.join(''),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: isEnglish()
              ? 'Read every ingredient on the label and write a description for each. DO NOT classify ingredients — that is done automatically by the system.'
              : 'Lis chaque ingrédient de l\'étiquette et écris une description pour chacun. NE CLASSIFIE PAS les ingrédients — c\'est fait automatiquement par le système.'
          },
          ...(hasOcrIngredients ? [] : [{ type: 'image' as const, image: imageBase64 }]),
        ],
      },
    ],
    schema: aiAnalysisSchema,
    toolName: 'record_analysis',
    toolDescription: isEnglish() ? 'Record the product description.' : 'Enregistre la description du produit.',
    maxTokens: 2500,
  });

  console.log('[API] AI returned', result.ingredients_lus.length, 'ingredients');
  return result;
}

// ═══════════════════════════════════════════════════════════════════════
// CLASSIFICATION DÉTERMINISTE
// ═══════════════════════════════════════════════════════════════════════

function classifyIngredients(aiIngredients: { nom: string; explication: string }[]): SubstanceDetected[] {
  return aiIngredients.map((ing) => {
    const entry = lookupIngredient(ing.nom);

    if (entry) {
      console.log('[Classify] "' + ing.nom + '" → ' + entry.risk + ' (' + entry.circ + ')');
      return {
        nom: ing.nom,
        code: entry.code,
        classification_circ: entry.circ,
        niveau_risque: entry.risk,
        explication: ing.explication || (entry.note ?? ''),
        source_exposition: null,
      };
    }

    console.log('[Classify] "' + ing.nom + '" → NON TROUVÉ → aucun');
    return {
      nom: ing.nom,
      code: null,
      classification_circ: isEnglish() ? 'Not classified by IARC' : 'Non classé par le CIRC',
      niveau_risque: 'aucun' as RiskLevel,
      explication: ing.explication || (isEnglish() ? 'Ingredient not in database, no identified risk.' : 'Ingrédient non répertorié, sans risque identifié.'),
      source_exposition: null,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS OCR + Open Food Facts
// ═══════════════════════════════════════════════════════════════════════

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
        return { context: formatOpenFactsContext(offResult), offResult };
      }
    }

    const searchQuery = extractProductNameFromOcr(ocrText);
    if (searchQuery.length >= 3) {
      console.log('[API] Trying Open Food Facts search by OCR name:', searchQuery);
      const offResult = await searchByName(searchQuery);
      if (offResult.found) {
        return { context: formatOpenFactsContext(offResult), offResult };
      }
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log('[API] Open Food Facts lookup failed (non-blocking):', msg);
  }

  return { context: '', offResult: null };
}

// ═══════════════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════════════

const ANALYSIS_CACHE = new Map<string, UniversalAnalysisResult & { openFactsData?: OpenFactsResult | null }>();
const CACHE_MAX = 50;

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h);
}

// ═══════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════

export async function analyzeUniversalPhoto(imageBase64: string): Promise<UniversalAnalysisResult & { openFactsData?: OpenFactsResult | null }> {
  const MAX_RETRIES = 2;

  // 1. OCR
  let ocrData: { fullText: string; ingredientsBlock: string | null } = { fullText: '', ingredientsBlock: null };
  try {
    const ocr = await runGoogleVisionOcr(imageBase64);
    ocrData = { fullText: ocr.fullText, ingredientsBlock: extractIngredientsBlock(ocr.fullText) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[API] OCR failed (non-blocking):', msg);
  }

  // 2. Cache
  const cacheKey = ocrData.ingredientsBlock
    ? hashString(ocrData.ingredientsBlock.toLowerCase().replace(/\s+/g, ' ').trim())
    : null;
  if (cacheKey && ANALYSIS_CACHE.has(cacheKey)) {
    console.log('[API] Cache hit');
    return ANALYSIS_CACHE.get(cacheKey)!;
  }

  // 3. Open Food Facts
  const { context: offContext, offResult } = await tryFetchOpenFactsDataFromOcr(ocrData.fullText);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log('[API] Analysis attempt', attempt);

      // 4. Appel IA (description seulement)
      const aiResult = await callAI(
        imageBase64,
        offContext || undefined,
        ocrData.fullText || undefined,
        ocrData.ingredientsBlock || undefined,
      );

      if (!aiResult || !aiResult.categorie_produit) {
        throw new Error(isEnglish() ? 'Invalid AI result' : 'Résultat IA invalide');
      }

      // 5. CLASSIFICATION DÉTERMINISTE via lookup
      const substances = classifyIngredients(aiResult.ingredients_lus);

      // 6. Tri par gravité
      const riskOrder: Record<RiskLevel, number> = { danger: 0, probable: 1, possible: 2, aucun: 3 };
      substances.sort((a, b) => riskOrder[a.niveau_risque] - riskOrder[b.niveau_risque]);

      // 7. Badge global DÉTERMINISTE
      const badge_global = computeBadgeGlobal(substances);

      // 8. Résumé + recommandations
      const resume = generateResume(badge_global, substances);
      const recommandations = generateRecommendations(badge_global, substances);

      // 9. Nettoyage erreur
      let erreur = aiResult.erreur || '';
      if (erreur && offResult?.found && offResult.product) {
        erreur = '';
      }

      const result: UniversalAnalysisResult = {
        categorie_produit: aiResult.categorie_produit,
        objet_identifie: aiResult.objet_identifie,
        materiau_detecte: aiResult.materiau_detecte || '',
        substances_detectees: substances,
        badge_global,
        resume,
        recommandations,
        alternatives_sures: [],
        alternatives_saines: [],
        erreur,
      };

      console.log('[API] Final:', result.objet_identifie, '— badge:', badge_global, '— substances:', substances.length);

      const finalResult = { ...result, openFactsData: offResult };
      if (cacheKey && !erreur) {
        if (ANALYSIS_CACHE.size >= CACHE_MAX) {
          const firstKey = ANALYSIS_CACHE.keys().next().value;
          if (firstKey) ANALYSIS_CACHE.delete(firstKey);
        }
        ANALYSIS_CACHE.set(cacheKey, finalResult);
      }
      return finalResult;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[API] Error (attempt ' + attempt + '):', errorMsg);

      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 250));
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

// ═══════════════════════════════════════════════════════════════════════
// RÉSUMÉS DÉTERMINISTES
// ═══════════════════════════════════════════════════════════════════════

function generateResume(badge: RiskLevel, substances: SubstanceDetected[]): string {
  const en = isEnglish();
  const dangerSubst = substances.filter(s => s.niveau_risque === 'danger');

  if (badge === 'danger') {
    const names = dangerSubst.slice(0, 2).map(s => s.nom).join(', ');
    return en
      ? `Warning! This product contains ingredient(s) classified as carcinogenic by the WHO (${names}). I strongly advise against regular consumption.`
      : `Attention ! Ce produit contient des ingrédients classés cancérigènes par l'OMS (${names}). Je te déconseille fortement d'en consommer régulièrement.`;
  }

  if (badge === 'probable') {
    return en
      ? `This product contains several controversial or ultra-processed substances. Consume it only occasionally.`
      : `Ce produit contient plusieurs substances controversées ou ultra-transformées. Consomme-le très occasionnellement et cherche une alternative plus naturelle.`;
  }

  if (badge === 'possible') {
    return en
      ? `This product contains a few processed or controversial ingredients. You can consume it occasionally.`
      : `Ce produit contient quelques ingrédients transformés ou controversés. Tu peux en consommer occasionnellement, mais évite d'en faire un aliment du quotidien.`;
  }

  return en
    ? `This product is overall very good. The vast majority of ingredients are natural and healthy.`
    : `Ce produit est globalement très bon. La grande majorité des ingrédients sont naturels et sains.`;
}

function generateRecommendations(badge: RiskLevel, substances: SubstanceDetected[]): string[] {
  const en = isEnglish();
  const recs: string[] = [];

  const pregnancyIssues = substances.filter(s =>
    DANGER_PREGNANCY.some(p => normalizeForLookup(s.nom).includes(normalizeForLookup(p)))
  );
  if (pregnancyIssues.length > 0) {
    recs.push(en
      ? '⚠️ This product contains substances not recommended during pregnancy. Consult a healthcare professional.'
      : '⚠️ Ce produit contient des substances déconseillées pendant la grossesse. Consulte un professionnel de santé.');
  }

  if (badge === 'danger' || badge === 'probable') {
    recs.push(en
      ? 'Look for organic alternatives without controversial additives.'
      : 'Privilégie des alternatives bio sans additifs controversés.');
    recs.push(en
      ? 'Read labels carefully and avoid ultra-processed products.'
      : 'Lis attentivement les étiquettes et évite les produits ultra-transformés.');
  } else if (badge === 'possible') {
    recs.push(en
      ? 'Consume in moderation as part of a balanced diet.'
      : 'Consomme avec modération dans le cadre d\'une alimentation équilibrée.');
  } else {
    recs.push(en
      ? 'Continue choosing products with simple and natural ingredients.'
      : 'Continue de choisir des produits avec des ingrédients simples et naturels.');
  }

  return recs;
}

// ═══════════════════════════════════════════════════════════════════════
// CONVERSION VERS ScannedProduct
// ═══════════════════════════════════════════════════════════════════════

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

export function universalResultToScannedProduct(
  result: UniversalAnalysisResult & { openFactsData?: OpenFactsResult | null },
  photoUri: string,
): ScannedProduct {
  // Badge déjà déterministe — on lui fait confiance
  const riskGroup = niveauRisqueToGroup(result.badge_global);
  console.log('[API] Final riskGroup:', riskGroup);

  const detectedAdditives = result.substances_detectees
    .filter((s: SubstanceDetected) => s.niveau_risque !== 'aucun')
    .map((s: SubstanceDetected) => ({
      code: s.code ?? s.nom,
      name: s.nom,
      group: niveauRisqueToGroup(s.niveau_risque),
      description: s.explication ?? '',
    }));

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

  const productName = hasOffData && offProduct?.product_name ? offProduct.product_name : result.objet_identifie;
  const productBrand = hasOffData && offProduct?.brands ? offProduct.brands : '';
  const imageUrl = hasOffData && offProduct?.image_url ? offProduct.image_url : null;
  const ingredientsText = hasOffData && offProduct?.ingredients_text
    ? offProduct.ingredients_text
    : result.substances_detectees.map((s: SubstanceDetected) => s.nom).join(', ');
  const offSource = off?.source ?? undefined;

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
    nutriScore: undefined,
    novaGroup: undefined,
    offSource,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ALTERNATIVES POUR SCAN CODE-BARRES (compat barcode.tsx)
// ═══════════════════════════════════════════════════════════════════════

const ADDITIVE_ALTERNATIVES: Record<string, { nom: string; raison: string }[]> = {
  'en:e250': [{ nom: 'Jambon sans nitrites (Fleury Michon)', raison: 'Sans conservateurs cancérogènes' }],
  'en:e249': [{ nom: 'Charcuterie bio sans nitrites', raison: 'Conservation naturelle sans nitrites' }],
  'en:e951': [{ nom: 'Stévia ou érythritol', raison: 'Édulcorants naturels' }],
  'palm-oil': [{ nom: 'Huile d\'olive extra vierge', raison: 'Riche en oméga-3 anti-inflammatoires' }],
  'pfas': [{ nom: 'Contenants en verre ou inox', raison: 'Sans polluants éternels' }],
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