/**
 * Customer Active Service Persistence Service
 *
 * Handles persistence of active service for customers.
 * Ensures customers return to their live-offers screen even after app kill/restart.
 *
 * Flow:
 * 1. Request created -> persist with requestId, location, address (no proposalId/acceptedAt yet)
 * 2. Proposal accepted -> update with proposalId and acceptedAt
 * 3. Service completed OR customer cancels -> clear persist
 *
 * Uses SecureStore for reliable persistence across app sessions.
 */

import * as SecureStore from 'expo-secure-store';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEYS = {
    ACTIVE_REQUEST_ID: 'customer_active_request_id',
    ACTIVE_PROPOSAL_ID: 'customer_active_proposal_id',
    ACCEPTED_AT: 'customer_accepted_at', // Timestamp when proposal was accepted
    SERVICE_LOCATION_LAT: 'customer_service_location_lat',
    SERVICE_LOCATION_LNG: 'customer_service_location_lng',
    SERVICE_ADDRESS: 'customer_service_address',
} as const;

// Cancel disable duration in milliseconds (1 minute)
export const CANCEL_DISABLE_DURATION_MS = 60 * 1000;

// ============================================================================
// Types
// ============================================================================

export interface CustomerActiveServiceData {
    requestId: number;
    proposalId?: number; // Only set after acceptance
    acceptedAt?: number; // Timestamp - only set after acceptance
    serviceLocation?: {
        latitude: number;
        longitude: number;
    };
    serviceAddress?: string;
}

// ============================================================================
// Persistence Functions
// ============================================================================

/**
 * Save customer's active service data to secure storage
 * Called when request is created (initial) or when proposal is accepted (update)
 */
export async function saveCustomerActiveService(data: CustomerActiveServiceData): Promise<void> {
    try {
        const promises: Promise<void>[] = [
            SecureStore.setItemAsync(STORAGE_KEYS.ACTIVE_REQUEST_ID, data.requestId.toString()),
        ];

        // Optional fields - only save if provided
        if (data.proposalId !== undefined) {
            promises.push(SecureStore.setItemAsync(STORAGE_KEYS.ACTIVE_PROPOSAL_ID, data.proposalId.toString()));
        }

        if (data.acceptedAt !== undefined) {
            promises.push(SecureStore.setItemAsync(STORAGE_KEYS.ACCEPTED_AT, data.acceptedAt.toString()));
        }

        if (data.serviceLocation) {
            promises.push(
                SecureStore.setItemAsync(STORAGE_KEYS.SERVICE_LOCATION_LAT, data.serviceLocation.latitude.toString()),
                SecureStore.setItemAsync(STORAGE_KEYS.SERVICE_LOCATION_LNG, data.serviceLocation.longitude.toString())
            );
        }

        if (data.serviceAddress) {
            promises.push(SecureStore.setItemAsync(STORAGE_KEYS.SERVICE_ADDRESS, data.serviceAddress));
        }

        await Promise.all(promises);

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
        await Promise.all([
            SecureStore.setItemAsync(STORAGE_KEYS.ACTIVE_PROPOSAL_ID, proposalId.toString()),
            SecureStore.setItemAsync(STORAGE_KEYS.ACCEPTED_AT, acceptedAt.toString()),
        ]);

        if (__DEV__) {
            console.log('[CustomerActiveService] Updated acceptance:', { proposalId, acceptedAt });
        }
    } catch (error) {
        console.error('[CustomerActiveService] Failed to update acceptance:', error);
        throw error;
    }
}

/**
 * Get customer's active service data from secure storage
 * Called on app startup to check for active service
 */
export async function getCustomerActiveService(): Promise<CustomerActiveServiceData | null> {
    try {
        const [requestId, proposalId, acceptedAt, lat, lng, address] = await Promise.all([
            SecureStore.getItemAsync(STORAGE_KEYS.ACTIVE_REQUEST_ID),
            SecureStore.getItemAsync(STORAGE_KEYS.ACTIVE_PROPOSAL_ID),
            SecureStore.getItemAsync(STORAGE_KEYS.ACCEPTED_AT),
            SecureStore.getItemAsync(STORAGE_KEYS.SERVICE_LOCATION_LAT),
            SecureStore.getItemAsync(STORAGE_KEYS.SERVICE_LOCATION_LNG),
            SecureStore.getItemAsync(STORAGE_KEYS.SERVICE_ADDRESS),
        ]);

        if (requestId && proposalId && acceptedAt) {
            const data: CustomerActiveServiceData = {
                requestId: parseInt(requestId, 10),
                proposalId: parseInt(proposalId, 10),
                acceptedAt: parseInt(acceptedAt, 10),
            };

            if (lat && lng) {
                data.serviceLocation = {
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lng),
                };
            }

            if (address) {
                data.serviceAddress = address;
            }

            if (__DEV__) {
                console.log('[CustomerActiveService] Retrieved active service:', data);
            }

            return data;
        }

        return null;
    } catch (error) {
        console.error('[CustomerActiveService] Failed to get active service:', error);
        return null;
    }
}

/**
 * Clear customer's active service data from secure storage
 * Called when service is completed or cancelled (after cancel window)
 */
export async function clearCustomerActiveService(): Promise<void> {
    try {
        await Promise.all([
            SecureStore.deleteItemAsync(STORAGE_KEYS.ACTIVE_REQUEST_ID),
            SecureStore.deleteItemAsync(STORAGE_KEYS.ACTIVE_PROPOSAL_ID),
            SecureStore.deleteItemAsync(STORAGE_KEYS.ACCEPTED_AT),
            SecureStore.deleteItemAsync(STORAGE_KEYS.SERVICE_LOCATION_LAT),
            SecureStore.deleteItemAsync(STORAGE_KEYS.SERVICE_LOCATION_LNG),
            SecureStore.deleteItemAsync(STORAGE_KEYS.SERVICE_ADDRESS),
        ]);

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
        const requestId = await SecureStore.getItemAsync(STORAGE_KEYS.ACTIVE_REQUEST_ID);
        return requestId !== null;
    } catch (error) {
        console.error('[CustomerActiveService] Failed to check active service:', error);
        return false;
    }
}

/**
 * Check if customer can cancel the service
 * Returns true if more than 1 minute has passed since acceptance
 */
export async function canCancelService(): Promise<boolean> {
    try {
        const acceptedAtStr = await SecureStore.getItemAsync(STORAGE_KEYS.ACCEPTED_AT);
        if (!acceptedAtStr) return true; // No active service, can "cancel"

        const acceptedAt = parseInt(acceptedAtStr, 10);
        const now = Date.now();
        const elapsed = now - acceptedAt;

        return elapsed >= CANCEL_DISABLE_DURATION_MS;
    } catch (error) {
        console.error('[CustomerActiveService] Failed to check cancel eligibility:', error);
        return true; // Allow cancel on error
    }
}

/**
 * Get remaining time until cancel is enabled (in seconds)
 * Returns 0 if cancel is already enabled
 */
export async function getCancelDisableRemaining(): Promise<number> {
    try {
        const acceptedAtStr = await SecureStore.getItemAsync(STORAGE_KEYS.ACCEPTED_AT);
        if (!acceptedAtStr) return 0;

        const acceptedAt = parseInt(acceptedAtStr, 10);
        const now = Date.now();
        const elapsed = now - acceptedAt;
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
    get: getCustomerActiveService,
    clear: clearCustomerActiveService,
    has: hasCustomerActiveService,
    canCancel: canCancelService,
    getCancelRemaining: getCancelDisableRemaining,
};

export default customerActiveServiceService;
