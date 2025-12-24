// src/store/slices/dispatchSlice.ts
/**
 * Dispatch Slice - Real-Time WebSocket State Management
 *
 * Manages:
 * - WebSocket connection state
 * - Service requests (vendor view)
 * - Proposals (customer view)
 * - Active job tracking
 * - Vendor location
 * - Optimistic UI updates
 */

import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { socketService } from '@/services/socketService';
import {
  sendServiceRequestNotification,
  removeServiceRequestNotification
} from '@/utils/notifications';
import { flushLocationQueue, getCurrentLocation } from '@/services/backgroundLocationService';
import { saveActiveJob, updateActiveJobStatus, clearActiveJob as clearActiveJobStorage } from '@/services/activeJobService';
import { haversineDistanceKm } from '@/utils/geo';
import type { RootState } from '@/store';
import type {
  ConnectionStatus,
  SocketServiceRequest,
  SocketProposal,
  SendProposalParams,
  Coordinates,
  ServiceRequestsSyncedEvent,
  ProposalsSyncedEvent,
  ServiceRequestCreatedEvent,
  ServiceRequestUpdatedEvent,
  ServiceRequestExpiredEvent,
  ProposalAcceptTimeoutEvent,
  SocketErrorEvent,
} from '@/types/socket';
import { ACK_TIMEOUT } from '@/config/socket';

// ============================================================================
// Constants for Vendor Distance Tracking
// ============================================================================

/** Distance threshold in meters - cancel button disappears after this */
const VENDOR_DISTANCE_THRESHOLD_M = 1000; // 1km

/**
 * Time in ms vendor must be stationary to re-enable cancel (after 1km).
 * Note: Backend uses 20 minutes for stationary detection.
 * Frontend uses 10 minutes as a fallback/safety margin.
 * The backend 'vendor_stationary' event is the authoritative source.
 */
const VENDOR_STATIONARY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes (frontend fallback)

/** Minimum movement in meters to consider vendor as "moving" */
const SIGNIFICANT_MOVEMENT_M = 20; // 20 meters

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in meters.
 */
function calculateDistanceMeters(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  return haversineDistanceKm(
    coord1.latitude,
    coord1.longitude,
    coord2.latitude,
    coord2.longitude
  ) * 1000; // Convert km to meters
}

// ============================================================================
// Module-level state for socket listener cleanup
// ============================================================================

/**
 * Stores active unsubscriber functions for socket event listeners.
 * This prevents memory leaks by ensuring listeners are cleaned up
 * before new ones are created on reconnect.
 */
let activeUnsubscribers: Array<() => void> = [];

/**
 * Debounce state for vendor location updates on customer side.
 * Prevents crash on low-end devices from rapid WebSocket location updates.
 *
 * NOTE: Initialized to 0 (not Date.now()) to allow first update through.
 * The check below explicitly allows first update when lastTime <= 0.
 */
let lastVendorLocationUpdateTime = 0;
const VENDOR_LOCATION_DEBOUNCE_MS = 3000; // 3 seconds between updates

/**
 * Batch queue for service request expired events.
 * Multiple expired events arriving in rapid succession are batched
 * into a single Redux update to prevent crash on low-end devices.
 */
let expiredRequestBatchQueue: number[] = [];
let expiredRequestBatchTimeout: NodeJS.Timeout | null = null;
const EXPIRED_BATCH_DELAY_MS = 500; // Wait 500ms to batch multiple expired events

/**
 * Cleans up all active socket event listeners.
 * Should be called before creating new listeners or on disconnect.
 */
function cleanupSocketListeners(): void {
  if (__DEV__) {
    console.log(`[Dispatch] Cleaning up ${activeUnsubscribers.length} socket listeners`);
  }
  activeUnsubscribers.forEach((unsub) => {
    try {
      unsub();
    } catch (error) {
      if (__DEV__) {
        console.warn('[Dispatch] Error during listener cleanup:', error);
      }
    }
  });
  activeUnsubscribers = [];

  // Clear expired request batch queue and timeout
  if (expiredRequestBatchTimeout) {
    clearTimeout(expiredRequestBatchTimeout);
    expiredRequestBatchTimeout = null;
  }
  expiredRequestBatchQueue = [];
}

// ============================================================================
// State Interface
// ============================================================================

interface DispatchState {
  // Connection
  connectionStatus: ConnectionStatus;
  lastConnectedAt: number | null;
  reconnectAttempts: number;

  // Service Requests (Vendor View)
  serviceRequestsById: Record<number, SocketServiceRequest>;
  serviceRequestIds: number[];

  // Proposals (Customer View)
  proposalsById: Record<number, SocketProposal>;
  proposalIdsByRequest: Record<number, number[]>;

  // Customer's Active Requests (with proposals)
  customerRequestsById: Record<number, SocketServiceRequest & { proposals: SocketProposal[] }>;
  customerRequestIds: number[];

  // Active Job Tracking
  activeJobId: number | null;
  activeProposalId: number | null;
  vendorLocation: Coordinates | null;

  // Current Customer Request (for tracking cancellation even before proposal acceptance)
  currentCustomerRequestId: number | null;

  // Service Completion Tracking
  completedService: {
    requestId: number;
    vendorId: number;
    vendorName: string;
  } | null;

  // Service Cancellation Tracking
  cancelledService: {
    requestId: number;
    cancelledBy: 'customer' | 'vendor';
    reason?: string;
    reasonCode?: string;
  } | null;

  // Vendor cancelled and reset to pending (for customer UI toast)
  vendorCancelledRequest: number | null;

  // Vendor Distance Tracking (for customer cancel eligibility)
  // Now primarily driven by backend WebSocket events:
  // - 'vendor.distance.1km.reached' when vendor covers 1km towards customer
  // - 'vendor.inactive.20min' when vendor stationary for 20 minutes
  vendorDistanceTracking: {
    // Backend-driven state (source of truth)
    hasReached1km: boolean;           // true when vendor covered 1km towards customer
    isVendorStationary: boolean;      // true when vendor inactive for 20 mins
    distanceTowardsLocationKm: number; // km traveled towards customer location
    currentDistanceKm: number;        // current distance from vendor to customer
    initialDistanceKm: number;        // initial distance when vendor started
    lastBackendEventAt: number | null; // timestamp of last backend event

    // Legacy frontend tracking (kept as fallback)
    totalDistanceCovered: number;     // in meters (frontend calculation)
    lastMovementAt: number | null;    // timestamp of last significant movement
    previousLocation: Coordinates | null; // for calculating distance delta
  };

  // UI State
  pendingActions: Record<string, boolean>;
  errors: Record<string, string>;

  // Internal State (previously module-level globals - moved to Redux for proper cleanup)
  _internal: {
    lastVendorLocationUpdateTime: number;
    expiredRequestBatchQueue: number[];
    expiredRequestBatchTimeout: number | null; // Store timeout ID as number
  };

  // Customer Active Service (for logout restriction)
  customerActiveService: {
    requestId: number | null;
    status: 'pending' | 'accepted' | 'expired' | null;
  };
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: DispatchState = {
  // Connection
  connectionStatus: 'disconnected',
  lastConnectedAt: null,
  reconnectAttempts: 0,

  // Service Requests (Vendor)
  serviceRequestsById: {},
  serviceRequestIds: [],

  // Proposals (Customer)
  proposalsById: {},
  proposalIdsByRequest: {},

  // Customer Requests
  customerRequestsById: {},
  customerRequestIds: [],

  // Active Job
  activeJobId: null,
  activeProposalId: null,
  vendorLocation: null,

  // Current Customer Request
  currentCustomerRequestId: null,

  // Service Completion
  completedService: null,

  // Service Cancellation
  cancelledService: null,

  // Vendor cancelled and reset to pending
  vendorCancelledRequest: null,

  // Vendor Distance Tracking
  vendorDistanceTracking: {
    // Backend-driven state
    hasReached1km: false,
    isVendorStationary: false,
    distanceTowardsLocationKm: 0,
    currentDistanceKm: 0,
    initialDistanceKm: 0,
    lastBackendEventAt: null,
    // Legacy frontend tracking (fallback)
    totalDistanceCovered: 0,
    lastMovementAt: null,
    previousLocation: null,
  },

  // UI State
  pendingActions: {},
  errors: {},

  // Internal State
  _internal: {
    lastVendorLocationUpdateTime: 0,
    expiredRequestBatchQueue: [],
    expiredRequestBatchTimeout: null,
  },

  // Customer Active Service (for logout restriction)
  customerActiveService: {
    requestId: null,
    status: null,
  },
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Restore active job from SecureStore on app startup
 * Called after auth is restored for vendors
 */
export const restoreActiveJob = createAsyncThunk(
  'dispatch/restoreActiveJob',
  async (_, { dispatch }) => {
    // Lazy import to avoid circular dependency
    const { getActiveJob } = require('@/services/activeJobService');

    const activeJob = await getActiveJob();

    if (activeJob) {
      if (__DEV__) {
        console.log('[Dispatch] Restoring active job from storage:', activeJob);
      }

      dispatch(setActiveJob({
        requestId: activeJob.jobId,
        proposalId: activeJob.proposalId,
      }));

      return activeJob;
    }

    return null;
  }
);

/**
 * Restore customer's active service from storage (on app startup)
 * Mirrors the vendor restoreActiveJob pattern for consistency
 */
export const restoreCustomerActiveService = createAsyncThunk<
  { requestId: number; status: string } | null,
  void,
  { state: RootState }
>(
  'customer/restoreActiveService',
  async (_, { rejectWithValue }) => {
    try {
      const { getCustomerActiveService, isActiveServiceExpired, clearCustomerActiveService } =
        require('@/services/customerActiveServiceService');

      const activeService = await getCustomerActiveService();

      if (!activeService) {
        if (__DEV__) console.log('[Customer] No active service to restore');
        return null;
      }

      // Check if expired
      const isExpired = await isActiveServiceExpired();

      if (isExpired && activeService.status !== 'accepted') {
        if (__DEV__) console.log('[Customer] Active service expired, clearing');
        await clearCustomerActiveService();
        return null;
      }

      if (__DEV__) {
        console.log('[Customer] Restored active service:', {
          requestId: activeService.requestId,
          status: activeService.status
        });
      }

      return {
        requestId: activeService.requestId,
        status: activeService.status,
      };
    } catch (error) {
      console.error('[Customer] Error restoring:', error);

      // Clear corrupted storage
      const { clearCustomerActiveService } = require('@/services/customerActiveServiceService');
      await clearCustomerActiveService().catch(() => {});

      return rejectWithValue('Failed to restore active service');
    }
  }
);

/**
 * Connect to WebSocket and setup event listeners
 */
export const connectSocket = createAsyncThunk(
  'dispatch/connect',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;

    if (!state.auth.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    // Clean up existing listeners before creating new ones (prevents memory leaks on reconnect)
    cleanupSocketListeners();

    // Connection established
    activeUnsubscribers.push(
      socketService.on('connection.established', async (data: { role?: string }) => {
        if (__DEV__) console.log('[Dispatch] Connected as:', data.role);
        dispatch(setLastConnectedAt(Date.now()));

        // Reset vendor location debounce on reconnect
        // This ensures customer gets immediate update when vendor reconnects
        lastVendorLocationUpdateTime = 0;

        // Flush any queued location updates from background tracking
        // This handles the case when vendor's app was backgrounded and is now reconnecting
        try {
          await flushLocationQueue();
        } catch (error) {
          if (__DEV__) console.warn('[Dispatch] Failed to flush location queue:', error);
        }

        // CRITICAL: If vendor has an active job and reconnects, immediately send current location
        // This ensures customer gets vendor location when either side reconnects
        if (data.role === 'vendor') {
          const state = getState() as RootState;
          if (state.dispatch.activeJobId) {
            if (__DEV__) {
              console.log('[Dispatch] Vendor reconnected with active job - sending immediate location update');
            }

            // Get current location and send it immediately
            // This ensures customer sees vendor position right away after reconnect
            try {
              const currentLocation = await getCurrentLocation();
              if (currentLocation) {
                socketService.send('location.update', {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                });
                if (__DEV__) {
                  console.log('[Dispatch] Sent immediate location update on reconnect:', currentLocation);
                }
              }
            } catch (error) {
              if (__DEV__) {
                console.warn('[Dispatch] Failed to send immediate location on reconnect:', error);
              }
            }
          }
        }
      })
    );

    // Vendor: Initial service requests sync
    activeUnsubscribers.push(
      socketService.on('service_requests.synced', (data: ServiceRequestsSyncedEvent) => {
        if (__DEV__) console.log('[Dispatch] service_requests.synced');
        dispatch(syncServiceRequests(data?.payload));
      })
    );

    // Customer: Initial proposals sync
    activeUnsubscribers.push(
      socketService.on('proposals.synced', (data: ProposalsSyncedEvent) => {
        if (__DEV__) console.log('[Dispatch] proposals.synced');

        // Handle flexible payload structure from backend
        // Backend sends: { payload: [{ request: {...}, proposals: [...] }, ...] }
        // We need to transform to: [{ ...request, proposals: [...] }, ...]
        const payload = data?.payload || (data as { requests?: unknown[] })?.requests || [];

        if (!Array.isArray(payload)) {
          if (__DEV__) console.warn('[Dispatch] proposals.synced received invalid payload');
          return;
        }

        // Transform payload to match expected format
        interface SyncedRequestItem {
          request?: SocketServiceRequest;
          proposals?: SocketProposal[];
          id?: number;
        }

        const transformedRequests = payload.map((item: SyncedRequestItem) => {
          // If item has nested request object, flatten it
          if (item.request) {
            return {
              ...item.request,
              proposals: item.proposals || [],
            };
          }
          // If item is already in correct format (has id and proposals)
          return {
            ...item,
            proposals: item.proposals || [],
          };
        });

        dispatch(syncCustomerRequests(transformedRequests as Array<SocketServiceRequest & { proposals: SocketProposal[] }>));
      })
    );

    // New service request created
    activeUnsubscribers.push(
      socketService.on('service_request.created', (data: ServiceRequestCreatedEvent) => {
        if (__DEV__) console.log('[Dispatch] service_request.created:', data.request?.id);
        dispatch(addServiceRequest(data.request));

        // Send tracked notification for new request
        const categoryName = (data.request as SocketServiceRequest & { category_detail?: { name: string } }).category_detail?.name || 'Service';
        sendServiceRequestNotification({
          id: data.request.id,
          category: categoryName,
          title: data.request.problem_title,
          address: data.request.address_line
        });
      })
    );

    // Service request updated
    activeUnsubscribers.push(
      socketService.on('service_request.updated', (data: ServiceRequestUpdatedEvent) => {
        // Handle flexible payload structure
        const request = data.request || (data as { payload?: SocketServiceRequest }).payload;

        if (!request) {
          if (__DEV__) console.warn('[Dispatch] service_request.updated received with no request data');
          return;
        }

        if (__DEV__) console.log('[Dispatch] service_request.updated:', request.id, request.status);

        // Check if service was completed - trigger review flow for customer
        if (request.status === 'completed') {
          // Get vendor info from accepted proposal in state (backend doesn't send assigned_vendor)
          const state = getState() as RootState;
          const proposalIds = state.dispatch.proposalIdsByRequest[request.id] || [];
          const acceptedProposal = proposalIds
            .map(id => state.dispatch.proposalsById[id])
            .find(p => p?.status === 'accepted');

          if (acceptedProposal) {
            if (__DEV__) {
              console.log('[Dispatch] Service completed, triggering review flow:', {
                requestId: request.id,
                vendorId: acceptedProposal.vendor.id,
                vendorName: acceptedProposal.vendor.full_name,
              });
            }
            dispatch(setServiceCompleted({
              requestId: request.id,
              vendorId: acceptedProposal.vendor.id,
              vendorName: acceptedProposal.vendor.full_name,
            }));
          } else if (__DEV__) {
            console.warn('[Dispatch] Service completed but no accepted proposal found for request:', request.id);
          }
        }

        // Check if service was cancelled - notify the other party
        if (request.status === 'cancelled') {
          const state = getState() as RootState;
          const cancelledBy = request.cancelled_by || 'unknown';

          if (__DEV__) {
            console.log('[Dispatch] Service cancelled:', {
              requestId: request.id,
              cancelledBy,
              reason: request.cancellation_reason,
            });
          }

          // For VENDOR: Customer cancelled the request they were viewing/working on
          if (state.dispatch.serviceRequestsById[request.id]) {
            // Remove from vendor's list
            dispatch(removeServiceRequest(request.id));
            // Remove notification if any
            removeServiceRequestNotification(request.id);

            // Show cancellation alert to vendor (if it was an active/accepted job)
            if (cancelledBy === 'customer') {
              dispatch(setServiceCancelled({
                requestId: request.id,
                cancelledBy: 'customer',
                reason: request.cancellation_reason,
                reasonCode: request.cancellation_reason_code,
              }));

              // Clear persisted active job from SecureStore
              // This prevents "already active request" error on next app open
              clearActiveJobStorage().catch((error) => {
                if (__DEV__) console.error('[Dispatch] Failed to clear job on customer cancel:', error);
              });
            }
          }

          // For CUSTOMER: Vendor cancelled the job
          // Check customerRequestsById, activeJobId, AND currentCustomerRequestId
          // This ensures cancellation is detected in ALL scenarios:
          // 1. Request in customerRequestsById (synced via WebSocket)
          // 2. activeJobId set (after proposal acceptance)
          // 3. currentCustomerRequestId set (customer's current active request)
          const isCustomerRequest = !!state.dispatch.customerRequestsById[request.id];
          const isActiveJob = state.dispatch.activeJobId === request.id;
          const isCurrentRequest = state.dispatch.currentCustomerRequestId === request.id;

          if (isCustomerRequest || isActiveJob || isCurrentRequest) {
            if (cancelledBy === 'vendor') {
              dispatch(setServiceCancelled({
                requestId: request.id,
                cancelledBy: 'vendor',
                reason: request.cancellation_reason,
                reasonCode: request.cancellation_reason_code,
              }));

              // Clear currentCustomerRequestId when vendor cancels
              dispatch(clearCurrentCustomerRequest());
            }

            // Clear active job if it was the cancelled one
            if (isActiveJob) {
              dispatch(clearActiveJob());
            }
          }
        }

        dispatch(updateServiceRequest(request));
      })
    );

    // Service request expired
    // IMPORTANT: Batched to prevent rapid Redux updates that crash low-end devices
    // Multiple expired events arriving within 500ms are combined into single update
    activeUnsubscribers.push(
      socketService.on('service_request.expired', (data: ServiceRequestExpiredEvent) => {
        if (__DEV__) console.log('[Dispatch] service_request.expired (queued):', data.request_id);

        // Add to batch queue
        if (!expiredRequestBatchQueue.includes(data.request_id)) {
          expiredRequestBatchQueue.push(data.request_id);
        }

        // Remove notification immediately (doesn't affect render)
        removeServiceRequestNotification(data.request_id);

        // Clear existing timeout and set new one
        // This ensures we wait for all rapid events before dispatching
        if (expiredRequestBatchTimeout) {
          clearTimeout(expiredRequestBatchTimeout);
        }

        expiredRequestBatchTimeout = setTimeout(() => {
          if (expiredRequestBatchQueue.length > 0) {
            const requestIds = [...expiredRequestBatchQueue];
            expiredRequestBatchQueue = [];
            expiredRequestBatchTimeout = null;

            if (__DEV__) {
              console.log('[Dispatch] Processing batched expired requests:', requestIds);
            }

            // Single Redux dispatch for all expired requests
            dispatch(removeServiceRequestsBatch(requestIds));
          }
        }, EXPIRED_BATCH_DELAY_MS);
      })
    );

    // Service cancelled by vendor - request reset to pending
    // This event is sent when vendor cancels an accepted job
    // Backend resets request to PENDING and re-broadcasts to other vendors
    activeUnsubscribers.push(
      socketService.on('service.cancelled', (data: { service_request_id: number; status: string }) => {
        if (__DEV__) console.log('[Dispatch] service.cancelled:', data);

        const requestId = data.service_request_id;

        // Only handle when status is 'pending' (vendor cancelled, request reset)
        if (data.status === 'pending') {
          // Set vendor cancelled flag for UI toast
          dispatch(setVendorCancelledAndReset(requestId));

          // Clear vendor location since vendor is no longer assigned
          dispatch(clearVendorLocation());

          // Clear all proposals for this request (they're now invalid)
          dispatch(clearProposalsForRequest(requestId));

          if (__DEV__) {
            console.log('[Dispatch] Vendor cancelled, request reset to pending:', requestId);
          }
        }
      })
    );

    // Proposal created - when vendor sends a new proposal to customer
    activeUnsubscribers.push(
      socketService.on('proposal.created', (data: { proposal?: SocketProposal; payload?: SocketProposal }) => {
        // Handle flexible payload structure
        const proposal = data.proposal || data.payload;

        if (!proposal) {
          if (__DEV__) console.warn('[Dispatch] proposal.created received with no proposal data');
          return;
        }

        if (__DEV__) console.log('[Dispatch] proposal.created:', proposal.id);

        dispatch(updateProposal(proposal));
      })
    );

    // Proposal updated - when proposal status changes (accepted, declined, etc.)
    activeUnsubscribers.push(
      socketService.on('proposal.updated', (data: { proposal?: SocketProposal; payload?: SocketProposal }) => {
        // Handle both type-defined structure (data.proposal) and potential backend variations (data.payload)
        const proposal = data.proposal || data.payload;

        if (!proposal) {
          if (__DEV__) console.warn('[Dispatch] proposal.updated received with no proposal data');
          return;
        }

        if (__DEV__) console.log('[Dispatch] proposal.updated:', proposal.id, proposal.status);

        dispatch(updateProposal(proposal));

        // If proposal was accepted, set active job and save to SecureStore
        if (proposal.status === 'accepted') {
          dispatch(setActiveJob({
            requestId: proposal.service_request_id,
            proposalId: proposal.id,
          }));

          // Save full job to SecureStore (not just update status) for robustness
          saveActiveJob({
            jobId: proposal.service_request_id,
            proposalId: proposal.id,
            status: 'accepted',
          }).catch((error) => {
            if (__DEV__) console.error('[Dispatch] Failed to save job on proposal.updated:', error);
          });
        }

        // If proposal was declined or expired, clear the persisted job
        if (proposal.status === 'declined' || proposal.status === 'expired') {
          clearActiveJobStorage().catch((error) => {
            if (__DEV__) console.error('[Dispatch] Failed to clear job on decline/expire:', error);
          });
        }
      })
    );

    // Proposal acceptance timeout
    activeUnsubscribers.push(
      socketService.on('proposal.accept.timeout', (data: ProposalAcceptTimeoutEvent) => {
        if (__DEV__) console.log('[Dispatch] proposal.accept.timeout:', data.proposal?.id);
        dispatch(updateProposal({ ...data.proposal, status: 'expired' }));

        // Clear persisted job when customer doesn't accept in time
        clearActiveJobStorage().catch((error) => {
          if (__DEV__) console.error('[Dispatch] Failed to clear job on timeout:', error);
        });
      })
    );

    // Proposal accepted - backend sends this event when customer accepts proposal
    // This is different from proposal.updated - backend sends proposal.accepted specifically for acceptance
    activeUnsubscribers.push(
      socketService.on('proposal.accepted', (data: { proposal?: SocketProposal; payload?: SocketProposal }) => {
        const proposal = data.proposal || data.payload;

        if (!proposal) {
          if (__DEV__) console.warn('[Dispatch] proposal.accepted received with no proposal data');
          return;
        }

        if (__DEV__) console.log('[Dispatch] proposal.accepted:', proposal.id, proposal.status);

        // Update proposal in Redux state
        dispatch(updateProposal(proposal));

        // Set active job for vendor
        dispatch(setActiveJob({
          requestId: proposal.service_request_id,
          proposalId: proposal.id,
        }));

        // IMPORTANT: Save active job to SecureStore with 'accepted' status
        // This ensures vendor returns to this screen on app restart
        // Note: We save the full job here (not just update status) because the job might not have been
        // saved yet if there was any issue during proposal.ack
        saveActiveJob({
          jobId: proposal.service_request_id,
          proposalId: proposal.id,
          status: 'accepted',
        }).then(() => {
          if (__DEV__) console.log('[Dispatch] Active job saved on acceptance:', proposal.service_request_id);
        }).catch((error) => {
          if (__DEV__) console.error('[Dispatch] Failed to save active job on acceptance:', error);
        });
      })
    );

    // Socket errors
    activeUnsubscribers.push(
      socketService.on('error', (data: SocketErrorEvent) => {
        if (__DEV__) console.error('[Dispatch] Socket error:', data.message);
        dispatch(setError({ key: 'socket', message: data.message }));
      })
    );

    // Vendor location updated - for customer to track vendor
    // Backend sends 'vendor.location.updated' event
    // IMPORTANT: Debounced to prevent crash on low-end devices from rapid updates
    // BUT: Always allow first update through (when lastTime <= 0)
    // Also tracks cumulative distance for customer cancel eligibility
    activeUnsubscribers.push(
      socketService.on('vendor.location.updated', (data: { payload?: Coordinates } & Partial<Coordinates>) => {
        const payload = data.payload || data;
        if (payload && payload.latitude && payload.longitude) {
          const now = Date.now();
          const newLocation: Coordinates = {
            latitude: payload.latitude,
            longitude: payload.longitude,
          };

          // ALWAYS allow first location update (when lastTime is 0 or negative)
          // This ensures customer gets initial vendor position immediately
          const isFirstUpdate = lastVendorLocationUpdateTime <= 0;

          // Debounce: Only skip if NOT first update AND too frequent
          if (!isFirstUpdate && (now - lastVendorLocationUpdateTime < VENDOR_LOCATION_DEBOUNCE_MS)) {
            if (__DEV__) {
              console.log('[Dispatch] Debounced vendor location update (too frequent)');
            }
            return; // Skip this update to prevent crash on low-end devices
          }

          lastVendorLocationUpdateTime = now;

          if (__DEV__ && isFirstUpdate) {
            console.log('[Dispatch] First vendor location update received:', payload);
          }

          // Update vendor location in state
          dispatch(setVendorLocation(newLocation));

          // Update distance tracking for customer cancel eligibility
          dispatch(updateVendorDistanceTracking({ location: newLocation, timestamp: now }));

          // Persist vendor location to SecureStore for app kill recovery
          const { updateVendorLocation } = require('@/services/customerActiveServiceService');
          updateVendorLocation(newLocation.latitude, newLocation.longitude)
            .catch((error: any) => {
              if (__DEV__) console.error('[Dispatch] Failed to persist vendor location:', error);
            });
        }
      })
    );

    // Backend event: Vendor reached 1km towards customer location
    // This is the authoritative event from backend - hide cancel button
    activeUnsubscribers.push(
      socketService.on('vendor.distance.1km.reached', (data: {
        payload?: {
          vendor_id: number;
          vendor_name: string;
          service_request_id: number;
          distance_towards_location_km: number;
          current_distance_km: number;
          initial_distance_km: number;
          reached_at: string;
        };
      }) => {
        const payload = data.payload || data;
        if (__DEV__) {
          console.log('[Dispatch] Backend event: Vendor reached 1km towards customer:', payload);
        }

        dispatch(setVendorReached1km({
          distanceTowardsLocationKm: (payload as any).distance_towards_location_km || 0,
          currentDistanceKm: (payload as any).current_distance_km || 0,
          initialDistanceKm: (payload as any).initial_distance_km || 0,
        }));
      })
    );

    // Backend event: Vendor inactive for 20 minutes
    // This is the authoritative event from backend - show cancel button
    activeUnsubscribers.push(
      socketService.on('vendor.inactive.20min', (data: {
        payload?: {
          vendor_id: number;
          vendor_name: string;
          service_request_id: number;
          last_location_at: string;
          inactive_duration_minutes: number;
          detected_at: string;
        };
      }) => {
        const payload = data.payload || data;
        if (__DEV__) {
          console.log('[Dispatch] Backend event: Vendor inactive for 20 minutes:', payload);
        }

        dispatch(setVendorInactive20min({
          inactiveDurationMinutes: (payload as any).inactive_duration_minutes || 20,
          lastLocationAt: (payload as any).last_location_at || '',
        }));
      })
    );

    // Auth failure - need to refresh token or logout
    activeUnsubscribers.push(
      socketService.on('auth.failed', () => {
        dispatch(setError({ key: 'auth', message: 'Authentication failed' }));
      })
    );

    // Connection status changes
    activeUnsubscribers.push(
      socketService.onStatusChange((status) => {
        dispatch(setConnectionStatus(status));
      })
    );

    // Connect to socket - listeners are already stored in module-level activeUnsubscribers
    try {
      await socketService.connect();
      return { success: true };
    } catch (error) {
      // Cleanup listeners on failure
      cleanupSocketListeners();
      throw error;
    }
  }
);

/**
 * Disconnect from WebSocket
 */
export const disconnectSocket = createAsyncThunk(
  'dispatch/disconnect',
  async () => {
    // Clean up all event listeners first (prevents memory leaks)
    cleanupSocketListeners();
    socketService.disconnect();
    socketService.removeAllListeners();
    return { success: true };
  }
);

/**
 * Vendor: Send proposal for a service request
 *
 * IMPORTANT: This thunk properly manages socket listeners to prevent memory leaks.
 * All listeners are always cleaned up via the cleanup() helper, regardless of
 * success, failure, or timeout.
 */
export const sendProposal = createAsyncThunk(
  'dispatch/sendProposal',
  async (params: SendProposalParams, { dispatch }) => {
    const { serviceRequestId, priceQuote, message, etaMinutes } = params;
    const pendingKey = `proposal_${serviceRequestId}`;

    dispatch(setPendingAction({ key: pendingKey, value: true }));

    // Track cleanup functions at thunk scope
    let unsub: (() => void) | null = null;
    let unsubError: (() => void) | null = null;
    let timeout: NodeJS.Timeout | null = null;

    // Cleanup helper - ALWAYS cleans up everything
    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      if (unsub) {
        unsub();
        unsub = null;
      }
      if (unsubError) {
        unsubError();
        unsubError = null;
      }
      dispatch(setPendingAction({ key: pendingKey, value: false }));
    };

    try {
      socketService.send('proposal.create', {
        service_request_id: serviceRequestId,
        price_quote: priceQuote,
        message,
        eta_minutes: etaMinutes,
      });

      // Wait for acknowledgment with timeout
      return await new Promise((resolve, reject) => {
        let resolved = false; // Guard against double resolve/reject

        timeout = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          cleanup();
          reject(new Error('Proposal timeout'));
        }, ACK_TIMEOUT);

        unsub = socketService.on('proposal.ack', (data: any) => {
          if (data.service_request_id === serviceRequestId && !resolved) {
            resolved = true;
            cleanup();

            // Persist active job when proposal is sent successfully
            // This ensures vendor returns to this request after app kill
            if (data.proposal_id) {
              saveActiveJob({
                jobId: serviceRequestId,
                proposalId: data.proposal_id,
                status: 'pending',
              }).catch((error) => {
                if (__DEV__) console.error('[Dispatch] Failed to persist pending job:', error);
              });
            }

            resolve(data);
          }
        });

        // Also listen for errors
        unsubError = socketService.on('error', (data: SocketErrorEvent) => {
          if (data.code === 'proposal_failed' && !resolved) {
            resolved = true;
            cleanup();
            reject(new Error(data.message));
          }
        });
      });
    } catch (error) {
      // Ensure cleanup happens even if promise construction fails
      cleanup();
      throw error;
    }
  }
);

/**
 * Customer: Accept a proposal
 *
 * IMPORTANT: This thunk properly manages socket listeners to prevent memory leaks.
 * All listeners are always cleaned up via the cleanup() helper, regardless of
 * success, failure, or timeout. This prevents OOM crashes on low-end devices.
 */
export const acceptProposal = createAsyncThunk(
  'dispatch/acceptProposal',
  async (proposalId: number, { dispatch }) => {
    const pendingKey = `accept_${proposalId}`;
    dispatch(setPendingAction({ key: pendingKey, value: true }));

    // Track cleanup functions at thunk scope
    let unsub: (() => void) | null = null;
    let unsubError: (() => void) | null = null;
    let timeout: NodeJS.Timeout | null = null;

    // Cleanup helper - ALWAYS cleans up everything
    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      if (unsub) {
        unsub();
        unsub = null;
      }
      if (unsubError) {
        unsubError();
        unsubError = null;
      }
      dispatch(setPendingAction({ key: pendingKey, value: false }));
    };

    try {
      socketService.send('proposal.accept', { proposal_id: proposalId });

      // Wait for acknowledgment
      return await new Promise((resolve, reject) => {
        let resolved = false; // Guard against double resolve/reject

        timeout = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          cleanup();
          reject(new Error('Accept timeout'));
        }, ACK_TIMEOUT);

        unsub = socketService.on('proposal.accepted.ack', (data: any) => {
          if (data.proposal_id === proposalId && !resolved) {
            resolved = true;
            cleanup();
            resolve(data);
          }
        });

        unsubError = socketService.on('error', (data: SocketErrorEvent) => {
          // Handle any error during accept flow, not just specific codes
          if (!resolved) {
            resolved = true;
            cleanup();
            reject(new Error(data.message || 'Accept failed'));
          }
        });
      });
    } catch (error) {
      // Ensure cleanup happens even if promise construction fails
      cleanup();
      throw error;
    }
  }
);

/**
 * Customer: Decline a proposal
 *
 * IMPORTANT: This thunk properly manages socket listeners to prevent memory leaks.
 * All listeners are always cleaned up via the cleanup() helper, regardless of
 * success, failure, or timeout.
 */
export const declineProposal = createAsyncThunk(
  'dispatch/declineProposal',
  async (proposalId: number, { dispatch }) => {
    const pendingKey = `decline_${proposalId}`;

    dispatch(setPendingAction({ key: pendingKey, value: true }));

    // Track cleanup functions at thunk scope
    let unsub: (() => void) | null = null;
    let timeout: NodeJS.Timeout | null = null;

    // Cleanup helper - ALWAYS cleans up everything
    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      if (unsub) {
        unsub();
        unsub = null;
      }
      dispatch(setPendingAction({ key: pendingKey, value: false }));
    };

    try {
      socketService.send('proposal.decline', { proposal_id: proposalId });

      return await new Promise((resolve, reject) => {
        let resolved = false; // Guard against double resolve/reject

        timeout = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          cleanup();
          reject(new Error('Decline timeout'));
        }, ACK_TIMEOUT);

        unsub = socketService.on('proposal.declined.ack', (data: any) => {
          if (data.proposal_id === proposalId && !resolved) {
            resolved = true;
            cleanup();
            resolve(data);
          }
        });
      });
    } catch (error) {
      // Ensure cleanup happens even if promise construction fails
      cleanup();
      throw error;
    }
  }
);

/**
 * Vendor: Update location
 */
export const updateLocation = createAsyncThunk(
  'dispatch/updateLocation',
  async (coords: Coordinates) => {
    socketService.send('location.update', {
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    return coords;
  }
);

/**
 * Vendor: Start route to customer
 */
export const startRoute = createAsyncThunk(
  'dispatch/startRoute',
  async (serviceRequestId: number, { dispatch }) => {
    const pendingKey = `route_start_${serviceRequestId}`;

    dispatch(setPendingAction({ key: pendingKey, value: true }));

    try {
      socketService.send('route.start', { service_request_id: serviceRequestId });

      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          dispatch(setPendingAction({ key: pendingKey, value: false }));
          reject(new Error('Start route timeout'));
        }, ACK_TIMEOUT);

        const unsub = socketService.on('route.start.ack', (data: any) => {
          if (data.service_request_id === serviceRequestId) {
            clearTimeout(timeout);
            unsub();
            dispatch(setPendingAction({ key: pendingKey, value: false }));
            resolve(data);
          }
        });
      });
    } catch (error) {
      dispatch(setPendingAction({ key: pendingKey, value: false }));
      throw error;
    }
  }
);

/**
 * Vendor: Arrive at location
 */
export const arriveAtLocation = createAsyncThunk(
  'dispatch/arrive',
  async (serviceRequestId: number, { dispatch }) => {
    const pendingKey = `route_arrive_${serviceRequestId}`;

    dispatch(setPendingAction({ key: pendingKey, value: true }));

    try {
      socketService.send('route.arrive', { service_request_id: serviceRequestId });

      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          dispatch(setPendingAction({ key: pendingKey, value: false }));
          reject(new Error('Arrive timeout'));
        }, ACK_TIMEOUT);

        const unsub = socketService.on('route.arrive.ack', (data: any) => {
          if (data.service_request_id === serviceRequestId) {
            clearTimeout(timeout);
            unsub();
            dispatch(setPendingAction({ key: pendingKey, value: false }));
            resolve(data);
          }
        });
      });
    } catch (error) {
      dispatch(setPendingAction({ key: pendingKey, value: false }));
      throw error;
    }
  }
);

/**
 * Vendor: Complete service
 */
export const completeService = createAsyncThunk(
  'dispatch/complete',
  async (serviceRequestId: number, { dispatch }) => {
    const pendingKey = `route_complete_${serviceRequestId}`;

    dispatch(setPendingAction({ key: pendingKey, value: true }));

    try {
      socketService.send('route.complete', { service_request_id: serviceRequestId });

      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          dispatch(setPendingAction({ key: pendingKey, value: false }));
          reject(new Error('Complete timeout'));
        }, ACK_TIMEOUT);

        const unsub = socketService.on('route.complete.ack', (data: any) => {
          if (data.service_request_id === serviceRequestId) {
            clearTimeout(timeout);
            unsub();
            dispatch(setPendingAction({ key: pendingKey, value: false }));

            // Clear persisted active job from SecureStore
            clearActiveJobStorage().catch((error) => {
              if (__DEV__) console.error('[Dispatch] Failed to clear persisted active job:', error);
            });

            resolve(data);
          }
        });
      });
    } catch (error) {
      dispatch(setPendingAction({ key: pendingKey, value: false }));
      throw error;
    }
  }
);

// ============================================================================
// Slice
// ============================================================================

const dispatchSlice = createSlice({
  name: 'dispatch',
  initialState,
  reducers: {
    // Connection status
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.connectionStatus = action.payload;
    },

    setLastConnectedAt: (state, action: PayloadAction<number>) => {
      state.lastConnectedAt = action.payload;
    },

    // Vendor: Sync service requests - filter out expired ones
    syncServiceRequests: (state, action: PayloadAction<SocketServiceRequest[]>) => {
      state.serviceRequestsById = {};
      state.serviceRequestIds = [];

      const now = Date.now();
      action.payload?.forEach((request) => {
        // Skip expired requests - check both expires_at and remaining_expiry_time
        const expiresAt = new Date(request.expires_at).getTime();
        if ((expiresAt > now && request.remaining_expiry_time > 0) || request?.vendor_status === 'accepted') {
          state.serviceRequestsById[request.id] = request;
          state.serviceRequestIds.push(request.id);
        }
      });
    },

    // Vendor: Add new service request
    addServiceRequest: (state, action: PayloadAction<SocketServiceRequest>) => {
      const request = action.payload;

      // Skip if already exists
      if (state.serviceRequestsById[request.id]) {
        return;
      }

      state.serviceRequestsById[request.id] = request;
      state.serviceRequestIds.unshift(request.id); // Add to beginning
    },

    // Vendor: Update service request
    updateServiceRequest: (state, action: PayloadAction<SocketServiceRequest>) => {
      const request = action.payload;
      state.serviceRequestsById[request.id] = request;

      // Add to list if not present
      if (!state.serviceRequestIds.includes(request.id)) {
        state.serviceRequestIds.unshift(request.id);
      }
    },

    // Vendor: Remove service request
    removeServiceRequest: (state, action: PayloadAction<number>) => {
      const requestId = action.payload;
      delete state.serviceRequestsById[requestId];
      state.serviceRequestIds = state.serviceRequestIds.filter((id) => id !== requestId);
    },

    // Vendor: Remove multiple service requests in a single batch
    // This prevents rapid sequential Redux updates that crash low-end devices
    removeServiceRequestsBatch: (state, action: PayloadAction<number[]>) => {
      const requestIds = action.payload;
      requestIds.forEach((requestId) => {
        delete state.serviceRequestsById[requestId];
      });
      state.serviceRequestIds = state.serviceRequestIds.filter((id) => !requestIds.includes(id));
    },

    // Customer: Sync requests with proposals
    syncCustomerRequests: (
      state,
      action: PayloadAction<Array<SocketServiceRequest & { proposals: SocketProposal[] }>>
    ) => {
      state.customerRequestsById = {};
      state.customerRequestIds = [];
      state.proposalsById = {};
      state.proposalIdsByRequest = {};

      action.payload.forEach((request) => {
        state.customerRequestsById[request.id] = request;
        state.customerRequestIds.push(request.id);

        // Index proposals
        state.proposalIdsByRequest[request.id] = [];
        request.proposals.forEach((proposal) => {
          state.proposalsById[proposal.id] = proposal;
          state.proposalIdsByRequest[request.id].push(proposal.id);
        });
      });
    },

    // Customer: Update proposal
    updateProposal: (state, action: PayloadAction<SocketProposal>) => {
      const proposal = action.payload;
      state.proposalsById[proposal.id] = proposal;
      // Ensure it's in the request's proposal list
      if (!state.proposalIdsByRequest[proposal.service_request_id]) {
        state.proposalIdsByRequest[proposal.service_request_id] = [];
      }

      if (!state.proposalIdsByRequest[proposal.service_request_id].includes(proposal.id)) {
        state.proposalIdsByRequest[proposal.service_request_id].push(proposal.id);
      }
    },

    // Remove proposal
    removeProposal: (state, action: PayloadAction<number>) => {
      const proposalId = action.payload;
      const proposal = state.proposalsById[proposalId];

      if (proposal) {
        const requestId = proposal.service_request_id;
        delete state.proposalsById[proposalId];

        if (state.proposalIdsByRequest[requestId]) {
          state.proposalIdsByRequest[requestId] = state.proposalIdsByRequest[requestId].filter(
            (id) => id !== proposalId
          );
        }
      }
    },

    // Active job tracking
    setActiveJob: (
      state,
      action: PayloadAction<{ requestId: number; proposalId: number } | null>
    ) => {
      if (action.payload) {
        state.activeJobId = action.payload.requestId;
        state.activeProposalId = action.payload.proposalId;
      } else {
        state.activeJobId = null;
        state.activeProposalId = null;
      }
    },

    clearActiveJob: (state) => {
      state.activeJobId = null;
      state.activeProposalId = null;
    },

    // Current customer request tracking (for cancellation handling)
    setCurrentCustomerRequest: (state, action: PayloadAction<number | null>) => {
      state.currentCustomerRequestId = action.payload;
    },

    clearCurrentCustomerRequest: (state) => {
      state.currentCustomerRequestId = null;
    },

    // Vendor location
    setVendorLocation: (state, action: PayloadAction<Coordinates | null>) => {
      state.vendorLocation = action.payload;
    },

    // Service completion (for customer review flow)
    setServiceCompleted: (
      state,
      action: PayloadAction<{
        requestId: number;
        vendorId: number;
        vendorName: string;
      } | null>
    ) => {
      state.completedService = action.payload;
    },

    clearCompletedService: (state) => {
      state.completedService = null;
    },

    // Service Cancellation
    setServiceCancelled: (
      state,
      action: PayloadAction<{
        requestId: number;
        cancelledBy: 'customer' | 'vendor';
        reason?: string;
        reasonCode?: string;
      } | null>
    ) => {
      state.cancelledService = action.payload;
    },

    clearServiceCancelled: (state) => {
      state.cancelledService = null;
    },

    // Vendor cancelled and request reset to pending (for customer UI)
    setVendorCancelledAndReset: (state, action: PayloadAction<number>) => {
      const requestId = action.payload;
      // Mark as vendor cancelled (for UI toast)
      state.vendorCancelledRequest = requestId;
      // Clear accepted proposal tracking since vendor cancelled
      state.activeJobId = null;
      state.activeProposalId = null;
    },

    clearVendorCancelledRequest: (state) => {
      state.vendorCancelledRequest = null;
    },

    // Clear all proposals for a specific request (used when vendor cancels)
    clearProposalsForRequest: (state, action: PayloadAction<number>) => {
      const requestId = action.payload;
      const proposalIds = state.proposalIdsByRequest[requestId] || [];
      proposalIds.forEach(id => {
        delete state.proposalsById[id];
      });
      delete state.proposalIdsByRequest[requestId];
    },

    // Vendor Distance Tracking - updates cumulative distance and stationary status
    updateVendorDistanceTracking: (
      state,
      action: PayloadAction<{ location: Coordinates; timestamp: number }>
    ) => {
      const { location, timestamp } = action.payload;
      const tracking = state.vendorDistanceTracking;

      // First location - just initialize
      if (!tracking.previousLocation) {
        state.vendorDistanceTracking = {
          ...tracking,
          previousLocation: location,
          lastMovementAt: timestamp,
        };
        return;
      }

      // Calculate distance from previous location
      const distanceDelta = calculateDistanceMeters(tracking.previousLocation, location);

      // Check if this is significant movement (> 20m)
      const isSignificantMovement = distanceDelta >= SIGNIFICANT_MOVEMENT_M;

      if (isSignificantMovement) {
        // Add to cumulative distance (legacy frontend tracking)
        const newTotalDistance = tracking.totalDistanceCovered + distanceDelta;
        // Note: hasReached1km is now primarily set by backend event 'vendor.distance.1km.reached'
        // Frontend calculation kept as fallback only
        const hasReached1kmFrontend = newTotalDistance >= VENDOR_DISTANCE_THRESHOLD_M;

        state.vendorDistanceTracking = {
          ...state.vendorDistanceTracking, // Preserve backend-driven fields
          totalDistanceCovered: newTotalDistance,
          // Only set hasReached1km if backend hasn't set it yet (fallback)
          hasReached1km: state.vendorDistanceTracking.hasReached1km || hasReached1kmFrontend,
          isVendorStationary: false, // Moving, so not stationary
          lastMovementAt: timestamp,
          previousLocation: location,
        };

        if (__DEV__ && hasReached1kmFrontend && !tracking.hasReached1km) {
          console.log('[Dispatch] Vendor reached 1km threshold (frontend fallback) - customer cancel disabled');
        }
      } else {
        // Not significant movement - check if stationary for 10 mins (only after 1km)
        if (tracking.hasReached1km && tracking.lastMovementAt) {
          const stationaryDuration = timestamp - tracking.lastMovementAt;
          const isNowStationary = stationaryDuration >= VENDOR_STATIONARY_THRESHOLD_MS;

          if (isNowStationary && !tracking.isVendorStationary) {
            if (__DEV__) {
              console.log('[Dispatch] Vendor stationary for 10 mins - customer cancel re-enabled');
            }
            state.vendorDistanceTracking.isVendorStationary = true;
          }
        }

        // Update previous location even for small movements
        state.vendorDistanceTracking.previousLocation = location;
      }
    },

    // Reset vendor distance tracking (when job is cancelled/completed or new job starts)
    resetVendorDistanceTracking: (state) => {
      state.vendorDistanceTracking = {
        // Backend-driven state
        hasReached1km: false,
        isVendorStationary: false,
        distanceTowardsLocationKm: 0,
        currentDistanceKm: 0,
        initialDistanceKm: 0,
        lastBackendEventAt: null,
        // Legacy frontend tracking
        totalDistanceCovered: 0,
        lastMovementAt: null,
        previousLocation: null,
      };
    },

    // Manually set vendor as stationary (for timer-based detection)
    // Used when no location updates received for 10+ minutes after 1km
    setVendorStationary: (state) => {
      if (state.vendorDistanceTracking.hasReached1km) {
        state.vendorDistanceTracking.isVendorStationary = true;
        if (__DEV__) {
          console.log('[Dispatch] Vendor marked stationary by timer check');
        }
      }
    },

    // Backend event: Vendor reached 1km towards customer location
    // Triggered by 'vendor.distance.1km.reached' WebSocket event
    setVendorReached1km: (
      state,
      action: PayloadAction<{
        distanceTowardsLocationKm: number;
        currentDistanceKm: number;
        initialDistanceKm: number;
      }>
    ) => {
      state.vendorDistanceTracking.hasReached1km = true;
      state.vendorDistanceTracking.isVendorStationary = false; // Moving towards customer
      state.vendorDistanceTracking.distanceTowardsLocationKm = action.payload.distanceTowardsLocationKm;
      state.vendorDistanceTracking.currentDistanceKm = action.payload.currentDistanceKm;
      state.vendorDistanceTracking.initialDistanceKm = action.payload.initialDistanceKm;
      state.vendorDistanceTracking.lastBackendEventAt = Date.now();

      if (__DEV__) {
        console.log('[Dispatch] Backend: Vendor reached 1km towards customer - cancel button hidden');
      }
    },

    // Backend event: Vendor inactive for 20 minutes
    // Triggered by 'vendor.inactive.20min' WebSocket event
    setVendorInactive20min: (
      state,
      action: PayloadAction<{
        inactiveDurationMinutes: number;
        lastLocationAt: string;
      }>
    ) => {
      state.vendorDistanceTracking.isVendorStationary = true;
      state.vendorDistanceTracking.lastBackendEventAt = Date.now();

      if (__DEV__) {
        console.log(`[Dispatch] Backend: Vendor inactive for ${action.payload.inactiveDurationMinutes} min - cancel button shown`);
      }
    },

    // UI State
    setPendingAction: (state, action: PayloadAction<{ key: string; value: boolean }>) => {
      const { key, value } = action.payload;
      if (value) {
        state.pendingActions[key] = true;
      } else {
        delete state.pendingActions[key];
      }
    },

    setError: (state, action: PayloadAction<{ key: string; message: string }>) => {
      state.errors[action.payload.key] = action.payload.message;
    },

    clearError: (state, action: PayloadAction<string>) => {
      delete state.errors[action.payload];
    },

    clearAllErrors: (state) => {
      state.errors = {};
    },

    // Reset state (on logout)
    resetDispatchState: () => initialState,

    // Clean up completed service data
    cleanupCompletedService: (state, action: PayloadAction<number>) => {
      const requestId = action.payload;

      // Remove from service requests
      delete state.serviceRequestsById[requestId];
      state.serviceRequestIds = state.serviceRequestIds.filter((id) => id !== requestId);

      // Clear active job if it matches
      if (state.activeJobId === requestId) {
        state.activeJobId = null;
        state.activeProposalId = null;
      }

      // Clear vendor location
      state.vendorLocation = null;
    },

    // Customer Active Service (for logout restriction)
    setCustomerActiveService: (
      state,
      action: PayloadAction<{ requestId: number; status: 'pending' | 'accepted' | 'expired' }>
    ) => {
      state.customerActiveService = {
        requestId: action.payload.requestId,
        status: action.payload.status,
      };
    },

    clearCustomerActiveServiceState: (state) => {
      state.customerActiveService = {
        requestId: null,
        status: null,
      };
    },
  },
  extraReducers: (builder) => {
    // Connect
    builder
      .addCase(connectSocket.pending, (state) => {
        state.connectionStatus = 'connecting';
      })
      .addCase(connectSocket.fulfilled, (state) => {
        state.connectionStatus = 'connected';
        state.reconnectAttempts = 0;
      })
      .addCase(connectSocket.rejected, (state, action) => {
        state.connectionStatus = 'error';
        state.errors['connection'] = action.error.message || 'Failed to connect';
      });

    // Disconnect
    builder.addCase(disconnectSocket.fulfilled, (state) => {
      state.connectionStatus = 'disconnected';
    });

    // Location update
    builder.addCase(updateLocation.fulfilled, (state, action) => {
      state.vendorLocation = action.payload;
    });

    // Complete service
    builder.addCase(completeService.fulfilled, (state) => {
      state.activeJobId = null;
      state.activeProposalId = null;
      state.vendorLocation = null;
    });

    // Restore customer active service (on app startup)
    builder.addCase(restoreCustomerActiveService.fulfilled, (state, action) => {
      if (action.payload) {
        state.customerActiveService = {
          requestId: action.payload.requestId,
          status: action.payload.status as 'pending' | 'accepted' | 'expired',
        };
      }
    });
  },
});

// ============================================================================
// Actions
// ============================================================================

export const {
  setConnectionStatus,
  setLastConnectedAt,
  syncServiceRequests,
  addServiceRequest,
  updateServiceRequest,
  removeServiceRequest,
  removeServiceRequestsBatch,
  syncCustomerRequests,
  updateProposal,
  removeProposal,
  setActiveJob,
  clearActiveJob,
  setCurrentCustomerRequest,
  clearCurrentCustomerRequest,
  setVendorLocation,
  setServiceCompleted,
  clearCompletedService,
  setServiceCancelled,
  clearServiceCancelled,
  setVendorCancelledAndReset,
  clearVendorCancelledRequest,
  clearProposalsForRequest,
  updateVendorDistanceTracking,
  resetVendorDistanceTracking,
  setVendorStationary,
  setVendorReached1km,
  setVendorInactive20min,
  setPendingAction,
  setError,
  clearError,
  clearAllErrors,
  resetDispatchState,
  cleanupCompletedService,
  setCustomerActiveService,
  clearCustomerActiveServiceState,
} = dispatchSlice.actions;

// ============================================================================
// Selectors
// ============================================================================

// Base selectors (input selectors for createSelector)
const selectDispatchState = (state: RootState) => state.dispatch;
const selectServiceRequestsById = (state: RootState) => state.dispatch.serviceRequestsById;
const selectServiceRequestIds = (state: RootState) => state.dispatch.serviceRequestIds;
const selectProposalsById = (state: RootState) => state.dispatch.proposalsById;
const selectProposalIdsByRequest = (state: RootState) => state.dispatch.proposalIdsByRequest;
const selectCustomerRequestsById = (state: RootState) => state.dispatch.customerRequestsById;
const selectCustomerRequestIds = (state: RootState) => state.dispatch.customerRequestIds;

// Connection
export const selectConnectionStatus = (state: RootState) => state.dispatch.connectionStatus;
export const selectIsConnected = (state: RootState) => state.dispatch.connectionStatus === 'connected';

// Service Requests (Vendor) - Memoized with createSelector
export const selectServiceRequests = createSelector(
  [selectServiceRequestIds, selectServiceRequestsById],
  (ids, byId) => ids.map((id) => byId[id]).filter(Boolean)
);

export const selectServiceRequestById = (state: RootState, id: number) =>
  state.dispatch.serviceRequestsById[id];

export const selectServiceRequestCount = createSelector(
  [selectServiceRequestIds],
  (ids) => ids.length
);

// Proposals (Customer) - Properly memoized with createSelector factory
// Factory function creates a memoized selector for each requestId
// LRU cache with max size to prevent memory leaks on low-end devices
const MAX_SELECTOR_CACHE_SIZE = 100;
const proposalSelectorCache = new Map<number, ReturnType<typeof createProposalSelector>>();

function createProposalSelector(requestId: number) {
  return createSelector(
    [selectProposalIdsByRequest, selectProposalsById],
    (idsByRequest, byId) => {
      const proposalIds = idsByRequest[requestId] || [];
      return proposalIds.map((id) => byId[id]).filter((p): p is SocketProposal => Boolean(p));
    }
  );
}

export const selectProposalsByRequestId = (state: RootState, requestId: number): SocketProposal[] => {
  // Use cached selector or create new one
  let selector = proposalSelectorCache.get(requestId);
  if (!selector) {
    // Evict oldest entry if cache is full (simple LRU - Map maintains insertion order)
    if (proposalSelectorCache.size >= MAX_SELECTOR_CACHE_SIZE) {
      const oldestKey = proposalSelectorCache.keys().next().value;
      if (oldestKey !== undefined) {
        proposalSelectorCache.delete(oldestKey);
      }
    }
    selector = createProposalSelector(requestId);
    proposalSelectorCache.set(requestId, selector);
  }
  return selector(state);
};

// Clear selector cache (call when clearing large amounts of data)
export function clearProposalSelectorCache(): void {
  proposalSelectorCache.clear();
}

export const selectProposalById = (state: RootState, id: number) =>
  state.dispatch.proposalsById[id];

// Customer Requests - Memoized with createSelector
export const selectCustomerRequests = createSelector(
  [selectCustomerRequestIds, selectCustomerRequestsById],
  (ids, byId) => ids.map((id) => byId[id]).filter(Boolean)
);

export const selectCustomerRequestById = (state: RootState, id: number) =>
  state.dispatch.customerRequestsById[id];

// Active Job - Memoized with createSelector
export const selectActiveJob = createSelector(
  [selectDispatchState],
  (dispatch) => {
    if (!dispatch.activeJobId) return null;
    return dispatch.serviceRequestsById[dispatch.activeJobId] ||
      dispatch.customerRequestsById[dispatch.activeJobId];
  }
);

export const selectActiveProposal = createSelector(
  [selectDispatchState],
  (dispatch) => {
    if (!dispatch.activeProposalId) return null;
    return dispatch.proposalsById[dispatch.activeProposalId];
  }
);

// Vendor Location
export const selectVendorLocation = (state: RootState) => state.dispatch.vendorLocation;

// Current Customer Request (for tracking customer's active request)
export const selectCurrentCustomerRequestId = (state: RootState) => state.dispatch.currentCustomerRequestId;

// Service Completion (for customer review flow)
export const selectCompletedService = (state: RootState) => state.dispatch.completedService;

// Service Cancellation (for both customer and vendor notification)
export const selectCancelledService = (state: RootState) => state.dispatch.cancelledService;

// Vendor cancelled and request reset to pending (for customer UI toast)
export const selectVendorCancelledRequest = (state: RootState) => state.dispatch.vendorCancelledRequest;

// Vendor Distance Tracking (for customer cancel eligibility)
export const selectVendorDistanceTracking = (state: RootState) => state.dispatch.vendorDistanceTracking;

/**
 * Selector to determine if customer can cancel the service request
 * - Can cancel if vendor hasn't reached 1km yet
 * - Can cancel if vendor is stationary for 10+ mins after 1km
 */
export const selectCanCustomerCancel = (state: RootState): boolean => {
  const tracking = state.dispatch.vendorDistanceTracking;

  // Can cancel if vendor hasn't reached 1km threshold
  if (!tracking.hasReached1km) {
    return true;
  }

  // Can cancel if vendor is stationary for 10+ mins after reaching 1km
  if (tracking.isVendorStationary) {
    return true;
  }

  // Cannot cancel - vendor has covered 1km and is still moving
  return false;
};

/**
 * Selector to check if vendor has an active job that prevents logout
 * Active job = proposal sent/accepted OR service en_route/in_progress
 *
 * Returns:
 * - hasActiveJob: boolean - whether vendor has active job
 * - reason: string | null - human readable reason for restriction
 * - requestStatus: string | null - current status for debugging
 */
export const selectVendorHasActiveJob = (state: RootState): {
  hasActiveJob: boolean;
  reason: string | null;
  requestStatus: string | null;
} => {
  const { activeJobId, activeProposalId, serviceRequestsById } = state.dispatch;

  // No active job or proposal
  if (!activeJobId && !activeProposalId) {
    return { hasActiveJob: false, reason: null, requestStatus: null };
  }

  // Check the service request status
  const request = activeJobId ? serviceRequestsById[activeJobId] : null;

  if (request) {
    const status = request.status;
    const vendorStatus = request.vendor_status;

    // Case 1: Proposal sent, waiting for customer response
    if (request.already_sent && vendorStatus === 'pending') {
      return {
        hasActiveJob: true,
        reason: 'You have a pending proposal waiting for customer response',
        requestStatus: 'proposal_pending'
      };
    }

    // Case 2: Proposal accepted
    if (vendorStatus === 'accepted' || status === 'accepted') {
      return {
        hasActiveJob: true,
        reason: 'You have an accepted job. Please complete or cancel it first',
        requestStatus: 'accepted'
      };
    }

    // Case 3: En route to customer
    if (status === 'en_route') {
      return {
        hasActiveJob: true,
        reason: 'You are en route to customer. Please complete or cancel the job first',
        requestStatus: 'en_route'
      };
    }

    // Case 4: Service in progress
    if (status === 'in_progress') {
      return {
        hasActiveJob: true,
        reason: 'You have a service in progress. Please complete it first',
        requestStatus: 'in_progress'
      };
    }
  }

  // Has activeProposalId but request not in Redux (edge case)
  // This means proposal was sent but request details not loaded yet
  if (activeProposalId && !request) {
    return {
      hasActiveJob: true,
      reason: 'You have an active proposal. Please wait for it to expire or be processed',
      requestStatus: 'unknown'
    };
  }

  return { hasActiveJob: false, reason: null, requestStatus: null };
};

/**
 * Selector to check if customer has an active service that prevents logout
 * Block logout for BOTH 'pending' (request created) and 'accepted' (proposal accepted) statuses
 * Only 'expired' status allows logout
 *
 * Returns:
 * - hasActiveJob: boolean - whether customer has active service
 * - reason: string | null - human readable reason for restriction
 * - status: string | null - current status for debugging
 */
export const selectCustomerHasActiveJob = (state: RootState): {
  hasActiveJob: boolean;
  reason: string | null;
  status: string | null;
} => {
  const { customerActiveService } = state.dispatch;

  // No active service
  if (!customerActiveService.requestId || !customerActiveService.status) {
    return { hasActiveJob: false, reason: null, status: null };
  }

  // Block logout for 'pending' status (request created, waiting for proposals)
  if (customerActiveService.status === 'pending') {
    return {
      hasActiveJob: true,
      reason: 'You have an active service request. Please wait for it to expire or cancel it before logging out.',
      status: 'pending'
    };
  }

  // Block logout for 'accepted' status (proposal accepted, service in progress)
  if (customerActiveService.status === 'accepted') {
    return {
      hasActiveJob: true,
      reason: 'You have an active service in progress. Please complete or cancel it before logging out.',
      status: 'accepted'
    };
  }

  // 'expired' status or any other - allow logout
  return { hasActiveJob: false, reason: null, status: customerActiveService.status };
};

// UI State
export const selectIsPending = (state: RootState, key: string) =>
  !!state.dispatch.pendingActions[key];

export const selectError = (state: RootState, key: string) =>
  state.dispatch.errors[key];

export const selectAllErrors = (state: RootState) => state.dispatch.errors;

// ============================================================================
// Export
// ============================================================================

export default dispatchSlice.reducer;
