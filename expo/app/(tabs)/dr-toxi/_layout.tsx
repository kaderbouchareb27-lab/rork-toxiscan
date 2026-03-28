import { Stack } from "expo-router";
import React from "react";

export default function DrToxiLayout() {
  console.log("[DrToxiLayout] Rendering Dr. Toxi stack layout");
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
