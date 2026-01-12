/**
 * Pending Verification Screen
 *
 * Shown to vendors after they submit their profile for admin review
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Animated,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from 'react-native-size-matters';
import Text from '@/components/common/Text';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import { logoutUser, fetchUserProfile } from '@/store/slices/authSlice';

export default function PendingVerification() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);

    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.8));
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Animation on mount
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Check if vendor got verified
    useEffect(() => {
        if (user?.role === 'vendor' && user.vendorProfile?.verified) {
            // Vendor is now verified! Navigate to dashboard
            router.replace('/(vendor)/(servicerequests)');
        }
    }, [user]);

    const handleRefreshStatus = async () => {
        setIsRefreshing(true);
        try {
            await dispatch(fetchUserProfile()).unwrap();
            // If verified, navigation will happen in useEffect above
        } catch (error) {
            console.error('Failed to refresh profile:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleLogout = async () => {
        await dispatch(logoutUser());
        router.replace('/(auth)/login');
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
                    <Animated.View
                        style={[
                            styles.logoContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{ scale: scaleAnim }],
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                            style={styles.logoCircle}
                        >
                            <Ionicons name="hourglass-outline" size={40} color="#fff" />
                        </LinearGradient>
                    </Animated.View>
                    <Text type='title' style={styles.appName}>Under Review</Text>
                    <Text type='body2' style={styles.tagline}>
                        We're verifying your profile
                    </Text>
                </View>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <Animated.View
                    style={[
                        styles.contentCard,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {/* Status Icon */}
                    <View style={styles.statusIconContainer}>
                        <LinearGradient
                            colors={['rgba(249, 115, 22, 0.1)', 'rgba(37, 99, 235, 0.1)']}
                            style={styles.statusIconCircle}
                        >
                            <Ionicons name="time-outline" size={60} color="#F97316" />
                        </LinearGradient>
                    </View>

                    {/* Main Message */}
                    <Text type='title' style={styles.mainTitle}>
                        Verification in Progress
                    </Text>
                    <Text type='body' style={styles.mainMessage}>
                        Your vendor profile has been submitted successfully! Our admin team is
                        reviewing your information.
                    </Text>

                    {/* Timeline Steps */}
                    <View style={styles.timelineContainer}>
                        <View style={styles.timelineStep}>
                            <View style={[styles.timelineDot, styles.timelineDotCompleted]}>
                                <Ionicons name="checkmark" size={16} color="#fff" />
                            </View>
                            <View style={styles.timelineTextContainer}>
                                <Text type='bodySemiBold' style={styles.timelineStepTitle}>
                                    Profile Submitted
                                </Text>
                                <Text type='body2' style={styles.timelineStepDesc}>
                                    Your information has been received
                                </Text>
                            </View>
                        </View>

                        <View style={styles.timelineLine} />

                        <View style={styles.timelineStep}>
                            <View style={[styles.timelineDot, styles.timelineDotActive]}>
                                <Ionicons name="search" size={16} color="#F97316" />
                            </View>
                            <View style={styles.timelineTextContainer}>
                                <Text type='bodySemiBold' style={styles.timelineStepTitle}>
                                    Under Review
                                </Text>
                                <Text type='body2' style={styles.timelineStepDesc}>
                                    Admin is verifying your credentials
                                </Text>
                            </View>
                        </View>

                        <View style={styles.timelineLine} />

                        <View style={styles.timelineStep}>
                            <View style={styles.timelineDot}>
                                <Ionicons name="checkmark-circle-outline" size={16} color="#94a3b8" />
                            </View>
                            <View style={styles.timelineTextContainer}>
                                <Text type='bodySemiBold' style={[styles.timelineStepTitle, styles.timelineStepTitlePending]}>
                                    Approval
                                </Text>
                                <Text type='body2' style={styles.timelineStepDesc}>
                                    You'll receive a notification
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <LinearGradient
                            colors={['rgba(59, 130, 246, 0.1)', 'rgba(147, 197, 253, 0.1)']}
                            style={styles.infoBannerGradient}
                        >
                            <Ionicons name="information-circle" size={24} color="#3B82F6" />
                            <Text type='body2' style={styles.infoBannerText}>
                                This usually takes 24-48 hours. We'll notify you once your profile is approved!
                            </Text>
                        </LinearGradient>
                    </View>

                    {/* Refresh Button - Commented out for now
                    <TouchableOpacity
                        onPress={handleRefreshStatus}
                        disabled={isRefreshing}
                        activeOpacity={0.8}
                        style={styles.refreshButton}
                    >
                        <LinearGradient
                            colors={['#2563EB', '#3B82F6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.refreshButtonInner}
                        >
                            <Ionicons
                                name={isRefreshing ? "hourglass-outline" : "refresh-outline"}
                                size={20}
                                color="#fff"
                            />
                            <Text type='body2' style={styles.refreshButtonText}>
                                {isRefreshing ? 'Checking...' : 'Refresh Status'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    */}

                    {/* Logout Link */}
                    <TouchableOpacity
                        onPress={handleLogout}
                        style={styles.logoutButton}
                    >
                        <Text type='body2' style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
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
        marginBottom: moderateScale(20),
    },
    headerContent: {
        alignItems: 'center',
        paddingTop: moderateScale(40),
    },
    logoContainer: {
        marginBottom: moderateScale(16),
    },
    logoCircle: {
        width: moderateScale(90),
        height: moderateScale(90),
        borderRadius: moderateScale(45),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    appName: {
        fontSize: moderateScale(26),
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
    scrollContent: {
        padding: moderateScale(20),
        paddingBottom: moderateScale(40),
    },
    contentCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: moderateScale(24),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    statusIconContainer: {
        alignItems: 'center',
        marginBottom: moderateScale(24),
    },
    statusIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#F97316',
        borderStyle: 'dashed',
    },
    mainTitle: {
        fontSize: moderateScale(22),
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 12,
    },
    mainMessage: {
        fontSize: moderateScale(15),
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: moderateScale(32),
    },
    timelineContainer: {
        marginBottom: moderateScale(24),
    },
    timelineStep: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    timelineDot: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
    },
    timelineDotCompleted: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    timelineDotActive: {
        backgroundColor: '#fff',
        borderColor: '#F97316',
    },
    timelineTextContainer: {
        flex: 1,
        marginLeft: 12,
        paddingTop: 4,
    },
    timelineStepTitle: {
        fontSize: moderateScale(15),
        color: '#1e293b',
        marginBottom: 4,
    },
    timelineStepTitlePending: {
        color: '#94a3b8',
    },
    timelineStepDesc: {
        fontSize: moderateScale(13),
        color: '#64748b',
        lineHeight: 18,
    },
    timelineLine: {
        width: 2,
        height: 24,
        backgroundColor: '#e2e8f0',
        marginLeft: 17,
        marginVertical: 4,
    },
    infoBanner: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: moderateScale(24),
    },
    infoBannerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: moderateScale(14),
        gap: 12,
    },
    infoBannerText: {
        flex: 1,
        color: '#1e40af',
        lineHeight: 18,
    },
    refreshButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: moderateScale(16),
    },
    refreshButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: moderateScale(54),
        gap: 8,
    },
    refreshButtonText: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: '#fff',
    },
    logoutButton: {
        paddingVertical: moderateScale(12),
        alignItems: 'center',
    },
    logoutText: {
        fontSize: moderateScale(14),
        color: '#EF4444',
        fontWeight: '600',
    },
});
