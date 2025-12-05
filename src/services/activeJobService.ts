/**
 * Active Job Persistence Service
 *
 * Handles persistence of active service job for vendors.
 * Ensures vendors return to their active service even after app kill/restart.
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
} as const;

// ============================================================================
// Types
// ============================================================================

export interface ActiveJobData {
  jobId: number;
  proposalId: number;
}

// ============================================================================
// Persistence Functions
// ============================================================================

/**
 * Save active job data to secure storage
 * Called when a proposal is accepted
 */
export async function saveActiveJob(data: ActiveJobData): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.ACTIVE_JOB_ID, data.jobId.toString()),
      SecureStore.setItemAsync(STORAGE_KEYS.ACTIVE_PROPOSAL_ID, data.proposalId.toString()),
    ]);

    if (__DEV__) {
      console.log('[ActiveJobService] Saved active job:', data);
    }
  } catch (error) {
    console.error('[ActiveJobService] Failed to save active job:', error);
    throw error;
  }
}

/**
 * Get active job data from secure storage
 * Called on app startup to check for pending service
 */
export async function getActiveJob(): Promise<ActiveJobData | null> {
  try {
    const [jobId, proposalId] = await Promise.all([
      SecureStore.getItemAsync(STORAGE_KEYS.ACTIVE_JOB_ID),
      SecureStore.getItemAsync(STORAGE_KEYS.ACTIVE_PROPOSAL_ID),
    ]);

    if (jobId && proposalId) {
      const data: ActiveJobData = {
        jobId: parseInt(jobId, 10),
        proposalId: parseInt(proposalId, 10),
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
  get: getActiveJob,
  clear: clearActiveJob,
  has: hasActiveJob,
};

export default activeJobService;
