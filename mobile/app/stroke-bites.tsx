import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, StatusBar, ActivityIndicator, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { Colors } from '../constants/colors';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { strokeBitesApi, BiteCard, BiteOption, StrokeBiteResponse } from '../services/api';

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
    return (
      <View style={[styles.container, { backgroundColor: Colors.primary[600] }]}>
        <StatusBar hidden />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.completionContainer}>
          <Text style={[styles.completionEmoji, { fontSize: 64 * fontScale }]}>✨</Text>
          <Text style={[styles.completionTitle, { fontSize: 24 * fontScale }]}>
            You've finished today's bites!
          </Text>
          <Text style={[styles.completionSubtitle, { fontSize: 16 * fontScale }]}>
            Come back tomorrow for more insights
          </Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleClose}
          >
            <Text style={[styles.doneButtonText, { fontSize: 18 * fontScale }]}>
              Done
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
  doneButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
  },
  doneButtonText: {
    color: Colors.primary[600],
    fontWeight: '700',
  },
});
