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
  TextInput,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/colors';
import { ailmentApi, AilmentEntry } from '../services/api';

// Symptom options
const SYMPTOM_OPTIONS = [
  { id: 'pain', icon: '🔴', label: 'Pain' },
  { id: 'fatigue', icon: '😴', label: 'Fatigue' },
  { id: 'dizziness', icon: '💫', label: 'Dizziness' },
  { id: 'numbness', icon: '🫳', label: 'Numbness' },
  { id: 'headache', icon: '🤕', label: 'Headache' },
  { id: 'weakness', icon: '💪', label: 'Weakness' },
  { id: 'spasticity', icon: '🦿', label: 'Spasticity' },
  { id: 'other', icon: '❓', label: 'Other' },
];

// Body location options
const BODY_LOCATIONS = [
  'Head',
  'Neck',
  'Shoulder',
  'Arm',
  'Hand',
  'Back',
  'Hip',
  'Leg',
  'Foot',
  'Full Body',
];

export default function EditAilmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [entryDate, setEntryDate] = useState(new Date());
  const [symptom, setSymptom] = useState('pain');
  const [bodyLocation, setBodyLocation] = useState<string | null>(null);
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (id) loadEntry();
  }, [id]);

  const loadEntry = async () => {
    try {
      const entry = await ailmentApi.get(id!);
      setEntryDate(new Date(entry.entry_date));
      setSymptom(entry.symptom);
      setBodyLocation(entry.body_location);
      setSeverity(entry.severity);
      setNotes(entry.notes || '');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load ailment entry');
      router.back();
    } finally {
      setIsFetching(false);
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

  const getSeverityLabel = (value: number) => {
    if (value <= 3) return 'Mild';
    if (value <= 6) return 'Moderate';
    return 'Severe';
  };

  const getSeverityColor = (value: number) => {
    if (value <= 3) return '#10B981';
    if (value <= 6) return '#F59E0B';
    return '#EF4444';
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await ailmentApi.update(id!, {
        entry_date: entryDate.toISOString().split('T')[0],
        symptom,
        body_location: bodyLocation || undefined,
        severity,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Ailment updated!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update ailment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Ailment Entry',
      'Are you sure you want to delete this ailment entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await ailmentApi.delete(id!);
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  if (isFetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
        <Text style={styles.loadingText}>Loading...</Text>
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
        <Text style={styles.title}>Edit Ailment</Text>
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

      {/* Symptom Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Symptom</Text>
        <View style={styles.symptomGrid}>
          {SYMPTOM_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.symptomCard,
                symptom === option.id && styles.symptomCardActive,
              ]}
              onPress={() => setSymptom(option.id)}
            >
              <Text style={styles.symptomIcon}>{option.icon}</Text>
              <Text
                style={[
                  styles.symptomLabel,
                  symptom === option.id && styles.symptomLabelActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Body Location */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Body Location (optional)</Text>
          {bodyLocation && (
            <TouchableOpacity onPress={() => setBodyLocation(null)}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowLocationPicker(true)}
        >
          <Text style={[styles.dateButtonText, !bodyLocation && styles.placeholderText]}>
            {bodyLocation || 'Select location'}
          </Text>
          <Text style={styles.dateIcon}>📍</Text>
        </TouchableOpacity>
      </View>

      {/* Severity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Severity: {severity}/10 ({getSeverityLabel(severity)})
        </Text>
        <View style={styles.severityRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.severityDot,
                severity >= value && { backgroundColor: getSeverityColor(value) },
                severity === value && styles.severityDotActive,
              ]}
              onPress={() => setSeverity(value)}
            >
              <Text style={[styles.severityNumber, severity >= value && styles.severityNumberActive]}>
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.severityLabels}>
          <Text style={styles.severityLabelText}>Mild</Text>
          <Text style={styles.severityLabelText}>Moderate</Text>
          <Text style={styles.severityLabelText}>Severe</Text>
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <TextInput
          style={[styles.textInput, styles.notesInput]}
          placeholder="Describe the symptom, what triggered it, etc."
          placeholderTextColor={Colors.gray[400]}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: getSeverityColor(severity) }]}
        onPress={handleSave}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      {/* Delete Button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        disabled={isLoading}
      >
        <Text style={styles.deleteButtonText}>Delete Entry</Text>
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

      {/* Location Picker */}
      <Modal visible={showLocationPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Body Location</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.locationList}>
              {BODY_LOCATIONS.map((location) => (
                <TouchableOpacity
                  key={location}
                  style={[
                    styles.locationItem,
                    bodyLocation === location && styles.locationItemActive,
                  ]}
                  onPress={() => {
                    setBodyLocation(location);
                    setShowLocationPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.locationItemText,
                      bodyLocation === location && styles.locationItemTextActive,
                    ]}
                  >
                    {location}
                  </Text>
                  {bodyLocation === location && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    marginBottom: 12,
  },
  clearButton: {
    fontSize: 14,
    color: Colors.primary[600],
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
  placeholderText: {
    color: Colors.gray[400],
  },
  dateIcon: {
    fontSize: 20,
  },
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  symptomCard: {
    width: '23%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    backgroundColor: Colors.gray[50],
  },
  symptomCardActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  symptomIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  symptomLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.gray[600],
    textAlign: 'center',
  },
  symptomLabelActive: {
    color: Colors.primary[700],
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  severityDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[200],
  },
  severityDotActive: {
    transform: [{ scale: 1.2 }],
  },
  severityNumber: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.gray[600],
  },
  severityNumberActive: {
    color: '#fff',
  },
  severityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  severityLabelText: {
    fontSize: 12,
    color: Colors.gray[500],
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
    height: 100,
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
  deleteButton: {
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
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
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
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
  locationList: {
    padding: 16,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: Colors.gray[50],
  },
  locationItemActive: {
    backgroundColor: Colors.primary[50],
  },
  locationItemText: {
    fontSize: 16,
    color: Colors.gray[700],
  },
  locationItemTextActive: {
    color: Colors.primary[700],
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: Colors.primary[600],
  },
});
