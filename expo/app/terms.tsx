import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '@/constants/colors';

export default function TermsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Conditions d'utilisation</Text>
      <Text style={styles.updated}>Dernière mise à jour : mars 2026</Text>

      <View style={styles.highlightCard}>
        <Text style={styles.highlightText}>En utilisant Dr.Toxi, vous acceptez les présentes conditions d'utilisation.</Text>
      </View>

      <Text style={styles.heading}>1. Objet</Text>
      <Text style={styles.body}>
        Dr.Toxi est une application mobile permettant de scanner des produits de consommation courante afin d'identifier la présence potentielle de substances préoccupantes ou classées cancérigènes par le CIRC/OMS. L'application propose également un assistant IA (Dr. Toxi) pour répondre à vos questions sur les ingrédients.
      </Text>

      <Text style={styles.heading}>2. Avertissement médical</Text>
      <View style={styles.warningCard}>
        <Text style={styles.warningText}>
          Les informations fournies par Dr.Toxi sont à titre informatif uniquement. Elles ne constituent en aucun cas un avis médical, un diagnostic ou une recommandation de traitement. Consultez un professionnel de santé pour toute question médicale.
        </Text>
      </View>

      <Text style={styles.heading}>3. Utilisation de l'application</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text="Vous devez avoir au moins 13 ans pour utiliser Dr.Toxi" />
        <BulletItem text="Vous vous engagez à utiliser l'application de manière conforme à la loi" />
        <BulletItem text="Vous ne devez pas tenter de contourner les mesures de sécurité de l'application" />
        <BulletItem text="L'utilisation abusive ou automatisée de l'application est interdite" />
      </View>

      <Text style={styles.heading}>4. Sources de données</Text>
      <Text style={styles.body}>
        Les informations sur les produits proviennent d'Open Food Facts, une base de données collaborative et ouverte. Les classifications de risque sont basées sur les données publiques du CIRC/OMS. Dr.Toxi ne garantit pas l'exhaustivité ou l'exactitude de ces données.
      </Text>

      <Text style={styles.heading}>5. Intelligence artificielle</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text="L'assistant Dr. Toxi utilise l'intelligence artificielle pour répondre à vos questions" />
        <BulletItem text="Les réponses de l'IA peuvent contenir des erreurs ou des imprécisions" />
        <BulletItem text="L'IA ne remplace pas l'avis d'un professionnel de santé" />
        <BulletItem text="Les conversations ne sont pas conservées sur nos serveurs" />
      </View>

      <Text style={styles.heading}>6. Abonnement Pro</Text>
      <View style={styles.bulletGroup}>
        <BulletItem text="Dr.Toxi propose un abonnement Pro avec des fonctionnalités étendues" />
        <BulletItem text="L'abonnement est géré via l'App Store (Apple) ou le Google Play Store" />
        <BulletItem text="Le renouvellement est automatique sauf annulation 24h avant la fin de la période" />
        <BulletItem text="Aucun remboursement n'est possible pour la période en cours" />
        <BulletItem text="Vous pouvez gérer ou annuler votre abonnement dans les réglages de votre appareil" />
      </View>

      <Text style={styles.heading}>7. Propriété intellectuelle</Text>
      <Text style={styles.body}>
        L'application Dr.Toxi, son design, son code source et son contenu sont protégés par le droit de la propriété intellectuelle. Toute reproduction, distribution ou utilisation non autorisée est strictement interdite.
      </Text>

      <Text style={styles.heading}>8. Limitation de responsabilité</Text>
      <Text style={styles.body}>
        Dr.Toxi est fourni "tel quel", sans garantie d'aucune sorte. Nous ne saurions être tenus responsables de tout dommage direct ou indirect résultant de l'utilisation de l'application ou des informations qu'elle fournit. Les décisions que vous prenez sur la base des informations de Dr.Toxi relèvent de votre seule responsabilité.
      </Text>

      <Text style={styles.heading}>9. Modification des conditions</Text>
      <Text style={styles.body}>
        Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prennent effet dès leur publication dans l'application. En continuant à utiliser Dr.Toxi après une modification, vous acceptez les nouvelles conditions.
      </Text>

      <Text style={styles.heading}>10. Droit applicable</Text>
      <Text style={styles.body}>
        Les présentes conditions sont régies par le droit canadien. Tout litige relatif à l'utilisation de Dr.Toxi sera soumis aux tribunaux compétents du Canada.
      </Text>

      <View style={styles.contactCard}>
        <Text style={styles.contactLabel}>Questions ?</Text>
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
