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
import { niveauRisqueToGroup } from '@/constants/additives';
import { aiGenerateObject } from '@/utils/aiApi';
import { renderIngredientsDatabaseForPrompt } from '@/constants/ingredientsDatabase';
import { z } from 'zod';
import { t, isEnglish } from '@/utils/i18n';
import type { ScannedProduct, RiskGroup, SubstanceDetected } from '@/types';

const RISK_VALUES = ['danger', 'probable', 'possible', 'aucun'] as const;

const barcodeAnalysisSchema = z.object({
  objet_identifie: z.string(),
  badge_global: z.enum(RISK_VALUES),
  resume: z.string(),
  substances_detectees: z.array(
    z.object({
      nom: z.string(),
      code: z.string().nullable(),
      classification_circ: z.string(),
      niveau_risque: z.enum(RISK_VALUES),
      explication: z.string().nullable(),
    })
  ),
  recommandations: z.array(z.string()),
  alternatives_saines: z
    .array(z.object({ nom: z.string(), raison: z.string() }))
    .optional(),
});

const INGREDIENTS_DB = renderIngredientsDatabaseForPrompt();

async function analyzeBarcodeIngredients(
  productName: string,
  brand: string,
  ingredientsText: string,
  ingredientsList: string[]
): Promise<z.infer<typeof barcodeAnalysisSchema>> {
  const en = isEnglish();
  const system = en
    ? `You are Dr. Toxi. Analyze a product based on its ingredient list from Open Food Facts.

═══ INGREDIENT DATABASE ═══
${INGREDIENTS_DB}

CRITICAL RULES:
1. EXHAUSTIVENESS: substances_detectees MUST contain ONE entry for EVERY ingredient in the list, from FIRST to LAST. If 15 ingredients → 15 entries. If 8 → 8.
2. Healthy ingredients (water, salt, flour, milk, eggs, etc.) get niveau_risque="aucun" with classification_circ="Natural" and a short explanation "Natural ingredient, no identified risk."
3. SORT: danger → probable → possible → aucun.
4. Each problematic ingredient gets a 3-5 sentence pedagogical explanation.
5. Match each ingredient against the database above. If not found → "aucun".
6. badge_global = highest level (1+ danger=danger; 2+ probable OR 1 red=probable; 2-3 yellow=possible; else=aucun).
7. Resume: 3-4 sentences, friendly, factual, non-alarmist.`
    : `Tu es Dr. Toxi. Analyse un produit à partir de sa liste d'ingrédients fournie par Open Food Facts.

═══ BASE DE DONNÉES INGRÉDIENTS ═══
${INGREDIENTS_DB}

RÈGLES CRITIQUES :
1. EXHAUSTIVITÉ : substances_detectees DOIT contenir UNE entrée par ingrédient, du PREMIER au DERNIER. 15 ingrédients → 15 entrées. 8 → 8.
2. Les ingrédients sains (eau, sel, farine, lait, œufs, etc.) reçoivent niveau_risque="aucun", classification_circ="Naturel" et explication courte "Ingrédient naturel sans risque identifié."
3. TRI : danger → probable → possible → aucun.
4. Chaque ingrédient problématique reçoit une explication pédagogique de 3 à 5 phrases.
5. Compare chaque ingrédient à la base ci-dessus. Si non trouvé → "aucun".
6. badge_global = plus haut niveau (1+ danger=danger ; 2+ probable OU 1 rouge=probable ; 2-3 jaunes=possible ; sinon=aucun).
7. Resume : 3-4 phrases, bienveillant, factuel, non-alarmiste.`;

  const userText = en
    ? `Product: ${productName}\nBrand: ${brand}\nFull ingredients: ${ingredientsText}\n\nIngredient list (parsed, ${ingredientsList.length} items):\n${ingredientsList.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\nReturn ONE JSON entry per ingredient above. substances_detectees.length MUST equal ${ingredientsList.length}.`
    : `Produit : ${productName}\nMarque : ${brand}\nIngrédients complets : ${ingredientsText}\n\nListe d'ingrédients (parsée, ${ingredientsList.length} éléments) :\n${ingredientsList.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\nRetourne UNE entrée JSON par ingrédient ci-dessus. substances_detectees.length DOIT être égal à ${ingredientsList.length}.`;

  return aiGenerateObject({
    system,
    messages: [{ role: 'user', content: [{ type: 'text', text: userText }] }],
    schema: barcodeAnalysisSchema,
    toolName: 'record_barcode_analysis',
    toolDescription: en ? 'Record barcode product analysis' : 'Enregistre l\'analyse du produit scanné par code-barres',
    maxTokens: 3500,
  });
}

export default function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { addProduct } = useScanHistory();
  const { recordScan } = useBadges();
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
      const off = await lookupBarcode(barcode);
      if (!off.found || !off.product) {
        throw new Error('NOT_FOUND');
      }
      const p = off.product;
      const ingredientsList = off.ingredientsList;
      console.log('[BarcodeScanner] OFF found:', p.product_name, 'ingredients:', ingredientsList.length);

      let analysis: z.infer<typeof barcodeAnalysisSchema> | null = null;
      if (ingredientsList.length > 0) {
        try {
          analysis = await analyzeBarcodeIngredients(
            p.product_name || 'Unknown',
            p.brands || '',
            p.ingredients_text || ingredientsList.join(', '),
            ingredientsList
          );
          console.log('[BarcodeScanner] AI analysis done, substances:', analysis.substances_detectees.length);
        } catch (e) {
          console.warn('[BarcodeScanner] AI analysis failed:', e);
        }
      }

      const substances: SubstanceDetected[] = analysis?.substances_detectees ?? ingredientsList.map((nom) => ({
        nom,
        code: null,
        classification_circ: isEnglish() ? 'Not classified by IARC' : 'Non classé par le CIRC',
        niveau_risque: 'aucun' as const,
        explication: isEnglish() ? 'Natural ingredient, no identified risk.' : 'Ingrédient naturel sans risque identifié.',
        source_exposition: null,
      }));

      const badgeGlobal = analysis?.badge_global ?? 'aucun';
      let riskGroup: RiskGroup = niveauRisqueToGroup(badgeGlobal);
      const detectedAdditives = substances
        .filter((s) => s.niveau_risque !== 'aucun')
        .map((s) => ({
          code: s.code ?? s.nom,
          name: s.nom,
          group: niveauRisqueToGroup(s.niveau_risque),
          description: s.explication ?? '',
        }));
      if (riskGroup === 'none' && detectedAdditives.length > 0) {
        const groupPriority: Record<RiskGroup, number> = { group1: 3, group2a: 2, group2b: 1, none: 0 };
        riskGroup = detectedAdditives.reduce<RiskGroup>(
          (max, a) => (groupPriority[a.group] > groupPriority[max] ? a.group : max),
          'none'
        );
      }

      const product: ScannedProduct = {
        barcode,
        name: analysis?.objet_identifie || p.product_name || 'Unknown',
        brand: p.brands || '',
        imageUrl: p.image_url,
        riskGroup,
        detectedAdditives,
        scannedAt: new Date().toISOString(),
        categories: p.categories || 'food',
        ingredientsText: p.ingredients_text || ingredientsList.join(', '),
        scanMethod: 'barcode',
        detectedIngredients: substances.map((s) => ({
          nom: s.nom,
          code: s.code,
          classification_circ: s.classification_circ,
          niveau_risque: s.niveau_risque,
          explication: s.explication,
        })),
        analysisSummary: analysis?.resume ?? '',
        objectIdentified: analysis?.objet_identifie ?? p.product_name ?? '',
        substances,
        recommendations: analysis?.recommandations ?? [],
        saferAlternatives: [],
        healthyAlternatives: analysis?.alternatives_saines ?? [],
        nutriScore: p.nutriscore_grade ? p.nutriscore_grade.toUpperCase() : undefined,
        novaGroup: p.nova_group ?? undefined,
        offSource: off.source ?? undefined,
      };
      return product;
    },
    onSuccess: (product) => {
      console.log('[BarcodeScanner] Lookup success:', product.name);
      addProduct(product);
      recordScan(product.riskGroup === 'none');
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace(`/product/${product.barcode}`);
    },
    onError: (err: Error) => {
      console.error('[BarcodeScanner] Lookup error:', err.message);
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
      scannedRef.current = true;
      setScannedCode(cleaned);
      console.log('[BarcodeScanner] Barcode scanned:', cleaned);
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      lookupMutation.mutate(cleaned);
    },
    [lookupMutation]
  );

  const handleManualEntry = useCallback(() => {
    if (Platform.OS === 'web') {
      const value = window.prompt(isEnglish() ? 'Enter barcode (EAN-13, UPC...)' : 'Saisis le code-barres (EAN-13, UPC...)');
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
  permissionContainer: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
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
  permissionTitle: { fontSize: 22, fontWeight: '700' as const, color: '#1A1C1E', letterSpacing: -0.4 },
  permissionText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  permissionButton: {
    marginTop: 16,
    backgroundColor: '#2E9E34',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
  },
  permissionButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' as const },
  permissionCancel: { marginTop: 8, padding: 12 },
  permissionCancelText: { color: '#6B7280', fontSize: 14, fontWeight: '500' as const },
});
