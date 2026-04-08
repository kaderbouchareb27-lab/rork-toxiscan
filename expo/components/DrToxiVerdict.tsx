import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react-native';

const DR_TOXI_AVATAR = 'https://r2-pub.rork.com/generated-images/97a5e938-5054-43f6-b4a0-83e39183f2a6.png';

export type VerdictLevel = 'danger' | 'prudence' | 'approuve';

interface DrToxiVerdictProps {
  level: VerdictLevel;
}

const VERDICT_CONFIG: Record<VerdictLevel, {
  bgColor: string;
  borderColor: string;
  titleColor: string;
  textColor: string;
  title: string;
  message: string;
  icon: React.ReactNode;
}> = {
  danger: {
    bgColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    titleColor: '#C62828',
    textColor: '#B71C1C',
    title: 'Dr. Toxi déconseille ce produit',
    message: 'Ce produit contient au moins une substance classée cancérigène. Je vous déconseille de le consommer.',
    icon: <ShieldX color="#FF3B30" size={24} />,
  },
  prudence: {
    bgColor: '#FFF3E0',
    borderColor: '#FFE0B2',
    titleColor: '#E65100',
    textColor: '#BF360C',
    title: 'Dr. Toxi ne recommande pas ce produit',
    message: 'Ce produit ne contient pas de cancérigène classé par le CIRC, mais contient des substances controversées qui favorisent le cancer indirectement selon de nombreuses études scientifiques.',
    icon: <ShieldAlert color="#FF9500" size={24} />,
  },
  approuve: {
    bgColor: '#E8F9ED',
    borderColor: '#C4EDC9',
    titleColor: '#2D6A3E',
    textColor: '#3A6B4A',
    title: 'Dr. Toxi approuve ce produit',
    message: 'Bravo! Ce produit ne contient aucune substance cancérigène ni controversée. C\'est un excellent choix. Partagez-le avec vos proches!',
    icon: <ShieldCheck color="#2E9E34" size={24} />,
  },
};

export default function DrToxiVerdict({ level }: DrToxiVerdictProps) {
  const config = VERDICT_CONFIG[level];

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor, borderColor: config.borderColor }]} testID="dr-toxi-verdict">
      <View style={styles.headerRow}>
        <Image source={{ uri: DR_TOXI_AVATAR }} style={styles.avatar} contentFit="cover" />
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            {config.icon}
            <Text style={[styles.title, { color: config.titleColor }]}>{config.title}</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.message, { color: config.textColor }]}>{config.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    marginBottom: 4,
    borderWidth: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    flex: 1,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
  },
});
