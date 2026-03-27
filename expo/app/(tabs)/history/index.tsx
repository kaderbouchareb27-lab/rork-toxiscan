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
import { Shield, Trash2, Camera, Lock, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useScanHistory, useFilteredHistory } from '@/providers/ScanHistoryProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { getRiskBadgeInfo } from '@/constants/additives';
import { RiskGroup, ScannedProduct } from '@/types';
import HealthAlerts from '@/components/HealthAlerts';

type FilterType = 'all' | RiskGroup;

const FILTERS: { key: FilterType; label: string; color?: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'group1', label: 'Danger', color: '#FF3B30' },
  { key: 'group2a', label: 'Probable', color: '#FF9500' },
  { key: 'group2b', label: 'Possible', color: '#FFCC00' },
  { key: 'none', label: 'OK', color: '#34C759' },
];

export default function HistoryScreen() {
  const [showAlerts, setShowAlerts] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { clearHistory } = useScanHistory();
  const { isPro } = useSubscription();
  const filteredHistory = useFilteredHistory(activeFilter, isPro);

  const displayedHistory = filteredHistory;

  const handleProductPress = useCallback((barcode: string) => {
    console.log('[History] Opening product:', barcode);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/product/${barcode}`);
  }, []);

  const handleFilterPress = useCallback((filterKey: FilterType) => {
    console.log('[History] Filter changed to:', filterKey);
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    setActiveFilter(filterKey);
  }, []);

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
          <View style={[styles.badgeDot, { backgroundColor: badge.color }]} />
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleProductPress]);

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
              ]}
              onPress={() => handleFilterPress(filter.key)}
              testID={`filter-${filter.key}`}
            >
              {filter.color && activeFilter !== filter.key ? (
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
            </TouchableOpacity>
          )}
        />
      </View>

      {isPro ? (
        <>
          <TouchableOpacity
            style={styles.alertsToggle}
            onPress={() => setShowAlerts(prev => !prev)}
            activeOpacity={0.7}
            testID="toggle-alerts"
          >
            <Text style={styles.alertsToggleText}>Alertes santé</Text>
            {showAlerts ? (
              <ChevronUp color={Colors.primary} size={18} />
            ) : (
              <ChevronDown color={Colors.primary} size={18} />
            )}
          </TouchableOpacity>

          {showAlerts && (
            <View style={styles.alertsSection}>
              <HealthAlerts />
            </View>
          )}
        </>
      ) : (
        <TouchableOpacity
          style={styles.alertsLockedBanner}
          onPress={() => router.push('/paywall?source=alerts')}
          activeOpacity={0.8}
          testID="alerts-locked"
        >
          <Lock color={Colors.primary} size={16} />
          <Text style={styles.alertsLockedText}>Alertes en temps réel — Abonnement Pro</Text>
          <ChevronRight color={Colors.textTertiary} size={16} />
        </TouchableOpacity>
      )}

      {!isPro && (
        <View style={styles.historyInfoBanner}>
          <Text style={styles.historyInfoText}>
            Historique du jour uniquement — Abonnez-vous pour sauvegarder vos scans
          </Text>
        </View>
      )}

      {filteredHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Shield color={Colors.textTertiary} size={48} strokeWidth={1.2} />
          <Text style={styles.emptyTitle}>
            {isPro ? 'Aucun produit analysé' : 'Aucun scan aujourd\'hui'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isPro ? 'Photographiez ou scannez votre premier produit' : 'Photographiez un produit pour le voir ici'}
          </Text>
          {!isPro && (
            <TouchableOpacity
              style={styles.unlockFullHistoryButton}
              onPress={() => router.push('/paywall?source=history')}
              activeOpacity={0.8}
              testID="history-unlock"
            >
              <Lock color={Colors.white} size={14} />
              <Text style={styles.unlockFullHistoryText}>Débloquer l'historique complet</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={displayedHistory}
          keyExtractor={(item) => item.barcode}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={!isPro ? (
            <TouchableOpacity
              style={styles.lockedBanner}
              onPress={() => router.push('/paywall?source=history')}
              activeOpacity={0.8}
              testID="history-unlock"
            >
              <Lock color={Colors.primary} size={18} />
              <View style={styles.lockedInfo}>
                <Text style={styles.lockedTitle}>Historique permanent</Text>
                <Text style={styles.lockedSubtitle}>
                  Sauvegardez tous vos scans — Passez à Pro
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
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
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.06)',
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },
  lockedInfo: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  lockedSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  alertsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(52, 199, 89, 0.05)',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  alertsToggleText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  alertsSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  alertsLockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.04)',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  alertsLockedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
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
  unlockFullHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 16,
  },
  unlockFullHistoryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
