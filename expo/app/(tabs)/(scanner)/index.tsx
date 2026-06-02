import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
  Linking,
  ScrollView,
  Dimensions,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as RNImage } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Shirt, Droplets, UtensilsCrossed, Leaf, SprayCan, Database, ShieldCheck, ChevronRight, Zap } from 'lucide-react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { scanOcrInstant, scanAiEnrich, universalResultToScannedProduct } from '@/utils/api';
import type { ScannedProduct } from '@/types';
import { compressImageWeb, compressImageNative } from '@/utils/imageCompression';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useBadges } from '@/providers/BadgesProvider';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import DailyFact from '@/components/DailyFact';
import DonationBanner from '@/components/DonationBanner';
import { t, tf } from '@/utils/i18n';
import { DR_TOXI_DEFAULT_AVATAR_URI } from '@/constants/drToxiAvatars';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TITLE_FONT_FAMILY = Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia' }) ?? 'serif';
const ANALYZING_DR_TOXI_AVATAR_URI = 'https://r2-pub.rork.com/generated-images/256dc913-0f70-4358-b3aa-5bc9a38cc427.png';
const LOADER_BAR_WIDTH = 232;
const LOADER_BAR_SEGMENT = 78;

export default function ScannerScreen() {
  const { addProduct, updateProduct } = useScanHistory();
  const { recordScan } = useBadges();
  const { hasSeenOnboarding, hasAcceptedAIConsent } = useOnboarding();
  const { canScan, consumeScan, isPro, scanRemaining, scanLimit } = useSubscription();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hasAcceptedAIConsent === false) {
      console.log('[Scanner] User has not accepted AI consent, redirecting...');
      router.replace('/ai-consent');
    } else if (hasSeenOnboarding === false) {
      console.log('[Scanner] User has not seen onboarding, redirecting...');
      router.replace('/onboarding');
    } else if (hasSeenOnboarding === true) {
      console.log('[Scanner] User ready to scan');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.02, duration: 1800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [hasSeenOnboarding, hasAcceptedAIConsent, fadeAnim, pulseAnim]);

  const photoMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      console.log('[Scanner] Universal analysis starting for:', imageUri);

      let base64: string;
      try {
        if (Platform.OS === 'web') {
          base64 = await compressImageWeb(imageUri, 800);
        } else {
          base64 = await compressImageNative(imageUri, 800, 0.7);
        }
        console.log('[Scanner] Image compressed, base64 length:', base64.length);
      } catch (compressionError) {
        console.error('[Scanner] Image compression failed:', compressionError);
        throw new Error(t('error_process_photo'));
      }

      if (!base64 || base64.length < 100) {
        console.error('[Scanner] Base64 too short or empty:', base64?.length);
        throw new Error(t('error_invalid_photo'));
      }

      const thumbnailPromise: Promise<string | undefined> = (async () => {
        try {
          if (Platform.OS === 'web') {
            return await compressImageWeb(imageUri, 120);
          }
          const thumbResult = await manipulateAsync(
            imageUri,
            [{ resize: { width: 120 } }],
            { compress: 0.5, format: SaveFormat.JPEG, base64: true }
          );
          return thumbResult.base64 ?? undefined;
        } catch (e) {
          console.warn('[Scanner] Thumbnail generation failed:', e);
          return undefined;
        }
      })();

      console.log('[Scanner] OCR + instant local classification (thumbnail in parallel)...');
      let instant;
      let thumbnailBase64: string | undefined;
      try {
        const [instantResult, thumb] = await Promise.all([
          scanOcrInstant(base64),
          thumbnailPromise,
        ]);
        instant = instantResult;
        thumbnailBase64 = thumb;
      } catch (apiError) {
        const realMsg = apiError instanceof Error ? apiError.message : String(apiError);
        console.error('[Scanner] OCR/instant failed with real error:', realMsg);
        throw new Error(realMsg || t('error_analysis_failed'));
      }

      // If OCR found no readable ingredients, wait for the full AI analysis before showing
      // a verdict (so we never display a wrong instant "approved" badge on an unreadable label).
      if (!instant.cached && !instant.instant) {
        const finalResult = await scanAiEnrich(base64, instant.ocrData, instant.cacheKey, instant.result);
        if (finalResult.erreur) {
          console.error('[Scanner] AI returned error:', finalResult.erreur);
          throw new Error(finalResult.erreur);
        }
        instant = { ...instant, result: finalResult, cached: true, instant: true };
      }

      const thumbnailUri = thumbnailBase64 ? `data:image/jpeg;base64,${thumbnailBase64}` : undefined;
      const product = universalResultToScannedProduct(instant.result, imageUri);
      if (thumbnailUri) product.thumbnailBase64 = thumbnailUri;

      return {
        product,
        base64,
        imageUri,
        thumbnailUri,
        ocrData: instant.ocrData,
        cacheKey: instant.cacheKey,
        instantResult: instant.result,
        needsEnrich: !instant.cached,
      };
    },
    onSuccess: ({ product, base64, imageUri, thumbnailUri, ocrData, cacheKey, instantResult, needsEnrich }) => {
      console.log('[Scanner] Instant verdict ready:', product.name, product.riskGroup);
      addProduct(product);
      consumeScan();
      recordScan(product.riskGroup === 'none');
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.push(`/product/${product.barcode}`);

      // Background: let the AI generate descriptions for unknown ingredients, then merge.
      if (needsEnrich) {
        const barcode = product.barcode;
        void scanAiEnrich(base64, ocrData, cacheKey, instantResult)
          .then((finalResult) => {
            const finalProduct = universalResultToScannedProduct(finalResult, imageUri);
            const patch: Partial<ScannedProduct> = {
              name: finalProduct.name,
              riskGroup: finalProduct.riskGroup,
              detectedAdditives: finalProduct.detectedAdditives,
              ingredientsText: finalProduct.ingredientsText,
              detectedIngredients: finalProduct.detectedIngredients,
              analysisSummary: finalProduct.analysisSummary,
              productCategory: finalProduct.productCategory,
              categories: finalProduct.categories,
              objectIdentified: finalProduct.objectIdentified,
              materialDetected: finalProduct.materialDetected,
              substances: finalProduct.substances,
              recommendations: finalProduct.recommendations,
              saferAlternatives: finalProduct.saferAlternatives,
              healthyAlternatives: finalProduct.healthyAlternatives,
            };
            updateProduct(barcode, patch);
            console.log('[Scanner] Background AI enrichment merged for:', barcode);
          })
          .catch((e) => console.warn('[Scanner] Background enrichment failed:', e));
      }
    },
    onError: (error: Error) => {
      console.error('[Scanner] Analysis error:', error.message);
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      const userMessage = error.message && !error.message.includes('expected') && !error.message.includes('parse') && !error.message.includes('undefined')
        ? error.message
        : t('error_analyze_photo');
      Alert.alert(
        t('error_analysis_title'),
        userMessage,
        [{ text: t('ok') }]
      );
    },
  });

  const launchCamera = useCallback(async () => {
    try {
      console.log('[Scanner] Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[Scanner] Photo taken, starting analysis');
        photoMutation.mutate(result.assets[0].uri);
      } else {
        console.log('[Scanner] Camera cancelled by user');
      }
    } catch (error) {
      console.error('[Scanner] Camera error:', error);
      Alert.alert(t('error_generic'), t('error_open_camera'));
    }
  }, [photoMutation]);

  const requestCameraAndProceed = useCallback(async () => {
    try {
      const { status: existingStatus } = await ImagePicker.getCameraPermissionsAsync();
      console.log('[Scanner] Camera permission status:', existingStatus);

      if (existingStatus === 'granted') {
        await launchCamera();
        return;
      }

      if (existingStatus === 'denied') {
        Alert.alert(
          t('camera_disabled_title'),
          t('camera_disabled_msg'),
          [
            { text: t('open_settings'), onPress: () => { if (Platform.OS !== 'web') void Linking.openSettings(); } },
          ]
        );
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('[Scanner] Permission request result:', status);
      if (status === 'granted') {
        await launchCamera();
      } else {
        Alert.alert(
          t('camera_disabled_title'),
          t('camera_disabled_msg'),
          [
            { text: t('open_settings'), onPress: () => { if (Platform.OS !== 'web') void Linking.openSettings(); } },
          ]
        );
      }
    } catch (error) {
      console.error('[Scanner] Permission check error:', error);
    }
  }, [launchCamera]);


  const handleButtonPressIn = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 0.93,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [buttonScale]);

  const handleButtonPressOut = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [buttonScale]);

  const handleTakePhoto = useCallback(async () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (!canScan) {
      console.log('[Scanner] Daily scan limit reached, showing paywall');
      router.push('/paywall?source=scan');
      return;
    }
    await requestCameraAndProceed();
  }, [requestCameraAndProceed, canScan]);

  const isLoading = photoMutation.isPending;

  // Lean loader: a slim, indeterminate loader calibrated for the new ~1-3s OCR wait.
  // No fake percentage; a short reassuring status line transitions as time passes,
  // and the slow AI-fallback path (unreadable label) gracefully shows "Looking closer…".
  type LoaderStatus = 'reading' | 'checking' | 'closer';
  const [statusKey, setStatusKey] = useState<LoaderStatus>('reading');
  const spinnerRotation = useRef(new Animated.Value(0)).current;
  const pulseRing = useRef(new Animated.Value(0)).current;
  const trackAnim = useRef(new Animated.Value(0)).current;
  const statusFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLoading) {
      setStatusKey('reading');
      return;
    }

    const spinLoop = Animated.loop(
      Animated.timing(spinnerRotation, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    const pulseLoop = Animated.loop(
      Animated.timing(pulseRing, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    pulseLoop.start();

    const trackLoop = Animated.loop(
      Animated.timing(trackAnim, {
        toValue: 1,
        duration: 1150,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    trackLoop.start();

    const fadeTo = (next: LoaderStatus) => {
      Animated.timing(statusFadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setStatusKey(next);
        Animated.timing(statusFadeAnim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
      });
    };
    const toChecking = setTimeout(() => fadeTo('checking'), 850);
    const toCloser = setTimeout(() => fadeTo('closer'), 2500);

    return () => {
      clearTimeout(toChecking);
      clearTimeout(toCloser);
      spinLoop.stop();
      pulseLoop.stop();
      trackLoop.stop();
      spinnerRotation.setValue(0);
      pulseRing.setValue(0);
      trackAnim.setValue(0);
      statusFadeAnim.setValue(1);
    };
  }, [isLoading, spinnerRotation, pulseRing, trackAnim, statusFadeAnim]);

  const statusText = statusKey === 'closer'
    ? t('analysis_looking_closer')
    : statusKey === 'checking'
    ? t('analysis_checking_ingredients')
    : t('analysis_reading_label');

  const spinDeg = spinnerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseScale = pulseRing.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1.32],
  });

  const pulseOpacity = pulseRing.interpolate({
    inputRange: [0, 0.12, 1],
    outputRange: [0, 0.5, 0],
  });

  const trackTranslate = trackAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-LOADER_BAR_SEGMENT, LOADER_BAR_WIDTH],
  });

  if (hasAcceptedAIConsent === null || hasSeenOnboarding === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E9E34" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {isLoading ? (
          <View style={styles.loadingCenterSection}>
            <View style={styles.loadingBackdropOrbTop} />
            <View style={styles.loadingBackdropOrbBottom} />

            <View style={styles.leanLoader}>
              <View style={styles.leanAvatarStage}>
                <Animated.View
                  style={[styles.leanPulseRing, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]}
                />
                <Animated.View style={[styles.leanSpinRing, { transform: [{ rotate: spinDeg }] }]}>
                  <View style={styles.spinnerDot} />
                </Animated.View>
                <View style={styles.leanAvatarDisc}>
                  <RNImage
                    source={{ uri: ANALYZING_DR_TOXI_AVATAR_URI }}
                    style={styles.leanAvatar}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <Text style={styles.leanTitle}>{t('analysis_in_progress')}</Text>
              <Animated.Text style={[styles.leanStatus, { opacity: statusFadeAnim }]}>
                {statusText}
              </Animated.Text>

              <View style={styles.leanTrackBg}>
                <Animated.View
                  style={[styles.leanTrackFill, { transform: [{ translateX: trackTranslate }] }]}
                />
              </View>
            </View>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.heroSection}>
              <LinearGradient
                colors={['#FFFFFC', '#FAFAF8', '#F3EFE6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroMainRow}>
                  <View style={styles.heroCopy}>
                    <Text style={styles.brandTitle}>Dr. Toxi</Text>
                    <Text style={styles.subtitle}>{t('protect_health')}</Text>
                    <View style={styles.titleAccent} />
                  </View>
                  <View style={styles.avatarHalo}>
                    <RNImage
                      source={{ uri: DR_TOXI_DEFAULT_AVATAR_URI }}
                      style={styles.heroAvatar}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                <View style={styles.trustStrip}>
                  <View style={styles.trustItem}>
                    <ShieldCheck color="#183A2E" size={17} strokeWidth={1.9} />
                    <Text style={styles.trustText}>CIRC/OMS</Text>
                  </View>
                  <View style={styles.trustItem}>
                    <Database color="#183A2E" size={17} strokeWidth={1.9} />
                    <Text style={styles.trustText}>{t('home_database_label')}</Text>
                  </View>
                  <View style={styles.trustItem}>
                    <Zap color="#183A2E" size={17} strokeWidth={1.9} />
                    <Text style={styles.trustText}>{t('home_instant_label')}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.actionSection}>
              <Animated.View style={{ transform: [{ scale: Animated.multiply(buttonScale, pulseAnim) }] }}>
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={handleTakePhoto}
                  onPressIn={handleButtonPressIn}
                  onPressOut={handleButtonPressOut}
                  activeOpacity={0.88}
                  testID="photo-button"
                >
                  <LinearGradient
                    colors={['#2E9E34', '#2E9E34', '#2E9E34']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.scanButtonGradient}
                  >
                    <View style={styles.scanButtonLead}>
                      <View style={styles.scanButtonIconWrap}>
                        <Camera color="#FFFFFF" size={22} strokeWidth={2.1} />
                      </View>
                      <Text style={styles.scanButtonText}>{t('photo_product')}</Text>
                    </View>
                    <ChevronRight color="#FFFFFF" size={24} strokeWidth={2.1} />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.scanHint}>
                {t('scan_hint')}
              </Text>

              {!isPro && (
                <Text style={styles.scanCounterText} testID="scan-counter">
                  {tf('free_scans_counter', scanRemaining, scanLimit)}
                </Text>
              )}

              <View style={styles.scanTypesRow}>
                <View style={styles.scanTypeItem}>
                  <Leaf color="#2F463B" size={15} strokeWidth={1.7} />
                  <Text style={styles.scanTypeText}>{t('cat_food')}</Text>
                </View>
                <View style={styles.scanTypeDot} />
                <View style={styles.scanTypeItem}>
                  <Droplets color="#2F463B" size={15} strokeWidth={1.7} />
                  <Text style={styles.scanTypeText}>{t('cat_cosmetics')}</Text>
                </View>
                <View style={styles.scanTypeDot} />
                <View style={styles.scanTypeItem}>
                  <SprayCan color="#2F463B" size={15} strokeWidth={1.7} />
                  <Text style={styles.scanTypeText}>{t('cat_household')}</Text>
                </View>
                <View style={styles.scanTypeDot} />
                <View style={styles.scanTypeItem}>
                  <Shirt color="#2F463B" size={15} strokeWidth={1.7} />
                  <Text style={styles.scanTypeText}>{t('cat_clothing')}</Text>
                </View>
                <View style={styles.scanTypeDot} />
                <View style={styles.scanTypeItem}>
                  <UtensilsCrossed color="#2F463B" size={15} strokeWidth={1.7} />
                  <Text style={styles.scanTypeText}>{t('cat_utensils')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardsSection}>
              <DailyFact />
              <DonationBanner />
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF8',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 12,
    paddingBottom: 28,
  },
  heroSection: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 24,
    alignItems: 'center',
  },
  heroGlowTop: {
    position: 'absolute',
    top: -32,
    right: -38,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(232, 115, 10, 0.10)',
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: 6,
    left: -54,
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: 'rgba(17, 18, 15, 0.05)',
  },
  heroCard: {
    width: '100%',
    maxWidth: 392,
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: '#E9E0D2',
    shadowColor: '#2F281F',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.09,
    shadowRadius: 34,
    elevation: 6,
  },
  brandPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    alignSelf: 'center' as const,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderWidth: 1,
    borderColor: '#DDD2BF',
  },
  brandPillText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#183A2E',
    letterSpacing: 2.4,
    textTransform: 'uppercase' as const,
  },
  heroMainRow: {
    width: '100%',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
    marginTop: 12,
    marginBottom: 18,
  },
  heroCopy: {
    flex: 1,
    alignItems: 'flex-start' as const,
  },
  titleAccent: {
    width: 38,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#0B7A2D',
    marginTop: 16,
  },
  logoStage: {
    width: 248,
    height: 180,
    marginTop: 8,
    marginBottom: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  labelPreviewCard: {
    position: 'absolute',
    right: 8,
    bottom: 15,
    width: 116,
    height: 128,
    borderRadius: 20,
    padding: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(17, 18, 15, 0.08)',
    shadowColor: '#11120F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 4,
    transform: [{ rotate: '5deg' }],
  },
  labelPreviewHeader: {
    width: 40,
    height: 11,
    borderRadius: 7,
    backgroundColor: '#E8730A',
    marginBottom: 14,
  },
  labelPreviewLine: {
    width: 62,
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(17, 18, 15, 0.14)',
    marginBottom: 8,
  },
  labelPreviewLineWide: {
    width: 82,
  },
  labelPreviewBadgesRow: {
    flexDirection: 'row' as const,
    gap: 5,
    marginTop: 6,
  },
  labelPreviewBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  labelPreviewBadgeDanger: {
    backgroundColor: '#D0260F',
  },
  labelPreviewBadgeWarning: {
    backgroundColor: '#E8730A',
  },
  labelPreviewBadgeSafe: {
    backgroundColor: '#2E9E34',
  },
  avatarHalo: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0ECE4',
    overflow: 'hidden' as const,
  },
  heroAvatar: {
    width: 112,
    height: 112,
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: '700' as const,
    fontFamily: TITLE_FONT_FAMILY,
    color: '#0A2A1D',
    letterSpacing: -1.4,
    lineHeight: 48,
    textAlign: 'left' as const,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 19,
    fontWeight: '400' as const,
    color: '#4D5350',
    textAlign: 'left' as const,
    letterSpacing: -0.2,
    lineHeight: 25,
  },
  trustStrip: {
    width: '100%',
    marginTop: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 9,
  },
  trustItem: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 7,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: '#E7DFD3',
  },
  trustText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#222724',
    letterSpacing: -0.15,
  },
  trustDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(17, 18, 15, 0.10)',
  },
  actionSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  scanButton: {
    width: SCREEN_WIDTH - 48,
    borderRadius: 26,
    shadowColor: '#0B7A2D',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 9,
  },
  scanButtonGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    minHeight: 68,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  scanButtonLead: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  scanButtonIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.25,
  },
  barcodeButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(46, 158, 52, 0.35)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 18,
    width: SCREEN_WIDTH - 48,
    marginTop: 12,
  },
  barcodeButtonText: {
    color: '#2E9E34',
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  scanHint: {
    fontSize: 15,
    color: '#5E625F',
    marginTop: 17,
    textAlign: 'center' as const,
    paddingHorizontal: 10,
    lineHeight: 21,
    fontWeight: '400' as const,
  },
  scanCounterText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#A94F05',
    textAlign: 'center' as const,
    paddingHorizontal: 20,
  },
  scanTypesRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 24,
    flexWrap: 'wrap' as const,
    gap: 12,
    paddingHorizontal: 2,
  },
  scanTypeItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderWidth: 1,
    borderColor: '#DDD8CE',
    shadowColor: '#2F281F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  scanTypeText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#303633',
    letterSpacing: -0.1,
  },
  scanTypeDot: {
    display: 'none',
    width: 0,
    height: 0,
  },
  cardsSection: {
    paddingHorizontal: 20,
    gap: 14,
  },
  loadingCenterSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#FAFAF8',
    overflow: 'hidden',
  },
  loadingBackdropOrbTop: {
    position: 'absolute',
    top: 72,
    right: -70,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(46, 158, 52, 0.10)',
  },
  loadingBackdropOrbBottom: {
    position: 'absolute',
    bottom: 96,
    left: -86,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(232, 115, 10, 0.08)',
  },
  leanLoader: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  leanAvatarStage: {
    width: 132,
    height: 132,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 22,
  },
  leanPulseRing: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 2,
    borderColor: 'rgba(46, 158, 52, 0.55)',
  },
  leanSpinRing: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 3,
    borderColor: 'rgba(46, 158, 52, 0.12)',
    borderTopColor: '#2E9E34',
    borderRightColor: 'rgba(46, 158, 52, 0.40)',
  },
  spinnerDot: {
    position: 'absolute',
    top: -3,
    left: '50%' as unknown as number,
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2E9E34',
  },
  leanAvatarDisc: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#FFFFFF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(46, 158, 52, 0.10)',
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
    overflow: 'hidden' as const,
  },
  leanAvatar: {
    width: 78,
    height: 78,
  },
  leanTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#11120F',
    letterSpacing: -0.3,
    textAlign: 'center' as const,
  },
  leanStatus: {
    marginTop: 5,
    fontSize: 14.5,
    fontWeight: '500' as const,
    color: '#6C8A74',
    textAlign: 'center' as const,
  },
  leanTrackBg: {
    width: LOADER_BAR_WIDTH,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(46, 158, 52, 0.12)',
    overflow: 'hidden' as const,
    marginTop: 20,
  },
  leanTrackFill: {
    width: LOADER_BAR_SEGMENT,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#2E9E34',
  },

});
