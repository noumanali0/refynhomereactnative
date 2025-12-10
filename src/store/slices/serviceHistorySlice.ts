/**
 * Service History Redux Slice
 *
 * Manages customer's service request history state with API integration.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  serviceHistoryService,
  ServiceHistoryRequest,
  ServiceHistoryFilters,
} from '@/services/serviceHistoryService';

// ============================================================================
// TYPES
// ============================================================================

type HistoryFilter = 'all' | 'active' | 'completed' | 'cancelled';

interface ServiceHistoryState {
  requests: ServiceHistoryRequest[];
  selectedRequest: ServiceHistoryRequest | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  filter: HistoryFilter;
  hasMore: boolean;
  page: number;
}

const initialState: ServiceHistoryState = {
  requests: [],
  selectedRequest: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  filter: 'all',
  hasMore: true,
  page: 1,
};

// ============================================================================
// ASYNC THUNKS
// ============================================================================

/**
 * Fetch service request history
 */
export const fetchServiceHistory = createAsyncThunk(
  'serviceHistory/fetch',
  async (filters: ServiceHistoryFilters | undefined, { rejectWithValue }) => {
    try {
      const response = await serviceHistoryService.getHistory(filters);
      return {
        requests: response.results,
        hasMore: response.next !== null,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch history');
    }
  }
);

/**
 * Refresh service request history (pull to refresh)
 */
export const refreshServiceHistory = createAsyncThunk(
  'serviceHistory/refresh',
  async (_, { rejectWithValue }) => {
    try {
      const response = await serviceHistoryService.getHistory({ page: 1, page_size: 20 });
      return {
        requests: response.results,
        hasMore: response.next !== null,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to refresh history');
    }
  }
);

/**
 * Load more service requests (pagination)
 */
export const loadMoreHistory = createAsyncThunk(
  'serviceHistory/loadMore',
  async (page: number, { rejectWithValue }) => {
    try {
      const response = await serviceHistoryService.getHistory({ page, page_size: 20 });
      return {
        requests: response.results,
        hasMore: response.next !== null,
        page,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load more');
    }
  }
);

/**
 * Fetch single service request details
 */
export const fetchServiceDetail = createAsyncThunk(
  'serviceHistory/fetchDetail',
  async (requestId: number, { rejectWithValue }) => {
    try {
      const request = await serviceHistoryService.getDetail(requestId);
      return request;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch details');
    }
  }
);

// ============================================================================
// SLICE
// ============================================================================

const serviceHistorySlice = createSlice({
  name: 'serviceHistory',
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<HistoryFilter>) => {
      state.filter = action.payload;
    },
    clearSelectedRequest: (state) => {
      state.selectedRequest = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetHistory: (state) => {
      state.requests = [];
      state.page = 1;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    // Fetch history
    builder
      .addCase(fetchServiceHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchServiceHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.requests = action.payload.requests;
        state.hasMore = action.payload.hasMore;
        state.page = 1;
      })
      .addCase(fetchServiceHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Refresh history
    builder
      .addCase(refreshServiceHistory.pending, (state) => {
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase(refreshServiceHistory.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.requests = action.payload.requests;
        state.hasMore = action.payload.hasMore;
        state.page = 1;
      })
      .addCase(refreshServiceHistory.rejected, (state, action) => {
        state.isRefreshing = false;
        state.error = action.payload as string;
      });

    // Load more
    builder
      .addCase(loadMoreHistory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadMoreHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.requests = [...state.requests, ...action.payload.requests];
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
      })
      .addCase(loadMoreHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch detail
    builder
      .addCase(fetchServiceDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchServiceDetail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedRequest = action.payload;
        // Also update in the list if exists
        const index = state.requests.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.requests[index] = action.payload;
        }
      })
      .addCase(fetchServiceDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// ============================================================================
// SELECTORS
// ============================================================================

export const selectServiceHistory = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.requests;

export const selectFilteredHistory = (state: { serviceHistory: ServiceHistoryState }) => {
  const { requests, filter } = state.serviceHistory;

  if (filter === 'all') return requests;

  if (filter === 'active') {
    return requests.filter(r =>
      ['pending', 'accepted', 'en_route', 'in_progress'].includes(r.status)
    );
  }

  if (filter === 'completed') {
    return requests.filter(r => r.status === 'completed');
  }

  if (filter === 'cancelled') {
    return requests.filter(r => ['cancelled', 'expired'].includes(r.status));
  }

  return requests;
};

export const selectHistoryStats = (state: { serviceHistory: ServiceHistoryState }) => {
  const { requests } = state.serviceHistory;

  // Calculate this month's completed services
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthCompleted = requests.filter(r => {
    if (r.status !== 'completed') return false;
    const completedDate = r.completed_at ? new Date(r.completed_at) : new Date(r.updated_at);
    return completedDate >= startOfMonth;
  }).length;

  const activeCount = requests.filter(r =>
    ['pending', 'accepted', 'en_route', 'in_progress'].includes(r.status)
  ).length;
  const completedCount = requests.filter(r => r.status === 'completed').length;

  return {
    total: requests.length,
    // New field names expected by UI
    totalActive: activeCount,
    totalCompleted: completedCount,
    thisMonth: thisMonthCompleted,
    // Keep old field names for backward compatibility
    active: activeCount,
    completed: completedCount,
    cancelled: requests.filter(r => ['cancelled', 'expired'].includes(r.status)).length,
  };
};

export const selectSelectedRequest = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.selectedRequest;

export const selectIsLoading = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.isLoading;

export const selectIsRefreshing = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.isRefreshing;

export const selectHistoryError = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.error;

export const selectCurrentFilter = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.filter;

export const selectHasMore = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.hasMore;

export const selectCurrentPage = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.page;

// ============================================================================
// EXPORTS
// ============================================================================

export const { setFilter, clearSelectedRequest, clearError, resetHistory } =
  serviceHistorySlice.actions;

export default serviceHistorySlice.reducer;
