// src/components/customer/RequestCard.tsx
/**
 * Request Card Component
 *
 * Displays customer service request with status, date, location,
 * and proposal count information.
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

interface RequestCardProps {
    request: {
        id: string;
        title: string;
        serviceType: string;
        status: string;
        preferredDate: string;
        address: {
            city: string;
        };
        estimatedBudget?: number;
        proposalCount?: number;
    };
    onPress: () => void;
}

// ============================================================================
// Component
// ============================================================================

const RequestCardComponent: React.FC<RequestCardProps> = ({ request, onPress }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'awaiting_proposals':
                return COLORS.warning;
            case 'proposals_received':
                return COLORS.info;
            case 'in_progress':
                return COLORS.accent;
            case 'completed':
                return COLORS.success;
            default:
                return COLORS.gray500;
        }
    };

    const getStatusText = (status: string) => {
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const statusColor = getStatusColor(request.status);

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text type="bodySemiBold" style={styles.title} numberOfLines={1}>
                        {request.title}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text type="caption" style={[styles.statusText, { color: statusColor }]}>
                            {getStatusText(request.status)}
                        </Text>
                    </View>
                </View>
                <Text type="body2" style={styles.serviceType}>{request.serviceType}</Text>
            </View>

            <View style={styles.details}>
                <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={14} color={COLORS.gray500} />
                    <Text type="body2" style={styles.detailText}>
                        {new Date(request.preferredDate).toLocaleDateString()}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={14} color={COLORS.gray500} />
                    <Text type="body2" style={styles.detailText}>{request.address.city}</Text>
                </View>
                {request.estimatedBudget && (
                    <View style={styles.detailRow}>
                        <Ionicons name="cash-outline" size={14} color={COLORS.gray500} />
                        <Text type="body2" style={styles.detailText}>Rs. {request.estimatedBudget}</Text>
                    </View>
                )}
            </View>

            {request.proposalCount !== undefined && request.proposalCount > 0 && (
                <View style={styles.footer}>
                    <Text type="bodySemiBold" style={styles.proposalCount}>
                        {request.proposalCount} proposal{request.proposalCount !== 1 ? 's' : ''} received
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

// ============================================================================
// Memoization
// ============================================================================

export const RequestCard = memo(RequestCardComponent);

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
        marginBottom: verticalScale(12),
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: verticalScale(4),
    },
    title: {
        flex: 1,
        color: COLORS.gray900,
        marginRight: scale(8),
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(12),
    },
    statusDot: {
        width: moderateScale(6),
        height: moderateScale(6),
        borderRadius: moderateScale(3),
        marginRight: scale(4),
    },
    statusText: {
        fontSize: moderateScale(11),
    },
    serviceType: {
        color: COLORS.gray600,
    },
    details: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(12),
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
    },
    detailText: {
        color: COLORS.gray600,
    },
    footer: {
        marginTop: verticalScale(12),
        paddingTop: verticalScale(12),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.gray200,
    },
    proposalCount: {
        color: COLORS.info,
    },
});