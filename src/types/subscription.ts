// src/types/subscription.ts
/**
 * Subscription Type Definitions
 *
 * Comprehensive type system for the vendor subscription feature.
 * Includes subscription plans, payment details, feature access, and API responses.
 */

// ============================================================================
// Enums and String Literal Types
// ============================================================================

/**
 * Subscription tier levels
 */
export type SubscriptionTier = 'free' | 'silver' | 'gold' | 'pro';

/**
 * Subscription status states (matches Stripe status values)
 */
export type SubscriptionStatus =
    | 'active'          // Subscription is active and paid
    | 'past_due'        // Payment failed, grace period
    | 'canceled'        // Subscription canceled
    | 'incomplete'      // Payment incomplete
    | 'trialing'        // In trial period
    | 'unpaid';         // Payment failed, no access

/**
 * Payment status for individual charges
 */
export type PaymentStatus = 'succeeded' | 'pending' | 'failed';

/**
 * Billing interval
 */
export type BillingInterval = 'month' | 'year';

// ============================================================================
// Feature Access System
// ============================================================================

/**
 * Feature identifiers for access control
 */
export type SubscriptionFeatureId =
    // Free tier
    | 'service_requests_3'
    | 'verified_vendors'
    | 'basic_support'
    | 'service_history'
    | 'email_notifications'
    // Silver tier
    | 'service_requests_10'
    | 'priority_vendor_matching'
    | 'whatsapp_notifications'
    | 'favorite_vendors'
    | 'request_scheduling'
    | 'basic_analytics'
    | 'customer_support_24_7'
    // Gold tier
    | 'unlimited_service_requests'
    | 'premium_vendor_priority'
    | 'instant_asap_requests'
    | 'service_discounts_15'
    | 'dedicated_account_manager'
    | 'advanced_analytics'
    | 'multi_property_management'
    | 'warranty_coverage'
    // Pro tier
    | 'everything_in_gold'
    | 'custom_service_agreements'
    | 'bulk_request_management'
    | 'api_access'
    | 'custom_reporting'
    | 'dedicated_support_team'
    | 'volume_discounts_25'
    | 'sla_guarantees';

/**
 * Individual subscription feature
 */
export interface SubscriptionFeature {
    id: SubscriptionFeatureId;
    label: string;
    description?: string;
    icon?: string; // Ionicons name
    available: boolean; // Whether this tier includes this feature
}

/**
 * Feature limits per tier
 */
export interface SubscriptionLimits {
    maxRequests: number | null; // null = unlimited
    priorityLevel: number; // 1-4 (higher = better priority)
    discountPercentage: number; // 0-25%
    supportLevel: 'basic' | 'priority' | 'premium' | 'dedicated';
}

// ============================================================================
// Subscription Plans
// ============================================================================

/**
 * Subscription plan definition (catalog item)
 */
export interface SubscriptionPlan {
    id: string; // e.g., 'plan_silver_monthly'
    tier: SubscriptionTier;
    name: string; // e.g., 'Silver'
    tagline?: string; // e.g., 'Perfect for growing businesses'
    price: number; // Price in USD
    currency: string; // 'USD'
    interval: BillingInterval;
    features: SubscriptionFeature[];
    limits: SubscriptionLimits;
    popular?: boolean; // Show "Most Popular" badge
    stripePriceId?: string; // Real Stripe Price ID (for future backend)
}

// ============================================================================
// Vendor Subscription State
// ============================================================================

/**
 * Current subscription state for a vendor
 */
export interface VendorSubscription {
    // Basic Info
    id: string; // Subscription ID
    vendorId: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;

    // Billing
    currentPeriodStart: number; // Unix timestamp (ms)
    currentPeriodEnd: number; // Unix timestamp (ms)
    cancelAtPeriodEnd: boolean;

    // Plan Details
    plan: SubscriptionPlan;

    // Usage Tracking
    requestsThisMonth: number;
    requestsRemaining: number | null; // null = unlimited

    // Payment
    lastPaymentDate: number | null; // Unix timestamp (ms)
    lastPaymentAmount: number | null;
    lastPaymentStatus: PaymentStatus | null;
    nextBillingDate: number; // Unix timestamp (ms)

    // Stripe References (for mock and future backend)
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;

    // Timestamps
    createdAt: number; // Unix timestamp (ms)
    updatedAt: number; // Unix timestamp (ms)
}

// ============================================================================
// Stripe Mock Types (for mock payment flow)
// ============================================================================

/**
 * Mock Stripe Customer object
 */
export interface MockStripeCustomer {
    id: string; // cus_xxx
    email: string;
    name: string;
    phone?: string;
    created: number; // Unix timestamp (seconds)
}

/**
 * Mock Stripe Payment Method
 */
export interface MockStripePaymentMethod {
    id: string; // pm_xxx
    type: 'card';
    card: {
        brand: 'visa' | 'mastercard' | 'amex';
        last4: string;
        expMonth: number;
        expYear: number;
    };
}

/**
 * Mock Stripe Subscription object
 */
export interface MockStripeSubscription {
    id: string; // sub_xxx
    customer: string; // Customer ID
    status: SubscriptionStatus;
    currentPeriodStart: number; // Unix timestamp (seconds)
    currentPeriodEnd: number; // Unix timestamp (seconds)
    cancelAtPeriodEnd: boolean;
    items: {
        data: Array<{
            id: string;
            price: {
                id: string;
                unitAmount: number; // Amount in cents
                currency: string;
                recurring: {
                    interval: BillingInterval;
                };
            };
        }>;
    };
}

/**
 * Mock Stripe Payment Intent
 */
export interface MockStripePaymentIntent {
    id: string; // pi_xxx
    amount: number; // Amount in cents
    currency: string;
    status: 'requires_payment_method' | 'requires_confirmation' | 'processing' | 'succeeded' | 'canceled';
    clientSecret: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to create a new subscription
 */
export interface CreateSubscriptionRequest {
    vendorId: string;
    planId: string;
    paymentMethodId?: string; // Mock payment method ID
}

/**
 * Response from creating a subscription
 */
export interface CreateSubscriptionResponse {
    success: boolean;
    subscription?: VendorSubscription;
    paymentIntent?: MockStripePaymentIntent;
    error?: string;
}

/**
 * Request to update subscription
 */
export interface UpdateSubscriptionRequest {
    subscriptionId: string;
    newPlanId?: string; // Change plan
    cancelAtPeriodEnd?: boolean; // Schedule cancellation
}

/**
 * Response from updating subscription
 */
export interface UpdateSubscriptionResponse {
    success: boolean;
    subscription?: VendorSubscription;
    error?: string;
}

/**
 * Request to cancel subscription
 */
export interface CancelSubscriptionRequest {
    subscriptionId: string;
    immediate?: boolean; // Cancel immediately vs. at period end
    reason?: string;
}

/**
 * Response from canceling subscription
 */
export interface CancelSubscriptionResponse {
    success: boolean;
    subscription?: VendorSubscription;
    error?: string;
}

/**
 * Request to get available plans
 */
export interface GetPlansRequest {
    interval?: BillingInterval; // Filter by billing interval
}

/**
 * Response with available plans
 */
export interface GetPlansResponse {
    success: boolean;
    plans: SubscriptionPlan[];
    error?: string;
}

/**
 * Request to get subscription details
 */
export interface GetSubscriptionRequest {
    vendorId: string;
}

/**
 * Response with subscription details
 */
export interface GetSubscriptionResponse {
    success: boolean;
    subscription: VendorSubscription;
    error?: string;
}

/**
 * Request to record usage (increment request count)
 */
export interface RecordUsageRequest {
    vendorId: string;
    requestId: string;
}

/**
 * Response from recording usage
 */
export interface RecordUsageResponse {
    success: boolean;
    requestsRemaining: number | null;
    limitReached: boolean;
    error?: string;
}

// ============================================================================
// Redux Action Payloads
// ============================================================================

/**
 * Payload for setting subscription data
 */
export interface SetSubscriptionPayload {
    subscription: VendorSubscription;
}

/**
 * Payload for updating subscription status
 */
export interface UpdateSubscriptionStatusPayload {
    status: SubscriptionStatus;
}

/**
 * Payload for recording a request
 */
export interface RecordRequestPayload {
    requestId: string;
}

/**
 * Payload for setting available plans
 */
export interface SetPlansPayload {
    plans: SubscriptionPlan[];
}

// ============================================================================
// UI Component Props
// ============================================================================

/**
 * Props for SubscriptionCard component
 */
export interface SubscriptionCardProps {
    plan: SubscriptionPlan;
    currentTier?: SubscriptionTier;
    isActive?: boolean;
    onSelect: (planId: string) => void;
    disabled?: boolean;
}

/**
 * Props for SubscriptionFeature component
 */
export interface SubscriptionFeatureProps {
    feature: SubscriptionFeature;
    size?: 'small' | 'medium' | 'large';
}

/**
 * Props for PricingHeader component
 */
export interface PricingHeaderProps {
    price: number;
    currency: string;
    interval: BillingInterval;
    originalPrice?: number; // For showing discounts
}

/**
 * Props for SubscriptionStatusBadge component
 */
export interface SubscriptionStatusBadgeProps {
    status: SubscriptionStatus;
    size?: 'small' | 'medium';
}

/**
 * Props for FeatureAccessGuard component
 */
export interface FeatureAccessGuardProps {
    featureId: SubscriptionFeatureId;
    currentTier: SubscriptionTier;
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Check if a tier includes a feature
 */
export type TierFeatureMatrix = Record<SubscriptionTier, Record<SubscriptionFeatureId, boolean>>;

/**
 * Tier comparison result
 */
export type TierComparison = 'lower' | 'equal' | 'higher';
