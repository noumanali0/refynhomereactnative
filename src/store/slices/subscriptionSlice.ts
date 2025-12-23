// src/store/slices/subscriptionSlice.ts
/**
 * Subscription Redux Slice
 *
 * Manages vendor subscription state, plan catalog, and payment flow.
 * Follows the optimized pattern from requestsSlice.ts with:
 * - Normalized state for O(1) lookups
 * - Async thunks for API operations
 * - Clear separation between catalog and active subscription
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { AppThunk } from '@/store';
import type {
    VendorSubscription,
    SubscriptionPlan,
    SubscriptionStatus,
    SubscriptionTier,
    BillingInterval,
    CreateSubscriptionRequest,
    UpdateSubscriptionRequest,
    CancelSubscriptionRequest,
} from '@/types/subscription';
import type { ISubscriptionApiService } from '@/services/subscriptionApiService';
import { mockSubscriptionApi } from '@/services/mockSubscriptionApiService';
import ApiServiceManager from '@/services/apiServiceManager';

// ============================================================================
// State Interface
// ============================================================================

export interface SubscriptionState {
    // Current vendor subscription
    currentSubscription: VendorSubscription | null;

    // Plan catalog (normalized by ID for O(1) lookups)
    plansById: Record<string, SubscriptionPlan>;
    planIds: string[]; // Ordered array of plan IDs

    // UI State
    isLoading: boolean;
    error: string | null;

    // Payment flow state
    paymentInProgress: boolean;
    paymentError: string | null;
    selectedPlanId: string | null; // Plan user is purchasing

    // Feature access cache (for performance)
    featureAccessCache: Record<string, boolean>;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: SubscriptionState = {
    currentSubscription: null,
    plansById: {},
    planIds: [],
    isLoading: false,
    error: null,
    paymentInProgress: false,
    paymentError: null,
    selectedPlanId: null,
    featureAccessCache: {},
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Initialize subscription service and load plans
 */
export const initializeSubscriptionService = createAsyncThunk(
    'subscription/initialize',
    async (vendorId: string, { dispatch }) => {
        // Use mock API (in production, switch to real Stripe integration)
        const apiService = mockSubscriptionApi;

        dispatch(setApiService(apiService));

        // Load available plans
        const plansResponse = await apiService.getPlans();
        // console.log("🚀 ~ plansResponse:", plansResponse)
        if (plansResponse.success) {
            dispatch(setPlans(plansResponse.plans));
        }

        // Load current subscription
        const subResponse = await apiService.getSubscription({ vendorId });
        if (subResponse.success && subResponse.subscription) {
            dispatch(setSubscription(subResponse.subscription));
        }

        return {
            plans: plansResponse.plans,
            subscription: subResponse.subscription,
        };
    }
);

/**
 * Create new subscription (purchase plan)
 */
export const createSubscription = createAsyncThunk(
    'subscription/create',
    async (request: CreateSubscriptionRequest, { dispatch, rejectWithValue }) => {
        dispatch(setPaymentInProgress(true));
        dispatch(setPaymentError(null));

        try {
            const apiService = mockSubscriptionApi;
            const response = await apiService.createSubscription(request);

            if (response.success && response.subscription) {
                dispatch(setSubscription(response.subscription));
                dispatch(clearSelectedPlan());
                return response.subscription;
            } else {
                dispatch(setPaymentError(response.error || 'Failed to create subscription'));
                return rejectWithValue(response.error || 'Failed to create subscription');
            }
        } catch (error: any) {
            const errorMessage = error?.message || 'Payment failed';
            dispatch(setPaymentError(errorMessage));
            return rejectWithValue(errorMessage);
        } finally {
            dispatch(setPaymentInProgress(false));
        }
    }
);

/**
 * Update existing subscription (upgrade/downgrade)
 */
export const updateSubscription = createAsyncThunk(
    'subscription/update',
    async (request: UpdateSubscriptionRequest, { dispatch, rejectWithValue }) => {
        dispatch(setLoading(true));
        dispatch(setError(null));

        try {
            const apiService = mockSubscriptionApi;
            const response = await apiService.updateSubscription(request);

            if (response.success && response.subscription) {
                dispatch(setSubscription(response.subscription));
                return response.subscription;
            } else {
                dispatch(setError(response.error || 'Failed to update subscription'));
                return rejectWithValue(response.error || 'Failed to update subscription');
            }
        } catch (error: any) {
            const errorMessage = error?.message || 'Update failed';
            dispatch(setError(errorMessage));
            return rejectWithValue(errorMessage);
        } finally {
            dispatch(setLoading(false));
        }
    }
);

/**
 * Cancel subscription
 */
export const cancelSubscription = createAsyncThunk(
    'subscription/cancel',
    async (request: CancelSubscriptionRequest, { dispatch, rejectWithValue }) => {
        dispatch(setLoading(true));
        dispatch(setError(null));

        try {
            const apiService = mockSubscriptionApi;
            const response = await apiService.cancelSubscription(request);

            if (response.success && response.subscription) {
                dispatch(setSubscription(response.subscription));
                return response.subscription;
            } else {
                dispatch(setError(response.error || 'Failed to cancel subscription'));
                return rejectWithValue(response.error || 'Failed to cancel subscription');
            }
        } catch (error: any) {
            const errorMessage = error?.message || 'Cancellation failed';
            dispatch(setError(errorMessage));
            return rejectWithValue(errorMessage);
        } finally {
            dispatch(setLoading(false));
        }
    }
);

/**
 * Refresh subscription data (check for updates)
 */
export const refreshSubscription = createAsyncThunk(
    'subscription/refresh',
    async (vendorId: string, { dispatch }) => {
        const apiService = mockSubscriptionApi;
        const response = await apiService.getSubscription({ vendorId });

        if (response.success && response.subscription) {
            dispatch(setSubscription(response.subscription));
            return response.subscription;
        }

        return null;
    }
);

/**
 * Record request usage (increment counter)
 */
export const recordRequestUsage = createAsyncThunk(
    'subscription/recordUsage',
    async ({ vendorId, requestId }: { vendorId: string; requestId: string }, { dispatch }) => {
        const apiService = mockSubscriptionApi;
        const response = await apiService.recordUsage({ vendorId, requestId });

        if (response.success) {
            // Update local request counts
            dispatch(incrementRequestCount());
            return response;
        }

        return response;
    }
);

// ============================================================================
// Slice Definition
// ============================================================================

const subscriptionSlice = createSlice({
    name: 'subscription',
    initialState,
    reducers: {
        /**
         * Set current subscription
         */
        setSubscription(state, action: PayloadAction<VendorSubscription>) {
            state.currentSubscription = action.payload;
            state.error = null;

            // Clear feature access cache to force recalculation
            state.featureAccessCache = {};
        },

        /**
         * Update subscription status
         */
        updateSubscriptionStatus(state, action: PayloadAction<SubscriptionStatus>) {
            if (state.currentSubscription) {
                state.currentSubscription.status = action.payload;
                state.currentSubscription.updatedAt = Date.now();
            }
        },

        /**
         * Set available plans
         */
        setPlans(state, action: PayloadAction<SubscriptionPlan[]>) {
            const plansById: Record<string, SubscriptionPlan> = {};
            const planIds: string[] = [];

            action.payload.forEach(plan => {
                plansById[plan.id] = plan;
                planIds.push(plan.id);
            });

            state.plansById = plansById;
            state.planIds = planIds;
        },

        /**
         * Set selected plan (for checkout flow)
         */
        setSelectedPlan(state, action: PayloadAction<string>) {
            state.selectedPlanId = action.payload;
            state.paymentError = null;
        },

        /**
         * Clear selected plan
         */
        clearSelectedPlan(state) {
            state.selectedPlanId = null;
            state.paymentError = null;
        },

        /**
         * Increment request count
         */
        incrementRequestCount(state) {
            if (state.currentSubscription) {
                state.currentSubscription.requestsThisMonth += 1;

                // Update remaining count (if not unlimited)
                if (state.currentSubscription.requestsRemaining !== null) {
                    state.currentSubscription.requestsRemaining = Math.max(
                        0,
                        state.currentSubscription.requestsRemaining - 1
                    );
                }

                state.currentSubscription.updatedAt = Date.now();
            }
        },

        /**
         * Reset monthly request count (call at start of new billing period)
         */
        resetMonthlyRequestCount(state) {
            if (state.currentSubscription) {
                const maxRequests = state.currentSubscription.plan.limits.maxRequests;

                state.currentSubscription.requestsThisMonth = 0;
                state.currentSubscription.requestsRemaining = maxRequests;
                state.currentSubscription.updatedAt = Date.now();
            }
        },

        /**
         * Cache feature access result
         */
        cacheFeatureAccess(
            state,
            action: PayloadAction<{ featureId: string; hasAccess: boolean }>
        ) {
            state.featureAccessCache[action.payload.featureId] = action.payload.hasAccess;
        },

        /**
         * Clear feature access cache
         */
        clearFeatureAccessCache(state) {
            state.featureAccessCache = {};
        },

        /**
         * Set loading state
         */
        setLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },

        /**
         * Set error message
         */
        setError(state, action: PayloadAction<string | null>) {
            state.error = action.payload;
        },

        /**
         * Set payment in progress state
         */
        setPaymentInProgress(state, action: PayloadAction<boolean>) {
            state.paymentInProgress = action.payload;
        },

        /**
         * Set payment error
         */
        setPaymentError(state, action: PayloadAction<string | null>) {
            state.paymentError = action.payload;
        },

        /**
         * Set API service instance (stored in ApiServiceManager, not in state)
         */
        setApiService(state, action: PayloadAction<ISubscriptionApiService | null>) {
            ApiServiceManager.setSubscriptionApi(action.payload);
        },

        /**
         * Clear all subscription data (logout)
         */
        clearSubscriptionData(state) {
            state.currentSubscription = null;
            state.error = null;
            state.paymentError = null;
            state.selectedPlanId = null;
            state.featureAccessCache = {};
        },
    },
});

// ============================================================================
// Exports
// ============================================================================

export const {
    setSubscription,
    updateSubscriptionStatus,
    setPlans,
    setSelectedPlan,
    clearSelectedPlan,
    incrementRequestCount,
    resetMonthlyRequestCount,
    cacheFeatureAccess,
    clearFeatureAccessCache,
    setLoading,
    setError,
    setPaymentInProgress,
    setPaymentError,
    setApiService,
    clearSubscriptionData,
} = subscriptionSlice.actions;

export default subscriptionSlice.reducer;

// ============================================================================
// Helper Thunks
// ============================================================================

/**
 * Check if subscription needs renewal/billing
 */
export const checkSubscriptionStatus = (): AppThunk => (dispatch, getState) => {
    const { subscription } = getState();
    const current = subscription.currentSubscription;

    if (!current) return;

    const now = Date.now();

    // Check if billing period has ended
    if (now > current.currentPeriodEnd) {
        // Mock: In real app, webhook from Stripe would handle this
        // For now, just refresh subscription data
        dispatch(refreshSubscription(current.vendorId));
    }

    // Check if status is past_due
    if (current.status === 'past_due') {
        // Show payment retry UI
        dispatch(setError('Payment failed. Please update your payment method.'));
    }
};

/**
 * Start periodic subscription checks (every 5 minutes)
 */
let subscriptionCheckInterval: NodeJS.Timeout | null = null;

export const startSubscriptionMonitoring = (): AppThunk => (dispatch, getState) => {
    if (subscriptionCheckInterval) return;

    // Check immediately
    dispatch(checkSubscriptionStatus());

    // Check every 5 minutes
    subscriptionCheckInterval = setInterval(() => {
        dispatch(checkSubscriptionStatus());
    }, 5 * 60 * 1000);
};

export const stopSubscriptionMonitoring = (): AppThunk => () => {
    if (subscriptionCheckInterval) {
        clearInterval(subscriptionCheckInterval);
        subscriptionCheckInterval = null;
    }
};
