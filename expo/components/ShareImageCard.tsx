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
      };
  }
}

type IngredientRiskLevel = 'danger' | 'warning' | 'moderation' | 'approuve';

type SubstanceItem = {
  name: string;
  level: IngredientRiskLevel;
};

/**
 * Map a raw ingredient/substance niveau_risque value to the share-card risk level.
 */
function mapNiveauRisqueToLevel(niveau: string | undefined): IngredientRiskLevel {
  switch (niveau) {
    case 'danger':
      return 'danger';
    case 'probable':
      return 'warning';
    case 'possible':
      return 'moderation';
    default:
      return 'approuve';
  }
}

/**
 * Map an additive group to the share-card risk level.
 */
function mapAdditiveGroupToLevel(group: RiskGroup): IngredientRiskLevel {
  switch (group) {
    case 'group1':
      return 'danger';
    case 'group2a':
      return 'warning';
    case 'group2b':
      return 'moderation';
    case 'none':
    default:
      return 'approuve';
  }
}

function ingredientLevelRank(level: IngredientRiskLevel): number {
  switch (level) {
    case 'danger':
      return 0;
    case 'warning':
      return 1;
    case 'moderation':
      return 2;
    case 'approuve':
      return 3;
  }
}

const MAX_INGREDIENTS = 5;

/**
 * Returns up to 5 ingredients ordered worst-first, each with its individual risk level.
 * Picks substances first (richest data), then detectedIngredients, then detectedAdditives.
 */
function getTopItems(props: ShareImageCardProps): SubstanceItem[] {
  const items: SubstanceItem[] = [];
  const seen = new Set<string>();

  const pushUnique = (name: string, level: IngredientRiskLevel) => {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push({ name, level });
  };

  if (props.substances && props.substances.length > 0) {
    for (const s of props.substances) {
      if (s.niveau_risque === 'aucun') continue;
      pushUnique(s.nom, mapNiveauRisqueToLevel(s.niveau_risque));
    }
  }

  if (items.length < MAX_INGREDIENTS && props.detectedIngredients && props.detectedIngredients.length > 0) {
    for (const i of props.detectedIngredients) {
      if (i.niveau_risque === 'aucun') continue;
      pushUnique(i.nom, mapNiveauRisqueToLevel(i.niveau_risque));
    }
  }

  if (items.length < MAX_INGREDIENTS && props.detectedAdditives && props.detectedAdditives.length > 0) {
    for (const a of props.detectedAdditives) {
      if (a.group === 'none') continue;
      pushUnique(a.name, mapAdditiveGroupToLevel(a.group));
    }
  }

  items.sort((a, b) => ingredientLevelRank(a.level) - ingredientLevelRank(b.level));
  return items.slice(0, MAX_INGREDIENTS);
}

type RiskRowStyle = {
  color: string;
  softColor: string;
  label: string;
};

function getRiskRowStyle(level: IngredientRiskLevel): RiskRowStyle {
  switch (level) {
    case 'danger':
      return { color: Colors.danger, softColor: '#FFF0ED', label: t('badge_danger') };
    case 'warning':
      return { color: Colors.warning, softColor: '#FFF3E7', label: t('badge_caution') };
    case 'moderation':
      return { color: Colors.caution, softColor: '#FFF8DB', label: t('badge_moderation') };
    case 'approuve':
      return { color: Colors.safe, softColor: '#EAF8EC', label: t('badge_approved') };
  }
}

const TOXISCAN_LOGO = require('../assets/images/icon.png') as ImageSourcePropType;

export default function ShareImageCard(props: ShareImageCardProps) {
  const { productName, brand, riskGroup, photoUri, thumbnailBase64, imageUrl } = props;
  const verdictLevel = computeVerdictLevel(riskGroup);
  const badge = getVerdictBadge(verdictLevel);
  const items = getTopItems(props);
  const productImageUri = thumbnailBase64 ?? photoUri ?? imageUrl ?? null;
  const drToxiAvatarUri = getDrToxiBadgeAvatarForVerdict(verdictLevel);
  const hasItems = items.length > 0;

  return (
    <View style={styles.card}>
      <View style={[styles.backgroundOrb, styles.backgroundOrbTop, { backgroundColor: badge.softColor }]} />
      <View style={[styles.backgroundOrb, styles.backgroundOrbBottom, { backgroundColor: badge.glowColor }]} />

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

      <View style={styles.substancesSection}>
        {hasItems ? (
          <>
            <Text style={styles.substancesTitle}>{t('substances_detected')}</Text>
            <View style={styles.substanceList}>
              {items.map((item: SubstanceItem, index: number) => {
                const rowStyle = getRiskRowStyle(item.level);
                return (
                  <View
                    key={`${item.name}-${index}`}
                    style={[styles.substanceRow, { backgroundColor: rowStyle.softColor }]}
                  >
                    <View style={[styles.substanceRowBar, { backgroundColor: rowStyle.color }]} />
                    <View style={styles.substanceRowContent}>
                      <Text style={styles.substanceRowName} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.substanceRowLabel, { color: rowStyle.color }]} numberOfLines={1}>
                        {rowStyle.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
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
  heroSection: {
    width: '100%',
    height: 500,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  verdictAura: {
    position: 'absolute',
    width: 540,
    height: 540,
    borderRadius: 270,
    opacity: 1,
  },
  productImageShadow: {
    width: 440,
    height: 440,
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
    right: 90,
    bottom: 14,
    width: 188,
    height: 188,
    borderRadius: 94,
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
    marginBottom: 28,
  },
  productName: {
    fontSize: 56,
    fontWeight: '900',
    color: '#111814',
    textAlign: 'center',
    lineHeight: 64,
    letterSpacing: -1.5,
    marginBottom: 10,
  },
  brand: {
    fontSize: 30,
    color: '#626760',
    textAlign: 'center',
    fontWeight: '700',
  },
  badgeContainer: {
    width: '100%',
    borderRadius: 42,
    paddingHorizontal: 56,
    paddingVertical: 28,
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
    marginBottom: 8,
  },
  badgeLabel: {
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  badgeSublabel: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 8,
    opacity: 0.88,
    textAlign: 'center',
  },
  substancesSection: {
    width: '100%',
    marginBottom: 18,
  },
  substancesTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111814',
    marginBottom: 18,
    textAlign: 'left',
    letterSpacing: -0.2,
  },
  substanceList: {
    width: '100%',
    gap: 12,
  },
  substanceRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  substanceRowBar: {
    width: 10,
    alignSelf: 'stretch',
  },
  substanceRowContent: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  substanceRowName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111814',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  substanceRowLabel: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
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
