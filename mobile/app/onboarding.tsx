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
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { profileApi } from '../services/api';

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

export default function OnboardingScreen() {
  const [strokeType, setStrokeType] = useState<string | null>(null);
  const [affectedSide, setAffectedSide] = useState<string | null>(null);
  const [therapies, setTherapies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleTherapy = (id: string) => {
    setTherapies((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    setIsLoading(true);

    try {
      await profileApi.onboarding({
        stroke_type: strokeType || undefined,
        affected_side: affectedSide || undefined,
        current_therapies: therapies.length > 0 ? therapies : undefined,
      });

      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Let's set up your profile</Text>
        <Text style={styles.subtitle}>
          This helps us personalize your recovery journey
        </Text>
      </View>

      {/* Stroke Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Type of stroke (optional)</Text>
        <View style={styles.optionsGrid}>
          {STROKE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.optionCard,
                strokeType === type.id && styles.optionCardActive,
              ]}
              onPress={() => setStrokeType(type.id)}
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
        <Text style={styles.sectionTitle}>Affected side (optional)</Text>
        <View style={styles.optionsRow}>
          {AFFECTED_SIDES.map((side) => (
            <TouchableOpacity
              key={side.id}
              style={[
                styles.sideButton,
                affectedSide === side.id && styles.sideButtonActive,
              ]}
              onPress={() => setAffectedSide(side.id)}
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
        <Text style={styles.sectionTitle}>Current therapies (optional)</Text>
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

      {/* Complete Button */}
      <TouchableOpacity
        style={styles.completeButton}
        onPress={handleComplete}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.completeButtonText}>Complete Setup</Text>
        )}
      </TouchableOpacity>

      {/* Skip */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleComplete}
        disabled={isLoading}
      >
        <Text style={styles.skipButtonText}>Skip for now</Text>
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
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.gray[900],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray[500],
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
  completeButton: {
    backgroundColor: Colors.accent[500],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  skipButtonText: {
    color: Colors.gray[500],
    fontSize: 16,
  },
});
