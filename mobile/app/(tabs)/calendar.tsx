import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { therapyApi, TherapySession, TherapyStats } from '../../services/api';

// Therapy type config
const THERAPY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  PT: { icon: '🏃', color: '#3B82F6', label: 'Physical Therapy' },
  OT: { icon: '✋', color: '#10B981', label: 'Occupational Therapy' },
  Speech: { icon: '🗣️', color: '#8B5CF6', label: 'Speech Therapy' },
  Other: { icon: '⭐', color: '#F59E0B', label: 'Other Therapy' },
};

// Feeling rating config
const FEELING_CONFIG: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '😫', label: 'Very Tired' },
  2: { emoji: '😔', label: 'Tired' },
  3: { emoji: '😐', label: 'Okay' },
  4: { emoji: '🙂', label: 'Good' },
  5: { emoji: '😊', label: 'Great' },
};

export default function CalendarScreen() {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [stats, setStats] = useState<TherapyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);

    try {
      const [sessionsList, statsData] = await Promise.all([
        therapyApi.listSessions({ limit: 50 }),
        therapyApi.getStats(),
      ]);
      setSessions(sessionsList);
      setStats(statsData);
    } catch (error: any) {
      console.log('Failed to load therapy data:', error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce((groups, session) => {
    const date = session.session_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(session);
    return groups;
  }, {} as Record<string, TherapySession[]>);

  const sortedDates = Object.keys(groupedSessions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* View Mode Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
            List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'calendar' && styles.toggleButtonActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Text style={[styles.toggleText, viewMode === 'calendar' && styles.toggleTextActive]}>
            Calendar
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'list' ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />
          }
        >
          {/* Stats Summary */}
          {stats && stats.total_sessions > 0 && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.this_week_sessions}</Text>
                <Text style={styles.statLabel}>This Week</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.this_month_sessions}</Text>
                <Text style={styles.statLabel}>This Month</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.total_sessions}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>
          )}

          {/* Session List */}
          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>No sessions logged</Text>
              <Text style={styles.emptySubtitle}>
                Track your PT, OT, and speech therapy sessions
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/add-session')}
              >
                <Text style={styles.addButtonText}>+ Log Session</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {sortedDates.map((date) => (
                <View key={date} style={styles.dateGroup}>
                  <Text style={styles.dateHeader}>{formatDate(date)}</Text>
                  {groupedSessions[date].map((session) => {
                    const config = THERAPY_CONFIG[session.therapy_type] || THERAPY_CONFIG.Other;
                    const feeling = FEELING_CONFIG[session.feeling_rating] || FEELING_CONFIG[3];

                    return (
                      <TouchableOpacity
                        key={session.id}
                        style={styles.sessionCard}
                        onPress={() => router.push(`/edit-session?id=${session.id}`)}
                      >
                        <View style={[styles.sessionIcon, { backgroundColor: config.color + '20' }]}>
                          <Text style={styles.sessionEmoji}>{config.icon}</Text>
                        </View>
                        <View style={styles.sessionInfo}>
                          <View style={styles.sessionHeader}>
                            <Text style={styles.sessionType}>{config.label}</Text>
                            <Text style={styles.sessionFeeling}>{feeling.emoji}</Text>
                          </View>
                          <Text style={styles.sessionDetails}>
                            {formatDuration(session.duration_minutes)}
                            {session.session_time && ` • ${formatTime(session.session_time)}`}
                          </Text>
                          {session.notes && (
                            <Text style={styles.sessionNotes} numberOfLines={1}>
                              {session.notes}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.chevron}>›</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        // Calendar View (placeholder for now)
        <View style={styles.calendarPlaceholder}>
          <Text style={styles.calendarPlaceholderText}>
            Calendar view coming soon
          </Text>
          <Text style={styles.calendarPlaceholderSubtext}>
            Install react-native-calendars to enable
          </Text>
        </View>
      )}

      {/* FAB - Add Session */}
      {sessions.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/add-session')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.gray[500],
  },
  toggleContainer: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: Colors.gray[100],
    borderRadius: 10,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[500],
  },
  toggleTextActive: {
    color: Colors.primary[600],
  },
  scrollContent: {
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.gray[200],
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary[600],
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 60,
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
  listContainer: {
    paddingHorizontal: 16,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[500],
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionEmoji: {
    fontSize: 22,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionType: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  sessionFeeling: {
    fontSize: 18,
  },
  sessionDetails: {
    fontSize: 14,
    color: Colors.gray[600],
    marginTop: 2,
  },
  sessionNotes: {
    fontSize: 13,
    color: Colors.gray[500],
    marginTop: 4,
    fontStyle: 'italic',
  },
  chevron: {
    fontSize: 24,
    color: Colors.gray[400],
    marginLeft: 8,
  },
  calendarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  calendarPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[600],
    marginBottom: 8,
  },
  calendarPlaceholderSubtext: {
    fontSize: 14,
    color: Colors.gray[400],
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
    marginTop: -2,
  },
});
