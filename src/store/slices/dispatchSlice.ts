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
import { flushLocationQueue } from '@/services/backgroundLocationService';
import { saveActiveJob, clearActiveJob as clearActiveJobStorage } from '@/services/activeJobService';
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
// Module-level state for socket listener cleanup
// ============================================================================

/**
 * Stores active unsubscriber functions for socket event listeners.
 * This prevents memory leaks by ensuring listeners are cleaned up
 * before new ones are created on reconnect.
 */
let activeUnsubscribers: Array<() => void> = [];

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

  // Service Completion Tracking
  completedService: {
    requestId: number;
    vendorId: number;
    vendorName: string;
  } | null;

  // UI State
  pendingActions: Record<string, boolean>;
  errors: Record<string, string>;
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

  // Service Completion
  completedService: null,

  // UI State
  pendingActions: {},
  errors: {},
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

        // Flush any queued location updates from background tracking
        // This handles the case when vendor's app was backgrounded and is now reconnecting
        try {
          await flushLocationQueue();
        } catch (error) {
          if (__DEV__) console.warn('[Dispatch] Failed to flush location queue:', error);
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

        dispatch(updateServiceRequest(request));
      })
    );

    // Service request expired
    activeUnsubscribers.push(
      socketService.on('service_request.expired', (data: ServiceRequestExpiredEvent) => {
        if (__DEV__) console.log('[Dispatch] service_request.expired:', data.request_id);
        dispatch(removeServiceRequest(data.request_id));

        // Remove notification for expired request
        removeServiceRequestNotification(data.request_id);
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

        // If proposal was accepted, set active job and persist it
        if (proposal.status === 'accepted') {
          dispatch(setActiveJob({
            requestId: proposal.service_request_id,
            proposalId: proposal.id,
          }));

          // Persist active job to SecureStore for app restart recovery
          saveActiveJob({
            jobId: proposal.service_request_id,
            proposalId: proposal.id,
          }).catch((error) => {
            if (__DEV__) console.error('[Dispatch] Failed to persist active job:', error);
          });
        }
      })
    );

    // Proposal acceptance timeout
    activeUnsubscribers.push(
      socketService.on('proposal.accept.timeout', (data: ProposalAcceptTimeoutEvent) => {
        if (__DEV__) console.log('[Dispatch] proposal.accept.timeout:', data.proposal?.id);
        dispatch(updateProposal({ ...data.proposal, status: 'expired' }));
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
    activeUnsubscribers.push(
      socketService.on('vendor.location.updated', (data: { payload?: Coordinates } & Partial<Coordinates>) => {
        const payload = data.payload || data;
        if (payload && payload.latitude && payload.longitude) {
          dispatch(setVendorLocation({
            latitude: payload.latitude,
            longitude: payload.longitude,
          }));
        }
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
 */
export const sendProposal = createAsyncThunk(
  'dispatch/sendProposal',
  async (params: SendProposalParams, { dispatch }) => {
    const { serviceRequestId, priceQuote, message, etaMinutes } = params;
    const pendingKey = `proposal_${serviceRequestId}`;

    dispatch(setPendingAction({ key: pendingKey, value: true }));

    try {
      socketService.send('proposal.create', {
        service_request_id: serviceRequestId,
        price_quote: priceQuote,
        message,
        eta_minutes: etaMinutes,
      });

      // Wait for acknowledgment with timeout
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          dispatch(setPendingAction({ key: pendingKey, value: false }));
          reject(new Error('Proposal timeout'));
        }, ACK_TIMEOUT);

        const unsub = socketService.on('proposal.ack', (data: any) => {
          if (data.service_request_id === serviceRequestId) {
            clearTimeout(timeout);
            unsub();
            dispatch(setPendingAction({ key: pendingKey, value: false }));
            resolve(data);
          }
        });

        // Also listen for errors
        const unsubError = socketService.on('error', (data: SocketErrorEvent) => {
          if (data.code === 'proposal_failed') {
            clearTimeout(timeout);
            unsub();
            unsubError();
            dispatch(setPendingAction({ key: pendingKey, value: false }));
            reject(new Error(data.message));
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
 * Customer: Accept a proposal
 */
export const acceptProposal = createAsyncThunk(
  'dispatch/acceptProposal',
  async (proposalId: number, { dispatch }) => {
    const pendingKey = `accept_${proposalId}`;

    dispatch(setPendingAction({ key: pendingKey, value: true }));

    try {
      socketService.send('proposal.accept', { proposal_id: proposalId });

      // Wait for acknowledgment
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          dispatch(setPendingAction({ key: pendingKey, value: false }));
          reject(new Error('Accept timeout'));
        }, ACK_TIMEOUT);

        const unsub = socketService.on('proposal.accepted.ack', (data: any) => {
          if (data.proposal_id === proposalId) {
            clearTimeout(timeout);
            unsub();
            dispatch(setPendingAction({ key: pendingKey, value: false }));
            resolve(data);
          }
        });

        const unsubError = socketService.on('error', (data: SocketErrorEvent) => {
          if (data.code === 'proposal_expired' || data.code === 'accept_failed') {
            clearTimeout(timeout);
            unsub();
            unsubError();
            dispatch(setPendingAction({ key: pendingKey, value: false }));
            reject(new Error(data.message));
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
 * Customer: Decline a proposal
 */
export const declineProposal = createAsyncThunk(
  'dispatch/declineProposal',
  async (proposalId: number, { dispatch }) => {
    const pendingKey = `decline_${proposalId}`;

    dispatch(setPendingAction({ key: pendingKey, value: true }));

    try {
      socketService.send('proposal.decline', { proposal_id: proposalId });

      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          dispatch(setPendingAction({ key: pendingKey, value: false }));
          reject(new Error('Decline timeout'));
        }, ACK_TIMEOUT);

        const unsub = socketService.on('proposal.declined.ack', (data: any) => {
          if (data.proposal_id === proposalId) {
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
  syncCustomerRequests,
  updateProposal,
  removeProposal,
  setActiveJob,
  clearActiveJob,
  setVendorLocation,
  setServiceCompleted,
  clearCompletedService,
  setPendingAction,
  setError,
  clearError,
  clearAllErrors,
  resetDispatchState,
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
    selector = createProposalSelector(requestId);
    proposalSelectorCache.set(requestId, selector);
  }
  return selector(state);
};

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

// Service Completion (for customer review flow)
export const selectCompletedService = (state: RootState) => state.dispatch.completedService;

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
