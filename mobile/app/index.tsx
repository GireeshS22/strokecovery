import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { getToken } from '../services/api';

export default function Index() {
  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    const token = await getToken();

    // Small delay for splash effect
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (token) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/welcome');
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
