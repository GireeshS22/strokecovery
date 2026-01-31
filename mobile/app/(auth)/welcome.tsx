import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { authApi, setToken, profileApi } from '../../services/api';

export default function WelcomeScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const response = await authApi.login(email, password);
        await setToken(response.access_token);

        // Check if onboarding is needed
        const profileStatus = await profileApi.check();
        if (profileStatus.onboarding_completed) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/onboarding');
        }
      } else {
        const response = await authApi.register(email, password, role);
        await setToken(response.access_token);
        router.replace('/onboarding');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>💚</Text>
          </View>
          <Text style={styles.title}>Strokecovery</Text>
          <Text style={styles.subtitle}>Your recovery companion</Text>
        </View>

        {/* Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
            onPress={() => setIsLogin(true)}
          >
            <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
            onPress={() => setIsLogin(false)}
          >
            <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.gray[400]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor={Colors.gray[400]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Feather
                name={showPassword ? 'eye' : 'eye-off'}
                size={20}
                color={Colors.gray[500]}
              />
            </TouchableOpacity>
          </View>

          {/* Role selector - only for sign up */}
          {!isLogin && (
            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>I am a:</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'patient' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('patient')}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      role === 'patient' && styles.roleButtonTextActive,
                    ]}
                  >
                    Patient
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'caregiver' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('caregiver')}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      role === 'caregiver' && styles.roleButtonTextActive,
                    ]}
                  >
                    Caregiver
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isLogin ? 'Sign In' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Built for stroke survivors and their caregivers
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.gray[900],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.gray[500],
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.gray[100],
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary[600],
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[600],
  },
  toggleTextActive: {
    color: '#fff',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.gray[900],
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.gray[900],
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  roleContainer: {
    marginTop: 8,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray[700],
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[600],
  },
  roleButtonTextActive: {
    color: Colors.primary[600],
  },
  submitButton: {
    backgroundColor: Colors.accent[500],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    textAlign: 'center',
    color: Colors.gray[400],
    fontSize: 14,
    paddingTop: 40,
  },
});
