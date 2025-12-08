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
// Export Service Object
// ============================================================================

export const activeJobService = {
  save: saveActiveJob,
  updateStatus: updateActiveJobStatus,
  get: getActiveJob,
  clear: clearActiveJob,
  has: hasActiveJob,
};

export default activeJobService;
