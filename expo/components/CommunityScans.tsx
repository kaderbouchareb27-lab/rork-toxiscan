import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Users } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface CommunityProduct {
  id: string;
  name: string;
  brand: string;
  badge: 'danger' | 'probable' | 'possible' | 'safe';
  badgeLabel: string;
}

const COMMUNITY_PRODUCTS: CommunityProduct[] = [
  {
    id: 'cp-1',
    name: 'Jambon blanc tranché',
    brand: 'Fleury Michon',
    badge: 'danger',
    badgeLabel: 'Danger',
  },
  {
    id: 'cp-2',
    name: 'Coca-Cola Zero',
    brand: 'Coca-Cola',
    badge: 'probable',
    badgeLabel: 'Détecté',
  },
  {
    id: 'cp-3',
    name: 'Huile d\'olive extra vierge',
    brand: 'Puget',
    badge: 'safe',
    badgeLabel: 'OK',
  },
  {
    id: 'cp-4',
    name: 'Nutella',
    brand: 'Ferrero',
    badge: 'probable',
    badgeLabel: 'Détecté',
  },
];

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  danger: { bg: 'rgba(255, 59, 48, 0.1)', text: '#FF3B30' },
  probable: { bg: 'rgba(255, 149, 0, 0.1)', text: '#FF9500' },
  possible: { bg: 'rgba(255, 204, 0, 0.12)', text: '#B8860B' },
  safe: { bg: 'rgba(52, 199, 89, 0.1)', text: '#34C759' },
};

export default function CommunityScans() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Users color={Colors.primary} size={16} strokeWidth={2} />
        </View>
        <Text style={styles.headerTitle}>Scannés par la communauté</Text>
      </View>

      <View style={styles.list}>
        {COMMUNITY_PRODUCTS.map((product) => {
          const badgeColor = BADGE_COLORS[product.badge] ?? BADGE_COLORS.safe;
          return (
            <View key={product.id} style={styles.productRow}>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.productBrand}>{product.brand}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: badgeColor.bg }]}>
                <Text style={[styles.badgeText, { color: badgeColor.text }]}>
                  {product.badgeLabel}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  list: {
    gap: 0,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F5',
    gap: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  productBrand: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
});
