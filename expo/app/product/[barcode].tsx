import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ChevronLeft, Share2, MessageCircle, Shield,
  CheckCircle, Camera, Lightbulb, RefreshCw, Layers, MapPin,
  Store, Heart, Navigation,
} from 'lucide-react-native';
import DrToxiVerdict from '@/components/DrToxiVerdict';
import ToxicLoadBanner from '@/components/ToxicLoadBanner';
import type { VerdictLevel } from '@/components/DrToxiVerdict';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import ShareImageCard from '@/components/ShareImageCard';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { maybeRequestReviewAfterPositiveScan } from '@/utils/reviewPrompt';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useBadges } from '@/providers/BadgesProvider';
import { getRiskBadgeInfo, productCategoryToAdditiveCategory, findAdditiveByName, getAdditiveDescription } from '@/constants/additives';
import { PhotoType, HealthyAlternative, DetectedIngredient, SubstanceDetected } from '@/types';
import { getCategoryLabel, generateBarcodeAlternatives } from '@/utils/api';
import { detectRegion, getStoreRegion, getRegionSpecialtyStores, getRegionGroceryStores, getRegionCleanBrands, getRegionLocalMarkets } from '@/utils/regionDetection';
import { useLocation } from '@/providers/LocationProvider';
import { t, isEnglish, isKorean, pick } from '@/utils/i18n';
import { getDrToxiBadgeAvatarForVerdict, getDrToxiCosmeticAvatarForVerdict } from '@/constants/drToxiAvatars';

// ─────────────────────────────────────────────
// ✅ Conversion directe niveau_risque → couleur/label
// On utilise niveau_risque stocké par lookupIngredient (api.ts)
// PAS de re-classification textuelle qui écrase la base de données
// ─────────────────────────────────────────────
type DisplayLevel = 'danger' | 'probable' | 'possible' | 'aucun';

function getDisplayLevel(ing: { niveau_risque?: string | null }): DisplayLevel {
  switch (ing.niveau_risque) {
    case 'danger':   return 'danger';
    case 'probable': return 'probable';
    case 'possible': return 'possible';
    default:         return 'aucun';
  }
}

function getLevelBadgeColor(level: DisplayLevel, isCosmetic: boolean = false): string {
  if (isCosmetic) {
    switch (level) {
      case 'danger':   return '#7C3AED'; // 🟣 TOXIC
      case 'probable': return '#EAB308'; // (n'arrive pas en cosmétique — sécurité)
      case 'possible': return '#EAB308'; // 🟡 DISPUTED
      case 'aucun':    return '#2E9E34'; // 🟢 APPROVED
    }
  }
  switch (level) {
    case 'danger':   return '#D0260F'; // 🔴 CANCÉRIGÈNE
    case 'probable': return '#E8730A'; // 🟠 ULTRA-TRANSFORMÉ
    case 'possible': return '#EAB308'; // 🟡 MODÉRATION
    case 'aucun':    return '#2E9E34'; // 🟢 APPROUVÉ
  }
}

function getLevelBadgeLabel(level: DisplayLevel, isCosmetic: boolean = false): string {
  if (isCosmetic) {
    switch (level) {
      case 'danger':   return t('cosmetic_badge_toxic');     // TOXIQUE / TOXIC
      case 'probable': return t('cosmetic_badge_disputed');  // (sécurité)
      case 'possible': return t('cosmetic_badge_disputed');  // CONTESTÉ / DISPUTED
      case 'aucun':    return t('cosmetic_badge_approved');  // APPROUVÉ / APPROVED
    }
  }
  switch (level) {
    case 'danger':   return t('badge_danger');     // CANCÉRIGÈNE
    case 'probable': return t('ingredient_badge_industrial'); // INDUSTRIEL / INDUSTRIAL
    case 'possible': return t('ingredient_badge_disputed');   // CONTESTÉ / DISPUTED
    case 'aucun':    return t('badge_approved');   // APPROUVÉ
  }
}

function getBannerConfig(level: VerdictLevel, isCosmetic: boolean = false): { color: string; label: string; intro: string; icon: React.ReactNode; avatarUri: string | null } {
  if (isCosmetic) {
    switch (level) {
      case 'danger':
        return { color: '#7C3AED', label: t('cosmetic_badge_toxic'), intro: t('intro_danger'), icon: null, avatarUri: getDrToxiCosmeticAvatarForVerdict(level) };
      case 'warning':
      case 'moderation':
        return { color: '#EAB308', label: t('cosmetic_badge_disputed'), intro: t('intro_moderation'), icon: null, avatarUri: getDrToxiCosmeticAvatarForVerdict('moderation') };
      case 'approuve':
        return { color: '#2E9E34', label: t('cosmetic_badge_approved'), intro: t('intro_approved'), icon: <CheckCircle color="#FFFFFF" size={28} />, avatarUri: null };
    }
  }
  switch (level) {
    case 'danger':
      return { color: '#D0260F', label: t('badge_danger'), intro: t('intro_danger'), icon: null, avatarUri: getDrToxiBadgeAvatarForVerdict(level) };
    case 'warning':
      return { color: '#E8730A', label: t('badge_caution'), intro: t('intro_warning'), icon: null, avatarUri: getDrToxiBadgeAvatarForVerdict(level) };
    case 'moderation':
      return { color: '#EAB308', label: t('badge_moderation'), intro: t('intro_moderation'), icon: null, avatarUri: getDrToxiBadgeAvatarForVerdict(level) };
    case 'approuve':
      return { color: '#2E9E34', label: t('badge_approved'), intro: t('intro_approved'), icon: <CheckCircle color="#FFFFFF" size={28} />, avatarUri: null };
  }
}

function getVerdictAction(level: VerdictLevel): string {
  switch (level) {
    case 'danger':
      return pick({ en: 'Avoid regular consumption', fr: 'À éviter régulièrement', ko: '정기적인 섭취를 피하세요' });
    case 'warning':
      return pick({ en: 'Limit as much as possible', fr: 'À limiter fortement', ko: '최대한 제한하세요' });
    case 'moderation':
      return pick({ en: 'Occasional only', fr: 'Occasionnel seulement', ko: '가끔만 드세요' });
    case 'approuve':
      return pick({ en: 'Good everyday choice', fr: 'Bon choix au quotidien', ko: '매일 먹기 좋은 선택' });
  }
}

// ─────────────────────────────────────────────
// Confetti
// ─────────────────────────────────────────────
const CONFETTI_COLORS = ['#2E9E34', '#2E9E34', '#2E9E34', '#2E9E34', '#2E9E34'];
const CONFETTI_COUNT = 24;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

function ConfettiBurst() {
  const pieces = useRef(
    Array.from({ length: CONFETTI_COUNT }).map(() => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      rotate:     new Animated.Value(0),
      opacity:    new Animated.Value(1),
    }))
  ).current;

  const meta = useMemo(
    () =>
      pieces.map((_, i) => ({
        startX:   (Math.random() - 0.5) * SCREEN_WIDTH * 0.9,
        endY:     180 + Math.random() * 220,
        endX:     (Math.random() - 0.5) * SCREEN_WIDTH * 1.1,
        size:     6 + Math.random() * 8,
        color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotateTo: (Math.random() - 0.5) * 720,
        delay:    Math.random() * 150,
      })),
    [pieces]
  );

  useEffect(() => {
    const animations = pieces.map((p, i) =>
      Animated.parallel([
        Animated.timing(p.translateY, {
          toValue: meta[i].endY,
          duration: 1400 + Math.random() * 600,
          delay: meta[i].delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(p.translateX, {
          toValue: meta[i].endX,
          duration: 1400 + Math.random() * 600,
          delay: meta[i].delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(p.rotate, {
          toValue: meta[i].rotateTo,
          duration: 1400,
          delay: meta[i].delay,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(p.opacity, {
          toValue: 0,
          duration: 1600,
          delay: meta[i].delay + 600,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    Animated.stagger(20, animations).start();
  }, [pieces, meta]);

  return (
    <View pointerEvents="none" style={styles.confettiLayer} testID="confetti-burst">
      {pieces.map((p, i) => (
        <Animated.View
          key={`confetti-${i}`}
          style={[
            styles.confettiPiece,
            {
              left: SCREEN_WIDTH / 2 + meta[i].startX,
              width: meta[i].size,
              height: meta[i].size * 0.4,
              backgroundColor: meta[i].color,
              opacity: p.opacity,
              transform: [
                { translateY: p.translateY },
                { translateX: p.translateX },
                {
                  rotate: p.rotate.interpolate({
                    inputRange: [-720, 720],
                    outputRange: ['-720deg', '720deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

function truncateName(name: string, max: number = 60): string {
  if (!name) return name;
  if (name.length <= max) return name;
  return name.slice(0, max - 1).trimEnd() + '\u2026';
}

function getRegionDisplayName(region: ReturnType<typeof detectRegion>['region']): string {
  switch (region) {
    case 'quebec':       return pick({ en: 'Quebec', fr: 'Québec', ko: '퀘벡' });
    case 'canada_other': return pick({ en: 'Canada', fr: 'Canada', ko: '캐나다' });
    case 'france':       return pick({ en: 'France', fr: 'France', ko: '프랑스' });
    case 'usa':          return pick({ en: 'USA', fr: 'USA', ko: '미국' });
    case 'belgium':      return pick({ en: 'Belgium', fr: 'Belgique', ko: '벨기에' });
    case 'switzerland':  return pick({ en: 'Switzerland', fr: 'Suisse', ko: '스위스' });
    default:             return '';
  }
}

// ─────────────────────────────────────────────
// Product-specific real-world advice
// Returns concrete, actionable guidance based on the product type
// (e.g. candy → organic candy without artificial dyes / aspartame)
// (e.g. charcuterie → nitrite-free deli from a real butcher)
// ─────────────────────────────────────────────
function getProductSpecificAdvice(
  productName: string,
  productCategory: string | undefined,
  detectedAdditiveNames: string[],
): string[] {
  const english = isEnglish();
  const name = (productName ?? '').toLowerCase();
  const additives = detectedAdditiveNames.map(a => a.toLowerCase()).join(' ');
  const cat = (productCategory ?? '').toLowerCase();
  const haystack = `${name} ${additives}`;

  const has = (...kws: string[]) => kws.some(k => haystack.includes(k));

  // Charcuterie / processed meat
  if (has('jambon', 'ham', 'salami', 'saucisson', 'bacon', 'charcuterie', 'deli', 'sausage', 'saucisse', 'hot dog', 'pepperoni', 'nitrit', 'nitrate', 'e249', 'e250', 'e251', 'e252')) {
    return pick<string[]>({
      en: [
          'Choose nitrite-free deli meat from your local butcher (look for "uncured", "no added nitrites", "sans nitrites").',
          'Pick organic certified brands like Applegate Naturals or Pederson\'s in the US, Maison du Jambon or Aoste Bio in France, or Charcuteries Parizeau (sans nitrite) in Quebec.',
          'Or replace processed meat with roasted chicken, fresh turkey breast, or homemade slow-cooked pork.',
      ],
      fr: [
          'Va chez ton boucher local et demande de la charcuterie sans nitrite de sodium (mention « sans nitrite » ou « zéro nitrite » sur l\'étiquette).',
          'Privilégie des marques bio certifiées comme Charcuteries Parizeau ou Viandes Biologiques des Cantons (Québec), Maison Loste Sans Nitrite ou Aoste Bio (France), Applegate Naturals (USA).',
          'Ou remplace la charcuterie par du poulet rôti, de la dinde fraîche tranchée, ou du porc effiloché maison.',
      ],
      ko: [
          '아질산나트륨(발색제)이 들어가지 않은 햄·소시지를 고르세요 — 포장에 "무첨가", "아질산염 무첨가" 표시를 확인하세요.',
          '한살림, 초록마을, 자연드림의 무첨가 가공육을 추천하거나 동네 정육점에서 직접 손질한 고기를 고르세요.',
          '아예 가공육 대신 구운 닭가슴살, 수육, 직접 삶은 돼지고기로 바꾸면 더 좋아요.',
      ],
    });
  }

  // Caffeine / energy drinks / coffee / pre-workout (BEFORE candy to avoid 'gomme' matching caffeine gum)
  if (has('caffeine', 'caféine', 'cafeine', 'guarana', 'taurine', 'energy drink', 'energy shot', 'red bull', 'monster', 'rockstar', 'celsius', 'bang', 'reign', 'prime energy', 'pre-workout', 'pre workout', 'coffee', 'café', 'cafe', 'espresso', 'nespresso', 'starbucks')) {
    return pick<string[]>({
      en: [
          'Caffeine itself is natural and safe in moderation — limit total intake to ~400 mg/day (about 4 coffees) and avoid after 2pm.',
          'Prefer simple sources: plain coffee, black or green tea, yerba mate. Skip energy drinks loaded with sugar, artificial colors or sweeteners (aspartame, sucralose).',
          'Cleaner options: cold-brew coffee, matcha, Guayaki yerba mate, or sparkling water with a shot of espresso. Avoid drinks aimed at kids/teens (AMA guidance).',
      ],
      fr: [
          'La caféine est naturelle et sans danger avec modération — vise max 400 mg/jour (≈ 4 cafés) et évite après 14h.',
          'Privilégie les sources simples : café noir, thé vert ou noir, maté. Évite les boissons énergisantes chargées en sucre, colorants ou édulcorants (aspartame, sucralose).',
          'Meilleures options : café filtre ou expresso, matcha, maté Guayaki, ou eau pétillante + shot d\'expresso. À éviter chez les enfants et adolescents (recommandation AMA).',
      ],
      ko: [
          '카페인 자체는 적당히 섭취하면 안전해요 — 하루 400mg(커피 약 4잔) 이하로 마시고 오후 2시 이후에는 피하세요.',
          '단순한 음료가 좋아요: 블랙커피, 녹차·홍차, 마테차. 설탕·인공색소·인공감미료(아스파탐, 수크랄로스)가 가득한 에너지음료는 피하세요.',
          '더 깨끗한 선택: 콜드브루, 말차(맛차), 또는 탄산수에 에스프레소 샷. 어린이·청소년을 겨냥한 카페인 음료는 피하세요.',
      ],
    });
  }

  // Candy / bonbons
  if (has('bonbon', 'candy', 'gummy', 'gomme', 'haribo', 'jelly', 'lollipop', 'sucette', 'dragibus', 'm&m', 'skittles')) {
    return pick<string[]>({
      en: [
          'Switch to organic candy without artificial dyes (no Red 40, Yellow 5, Blue 1) and no aspartame.',
          'Try brands like YumEarth, Surf Sweets, Torie & Howard or Smart Sweets — sold at Whole Foods, Sprouts, Target.',
          'For a gummy fix: dried mango, dates stuffed with peanut butter, or homemade fruit gummies with real juice + gelatin.',
      ],
      fr: [
          'Passe à des bonbons biologiques sans colorants artificiels (pas de E102, E110, E122, E129) et sans aspartame.',
          'Marques recommandées : Bonbons Vrai (FR, Biocoop), Sula bio, Lovechock, ou les bonbons aux fruits Jardin Bio Étic.',
          'Pour une envie de mâcher : dattes Medjool, mangue séchée bio, fruits secs ou pâtes de fruits artisanales sans additif.',
      ],
      ko: [
          '인공색소(적색40호, 황색4호·5호, 청색1호)와 아스파탐이 없는 유기농 사탕·젤리로 바꿔보세요.',
          '한살림·초록마을·아이허브에서 무색소 젤리나 유기농 과일 간식을 찾을 수 있어요.',
          '쫀득한 게 당길 땐 건망고, 곶감, 대추, 또는 진짜 과일주스 + 젤라틴으로 만든 수제 젤리를 추천해요.',
      ],
    });
  }

  // Soda / sugary drinks
  if (has('soda', 'cola', 'pepsi', 'fanta', 'sprite', 'energy drink', 'soft drink', 'limonade', 'aspartame', 'e951', 'e950', 'acésulfame')) {
    return pick<string[]>({
      en: [
          'Drop sodas with aspartame, acesulfame-K or artificial colors — they\'re classified as possibly carcinogenic.',
          'Healthier swaps: Olipop, Poppi, Spindrift, San Pellegrino + lemon, or kombucha (GT\'s, Health-Ade).',
          'Best of all: filtered water + fresh fruit slices, sparkling water with lime, or homemade iced herbal tea.',
      ],
      fr: [
          'Évite les sodas contenant de l\'aspartame (E951), de l\'acésulfame-K (E950) ou des colorants artificiels — classés possiblement cancérigènes.',
          'Alternatives plus saines : kombucha (Rise, Karma), eaux pétillantes aromatisées naturellement (Perrier + citron, San Pellegrino), Olipop ou Poppi.',
          'Le mieux : eau filtrée avec rondelles de fruits frais, ou infusion glacée maison non sucrée.',
      ],
      ko: [
          '아스파탐(E951), 아세설팔칼륨(E950), 인공색소가 든 탄산음료는 피하세요 — 발암 가능 물질로 분류돼요.',
          '더 건강한 대체: 콤부차, 천연 탄산수(트레비·페리에)에 레몬, 또는 무가당 차.',
          '제일 좋은 건: 생수에 과일 한·두 조각, 탄산수에 라임, 또는 직접 우린 무가당 아이스티예요.',
      ],
    });
  }

  // Chips / snacks
  if (has('chips', 'crisp', 'doritos', 'lays', 'pringles', 'tortilla')) {
    return pick<string[]>({
      en: [
          'Choose chips with a short ingredient list: potato, oil, salt — nothing else. No MSG, no flavor enhancers (E621), no TBHQ.',
          'Good brands: Siete Foods, Jackson\'s Honest, Late July Organic, or Kettle Brand Organic — at Whole Foods, Sprouts, Target.',
          'Or make your own: thinly sliced sweet potato or kale, olive oil, sea salt, baked at 180°C / 350°F.',
      ],
      fr: [
          'Choisis des chips à liste courte : pomme de terre, huile, sel — rien d\'autre. Évite le glutamate (E621), les exhausteurs de goût et le TBHQ.',
          'Bonnes marques : Belsia bio, Brets Bio, Vico Bio, ou les chips Jardin Bio Étic — chez Biocoop, Naturalia, Carrefour Bio.',
          'Ou fais-les maison : patate douce ou chou kale en fines tranches, huile d\'olive, sel, au four à 180°C.',
      ],
      ko: [
          '원재료가 짧은 과자를 고르세요: 감자, 기름, 소금 — 그게 전부. L-글루타미산나트륨(MSG), 향미증진제, TBHQ는 피하세요.',
          '한살림·초록마을·자연드림의 무첨가 스낵이나 유기농 칩을 추천해요.',
          '직접 만들 수도 있어요: 고구마나 케일을 얇게 썬어 올리브유·소금 뿌리고 180도 오븐에 구우면 끝.',
      ],
    });
  }

  // Breakfast cereals
  if (has('cereal', 'céréale', 'corn flakes', 'frosted', 'kellogg', 'nesquik')) {
    return pick<string[]>({
      en: [
          'Skip cereals with BHT (E321), BHA (E320), artificial colors or more than 8g of added sugar per serving.',
          'Cleaner picks: One Degree Organic, Nature\'s Path Organic, Cascadian Farm Organic, Three Wishes — at Whole Foods, Sprouts.',
          'Best breakfast: plain oats with fresh fruit, nuts and a drizzle of honey or maple syrup.',
      ],
      fr: [
          'Évite les céréales contenant du BHT (E321), BHA (E320), colorants artificiels ou plus de 8g de sucre ajouté par portion.',
          'Meilleures options : Jordans, Bjorg, Favrichon, Priméal — chez Biocoop, Naturalia, Carrefour Bio.',
          'Encore mieux : flocons d\'avoine nature avec fruits frais, noix et un filet de miel ou sirop d\'érable.',
      ],
      ko: [
          'BHT(E321), BHA(E320), 인공색소가 들었거나 1회분에 첨가당 8g이 넘는 시리얼은 피하세요.',
          '한살림·초록마을·아이허브의 유기농 그래놀라나 무첨가 시리얼을 추천해요.',
          '가장 좋은 아침: 귀리(오트밀)에 생과일, 견과류, 꿀이나 메이플시럽 한 줄.',
      ],
    });
  }

  // Dairy yogurt
  if (has('yogurt', 'yaourt', 'yoghurt', 'danone', 'activia', 'oikos')) {
    return pick<string[]>({
      en: [
          'Avoid yogurts with aspartame, sucralose, artificial colors, or carrageenan (E407) — pick plain whole-milk yogurt instead.',
          'Good options: Stonyfield Organic, Maple Hill Grass-fed, Siggi\'s, or Straus Family Creamery.',
          'Add your own fresh fruit, raw honey, or pure maple syrup — way less sugar than flavored yogurts.',
      ],
      fr: [
          'Évite les yaourts contenant aspartame, sucralose, colorants ou carraghénane (E407) — préfère un yaourt nature au lait entier.',
          'Bonnes options : Yaourts La Laitière nature, Les 2 Vaches bio, Bjorg, Vrai bio, ou Liberté bio (Québec).',
          'Ajoute toi-même fruits frais, miel cru ou sirop d\'érable — bien moins de sucre que les yaourts aromatisés.',
      ],
      ko: [
          '아스파탐, 수크랄로스, 인공색소, 카라기난(E407)이 든 요거트는 피하고 무가당 플레인 요거트를 고르세요.',
          '풍무원·한살림·초록마을의 무첨가 플레인 요거트나 유기농 요거트가 좋아요.',
          '생과일, 생꿀, 메이플시럽을 직접 넣으면 가향 요거트보다 당이 훨씬 적어요.',
      ],
    });
  }

  // Cosmetics / skincare
  if (cat.includes('cosmetic') || has('shampoo', 'shampooing', 'cream', 'crème', 'lotion', 'deodorant', 'déodorant', 'paraben', 'sulfate', 'phthalate')) {
    return pick<string[]>({
      en: [
          'Pick products without parabens, phthalates, SLS/SLES sulfates, formaldehyde-releasers, or synthetic fragrance.',
          'Trusted clean brands: Attitude (EWG Verified), The Honest Company, Beautycounter, Dr. Bronner\'s, Weleda.',
          'Check the INCI list on the EWG Skin Deep or Yuka app before buying anything new.',
      ],
      fr: [
          'Choisis des produits sans parabens, phtalates, sulfates (SLS/SLES), formaldéhyde ou parfum synthétique.',
          'Marques clean fiables : Attitude (Québec), Weleda, Cattier, Druide, Coslys, Centifolia — chez Biocoop, Naturalia, Jean Coutu (section bio).',
          'Scanne la liste INCI avec l\'app Yuka ou INCI Beauty avant tout achat.',
      ],
      ko: [
          '파라벤, 프탈레이트, 황산염 계면활성제(SLS/SLES), 포름알데히드 방출 물질, 인공향료가 없는 제품을 고르세요.',
          '아로마티카, 라운드랩, 닥터브로너스, 동구밭, 톤28 같은 클린 브랜드를 올리브영이나 아이허브에서 찾을 수 있어요.',
          '새 제품을 사기 전에 화해(화장품을 해석하다) 앱이나 EWG Skin Deep으로 전성분을 확인하세요.',
      ],
    });
  }

  // Household cleaning
  if (cat.includes('household')) {
    return pick<string[]>({
      en: [
          'Avoid cleaners with quaternary ammonium compounds, synthetic fragrance, dyes, or "caution / danger" labels.',
          'Safer brands: Branch Basics, Attitude, Seventh Generation, Method, Mrs. Meyer\'s, or Dr. Bronner\'s castile soap.',
          'DIY all-purpose cleaner: white vinegar + water + 10 drops of tea tree or lemon essential oil — works for almost everything.',
      ],
      fr: [
          'Évite les nettoyants contenant des ammoniums quaternaires, parfums synthétiques, colorants ou mentions « attention / danger ».',
          'Marques plus sûres : Attitude, L\'Arbre Vert, Ecover, Etamine du Lys, Druide — chez Biocoop, Naturalia, ou en grande surface bio.',
          'Recette maison universelle : vinaigre blanc + eau + 10 gouttes d\'huile essentielle de tea tree ou citron — efficace partout.',
      ],
      ko: [
          '4급 암모늄 화합물, 인공향료, 색소가 들었거나 "주의·위험" 표시가 있는 세제는 피하세요.',
          '동구밭, 닥터브로너스, 에코버 같은 안전한 브랜드를 한살림·초록마을·올리브영에서 찾을 수 있어요.',
          '천연 만능 세정제 만들기: 백식초 + 물 + 티트리나 레몬 에센셜 오일 10방울 — 거의 모든 곳에 써요.',
      ],
    });
  }

  // Default — food / beverage / other
  if (cat.includes('beverage') || cat.includes('food') || cat === '') {
    return pick<string[]>({
      en: [
          'Look for the shortest possible ingredient list — if you can\'t pronounce it, you probably shouldn\'t eat it.',
          'Prefer organic certified versions (USDA Organic, EU Bio leaf) of the same product, sold at Whole Foods, Sprouts, Biocoop, Naturalia, IGA bio section.',
          'When possible, replace the product with a fresh, whole-food version made from scratch.',
      ],
      fr: [
          'Cherche la liste d\'ingrédients la plus courte possible — si tu ne sais pas prononcer un mot, c\'est probablement à éviter.',
          'Préfère la version bio certifiée (label AB, Eurofeuille, USDA Organic) du même produit — en magasin spécialisé (Biocoop, Naturalia, Avril) ou en rayon bio des supermarchés.',
          'Quand c\'est possible, remplace le produit transformé par une version maison à base d\'ingrédients frais et bruts.',
      ],
      ko: [
          '원재료 목록이 가장 짧은 제품을 고르세요 — 발음하기 어려운 성분이 많다면 피하는 게 좋아요.',
          '같은 제품이라도 유기농 인증(유기가공식품 인증, USDA Organic)을 받은 버전을 한살림·초록마을·자연드림이나 마트 친환경 코너에서 고르세요.',
          '가능하면 가공식품 대신 신선한 재료로 직접 만든 음식으로 바꿔보세요.',
      ],
    });
  }

  return pick<string[]>({
    en: [
        'Choose certified clean alternatives (organic, EWG Verified, Made Safe) of the same product type.',
        'Check the ingredient list carefully and avoid the substances flagged above.',
    ],
    fr: [
        'Choisis une alternative certifiée propre (bio, écolabel, Nature & Progrès) du même type de produit.',
        'Lis attentivement la liste d\'ingrédients et évite les substances signalées plus haut.',
    ],
    ko: [
        '같은 종류의 제품 중 인증받은 클린 제품(유기농, EWG Verified)을 고르세요.',
        '전성분을 꼼꼼히 확인하고 위에 표시된 성분이 든 제품은 피하세요.',
    ],
  });
}

// ─────────────────────────────────────────────
// Personalized advice tied to the substances ACTUALLY detected in the scanned
// product. Names the flagged ingredients found on THIS label and derives
// concrete "look for a version without X" guidance from what was really there.
// ─────────────────────────────────────────────
const CONCERN_RULES: { readonly kws: readonly string[]; readonly fr: string; readonly en: string; readonly ko: string }[] = [
  { kws: ['sucre', 'sugar', 'sirop', 'syrup', 'glucose', 'fructose', 'dextrose', 'maltodextr', 'saccharose', 'sucrose', 'corn syrup'], fr: 'sucres ajoutés', en: 'added sugars', ko: '첨가당' },
  { kws: ['silice', 'silica', 'anti-agglom', 'anti agglom', 'anticaking', 'anti-caking', 'e551', 'e552', 'e553', 'e500', 'e504', 'e554', 'e535', 'e536'], fr: 'anti-agglomérants', en: 'anti-caking agents', ko: '고결방지제' },
  { kws: ['colorant', 'tartrazine', 'carmin', 'allura', 'amarante', 'erythrosine', 'red 40', 'yellow 5', 'yellow 6', 'blue 1', 'e150'], fr: 'colorants artificiels', en: 'artificial colors', ko: '인공색소' },
  { kws: ['nitrite', 'nitrate', 'e249', 'e250', 'e251', 'e252', 'conservateur', 'preservative', 'bha', 'bht', 'e320', 'e321', 'benzoate', 'e210', 'e211', 'sorbate', 'e202', 'e220', 'sulfite'], fr: 'conservateurs chimiques', en: 'chemical preservatives', ko: '화학 보존료' },
  { kws: ['aspartame', 'sucralose', 'acesulfame', 'edulcorant', 'sweetener', 'e950', 'e951', 'e952', 'e954', 'e955', 'saccharine', 'neotame'], fr: 'édulcorants artificiels', en: 'artificial sweeteners', ko: '인공감미료' },
  { kws: ['glutamate', 'msg', 'e621', 'exhausteur', 'flavor enhancer', 'flavour enhancer', 'e622', 'e627', 'e631'], fr: 'exhausteurs de goût', en: 'flavor enhancers', ko: '향미증진제' },
  { kws: ['hydrogen', 'huile de palme', 'palm oil', 'huile raffin', 'refined oil', 'gras trans', 'trans fat', 'palmiste'], fr: 'huiles hydrogénées ou raffinées', en: 'hydrogenated or refined oils', ko: '경화유·정제유' },
  { kws: ['arome', 'artificial flavor', 'artificial flavour', 'flavoring', 'flavouring'], fr: 'arômes artificiels', en: 'artificial flavorings', ko: '인공향료' },
  { kws: ['emulsifiant', 'emulsifier', 'lecithine', 'lecithin', 'gomme', 'carraghenane', 'carrageenan', 'e407', 'e471', 'e472', 'e433', 'e466', 'e412', 'e415'], fr: 'émulsifiants et additifs de texture', en: 'emulsifiers and texture additives', ko: '유화제·식감 첨가물' },
  { kws: ['phosphate', 'e338', 'e339', 'e340', 'e341', 'e450', 'e451', 'e452'], fr: 'phosphates ajoutés', en: 'added phosphates', ko: '인산염 첨가물' },
];

function joinWithConnector(items: string[], english: boolean, connectorEn: string, connectorFr: string): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  const connector = english ? connectorEn : connectorFr;
  if (items.length === 2) return `${items[0]} ${connector} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} ${connector} ${items[items.length - 1]}`;
}

/** Lowercase the first letter of normal words, but keep acronyms/codes (BHA, MSG, E250) intact. */
function naturalizeName(name: string): string {
  if (name.length === 0 || name === name.toUpperCase()) return name;
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/**
 * Builds a personalized one-line callout naming the flagged substances found
 * on THIS scanned product, plus tailored guidance derived from what was
 * actually detected. Returns null when nothing is flagged (approved product).
 */
function getScannedSubstancesAdvice(flagged: { nom: string }[]): string | null {
  if (flagged.length === 0) return null;
  const english = isEnglish();
  const korean = isKorean();

  const seen = new Set<string>();
  const names: string[] = [];
  const guidanceSet = new Set<string>();
  const guidance: string[] = [];

  for (const f of flagged) {
    const clean = (f.nom ?? '').trim();
    if (clean.length === 0) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key) && names.length < 3) {
      seen.add(key);
      names.push(korean ? clean : naturalizeName(clean));
    }
    const norm = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const rule of CONCERN_RULES) {
      const phrase = korean ? rule.ko : english ? rule.en : rule.fr;
      if (!guidanceSet.has(phrase) && rule.kws.some((k) => norm.includes(k))) {
        guidanceSet.add(phrase);
        guidance.push(phrase);
      }
    }
  }

  if (names.length === 0) return null;

  if (korean) {
    const intro = `이 제품에는 ${names.join(', ')} 성분이 들어 있어요.`;
    if (guidance.length > 0) {
      const g = guidance.slice(0, 3).join(', ');
      return `${intro} ${g} 등이 없는 제품을 찾아보세요.`;
    }
    return `${intro} 성분 목록이 더 짧은 깨끗한 제품을 찾아보세요.`;
  }

  const namesList = joinWithConnector(names, english, 'and', 'et');
  const intro = english ? `This product contains ${namesList}.` : `Ce produit contient ${namesList}.`;

  if (guidance.length > 0) {
    const g = joinWithConnector(guidance.slice(0, 3), english, 'or', 'ni');
    return english
      ? `${intro} Look for a version without ${g}.`
      : `${intro} Cherche une version sans ${g}.`;
  }
  return english
    ? `${intro} Look for a cleaner version with a shorter ingredient list.`
    : `${intro} Cherche une version plus clean avec une liste d'ingrédients plus courte.`;
}

function shortenText(text: string, maxSentences: number): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  if (sentences.length <= maxSentences) return text;
  return sentences.slice(0, maxSentences).join(' ');
}

// ─────────────────────────────────────────────
// A store/market suggestion the user can tap to open in their Maps app
// (searches "{store} {city}" near the user). Turns the passive store list
// into a concrete tool to actually find a cleaner alternative nearby.
// ─────────────────────────────────────────────
function StoreRow({ name, icon, onPress }: { name: string; icon: React.ReactNode; onPress: (name: string) => void }) {
  return (
    <TouchableOpacity
      style={styles.bioStoreItemTappable}
      activeOpacity={0.6}
      onPress={() => onPress(name)}
      testID={`maps-store-${name}`}
    >
      {icon}
      <Text style={styles.bioStoreTextTappable} numberOfLines={1}>{name}</Text>
      <Navigation color="#86C091" size={13} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Clean-brand chips. Brands aren't physical places (nothing to open in Maps),
// so they render as compact wrapping chips instead of a long vertical list —
// the US list runs ~17 brands, which was a wall of text. Long lists collapse
// behind a "+N more" chip to keep the card tight.
// ─────────────────────────────────────────────
const BRAND_CHIP_CAP = 8;

function BrandChips({ brands }: { brands: string[] }) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const shouldCap = brands.length > BRAND_CHIP_CAP + 2;
  const visible = expanded || !shouldCap ? brands : brands.slice(0, BRAND_CHIP_CAP);
  const hiddenCount = brands.length - visible.length;

  const handleExpand = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(true);
  }, []);

  return (
    <View style={styles.brandChipsWrap}>
      {visible.map((b, i) => (
        <View key={`brand-${i}`} style={styles.brandChip}>
          <CheckCircle color="#2E9E34" size={12} strokeWidth={2.4} />
          <Text style={styles.brandChipText}>{b}</Text>
        </View>
      ))}
      {hiddenCount > 0 ? (
        <TouchableOpacity
          style={styles.brandChipMore}
          activeOpacity={0.7}
          onPress={handleExpand}
          testID="brands-show-more"
        >
          <Text style={styles.brandChipMoreText}>
            {pick({ en: `+${hiddenCount} more`, fr: `+${hiddenCount} autres`, ko: `+${hiddenCount}개 더` })}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function ProductScreen() {
  console.log("[ProductScreen] Rendering product detail screen");
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const { history, toggleFavorite } = useScanHistory();
  const { isPro } = useSubscription();
  const { recordShare } = useBadges();
  const shareCardRef = useRef<View>(null);
  const [isShareLoading, setIsShareLoading] = useState<boolean>(false);
  const hasRequestedReview = useRef<boolean>(false);

  const product = useMemo(() => {
    return history.find(p => p.barcode === barcode);
  }, [history, barcode]);

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  // ──────────────────────────────────────────────────────────────────────
  // ⚠️ Rules of Hooks: EVERY hook below must run on EVERY render, BEFORE the
  // `if (!product)` early return — otherwise the hook count changes when the
  // product hydrates from storage and React crashes the screen. They are all
  // written null-safe so they tolerate the brief window where product is
  // still undefined.
  // ──────────────────────────────────────────────────────────────────────

  // ✅ Verdict 100% déterministe — basé sur product.riskGroup calculé par api.ts
  const { verdictLevel } = useMemo(() => {
    let _verdictLevel: VerdictLevel = 'approuve';
    switch (product?.riskGroup) {
      case 'group1':  _verdictLevel = 'danger';     break;
      case 'group2a': _verdictLevel = 'warning';    break;
      case 'group2b': _verdictLevel = 'moderation'; break;
      case 'none':
      default:        _verdictLevel = 'approuve';   break;
    }
    return { verdictLevel: _verdictLevel };
  }, [product?.riskGroup]);

  // After a POSITIVE (green "approved") product scan, ask for Apple's native
  // in-app review. Only on a good verdict, only via the system sheet, capped
  // to Apple's 3×/year (enforced again in the helper). Toxic scans never ask.
  useEffect(() => {
    if (!product || hasRequestedReview.current) return;
    if (verdictLevel !== 'approuve') return;
    hasRequestedReview.current = true;
    void maybeRequestReviewAfterPositiveScan(true);
  }, [product, verdictLevel]);

  const { location, isResolving, requestAndResolve } = useLocation();
  // Store suggestions follow the user's REAL location (GPS), not the phone
  // language — so an English phone in Quebec gets Quebec stores, not BC chains.
  const userCountry = useMemo(() => getStoreRegion(), [location]);

  const handleEnableLocation = useCallback(async () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await requestAndResolve();
  }, [requestAndResolve]);

  const locationLabel = useMemo(() => {
    if (!location) return null;
    const parts: string[] = [];
    if (location.city) parts.push(location.city);
    if (location.subregion && location.subregion !== location.city) parts.push(location.subregion);
    return parts.join(', ');
  }, [location]);

  // Opens the suggested store in the native Maps app, searching for it near the
  // user's detected city (falls back to a plain "near me" search when location
  // is unknown). Strips parenthetical notes like "Target (organic)" first.
  const handleOpenStoreInMaps = useCallback(async (storeName: string) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const cleanName = storeName.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    const locationPart = locationLabel ? ` ${locationLabel}` : '';
    const query = encodeURIComponent(`${cleanName}${locationPart}`.trim());
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    const primary = Platform.select({
      ios: `http://maps.apple.com/?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: webUrl,
    }) ?? webUrl;
    try {
      await Linking.openURL(primary);
    } catch {
      try {
        await Linking.openURL(webUrl);
      } catch (e) {
        console.log('[Product] Could not open store in maps:', e);
      }
    }
  }, [locationLabel]);

  const shortAnalysis = useMemo(() => {
    if (!product?.analysisSummary) return null;
    return shortenText(product.analysisSummary, 3);
  }, [product?.analysisSummary]);

  const ingredientsList = useMemo<(DetectedIngredient | SubstanceDetected)[]>(() => {
    if (!product) return [];
    return product.detectedIngredients && product.detectedIngredients.length > 0
      ? product.detectedIngredients
      : product.substances ?? [];
  }, [product]);

  // 🔴 TOXIC LOAD / DANGER CUMULÉ / 과다 위험 — cumulative-risk alert.
  // Triggered when MORE THAN 8 orange ULTRA-PROCESSED ingredients pile up in the
  // same product, regardless of the main verdict. Not counted for cosmetics
  // (they use their own TOXIC / DISPUTED / APPROVED scale).
  const ultraProcessedCount = useMemo<number>(() => {
    if (product?.productCategory === 'cosmetic') return 0;
    return ingredientsList.filter((ing) => getDisplayLevel(ing) === 'probable').length;
  }, [ingredientsList, product?.productCategory]);
  const showToxicLoad = ultraProcessedCount > 8;

  // Advice built from what was ACTUALLY found on this scanned label — names the
  // flagged substances (worst first) and turns them into concrete guidance.
  const scannedAdvice = useMemo(() => {
    const severityRank: Record<DisplayLevel, number> = { danger: 0, probable: 1, possible: 2, aucun: 3 };
    const flagged = ingredientsList
      .filter((ing) => getDisplayLevel(ing) !== 'aucun')
      .slice()
      .sort((a, b) => severityRank[getDisplayLevel(a)] - severityRank[getDisplayLevel(b)]);
    return getScannedSubstancesAdvice(flagged);
  }, [ingredientsList]);

  const getApprovedDescription = useCallback((name: string): string => {
    return pick({
      en: `${name} is a natural or commonly accepted ingredient with no identified health risk at typical food levels.`,
      fr: `${name} est un ingrédient naturel ou couramment accepté, sans risque identifié aux doses alimentaires habituelles.`,
      ko: `${name}은(는) 일반적인 식품 섭취량에서 알려진 건강 위험이 없는 천연 또는 통상적으로 인정된 성분입니다.`,
    });
  }, []);

  const additiveCategory = useMemo(
    () => productCategoryToAdditiveCategory(product?.productCategory),
    [product?.productCategory],
  );

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} testID="back-button">
            <ChevronLeft color={Colors.text} size={24} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Shield color={Colors.textTertiary} size={48} strokeWidth={1.2} />
          <Text style={styles.emptyText}>{t('product_not_found')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleBack} testID="retry-button">
            <Text style={styles.retryButtonText}>{t('back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const badge = getRiskBadgeInfo(product.riskGroup, productCategoryToAdditiveCategory(product.productCategory));
  const isPhotoScan = product.scanMethod === 'photo';
  const photoType: PhotoType = product.photoType ?? 'unknown';
  const isUniversalScan = product.barcode.startsWith('universal_');
  const showFrontPhotoTip = isPhotoScan && photoType === 'front' && !isUniversalScan;

  const isGreen = verdictLevel === 'approuve';
  const isCosmetic = product.productCategory === 'cosmetic';
  const bannerConfig = getBannerConfig(verdictLevel, isCosmetic);
  const verdictAction = getVerdictAction(verdictLevel);
  const categoryLabel = product.productCategory ? getCategoryLabel(product.productCategory) : getCategoryLabel('food');

  const handleFavorite = () => {
    if (!isPro) { router.push('/paywall?source=favorite'); return; }
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavorite(product.barcode);
  };

  const fallbackTextShare = async () => {
    const badgeLabel = verdictLevel === 'approuve'
      ? `[${t('badge_approved')}]`
      : verdictLevel === 'warning'
        ? `[${t('badge_caution')}]`
        : verdictLevel === 'moderation'
          ? `[${t('badge_moderation')}]`
          : `[${t('badge_danger')}]`;
    const substancesText = product.detectedAdditives.length > 0
      ? `\n\n${t('substances_detected')} :\n${product.detectedAdditives.map(a => `- ${a.name}`).join('\n')}`
      : product.substances && product.substances.filter(s => s.niveau_risque !== 'aucun').length > 0
        ? `\n\n${t('substances_detected')} :\n${product.substances.filter(s => s.niveau_risque !== 'aucun').map(s => `- ${s.nom}`).join('\n')}`
        : '';
    const result = await Share.share({
      message: `${badgeLabel} ${product.name} (${product.brand}) — ${badge.label}${badge.sublabel ? ` : ${badge.sublabel}` : ''}${substancesText}\n\n${t('share_suffix')}`,
    });
    if (result.action === Share.sharedAction) recordShare();
  };

  const handleShare = async () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsShareLoading(true);
    try {
      if (Platform.OS !== 'web' && shareCardRef.current) {
        const uri = await captureRef(shareCardRef, { format: 'png', quality: 1, result: 'tmpfile' });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('share_dialog_title'), UTI: 'public.png' });
          recordShare();
        } else {
          await fallbackTextShare();
        }
      } else {
        await fallbackTextShare();
      }
    } catch { try { await fallbackTextShare(); } catch {} }
    finally { setIsShareLoading(false); }
  };

  const handleAskDrToxi = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/dr-toxi',
      params: {
        productName:    product.name,
        productBrand:   product.brand,
        productBarcode: product.barcode,
        productVerdict: verdictLevel,
        productSummary: shortAnalysis ?? '',
      },
    });
  };

  const healthyAlternatives: HealthyAlternative[] = (() => {
    if (product.healthyAlternatives && product.healthyAlternatives.length > 0) return product.healthyAlternatives;
    if (product.riskGroup !== 'none' && product.scanMethod === 'barcode' && product.detectedAdditives.length > 0) {
      return generateBarcodeAlternatives(product.detectedAdditives);
    }
    return [];
  })();

  const showAlternatives = !isGreen && healthyAlternatives.length > 0;

  const isNonFood = additiveCategory !== 'food';

  const specialtyStores = getRegionSpecialtyStores(userCountry);
  const groceryStores = getRegionGroceryStores(userCountry);
  const cleanBrands = getRegionCleanBrands(userCountry, isNonFood);
  const localMarkets = getRegionLocalMarkets(userCountry);
  const hasMapStores = specialtyStores.length > 0 || groceryStores.length > 0 || localMarkets.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} testID="back-button">
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{product?.name ?? t('result')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleFavorite} style={styles.favoriteButton} testID="favorite-button">
            <Heart
              color={product.isFavorite ? '#FF2D55' : Colors.textSecondary}
              size={20}
              fill={product.isFavorite ? '#FF2D55' : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton} testID="share-button">
            <Share2 color={Colors.text} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.productHeroCard, { borderColor: bannerConfig.color + '24' }]}> 
          <View style={[styles.heroGlow, { backgroundColor: bannerConfig.color + '12' }]} />
          <View style={styles.productHeroTopRow}>
            <View style={styles.productImageFrame}>
              {isPhotoScan ? (
                product.thumbnailBase64 || product.photoUri ? (
                  <Image source={{ uri: product.thumbnailBase64 ?? product.photoUri ?? '' }} style={styles.productImage} contentFit="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}><Camera color={Colors.textTertiary} size={34} /></View>
                )
              ) : (
                product.imageUrl ? (
                  <Image source={{ uri: product.imageUrl }} style={styles.productImage} contentFit="contain" />
                ) : (
                  <View style={styles.imagePlaceholder}><Shield color={Colors.textTertiary} size={34} /></View>
                )
              )}
            </View>

            <View style={styles.productHeroText}>
              <View style={styles.productMetaRow}>
                <View style={styles.categoryTag}>
                  <Layers color={Colors.primary} size={12} />
                  <Text style={styles.categoryTagText}>{categoryLabel}</Text>
                </View>
                {isPhotoScan && !isUniversalScan ? (
                  <View style={styles.photoTag}>
                    <Camera color={Colors.textSecondary} size={12} />
                    <Text style={styles.photoTagText}>{t('analyzed_by_photo')}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.productName}>{truncateName(product.name, 60)}</Text>

              {product.brand && product.brand !== getCategoryLabel(product.productCategory ?? 'other') ? (
                <Text style={styles.productBrand}>{product.brand}</Text>
              ) : null}

              {product.materialDetected ? (
                <Text style={styles.materialText}>{t('material_label')} : {product.materialDetected}</Text>
              ) : null}
            </View>
          </View>
          {isGreen && <ConfettiBurst />}
        </View>

        {showFrontPhotoTip && (
          <View style={styles.frontPhotoTip}>
            <Camera color="#FF9500" size={16} />
            <Text style={styles.frontPhotoTipText}>{t('photo_tip')}</Text>
          </View>
        )}

        <DrToxiVerdict level={verdictLevel} isCosmetic={isCosmetic} />

        {showToxicLoad ? <ToxicLoadBanner count={ultraProcessedCount} /> : null}

        {/* ─── Tous les ingrédients ─── */}
        {ingredientsList.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('all_ingredients')}</Text>
            <View style={styles.allIngredientsCard}>
              {ingredientsList.map((ing, index) => {
                // ✅ niveau_risque de la base → couleur correcte
                // 🔴 danger = CANCÉRIGÈNE
                // 🟠 probable = ULTRA-TRANSFORMÉ
                // 🟡 possible = MODÉRATION
                // 🟢 aucun = APPROUVÉ
                const level = getDisplayLevel(ing);
                const color = getLevelBadgeColor(level, isCosmetic);
                // For non-food scans, prefer the category-appropriate description
                // from the additives database (FR/EN) when we can match the ingredient.
                // Cosmetics carry their own bilingual description (cosmetic engine),
                // so we never override them with the generic additives DB.
                const additiveMatch = (isNonFood && !isCosmetic) ? findAdditiveByName(ing.nom, additiveCategory) : undefined;
                const additiveDescription = additiveMatch ? getAdditiveDescription(additiveMatch) : '';
                const hasExplanation = !!(ing.explication && ing.explication.trim().length > 0);
                const isPending = ing.descriptionPending === true && !hasExplanation && additiveDescription.length === 0;
                const description = additiveDescription.length > 0
                  ? additiveDescription
                  : hasExplanation
                    ? ing.explication
                    : (level === 'aucun' ? getApprovedDescription(ing.nom) : '');
                return (
                  <View key={`all-ing-${index}`} style={[styles.allIngItem, { borderLeftColor: color }]} testID={`ingredient-row-${index}`}>
                    <View style={styles.allIngRow}>
                      <View style={[styles.allIngDot, { backgroundColor: color }]} />
                      <Text style={styles.allIngName} numberOfLines={2}>{ing.nom}</Text>
                      <View style={[styles.allIngBadge, { backgroundColor: color }]}>
                        <Text style={styles.allIngBadgeText}>{getLevelBadgeLabel(level, isCosmetic)}</Text>
                      </View>
                    </View>
                    {isPending ? (
                      <View style={styles.allIngPendingRow}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={styles.allIngPendingText}>
                          {pick({ en: 'Generating description…', fr: 'Génération de la description…', ko: '설명을 생성하는 중…' })}
                        </Text>
                      </View>
                    ) : description ? (
                      <View style={styles.allIngExplanation}>
                        <Text style={styles.allIngExplanationText}>
                          {description}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {(verdictLevel === 'danger' || verdictLevel === 'warning') && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <MapPin color={Colors.primary} size={18} />
              <Text style={styles.sectionTitle}>
                {t('where_find_alternatives')} {locationLabel ?? getRegionDisplayName(userCountry)}
              </Text>
            </View>
            <View style={styles.bioStoresCard}>
              {locationLabel ? (
                <View style={styles.locationPill}>
                  <MapPin color="#2E9E34" size={13} />
                  <Text style={styles.locationPillText} numberOfLines={1}>
                    {pick({ en: 'Suggestions near', fr: 'Suggestions proches de', ko: '내 주변 추천' })} {locationLabel}
                  </Text>
                </View>
              ) : Platform.OS !== 'web' ? (
                <TouchableOpacity
                  style={styles.enableLocationButton}
                  onPress={handleEnableLocation}
                  activeOpacity={0.85}
                  disabled={isResolving}
                  testID="enable-location"
                >
                  <MapPin color="#FFFFFF" size={15} />
                  <Text style={styles.enableLocationText}>
                    {isResolving
                      ? pick({ en: 'Locating…', fr: 'Localisation…', ko: '위치 찾는 중…' })
                      : pick({ en: 'Suggest stores near me', fr: 'Magasins près de chez moi', ko: '내 주변 매장 추천' })}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <Text style={styles.bioStoresIntro}>{t('bio_stores_intro')}</Text>

              <Text style={styles.bioStoresSubtitle}>
                {pick({ en: 'Real advice for this product', fr: 'Conseils concrets pour ce produit', ko: '이 제품에 대한 실질적인 조언' })}
              </Text>
              {scannedAdvice ? (
                <View style={styles.scannedAdviceCallout}>
                  <Text style={styles.scannedAdviceText}>{scannedAdvice}</Text>
                </View>
              ) : null}
              {getProductSpecificAdvice(
                product.name,
                product.productCategory,
                product.detectedAdditives.map(a => a.name),
              ).map((tip, i) => (
                <View key={`tip-${i}`} style={styles.adviceItem}>
                  <View style={styles.adviceBullet} />
                  <Text style={styles.adviceText}>{tip}</Text>
                </View>
              ))}

              {hasMapStores ? (
                <View style={styles.mapsHintRow}>
                  <Navigation color="#2E9E34" size={12} />
                  <Text style={styles.mapsHintText}>
                    {pick({ en: 'Tap a store to find it near you in Maps', fr: 'Touchez un magasin pour le trouver près de vous dans Plans', ko: '매장을 누르면 지도에서 내 주변 위치를 찾을 수 있습니다' })}
                  </Text>
                </View>
              ) : null}

              {specialtyStores.length > 0 ? (
                <>
                  <Text style={styles.bioStoresSubtitle}>{t('specialty_stores')}</Text>
                  {specialtyStores.map((s, i) => (
                    <StoreRow
                      key={`spec-${i}`}
                      name={s}
                      icon={<Store color="#2E9E34" size={14} strokeWidth={2} />}
                      onPress={handleOpenStoreInMaps}
                    />
                  ))}
                </>
              ) : null}

              {groceryStores.length > 0 ? (
                <>
                  <Text style={styles.bioStoresSubtitle}>{t('organic_sections')}</Text>
                  {groceryStores.map((s, i) => (
                    <StoreRow
                      key={`groc-${i}`}
                      name={s}
                      icon={<Store color="#2E9E34" size={14} strokeWidth={2} />}
                      onPress={handleOpenStoreInMaps}
                    />
                  ))}
                </>
              ) : null}

              {cleanBrands.length > 0 ? (
                <>
                  <Text style={styles.bioStoresSubtitle}>
                    {isNonFood ? t('clean_brands') : t('organic_brands')}
                  </Text>
                  <BrandChips brands={cleanBrands} />
                </>
              ) : null}

              {localMarkets.length > 0 ? (
                <>
                  <Text style={styles.bioStoresSubtitle}>{t('local_markets')}</Text>
                  {localMarkets.map((m, i) => (
                    <StoreRow
                      key={`mkt-${i}`}
                      name={m}
                      icon={<MapPin color="#2E9E34" size={14} strokeWidth={2} />}
                      onPress={handleOpenStoreInMaps}
                    />
                  ))}
                </>
              ) : null}
            </View>
          </View>
        )}

        {isGreen && (
          <View style={styles.approvedFooterCard}>
            <CheckCircle color={Colors.primary} size={18} />
            <Text style={styles.approvedFooterText}>{t('approved_consume_freely')}</Text>
          </View>
        )}

        {!isGreen && product.recommendations && product.recommendations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Lightbulb color={Colors.primary} size={18} />
              <Text style={styles.sectionTitle}>{t('recommendations')}</Text>
            </View>
            <View style={styles.recommendationsCard}>
              {product.recommendations.map((rec, index) => (
                <View key={`rec-${index}`} style={styles.recommendationItem}>
                  <View style={styles.recommendationBullet} />
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {!isGreen && product.saferAlternatives && product.saferAlternatives.length > 0 && !showAlternatives && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <RefreshCw color={Colors.safe} size={18} />
              <Text style={styles.sectionTitle}>{t('safer_alternatives')}</Text>
            </View>
            <View style={styles.alternativesCard}>
              {product.saferAlternatives.map((alt, index) => (
                <View key={`alt-${index}`} style={styles.alternativeItem}>
                  <CheckCircle color={Colors.safe} size={16} />
                  <Text style={styles.alternativeText}>{alt}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.bigShareButton, isGreen && styles.bigShareButtonGreen, isShareLoading && styles.bigShareButtonLoading]}
          onPress={handleShare} activeOpacity={0.85} testID="big-share-button" disabled={isShareLoading}
        >
          {isShareLoading ? <ActivityIndicator color={Colors.white} size="small" /> : <Share2 color={Colors.white} size={22} />}
          <Text style={styles.bigShareButtonText}>{isShareLoading ? t('preparing') : t('share_result')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drToxiButton} onPress={handleAskDrToxi} activeOpacity={0.8} testID="ask-dr-toxi">
          <MessageCircle color={Colors.primary} size={20} />
          <Text style={styles.drToxiButtonText}>{t('ask_dr_toxi')}</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.offscreenContainer} pointerEvents="none">
        <View ref={shareCardRef} {...(Platform.OS === 'web' ? {} : { collapsable: false as const })}>
          <ShareImageCard
            productName={product.name} brand={product.brand} riskGroup={product.riskGroup}
            photoUri={product.photoUri} thumbnailBase64={product.thumbnailBase64} imageUrl={product.imageUrl}
            substances={product.substances} detectedIngredients={product.detectedIngredients}
            detectedAdditives={product.detectedAdditives} isCosmetic={isCosmetic}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  locationPill: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, alignSelf: 'flex-start' as const, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#E8F9ED', borderRadius: 999, marginBottom: 10, borderWidth: 1, borderColor: '#C7EBD0' },
  locationPillText: { fontSize: 12, fontWeight: '700' as const, color: '#1F6B2A', letterSpacing: -0.1 },
  enableLocationButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 7, alignSelf: 'flex-start' as const, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#2E9E34', borderRadius: 999, marginBottom: 12, shadowColor: '#2E9E34', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 3 },
  enableLocationText: { fontSize: 12.5, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: -0.1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FAFAF8' },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.2, flex: 1, textAlign: 'center' as const, marginHorizontal: 8 },
  headerRight: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  favoriteButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  shareButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 4 },
  productHeroCard: { position: 'relative' as const, backgroundColor: '#FFFFFF', borderRadius: 28, padding: 16, borderWidth: 1, overflow: 'hidden' as const, shadowColor: '#000000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4 },
  heroGlow: { position: 'absolute' as const, top: -54, right: -48, width: 150, height: 150, borderRadius: 75 },
  productHeroTopRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 16 },
  productImageFrame: { width: 116, height: 116, borderRadius: 28, backgroundColor: '#F7F7F3', justifyContent: 'center' as const, alignItems: 'center' as const, borderWidth: 1, borderColor: '#EFEFEB' },
  productHeroText: { flex: 1 },
  productMetaRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'center' as const, gap: 7, marginBottom: 10 },
  productHeader: { alignItems: 'center', paddingVertical: 24 },
  productImage: { width: 104, height: 104, borderRadius: 22, backgroundColor: Colors.surface },
  imagePlaceholder: { width: 104, height: 104, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  productName: { fontSize: 22, lineHeight: 27, fontWeight: '900' as const, color: Colors.text, letterSpacing: -0.55 },
  productBrand: { fontSize: 14, color: '#777772', marginTop: 6, fontWeight: '600' as const },
  categoryTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#E8F9ED', borderRadius: 999 },
  categoryTagText: { fontSize: 12, fontWeight: '800' as const, color: Colors.primary },
  materialText: { fontSize: 13, color: Colors.textSecondary, marginTop: 7, fontStyle: 'italic' as const },
  photoTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.surfaceSecondary, borderRadius: 999 },
  photoTagText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '700' as const },
  frontPhotoTip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF8ED', borderRadius: 12, padding: 14, marginBottom: 4, borderWidth: 1, borderColor: '#FFE4B5' },
  frontPhotoTipText: { flex: 1, fontSize: 13, color: '#8B6914', lineHeight: 18 },
  badgeContainer: { borderRadius: 28, padding: 22, marginTop: 16, marginBottom: 0, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 24, elevation: 8 },
  badgeContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  verdictTopLine: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 13, marginBottom: 16 },
  verdictIconBubble: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center' as const, alignItems: 'center' as const, overflow: 'hidden' as const, borderWidth: 1, borderColor: 'rgba(255,255,255,0.34)' },
  verdictAvatar: { width: 58, height: 58 },
  badgeTextContainer: { flex: 1 },
  verdictEyebrow: { fontSize: 11, fontWeight: '900' as const, color: 'rgba(255,255,255,0.76)', letterSpacing: 1.2, marginBottom: 3 },
  badgeLabel: { fontSize: 25, lineHeight: 30, fontWeight: '900' as const, letterSpacing: 0.6, color: '#FFFFFF' },
  verdictAction: { fontSize: 17, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: -0.25, marginBottom: 5 },
  verdictIntro: { fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 20, marginBottom: 14 },
  riskMeterLabel: { fontSize: 11, fontWeight: '900' as const, color: 'rgba(255,255,255,0.76)', letterSpacing: 1.1, textTransform: 'uppercase' as const, marginBottom: 8 },
  riskMeterRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  riskMeterValue: { minWidth: 48, textAlign: 'right' as const, fontSize: 20, lineHeight: 22, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: -0.45 },
  riskTrack: { flex: 1, height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.24)', overflow: 'hidden' as const },
  riskFill: { height: 8, borderRadius: 999, backgroundColor: '#FFFFFF' },
  aiSummaryCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginTop: 12, borderWidth: 1, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 18, elevation: 2 },
  aiSummaryKicker: { fontSize: 11, fontWeight: '900' as const, letterSpacing: 1.1, marginBottom: 8 },
  aiSummaryText: { fontSize: 14, lineHeight: 21, color: '#343430' },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  additiveCard: { backgroundColor: Colors.surface, borderRadius: 18, padding: 18, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  additiveHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  additiveTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  additiveTagText: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.3, color: '#FFFFFF' },
  additiveName: { fontSize: 15, fontWeight: '600' as const, color: Colors.text, flex: 1 },
  additiveDescription: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  additiveSource: { fontSize: 12, color: Colors.textTertiary, marginTop: 8, fontStyle: 'italic' as const },
  recommendationsCard: { backgroundColor: '#FFFBF0', borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: '#FFE8B2' },
  recommendationItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  recommendationBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF9500', marginTop: 6 },
  recommendationText: { fontSize: 14, color: Colors.text, lineHeight: 20, flex: 1 },
  alternativesCard: { backgroundColor: '#E8F9ED', borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.18)' },
  alternativeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  alternativeText: { fontSize: 14, color: Colors.text, lineHeight: 20, flex: 1 },
  healthyAlternativesCard: { backgroundColor: '#F0FAF3', borderRadius: 16, padding: 4, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.18)', overflow: 'hidden' as const },
  healthyAlternativesCardInner: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.18)', overflow: 'hidden' as const, marginBottom: 6 },
  healthyAltItem: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, padding: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(46, 158, 52, 0.18)' },
  healthyAltBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center' as const, alignItems: 'center' as const, marginTop: 2 },
  healthyAltContent: { flex: 1 },
  healthyAltName: { fontSize: 15, fontWeight: '600' as const, color: '#1A1A1A', marginBottom: 3 },
  healthyAltReason: { fontSize: 13, color: '#4A7C59', lineHeight: 18 },
  bioStoresCard: { backgroundColor: '#E8F9ED', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.25)' },
  bioStoresIntro: { fontSize: 14, color: '#1F5A28', lineHeight: 20, marginBottom: 6 },
  bioStoresSubtitle: { fontSize: 14, fontWeight: '700' as const, color: '#1A1A1A', marginTop: 16, marginBottom: 8 },
  brandChipsWrap: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginTop: 2 },
  brandChip: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, maxWidth: '100%' as const, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: '#FFFFFF', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.18)' },
  brandChipText: { flexShrink: 1, fontSize: 13, color: '#1A1A1A', fontWeight: '600' as const },
  brandChipMore: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 7, paddingHorizontal: 13, backgroundColor: 'rgba(46, 158, 52, 0.12)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.28)' },
  brandChipMoreText: { fontSize: 13, color: '#1F6B2A', fontWeight: '800' as const },
  bioStoreItemTappable: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, paddingVertical: 9, paddingHorizontal: 11, marginBottom: 6, backgroundColor: '#FFFFFF', borderRadius: 11, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.18)' },
  bioStoreTextTappable: { flex: 1, fontSize: 14, color: '#1A1A1A', fontWeight: '600' as const },
  mapsHintRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginTop: 14, marginBottom: 2 },
  mapsHintText: { flex: 1, fontSize: 12, color: '#3F7A48', fontWeight: '600' as const, fontStyle: 'italic' as const },
  bioStoresNote: { fontSize: 13, color: '#1F5A28', lineHeight: 19 },
  adviceItem: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10, paddingVertical: 6 },
  adviceBullet: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#2E9E34', marginTop: 7 },
  adviceText: { flex: 1, fontSize: 14, color: '#1A1A1A', lineHeight: 20 },
  scannedAdviceCallout: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.22)', borderLeftWidth: 4, borderLeftColor: '#2E9E34' },
  scannedAdviceText: { fontSize: 13.5, lineHeight: 20, color: '#1A1A1A', fontWeight: '600' as const },
  bigShareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24, paddingVertical: 20, borderRadius: 20, backgroundColor: Colors.primary, shadowColor: '#2E9E34', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 8 },
  bigShareButtonGreen: { backgroundColor: Colors.primary, shadowColor: '#2E9E34', shadowOpacity: 0.4, shadowRadius: 24, elevation: 10 },
  bigShareButtonLoading: { opacity: 0.8 },
  bigShareButtonText: { fontSize: 17, fontWeight: '800' as const, color: Colors.white, letterSpacing: 0.2 },
  drToxiButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, paddingVertical: 16, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(46, 158, 52, 0.25)', backgroundColor: Colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  drToxiButtonText: { fontSize: 16, fontWeight: '600' as const, color: Colors.primary },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 17, color: Colors.textSecondary },
  retryButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: Colors.primary },
  retryButtonText: { color: Colors.white, fontSize: 16, fontWeight: '600' as const },
  bottomSpacer: { height: 32 },
  introCard: { paddingVertical: 12, paddingHorizontal: 16, marginBottom: 4, alignItems: 'center' as const },
  introText: { fontSize: 15, fontWeight: '700' as const, textAlign: 'center' as const, letterSpacing: -0.1 },
  allIngredientsCard: { gap: 10 },
  allIngItem: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#EEEEEA', borderLeftWidth: 4, shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 14, elevation: 1 },
  allIngRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  allIngDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  allIngName: { flex: 1, fontSize: 15, lineHeight: 20, color: Colors.text, fontWeight: '800' as const, letterSpacing: -0.15 },
  allIngBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, flexShrink: 0 },
  allIngBadgeText: { fontSize: 9, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: 0.25 },
  allIngExplanation: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EDEDE8', backgroundColor: '#FFFFFF' },
  allIngExplanationText: { fontSize: 13, lineHeight: 19, fontWeight: '500' as const, color: '#4E4E49' },
  allIngPendingRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EDEDE8' },
  allIngPendingText: { fontSize: 12.5, fontWeight: '600' as const, color: '#9A9A96', fontStyle: 'italic' as const },
  approvedFooterCard: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: '#E8F9ED', borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.18)' },
  approvedFooterText: { flex: 1, fontSize: 14, color: '#2D6A3E', fontWeight: '600' as const, lineHeight: 20 },
  confettiLayer: { position: 'absolute' as const, top: 0, left: 0, right: 0, height: 400, pointerEvents: 'none' as const },
  confettiPiece: { position: 'absolute' as const, top: 0, borderRadius: 2 },
  offscreenContainer: { position: 'absolute' as const, left: -9999, top: -9999, opacity: 0 },
});