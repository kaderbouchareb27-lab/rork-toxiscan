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
      return `LANGUE : Tu DOIS répondre en français québécois. Tutoiement obligatoire. Utilise des expressions naturelles québécoises : "check ça", "c'est correct", "t'sais", "let's go", "pas de stress", "pour vrai". Prix en CAD $. Références aux épiceries et marques québécoises (IGA, Metro, Maxi, Provigo, Costco, Jean Coutu, Pharmaprix). Ne JAMAIS utiliser des expressions européennes comme "du coup", "en gros".`;
    case 'fr_france':
      return `LANGUE : Tu DOIS répondre en français standard (France). Tutoiement. Expressions naturelles : "regarde", "en gros", "concrètement", "du coup", "pas de panique". Prix en EUR. Références aux magasins français (Carrefour, Monoprix, Leclerc, Intermarché, Biocoop, Naturalia). Ne JAMAIS utiliser des québécismes.`;
    case 'fr_belgium':
      return `LANGUE : Tu DOIS répondre en français. Tutoiement. Style naturel et courant. Prix en EUR. Références aux magasins belges (Delhaize, Colruyt, Carrefour Belgique, Bio-Planet).`;
    case 'fr_switzerland':
      return `LANGUE : Tu DOIS répondre en français. Tutoiement. Style naturel et courant. Prix en CHF. Références aux magasins suisses (Migros, Coop, Denner).`;
    case 'en':
      return `LANGUAGE: You MUST respond in English. Be friendly and use "you". Prices in USD $. Reference stores available in the user's region (Whole Foods, Walmart, Target, CVS, Trader Joe's, Costco, Sprouts). Never respond in French. All product names, store names, and recommendations must be relevant to the North American market.`;
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
  const { region, language } = detectRegion();
  const storeContext = getRegionStoreContext(region);
  const langInstruction = getLanguageInstruction(language);

  return `\n\n--- DÉTECTION AUTOMATIQUE DE RÉGION ET LANGUE ---\nLa région et la langue de l'utilisateur ont été détectées automatiquement par l'appareil. Tu n'as PAS besoin de demander.\n${storeContext}\n${langInstruction}`;
}
