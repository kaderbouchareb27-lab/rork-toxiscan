import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Check, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useShopping } from '@/providers/ShoppingProvider';
import { shoppingItemFromProduct, shoppingVerdictColor, shoppingVerdictLabel } from '@/utils/shopping';
import { getDrToxiBadgeAvatarForVerdict, DR_TOXI_DEFAULT_AVATAR_URI } from '@/constants/drToxiAvatars';
import { t, pick } from '@/utils/i18n';

function tap() {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Décision après un scan pendant le Mode courses :
 *  - vert / jaune → « Continuer » (ajoute automatiquement).
 *  - orange / rouge → « Garder quand même » ou « Voir une alternative ».
 */
export default function ShoppingAddScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const { history } = useScanHistory();
  const { addItem } = useShopping();

  const product = useMemo(() => history.find((p) => p.barcode === barcode), [history, barcode]);

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => { tap(); router.back(); }}>
            <ChevronLeft color={Colors.text} size={24} />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('product_not_found')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const item = shoppingItemFromProduct(product);
  const color = shoppingVerdictColor(item.verdictLevel, item.isCosmetic);
  const label = shoppingVerdictLabel(item.verdictLevel, item.isCosmetic);
  const isGood = item.verdictLevel === 'approuve' || item.verdictLevel === 'moderation';
  const avatarUri = getDrToxiBadgeAvatarForVerdict(item.verdictLevel) ?? DR_TOXI_DEFAULT_AVATAR_URI;

  const handleKeep = () => {
    tap();
    addItem(item);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => { tap(); router.back(); }}
          testID="shopping-add-back"
        >
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {pick({ en: 'Add to list', fr: 'Ajouter à la liste', ko: '목록에 추가' })}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.verdictCard, { backgroundColor: color, shadowColor: color }]}>
          <View style={styles.verdictHeaderRow}>
            <View style={styles.avatarBubble}>
              <Image source={avatarUri} style={styles.avatar} contentFit="contain" transition={200} />
            </View>
            <View style={styles.verdictHeaderText}>
              <Text style={styles.verdictEyebrow}>
                {pick({ en: 'SCAN RESULT', fr: 'RÉSULTAT DU SCAN', ko: '스캔 결과' })}
              </Text>
              <Text style={styles.verdictLabel}>{label}</Text>
            </View>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreValue}>{item.toxiScore}</Text>
            <Text style={styles.scoreOutOf}>/10</Text>
          </View>
        </View>

        <Text style={styles.productName}>{product.name}</Text>
        {product.brand && product.brand !== product.name ? (
          <Text style={styles.productBrand}>{product.brand}</Text>
        ) : null}

        {product.analysisPending === true ? (
          <View style={styles.analyzingBanner} testID="shopping-add-analyzing">
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.analyzingText}>
              {pick({ en: 'Dr. Toxi is still checking every ingredient…', fr: 'Dr. Toxi vérifie encore chaque ingrédient…', ko: 'Dr. Toxi가 아직 모든 성분을 확인하고 있어요…' })}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {isGood ? (
            <TouchableOpacity style={styles.primaryButton} onPress={handleKeep} activeOpacity={0.85} testID="shopping-add-continue">
              <Check color="#FFFFFF" size={20} strokeWidth={3} />
              <Text style={styles.primaryButtonText}>
                {pick({ en: 'Continue', fr: 'Continuer', ko: '계속' })}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  tap();
                  router.replace({ pathname: '/shopping-alternative', params: { barcode: product.barcode, mode: 'add' } });
                }}
                activeOpacity={0.85}
                testID="shopping-add-alternative"
              >
                <RefreshCw color="#FFFFFF" size={20} />
                <Text style={styles.primaryButtonText}>
                  {pick({ en: 'See an alternative', fr: 'Voir une alternative', ko: '대안 보기' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleKeep} activeOpacity={0.85} testID="shopping-add-keep">
                <Text style={styles.secondaryButtonText}>
                  {pick({ en: 'Keep it anyway', fr: 'Garder quand même', ko: '그래도 담기' })}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' as const },

  verdictCard: {
    borderRadius: 26,
    padding: 22,
    marginTop: 8,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 7,
  },
  verdictHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16 },
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
  verdictHeaderText: { flex: 1 },
  verdictEyebrow: { fontSize: 11, fontWeight: '900' as const, color: 'rgba(255,255,255,0.76)', letterSpacing: 1.2, marginBottom: 3 },
  verdictLabel: { fontSize: 24, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: 0.4 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end' },
  scoreValue: { fontSize: 52, lineHeight: 54, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: -1.6 },
  scoreOutOf: { fontSize: 18, fontWeight: '800' as const, color: 'rgba(255,255,255,0.72)', marginBottom: 6, marginLeft: 3 },

  productName: { fontSize: 21, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3, marginTop: 22 },
  productBrand: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  analyzingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  analyzingText: { flex: 1, fontSize: 13, fontWeight: '700' as const, color: Colors.primaryDark, lineHeight: 18 },

  actions: { marginTop: 26, gap: 12 },
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  secondaryButtonText: { color: Colors.text, fontSize: 15, fontWeight: '700' as const, letterSpacing: -0.1 },
});
