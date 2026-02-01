import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors, HighContrastColors } from '../constants/colors';
import { useAccessibility } from '../contexts/AccessibilityContext';

export default function AccessibilitySettingsScreen() {
  const { largeText, highContrast, fontScale, toggleLargeText, toggleHighContrast } = useAccessibility();

  // Use appropriate colors based on high contrast setting
  const colors = highContrast ? HighContrastColors : Colors;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.surface }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.primary[600] }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.gray[900], fontSize: 28 * fontScale }]}>
          Accessibility
        </Text>
        <Text style={[styles.subtitle, { color: colors.gray[500], fontSize: 16 * fontScale }]}>
          Customize your experience
        </Text>
      </View>

      {/* Settings */}
      <View style={[styles.settingsCard, { backgroundColor: colors.background }]}>
        {/* Large Text */}
        <View style={[styles.settingRow, { borderBottomColor: colors.gray[100] }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingIcon]}>🔤</Text>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.gray[900], fontSize: 16 * fontScale }]}>
                Large Text
              </Text>
              <Text style={[styles.settingDescription, { color: colors.gray[500], fontSize: 13 * fontScale }]}>
                Increase text size throughout the app
              </Text>
            </View>
          </View>
          <Switch
            value={largeText}
            onValueChange={toggleLargeText}
            trackColor={{ false: colors.gray[300], true: colors.primary[400] }}
            thumbColor={largeText ? colors.primary[600] : colors.gray[100]}
          />
        </View>

        {/* High Contrast */}
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingIcon]}>🎨</Text>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.gray[900], fontSize: 16 * fontScale }]}>
                High Contrast
              </Text>
              <Text style={[styles.settingDescription, { color: colors.gray[500], fontSize: 13 * fontScale }]}>
                Use bolder colors for better visibility
              </Text>
            </View>
          </View>
          <Switch
            value={highContrast}
            onValueChange={toggleHighContrast}
            trackColor={{ false: colors.gray[300], true: colors.primary[400] }}
            thumbColor={highContrast ? colors.primary[600] : colors.gray[100]}
          />
        </View>
      </View>

      {/* Preview Section */}
      <Text style={[styles.sectionTitle, { color: colors.gray[700], fontSize: 14 * fontScale }]}>
        PREVIEW
      </Text>
      <View style={[styles.previewCard, { backgroundColor: colors.background }]}>
        <Text style={[styles.previewTitle, { color: colors.gray[900], fontSize: 18 * fontScale }]}>
          Sample Text
        </Text>
        <Text style={[styles.previewBody, { color: colors.gray[600], fontSize: 15 * fontScale }]}>
          This is how text will appear throughout the app with your current settings.
        </Text>
        <View style={styles.previewButtons}>
          <View style={[styles.previewButton, { backgroundColor: colors.primary[600] }]}>
            <Text style={[styles.previewButtonText, { fontSize: 14 * fontScale }]}>Primary Button</Text>
          </View>
          <View style={[styles.previewButtonOutline, { borderColor: colors.primary[600] }]}>
            <Text style={[styles.previewButtonOutlineText, { color: colors.primary[600], fontSize: 14 * fontScale }]}>
              Outline
            </Text>
          </View>
        </View>
      </View>

      {/* Tips */}
      <View style={[styles.tipCard, { backgroundColor: colors.primary[50] }]}>
        <Text style={[styles.tipTitle, { color: colors.primary[800], fontSize: 14 * fontScale }]}>
          Tip
        </Text>
        <Text style={[styles.tipText, { color: colors.primary[700], fontSize: 14 * fontScale }]}>
          You can also adjust text size in your device's system settings for even larger text.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {},
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {},
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  previewCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  previewTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  previewBody: {
    lineHeight: 22,
    marginBottom: 16,
  },
  previewButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  previewButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  previewButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  previewButtonOutline: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
  },
  previewButtonOutlineText: {
    fontWeight: '600',
  },
  tipCard: {
    borderRadius: 12,
    padding: 16,
  },
  tipTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  tipText: {
    lineHeight: 20,
  },
});
