import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors, HighContrastColors } from '../../constants/colors';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { gamesApi, GameStats } from '../../services/api';

export default function HomeScreen() {
  const { highContrast, fontScale } = useAccessibility();
  const colors = highContrast ? HighContrastColors : Colors;

  const [gameStats, setGameStats] = useState<GameStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loadStats = async () => {
        try {
          const stats = await gamesApi.getStats();
          setGameStats(stats);
        } catch (err) {
          // Silently fail - stats are optional
        }
      };
      loadStats();
    }, [])
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.surface }]} contentContainerStyle={styles.content}>
      {/* Welcome Card */}
      <View style={[styles.welcomeCard, { backgroundColor: colors.primary[600] }]}>
        <Text style={styles.welcomeEmoji}>👋</Text>
        <Text style={[styles.welcomeTitle, { fontSize: 24 * fontScale }]}>Welcome back!</Text>
        <Text style={[styles.welcomeSubtitle, { color: colors.primary[100], fontSize: 16 * fontScale }]}>
          You're doing great on your recovery journey
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.gray[200] }]}>
          <Text style={[styles.statNumber, { color: colors.primary[600], fontSize: 32 * fontScale }]}>0</Text>
          <Text style={[styles.statLabel, { color: colors.gray[500], fontSize: 14 * fontScale }]}>Medicines Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.gray[200] }]}>
          <Text style={[styles.statNumber, { color: colors.primary[600], fontSize: 32 * fontScale }]}>0</Text>
          <Text style={[styles.statLabel, { color: colors.gray[500], fontSize: 14 * fontScale }]}>Sessions This Week</Text>
        </View>
      </View>

      {/* Daily Stroke Bites */}
      <TouchableOpacity
        style={[styles.bitesCard, { backgroundColor: '#7C3AED' }]}
        onPress={() => router.push('/stroke-bites')}
      >
        <View style={styles.bitesCardContent}>
          <Text style={[styles.bitesEmoji, { fontSize: 40 * fontScale }]}>📰</Text>
          <View style={styles.bitesCardText}>
            <Text style={[styles.bitesTitle, { fontSize: 16 * fontScale }]}>
              Daily Stroke Bites
            </Text>
            <Text style={[styles.bitesSubtitle, { fontSize: 14 * fontScale }]}>
              Your personalized recovery insights
            </Text>
          </View>
          <Text style={[styles.bitesArrow, { fontSize: 24 * fontScale }]}>›</Text>
        </View>
      </TouchableOpacity>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: colors.gray[800], fontSize: 18 * fontScale }]}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.primary[50] }]}
          onPress={() => router.push('/(tabs)/medicines')}
        >
          <Text style={[styles.actionIcon, { fontSize: 32 * fontScale }]}>💊</Text>
          <Text style={[styles.actionLabel, { color: colors.gray[700], fontSize: 14 * fontScale }]}>Add Medicine</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.accent[50] }]}
          onPress={() => router.push('/(tabs)/calendar')}
        >
          <Text style={[styles.actionIcon, { fontSize: 32 * fontScale }]}>📅</Text>
          <Text style={[styles.actionLabel, { color: colors.gray[700], fontSize: 14 * fontScale }]}>Log Session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#EDE9FE' }]}
          onPress={() => router.push('/add-mood')}
        >
          <Text style={[styles.actionIcon, { fontSize: 32 * fontScale }]}>😊</Text>
          <Text style={[styles.actionLabel, { color: colors.gray[700], fontSize: 14 * fontScale }]}>Log Mood</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#FEF3C7' }]}
          onPress={() => router.push('/add-ailment')}
        >
          <Text style={[styles.actionIcon, { fontSize: 32 * fontScale }]}>🩹</Text>
          <Text style={[styles.actionLabel, { color: colors.gray[700], fontSize: 14 * fontScale }]}>Log Ailment</Text>
        </TouchableOpacity>
      </View>

      {/* Brain Games Section */}
      <Text style={[styles.sectionTitle, { color: colors.gray[800], fontSize: 18 * fontScale }]}>Brain Games</Text>
      <TouchableOpacity
        style={[styles.gamesCard, { backgroundColor: colors.background, borderColor: colors.gray[200] }]}
        onPress={() => router.push('/games')}
      >
        <View style={styles.gamesCardContent}>
          <Text style={[styles.gamesIcon, { fontSize: 40 * fontScale }]}>🧠</Text>
          <View style={styles.gamesCardText}>
            <Text style={[styles.gamesTitle, { color: colors.gray[800], fontSize: 16 * fontScale }]}>
              Word-Image Games
            </Text>
            <Text style={[styles.gamesSubtitle, { color: colors.gray[500], fontSize: 14 * fontScale }]}>
              Match words with emojis to exercise your brain
            </Text>
          </View>
          {gameStats && gameStats.current_streak > 0 ? (
            <View style={styles.streakBadge}>
              <Text style={[styles.streakBadgeText, { fontSize: 12 * fontScale }]}>
                🔥 {gameStats.current_streak}
              </Text>
            </View>
          ) : (
            <Text style={[styles.gamesArrow, { color: colors.gray[400], fontSize: 24 * fontScale }]}>›</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Daily Tip */}
      <View style={[styles.tipCard, { backgroundColor: colors.background, borderColor: colors.gray[200] }]}>
        <View style={styles.tipHeader}>
          <Text style={[styles.tipBadge, { backgroundColor: colors.primary[100], color: colors.primary[700], fontSize: 12 * fontScale }]}>Daily Tip</Text>
        </View>
        <Text style={[styles.tipText, { color: colors.gray[700], fontSize: 15 * fontScale }]}>
          The brain can form new neural pathways for years after stroke. Every
          therapy session helps build these connections — this is called
          neuroplasticity.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  welcomeCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNumber: {
    fontWeight: 'bold',
  },
  statLabel: {
    marginTop: 4,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    width: '47%',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionLabel: {
    fontWeight: '600',
  },
  tipCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  tipHeader: {
    marginBottom: 12,
  },
  tipBadge: {
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  tipText: {
    lineHeight: 22,
  },
  gamesCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  gamesCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gamesIcon: {
    marginRight: 12,
  },
  gamesCardText: {
    flex: 1,
  },
  gamesTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  gamesSubtitle: {
  },
  gamesArrow: {
    marginLeft: 8,
  },
  streakBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  streakBadgeText: {
    color: '#92400E',
    fontWeight: '600',
  },
  bitesCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bitesCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bitesEmoji: {
    marginRight: 16,
  },
  bitesCardText: {
    flex: 1,
  },
  bitesTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 4,
  },
  bitesSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  bitesArrow: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
  },
});
