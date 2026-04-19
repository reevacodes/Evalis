import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../src/api/client';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
    const [user, setUser] = useState<any>(null);
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

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
            setExams(validExamsArray);
        } catch (err) {
            console.error("Failed loading dashboard data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
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
            const preferred_time = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
            await API.post(`/exam/${activeRescheduleId}/reschedule`, { reason: rescheduleReason, preferred_time });
            Alert.alert("Request Sent", "Your instructor will review your reschedule request.");
            setRescheduleModalVisible(false);
            setRescheduleReason('');
            setRescheduleDate('');
            setRescheduleTime('');
            loadData(); // Rehydrate list to update badges
        } catch (error) {
            console.error("Reschedule Failed", error);
            Alert.alert("Error", "Failed to submit reschedule request.");
        } finally {
            setSubmittingReschedule(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'active': return { bg: '#22c55e20', text: '#22c55e', border: '#22c55e' }; // Green
            case 'scheduled': return { bg: '#eab30820', text: '#eab308', border: '#eab308' }; // Yellow
            case 'expired': return { bg: '#64748b20', text: '#94a3b8', border: '#64748b' }; // Gray
            default: return { bg: '#334155', text: '#cbd5e1', border: '#475569' };
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Evalis Mobile Workspace</Text>
                    <Text style={styles.name}>{user?.name || 'Student'}</Text>
                    <Text style={styles.subtext}>{user?.email || 'Unknown'}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </View>

            <ScrollView 
                style={styles.scrollArea}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
            >
                <Text style={styles.sectionTitle}>Your Examination Load</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }}/>
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
                                {/* Top Accent Bar */}
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

                                {/* Telemetry Metrics */}
                                <View style={styles.metricsBox}>
                                    <Text style={styles.metricText}>🕒 Date: {exam.start_time ? new Date(exam.start_time).toLocaleDateString() : 'TBD'}</Text>
                                    <Text style={styles.metricText}>⏳ Duration: {exam.duration_minutes} Minutes</Text>
                                </View>

                                {/* Logic Actions */}
                                <View style={styles.actionRow}>
                                    {isLive && (
                                        <View style={styles.liveNotice}>
                                            <Text style={styles.liveNoticeText}>🔒 Exam Active. Please take this exam on a Desktop browser.</Text>
                                        </View>
                                    )}
                                    
                                    {isUpcoming && !exam.is_rescheduled && (
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

                                    {exam.is_rescheduled && (
                                        <View style={styles.rescheduledBadge}>
                                            <Text style={styles.rescheduledBadgeText}>Reschedule Pending</Text>
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

            {/* Native Reschedule Modal */}
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
                                    placeholderTextColor="#64748b"
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
                                    placeholderTextColor="#64748b"
                                    value={rescheduleTime}
                                    onChangeText={setRescheduleTime}
                                />
                            </View>
                        </View>

                        <Text style={styles.modalLabel}>Reason for Request</Text>
                        <TextInput
                            style={[styles.modalInput, { minHeight: 100 }]}
                            placeholder="E.g., Medical emergency, clash with another exam..."
                            placeholderTextColor="#64748b"
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    greeting: { color: '#94a3b8', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
    name: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 4 },
    subtext: { color: '#64748b', fontSize: 13, marginTop: 4 },
    logoutBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#1e293b', borderRadius: 20 },
    logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
    scrollArea: { flex: 1 },
    sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40 },
    examCard: { backgroundColor: '#0f172a', borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#1e293b' },
    examCardFaded: { opacity: 0.6 },
    topAccent: { height: 4, width: '100%' },
    cardHeader: { flexDirection: 'row', padding: 16, justifyContent: 'space-between' },
    examName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    examSubtext: { color: '#3b82f6', fontSize: 12, marginTop: 4, fontWeight: '600' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    metricsBox: { backgroundColor: '#020617', marginHorizontal: 16, padding: 12, borderRadius: 8, marginBottom: 16 },
    metricText: { color: '#cbd5e1', fontSize: 13, marginBottom: 4 },
    actionRow: { padding: 16, paddingTop: 0, gap: 10 },
    liveNotice: { backgroundColor: '#020617', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#22c55e30' },
    liveNoticeText: { color: '#22c55e', fontSize: 12, textAlign: 'center', fontWeight: '600' },
    rescheduleBtn: { backgroundColor: '#ea580c20', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ea580c40' },
    rescheduleBtnText: { color: '#f97316', textAlign: 'center', fontWeight: 'bold' },
    rescheduledBadge: { backgroundColor: '#334155', padding: 12, borderRadius: 8 },
    rescheduledBadgeText: { color: '#94a3b8', textAlign: 'center', fontWeight: 'bold' },
    analyticsBtn: { backgroundColor: '#1e293b', padding: 12, borderRadius: 8 },
    analyticsBtnText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
    modalContainer: { backgroundColor: '#0f172a', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#1e293b' },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    modalSubtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 20 },
    modalGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    modalLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6 },
    modalInput: { backgroundColor: '#020617', color: 'white', padding: 14, borderRadius: 12, textAlignVertical: 'top', borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
    modalCompactInput: { minHeight: 50, marginBottom: 0 },
    modalActionRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 16, marginTop: 4 },
    modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#1e293b', alignItems: 'center' },
    modalCancelText: { color: '#cbd5e1', fontWeight: 'bold' },
    modalSubmitBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center' },
    modalSubmitText: { color: 'white', fontWeight: 'bold' }
});
