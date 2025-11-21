// src/components/vendor/SubscriptionCard.tsx
/**
 * Subscription Card Component
 *
 * Displays a subscription plan with features, pricing, and CTA button.
 * Supports highlighting for current plan and popular badge.
 */

import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import type { SubscriptionPlan, SubscriptionTier } from '@/types/subscription';
import { PricingHeader } from './PricingHeader';
import { SubscriptionFeature } from './SubscriptionFeature';
import { getTierColor } from '@/utils/subscriptionUtils';
import { COLORS } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

export interface SubscriptionCardProps {
    plan: SubscriptionPlan;
    currentTier?: SubscriptionTier;
    isActive?: boolean;
    onSelect: (planId: string) => void;
    disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const SubscriptionCardComponent = ({
    plan,
    currentTier,
    isActive = false,
    onSelect,
    disabled = false,
}: SubscriptionCardProps) => {
    const isCurrent = currentTier === plan.tier;
    const tierColor = getTierColor(plan.tier);

    const getButtonText = () => {
        if (isCurrent) return 'Current Plan';
        if (disabled) return 'Unavailable';
        if (plan.tier === 'free') return 'Downgrade to Free';
        if (currentTier && currentTier !== 'free') return 'Switch Plan';
        return 'Get Started';
    };

    const buttonText = getButtonText();

    return (
        <View
            style={[
                styles.card,
                isActive && styles.activeCard,
                plan.popular && styles.popularCard,
            ]}
        >
            {/* Popular Badge */}
            {plan.popular && (
                <View style={styles.popularBadge}>
                    <Text type="caption" style={styles.popularText}>MOST POPULAR</Text>
                </View>
            )}

            {/* Tier Color Accent */}
            <View style={[styles.tierAccent, { backgroundColor: tierColor }]} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.tierInfo}>
                    <Text type="title" style={styles.tierName}>{plan.name}</Text>
                    {plan.tagline && (
                        <Text type="body2" style={styles.tagline}>{plan.tagline}</Text>
                    )}
                </View>
                {isCurrent && (
                    <View style={styles.currentBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        <Text type="body" style={styles.currentText}>Active</Text>
                    </View>
                )}
            </View>

            {/* Pricing */}
            <View style={styles.pricingSection}>
                <PricingHeader
                    price={plan.price}
                    currency={plan.currency}
                    interval={plan.interval}
                    showSavings={false}
                />
            </View>

            {/* Features */}
            <View style={styles.featuresSection}>
                <Text type="bodySemiBold" style={styles.featuresTitle}>Features included:</Text>
                {plan.features
                    .filter(f => f.available)
                    .slice(0, 5)
                    .map((feature, index) => (
                        <SubscriptionFeature
                            key={feature.id || index}
                            feature={feature}
                            size="medium"
                        />
                    ))}
                {plan.features.filter(f => f.available).length > 5 && (
                    <Text type="body2" style={styles.moreFeatures}>
                        +{plan.features.filter(f => f.available).length - 5} more features
                    </Text>
                )}
            </View>

            {/* Action Button */}
            <TouchableOpacity
                style={[styles.button, isCurrent && styles.buttonDisabled]}
                onPress={() => !isCurrent && !disabled && onSelect(plan.id)}
                disabled={isCurrent || disabled}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={
                        isCurrent || disabled
                            ? [COLORS.gray300, COLORS.gray400]
                            : [COLORS.primary, COLORS.accent]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                >
                    <Text type="button" style={styles.buttonText}>{buttonText}</Text>
                    {!isCurrent && !disabled && (
                        <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                    )}
                </LinearGradient>
            </TouchableOpacity>

            {/* Limits Info */}
            <View style={styles.limitsInfo}>
                <View style={styles.limitItem}>
                    <Ionicons name="flash" size={14} color={COLORS.gray500} />
                    <Text type="body" style={styles.limitText}>
                        {plan.limits.maxRequests === null
                            ? 'Unlimited'
                            : `${plan.limits.maxRequests}`}{' '}
                        requests/month
                    </Text>
                </View>
                {plan.limits.discountPercentage > 0 && (
                    <View style={styles.limitItem}>
                        <Ionicons name="pricetag" size={14} color={COLORS.success} />
                        <Text type="body" style={[styles.limitText, { color: COLORS.success }]}>
                            {plan.limits.discountPercentage}% platform discount
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

// ============================================================================
// Memoization
// ============================================================================

export const SubscriptionCard = memo(SubscriptionCardComponent);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(20),
        padding: scale(20),
        marginBottom: verticalScale(16),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 2,
        borderColor: COLORS.gray200,
        overflow: 'hidden',
    },
    activeCard: {
        borderColor: COLORS.primary,
    },
    popularCard: {
        borderColor: COLORS.warning,
        transform: [{ scale: 1.02 }],
    },
    popularBadge: {
        position: 'absolute',
        top: verticalScale(16),
        right: scale(16),
        backgroundColor: COLORS.warning,
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(12),
        zIndex: 1,
    },
    popularText: {
        fontSize: moderateScale(10),
        color: COLORS.white,
        letterSpacing: 0.5,
    },
    tierAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: verticalScale(4),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: verticalScale(8),
        marginBottom: verticalScale(12),
    },
    tierInfo: {
        flex: 1,
    },
    tierName: {
        fontSize: moderateScale(24),
        color: COLORS.gray900,
        marginBottom: verticalScale(4),
    },
    tagline: {
        color: COLORS.gray600,
    },
    currentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        backgroundColor: COLORS.success + '15',
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(12),
    },
    currentText: {
        color: COLORS.success,
    },
    pricingSection: {
        paddingVertical: verticalScale(16),
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
    },
    featuresSection: {
        paddingVertical: verticalScale(20),
        gap: verticalScale(2),
    },
    featuresTitle: {
        color: COLORS.gray700,
        marginBottom: verticalScale(8),
    },
    moreFeatures: {
        color: COLORS.primary,
        marginTop: verticalScale(8),
    },
    button: {
        borderRadius: moderateScale(12),
        overflow: 'hidden',
        marginBottom: verticalScale(16),
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(24),
    },
    buttonText: {
        color: COLORS.white,
    },
    limitsInfo: {
        gap: verticalScale(8),
    },
    limitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    limitText: {
        color: COLORS.gray600,
    },
});
