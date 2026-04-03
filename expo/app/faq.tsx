import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: 'Comment fonctionne Dr.Toxi ?',
    answer: 'Photographiez la liste d\'ingrédients d\'un produit ou scannez son code-barres. Dr.Toxi identifie les substances et les compare aux classifications du CIRC/OMS.',
  },
  {
    question: 'Que signifient les badges ?',
    answer: 'Rouge (DANGER) : cancérogène avéré (Groupe 1 CIRC).\nOrange (DÉTECTÉ) : substance à risque (Groupe 2A).\nJaune (DÉTECTÉ) : substance controversée (Groupe 2B).\nVert (OK) : aucun additif classé détecté.',
  },
  {
    question: 'La photo d\'ingrédients, comment ça marche ?',
    answer: 'Prenez en photo la liste d\'ingrédients au dos de votre produit. Notre IA analyse la photo, extrait chaque ingrédient et vérifie s\'il est classé dangereux.',
  },
  {
    question: 'D\'où viennent vos données ?',
    answer: 'Open Food Facts (produits) et CIRC/OMS (classifications de risque).',
  },
  {
    question: 'Dr.Toxi remplace-t-il un avis médical ?',
    answer: 'Non. Dr.Toxi est un outil d\'information. Il ne remplace jamais l\'avis d\'un professionnel de santé.',
  },
  {
    question: 'Mes photos sont-elles conservées ?',
    answer: 'Non. Les photos sont analysées par notre intelligence artificielle puis supprimées. Elles ne sont ni stockées ni partagées.',
  },
  {
    question: 'Mon produit n\'est pas trouvé par code-barres ?',
    answer: 'Utilisez la fonction "Photographier un produit" pour analyser le produit directement via sa photo.',
  },
  {
    question: 'Quelle méthode est la plus précise ?',
    answer: '1. Photo de la liste d\'ingrédients — la plus précise, recommandée\n2. Scan du code-barres — très précis si le produit est dans notre base\n3. Photo du devant du produit — bonne estimation, mais les ingrédients exacts peuvent varier',
  },
  {
    question: 'Mes données sont-elles en sécurité ?',
    answer: 'Oui. Nous ne vendons jamais vos données. Consultez notre Politique de confidentialité pour tous les détails.',
  },
  {
    question: 'Dr.Toxi analyse seulement les aliments ?',
    answer: 'Non. Dr.Toxi peut analyser tout ce qui vous entoure : aliments, cosmétiques, produits ménagers, ustensiles de cuisine, vêtements, contenants. Photographiez n\'importe quel objet et Dr.Toxi vous dira s\'il contient des matières potentiellement cancérigènes.',
  },
];

export default function FAQScreen() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggle = useCallback((index: number) => {
    console.log('[FAQ] Toggle item:', index);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setExpanded(prev => prev === index ? null : index);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Questions fréquentes</Text>
      <Text style={styles.subtitle}>{FAQ_DATA.length} questions pour tout comprendre</Text>

      {FAQ_DATA.map((item, index) => {
        const isExpanded = expanded === index;
        return (
          <TouchableOpacity
            key={`faq-${index}`}
            style={[styles.faqItem, isExpanded && styles.faqItemExpanded]}
            onPress={() => toggle(index)}
            activeOpacity={0.7}
            testID={`faq-item-${index}`}
          >
            <View style={styles.questionRow}>
              <Text style={[styles.question, isExpanded && styles.questionExpanded]}>{item.question}</Text>
              {isExpanded ? (
                <ChevronUp color={Colors.primary} size={18} />
              ) : (
                <ChevronDown color={Colors.textSecondary} size={18} />
              )}
            </View>
            {isExpanded && (
              <Text style={styles.answer}>{item.answer}</Text>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={styles.spacer} />
    </ScrollView>
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
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  faqItem: {
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    paddingVertical: 16,
  },
  faqItemExpanded: {
    backgroundColor: 'rgba(52, 199, 89, 0.03)',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderBottomWidth: 0,
    marginBottom: 4,
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 22,
  },
  questionExpanded: {
    color: Colors.primary,
  },
  answer: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: 10,
  },
  spacer: {
    height: 40,
  },
});
