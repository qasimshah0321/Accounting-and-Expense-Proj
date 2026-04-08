import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { pushAPI } from '../services/api';

// Configure how foreground notifications are presented
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registers for Expo push notifications and sends the token to the backend.
 * Call this after login. Handles permission request, token retrieval, and
 * foreground/background notification listeners.
 *
 * @param {boolean} isAuthenticated - whether user is logged in
 * @param {string|null} userRole - current user's role
 * @param {string|null} linkedCustomerId - if user is a customer, their customer_id
 * @param {function} onNotificationReceived - callback when notification arrives in foreground
 */
const useExpoPush = (isAuthenticated, userRole, linkedCustomerId, onNotificationReceived) => {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;

    const registerForPush = async () => {
      // Only physical devices support push notifications
      if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return;
      }

      try {
        // Check existing permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('Push notification permission not granted');
          return;
        }

        // Get Expo push token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        const token = tokenData.data;

        if (isMounted) {
          setExpoPushToken(token);
        }

        // Register token with backend
        try {
          await pushAPI.registerExpoToken({
            expo_push_token: token,
            user_role: userRole || 'admin',
            linked_customer_id: linkedCustomerId || null,
          });
        } catch (err) {
          console.log('Failed to register Expo token with backend:', err.message);
        }

        // Android-specific notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1a237e',
          });
        }
      } catch (err) {
        console.log('Push registration error:', err.message);
      }
    };

    registerForPush();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Listen for user tapping on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      // Future: navigate based on data.type, data.document_id, etc.
      console.log('Notification tapped:', data);
    });

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated, userRole, linkedCustomerId, onNotificationReceived]);

  return { expoPushToken };
};

export default useExpoPush;
