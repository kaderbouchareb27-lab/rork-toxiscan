import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
  ActivityIndicator,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { X, Barcode, Keyboard as KeyboardIcon } from 'lucide-react-native';
import { lookupBarcode } from '@/utils/openFoodFacts';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useBadges } from '@/providers/BadgesProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { niveauRisqueToGroup } from '@/constants/additives';
import { INGREDIENTS_DATABASE, RiskLevel } from '@/constants/ingredientsDatabase';
import { t, isEnglish } from '@/utils/i18n';
import type { ScannedProduct, RiskGroup, SubstanceDetected } from '@/types';

// ═══════════════════════════════════════════════════════════════════════
// LOOKUP DÉTERMINISTE — même logique que api.ts
// L'IA ne classe PLUS rien pour le scan code-barres non plus.
// ═══════════════════════════════════════════════════════════════════════

function normalizeForLookup(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lookupIngredient(name: string) {
  const normalized = normalizeForLookup(name);
  if (!normalized) return null;

  // Recherche exacte d'abord
  for (const entry of INGREDIENTS_DATABASE) {
    for (const kw of entry.keywords) {
      if (normalizeForLookup(kw) === normalized) return entry;
    }
  }

  // Recherche par contenance (le plus long mot-clé matchant gagne)
  let best = null;
  let bestLen = 0;
  for (const entry of INGREDIENTS_DATABASE) {
    for (const kw of entry.keywords) {
      const nkw = normalizeForLookup(kw);
      if (nkw.length < 3) continue;
      if (normalized.includes(nkw) && nkw.length > bestLen) {
        best = entry;
        bestLen = nkw.length;
      }
    }
  }
  return best;
}

/**
 * Calcul du badge global — identique à computeBadgeGlobal dans api.ts
 */
function computeBadge(substances: { niveau_risque: RiskLevel }[]): RiskLevel {
  const dangerCount  = substances.filter(s => s.niveau_risque === 'danger').length;
  const probableCount = substances.filter(s => s.niveau_risque === 'probable').length;
  const possibleCount = substances.filter(s => s.niveau_risque === 'possible').length;
  const aucunCount   = substances.filter(s => s.niveau_risque === 'aucun').length;
  const total = substances.length;

  if (dangerCount >= 1) return 'danger';
  if (probableCount >= 4) return 'probable';
  if (possibleCount >= 7) return 'probable';
  if (probableCount >= 1 && probableCount <= 3) {
    const greenRatio = total > 0 ? aucunCount / total : 0;
    if (greenRatio >= 0.7) return 'possible';
    return 'probable';
  }
  if (possibleCount >= 2) return 'possible';
  return 'aucun';
}

/**
 * Génère un résumé déterministe selon le badge — identique à generateResume dans api.ts
 */
function buildResume(badge: RiskLevel, substances: { niveau_risque: RiskLevel; nom: string }[]): string {
  const en = isEnglish();
  if (badge === 'danger') {
    const names = substances.filter(s => s.niveau_risque === 'danger').slice(0, 2).map(s => s.nom).join(', ');
    return en
      ? `Warning! This product contains ingredient(s) classified as carcinogenic by the WHO (${names}). I strongly advise against regular consumption.`
      : `Attention ! Ce produit contient des ingrédients classés cancérigènes par l'OMS (${names}). Je te déconseille fortement d'en consommer régulièrement.`;
  }
  if (badge === 'probable') {
    return en
      ? `This product contains several controversial or ultra-processed substances. Consume it only occasionally.`
      : `Ce produit contient plusieurs substances controversées ou ultra-transformées. Consomme-le très occasionnellement et cherche une alternative plus naturelle.`;
  }
  if (badge === 'possible') {
    return en
      ? `This product contains a few processed or controversial ingredients. You can consume it occasionally.`
      : `Ce produit contient quelques ingrédients transformés ou controversés. Tu peux en consommer occasionnellement, mais évite d'en faire un aliment du quotidien.`;
  }
  return en
    ? `This product is overall very good. The vast majority of ingredients are natural and healthy.`
    : `Ce produit est globalement très bon. La grande majorité des ingrédients sont naturels et sains.`;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════

export default function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { addProduct } = useScanHistory();
  const { recordScan } = useBadges();
  const { canScan, consumeScan } = useSubscription();
  const scannedRef = useRef<boolean>(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(lineAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(lineAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [lineAnim]);

  const lookupMutation = useMutation({
    mutationFn: async (barcode: string): Promise<ScannedProduct> => {
      console.log('[BarcodeScanner] Looking up barcode:', barcode);

      // 1. Récupération Open Food Facts
      const off = await lookupBarcode(barcode);
      if (!off.found || !off.product) {
        throw new Error('NOT_FOUND');
      }
      const p = off.product;
      const ingredientsList = off.ingredientsList ?? [];
      console.log('[BarcodeScanner] OFF found:', p.product_name, '— ingredients:', ingredientsList.length);

      // 2. CLASSIFICATION DÉTERMINISTE via lookup dans la base
      // Aucun appel IA — la base de données décide des couleurs
      const substances: SubstanceDetected[] = ingredientsList.map((nom) => {
        const entry = lookupIngredient(nom);
        if (entry) {
          console.log('[BarcodeClassify] "' + nom + '" → ' + entry.risk + ' (' + entry.circ + ')');
          return {
            nom,
            code: entry.code,
            classification_circ: entry.circ,
            niveau_risque: entry.risk,
            explication: entry.note
              ?? (isEnglish()
                ? 'Ingredient classified by ToxiScan database.'
                : 'Ingrédient classifié par la base ToxiScan.'),
            source_exposition: null,
          };
        }
        console.log('[BarcodeClassify] "' + nom + '" → NON TROUVÉ → aucun');
        return {
          nom,
          code: null,
          classification_circ: isEnglish() ? 'Not classified by IARC' : 'Non classé par le CIRC',
          niveau_risque: 'aucun' as RiskLevel,
          explication: isEnglish()
            ? 'Natural ingredient, no identified risk.'
            : 'Ingrédient naturel sans risque identifié.',
          source_exposition: null,
        };
      });

      // 3. Tri par gravité (rouge → orange → jaune → vert)
      const riskOrder: Record<RiskLevel, number> = { danger: 0, probable: 1, possible: 2, aucun: 3 };
      substances.sort((a, b) => riskOrder[a.niveau_risque] - riskOrder[b.niveau_risque]);

      // 4. Badge global DÉTERMINISTE
      const badgeGlobal: RiskLevel = computeBadge(substances);
      const riskGroup: RiskGroup = niveauRisqueToGroup(badgeGlobal);
      console.log('[BarcodeScanner] badge_global:', badgeGlobal, '— riskGroup:', riskGroup);

      // 5. Résumé déterministe
      const resume = buildResume(badgeGlobal, substances);

      // 6. Additifs détectés (non-verts seulement)
      const detectedAdditives = substances
        .filter(s => s.niveau_risque !== 'aucun')
        .map(s => ({
          code: s.code ?? s.nom,
          name: s.nom,
          group: niveauRisqueToGroup(s.niveau_risque),
          description: s.explication ?? '',
        }));

      const product: ScannedProduct = {
        barcode,
        name: p.product_name || 'Unknown',
        brand: p.brands || '',
        imageUrl: p.image_url ?? null,
        riskGroup,
        detectedAdditives,
        scannedAt: new Date().toISOString(),
        categories: p.categories || 'food',
        ingredientsText: p.ingredients_text || ingredientsList.join(', '),
        scanMethod: 'barcode',
        detectedIngredients: substances.map(s => ({
          nom: s.nom,
          code: s.code,
          classification_circ: s.classification_circ,
          niveau_risque: s.niveau_risque,
          explication: s.explication,
        })),
        analysisSummary: resume,
        objectIdentified: p.product_name ?? '',
        substances,
        recommendations: [],
        saferAlternatives: [],
        healthyAlternatives: [],
        nutriScore: p.nutriscore_grade ? p.nutriscore_grade.toUpperCase() : undefined,
        novaGroup: p.nova_group ?? undefined,
        offSource: off.source ?? undefined,
      };

      return product;
    },

    onSuccess: (product) => {
      console.log('[BarcodeScanner] Success:', product.name, '— badge:', product.riskGroup);
      addProduct(product);
      consumeScan();
      recordScan(product.riskGroup === 'none');
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace(`/product/${product.barcode}`);
    },

    onError: (err: Error) => {
      console.error('[BarcodeScanner] Error:', err.message);
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      Alert.alert(t('barcode_not_found_title'), t('barcode_not_found_msg'), [
        {
          text: t('ok'),
          onPress: () => {
            scannedRef.current = false;
            setScannedCode(null);
          },
        },
      ]);
    },
  });

  const handleBarcodeScanned = useCallback(
    (data: string) => {
      if (scannedRef.current) return;
      const cleaned = data.replace(/\s/g, '');
      if (!cleaned || cleaned.length < 6) return;
      if (!canScan) {
        scannedRef.current = true;
        console.log('[BarcodeScanner] Daily scan limit reached, showing paywall');
        router.replace('/paywall?source=scan');
        return;
      }
      scannedRef.current = true;
      setScannedCode(cleaned);
      console.log('[BarcodeScanner] Barcode scanned:', cleaned);
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      lookupMutation.mutate(cleaned);
    },
    [lookupMutation, canScan]
  );

  const handleManualEntry = useCallback(() => {
    if (Platform.OS === 'web') {
      const value = window.prompt(
        isEnglish() ? 'Enter barcode (EAN-13, UPC...)' : 'Saisis le code-barres (EAN-13, UPC...)'
      );
      if (value && value.trim().length >= 6) {
        handleBarcodeScanned(value.trim());
      }
      return;
    }
    Alert.prompt?.(
      isEnglish() ? 'Enter barcode' : 'Saisir le code-barres',
      isEnglish() ? 'Type the digits below the barcode' : 'Tape les chiffres sous le code-barres',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('ok'),
          onPress: (val?: string) => {
            if (val && val.trim().length >= 6) handleBarcodeScanned(val.trim());
          },
        },
      ],
      'plain-text',
      '',
      'number-pad'
    );
  }, [handleBarcodeScanned]);

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#2E9E34" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.permissionInner}>
          <View style={styles.permissionIcon}>
            <Barcode color="#2E9E34" size={48} strokeWidth={1.6} />
          </View>
          <Text style={styles.permissionTitle}>
            {isEnglish() ? 'Camera access' : 'Accès à la caméra'}
          </Text>
          <Text style={styles.permissionText}>
            {isEnglish()
              ? 'We need camera access to scan barcodes.'
              : 'Nous avons besoin de la caméra pour scanner les codes-barres.'}
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} testID="grant-camera">
            <Text style={styles.permissionButtonText}>
              {isEnglish() ? 'Grant access' : 'Autoriser'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={styles.permissionCancel}>
            <Text style={styles.permissionCancelText}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const lineTranslate = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-90, 90],
  });

  const isLoading = lookupMutation.isPending;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {Platform.OS !== 'web' ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
          }}
          onBarcodeScanned={(result) => {
            if (!isLoading) handleBarcodeScanned(result.data);
          }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.webBg]} />
      )}

      <View style={styles.overlay} pointerEvents="box-none">
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton} testID="close-scanner">
            <X color="#FFFFFF" size={22} strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{t('scan_barcode')}</Text>
          <View style={styles.closeButtonPlaceholder} />
        </SafeAreaView>

        <View style={styles.centerArea} pointerEvents="none">
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {!isLoading && (
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: lineTranslate }] },
                ]}
              />
            )}
          </View>
          <Text style={styles.hint}>
            {scannedCode
              ? `${t('barcode_scanning')}\n${scannedCode}`
              : t('scan_barcode_hint')}
          </Text>
        </View>

        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          {isLoading ? (
            <View style={styles.loadingPill}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.loadingText}>{t('barcode_scanning')}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={handleManualEntry} style={styles.manualButton} testID="manual-entry">
              <KeyboardIcon color="#FFFFFF" size={18} strokeWidth={2} />
              <Text style={styles.manualText}>
                {isEnglish() ? 'Enter barcode manually' : 'Saisir le code manuellement'}
              </Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webBg: { backgroundColor: '#0E1116' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonPlaceholder: { width: 40, height: 40 },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  centerArea: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  frame: {
    width: 280,
    height: 200,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#2E9E34',
    borderWidth: 4,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 24 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 24 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 24 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 24 },
  scanLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '50%' as unknown as number,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#2E9E34',
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  manualText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(46,158,52,0.95)',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  loadingText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionInner: { paddingHorizontal: 32, alignItems: 'center', gap: 14 },
  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(46,158,52,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1A1C1E',
    letterSpacing: -0.4,
  },
  permissionText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 16,
    backgroundColor: '#2E9E34',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  permissionCancel: { marginTop: 8, padding: 12 },
  permissionCancelText: { color: '#6B7280', fontSize: 14, fontWeight: '500' as const },
});