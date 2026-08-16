import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { t, tf } from '@/utils/i18n';
import { VerdictTier } from '@/types';

/** Compteurs de scans par badge (données d'historique produit, pas de courses). */
export interface ScanStats {
  total: number;
  carcinogenic: number;
  ultraToxic: number;
  processed: number;
  moderation: number;
  approved: number;
}

type StatRowDef = {
  tier: VerdictTier;
  label: string;
  count: number;
  color: string;
};

function StatBarRow({
  row,
  max,
  isActive,
  pressable,
  onPress,
}: {
  row: StatRowDef;
  max: number;
  isActive: boolean;
  pressable: boolean;
  onPress?: (tier: VerdictTier) => void;
}) {
  const widthPercent = max > 0 ? (row.count / max) * 100 : 0;

  const content = (
    <>
      <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{row.label}</Text>
      <View style={styles.statBarBackground}>
        <View style={[styles.statBarFill, { width: `${Math.max(widthPercent, 2)}%`, backgroundColor: row.color }]} />
      </View>
      <Text style={styles.statCount}>{row.count}</Text>
      {pressable ? (
        <ChevronRight size={13} strokeWidth={2.6} color={isActive ? row.color : Colors.textTertiary} />
      ) : null}
    </>
  );

  if (!pressable || !onPress) {
    return <View style={styles.statRow}>{content}</View>;
  }

  return (
    <Pressable
      onPress={() => onPress(row.tier)}
      style={({ pressed }) => [
        styles.statRow,
        styles.statRowPressable,
        isActive && { backgroundColor: `${row.color}10` },
        pressed && styles.statRowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={row.label}
      accessibilityState={{ selected: isActive }}
      testID={`stats-bar-${row.tier}`}
    >
      {content}
    </Pressable>
  );
}

/**
 * Bloc « Statistiques » de l'historique : total de produits analysés et
 * répartition par badge. Affiché en tête de l'écran Historique.
 * Si `onSelectTier` est fourni, chaque barre devient un bouton de filtre.
 */
export default function ScanStatsCard({
  stats,
  activeTier,
  onSelectTier,
}: {
  stats: ScanStats;
  activeTier?: VerdictTier | null;
  onSelectTier?: (tier: VerdictTier) => void;
}) {
  if (stats.total === 0) return null;

  const rows: StatRowDef[] = [
    { tier: 'carcinogenic', label: t('stat_danger'), count: stats.carcinogenic, color: '#D0260F' },
    { tier: 'ultra_toxic', label: t('filter_ultra_toxic'), count: stats.ultraToxic, color: '#722F37' },
    { tier: 'processed', label: t('stat_probable'), count: stats.processed, color: '#E8730A' },
    { tier: 'moderation', label: t('stat_possible'), count: stats.moderation, color: '#EAB308' },
    { tier: 'approved', label: t('stat_safe'), count: stats.approved, color: '#2E9E34' },
  ];

  const maxStat = Math.max(stats.carcinogenic, stats.ultraToxic, stats.processed, stats.moderation, stats.approved, 1);
  const pressable = Boolean(onSelectTier);

  return (
    <View style={styles.statsCard}>
      <Text style={styles.statsCardTitle}>{t('statistics')}</Text>
      <Text style={styles.statsCardTotal}>{tf('products_analyzed', stats.total)}</Text>
      <View style={styles.statsBreakdown}>
        {rows.map((row) => (
          <StatBarRow
            key={row.tier}
            row={row}
            max={maxStat}
            isActive={activeTier === row.tier}
            pressable={pressable}
            onPress={onSelectTier}
          />
        ))}
      </View>
      {pressable ? (
        <Text style={styles.filterHint}>{t('stats_filter_hint')}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0E2011',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 2,
  },
  statsCardTitle: {
    fontSize: 17,
    fontWeight: '900' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  statsCardTotal: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.textTertiary,
    marginTop: 3,
    marginBottom: 16,
  },
  statsBreakdown: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statRowPressable: {
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statRowPressed: {
    opacity: 0.7,
  },
  statLabel: {
    width: 92,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '800' as const,
  },
  statBarBackground: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surfaceSecondary,
    overflow: 'hidden',
  },
  statBarFill: {
    height: 10,
    borderRadius: 5,
  },
  statCount: {
    width: 28,
    fontSize: 14,
    fontWeight: '900' as const,
    color: Colors.text,
    textAlign: 'right' as const,
  },
  filterHint: {
    marginTop: 14,
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
    fontWeight: '700' as const,
  },
});
