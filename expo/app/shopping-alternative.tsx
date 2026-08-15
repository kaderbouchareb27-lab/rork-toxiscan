import React, { useEffect, useMemo, useState } from 'react';
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
import { ChevronLeft, Leaf, CheckCircle, Store } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useShopping } from '@/providers/ShoppingProvider';
import { verdictTierFromProduct } from '@/utils/api';
import { findRealAlternatives, getCachedRealAlternatives } from '@/utils/realAlternatives';
import type { HealthyAlternative } from '@/types';
import { pick, t } from '@/utils/i18n';

function tap() {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Alternatives pour un produit orange/rouge pendant le Mode courses.
 * Deux modes :
 *  - add     : depuis la décision de scan — choisir une alternative l'AJOUTE (jamais le produit original).
 *  - replace : depuis le bilan — choisir une alternative REMPLACE l'item dans la liste.
 */
export default function ShoppingAlternativeScreen() {
  const { mode, barcode, itemId } = useLocalSearchParams<{ mode?: string; barcode?: string; itemId?: string }>();
  const { history } = useScanHistory();
  const { items, addAlternative, replaceItem } = useShopping();

  const product = useMemo(() => {
    if (barcode) return history.find((p) => p.barcode === barcode);
    if (itemId) return items.find((it) => it.id === itemId)?.product;
    return undefined;
  }, [history, items, barcode, itemId]);

  const [real, setReal] = useState<HealthyAlternative[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!product) { setLoading(false); return; }
    let active = true;
    const tier = verdictTierFromProduct(product);
    const cached = getCachedRealAlternatives(product.name, tier);
    if (cached && cached.length > 0) {
      setReal(cached);
      setLoading(false);
      return () => { active = false; };
    }
    const badIngredients = (product.substances ?? [])
      .filter((s) => s.niveau_risque === 'danger' || s.niveau_risque === 'probable')
      .map((s) => s.nom);
    findRealAlternatives({
      productName: product.name,
      badIngredients,
      verdictTier: tier,
      productCategory: product.productCategory,
      ingredients: (product.substances ?? []).map((s) => s.nom),
    })
      .then(({ alternatives }) => { if (active) setReal(alternatives); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [product]);

  const deterministic = useMemo<HealthyAlternative[]>(() => {
    const list: HealthyAlternative[] = [];
    for (const alt of product?.healthyAlternatives ?? []) list.push(alt);
    for (const name of product?.saferAlternatives ?? []) {
      if (name && name.trim()) list.push({ nom: name, raison: '' });
    }
    return list;
  }, [product]);

  const options = real.length > 0 ? real : deterministic;

  const handlePick = (name: string) => {
    tap();
    if (mode === 'replace' && itemId) {
      replaceItem(itemId, name);
      router.back();
    } else {
      addAlternative(name);
      router.back();
    }
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => { tap(); router.back(); }}
          testID="shopping-alt-back"
        >
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {pick({ en: 'Healthier alternatives', fr: 'Alternatives plus saines', ko: '더 건강한 대안' })}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.introCard}>
          <Leaf color={Colors.safe} size={20} />
          <Text style={styles.introText}>
            {pick({ en: 'Replace', fr: 'Remplacer', ko: '교체 대상' })}{' '}
            <Text style={styles.introName}>« {product.name} »</Text>{' '}
            {pick({ en: 'with one of these cleaner options.', fr: 'par l’une de ces options plus saines.', ko: '이 더 건강한 옵션 중 하나로 교체하세요.' })}
          </Text>
        </View>

        {loading && options.length === 0 ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>
              {pick({ en: 'Finding cleaner products…', fr: 'Recherche de produits plus sains…', ko: '더 건강한 제품을 찾는 중…' })}
            </Text>
          </View>
        ) : null}

        {options.length > 0 ? (
          <View style={styles.optionsList}>
            {options.map((alt, index) => (
              <TouchableOpacity
                key={`alt-${index}`}
                style={styles.optionCard}
                onPress={() => handlePick(alt.nom)}
                activeOpacity={0.85}
                testID={`shopping-alt-${index}`}
              >
                <View style={styles.optionIcon}>
                  <CheckCircle color={Colors.safe} size={20} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionName}>{alt.nom}</Text>
                  {alt.raison ? <Text style={styles.optionReason} numberOfLines={2}>{alt.raison}</Text> : null}
                  {alt.magasin ? (
                    <View style={styles.optionStore}>
                      <Store color={Colors.primary} size={12} />
                      <Text style={styles.optionStoreText}>{alt.magasin}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.optionAdd}>
                  {pick({ en: 'Choose', fr: 'Choisir', ko: '선택' })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          !loading ? (
            <View style={styles.noResultCard}>
              <Text style={styles.noResultText}>
                {pick({ en: 'No cleaner alternative found — you can still keep the product.', fr: 'Aucune alternative plus saine trouvée — tu peux quand même garder le produit.', ko: '더 건강한 대안을 찾지 못했어요 — 그래도 제품을 담을 수 있습니다.' })}
              </Text>
            </View>
          ) : null
        )}
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

  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 15,
    marginTop: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  introText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  introName: { color: Colors.text, fontWeight: '700' as const },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  loadingText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' as const },
  optionsList: { gap: 12 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(46, 158, 52, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionInfo: { flex: 1, gap: 3 },
  optionName: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.1 },
  optionReason: { fontSize: 12.5, color: Colors.textSecondary, lineHeight: 17 },
  optionStore: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  optionStoreText: { fontSize: 12, color: Colors.primary, fontWeight: '700' as const },
  optionAdd: { fontSize: 13, fontWeight: '800' as const, color: Colors.primary },
  noResultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noResultText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
