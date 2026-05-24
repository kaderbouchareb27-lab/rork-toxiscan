import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '@/constants/colors';
import { isEnglish } from '@/utils/i18n';

export default function PrivacyScreen() {
  console.log('[Privacy] Rendering privacy screen');
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{isEnglish() ? 'Privacy Policy' : 'Politique de confidentialité'}</Text>
      <Text style={styles.updated}>{isEnglish() ? 'Last updated: March 2026' : 'Dernière mise à jour : mars 2026'}</Text>

      <View style={styles.highlightCard}>
        <Text style={styles.highlightText}>{isEnglish() ? 'Dr.Toxi respects your privacy. We never sell your data.' : 'Dr.Toxi respecte votre vie privée. Nous ne vendons jamais vos données.'}</Text>
      </View>

      <Text style={styles.heading}>{isEnglish() ? 'Data collected' : 'Données collectées'}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={isEnglish() ? 'Ingredient list photos (analyzed by our AI, not stored)' : "Photos de listes d'ingrédients (analysées par notre IA, non conservées)"} />
        <BulletItem text={isEnglish() ? 'Your scan history (stored locally on your device only)' : 'Historique de vos scans (stocké localement sur votre appareil uniquement)'} />
        <BulletItem text={isEnglish() ? 'Messages sent to Dr. Toxi (processed by our AI, not stored)' : 'Messages envoyés à Dr. Toxi (traités par notre IA, non conservés)'} />
      </View>

      <Text style={styles.heading}>{isEnglish() ? 'Data NOT collected' : 'Données NON collectées'}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={isEnglish() ? 'NO name, email, phone, or location' : 'PAS de nom, email, téléphone ou localisation'} />
        <BulletItem text={isEnglish() ? 'NO selling data to third parties' : 'PAS de vente de données à des tiers'} />
        <BulletItem text={isEnglish() ? 'NO targeted advertising' : 'PAS de publicité ciblée'} />
        <BulletItem text={isEnglish() ? 'NO intrusive trackers or analytics' : 'PAS de trackers ou analytics intrusifs'} />
      </View>

      <Text style={styles.heading}>{isEnglish() ? 'Artificial Intelligence' : 'Intelligence artificielle'}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={isEnglish() ? 'Dr.Toxi uses artificial intelligence to analyze ingredient photos and for the Dr. Toxi chatbot' : "Dr.Toxi utilise l'intelligence artificielle pour analyser les photos d'ingrédients et pour le chatbot Dr. Toxi"} />
        <BulletItem text={isEnglish() ? 'Photos and messages are processed securely by our AI' : 'Les photos et messages sont traités par notre IA de manière sécurisée'} />
        <BulletItem text={isEnglish() ? 'Our AI does not retain data beyond processing' : 'Notre IA ne conserve pas les données au-delà du traitement'} />
        <BulletItem text={isEnglish() ? 'Results are for informational purposes and do not constitute medical advice' : 'Les résultats sont à titre informatif et ne constituent pas un avis médical'} />
      </View>

      <Text style={styles.heading}>{isEnglish() ? 'Product database' : 'Base de données produits'}</Text>
      <Text style={styles.body}>
        {isEnglish() ? 'Product analysis is powered by the Dr.Toxi proprietary database, enriched with global cancer research from international authorities (IARC/WHO, EFSA, FDA, NTP, INSERM). The database is updated continuously each time a new ingredient is declared carcinogenic or ultra-processed anywhere in the world.' : "L'analyse des produits est propulsée par la base de données propriétaire Dr.Toxi, enrichie par les recherches mondiales sur le cancer issues des autorités internationales (CIRC/OMS, EFSA, FDA, NTP, INSERM). La base est mise à jour en continu à chaque nouvel ingrédient déclaré cancérigène ou ultra-transformé dans le monde."}
      </Text>

      <Text style={styles.heading}>{isEnglish() ? 'Local storage' : 'Stockage local'}</Text>
      <Text style={styles.body}>
        {isEnglish() ? 'Your scan history and preferences are stored only on your device via AsyncStorage. This data never leaves your phone and is not synced to our servers.' : 'Votre historique de scans et vos préférences sont stockés uniquement sur votre appareil via AsyncStorage. Ces données ne quittent jamais votre téléphone et ne sont pas synchronisées vers nos serveurs.'}
      </Text>

      <Text style={styles.heading}>{isEnglish() ? 'Your rights' : 'Vos droits'}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={isEnglish() ? "Delete your history at any time in the app (History → trash icon)" : "Supprimer votre historique à tout moment dans l'app (Historique → icône corbeille)"} />
        <BulletItem text={isEnglish() ? 'Contact us for any deletion request or question' : 'Nous contacter pour toute demande de suppression ou question'} />
        <BulletItem text={isEnglish() ? 'Uninstall the app to delete all local data' : "Désinstaller l'app pour supprimer toutes les données locales"} />
      </View>

      <View style={styles.contactCard}>
        <Text style={styles.contactLabel}>{isEnglish() ? 'Contact' : 'Contact'}</Text>
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
    backgroundColor: 'rgba(46, 158, 52, 0.08)',
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
    borderWidth: 1,
    borderColor: Colors.border,
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
