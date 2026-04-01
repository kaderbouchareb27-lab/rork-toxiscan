import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '@/constants/colors';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroSection}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>T</Text>
        </View>
        <Text style={styles.appName}>Dr.Toxi</Text>
        <Text style={styles.tagline}>Scannez. Comprenez. Protégez.</Text>
      </View>

      <Text style={styles.heading}>Notre mission</Text>

      <Text style={styles.paragraph}>
        J'ai vu trop de gens autour de moi se battre contre le cancer. Des proches, des amis, des collègues. Des gens bien qui ne savaient pas que ce qu'ils mangeaient, ce qu'ils utilisaient ou ce qu'ils respiraient au quotidien pouvait augmenter leur risque.
      </Text>

      <Text style={styles.paragraph}>
        Dr.Toxi est né de cette réalité. Mon objectif est simple : vous donner le pouvoir de savoir. Savoir ce qu'il y a vraiment dans vos produits. Savoir quels ingrédients éviter. Savoir comment protéger votre famille.
      </Text>

      <Text style={styles.paragraph}>
        On ne peut pas tout contrôler. Mais on peut faire de meilleurs choix quand on a la bonne information. C'est exactement ce que Dr.Toxi vous offre : l'information, simplement, clairement, honnêtement.
      </Text>

      <View style={styles.donationCard}>
        <Text style={styles.donationText}>
          Une partie des revenus est destinée à soutenir la recherche contre le cancer.
        </Text>
      </View>

      <Text style={styles.paragraph}>
        Prenez soin de vous et de ceux que vous aimez.
      </Text>

      <View style={styles.signatureBlock}>
        <Text style={styles.signature}>Abdelkader Bouchareb</Text>
        <Text style={styles.role}>Fondateur & Développeur de Dr.Toxi</Text>
      </View>

      <View style={styles.addressBlock}>
        <Text style={styles.addressLine}>1055 Rue Lucien-L'Allier, Unit #1036</Text>
        <Text style={styles.addressLine}>Montréal, QC H3G 3C4</Text>
        <Text style={styles.addressLine}>Canada</Text>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: Colors.text,
    marginBottom: 20,
  },
  donationCard: {
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  donationText: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  signatureBlock: {
    marginTop: 12,
    marginBottom: 40,
  },
  signature: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  role: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  addressBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: 20,
  },
  addressLine: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 20,
  },
});
