import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/colors';
import { AccessibilityProvider } from '../contexts/AccessibilityContext';
import { preloadSounds } from '../utils/sounds';

export default function RootLayout() {
  // Preload sounds on app start
  useEffect(() => {
    preloadSounds();
  }, []);

  return (
    <AccessibilityProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
    </AccessibilityProvider>
  );
}
