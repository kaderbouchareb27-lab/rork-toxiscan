import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { isEnglish } from '@/utils/i18n';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA_FR: FAQItem[] = [
  { question: 'Comment fonctionne Dr.Toxi ?', answer: 'Photographiez la liste d\'ingrédients d\'un produit ou scannez son code-barres. Dr.Toxi identifie les substances et les compare aux classifications du CIRC/OMS.' },
  { question: 'Que signifient les badges ?', answer: 'Rouge (DANGER) : substance classée cancérogène par le CIRC (Groupe 1, 2A ou 2B).\nOrange (PRUDENCE) : substance controversée non classée par le CIRC, mais qui favorise le cancer via l\'obésité, l\'inflammation ou la perturbation hormonale.\nVert (APPROUVÉ) : aucun lien connu avec le cancer.' },
  { question: 'La photo d\'ingrédients, comment ça marche ?', answer: 'Prenez en photo la liste d\'ingrédients au dos de votre produit. Notre IA analyse la photo, extrait chaque ingrédient et vérifie s\'il est classé dangereux.' },
  { question: 'D\'où viennent vos données ?', answer: 'Open Food Facts (produits) et CIRC/OMS (classifications de risque).' },
  { question: 'Dr.Toxi remplace-t-il un avis médical ?', answer: 'Non. Dr.Toxi est un outil d\'information. Il ne remplace jamais l\'avis d\'un professionnel de santé.' },
  { question: 'Mes photos sont-elles conservées ?', answer: 'Non. Les photos sont analysées par notre intelligence artificielle puis supprimées. Elles ne sont ni stockées ni partagées.' },
  { question: 'Mon produit n\'est pas trouvé par code-barres ?', answer: 'Utilisez la fonction "Photographier un produit" pour analyser le produit directement via sa photo.' },
  { question: 'Quelle méthode est la plus précise ?', answer: '1. Photo de la liste d\'ingrédients — la plus précise, recommandée\n2. Scan du code-barres — très précis si le produit est dans notre base\n3. Photo du devant du produit — bonne estimation, mais les ingrédients exacts peuvent varier' },
  { question: 'Mes données sont-elles en sécurité ?', answer: 'Oui. Nous ne vendons jamais vos données. Consultez notre Politique de confidentialité pour tous les détails.' },
  { question: 'Dr.Toxi analyse seulement les aliments ?', answer: 'Non. Dr.Toxi peut analyser tout ce qui vous entoure : aliments, cosmétiques, produits ménagers, ustensiles de cuisine, vêtements, contenants. Photographiez n\'importe quel objet et Dr.Toxi vous dira s\'il contient des matières potentiellement cancérigènes.' },
];

const FAQ_DATA_EN: FAQItem[] = [
  { question: 'How does Dr.Toxi work?', answer: 'Photograph the ingredient list of a product or scan its barcode. Dr.Toxi identifies substances and compares them to IARC/WHO classifications.' },
  { question: 'What do the badges mean?', answer: 'Red (DANGER): substance classified as carcinogenic by the IARC (Group 1, 2A, or 2B).\nOrange (CAUTION): controversial substance not classified by the IARC, but promotes cancer via obesity, inflammation, or hormonal disruption.\nGreen (APPROVED): no known link to cancer.' },
  { question: 'How does the ingredient photo work?', answer: 'Take a photo of the ingredient list on the back of your product. Our AI analyzes the photo, extracts each ingredient, and checks if it is classified as dangerous.' },
  { question: 'Where does your data come from?', answer: 'Open Food Facts (products) and IARC/WHO (risk classifications).' },
  { question: 'Does Dr.Toxi replace medical advice?', answer: 'No. Dr.Toxi is an information tool. It never replaces the advice of a healthcare professional.' },
  { question: 'Are my photos stored?', answer: 'No. Photos are analyzed by our artificial intelligence and then deleted. They are neither stored nor shared.' },
  { question: 'My product is not found by barcode?', answer: 'Use the "Photograph a product" feature to analyze the product directly via its photo.' },
  { question: 'Which method is most accurate?', answer: '1. Photo of the ingredient list — most accurate, recommended\n2. Barcode scan — very accurate if the product is in our database\n3. Photo of the front of the product — good estimate, but exact ingredients may vary' },
  { question: 'Is my data secure?', answer: 'Yes. We never sell your data. See our Privacy Policy for full details.' },
  { question: 'Does Dr.Toxi only analyze food?', answer: 'No. Dr.Toxi can analyze everything around you: food, cosmetics, household products, kitchen utensils, clothing, containers. Photograph any object and Dr.Toxi will tell you if it contains potentially carcinogenic materials.' },
];

function getFaqData(): FAQItem[] {
  return isEnglish() ? FAQ_DATA_EN : FAQ_DATA_FR;
}

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
      <Text style={styles.title}>{isEnglish() ? 'Frequently asked questions' : 'Questions fréquentes'}</Text>
      <Text style={styles.subtitle}>{isEnglish() ? `${getFaqData().length} questions to understand everything` : `${getFaqData().length} questions pour tout comprendre`}</Text>

      {getFaqData().map((item, index) => {
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
