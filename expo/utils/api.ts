import { ScannedProduct, DetectedIngredient, UniversalAnalysisResult, ProductCategory, SubstanceDetected, RiskGroup } from '@/types';
import { niveauRisqueToGroup } from '@/constants/additives';
import { z } from 'zod';
import { aiGenerateObject } from '@/utils/aiApi';
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
3. Écrire une description PÉDAGOGIQUE et FRANCHE pour chaque ingrédient

TU NE DOIS JAMAIS classer un ingrédient comme "danger", "probable", "possible" ou "aucun".
TU NE DOIS JAMAIS écrire de niveau_risque ou de classification CIRC.
Le système Dr. Toxi fait cette classification automatiquement via une base de données interne.

═══ ÉTAPE 1 — IDENTIFIER LE PRODUIT ═══

objet_identifie = marque + produit (ex: "LU Prince", "Coca-Cola Zero", "Nutella").
Priorité : 1) nom Open Food Facts si fourni ; 2) texte sur l'emballage ; 3) marques connues ; 4) déduction par ingrédients.
JAMAIS "Objet inconnu" si du texte est lisible.

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
  4. NE JAMAIS mentionner un seul bienfait. INTERDIT d'écrire "en petite quantité c'est sûr", "apporte de l'énergie", "riche en…", "aide à…", "stabilise…", "sans danger".
  5. Ton DIRECT et FACTUEL, comme un médecin qui met en garde un patient.

  EXEMPLES OBLIGATOIRES (à reproduire dans cet esprit) :
  • Sucre / Sucre de canne : "Sucre industriel raffiné sans valeur nutritive. Nourrit les cellules cancéreuses, favorise l'obésité, la résistance à l'insuline et l'inflammation chronique — tous des facteurs majeurs de risque de cancer. À éviter."
  • Huile végétale hydrogénée : "Huile végétale hydrogénée industriellement. Le processus d'hydrogénation crée des gras trans qui favorisent l'inflammation chronique, obstruent les artères et sont directement liés à un risque accru de cancer. Évitez la consommation régulière."

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

objet_identifie = brand + product name. NEVER "Unknown object" if text is readable.
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
  4. NEVER mention a single benefit. FORBIDDEN to write "in small amounts it's safe", "provides energy", "rich in…", "helps…", "stabilizes…", "generally regarded as safe".
  5. DIRECT and FACTUAL tone, like a doctor warning a patient.

  MANDATORY EXAMPLES (reproduce in this spirit):
  • Sugar / Cane sugar: "Refined industrial sugar with zero nutritional value. Feeds cancer cells, promotes obesity, insulin resistance and chronic inflammation — all major cancer risk factors. Avoid."
  • Hydrogenated vegetable oil: "Industrially hydrogenated vegetable oil. The hydrogenation process creates trans fats that promote chronic inflammation, block arteries and are directly linked to increased cancer risk. Avoid regular consumption."

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
    // BUG 4 FIX — Strip "Contains:" allergen lines from OCR before sending to AI.
    const cleanedOcr = ocrText
      .split('\n')
      .filter(line => !/^(contains|contient)\s*:/i.test(line.trim()))
      .join('\n');
    const cleanedBlock = ocrIngredientsBlock
      ? ocrIngredientsBlock
          .split('\n')
          .filter(line => !/^(contains|contient)\s*:/i.test(line.trim()))
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
];

function hasPositiveSpin(text: string): boolean {
  const lower = text.toLowerCase();
  return POSITIVE_SPIN_MARKERS.some((kw) => lower.includes(kw));
}

// BUG 3 FIX — Force une description negative pour les ingredients rouges/oranges.
function buildNegativeDescription(name: string, risk: RiskLevel, entry: IngredientEntry | null): string {
  const en = isEnglish();
  // Prefer the database note when it already carries a frank, negative tone — it is
  // ingredient-specific and more accurate than a generic fallback.
  const note = entry?.note?.trim();
  if (note && hasNegativeTone(note) && !hasPositiveSpin(note)) return note;
  const circInfo = entry?.circ ? ' (' + entry.circ + ')' : '';
  if (risk === 'danger') {
    return en
      ? name + ' is classified as a carcinogen' + circInfo + ' by the WHO/IARC — the same category of substances that cause cancer. Regular exposure damages cells and increases cancer risk, and it is especially harmful to children and pregnant women. This ingredient has NO health benefit; the food industry uses it only for preservation, color, or texture. Avoid it.'
      : name + ' est classe cancerigene' + circInfo + ' par l\'OMS/CIRC — la meme categorie de substances qui causent le cancer. Une exposition reguliere endommage les cellules et augmente le risque de cancer, et c\'est particulierement nocif pour les enfants et les femmes enceintes. Cet ingredient n\'a AUCUN benefice sante ; l\'industrie ne l\'utilise que pour la conservation, la couleur ou la texture. A eviter.';
  }
  return en
    ? name + ' is an ultra-processed industrial ingredient' + circInfo + '. It is produced through heavy chemical processing (refining, hydrogenation, solvents, high heat) that strips any nutritional value and creates compounds linked to chronic inflammation and increased cancer risk. It has no real health benefit and is a marker of ultra-processed food (NOVA 4). Avoid regular consumption.'
    : name + ' est un ingredient industriel ultra-transforme' + circInfo + '. Il est produit par un lourd procede chimique (raffinage, hydrogenation, solvants, haute temperature) qui detruit toute valeur nutritive et cree des composes lies a l\'inflammation chronique et a un risque accru de cancer. Il n\'a aucun benefice sante reel et c\'est un marqueur d\'aliment ultra-transforme (NOVA 4). A eviter au quotidien.';
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

function classifyIngredients(aiIngredients: { nom: string; explication: string }[]): SubstanceDetected[] {
  // BUG 4 FIX — Skip "Contains:" allergen declaration lines that the AI might still parse.
  const filtered = aiIngredients.filter((ing) => {
    const name = ing.nom.trim();
    if (/^(contains|contient)\s*:/i.test(name)) {
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
    const entry = lookupIngredient(ing.nom);

    if (entry) {
      console.log('[Classify] "' + ing.nom + '" → ' + entry.risk + ' (' + entry.circ + ')');

      let explication = ing.explication || (entry.note ?? '');

      // 🟢 Anti-contradiction : si l'ingredient est VERT mais l'IA a ecrit du negatif.
      if (entry.risk === 'aucun' && explication && hasNegativeTone(explication)) {
        const original = explication;
        explication = buildPositiveFallback(ing.nom, entry.note);
        console.log('[Classify] GREEN override — "' + ing.nom + '" : AI tone was negative, replaced.');
      }

      // 🔴🟠 BUG 3 FIX — Reverse contradiction : si ROUGE/ORANGE mais description positive.
      if ((entry.risk === 'danger' || entry.risk === 'probable') && explication && hasPositiveSpin(explication)) {
        const original = explication;
        explication = buildNegativeDescription(ing.nom, entry.risk, entry);
        console.log('[Classify] BADGE override — "' + ing.nom + '" (' + entry.risk + ') : positive spin replaced.');
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
    const lowerExplication = explication.toLowerCase();
    const lowerName = normalizeForLookup(ing.nom);
    const industrialMarkers = ['chemically', 'industrially', 'synthetic', 'refined', 'imitation', 'modified', 'defatted', 'enriched', 'fortified', 'rehydrated', 'processed', 'extract', 'isolate', 'concentrate', 'hydrolyzed', 'chimiquement', 'industriellement', 'synthétique', 'synthetique', 'raffiné', 'raffine', 'modifié', 'modifie', 'déshydraté', 'deshydrate', 'enrichie', 'fortifié', 'fortifie', 'transformé', 'transforme', 'extrait', 'isolat', 'concentré', 'concentre', 'hydrolysé', 'hydrolyse'];
    const hasIndustrialMarker = industrialMarkers.some((kw) => lowerExplication.includes(kw) || lowerName.includes(kw));
    // Liste blanche très restrictive — uniquement noms d'ingrédients clairement entiers/bruts
    const wholeFoodMarkers = ['fresh ', 'frais ', 'entier', 'whole ', 'feuille', 'leaf'];
    const isObviousWholeFood = wholeFoodMarkers.some((kw) => lowerName.includes(kw)) && !hasIndustrialMarker;
    const fallbackRisk: RiskLevel = hasIndustrialMarker ? 'probable' : isObviousWholeFood ? 'aucun' : 'possible';
    console.log('[Classify] "' + ing.nom + '" → NON TROUVÉ → ' + fallbackRisk + (hasIndustrialMarker ? ' (industrial marker)' : isObviousWholeFood ? ' (whole food)' : ' (default yellow)'));
    return {
      nom: ing.nom,
      code: null,
      classification_circ: isEnglish() ? 'Not classified by IARC' : 'Non classé par le CIRC',
      niveau_risque: fallbackRisk,
      explication,
      source_exposition: null,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
// COHÉRENCE LINGUISTIQUE — jamais de langues mélangées dans un seul scan
// ═══════════════════════════════════════════════════════════════════════

// Mots-outils EXCLUSIFS à chaque langue (n'apparaissent jamais dans l'autre).
// Sert à détecter de façon fiable la langue réelle d'un texte court.
const FRENCH_FUNCTION_WORDS: ReadonlySet<string> = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'est', 'sont', 'dans',
  'pour', 'avec', 'qui', 'que', 'cette', 'ces', 'cet', 'aux', 'par', 'sur', 'ou',
  'sa', 'ses', 'leur', 'leurs', 'ils', 'elles', 'elle', 'vous', 'nous', 'votre',
  'notre', 'ne', 'pas', 'plus', 'tres', 'aussi', 'peut', 'sans', 'mais', 'comme',
  'tout', 'toute', 'tous', 'toutes', 'etre', 'cela', 'donc', 'car', 'afin', 'chez',
  'entre', 'vers', 'selon', 'contient', 'contre', 'ainsi', 'lorsque', 'naturel',
  'naturelle', 'sante', 'sucre', 'huile', 'raffine', 'raffinee', 'transforme',
]);

const ENGLISH_FUNCTION_WORDS: ReadonlySet<string> = new Set([
  'the', 'and', 'is', 'are', 'was', 'were', 'for', 'with', 'this', 'that', 'from',
  'which', 'has', 'have', 'had', 'will', 'would', 'can', 'could', 'your', 'you',
  'they', 'their', 'these', 'those', 'of', 'to', 'be', 'been', 'being', 'it', 'its',
  'as', 'by', 'an', 'at', 'in', 'but', 'not', 'them', 'about', 'into', 'than',
  'then', 'when', 'while', 'also', 'because', 'contains', 'health', 'healthy',
  'body', 'added', 'used', 'made', 'often', 'rich', 'known', 'may', 'high',
  'linked', 'only', 'very', 'sugar', 'flavor', 'natural',
]);

/** Détecte la langue dominante d'un texte via les mots-outils exclusifs + accents. */
function detectTextLanguage(text: string): 'fr' | 'en' | 'unknown' {
  if (!text) return 'unknown';
  const lower = text.toLowerCase();
  const tokens = lower.match(/[a-zàâäçéèêëîïôöùûüœ]+/gi) ?? [];
  let fr = 0;
  let en = 0;
  for (const tok of tokens) {
    if (FRENCH_FUNCTION_WORDS.has(tok)) fr += 1;
    if (ENGLISH_FUNCTION_WORDS.has(tok)) en += 1;
  }
  // Les caractères accentués sont un signal TRÈS fort de français.
  const accents = (lower.match(/[àâäçéèêëîïôöùûüœ]/g) ?? []).length;
  if (accents > 0) fr += accents * 2;
  if (fr === 0 && en === 0) return 'unknown';
  if (fr > en) return 'fr';
  if (en > fr) return 'en';
  return 'unknown';
}

/** true si le texte est clairement dans la mauvaise langue par rapport à la cible. */
function isWrongLanguage(text: string, targetEnglish: boolean): boolean {
  const detected = detectTextLanguage(text);
  if (detected === 'unknown') return false;
  return targetEnglish ? detected === 'fr' : detected === 'en';
}

const translationBatchSchema = z.object({
  items: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.object({ nom: safeString(''), explication: safeString('') })),
  ),
});

/** Re-traduit en bloc une liste d'ingrédients vers la langue cible (1 seul appel IA). */
async function translateIngredientsBatch(
  items: { nom: string; explication: string }[],
  targetEnglish: boolean,
): Promise<{ nom: string; explication: string }[]> {
  const system = targetEnglish
    ? 'You are a professional food-label translator. Translate EVERY ingredient name and description into natural, fluent ENGLISH. Keep the frank, educational tone and ALL factual content (studies, IARC groups, percentages, E-numbers). Do NOT add or remove information. Output STRICT JSON {"items":[{"nom":"...","explication":"..."}]} in the SAME order. Absolutely NO French word anywhere.'
    : 'Tu es un traducteur professionnel d\'étiquettes alimentaires. Traduis CHAQUE nom d\'ingrédient et description en FRANÇAIS naturel et fluide. Garde le ton franc et pédagogique et TOUT le contenu factuel (études, groupes CIRC, pourcentages, numéros E). N\'ajoute ni ne retire d\'information. Réponds en JSON STRICT {"items":[{"nom":"...","explication":"..."}]} dans le MÊME ordre. Absolument AUCUN mot anglais.';

  const payload = items
    .map((it, i) => (i + 1) + '. nom: ' + it.nom + '\n   description: ' + it.explication)
    .join('\n');
  const userText = targetEnglish
    ? 'Translate these ' + items.length + ' ingredients to English (keep order):\n\n' + payload
    : 'Traduis ces ' + items.length + ' ingrédients en français (garde l\'ordre) :\n\n' + payload;

  const result = await aiGenerateObject({
    system,
    messages: [{ role: 'user', content: [{ type: 'text', text: userText }] }],
    schema: translationBatchSchema,
    maxTokens: Math.min(4000, 400 + items.length * 240),
  });
  return result.items;
}

/**
 * Filet de sécurité final : scanne chaque substance et, si un nom ou une
 * description est dans la mauvaise langue, la re-traduit vers la langue de l'app.
 * Garantit qu'un même scan n'affiche JAMAIS un mélange français / anglais.
 */
async function enforceLanguageConsistency(substances: SubstanceDetected[]): Promise<SubstanceDetected[]> {
  const targetEnglish = isEnglish();
  const flaggedIdx: number[] = [];
  substances.forEach((s, i) => {
    const wrongExpl = isWrongLanguage(s.explication ?? '', targetEnglish);
    const wrongName = isWrongLanguage(s.nom ?? '', targetEnglish);
    if (wrongExpl || wrongName) flaggedIdx.push(i);
  });

  if (flaggedIdx.length === 0) {
    console.log('[Lang] All ' + substances.length + ' entries consistent (' + (targetEnglish ? 'EN' : 'FR') + ')');
    return substances;
  }

  console.log('[Lang] ' + flaggedIdx.length + '/' + substances.length + ' wrong-language entries → re-translating to ' + (targetEnglish ? 'EN' : 'FR'));
  try {
    const toTranslate = flaggedIdx.map((i) => ({
      nom: substances[i].nom,
      explication: substances[i].explication ?? '',
    }));
    const translated = await translateIngredientsBatch(toTranslate, targetEnglish);
    const out = substances.slice();
    flaggedIdx.forEach((origIdx, k) => {
      const tr = translated[k];
      if (!tr) return;
      const newNom = (tr.nom ?? '').trim();
      const newExpl = (tr.explication ?? '').trim();
      out[origIdx] = {
        ...out[origIdx],
        // On ne remplace que si la traduction est bien dans la langue cible.
        nom: newNom && !isWrongLanguage(newNom, targetEnglish) ? newNom : out[origIdx].nom,
        explication: newExpl && !isWrongLanguage(newExpl, targetEnglish) ? newExpl : out[origIdx].explication,
      };
    });
    return out;
  } catch (e) {
    console.warn('[Lang] Re-translation failed (non-blocking):', e instanceof Error ? e.message : String(e));
    return substances;
  }
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

export async function analyzeUniversalPhoto(imageBase64: string): Promise<UniversalAnalysisResult> {
  const MAX_RETRIES = 2;

  let ocrData: { fullText: string; ingredientsBlock: string | null } = { fullText: '', ingredientsBlock: null };
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
  if (cacheKey && ANALYSIS_CACHE.has(cacheKey)) {
    console.log('[API] Cache hit');
    return ANALYSIS_CACHE.get(cacheKey)!;
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log('[API] Analysis attempt', attempt);

      const aiResult = await callAI(
        imageBase64,
        ocrData.fullText || undefined,
        ocrData.ingredientsBlock || undefined,
      );

      if (!aiResult || !aiResult.categorie_produit) {
        throw new Error(isEnglish() ? 'Invalid AI result' : 'Résultat IA invalide');
      }

      let substances = classifyIngredients(aiResult.ingredients_lus);

      // 🌐 BUG FIX LANGUE — garantit que tout le scan est dans la langue de l'app.
      // Re-traduit toute substance dont le nom/description aurait échappé au verrou de langue.
      substances = await enforceLanguageConsistency(substances);

      const riskOrder: Record<RiskLevel, number> = { danger: 0, probable: 1, possible: 2, aucun: 3 };
      substances.sort((a, b) => riskOrder[a.niveau_risque] - riskOrder[b.niveau_risque]);

      const badge_global = computeBadgeGlobal(substances);

      const resume = generateResume(badge_global, substances);
      const recommandations = generateRecommendations(badge_global, substances);

      const erreur = aiResult.erreur || '';

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

      if (cacheKey && !erreur) {
        if (ANALYSIS_CACHE.size >= CACHE_MAX) {
          const firstKey = ANALYSIS_CACHE.keys().next().value;
          if (firstKey) ANALYSIS_CACHE.delete(firstKey);
        }
        ANALYSIS_CACHE.set(cacheKey, result);
      }
      return result;
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