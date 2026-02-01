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
import { Colors, HighContrastColors } from '../../constants/colors';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import {
  calendarApi,
  CalendarDayEntries,
  CalendarResponse,
} from '../../services/api';
import AddEntrySheet from '../../components/AddEntrySheet';

// Therapy type config
const THERAPY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  PT: { icon: '🏃', color: '#3B82F6', label: 'Physical Therapy' },
  OT: { icon: '✋', color: '#10B981', label: 'Occupational Therapy' },
  Speech: { icon: '🗣️', color: '#8B5CF6', label: 'Speech Therapy' },
  Other: { icon: '⭐', color: '#F59E0B', label: 'Other Therapy' },
};

// Day of week labels
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Month names
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarScreen() {
  const { highContrast, fontScale } = useAccessibility();
  const colors = highContrast ? HighContrastColors : Colors;

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split('T')[0]);
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);

    try {
      // Get first and last day of current month
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];

      const data = await calendarApi.getRange(startDate, endDate);
      setCalendarData(data);
    } catch (error: any) {
      console.log('Failed to load calendar data:', error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [currentYear, currentMonth])
  );

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  // Generate calendar grid
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    const days: { date: string | null; dayNum: number | null }[] = [];

    // Add empty cells for days before the first day
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: null, dayNum: null });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      days.push({
        date: date.toISOString().split('T')[0],
        dayNum: day,
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // Get entry indicators for a date
  const getDateIndicators = (dateStr: string | null) => {
    if (!dateStr || !calendarData?.entries[dateStr]) return [];
    const entries = calendarData.entries[dateStr];
    const indicators: string[] = [];
    if (entries.therapy.length > 0) indicators.push('#3B82F6'); // Blue for therapy
    if (entries.mood) indicators.push('#10B981'); // Green for mood
    if (entries.ailments.length > 0) indicators.push('#EF4444'); // Red for ailments
    if (entries.medicines.length > 0) indicators.push('#F59E0B'); // Amber for medicines
    return indicators;
  };

  const isToday = (dateStr: string | null) => {
    if (!dateStr) return false;
    return dateStr === today.toISOString().split('T')[0];
  };

  const isFuture = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) > today;
  };

  // Get selected day entries
  const selectedDayEntries: CalendarDayEntries | null =
    calendarData?.entries[selectedDate] || null;

  const formatSelectedDate = () => {
    const date = new Date(selectedDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={[styles.loadingText, { color: colors.gray[500], fontSize: 16 * fontScale }]}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Month Navigation */}
      <View style={[styles.monthNav, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
          <Text style={[styles.navButtonText, { color: colors.primary[600] }]}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday}>
          <Text style={[styles.monthTitle, { color: colors.gray[900], fontSize: 18 * fontScale }]}>
            {MONTHS[currentMonth]} {currentYear}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Text style={[styles.navButtonText, { color: colors.primary[600] }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View style={[styles.weekdayRow, { backgroundColor: colors.background, borderBottomColor: colors.gray[100] }]}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: colors.gray[500], fontSize: 12 * fontScale }]}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={[styles.calendarGrid, { backgroundColor: colors.background }]}>
        {calendarDays.map((day, index) => {
          const indicators = getDateIndicators(day.date);
          const isSelected = day.date === selectedDate;
          const todayStyle = isToday(day.date);
          const futureStyle = isFuture(day.date);

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                isSelected && [styles.dayCellSelected, { backgroundColor: colors.primary[100] }],
              ]}
              onPress={() => day.date && !futureStyle && setSelectedDate(day.date)}
              disabled={!day.date || futureStyle}
            >
              {day.dayNum && (
                <>
                  <Text
                    style={[
                      styles.dayText,
                      { color: colors.gray[800], fontSize: 15 * fontScale },
                      todayStyle && { color: colors.primary[600], fontWeight: '700' },
                      isSelected && { color: colors.primary[700] },
                      futureStyle && { color: colors.gray[300] },
                    ]}
                  >
                    {day.dayNum}
                  </Text>
                  <View style={styles.indicatorRow}>
                    {indicators.slice(0, 4).map((color, i) => (
                      <View
                        key={i}
                        style={[styles.indicator, { backgroundColor: color }]}
                      />
                    ))}
                  </View>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Day Detail */}
      <ScrollView
        style={[styles.dayDetail, { backgroundColor: colors.surface }]}
        contentContainerStyle={styles.dayDetailContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />
        }
      >
        <Text style={[styles.selectedDateTitle, { color: colors.gray[900], fontSize: 18 * fontScale }]}>{formatSelectedDate()}</Text>

        {!selectedDayEntries ||
        (selectedDayEntries.therapy.length === 0 &&
          !selectedDayEntries.mood &&
          selectedDayEntries.ailments.length === 0 &&
          selectedDayEntries.medicines.length === 0) ? (
          <View style={styles.emptyDay}>
            <Text style={[styles.emptyDayText, { color: colors.gray[500], fontSize: 16 * fontScale }]}>No entries for this day</Text>
            <TouchableOpacity
              style={[styles.addEntryButton, { backgroundColor: colors.primary[600] }]}
              onPress={() => setShowAddSheet(true)}
            >
              <Text style={[styles.addEntryButtonText, { fontSize: 16 * fontScale }]}>+ Add Entry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Medicines */}
            {selectedDayEntries.medicines.length > 0 && (
              <View style={styles.entrySection}>
                <Text style={[styles.entrySectionTitle, { color: colors.gray[500], fontSize: 14 * fontScale }]}>💊 Medicines</Text>
                {selectedDayEntries.medicines.map((med) => (
                  <View key={med.id} style={[styles.entryCard, { backgroundColor: colors.background }]}>
                    <View style={styles.entryRow}>
                      <Text style={[styles.entryName, { color: colors.gray[900], fontSize: 16 * fontScale }]}>{med.name}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: colors.gray[200] },
                          med.status === 'taken' && styles.statusTaken,
                          med.status === 'missed' && styles.statusMissed,
                        ]}
                      >
                        <Text style={[styles.statusText, { color: colors.gray[700], fontSize: 12 * fontScale }]}>
                          {med.status === 'taken' ? '✓' : med.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.entryMeta, { color: colors.gray[500], fontSize: 14 * fontScale }]}>
                      {med.time_of_day} {med.dosage ? `• ${med.dosage}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Therapy Sessions */}
            {selectedDayEntries.therapy.length > 0 && (
              <View style={styles.entrySection}>
                <Text style={[styles.entrySectionTitle, { color: colors.gray[500], fontSize: 14 * fontScale }]}>🏃 Therapy Sessions</Text>
                {selectedDayEntries.therapy.map((session) => {
                  const config = THERAPY_CONFIG[session.type] || THERAPY_CONFIG.Other;
                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={[styles.entryCard, { backgroundColor: colors.background }]}
                      onPress={() => router.push(`/edit-session?id=${session.id}`)}
                    >
                      <View style={styles.entryRow}>
                        <View style={styles.entryIconRow}>
                          <View
                            style={[
                              styles.therapyIcon,
                              { backgroundColor: config.color + '20' },
                            ]}
                          >
                            <Text>{config.icon}</Text>
                          </View>
                          <Text style={[styles.entryName, { color: colors.gray[900], fontSize: 16 * fontScale }]}>{config.label}</Text>
                        </View>
                        <Text style={[styles.feelingEmoji, { fontSize: 22 * fontScale }]}>{session.feeling_emoji}</Text>
                      </View>
                      <Text style={[styles.entryMeta, { color: colors.gray[500], fontSize: 14 * fontScale }]}>
                        {session.duration} min
                        {session.notes ? ` • ${session.notes}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Mood */}
            {selectedDayEntries.mood && (
              <View style={styles.entrySection}>
                <Text style={[styles.entrySectionTitle, { color: colors.gray[500], fontSize: 14 * fontScale }]}>😊 Mood</Text>
                <View style={[styles.entryCard, { backgroundColor: colors.background }]}>
                  <View style={styles.entryRow}>
                    <Text style={[styles.moodEmoji, { fontSize: 28 * fontScale }]}>{selectedDayEntries.mood.emoji}</Text>
                    <Text style={[styles.moodLabel, { color: colors.gray[800], fontSize: 18 * fontScale }]}>{selectedDayEntries.mood.label}</Text>
                  </View>
                  {selectedDayEntries.mood.notes && (
                    <Text style={[styles.entryMeta, { color: colors.gray[500], fontSize: 14 * fontScale }]}>{selectedDayEntries.mood.notes}</Text>
                  )}
                </View>
              </View>
            )}

            {/* Ailments */}
            {selectedDayEntries.ailments.length > 0 && (
              <View style={styles.entrySection}>
                <Text style={[styles.entrySectionTitle, { color: colors.gray[500], fontSize: 14 * fontScale }]}>🩹 Ailments</Text>
                {selectedDayEntries.ailments.map((ailment) => (
                  <View key={ailment.id} style={[styles.entryCard, { backgroundColor: colors.background }]}>
                    <View style={styles.entryRow}>
                      <Text style={[styles.entryName, { color: colors.gray[900], fontSize: 16 * fontScale }]}>{ailment.symptom}</Text>
                      <View
                        style={[
                          styles.severityBadge,
                          { backgroundColor: getSeverityColor(ailment.severity) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.severityText,
                            { color: getSeverityColor(ailment.severity), fontSize: 12 * fontScale },
                          ]}
                        >
                          {ailment.severity}/10
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.entryMeta, { color: colors.gray[500], fontSize: 14 * fontScale }]}>
                      {ailment.severity_label}
                      {ailment.body_location ? ` • ${ailment.body_location}` : ''}
                      {ailment.notes ? ` • ${ailment.notes}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB - Add Entry */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent[500] }]}
        onPress={() => setShowAddSheet(true)}
      >
        <Text style={[styles.fabText, { fontSize: 32 * fontScale }]}>+</Text>
      </TouchableOpacity>

      {/* Add Entry Sheet */}
      <AddEntrySheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        selectedDate={selectedDate}
      />
    </View>
  );
}

function getSeverityColor(severity: number): string {
  if (severity <= 3) return '#10B981';
  if (severity <= 6) return '#F59E0B';
  return '#EF4444';
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 28,
    color: Colors.primary[600],
    fontWeight: '300',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  weekdayRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray[500],
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary[100],
    borderRadius: 12,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray[800],
  },
  dayTextToday: {
    color: Colors.primary[600],
    fontWeight: '700',
  },
  dayTextSelected: {
    color: Colors.primary[700],
  },
  dayTextFuture: {
    color: Colors.gray[300],
  },
  indicatorRow: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 2,
  },
  indicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dayDetail: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  dayDetailContent: {
    padding: 16,
    paddingBottom: 100,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 16,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyDayText: {
    fontSize: 16,
    color: Colors.gray[500],
    marginBottom: 16,
  },
  addEntryButton: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addEntryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  entrySection: {
    marginBottom: 20,
  },
  entrySectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[500],
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entryCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  therapyIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  entryName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    textTransform: 'capitalize',
  },
  entryMeta: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.gray[200],
  },
  statusTaken: {
    backgroundColor: '#D1FAE5',
  },
  statusMissed: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray[700],
    textTransform: 'capitalize',
  },
  feelingEmoji: {
    fontSize: 22,
  },
  moodEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  moodLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
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
