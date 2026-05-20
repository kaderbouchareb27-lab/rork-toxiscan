import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking, Platform, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { t, isEnglish } from '@/utils/i18n';

interface OFFAlt {
  product_name?: string;
  brands?: string;
  image_url?: string;
  stores_tags?: string[];
  nutriscore_grade?: string;
  code?: string;
}

interface Props {
  category?: string | null;       // e.g. "en:breakfast-cereals" or raw product.categories
  problematicIngredients: string[]; // names or codes (e.g. ["e102", "palm oil"])
  countryCode?: string;            // 'ca' | 'fr'
  forceShow?: boolean;             // always render section (used for WARNING / CANCÉRIGÈNE)
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractCategoryTag(raw?: string | null): string | null {
  if (!raw) return null;
  // raw can be "en:breakfast-cereals,en:cereals" or "Cereals, Breakfast cereals"
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  // Prefer the most specific (last) english-tagged part
  const enTagged = [...parts].reverse().find(p => p.startsWith('en:'));
  if (enTagged) return enTagged.replace(/^en:/, '');
  // Otherwise slugify the last/most specific category label
  const last = parts[parts.length - 1];
  return slugify(last);
}

function normalizeIngredientToken(s: string): string {
  const trimmed = s.trim().toLowerCase();
  // E-codes like "e102" or "e-102" → "e102"
  const eMatch = trimmed.match(/^e[-\s]?\d{3,4}[a-z]?$/i);
  if (eMatch) return trimmed.replace(/[-\s]/g, '');
  return slugify(trimmed);
}

function LeafIcon({ color = '#2E9E34', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 21c0-9 6-15 16-15 0 10-6 16-16 16Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 21c4-4 8-8 16-15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface FetchAttemptOptions {
  categoryTag: string;
  ingredientTokens: string[];
  cc: string;
  withNutriScore: boolean;
  withIngredientExclusion: boolean;
  label: string;
}

async function fetchOFFAttempt(opts: FetchAttemptOptions): Promise<OFFAlt[]> {
  const { categoryTag, ingredientTokens, cc, withNutriScore, withIngredientExclusion, label } = opts;
  const params = new URLSearchParams();
  params.set('categories_tags_en', categoryTag);
  if (withIngredientExclusion && ingredientTokens.length > 0) {
    params.set('ingredients_tags', ingredientTokens.map(i => `-en:${i}`).join(','));
  }
  if (withNutriScore) {
    params.set('nutrition_grades_tags', 'a,b');
  }
  params.set('cc', cc);
  params.set('fields', 'product_name,brands,image_url,stores_tags,nutriscore_grade,code');
  params.set('page_size', '10');
  params.set('json', 'true');

  const url = `https://world.openfoodfacts.org/api/v2/search?${params.toString()}`;
  console.log(`[OFF-Alts] Attempt[${label}] URL:`, url);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ToxiScan/1.0 (support@toxiscan.com)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.log(`[OFF-Alts] Attempt[${label}] HTTP error:`, res.status);
      return [];
    }
    const json = (await res.json()) as { products?: OFFAlt[]; count?: number };
    const products = (json.products ?? []).filter(p => !!p.product_name && !!p.image_url);
    console.log(`[OFF-Alts] Attempt[${label}] count=${json.count} filtered=${products.length}`);
    return products;
  } catch (e) {
    console.log(`[OFF-Alts] Attempt[${label}] error:`, e);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function parentCategory(tag: string): string | null {
  // breakfast-cereals -> cereals; chocolate-biscuits -> biscuits
  const parts = tag.split('-');
  if (parts.length <= 1) return null;
  return parts[parts.length - 1];
}

async function fetchOFFAlternatives(
  categoryTag: string,
  ingredientTokens: string[],
  cc: string,
): Promise<OFFAlt[]> {
  // Cascading relaxation — stop at the first attempt that returns >=3 products,
  // otherwise keep the best non-empty result we found.
  const attempts: FetchAttemptOptions[] = [
    { categoryTag, ingredientTokens, cc, withNutriScore: true, withIngredientExclusion: true, label: `${cc}/full` },
    { categoryTag, ingredientTokens, cc, withNutriScore: false, withIngredientExclusion: true, label: `${cc}/no-grade` },
    { categoryTag, ingredientTokens, cc: 'fr', withNutriScore: true, withIngredientExclusion: true, label: 'fr/full' },
    { categoryTag, ingredientTokens, cc: 'fr', withNutriScore: false, withIngredientExclusion: true, label: 'fr/no-grade' },
  ];

  const parent = parentCategory(categoryTag);
  if (parent && parent !== categoryTag) {
    attempts.push({
      categoryTag: parent,
      ingredientTokens,
      cc: 'fr',
      withNutriScore: true,
      withIngredientExclusion: true,
      label: `fr/parent(${parent})`,
    });
  }
  // Last resort: same category, no ingredient exclusion, just A/B grade.
  attempts.push({
    categoryTag,
    ingredientTokens,
    cc: 'fr',
    withNutriScore: true,
    withIngredientExclusion: false,
    label: 'fr/no-exclude',
  });

  let best: OFFAlt[] = [];
  for (const attempt of attempts) {
    const result = await fetchOFFAttempt(attempt);
    if (result.length > best.length) best = result;
    if (result.length >= 3) {
      console.log(`[OFF-Alts] Using attempt[${attempt.label}] with ${result.length} products`);
      return result.slice(0, 3);
    }
  }
  console.log('[OFF-Alts] Final best result:', best.length);
  return best.slice(0, 3);
}

function prettifyStoreTag(tag: string): string {
  const raw = tag.replace(/^[a-z]{2}:/, '');
  return raw
    .split('-')
    .map(w => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export default function HealthierAlternativesOFF({ category, problematicIngredients, countryCode = 'ca', forceShow = false }: Props) {
  const categoryTag = useMemo(() => extractCategoryTag(category), [category]);
  const ingredientTokens = useMemo(
    () => Array.from(new Set(problematicIngredients.map(normalizeIngredientToken).filter(Boolean))).slice(0, 6),
    [problematicIngredients],
  );

  // Fallback category for forced render when product has no category tag.
  const effectiveCategory = categoryTag ?? (forceShow ? 'snacks' : null);

  console.log('[OFF-Alts] Component mount — categoryTag:', categoryTag, 'effective:', effectiveCategory, 'forceShow:', forceShow, 'tokens:', ingredientTokens, 'cc:', countryCode);

  const enabled = !!effectiveCategory;
  const query = useQuery({
    queryKey: ['off-alternatives', effectiveCategory, ingredientTokens, countryCode],
    queryFn: () => fetchOFFAlternatives(effectiveCategory as string, ingredientTokens, countryCode),
    enabled,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const data = query.data ?? [];
  const isLoading = query.isLoading;

  console.log('[OFF-Alts] Render — enabled:', enabled, 'isLoading:', isLoading, 'final:', data.length);

  if (!enabled && !forceShow) return null;

  const title = isEnglish() ? 'Healthier alternatives' : 'Alternatives plus saines';
  const inGrocery = isEnglish() ? 'Available in grocery stores' : 'Disponible en épicerie';

  const openProduct = (code?: string) => {
    if (!code) return;
    const url = `https://world.openfoodfacts.org/product/${code}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.section} testID="healthier-alternatives-section">
      <View style={styles.titleRow}>
        <LeafIcon color="#2E9E34" size={20} />
        <Text style={styles.title}>{title}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            {isEnglish()
              ? 'No alternatives found right now. Try again later.'
              : 'Aucune alternative trouvée pour le moment. Réessaie plus tard.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {data.map((p, i) => {
            const stores = (p.stores_tags ?? [])
              .map(prettifyStoreTag)
              .filter(s => s.length > 0)
              .slice(0, 3);
            const hasStores = stores.length > 0;
            return (
              <TouchableOpacity
                key={`off-alt-${p.code ?? i}`}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => openProduct(p.code)}
                testID={`alt-card-${i}`}
              >
                <View style={styles.imageWrap}>
                  {p.image_url ? (
                    <Image source={{ uri: p.image_url }} style={styles.image} contentFit="contain" />
                  ) : (
                    <View style={styles.imagePlaceholder} />
                  )}
                  {p.nutriscore_grade ? (
                    <View style={styles.gradeBadge}>
                      <Text style={styles.gradeBadgeText}>{p.nutriscore_grade.toUpperCase()}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.name} numberOfLines={2}>
                  {p.product_name}
                </Text>
                {p.brands ? (
                  <Text style={styles.brand} numberOfLines={1}>
                    {p.brands.split(',')[0].trim()}
                  </Text>
                ) : null}
                <View style={styles.chipsRow}>
                  {hasStores ? (
                    stores.map((s, idx) => (
                      <View key={`chip-${i}-${idx}`} style={styles.chip}>
                        <Text style={styles.chipText} numberOfLines={1}>
                          {s}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View style={[styles.chip, styles.chipMuted]}>
                      <Text style={styles.chipText} numberOfLines={1}>
                        {inGrocery}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const CARD_WIDTH = 180;

const styles = StyleSheet.create({
  section: { marginTop: 16, marginBottom: 4 },
  titleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 12 },
  title: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  scrollContent: { paddingRight: 8, gap: 12 },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  imageWrap: {
    width: '100%' as const,
    height: 120,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
    marginBottom: 10,
    position: 'relative' as const,
  },
  image: { width: '100%' as const, height: '100%' as const },
  imagePlaceholder: { width: '100%' as const, height: '100%' as const, backgroundColor: Colors.surfaceSecondary },
  gradeBadge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    backgroundColor: '#038141',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  gradeBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' as const },
  name: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  brand: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  chipsRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 4, marginTop: 8 },
  chip: {
    backgroundColor: '#E8F9ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: '100%' as const,
  },
  chipMuted: { backgroundColor: Colors.surfaceSecondary },
  chipText: { fontSize: 10, fontWeight: '600' as const, color: '#2D6B3F' },
  loadingBox: { paddingVertical: 24, alignItems: 'center' as const, justifyContent: 'center' as const },
  emptyBox: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  emptyText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' as const },
});
