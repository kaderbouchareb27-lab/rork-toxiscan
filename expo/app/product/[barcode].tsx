import React, { useMemo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Share2, MessageCircle, Shield, AlertTriangle, CheckCircle, Camera, Lightbulb, RefreshCw, Layers, Leaf, MapPin, Store, Heart, Database, ChevronDown, ChevronUp } from 'lucide-react-native';
import RiskScoreBar from '@/components/RiskScoreBar';
import DrToxiVerdict from '@/components/DrToxiVerdict';
import { calculateRiskScore } from '@/utils/riskScore';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import ShareImageCard from '@/components/ShareImageCard';
import * as Localization from 'expo-localization';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useBadges } from '@/providers/BadgesProvider';
import { getRiskBadgeInfo } from '@/constants/additives';
import { RiskGroup, DetectedIngredient, PhotoType, SubstanceDetected, HealthyAlternative } from '@/types';
import { getCategoryLabel, generateBarcodeAlternatives } from '@/utils/api';


function getSubstanceBadgeColor(niveau: string): string {
  switch (niveau) {
    case 'danger':
    case 'probable':
    case 'possible':
      return '#FF3B30';
    default:
      return '#FF9500';
  }
}

function getSubstanceBadgeLabel(niveau: string): string {
  switch (niveau) {
    case 'danger':
    case 'probable':
    case 'possible':
      return 'CANCERIGENE';
    case 'aucun':
      return 'SANS RISQUE';
    default:
      return 'CONTROVERSE';
  }
}

function getSubstanceBadgeTextColor(_niveau: string): string {
  return '#FFFFFF';
}

function getAdditiveGroupBadgeColor(group: RiskGroup): string {
  switch (group) {
    case 'group1':
    case 'group2a':
    case 'group2b':
      return '#FF3B30';
    case 'none':
    default:
      return '#34C759';
  }
}

function getAdditiveGroupBadgeLabel(group: RiskGroup): string {
  switch (group) {
    case 'group1':
    case 'group2a':
    case 'group2b':
      return 'CANCERIGENE';
    case 'none':
    default:
      return 'SANS RISQUE';
  }
}

function getRiskIcon(group: RiskGroup, size: number) {
  switch (group) {
    case 'group1':
    case 'group2a':
    case 'group2b':
      return <AlertTriangle color={Colors.white} size={size} />;
    case 'none':
    default:
      return <CheckCircle color={Colors.white} size={size} />;
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

function getScoreBadgeInfo(score: number): { color: string; label: string; textColor: string } {
  if (score <= 40) return { color: '#34C759', label: 'APPROUVE', textColor: '#FFFFFF' };
  if (score <= 70) return { color: '#FF9500', label: 'PRUDENCE', textColor: '#FFFFFF' };
  return { color: '#FF3B30', label: 'DANGER', textColor: '#FFFFFF' };
}

function truncateAnalysis(text: string, maxSentences: number): { short: string; full: string; hasMore: boolean } {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  if (sentences.length <= maxSentences) {
    return { short: text, full: text, hasMore: false };
  }
  const shortText = sentences.slice(0, maxSentences).join(' ');
  return { short: shortText, full: text, hasMore: true };
}


export default function ProductScreen() {
  console.log("[ProductScreen] Rendering product detail screen");
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const { history, toggleFavorite } = useScanHistory();
  const { isPro } = useSubscription();
  const { recordShare } = useBadges();
  const shareCardRef = useRef<View>(null);
  const [isShareLoading, setIsShareLoading] = useState<boolean>(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState<boolean>(false);

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
          <Text style={styles.emptyText}>Produit non trouv\u00e9</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleBack} testID="retry-button">
            <Text style={styles.retryButtonText}>Retour</Text>
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
            dialogTitle: 'Partager le r\u00e9sultat Dr.Toxi',
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

  const fallbackTextShare = async () => {
    const badgeLabel = riskScore <= 40 ? '[APPROUVE]' : riskScore <= 70 ? '[PRUDENCE]' : '[DANGER]';
    const substancesText = product.detectedAdditives.length > 0
      ? `\n\nSubstances d\u00e9tect\u00e9es :\n${product.detectedAdditives.map(a => `- ${a.name}`).join('\n')}`
      : product.substances && product.substances.filter(s => s.niveau_risque !== 'aucun').length > 0
      ? `\n\nSubstances d\u00e9tect\u00e9es :\n${product.substances.filter(s => s.niveau_risque !== 'aucun').map(s => `- ${s.nom}`).join('\n')}`
      : '';
    const result = await Share.share({
      message: `${badgeLabel} ${product.name} (${product.brand}) \u2014 ${badge.label}${badge.sublabel ? ` : ${badge.sublabel}` : ''}${substancesText}\n\nScannez vos produits gratuitement avec Dr.Toxi \u2014 disponible sur l'App Store`,
    });
    if (result.action === Share.sharedAction) {
      recordShare();
      console.log('[Product] Text share completed, badge recorded');
    }
  };

  const handleAskDrToxi = () => {
    console.log('[Product] Navigating to Dr. Toxi');
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/dr-toxi');
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

  const showAlternatives = product.riskGroup !== 'none' && healthyAlternatives.length > 0;

  const userCountry = (() => {
    try {
      const locales = Localization.getLocales();
      const region = locales?.[0]?.regionCode?.toUpperCase() ?? '';
      console.log('[Product] Detected region:', region);
      if (['CA'].includes(region)) return 'canada';
      if (['FR'].includes(region)) return 'france';
      const lang = locales?.[0]?.languageCode?.toLowerCase() ?? '';
      if (lang === 'fr') return 'france';
      return 'canada';
    } catch (e) {
      console.log('[Product] Localization error:', e);
      return 'canada';
    }
  })();

  const showBioStores = product.riskGroup === 'group1' || product.riskGroup === 'group2a';
  const isHouseholdOrCosmetic = product.productCategory === 'cosmetic' || product.productCategory === 'household';

  const riskScore = useMemo(() => calculateRiskScore({
    detectedAdditives: product.detectedAdditives,
    detectedIngredients: product.detectedIngredients,
    substances: product.substances,
    ingredientsText: product.ingredientsText,
    riskGroup: product.riskGroup,
  }), [product]);

  const dangerousSubstances = product.substances?.filter(
    (s: SubstanceDetected) => s.niveau_risque !== 'aucun'
  ) ?? [];
  const safeSubstances = product.substances?.filter(
    (s: SubstanceDetected) => s.niveau_risque === 'aucun'
  ) ?? [];

  const analysisData = useMemo(() => {
    if (!product.analysisSummary) return null;
    return truncateAnalysis(product.analysisSummary, 3);
  }, [product.analysisSummary]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} testID="back-button">
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{product?.name ?? 'Resultat'}</Text>
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
        {/* 1. Product photo and name */}
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
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productBrand}>{product.brand}</Text>

          {isUniversalScan && product.productCategory && (
            <View style={styles.categoryTag}>
              <Layers color={Colors.primary} size={12} />
              <Text style={styles.categoryTagText}>{getCategoryLabel(product.productCategory)}</Text>
            </View>
          )}

          {product.materialDetected ? (
            <Text style={styles.materialText}>Mat\u00e9riau : {product.materialDetected}</Text>
          ) : null}

          {isPhotoScan && !isUniversalScan && (
            <View style={styles.photoTag}>
              <Camera color={Colors.textSecondary} size={12} />
              <Text style={styles.photoTagText}>Analys\u00e9 par photo</Text>
            </View>
          )}

          {product.offSource ? (
            <View style={styles.offSourceTag}>
              <Database color="#2D8A4E" size={11} />
              <Text style={styles.offSourceTagText}>Enrichi par Open Food Facts</Text>
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
              Pour un r\u00e9sultat plus pr\u00e9cis, photographiez la liste d'ingr\u00e9dients au dos du produit
            </Text>
          </View>
        )}

        {/* 2. Detection badge (color matches score) */}
        {(() => {
          const scoreBadge = getScoreBadgeInfo(riskScore);
          return (
            <View style={[styles.badgeContainer, { backgroundColor: scoreBadge.color }]}>
              <View style={styles.badgeContent}>
                {getRiskIcon(product.riskGroup, 28)}
                <View style={styles.badgeTextContainer}>
                  <Text style={[styles.badgeLabel, { color: scoreBadge.textColor }]}>{scoreBadge.label}</Text>
                </View>
              </View>
            </View>
          );
        })()}

        {/* 3. Risk score (0-100) */}
        <RiskScoreBar score={riskScore} />

        {/* 4. Dr. Toxi verdict card */}
        <DrToxiVerdict score={riskScore} />

        {/* 5. Short analysis (3-4 sentences) + "En savoir plus" collapsible */}
        {analysisData ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              {showFullAnalysis ? analysisData.full : analysisData.short}
            </Text>
            {analysisData.hasMore && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setShowFullAnalysis(prev => !prev)}
                activeOpacity={0.7}
                testID="expand-analysis"
              >
                {showFullAnalysis ? (
                  <ChevronUp color={Colors.primary} size={16} />
                ) : (
                  <ChevronDown color={Colors.primary} size={16} />
                )}
                <Text style={styles.expandButtonText}>
                  {showFullAnalysis ? 'R\u00e9duire' : 'En savoir plus'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* 6. Substances detected (with individual RED/ORANGE badges per substance) */}
        {isUniversalScan && dangerousSubstances.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Substances d\u00e9tect\u00e9es</Text>
            {dangerousSubstances.map((substance: SubstanceDetected, index: number) => (
              <View key={`substance-${index}`} style={styles.additiveCard}>
                <View style={styles.additiveHeader}>
                  <View style={[styles.additiveTag, { backgroundColor: getSubstanceBadgeColor(substance.niveau_risque) }]}>
                    <Text style={[styles.additiveTagText, { color: getSubstanceBadgeTextColor(substance.niveau_risque) }]}>
                      {getSubstanceBadgeLabel(substance.niveau_risque)}
                    </Text>
                  </View>
                  <Text style={styles.additiveName}>{substance.nom}</Text>
                </View>
                {substance.explication ? (
                  <Text style={styles.additiveDescription}>{substance.explication}</Text>
                ) : null}
                {substance.source_exposition ? (
                  <View style={styles.exposureRow}>
                    <Text style={styles.exposureLabel}>Exposition :</Text>
                    <Text style={styles.exposureValue}>{substance.source_exposition}</Text>
                  </View>
                ) : null}
                <Text style={styles.additiveSource}>Classification : CIRC/OMS</Text>
              </View>
            ))}
          </View>
        ) : isPhotoScan && product.detectedIngredients && product.detectedIngredients.length > 0 ? (
          <>
            {dangerousIngredients.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Substances d\u00e9tect\u00e9es</Text>
                {dangerousIngredients.map((ingredient: DetectedIngredient, index: number) => (
                  <View key={`danger-${index}`} style={styles.additiveCard}>
                    <View style={styles.additiveHeader}>
                      <View style={[styles.additiveTag, { backgroundColor: getSubstanceBadgeColor(ingredient.niveau_risque) }]}>
                        <Text style={[styles.additiveTagText, { color: getSubstanceBadgeTextColor(ingredient.niveau_risque) }]}>
                          {getSubstanceBadgeLabel(ingredient.niveau_risque)}
                        </Text>
                      </View>
                      <Text style={styles.additiveName}>{ingredient.nom}</Text>
                    </View>
                    {ingredient.explication ? (
                      <Text style={styles.additiveDescription}>{ingredient.explication}</Text>
                    ) : null}
                    <Text style={styles.additiveSource}>Classification : CIRC/OMS</Text>
                  </View>
                ))}
              </View>
            )}

            {safeIngredients.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitleSmall}>Ingr\u00e9dients d\u00e9tect\u00e9s</Text>
                <View style={styles.safeIngredientsCard}>
                  <Text style={styles.safeIngredientsText}>
                    {safeIngredients.map((i: DetectedIngredient) => i.nom).join(', ')}
                  </Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <>
            {product.detectedAdditives.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Substances d\u00e9tect\u00e9es</Text>
                {product.detectedAdditives.map((additive, index) => {
                  return (
                    <View key={`${additive.code}-${index}`} style={styles.additiveCard}>
                      <View style={styles.additiveHeader}>
                        <View style={[styles.additiveTag, { backgroundColor: getAdditiveGroupBadgeColor(additive.group) }]}>
                          <Text style={[styles.additiveTagText, { color: '#FFFFFF' }]}>
                            {getAdditiveGroupBadgeLabel(additive.group)}
                          </Text>
                        </View>
                        <Text style={styles.additiveName}>{additive.name}</Text>
                      </View>
                      <Text style={styles.additiveDescription}>{additive.description}</Text>
                      <Text style={styles.additiveSource}>Classification : CIRC/OMS</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {product.detectedAdditives.length === 0 && !isPhotoScan && (
              <View style={styles.section}>
                <View style={styles.noAdditivesCard}>
                  <CheckCircle color={Colors.safe} size={24} />
                  <Text style={styles.noAdditivesText}>
                    Aucun additif class\u00e9 par le CIRC n'a \u00e9t\u00e9 d\u00e9tect\u00e9 dans ce produit.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {isUniversalScan && safeSubstances.length > 0 && safeIngredients.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitleSmall}>Composants d\u00e9tect\u00e9s</Text>
            <View style={styles.safeIngredientsCard}>
              <Text style={styles.safeIngredientsText}>
                {safeSubstances.map((s: SubstanceDetected) => s.nom).join(', ')}
              </Text>
            </View>
          </View>
        )}

        {/* 7. Recommendations */}
        {product.recommendations && product.recommendations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Lightbulb color={Colors.primary} size={18} />
              <Text style={styles.sectionTitle}>Recommandations</Text>
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

        {/* 8. Alternatives (prominent for RED/ORANGE, collapsed for GREEN) */}
        {showAlternatives && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Leaf color="#2D8A4E" size={18} />
              <Text style={styles.sectionTitle}>Alternatives plus saines</Text>
            </View>
            <View style={styles.healthyAlternativesCard}>
              {healthyAlternatives.map((alt, index) => (
                <View key={`healthy-alt-${index}`} style={styles.healthyAltItem}>
                  <View style={styles.healthyAltBadge}>
                    <CheckCircle color="#FFFFFF" size={14} />
                  </View>
                  <View style={styles.healthyAltContent}>
                    <Text style={styles.healthyAltName}>{alt.nom}</Text>
                    <Text style={styles.healthyAltReason}>{alt.raison}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {product.saferAlternatives && product.saferAlternatives.length > 0 && !showAlternatives && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <RefreshCw color={Colors.safe} size={18} />
              <Text style={styles.sectionTitle}>Alternatives plus s\u00fbres</Text>
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
              <Text style={styles.sectionTitle}>O\u00f9 trouver des alternatives saines ?</Text>
            </View>
            <View style={styles.bioStoresCard}>
              <Text style={styles.bioStoresIntro}>
                Privil\u00e9giez les produits biologiques certifi\u00e9s. Les magasins sp\u00e9cialis\u00e9s bio offrent des alternatives sans additifs, sans pesticides et sans substances controvers\u00e9es.
              </Text>

              {userCountry === 'canada' ? (
                <>
                  <Text style={styles.bioStoresSubtitle}>Magasins sp\u00e9cialis\u00e9s</Text>
                  {[
                    'Avril Supermarch\u00e9 Sant\u00e9',
                    'Rachelle B\u00e9ry',
                    'Tau Aliments Naturels',
                  ].map((store, i) => (
                    <View key={`store-ca-${i}`} style={styles.bioStoreItem}>
                      <Store color="#2D8A4E" size={14} />
                      <Text style={styles.bioStoreText}>{store}</Text>
                    </View>
                  ))}

                  <Text style={styles.bioStoresSubtitle}>Sections bio en \u00e9picerie</Text>
                  <Text style={styles.bioStoresNote}>IGA, Metro, Provigo, Maxi</Text>

                  <Text style={styles.bioStoresSubtitle}>March\u00e9s locaux</Text>
                  <Text style={styles.bioStoresNote}>March\u00e9 Jean-Talon, March\u00e9 Atwater</Text>

                  {isHouseholdOrCosmetic ? (
                    <>
                      <Text style={styles.bioStoresSubtitle}>Marques propres recommand\u00e9es</Text>
                      <Text style={styles.bioStoresNote}>ATTITUDE (priorit\u00e9 \u2014 vegan, hypoallerg\u00e9nique, disponible chez Jean Coutu, Pharmaprix, IGA, Metro, Walmart, Amazon.ca)</Text>
                      <Text style={styles.bioStoresNote}>The Unscented Company (Montr\u00e9al, produits m\u00e9nagers)</Text>
                      <Text style={styles.bioStoresNote}>Druide (cosm\u00e9tiques bio qu\u00e9b\u00e9cois)</Text>
                      <Text style={styles.bioStoresNote}>Oneka (soins corporels naturels)</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.bioStoresSubtitle}>Marques bio recommand\u00e9es</Text>
                      <Text style={styles.bioStoresNote}>La Fourmi Bionique, GoGo Quinoa, Fontaine Sant\u00e9, Libert\u00e9 Bio</Text>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.bioStoresSubtitle}>Magasins sp\u00e9cialis\u00e9s</Text>
                  {[
                    'Biocoop',
                    'Naturalia',
                    'La Vie Claire',
                    "Bio c' Bon",
                    'Marcel & Fils',
                  ].map((store, i) => (
                    <View key={`store-fr-${i}`} style={styles.bioStoreItem}>
                      <Store color="#2D8A4E" size={14} />
                      <Text style={styles.bioStoreText}>{store}</Text>
                    </View>
                  ))}

                  <Text style={styles.bioStoresSubtitle}>Sections bio en grande surface</Text>
                  <Text style={styles.bioStoresNote}>Carrefour Bio, Auchan Bio, Leclerc Bio</Text>

                  {isHouseholdOrCosmetic ? (
                    <>
                      <Text style={styles.bioStoresSubtitle}>Marques propres recommand\u00e9es</Text>
                      <Text style={styles.bioStoresNote}>Ecover (produits m\u00e9nagers \u00e9cologiques)</Text>
                      <Text style={styles.bioStoresNote}>L'Arbre Vert (produits m\u00e9nagers certifi\u00e9s \u00c9colabel)</Text>
                      <Text style={styles.bioStoresNote}>Cattier (cosm\u00e9tiques bio certifi\u00e9s)</Text>
                      <Text style={styles.bioStoresNote}>Coslys (cosm\u00e9tiques bio fran\u00e7ais)</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.bioStoresSubtitle}>Marques bio recommand\u00e9es</Text>
                      <Text style={styles.bioStoresNote}>Bjorg, Bonneterre, Prim\u00e9al, Jardin Bio</Text>
                    </>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* 9. "Partager ce resultat" button */}
        <TouchableOpacity
          style={[styles.bigShareButton, isShareLoading && styles.bigShareButtonLoading]}
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
            {isShareLoading ? 'Pr\u00e9paration...' : 'Partager ce r\u00e9sultat'}
          </Text>
        </TouchableOpacity>

        {/* 10. "Demander a Dr. Toxi" button */}
        <TouchableOpacity style={styles.drToxiButton} onPress={handleAskDrToxi} activeOpacity={0.8} testID="ask-dr-toxi">
          <MessageCircle color={Colors.primary} size={20} />
          <Text style={styles.drToxiButtonText}>Demander \u00e0 Dr. Toxi</Text>
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
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
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
  expandButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    justifyContent: 'center' as const,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
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
  sectionTitleSmall: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
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
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
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
  exposureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  exposureLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  exposureValue: {
    fontSize: 12,
    color: Colors.text,
    flex: 1,
  },
  additiveSource: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  safeIngredientsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
  },
  safeIngredientsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  noAdditivesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noAdditivesText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
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
    backgroundColor: '#34C759',
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
    backgroundColor: '#2EBD53',
    shadowColor: '#1B8A3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
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
    borderColor: 'rgba(52, 199, 89, 0.25)',
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
  offscreenContainer: {
    position: 'absolute' as const,
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  bigShareButtonLoading: {
    opacity: 0.8,
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
