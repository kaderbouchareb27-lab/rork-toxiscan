import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { Info, X, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { HealthAlert, getTodayAlerts } from '@/mocks/scannerContent';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7;

export default function HealthAlerts() {
  const [selectedAlert, setSelectedAlert] = useState<HealthAlert | null>(null);
  const alerts = getTodayAlerts();

  const handlePress = useCallback((alert: HealthAlert) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedAlert(alert);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alertes santé</Text>
        <Text style={styles.updatedText}>Mis à jour aujourd'hui</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsScroll}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 10}
      >
        {alerts.map((alert) => (
          <TouchableOpacity
            key={alert.id}
            style={styles.alertCard}
            onPress={() => handlePress(alert)}
            activeOpacity={0.8}
            testID={`alert-${alert.id}`}
          >
            <View style={styles.alertCardIcon}>
              <Info color={Colors.primary} size={14} strokeWidth={2.2} />
            </View>
            <Text style={styles.alertCardText} numberOfLines={3}>{alert.title}</Text>
            <Text style={styles.alertCardAction}>Lire →</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={selectedAlert !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAlert(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
                <Info color={Colors.primary} size={18} strokeWidth={2} />
              </View>
              <TouchableOpacity
                onPress={() => setSelectedAlert(null)}
                style={styles.modalClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X color={Colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.modalTitle}>{selectedAlert?.title}</Text>
              <Text style={styles.modalSummary}>{selectedAlert?.summary}</Text>

              <View style={styles.sourceContainer}>
                <ExternalLink color={Colors.textSecondary} size={12} />
                <Text style={styles.sourceText}>{selectedAlert?.source}</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setSelectedAlert(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  updatedText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  cardsScroll: {
    gap: 10,
  },
  alertCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    justifyContent: 'space-between',
    gap: 8,
  },
  alertCardIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCardText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  alertCardAction: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    paddingTop: 20,
    paddingHorizontal: 22,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    padding: 4,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 14,
  },
  modalSummary: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    marginBottom: 8,
  },
  sourceText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
    flex: 1,
  },
  modalButton: {
    backgroundColor: Colors.surfaceSecondary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
