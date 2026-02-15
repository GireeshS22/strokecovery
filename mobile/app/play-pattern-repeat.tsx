import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, router } from 'expo-router';
import { Colors, HighContrastColors } from '../constants/colors';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { gamesApi } from '../services/api';
import { playSound } from '../utils/sounds';

const STARTING_LENGTH = 2;
const MAX_LIVES = 3;
const FLASH_DURATION = 600;
const GAP_BETWEEN_FLASHES = 400;
const DELAY_BEFORE_PATTERN = 900;

const SCREEN_WIDTH = Dimensions.get('window').width;
const BUTTON_SIZE = Math.min((SCREEN_WIDTH - 80) / 2, 150);

const BUTTONS = [
  { id: 0, color: '#DC2626', litColor: '#FEE2E2', emoji: '🔴', label: 'Red' },
  { id: 1, color: '#2563EB', litColor: '#DBEAFE', emoji: '🔵', label: 'Blue' },
  { id: 2, color: '#16A34A', litColor: '#DCFCE7', emoji: '🟢', label: 'Green' },
  { id: 3, color: '#CA8A04', litColor: '#FEF9C3', emoji: '🟡', label: 'Yellow' },
];

type Phase = 'countdown' | 'showing' | 'input' | 'feedback' | 'summary';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function PlayPatternRepeatScreen() {
  const { highContrast, fontScale } = useAccessibility();
  const colors = highContrast ? HighContrastColors : Colors;

  const [phase, setPhase] = useState<Phase>('countdown');
  const [countdownValue, setCountdownValue] = useState(3);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Pattern
  const [pattern, setPattern] = useState<number[]>([]);
  const [inputIndex, setInputIndex] = useState(0);
  const [litButton, setLitButton] = useState<number | null>(null);

  // Scoring
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [maxSequence, setMaxSequence] = useState(0);
  const [totalRoundsWon, setTotalRoundsWon] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Refs for timers
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const patternRef = useRef<number[]>([]);

  // Clear all pending timeouts
  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [clearTimeouts]);

  // === COUNTDOWN ===
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownValue <= 0) {
      beginRound(STARTING_LENGTH);
      return;
    }
    const t = setTimeout(() => setCountdownValue(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdownValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // === ELAPSED TIMER ===
  useEffect(() => {
    if (phase === 'showing' || phase === 'input') {
      timerRef.current = setInterval(() => setElapsedTime(v => v + 1), 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase]);

  // Generate pattern & play the showing animation with pre-computed timeouts
  const beginRound = useCallback((length: number) => {
    clearTimeouts();

    const newPattern: number[] = [];
    for (let i = 0; i < length; i++) {
      newPattern.push(Math.floor(Math.random() * 4));
    }
    patternRef.current = newPattern;
    setPattern(newPattern);
    setInputIndex(0);
    setLitButton(null);
    setPhase('showing');

    // Pre-compute all timeouts for the animation
    const newTimeouts: ReturnType<typeof setTimeout>[] = [];
    let delay = DELAY_BEFORE_PATTERN;

    newPattern.forEach((btnId) => {
      // Light ON
      newTimeouts.push(setTimeout(() => setLitButton(btnId), delay));
      delay += FLASH_DURATION;
      // Light OFF
      newTimeouts.push(setTimeout(() => setLitButton(null), delay));
      delay += GAP_BETWEEN_FLASHES;
    });

    // Transition to input
    newTimeouts.push(setTimeout(() => {
      setLitButton(null);
      setPhase('input');
    }, delay));

    timeoutsRef.current = newTimeouts;
  }, [clearTimeouts]);

  // Replay same pattern (after wrong answer with lives remaining)
  const replayRound = useCallback(() => {
    clearTimeouts();
    setInputIndex(0);
    setLitButton(null);
    setPhase('showing');

    const currentPattern = patternRef.current;
    const newTimeouts: ReturnType<typeof setTimeout>[] = [];
    let delay = DELAY_BEFORE_PATTERN;

    currentPattern.forEach((btnId) => {
      newTimeouts.push(setTimeout(() => setLitButton(btnId), delay));
      delay += FLASH_DURATION;
      newTimeouts.push(setTimeout(() => setLitButton(null), delay));
      delay += GAP_BETWEEN_FLASHES;
    });

    newTimeouts.push(setTimeout(() => {
      setLitButton(null);
      setPhase('input');
    }, delay));

    timeoutsRef.current = newTimeouts;
  }, [clearTimeouts]);

  // === PLAYER INPUT ===
  const handlePress = useCallback((btnId: number) => {
    if (phase !== 'input') return;

    const expected = patternRef.current[inputIndex];

    if (btnId === expected) {
      // Correct tap — brief flash
      setLitButton(btnId);
      playSound('tap');
      setTimeout(() => setLitButton(null), 200);

      const nextIdx = inputIndex + 1;

      if (nextIdx >= patternRef.current.length) {
        // Finished the sequence
        playSound('correct');
        const seqLen = patternRef.current.length;
        const newLevel = level + 1;
        setScore(s => s + seqLen);
        setTotalRoundsWon(r => r + 1);
        setMaxSequence(m => Math.max(m, seqLen));
        setLevel(newLevel);
        setFeedbackMsg('✅ Correct! Pattern grows...');
        setPhase('feedback');

        timeoutsRef.current.push(
          setTimeout(() => {
            setFeedbackMsg('');
            beginRound(STARTING_LENGTH + newLevel - 1);
          }, 1400),
        );
      } else {
        setInputIndex(nextIdx);
      }
    } else {
      // Wrong tap
      playSound('wrong');
      setLitButton(btnId);
      setTimeout(() => setLitButton(null), 300);

      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        // Game over
        setMaxSequence(m => Math.max(m, patternRef.current.length - 1));
        setFeedbackMsg('❌ Game Over!');
        setPhase('feedback');

        timeoutsRef.current.push(
          setTimeout(() => {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            playSound('complete');
            setPhase('summary');
          }, 1400),
        );
      } else {
        setFeedbackMsg(`❌ Wrong! ${newLives} ${newLives === 1 ? 'life' : 'lives'} left`);
        setPhase('feedback');

        timeoutsRef.current.push(
          setTimeout(() => {
            setFeedbackMsg('');
            replayRound();
          }, 1400),
        );
      }
    }
  }, [phase, inputIndex, level, lives, beginRound, replayRound]);

  // === SAVE ON SUMMARY ===
  useEffect(() => {
    if (phase !== 'summary') return;
    gamesApi
      .saveResult({
        game_id: `pattern_repeat_${Date.now()}`,
        game_type: 'pattern_repeat',
        score,
        time_seconds: elapsedTime,
      })
      .catch(err => console.error('Failed to save:', err));
  }, [phase, score, elapsedTime]);

  const handlePlayAgain = () => router.replace('/games');
  const handleBack = () => router.back();

  // ========== COUNTDOWN ==========
  if (phase === 'countdown') {
    return (
      <>
        <StatusBar hidden />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.center, { backgroundColor: colors.surface }]}>
          <Text style={{ fontSize: 48 * fontScale, marginBottom: 12 }}>🧠</Text>
          <Text style={{ fontWeight: 'bold', color: colors.gray[800], fontSize: 24 * fontScale, marginBottom: 8 }}>
            Pattern Repeat
          </Text>
          <Text style={{ color: colors.gray[500], fontSize: 16 * fontScale, marginBottom: 32 }}>
            Watch the pattern, then repeat it!
          </Text>
          <Text style={{ fontWeight: 'bold', color: colors.primary[600], fontSize: 96 * fontScale }}>
            {countdownValue}
          </Text>
        </View>
      </>
    );
  }

  // ========== SUMMARY ==========
  if (phase === 'summary') {
    return (
      <>
        <StatusBar hidden />
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView
          style={[styles.container, { backgroundColor: colors.surface }]}
          contentContainerStyle={styles.summaryContent}
        >
          <Text style={{ fontSize: 80 * fontScale, marginBottom: 16 }}>
            {totalRoundsWon >= 8 ? '🎉' : totalRoundsWon >= 4 ? '👍' : '💪'}
          </Text>
          <Text style={{ fontWeight: 'bold', color: colors.gray[800], fontSize: 28 * fontScale, marginBottom: 24 }}>
            {totalRoundsWon >= 8 ? 'Amazing Memory!' : totalRoundsWon >= 4 ? 'Good Job!' : 'Keep Practicing!'}
          </Text>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.primary[50] }]}>
              <Text style={[styles.statNum, { color: colors.primary[600], fontSize: 36 * fontScale }]}>{score}</Text>
              <Text style={[styles.statLbl, { color: colors.gray[600], fontSize: 14 * fontScale }]}>Score</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.primary[50] }]}>
              <Text style={[styles.statNum, { color: colors.primary[600], fontSize: 36 * fontScale }]}>{maxSequence}</Text>
              <Text style={[styles.statLbl, { color: colors.gray[600], fontSize: 14 * fontScale }]}>Best Streak</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.primary[50] }]}>
              <Text style={[styles.statNum, { color: colors.primary[600], fontSize: 36 * fontScale }]}>{totalRoundsWon}</Text>
              <Text style={[styles.statLbl, { color: colors.gray[600], fontSize: 14 * fontScale }]}>Rounds Won</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
              <Text style={[styles.statNum, { color: '#1E40AF', fontSize: 20 * fontScale }]}>{formatTime(elapsedTime)}</Text>
              <Text style={[styles.statLbl, { color: '#1E40AF', fontSize: 12 * fontScale }]}>Total Time</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.statNum, { color: '#92400E', fontSize: 20 * fontScale }]}>Level {level}</Text>
              <Text style={[styles.statLbl, { color: '#92400E', fontSize: 12 * fontScale }]}>Reached</Text>
            </View>
          </View>

          <View style={{ width: '100%', gap: 12, marginTop: 8 }}>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary[600] }]} onPress={handlePlayAgain}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 18 * fontScale }}>Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.gray[300] }]} onPress={handleBack}>
              <Text style={{ color: colors.gray[700], fontWeight: '600', fontSize: 16 * fontScale }}>Back to Games</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </>
    );
  }

  // ========== PLAYING (showing / input / feedback) ==========
  const isShowing = phase === 'showing';
  const isInput = phase === 'input';

  return (
    <>
      <StatusBar hidden />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.gray[200] }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.gray[500], fontSize: 14 * fontScale }}>Level</Text>
            <View style={{ backgroundColor: '#7C3AED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 18 * fontScale }}>{level}</Text>
            </View>
          </View>
          <Text style={{ fontWeight: 'bold', color: colors.gray[800], fontSize: 20 * fontScale }}>🎯 {score}</Text>
          <Text style={{ fontSize: 20 * fontScale }}>
            {'❤️'.repeat(lives)}{'🖤'.repeat(MAX_LIVES - lives)}
          </Text>
        </View>

        {/* Phase banner */}
        <View style={[styles.banner, {
          backgroundColor: isShowing ? '#EDE9FE' : isInput ? '#DBEAFE' : feedbackMsg.startsWith('✅') ? '#DCFCE7' : '#FEE2E2',
        }]}>
          <Text style={{
            fontWeight: 'bold',
            textAlign: 'center',
            fontSize: 18 * fontScale,
            color: isShowing ? '#5B21B6' : isInput ? '#1E40AF' : feedbackMsg.startsWith('✅') ? '#166534' : '#991B1B',
          }}>
            {isShowing ? `👀 Watch the pattern! (${pattern.length} items)` :
             isInput ? `👆 Your turn! Tap ${inputIndex + 1} of ${pattern.length}` :
             feedbackMsg}
          </Text>
        </View>

        {/* Input progress dots */}
        {isInput && (
          <View style={styles.dotsRow}>
            {pattern.map((_, i) => (
              <View
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: i < inputIndex ? '#10B981' : i === inputIndex ? '#3B82F6' : colors.gray[300],
                }}
              />
            ))}
          </View>
        )}

        {/* 2×2 Simon buttons */}
        <View style={styles.gridArea}>
          <View style={styles.gridRow}>
            {BUTTONS.slice(0, 2).map((btn) => renderButton(btn, litButton, isInput, fontScale, handlePress))}
          </View>
          <View style={styles.gridRow}>
            {BUTTONS.slice(2, 4).map((btn) => renderButton(btn, litButton, isInput, fontScale, handlePress))}
          </View>
        </View>

        {/* Timer */}
        <View style={[styles.footer, { backgroundColor: colors.gray[100] }]}>
          <Text style={{ textAlign: 'center', color: colors.gray[600], fontSize: 14 * fontScale }}>
            ⏱️ {formatTime(elapsedTime)}
          </Text>
        </View>
      </View>
    </>
  );
}

// Extracted button renderer to keep JSX clean
function renderButton(
  btn: typeof BUTTONS[number],
  litButton: number | null,
  isInput: boolean,
  fontScale: number,
  onPress: (id: number) => void,
) {
  const isLit = litButton === btn.id;

  return (
    <TouchableOpacity
      key={btn.id}
      onPress={() => onPress(btn.id)}
      disabled={!isInput}
      activeOpacity={0.7}
      style={[
        styles.simonBtn,
        {
          backgroundColor: isLit ? btn.litColor : btn.color,
          borderWidth: isLit ? 4 : 0,
          borderColor: isLit ? '#fff' : 'transparent',
        },
      ]}
    >
      <Text style={{ fontSize: 32 * fontScale }}>{isLit ? '⭐' : btn.emoji}</Text>
      <Text style={{
        color: isLit ? btn.color : 'rgba(255,255,255,0.7)',
        fontWeight: 'bold',
        fontSize: 14 * fontScale,
        marginTop: 4,
      }}>
        {btn.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },

  banner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },

  gridArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 16,
  },
  simonBtn: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },

  footer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  // Summary
  summaryContent: { padding: 24, alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16, width: '100%' },
  statCard: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  statNum: { fontWeight: 'bold' },
  statLbl: { marginTop: 4 },
  primaryBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  secondaryBtn: { paddingVertical: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
});
