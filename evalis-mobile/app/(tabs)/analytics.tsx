import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { ProgressChart } from "react-native-chart-kit";
import API from '../../src/api/client';

const screenWidth = Dimensions.get("window").width;

export default function AnalyticsScreen() {
    const [loading, setLoading] = useState(true);
    
    // We will simulate real performance averages from past exams
    const [chartData, setChartData] = useState({
        labels: ["DSA", "DBMS", "OOSD", "Networks"],
        data: [0.85, 0.60, 0.90, 0.40]
    });

    useEffect(() => {
        // Attempt to fetch actual scores
        const compileAnalytics = async () => {
            try {
                // Future Implementation: Parse true results from `/exam` array grades
                // For now, this mounts the native SVGs safely
            } catch (err) {
                console.error(err);
            } finally {
                // Simulated API delay
                setTimeout(() => setLoading(false), 800);
            }
        };
        compileAnalytics();
    }, []);

    const chartConfig = {
        backgroundGradientFrom: "#0f172a",
        backgroundGradientTo: "#0f172a",
        color: (opacity = 1, index = 0) => {
            // Apply different colors based on ring index for beautiful Apple-style visuals
            const colors = [
                `rgba(99, 102, 241, ${opacity})`,   // Indigo
                `rgba(16, 185, 129, ${opacity})`,   // Emerald
                `rgba(245, 158, 11, ${opacity})`,   // Amber
                `rgba(239, 68, 68, ${opacity})`,    // Red
                `rgba(255, 255, 255, ${opacity})`
            ];
            return colors[index % colors.length];
        },
        strokeWidth: 10, // Width of the rings
        barPercentage: 0.5,
        useShadowColorFromDataset: false 
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Compiling Intelligence...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Performance Radar</Text>
                <Text style={styles.headerSubtitle}>Continuous Intelligence Tracking</Text>
            </View>

            <View style={styles.chartCard}>
                <Text style={styles.cardTitle}>Subject Mastery Core</Text>
                <ProgressChart
                    data={chartData}
                    width={screenWidth - 48} // Padding offset
                    height={220}
                    strokeWidth={12}
                    radius={32}
                    chartConfig={chartConfig}
                    hideLegend={false}
                    style={{
                        marginVertical: 8,
                        borderRadius: 16
                    }}
                />
            </View>

            <Text style={styles.sectionTitle}>Key Insights</Text>
            
            <View style={styles.insightCard}>
                <View style={styles.insightIconBox}><Text style={{fontSize: 20}}>⭐</Text></View>
                <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>Strongest Subject</Text>
                    <Text style={styles.insightDesc}>You are currently outperforming 85% of your class in <Text style={{color:'white', fontWeight: 'bold'}}>Object Oriented Systems Design (OOSD)</Text>.</Text>
                </View>
            </View>

            <View style={[styles.insightCard, { borderColor: '#ef444450' }]}>
                <View style={[styles.insightIconBox, { backgroundColor: '#ef444420' }]}><Text style={{fontSize: 20}}>⚠️</Text></View>
                <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>Vulnerability Detected</Text>
                    <Text style={styles.insightDesc}>Your mastery in <Text style={{color:'white', fontWeight: 'bold'}}>Computer Networks</Text> has dropped by 12% since the last test. I recommend running the Practice Arena.</Text>
                </View>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', padding: 24, paddingTop: 60 },
    center: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#6366f1', marginTop: 12, fontWeight: 'bold', letterSpacing: 1 },
    header: { marginBottom: 30 },
    headerTitle: { color: 'white', fontSize: 32, fontWeight: 'bold' },
    headerSubtitle: { color: '#64748b', fontSize: 14, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' },
    
    chartCard: { backgroundColor: '#0f172a', borderRadius: 24, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: '#1e293b', shadowColor: '#6366f1', shadowOpacity: 0.1, shadowRadius: 20 },
    cardTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
    
    sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
    
    insightCard: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
    insightIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fbbf2420', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    insightContent: { flex: 1 },
    insightTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    insightDesc: { color: '#94a3b8', fontSize: 13, lineHeight: 20 }
});
