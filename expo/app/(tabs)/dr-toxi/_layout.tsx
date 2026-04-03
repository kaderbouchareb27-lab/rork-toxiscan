import { Stack } from "expo-router";
import React from "react";

export default function DrToxiLayout() {
  console.log("[DrToxiLayout] Rendering Dr. Toxi stack layout");
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
