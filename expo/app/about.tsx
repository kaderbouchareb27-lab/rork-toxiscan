import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import Colors from '@/constants/colors';
import { pick, t } from '@/utils/i18n';

export default function AboutScreen() {
  console.log('[About] Rendering about screen');
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroSection}>
        <Image
          source={{ uri: 'https://r2-pub.rork.com/attachments/3a89mndx58c8x8mx5wdrr.png' }}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.appName}>ToxiScan</Text>
        <Text style={styles.tagline}>{pick({ en: 'Scan. Understand. Protect.', fr: 'Scannez. Comprenez. Protégez.', ko: '스캔하세요. 이해하세요. 보호하세요.' })}</Text>
      </View>

      <Text style={styles.heading}>{pick({ en: 'Our mission', fr: 'Notre mission', ko: '우리의 사명' })}</Text>

      <Text style={styles.paragraph}>
        {pick({
          en: "I've seen too many people around me fight cancer. Family, friends, colleagues. Good people who didn't know that what they ate, used, or breathed every day could increase their risk.",
          fr: "J'ai vu trop de gens autour de moi se battre contre le cancer. Des proches, des amis, des collègues. Des gens bien qui ne savaient pas que ce qu'ils mangeaient, ce qu'ils utilisaient ou ce qu'ils respiraient au quotidien pouvait augmenter leur risque.",
          ko: '제 주변에서 너무 많은 사람들이 암과 싸우는 것을 봤습니다. 가족, 친구, 동료. 매일 먹고, 쓰고, 숨 쀦는 것이 위험을 높일 수 있다는 걸 몰랐던 좋은 사람들이었습니다.',
        })}
      </Text>

      <Text style={styles.paragraph}>
        {pick({
          en: "Dr.Toxi was born from this reality. My goal is simple: give you the power to know. Know what's really in your products. Know which ingredients to avoid. Know how to protect your family.",
          fr: "Dr.Toxi est né de cette réalité. Mon objectif est simple : vous donner le pouvoir de savoir. Savoir ce qu'il y a vraiment dans vos produits. Savoir quels ingrédients éviter. Savoir comment protéger votre famille.",
          ko: 'Dr.Toxi는 이 현실에서 탄생했습니다. 제 목표는 간단합니다: 여러분에게 알 수 있는 힘을 드리는 것. 제품에 정말 무엇이 들었는지 아는 것. 어떤 성분을 피해야 하는지 아는 것. 가족을 어떻게 보호하는지 아는 것.',
        })}
      </Text>

      <Text style={styles.paragraph}>
        {pick({
          en: "We can't control everything. But we can make better choices when we have the right information. That's exactly what Dr.Toxi offers: information, simply, clearly, honestly.",
          fr: "On ne peut pas tout contrôler. Mais on peut faire de meilleurs choix quand on a la bonne information. C'est exactement ce que Dr.Toxi vous offre : l'information, simplement, clairement, honnêtement.",
          ko: '모든 것을 통제할 수는 없습니다. 하지만 올바른 정보가 있으면 더 나은 선택을 할 수 있습니다. 그것이 바로 Dr.Toxi가 드리는 것입니다: 정보를, 간단하고, 명확하고, 정직하게.',
        })}
      </Text>

      <View style={styles.donationCard}>
        <Text style={styles.donationText}>
          {t('donation_text')}
        </Text>
      </View>

      <Text style={styles.paragraph}>
        {pick({ en: 'Take care of yourself and those you love.', fr: 'Prenez soin de vous et de ceux que vous aimez.', ko: '자신과 사랑하는 사람들을 돌보세요.' })}
      </Text>

      <View style={styles.signatureBlock}>
        <Text style={styles.signature}>Abdelkader Bouchareb</Text>
        <Text style={styles.role}>{pick({ en: 'Founder & Developer of Dr.Toxi', fr: 'Fondateur & Développeur de Dr.Toxi', ko: 'Dr.Toxi 창립자 & 개발자' })}</Text>
      </View>

      <View style={styles.addressBlock}>
        <Text style={styles.addressLine}>1055 Rue Lucien-L&apos;Allier, Unit #1036</Text>
        <Text style={styles.addressLine}>Montréal, QC H3G 3C4</Text>
        <Text style={styles.addressLine}>Canada</Text>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 12,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: Colors.text,
    marginBottom: 20,
  },
  donationCard: {
    backgroundColor: 'rgba(46, 158, 52, 0.08)',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  donationText: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  signatureBlock: {
    marginTop: 12,
    marginBottom: 40,
  },
  signature: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  role: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  addressBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: 20,
  },
  addressLine: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 20,
  },
});
