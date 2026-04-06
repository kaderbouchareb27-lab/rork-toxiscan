import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { HeartHandshake } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function DonationBanner() {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <HeartHandshake color="#34C759" size={16} strokeWidth={2} />
      </View>
      <Text style={styles.text}>
        Une partie des revenus est destinée à aider les patients atteints de cancer à payer leurs traitements et médicaments.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
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
