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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { therapyApi } from '../services/api';

// Therapy type options
const THERAPY_TYPES = [
  { id: 'PT', icon: '🏃', label: 'Physical', color: '#3B82F6' },
  { id: 'OT', icon: '✋', label: 'Occupational', color: '#10B981' },
  { id: 'Speech', icon: '🗣️', label: 'Speech', color: '#8B5CF6' },
  { id: 'Other', icon: '⭐', label: 'Other', color: '#F59E0B' },
];

// Duration presets
const DURATION_PRESETS = [30, 45, 60, 90];

// Feeling options
const FEELING_OPTIONS = [
  { rating: 1, emoji: '😫', label: 'Very Tired' },
  { rating: 2, emoji: '😔', label: 'Tired' },
  { rating: 3, emoji: '😐', label: 'Okay' },
  { rating: 4, emoji: '🙂', label: 'Good' },
  { rating: 5, emoji: '😊', label: 'Great' },
];

export default function AddSessionScreen() {
  const [therapyType, setTherapyType] = useState<string>('PT');
  const [sessionDate, setSessionDate] = useState(new Date());
  const [sessionTime, setSessionTime] = useState<Date | null>(null);
  const [includeTime, setIncludeTime] = useState(false);
  const [duration, setDuration] = useState(45);
  const [customDuration, setCustomDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [feelingRating, setFeelingRating] = useState(3);
  const [feelingNotes, setFeelingNotes] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (date: Date) => {
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setSessionDate(selectedDate);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedTime) {
      setSessionTime(selectedTime);
      setIncludeTime(true);
    }
  };

  const getEffectiveDuration = () => {
    if (customDuration && !isNaN(parseInt(customDuration))) {
      return parseInt(customDuration);
    }
    return duration;
  };

  const handleSave = async () => {
    const effectiveDuration = getEffectiveDuration();

    if (effectiveDuration < 1 || effectiveDuration > 480) {
      Alert.alert('Error', 'Duration must be between 1 and 480 minutes');
      return;
    }

    setIsLoading(true);
    try {
      const sessionTimeString = includeTime && sessionTime
        ? `${sessionTime.getHours().toString().padStart(2, '0')}:${sessionTime.getMinutes().toString().padStart(2, '0')}:00`
        : undefined;

      await therapyApi.createSession({
        therapy_type: therapyType,
        session_date: sessionDate.toISOString().split('T')[0],
        session_time: sessionTimeString,
        duration_minutes: effectiveDuration,
        notes: notes.trim() || undefined,
        feeling_rating: feelingRating,
        feeling_notes: feelingNotes.trim() || undefined,
      });

      Alert.alert('Success', 'Session logged!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to log session');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedType = THERAPY_TYPES.find((t) => t.id === therapyType);
  const selectedFeeling = FEELING_OPTIONS.find((f) => f.rating === feelingRating);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Log Session</Text>
      </View>

      {/* Therapy Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Therapy Type</Text>
        <View style={styles.therapyTypeGrid}>
          {THERAPY_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.therapyTypeCard,
                therapyType === type.id && { borderColor: type.color, backgroundColor: type.color + '15' },
              ]}
              onPress={() => setTherapyType(type.id)}
            >
              <Text style={styles.therapyTypeIcon}>{type.icon}</Text>
              <Text
                style={[
                  styles.therapyTypeLabel,
                  therapyType === type.id && { color: type.color },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Date */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>{formatDate(sessionDate)}</Text>
          <Text style={styles.dateIcon}>📅</Text>
        </TouchableOpacity>
      </View>

      {/* Time (Optional) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Time (optional)</Text>
          {includeTime && (
            <TouchableOpacity onPress={() => { setIncludeTime(false); setSessionTime(null); }}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => {
            if (!sessionTime) setSessionTime(new Date());
            setShowTimePicker(true);
          }}
        >
          <Text style={[styles.dateButtonText, !includeTime && styles.dateButtonPlaceholder]}>
            {includeTime && sessionTime ? formatTime(sessionTime) : 'Add time'}
          </Text>
          <Text style={styles.dateIcon}>⏰</Text>
        </TouchableOpacity>
      </View>

      {/* Duration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Duration</Text>
        <View style={styles.durationRow}>
          {DURATION_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.durationPreset,
                duration === preset && !customDuration && styles.durationPresetActive,
              ]}
              onPress={() => { setDuration(preset); setCustomDuration(''); }}
            >
              <Text
                style={[
                  styles.durationPresetText,
                  duration === preset && !customDuration && styles.durationPresetTextActive,
                ]}
              >
                {preset} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.customDurationRow}>
          <Text style={styles.customDurationLabel}>Or custom:</Text>
          <TextInput
            style={styles.customDurationInput}
            placeholder="e.g. 75"
            placeholderTextColor={Colors.gray[400]}
            keyboardType="number-pad"
            value={customDuration}
            onChangeText={setCustomDuration}
          />
          <Text style={styles.customDurationUnit}>min</Text>
        </View>
      </View>

      {/* How did you feel after? */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How did you feel after?</Text>
        <View style={styles.feelingRow}>
          {FEELING_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.rating}
              style={[
                styles.feelingOption,
                feelingRating === option.rating && styles.feelingOptionActive,
              ]}
              onPress={() => setFeelingRating(option.rating)}
            >
              <Text style={styles.feelingEmoji}>{option.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.feelingLabel}>
          {selectedFeeling?.emoji} {selectedFeeling?.label}
        </Text>

        <TextInput
          style={[styles.textInput, styles.feelingNotesInput]}
          placeholder="Add a note about how you felt (optional)"
          placeholderTextColor={Colors.gray[400]}
          value={feelingNotes}
          onChangeText={setFeelingNotes}
          multiline
        />
      </View>

      {/* Session Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Notes (optional)</Text>
        <TextInput
          style={[styles.textInput, styles.notesInput]}
          placeholder="What did you work on? Any progress?"
          placeholderTextColor={Colors.gray[400]}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: selectedType?.color || Colors.accent[500] }]}
        onPress={handleSave}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Log Session</Text>
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
                value={sessionDate}
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
          value={sessionDate}
          mode="date"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      {/* Time Picker */}
      {Platform.OS === 'ios' && (
        <Modal visible={showTimePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={sessionTime || new Date()}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={sessionTime || new Date()}
          mode="time"
          onChange={handleTimeChange}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 8,
  },
  clearButton: {
    fontSize: 14,
    color: Colors.primary[600],
  },
  therapyTypeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  therapyTypeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    backgroundColor: Colors.gray[50],
  },
  therapyTypeIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  therapyTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray[600],
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
  durationRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  durationPreset: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    backgroundColor: Colors.gray[50],
  },
  durationPresetActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  durationPresetText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[600],
  },
  durationPresetTextActive: {
    color: Colors.primary[700],
  },
  customDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customDurationLabel: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  customDurationInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.gray[900],
    backgroundColor: Colors.gray[50],
  },
  customDurationUnit: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  feelingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feelingOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gray[200],
    backgroundColor: Colors.gray[50],
  },
  feelingOptionActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  feelingEmoji: {
    fontSize: 28,
  },
  feelingLabel: {
    textAlign: 'center',
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 12,
  },
  feelingNotesInput: {
    height: 60,
    textAlignVertical: 'top',
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
  saveButton: {
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
