import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react-native';

const DR_TOXI_AVATAR = 'https://r2-pub.rork.com/generated-images/97a5e938-5054-43f6-b4a0-83e39183f2a6.png';

export default function DrToxiVerdict({ score }: { score: number }) {
  let bgColor: string;
  let title: string;
  let message: string;
  let IconComponent: React.ReactNode;

  if (score <= 40) {
    bgColor = '#E8F9ED';
    title = 'Dr. Toxi recommande';
    message = 'Ce produit est acceptable. Vous pouvez le consommer sans inquiétude.';
    IconComponent = <ShieldCheck color="#2E9E34" size={24} />;
  } else if (score <= 70) {
    bgColor = '#FFF3E0';
    title = 'Dr. Toxi vous laisse le choix';
    message = 'Ce produit ne contient pas de cancérigène mais des substances controversées. Consommation occasionnelle possible.';
    IconComponent = <ShieldQuestion color="#FF9500" size={24} />;
  } else {
    bgColor = '#FFEBEE';
    title = 'Dr. Toxi déconseille';
    message = 'Ce produit contient au moins une substance cancérigène. Je vous déconseille de l\'utiliser.';
    IconComponent = <ShieldAlert color="#FF3B30" size={24} />;
  }

  const borderColor = score <= 40 ? '#C4EDC9' : score <= 70 ? '#FFE0B2' : '#FFCDD2';
  const titleColor = score <= 40 ? '#2D6A3E' : score <= 70 ? '#E65100' : '#C62828';
  const textColor = score <= 40 ? '#3A6B4A' : score <= 70 ? '#BF360C' : '#B71C1C';

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]} testID="dr-toxi-verdict">
      <View style={styles.headerRow}>
        <Image source={{ uri: DR_TOXI_AVATAR }} style={styles.avatar} contentFit="cover" />
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            {IconComponent}
            <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
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
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
  },
});
