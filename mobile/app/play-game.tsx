import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Colors, HighContrastColors } from '../constants/colors';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { gamesApi } from '../services/api';
import { getGameById, Game } from '../constants/gameContent';
import { playSound } from '../utils/sounds';

interface SessionResult {
  gameId: string;
  correct: boolean;
  timeSeconds: number;
}

function shuffleOptions(game: Game): Game {
  const shuffled = [...game.options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const newCorrectIndex = shuffled.findIndex(opt => opt.isCorrect);
  return { ...game, options: shuffled, correctIndex: newCorrectIndex };
}

export default function PlayGameScreen() {
  const params = useLocalSearchParams<{ gameIds: string }>();
  const { highContrast, fontScale } = useAccessibility();
  const colors = highContrast ? HighContrastColors : Colors;

  // Parse game IDs from params - handle array case from expo-router
  const gameIdsParam = Array.isArray(params.gameIds) ? params.gameIds[0] : params.gameIds;

  const [sessionGameIds, setSessionGameIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [game, setGame] = useState<Game | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  const totalGames = sessionGameIds.length;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  // Initialize session game IDs once
  useEffect(() => {
    if (gameIdsParam && sessionGameIds.length === 0) {
      const ids = gameIdsParam.split(',');
      setSessionGameIds(ids);
      setSessionStartTime(Date.now());
    }
  }, [gameIdsParam]);

  // Load current game
  useEffect(() => {
    if (sessionGameIds.length > 0 && currentIndex < sessionGameIds.length) {
      const gameId = sessionGameIds[currentIndex];
      const foundGame = getGameById(gameId);
      if (foundGame) {
        setGame(shuffleOptions(foundGame));
        setStartTime(Date.now());
        setSelectedIndex(null);
        setIsCorrect(null);
        feedbackOpacity.setValue(0);
      }
    }
  }, [currentIndex, sessionGameIds]);

  const handleOptionPress = async (index: number) => {
    if (selectedIndex !== null || !game) return;

    const correct = game.options[index].isCorrect;
    const timeSeconds = Math.round((Date.now() - startTime) / 1000);

    // Play sound
    playSound(correct ? 'correct' : 'wrong');

    setSelectedIndex(index);
    setIsCorrect(correct);

    // Add to session results
    setSessionResults(prev => [...prev, {
      gameId: game.id,
      correct,
      timeSeconds,
    }]);

    // Animate feedback
    Animated.timing(feedbackOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Save result to backend
    try {
      await gamesApi.saveResult({
        game_id: game.id,
        game_type: game.type,
        score: correct ? 1 : 0,
        time_seconds: timeSeconds,
      });
    } catch (err) {
      console.error('Failed to save game result:', err);
    }
  };

  const handleNextGame = () => {
    if (currentIndex + 1 >= totalGames) {
      // Session complete, show summary
      playSound('complete');
      setShowSummary(true);
    } else {
      // Move to next game
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePlayAgain = () => {
    router.replace('/games');
  };

  const handleBackToGames = () => {
    router.back();
  };

  // Session Summary Screen
  if (showSummary) {
    const correctCount = sessionResults.filter(r => r.correct).length;
    const totalTime = Math.round((Date.now() - sessionStartTime) / 1000);
    const gamesPlayed = sessionResults.length || 1; // Avoid division by zero
    const accuracy = Math.round((correctCount / gamesPlayed) * 100);
    const missedGames = sessionResults.filter(r => !r.correct);

    return (
      <>
        <StatusBar hidden />
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView style={[styles.container, { backgroundColor: colors.surface }]} contentContainerStyle={styles.summaryContent}>
          {/* Result Emoji */}
          <Text style={[styles.summaryEmoji, { fontSize: 80 * fontScale }]}>
            {accuracy >= 80 ? '🎉' : accuracy >= 50 ? '👍' : '💪'}
          </Text>

          <Text style={[styles.summaryTitle, { color: colors.gray[800], fontSize: 28 * fontScale }]}>
            {accuracy >= 80 ? 'Excellent!' : accuracy >= 50 ? 'Good Job!' : 'Keep Practicing!'}
          </Text>

          {/* Stats Cards */}
          <View style={styles.summaryStats}>
            <View style={[styles.summaryStatCard, { backgroundColor: colors.primary[50] }]}>
              <Text style={[styles.summaryStatNumber, { color: colors.primary[600], fontSize: 36 * fontScale }]}>
                {correctCount}/{gamesPlayed}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
                Correct
              </Text>
            </View>

            <View style={[styles.summaryStatCard, { backgroundColor: colors.primary[50] }]}>
              <Text style={[styles.summaryStatNumber, { color: colors.primary[600], fontSize: 36 * fontScale }]}>
                {accuracy}%
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
                Accuracy
              </Text>
            </View>

            <View style={[styles.summaryStatCard, { backgroundColor: colors.primary[50] }]}>
              <Text style={[styles.summaryStatNumber, { color: colors.primary[600], fontSize: 36 * fontScale }]}>
                {totalTime}s
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
                Time
              </Text>
            </View>
          </View>

          {/* Missed Games */}
          {missedGames.length > 0 && (
            <View style={[styles.missedSection, { backgroundColor: colors.background, borderColor: colors.gray[200] }]}>
              <Text style={[styles.missedTitle, { color: colors.gray[700], fontSize: 16 * fontScale }]}>
                Games to Review
              </Text>
              {missedGames.map((result, idx) => {
                const missedGame = getGameById(result.gameId);
                if (!missedGame) return null;
                return (
                  <View key={idx} style={styles.missedItem}>
                    <Text style={[styles.missedPrompt, { fontSize: 20 * fontScale }]}>
                      {missedGame.type === 'emoji_to_word' ? missedGame.prompt : `"${missedGame.prompt}"`}
                    </Text>
                    <Text style={[styles.missedArrow, { color: colors.gray[400] }]}> → </Text>
                    <Text style={[styles.missedAnswer, { color: colors.primary[600], fontSize: 16 * fontScale }]}>
                      {missedGame.options[missedGame.correctIndex].label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.summaryActions}>
            <TouchableOpacity
              style={[styles.summaryButton, { backgroundColor: colors.primary[600] }]}
              onPress={handlePlayAgain}
            >
              <Text style={[styles.summaryButtonText, { fontSize: 18 * fontScale }]}>
                Play Again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.summaryButtonSecondary, { borderColor: colors.gray[300] }]}
              onPress={handleBackToGames}
            >
              <Text style={[styles.summaryButtonSecondaryText, { color: colors.gray[700], fontSize: 16 * fontScale }]}>
                Back to Games
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </>
    );
  }

  // No games in session
  if (!game || sessionGameIds.length === 0) {
    return (
      <>
        <StatusBar hidden />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <Text style={[styles.errorText, { color: colors.gray[600], fontSize: 16 * fontScale }]}>
            No games found
          </Text>
        </View>
      </>
    );
  }

  const isEmojiToWord = game.type === 'emoji_to_word';

  return (
    <>
      <StatusBar hidden />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {/* Progress Bar */}
        <View style={[styles.progressContainer, { backgroundColor: colors.gray[200] }]}>
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: colors.primary[600],
                width: `${((currentIndex + 1) / totalGames) * 100}%`,
              },
            ]}
          />
        </View>

        {/* Prompt */}
        <View style={styles.promptContainer}>
          {isEmojiToWord ? (
            <Text style={[styles.promptEmoji, { fontSize: 100 * fontScale }]}>{game.prompt}</Text>
          ) : (
            <Text style={[styles.promptWord, { color: colors.gray[800], fontSize: 48 * fontScale }]}>{game.prompt}</Text>
          )}
          <Text style={[styles.instruction, { color: colors.gray[500], fontSize: 16 * fontScale }]}>
            {isEmojiToWord ? 'Select the correct word' : 'Select the correct emoji'}
          </Text>
        </View>

        {/* Options Grid */}
        <View style={styles.optionsGrid}>
          {game.options.map((option, index) => {
            const isSelected = selectedIndex === index;
            const showCorrect = selectedIndex !== null && option.isCorrect;
            const showWrong = isSelected && !option.isCorrect;

            let backgroundColor = colors.background;
            let borderColor = colors.gray[300];

            if (showCorrect) {
              backgroundColor = '#D1FAE5';
              borderColor = '#10B981';
            } else if (showWrong) {
              backgroundColor = '#FEE2E2';
              borderColor = '#EF4444';
            }

            return (
              <TouchableOpacity
                key={index}
                style={[styles.optionButton, { backgroundColor, borderColor }]}
                onPress={() => handleOptionPress(index)}
                disabled={selectedIndex !== null}
              >
                <Text
                  style={[
                    isEmojiToWord ? styles.optionWord : styles.optionEmoji,
                    {
                      color: colors.gray[800],
                      fontSize: (isEmojiToWord ? 20 : 40) * fontScale,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feedback & Next Button */}
        {selectedIndex !== null && (
          <Animated.View style={[styles.feedbackContainer, { opacity: feedbackOpacity }]}>
            <View
              style={[
                styles.feedbackCard,
                { backgroundColor: isCorrect ? '#D1FAE5' : '#FEE2E2' },
              ]}
            >
              <Text style={[styles.feedbackEmoji, { fontSize: 32 * fontScale }]}>
                {isCorrect ? '✓' : '✗'}
              </Text>
              <Text
                style={[
                  styles.feedbackText,
                  { color: isCorrect ? '#065F46' : '#991B1B', fontSize: 18 * fontScale },
                ]}
              >
                {isCorrect ? 'Correct!' : `Answer: ${game.options[game.correctIndex].label}`}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.primary[600] }]}
              onPress={handleNextGame}
            >
              <Text style={[styles.nextButtonText, { fontSize: 18 * fontScale }]}>
                {currentIndex + 1 >= totalGames ? 'See Results' : 'Next'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 40,
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  promptContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  promptEmoji: {
    marginBottom: 12,
  },
  promptWord: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  instruction: {
    textAlign: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  optionButton: {
    width: '45%',
    aspectRatio: 1.5,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  optionWord: {
    fontWeight: '600',
    textAlign: 'center',
  },
  optionEmoji: {
    textAlign: 'center',
  },
  feedbackContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  feedbackEmoji: {
    fontWeight: 'bold',
  },
  feedbackText: {
    fontWeight: '600',
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Summary styles
  summaryContent: {
    padding: 24,
    alignItems: 'center',
  },
  summaryEmoji: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontWeight: 'bold',
    marginBottom: 24,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  summaryStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryStatNumber: {
    fontWeight: 'bold',
  },
  summaryStatLabel: {
    marginTop: 4,
  },
  missedSection: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  missedTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  missedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  missedPrompt: {
  },
  missedArrow: {
  },
  missedAnswer: {
    fontWeight: '600',
  },
  summaryActions: {
    width: '100%',
    gap: 12,
  },
  summaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  summaryButtonSecondary: {
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryButtonSecondaryText: {
    fontWeight: '600',
  },
});
