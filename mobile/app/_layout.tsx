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
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.primary[600] },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
    </AccessibilityProvider>
  );
}
