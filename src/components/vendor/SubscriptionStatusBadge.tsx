// src/components/vendor/SubscriptionStatusBadge.tsx
/**
 * Subscription Status Badge Component
 *
 * Visual indicator for subscription status (active, past_due, canceled, etc.).
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import type { SubscriptionStatus } from '@/types/subscription';
import { COLORS } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

export interface SubscriptionStatusBadgeProps {
    status: SubscriptionStatus;
    size?: 'small' | 'medium';
}

// ============================================================================
// Component
// ============================================================================

const SubscriptionStatusBadgeComponent = ({
    status,
    size = 'medium',
}: SubscriptionStatusBadgeProps) => {
    const config = {
        small: {
            fontSize: moderateScale(11),
            iconSize: 12,
            paddingH: scale(8),
            paddingV: verticalScale(3),
        },
        medium: {
            fontSize: moderateScale(13),
            iconSize: 14,
            paddingH: scale(10),
            paddingV: verticalScale(5),
        },
    };

    const style = config[size];

    const statusConfig: Record<
        SubscriptionStatus,
        { label: string; color: string; icon: string }
    > = {
        active: {
            label: 'Active',
            color: COLORS.success,
            icon: 'checkmark-circle',
        },
        trialing: {
            label: 'Trial',
            color: COLORS.info,
            icon: 'time',
        },
        past_due: {
            label: 'Payment Failed',
            color: COLORS.error,
            icon: 'warning',
        },
        canceled: {
            label: 'Canceled',
            color: COLORS.gray500,
            icon: 'close-circle',
        },
        incomplete: {
            label: 'Incomplete',
            color: COLORS.warning,
            icon: 'alert-circle',
        },
        unpaid: {
            label: 'Unpaid',
            color: COLORS.error,
            icon: 'ban',
        },
    };

    const { label, color, icon } = statusConfig[status];

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: `${color}15`,
                    paddingHorizontal: style.paddingH,
                    paddingVertical: style.paddingV,
                },
            ]}
        >
            <Ionicons name={icon as any} size={style.iconSize} color={color} />
            <Text type="body2" style={[styles.label, { fontSize: style.fontSize, color }]}>
                {label}
            </Text>
        </View>
    );
};

// ============================================================================
// Memoization
// ============================================================================

export const SubscriptionStatusBadge = memo(SubscriptionStatusBadgeComponent);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        borderRadius: moderateScale(12),
    },
    label: {
    },
});
