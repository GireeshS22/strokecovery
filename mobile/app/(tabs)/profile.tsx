import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { removeToken } from '../../services/api';

export default function ProfileScreen() {
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
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.name}>Stroke Survivor</Text>
        <Text style={styles.role}>Patient</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>📝</Text>
          <Text style={styles.menuLabel}>Edit Profile</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>🔔</Text>
          <Text style={styles.menuLabel}>Notifications</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>🎨</Text>
          <Text style={styles.menuLabel}>Accessibility</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>❓</Text>
          <Text style={styles.menuLabel}>Help & Support</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>ℹ️</Text>
          <Text style={styles.menuLabel}>About</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>Version 1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 40,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  role: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 4,
  },
  menu: {
    backgroundColor: Colors.background,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.gray[200],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: Colors.gray[800],
  },
  menuArrow: {
    fontSize: 20,
    color: Colors.gray[400],
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: Colors.gray[400],
    fontSize: 12,
    marginTop: 16,
  },
});
