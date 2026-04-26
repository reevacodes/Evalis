import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../src/api/client';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStyles } from '../../src/hooks/useThemeStyles';

export default function DashboardScreen() {
    const [user, setUser] = useState<any>(null);
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [practiceHistory, setPracticeHistory] = useState<any[]>([]);
    const [globalStats, setGlobalStats] = useState({ active: 0, upcoming: 0, mocks: 0, accuracy: "0" });
    const router = useRouter();
    const { styles, theme } = useThemeStyles(createStyles);

    // Reschedule Modal State
    const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
    const [activeRescheduleId, setActiveRescheduleId] = useState<string | null>(null);
    const [rescheduleReason, setRescheduleReason] = useState('');
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [submittingReschedule, setSubmittingReschedule] = useState(false);

    const loadData = async () => {
        try {
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));

            // Fetch Live Student Exams
            const res = await API.get('/exam');
            const rawData = res.data;
            
            // Standardize array shape depending on backend wrapper
            const validExamsArray = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.exams) ? rawData.exams : []);
            
            // Sort exams: Live (1) -> Upcoming (2) -> Completed/Expired (3)
            const sortedExams = [...validExamsArray].sort((a, b) => {
                const rankA = (a.time_status === "active" && !a.has_submitted) ? 1 : (a.time_status === "scheduled" && !a.has_submitted) ? 2 : 3;
                const rankB = (b.time_status === "active" && !b.has_submitted) ? 1 : (b.time_status === "scheduled" && !b.has_submitted) ? 2 : 3;
                return rankA - rankB;
            });

            setExams(sortedExams);

            // Fetch Notifications for Unread Tick
            const notifRes = await API.get('/notifications/me');
            const hits = notifRes.data.notifications || [];
            setUnreadCount(hits.filter((n: any) => !n.is_read).length);

            // Fetch Practice History
            let history = [];
            try {
                const practiceRes = await API.get('/past-papers/practice/history');
                history = practiceRes.data || [];
                setPracticeHistory(history);
            } catch (err) {
                console.log("Practice history fetch error", err);
            }

            const activeCount = sortedExams.filter((e: any) => e.time_status === "active" && !e.has_submitted).length;
            const upcomingCount = sortedExams.filter((e: any) => e.time_status === "scheduled" && !e.has_submitted).length;
            const avgAcc = history.length > 0 
                ? (history.reduce((acc: number, curr: any) => acc + (curr.analytics?.accuracy || 0), 0) / history.length).toFixed(1)
                : "0";

            setGlobalStats({ active: activeCount, upcoming: upcomingCount, mocks: history.length, accuracy: avgAcc });
        } catch (err) {
            console.error("Failed loading dashboard data", err);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('notification_received', () => {
            loadData();
        });
        return () => sub.remove();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleLogout = async () => {
        await AsyncStorage.clear();
        router.replace('/login');
    };

    const submitRescheduleRequest = async () => {
        if (!rescheduleDate || !rescheduleTime || rescheduleReason.length < 10) {
            Alert.alert("Missing Information", "Please fill out a valid future date/time and a reason (> 10 chars).");
            return;
        }

        setSubmittingReschedule(true);
        try {
            const preferred_time = `${rescheduleDate}T${rescheduleTime}:00`;
            await API.post(`/exam/${activeRescheduleId}/reschedule`, { reason: rescheduleReason, preferred_time });
            Alert.alert("Request Sent", "Your instructor will review your reschedule request.");
            setRescheduleModalVisible(false);
            setRescheduleReason('');
            setRescheduleDate('');
            setRescheduleTime('');
            loadData(); 
        } catch (error) {
            console.error("Reschedule Failed", error);
            Alert.alert("Error", "Failed to submit reschedule request.");
        } finally {
            setSubmittingReschedule(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'active': return { bg: theme.successSoft, text: theme.success, border: theme.success };
            case 'scheduled': return { bg: theme.warningSoft, text: theme.warning, border: theme.warning };
            case 'expired': return { bg: theme.primarySoft, text: theme.textSecondary, border: theme.border };
            default: return { bg: theme.cardLight, text: theme.text, border: theme.border };
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.greeting}>Welcome back,</Text>
                    <Text style={styles.name} numberOfLines={1}>{user?.name?.split(' ')[0] || 'Student'} 👋</Text>
                    <Text style={styles.subtext}>Track your performance and upcoming exams.</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.bellBtn}>
                        <Ionicons name="notifications-outline" size={24} color={theme.icon} />
                        {unreadCount > 0 && <View style={styles.unreadBadge} />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView 
                style={styles.scrollArea}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            >
                {/* 📊 FLOATING STATS ROW */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={styles.statTop}>
                            <Text style={styles.statLabel}>ACTIVE</Text>
                            <Ionicons name="radio-button-on" size={14} color={theme.success} style={styles.statIcon} />
                        </View>
                        <Text style={styles.statValue}>{globalStats.active}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statTop}>
                            <Text style={styles.statLabel}>UPCOMING</Text>
                            <Ionicons name="calendar-outline" size={14} color={theme.primary} style={styles.statIcon} />
                        </View>
                        <Text style={styles.statValue}>{globalStats.upcoming}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statTop}>
                            <Text style={styles.statLabel}>MOCKS TAKEN</Text>
                            <Ionicons name="book-outline" size={14} color="#a855f7" style={styles.statIcon} />
                        </View>
                        <Text style={styles.statValue}>{globalStats.mocks}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statTop}>
                            <Text style={styles.statLabel}>AVG. ACC</Text>
                            <Ionicons name="trophy-outline" size={14} color={theme.warning} style={styles.statIcon} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                            <Text style={styles.statValue}>{globalStats.accuracy}</Text>
                            <Text style={{ color: theme.textSecondary, fontSize: 16, fontWeight: 'bold' }}>%</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Your Examination Load</Text>

                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }}/>
                ) : exams.length === 0 ? (
                    <Text style={styles.emptyText}>No exams are currently bridged to your profile.</Text>
                ) : (
                    exams.map((exam) => {
                        const isCompleted = exam.time_status === "expired" || exam.has_submitted;
                        const isLive = exam.time_status === "active" && !exam.has_submitted;
                        const isUpcoming = exam.time_status === "scheduled" && !exam.has_submitted;
                        const statusColors = getStatusStyle(exam.time_status);

                        return (
                            <View key={exam._id} style={[styles.examCard, isCompleted && styles.examCardFaded]}>
                                <View style={[styles.topAccent, { backgroundColor: statusColors.border }]} />
                                
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.examName}>{exam.exam_name}</Text>
                                        <Text style={styles.examSubtext}>{exam.subject_code} • Sem {exam.semester}</Text>
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
                                        <Text style={[styles.badgeText, { color: statusColors.text }]}>
                                            {isLive ? 'LIVE' : isUpcoming ? 'UPCOMING' : 'COMPLETED'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.metricsBox}>
                                    <Text style={styles.metricText}>🕒 Date: {exam.start_time ? new Date(exam.start_time).toLocaleDateString() : 'TBD'}</Text>
                                    <Text style={styles.metricText}>⏳ Duration: {exam.duration_minutes} Minutes</Text>
                                </View>

                                <View style={styles.actionRow}>
                                    {isLive && (
                                        <View style={styles.liveNotice}>
                                            <Text style={styles.liveNoticeText}>🔒 Exam Active. Please take this exam on a Desktop browser.</Text>
                                        </View>
                                    )}
                                    
                                    {isUpcoming && exam.reschedule_status !== 'approved' && exam.reschedule_status !== 'pending' && (
                                        <TouchableOpacity 
                                            style={styles.rescheduleBtn}
                                            onPress={() => {
                                                setActiveRescheduleId(exam._id);
                                                setRescheduleModalVisible(true);
                                            }}
                                        >
                                            <Text style={styles.rescheduleBtnText}>Request Reschedule</Text>
                                        </TouchableOpacity>
                                    )}

                                    {exam.reschedule_status === 'pending' && (
                                        <View style={styles.rescheduledBadge}>
                                            <Text style={styles.rescheduledBadgeText}>Reschedule Pending</Text>
                                        </View>
                                    )}

                                    {exam.reschedule_status === 'approved' && (
                                        <View style={[styles.rescheduledBadge, { backgroundColor: theme.successSoft }]}>
                                            <Text style={[styles.rescheduledBadgeText, { color: theme.success }]}>Reschedule Approved</Text>
                                        </View>
                                    )}

                                    {isCompleted && (
                                        <TouchableOpacity 
                                            style={styles.analyticsBtn}
                                            onPress={() => router.push(`/exam/${exam._id}`)}
                                        >
                                            <Text style={styles.analyticsBtnText}>View Analytics</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )
                    })
                )}
            </ScrollView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={rescheduleModalVisible}
                onRequestClose={() => setRescheduleModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Request Reschedule</Text>
                        <Text style={styles.modalSubtitle}>Please provide a valid reason for missing the scheduled examination slot. Your instructor will review this.</Text>
                        
                        <View style={styles.modalGrid}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalLabel}>Preferred Date</Text>
                                <TextInput
                                    style={[styles.modalInput, styles.modalCompactInput]}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={theme.textSecondary}
                                    value={rescheduleDate}
                                    onChangeText={setRescheduleDate}
                                />
                            </View>
                            <View style={{ width: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalLabel}>Preferred Time</Text>
                                <TextInput
                                    style={[styles.modalInput, styles.modalCompactInput]}
                                    placeholder="HH:MM (24h)"
                                    placeholderTextColor={theme.textSecondary}
                                    value={rescheduleTime}
                                    onChangeText={setRescheduleTime}
                                />
                            </View>
                        </View>

                        <Text style={styles.modalLabel}>Reason for Request</Text>
                        <TextInput
                            style={[styles.modalInput, { minHeight: 100 }]}
                            placeholder="E.g., Medical emergency, clash with another exam..."
                            placeholderTextColor={theme.textSecondary}
                            multiline
                            numberOfLines={4}
                            value={rescheduleReason}
                            onChangeText={setRescheduleReason}
                        />

                        <View style={styles.modalActionRow}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRescheduleModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSubmitBtn} onPress={submitRescheduleRequest} disabled={submittingReschedule}>
                                {submittingReschedule ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Submit Request</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: theme.border },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    greeting: { color: theme.textSecondary, fontSize: 16, fontWeight: '500' },
    name: { color: theme.text, fontSize: 24, fontWeight: 'bold', marginTop: 4 },
    subtext: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
    bellBtn: { padding: 8, backgroundColor: theme.cardLight, borderRadius: 20, position: 'relative' },
    unreadBadge: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, backgroundColor: theme.danger, borderRadius: 4, borderWidth: 1, borderColor: theme.cardLight },
    logoutBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.dangerSoft, borderRadius: 20 },
    logoutText: { color: theme.danger, fontWeight: 'bold', fontSize: 12 },
    scrollArea: { flex: 1 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    statCard: { flex: 1, minWidth: '45%', backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
    statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    statLabel: { color: theme.textSecondary, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
    statIcon: { padding: 4, backgroundColor: theme.cardLight, borderRadius: 8, overflow: 'hidden' },
    statValue: { color: theme.text, fontSize: 26, fontWeight: '900' },
    sectionTitle: { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    emptyText: { color: theme.textSecondary, textAlign: 'center', marginTop: 40 },
    examCard: { backgroundColor: theme.card, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    examCardFaded: { opacity: 0.6 },
    topAccent: { height: 4, width: '100%' },
    cardHeader: { flexDirection: 'row', padding: 16, justifyContent: 'space-between' },
    examName: { color: theme.text, fontSize: 18, fontWeight: 'bold' },
    examSubtext: { color: theme.primary, fontSize: 12, marginTop: 4, fontWeight: '600' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    metricsBox: { backgroundColor: theme.background, marginHorizontal: 16, padding: 12, borderRadius: 8, marginBottom: 16 },
    metricText: { color: theme.text, fontSize: 13, marginBottom: 4 },
    actionRow: { padding: 16, paddingTop: 0, gap: 10 },
    liveNotice: { backgroundColor: theme.background, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.success },
    liveNoticeText: { color: theme.success, fontSize: 12, textAlign: 'center', fontWeight: '600' },
    rescheduleBtn: { backgroundColor: theme.warningSoft, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.warning },
    rescheduleBtnText: { color: theme.warning, textAlign: 'center', fontWeight: 'bold' },
    rescheduledBadge: { backgroundColor: theme.cardLight, padding: 12, borderRadius: 8 },
    rescheduledBadgeText: { color: theme.textSecondary, textAlign: 'center', fontWeight: 'bold' },
    analyticsBtn: { backgroundColor: theme.primary, padding: 12, borderRadius: 8 },
    analyticsBtnText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
    modalContainer: { backgroundColor: theme.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.border },
    modalTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    modalSubtitle: { color: theme.textSecondary, fontSize: 13, marginBottom: 20 },
    modalGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    modalLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6 },
    modalInput: { backgroundColor: theme.background, color: theme.text, padding: 14, borderRadius: 12, textAlignVertical: 'top', borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
    modalCompactInput: { minHeight: 50, marginBottom: 0 },
    modalActionRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16, marginTop: 4 },
    modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.cardLight, alignItems: 'center' },
    modalCancelText: { color: theme.text, fontWeight: 'bold' },
    modalSubmitBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center' },
    modalSubmitText: { color: 'white', fontWeight: 'bold' }
});
