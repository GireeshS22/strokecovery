import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/colors';
import { medicinesApi, Medicine } from '../services/api';

// Time of day options
const TIME_OF_DAY_OPTIONS = [
  { id: 'morning', icon: '🌅', label: 'Morning' },
  { id: 'afternoon', icon: '☀️', label: 'Afternoon' },
  { id: 'night', icon: '🌙', label: 'Night' },
];

export default function LogMedicineScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [entryDate, setEntryDate] = useState(() => {
    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  });
  const [timeOfDay, setTimeOfDay] = useState<string>('morning');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      const list = await medicinesApi.list();
      setMedicines(list.filter(m => m.is_active));
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load medicines');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (d: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setEntryDate(selectedDate);
  };

  const handleSave = async () => {
    if (!selectedMedicine) {
      Alert.alert('Error', 'Please select a medicine');
      return;
    }

    setIsSaving(true);
    try {
      // Create a scheduled_time based on the date and time of day
      const scheduledTime = new Date(entryDate);
      if (timeOfDay === 'morning') {
        scheduledTime.setHours(8, 0, 0, 0);
      } else if (timeOfDay === 'afternoon') {
        scheduledTime.setHours(14, 0, 0, 0);
      } else {
        scheduledTime.setHours(20, 0, 0, 0);
      }

      await medicinesApi.logMedicine(selectedMedicine.id, {
        scheduled_time: scheduledTime.toISOString(),
        time_of_day: timeOfDay,
        status: 'taken',
      });

      Alert.alert('Success', `${selectedMedicine.name} logged as taken!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to log medicine');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
        <Text style={styles.loadingText}>Loading medicines...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Log Medicine</Text>
        <Text style={styles.subtitle}>Record that you took your medicine</Text>
      </View>

      {/* Date */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>{formatDate(entryDate)}</Text>
          <Text style={styles.dateIcon}>📅</Text>
        </TouchableOpacity>
      </View>

      {/* Time of Day */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time of Day</Text>
        <View style={styles.timeRow}>
          {TIME_OF_DAY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.timeCard,
                timeOfDay === option.id && styles.timeCardActive,
              ]}
              onPress={() => setTimeOfDay(option.id)}
            >
              <Text style={styles.timeIcon}>{option.icon}</Text>
              <Text
                style={[
                  styles.timeLabel,
                  timeOfDay === option.id && styles.timeLabelActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Select Medicine */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Medicine</Text>
        {medicines.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💊</Text>
            <Text style={styles.emptyText}>No medicines added yet</Text>
            <TouchableOpacity
              style={styles.addMedicineButton}
              onPress={() => router.push('/add-medicine')}
            >
              <Text style={styles.addMedicineButtonText}>+ Add Medicine</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.medicineList}>
            {medicines.map((medicine) => (
              <TouchableOpacity
                key={medicine.id}
                style={[
                  styles.medicineCard,
                  selectedMedicine?.id === medicine.id && styles.medicineCardActive,
                ]}
                onPress={() => setSelectedMedicine(medicine)}
              >
                <View style={styles.medicineIcon}>
                  <Text style={styles.medicineEmoji}>💊</Text>
                </View>
                <View style={styles.medicineInfo}>
                  <Text style={styles.medicineName}>{medicine.name}</Text>
                  {medicine.dosage && (
                    <Text style={styles.medicineDosage}>{medicine.dosage}</Text>
                  )}
                </View>
                {selectedMedicine?.id === medicine.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Save Button */}
      {medicines.length > 0 && (
        <>
          <TouchableOpacity
            style={[styles.saveButton, !selectedMedicine && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving || !selectedMedicine}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Log as Taken</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Date Picker */}
      {Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={entryDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={handleDateChange}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={entryDate}
          mode="date"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.gray[500],
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary[600],
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.gray[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray[500],
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.gray[50],
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.gray[900],
  },
  dateIcon: {
    fontSize: 20,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    backgroundColor: Colors.gray[50],
  },
  timeCardActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  timeIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[600],
  },
  timeLabelActive: {
    color: Colors.primary[700],
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.gray[500],
    marginBottom: 16,
  },
  addMedicineButton: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addMedicineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  medicineList: {
    gap: 10,
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.gray[200],
  },
  medicineCardActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
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
    color: Colors.gray[600],
    marginTop: 2,
  },
  checkmark: {
    fontSize: 24,
    color: Colors.primary[600],
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: Colors.gray[500],
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  modalCancel: {
    fontSize: 16,
    color: Colors.gray[500],
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary[600],
  },
});
