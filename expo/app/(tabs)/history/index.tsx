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
import { Shield, Trash2, Camera, Lock, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useScanHistory, useFilteredHistory } from '@/providers/ScanHistoryProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { getRiskBadgeInfo, productCategoryToAdditiveCategory } from '@/constants/additives';
import { RiskGroup, ScannedProduct } from '@/types';
import { t, getDateLocale } from '@/utils/i18n';

type FilterType = 'all' | 'favorites' | RiskGroup;

function getFilters(): { key: FilterType; label: string; color?: string }[] {
  return [
    { key: 'all', label: t('filter_all') },
    { key: 'favorites', label: t('filter_favorites'), color: '#FF2D55' },
    { key: 'group1', label: t('filter_danger'), color: '#D0260F' },
    { key: 'group2a', label: t('filter_warning'), color: '#E8730A' },
    { key: 'group2b', label: t('filter_caution'), color: '#EAB308' },
    { key: 'none', label: t('filter_approved'), color: '#22C55E' },
  ];
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
    <Animated.View style={[styles.productRow, { opacity }]} testID="skeleton-row">
      <View style={[styles.thumbnailPlaceholder, { backgroundColor: '#F0F0EE' }]} />
      <View style={styles.productInfo}>
        <View style={{ width: 140, height: 14, borderRadius: 7, backgroundColor: '#F0F0EE', marginBottom: 8 }} />
        <View style={{ width: 90, height: 10, borderRadius: 5, backgroundColor: '#F4F4F2' }} />
      </View>
      <View style={{ width: 70, height: 22, borderRadius: 11, backgroundColor: '#F0F0EE' }} />
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
    const badge = getRiskBadgeInfo(item.riskGroup, productCategoryToAdditiveCategory(item.productCategory));
    const date = new Date(item.scannedAt);
    const formattedDate = date.toLocaleDateString(getDateLocale(), {
      day: 'numeric',
      month: 'short',
    });
    const isPhoto = item.scanMethod === 'photo';

    return (
      <TouchableOpacity
        style={styles.productRow}
        onPress={() => handleProductPress(item.barcode)}
        activeOpacity={0.7}
        testID={`history-item-${item.barcode}`}
      >
        {isPhoto && item.thumbnailBase64 ? (
          <Image source={{ uri: item.thumbnailBase64 }} style={styles.thumbnail} contentFit="cover" />
        ) : isPhoto && item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={styles.thumbnail} contentFit="cover" />
        ) : item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} contentFit="contain" />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            {isPhoto ? (
              <Camera color={Colors.textTertiary} size={20} />
            ) : (
              <Shield color={Colors.textTertiary} size={20} />
            )}
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productBrand} numberOfLines={1}>{item.brand}</Text>
        </View>
        <View style={styles.badgeColumn}>
          {item.isFavorite && (
            <Heart color="#FF2D55" size={14} fill="#FF2D55" />
          )}
          <View style={[styles.badgeDot, { backgroundColor: badge.color }]} />
          <Text style={styles.dateText}>{formattedDate}</Text>
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
        <Text style={styles.title}>{t('history_title')}</Text>
        {filteredHistory.length > 0 && (
          <TouchableOpacity onPress={handleClearHistory} style={styles.clearButton} testID="clear-history">
            <Trash2 color={Colors.textSecondary} size={18} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={getFilters()}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item: filter }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === filter.key && styles.filterChipActive,
                activeFilter === filter.key && filter.color ? { backgroundColor: filter.color } : undefined,
                filter.key === 'favorites' && !isPro ? styles.filterChipLocked : undefined,
              ]}
              onPress={() => handleFilterPress(filter.key)}
              testID={`filter-${filter.key}`}
            >
              {filter.key === 'favorites' ? (
                <Heart color={activeFilter === 'favorites' ? Colors.white : '#FF2D55'} size={12} fill={activeFilter === 'favorites' ? Colors.white : '#FF2D55'} />
              ) : filter.color && activeFilter !== filter.key ? (
                <View style={[styles.filterDot, { backgroundColor: filter.color }]} />
              ) : null}
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === filter.key && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
              {filter.key === 'favorites' && !isPro && (
                <Lock color={Colors.textTertiary} size={10} />
              )}
            </TouchableOpacity>
          )}
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
          <Shield color={Colors.textTertiary} size={48} strokeWidth={1.2} />
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
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  clearButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
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
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: Colors.text,
    shadowOpacity: 0.1,
  },
  filterChipLocked: {
    opacity: 0.6,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  historyInfoBanner: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 149, 0, 0.06)',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 4,
  },
  historyInfoText: {
    fontSize: 12,
    color: '#FF9500',
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
  },
  thumbnailPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.1,
  },
  productBrand: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 5,
  },
  badgeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dateText: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  premiumUpsellCard: {
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
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
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  premiumUpsellText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
