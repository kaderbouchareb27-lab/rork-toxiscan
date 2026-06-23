import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const ONBOARDING_KEY = 'toxiscan_onboarding_complete';
const AI_CONSENT_KEY = 'toxiscan_ai_consent';
/** First-launch onboarding for the meal-scan mode (presentation + notifications). */
const MEAL_ONBOARDING_KEY = 'toxiscan_meal_onboarding_complete';

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [hasAcceptedAIConsent, setHasAcceptedAIConsent] = useState<boolean | null>(null);
  const [hasSeenMealOnboarding, setHasSeenMealOnboarding] = useState<boolean | null>(null);

  const onboardingQuery = useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      return value === 'true';
    },
  });

  const consentQuery = useQuery({
    queryKey: ['aiConsent'],
    queryFn: async () => {
      const value = await AsyncStorage.getItem(AI_CONSENT_KEY);
      return value === 'true';
    },
  });

  const mealOnboardingQuery = useQuery({
    queryKey: ['mealOnboarding'],
    queryFn: async () => {
      const value = await AsyncStorage.getItem(MEAL_ONBOARDING_KEY);
      return value === 'true';
    },
  });

  useEffect(() => {
    if (onboardingQuery.data !== undefined) {
      setHasSeenOnboarding(onboardingQuery.data);
    }
  }, [onboardingQuery.data]);

  useEffect(() => {
    if (consentQuery.data !== undefined) {
      setHasAcceptedAIConsent(consentQuery.data);
    }
  }, [consentQuery.data]);

  useEffect(() => {
    if (mealOnboardingQuery.data !== undefined) {
      setHasSeenMealOnboarding(mealOnboardingQuery.data);
    }
  }, [mealOnboardingQuery.data]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    },
  });

  const consentMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.setItem(AI_CONSENT_KEY, 'true');
    },
  });

  const mealOnboardingMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.setItem(MEAL_ONBOARDING_KEY, 'true');
    },
  });

  const completeOnboarding = useCallback(() => {
    setHasSeenOnboarding(true);
    completeMutation.mutate();
  }, [completeMutation]);

  const acceptAIConsent = useCallback(() => {
    setHasAcceptedAIConsent(true);
    consentMutation.mutate();
  }, [consentMutation]);

  const completeMealOnboarding = useCallback(() => {
    setHasSeenMealOnboarding(true);
    mealOnboardingMutation.mutate();
  }, [mealOnboardingMutation]);

  return useMemo(() => ({
    hasSeenOnboarding,
    hasAcceptedAIConsent,
    hasSeenMealOnboarding,
    completeOnboarding,
    acceptAIConsent,
    completeMealOnboarding,
    isLoading: onboardingQuery.isLoading || consentQuery.isLoading || mealOnboardingQuery.isLoading,
  }), [hasSeenOnboarding, hasAcceptedAIConsent, hasSeenMealOnboarding, completeOnboarding, acceptAIConsent, completeMealOnboarding, onboardingQuery.isLoading, consentQuery.isLoading, mealOnboardingQuery.isLoading]);
});
