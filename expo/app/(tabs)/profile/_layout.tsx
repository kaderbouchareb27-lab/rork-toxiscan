import { Stack } from "expo-router";
import React from "react";

export default function ProfileLayout() {
  console.log("[ProfileLayout] Rendering profile stack layout");
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
