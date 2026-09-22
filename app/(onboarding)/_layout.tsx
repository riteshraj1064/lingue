// app/(onboarding)/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="courses" />
      <Stack.Screen name="native-lang" />
      <Stack.Screen name="course-details" />
      <Stack.Screen name="daily-goal" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
