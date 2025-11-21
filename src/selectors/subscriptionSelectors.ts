// src/selectors/subscriptionSelectors.ts
/**
 * Memoized Redux Selectors for Subscriptions
 *
 * Performance-optimized selectors using Reselect.
 * Prevents unnecessary re-renders by only recomputing when inputs change.
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import type {
    VendorSubscription,
    SubscriptionPlan,
    SubscriptionTier,
    SubscriptionFeatureId,
    BillingInterval,
} from '@/types/subscription';

// ============================================================================
// Base Selectors (direct state access)
// ============================================================================

/**
 * Select current subscription
 */
export const selectCurrentSubscription = (state: RootState) =>
    state.subscription.currentSubscription;

/**
 * Select plans by ID (normalized)
 */
export const selectPlansById = (state: RootState) =>
    state.subscription.plansById;

/**
 * Select plan IDs array
 */
export const selectPlanIds = (state: RootState) =>
    state.subscription.planIds;

/**
 * Select loading state
 */
export const selectIsLoading = (state: RootState) =>
    state.subscription.isLoading;

/**
 * Select error message
 */
export const selectError = (state: RootState) =>
    state.subscription.error;

/**
 * Select payment in progress
 */
export const selectPaymentInProgress = (state: RootState) =>
    state.subscription.paymentInProgress;

/**
 * Select payment error
 */
export const selectPaymentError = (state: RootState) =>
    state.subscription.paymentError;

/**
 * Select selected plan ID
 */
export const selectSelectedPlanId = (state: RootState) =>
    state.subscription.selectedPlanId;

/**
 * Select feature access cache
 */
export const selectFeatureAccessCache = (state: RootState) =>
    state.subscription.featureAccessCache;

// ============================================================================
// Memoized Selectors (computed/derived data)
// ============================================================================

/**
 * Select current subscription tier
 */
export const selectCurrentTier = createSelector(
    [selectCurrentSubscription],
    (subscription): SubscriptionTier => {
        return subscription?.tier || 'free';
    }
);

/**
 * Select if subscription is active
 */
export const selectIsSubscriptionActive = createSelector(
    [selectCurrentSubscription],
    (subscription): boolean => {
        if (!subscription) return false;
        return subscription.status === 'active' || subscription.status === 'trialing';
    }
);

/**
 * Select if subscription is in grace period (past_due but not canceled)
 */
export const selectIsInGracePeriod = createSelector(
    [selectCurrentSubscription],
    (subscription): boolean => {
        if (!subscription) return false;
        return subscription.status === 'past_due';
    }
);

/**
 * Select days until billing
 */
export const selectDaysUntilBilling = createSelector(
    [selectCurrentSubscription],
    (subscription): number => {
        if (!subscription) return 0;
        const now = Date.now();
        const msUntilBilling = subscription.nextBillingDate - now;
        return Math.ceil(msUntilBilling / (1000 * 60 * 60 * 24));
    }
);

/**
 * Select all plans as array (sorted by price)
 */
export const selectAllPlans = createSelector(
    [selectPlansById, selectPlanIds],
    (plansById, planIds): SubscriptionPlan[] => {
        return planIds
            .map(id => plansById[id])
            .filter(Boolean)
            .sort((a, b) => a.price - b.price);
    }
);

/**
 * Select plans by billing interval
 */
export const makeSelectPlansByInterval = () =>
    createSelector(
        [selectAllPlans, (_state: RootState, interval: BillingInterval) => interval],
        (plans, interval): SubscriptionPlan[] => {
            return plans.filter(plan => plan.interval === interval);
        }
    );

/**
 * Select plan by ID
 */
export const makeSelectPlanById = () =>
    createSelector(
        [selectPlansById, (_state: RootState, planId: string) => planId],
        (plansById, planId): SubscriptionPlan | null => {
            return plansById[planId] || null;
        }
    );

/**
 * Select selected plan (for checkout)
 */
export const selectSelectedPlan = createSelector(
    [selectPlansById, selectSelectedPlanId],
    (plansById, selectedPlanId): SubscriptionPlan | null => {
        if (!selectedPlanId) return null;
        return plansById[selectedPlanId] || null;
    }
);

/**
 * Select if user can upgrade
 */
export const selectCanUpgrade = createSelector(
    [selectCurrentTier, selectAllPlans],
    (currentTier, plans): boolean => {
        const tierOrder: SubscriptionTier[] = ['free', 'silver', 'gold', 'pro'];
        const currentIndex = tierOrder.indexOf(currentTier);

        // Check if there's a higher tier available
        return plans.some(plan => {
            const planIndex = tierOrder.indexOf(plan.tier);
            return planIndex > currentIndex;
        });
    }
);

/**
 * Select if user can downgrade
 */
export const selectCanDowngrade = createSelector(
    [selectCurrentTier],
    (currentTier): boolean => {
        // Can downgrade if not already on free tier
        return currentTier !== 'free';
    }
);

/**
 * Select request usage percentage
 */
export const selectRequestUsagePercentage = createSelector(
    [selectCurrentSubscription],
    (subscription): number => {
        if (!subscription) return 0;

        const maxRequests = subscription.plan.limits.maxRequests;
        if (maxRequests === null) return 0; // Unlimited

        const used = subscription.requestsThisMonth;
        return Math.round((used / maxRequests) * 100);
    }
);

/**
 * Select if request limit reached
 */
export const selectIsRequestLimitReached = createSelector(
    [selectCurrentSubscription],
    (subscription): boolean => {
        if (!subscription) return false;

        const remaining = subscription.requestsRemaining;
        if (remaining === null) return false; // Unlimited

        return remaining <= 0;
    }
);

/**
 * Select if approaching request limit (>80% used)
 */
export const selectIsApproachingRequestLimit = createSelector(
    [selectRequestUsagePercentage],
    (percentage): boolean => {
        return percentage >= 80;
    }
);

/**
 * Check if vendor has access to a specific feature
 */
export const makeSelectHasFeatureAccess = () =>
    createSelector(
        [
            selectCurrentSubscription,
            selectFeatureAccessCache,
            (_state: RootState, featureId: SubscriptionFeatureId) => featureId,
        ],
        (subscription, cache, featureId): boolean => {
            // Check cache first
            if (cache[featureId] !== undefined) {
                return cache[featureId];
            }

            // No subscription = free tier
            if (!subscription) {
                // Free tier has no premium features
                return false;
            }

            // Check if current plan includes the feature
            const feature = subscription.plan.features.find(f => f.id === featureId);
            return feature?.available || false;
        }
    );

/**
 * Select features available in current tier
 */
export const selectAvailableFeatures = createSelector(
    [selectCurrentSubscription],
    (subscription) => {
        if (!subscription) return [];
        return subscription.plan.features.filter(f => f.available);
    }
);

/**
 * Select unavailable features (for upsell)
 */
export const selectUnavailableFeatures = createSelector(
    [selectCurrentSubscription, selectAllPlans],
    (subscription, allPlans) => {
        if (!subscription) {
            // Show all premium features as unavailable
            const premiumPlan = allPlans.find(p => p.tier === 'pro');
            return premiumPlan?.features || [];
        }

        // Find features available in higher tiers
        const currentTierIndex = ['free', 'silver', 'gold', 'pro'].indexOf(subscription.tier);
        const higherTierPlans = allPlans.filter(plan => {
            const planTierIndex = ['free', 'silver', 'gold', 'pro'].indexOf(plan.tier);
            return planTierIndex > currentTierIndex;
        });

        // Collect unique features from higher tiers
        const availableFeatureIds = new Set(
            subscription.plan.features.filter(f => f.available).map(f => f.id)
        );

        const unavailableFeatures: any[] = [];
        higherTierPlans.forEach(plan => {
            plan.features.forEach(feature => {
                if (!availableFeatureIds.has(feature.id) && feature.available) {
                    unavailableFeatures.push(feature);
                    availableFeatureIds.add(feature.id);
                }
            });
        });

        return unavailableFeatures;
    }
);

/**
 * Select next tier recommendation
 */
export const selectRecommendedUpgrade = createSelector(
    [selectCurrentTier, selectAllPlans],
    (currentTier, plans): SubscriptionPlan | null => {
        const tierOrder: SubscriptionTier[] = ['free', 'silver', 'gold', 'pro'];
        const currentIndex = tierOrder.indexOf(currentTier);

        if (currentIndex === tierOrder.length - 1) {
            return null; // Already at highest tier
        }

        const nextTier = tierOrder[currentIndex + 1];
        return plans.find(plan => plan.tier === nextTier) || null;
    }
);

/**
 * Select subscription summary for dashboard
 */
export const selectSubscriptionSummary = createSelector(
    [
        selectCurrentSubscription,
        selectIsSubscriptionActive,
        selectRequestUsagePercentage,
        selectDaysUntilBilling,
    ],
    (subscription, isActive, usagePercentage, daysUntilBilling) => {
        if (!subscription) {
            return {
                tier: 'free' as SubscriptionTier,
                isActive: false,
                usagePercentage: 0,
                requestsRemaining: 3,
                daysUntilBilling: 0,
                needsAttention: false,
            };
        }

        return {
            tier: subscription.tier,
            isActive,
            usagePercentage,
            requestsRemaining: subscription.requestsRemaining,
            daysUntilBilling,
            needsAttention: !isActive || usagePercentage >= 80,
        };
    }
);

/**
 * Compare two subscription tiers
 */
export const makeSelectTierComparison = () =>
    createSelector(
        [
            (_state: RootState, tierA: SubscriptionTier) => tierA,
            (_state: RootState, _tierA: SubscriptionTier, tierB: SubscriptionTier) => tierB,
        ],
        (tierA, tierB): 'lower' | 'equal' | 'higher' => {
            const tierOrder: SubscriptionTier[] = ['free', 'silver', 'gold', 'pro'];
            const indexA = tierOrder.indexOf(tierA);
            const indexB = tierOrder.indexOf(tierB);

            if (indexA < indexB) return 'lower';
            if (indexA > indexB) return 'higher';
            return 'equal';
        }
    );

/**
 * Select if current subscription will be canceled
 */
export const selectWillCancelAtPeriodEnd = createSelector(
    [selectCurrentSubscription],
    (subscription): boolean => {
        return subscription?.cancelAtPeriodEnd || false;
    }
);

/**
 * Select payment health status
 */
export const selectPaymentHealthStatus = createSelector(
    [selectCurrentSubscription, selectIsSubscriptionActive],
    (subscription, isActive): 'healthy' | 'warning' | 'critical' | 'none' => {
        if (!subscription) return 'none';

        if (subscription.status === 'past_due') return 'critical';
        if (subscription.status === 'incomplete' || subscription.status === 'unpaid') return 'critical';
        if (subscription.cancelAtPeriodEnd) return 'warning';
        if (isActive) return 'healthy';

        return 'warning';
    }
);

/**
 * Select popular plan (for highlighting)
 */
export const selectPopularPlan = createSelector(
    [selectAllPlans],
    (plans): SubscriptionPlan | null => {
        return plans.find(plan => plan.popular) || null;
    }
);

/**
 * Select annual savings (if annual plans available)
 */
export const makeSelectAnnualSavings = () =>
    createSelector(
        [selectPlansById, (_state: RootState, tier: SubscriptionTier) => tier],
        (plansById, tier): number => {
            const monthlyPlan = Object.values(plansById).find(
                p => p.tier === tier && p.interval === 'month'
            );
            const annualPlan = Object.values(plansById).find(
                p => p.tier === tier && p.interval === 'year'
            );

            if (!monthlyPlan || !annualPlan) return 0;

            const monthlyCostForYear = monthlyPlan.price * 12;
            const annualCost = annualPlan.price;
            const savings = monthlyCostForYear - annualCost;

            return Math.round(savings);
        }
    );
