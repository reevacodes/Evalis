import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const loadUser = async () => {
            const stored = await AsyncStorage.getItem('user');
            if (stored) setUser(JSON.parse(stored));
        };
        loadUser();
    }, []);

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
                <TouchableOpacity style={styles.optionBtn}>
                    <Ionicons name="notifications-outline" size={24} color="#cbd5e1" style={styles.optionIcon} />
                    <Text style={styles.optionText}>Notifications Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionBtn}>
                    <Ionicons name="shield-checkmark-outline" size={24} color="#cbd5e1" style={styles.optionIcon} />
                    <Text style={styles.optionText}>Privacy & Security</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionBtn}>
                    <Ionicons name="globe-outline" size={24} color="#cbd5e1" style={styles.optionIcon} />
                    <Text style={styles.optionText}>Language Region</Text>
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', padding: 24, paddingTop: 60 },
    header: { marginBottom: 30 },
    headerTitle: { color: 'white', fontSize: 28, fontWeight: 'bold' },
    card: { backgroundColor: '#0f172a', borderRadius: 20, padding: 30, alignItems: 'center', borderColor: '#1e293b', borderWidth: 1 },
    avatarBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#312e81', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#6366f1' },
    avatarInitials: { color: 'white', fontSize: 28, fontWeight: 'bold', letterSpacing: 2 },
    name: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
    email: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
    badge: { backgroundColor: '#22c55e20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#22c55e40' },
    badgeText: { color: '#22c55e', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    optionsGroup: { marginTop: 30, backgroundColor: '#0f172a', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#1e293b' },
    optionBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    optionIcon: { fontSize: 20, marginRight: 16 },
    optionText: { color: '#cbd5e1', fontSize: 16, fontWeight: '600' },
    logoutBtn: { backgroundColor: '#ef444420', padding: 20, borderRadius: 16, marginTop: 'auto', alignItems: 'center', borderWidth: 1, borderColor: '#ef444450' },
    logoutBtnText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
    footer: { alignItems: 'center', marginTop: 24 },
    footerText: { color: '#475569', fontSize: 12 }
});
