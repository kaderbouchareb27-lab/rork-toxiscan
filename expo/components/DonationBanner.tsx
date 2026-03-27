import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Heart } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function DonationBanner() {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Heart color={Colors.primary} size={18} strokeWidth={2} fill={Colors.primary} />
      </View>
      <Text style={styles.text}>
        Pour chaque abonnement annuel, 5$ sont reversés à des associations qui aident les patients atteints de cancer à payer leurs traitements et médicaments.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.06)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.12)',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    fontWeight: '500' as const,
  },
});
