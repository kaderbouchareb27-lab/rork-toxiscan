import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ScanHistoryProvider } from "@/providers/ScanHistoryProvider";
import { OnboardingProvider } from "@/providers/OnboardingProvider";
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { QuizProvider } from "@/providers/QuizProvider";
import { BadgesProvider } from "@/providers/BadgesProvider";
import { StatusBar } from "expo-status-bar";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Retour" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="ai-consent" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="product/[barcode]" options={{ headerShown: false }} />
      <Stack.Screen name="privacy" options={{ title: "Confidentialité", headerTintColor: "#1A1A1A" }} />
      <Stack.Screen name="faq" options={{ title: "FAQ", headerTintColor: "#1A1A1A" }} />
      <Stack.Screen name="transparency" options={{ title: "Transparence IA", headerTintColor: "#1A1A1A" }} />
      <Stack.Screen name="paywall" options={{ headerShown: false, gestureEnabled: true, presentation: "modal" }} />
      <Stack.Screen name="about" options={{ title: "À propos", headerTintColor: "#1A1A1A" }} />
      <Stack.Screen name="terms" options={{ title: "Conditions d'utilisation", headerTintColor: "#1A1A1A" }} />
      <Stack.Screen name="quiz" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="badges" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    console.log("[RootLayout] Mounting root layout");
    void SplashScreen.hideAsync().then(() => {
      console.log("[RootLayout] Splash screen hidden");
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <OnboardingProvider>
          <SubscriptionProvider>
            <ScanHistoryProvider>
              <QuizProvider>
                <BadgesProvider>
                  <RootLayoutNav />
                </BadgesProvider>
              </QuizProvider>
            </ScanHistoryProvider>
          </SubscriptionProvider>
        </OnboardingProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
