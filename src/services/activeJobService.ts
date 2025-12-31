/**
 * Active Job Persistence Service
 *
 * Handles persistence of active service job for vendors.
 * Ensures vendors return to their active service even after app kill/restart.
 *
 * Flow:
 * 1. Vendor sends proposal -> persist with jobId, proposalId, status='pending'
 * 2. Customer accepts proposal -> update status='accepted'
 * 3. Service completed/cancelled -> clear persist
 *
 * Uses SecureStore for reliable persistence across app sessions.
 */

import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@/api/client';
import { VENDOR_ENDPOINTS, buildUrl } from '@/api/endpoints';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEYS = {
  ACTIVE_JOB_ID: 'vendor_active_job_id',
  ACTIVE_PROPOSAL_ID: 'vendor_active_proposal_id',
  PROPOSAL_STATUS: 'vendor_proposal_status', // 'pending' | 'accepted'
} as const;

// ============================================================================
// Types
// ============================================================================

export interface ActiveJobData {
  jobId: number;
  proposalId: number;
  status?: 'pending' | 'accepted';
}

// ============================================================================
// Persistence Functions
// ============================================================================

/**
 * Save active job data to secure storage
 * Called when vendor sends proposal (pending) or when proposal is accepted
 */
export async function saveActiveJob(data: ActiveJobData): Promise<void> {
  try {
    const promises = [
      SecureStore.setItemAsync(STORAGE_KEYS.ACTIVE_JOB_ID, data.jobId.toString()),
      SecureStore.setItemAsync(STORAGE_KEYS.ACTIVE_PROPOSAL_ID, data.proposalId.toString()),
    ];

    // Save status if provided
    if (data.status) {
      promises.push(SecureStore.setItemAsync(STORAGE_KEYS.PROPOSAL_STATUS, data.status));
    }

    await Promise.all(promises);

    if (__DEV__) {
      console.log('[ActiveJobService] Saved active job:', data);
    }
  } catch (error) {
    console.error('[ActiveJobService] Failed to save active job:', error);
    throw error;
  }
}

/**
 * Update proposal status when customer accepts
 */
export async function updateActiveJobStatus(status: 'pending' | 'accepted'): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.PROPOSAL_STATUS, status);

    if (__DEV__) {
      console.log('[ActiveJobService] Updated job status:', status);
    }
  } catch (error) {
    console.error('[ActiveJobService] Failed to update job status:', error);
    throw error;
  }
}

/**
 * Get active job data from secure storage
 * Called on app startup to check for pending service
 */
export async function getActiveJob(): Promise<ActiveJobData | null> {
  try {
    const [jobId, proposalId, status] = await Promise.all([
      SecureStore.getItemAsync(STORAGE_KEYS.ACTIVE_JOB_ID),
      SecureStore.getItemAsync(STORAGE_KEYS.ACTIVE_PROPOSAL_ID),
      SecureStore.getItemAsync(STORAGE_KEYS.PROPOSAL_STATUS),
    ]);

    if (jobId && proposalId) {
      const data: ActiveJobData = {
        jobId: parseInt(jobId, 10),
        proposalId: parseInt(proposalId, 10),
        status: (status as 'pending' | 'accepted') || undefined,
      };

      if (__DEV__) {
        console.log('[ActiveJobService] Retrieved active job:', data);
      }

      return data;
    }

    return null;
  } catch (error) {
    console.error('[ActiveJobService] Failed to get active job:', error);
    return null;
  }
}

/**
 * Clear active job data from secure storage
 * Called when service is completed or cancelled
 */
export async function clearActiveJob(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACTIVE_JOB_ID),
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACTIVE_PROPOSAL_ID),
      SecureStore.deleteItemAsync(STORAGE_KEYS.PROPOSAL_STATUS),
    ]);

    if (__DEV__) {
      console.log('[ActiveJobService] Cleared active job');
    }
  } catch (error) {
    console.error('[ActiveJobService] Failed to clear active job:', error);
    throw error;
  }
}

/**
 * Check if there's an active job without returning the data
 */
export async function hasActiveJob(): Promise<boolean> {
  try {
    const jobId = await SecureStore.getItemAsync(STORAGE_KEYS.ACTIVE_JOB_ID);
    return jobId !== null;
  } catch (error) {
    console.error('[ActiveJobService] Failed to check active job:', error);
    return false;
  }
}

// ============================================================================
// Multi-Device Sync Functions
// ============================================================================

/**
 * Result of vendor backend sync operation
 */
export interface VendorSyncResult {
  /** Whether vendor has an active job or pending proposal */
  hasActive: boolean;
  /** Active job data if found */
  activeJob: ActiveJobData | null;
  /** Type of active state: 'active' (en_route/in_progress) or 'pending' (waiting for customer) */
  jobType: 'active' | 'pending' | null;
  /** Source of the data */
  source: 'backend' | 'local' | null;
}

/**
 * Backend response for vendor service requests
 */
interface VendorServiceRequestResponse {
  count: number;
  results: Array<{
    id: number;
    status: string;
    accepted_proposal?: {
      id: number;
      vendor?: {
        id: number;
      };
    } | null;
    vendor_proposal?: {
      id: number;
    } | null;
  }>;
  type: string;
}

/**
 * Sync vendor's active job from backend (for multi-device support)
 *
 * Call this on vendor app launch to detect if another device has an active job.
 * This ensures Device B knows about a job accepted on Device A.
 *
 * Flow:
 * 1. Check for active jobs (en_route, in_progress)
 * 2. If not found, check for pending proposals (waiting for customer)
 * 3. If found: save to local SecureStore and return
 * 4. If not found: clear stale local data
 * 5. On error: fall back to local storage
 */
export async function syncVendorActiveJobFromBackend(): Promise<VendorSyncResult> {
  try {
    if (__DEV__) {
      console.log('[ActiveJobService] Starting backend sync...');
    }

    // Step 1: Check for active jobs (en_route, in_progress)
    const activeUrl = buildUrl(VENDOR_ENDPOINTS.SERVICE_REQUESTS, { type: 'active' });
    const activeResponse = await apiClient.get<VendorServiceRequestResponse>(activeUrl);

    if (activeResponse.data.results && activeResponse.data.results.length > 0) {
      const job = activeResponse.data.results[0];
      const proposalId = job.accepted_proposal?.id || job.vendor_proposal?.id;

      if (__DEV__) {
        console.log('[ActiveJobService] Found active job from backend:', {
          jobId: job.id,
          proposalId,
          status: job.status,
        });
      }

      if (proposalId) {
        const activeJob: ActiveJobData = {
          jobId: job.id,
          proposalId,
          status: 'accepted',
        };

        // Save to local storage
        await saveActiveJob(activeJob);

        return { hasActive: true, activeJob, jobType: 'active', source: 'backend' };
      }
    }

    // Step 2: Check for pending proposals (waiting for customer response)
    const pendingUrl = buildUrl(VENDOR_ENDPOINTS.SERVICE_REQUESTS, { type: 'pending' });
    const pendingResponse = await apiClient.get<VendorServiceRequestResponse>(pendingUrl);

    if (pendingResponse.data.results && pendingResponse.data.results.length > 0) {
      const job = pendingResponse.data.results[0];
      const proposalId = job.vendor_proposal?.id || job.accepted_proposal?.id;

      if (__DEV__) {
        console.log('[ActiveJobService] Found pending proposal from backend:', {
          jobId: job.id,
          proposalId,
          status: job.status,
        });
      }

      if (proposalId) {
        const activeJob: ActiveJobData = {
          jobId: job.id,
          proposalId,
          status: 'pending',
        };

        // Save to local storage
        await saveActiveJob(activeJob);

        return { hasActive: true, activeJob, jobType: 'pending', source: 'backend' };
      }
    }

    // No active job found on backend - clear local if stale
    if (__DEV__) {
      console.log('[ActiveJobService] No active job found on backend');
    }

    const localJob = await getActiveJob();
    if (localJob) {
      // Clear stale local data only if it's 'pending' (might be outdated)
      // Keep 'accepted' as it might be an offline scenario
      if (localJob.status !== 'accepted') {
        await clearActiveJob();
        if (__DEV__) {
          console.log('[ActiveJobService] Cleared stale local data');
        }
      }
    }

    return { hasActive: false, activeJob: null, jobType: null, source: null };
  } catch (error) {
    if (__DEV__) {
      console.error('[ActiveJobService] Backend sync failed, falling back to local:', error);
    }

    // On error, fall back to local storage
    const localJob = await getActiveJob();
    return {
      hasActive: !!localJob,
      activeJob: localJob,
      jobType: localJob?.status === 'accepted' ? 'active' : (localJob?.status === 'pending' ? 'pending' : null),
      source: localJob ? 'local' : null,
    };
  }
}

// ============================================================================
// Export Service Object
// ============================================================================

export const activeJobService = {
  save: saveActiveJob,
  updateStatus: updateActiveJobStatus,
  get: getActiveJob,
  clear: clearActiveJob,
  has: hasActiveJob,
  syncFromBackend: syncVendorActiveJobFromBackend,
};

export default activeJobService;
