// src/components/vendor/ReviewCard.tsx
/**
 * Review Card Component
 *
 * Displays a single review with customer information, rating,
 * comment, and date. Supports expandable long comments.
 */

import React, { memo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Text from '@/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { RatingStars } from '@/components/common/RatingStars';
import { COLORS } from '@/constants/colors';
import { formatTimeOnly } from '@/utils/dateFormatters';
import type { Review } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface ReviewCardProps {
    review: Review;
    showReadMore?: boolean; // Enable read more for long comments
    maxLines?: number; // Max lines before truncation
}

// ============================================================================
// Component
// ============================================================================

const ReviewCardComponent = ({
    review,
    showReadMore = true,
    maxLines = 3,
}: ReviewCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showExpandButton, setShowExpandButton] = useState(false);

    // Format date to relative time with time of day
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const time = formatTimeOnly(date);

        // Compare calendar dates (not just 24-hour periods)
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const reviewDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffInCalendarDays = Math.floor((today.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffInCalendarDays === 0) return `Today at ${time}`;
        if (diffInCalendarDays === 1) return `Yesterday at ${time}`;
        if (diffInCalendarDays < 7) return `${diffInCalendarDays} days ago at ${time}`;
        if (diffInCalendarDays < 30) {
            const weeks = Math.floor(diffInCalendarDays / 7);
            return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
        }
        if (diffInCalendarDays < 365) {
            const months = Math.floor(diffInCalendarDays / 30);
            return `${months} ${months === 1 ? 'month' : 'months'} ago`;
        }
        const years = Math.floor(diffInCalendarDays / 365);
        return `${years} ${years === 1 ? 'year' : 'years'} ago`;
    };

    // Handle text layout to determine if truncation happened
    const handleTextLayout = (e: any) => {
        if (showReadMore && !isExpanded) {
            const { lines } = e.nativeEvent;
            setShowExpandButton(lines.length > maxLines);
        }
    };

    return (
        <View style={styles.card}>
            {/* Customer Info Row */}
            <View style={styles.header}>
                {/* Avatar - Profile Pic or User Icon */}
                {review.customerPhoto ? (
                    <Image
                        source={{ uri: review.customerPhoto }}
                        style={styles.avatarImage}
                    />
                ) : (
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.avatar}
                    >
                        <Ionicons name="person" size={moderateScale(22)} color={COLORS.white} />
                    </LinearGradient>
                )}

                {/* Customer Name and Date */}
                <View style={styles.customerInfo}>
                    <Text type="bodySemiBold" style={styles.customerName}>{review.customerName}</Text>
                    <Text type="body" style={styles.dateText}>{formatDate(review.createdAt)}</Text>
                </View>

                {/* Rating Stars */}
                <View style={styles.ratingContainer}>
                    <RatingStars rating={review.rating} size="small" />
                </View>
            </View>

            {/* Review Comment */}
            <View style={styles.commentSection}>
                <Text
                    type="body2"
                    style={styles.commentText}
                    numberOfLines={isExpanded ? undefined : maxLines}
                    onTextLayout={handleTextLayout}
                >
                    {review.comment}
                </Text>

                {/* Read More/Less Button */}
                {showReadMore && showExpandButton && (
                    <TouchableOpacity
                        onPress={() => setIsExpanded(!isExpanded)}
                        activeOpacity={0.7}
                        style={styles.readMoreButton}
                    >
                        <Text type="body2" style={styles.readMoreText}>
                            {isExpanded ? 'Read Less' : 'Read More'}
                        </Text>
                        <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={COLORS.primary}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

// ============================================================================
// Memoization
// ============================================================================

export const ReviewCard = memo(ReviewCardComponent);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(12),
        padding: scale(16),
        marginBottom: verticalScale(12),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: COLORS.gray100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(12),
    },
    avatar: {
        width: moderateScale(44),
        height: moderateScale(44),
        borderRadius: moderateScale(22),
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: moderateScale(44),
        height: moderateScale(44),
        borderRadius: moderateScale(22),
    },
    customerInfo: {
        flex: 1,
        marginLeft: scale(12),
    },
    customerName: {
        fontSize: moderateScale(15),
        color: COLORS.gray900,
        marginBottom: verticalScale(2),
    },
    dateText: {
        color: COLORS.gray500,
    },
    ratingContainer: {
        marginLeft: scale(8),
    },
    commentSection: {
        gap: verticalScale(8),
    },
    commentText: {
        lineHeight: moderateScale(20),
        color: COLORS.gray700,
    },
    readMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        alignSelf: 'flex-start',
    },
    readMoreText: {
        color: COLORS.primary,
    },
});
