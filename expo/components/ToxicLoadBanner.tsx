import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Layers } from 'lucide-react-native';
import { t, pick } from '@/utils/i18n';
import Colors from '@/constants/colors';
import { DR_TOXI_TOXIC_LOAD_AVATAR } from '@/constants/drToxiAvatars';

interface ToxicLoadBannerProps {
  /** Number of orange ULTRA-PROCESSED ingredients detected in the product. */
  count: number;
}

/**
 * Global "TOXIC LOAD / DANGER CUMULÉ / 과다 위험" alert banner.
 *
 * Rendered at the top of the scan result (with the main verdict, above the
 * per-ingredient badges) whenever a product carries MORE THAN 8 orange
 * ULTRA-PROCESSED ingredients. It is a cumulative-risk warning, distinct from
 * the single-ingredient CARCINOGENIC verdict — bordeaux (#722F37), not bright red.
 */
export default function ToxicLoadBanner({ count }: ToxicLoadBannerProps) {
  const description = pick({
    fr: `Ce n'est pas un seul ingrédient dangereux qui déclenche cette alerte — c'est l'accumulation de ${count} ingrédients ultra-transformés dans ce produit qui crée un risque cumulatif pour ton corps.`,
    en: `This alert isn't triggered by a single dangerous ingredient — it's the accumulation of ${count} ultra-processed ingredients in this product that creates a cumulative load on your body.`,
    ko: `이 경고는 단 하나의 위험한 성분 때문이 아닙니다 — 이 제품에 들어 있는 ${count}가지 초가공 성분의 누적이 몸에 누적된 위험을 만듭니다.`,
  });

  return (
    <View style={styles.container} testID="toxic-load-banner">
      <View style={styles.glow} />
      <View style={styles.headerRow}>
        <View style={styles.avatarBubble}>
          <Image
            source={{ uri: DR_TOXI_TOXIC_LOAD_AVATAR }}
            style={styles.avatar}
            contentFit="contain"
          />
        </View>
        <View style={styles.headerText}>
          <View style={styles.eyebrowRow}>
            <Layers color="rgba(255,255,255,0.82)" size={12} strokeWidth={2.6} />
            <Text style={styles.eyebrow}>{t('toxic_load_eyebrow')}</Text>
          </View>
          <Text style={styles.label}>{t('toxic_load_badge')}</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countValue}>{count}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>{t('toxic_load_subtitle')}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative' as const,
    borderRadius: 28,
    padding: 22,
    marginTop: 12,
    backgroundColor: Colors.toxicLoad,
    overflow: 'hidden' as const,
    shadowColor: Colors.toxicLoad,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    position: 'absolute' as const,
    top: -60,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  avatar: {
    width: 58,
    height: 58,
  },
  headerText: {
    flex: 1,
  },
  eyebrowRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 1.2,
  },
  label: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900' as const,
    letterSpacing: 0.6,
    color: '#FFFFFF',
  },
  countPill: {
    minWidth: 42,
    height: 42,
    paddingHorizontal: 10,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  countValue: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
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
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 20,
  },
});
