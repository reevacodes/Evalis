import { Tabs, useRouter, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, DeviceEventEmitter, View, TouchableOpacity, Modal, Text, Animated, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';
import API from '@/src/api/client';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { expoPushToken, notification } = usePushNotifications();
  const { theme: currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(-width))[0];

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

  const toggleDrawer = () => {
    if (drawerOpen) {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setDrawerOpen(false));
    } else {
      setDrawerOpen(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const navigateTo = (path: string) => {
    toggleDrawer();
    router.push(path as any);
  };

  const menuItems = [
    { label: 'Exams', path: '/', icon: 'clipboard-outline', activeIcon: 'clipboard' },
    { label: 'Practice', path: '/practice', icon: 'library-outline', activeIcon: 'library' },
    { label: 'Analytics', path: '/analytics', icon: 'pie-chart-outline', activeIcon: 'pie-chart' },
    { label: 'Profile', path: '/profile', icon: 'person-outline', activeIcon: 'person' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' }, // Hides the bottom navigation completely
        }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="practice" />
        <Tabs.Screen name="analytics" />
        <Tabs.Screen name="profile" />
      </Tabs>

      {/* Floating Hamburger Button */}
      <TouchableOpacity 
        style={[styles.burgerBtn, { backgroundColor: theme.card }]} 
        onPress={toggleDrawer}
        activeOpacity={0.8}
      >
        <Ionicons name="menu" size={24} color={theme.text} />
      </TouchableOpacity>

      {/* Custom Drawer Overlay */}
      {drawerOpen && (
        <Modal transparent visible={drawerOpen} animationType="none" onRequestClose={toggleDrawer}>
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={toggleDrawer}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
            </Pressable>
            
            <Animated.View style={[styles.drawerContainer, { backgroundColor: theme.background, transform: [{ translateX: slideAnim }] }]}>
              <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.drawerHeader}>
                  <Text style={[styles.drawerLogo, { color: theme.primary }]}>Evalis.</Text>
                  <TouchableOpacity onPress={toggleDrawer} style={{ padding: 8 }}>
                    <Ionicons name="close" size={28} color={theme.text} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.menuContainer}>
                  {menuItems.map((item) => {
                    const isActive = pathname === item.path || (pathname === '/' && item.path === '/');
                    return (
                      <TouchableOpacity 
                        key={item.path} 
                        style={[styles.menuItem, isActive && { backgroundColor: theme.primarySoft }]} 
                        onPress={() => navigateTo(item.path)}
                      >
                        <Ionicons 
                          name={(isActive ? item.activeIcon : item.icon) as any} 
                          size={24} 
                          color={isActive ? theme.primary : theme.textSecondary} 
                        />
                        <Text style={[styles.menuLabel, { color: isActive ? theme.primary : theme.text }]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </SafeAreaView>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  burgerBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 999
  },
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerContainer: {
    width: width * 0.75,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  drawerLogo: {
    fontSize: 28,
    fontWeight: '900',
  },
  menuContainer: {
    paddingTop: 20,
    paddingHorizontal: 15,
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '700',
  }
});
