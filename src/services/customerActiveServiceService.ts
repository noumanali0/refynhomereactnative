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
import { serviceRequestApi } from './serviceRequestApi';

// ============================================================================
// Constants
// ============================================================================

/** Active status values that indicate customer has an ongoing request */
const ACTIVE_STATUSES = ['pending', 'accepted', 'en_route', 'in_progress'];

/**
 * Status values that BLOCK creating new requests.
 * Note: 'in_progress' is NOT included - customer CAN create new request
 * when vendor is already working (in_progress status).
 * This allows customer to book multiple vendors for different tasks.
 */
const BLOCKING_STATUSES = ['pending', 'accepted', 'en_route'];

/** Single storage key for atomic operations */
const STORAGE_KEY = 'customer_active_service';

/** Cancel disable duration in milliseconds (1 minute) */
export const CANCEL_DISABLE_DURATION_MS = 60 * 1000;

/** Request timeout in seconds (5 minutes) - should match backend */
export const REQUEST_TIMEOUT_SECONDS = 300;

// ============================================================================
// Types
// ============================================================================

export type ActiveServiceStatus = 'pending' | 'accepted' | 'en_route' | 'in_progress' | 'expired';

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

    /** Vendor location cache - for app kill recovery */
    vendorLocation?: {
        latitude: number;
        longitude: number;
        timestamp: number; // When last updated
    };

    /** Accepted vendor metadata - for offline display */
    acceptedVendor?: {
        id: number;
        full_name: string;
        phone: string;
        average_rating: number;
        total_reviews: number;
    };

    /** Category ID - for Search Again functionality */
    categoryId?: number;

    /** Problem title - for Search Again functionality */
    problemTitle?: string;

    /** Description - for Search Again functionality */
    description?: string;

    /** Vendor has reached 1km milestone - for cancel button logic */
    vendorHasReached1km?: boolean;

    /** Timestamp when vendor reached 1km */
    vendorReached1kmAt?: string;

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
 * Update customer's active service status
 * Called when service status changes (e.g., to 'in_progress' when vendor arrives)
 */
export async function updateCustomerActiveServiceStatus(
    status: 'pending' | 'accepted' | 'en_route' | 'in_progress' | 'expired'
): Promise<void> {
    try {
        const existing = await getCustomerActiveService();
        if (!existing) {
            if (__DEV__) {
                console.log('[CustomerActiveService] No active service to update status');
            }
            return;
        }

        const updated: CustomerActiveServiceData = {
            ...existing,
            status,
            updatedAt: new Date().toISOString(),
        };

        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(updated));

        if (__DEV__) {
            console.log('[CustomerActiveService] Updated status to:', status);
        }
    } catch (error) {
        console.error('[CustomerActiveService] Failed to update status:', error);
        // Don't throw - this is a non-critical operation
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

/**
 * Update vendor location in persisted storage
 * Called on every vendor.location.updated event
 * Prevents vendor marker from disappearing after app kill
 */
export async function updateVendorLocation(
    latitude: number,
    longitude: number
): Promise<void> {
    try {
        const existing = await getCustomerActiveService();
        if (!existing) return;

        const updated: CustomerActiveServiceData = {
            ...existing,
            vendorLocation: {
                latitude,
                longitude,
                timestamp: Date.now(),
            },
            updatedAt: new Date().toISOString(),
        };

        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('[CustomerActiveService] Failed to update vendor location:', error);
    }
}

/**
 * Update vendor 1km reached state
 * Called when vendor.distance.1km.reached event is received
 * Persists for app kill recovery
 */
export async function updateVendorReached1km(reached: boolean): Promise<void> {
    try {
        const existing = await getCustomerActiveService();
        if (!existing) {
            if (__DEV__) {
                console.log('[CustomerActiveService] No active service to update 1km state');
            }
            return;
        }

        const updated: CustomerActiveServiceData = {
            ...existing,
            vendorHasReached1km: reached,
            vendorReached1kmAt: reached ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString(),
        };

        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(updated));

        if (__DEV__) {
            console.log('[CustomerActiveService] Persisted vendorHasReached1km:', reached);
        }
    } catch (error) {
        console.error('[CustomerActiveService] Failed to update 1km state:', error);
    }
}

/**
 * Update accepted vendor info
 * Called when proposal is accepted
 * Stores vendor metadata for offline display
 */
export async function updateAcceptedVendorInfo(vendorInfo: {
    id: number;
    full_name: string;
    phone: string;
    average_rating: number;
    total_reviews: number;
}): Promise<void> {
    try {
        const existing = await getCustomerActiveService();
        if (!existing) return;

        const updated: CustomerActiveServiceData = {
            ...existing,
            acceptedVendor: vendorInfo,
            updatedAt: new Date().toISOString(),
        };

        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('[CustomerActiveService] Failed to update vendor info:', error);
    }
}

// ============================================================================
// Multi-Device Sync Functions
// ============================================================================

/**
 * Result of backend sync operation
 */
export interface SyncResult {
    /** Whether customer has an active request on backend */
    hasActive: boolean;
    /** Active service data if found */
    activeService: CustomerActiveServiceData | null;
    /** Source of the data */
    source: 'backend' | 'local' | null;
}

/**
 * Map backend status to local status type
 */
function mapBackendStatusToLocal(backendStatus: string): ActiveServiceStatus {
    if (backendStatus === 'pending') {
        return 'pending';
    }
    if (['accepted', 'assigned', 'waiting'].includes(backendStatus)) {
        return 'accepted';
    }
    if (backendStatus === 'en_route') {
        return 'en_route';
    }
    if (backendStatus === 'in_progress') {
        return 'in_progress';
    }
    return 'expired';
}

/**
 * Sync customer's active service from backend (for multi-device support)
 *
 * Call this on app launch to detect if another device created a request.
 * This ensures Device B knows about a request created on Device A.
 *
 * Flow:
 * 1. Fetch all customer requests from backend
 * 2. Find any active request (pending, accepted, en_route, in_progress)
 * 3. If found: save to local SecureStore and return
 * 4. If not found: clear stale local data if exists
 * 5. On error: fall back to local storage
 */
export async function syncCustomerActiveServiceFromBackend(): Promise<SyncResult> {
    try {
        if (__DEV__) {
            console.log('[CustomerActiveService] Starting backend sync...');
        }

        // Fetch all customer requests from backend
        const requests = await serviceRequestApi.getCustomerRequests();

        // Find any active request
        const activeRequest = requests.find(r => ACTIVE_STATUSES.includes(r.status));

        if (!activeRequest) {
            if (__DEV__) {
                console.log('[CustomerActiveService] No active request found on backend');
            }

            // No active request on backend - clear local if stale
            const localActive = await getCustomerActiveService();
            if (localActive) {
                // Only clear if local data exists and is not accepted (service in progress)
                // Keep accepted services as they might be offline
                if (localActive.status !== 'accepted') {
                    await clearCustomerActiveService();
                    if (__DEV__) {
                        console.log('[CustomerActiveService] Cleared stale local data');
                    }
                }
            }

            return { hasActive: false, activeService: null, source: null };
        }

        if (__DEV__) {
            console.log('[CustomerActiveService] Found active request on backend:', {
                id: activeRequest.id,
                status: activeRequest.status,
            });
        }

        // Map backend response to local format
        if (__DEV__) {
            console.log('[CustomerActiveService] Mapping backend response, status:', activeRequest.status, '→', mapBackendStatusToLocal(activeRequest.status));
        }
        const activeService: CustomerActiveServiceData = {
            requestId: activeRequest.id,
            expiresAt: activeRequest.expires_at,
            status: mapBackendStatusToLocal(activeRequest.status),
            serviceLocation: {
                latitude: parseFloat(activeRequest.latitude),
                longitude: parseFloat(activeRequest.longitude),
            },
            serviceAddress: activeRequest.address_line,
            categoryId: activeRequest.category,
            problemTitle: activeRequest.problem_title,
            description: activeRequest.description,
            updatedAt: new Date().toISOString(),
        };
        if (__DEV__) {
            console.log('[CustomerActiveService] Created activeService object:', JSON.stringify(activeService, null, 2));
        }

        // If proposal accepted, add vendor info
        if (activeRequest.accepted_proposal) {
            activeService.proposalId = activeRequest.accepted_proposal.id;
            if (activeRequest.accepted_proposal.vendor) {
                activeService.acceptedVendor = {
                    id: activeRequest.accepted_proposal.vendor.id,
                    full_name: activeRequest.accepted_proposal.vendor.full_name,
                    phone: activeRequest.accepted_proposal.vendor.phone,
                    average_rating: activeRequest.accepted_proposal.vendor.average_rating || 0,
                    total_reviews: activeRequest.accepted_proposal.vendor.total_reviews || 0,
                };
            }
        }

        // Save to local storage for offline access
        if (__DEV__) {
            console.log('[CustomerActiveService] About to save to SecureStore...');
        }
        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(activeService));

        if (__DEV__) {
            console.log('[CustomerActiveService] Backend sync complete - saved to local');
        }

        return { hasActive: true, activeService, source: 'backend' };
    } catch (error) {
        if (__DEV__) {
            console.error('[CustomerActiveService] Backend sync failed, falling back to local:', error);
        }

        // On error, fall back to local storage
        const localActive = await getCustomerActiveService();
        return {
            hasActive: !!localActive,
            activeService: localActive,
            source: localActive ? 'local' : null,
        };
    }
}

// ============================================================================
// Sync With Retry (Production-grade error recovery)
// ============================================================================

export interface SyncWithRetryResult extends SyncResult {
    /** Error message if all retries failed */
    error?: string;
    /** Number of attempts made */
    attempts?: number;
}

/**
 * Sync customer active service from backend with retry logic.
 * Falls back to local storage if all retries fail.
 *
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param retryDelayMs - Base delay between retries in ms (default: 1000)
 * @returns SyncWithRetryResult with error info if failed
 */
export async function syncWithRetry(
    maxRetries: number = 3,
    retryDelayMs: number = 1000
): Promise<SyncWithRetryResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (__DEV__) {
                console.log(`[CustomerActiveService] Sync attempt ${attempt}/${maxRetries}...`);
            }

            const result = await syncCustomerActiveServiceFromBackend();
            return { ...result, error: undefined, attempts: attempt };
        } catch (error) {
            lastError = error as Error;
            if (__DEV__) {
                console.warn(`[CustomerActiveService] Sync attempt ${attempt} failed:`, error);
            }

            // Exponential backoff between retries
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt));
            }
        }
    }

    // All retries failed - fall back to local storage
    if (__DEV__) {
        console.error('[CustomerActiveService] All sync attempts failed, using local storage');
    }

    const localActive = await getCustomerActiveService();
    return {
        hasActive: !!localActive,
        activeService: localActive,
        source: localActive ? 'local' : null,
        error: lastError?.message || 'Sync failed after retries',
        attempts: maxRetries,
    };
}

// ============================================================================
// New Request Creation Check
// ============================================================================

/**
 * Result of checking if customer can create a new request
 */
export interface CanCreateRequestResult {
    /** Whether customer can create a new request */
    canCreate: boolean;
    /** Reason why creation is blocked (if any) */
    reason: string | null;
    /** Current blocking request ID (if any) */
    blockingRequestId: number | null;
    /** Current blocking status (if any) */
    blockingStatus: string | null;
}

/**
 * Check if customer can create a new service request.
 *
 * IMPORTANT: Customer CAN create new request when status is 'in_progress'
 * because vendor is already working - customer might need another vendor.
 *
 * Blocking statuses: pending, accepted, en_route
 * Non-blocking: in_progress, completed, cancelled, expired
 *
 * @returns Result with canCreate flag and blocking info
 */
export async function canCustomerCreateNewRequest(): Promise<CanCreateRequestResult> {
    try {
        if (__DEV__) {
            console.log('[CustomerActiveService] Checking if customer can create new request...');
        }

        // First check local storage for quick response
        const localActive = await getCustomerActiveService();

        if (localActive) {
            // Map local status to backend-like status for blocking check
            // Local 'accepted' maps to backend 'accepted' or 'en_route'
            const effectiveStatus = localActive.status === 'accepted' ? 'accepted' : localActive.status;

            if (BLOCKING_STATUSES.includes(effectiveStatus) || localActive.status === 'pending') {
                if (__DEV__) {
                    console.log('[CustomerActiveService] Local check: Blocked by', localActive.status);
                }
                return {
                    canCreate: false,
                    reason: getBlockingReason(localActive.status),
                    blockingRequestId: localActive.requestId,
                    blockingStatus: localActive.status,
                };
            }
        }

        // Backend check for multi-device sync
        const requests = await serviceRequestApi.getCustomerRequests();

        // Find any request with blocking status
        const blockingRequest = requests.find(r => BLOCKING_STATUSES.includes(r.status));

        if (blockingRequest) {
            if (__DEV__) {
                console.log('[CustomerActiveService] Backend check: Blocked by request', blockingRequest.id, 'status:', blockingRequest.status);
            }
            return {
                canCreate: false,
                reason: getBlockingReason(blockingRequest.status),
                blockingRequestId: blockingRequest.id,
                blockingStatus: blockingRequest.status,
            };
        }

        // Check for in_progress request (allowed but logged)
        const inProgressRequest = requests.find(r => r.status === 'in_progress');
        if (inProgressRequest && __DEV__) {
            console.log('[CustomerActiveService] Found in_progress request', inProgressRequest.id, '- allowing new request creation');
        }

        if (__DEV__) {
            console.log('[CustomerActiveService] Customer CAN create new request');
        }

        return {
            canCreate: true,
            reason: null,
            blockingRequestId: null,
            blockingStatus: null,
        };
    } catch (error) {
        if (__DEV__) {
            console.error('[CustomerActiveService] Error checking create permission:', error);
        }

        // On error, fall back to local storage check only
        const localActive = await getCustomerActiveService();

        if (localActive && (localActive.status === 'pending' || localActive.status === 'accepted')) {
            return {
                canCreate: false,
                reason: getBlockingReason(localActive.status),
                blockingRequestId: localActive.requestId,
                blockingStatus: localActive.status,
            };
        }

        // Allow creation if we can't verify (better UX - backend will reject if invalid)
        return {
            canCreate: true,
            reason: null,
            blockingRequestId: null,
            blockingStatus: null,
        };
    }
}

/**
 * Get human-readable reason for blocking
 */
function getBlockingReason(status: string): string {
    switch (status) {
        case 'pending':
            return 'You have a pending request waiting for vendor proposals. Please wait for it to expire or cancel it first.';
        case 'accepted':
            return 'You have an accepted service. Please wait for the vendor to arrive or cancel if needed.';
        case 'en_route':
            return 'A vendor is on the way to your location. Please wait for them to arrive.';
        default:
            return 'You have an active service request. Please complete or cancel it first.';
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
    syncFromBackend: syncCustomerActiveServiceFromBackend,
    syncWithRetry: syncWithRetry,
    canCreateNewRequest: canCustomerCreateNewRequest,
};

export default customerActiveServiceService;
