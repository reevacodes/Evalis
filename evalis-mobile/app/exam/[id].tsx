import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Circle } from 'react-native-svg';
import API from '../../src/api/client';

export default function ExamAnalyticsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const res = await API.get(`/exam/submissions/${id}/me`);
                setResult(res.data);
            } catch (err: any) {
                console.error("Failed to fetch exam analytics", err);
                // Graceful fallback for demo if API throws 404 because user didn't submit
                setResult({ notFound: true, message: err.response?.data?.detail || "No submissions found." });
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [id]);

    if (loading) {
        return (
            <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Decrypting Telemetry...</Text>
            </View>
        );
    }

    if (result?.notFound) {
        return (
            <View style={styles.centerBox}>
                <Ionicons name="document-text-outline" size={60} color="#334155" />
                <Text style={styles.errorText}>No Analytics Found</Text>
                <Text style={styles.subErrorText}>{result.message}</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Return to Dashboard</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (result && !result.is_published) {
        return (
            <View style={styles.centerBox}>
                <Ionicons name="lock-closed-outline" size={60} color="#eab308" />
                <Text style={styles.pendingTitle}>Evaluation Pending</Text>
                <Text style={styles.pendingMessage}>{result.message || "Results are currently being evaluated by the Instructor."}</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Return to Dashboard</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Analytics Calculation
    const submission = result.submission || {};
    const finalScore = submission.final_score ?? submission.total_score ?? submission.mcq_score ?? 0;
    const totalMarks = result.total_marks || 100;
    const percentage = Math.round((finalScore / totalMarks) * 100);
    const graceMarks = submission.grace_marks_awarded || 0;

    const mcqScore = submission.mcq_score || 0;
    const codingScore = submission.coding_score || 0;
    const attemptedMcqs = submission.analytics?.attempted_mcqs || 0;
    const totalMcqs = submission.analytics?.total_mcqs || 0;

    // SVG Ring Logic
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerLeft}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Score Card</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.examTitle}>{result.exam_title || 'Formal Examination'}</Text>
                
                {/* Score Chart */}
                <View style={styles.chartContainer}>
                    <Svg width={150} height={150} viewBox="0 0 150 150">
                        {/* Background Ring */}
                        <Circle
                            cx="75" cy="75" r={radius}
                            stroke="#1e293b"
                            strokeWidth="15"
                            fill="transparent"
                        />
                        {/* Progress Ring */}
                        <Circle
                            cx="75" cy="75" r={radius}
                            stroke={percentage >= 60 ? "#22c55e" : percentage >= 40 ? "#eab308" : "#ef4444"}
                            strokeWidth="15"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform="rotate(-90 75 75)"
                        />
                    </Svg>
                    <View style={styles.chartTextContainer}>
                        <Text style={styles.chartPercentage}>{percentage}%</Text>
                        <Text style={styles.chartSub}>Mastery</Text>
                    </View>
                </View>

                {/* Score Breakdown Cards */}
                <View style={styles.grid}>
                    <View style={styles.gridCard}>
                        <Ionicons name="analytics" size={24} color="#6366f1" />
                        <Text style={styles.gridLabel}>Total Score</Text>
                        <Text style={styles.gridValue}>{finalScore} / {totalMarks}</Text>
                    </View>
                    <View style={styles.gridCard}>
                        <Ionicons name="layers" size={24} color="#10b981" />
                        <Text style={styles.gridLabel}>MCQ Score</Text>
                        <Text style={styles.gridValue}>{mcqScore}</Text>
                    </View>
                    <View style={styles.gridCard}>
                        <Ionicons name="code-slash" size={24} color="#f59e0b" />
                        <Text style={styles.gridLabel}>Coding Score</Text>
                        <Text style={styles.gridValue}>{codingScore}</Text>
                    </View>
                    <View style={styles.gridCard}>
                        <Ionicons name="checkmark-circle-outline" size={24} color="#3b82f6" />
                        <Text style={styles.gridLabel}>MCQ Attempted</Text>
                        <Text style={styles.gridValue}>{attemptedMcqs} / {totalMcqs}</Text>
                    </View>
                </View>

                {submission.analytics?.weak_topics && submission.analytics.weak_topics.length > 0 && (
                    <View style={styles.topicBox}>
                        <Text style={styles.topicTitle}>⚠️ Weak Topics</Text>
                        {submission.analytics.weak_topics.map((t: string, idx: number) => (
                            <Text key={idx} style={styles.topicItem}>• {t}</Text>
                        ))}
                    </View>
                )}

                {submission.analytics?.strong_topics && submission.analytics.strong_topics.length > 0 && (
                    <View style={styles.topicBox}>
                        <Text style={styles.topicTitle}>🔥 Strong Topics</Text>
                        {submission.analytics.strong_topics.map((t: string, idx: number) => (
                            <Text key={idx} style={styles.topicItem}>• {t}</Text>
                        ))}
                    </View>
                )}

                {graceMarks > 0 && (
                    <View style={styles.graceCard}>
                        <View style={styles.graceHeader}>
                            <Ionicons name="star" size={20} color="#f59e0b" />
                            <Text style={styles.graceTitle}>Instructor Intervention</Text>
                        </View>
                        <Text style={styles.graceDesc}>Your instructor manually injected <Text style={{fontWeight: 'bold', color: 'white'}}>+{graceMarks} Grace Marks</Text> into your final submission score.</Text>
                    </View>
                )}

                <View style={styles.submissionLog}>
                    <Text style={styles.logTitle}>Submission Telemetry</Text>
                    <View style={styles.logRow}>
                        <Text style={styles.logLabel}>Exam Name</Text>
                        <Text style={styles.logValue}>{result.exam_title || id}</Text>
                    </View>
                    <View style={styles.logRow}>
                        <Text style={styles.logLabel}>Timestamp</Text>
                        <Text style={styles.logValue}>{submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Protected'}</Text>
                    </View>
                </View>

                {/* MCQ REVIEW SECTION */}
                {result.exam_sections && result.exam_sections.length > 0 && (
                    <View style={styles.reviewSection}>
                        <Text style={styles.reviewSectionTitle}>MCQ Evaluation Review</Text>
                        {result.exam_sections.map((sec: any, secIdx: number) => (
                            <View key={secIdx}>
                                {sec.questions?.filter((q: any) => q.type !== 'coding').map((q: any, qIdx: number) => {
                                    const studentAnswer = submission.mcq_answers?.[q.id || q._id] || null;
                                    const isCorrect = studentAnswer === q.correct_answer;
                                    return (
                                        <View key={q.id || q._id || qIdx} style={[styles.qCard, isCorrect ? styles.qCardCorrect : styles.qCardIncorrect]}>
                                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12}}>
                                                <Text style={styles.qText} flex={1}>Q{qIdx + 1}. {q.question || q.question_text}</Text>
                                                <View style={[styles.qBadge, isCorrect ? styles.qBadgeCorrect : styles.qBadgeIncorrect]}>
                                                    <Text style={[styles.qBadgeText, isCorrect ? styles.qBadgeTextCorrect : styles.qBadgeTextIncorrect]}>
                                                        {isCorrect ? '+1 Mark' : '0 Marks'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.optionsGrid}>
                                                {q.options?.map((opt: string, oIdx: number) => {
                                                    const isStudentChoice = studentAnswer === opt;
                                                    const isActualCorrect = q.correct_answer === opt;
                                                    let optStyle = styles.optBase;
                                                    let optTextStyle = styles.optTextBase;
                                                    if (isActualCorrect) {
                                                        optStyle = styles.optActualCorrect;
                                                        optTextStyle = styles.optTextCorrect;
                                                    } else if (isStudentChoice && !isCorrect) {
                                                        optStyle = styles.optStudentIncorrect;
                                                        optTextStyle = styles.optTextIncorrect;
                                                    }
                                                    return (
                                                        <View key={oIdx} style={[styles.optItem, optStyle]}>
                                                            <View style={[styles.optDot, isActualCorrect ? styles.optDotCorrect : (isStudentChoice ? styles.optDotIncorrect : styles.optDotBase)]} />
                                                            <Text style={optTextStyle}>{opt}</Text>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                )}

                {/* CODING REVIEW SECTION */}
                {Object.keys(submission.coding_answers || {}).length > 0 && (
                    <View style={styles.reviewSection}>
                        <Text style={styles.reviewSectionTitle}>Coding Solutions Report</Text>
                        {Object.entries(submission.coding_answers).map(([key, cData]: [string, any], idx: number) => {
                            const qInfo = result.exam_sections?.flatMap((s: any) => s.questions).find((q: any) => q.id === key || q._id === key) || {};
                            return (
                                <View key={key} style={styles.codeCard}>
                                    <View style={styles.codeCardHeader}>
                                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1}}>
                                            <View style={styles.codeIdxBox}>
                                                <Text style={styles.codeIdxText}>{idx + 1}</Text>
                                            </View>
                                            <View style={{flex: 1}}>
                                                <Text style={styles.codeQText} numberOfLines={1}>{qInfo.question || qInfo.question_text || `Question Vector ${idx + 1}`}</Text>
                                                <Text style={styles.codeLangText}>{cData.language || "python"}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.codeBody}>
                                        <Text style={styles.codeLabel}>Student Submission:</Text>
                                        <ScrollView style={styles.codeScroll} horizontal>
                                            <Text style={styles.codeContent}>{cData.code || "No code submitted"}</Text>
                                        </ScrollView>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    centerBox: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', padding: 24 },
    loadingText: { color: '#6366f1', marginTop: 16, fontSize: 16, fontWeight: '600' },
    errorText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 16 },
    subErrorText: { color: '#64748b', fontSize: 14, textAlign: 'center', marginTop: 8 },
    pendingTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 16 },
    pendingMessage: { color: '#cbd5e1', fontSize: 15, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
    backBtn: { marginTop: 24, backgroundColor: '#1e293b', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    backBtnText: { color: 'white', fontWeight: 'bold' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    headerLeft: { padding: 4 },

    content: { flex: 1, padding: 24 },
    examTitle: { color: 'white', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },

    chartContainer: { alignItems: 'center', position: 'relative', marginBottom: 40 },
    chartTextContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
    chartPercentage: { color: 'white', fontSize: 32, fontWeight: 'bold' },
    chartSub: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 20 },
    gridCard: { width: '45%', backgroundColor: '#0f172a', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
    gridLabel: { color: '#64748b', fontSize: 12, marginTop: 12, textTransform: 'uppercase', fontWeight: 'bold' },
    gridValue: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 4 },

    graceCard: { backgroundColor: '#f59e0b20', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#f59e0b', marginBottom: 20 },
    graceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    graceTitle: { color: '#f59e0b', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    graceDesc: { color: '#fcd34d', fontSize: 14, lineHeight: 20 },

    submissionLog: { backgroundColor: '#0f172a', borderRadius: 16, padding: 20 },
    logTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
    logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    logLabel: { color: '#64748b', fontSize: 14 },
    logValue: { color: '#cbd5e1', fontSize: 14, fontWeight: '600', maxWidth: '70%', textAlign: 'right' },

    topicBox: { backgroundColor: '#0f172a', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1e293b', marginBottom: 16 },
    topicTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    topicItem: { color: '#94a3b8', fontSize: 15, marginBottom: 6, paddingLeft: 8 },

    reviewSection: { marginTop: 24, backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', overflow: 'hidden' },
    reviewSectionTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    
    qCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    qCardCorrect: { backgroundColor: '#10b98110' },
    qCardIncorrect: { backgroundColor: '#ef444410' },
    qText: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', flexShrink: 1, marginRight: 8 },
    qBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    qBadgeCorrect: { backgroundColor: '#10b98120' },
    qBadgeIncorrect: { backgroundColor: '#ef444420' },
    qBadgeText: { fontSize: 10, fontWeight: 'bold' },
    qBadgeTextCorrect: { color: '#10b981' },
    qBadgeTextIncorrect: { color: '#ef4444' },

    optionsGrid: { gap: 8 },
    optItem: { padding: 10, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    optBase: { backgroundColor: '#1e293b80', borderColor: '#334155' },
    optActualCorrect: { backgroundColor: '#10b98120', borderColor: '#10b98150' },
    optStudentIncorrect: { backgroundColor: '#ef444420', borderColor: '#ef444450' },
    
    optDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
    optDotBase: { borderColor: '#475569' },
    optDotCorrect: { backgroundColor: '#10b981', borderColor: '#10b981' },
    optDotIncorrect: { backgroundColor: '#ef4444', borderColor: '#ef4444' },

    optTextBase: { color: '#94a3b8', fontSize: 12 },
    optTextCorrect: { color: '#34d399', fontSize: 12, fontWeight: 'bold' },
    optTextIncorrect: { color: '#f87171', fontSize: 12, fontWeight: 'bold' },

    codeCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    codeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    codeIdxBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#6366f120', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#6366f140' },
    codeIdxText: { color: '#818cf8', fontWeight: 'bold', fontSize: 12 },
    codeQText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    codeLangText: { color: '#64748b', fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
    codeBody: { backgroundColor: '#020617', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b' },
    codeLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
    codeScroll: { backgroundColor: '#000', padding: 10, borderRadius: 6 },
    codeContent: { color: '#a5b4fc', fontFamily: 'monospace', fontSize: 12 }
});
