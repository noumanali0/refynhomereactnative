// src/utils/subscriptionUtils.ts
/**
 * Subscription Utility Functions
 *
 * Helper functions for subscription-related operations:
 * - Tier comparisons
 * - Feature access checks
 * - Price formatting
 * - Date calculations
 * - Status checks
 */

import type {
    SubscriptionTier,
    SubscriptionStatus,
    VendorSubscription,
    SubscriptionPlan,
    BillingInterval,
} from '@/types/subscription';
import { FEATURE_MATRIX } from '@/api/mock/subscriptionData';

// ============================================================================
// Tier Comparison
// ============================================================================

/**
 * Tier hierarchy (lowest to highest)
 */
const TIER_ORDER: SubscriptionTier[] = ['free', 'silver', 'gold', 'pro'];

/**
 * Get tier index (for comparison)
 */
export function getTierIndex(tier: SubscriptionTier): number {
    return TIER_ORDER.indexOf(tier);
}

/**
 * Compare two tiers
 * @returns 'lower' | 'equal' | 'higher'
 */
export function compareTiers(tierA: SubscriptionTier, tierB: SubscriptionTier): 'lower' | 'equal' | 'higher' {
    const indexA = getTierIndex(tierA);
    const indexB = getTierIndex(tierB);

    if (indexA < indexB) return 'lower';
    if (indexA > indexB) return 'higher';
    return 'equal';
}

/**
 * Check if tier A is higher than tier B
 */
export function isHigherTier(tierA: SubscriptionTier, tierB: SubscriptionTier): boolean {
    return compareTiers(tierA, tierB) === 'higher';
}

/**
 * Check if tier A is lower than tier B
 */
export function isLowerTier(tierA: SubscriptionTier, tierB: SubscriptionTier): boolean {
    return compareTiers(tierA, tierB) === 'lower';
}

/**
 * Get next tier (null if already at highest)
 */
export function getNextTier(currentTier: SubscriptionTier): SubscriptionTier | null {
    const currentIndex = getTierIndex(currentTier);
    if (currentIndex >= TIER_ORDER.length - 1) return null;
    return TIER_ORDER[currentIndex + 1];
}

/**
 * Get previous tier (null if already at lowest)
 */
export function getPreviousTier(currentTier: SubscriptionTier): SubscriptionTier | null {
    const currentIndex = getTierIndex(currentTier);
    if (currentIndex <= 0) return null;
    return TIER_ORDER[currentIndex - 1];
}

// ============================================================================
// Feature Access
// ============================================================================

/**
 * Check if tier has access to feature
 */
export function tierHasFeature(tier: SubscriptionTier, featureId: string): boolean {
    return FEATURE_MATRIX[tier]?.[featureId] || false;
}

/**
 * Check if can upgrade to access feature
 */
export function canUpgradeForFeature(
    currentTier: SubscriptionTier,
    featureId: string
): { canUpgrade: boolean; requiredTier: SubscriptionTier | null } {
    // Check if current tier already has access
    if (tierHasFeature(currentTier, featureId)) {
        return { canUpgrade: false, requiredTier: null };
    }

    // Find lowest tier that has the feature
    for (const tier of TIER_ORDER) {
        if (tierHasFeature(tier, featureId) && isHigherTier(tier, currentTier)) {
            return { canUpgrade: true, requiredTier: tier };
        }
    }

    return { canUpgrade: false, requiredTier: null };
}

// ============================================================================
// Price Formatting
// ============================================================================

/**
 * Format price with currency symbol
 */
export function formatPrice(amount: number, currency: string = 'USD'): string {
    const symbols: Record<string, string> = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        PKR: 'Rs',
    };

    const symbol = symbols[currency] || currency;

    // Handle zero price
    if (amount === 0) {
        return 'Free';
    }

    // Format with 2 decimal places
    return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Format price per interval
 */
export function formatPriceWithInterval(
    amount: number,
    interval: BillingInterval,
    currency: string = 'USD'
): string {
    const price = formatPrice(amount, currency);
    const intervalText = interval === 'month' ? 'mo' : 'yr';
    return `${price}/${intervalText}`;
}

/**
 * Calculate monthly equivalent price
 */
export function getMonthlyEquivalent(amount: number, interval: BillingInterval): number {
    if (interval === 'month') return amount;
    return amount / 12; // Yearly divided by 12
}

/**
 * Calculate annual savings
 */
export function calculateAnnualSavings(monthlyPrice: number, annualPrice: number): number {
    const monthlyCostForYear = monthlyPrice * 12;
    return monthlyCostForYear - annualPrice;
}

/**
 * Calculate savings percentage
 */
export function calculateSavingsPercentage(monthlyPrice: number, annualPrice: number): number {
    const savings = calculateAnnualSavings(monthlyPrice, annualPrice);
    const monthlyCostForYear = monthlyPrice * 12;
    return Math.round((savings / monthlyCostForYear) * 100);
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Format days remaining
 */
export function formatDaysRemaining(daysLeft: number): string {
    if (daysLeft < 0) return 'Expired';
    if (daysLeft === 0) return 'Today';
    if (daysLeft === 1) return '1 day';
    return `${daysLeft} days`;
}

/**
 * Calculate days until date
 */
export function getDaysUntil(timestamp: number): number {
    const now = Date.now();
    const msUntil = timestamp - now;
    return Math.ceil(msUntil / (1000 * 60 * 60 * 24));
}

/**
 * Format billing date
 */
export function formatBillingDate(timestamp: number): string {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Check if billing period is about to renew (within 7 days)
 */
export function isRenewalSoon(nextBillingDate: number): boolean {
    const daysUntil = getDaysUntil(nextBillingDate);
    return daysUntil <= 7 && daysUntil > 0;
}

// ============================================================================
// Status Checks
// ============================================================================

/**
 * Check if subscription is active and healthy
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
    return status === 'active' || status === 'trialing';
}

/**
 * Check if subscription needs attention
 */
export function needsAttention(subscription: VendorSubscription): boolean {
    // Payment issues
    if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
        return true;
    }

    // Scheduled for cancellation
    if (subscription.cancelAtPeriodEnd) {
        return true;
    }

    // Request limit approaching (>80%)
    if (subscription.requestsRemaining !== null) {
        const maxRequests = subscription.plan.limits.maxRequests;
        if (maxRequests !== null) {
            const usagePercentage = (subscription.requestsThisMonth / maxRequests) * 100;
            if (usagePercentage >= 80) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Get subscription health status
 */
export function getSubscriptionHealth(
    subscription: VendorSubscription
): 'healthy' | 'warning' | 'critical' {
    if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
        return 'critical';
    }

    if (subscription.status === 'incomplete' || subscription.cancelAtPeriodEnd) {
        return 'warning';
    }

    // Check request usage
    if (subscription.requestsRemaining !== null && subscription.requestsRemaining === 0) {
        return 'critical';
    }

    if (subscription.requestsRemaining !== null) {
        const maxRequests = subscription.plan.limits.maxRequests;
        if (maxRequests !== null) {
            const usagePercentage = (subscription.requestsThisMonth / maxRequests) * 100;
            if (usagePercentage >= 80) {
                return 'warning';
            }
        }
    }

    return 'healthy';
}

/**
 * Get user-friendly status message
 */
export function getStatusMessage(subscription: VendorSubscription): string {
    const { status, cancelAtPeriodEnd, requestsRemaining } = subscription;

    if (status === 'active' && !cancelAtPeriodEnd && requestsRemaining !== 0) {
        return 'Active';
    }

    if (status === 'trialing') {
        return 'Trial Period';
    }

    if (status === 'past_due') {
        return 'Payment Failed - Update Payment Method';
    }

    if (status === 'unpaid') {
        return 'Unpaid - Subscription Suspended';
    }

    if (status === 'incomplete') {
        return 'Payment Incomplete';
    }

    if (cancelAtPeriodEnd) {
        const daysLeft = getDaysUntil(subscription.currentPeriodEnd);
        return `Cancels in ${formatDaysRemaining(daysLeft)}`;
    }

    if (requestsRemaining === 0) {
        return 'Request Limit Reached';
    }

    return 'Unknown Status';
}

// ============================================================================
// Usage Calculations
// ============================================================================

/**
 * Calculate usage percentage
 */
export function getUsagePercentage(subscription: VendorSubscription): number {
    const maxRequests = subscription.plan.limits.maxRequests;
    if (maxRequests === null) return 0; // Unlimited

    const used = subscription.requestsThisMonth;
    return Math.round((used / maxRequests) * 100);
}

/**
 * Check if limit reached
 */
export function isLimitReached(subscription: VendorSubscription): boolean {
    const remaining = subscription.requestsRemaining;
    if (remaining === null) return false; // Unlimited
    return remaining <= 0;
}

/**
 * Check if approaching limit (>80%)
 */
export function isApproachingLimit(subscription: VendorSubscription): boolean {
    return getUsagePercentage(subscription) >= 80;
}

/**
 * Get remaining request count display
 */
export function getRemainingDisplay(subscription: VendorSubscription): string {
    const remaining = subscription.requestsRemaining;
    if (remaining === null) return 'Unlimited';
    if (remaining === 0) return 'None left';
    if (remaining === 1) return '1 remaining';
    return `${remaining} remaining`;
}

// ============================================================================
// Tier Display Names
// ============================================================================

/**
 * Get display name for tier
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
    const names: Record<SubscriptionTier, string> = {
        free: 'Free',
        silver: 'Silver',
        gold: 'Gold',
        pro: 'Professional',
    };
    return names[tier];
}

/**
 * Get tier color (for badges and UI)
 */
export function getTierColor(tier: SubscriptionTier): string {
    const colors: Record<SubscriptionTier, string> = {
        free: '#6B7280', // Gray
        silver: '#9CA3AF', // Silver
        gold: '#F59E0B', // Gold
        pro: '#8B5CF6', // Purple
    };
    return colors[tier];
}

// ============================================================================
// Plan Comparison
// ============================================================================

/**
 * Check if plan is an upgrade
 */
export function isUpgrade(currentPlan: SubscriptionPlan, newPlan: SubscriptionPlan): boolean {
    return isHigherTier(newPlan.tier, currentPlan.tier);
}

/**
 * Check if plan is a downgrade
 */
export function isDowngrade(currentPlan: SubscriptionPlan, newPlan: SubscriptionPlan): boolean {
    return isLowerTier(newPlan.tier, currentPlan.tier);
}

/**
 * Calculate price difference
 */
export function getPriceDifference(planA: SubscriptionPlan, planB: SubscriptionPlan): number {
    // Normalize to monthly prices for comparison
    const monthlyA = getMonthlyEquivalent(planA.price, planA.interval);
    const monthlyB = getMonthlyEquivalent(planB.price, planB.interval);
    return monthlyB - monthlyA;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate card number (basic Luhn check)
 */
export function isValidCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(cleaned)) return false;

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
}

/**
 * Validate expiration date
 */
export function isValidExpiration(month: number, year: number): boolean {
    if (month < 1 || month > 12) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
}

/**
 * Validate CVC
 */
export function isValidCVC(cvc: string): boolean {
    return /^\d{3,4}$/.test(cvc);
}
