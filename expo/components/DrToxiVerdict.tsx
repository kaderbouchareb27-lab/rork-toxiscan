import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Image } from 'expo-image';
import { isEnglish, pick } from '@/utils/i18n';
import { DR_TOXI_DEFAULT_AVATAR_URI, getDrToxiBadgeAvatarForVerdict, getDrToxiCosmeticAvatarForVerdict } from '@/constants/drToxiAvatars';

export type VerdictLevel = 'danger' | 'warning' | 'moderation' | 'approuve' | 'ultratoxic';

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
  switch (level) {
    case 'ultratoxic':
      return pick({
        en: 'This product is really concerning: it contains ingredients close to carcinogens (IARC 2A/2B) or a massive accumulation of ultra-processed ingredients. It sits just one step below a confirmed carcinogen. Avoid it as much as possible.',
        fr: 'Ce produit est vraiment préoccupant : il contient des ingrédients proches des cancérigènes (CIRC 2A/2B) ou une accumulation massive d’ingrédients ultra-transformés. Il se situe juste un cran en dessous du cancérigène confirmé. À éviter autant que possible.',
        ko: '이 제품은 정말 우려스러운 수준입니다: 발암물질에 가까운 성분(IARC 2A/2B)이나 초가공 성분의 대량 축적이 들어 있습니다. 확인된 발암물질 바로 아래 단계입니다. 최대한 피하세요.',
      });
    case 'danger':
      return pick({
        en: 'This product contains dangerous ingredients linked to cancer risk or serious health hazards. Avoid regular consumption.',
        fr: 'Ce produit contient des ingrédients dangereux liés au risque de cancer ou à des problèmes de santé graves. Évitez la consommation régulière.',
        ko: '이 제품에는 암 위험이나 심각한 건강 문제와 관련된 위험한 성분이 들어 있습니다. 정기적인 섭취를 피하세요.',
      });
    case 'warning':
      return pick({
        en: 'This product is industrially processed: it contains several ultra-processed ingredients without serious danger. Prefer products with a short, natural ingredient list.',
        fr: 'Ce produit est transformé industriellement : il contient plusieurs ingrédients ultra-transformés, sans danger grave. Préfère des produits à liste courte et naturelle.',
        ko: '이 제품은 산업적으로 가공된 제품입니다: 심각한 위험은 없지만 초가공 성분이 여러 개 들어 있습니다. 성분이 짧고 자연스러운 제품을 선택하세요.',
      });
    case 'moderation':
      return pick({
        en: 'This product contains some controversial ingredients. Consume occasionally and avoid making it a daily habit.',
        fr: 'Ce produit contient certains ingrédients controversés. Consommez occasionnellement et évitez d’en faire une habitude quotidienne.',
        ko: '이 제품에는 논란이 있는 성분이 일부 들어 있습니다. 가끔만 드시고 매일 습관처럼 드시지 마세요.',
      });
    case 'approuve':
      return pick({
        en: 'This product is made of healthy, natural ingredients with no major health concerns. A good everyday choice.',
        fr: 'Ce produit est composé d’ingrédients sains et naturels, sans préoccupation majeure pour la santé. Un bon choix au quotidien.',
        ko: '이 제품은 건강에 큰 문제가 없는 자연스럽고 건강한 성분으로 만들어졌습니다. 매일 먹기 좋은 선택입니다.',
      });
  }
}

function getSubtitle(level: VerdictLevel): string {
  switch (level) {
    case 'ultratoxic':
      return pick({ en: 'Avoid as much as possible', fr: 'À éviter autant que possible', ko: '최대한 피하세요' });
    case 'danger':
      return pick({ en: 'Avoid regular consumption', fr: 'À éviter régulièrement', ko: '정기적인 섭취를 피하세요' });
    case 'warning':
      return pick({ en: 'Occasional only — prefer short lists', fr: 'Occasionnel — préfère les listes courtes', ko: '가끔만 — 짧은 성분표를 선택하세요' });
    case 'moderation':
      return pick({ en: 'Consume with moderation', fr: 'Consommer avec modération', ko: '적당히 드세요' });
    case 'approuve':
      return pick({ en: 'Good everyday choice', fr: 'Bon choix au quotidien', ko: '매일 먹기 좋은 선택' });
  }
}

function getLabel(level: VerdictLevel): string {
  switch (level) {
    case 'ultratoxic':
      return pick({ en: 'ULTRA TOXIC', fr: 'ULTRA TOXIQUE', ko: '초독성' });
    case 'danger':
      return pick({ en: 'CARCINOGENIC', fr: 'CANCÉRIGÈNE', ko: '발암성' });
    case 'warning':
      return pick({ en: 'PROCESSED', fr: 'TRANSFORMÉ', ko: '가공' });
    case 'moderation':
      return pick({ en: 'CAUTION', fr: 'MODÉRATION', ko: '주의' });
    case 'approuve':
      return pick({ en: 'APPROVED', fr: 'APPROUVÉ', ko: '승인됨' });
  }
}

// ─────────────────────────────────────────────────────────────────────
// Cosmetic verdict — completely separate scale: 🟣 TOXIC / 🟡 DISPUTED / 🟢 APPROVED.
// Cosmetics only ever produce danger (TOXIC), moderation (DISPUTED) or approuve
// (APPROVED); 'warning' is mapped to DISPUTED as a safety net.
// ─────────────────────────────────────────────────────────────────────
function getCosmeticConfig(level: VerdictLevel): VerdictCardConfig {
  const avatarLevel: VerdictLevel = level === 'warning' || level === 'ultratoxic' ? 'moderation' : level;
  if (level === 'danger') {
    return {
      accentColor: '#7C3AED',
      label: pick({ en: 'TOXIC', fr: 'TOXIQUE', ko: '독성' }),
      subtitle: pick({ en: 'Avoid this product', fr: 'À éviter', ko: '사용하지 마세요' }),
      description: pick({
        en: 'This cosmetic contains ingredients recognized as dangerous (endocrine disruptors, carcinogens or banned substances). Avoid skin contact and choose a clean alternative.',
        fr: 'Ce cosmétique contient des ingrédients reconnus dangereux (perturbateurs endocriniens, cancérigènes ou substances interdites). Évite le contact avec la peau et choisis une alternative clean.',
        ko: '이 화장품에는 위험한 것으로 알려진 성분(내분비 교란 물질, 발암 물질 또는 금지 성분)이 들어 있습니다. 피부 접촉을 피하고 클린 대안을 선택하세요.',
      }),
      avatarUri: getDrToxiCosmeticAvatarForVerdict('danger'),
    };
  }
  if (level === 'approuve') {
    return {
      accentColor: '#2E9E34',
      label: pick({ en: 'APPROVED', fr: 'APPROUVÉ', ko: '승인됨' }),
      subtitle: pick({ en: 'Clean formula', fr: 'Formule clean', ko: '클린 포뮬러' }),
      description: pick({
        en: 'This cosmetic is made of ingredients with no known risk. A clean choice for your skin.',
        fr: 'Ce cosmétique est composé d’ingrédients sans risque connu. Un choix clean pour ta peau.',
        ko: '이 화장품은 알려진 위험이 없는 성분으로 만들어졌습니다. 피부를 위한 클린한 선택입니다.',
      }),
      avatarUri: null,
    };
  }
  // moderation / warning → DISPUTED
  return {
    accentColor: '#EAB308',
    label: pick({ en: 'DISPUTED', fr: 'CONTESTÉ', ko: '논란 있음' }),
    subtitle: pick({ en: 'Use with caution', fr: 'À utiliser avec prudence', ko: '주의해서 사용하세요' }),
    description: pick({
      en: 'This cosmetic contains several controversial ingredients with divided science. Use it occasionally and prefer a cleaner formula.',
      fr: 'Ce cosmétique contient plusieurs ingrédients controversés à la science partagée. À utiliser occasionnellement et préfère une formule plus clean.',
      ko: '이 화장품에는 과학적 의견이 갈리는 논란성 성분이 여러 개 들어 있습니다. 가끔만 사용하고 더 클린한 포뮬러를 선택하세요.',
    }),
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
    ultratoxic: '#722F37',
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
    ? pick({ en: 'COSMETIC VERDICT', fr: 'VERDICT COSMÉTIQUE', ko: '화장품 판정' })
    : pick({ en: 'RISK VERDICT', fr: 'VERDICT SANTÉ', ko: '건강 판정' });

  // The avatar plays a one-time entrance (fade + scale-in) and then STAYS
  // permanently next to the badge — it must never animate back out.
  const avatarOpacity = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.62)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(avatarOpacity, {
        toValue: 1,
        duration: 340,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [avatarOpacity, avatarScale]);

  return (
    <View
      style={[styles.container, { backgroundColor: config.accentColor, shadowColor: config.accentColor }]}
      testID="dr-toxi-verdict"
    >
      <View style={styles.headerRow}>
        <Animated.View style={[styles.avatarBubble, { opacity: avatarOpacity, transform: [{ scale: avatarScale }] }]}>
          <Image
            source={{ uri: config.avatarUri ?? DR_TOXI_DEFAULT_AVATAR_URI }}
            style={styles.avatar}
            contentFit="contain"
            transition={200}
          />
        </Animated.View>
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
