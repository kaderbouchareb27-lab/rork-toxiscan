import { ScannedProduct, DetectedIngredient, UniversalAnalysisResult, ProductCategory, SubstanceDetected, RiskGroup } from '@/types';
import { niveauRisqueToGroup } from '@/constants/additives';
import { z } from 'zod';
import { aiGenerateObject } from '@/utils/aiApi';
import { getAnalysisRegionPrompt } from '@/utils/regionDetection';
import { t, isEnglish } from '@/utils/i18n';
import { INGREDIENTS_DATABASE, IngredientEntry, RiskLevel, DANGER_PREGNANCY, getLocalizedNote } from '@/constants/ingredientsDatabase';
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

// ─────────────────────────────────────────────────────────────────────
// INDEX DES MOTS-CLÉS — construit une seule fois au boot.
// Map de "keyword normalisé" → entry, plus une liste triée par longueur
// décroissante pour scanner rapidement les correspondances partielles.
// ─────────────────────────────────────────────────────────────────────

interface IndexedKeyword {
  readonly key: string;
  readonly entry: IngredientEntry;
}

const EXACT_KEYWORD_INDEX: Map<string, IngredientEntry> = (() => {
  const map = new Map<string, IngredientEntry>();
  const RISK_PRIORITY: Record<RiskLevel, number> = { danger: 0, probable: 1, possible: 2, aucun: 3 };
  for (const entry of INGREDIENTS_DATABASE) {
    for (const keyword of entry.keywords) {
      const norm = normalizeForLookup(keyword);
      if (!norm) continue;
      const existing = map.get(norm);
      if (!existing || RISK_PRIORITY[entry.risk] < RISK_PRIORITY[existing.risk]) {
        map.set(norm, entry);
      }
    }
  }
  return map;
})();

const SORTED_KEYWORDS: readonly IndexedKeyword[] = (() => {
  const list: IndexedKeyword[] = [];
  const seen = new Set<string>();
  for (const entry of INGREDIENTS_DATABASE) {
    for (const keyword of entry.keywords) {
      const norm = normalizeForLookup(keyword);
      if (!norm || norm.length < 3) continue;
      const dedupKey = `${norm}::${entry.risk}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      list.push({ key: norm, entry });
    }
  }
  // Tri par longueur décroissante pour que le mot-clé le plus spécifique
  // (ex. "sucre de canne") soit testé avant le plus générique ("sucre").
  list.sort((a, b) => b.key.length - a.key.length);
  return list;
})();

function lookupIngredient(ingredientName: string): IngredientEntry | null {
  const normalized = normalizeForLookup(ingredientName);
  if (!normalized) return null;

  // 1) Match exact — O(1) via Map
  const exact = EXACT_KEYWORD_INDEX.get(normalized);
  if (exact) return exact;

  // 2) Recherche par contenance : PRIORITÉ AU MOT-CLÉ LE PLUS LONG (le plus spécifique),
  //    puis au risque le plus élevé en cas d'égalité de longueur.
  //    Évite que "sucre de canne" soit classé via "sucre" (probable) au lieu de
  //    "sucre de canne" (possible), et que "lait de soja" soit classé via "soja"
  //    au lieu de "lait de soja".
  const RISK_PRIORITY: Record<RiskLevel, number> = { danger: 0, probable: 1, possible: 2, aucun: 3 };
  let bestMatch: IngredientEntry | null = null;
  let bestMatchLength = 0;
  let bestRiskPriority = 999;
  for (const { key, entry } of SORTED_KEYWORDS) {
    // Comme la liste est triée par longueur décroissante, dès qu'on a un match
    // et que les keywords suivants sont plus courts, ils ne peuvent plus battre.
    if (bestMatch && key.length < bestMatchLength) break;
    if (normalized.includes(key)) {
      const entryPriority = RISK_PRIORITY[entry.risk];
      if (
        key.length > bestMatchLength ||
        (key.length === bestMatchLength && entryPriority < bestRiskPriority)
      ) {
        bestMatch = entry;
        bestMatchLength = key.length;
        bestRiskPriority = entryPriority;
      }
    }
  }
  return bestMatch;
}

// Allergen declarations ("Contains: …", "May contain: …", "Peut contenir : …") are regulatory
// statements, NOT ingredients. They must never be parsed or badged.
const ALLERGEN_LINE_REGEX = /^(contains|contient|may contain|peut contenir)\s*:/i;

// A compound ingredient like "Sugars (sugar, dextrose)" that lists refined sugar or dextrose
// among its sub-ingredients must always classify as ULTRA-PROCESSED (orange), never CAUTION.
const REFINED_SUGAR_TOKENS = ['sugars', 'sugar', 'sucres', 'sucre', 'dextrose'] as const;
const REFINED_SUGAR_ENTRY: IngredientEntry | null = lookupIngredient('sugars');

function isCompoundRefinedSugar(name: string): boolean {
  // Compound = lists sub-ingredients via a parenthesis or comma (e.g. "Sugars (sugar, dextrose)").
  if (!/[(),]/.test(name)) return false;
  const normalized = normalizeForLookup(name);
  if (!normalized) return false;
  return REFINED_SUGAR_TOKENS.some((t) => normalized.includes(t));
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
  objet_identifie: safeString(''),
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
3. Écrire une description PÉDAGOGIQUE et FRANCHE pour chaque ingrédient

TU NE DOIS JAMAIS classer un ingrédient comme "danger", "probable", "possible" ou "aucun".
TU NE DOIS JAMAIS écrire de niveau_risque ou de classification CIRC.
Le système Dr. Toxi fait cette classification automatiquement via une base de données interne.

═══ ÉTAPE 1 — IDENTIFIER LE PRODUIT ═══

objet_identifie = marque + produit (ex: "LU Prince", "Coca-Cola Zero", "Nutella").
Priorité : 1) nom Open Food Facts si fourni ; 2) texte/marque sur l'emballage ; 3) marques connues reconnues visuellement ; 4) si la MARQUE est illisible ou absente, NOMME LE PRODUIT PAR SON TYPE déduit des ingrédients (ex: "Biscuits", "Céréales", "Sauce tomate", "Boisson gazeuse", "Barre chocolatée", "Shampoing", "Yaourt", "Chips").

🚫 INTERDIT ABSOLU pour objet_identifie :
- N'écris JAMAIS "Objet inconnu", "Produit inconnu", "Inconnu", "Unknown", "N/A".
- N'écris JAMAIS la formule littérale "marque + produit" / "brand + product name" / "Nom du produit".
- Il y a TOUJOURS un type identifiable d'après les ingrédients — donne-le.

categorie_produit : food | beverage | cosmetic | household | other.

═══ ÉTAPE 2 — LIRE CHAQUE INGRÉDIENT EXHAUSTIVEMENT ═══

🚨 BUG FIX — LIGNES "Contient:" : Les lignes qui commencent par "Contient:" ou "Contains:" sont des DÉCLARATIONS D'ALLERGÈNES RÉGLEMENTAIRES, PAS des ingrédients. Ne les inclus JAMAIS dans ingredients_lus. Ignore-les complètement.

1. Trouve le bloc "Ingrédients :" / "INGREDIENTS:"
2. Découpe à chaque virgule/point-virgule → chaque segment = 1 ingrédient
3. Pour CHAQUE ingrédient, crée UNE entrée dans ingredients_lus avec :
   - nom : nom de l'ingrédient EN FRANÇAIS (traduis si étiquette anglaise)
   - explication : 3 à 5 phrases pédagogiques sur l'ingrédient
4. N'OMETS AUCUN ingrédient, même les ingrédients sains (eau, sel, farine, œufs, lait).

🚨🚨🚨 RÈGLE CRITIQUE — PRÉSERVER LE NOM EXACT DE L'INGRÉDIENT 🚨🚨🚨

C'EST LA RÈGLE LA PLUS IMPORTANTE. NE JAMAIS la violer.

❌ INTERDIT : abréger, simplifier, ou raccourcir un nom d'ingrédient.
❌ INTERDIT : remplacer un terme spécifique par un terme générique.
❌ INTERDIT : mélanger français et anglais dans le même nom.
❌ INTERDIT : faire des fautes d'orthographe sur les noms d'ingrédients.

✅ OBLIGATOIRE : PRÉSERVER chaque qualificatif (de canne, raffiné, hydrogéné, modifié, complet, inverti, évaporé, naturel, artificiel, etc.).

EXEMPLES CONCRETS :
• Si l'étiquette dit "cane sugar" → écris "Sucre de canne" — JAMAIS juste "Sucre"
• Si l'étiquette dit "invert cane syrup" → écris "Sirop de canne inverti" — JAMAIS "Sucres" ni "Sucres (inversé cane syrup)"
• Si l'étiquette dit "palm oil" → écris "Huile de palme" — JAMAIS "Huile végétale", JAMAIS "Huile de palmet" (l'orthographe correcte est PALME, pas PALMET)
• Si l'étiquette dit "refined sunflower oil" → écris "Huile de tournesol raffinée" — JAMAIS juste "Huile"
• Si l'étiquette dit "modified corn starch" → écris "Amidon de maïs modifié" — JAMAIS juste "Amidon"
• Si l'étiquette dit "natural vanilla flavor" → écris "Arôme naturel de vanille" — JAMAIS juste "Arôme"
• Si l'étiquette dit "hydrogenated soybean oil" → écris "Huile de soja hydrogénée" — JAMAIS "Huile de soja"
• Si l'étiquette dit "sodium nitrite" → écris "Nitrite de sodium" — JAMAIS juste "Sel"
• Si l'étiquette dit "evaporated cane juice" → écris "Jus de canne évaporé" — JAMAIS "Sucre"

Pourquoi c'est critique : la base de données ToxiScan classe DIFFÉREMMENT les ingrédients selon leur spécificité (Sucre = orange, Sucre de canne = jaune, Sirop de canne inverti = orange). Si tu simplifies, tu fausses la classification.

ORTHOGRAPHE OBLIGATOIRE :
• "palme" (PAS "palmet")
• "soja" (PAS "soya" en français standard)
• "colza" (PAS "canola" en français)
• "maïs" avec accent
• "hydrogénée" / "raffinée" / "modifiée" : accord féminin avec "huile" / "farine"

🌐 TRADUCTION OBLIGATOIRE — NOMS EN FRANÇAIS :
• "Natural flavors" → "Arômes naturels"
• "Artificial flavors" → "Arômes artificiels"
• "Modified milk ingredients" → "Ingrédients laitiers modifiés"
• "Wheat flour" → "Farine de blé"
• "Rapeseed oil" / "Canola oil" → "Huile de colza"
• "Palm oil" → "Huile de palme" (orthographe : PALME, jamais PALMET)
• "Refined palm oil" → "Huile de palme raffinée"
• "Palm kernel oil" → "Huile de palmiste"
• "Sunflower oil" → "Huile de tournesol"
• "High oleic sunflower oil" → "Huile de tournesol à haute teneur oléique"
• "Soybean oil" → "Huile de soja"
• "Hydrogenated [oil]" → "Huile [...] hydrogénée" — GARDE "hydrogénée"
• "Sugar" → "Sucre"
• "Cane sugar" → "Sucre de canne" (JAMAIS juste "Sucre")
• "Raw cane sugar" → "Sucre de canne roux"
• "Evaporated cane juice" / "Evaporated cane sugar" → "Jus de canne évaporé"
• "Cane syrup" → "Sirop de canne" (JAMAIS "Sucre")
• "Invert sugar" / "Inverted sugar" → "Sucre inverti"
• "Invert cane syrup" / "Invert cane sugar" → "Sirop de canne inverti"
• "Brown sugar" → "Sucre brun" ou "Sucre roux"
• "Salt" → "Sel"
• "Water" → "Eau"
• "Citric acid" → "Acide citrique"
• "Carbonated water" → "Eau gazéifiée"
• "Skim milk" → "Lait écrémé"
• "Glucose-fructose syrup" / "HFCS" / "High fructose corn syrup" → "Sirop de glucose-fructose"
• "Corn syrup" → "Sirop de maïs"
• "Yeast extract" → "Extrait de levure"
• "Soy lecithin" → "Lécithine de soja"
• "Sunflower lecithin" → "Lécithine de tournesol"
• "Concentrated fruit juice" → "Jus concentré"
• "Cassava root fiber" → "Fibre de racine de manioc"
• "Silicon dioxide" → "Dioxyde de silicium"
• "Vegetable oil" → "Huile végétale"
• "Modified corn starch" / "Modified cornstarch" → "Amidon de maïs modifié"
• "Modified wheat starch" → "Amidon de blé modifié"
• "Sodium nitrite" → "Nitrite de sodium" (JAMAIS "Sel")
• "Sodium chloride" → "Chlorure de sodium" ou "Sel"
• "Whole wheat flour" → "Farine de blé complète"

═══ ÉTAPE 3 — ÉCRIRE LA DESCRIPTION (TON FRANC ET PERCUTANT) ═══

🚨 RÈGLE ABSOLUE : NE JAMAIS RASSURER L'UTILISATEUR sur un ingrédient transformé/industriel.
🚨 INTERDIT d'écrire : "généralement sûr", "considéré comme sûr", "approuvé par les autorités", "sans danger connu", "présent naturellement dans les agrumes" (sans dire que celui utilisé est industriel).

L'utilisateur télécharge cette app PARCE QU'IL VEUT SAVOIR LA VÉRITÉ. Si tu rassures, tu trahis sa confiance.

Pour CHAQUE ingrédient, écris 3 à 5 phrases en français clair, tutoiement, TON FRANC.

⚠️ ADAPTE TON TON À LA NATURE RÉELLE DE L'INGRÉDIENT :

═══ TYPE 1 : INGRÉDIENTS SAINS / APPROUVÉS (eau, sel, fruits, légumes, huile d'olive vierge, miel, épices, assaisonnements, herbes aromatiques, vinaigre, lait, œufs, fromage, viande non transformée, poisson, levure naturelle, farine, riz, avoine, légumineuses, etc.) ═══

🟢 RÈGLE ABSOLUE POUR LES INGRÉDIENTS SAINS :
→ Ton 100% POSITIF, valorisant, court (2-3 phrases).
→ Mets en avant les BIENFAITS pour la santé (nutriments, vitamines, minéraux, rôle dans le corps).
→ INTERDIT d'ajouter une mise en garde du type "à consommer avec modération", "en quantité raisonnable", "attention à l'excès", "industriel", "transformé".
→ INTERDIT de chercher du négatif sur l'eau, le sel naturel, les épices, les herbes, les fruits, les légumes, la viande fraîche, le poisson, le fromage non transformé, les œufs.
→ Si l'ingrédient est APPROUVÉ, la description doit DONNER ENVIE de le consommer.

→ Exemple eau : "L'eau est essentielle à la vie. Elle hydrate, transporte les nutriments et régule la température corporelle. Excellente pour la santé."
→ Exemple farine de blé : "Céréale de base riche en glucides complexes et fibres. Apporte de l'énergie durable au corps."
→ Exemple épices / assaisonnements : "Les épices et herbes aromatiques sont naturelles et bénéfiques. Elles apportent saveur, antioxydants et composés anti-inflammatoires sans calories. Excellentes pour la cuisine maison."
→ Exemple sel : "Minéral essentiel au bon fonctionnement du corps (équilibre hydrique, transmission nerveuse). Présent naturellement dans de nombreux aliments."
→ Exemple fromage mozzarella : "Fromage italien traditionnel à pâte filée, source de protéines et de calcium. Apporte du goût et de la satiété."
→ Exemple poulet : "Viande maigre riche en protéines de qualité, en vitamines du groupe B et en sélénium. Excellent pour la construction musculaire."

═══ TYPE 2 : INGRÉDIENTS TRANSFORMÉS / CONTROVERSÉS (sucres, sirops, huiles raffinées, arômes, gommes, acide citrique industriel, lécithines, phosphates, sulfites, extrait de levure, gel de silice, etc.) ═══

🚨🚨 DISTINCTION OBLIGATOIRE — DEUX SOUS-TONS SELON LA GRAVITÉ 🚨🚨

▸ INGRÉDIENT ULTRA-TRANSFORMÉ / ORANGE (sucre, sirop de glucose-fructose, huile hydrogénée, huile raffinée, maltodextrine, dextrose, émulsifiants, arômes industriels, etc.) :
  La description DOIT TOUJOURS, sans exception :
  1. Expliquer COMMENT et POURQUOI l'ingrédient est industriellement transformé (procédé : raffinage, hydrogénation, solvants, haute température…).
  2. Expliquer POURQUOI il est dangereux pour la santé.
  3. TOUJOURS mentionner le lien avec le cancer, l'inflammation chronique ou une maladie grave (obésité, diabète, maladie cardiovasculaire, stéatose hépatique…).
  4. NE JAMAIS mentionner un seul bienfait, ni un seul fait NEUTRE. INTERDIT d'écrire "en petite quantité c'est sûr", "apporte de l'énergie", "riche en…", "aide à…", "stabilise…", "sans danger", "index glycémique bas", "faible indice glycémique", "faible en calories", "facile à digérer", "sans gluten". Aucune phrase descriptive neutre type "sert d'agent levant" / "utilisé comme édulcorant" sans expliquer le danger.
  5. Ton DIRECT et FACTUEL, comme un médecin qui met en garde un patient.
  6. Description SPÉCIFIQUE à CET ingrédient — JAMAIS de description générique ni passe-partout.

  EXEMPLES OBLIGATOIRES (à reproduire dans cet esprit) :
  • Sucre / Sucre de canne : "Sucre industriel raffiné sans valeur nutritive. Nourrit les cellules cancéreuses, favorise l'obésité, la résistance à l'insuline et l'inflammation chronique — tous des facteurs majeurs de risque de cancer. À éviter."
  • Huile végétale hydrogénée : "Huile végétale hydrogénée industriellement. Le processus d'hydrogénation crée des gras trans qui favorisent l'inflammation chronique, obstruent les artères et sont directement liés à un risque accru de cancer. Évitez la consommation régulière."

  🚫🚫 ERREURS RÉELLES CONSTATÉES — À NE PLUS JAMAIS REPRODUIRE 🚫🚫
  • Sirop de glucose-fructose / HFCS : il est STRICTEMENT INTERDIT d'écrire "index glycémique bas" ou toute phrase positive/neutre. LA VÉRITÉ : son fructose isolé est métabolisé directement par le foie → stéatose hépatique non alcoolique, obésité, résistance à l'insuline et risque accru de cancer. "Sirop de glucose-fructose industriel extrait du maïs (souvent OGM). Son fructose isolé surcharge le foie et favorise la stéatose hépatique, l'obésité et l'inflammation chronique — facteurs de risque de cancer. À éviter."
  • Poudre à lever / agents levants ("leavening") : JAMAIS de description générique. Explique qu'ils contiennent des phosphates industriels (E450-E452) dont l'excès est lié à la calcification des artères et aux troubles rénaux, marqueur d'aliment transformé.
  • Arômes naturels ET artificiels : JAMAIS neutre. Composés industriels à composition secrète (extraits aux solvants, pétrochimie pour les artificiels), marqueurs certains d'ultra-transformation (NOVA 4).
  ⛔ Toute description d'ingrédient ORANGE (ultra-transformé) DOIT contenir AU MOINS UN de ces mots : cancer, inflammation chronique, obésité, diabète, stéatose hépatique, maladie cardiovasculaire. Sinon elle est INVALIDE.

▸ INGRÉDIENT CONTROVERSÉ / JAUNE (acceptable occasionnellement : certains additifs modérés, acide citrique, gommes, conservateurs légers, etc.) :
  Description ÉQUILIBRÉE :
  1. Explique ce qu'est l'ingrédient.
  2. Mentionne pourquoi il est controversé ou potentiellement nocif.
  3. Dis qu'il peut se consommer occasionnellement mais PAS au quotidien.
  4. Court et factuel.

→ Cite TOUJOURS au moins une donnée précise : étude scientifique, autorité (EFSA, ANSES, OMS), nom de classe chimique, ou effet biologique nommé.
→ Termine TOUJOURS par une phrase qui guide l'utilisateur : "À limiter.", "Marqueur de produit ultra-transformé.", "Préférer une alternative naturelle."

EXEMPLES OBLIGATOIRES À SUIVRE :

• Sucre / Sucre de canne : "Le sucre raffiné est un glucide vide associé à l'obésité, au diabète de type 2 et à l'inflammation chronique. L'OMS recommande de ne pas dépasser 25g de sucres ajoutés par jour — la plupart des produits transformés en contiennent bien plus. Marqueur fort de produit ultra-transformé."

• Sirop de glucose-fructose : "Édulcorant industriel ultra-transformé extrait de l'amidon de maïs. Son fructose isolé est métabolisé directement par le foie et favorise la stéatose hépatique non alcoolique, l'insulinorésistance et l'obésité. Très différent du sucre des fruits entiers — à éviter au quotidien."

• Acide citrique : "L'acide citrique alimentaire (E330) n'est PAS extrait des agrumes : il est produit industriellement par fermentation du moisissure Aspergillus niger sur du sirop de maïs (souvent OGM). En excès, il érode l'émail dentaire et irrite les muqueuses digestives. Marqueur de produit transformé."

• Arômes naturels : "Le mot 'naturel' est trompeur. Ces arômes sont extraits avec des solvants industriels (hexane, alcool) et leur composition exacte reste secrète — pouvant inclure jusqu'à 100 substances chimiques. Marqueur certain de produit ultra-transformé. Les vrais aliments n'ont pas besoin d'arômes ajoutés."

• Huile végétale (non spécifiée) : "Mention floue qui cache souvent de l'huile de palme, de soja ou de colza raffinées — toutes problématiques. Ces huiles subissent un raffinage chimique (hexane, désodorisation à 240°C) qui crée des composés glycidyliques cancérogènes (3-MCPD). Un fabricant transparent précise toujours quelle huile il utilise."

• Huile de tournesol / colza raffinée : "Huile végétale raffinée riche en oméga-6 pro-inflammatoires. Le ratio oméga-6/oméga-3 dans l'alimentation occidentale moderne (20:1) est lié à l'inflammation chronique, aux maladies cardiovasculaires et à plusieurs cancers. Préférer l'huile d'olive vierge ou l'huile de colza pressée à froid."

• Gel de silice / Dioxyde de silicium (E551) : "Anti-agglomérant industriel sous forme de nanoparticules. L'EFSA a demandé en 2018 une réévaluation après que des études ont montré que les nanoparticules de silice peuvent traverser la barrière intestinale et s'accumuler dans le foie. Marqueur de produit ultra-transformé."

• Maltodextrine : "Glucide industriel ultra-transformé dérivé de l'amidon (souvent OGM). Son index glycémique est PLUS ÉLEVÉ que le sucre blanc (110 vs 65) et fait grimper la glycémie violemment. Étude 2012 : perturbe le microbiome intestinal. Marqueur d'aliment ultra-transformé."

• Dextrose : "Sucre simple industriel (glucose pur). Fait grimper la glycémie quasi instantanément. Marqueur d'aliment ultra-transformé — un vrai aliment n'a pas besoin de dextrose ajouté."

• Émulsifiants (E471, mono- et diglycérides) : "Émulsifiants industriels qui peuvent contenir jusqu'à 50% de graisses trans cachées (issues d'huiles partiellement hydrogénées). Études récentes (Nature 2015) : perturbent le microbiome intestinal et favorisent l'inflammation chronique. Marqueur de produit ultra-transformé."

• Lécithine de soja : "Émulsifiant extrait du soja avec des solvants chimiques (hexane). Le soja utilisé est OGM dans 94% des cas aux USA. Préférer la lécithine de tournesol (sans OGM ni solvant)."

• Extrait de levure : "C'est du MSG (glutamate monosodique) caché sous un nom plus 'naturel'. Contient naturellement du glutamate qui agit comme exhausteur de goût et excitotoxine. Évite si tu es sensible aux maux de tête, palpitations ou hypertension."

• Gommes (xanthane, guar, etc.) : "Polysaccharides bactériens produits par fermentation industrielle. Peuvent provoquer ballonnements, diarrhées et perturbation du microbiome chez les personnes sensibles. Marqueur de produit ultra-transformé."

• Sulfites (E220-E228) : "Conservateurs allergènes capables de déclencher crises d'asthme, urticaire et migraines. La mention 'contient des sulfites' est OBLIGATOIRE au-dessus de 10mg/kg car potentiellement dangereux. À éviter chez les asthmatiques."

• Phosphates ajoutés (E450-E452, E339-E341) : "Sels minéraux industriels qui augmentent dangereusement l'apport en phosphore. Études : excès lié à calcification des artères, troubles rénaux et risque cardiovasculaire accru. Très différents du phosphore naturel des aliments."

═══ TYPE 3 : INGRÉDIENTS CANCÉRIGÈNES / DANGEREUX (nitrites, formaldéhyde, métaux lourds, PFAS, parabens, phtalates, etc.) ═══

La description DOIT TOUJOURS, sans exception :
1. Indiquer clairement qu'il est classé CANCÉRIGÈNE par l'OMS ou le CIRC.
2. Expliquer le risque de cancer spécifique (quel mécanisme, quel organe).
3. NE JAMAIS mentionner un seul bienfait.
4. Ton DIRECT et ALARMANT — cet ingrédient cause le cancer.
→ Exemple nitrite de sodium (E250) : "Conservateur des charcuteries qui forme des nitrosamines cancérigènes lors de la cuisson. Classé cancérogène avéré Groupe 1 par le CIRC (OMS) — même catégorie que le tabac. À éviter, surtout chez les enfants."
→ Exemple parabens : "Conservateurs cosmétiques perturbateurs endocriniens — détectés dans des biopsies de cancer du sein (étude Darbre 2004). Mimétiques des œstrogènes. Plusieurs sont interdits en UE. À éviter absolument."

═══ INTERDICTIONS FORMELLES ═══

❌ JAMAIS écrire "généralement reconnu comme sûr" pour un ingrédient industriel
❌ JAMAIS écrire "sans risque" pour un ingrédient jaune ou orange
❌ JAMAIS écrire "approuvé par les autorités" — c'est une rassurance creuse
❌ JAMAIS dire que l'acide citrique vient des agrumes (il est industriel à 99%)
❌ JAMAIS minimiser un additif ("simplement utilisé pour", "juste un agent de...")
❌ JAMAIS inventer une classification Groupe 1/2A/2B
❌ JAMAIS écrire "Same as before", "Previously explained", "See previous explanation" ou toute référence à un ingrédient précédent. Chaque ingrédient doit avoir sa propre description complète et unique.
❌ Ne mets PAS de champs niveau_risque ou couleur — ils seront ignorés
❌ JAMAIS écrire de mise en garde sur un ingrédient sain (eau, sel, épices, herbes, fruits, légumes, fromage frais, œufs, viande non transformée, poisson)
❌ 🚨 BUG FIX — JAMAIS écrire de description GÉNÉRIQUE comme "X est un ingrédient naturel qui apporte saveur et texture". Chaque description doit être SPÉCIFIQUE à l'ingrédient — mentionne ce qu'il EST, d'où il vient, et son rôle ou effet concret.
❌ 🚨 BUG FIX — JAMAIS mélanger le français et l'anglais dans la même réponse. TOUS les noms d'ingrédients (nom) et TOUTES les descriptions (explication) doivent être EN FRANÇAIS UNIQUEMENT. Si l'OCR contient des noms anglais, TRADUIS-LES en français.

✅ TOUJOURS expliquer le PROCÉDÉ INDUSTRIEL derrière l'ingrédient
✅ TOUJOURS citer une donnée concrète (étude, % d'OGM, classification, effet biologique)
✅ TOUJOURS terminer par une recommandation claire pour l'utilisateur

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
3. Write an EDUCATIONAL and FRANK description for each ingredient

You MUST NEVER classify ingredients. The Dr. Toxi system does it automatically.

═══ STEP 1 — IDENTIFY THE PRODUCT ═══

objet_identifie = brand + product name (e.g. "LU Prince", "Coca-Cola Zero", "Nutella").
Priority: 1) OpenFoodFacts name if provided; 2) text/brand on the packaging; 3) known brands recognized visually; 4) if the BRAND is unreadable or absent, NAME THE PRODUCT BY ITS TYPE deduced from the ingredients (e.g. "Cookies", "Cereal", "Tomato sauce", "Soda", "Chocolate bar", "Shampoo", "Yogurt", "Chips").

🚫 ABSOLUTELY FORBIDDEN for objet_identifie:
- NEVER write "Unknown object", "Unknown product", "Unknown", "N/A".
- NEVER write the literal template "brand + product name" or "Product name".
- There is ALWAYS an identifiable type from the ingredients — provide it.

categorie_produit: food | beverage | cosmetic | household | other.

═══ STEP 2 — READ EVERY INGREDIENT EXHAUSTIVELY ═══

🚨 BUG FIX — "Contains:" LINES: Lines starting with "Contains:" or "Contient:" are REGULATORY ALLERGEN DECLARATIONS, NOT ingredients. NEVER include them in ingredients_lus. Ignore them completely.

For EACH ingredient, create ONE entry in ingredients_lus with:
- nom: ingredient name IN ENGLISH (translate if French label)
- explication: 3-5 educational sentences

DO NOT OMIT any ingredient.

🚨🚨🚨 CRITICAL RULE — PRESERVE THE EXACT INGREDIENT NAME 🚨🚨🚨

THIS IS THE MOST IMPORTANT RULE. NEVER violate it.

❌ FORBIDDEN: shortening, simplifying, or abbreviating an ingredient name.
❌ FORBIDDEN: replacing a specific term with a generic one.
❌ FORBIDDEN: mixing languages in the same name.
❌ FORBIDDEN: misspelling ingredient names.

✅ MANDATORY: PRESERVE every qualifier (cane, refined, hydrogenated, modified, whole, invert, evaporated, natural, artificial, etc.).

CONCRETE EXAMPLES:
• If the label says "sucre de canne" → write "Cane sugar" — NEVER just "Sugar"
• If the label says "sirop de canne inverti" → write "Invert cane syrup" — NEVER just "Sugar"
• If the label says "huile de palme" → write "Palm oil" — NEVER "Vegetable oil"
• If the label says "huile de tournesol raffinée" → write "Refined sunflower oil" — NEVER just "Oil"
• If the label says "amidon de maïs modifié" → write "Modified corn starch" — NEVER just "Starch"
• If the label says "arôme naturel de vanille" → write "Natural vanilla flavor" — NEVER just "Flavor"
• If the label says "huile de soja hydrogénée" → write "Hydrogenated soybean oil" — NEVER "Soybean oil"
• If the label says "nitrite de sodium" → write "Sodium nitrite" — NEVER just "Salt"

Why this is critical: the ToxiScan database classifies ingredients DIFFERENTLY based on specificity (Sugar = orange, Cane sugar = yellow, Invert cane syrup = orange). If you simplify, you skew the classification.

SPELLING:
• "palm" not "palmet"
• "soy" or "soybean" — use consistently
• keep qualifiers: "refined", "hydrogenated", "modified", "whole"

═══ STEP 3 — WRITE THE DESCRIPTION (FRANK AND HARD-HITTING TONE) ═══

🚨 ABSOLUTE RULE: NEVER REASSURE the user about a processed/industrial ingredient.
🚨 FORBIDDEN to write: "generally safe", "considered safe", "approved by authorities", "no known harm", "naturally present in citrus" (without saying the industrial version is used).

The user downloaded this app BECAUSE THEY WANT THE TRUTH. If you reassure them, you betray their trust.

⚠️ ADAPT YOUR TONE TO THE REAL NATURE OF THE INGREDIENT:

═══ TYPE 1: HEALTHY / APPROVED INGREDIENTS (water, salt, fruits, vegetables, virgin olive oil, honey, spices, seasonings, herbs, vinegar, milk, eggs, cheese, unprocessed meat, fish, yeast, flour, rice, oats, legumes, etc.) ═══

🟢 ABSOLUTE RULE FOR HEALTHY INGREDIENTS:
→ 100% POSITIVE, valorizing tone. Short (2-3 sentences).
→ Highlight the HEALTH BENEFITS (nutrients, vitamins, minerals, role in the body).
→ FORBIDDEN to add warnings like "consume in moderation", "watch quantity", "beware of excess", "industrial", "processed".
→ FORBIDDEN to search for negatives about water, natural salt, spices, herbs, fruits, vegetables, fresh meat, fish, unprocessed cheese, eggs.
→ If the ingredient is APPROVED, the description must MAKE THE USER WANT to consume it.

→ Water: "Water is essential to life. It hydrates, transports nutrients, and regulates body temperature. Excellent for health."
→ Wheat flour: "Staple grain rich in complex carbs and fiber. Provides lasting energy to the body."
→ Spices / seasonings: "Spices and herbs are natural and beneficial. They add flavor, antioxidants and anti-inflammatory compounds without calories. Great for home cooking."
→ Salt: "Essential mineral for body function (water balance, nerve transmission). Naturally present in many foods."
→ Mozzarella cheese: "Traditional Italian pulled-curd cheese, a source of protein and calcium. Adds flavor and satiety."
→ Chicken: "Lean meat rich in high-quality protein, B vitamins and selenium. Excellent for muscle building."

═══ TYPE 2: PROCESSED / CONTROVERSIAL INGREDIENTS (sugars, syrups, refined oils, flavors, gums, industrial citric acid, lecithins, phosphates, sulfites, yeast extract, silica gel, etc.) ═══

🚨🚨 MANDATORY DISTINCTION — TWO SUB-TONES BASED ON SEVERITY 🚨🚨

▸ ULTRA-PROCESSED / ORANGE INGREDIENT (sugar, glucose-fructose syrup, hydrogenated oil, refined oil, maltodextrin, dextrose, emulsifiers, industrial flavors, etc.):
  The description MUST ALWAYS, no exception:
  1. Explain HOW and WHY the ingredient is industrially processed (the process: refining, hydrogenation, solvents, high heat…).
  2. Explain WHY it is dangerous for health.
  3. ALWAYS mention the link to cancer, chronic inflammation, or serious disease (obesity, diabetes, cardiovascular disease, fatty liver…).
  4. NEVER mention a single benefit, and NEVER state a merely NEUTRAL fact. FORBIDDEN to write "in small amounts it's safe", "provides energy", "rich in…", "helps…", "stabilizes…", "generally regarded as safe", "low glycemic index", "low in calories", "easy to digest", "gluten free". No neutral descriptive phrase like "acts as a leavening agent" / "used as a sweetener" without explaining the danger.
  5. DIRECT and FACTUAL tone, like a doctor warning a patient.
  6. SPECIFIC to THIS ingredient — NEVER a generic or boilerplate description.

  MANDATORY EXAMPLES (reproduce in this spirit):
  • Sugar / Cane sugar: "Refined industrial sugar with zero nutritional value. Feeds cancer cells, promotes obesity, insulin resistance and chronic inflammation — all major cancer risk factors. Avoid."
  • Hydrogenated vegetable oil: "Industrially hydrogenated vegetable oil. The hydrogenation process creates trans fats that promote chronic inflammation, block arteries and are directly linked to increased cancer risk. Avoid regular consumption."

  🚫🚫 REAL ERRORS OBSERVED — MUST NEVER HAPPEN AGAIN 🚫🚫
  • High Fructose Corn Syrup / HFCS: it is STRICTLY FORBIDDEN to write "low glycemic index" or any positive/neutral phrase. THE TRUTH: its isolated fructose is metabolized directly by the liver → non-alcoholic fatty liver disease, obesity, insulin resistance and increased cancer risk. "Industrial sweetener extracted from corn (often GMO). Its isolated fructose overloads the liver and promotes fatty liver disease, obesity and chronic inflammation — cancer risk factors. Avoid."
  • Leavening / raising agents / baking powder: NEVER a generic description. Explain they contain industrial phosphates (E450-E452) whose excess is linked to artery calcification and kidney problems — a marker of processed food.
  • Natural AND artificial flavors: NEVER neutral. Industrial compounds with secret composition (solvent extraction, petrochemistry for artificial), certain markers of ultra-processing (NOVA 4).
  ⛔ Every ORANGE (ultra-processed) ingredient description MUST contain AT LEAST ONE of these words: cancer, chronic inflammation, obesity, diabetes, fatty liver, cardiovascular disease. Otherwise it is INVALID.

▸ CONTROVERSIAL / YELLOW INGREDIENT (acceptable occasionally: some moderate additives, citric acid, gums, light preservatives, etc.):
  BALANCED description:
  1. Explain what the ingredient is.
  2. Mention why it is controversial or potentially harmful.
  3. Say it can be consumed occasionally but NOT daily.
  4. Short and factual.

→ ALWAYS cite at least one specific data point: scientific study, authority (EFSA, FDA, WHO), chemical class, or named biological effect.
→ ALWAYS end with guidance: "Limit consumption.", "Marker of ultra-processed food.", "Prefer a natural alternative."

MANDATORY EXAMPLES TO FOLLOW:

• Sugar / Cane sugar: "Refined sugar is an empty carbohydrate linked to obesity, type 2 diabetes, and chronic inflammation. The WHO recommends staying under 25g of added sugar per day — most processed products contain much more. Strong marker of ultra-processed food."

• Glucose-fructose syrup (HFCS): "Ultra-processed industrial sweetener extracted from corn starch. Its isolated fructose is metabolized directly by the liver and promotes non-alcoholic fatty liver disease, insulin resistance, and obesity. Very different from fruit sugar — avoid daily."

• Citric acid: "Food-grade citric acid (E330) is NOT extracted from citrus: it's industrially produced through fermentation of Aspergillus niger mold on corn syrup (often GMO). In excess, it erodes tooth enamel and irritates digestive mucosa. Marker of processed food."

• Natural flavors: "The word 'natural' is misleading. These flavors are extracted using industrial solvents (hexane, alcohol) and their exact composition remains secret — up to 100 chemical substances. Certain marker of ultra-processed food. Real foods don't need added flavors."

• Vegetable oil (unspecified): "Vague labeling that often hides palm, soy, or refined canola oil — all problematic. These oils undergo chemical refining (hexane, 240°C deodorization) creating carcinogenic glycidyl compounds (3-MCPD). A transparent manufacturer always specifies which oil they use."

• Refined sunflower / canola oil: "Refined vegetable oil high in pro-inflammatory omega-6. The modern Western omega-6/omega-3 ratio (20:1) is linked to chronic inflammation, cardiovascular disease, and several cancers. Prefer virgin olive oil or cold-pressed canola oil."

• Silica gel / Silicon dioxide (E551): "Industrial anti-caking agent in nanoparticle form. EFSA requested in 2018 a re-evaluation after studies showed silica nanoparticles can cross the intestinal barrier and accumulate in the liver. Marker of ultra-processed food."

• Maltodextrin: "Ultra-processed industrial carbohydrate derived from starch (often GMO). Its glycemic index is HIGHER than white sugar (110 vs 65) and spikes blood sugar violently. 2012 study: disrupts gut microbiome. Marker of ultra-processed food."

• Emulsifiers (E471, mono- and diglycerides): "Industrial emulsifiers that can contain up to 50% hidden trans fats (from partially hydrogenated oils). Recent studies (Nature 2015): disrupt gut microbiome and promote chronic inflammation. Marker of ultra-processed food."

• Yeast extract: "This is hidden MSG (monosodium glutamate) under a more 'natural' name. Naturally contains glutamate which acts as flavor enhancer and excitotoxin. Avoid if sensitive to headaches, palpitations, or hypertension."

═══ TYPE 3: CARCINOGENIC / DANGEROUS INGREDIENTS (nitrites, formaldehyde, heavy metals, PFAS, parabens, phthalates, etc.) ═══

The description MUST ALWAYS, no exception:
1. State clearly it is classified as CARCINOGENIC by the WHO or IARC.
2. Explain the specific cancer risk (which mechanism, which organ).
3. NEVER mention a single benefit.
4. DIRECT and ALARMING tone — this ingredient causes cancer.
→ Sodium nitrite (E250) example: "Preservative in processed meats that forms carcinogenic nitrosamines when cooked. Classified confirmed carcinogen Group 1 by IARC (WHO) — same category as tobacco. Avoid, especially for children."

═══ STRICT PROHIBITIONS ═══

❌ NEVER write "generally recognized as safe" for an industrial ingredient
❌ NEVER write "no risk" for a yellow or orange ingredient
❌ NEVER write "approved by authorities" — that's empty reassurance
❌ NEVER say citric acid comes from citrus (it's 99% industrial)
❌ NEVER minimize an additive ("simply used to", "just an agent of...")
❌ NEVER invent a Group 1/2A/2B classification
❌ NEVER write "Same as before", "Previously explained", "See previous explanation" or any reference to a previous ingredient. Every ingredient must have its own complete, unique description.
❌ NEVER add warnings on a healthy ingredient (water, salt, spices, herbs, fruits, vegetables, fresh cheese, eggs, unprocessed meat, fish)
❌ 🚨 BUG FIX — NEVER write a GENERIC description like "X is a natural ingredient that contributes flavor and texture." Every description must be SPECIFIC to the ingredient — mention what it IS, where it comes from, and its specific role or effect.
❌ 🚨 BUG FIX — NEVER mix French and English in the same response. ALL ingredient names (nom) and ALL descriptions (explication) must be in ENGLISH ONLY. If the OCR contains French names, TRANSLATE them to English.

✅ ALWAYS explain the INDUSTRIAL PROCESS behind the ingredient
✅ ALWAYS cite concrete data (study, % GMO, classification, biological effect)
✅ ALWAYS end with a clear recommendation

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
  ocrText?: string,
  ocrIngredientsBlock?: string,
): Promise<z.infer<typeof aiAnalysisSchema>> {
  console.log('[API] Calling OpenAI — description-only mode...');

  // 🌐 LANGUAGE LOCK — passed explicitly at runtime so the model can NEVER mix languages.
  const targetEnglish = isEnglish();
  const languageLock = targetEnglish
    ? `╔═══════════════════════════════════════════════╗
║  OUTPUT LANGUAGE LOCK — ENGLISH ONLY          ║
╚═══════════════════════════════════════════════╝
The app language is ENGLISH. This rule OVERRIDES everything else below.
- EVERY ingredient name ("nom") and EVERY description ("explication") MUST be written in ENGLISH ONLY.
- If the label / OCR text is in French (or any other language), TRANSLATE every term into English BEFORE writing it.
- NEVER output a single French word (no "et", "le", "la", "sucre", "huile", "naturel", "sain") and NEVER use accented words (é, è, à, ç…).
- The whole JSON output must be 100% English. No mixed-language fields, ever.

`
    : `╔═══════════════════════════════════════════════╗
║  VERROU DE LANGUE — FRANÇAIS UNIQUEMENT       ║
╚═══════════════════════════════════════════════╝
La langue de l'app est le FRANÇAIS. Cette règle PRIME sur tout le reste ci-dessous.
- CHAQUE nom d'ingrédient ("nom") et CHAQUE description ("explication") DOIT être écrit en FRANÇAIS UNIQUEMENT.
- Si l'étiquette / le texte OCR est en anglais (ou autre langue), TRADUIS chaque terme en français AVANT de l'écrire.
- N'écris JAMAIS un seul mot anglais (pas de "and", "the", "sugar", "oil", "natural", "healthy", "flavor").
- Toute la sortie JSON doit être 100% française. Aucune entrée en langue mélangée, jamais.

`;

  const regionPrompt = getAnalysisRegionPrompt();
  const systemParts: string[] = [languageLock, AI_PROMPT, regionPrompt];

  if (ocrText) {
    // BUG 4 FIX — Strip "Contains:" / "May contain:" allergen lines from OCR before sending to AI.
    const cleanedOcr = ocrText
      .split('\n')
      .filter(line => !ALLERGEN_LINE_REGEX.test(line.trim()))
      .join('\n');
    const cleanedBlock = ocrIngredientsBlock
      ? ocrIngredientsBlock
          .split('\n')
          .filter(line => !ALLERGEN_LINE_REGEX.test(line.trim()))
          .join('\n')
      : null;

    const ocrHeader = isEnglish()
      ? '\n\n═══ GOOGLE VISION OCR — RAW TEXT ═══\nPRIMARY source for the ingredient list. NEVER omit an ingredient that appears in the OCR.\n--- FULL OCR TEXT ---\n'
      : '\n\n═══ OCR GOOGLE VISION — TEXTE BRUT ═══\nSource PRINCIPALE pour les ingrédients. N\'omets JAMAIS un ingrédient de l\'OCR.\n--- TEXTE OCR COMPLET ---\n';
    systemParts.push(ocrHeader);
    systemParts.push(cleanedOcr.substring(0, 8000));
    if (cleanedBlock && cleanedBlock.length > 10) {
      systemParts.push(
        isEnglish()
          ? '\n--- INGREDIENTS BLOCK (highest priority) ---\n'
          : '\n--- BLOC INGRÉDIENTS (priorité max) ---\n',
      );
      systemParts.push(cleanedBlock.substring(0, 4000));
    }
    systemParts.push('\n--- END OCR ---\n');
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
            text: targetEnglish
              ? 'Read every ingredient on the label and write a FRANK, EDUCATIONAL description for each. DO NOT classify ingredients — that is done automatically by the system. DO NOT reassure the user about processed ingredients. Write EVERYTHING (names and descriptions) in ENGLISH ONLY — translate any French term first, no French word allowed.'
              : 'Lis chaque ingrédient de l\'étiquette et écris une description FRANCHE et PÉDAGOGIQUE pour chacun. NE CLASSIFIE PAS les ingrédients — c\'est fait automatiquement par le système. NE RASSURE PAS l\'utilisateur sur les ingrédients transformés. Écris TOUT (noms et descriptions) en FRANÇAIS UNIQUEMENT — traduis tout terme anglais d\'abord, aucun mot anglais autorisé.'
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

// Marqueurs de ton NÉGATIF — si on les trouve dans la description d'un ingrédient classé VERT,
// c'est que l'IA a halluciné du négatif sur un ingrédient sain. On remplace alors l'explication.
const NEGATIVE_MARKERS_FOR_GREEN = [
  'industriel', 'industrielle', 'industriellement', 'industrial', 'industrially',
  'raffiné', 'raffine', 'raffinée', 'raffinee', 'refined',
  'solvant', 'solvants', 'solvent', 'solvents',
  'chimique', 'chimiques', 'chemical', 'chemicals', 'chemically',
  'dépourvu', 'depourvu', 'dépourvue', 'depourvue', 'devoid', 'stripped',
  'ultra-transformé', 'ultra-transforme', 'ultra-processed',
  'hexane',
  'ogm', 'gmo',
  'cancér', 'cancer', 'cancéro', 'cancero', 'carcinogen',
  'hypertension', 'cardiovasculaire', 'cardiovascular',
  'inflammation', 'inflammatoire', 'inflammatory',
  'à limiter', 'a limiter', 'limit consumption', 'à éviter', 'a eviter', 'avoid',
  'marqueur de produit', 'marker of', 'marker of ultra',
  'consommation excessive', 'excessive consumption',
  'préférer une alternative', 'preferer une alternative', 'prefer a natural', 'prefer an alternative',
  'inconvénient pour la santé', 'inconvenient pour la sante',
  // Disease / harm vocabulary — broadens recognition of a genuinely negative description.
  'obésit', 'obesit', 'obesity',
  'diabèt', 'diabet', 'diabetes',
  'stéatose', 'steatose', 'fatty liver', 'hépatique', 'hepatique',
  'métabolique', 'metabolique', 'metabolic',
  'tumeur', 'tumeurs', 'tumor', 'tumour',
  'maladie', 'disease',
  'nocif', 'nocive', 'harmful', 'nuisible',
  'toxique', 'toxic', 'toxine', 'toxin',
  'gras trans', 'graisses trans', 'trans fat', 'acides gras trans',
  'pic glycemique', 'pics glycemiques', 'pic de glycemie', 'pics de glycemie', 'spikes blood sugar', 'blood sugar spike',
  'synthétique', 'synthetique', 'synthetic',
  'pétrochimie', 'petrochimie', 'petrochemical',
  'perturbateur', 'perturbe', 'disrupt',
  'glycémique élevé', 'glycemique eleve', 'high glycemic', 'index glycemique eleve',
];

function hasNegativeTone(text: string): boolean {
  const lower = text.toLowerCase();
  return NEGATIVE_MARKERS_FOR_GREEN.some((kw) => lower.includes(kw));
}

// BUG 3 FIX — Marqueurs de ton POSITIF qui n'ont pas leur place sur un ingredient rouge/orange.
const POSITIVE_SPIN_MARKERS = [
  'natural', 'naturel', 'naturelle',
  'healthy', 'sain', 'saine', 'bienfait', 'benefique', 'beneficial',
  'safe', 'inoffensif', 'inoffensive', 'harmless',
  'approved', 'approuve', 'approuvee',
  'no concern', 'no risk', 'no health', 'pas de risque', 'pas de danger', 'sans danger', 'sans risque',
  'good for', 'bon pour', 'bonne pour', 'excellent', 'excellente',
  'generally recognized as safe', 'generally regarded as safe',
  'recommended', 'recommande', 'recommandee',
  'widely used', 'largement utilise', 'commonly used', 'couramment utilise',
  'essential nutrient', 'nutriment essentiel', 'essential mineral',
  'part of a balanced', 'balanced diet',
  'source of', 'source de', 'rich in', 'riche en',
  // Soft / minimizing phrases that must never appear on a red/orange ingredient.
  'in small amounts', 'in moderation', 'en petite quantite', 'en petites quantites', 'avec moderation',
  'helps', 'help to', 'aide a', 'aide au', 'contribue a', 'contributes to',
  'stabilize', 'stabilise', 'stabilizes', 'stabilise le ph', 'stabilizes ph', 'stabilize ph',
  'provides energy', 'quick energy', 'energie rapide', 'apporte de l energie', 'provides quick',
  'amino acid', 'acide amine', 'muscle repair', 'muscle building', 'reparation musculaire', 'construction musculaire',
  'nutritional value', 'valeur nutritive', 'valeur nutritionnelle',
  'vitamin', 'vitamine', 'mineral', 'minerale', 'antioxidant', 'antioxydant',
  'flavor', 'flavour', 'saveur', 'gout agreable', 'texture', 'palatable',
  'well tolerated', 'bien tolere', 'gras to', 'gras as',
  // Misleading "healthy-sounding" claims that must NEVER appear on a red/orange ingredient.
  'low glycemic', 'low-glycemic', 'low glycaemic', 'low gi', 'lower glycemic', 'lower the glycemic',
  'faible indice glycemique', 'indice glycemique bas', 'indice glycemique faible', 'faible ig',
  'low calorie', 'low-calorie', 'faible en calorie', 'peu calorique', 'pauvre en calorie',
  'low fat', 'fat free', 'fat-free', 'faible en gras', 'sans gras',
  'gluten free', 'gluten-free', 'sans gluten',
  'easily digestible', 'easy to digest', 'facile a digerer', 'facilement digestible', 'gentle on',
  'prebiotic', 'prebiotique', 'probiotic', 'probiotique',
  'wholesome', 'nourishing', 'nutritious', 'nutritif', 'nutritive', 'good source', 'great source',
];

function hasPositiveSpin(text: string): boolean {
  const lower = text.toLowerCase();
  return POSITIVE_SPIN_MARKERS.some((kw) => lower.includes(kw));
}

// Disease-link markers — an ultra-processed/carcinogenic description MUST tie back to
// cancer, chronic inflammation, or a serious disease (rule #3).
const DISEASE_LINK_MARKERS = [
  'cancer', 'cancér', 'cancero', 'cancéro', 'carcinogen', 'carcinogène', 'carcinogene',
  'inflammation', 'inflammatoire', 'inflammatory',
  'obésit', 'obesit', 'obesity',
  'diabèt', 'diabet', 'diabetes',
  'cardiovascul',
  'stéatose', 'steatose', 'fatty liver', 'hépatique', 'hepatique',
  'métabolique', 'metabolique', 'metabolic',
  'tumeur', 'tumor', 'tumour',
  'maladie', 'disease',
  'neurotoxi', 'perturbateur endocrinien', 'endocrine',
  'rénaux', 'renaux', 'rénale', 'renale', 'kidney',
];

function hasDiseaseLink(text: string): boolean {
  const lower = text.toLowerCase();
  return DISEASE_LINK_MARKERS.some((kw) => lower.includes(kw));
}

/** Clause guaranteeing every ultra-processed description ends on a cancer/disease link. */
function diseaseClause(en: boolean): string {
  return en
    ? ' It is a marker of ultra-processed food linked to chronic inflammation and an increased risk of cancer and metabolic disease. Avoid regular consumption.'
    : ' C\'est un marqueur d\'aliment ultra-transformé lié à l\'inflammation chronique et à un risque accru de cancer et de maladies métaboliques. À éviter au quotidien.';
}

// Force a SPECIFIC, negative description for red/orange ingredients (fallback generator level).
function buildNegativeDescription(name: string, risk: RiskLevel, entry: IngredientEntry | null): string {
  const en = isEnglish();
  // 1) Prefer the curated database note — it is ingredient-specific and accurate. We only
  //    require a genuinely negative tone (NOT absence of positive words: a curated note like
  //    "imite des goûts naturels" is fine), then GUARANTEE a disease-link clause is present.
  const note = getLocalizedNote(entry)?.trim();
  if (note && hasNegativeTone(note)) {
    return hasDiseaseLink(note) ? note : note + diseaseClause(en);
  }
  // 2) No usable note → build a specific description from the ingredient name.
  const circInfo = entry?.circ ? ' (' + entry.circ + ')' : '';
  if (risk === 'danger') {
    return en
      ? name + ' is classified as a carcinogen' + circInfo + ' by the WHO/IARC — the same category of substances that cause cancer. Regular exposure damages cells and increases cancer risk, and it is especially harmful to children and pregnant women. This ingredient has NO health benefit; the food industry uses it only for preservation, color, or texture. Avoid it.'
      : name + ' est classé cancérigène' + circInfo + ' par l\'OMS/CIRC — la même catégorie de substances qui causent le cancer. Une exposition régulière endommage les cellules et augmente le risque de cancer, et c\'est particulièrement nocif pour les enfants et les femmes enceintes. Cet ingrédient n\'a AUCUN bénéfice santé ; l\'industrie ne l\'utilise que pour la conservation, la couleur ou la texture. À éviter.';
  }
  return en
    ? name + ' is an ultra-processed industrial ingredient' + circInfo + '. It is produced through heavy chemical processing (refining, hydrogenation, solvents or high heat) that strips any nutritional value and creates compounds promoting chronic inflammation, obesity, type 2 diabetes and an increased risk of cancer. It has no real health benefit and is a marker of ultra-processed food (NOVA 4). Avoid regular consumption.'
    : name + ' est un ingrédient industriel ultra-transformé' + circInfo + '. Il est produit par un lourd procédé chimique (raffinage, hydrogénation, solvants, haute température) qui détruit toute valeur nutritive et crée des composés favorisant l\'inflammation chronique, l\'obésité, le diabète de type 2 et un risque accru de cancer. Il n\'a aucun bénéfice santé réel et c\'est un marqueur d\'aliment ultra-transformé (NOVA 4). À éviter au quotidien.';
}

// BUG 1 FIX — No more generic fallback. Every description must be specific.
function buildPositiveFallback(name: string, note: string | undefined): string {
  const en = isEnglish();
  if (note && note.trim() && !hasNegativeTone(note)) return note;
  // Use the specific ingredient name to craft a real description.
  const lowerName = name.toLowerCase();
  if (lowerName.includes('eau') || lowerName.includes('water')) {
    return en ? 'Water is essential to life. It hydrates, transports nutrients, and regulates body temperature. Excellent for health.' : "L'eau est essentielle à la vie. Elle hydrate, transporte les nutriments et régule la température corporelle. Excellente pour la santé.";
  }
  if (lowerName.includes('sel') || lowerName.includes('salt')) {
    return en ? 'Natural mineral essential for body function (water balance, nerve transmission). Healthy when consumed in moderation.' : 'Minéral essentiel au bon fonctionnement du corps (équilibre hydrique, transmission nerveuse). Sain consommé avec modération.';
  }
  if (lowerName.includes('huile') && (lowerName.includes('olive') || lowerName.includes('vierge'))) {
    return en ? 'Cold-pressed virgin olive oil rich in monounsaturated fats and antioxidants. Excellent for heart health.' : "Huile d'olive vierge pressée à froid, riche en graisses mono-insaturées et antioxydants. Excellente pour la santé cardiovasculaire.";
  }
  if (lowerName.includes('épice') || lowerName.includes('spice') || lowerName.includes('herb') || lowerName.includes('herbe') || lowerName.includes('poivre') || lowerName.includes('pepper') || lowerName.includes('cumin') || lowerName.includes('curcuma') || lowerName.includes('gingembre') || lowerName.includes('cannelle') || lowerName.includes('paprika') || lowerName.includes('piment') || lowerName.includes('basilic') || lowerName.includes('origan') || lowerName.includes('thym') || lowerName.includes('romarin')) {
    return en ? 'Natural spice/herb with antioxidants and anti-inflammatory compounds. Adds flavor without calories. Excellent for home cooking.' : 'Épice ou herbe aromatique naturelle riche en antioxydants et composés anti-inflammatoires. Apporte saveur sans calories. Excellente pour la cuisine maison.';
  }
  if (lowerName.includes('farine') && (lowerName.includes('complète') || lowerName.includes('whole'))) {
    return en ? 'Whole grain flour rich in fiber, B vitamins, and minerals. Provides lasting energy and supports digestive health.' : 'Farine complète riche en fibres, vitamines B et minéraux. Apporte énergie durable et soutient la santé digestive.';
  }
  if (lowerName.includes('farine') || lowerName.includes('flour')) {
    return en ? 'Staple grain rich in complex carbohydrates and fiber. Provides lasting energy to the body.' : 'Céréale de base riche en glucides complexes et fibres. Apporte de l\'énergie durable au corps.';
  }
  if (lowerName.includes('lait') || lowerName.includes('milk')) {
    return en ? 'Natural source of calcium, protein, and vitamin D. Supports bone health and muscle function.' : 'Source naturelle de calcium, protéines et vitamine D. Soutient la santé osseuse et musculaire.';
  }
  if (lowerName.includes('œuf') || lowerName.includes('oeuf') || lowerName.includes('egg')) {
    return en ? 'Whole eggs are a complete protein source rich in choline and B vitamins. Excellent nutritional value.' : 'Œuf entier, source de protéines complètes riche en choline et vitamines B. Excellente valeur nutritionnelle.';
  }
  if (lowerName.includes('fromage') || lowerName.includes('cheese') || lowerName.includes('mozzarella') || lowerName.includes('parmesan') || lowerName.includes('cheddar') || lowerName.includes('gouda') || lowerName.includes('emmental')) {
    return en ? 'Traditional cheese, a source of protein and calcium. Contributes flavor and satiety.' : 'Fromage traditionnel, source de protéines et de calcium. Apporte goût et satiété.';
  }
  if (lowerName.includes('poulet') || lowerName.includes('chicken') || lowerName.includes('dinde') || lowerName.includes('turkey') || lowerName.includes('canard') || lowerName.includes('duck')) {
    return en ? 'Lean poultry rich in high-quality protein, B vitamins, and selenium. Excellent for muscle building.' : 'Volaille maigre riche en protéines de qualité, vitamines B et sélénium. Excellent pour la construction musculaire.';
  }
  if (lowerName.includes('bœuf') || lowerName.includes('boeuf') || lowerName.includes('beef') || lowerName.includes('porc') || lowerName.includes('pork') || lowerName.includes('agneau') || lowerName.includes('lamb') || lowerName.includes('veau') || lowerName.includes('veal')) {
    return en ? 'Fresh unprocessed meat, a source of complete proteins, heme iron, and B12. Choose fresh cuts cooked simply.' : 'Viande fraîche non transformée, source de protéines complètes, fer héminique et B12. Préférer les morceaux frais cuisinés simplement.';
  }
  if (lowerName.includes('poisson') || lowerName.includes('fish') || lowerName.includes('saumon') || lowerName.includes('salmon') || lowerName.includes('thon') || lowerName.includes('tuna') || lowerName.includes('cabillaud') || lowerName.includes('cod')) {
    return en ? 'Fresh fish, rich in high-quality protein and omega-3 fatty acids. Excellent for cardiovascular and brain health.' : 'Poisson frais riche en protéines de qualité et oméga-3. Excellent pour la santé cardiovasculaire et cérébrale.';
  }
  if (lowerName.includes('fruit') || lowerName.includes('légume') || lowerName.includes('legume') || lowerName.includes('vegetable') || lowerName.includes('pomme') || lowerName.includes('apple') || lowerName.includes('banane') || lowerName.includes('carotte') || lowerName.includes('carrot') || lowerName.includes('tomate') || lowerName.includes('tomato')) {
    return en ? 'Whole fruit or vegetable, rich in fiber, vitamins, minerals, and antioxidants. Essential for a balanced diet.' : 'Fruit ou légume entier, riche en fibres, vitamines, minéraux et antioxydants. Essentiel pour une alimentation équilibrée.';
  }
  if (lowerName.includes('vinaigre') || lowerName.includes('vinegar')) {
    return en ? 'Natural vinegar from fermentation. Low-calorie flavor enhancer, beneficial for digestion.' : 'Vinaigre naturel issu de fermentation. Rehausseur de goût peu calorique, bénéfique pour la digestion.';
  }
  if (lowerName.includes('miel') || lowerName.includes('honey')) {
    return en ? 'Natural honey, rich in antioxidants and enzymes. A healthier sweetener than refined sugar when used in moderation.' : 'Miel naturel riche en antioxydants et enzymes. Édulcorant plus sain que le sucre raffiné, à utiliser avec modération.';
  }
  if (lowerName.includes('levure') || lowerName.includes('yeast') || lowerName.includes('ferment') || lowerName.includes('culture')) {
    return en ? 'Natural fermentation agent. Essential for bread and fermented foods. Beneficial for gut health.' : 'Agent de fermentation naturel. Essentiel pour le pain et les aliments fermentés. Bénéfique pour la flore intestinale.';
  }
  if (lowerName.includes('cacao') || lowerName.includes('cocoa') || lowerName.includes('chocolat') || lowerName.includes('chocolate')) {
    return en ? 'Cocoa is rich in flavonoids and magnesium. Natural source of antioxidants with cardiovascular benefits.' : 'Cacao riche en flavonoïdes et magnésium. Source naturelle d\'antioxydants aux bénéfices cardiovasculaires.';
  }
  if (lowerName.includes('riz') || lowerName.includes('rice') || lowerName.includes('avoine') || lowerName.includes('oats') || lowerName.includes('quinoa') || lowerName.includes('céréale') || lowerName.includes('cereal') || lowerName.includes('grain')) {
    return en ? 'Whole grain, a healthy source of complex carbohydrates and fiber. Provides slow-release energy.' : 'Céréale complète, source saine de glucides complexes et fibres. Fournit une énergie à libération lente.';
  }
  if (lowerName.includes('noix') || lowerName.includes('nut') || lowerName.includes('amande') || lowerName.includes('almond') || lowerName.includes('noisette') || lowerName.includes('hazelnut') || lowerName.includes('cajou') || lowerName.includes('cashew') || lowerName.includes('pistache') || lowerName.includes('graine') || lowerName.includes('seed')) {
    return en ? 'Nuts and seeds are rich in healthy fats, protein, fiber, and minerals. Excellent for heart health and satiety.' : 'Noix et graines riches en bonnes graisses, protéines, fibres et minéraux. Excellentes pour la santé cardiovasculaire et la satiété.';
  }
  // Fallback descriptions must still be specific, not generic.
  return en
    ? `${name} is a natural ingredient. It is a source of nutrients that contributes to the nutritional value of this product.`
    : `${name} est un ingrédient naturel. C\'est une source de nutriments qui contribue à la valeur nutritionnelle de ce produit.`;
}

// Markers used to classify UNKNOWN ingredients (not in the database). Shared between the
// AI path (classifyIngredients) and the instant local OCR path (classifyLocal) so the
// classification logic stays identical.
const INDUSTRIAL_MARKERS = ['chemically', 'industrially', 'synthetic', 'refined', 'imitation', 'modified', 'defatted', 'enriched', 'fortified', 'rehydrated', 'processed', 'extract', 'isolate', 'concentrate', 'hydrolyzed', 'chimiquement', 'industriellement', 'synthétique', 'synthetique', 'raffiné', 'raffine', 'modifié', 'modifie', 'déshydraté', 'deshydrate', 'enrichie', 'fortifié', 'fortifie', 'transformé', 'transforme', 'extrait', 'isolat', 'concentré', 'concentre', 'hydrolysé', 'hydrolyse'];
const WHOLE_FOOD_MARKERS = ['fresh ', 'frais ', 'entier', 'whole ', 'feuille', 'leaf'];

/** Deterministic risk for an ingredient absent from the database (unchanged heuristic). */
function classifyUnknownRisk(name: string, explication: string): RiskLevel {
  const lowerExplication = explication.toLowerCase();
  const lowerName = normalizeForLookup(name);
  const hasIndustrialMarker = INDUSTRIAL_MARKERS.some((kw) => lowerExplication.includes(kw) || lowerName.includes(kw));
  const isObviousWholeFood = WHOLE_FOOD_MARKERS.some((kw) => lowerName.includes(kw)) && !hasIndustrialMarker;
  return hasIndustrialMarker ? 'probable' : isObviousWholeFood ? 'aucun' : 'possible';
}

// ─────────────────────────────────────────────────────────────────────
// INSTANT LOCAL CLASSIFICATION — parses the OCR ingredient text directly and
// classifies it via the database WITHOUT waiting for the AI. Descriptions for
// known ingredients come straight from the database; unknown ingredients are
// marked `descriptionPending` so the AI can fill them in the background.
// ─────────────────────────────────────────────────────────────────────

/** Split the raw OCR ingredient block into individual ingredient names. */
function splitOcrIngredients(block: string): string[] {
  if (!block) return [];
  let text = block.replace(/\r/g, ' ');
  // Drop a leading "Ingrédients :" / "Ingredients:" header if present.
  const headerMatch = text.match(/ingr[ée]dien\w*\s*[:\-]?/i);
  if (headerMatch && headerMatch.index !== undefined) {
    text = text.substring(headerMatch.index + headerMatch[0].length);
  }
  // Split on commas / semicolons / newlines that are NOT inside parentheses or brackets.
  const segments: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[' || ch === '{') { depth++; current += ch; continue; }
    if (ch === ')' || ch === ']' || ch === '}') { depth = Math.max(0, depth - 1); current += ch; continue; }
    if (depth === 0 && (ch === ',' || ch === ';' || ch === '\n' || ch === '•' || ch === '|')) {
      if (current.trim()) segments.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) segments.push(current.trim());

  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const seg of segments) {
    let s = seg
      .replace(/\.+$/, '')
      .replace(/^[\s\-•*:]+/, '')
      .replace(/\b\d+([.,]\d+)?\s*%/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!s || s.length < 2) continue;
    if (/^(contient|contains|peut contenir|may contain|traces)/i.test(s)) continue;
    if (/^[\d\s.,%*]+$/.test(s)) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(s);
  }
  return cleaned;
}

/** Classify ingredient names parsed locally from OCR. Known → DB description now; unknown → pending. */
function classifyLocal(names: string[]): SubstanceDetected[] {
  return names
    .map((raw) => raw.trim())
    .filter((name) => name.length >= 2 && !ALLERGEN_LINE_REGEX.test(name))
    .map((name) => {
      let entry = lookupIngredient(name);
      if (isCompoundRefinedSugar(name) && REFINED_SUGAR_ENTRY && (!entry || (entry.risk !== 'danger' && entry.risk !== 'probable'))) {
        entry = REFINED_SUGAR_ENTRY;
      }
      if (entry) {
        let explication = getLocalizedNote(entry) ?? '';
        if (entry.risk === 'aucun') {
          if (!explication || hasNegativeTone(explication)) {
            explication = buildPositiveFallback(name, getLocalizedNote(entry));
          }
        } else if (entry.risk === 'danger' || entry.risk === 'probable') {
          if (!explication || hasPositiveSpin(explication) || !hasNegativeTone(explication)) {
            explication = buildNegativeDescription(name, entry.risk, entry);
          }
        }
        return {
          nom: name,
          code: entry.code,
          classification_circ: entry.circ,
          niveau_risque: entry.risk,
          explication,
          source_exposition: null,
          descriptionPending: false,
        };
      }
      // Unknown ingredient → deterministic risk now, description filled later by the AI.
      const fallbackRisk = classifyUnknownRisk(name, '');
      return {
        nom: name,
        code: null,
        classification_circ: isEnglish() ? 'Not classified by IARC' : 'Non classé par le CIRC',
        niveau_risque: fallbackRisk,
        explication: '',
        source_exposition: null,
        descriptionPending: true,
      };
    });
}

function classifyIngredients(aiIngredients: { nom: string; explication: string }[]): SubstanceDetected[] {
  // BUG 4 FIX — Skip "Contains:" allergen declaration lines that the AI might still parse.
  const filtered = aiIngredients.filter((ing) => {
    const name = ing.nom.trim();
    if (ALLERGEN_LINE_REGEX.test(name)) {
      console.log('[Classify] SKIP allergen line: "' + name + '"');
      return false;
    }
    if (name.length < 2) {
      console.log('[Classify] SKIP empty/short name: "' + name + '"');
      return false;
    }
    return true;
  });
  return filtered.map((ing) => {
    let entry = lookupIngredient(ing.nom);
    if (isCompoundRefinedSugar(ing.nom) && REFINED_SUGAR_ENTRY && (!entry || (entry.risk !== 'danger' && entry.risk !== 'probable'))) {
      entry = REFINED_SUGAR_ENTRY;
    }

    if (entry) {
      console.log('[Classify] "' + ing.nom + '" → ' + entry.risk + ' (' + entry.circ + ')');

      let explication = ing.explication || (getLocalizedNote(entry) ?? '');

      // 🟢 Anti-contradiction : si l'ingredient est VERT mais l'IA a ecrit du negatif.
      if (entry.risk === 'aucun' && explication && hasNegativeTone(explication)) {
        explication = buildPositiveFallback(ing.nom, getLocalizedNote(entry));
        console.log('[Classify] GREEN override — "' + ing.nom + '" : AI tone was negative, replaced.');
      }

      // 🔴🟠 ULTRA-PROCESSED / CARCINOGENIC enforcement (rule applied at the post-processing level).
      // For a red/orange ingredient the description must ALWAYS be negative AND specific. We replace it
      // when it is missing, carries any positive spin, OR is merely neutral (no danger/disease tone) —
      // this is what catches cases like HFCS "low glycemic index" or a flavor described too softly.
      if (
        (entry.risk === 'danger' || entry.risk === 'probable') &&
        (!explication || hasPositiveSpin(explication) || !hasNegativeTone(explication))
      ) {
        explication = buildNegativeDescription(ing.nom, entry.risk, entry);
        console.log('[Classify] BADGE override — "' + ing.nom + '" (' + entry.risk + ') : forced specific negative description.');
      }

      return {
        nom: ing.nom,
        code: entry.code,
        classification_circ: entry.circ,
        niveau_risque: entry.risk,
        explication,
        source_exposition: null,
      };
    }

    // BUG 1 FIX — No more generic fallback for unknown ingredients.
    const explication = ing.explication || (isEnglish()
      ? `${ing.nom} is not listed in the ToxiScan database. Its health impact cannot be determined from available data.`
      : `${ing.nom} n'est pas répertorié dans la base de données ToxiScan. Son impact sur la santé ne peut être déterminé à partir des données disponibles.`);
    // Fallback STRICT : un ingrédient inconnu = JAUNE par défaut (modération).
    // Un vrai ingrédient sain (eau, sel, œuf, épice…) doit être dans la base. Si on ne le connaît pas,
    // on ne peut PAS supposer qu'il est sain — surtout dans un produit industriel.
    // Seuls quelques mots-clés très spécifiques (fruits/légumes/herbes entiers) peuvent rester verts.
    const fallbackRisk: RiskLevel = classifyUnknownRisk(ing.nom, explication);
    console.log('[Classify] "' + ing.nom + '" → NON TROUVÉ → ' + fallbackRisk);
    // Even for unknown ingredients, an ULTRA-PROCESSED classification must carry a specific,
    // negative description — never a positive/neutral or generic "not listed" fallback.
    const finalExplication =
      fallbackRisk === 'probable' && (hasPositiveSpin(explication) || !hasNegativeTone(explication))
        ? buildNegativeDescription(ing.nom, 'probable', null)
        : explication;
    return {
      nom: ing.nom,
      code: null,
      classification_circ: isEnglish() ? 'Not classified by IARC' : 'Non classé par le CIRC',
      niveau_risque: fallbackRisk,
      explication: finalExplication,
      source_exposition: null,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════════════

const ANALYSIS_CACHE = new Map<string, UniversalAnalysisResult>();
const CACHE_MAX = 50;

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h);
}

// ═══════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════

export interface OcrData {
  fullText: string;
  ingredientsBlock: string | null;
}

export interface InstantScan {
  /** Instant result built locally from OCR (or the cached full result). */
  result: UniversalAnalysisResult;
  ocrData: OcrData;
  cacheKey: string | null;
  /** True when the result is the cached/final result — no AI enrichment needed. */
  cached: boolean;
  /** True when a usable instant local verdict was produced (at least one ingredient parsed). */
  instant: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// PRODUCT NAME — never display an "unknown product" placeholder. When the AI
// cannot read a brand/name (blurry photo, only the ingredient panel visible, or
// a template echo like "Unknown brand plus product name"), we fall back to a
// clean category label derived from what was actually read on the label.
// ─────────────────────────────────────────────────────────────────────

/** Localized human label used when no real product name could be identified. */
function genericProductName(category: ProductCategory): string {
  const en = isEnglish();
  switch (category) {
    case 'beverage':        return en ? 'Beverage' : 'Boisson';
    case 'cosmetic':        return en ? 'Cosmetic product' : 'Produit cosmétique';
    case 'household':       return en ? 'Household product' : 'Produit ménager';
    case 'kitchen_utensil': return en ? 'Kitchen item' : 'Ustensile de cuisine';
    case 'clothing':        return en ? 'Textile item' : 'Article textile';
    case 'electronics':     return en ? 'Electronic device' : 'Appareil électronique';
    case 'furniture':       return en ? 'Furniture item' : 'Meuble';
    case 'toy':             return en ? 'Toy' : 'Jouet';
    case 'food':            return en ? 'Food product' : 'Produit alimentaire';
    case 'other':
    default:                return en ? 'Scanned product' : 'Produit scanné';
  }
}

// Names the model sometimes returns when it cannot identify the product.
const EXACT_PLACEHOLDER_NAMES: ReadonlySet<string> = new Set([
  'na', 'n a', 'none', 'null', 'undefined', 'nan', 'tbd', 'product', 'produit',
  'item', 'objet', 'analyse', 'analyzing', 'analysing',
]);
const CONTAINS_UNKNOWN_REGEX = /(unknown|inconnu|unidentified|unnamed|non identifie|not identified)/;
const TEMPLATE_ECHO_REGEX = /(brand\s*(\+|plus|and|&)?\s*product|product\s+name|nom\s+(du\s+)?produit|marque\s*(\+|et)\s*(produit|nom))/;

/** True when `name` is empty or a generic placeholder rather than a real product name. */
function isPlaceholderName(name: string): boolean {
  const raw = (name ?? '').trim();
  if (raw.length < 2) return true;
  const norm = normalizeForLookup(raw);
  if (!norm) return true;
  if (EXACT_PLACEHOLDER_NAMES.has(norm)) return true;
  if (CONTAINS_UNKNOWN_REGEX.test(norm)) return true;
  if (TEMPLATE_ECHO_REGEX.test(norm)) return true;
  return false;
}

/** Guarantee a clean, non-"unknown" product name, deriving a category label when needed. */
function sanitizeProductName(rawName: string, category: ProductCategory): string {
  if (isPlaceholderName(rawName)) return genericProductName(category);
  return rawName.trim();
}

/** Assemble a full UniversalAnalysisResult from classified substances + product meta. */
function assembleResult(
  meta: { categorie_produit: ProductCategory; objet_identifie: string; materiau_detecte: string; erreur?: string },
  substances: SubstanceDetected[],
): UniversalAnalysisResult {
  const riskOrder: Record<RiskLevel, number> = { danger: 0, probable: 1, possible: 2, aucun: 3 };
  const sorted = [...substances].sort((a, b) => riskOrder[a.niveau_risque] - riskOrder[b.niveau_risque]);
  const badge_global = computeBadgeGlobal(sorted);
  return {
    categorie_produit: meta.categorie_produit,
    objet_identifie: sanitizeProductName(meta.objet_identifie, meta.categorie_produit),
    materiau_detecte: meta.materiau_detecte || '',
    substances_detectees: sorted,
    badge_global,
    resume: generateResume(badge_global, sorted),
    recommandations: generateRecommendations(badge_global, sorted),
    alternatives_sures: [],
    alternatives_saines: [],
    erreur: meta.erreur || '',
  };
}

function buildErrorResult(messageKey: 'error_analyze_product' | 'error_process_photo'): UniversalAnalysisResult {
  return {
    categorie_produit: 'other',
    objet_identifie: genericProductName('other'),
    materiau_detecte: '',
    substances_detectees: [],
    badge_global: 'aucun',
    resume: '',
    recommandations: [],
    alternatives_sures: [],
    erreur: t(messageKey),
  };
}

// Lines that are clearly NOT a product name (label boilerplate) — skipped when guessing.
const NON_NAME_LINE_REGEX = /(ingr[ée]dien|valeurs?\s+nutri|nutrition\s+facts|best\s+before|à\s+consommer|conserv|fabriqu|distribu|emball|poids\s+net|net\s+w|contient|contains|allerg|www\.|https?:|\d{6,})/i;

/** Rough product-name guess from raw OCR text, shown instantly until the AI returns the real name. */
function guessProductName(fullText: string): string | null {
  const lines = fullText.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (NON_NAME_LINE_REGEX.test(line)) continue;
    if (line.length < 3 || line.length > 40) continue;
    if (/^[\d\s.,%*]+$/.test(line)) continue;
    // Require at least 3 letters so we never surface a barcode / weight / code line.
    if (line.replace(/[^a-zA-ZÀ-ÿ]/g, '').length < 3) continue;
    return line;
  }
  return null;
}

/** Fill any still-pending descriptions (used when the AI enrichment fails, to stop loading spinners). */
function finalizeInstant(result: UniversalAnalysisResult): UniversalAnalysisResult {
  const substances = result.substances_detectees.map((s) => {
    if (!s.descriptionPending) return s;
    let explication = s.explication?.trim() ?? '';
    if (!explication) {
      explication = s.niveau_risque === 'danger' || s.niveau_risque === 'probable'
        ? buildNegativeDescription(s.nom, s.niveau_risque, lookupIngredient(s.nom))
        : isEnglish()
          ? `${s.nom} is not listed in the ToxiScan database. Its health impact cannot be determined from available data.`
          : `${s.nom} n'est pas répertorié dans la base de données ToxiScan. Son impact sur la santé ne peut être déterminé à partir des données disponibles.`;
    }
    return { ...s, explication, descriptionPending: false };
  });
  return { ...result, substances_detectees: substances };
}

async function runOcrStep(imageBase64: string): Promise<{ ocrData: OcrData; cacheKey: string | null }> {
  let ocrData: OcrData = { fullText: '', ingredientsBlock: null };
  try {
    const ocr = await runGoogleVisionOcr(imageBase64);
    ocrData = { fullText: ocr.fullText, ingredientsBlock: extractIngredientsBlock(ocr.fullText) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[API] OCR failed (non-blocking):', msg);
  }
  const cacheKey = ocrData.ingredientsBlock
    ? hashString(ocrData.ingredientsBlock.toLowerCase().replace(/\s+/g, ' ').trim())
    : null;
  return { ocrData, cacheKey };
}

/**
 * STEP 1 — Runs OCR then classifies the label locally via the database, producing an
 * INSTANT verdict (~1s) without waiting for the AI. Known ingredients carry their database
 * description immediately; unknown ones are flagged `descriptionPending` for the AI to fill.
 */
export async function scanOcrInstant(imageBase64: string): Promise<InstantScan> {
  const { ocrData, cacheKey } = await runOcrStep(imageBase64);

  if (cacheKey && ANALYSIS_CACHE.has(cacheKey)) {
    console.log('[API] Cache hit (instant)');
    return { result: ANALYSIS_CACHE.get(cacheKey)!, ocrData, cacheKey, cached: true, instant: true };
  }

  const source = ocrData.ingredientsBlock || ocrData.fullText;
  const names = splitOcrIngredients(source);
  const substances = classifyLocal(names);
  console.log('[API] Instant local classification —', substances.length, 'ingredients parsed from OCR');

  // A clean OCR guess shows instantly; assembleResult sanitizes empty/placeholder
  // guesses into a category label so we never flash an "unknown product".
  const guessedName = guessProductName(ocrData.fullText) ?? '';
  const result = assembleResult(
    {
      categorie_produit: 'food',
      objet_identifie: guessedName,
      materiau_detecte: '',
    },
    substances,
  );

  return { result, ocrData, cacheKey, cached: false, instant: substances.length > 0 };
}

/**
 * STEP 2 — Full AI analysis (runs in the background after the instant verdict). Reads the
 * label, writes descriptions for every ingredient, then classifies via the same database
 * logic. This is the authoritative final result and replaces the instant one.
 */
export async function scanAiEnrich(
  imageBase64: string,
  ocrData: OcrData,
  cacheKey: string | null,
  instantResult?: UniversalAnalysisResult,
): Promise<UniversalAnalysisResult> {
  const MAX_RETRIES = 2;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log('[API] AI enrich attempt', attempt);
      const aiResult = await callAI(
        imageBase64,
        ocrData.fullText || undefined,
        ocrData.ingredientsBlock || undefined,
      );
      if (!aiResult || !aiResult.categorie_produit) {
        throw new Error(isEnglish() ? 'Invalid AI result' : 'Résultat IA invalide');
      }

      const substances = classifyIngredients(aiResult.ingredients_lus);
      const result = assembleResult(
        {
          categorie_produit: aiResult.categorie_produit,
          objet_identifie: aiResult.objet_identifie,
          materiau_detecte: aiResult.materiau_detecte || '',
          erreur: aiResult.erreur || '',
        },
        substances,
      );

      console.log('[API] Final:', result.objet_identifie, '— badge:', result.badge_global, '— substances:', substances.length);

      if (cacheKey && !result.erreur) {
        if (ANALYSIS_CACHE.size >= CACHE_MAX) {
          const firstKey = ANALYSIS_CACHE.keys().next().value;
          if (firstKey) ANALYSIS_CACHE.delete(firstKey);
        }
        ANALYSIS_CACHE.set(cacheKey, result);
      }
      return result;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[API] AI enrich error (attempt ' + attempt + '):', errorMsg);
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 250));
        continue;
      }
      // AI failed: keep the instant local verdict but stop the loading spinners.
      return instantResult ? finalizeInstant(instantResult) : buildErrorResult('error_analyze_product');
    }
  }
  return instantResult ? finalizeInstant(instantResult) : buildErrorResult('error_process_photo');
}

/** Full one-shot analysis (OCR → AI). Kept for compatibility; the scanner uses the two-step flow. */
export async function analyzeUniversalPhoto(imageBase64: string): Promise<UniversalAnalysisResult> {
  const { ocrData, cacheKey } = await runOcrStep(imageBase64);
  if (cacheKey && ANALYSIS_CACHE.has(cacheKey)) {
    console.log('[API] Cache hit');
    return ANALYSIS_CACHE.get(cacheKey)!;
  }
  return scanAiEnrich(imageBase64, ocrData, cacheKey);
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
      ? `This product contains too many ultra-processed ingredients, some of which are potentially carcinogenic (${names}). I strongly advise against consuming it — look for a healthier alternative.`
      : `Ce produit contient trop d'ingredients ultra-transformes, dont certains sont potentiellement cancerigenes (${names}). Je te deconseille fortement d'en consommer — cherche une alternative plus saine.`;
  }

  if (badge === 'probable') {
    return en
      ? `This product contains too many ultra-processed ingredients, some of which are potentially carcinogenic. Consume it very occasionally and prefer a natural alternative.`
      : `Ce produit contient trop d'ingredients ultra-transformes, dont certains sont potentiellement cancerigenes. Consomme-le tres occasionnellement et prefere une alternative naturelle.`;
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
  result: UniversalAnalysisResult,
  photoUri: string,
): ScannedProduct {
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
    descriptionPending: s.descriptionPending,
  }));

  const productName = result.objet_identifie;
  const productBrand = '';
  const imageUrl = null;
  const ingredientsText = result.substances_detectees.map((s: SubstanceDetected) => s.nom).join(', ');

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
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ALTERNATIVES POUR SCAN CODE-BARRES
// ═══════════════════════════════════════════════════════════════════════

interface LocalizedAlternative {
  readonly fr: { nom: string; raison: string };
  readonly en: { nom: string; raison: string };
}

const ADDITIVE_ALTERNATIVES: Record<string, readonly LocalizedAlternative[]> = {
  'en:e250': [{ fr: { nom: 'Jambon sans nitrites (Fleury Michon)', raison: 'Sans conservateurs cancérogènes' }, en: { nom: 'Nitrite-free deli ham', raison: 'No carcinogenic preservatives' } }],
  'en:e249': [{ fr: { nom: 'Charcuterie bio sans nitrites', raison: 'Conservation naturelle sans nitrites' }, en: { nom: 'Organic nitrite-free deli meat', raison: 'Naturally preserved without nitrites' } }],
  'en:e951': [{ fr: { nom: 'Stévia ou érythritol', raison: 'Édulcorants naturels' }, en: { nom: 'Stevia or erythritol', raison: 'Natural sweeteners' } }],
  'palm-oil': [{ fr: { nom: 'Huile d\'olive extra vierge', raison: 'Riche en oméga-3 anti-inflammatoires' }, en: { nom: 'Extra virgin olive oil', raison: 'Rich in anti-inflammatory omega-3' } }],
  'pfas': [{ fr: { nom: 'Contenants en verre ou inox', raison: 'Sans polluants éternels' }, en: { nom: 'Glass or stainless steel containers', raison: 'Free of forever chemicals (PFAS)' } }],
};

export function generateBarcodeAlternatives(detectedAdditives: { code: string; name: string; group: string }[]): { nom: string; raison: string }[] {
  const en = isEnglish();
  const seen = new Set<string>();
  const alternatives: { nom: string; raison: string }[] = [];

  for (const additive of detectedAdditives) {
    const alts = ADDITIVE_ALTERNATIVES[additive.code];
    if (alts) {
      for (const alt of alts) {
        const localized = en ? alt.en : alt.fr;
        if (!seen.has(localized.nom)) {
          seen.add(localized.nom);
          alternatives.push(localized);
        }
      }
    }
  }

  return alternatives.slice(0, 6);
}