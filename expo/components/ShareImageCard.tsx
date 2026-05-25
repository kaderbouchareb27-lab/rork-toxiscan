import React from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RiskGroup, SubstanceDetected, DetectedIngredient, AdditiveInfo } from '@/types';
import { t } from '@/utils/i18n';
import Colors from '@/constants/colors';
import { getDrToxiBadgeAvatarForVerdict } from '@/constants/drToxiAvatars';

type VerdictLevel = 'danger' | 'warning' | 'moderation' | 'approuve';

type VerdictBadge = {
  label: string;
  eyebrow: string;
  sublabel: string;
  color: string;
  softColor: string;
  glowColor: string;
  textColor: string;
  explanation: string;
};

/**
 * Derive verdict level from product.riskGroup — identical to product page logic.
 * This guarantees the share card badge matches what the user sees on screen.
 */
function computeVerdictLevel(riskGroup: RiskGroup): VerdictLevel {
  switch (riskGroup) {
    case 'group1':
      return 'danger';
    case 'group2a':
      return 'warning';
    case 'group2b':
      return 'moderation';
    default:
      return 'approuve';
  }
}

interface ShareImageCardProps {
  productName: string;
  brand: string;
  riskGroup: RiskGroup;
  photoUri?: string | null;
  thumbnailBase64?: string | null;
  imageUrl?: string | null;
  substances?: SubstanceDetected[];
  detectedIngredients?: DetectedIngredient[];
  detectedAdditives?: AdditiveInfo[];
}

/**
 * Badge configuration uses the same risk colors as the product page.
 */
function getVerdictBadge(level: VerdictLevel): VerdictBadge {
  switch (level) {
    case 'danger':
      return {
        label: t('badge_danger'),
        eyebrow: t('share_verdict_eyebrow_danger'),
        sublabel: t('share_danger_sub'),
        color: Colors.danger,
        softColor: '#FFF0ED',
        glowColor: 'rgba(208, 38, 15, 0.20)',
        textColor: '#FFFFFF',
        explanation: t('share_danger_explanation'),
      };
    case 'warning':
      return {
        label: t('badge_caution'),
        eyebrow: t('share_verdict_eyebrow_warning'),
        sublabel: t('share_caution_sub'),
        color: Colors.warning,
        softColor: '#FFF3E7',
        glowColor: 'rgba(232, 115, 10, 0.22)',
        textColor: '#FFFFFF',
        explanation: t('share_caution_explanation'),
      };
    case 'moderation':
      return {
        label: t('badge_moderation'),
        eyebrow: t('share_verdict_eyebrow_moderation'),
        sublabel: t('share_caution_sub'),
        color: Colors.caution,
        softColor: '#FFF8DB',
        glowColor: 'rgba(234, 179, 8, 0.25)',
        textColor: '#1D1703',
        explanation: t('share_caution_explanation'),
      };
    case 'approuve':
      return {
        label: t('badge_approved'),
        eyebrow: t('share_verdict_eyebrow_approved'),
        sublabel: t('share_approved_sub'),
        color: Colors.safe,
        softColor: '#EAF8EC',
        glowColor: 'rgba(46, 158, 52, 0.22)',
        textColor: '#FFFFFF',
        explanation: t('share_approved_explanation'),
      };
  }
}

/**
 * Order risk levels from most to least concerning so that when there are more
 * than 5 problematic items we surface the worst offenders first.
 */
const RISK_ORDER: Record<string, number> = {
  eleve: 0,
  élevé: 0,
  high: 0,
  danger: 0,
  probable: 1,
  modere: 2,
  modéré: 2,
  moderate: 2,
  possible: 2,
  faible: 3,
  low: 3,
};

function riskRank(level: string | undefined): number {
  if (!level) return 99;
  const normalized = level.toLowerCase();
  return RISK_ORDER[normalized] ?? 50;
}

const MAX_SUBSTANCES = 4;

function getTopSubstances(props: ShareImageCardProps): string[] {
  const results: string[] = [];

  const dangerousSubstances = (props.substances ?? [])
    .filter((s: SubstanceDetected) => s.niveau_risque !== 'aucun')
    .slice()
    .sort((a: SubstanceDetected, b: SubstanceDetected) => riskRank(a.niveau_risque) - riskRank(b.niveau_risque));
  if (dangerousSubstances.length > 0) {
    for (const s of dangerousSubstances.slice(0, MAX_SUBSTANCES)) {
      results.push(s.nom);
    }
    return results;
  }

  const dangerousIngredients = (props.detectedIngredients ?? [])
    .filter((i: DetectedIngredient) => i.niveau_risque !== 'aucun')
    .slice()
    .sort((a: DetectedIngredient, b: DetectedIngredient) => riskRank(a.niveau_risque) - riskRank(b.niveau_risque));
  if (dangerousIngredients.length > 0) {
    for (const i of dangerousIngredients.slice(0, MAX_SUBSTANCES)) {
      results.push(i.nom);
    }
    return results;
  }

  if (props.detectedAdditives && props.detectedAdditives.length > 0) {
    const sortedAdditives = props.detectedAdditives
      .slice()
      .sort((a: AdditiveInfo, b: AdditiveInfo) => riskGroupRank(a.group) - riskGroupRank(b.group));
    for (const a of sortedAdditives.slice(0, MAX_SUBSTANCES)) {
      results.push(a.name);
    }
    return results;
  }

  return results;
}

function riskGroupRank(group: RiskGroup): number {
  switch (group) {
    case 'group1':
      return 0;
    case 'group2a':
      return 1;
    case 'group2b':
      return 2;
    case 'none':
      return 99;
  }
}

const TOXISCAN_LOGO = require('../assets/images/icon.png') as ImageSourcePropType;

export default function ShareImageCard(props: ShareImageCardProps) {
  const { productName, brand, riskGroup, photoUri, thumbnailBase64, imageUrl } = props;
  const verdictLevel = computeVerdictLevel(riskGroup);
  const badge = getVerdictBadge(verdictLevel);
  const substances = getTopSubstances(props);
  const productImageUri = thumbnailBase64 ?? photoUri ?? imageUrl ?? null;
  const drToxiAvatarUri = getDrToxiBadgeAvatarForVerdict(verdictLevel);
  const hasRiskSignals = substances.length > 0;

  return (
    <View style={styles.card}>
      <View style={[styles.backgroundOrb, styles.backgroundOrbTop, { backgroundColor: badge.softColor }]} />
      <View style={[styles.backgroundOrb, styles.backgroundOrbBottom, { backgroundColor: badge.glowColor }]} />

      <View style={styles.topSection}>
        <View style={styles.logoWrap}>
          <Image source={TOXISCAN_LOGO} style={styles.logo} />
        </View>
        <View style={styles.topTextBlock}>
          <Text style={styles.appKicker}>{t('share_card_kicker')}</Text>
          <Text style={styles.appName}>ToxiScan</Text>
        </View>
      </View>

      <View style={styles.heroSection}>
        <View style={[styles.verdictAura, { backgroundColor: badge.glowColor }]} />
        <View style={styles.productImageShadow}>
          {productImageUri ? (
            <Image source={{ uri: productImageUri }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>ToxiScan</Text>
            </View>
          )}
        </View>

        {drToxiAvatarUri ? (
          <View style={[styles.drToxiBubble, { borderColor: badge.color, backgroundColor: badge.softColor }]}>
            <Image source={{ uri: drToxiAvatarUri }} style={styles.drToxiAvatar} resizeMode="cover" />
          </View>
        ) : null}
      </View>

      <View style={styles.productBlock}>
        <Text style={styles.productName} numberOfLines={2}>{productName}</Text>
        {brand ? <Text style={styles.brand} numberOfLines={1}>{brand}</Text> : null}
      </View>

      <LinearGradient
        colors={[badge.color, badge.color]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badgeContainer, { shadowColor: badge.color }]}
      >
        <Text style={[styles.badgeEyebrow, { color: badge.textColor }]}>{badge.eyebrow}</Text>
        <Text style={[styles.badgeLabel, { color: badge.textColor }]} numberOfLines={1}>{badge.label}</Text>
        <Text style={[styles.badgeSublabel, { color: badge.textColor }]} numberOfLines={1}>{badge.sublabel}</Text>
      </LinearGradient>

      <View style={[styles.explanationSection, { borderColor: badge.color, backgroundColor: badge.softColor }]}>
        <Text style={[styles.explanationText, { color: badge.color }]} numberOfLines={3}>{badge.explanation}</Text>
      </View>

      <View style={styles.substancesSection}>
        {hasRiskSignals ? (
          <>
            <Text style={styles.substancesTitle}>{t('substances_detected')}</Text>
            <View style={styles.substanceGrid}>
              {substances.map((substance: string, index: number) => (
                <View key={`${substance}-${index}`} style={styles.substanceChip}>
                  <View style={[styles.substanceDot, { backgroundColor: badge.color }]} />
                  <Text style={styles.substanceText} numberOfLines={1}>{substance}</Text>
                </View>
              ))}
            </View>
          </>
        ) : riskGroup === 'none' ? (
          <View style={[styles.safeCard, { backgroundColor: badge.softColor }]}> 
            <View style={[styles.safeDot, { backgroundColor: badge.color }]} />
            <Text style={styles.safeText}>{t('no_dangerous_substance')}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.adCard}>
          <Image source={TOXISCAN_LOGO} style={styles.bottomLogo} />
          <View style={styles.adTextBlock}>
            <Text style={styles.ctaTitle}>{t('share_promo_title')}</Text>
            <Text style={styles.storeText}>{t('share_promo_subtitle')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 1080,
    height: 1920,
    backgroundColor: '#FAFAF8',
    alignItems: 'center',
    paddingHorizontal: 72,
    paddingTop: 92,
    paddingBottom: 72,
    overflow: 'hidden',
  },
  backgroundOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.9,
  },
  backgroundOrbTop: {
    width: 620,
    height: 620,
    top: -210,
    right: -230,
  },
  backgroundOrbBottom: {
    width: 760,
    height: 760,
    bottom: -320,
    left: -250,
  },
  topSection: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 26,
    marginBottom: 66,
  },
  logoWrap: {
    width: 118,
    height: 118,
    borderRadius: 34,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.10,
    shadowRadius: 28,
    elevation: 8,
  },
  logo: {
    width: 118,
    height: 118,
    borderRadius: 34,
  },
  topTextBlock: {
    flex: 1,
  },
  appKicker: {
    fontSize: 24,
    fontWeight: '800',
    color: '#6D736B',
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  appName: {
    fontSize: 64,
    fontWeight: '900',
    color: '#111814',
    letterSpacing: -2,
  },
  heroSection: {
    width: '100%',
    height: 520,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 52,
  },
  verdictAura: {
    position: 'absolute',
    width: 560,
    height: 560,
    borderRadius: 280,
    opacity: 1,
  },
  productImageShadow: {
    width: 460,
    height: 460,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 12,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.14,
    shadowRadius: 40,
    elevation: 14,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#2E9E34',
    letterSpacing: -0.6,
  },
  drToxiBubble: {
    position: 'absolute',
    right: 110,
    bottom: 22,
    width: 178,
    height: 178,
    borderRadius: 89,
    borderWidth: 8,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 12,
  },
  drToxiAvatar: {
    width: '100%',
    height: '100%',
  },
  productBlock: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 38,
  },
  productName: {
    fontSize: 58,
    fontWeight: '900',
    color: '#111814',
    textAlign: 'center',
    lineHeight: 66,
    letterSpacing: -1.5,
    marginBottom: 12,
  },
  brand: {
    fontSize: 31,
    color: '#626760',
    textAlign: 'center',
    fontWeight: '700',
  },
  badgeContainer: {
    width: '100%',
    borderRadius: 42,
    paddingHorizontal: 56,
    paddingVertical: 34,
    alignItems: 'center',
    marginBottom: 28,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 10,
  },
  badgeEyebrow: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3.6,
    opacity: 0.78,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  badgeLabel: {
    fontSize: 62,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  badgeSublabel: {
    fontSize: 27,
    fontWeight: '800',
    marginTop: 10,
    opacity: 0.88,
    textAlign: 'center',
  },
  explanationSection: {
    width: '100%',
    borderRadius: 34,
    borderWidth: 2,
    paddingHorizontal: 36,
    paddingVertical: 27,
    marginBottom: 30,
  },
  explanationText: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 39,
  },
  substancesSection: {
    width: '100%',
    minHeight: 180,
    marginBottom: 18,
  },
  substancesTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#111814',
    marginBottom: 18,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  substanceGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  substanceChip: {
    maxWidth: 430,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E8E1D6',
  },
  substanceDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  substanceText: {
    fontSize: 25,
    color: '#111814',
    fontWeight: '800',
    maxWidth: 345,
  },
  safeCard: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 999,
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  safeDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  safeText: {
    fontSize: 28,
    color: '#111814',
    fontWeight: '900',
    textAlign: 'center',
  },
  bottomSection: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  adCard: {
    width: '100%',
    minHeight: 154,
    borderRadius: 38,
    backgroundColor: '#111814',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 26,
    paddingHorizontal: 34,
    paddingVertical: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
  bottomLogo: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: '#F5F0E8',
  },
  adTextBlock: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  storeText: {
    fontSize: 25,
    color: 'rgba(255,255,255,0.76)',
    fontWeight: '700',
    lineHeight: 32,
  },
});
