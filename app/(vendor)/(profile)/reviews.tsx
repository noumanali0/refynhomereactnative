// app/(vendor)/(profile)/reviews.tsx
/**
 * Reviews Screen
 *
 * Displays all reviews for the vendor with filtering and sorting options.
 * Shows rating distribution and allows filtering by star rating.
 * Fetches data from /api/vendors/{id}/reviews/ endpoint
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    View,
    ScrollView,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import Text from '@/components/common/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { RatingStars } from '@/components/common/RatingStars';
import { RatingDistribution } from '@/components/vendor/RatingDistribution';
import { ReviewCard } from '@/components/vendor/ReviewCard';
import { COLORS } from '@/constants/colors';
import {
    fetchVendorReviews,
    loadMoreVendorReviews,
    refreshVendorReviews,
    selectVendorReviews,
    selectIsLoadingVendorReviews,
    selectIsLoadingMoreReviews,
    selectVendorReviewsError,
    selectVendorReviewsCount,
    selectVendorReviewsDistribution,
    selectVendorAverageRating,
    selectVendorReviewsHasMore,
    clearVendorReviews,
    selectOriginalTotalCount,
    selectOriginalDistribution,
    selectOriginalAverageRating,
} from '@/store/slices/reviewSlice';

// ============================================================================
// Types
// ============================================================================

type SortOption = 'latest' | 'highest' | 'lowest';
type FilterOption = 'all' | 1 | 2 | 3 | 4 | 5;

// ============================================================================
// Component
// ============================================================================

export default function ReviewsScreen() {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('latest');
    const [filterByStar, setFilterByStar] = useState<FilterOption>('all');

    // Get current vendor from auth state
    const currentUser = useSelector((state: RootState) => state.auth.user);

    // Get vendor reviews from Redux
    const vendorReviews = useSelector(selectVendorReviews);
    const isLoading = useSelector(selectIsLoadingVendorReviews);
    const isLoadingMore = useSelector(selectIsLoadingMoreReviews);
    const error = useSelector(selectVendorReviewsError);
    const filteredCount = useSelector(selectVendorReviewsCount); // Count of filtered reviews
    const hasMore = useSelector(selectVendorReviewsHasMore);

    // ORIGINAL stats - these never change with filter (for filter chip counts)
    const totalCount = useSelector(selectOriginalTotalCount);
    const distribution = useSelector(selectOriginalDistribution);
    const averageRating = useSelector(selectOriginalAverageRating);

    // Extract vendor ID from user data
    const vendorId = useMemo(() => {
        if (!currentUser) return null;
        return (currentUser as any).id || (currentUser as any).uid;
    }, [currentUser]);

    // Fetch reviews on mount and when filter/sort changes
    const fetchReviews = useCallback(async () => {
        if (!vendorId) return;

        await dispatch(fetchVendorReviews({
            vendorId,
            stars: filterByStar === 'all' ? undefined : filterByStar,
            sort: sortBy,
        }));
    }, [dispatch, vendorId, filterByStar, sortBy]);

    // Fetch reviews on mount
    useEffect(() => {
        fetchReviews();

        // Cleanup on unmount
        return () => {
            dispatch(clearVendorReviews());
        };
    }, []);

    // Re-fetch when filter or sort changes
    useEffect(() => {
        fetchReviews();
    }, [filterByStar, sortBy]);

    // Convert distribution from string keys to number keys for RatingDistribution component
    const ratingDistribution = useMemo(() => {
        return {
            5: distribution['5'] || 0,
            4: distribution['4'] || 0,
            3: distribution['3'] || 0,
            2: distribution['2'] || 0,
            1: distribution['1'] || 0,
        };
    }, [distribution]);

    // Map vendor reviews to the format expected by ReviewCard
    const processedReviews = useMemo(() => {
        return (vendorReviews ?? []).map(review => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
            customerName: review.customer?.name || 'Customer',
            customerPhoto: review.customer?.photo_url,
            serviceCategory: review.service_category,
        }));
    }, [vendorReviews]);

    // Handle refresh
    const onRefresh = useCallback(async () => {
        if (!vendorId) return;
        setRefreshing(true);
        await dispatch(refreshVendorReviews({
            vendorId,
            stars: filterByStar === 'all' ? undefined : filterByStar,
            sort: sortBy,
        }));
        setRefreshing(false);
    }, [dispatch, vendorId, filterByStar, sortBy]);

    // Handle load more (infinite scroll)
    const handleLoadMore = useCallback(() => {
        if (!vendorId || isLoadingMore || !hasMore) return;
        dispatch(loadMoreVendorReviews({
            vendorId,
            stars: filterByStar === 'all' ? undefined : filterByStar,
            sort: sortBy,
        }));
    }, [dispatch, vendorId, isLoadingMore, hasMore, filterByStar, sortBy]);

    // Handle filter by star
    const handleStarFilter = (star: number) => {
        if (filterByStar === star) {
            setFilterByStar('all'); // Deselect if already selected
        } else {
            setFilterByStar(star as FilterOption);
        }
    };

    // Render sort option button
    const renderSortButton = (option: SortOption, label: string) => (
        <TouchableOpacity
            key={option}
            style={[
                styles.sortButton,
                sortBy === option && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy(option)}
            activeOpacity={0.7}
        >
            <Text
                type="bodySemiBold"
                style={[
                    styles.sortButtonText,
                    sortBy === option && styles.sortButtonTextActive,
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

    // Render filter chip
    const renderFilterChip = (star: number) => {
        const count = ratingDistribution[star as keyof typeof ratingDistribution];
        const isActive = filterByStar === star;

        return (
            <TouchableOpacity
                key={star}
                style={[
                    styles.filterChip,
                    isActive && styles.filterChipActive,
                ]}
                onPress={() => handleStarFilter(star)}
                activeOpacity={0.7}
            >
                <Text type="bodySemiBold" style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {star}★
                </Text>
                <Text type="body" style={[styles.filterChipCount, isActive && styles.filterChipCountActive]}>
                    ({count})
                </Text>
            </TouchableOpacity>
        );
    };

    // Render list footer (pagination info and loading indicator)
    const renderListFooter = useCallback(() => {
        if (processedReviews.length === 0) return null;

        if (isLoadingMore) {
            return (
                <View style={styles.footerContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text type="body2" style={styles.footerText}>Loading more...</Text>
                </View>
            );
        }

        if (!hasMore && processedReviews.length > 0) {
            return (
                <View style={styles.footerContainer}>
                    <Text type="body2" style={styles.footerText}>
                        Showing {vendorReviews.length} of {filterByStar === 'all' ? totalCount : filteredCount} reviews
                        {filterByStar !== 'all' && ` (${filterByStar}★ filter)`}
                    </Text>
                </View>
            );
        }

        return null;
    }, [isLoadingMore, hasMore, processedReviews.length, vendorReviews.length, totalCount, filteredCount, filterByStar]);

    // Render empty state
    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="star-outline" size={60} color={COLORS.gray400} />
            </View>
            <Text type="title" style={styles.emptyTitle}>No Reviews Yet</Text>
            <Text type="body2" style={styles.emptyMessage}>
                {filterByStar !== 'all'
                    ? `No ${filterByStar}-star reviews found.\nTry a different filter.`
                    : 'Start completing jobs to receive reviews from customers.'}
            </Text>
            {filterByStar !== 'all' && (
                <TouchableOpacity
                    style={styles.clearFilterButton}
                    onPress={() => setFilterByStar('all')}
                >
                    <Text type="button" style={styles.clearFilterText}>Clear Filter</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text type="title" style={styles.headerTitle}>Reviews</Text>
                        <Text type="subtitle" style={styles.headerSubtitle}>
                            {totalCount > 0 ? `${totalCount} total reviews` : 'No reviews yet'}
                        </Text>
                    </View>
                    <View style={styles.headerSpacer} />
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Rating Overview Card */}
                <View style={styles.overviewCard}>
                    <View style={styles.overviewHeader}>
                        <View style={styles.overviewMainSection}>
                            <Text type="title" style={styles.overviewRating}>
                                {averageRating.toFixed(1)}
                            </Text>
                            <RatingStars rating={averageRating} size="large" />
                            <Text type="body" style={styles.overviewCount}>
                                Based on {totalCount} reviews
                            </Text>
                        </View>
                    </View>

                    {/* Rating Distribution */}
                    <View style={styles.distributionSection}>
                        <RatingDistribution
                            distribution={ratingDistribution}
                            totalReviews={totalCount}
                            interactive={true}
                            onStarPress={handleStarFilter}
                        />
                    </View>
                </View>

                {/* Filter Chips */}
                <View style={styles.filterSection}>
                    <Text type="bodySemiBold" style={styles.filterLabel}>Filter by rating:</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterChipsContainer}
                    >
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                filterByStar === 'all' && styles.filterChipActive,
                            ]}
                            onPress={() => setFilterByStar('all')}
                            activeOpacity={0.7}
                        >
                            <Text
                                type="bodySemiBold"
                                style={[
                                    styles.filterChipText,
                                    filterByStar === 'all' && styles.filterChipTextActive,
                                ]}
                            >
                                All
                            </Text>
                            <Text
                                type="body"
                                style={[
                                    styles.filterChipCount,
                                    filterByStar === 'all' && styles.filterChipCountActive,
                                ]}
                            >
                                ({totalCount})
                            </Text>
                        </TouchableOpacity>
                        {[5, 4, 3, 2, 1].map(renderFilterChip)}
                    </ScrollView>
                </View>

                {/* Sort Options */}
                <View style={styles.sortSection}>
                    <Text type="bodySemiBold" style={styles.sortLabel}>Sort by:</Text>
                    <View style={styles.sortButtons}>
                        {renderSortButton('latest', 'Latest')}
                        {renderSortButton('highest', 'Highest Rating')}
                        {renderSortButton('lowest', 'Lowest Rating')}
                    </View>
                </View>

                {/* Reviews List */}
                <View style={styles.reviewsSection}>
                    {isLoading && processedReviews.length === 0 ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text type="body" style={styles.loadingText}>Loading reviews...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
                            <Text type="body" style={styles.errorText}>{error}</Text>
                            <TouchableOpacity style={styles.retryButton} onPress={fetchReviews}>
                                <Text type="button" style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : processedReviews.length > 0 ? (
                        <FlatList
                            data={processedReviews}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item: review }) => (
                                <ReviewCard
                                    review={review}
                                    showReadMore={true}
                                    maxLines={3}
                                />
                            )}
                            ListFooterComponent={renderListFooter}
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.5}
                            scrollEnabled={false}
                            nestedScrollEnabled={true}
                        />
                    ) : (
                        renderEmptyState()
                    )}
                </View>
            </ScrollView>
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
    header: {
        paddingTop: verticalScale(50),
        paddingBottom: verticalScale(20),
        paddingHorizontal: scale(16),
        borderBottomLeftRadius: moderateScale(24),
        borderBottomRightRadius: moderateScale(24),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
    },
    backButton: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: moderateScale(24),
        fontWeight: '800',
        color: COLORS.white,
        marginBottom: verticalScale(2),
    },
    headerSubtitle: {
        fontSize: moderateScale(13),
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
    headerSpacer: {
        width: moderateScale(40),
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: verticalScale(32),
    },
    overviewCard: {
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
    overviewHeader: {
        alignItems: 'center',
        marginBottom: verticalScale(20),
    },
    overviewMainSection: {
        alignItems: 'center',
        gap: verticalScale(4),
    },
    overviewRating: {
        fontSize: moderateScale(56),
        fontWeight: '800',
        color: COLORS.gray900,
        lineHeight: moderateScale(64),
        includeFontPadding: false,
    },
    overviewCount: {
        fontSize: moderateScale(13),
        color: COLORS.gray600,
        marginTop: verticalScale(4),
    },
    distributionSection: {
        paddingTop: verticalScale(16),
        borderTopWidth: 1,
        borderTopColor: COLORS.gray200,
    },
    filterSection: {
        marginTop: verticalScale(20),
        marginHorizontal: scale(16),
    },
    filterLabel: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: COLORS.gray700,
        marginBottom: verticalScale(10),
    },
    filterChipsContainer: {
        gap: scale(8),
        paddingRight: scale(16),
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(8),
        borderRadius: moderateScale(20),
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.gray300,
    },
    filterChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterChipText: {
        fontSize: moderateScale(13),
        fontWeight: '600',
        color: COLORS.gray700,
    },
    filterChipTextActive: {
        color: COLORS.white,
    },
    filterChipCount: {
        fontSize: moderateScale(12),
        color: COLORS.gray500,
    },
    filterChipCountActive: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    sortSection: {
        marginTop: verticalScale(20),
        marginHorizontal: scale(16),
    },
    sortLabel: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: COLORS.gray700,
        marginBottom: verticalScale(10),
    },
    sortButtons: {
        flexDirection: 'row',
        gap: scale(8),
    },
    sortButton: {
        flex: 1,
        paddingVertical: verticalScale(10),
        paddingHorizontal: scale(12),
        borderRadius: moderateScale(10),
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.gray300,
        alignItems: 'center',
    },
    sortButtonActive: {
        backgroundColor: COLORS.primary50,
        borderColor: COLORS.primary,
    },
    sortButtonText: {
        fontSize: moderateScale(13),
        fontWeight: '600',
        color: COLORS.gray700,
    },
    sortButtonTextActive: {
        color: COLORS.primary,
    },
    reviewsSection: {
        marginTop: verticalScale(20),
        paddingHorizontal: scale(16),
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: verticalScale(60),
        paddingHorizontal: scale(32),
    },
    emptyIconContainer: {
        width: moderateScale(120),
        height: moderateScale(120),
        borderRadius: moderateScale(60),
        backgroundColor: COLORS.gray100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(20),
    },
    emptyTitle: {
        fontSize: moderateScale(22),
        fontWeight: '700',
        color: COLORS.gray900,
        marginBottom: verticalScale(8),
        textAlign: 'center',
    },
    emptyMessage: {
        fontSize: moderateScale(14),
        color: COLORS.gray600,
        textAlign: 'center',
        lineHeight: moderateScale(20),
    },
    clearFilterButton: {
        marginTop: verticalScale(20),
        paddingVertical: verticalScale(10),
        paddingHorizontal: scale(20),
        backgroundColor: COLORS.primary,
        borderRadius: moderateScale(10),
    },
    clearFilterText: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: COLORS.white,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: verticalScale(60),
    },
    loadingText: {
        marginTop: verticalScale(12),
        fontSize: moderateScale(14),
        color: COLORS.gray600,
    },
    errorContainer: {
        alignItems: 'center',
        paddingVertical: verticalScale(60),
        paddingHorizontal: scale(32),
    },
    errorText: {
        marginTop: verticalScale(12),
        fontSize: moderateScale(14),
        color: COLORS.gray600,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: verticalScale(16),
        paddingVertical: verticalScale(10),
        paddingHorizontal: scale(24),
        backgroundColor: COLORS.primary,
        borderRadius: moderateScale(10),
    },
    retryButtonText: {
        fontSize: moderateScale(14),
        fontWeight: '600',
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
