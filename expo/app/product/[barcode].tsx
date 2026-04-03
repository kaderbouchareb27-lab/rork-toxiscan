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
import { ChevronLeft, Share2, MessageCircle, Shield, AlertTriangle, AlertCircle, CheckCircle, Camera, Lightbulb, RefreshCw, Layers, Leaf, MapPin, Store, Heart, Database, Activity } from 'lucide-react-native';
import { Animated as RNAnimated } from 'react-native';
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
import { RiskGroup, DetectedIngredient, PhotoType, SubstanceDetected, HealthyAlternative, AdditiveInfo } from '@/types';
import { getCategoryLabel, generateBarcodeAlternatives } from '@/utils/api';

interface RiskLevel {
  color: string;
  label: string;
}

function getRiskLevel(score: number): RiskLevel {
  if (score <= 20) return { color: '#4CD964', label: 'Risque faible — Bon choix' };
  if (score <= 40) return { color: '#34C759', label: 'Risque limité — Acceptable' };
  if (score <= 60) return { color: '#FF9500', label: 'Risque modéré — À limiter' };
  if (score <= 80) return { color: '#FF6B35', label: 'Risque élevé — À éviter si possible' };
  return { color: '#FF3B30', label: 'Risque très élevé — Déconseillé' };
}

function calculateRiskScore(product: {
  detectedAdditives: AdditiveInfo[];
  detectedIngredients?: DetectedIngredient[];
  substances?: SubstanceDetected[];
  ingredientsText: string;
  riskGroup?: string;
}): number {
  let score = 0;
  let hasAnyRisk = false;

  for (const additive of product.detectedAdditives) {
    hasAnyRisk = true;
    if (additive.group === 'group1') score += 30;
    else if (additive.group === 'group2a') score += 20;
    else if (additive.group === 'group2b') score += 10;
    else score += 5;
  }

  if (product.substances) {
    for (const s of product.substances) {
      if (s.niveau_risque === 'danger') { score += 30; hasAnyRisk = true; }
      else if (s.niveau_risque === 'probable') { score += 20; hasAnyRisk = true; }
      else if (s.niveau_risque === 'possible') { score += 10; hasAnyRisk = true; }
    }
  }

  if (product.detectedIngredients) {
    for (const i of product.detectedIngredients) {
      if (i.niveau_risque === 'danger') { score += 30; hasAnyRisk = true; }
      else if (i.niveau_risque === 'probable') { score += 20; hasAnyRisk = true; }
      else if (i.niveau_risque === 'possible') { score += 10; hasAnyRisk = true; }
    }
  }

  const ingLower = (product.ingredientsText ?? '').toLowerCase();
  const controversialPatterns = [
    'tartrazine', 'jaune de quinoléine', 'amarante', 'rouge allura', 'bleu brillant',
    'aspartame', 'acésulfame', 'sucralose', 'saccharine',
    'nitrite de sodium', 'nitrate de potassium', 'bha', 'bht',
    'e102', 'e104', 'e110', 'e122', 'e123', 'e124', 'e129', 'e131', 'e132', 'e133',
    'e950', 'e951', 'e952', 'e954', 'e955',
    'e249', 'e250', 'e251', 'e252', 'e320', 'e321',
  ];
  for (const pattern of controversialPatterns) {
    if (ingLower.includes(pattern)) { score += 5; hasAnyRisk = true; }
  }

  const firstIngredient = ingLower.split(',')[0] ?? '';
  const sugarTerms = ['sucre', 'sugar', 'glucose', 'fructose', 'sirop de glucose', 'glucose-fructose'];
  if (sugarTerms.some(t => firstIngredient.includes(t))) { score += 10; hasAnyRisk = true; }

  if (ingLower.includes('huile de palme') || ingLower.includes('palm oil')) { score += 5; hasAnyRisk = true; }

  if (!hasAnyRisk && product.riskGroup === 'none') {
    return 0;
  }

  if (!hasAnyRisk) {
    return 5;
  }

  return Math.min(score, 100);
}

function RiskScoreBar({ score }: { score: number }) {
  const animRef = useRef(new RNAnimated.Value(0));
  const level = getRiskLevel(score);

  React.useEffect(() => {
    RNAnimated.timing(animRef.current, {
      toValue: score,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const widthInterpolation = animRef.current.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={riskScoreStyles.container} testID="risk-score-block">
      <View style={riskScoreStyles.titleRow}>
        <Activity color={level.color} size={18} />
        <Text style={riskScoreStyles.title}>Score de risque Dr.Toxi</Text>
      </View>
      <View style={riskScoreStyles.scoreRow}>
        <View style={riskScoreStyles.barContainer}>
          <View style={riskScoreStyles.barTrack}>
            <RNAnimated.View
              style={[
                riskScoreStyles.barFill,
                { width: widthInterpolation, backgroundColor: level.color },
              ]}
            />
          </View>
        </View>
        <Text style={[riskScoreStyles.scoreValue, { color: level.color }]}>{score}</Text>
      </View>
      <Text style={riskScoreStyles.levelLabel}>{level.label}</Text>
    </View>
  );
}

function getRiskIcon(group: RiskGroup, size: number) {
  switch (group) {
    case 'group1':
      return <AlertTriangle color={Colors.white} size={size} />;
    case 'group2a':
      return <AlertCircle color={Colors.white} size={size} />;
    case 'group2b':
      return <AlertCircle color={Colors.black} size={size} />;
    case 'none':
    default:
      return <CheckCircle color={Colors.white} size={size} />;
  }
}

function getNiveauColor(niveau: string): string {
  switch (niveau) {
    case 'danger': return '#FF3B30';
    case 'probable': return '#FF9500';
    case 'possible': return '#FFCC00';
    case 'controverse': return '#FFCC00';
    default: return '#34C759';
  }
}

function getNiveauTextColor(niveau: string): string {
  return (niveau === 'possible' || niveau === 'controverse') ? Colors.black : Colors.white;
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

function getNiveauLabel(niveau: string): string {
  switch (niveau) {
    case 'danger': return 'DANGER';
    case 'probable': return 'DÉTECTÉ';
    case 'possible': return 'DÉTECTÉ';
    case 'controverse': return 'DÉTECTÉ';
    case 'aucun': return 'OK';
    default: return 'OK';
  }
}

export default function ProductScreen() {
  console.log("[ProductScreen] Rendering product detail screen");
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const { history, toggleFavorite } = useScanHistory();
  const { isPro } = useSubscription();
  const { recordShare } = useBadges();
  const shareCardRef = useRef<View>(null);
  const [isShareLoading, setIsShareLoading] = useState<boolean>(false);

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
          <Text style={styles.emptyText}>Produit non trouvé</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleBack} testID="retry-button">
            <Text style={styles.retryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const badge = getRiskBadgeInfo(product.riskGroup);
  const badgeTextColor = product.riskGroup === 'group2b' ? Colors.black : Colors.white;
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
            dialogTitle: 'Partager le résultat Dr.Toxi',
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
    const badgeEmoji = product.riskGroup === 'group1' ? '🔴' : product.riskGroup === 'group2a' ? '🟠' : product.riskGroup === 'group2b' ? '🟡' : '🟢';
    const substancesText = product.detectedAdditives.length > 0
      ? `\n\nSubstances détectées :\n${product.detectedAdditives.map(a => `- ${a.name}`).join('\n')}`
      : product.substances && product.substances.filter(s => s.niveau_risque !== 'aucun').length > 0
      ? `\n\nSubstances détectées :\n${product.substances.filter(s => s.niveau_risque !== 'aucun').map(s => `- ${s.nom}`).join('\n')}`
      : '';
    const result = await Share.share({
      message: `${badgeEmoji} ${product.name} (${product.brand}) — ${badge.label}${badge.sublabel ? ` : ${badge.sublabel}` : ''}${substancesText}\n\nScannez vos produits gratuitement avec Dr.Toxi — disponible sur l'App Store`,
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} testID="back-button">
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Résultat</Text>
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
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productBrand}>{product.brand}</Text>

          {isUniversalScan && product.productCategory && (
            <View style={styles.categoryTag}>
              <Layers color={Colors.primary} size={12} />
              <Text style={styles.categoryTagText}>{getCategoryLabel(product.productCategory)}</Text>
            </View>
          )}

          {product.materialDetected ? (
            <Text style={styles.materialText}>Matériau : {product.materialDetected}</Text>
          ) : null}

          {isPhotoScan && !isUniversalScan && (
            <View style={styles.photoTag}>
              <Camera color={Colors.textSecondary} size={12} />
              <Text style={styles.photoTagText}>Analysé par photo</Text>
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
              Pour un résultat plus précis, photographiez la liste d'ingrédients au dos du produit
            </Text>
          </View>
        )}

        <View style={[styles.badgeContainer, { backgroundColor: badge.color }]}>
          <View style={styles.badgeContent}>
            {getRiskIcon(product.riskGroup, 28)}
            <View style={styles.badgeTextContainer}>
              <Text style={[styles.badgeLabel, { color: badgeTextColor }]}>{badge.label}</Text>
              {badge.sublabel ? (
                <Text style={[styles.badgeSublabel, { color: badgeTextColor, opacity: 0.85 }]}>{badge.sublabel}</Text>
              ) : null}
            </View>
          </View>
        </View>

        <RiskScoreBar score={riskScore} />

        {product.analysisSummary ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>{product.analysisSummary}</Text>
          </View>
        ) : null}


        {isUniversalScan && dangerousSubstances.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Substances détectées</Text>
            {dangerousSubstances.map((substance: SubstanceDetected, index: number) => (
              <View key={`substance-${index}`} style={styles.additiveCard}>
                <View style={styles.additiveHeader}>
                  <View style={[styles.additiveTag, { backgroundColor: getNiveauColor(substance.niveau_risque) }]}>
                    <Text style={[styles.additiveTagText, { color: getNiveauTextColor(substance.niveau_risque) }]}>
                      {getNiveauLabel(substance.niveau_risque)}
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
                <Text style={styles.sectionTitle}>Substances détectées</Text>
                {dangerousIngredients.map((ingredient: DetectedIngredient, index: number) => (
                  <View key={`danger-${index}`} style={styles.additiveCard}>
                    <View style={styles.additiveHeader}>
                      <View style={[styles.additiveTag, { backgroundColor: getNiveauColor(ingredient.niveau_risque) }]}>
                        <Text style={[styles.additiveTagText, { color: getNiveauTextColor(ingredient.niveau_risque) }]}>
                          {getNiveauLabel(ingredient.niveau_risque)}
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
                <Text style={styles.sectionTitleSmall}>Ingrédients détectés</Text>
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
                <Text style={styles.sectionTitle}>Substances détectées</Text>
                {product.detectedAdditives.map((additive, index) => {
                  const addBadge = getRiskBadgeInfo(additive.group);
                  return (
                    <View key={`${additive.code}-${index}`} style={styles.additiveCard}>
                      <View style={styles.additiveHeader}>
                        <View style={[styles.additiveTag, { backgroundColor: addBadge.color }]}>
                          <Text style={[styles.additiveTagText, { color: additive.group === 'group2b' ? Colors.black : Colors.white }]}>
                            {additive.code.replace('en:', '').toUpperCase()}
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
                    Aucun additif classé par le CIRC n'a été détecté dans ce produit.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {isUniversalScan && safeSubstances.length > 0 && safeIngredients.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitleSmall}>Composants détectés</Text>
            <View style={styles.safeIngredientsCard}>
              <Text style={styles.safeIngredientsText}>
                {safeSubstances.map((s: SubstanceDetected) => s.nom).join(', ')}
              </Text>
            </View>
          </View>
        )}

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
              <Text style={styles.sectionTitle}>Alternatives plus sûres</Text>
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
              <Text style={styles.sectionTitle}>Où trouver des alternatives saines ?</Text>
            </View>
            <View style={styles.bioStoresCard}>
              <Text style={styles.bioStoresIntro}>
                Privilégiez les produits biologiques certifiés. Les magasins spécialisés bio offrent des alternatives sans additifs, sans pesticides et sans substances controversées.
              </Text>

              {userCountry === 'canada' ? (
                <>
                  <Text style={styles.bioStoresSubtitle}>Magasins spécialisés</Text>
                  {[
                    'Avril Supermarché Santé',
                    'Rachelle Béry',
                    'Tau Aliments Naturels',
                  ].map((store, i) => (
                    <View key={`store-ca-${i}`} style={styles.bioStoreItem}>
                      <Store color="#2D8A4E" size={14} />
                      <Text style={styles.bioStoreText}>{store}</Text>
                    </View>
                  ))}

                  <Text style={styles.bioStoresSubtitle}>Sections bio en épicerie</Text>
                  <Text style={styles.bioStoresNote}>IGA, Metro, Provigo, Maxi</Text>

                  <Text style={styles.bioStoresSubtitle}>Marchés locaux</Text>
                  <Text style={styles.bioStoresNote}>Marché Jean-Talon, Marché Atwater</Text>

                  {isHouseholdOrCosmetic ? (
                    <>
                      <Text style={styles.bioStoresSubtitle}>Marques propres recommandées</Text>
                      <Text style={styles.bioStoresNote}>ATTITUDE (priorité — vegan, hypoallergénique, disponible chez Jean Coutu, Pharmaprix, IGA, Metro, Walmart, Amazon.ca)</Text>
                      <Text style={styles.bioStoresNote}>The Unscented Company (Montréal, produits ménagers)</Text>
                      <Text style={styles.bioStoresNote}>Druide (cosmétiques bio québécois)</Text>
                      <Text style={styles.bioStoresNote}>Oneka (soins corporels naturels)</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.bioStoresSubtitle}>Marques bio recommandées</Text>
                      <Text style={styles.bioStoresNote}>La Fourmi Bionique, GoGo Quinoa, Fontaine Santé, Liberté Bio</Text>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.bioStoresSubtitle}>Magasins spécialisés</Text>
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
                      <Text style={styles.bioStoresSubtitle}>Marques propres recommandées</Text>
                      <Text style={styles.bioStoresNote}>Ecover (produits ménagers écologiques)</Text>
                      <Text style={styles.bioStoresNote}>L'Arbre Vert (produits ménagers certifiés Écolabel)</Text>
                      <Text style={styles.bioStoresNote}>Cattier (cosmétiques bio certifiés)</Text>
                      <Text style={styles.bioStoresNote}>Coslys (cosmétiques bio français)</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.bioStoresSubtitle}>Marques bio recommandées</Text>
                      <Text style={styles.bioStoresNote}>Bjorg, Bonneterre, Priméal, Jardin Bio</Text>
                    </>
                  )}
                </>
              )}
            </View>
          </View>
        )}

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
            {isShareLoading ? 'Préparation...' : 'Partager ce résultat'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drToxiButton} onPress={handleAskDrToxi} activeOpacity={0.8} testID="ask-dr-toxi">
          <MessageCircle color={Colors.primary} size={20} />
          <Text style={styles.drToxiButtonText}>Demander à Dr. Toxi</Text>
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  productHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: -0.3,
  },
  productBrand: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
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
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
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
  badgeSublabel: {
    fontSize: 13,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
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
  sectionTitleSmall: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  additiveCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
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
    fontSize: 13,
    fontWeight: '700' as const,
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
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#34C759',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
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
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(52, 199, 89, 0.04)',
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

const riskScoreStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1A1A',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  barContainer: {
    flex: 1,
  },
  barTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden' as const,
  },
  barFill: {
    height: 12,
    borderRadius: 6,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '800' as const,
    minWidth: 48,
    textAlign: 'right' as const,
  },
  levelLabel: {
    fontSize: 14,
    color: '#4A4A4A',
    marginTop: 10,
  },
});
// Product detail screen - Dr.Toxi
