import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Brain, Shield, Eye } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { pick } from '@/utils/i18n';

export default function TransparencyScreen() {
  console.log('[Transparency] Rendering transparency screen');
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerSection}>
        <View style={styles.iconCircle}>
          <Eye color={Colors.primary} size={28} strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>{pick({ en: 'How Dr.Toxi uses artificial intelligence', fr: "Comment Dr.Toxi utilise l'intelligence artificielle", ko: 'Dr.Toxi가 인공지능을 사용하는 방법' })}</Text>
      </View>

      <View style={styles.highlightCard}>
        <Text style={styles.highlightText}>{pick({ en: 'Dr.Toxi believes in total transparency. You deserve to know how each feature works.', fr: 'Dr.Toxi croit en la transparence totale. Vous méritez de savoir comment fonctionne chaque fonctionnalité.', ko: 'Dr.Toxi는 완전한 투명성을 믿습니다. 여러분은 각 기능이 어떻게 작동하는지 알 권리가 있습니다.' })}</Text>
      </View>

      <View style={styles.providerCard}>
        <Text style={styles.providerLabel}>{pick({ en: 'AI providers used', fr: "Modèles d'IA utilisés", ko: '사용된 AI 모델' })}</Text>
        <Text style={styles.providerValue}>{pick({ en: 'Qwen3.7 Plus is our vision model — it analyzes your product and meal photos. OpenAI GPT-4o-mini handles Dr. Toxi chat responses and text analysis, and Google Vision reads label text. Models are accessed via secure providers (OpenRouter and the Rork AI Toolkit) and used only for photo analysis and chat.', fr: "Qwen3.7 Plus est notre modèle de vision — il analyse vos photos de produits et de repas. OpenAI GPT-4o-mini gère les réponses du chat Dr. Toxi et l'analyse de texte, et Google Vision lit le texte des étiquettes. Les modèles sont accédés via des fournisseurs sécurisés (OpenRouter et le Rork AI Toolkit) et utilisés uniquement pour l'analyse photo et le chat.", ko: 'Qwen3.7 Plus는 비전 모델로, 제품과 식사 사진을 분석합니다. OpenAI GPT-4o-mini는 Dr. Toxi 채팅 응답과 텍스트 분석을 담당하고, Google Vision은 라벨의 텍스트를 읽습니다. 모델은 보안 제공업체(OpenRouter 및 Rork AI Toolkit)를 통해 사용되며 사진 분석과 채팅에만 사용됩니다.' })}</Text>
      </View>

      <Text style={styles.heading}>{pick({ en: 'Dr.Toxi uses AI in two areas:', fr: "Dr.Toxi utilise l'IA à deux endroits :", ko: 'Dr.Toxi는 두 가지 영역에서 AI를 사용합니다:' })}</Text>

      <View style={styles.featureCard}>
        <View style={styles.featureIcon}>
          <Brain color={Colors.primary} size={20} strokeWidth={1.5} />
        </View>
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>{pick({ en: '1. Universal photo analysis', fr: '1. Analyse photo universelle', ko: '1. 범용 사진 분석' })}</Text>
          <Text style={styles.featureDescription}>
            {pick({ en: 'When you photograph an everyday product or object, our AI analyzes the photo to identify the object, its materials, and evaluate potentially carcinogenic substances.', fr: "Quand vous photographiez un produit ou objet du quotidien, notre IA analyse la photo pour identifier l'objet, ses matériaux et évaluer les substances potentiellement cancérigènes.", ko: '일상 제품이나 물건을 촬영하면 AI가 사진을 분석해 물건과 소재를 식별하고 잠재적 발암 물질을 평가합니다.' })}
          </Text>
        </View>
      </View>

      <View style={styles.featureCard}>
        <View style={styles.featureIcon}>
          <Shield color={Colors.primary} size={20} strokeWidth={1.5} />
        </View>
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>{pick({ en: '2. Dr. Toxi (expert chatbot)', fr: '2. Dr. Toxi (chatbot expert)', ko: '2. Dr. Toxi (전문가 챗봇)' })}</Text>
          <Text style={styles.featureDescription}>
            {pick({ en: 'Answers your questions about everyday toxic substances: food additives, plastics, cosmetics, kitchen utensils, and more.', fr: 'Répond à vos questions sur les substances toxiques du quotidien : additifs alimentaires, plastiques, cosmétiques, ustensiles de cuisine et plus encore.', ko: '식품 첨가물, 플라스틱, 화장품, 주방용품 등 일상 속 독성 물질에 대한 질문에 답합니다.' })}
          </Text>
        </View>
      </View>

      <Text style={styles.heading}>{pick({ en: 'What AI does NOT do', fr: "Ce que l'IA ne fait PAS", ko: 'AI가 하지 않는 것' })}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={pick({ en: 'Barcode scan risk badges are based on IARC/WHO classifications, not AI', fr: "Les badges de risque des scans code-barres sont basés sur les classifications CIRC/OMS, pas sur l'IA", ko: '바코드 스캔 위험 배지는 AI가 아니라 IARC/WHO 분류에 기반합니다' })} />
        <BulletItem text={pick({ en: 'AI does not make any medical diagnosis', fr: "L'IA ne pose aucun diagnostic médical", ko: 'AI는 어떤 의학적 진단도 내리지 않습니다' })} />
        <BulletItem text={pick({ en: 'AI does not replace a healthcare professional', fr: "L'IA ne remplace pas un professionnel de santé", ko: 'AI는 의료 전문가를 대체하지 않습니다' })} />
        <BulletItem text={pick({ en: 'AI does not create false alerts on natural and healthy products', fr: "L'IA ne crée pas de fausses alertes sur les produits naturels et sains", ko: 'AI는 자연스럽고 건강한 제품에 거짓 경고를 만들지 않습니다' })} />
      </View>

      <Text style={styles.heading}>{pick({ en: 'Your data and AI', fr: "Vos données et l'IA", ko: '여러분의 데이터와 AI' })}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={pick({ en: 'Photos and messages are processed securely by our AI', fr: 'Photos et messages sont traités par notre IA de manière sécurisée', ko: '사진과 메시지는 AI가 안전하게 처리합니다' })} />
        <BulletItem text={pick({ en: 'Nothing is retained after processing by our AI', fr: "Rien n'est conservé après le traitement par notre IA", ko: 'AI 처리 후에는 아무것도 보관되지 않습니다' })} />
        <BulletItem text={pick({ en: 'No data is used to train AI models', fr: "Aucune donnée n'est utilisée pour entraîner des modèles IA", ko: 'AI 모델 학습에 데이터를 사용하지 않습니다' })} />
        <BulletItem text={pick({ en: 'Your scans remain stored locally on your device', fr: 'Vos scans restent stockés localement sur votre appareil', ko: '스캔 기록은 기기에 로컬로 저장됩니다' })} />
      </View>

      <Text style={styles.heading}>{pick({ en: 'Why this transparency?', fr: 'Pourquoi cette transparence ?', ko: '왜 이런 투명성인가요?' })}</Text>
      <Text style={styles.body}>
        {pick({ en: 'Because you have the right to know exactly how a tool you use for your health works. No black box, no mystery. Every result is based on official and verifiable scientific classifications.', fr: 'Parce que vous avez le droit de savoir exactement comment fonctionne un outil que vous utilisez pour votre santé. Pas de boîte noire, pas de mystère. Chaque résultat est basé sur des classifications scientifiques officielles et vérifiables.', ko: '여러분이 건강을 위해 사용하는 도구가 정확히 어떻게 작동하는지 알 권리가 있기 때문입니다. 블랙박스도, 비밀도 없습니다. 모든 결과는 공식적이고 검증 가능한 과학적 분류에 기반합니다.' })}
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
  providerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  providerLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  providerValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
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
