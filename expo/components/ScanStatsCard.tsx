import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { t, tf } from '@/utils/i18n';

/** Compteurs de scans par badge (données d'historique produit, pas de courses). */
export interface ScanStats {
  total: number;
  carcinogenic: number;
  ultraToxic: number;
  processed: number;
  moderation: number;
  approved: number;
}

function StatBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const widthPercent = max > 0 ? (count / max) * 100 : 0;
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{label}</Text>
      <View style={styles.statBarBackground}>
        <View style={[styles.statBarFill, { width: `${Math.max(widthPercent, 2)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.statCount}>{count}</Text>
    </View>
  );
}

/**
 * Bloc « Statistiques » de l'historique : total de produits analysés et
 * répartition par badge. Affiché en tête de l'écran Historique.
 */
export default function ScanStatsCard({ stats }: { stats: ScanStats }) {
  if (stats.total === 0) return null;

  const maxStat = Math.max(stats.carcinogenic, stats.ultraToxic, stats.processed, stats.moderation, stats.approved, 1);

  return (
    <View style={styles.statsCard}>
      <Text style={styles.statsCardTitle}>{t('statistics')}</Text>
      <Text style={styles.statsCardTotal}>{tf('products_analyzed', stats.total)}</Text>
      <View style={styles.statsBreakdown}>
        <StatBar label={t('stat_danger')} count={stats.carcinogenic} max={maxStat} color="#D0260F" />
        <StatBar label={t('filter_ultra_toxic')} count={stats.ultraToxic} max={maxStat} color="#722F37" />
        <StatBar label={t('stat_probable')} count={stats.processed} max={maxStat} color="#E8730A" />
        <StatBar label={t('stat_possible')} count={stats.moderation} max={maxStat} color="#EAB308" />
        <StatBar label={t('stat_safe')} count={stats.approved} max={maxStat} color="#2E9E34" />
      </View>
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
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
});
