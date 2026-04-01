import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '@/constants/colors';

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Politique de confidentialité</Text>
      <Text style={styles.updated}>Dernière mise à jour : mars 2026</Text>

      <View style={styles.highlightCard}>
        <Text style={styles.highlightText}>Dr.Toxi respecte votre vie privée. Nous ne vendons jamais vos données.</Text>
      </View>

      <Text style={styles.heading}>Données collectées</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text="Photos de listes d'ingrédients (analysées par notre IA, non conservées)" />
        <BulletItem text="Historique de vos scans (stocké localement sur votre appareil uniquement)" />
        <BulletItem text="Messages envoyés à Dr. Toxi (traités par notre IA, non conservés)" />
      </View>

      <Text style={styles.heading}>Données NON collectées</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text="PAS de nom, email, téléphone ou localisation" />
        <BulletItem text="PAS de vente de données à des tiers" />
        <BulletItem text="PAS de publicité ciblée" />
        <BulletItem text="PAS de trackers ou analytics intrusifs" />
      </View>

      <Text style={styles.heading}>Intelligence artificielle</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text="Dr.Toxi utilise l'intelligence artificielle pour analyser les photos d'ingrédients et pour le chatbot Dr. Toxi" />
        <BulletItem text="Les photos et messages sont traités par notre IA de manière sécurisée" />
        <BulletItem text="Notre IA ne conserve pas les données au-delà du traitement" />
        <BulletItem text="Les résultats sont à titre informatif et ne constituent pas un avis médical" />
      </View>

      <Text style={styles.heading}>Base de données produits</Text>
      <Text style={styles.body}>
        Les informations sur les produits proviennent d'Open Food Facts, une base de données collaborative et ouverte. Les classifications de risque sont basées sur les données publiques du CIRC/OMS (Centre International de Recherche sur le Cancer).
      </Text>

      <Text style={styles.heading}>Stockage local</Text>
      <Text style={styles.body}>
        Votre historique de scans et vos préférences sont stockés uniquement sur votre appareil via AsyncStorage. Ces données ne quittent jamais votre téléphone et ne sont pas synchronisées vers nos serveurs.
      </Text>

      <Text style={styles.heading}>Vos droits</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text="Supprimer votre historique à tout moment dans l'app (Historique → icône corbeille)" />
        <BulletItem text="Nous contacter pour toute demande de suppression ou question" />
        <BulletItem text="Désinstaller l'app pour supprimer toutes les données locales" />
      </View>

      <View style={styles.contactCard}>
        <Text style={styles.contactLabel}>Contact</Text>
        <Text style={styles.contactEmail}>contact@toxiscan.com</Text>
      </View>

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
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  updated: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginBottom: 20,
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
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 22,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 24,
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
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
  contactCard: {
    marginTop: 28,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  spacer: {
    height: 20,
  },
});
