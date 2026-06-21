export type RiskGroup = 'group1' | 'group2a' | 'group2b' | 'none';

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
  resume: string;
  recommandations: string[];
  alternatives_sures: string[];
  alternatives_saines?: HealthyAlternative[];
  erreur?: string;
}

export interface RiskBadge {
  group: RiskGroup;
  label: string;
  sublabel: string;
  color: string;
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
}

export interface HealthyAlternative {
  nom: string;
  raison: string;
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
    verdictLevel: 'danger' | 'warning' | 'moderation' | 'approuve';
    analysisSummary?: string;
  };
}

