import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Colors, HighContrastColors } from '../constants/colors';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { gamesApi, GameStats } from '../services/api';
import { allGames } from '../constants/gameContent';

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

  const handleStartSession = () => {
    // Shuffle all games and pick first 10
    const shuffled = shuffleArray(allGames);
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

        {/* Start Session Button */}
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: colors.primary[600] }]}
          onPress={handleStartSession}
        >
          <Text style={[styles.startButtonEmoji, { fontSize: 40 * fontScale }]}>🧠</Text>
          <View style={styles.startButtonText}>
            <Text style={[styles.startButtonTitle, { fontSize: 20 * fontScale }]}>
              Start Session
            </Text>
            <Text style={[styles.startButtonSubtitle, { fontSize: 14 * fontScale }]}>
              {GAMES_PER_SESSION} randomized games
            </Text>
          </View>
          <Text style={[styles.startButtonArrow, { fontSize: 24 * fontScale }]}>→</Text>
        </TouchableOpacity>

        {/* How It Works */}
        <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.gray[200] }]}>
          <Text style={[styles.infoTitle, { color: colors.gray[800], fontSize: 16 * fontScale }]}>
            How It Works
          </Text>
          <View style={styles.infoItem}>
            <Text style={[styles.infoEmoji, { fontSize: 20 * fontScale }]}>🎯</Text>
            <Text style={[styles.infoText, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
              Match emojis to words and words to emojis
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoEmoji, { fontSize: 20 * fontScale }]}>🔟</Text>
            <Text style={[styles.infoText, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
              Each session has 10 random games
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoEmoji, { fontSize: 20 * fontScale }]}>📊</Text>
            <Text style={[styles.infoText, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
              See your results and track progress
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
        <Text style={[styles.sectionTitle, { color: colors.gray[800], fontSize: 16 * fontScale }]}>
          Game Types
        </Text>
        <View style={styles.gameTypesRow}>
          <View style={[styles.gameTypeCard, { backgroundColor: colors.primary[50] }]}>
            <Text style={[styles.gameTypeEmoji, { fontSize: 32 * fontScale }]}>🍎 → ?</Text>
            <Text style={[styles.gameTypeLabel, { color: colors.gray[700], fontSize: 12 * fontScale }]}>
              Emoji to Word
            </Text>
          </View>
          <View style={[styles.gameTypeCard, { backgroundColor: colors.accent[50] }]}>
            <Text style={[styles.gameTypeEmoji, { fontSize: 32 * fontScale }]}>Heart → ?</Text>
            <Text style={[styles.gameTypeLabel, { color: colors.gray[700], fontSize: 12 * fontScale }]}>
              Word to Emoji
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
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  startButtonEmoji: {
    marginRight: 16,
  },
  startButtonText: {
    flex: 1,
  },
  startButtonTitle: {
    fontWeight: 'bold',
    color: '#fff',
  },
  startButtonSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  startButtonArrow: {
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
  gameTypesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gameTypeCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
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
