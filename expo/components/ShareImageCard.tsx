import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { RiskGroup, SubstanceDetected, DetectedIngredient, AdditiveInfo } from '@/types';
import { classifySubstanceLevel, classifyAdditiveLevel, SubstanceLevel } from '@/utils/riskScore';
import { t } from '@/utils/i18n';

type VerdictLevel = 'danger' | 'warning' | 'moderation' | 'approuve';

function computeVerdictLevel(props: ShareImageCardProps): VerdictLevel {
  let hasGroup1 = false;
  let hasGroup2A = false;
  let hasGroup2B = false;
  let controversialCount = 0;

  const tally = (level: SubstanceLevel) => {
    if (level === 'group1') hasGroup1 = true;
    else if (level === 'group2a') hasGroup2A = true;
    else if (level === 'group2b') hasGroup2B = true;
    else if (level === 'controversial') controversialCount += 1;
  };

  if (props.detectedAdditives) {
    for (const a of props.detectedAdditives) tally(classifyAdditiveLevel(a));
  }
  if (props.substances) {
    for (const s of props.substances) tally(classifySubstanceLevel(s));
  }
  if (props.detectedIngredients) {
    for (const i of props.detectedIngredients) {
      tally(classifySubstanceLevel({
        classification_circ: i.classification_circ,
        niveau_risque: i.niveau_risque,
        explication: i.explication,
        nom: i.nom,
      }));
    }
  }

  if (hasGroup1) return 'danger';
  if (hasGroup2A || controversialCount >= 2) return 'warning';
  if (controversialCount === 1 || hasGroup2B) return 'moderation';
  return 'approuve';
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

function getVerdictBadge(level: VerdictLevel): { label: string; sublabel: string; color: string; textColor: string; explanation: string } {
  if (level === 'danger') {
    return { label: t('share_danger_label'), sublabel: t('share_danger_sub'), color: '#FF3B30', textColor: '#FFFFFF', explanation: t('share_danger_explanation') };
  }
  if (level === 'warning' || level === 'moderation') {
    return { label: t('share_caution_label'), sublabel: t('share_caution_sub'), color: '#FF9500', textColor: '#FFFFFF', explanation: t('share_caution_explanation') };
  }
  return { label: t('share_approved_label'), sublabel: t('share_approved_sub'), color: '#2E9E34', textColor: '#FFFFFF', explanation: t('share_approved_explanation') };
}

function getTopSubstances(props: ShareImageCardProps): string[] {
  const results: string[] = [];

  const dangerousSubstances = props.substances?.filter(
    s => s.niveau_risque !== 'aucun'
  ) ?? [];
  if (dangerousSubstances.length > 0) {
    for (const s of dangerousSubstances.slice(0, 3)) {
      results.push(s.nom);
    }
    return results;
  }

  const dangerousIngredients = props.detectedIngredients?.filter(
    i => i.niveau_risque !== 'aucun'
  ) ?? [];
  if (dangerousIngredients.length > 0) {
    for (const i of dangerousIngredients.slice(0, 3)) {
      results.push(i.nom);
    }
    return results;
  }

  if (props.detectedAdditives && props.detectedAdditives.length > 0) {
    for (const a of props.detectedAdditives.slice(0, 3)) {
      results.push(a.name);
    }
    return results;
  }

  return results;
}

const TOXISCAN_LOGO = 'https://r2-pub.rork.com/attachments/3a89mndx58c8x8mx5wdrr.png';

export default function ShareImageCard(props: ShareImageCardProps) {
  const { productName, brand, riskGroup, photoUri, thumbnailBase64, imageUrl } = props;
  const verdictLevel = computeVerdictLevel(props);
  const badge = getVerdictBadge(verdictLevel);
  const badgeLabel = badge.label;
  const badgeColor = badge.color;
  const badgeText = badge.textColor;
  const substances = getTopSubstances(props);
  const productImageUri = thumbnailBase64 ?? photoUri ?? imageUrl ?? null;

  return (
    <View style={styles.card}>
      <View style={styles.topSection}>
        <Image source={{ uri: TOXISCAN_LOGO }} style={styles.logo} />
        <Text style={styles.appName}>ToxiScan</Text>
      </View>

      <Text style={styles.productName} numberOfLines={2}>{productName}</Text>
      {brand ? <Text style={styles.brand} numberOfLines={1}>{brand}</Text> : null}

      {productImageUri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: productImageUri }} style={styles.productImage} resizeMode="cover" />
        </View>
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>?</Text>
        </View>
      )}

      <View style={[styles.badgeContainer, { backgroundColor: badgeColor }]}>
        <Text style={[styles.badgeLabel, { color: badgeText }]}>{badgeLabel}</Text>
        {badge.sublabel ? (
          <Text style={[styles.badgeSublabel, { color: badgeText }]}>{badge.sublabel}</Text>
        ) : null}
      </View>

      <View style={styles.explanationSection}>
        <Text style={[styles.explanationText, { color: badgeColor }]}>{badge.explanation}</Text>
      </View>

      {substances.length > 0 ? (
        <View style={styles.substancesSection}>
          <Text style={styles.substancesTitle}>{t('substances_detected')}</Text>
          {substances.map((s, i) => (
            <View key={`sub-${i}`} style={styles.substanceRow}>
              <View style={[styles.substanceDot, { backgroundColor: badgeColor }]} />
              <Text style={styles.substanceText}>{s}</Text>
            </View>
          ))}
        </View>
      ) : riskGroup === 'none' ? (
        <View style={styles.substancesSection}>
          <Text style={styles.safeText}>{t('no_dangerous_substance')}</Text>
        </View>
      ) : null}

      <View style={styles.bottomSection}>
        <View style={styles.divider} />
        <Text style={styles.ctaTitle}>ToxiScan Anti-Cancer</Text>
        <Text style={styles.storeText}>{t('available_app_store')}</Text>
        <Image source={{ uri: TOXISCAN_LOGO }} style={styles.bottomLogo} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 1080,
    height: 1920,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingHorizontal: 80,
    paddingTop: 120,
    paddingBottom: 80,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#2E9E34',
    marginTop: 16,
    letterSpacing: 1,
  },
  productName: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: 58,
    marginBottom: 8,
  },
  brand: {
    fontSize: 32,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 40,
  },
  imageContainer: {
    width: 400,
    height: 400,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#F8F8F8',
    marginBottom: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  productImage: {
    width: 400,
    height: 400,
  },
  imagePlaceholder: {
    width: 400,
    height: 400,
    borderRadius: 32,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  placeholderText: {
    fontSize: 80,
  },
  badgeContainer: {
    paddingHorizontal: 60,
    paddingVertical: 28,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  badgeLabel: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 3,
  },
  badgeSublabel: {
    fontSize: 24,
    marginTop: 8,
    opacity: 0.9,
  },
  substancesSection: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  substancesTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center',
  },
  substanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
    justifyContent: 'center',
  },
  substanceDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  substanceText: {
    fontSize: 28,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  safeText: {
    fontSize: 28,
    color: '#2E9E34',
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  divider: {
    width: 120,
    height: 3,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginBottom: 40,
  },
  explanationSection: {
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  explanationText: {
    fontSize: 26,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 38,
    fontStyle: 'italic' as const,
  },
  ctaTitle: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 1,
  },
  storeText: {
    fontSize: 32,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '500' as const,
  },
  bottomLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.7,
  },
});
