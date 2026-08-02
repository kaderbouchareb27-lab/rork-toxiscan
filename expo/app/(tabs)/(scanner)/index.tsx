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
import { Camera, Droplets, Utensils, ScanLine, Database, ShieldCheck, ChevronRight, Zap } from 'lucide-react-native';
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
import { t, tf, pick } from '@/utils/i18n';
import { DR_TOXI_DEFAULT_AVATAR_URI } from '@/constants/drToxiAvatars';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TITLE_FONT_FAMILY = Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia' }) ?? 'serif';
const ANALYZING_DR_TOXI_AVATAR_URI = 'https://r2-pub.rork.com/generated-images/256dc913-0f70-4358-b3aa-5bc9a38cc427.png';
const LOADER_BAR_WIDTH = 232;
const LOADER_BAR_SEGMENT = 78;
const MEAL_SCAN_IMAGE_URI = 'https://r2-pub.rork.com/projects/7x6ujs5cfo0x23gzhbn3e/assets/b54ffecf-2f9f-4b18-bd28-1e2295ccd9ff.png';

export default function ScannerScreen() {
  const { addProduct, updateProduct } = useScanHistory();
  const { recordScan } = useBadges();
  const { hasSeenOnboarding, hasSeenMealOnboarding } = useOnboarding();
  const { isPro, consumeScan, canScan, scanRemaining, scanLimit, canMealScan, mealScanRemaining, mealScanLimit } = useSubscription();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const mealCardFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasSeenOnboarding === false) {
      console.log('[Scanner] User has not seen onboarding, redirecting...');
      router.replace('/onboarding');
    } else if (hasSeenMealOnboarding === false) {
      console.log('[Scanner] User has not seen meal reminders onboarding, redirecting...');
      router.replace('/meal-onboarding');
    } else if (hasSeenOnboarding === true && hasSeenMealOnboarding === true) {
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
  }, [hasSeenOnboarding, hasSeenMealOnboarding, fadeAnim, pulseAnim]);

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
        // FAST-PATH: when the instant result is already complete (all ingredients known in the
        // DB + a real product name read), there is nothing for the AI to add — skip enrichment.
        needsEnrich: !instant.cached && !instant.complete,
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
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('[Scanner] Camera unavailable (non-blocking):', msg);
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
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('[Scanner] Permission check failed (non-blocking):', msg);
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
      console.log('[Scanner] Daily product scan limit reached, routing to paywall');
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      router.push('/paywall?source=product');
      return;
    }
    await requestCameraAndProceed();
  }, [canScan, requestCameraAndProceed]);

  // ── Meal scan entry — a SEPARATE workflow that routes to /meal/confirm ──
  const launchMealCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      let granted = status === 'granted';
      if (!granted && status !== 'denied') {
        const req = await ImagePicker.requestCameraPermissionsAsync();
        granted = req.status === 'granted';
      }
      if (!granted) {
        Alert.alert(t('camera_disabled_title'), t('camera_disabled_msg'), [
          { text: t('open_settings'), onPress: () => { if (Platform.OS !== 'web') void Linking.openSettings(); } },
        ]);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false });
      if (!result.canceled && result.assets[0]) {
        router.push(`/meal/confirm?uri=${encodeURIComponent(result.assets[0].uri)}`);
      }
    } catch (error) {
      console.warn('[Scanner] Meal camera error:', error);
      Alert.alert(t('error_generic'), t('error_open_camera'));
    }
  }, []);

  const launchMealGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false });
      if (!result.canceled && result.assets[0]) {
        router.push(`/meal/confirm?uri=${encodeURIComponent(result.assets[0].uri)}`);
      }
    } catch (error) {
      console.warn('[Scanner] Meal gallery error:', error);
    }
  }, []);

  const handleScanMeal = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (!canMealScan) {
      console.log('[Scanner] Meal scan limit reached, showing paywall');
      router.push('/paywall?source=meal');
      return;
    }
    Alert.alert(t('scan_entry_meal_title'), t('meal_estimate_hint'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('gallery'), onPress: () => void launchMealGallery() },
      { text: t('camera'), onPress: () => void launchMealCamera() },
    ]);
  }, [canMealScan, launchMealCamera, launchMealGallery]);

  const isLoading = photoMutation.isPending;

  useEffect(() => {
    if (isLoading) {
      mealCardFade.setValue(0);
      return;
    }

    const entrance = Animated.timing(mealCardFade, {
      toValue: 1,
      duration: 620,
      delay: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    entrance.start();

    return () => {
      entrance.stop();
    };
  }, [isLoading, mealCardFade]);

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

  if (hasSeenOnboarding === null || hasSeenMealOnboarding === null) {
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
            <View style={styles.redesignHero}>
              <View style={styles.redesignCopy}>
                <Text style={styles.redesignGreeting}>{pick({ fr: 'Bonjour !', en: 'Hello!', ko: '안녕하세요!' })}</Text>
                <Text style={styles.redesignBrand}>Dr. Toxi</Text>
                <Text style={styles.redesignSubtitle}>{t('protect_health')}</Text>
                <View style={styles.redesignAccent} />
              </View>
              <View style={styles.redesignAvatarStage}>
                <RNImage
                  source={{ uri: DR_TOXI_DEFAULT_AVATAR_URI }}
                  style={styles.redesignAvatar}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.redesignTrustCard}>
              <View style={styles.redesignTrustItem}>
                <ShieldCheck color="#0A5030" size={26} strokeWidth={1.8} />
                <View style={styles.redesignTrustCopy}>
                  <Text style={styles.redesignTrustTitle}>{pick({ fr: 'CIRC/OMS', en: 'IARC/WHO', ko: 'IARC/WHO' })}</Text>
                  <Text style={styles.redesignTrustCaption}>{pick({ fr: 'Sources fiables', en: 'Trusted sources', ko: '신뢰할 수 있는 출처' })}</Text>
                </View>
              </View>
              <View style={styles.redesignTrustDivider} />
              <View style={styles.redesignTrustItem}>
                <Database color="#0A5030" size={26} strokeWidth={1.8} />
                <View style={styles.redesignTrustCopy}>
                  <Text style={styles.redesignTrustTitle}>{t('home_database_label')}</Text>
                  <Text style={styles.redesignTrustCaption}>{pick({ fr: 'Ingrédients sûrs', en: 'Safer ingredients', ko: '안전한 성분' })}</Text>
                </View>
              </View>
              <View style={styles.redesignTrustDivider} />
              <View style={styles.redesignTrustItem}>
                <Zap color="#0A5030" size={26} strokeWidth={1.8} />
                <View style={styles.redesignTrustCopy}>
                  <Text style={styles.redesignTrustTitle}>{t('home_instant_label')}</Text>
                  <Text style={styles.redesignTrustCaption}>{pick({ fr: 'Analyse rapide', en: 'Quick analysis', ko: '빠른 분석' })}</Text>
                </View>
              </View>
            </View>

            <View style={styles.redesignScanSection}>
              <Text style={styles.redesignSectionTitle}>{t('scan_section_label')}</Text>
              <View style={styles.redesignCardGrid}>
                <Animated.View style={[styles.redesignScanCardWrap, { transform: [{ scale: Animated.multiply(buttonScale, pulseAnim) }] }]}>
                  <TouchableOpacity
                    style={[styles.redesignScanCard, styles.redesignProductCard]}
                    onPress={handleTakePhoto}
                    onPressIn={handleButtonPressIn}
                    onPressOut={handleButtonPressOut}
                    activeOpacity={0.92}
                    testID="photo-button"
                  >
                    <View style={styles.redesignProductLabel} pointerEvents="none">
                      <View style={styles.redesignLabelTitleLine} />
                      <View style={styles.redesignLabelRule} />
                      <View style={styles.redesignLabelRow}><View style={styles.redesignLabelShortLine} /><View style={styles.redesignLabelValueLine} /></View>
                      <View style={styles.redesignLabelRow}><View style={styles.redesignLabelShortLine} /><View style={styles.redesignLabelValueLine} /></View>
                      <View style={styles.redesignLabelRow}><View style={styles.redesignLabelShortLine} /><View style={styles.redesignLabelValueLine} /></View>
                      <View style={styles.redesignBarcodeRow}>
                        {[7, 3, 5, 2, 6, 3, 4, 7, 2, 5, 3, 6, 2].map((height: number, index: number) => (
                          <View key={`${height}-${index}`} style={[styles.redesignBarcodeBar, { height: height * 2.6 }]} />
                        ))}
                      </View>
                    </View>
                    <View style={styles.redesignCardCopy}>
                      <Text style={styles.redesignCardTitle}>{t('scan_entry_product_title')}</Text>
                      <Text style={styles.redesignCardDescription}>{t('scan_entry_product_desc')}</Text>
                    </View>
                    <LinearGradient colors={['#38B83E', '#08732C']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.redesignCardButton}>
                      <View style={styles.redesignButtonIcon}><Camera color="#168735" size={21} strokeWidth={2.6} /></View>
                      <Text style={styles.redesignButtonText}>{t('scan_entry_product_title')}</Text>
                    </LinearGradient>
                    {!isPro && <Text style={styles.redesignCounter}>{tf('product_scans_counter', scanRemaining, scanLimit)}</Text>}
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.redesignScanCardWrap,
                    {
                      opacity: mealCardFade,
                      transform: [
                        {
                          translateY: mealCardFade.interpolate({
                            inputRange: [0, 1],
                            outputRange: [16, 0],
                          }),
                        },
                        {
                          scale: mealCardFade.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.97, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                <TouchableOpacity
                  style={[styles.redesignScanCard, styles.redesignMealCard]}
                  onPress={handleScanMeal}
                  activeOpacity={0.92}
                  testID="meal-button"
                >
                  <LinearGradient colors={['#F7FAEE', '#ECF4E0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  {MEAL_SCAN_IMAGE_URI ? (
                    <RNImage source={{ uri: MEAL_SCAN_IMAGE_URI }} style={styles.redesignMealImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.redesignMealImageFallback} pointerEvents="none" />
                  )}
                  <View style={styles.redesignCardCopy}>
                    <Text style={styles.redesignCardTitle}>{t('scan_entry_meal_title')}</Text>
                    <Text style={styles.redesignCardDescription}>{t('scan_entry_meal_desc')}</Text>
                  </View>
                  <LinearGradient colors={['#38B83E', '#08732C']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.redesignCardButton}>
                    <View style={styles.redesignButtonIcon}><Utensils color="#168735" size={20} strokeWidth={2.5} /></View>
                    <Text style={styles.redesignButtonText}>{t('scan_entry_meal_title')}</Text>
                  </LinearGradient>
                  {!isPro && <Text style={styles.redesignCounter}>{tf('meal_scans_counter', mealScanRemaining, mealScanLimit)}</Text>}
                </TouchableOpacity>
                </Animated.View>
              </View>

              <View style={styles.redesignCategoryRow}>
                <View style={styles.redesignCategoryChip}>
                  <View style={styles.redesignCategoryIcon}><ScanLine color="#24973A" size={20} strokeWidth={2.1} /></View>
                  <Text style={styles.redesignCategoryText}>{t('cat_food')}</Text>
                </View>
                <View style={[styles.redesignCategoryChip, styles.redesignCosmeticChip]}>
                  <View style={[styles.redesignCategoryIcon, styles.redesignCosmeticIcon]}><Droplets color="#8B5DE5" size={20} strokeWidth={2.1} /></View>
                  <Text style={styles.redesignCategoryText}>{t('cat_cosmetics')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.redesignFactSection}>
              <DailyFact />
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
  sectionLabel: {
    alignSelf: 'flex-start' as const,
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: '#6B7069',
    letterSpacing: 0.4,
    marginBottom: 14,
    textTransform: 'uppercase' as const,
  },
  entryCardWrap: {
    width: '100%',
  },
  entryCard: {
    width: '100%',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#ECE5D8',
    shadowColor: '#2F281F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 4,
    marginBottom: 12,
  },
  entryCardMeal: {
    borderColor: 'rgba(46,158,52,0.4)',
    borderWidth: 1.5,
    backgroundColor: '#F7FDF9',
  },
  entryIconProduct: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F1EDE3',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  entryIconMeal: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#2E9E34',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  entryTextCol: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#11120F',
    letterSpacing: -0.3,
  },
  entryDesc: {
    fontSize: 13.5,
    color: '#5E635E',
    marginTop: 3,
    lineHeight: 18,
  },
  freePill: {
    alignSelf: 'flex-start' as const,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(46,158,52,0.12)',
  },
  freePillText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#0B7A2D',
    letterSpacing: 0.2,
  },
  mealCounterText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#A94F05',
  },
  scanTypesRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 22,
    gap: 12,
    paddingHorizontal: 2,
  },
  scanTypeChip: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DFD3',
    shadowColor: '#2F281F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  scanTypeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(46, 158, 52, 0.12)',
  },
  scanTypeIconWrapCosmetic: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  scanTypeText: {
    fontSize: 14.5,
    fontWeight: '600' as const,
    color: '#222724',
    letterSpacing: -0.1,
  },
  cardsSection: {
    paddingHorizontal: 20,
    gap: 14,
  },
  redesignHero: {
    minHeight: 178,
    paddingTop: 22,
    paddingHorizontal: 28,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
  },
  redesignCopy: {
    flex: 1,
    zIndex: 1,
  },
  redesignGreeting: {
    color: '#168735',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 18,
    letterSpacing: -0.35,
  },
  redesignBrand: {
    marginTop: 6,
    color: '#092D1D',
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 43,
    lineHeight: 48,
    letterSpacing: -2.2,
  },
  redesignSubtitle: {
    marginTop: 6,
    color: '#5B625E',
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.25,
  },
  redesignAccent: {
    width: 46,
    height: 4,
    borderRadius: 8,
    marginTop: 14,
    backgroundColor: '#24973A',
  },
  redesignAvatarStage: {
    width: 142,
    height: 150,
    alignItems: 'center' as const,
    justifyContent: 'flex-end' as const,
    marginRight: -13,
    marginBottom: -5,
  },
  redesignAvatar: {
    width: 150,
    height: 150,
  },
  redesignTrustCard: {
    marginHorizontal: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEAE1',
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.055,
    shadowRadius: 19,
    elevation: 3,
  },
  redesignTrustItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center' as const,
    gap: 7,
  },
  redesignTrustCopy: {
    alignItems: 'center' as const,
  },
  redesignTrustTitle: {
    color: '#10281D',
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    letterSpacing: -0.3,
    textAlign: 'center' as const,
  },
  redesignTrustCaption: {
    marginTop: 2,
    color: '#737A74',
    fontFamily: 'DMSans_400Regular',
    fontSize: 9.5,
    lineHeight: 12,
    textAlign: 'center' as const,
  },
  redesignTrustDivider: {
    width: 1,
    height: 46,
    backgroundColor: '#E9E7E1',
  },
  redesignScanSection: {
    paddingTop: 27,
    paddingHorizontal: 20,
  },
  redesignSectionTitle: {
    color: '#173326',
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    letterSpacing: -0.45,
    marginBottom: 14,
  },
  redesignCardGrid: {
    flexDirection: 'row' as const,
    gap: 14,
  },
  redesignScanCardWrap: {
    flex: 1,
  },
  redesignScanCard: {
    flex: 1,
    height: 266,
    overflow: 'hidden' as const,
    borderRadius: 29,
    justifyContent: 'flex-end' as const,
    shadowColor: '#173326',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 19,
    elevation: 3,
  },
  redesignProductCard: {
    backgroundColor: '#F2F8EC',
    borderWidth: 1,
    borderColor: '#E5ECD9',
  },
  redesignMealCard: {
    backgroundColor: '#EFF6E8',
  },
  redesignCardCopy: {
    position: 'absolute' as const,
    top: 19,
    left: 17,
    right: 13,
    zIndex: 2,
  },
  redesignCardTitle: {
    color: '#0E3322',
    fontFamily: 'DMSans_700Bold',
    fontSize: 21,
    lineHeight: 25,
    letterSpacing: -0.8,
  },
  redesignCardDescription: {
    marginTop: 8,
    maxWidth: 142,
    color: '#46564D',
    fontFamily: 'DMSans_400Regular',
    fontSize: 13.5,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  redesignCardButton: {
    zIndex: 3,
    minHeight: 58,
    marginHorizontal: 12,
    marginBottom: 26,
    paddingHorizontal: 13,
    paddingVertical: 8,
    gap: 8,
    borderRadius: 999,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#08732C',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  redesignButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFFFFF',
  },
  redesignButtonText: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 13.5,
    lineHeight: 17,
    letterSpacing: -0.25,
  },
  redesignCounter: {
    position: 'absolute' as const,
    zIndex: 3,
    bottom: 7,
    left: 12,
    right: 12,
    color: '#728176',
    fontFamily: 'DMSans_500Medium',
    fontSize: 9.5,
    textAlign: 'center' as const,
  },
  redesignProductLabel: {
    position: 'absolute' as const,
    top: 59,
    right: -18,
    width: 106,
    minHeight: 157,
    paddingHorizontal: 11,
    paddingTop: 12,
    borderRadius: 11,
    backgroundColor: '#FFFEF9',
    borderWidth: 1,
    borderColor: '#D9E4D6',
    shadowColor: '#25412F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 11,
    elevation: 5,
    transform: [{ rotate: '7deg' }],
  },
  redesignLabelTitleLine: {
    width: 57,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#165D31',
    marginBottom: 8,
  },
  redesignLabelRule: {
    height: 2,
    backgroundColor: '#273B2C',
    opacity: 0.55,
    marginBottom: 7,
  },
  redesignLabelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CAD3CA',
  },
  redesignLabelShortLine: {
    width: 35,
    height: 3,
    borderRadius: 3,
    backgroundColor: '#68806E',
  },
  redesignLabelValueLine: {
    width: 20,
    height: 3,
    borderRadius: 3,
    backgroundColor: '#A8B3A9',
  },
  redesignBarcodeRow: {
    height: 28,
    marginTop: 9,
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: 2,
  },
  redesignBarcodeBar: {
    width: 2,
    borderRadius: 1,
    backgroundColor: '#1B2C21',
  },
  redesignMealImage: {
    position: 'absolute' as const,
    width: 184,
    height: 184,
    right: -52,
    top: 48,
    zIndex: 1,
  },
  redesignMealImageFallback: {
    position: 'absolute' as const,
    width: 138,
    height: 138,
    borderRadius: 69,
    right: -49,
    top: 58,
    borderWidth: 13,
    borderColor: '#FAFBF6',
    backgroundColor: '#BAD49A',
    shadowColor: '#486737',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.18,
    shadowRadius: 11,
  },
  redesignCategoryRow: {
    marginTop: 15,
    flexDirection: 'row' as const,
    gap: 12,
  },
  redesignCategoryChip: {
    flex: 1,
    minHeight: 66,
    paddingHorizontal: 13,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 9,
    borderRadius: 22,
    backgroundColor: '#EFF8EC',
  },
  redesignCosmeticChip: {
    backgroundColor: '#F5F0FE',
  },
  redesignCategoryIcon: {
    width: 35,
    height: 35,
    borderRadius: 13,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFFFFF',
  },
  redesignCosmeticIcon: {
    backgroundColor: '#FFFFFF',
  },
  redesignCategoryText: {
    flex: 1,
    color: '#193025',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13.5,
    letterSpacing: -0.25,
  },
  redesignFactSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
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
