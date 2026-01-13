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
import { moderateScale } from 'react-native-size-matters';
import Text from '@/components/common/Text';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import { signupUser, clearError } from '@/store/slices/authSlice';
import { normalizePhoneNumber } from '@/utils/validation';
import { getErrorMessage } from '@/api/client';
import PasswordInput from '@/components/common/PasswordInput';

type Role = 'customer' | 'vendor' | null;

export default function Signup() {
    const router = useRouter();
    const dispatch = useAppDispatch();

    // Redux state
    const { isLoading, error, otpSent: reduxOtpSent, isAuthenticated, user } = useAppSelector(
        (state) => state.auth
    );

    // Local state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        address: '', // For customers
        city: '', // For customers
    });
    const [selectedRole, setSelectedRole] = useState<Role>(null);
    const [fadeAnim] = useState(new Animated.Value(0));

    // Animation on mount
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);


    // Navigate to OTP screen after successful signup
    useEffect(() => {
        if (reduxOtpSent && formData.phoneNumber) {
            router.push({
                pathname: '/(auth)/otp-login',
                params: { phone: formData.phoneNumber, type: 'signup' }
            });
        }
    }, [reduxOtpSent]);

    // Handle errors
    useEffect(() => {
        if (error) {
            Alert.alert('Error', error, [
                { text: 'OK', onPress: () => dispatch(clearError()) },
            ]);
        }
    }, [error]);

    const handleSignup = async () => {
        // Validation
        if (!selectedRole) {
            Alert.alert('Error', 'Please select your role (Customer or Vendor)');
            return;
        }

        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            Alert.alert('Error', 'Please enter your first and last name');
            return;
        }

        if (formData.phoneNumber.length < 10) {
            Alert.alert('Error', 'Please enter a valid phone number');
            return;
        }

        if (formData.password.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        // Additional validation for customers
        if (selectedRole === 'customer') {
            if (!formData.address.trim()) {
                Alert.alert('Error', 'Please enter your address');
                return;
            }
            if (!formData.city.trim()) {
                Alert.alert('Error', 'Please enter your city');
                return;
            }
        }

        try {
            const normalizedPhone = normalizePhoneNumber(formData.phoneNumber);

            // Prepare payload based on role
            const payload: any = {
                phone: normalizedPhone,
                password: formData.password,
                role: selectedRole,
                first_name: formData.firstName.trim(),
                last_name: formData.lastName.trim(),
            };

            // Add customer-specific fields
            if (selectedRole === 'customer') {
                payload.address = formData.address.trim();
                payload.city = formData.city.trim();
            }

            // Dispatch signup action
            await dispatch(signupUser(payload)).unwrap();

            // Navigation to OTP screen handled by useEffect above
        } catch (err: any) {
            // Error handled by useEffect above
            const errorMessage = getErrorMessage(err);
            console.error('Signup error:', errorMessage);
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
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
                        {/* Welcome Text */}
                        <View style={styles.welcomeSection}>
                            <Text type='bodySemiBold' style={styles.welcomeTitle}>
                                Sign Up
                            </Text>
                            <Text type='body2' style={styles.welcomeSubtitle}>
                                Create your account to get started
                            </Text>
                        </View>

                        <>
                                {/* Role Selection Cards */}
                                <View style={styles.roleSelectionSection}>
                                    <Text type='bodySemiBold' style={styles.roleSectionTitle}>I am a...</Text>

                                    <View style={styles.roleCardsContainer}>
                                        {/* Customer Role Card */}
                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            onPress={() => setSelectedRole('customer')}
                                            style={[
                                                styles.roleCard,
                                                selectedRole === 'customer' && styles.roleCardSelected,
                                            ]}
                                        >
                                            {selectedRole === 'customer' && (
                                                <View style={styles.selectedCheckmark}>
                                                    <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                                                </View>
                                            )}
                                            <LinearGradient
                                                colors={
                                                    selectedRole === 'customer'
                                                        ? ['#2563EB', '#3b82f6']
                                                        : ['#dbeafe', '#bfdbfe']
                                                }
                                                style={styles.roleIconCircle}
                                            >
                                                <Ionicons
                                                    name="person"
                                                    size={24}
                                                    color={selectedRole === 'customer' ? '#fff' : '#2563EB'}
                                                />
                                            </LinearGradient>
                                            <Text
                                                type="bodySemiBold"
                                                style={[
                                                    styles.roleCardTitle,
                                                    selectedRole === 'customer' && styles.roleCardTitleSelected,
                                                ]}
                                            >
                                                Customer
                                            </Text>
                                            <Text type="body" style={styles.roleCardDesc}>
                                                Find services
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Vendor Role Card */}
                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            onPress={() => setSelectedRole('vendor')}
                                            style={[
                                                styles.roleCard,
                                                selectedRole === 'vendor' && styles.roleCardSelected,
                                            ]}
                                        >
                                            {selectedRole === 'vendor' && (
                                                <View style={styles.selectedCheckmark}>
                                                    <Ionicons name="checkmark-circle" size={20} color="#F97316" />
                                                </View>
                                            )}
                                            <LinearGradient
                                                colors={
                                                    selectedRole === 'vendor'
                                                        ? ['#F97316', '#fb923c']
                                                        : ['#fed7aa', '#fdba74']
                                                }
                                                style={styles.roleIconCircle}
                                            >
                                                <Ionicons
                                                    name="construct"
                                                    size={24}
                                                    color={selectedRole === 'vendor' ? '#fff' : '#F97316'}
                                                />
                                            </LinearGradient>
                                            <Text
                                                type="bodySemiBold"
                                                style={[
                                                    styles.roleCardTitle,
                                                    selectedRole === 'vendor' && styles.roleCardTitleSelected,
                                                ]}
                                            >
                                                Vendor
                                            </Text>
                                            <Text type="body" style={styles.roleCardDesc}>
                                                Offer services
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* First Name Input */}
                                <View style={styles.inputContainer}>
                                    <Text type='body2' style={styles.inputLabel}>First Name</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons
                                            name="person-outline"
                                            size={20}
                                            color="#2563EB"
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            placeholder="Enter your first name"
                                            placeholderTextColor="#94a3b8"
                                            value={formData.firstName}
                                            onChangeText={(text) =>
                                                setFormData({ ...formData, firstName: text })
                                            }
                                            style={styles.input}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                </View>

                                {/* Last Name Input */}
                                <View style={styles.inputContainer}>
                                    <Text type='body2' style={styles.inputLabel}>Last Name</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons
                                            name="person-outline"
                                            size={20}
                                            color="#2563EB"
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            placeholder="Enter your last name"
                                            placeholderTextColor="#94a3b8"
                                            value={formData.lastName}
                                            onChangeText={(text) =>
                                                setFormData({ ...formData, lastName: text })
                                            }
                                            style={styles.input}
                                            autoCapitalize="words"
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
                                            placeholderTextColor="#94a3b8"
                                            value={formData.phoneNumber}
                                            onChangeText={(text) =>
                                                setFormData({ ...formData, phoneNumber: text })
                                            }
                                            keyboardType="phone-pad"
                                            style={styles.input}
                                        />
                                    </View>
                                </View>

                                {/* Customer-specific fields */}
                                {selectedRole === 'customer' && (
                                    <>
                                        {/* Address Input */}
                                        <View style={styles.inputContainer}>
                                            <Text type='body2' style={styles.inputLabel}>Address</Text>
                                            <View style={styles.inputWrapper}>
                                                <Ionicons
                                                    name="location-outline"
                                                    size={20}
                                                    color="#F97316"
                                                    style={styles.inputIcon}
                                                />
                                                <TextInput
                                                    placeholder="Enter your address"
                                                    placeholderTextColor="#94a3b8"
                                                    value={formData.address}
                                                    onChangeText={(text) =>
                                                        setFormData({ ...formData, address: text })
                                                    }
                                                    style={styles.input}
                                                    autoCapitalize="words"
                                                />
                                            </View>
                                        </View>

                                        {/* City Input */}
                                        <View style={styles.inputContainer}>
                                            <Text type='body2' style={styles.inputLabel}>City</Text>
                                            <View style={styles.inputWrapper}>
                                                <Ionicons
                                                    name="business-outline"
                                                    size={20}
                                                    color="#2563EB"
                                                    style={styles.inputIcon}
                                                />
                                                <TextInput
                                                    placeholder="Enter your city"
                                                    placeholderTextColor="#94a3b8"
                                                    value={formData.city}
                                                    onChangeText={(text) =>
                                                        setFormData({ ...formData, city: text })
                                                    }
                                                    style={styles.input}
                                                    autoCapitalize="words"
                                                />
                                            </View>
                                        </View>
                                    </>
                                )}

                                {/* Password Input */}
                                <PasswordInput
                                    value={formData.password}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, password: text })
                                    }
                                    placeholder="Enter your password"
                                    label="Password"
                                    showStrengthIndicator={true}
                                    autoComplete="password-new"
                                    textContentType="newPassword"
                                />

                                {/* Confirm Password Input */}
                                <PasswordInput
                                    value={formData.confirmPassword}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, confirmPassword: text })
                                    }
                                    placeholder="Re-enter your password"
                                    label="Confirm Password"
                                    autoComplete="password-new"
                                    textContentType="newPassword"
                                />
                            </>

                        {/* Action Button */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                onPress={handleSignup}
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
                                            name="person-add-outline"
                                            size={20}
                                            color="#fff"
                                        />
                                    )}
                                    <Text type='body2' style={styles.buttonText}>
                                        {isLoading ? 'Creating Account...' : 'Sign Up'}
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
    // Role Selection Styles
    roleSelectionSection: {
        marginBottom: moderateScale(20),
    },
    roleSectionTitle: {
        fontSize: moderateScale(16),
        color: '#334155',
        marginBottom: moderateScale(12),
    },
    roleCardsContainer: {
        flexDirection: 'row',
        gap: moderateScale(12),
    },
    roleCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: moderateScale(16),
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        position: 'relative',
    },
    roleCardSelected: {
        borderColor: '#2563EB',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    selectedCheckmark: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
    },
    roleIconCircle: {
        width: moderateScale(56),
        height: moderateScale(56),
        borderRadius: moderateScale(28),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: moderateScale(8),
    },
    roleCardTitle: {
        fontSize: moderateScale(15),
        color: '#1e293b',
        marginBottom: 4,
    },
    roleCardTitleSelected: {
        color: '#2563EB',
    },
    roleCardDesc: {
        fontSize: moderateScale(11),
        color: '#64748b',
        textAlign: 'center',
    },
});