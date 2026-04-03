import { Stack } from "expo-router";
import React from "react";

export default function ProfileLayout() {
  console.log("[ProfileLayout] Rendering profile stack layout");
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
