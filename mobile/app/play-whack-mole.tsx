import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, router } from 'expo-router';
import { Colors, HighContrastColors } from '../constants/colors';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { gamesApi } from '../services/api';
import { playSound } from '../utils/sounds';

const TOTAL_ROUNDS = 20;
const MOLE_EMOJIS = ['🐹', '🐰', '🐻', '🐸', '🐵', '🦊', '🐼', '🐨'];
const GRID_SIZE = 3;
const PAUSE_BETWEEN_MOLES = 800;

function getVisibleDuration(round: number): number {
  if (round <= 5) return 2000;
  if (round <= 10) return 1500;
  if (round <= 15) return 1200;
  return 1000;
}

function randomEmoji(): string {
  return MOLE_EMOJIS[Math.floor(Math.random() * MOLE_EMOJIS.length)];
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

type GamePhase = 'countdown' | 'playing' | 'summary';

interface RoundResult {
  hit: boolean;
  reactionTimeMs: number | null;
}

export default function PlayWhackMoleScreen() {
  const { highContrast, fontScale } = useAccessibility();
  const colors = highContrast ? HighContrastColors : Colors;

  // Game state
  const [phase, setPhase] = useState<GamePhase>('countdown');
  const [countdownValue, setCountdownValue] = useState(3);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Mole state
  const [activeCellIndex, setActiveCellIndex] = useState<number | null>(null);
  const [activeEmoji, setActiveEmoji] = useState<string>('🐹');
  const [cellFlash, setCellFlash] = useState<{ index: number; type: 'hit' | 'miss' } | null>(null);

  // Results tracking
  const [results, setResults] = useState<RoundResult[]>([]);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const moleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null);
  const moleAppearedAt = useRef<number>(0);
  const roundRef = useRef(0);
  const waitingForTap = useRef(false);

  // Cleanup all timers
  const clearAllTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (moleTimerRef.current) clearTimeout(moleTimerRef.current);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    timerRef.current = null;
    moleTimerRef.current = null;
    pauseTimerRef.current = null;
    flashTimerRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Countdown phase
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdownValue <= 0) {
      setPhase('playing');
      return;
    }

    const timer = setTimeout(() => {
      setCountdownValue(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, countdownValue]);

  // Show next mole
  const showNextMole = useCallback(() => {
    const nextRound = roundRef.current + 1;

    if (nextRound > TOTAL_ROUNDS) {
      // Game over
      clearAllTimers();
      playSound('complete');
      setPhase('summary');
      return;
    }

    roundRef.current = nextRound;
    setCurrentRound(nextRound);

    // Pick a random cell, avoiding the same cell twice in a row
    let newIndex: number;
    do {
      newIndex = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
    } while (newIndex === activeCellIndex && GRID_SIZE * GRID_SIZE > 1);

    setActiveEmoji(randomEmoji());
    setActiveCellIndex(newIndex);
    setCellFlash(null);
    moleAppearedAt.current = Date.now();
    waitingForTap.current = true;

    // Set timeout for mole to disappear (miss)
    const duration = getVisibleDuration(nextRound);
    moleTimerRef.current = setTimeout(() => {
      if (!waitingForTap.current) return;
      // Missed!
      waitingForTap.current = false;
      playSound('wrong');
      setResults(prev => [...prev, { hit: false, reactionTimeMs: null }]);

      setCellFlash({ index: newIndex, type: 'miss' });
      setActiveCellIndex(null);

      flashTimerRef.current = setTimeout(() => {
        setCellFlash(null);
      }, 400);

      // Pause before next mole
      pauseTimerRef.current = setTimeout(() => {
        showNextMole();
      }, PAUSE_BETWEEN_MOLES);
    }, duration);
  }, [activeCellIndex, clearAllTimers]);

  // Start game when phase changes to playing
  useEffect(() => {
    if (phase !== 'playing') return;

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // Show first mole after a short delay
    pauseTimerRef.current = setTimeout(() => {
      showNextMole();
    }, 500);

    return () => clearAllTimers();
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle cell tap
  const handleCellTap = useCallback((cellIndex: number) => {
    if (phase !== 'playing') return;
    if (cellIndex !== activeCellIndex) return; // Ignore taps on empty cells
    if (!waitingForTap.current) return;

    // Hit!
    waitingForTap.current = false;
    if (moleTimerRef.current) clearTimeout(moleTimerRef.current);

    const reactionTime = Date.now() - moleAppearedAt.current;
    playSound('correct');
    setScore(prev => prev + 1);
    setResults(prev => [...prev, { hit: true, reactionTimeMs: reactionTime }]);

    setCellFlash({ index: cellIndex, type: 'hit' });
    setActiveCellIndex(null);

    flashTimerRef.current = setTimeout(() => {
      setCellFlash(null);
    }, 400);

    // Pause before next mole
    pauseTimerRef.current = setTimeout(() => {
      showNextMole();
    }, PAUSE_BETWEEN_MOLES);
  }, [phase, activeCellIndex, showNextMole]);

  // Save results when game ends
  useEffect(() => {
    if (phase !== 'summary') return;

    const saveResults = async () => {
      try {
        await gamesApi.saveResult({
          game_id: `whack_mole_${Date.now()}`,
          game_type: 'whack_a_mole',
          score,
          time_seconds: elapsedTime,
        });
      } catch (err) {
        console.error('Failed to save result:', err);
      }
    };

    saveResults();
  }, [phase, score, elapsedTime]);

  const handlePlayAgain = () => {
    router.replace('/games');
  };

  const handleBackToGames = () => {
    router.back();
  };

  // Compute summary stats
  const hitResults = results.filter(r => r.hit);
  const missCount = results.filter(r => !r.hit).length;
  const accuracy = results.length > 0 ? Math.round((hitResults.length / results.length) * 100) : 0;
  const avgReactionTime = hitResults.length > 0
    ? Math.round(hitResults.reduce((sum, r) => sum + (r.reactionTimeMs || 0), 0) / hitResults.length)
    : 0;
  const bestReactionTime = hitResults.length > 0
    ? Math.min(...hitResults.map(r => r.reactionTimeMs || Infinity))
    : 0;

  // ========================
  // COUNTDOWN SCREEN
  // ========================
  if (phase === 'countdown') {
    return (
      <>
        <StatusBar hidden />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.countdownEmoji, { fontSize: 48 * fontScale }]}>🔨</Text>
          <Text style={[styles.countdownTitle, { color: colors.gray[800], fontSize: 24 * fontScale }]}>
            Whack-a-Mole
          </Text>
          <Text style={[styles.countdownSubtitle, { color: colors.gray[500], fontSize: 16 * fontScale }]}>
            Tap the animals before they hide!
          </Text>
          <Text style={[styles.countdownNumber, { color: colors.primary[600], fontSize: 96 * fontScale }]}>
            {countdownValue}
          </Text>
        </View>
      </>
    );
  }

  // ========================
  // SUMMARY SCREEN
  // ========================
  if (phase === 'summary') {
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
                {score}/{TOTAL_ROUNDS}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
                Score
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
                {avgReactionTime}ms
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
                Avg Reaction
              </Text>
            </View>
          </View>

          {/* Extra stats row */}
          <View style={styles.extraStatsRow}>
            <View style={[styles.extraStatCard, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.extraStatNumber, { color: '#065F46', fontSize: 20 * fontScale }]}>
                {bestReactionTime > 0 ? `${bestReactionTime}ms` : '—'}
              </Text>
              <Text style={[styles.extraStatLabel, { color: '#065F46', fontSize: 12 * fontScale }]}>
                Best Reaction
              </Text>
            </View>
            <View style={[styles.extraStatCard, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.extraStatNumber, { color: '#991B1B', fontSize: 20 * fontScale }]}>
                {missCount}
              </Text>
              <Text style={[styles.extraStatLabel, { color: '#991B1B', fontSize: 12 * fontScale }]}>
                Missed
              </Text>
            </View>
            <View style={[styles.extraStatCard, { backgroundColor: '#DBEAFE' }]}>
              <Text style={[styles.extraStatNumber, { color: '#1E40AF', fontSize: 20 * fontScale }]}>
                {formatTime(elapsedTime)}
              </Text>
              <Text style={[styles.extraStatLabel, { color: '#1E40AF', fontSize: 12 * fontScale }]}>
                Total Time
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

  // ========================
  // PLAYING SCREEN
  // ========================
  return (
    <>
      <StatusBar hidden />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.gray[200] }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.roundLabel, { color: colors.gray[500], fontSize: 14 * fontScale }]}>
              Round
            </Text>
            <View style={[styles.roundBadge, { backgroundColor: '#DC2626' }]}>
              <Text style={[styles.roundText, { fontSize: 18 * fontScale }]}>
                {currentRound}/{TOTAL_ROUNDS}
              </Text>
            </View>
          </View>
          <View style={styles.headerCenter}>
            <Text style={[styles.scoreText, { color: colors.gray[800], fontSize: 20 * fontScale }]}>
              🎯 {score}
            </Text>
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
                backgroundColor: '#DC2626',
                width: `${(currentRound / TOTAL_ROUNDS) * 100}%`,
              },
            ]}
          />
        </View>

        {/* Difficulty indicator */}
        <View style={styles.difficultyRow}>
          <Text style={[styles.difficultyText, { color: colors.gray[400], fontSize: 12 * fontScale }]}>
            Speed: {getVisibleDuration(currentRound || 1)}ms
          </Text>
        </View>

        {/* 3x3 Grid */}
        <View style={styles.gridContainer}>
          <View style={styles.grid}>
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
              const isActive = activeCellIndex === index;
              const flash = cellFlash?.index === index ? cellFlash.type : null;

              const cellBg = flash === 'hit'
                ? '#D1FAE5'
                : flash === 'miss'
                ? '#FEE2E2'
                : isActive
                ? '#FEF3C7'
                : colors.gray[100];

              const cellBorder = flash === 'hit'
                ? '#10B981'
                : flash === 'miss'
                ? '#EF4444'
                : isActive
                ? '#F59E0B'
                : colors.gray[300];

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.gridCell,
                    {
                      backgroundColor: cellBg,
                      borderColor: cellBorder,
                    },
                  ]}
                  onPress={() => handleCellTap(index)}
                  activeOpacity={0.7}
                >
                  {isActive ? (
                    <Text style={[styles.moleEmoji, { fontSize: 48 * fontScale }]}>
                      {activeEmoji}
                    </Text>
                  ) : (
                    <View style={[styles.hole, { backgroundColor: colors.gray[200] }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Footer instructions */}
        <View style={[styles.footer, { backgroundColor: colors.gray[100] }]}>
          <Text style={[styles.instructionsText, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
            Tap the animals as fast as you can!
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  // Countdown
  countdownEmoji: {
    marginBottom: 12,
  },
  countdownTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  countdownSubtitle: {
    marginBottom: 32,
  },
  countdownNumber: {
    fontWeight: 'bold',
  },

  // Header
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
  },
  headerCenter: {
    alignItems: 'center',
  },
  roundLabel: {},
  roundBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roundText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreText: {
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
  timerIcon: {},
  timerText: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // Progress
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

  // Difficulty
  difficultyRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  difficultyText: {},

  // Grid
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: 360,
    aspectRatio: 1,
    gap: 12,
  },
  gridCell: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moleEmoji: {},
  hole: {
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.4,
  },

  // Footer
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  instructionsText: {
    textAlign: 'center',
  },

  // Summary
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
    marginBottom: 16,
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
  extraStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  extraStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  extraStatNumber: {
    fontWeight: 'bold',
  },
  extraStatLabel: {
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
