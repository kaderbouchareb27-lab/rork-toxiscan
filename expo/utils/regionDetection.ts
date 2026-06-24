import * as Localization from 'expo-localization';
import { Platform } from 'react-native';
import { getDeviceLanguage } from '@/utils/i18n';

export type UserRegion = 'quebec' | 'france' | 'usa' | 'belgium' | 'switzerland' | 'canada_other' | 'korea';
export type UserLanguage = 'fr_quebec' | 'fr_france' | 'en' | 'fr_belgium' | 'fr_switzerland' | 'ko';

interface RegionInfo {
  region: UserRegion;
  language: UserLanguage;
  languageCode: string;
  regionCode: string;
}

let cachedRegionInfo: RegionInfo | null = null;

export interface UserLocation {
  city: string | null;
  subregion: string | null; // state / province / region
  country: string | null;
  countryCode: string | null;
  latitude?: number;
  longitude?: number;
}

let cachedUserLocation: UserLocation | null = null;

export function setCachedUserLocation(loc: UserLocation | null): void {
  cachedUserLocation = loc;
  // Invalidate region cache so it can pick up location-derived country
  if (loc?.countryCode) cachedRegionInfo = null;
}

export function getCachedUserLocation(): UserLocation | null {
  return cachedUserLocation;
}

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

    if (languageCode === 'ko' || regionCode === 'KR') {
      region = 'korea';
      language = 'ko';
    } else if (regionCode === 'CA') {
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

/**
 * Determines which region's STORES / BRANDS / MARKETS to suggest.
 *
 * Unlike {@link detectRegion} (which is driven by the device LANGUAGE), this
 * prefers the user's real GPS location. So an English-language phone physically
 * in Quebec still gets Quebec stores (IGA, Metro, Avril, Marché Jean-Talon)
 * instead of the generic English-Canada list (which includes BC-only chains
 * like Nature's Fare Markets). The UI language is intentionally NOT affected —
 * only which stores are shown. Falls back to locale-based region when GPS is
 * unavailable.
 */
export function getStoreRegion(): UserRegion {
  const loc = cachedUserLocation;
  const countryCode = (loc?.countryCode ?? '').toUpperCase();
  const subregion = (loc?.subregion ?? '').toLowerCase();

  switch (countryCode) {
    case 'CA':
      return subregion.includes('quebec') || subregion.includes('québec') || subregion === 'qc'
        ? 'quebec'
        : 'canada_other';
    case 'US':
      return 'usa';
    case 'FR':
      return 'france';
    case 'BE':
      return 'belgium';
    case 'CH':
      return 'switzerland';
    case 'KR':
      return 'korea';
    default:
      return detectRegion().region;
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
      return ['Whole Foods Market', 'Sprouts Farmers Market', 'Natural Grocers', 'The Fresh Market', 'Earth Fare', 'Trader Joe\'s', 'Target', 'Walmart', 'Kroger', 'Costco', 'Thrive Market'];
    case 'belgium':
      return ['Delhaize', 'Colruyt', 'Carrefour Belgique', 'Bio-Planet', 'Aldi', 'Lidl'];
    case 'switzerland':
      return ['Migros', 'Coop', 'Denner', 'Aldi Suisse', 'Manor'];
    case 'korea':
      return ['이마트', '홈플러스', '롯데마트', '코스트코', '쿠팡', '마켓컬리', '한살림', '초록마을', '자연드림', '올리브영'];
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
      return ['Whole Foods Market', 'Sprouts Farmers Market', 'Natural Grocers', 'The Fresh Market', 'Earth Fare', 'Thrive Market (online)'];
    case 'belgium':
      return ['Bio-Planet', 'Séquoia'];
    case 'switzerland':
      return ['Alnatura'];
    case 'korea':
      return ['한살림', '초록마을', '자연드림(iCOOP)', '올가홀푸드', '아이허브'];
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
      return ['Trader Joe\'s', 'Target (Good & Gather organic)', 'Walmart (Marketside organic)', 'Kroger (Simple Truth organic)', 'Costco (Kirkland organic)', 'Amazon Fresh organic', 'Vitacost'];
    case 'belgium':
      return ['Delhaize Bio', 'Colruyt', 'Carrefour Bio BE'];
    case 'switzerland':
      return ['Migros Bio', 'Coop Naturaplan'];
    case 'korea':
      return ['이마트 친환경', '홈플러스 유기농', '쿠팡 로켓프레시 친환경', '마켓컬리 유기농'];
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
        return ['Beautycounter', 'Honest Company', 'Dr. Bronner\'s', 'Burt\'s Bees', 'Acure (EWG Verified)', 'Branch Basics', 'Seventh Generation', 'Method', 'Mrs. Meyer\'s'];
      case 'belgium':
        return ['Ecover', 'Rainett', 'Kneipp', 'Weleda'];
      case 'switzerland':
        return ['Held', 'Klar', 'Weleda'];
      case 'korea':
        return ['아로마티카', '닥터브로너스', '동구밭', '톤28', '라운드랩'];
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
      return ['Applegate Farms (nitrite-free deli)', 'Pederson\'s Natural Farms', 'Niman Ranch', 'Siete Foods', 'Jackson\'s Honest', 'Lesser Evil', 'Spindrift', 'Olipop', 'Poppi', 'Harmless Harvest', 'Primal Kitchen', 'Chosen Foods', 'Sir Kensington\'s', '365 by Whole Foods', 'Annie\'s', 'Nature\'s Path', 'Bob\'s Red Mill'];
    case 'belgium':
      return ['Boni Bio', 'Delhaize Bio'];
    case 'switzerland':
      return ['Migros Bio', 'Coop Naturaplan'];
    case 'korea':
      return ['풀무원 유기농', '한살림 PB', '초록마을 PB', '자연드림 PB'];
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
    case 'korea':
      return ['전통시장 / 재래시장', '동네 생협(한살림·초록마을) 매장'];
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
    case 'ko':
      return `언어 규칙(최우선): 너는 반드시 100% 자연스러운 한국어로만 답해야 한다. 영어나 프랑스어를 절대 섞지 마라(성분의 원어명을 괄호로 병기하는 것만 허용). 다정하고 신뢰감 있는 존댓말("~예요", "~어요")을 사용해라. 가격은 원(₩, KRW)으로 표기한다. 사용자는 대한민국에 있다: 대안 제품과 매장은 한국에서 실제로 구할 수 있는 것만 추천해라 — 이마트, 홈플러스, 롯데마트, 코스트코, 쿠팡, 마켓컬리, 한살림, 초록마을, 자연드림, 올리브영(화장품), 아이허브. 예: "무첨가 햄은 한살림이나 초록마을에서 찾을 수 있어요", "이건 마켓컬리나 쿠팡에서 주문하면 돼요". 미국·유럽 매장(Whole Foods, Trader Joe's, Carrefour, IGA 등)은 절대 추천하지 마라. 이 한국어 규칙은 위/아래의 영어·프랑스어 지시보다 항상 우선한다.`;
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
    korea: '대한민국',
  }[region];

  return `RÉGION DE L'UTILISATEUR : ${regionName}
Magasins disponibles : ${stores.join(', ')}
Magasins spécialisés bio/santé : ${specialty.join(', ')}
Sections bio en épicerie : ${grocery.join(', ')}
Marques clean recommandées : ${brands.join(', ')}
RÈGLE : Toutes les alternatives et recommandations de magasins DOIVENT correspondre à la région de l'utilisateur (${regionName}). Ne JAMAIS recommander des magasins qui n'existent pas dans cette région.`;
}

function getLocationContext(): string {
  const loc = cachedUserLocation;
  if (!loc || (!loc.city && !loc.subregion)) return '';
  const parts: string[] = [];
  if (loc.city) parts.push(loc.city);
  if (loc.subregion && loc.subregion !== loc.city) parts.push(loc.subregion);
  if (loc.country) parts.push(loc.country);
  const where = parts.join(', ');
  return `\n\nLOCALISATION PRÉCISE DE L'UTILISATEUR : ${where}.\nQuand tu recommandes des magasins, des bouchers, des marchés bio ou des marques, privilégie ceux qui existent réellement à ${loc.city ?? loc.subregion ?? loc.country} ou dans la région environnante. Cite quand c'est utile des enseignes ou chaînes connues présentes dans cette ville/région (ex. à Calgary : Community Natural Foods, Blush Lane Organic Market, Sunnyside Natural Market, Co-op, Save-On-Foods ; à Montréal : Avril, Rachelle Béry, Marché Jean-Talon ; à Paris : Biocoop, Naturalia, marché Raspail). Si tu n'es pas sûr qu'une enseigne existe à ${loc.city ?? loc.subregion}, reste générique (« un magasin bio local », « ta boucherie de quartier ») plutôt que d'inventer.`;
}

/**
 * The language the AI must WRITE its answer in. This ALWAYS mirrors the app UI language
 * (the exact same source the whole interface uses — {@link getDeviceLanguage}) and is
 * deliberately DECOUPLED from the GPS / region code.
 *
 * Why this exists: {@link detectRegion} promotes a device whose REGION is Korea
 * (regionCode "KR") to the Korean language even when the device LANGUAGE is English or
 * French. That made an English-language phone used in Korea receive Korean AI text (dish
 * names, ingredient notes, verdicts) under an English UI. Keying the response language off
 * getDeviceLanguage guarantees the AI output language can never contradict the visible UI.
 */
export function getResponseLanguage(): UserLanguage {
  const appLang = getDeviceLanguage();
  if (appLang === 'ko') return 'ko';
  if (appLang === 'en') return 'en';
  // French: keep the regional variant (Québec / Belgique / Suisse / France) from the
  // locale so currency + store wording match. All Latin-script → no cross-language bleed.
  const { language } = detectRegion();
  return language.startsWith('fr') ? language : 'fr_france';
}

/**
 * The store / brand region injected INTO the AI prompts. Kept consistent with the response
 * language so an English or French answer never names Korean-script stores (이마트…) and a
 * Korean answer never names Western stores. Within one language family GPS is still honored
 * (a French answer in Belgium → Delhaize), since those names are all Latin-script.
 */
export function getResponseStoreRegion(): UserRegion {
  const appLang = getDeviceLanguage();
  const gps = getStoreRegion();
  if (appLang === 'ko') return 'korea';
  if (appLang === 'en') {
    return gps === 'usa' || gps === 'canada_other' || gps === 'quebec' ? gps : 'usa';
  }
  return gps === 'france' || gps === 'belgium' || gps === 'switzerland' || gps === 'quebec'
    ? gps
    : 'france';
}

export function getAnalysisRegionPrompt(): string {
  const language = getResponseLanguage();
  const region = getResponseStoreRegion();
  const storeContext = getRegionStoreContext(region);
  const langInstruction = getLanguageInstruction(language);
  // Only attach the precise GPS location (and its "stores near you" rule) when the user's
  // physical region actually matches the response language, so an English/French answer is
  // never steered toward naming local foreign-language stores.
  const locationContext = region === getStoreRegion() ? getLocationContext() : '';

  return `\n\n--- CONTEXTE RÉGIONAL AUTOMATIQUE ---\n${storeContext}${locationContext}\n${langInstruction}\nIMPORTANT : Le résumé (resume), les recommandations et les alternatives doivent être dans la langue de l'utilisateur et référencer uniquement des magasins/marques de sa région.`;
}

export function getChatRegionPrompt(): string {
  const { regionCode } = detectRegion();
  const language = getResponseLanguage();
  const region = getResponseStoreRegion();
  const storeContext = getRegionStoreContext(region);
  const langInstruction = getLanguageInstruction(language);

  const preciseLocation = region === getStoreRegion() ? getLocationContext() : '';
  const hasLocation = (regionCode && regionCode.length > 0) || preciseLocation.length > 0;

  const geoRules = hasLocation
    ? `\n\n--- RÈGLES STRICTES DE GÉOLOCALISATION ---\n1. La localisation de l'utilisateur a été détectée par l'appareil. NE JAMAIS demander "où te trouves-tu ?".\n2. Toutes les recommandations de produits alternatifs DOIVENT correspondre au pays détecté ci-dessus.\n3. Ne JAMAIS recommander un magasin ou une marque qui n'existe pas dans le pays de l'utilisateur — c'est inutile et frustrant pour lui.\n4. Ne JAMAIS mélanger les enseignes entre pays (ex : ne pas citer Carrefour à un utilisateur québécois, ne pas citer IGA à un utilisateur français).\n5. Adapte la langue de réponse à la région détectée selon la règle LANGUE ci-dessus.`
    : `\n\n--- RÈGLES STRICTES DE GÉOLOCALISATION ---\n1. La localisation de l'utilisateur n'a PAS pu être détectée automatiquement.\n2. Avant de recommander un produit alternatif ou une enseigne, demande poliment à l'utilisateur dans quel pays il se trouve (France, Belgique, Suisse, Québec/Canada, États-Unis, autre).\n3. Une fois le pays connu, adapte TOUTES tes recommandations aux enseignes de ce pays uniquement.\n4. Ne JAMAIS inventer des enseignes, ne jamais mélanger les pays.`;

  return `\n\n--- DÉTECTION AUTOMATIQUE DE RÉGION ET LANGUE ---\nLa région et la langue de l'utilisateur ont été détectées automatiquement par l'appareil.\n${storeContext}${preciseLocation}\n${langInstruction}${geoRules}`;
}
