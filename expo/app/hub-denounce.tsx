import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { X, ShieldAlert, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { pick } from '@/utils/i18n';
import { useHub } from '@/providers/HubProvider';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useMeals } from '@/providers/MealHistoryProvider';
import { HubModerationError, buildPortableScanImage, type HubVerdictLevel, type HubScanKind } from '@/utils/hubApi';
import { hubVerdictColor, hubVerdictLabel, moderationMessage } from '@/utils/hubUi';
import type { ScannedProduct } from '@/types';
import { verdictTierFromProduct } from '@/utils/api';
import type { MealTier } from '@/utils/mealAnalysis';

/** 6-tier product verdict → Hub verdict level (stored tier first, riskGroup fallback). */
function productToVerdict(product: ScannedProduct): HubVerdictLevel {
  switch (verdictTierFromProduct(product)) {
    case 'ultra_toxic': return 'ultratoxic';
    case 'carcinogenic': return 'danger';
    case 'toxic': return 'toxic';
    case 'processed': return 'warning';
    case 'moderation': return 'moderation';
    default: return 'approuve';
  }
}

function tierToVerdict(tier: MealTier): HubVerdictLevel {
  switch (tier) {
    case 'red': return 'danger';
    case 'orange': return 'warning';
    case 'yellow': return 'moderation';
    default: return 'approuve';
  }
}

export default function HubDenounceScreen() {
  const { scanKind, refId } = useLocalSearchParams<{ scanKind?: string; refId?: string }>();
  const kind = (scanKind === 'meal' ? 'meal' : 'product') as HubScanKind;
  const { pseudo, createPost, isPosting } = useHub();
  const { history } = useScanHistory();
  const { getMeal } = useMeals();

  const [note, setNote] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(true);

  // Resolve the scanned record into a portable denunciation preview.
  // Image candidates are ordered BEST-QUALITY FIRST: the original scan photo, then a
  // remote URL, and only as a last resort the tiny 120px history thumbnail.
  const preview = useMemo(() => {
    if (kind === 'meal') {
      const meal = typeof refId === 'string' ? getMeal(refId) : undefined;
      if (!meal) return null;
      return {
        productName: meal.dishName,
        verdictLevel: tierToVerdict(meal.tier),
        imageCandidates: [meal.photoUri, meal.thumbnailUri] as (string | null | undefined)[],
      };
    }
    const product = history.find((p) => p.barcode === refId);
    if (!product) return null;
    return {
      productName: product.name,
      verdictLevel: productToVerdict(product),
      imageCandidates: [product.photoUri, product.imageUrl, product.thumbnailBase64] as (string | null | undefined)[],
    };
  }, [kind, refId, history, getMeal]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setImageLoading(true);
      const portable = await buildPortableScanImage(preview?.imageCandidates ?? null);
      if (!cancelled) {
        setImageUrl(portable);
        setImageLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [preview?.imageCandidates]);

  const verdictColor = hubVerdictColor(preview?.verdictLevel ?? null);

  const handlePublish = useCallback(async () => {
    if (!preview || isPosting) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await createPost({
        kind: 'denunciation',
        title: null,
        body: note.trim(),
        productName: preview.productName,
        verdictLevel: preview.verdictLevel,
        verdictLabel: hubVerdictLabel(preview.verdictLevel),
        imageUrl,
        scanKind: kind,
      });
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/hub');
    } catch (e) {
      if (e instanceof HubModerationError) {
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          pick({ en: 'Denunciation not published', fr: 'Dénonciation non publiée', ko: '고발이 게시되지 않음' }),
          moderationMessage(e.category),
        );
      } else {
        Alert.alert(
          pick({ en: 'Something went wrong', fr: "Une erreur s'est produite", ko: '오류가 발생했습니다' }),
          pick({ en: 'Please check your connection and try again.', fr: 'Vérifie ta connexion et réessaie.', ko: '연결을 확인하고 다시 시도해 주세요.' }),
        );
      }
    }
  }, [preview, isPosting, createPost, note, imageUrl, kind]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} hitSlop={10} testID="denounce-close">
          <X color={Colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pick({ en: 'Denounce', fr: 'Dénoncer', ko: '고발하기' })}</Text>
        <TouchableOpacity
          style={[styles.publishButton, (!preview || isPosting) && styles.publishButtonDisabled]}
          onPress={handlePublish}
          disabled={!preview || isPosting}
          activeOpacity={0.85}
          testID="denounce-publish"
        >
          {isPosting ? <ActivityIndicator color={Colors.white} size="small" /> : (
            <Text style={styles.publishText}>{pick({ en: 'Publish', fr: 'Publier', ko: '게시' })}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!preview ? (
            <View style={styles.missing}>
              <Text style={styles.missingText}>
                {pick({ en: 'This scan is no longer available to denounce.', fr: "Ce scan n'est plus disponible pour la dénonciation.", ko: '이 스캔은 더 이상 고발할 수 없습니다.' })}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.intro}>
                <ShieldAlert color={verdictColor} size={18} strokeWidth={2.4} />
                <Text style={styles.introText}>
                  {pick({
                    en: 'Alert the community about this product. The photo and verdict are filled in automatically.',
                    fr: "Alerte la communauté sur ce produit. La photo et le verdict sont remplis automatiquement.",
                    ko: '이 제품에 대해 커뮤니티에 알리세요. 사진과 판정은 자동으로 채워집니다.',
                  })}
                </Text>
              </View>

              {/* Pre-filled scan card */}
              <View style={styles.previewCard}>
                <View style={styles.previewImageWrap}>
                  {imageLoading ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.previewImage} contentFit="cover" />
                  ) : (
                    <ShieldAlert color={Colors.textTertiary} size={28} />
                  )}
                </View>
                <View style={styles.previewInfo}>
                  <View style={[styles.verdictPill, { backgroundColor: verdictColor }]}>
                    <Text style={styles.verdictPillText}>{hubVerdictLabel(preview.verdictLevel)}</Text>
                  </View>
                  <Text style={styles.previewName} numberOfLines={2}>{preview.productName}</Text>
                  <Text style={styles.previewKind}>
                    {kind === 'meal' ? pick({ en: 'Scanned meal', fr: 'Repas scanné', ko: '스캔한 식사' }) : pick({ en: 'Scanned product', fr: 'Produit scanné', ko: '스캔한 제품' })}
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>{pick({ en: 'Add a word (optional)', fr: 'Ajoute un mot (optionnel)', ko: '한마디 추가 (선택)' })}</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder={pick({
                  en: 'Why are you denouncing this product?',
                  fr: 'Pourquoi dénonces-tu ce produit ?',
                  ko: '이 제품을 고발하는 이유는 무엇인가요?',
                })}
                placeholderTextColor={Colors.textTertiary}
                multiline
                maxLength={2000}
                textAlignVertical="top"
                testID="denounce-note"
              />

              <View style={styles.identityRow}>
                <Text style={styles.identityText}>
                  {pick({ en: 'Posting as', fr: 'Tu publies en tant que', ko: '게시자' })} <Text style={styles.identityName}>{pseudo}</Text>
                </Text>
              </View>

              <View style={styles.moderationNote}>
                <Sparkles color={Colors.textTertiary} size={14} />
                <Text style={styles.moderationNoteText}>
                  {pick({
                    en: 'Checked by AI before going live to keep the Hub respectful and safe.',
                    fr: "Vérifié par l'IA avant publication pour garder le Hub respectueux et sûr.",
                    ko: 'Hub를 안전하게 유지하기 위해 게시 전 AI가 검토합니다.',
                  })}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary },
  headerTitle: { fontSize: 16, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.2 },
  publishButton: { minWidth: 84, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  publishButtonDisabled: { opacity: 0.4 },
  publishText: { color: Colors.white, fontSize: 15, fontWeight: '800' as const, letterSpacing: -0.2 },
  content: { padding: 20, paddingBottom: 40 },
  missing: { paddingVertical: 60, alignItems: 'center' },
  missingText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  intro: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
  introText: { flex: 1, fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  previewCard: { flexDirection: 'row', gap: 14, backgroundColor: Colors.surface, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: Colors.border },
  previewImageWrap: { width: 84, height: 84, borderRadius: 14, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  previewInfo: { flex: 1, justifyContent: 'center', gap: 6 },
  verdictPill: { alignSelf: 'flex-start', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3.5 },
  verdictPillText: { fontSize: 10.5, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: 0.5 },
  previewName: { fontSize: 16, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3 },
  previewKind: { fontSize: 12.5, color: Colors.textTertiary, fontWeight: '600' as const },
  label: { fontSize: 13, fontWeight: '800' as const, color: Colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: 24, marginBottom: 10 },
  noteInput: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 14, fontSize: 15.5, lineHeight: 22, color: Colors.text, minHeight: 110 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 },
  identityText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' as const },
  identityName: { color: Colors.primary, fontWeight: '800' as const },
  moderationNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16, backgroundColor: Colors.surfaceSecondary, borderRadius: 14, padding: 14 },
  moderationNoteText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: Colors.textSecondary },
});
