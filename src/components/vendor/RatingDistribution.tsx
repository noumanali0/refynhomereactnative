// src/components/vendor/RatingDistribution.tsx
/**
 * Rating Distribution Component
 *
 * Displays a visual breakdown of ratings from 5-star to 1-star
 * with progress bars and percentages. Optionally tappable to filter.
 */

import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { COLORS } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

export interface RatingDistributionData {
    5: number; // count of 5-star reviews
    4: number; // count of 4-star reviews
    3: number; // count of 3-star reviews
    2: number; // count of 2-star reviews
    1: number; // count of 1-star reviews
}

export interface RatingDistributionProps {
    distribution: RatingDistributionData;
    totalReviews: number;
    onStarPress?: (star: number) => void; // Optional filter callback
    interactive?: boolean; // Whether bars are tappable
}

// ============================================================================
// Component
// ============================================================================

const RatingDistributionComponent = ({
    distribution,
    totalReviews,
    onStarPress,
    interactive = false,
}: RatingDistributionProps) => {
    // Calculate percentages for each star rating
    const getPercentage = (count: number): number => {
        if (totalReviews === 0) return 0;
        return Math.round((count / totalReviews) * 100);
    };

    // Render a single rating row
    const renderRatingRow = (star: number) => {
        const count = distribution[star as keyof RatingDistributionData] || 0;
        const percentage = getPercentage(count);

        const content = (
            <View style={styles.ratingRow}>
                {/* Star Label */}
                <View style={styles.starLabel}>
                    <Text type="bodySemiBold" style={styles.starNumber}>{star}</Text>
                    <Ionicons name="star" size={14} color={COLORS.warning} />
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                    <View
                        style={[
                            styles.progressBar,
                            {
                                width: `${percentage}%`,
                                backgroundColor: getProgressColor(star),
                            },
                        ]}
                    />
                </View>

                {/* Count and Percentage */}
                <View style={styles.countContainer}>
                    <Text type="body2" style={styles.countText}>{count}</Text>
                    <Text type="body" style={styles.percentageText}>({percentage}%)</Text>
                </View>
            </View>
        );

        // If interactive and callback provided, wrap in TouchableOpacity
        if (interactive && onStarPress) {
            return (
                <TouchableOpacity
                    key={star}
                    onPress={() => onStarPress(star)}
                    activeOpacity={0.7}
                >
                    {content}
                </TouchableOpacity>
            );
        }

        return <View key={star}>{content}</View>;
    };

    return (
        <View style={styles.container}>
            {[5, 4, 3, 2, 1].map((star) => renderRatingRow(star))}
        </View>
    );
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get color for progress bar based on star rating
 */
const getProgressColor = (star: number): string => {
    if (star >= 4) return COLORS.success;
    if (star === 3) return COLORS.warning;
    return COLORS.error;
};

// ============================================================================
// Memoization
// ============================================================================

export const RatingDistribution = memo(RatingDistributionComponent);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    container: {
        gap: verticalScale(10),
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
    },
    starLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        width: moderateScale(45),
    },
    starNumber: {
        color: COLORS.gray700,
    },
    progressBarContainer: {
        flex: 1,
        height: verticalScale(8),
        backgroundColor: COLORS.gray200,
        borderRadius: moderateScale(4),
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: moderateScale(4),
    },
    countContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        width: moderateScale(70),
    },
    countText: {
        color: COLORS.gray900,
    },
    percentageText: {
        color: COLORS.gray500,
    },
});
