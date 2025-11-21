// src/components/vendor/FeatureAccessGuard.tsx
/**
 * Feature Access Guard Component
 *
 * Conditional rendering based on subscription tier and feature access.
 * Shows fallback UI if feature is not available in current tier.
 */

import React, { memo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { SubscriptionTier, SubscriptionFeatureId } from '@/types/subscription';
import { tierHasFeature, getTierDisplayName } from '@/utils/subscriptionUtils';
import { COLORS } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

export interface FeatureAccessGuardProps {
    featureId: SubscriptionFeatureId;
    currentTier: SubscriptionTier;
    fallback?: ReactNode;
    children: ReactNode;
    showUpgradePrompt?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const FeatureAccessGuardComponent = ({
    featureId,
    currentTier,
    fallback,
    children,
    showUpgradePrompt = true,
}: FeatureAccessGuardProps) => {
    const router = useRouter();
    const hasAccess = tierHasFeature(currentTier, featureId);

    // If has access, render children
    if (hasAccess) {
        return <>{children}</>;
    }

    // If custom fallback provided, use it
    if (fallback) {
        return <>{fallback}</>;
    }

    // Default upgrade prompt
    if (showUpgradePrompt) {
        return (
            <View style={styles.upgradeContainer}>
                <View style={styles.lockIcon}>
                    <Ionicons name="lock-closed" size={24} color={COLORS.primary} />
                </View>

                <Text style={styles.upgradeTitle}>Premium Feature</Text>
                <Text style={styles.upgradeMessage}>
                    This feature is not available on your current plan.
                </Text>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push('/(vendor)/(subscriptions)')}
                >
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.upgradeButton}
                    >
                        <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
                        <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    }

    // No fallback, render nothing
    return null;
};

// ============================================================================
// Memoization
// ============================================================================

export const FeatureAccessGuard = memo(FeatureAccessGuardComponent);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    upgradeContainer: {
        backgroundColor: COLORS.gray50,
        borderRadius: moderateScale(16),
        padding: scale(24),
        alignItems: 'center',
        gap: verticalScale(12),
        borderWidth: 1,
        borderColor: COLORS.gray200,
        borderStyle: 'dashed',
    },
    lockIcon: {
        width: moderateScale(56),
        height: moderateScale(56),
        borderRadius: moderateScale(28),
        backgroundColor: COLORS.primary50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(8),
    },
    upgradeTitle: {
        fontSize: moderateScale(18),
        fontWeight: '700',
        color: COLORS.gray900,
    },
    upgradeMessage: {
        fontSize: moderateScale(14),
        color: COLORS.gray600,
        textAlign: 'center',
    },
    upgradeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(24),
        borderRadius: moderateScale(10),
        marginTop: verticalScale(8),
    },
    upgradeButtonText: {
        fontSize: moderateScale(15),
        fontWeight: '700',
        color: COLORS.white,
    },
});
