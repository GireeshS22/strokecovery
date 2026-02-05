import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, router } from 'expo-router';
import { Colors, HighContrastColors } from '../constants/colors';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { gamesApi } from '../services/api';
import { playSound } from '../utils/sounds';

const CIRCLE_SIZE = 70;
const MIN_DISTANCE = 85;
const SESSION_LENGTH = 10;

interface QuestionPool {
  id: string;
  category: string;
  mainEmojis: string[]; // Pool of 10
  oddChoices: { emoji: string; explanation: string }[]; // 3 choices
}

const QUESTION_POOLS: QuestionPool[] = [
  {
    id: 'odd_1',
    category: 'Fruits',
    mainEmojis: ['🍎', '🍊', '🍋', '🍇', '🍌', '🍓', '🍑', '🍒', '🥭', '🍍'],
    oddChoices: [
      { emoji: '🥕', explanation: 'Carrot is a vegetable' },
      { emoji: '🥦', explanation: 'Broccoli is a vegetable' },
      { emoji: '🌽', explanation: 'Corn is a vegetable' },
    ],
  },
  {
    id: 'odd_2',
    category: 'Animals',
    mainEmojis: ['🐕', '🐱', '🐘', '🦁', '🐰', '🐻', '🦊', '🐼', '🐨', '🦒'],
    oddChoices: [
      { emoji: '🌳', explanation: 'Tree is a plant' },
      { emoji: '🪨', explanation: 'Rock is not alive' },
      { emoji: '🏠', explanation: 'House is a building' },
    ],
  },
  {
    id: 'odd_3',
    category: 'Birds',
    mainEmojis: ['🐦', '🦅', '🦆', '🦉', '🦜', '🐧', '🦢', '🦩', '🕊️', '🦚'],
    oddChoices: [
      { emoji: '🐝', explanation: 'Bee is an insect' },
      { emoji: '🦋', explanation: 'Butterfly is an insect' },
      { emoji: '🐛', explanation: 'Caterpillar is an insect' },
    ],
  },
  {
    id: 'odd_4',
    category: 'Transport',
    mainEmojis: ['🚗', '🚌', '🚲', '✈️', '🚢', '🚁', '🚂', '🏍️', '🚀', '🛵'],
    oddChoices: [
      { emoji: '🏠', explanation: 'House is a building' },
      { emoji: '🌲', explanation: 'Tree is a plant' },
      { emoji: '🪑', explanation: 'Chair is furniture' },
    ],
  },
  {
    id: 'odd_5',
    category: 'Sports Balls',
    mainEmojis: ['⚽', '🏀', '🎾', '⚾', '🏐', '🏈', '🎱', '🏓', '🥎', '🏉'],
    oddChoices: [
      { emoji: '🍕', explanation: 'Pizza is food' },
      { emoji: '📚', explanation: 'Books are for reading' },
      { emoji: '🎸', explanation: 'Guitar is an instrument' },
    ],
  },
  {
    id: 'odd_6',
    category: 'Sea Creatures',
    mainEmojis: ['🐟', '🐠', '🦈', '🐙', '🦑', '🦐', '🦞', '🦀', '🐚', '🐋'],
    oddChoices: [
      { emoji: '🐕', explanation: 'Dog is a land animal' },
      { emoji: '🐱', explanation: 'Cat is a land animal' },
      { emoji: '🦁', explanation: 'Lion is a land animal' },
    ],
  },
  {
    id: 'odd_7',
    category: 'Vegetables',
    mainEmojis: ['🥕', '🥦', '🌽', '🥒', '🥬', '🍆', '🧅', '🧄', '🥔', '🌶️'],
    oddChoices: [
      { emoji: '🍎', explanation: 'Apple is a fruit' },
      { emoji: '🍇', explanation: 'Grapes are fruits' },
      { emoji: '🍓', explanation: 'Strawberry is a fruit' },
    ],
  },
  {
    id: 'odd_8',
    category: 'Buildings',
    mainEmojis: ['🏠', '🏢', '🏫', '🏥', '🏰', '🏛️', '🏪', '🏨', '🏦', '⛪'],
    oddChoices: [
      { emoji: '🌲', explanation: 'Tree is nature' },
      { emoji: '🐘', explanation: 'Elephant is an animal' },
      { emoji: '☀️', explanation: 'Sun is in the sky' },
    ],
  },
  {
    id: 'odd_9',
    category: 'Flowers',
    mainEmojis: ['🌸', '🌹', '🌻', '🌷', '🌺', '💐', '🌼', '🪷', '🌵', '🪻'],
    oddChoices: [
      { emoji: '🔧', explanation: 'Wrench is a tool' },
      { emoji: '🔨', explanation: 'Hammer is a tool' },
      { emoji: '🪛', explanation: 'Screwdriver is a tool' },
    ],
  },
  {
    id: 'odd_10',
    category: 'Weather',
    mainEmojis: ['☀️', '🌧️', '❄️', '⛈️', '🌈', '🌪️', '🌤️', '⛅', '🌊', '💨'],
    oddChoices: [
      { emoji: '🎸', explanation: 'Guitar is an instrument' },
      { emoji: '🚗', explanation: 'Car is transport' },
      { emoji: '📱', explanation: 'Phone is a device' },
    ],
  },
];

interface GeneratedQuestion {
  pool: QuestionPool;
  emojis: string[];
  oddEmoji: string;
  oddExplanation: string;
  oddIndex: number;
}

interface EmojiPosition {
  index: number;
  emoji: string;
  x: number;
  y: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateQuestion(): GeneratedQuestion {
  // Pick a random question pool
  const pool = QUESTION_POOLS[Math.floor(Math.random() * QUESTION_POOLS.length)];

  // Pick 4-9 main emojis randomly
  const mainCount = 4 + Math.floor(Math.random() * 6); // 4 to 9
  const shuffledMain = shuffleArray(pool.mainEmojis);
  const selectedMain = shuffledMain.slice(0, mainCount);

  // Pick 1 random odd emoji
  const oddChoice = pool.oddChoices[Math.floor(Math.random() * pool.oddChoices.length)];

  // Combine and shuffle to get final emoji array
  const allEmojis = [...selectedMain, oddChoice.emoji];
  const shuffledAll = shuffleArray(allEmojis);

  // Find where the odd emoji ended up
  const oddIndex = shuffledAll.indexOf(oddChoice.emoji);

  return {
    pool,
    emojis: shuffledAll,
    oddEmoji: oddChoice.emoji,
    oddExplanation: oddChoice.explanation,
    oddIndex,
  };
}

function checkOverlap(pos1: EmojiPosition, pos2: EmojiPosition, minDist: number): boolean {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < minDist;
}

function generatePositions(width: number, height: number, emojis: string[]): EmojiPosition[] {
  const positions: EmojiPosition[] = [];
  const padding = 20;
  const maxX = width - CIRCLE_SIZE - padding;
  const maxY = height - CIRCLE_SIZE - padding;

  for (let i = 0; i < emojis.length; i++) {
    let attempts = 0;
    let newPos: EmojiPosition;

    do {
      newPos = {
        index: i,
        emoji: emojis[i],
        x: padding + Math.random() * maxX,
        y: padding + Math.random() * maxY,
      };
      attempts++;
    } while (
      positions.some(pos => checkOverlap(newPos, pos, MIN_DISTANCE)) &&
      attempts < 100
    );

    positions.push(newPos);
  }

  return positions;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface SessionResult {
  category: string;
  oddEmoji: string;
  explanation: string;
  correct: boolean;
  timeSeconds: number;
}

export default function PlayOddOneOutScreen() {
  const { highContrast, fontScale } = useAccessibility();
  const colors = highContrast ? HighContrastColors : Colors;

  const [question, setQuestion] = useState<GeneratedQuestion>(() => generateQuestion());
  const [positions, setPositions] = useState<EmojiPosition[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [wrongTap, setWrongTap] = useState<number | null>(null);
  const [hasWrongAttempt, setHasWrongAttempt] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameAreaSize, setGameAreaSize] = useState({ width: 0, height: 0 });
  const [gameStarted, setGameStarted] = useState(false);

  // Session tracking
  const [currentRound, setCurrentRound] = useState(1);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [showSummary, setShowSummary] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wrongTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (gameAreaSize.width > 0 && gameAreaSize.height > 0 && !gameStarted) {
      const newPositions = generatePositions(gameAreaSize.width, gameAreaSize.height, question.emojis);
      setPositions(newPositions);
      setGameStarted(true);
    }
  }, [gameAreaSize, gameStarted, question]);

  useEffect(() => {
    if (gameStarted && isCorrect === null) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameStarted, isCorrect]);

  const handleTap = async (tappedIndex: number) => {
    if (isCorrect !== null) return;

    const tappedEmoji = question.emojis[tappedIndex];
    const correct = tappedEmoji === question.oddEmoji;

    if (correct) {
      // Correct!
      playSound('correct');
      setSelectedIndex(tappedIndex);
      setIsCorrect(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Add to session results (incorrect if any wrong attempts)
      const wasCorrect = !hasWrongAttempt;
      setSessionResults(prev => [...prev, {
        category: question.pool.category,
        oddEmoji: question.oddEmoji,
        explanation: question.oddExplanation,
        correct: wasCorrect,
        timeSeconds: elapsedTime,
      }]);

      // Save result
      try {
        await gamesApi.saveResult({
          game_id: question.pool.id,
          game_type: 'odd_one_out',
          score: wasCorrect ? 1 : 0,
          time_seconds: elapsedTime,
        });
      } catch (err) {
        console.error('Failed to save result:', err);
      }
    } else {
      // Wrong - flash red and show hint
      playSound('wrong');
      setHasWrongAttempt(true);
      setWrongTap(tappedIndex);
      setShowHint(true);
      if (wrongTapTimeoutRef.current) {
        clearTimeout(wrongTapTimeoutRef.current);
      }
      wrongTapTimeoutRef.current = setTimeout(() => {
        setWrongTap(null);
      }, 300);
    }
  };

  const handleNextQuestion = () => {
    if (currentRound >= SESSION_LENGTH) {
      // Session complete
      playSound('complete');
      setShowSummary(true);
      return;
    }

    const newQuestion = generateQuestion();
    setQuestion(newQuestion);
    setPositions([]);
    setSelectedIndex(null);
    setIsCorrect(null);
    setShowHint(false);
    setWrongTap(null);
    setHasWrongAttempt(false);
    setElapsedTime(0);
    setGameStarted(false);
    setCurrentRound(prev => prev + 1);

    setTimeout(() => {
      if (gameAreaSize.width > 0 && gameAreaSize.height > 0) {
        const newPositions = generatePositions(gameAreaSize.width, gameAreaSize.height, newQuestion.emojis);
        setPositions(newPositions);
        setGameStarted(true);
      }
    }, 100);
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
    const accuracy = Math.round((correctCount / SESSION_LENGTH) * 100);

    return (
      <>
        <StatusBar hidden />
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView style={[styles.container, { backgroundColor: colors.surface }]} contentContainerStyle={styles.summaryContent}>
          <Text style={[styles.summaryEmoji, { fontSize: 80 * fontScale }]}>
            {accuracy >= 80 ? '🎉' : accuracy >= 50 ? '👍' : '💪'}
          </Text>

          <Text style={[styles.summaryTitle, { color: colors.gray[800], fontSize: 28 * fontScale }]}>
            {accuracy >= 80 ? 'Excellent!' : accuracy >= 50 ? 'Good Job!' : 'Keep Practicing!'}
          </Text>

          <View style={styles.summaryStats}>
            <View style={[styles.summaryStatCard, { backgroundColor: colors.primary[50] }]}>
              <Text style={[styles.summaryStatNumber, { color: colors.primary[600], fontSize: 36 * fontScale }]}>
                {correctCount}/{SESSION_LENGTH}
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
                {formatTime(totalTime)}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
                Time
              </Text>
            </View>
          </View>

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

  return (
    <>
      <StatusBar hidden />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.gray[200] }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.categoryLabel, { color: colors.gray[500], fontSize: 14 * fontScale }]}>
              Find the odd one in:
            </Text>
            <View style={[styles.categoryBadge, { backgroundColor: colors.primary[100] }]}>
              <Text style={[styles.categoryText, { color: colors.primary[700], fontSize: 18 * fontScale }]}>
                {question.pool.category}
              </Text>
            </View>
          </View>
          <View style={[styles.timerContainer, { backgroundColor: colors.gray[100] }]}>
            <Text style={[styles.timerIcon, { fontSize: 16 * fontScale }]}>⏱️</Text>
            <Text style={[styles.timerText, { color: colors.gray[700], fontSize: 18 * fontScale }]}>
              {formatTime(elapsedTime)}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { backgroundColor: colors.gray[200] }]}>
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: colors.primary[600],
                width: `${(currentRound / SESSION_LENGTH) * 100}%`,
              },
            ]}
          />
        </View>

        {/* Game Area */}
        <View
          style={styles.gameArea}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width !== gameAreaSize.width || height !== gameAreaSize.height) {
              setGameAreaSize({ width, height });
            }
          }}
        >
          {positions.map((pos, idx) => {
            const isOdd = pos.emoji === question.oddEmoji;
            const isSelected = selectedIndex === pos.index;
            const isWrong = wrongTap === pos.index;
            const shouldHighlight = isOdd && showHint && !isSelected;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.circle,
                  {
                    left: pos.x,
                    top: pos.y,
                    backgroundColor: isSelected
                      ? '#D1FAE5' // Green for correct
                      : isWrong
                      ? '#FEE2E2' // Red flash for wrong
                      : shouldHighlight
                      ? '#D1FAE5' // Green hint
                      : colors.background,
                    borderColor: isSelected
                      ? '#10B981'
                      : isWrong
                      ? '#EF4444'
                      : shouldHighlight
                      ? '#10B981'
                      : colors.gray[300],
                    borderWidth: isSelected || shouldHighlight ? 3 : 2,
                  },
                ]}
                onPress={() => handleTap(pos.index)}
                activeOpacity={0.7}
                disabled={isCorrect !== null}
              >
                <Text style={[styles.emoji, { fontSize: 36 * fontScale }]}>
                  {pos.emoji}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Result / Instructions */}
        <View style={[styles.footer, { backgroundColor: colors.gray[100] }]}>
          {isCorrect === true ? (
            <View style={styles.resultContainer}>
              <Text style={[styles.resultText, { color: '#065F46', fontSize: 18 * fontScale }]}>
                {question.oddEmoji} {question.oddExplanation}
              </Text>
              <View style={styles.footerButtons}>
                <TouchableOpacity
                  style={[styles.footerButton, { backgroundColor: colors.primary[600] }]}
                  onPress={handleNextQuestion}
                >
                  <Text style={[styles.footerButtonText, { fontSize: 16 * fontScale }]}>
                    {currentRound >= SESSION_LENGTH ? 'See Results' : 'Next Question'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButtonSecondary, { borderColor: colors.gray[300] }]}
                  onPress={handleBackToGames}
                >
                  <Text style={[styles.footerButtonSecondaryText, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
                    Back
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={[styles.instructionsText, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
              Tap the emoji that doesn't belong ({question.emojis.length} items)
            </Text>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryLabel: {
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontWeight: 'bold',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  timerIcon: {
  },
  timerText: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressContainer: {
    height: 6,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  gameArea: {
    flex: 1,
    margin: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emoji: {
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 80,
  },
  instructionsText: {
    textAlign: 'center',
  },
  resultContainer: {
    alignItems: 'center',
    gap: 12,
  },
  resultText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  footerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  footerButtonSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  footerButtonSecondaryText: {
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
