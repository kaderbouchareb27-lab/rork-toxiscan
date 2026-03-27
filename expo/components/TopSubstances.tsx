import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface DangerousSubstance {
  id: string;
  name: string;
  code: string;
  category: string;
  badge: 'danger' | 'probable';
  badgeLabel: string;
  description: string;
  found_in: string;
}

const DANGEROUS_SUBSTANCES: DangerousSubstance[] = [
  {
    id: 'sub-1',
    name: 'Nitrites',
    code: 'E249-E252',
    category: 'Conservateur',
    badge: 'danger',
    badgeLabel: 'Groupe 1 CIRC',
    description: 'Les nitrites forment des nitrosamines cancérigènes dans l\'estomac. Classés cancérogènes avérés (Groupe 1) par le CIRC. Liés au cancer colorectal.',
    found_in: 'Charcuterie, jambon, saucisses, bacon, hot-dogs',
  },
  {
    id: 'sub-2',
    name: 'Formaldéhyde',
    code: 'E240',
    category: 'Conservateur',
    badge: 'danger',
    badgeLabel: 'Groupe 1 CIRC',
    description: 'Classé cancérogène avéré (Groupe 1) par le CIRC. Provoque des cancers du nasopharynx. Présent dans certains textiles et produits ménagers.',
    found_in: 'Vêtements neufs, colles, produits ménagers, vernis',
  },
  {
    id: 'sub-3',
    name: 'Red 40',
    code: 'E129',
    category: 'Colorant azoïque',
    badge: 'probable',
    badgeLabel: 'Interdit en UE',
    description: 'Colorant azoïque lié à l\'hyperactivité chez les enfants. Interdit en Europe mais encore autorisé en Amérique du Nord. Risques cancérogènes suspectés.',
    found_in: 'Bonbons, boissons gazeuses, céréales colorées, médicaments',
  },
  {
    id: 'sub-4',
    name: 'Aspartame',
    code: 'E951',
    category: 'Édulcorant',
    badge: 'probable',
    badgeLabel: 'Groupe 2B CIRC',
    description: 'Classé possiblement cancérogène (Groupe 2B) par le CIRC en 2023. Études controversées sur les risques de leucémie et lymphomes.',
    found_in: 'Boissons light, chewing-gums, yaourts 0%, médicaments',
  },
  {
    id: 'sub-5',
    name: 'BPA',
    code: 'Bisphénol A',
    category: 'Perturbateur endocrinien',
    badge: 'danger',
    badgeLabel: 'Interdit en France',
    description: 'Perturbateur endocrinien reconnu. Interdit dans les contenants alimentaires en France. Lié aux cancers du sein et de la prostate.',
    found_in: 'Boîtes de conserve, bouteilles plastiques, tickets de caisse',
  },
];

export default function TopSubstances() {
  const [selectedSubstance, setSelectedSubstance] = useState<DangerousSubstance | null>(null);

  const handlePress = useCallback((substance: DangerousSubstance) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedSubstance(substance);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <ShieldAlert color={Colors.primary} size={16} strokeWidth={2} />
        </View>
        <Text style={styles.headerTitle}>Top 5 des substances à éviter</Text>
      </View>

      <View style={styles.list}>
        {DANGEROUS_SUBSTANCES.map((substance, index) => (
          <TouchableOpacity
            key={substance.id}
            style={styles.substanceRow}
            onPress={() => handlePress(substance)}
            activeOpacity={0.7}
            testID={`substance-${substance.id}`}
          >
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.substanceInfo}>
              <Text style={styles.substanceName}>{substance.name}</Text>
              <Text style={styles.substanceCode}>{substance.code}</Text>
            </View>
            <View style={[
              styles.dangerBadge,
              substance.badge === 'danger' ? styles.dangerBadgeRed : styles.dangerBadgeOrange,
            ]}>
              <Text style={[
                styles.dangerBadgeText,
                substance.badge === 'danger' ? styles.dangerBadgeTextRed : styles.dangerBadgeTextOrange,
              ]}>
                {substance.badge === 'danger' ? 'danger' : 'détecté'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        visible={selectedSubstance !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSubstance(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[
                styles.modalBadge,
                selectedSubstance?.badge === 'danger' ? styles.modalBadgeRed : styles.modalBadgeOrange,
              ]}>
                <AlertTriangle
                  color={selectedSubstance?.badge === 'danger' ? '#FF3B30' : '#FF9500'}
                  size={16}
                />
                <Text style={[
                  styles.modalBadgeLabel,
                  { color: selectedSubstance?.badge === 'danger' ? '#FF3B30' : '#FF9500' },
                ]}>
                  {selectedSubstance?.badgeLabel}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedSubstance(null)}
                style={styles.modalClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X color={Colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.modalName}>{selectedSubstance?.name}</Text>
              <Text style={styles.modalCode}>{selectedSubstance?.code} · {selectedSubstance?.category}</Text>
              <Text style={styles.modalDescription}>{selectedSubstance?.description}</Text>

              <View style={styles.foundInContainer}>
                <Text style={styles.foundInLabel}>On le trouve dans :</Text>
                <Text style={styles.foundInText}>{selectedSubstance?.found_in}</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setSelectedSubstance(null)}
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
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  list: {
    gap: 0,
  },
  substanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F5',
    gap: 12,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  substanceInfo: {
    flex: 1,
  },
  substanceName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  substanceCode: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  dangerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dangerBadgeRed: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  dangerBadgeOrange: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  dangerBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
  },
  dangerBadgeTextRed: {
    color: '#FF3B30',
  },
  dangerBadgeTextOrange: {
    color: '#FF9500',
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  modalBadgeRed: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  modalBadgeOrange: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  modalBadgeLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  modalClose: {
    padding: 4,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  modalCode: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  modalDescription: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  foundInContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  foundInLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  foundInText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
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
