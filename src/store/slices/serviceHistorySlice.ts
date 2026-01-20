/**
 * Service History Redux Slice
 *
 * Manages customer's service request history state with API integration.
 */

import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
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
  isLoadingMore: boolean;  // Separate loading state for load more
  isRefreshing: boolean;
  error: string | null;
  filter: HistoryFilter;
  hasMore: boolean;
  page: number;
  totalCount: number;      // Total records in database
  totalPages: number;      // Total pages available
}

const initialState: ServiceHistoryState = {
  requests: [],
  selectedRequest: null,
  isLoading: false,
  isLoadingMore: false,
  isRefreshing: false,
  error: null,
  filter: 'all',
  hasMore: true,
  page: 1,
  totalCount: 0,
  totalPages: 0,
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
        totalCount: response.count,
        totalPages: response.total_pages || Math.ceil(response.count / 10),
        page: response.page || 1,
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
      const response = await serviceHistoryService.getHistory({ page: 1, page_size: 10 });
      return {
        requests: response.results,
        hasMore: response.next !== null,
        totalCount: response.count,
        totalPages: response.total_pages || Math.ceil(response.count / 10),
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
      const response = await serviceHistoryService.getHistory({ page, page_size: 10 });
      return {
        requests: response.results,
        hasMore: response.next !== null,
        totalCount: response.count,
        totalPages: response.total_pages || Math.ceil(response.count / 10),
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
      state.totalCount = 0;
      state.totalPages = 0;
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
        state.totalCount = action.payload.totalCount;
        state.totalPages = action.payload.totalPages;
        state.page = action.payload.page;
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
        state.totalCount = action.payload.totalCount;
        state.totalPages = action.payload.totalPages;
        state.page = 1;
      })
      .addCase(refreshServiceHistory.rejected, (state, action) => {
        state.isRefreshing = false;
        state.error = action.payload as string;
      });

    // Load more
    builder
      .addCase(loadMoreHistory.pending, (state) => {
        state.isLoadingMore = true;  // Use separate loading state
      })
      .addCase(loadMoreHistory.fulfilled, (state, action) => {
        state.isLoadingMore = false;
        state.requests = [...state.requests, ...action.payload.requests];
        state.hasMore = action.payload.hasMore;
        state.totalCount = action.payload.totalCount;
        state.totalPages = action.payload.totalPages;
        state.page = action.payload.page;
      })
      .addCase(loadMoreHistory.rejected, (state, action) => {
        state.isLoadingMore = false;
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

// Base selectors
export const selectServiceHistory = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.requests;

export const selectCurrentFilter = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.filter;

export const selectTotalCount = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.totalCount;

// Memoized selector for filtered history - prevents unnecessary recalculations
export const selectFilteredHistory = createSelector(
  [selectServiceHistory, selectCurrentFilter],
  (requests, filter) => {
    if (filter === 'all') return requests;

    if (filter === 'active') {
      return requests.filter(r =>
        ['pending', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(r.status)
      );
    }

    if (filter === 'completed') {
      return requests.filter(r => r.status === 'completed');
    }

    if (filter === 'cancelled') {
      return requests.filter(r => ['cancelled', 'expired'].includes(r.status));
    }

    return requests;
  }
);

export const selectHistoryStats = createSelector(
  [selectServiceHistory, selectTotalCount],
  (requests, totalCount) => {
    // Calculate this month's completed services
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthCompleted = requests.filter(r => {
      if (r.status !== 'completed') return false;
      const completedDate = r.completed_at ? new Date(r.completed_at) : new Date(r.updated_at);
      return completedDate >= startOfMonth;
    }).length;

    const activeCount = requests.filter(r =>
      ['pending', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(r.status)
    ).length;
    const completedCount = requests.filter(r => r.status === 'completed').length;

    return {
      total: totalCount || requests.length,  // Use DB total count, fallback to fetched records
      // New field names expected by UI
      totalActive: activeCount,
      totalCompleted: completedCount,
      thisMonth: thisMonthCompleted,
      // Keep old field names for backward compatibility
      active: activeCount,
      completed: completedCount,
      cancelled: requests.filter(r => ['cancelled', 'expired'].includes(r.status)).length,
    };
  }
);

export const selectSelectedRequest = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.selectedRequest;

export const selectIsLoading = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.isLoading;

export const selectIsRefreshing = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.isRefreshing;

export const selectHistoryError = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.error;

export const selectHasMore = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.hasMore;

export const selectCurrentPage = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.page;

export const selectTotalPages = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.totalPages;

export const selectIsLoadingMore = (state: { serviceHistory: ServiceHistoryState }) =>
  state.serviceHistory.isLoadingMore;

// ============================================================================
// EXPORTS
// ============================================================================

export const { setFilter, clearSelectedRequest, clearError, resetHistory } =
  serviceHistorySlice.actions;

export default serviceHistorySlice.reducer;
