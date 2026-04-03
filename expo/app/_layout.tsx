import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { ScanHistoryProvider } from "@/providers/ScanHistoryProvider";
import { BadgesProvider } from "@/providers/BadgesProvider";
import { OnboardingProvider } from "@/providers/OnboardingProvider";
import { QuizProvider } from "@/providers/QuizProvider";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Retour" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[barcode]" options={{ headerShown: false }} />
      <Stack.Screen name="paywall" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="ai-consent" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="quiz" options={{ title: "Quiz Santé", headerShown: false }} />
      <Stack.Screen name="badges" options={{ title: "Mes badges", headerShown: false }} />
      <Stack.Screen name="about" options={{ title: "À propos" }} />
      <Stack.Screen name="faq" options={{ title: "FAQ" }} />
      <Stack.Screen name="privacy" options={{ title: "Confidentialité" }} />
      <Stack.Screen name="terms" options={{ title: "Conditions" }} />
      <Stack.Screen name="transparency" options={{ title: "Transparence IA" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    console.log("[RootLayout] App mounted, hiding splash screen");
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <OnboardingProvider>
          <SubscriptionProvider>
            <ScanHistoryProvider>
              <BadgesProvider>
                <QuizProvider>
                  <RootLayoutNav />
                </QuizProvider>
              </BadgesProvider>
            </ScanHistoryProvider>
          </SubscriptionProvider>
        </OnboardingProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
