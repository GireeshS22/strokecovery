import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: '🏠',
    medicines: '💊',
    calendar: '📅',
    profile: '👤',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {icons[name] || '📱'}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.primary[600],
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.gray[200],
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary[600],
        tabBarInactiveTintColor: Colors.gray[400],
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerTitle: 'Strokecovery',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="medicines"
        options={{
          title: 'Medicines',
          tabBarIcon: ({ focused }) => <TabIcon name="medicines" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
    opacity: 0.5,
  },
  iconFocused: {
    opacity: 1,
  },
});
