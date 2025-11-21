// src/services/subscriptionApiService.ts
/**
 * Subscription API Service Interface
 *
 * Abstract interface for subscription operations.
 * Allows easy swapping between mock and real backend implementations.
 *
 * Implementation Pattern:
 * - Mock: mockSubscriptionApiService.ts (current)
 * - Production: stripeSubscriptionApiService.ts (future)
 *
 * To switch implementations, simply change the import in subscriptionSlice.ts
 */

import type {
    VendorSubscription,
    SubscriptionPlan,
    CreateSubscriptionRequest,
    CreateSubscriptionResponse,
    UpdateSubscriptionRequest,
    UpdateSubscriptionResponse,
    CancelSubscriptionRequest,
    CancelSubscriptionResponse,
    GetPlansRequest,
    GetPlansResponse,
    GetSubscriptionRequest,
    GetSubscriptionResponse,
    RecordUsageRequest,
    RecordUsageResponse,
    MockStripePaymentMethod,
    MockStripePaymentIntent,
} from '@/types/subscription';

// ============================================================================
// API Service Interface
// ============================================================================

/**
 * Subscription API Service Interface
 *
 * All subscription implementations must conform to this interface.
 */
export interface ISubscriptionApiService {
    /**
     * Get available subscription plans
     */
    getPlans(request?: GetPlansRequest): Promise<GetPlansResponse>;

    /**
     * Get vendor's current subscription
     */
    getSubscription(request: GetSubscriptionRequest): Promise<GetSubscriptionResponse>;

    /**
     * Create new subscription (purchase plan)
     */
    createSubscription(request: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse>;

    /**
     * Update existing subscription (upgrade/downgrade)
     */
    updateSubscription(request: UpdateSubscriptionRequest): Promise<UpdateSubscriptionResponse>;

    /**
     * Cancel subscription
     */
    cancelSubscription(request: CancelSubscriptionRequest): Promise<CancelSubscriptionResponse>;

    /**
     * Record usage (increment request count)
     */
    recordUsage(request: RecordUsageRequest): Promise<RecordUsageResponse>;

    /**
     * Create payment method (mock Stripe)
     */
    createPaymentMethod?(cardDetails: {
        cardNumber: string;
        expMonth: number;
        expYear: number;
        cvc: string;
    }): Promise<{ success: boolean; paymentMethod?: MockStripePaymentMethod; error?: string }>;

    /**
     * Confirm payment intent (mock Stripe)
     */
    confirmPayment?(paymentIntentId: string): Promise<{
        success: boolean;
        paymentIntent?: MockStripePaymentIntent;
        error?: string;
    }>;

    /**
     * Get payment methods for customer (mock Stripe)
     */
    getPaymentMethods?(customerId: string): Promise<{
        success: boolean;
        paymentMethods: MockStripePaymentMethod[];
        error?: string;
    }>;

    /**
     * Get upcoming invoice (preview charges)
     */
    getUpcomingInvoice?(subscriptionId: string): Promise<{
        success: boolean;
        amount?: number;
        nextBillingDate?: number;
        error?: string;
    }>;
}

// ============================================================================
// Service Configuration
// ============================================================================

/**
 * Configuration for subscription service
 */
export interface SubscriptionServiceConfig {
    /**
     * API base URL (for production backend)
     */
    apiBaseUrl?: string;

    /**
     * Stripe publishable key (for production)
     */
    stripePublishableKey?: string;

    /**
     * Enable mock mode (default: true in development)
     */
    useMockMode?: boolean;

    /**
     * Mock delay (ms) for simulating network latency
     */
    mockDelayMs?: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Subscription API errors
 */
export class SubscriptionApiError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode?: number
    ) {
        super(message);
        this.name = 'SubscriptionApiError';
    }
}

/**
 * Payment errors (Stripe-compatible)
 */
export class PaymentError extends SubscriptionApiError {
    constructor(
        message: string,
        public code: string,
        public declineCode?: string
    ) {
        super(message, code, 402);
        this.name = 'PaymentError';
    }
}

// ============================================================================
// Error Codes
// ============================================================================

export enum SubscriptionErrorCode {
    // General errors
    UNKNOWN_ERROR = 'unknown_error',
    NETWORK_ERROR = 'network_error',
    INVALID_REQUEST = 'invalid_request',

    // Subscription errors
    SUBSCRIPTION_NOT_FOUND = 'subscription_not_found',
    SUBSCRIPTION_ALREADY_EXISTS = 'subscription_already_exists',
    INVALID_PLAN = 'invalid_plan',
    CANNOT_UPGRADE = 'cannot_upgrade',
    CANNOT_DOWNGRADE = 'cannot_downgrade',

    // Payment errors
    PAYMENT_FAILED = 'payment_failed',
    PAYMENT_METHOD_REQUIRED = 'payment_method_required',
    CARD_DECLINED = 'card_declined',
    INSUFFICIENT_FUNDS = 'insufficient_funds',
    EXPIRED_CARD = 'expired_card',
    INVALID_CARD = 'invalid_card',

    // Limit errors
    REQUEST_LIMIT_REACHED = 'request_limit_reached',
    FEATURE_NOT_AVAILABLE = 'feature_not_available',

    // Status errors
    SUBSCRIPTION_CANCELED = 'subscription_canceled',
    SUBSCRIPTION_PAST_DUE = 'subscription_past_due',
    SUBSCRIPTION_INCOMPLETE = 'subscription_incomplete',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if error is a payment error
 */
export function isPaymentError(error: any): error is PaymentError {
    return error instanceof PaymentError;
}

/**
 * Check if error is subscription-related
 */
export function isSubscriptionError(error: any): error is SubscriptionApiError {
    return error instanceof SubscriptionApiError;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: any): string {
    if (isPaymentError(error)) {
        switch (error.code) {
            case SubscriptionErrorCode.CARD_DECLINED:
                return 'Your card was declined. Please try a different payment method.';
            case SubscriptionErrorCode.INSUFFICIENT_FUNDS:
                return 'Insufficient funds. Please use a different card.';
            case SubscriptionErrorCode.EXPIRED_CARD:
                return 'Your card has expired. Please update your payment method.';
            case SubscriptionErrorCode.INVALID_CARD:
                return 'Invalid card details. Please check and try again.';
            default:
                return 'Payment failed. Please try again or use a different payment method.';
        }
    }

    if (isSubscriptionError(error)) {
        return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
}
