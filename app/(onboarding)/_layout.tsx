// app/(onboarding)/_layout.tsx
/**
 * Onboarding Layout
 *
 * Simple stack layout for onboarding screens.
 * Prevents back navigation to ensure users complete onboarding.
 */

import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false, // Prevent swipe back
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
