import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, HighContrastColors } from '../../constants/colors';
import { useAccessibility } from '../../contexts/AccessibilityContext';

export default function HomeScreen() {
  const { highContrast, fontScale } = useAccessibility();
  const colors = highContrast ? HighContrastColors : Colors;

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
});
