import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';
import API from '@/src/api/client';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/Colors';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { expoPushToken, notification } = usePushNotifications();
  const { theme: currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    if (expoPushToken?.data) {
      API.put('/notifications/push-token', { token: expoPushToken.data })
        .then(() => console.log('✅ Push Token hooked:', expoPushToken.data))
        .catch(err => console.error('⚠️ Failed hooking token:', err));
    }
  }, [expoPushToken]);

  useEffect(() => {
    if (notification) {
      DeviceEventEmitter.emit('notification_received', notification);
    }
  }, [notification]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 1,
          borderTopColor: theme.border,
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
