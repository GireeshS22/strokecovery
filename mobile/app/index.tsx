import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import { getToken } from '../services/api';
import { requestNotificationPermissions } from '../services/notifications';

const HAS_SEEN_ONBOARDING = 'has_seen_onboarding';

export default function Index() {
  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    const token = await getToken();
    const hasSeenOnboarding = await AsyncStorage.getItem(HAS_SEEN_ONBOARDING);

    // Small delay for splash effect
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (token) {
      // User is logged in - request notification permissions
      await requestNotificationPermissions();
      router.replace('/(tabs)/home');
    } else {
      // Show onboarding slides for new users
      // TODO: After testing, uncomment the hasSeenOnboarding check below
      // if (hasSeenOnboarding) {
      //   router.replace('/(auth)/welcome');
      // } else {
      await AsyncStorage.setItem(HAS_SEEN_ONBOARDING, 'true');
      router.replace('/(auth)/onboarding-slides');
      // }
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary[600]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
