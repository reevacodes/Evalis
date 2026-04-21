import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, Alert } from 'react-native';
import API from '../../src/api/client';

export default function PracticeScreen() {
    const [mode, setMode] = useState<'list' | 'play' | 'results'>('list');
    
    // Results State
    const [resultsData, setResultsData] = useState<any>(null);
    
    // List State
    const [papers, setPapers] = useState<any[]>([]);
    const [loadingList, setLoadingList] = useState(true);

    // Play State
    const [selectedPaper, setSelectedPaper] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [hasCoding, setHasCoding] = useState(false);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loadingPaper, setLoadingPaper] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (mode === 'list') {
            fetchPapers();
        }
    }, [mode]);

    const fetchPapers = async () => {
        setLoadingList(true);
        try {
            const res = await API.get('/past-papers');
            setPapers(res.data);
        } catch (err) {
            console.error("Failed fetching past papers", err);
        } finally {
            setLoadingList(false);
        }
    };

    const startPractice = async (paperId: string) => {
        setMode('play');
        setLoadingPaper(true);
        setAnswers({});
        setCurrentIndex(0);
        
        try {
            const res = await API.get(`/past-papers/${paperId}`);
            const paperData = res.data;
            setSelectedPaper(paperData);

            let extractedMcqs: any[] = [];
            let codingPresent = false;

            if (paperData.sections) {
                paperData.sections.forEach((sec: any) => {
                    if (sec.type === 'mcq') {
                        extractedMcqs = [...extractedMcqs, ...(sec.questions || [])];
                    } else if (sec.type === 'coding') {
                        codingPresent = true;
                    }
                });
            }

            setQuestions(extractedMcqs);
            setHasCoding(codingPresent);
            
        } catch (err) {
            console.error("Failed fetching practice details", err);
            Alert.alert("Error", "Could not load this practice exam.");
            setMode('list');
        } finally {
            setLoadingPaper(false);
        }
    };

    const handleSelectOption = (option: string) => {
        const qId = questions[currentIndex]?.id || questions[currentIndex]?._id;
        if (!qId) return;
        
        setAnswers(prev => ({
            ...prev,
            [qId]: option
        }));
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(curr => curr + 1);
        }
    };

    const prevQuestion = () => {
        if (currentIndex > 0) {
            setCurrentIndex(curr => curr - 1);
        }
    };

    const submitPractice = async () => {
        setSubmitting(true);
        try {
            // Mock empty coding answers since mobile doesn't support them
            const res = await API.post(`/past-papers/${selectedPaper._id}/practice-attempts`, {
                mcq_answers: answers,
                coding_answers: {} 
            });
            // 🐛 BUGFIX: Backend endpoint directly returns the analytics root, not wrapped in res.data.data
            setResultsData(res.data || null);
            setMode('results');
        } catch (err) {
            Alert.alert("Error", "Failed to submit answers.");
            console.error("Submission error", err);
        } finally {
            setSubmitting(false);
        }
    };

    // ==========================================
    // RENDER: LISTING MODE
    // ==========================================
    if (mode === 'list') {
        if (loadingList) return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>;

        return (
            <View style={styles.container}>
                <Text style={styles.headerTitle}>Practice Arena</Text>
                <Text style={styles.subtitle}>Select an exam module to practice on the go.</Text>
                
                {papers.length === 0 ? (
                    <Text style={styles.emptyText}>No practice modules available.</Text>
                ) : (
                    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                        {papers.map((p: any) => (
                            <TouchableOpacity 
                                key={p._id} 
                                style={styles.paperCard} 
                                onPress={() => startPractice(p._id)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.paperTitle}>{p.subject_code} - {p.season} {p.year}</Text>
                                <Text style={styles.paperSubtitle}>Tap to start interactive MCQ practice</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>
        );
    }

    // ==========================================
    // RENDER: RESULTS MODE
    // ==========================================
    if (mode === 'results' && resultsData) {
        const { score, analytics } = resultsData;
        const accColor = analytics?.accuracy >= 80 ? '#10b981' : analytics?.accuracy >= 50 ? '#eab308' : '#ef4444';

        return (
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.headerTitle}>Practice Analytics</Text>
                <Text style={styles.subtitle}>Your performance evaluation</Text>

                <View style={styles.scoreBoard}>
                    <Text style={styles.scoreTitle}>MCQ SCORE</Text>
                    <Text style={[styles.scoreValue, { color: accColor }]}>{score} <Text style={styles.scoreSub}>pts</Text></Text>
                </View>

                <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Accuracy</Text>
                        <Text style={[styles.metricValue, { color: accColor }]}>{analytics?.accuracy}%</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Attempted</Text>
                        <Text style={styles.metricValue}>{analytics?.attempted_mcqs} / {analytics?.total_mcqs}</Text>
                    </View>
                </View>

                {analytics?.weak_topics && analytics.weak_topics.length > 0 && (
                    <View style={styles.topicBox}>
                        <Text style={styles.topicTitle}>⚠️ Weak Topics Detected</Text>
                        {analytics.weak_topics.map((t: string, idx: number) => (
                            <Text key={idx} style={styles.topicItem}>• {t}</Text>
                        ))}
                    </View>
                )}

                {analytics?.strong_topics && analytics.strong_topics.length > 0 && (
                    <View style={styles.topicBox}>
                        <Text style={styles.topicTitle}>🔥 Strong Topics</Text>
                        {analytics.strong_topics.map((t: string, idx: number) => (
                            <Text key={idx} style={styles.topicItem}>• {t}</Text>
                        ))}
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.submitBtn, { marginTop: 20, alignItems: 'center' }]} 
                    onPress={() => setMode('list')}
                >
                    <Text style={styles.submitBtnText}>Return to Module List</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }

    // ==========================================
    // RENDER: PLAY MODE
    // ==========================================
    if (loadingPaper) return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>;
    if (questions.length === 0) {
        return (
            <View style={styles.center}>
                <Text style={styles.emptyText}>No MCQs found in this exam.</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => setMode('list')}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const currentQuestion = questions[currentIndex];
    const qId = currentQuestion.id || currentQuestion._id;
    const isLastQuestion = currentIndex === questions.length - 1;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={() => setMode('list')} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>Quit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.topSubmitBtn} 
                            onPress={submitPractice} 
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.topSubmitBtnText}>Submit</Text>}
                        </TouchableOpacity>
                    </View>
                    {/* Progress Text gracefully removed from header -> moved to Q body */}
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.questionText}>
                    {currentIndex + 1}. {currentQuestion.question || currentQuestion.question_text || "Unknown Question"}
                </Text>
                
                <ScrollView contentContainerStyle={styles.optionsContainer}>
                    {currentQuestion.options?.map((opt: string, index: number) => {
                        const isSelected = answers[qId] === opt;

                        return (
                            <TouchableOpacity 
                                key={index} 
                                style={[styles.optionCard, isSelected && styles.optionSelected]}
                                onPress={() => handleSelectOption(opt)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.optionText, isSelected && styles.optionTextDark]}>{opt}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {isLastQuestion && hasCoding && (
                <View style={styles.laptopWarning}>
                    <Text style={styles.laptopWarningText}>
                        💻 This module contains advanced Coding logic designed for Desktop browsers. Please hop on your laptop to run coding executions!
                    </Text>
                </View>
            )}

            <View style={styles.navRow}>
                <TouchableOpacity 
                    style={[styles.navBtn, currentIndex === 0 && { opacity: 0.5 }]} 
                    onPress={prevQuestion}
                    disabled={currentIndex === 0}
                >
                    <Text style={styles.navBtnText}>Prev</Text>
                </TouchableOpacity>

                {isLastQuestion ? (
                    <TouchableOpacity style={styles.submitBtn} onPress={submitPractice} disabled={submitting}>
                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Finish Exam</Text>}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.navBtn} onPress={nextQuestion}>
                        <Text style={styles.navBtnText}>Next</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', padding: 24, paddingTop: 60 },
    center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#64748b', fontSize: 16 },
    subtitle: { color: '#94a3b8', fontSize: 16, marginBottom: 20 },
    headerTitle: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    progressText: { color: '#6366f1', fontSize: 16, fontWeight: 'bold' },
    closeBtn: { padding: 8, backgroundColor: '#1e293b', borderRadius: 8 },
    closeBtnText: { color: '#f87171', fontWeight: 'bold' },
    topSubmitBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#10b981', borderRadius: 8 },
    topSubmitBtnText: { color: 'white', fontWeight: 'bold' },
    backBtn: { marginTop: 20, padding: 12, backgroundColor: '#334155', borderRadius: 8 },
    backBtnText: { color: 'white', fontWeight: 'bold' },
    paperCard: { backgroundColor: '#0f172a', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1e293b' },
    paperTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    paperSubtitle: { color: '#64748b', fontSize: 14 },
    card: { backgroundColor: '#0f172a', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#1e293b', flex: 1, marginBottom: 20 },
    questionText: { color: 'white', fontSize: 20, fontWeight: 'bold', lineHeight: 30, marginBottom: 30 },
    optionsContainer: { gap: 12, paddingBottom: 20 },
    optionCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
    optionSelected: { backgroundColor: '#312e81', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#4338ca' },
    optionText: { color: 'white', fontSize: 16 },
    optionTextDark: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    laptopWarning: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444', borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 16 },
    laptopWarningText: { color: '#fca5a5', fontSize: 13, lineHeight: 20, textAlign: 'center' },
    navRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    navBtn: { backgroundColor: '#334155', paddingVertical: 16, paddingHorizontal: 30, borderRadius: 12 },
    navBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    submitBtn: { backgroundColor: '#10b981', paddingVertical: 16, paddingHorizontal: 30, borderRadius: 12 },
    submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

    // Results screen styles
    scoreBoard: { backgroundColor: '#0f172a', borderRadius: 20, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#1e293b', marginBottom: 20, shadowColor: '#10b981', shadowOpacity: 0.1, shadowRadius: 20 },
    scoreTitle: { color: '#64748b', fontSize: 14, fontWeight: 'bold', letterSpacing: 2, marginBottom: 10 },
    scoreValue: { fontSize: 56, fontWeight: 'bold' },
    scoreSub: { fontSize: 24, fontWeight: 'normal', color: '#64748b' },
    metricsGrid: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    metricCard: { flex: 1, backgroundColor: '#0f172a', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
    metricLabel: { color: '#64748b', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
    metricValue: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    topicBox: { backgroundColor: '#0f172a', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1e293b', marginBottom: 16 },
    topicTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    topicItem: { color: '#94a3b8', fontSize: 15, marginBottom: 6, paddingLeft: 8 }
});
