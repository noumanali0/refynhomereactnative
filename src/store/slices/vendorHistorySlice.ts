/**
 * Vendor History Redux Slice
 *
 * Manages vendor's job history state with API integration.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  vendorHistoryService,
  VendorHistoryJob,
  VendorHistoryFilters,
} from '@/services/vendorHistoryService';

// ============================================================================
// TYPES
// ============================================================================

type HistoryFilter = 'all' | 'completed' | 'cancelled';

interface VendorHistoryState {
  jobs: VendorHistoryJob[];
  selectedJob: VendorHistoryJob | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  filter: HistoryFilter;
  hasMore: boolean;
  page: number;
  stats: {
    totalCompleted: number;
    totalCancelled: number;
    totalEarnings: number;
    thisMonthCompleted: number;
  };
}

const initialState: VendorHistoryState = {
  jobs: [],
  selectedJob: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  filter: 'all',
  hasMore: true,
  page: 1,
  stats: {
    totalCompleted: 0,
    totalCancelled: 0,
    totalEarnings: 0,
    thisMonthCompleted: 0,
  },
};

// ============================================================================
// ASYNC THUNKS
// ============================================================================

/**
 * Fetch vendor job history
 */
export const fetchVendorHistory = createAsyncThunk(
  'vendorHistory/fetch',
  async (filters: VendorHistoryFilters | undefined, { rejectWithValue }) => {
    try {
      const response = await vendorHistoryService.getHistory(filters);
      return {
        jobs: response.results,
        hasMore: false, // Server returns all history, no pagination
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch history');
    }
  }
);

/**
 * Refresh vendor history (pull to refresh)
 */
export const refreshVendorHistory = createAsyncThunk(
  'vendorHistory/refresh',
  async (filter: HistoryFilter = 'all', { rejectWithValue }) => {
    try {
      const response = await vendorHistoryService.getHistory({
        page: 1,
        page_size: 50,
        status: filter === 'all' ? undefined : filter,
      });
      return {
        jobs: response.results,
        hasMore: false, // Server returns all history, no pagination
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to refresh history');
    }
  }
);

/**
 * Load more history (pagination)
 * Note: Server returns all history at once, so this just returns empty
 */
export const loadMoreVendorHistory = createAsyncThunk(
  'vendorHistory/loadMore',
  async ({ page, filter }: { page: number; filter: HistoryFilter }, { rejectWithValue }) => {
    try {
      const response = await vendorHistoryService.getHistory({
        page,
        page_size: 50,
        status: filter === 'all' ? undefined : filter,
      });
      return {
        jobs: response.results,
        hasMore: false, // Server returns all history, no pagination
        page,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load more');
    }
  }
);

/**
 * Fetch single job detail
 */
export const fetchVendorJobDetail = createAsyncThunk(
  'vendorHistory/fetchDetail',
  async (jobId: number, { rejectWithValue }) => {
    try {
      const job = await vendorHistoryService.getDetail(jobId);
      return job;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch job details');
    }
  }
);

// ============================================================================
// SLICE
// ============================================================================

const vendorHistorySlice = createSlice({
  name: 'vendorHistory',
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<HistoryFilter>) => {
      state.filter = action.payload;
      state.page = 1;
      state.hasMore = true;
    },
    clearSelectedJob: (state) => {
      state.selectedJob = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetHistory: (state) => {
      state.jobs = [];
      state.page = 1;
      state.hasMore = true;
    },
    updateStats: (state) => {
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const isCompleted = (status: string) => status === 'completed' || status === 'done';

      state.stats.totalCompleted = state.jobs.filter(j => isCompleted(j.status)).length;
      state.stats.totalCancelled = state.jobs.filter(j => j.status === 'cancelled').length;
      state.stats.totalEarnings = state.jobs
        .filter(j => isCompleted(j.status))
        .reduce((sum, j) => sum + (j.price_quote || 0), 0);
      state.stats.thisMonthCompleted = state.jobs.filter(j => {
        if (!isCompleted(j.status)) return false;
        const jobDate = new Date(j.completed_at || j.created_at);
        return jobDate.getMonth() === thisMonth && jobDate.getFullYear() === thisYear;
      }).length;
    },
  },
  extraReducers: (builder) => {
    // Fetch history
    builder
      .addCase(fetchVendorHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVendorHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = action.payload.jobs;
        state.hasMore = action.payload.hasMore;
        state.page = 1;
      })
      .addCase(fetchVendorHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Refresh history
    builder
      .addCase(refreshVendorHistory.pending, (state) => {
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase(refreshVendorHistory.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.jobs = action.payload.jobs;
        state.hasMore = action.payload.hasMore;
        state.page = 1;
      })
      .addCase(refreshVendorHistory.rejected, (state, action) => {
        state.isRefreshing = false;
        state.error = action.payload as string;
      });

    // Load more
    builder
      .addCase(loadMoreVendorHistory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadMoreVendorHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = [...state.jobs, ...action.payload.jobs];
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
      })
      .addCase(loadMoreVendorHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch detail
    builder
      .addCase(fetchVendorJobDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVendorJobDetail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedJob = action.payload;
        // Also update in the list if exists
        const index = state.jobs.findIndex(j => j.id === action.payload.id);
        if (index !== -1) {
          state.jobs[index] = action.payload;
        }
      })
      .addCase(fetchVendorJobDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// ============================================================================
// SELECTORS
// ============================================================================

export const selectVendorHistory = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.jobs;

export const selectFilteredVendorHistory = (state: { vendorHistory: VendorHistoryState }) => {
  const { jobs, filter } = state.vendorHistory;

  if (filter === 'all') return jobs;
  if (filter === 'completed') {
    // Include both 'completed' and 'done' statuses
    return jobs.filter(j => j.status === 'completed' || j.status === 'done');
  }
  return jobs.filter(j => j.status === filter);
};

export const selectVendorHistoryStats = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.stats;

export const selectSelectedJob = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.selectedJob;

export const selectVendorHistoryLoading = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.isLoading;

export const selectVendorHistoryRefreshing = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.isRefreshing;

export const selectVendorHistoryError = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.error;

export const selectVendorHistoryFilter = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.filter;

export const selectVendorHistoryHasMore = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.hasMore;

export const selectVendorHistoryPage = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.page;

// ============================================================================
// EXPORTS
// ============================================================================

export const { setFilter, clearSelectedJob, clearError, resetHistory, updateStats } =
  vendorHistorySlice.actions;

export default vendorHistorySlice.reducer;
