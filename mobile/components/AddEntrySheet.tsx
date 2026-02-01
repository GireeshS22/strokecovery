import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';

interface AddEntrySheetProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string; // ISO date string (YYYY-MM-DD)
}

const ENTRY_OPTIONS = [
  {
    id: 'medicine',
    icon: '💊',
    label: 'Log Medicine',
    description: 'Record that you took your medicine',
    route: '/log-medicine',
    color: '#8B5CF6',
  },
  {
    id: 'therapy',
    icon: '🏃',
    label: 'Log Therapy Session',
    description: 'PT, OT, Speech, or Other therapy',
    route: '/add-session',
    color: '#3B82F6',
  },
  {
    id: 'mood',
    icon: '😊',
    label: 'Log Mood',
    description: 'How are you feeling today?',
    route: '/add-mood',
    color: '#10B981',
  },
  {
    id: 'ailment',
    icon: '🩹',
    label: 'Log Ailment',
    description: 'Track symptoms or discomfort',
    route: '/add-ailment',
    color: '#F59E0B',
  },
];

export default function AddEntrySheet({ visible, onClose, selectedDate }: AddEntrySheetProps) {
  const handleSelect = (route: string) => {
    onClose();
    router.push(`${route}?date=${selectedDate}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <Text style={styles.title}>Add Entry</Text>
          <Text style={styles.subtitle}>
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>

          <View style={styles.options}>
            {ENTRY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.option}
                onPress={() => handleSelect(option.route)}
              >
                <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                  <Text style={styles.icon}>{option.icon}</Text>
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.gray[900],
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
    marginBottom: 24,
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  arrow: {
    fontSize: 20,
    color: Colors.gray[400],
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.gray[500],
    fontWeight: '500',
  },
});
