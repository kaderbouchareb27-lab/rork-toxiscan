import { Stack } from "expo-router";
import React from "react";

export default function ShoppingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
