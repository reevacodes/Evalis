import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import API from '../src/api/client';

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            const res = await API.get('/notifications/me');
            setNotifications(res.data.notifications || []);
        } catch (error) {
            console.error("Failed to load notifications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    };

    const handleMarkAsRead = async (id: string, is_read: boolean, link?: string) => {
        if (!is_read) {
            try {
                await API.put(`/notifications/${id}/read`);
                setNotifications(prev => prev.map(n => n._id === id ? { ...n, is_read: true } : n));
            } catch (error) {
                console.error("Error marking read", error);
            }
        }
        
        if (link) {
            // Strip the /exam/submissions prefix to just push the ID to the exam scoreboard
            if (link.startsWith('/exam/submissions/')) {
                const parts = link.split('/');
                const examId = parts[3]; // [ "", "exam", "submissions", "ID", "me" ]
                router.push(`/exam/${examId}`);
            }
        }
    };

    const markAllRead = async () => {
        try {
            await API.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            Alert.alert("Success", "All notifications cleared.");
        } catch (error) {
            console.error("Error clearing all", error);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen 
                options={{ 
                    title: 'Notifications',
                    headerRight: () => notifications.some(n => !n.is_read) ? (
                        <TouchableOpacity onPress={markAllRead} style={{ marginRight: 10 }}>
                            <Text style={styles.markAllText}>Mark all</Text>
                        </TouchableOpacity>
                    ) : null,
                    headerStyle: { backgroundColor: '#020617' },
                    headerTintColor: '#fff',
                }} 
            />

            <ScrollView
                style={styles.list}
                contentContainerStyle={{ padding: 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
            >
                {notifications.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="notifications-off-outline" size={60} color="#334155" />
                        <Text style={styles.emptyText}>You're all caught up!</Text>
                        <Text style={styles.emptySub}>No new alerts from your instructors.</Text>
                    </View>
                ) : (
                    notifications.map(notif => (
                        <TouchableOpacity
                            key={notif._id}
                            style={[styles.card, !notif.is_read && styles.cardUnread]}
                            onPress={() => handleMarkAsRead(notif._id, notif.is_read, notif.link)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.iconBox}>
                                <Ionicons 
                                    name={notif.type === 'exam' ? 'school' : 'alert-circle'} 
                                    size={24} 
                                    color={!notif.is_read ? '#6366f1' : '#64748b'} 
                                />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={[styles.title, !notif.is_read && styles.titleUnread]}>{notif.title}</Text>
                                <Text style={styles.message}>{notif.message}</Text>
                                <Text style={styles.time}>{new Date(notif.created_at).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                            </View>
                            {!notif.is_read && <View style={styles.unreadDot} />}
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    markAllText: { color: '#6366f1', fontSize: 14, fontWeight: 'bold' },
    list: { flex: 1 },
    emptyBox: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 16 },
    emptySub: { color: '#64748b', fontSize: 14, marginTop: 8 },
    card: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1e293b', alignItems: 'flex-start' },
    cardUnread: { backgroundColor: '#1e1b4b', borderColor: '#4338ca' },
    iconBox: { marginRight: 16, marginTop: 4 },
    textContainer: { flex: 1 },
    title: { color: '#cbd5e1', fontSize: 16, fontWeight: '600', marginBottom: 4 },
    titleUnread: { color: 'white', fontWeight: 'bold' },
    message: { color: '#94a3b8', fontSize: 14, lineHeight: 20 },
    time: { color: '#475569', fontSize: 12, marginTop: 8 },
    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', marginLeft: 8, marginTop: 8 }
});
