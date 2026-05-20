import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ShieldAlert, ShieldX, ThumbsUp, AlertTriangle } from 'lucide-react-native';
import { isEnglish, t } from '@/utils/i18n';

const DR_TOXI_AVATAR = 'https://r2-pub.rork.com/generated-images/97a5e938-5054-43f6-b4a0-83e39183f2a6.png';

export type VerdictLevel = 'danger' | 'warning' | 'moderation' | 'approuve';

interface DrToxiVerdictProps {
  level: VerdictLevel;
}

function getVerdictConfig(): Record<VerdictLevel, {
  accentColor: string;
  title: string;
  message: string;
  icon: React.ReactNode;
}> {
  return {
    danger: {
      accentColor: '#D0260F',
      title: t('verdict_danger_title'),
      message: t('verdict_danger_msg'),
      icon: <ShieldX color="#D0260F" size={22} />,
    },
    warning: {
      accentColor: '#E8730A',
      title: t('verdict_caution_title'),
      message: t('verdict_caution_msg'),
      icon: <ShieldAlert color="#E8730A" size={22} />,
    },
    moderation: {
      accentColor: '#EAB308',
      title: t('verdict_moderation_title'),
      message: t('verdict_moderation_msg'),
      icon: <AlertTriangle color="#EAB308" size={22} />,
    },
    approuve: {
      accentColor: '#34C759',
      title: t('verdict_approved_title'),
      message: t('verdict_approved_msg'),
      icon: <ThumbsUp color="#34C759" size={22} />,
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
          <Image source={{ uri: DR_TOXI_AVATAR }} style={styles.avatar} contentFit="cover" />
        </View>
        <View style={styles.headerText}>
          <View style={styles.eyebrowRow}>
            <View style={[styles.liveDot, { backgroundColor: config.accentColor }]} />
            <Text style={styles.eyebrow}>{eyebrow}</Text>
          </View>
          <Text style={styles.signature}>{signature}</Text>
        </View>
        <View style={[styles.iconBubble, { borderColor: config.accentColor }]}>{config.icon}</View>
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
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    padding: 2,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFFFFF',
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
