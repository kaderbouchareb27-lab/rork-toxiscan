// template
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { ScanHistoryProvider } from "@/providers/ScanHistoryProvider";
import { BadgesProvider } from "@/providers/BadgesProvider";
import { OnboardingProvider } from "@/providers/OnboardingProvider";

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView>
        <SubscriptionProvider>
          <ScanHistoryProvider>
            <BadgesProvider>
              <OnboardingProvider>
                <RootLayoutNav />
              </OnboardingProvider>
            </BadgesProvider>
          </ScanHistoryProvider>
        </SubscriptionProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
