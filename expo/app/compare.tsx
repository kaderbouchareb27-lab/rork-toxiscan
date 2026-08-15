import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Camera, Shield, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import type { ScannedProduct } from '@/types';
import { getCategoryLabel } from '@/utils/api';
import {
  computeComparison,
  deterministicVerdict,
  generateComparisonVerdict,
  type CompareVerdictLevel,
  type CompareIngredientLevel,
  type ComparisonSide,
} from '@/utils/productComparison';
import { pick } from '@/utils/i18n';
import { DR_TOXI_DEFAULT_AVATAR_URI, getDrToxiBadgeAvatarForVerdict } from '@/constants/drToxiAvatars';
import Colors from '@/constants/colors';

// ─────────────────────────────────────────────────────────────
// Couleur + libellé du badge, alignés sur l'écran résultat.
// ─────────────────────────────────────────────────────────────
function verdictAccentColor(level: CompareVerdictLevel, isCosmetic: boolean): string {
  if (isCosmetic) {
    switch (level) {
      case 'danger':
      case 'ultratoxic': return '#7C3AED';
      case 'warning':
      case 'moderation': return '#EAB308';
      default: return '#2E9E34';
    }
  }
  switch (level) {
    case 'danger': return '#D0260F';
    case 'ultratoxic': return '#722F37';
    case 'warning': return '#E8730A';
    case 'moderation': return '#EAB308';
    default: return '#2E9E34';
  }
}

function verdictLabel(level: CompareVerdictLevel, isCosmetic: boolean): string {
  if (isCosmetic) {
    switch (level) {
      case 'danger':
      case 'ultratoxic': return pick({ en: 'Toxic', fr: 'Toxique', ko: '독성' });
      case 'warning':
      case 'moderation': return pick({ en: 'Disputed', fr: 'Contesté', ko: '논란 있음' });
      default: return pick({ en: 'Approved', fr: 'Approuvé', ko: '승인됨' });
    }
  }
  switch (level) {
    case 'danger': return pick({ en: 'Carcinogenic', fr: 'Cancérigène', ko: '발암성' });
    case 'ultratoxic': return pick({ en: 'Ultra toxic', fr: 'Ultra toxique', ko: '초독성' });
    case 'warning': return pick({ en: 'Processed', fr: 'Transformé', ko: '가공됨' });
    case 'moderation': return pick({ en: 'Occasional', fr: 'Occasionnel', ko: '가끔' });
    default: return pick({ en: 'Healthy', fr: 'Sain', ko: '건강함' });
  }
}

function ingredientColor(level: CompareIngredientLevel, isCosmetic: boolean): string {
  if (isCosmetic) {
    switch (level) {
      case 'danger':
      case 'ultratoxic': return '#7C3AED';
      case 'probable':
      case 'possible': return '#EAB308';
      default: return '#2E9E34';
    }
  }
  switch (level) {
    case 'danger': return '#D0260F';
    case 'ultratoxic': return '#722F37';
    case 'probable': return '#E8730A';
    case 'possible': return '#EAB308';
    default: return '#2E9E34';
  }
}

function ingredientBadgeLabel(level: CompareIngredientLevel): string {
  switch (level) {
    case 'danger': return pick({ en: 'CARCINOGENIC', fr: 'CANCÉRIGÈNE', ko: '발암성' });
    case 'ultratoxic': return pick({ en: 'ULTRA TOXIC', fr: 'ULTRA TOXIQUE', ko: '초독성' });
    case 'probable': return pick({ en: 'PROCESSED', fr: 'TRANSFORMÉ', ko: '가공' });
    case 'possible': return pick({ en: 'OCCASIONAL', fr: 'OCCASIONNEL', ko: '주의' });
    default: return pick({ en: 'APPROVED', fr: 'APPROUVÉ', ko: '승인' });
  }
}

function productImageUri(p: ScannedProduct): string | null {
  if (p.scanMethod === 'photo') return p.thumbnailBase64 ?? p.photoUri ?? null;
  return p.imageUrl ?? null;
}

function truncate(name: string, max: number): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

/** Carte produit compacte : image + nom + badge + ToxiScore. */
function ProductCard({
  side,
  isWinner,
  sideBySide,
}: {
  side: ComparisonSide;
  isWinner: boolean;
  sideBySide: boolean;
}) {
  const { product, verdictLevel, toxiScore, isCosmetic } = side;
  const accent = verdictAccentColor(verdictLevel, isCosmetic);
  const label = verdictLabel(verdictLevel, isCosmetic);
  const imageUri = productImageUri(product);
  const category = getCategoryLabel(product.productCategory ?? 'food');

  return (
    <View
      style={[
        styles.productCard,
        { borderColor: isWinner ? Colors.primary : accent + '44' },
        sideBySide && styles.productCardWide,
      ]}
      testID={`compare-card-${isWinner ? 'winner' : 'loser'}`}
    >
      {isWinner ? (
        <View style={styles.winnerPill}>
          <Check color="#FFFFFF" size={12} strokeWidth={3.2} />
          <Text style={styles.winnerPillText}>
            {pick({ en: 'Best choice', fr: 'Meilleur choix', ko: '최고의 선택' })}
          </Text>
        </View>
      ) : null}

      <View style={styles.productImageFrame}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.productImage} contentFit={side.product.scanMethod === 'photo' ? 'cover' : 'contain'} />
        ) : (
          <View style={styles.imagePlaceholder}>
            {side.product.scanMethod === 'photo'
              ? <Camera color={Colors.textTertiary} size={26} />
              : <Shield color={Colors.textTertiary} size={26} />}
          </View>
        )}
      </View>

      <View style={styles.productMeta}>
        <Text style={styles.categoryTag}>{category}</Text>
        <Text style={styles.productName} numberOfLines={2}>{truncate(product.name, 48)}</Text>
        {product.brand && product.brand !== category ? (
          <Text style={styles.productBrand} numberOfLines={1}>{product.brand}</Text>
        ) : null}
        <View style={[styles.badgeChip, { backgroundColor: accent }]}>
          <Text style={styles.badgeChipText} numberOfLines={1}>{label}</Text>
        </View>

        {product.analysisPending === true ? (
          <View style={styles.analyzingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.analyzingText}>
              {pick({ en: 'Analysing…', fr: 'Analyse en cours…', ko: '분석 중…' })}
            </Text>
          </View>
        ) : null}

        <View style={[styles.scoreBlock, { backgroundColor: accent }]}>
          <View style={styles.scoreTopRow}>
            <Text style={styles.scoreLabel}>ToxiScore</Text>
            <View style={styles.scoreValueRow}>
              <Text style={styles.scoreValue}>{toxiScore}</Text>
              <Text style={styles.scoreOutOf}>/10</Text>
            </View>
          </View>
          <View style={styles.scoreTrack}>
            <View style={[styles.scoreFill, { width: `${Math.max(0, Math.min(10, toxiScore)) * 10}%` }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CompareScreen() {
  const { A, B } = useLocalSearchParams<{ A: string; B: string }>();
  const { history } = useScanHistory();
  const { width } = useWindowDimensions();
  const sideBySide = width >= 520;

  const productA = useMemo(() => history.find((p) => p.barcode === A), [history, A]);
  const productB = useMemo(() => history.find((p) => p.barcode === B), [history, B]);

  const comparison = useMemo(
    () => (productA && productB ? computeComparison(productA, productB) : null),
    [productA, productB],
  );

  const fallbackVerdict = useMemo(
    () => (productA && productB && comparison ? deterministicVerdict(productA, productB, comparison) : null),
    [productA, productB, comparison],
  );

  // La phrase IA n'est demandée qu'UNE fois, quand les deux produits sont prêts.
  const [aiVerdictText, setAiVerdictText] = useState<string | null>(null);
  const aiFiredRef = useRef<boolean>(false);
  const bothReady = productA && productB
    && productA.analysisPending !== true
    && productB.analysisPending !== true;

  useEffect(() => {
    if (!bothReady || !comparison || aiFiredRef.current) return;
    aiFiredRef.current = true;
    generateComparisonVerdict(productA, productB, comparison)
      .then((v) => setAiVerdictText(v.verdict))
      .catch(() => {});
  }, [bothReady, comparison, productA, productB]);

  if (!productA || !productB || !comparison) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.backButton}
          >
            <ChevronLeft color={Colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{pick({ en: 'Comparison', fr: 'Comparaison', ko: '비교' })}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyState}>
          <Shield color={Colors.textTertiary} size={44} strokeWidth={1.2} />
          <Text style={styles.emptyText}>
            {pick({ en: 'Products not found', fr: 'Produits introuvables', ko: '제품을 찾을 수 없음' })}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const verdictText = aiVerdictText ?? fallbackVerdict?.verdict ?? '';
  const winner = fallbackVerdict?.winner ?? 'tie';
  const winnerAvatarLevel: CompareVerdictLevel = winner === 'A'
    ? comparison.sideA.verdictLevel
    : winner === 'B'
      ? comparison.sideB.verdictLevel
      : 'approuve';
  const winnerAvatar = winner === 'tie'
    ? DR_TOXI_DEFAULT_AVATAR_URI
    : getDrToxiBadgeAvatarForVerdict(winnerAvatarLevel) ?? DR_TOXI_DEFAULT_AVATAR_URI;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
          testID="compare-back"
        >
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pick({ en: 'Comparison', fr: 'Comparaison', ko: '비교' })}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ─── Verdict Dr. Toxi ─── */}
        <View style={styles.verdictCard} testID="compare-verdict">
          <View style={styles.verdictHeaderRow}>
            <View style={styles.verdictAvatarBubble}>
              <Image source={winnerAvatar} style={styles.verdictAvatar} contentFit="contain" transition={200} />
            </View>
            <View style={styles.verdictHeaderText}>
              <Text style={styles.verdictEyebrow}>
                {pick({ en: 'DR. TOXI VERDICT', fr: 'VERDICT DR. TOXI', ko: 'DR. TOXI 판정' })}
              </Text>
              {winner === 'tie' ? (
                <Text style={styles.verdictTitle}>
                  {pick({ en: 'Tie', fr: 'Égalité', ko: '무승부' })}
                </Text>
              ) : (
                <Text style={styles.verdictTitle} numberOfLines={2}>
                  {truncate(winner === 'A' ? productA.name : productB.name, 30)}
                </Text>
              )}
            </View>
          </View>
          {!bothReady ? (
            <View style={styles.verdictAnalyzing}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.verdictAnalyzingText}>
                {pick({ en: 'Dr. Toxi is finishing the comparison…', fr: 'Dr. Toxi termine la comparaison…', ko: 'Dr. Toxi가 비교를 마무리하고 있어요…' })}
              </Text>
            </View>
          ) : null}
          <Text style={styles.verdictSentence}>{verdictText}</Text>
        </View>

        {/* ─── Deux cartes ─── */}
        <View style={[styles.cardsRow, sideBySide ? styles.cardsRowWide : styles.cardsRowStacked]}>
          <ProductCard side={comparison.sideA} isWinner={winner === 'A'} sideBySide={sideBySide} />
          <ProductCard side={comparison.sideB} isWinner={winner === 'B'} sideBySide={sideBySide} />
        </View>

        {/* ─── Différences clés ─── */}
        <View style={styles.diffSection}>
          <Text style={styles.sectionTitle}>
            {pick({ en: 'Key differences', fr: 'Différences clés', ko: '주요 차이점' })}
          </Text>
          {comparison.differences.length > 0 ? (
            <View style={styles.diffCard}>
              {comparison.differences.map((diff, index) => {
                const color = ingredientColor(diff.level, comparison.sideA.isCosmetic);
                const otherName = diff.side === 'A' ? productB.name : productA.name;
                return (
                  <View key={`diff-${index}`} style={[styles.diffItem, { borderLeftColor: color }]}>
                    <View style={styles.diffRow}>
                      <View style={[styles.diffDot, { backgroundColor: color }]} />
                      <Text style={styles.diffName} numberOfLines={2}>{diff.name}</Text>
                      <View style={[styles.diffBadge, { backgroundColor: color }]}>
                        <Text style={styles.diffBadgeText} numberOfLines={1}>{ingredientBadgeLabel(diff.level)}</Text>
                      </View>
                    </View>
                    <Text style={styles.diffNote}>
                      {pick({ en: 'Only in', fr: 'Uniquement dans', ko: '여기에만 있음' })} « {truncate(otherName, 34)} »
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.diffCard}>
              <Text style={styles.diffEmpty}>
                {pick({ en: 'Same problematic ingredients in both products.', fr: 'Mêmes ingrédients problématiques dans les deux produits.', ko: '두 제품 모두 같은 문제 성분을 포함하고 있습니다.' })}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingBottom: 80 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' as const },

  // ── Verdict ──
  verdictCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  verdictHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 12 },
  verdictAvatarBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  verdictAvatar: { width: 48, height: 48 },
  verdictHeaderText: { flex: 1 },
  verdictEyebrow: { fontSize: 11, fontWeight: '900' as const, color: Colors.textTertiary, letterSpacing: 1.2, marginBottom: 3 },
  verdictTitle: { fontSize: 19, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3 },
  verdictAnalyzing: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: Colors.primaryLight, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 10 },
  verdictAnalyzingText: { flex: 1, fontSize: 12.5, fontWeight: '700' as const, color: Colors.primaryDark, lineHeight: 17 },
  verdictSentence: { fontSize: 15, color: Colors.textSecondary, lineHeight: 21, fontWeight: '600' as const },

  // ── Cartes ──
  cardsRow: {},
  cardsRowWide: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cardsRowStacked: { flexDirection: 'column', gap: 16, marginTop: 16 },
  productCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginTop: 0,
  },
  productCardWide: { flex: 1 },
  winnerPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  winnerPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' as const, letterSpacing: -0.1 },
  productImageFrame: { width: '100%', height: 132, backgroundColor: Colors.surfaceSecondary },
  productImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  productMeta: { padding: 14 },
  categoryTag: { fontSize: 11, fontWeight: '800' as const, color: Colors.textTertiary, letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 4 },
  productName: { fontSize: 16, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.2, lineHeight: 20 },
  productBrand: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 2 },
  badgeChip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  badgeChipText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' as const, letterSpacing: 0.4, textTransform: 'uppercase' as const },
  analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  analyzingText: { fontSize: 12, fontWeight: '700' as const, color: Colors.textSecondary },
  scoreBlock: { marginTop: 14, borderRadius: 16, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 13 },
  scoreTopRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 9 },
  scoreLabel: { fontSize: 11, fontWeight: '900' as const, color: 'rgba(255,255,255,0.82)', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 4 },
  scoreValueRow: { flexDirection: 'row', alignItems: 'flex-end' },
  scoreValue: { fontSize: 36, lineHeight: 38, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: -1.2 },
  scoreOutOf: { fontSize: 14, fontWeight: '800' as const, color: 'rgba(255,255,255,0.72)', marginBottom: 4, marginLeft: 2 },
  scoreTrack: { height: 7, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.18)', overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 4, backgroundColor: '#FFFFFF' },

  // ── Différences ──
  diffSection: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.2, marginBottom: 12 },
  diffCard: { backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  diffItem: { borderLeftWidth: 4, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  diffDot: { width: 9, height: 9, borderRadius: 5 },
  diffName: { flex: 1, fontSize: 14.5, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.1 },
  diffBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  diffBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.3, textTransform: 'uppercase' as const },
  diffNote: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 6, marginLeft: 18 },
  diffEmpty: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, padding: 16 },
  bottomSpacer: { height: 24 },
});
