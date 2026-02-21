import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, StatusBar, ActivityIndicator, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { Colors } from '../constants/colors';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { strokeBitesApi, BiteCard, BiteOption, StrokeBiteResponse } from '../services/api';

const CONTINUITY_ACTIONS = [
  {
    emoji: '🎮',
    label: 'Play a game',
    nudge: 'Keep your mind sharp with a quick brain game.',
    route: '/games',
  },
  {
    emoji: '🏃',
    label: 'Log a therapy session',
    nudge: 'Track your progress — every session counts.',
    route: '/add-session',
  },
  {
    emoji: '💊',
    label: 'Check your medicines',
    nudge: 'Stay on top of your medication schedule.',
    route: '/(tabs)/medicines',
  },
  {
    emoji: '😊',
    label: 'Track your mood',
    nudge: 'How are you feeling today? Take a moment to log it.',
    route: '/add-mood',
  },
  {
    emoji: '📋',
    label: 'Log a symptom',
    nudge: 'Noticed something today? Record it for your doctor.',
    route: '/add-ailment',
  },
];

export default function StrokeBitesScreen() {
  const { fontScale } = useAccessibility();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [biteResponse, setBiteResponse] = useState<StrokeBiteResponse | null>(null);
  const [cards, setCards] = useState<BiteCard[]>([]);
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [cardHistory, setCardHistory] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, { key: string; label: string; question: string }>>({});
  const [completed, setCompleted] = useState(false);

  // Pick a random continuity action once per session
  const continuityAction = useMemo(
    () => CONTINUITY_ACTIONS[Math.floor(Math.random() * CONTINUITY_ACTIONS.length)],
    []
  );

  // Load bites on mount
  useEffect(() => {
    loadBites();
  }, []);

  const loadBites = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to get today's cached bites first
      let response: StrokeBiteResponse;
      try {
        response = await strokeBitesApi.getToday();
      } catch (err: any) {
        // 404 means not generated yet, so generate
        if (err.status === 404 || err.message.includes('not generated') || err.message.includes('404')) {
          console.log('No cached bites, generating new ones...');
          response = await strokeBitesApi.generate();
        } else {
          throw err;
        }
      }

      setBiteResponse(response);
      setCards(response.cards);
      setCurrentCardId(response.start_card_id);
    } catch (err: any) {
      setError(err.message || 'Failed to load stroke bites');
    } finally {
      setLoading(false);
    }
  };

  // Save answers when user completes or closes
  const saveAnswers = async () => {
    if (!biteResponse || Object.keys(answers).length === 0) return;

    try {
      const answerItems = Object.entries(answers).map(([cardId, data]) => ({
        card_id: cardId,
        selected_key: data.key,
        question_text: data.question,
        selected_label: data.label,
      }));

      await strokeBitesApi.saveAnswers({
        bite_id: biteResponse.id,
        answers: answerItems,
      });
    } catch (err) {
      console.error('Failed to save answers:', err);
    }
  };

  const handleClose = async () => {
    await saveAnswers();
    router.back();
  };

  const getCurrentCard = (): BiteCard | null => {
    return cards.find(c => c.id === currentCardId) || null;
  };

  const goNext = (nextId?: string) => {
    const card = getCurrentCard();
    if (!card) return;

    const targetId = nextId || card.next_card_id;

    if (targetId) {
      setCardHistory(prev => [...prev, currentCardId!]);
      setCurrentCardId(targetId);
    } else {
      // End of flow
      setCompleted(true);
      saveAnswers();
    }
  };

  const goBack = () => {
    if (cardHistory.length > 0) {
      const prevId = cardHistory[cardHistory.length - 1];
      setCardHistory(prev => prev.slice(0, -1));
      setCurrentCardId(prevId);
    }
  };

  const handleOptionSelect = (option: BiteOption) => {
    const card = getCurrentCard();
    if (!card || !card.question) return;

    // Save answer
    setAnswers(prev => ({
      ...prev,
      [card.id]: {
        key: option.key,
        label: option.label,
        question: card.question!,
      },
    }));

    // Navigate to next card
    goNext(option.next_card_id);
  };

  const handleTap = (event: any) => {
    const card = getCurrentCard();
    if (!card) return;

    // Q&A cards require option selection, not tap navigation
    if (card.type === 'qa') return;

    // Get tap location and screen width
    const { locationX, pageX } = event.nativeEvent;
    const tapX = locationX || pageX || 0;

    // Use Dimensions to get screen width
    const { width: screenWidth } = require('react-native').Dimensions.get('window');

    // Left half = back, right half = forward
    if (tapX < screenWidth / 2) {
      goBack();
    } else {
      goNext();
    }
  };

  const getProgress = (): number => {
    if (!biteResponse) return 0;
    return ((cardHistory.length + 1) / biteResponse.card_sequence_length) * 100;
  };

  const currentCard = getCurrentCard();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden />
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary[600]} />
        <Text style={[styles.loadingText, { fontSize: 16 * fontScale }]}>
          Preparing your daily bites...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar hidden />
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={[styles.errorText, { fontSize: 18 * fontScale }]}>😕</Text>
        <Text style={[styles.errorText, { fontSize: 16 * fontScale }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadBites}
        >
          <Text style={[styles.retryButtonText, { fontSize: 16 * fontScale }]}>
            Try Again
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={[styles.closeButtonText, { fontSize: 14 * fontScale }]}>
            Close
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (completed) {
    const handleContinuityPress = async () => {
      await saveAnswers();
      router.replace(continuityAction.route as any);
    };

    return (
      <View style={[styles.container, { backgroundColor: Colors.primary[600] }]}>
        <StatusBar hidden />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.completionContainer}>
          <Text style={[styles.completionEmoji, { fontSize: 64 * fontScale }]}>✨</Text>
          <Text style={[styles.completionTitle, { fontSize: 24 * fontScale }]}>
            That's all for today!
          </Text>
          <Text style={[styles.completionSubtitle, { fontSize: 16 * fontScale }]}>
            Keep the momentum going
          </Text>

          {/* Continuity action card */}
          <TouchableOpacity
            style={styles.continuityCard}
            onPress={handleContinuityPress}
            activeOpacity={0.85}
          >
            <Text style={[styles.continuityEmoji, { fontSize: 36 * fontScale }]}>
              {continuityAction.emoji}
            </Text>
            <View style={styles.continuityTextContainer}>
              <Text style={[styles.continuityLabel, { fontSize: 18 * fontScale }]}>
                {continuityAction.label}
              </Text>
              <Text style={[styles.continuityNudge, { fontSize: 14 * fontScale }]}>
                {continuityAction.nudge}
              </Text>
            </View>
            <Text style={[styles.continuityArrow, { fontSize: 20 * fontScale }]}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.maybeLaterButton}
            onPress={handleClose}
          >
            <Text style={[styles.maybeLaterText, { fontSize: 15 * fontScale }]}>
              Maybe later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!currentCard) {
    return null;
  }

  return (
    <Pressable
      style={[styles.container, { backgroundColor: currentCard.background_color }]}
      onPress={handleTap}
    >
      <StatusBar hidden />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${getProgress()}%` }]} />
        </View>
        <TouchableOpacity
          style={styles.closeIconButton}
          onPress={handleClose}
        >
          <Text style={[styles.closeIcon, { fontSize: 28 * fontScale }]}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Card content */}
      <ScrollView
        contentContainerStyle={styles.cardContent}
        showsVerticalScrollIndicator={false}
      >
        {currentCard.emoji && (
          <Text style={[styles.cardEmoji, { fontSize: 64 * fontScale }]}>
            {currentCard.emoji}
          </Text>
        )}

        {currentCard.title && (
          <Text style={[styles.cardTitle, { fontSize: 20 * fontScale }]}>
            {currentCard.title}
          </Text>
        )}

        {currentCard.type === 'qa' && currentCard.question ? (
          <>
            <Text style={[styles.cardQuestion, { fontSize: 22 * fontScale }]}>
              {currentCard.question}
            </Text>
            <View style={styles.optionsContainer}>
              {currentCard.options?.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={styles.optionButton}
                  onPress={() => handleOptionSelect(option)}
                >
                  <Text style={[styles.optionText, { fontSize: 18 * fontScale }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <Text style={[styles.cardBody, { fontSize: 18 * fontScale }]}>
            {currentCard.body}
          </Text>
        )}

        {currentCard.source_insight_id && (
          <Text style={[styles.sourceAttribution, { fontSize: 12 * fontScale }]}>
            Based on research
          </Text>
        )}
      </ScrollView>

      {/* Navigation hint */}
      {currentCard.type !== 'qa' && (
        <View style={styles.navHint}>
          <Text style={[styles.navHintText, { fontSize: 12 * fontScale }]}>
            Tap left to go back • Tap right to continue
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.gray[600],
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: Colors.gray[800],
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 16,
  },
  closeButtonText: {
    color: Colors.gray[500],
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    zIndex: 10,
  },
  progressBarBackground: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  closeIconButton: {
    marginLeft: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: 100,
    paddingBottom: 80,
  },
  cardEmoji: {
    marginBottom: 24,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  cardQuestion: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
  },
  cardBody: {
    color: '#fff',
    lineHeight: 28,
    textAlign: 'center',
  },
  sourceAttribution: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 24,
    fontStyle: 'italic',
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
    marginTop: 8,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  optionText: {
    color: '#fff',
    fontWeight: '600',
  },
  navHint: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  navHintText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  completionEmoji: {
    marginBottom: 24,
  },
  completionTitle: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  completionSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 48,
  },
  continuityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
    gap: 14,
  },
  continuityEmoji: {
    lineHeight: 44,
  },
  continuityTextContainer: {
    flex: 1,
  },
  continuityLabel: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 4,
  },
  continuityNudge: {
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  continuityArrow: {
    color: '#fff',
    fontWeight: '600',
  },
  maybeLaterButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  maybeLaterText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
});
