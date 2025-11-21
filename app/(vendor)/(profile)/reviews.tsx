// app/(vendor)/(profile)/reviews.tsx
/**
 * Reviews Screen
 *
 * Displays all reviews for the vendor with filtering and sorting options.
 * Shows rating distribution and allows filtering by star rating.
 */

import React, { useMemo, useState } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    RefreshControl,
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
import { COLORS } from '@/constants/colors';
import type { Review } from '@/types';

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
    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('latest');
    const [filterByStar, setFilterByStar] = useState<FilterOption>('all');

    // Get current vendor
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const allVendors = useSelector((state: RootState) => state.vendor.vendors);
    const vendorProfile = useMemo(() => {
        return allVendors.find(v => v.id === currentUser?.uid) || allVendors[0];
    }, [allVendors, currentUser]);

    // Get all reviews for this vendor
    const allReviews = useSelector((state: RootState) => state.review.reviews);
    const vendorReviews = useMemo(() => {
        return allReviews.filter(r => r.vendorId === vendorProfile?.id);
    }, [allReviews, vendorProfile]);

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

    // Calculate average rating
    const averageRating = useMemo(() => {
        if (vendorReviews.length === 0) return 0;
        const total = vendorReviews.reduce((sum, review) => sum + review.rating, 0);
        return total / vendorReviews.length;
    }, [vendorReviews]);

    // Filter and sort reviews
    const processedReviews = useMemo(() => {
        let filtered = [...vendorReviews];

        // Apply star filter
        if (filterByStar !== 'all') {
            filtered = filtered.filter(r => Math.floor(r.rating) === filterByStar);
        }

        // Apply sort
        switch (sortBy) {
            case 'latest':
                filtered.sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                break;
            case 'highest':
                filtered.sort((a, b) => b.rating - a.rating);
                break;
            case 'lowest':
                filtered.sort((a, b) => a.rating - b.rating);
                break;
        }

        return filtered;
    }, [vendorReviews, filterByStar, sortBy]);

    // Handle refresh
    const onRefresh = async () => {
        setRefreshing(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
    };

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
                            {processedReviews.length} of {vendorReviews.length} reviews
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
                                Based on {vendorReviews.length} reviews
                            </Text>
                        </View>
                    </View>

                    {/* Rating Distribution */}
                    <View style={styles.distributionSection}>
                        <RatingDistribution
                            distribution={ratingDistribution}
                            totalReviews={vendorReviews.length}
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
                                ({vendorReviews.length})
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
                    {processedReviews.length > 0 ? (
                        processedReviews.map((review) => (
                            <ReviewCard
                                key={review.id}
                                review={review}
                                showReadMore={true}
                                maxLines={3}
                            />
                        ))
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
});
