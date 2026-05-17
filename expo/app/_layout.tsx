import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, Component, ErrorInfo, ReactNode } from "react";
import { t } from '@/utils/i18n';
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { ScanHistoryProvider } from "@/providers/ScanHistoryProvider";
import { BadgesProvider } from "@/providers/BadgesProvider";
import { OnboardingProvider } from "@/providers/OnboardingProvider";
import { QuizProvider } from "@/providers/QuizProvider";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.title}>{t('error_occurred')}</Text>
          <Text style={ebStyles.message}>
            {this.state.error?.message ?? t('unknown_error')}
          </Text>
          <TouchableOpacity style={ebStyles.button} onPress={this.handleReset}>
            <Text style={ebStyles.buttonText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1A1C1E',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center' as const,
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#2E9E34',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: t('back') }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="about" options={{ title: t('nav_about') }} />
      <Stack.Screen name="ai-consent" options={{ headerShown: false }} />
      <Stack.Screen name="badges" options={{ headerShown: false }} />
      <Stack.Screen name="faq" options={{ title: t('nav_faq') }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="paywall" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="privacy" options={{ title: t('nav_privacy') }} />
      <Stack.Screen name="product/[barcode]" options={{ headerShown: false }} />
      <Stack.Screen name="barcode-scanner" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="quiz" options={{ headerShown: false }} />
      <Stack.Screen name="terms" options={{ title: t('nav_terms') }} />
      <Stack.Screen name="transparency" options={{ title: t('nav_transparency') }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
              <SubscriptionProvider>
              <ScanHistoryProvider>
                <BadgesProvider>
                  <OnboardingProvider>
                    <QuizProvider>
                      <RootLayoutNav />
                    </QuizProvider>
                  </OnboardingProvider>
                </BadgesProvider>
              </ScanHistoryProvider>
            </SubscriptionProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
