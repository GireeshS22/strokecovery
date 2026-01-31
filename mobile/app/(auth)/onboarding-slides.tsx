import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: null,
    stat: '12 Million',
    statLabel: 'strokes happen every year',
    title: "But you're not a statistic.",
    subtitle: "You're a survivor.",
    backgroundColor: Colors.primary[600],
  },
  {
    id: '2',
    icon: '💊 📅 📝',
    stat: null,
    statLabel: null,
    title: 'Recovery is a marathon,\nnot a sprint.',
    subtitle: "We'll help you track medicines, therapy sessions, and your daily mood.",
    backgroundColor: Colors.primary[700],
  },
  {
    id: '3',
    icon: '💚',
    stat: null,
    statLabel: null,
    title: "You're not alone",
    subtitle: 'Join thousands of survivors and caregivers on their recovery journey.',
    backgroundColor: Colors.primary[800],
    isLast: true,
  },
];

export default function OnboardingSlidesScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleGetStarted = () => {
    router.replace('/(auth)/welcome');
  };

  const handleSkip = () => {
    router.replace('/(auth)/welcome');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderSlide = ({ item }: { item: typeof slides[0] }) => (
    <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
      {/* Icon or Stat */}
      {item.icon && <Text style={styles.icon}>{item.icon}</Text>}

      {item.stat && (
        <View style={styles.statContainer}>
          <Text style={styles.statNumber}>{item.stat}</Text>
          <Text style={styles.statLabel}>{item.statLabel}</Text>
        </View>
      )}

      {/* Title */}
      <Text style={styles.title}>{item.title}</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>{item.subtitle}</Text>

      {/* CTA for last slide */}
      {item.isLast && (
        <View style={styles.ctaContainer}>
          <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
            <Text style={styles.getStartedText}>Get Started</Text>
            <Feather name="arrow-right" size={20} color={Colors.primary[700]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.signInLink} onPress={handleGetStarted}>
            <Text style={styles.signInText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {/* Dots */}
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Next button (not on last slide) */}
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Feather name="arrow-right" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary[600],
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  icon: {
    fontSize: 48,
    marginBottom: 24,
  },
  statContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  statNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 16,
  },
  ctaContainer: {
    marginTop: 48,
    alignItems: 'center',
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 8,
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary[700],
  },
  signInLink: {
    marginTop: 20,
    padding: 8,
  },
  signInText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  nextButton: {
    position: 'absolute',
    right: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
