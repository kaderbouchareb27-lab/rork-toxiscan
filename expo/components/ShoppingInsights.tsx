import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import ShoppingProgressChart from '@/components/ShoppingProgressChart';
import { shoppingScoreColor } from '@/utils/shopping';
import { t, tf, pick, getDateLocale } from '@/utils/i18n';
import type { ArchivedShoppingSession } from '@/providers/ShoppingProvider';

/** Compteurs de scans par badge (même forme que les stats de l'historique). */
export interface ShoppingScanStats {
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
 * Bilan de courses : courbe de progression du score, sessions récentes et
 * répartition des produits analysés par badge. Affiché en haut de l'écran
 * Courses dès qu'au moins une session a été terminée.
 */
export default function ShoppingInsights({
  sessions,
  stats,
}: {
  sessions: ArchivedShoppingSession[];
  stats: ShoppingScanStats;
}) {
  if (sessions.length === 0 && stats.total === 0) return null;

  const maxStat = Math.max(stats.carcinogenic, stats.ultraToxic, stats.processed, stats.moderation, stats.approved, 1);

  return (
    <View>
      {sessions.length > 0 ? (
        <View style={styles.sessionsSection}>
          <Text style={styles.sessionsTitle}>
            {pick({ en: 'Shopping sessions', fr: 'Sessions de courses', ko: '장보기 세션' })}
          </Text>
          {sessions.length >= 2 ? <ShoppingProgressChart sessions={sessions} /> : null}
          {sessions.slice(0, 6).map((session) => {
            const date = new Date(session.endedAt).toLocaleDateString(getDateLocale(), {
              day: 'numeric',
              month: 'short',
            });
            const color = shoppingScoreColor(session.score);
            return (
              <View key={session.id} style={styles.sessionCard}>
                <View style={[styles.sessionDot, { backgroundColor: color }]} />
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionTitle}>
                    {date} · {session.items.length}{' '}
                    {session.items.length === 1
                      ? pick({ en: 'item', fr: 'article', ko: '개' })
                      : pick({ en: 'items', fr: 'articles', ko: '개' })}
                  </Text>
                  <Text style={styles.sessionSub}>
                    {pick({ en: 'Average health score', fr: 'Score santé moyen', ko: '평균 건강 점수' })}
                  </Text>
                </View>
                <Text style={[styles.sessionScore, { color }]}>{session.score.toFixed(1)}/10</Text>
              </View>
            );
          })}
        </View>
      ) : null}
      {stats.total > 0 ? (
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sessionsSection: { marginBottom: 14 },
  sessionsTitle: { fontSize: 15, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.2, marginBottom: 10 },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sessionDot: { width: 12, height: 12, borderRadius: 6 },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  sessionSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  sessionScore: { fontSize: 16, fontWeight: '900' as const },
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
