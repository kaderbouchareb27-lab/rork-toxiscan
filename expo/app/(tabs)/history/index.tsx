import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Shield,
  Trash2,
  Camera,
  Lock,
  Heart,
  ChevronRight,
  Search,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import {
  DR_TOXI_ULTRA_TOXIC_HISTORY_AVATAR,
  getDrToxiAvatarForTier,
  toDrToxiImageSource,
} from '@/constants/drToxiAvatars';
import { useScanHistory, useFilteredHistory } from '@/providers/ScanHistoryProvider';
import ScanStatsCard from '@/components/ScanStatsCard';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { VerdictTier, ScannedProduct } from '@/types';
import { t, getDateLocale } from '@/utils/i18n';
import { getDisplayBrand, verdictTierFromProduct } from '@/utils/api';

type FilterType = 'all' | 'favorites' | VerdictTier;

type FilterConfig = { key: FilterType; label: string; color?: string };

type HistoryRiskPresentation = {
  label: string;
  description: string;
  color: string;
  tint: string;
  borderColor: string;
};

function getFilters(): FilterConfig[] {
  return [
    { key: 'all', label: t('filter_all'), color: Colors.primary },
    { key: 'favorites', label: t('filter_favorites'), color: '#FF2D55' },
    { key: 'carcinogenic', label: t('filter_danger'), color: '#D0260F' },
    { key: 'ultra_toxic', label: t('filter_ultra_toxic'), color: '#722F37' },
    { key: 'processed', label: t('filter_warning'), color: '#E8730A' },
    { key: 'moderation', label: t('filter_caution'), color: '#EAB308' },
    { key: 'approved', label: t('filter_approved'), color: Colors.primary },
  ];
}

function getHistoryRiskPresentation(tier: VerdictTier): HistoryRiskPresentation {
  switch (tier) {
    case 'carcinogenic':
      return {
        label: t('history_status_carcinogenic'),
        description: t('history_status_carcinogenic_desc'),
        color: '#D0260F',
        tint: 'rgba(208, 38, 15, 0.10)',
        borderColor: 'rgba(208, 38, 15, 0.22)',
      };
    case 'ultra_toxic':
      return {
        label: t('filter_ultra_toxic'),
        description: t('intro_ultra_toxic'),
        color: '#722F37',
        tint: 'rgba(114, 47, 55, 0.11)',
        borderColor: 'rgba(114, 47, 55, 0.26)',
      };
    case 'processed':
      return {
        label: t('history_status_ultra_processed'),
        description: t('history_status_ultra_processed_desc'),
        color: '#E8730A',
        tint: 'rgba(232, 115, 10, 0.11)',
        borderColor: 'rgba(232, 115, 10, 0.24)',
      };
    case 'moderation':
      return {
        label: t('history_status_caution'),
        description: t('history_status_caution_desc'),
        color: '#EAB308',
        tint: 'rgba(234, 179, 8, 0.13)',
        borderColor: 'rgba(234, 179, 8, 0.28)',
      };
    case 'approved':
    default:
      return {
        label: t('history_status_approved'),
        description: t('history_status_approved_desc'),
        color: Colors.primary,
        tint: 'rgba(46, 158, 52, 0.12)',
        borderColor: 'rgba(46, 158, 52, 0.24)',
      };
  }
}

// Filter chips keep the compact colored dot to indicate their risk level.
function RiskStatusIcon({ color, size = 16 }: { tier: VerdictTier; color: string; size?: number }) {
  const dotSize = Math.max(Math.round(size * 0.6), 8);
  return <View style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color }} />;
}

// History rows display the same Dr. Toxi avatar used for each verdict level on the
// scan result screen. ULTRA TOXIC keeps its history-only burgundy variant.
function getHistoryRowAvatarUri(tier: VerdictTier): string {
  if (tier === 'ultra_toxic') return DR_TOXI_ULTRA_TOXIC_HISTORY_AVATAR;
  const source = toDrToxiImageSource(getDrToxiAvatarForTier(tier));
  return typeof source === 'object' ? source.uri : DR_TOXI_ULTRA_TOXIC_HISTORY_AVATAR;
}

function SkeletonRow() {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.productCard, styles.skeletonCard, { opacity }]} testID="skeleton-row">
      <View style={styles.cardTopRow}>
        <View style={[styles.thumbnailPlaceholder, { backgroundColor: '#F0F4EC' }]} />
        <View style={styles.productInfo}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonBrand} />
          <View style={styles.skeletonMeta} />
        </View>
        <View style={styles.skeletonChevron} />
      </View>
    </Animated.View>
  );
}

function HistorySkeleton() {
  return (
    <View style={styles.listContent}>
      {[0, 1, 2].map(i => <SkeletonRow key={`skel-${i}`} />)}
    </View>
  );
}

// Message compact affiché sous la carte Statistiques quand la liste filtrée est vide.
function HistoryListEmpty({ isSearch, filter }: { isSearch: boolean; filter: FilterType }) {
  const title = isSearch
    ? t('history_search_empty')
    : filter === 'favorites'
      ? t('no_favorites')
      : t('history_filter_empty');
  const subtitle = isSearch
    ? t('history_search_empty_hint')
    : filter === 'favorites'
      ? t('add_favorites_hint')
      : t('history_filter_empty_hint');
  return (
    <View style={styles.inlineEmpty}>
      <Text style={styles.inlineEmptyTitle}>{title}</Text>
      <Text style={styles.inlineEmptySub}>{subtitle}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { clearHistory, history, stats, isLoading } = useScanHistory();
  const { isPro } = useSubscription();
  const filteredHistory = useFilteredHistory(activeFilter, isPro);

  const totalHistoryCount = history.length;
  const showPremiumUpsell = !isPro && totalHistoryCount > 3 && activeFilter !== 'favorites';

  const searchedHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredHistory;
    return filteredHistory.filter((p) => {
      const name = (p.name ?? '').toLowerCase();
      const brand = (p.brand ?? '').toLowerCase();
      const displayBrand = getDisplayBrand(p.brand, p.productCategory).toLowerCase();
      return name.includes(q) || brand.includes(q) || displayBrand.includes(q);
    });
  }, [filteredHistory, searchQuery]);

  const handleSelectTier = useCallback((tier: VerdictTier) => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    setActiveFilter((prev) => (prev === tier ? 'all' : tier));
  }, []);

  const handleProductPress = useCallback((barcode: string) => {
    console.log('[History] Opening product:', barcode);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/product/${barcode}`);
  }, []);

  const handleFilterPress = useCallback((filterKey: FilterType) => {
    console.log('[History] Filter changed to:', filterKey);
    if (filterKey === 'favorites' && !isPro) {
      console.log('[History] Favorites locked, showing paywall');
      router.push('/paywall?source=favorite');
      return;
    }
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    setActiveFilter(filterKey);
  }, [isPro]);

  const handleClearHistory = useCallback(() => {
    console.log('[History] Clear history requested');
    Alert.alert(
      t('clear_history_title'),
      t('clear_history_msg'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('clear'), style: 'destructive', onPress: () => {
          console.log('[History] Clearing history confirmed');
          clearHistory();
        }},
      ]
    );
  }, [clearHistory]);

  const renderProduct = useCallback(({ item }: { item: ScannedProduct }) => {
    // ✅ Verdict recalculé en direct depuis les badges d'ingrédients (mêmes règles
    // que la page produit) — les anciens scans suivent automatiquement les nouvelles règles.
    const displayTier = verdictTierFromProduct(item);
    const risk = getHistoryRiskPresentation(displayTier);
    const date = new Date(item.scannedAt);
    const formattedDate = date.toLocaleDateString(getDateLocale(), {
      day: 'numeric',
      month: 'short',
    });
    const isPhoto = item.scanMethod === 'photo';
    const brandLabel = getDisplayBrand(item.brand, item.productCategory);

    return (
      <TouchableOpacity
        style={[styles.productCard, { borderColor: risk.borderColor, shadowColor: risk.color }]}
        onPress={() => handleProductPress(item.barcode)}
        activeOpacity={0.78}
        testID={`history-item-${item.barcode}`}
      >
        <View style={[styles.riskRail, { backgroundColor: risk.color }]} />
        <View style={styles.cardTopRow}>
          <View style={[styles.thumbnailShell, { borderColor: risk.borderColor }]}>
            {isPhoto && item.thumbnailBase64 ? (
              <Image source={{ uri: item.thumbnailBase64 }} style={styles.thumbnail} contentFit="cover" />
            ) : isPhoto && item.photoUri ? (
              <Image source={{ uri: item.photoUri }} style={styles.thumbnail} contentFit="cover" />
            ) : item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} contentFit="contain" />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                {isPhoto ? (
                  <Camera color={Colors.textTertiary} size={22} strokeWidth={2.2} />
                ) : (
                  <Shield color={Colors.textTertiary} size={22} strokeWidth={2.2} />
                )}
              </View>
            )}
          </View>

          <View style={styles.productInfo}>
            <View style={styles.productTitleRow}>
              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
              {item.isFavorite && (
                <View style={styles.favoriteBadge}>
                  <Heart color="#FF2D55" size={12} fill="#FF2D55" strokeWidth={2.4} />
                </View>
              )}
            </View>
            <Text style={styles.productBrand} numberOfLines={1}>{brandLabel}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.riskMiniBadge, { backgroundColor: risk.tint, borderColor: risk.borderColor }]}>
                <Image
                  source={{ uri: getHistoryRowAvatarUri(displayTier) }}
                  style={styles.riskMiniAvatar}
                  contentFit="contain"
                  testID={`history-avatar-${displayTier}`}
                />
                <Text style={[styles.riskMiniText, { color: risk.color }]} numberOfLines={1}>{risk.label}</Text>
              </View>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
          </View>

          <View style={styles.chevronCircle}>
            <ChevronRight color={Colors.textSecondary} size={17} strokeWidth={2.4} />
          </View>
        </View>

      </TouchableOpacity>
    );
  }, [handleProductPress]);

  const renderFooter = useCallback(() => {
    if (!showPremiumUpsell) return null;
    return (
      <LinearGradient
        colors={['#F1FFF2', '#FFFFFF'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.premiumUpsellCard}
      >
        <View style={styles.premiumUpsellIcon}>
          <Lock color={Colors.primary} size={22} />
        </View>
        <Text style={styles.premiumUpsellTitle}>{t('full_history')}</Text>
        <Text style={styles.premiumUpsellText}>{t('full_history_desc')}</Text>
        <TouchableOpacity
          style={styles.premiumUpsellButton}
          onPress={() => router.push('/paywall?source=history')}
          activeOpacity={0.85}
          testID="history-unlock"
        >
          <Text style={styles.premiumUpsellButtonText}>{t('see_offers')}</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }, [showPremiumUpsell]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>{t('history_title')}</Text>
          <Text style={styles.subtitle}>{t('history_saved_subtitle')}</Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearHistory} style={styles.clearButton} testID="clear-history" activeOpacity={0.82}>
            <Trash2 color={Colors.textSecondary} size={18} strokeWidth={2.2} />
          </TouchableOpacity>
        )}
      </View>

      {!isLoading && history.length > 0 && (
        <View style={styles.searchWrap}>
          <Search color={Colors.textTertiary} size={17} strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('history_search_placeholder')}
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="search"
            autoCorrect={false}
            testID="history-search-input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={8}
              style={styles.searchClear}
              testID="history-search-clear"
              accessibilityLabel={t('clear')}
            >
              <X color={Colors.textTertiary} size={15} strokeWidth={2.4} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={getFilters()}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item: filter }) => {
            const isActive = activeFilter === filter.key;
            const isRiskFilter = filter.key !== 'all' && filter.key !== 'favorites';
            const activeColor = filter.color ?? Colors.primary;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                  isActive ? { backgroundColor: activeColor, borderColor: activeColor } : undefined,
                  filter.key === 'favorites' && !isPro ? styles.filterChipLocked : undefined,
                ]}
                onPress={() => handleFilterPress(filter.key)}
                activeOpacity={0.82}
                testID={`filter-${filter.key}`}
              >
                {filter.key === 'favorites' ? (
                  <Heart color={isActive ? Colors.white : '#FF2D55'} size={13} fill={isActive ? Colors.white : '#FF2D55'} strokeWidth={2.4} />
                ) : isRiskFilter && filter.color ? (
                  <RiskStatusIcon tier={filter.key as VerdictTier} color={isActive ? Colors.white : filter.color} size={15} />
                ) : null}
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {filter.label}
                </Text>
                {filter.key === 'favorites' && !isPro && (
                  <Lock color={isActive ? Colors.white : Colors.textTertiary} size={10} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {!isPro && activeFilter === 'all' && (
        <View style={styles.historyInfoBanner}>
          <Lock color={Colors.primary} size={14} strokeWidth={2.4} />
          <Text style={styles.historyInfoText}>{t('history_limit_banner')}</Text>
        </View>
      )}

      {isLoading ? (
        <HistorySkeleton />
      ) : history.length === 0 ? (
        <View style={styles.emptyState}>
          <LinearGradient
            colors={['#FFFFFF', '#ECF9EE'] as const}
            style={styles.emptyIconCircle}
          >
            <Shield color={Colors.primary} size={46} strokeWidth={1.6} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>
            {activeFilter === 'favorites' ? t('no_favorites') : t('no_products')}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === 'favorites'
              ? t('add_favorites_hint')
              : t('photo_product_hint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={searchedHistory}
          keyExtractor={(item) => item.barcode}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <ScanStatsCard
              stats={stats}
              activeTier={activeFilter !== 'all' && activeFilter !== 'favorites' ? activeFilter : null}
              onSelectTier={handleSelectTier}
            />
          }
          ListEmptyComponent={
            <HistoryListEmpty isSearch={searchQuery.trim().length > 0} filter={activeFilter} />
          }
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 14,
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '900' as const,
    color: Colors.text,
    letterSpacing: -0.9,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 3,
    fontWeight: '700' as const,
  },
  clearButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#0E2011',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  filtersContainer: {
    paddingVertical: 14,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 2,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    minHeight: 44,
    shadowColor: '#0E2011',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 10,
    fontWeight: '600' as const,
  },
  searchClear: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F0F3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineEmpty: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 40,
    paddingHorizontal: 30,
  },
  inlineEmptyTitle: {
    fontSize: 17,
    fontWeight: '900' as const,
    color: Colors.text,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  inlineEmptySub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '700' as const,
  },
  filtersList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
    shadowColor: '#0E2011',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1,
  },
  filterChipActive: {
    shadowOpacity: 0.12,
    transform: [{ translateY: -1 }],
  },
  filterChipLocked: {
    opacity: 0.62,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  historyInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(46, 158, 52, 0.10)',
    marginHorizontal: 20,
    borderRadius: 18,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(46, 158, 52, 0.20)',
  },
  historyInfoText: {
    flexShrink: 1,
    fontSize: 12,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '900' as const,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  productCard: {
    position: 'relative',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 13,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 26,
    borderWidth: 1.5,
    gap: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 3,
  },
  riskRail: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 5,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  skeletonCard: {
    borderColor: Colors.borderLight,
    shadowColor: '#0E2011',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnailShell: {
    width: 66,
    height: 66,
    borderRadius: 21,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbnail: {
    width: 66,
    height: 66,
    borderRadius: 21,
    backgroundColor: Colors.surfaceSecondary,
  },
  thumbnailPlaceholder: {
    width: 66,
    height: 66,
    borderRadius: 21,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  favoriteBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF4F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productBrand: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
    fontWeight: '700' as const,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 9,
  },
  riskMiniBadge: {
    maxWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  riskMiniText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '900' as const,
  },
  riskMiniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  dateText: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '800' as const,
  },
  chevronCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F7F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonTitle: {
    width: 150,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#E9EEE4',
    marginBottom: 7,
  },
  skeletonBrand: {
    width: 92,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#F0F3EC',
    marginBottom: 10,
  },
  skeletonMeta: {
    width: 126,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E9EEE4',
  },
  skeletonChevron: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E9EEE4',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyIconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46, 158, 52, 0.18)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: Colors.text,
    letterSpacing: -0.25,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '700' as const,
  },
  premiumUpsellCard: {
    marginTop: 12,
    borderRadius: 26,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(46, 158, 52, 0.22)',
  },
  premiumUpsellIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(46, 158, 52, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  premiumUpsellTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  premiumUpsellText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '700' as const,
  },
  premiumUpsellButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 17,
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  premiumUpsellButtonText: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: Colors.white,
  },
});
