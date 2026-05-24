import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, ActivityIndicator, DeviceEventEmitter, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../src/api/client';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useThemeStyles } from '../../src/hooks/useThemeStyles';

export default function DashboardScreen() {
    const [user, setUser] = useState<any>(null);
    const [isNewUser, setIsNewUser] = useState(false);
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [examFilter, setExamFilter] = useState('All');
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
    const [rescheduleCategory, setRescheduleCategory] = useState('Medical Emergency');
    const [rescheduleProofFile, setRescheduleProofFile] = useState<any>(null);
    const [rescheduleIsSuspended, setRescheduleIsSuspended] = useState(false);
    const [submittingReschedule, setSubmittingReschedule] = useState(false);

    useEffect(() => {
        if (rescheduleModalVisible) {
            setRescheduleCategory(rescheduleIsSuspended ? 'Proctoring Error' : 'Medical Emergency');
        }
    }, [rescheduleModalVisible, rescheduleIsSuspended]);

    const pickDocument = async () => {
        let result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
            copyToCacheDirectory: true
        });
        if (result.canceled === false) {
            setRescheduleProofFile(result.assets[0]);
        }
    };

    const loadData = async () => {
        try {
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));
            const newFlag = await AsyncStorage.getItem('isNewUser');
            setIsNewUser(newFlag === 'true');

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
        const sub = DeviceEventEmitter.addListener('notification_received', (notif) => {
            loadData();
            if (notif?.request?.content) {
                Alert.alert(
                    notif.request.content.title || "New Notification",
                    notif.request.content.body || ""
                );
            }
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
        if (!rescheduleDate || !rescheduleTime || rescheduleReason.length < 10 || !rescheduleProofFile) {
            Alert.alert("Missing Information", "Please fill out a valid future date/time, a reason (> 10 chars), and upload official documentation.");
            return;
        }

        setSubmittingReschedule(true);
        try {
            const preferred_time = `${rescheduleDate}T${rescheduleTime}:00`;
            
            const formData = new FormData();
            formData.append("category", rescheduleCategory);
            formData.append("reason", rescheduleReason);
            formData.append("preferred_time", new Date(preferred_time).toISOString());
            formData.append("proof_file", {
                uri: rescheduleProofFile.uri,
                name: rescheduleProofFile.name,
                type: rescheduleProofFile.mimeType || 'application/pdf',
            } as any);

            await API.post(`/exam/${activeRescheduleId}/reschedule`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            Alert.alert("Request Sent", "Your instructor will review your reschedule request.");
            setRescheduleModalVisible(false);
            setRescheduleIsSuspended(false);
            setRescheduleReason('');
            setRescheduleDate('');
            setRescheduleTime('');
            setRescheduleProofFile(null);
            loadData(); 
        } catch (error: any) {
            console.error("Reschedule Failed", error);
            let errorMsg = error?.response?.data?.detail || error?.message || "Failed to submit reschedule request.";
            
            if (!rescheduleIsSuspended && (errorMsg.includes("5 days") || errorMsg.includes("Date error"))) {
                errorMsg = "Date out of bound! Reschedule requests must be made at least 5 days prior to the original exam start time, and your requested date must be a weekday (Monday-Friday).";
            }
            Alert.alert("Request Denied", errorMsg);
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
            <View style={[styles.header, { paddingRight: 60 }]}>
                <View style={{ flex: 1 }}>
                    <Image 
                        source={require('../../assets/images/evalis_logo_transparent.png')} 
                        style={{ width: 44, height: 44, marginBottom: 10, resizeMode: 'contain' }} 
                    />
                    <Text style={styles.greeting}>{isNewUser ? 'Welcome,' : 'Welcome back,'}</Text>
                    <Text style={styles.name} numberOfLines={1}>{user?.name?.split(' ')[0] || 'Student'} 👋</Text>
                    <Text style={styles.subtext}>Track your performance and upcoming exams.</Text>
                </View>
                <View style={[styles.headerRight, { position: 'absolute', top: 50, right: 80 }]}>
                    <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.bellBtn}>
                        <Ionicons name="notifications-outline" size={24} color={theme.icon} />
                        {unreadCount > 0 && <View style={styles.unreadBadge} />}
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

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, maxHeight: 40 }} contentContainerStyle={{ gap: 10 }}>
                    {['All', 'Live', 'Upcoming', 'Completed', 'Reschedule Pending', 'Reschedule Approved'].map(f => (
                        <TouchableOpacity 
                            key={f}
                            style={[styles.bubbleBtn, examFilter === f && styles.bubbleBtnActive, {paddingVertical: 6, paddingHorizontal: 12, height: 32}]}
                            onPress={() => setExamFilter(f)}
                        >
                            <Text style={[styles.bubbleText, examFilter === f && styles.bubbleTextActive, {fontSize: 12}]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }}/>
                ) : exams.length === 0 ? (
                    <Text style={styles.emptyText}>No exams are currently bridged to your profile.</Text>
                ) : (
                    [...exams]
                        .filter(ex => {
                            if (examFilter === 'All') return true;
                            if (examFilter === 'Reschedule Pending') return ex.reschedule_status === 'pending';
                            if (examFilter === 'Reschedule Approved') return ex.reschedule_status === 'approved';
                            if (examFilter === 'Live') return ex.time_status === 'active' && !ex.has_submitted;
                            if (examFilter === 'Upcoming') return ex.time_status === 'scheduled' && !ex.has_submitted;
                            if (examFilter === 'Completed') return ex.has_submitted || ex.time_status === 'expired';
                            return true;
                        })
                        .sort((a, b) => {
                            const getPriority = (ex: any) => {
                                if (ex.time_status === 'expired' || ex.has_submitted) return 3;
                                if (ex.time_status === 'active') return 1;
                                return 2;
                            };
                            
                            const pA = getPriority(a);
                            const pB = getPriority(b);
                            
                            if (pA !== pB) return pA - pB;
                            
                            if (pA === 2) {
                                return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
                            } else {
                                return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
                            }
                        })
                        .map((exam) => {
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
                                    <View style={[styles.badge, exam.is_suspended ? { backgroundColor: theme.dangerSoft } : { backgroundColor: statusColors.bg }]}>
                                        <Text style={[styles.badgeText, exam.is_suspended ? { color: theme.danger } : { color: statusColors.text }]}>
                                            {exam.is_suspended ? 'SUSPENDED' : isLive ? 'LIVE' : isUpcoming ? 'UPCOMING' : 'COMPLETED'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.metricsBox}>
                                    {(() => {
                                        if (!exam.start_time) return <Text style={styles.metricText}>🕒 Timing: TBD</Text>;
                                        const rawTime = exam.start_time;
                                        const dateObj = new Date(rawTime.endsWith('Z') || rawTime.includes('+') ? rawTime : rawTime + 'Z');
                                        return (
                                            <Text style={styles.metricText}>
                                                🕒 {dateObj.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric' })} • {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        );
                                    })()}
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
                                                setRescheduleIsSuspended(exam.is_suspended || false);
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

                                    {isCompleted && !exam.is_suspended && (
                                        <TouchableOpacity 
                                            style={styles.analyticsBtn}
                                            onPress={() => router.push(`/exam/${exam._id}`)}
                                        >
                                            <Text style={styles.analyticsBtnText}>View Analytics</Text>
                                        </TouchableOpacity>
                                    )}

                                    {isCompleted && exam.is_suspended && exam.reschedule_status !== 'approved' && exam.reschedule_status !== 'pending' && (
                                        <TouchableOpacity 
                                            style={[styles.rescheduleBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}
                                            onPress={() => {
                                                setActiveRescheduleId(exam._id);
                                                setRescheduleIsSuspended(exam.is_suspended || false);
                                                setRescheduleModalVisible(true);
                                            }}
                                        >
                                            <Text style={[styles.rescheduleBtnText, { color: theme.danger }]}>Request Reschedule</Text>
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
                onRequestClose={() => {
                    setRescheduleModalVisible(false);
                    setRescheduleIsSuspended(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Request Reschedule</Text>
                        <Text style={styles.modalSubtitle}>
                            {rescheduleIsSuspended
                                ? "Submit an appeal to review your exam suspension."
                                : "Strict on-campus lab rescheduling policy enforced. Must be submitted at least 5 days prior."}
                        </Text>
                        
                        <View style={styles.modalGrid}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalLabel}>Category</Text>
                                <TouchableOpacity 
                                    style={[styles.modalInput, styles.modalCompactInput, {justifyContent: 'center'}]}
                                    onPress={() => {
                                        if (rescheduleIsSuspended) {
                                            Alert.alert("Select Category", "", [
                                                {text: "Proctoring Error", onPress: () => setRescheduleCategory("Proctoring Error")},
                                                {text: "Technical Glitch", onPress: () => setRescheduleCategory("Technical Glitch")},
                                                {text: "Appeal", onPress: () => setRescheduleCategory("Appeal")},
                                                {text: "Cancel", style: "cancel"}
                                            ]);
                                        } else {
                                            Alert.alert("Select Category", "", [
                                                {text: "Medical Emergency", onPress: () => setRescheduleCategory("Medical Emergency")},
                                                {text: "University Rep.", onPress: () => setRescheduleCategory("University Representation")},
                                                {text: "Bereavement", onPress: () => setRescheduleCategory("Bereavement")},
                                                {text: "Cancel", style: "cancel"}
                                            ]);
                                        }
                                    }}
                                >
                                    <Text style={{color: theme.text}}>{rescheduleCategory}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.modalGrid}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalLabel}>Preferred Date (Mon-Fri)</Text>
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
                                <Text style={styles.modalLabel}>Time (9AM-5PM)</Text>
                                <TextInput
                                    style={[styles.modalInput, styles.modalCompactInput]}
                                    placeholder="HH:MM (24h)"
                                    placeholderTextColor={theme.textSecondary}
                                    value={rescheduleTime}
                                    onChangeText={setRescheduleTime}
                                />
                            </View>
                        </View>

                        <Text style={styles.modalLabel}>Official Documentation *</Text>
                        <TouchableOpacity style={[styles.modalInput, {flexDirection:'row', alignItems:'center', paddingVertical: 12}]} onPress={pickDocument}>
                            <Ionicons name="document-text" size={20} color={rescheduleProofFile ? '#f97316' : theme.textSecondary} style={{marginRight: 8}}/>
                            <Text style={{color: rescheduleProofFile ? theme.text : theme.textSecondary, flex:1}} numberOfLines={1}>
                                {rescheduleProofFile ? rescheduleProofFile.name : "Tap to upload PDF/Image"}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.modalLabel}>Detailed Explanation</Text>
                        <TextInput
                            style={[styles.modalInput, { minHeight: 80 }]}
                            placeholder="Provide context for the administration team..."
                            placeholderTextColor={theme.textSecondary}
                            multiline
                            numberOfLines={3}
                            value={rescheduleReason}
                            onChangeText={setRescheduleReason}
                        />

                        <View style={styles.modalActionRow}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => {
                                setRescheduleModalVisible(false);
                                setRescheduleIsSuspended(false);
                            }}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSubmitBtn} onPress={submitRescheduleRequest} disabled={submittingReschedule}>
                                {submittingReschedule ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Submit Official Request</Text>}
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
    
    bubbleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.cardLight, borderWidth: 1, borderColor: theme.border },
    bubbleBtnActive: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
    bubbleText: { color: theme.textSecondary, fontWeight: '600' },
    bubbleTextActive: { color: theme.primary },

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
