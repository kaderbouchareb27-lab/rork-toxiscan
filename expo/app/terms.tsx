import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '@/constants/colors';
import { isEnglish } from '@/utils/i18n';

export default function TermsScreen() {
  console.log('[Terms] Rendering terms screen');
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{isEnglish() ? 'Terms of Use' : "Conditions d'utilisation"}</Text>
      <Text style={styles.updated}>{isEnglish() ? 'Last updated: March 2026' : 'Dernière mise à jour : mars 2026'}</Text>

      <View style={styles.highlightCard}>
        <Text style={styles.highlightText}>{isEnglish() ? 'By using Dr.Toxi, you accept these terms of use.' : "En utilisant Dr.Toxi, vous acceptez les présentes conditions d'utilisation."}</Text>
      </View>

      <Text style={styles.heading}>{isEnglish() ? '1. Purpose' : '1. Objet'}</Text>
      <Text style={styles.body}>
        {isEnglish() ? "Dr.Toxi is a mobile application that scans everyday consumer products to identify the potential presence of concerning substances or those classified as carcinogenic by the IARC/WHO. The app also features an AI assistant (Dr. Toxi) to answer your questions about ingredients." : "Dr.Toxi est une application mobile permettant de scanner des produits de consommation courante afin d'identifier la présence potentielle de substances préoccupantes ou classées cancérigènes par le CIRC/OMS. L'application propose également un assistant IA (Dr. Toxi) pour répondre à vos questions sur les ingrédients."}
      </Text>

      <Text style={styles.heading}>{isEnglish() ? '2. Medical Disclaimer' : '2. Avertissement médical'}</Text>
      <View style={styles.warningCard}>
        <Text style={styles.warningText}>
          {isEnglish() ? 'Information provided by Dr.Toxi is for informational purposes only. It does not constitute medical advice, a diagnosis, or a treatment recommendation. Consult a healthcare professional for any medical question.' : 'Les informations fournies par Dr.Toxi sont à titre informatif uniquement. Elles ne constituent en aucun cas un avis médical, un diagnostic ou une recommandation de traitement. Consultez un professionnel de santé pour toute question médicale.'}
        </Text>
      </View>

      <Text style={styles.heading}>{isEnglish() ? '3. Use of the Application' : "3. Utilisation de l'application"}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={isEnglish() ? 'You must be at least 13 years old to use Dr.Toxi' : 'Vous devez avoir au moins 13 ans pour utiliser Dr.Toxi'} />
        <BulletItem text={isEnglish() ? 'You agree to use the application in accordance with the law' : "Vous vous engagez à utiliser l'application de manière conforme à la loi"} />
        <BulletItem text={isEnglish() ? 'You must not attempt to bypass the application security measures' : "Vous ne devez pas tenter de contourner les mesures de sécurité de l'application"} />
        <BulletItem text={isEnglish() ? 'Abusive or automated use of the application is prohibited' : "L'utilisation abusive ou automatisée de l'application est interdite"} />
      </View>

      <Text style={styles.heading}>{isEnglish() ? '4. Data Sources' : '4. Sources de données'}</Text>
      <Text style={styles.body}>
        {isEnglish() ? "Product information comes from Open Food Facts, a collaborative and open database. Risk classifications are based on public data from the IARC/WHO. Dr.Toxi does not guarantee the completeness or accuracy of this data." : "Les informations sur les produits proviennent d'Open Food Facts, une base de données collaborative et ouverte. Les classifications de risque sont basées sur les données publiques du CIRC/OMS. Dr.Toxi ne garantit pas l'exhaustivité ou l'exactitude de ces données."}
      </Text>

      <Text style={styles.heading}>{isEnglish() ? '5. Artificial Intelligence' : '5. Intelligence artificielle'}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={isEnglish() ? 'The Dr. Toxi assistant uses artificial intelligence to answer your questions' : "L'assistant Dr. Toxi utilise l'intelligence artificielle pour répondre à vos questions"} />
        <BulletItem text={isEnglish() ? 'AI responses may contain errors or inaccuracies' : "Les réponses de l'IA peuvent contenir des erreurs ou des imprécisions"} />
        <BulletItem text={isEnglish() ? 'AI does not replace the advice of a healthcare professional' : "L'IA ne remplace pas l'avis d'un professionnel de santé"} />
        <BulletItem text={isEnglish() ? 'Conversations are not stored on our servers' : 'Les conversations ne sont pas conservées sur nos serveurs'} />
      </View>

      <Text style={styles.heading}>{isEnglish() ? '6. Pro Subscription' : '6. Abonnement Pro'}</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text={isEnglish() ? 'Dr.Toxi offers a Pro subscription with extended features' : 'Dr.Toxi propose un abonnement Pro avec des fonctionnalités étendues'} />
        <BulletItem text={isEnglish() ? 'The subscription is managed via the App Store (Apple) or Google Play Store' : "L'abonnement est géré via l'App Store (Apple) ou le Google Play Store"} />
        <BulletItem text={isEnglish() ? 'Renewal is automatic unless canceled 24h before the end of the period' : 'Le renouvellement est automatique sauf annulation 24h avant la fin de la période'} />
        <BulletItem text={isEnglish() ? 'No refund is possible for the current period' : "Aucun remboursement n'est possible pour la période en cours"} />
        <BulletItem text={isEnglish() ? 'You can manage or cancel your subscription in your device settings' : 'Vous pouvez gérer ou annuler votre abonnement dans les réglages de votre appareil'} />
      </View>

      <Text style={styles.heading}>{isEnglish() ? '7. Intellectual Property' : '7. Propriété intellectuelle'}</Text>
      <Text style={styles.body}>
        {isEnglish() ? 'The Dr.Toxi application, its design, source code, and content are protected by intellectual property law. Any unauthorized reproduction, distribution, or use is strictly prohibited.' : "L'application Dr.Toxi, son design, son code source et son contenu sont protégés par le droit de la propriété intellectuelle. Toute reproduction, distribution ou utilisation non autorisée est strictement interdite."}
      </Text>

      <Text style={styles.heading}>{isEnglish() ? '8. Limitation of Liability' : '8. Limitation de responsabilité'}</Text>
      <Text style={styles.body}>
        {isEnglish() ? 'Dr.Toxi is provided "as is", without warranty of any kind. We shall not be held liable for any direct or indirect damage resulting from the use of the application or the information it provides. Decisions you make based on Dr.Toxi information are your sole responsibility.' : "Dr.Toxi est fourni \"tel quel\", sans garantie d'aucune sorte. Nous ne saurions être tenus responsables de tout dommage direct ou indirect résultant de l'utilisation de l'application ou des informations qu'elle fournit. Les décisions que vous prenez sur la base des informations de Dr.Toxi relèvent de votre seule responsabilité."}
      </Text>

      <Text style={styles.heading}>{isEnglish() ? '9. Modification of Terms' : '9. Modification des conditions'}</Text>
      <Text style={styles.body}>
        {isEnglish() ? 'We reserve the right to modify these terms at any time. Changes take effect upon publication in the application. By continuing to use Dr.Toxi after a modification, you accept the new terms.' : "Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prennent effet dès leur publication dans l'application. En continuant à utiliser Dr.Toxi après une modification, vous acceptez les nouvelles conditions."}
      </Text>

      <Text style={styles.heading}>{isEnglish() ? '10. Applicable Law' : '10. Droit applicable'}</Text>
      <Text style={styles.body}>
        {isEnglish() ? 'These terms are governed by Canadian law. Any dispute relating to the use of Dr.Toxi shall be submitted to the competent courts of Canada.' : "Les présentes conditions sont régies par le droit canadien. Tout litige relatif à l'utilisation de Dr.Toxi sera soumis aux tribunaux compétents du Canada."}
      </Text>

      <View style={styles.contactCard}>
        <Text style={styles.contactLabel}>{isEnglish() ? 'Questions?' : 'Questions ?'}</Text>
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
