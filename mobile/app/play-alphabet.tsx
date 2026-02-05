import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, router } from 'expo-router';
import { Colors, HighContrastColors } from '../constants/colors';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { gamesApi } from '../services/api';
import { playSound } from '../utils/sounds';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const TOTAL_LETTERS = LETTERS.length;
const CIRCLE_SIZE = 70;
const MIN_DISTANCE = 85;

interface CirclePosition {
  id: number; // Index 0-9
  letter: string;
  x: number;
  y: number;
}

function checkOverlap(pos1: CirclePosition, pos2: CirclePosition, minDist: number): boolean {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < minDist;
}

function generatePositions(width: number, height: number): CirclePosition[] {
  const positions: CirclePosition[] = [];
  const padding = 20;
  const maxX = width - CIRCLE_SIZE - padding;
  const maxY = height - CIRCLE_SIZE - padding;

  for (let i = 0; i < TOTAL_LETTERS; i++) {
    let attempts = 0;
    let newPos: CirclePosition;

    do {
      newPos = {
        id: i,
        letter: LETTERS[i],
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

export default function PlayAlphabetScreen() {
  const { highContrast, fontScale } = useAccessibility();
  const colors = highContrast ? HighContrastColors : Colors;

  const [positions, setPositions] = useState<CirclePosition[]>([]);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [completedIndices, setCompletedIndices] = useState<number[]>([]);
  const [wrongTap, setWrongTap] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [gameAreaSize, setGameAreaSize] = useState({ width: 0, height: 0 });
  const [gameStarted, setGameStarted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wrongTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (gameAreaSize.width > 0 && gameAreaSize.height > 0 && !gameStarted) {
      const newPositions = generatePositions(gameAreaSize.width, gameAreaSize.height);
      setPositions(newPositions);
      setGameStarted(true);
    }
  }, [gameAreaSize, gameStarted]);

  useEffect(() => {
    if (gameStarted && !isComplete) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameStarted, isComplete]);

  const handleTap = (index: number) => {
    if (isComplete) return;

    if (index === currentTargetIndex) {
      playSound('tap');
      setCompletedIndices(prev => [...prev, index]);
      setShowHint(false);

      if (index === TOTAL_LETTERS - 1) {
        playSound('complete');
        setIsComplete(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        saveResult();
      } else {
        setCurrentTargetIndex(prev => prev + 1);
      }
    } else {
      playSound('wrong');
      setWrongTap(index);
      setShowHint(true);
      if (wrongTapTimeoutRef.current) {
        clearTimeout(wrongTapTimeoutRef.current);
      }
      wrongTapTimeoutRef.current = setTimeout(() => {
        setWrongTap(null);
      }, 300);
    }
  };

  const saveResult = async () => {
    try {
      await gamesApi.saveResult({
        game_id: 'alphabet_1',
        game_type: 'alphabet_sequence',
        score: 1,
        time_seconds: elapsedTime,
      });
    } catch (err) {
      console.error('Failed to save game result:', err);
    }
  };

  const handlePlayAgain = () => {
    setPositions([]);
    setCurrentTargetIndex(0);
    setCompletedIndices([]);
    setWrongTap(null);
    setShowHint(false);
    setElapsedTime(0);
    setIsComplete(false);
    setGameStarted(false);

    setTimeout(() => {
      if (gameAreaSize.width > 0 && gameAreaSize.height > 0) {
        const newPositions = generatePositions(gameAreaSize.width, gameAreaSize.height);
        setPositions(newPositions);
        setGameStarted(true);
      }
    }, 100);
  };

  const handleBackToGames = () => {
    router.back();
  };

  if (isComplete) {
    return (
      <>
        <StatusBar hidden />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.completionContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.completionEmoji, { fontSize: 80 * fontScale }]}>🎉</Text>
          <Text style={[styles.completionTitle, { color: colors.gray[800], fontSize: 28 * fontScale }]}>
            Well Done!
          </Text>
          <Text style={[styles.completionSubtitle, { color: colors.gray[600], fontSize: 16 * fontScale }]}>
            You completed the alphabet sequence
          </Text>

          <View style={[styles.timeCard, { backgroundColor: colors.primary[50] }]}>
            <Text style={[styles.timeLabel, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
              Your Time
            </Text>
            <Text style={[styles.timeValue, { color: colors.primary[600], fontSize: 48 * fontScale }]}>
              {formatTime(elapsedTime)}
            </Text>
          </View>

          <View style={styles.completionActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary[600] }]}
              onPress={handlePlayAgain}
            >
              <Text style={[styles.actionButtonText, { fontSize: 18 * fontScale }]}>
                Play Again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButtonSecondary, { borderColor: colors.gray[300] }]}
              onPress={handleBackToGames}
            >
              <Text style={[styles.actionButtonSecondaryText, { color: colors.gray[700], fontSize: 16 * fontScale }]}>
                Back to Games
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar hidden />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={[styles.header, { borderBottomColor: colors.gray[200] }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.nextLabel, { color: colors.gray[500], fontSize: 14 * fontScale }]}>
              Next:
            </Text>
            <View style={[styles.nextBadge, { backgroundColor: colors.primary[100] }]}>
              <Text style={[styles.nextNumber, { color: colors.primary[700], fontSize: 24 * fontScale }]}>
                {LETTERS[currentTargetIndex]}
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

        <View style={[styles.progressContainer, { backgroundColor: colors.gray[200] }]}>
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: colors.primary[600],
                width: `${(completedIndices.length / TOTAL_LETTERS) * 100}%`,
              },
            ]}
          />
        </View>

        <View
          style={styles.gameArea}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width !== gameAreaSize.width || height !== gameAreaSize.height) {
              setGameAreaSize({ width, height });
            }
          }}
        >
          {positions.map((pos) => {
            const isCompleted = completedIndices.includes(pos.id);
            const isTarget = pos.id === currentTargetIndex;
            const isWrong = wrongTap === pos.id;
            const shouldHighlight = isTarget && showHint;

            if (isCompleted) return null;

            return (
              <TouchableOpacity
                key={pos.id}
                style={[
                  styles.circle,
                  {
                    left: pos.x,
                    top: pos.y,
                    backgroundColor: isWrong
                      ? '#FEE2E2'
                      : shouldHighlight
                      ? '#D1FAE5'
                      : colors.background,
                    borderColor: isWrong
                      ? '#EF4444'
                      : shouldHighlight
                      ? '#10B981'
                      : colors.gray[300],
                    borderWidth: shouldHighlight ? 3 : 2,
                  },
                ]}
                onPress={() => handleTap(pos.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.circleNumber,
                    {
                      color: isWrong
                        ? '#EF4444'
                        : shouldHighlight
                        ? '#065F46'
                        : colors.gray[700],
                      fontSize: 28 * fontScale,
                    },
                  ]}
                >
                  {pos.letter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.instructions, { backgroundColor: colors.gray[100] }]}>
          <Text style={[styles.instructionsText, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
            Tap letters in order: A → B → C → ... → J
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
  nextLabel: {
  },
  nextBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  nextNumber: {
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
  circleNumber: {
    fontWeight: 'bold',
  },
  instructions: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  instructionsText: {
  },
  completionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  completionEmoji: {
    marginBottom: 16,
  },
  completionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  completionSubtitle: {
    marginBottom: 32,
  },
  timeCard: {
    paddingHorizontal: 48,
    paddingVertical: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  timeLabel: {
    marginBottom: 8,
  },
  timeValue: {
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  completionActions: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  actionButtonSecondary: {
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionButtonSecondaryText: {
    fontWeight: '600',
  },
});
