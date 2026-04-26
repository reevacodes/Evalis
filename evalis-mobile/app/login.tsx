import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import API from '../src/api/client';

export default function LoginScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [forgotMessage, setForgotMessage] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState('');
    const [collegeEmail, setCollegeEmail] = useState('');
    const [collegeName, setCollegeName] = useState('');
    const [studentId, setStudentId] = useState('');
    const [semester, setSemester] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleForgotPasswordSubmit = async () => {
        if (!email) {
            Alert.alert("Missing Email", "Please enter your email to reset your password.");
            return;
        }
        setLoading(true);
        try {
            const res = await API.post('/auth/forgot-password', { email });
            setForgotMessage(res.data.message || "If the email is registered, a new password will be sent.");
        } catch (error) {
            setForgotMessage("Failed to send reset request.");
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async () => {
        if (!email || !password || (!isLogin && !name)) {
            Alert.alert("Authentication Error", "Please complete all fields to proceed.");
            return;
        }

        setLoading(true);
        try {
            // First: Route Signup Sequence if necessary
            if (!isLogin) {
                await API.post('/auth/signup', { 
                    email, 
                    password, 
                    role: 'student', 
                    name,
                    college_email: collegeEmail || null,
                    college_name: collegeName || null,
                    student_id: studentId || null,
                    semester: semester ? parseInt(semester) : null
                });
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
        <View style={styles.container}>
            {/* Background Blobs (Simulated with absolute LinearGradients) */}
            <View style={styles.blobTop} />
            <View style={styles.blobBottom} />

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    
                    {/* Brand & Hero Typography */}
                    <View style={styles.heroSection}>
                        <View style={styles.logoRow}>
                            <Image 
                                source={require('../assets/images/evalis_logo_transparent.png')} 
                                style={styles.evalisLogo} 
                                resizeMode="contain"
                            />
                            <Text style={styles.logoText}>EVALIS</Text>
                        </View>
                        
                        <View style={styles.taglineContainer}>
                            <Text style={styles.taglineWordBlue}>Build.</Text>
                            <Text style={styles.taglineWordWhite}>Evaluate.</Text>
                            <Text style={styles.taglineWordPink}>Scale.</Text>
                        </View>
                        
                        <Text style={styles.heroSubText}>The ultimate assessment portal.</Text>
                        <Text style={styles.heroDescText}>Experience frictionless code execution and analytics, built exclusively for MIET.</Text>
                    </View>

                    {/* Auth Modal Card */}
                    <View style={styles.modalCardWrapper}>
                        <View style={styles.partnerContainer}>
                            <View style={styles.partnerBox}>
                                <Image 
                                    source={require('../assets/images/miet_logo_transparent.png')} 
                                    style={styles.mietLogo} 
                                    resizeMode="contain"
                                />
                            </View>
                        </View>

                        <LinearGradient
                            colors={['rgba(59,130,246,0.15)', 'rgba(168,85,247,0.15)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.modalCardBackground}
                        />
                        <View style={styles.modalCard}>
                            <Text style={styles.title}>
                                {isForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome back' : 'Create account')}
                            </Text>

                            {isForgotPassword ? (
                                <View style={styles.form}>
                                    {forgotMessage ? (
                                        <View style={styles.successMessage}>
                                            <Text style={styles.successMessageText}>{forgotMessage}</Text>
                                        </View>
                                    ) : null}

                                    <TextInput 
                                        style={styles.input}
                                        placeholder="Email"
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />

                                    <TouchableOpacity 
                                        style={styles.button} 
                                        onPress={handleForgotPasswordSubmit}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="black" />
                                        ) : (
                                            <Text style={styles.buttonText}>Send New Password</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.forgotBtn} onPress={() => setIsForgotPassword(false)}>
                                        <Text style={styles.forgotBtnText}>Back to login</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.form}>
                                {!isLogin && (
                                    <>
                                        <TextInput 
                                            style={styles.input}
                                            placeholder="Full Name"
                                            placeholderTextColor="rgba(255,255,255,0.4)"
                                            value={name}
                                            onChangeText={setName}
                                            autoCapitalize="words"
                                        />
                                        <View style={styles.institutionalBox}>
                                            <Text style={styles.institutionalLabel}>Institutional Details</Text>
                                            <TextInput 
                                                style={styles.input}
                                                placeholder="College Email Address"
                                                placeholderTextColor="rgba(255,255,255,0.4)"
                                                value={collegeEmail}
                                                onChangeText={setCollegeEmail}
                                                autoCapitalize="none"
                                                keyboardType="email-address"
                                            />
                                            <TextInput 
                                                style={styles.input}
                                                placeholder="College / University Name"
                                                placeholderTextColor="rgba(255,255,255,0.4)"
                                                value={collegeName}
                                                onChangeText={setCollegeName}
                                            />
                                            <View style={{flexDirection: 'row', gap: 12}}>
                                                <TextInput 
                                                    style={[styles.input, { flex: 1 }]}
                                                    placeholder="Student ID / Roll No."
                                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                                    value={studentId}
                                                    onChangeText={setStudentId}
                                                />
                                                <TextInput 
                                                    style={[styles.input, { width: 100 }]}
                                                    placeholder="Semester"
                                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                                    value={semester}
                                                    onChangeText={setSemester}
                                                    keyboardType="numeric"
                                                />
                                            </View>
                                        </View>
                                    </>
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

                                <View style={styles.passwordContainer}>
                                    <TextInput 
                                        style={styles.passwordInput}
                                        placeholder="Password"
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                    <TouchableOpacity 
                                        style={styles.eyeIcon} 
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Ionicons 
                                            name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                            size={20} 
                                            color="rgba(255,255,255,0.4)" 
                                        />
                                    </TouchableOpacity>
                                </View>

                                {isLogin && (
                                    <View style={styles.forgotRow}>
                                        <TouchableOpacity onPress={() => setIsForgotPassword(true)}>
                                            <Text style={styles.forgotText}>Forgot password?</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

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
                            )}

                            <View style={styles.toggleContainer}>
                                <Text style={styles.toggleText}>
                                    {isLogin ? "Don’t have an account? " : "Already have an account? "}
                                    <Text style={styles.toggleLink} onPress={() => { setIsLogin(!isLogin); setIsForgotPassword(false); }}>
                                        {isLogin ? "Sign up" : "Login"}
                                    </Text>
                                </Text>
                            </View>
                        </View>
                    </View>
                    
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505', 
        position: 'relative'
    },
    blobTop: {
        position: 'absolute',
        top: -100,
        left: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(37,99,235,0.15)',
        transform: [{ scale: 1.5 }]
    },
    blobBottom: {
        position: 'absolute',
        bottom: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(147,51,234,0.15)',
        transform: [{ scale: 1.5 }]
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: 80,
        paddingBottom: 40,
    },
    heroSection: {
        marginBottom: 40,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    evalisLogo: {
        width: 48,
        height: 48,
        marginRight: 12,
    },
    logoText: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: 4,
        color: 'white',
        textShadowColor: 'rgba(255,255,255,0.2)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10
    },
    taglineContainer: {
        marginBottom: 20,
    },
    taglineWordBlue: {
        fontSize: 56,
        fontWeight: '900',
        lineHeight: 60,
        color: '#60a5fa', // tailwind blue-400
    },
    taglineWordWhite: {
        fontSize: 56,
        fontWeight: '900',
        lineHeight: 60,
        color: 'white',
    },
    taglineWordPink: {
        fontSize: 56,
        fontWeight: '900',
        lineHeight: 60,
        color: '#c084fc', // tailwind purple-400
    },
    heroSubText: {
        fontSize: 18,
        color: '#9ca3af',
        fontWeight: '300',
        marginBottom: 8,
    },
    heroDescText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '300',
        lineHeight: 22,
    },
    modalCardWrapper: {
        position: 'relative',
        borderRadius: 24,
        marginTop: 20,
    },
    partnerContainer: {
        alignItems: 'center',
        marginBottom: -20, // Overlay on top of the card
        zIndex: 10,
    },
    partnerBox: {
        backgroundColor: 'rgba(226,232,240,0.95)', // slate-200/95 equivalent
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    mietLogo: {
        height: 40,
        width: 120,
    },
    modalCardBackground: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
    },
    modalCard: {
        backgroundColor: 'rgba(11,15,25,0.95)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 24,
        padding: 32,
        paddingTop: 40, // extra padding for the partner logo overlay
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
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: 'white',
        fontSize: 16,
        marginBottom: 16, 
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        marginBottom: 16,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: 'white',
        fontSize: 16,
    },
    eyeIcon: {
        padding: 14,
    },
    button: {
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
    forgotRow: {
        alignItems: 'flex-end',
        marginTop: -8,
        marginBottom: 8,
    },
    forgotText: {
        color: '#9ca3af',
        fontSize: 14,
    },
    forgotBtn: {
        alignItems: 'center',
        marginTop: 12,
    },
    forgotBtnText: {
        color: '#60a5fa',
        fontSize: 14,
        fontWeight: '500',
    },
    successMessage: {
        backgroundColor: 'rgba(34,197,94,0.1)',
        borderColor: 'rgba(34,197,94,0.2)',
        borderWidth: 1,
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    successMessageText: {
        color: '#4ade80',
        fontSize: 14,
        textAlign: 'center',
    },
    toggleContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    toggleText: {
        color: '#9ca3af',
        fontSize: 14,
    },
    toggleLink: {
        color: 'white', 
        fontWeight: 'bold',
    },
    institutionalBox: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 16,
        paddingBottom: 0,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 16,
    },
    institutionalLabel: {
        color: '#9ca3af',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    }
});
