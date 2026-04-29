import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStyles } from '../../src/hooks/useThemeStyles';
import { useTheme } from '../../src/context/ThemeContext';

export default function ProfileScreen() {
    const [user, setUser] = useState<any>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const router = useRouter();
    const { styles, isDark, theme: colors } = useThemeStyles(createStyles);
    const { theme, setThemeSetting } = useTheme();

    useEffect(() => {
        const loadSettings = async () => {
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));
            
            const storedNotifs = await AsyncStorage.getItem('notificationsEnabled');
            if (storedNotifs !== null) {
                setNotificationsEnabled(storedNotifs === 'true');
            }
        };
        loadSettings();
    }, []);

    const toggleNotifications = async (val: boolean) => {
        setNotificationsEnabled(val);
        await AsyncStorage.setItem('notificationsEnabled', String(val));
    };

    const handlePrivacy = () => {
        Alert.alert(
            "Privacy & Security",
            "Evalis adheres to strict data protection standards. Your performance analytics, exam attempts, and personal identifiers are end-to-end encrypted and never shared with third parties without institutional consent.\n\nFor more details, please review the institutional privacy policy.",
            [{ text: "OK", style: "default" }]
        );
    };

    const handleLogout = async () => {
        Alert.alert(
            "Account Checkout",
            "Are you sure you want to log out of the Evalis Workspace?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Log Out", 
                    style: "destructive",
                    onPress: async () => {
                        await AsyncStorage.clear();
                        router.replace('/login');
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Student Profile</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.avatarBox}>
                    <Text style={styles.avatarInitials}>
                        {user?.name ? user.name.substring(0,2).toUpperCase() : 'ST'}
                    </Text>
                </View>

                <Text style={styles.name}>{user?.name || 'Loading...'}</Text>
                <Text style={styles.email}>{user?.email || 'Unknown User'}</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{user?.role?.toUpperCase() || 'STUDENT'}</Text>
                </View>
            </View>

            <View style={styles.optionsGroup}>
                <View style={[styles.optionBtn, { justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={24} color={colors.textSecondary} style={styles.optionIcon} />
                        <Text style={styles.optionText}>Dark Mode</Text>
                    </View>
                    <Switch 
                        value={isDark} 
                        onValueChange={(val) => setThemeSetting(val ? 'dark' : 'light')} 
                        trackColor={{ false: '#cbd5e1', true: colors.primary }}
                    />
                </View>
                <View style={[styles.optionBtn, { justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} style={styles.optionIcon} />
                        <Text style={styles.optionText}>Notifications</Text>
                    </View>
                    <Switch 
                        value={notificationsEnabled} 
                        onValueChange={toggleNotifications} 
                        trackColor={{ false: '#cbd5e1', true: colors.primary }}
                    />
                </View>
                <TouchableOpacity style={styles.optionBtn} onPress={handlePrivacy}>
                    <Ionicons name="shield-checkmark-outline" size={24} color={colors.textSecondary} style={styles.optionIcon} />
                    <Text style={styles.optionText}>Privacy & Security</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutBtnText}>Sign Out of Evalis</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Evalis Mobile Environment v1.0.0</Text>
            </View>
        </View>
    );
}

const createStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background, padding: 24, paddingTop: 60 },
    header: { marginBottom: 30 },
    headerTitle: { color: theme.text, fontSize: 28, fontWeight: 'bold' },
    card: { backgroundColor: theme.card, borderRadius: 20, padding: 30, alignItems: 'center', borderColor: theme.border, borderWidth: 1 },
    avatarBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primarySoft, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: theme.primary },
    avatarInitials: { color: theme.primary, fontSize: 28, fontWeight: 'bold', letterSpacing: 2 },
    name: { color: theme.text, fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
    email: { color: theme.textSecondary, fontSize: 14, marginBottom: 16 },
    badge: { backgroundColor: theme.successSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: theme.success },
    badgeText: { color: theme.success, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    optionsGroup: { marginTop: 30, backgroundColor: theme.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
    optionBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
    optionIcon: { fontSize: 20, marginRight: 16 },
    optionText: { color: theme.textSecondary, fontSize: 16, fontWeight: '600' },
    logoutBtn: { backgroundColor: theme.dangerSoft, padding: 20, borderRadius: 16, marginTop: 'auto', alignItems: 'center', borderWidth: 1, borderColor: theme.danger },
    logoutBtnText: { color: theme.danger, fontSize: 16, fontWeight: 'bold' },
    footer: { alignItems: 'center', marginTop: 24 },
    footerText: { color: theme.textSecondary, fontSize: 12 }
});
