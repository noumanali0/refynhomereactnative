// src/components/vendor/SubscriptionFeature.tsx
/**
 * Subscription Feature Component
 *
 * Displays a single feature with icon and label.
 * Used in subscription plan cards to show available features.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import type { SubscriptionFeature } from '@/types/subscription';
import { COLORS } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

export interface SubscriptionFeatureProps {
    feature: SubscriptionFeature;
    size?: 'small' | 'medium' | 'large';
    showDescription?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const SubscriptionFeatureComponent = ({
    feature,
    size = 'medium',
    showDescription = false,
}: SubscriptionFeatureProps) => {
    const sizeConfig = {
        small: {
            iconSize: 14,
            labelSize: moderateScale(12),
            descSize: moderateScale(10),
        },
        medium: {
            iconSize: 16,
            labelSize: moderateScale(14),
            descSize: moderateScale(12),
        },
        large: {
            iconSize: 18,
            labelSize: moderateScale(16),
            descSize: moderateScale(13),
        },
    };

    const config = sizeConfig[size];
    const iconName = feature.icon || 'checkmark-circle';
    const iconColor = feature.available ? COLORS.success : COLORS.gray400;

    return (
        <View style={styles.container}>
            <View style={styles.iconWrapper}>
                <Ionicons
                    name={feature.available ? iconName : 'close-circle'}
                    size={config.iconSize}
                    color={iconColor}
                />
            </View>
            <View style={styles.textContainer}>
                <Text
                    type="body2"
                    style={[
                        styles.label,
                        { fontSize: config.labelSize },
                        !feature.available && styles.unavailable,
                    ]}
                >
                    {feature.label}
                </Text>
                {showDescription && feature.description && (
                    <Text type="body" style={[styles.description, { fontSize: config.descSize }]}>
                        {feature.description}
                    </Text>
                )}
            </View>
        </View>
    );
};

// ============================================================================
// Memoization
// ============================================================================

export const SubscriptionFeature = memo(SubscriptionFeatureComponent);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(10),
        paddingVertical: verticalScale(6),
    },
    iconWrapper: {
        marginTop: verticalScale(2),
    },
    textContainer: {
        flex: 1,
        gap: verticalScale(2),
    },
    label: {
        color: COLORS.gray800,
    },
    unavailable: {
        color: COLORS.gray400,
        textDecorationLine: 'line-through',
    },
    description: {
        color: COLORS.gray500,
        lineHeight: moderateScale(16),
    },
});
