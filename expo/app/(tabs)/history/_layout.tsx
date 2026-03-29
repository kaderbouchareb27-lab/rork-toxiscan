import { Stack } from "expo-router";
import React from "react";

export default function HistoryLayout() {
  console.log("[HistoryLayout] Rendering history stack layout");
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
