import * as Localization from 'expo-localization';
import { Platform } from 'react-native';

export type UserRegion = 'quebec' | 'france' | 'usa' | 'belgium' | 'switzerland' | 'canada_other';
export type UserLanguage = 'fr_quebec' | 'fr_france' | 'en' | 'fr_belgium' | 'fr_switzerland';

interface RegionInfo {
  region: UserRegion;
  language: UserLanguage;
  languageCode: string;
  regionCode: string;
}

let cachedRegionInfo: RegionInfo | null = null;

export function detectRegion(): RegionInfo {
  if (cachedRegionInfo) return cachedRegionInfo;

  try {
    const locales = Localization.getLocales();
    const locale = locales?.[0];
    const regionCode = (locale?.regionCode ?? '').toUpperCase();
    const languageCode = (locale?.languageCode ?? '').toLowerCase();

    console.log('[RegionDetection] regionCode:', regionCode, 'languageCode:', languageCode);

    let region: UserRegion;
    let language: UserLanguage;

    if (regionCode === 'CA') {
      if (languageCode === 'fr') {
        region = 'quebec';
        language = 'fr_quebec';
      } else {
        region = 'canada_other';
        language = 'en';
      }
    } else if (regionCode === 'US') {
      region = 'usa';
      language = languageCode === 'fr' ? 'fr_france' : 'en';
    } else if (regionCode === 'FR') {
      region = 'france';
      language = 'fr_france';
    } else if (regionCode === 'BE') {
      region = 'belgium';
      language = languageCode === 'fr' ? 'fr_belgium' : 'fr_belgium';
    } else if (regionCode === 'CH') {
      region = 'switzerland';
      language = languageCode === 'fr' ? 'fr_switzerland' : 'fr_switzerland';
    } else if (languageCode === 'fr') {
      region = 'france';
      language = 'fr_france';
    } else if (languageCode === 'en') {
      region = 'usa';
      language = 'en';
    } else {
      region = 'usa';
      language = 'en';
    }

    console.log('[RegionDetection] Detected region:', region, 'language:', language);
    cachedRegionInfo = { region, language, languageCode, regionCode };
    return cachedRegionInfo;
  } catch (e) {
    console.log('[RegionDetection] Error:', e);
    cachedRegionInfo = { region: 'france', language: 'fr_france', languageCode: 'fr', regionCode: '' };
    return cachedRegionInfo;
  }
}

export function getRegionStores(region: UserRegion): string[] {
  switch (region) {
    case 'quebec':
      return ['IGA', 'Metro', 'Maxi', 'Provigo', 'Costco', 'Jean Coutu', 'Pharmaprix', 'Avril Supermarché Santé', 'Rachelle Béry'];
    case 'canada_other':
      return ['Whole Foods', 'Costco', 'Walmart', 'Loblaws', 'Shoppers Drug Mart', 'Real Canadian Superstore'];
    case 'france':
      return ['Carrefour', 'Monoprix', 'Leclerc', 'Intermarché', 'Biocoop', 'Naturalia', 'La Vie Claire', 'Auchan'];
    case 'usa':
      return ['Whole Foods', 'Walmart', 'Target', 'CVS', 'Trader Joe\'s', 'Costco', 'Sprouts'];
    case 'belgium':
      return ['Delhaize', 'Colruyt', 'Carrefour Belgique', 'Bio-Planet', 'Aldi', 'Lidl'];
    case 'switzerland':
      return ['Migros', 'Coop', 'Denner', 'Aldi Suisse', 'Manor'];
  }
}

export function getRegionSpecialtyStores(region: UserRegion): string[] {
  switch (region) {
    case 'quebec':
      return ['Avril Supermarché Santé', 'Rachelle Béry', 'Tau Aliments Naturels'];
    case 'canada_other':
      return ['Whole Foods', 'Nature\'s Fare Markets'];
    case 'france':
      return ['Biocoop', 'Naturalia', 'La Vie Claire', 'Bio c\' Bon', 'Marcel & Fils'];
    case 'usa':
      return ['Whole Foods', 'Sprouts Farmers Market', 'Natural Grocers', 'Trader Joe\'s'];
    case 'belgium':
      return ['Bio-Planet', 'Séquoia'];
    case 'switzerland':
      return ['Alnatura'];
  }
}

export function getRegionGroceryStores(region: UserRegion): string[] {
  switch (region) {
    case 'quebec':
      return ['IGA', 'Metro', 'Provigo', 'Maxi'];
    case 'canada_other':
      return ['Loblaws', 'Real Canadian Superstore', 'Walmart'];
    case 'france':
      return ['Carrefour Bio', 'Auchan Bio', 'Leclerc Bio', 'Monoprix Bio'];
    case 'usa':
      return ['Walmart', 'Target', 'Kroger', 'Costco'];
    case 'belgium':
      return ['Delhaize Bio', 'Colruyt', 'Carrefour Bio BE'];
    case 'switzerland':
      return ['Migros Bio', 'Coop Naturaplan'];
  }
}

export function getRegionCleanBrands(region: UserRegion, isHouseholdOrCosmetic: boolean): string[] {
  if (isHouseholdOrCosmetic) {
    switch (region) {
      case 'quebec':
      case 'canada_other':
        return ['ATTITUDE', 'The Unscented Company', 'Druide', 'Oneka'];
      case 'france':
        return ['Ecover', 'L\'Arbre Vert', 'Cattier', 'Coslys'];
      case 'usa':
        return ['Seventh Generation', 'Mrs. Meyer\'s', 'Dr. Bronner\'s', 'Method'];
      case 'belgium':
        return ['Ecover', 'Rainett', 'Kneipp', 'Weleda'];
      case 'switzerland':
        return ['Held', 'Klar', 'Weleda'];
    }
  }

  switch (region) {
    case 'quebec':
      return ['La Fourmi Bionique', 'GoGo Quinoa', 'Fontaine Santé', 'Liberté Bio'];
    case 'canada_other':
      return ['Nature\'s Path', 'Earth\'s Own', 'PC Organics'];
    case 'france':
      return ['Bjorg', 'Bonneterre', 'Priméal', 'Jardin Bio'];
    case 'usa':
      return ['365 by Whole Foods', 'Annie\'s', 'Nature\'s Path', 'Bob\'s Red Mill'];
    case 'belgium':
      return ['Boni Bio', 'Delhaize Bio'];
    case 'switzerland':
      return ['Migros Bio', 'Coop Naturaplan'];
  }
}

export function getRegionLocalMarkets(region: UserRegion): string[] {
  switch (region) {
    case 'quebec':
      return ['Marché Jean-Talon', 'Marché Atwater'];
    case 'canada_other':
      return ['Local farmers\' markets'];
    case 'france':
      return ['Marchés locaux', 'AMAP'];
    case 'usa':
      return ['Local farmers\' markets'];
    case 'belgium':
      return ['Marchés locaux'];
    case 'switzerland':
      return ['Marchés locaux'];
  }
}

export function getLanguageInstruction(language: UserLanguage): string {
  switch (language) {
    case 'fr_quebec':
      return `LANGUE : Tu DOIS répondre en français standard international (PAS en québécois). Tutoiement. Vocabulaire et syntaxe d'un médecin ou nutritionniste français. JAMAIS de québécismes : interdits "t'sais", "genre", "faque", "pantoute", "tantôt" (au sens québécois), "pogner", "magasiner", "char", "présentement", "chum", "blonde", "dépanneur". Toujours négations complètes ("je n'ai pas", jamais "j'ai pas"). Prix en CAD $. L'utilisateur est au Québec/Canada francophone : recommande UNIQUEMENT des produits disponibles chez IGA, Metro, Maxi, Provigo, Costco Canada, Jean Coutu, Pharmaprix, Avril, Rachelle Béry. Exemples : "Tu peux trouver du jambon sans nitrites chez IGA en section bio", "Le chocolat noir Lindt est disponible chez Metro".`;
    case 'fr_france':
      return `LANGUE : Tu DOIS répondre en français standard (France). Tutoiement. Expressions naturelles : "regarde", "en gros", "concrètement", "du coup", "pas de panique". Prix en EUR. L'utilisateur est en France : recommande UNIQUEMENT des produits disponibles chez Carrefour, Monoprix, Leclerc, Intermarché, Auchan, Biocoop, Naturalia, La Vie Claire. Exemples : "Tu trouveras ça chez Biocoop ou en rayon bio de Carrefour". Ne JAMAIS utiliser des québécismes.`;
    case 'fr_belgium':
      return `LANGUE : Tu DOIS répondre en français de France (pas en québécois). Tutoiement. Style naturel et courant. Prix en EUR. L'utilisateur est en Belgique : recommande UNIQUEMENT des produits disponibles chez Delhaize, Colruyt, Carrefour Belgique, Bio-Planet. Exemples : "Tu trouveras ça chez Delhaize en section bio".`;
    case 'fr_switzerland':
      return `LANGUE : Tu DOIS répondre en français de France (pas en québécois). Tutoiement. Style naturel et courant. Prix en CHF. L'utilisateur est en Suisse : recommande UNIQUEMENT des produits disponibles chez Migros, Coop, Denner, Manor. Exemples : "Tu trouveras ça chez Migros ou Coop Naturaplan".`;
    case 'en':
      return `LANGUAGE: You MUST respond in English. Be friendly, use "you", warm and professional tone. Prices in USD $ (or CAD $ if user is in Canada). The user is in the United States or English Canada: ONLY recommend products available at Whole Foods, Trader Joe's, Walmart, Target, Costco USA, Sprouts, CVS (or Loblaws, Real Canadian Superstore, Walmart Canada if Canada). Examples: "You can find this at Whole Foods or Trader Joe's". Never respond in French. All product names, store names, and recommendations must be relevant to the North American market.`;
  }
}

export function getRegionStoreContext(region: UserRegion): string {
  const stores = getRegionStores(region);
  const specialty = getRegionSpecialtyStores(region);
  const grocery = getRegionGroceryStores(region);
  const brands = getRegionCleanBrands(region, false);

  const regionName = {
    quebec: 'Québec/Canada',
    canada_other: 'Canada (English)',
    france: 'France',
    usa: 'United States',
    belgium: 'Belgique',
    switzerland: 'Suisse',
  }[region];

  return `RÉGION DE L'UTILISATEUR : ${regionName}
Magasins disponibles : ${stores.join(', ')}
Magasins spécialisés bio/santé : ${specialty.join(', ')}
Sections bio en épicerie : ${grocery.join(', ')}
Marques clean recommandées : ${brands.join(', ')}
RÈGLE : Toutes les alternatives et recommandations de magasins DOIVENT correspondre à la région de l'utilisateur (${regionName}). Ne JAMAIS recommander des magasins qui n'existent pas dans cette région.`;
}

export function getAnalysisRegionPrompt(): string {
  const { region, language } = detectRegion();
  const storeContext = getRegionStoreContext(region);
  const langInstruction = getLanguageInstruction(language);

  return `\n\n--- CONTEXTE RÉGIONAL AUTOMATIQUE ---\n${storeContext}\n${langInstruction}\nIMPORTANT : Le résumé (resume), les recommandations et les alternatives doivent être dans la langue de l'utilisateur et référencer uniquement des magasins/marques de sa région.`;
}

export function getChatRegionPrompt(): string {
  const { region, language, regionCode } = detectRegion();
  const storeContext = getRegionStoreContext(region);
  const langInstruction = getLanguageInstruction(language);

  const hasLocation = regionCode && regionCode.length > 0;

  const geoRules = hasLocation
    ? `\n\n--- RÈGLES STRICTES DE GÉOLOCALISATION ---\n1. La localisation de l'utilisateur a été détectée par l'appareil. NE JAMAIS demander "où te trouves-tu ?".\n2. Toutes les recommandations de produits alternatifs DOIVENT correspondre au pays détecté ci-dessus.\n3. Ne JAMAIS recommander un magasin ou une marque qui n'existe pas dans le pays de l'utilisateur — c'est inutile et frustrant pour lui.\n4. Ne JAMAIS mélanger les enseignes entre pays (ex : ne pas citer Carrefour à un utilisateur québécois, ne pas citer IGA à un utilisateur français).\n5. Adapte la langue de réponse à la région détectée selon la règle LANGUE ci-dessus.`
    : `\n\n--- RÈGLES STRICTES DE GÉOLOCALISATION ---\n1. La localisation de l'utilisateur n'a PAS pu être détectée automatiquement.\n2. Avant de recommander un produit alternatif ou une enseigne, demande poliment à l'utilisateur dans quel pays il se trouve (France, Belgique, Suisse, Québec/Canada, États-Unis, autre).\n3. Une fois le pays connu, adapte TOUTES tes recommandations aux enseignes de ce pays uniquement.\n4. Ne JAMAIS inventer des enseignes, ne jamais mélanger les pays.`;

  return `\n\n--- DÉTECTION AUTOMATIQUE DE RÉGION ET LANGUE ---\nLa région et la langue de l'utilisateur ont été détectées automatiquement par l'appareil.\n${storeContext}\n${langInstruction}${geoRules}`;
}
