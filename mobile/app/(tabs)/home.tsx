import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeEmoji}>👋</Text>
        <Text style={styles.welcomeTitle}>Welcome back!</Text>
        <Text style={styles.welcomeSubtitle}>
          You're doing great on your recovery journey
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Medicines Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Sessions This Week</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: Colors.primary[50] }]}
          onPress={() => router.push('/(tabs)/medicines')}
        >
          <Text style={styles.actionIcon}>💊</Text>
          <Text style={styles.actionLabel}>Add Medicine</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: Colors.accent[50] }]}
          onPress={() => router.push('/(tabs)/calendar')}
        >
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionLabel}>Log Session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#EDE9FE' }]}
        >
          <Text style={styles.actionIcon}>😊</Text>
          <Text style={styles.actionLabel}>Log Mood</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#FEF3C7' }]}
        >
          <Text style={styles.actionIcon}>📝</Text>
          <Text style={styles.actionLabel}>Journal</Text>
        </TouchableOpacity>
      </View>

      {/* Daily Tip */}
      <View style={styles.tipCard}>
        <View style={styles.tipHeader}>
          <Text style={styles.tipBadge}>Daily Tip</Text>
        </View>
        <Text style={styles.tipText}>
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
    backgroundColor: Colors.surface,
  },
  content: {
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: Colors.primary[600],
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.primary[100],
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary[600],
  },
  statLabel: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[800],
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
    fontSize: 32,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[700],
  },
  tipCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  tipHeader: {
    marginBottom: 12,
  },
  tipBadge: {
    backgroundColor: Colors.primary[100],
    color: Colors.primary[700],
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tipText: {
    fontSize: 15,
    color: Colors.gray[700],
    lineHeight: 22,
  },
});
