// src/components/vendor/PricingHeader.tsx
/**
 * Pricing Header Component
 *
 * Displays price with optional original price (for discounts).
 * Used in subscription cards and checkout screens.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import type { BillingInterval } from '@/types/subscription';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { COLORS } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

export interface PricingHeaderProps {
    price: number;
    currency: string;
    interval: BillingInterval;
    originalPrice?: number;
    showSavings?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const PricingHeaderComponent = ({
    price,
    currency,
    interval,
    originalPrice,
    showSavings = true,
}: PricingHeaderProps) => {
    const hasSavings = originalPrice && originalPrice > price;
    const savingsAmount = hasSavings ? originalPrice - price : 0;
    const savingsPercentage = hasSavings
        ? Math.round((savingsAmount / originalPrice!) * 100)
        : 0;

    return (
        <View style={styles.container}>
            <PriceDisplay
                price={price}
                currency={currency}
                interval={interval}
                size="large"
                showInterval={true}
                originalPrice={originalPrice}
                align="center"
            />

            {hasSavings && showSavings && (
                <View style={styles.savingsBadge}>
                    <Text type="caption" style={styles.savingsText}>
                        Save {savingsPercentage}%
                    </Text>
                </View>
            )}
        </View>
    );
};

// ============================================================================
// Memoization
// ============================================================================

export const PricingHeader = memo(PricingHeaderComponent);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: verticalScale(8),
        paddingVertical: verticalScale(12),
    },
    savingsBadge: {
        backgroundColor: COLORS.success,
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(12),
    },
    savingsText: {
        color: COLORS.white,
    },
});
