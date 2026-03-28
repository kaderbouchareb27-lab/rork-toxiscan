import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Shield, Trash2, Camera, Lock, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useScanHistory, useFilteredHistory } from '@/providers/ScanHistoryProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { getRiskBadgeInfo } from '@/constants/additives';
import { RiskGroup, ScannedProduct } from '@/types';

type FilterType = 'all' | 'favorites' | RiskGroup;

const FILTERS: { key: FilterType; label: string; color?: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'favorites', label: 'Favoris', color: '#FF2D55' },
  { key: 'group1', label: 'Danger', color: '#FF3B30' },
  { key: 'group2a', label: 'Probable', color: '#FF9500' },
  { key: 'group2b', label: 'Possible', color: '#FFCC00' },
  { key: 'none', label: 'OK', color: '#34C759' },
];

export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { clearHistory, history } = useScanHistory();
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
    console.log('[History] Clearing history');
    clearHistory();
  }, [clearHistory]);

  const renderProduct = useCallback(({ item }: { item: ScannedProduct }) => {
    const badge = getRiskBadgeInfo(item.riskGroup);
    const date = new Date(item.scannedAt);
    const formattedDate = date.toLocaleDateString('fr-FR', {
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
          <Lock color="#34C759" size={22} />
        </View>
        <Text style={styles.premiumUpsellTitle}>Historique complet</Text>
        <Text style={styles.premiumUpsellText}>
          Retrouvez tous vos produits scannés avec ToxiScan Pro
        </Text>
        <TouchableOpacity
          style={styles.premiumUpsellButton}
          onPress={() => router.push('/paywall?source=history')}
          activeOpacity={0.85}
          testID="history-unlock"
        >
          <Text style={styles.premiumUpsellButtonText}>Voir les offres</Text>
        </TouchableOpacity>
      </View>
    );
  }, [showPremiumUpsell]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
        {filteredHistory.length > 0 && (
          <TouchableOpacity onPress={handleClearHistory} style={styles.clearButton} testID="clear-history">
            <Trash2 color={Colors.textSecondary} size={18} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={FILTERS}
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
            3 derniers produits visibles — Illimité avec Pro
          </Text>
        </View>
      )}

      {filteredHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Shield color={Colors.textTertiary} size={48} strokeWidth={1.2} />
          <Text style={styles.emptyTitle}>
            {activeFilter === 'favorites' ? 'Aucun favori' : 'Aucun produit analysé'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === 'favorites'
              ? 'Ajoutez des produits en favoris depuis la fiche résultat'
              : 'Photographiez un produit pour le voir ici'}
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
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    paddingVertical: 8,
  },
  filtersList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.text,
  },
  filterChipLocked: {
    opacity: 0.7,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  historyInfoBanner: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 149, 0, 0.06)',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  historyInfoText: {
    fontSize: 12,
    color: '#FF9500',
    textAlign: 'center',
    fontWeight: '500' as const,
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
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  thumbnailPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.surface,
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
  },
  productBrand: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badgeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  premiumUpsellCard: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#34C759',
    backgroundColor: 'rgba(52, 199, 89, 0.04)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  premiumUpsellIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  premiumUpsellTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  premiumUpsellText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  premiumUpsellButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 4,
  },
  premiumUpsellButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
// History screen for ToxiScan
