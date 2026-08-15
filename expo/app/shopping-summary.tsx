import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronLeft, RefreshCw, Flag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useShopping } from '@/providers/ShoppingProvider';
import {
  shoppingDistribution,
  problematicShoppingItems,
  shoppingVerdictColor,
  shoppingVerdictLabel,
  deterministicShoppingComment,
  generateShoppingSummary,
} from '@/utils/shopping';
import type { CompareVerdictLevel } from '@/utils/productComparison';
import { getDrToxiBadgeAvatarForVerdict, DR_TOXI_DEFAULT_AVATAR_URI } from '@/constants/drToxiAvatars';
import { pick, t } from '@/utils/i18n';

function tap() {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Tranche du score global pour la couleur + l'avatar du bandeau. */
function summaryLevel(score: number): CompareVerdictLevel {
  if (score >= 8) return 'approuve';
  if (score >= 5) return 'moderation';
  if (score >= 3) return 'warning';
  return 'danger';
}

function summaryColor(score: number): string {
  if (score >= 8) return '#2E9E34';
  if (score >= 5) return '#EAB308';
  if (score >= 3) return '#E8730A';
  return '#D0260F';
}

export default function ShoppingSummaryScreen() {
  const { items, averageScore, endSession } = useShopping();

  const dist = useMemo(() => shoppingDistribution(items), [items]);
  const problematic = useMemo(() => problematicShoppingItems(items), [items]);

  const fallbackComment = deterministicShoppingComment(dist, averageScore, items.length);
  const [aiComment, setAiComment] = useState<string | null>(null);
  const aiFiredRef = useRef<boolean>(false);

  useEffect(() => {
    if (aiFiredRef.current || items.length === 0) return;
    aiFiredRef.current = true;
    generateShoppingSummary(items)
      .then(({ commentaire }) => setAiComment(commentaire))
      .catch(() => {});
  }, [items]);

  const comment = aiComment ?? fallbackComment;
  const color = summaryColor(averageScore);
  const avatarLevel = summaryLevel(averageScore);
  const avatarUri = getDrToxiBadgeAvatarForVerdict(avatarLevel) ?? DR_TOXI_DEFAULT_AVATAR_URI;

  const handleFinish = () => {
    tap();
    endSession();
    router.replace('/history');
  };

  const distributionChips = [
    { key: 'green', color: '#2E9E34', count: dist.green, label: pick({ en: 'green', fr: 'verts', ko: '초록' }) },
    { key: 'yellow', color: '#EAB308', count: dist.yellow, label: pick({ en: 'yellow', fr: 'jaunes', ko: '노랑' }) },
    { key: 'orange', color: '#E8730A', count: dist.orange, label: pick({ en: 'orange', fr: 'oranges', ko: '주황' }) },
    { key: 'red', color: '#D0260F', count: dist.red, label: pick({ en: 'red', fr: 'rouges', ko: '빨강' }) },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => { tap(); router.back(); }}
          testID="shopping-summary-back"
        >
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {pick({ en: 'Shop summary', fr: 'Bilan des courses', ko: '장보기 요약' })}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Bandeau score global */}
        <View style={[styles.scoreBanner, { backgroundColor: color, shadowColor: color }]}>
          <View style={styles.bannerHeaderRow}>
            <View style={styles.avatarBubble}>
              <Image source={avatarUri} style={styles.avatar} contentFit="contain" transition={200} />
            </View>
            <View style={styles.bannerHeaderText}>
              <Text style={styles.bannerEyebrow}>
                {pick({ en: 'GLOBAL SCORE', fr: 'SCORE GLOBAL', ko: '전체 점수' })}
              </Text>
              <Text style={styles.bannerSub}>
                {items.length} {items.length === 1 ? pick({ en: 'product', fr: 'produit', ko: '개 제품' }) : pick({ en: 'products', fr: 'produits', ko: '개 제품' })}
              </Text>
            </View>
          </View>
          <View style={styles.bannerScoreRow}>
            <Text style={styles.bannerScore}>{averageScore > 0 ? averageScore.toFixed(1) : '–'}</Text>
            <Text style={styles.bannerOutOf}>/10</Text>
          </View>
        </View>

        {/* Répartition */}
        <View style={styles.distributionRow}>
          {distributionChips.map((chip) => (
            <View key={chip.key} style={styles.distributionChip}>
              <View style={[styles.distributionDot, { backgroundColor: chip.color }]} />
              <Text style={styles.distributionCount}>{chip.count}</Text>
              <Text style={styles.distributionLabel}>{chip.label}</Text>
            </View>
          ))}
        </View>

        {/* Points positifs (commentaire Dr. Toxi) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {pick({ en: 'Positives', fr: 'Points positifs', ko: '좋은 점' })}
          </Text>
          <View style={styles.commentCard}>
            <Image source={avatarUri} style={styles.commentAvatar} contentFit="contain" />
            <Text style={styles.commentText}>{comment}</Text>
          </View>
        </View>

        {/* Produits qui font baisser le score */}
        {problematic.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {pick({ en: 'Products lowering your score', fr: 'Produits qui font baisser votre score', ko: '점수를 낮추는 제품' })}
            </Text>
            <View style={styles.problemList}>
              {problematic.map((item) => {
                const itemColor = shoppingVerdictColor(item.verdictLevel, item.isCosmetic);
                const itemLabel = shoppingVerdictLabel(item.verdictLevel, item.isCosmetic);
                return (
                  <View key={item.id} style={styles.problemRow}>
                    <View style={styles.problemInfo}>
                      <Text style={styles.problemName} numberOfLines={2}>{item.name}</Text>
                      <View style={[styles.problemBadge, { backgroundColor: itemColor }]}>
                        <Text style={styles.problemBadgeText}>{itemLabel}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.problemAltButton}
                      onPress={() => {
                        tap();
                        router.push({ pathname: '/shopping-alternative', params: { itemId: item.id, mode: 'replace' } });
                      }}
                      activeOpacity={0.85}
                      testID={`shopping-summary-alt-${item.id}`}
                    >
                      <RefreshCw color={Colors.primary} size={14} />
                      <Text style={styles.problemAltText}>
                        {pick({ en: 'Alternative', fr: 'Alternative', ko: '대안' })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinish} activeOpacity={0.85} testID="shopping-summary-finish">
          <Flag color="#FFFFFF" size={18} />
          <Text style={styles.finishButtonText}>
            {pick({ en: 'Finish', fr: 'Terminer', ko: '완료' })}
          </Text>
        </TouchableOpacity>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

  scoreBanner: {
    borderRadius: 26,
    padding: 22,
    marginTop: 4,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 7,
  },
  bannerHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16 },
  avatarBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
  },
  avatar: { width: 54, height: 54 },
  bannerHeaderText: { flex: 1 },
  bannerEyebrow: { fontSize: 11, fontWeight: '900' as const, color: 'rgba(255,255,255,0.76)', letterSpacing: 1.2, marginBottom: 3 },
  bannerSub: { fontSize: 14, fontWeight: '700' as const, color: 'rgba(255,255,255,0.9)' },
  bannerScoreRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end' },
  bannerScore: { fontSize: 56, lineHeight: 58, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: -1.6 },
  bannerOutOf: { fontSize: 19, fontWeight: '800' as const, color: 'rgba(255,255,255,0.72)', marginBottom: 7, marginLeft: 3 },

  distributionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  distributionChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  distributionDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  distributionCount: { fontSize: 22, fontWeight: '900' as const, color: Colors.text },
  distributionLabel: { fontSize: 11, fontWeight: '700' as const, color: Colors.textSecondary, marginTop: 1 },

  section: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.2, marginBottom: 12 },
  commentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentAvatar: { width: 40, height: 40, borderRadius: 20 },
  commentText: { flex: 1, fontSize: 14.5, color: Colors.text, lineHeight: 21, fontWeight: '600' as const },

  problemList: { gap: 10 },
  problemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  problemInfo: { flex: 1, gap: 7 },
  problemName: { fontSize: 14.5, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.1 },
  problemBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  problemBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.3, textTransform: 'uppercase' as const },
  problemAltButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  problemAltText: { color: Colors.primary, fontSize: 12, fontWeight: '800' as const },

  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  finishButton: {
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
  finishButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' as const, letterSpacing: -0.1 },
});
