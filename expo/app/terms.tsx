import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '@/constants/colors';
import { pick } from '@/utils/i18n';

export default function TermsScreen() {
  console.log('[Terms] Rendering terms screen');
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{pick({ en: 'Terms of Use', fr: "Conditions d'utilisation", ko: '이용 약관' })}</Text>
      <Text style={styles.updated}>{pick({ en: 'Last updated: March 2026', fr: 'Dernière mise à jour : mars 2026', ko: '최종 업데이트: 2026년 3월' })}</Text>

      <View style={styles.highlightCard}>
        <Text style={styles.highlightText}>{pick({ en: 'By using Dr.Toxi, you accept these terms of use.', fr: "En utilisant Dr.Toxi, vous acceptez les présentes conditions d'utilisation.", ko: 'Dr.Toxi를 사용함으로써 본 이용 약관에 동의하게 됩니다.' })}</Text>
      </View>

      <Text style={styles.heading}>{pick({ en: '1. Purpose', fr: '1. Objet', ko: '1. 목적' })}</Text>
      <Text style={styles.body}>
        {pick({ en: "Dr.Toxi is a mobile application that scans everyday consumer products to identify the potential presence of concerning substances or those classified as carcinogenic by the IARC/WHO. The app also features an AI assistant (Dr. Toxi) to answer your questions about ingredients.", fr: "Dr.Toxi est une application mobile permettant de scanner des produits de consommation courante afin d'identifier la présence potentielle de substances préoccupantes ou classées cancérigènes par le CIRC/OMS. L'application propose également un assistant IA (Dr. Toxi) pour répondre à vos questions sur les ingrédients.", ko: 'Dr.Toxi는 일상 소비재를 스캔해 우려 물질 또는 IARC/WHO가 발암물질로 분류한 물질의 잠재적 존재를 식별하는 모바일 앱입니다. 또한 성분에 대한 질문에 답하는 AI 어시스턴트(Dr. Toxi)를 제공합니다.' })}
      </Text>

      <Text style={styles.heading}>{pick({ en: '2. Medical Disclaimer', fr: '2. Avertissement médical', ko: '2. 의학적 고지' })}</Text>
      <View style={styles.warningCard}>
        <Text style={styles.warningText}>
          {pick({ en: 'Information provided by Dr.Toxi is for informational purposes only. It does not constitute medical advice, a diagnosis, or a treatment recommendation. Consult a healthcare professional for any medical question.', fr: 'Les informations fournies par Dr.Toxi sont à titre informatif uniquement. Elles ne constituent en aucun cas un avis médical, un diagnostic ou une recommandation de traitement. Consultez un professionnel de santé pour toute question médicale.', ko: 'Dr.Toxi가 제공하는 정보는 정보 제공 목적일 뿐입니다. 의학적 조언, 진단 또는 치료 권고가 아닙니다. 의학적 질문은 의료 전문가와 상담하세요.' })}
        </Text>
      </View>

      <Text style={styles.heading}>{pick({ en: '3. Use of the Application', fr: "3. Utilisation de l'application", ko: '3. 애플리케이션 사용' })}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={pick({ en: 'You must be at least 13 years old to use Dr.Toxi', fr: 'Vous devez avoir au moins 13 ans pour utiliser Dr.Toxi', ko: 'Dr.Toxi를 사용하려면 만 13세 이상이어야 합니다' })} />
        <BulletItem text={pick({ en: 'You agree to use the application in accordance with the law', fr: "Vous vous engagez à utiliser l'application de manière conforme à la loi", ko: '법률에 따라 앱을 사용하는 데 동의합니다' })} />
        <BulletItem text={pick({ en: 'You must not attempt to bypass the application security measures', fr: "Vous ne devez pas tenter de contourner les mesures de sécurité de l'application", ko: '앱의 보안 조치를 우회하려고 시도해서는 안 됩니다' })} />
        <BulletItem text={pick({ en: 'Abusive or automated use of the application is prohibited', fr: "L'utilisation abusive ou automatisée de l'application est interdite", ko: '앱의 남용적이거나 자동화된 사용은 금지됩니다' })} />
      </View>

      <Text style={styles.heading}>{pick({ en: '4. Data Sources', fr: '4. Sources de données', ko: '4. 데이터 출처' })}</Text>
      <Text style={styles.body}>
        {pick({ en: 'Product analysis relies on the Dr.Toxi proprietary database, enriched with global cancer research (IARC/WHO, EFSA, FDA, NTP, INSERM) and updated continuously each time a new ingredient is declared carcinogenic or ultra-processed worldwide. Dr.Toxi does not guarantee the completeness or accuracy of this data.', fr: "L'analyse des produits repose sur la base de données propriétaire Dr.Toxi, enrichie par les recherches mondiales sur le cancer (CIRC/OMS, EFSA, FDA, NTP, INSERM) et mise à jour en continu à chaque nouvel ingrédient déclaré cancérigène ou ultra-transformé dans le monde. Dr.Toxi ne garantit pas l'exhaustivité ou l'exactitude de ces données.", ko: '제품 분석은 전 세계 암 연구(IARC/WHO, EFSA, FDA, NTP, INSERM)로 보강되고 전 세계에서 새로운 성분이 발암성 또는 초가공으로 선언될 때마다 지속적으로 업데이트되는 Dr.Toxi 독자 데이터베이스에 의존합니다. Dr.Toxi는 이 데이터의 완전성이나 정확성을 보장하지 않습니다.' })}
      </Text>

      <Text style={styles.heading}>{pick({ en: '5. Artificial Intelligence', fr: '5. Intelligence artificielle', ko: '5. 인공지능' })}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={pick({ en: 'The Dr. Toxi assistant uses artificial intelligence to answer your questions', fr: "L'assistant Dr. Toxi utilise l'intelligence artificielle pour répondre à vos questions", ko: 'Dr. Toxi 어시스턴트는 인공지능을 사용해 질문에 답합니다' })} />
        <BulletItem text={pick({ en: 'AI responses may contain errors or inaccuracies', fr: "Les réponses de l'IA peuvent contenir des erreurs ou des imprécisions", ko: 'AI 응답에는 오류나 부정확함이 포함될 수 있습니다' })} />
        <BulletItem text={pick({ en: 'AI does not replace the advice of a healthcare professional', fr: "L'IA ne remplace pas l'avis d'un professionnel de santé", ko: 'AI는 의료 전문가의 조언을 대체하지 않습니다' })} />
        <BulletItem text={pick({ en: 'Conversations are not stored on our servers', fr: 'Les conversations ne sont pas conservées sur nos serveurs', ko: '대화는 우리 서버에 저장되지 않습니다' })} />
      </View>

      <Text style={styles.heading}>{pick({ en: '6. Pro Subscription', fr: '6. Abonnement Pro', ko: '6. Pro 구독' })}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={pick({ en: 'Dr.Toxi offers a Pro subscription with extended features', fr: 'Dr.Toxi propose un abonnement Pro avec des fonctionnalités étendues', ko: 'Dr.Toxi는 확장 기능이 있는 Pro 구독을 제공합니다' })} />
        <BulletItem text={pick({ en: 'The subscription is managed via the App Store (Apple) or Google Play Store', fr: "L'abonnement est géré via l'App Store (Apple) ou le Google Play Store", ko: '구독은 App Store(Apple) 또는 Google Play Store를 통해 관리됩니다' })} />
        <BulletItem text={pick({ en: 'Renewal is automatic unless canceled 24h before the end of the period', fr: 'Le renouvellement est automatique sauf annulation 24h avant la fin de la période', ko: '기간 종료 24시간 전에 취소하지 않으면 자동으로 갱신됩니다' })} />
        <BulletItem text={pick({ en: 'No refund is possible for the current period', fr: "Aucun remboursement n'est possible pour la période en cours", ko: '현재 기간에 대한 환불은 불가능합니다' })} />
        <BulletItem text={pick({ en: 'You can manage or cancel your subscription in your device settings', fr: 'Vous pouvez gérer ou annuler votre abonnement dans les réglages de votre appareil', ko: '기기 설정에서 구독을 관리하거나 취소할 수 있습니다' })} />
      </View>

      <Text style={styles.heading}>{pick({ en: '7. Intellectual Property', fr: '7. Propriété intellectuelle', ko: '7. 지식 재산권' })}</Text>
      <Text style={styles.body}>
        {pick({ en: 'The Dr.Toxi application, its design, source code, and content are protected by intellectual property law. Any unauthorized reproduction, distribution, or use is strictly prohibited.', fr: "L'application Dr.Toxi, son design, son code source et son contenu sont protégés par le droit de la propriété intellectuelle. Toute reproduction, distribution ou utilisation non autorisée est strictement interdite.", ko: 'Dr.Toxi 애플리케이션, 디자인, 소스 코드, 콘텐츠는 지식 재산권법으로 보호됩니다. 무단 복제, 배포 또는 사용은 엄격히 금지됩니다.' })}
      </Text>

      <Text style={styles.heading}>{pick({ en: '8. Limitation of Liability', fr: '8. Limitation de responsabilité', ko: '8. 책임의 제한' })}</Text>
      <Text style={styles.body}>
        {pick({ en: 'Dr.Toxi is provided "as is", without warranty of any kind. We shall not be held liable for any direct or indirect damage resulting from the use of the application or the information it provides. Decisions you make based on Dr.Toxi information are your sole responsibility.', fr: "Dr.Toxi est fourni « tel quel », sans garantie d'aucune sorte. Nous ne saurions être tenus responsables de tout dommage direct ou indirect résultant de l'utilisation de l'application ou des informations qu'elle fournit. Les décisions que vous prenez sur la base des informations de Dr.Toxi relèvent de votre seule responsabilité.", ko: 'Dr.Toxi는 어떠한 종류의 보증도 없이 「있는 그대로」 제공됩니다. 앱 사용이나 제공된 정보로 인해 발생하는 직접적 또는 간접적 손해에 대해 책임지지 않습니다. Dr.Toxi 정보를 바탕으로 내리는 결정은 전적으로 본인의 책임입니다.' })}
      </Text>

      <Text style={styles.heading}>{pick({ en: '9. Modification of Terms', fr: '9. Modification des conditions', ko: '9. 약관 변경' })}</Text>
      <Text style={styles.body}>
        {pick({ en: 'We reserve the right to modify these terms at any time. Changes take effect upon publication in the application. By continuing to use Dr.Toxi after a modification, you accept the new terms.', fr: "Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prennent effet dès leur publication dans l'application. En continuant à utiliser Dr.Toxi après une modification, vous acceptez les nouvelles conditions.", ko: '우리는 언제든지 본 약관을 변경할 권리를 보유합니다. 변경 사항은 앱에 게시되는 즉시 효력이 발생합니다. 변경 후에도 Dr.Toxi를 계속 사용하면 새 약관에 동의하는 것입니다.' })}
      </Text>

      <Text style={styles.heading}>{pick({ en: '10. Applicable Law', fr: '10. Droit applicable', ko: '10. 준거법' })}</Text>
      <Text style={styles.body}>
        {pick({ en: 'These terms are governed by Canadian law. Any dispute relating to the use of Dr.Toxi shall be submitted to the competent courts of Canada.', fr: "Les présentes conditions sont régies par le droit canadien. Tout litige relatif à l'utilisation de Dr.Toxi sera soumis aux tribunaux compétents du Canada.", ko: '본 약관은 캐나다 법률의 적용을 받습니다. Dr.Toxi 사용과 관련된 모든 분쟁은 캐나다의 관할 법원에 제출됩니다.' })}
      </Text>

      <View style={styles.contactCard}>
        <Text style={styles.contactLabel}>{pick({ en: 'Questions?', fr: 'Questions ?', ko: '문의가 있으신가요?' })}</Text>
        <Text style={styles.contactEmail}>duneautomateai@gmail.com</Text>
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
  warningCard: {
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  warningText: {
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
