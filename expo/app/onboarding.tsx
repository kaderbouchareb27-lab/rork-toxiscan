import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Shield, Heart, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useOnboarding } from '@/providers/OnboardingProvider';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  renderIllustration: () => React.ReactNode;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Photographiez n\'importe quoi',
    subtitle: 'Aliment, cosmétique, ustensile de cuisine, vêtement, produit ménager…',
    renderIllustration: () => (
      <View style={illustrationStyles.container}>
        <View style={illustrationStyles.phoneFrame}>
          <Camera color={Colors.primary} size={48} strokeWidth={1.2} />
          <View style={illustrationStyles.ingredientLines}>
            <View style={[illustrationStyles.line, { width: 80 }]} />
            <View style={[illustrationStyles.line, { width: 60 }]} />
            <View style={[illustrationStyles.line, { width: 70 }]} />
          </View>
        </View>
      </View>
    ),
  },
  {
    id: '2',
    title: 'Comprenez le risque en 1 seconde',
    subtitle: 'Basé sur les classifications officielles de l\'OMS',
    renderIllustration: () => (
      <View style={illustrationStyles.container}>
        <View style={illustrationStyles.badgesGrid}>
          <View style={[illustrationStyles.badge, { backgroundColor: '#FF3B30' }]}>
            <AlertTriangle color={Colors.white} size={22} />
            <Text style={[illustrationStyles.badgeText, { color: Colors.white }]}>Danger</Text>
          </View>
          <View style={[illustrationStyles.badge, { backgroundColor: '#FF9500' }]}>
            <AlertCircle color={Colors.white} size={22} />
            <Text style={[illustrationStyles.badgeText, { color: Colors.white }]}>Détecté</Text>
          </View>
          <View style={[illustrationStyles.badge, { backgroundColor: '#FFCC00' }]}>
            <AlertCircle color={Colors.black} size={22} />
            <Text style={[illustrationStyles.badgeText, { color: Colors.black }]}>Détecté</Text>
          </View>
          <View style={[illustrationStyles.badge, { backgroundColor: '#34C759' }]}>
            <CheckCircle color={Colors.white} size={22} />
            <Text style={[illustrationStyles.badgeText, { color: Colors.white }]}>OK</Text>
          </View>
        </View>
      </View>
    ),
  },
  {
    id: '3',
    title: 'Protégez votre famille',
    subtitle: 'Faites les bons choix au quotidien pour ceux que vous aimez',
    renderIllustration: () => (
      <View style={illustrationStyles.container}>
        <View style={illustrationStyles.familyContainer}>
          <Shield color={Colors.primary} size={64} strokeWidth={1.2} />
          <View style={illustrationStyles.heartRow}>
            <Heart color={Colors.primary} size={20} fill={Colors.primary} />
            <Heart color={Colors.primary} size={28} fill={Colors.primary} />
            <Heart color={Colors.primary} size={20} fill={Colors.primary} />
          </View>
        </View>
      </View>
    ),
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const flatListRef = useRef<FlatList>(null);
  const { completeOnboarding } = useOnboarding();

  const handleNext = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      console.log('[Onboarding] Moving to slide:', nextIndex + 1);
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
    } else {
      console.log('[Onboarding] Completing onboarding');
      completeOnboarding();
      router.replace('/');
    }
  }, [currentIndex, completeOnboarding]);

  const handleSkip = useCallback(() => {
    console.log('[Onboarding] Skipping onboarding');
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    completeOnboarding();
    router.replace('/');
  }, [completeOnboarding]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems[0]?.index !== null && viewableItems[0]?.index !== undefined) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderSlide = useCallback(({ item }: { item: OnboardingSlide }) => (
    <View style={slideStyles.slide}>
      {item.renderIllustration()}
      <Text style={slideStyles.title}>{item.title}</Text>
      <Text style={slideStyles.subtitle}>{item.subtitle}</Text>
    </View>
  ), []);

  return (
    <SafeAreaView style={slideStyles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        bounces={false}
      />

      <View style={slideStyles.footer}>
        <View style={slideStyles.dots}>
          {slides.map((_, i) => (
            <View
              key={`dot-${i}`}
              style={[slideStyles.dot, i === currentIndex && slideStyles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={slideStyles.button}
          onPress={handleNext}
          activeOpacity={0.8}
          testID="onboarding-next"
        >
          <Text style={slideStyles.buttonText}>
            {currentIndex === slides.length - 1 ? 'Commencer' : 'Suivant'}
          </Text>
        </TouchableOpacity>

        {currentIndex < slides.length - 1 && (
          <TouchableOpacity
            onPress={handleSkip}
            style={slideStyles.skipButton}
            testID="onboarding-skip"
          >
            <Text style={slideStyles.skipText}>Passer</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const illustrationStyles = StyleSheet.create({
  container: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  phoneFrame: {
    width: 160,
    height: 200,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    gap: 12,
  },
  ingredientLines: {
    gap: 6,
    alignItems: 'center',
  },
  line: {
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    maxWidth: 240,
  },
  badge: {
    width: 108,
    height: 64,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  familyContainer: {
    alignItems: 'center',
    gap: 20,
  },
  heartRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
});

const slideStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  slide: {
    width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
