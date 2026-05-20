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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ChevronLeft, Share2, MessageCircle, Shield,
  CheckCircle, Camera, Lightbulb, RefreshCw, Layers, MapPin,
  Store, Heart,
} from 'lucide-react-native';
import DrToxiVerdict from '@/components/DrToxiVerdict';
import type { VerdictLevel } from '@/components/DrToxiVerdict';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as StoreReview from 'expo-store-review';
import ShareImageCard from '@/components/ShareImageCard';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useBadges } from '@/providers/BadgesProvider';
import { getRiskBadgeInfo, productCategoryToAdditiveCategory, findAdditiveByName, getAdditiveDescription } from '@/constants/additives';
import { PhotoType, HealthyAlternative } from '@/types';
import { getCategoryLabel, generateBarcodeAlternatives } from '@/utils/api';
import { detectRegion, getRegionSpecialtyStores, getRegionGroceryStores, getRegionCleanBrands, getRegionLocalMarkets } from '@/utils/regionDetection';
import { getDisplayedRiskScore } from '@/utils/riskScore';
import { t, isEnglish } from '@/utils/i18n';
import { getDrToxiBadgeAvatarForVerdict } from '@/constants/drToxiAvatars';

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

function getLevelBadgeColor(level: DisplayLevel): string {
  switch (level) {
    case 'danger':   return '#D0260F'; // 🔴 CANCÉRIGÈNE
    case 'probable': return '#E8730A'; // 🟠 ULTRA-TRANSFORMÉ
    case 'possible': return '#EAB308'; // 🟡 MODÉRATION
    case 'aucun':    return '#2E9E34'; // 🟢 APPROUVÉ
  }
}

function getLevelBadgeLabel(level: DisplayLevel): string {
  switch (level) {
    case 'danger':   return t('badge_danger');     // CANCÉRIGÈNE
    case 'probable': return t('badge_caution');    // ULTRA-TRANSFORMÉ
    case 'possible': return t('badge_moderation'); // MODÉRATION
    case 'aucun':    return t('badge_approved');   // APPROUVÉ
  }
}

function getBannerConfig(level: VerdictLevel): { color: string; label: string; intro: string; icon: React.ReactNode; avatarUri: string | null } {
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
  const english = isEnglish();
  switch (level) {
    case 'danger':
      return english ? 'Avoid regular consumption' : 'À éviter régulièrement';
    case 'warning':
      return english ? 'Limit as much as possible' : 'À limiter fortement';
    case 'moderation':
      return english ? 'Occasional only' : 'Occasionnel seulement';
    case 'approuve':
      return english ? 'Good everyday choice' : 'Bon choix au quotidien';
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
    case 'quebec':       return isEnglish() ? '(Quebec)' : '(Québec)';
    case 'canada_other': return isEnglish() ? '(Canada)' : '(Canada)';
    case 'france':       return isEnglish() ? '(France)' : '(France)';
    case 'usa':          return isEnglish() ? '(USA)' : '(USA)';
    case 'belgium':      return isEnglish() ? '(Belgium)' : '(Belgique)';
    case 'switzerland':  return isEnglish() ? '(Switzerland)' : '(Suisse)';
    default:             return '';
  }
}

function shortenText(text: string, maxSentences: number): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  if (sentences.length <= maxSentences) return text;
  return sentences.slice(0, maxSentences).join(' ');
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

  useEffect(() => {
    const maybeRequestReview = async () => {
      if (hasRequestedReview.current) return;
      try {
        const countStr = await AsyncStorage.getItem('toxiscan_scan_count');
        const count = countStr ? parseInt(countStr, 10) : 0;
        const newCount = count + 1;
        await AsyncStorage.setItem('toxiscan_scan_count', String(newCount));
        if (newCount === 3 || newCount === 10 || newCount === 25) {
          hasRequestedReview.current = true;
          const isAvailable = await StoreReview.isAvailableAsync();
          if (isAvailable) {
            setTimeout(() => { void StoreReview.requestReview(); }, 1500);
          }
        }
      } catch (e) {
        console.log('[ProductScreen] Review request error:', e);
      }
    };
    void maybeRequestReview();
  }, []);

  const product = useMemo(() => {
    return history.find(p => p.barcode === barcode);
  }, [history, barcode]);

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

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

  // ✅ Verdict 100% déterministe — basé sur product.riskGroup calculé par api.ts
  const { verdictLevel } = useMemo(() => {
    let _verdictLevel: VerdictLevel = 'approuve';
    switch (product.riskGroup) {
      case 'group1':  _verdictLevel = 'danger';     break;
      case 'group2a': _verdictLevel = 'warning';    break;
      case 'group2b': _verdictLevel = 'moderation'; break;
      case 'none':
      default:        _verdictLevel = 'approuve';   break;
    }
    console.log('[Product] Verdict from riskGroup:', product.riskGroup, '→', _verdictLevel);
    return { verdictLevel: _verdictLevel };
  }, [product.riskGroup]);

  const isGreen = verdictLevel === 'approuve';
  const bannerConfig = getBannerConfig(verdictLevel);
  const verdictAction = getVerdictAction(verdictLevel);
  const displayedRiskScore = getDisplayedRiskScore(product);
  const verdictProgress = `${displayedRiskScore}%` as `${number}%`;
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
  const regionInfo = useMemo(() => detectRegion(), []);
  const userCountry = regionInfo.region;

  const shortAnalysis = useMemo(() => {
    if (!product.analysisSummary) return null;
    return shortenText(product.analysisSummary, 3);
  }, [product.analysisSummary]);

  const ingredientsList = product.detectedIngredients && product.detectedIngredients.length > 0
    ? product.detectedIngredients
    : product.substances ?? [];


  const getApprovedDescription = useCallback((name: string): string => {
    return isEnglish()
      ? `${name} is a natural or commonly accepted ingredient with no identified health risk at typical food levels.`
      : `${name} est un ingrédient naturel ou couramment accepté, sans risque identifié aux doses alimentaires habituelles.`;
  }, []);

  const additiveCategory = useMemo(
    () => productCategoryToAdditiveCategory(product.productCategory),
    [product.productCategory],
  );
  const isNonFood = additiveCategory !== 'food';

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

        <View style={[styles.badgeContainer, { backgroundColor: bannerConfig.color, shadowColor: bannerConfig.color }]}>
          <View style={styles.verdictTopLine}>
            <View style={styles.verdictIconBubble}>
              {bannerConfig.avatarUri ? (
                <Image source={{ uri: bannerConfig.avatarUri }} style={styles.verdictAvatar} contentFit="contain" />
              ) : (
                bannerConfig.icon
              )}
            </View>
            <View style={styles.badgeTextContainer}>
              <Text style={styles.verdictEyebrow}>{isEnglish() ? 'RISK VERDICT' : 'VERDICT SANTÉ'}</Text>
              <Text style={styles.badgeLabel}>{bannerConfig.label}</Text>
            </View>
          </View>
          <Text style={styles.verdictAction}>{verdictAction}</Text>
          <Text style={styles.verdictIntro}>{bannerConfig.intro}</Text>
          <Text style={styles.riskMeterLabel}>ToxiScore</Text>
          <View style={styles.riskMeterRow}>
            <View style={styles.riskTrack}>
              <View style={[styles.riskFill, { width: verdictProgress }]} />
            </View>
            <Text style={styles.riskMeterValue}>{displayedRiskScore}%</Text>
          </View>
        </View>

        <DrToxiVerdict level={verdictLevel} />

        {shortAnalysis ? (
          <View style={[styles.aiSummaryCard, { borderColor: bannerConfig.color }]}> 
            <Text style={[styles.aiSummaryKicker, { color: bannerConfig.color }]}>{isEnglish() ? 'SCAN SUMMARY' : 'RÉSUMÉ DU SCAN'}</Text>
            <Text style={styles.aiSummaryText}>{shortAnalysis}</Text>
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
                const color = getLevelBadgeColor(level);
                // For non-food scans, prefer the category-appropriate description
                // from the additives database (FR/EN) when we can match the ingredient.
                const additiveMatch = isNonFood ? findAdditiveByName(ing.nom, additiveCategory) : undefined;
                const additiveDescription = additiveMatch ? getAdditiveDescription(additiveMatch) : '';
                const description = additiveDescription.length > 0
                  ? additiveDescription
                  : (ing.explication && ing.explication.trim().length > 0)
                    ? ing.explication
                    : (level === 'aucun' ? getApprovedDescription(ing.nom) : '');
                return (
                  <View key={`all-ing-${index}`} style={[styles.allIngItem, { borderLeftColor: color }]} testID={`ingredient-row-${index}`}>
                    <View style={styles.allIngRow}>
                      <View style={[styles.allIngDot, { backgroundColor: color }]} />
                      <Text style={styles.allIngName} numberOfLines={2}>{ing.nom}</Text>
                      <View style={[styles.allIngBadge, { backgroundColor: color }]}>
                        <Text style={styles.allIngBadgeText}>{getLevelBadgeLabel(level)}</Text>
                      </View>
                    </View>
                    {description ? (
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

        {!isGreen && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <MapPin color={Colors.primary} size={18} />
              <Text style={styles.sectionTitle}>
                {t('where_find_alternatives')} {getRegionDisplayName(userCountry)}
              </Text>
            </View>
            <View style={styles.bioStoresCard}>
              <Text style={styles.bioStoresIntro}>{t('bio_stores_intro')}</Text>

              {getRegionSpecialtyStores(userCountry).length > 0 ? (
                <>
                  <Text style={styles.bioStoresSubtitle}>{t('specialty_stores')}</Text>
                  {getRegionSpecialtyStores(userCountry).map((s, i) => (
                    <View key={`spec-${i}`} style={styles.bioStoreItem}>
                      <Store color="#2D6A3E" size={14} strokeWidth={2} />
                      <Text style={styles.bioStoreText}>{s}</Text>
                    </View>
                  ))}
                </>
              ) : null}

              {getRegionGroceryStores(userCountry).length > 0 ? (
                <>
                  <Text style={styles.bioStoresSubtitle}>{t('organic_sections')}</Text>
                  {getRegionGroceryStores(userCountry).map((s, i) => (
                    <View key={`groc-${i}`} style={styles.bioStoreItem}>
                      <Store color="#2D6A3E" size={14} strokeWidth={2} />
                      <Text style={styles.bioStoreText}>{s}</Text>
                    </View>
                  ))}
                </>
              ) : null}

              {getRegionCleanBrands(userCountry, isNonFood).length > 0 ? (
                <>
                  <Text style={styles.bioStoresSubtitle}>
                    {isNonFood ? t('clean_brands') : t('organic_brands')}
                  </Text>
                  {getRegionCleanBrands(userCountry, isNonFood).map((b, i) => (
                    <View key={`brand-${i}`} style={styles.bioStoreItem}>
                      <CheckCircle color="#2D6A3E" size={14} strokeWidth={2} />
                      <Text style={styles.bioStoreText}>{b}</Text>
                    </View>
                  ))}
                </>
              ) : null}

              {getRegionLocalMarkets(userCountry).length > 0 ? (
                <>
                  <Text style={styles.bioStoresSubtitle}>{t('local_markets')}</Text>
                  {getRegionLocalMarkets(userCountry).map((m, i) => (
                    <View key={`mkt-${i}`} style={styles.bioStoreItem}>
                      <MapPin color="#2D6A3E" size={14} strokeWidth={2} />
                      <Text style={styles.bioStoreText}>{m}</Text>
                    </View>
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
        <View ref={shareCardRef} collapsable={false}>
          <ShareImageCard
            productName={product.name} brand={product.brand} riskGroup={product.riskGroup}
            photoUri={product.photoUri} thumbnailBase64={product.thumbnailBase64} imageUrl={product.imageUrl}
            substances={product.substances} detectedIngredients={product.detectedIngredients}
            detectedAdditives={product.detectedAdditives}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
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
  bioStoresCard: { backgroundColor: '#F0FAF3', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.18)' },
  bioStoresIntro: { fontSize: 14, color: '#3A6B4A', lineHeight: 20, marginBottom: 16 },
  bioStoresSubtitle: { fontSize: 14, fontWeight: '600' as const, color: '#1A1A1A', marginTop: 14, marginBottom: 6 },
  bioStoreItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, paddingVertical: 5 },
  bioStoreText: { fontSize: 14, color: '#2D4A35' },
  bioStoresNote: { fontSize: 13, color: '#5A7D65', lineHeight: 19 },
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
  approvedFooterCard: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: '#E8F9ED', borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.18)' },
  approvedFooterText: { flex: 1, fontSize: 14, color: '#2D6A3E', fontWeight: '600' as const, lineHeight: 20 },
  confettiLayer: { position: 'absolute' as const, top: 0, left: 0, right: 0, height: 400, pointerEvents: 'none' as const },
  confettiPiece: { position: 'absolute' as const, top: 0, borderRadius: 2 },
  offscreenContainer: { position: 'absolute' as const, left: -9999, top: -9999, opacity: 0 },
});