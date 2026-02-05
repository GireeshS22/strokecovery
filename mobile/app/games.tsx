import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Colors, HighContrastColors } from '../constants/colors';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { gamesApi, GameStats } from '../services/api';
import { allGames, getGamesByType } from '../constants/gameContent';

const GAMES_PER_SESSION = 10;

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function GamesScreen() {
  const { highContrast, fontScale } = useAccessibility();
  const colors = highContrast ? HighContrastColors : Colors;

  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setError(null);
      const data = await gamesApi.getStats();
      setStats(data);
    } catch (err) {
      setError('Could not load stats');
      console.error('Failed to load game stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const handleStartSession = (type: 'emoji_to_word' | 'word_to_emoji') => {
    const pool = getGamesByType(type);
    const shuffled = shuffleArray(pool);
    const sessionGames = shuffled.slice(0, GAMES_PER_SESSION);
    const gameIds = sessionGames.map(g => g.id).join(',');

    router.push({ pathname: '/play-game', params: { gameIds } });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Brain Games',
          headerStyle: { backgroundColor: colors.primary[600] },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: colors.surface }]} contentContainerStyle={styles.content}>
        {/* Streak Card */}
        {stats && stats.current_streak > 0 && (
          <View style={[styles.streakCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.streakEmoji, { fontSize: 32 * fontScale }]}>🔥</Text>
            <View style={styles.streakText}>
              <Text style={[styles.streakNumber, { color: '#92400E', fontSize: 24 * fontScale }]}>
                {stats.current_streak} Day Streak!
              </Text>
              <Text style={[styles.streakLabel, { color: '#A16207', fontSize: 14 * fontScale }]}>
                Keep it going!
              </Text>
            </View>
          </View>
        )}

        {/* Stats Card */}
        <View style={[styles.statsCard, { backgroundColor: colors.primary[600] }]}>
          <Text style={[styles.statsTitle, { fontSize: 20 * fontScale }]}>Your Progress</Text>
          {loading ? (
            <ActivityIndicator color="#fff" style={styles.loader} />
          ) : stats ? (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { fontSize: 28 * fontScale }]}>{stats.total_games}</Text>
                <Text style={[styles.statLabel, { fontSize: 12 * fontScale }]}>Total Games</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { fontSize: 28 * fontScale }]}>{stats.accuracy}%</Text>
                <Text style={[styles.statLabel, { fontSize: 12 * fontScale }]}>Accuracy</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { fontSize: 28 * fontScale }]}>{stats.games_today}</Text>
                <Text style={[styles.statLabel, { fontSize: 12 * fontScale }]}>Today</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.errorText, { fontSize: 14 * fontScale }]}>{error || 'No stats available'}</Text>
          )}
        </View>

        {/* Games Section */}
        <Text style={[styles.sectionTitle, { color: colors.gray[800], fontSize: 18 * fontScale }]}>
          Choose a Game
        </Text>

        {/* Emoji to Word Game Button */}
        <TouchableOpacity
          style={[styles.gameButton, { backgroundColor: colors.primary[600] }]}
          onPress={() => handleStartSession('emoji_to_word')}
        >
          <Text style={[styles.gameButtonEmoji, { fontSize: 40 * fontScale }]}>🧠</Text>
          <View style={styles.gameButtonText}>
            <Text style={[styles.gameButtonTitle, { fontSize: 18 * fontScale }]}>
              Emoji → Word
            </Text>
            <Text style={[styles.gameButtonSubtitle, { fontSize: 14 * fontScale }]}>
              See an emoji, pick the matching word
            </Text>
          </View>
          <Text style={[styles.gameButtonArrow, { fontSize: 24 * fontScale }]}>→</Text>
        </TouchableOpacity>

        {/* Word to Emoji Game Button */}
        <TouchableOpacity
          style={[styles.gameButton, { backgroundColor: '#2563EB' }]}
          onPress={() => handleStartSession('word_to_emoji')}
        >
          <Text style={[styles.gameButtonEmoji, { fontSize: 40 * fontScale }]}>💬</Text>
          <View style={styles.gameButtonText}>
            <Text style={[styles.gameButtonTitle, { fontSize: 18 * fontScale }]}>
              Word → Emoji
            </Text>
            <Text style={[styles.gameButtonSubtitle, { fontSize: 14 * fontScale }]}>
              See a word, pick the matching emoji
            </Text>
          </View>
          <Text style={[styles.gameButtonArrow, { fontSize: 24 * fontScale }]}>→</Text>
        </TouchableOpacity>

        {/* Number Sequence Game Button (1-10) */}
        <TouchableOpacity
          style={[styles.gameButton, { backgroundColor: '#7C3AED' }]}
          onPress={() => router.push({ pathname: '/play-sequence', params: { mode: '1-10' } })}
        >
          <Text style={[styles.gameButtonEmoji, { fontSize: 40 * fontScale }]}>🔢</Text>
          <View style={styles.gameButtonText}>
            <Text style={[styles.gameButtonTitle, { fontSize: 18 * fontScale }]}>
              Tap 1-10
            </Text>
            <Text style={[styles.gameButtonSubtitle, { fontSize: 14 * fontScale }]}>
              Tap numbers 1 to 10 in order
            </Text>
          </View>
          <Text style={[styles.gameButtonArrow, { fontSize: 24 * fontScale }]}>→</Text>
        </TouchableOpacity>

        {/* Number Sequence Game Button (10-100) */}
        <TouchableOpacity
          style={[styles.gameButton, { backgroundColor: '#6366F1' }]}
          onPress={() => router.push({ pathname: '/play-sequence', params: { mode: '10-100' } })}
        >
          <Text style={[styles.gameButtonEmoji, { fontSize: 40 * fontScale }]}>🔟</Text>
          <View style={styles.gameButtonText}>
            <Text style={[styles.gameButtonTitle, { fontSize: 18 * fontScale }]}>
              Tap 10-100
            </Text>
            <Text style={[styles.gameButtonSubtitle, { fontSize: 14 * fontScale }]}>
              Tap multiples of 10 in order
            </Text>
          </View>
          <Text style={[styles.gameButtonArrow, { fontSize: 24 * fontScale }]}>→</Text>
        </TouchableOpacity>

        {/* Random Decades Game Button */}
        <TouchableOpacity
          style={[styles.gameButton, { backgroundColor: '#EC4899' }]}
          onPress={() => router.push({ pathname: '/play-sequence', params: { mode: 'random' } })}
        >
          <Text style={[styles.gameButtonEmoji, { fontSize: 40 * fontScale }]}>🎲</Text>
          <View style={styles.gameButtonText}>
            <Text style={[styles.gameButtonTitle, { fontSize: 18 * fontScale }]}>
              Random Decades
            </Text>
            <Text style={[styles.gameButtonSubtitle, { fontSize: 14 * fontScale }]}>
              Random number from each decade
            </Text>
          </View>
          <Text style={[styles.gameButtonArrow, { fontSize: 24 * fontScale }]}>→</Text>
        </TouchableOpacity>

        {/* Even Numbers Game Button */}
        <TouchableOpacity
          style={[styles.gameButton, { backgroundColor: '#14B8A6' }]}
          onPress={() => router.push({ pathname: '/play-sequence', params: { mode: 'even' } })}
        >
          <Text style={[styles.gameButtonEmoji, { fontSize: 40 * fontScale }]}>2️⃣</Text>
          <View style={styles.gameButtonText}>
            <Text style={[styles.gameButtonTitle, { fontSize: 18 * fontScale }]}>
              Even Numbers
            </Text>
            <Text style={[styles.gameButtonSubtitle, { fontSize: 14 * fontScale }]}>
              Tap 2, 4, 6, 8... up to 20
            </Text>
          </View>
          <Text style={[styles.gameButtonArrow, { fontSize: 24 * fontScale }]}>→</Text>
        </TouchableOpacity>

        {/* Odd Numbers Game Button */}
        <TouchableOpacity
          style={[styles.gameButton, { backgroundColor: '#F97316' }]}
          onPress={() => router.push({ pathname: '/play-sequence', params: { mode: 'odd' } })}
        >
          <Text style={[styles.gameButtonEmoji, { fontSize: 40 * fontScale }]}>1️⃣</Text>
          <View style={styles.gameButtonText}>
            <Text style={[styles.gameButtonTitle, { fontSize: 18 * fontScale }]}>
              Odd Numbers
            </Text>
            <Text style={[styles.gameButtonSubtitle, { fontSize: 14 * fontScale }]}>
              Tap 1, 3, 5, 7... up to 19
            </Text>
          </View>
          <Text style={[styles.gameButtonArrow, { fontSize: 24 * fontScale }]}>→</Text>
        </TouchableOpacity>

        {/* Alphabet Sequence Game Button */}
        <TouchableOpacity
          style={[styles.gameButton, { backgroundColor: '#059669' }]}
          onPress={() => router.push('/play-alphabet')}
        >
          <Text style={[styles.gameButtonEmoji, { fontSize: 40 * fontScale }]}>🔤</Text>
          <View style={styles.gameButtonText}>
            <Text style={[styles.gameButtonTitle, { fontSize: 18 * fontScale }]}>
              Tap the Letters
            </Text>
            <Text style={[styles.gameButtonSubtitle, { fontSize: 14 * fontScale }]}>
              Tap A-J in order as fast as you can
            </Text>
          </View>
          <Text style={[styles.gameButtonArrow, { fontSize: 24 * fontScale }]}>→</Text>
        </TouchableOpacity>

        {/* Odd One Out Game Button */}
        <TouchableOpacity
          style={[styles.gameButton, { backgroundColor: '#8B5CF6' }]}
          onPress={() => router.push('/play-odd-one-out')}
        >
          <Text style={[styles.gameButtonEmoji, { fontSize: 40 * fontScale }]}>🔍</Text>
          <View style={styles.gameButtonText}>
            <Text style={[styles.gameButtonTitle, { fontSize: 18 * fontScale }]}>
              Odd One Out
            </Text>
            <Text style={[styles.gameButtonSubtitle, { fontSize: 14 * fontScale }]}>
              Find the emoji that doesn't belong
            </Text>
          </View>
          <Text style={[styles.gameButtonArrow, { fontSize: 24 * fontScale }]}>→</Text>
        </TouchableOpacity>

        {/* How It Works */}
        <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.gray[200] }]}>
          <Text style={[styles.infoTitle, { color: colors.gray[800], fontSize: 16 * fontScale }]}>
            Why Brain Games?
          </Text>
          <View style={styles.infoItem}>
            <Text style={[styles.infoEmoji, { fontSize: 20 * fontScale }]}>🧠</Text>
            <Text style={[styles.infoText, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
              Exercise cognitive skills and memory
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoEmoji, { fontSize: 20 * fontScale }]}>👁️</Text>
            <Text style={[styles.infoText, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
              Improve visual scanning and attention
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoEmoji, { fontSize: 20 * fontScale }]}>📊</Text>
            <Text style={[styles.infoText, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
              Track your progress over time
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoEmoji, { fontSize: 20 * fontScale }]}>🔥</Text>
            <Text style={[styles.infoText, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
              Play daily to build your streak!
            </Text>
          </View>
        </View>

        {/* Game Types Preview */}
        <Text style={[styles.sectionTitle, { color: colors.gray[800], fontSize: 16 * fontScale, marginTop: 12 }]}>
          Game Types
        </Text>
        <View style={styles.gameTypesGrid}>
          <View style={[styles.gameTypeCard, { backgroundColor: colors.primary[50] }]}>
            <Text style={[styles.gameTypeEmoji, { fontSize: 14 * fontScale }]}>🍎→?</Text>
            <Text style={[styles.gameTypeLabel, { color: colors.gray[700], fontSize: 8 * fontScale }]}>
              Emoji
            </Text>
          </View>
          <View style={[styles.gameTypeCard, { backgroundColor: colors.accent[50] }]}>
            <Text style={[styles.gameTypeEmoji, { fontSize: 14 * fontScale }]}>Word</Text>
            <Text style={[styles.gameTypeLabel, { color: colors.gray[700], fontSize: 8 * fontScale }]}>
              Word
            </Text>
          </View>
          <View style={[styles.gameTypeCard, { backgroundColor: '#EDE9FE' }]}>
            <Text style={[styles.gameTypeEmoji, { fontSize: 14 * fontScale }]}>1→10</Text>
            <Text style={[styles.gameTypeLabel, { color: colors.gray[700], fontSize: 8 * fontScale }]}>
              Numbers
            </Text>
          </View>
          <View style={[styles.gameTypeCard, { backgroundColor: '#E0E7FF' }]}>
            <Text style={[styles.gameTypeEmoji, { fontSize: 14 * fontScale }]}>10→100</Text>
            <Text style={[styles.gameTypeLabel, { color: colors.gray[700], fontSize: 8 * fontScale }]}>
              Tens
            </Text>
          </View>
          <View style={[styles.gameTypeCard, { backgroundColor: '#FCE7F3' }]}>
            <Text style={[styles.gameTypeEmoji, { fontSize: 14 * fontScale }]}>🎲</Text>
            <Text style={[styles.gameTypeLabel, { color: colors.gray[700], fontSize: 8 * fontScale }]}>
              Random
            </Text>
          </View>
          <View style={[styles.gameTypeCard, { backgroundColor: '#CCFBF1' }]}>
            <Text style={[styles.gameTypeEmoji, { fontSize: 14 * fontScale }]}>2,4,6</Text>
            <Text style={[styles.gameTypeLabel, { color: colors.gray[700], fontSize: 8 * fontScale }]}>
              Even
            </Text>
          </View>
          <View style={[styles.gameTypeCard, { backgroundColor: '#FFEDD5' }]}>
            <Text style={[styles.gameTypeEmoji, { fontSize: 14 * fontScale }]}>1,3,5</Text>
            <Text style={[styles.gameTypeLabel, { color: colors.gray[700], fontSize: 8 * fontScale }]}>
              Odd
            </Text>
          </View>
          <View style={[styles.gameTypeCard, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.gameTypeEmoji, { fontSize: 14 * fontScale }]}>A→J</Text>
            <Text style={[styles.gameTypeLabel, { color: colors.gray[700], fontSize: 8 * fontScale }]}>
              Letters
            </Text>
          </View>
          <View style={[styles.gameTypeCard, { backgroundColor: '#EDE9FE' }]}>
            <Text style={[styles.gameTypeEmoji, { fontSize: 14 * fontScale }]}>🔍</Text>
            <Text style={[styles.gameTypeLabel, { color: colors.gray[700], fontSize: 8 * fontScale }]}>
              Odd Out
            </Text>
          </View>
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  streakEmoji: {
    marginRight: 12,
  },
  streakText: {
    flex: 1,
  },
  streakNumber: {
    fontWeight: 'bold',
  },
  streakLabel: {
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  statsTitle: {
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  loader: {
    paddingVertical: 20,
  },
  errorText: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingVertical: 10,
  },
  gameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  gameButtonEmoji: {
    marginRight: 16,
  },
  gameButtonText: {
    flex: 1,
  },
  gameButtonTitle: {
    fontWeight: 'bold',
    color: '#fff',
  },
  gameButtonSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  gameButtonArrow: {
    color: '#fff',
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoEmoji: {
    width: 32,
  },
  infoText: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  gameTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gameTypeCard: {
    width: '23%',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  gameTypeEmoji: {
    marginBottom: 8,
  },
  gameTypeLabel: {
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 32,
  },
});
