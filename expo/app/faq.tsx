import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { getDeviceLanguage, pick } from '@/utils/i18n';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA_FR: FAQItem[] = [
  { question: 'Comment fonctionne Dr.Toxi ?', answer: 'Photographiez la liste d\'ingrédients d\'un produit ou scannez son code-barres. Dr.Toxi identifie les substances et les compare aux classifications du CIRC/OMS.' },
  { question: 'Que signifient les badges ?', answer: 'Rouge (DANGER) : substance classée cancérogène par le CIRC (Groupe 1, 2A ou 2B).\nOrange (PRUDENCE) : substance controversée non classée par le CIRC, mais qui favorise le cancer via l\'obésité, l\'inflammation ou la perturbation hormonale.\nVert (APPROUVÉ) : aucun lien connu avec le cancer.' },
  { question: 'La photo d\'ingrédients, comment ça marche ?', answer: 'Prenez en photo la liste d\'ingrédients au dos de votre produit. Notre IA analyse la photo, extrait chaque ingrédient et vérifie s\'il est classé dangereux.' },
  { question: 'D\'où viennent vos données ?', answer: 'Base de données propriétaire Dr.Toxi enrichie par les recherches mondiales sur le cancer (CIRC/OMS, EFSA, FDA, NTP, INSERM). Mise à jour en continu à chaque nouvel ingrédient déclaré cancérigène ou ultra-transformé dans le monde.' },
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
  { question: 'Where does your data come from?', answer: 'Dr.Toxi proprietary database enriched with global cancer research (IARC/WHO, EFSA, FDA, NTP, INSERM). Continuously updated each time a new ingredient is declared carcinogenic or ultra-processed worldwide.' },
  { question: 'Does Dr.Toxi replace medical advice?', answer: 'No. Dr.Toxi is an information tool. It never replaces the advice of a healthcare professional.' },
  { question: 'Are my photos stored?', answer: 'No. Photos are analyzed by our artificial intelligence and then deleted. They are neither stored nor shared.' },
  { question: 'My product is not found by barcode?', answer: 'Use the "Photograph a product" feature to analyze the product directly via its photo.' },
  { question: 'Which method is most accurate?', answer: '1. Photo of the ingredient list — most accurate, recommended\n2. Barcode scan — very accurate if the product is in our database\n3. Photo of the front of the product — good estimate, but exact ingredients may vary' },
  { question: 'Is my data secure?', answer: 'Yes. We never sell your data. See our Privacy Policy for full details.' },
  { question: 'Does Dr.Toxi only analyze food?', answer: 'No. Dr.Toxi can analyze everything around you: food, cosmetics, household products, kitchen utensils, clothing, containers. Photograph any object and Dr.Toxi will tell you if it contains potentially carcinogenic materials.' },
];

const FAQ_DATA_KO: FAQItem[] = [
  { question: 'Dr.Toxi는 어떻게 작동하나요?', answer: '제품의 성분표를 촬영하거나 바코드를 스캔하세요. Dr.Toxi가 성분을 식별하고 IARC/WHO 분류와 비교합니다.' },
  { question: '배지는 무엇을 의미하나요?', answer: '빨강(위험): IARC가 발암물질로 분류한 물질(1군, 2A 또는 2B군).\n주황(주의): IARC가 분류하지는 않았지만 비만, 염증 또는 호르몬 교란을 통해 암을 촉진하는 논란성 물질.\n초록(승인): 암과 알려진 연관성 없음.' },
  { question: '성분 사진은 어떻게 작동하나요?', answer: '제품 뒷면의 성분표를 촬영하세요. AI가 사진을 분석하고 각 성분을 추출해 위험하게 분류되는지 확인합니다.' },
  { question: '데이터는 어디서 오나요?', answer: '전 세계 암 연구(IARC/WHO, EFSA, FDA, NTP, INSERM)로 보강된 Dr.Toxi 독자 데이터베이스입니다. 전 세계에서 새로운 성분이 발암성 또는 초가공으로 선언될 때마다 지속적으로 업데이트됩니다.' },
  { question: 'Dr.Toxi가 의학적 조언을 대체하나요?', answer: '아니요. Dr.Toxi는 정보 도구입니다. 의료 전문가의 조언을 절대 대체하지 않습니다.' },
  { question: '제 사진은 저장되나요?', answer: '아니요. 사진은 AI가 분석한 후 삭제됩니다. 저장되거나 공유되지 않습니다.' },
  { question: '바코드로 제품을 찾을 수 없나요?', answer: '제품 촬영 기능을 사용해 사진으로 직접 제품을 분석하세요.' },
  { question: '가장 정확한 방법은?', answer: '1. 성분표 사진 — 가장 정확하며 권장됩니다\n2. 바코드 스캔 — 제품이 데이터베이스에 있으면 매우 정확합니다\n3. 제품 앞면 사진 — 좋은 추정치이지만 정확한 성분은 다를 수 있습니다' },
  { question: '제 데이터는 안전한가요?', answer: '네. 우리는 여러분의 데이터를 절대 판매하지 않습니다. 자세한 내용은 개인정보 처리방침을 확인하세요.' },
  { question: 'Dr.Toxi는 식품만 분석하나요?', answer: '아니요. Dr.Toxi는 주변의 모든 것을 분석할 수 있습니다: 식품, 화장품, 생활용품, 주방용품, 의류, 용기. 어떤 물건이든 촬영하면 Dr.Toxi가 잠재적 발암 물질이 들어 있는지 알려줍니다.' },
];

function getFaqData(): FAQItem[] {
  const lang = getDeviceLanguage();
  if (lang === 'ko') return FAQ_DATA_KO;
  if (lang === 'en') return FAQ_DATA_EN;
  return FAQ_DATA_FR;
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
      <Text style={styles.title}>{pick({ en: 'Frequently asked questions', fr: 'Questions fréquentes', ko: '자주 묻는 질문' })}</Text>
      <Text style={styles.subtitle}>{pick({ en: `${getFaqData().length} questions to understand everything`, fr: `${getFaqData().length} questions pour tout comprendre`, ko: `모두 이해하기 위한 질문 ${getFaqData().length}가지` })}</Text>

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
    backgroundColor: 'rgba(46, 158, 52, 0.03)',
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
