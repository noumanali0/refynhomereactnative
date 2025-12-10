// src/hooks/useSubscription.ts
/**
 * useSubscription Hook
 *
 * Convenient hook for accessing subscription state and actions.
 * Provides a clean API for components to interact with subscriptions.
 */

import { useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import type { SubscriptionTier, SubscriptionFeatureId } from '@/types/subscription';
import {
    selectCurrentSubscription,
    selectCurrentTier,
    selectIsSubscriptionActive,
    selectAllPlans,
    selectIsLoading,
    selectError,
    selectPaymentInProgress,
    selectPaymentError,
    selectSelectedPlan,
    selectCanUpgrade,
    selectCanDowngrade,
    selectRequestUsagePercentage,
    selectIsRequestLimitReached,
    selectIsApproachingRequestLimit,
    selectSubscriptionSummary,
    selectDaysUntilBilling,
    selectWillCancelAtPeriodEnd,
    selectPaymentHealthStatus,
    makeSelectHasFeatureAccess,
    makeSelectPlanById,
} from '@/selectors/subscriptionSelectors';
import {
    initializeSubscriptionService,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    refreshSubscription,
    recordRequestUsage,
    setSelectedPlan,
    clearSelectedPlan,
} from '@/store/slices/subscriptionSlice';
import {
    isSubscriptionActive as checkIsActive,
    needsAttention,
    getSubscriptionHealth,
    getStatusMessage,
    getRemainingDisplay,
} from '@/utils/subscriptionUtils';

// ============================================================================
// Hook Interface
// ============================================================================

export interface UseSubscriptionReturn {
    // State
    subscription: ReturnType<typeof selectCurrentSubscription>;
    currentTier: SubscriptionTier;
    isActive: boolean;
    plans: ReturnType<typeof selectAllPlans>;
    selectedPlan: ReturnType<typeof selectSelectedPlan>;

    // Loading states
    isLoading: boolean;
    isPaymentLoading: boolean;

    // Errors
    error: string | null;
    paymentError: string | null;

    // Usage stats
    usagePercentage: number;
    isLimitReached: boolean;
    isApproachingLimit: boolean;
    remainingDisplay: string;

    // Billing info
    daysUntilBilling: number;
    willCancelAtPeriodEnd: boolean;

    // Health status
    healthStatus: 'healthy' | 'warning' | 'critical' | 'none';
    needsAttention: boolean;
    statusMessage: string;

    // Capabilities
    canUpgrade: boolean;
    canDowngrade: boolean;

    // Actions
    initialize: (vendorId: string) => Promise<void>;
    purchasePlan: (planId: string, paymentMethodId?: string) => Promise<void>;
    upgradePlan: (planId: string) => Promise<void>;
    downgradePlan: (planId: string) => Promise<void>;
    cancelNow: (reason?: string) => Promise<void>;
    cancelAtPeriodEnd: (reason?: string) => Promise<void>;
    reactivateSubscription: () => Promise<void>;
    refresh: () => Promise<void>;
    recordUsage: (requestId: string) => Promise<void>;
    selectPlan: (planId: string) => void;
    clearPlan: () => void;

    // Feature access
    hasFeature: (featureId: SubscriptionFeatureId) => boolean;
    checkFeature: (featureId: SubscriptionFeatureId) => { hasAccess: boolean; requiredTier?: SubscriptionTier };
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSubscription(): UseSubscriptionReturn {
    const dispatch = useDispatch<AppDispatch>();

    // Selectors
    const subscription = useSelector(selectCurrentSubscription);
    const currentTier = useSelector(selectCurrentTier);
    const isActive = useSelector(selectIsSubscriptionActive);
    const plans = useSelector(selectAllPlans);
    const selectedPlan = useSelector(selectSelectedPlan);
    const isLoading = useSelector(selectIsLoading);
    const error = useSelector(selectError);
    const isPaymentLoading = useSelector(selectPaymentInProgress);
    const paymentError = useSelector(selectPaymentError);
    const usagePercentage = useSelector(selectRequestUsagePercentage);
    const isLimitReached = useSelector(selectIsRequestLimitReached);
    const isApproachingLimit = useSelector(selectIsApproachingRequestLimit);
    const canUpgrade = useSelector(selectCanUpgrade);
    const canDowngrade = useSelector(selectCanDowngrade);
    const daysUntilBilling = useSelector(selectDaysUntilBilling);
    const willCancelAtPeriodEnd = useSelector(selectWillCancelAtPeriodEnd);
    const healthStatus = useSelector(selectPaymentHealthStatus);

    // Memoized feature access selector
    const selectHasFeatureAccess = useMemo(() => makeSelectHasFeatureAccess(), []);

    // Derived state
    const needsAttentionFlag = useMemo(() => {
        if (!subscription) return false;
        return needsAttention(subscription);
    }, [subscription]);

    const statusMessage = useMemo(() => {
        if (!subscription) return 'No active subscription';
        return getStatusMessage(subscription);
    }, [subscription]);

    const remainingDisplay = useMemo(() => {
        if (!subscription) return '0 remaining';
        return getRemainingDisplay(subscription);
    }, [subscription]);

    // ========================================================================
    // Actions
    // ========================================================================

    /**
     * Initialize subscription service
     */
    const initialize = useCallback(
        async (vendorId: string) => {
            try {
                await dispatch(initializeSubscriptionService(vendorId)).unwrap();
            } catch (error) {
                console.error('Failed to initialize subscription:', error);
            }
        },
        [dispatch]
    );

    /**
     * Purchase a new plan
     */
    const purchasePlan = useCallback(
        async (planId: string, paymentMethodId?: string) => {
            if (!subscription) {
                throw new Error('No subscription context found');
            }

            try {
                await dispatch(
                    createSubscription({
                        vendorId: subscription.vendorId,
                        planId,
                        paymentMethodId,
                    })
                ).unwrap();
            } catch (error) {
                console.error('Failed to purchase plan:', error);
                throw error;
            }
        },
        [dispatch, subscription]
    );

    /**
     * Upgrade to a higher tier plan
     */
    const upgradePlan = useCallback(
        async (planId: string) => {
            if (!subscription) {
                throw new Error('No subscription found');
            }

            try {
                await dispatch(
                    updateSubscription({
                        subscriptionId: subscription.id,
                        newPlanId: planId,
                    })
                ).unwrap();
            } catch (error) {
                console.error('Failed to upgrade plan:', error);
                throw error;
            }
        },
        [dispatch, subscription]
    );

    /**
     * Downgrade to a lower tier plan
     */
    const downgradePlan = useCallback(
        async (planId: string) => {
            if (!subscription) {
                throw new Error('No subscription found');
            }

            try {
                await dispatch(
                    updateSubscription({
                        subscriptionId: subscription.id,
                        newPlanId: planId,
                    })
                ).unwrap();
            } catch (error) {
                console.error('Failed to downgrade plan:', error);
                throw error;
            }
        },
        [dispatch, subscription]
    );

    /**
     * Cancel subscription immediately
     */
    const cancelNow = useCallback(
        async (reason?: string) => {
            if (!subscription) {
                throw new Error('No subscription found');
            }

            try {
                await dispatch(
                    cancelSubscription({
                        subscriptionId: subscription.id,
                        immediate: true,
                        reason,
                    })
                ).unwrap();
            } catch (error) {
                console.error('Failed to cancel subscription:', error);
                throw error;
            }
        },
        [dispatch, subscription]
    );

    /**
     * Schedule cancellation at period end
     */
    const cancelAtPeriodEnd = useCallback(
        async (reason?: string) => {
            if (!subscription) {
                throw new Error('No subscription found');
            }

            try {
                await dispatch(
                    cancelSubscription({
                        subscriptionId: subscription.id,
                        immediate: false,
                        reason,
                    })
                ).unwrap();
            } catch (error) {
                console.error('Failed to schedule cancellation:', error);
                throw error;
            }
        },
        [dispatch, subscription]
    );

    /**
     * Reactivate a canceled subscription
     */
    const reactivateSubscription = useCallback(async () => {
        if (!subscription) {
            throw new Error('No subscription found');
        }

        try {
            await dispatch(
                updateSubscription({
                    subscriptionId: subscription.id,
                    cancelAtPeriodEnd: false,
                })
            ).unwrap();
        } catch (error) {
            console.error('Failed to reactivate subscription:', error);
            throw error;
        }
    }, [dispatch, subscription]);

    /**
     * Refresh subscription data
     */
    const refresh = useCallback(async () => {
        if (!subscription) return;

        try {
            await dispatch(refreshSubscription(subscription.vendorId)).unwrap();
        } catch (error) {
            console.error('Failed to refresh subscription:', error);
        }
    }, [dispatch, subscription]);

    /**
     * Record request usage
     */
    const recordUsage = useCallback(
        async (requestId: string) => {
            if (!subscription) return;

            try {
                await dispatch(
                    recordRequestUsage({
                        vendorId: subscription.vendorId,
                        requestId,
                    })
                ).unwrap();
            } catch (error) {
                console.error('Failed to record usage:', error);
                throw error;
            }
        },
        [dispatch, subscription]
    );

    /**
     * Select a plan for checkout
     */
    const selectPlan = useCallback(
        (planId: string) => {
            dispatch(setSelectedPlan(planId));
        },
        [dispatch]
    );

    /**
     * Clear selected plan
     */
    const clearPlan = useCallback(() => {
        dispatch(clearSelectedPlan());
    }, [dispatch]);

    // ========================================================================
    // Feature Access
    // ========================================================================

    /**
     * Check if current tier has access to feature
     * Returns a function that checks feature access using current tier
     */
    const hasFeature = useCallback(
        (featureId: SubscriptionFeatureId): boolean => {
            // Use currentTier directly instead of calling useSelector inside callback
            // This works because currentTier is already selected above and the callback
            // will be recreated when currentTier changes
            const tierFeatures: Record<SubscriptionTier, SubscriptionFeatureId[]> = {
                free: ['basic_profile', 'service_requests'],
                basic: ['basic_profile', 'service_requests', 'analytics_basic', 'priority_support'],
                pro: ['basic_profile', 'service_requests', 'analytics_basic', 'analytics_advanced', 'priority_support', 'featured_listing'],
                enterprise: ['basic_profile', 'service_requests', 'analytics_basic', 'analytics_advanced', 'priority_support', 'featured_listing', 'api_access', 'white_label'],
            };
            const features = tierFeatures[currentTier] || tierFeatures.free;
            return features.includes(featureId);
        },
        [currentTier]
    );

    /**
     * Check feature with upgrade recommendation
     */
    const checkFeature = useCallback(
        (featureId: SubscriptionFeatureId) => {
            const hasAccess = hasFeature(featureId);

            if (hasAccess) {
                return { hasAccess: true };
            }

            // Find which tier provides this feature
            const requiredPlan = plans.find(plan =>
                plan.features.some(f => f.id === featureId && f.available)
            );

            return {
                hasAccess: false,
                requiredTier: requiredPlan?.tier,
            };
        },
        [hasFeature, plans]
    );

    // ========================================================================
    // Return Hook Interface
    // ========================================================================

    return {
        // State
        subscription,
        currentTier,
        isActive,
        plans,
        selectedPlan,

        // Loading
        isLoading,
        isPaymentLoading,

        // Errors
        error,
        paymentError,

        // Usage
        usagePercentage,
        isLimitReached,
        isApproachingLimit,
        remainingDisplay,

        // Billing
        daysUntilBilling,
        willCancelAtPeriodEnd,

        // Health
        healthStatus,
        needsAttention: needsAttentionFlag,
        statusMessage,

        // Capabilities
        canUpgrade,
        canDowngrade,

        // Actions
        initialize,
        purchasePlan,
        upgradePlan,
        downgradePlan,
        cancelNow,
        cancelAtPeriodEnd,
        reactivateSubscription,
        refresh,
        recordUsage,
        selectPlan,
        clearPlan,

        // Feature access
        hasFeature,
        checkFeature,
    };
}
