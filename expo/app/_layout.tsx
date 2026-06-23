import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, Component, ErrorInfo, ReactNode } from "react";
import { t } from '@/utils/i18n';
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from "@expo-google-fonts/dm-sans";
import { Fonts } from "@/constants/typography";

// Apply DM Sans as the default font globally to every <Text> / <TextInput>.
function applyDefaultFont() {
  const setDefault = (Component: { defaultProps?: Record<string, unknown> }) => {
    const existing = (Component.defaultProps ?? {}) as { style?: unknown };
    Component.defaultProps = {
      ...existing,
      style: [{ fontFamily: Fonts.regular }, existing.style],
    };
  };
  setDefault(Text as unknown as { defaultProps?: Record<string, unknown> });
  try {
    const RNTextInput = require("react-native").TextInput;
    setDefault(RNTextInput);
  } catch {}
}
applyDefaultFont();
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { ScanHistoryProvider } from "@/providers/ScanHistoryProvider";
import { BadgesProvider } from "@/providers/BadgesProvider";
import { OnboardingProvider } from "@/providers/OnboardingProvider";
import { QuizProvider } from "@/providers/QuizProvider";
import { LocationProvider } from "@/providers/LocationProvider";
import { HealthProfileProvider } from "@/providers/HealthProfileProvider";
import { MealHistoryProvider } from "@/providers/MealHistoryProvider";

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
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    fontFamily: 'DMSans_700Bold',
    color: '#0E0E0C',
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  message: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#9A9A96',
    textAlign: 'center' as const,
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#2E9E34',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: -0.1,
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
      <Stack.Screen name="health-profile" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="paywall" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="privacy" options={{ title: t('nav_privacy') }} />
      <Stack.Screen name="product/[barcode]" options={{ headerShown: false }} />
      <Stack.Screen name="meal/confirm" options={{ headerShown: false }} />
      <Stack.Screen name="meal/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="weekly-report" options={{ headerShown: false }} />
      <Stack.Screen name="quiz" options={{ headerShown: false }} />
      <Stack.Screen name="terms" options={{ title: t('nav_terms') }} />
      <Stack.Screen name="transparency" options={{ title: t('nav_transparency') }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
              <SubscriptionProvider>
              <MealHistoryProvider>
              <ScanHistoryProvider>
                <BadgesProvider>
                  <OnboardingProvider>
                    <QuizProvider>
                      <LocationProvider>
                        <HealthProfileProvider>
                          <RootLayoutNav />
                        </HealthProfileProvider>
                      </LocationProvider>
                    </QuizProvider>
                  </OnboardingProvider>
                </BadgesProvider>
              </ScanHistoryProvider>
              </MealHistoryProvider>
            </SubscriptionProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
