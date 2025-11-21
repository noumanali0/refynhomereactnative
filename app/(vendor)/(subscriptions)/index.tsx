// app/(vendor)/(subscriptions)/index.tsx
/**
 * Vendor Subscriptions Screen
 *
 * Main screen for viewing and managing subscription plans.
 * Displays current subscription status and available plans.
 */

import React, { useEffect } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import Text from '@/components/common/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionCard } from '@/components/vendor/SubscriptionCard';
import { SubscriptionStatusBadge } from '@/components/vendor/SubscriptionStatusBadge';
import { COLORS } from '@/constants/colors';

// ============================================================================
// Component
// ============================================================================

export default function SubscriptionsScreen() {
    const router = useRouter();
    const {
        subscription,
        currentTier,
        plans,
        isLoading,
        error,
        usagePercentage,
        remainingDisplay,
        daysUntilBilling,
        healthStatus,
        needsAttention,
        statusMessage,
        initialize,
        refresh,
        selectPlan,
    } = useSubscription();
    console.log("🚀 ~ SubscriptionsScreen ~ plans:", plans)

    // Get vendor ID from auth state
    const vendorId = useSelector((state: RootState) => state.auth.user?.uid);

    // Initialize on mount
    useEffect(() => {
        // if (vendorId) {
        initialize('1234');
        // initialize(vendorId);
        // }
    }, []);
    // }, [vendorId]);

    // Handle plan selection
    const handleSelectPlan = (planId: string) => {
        selectPlan(planId);
        router.push('/(vendor)/(subscriptions)/checkout');
    };

    // Handle refresh
    const [refreshing, setRefreshing] = React.useState(false);
    const onRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    };

    if (isLoading && !subscription) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text type="body2" style={styles.loadingText}>Loading subscriptions...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Current Subscription Status */}
            {subscription && (
                <View style={styles.statusCard}>
                    <View style={styles.statusHeader}>
                        <Text type="subtitle2" style={styles.statusTitle}>Current Plan</Text>
                        <SubscriptionStatusBadge
                            status={subscription.status}
                            size="medium"
                        />
                    </View>

                    <View style={styles.statusBody}>
                        <Text type="title" style={styles.planName}>{subscription.plan.name}</Text>
                        <Text type="body2" style={styles.statusMessage}>{statusMessage}</Text>
                    </View>

                    {/* Usage Stats */}
                    {subscription.requestsRemaining !== null && (
                        <View style={styles.usageSection}>
                            <View style={styles.usageHeader}>
                                <Text type="body" style={styles.usageLabel}>Requests This Month</Text>
                                <Text type="bodySemiBold" style={styles.usageValue}>{remainingDisplay}</Text>
                            </View>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${usagePercentage}%`,
                                            backgroundColor:
                                                usagePercentage >= 80
                                                    ? COLORS.error
                                                    : COLORS.success,
                                        },
                                    ]}
                                />
                            </View>
                        </View>
                    )}

                    {/* Billing Info */}
                    {subscription.tier !== 'free' && (
                        <View style={styles.billingInfo}>
                            <Ionicons name="calendar" size={16} color={COLORS.gray600} />
                            <Text type="body" style={styles.billingText}>
                                {subscription.cancelAtPeriodEnd
                                    ? `Cancels in ${daysUntilBilling} days`
                                    : `Renews in ${daysUntilBilling} days`}
                            </Text>
                        </View>
                    )}

                    {/* Attention Banner */}
                    {needsAttention && (
                        <View style={styles.attentionBanner}>
                            <Ionicons name="warning" size={16} color={COLORS.warning} />
                            <Text type="body" style={styles.attentionText}>
                                Action required: {statusMessage}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Error Display */}
            {error && (
                <View style={styles.errorCard}>
                    <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                    <Text type="body2" style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Available Plans */}
            <View style={styles.plansSection}>
                <Text type="title" style={styles.sectionTitle}>Choose Your Plan</Text>
                <Text type="body2" style={styles.sectionSubtitle}>
                    Select the plan that best fits your business needs
                </Text>

                {plans.map(plan => (
                    <SubscriptionCard
                        key={plan.id}
                        plan={plan}
                        currentTier={currentTier}
                        isActive={plan.tier === currentTier}
                        onSelect={handleSelectPlan}
                    />
                ))}
            </View>

            {/* Help Section */}
            <View style={styles.helpCard}>
                <View style={styles.helpIcon}>
                    <Ionicons name="help-circle" size={24} color={COLORS.primary} />
                </View>
                <Text type="title" style={styles.helpTitle}>Need help choosing?</Text>
                <Text type="body2" style={styles.helpText}>
                    Contact our support team for personalized recommendations
                </Text>
                <TouchableOpacity style={styles.helpButton}>
                    <Text type="button" style={styles.helpButtonText}>Contact Support</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.gray50,
    },
    content: {
        padding: scale(16),
        paddingBottom: verticalScale(32),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.gray50,
        gap: verticalScale(12),
    },
    loadingText: {
        color: COLORS.gray600,
    },
    statusCard: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        padding: scale(20),
        marginBottom: verticalScale(20),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    statusTitle: {
        color: COLORS.gray600,
    },
    statusBody: {
        marginBottom: verticalScale(16),
    },
    planName: {
        fontSize: moderateScale(24),
        color: COLORS.gray900,
        marginBottom: verticalScale(4),
    },
    statusMessage: {
        color: COLORS.gray600,
    },
    usageSection: {
        marginBottom: verticalScale(16),
    },
    usageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(8),
    },
    usageLabel: {
        color: COLORS.gray600,
    },
    usageValue: {
        color: COLORS.gray900,
    },
    progressBar: {
        height: verticalScale(8),
        backgroundColor: COLORS.gray200,
        borderRadius: moderateScale(4),
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: moderateScale(4),
    },
    billingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        paddingTop: verticalScale(12),
        borderTopWidth: 1,
        borderTopColor: COLORS.gray200,
    },
    billingText: {
        color: COLORS.gray600,
    },
    attentionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        backgroundColor: COLORS.warning + '15',
        padding: scale(12),
        borderRadius: moderateScale(8),
        marginTop: verticalScale(12),
    },
    attentionText: {
        flex: 1,
        color: COLORS.warning,
    },
    errorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        backgroundColor: COLORS.error + '10',
        padding: scale(16),
        borderRadius: moderateScale(12),
        marginBottom: verticalScale(20),
    },
    errorText: {
        flex: 1,
        color: COLORS.error,
    },
    plansSection: {
        marginBottom: verticalScale(24),
    },
    sectionTitle: {
        fontSize: moderateScale(22),
        color: COLORS.gray900,
        marginBottom: verticalScale(8),
    },
    sectionSubtitle: {
        color: COLORS.gray600,
        marginBottom: verticalScale(20),
    },
    helpCard: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        padding: scale(24),
        alignItems: 'center',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    helpIcon: {
        width: moderateScale(56),
        height: moderateScale(56),
        borderRadius: moderateScale(28),
        backgroundColor: COLORS.primary50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(12),
    },
    helpTitle: {
        color: COLORS.gray900,
        marginBottom: verticalScale(8),
    },
    helpText: {
        color: COLORS.gray600,
        textAlign: 'center',
        marginBottom: verticalScale(16),
    },
    helpButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: scale(24),
        paddingVertical: verticalScale(10),
        borderRadius: moderateScale(10),
    },
    helpButtonText: {
        color: COLORS.white,
    },
});
