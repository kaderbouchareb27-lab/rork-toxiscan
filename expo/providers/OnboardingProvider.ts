import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const ONBOARDING_KEY = 'toxiscan_onboarding_complete';
const AI_CONSENT_KEY = 'toxiscan_ai_consent';

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [hasAcceptedAIConsent, setHasAcceptedAIConsent] = useState<boolean | null>(null);

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

  const completeOnboarding = useCallback(() => {
    setHasSeenOnboarding(true);
    completeMutation.mutate();
  }, [completeMutation]);

  const acceptAIConsent = useCallback(() => {
    setHasAcceptedAIConsent(true);
    consentMutation.mutate();
  }, [consentMutation]);

  return useMemo(() => ({
    hasSeenOnboarding,
    hasAcceptedAIConsent,
    completeOnboarding,
    acceptAIConsent,
    isLoading: onboardingQuery.isLoading || consentQuery.isLoading,
  }), [hasSeenOnboarding, hasAcceptedAIConsent, completeOnboarding, acceptAIConsent, onboardingQuery.isLoading, consentQuery.isLoading]);
});
