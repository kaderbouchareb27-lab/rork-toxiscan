import { ScannedProduct, DetectedIngredient, UniversalAnalysisResult, ProductCategory, SubstanceDetected, RiskGroup } from '@/types';
import { niveauRisqueToGroup } from '@/constants/additives';
import { z } from 'zod';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { lookupBarcode, formatOpenFactsContext, OpenFactsResult } from '@/utils/openFoodFacts';

const universalAnalysisSchema = z.object({
  categorie_produit: z.enum(['food', 'beverage', 'kitchen_utensil', 'container', 'clothing', 'cosmetic', 'household', 'electronics', 'furniture', 'toy', 'other']),
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

const UNIVERSAL_ANALYSIS_PROMPT = `Tu es un détecteur universel de substances cancérigènes et nocives pour l'application ToxiScan. Tu dois être JUSTE et INTELLIGENT dans ton analyse : strict sur les vrais dangers, rassurant sur les produits naturels.

L'utilisateur photographie N'IMPORTE QUEL objet du quotidien. Tu dois identifier l'objet ET analyser ses risques.

CATÉGORIES D'OBJETS À RECONNAÎTRE :

1. ALIMENTS ET BOISSONS (categorie: "food" ou "beverage") :
   - Listes d'ingrédients, produits alimentaires, boissons
   - Analyser : additifs, conservateurs, édulcorants, colorants, exhausteurs de gout, huiles

2. USTENSILES DE CUISINE (categorie: "kitchen_utensil") :
   - Poêles : Teflon/PTFE rayé = DANGER (PFOA, Groupe 2B), fonte/inox/céramique = sûr
   - Friteuses : plastique à haute température = risque, verre/inox = sûr
   - Casseroles : aluminium = controversé (lien Alzheimer), inox/fonte = sûr
   - Moules silicone : risque à haute température (>200°C), libération de formaldéhyde possible
   - Planches à découper : plastique rayé = microplastiques, bois = sûr
   - Spatules/ustensiles : plastique chauffé = risque (migration de substances), bois/inox = sûr
   - Film plastique : PVC avec phtalates, éviter au contact chaleur
   - Papier aluminium : migration d'aluminium si contact acide/chaleur
   - Papier parchemin/cuisson : généralement sûr sauf si blanchi au chlore

3. CONTENANTS (categorie: "container") :
   - Bouteilles plastique : BPA, phtalates, surtout si exposées au soleil/chaleur
   - Tupperware/contenants plastique : risque au micro-ondes
   - Contenants en verre : sûr (BONUS POSITIF, mentionner que c'est un excellent choix)
   - Canettes aluminium : revêtement intérieur BPA (Groupe 2B)
   - Boîtes de conserve : revêtement intérieur BPA ou BPS

4. VÊTEMENTS ET TEXTILES (categorie: "clothing") :
   - Polyester : microplastiques, antimoine (Groupe 2B)
   - Vêtements neufs non lavés : formaldéhyde (Groupe 1)
   - Teintures azoïques : amines aromatiques cancérigènes (Groupe 1)
   - Cuir traité : chrome hexavalent (Groupe 1)
   - Coton conventionnel : résidus de pesticides possibles
   - Coton bio, lin, chanvre : sûrs

5. COSMÉTIQUES ET HYGIÈNE (categorie: "cosmetic") :
   - Parabènes, formaldéhyde, triclosan, talc, filtres UV chimiques

6. PRODUITS MÉNAGERS (categorie: "household") :
   - Désodorisants, bougies parfumées (formaldéhyde, benzène)
   - Produits de nettoyage (2-butoxyéthanol, formaldéhyde)

7. ÉLECTRONIQUE (categorie: "electronics") :
   - Retardateurs de flamme bromés, cadmium

8. MEUBLES (categorie: "furniture") :
   - Panneaux MDF/aggloméré : formaldéhyde (Groupe 1)
   - Mousses polyuréthane : isocyanates, retardateurs de flamme

9. JOUETS (categorie: "toy") :
   - Plastique PVC souple : phtalates
   - Peintures : plomb possible

INGRÉDIENTS NATURELS ET INOFFENSIFS — NE JAMAIS SIGNALER COMME PROBLÉMATIQUES :
Ces ingrédients sont NATURELS et NE DOIVENT PAS déclencher un badge jaune ou plus, ni compter dans le cumul de substances controversées :
- Sucre / sucre de canne en petite quantité dans un produit naturel (cornichons, sauce tomate, moutarde, vinaigrettes) = NORMAL, c'est VERT
- Sel / chlorure de sodium en quantité normale
- Vinaigre / vinaigre de cidre / vinaigre blanc / vinaigre balsamique
- Eau
- Épices naturelles (poivre, curcuma, paprika, cannelle, muscade, etc.)
- Herbes aromatiques (persil, basilic, thym, laurier, aneth, etc.)
- Légumes, fruits, oignons, ail, échalotes
- Huile d'olive / huile de coco / beurre
- Moutarde
- Jus de citron naturel
- Contenant en verre = BONUS POSITIF (pas de migration de substances, excellent choix)

RÈGLE CLÉ : Un produit avec des ingrédients simples et naturels (eau, sel, vinaigre, sucre en petite quantité, épices, légumes) sans additifs chimiques = badge_global: "aucun" (VERT). Même si le produit contient du sucre ou du sel, si c'est un produit naturel avec une liste d'ingrédients courte et simple, c'est VERT.
1 seul ingrédient légèrement controversé dans un produit autrement 100% naturel = rester VERT.

SUBSTANCES VÉRITABLEMENT PROBLÉMATIQUES À SIGNALER EN "probable" (ORANGE) :
- Glutamate monosodique / MSG / E621 : excitotoxine, maux de tête, obésité, lésions neurologiques
- Maltodextrine : indice glycémique plus élevé que le sucre, inflammation intestinale
- Huile de tournesol : riche en oméga-6 pro-inflammatoire, inflammation chronique
- Huile de canola / colza : ultra-transformée, pro-inflammatoire
- Huile de soja : pro-inflammatoire, souvent OGM
- Huile de maïs : pro-inflammatoire, souvent OGM
- Disodium inosinate / E631 : exhausteur de goût synthétique, toujours combiné avec MSG
- Disodium guanylate / E627 : exhausteur de goût synthétique, toujours combiné avec MSG
- Acide citrique industriel (produit par Aspergillus niger) : mycotoxines résiduelles possibles, irritant digestif
- Arôme naturel / arôme artificiel : terme trompeur, peut contenir des dizaines de substances chimiques cachées

SUBSTANCES À SIGNALER EN "possible" (JAUNE) MINIMUM :
- Aspartame / E951, Sucralose / E955 : édulcorants controversés
- BHA / E320, BHT / E321 : conservateurs controversés
- E150c, E150d : caramel avec 4-MEI potentiellement cancérigène
- Dioxyde de titane / E171
- Colorants azoïques (E102, E110, E129, E127)
- Carraghénine / E407, Polysorbate 80 / E433
- Extrait de levure : forme cachée de glutamate
- Annatto / E160b : colorant naturel mais réactions allergiques possibles

RÈGLE DU CUMUL (substances VÉRITABLEMENT problématiques uniquement, PAS les ingrédients naturels) :
- 3 à 4 substances véritablement problématiques → badge_global: "probable" (ORANGE)
- 5 substances véritablement problématiques ou plus → badge_global: "danger" (ROUGE)
ATTENTION : Le sucre, le sel, le vinaigre, les épices, l'eau, les légumes NE COMPTENT PAS dans le cumul. Seuls les additifs chimiques, exhausteurs de goût, colorants artificiels, huiles industrielles et conservateurs synthétiques comptent.

LOGIQUE DE BADGE (dans cet ordre, du plus grave au moins grave) :
1. Au moins un Groupe 1 CIRC → badge_global: "danger"
2. 5 substances véritablement problématiques ou plus → badge_global: "danger"
3. Au moins un Groupe 2A CIRC ou une substance classée orange → badge_global: "probable"
4. 3 ou 4 substances véritablement problématiques → badge_global: "probable"
5. Au moins un Groupe 2B CIRC ou 1-2 substances classées jaune → badge_global: "possible"
6. Produit naturel avec ingrédients simples, pas d'additifs chimiques → badge_global: "aucun"

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
- Contenant plastique → "Contenant en verre" ou "Contenant en inox" (même catégorie : contenant)
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
  console.log('[API] Calling generateObject (toolkit SDK) for universal analysis...');
  if (openFactsContext) {
    console.log('[API] Including Open Food Facts data in analysis prompt');
  }

  const promptParts: string[] = [UNIVERSAL_ANALYSIS_PROMPT];
  if (openFactsContext) {
    promptParts.push('\n\n' + openFactsContext);
    promptParts.push('\nIMPORTANT : Tu as reçu des données Open Food Facts pour ce produit. Utilise la LISTE COMPLÈTE des ingrédients fournie par Open Food Facts pour une analyse plus précise. Croise ces données avec ta propre analyse visuelle de la photo. Si tu détectes des ingrédients sur la photo qui ne sont pas dans Open Food Facts, ajoute-les. Si Open Food Facts liste des additifs que tu ne vois pas sur la photo, inclus-les quand même car la base de données est fiable. Ta PRIORITÉ reste de chercher les substances cancérigènes et toxiques de notre base ToxiScan.');
  }

  const result = await generateObject({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptParts.join('') },
          { type: 'image', image: imageBase64 },
        ],
      },
    ],
    schema: universalAnalysisSchema,
  });
  console.log('[API] generateObject returned successfully');
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

    const barcodeResult = await generateObject({
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
        objet_identifie: 'Objet non identifié',
        materiau_detecte: '',
        substances_detectees: [],
        badge_global: 'aucun',
        resume: '',
        recommandations: [],
        alternatives_sures: [],
        erreur: 'L\'analyse a échoué après plusieurs tentatives. Veuillez reprendre la photo avec un meilleur éclairage et réessayer.',
      };
    }
  }

  return {
    categorie_produit: 'other',
    objet_identifie: 'Objet non identifié',
    materiau_detecte: '',
    substances_detectees: [],
    badge_global: 'aucun',
    resume: '',
    recommandations: [],
    alternatives_sures: [],
    erreur: 'L\'analyse a échoué. Veuillez réessayer.',
  };
}

function applyCumulativeRule(riskGroup: RiskGroup, controversialCount: number): RiskGroup {
  const groupPriority: Record<RiskGroup, number> = { group1: 3, group2a: 2, group2b: 1, none: 0 };
  if (controversialCount >= 5 && groupPriority[riskGroup] < groupPriority['group1']) {
    console.log('[API] Cumulative rule applied: ' + controversialCount + ' controversial substances (5+), upgrading to RED');
    return 'group1';
  }
  if (controversialCount >= 3 && groupPriority[riskGroup] < groupPriority['group2a']) {
    console.log('[API] Cumulative rule applied: ' + controversialCount + ' controversial substances (3+), upgrading to ORANGE');
    return 'group2a';
  }
  return riskGroup;
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  food: 'Aliment',
  beverage: 'Boisson',
  kitchen_utensil: 'Ustensile de cuisine',
  container: 'Contenant',
  clothing: 'Vêtement / Textile',
  cosmetic: 'Cosmétique / Hygiène',
  household: 'Produit ménager',
  electronics: 'Électronique',
  furniture: 'Meuble',
  toy: 'Jouet',
  other: 'Autre',
};

export function getCategoryLabel(category: ProductCategory): string {
  return CATEGORY_LABELS[category] ?? 'Autre';
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
    : getCategoryLabel(result.categorie_produit);

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
