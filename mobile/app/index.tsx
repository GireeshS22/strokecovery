import { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import { getToken, authApi } from '../services/api';
import { requestNotificationPermissions } from '../services/notifications';

const HAS_SEEN_ONBOARDING = 'has_seen_onboarding';
const DAILY_WELCOME_DATE = 'daily_welcome_date';

const MOTIVATIONAL_MESSAGES = [
  "Every step forward counts",
  "You're stronger than you think",
  "Progress, not perfection",
  "Your dedication inspires",
  "One day at a time",
  "You're doing amazing",
  "Keep going, you've got this",
  "Healing happens every day",
  "Small wins add up",
  "Believe in your recovery",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getRandomMessage(): string {
  // Use date as seed so message is consistent throughout the day
  const today = getTodayDate();
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = today.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % MOTIVATIONAL_MESSAGES.length;
  return MOTIVATIONAL_MESSAGES[index];
}

export default function Index() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const curatingFade = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  useEffect(() => {
    if (!showWelcome) return;

    // Phase 1: Fade in greeting + motivational message (0-600ms)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2: Fade in "Curating..." after a beat (800ms)
    const curatingTimer = setTimeout(() => {
      Animated.timing(curatingFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Start dot animation loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 2, duration: 600, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 3, duration: 600, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    }, 800);

    // Phase 3: Fade out everything and navigate (2500ms)
    const navigateTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        router.replace('/(tabs)/home');
      });
    }, 2500);

    return () => {
      clearTimeout(curatingTimer);
      clearTimeout(navigateTimer);
    };
  }, [showWelcome]);

  const checkAuthAndRedirect = async () => {
    const token = await getToken();

    if (token) {
      // Check if daily welcome was already shown today
      const lastWelcomeDate = await AsyncStorage.getItem(DAILY_WELCOME_DATE);
      const today = getTodayDate();

      if (lastWelcomeDate !== today) {
        // First open of the day - show welcome interstitial
        await AsyncStorage.setItem(DAILY_WELCOME_DATE, today);

        // Fetch user name in parallel with notification permissions
        const [userResponse] = await Promise.all([
          authApi.me().catch(() => null),
          requestNotificationPermissions(),
        ]);

        if (userResponse?.name) {
          setUserName(userResponse.name);
        }

        setShowWelcome(true);
      } else {
        // Already shown today - go straight to home
        await new Promise((resolve) => setTimeout(resolve, 500));
        await requestNotificationPermissions();
        router.replace('/(tabs)/home');
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Show onboarding slides for new users
      // TODO: After testing, uncomment the hasSeenOnboarding check below
      // const hasSeenOnboarding = await AsyncStorage.getItem(HAS_SEEN_ONBOARDING);
      // if (hasSeenOnboarding) {
      //   router.replace('/(auth)/welcome');
      // } else {
      await AsyncStorage.setItem(HAS_SEEN_ONBOARDING, 'true');
      router.replace('/(auth)/onboarding-slides');
      // }
    }
  };

  if (showWelcome) {
    const greeting = getGreeting();
    const message = getRandomMessage();

    return (
      <View style={styles.welcomeContainer}>
        <Animated.View
          style={[
            styles.welcomeContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.greetingEmoji}>
            {new Date().getHours() < 12 ? '🌅' : new Date().getHours() < 17 ? '☀️' : '🌙'}
          </Text>
          <Text style={styles.greetingText}>
            {greeting}{userName ? `, ${userName}` : ''}
          </Text>
          <Text style={styles.motivationalText}>{message}</Text>
        </Animated.View>

        <Animated.View style={[styles.curatingContainer, { opacity: curatingFade }]}>
          <ActivityIndicator size="small" color={Colors.primary[200]} style={styles.curatingSpinner} />
          <Text style={styles.curatingText}>Curating your therapy for today</Text>
        </Animated.View>
      </View>
    );
  }

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
  welcomeContainer: {
    flex: 1,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  greetingEmoji: {
    fontSize: 56,
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  motivationalText: {
    fontSize: 18,
    color: Colors.primary[100],
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 26,
  },
  curatingContainer: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  curatingSpinner: {
    marginRight: 10,
  },
  curatingText: {
    fontSize: 15,
    color: Colors.primary[200],
    fontWeight: '500',
  },
});
