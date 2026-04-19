import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import API from '../src/api/client';

export default function LoginScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleAuth = async () => {
        if (!email || !password || (!isLogin && !name)) {
            Alert.alert("Authentication Error", "Please complete all fields to proceed.");
            return;
        }

        setLoading(true);
        try {
            // First: Route Signup Sequence if necessary
            if (!isLogin) {
                await API.post('/auth/signup', { email, password, role: 'student', name });
            }

            // Second: Chain standard JSON Login (Fixed 422 Error)
            const response = await API.post('/auth/login', { 
                email: email, 
                password: password 
            });

            if (response.data.access_token) {
                // Initialize Native Client Memory Blocks
                await AsyncStorage.setItem('token', response.data.access_token);
                
                // Pull Telemetry
                const userRes = await API.get('/auth/me', {
                    headers: { Authorization: `Bearer ${response.data.access_token}` }
                });
                await AsyncStorage.setItem('user', JSON.stringify(userRes.data));
                
                // Note: The Web version uses API.defaults.headers to inject auth globally
                // In React Native, our interceptor automatically pulls from AsyncStorage on every request!
                
                // Force Entry into Dashboard Ecosystem
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            console.error("Auth crash", error);
            const detail = error.response?.data?.detail || "Server error";
            Alert.alert(isLogin ? "Login Failed" : "Signup Failed", detail);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.modalCard}>
                    <Text style={styles.title}>{isLogin ? 'Welcome back' : 'Create account'}</Text>

                    <View style={styles.form}>
                        {/* Name Input - Only visible on Sign Up */}
                        {!isLogin && (
                            <TextInput 
                                style={styles.input}
                                placeholder="Full Name"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        )}

                        <TextInput 
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <TextInput 
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />

                        <TouchableOpacity 
                            style={styles.button} 
                            onPress={handleAuth}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="black" />
                            ) : (
                                <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Sign up'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.toggleContainer}>
                        <Text style={styles.toggleText}>
                            {isLogin ? "Don’t have an account? " : "Already have an account? "}
                            <Text style={styles.toggleLink} onPress={() => setIsLogin(!isLogin)}>
                                {isLogin ? "Sign up" : "Login"}
                            </Text>
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // Match Tailwind container bg-black/50 feel
        backgroundColor: '#000000', 
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    modalCard: {
        // Match Web EXACTLY: bg-[#0b0f19] border border-white/10 rounded-2xl p-8
        backgroundColor: '#0b0f19',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 24,
        padding: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: 'white',
        textAlign: 'center',
        marginBottom: 24,
    },
    form: {
        gap: 16,
    },
    input: {
        // Match Web: bg-white/5 border border-white/10 rounded-lg px-4 py-3
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: 'white',
        fontSize: 16,
        marginBottom: 16, // using margin fallback for React Native gap support
    },
    button: {
        // Match Web: bg-white text-black py-3 rounded-lg font-medium hover:opacity-90 transition mt-2
        backgroundColor: 'white',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: 'black',
        fontSize: 16,
        fontWeight: '500',
    },
    toggleContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    toggleText: {
        color: '#9ca3af', // text-gray-400
        fontSize: 14,
    },
    toggleLink: {
        color: 'white', // text-white
    }
});
