import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Brain, Shield, Eye } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { isEnglish } from '@/utils/i18n';

export default function TransparencyScreen() {
  console.log('[Transparency] Rendering transparency screen');
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerSection}>
        <View style={styles.iconCircle}>
          <Eye color={Colors.primary} size={28} strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>{isEnglish() ? "How Dr.Toxi uses artificial intelligence" : "Comment Dr.Toxi utilise l'intelligence artificielle"}</Text>
      </View>

      <View style={styles.highlightCard}>
        <Text style={styles.highlightText}>{isEnglish() ? 'Dr.Toxi believes in total transparency. You deserve to know how each feature works.' : 'Dr.Toxi croit en la transparence totale. Vous méritez de savoir comment fonctionne chaque fonctionnalité.'}</Text>
      </View>

      <Text style={styles.heading}>{isEnglish() ? 'Dr.Toxi uses AI in two areas:' : "Dr.Toxi utilise l'IA à deux endroits :"}</Text>

      <View style={styles.featureCard}>
        <View style={styles.featureIcon}>
          <Brain color={Colors.primary} size={20} strokeWidth={1.5} />
        </View>
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>{isEnglish() ? '1. Universal photo analysis' : '1. Analyse photo universelle'}</Text>
          <Text style={styles.featureDescription}>
            {isEnglish() ? 'When you photograph an everyday product or object, our AI analyzes the photo to identify the object, its materials, and evaluate potentially carcinogenic substances.' : "Quand vous photographiez un produit ou objet du quotidien, notre IA analyse la photo pour identifier l'objet, ses matériaux et évaluer les substances potentiellement cancérigènes."}
          </Text>
        </View>
      </View>

      <View style={styles.featureCard}>
        <View style={styles.featureIcon}>
          <Shield color={Colors.primary} size={20} strokeWidth={1.5} />
        </View>
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>{isEnglish() ? '2. Dr. Toxi (expert chatbot)' : '2. Dr. Toxi (chatbot expert)'}</Text>
          <Text style={styles.featureDescription}>
            {isEnglish() ? 'Answers your questions about everyday toxic substances: food additives, plastics, cosmetics, kitchen utensils, and more.' : 'Répond à vos questions sur les substances toxiques du quotidien : additifs alimentaires, plastiques, cosmétiques, ustensiles de cuisine et plus encore.'}
          </Text>
        </View>
      </View>

      <Text style={styles.heading}>{isEnglish() ? 'What AI does NOT do' : "Ce que l'IA ne fait PAS"}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={isEnglish() ? 'Barcode scan risk badges are based on IARC/WHO classifications, not AI' : "Les badges de risque des scans code-barres sont basés sur les classifications CIRC/OMS, pas sur l'IA"} />
        <BulletItem text={isEnglish() ? 'AI does not make any medical diagnosis' : "L'IA ne pose aucun diagnostic médical"} />
        <BulletItem text={isEnglish() ? 'AI does not replace a healthcare professional' : "L'IA ne remplace pas un professionnel de santé"} />
        <BulletItem text={isEnglish() ? 'AI does not create false alerts on natural and healthy products' : "L'IA ne crée pas de fausses alertes sur les produits naturels et sains"} />
      </View>

      <Text style={styles.heading}>{isEnglish() ? 'Your data and AI' : "Vos données et l'IA"}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={isEnglish() ? 'Photos and messages are processed securely by our AI' : 'Photos et messages sont traités par notre IA de manière sécurisée'} />
        <BulletItem text={isEnglish() ? 'Nothing is retained after processing by our AI' : "Rien n'est conservé après le traitement par notre IA"} />
        <BulletItem text={isEnglish() ? 'No data is used to train AI models' : "Aucune donnée n'est utilisée pour entraîner des modèles IA"} />
        <BulletItem text={isEnglish() ? 'Your scans remain stored locally on your device' : 'Vos scans restent stockés localement sur votre appareil'} />
      </View>

      <Text style={styles.heading}>{isEnglish() ? 'Why this transparency?' : 'Pourquoi cette transparence ?'}</Text>
      <Text style={styles.body}>
        {isEnglish() ? 'Because you have the right to know exactly how a tool you use for your health works. No black box, no mystery. Every result is based on official and verifiable scientific classifications.' : 'Parce que vous avez le droit de savoir exactement comment fonctionne un outil que vous utilisez pour votre santé. Pas de boîte noire, pas de mystère. Chaque résultat est basé sur des classifications scientifiques officielles et vérifiables.'}
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
    backgroundColor: 'rgba(46, 158, 52, 0.1)',
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
    backgroundColor: 'rgba(46, 158, 52, 0.08)',
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
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 158, 52, 0.1)',
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
