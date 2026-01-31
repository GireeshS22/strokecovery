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
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { Config } from '../constants/config';
import { profileApi, authApi, getToken } from '../services/api';

const STROKE_TYPES = [
  { id: 'ischemic', label: 'Ischemic', desc: 'Blood clot blocked artery' },
  { id: 'hemorrhagic', label: 'Hemorrhagic', desc: 'Bleeding in the brain' },
  { id: 'tbi', label: 'TBI', desc: 'Traumatic brain injury' },
];

const AFFECTED_SIDES = [
  { id: 'left', label: 'Left Side' },
  { id: 'right', label: 'Right Side' },
  { id: 'both', label: 'Both Sides' },
];

const THERAPIES = [
  { id: 'PT', label: 'Physical Therapy (PT)' },
  { id: 'OT', label: 'Occupational Therapy (OT)' },
  { id: 'Speech', label: 'Speech Therapy' },
];

export default function EditProfileScreen() {
  const [name, setName] = useState('');
  const [strokeDate, setStrokeDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [strokeType, setStrokeType] = useState<string | null>(null);
  const [affectedSide, setAffectedSide] = useState<string | null>(null);
  const [therapies, setTherapies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    console.log('=== LOADING PROFILE ===');
    console.log('API URL:', Config.API_URL);

    try {
      // Check if we have a token
      const token = await getToken();
      console.log('Token exists:', !!token);

      if (!token) {
        Alert.alert('Error', 'Not logged in. Please login again.');
        setIsFetching(false);
        return;
      }

      // Fetch user data first
      let userData = null;
      try {
        console.log('Fetching user data...');
        userData = await authApi.me();
        console.log('User data:', JSON.stringify(userData));
        if (userData?.name) {
          setName(userData.name);
        }
      } catch (userError: any) {
        console.log('Failed to fetch user:', userError.message);
        Alert.alert('API Error', 'User: ' + userError.message);
      }

      // Then fetch profile data
      try {
        const profileData = await profileApi.get();
        console.log('Profile data:', profileData);

        if (profileData) {
          if (profileData.stroke_date) {
            setStrokeDate(new Date(profileData.stroke_date));
          }
          if (profileData.stroke_type) {
            setStrokeType(profileData.stroke_type);
          }
          if (profileData.affected_side) {
            setAffectedSide(profileData.affected_side);
          }
          if (profileData.current_therapies) {
            setTherapies(profileData.current_therapies);
          }
        }
      } catch (profileError: any) {
        console.log('Failed to fetch profile:', profileError.message);
        // Profile might not exist yet, that's okay
      }
    } catch (error: any) {
      console.log('Load profile error:', error);
      Alert.alert('Error', error.message || 'Failed to load profile data');
    } finally {
      setIsFetching(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setStrokeDate(selectedDate);
    }
  };

  const toggleTherapy = (id: string) => {
    setTherapies((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      // Update user name
      await authApi.updateMe({ name: name.trim() || undefined });

      // Update profile data
      await profileApi.update({
        stroke_date: strokeDate ? strokeDate.toISOString().split('T')[0] : undefined,
        stroke_type: strokeType || undefined,
        affected_side: affectedSide || undefined,
        current_therapies: therapies.length > 0 ? therapies : undefined,
      });

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
        <Text style={styles.loadingText}>Loading profile...</Text>
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
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      {/* Name Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your name"
          placeholderTextColor={Colors.gray[400]}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      </View>

      {/* Stroke Date */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stroke date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={[styles.dateButtonText, !strokeDate && styles.dateButtonPlaceholder]}>
            {strokeDate ? formatDate(strokeDate) : 'Select date'}
          </Text>
          <Text style={styles.dateIcon}>📅</Text>
        </TouchableOpacity>

        {strokeDate && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setStrokeDate(null)}
          >
            <Text style={styles.clearButtonText}>Clear date</Text>
          </TouchableOpacity>
        )}

        {/* Date Picker Modal for iOS */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
          >
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
                  value={strokeDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Date Picker for Android */}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={strokeDate || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>

      {/* Stroke Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Type of stroke</Text>
        <View style={styles.optionsGrid}>
          {STROKE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.optionCard,
                strokeType === type.id && styles.optionCardActive,
              ]}
              onPress={() => setStrokeType(strokeType === type.id ? null : type.id)}
            >
              <Text
                style={[
                  styles.optionLabel,
                  strokeType === type.id && styles.optionLabelActive,
                ]}
              >
                {type.label}
              </Text>
              <Text style={styles.optionDesc}>{type.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Affected Side */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Affected side</Text>
        <View style={styles.optionsRow}>
          {AFFECTED_SIDES.map((side) => (
            <TouchableOpacity
              key={side.id}
              style={[
                styles.sideButton,
                affectedSide === side.id && styles.sideButtonActive,
              ]}
              onPress={() => setAffectedSide(affectedSide === side.id ? null : side.id)}
            >
              <Text
                style={[
                  styles.sideButtonText,
                  affectedSide === side.id && styles.sideButtonTextActive,
                ]}
              >
                {side.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Current Therapies */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current therapies</Text>
        <View style={styles.therapyList}>
          {THERAPIES.map((therapy) => (
            <TouchableOpacity
              key={therapy.id}
              style={[
                styles.therapyItem,
                therapies.includes(therapy.id) && styles.therapyItemActive,
              ]}
              onPress={() => toggleTherapy(therapy.id)}
            >
              <View
                style={[
                  styles.checkbox,
                  therapies.includes(therapy.id) && styles.checkboxActive,
                ]}
              >
                {therapies.includes(therapy.id) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={styles.therapyLabel}>{therapy.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
          <Text style={styles.saveButtonText}>Save Changes</Text>
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
    marginBottom: 32,
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
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 16,
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
  clearButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    fontSize: 14,
    color: Colors.error,
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
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    backgroundColor: Colors.gray[50],
  },
  optionCardActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 4,
  },
  optionLabelActive: {
    color: Colors.primary[700],
  },
  optionDesc: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sideButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    alignItems: 'center',
  },
  sideButtonActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  sideButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[600],
  },
  sideButtonTextActive: {
    color: Colors.primary[600],
  },
  therapyList: {
    gap: 12,
  },
  therapyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    backgroundColor: Colors.gray[50],
  },
  therapyItemActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.gray[300],
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary[600],
    borderColor: Colors.primary[600],
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  therapyLabel: {
    fontSize: 16,
    color: Colors.gray[700],
  },
  saveButton: {
    backgroundColor: Colors.accent[500],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
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
