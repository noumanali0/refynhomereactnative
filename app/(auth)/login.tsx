import React, { useState, useEffect } from 'react';
import {
    View,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Animated,
    TextInput,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import { loginUser, clearError } from '@/store/slices/authSlice';
import { moderateScale } from 'react-native-size-matters';
import { normalizePhoneNumber } from '@/utils/validation';
import Text from '@/components/common/Text';
import PasswordInput from '@/components/common/PasswordInput';
import { useToast } from '@/contexts/ToastContext';

export default function Login() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { showToast } = useToast();

    // Redux state
    const { isLoading, error, isAuthenticated, user, vendorOnboardingStatus } = useAppSelector((state) => state.auth);

    // Local state
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [fadeAnim] = useState(new Animated.Value(0));

    // Animation
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    // Navigate after successful authentication
    useEffect(() => {
        if (isAuthenticated && user) {
            // Navigate based on role and vendor status
            if (user.role === 'customer') {
                router.replace('/(customer)/(home)');
            } else if (user.role === 'vendor') {
                const vendorVerified = user.vendorProfile?.verified === true;
                const needsOnboarding = vendorOnboardingStatus === 'in_progress';
                const pendingVerification = vendorOnboardingStatus === 'pending_verification';

                if (needsOnboarding) {
                    router.replace('/(shared)/vendor-setup');
                } else if (pendingVerification || !vendorVerified) {
                    router.replace('/(shared)/pending-verification');
                } else {
                    router.replace('/(vendor)/(servicerequests)');
                }
            }
        }
    }, [isAuthenticated, user, vendorOnboardingStatus]);

    // Show error toast
    useEffect(() => {
        if (error) {
            showToast({
                type: 'error',
                title: 'Login Failed',
                message: error,
            });
            dispatch(clearError());
        }
    }, [error]);

    // Handle Login with Password
    const handleLogin = async () => {
        // Validation
        if (phoneNumber.length < 10) {
            showToast({
                type: 'error',
                title: 'Invalid Phone',
                message: 'Please enter a valid phone number',
            });
            return;
        }

        if (password.length < 8) {
            showToast({
                type: 'error',
                title: 'Invalid Password',
                message: 'Password must be at least 8 characters',
            });
            return;
        }

        try {
            // Normalize phone number for API
            const normalizedPhone = normalizePhoneNumber(phoneNumber);

            // Dispatch login action
            await dispatch(loginUser({
                phone: normalizedPhone,
                password: password,
            })).unwrap();

            // Show success toast
            showToast({
                type: 'success',
                title: 'Login Successful',
                message: 'Welcome back!',
            });

            // Navigation handled by useEffect above
        } catch (err: any) {
            // Specific errors are handled by useEffect showing the error toast
        }
    };

    return (
        <View style={styles.container}>
            {/* Gradient Header Background */}
            <LinearGradient
                colors={['#2563EB', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <View style={styles.headerContent}>
                    <View style={styles.logoContainer}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                            style={styles.logoCircle}
                        >
                            <Ionicons name="home" size={40} color="#fff" />
                        </LinearGradient>
                    </View>
                    <Text type="title" style={styles.appName}>RefynHome</Text>
                    <Text type='body2' style={styles.tagline}>Your Home Service Partner</Text>
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.formContainer}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
                        {/* Welcome Text */}
                        <View style={styles.welcomeSection}>
                            <Text type='bodySemiBold' style={styles.welcomeTitle}>
                                Welcome Back!
                            </Text>
                            <Text type='body2' style={styles.welcomeSubtitle}>
                                Login to continue
                            </Text>
                        </View>

                        {/* Phone Number Input */}
                        <View style={styles.inputContainer}>
                            <Text type='body2' style={styles.inputLabel}>Phone Number</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons
                                    name="call-outline"
                                    size={20}
                                    color="#2563EB"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    placeholder="+92 300 1234567"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    keyboardType="phone-pad"
                                    autoComplete="tel"
                                    textContentType="telephoneNumber"
                                    style={styles.input}
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <PasswordInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter your password"
                            label="Password"
                            autoComplete="password"
                            textContentType="password"
                        />

                        {/* Forgot Password Link */}
                        <TouchableOpacity
                            style={styles.forgotPasswordContainer}
                            onPress={() => {
                                Alert.alert(
                                    'Forgot Password',
                                    'Password reset feature coming soon! Please contact support.'
                                );
                            }}
                        >
                            <Text type='body2' style={styles.forgotPasswordText}>
                                Forgot Password?
                            </Text>
                        </TouchableOpacity>

                        {/* Login Button */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                onPress={handleLogin}
                                disabled={phoneNumber.length < 10 || password.length < 8 || isLoading}
                                activeOpacity={0.8}
                                style={styles.gradientButton}
                            >
                                <LinearGradient
                                    colors={
                                        phoneNumber.length < 10 || password.length < 8 || isLoading
                                            ? ['#94a3b8', '#94a3b8']
                                            : ['#2563EB', '#F97316']
                                    }
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradientButtonInner}
                                >
                                    {isLoading ? (
                                        <Ionicons name="hourglass-outline" size={20} color="#fff" />
                                    ) : (
                                        <Ionicons name="log-in-outline" size={20} color="#fff" />
                                    )}
                                    <Text type='body2' style={styles.buttonText}>
                                        {isLoading ? 'Logging in...' : 'Login'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {/* Sign Up Link */}
                        <View style={styles.signupContainer}>
                            <Text type='body2' style={styles.signupText}>Don't have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                                <Text type='bodySemiBold' style={styles.signupLink}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Terms */}
                    <Text type='body2' style={styles.termsText}>
                        By continuing, you agree to our{'\n'}
                        <Text style={styles.termsLink}>Terms & Conditions</Text>
                        {' and '}
                        <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerGradient: {
        paddingBottom: moderateScale(40),
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginBottom: moderateScale(20)
    },
    headerContent: {
        alignItems: 'center',
        paddingTop: moderateScale(20),
    },
    logoContainer: {
        marginBottom: moderateScale(16),
    },
    logoCircle: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(40),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    appName: {
        fontSize: moderateScale(24),
        color: '#fff',
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    tagline: {
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
    },
    formContainer: {
        flex: 1,
        marginTop: moderateScale(-20),
    },
    scrollContent: {
        padding: moderateScale(20),
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: moderateScale(24),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    welcomeSection: {
        marginBottom: moderateScale(24),
    },
    welcomeTitle: {
        fontSize: moderateScale(18),
        color: '#1e293b',
        marginBottom: 6,
    },
    welcomeSubtitle: {
        fontSize: moderateScale(14),
        color: '#64748b',
        lineHeight: 20,
    },
    inputContainer: {
        marginBottom: moderateScale(20),
    },
    inputLabel: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        width: "100%",
        height: moderateScale(56),
        borderRadius: 16,
        backgroundColor: '#f8fafc',
        borderWidth: 1.6,
        borderColor: '#e2e8f0',
        paddingHorizontal: 16,
        alignContent: "center",
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
    },
    inputIcon: {
        marginRight: 14,
        opacity: 0.7,
    },
    input: {
        flexGrow: 1,
        flexShrink: 1,
        fontSize: moderateScale(15),
        color: '#0f172a',
        borderWidth: 0,
        textAlignVertical: 'center',
    },
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        marginTop: moderateScale(-10),
        marginBottom: moderateScale(10),
    },
    forgotPasswordText: {
        fontSize: moderateScale(13),
        color: '#2563EB',
        fontWeight: '600',
    },
    buttonContainer: {
        marginTop: moderateScale(8),
    },
    gradientButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    gradientButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: moderateScale(54),
        gap: 8,
    },
    buttonText: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: '#fff',
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: moderateScale(24),
    },
    signupText: {
        fontSize: moderateScale(14),
        color: '#64748b',
    },
    signupLink: {
        fontSize: moderateScale(14),
        color: '#2563EB',
    },
    termsText: {
        textAlign: 'center',
        fontSize: moderateScale(12),
        color: '#94a3b8',
        marginTop: moderateScale(20),
        lineHeight: 18,
    },
    termsLink: {
        color: '#2563EB',
        fontWeight: '600',
    },
});
