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
    Modal,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import {
    loginUser,
    clearError,
    reactivateAccount,
    checkSessionStatus,
    requestDeviceTransferOTP,
    clearSessionConflict,
    requestOTP,
} from '@/store/slices/authSlice';
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
    const {
        isLoading,
        error,
        isAuthenticated,
        user,
        vendorOnboardingStatus,
        sessionConflict,
    } = useAppSelector((state) => state.auth);

    // Local state
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [fadeAnim] = useState(new Animated.Value(0));

    // Reactivate account state
    const [showReactivateModal, setShowReactivateModal] = useState(false);
    const [deactivatedPhone, setDeactivatedPhone] = useState('');
    const [isReactivating, setIsReactivating] = useState(false);
    const [reactivateError, setReactivateError] = useState<string | null>(null);

    // Device conflict modal state
    const [showDeviceConflictModal, setShowDeviceConflictModal] = useState(false);
    const [isRequestingTransferOTP, setIsRequestingTransferOTP] = useState(false);

    // OTP not verified modal state (for customers who signed up but didn't verify)
    const [showNotVerifiedModal, setShowNotVerifiedModal] = useState(false);
    const [notVerifiedPhone, setNotVerifiedPhone] = useState('');
    const [isRequestingVerifyOTP, setIsRequestingVerifyOTP] = useState(false);

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

            // Step 1: Check session status before login
            const sessionResult = await dispatch(checkSessionStatus({
                phone: normalizedPhone,
            })).unwrap();

            // Check if login is blocked due to active service
            if (sessionResult.hasActiveService) {
                const serviceTypeText = sessionResult.activeServiceType === 'service_request'
                    ? 'service request'
                    : sessionResult.activeServiceType === 'pending_proposal'
                        ? 'pending proposal'
                        : 'active job';

                showToast({
                    type: 'error',
                    title: 'Login Blocked',
                    message: `This account has an active ${serviceTypeText} on "${sessionResult.existingDeviceName || 'another device'}". Please complete or cancel it first.`,
                    duration: 5000,
                });
                return;
            }

            // Check if session exists on another device (requires OTP transfer)
            if (sessionResult.hasExistingSession && sessionResult.requiresOtp) {
                // Show device conflict modal
                setShowDeviceConflictModal(true);
                return;
            }

            // No conflicts - proceed with normal login
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
            // Check if account is deactivated
            if (err?.includes?.('deactivated') || err === 'Account is deactivated') {
                setDeactivatedPhone(normalizePhoneNumber(phoneNumber));
                setShowReactivateModal(true);
                // Clear the error so toast doesn't show for deactivated case
                dispatch(clearError());
            }
            // Check if OTP not verified (customer signed up but didn't verify)
            else if (err?.includes?.('not verified') || err === 'Account not verified. Please verify your phone number.') {
                setNotVerifiedPhone(normalizePhoneNumber(phoneNumber));
                setShowNotVerifiedModal(true);
                // Clear the error so toast doesn't show for this case
                dispatch(clearError());
            }
            // Other errors are handled by useEffect showing the error toast
        }
    };

    // Handle device transfer - request OTP
    const handleProceedWithTransfer = async () => {
        setIsRequestingTransferOTP(true);

        try {
            const normalizedPhone = normalizePhoneNumber(phoneNumber);

            // Request OTP for device transfer
            await dispatch(requestDeviceTransferOTP({
                phone: normalizedPhone,
                password: password,
            })).unwrap();

            // Close modal and navigate to OTP screen
            setShowDeviceConflictModal(false);

            router.push({
                pathname: '/(auth)/device-transfer-otp',
                params: {
                    phone: normalizedPhone,
                },
            });
        } catch (err: any) {
            showToast({
                type: 'error',
                title: 'Failed to Send OTP',
                message: typeof err === 'string' ? err : 'Could not send OTP. Please try again.',
            });
        } finally {
            setIsRequestingTransferOTP(false);
        }
    };

    // Close device conflict modal
    const handleCloseDeviceConflictModal = () => {
        setShowDeviceConflictModal(false);
        dispatch(clearSessionConflict());
    };

    // Handle reactivate account
    const handleReactivate = async () => {
        setIsReactivating(true);
        setReactivateError(null);

        try {
            await dispatch(reactivateAccount({
                phone: deactivatedPhone,
                password: password,
            })).unwrap();

            setShowReactivateModal(false);
            showToast({
                type: 'success',
                title: 'Account Reactivated',
                message: 'Welcome back! Your account is now active.',
            });
            // Navigation handled by existing useEffect
        } catch (error: any) {
            const message = typeof error === 'string'
                ? error
                : error?.message || 'Failed to reactivate account';
            setReactivateError(message);
        } finally {
            setIsReactivating(false);
        }
    };

    const handleCloseReactivateModal = () => {
        setShowReactivateModal(false);
        setDeactivatedPhone('');
        setReactivateError(null);
    };

    // Handle verify OTP for unverified accounts
    const handleVerifyUnverifiedAccount = async () => {
        setIsRequestingVerifyOTP(true);

        try {
            // Store phone before clearing
            const phoneToVerify = notVerifiedPhone;

            // Request OTP for the unverified phone
            await dispatch(requestOTP(phoneToVerify)).unwrap();

            // Close modal first
            setShowNotVerifiedModal(false);
            setNotVerifiedPhone('');

            // Navigate to OTP screen with stored phone
            router.push({
                pathname: '/(auth)/otp-login',
                params: {
                    phone: phoneToVerify,
                },
            });
        } catch (err: any) {
            showToast({
                type: 'error',
                title: 'Failed to Send OTP',
                message: typeof err === 'string' ? err : 'Could not send OTP. Please try again.',
            });
        } finally {
            setIsRequestingVerifyOTP(false);
        }
    };

    const handleCloseNotVerifiedModal = () => {
        setShowNotVerifiedModal(false);
        setNotVerifiedPhone('');
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
                    keyboardShouldPersistTaps="handled"
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
                                    placeholderTextColor="#94a3b8"
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
                            onPress={() => router.push('/(auth)/forgot-password')}
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

            {/* Reactivate Account Modal */}
            <Modal
                visible={showReactivateModal}
                transparent
                animationType="fade"
                onRequestClose={handleCloseReactivateModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <Ionicons name="refresh-circle" size={48} color="#f59e0b" />
                        </View>

                        <Text type="title" style={styles.modalTitle}>Account Deactivated</Text>
                        <Text type="body" style={styles.modalDescription}>
                            Your account has been deactivated. Would you like to reactivate it and continue using RefynHome?
                        </Text>

                        {reactivateError && (
                            <Text type="caption" style={styles.errorText}>{reactivateError}</Text>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={handleCloseReactivateModal}
                                disabled={isReactivating}
                            >
                                <Text type="body" style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.reactivateButton,
                                    isReactivating && styles.reactivateButtonDisabled
                                ]}
                                onPress={handleReactivate}
                                disabled={isReactivating}
                            >
                                {isReactivating ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text type="body" style={styles.reactivateButtonText}>Reactivate</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Device Conflict Modal - Shows when user is logged in on another device */}
            <Modal
                visible={showDeviceConflictModal}
                transparent
                animationType="fade"
                onRequestClose={handleCloseDeviceConflictModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalIconContainer, styles.deviceConflictIconBg]}>
                            <Ionicons name="phone-portrait-outline" size={48} color="#2563EB" />
                        </View>

                        <Text type="title" style={styles.modalTitle}>Session Active</Text>
                        <Text type="body" style={styles.modalDescription}>
                            This account is currently logged in on{' '}
                            <Text type="bodySemiBold">
                                {sessionConflict?.existingDeviceName || 'another device'}
                            </Text>
                            .{'\n\n'}
                            Logging in here will log out the other device. An OTP will be sent to verify this action.
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={handleCloseDeviceConflictModal}
                                disabled={isRequestingTransferOTP}
                            >
                                <Text type="body" style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.proceedButton,
                                    isRequestingTransferOTP && styles.proceedButtonDisabled
                                ]}
                                onPress={handleProceedWithTransfer}
                                disabled={isRequestingTransferOTP}
                            >
                                {isRequestingTransferOTP ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text type="body" style={styles.proceedButtonText}>Proceed</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* OTP Not Verified Modal - Shows when customer signed up but didn't verify OTP */}
            <Modal
                visible={showNotVerifiedModal}
                transparent
                animationType="fade"
                onRequestClose={handleCloseNotVerifiedModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalIconContainer, styles.notVerifiedIconBg]}>
                            <Ionicons name="mail-unread-outline" size={48} color="#ef4444" />
                        </View>

                        <Text type="title" style={styles.modalTitle}>Verification Required</Text>
                        <Text type="body" style={styles.modalDescription}>
                            Your account hasn't been verified yet. Please verify your phone number to continue using RefynHome.
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={handleCloseNotVerifiedModal}
                                disabled={isRequestingVerifyOTP}
                            >
                                <Text type="body" style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.verifyButton,
                                    isRequestingVerifyOTP && styles.verifyButtonDisabled
                                ]}
                                onPress={handleVerifyUnverifiedAccount}
                                disabled={isRequestingVerifyOTP}
                            >
                                {isRequestingVerifyOTP ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text type="body" style={styles.verifyButtonText}>Verify Now</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    // Reactivate Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: moderateScale(24),
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: moderateScale(24),
        width: '100%',
        maxWidth: moderateScale(340),
        alignItems: 'center',
    },
    modalIconContainer: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(40),
        backgroundColor: '#fef3c7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: moderateScale(16),
    },
    modalTitle: {
        fontSize: moderateScale(18),
        color: '#1e293b',
        marginBottom: moderateScale(8),
        textAlign: 'center',
    },
    modalDescription: {
        fontSize: moderateScale(14),
        color: '#64748b',
        textAlign: 'center',
        marginBottom: moderateScale(20),
        lineHeight: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: moderateScale(12),
        width: '100%',
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: moderateScale(12),
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
    },
    modalCancelText: {
        color: '#64748b',
        fontWeight: '600',
    },
    reactivateButton: {
        flex: 1,
        paddingVertical: moderateScale(12),
        borderRadius: 8,
        backgroundColor: '#f59e0b',
        alignItems: 'center',
    },
    reactivateButtonDisabled: {
        backgroundColor: '#fcd34d',
    },
    reactivateButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    errorText: {
        color: '#ef4444',
        marginBottom: moderateScale(12),
        textAlign: 'center',
    },
    // Device Conflict Modal Styles
    deviceConflictIconBg: {
        backgroundColor: '#dbeafe',
    },
    proceedButton: {
        flex: 1,
        paddingVertical: moderateScale(12),
        borderRadius: 8,
        backgroundColor: '#2563EB',
        alignItems: 'center',
    },
    proceedButtonDisabled: {
        backgroundColor: '#93c5fd',
    },
    proceedButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    // Not Verified Modal Styles
    notVerifiedIconBg: {
        backgroundColor: '#fee2e2',
    },
    verifyButton: {
        flex: 1,
        paddingVertical: moderateScale(12),
        borderRadius: 8,
        backgroundColor: '#ef4444',
        alignItems: 'center',
    },
    verifyButtonDisabled: {
        backgroundColor: '#fca5a5',
    },
    verifyButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});
