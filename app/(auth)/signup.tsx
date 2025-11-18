import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InputField } from '@/components/common/InputField';
import { moderateScale } from 'react-native-size-matters';
import Text from '@/components/common/Text';

export default function Signup() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        phoneNumber: '',
        email: '',
        otp: '',
    });
    const [otpSent, setOtpSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(0));

    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleSendOTP = () => {
        if (!formData.name || !formData.phoneNumber || !formData.email) {
            alert('Please fill all fields');
            return;
        }

        setIsLoading(true);
        setTimeout(() => {
            setOtpSent(true);
            setIsLoading(false);
        }, 1500);
    };

    const handleVerifyOTP = () => {
        if (formData.otp.length !== 6) return;

        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            // Navigate to role selection after signup
            router.push('/(auth)/role-selection');
        }, 1500);
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
                            <Ionicons name="person-add" size={36} color="#fff" />
                        </LinearGradient>
                    </View>
                    <Text type='title' style={styles.appName}>Create Account</Text>
                    <Text type='body2' style={styles.tagline}>Join RefynHome Today</Text>
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
                                {otpSent ? 'Verify OTP' : 'Sign Up'}
                            </Text>
                            <Text type='body2' style={styles.welcomeSubtitle}>
                                {otpSent
                                    ? `Enter the code sent to ${formData.phoneNumber}`
                                    : 'Create your account to get started'}
                            </Text>
                        </View>

                        {!otpSent ? (
                            <>
                                {/* Name Input */}
                                <View style={styles.inputContainer}>
                                    <Text type='body2' style={styles.inputLabel}>Full Name</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons
                                            name="person-outline"
                                            size={20}
                                            color="#2563EB"
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            placeholder="Enter your full name"
                                            value={formData.name}
                                            onChangeText={(text) =>
                                                setFormData({ ...formData, name: text })
                                            }
                                            style={styles.input}
                                        />
                                    </View>
                                </View>

                                {/* Phone Number Input */}
                                <View style={styles.inputContainer}>
                                    <Text type='body2' style={styles.inputLabel}>Phone Number</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons
                                            name="call-outline"
                                            size={20}
                                            color="#F97316"
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            placeholder="+92 300 1234567"
                                            value={formData.phoneNumber}
                                            onChangeText={(text) =>
                                                setFormData({ ...formData, phoneNumber: text })
                                            }
                                            keyboardType="phone-pad"
                                            style={styles.input}
                                        />
                                    </View>
                                </View>

                                {/* Email Input */}
                                <View style={styles.inputContainer}>
                                    <Text type='body2' style={styles.inputLabel}>Email Address (Optional)</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons
                                            name="mail-outline"
                                            size={20}
                                            color="#2563EB"
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            placeholder="your@email.com"
                                            value={formData.email}
                                            onChangeText={(text) =>
                                                setFormData({ ...formData, email: text })
                                            }
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            style={styles.input}
                                        />
                                    </View>
                                </View>
                            </>
                        ) : (
                            /* OTP Input */
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
                                        value={formData.otp}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, otp: text })
                                        }
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        style={styles.input}
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={handleSendOTP}
                                    style={styles.resendContainer}
                                >
                                    <Text type='body2' style={styles.resendText}>
                                        Didn't receive code?{' '}
                                        <Text type='bodySemiBold' style={styles.resendLink}>Resend</Text>
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Action Button */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                onPress={otpSent ? handleVerifyOTP : handleSendOTP}
                                disabled={isLoading}
                                activeOpacity={0.8}
                                style={styles.gradientButton}
                            >
                                <LinearGradient
                                    colors={['#2563EB', '#F97316']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradientButtonInner}
                                >
                                    {isLoading ? (
                                        <Ionicons name="hourglass-outline" size={20} color="#fff" />
                                    ) : (
                                        <Ionicons
                                            name={otpSent ? "checkmark-circle-outline" : "paper-plane-outline"}
                                            size={20}
                                            color="#fff"
                                        />
                                    )}
                                    <Text type='body2' style={styles.buttonText}>
                                        {isLoading
                                            ? 'Processing...'
                                            : otpSent
                                                ? 'Verify & Continue'
                                                : 'Send OTP'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {/* Login Link */}
                        <View style={styles.signupContainer}>
                            <Text type='body2' style={styles.signupText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                                <Text type='bodySemiBold' style={styles.signupLink}>Login</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Terms */}
                    <Text type='body2' style={styles.termsText}>
                        By signing up, you agree to our{'\n'}
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
        // fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    tagline: {
        // fontSize: moderateScale(14),
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
        // fontWeight: '700',
        color: '#1e293b',
        marginBottom: 6,
    },
    welcomeSubtitle: {
        // fontSize: moderateScale(14),
        color: '#64748b',
        lineHeight: 20,
    },
    inputContainer: {
        marginBottom: moderateScale(18),
    },
    inputLabel: {
        // fontSize: moderateScale(14),
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: moderateScale(50),
        fontSize: moderateScale(15),
        color: '#1e293b',
    },
    resendContainer: {
        marginTop: 12,
        alignItems: 'flex-end',
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
        // fontWeight: '700',
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
        // fontWeight: '700',
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