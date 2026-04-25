import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export interface PushNotificationState {
  expoPushToken?: Notifications.ExpoPushToken;
  notification?: Notifications.Notification;
  error?: string;
}

export const usePushNotifications = (): PushNotificationState => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
    }),
  });

  const [expoPushToken, setExpoPushToken] = useState<Notifications.ExpoPushToken | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const [error, setError] = useState<string | undefined>();

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366f1',
      });
    }

    if (Device.isDevice) {
      if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
        const errorMsg = 'Push notifications do not work in Expo Go on Android SDK 53+. Please use a development build.';
        setError(errorMsg);
        console.warn(errorMsg);
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        const errorMsg = 'Failed to get push token for push notification! User denied permissions.';
        setError(errorMsg);
        console.warn(errorMsg);
        return;
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      
      if (!projectId) {
        const errorMsg = 'Project ID not found. Ensure eas.projectId is set in app.json.';
        setError(errorMsg);
        console.warn(errorMsg);
        return;
      }

      try {
        token = await Notifications.getExpoPushTokenAsync({ projectId });
      } catch (e: any) {
        const errorMsg = e.message || String(e);
        setError(errorMsg);
        console.warn('Failed to get Expo Push Token: ', errorMsg);
      }
    } else {
      const errorMsg = 'Must use physical device for Push Notifications';
      setError(errorMsg);
      console.warn(errorMsg);
    }

    return token;
  }

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) setExpoPushToken(token);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('User interacted with notification:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
    error
  };
};
