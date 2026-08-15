import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Path,
  Line,
  Circle,
  Text as SvgText,
  G,
} from 'react-native-svg';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { shoppingScoreColor } from '@/utils/shopping';
import { pick, getDateLocale } from '@/utils/i18n';
import type { ArchivedShoppingSession } from '@/providers/ShoppingProvider';

const CHART_HEIGHT = 150;
const PLOT_PADDING = 10;
const Y_AXIS_WIDTH = 30;
const CARD_PADDING = 18;
const HEALTHY_THRESHOLD = 8;

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short' });
}

/**
 * Courbe de progression du score moyen des sessions de courses (plus haut = plus sain).
 * Rend un graphique ligne + aire avec le seuil « sain » (8/10) en pointillés.
 */
export default function ShoppingProgressChart({ sessions }: { sessions: ArchivedShoppingSession[] }) {
  const [cardWidth, setCardWidth] = useState(0);

  // Ordre chronologique : la plus ancienne → la plus récente.
  const ordered = useMemo(() => [...sessions].reverse(), [sessions]);

  if (ordered.length === 0) return null;

  const totalWidth = cardWidth - CARD_PADDING * 2;
  const plotWidth = Math.max(40, totalWidth - Y_AXIS_WIDTH);
  const plotTop = PLOT_PADDING;
  const plotBottom = CHART_HEIGHT - PLOT_PADDING;
  const plotHeight = plotBottom - plotTop;

  const yForScore = (score: number): number => {
    const clamped = Math.max(0, Math.min(10, score));
    return plotBottom - (clamped / 10) * plotHeight;
  };

  const points = ordered.map((session, i) => {
    const x = Y_AXIS_WIDTH + (ordered.length === 1 ? plotWidth / 2 : (i / (ordered.length - 1)) * plotWidth);
    return { x, y: yForScore(session.score), score: session.score, id: session.id };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${plotBottom} L ${points[0].x.toFixed(1)} ${plotBottom} Z`
      : '';

  const firstScore = ordered[0].score;
  const lastScore = ordered[ordered.length - 1].score;
  const delta = Math.round((lastScore - firstScore) * 10) / 10;
  const trendUp = delta > 0.05;
  const trendDown = delta < -0.05;
  const deltaLabel = delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  const trendColor = trendUp ? '#2E9E34' : trendDown ? '#D0260F' : Colors.textSecondary;
  const trendBadgeBg = trendUp ? 'rgba(46,158,52,0.12)' : trendDown ? 'rgba(208,38,15,0.10)' : 'rgba(98,103,96,0.12)';

  const handleLayout = (e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next !== cardWidth) setCardWidth(next);
  };

  return (
    <View style={styles.card} onLayout={handleLayout}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>
            {pick({ en: 'Score trend', fr: 'Évolution du score', ko: '점수 추이' })}
          </Text>
          <Text style={styles.subtitle}>
            {pick({ en: 'Average per shopping session', fr: 'Moyenne par session de courses', ko: '장보기 세션별 평균' })}
          </Text>
        </View>
        <View style={[styles.trendBadge, { backgroundColor: trendBadgeBg }]}>
          {trendUp ? (
            <TrendingUp color={trendColor} size={14} strokeWidth={2.6} />
          ) : trendDown ? (
            <TrendingDown color={trendColor} size={14} strokeWidth={2.6} />
          ) : (
            <Minus color={trendColor} size={14} strokeWidth={2.6} />
          )}
          <Text style={[styles.trendText, { color: trendColor }]}>{ordered.length > 1 ? deltaLabel : '—'}</Text>
        </View>
      </View>

      {cardWidth > 0 ? (
        <Svg width={totalWidth} height={CHART_HEIGHT}>
          <Defs>
            <SvgLinearGradient id="shoppingChartArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="rgba(46,158,52,0.24)" />
              <Stop offset="1" stopColor="rgba(46,158,52,0.01)" />
            </SvgLinearGradient>
          </Defs>

          {/* Grille horizontale + graduations (10 / 5 / 0). */}
          {[10, 5, 0].map((level) => {
            const y = yForScore(level);
            return (
              <G key={level}>
                <Line x1={Y_AXIS_WIDTH} y1={y} x2={totalWidth} y2={y} stroke={Colors.borderLight} strokeWidth={1} />
                <SvgText x={Y_AXIS_WIDTH - 6} y={y + 3.5} fontSize={10} fill={Colors.textTertiary} textAnchor="end">
                  {level}
                </SvgText>
              </G>
            );
          })}

          {/* Seuil « sain » à 8/10 (pointillés verts). */}
          <Line
            x1={Y_AXIS_WIDTH}
            y1={yForScore(HEALTHY_THRESHOLD)}
            x2={totalWidth}
            y2={yForScore(HEALTHY_THRESHOLD)}
            stroke="#2E9E34"
            strokeWidth={1}
            strokeDasharray="4 5"
            opacity={0.55}
          />
          <SvgText
            x={Y_AXIS_WIDTH - 6}
            y={yForScore(HEALTHY_THRESHOLD) + 3.5}
            fontSize={10}
            fill="#2E9E34"
            textAnchor="end"
            fontWeight="bold"
          >
            {HEALTHY_THRESHOLD}
          </SvgText>

          {/* Aire sous la courbe. */}
          {points.length > 1 ? <Path d={areaPath} fill="url(#shoppingChartArea)" /> : null}

          {/* Ligne de tendance. */}
          {points.length > 1 ? (
            <Path d={linePath} stroke={Colors.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          ) : null}

          {/* Points (le plus récent est mis en avant). */}
          {points.map((p, i) => {
            const isLast = i === points.length - 1;
            return (
              <G key={p.id}>
                {isLast ? <Circle cx={p.x} cy={p.y} r={9} fill="rgba(46,158,52,0.14)" /> : null}
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={isLast ? 5.5 : 4.5}
                  fill={shoppingScoreColor(p.score)}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              </G>
            );
          })}
        </Svg>
      ) : null}

      <View style={styles.axisFooter}>
        <Text style={styles.axisDate}>{formatSessionDate(ordered[0].endedAt)}</Text>
        {ordered.length > 1 ? <Text style={styles.axisDate}>{formatSessionDate(ordered[ordered.length - 1].endedAt)}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    padding: CARD_PADDING,
    marginBottom: 14,
    shadowColor: '#0E2011',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  headerTextBlock: { flex: 1 },
  title: { fontSize: 17, fontWeight: '900' as const, color: Colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, fontWeight: '700' as const, color: Colors.textSecondary, marginTop: 2 },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  trendText: { fontSize: 13, fontWeight: '900' as const },
  axisFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  axisDate: { fontSize: 11, fontWeight: '700' as const, color: Colors.textTertiary },
});
