import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import API from '../../src/api/client';

export default function PracticeScreen() {
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

    useEffect(() => {
        const fetchPracticeData = async () => {
            try {
                // Fetch completed exams
                const res = await API.get('/exam');
                const rawData = res.data;
                const validExamsArray = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.exams) ? rawData.exams : []);
                
                const exams = validExamsArray.filter((e: any) => e.time_status === 'expired' || e.has_submitted);
                
                let allQuestions: any[] = [];
                for (const exam of exams.slice(0, 3)) { // Pull from recent exams
                    try {
                        const examDetails = await API.get(`/exam/${exam._id}`);
                        if (examDetails.data.questions) {
                            const mcqs = examDetails.data.questions.filter((q: any) => q.type === 'mcq' || q.options?.length > 0);
                            allQuestions = [...allQuestions, ...mcqs];
                        }
                    } catch (e) {
                         // Fallback logic
                    }
                }
                
                // Fallback Mock MCQs if no past exam data exists for the user yet
                if (allQuestions.length === 0) {
                    allQuestions = [
                        { _id: '1', question_text: 'What is the primary difference between a Stack and a Queue?', options: ['LIFO vs FIFO', 'Dynamic vs Static', 'Push vs Pop', 'None'], correct_answer: 'LIFO vs FIFO' },
                        { _id: '2', question_text: 'Which Time Complexity is the most optimal?', options: ['O(n^2)', 'O(1)', 'O(log n)', 'O(n)'], correct_answer: 'O(1)' },
                        { _id: '3', question_text: 'What does API stand for?', options: ['Application Programming Interface', 'Automated Process Integration', 'Asynchronous Promise Interpreter', 'Aligned Python Instructions'], correct_answer: 'Application Programming Interface' }
                    ];
                }
                
                setQuestions(allQuestions);
            } catch (err) {
                console.error("Failed fetching practice data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchPracticeData();
    }, []);

    const handleSelect = (option: string) => {
        if (isAnswerRevealed) return; // Prevent changing after answered
        setSelectedOption(option);
        setIsAnswerRevealed(true);
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(curr => curr + 1);
            setSelectedOption(null);
            setIsAnswerRevealed(false);
        } else {
            // Loop Back
            setCurrentIndex(0);
            setSelectedOption(null);
            setIsAnswerRevealed(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>;
    if (questions.length === 0) return <View style={styles.center}><Text style={styles.emptyText}>No Practice Questions available right now.</Text></View>;

    const currentQuestion = questions[currentIndex];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Rapid Fire Practice</Text>
                <Text style={styles.progressText}>Question {currentIndex + 1} of {questions.length}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
                
                <View style={styles.optionsContainer}>
                    {currentQuestion.options?.map((opt: string, index: number) => {
                        
                        let optStyle = styles.optionCard;
                        let textStyle = styles.optionText;

                        if (isAnswerRevealed) {
                            if (opt === currentQuestion.correct_answer) {
                                optStyle = styles.optionCorrect;
                                textStyle = styles.optionTextDark;
                            } else if (opt === selectedOption) {
                                optStyle = styles.optionWrong;
                                textStyle = styles.optionTextDark;
                            } else {
                                optStyle = styles.optionFaded;
                            }
                        } else if (selectedOption === opt) {
                            optStyle = styles.optionSelected;
                        }

                        return (
                            <TouchableOpacity 
                                key={index} 
                                style={optStyle}
                                onPress={() => handleSelect(opt)}
                                activeOpacity={0.8}
                            >
                                <Text style={textStyle}>{opt}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {isAnswerRevealed && (
                <TouchableOpacity style={styles.nextBtn} onPress={nextQuestion}>
                    <Text style={styles.nextBtnText}>{currentIndex === questions.length - 1 ? 'Start Over' : 'Next Question ➞'}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', padding: 24, paddingTop: 60 },
    center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#64748b', fontSize: 16 },
    header: { marginBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { color: 'white', fontSize: 28, fontWeight: 'bold' },
    progressText: { color: '#6366f1', fontSize: 14, fontWeight: 'bold' },
    card: { backgroundColor: '#0f172a', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#1e293b', minHeight: Dimensions.get('window').height * 0.45 },
    questionText: { color: 'white', fontSize: 20, fontWeight: 'bold', lineHeight: 30, marginBottom: 30 },
    optionsContainer: { gap: 12 },
    optionCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
    optionSelected: { backgroundColor: '#312e81', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#4338ca' },
    optionCorrect: { backgroundColor: '#10b981', padding: 16, borderRadius: 12, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 10 },
    optionWrong: { backgroundColor: '#ef4444', padding: 16, borderRadius: 12 },
    optionFaded: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, opacity: 0.5 },
    optionText: { color: 'white', fontSize: 16 },
    optionTextDark: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    nextBtn: { backgroundColor: '#6366f1', padding: 20, borderRadius: 16, marginTop: 'auto', marginBottom: 20, alignItems: 'center' },
    nextBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
