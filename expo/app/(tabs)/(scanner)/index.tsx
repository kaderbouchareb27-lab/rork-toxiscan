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
import { Camera, Sparkles, Shirt, Droplets, UtensilsCrossed, Salad, SprayCan } from 'lucide-react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { analyzeUniversalPhoto, universalResultToScannedProduct } from '@/utils/api';
import { getScanFacts, pickRandomFactIndex } from '@/constants/scanFacts';
import { compressImageWeb, compressImageNative } from '@/utils/imageCompression';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useBadges } from '@/providers/BadgesProvider';
import { useOnboarding } from '@/providers/OnboardingProvider';
import DailyFact from '@/components/DailyFact';
import DonationBanner from '@/components/DonationBanner';
import { t } from '@/utils/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ScannerScreen() {
  const { addProduct } = useScanHistory();
  const { recordScan } = useBadges();
  const { hasSeenOnboarding, hasAcceptedAIConsent } = useOnboarding();

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
      let thumbnailBase64: string | undefined;
      try {
        if (Platform.OS === 'web') {
          base64 = await compressImageWeb(imageUri, 800);
          try {
            thumbnailBase64 = await compressImageWeb(imageUri, 120);
          } catch (e) {
            console.warn('[Scanner] Thumbnail generation failed on web:', e);
          }
        } else {
          base64 = await compressImageNative(imageUri, 800, 0.7);
          try {
            const thumbResult = await manipulateAsync(
              imageUri,
              [{ resize: { width: 120 } }],
              { compress: 0.5, format: SaveFormat.JPEG, base64: true }
            );
            thumbnailBase64 = thumbResult.base64 ?? undefined;
          } catch (e) {
            console.warn('[Scanner] Thumbnail generation failed on native:', e);
          }
        }
        console.log('[Scanner] Image compressed, base64 length:', base64.length);
        if (thumbnailBase64) {
          console.log('[Scanner] Thumbnail generated, length:', thumbnailBase64.length);
        }
      } catch (compressionError) {
        console.error('[Scanner] Image compression failed:', compressionError);
        throw new Error(t('error_process_photo'));
      }

      if (!base64 || base64.length < 100) {
        console.error('[Scanner] Base64 too short or empty:', base64?.length);
        throw new Error(t('error_invalid_photo'));
      }

      console.log('[Scanner] Sending to API...');
      let result;
      try {
        result = await analyzeUniversalPhoto(base64);
      } catch (apiError) {
        console.error('[Scanner] API call failed:', apiError);
        throw new Error(t('error_analysis_failed'));
      }

      if (result.erreur) {
        console.error('[Scanner] API returned error:', result.erreur);
        throw new Error(t('error_analyze_product'));
      }

      const product = universalResultToScannedProduct(result, imageUri);
      if (thumbnailBase64) {
        product.thumbnailBase64 = `data:image/jpeg;base64,${thumbnailBase64}`;
      }
      return product;
    },
    onSuccess: (product) => {
      console.log('[Scanner] Analysis success:', product.name, product.riskGroup);
      setProgressPercent(100);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      addProduct(product);
      recordScan(product.riskGroup === 'none');
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.push(`/product/${product.barcode}`);
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
    await requestCameraAndProceed();
  }, [requestCameraAndProceed]);

  const isLoading = photoMutation.isPending;

  const scanFacts = getScanFacts();
  const [tipIndex, setTipIndex] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const spinnerRotation = useRef(new Animated.Value(0)).current;
  const tipFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLoading) {
      setProgressPercent(0);
      progressAnim.setValue(0);
      return;
    }
    setTipIndex(Math.floor(Math.random() * scanFacts.length));

    const tipInterval = setInterval(() => {
      Animated.timing(tipFadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setTipIndex(prev => pickRandomFactIndex(prev, scanFacts.length));
        Animated.timing(tipFadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
      });
    }, 5000);

    const stages = [
      { target: 15, delay: 300 },
      { target: 30, delay: 1500 },
      { target: 50, delay: 3500 },
      { target: 65, delay: 6000 },
      { target: 78, delay: 9000 },
      { target: 88, delay: 13000 },
      { target: 93, delay: 18000 },
    ];
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (const stage of stages) {
      const t = setTimeout(() => {
        setProgressPercent(stage.target);
        Animated.timing(progressAnim, {
          toValue: stage.target / 100,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }, stage.delay);
      timeouts.push(t);
    }

    const spinLoop = Animated.loop(
      Animated.timing(spinnerRotation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    return () => {
      clearInterval(tipInterval);
      timeouts.forEach(t => clearTimeout(t));
      spinLoop.stop();
      spinnerRotation.setValue(0);
    };
  }, [isLoading, progressAnim, spinnerRotation, tipFadeAnim, scanFacts.length]);

  const spinDeg = spinnerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
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
            <View style={styles.loadingState}>
              <View style={styles.loadingIconContainer}>
                <Animated.View style={[styles.spinnerRing, { transform: [{ rotate: spinDeg }] }]}>
                  <View style={styles.spinnerDot} />
                </Animated.View>
                <Sparkles color="#2E9E34" size={26} style={styles.spinnerCenter} />
              </View>
              <Text style={styles.loadingTitle}>{t('analysis_in_progress')}</Text>
              <Text style={styles.loadingSubtitle}>{t('drtoxi_examining')}</Text>

              <View style={styles.progressSection}>
                <View style={styles.progressBarBg}>
                  <Animated.View style={[styles.progressBarFill, { width: progressBarWidth }]} />
                </View>
                <Text style={styles.progressText}>{progressPercent}%</Text>
              </View>

              <Animated.View style={[styles.tipContainer, { opacity: tipFadeAnim }]}>
                <View style={styles.tipHeaderRow}>
                  <Sparkles color="#2E9E34" size={14} />
                  <Text style={styles.tipTitle}>{t('daily_fact_title')} 💡</Text>
                </View>
                <Text style={styles.tipText}>{scanFacts[tipIndex]?.text}</Text>
                <Text style={styles.tipSource} numberOfLines={1}>{scanFacts[tipIndex]?.source}</Text>
              </Animated.View>
            </View>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.logoSection}>
              <RNImage
                source={{ uri: 'https://r2-pub.rork.com/generated-images/3e815a64-7d01-4c73-af0a-f66395fbf225.png' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.subtitle}>{t('protect_health')}</Text>
            </View>

            <View style={styles.actionSection}>
              <Animated.View style={{ transform: [{ scale: Animated.multiply(buttonScale, pulseAnim) }] }}>
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={handleTakePhoto}
                  onPressIn={handleButtonPressIn}
                  onPressOut={handleButtonPressOut}
                  activeOpacity={0.85}
                  testID="photo-button"
                >
                  <Camera color="#FFFFFF" size={22} strokeWidth={2} />
                  <Text style={styles.scanButtonText}>{t('photo_product')}</Text>
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.scanHint}>
                {t('scan_hint')}
              </Text>

              <View style={styles.scanTypesRow}>
                <View style={styles.scanTypeItem}>
                  <Salad color="#A0A0A0" size={14} strokeWidth={1.5} />
                  <Text style={styles.scanTypeText}>{t('cat_food')}</Text>
                </View>
                <View style={styles.scanTypeDot} />
                <View style={styles.scanTypeItem}>
                  <Droplets color="#A0A0A0" size={14} strokeWidth={1.5} />
                  <Text style={styles.scanTypeText}>{t('cat_cosmetics')}</Text>
                </View>
                <View style={styles.scanTypeDot} />
                <View style={styles.scanTypeItem}>
                  <SprayCan color="#A0A0A0" size={14} strokeWidth={1.5} />
                  <Text style={styles.scanTypeText}>{t('cat_household')}</Text>
                </View>
                <View style={styles.scanTypeDot} />
                <View style={styles.scanTypeItem}>
                  <Shirt color="#A0A0A0" size={14} strokeWidth={1.5} />
                  <Text style={styles.scanTypeText}>{t('cat_clothing')}</Text>
                </View>
                <View style={styles.scanTypeDot} />
                <View style={styles.scanTypeItem}>
                  <UtensilsCrossed color="#A0A0A0" size={14} strokeWidth={1.5} />
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
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 28,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 32,
  },
  logoImage: {
    width: 140,
    height: 140,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center' as const,
    letterSpacing: 0.1,
  },
  actionSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#2E9E34',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 22,
    width: SCREEN_WIDTH - 48,
    shadowColor: '#237A28',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  scanHint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'center' as const,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  scanTypesRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 20,
    flexWrap: 'wrap' as const,
    gap: 6,
    paddingHorizontal: 8,
  },
  scanTypeItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  scanTypeText: {
    fontSize: 11,
    color: '#B0B0B0',
    letterSpacing: 0.1,
  },
  scanTypeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D0D0D0',
  },
  cardsSection: {
    paddingHorizontal: 20,
    gap: 14,
  },
  loadingCenterSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingState: {
    alignItems: 'center',
    gap: 14,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(46, 158, 52, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  spinnerRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(46, 158, 52, 0.15)',
    borderTopColor: '#2E9E34',
  },
  spinnerDot: {
    position: 'absolute',
    top: -2,
    left: '50%' as unknown as number,
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E9E34',
  },
  spinnerCenter: {
    position: 'absolute',
  },
  progressSection: {
    width: '100%',
    maxWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(46, 158, 52, 0.12)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#2E9E34',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#2E9E34',
    minWidth: 36,
    textAlign: 'right' as const,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1A1C1E',
    letterSpacing: -0.3,
  },
  loadingSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
  },
  tipContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(46, 158, 52, 0.1)',
  },
  tipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#2E9E34',
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const,
  },
  tipText: {
    fontSize: 13.5,
    color: '#1A1C1E',
    lineHeight: 20,
  },
  tipSource: {
    marginTop: 10,
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic' as const,
  },

});
