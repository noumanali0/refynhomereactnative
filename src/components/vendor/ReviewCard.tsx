// src/components/vendor/ReviewCard.tsx
/**
 * Review Card Component
 *
 * Displays a single review with customer information, rating,
 * comment, and date. Supports expandable long comments.
 */

import React, { memo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { RatingStars } from '@/components/common/RatingStars';
import { COLORS } from '@/constants/colors';
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

    // Format date to relative time
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;
        if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
        if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
        return `${Math.floor(diffInDays / 365)} years ago`;
    };

    // Get initials from customer name
    const getInitials = (name: string): string => {
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
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
                {/* Avatar with Initials */}
                <View style={styles.avatar}>
                    <Text type="bodySemiBold" style={styles.avatarText}>{getInitials(review.customerName)}</Text>
                </View>

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
        backgroundColor: COLORS.primary50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: moderateScale(16),
        color: COLORS.primary,
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
