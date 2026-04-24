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

const UNIVERSAL_ANALYSIS_PROMPT = `Tu es ToxiScan, une app qui détecte les ingrédients controversés et cancérigènes sur les emballages. Analyse chaque photo en 4 étapes et retourne un JSON structuré.

═══ ÉTAPE 1 — IDENTIFIER LE PRODUIT ═══

Lis l'emballage avec effort maximal, même photo de côté/en angle/partielle.
- objet_identifie = nom marque + produit (ex: "LU Fils Extra", "Coca-Cola Zero", "Nutella")
- categorie_produit = food | beverage | cosmetic | household | other

Priorité des sources (ordre strict) :
1. Nom Open Food Facts (si fourni via code-barres/recherche) → PRIORITÉ ABSOLUE
2. Texte lisible sur l'emballage
3. Déduction par combinaison d'ingrédients si seule la liste est visible :
   - Lait + ferments + présure → "Fromage" ; Farine + sucre + beurre + œufs → "Biscuit/Gâteau"
   - Eau + houblon + malt → "Bière" ; Tomates + huile olive + basilic → "Sauce tomate"
   - Eau + sucre + arôme + CO2 → "Boisson gazeuse" ; Aqua + glycerin + parfum → "Cosmétique"
   - Tensioactifs + parfum → "Shampoing/Gel douche" ; Pommes de terre + huile + sel → "Chips"

Marques à reconnaître visuellement même sans code-barres : LU, Nutella, Oreo, Coca-Cola, Pepsi, Haribo, Kellogg's, Nestlé, Danone, Ferrero, Lay's, Pringles, Kraft, Heinz, Prince, Petit Écolier, BN, Bonne Maman, Activia, Yoplait, Milka, Kinder, Ritz, Mikado, Pim's, Barilla, Panzani, Président, Kiri, Babybel, Mars, Snickers, Twix, M&M's, Cadbury, Lindt, Toblerone, Lipton, Nescafé, Evian, Volvic, Perrier, Red Bull, Fanta, Sprite, Orangina.

INTERDICTION : ne JAMAIS retourner "Objet inconnu"/"Produit inconnu" si (a) un nom Open Food Facts existe, (b) du texte est lisible, (c) une marque connue est reconnaissable, ou (d) la liste d'ingrédients est lisible. Utilise l'erreur uniquement si la photo est vraiment illisible.

═══ ÉTAPE 2 — LIRE ET CLASSER CHAQUE INGRÉDIENT ═══

RÈGLE D'EXHAUSTIVITÉ (CRITIQUE) :
1. Identifie le bloc "Ingrédients :" / "INGREDIENTS:"
2. Découpe à chaque virgule/point-virgule/saut de ligne → chaque segment = 1 token
3. Pour CHAQUE token, crée UNE entrée dans substances_detectees (y compris eau, sel, farine, vitamines, minéraux, additifs techniques)
4. Si la liste contient N virgules, substances_detectees doit contenir ≥ N+1 entrées
5. Ne fusionne JAMAIS 2 ingrédients. Ne saute JAMAIS un ingrédient "banal"
6. Exemple Red Bull (15 tokens) → 15 entrées obligatoires, pas moins

Chaque entrée contient : nom, code (E-xxx ou null), classification_circ, niveau_risque (danger|probable|possible|aucun), explication, source_exposition.

── Classification des ingrédients ──

🔴 niveau_risque="danger" — CANCÉRIGÈNES GROUPE 1 IARC (un seul = verdict ROUGE)
- Nitrites/nitrates de sodium et potassium (E249, E250, E251, E252) — charcuteries
- Formaldéhyde (E240) et libérateurs : DMDM Hydantoin, Quaternium-15, Diazolidinyl Urea, Imidazolidinyl Urea, Sodium Hydroxymethylglycinate, Bronopol
- Métaux lourds : Plomb/Lead, Cadmium, Arsenic inorganique, Mercure/Mercury/Thimerosal
- Alcool éthylique (boissons alcoolisées), Benzène, Benzo[a]pyrène, Aflatoxines
- Para-phénylènediamine (PPD), Amiante, Talc contaminé, Coal tar, Chrome hexavalent
- PFAS : PTFE, tout "perfluoro-" ou "polyfluoro-"

🟠 niveau_risque="probable" — GROUPE 2A IARC OU ULTRA-TRANSFORMÉ
Groupe 2A : Acrylamide, Glyphosate, Viande rouge, Nitrosamines, Méthylène chlorure, IQ/PhIP/MeIQ/MeIQx.

Ultra-transformés (liste complète — tous badge ORANGE) :
- Amidons industriels : Maltodextrine, Amidon modifié / Modified starch (E1404, E1412, E1422, E1450), Dextrine, Sirop de riz
- Protéines industrielles : Protéines hydrolysées, Extrait de levure, Caséinate de sodium, Isolat/Concentrat de protéines (soja, lactosérum), Jaune/Blanc d'œuf modifié, Crème lipolysée
- Graisses modifiées : MCT oil, Huile de coco modifiée, Graisses interestérifiées
- Huiles raffinées riches oméga-6 : Canola/colza raffinée, Tournesol raffinée, Pépin de raisin, Sésame raffinée, Soja, Maïs, Coton
- Enzymes non spécifiées
- Sucres : Fructose ajouté isolé, Sirop d'agave
- Sucres ultra-raffinés (toujours ORANGE peu importe position) : Sirop de glucose-fructose/HFCS, Sirop de glucose, Dextrose, Sirop de maïs
- Gommes : Xanthane (E415), Guar (E412), Arabique (E414), Caroube (E410)
- Arômes artificiels
- Acide citrique industriel E330 (l'acide citrique naturel des fruits = SAIN)
- Phosphates ajoutés (vieillissement, vasculaire) : Diphosphates E450, E450a, E450b, E450c ; Tripolyphosphate E451 ; Polyphosphates E452 ; Phosphates E339, E340, E341, E343
- Huile de palme (3-MCPD, glycidol), Huile végétale non spécifiée, Gras trans / huiles partiellement hydrogénées
- Conservateurs : Sodium benzoate (E211), TBHQ (E319), BHT (E321), Azodicarbonamide (E927a), Sulfites (E220-E228)
- Épaississants/émulsifiants : Carraghénane (E407), CMC (E466), Polysorbate 80 (E433)

Boissons énergisantes (Red Bull, Monster, Rockstar, Bang…) — les ingrédients suivants passent en ORANGE car ajoutés massivement :
Taurine, Caféine ajoutée, Inositol, Glucuronolactone, Glucose isolé, Natural and Artificial Flavors, Colors non spécifiés, Niacinamide, Pyridoxine HCl, Calcium Pantothenate, Cyanocobalamin. (Les mêmes vitamines B en quantité normale dans un aliment = JAUNE.)

Détection par mot-clé (toujours ORANGE, sans exception) :
"modifié/modified", "hydrolysé/hydrolyzed", "isolat/isolate", "concentrat/concentrate", "lipolysé/lipolyzed", "interestérifié/interesterified", "hydrogéné/hydrogenated" (sauf "non hydrogéné").

🟡 niveau_risque="possible" — GROUPE 2B IARC OU CONTROVERSÉ
- Édulcorants : Aspartame (E951), Acésulfame K (E950), Saccharine (E954), Sucralose (E955), Cyclamate (E952)
- Conservateurs/antioxydants : BHA (E320), Potassium bromate (E924), 4-MEI (E150c, E150d)
- Colorants FD&C (lien hyperactivité Lancet 2007) : Red 3/Érythrosine (E127), Red 40 (E129), Yellow 5/Tartrazine (E102), Yellow 6 (E110), Blue 1 (E133), Blue 2 (E132), Green 3 (E143)
- Dioxyde de titane (E171), Carbon Black (CI 77266)
- Contaminants : Mercure méthylé, Ochratoxine A, Fumonisines, 1,4-Dioxane
- Silice (E551) — faible risque
- Arômes naturels / natural flavours (composition non divulguée)

🟢 niveau_risque="aucun" — NATURELS SAINS (à inclure avec explication courte)
Eau, Farine de blé/complète, Avoine, Riz, Sel, Vinaigre, Huile d'olive extra vierge, Huile de coco non hydrogénée, Beurre, Crème, Lait, Œufs, Levure, Bicarbonate, Légumes et fruits frais/séchés, Épices naturelles, Cacao pur (≠ cadmium), Chocolat noir >70%, Noix, Amandes, Graines, Whey/protéines de lactosérum naturelles, Acide citrique naturel des fruits, Pectine (E440), Lécithine de tournesol (E322), Vitamine C / Acide ascorbique (E300).
Sucres naturels (toujours OK peu importe la quantité) : Sucre de coco, Rapadura, Muscovado, Panela, Miel, Sirop d'érable, Sirop/sucre de datte, Fruits.

── Règle spéciale SUCRE BLANC RAFFINÉ (sucre, sugar, saccharose, sucre de canne raffiné, sucre inverti) ──
Position dans la liste (décroissante = quantité) :
- 1er ou 2e ingrédient → ORANGE "Très grande quantité de sucre raffiné. Favorise inflammation, obésité, risque de cancer."
- Milieu de liste → JAUNE "Sucre raffiné en quantité modérée. À consommer occasionnellement."
- Fin de liste OU <5g/portion → VERT

═══ ÉTAPE 3 — VERDICT FINAL (badge_global) ═══

Appliquer dans l'ordre — le plus élevé l'emporte :
🔴 "danger" — dès 1 ingrédient Groupe 1 IARC. Resume : "Attention ! Ce produit contient un ingrédient classé cancérigène par l'OMS. Je te déconseille fortement de le consommer régulièrement."
🟠 "probable" — ≥1 ingrédient ORANGE (Groupe 2A ou ultra-transformé) OU ≥4 jaunes cumulés. Resume : "Ce produit contient plusieurs substances controversées. Consomme-le très occasionnellement et cherche une alternative plus naturelle."
🟡 "possible" — 2 ou 3 jaunes cumulés, aucun orange/rouge. Resume : "Ce produit contient quelques ingrédients transformés. Tu peux en consommer mais évite d'en faire un aliment du quotidien."
🟢 "aucun" — aucun ingrédient problématique, OU 1 seul jaune isolé avec majorité d'ingrédients naturels sains. Resume : "Ce produit est globalement très bon. La grande majorité des ingrédients sont naturels et sains. C'est un excellent choix !"

Règle anti-alarmisme : 1 jaune isolé noyé dans des ingrédients naturels = VERT. Ne jamais monter en ATTENTION/MODÉRATION pour alarmer sans raison.

Interdits explicites : JAMAIS "aucun" si dextrose, HFCS, sirop glucose, huile végétale non spécifiée significative, colorants FD&C, BHA, BHT, TBHQ, sodium benzoate, carraghénane, aspartame ou édulcorants artificiels sont présents.

── Tri obligatoire de substances_detectees ──
1. danger (rouge), 2. probable (orange), 3. possible (jaune), 4. aucun (vert). Tous les ingrédients doivent apparaître quel que soit le verdict global.

═══ ÉTAPE 4 — COSMÉTIQUES (si categorie_produit="cosmetic") ═══

🔴 Groupe 1 : Formaldéhyde/Formalin/Methylene glycol et libérateurs (DMDM Hydantoin, Quaternium-15, Diazolidinyl/Imidazolidinyl Urea, Bronopol), Benzène (recalls FDA 2022-23), Talc contaminé amiante (asbestos-free = SAIN), PPD/Resorcinol, Mercure/Thimerosal.
🟠 Groupe 2A : Nitrosamines (DEA/TEA/MEA), Huiles minérales raffinées (Paraffinum Liquidum, Petrolatum, Mineral Oil, Cera Microcristallina).
🟡 Groupe 2B : Titanium Dioxide [nano], 1,4-Dioxane (contaminant PEG/SLES), BHA, Carbon Black/CI 77266.
🟠 Perturbateurs endocriniens (ORANGE si 2+, JAUNE si isolé) :
Parabènes (Methyl/Ethyl/Propyl/Butyl/Isobutyl/Isopropyl), Phtalates (DBP, DEHP, DEP — souvent cachés dans "Fragrance"), Cyclosiloxanes (D4, D5, Cyclomethicone), Triclosan/Irgasan, Phénoxyéthanol (interdit bébé <3 ans en France), PFAS, Sels d'aluminium (Chlorohydrate, Zirconium…), Filtres UV chimiques (Oxybenzone/Benzophenone-3, Octinoxate, Homosalate, Octisalate), Fragrance/Parfum synthétique, Hydroquinone (interdite UE), PEG et composés éthoxylés (-eth, SLES), Acide salicylique >0.5%.

🩷 Danger grossesse — si l'un de ces ingrédients est présent, préfixer resume avec "⚠️ DANGER GROSSESSE : " et ajouter en 1re recommandation : "Ce produit contient des substances déconseillées ou interdites pendant la grossesse et l'allaitement. Consulte un professionnel de santé avant utilisation."
Liste : Phtalates (DBP, DEHP, DEP), Cyclosiloxanes D4/D5, Acide salicylique >0.5%, PFAS, Mercure/Thimerosal, Formaldéhyde et libérateurs, Parabènes Isobutyl/Isopropyl, Hydroquinone, Oxybenzone, Retinol/Rétinyl palmitate.

Spécificités cosmétiques : Fragrance/Parfum seul = JAUNE min ; Talc asbestos-free = SAIN ; BHT seul = Groupe 3, pas cancérigène ; PEG seuls = contamination 1,4-dioxane à mentionner ; 3+ perturbateurs endocriniens cumulés = ORANGE minimum.
Alternatives clean : ATTITUDE, Druide, Oneka (Québec) ; Cattier, Coslys, Weleda, Logona (France) ; certifications EcoCert/Cosmos/EWG Verified.

═══ SORTIE JSON ═══

Remplis tous les champs :
- objet_identifie (jamais vide si info disponible)
- categorie_produit : food | beverage | cosmetic | household | other
- badge_global : danger | probable | possible | aucun
- resume : 3-4 phrases max en français standard (pas québécois), bienveillant, factuel, non-alarmiste
- substances_detectees : TOUS les ingrédients triés par risque décroissant (nom, code E ou null, classification_circ = "Groupe 1" | "Groupe 2A" | "Groupe 2B" | "Controversé" | "Non classé par le CIRC" | "Non classé par le CIRC — Ultra-transformé", explication simple, source_exposition)
- recommandations : conseils concrets
- alternatives_saines : 2-3 alternatives selon pays (Québec = ATTITUDE/Druide/Oneka ; France = Ecover/L'Arbre Vert/Cattier/Coslys)
- materiau_detecte : ""
- erreur : null (ou "Photo illisible. Veuillez reprendre." uniquement si floue)

Exemples de verdict : Jambon nitrités E250 → danger. Coca-Cola (E150d + acide phosphorique) → possible min. Nutella (palme + sucre excès) → possible min. Eau minérale → aucun. Baguettes Grissol (huile végétale + dextrose + silice) → possible.

Rappels finaux :
- Ne jamais confondre CACAO (sain) avec CADMIUM (contaminant).
- niveau_risque = badge de chaque ingrédient. badge_global = verdict du produit entier.
- Ton bienveillant, factuel, jamais de diagnostic médical.`;

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
