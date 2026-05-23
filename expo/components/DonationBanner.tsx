import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { HeartHandshake } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { t } from '@/utils/i18n';

export default function DonationBanner() {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <HeartHandshake color={Colors.primary} size={17} strokeWidth={1.9} />
      </View>
      <Text style={styles.text}>
        {t('donation_text')}
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
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0ECE4',
    shadowColor: '#2F281F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 2,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(46, 158, 52, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46, 158, 52, 0.22)',
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    fontWeight: '400' as const,
  },
});
