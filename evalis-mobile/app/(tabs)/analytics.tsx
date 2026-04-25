import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import API from '../../src/api/client';
import { useThemeStyles } from '../../src/hooks/useThemeStyles';

export default function AnalyticsScreen() {
    const [loading, setLoading] = useState(true);
    const [pastAttempts, setPastAttempts] = useState<any[]>([]);
    const router = useRouter();
    const { styles, theme } = useThemeStyles(createStyles);

    const [refreshing, setRefreshing] = useState(false);

    const fetchAttempts = async () => {
        try {
            const res = await API.get('/exam');
            const rawData = res.data;
            const validExamsArray = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.exams) ? rawData.exams : []);
            
            const attempted = validExamsArray.filter((exam: any) => exam.has_submitted === true);
            
            attempted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            setPastAttempts(attempted);
        } catch (err) {
            console.error("Failed fetching past attempts", err);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchAttempts();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAttempts();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>Compiling Intelligence...</Text>
            </View>
        );
    }

    return (
        <ScrollView 
            style={styles.container} 
            contentContainerStyle={{ paddingBottom: 60 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
            }
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Analytics Center</Text>
                <Text style={styles.headerSubtitle}>Past Exam Submissions</Text>
            </View>

            {pastAttempts.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={{ fontSize: 40, marginBottom: 10 }}>📊</Text>
                    <Text style={styles.emptyTitle}>No Submissions Yet</Text>
                    <Text style={styles.emptySubtitle}>You haven't completed any formal exams. Once you do, your comprehensive analytics will appear here.</Text>
                </View>
            ) : (
                <View style={styles.listContainer}>
                    {pastAttempts.map(exam => {
                        const isPublished = exam.is_results_published === true;
                        
                        return (
                            <View key={exam._id} style={styles.attemptCard}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.examName}>{exam.exam_name}</Text>
                                        <Text style={styles.examSubject}>{exam.subject_code} • {exam.pattern.toUpperCase()}</Text>
                                    </View>
                                    
                                    <View style={[styles.badge, isPublished ? styles.badgeSuccess : styles.badgePending]}>
                                        <Text style={[styles.badgeText, isPublished ? styles.textSuccess : styles.textPending]}>
                                            {isPublished ? 'Published' : 'Pending'}
                                        </Text>
                                    </View>
                                </View>
                                
                                <View style={styles.cardFooter}>
                                    {!isPublished ? (
                                        <View style={styles.lockedBox}>
                                            <Text style={styles.lockedText}>🔒 Results are locked pending Instructor review</Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity 
                                            style={styles.viewBtn} 
                                            onPress={() => router.push(`/exam/${exam._id}`)}
                                        >
                                            <Text style={styles.viewBtnText}>View Intelligence Report</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </ScrollView>
    );
}

const createStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background, padding: 24, paddingTop: 60 },
    center: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: theme.primary, marginTop: 12, fontWeight: 'bold', letterSpacing: 1 },
    header: { marginBottom: 30 },
    headerTitle: { color: theme.text, fontSize: 32, fontWeight: 'bold' },
    headerSubtitle: { color: theme.textSecondary, fontSize: 14, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' },

    emptyState: { alignItems: 'center', padding: 30, backgroundColor: theme.card, borderRadius: 24, borderWidth: 1, borderColor: theme.border, marginTop: 20 },
    emptyTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    emptySubtitle: { color: theme.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22 },

    listContainer: { gap: 16 },
    attemptCard: { backgroundColor: theme.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.border, shadowColor: theme.success, shadowOpacity: 0.05, shadowRadius: 15 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    examName: { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    examSubject: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
    
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
    badgeSuccess: { backgroundColor: theme.successSoft, borderColor: theme.success },
    badgePending: { backgroundColor: theme.warningSoft, borderColor: theme.warning },
    textSuccess: { color: theme.success, fontSize: 12, fontWeight: 'bold' },
    textPending: { color: theme.warning, fontSize: 12, fontWeight: 'bold' },

    cardFooter: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16 },
    lockedBox: { backgroundColor: theme.cardLight, padding: 12, borderRadius: 10, alignItems: 'center' },
    lockedText: { color: theme.textSecondary, fontSize: 13, fontStyle: 'italic' },
    viewBtn: { backgroundColor: theme.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
    viewBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' }
});
