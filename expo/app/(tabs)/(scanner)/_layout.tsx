import { Stack } from "expo-router";
import React from "react";

export default function ScannerLayout() {
  console.log("[ScannerLayout] Rendering scanner stack layout");
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
