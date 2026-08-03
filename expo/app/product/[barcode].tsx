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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ChevronLeft, Share2, MessageCircle, Shield,
  CheckCircle, Camera, Lightbulb, RefreshCw, Layers, MapPin,
  Store, Heart, Navigation, UserCheck, LocateFixed, Megaphone, Leaf,
} from 'lucide-react-native';
import DrToxiVerdict from '@/components/DrToxiVerdict';
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
import { PhotoType, HealthyAlternative, DetectedIngredient, SubstanceDetected, VerdictTier } from '@/types';
import { getCategoryLabel, generateBarcodeAlternatives, verdictTierFromProduct, buildApprovedDescription } from '@/utils/api';
import { findRealAlternatives, getCachedRealAlternatives } from '@/utils/realAlternatives';
import { useHealthProfile } from '@/providers/HealthProfileProvider';
import { getProfileScanAlerts } from '@/utils/healthProfile';
import { getStoreRegion, getRegionSpecialtyStores, getRegionGroceryStores, getRegionCleanBrands, getRegionLocalMarkets } from '@/utils/regionDetection';
import { useLocation } from '@/providers/LocationProvider';
import { t, isEnglish, isKorean, pick } from '@/utils/i18n';
import { getDrToxiBadgeAvatarForVerdict, getDrToxiCosmeticAvatarForVerdict } from '@/constants/drToxiAvatars';
import { isUltraToxicCirc } from '@/constants/ultraToxicIngredients';
import { computeToxiScore, computeIngredientToxiScore } from '@/utils/toxiScore';
import type { DrToxiAvatarSource } from '@/constants/drToxiAvatars';

// ─────────────────────────────────────────────
// ✅ Conversion directe niveau_risque → couleur/label
// On utilise niveau_risque stocké par lookupIngredient (api.ts)
// PAS de re-classification textuelle qui écrase la base de données
// ─────────────────────────────────────────────
type DisplayLevel = 'danger' | 'ultratoxic' | 'probable' | 'possible' | 'aucun';

// Verdict vocabulary domain. Food and cosmetics each have their own scale; the
// three non-food categories (household chemicals, textiles, kitchen materials)
// share a chemical/material hazard scale and NEVER reuse food wording.
type VerdictDomain = 'food' | 'cosmetic' | 'household' | 'textile' | 'kitchen';

/** Non-food and cosmetic scales only have 4 levels — clamp the 5-tier levels onto them. */
function clampLevel(level: VerdictLevel): 'danger' | 'warning' | 'moderation' | 'approuve' {
  if (level === 'ultratoxic') return 'danger';
  return level;
}

/** Localized banner intro for a non-food category, adapted to its real-world context. */
function nonFoodIntro(domain: 'household' | 'textile' | 'kitchen', rawLevel: VerdictLevel): string {
  const level = clampLevel(rawLevel);
  if (domain === 'household') {
    switch (level) {
      case 'danger':     return t('intro_household_danger');
      case 'warning':    return t('intro_household_hazardous');
      case 'moderation': return t('intro_household_caution');
      case 'approuve':   return t('intro_household_safe');
    }
  }
  if (domain === 'textile') {
    switch (level) {
      case 'danger':     return t('intro_textile_danger');
      case 'warning':    return t('intro_textile_hazardous');
      case 'moderation': return t('intro_textile_caution');
      case 'approuve':   return t('intro_textile_safe');
    }
  }
  switch (level) {
    case 'danger':     return t('intro_kitchen_danger');
    case 'warning':    return t('intro_kitchen_hazardous');
    case 'moderation': return t('intro_kitchen_caution');
    case 'approuve':   return t('intro_kitchen_safe');
  }
}

function getDisplayLevel(ing: { niveau_risque?: string | null; classification_circ?: string | null }): DisplayLevel {
  // 🟥 The 9 banned ULTRA TOXIC additives are stamped with the dedicated circ sentinel and
  // always show the bordeaux ULTRA TOXIC badge (checked before the generic risk mapping).
  if (isUltraToxicCirc(ing.classification_circ)) return 'ultratoxic';
  switch (ing.niveau_risque) {
    case 'danger':   return 'danger';
    case 'probable': return 'probable';
    case 'possible': return 'possible';
    default:         return 'aucun';
  }
}

function getLevelBadgeColor(level: DisplayLevel, domain: VerdictDomain = 'food'): string {
  if (domain === 'cosmetic') {
    switch (level) {
      case 'danger':     return '#7C3AED'; // 🟣 TOXIC
      case 'ultratoxic': return '#7C3AED'; // (n'arrive pas en cosmétique — sécurité)
      case 'probable':   return '#EAB308'; // (n'arrive pas en cosmétique — sécurité)
      case 'possible':   return '#EAB308'; // 🟡 DISPUTED
      case 'aucun':      return '#2E9E34'; // 🟢 APPROVED
    }
  }
  switch (level) {
    case 'danger':     return '#D0260F'; // 🔴 CANCÉRIGÈNE
    case 'ultratoxic': return '#722F37'; // 🟥 ULTRA TOXIC (bordeaux)
    case 'probable':   return '#E8730A'; // 🟠 ULTRA-TRANSFORMÉ
    case 'possible':   return '#EAB308'; // 🟡 MODÉRATION
    case 'aucun':      return '#2E9E34'; // 🟢 APPROUVÉ
  }
}

function getLevelBadgeLabel(level: DisplayLevel, domain: VerdictDomain = 'food'): string {
  if (domain === 'cosmetic') {
    switch (level) {
      case 'danger':     return t('cosmetic_badge_toxic');     // TOXIQUE / TOXIC
      case 'ultratoxic': return t('cosmetic_badge_toxic');     // (sécurité)
      case 'probable':   return t('cosmetic_badge_disputed');  // (sécurité)
      case 'possible':   return t('cosmetic_badge_disputed');  // CONTESTÉ / DISPUTED
      case 'aucun':      return t('cosmetic_badge_approved');  // APPROUVÉ / APPROVED
    }
  }
  if (domain === 'household' || domain === 'textile' || domain === 'kitchen') {
    switch (level) {
      case 'danger':     return t('nf_badge_danger');    // CANCÉRIGÈNE / CARCINOGENIC
      case 'ultratoxic': return t('nf_badge_danger');    // (sécurité)
      case 'probable':   return t('nf_badge_hazardous'); // DANGEREUX / HAZARDOUS
      case 'possible':   return t('nf_badge_caution');   // PRÉCAUTION / CAUTION
      case 'aucun':      return t('nf_badge_safe');      // SÛR / SAFE
    }
  }
  switch (level) {
    case 'danger':     return t('badge_danger');     // CANCÉRIGÈNE
    case 'ultratoxic': return t('badge_ultra_toxic'); // ULTRA TOXIQUE / ULTRA TOXIC / 초독성
    case 'probable':   return t('ingredient_badge_industrial'); // INDUSTRIEL / INDUSTRIAL
    case 'possible':   return t('ingredient_badge_disputed');   // CONTESTÉ / DISPUTED
    case 'aucun':      return t('badge_approved');   // APPROUVÉ
  }
}

function getBannerConfig(rawLevel: VerdictLevel, domain: VerdictDomain = 'food'): { color: string; label: string; intro: string; icon: React.ReactNode; avatarUri: DrToxiAvatarSource | null } {
  if (domain === 'household' || domain === 'textile' || domain === 'kitchen') {
    const level = clampLevel(rawLevel);
    switch (level) {
      case 'danger':
        return { color: '#D0260F', label: t('nf_badge_danger'), intro: nonFoodIntro(domain, 'danger'), icon: null, avatarUri: getDrToxiBadgeAvatarForVerdict(level) };
      case 'warning':
        return { color: '#E8730A', label: t('nf_badge_hazardous'), intro: nonFoodIntro(domain, 'warning'), icon: null, avatarUri: getDrToxiBadgeAvatarForVerdict(level) };
      case 'moderation':
        return { color: '#EAB308', label: t('nf_badge_caution'), intro: nonFoodIntro(domain, 'moderation'), icon: null, avatarUri: getDrToxiBadgeAvatarForVerdict(level) };
      case 'approuve':
        return { color: '#2E9E34', label: t('nf_badge_safe'), intro: nonFoodIntro(domain, 'approuve'), icon: <CheckCircle color="#FFFFFF" size={28} />, avatarUri: null };
    }
  }
  if (domain === 'cosmetic') {
    const level = clampLevel(rawLevel);
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
  switch (rawLevel) {
    case 'ultratoxic':
      return { color: '#722F37', label: t('badge_ultra_toxic'), intro: t('intro_ultra_toxic'), icon: null, avatarUri: getDrToxiBadgeAvatarForVerdict('ultratoxic') };
    case 'danger':
      return { color: '#D0260F', label: t('badge_danger'), intro: t('intro_danger'), icon: null, avatarUri: getDrToxiBadgeAvatarForVerdict(rawLevel) };
    case 'warning':
      return { color: '#E8730A', label: t('badge_caution'), intro: t('intro_warning'), icon: null, avatarUri: getDrToxiBadgeAvatarForVerdict(rawLevel) };
    case 'moderation':
      return { color: '#EAB308', label: t('badge_moderation'), intro: t('intro_moderation'), icon: null, avatarUri: getDrToxiBadgeAvatarForVerdict(rawLevel) };
    case 'approuve':
      return { color: '#2E9E34', label: t('badge_approved'), intro: t('intro_approved'), icon: <CheckCircle color="#FFFFFF" size={28} />, avatarUri: null };
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
  const { profile: healthProfile } = useHealthProfile();
  const { isPro } = useSubscription();
  const { recordShare } = useBadges();
  const shareCardRef = useRef<View>(null);
  const [isShareLoading, setIsShareLoading] = useState<boolean>(false);
  const hasRequestedReview = useRef<boolean>(false);
  const [realAlternatives, setRealAlternatives] = useState<HealthyAlternative[]>([]);
  const [isFindingRealAlternative, setIsFindingRealAlternative] = useState<boolean>(false);
  const [realAlternativeError, setRealAlternativeError] = useState<boolean>(false);

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

  // ✅ Verdict 100% déterministe — 6 tiers calculés par api.ts (verdictTier),
  // avec dérivation depuis riskGroup pour les anciens scans sans tier stocké.
  const { verdictLevel, liveVerdictTier } = useMemo(() => {
    let _verdictLevel: VerdictLevel = 'approuve';
    let _tier: VerdictTier = 'approved';
    if (product) {
      _tier = verdictTierFromProduct(product);
      switch (_tier) {
        case 'ultra_toxic':  _verdictLevel = 'ultratoxic'; break;
        case 'carcinogenic': _verdictLevel = 'danger';     break;
        case 'processed':    _verdictLevel = 'warning';    break;
        case 'moderation':   _verdictLevel = 'moderation'; break;
        case 'approved':
        default:             _verdictLevel = 'approuve';   break;
      }
    }
    return { verdictLevel: _verdictLevel, liveVerdictTier: _tier };
  }, [product]);

  // After a POSITIVE (green "approved") product scan, ask for Apple's native
  // in-app review. Only on a good verdict, only via the system sheet, capped
  // to Apple's 3×/year (enforced again in the helper). Toxic scans never ask.
  useEffect(() => {
    if (!product || hasRequestedReview.current) return;
    if (verdictLevel !== 'approuve') return;
    hasRequestedReview.current = true;
    void maybeRequestReviewAfterPositiveScan(true);
  }, [product, verdictLevel]);

  // Real alternatives found earlier in this session reappear instantly when the
  // user re-opens this product (in-memory cache in realAlternatives.ts).
  useEffect(() => {
    if (!product) return;
    const cached = getCachedRealAlternatives(product.name, verdictTierFromProduct(product));
    if (cached && cached.length > 0) setRealAlternatives(cached);
  }, [product]);

  // Runs the real-alternatives web search for an eligible (bad) product.
  const runRealAlternativesSearch = useCallback(async () => {
    if (!product || product.productCategory === 'cosmetic') return;
    const tier = verdictTierFromProduct(product);
    if (tier !== 'processed' && tier !== 'ultra_toxic' && tier !== 'carcinogenic') return;
    setIsFindingRealAlternative(true);
    setRealAlternativeError(false);
    const badIngredients = (product.substances ?? [])
      .filter(s => s.niveau_risque === 'danger' || s.niveau_risque === 'probable')
      .map(s => s.nom);
    const { alternatives, error } = await findRealAlternatives({
      productName: product.name,
      badIngredients,
      verdictTier: tier,
      productCategory: product.productCategory,
      // Full label ingredients — lets the AI infer the TRUE product type (e.g.
      // oil + egg yolk + vinegar = mayonnaise) even when the scanned name is off.
      ingredients: (product.substances ?? []).map(s => s.nom),
    });
    if (alternatives.length > 0) {
      setRealAlternatives(alternatives);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setRealAlternativeError(true);
      console.log('[product] findRealAlternatives failed:', error);
    }
    setIsFindingRealAlternative(false);
  }, [product]);

  // Alternatives are NOT loaded automatically anymore — the user taps the green
  // "Show alternatives" button to run the search on demand (saves credits and
  // keeps the scan result instant). Previously-found results still rehydrate
  // from the in-memory cache via the effect above.

  const { location, isResolving, requestAndResolve } = useLocation();
  // Store suggestions follow the user's REAL location (GPS), not the phone
  // language — so an English phone in Quebec gets Quebec stores, not BC chains.
  const userCountry = useMemo(() => getStoreRegion(), [location]);

  const handleEnableLocation = useCallback(async () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await requestAndResolve();
  }, [requestAndResolve]);

  // Re-reads the device GPS so travelers can update store suggestions for their
  // current city. If permission is denied/expired, guides the user to Settings
  // instead of silently keeping the old (first-scan) location.
  const handleRefreshLocation = useCallback(async () => {
    if (Platform.OS === 'web' || isResolving) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await requestAndResolve();
    if (result) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    Alert.alert(
      pick({ en: 'Location unavailable', fr: 'Localisation indisponible', ko: '위치를 사용할 수 없음' }),
      pick({
        en: 'Enable location access in Settings to refresh store suggestions for where you are now.',
        fr: "Activez l'accès à la localisation dans les Réglages pour rafraîchir les suggestions de magasins près de votre position actuelle.",
        ko: '현재 위치에 맞는 매장 추천을 새로고침하려면 설정에서 위치 접근을 허용하세요.',
      }),
      [
        { text: pick({ en: 'Cancel', fr: 'Annuler', ko: '취소' }), style: 'cancel' },
        {
          text: pick({ en: 'Open Settings', fr: 'Ouvrir les Réglages', ko: '설정 열기' }),
          onPress: () => { void Linking.openSettings(); },
        },
      ],
    );
  }, [requestAndResolve, isResolving]);

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

  // The instant local verdict shows first; the AI then verifies every ingredient
  // in the background and may upgrade/downgrade the tier. While any ingredient
  // description is still pending, the verdict is only PROVISIONAL — surface a
  // spinning green ring on the verdict card until every ingredient is verified.
  const isAnalyzing = useMemo(() => {
    return ingredientsList.some(
      (ing) => ing.descriptionPending === true && !(ing.explication && ing.explication.trim().length > 0),
    );
  }, [ingredientsList]);

  // Advice built from what was ACTUALLY found on this scanned label — names the
  // flagged substances (worst first) and turns them into concrete guidance.
  const scannedAdvice = useMemo(() => {
    const severityRank: Record<DisplayLevel, number> = { danger: 0, ultratoxic: 1, probable: 2, possible: 3, aucun: 4 };
    const flagged = ingredientsList
      .filter((ing) => getDisplayLevel(ing) !== 'aucun')
      .slice()
      .sort((a, b) => severityRank[getDisplayLevel(a)] - severityRank[getDisplayLevel(b)]);
    return getScannedSubstancesAdvice(flagged);
  }, [ingredientsList]);

  // Personalized profile alerts: cross the user's health profile with the
  // ingredients ACTUALLY detected on this label (pregnancy, vegetarian/vegan,
  // zero-additive, etc.). Advisory only — never changes the toxicity verdict.
  const profileAlerts = useMemo(() => {
    const flaggedAdditiveCount = ingredientsList.filter((ing) => getDisplayLevel(ing) !== 'aucun').length;
    return getProfileScanAlerts(
      healthProfile,
      ingredientsList.map((ing) => ({ nom: ing.nom })),
      flaggedAdditiveCount,
    );
  }, [healthProfile, ingredientsList]);

  // Full 2-3 sentence description (what it is, why approved, concrete health impact),
  // with correct capitalization and subject/verb agreement ("Potatoes are…").
  const getApprovedDescription = useCallback((name: string): string => {
    return buildApprovedDescription(name);
  }, []);

  const additiveCategory = useMemo(
    () => productCategoryToAdditiveCategory(product?.productCategory),
    [product?.productCategory],
  );

  // ToxiScore /10 — 100 % déterministe (utils/toxiScore.ts). La tranche vient du
  // verdict affiché (donc du badge le plus sévère), la position dans la tranche
  // vient de la proportion d'ingrédients propres. Note et verdict sont toujours alignés.
  const toxiScore = useMemo<number>(
    () => computeToxiScore(verdictLevel, ingredientsList),
    [verdictLevel, ingredientsList],
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
  const verdictDomain: VerdictDomain =
    isCosmetic ? 'cosmetic'
    : additiveCategory === 'household' ? 'household'
    : additiveCategory === 'textile' ? 'textile'
    : additiveCategory === 'kitchen' ? 'kitchen'
    : 'food';
  const bannerConfig = getBannerConfig(verdictLevel, verdictDomain);
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
          : verdictLevel === 'ultratoxic'
            ? `[${t('badge_ultra_toxic')}]`
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

  const productTier = verdictTierFromProduct(product);
  const canFindRealAlternative = !isCosmetic && (productTier === 'processed' || productTier === 'ultra_toxic' || productTier === 'carcinogenic');

  const handleFindRealAlternative = async () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await runRealAlternativesSearch();
  };

  const isNonFood = additiveCategory !== 'food';

  const specialtyStores = getRegionSpecialtyStores(userCountry);
  const groceryStores = getRegionGroceryStores(userCountry);
  const cleanBrands = getRegionCleanBrands(userCountry, isNonFood);
  const localMarkets = getRegionLocalMarkets(userCountry);
  const hasMapStores = specialtyStores.length > 0 || groceryStores.length > 0 || localMarkets.length > 0;

  // Single unified "Healthier alternatives" hub, shown only for bad products. It
  // merges the real in-store product alternatives, the tappable store finder, the
  // clean-brand chips and the product-specific advice into ONE fluid card (no more
  // duplicated store lists across two sections).
  const isBadVerdict = verdictLevel === 'danger' || verdictLevel === 'warning' || verdictLevel === 'ultratoxic';
  const showAlternativesHub = isBadVerdict && (canFindRealAlternative || hasMapStores || cleanBrands.length > 0 || !!scannedAdvice);

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

        <DrToxiVerdict level={verdictLevel} isCosmetic={isCosmetic} isAnalyzing={isAnalyzing} toxiScore={toxiScore} />

        {profileAlerts.length > 0 ? (
          <View style={styles.profileAlertsWrap}>
            <View style={styles.profileAlertsHeader}>
              <UserCheck color={Colors.primary} size={16} />
              <Text style={styles.profileAlertsHeaderText}>
                {pick({ en: 'For your profile', fr: 'Pour ton profil', ko: '당신의 프로필을 위해' })}
              </Text>
            </View>
            {profileAlerts.map((alert) => (
              <View key={`profile-alert-${alert.prefId}`} style={styles.profileAlertCard} testID={`profile-alert-${alert.prefId}`}>
                <Text style={styles.profileAlertTitle}>{alert.title}</Text>
                <Text style={styles.profileAlertMessage}>{alert.message}</Text>
              </View>
            ))}
          </View>
        ) : null}

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
                const color = getLevelBadgeColor(level, verdictDomain);
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
                      <View style={[styles.allIngScore, { borderColor: color + '55' }]}>
                        <Text style={[styles.allIngScoreText, { color }]} testID={`ingredient-score-${index}`}>
                          {computeIngredientToxiScore(ing)}<Text style={styles.allIngScoreOutOf}>/10</Text>
                        </Text>
                      </View>
                      <View style={[styles.allIngBadge, { backgroundColor: color }]}>
                        <Text style={styles.allIngBadgeText}>{getLevelBadgeLabel(level, verdictDomain)}</Text>
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

        {showAlternativesHub && (
          <View style={styles.section}>
            {locationLabel && Platform.OS !== 'web' ? (
              <TouchableOpacity
                style={styles.sectionTitleRow}
                onPress={handleRefreshLocation}
                activeOpacity={0.7}
                disabled={isResolving}
                testID="refresh-location-title"
              >
                <Leaf color={Colors.safe} size={18} />
                <Text style={[styles.sectionTitle, styles.sectionTitleFlex]}>
                  {pick({ en: 'Healthier alternatives', fr: 'Alternatives plus saines', ko: '더 건강한 대안' })}
                </Text>
                {isResolving ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <LocateFixed color={Colors.primary} size={18} />
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.sectionTitleRow}>
                <Leaf color={Colors.safe} size={18} />
                <Text style={styles.sectionTitle}>
                  {pick({ en: 'Healthier alternatives', fr: 'Alternatives plus saines', ko: '더 건강한 대안' })}
                </Text>
              </View>
            )}

            <View style={styles.bioStoresCard}>
              {/* 1 ─ Real product alternatives: photo, name, tappable store, why it's cleaner */}
              {canFindRealAlternative ? (
                realAlternatives.length > 0 ? (
                  <View style={styles.realAltList}>
                    {realAlternatives.map((alt, index) => (
                      <View key={`real-alt-${index}`} style={styles.realAltCard} testID={`real-alternative-${index}`}>
                        {alt.imageUrl ? (
                          <Image source={{ uri: alt.imageUrl }} style={styles.realAltImage} contentFit="contain" />
                        ) : null}
                        <View style={styles.realAltTextWrap}>
                          <Text style={styles.realAltName}>{alt.nom}</Text>
                          {alt.magasin ? (
                            <TouchableOpacity
                              style={styles.realAltStoreRow}
                              onPress={() => handleOpenStoreInMaps(alt.magasin ?? '')}
                              activeOpacity={0.6}
                              testID={`real-alt-store-${index}`}
                            >
                              <Store color="#2E9E34" size={13} />
                              <Text style={styles.realAltStore}>{alt.magasin}</Text>
                              <Navigation color="#86C091" size={12} />
                            </TouchableOpacity>
                          ) : null}
                          <Text style={styles.realAltReason}>{alt.raison}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.showAlternativesButton}
                    onPress={handleFindRealAlternative}
                    activeOpacity={0.85}
                    disabled={isFindingRealAlternative}
                    testID="find-real-alternative-button"
                  >
                    {isFindingRealAlternative ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Leaf color="#FFFFFF" size={18} strokeWidth={2.4} />
                    )}
                    <Text style={styles.showAlternativesButtonText}>
                      {isFindingRealAlternative
                        ? pick({ en: 'Finding cleaner products…', fr: 'Recherche en cours…', ko: '찾는 중…' })
                        : realAlternativeError
                          ? pick({ en: 'No results — tap to try again', fr: 'Aucune trouvée — réessayer', ko: '결과 없음 — 다시 시도' })
                          : pick({ en: 'Show alternatives', fr: 'Suggérer des alternatives', ko: '대안 보기' })}
                    </Text>
                  </TouchableOpacity>
                )
              ) : null}

              {canFindRealAlternative && (hasMapStores || cleanBrands.length > 0 || !!scannedAdvice) ? (
                <View style={styles.altDivider} />
              ) : null}

              {/* 2 ─ Where to buy near you — every store row opens in Maps */}
              {hasMapStores ? (
                <>
                  {locationLabel ? (
                    <TouchableOpacity
                      style={styles.locationPill}
                      onPress={handleRefreshLocation}
                      activeOpacity={0.75}
                      disabled={isResolving}
                      testID="refresh-location-pill"
                    >
                      <MapPin color="#2E9E34" size={13} />
                      <Text style={styles.locationPillText} numberOfLines={1}>
                        {pick({ en: 'Suggestions near', fr: 'Suggestions proches de', ko: '내 주변 추천' })} {locationLabel}
                      </Text>
                      {isResolving ? (
                        <ActivityIndicator size="small" color="#2E9E34" />
                      ) : (
                        <LocateFixed color="#2E9E34" size={13} />
                      )}
                    </TouchableOpacity>
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

                  <View style={styles.mapsHintRow}>
                    <Navigation color="#2E9E34" size={12} />
                    <Text style={styles.mapsHintText}>
                      {pick({ en: 'Tap a store to open it in Maps', fr: 'Touchez un magasin pour l\u2019ouvrir dans Plans', ko: '매장을 누르면 지도에서 열립니다' })}
                    </Text>
                  </View>

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
                </>
              ) : null}

              {/* 3 ─ Recommended organic / clean brands */}
              {cleanBrands.length > 0 ? (
                <>
                  <Text style={styles.bioStoresSubtitle}>
                    {isNonFood ? t('clean_brands') : t('organic_brands')}
                  </Text>
                  <BrandChips brands={cleanBrands} />
                </>
              ) : null}

              {/* 4 ─ Product-specific advice / homemade tips (least prioritary, at the bottom) */}
              {scannedAdvice ? (
                <>
                  <Text style={styles.bioStoresSubtitle}>
                    {pick({ en: 'Advice for this product', fr: 'Conseils pour ce produit', ko: '이 제품에 대한 조언' })}
                  </Text>
                  <View style={styles.scannedAdviceCallout}>
                    <Text style={styles.scannedAdviceText}>{scannedAdvice}</Text>
                  </View>
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

        <TouchableOpacity
          style={styles.denounceButton}
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(isPro ? `/hub-denounce?scanKind=product&refId=${encodeURIComponent(barcode ?? '')}` : '/paywall');
          }}
          activeOpacity={0.8}
          testID="denounce-product"
        >
          <Megaphone color="#D0260F" size={20} strokeWidth={2.2} />
          <Text style={styles.denounceButtonText}>{pick({ en: 'Share to NonToxic Hub', fr: 'Partager au NonToxic Hub', ko: 'NonToxic Hub에 공유하기' })}</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.offscreenContainer} pointerEvents="none">
        <View ref={shareCardRef} {...(Platform.OS === 'web' ? {} : { collapsable: false as const })}>
          <ShareImageCard
            productName={product.name} brand={product.brand} riskGroup={product.riskGroup}
            verdictTier={liveVerdictTier}
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
  denounceButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10, backgroundColor: Colors.surface, borderRadius: 16, paddingVertical: 15, marginTop: 12, borderWidth: 1.5, borderColor: 'rgba(208,38,15,0.22)' },
  denounceButtonText: { color: '#D0260F', fontSize: 15, fontWeight: '700' as const, letterSpacing: -0.2 },
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
  sectionTitleFlex: { flex: 1, marginBottom: 0 },
  locationLinkText: { color: Colors.primary, textDecorationLine: 'underline' as const },
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
  realAltImage: { width: '100%' as const, height: 160, backgroundColor: '#F7F7F5' },
  realAltTextWrap: { padding: 14, gap: 6 },
  realAltName: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  realAltStoreRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5 },
  realAltStore: { fontSize: 13, fontWeight: '600' as const, color: '#2E9E34' },
  realAltReason: { fontSize: 13.5, lineHeight: 19, color: Colors.textSecondary },
  realAltErrorText: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 6 },
  realAltList: { gap: 12 },
  realAltCard: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden' as const, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.16)', shadowColor: '#1F5A28', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 3 },
  realAltLoadingRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 9, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.18)' },
  realAltLoadingText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: '#1F5A28', fontWeight: '600' as const },
  showAlternativesButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 9, paddingVertical: 15, paddingHorizontal: 18, backgroundColor: '#2E9E34', borderRadius: 16, shadowColor: '#2E9E34', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 4 },
  showAlternativesButtonText: { fontSize: 15.5, color: '#FFFFFF', fontWeight: '800' as const, letterSpacing: -0.2 },
  altDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(46, 158, 52, 0.22)', marginVertical: 16 },
  realAltSearchingHint: { fontSize: 12.5, lineHeight: 18, color: Colors.textSecondary, marginTop: -4, marginBottom: 8 },
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
  profileAlertsWrap: { marginHorizontal: 16, marginBottom: 8, gap: 8 },
  profileAlertsHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7, marginBottom: 2, marginTop: 4 },
  profileAlertsHeaderText: { fontSize: 13, fontWeight: '700' as const, color: Colors.primary, textTransform: 'uppercase' as const, letterSpacing: 0.4 },
  profileAlertCard: { backgroundColor: 'rgba(46, 158, 52, 0.06)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.18)', borderLeftWidth: 4, borderLeftColor: Colors.primary },
  profileAlertTitle: { fontSize: 13.5, fontWeight: '800' as const, color: Colors.primary, marginBottom: 3 },
  profileAlertMessage: { fontSize: 14, lineHeight: 20, color: '#1A1A1A', fontWeight: '500' as const },
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
  allIngScore: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, borderWidth: 1, backgroundColor: '#FFFFFF', flexShrink: 0 },
  allIngScoreText: { fontSize: 11.5, fontWeight: '900' as const, letterSpacing: -0.2 },
  allIngScoreOutOf: { fontSize: 9, fontWeight: '800' as const, opacity: 0.65 },
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