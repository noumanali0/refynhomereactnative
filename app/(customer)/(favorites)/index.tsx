// app/(customer)/(favorites)/index.tsx
/**
 * Favorite Vendors Screen
 *
 * Displays customer's favorite vendors list with proper API integration.
 * Features:
 * - Pull-to-refresh
 * - Remove from favorites with toast feedback
 * - Empty state handling
 * - Loading states
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/hooks/useAppDispatch';
import Text from '@/components/common/Text';
import { COLORS } from '@/constants/colors';
import { router } from 'expo-router';
import type { AppDispatch } from '@/store';
import {
    fetchFavoriteVendors,
    loadMoreFavorites,
    refreshFavorites,
    removeFromFavorites,
    selectFavoriteVendors,
    selectIsAddingFavorite,
    selectIsLoadingFavorites,
    selectIsLoadingMoreFavorites,
    selectFavoritesHasMore,
    selectFavoritesTotalCount,
} from '@/store/slices/vendorSlice';
import type { FavoriteVendor } from '@/services/favoriteService';
import { useToast } from '@/contexts/ToastContext';

// ============================================================================
// TYPES
// ============================================================================

interface VendorCardProps {
    item: FavoriteVendor;
    onRemove: (vendorId: number) => void;
    isRemoving: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely format rating to 1 decimal place
 */
const formatRating = (rating: number | null | undefined): string => {
    if (rating === null || rating === undefined || isNaN(rating)) {
        return '0.0';
    }
    return rating.toFixed(1);
};

/**
 * Safely format number with fallback
 */
const formatNumber = (value: number | null | undefined, fallback: number = 0): number => {
    if (value === null || value === undefined || isNaN(value)) {
        return fallback;
    }
    return value;
};

/**
 * Format date for display
 */
const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Recently';

    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return 'Recently';
    }
};

// ============================================================================
// VENDOR CARD COMPONENT
// ============================================================================

const VendorCard: React.FC<VendorCardProps> = React.memo(({ item, onRemove, isRemoving }) => {
    const vendor = item.vendor;

    // Safely extract vendor data with fallbacks
    const vendorName = vendor?.full_name || 'Unknown Vendor';
    const rating = formatRating(vendor?.average_rating);
    const reviewCount = formatNumber(vendor?.total_reviews);
    const completedJobs = formatNumber(vendor?.completed_jobs);
    const serviceRadius = formatNumber(vendor?.service_radius_km, 10);
    const isVerified = vendor?.verified ?? false;
    const profilePhotoUrl = vendor?.profile_photo_url;

    const handlePress = useCallback(() => {
        router.push({
            pathname: '/(customer)/(favorites)/vendor-detail',
            params: { vendorId: item.vendor_id.toString() },
        });
    }, [item.vendor_id]);

    const handleRemove = useCallback(() => {
        onRemove(item.vendor_id);
    }, [item.vendor_id, onRemove]);

    return (
        <TouchableOpacity
            style={styles.vendorCard}
            activeOpacity={0.7}
            onPress={handlePress}
        >
            <View style={styles.vendorCardContent}>
                {/* Vendor Avatar */}
                <View style={styles.avatarContainer}>
                    {profilePhotoUrl ? (
                        <Image
                            source={{ uri: profilePhotoUrl }}
                            style={styles.vendorAvatar}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={28} color={COLORS.gray400} />
                        </View>
                    )}
                    {isVerified && (
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        </View>
                    )}
                </View>

                {/* Vendor Info */}
                <View style={styles.vendorInfo}>
                    <Text type="bodySemiBold" style={styles.vendorName} numberOfLines={1}>
                        {vendorName}
                    </Text>

                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color={COLORS.warning} />
                        <Text type="body2" style={styles.ratingText}>
                            {rating}
                        </Text>
                        <Text type="caption" style={styles.reviewCount}>
                            ({reviewCount} reviews)
                        </Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="briefcase-outline" size={14} color={COLORS.gray500} />
                            <Text type="caption" style={styles.statText}>
                                {completedJobs} jobs
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="location-outline" size={14} color={COLORS.gray500} />
                            <Text type="caption" style={styles.statText}>
                                {serviceRadius}km radius
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Remove Button */}
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={handleRemove}
                    disabled={isRemoving}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    {isRemoving ? (
                        <ActivityIndicator size="small" color={COLORS.error} />
                    ) : (
                        <Ionicons name="heart" size={24} color={COLORS.error} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Added Date */}
            <View style={styles.addedDateRow}>
                <Ionicons name="time-outline" size={12} color={COLORS.gray400} />
                <Text type="caption" style={styles.addedDateText}>
                    Added {formatDate(item.created_at)}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

VendorCard.displayName = 'VendorCard';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Favorites() {
    const dispatch = useDispatch<AppDispatch>();
    const { showToast } = useToast();

    // Redux selectors
    const favoriteVendors = useAppSelector(selectFavoriteVendors);
    const isLoadingFavorites = useAppSelector(selectIsLoadingFavorites);
    const isLoadingMore = useAppSelector(selectIsLoadingMoreFavorites);
    const isRemovingFavorite = useAppSelector(selectIsAddingFavorite);
    const hasMore = useAppSelector(selectFavoritesHasMore);
    const totalCount = useAppSelector(selectFavoritesTotalCount);
    const favoriteError = useAppSelector((state) => state.vendor.favoriteError);

    // Memoized count - use totalCount from API for accurate display
    const vendorCount = useMemo(() => totalCount || favoriteVendors.length, [totalCount, favoriteVendors.length]);

    // Fetch favorites on mount
    useEffect(() => {
        dispatch(fetchFavoriteVendors());
    }, [dispatch]);

    // Show error toast if fetch fails
    useEffect(() => {
        if (favoriteError) {
            showToast({
                type: 'error',
                title: 'Error',
                message: favoriteError,
            });
        }
    }, [favoriteError, showToast]);

    // Handle refresh (pull to refresh)
    const onRefresh = useCallback(() => {
        dispatch(refreshFavorites());
    }, [dispatch]);

    // Handle load more (infinite scroll)
    const handleLoadMore = useCallback(() => {
        if (!isLoadingMore && hasMore) {
            dispatch(loadMoreFavorites());
        }
    }, [dispatch, isLoadingMore, hasMore]);

    // Handle remove from favorites
    const handleRemoveFavorite = useCallback(async (vendorId: number) => {
        try {
            await dispatch(removeFromFavorites(vendorId)).unwrap();
            showToast({
                type: 'success',
                title: 'Removed',
                message: 'Vendor removed from favorites.',
            });
        } catch (error) {
            showToast({
                type: 'error',
                title: 'Error',
                message: typeof error === 'string' ? error : 'Failed to remove vendor',
            });
        }
    }, [dispatch, showToast]);

    // Render vendor card with memoized callback
    const renderVendorCard = useCallback(({ item }: { item: FavoriteVendor }) => (
        <VendorCard
            item={item}
            onRemove={handleRemoveFavorite}
            isRemoving={isRemovingFavorite}
        />
    ), [handleRemoveFavorite, isRemovingFavorite]);

    // Key extractor
    const keyExtractor = useCallback((item: FavoriteVendor) => `vendor-${item.id}`, []);

    // Render empty state
    const renderEmptyState = useCallback(() => (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="heart-outline" size={64} color={COLORS.gray400} />
            </View>
            <Text type="title" style={styles.emptyTitle}>No Favorite Vendors</Text>
            <Text type="body2" style={styles.emptyMessage}>
                Save your favorite vendors here for quick access.{'\n'}
            </Text>
            {/* <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/(customer)/(home)')}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={[COLORS.primary, COLORS.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.browseButtonGradient}
                >
                    <Ionicons name="search" size={18} color={COLORS.white} />
                    <Text type="button" style={styles.browseButtonText}>Browse Vendors</Text>
                </LinearGradient>
            </TouchableOpacity> */}
        </View>
    ), []);

    // Render list empty component
    const ListEmptyComponent = useMemo(() => {
        if (isLoadingFavorites) return null;
        return renderEmptyState();
    }, [isLoadingFavorites, renderEmptyState]);

    // Render list footer (pagination info and loading indicator)
    const renderListFooter = useCallback(() => {
        if (favoriteVendors.length === 0) return null;

        if (isLoadingMore) {
            return (
                <View style={styles.footerContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text type="body2" style={styles.footerText}>Loading more...</Text>
                </View>
            );
        }

        if (!hasMore && favoriteVendors.length > 0) {
            return (
                <View style={styles.footerContainer}>
                    <Text type="body2" style={styles.footerText}>
                        Showing {favoriteVendors.length} of {totalCount} vendors
                    </Text>
                </View>
            );
        }

        return null;
    }, [isLoadingMore, hasMore, favoriteVendors.length, totalCount]);

    return (
        <View style={styles.container}>
            {/* Header with Gradient */}
            <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Ionicons name="heart" size={28} color={COLORS.white} />
                    <Text type="title" style={styles.headerTitle}>Favorite Vendors</Text>
                </View>
                {vendorCount > 0 && (
                    <Text type="subtitle" style={styles.headerSubtitle}>
                        {vendorCount} saved vendor{vendorCount !== 1 ? 's' : ''}
                    </Text>
                )}
            </LinearGradient>

            {/* Content */}
            <View style={styles.content}>
                {isLoadingFavorites && vendorCount === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text type="body2" style={styles.loadingText}>Loading favorites...</Text>
                    </View>
                ) : (
                    <FlatList<FavoriteVendor>
                        data={favoriteVendors}
                        keyExtractor={keyExtractor}
                        renderItem={renderVendorCard}
                        ListEmptyComponent={ListEmptyComponent}
                        ListFooterComponent={renderListFooter}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[
                            styles.listContent,
                            favoriteVendors.length === 0 && styles.listContentEmpty,
                        ]}
                        refreshControl={
                            <RefreshControl
                                refreshing={isLoadingFavorites}
                                onRefresh={onRefresh}
                                colors={[COLORS.primary]}
                                tintColor={COLORS.primary}
                            />
                        }
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        initialNumToRender={5}
                        maxToRenderPerBatch={5}
                        windowSize={3}
                    />
                )}
            </View>
        </View>
    );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.gray50,
    },
    header: {
        paddingTop: verticalScale(60),
        paddingBottom: verticalScale(24),
        paddingHorizontal: scale(16),
        borderBottomLeftRadius: moderateScale(24),
        borderBottomRightRadius: moderateScale(24),
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        marginBottom: verticalScale(8),
    },
    headerTitle: {
        fontSize: moderateScale(28),
        color: COLORS.white,
    },
    headerSubtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
    },
    content: {
        flex: 1,
    },
    listContent: {
        padding: scale(16),
        paddingBottom: verticalScale(80),
    },
    listContentEmpty: {
        flexGrow: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: verticalScale(60),
    },
    loadingText: {
        marginTop: verticalScale(12),
        color: COLORS.gray500,
    },

    // Vendor Card
    vendorCard: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        padding: scale(16),
        marginBottom: verticalScale(12),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    vendorCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    vendorAvatar: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(30),
        backgroundColor: COLORS.gray100,
    },
    avatarPlaceholder: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(30),
        backgroundColor: COLORS.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(10),
        padding: 2,
    },
    vendorInfo: {
        flex: 1,
        marginLeft: scale(12),
    },
    vendorName: {
        fontSize: moderateScale(16),
        color: COLORS.gray900,
        marginBottom: verticalScale(4),
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        marginBottom: verticalScale(4),
    },
    ratingText: {
        color: COLORS.gray900,
        fontWeight: '600',
    },
    reviewCount: {
        color: COLORS.gray500,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
    },
    statText: {
        color: COLORS.gray500,
    },
    removeButton: {
        padding: scale(8),
        minWidth: moderateScale(40),
        minHeight: moderateScale(40),
        justifyContent: 'center',
        alignItems: 'center',
    },
    addedDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        marginTop: verticalScale(12),
        paddingTop: verticalScale(12),
        borderTopWidth: 1,
        borderTopColor: COLORS.gray100,
    },
    addedDateText: {
        color: COLORS.gray400,
    },

    // Empty State
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(32),
        paddingVertical: verticalScale(60),
    },
    emptyIconContainer: {
        width: moderateScale(120),
        height: moderateScale(120),
        borderRadius: moderateScale(60),
        backgroundColor: COLORS.gray100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(24),
    },
    emptyTitle: {
        fontSize: moderateScale(22),
        color: COLORS.gray900,
        marginBottom: verticalScale(12),
        textAlign: 'center',
    },
    emptyMessage: {
        color: COLORS.gray600,
        textAlign: 'center',
        lineHeight: moderateScale(22),
        marginBottom: verticalScale(32),
    },
    browseButton: {
        borderRadius: moderateScale(12),
        overflow: 'hidden',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    browseButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(32),
    },
    browseButtonText: {
        color: COLORS.white,
    },

    // Footer (pagination)
    footerContainer: {
        paddingVertical: verticalScale(16),
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: scale(8),
    },
    footerText: {
        color: COLORS.gray500,
    },
});
