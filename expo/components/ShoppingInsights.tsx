import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import ShoppingProgressChart from '@/components/ShoppingProgressChart';
import { shoppingScoreColor } from '@/utils/shopping';
import { pick, getDateLocale } from '@/utils/i18n';
import type { ArchivedShoppingSession } from '@/providers/ShoppingProvider';

/**
 * Bilan de courses : courbe de progression du score et sessions récentes.
 * Affiché en haut de l'écran Courses dès qu'au moins une session a été terminée.
 * (Les statistiques par badge d'ingrédient vivent dans l'écran Historique.)
 */
export default function ShoppingInsights({
  sessions,
}: {
  sessions: ArchivedShoppingSession[];
}) {
  if (sessions.length === 0) return null;

  return (
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
});
