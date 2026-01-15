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
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from 'react-native-size-matters';
import Text from '@/components/common/Text';
import PasswordInput from '@/components/common/PasswordInput';
import { useToast } from '@/contexts/ToastContext';
import { normalizePhoneNumber } from '@/utils/validation';
import { authService } from '@/services/authService';

type Step = 'phone' | 'otp';

export default function ForgotPassword() {
    const router = useRouter();
    const { showToast } = useToast();

    // Step state
    const [step, setStep] = useState<Step>('phone');

    // Form state
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Loading states
    const [isLoading, setIsLoading] = useState(false);

    // Resend timer
    const [resendTimer, setResendTimer] = useState(0);
    const [canResend, setCanResend] = useState(false);

    // Animation
    const [fadeAnim] = useState(new Animated.Value(0));

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

    // Handle Send OTP
    const handleSendOTP = async () => {
        if (phoneNumber.length < 10) {
            showToast({
                type: 'error',
                title: 'Invalid Phone',
                message: 'Please enter a valid phone number',
            });
            return;
        }

        setIsLoading(true);
        try {
            const normalizedPhone = normalizePhoneNumber(phoneNumber);
            await authService.forgotPassword(normalizedPhone);

            showToast({
                type: 'success',
                title: 'OTP Sent',
                message: 'Check your phone for the verification code',
            });

            setStep('otp');
            setResendTimer(60);
            setCanResend(false);
        } catch (error: any) {
            const message = error.response?.data?.message || error.response?.data?.detail || 'Failed to send OTP. Please try again.';
            showToast({
                type: 'error',
                title: 'Error',
                message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Resend OTP
    const handleResendOTP = async () => {
        if (!canResend) {
            showToast({
                type: 'info',
                title: 'Please Wait',
                message: `You can resend OTP in ${resendTimer} seconds`,
            });
            return;
        }

        setIsLoading(true);
        try {
            const normalizedPhone = normalizePhoneNumber(phoneNumber);
            await authService.forgotPassword(normalizedPhone);

            setResendTimer(60);
            setCanResend(false);
            showToast({
                type: 'success',
                title: 'OTP Resent',
                message: 'A new code has been sent to your phone',
            });
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to resend OTP';
            showToast({
                type: 'error',
                title: 'Error',
                message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Reset Password
    const handleResetPassword = async () => {
        // Validation
        if (otp.length !== 6) {
            showToast({
                type: 'error',
                title: 'Invalid OTP',
                message: 'Please enter a valid 6-digit OTP',
            });
            return;
        }

        if (newPassword.length < 8) {
            showToast({
                type: 'error',
                title: 'Invalid Password',
                message: 'Password must be at least 8 characters',
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast({
                type: 'error',
                title: 'Password Mismatch',
                message: 'Passwords do not match',
            });
            return;
        }

        setIsLoading(true);
        try {
            const normalizedPhone = normalizePhoneNumber(phoneNumber);
            await authService.resetPassword(normalizedPhone, otp, newPassword);

            showToast({
                type: 'success',
                title: 'Password Reset',
                message: 'Your password has been reset successfully',
            });

            // Navigate to login
            router.replace('/(auth)/login');
        } catch (error: any) {
            const message = error.response?.data?.message || error.response?.data?.detail || 'Failed to reset password. Please try again.';
            showToast({
                type: 'error',
                title: 'Error',
                message,
            });
        } finally {
            setIsLoading(false);
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
                    onPress={() => step === 'otp' ? setStep('phone') : router.back()}
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
                            <Ionicons name="lock-open" size={36} color="#fff" />
                        </LinearGradient>
                    </View>
                    <Text type='title' style={styles.appName}>
                        {step === 'phone' ? 'Forgot Password' : 'Reset Password'}
                    </Text>
                    <Text type='body2' style={styles.tagline}>
                        {step === 'phone'
                            ? 'Enter your phone to receive OTP'
                            : 'Enter OTP and new password'}
                    </Text>
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.formContainer}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
                        {step === 'phone' ? (
                            <>
                                {/* Phone Input Step */}
                                <View style={styles.welcomeSection}>
                                    <Text type='bodySemiBold' style={styles.welcomeTitle}>
                                        Reset Your Password
                                    </Text>
                                    <Text type='body2' style={styles.welcomeSubtitle}>
                                        Enter your registered phone number and we'll send you a verification code.
                                    </Text>
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text type='body2' style={styles.inputLabel}>Phone Number</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="call-outline" size={20} color="#64748b" style={styles.inputIcon} />
                                        <TextInput
                                            placeholder="03XX XXXXXXX"
                                            placeholderTextColor="#94a3b8"
                                            value={phoneNumber}
                                            onChangeText={setPhoneNumber}
                                            keyboardType="phone-pad"
                                            style={styles.input}
                                            maxLength={11}
                                        />
                                    </View>
                                </View>

                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        onPress={handleSendOTP}
                                        disabled={phoneNumber.length < 10 || isLoading}
                                        activeOpacity={0.8}
                                        style={styles.gradientButton}
                                    >
                                        <LinearGradient
                                            colors={
                                                phoneNumber.length < 10 || isLoading
                                                    ? ['#94a3b8', '#94a3b8']
                                                    : ['#2563EB', '#F97316']
                                            }
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.gradientButtonInner}
                                        >
                                            {isLoading ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                                            )}
                                            <Text type='body2' style={styles.buttonText}>
                                                {isLoading ? 'Sending...' : 'Send OTP'}
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                {/* OTP & Password Step */}
                                <View style={styles.welcomeSection}>
                                    <Text type='bodySemiBold' style={styles.welcomeTitle}>
                                        Enter Verification Code
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
                                    <Text type='body2' style={styles.inputLabel}>Verification Code</Text>
                                    <View style={styles.otpInputWrapper}>
                                        <TextInput
                                            placeholder="6-digit code"
                                            placeholderTextColor="#94a3b8"
                                            value={otp}
                                            onChangeText={setOtp}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            style={styles.otpInput}
                                            autoFocus
                                        />
                                    </View>
                                </View>

                                {/* Resend OTP */}
                                <TouchableOpacity
                                    onPress={handleResendOTP}
                                    disabled={!canResend || isLoading}
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

                                {/* New Password */}
                                <View style={styles.inputContainer}>
                                    <Text type='body2' style={styles.inputLabel}>New Password</Text>
                                    <PasswordInput
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        placeholder="Enter new password"
                                        style={styles.passwordInput}
                                    />
                                </View>

                                {/* Confirm Password */}
                                <View style={styles.inputContainer}>
                                    <Text type='body2' style={styles.inputLabel}>Confirm Password</Text>
                                    <PasswordInput
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholder="Confirm new password"
                                        style={styles.passwordInput}
                                    />
                                </View>

                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        onPress={handleResetPassword}
                                        disabled={otp.length !== 6 || newPassword.length < 8 || isLoading}
                                        activeOpacity={0.8}
                                        style={styles.gradientButton}
                                    >
                                        <LinearGradient
                                            colors={
                                                otp.length !== 6 || newPassword.length < 8 || isLoading
                                                    ? ['#94a3b8', '#94a3b8']
                                                    : ['#2563EB', '#F97316']
                                            }
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.gradientButtonInner}
                                        >
                                            {isLoading ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                                            )}
                                            <Text type='body2' style={styles.buttonText}>
                                                {isLoading ? 'Resetting...' : 'Reset Password'}
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {/* Back to Login */}
                        <TouchableOpacity
                            onPress={() => router.replace('/(auth)/login')}
                            style={styles.backToLoginContainer}
                        >
                            <Text type='body2' style={styles.backToLoginText}>
                                Remember your password?{' '}
                                <Text type='bodySemiBold' style={styles.backToLoginLink}>
                                    Login
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
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
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
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
        textAlign: 'center',
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
        marginBottom: moderateScale(16),
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
        color: '#0f172a',
    },
    otpInputWrapper: {
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
        justifyContent: 'center',
    },
    otpInput: {
        width: '100%',
        fontSize: moderateScale(18),
        color: '#0f172a',
        letterSpacing: 8,
        textAlign: 'center',
    },
    passwordInput: {
        height: moderateScale(56),
        borderRadius: 16,
        backgroundColor: '#f8fafc',
        borderWidth: 1.6,
        borderColor: '#e2e8f0',
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
    backToLoginContainer: {
        alignItems: 'center',
        marginTop: moderateScale(20),
    },
    backToLoginText: {
        fontSize: moderateScale(14),
        color: '#64748b',
    },
    backToLoginLink: {
        color: '#2563EB',
    },
});
