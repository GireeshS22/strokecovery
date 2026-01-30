import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';

export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyTitle}>No sessions logged</Text>
        <Text style={styles.emptySubtitle}>
          Track your PT, OT, and speech therapy sessions
        </Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Log Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.gray[500],
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
