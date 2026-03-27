import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Brain, Shield, Eye } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function TransparencyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerSection}>
        <View style={styles.iconCircle}>
          <Eye color={Colors.primary} size={28} />
        </View>
        <Text style={styles.title}>Comment ToxiScan utilise le Toolkit IA de Rork</Text>
      </View>

      <View style={styles.highlightCard}>
        <Text style={styles.highlightText}>ToxiScan croit en la transparence totale. Vous méritez de savoir comment fonctionne chaque fonctionnalité.</Text>
      </View>

      <Text style={styles.heading}>ToxiScan utilise l'IA à deux endroits :</Text>

      <View style={styles.featureCard}>
        <View style={styles.featureIcon}>
          <Brain color={Colors.primary} size={20} />
        </View>
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>1. Analyse photo universelle</Text>
          <Text style={styles.featureDescription}>
            Quand vous photographiez un produit ou objet du quotidien, le Toolkit IA de Rork analyse la photo pour identifier l'objet, ses matériaux et évaluer les substances potentiellement cancérigènes.
          </Text>
        </View>
      </View>

      <View style={styles.featureCard}>
        <View style={styles.featureIcon}>
          <Shield color={Colors.primary} size={20} />
        </View>
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>2. Dr. Toxi (chatbot expert)</Text>
          <Text style={styles.featureDescription}>
            Répond à vos questions sur les substances toxiques du quotidien : additifs alimentaires, plastiques, cosmétiques, ustensiles de cuisine et plus encore.
          </Text>
        </View>
      </View>

      <Text style={styles.heading}>Ce que l'IA ne fait PAS</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text="Les badges de risque des scans code-barres sont basés sur les classifications CIRC/OMS, pas sur l'IA" />
        <BulletItem text="L'IA ne pose aucun diagnostic médical" />
        <BulletItem text="L'IA ne remplace pas un professionnel de santé" />
        <BulletItem text="L'IA ne crée pas de fausses alertes sur les produits naturels et sains" />
      </View>

      <Text style={styles.heading}>Vos données et l'IA</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text="Photos et messages sont traités par le Toolkit IA de Rork de manière sécurisée" />
        <BulletItem text="Rien n'est conservé après le traitement par le Toolkit IA de Rork" />
        <BulletItem text="Aucune donnée n'est utilisée pour entraîner des modèles IA" />
        <BulletItem text="Vos scans restent stockés localement sur votre appareil" />
      </View>

      <Text style={styles.heading}>Pourquoi cette transparence ?</Text>
      <Text style={styles.body}>
        Parce que vous avez le droit de savoir exactement comment fonctionne un outil que vous utilisez pour votre santé. Pas de boîte noire, pas de mystère. Chaque résultat est basé sur des classifications scientifiques officielles et vérifiables.
      </Text>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  highlightCard: {
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  highlightText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    lineHeight: 22,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bulletGroup: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  spacer: {
    height: 20,
  },
});
