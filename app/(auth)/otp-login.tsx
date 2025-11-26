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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from 'react-native-size-matters';
import Text from '@/components/common/Text';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import { verifyOTP, requestOTP, clearError } from '@/store/slices/authSlice';
import { useToast } from '@/contexts/ToastContext';

export default function OTPVerification() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const params = useLocalSearchParams();
    const { showToast } = useToast();

    // Get phone number from navigation params
    const phoneNumber = params.phone as string;

    // Redux state
    const { isLoading, error, isAuthenticated, user, vendorOnboardingStatus } = useAppSelector((state) => state.auth);

    // Local state
    const [otp, setOtp] = useState('');
    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(0));

    // Animation on mount
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    // Countdown timer for resend OTP
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    // Navigate after successful authentication
    useEffect(() => {
        if (isAuthenticated && user) {
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
                title: 'Verification Failed',
                message: error,
            });
            dispatch(clearError());
        }
    }, [error]);

    const handleVerifyOTP = async () => {
        if (otp.length !== 6) {
            showToast({
                type: 'error',
                title: 'Invalid OTP',
                message: 'Please enter a valid 6-digit OTP',
            });
            return;
        }

        try {
            await dispatch(
                verifyOTP({
                    phoneNumber: phoneNumber,
                    otp: otp,
                })
            ).unwrap();

            // Show success toast
            showToast({
                type: 'success',
                title: 'OTP Verified!',
                message: 'Welcome to RefynHome',
            });

            // Navigation handled by useEffect above
        } catch (err: any) {
            // Error handled by useEffect showing the error toast
            console.error('OTP verification error:', err);
        }
    };

    const handleResendOTP = async () => {
        if (!canResend) {
            showToast({
                type: 'info',
                title: 'Please Wait',
                message: `You can resend OTP in ${resendTimer} seconds`,
            });
            return;
        }

        try {
            await dispatch(requestOTP(phoneNumber)).unwrap();
            setResendTimer(60);
            setCanResend(false);
            showToast({
                type: 'success',
                title: 'OTP Resent',
                message: 'A new code has been sent to your phone',
            });
        } catch (err: any) {
            // Error handled by useEffect showing the error toast
            console.error('Resend OTP error:', err);
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
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    <View style={styles.logoContainer}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                            style={styles.logoCircle}
                        >
                            <Ionicons name="shield-checkmark" size={36} color="#fff" />
                        </LinearGradient>
                    </View>
                    <Text type='title' style={styles.appName}>Verify OTP</Text>
                    <Text type='body2' style={styles.tagline}>Enter the code sent to your phone</Text>
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
                                Verification Code
                            </Text>
                            <Text type='body2' style={styles.welcomeSubtitle}>
                                We've sent a 6-digit code to{'\n'}
                                <Text type='bodySemiBold' style={styles.phoneHighlight}>
                                    {phoneNumber}
                                </Text>
                            </Text>
                        </View>

                        {/* OTP Input */}
                        <View style={styles.inputContainer}>
                            <Text type='body2' style={styles.inputLabel}>Enter OTP</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons
                                    name="lock-closed-outline"
                                    size={20}
                                    color="#F97316"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    placeholder="Enter 6-digit OTP"
                                    value={otp}
                                    onChangeText={setOtp}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    style={styles.input}
                                    autoFocus
                                />
                            </View>
                        </View>

                        {/* Resend OTP */}
                        <TouchableOpacity
                            onPress={handleResendOTP}
                            disabled={!canResend}
                            style={styles.resendContainer}
                        >
                            <Text type='body2' style={styles.resendText}>
                                Didn't receive code?{' '}
                                <Text
                                    type='bodySemiBold'
                                    style={[
                                        styles.resendLink,
                                        !canResend && styles.resendLinkDisabled
                                    ]}
                                >
                                    {!canResend ? `Resend in ${resendTimer}s` : 'Resend'}
                                </Text>
                            </Text>
                        </TouchableOpacity>

                        {/* Verify Button */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                onPress={handleVerifyOTP}
                                disabled={otp.length !== 6 || isLoading}
                                activeOpacity={0.8}
                                style={styles.gradientButton}
                            >
                                <LinearGradient
                                    colors={
                                        otp.length !== 6 || isLoading
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
                                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                                    )}
                                    <Text type='body2' style={styles.buttonText}>
                                        {isLoading ? 'Verifying...' : 'Verify & Continue'}
                                    </Text>
                                </LinearGradient>
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
    backButton: {
        position: 'absolute',
        top: moderateScale(10),
        left: moderateScale(16),
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
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
        alignItems: 'center',
    },
    welcomeTitle: {
        fontSize: moderateScale(18),
        color: '#1e293b',
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: moderateScale(14),
        color: '#64748b',
        lineHeight: 20,
        textAlign: 'center',
    },
    phoneHighlight: {
        color: '#2563EB',
    },
    inputContainer: {
        marginBottom: moderateScale(12),
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
        flex: 1,
        fontSize: moderateScale(16),
        fontWeight: '600',
        color: '#0f172a',
        letterSpacing: 2,
        textAlign: 'center',
    },
    resendContainer: {
        alignItems: 'center',
        marginBottom: moderateScale(20),
    },
    resendText: {
        fontSize: moderateScale(13),
        color: '#64748b',
    },
    resendLink: {
        color: '#2563EB',
        fontSize: moderateScale(14),
        fontWeight: '600',
    },
    resendLinkDisabled: {
        color: '#94a3b8',
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
