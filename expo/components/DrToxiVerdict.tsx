import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ThumbsUp } from 'lucide-react-native';
import { isEnglish, t } from '@/utils/i18n';
import { DR_TOXI_DEFAULT_AVATAR_URI, getDrToxiBadgeAvatarForVerdict } from '@/constants/drToxiAvatars';

export type VerdictLevel = 'danger' | 'warning' | 'moderation' | 'approuve';

interface DrToxiVerdictProps {
  level: VerdictLevel;
}

function getVerdictConfig(): Record<VerdictLevel, {
  accentColor: string;
  title: string;
  message: string;
  icon: React.ReactNode;
  avatarUri: string | null;
}> {
  return {
    danger: {
      accentColor: '#D0260F',
      title: t('verdict_danger_title'),
      message: t('verdict_danger_msg'),
      icon: null,
      avatarUri: getDrToxiBadgeAvatarForVerdict('danger'),
    },
    warning: {
      accentColor: '#E8730A',
      title: t('verdict_caution_title'),
      message: t('verdict_caution_msg'),
      icon: null,
      avatarUri: getDrToxiBadgeAvatarForVerdict('warning'),
    },
    moderation: {
      accentColor: '#EAB308',
      title: t('verdict_moderation_title'),
      message: t('verdict_moderation_msg'),
      icon: null,
      avatarUri: getDrToxiBadgeAvatarForVerdict('moderation'),
    },
    approuve: {
      accentColor: '#2E9E34',
      title: t('verdict_approved_title'),
      message: t('verdict_approved_msg'),
      icon: <ThumbsUp color="#2E9E34" size={22} />,
      avatarUri: null,
    },
  };
}

export default function DrToxiVerdict({ level }: DrToxiVerdictProps) {
  const config = getVerdictConfig()[level];

  const eyebrow = isEnglish() ? 'AI INSIGHT' : 'ANALYSE IA';
  const signature = isEnglish() ? 'Dr. Toxi Analysis' : 'Analyse Dr. Toxi';

  return (
    <View style={[styles.container, { borderColor: config.accentColor }]} testID="dr-toxi-verdict">
      <View style={[styles.accentBar, { backgroundColor: config.accentColor }]} />
      <View style={styles.headerRow}>
        <View style={[styles.avatarRing, { borderColor: config.accentColor }]}>
          <Image
            source={{ uri: config.avatarUri ?? DR_TOXI_DEFAULT_AVATAR_URI }}
            style={styles.avatar}
            contentFit="cover"
          />
        </View>
        <View style={styles.headerText}>
          <View style={styles.eyebrowRow}>
            <View style={[styles.liveDot, { backgroundColor: config.accentColor }]} />
            <Text style={styles.eyebrow}>{eyebrow}</Text>
          </View>
          <Text style={styles.signature}>{signature}</Text>
        </View>
      </View>
      <Text style={[styles.title, { color: config.accentColor }]}>{config.title}</Text>
      <Text style={styles.message}>{config.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginTop: 16,
    marginBottom: 4,
    borderWidth: 1,
    overflow: 'hidden' as const,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 3,
  },
  accentBar: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    padding: 2,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden' as const,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  headerText: {
    flex: 1,
  },
  eyebrowRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 3,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#8A8A84',
    letterSpacing: 1.1,
  },
  signature: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#0E0E0C',
    letterSpacing: -0.2,
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden' as const,
  },
  badgeAvatar: {
    width: 44,
    height: 44,
  },
  title: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800' as const,
    letterSpacing: -0.35,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: '#3C3C38',
  },
});
