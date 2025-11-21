// src/store/slices/requestsSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { AppThunk } from '@/store';
import type { LiveRequest, Coordinates, ActiveRequestDetail, ProposalStatus } from '@/services/types';
import { LiveRequestsGenerator } from '@/services/liveRequestsServices';
import { haversineDistanceKm } from '@/utils/geo';

export interface RequestState {
    requests: LiveRequest[]; // active requests (already filtered)
    isOnline: boolean;
    radiusKm: number;
    isReceiving: boolean;
    vendorLocation?: Coordinates | null;
    vendorServices: string[]; // list of service ids/labels vendor supports
    activeRequestDetails: Record<string, ActiveRequestDetail>; // key: requestId
}

const initialState: RequestState = {
    requests: [],
    isOnline: true,
    radiusKm: 5,
    isReceiving: false,
    vendorLocation: null,
    vendorServices: [],
    activeRequestDetails: {},
};

// Thunk to send proposal
export const sendProposal = createAsyncThunk(
    'requests/sendProposal',
    async ({ requestId, proposalAmount }: { requestId: string; proposalAmount: number }, { dispatch }) => {
        // In production, this would call your API/socket
        dispatch(requestsSlice.actions.setProposalSending({ requestId }));

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        const expiresAt = Date.now() + 20000; // 20 seconds
        dispatch(requestsSlice.actions.setProposalSent({
            requestId,
            proposalAmount,
            expiresAt
        }));

        // Mock: simulate customer acceptance after 5-15 seconds (for demo purposes)
        const acceptDelay = Math.random() * 10000 + 5000;
        setTimeout(() => {
            // Only accept if proposal hasn't expired
            if (Date.now() < expiresAt) {
                dispatch(requestsSlice.actions.mockCustomerAcceptance({
                    requestId,
                    customerPhone: '+92 300 1234567' // Mock phone number
                }));
            }
        }, acceptDelay);

        return { requestId, proposalAmount, expiresAt };
    }
);



// start receiving: subscribes to generator (or sockets later)
export const startReceivingRequests = createAsyncThunk<void, void, { state: { requests: RequestState } }>(
    'requests/startReceiving',
    async (_, { getState, dispatch }) => {
        const s = getState().requests;
        if (!s.isReceiving) {
            LiveRequestsGenerator.start();
            LiveRequestsGenerator.subscribe((req) => {
                // dispatch addRequest action — reducer will filter by radius & services
                dispatch(addRequest(req));
            });
            dispatch(setReceiving(true));
        }
    }
);

export const stopReceivingRequests = createAsyncThunk<void, void, { state: { requests: RequestState } }>(
    'requests/stopReceiving',
    async (_, { dispatch }) => {
        LiveRequestsGenerator.unsubscribeAll();
        LiveRequestsGenerator.stop();
        dispatch(setReceiving(false));
    }
);

const requestsSlice = createSlice({
    name: 'requests',
    initialState,
    reducers: {
        setOnline(state, action: PayloadAction<boolean>) {
            state.isOnline = action.payload;
        },
        setRadius(state, action: PayloadAction<number>) {
            state.radiusKm = action.payload;
        },
        setReceiving(state, action: PayloadAction<boolean>) {
            state.isReceiving = action.payload;
        },
        setVendorContext(state, action: PayloadAction<{ location?: Coordinates | null; services?: string[] }>) {
            if (action.payload.location !== undefined) state.vendorLocation = action.payload.location;
            if (action.payload.services !== undefined) state.vendorServices = action.payload.services.map(s => s.toLowerCase());
        },
        addRequest(state, action: PayloadAction<LiveRequest>) {
            const req = action.payload;
            if (req.expiresAt <= Date.now()) return;

            if (state.vendorLocation) {
                const distKm = haversineDistanceKm(
                    state.vendorLocation.latitude,
                    state.vendorLocation.longitude,
                    req.coordinates.latitude,
                    req.coordinates.longitude
                );
                if (distKm > state.radiusKm) return;
            }

            if (state.vendorServices && state.vendorServices.length > 0) {
                const svc = (req.serviceType || '').toLowerCase();
                const matches = state.vendorServices.some(vs => vs === svc || vs === svc.replace(/\s+/g, '_'));
                if (!matches) return;
            }

            if (state.requests.some(r => r.id === req.id)) return;
            state.requests.unshift(req);

            const MAX_KEEP = 500;
            if (state.requests.length > MAX_KEEP) {
                state.requests.splice(MAX_KEEP);
            }
        },
        removeRequestById(state, action: PayloadAction<string>) {
            state.requests = state.requests.filter((r) => r.id !== action.payload);
            delete state.activeRequestDetails[action.payload];
        },
        removeExpired(state) {
            const now = Date.now();
            state.requests = state.requests.filter((r) => r.expiresAt > now);

            // Also clean up expired proposals
            Object.keys(state.activeRequestDetails).forEach(requestId => {
                const detail = state.activeRequestDetails[requestId];
                if (detail.proposalExpiresAt && detail.proposalExpiresAt < now && !detail.customerAccepted) {
                    detail.proposalStatus = 'expired';
                }
            });
        },
        clearRequests(state) {
            state.requests = [];
            state.activeRequestDetails = {};
        },
        // Proposal management
        setProposalSending(state, action: PayloadAction<{ requestId: string }>) {
            const { requestId } = action.payload;
            if (!state.activeRequestDetails[requestId]) {
                state.activeRequestDetails[requestId] = {
                    requestId,
                    proposalAmount: null,
                    proposalStatus: 'sending',
                    proposalExpiresAt: null,
                    customerAccepted: false,
                    customerPhone: null,
                    vendorArrived: false,
                };
            } else {
                state.activeRequestDetails[requestId].proposalStatus = 'sending';
            }
        },
        setProposalSent(state, action: PayloadAction<{ requestId: string; proposalAmount: number; expiresAt: number }>) {
            const { requestId, proposalAmount, expiresAt } = action.payload;
            state.activeRequestDetails[requestId] = {
                ...state.activeRequestDetails[requestId],
                requestId,
                proposalAmount,
                proposalStatus: 'sent',
                proposalExpiresAt: expiresAt,
                customerAccepted: false,
                customerPhone: null,
                vendorArrived: false,
            };
        },
        mockCustomerAcceptance(state, action: PayloadAction<{ requestId: string; customerPhone: string }>) {
            const { requestId, customerPhone } = action.payload;
            if (state.activeRequestDetails[requestId]) {
                state.activeRequestDetails[requestId].proposalStatus = 'accepted';
                state.activeRequestDetails[requestId].customerAccepted = true;
                state.activeRequestDetails[requestId].customerPhone = customerPhone;
            }
        },
        setVendorArrived(state, action: PayloadAction<{ requestId: string }>) {
            const { requestId } = action.payload;
            if (state.activeRequestDetails[requestId]) {
                state.activeRequestDetails[requestId].vendorArrived = true;
            }
        },
        resetProposal(state, action: PayloadAction<{ requestId: string }>) {
            const { requestId } = action.payload;
            delete state.activeRequestDetails[requestId];
        },
    },
});

export const {
    setOnline,
    setRadius,
    setReceiving,
    setVendorContext,
    addRequest,
    removeRequestById,
    removeExpired,
    clearRequests,
    setProposalSending,
    setProposalSent,
    mockCustomerAcceptance,
    setVendorArrived,
    resetProposal,
} = requestsSlice.actions;

export default requestsSlice.reducer;

// ===== prune loop (always running) =====
let pruneInterval: NodeJS.Timeout | null = null;

export const startPruneLoop = (): AppThunk => (dispatch) => {
    if (pruneInterval) return;
    pruneInterval = setInterval(() => {
        dispatch(removeExpired());
    }, 1000);
};

export const stopPruneLoop = (): AppThunk => () => {
    if (pruneInterval) {
        clearInterval(pruneInterval);
        pruneInterval = null;
    }
};

// // src/store/slices/requestsSlice.ts
// import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

// // import { AppThunk, RootState } from '@/store'; // adjust import to your store
// // import { LiveRequestsGenerator, LiveRequest } from '@/services/liveRequestsService';
// import { AppThunk, RootState } from '..';
// import { LiveRequest, LiveRequestsGenerator } from '@/services/liveRequestsServices';

// export interface RequestState {
//     requests: LiveRequest[]; // active requests
//     isOnline: boolean;
//     radiusKm: number;
//     isReceiving: boolean;
// }

// const initialState: RequestState = {
//     requests: [],
//     isOnline: true,
//     radiusKm: 5,
//     isReceiving: false,
// };

// // Thunk to start/stop generator (uses service that abstracts sockets)
// export const startReceivingRequests = createAsyncThunk<void, void, { state: RootState }>(
//     'requests/startReceiving',
//     async (_, { getState, dispatch }) => {
//         const state = getState().requests;
//         if (!state.isReceiving) {
//             LiveRequestsGenerator.start();
//             LiveRequestsGenerator.subscribe((req) => {
//                 // add request to store
//                 dispatch(addRequest(req));
//             });
//         }
//     }
// );

// export const stopReceivingRequests = createAsyncThunk<void, void, { state: RootState }>(
//     'requests/stopReceiving',
//     async (_, { getState, dispatch }) => {
//         LiveRequestsGenerator.unsubscribeAll();
//         LiveRequestsGenerator.stop();
//     }
// );

// const requestsSlice = createSlice({
//     name: 'requests',
//     initialState,
//     reducers: {
//         setOnline(state, action: PayloadAction<boolean>) {
//             state.isOnline = action.payload;
//         },
//         setRadius(state, action: PayloadAction<number>) {
//             state.radiusKm = action.payload;
//         },
//         setReceiving(state, action: PayloadAction<boolean>) {
//             state.isReceiving = action.payload;
//         },
//         addRequest(state, action: PayloadAction<LiveRequest>) {
//             // keep newest on top; prevent duplicates
//             const existing = state.requests.find((r) => r.id === action.payload.id);
//             if (!existing) {
//                 state.requests.unshift(action.payload);
//             }
//         },
//         removeRequestById(state, action: PayloadAction<string>) {
//             state.requests = state.requests.filter((r) => r.id !== action.payload);
//         },
//         removeExpired(state) {
//             const now = Date.now();
//             state.requests = state.requests.filter((r) => r.expiresAt > now);
//         },
//         acceptRequest(state, action: PayloadAction<string>) {
//             // mark accepted — for now remove from list (you can move to accepted slice)
//             state.requests = state.requests.filter((r) => r.id !== action.payload);
//         },
//         clearRequests(state) {
//             state.requests = [];
//         },
//     },
// });

// export const {
//     setOnline,
//     setRadius,
//     setReceiving,
//     addRequest,
//     removeRequestById,
//     removeExpired,
//     acceptRequest,
//     clearRequests,
// } = requestsSlice.actions;

// export default requestsSlice.reducer;

// // ===== helpers / background prune loop (thunk) =====
// let pruneInterval: NodeJS.Timeout | null = null;

// export const startPruneLoop = (): AppThunk => (dispatch, getState) => {
//     if (pruneInterval) return;
//     pruneInterval = setInterval(() => {
//         dispatch(removeExpired());
//     }, 1000); // every 1s prune expired offers
// };

// export const stopPruneLoop = (): AppThunk => () => {
//     if (pruneInterval) {
//         clearInterval(pruneInterval);
//         pruneInterval = null;
//     }
// };
