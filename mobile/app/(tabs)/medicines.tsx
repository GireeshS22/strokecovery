import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors, HighContrastColors } from '../../constants/colors';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { medicinesApi, Medicine, MedicineTodayResponse } from '../../services/api';

const TIMING_LABELS: Record<string, string> = {
  before_food: 'Before food',
  after_food: 'After food',
  with_food: 'With food',
  any_time: 'Any time',
};

export default function MedicinesScreen() {
  const { highContrast, fontScale } = useAccessibility();
  const colors = highContrast ? HighContrastColors : Colors;

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<MedicineTodayResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);

    try {
      const [medicinesList, today] = await Promise.all([
        medicinesApi.list(),
        medicinesApi.getToday(),
      ]);
      setMedicines(medicinesList);
      setTodaySchedule(today);
    } catch (error: any) {
      console.log('Failed to load medicines:', error.message);
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

  const handleMarkTaken = async (item: any) => {
    try {
      await medicinesApi.logMedicine(item.medicine_id, {
        scheduled_time: item.scheduled_time,
        time_of_day: item.time_of_day,
        status: 'taken',
      });
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const getScheduleText = (medicine: Medicine) => {
    const parts = [];
    if (medicine.morning) parts.push('Morning');
    if (medicine.afternoon) parts.push('Afternoon');
    if (medicine.night) parts.push('Night');
    return parts.join(' • ');
  };

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={[styles.loadingText, { color: colors.gray[500], fontSize: 16 * fontScale }]}>Loading medicines...</Text>
      </View>
    );
  }

  const hasPendingToday = todaySchedule && todaySchedule.total_pending > 0;
  const allReminders = todaySchedule
    ? [...todaySchedule.morning, ...todaySchedule.afternoon, ...todaySchedule.night]
    : [];
  const pendingReminders = allReminders.filter((r) => r.status === 'pending');

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />
        }
      >
        {/* Today's Reminders */}
        {hasPendingToday && (
          <View style={[styles.todaySection, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.gray[800], fontSize: 18 * fontScale }]}>Due Now</Text>
            {pendingReminders.map((item, index) => (
              <View key={`${item.medicine_id}-${item.time_of_day}-${index}`} style={[styles.reminderCard, { backgroundColor: colors.primary[50], borderLeftColor: colors.primary[600] }]}>
                <View style={styles.reminderInfo}>
                  <Text style={[styles.reminderName, { color: colors.gray[900], fontSize: 16 * fontScale }]}>{item.medicine_name}</Text>
                  <Text style={[styles.reminderDetails, { color: colors.gray[600], fontSize: 14 * fontScale }]}>
                    {item.dosage && `${item.dosage} • `}
                    {item.time_of_day.charAt(0).toUpperCase() + item.time_of_day.slice(1)} • {TIMING_LABELS[item.timing]}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.takeButton, { backgroundColor: colors.success }]}
                  onPress={() => handleMarkTaken(item)}
                >
                  <Text style={[styles.takeButtonText, { fontSize: 14 * fontScale }]}>Take</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Today's Summary */}
        {todaySchedule && allReminders.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryItem, styles.summaryTaken, { backgroundColor: colors.success + '20' }]}>
              <Text style={[styles.summaryNumber, { color: colors.gray[800], fontSize: 24 * fontScale }]}>{todaySchedule.total_taken}</Text>
              <Text style={[styles.summaryLabel, { color: colors.gray[600], fontSize: 12 * fontScale }]}>Taken</Text>
            </View>
            <View style={[styles.summaryItem, styles.summaryPending, { backgroundColor: colors.warning + '20' }]}>
              <Text style={[styles.summaryNumber, { color: colors.gray[800], fontSize: 24 * fontScale }]}>{todaySchedule.total_pending}</Text>
              <Text style={[styles.summaryLabel, { color: colors.gray[600], fontSize: 12 * fontScale }]}>Pending</Text>
            </View>
            <View style={[styles.summaryItem, styles.summaryMissed, { backgroundColor: colors.error + '20' }]}>
              <Text style={[styles.summaryNumber, { color: colors.gray[800], fontSize: 24 * fontScale }]}>{todaySchedule.total_missed}</Text>
              <Text style={[styles.summaryLabel, { color: colors.gray[600], fontSize: 12 * fontScale }]}>Missed</Text>
            </View>
          </View>
        )}

        {/* Medicine List */}
        <View style={[styles.listSection, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.gray[800], fontSize: 18 * fontScale }]}>My Medicines</Text>

          {medicines.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyIcon, { fontSize: 48 * fontScale }]}>💊</Text>
              <Text style={[styles.emptyTitle, { color: colors.gray[700], fontSize: 18 * fontScale }]}>No medicines yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.gray[500], fontSize: 14 * fontScale }]}>
                Add your medications to get reminders
              </Text>
            </View>
          ) : (
            medicines.map((medicine) => {
              const daysRemaining = getDaysRemaining(medicine.end_date);
              return (
                <TouchableOpacity
                  key={medicine.id}
                  style={[styles.medicineCard, { backgroundColor: colors.gray[50] }]}
                  onPress={() => router.push(`/edit-medicine?id=${medicine.id}`)}
                >
                  <View style={[styles.medicineIcon, { backgroundColor: colors.primary[100] }]}>
                    <Text style={[styles.medicineEmoji, { fontSize: 24 * fontScale }]}>💊</Text>
                  </View>
                  <View style={styles.medicineInfo}>
                    <Text style={[styles.medicineName, { color: colors.gray[900], fontSize: 16 * fontScale }]}>{medicine.name}</Text>
                    {medicine.dosage && (
                      <Text style={[styles.medicineDosage, { color: colors.gray[700], fontSize: 14 * fontScale }]}>{medicine.dosage}</Text>
                    )}
                    <Text style={[styles.medicineSchedule, { color: colors.gray[500], fontSize: 13 * fontScale }]}>
                      {getScheduleText(medicine)} • {TIMING_LABELS[medicine.timing]}
                    </Text>
                    {daysRemaining !== null && daysRemaining <= 7 && (
                      <View style={[styles.endingBadge, { backgroundColor: colors.warning + '30' }]}>
                        <Text style={[styles.endingBadgeText, { color: colors.warning, fontSize: 12 * fontScale }]}>
                          {daysRemaining <= 0 ? 'Ended' : `Ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.chevron, { color: colors.gray[400], fontSize: 24 * fontScale }]}>›</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* FAB - Add Medicine */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent[500] }]}
        onPress={() => router.push('/add-medicine')}
      >
        <Text style={[styles.fabText, { fontSize: 32 * fontScale }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    paddingBottom: 100,
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
  todaySection: {
    backgroundColor: Colors.background,
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 12,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[600],
  },
  reminderInfo: {
    flex: 1,
  },
  reminderName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  reminderDetails: {
    fontSize: 14,
    color: Colors.gray[600],
    marginTop: 4,
  },
  takeButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  takeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  summaryTaken: {
    backgroundColor: Colors.success + '20',
  },
  summaryPending: {
    backgroundColor: Colors.warning + '20',
  },
  summaryMissed: {
    backgroundColor: Colors.error + '20',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.gray[800],
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.gray[600],
    marginTop: 4,
  },
  listSection: {
    backgroundColor: Colors.background,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  medicineIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicineEmoji: {
    fontSize: 24,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  medicineDosage: {
    fontSize: 14,
    color: Colors.gray[700],
    marginTop: 2,
  },
  medicineSchedule: {
    fontSize: 13,
    color: Colors.gray[500],
    marginTop: 4,
  },
  endingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.warning + '30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  endingBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.warning,
  },
  chevron: {
    fontSize: 24,
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
