/**
 * Customer Active Service Persistence Service
 *
 * Handles persistence of active service for customers.
 * Ensures customers return to their live-offers screen even after app kill/restart.
 *
 * Flow:
 * 1. Request created -> persist with requestId, expiresAt, location, address
 * 2. Proposal accepted -> update with proposalId, acceptedAt, status='accepted'
 * 3. Request expires -> update status='expired'
 * 4. Service completed OR customer cancels -> clear persist
 *
 * Uses SecureStore with single JSON key for atomic operations.
 */

import * as SecureStore from 'expo-secure-store';

// ============================================================================
// Constants
// ============================================================================

/** Single storage key for atomic operations */
const STORAGE_KEY = 'customer_active_service';

/** Cancel disable duration in milliseconds (1 minute) */
export const CANCEL_DISABLE_DURATION_MS = 60 * 1000;

/** Request timeout in seconds (5 minutes) - should match backend */
export const REQUEST_TIMEOUT_SECONDS = 300;

// ============================================================================
// Types
// ============================================================================

export type ActiveServiceStatus = 'pending' | 'accepted' | 'expired';

export interface CustomerActiveServiceData {
    /** Request ID - mandatory */
    requestId: number;

    /** ISO timestamp when request expires - CRITICAL for timer restoration */
    expiresAt: string;

    /** Current status of the service request */
    status: ActiveServiceStatus;

    /** Accepted proposal ID - only set after acceptance */
    proposalId?: number;

    /** Timestamp when proposal was accepted - for cancel window */
    acceptedAt?: number;

    /** Service location coordinates */
    serviceLocation?: {
        latitude: number;
        longitude: number;
    };

    /** Service address text */
    serviceAddress?: string;

    /** Category ID - for Search Again functionality */
    categoryId?: number;

    /** Problem title - for Search Again functionality */
    problemTitle?: string;

    /** Description - for Search Again functionality */
    description?: string;

    /** Timestamp when data was last updated */
    updatedAt: string;
}

/** Input for saving new active service (expiresAt is required) */
export interface SaveActiveServiceInput {
    requestId: number;
    expiresAt: string;
    serviceLocation?: {
        latitude: number;
        longitude: number;
    };
    serviceAddress?: string;
    categoryId?: number;
    problemTitle?: string;
    description?: string;
}

// ============================================================================
// Persistence Functions
// ============================================================================

/**
 * Save customer's active service data to secure storage
 * Called when request is created
 */
export async function saveCustomerActiveService(input: SaveActiveServiceInput): Promise<void> {
    try {
        const data: CustomerActiveServiceData = {
            requestId: input.requestId,
            expiresAt: input.expiresAt,
            status: 'pending',
            serviceLocation: input.serviceLocation,
            serviceAddress: input.serviceAddress,
            categoryId: input.categoryId,
            problemTitle: input.problemTitle,
            description: input.description,
            updatedAt: new Date().toISOString(),
        };

        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(data));

        if (__DEV__) {
            console.log('[CustomerActiveService] Saved active service:', data);
        }
    } catch (error) {
        console.error('[CustomerActiveService] Failed to save active service:', error);
        throw error;
    }
}

/**
 * Update acceptance data when proposal is accepted
 * Called after customer accepts a vendor proposal
 */
export async function updateCustomerActiveServiceAcceptance(
    proposalId: number,
    acceptedAt: number
): Promise<void> {
    try {
        const existing = await getCustomerActiveService();
        if (!existing) {
            console.warn('[CustomerActiveService] No active service to update acceptance');
            return;
        }

        const updated: CustomerActiveServiceData = {
            ...existing,
            proposalId,
            acceptedAt,
            status: 'accepted',
            updatedAt: new Date().toISOString(),
        };

        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(updated));

        if (__DEV__) {
            console.log('[CustomerActiveService] Updated acceptance:', { proposalId, acceptedAt });
        }
    } catch (error) {
        console.error('[CustomerActiveService] Failed to update acceptance:', error);
        throw error;
    }
}

/**
 * Mark the active service as expired
 * Called when 5-min timer runs out
 */
export async function markCustomerActiveServiceExpired(): Promise<void> {
    try {
        const existing = await getCustomerActiveService();
        if (!existing) {
            return;
        }

        const updated: CustomerActiveServiceData = {
            ...existing,
            status: 'expired',
            updatedAt: new Date().toISOString(),
        };

        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(updated));

        if (__DEV__) {
            console.log('[CustomerActiveService] Marked as expired');
        }
    } catch (error) {
        console.error('[CustomerActiveService] Failed to mark as expired:', error);
        throw error;
    }
}

/**
 * Get customer's active service data from secure storage
 * Returns null if no active service exists
 */
export async function getCustomerActiveService(): Promise<CustomerActiveServiceData | null> {
    try {
        const data = await SecureStore.getItemAsync(STORAGE_KEY);

        if (!data) {
            return null;
        }

        const parsed = JSON.parse(data) as CustomerActiveServiceData;

        if (__DEV__) {
            console.log('[CustomerActiveService] Retrieved active service:', parsed);
        }

        return parsed;
    } catch (error) {
        console.error('[CustomerActiveService] Failed to get active service:', error);
        return null;
    }
}

/**
 * Clear customer's active service data from secure storage
 * Called when service is completed, cancelled, or user logs out
 */
export async function clearCustomerActiveService(): Promise<void> {
    try {
        await SecureStore.deleteItemAsync(STORAGE_KEY);

        if (__DEV__) {
            console.log('[CustomerActiveService] Cleared active service');
        }
    } catch (error) {
        console.error('[CustomerActiveService] Failed to clear active service:', error);
        throw error;
    }
}

/**
 * Check if there's an active service without returning the data
 */
export async function hasCustomerActiveService(): Promise<boolean> {
    try {
        const data = await SecureStore.getItemAsync(STORAGE_KEY);
        return data !== null;
    } catch (error) {
        console.error('[CustomerActiveService] Failed to check active service:', error);
        return false;
    }
}

/**
 * Check if the stored request has already expired based on expiresAt
 * Returns true if expired, false if still active
 */
export async function isActiveServiceExpired(): Promise<boolean> {
    try {
        const data = await getCustomerActiveService();
        if (!data) return true;

        // Check persisted status first
        if (data.status === 'expired') {
            return true;
        }

        // Check expiresAt timestamp
        const expiresAt = new Date(data.expiresAt).getTime();
        const now = Date.now();

        return now >= expiresAt;
    } catch (error) {
        console.error('[CustomerActiveService] Failed to check expiry:', error);
        return true;
    }
}

/**
 * Get remaining time in seconds until request expires
 * Returns 0 if already expired
 */
export async function getRequestTimeRemaining(): Promise<number> {
    try {
        const data = await getCustomerActiveService();
        if (!data) return 0;

        if (data.status === 'expired') {
            return 0;
        }

        const expiresAt = new Date(data.expiresAt).getTime();
        const now = Date.now();
        const remainingMs = expiresAt - now;

        return Math.max(0, Math.ceil(remainingMs / 1000));
    } catch (error) {
        console.error('[CustomerActiveService] Failed to get time remaining:', error);
        return 0;
    }
}

/**
 * Check if customer can cancel the service
 * Returns true if more than 1 minute has passed since acceptance
 */
export async function canCancelService(): Promise<boolean> {
    try {
        const data = await getCustomerActiveService();
        if (!data || !data.acceptedAt) return true;

        const now = Date.now();
        const elapsed = now - data.acceptedAt;

        return elapsed >= CANCEL_DISABLE_DURATION_MS;
    } catch (error) {
        console.error('[CustomerActiveService] Failed to check cancel eligibility:', error);
        return true;
    }
}

/**
 * Get remaining time until cancel is enabled (in seconds)
 * Returns 0 if cancel is already enabled
 */
export async function getCancelDisableRemaining(): Promise<number> {
    try {
        const data = await getCustomerActiveService();
        if (!data || !data.acceptedAt) return 0;

        const now = Date.now();
        const elapsed = now - data.acceptedAt;
        const remaining = CANCEL_DISABLE_DURATION_MS - elapsed;

        return Math.max(0, Math.ceil(remaining / 1000));
    } catch (error) {
        console.error('[CustomerActiveService] Failed to get cancel remaining time:', error);
        return 0;
    }
}

// ============================================================================
// Export Service Object
// ============================================================================

export const customerActiveServiceService = {
    save: saveCustomerActiveService,
    updateAcceptance: updateCustomerActiveServiceAcceptance,
    markExpired: markCustomerActiveServiceExpired,
    get: getCustomerActiveService,
    clear: clearCustomerActiveService,
    has: hasCustomerActiveService,
    isExpired: isActiveServiceExpired,
    getTimeRemaining: getRequestTimeRemaining,
    canCancel: canCancelService,
    getCancelRemaining: getCancelDisableRemaining,
};

export default customerActiveServiceService;
