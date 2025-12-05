// app/(vendor)/(profile)/index.tsx
/**
 * Vendor Profile Screen
 *
 * Displays vendor's complete profile including ratings, stats,
 * services, and recent reviews. Main hub for vendor information.
 * Integrated with backend API for real data.
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import Text from '@/components/common/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { RatingStars } from '@/components/common/RatingStars';
import { RatingDistribution } from '@/components/vendor/RatingDistribution';
import { ReviewCard } from '@/components/vendor/ReviewCard';
import { DashboardStatTile } from '@/components/vendor/DashboardStatTile';
import { ProfileOption } from '@/components/common/ProfileOption';
import { COLORS } from '@/constants/colors';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { logoutUser, fetchUserProfile } from '@/store/slices/authSlice';

// ============================================================================
// Component
// ============================================================================

export default function VendorProfileScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Get current user from auth state
    const { user, isLoading } = useSelector((state: RootState) => state.auth);

    // Fetch user profile on mount
    useEffect(() => {
        dispatch(fetchUserProfile());
    }, [dispatch]);

    // Extract vendor profile from user
    const vendorProfile = useMemo(() => {
        if (!user) return null;

        // Build a vendor profile object from user data
        const profile = (user as any).vendorProfile || (user as any).vendor_profile;

        return {
            id: user.uid || (user as any).id,
            name: `${(user as any).first_name || (user as any).firstName || ''} ${(user as any).last_name || (user as any).lastName || ''}`.trim() || 'Vendor',
            phone: (user as any).phone || '',
            city: profile?.city || (user as any).city || 'Unknown',
            bio: profile?.bio || '',
            profilePhoto: profile?.profile_photo || null,
            verified: profile?.verified || false,
            rating: profile?.average_rating || 0,
            totalReviews: profile?.total_reviews || 0,
            completedJobs: profile?.completed_jobs || 0,
            serviceCategories: [], // Will be fetched separately if needed
            isOnline: true,
            subscriptionTier: (user as any).subscription_tier || 'basic',
        };
    }, [user]);

    // Get all reviews for this vendor
    // Note: Reviews are now fetched from API when needed
    const vendorReviews = useMemo(() => {
        return [] as Array<{ id: string; vendorId: string; rating: number; createdAt: string; comment?: string }>;
    }, [vendorProfile]);

    // Calculate rating distribution
    const ratingDistribution = useMemo(() => {
        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        vendorReviews.forEach(review => {
            const rating = Math.floor(review.rating) as 1 | 2 | 3 | 4 | 5;
            if (rating >= 1 && rating <= 5) {
                dist[rating]++;
            }
        });
        return dist;
    }, [vendorReviews]);

    // Get recent reviews (latest 3)
    const recentReviews = useMemo(() => {
        return [...vendorReviews]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 3);
    }, [vendorReviews]);

    // Get service categories (will be populated if available)
    const serviceCategories = useMemo(() => {
        if (!vendorProfile) return [];
        return vendorProfile.serviceCategories || [];
    }, [vendorProfile]);

    // Stats from real user data
    const stats = useMemo(() => ({
        jobsCompleted: vendorProfile?.completedJobs || 0,
        responseRate: 95, // Would need separate API endpoint
        memberSince: '2024', // Would need to get from user creation date
        activeRequests: 0, // Would need separate API endpoint
    }), [vendorProfile]);

    if (isLoading && !vendorProfile) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text type="body2" style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    if (!vendorProfile) {
        return (
            <View style={styles.loadingContainer}>
                <Text type="body2" style={styles.loadingText}>No profile data available</Text>
            </View>
        );
    }

    const handleNavigateToReviews = () => {
        router.push('/(vendor)/(profile)/reviews');
    };

    const handleEditProfile = () => {
        router.push('/(vendor)/(profile)/edit-profile');
        // Alert.alert('Edit Profile', 'Profile editing coming soon!');
    };

    const handleSubscription = () => {
        router.push('/(vendor)/(subscriptions)');
    };

    const handleSettings = () => {
        router.push('/(vendor)/(profile)/settings');
        // Alert.alert('Settings', 'Settings screen coming soon!');
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsLoggingOut(true);
                            await dispatch(logoutUser()).unwrap();
                            // Navigation will be handled by _layout.tsx automatically
                            router.replace('/(auth)/login');
                        } catch (error: any) {
                            Alert.alert('Logout Failed', error.message || 'Failed to logout');
                        } finally {
                            setIsLoggingOut(false);
                        }
                    }
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header Gradient Background */}
            <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <Text type="title" style={styles.headerTitle}>My Profile</Text>
                <Text type="subtitle" style={styles.headerSubtitle}>Manage your professional information</Text>
            </LinearGradient>

            {/* Profile Card */}
            <View style={styles.profileCard}>
                {/* Profile Photo Section */}
                <View style={styles.profilePhotoSection}>
                    {vendorProfile.profilePhoto ? (
                        <Image
                            source={{ uri: vendorProfile.profilePhoto }}
                            style={styles.profilePhoto}
                        />
                    ) : (
                        <View style={styles.profilePhotoPlaceholder}>
                            <Text type="title" style={styles.profilePhotoText}>
                                {vendorProfile.name.substring(0, 2).toUpperCase()}
                            </Text>
                        </View>
                    )}

                    {/* Edit Button Overlay */}
                    <TouchableOpacity
                        style={styles.editPhotoButton}
                        onPress={handleEditProfile}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="camera" size={16} color={COLORS.white} />
                    </TouchableOpacity>

                    {/* Online Status Indicator */}
                    {vendorProfile.isOnline && (
                        <View style={styles.onlineIndicator} />
                    )}
                </View>

                {/* Vendor Info */}
                <View style={styles.vendorInfo}>
                    <View style={styles.nameRow}>
                        <Text type="title" style={styles.vendorName}>{vendorProfile.name}</Text>
                        {vendorProfile.verified && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                            </View>
                        )}
                        {vendorProfile.subscriptionTier === 'premium' && (
                            <LinearGradient
                                colors={['#FFD700', '#FFA500']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.premiumBadge}
                            >
                                <Ionicons name="star" size={12} color={COLORS.white} />
                                <Text type="caption" style={styles.premiumText}>PREMIUM</Text>
                            </LinearGradient>
                        )}
                    </View>

                    {/* Location */}
                    <View style={styles.locationRow}>
                        <Ionicons name="location" size={14} color={COLORS.gray500} />
                        <Text type="body2" style={styles.locationText}>{vendorProfile.city}</Text>
                    </View>
                </View>
            </View>

            {/* Rating Summary Card - Tappable */}
            <TouchableOpacity
                style={styles.ratingCard}
                onPress={handleNavigateToReviews}
                activeOpacity={0.9}
            >
                <View style={styles.ratingHeader}>
                    <View style={styles.ratingMainSection}>
                        <Text type="title" style={styles.ratingNumber}>{vendorProfile.rating.toFixed(1)}</Text>
                        <RatingStars rating={vendorProfile.rating} size="large" />
                        <Text type="body" style={styles.totalReviewsText}>
                            {vendorProfile.totalReviews} reviews
                        </Text>
                    </View>

                    {/* View All Button */}
                    <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={handleNavigateToReviews}
                    >
                        <Text type="bodySemiBold" style={styles.viewAllText}>View All</Text>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                {/* Rating Distribution */}
                <View style={styles.distributionSection}>
                    <RatingDistribution
                        distribution={ratingDistribution}
                        totalReviews={vendorProfile.totalReviews}
                        interactive={false}
                    />
                </View>
            </TouchableOpacity>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <DashboardStatTile
                    icon={<Ionicons name="briefcase" size={24} color={COLORS.success} />}
                    label="Jobs Completed"
                    value={stats.jobsCompleted.toString()}
                    color={COLORS.success}
                />
                <DashboardStatTile
                    icon={<Ionicons name="trending-up" size={24} color={COLORS.primary} />}
                    label="Response Rate"
                    value={`${stats.responseRate}%`}
                    color={COLORS.primary}
                />
                <DashboardStatTile
                    icon={<Ionicons name="calendar" size={24} color={COLORS.accent} />}
                    label="Member Since"
                    value={stats.memberSince}
                    color={COLORS.accent}
                />
                <DashboardStatTile
                    icon={<Ionicons name="list" size={24} color={COLORS.warning} />}
                    label="Active Requests"
                    value={stats.activeRequests.toString()}
                    color={COLORS.warning}
                />
            </View>

            {/* Services Section */}
            <View style={styles.section}>
                <Text type="bodySemiBold" style={styles.sectionTitle}>Services Offered</Text>
                <View style={styles.servicesContainer}>
                    {serviceCategories.map((service, index) => (
                        <View key={service.id || index} style={styles.serviceChip}>
                            <Ionicons
                                name={service.icon as any}
                                size={16}
                                color={COLORS.primary}
                            />
                            <Text type="bodySemiBold" style={styles.serviceChipText}>{service.label}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Recent Reviews Section */}
            {recentReviews.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text type="bodySemiBold" style={styles.sectionTitle}>Recent Reviews</Text>
                        <TouchableOpacity onPress={handleNavigateToReviews}>
                            <Text type="link" style={styles.viewAllLink}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    {recentReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} maxLines={2} />
                    ))}
                </View>
            )}

            {/* Profile Options */}
            <View style={styles.section}>
                <Text type="bodySemiBold" style={styles.sectionTitle}>Account</Text>
                <View style={styles.optionsContainer}>
                    <ProfileOption
                        icon="person-outline"
                        label="Edit Profile"
                        onPress={handleEditProfile}
                    />
                    <ProfileOption
                        icon="diamond-outline"
                        label="Subscription Management"
                        onPress={handleSubscription}
                        gradient={vendorProfile.subscriptionTier === 'premium'}
                    />
                    <ProfileOption
                        icon="settings-outline"
                        label="Account Settings"
                        onPress={handleSettings}
                    />
                    <ProfileOption
                        icon="help-circle-outline"
                        label="Help & Support"
                        onPress={() => Alert.alert('Help', 'Support coming soon!')}
                    />
                    <ProfileOption
                        icon="log-out-outline"
                        label={isLoggingOut ? "Logging out..." : "Logout"}
                        onPress={handleLogout}
                        danger
                        disabled={isLoggingOut}
                    />
                </View>
            </View>
        </ScrollView>
    );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.gray50,
    },
    contentContainer: {
        paddingBottom: verticalScale(32),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.gray50,
    },
    loadingText: {
        fontSize: moderateScale(16),
        color: COLORS.gray600,
    },
    headerGradient: {
        paddingTop: verticalScale(60),
        paddingBottom: verticalScale(100),
        paddingHorizontal: scale(20),
        borderBottomLeftRadius: moderateScale(24),
        borderBottomRightRadius: moderateScale(24),
    },
    headerTitle: {
        fontSize: moderateScale(28),
        fontWeight: '800',
        color: COLORS.white,
        marginBottom: verticalScale(4),
    },
    headerSubtitle: {
        fontSize: moderateScale(14),
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
    },
    profileCard: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(20),
        padding: scale(20),
        marginHorizontal: scale(16),
        marginTop: verticalScale(-60),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        alignItems: 'center',
    },
    profilePhotoSection: {
        marginBottom: verticalScale(16),
        position: 'relative',
    },
    profilePhoto: {
        width: moderateScale(100),
        height: moderateScale(100),
        borderRadius: moderateScale(50),
        borderWidth: 4,
        borderColor: COLORS.white,
    },
    profilePhotoPlaceholder: {
        width: moderateScale(100),
        height: moderateScale(100),
        borderRadius: moderateScale(50),
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: COLORS.white,
    },
    profilePhotoText: {
        fontSize: moderateScale(36),
        fontWeight: '700',
        color: COLORS.white,
    },
    editPhotoButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        width: moderateScale(32),
        height: moderateScale(32),
        borderRadius: moderateScale(16),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    onlineIndicator: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: moderateScale(20),
        height: moderateScale(20),
        borderRadius: moderateScale(10),
        backgroundColor: COLORS.success,
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    vendorInfo: {
        alignItems: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        marginBottom: verticalScale(8),
    },
    vendorName: {
        fontSize: moderateScale(24),
        fontWeight: '700',
        color: COLORS.gray900,
    },
    verifiedBadge: {
        // Icon renders directly
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(12),
    },
    premiumText: {
        fontSize: moderateScale(10),
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: 0.5,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
    },
    locationText: {
        fontSize: moderateScale(14),
        color: COLORS.gray600,
    },
    ratingCard: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        padding: scale(20),
        marginHorizontal: scale(16),
        marginTop: verticalScale(16),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    ratingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(20),
    },
    ratingMainSection: {
        alignItems: 'center',
        gap: verticalScale(4),
    },
    ratingNumber: {
        fontSize: moderateScale(48),
        fontWeight: '800',
        color: COLORS.gray900,
    },
    totalReviewsText: {
        fontSize: moderateScale(13),
        color: COLORS.gray600,
        marginTop: verticalScale(4),
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        paddingVertical: verticalScale(8),
        paddingHorizontal: scale(12),
        backgroundColor: COLORS.primary50,
        borderRadius: moderateScale(8),
    },
    viewAllText: {
        fontSize: moderateScale(13),
        fontWeight: '600',
        color: COLORS.primary,
    },
    distributionSection: {
        paddingTop: verticalScale(12),
        borderTopWidth: 1,
        borderTopColor: COLORS.gray200,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: scale(16),
        marginTop: verticalScale(16),
        gap: scale(12),
    },
    section: {
        paddingHorizontal: moderateScale(16),
        marginTop: moderateScale(24),
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(12),
    },
    sectionTitle: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: COLORS.gray900,
        marginBottom: verticalScale(12),
    },
    viewAllLink: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: COLORS.primary,
    },
    servicesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(8),
    },
    serviceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        backgroundColor: COLORS.primary50,
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(8),
        borderRadius: moderateScale(20),
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    serviceChipText: {
        fontSize: moderateScale(13),
        fontWeight: '600',
        color: COLORS.primary,
    },
    optionsContainer: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(12),
        overflow: 'hidden',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        padding: moderateScale(8)
    },
});
