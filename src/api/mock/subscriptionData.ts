// src/api/mock/subscriptionData.ts
/**
 * Mock Subscription Data
 *
 * Comprehensive mock data for testing the subscription system.
 * Includes all 4 subscription tiers with realistic features and pricing.
 * Updated to match exact design specifications.
 */

import type {
    SubscriptionPlan,
    SubscriptionFeature,
    SubscriptionLimits,
    SubscriptionTier,
} from '@/types/subscription';

// ============================================================================
// Feature Definitions
// ============================================================================

/**
 * All available features across all tiers
 */
export const ALL_FEATURES: Record<string, Omit<SubscriptionFeature, 'available'>> = {
    // Free tier features
    service_requests_3: {
        id: 'service_requests_3',
        label: 'Up to 3 service requests per month',
        description: 'Limited service requests for basic needs',
        icon: 'list',
    },
    service_requests_10: {
        id: 'service_requests_10',
        label: 'Up to 10 service requests per month',
        description: 'More requests for growing needs',
        icon: 'list',
    },
    unlimited_service_requests: {
        id: 'unlimited_service_requests',
        label: 'Unlimited service requests',
        description: 'No limits on service requests',
        icon: 'infinite',
    },
    verified_vendors: {
        id: 'verified_vendors',
        label: 'Access to verified vendors',
        description: 'Connect with trusted service providers',
        icon: 'checkmark-done',
    },
    basic_support: {
        id: 'basic_support',
        label: 'Basic customer support',
        description: 'Email support during business hours',
        icon: 'mail',
    },
    service_history: {
        id: 'service_history',
        label: 'Service history tracking',
        description: 'Keep track of all your service requests',
        icon: 'time',
    },
    email_notifications: {
        id: 'email_notifications',
        label: 'Email notifications',
        description: 'Get updates via email',
        icon: 'mail',
    },

    // Silver tier features
    priority_vendor_matching: {
        id: 'priority_vendor_matching',
        label: 'Priority vendor matching',
        description: 'Get matched with vendors faster',
        icon: 'flash',
    },
    whatsapp_notifications: {
        id: 'whatsapp_notifications',
        label: 'WhatsApp notifications',
        description: 'Instant updates on WhatsApp',
        icon: 'logo-whatsapp',
    },
    favorite_vendors: {
        id: 'favorite_vendors',
        label: 'Favorite vendors feature',
        description: 'Save and quickly book your preferred vendors',
        icon: 'heart',
    },
    request_scheduling: {
        id: 'request_scheduling',
        label: 'Request scheduling',
        description: 'Schedule services in advance',
        icon: 'calendar',
    },
    basic_analytics: {
        id: 'basic_analytics',
        label: 'Basic analytics',
        description: 'View your service statistics',
        icon: 'bar-chart',
    },
    customer_support_24_7: {
        id: 'customer_support_24_7',
        label: '24/7 customer support',
        description: 'Round-the-clock assistance',
        icon: 'headset',
    },

    // Gold tier features
    premium_vendor_priority: {
        id: 'premium_vendor_priority',
        label: 'Premium vendor priority',
        description: 'Highest priority for vendor matching',
        icon: 'star',
    },
    instant_asap_requests: {
        id: 'instant_asap_requests',
        label: 'Instant ASAP requests',
        description: 'Emergency service requests processed immediately',
        icon: 'speedometer',
    },
    service_discounts_15: {
        id: 'service_discounts_15',
        label: 'Service discounts up to 15%',
        description: 'Save on platform fees',
        icon: 'pricetag',
    },
    dedicated_account_manager: {
        id: 'dedicated_account_manager',
        label: 'Dedicated account manager',
        description: 'Personal support representative',
        icon: 'person',
    },
    advanced_analytics: {
        id: 'advanced_analytics',
        label: 'Advanced analytics',
        description: 'Detailed insights and reports',
        icon: 'analytics',
    },
    multi_property_management: {
        id: 'multi_property_management',
        label: 'Multi-property management',
        description: 'Manage services across multiple properties',
        icon: 'business',
    },
    warranty_coverage: {
        id: 'warranty_coverage',
        label: 'Warranty coverage',
        description: 'Extended warranty on services',
        icon: 'shield-checkmark',
    },

    // Pro tier features
    everything_in_gold: {
        id: 'everything_in_gold',
        label: 'Everything in Gold',
        description: 'All Gold plan features included',
        icon: 'checkmark-circle',
    },
    custom_service_agreements: {
        id: 'custom_service_agreements',
        label: 'Custom service agreements',
        description: 'Tailored contracts for your business',
        icon: 'document-text',
    },
    bulk_request_management: {
        id: 'bulk_request_management',
        label: 'Bulk request management',
        description: 'Manage multiple requests simultaneously',
        icon: 'layers',
    },
    api_access: {
        id: 'api_access',
        label: 'API access',
        description: 'Integrate with your systems',
        icon: 'code-slash',
    },
    custom_reporting: {
        id: 'custom_reporting',
        label: 'Custom reporting',
        description: 'Generate customized reports',
        icon: 'stats-chart',
    },
    dedicated_support_team: {
        id: 'dedicated_support_team',
        label: 'Dedicated support team',
        description: 'Full team at your service',
        icon: 'people',
    },
    volume_discounts_25: {
        id: 'volume_discounts_25',
        label: 'Volume discounts up to 25%',
        description: 'Maximum savings on platform fees',
        icon: 'trending-down',
    },
    sla_guarantees: {
        id: 'sla_guarantees',
        label: 'SLA guarantees',
        description: 'Guaranteed service levels',
        icon: 'ribbon',
    },
};

// ============================================================================
// Tier Limits
// ============================================================================

const FREE_LIMITS: SubscriptionLimits = {
    maxRequests: 3,
    priorityLevel: 1,
    discountPercentage: 0,
    supportLevel: 'basic',
};

const SILVER_LIMITS: SubscriptionLimits = {
    maxRequests: 10,
    priorityLevel: 2,
    discountPercentage: 0,
    supportLevel: 'priority',
};

const GOLD_LIMITS: SubscriptionLimits = {
    maxRequests: null, // Unlimited
    priorityLevel: 3,
    discountPercentage: 15,
    supportLevel: 'premium',
};

const PRO_LIMITS: SubscriptionLimits = {
    maxRequests: null, // Unlimited
    priorityLevel: 4,
    discountPercentage: 25,
    supportLevel: 'dedicated',
};

// ============================================================================
// Plan Definitions
// ============================================================================

/**
 * Free Plan
 */
export const FREE_PLAN: SubscriptionPlan = {
    id: 'plan_free',
    tier: 'free',
    name: 'Free',
    tagline: 'Get started with basic features',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
        { ...ALL_FEATURES.service_requests_3, available: true },
        { ...ALL_FEATURES.verified_vendors, available: true },
        { ...ALL_FEATURES.basic_support, available: true },
        { ...ALL_FEATURES.service_history, available: true },
        { ...ALL_FEATURES.email_notifications, available: true },
    ],
    limits: FREE_LIMITS,
    popular: false,
};

/**
 * Silver Plan (Monthly)
 */
export const SILVER_PLAN_MONTHLY: SubscriptionPlan = {
    id: 'plan_silver_monthly',
    tier: 'silver',
    name: 'Silver',
    tagline: 'Perfect for regular maintenance',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: [
        { ...ALL_FEATURES.service_requests_10, available: true },
        { ...ALL_FEATURES.priority_vendor_matching, available: true },
        { ...ALL_FEATURES.whatsapp_notifications, available: true },
        { ...ALL_FEATURES.favorite_vendors, available: true },
        { ...ALL_FEATURES.request_scheduling, available: true },
        { ...ALL_FEATURES.basic_analytics, available: true },
        { ...ALL_FEATURES.customer_support_24_7, available: true },
    ],
    limits: SILVER_LIMITS,
    popular: false,
    stripePriceId: 'price_silver_monthly_mock',
};

/**
 * Gold Plan (Monthly)
 */
export const GOLD_PLAN_MONTHLY: SubscriptionPlan = {
    id: 'plan_gold_monthly',
    tier: 'gold',
    name: 'Gold',
    tagline: 'For frequent service needs',
    price: 24.99,
    currency: 'USD',
    interval: 'month',
    features: [
        { ...ALL_FEATURES.unlimited_service_requests, available: true },
        { ...ALL_FEATURES.premium_vendor_priority, available: true },
        { ...ALL_FEATURES.instant_asap_requests, available: true },
        { ...ALL_FEATURES.service_discounts_15, available: true },
        { ...ALL_FEATURES.dedicated_account_manager, available: true },
        { ...ALL_FEATURES.advanced_analytics, available: true },
        { ...ALL_FEATURES.multi_property_management, available: true },
        { ...ALL_FEATURES.warranty_coverage, available: true },
    ],
    limits: GOLD_LIMITS,
    popular: true,
    stripePriceId: 'price_gold_monthly_mock',
};

/**
 * Pro Plan (Monthly)
 */
export const PRO_PLAN_MONTHLY: SubscriptionPlan = {
    id: 'plan_pro_monthly',
    tier: 'pro',
    name: 'Pro',
    tagline: 'Custom solutions for businesses',
    price: 99.99,
    currency: 'USD',
    interval: 'month',
    features: [
        { ...ALL_FEATURES.everything_in_gold, available: true },
        { ...ALL_FEATURES.custom_service_agreements, available: true },
        { ...ALL_FEATURES.bulk_request_management, available: true },
        { ...ALL_FEATURES.api_access, available: true },
        { ...ALL_FEATURES.custom_reporting, available: true },
        { ...ALL_FEATURES.dedicated_support_team, available: true },
        { ...ALL_FEATURES.volume_discounts_25, available: true },
        { ...ALL_FEATURES.sla_guarantees, available: true },
    ],
    limits: PRO_LIMITS,
    popular: false,
    stripePriceId: 'price_pro_monthly_mock',
};

// ============================================================================
// Plan Catalog
// ============================================================================

/**
 * All available plans
 */
export const ALL_PLANS: SubscriptionPlan[] = [
    FREE_PLAN,
    SILVER_PLAN_MONTHLY,
    GOLD_PLAN_MONTHLY,
    PRO_PLAN_MONTHLY,
];

/**
 * Get plan by ID
 */
export function getPlanById(planId: string): SubscriptionPlan | null {
    return ALL_PLANS.find(plan => plan.id === planId) || null;
}

/**
 * Get plan by tier
 */
export function getPlanByTier(tier: SubscriptionTier): SubscriptionPlan | null {
    return ALL_PLANS.find(plan => plan.tier === tier) || null;
}

/**
 * Get plans by interval
 */
export function getPlansByInterval(interval: 'month' | 'year'): SubscriptionPlan[] {
    return ALL_PLANS.filter(plan => plan.interval === interval);
}

// ============================================================================
// Mock Customer Data
// ============================================================================

/**
 * Generate mock Stripe customer ID
 */
export function generateMockCustomerId(vendorId: string): string {
    return `cus_mock_${vendorId.substring(0, 14)}`;
}

/**
 * Generate mock Stripe subscription ID
 */
export function generateMockSubscriptionId(): string {
    return `sub_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate mock payment method ID
 */
export function generateMockPaymentMethodId(): string {
    return `pm_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate mock payment intent ID
 */
export function generateMockPaymentIntentId(): string {
    return `pi_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// ============================================================================
// Feature Matrix (for quick lookups)
// ============================================================================

/**
 * Feature availability matrix
 * Tier -> Feature ID -> Available
 */
export const FEATURE_MATRIX: Record<SubscriptionTier, Record<string, boolean>> = {
    free: {
        service_requests_3: true,
        verified_vendors: true,
        basic_support: true,
        service_history: true,
        email_notifications: true,
        service_requests_10: false,
        unlimited_service_requests: false,
        priority_vendor_matching: false,
        whatsapp_notifications: false,
        favorite_vendors: false,
        request_scheduling: false,
        basic_analytics: false,
        customer_support_24_7: false,
        premium_vendor_priority: false,
        instant_asap_requests: false,
        service_discounts_15: false,
        dedicated_account_manager: false,
        advanced_analytics: false,
        multi_property_management: false,
        warranty_coverage: false,
        everything_in_gold: false,
        custom_service_agreements: false,
        bulk_request_management: false,
        api_access: false,
        custom_reporting: false,
        dedicated_support_team: false,
        volume_discounts_25: false,
        sla_guarantees: false,
    },
    silver: {
        service_requests_3: false,
        verified_vendors: true,
        basic_support: false,
        service_history: true,
        email_notifications: true,
        service_requests_10: true,
        unlimited_service_requests: false,
        priority_vendor_matching: true,
        whatsapp_notifications: true,
        favorite_vendors: true,
        request_scheduling: true,
        basic_analytics: true,
        customer_support_24_7: true,
        premium_vendor_priority: false,
        instant_asap_requests: false,
        service_discounts_15: false,
        dedicated_account_manager: false,
        advanced_analytics: false,
        multi_property_management: false,
        warranty_coverage: false,
        everything_in_gold: false,
        custom_service_agreements: false,
        bulk_request_management: false,
        api_access: false,
        custom_reporting: false,
        dedicated_support_team: false,
        volume_discounts_25: false,
        sla_guarantees: false,
    },
    gold: {
        service_requests_3: false,
        verified_vendors: true,
        basic_support: false,
        service_history: true,
        email_notifications: true,
        service_requests_10: false,
        unlimited_service_requests: true,
        priority_vendor_matching: true,
        whatsapp_notifications: true,
        favorite_vendors: true,
        request_scheduling: true,
        basic_analytics: true,
        customer_support_24_7: true,
        premium_vendor_priority: true,
        instant_asap_requests: true,
        service_discounts_15: true,
        dedicated_account_manager: true,
        advanced_analytics: true,
        multi_property_management: true,
        warranty_coverage: true,
        everything_in_gold: false,
        custom_service_agreements: false,
        bulk_request_management: false,
        api_access: false,
        custom_reporting: false,
        dedicated_support_team: false,
        volume_discounts_25: false,
        sla_guarantees: false,
    },
    pro: {
        service_requests_3: false,
        verified_vendors: true,
        basic_support: false,
        service_history: true,
        email_notifications: true,
        service_requests_10: false,
        unlimited_service_requests: true,
        priority_vendor_matching: true,
        whatsapp_notifications: true,
        favorite_vendors: true,
        request_scheduling: true,
        basic_analytics: true,
        customer_support_24_7: true,
        premium_vendor_priority: true,
        instant_asap_requests: true,
        service_discounts_15: false,
        dedicated_account_manager: true,
        advanced_analytics: true,
        multi_property_management: true,
        warranty_coverage: true,
        everything_in_gold: true,
        custom_service_agreements: true,
        bulk_request_management: true,
        api_access: true,
        custom_reporting: true,
        dedicated_support_team: true,
        volume_discounts_25: true,
        sla_guarantees: true,
    },
};

/**
 * Check if tier has feature
 */
export function tierHasFeature(tier: SubscriptionTier, featureId: string): boolean {
    return FEATURE_MATRIX[tier]?.[featureId] || false;
}
