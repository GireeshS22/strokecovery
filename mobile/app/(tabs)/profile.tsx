import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors, HighContrastColors } from '../../constants/colors';
import { removeToken, authApi } from '../../services/api';
import { useAccessibility } from '../../contexts/AccessibilityContext';

export default function ProfileScreen() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('patient');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const { highContrast, fontScale } = useAccessibility();
  const colors = highContrast ? HighContrastColors : Colors;

  const loadUserData = async () => {
    try {
      const userData = await authApi.me();
      setUserName(userData.name);
      setUserRole(userData.role);
      setUserEmail(userData.email);
    } catch (error) {
      console.log('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reload data when screen comes into focus (e.g., after editing profile)
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await removeToken();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Profile Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.gray[200] }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary[100] }]}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary[600]} />
          ) : (
            <Text style={styles.avatarText}>
              {userName ? userName.charAt(0).toUpperCase() : '👤'}
            </Text>
          )}
        </View>
        <Text style={[styles.name, { color: colors.gray[900], fontSize: 20 * fontScale }]}>
          {isLoading ? 'Loading...' : (userName || 'Stroke Survivor')}
        </Text>
        <Text style={[styles.role, { color: colors.gray[500], fontSize: 14 * fontScale }]}>
          {userRole === 'caregiver' ? 'Caregiver' : 'Patient'}
        </Text>
        {userEmail && !isLoading && (
          <Text style={[styles.email, { color: colors.gray[400], fontSize: 13 * fontScale }]}>{userEmail}</Text>
        )}
      </View>

      {/* Menu Items */}
      <View style={[styles.menu, { backgroundColor: colors.background, borderColor: colors.gray[200] }]}>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.gray[100] }]}
          onPress={() => router.push('/edit-profile')}
        >
          <Text style={styles.menuIcon}>📝</Text>
          <Text style={[styles.menuLabel, { color: colors.gray[800], fontSize: 16 * fontScale }]}>Edit Profile</Text>
          <Text style={[styles.menuArrow, { color: colors.gray[400] }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.gray[100] }]}>
          <Text style={styles.menuIcon}>🔔</Text>
          <Text style={[styles.menuLabel, { color: colors.gray[800], fontSize: 16 * fontScale }]}>Notifications</Text>
          <Text style={[styles.menuArrow, { color: colors.gray[400] }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.gray[100] }]}
          onPress={() => router.push('/accessibility-settings')}
        >
          <Text style={styles.menuIcon}>🎨</Text>
          <Text style={[styles.menuLabel, { color: colors.gray[800], fontSize: 16 * fontScale }]}>Accessibility</Text>
          <Text style={[styles.menuArrow, { color: colors.gray[400] }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.gray[100] }]}>
          <Text style={styles.menuIcon}>❓</Text>
          <Text style={[styles.menuLabel, { color: colors.gray[800], fontSize: 16 * fontScale }]}>Help & Support</Text>
          <Text style={[styles.menuArrow, { color: colors.gray[400] }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.gray[100] }]}>
          <Text style={styles.menuIcon}>ℹ️</Text>
          <Text style={[styles.menuLabel, { color: colors.gray[800], fontSize: 16 * fontScale }]}>About</Text>
          <Text style={[styles.menuArrow, { color: colors.gray[400] }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.error }]} onPress={handleLogout}>
        <Text style={[styles.logoutText, { fontSize: 16 * fontScale }]}>Logout</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={[styles.version, { color: colors.gray[400], fontSize: 12 * fontScale }]}>Version 1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 40,
  },
  name: {
    fontWeight: '600',
  },
  role: {
    marginTop: 4,
  },
  email: {
    marginTop: 4,
  },
  menu: {
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
  },
  menuArrow: {
    fontSize: 20,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    marginTop: 16,
  },
});
