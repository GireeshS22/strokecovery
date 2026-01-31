import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { medicinesApi } from '../services/api';
import { scheduleMedicineNotifications } from '../services/notifications';

const TIMING_OPTIONS = [
  { id: 'before_food', label: 'Before food' },
  { id: 'after_food', label: 'After food' },
  { id: 'with_food', label: 'With food' },
  { id: 'any_time', label: 'Any time' },
];

export default function AddMedicineScreen() {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [morning, setMorning] = useState(false);
  const [afternoon, setAfternoon] = useState(false);
  const [night, setNight] = useState(false);
  const [timing, setTiming] = useState('after_food');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isOngoing, setIsOngoing] = useState(true);
  const [notes, setNotes] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (selectedDate) setStartDate(selectedDate);
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (selectedDate) setEndDate(selectedDate);
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter medicine name');
      return;
    }
    if (!morning && !afternoon && !night) {
      Alert.alert('Error', 'Please select at least one time slot');
      return;
    }

    setIsLoading(true);
    try {
      const newMedicine = await medicinesApi.create({
        name: name.trim(),
        dosage: dosage.trim() || undefined,
        morning,
        afternoon,
        night,
        timing,
        start_date: startDate.toISOString().split('T')[0],
        end_date: isOngoing ? undefined : endDate?.toISOString().split('T')[0],
        notes: notes.trim() || undefined,
      });

      // Schedule notifications for this medicine
      await scheduleMedicineNotifications(newMedicine);

      Alert.alert('Success', 'Medicine added with reminders', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add medicine');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Medicine</Text>
      </View>

      {/* Medicine Name */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medicine Name *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., Aspirin, Metformin"
          placeholderTextColor={Colors.gray[400]}
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Dosage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dosage</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., 500mg, 2 tablets"
          placeholderTextColor={Colors.gray[400]}
          value={dosage}
          onChangeText={setDosage}
        />
      </View>

      {/* Schedule - 1-0-1 Pattern */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule *</Text>
        <Text style={styles.sectionHint}>Select when to take this medicine</Text>
        <View style={styles.scheduleRow}>
          <TouchableOpacity
            style={[styles.scheduleSlot, morning && styles.scheduleSlotActive]}
            onPress={() => setMorning(!morning)}
          >
            <Text style={styles.scheduleIcon}>☀️</Text>
            <Text style={[styles.scheduleLabel, morning && styles.scheduleLabelActive]}>
              Morning
            </Text>
            <Text style={[styles.scheduleTime, morning && styles.scheduleTimeActive]}>
              8:00 AM
            </Text>
            <View style={[styles.scheduleIndicator, morning && styles.scheduleIndicatorActive]}>
              <Text style={styles.scheduleIndicatorText}>{morning ? '1' : '0'}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scheduleSlot, afternoon && styles.scheduleSlotActive]}
            onPress={() => setAfternoon(!afternoon)}
          >
            <Text style={styles.scheduleIcon}>🌤️</Text>
            <Text style={[styles.scheduleLabel, afternoon && styles.scheduleLabelActive]}>
              Afternoon
            </Text>
            <Text style={[styles.scheduleTime, afternoon && styles.scheduleTimeActive]}>
              2:00 PM
            </Text>
            <View style={[styles.scheduleIndicator, afternoon && styles.scheduleIndicatorActive]}>
              <Text style={styles.scheduleIndicatorText}>{afternoon ? '1' : '0'}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scheduleSlot, night && styles.scheduleSlotActive]}
            onPress={() => setNight(!night)}
          >
            <Text style={styles.scheduleIcon}>🌙</Text>
            <Text style={[styles.scheduleLabel, night && styles.scheduleLabelActive]}>
              Night
            </Text>
            <Text style={[styles.scheduleTime, night && styles.scheduleTimeActive]}>
              8:00 PM
            </Text>
            <View style={[styles.scheduleIndicator, night && styles.scheduleIndicatorActive]}>
              <Text style={styles.scheduleIndicatorText}>{night ? '1' : '0'}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.schedulePattern}>
          Pattern: {morning ? '1' : '0'}-{afternoon ? '1' : '0'}-{night ? '1' : '0'}
        </Text>
      </View>

      {/* Timing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>When to take</Text>
        <View style={styles.timingGrid}>
          {TIMING_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.timingOption,
                timing === option.id && styles.timingOptionActive,
              ]}
              onPress={() => setTiming(option.id)}
            >
              <Text
                style={[
                  styles.timingLabel,
                  timing === option.id && styles.timingLabelActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Start Date */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Start Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowStartPicker(true)}
        >
          <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
          <Text style={styles.dateIcon}>📅</Text>
        </TouchableOpacity>
      </View>

      {/* End Date */}
      <View style={styles.section}>
        <View style={styles.ongoingRow}>
          <Text style={styles.sectionTitle}>Ongoing medicine</Text>
          <Switch
            value={isOngoing}
            onValueChange={setIsOngoing}
            trackColor={{ false: Colors.gray[300], true: Colors.primary[600] }}
            thumbColor="#fff"
          />
        </View>
        {!isOngoing && (
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={[styles.dateButtonText, !endDate && styles.dateButtonPlaceholder]}>
              {endDate ? formatDate(endDate) : 'Select end date'}
            </Text>
            <Text style={styles.dateIcon}>📅</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <TextInput
          style={[styles.textInput, styles.notesInput]}
          placeholder="Any special instructions..."
          placeholderTextColor={Colors.gray[400]}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Add Medicine</Text>
        )}
      </TouchableOpacity>

      {/* Cancel Button */}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
        disabled={isLoading}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      {/* Date Pickers */}
      {Platform.OS === 'ios' && (
        <Modal visible={showStartPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={startDate}
                mode="date"
                display="spinner"
                onChange={handleStartDateChange}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          onChange={handleStartDateChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={showEndPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display="spinner"
                minimumDate={startDate}
                onChange={handleEndDateChange}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          minimumDate={startDate}
          onChange={handleEndDateChange}
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 14,
    color: Colors.gray[500],
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 2,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.gray[900],
    backgroundColor: Colors.gray[50],
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scheduleSlot: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    backgroundColor: Colors.gray[50],
  },
  scheduleSlotActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  scheduleIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  scheduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[600],
  },
  scheduleLabelActive: {
    color: Colors.primary[700],
  },
  scheduleTime: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: 4,
  },
  scheduleTimeActive: {
    color: Colors.primary[600],
  },
  scheduleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  scheduleIndicatorActive: {
    backgroundColor: Colors.primary[600],
  },
  scheduleIndicatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  schedulePattern: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    color: Colors.gray[500],
  },
  timingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timingOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    backgroundColor: Colors.gray[50],
  },
  timingOptionActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  timingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[600],
  },
  timingLabelActive: {
    color: Colors.primary[700],
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
  dateButtonPlaceholder: {
    color: Colors.gray[400],
  },
  dateIcon: {
    fontSize: 20,
  },
  ongoingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  saveButton: {
    backgroundColor: Colors.accent[500],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
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
});
