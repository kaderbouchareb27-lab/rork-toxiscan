import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  Alert,
  Modal,
  Linking,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as RNImage } from 'react-native';
import { ShieldCheck, Camera, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import { analyzeUniversalPhoto, universalResultToScannedProduct } from '@/utils/api';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useBadges } from '@/providers/BadgesProvider';
import { useOnboarding } from '@/providers/OnboardingProvider';
import DailyFact from '@/components/DailyFact';
import DonationBanner from '@/components/DonationBanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LOADING_TIPS = [
  'Le brocoli est l\'aliment anti-cancer #1 selon les chercheurs.',
  'Un contenant en verre est toujours plus sûr que le plastique.',
  'Les nitrites (E250) sont classés cancérogènes avérés par le CIRC.',
  'L\'huile d\'olive extra vierge est anti-inflammatoire naturelle.',
  'Ne chauffez jamais un contenant plastique au micro-ondes.',
  'Les poêles en fonte ou inox sont les plus sûres pour cuisiner.',
  'Lisez toujours la liste d\'ingrédients, pas juste le devant du produit.',
  'Le curcuma est un puissant anti-inflammatoire naturel.',
  'Les colorants azoïques (E102, E110, E129) sont liés à l\'hyperactivité.',
  'Privilégiez les produits avec moins de 5 ingrédients.',
  'Le MSG (E621) est caché sous de nombreux noms : extrait de levure, arôme naturel...',
  'Les bocaux en verre ne libèrent aucune substance dans vos aliments.',
];

function compressImageWeb(uri: string, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = reject;
    img.src = uri;
  });
}

async function compressImageNative(uri: string): Promise<string> {
  try {
    console.log('[Scanner] Compressing native image...');
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    if (manipulated.base64) {
      console.log('[Scanner] Native image compressed successfully, base64 length:', manipulated.base64.length);
      return manipulated.base64;
    }

    console.log('[Scanner] ImageManipulator did not return base64, falling back to file-system');
    const FileSystemLegacy = await import('expo-file-system/legacy');
    const base64 = await FileSystemLegacy.readAsStringAsync(manipulated.uri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
    console.log('[Scanner] Fallback base64 length:', base64.length);
    return base64;
  } catch (error) {
    console.error('[Scanner] Native compression error:', error);
    console.log('[Scanner] Falling back to raw file read...');
    const FileSystemLegacy = await import('expo-file-system/legacy');
    const base64 = await FileSystemLegacy.readAsStringAsync(uri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
    return base64;
  }
}

export default function ScannerScreen() {
  const [showCameraPermissionModal, setShowCameraPermissionModal] = useState<boolean>(false);
  const { addProduct } = useScanHistory();
  const { recordScan } = useBadges();
  const { hasSeenOnboarding, hasAcceptedAIConsent } = useOnboarding();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

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
    }
  }, [hasSeenOnboarding, hasAcceptedAIConsent, fadeAnim]);

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
          base64 = await compressImageNative(imageUri);
          try {
            const thumbResult = await ImageManipulator.manipulateAsync(
              imageUri,
              [{ resize: { width: 120 } }],
              { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
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
        throw new Error('Impossible de traiter la photo. Veuillez réessayer.');
      }

      if (!base64 || base64.length < 100) {
        console.error('[Scanner] Base64 too short or empty:', base64?.length);
        throw new Error('La photo est invalide. Veuillez reprendre la photo.');
      }

      console.log('[Scanner] Sending to API...');
      let result;
      try {
        result = await analyzeUniversalPhoto(base64);
      } catch (apiError) {
        console.error('[Scanner] API call failed:', apiError);
        throw new Error('L\'analyse a échoué. Vérifiez votre connexion et réessayez.');
      }

      if (result.erreur) {
        console.error('[Scanner] API returned error:', result.erreur);
        throw new Error('Impossible d\'analyser ce produit. Veuillez reprendre la photo avec un meilleur éclairage.');
      }

      const product = universalResultToScannedProduct(result, imageUri);
      if (thumbnailBase64) {
        product.thumbnailBase64 = `data:image/jpeg;base64,${thumbnailBase64}`;
      }
      return product;
    },
    onSuccess: (product) => {
      console.log('[Scanner] Analysis success:', product.name, product.riskGroup);
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
        : 'Impossible d\'analyser la photo. Veuillez reprendre la photo et réessayer.';
      Alert.alert(
        'Erreur d\'analyse',
        userMessage,
        [{ text: 'OK' }]
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
      Alert.alert('Erreur', 'Impossible d\'ouvrir la caméra.');
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
          'Accès refusé',
          'Vous avez refusé l\'accès à la caméra. Pour utiliser cette fonctionnalité, activez la caméra dans les réglages de votre appareil.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Ouvrir les réglages', onPress: () => { if (Platform.OS !== 'web') void Linking.openSettings(); } },
          ]
        );
        return;
      }

      setShowCameraPermissionModal(true);
    } catch (error) {
      console.error('[Scanner] Permission check error:', error);
    }
  }, [launchCamera]);

  const handlePermissionAccept = useCallback(async () => {
    setShowCameraPermissionModal(false);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('[Scanner] Permission request result:', status);
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Dr.Toxi a besoin de votre appareil photo. Activez la permission dans les réglages de votre appareil.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Ouvrir les réglages', onPress: () => { if (Platform.OS !== 'web') void Linking.openSettings(); } },
          ]
        );
        return;
      }

      await launchCamera();
    } catch (error) {
      console.error('[Scanner] Permission request error:', error);
    }
  }, [launchCamera]);

  const handleButtonPressIn = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
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

  const [tipIndex, setTipIndex] = useState<number>(0);
  useEffect(() => {
    if (!isLoading) return;
    setTipIndex(Math.floor(Math.random() * LOADING_TIPS.length));
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % LOADING_TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (hasAcceptedAIConsent === null || hasSeenOnboarding === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#34C759" />
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
                <ActivityIndicator size="large" color="#34C759" />
              </View>
              <Text style={styles.loadingTitle}>Analyse en cours</Text>
              <Text style={styles.loadingSubtitle}>Dr. Toxi examine votre produit...</Text>
              <View style={styles.tipContainer}>
                <Sparkles color="#34C759" size={14} />
                <Text style={styles.tipText}>{LOADING_TIPS[tipIndex]}</Text>
              </View>
            </View>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.logoSection}>
              <RNImage
                source={{ uri: 'https://r2-pub.rork.com/generated-images/06796b8c-d8cc-4e27-a58d-3234f15295d7.png' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.subtitle}>Protégez votre santé au quotidien</Text>
            </View>

            <View style={styles.actionSection}>
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={handleTakePhoto}
                  onPressIn={handleButtonPressIn}
                  onPressOut={handleButtonPressOut}
                  activeOpacity={0.85}
                  testID="photo-button"
                >
                  <Camera color="#FFFFFF" size={22} strokeWidth={2} />
                  <Text style={styles.scanButtonText}>Photographier un produit</Text>
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.scanHint}>
                Photographiez la liste d'ingrédients pour un résultat précis
              </Text>
            </View>

            <View style={styles.cardsSection}>
              <DailyFact />
              <DonationBanner />
            </View>
          </ScrollView>
        )}
      </Animated.View>

      <Modal
        visible={showCameraPermissionModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCameraPermissionModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <ShieldCheck color="#34C759" size={40} strokeWidth={1.6} />
            </View>
            <Text style={styles.modalTitle}>Accès à la caméra</Text>
            <Text style={styles.modalDescription}>
              Dr.Toxi utilise votre appareil photo pour analyser tout objet du quotidien et détecter les substances potentiellement cancérigènes.
            </Text>
            <Text style={styles.modalNote}>
              Vos photos ne sont ni stockées ni partagées.
            </Text>
            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={handlePermissionAccept}
              activeOpacity={0.85}
              testID="permission-accept"
            >
              <Text style={styles.modalPrimaryButtonText}>Autoriser la caméra</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => {
                setShowCameraPermissionModal(false);
              }}
              activeOpacity={0.7}
              testID="permission-later"
            >
              <Text style={styles.modalSecondaryButtonText}>Plus tard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 24,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 24,
  },
  logoImage: {
    width: 104,
    height: 104,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center' as const,
  },
  actionSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#34C759',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 20,
    width: SCREEN_WIDTH - 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  scanHint: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 14,
    textAlign: 'center' as const,
    paddingHorizontal: 16,
  },
  cardsSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
  loadingCenterSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingState: {
    alignItems: 'center',
    gap: 12,
  },
  loadingIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1A1A1A',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  tipContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(52, 199, 89, 0.06)',
    borderRadius: 14,
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#1A1A1A',
    lineHeight: 19,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F9ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  modalDescription: {
    fontSize: 15,
    color: '#1A1A1A',
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 8,
  },
  modalNote: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  modalPrimaryButton: {
    width: '100%',
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  modalSecondaryButton: {
    paddingVertical: 10,
  },
  modalSecondaryButtonText: {
    color: '#8E8E93',
    fontSize: 15,
  },
});
