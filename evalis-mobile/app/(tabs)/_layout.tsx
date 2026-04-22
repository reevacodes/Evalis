import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import API from '@/src/api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        API.put('/notifications/push-token', { token })
          .then(() => console.log('✅ Push Token hooked:', token))
          .catch(err => console.error('⚠️ Failed hooking token:', err));
      }
    });

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      DeviceEventEmitter.emit('notification_received', notification);
    });

    return () => {
      notificationListener.remove();
    };
  }, []);

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
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return;
      }
      // For EAS builds without a projectId injected, we fallback to a dummy or blank.
      try {
        token = (await Notifications.getExpoPushTokenAsync({ projectId: "00000000-0000-0000-0000-000000000000" })).data;
      } catch (error: any) {
        console.warn("Push notifications are not supported in Expo Go on Android SDK 53+ or require a valid Project ID. Skipping token generation.", error?.message || String(error));
      }
    }
    return token;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1', // Indigo Evalis color
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#020617', // slate-950
          borderTopWidth: 1,
          borderTopColor: '#1e293b', // slate-800
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Exams',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="clipboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="library" color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="pie-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}
