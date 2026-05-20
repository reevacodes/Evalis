import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Circle } from 'react-native-svg';
import API from '../../src/api/client';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useThemeStyles } from '../../src/hooks/useThemeStyles';

export default function PracticeScreen() {
    const [mode, setMode] = useState<'list' | 'play' | 'results'>('list');
    const [tab, setTab] = useState<'studio' | 'past_papers' | 'scheduled' | 'history'>('studio');
    const { styles, theme } = useThemeStyles(createStyles);
    
    // Results State
    const [resultsData, setResultsData] = useState<any>(null);
    
    // Past Papers State
    const [papers, setPapers] = useState<any[]>([]);
    const [loadingPapers, setLoadingPapers] = useState(false);

    // History State
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    
    // Generator State
    const [semester, setSemester] = useState<number>(3);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [loadingCurriculum, setLoadingCurriculum] = useState(false);
    const [topics, setTopics] = useState<string[]>([]);
    const [pattern, setPattern] = useState<'mixed'|'mcq'>('mixed');
    const [preset, setPreset] = useState<'Midsem'|'Final'>('Midsem');
    const [generating, setGenerating] = useState(false);
    
    // Scheduling State
    const [startMode, setStartMode] = useState<'instant'|'scheduled'>('instant');
    const [scheduledDate, setScheduledDate] = useState<Date>(new Date(Date.now() + 3600000));
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [schedulingPaperId, setSchedulingPaperId] = useState<string | null>(null);

    // Play State
    const [selectedPaper, setSelectedPaper] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [hasCoding, setHasCoding] = useState(false);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loadingPaper, setLoadingPaper] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [nowTime, setNowTime] = useState(Date.now());
    const [scheduledFilter, setScheduledFilter] = useState('All'); // 'All', 'Live', 'Upcoming', 'Expired'

    useEffect(() => {
        const interval = setInterval(() => setNowTime(Date.now()), 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (mode === 'list') {
            if (tab === 'studio') {
                loadCurriculum();
            } else if (tab === 'history') {
                fetchHistory();
            } else if (tab === 'past_papers' || tab === 'scheduled') {
                fetchPapers();
            }
        }
    }, [mode, semester, tab]);

    const fetchPapers = async () => {
        setLoadingPapers(true);
        try {
            const res = await API.get('/past-papers');
            setPapers(res.data || []);
        } catch (err) {
            console.error("Failed fetching past papers", err);
        } finally {
            setLoadingPapers(false);
        }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await API.get("/past-papers/practice/history");
            setHistory(res.data || []);
        } catch (err) {
            console.error("Failed fetching practice history", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const loadCurriculum = async () => {
        setLoadingCurriculum(true);
        try {
            const res = await API.get(`/curriculum/${semester}`);
            const subjs = res.data?.subjects || [];
            setSubjects(subjs);
            if (subjs.length > 0) {
                setSelectedSubject(subjs[0]);
            } else {
                setSelectedSubject(null);
            }
            setTopics([]);
        } catch (error) {
            console.error("Failed to load curriculum:", error);
            setSubjects([]);
            setSelectedSubject(null);
        } finally {
            setLoadingCurriculum(false);
        }
    };

    const toggleTopic = (t: string) => {
        if (topics.includes(t)) {
            setTopics(topics.filter((x) => x !== t));
        } else {
            setTopics([...topics, t]);
        }
    };

    const handleGenerate = async () => {
        if (topics.length === 0) return Alert.alert("Missing Selection", "Please select at least one chapter.");
        if (!selectedSubject) return Alert.alert("Missing Selection", "No subject selected.");
        
        setGenerating(true);
        try {
            let finalScheduledTime = null;
            if (startMode === 'scheduled') {
                finalScheduledTime = scheduledDate.toISOString();
            }

            const payload = {
                subject_code: selectedSubject.code,
                topics: topics,
                duration_preset: preset,
                pattern: pattern,
                start_mode: startMode,
                scheduled_time: finalScheduledTime
            };
            const res = await API.post("/exam/mock-tests/generate", payload);
            if (startMode === 'instant') {
                startPractice(res.data.exam_id);
            } else {
                Alert.alert("Success", "Mock exam scheduled successfully!");
                setTab('scheduled');
                
                if (scheduledDate > new Date()) {
                    try {
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: "Mock Exam Ready! 📝",
                                body: `Your scheduled practice exam for ${selectedSubject.name || 'this subject'} is now ready to take. Good luck!`,
                                sound: true,
                            },
                            trigger: scheduledDate,
                        });
                    } catch (notifErr) {
                        console.log("Failed to schedule local notification", notifErr);
                    }
                }
            }
        } catch (err: any) {
            console.error(err);
            Alert.alert("Error", err.response?.data?.detail || "Failed to generate mock test");
        } finally {
            setGenerating(false);
        }
    };

    const confirmSchedulePastPaper = async (p: any) => {
        setGenerating(true);
        try {
            const payload = {
                scheduled_time: scheduledDate.toISOString()
            };
            await API.post(`/exam/mock-tests/schedule-past-paper/${p._id}`, payload);
            
            Alert.alert("Success", "Past paper scheduled successfully!");
            setSchedulingPaperId(null);
            setTab('scheduled');
            
            if (scheduledDate > new Date()) {
                try {
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: "Past Paper Ready! 📝",
                            body: `Your scheduled past paper (${p.exam_name || 'Official Paper'}) is now ready to take.`,
                            sound: true,
                        },
                        trigger: scheduledDate,
                    });
                } catch (err) {
                    console.log("Failed to schedule local notification", err);
                }
            }
        } catch (err: any) {
            console.error(err);
            Alert.alert("Error", err.response?.data?.detail || "Failed to schedule past paper");
        } finally {
            setGenerating(false);
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
            
        } catch (err: any) {
            console.error("Failed fetching practice details", err);
            const errorMsg = err?.response?.data?.detail || err?.message || "Could not load this practice exam.";
            Alert.alert("Error", errorMsg);
            setMode('list');
        } finally {
            setLoadingPaper(false);
        }
    };

    const handleSelectOption = (option: string) => {
        const qId = questions[currentIndex]?.id || questions[currentIndex]?._id;
        if (!qId) return;
        setAnswers(prev => ({ ...prev, [qId]: option }));
    };

    const submitPractice = async () => {
        setSubmitting(true);
        try {
            const res = await API.post(`/past-papers/${selectedPaper._id}/practice-attempts`, {
                mcq_answers: answers,
                coding_answers: {} 
            });
            setResultsData(res.data || null);
            setMode('results');
        } catch (err: any) {
            const errorMsg = err?.response?.data?.detail || err?.message || "Failed to submit answers.";
            Alert.alert("Error", errorMsg);
            console.error("Submission error", err);
        } finally {
            setSubmitting(false);
        }
    };

    if (mode === 'list') {
        const availableTopics = selectedSubject 
            ? selectedSubject.units.map((u: any) => {
                const id = String(u.unit_number);
                const rawName = u.topics.length > 0 ? u.topics[0].name : 'Overview';
                const isPrefixed = /^(Chapter|Unit|Ch)\s*\d+/i.test(String(id));
                const label = isPrefixed ? `${id}: ${rawName}` : `Chapter ${id}: ${rawName}`;
                return { id, label };
            })
            : [];

        return (
            <ScrollView 
                style={styles.genContainer} 
                contentContainerStyle={{ paddingBottom: 60 }}
                refreshControl={
                    tab === 'history' ? <RefreshControl refreshing={loadingHistory} onRefresh={fetchHistory} tintColor={theme.primary} /> : 
                    (tab === 'past_papers' || tab === 'scheduled') ? <RefreshControl refreshing={loadingPapers} onRefresh={fetchPapers} tintColor={theme.primary} /> : 
                    undefined
                }
            >
                <View style={styles.genHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Ionicons name="sparkles" size={24} color={theme.primary} />
                        <Text style={styles.headerTitle}>Mock Test Studio</Text>
                    </View>
                    <Text style={styles.subtitle}>
                        {tab === 'studio' 
                            ? (selectedSubject ? `${selectedSubject.name} (${selectedSubject.code}) • Practice instantly!` : "Select a subject • Practice instantly!")
                            : "Review your past mock attempts"}
                    </Text>
                </View>

                {/* Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity style={[styles.tabBtn, tab === 'studio' && styles.tabBtnActive]} onPress={() => setTab('studio')}>
                        <Text style={[styles.tabBtnText, tab === 'studio' && styles.tabBtnTextActive]}>Studio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tabBtn, tab === 'past_papers' && styles.tabBtnActive]} onPress={() => setTab('past_papers')}>
                        <Text style={[styles.tabBtnText, tab === 'past_papers' && styles.tabBtnTextActive]}>Past Papers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tabBtn, tab === 'scheduled' && styles.tabBtnActive]} onPress={() => setTab('scheduled')}>
                        <Text style={[styles.tabBtnText, tab === 'scheduled' && styles.tabBtnTextActive]}>Scheduled</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]} onPress={() => setTab('history')}>
                        <Text style={[styles.tabBtnText, tab === 'history' && styles.tabBtnTextActive]}>History</Text>
                    </TouchableOpacity>
                </View>

                {tab === 'studio' ? (
                    <>
                        {/* Semester Selector */}
                        <View style={styles.section}>
                    <Text style={styles.sectionLabel}>SEMESTER</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                        {[1,2,3,4,5,6,7,8].map(s => (
                            <TouchableOpacity 
                                key={s} 
                                style={[styles.bubbleBtn, semester === s && styles.bubbleBtnActive]}
                                onPress={() => setSemester(s)}
                            >
                                <Text style={[styles.bubbleText, semester === s && styles.bubbleTextActive]}>Sem {s}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Subject Selector */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>SUBJECT</Text>
                    {loadingCurriculum ? (
                        <ActivityIndicator size="small" color={theme.primary} style={{ alignSelf: 'flex-start' }} />
                    ) : subjects.length === 0 ? (
                        <Text style={styles.emptyText}>No subjects found for this semester.</Text>
                    ) : (
                        <View style={{ gap: 8 }}>
                            {subjects.map(subj => (
                                <TouchableOpacity 
                                    key={subj.code} 
                                    style={[styles.subjectCard, selectedSubject?.code === subj.code && styles.subjectCardActive]}
                                    onPress={() => setSelectedSubject(subj)}
                                >
                                    <View style={[styles.radioCircle, selectedSubject?.code === subj.code && styles.radioCircleActive]} />
                                    <Text style={[styles.subjectText, selectedSubject?.code === subj.code && styles.subjectTextActive]}>
                                        {subj.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Chapters */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>SELECT CHAPTERS</Text>
                    {availableTopics.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyText}>No chapters available.</Text>
                        </View>
                    ) : (
                        <View style={styles.chapterGrid}>
                            {availableTopics.map((t: any) => {
                                const isSelected = topics.includes(t.id);
                                return (
                                    <TouchableOpacity 
                                        key={t.id}
                                        style={[styles.chapterBtn, isSelected && styles.chapterBtnActive]}
                                        onPress={() => toggleTopic(t.id)}
                                    >
                                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                                            {isSelected && <Ionicons name="checkmark" size={14} color="#000" />}
                                        </View>
                                        <Text style={[styles.chapterText, isSelected && styles.chapterTextActive]} numberOfLines={2}>
                                            {t.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Pattern */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>PAPER PATTERN</Text>
                    <View style={styles.rowGrid}>
                        <TouchableOpacity 
                            style={[styles.toggleBtn, pattern === 'mixed' && styles.toggleBtnActive]}
                            onPress={() => setPattern('mixed')}
                        >
                            <Text style={[styles.toggleText, pattern === 'mixed' && styles.toggleTextActive]}>Mixed (MCQ + Code)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.toggleBtn, pattern === 'mcq' && styles.toggleBtnActive]}
                            onPress={() => setPattern('mcq')}
                        >
                            <Text style={[styles.toggleText, pattern === 'mcq' && styles.toggleTextActive]}>MCQ Only</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Preset */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>DURATION FORMAT</Text>
                    <View style={styles.rowGrid}>
                        <TouchableOpacity 
                            style={[styles.presetCard, preset === 'Midsem' && styles.presetCardActive]}
                            onPress={() => setPreset('Midsem')}
                        >
                            <Ionicons name="time-outline" size={24} color={preset === 'Midsem' ? "#60a5fa" : theme.icon} />
                            <Text style={[styles.presetTitle, preset === 'Midsem' && styles.presetTitleActive]}>Midsem</Text>
                            <Text style={styles.presetDesc}>90 Mins • {pattern === 'mixed' ? "30 MCQ, 2 Code" : "50 MCQ"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.presetCard, preset === 'Final' && styles.presetCardActive]}
                            onPress={() => setPreset('Final')}
                        >
                            <Ionicons name="book-outline" size={24} color={preset === 'Final' ? "#60a5fa" : theme.icon} />
                            <Text style={[styles.presetTitle, preset === 'Final' && styles.presetTitleActive]}>Final</Text>
                            <Text style={styles.presetDesc}>180 Mins • {pattern === 'mixed' ? "60 MCQ, 4 Code" : "100 MCQ"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Scheduling */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>WHEN TO START</Text>
                    <View style={styles.rowGrid}>
                        <TouchableOpacity 
                            style={[styles.toggleBtn, startMode === 'instant' && styles.toggleBtnActive]}
                            onPress={() => setStartMode('instant')}
                        >
                            <Text style={[styles.toggleText, startMode === 'instant' && styles.toggleTextActive]}>Start Now</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.toggleBtn, startMode === 'scheduled' && styles.toggleBtnActive]}
                            onPress={() => setStartMode('scheduled')}
                        >
                            <Text style={[styles.toggleText, startMode === 'scheduled' && styles.toggleTextActive]}>Schedule Later</Text>
                        </TouchableOpacity>
                    </View>

                    {startMode === 'scheduled' && (
                        <View style={{ marginTop: 12, flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity 
                                style={[styles.bubbleBtn, {flex: 1, alignItems: 'center'}]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={18} color={theme.primary} style={{marginBottom: 4}}/>
                                <Text style={styles.bubbleText}>{scheduledDate.toLocaleDateString()}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.bubbleBtn, {flex: 1, alignItems: 'center'}]}
                                onPress={() => setShowTimePicker(true)}
                            >
                                <Ionicons name="time-outline" size={18} color={theme.primary} style={{marginBottom: 4}}/>
                                <Text style={styles.bubbleText}>{scheduledDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={scheduledDate}
                                    mode="date"
                                    minimumDate={new Date()}
                                    onChange={(event, date) => {
                                        setShowDatePicker(false);
                                        if (date) setScheduledDate(date);
                                    }}
                                />
                            )}
                            {showTimePicker && (
                                <DateTimePicker
                                    value={scheduledDate}
                                    mode="time"
                                    onChange={(event, date) => {
                                        setShowTimePicker(false);
                                        if (date) setScheduledDate(date);
                                    }}
                                />
                            )}
                        </View>
                    )}
                </View>

                {/* Generate Button */}
                <TouchableOpacity 
                    style={[styles.generateFinalBtn, topics.length === 0 && { opacity: 0.5 }]}
                    onPress={handleGenerate}
                    disabled={generating || topics.length === 0}
                >
                    {generating ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.generateFinalBtnText}>
                            {startMode === 'instant' ? "Generate Practice Exam" : "Schedule Practice Exam"}
                        </Text>
                    )}
                </TouchableOpacity>

                    </>
                ) : tab === 'past_papers' ? (
                    <View style={styles.historyContainer}>
                        {loadingPapers && papers.filter(p => p.exam_type !== "Practice").length === 0 ? (
                            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                        ) : papers.filter(p => p.exam_type !== "Practice").length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>No past papers available.</Text>
                            </View>
                        ) : (
                            Object.entries(
                                papers.filter(p => p.exam_type !== "Practice").reduce((acc: any, p: any) => {
                                    const y = p.year ? String(p.year) : "General";
                                    if (!acc[y]) acc[y] = [];
                                    acc[y].push(p);
                                    return acc;
                                }, {})
                            )
                            .sort(([a], [b]) => (a === "General" ? 1 : b === "General" ? -1 : parseInt(b as string) - parseInt(a as string)))
                            .map(([year, items]: any) => (
                                <View key={year} style={{ marginBottom: 20 }}>
                                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginLeft: 4}}>
                                        <View style={{width: 4, height: 16, backgroundColor: '#60a5fa', borderRadius: 2, marginRight: 8}} />
                                        <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>{year === "General" ? "Other Papers" : `${year} Papers`}</Text>
                                    </View>
                                    {items.map((p: any) => (
                                        <View key={p._id} style={styles.attemptCard}>
                                            <View style={styles.cardHeader}>
                                                <View style={{ flex: 1, paddingRight: 12 }}>
                                                    <Text style={styles.examName} numberOfLines={1}>{p.exam_name || "Official Past Paper"}</Text>
                                                    <Text style={styles.examSubject} numberOfLines={1}>{p.subject || p.subject_name || "General"} • {p.course_code || p.subject_code || "N/A"}</Text>
                                                </View>
                                                <View style={[styles.badge, { borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.15)', alignSelf: 'flex-start' }]}>
                                                    <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: 'bold' }}>{p.duration_minutes} Mins</Text>
                                                </View>
                                            </View>
                                            <View style={[styles.cardFooter, {justifyContent: 'space-between'}]}>
                                                <Text style={{color: theme.textSecondary, fontSize: 13}}>Format: {(p.exam_type || "Mixed").toUpperCase()}</Text>
                                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                                    <TouchableOpacity onPress={() => setSchedulingPaperId(schedulingPaperId === p._id ? null : p._id)} style={{flexDirection:'row', alignItems:'center', marginRight: 15}}>
                                                        <Text style={styles.viewBtnText}>Schedule</Text>
                                                        <Ionicons name="calendar-outline" size={14} color={theme.primary} style={{marginLeft: 4}}/>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => startPractice(p._id)} style={{flexDirection:'row', alignItems:'center'}}>
                                                        <Text style={styles.viewBtnText}>Start Practice</Text>
                                                        <Ionicons name="play" size={14} color={theme.primary} style={{marginLeft: 4}}/>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            {schedulingPaperId === p._id && (
                                                <View style={{padding: 12, backgroundColor: 'rgba(59,130,246,0.05)', borderTopWidth: 1, borderColor: theme.border}}>
                                                    <Text style={{color: theme.text, fontSize: 13, marginBottom: 8, fontWeight: 'bold'}}>Select Schedule Time:</Text>
                                                    <View style={{flexDirection: 'row', gap: 10, marginBottom: 12}}>
                                                        <TouchableOpacity style={[styles.bubbleBtn, {flex: 1, alignItems: 'center'}]} onPress={() => setShowDatePicker(true)}>
                                                            <Ionicons name="calendar-outline" size={18} color={theme.primary} style={{marginBottom: 4}}/>
                                                            <Text style={styles.bubbleText}>{scheduledDate.toLocaleDateString()}</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity style={[styles.bubbleBtn, {flex: 1, alignItems: 'center'}]} onPress={() => setShowTimePicker(true)}>
                                                            <Ionicons name="time-outline" size={18} color={theme.primary} style={{marginBottom: 4}}/>
                                                            <Text style={styles.bubbleText}>{scheduledDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                    
                                                    {showDatePicker && (
                                                        <DateTimePicker
                                                            value={scheduledDate}
                                                            mode="date"
                                                            minimumDate={new Date()}
                                                            onChange={(e, d) => { setShowDatePicker(false); if(d) setScheduledDate(d); }}
                                                        />
                                                    )}
                                                    {showTimePicker && (
                                                        <DateTimePicker
                                                            value={scheduledDate}
                                                            mode="time"
                                                            onChange={(e, d) => { setShowTimePicker(false); if(d) setScheduledDate(d); }}
                                                        />
                                                    )}

                                                    <TouchableOpacity 
                                                        style={[styles.generateFinalBtn, {paddingVertical: 10, borderRadius: 8}]}
                                                        onPress={() => confirmSchedulePastPaper(p)}
                                                        disabled={generating}
                                                    >
                                                        {generating ? <ActivityIndicator color="#fff"/> : <Text style={styles.generateFinalBtnText}>Confirm Schedule</Text>}
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            ))
                        )}
                    </View>
                ) : tab === 'scheduled' ? (
                    <View style={styles.historyContainer}>
                        {loadingPapers && papers.filter(p => p.exam_type === "Practice" && p.is_instant === false).length === 0 ? (
                            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                        ) : papers.filter(p => p.exam_type === "Practice" && p.is_instant === false).length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>No upcoming scheduled mocks.</Text>
                            </View>
                        ) : (
                            <>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, maxHeight: 40 }} contentContainerStyle={{ gap: 10 }}>
                                    {['All', 'Live', 'Upcoming', 'Expired', 'Completed'].map(f => (
                                        <TouchableOpacity 
                                            key={f}
                                            style={[styles.bubbleBtn, scheduledFilter === f && styles.bubbleBtnActive, {paddingVertical: 6, paddingHorizontal: 12, height: 32}]}
                                            onPress={() => setScheduledFilter(f)}
                                        >
                                            <Text style={[styles.bubbleText, scheduledFilter === f && styles.bubbleTextActive, {fontSize: 12}]}>{f}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {papers.filter(p => p.exam_type === "Practice" && p.is_instant === false)
                                .map((p: any) => {
                                    const rawTime = p.start_time || new Date().toISOString();
                                    const start = new Date(rawTime.endsWith('Z') || rawTime.includes('+') ? rawTime : rawTime + 'Z');
                                    const durationMs = (p.duration_minutes || 30) * 60000;
                                    const end = new Date(start.getTime() + durationMs);
                                    
                                    let statusStr = 'Upcoming';
                                    if (nowTime < start.getTime()) {
                                        statusStr = 'Upcoming';
                                    } else if (nowTime >= start.getTime() && nowTime <= end.getTime()) {
                                        statusStr = 'Live';
                                    } else {
                                        statusStr = history.some((h: any) => h.exam_id === p._id || h.paper_id === p._id) ? 'Completed' : 'Expired';
                                    }
                                    return { ...p, _computedStart: start, _computedStatus: statusStr, _computedEnd: end };
                                })
                                .filter((p: any) => scheduledFilter === 'All' ? true : p._computedStatus === scheduledFilter)
                                .sort((a: any, b: any) => {
                                    if (scheduledFilter === 'All') {
                                        const rank: any = { 'Live': 1, 'Upcoming': 2, 'Expired': 3, 'Completed': 4 };
                                        if (rank[a._computedStatus] !== rank[b._computedStatus]) {
                                            return rank[a._computedStatus] - rank[b._computedStatus];
                                        }
                                        return a._computedStart.getTime() - b._computedStart.getTime(); // Upcoming nearest first
                                    }
                                    return b._computedStart.getTime() - a._computedStart.getTime(); // Others latest first
                                })
                                .map((p: any) => {
                                    const statusStr = p._computedStatus;
                                    const start = p._computedStart;
                                    
                                    let statusColor = theme.primary; 
                                    let statusBg = theme.primary + '15'; 
                                    
                                    if (statusStr === 'Live') {
                                        statusColor = theme.success; 
                                        statusBg = theme.success + '15'; 
                                    } else if (statusStr === 'Expired') {
                                        statusColor = theme.danger; 
                                        statusBg = theme.danger + '15'; 
                                    } else if (statusStr === 'Completed') {
                                        statusColor = theme.success;
                                        statusBg = theme.success + '15';
                                    }

                                    const canStart = statusStr === 'Live' || statusStr === 'Expired' || statusStr === 'Completed';
                                    const btnText = statusStr === 'Upcoming' ? 'Waiting' : (statusStr === 'Live' ? 'Start Now' : 'Retry');
                                    const btnIcon = statusStr === 'Upcoming' ? 'time' : (statusStr === 'Live' ? 'play' : 'refresh');

                                return (
                                <View key={p._id} style={styles.attemptCard}>
                                    <View style={styles.cardHeader}>
                                        <View style={{ flex: 1, paddingRight: 12 }}>
                                            <Text style={styles.examName} numberOfLines={1}>{p.exam_name || "Scheduled Mock"}</Text>
                                            <Text style={styles.examSubject} numberOfLines={1}>{start.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric' })} • {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                                        </View>
                                        <View style={[styles.badge, { borderColor: statusColor, backgroundColor: statusBg, alignSelf: 'flex-start' }]}>
                                            <Text style={{ color: statusColor, fontSize: 12, fontWeight: 'bold' }}>{statusStr}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.cardFooter, {justifyContent: 'flex-end'}]}>
                                        <TouchableOpacity 
                                            onPress={() => canStart ? startPractice(p._id) : Alert.alert("Not Ready", "This exam is scheduled for a future time.")} 
                                            style={{flexDirection:'row', alignItems:'center', opacity: canStart ? 1 : 0.5}}
                                        >
                                            <Text style={styles.viewBtnText}>{btnText}</Text>
                                            <Ionicons name={btnIcon as any} size={14} color={theme.primary} style={{marginLeft: 4}}/>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                );
                            })}
                            </>
                        )}
                    </View>
                ) : (
                    /* History Tab Content */
                    <View style={styles.historyContainer}>
                        {loadingHistory && history.length === 0 ? (
                            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                        ) : history.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>No mock exams taken yet.</Text>
                            </View>
                        ) : (
                            history.map((hItem: any, idx: number) => {
                                const acc = hItem.analytics?.accuracy ?? 0;
                                const accColor = acc >= 70 ? theme.success : acc >= 40 ? theme.warning : theme.danger;
                                const rawDate = hItem.created_at || new Date().toISOString();
                                const d = new Date(rawDate.endsWith('Z') ? rawDate : rawDate + 'Z');
                                return (
                                    <TouchableOpacity 
                                        key={hItem._id || idx} 
                                        style={styles.attemptCard}
                                        onPress={async () => {
                                            // Optimistically set what we have so it feels instant
                                            setResultsData(hItem);
                                            setMode('results');
                                            // Fetch sections for full review mapping
                                            try {
                                                if (hItem.paper_id) {
                                                    const res = await API.get(`/past-papers/${hItem.paper_id}`);
                                                    const paperData = res.data;
                                                    setResultsData(prev => ({ 
                                                        ...prev, 
                                                        exam_sections: paperData.sections || (paperData.sets ? paperData.sets.A : []) 
                                                    }));
                                                }
                                            } catch (err) {
                                                console.log("Failed to fetch past paper sections for review.", err);
                                            }
                                        }}
                                    >
                                        <View style={styles.cardHeader}>
                                            <View style={{ flex: 1, paddingRight: 12 }}>
                                                <Text style={styles.examName} numberOfLines={1}>{hItem.exam_name || `Attempt ${history.length - idx}`}</Text>
                                                <Text style={styles.examSubject} numberOfLines={1}>{d.toLocaleDateString()} • {d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                                            </View>
                                            <View style={[styles.badge, { borderColor: accColor, backgroundColor: accColor + '15', alignSelf: 'flex-start' }]}>
                                                <Text style={{ color: accColor, fontSize: 12, fontWeight: 'bold' }}>{acc}% Acc</Text>
                                            </View>
                                        </View>
                                        <View style={styles.cardFooter}>
                                            <Text style={styles.viewBtnText}>View Analytics</Text>
                                            <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                )}
            </ScrollView>
        );
    }

    // ==========================================
    // RENDER: RESULTS MODE
    // ==========================================
    if (mode === 'results' && resultsData) {
        const { score, analytics, coding_results } = resultsData;
        const finalScore = score || 0;
        const totalMarks = resultsData.total_marks || (analytics?.total_mcqs || 0);
        const acc = analytics?.accuracy || 0;
        
        const mcqScore = analytics?.correct_mcqs || 0;
        const codingScore = finalScore - mcqScore > 0 ? finalScore - mcqScore : 0;
        const attemptedMcqs = analytics?.attempted_mcqs || 0;
        const totalMcqs = analytics?.total_mcqs || 0;

        const radius = 60;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (acc / 100) * circumference;

        return (
            <ScrollView style={styles.genContainer} contentContainerStyle={{ paddingBottom: 60 }}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => setMode('list')} style={{ padding: 4 }}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { fontSize: 18 }]}>Score Card</Text>
                    <View style={{ width: 24 }} />
                </View>

                <Text style={styles.examTitle}>Mock Assessment</Text>
                
                {/* Score Chart */}
                <View style={styles.chartContainer}>
                    <Svg width={150} height={150} viewBox="0 0 150 150">
                        {/* Background Ring */}
                        <Circle
                            cx="75" cy="75" r={radius}
                            stroke={theme.border}
                            strokeWidth="15"
                            fill="transparent"
                        />
                        {/* Progress Ring */}
                        <Circle
                            cx="75" cy="75" r={radius}
                            stroke={acc >= 70 ? theme.success : acc >= 40 ? theme.warning : theme.danger}
                            strokeWidth="15"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform="rotate(-90 75 75)"
                        />
                    </Svg>
                    <View style={styles.chartTextContainer}>
                        <Text style={styles.chartPercentage}>{acc}%</Text>
                        <Text style={styles.chartSub}>Mastery</Text>
                    </View>
                </View>

                {/* Score Breakdown Cards */}
                <View style={styles.grid}>
                    <View style={styles.gridCard}>
                        <Ionicons name="analytics" size={24} color={theme.primary} />
                        <Text style={styles.gridLabel}>Total Score</Text>
                        <Text style={styles.gridValue}>{finalScore} / {totalMarks}</Text>
                    </View>
                    <View style={styles.gridCard}>
                        <Ionicons name="layers" size={24} color={theme.success} />
                        <Text style={styles.gridLabel}>MCQ Score</Text>
                        <Text style={styles.gridValue}>{mcqScore}</Text>
                    </View>
                    <View style={styles.gridCard}>
                        <Ionicons name="code-slash" size={24} color={theme.warning} />
                        <Text style={styles.gridLabel}>Coding Score</Text>
                        <Text style={styles.gridValue}>{codingScore}</Text>
                    </View>
                    <View style={styles.gridCard}>
                        <Ionicons name="checkmark-circle-outline" size={24} color="#3b82f6" />
                        <Text style={styles.gridLabel}>MCQ Attempted</Text>
                        <Text style={styles.gridValue}>{attemptedMcqs} / {totalMcqs}</Text>
                    </View>
                </View>

                {analytics?.weak_topics && analytics.weak_topics.length > 0 && (
                    <View style={styles.topicBox}>
                        <Text style={styles.topicTitle}>⚠️ Weak Topics</Text>
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

                {/* MCQ REVIEW SECTION */}
                {resultsData?.exam_sections && resultsData.exam_sections.length > 0 && (
                    <View style={styles.reviewSection}>
                        <Text style={styles.reviewSectionTitle}>MCQ Evaluation Review</Text>
                        {resultsData.exam_sections.map((sec: any, secIdx: number) => (
                            <View key={secIdx}>
                                {sec.questions?.filter((q: any) => q.type !== 'coding').map((q: any, qIdx: number) => {
                                    const studentAnswer = resultsData.mcq_answers?.[q.id || q._id] || answers?.[q.id || q._id] || null;
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
                {resultsData?.coding_answers && Object.keys(resultsData.coding_answers).length > 0 && (
                    <View style={styles.reviewSection}>
                        <Text style={styles.reviewSectionTitle}>Coding Solutions Report</Text>
                        {Object.entries(resultsData.coding_answers).map(([key, cData]: [string, any], idx: number) => {
                            const qInfo = resultsData.exam_sections?.flatMap((s: any) => s.questions).find((q: any) => q.id === key || q._id === key) || {};
                            const cr = coding_results?.[key] || {};
                            let aiFbText = cr.ai_feedback;
                            let parsedFb: any = null;
                            if (aiFbText) {
                                try {
                                    parsedFb = JSON.parse(aiFbText);
                                } catch (e) {}
                            }

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
                                        {cr.status && (
                                            <View style={[styles.qBadge, cr.status === 'AC' ? styles.qBadgeCorrect : styles.qBadgeIncorrect, { paddingHorizontal: 8 }]}>
                                                <Text style={[styles.qBadgeText, cr.status === 'AC' ? styles.qBadgeTextCorrect : styles.qBadgeTextIncorrect]}>
                                                    {cr.passed} / {cr.total_cases} ({cr.status})
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.codeBody}>
                                        <Text style={styles.codeLabel}>Student Submission:</Text>
                                        <ScrollView style={styles.codeScroll} horizontal>
                                            <Text style={styles.codeContent}>{cData.code || "No code submitted"}</Text>
                                        </ScrollView>
                                        
                                        {aiFbText && (
                                            <View style={{marginTop: 15, backgroundColor: '#8b5cf615', borderWidth: 1, borderColor: '#8b5cf640', borderRadius: 8, padding: 12}}>
                                                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12}}>
                                                    <Ionicons name="hardware-chip-outline" size={16} color="#a78bfa" />
                                                    <Text style={{color: '#a78bfa', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase'}}>AI Mentor Review</Text>
                                                </View>
                                                {parsedFb ? (
                                                    <View>
                                                        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8}}>
                                                            {parsedFb.time_complexity && <View style={{backgroundColor: '#6366f120', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#6366f130'}}><Text style={{color: '#818cf8', fontSize: 10, fontFamily: 'monospace'}}>Time: {parsedFb.time_complexity}</Text></View>}
                                                            {parsedFb.memory_efficiency && <View style={{backgroundColor: '#a855f720', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#a855f730'}}><Text style={{color: '#c084fc', fontSize: 10, fontFamily: 'monospace'}}>Space: {parsedFb.memory_efficiency}</Text></View>}
                                                        </View>
                                                        <Text style={{color: '#ddd6fe', fontSize: 13, lineHeight: 20}}>
                                                            {parsedFb.feedback || parsedFb.message}
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <Text style={{color: '#ddd6fe', fontSize: 13, lineHeight: 20}}>
                                                        {aiFbText}
                                                    </Text>
                                                )}
                                            </View>
                                        )}

                                        {cr.details && cr.details.length > 0 && (
                                            <View style={{marginTop: 15, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'}}>
                                                <Text style={{color: '#9ca3af', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8}}>Test Case Traces</Text>
                                                {cr.details.map((t: any, i: number) => {
                                                    const isPass = t.verdict === 'AC';
                                                    return (
                                                        <View key={i} style={{flexDirection: 'row', gap: 8, marginBottom: 6}}>
                                                            <Text style={{color: isPass ? '#34d399' : '#f87171', fontSize: 12, marginTop: 1}}>
                                                                {isPass ? '✔' : '✘'}
                                                            </Text>
                                                            <View style={{flex: 1}}>
                                                                <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                                                                    <Text style={{color: '#9ca3af', fontSize: 11}}>Input: <Text style={{color: '#93c5fd'}}>{t.input}</Text></Text>
                                                                    <Text style={{color: '#9ca3af', fontSize: 11, marginLeft: 8}}>Expected: <Text style={{color: '#6ee7b7'}}>{t.expected}</Text></Text>
                                                                </View>
                                                                {!isPass && (
                                                                    <Text style={{color: '#9ca3af', fontSize: 11, marginTop: 2}}>Output: <Text style={{color: '#fca5a5'}}>{t.output || t.actual_output}</Text></Text>
                                                                )}
                                                            </View>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.generateFinalBtn, {marginTop: 10}]}
                    onPress={() => {
                        const pid = resultsData?.paper_id || resultsData?.exam_id || selectedPaper?._id;
                        if (pid) {
                            startPractice(pid);
                        } else {
                            setMode('list');
                        }
                    }}
                >
                    <Text style={styles.generateFinalBtnText}>Reattempt</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={{marginTop: 16, alignItems: 'center', padding: 10}}
                    onPress={() => setMode('list')}
                >
                    <Text style={{color: theme.textSecondary, fontWeight: 'bold'}}>Back to Studio</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }

    // ==========================================
    // RENDER: PLAY MODE
    // ==========================================
    if (loadingPaper) return <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>;
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
                        💻 This module contains Coding questions. Please login to the Web App to execute your code.
                    </Text>
                </View>
            )}

            <View style={styles.navRow}>
                <TouchableOpacity 
                    style={[styles.navBtn, currentIndex === 0 && { opacity: 0.5 }]} 
                    onPress={() => { if(currentIndex > 0) setCurrentIndex(c => c - 1); }}
                    disabled={currentIndex === 0}
                >
                    <Text style={styles.navBtnText}>Prev</Text>
                </TouchableOpacity>

                {isLastQuestion ? (
                    <TouchableOpacity style={styles.submitBtn} onPress={submitPractice} disabled={submitting}>
                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Finish Exam</Text>}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.navBtn} onPress={() => { if(currentIndex < questions.length - 1) setCurrentIndex(c => c + 1); }}>
                        <Text style={styles.navBtnText}>Next</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

}

const createStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background, padding: 24, paddingTop: 60 },
    genContainer: { flex: 1, backgroundColor: theme.background, padding: 20, paddingTop: 60 },
    center: { flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' },
    
    genHeader: { marginBottom: 24 },
    headerTitle: { color: theme.text, fontSize: 24, fontWeight: 'bold' },
    subtitle: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
    
    section: { marginBottom: 24 },
    sectionLabel: { color: theme.textSecondary, fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12 },
    
    bubbleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.cardLight, borderWidth: 1, borderColor: theme.border },
    bubbleBtnActive: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
    bubbleText: { color: theme.textSecondary, fontWeight: '600' },
    bubbleTextActive: { color: theme.primary },

    subjectCard: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
    subjectCardActive: { borderColor: theme.primary, backgroundColor: theme.primarySoft },
    radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: theme.textSecondary, marginRight: 12 },
    radioCircleActive: { borderColor: theme.primary, backgroundColor: theme.primary },
    subjectText: { color: theme.textSecondary, fontSize: 15 },
    subjectTextActive: { color: theme.text, fontWeight: 'bold' },

    emptyBox: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed', alignItems: 'center' },
    emptyText: { color: theme.textSecondary, fontSize: 14 },

    chapterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chapterBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: theme.card, borderRadius: 10, borderWidth: 1, borderColor: theme.border, width: '48%' },
    chapterBtnActive: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
    checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: theme.textSecondary, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    chapterText: { color: theme.textSecondary, fontSize: 13, flex: 1 },
    chapterTextActive: { color: theme.primary, fontWeight: 'bold' },

    rowGrid: { flexDirection: 'row', gap: 10 },
    toggleBtn: { flex: 1, padding: 14, backgroundColor: theme.card, borderRadius: 10, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
    toggleText: { color: theme.textSecondary, fontWeight: 'bold', fontSize: 13 },
    toggleTextActive: { color: theme.primary },

    presetCard: { flex: 1, padding: 16, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center', gap: 8 },
    presetCardActive: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
    presetTitle: { color: theme.text, fontWeight: 'bold', fontSize: 16 },
    presetTitleActive: { color: theme.primary },
    presetDesc: { color: theme.textSecondary, fontSize: 11, textAlign: 'center' },

    generateFinalBtn: { backgroundColor: theme.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    generateFinalBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    // Play Mode & Results Mode Styles 
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    closeBtn: { padding: 8, backgroundColor: theme.cardLight, borderRadius: 8 },
    closeBtnText: { color: theme.danger, fontWeight: 'bold' },
    topSubmitBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: theme.success, borderRadius: 8 },
    topSubmitBtnText: { color: 'white', fontWeight: 'bold' },
    backBtn: { marginTop: 20, padding: 12, backgroundColor: theme.cardLight, borderRadius: 8 },
    backBtnText: { color: theme.text, fontWeight: 'bold' },
    card: { backgroundColor: theme.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.border, flex: 1, marginBottom: 20 },
    questionText: { color: theme.text, fontSize: 20, fontWeight: 'bold', lineHeight: 30, marginBottom: 30 },
    optionsContainer: { gap: 12, paddingBottom: 20 },
    optionCard: { backgroundColor: theme.cardLight, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
    optionSelected: { backgroundColor: theme.primary, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.primarySoft },
    optionText: { color: theme.text, fontSize: 16 },
    optionTextDark: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    laptopWarning: { backgroundColor: theme.dangerSoft, borderColor: theme.danger, borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 16 },
    laptopWarningText: { color: theme.danger, fontSize: 13, lineHeight: 20, textAlign: 'center' },
    navRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    navBtn: { backgroundColor: theme.cardLight, paddingVertical: 16, paddingHorizontal: 30, borderRadius: 12 },
    navBtnText: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
    submitBtn: { backgroundColor: theme.success, paddingVertical: 16, paddingHorizontal: 30, borderRadius: 12 },
    submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

    tabContainer: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: 12, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: theme.border },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    tabBtnActive: { backgroundColor: theme.cardLight },
    tabBtnText: { color: theme.textSecondary, fontWeight: 'bold' },
    tabBtnTextActive: { color: theme.text },

    historyContainer: { gap: 16 },
    attemptCard: { backgroundColor: theme.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    examName: { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    examSubject: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
    cardFooter: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
    viewBtnText: { color: theme.primary, fontSize: 14, fontWeight: 'bold' },

    examTitle: { color: theme.text, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
    chartContainer: { alignItems: 'center', position: 'relative', marginBottom: 40 },
    chartTextContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
    chartPercentage: { color: theme.text, fontSize: 32, fontWeight: 'bold' },
    chartSub: { color: theme.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 20 },
    gridCard: { width: '45%', backgroundColor: theme.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
    gridLabel: { color: theme.textSecondary, fontSize: 12, marginTop: 12, textTransform: 'uppercase', fontWeight: 'bold', textAlign: 'center' },
    gridValue: { color: theme.text, fontSize: 20, fontWeight: 'bold', marginTop: 4 },
    topicBox: { backgroundColor: theme.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
    topicTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    topicItem: { color: theme.textSecondary, fontSize: 15, marginBottom: 6, paddingLeft: 8 },

    reviewSection: { marginTop: 24, backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
    reviewSectionTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
    
    qCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
    qCardCorrect: { backgroundColor: theme.successSoft },
    qCardIncorrect: { backgroundColor: theme.dangerSoft },
    qText: { color: theme.text, fontSize: 14, fontWeight: '600', flexShrink: 1, marginRight: 8 },
    qBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    qBadgeCorrect: { backgroundColor: theme.successSoft },
    qBadgeIncorrect: { backgroundColor: theme.dangerSoft },
    qBadgeText: { fontSize: 10, fontWeight: 'bold' },
    qBadgeTextCorrect: { color: theme.success },
    qBadgeTextIncorrect: { color: theme.danger },

    optionsGrid: { gap: 8 },
    optItem: { padding: 10, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    optBase: { backgroundColor: theme.cardLight, borderColor: theme.border },
    optActualCorrect: { backgroundColor: theme.successSoft, borderColor: theme.success },
    optStudentIncorrect: { backgroundColor: theme.dangerSoft, borderColor: theme.danger },
    
    optDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
    optDotBase: { borderColor: theme.textSecondary },
    optDotCorrect: { backgroundColor: theme.success, borderColor: theme.success },
    optDotIncorrect: { backgroundColor: theme.danger, borderColor: theme.danger },

    optTextBase: { color: theme.textSecondary, fontSize: 12 },
    optTextCorrect: { color: theme.success, fontSize: 12, fontWeight: 'bold' },
    optTextIncorrect: { color: theme.danger, fontSize: 12, fontWeight: 'bold' },

    codeCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
    codeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    codeIdxBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.primary },
    codeIdxText: { color: theme.primary, fontWeight: 'bold', fontSize: 12 },
    codeQText: { color: theme.text, fontWeight: 'bold', fontSize: 14 },
    codeLangText: { color: theme.textSecondary, fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
    codeBody: { backgroundColor: theme.background, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
    codeLabel: { color: theme.textSecondary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
    codeScroll: { backgroundColor: '#000', padding: 10, borderRadius: 6 },
    codeContent: { color: theme.primary, fontFamily: 'monospace', fontSize: 12 }
});
