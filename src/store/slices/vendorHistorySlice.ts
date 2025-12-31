/**
 * Vendor History Redux Slice
 *
 * Manages vendor's job history state with API integration.
 */

import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
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
  isLoadingMore: boolean;
  isRefreshing: boolean;
  error: string | null;
  filter: HistoryFilter;
  hasMore: boolean;
  page: number;
  totalCount: number;
  totalPages: number;
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
  isLoadingMore: false,
  isRefreshing: false,
  error: null,
  filter: 'all',
  hasMore: false,
  page: 1,
  totalCount: 0,
  totalPages: 1,
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
 * Fetch vendor job history (initial load - page 1)
 */
export const fetchVendorHistory = createAsyncThunk(
  'vendorHistory/fetch',
  async (filters: VendorHistoryFilters | undefined, { rejectWithValue }) => {
    try {
      const response = await vendorHistoryService.getHistory({
        page: 1,
        page_size: 10,
        status: filters?.status,
      });
      return {
        jobs: response.results,
        hasMore: response.has_more,
        page: response.page,
        totalCount: response.count,
        totalPages: response.total_pages,
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
        page_size: 10,
        status: filter === 'all' ? undefined : filter,
      });
      return {
        jobs: response.results,
        hasMore: response.has_more,
        page: response.page,
        totalCount: response.count,
        totalPages: response.total_pages,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to refresh history');
    }
  }
);

/**
 * Load more history (pagination - next page)
 */
export const loadMoreVendorHistory = createAsyncThunk(
  'vendorHistory/loadMore',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { vendorHistory: VendorHistoryState };
      const nextPage = state.vendorHistory.page + 1;

      // Don't load if no more pages
      if (!state.vendorHistory.hasMore) {
        return null;
      }

      const response = await vendorHistoryService.getHistory({
        page: nextPage,
        page_size: 10,
        status: state.vendorHistory.filter === 'all' ? undefined : state.vendorHistory.filter,
      });
      return {
        jobs: response.results,
        hasMore: response.has_more,
        page: response.page,
        totalCount: response.count,
        totalPages: response.total_pages,
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
    // Fetch history (initial load)
    builder
      .addCase(fetchVendorHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVendorHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = action.payload.jobs;
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
        state.totalCount = action.payload.totalCount;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchVendorHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Refresh history (pull to refresh)
    builder
      .addCase(refreshVendorHistory.pending, (state) => {
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase(refreshVendorHistory.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.jobs = action.payload.jobs;
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
        state.totalCount = action.payload.totalCount;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(refreshVendorHistory.rejected, (state, action) => {
        state.isRefreshing = false;
        state.error = action.payload as string;
      });

    // Load more (next page)
    builder
      .addCase(loadMoreVendorHistory.pending, (state) => {
        state.isLoadingMore = true;
        state.error = null;
      })
      .addCase(loadMoreVendorHistory.fulfilled, (state, action) => {
        state.isLoadingMore = false;
        if (action.payload) {
          // Append new jobs, avoiding duplicates
          const existingIds = new Set(state.jobs.map(j => j.id));
          const newJobs = action.payload.jobs.filter(j => !existingIds.has(j.id));
          state.jobs = [...state.jobs, ...newJobs];
          state.hasMore = action.payload.hasMore;
          state.page = action.payload.page;
          state.totalCount = action.payload.totalCount;
          state.totalPages = action.payload.totalPages;
        }
      })
      .addCase(loadMoreVendorHistory.rejected, (state, action) => {
        state.isLoadingMore = false;
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

// Base selectors
export const selectVendorHistory = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.jobs;

export const selectVendorHistoryFilter = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.filter;

// Memoized selector for filtered history - prevents unnecessary recalculations
export const selectFilteredVendorHistory = createSelector(
  [selectVendorHistory, selectVendorHistoryFilter],
  (jobs, filter) => {
    if (filter === 'all') return jobs;
    if (filter === 'completed') {
      // Include both 'completed' and 'done' statuses
      return jobs.filter(j => j.status === 'completed' || j.status === 'done');
    }
    return jobs.filter(j => j.status === filter);
  }
);

export const selectVendorHistoryStats = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.stats;

export const selectSelectedJob = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.selectedJob;

export const selectVendorHistoryLoading = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.isLoading;

export const selectVendorHistoryLoadingMore = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.isLoadingMore;

export const selectVendorHistoryRefreshing = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.isRefreshing;

export const selectVendorHistoryError = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.error;

export const selectVendorHistoryHasMore = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.hasMore;

export const selectVendorHistoryPage = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.page;

export const selectVendorHistoryTotalCount = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.totalCount;

export const selectVendorHistoryTotalPages = (state: { vendorHistory: VendorHistoryState }) =>
  state.vendorHistory.totalPages;

// ============================================================================
// EXPORTS
// ============================================================================

export const { setFilter, clearSelectedJob, clearError, resetHistory, updateStats } =
  vendorHistorySlice.actions;

export default vendorHistorySlice.reducer;
