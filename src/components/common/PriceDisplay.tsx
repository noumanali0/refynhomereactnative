// src/components/common/PriceDisplay.tsx
/**
 * Price Display Component
 *
 * Reusable component for displaying prices with currency and intervals.
 * Supports different sizes and styles for various contexts.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import type { BillingInterval } from '@/types/subscription';
import { formatPrice, formatPriceWithInterval } from '@/utils/subscriptionUtils';
import { COLORS } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

export interface PriceDisplayProps {
    price: number;
    currency?: string;
    interval?: BillingInterval;
    size?: 'small' | 'medium' | 'large';
    showInterval?: boolean;
    originalPrice?: number; // For showing strikethrough
    align?: 'left' | 'center' | 'right';
}

// ============================================================================
// Component
// ============================================================================

const PriceDisplayComponent = ({
    price,
    currency = 'USD',
    interval,
    size = 'medium',
    showInterval = true,
    originalPrice,
    align = 'left',
}: PriceDisplayProps) => {
    // Size configurations
    const sizeConfig = {
        small: {
            currencySize: moderateScale(12),
            priceSize: moderateScale(20),
            intervalSize: moderateScale(11),
            strikethroughSize: moderateScale(14),
        },
        medium: {
            currencySize: moderateScale(14),
            priceSize: moderateScale(32),
            intervalSize: moderateScale(13),
            strikethroughSize: moderateScale(16),
        },
        large: {
            currencySize: moderateScale(18),
            priceSize: moderateScale(48),
            intervalSize: moderateScale(16),
            strikethroughSize: moderateScale(20),
        },
    };

    const config = sizeConfig[size];

    // Format prices
    const formattedPrice = formatPrice(price, currency);
    const intervalText = interval ? (interval === 'month' ? '/mo' : '/yr') : '';

    // Handle free price
    if (price === 0) {
        return (
            <View style={[styles.container, { alignItems: align }]}>
                <Text style={[styles.freeText, { fontSize: config.priceSize }]}>
                    Free
                </Text>
            </View>
        );
    }

    // Calculate currency symbol and amount
    const symbols: Record<string, string> = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        PKR: 'Rs',
    };
    const symbol = symbols[currency] || currency;
    const amount = price.toFixed(2);

    return (
        <View style={[styles.container, { alignItems: align }]}>
            {/* Original Price (Strikethrough) */}
            {originalPrice && originalPrice > price && (
                <Text
                    style={[
                        styles.originalPrice,
                        { fontSize: config.strikethroughSize },
                    ]}
                >
                    {formatPrice(originalPrice, currency)}
                </Text>
            )}

            {/* Main Price Display */}
            <View style={styles.priceRow}>
                <Text style={[styles.currency, { fontSize: config.currencySize }]}>
                    {symbol}
                </Text>
                <Text style={[styles.amount, { fontSize: config.priceSize }]}>
                    {amount}
                </Text>
                {showInterval && interval && (
                    <Text
                        style={[styles.interval, { fontSize: config.intervalSize }]}
                    >
                        {intervalText}
                    </Text>
                )}
            </View>
        </View>
    );
};

// ============================================================================
// Memoization
// ============================================================================

export const PriceDisplay = memo(PriceDisplayComponent);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    container: {
        gap: verticalScale(4),
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: scale(2),
    },
    currency: {
        fontWeight: '600',
        color: COLORS.gray600,
    },
    amount: {
        fontWeight: '700',
        color: COLORS.gray900,
        letterSpacing: -0.5,
    },
    interval: {
        fontWeight: '500',
        color: COLORS.gray500,
        marginLeft: scale(2),
    },
    freeText: {
        fontWeight: '700',
        color: COLORS.success,
    },
    originalPrice: {
        fontWeight: '500',
        color: COLORS.gray400,
        textDecorationLine: 'line-through',
    },
});
