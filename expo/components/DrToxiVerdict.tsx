import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { isEnglish } from '@/utils/i18n';
import { DR_TOXI_DEFAULT_AVATAR_URI, getDrToxiBadgeAvatarForVerdict, getDrToxiCosmeticAvatarForVerdict } from '@/constants/drToxiAvatars';

export type VerdictLevel = 'danger' | 'warning' | 'moderation' | 'approuve';

interface DrToxiVerdictProps {
  level: VerdictLevel;
  /** Cosmetic products use the separate TOXIC / DISPUTED / APPROVED scale. */
  isCosmetic?: boolean;
}

interface VerdictCardConfig {
  accentColor: string;
  label: string;
  subtitle: string;
  description: string;
  avatarUri: string | null;
}

/**
 * Fixed, hardcoded verdict description based on the verdict level.
 * These texts must never be generated or replaced by the AI.
 */
function getFixedDescription(level: VerdictLevel): string {
  const english = isEnglish();
  switch (level) {
    case 'danger':
      return english
        ? 'This product contains dangerous ingredients linked to cancer risk or serious health hazards. Avoid regular consumption.'
        : 'Ce produit contient des ingrédients dangereux liés au risque de cancer ou à des problèmes de santé graves. Évitez la consommation régulière.';
    case 'warning':
      return english
        ? 'This product contains too many ultra-processed ingredients, some of which may promote cancer risk.'
        : 'Ce produit contient trop d’ingrédients ultra-transformés, dont certains peuvent favoriser le cancer.';
    case 'moderation':
      return english
        ? 'This product contains some controversial ingredients. Consume occasionally and avoid making it a daily habit.'
        : 'Ce produit contient certains ingrédients controversés. Consommez occasionnellement et évitez d’en faire une habitude quotidienne.';
    case 'approuve':
      return english
        ? 'This product is made of healthy, natural ingredients with no major health concerns. A good everyday choice.'
        : 'Ce produit est composé d’ingrédients sains et naturels, sans préoccupation majeure pour la santé. Un bon choix au quotidien.';
  }
}

function getSubtitle(level: VerdictLevel): string {
  const english = isEnglish();
  switch (level) {
    case 'danger':
      return english ? 'Avoid regular consumption' : 'À éviter régulièrement';
    case 'warning':
      return english ? 'Limit as much as possible' : 'À limiter fortement';
    case 'moderation':
      return english ? 'Consume with moderation' : 'Consommer avec modération';
    case 'approuve':
      return english ? 'Good everyday choice' : 'Bon choix au quotidien';
  }
}

function getLabel(level: VerdictLevel): string {
  const english = isEnglish();
  switch (level) {
    case 'danger':
      return english ? 'CARCINOGENIC' : 'CANCÉRIGÈNE';
    case 'warning':
      return english ? 'ULTRA-PROCESSED' : 'ULTRA-TRANSFORMÉ';
    case 'moderation':
      return english ? 'CAUTION' : 'MODÉRATION';
    case 'approuve':
      return english ? 'APPROVED' : 'APPROUVÉ';
  }
}

// ─────────────────────────────────────────────────────────────────────
// Cosmetic verdict — completely separate scale: 🟣 TOXIC / 🟡 DISPUTED / 🟢 APPROVED.
// Cosmetics only ever produce danger (TOXIC), moderation (DISPUTED) or approuve
// (APPROVED); 'warning' is mapped to DISPUTED as a safety net.
// ─────────────────────────────────────────────────────────────────────
function getCosmeticConfig(level: VerdictLevel): VerdictCardConfig {
  const english = isEnglish();
  const avatarLevel: VerdictLevel = level === 'warning' ? 'moderation' : level;
  if (level === 'danger') {
    return {
      accentColor: '#7C3AED',
      label: english ? 'TOXIC' : 'TOXIQUE',
      subtitle: english ? 'Avoid this product' : 'À éviter',
      description: english
        ? 'This cosmetic contains ingredients recognized as dangerous (endocrine disruptors, carcinogens or banned substances). Avoid skin contact and choose a clean alternative.'
        : 'Ce cosmétique contient des ingrédients reconnus dangereux (perturbateurs endocriniens, cancérigènes ou substances interdites). Évite le contact avec la peau et choisis une alternative clean.',
      avatarUri: getDrToxiCosmeticAvatarForVerdict('danger'),
    };
  }
  if (level === 'approuve') {
    return {
      accentColor: '#2E9E34',
      label: english ? 'APPROVED' : 'APPROUVÉ',
      subtitle: english ? 'Clean formula' : 'Formule clean',
      description: english
        ? 'This cosmetic is made of ingredients with no known risk. A clean choice for your skin.'
        : 'Ce cosmétique est composé d’ingrédients sans risque connu. Un choix clean pour ta peau.',
      avatarUri: null,
    };
  }
  // moderation / warning → DISPUTED
  return {
    accentColor: '#EAB308',
    label: english ? 'DISPUTED' : 'CONTESTÉ',
    subtitle: english ? 'Use with caution' : 'À utiliser avec prudence',
    description: english
      ? 'This cosmetic contains several controversial ingredients with divided science. Use it occasionally and prefer a cleaner formula.'
      : 'Ce cosmétique contient plusieurs ingrédients controversés à la science partagée. À utiliser occasionnellement et préfère une formule plus clean.',
    avatarUri: getDrToxiCosmeticAvatarForVerdict(avatarLevel),
  };
}

function getVerdictConfig(level: VerdictLevel, isCosmetic: boolean): VerdictCardConfig {
  if (isCosmetic) return getCosmeticConfig(level);
  const accentColors: Record<VerdictLevel, string> = {
    danger: '#D0260F',
    warning: '#E8730A',
    moderation: '#EAB308',
    approuve: '#2E9E34',
  };
  return {
    accentColor: accentColors[level],
    label: getLabel(level),
    subtitle: getSubtitle(level),
    description: getFixedDescription(level),
    avatarUri: getDrToxiBadgeAvatarForVerdict(level),
  };
}

export default function DrToxiVerdict({ level, isCosmetic = false }: DrToxiVerdictProps) {
  const config = getVerdictConfig(level, isCosmetic);
  const eyebrow = isCosmetic
    ? (isEnglish() ? 'COSMETIC VERDICT' : 'VERDICT COSMÉTIQUE')
    : (isEnglish() ? 'RISK VERDICT' : 'VERDICT SANTÉ');

  return (
    <View
      style={[styles.container, { backgroundColor: config.accentColor, shadowColor: config.accentColor }]}
      testID="dr-toxi-verdict"
    >
      <View style={styles.headerRow}>
        <View style={styles.avatarBubble}>
          <Image
            source={{ uri: config.avatarUri ?? DR_TOXI_DEFAULT_AVATAR_URI }}
            style={styles.avatar}
            contentFit="contain"
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.label}>{config.label}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>{config.subtitle}</Text>
      <Text style={styles.description}>{config.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    padding: 22,
    marginTop: 16,
    marginBottom: 0,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 13,
    marginBottom: 16,
  },
  avatarBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
  },
  avatar: {
    width: 58,
    height: 58,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: 'rgba(255,255,255,0.76)',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  label: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900' as const,
    letterSpacing: 0.6,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.25,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
});
