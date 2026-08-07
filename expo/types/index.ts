export type RiskGroup = 'group1' | 'group2a' | 'group2b' | 'none';

/**
 * 5-tier food verdict hierarchy (least → most severe):
 * approved 🟢 → moderation 🟡 → processed 🟠 → ultra_toxic 🟥 (bordeaux —
 * IARC 2A/2B or massive ultra-processing, one step below confirmed carcinogen) →
 * carcinogenic 🔴 (IARC Group 1 only).
 */
export type VerdictTier =
  | 'approved'
  | 'moderation'
  | 'processed'
  | 'ultra_toxic'
  | 'carcinogenic';

export type ScanMethod = 'barcode' | 'photo';

export type PhotoType = 'ingredients' | 'front' | 'unknown';

export type ProductCategory = 
  | 'food'
  | 'beverage'
  | 'kitchen_utensil'
  | 'clothing'
  | 'cosmetic'
  | 'household'
  | 'electronics'
  | 'furniture'
  | 'toy'
  | 'other';

export interface SubstanceDetected {
  nom: string;
  code: string | null;
  classification_circ: string;
  niveau_risque: 'danger' | 'probable' | 'possible' | 'aucun';
  explication: string | null;
  source_exposition: string | null;
  /** True while the AI description for this ingredient is still loading (unknown ingredient). */
  descriptionPending?: boolean;
}

export type AdditiveCategory = 'food' | 'cosmetic' | 'household' | 'kitchen' | 'textile' | 'packaging';

export interface AdditiveInfo {
  code: string;
  name: string;
  group: RiskGroup;
  category: AdditiveCategory;
  description: string;
  descriptionEn?: string;
  descriptionKo?: string;
}

export interface DetectedIngredient {
  nom: string;
  code: string | null;
  classification_circ: string;
  niveau_risque: 'danger' | 'probable' | 'possible' | 'aucun';
  explication: string | null;
  /** True while the AI description for this ingredient is still loading (unknown ingredient). */
  descriptionPending?: boolean;
}

export interface UniversalAnalysisResult {
  categorie_produit: ProductCategory;
  objet_identifie: string;
  materiau_detecte: string;
  substances_detectees: SubstanceDetected[];
  badge_global: 'danger' | 'probable' | 'possible' | 'aucun';
  /** 6-tier verdict (food engine). Legacy badge_global is derived from it for storage compat. */
  verdict_tier?: VerdictTier;
  resume: string;
  recommandations: string[];
  alternatives_sures: string[];
  alternatives_saines?: HealthyAlternative[];
  erreur?: string;
}

export interface ScannedProduct {
  barcode: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  riskGroup: RiskGroup;
  detectedAdditives: AdditiveInfo[];
  scannedAt: string;
  categories: string;
  ingredientsText: string;
  scanMethod: ScanMethod;
  photoUri?: string;
  thumbnailBase64?: string;
  detectedIngredients?: DetectedIngredient[];
  analysisSummary?: string;
  photoType?: PhotoType;
  productCategory?: ProductCategory;
  objectIdentified?: string;
  materialDetected?: string;
  substances?: SubstanceDetected[];
  recommendations?: string[];
  saferAlternatives?: string[];
  healthyAlternatives?: HealthyAlternative[];
  isFavorite?: boolean;
  /** 6-tier verdict computed by the deterministic engine. Older scans derive it from riskGroup. */
  verdictTier?: VerdictTier;
  /**
   * True while the very first verdict is still being computed (OCR read nothing usable, so the
   * product screen opens immediately in an explicit "analysing" state instead of freezing on a
   * full-screen spinner). Cleared as soon as the AI result is merged.
   */
  analysisPending?: boolean;
}

export interface HealthyAlternative {
  nom: string;
  raison: string;
  /** Real store where this exact product can be bought (e.g. "Walmart", "Target", "Carrefour"). */
  magasin?: string;
  /** Direct URL to a real packaging photo of the product, found via web search. */
  imageUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  imageUri?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  productContext?: {
    name: string;
    brand: string;
    barcode: string;
    verdictLevel: 'danger' | 'warning' | 'moderation' | 'approuve' | 'ultratoxic';
    analysisSummary?: string;
  };
}

