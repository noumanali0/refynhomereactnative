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
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { moderateScale } from 'react-native-size-matters';
import Text from '@/components/common/Text';

export default function Login() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
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
        if (phoneNumber.length < 10) return;

        setIsLoading(true);
        setTimeout(() => {
            setOtpSent(true);
            setIsLoading(false);
        }, 1500);
    };

    const handleVerifyOTP = () => {
        if (otp.length !== 6) return;

        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            // Navigate to role selection after OTP verification
            router.push('/(auth)/role-selection');
        }, 1500);
    };

    const handleResendOTP = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            alert('OTP resent successfully');
        }, 1000);
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
                                {otpSent ? 'Verify OTP' : 'Welcome Back!'}
                            </Text>
                            <Text type='body2' style={styles.welcomeSubtitle}>
                                {otpSent
                                    ? `Enter the code sent to ${phoneNumber}`
                                    : 'Login to continue'}
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
                                    editable={!otpSent}
                                    style={styles.input}
                                />
                            </View>
                        </View>

                        {/* OTP Input (Conditional) */}
                        {otpSent && (
                            <Animated.View style={styles.inputContainer}>
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
                                    />
                                </View>

                                {/* Resend OTP Link */}
                                <TouchableOpacity
                                    onPress={handleResendOTP}
                                    style={styles.resendContainer}
                                >
                                    <Text type='body' style={styles.resendText}>
                                        Didn't receive code?{' '}
                                        <Text type='bodySemiBold' style={styles.resendLink}>Resend</Text>
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.buttonContainer}>
                            {!otpSent ? (
                                <TouchableOpacity
                                    onPress={handleSendOTP}
                                    disabled={phoneNumber.length < 10 || isLoading}
                                    activeOpacity={0.8}
                                    style={styles.gradientButton}
                                >
                                    <LinearGradient
                                        colors={
                                            phoneNumber.length < 10
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
                                            <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                                        )}
                                        <Text type='body2' style={styles.buttonText}>
                                            {isLoading ? 'Loading!!...' : 'Login'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={handleVerifyOTP}
                                    disabled={otp.length !== 6 || isLoading}
                                    activeOpacity={0.8}
                                    style={styles.gradientButton}
                                >
                                    <LinearGradient
                                        colors={
                                            otp.length !== 6
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
                                        <Text style={styles.buttonText}>
                                            {isLoading ? 'Verifying...' : 'Verify & Continue'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
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
        // backgroundColor: 'red',
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
        // fontWeight: '00',
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
        // justifyContent: "center",
        // Shadow — soft & premium
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
        // paddingVertical: 0
    },
    inputIcon: {
        marginRight: 14,
        opacity: 0.7,
    },
    input: {
        // width: 'auto',
        flexGrow: 1,
        flexShrink: 1,
        // height: "100%",
        // marginTop: moderateScale(10),
        fontSize: moderateScale(15),
        fontWeight: '500',
        color: '#0f172a',
        // backgroundColor: "red",
        borderWidth: 0,
        textAlignVertical: 'center',   // ⭐ MAIN FIX
        // paddingVertical: 0,
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
        fontSize: moderateScale(14)
        // fontWeight: '600',
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

// import React, { useState } from 'react';
// import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
// import { useRouter } from 'expo-router';
// import { AppButton } from '../../src/components/common/AppButton';
// import { InputField } from '../../src/components/common/InputField';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useAppDispatch } from '@/hooks/useAppDispatch';
// import { loginSuccess } from '@/store/slices/authSlice';

// export default function Login() {
//     const router = useRouter();
//     const dispatch = useAppDispatch()
//     const [phoneNumber, setPhoneNumber] = useState('');
//     const [otp, setOtp] = useState('');
//     const [otpSent, setOtpSent] = useState(false);
//     const [isLoading, setIsLoading] = useState(false);

//     const handleSendOTP = () => {
//         setIsLoading(true);
//         setTimeout(() => {
//             setOtpSent(true);
//             setIsLoading(false);
//         }, 1000);
//     };

//     const handleVerifyOTP = () => {
//         setIsLoading(true);
//         setTimeout(() => {
//             setIsLoading(false);
//             dispatch(loginSuccess({
//                 name: "Test User",
//                 role: "customer",
//                 id: "123456",
//                 phoneNumber: "+923022977298",
//                 profilePhoto: "",
//                 city: "Lahore",
//                 address: "R111 Roman City Shah Town",
//                 favoriteVendors: []
//             }))
//             // router.push('/(auth)/role-selection' as any);
//         }, 1000);
//     };

//     return (
//         <SafeAreaView className="flex-1 bg-white">
//             <KeyboardAvoidingView
//                 behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//                 className="flex-1"
//             >
//                 <ScrollView className="flex-1 px-6">
//                     <View className="mt-20 mb-10">
//                         <Text className="text-4xl font-bold text-primary mb-2">RefynHome</Text>
//                         <Text className="text-gray-600 text-lg">Welcome back!</Text>
//                     </View>

//                     <InputField
//                         label="Phone Number"
//                         placeholder="+92 300 1234567"
//                         value={phoneNumber}
//                         onChangeText={setPhoneNumber}
//                         keyboardType="phone-pad"
//                         editable={!otpSent}
//                     />

//                     {otpSent && (
//                         <InputField
//                             label="Enter OTP"
//                             placeholder="Enter 6-digit OTP"
//                             value={otp}
//                             onChangeText={setOtp}
//                             keyboardType="number-pad"
//                             maxLength={6}
//                         />
//                     )}

//                     <View className="mt-6">
//                         {!otpSent ? (
//                             <AppButton
//                                 title="Send OTP"
//                                 variant='primary'
//                                 onPress={handleSendOTP}
//                                 isLoading={isLoading}
//                                 disabled={phoneNumber.length < 10}
//                             />
//                         ) : (
//                             <>
//                                 <AppButton
//                                     title="Verify OTP"
//                                     variant='primary'
//                                     onPress={handleVerifyOTP}
//                                     isLoading={isLoading}
//                                     disabled={otp.length !== 6}
//                                 />
//                                 <AppButton
//                                     title="Resend OTP"
//                                     onPress={handleSendOTP}
//                                     variant="outline"
//                                     className="mt-3"
//                                 />
//                             </>
//                         )}
//                     </View>

//                     <Text className="text-center text-gray-500 text-sm mt-8">
//                         By continuing, you agree to our Terms & Conditions
//                     </Text>
//                 </ScrollView>
//             </KeyboardAvoidingView>
//         </SafeAreaView>
//     );
// }
