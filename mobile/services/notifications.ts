import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Medicine } from './api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Default reminder times
const REMINDER_TIMES = {
  morning: { hour: 8, minute: 0 },
  afternoon: { hour: 14, minute: 0 },
  night: { hour: 20, minute: 0 },
};

const TIMING_MESSAGES: Record<string, string> = {
  before_food: 'Take before food',
  after_food: 'Take after food',
  with_food: 'Take with food',
  any_time: '',
};

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permissions not granted');
    return false;
  }

  // Required for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medicine-reminders', {
      name: 'Medicine Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D9488',
      sound: 'default',
    });
  }

  return true;
}

/**
 * Schedule notifications for a medicine
 */
export async function scheduleMedicineNotifications(medicine: Medicine): Promise<string[]> {
  const notificationIds: string[] = [];

  // Cancel existing notifications for this medicine first
  await cancelMedicineNotifications(medicine.id);

  // Check if medicine is active and within date range
  const today = new Date();
  const startDate = new Date(medicine.start_date);
  const endDate = medicine.end_date ? new Date(medicine.end_date) : null;

  if (!medicine.is_active) return notificationIds;
  if (startDate > today) return notificationIds; // Hasn't started yet
  if (endDate && endDate < today) return notificationIds; // Already ended

  const timingMessage = TIMING_MESSAGES[medicine.timing];
  const bodyExtra = timingMessage ? ` - ${timingMessage}` : '';

  // Schedule for each active time slot
  const timeSlots: Array<{ key: 'morning' | 'afternoon' | 'night'; enabled: boolean }> = [
    { key: 'morning', enabled: medicine.morning },
    { key: 'afternoon', enabled: medicine.afternoon },
    { key: 'night', enabled: medicine.night },
  ];

  for (const slot of timeSlots) {
    if (!slot.enabled) continue;

    const time = REMINDER_TIMES[slot.key];

    // Create a trigger for daily notification at this time
    const trigger: Notifications.NotificationTriggerInput = {
      hour: time.hour,
      minute: time.minute,
      repeats: true,
      channelId: Platform.OS === 'android' ? 'medicine-reminders' : undefined,
    };

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `💊 Time for ${medicine.name}`,
          body: `${medicine.dosage || 'Take your medicine'}${bodyExtra}`,
          data: {
            medicineId: medicine.id,
            medicineName: medicine.name,
            timeOfDay: slot.key,
          },
          sound: 'default',
        },
        trigger,
        identifier: `${medicine.id}-${slot.key}`,
      });

      notificationIds.push(id);
      console.log(`Scheduled ${slot.key} notification for ${medicine.name}: ${id}`);
    } catch (error) {
      console.error(`Failed to schedule ${slot.key} notification:`, error);
    }
  }

  return notificationIds;
}

/**
 * Cancel all notifications for a medicine
 */
export async function cancelMedicineNotifications(medicineId: string): Promise<void> {
  const timeSlots = ['morning', 'afternoon', 'night'];

  for (const slot of timeSlots) {
    const identifier = `${medicineId}-${slot}`;
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log(`Cancelled notification: ${identifier}`);
    } catch (error) {
      // Notification might not exist, that's okay
    }
  }
}

/**
 * Cancel all medicine notifications
 */
export async function cancelAllMedicineNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('Cancelled all scheduled notifications');
}

/**
 * Get all scheduled notifications (for debugging)
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Add listener for notification responses (when user taps notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add listener for received notifications (when app is in foreground)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}
