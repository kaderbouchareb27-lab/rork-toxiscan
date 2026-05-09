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
import { ChevronLeft, Share2, MessageCircle, Shield, AlertTriangle, CheckCircle, Camera, Lightbulb, RefreshCw, Layers, Leaf, MapPin, Store, Heart, Database, AlertOctagon } from 'lucide-react-native';
import DrToxiVerdict from '@/components/DrToxiVerdict';
import type { VerdictLevel } from '@/components/DrToxiVerdict';
import { classifySubstanceLevel, classifyAdditiveLevel, isIARCClassified, isDangerLevel } from '@/utils/riskScore';
import type { SubstanceLevel } from '@/utils/riskScore';
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
import { getRiskBadgeInfo } from '@/constants/additives';
import { RiskGroup, DetectedIngredient, PhotoType, SubstanceDetected, HealthyAlternative } from '@/types';
import { getCategoryLabel, generateBarcodeAlternatives } from '@/utils/api';
import { detectRegion, getRegionSpecialtyStores, getRegionGroceryStores, getRegionCleanBrands, getRegionLocalMarkets } from '@/utils/regionDetection';
import { t, isEnglish } from '@/utils/i18n';

function getLevelBadgeColor(level: SubstanceLevel): string {
  switch (level) {
    case 'group1': return '#FF3B30';
    case 'group2a': return '#E8640A';
    case 'group2b': return '#F5C000';
    case 'controversial': return '#E8640A';
    case 'safe': return '#2E9E34';
  }
}

function getLevelBadgeLabel(level: SubstanceLevel): string {
  switch (level) {
    case 'group1': return t('level_confirmed_carcinogen');
    case 'group2a': return t('level_probable_carcinogen');
    case 'group2b': return t('level_possible_carcinogen');
    case 'controversial': return t('level_controversial');
    case 'safe': return t('level_low_risk');
  }
}

function getNutriScoreColor(grade: string): string {
  switch (grade.toUpperCase()) {
    case 'A': return '#038141';
    case 'B': return '#85BB2F';
    case 'C': return '#FECB02';
    case 'D': return '#EE8100';
    case 'E': return '#E63E11';
    default: return '#8E8E93';
  }
}

function getNovaColor(group: number): string {
  switch (group) {
    case 1: return '#038141';
    case 2: return '#85BB2F';
    case 3: return '#EE8100';
    case 4: return '#E63E11';
    default: return '#8E8E93';
  }
}

function getBannerConfig(level: VerdictLevel): { color: string; label: string; intro: string; icon: React.ReactNode } {
  switch (level) {
    case 'danger':
      return { color: '#FF3B30', label: t('badge_danger'), intro: t('intro_danger'), icon: <AlertOctagon color="#FFFFFF" size={28} /> };
    case 'warning':
      return { color: '#E8640A', label: t('badge_caution'), intro: t('intro_warning'), icon: <AlertTriangle color="#FFFFFF" size={28} /> };
    case 'moderation':
      return { color: '#F5C000', label: t('badge_moderation'), intro: t('intro_moderation'), icon: <AlertTriangle color="#FFFFFF" size={28} /> };
    case 'approuve':
      return { color: '#2E9E34', label: t('badge_approved'), intro: t('intro_approved'), icon: <CheckCircle color="#FFFFFF" size={28} /> };
  }
}

const SWEETENER_KEYWORDS = ['acesulfame', 'aspartame', 'sucralose', 'saccharine', 'cyclamate', 'sucre', 'sugar', 'fructose', 'cane sugar', 'sucre de canne'];

function isSweetenerOrSugar(name: string): boolean {
  const n = (name ?? '').toLowerCase();
  return SWEETENER_KEYWORDS.some(k => n.includes(k));
}

const CONFETTI_COLORS = ['#2E9E34', '#34C759', '#7ED957', '#A8E6A1', '#C4EDC9'];
const CONFETTI_COUNT = 24;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

function ConfettiBurst() {
  const pieces = useRef(
    Array.from({ length: CONFETTI_COUNT }).map(() => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;
  const meta = useMemo(
    () =>
      pieces.map((_, i) => ({
        startX: (Math.random() - 0.5) * SCREEN_WIDTH * 0.9,
        endY: 180 + Math.random() * 220,
        endX: (Math.random() - 0.5) * SCREEN_WIDTH * 1.1,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotateTo: (Math.random() - 0.5) * 720,
        delay: Math.random() * 150,
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
        console.log('[ProductScreen] Scan count:', newCount);

        if (newCount === 3 || newCount === 10 || newCount === 25) {
          hasRequestedReview.current = true;
          const isAvailable = await StoreReview.isAvailableAsync();
          if (isAvailable) {
            console.log('[ProductScreen] Requesting store review...');
            setTimeout(() => {
              void StoreReview.requestReview();
            }, 1500);
          } else {
            console.log('[ProductScreen] Store review not available');
          }
        }
      } catch (e) {
        console.log('[ProductScreen] Review request error:', e);
      }
    };
    void maybeRequestReview();
  }, []);

  const product = useMemo(() => {
    console.log('[Product] Looking for product with barcode:', barcode);
    return history.find(p => p.barcode === barcode);
  }, [history, barcode]);

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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

  const badge = getRiskBadgeInfo(product.riskGroup);
  const isPhotoScan = product.scanMethod === 'photo';
  const photoType: PhotoType = product.photoType ?? 'unknown';
  const isUniversalScan = product.barcode.startsWith('universal_');
  const showFrontPhotoTip = isPhotoScan && photoType === 'front' && !isUniversalScan;

  const { verdictLevel, hasCarcinogen, hasControversial } = useMemo(() => {
    let _hasGroup1 = false;
    let _hasGroup2A = false;
    let _orangeCount = 0;
    let _yellowCount = 0;
    let _hasSweetener = false;

    const tally = (level: SubstanceLevel, name: string) => {
      if (level === 'group1') _hasGroup1 = true;
      else if (level === 'group2a') _hasGroup2A = true;
      else if (level === 'controversial') _orangeCount += 1;
      else if (level === 'group2b') {
        _yellowCount += 1;
        if (isSweetenerOrSugar(name)) _hasSweetener = true;
      }
    };

    for (const additive of product.detectedAdditives) {
      tally(classifyAdditiveLevel(additive), additive.name);
    }

    if (product.substances) {
      for (const s of product.substances) {
        tally(classifySubstanceLevel(s), s.nom);
        if (isSweetenerOrSugar(s.nom) && s.niveau_risque !== 'aucun') _hasSweetener = true;
      }
    }

    if (product.detectedIngredients) {
      for (const i of product.detectedIngredients) {
        tally(classifySubstanceLevel({
          classification_circ: i.classification_circ,
          niveau_risque: i.niveau_risque,
          explication: i.explication,
          nom: i.nom,
        }), i.nom);
        if (isSweetenerOrSugar(i.nom) && i.niveau_risque !== 'aucun') _hasSweetener = true;
      }
    }

    const concerningTotal = _orangeCount + _yellowCount + (_hasGroup2A ? 1 : 0);

    let _verdictLevel: VerdictLevel = 'approuve';
    if (_hasGroup1 || _hasGroup2A) {
      _verdictLevel = 'danger';
    } else if (concerningTotal >= 4) {
      _verdictLevel = 'warning';
    } else if (_orangeCount >= 1 || _yellowCount >= 2) {
      _verdictLevel = 'moderation';
    } else if (_yellowCount >= 1) {
   _verdictLevel = 'moderation';
    }

    console.log('[Product] Verdict:', _verdictLevel, 'G1:', _hasGroup1, 'G2A:', _hasGroup2A, 'orange:', _orangeCount, 'yellow:', _yellowCount, 'sweetener:', _hasSweetener);
    return {
      verdictLevel: _verdictLevel,
      hasCarcinogen: _hasGroup1 || _hasGroup2A,
      hasControversial: _orangeCount > 0 || _yellowCount > 0,
    };
  }, [product]);

  const isGreen = verdictLevel === 'approuve';
  const bannerConfig = getBannerConfig(verdictLevel);

  const handleFavorite = () => {
    console.log('[Product] Favorite tapped for:', product.barcode);
    if (!isPro) {
      console.log('[Product] Not pro, showing paywall');
      router.push('/paywall?source=favorite');
      return;
    }
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
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
    if (result.action === Share.sharedAction) {
      recordShare();
      console.log('[Product] Text share completed, badge recorded');
    }
  };

  const handleShare = async () => {
    console.log('[Product] Sharing product:', product.name);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsShareLoading(true);
    try {
      if (Platform.OS !== 'web' && shareCardRef.current) {
        console.log('[Product] Capturing share image...');
        const uri = await captureRef(shareCardRef, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });
        console.log('[Product] Share image captured:', uri);

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: t('share_dialog_title'),
            UTI: 'public.png',
          });
          recordShare();
          console.log('[Product] Image share completed, badge recorded');
        } else {
          console.log('[Product] Sharing not available, falling back to text');
          await fallbackTextShare();
        }
      } else {
        await fallbackTextShare();
      }
    } catch (error) {
      console.log('[Product] Share error:', error);
      try {
        await fallbackTextShare();
      } catch (fallbackError) {
        console.log('[Product] Fallback share error:', fallbackError);
      }
    } finally {
      setIsShareLoading(false);
    }
  };

  const handleAskDrToxi = () => {
    console.log('[Product] Navigating to Dr. Toxi with product context');
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: '/dr-toxi',
      params: {
        productName: product.name,
        productBrand: product.brand,
        productBarcode: product.barcode,
        productVerdict: verdictLevel,
        productSummary: shortAnalysis ?? '',
      },
    });
  };

  const dangerousIngredients = product.detectedIngredients?.filter(
    (i: DetectedIngredient) => i.niveau_risque !== 'aucun'
  ) ?? [];
  const safeIngredients = product.detectedIngredients?.filter(
    (i: DetectedIngredient) => i.niveau_risque === 'aucun'
  ) ?? [];

  const healthyAlternatives: HealthyAlternative[] = (() => {
    if (product.healthyAlternatives && product.healthyAlternatives.length > 0) {
      return product.healthyAlternatives;
    }
    if (product.riskGroup !== 'none' && product.scanMethod === 'barcode' && product.detectedAdditives.length > 0) {
      return generateBarcodeAlternatives(product.detectedAdditives);
    }
    return [];
  })();

  const showAlternatives = !isGreen && healthyAlternatives.length > 0;

  const regionInfo = useMemo(() => detectRegion(), []);
  const userCountry = regionInfo.region;

  const showBioStores = !isGreen && (hasCarcinogen || hasControversial || healthyAlternatives.length > 0);
  const isHouseholdOrCosmetic = product.productCategory === 'cosmetic' || product.productCategory === 'household';

  const dangerousSubstances = product.substances?.filter(
    (s: SubstanceDetected) => s.niveau_risque !== 'aucun'
  ) ?? [];

  const shortAnalysis = useMemo(() => {
    if (!product.analysisSummary) return null;
    return shortenText(product.analysisSummary, 3);
  }, [product.analysisSummary]);

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
        <View style={styles.productHeader}>
          {isPhotoScan ? (
            product.thumbnailBase64 || product.photoUri ? (
              <Image source={{ uri: product.thumbnailBase64 ?? product.photoUri ?? '' }} style={styles.productImage} contentFit="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Camera color={Colors.textTertiary} size={40} />
              </View>
            )
          ) : (
            product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.productImage} contentFit="contain" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Shield color={Colors.textTertiary} size={40} />
              </View>
            )
          )}
          <Text style={styles.productName}>{truncateName(product.name, 60)}</Text>
          {product.brand && product.brand !== getCategoryLabel(product.productCategory ?? 'other') ? (
            <Text style={styles.productBrand}>{product.brand}</Text>
          ) : null}

          {isUniversalScan && product.productCategory && (
            <View style={styles.categoryTag}>
              <Layers color={Colors.primary} size={12} />
              <Text style={styles.categoryTagText}>{getCategoryLabel(product.productCategory)}</Text>
            </View>
          )}

          {isGreen && <ConfettiBurst />}

          {product.materialDetected ? (
            <Text style={styles.materialText}>{t('material_label')} : {product.materialDetected}</Text>
          ) : null}

          {isPhotoScan && !isUniversalScan && (
            <View style={styles.photoTag}>
              <Camera color={Colors.textSecondary} size={12} />
              <Text style={styles.photoTagText}>{t('analyzed_by_photo')}</Text>
            </View>
          )}

          {product.offSource ? (
            <View style={styles.offSourceTag}>
              <Database color="#2D8A4E" size={11} />
              <Text style={styles.offSourceTagText}>{t('enriched_off')}</Text>
            </View>
          ) : null}

          {(product.nutriScore || product.novaGroup) ? (
            <View style={styles.offScoresRow}>
              {product.nutriScore ? (
                <View style={[styles.scoreTag, { backgroundColor: getNutriScoreColor(product.nutriScore) }]}>
                  <Text style={styles.scoreTagLabel}>Nutri-Score</Text>
                  <Text style={styles.scoreTagValue}>{product.nutriScore}</Text>
                </View>
              ) : null}
              {product.novaGroup ? (
                <View style={[styles.scoreTag, { backgroundColor: getNovaColor(product.novaGroup) }]}>
                  <Text style={styles.scoreTagLabel}>NOVA</Text>
                  <Text style={styles.scoreTagValue}>{product.novaGroup}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {showFrontPhotoTip && (
          <View style={styles.frontPhotoTip}>
            <Camera color="#FF9500" size={16} />
            <Text style={styles.frontPhotoTipText}>
              {t('photo_tip')}
            </Text>
          </View>
        )}

        <View style={[styles.badgeContainer, { backgroundColor: bannerConfig.color }]}>
          <View style={styles.badgeContent}>
            {bannerConfig.icon}
            <View style={styles.badgeTextContainer}>
              <Text style={styles.badgeLabel}>{bannerConfig.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.introCard}>
          <Text style={[styles.introText, { color: bannerConfig.color }]}>{bannerConfig.intro}</Text>
        </View>

        <DrToxiVerdict level={verdictLevel} />

        {(product.detectedIngredients && product.detectedIngredients.length > 0) || (product.substances && product.substances.length > 0) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('all_ingredients')}</Text>
            <View style={styles.allIngredientsCard}>
              {(product.detectedIngredients ?? product.substances ?? []).map((ing, index) => {
                const level = classifySubstanceLevel({
                  classification_circ: ing.classification_circ,
                  niveau_risque: ing.niveau_risque,
                  explication: ing.explication,
                  nom: ing.nom,
                });
                return (
                  <View key={`all-ing-${index}`} style={styles.allIngRow}>
                    <View style={[styles.allIngDot, { backgroundColor: getLevelBadgeColor(level) }]} />
                    <Text style={styles.allIngName} numberOfLines={2}>{ing.nom}</Text>
                    <View style={[styles.allIngBadge, { backgroundColor: getLevelBadgeColor(level) }]}>
                      <Text style={styles.allIngBadgeText}>{getLevelBadgeLabel(level)}</Text>
                    </View>
                  </View>
                  {level !== 'safe' && ing.explication ? (
                    <View style={[styles.allIngExplanation, { backgroundColor: getLevelBadgeColor(level) + '18' }]}>
                      <Text style={[styles.allIngExplanationText, { color: getLevelBadgeColor(level) }]}>{ing.explication}</Text>
                    </View>
                  ) : null}
                );
              })}
            </View>
          </View>
        ) : null}

        {isGreen && (
          <View style={styles.approvedFooterCard}>
            <CheckCircle color="#2E9E34" size={18} />
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

        {showBioStores && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <MapPin color="#2D8A4E" size={18} />
              <Text style={styles.sectionTitle}>{t('where_find_alternatives')}</Text>
            </View>
            <View style={styles.bioStoresCard}>
              <Text style={styles.bioStoresIntro}>
                {t('bio_stores_intro')}
              </Text>

              {showAlternatives && (
                <>
                  <Text style={styles.bioStoresSubtitle}>
                    {t('recommended_bio_alternatives')}
                  </Text>
                  <View style={styles.healthyAlternativesCardInner}>
                    {healthyAlternatives.map((alt, index) => (
                      <View key={`healthy-alt-${index}`} style={styles.healthyAltItem}>
                        <View style={styles.healthyAltBadge}>
                          <CheckCircle color="#FFFFFF" size={14} />
                        </View>
                        <View style={styles.healthyAltContent}>
                          <Text style={styles.healthyAltName}>{alt.nom}</Text>
                          {alt.raison ? (
                            <Text style={styles.healthyAltReason}>{alt.raison}</Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              <>
                <Text style={styles.bioStoresSubtitle}>
                  {t('specialty_stores')}
                </Text>
                {getRegionSpecialtyStores(userCountry).map((store, i) => (
                  <View key={`store-spec-${i}`} style={styles.bioStoreItem}>
                    <Store color="#2D8A4E" size={14} />
                    <Text style={styles.bioStoreText}>{store}</Text>
                  </View>
                ))}

                <Text style={styles.bioStoresSubtitle}>
                  {t('organic_sections')}
                </Text>
                <Text style={styles.bioStoresNote}>{getRegionGroceryStores(userCountry).join(', ')}</Text>

                {getRegionLocalMarkets(userCountry).length > 0 && (
                  <>
                    <Text style={styles.bioStoresSubtitle}>
                      {t('local_markets')}
                    </Text>
                    <Text style={styles.bioStoresNote}>{getRegionLocalMarkets(userCountry).join(', ')}</Text>
                  </>
                )}

                <Text style={styles.bioStoresSubtitle}>
                  {isHouseholdOrCosmetic ? t('clean_brands') : t('organic_brands')}
                </Text>
                <Text style={styles.bioStoresNote}>{getRegionCleanBrands(userCountry, isHouseholdOrCosmetic).join(', ')}</Text>
              </>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.bigShareButton, isGreen && styles.bigShareButtonGreen, isShareLoading && styles.bigShareButtonLoading]}
          onPress={handleShare}
          activeOpacity={0.85}
          testID="big-share-button"
          disabled={isShareLoading}
        >
          {isShareLoading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Share2 color={Colors.white} size={22} />
          )}
          <Text style={styles.bigShareButtonText}>
            {isShareLoading ? t('preparing') : t('share_result')}
          </Text>
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
            productName={product.name}
            brand={product.brand}
            riskGroup={product.riskGroup}
            photoUri={product.photoUri}
            thumbnailBase64={product.thumbnailBase64}
            imageUrl={product.imageUrl}
            substances={product.substances}
            detectedIngredients={product.detectedIngredients}
            detectedAdditives={product.detectedAdditives}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
    flex: 1,
    textAlign: 'center' as const,
    marginHorizontal: 8,
  },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  favoriteButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  shareButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  productHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  productName: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 18,
    letterSpacing: -0.4,
  },
  productBrand: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#E8F9ED',
    borderRadius: 10,
  },
  categoryTagText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  materialText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic' as const,
  },
  photoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
  },
  photoTagText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  frontPhotoTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF8ED',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#FFE4B5',
  },
  frontPhotoTipText: {
    flex: 1,
    fontSize: 13,
    color: '#8B6914',
    lineHeight: 18,
  },
  badgeContainer: {
    borderRadius: 20,
    padding: 22,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badgeTextContainer: {
    flex: 1,
  },
  badgeLabel: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  additiveCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  additiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  additiveTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  additiveTagText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  additiveName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  additiveDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  additiveSource: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  recommendationsCard: {
    backgroundColor: '#FFFBF0',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFE8B2',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  recommendationBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9500',
    marginTop: 6,
  },
  recommendationText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    flex: 1,
  },
  alternativesCard: {
    backgroundColor: '#E8F9ED',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#C4EDC9',
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  alternativeText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    flex: 1,
  },
  healthyAlternativesCard: {
    backgroundColor: '#F0FAF3',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#C4EDC9',
    overflow: 'hidden' as const,
  },
  healthyAlternativesCardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C4EDC9',
    overflow: 'hidden' as const,
    marginBottom: 6,
  },
  healthyAltItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C4EDC9',
  },
  healthyAltBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2E9E34',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: 2,
  },
  healthyAltContent: {
    flex: 1,
  },
  healthyAltName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1A1A1A',
    marginBottom: 3,
  },
  healthyAltReason: {
    fontSize: 13,
    color: '#4A7C59',
    lineHeight: 18,
  },
  bioStoresCard: {
    backgroundColor: '#F0FAF3',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#C4EDC9',
  },
  bioStoresIntro: {
    fontSize: 14,
    color: '#3A6B4A',
    lineHeight: 20,
    marginBottom: 16,
  },
  bioStoresSubtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1A1A1A',
    marginTop: 14,
    marginBottom: 6,
  },
  bioStoreItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 5,
  },
  bioStoreText: {
    fontSize: 14,
    color: '#2D4A35',
  },
  bioStoresNote: {
    fontSize: 13,
    color: '#5A7D65',
    lineHeight: 19,
  },
  bigShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
    paddingVertical: 20,
    borderRadius: 20,
    backgroundColor: '#2E9E34',
    shadowColor: '#237A28',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  bigShareButtonGreen: {
    backgroundColor: '#2E9E34',
    shadowColor: '#1B7A20',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  bigShareButtonLoading: {
    opacity: 0.8,
  },
  bigShareButtonText: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  drToxiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(46, 158, 52, 0.25)',
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  drToxiButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 17,
    color: Colors.textSecondary,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  bottomSpacer: {
    height: 32,
  },
  introCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    alignItems: 'center' as const,
  },
  introText: {
    fontSize: 15,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    letterSpacing: -0.1,
  },
  allIngredientsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  allIngRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 6,
  },
  allIngDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  allIngName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  allIngBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  allIngBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  approvedFooterCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    backgroundColor: '#E8F9ED',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#C4EDC9',
  },
  approvedFooterText: {
    flex: 1,
    fontSize: 14,
    color: '#2D6A3E',
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  confettiLayer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    pointerEvents: 'none' as const,
  },
  confettiPiece: {
    position: 'absolute' as const,
    top: 0,
    borderRadius: 2,
  },
  offscreenContainer: {
    position: 'absolute' as const,
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  offSourceTag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#E8F9ED',
    borderRadius: 10,
  },
  offSourceTagText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#2D8A4E',
  },
  offScoresRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginTop: 8,
  },
  scoreTag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  scoreTagLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  scoreTagValue: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
});
