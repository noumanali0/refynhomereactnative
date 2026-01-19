// app/(vendor)/(profile)/index.tsx
/**
 * Vendor Profile Screen
 *
 * Displays vendor's complete profile including ratings, stats,
 * services, and recent reviews. Main hub for vendor information.
 * Integrated with backend API for real data.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Image,
    Modal,
    ActivityIndicator,
    ScrollView,
    RefreshControl
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
import { logoutUser, fetchUserProfile, updateUserProfile } from '@/store/slices/authSlice';
import { selectVendorHasActiveJob } from '@/store/slices/dispatchSlice';
import useImagePicker from '@/hooks/useImagePicker';
import { useToast } from '@/contexts/ToastContext';

// ============================================================================
// Helper Functions
// ============================================================================

const formatMemberSince = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();
        return `${month} ${year}`;
    } catch (error) {
        return 'N/A';
    }
};

// ============================================================================
// Component
// ============================================================================

export default function VendorProfileScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { showToast } = useToast();
    const { pickImage } = useImagePicker();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [imageLoadError, setImageLoadError] = useState(false);

    // Get current user from auth state
    const { user, isLoading } = useSelector((state: RootState) => state.auth);

    // Check if vendor has active job (prevents logout)
    const { hasActiveJob, reason: activeJobReason } = useSelector(selectVendorHasActiveJob);

    // Fetch user profile on mount - only if we don't have vendor profile data
    // This prevents slow tab switching when data already exists
    useEffect(() => {
        const profile = (user as any)?.vendorProfile || (user as any)?.vendor_profile;
        // Only fetch if we don't have essential profile data
        if (!profile?.id) {
            dispatch(fetchUserProfile());
        }
    }, [dispatch, user]);

    // Reset image error state when profile photo URL changes
    useEffect(() => {
        setImageLoadError(false);
    }, [vendorProfile?.profilePhoto]);
    console.log("🚀 ~ VendorProfileScreen ~ profile:", user)

    // Handle pull-to-refresh
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await dispatch(fetchUserProfile()).unwrap();
            if (__DEV__) {
                console.log('[VendorProfile] Profile refreshed successfully');
            }
        } catch (error) {
            if (__DEV__) {
                console.error('[VendorProfile] Failed to refresh profile:', error);
            }
            showToast({
                type: 'error',
                title: 'Refresh Failed',
                message: 'Failed to refresh profile data',
            });
        } finally {
            setIsRefreshing(false);
        }
    }, [dispatch, showToast]);

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
            // Use camelCase (from authService) with snake_case fallback (from API)
            profilePhoto: profile?.profilePhoto || profile?.profile_photo_url || profile?.profile_photo || null,
            verified: profile?.verified || false,
            rating: profile?.averageRating || profile?.average_rating || 0,
            totalReviews: profile?.totalReviews || profile?.total_reviews || 0,
            completedJobs: profile?.completedJobs || profile?.completed_jobs || 0,
            serviceCategories: profile?.categories || [],
            isOnline: true,
            subscriptionTier: (user as any).subscription_tier || (user as any).subscriptionTier || 'basic',
            serviceRadius: profile?.serviceRadiusKm || profile?.service_radius_km || 10,
            memberSince: profile?.memberSince || profile?.member_since || null,
            ratingDistribution: profile?.rating_distribution || null,
            activeRequests: profile?.activeRequests || profile?.active_requests || 0,
        };
    }, [user]);

    // Get all reviews for this vendor
    // Note: Reviews are now fetched from API when needed
    const vendorReviews = useMemo(() => {
        return [] as Array<{ id: string; vendorId: string; rating: number; createdAt: string; comment?: string }>;
    }, [vendorProfile]);

    // Calculate rating distribution
    const ratingDistribution = useMemo(() => {
        // PRIMARY: Use distribution from API if available
        if (vendorProfile?.ratingDistribution) {
            return {
                5: vendorProfile.ratingDistribution["5"] || 0,
                4: vendorProfile.ratingDistribution["4"] || 0,
                3: vendorProfile.ratingDistribution["3"] || 0,
                2: vendorProfile.ratingDistribution["2"] || 0,
                1: vendorProfile.ratingDistribution["1"] || 0,
            };
        }

        // FALLBACK: Calculate from reviews (if reviews were fetched)
        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        vendorReviews.forEach(review => {
            const rating = Math.floor(review.rating) as 1 | 2 | 3 | 4 | 5;
            if (rating >= 1 && rating <= 5) {
                dist[rating]++;
            }
        });
        return dist;
    }, [vendorProfile?.ratingDistribution, vendorReviews]);

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

    // Stats from real user data (now fetched from API)
    const stats = useMemo(() => ({
        jobsCompleted: vendorProfile?.completedJobs || 0,
        // responseRate: 95, // Commented out - not yet implemented in backend
        memberSince: vendorProfile?.memberSince
            ? formatMemberSince(vendorProfile.memberSince)
            : 'N/A',
        activeRequests: vendorProfile?.activeRequests || 0,
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

    // Handle profile photo update
    const handleUpdateProfilePhoto = async () => {
        const selectedImage = await pickImage();

        if (selectedImage) {
            setIsUploadingPhoto(true);
            try {
                await dispatch(updateUserProfile({
                    profile_photo: selectedImage,
                })).unwrap();

                // Refetch profile to ensure UI has latest data
                await dispatch(fetchUserProfile());

                showToast({
                    type: 'success',
                    title: 'Photo Updated',
                    message: 'Your profile photo has been updated successfully',
                });
            } catch (error: any) {
                showToast({
                    type: 'error',
                    title: 'Update Failed',
                    message: error || 'Failed to update profile photo',
                });
            } finally {
                setIsUploadingPhoto(false);
            }
        }
    };

    const handleSubscription = () => {
        router.push('/(vendor)/(subscriptions)');
    };

    const handleServiceRadius = () => {
        router.push('/(vendor)/(profile)/service-radius');
    };

    const handleSettings = () => {
        router.push('/(vendor)/(profile)/settings');
        // Alert.alert('Settings', 'Settings screen coming soon!');
    };

    const handleLogout = () => {
        // Block logout if vendor has active job
        if (hasActiveJob) {
            showToast({
                type: 'warning',
                title: 'Cannot Logout',
                message: activeJobReason || 'You have an active job. Please complete or cancel it before logging out.',
            });
            return;
        }

        setShowLogoutModal(true);
    };

    const handleConfirmLogout = async () => {
        setIsLoggingOut(true);

        try {
            await dispatch(logoutUser()).unwrap();
            // Navigation is handled by _layout.tsx automatically when isAuthenticated becomes false
        } catch (error: any) {
            setIsLoggingOut(false);
            setShowLogoutModal(false);
            showToast({ type: 'error', title: 'Logout Failed', message: error.message || 'Failed to logout' });
        }
    };

    return (
        <View style={styles.container}>
            {/* Header Gradient Background - Fixed at top */}
            <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <Text type="headerTitle" style={styles.headerTitle}>My Profile</Text>
                <Text type="subtitle" style={styles.headerSubtitle}>Manage your professional information</Text>
            </LinearGradient>

            {/* Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[COLORS.primary]}
                        tintColor={COLORS.primary}
                        progressViewOffset={20}
                    />
                }
            >
                {/* Profile Card */}
                <View style={styles.profileCard}>
                {/* Profile Photo Section */}
                <TouchableOpacity
                    style={styles.profilePhotoSection}
                    onPress={handleUpdateProfilePhoto}
                    disabled={isUploadingPhoto}
                    activeOpacity={0.8}
                >
                    {isUploadingPhoto ? (
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.profilePhotoPlaceholder}
                        >
                            <ActivityIndicator size="large" color={COLORS.white} />
                        </LinearGradient>
                    ) : vendorProfile.profilePhoto && !imageLoadError ? (
                        <Image
                            source={{ uri: vendorProfile.profilePhoto }}
                            style={styles.profilePhoto}
                            onError={() => setImageLoadError(true)}
                        />
                    ) : (
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.profilePhotoPlaceholder}
                        >
                            <Ionicons name="person" size={moderateScale(50)} color={COLORS.white} />
                        </LinearGradient>
                    )}

                    {/* Edit Button Overlay */}
                    <View style={styles.editPhotoButton}>
                        {isUploadingPhoto ? (
                            <ActivityIndicator size={12} color={COLORS.white} />
                        ) : (
                            <Ionicons name="camera" size={16} color={COLORS.white} />
                        )}
                    </View>

                    {/* Online Status Indicator */}
                    {vendorProfile.isOnline && !isUploadingPhoto && (
                        <View style={styles.onlineIndicator} />
                    )}
                </TouchableOpacity>

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
                {/* Response Rate - Commented out until backend implements it */}
                {/* <DashboardStatTile
                    icon={<Ionicons name="trending-up" size={24} color={COLORS.primary} />}
                    label="Response Rate"
                    value={`${stats.responseRate}%`}
                    color={COLORS.primary}
                /> */}
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
                    {serviceCategories.map((service: { id: number; name: string; slug: string }, index: number) => (
                        <View key={service.id || index} style={styles.serviceChip}>
                            <Ionicons
                                name="construct-outline"
                                size={16}
                                color={COLORS.primary}
                            />
                            <Text type="bodySemiBold" style={styles.serviceChipText}>{service.name}</Text>
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
                        icon={<Ionicons name="person-outline" size={20} color={COLORS.primary} />}
                        label="Edit Profile"
                        onPress={handleEditProfile}
                    />
                    <ProfileOption
                        icon={<Ionicons name="locate-outline" size={20} color={COLORS.primary} />}
                        label="Service Radius"
                        subtitle={`${vendorProfile.serviceRadius} km`}
                        onPress={handleServiceRadius}
                    />
                    <ProfileOption
                        icon={<Ionicons name="diamond-outline" size={20} color={COLORS.primary} />}
                        label="Subscription Management"
                        onPress={handleSubscription}
                        gradient={vendorProfile.subscriptionTier === 'premium'}
                    />
                    <ProfileOption
                        icon={<Ionicons name="settings-outline" size={20} color={COLORS.primary} />}
                        label="Account Settings"
                        onPress={handleSettings}
                    />
                    <ProfileOption
                        icon={<Ionicons name="help-circle-outline" size={20} color={COLORS.primary} />}
                        label="Help & Support"
                        onPress={() => showToast({ type: 'info', title: 'Help', message: 'Support coming soon!' })}
                    />
                    <ProfileOption
                        icon={<Ionicons name="log-out-outline" size={20} color={COLORS.error} />}
                        label={isLoggingOut ? "Logging out..." : "Logout"}
                        onPress={handleLogout}
                        danger
                        loading={isLoggingOut}
                    />
                </View>
            </View>
            </ScrollView>

            {/* Logout Confirmation Modal */}
            <Modal visible={showLogoutModal} transparent animationType="fade">
                <View style={styles.modalWrapper}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalIconContainer}>
                            <Ionicons name="log-out-outline" size={40} color="#f59e0b" />
                        </View>

                        <Text type="title" style={styles.modalTitle}>Logout?</Text>
                        <Text type="body2" style={styles.modalText}>
                            Are you sure you want to logout from your account?
                        </Text>

                        <View style={styles.modalBtns}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setShowLogoutModal(false)}
                                disabled={isLoggingOut}
                            >
                                <Text type="body2" style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.logoutBtn, isLoggingOut && styles.logoutBtnDisabled]}
                                onPress={handleConfirmLogout}
                                disabled={isLoggingOut}
                            >
                                {isLoggingOut ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text type="body2" style={styles.logoutText}>Logout</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
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
    scrollView: {
        flex: 1,
        marginTop: verticalScale(0),
    },
    contentContainer: {
        paddingBottom: verticalScale(22),
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
        paddingTop: verticalScale(14),
        paddingBottom: verticalScale(35),
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
        marginTop: verticalScale(0),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        alignItems: 'center',
        zIndex: 10,
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
        lineHeight: moderateScale(56),
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

    // Logout Modal Styles
    modalWrapper: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: moderateScale(20),
    },
    modalBox: {
        width: '100%',
        maxWidth: moderateScale(400),
        backgroundColor: '#fff',
        padding: moderateScale(24),
        borderRadius: moderateScale(24),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: moderateScale(8),
        elevation: 8,
    },
    modalIconContainer: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(40),
        backgroundColor: '#fef3c7',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: moderateScale(16),
    },
    modalTitle: {
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: moderateScale(8),
    },
    modalText: {
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: moderateScale(20),
    },
    modalBtns: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: moderateScale(24),
        gap: moderateScale(12),
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: moderateScale(14),
        paddingHorizontal: moderateScale(20),
        borderRadius: moderateScale(12),
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: moderateScale(16),
        color: '#4b5563',
    },
    logoutBtn: {
        flex: 1,
        paddingVertical: moderateScale(14),
        paddingHorizontal: moderateScale(20),
        borderRadius: moderateScale(12),
        backgroundColor: '#f59e0b',
        alignItems: 'center',
    },
    logoutText: {
        fontSize: moderateScale(16),
        color: '#fff',
    },
    logoutBtnDisabled: {
        backgroundColor: '#fcd34d',
    },
});
