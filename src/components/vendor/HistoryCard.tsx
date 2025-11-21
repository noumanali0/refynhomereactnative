// src/components/vendor/HistoryCard.tsx
/**
 * History Card Component
 *
 * Displays a single service history item with customer info,
 * service details, status, and optional rating.
 */

import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { RatingStars } from '@/components/common/RatingStars';
import { COLORS } from '@/constants/colors';
import { formatSmartDate } from '@/utils/dateFormatters';
import type { Booking, ServiceCategory } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface HistoryCardProps {
    booking: Booking;
    onPress?: (bookingId: string) => void;
    showRating?: boolean; // Show rating if available
}

// ============================================================================
// Component
// ============================================================================

const HistoryCardComponent = ({
    booking,
    onPress,
    showRating = true,
}: HistoryCardProps) => {
    // Get status color and label
    const getStatusConfig = () => {
        switch (booking.status) {
            case 'completed':
                return {
                    color: COLORS.success,
                    backgroundColor: COLORS.success + '15',
                    label: 'Completed',
                    icon: 'checkmark-circle' as const,
                };
            case 'cancelled':
                return {
                    color: COLORS.error,
                    backgroundColor: COLORS.error + '15',
                    label: 'Cancelled',
                    icon: 'close-circle' as const,
                };
            case 'confirmed':
                return {
                    color: COLORS.info,
                    backgroundColor: COLORS.info + '15',
                    label: 'Confirmed',
                    icon: 'time' as const,
                };
            case 'pending':
            default:
                return {
                    color: COLORS.warning,
                    backgroundColor: COLORS.warning + '15',
                    label: 'Pending',
                    icon: 'hourglass' as const,
                };
        }
    };

    const statusConfig = getStatusConfig();

    // Get initials from customer name (mock for now)
    const getCustomerInitials = (): string => {
        // In real app, this would come from booking.customer.name
        const name = `Customer ${booking.customerId.substring(0, 3)}`;
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Get service icon
    const getServiceIcon = (): string => {
        const iconMap: Record<string, string> = {
            washing_machine: 'settings-outline',
            ac: 'snow-outline',
            refrigerator: 'cube-outline',
            plumbing: 'water-outline',
            electrical: 'flash-outline',
            carpentry: 'hammer-outline',
            painting: 'brush-outline',
            other: 'construct-outline',
        };
        return iconMap[booking.serviceCategory.id] || 'construct-outline';
    };

    // Mock rating (in real app, would come from related review)
    const mockRating = booking.status === 'completed' ? 4.5 : null;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onPress && onPress(booking.id)}
            activeOpacity={0.7}
        >
            {/* Header Row */}
            <View style={styles.header}>
                {/* Service Icon */}
                <View style={styles.serviceIconContainer}>
                    <Ionicons
                        name={getServiceIcon() as any}
                        size={20}
                        color={COLORS.primary}
                    />
                </View>

                {/* Service Name and Date */}
                <View style={styles.headerText}>
                    <Text type="bodySemiBold" style={styles.serviceName} numberOfLines={1}>
                        {booking.serviceCategory.label || booking.serviceCategory.id}
                    </Text>
                    <Text type="body" style={styles.dateText}>
                        {formatSmartDate(booking.scheduledDate)}
                    </Text>
                </View>

                {/* Status Badge */}
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: statusConfig.backgroundColor },
                    ]}
                >
                    <Ionicons
                        name={statusConfig.icon}
                        size={12}
                        color={statusConfig.color}
                    />
                    <Text type="caption" style={[styles.statusText, { color: statusConfig.color }]}>
                        {statusConfig.label}
                    </Text>
                </View>
            </View>

            {/* Customer Info */}
            <View style={styles.customerSection}>
                {/* Customer Avatar */}
                <View style={styles.customerAvatar}>
                    <Text type="bodySemiBold" style={styles.customerAvatarText}>
                        {getCustomerInitials()}
                    </Text>
                </View>

                {/* Customer Details */}
                <View style={styles.customerInfo}>
                    <Text type="bodySemiBold" style={styles.customerName}>
                        Customer #{booking.customerId.substring(0, 6)}
                    </Text>
                    <View style={styles.addressRow}>
                        <Ionicons name="location" size={12} color={COLORS.gray500} />
                        <Text type="body" style={styles.addressText} numberOfLines={1}>
                            {booking.address}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Footer Row */}
            <View style={styles.footer}>
                {/* Time */}
                <View style={styles.footerItem}>
                    <Ionicons name="time-outline" size={14} color={COLORS.gray500} />
                    <Text type="body2" style={styles.footerText}>{booking.scheduledTime}</Text>
                </View>

                {/* Rating (if completed and has rating) */}
                {showRating && mockRating && booking.status === 'completed' && (
                    <View style={styles.footerItem}>
                        <RatingStars rating={mockRating} size="small" />
                        <Text type="body" style={styles.ratingText}>{mockRating.toFixed(1)}</Text>
                    </View>
                )}

                {/* Amount (mock - in real app would come from booking) */}
                {booking.status === 'completed' && (
                    <View style={styles.amountContainer}>
                        <Text type="body" style={styles.amountLabel}>Earned:</Text>
                        <Text type="bodySemiBold" style={styles.amountValue}>Rs. 1,200</Text>
                    </View>
                )}
            </View>

            {/* Notes Preview (if exists) */}
            {booking.notes && (
                <View style={styles.notesSection}>
                    <Ionicons name="document-text-outline" size={12} color={COLORS.gray500} />
                    <Text type="body" style={styles.notesText} numberOfLines={1}>
                        {booking.notes}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

// ============================================================================
// Memoization
// ============================================================================

export const HistoryCard = memo(HistoryCardComponent);

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
        gap: scale(10),
    },
    serviceIconContainer: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        backgroundColor: COLORS.primary50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: {
        flex: 1,
        gap: verticalScale(2),
    },
    serviceName: {
        fontSize: moderateScale(15),
        color: COLORS.gray900,
    },
    dateText: {
        color: COLORS.gray500,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(12),
    },
    statusText: {
    },
    customerSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        marginBottom: verticalScale(12),
        paddingVertical: verticalScale(10),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.gray200,
    },
    customerAvatar: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: COLORS.accent + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    customerAvatarText: {
        fontSize: moderateScale(14),
        color: COLORS.accent,
    },
    customerInfo: {
        flex: 1,
        gap: verticalScale(4),
    },
    customerName: {
        fontSize: moderateScale(14),
        color: COLORS.gray900,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
    },
    addressText: {
        flex: 1,
        color: COLORS.gray600,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(16),
        flexWrap: 'wrap',
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    footerText: {
        color: COLORS.gray600,
    },
    ratingText: {
        color: COLORS.gray700,
        marginLeft: scale(4),
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        marginLeft: 'auto',
    },
    amountLabel: {
        color: COLORS.gray500,
    },
    amountValue: {
        fontSize: moderateScale(14),
        color: COLORS.success,
    },
    notesSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        marginTop: verticalScale(8),
        paddingTop: verticalScale(8),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.gray200,
    },
    notesText: {
        flex: 1,
        color: COLORS.gray500,
        fontStyle: 'italic',
    },
});
