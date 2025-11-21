// src/services/mockSubscriptionApiService.ts
/**
 * Mock Subscription API Service
 *
 * Simulates a real subscription backend with mock Stripe integration.
 * Includes realistic delays, error scenarios, and state management.
 *
 * TO SWITCH TO REAL BACKEND:
 * 1. Create stripeSubscriptionApiService.ts implementing ISubscriptionApiService
 * 2. Change import in subscriptionSlice.ts from mockSubscriptionApi to stripeSubscriptionApi
 * 3. Configure Stripe publishable key in environment variables
 */

import type { ISubscriptionApiService } from './subscriptionApiService';
import type {
    VendorSubscription,
    SubscriptionPlan,
    SubscriptionStatus,
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
import {
    ALL_PLANS,
    FREE_PLAN,
    getPlanById,
    generateMockCustomerId,
    generateMockSubscriptionId,
    generateMockPaymentMethodId,
    generateMockPaymentIntentId,
} from '@/api/mock/subscriptionData';

// ============================================================================
// Mock Storage (in-memory database)
// ============================================================================

/**
 * In-memory storage for subscriptions
 * Key: vendorId -> VendorSubscription
 */
const subscriptionStorage: Map<string, VendorSubscription> = new Map();

/**
 * In-memory storage for usage tracking
 * Key: vendorId -> requestIds Set
 */
const usageStorage: Map<string, Set<string>> = new Map();

// ============================================================================
// Mock API Service Implementation
// ============================================================================

class MockSubscriptionApiService implements ISubscriptionApiService {
    private mockDelayMs = 500; // Simulate network latency

    /**
     * Simulate network delay
     */
    private async delay(ms: number = this.mockDelayMs): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get available plans
     */
    async getPlans(request?: GetPlansRequest): Promise<GetPlansResponse> {
        await this.delay();

        try {
            let plans = ALL_PLANS;

            // Filter by interval if specified
            if (request?.interval) {
                plans = plans.filter(plan => plan.interval === request.interval);
            }

            return {
                success: true,
                plans,
            };
        } catch (error) {
            return {
                success: false,
                plans: [],
                error: 'Failed to load plans',
            };
        }
    }

    /**
     * Get vendor's current subscription
     */
    async getSubscription(request: GetSubscriptionRequest): Promise<GetSubscriptionResponse> {
        await this.delay();

        try {
            const { vendorId } = request;

            // Check if subscription exists
            const subscription = subscriptionStorage.get(vendorId);

            if (!subscription) {
                // Return free tier as default
                const freeSubscription = this.createFreeSubscription(vendorId);
                subscriptionStorage.set(vendorId, freeSubscription);
                return {
                    success: true,
                    subscription: freeSubscription,
                };
            }

            return {
                success: true,
                subscription,
            };
        } catch (error) {
            return {
                success: false,
                subscription: this.createFreeSubscription(request.vendorId),
                error: 'Failed to load subscription',
            };
        }
    }

    /**
     * Create new subscription (purchase plan)
     */
    async createSubscription(
        request: CreateSubscriptionRequest
    ): Promise<CreateSubscriptionResponse> {
        await this.delay(1500); // Longer delay for payment processing

        try {
            const { vendorId, planId } = request;

            // Validate plan
            const plan = getPlanById(planId);
            if (!plan) {
                return {
                    success: false,
                    error: 'Invalid plan ID',
                };
            }

            // Check if vendor already has a paid subscription
            const existingSubscription = subscriptionStorage.get(vendorId);
            if (existingSubscription && existingSubscription.tier !== 'free') {
                return {
                    success: false,
                    error: 'You already have an active subscription. Please upgrade/downgrade instead.',
                };
            }

            // Simulate payment processing (90% success rate)
            const paymentSucceeds = Math.random() > 0.1;

            if (!paymentSucceeds) {
                return {
                    success: false,
                    error: 'Payment failed. Please try again or use a different payment method.',
                };
            }

            // Create subscription
            const now = Date.now();
            const subscription: VendorSubscription = {
                id: generateMockSubscriptionId(),
                vendorId,
                tier: plan.tier,
                status: 'active',
                currentPeriodStart: now,
                currentPeriodEnd: now + 30 * 24 * 60 * 60 * 1000, // 30 days
                cancelAtPeriodEnd: false,
                plan,
                requestsThisMonth: 0,
                requestsRemaining: plan.limits.maxRequests,
                lastPaymentDate: now,
                lastPaymentAmount: plan.price,
                lastPaymentStatus: 'succeeded',
                nextBillingDate: now + 30 * 24 * 60 * 60 * 1000,
                stripeCustomerId: generateMockCustomerId(vendorId),
                stripeSubscriptionId: generateMockSubscriptionId(),
                createdAt: now,
                updatedAt: now,
            };

            // Save to storage
            subscriptionStorage.set(vendorId, subscription);

            // Reset usage tracking
            usageStorage.set(vendorId, new Set());

            return {
                success: true,
                subscription,
            };
        } catch (error) {
            return {
                success: false,
                error: 'An unexpected error occurred. Please try again.',
            };
        }
    }

    /**
     * Update subscription (upgrade/downgrade)
     */
    async updateSubscription(
        request: UpdateSubscriptionRequest
    ): Promise<UpdateSubscriptionResponse> {
        await this.delay(1000);

        try {
            const { subscriptionId, newPlanId, cancelAtPeriodEnd } = request;

            // Find subscription by ID
            let vendorSubscription: VendorSubscription | undefined;
            let vendorId: string | undefined;

            for (const [vId, sub] of subscriptionStorage.entries()) {
                if (sub.id === subscriptionId) {
                    vendorSubscription = sub;
                    vendorId = vId;
                    break;
                }
            }

            if (!vendorSubscription || !vendorId) {
                return {
                    success: false,
                    error: 'Subscription not found',
                };
            }

            // Update plan if specified
            if (newPlanId) {
                const newPlan = getPlanById(newPlanId);
                if (!newPlan) {
                    return {
                        success: false,
                        error: 'Invalid plan ID',
                    };
                }

                // Update subscription
                vendorSubscription.plan = newPlan;
                vendorSubscription.tier = newPlan.tier;
                vendorSubscription.requestsRemaining = newPlan.limits.maxRequests;
                vendorSubscription.updatedAt = Date.now();

                // Prorate billing (simplified mock)
                if (newPlan.price > vendorSubscription.lastPaymentAmount!) {
                    // Upgrading - charge difference immediately
                    vendorSubscription.lastPaymentAmount = newPlan.price;
                    vendorSubscription.lastPaymentDate = Date.now();
                    vendorSubscription.lastPaymentStatus = 'succeeded';
                }
            }

            // Update cancellation flag if specified
            if (cancelAtPeriodEnd !== undefined) {
                vendorSubscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
                vendorSubscription.updatedAt = Date.now();
            }

            // Save changes
            subscriptionStorage.set(vendorId, vendorSubscription);

            return {
                success: true,
                subscription: vendorSubscription,
            };
        } catch (error) {
            return {
                success: false,
                error: 'Failed to update subscription',
            };
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(
        request: CancelSubscriptionRequest
    ): Promise<CancelSubscriptionResponse> {
        await this.delay(800);

        try {
            const { subscriptionId, immediate, reason } = request;

            // Find subscription
            let vendorSubscription: VendorSubscription | undefined;
            let vendorId: string | undefined;

            for (const [vId, sub] of subscriptionStorage.entries()) {
                if (sub.id === subscriptionId) {
                    vendorSubscription = sub;
                    vendorId = vId;
                    break;
                }
            }

            if (!vendorSubscription || !vendorId) {
                return {
                    success: false,
                    error: 'Subscription not found',
                };
            }

            if (immediate) {
                // Cancel immediately - revert to free tier
                const freeSubscription = this.createFreeSubscription(vendorId);
                subscriptionStorage.set(vendorId, freeSubscription);

                return {
                    success: true,
                    subscription: freeSubscription,
                };
            } else {
                // Cancel at period end
                vendorSubscription.cancelAtPeriodEnd = true;
                vendorSubscription.updatedAt = Date.now();
                subscriptionStorage.set(vendorId, vendorSubscription);

                return {
                    success: true,
                    subscription: vendorSubscription,
                };
            }
        } catch (error) {
            return {
                success: false,
                error: 'Failed to cancel subscription',
            };
        }
    }

    /**
     * Record usage (increment request count)
     */
    async recordUsage(request: RecordUsageRequest): Promise<RecordUsageResponse> {
        await this.delay(100); // Quick operation

        try {
            const { vendorId, requestId } = request;

            // Get subscription
            const subscription = subscriptionStorage.get(vendorId);
            if (!subscription) {
                return {
                    success: false,
                    requestsRemaining: 0,
                    limitReached: true,
                    error: 'Subscription not found',
                };
            }

            // Get usage tracking
            let usedRequestIds = usageStorage.get(vendorId);
            if (!usedRequestIds) {
                usedRequestIds = new Set();
                usageStorage.set(vendorId, usedRequestIds);
            }

            // Check if already recorded
            if (usedRequestIds.has(requestId)) {
                return {
                    success: true,
                    requestsRemaining: subscription.requestsRemaining,
                    limitReached: subscription.requestsRemaining === 0,
                };
            }

            // Check if limit reached
            if (subscription.requestsRemaining !== null && subscription.requestsRemaining <= 0) {
                return {
                    success: false,
                    requestsRemaining: 0,
                    limitReached: true,
                    error: 'Request limit reached. Please upgrade your plan.',
                };
            }

            // Record usage
            usedRequestIds.add(requestId);
            subscription.requestsThisMonth += 1;

            if (subscription.requestsRemaining !== null) {
                subscription.requestsRemaining -= 1;
            }

            subscription.updatedAt = Date.now();
            subscriptionStorage.set(vendorId, subscription);

            return {
                success: true,
                requestsRemaining: subscription.requestsRemaining,
                limitReached: subscription.requestsRemaining === 0,
            };
        } catch (error) {
            return {
                success: false,
                requestsRemaining: 0,
                limitReached: true,
                error: 'Failed to record usage',
            };
        }
    }

    /**
     * Create payment method (mock)
     */
    async createPaymentMethod(cardDetails: {
        cardNumber: string;
        expMonth: number;
        expYear: number;
        cvc: string;
    }): Promise<{ success: boolean; paymentMethod?: MockStripePaymentMethod; error?: string }> {
        await this.delay(600);

        try {
            // Basic validation
            if (cardDetails.cardNumber.length < 13 || cardDetails.cardNumber.length > 19) {
                return {
                    success: false,
                    error: 'Invalid card number',
                };
            }

            if (cardDetails.expMonth < 1 || cardDetails.expMonth > 12) {
                return {
                    success: false,
                    error: 'Invalid expiration month',
                };
            }

            if (cardDetails.cvc.length < 3 || cardDetails.cvc.length > 4) {
                return {
                    success: false,
                    error: 'Invalid CVC',
                };
            }

            // Mock payment method
            const paymentMethod: MockStripePaymentMethod = {
                id: generateMockPaymentMethodId(),
                type: 'card',
                card: {
                    brand: 'visa',
                    last4: cardDetails.cardNumber.slice(-4),
                    expMonth: cardDetails.expMonth,
                    expYear: cardDetails.expYear,
                },
            };

            return {
                success: true,
                paymentMethod,
            };
        } catch (error) {
            return {
                success: false,
                error: 'Failed to create payment method',
            };
        }
    }

    /**
     * Confirm payment (mock)
     */
    async confirmPayment(paymentIntentId: string): Promise<{
        success: boolean;
        paymentIntent?: MockStripePaymentIntent;
        error?: string;
    }> {
        await this.delay(1200);

        try {
            // 95% success rate
            const succeeds = Math.random() > 0.05;

            const paymentIntent: MockStripePaymentIntent = {
                id: paymentIntentId,
                amount: 999, // Mock amount in cents
                currency: 'usd',
                status: succeeds ? 'succeeded' : 'requires_payment_method',
                clientSecret: `${paymentIntentId}_secret_mock`,
            };

            if (!succeeds) {
                return {
                    success: false,
                    paymentIntent,
                    error: 'Your card was declined. Please try again.',
                };
            }

            return {
                success: true,
                paymentIntent,
            };
        } catch (error) {
            return {
                success: false,
                error: 'Payment confirmation failed',
            };
        }
    }

    /**
     * Get payment methods (mock)
     */
    async getPaymentMethods(customerId: string): Promise<{
        success: boolean;
        paymentMethods: MockStripePaymentMethod[];
        error?: string;
    }> {
        await this.delay(400);

        // Mock: return one saved card
        return {
            success: true,
            paymentMethods: [
                {
                    id: generateMockPaymentMethodId(),
                    type: 'card',
                    card: {
                        brand: 'visa',
                        last4: '4242',
                        expMonth: 12,
                        expYear: 2025,
                    },
                },
            ],
        };
    }

    /**
     * Get upcoming invoice (mock)
     */
    async getUpcomingInvoice(subscriptionId: string): Promise<{
        success: boolean;
        amount?: number;
        nextBillingDate?: number;
        error?: string;
    }> {
        await this.delay(400);

        // Find subscription
        for (const subscription of subscriptionStorage.values()) {
            if (subscription.id === subscriptionId) {
                return {
                    success: true,
                    amount: subscription.plan.price * 100, // Convert to cents
                    nextBillingDate: subscription.nextBillingDate,
                };
            }
        }

        return {
            success: false,
            error: 'Subscription not found',
        };
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================

    /**
     * Create default free subscription
     */
    private createFreeSubscription(vendorId: string): VendorSubscription {
        const now = Date.now();
        return {
            id: `free_${vendorId}`,
            vendorId,
            tier: 'free',
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: now + 365 * 24 * 60 * 60 * 1000, // 1 year (never expires)
            cancelAtPeriodEnd: false,
            plan: FREE_PLAN,
            requestsThisMonth: 0,
            requestsRemaining: FREE_PLAN.limits.maxRequests,
            lastPaymentDate: null,
            lastPaymentAmount: null,
            lastPaymentStatus: null,
            nextBillingDate: now + 365 * 24 * 60 * 60 * 1000,
            stripeCustomerId: generateMockCustomerId(vendorId),
            createdAt: now,
            updatedAt: now,
        };
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const mockSubscriptionApi = new MockSubscriptionApiService();
