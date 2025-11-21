// src/utils/subscriptionGuard.ts
/**
 * Subscription Navigation Guard
 *
 * Utility to check feature access and redirect to subscription page if needed.
 * Use this in screens that require premium features.
 */

import { router } from 'expo-router';
import type { SubscriptionTier, SubscriptionFeatureId } from '@/types/subscription';
import { tierHasFeature } from './subscriptionUtils';

// ============================================================================
// Guard Functions
// ============================================================================

/**
 * Check if user has access to feature, redirect to subscriptions if not
 * @returns true if has access, false if redirected
 */
export function requireFeature(
    currentTier: SubscriptionTier,
    featureId: SubscriptionFeatureId
): boolean {
    const hasAccess = tierHasFeature(currentTier, featureId);

    if (!hasAccess) {
        // Redirect to subscriptions page
        router.push('/(vendor)/(subscriptions)');
        return false;
    }

    return true;
}

/**
 * Check if user has minimum tier, redirect if not
 * @returns true if has access, false if redirected
 */
export function requireMinimumTier(
    currentTier: SubscriptionTier,
    minimumTier: SubscriptionTier
): boolean {
    const tierOrder: SubscriptionTier[] = ['free', 'silver', 'gold', 'pro'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const minimumIndex = tierOrder.indexOf(minimumTier);

    if (currentIndex < minimumIndex) {
        router.push('/(vendor)/(subscriptions)');
        return false;
    }

    return true;
}

/**
 * Check request limit before allowing action
 * @returns true if can proceed, false if limit reached
 */
export function checkRequestLimit(requestsRemaining: number | null): boolean {
    // null = unlimited
    if (requestsRemaining === null) return true;

    // Check if limit reached
    if (requestsRemaining <= 0) {
        // Show alert or redirect to upgrade
        router.push('/(vendor)/(subscriptions)');
        return false;
    }

    return true;
}

// ============================================================================
// HOC for Component Protection
// ============================================================================

/**
 * Higher-order function to protect a screen with feature access check
 */
export function withFeatureAccess<T extends object>(
    Component: React.ComponentType<T>,
    featureId: SubscriptionFeatureId
) {
    return function GuardedComponent(props: T) {
        // This would be implemented with hooks in actual usage
        // For now, just return the component
        return <Component {...props} />;
    };
}
