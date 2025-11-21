// src/api/subscriptionEndpoints.ts
/**
 * Subscription API Endpoints
 *
 * Defines API endpoint URLs for production backend integration.
 * Currently not used (mock service is active), but prepared for future migration.
 *
 * BACKEND INTEGRATION CHECKLIST:
 * 1. Update BASE_URL with your backend API URL
 * 2. Implement authentication token injection
 * 3. Create real HTTP client (axios/fetch) in stripeSubscriptionApiService.ts
 * 4. Update subscriptionSlice.ts to import stripeSubscriptionApi instead of mockSubscriptionApi
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * Base API URL (update for production)
 */
export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.refynhome.com';

/**
 * API version prefix
 */
export const API_VERSION = '/v1';

/**
 * Full base path for subscription endpoints
 */
export const SUBSCRIPTION_BASE_PATH = `${BASE_URL}${API_VERSION}/subscriptions`;

// ============================================================================
// Endpoint Paths
// ============================================================================

/**
 * Subscription API endpoints
 */
export const SUBSCRIPTION_ENDPOINTS = {
    /**
     * GET - Get all available subscription plans
     * Query params: ?interval=month|year
     */
    GET_PLANS: `${SUBSCRIPTION_BASE_PATH}/plans`,

    /**
     * GET - Get vendor's current subscription
     * Path params: :vendorId
     */
    GET_SUBSCRIPTION: (vendorId: string) => `${SUBSCRIPTION_BASE_PATH}/vendor/${vendorId}`,

    /**
     * POST - Create new subscription (purchase plan)
     * Body: { vendorId, planId, paymentMethodId }
     */
    CREATE_SUBSCRIPTION: `${SUBSCRIPTION_BASE_PATH}/create`,

    /**
     * PUT - Update subscription (upgrade/downgrade)
     * Path params: :subscriptionId
     * Body: { newPlanId?, cancelAtPeriodEnd? }
     */
    UPDATE_SUBSCRIPTION: (subscriptionId: string) =>
        `${SUBSCRIPTION_BASE_PATH}/${subscriptionId}`,

    /**
     * DELETE - Cancel subscription
     * Path params: :subscriptionId
     * Query params: ?immediate=true|false
     * Body: { reason? }
     */
    CANCEL_SUBSCRIPTION: (subscriptionId: string) =>
        `${SUBSCRIPTION_BASE_PATH}/${subscriptionId}/cancel`,

    /**
     * POST - Record request usage
     * Body: { vendorId, requestId }
     */
    RECORD_USAGE: `${SUBSCRIPTION_BASE_PATH}/usage`,

    /**
     * GET - Get upcoming invoice
     * Path params: :subscriptionId
     */
    GET_UPCOMING_INVOICE: (subscriptionId: string) =>
        `${SUBSCRIPTION_BASE_PATH}/${subscriptionId}/invoice/upcoming`,

    /**
     * GET - Get billing history
     * Path params: :vendorId
     */
    GET_BILLING_HISTORY: (vendorId: string) =>
        `${SUBSCRIPTION_BASE_PATH}/vendor/${vendorId}/billing-history`,

    /**
     * POST - Create payment method (Stripe)
     * Body: { customerId, paymentMethodId }
     */
    CREATE_PAYMENT_METHOD: `${SUBSCRIPTION_BASE_PATH}/payment-methods/create`,

    /**
     * GET - Get payment methods
     * Path params: :customerId
     */
    GET_PAYMENT_METHODS: (customerId: string) =>
        `${SUBSCRIPTION_BASE_PATH}/payment-methods/${customerId}`,

    /**
     * DELETE - Remove payment method
     * Path params: :paymentMethodId
     */
    DELETE_PAYMENT_METHOD: (paymentMethodId: string) =>
        `${SUBSCRIPTION_BASE_PATH}/payment-methods/${paymentMethodId}`,

    /**
     * POST - Retry failed payment
     * Path params: :subscriptionId
     */
    RETRY_PAYMENT: (subscriptionId: string) =>
        `${SUBSCRIPTION_BASE_PATH}/${subscriptionId}/retry-payment`,
};

// ============================================================================
// Webhook Endpoints (for backend to call)
// ============================================================================

/**
 * Stripe webhook endpoints
 * These are handled by your backend server, not the mobile app
 */
export const WEBHOOK_ENDPOINTS = {
    /**
     * POST - Stripe webhook handler
     * Handles events: customer.subscription.updated, invoice.payment_succeeded, etc.
     */
    STRIPE_WEBHOOK: `${BASE_URL}/webhooks/stripe`,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, any>): string {
    const query = Object.entries(params)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

    return query ? `?${query}` : '';
}

/**
 * Get full endpoint URL with query params
 */
export function getEndpointWithParams(
    endpoint: string,
    params?: Record<string, any>
): string {
    if (!params) return endpoint;
    const queryString = buildQueryString(params);
    return `${endpoint}${queryString}`;
}

// ============================================================================
// HTTP Client Configuration (for future use)
// ============================================================================

/**
 * Default headers for API requests
 */
export function getDefaultHeaders(authToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    return headers;
}

/**
 * HTTP client configuration
 */
export const HTTP_CONFIG = {
    timeout: 30000, // 30 seconds
    retries: 3,
    retryDelay: 1000, // 1 second
};

// ============================================================================
// Error Response Types (for backend integration)
// ============================================================================

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
    };
}

/**
 * Standard API success response format
 */
export interface ApiSuccessResponse<T = any> {
    success: true;
    data: T;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;
