import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Shield,
  Trash2,
  Camera,
  Lock,
  Heart,
  ChevronRight,
  ShieldX,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useScanHistory, useFilteredHistory } from '@/providers/ScanHistoryProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { RiskGroup, ScannedProduct } from '@/types';
import { getDisplayedRiskScore } from '@/utils/riskScore';
import { t, getDateLocale } from '@/utils/i18n';

type FilterType = 'all' | 'favorites' | RiskGroup;

type FilterConfig = { key: FilterType; label: string; color?: string };

type HistoryRiskPresentation = {
  label: string;
  description: string;
  color: string;
};

function getFilters(): FilterConfig[] {
  return [
    { key: 'all', label: t('filter_all') },
    { key: 'favorites', label: t('filter_favorites'), color: '#FF2D55' },
    { key: 'group1', label: t('filter_danger'), color: '#D0260F' },
    { key: 'group2a', label: t('filter_warning'), color: '#E8730A' },
    { key: 'group2b', label: t('filter_caution'), color: '#EAB308' },
    { key: 'none', label: t('filter_approved'), color: '#22C55E' },
  ];
}

function getHistoryRiskPresentation(group: RiskGroup): HistoryRiskPresentation {
  switch (group) {
    case 'group1':
      return {
        label: t('history_status_carcinogenic'),
        description: t('history_status_carcinogenic_desc'),
        color: '#D0260F',
      };
    case 'group2a':
      return {
        label: t('history_status_ultra_processed'),
        description: t('history_status_ultra_processed_desc'),
        color: '#E8730A',
      };
    case 'group2b':
      return {
        label: t('history_status_caution'),
        description: t('history_status_caution_desc'),
        color: '#EAB308',
      };
    case 'none':
    default:
      return {
        label: t('history_status_approved'),
        description: t('history_status_approved_desc'),
        color: '#22C55E',
      };
  }
}

function RiskStatusIcon({ group, color, size = 16 }: { group: RiskGroup; color: string; size?: number }) {
  switch (group) {
    case 'group1':
      return <ShieldX color={color} size={size} strokeWidth={2.4} />;
    case 'group2a':
      return <AlertTriangle color={color} size={size} strokeWidth={2.4} />;
    case 'group2b':
      return <AlertCircle color={color} size={size} strokeWidth={2.4} />;
    case 'none':
    default:
      return <CheckCircle color={color} size={size} strokeWidth={2.4} />;
  }
}

function SkeletonRow() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.productCard, styles.skeletonCard, { opacity }]} testID="skeleton-row">
      <View style={styles.cardTopRow}>
        <View style={[styles.thumbnailPlaceholder, { backgroundColor: '#F0F0EE' }]} />
        <View style={styles.productInfo}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonBrand} />
          <View style={styles.skeletonMeta} />
        </View>
        <View style={styles.skeletonChevron} />
      </View>
      <View style={styles.statusPanel}>
        <View style={[styles.statusIconBubble, { backgroundColor: '#E6E6E2' }]} />
        <View style={styles.statusCopy}>
          <View style={styles.skeletonStatusTitle} />
          <View style={styles.skeletonStatusLine} />
        </View>
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

export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { clearHistory, history, isLoading } = useScanHistory();
  const { isPro } = useSubscription();
  const filteredHistory = useFilteredHistory(activeFilter, isPro);

  const totalHistoryCount = history.length;
  const showPremiumUpsell = !isPro && totalHistoryCount > 3 && activeFilter !== 'favorites';

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
    const risk = getHistoryRiskPresentation(item.riskGroup);
    const displayedRiskScore = getDisplayedRiskScore(item);
    const date = new Date(item.scannedAt);
    const formattedDate = date.toLocaleDateString(getDateLocale(), {
      day: 'numeric',
      month: 'short',
    });
    const isPhoto = item.scanMethod === 'photo';
    const brandLabel = item.brand?.trim() ? item.brand : t('history_unknown_brand');

    return (
      <TouchableOpacity
        style={[styles.productCard, { borderLeftColor: risk.color }]}
        onPress={() => handleProductPress(item.barcode)}
        activeOpacity={0.76}
        testID={`history-item-${item.barcode}`}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.thumbnailShell}>
            {isPhoto && item.thumbnailBase64 ? (
              <Image source={{ uri: item.thumbnailBase64 }} style={styles.thumbnail} contentFit="cover" />
            ) : isPhoto && item.photoUri ? (
              <Image source={{ uri: item.photoUri }} style={styles.thumbnail} contentFit="cover" />
            ) : item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} contentFit="contain" />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                {isPhoto ? (
                  <Camera color={Colors.textTertiary} size={21} strokeWidth={2.2} />
                ) : (
                  <Shield color={Colors.textTertiary} size={21} strokeWidth={2.2} />
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
              <View style={styles.scanMethodChip}>
                {isPhoto ? (
                  <Camera color={Colors.textSecondary} size={12} strokeWidth={2.3} />
                ) : (
                  <Shield color={Colors.textSecondary} size={12} strokeWidth={2.3} />
                )}
                <Text style={styles.scanMethodText}>{isPhoto ? t('history_photo_scan') : t('history_barcode_scan')}</Text>
              </View>
              <Text style={styles.dateText}>{t('history_saved_label')} {formattedDate}</Text>
            </View>
          </View>

          <ChevronRight color={Colors.textTertiary} size={18} strokeWidth={2.2} />
        </View>

        <View style={styles.statusPanel}>
          <View style={[styles.statusIconBubble, { backgroundColor: risk.color }]}>
            <RiskStatusIcon group={item.riskGroup} color={Colors.white} size={18} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={[styles.statusLabel, { color: risk.color }]} numberOfLines={1}>{risk.label}</Text>
            <Text style={styles.statusDescription} numberOfLines={2}>{risk.description}</Text>
          </View>
          <View style={[styles.statusScorePill, { borderColor: risk.color }]}>
            <Text style={[styles.statusScoreValue, { color: risk.color }]}>{displayedRiskScore}%</Text>
            <Text style={styles.statusScoreLabel}>ToxiScore</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleProductPress]);

  const renderFooter = useCallback(() => {
    if (!showPremiumUpsell) return null;
    return (
      <View style={styles.premiumUpsellCard}>
        <View style={styles.premiumUpsellIcon}>
          <Lock color="#2E9E34" size={22} />
        </View>
        <Text style={styles.premiumUpsellTitle}>{t('full_history')}</Text>
        <Text style={styles.premiumUpsellText}>
          {t('full_history_desc')}
        </Text>
        <TouchableOpacity
          style={styles.premiumUpsellButton}
          onPress={() => router.push('/paywall?source=history')}
          activeOpacity={0.85}
          testID="history-unlock"
        >
          <Text style={styles.premiumUpsellButtonText}>{t('see_offers')}</Text>
        </TouchableOpacity>
      </View>
    );
  }, [showPremiumUpsell]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>{t('history_title')}</Text>
          <Text style={styles.subtitle}>{t('history_saved_subtitle')}</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.scanCountPill}>
            <Text style={styles.scanCountNumber}>{totalHistoryCount}</Text>
            <Text style={styles.scanCountLabel}>{t('history_scan_count')}</Text>
          </View>
          {filteredHistory.length > 0 && (
            <TouchableOpacity onPress={handleClearHistory} style={styles.clearButton} testID="clear-history">
              <Trash2 color={Colors.textSecondary} size={18} strokeWidth={2.2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

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
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                  isActive && filter.color ? { backgroundColor: filter.color } : undefined,
                  filter.key === 'favorites' && !isPro ? styles.filterChipLocked : undefined,
                ]}
                onPress={() => handleFilterPress(filter.key)}
                testID={`filter-${filter.key}`}
              >
                {filter.key === 'favorites' ? (
                  <Heart color={isActive ? Colors.white : '#FF2D55'} size={13} fill={isActive ? Colors.white : '#FF2D55'} strokeWidth={2.4} />
                ) : isRiskFilter && filter.color ? (
                  <RiskStatusIcon group={filter.key as RiskGroup} color={isActive ? Colors.white : filter.color} size={13} />
                ) : null}
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
                {filter.key === 'favorites' && !isPro && (
                  <Lock color={Colors.textTertiary} size={10} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {!isPro && activeFilter === 'all' && (
        <View style={styles.historyInfoBanner}>
          <Text style={styles.historyInfoText}>
            {t('history_limit_banner')}
          </Text>
        </View>
      )}

      {isLoading ? (
        <HistorySkeleton />
      ) : filteredHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Shield color={Colors.textTertiary} size={46} strokeWidth={1.4} />
          </View>
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
          data={filteredHistory}
          keyExtractor={(item) => item.barcode}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 14,
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '900' as const,
    color: Colors.text,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 3,
    fontWeight: '600' as const,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanCountPill: {
    minWidth: 58,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  scanCountNumber: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: Colors.text,
    lineHeight: 15,
  },
  scanCountLabel: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
    lineHeight: 11,
  },
  clearButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  filtersContainer: {
    paddingVertical: 10,
  },
  filtersList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: Colors.text,
    borderColor: 'transparent',
    shadowOpacity: 0.1,
  },
  filterChipLocked: {
    opacity: 0.6,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  historyInfoBanner: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E8730A',
  },
  historyInfoText: {
    fontSize: 12,
    color: '#E8730A',
    textAlign: 'center',
    fontWeight: '800' as const,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
  },
  productCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderLeftWidth: 5,
    borderColor: Colors.borderLight,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  skeletonCard: {
    borderLeftColor: Colors.borderLight,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnailShell: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 18,
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
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.25,
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
    fontWeight: '600' as const,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  scanMethodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.surfaceSecondary,
  },
  scanMethodText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.textSecondary,
  },
  dateText: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '700' as const,
  },
  statusPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statusIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
  },
  statusScorePill: {
    minWidth: 66,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusScoreValue: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900' as const,
    letterSpacing: -0.35,
  },
  statusScoreLabel: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.25,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '900' as const,
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const,
  },
  statusDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  skeletonTitle: {
    width: 150,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#F0F0EE',
    marginBottom: 7,
  },
  skeletonBrand: {
    width: 92,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#F4F4F2',
    marginBottom: 10,
  },
  skeletonMeta: {
    width: 126,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F0F0EE',
  },
  skeletonChevron: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F0F0EE',
  },
  skeletonStatusTitle: {
    width: 128,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#E9E9E5',
    marginBottom: 6,
  },
  skeletonStatusLine: {
    width: '84%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EDEDE9',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyIconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600' as const,
  },
  premiumUpsellCard: {
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(46, 158, 52, 0.2)',
  },
  premiumUpsellIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(46, 158, 52, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  premiumUpsellTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  premiumUpsellText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600' as const,
  },
  premiumUpsellButton: {
    backgroundColor: '#2E9E34',
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 4,
    shadowColor: '#237A28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumUpsellButtonText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.white,
  },
});
