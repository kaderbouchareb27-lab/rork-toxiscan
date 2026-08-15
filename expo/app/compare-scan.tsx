import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ChevronLeft, Camera, Images } from 'lucide-react-native';
import { scanOcrInstant, scanAiEnrich, universalResultToScannedProduct } from '@/utils/api';
import type { ScannedProduct, UniversalAnalysisResult } from '@/types';
import { compressImageWeb, compressImageNative } from '@/utils/imageCompression';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useBadges } from '@/providers/BadgesProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { t, pick } from '@/utils/i18n';
import { DR_TOXI_DEFAULT_AVATAR_URI } from '@/constants/drToxiAvatars';
import Colors from '@/constants/colors';

/**
 * Étape 2 du comparateur : photographier le second produit. La caméra s'ouvre
 * automatiquement (sauf web) ; si l'utilisateur annule, il retombe sur cet écran
 * avec deux boutons (caméra / galerie). Le pipeline d'analyse est identique à
 * celui du scan initial, puis on bascule vers l'écran Comparaison.
 */
export default function CompareScanScreen() {
  const { base } = useLocalSearchParams<{ base: string }>();
  const { history, addProduct, updateProduct } = useScanHistory();
  const { recordScan } = useBadges();
  const { canScan, consumeScan } = useSubscription();

  const baseProduct = history.find((p) => p.barcode === base);

  const photoMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      let base64: string;
      try {
        base64 = Platform.OS === 'web'
          ? await compressImageWeb(imageUri, 800)
          : await compressImageNative(imageUri, 800, 0.7);
      } catch {
        throw new Error(t('error_process_photo'));
      }
      if (!base64 || base64.length < 100) throw new Error(t('error_invalid_photo'));

      const thumbnailPromise: Promise<string | undefined> = (async () => {
        try {
          if (Platform.OS === 'web') return await compressImageWeb(imageUri, 120);
          const thumb = await manipulateAsync(
            imageUri,
            [{ resize: { width: 120 } }],
            { compress: 0.5, format: SaveFormat.JPEG, base64: true },
          );
          return thumb.base64 ?? undefined;
        } catch {
          return undefined;
        }
      })();

      const [instant, thumbnailBase64] = await Promise.all([
        scanOcrInstant(base64),
        thumbnailPromise,
      ]);

      const awaitingFirstVerdict = !instant.cached && !instant.instant;
      const thumbnailUri = thumbnailBase64 ? `data:image/jpeg;base64,${thumbnailBase64}` : undefined;
      const product = universalResultToScannedProduct(instant.result, imageUri);
      if (thumbnailUri) product.thumbnailBase64 = thumbnailUri;
      if (awaitingFirstVerdict) {
        product.analysisPending = true;
        product.name = t('analyzing_product');
      }

      return {
        product,
        base64,
        imageUri,
        ocrData: instant.ocrData,
        cacheKey: instant.cacheKey,
        imageFingerprint: instant.imageFingerprint,
        instantResult: instant.result,
        awaitingFirstVerdict,
        needsEnrich: !instant.cached && !instant.complete,
      };
    },
    onSuccess: ({ product, base64, imageUri, ocrData, cacheKey, imageFingerprint, instantResult, needsEnrich, awaitingFirstVerdict }) => {
      addProduct(product);
      consumeScan();
      recordScan(product.riskGroup === 'none');
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(
          awaitingFirstVerdict ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
        );
      }
      if (!base) return;
      router.replace({ pathname: '/compare', params: { A: base, B: product.barcode } });

      if (needsEnrich) {
        const barcode = product.barcode;
        const mergeResult = (result: UniversalAnalysisResult, isFinal: boolean): void => {
          const merged = universalResultToScannedProduct(result, imageUri);
          const patch: Partial<ScannedProduct> = {
            name: merged.name,
            riskGroup: merged.riskGroup,
            detectedAdditives: merged.detectedAdditives,
            ingredientsText: merged.ingredientsText,
            detectedIngredients: merged.detectedIngredients,
            analysisSummary: merged.analysisSummary,
            productCategory: merged.productCategory,
            categories: merged.categories,
            objectIdentified: merged.objectIdentified,
            materialDetected: merged.materialDetected,
            substances: merged.substances,
            recommendations: merged.recommendations,
            saferAlternatives: merged.saferAlternatives,
            healthyAlternatives: merged.healthyAlternatives,
            analysisPending: false,
          };
          updateProduct(barcode, patch);
          if (isFinal && awaitingFirstVerdict && Platform.OS !== 'web') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        };

        void scanAiEnrich(base64, ocrData, cacheKey, instantResult, {
          imageFingerprint,
          onPartial: (partial) => mergeResult(partial, false),
        })
          .then((finalResult) => mergeResult(finalResult, true))
          .catch(() => updateProduct(barcode, { analysisPending: false }));
      }
    },
    onError: (error: Error) => {
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const userMessage = error.message && !error.message.includes('expected') && !error.message.includes('parse') && !error.message.includes('undefined')
        ? error.message
        : t('error_analyze_photo');
      Alert.alert(t('error_analysis_title'), userMessage, [{ text: t('ok') }]);
    },
  });

  const launchCamera = useCallback(async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        photoMutation.mutate(result.assets[0].uri);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('[CompareScan] Camera unavailable (non-blocking):', msg);
      Alert.alert(t('error_generic'), t('error_open_camera'));
    }
  }, [photoMutation]);

  const requestCameraAndProceed = useCallback(async () => {
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      if (status === 'granted') { await launchCamera(); return; }
      if (status === 'denied') {
        Alert.alert(t('camera_disabled_title'), t('camera_disabled_msg'), [
          { text: t('open_settings'), onPress: () => { if (Platform.OS !== 'web') void Linking.openSettings(); } },
        ]);
        return;
      }
      const req = await ImagePicker.requestCameraPermissionsAsync();
      if (req.status === 'granted') await launchCamera();
      else {
        Alert.alert(t('camera_disabled_title'), t('camera_disabled_msg'), [
          { text: t('open_settings'), onPress: () => { if (Platform.OS !== 'web') void Linking.openSettings(); } },
        ]);
      }
    } catch (error) {
      console.warn('[CompareScan] Permission check failed (non-blocking):', error);
    }
  }, [launchCamera]);

  const launchGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        photoMutation.mutate(result.assets[0].uri);
      }
    } catch (error) {
      console.warn('[CompareScan] Gallery error:', error);
    }
  }, [photoMutation]);

  // Garde la référence la plus récente pour l'auto-lancement sans dépendances.
  const launchRef = useRef<() => void>(() => {});
  launchRef.current = () => { void requestCameraAndProceed(); };

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const timer = setTimeout(() => launchRef.current(), 420);
    return () => clearTimeout(timer);
  }, []);

  const handleScan = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!canScan) {
      router.push('/paywall?source=product');
      return;
    }
    void requestCameraAndProceed();
  }, [canScan, requestCameraAndProceed]);

  const isLoading = photoMutation.isPending;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
          testID="compare-scan-back"
        >
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pick({ en: 'Compare', fr: 'Comparer', ko: '비교' })}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <View style={styles.avatarStage}>
          <Image source={{ uri: DR_TOXI_DEFAULT_AVATAR_URI }} style={styles.avatar} contentFit="contain" transition={200} />
        </View>

        <Text style={styles.title}>
          {pick({ en: 'Scan the 2nd product', fr: 'Photographie le 2ᵉ produit', ko: '두 번째 제품을 스캔하세요' })}
        </Text>
        <Text style={styles.subtitle}>
          {baseProduct
            ? pick({ en: 'Compare it with', fr: 'Pour le comparer avec', ko: '비교 대상:' }) + ` « ${baseProduct.name} »`
            : pick({ en: 'It will be compared with the first product', fr: 'Il sera comparé au premier produit', ko: '첫 번째 제품과 비교됩니다' })}
        </Text>

        {isLoading ? (
          <View style={styles.loadingCard} testID="compare-scan-loading">
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>
              {pick({ en: 'Analysing the 2nd product…', fr: 'Analyse du 2ᵉ produit…', ko: '두 번째 제품을 분석하는 중…' })}
            </Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleScan}
              activeOpacity={0.85}
              testID="compare-scan-camera"
            >
              <Camera color="#FFFFFF" size={20} />
              <Text style={styles.primaryButtonText}>
                {pick({ en: 'Photograph the 2nd product', fr: 'Photographier le 2ᵉ produit', ko: '두 번째 제품 촬영하기' })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                void launchGallery();
              }}
              activeOpacity={0.8}
              testID="compare-scan-gallery"
            >
              <Images color={Colors.text} size={18} />
              <Text style={styles.secondaryButtonText}>{t('gallery')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAF8',
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
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.2 },
  headerSpacer: { width: 42 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 40 },
  avatarStage: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  avatar: { width: 82, height: 82 },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  actions: { width: '100%', gap: 12 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' as const, letterSpacing: -0.1 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: Colors.surface,
    paddingVertical: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: { color: Colors.text, fontSize: 15, fontWeight: '700' as const, letterSpacing: -0.1 },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  loadingText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' as const },
});
