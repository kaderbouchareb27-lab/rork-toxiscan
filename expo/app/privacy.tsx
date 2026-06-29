import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '@/constants/colors';
import { pick } from '@/utils/i18n';

export default function PrivacyScreen() {
  console.log('[Privacy] Rendering privacy screen');
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{pick({ en: 'Privacy Policy', fr: 'Politique de confidentialité', ko: '개인정보 처리방침' })}</Text>
      <Text style={styles.updated}>{pick({ en: 'Last updated: June 2026', fr: 'Dernière mise à jour : juin 2026', ko: '최종 업데이트: 2026년 6월' })}</Text>

      <View style={styles.highlightCard}>
        <Text style={styles.highlightText}>{pick({ en: 'Dr.Toxi respects your privacy. We never sell your data.', fr: 'Dr.Toxi respecte votre vie privée. Nous ne vendons jamais vos données.', ko: 'Dr.Toxi는 여러분의 개인정보를 존중합니다. 우리는 여러분의 데이터를 절대 판매하지 않습니다.' })}</Text>
      </View>

      <Text style={styles.heading}>{pick({ en: 'Data collected', fr: 'Données collectées', ko: '수집하는 데이터' })}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={pick({ en: 'Ingredient list photos (analyzed by our AI, not stored)', fr: "Photos de listes d'ingrédients (analysées par notre IA, non conservées)", ko: '성분표 사진(AI가 분석하며 저장하지 않음)' })} />
        <BulletItem text={pick({ en: 'Your scan history (stored locally on your device only)', fr: 'Historique de vos scans (stocké localement sur votre appareil uniquement)', ko: '스캔 기록(기기에만 로컬 저장)' })} />
        <BulletItem text={pick({ en: 'Messages sent to Dr. Toxi (processed by our AI, not stored)', fr: 'Messages envoyés à Dr. Toxi (traités par notre IA, non conservés)', ko: 'Dr. Toxi에 보낸 메시지(AI가 처리하며 저장하지 않음)' })} />
      </View>

      <Text style={styles.heading}>{pick({ en: 'Data NOT collected', fr: 'Données NON collectées', ko: '수집하지 않는 데이터' })}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={pick({ en: 'NO name, email, phone, or location', fr: 'PAS de nom, email, téléphone ou localisation', ko: '이름, 이메일, 전화번호, 위치 없음' })} />
        <BulletItem text={pick({ en: 'NO selling data to third parties', fr: 'PAS de vente de données à des tiers', ko: '제3자에게 데이터 판매 없음' })} />
        <BulletItem text={pick({ en: 'NO targeted advertising', fr: 'PAS de publicité ciblée', ko: '타겟 광고 없음' })} />
        <BulletItem text={pick({ en: 'NO intrusive trackers or analytics', fr: 'PAS de trackers ou analytics intrusifs', ko: '침투적인 추적기나 분석 도구 없음' })} />
      </View>

      <Text style={styles.heading}>{pick({ en: 'Artificial Intelligence', fr: 'Intelligence artificielle', ko: '인공지능' })}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={pick({ en: 'Dr.Toxi uses artificial intelligence to analyze ingredient photos and for the Dr. Toxi chatbot', fr: "Dr.Toxi utilise l'intelligence artificielle pour analyser les photos d'ingrédients et pour le chatbot Dr. Toxi", ko: 'Dr.Toxi는 성분 사진 분석과 Dr. Toxi 챗봇에 인공지능을 사용합니다' })} />
        <BulletItem text={pick({ en: 'Photos and messages are processed securely by our AI', fr: 'Les photos et messages sont traités par notre IA de manière sécurisée', ko: '사진과 메시지는 AI가 안전하게 처리합니다' })} />
        <BulletItem text={pick({ en: 'Our AI does not retain data beyond processing', fr: 'Notre IA ne conserve pas les données au-delà du traitement', ko: '우리 AI는 처리 후 데이터를 보관하지 않습니다' })} />
        <BulletItem text={pick({ en: 'Results are for informational purposes and do not constitute medical advice', fr: 'Les résultats sont à titre informatif et ne constituent pas un avis médical', ko: '결과는 정보 제공 목적이며 의학적 조언이 아닙니다' })} />
      </View>

      <Text style={styles.heading}>{pick({ en: 'Product database', fr: 'Base de données produits', ko: '제품 데이터베이스' })}</Text>
      <Text style={styles.body}>
        {pick({ en: 'Product analysis is powered by the Dr.Toxi proprietary database, enriched with global cancer research from international authorities (IARC/WHO, EFSA, FDA, NTP, INSERM). The database is updated continuously each time a new ingredient is declared carcinogenic or ultra-processed anywhere in the world.', fr: "L'analyse des produits est propulsée par la base de données propriétaire Dr.Toxi, enrichie par les recherches mondiales sur le cancer issues des autorités internationales (CIRC/OMS, EFSA, FDA, NTP, INSERM). La base est mise à jour en continu à chaque nouvel ingrédient déclaré cancérigène ou ultra-transformé dans le monde.", ko: '제품 분석은 국제 기관(IARC/WHO, EFSA, FDA, NTP, INSERM)의 전 세계 암 연구로 보강된 Dr.Toxi 독자 데이터베이스로 구동됩니다. 데이터베이스는 전 세계에서 새로운 성분이 발암성 또는 초가공으로 선언될 때마다 지속적으로 업데이트됩니다.' })}
      </Text>

      <Text style={styles.heading}>{pick({ en: 'Local storage', fr: 'Stockage local', ko: '로컬 저장' })}</Text>
      <Text style={styles.body}>
        {pick({ en: 'Your scan history and preferences are stored only on your device via AsyncStorage. This data never leaves your phone and is not synced to our servers.', fr: 'Votre historique de scans et vos préférences sont stockés uniquement sur votre appareil via AsyncStorage. Ces données ne quittent jamais votre téléphone et ne sont pas synchronisées vers nos serveurs.', ko: '스캔 기록과 환경설정은 AsyncStorage를 통해 기기에만 저장됩니다. 이 데이터는 절대 휴대폰을 벗어나지 않으며 우리 서버와 동기화되지 않습니다.' })}
      </Text>

      <Text style={styles.heading}>{pick({ en: 'NonToxic Hub (community)', fr: 'NonToxic Hub (communauté)', ko: 'NonToxic Hub (커뮤니티)' })}</Text>
      <Text style={styles.body}>
        {pick({
          en: 'NonToxic Hub is an optional community forum. ONLY what you choose to publish there — your posts and comments, your auto-generated pseudo, and the photo + verdict of a product you denounce — is sent to and stored on a shared server so other members can see it. Reading the Hub requires nothing. We never attach your name, email, or phone number. Posts and comments are checked by AI before publishing, and content reported by several members is hidden automatically.',
          fr: "NonToxic Hub est un forum communautaire optionnel. SEUL ce que tu choisis d'y publier — tes posts et commentaires, ton pseudo généré automatiquement, et la photo + le verdict d'un produit que tu dénonces — est envoyé et stocké sur un serveur partagé pour être visible par les autres membres. Lire le Hub ne nécessite rien. Nous n'y associons jamais ton nom, email ou téléphone. Les posts et commentaires sont vérifiés par l'IA avant publication, et un contenu signalé par plusieurs membres est masqué automatiquement.",
          ko: 'NonToxic Hub는 선택적 커뮤니티 포럼입니다. 게시물과 댓글, 자동 생성된 닉네임, 고발하는 제품의 사진과 판정 등 직접 게시하기로 선택한 내용만 다른 회원이 볼 수 있도록 공유 서버로 전송·저장됩니다. Hub를 읽는 데는 아무것도 필요하지 않습니다. 이름, 이메일, 전화번호는 절대 연결되지 않습니다. 게시물과 댓글은 게시 전 AI가 검토하며, 여러 회원이 신고한 콘텐츠는 자동으로 숨겨집니다.',
        })}
      </Text>

      <Text style={styles.heading}>{pick({ en: 'Your rights', fr: 'Vos droits', ko: '여러분의 권리' })}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={pick({ en: "Delete your history at any time in the app (History → trash icon)", fr: "Supprimer votre historique à tout moment dans l'app (Historique → icône corbeille)", ko: '앱에서 언제든지 기록을 삭제할 수 있습니다(기록 → 휴지통 아이콘)' })} />
        <BulletItem text={pick({ en: 'Contact us for any deletion request or question', fr: 'Nous contacter pour toute demande de suppression ou question', ko: '삭제 요청이나 문의는 언제든 연락하세요' })} />
        <BulletItem text={pick({ en: 'Uninstall the app to delete all local data', fr: "Désinstaller l'app pour supprimer toutes les données locales", ko: '앱을 삭제하면 모든 로컬 데이터가 삭제됩니다' })} />
      </View>

      <View style={styles.contactCard}>
        <Text style={styles.contactLabel}>{pick({ en: 'Contact', fr: 'Contact', ko: '문의' })}</Text>
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
