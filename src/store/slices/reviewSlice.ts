// src/store/slices/reviewSlice.ts
/**
 * Review Slice
 *
 * Manages review submission state for completed service requests.
 * Also manages fetching vendor reviews list.
 * Integrates with the backend review API.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    reviewApi,
    CreateReviewParams,
    ReviewResponse,
    GetVendorReviewsParams,
    VendorReviewsResponse,
    VendorReview,
} from '@/services/reviewApi';
import type { RootState } from '@/store';

// ============================================================================
// State Interface
// ============================================================================

interface ReviewState {
    /** Whether a review is currently being submitted */
    isSubmitting: boolean;
    /** Error message from submission failure */
    submitError: string | null;
    /** Whether review was successfully submitted */
    submitted: boolean;
    /** Last submitted review data */
    lastReview: ReviewResponse['review'] | null;
    /** Vendor reviews list */
    vendorReviews: VendorReview[];
    /** Whether vendor reviews are loading */
    isLoadingVendorReviews: boolean;
    /** Whether loading more reviews */
    isLoadingMoreReviews: boolean;
    /** Error message from fetching vendor reviews */
    vendorReviewsError: string | null;
    /** Total count of vendor reviews (filtered) */
    vendorReviewsCount: number;
    /** Star rating distribution (filtered) */
    vendorReviewsDistribution: Record<string, number>;
    /** Average rating (filtered) */
    vendorAverageRating: number;
    /** ORIGINAL total count (never changes with filter) */
    originalTotalCount: number;
    /** ORIGINAL distribution (never changes with filter) */
    originalDistribution: Record<string, number>;
    /** ORIGINAL average rating (never changes with filter) */
    originalAverageRating: number;
    /** Whether original stats have been loaded */
    originalStatsLoaded: boolean;
    /** Current page for pagination */
    vendorReviewsPage: number;
    /** Total pages for pagination */
    vendorReviewsTotalPages: number;
    /** Whether there are more reviews to load */
    vendorReviewsHasMore: boolean;
    /** Current vendor ID for reviews */
    currentVendorId: number | null;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: ReviewState = {
    isSubmitting: false,
    submitError: null,
    submitted: false,
    lastReview: null,
    vendorReviews: [],
    isLoadingVendorReviews: false,
    isLoadingMoreReviews: false,
    vendorReviewsError: null,
    vendorReviewsCount: 0,
    vendorReviewsDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    vendorAverageRating: 0,
    originalTotalCount: 0,
    originalDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    originalAverageRating: 0,
    originalStatsLoaded: false,
    vendorReviewsPage: 1,
    vendorReviewsTotalPages: 1,
    vendorReviewsHasMore: false,
    currentVendorId: null,
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Submit a review for a completed service request
 *
 * @param params - Review parameters (serviceRequestId, stars, feedback)
 * @returns ReviewResponse on success
 *
 * @example
 * ```typescript
 * const result = await dispatch(submitReview({
 *   serviceRequestId: 123,
 *   stars: 5,
 *   feedback: 'Great service!'
 * })).unwrap();
 * ```
 */
export const submitReview = createAsyncThunk<
    ReviewResponse,
    CreateReviewParams,
    { rejectValue: string }
>(
    'review/submit',
    async (params, { rejectWithValue }) => {
        try {
            const response = await reviewApi.submitReview(params);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to submit review');
        }
    }
);

/**
 * Fetch vendor reviews with pagination (initial load - page 1)
 *
 * @param params - Query parameters (vendorId, stars?, sort?)
 * @returns VendorReviewsResponse on success
 *
 * @example
 * ```typescript
 * const result = await dispatch(fetchVendorReviews({
 *   vendorId: 123,
 *   stars: 5,
 *   sort: 'latest'
 * })).unwrap();
 * ```
 */
export const fetchVendorReviews = createAsyncThunk<
    VendorReviewsResponse & { vendorId: number; isFiltered: boolean },
    GetVendorReviewsParams,
    { rejectValue: string }
>(
    'review/fetchVendorReviews',
    async (params, { rejectWithValue }) => {
        try {
            const response = await reviewApi.getVendorReviews({
                ...params,
                page: 1,
                page_size: 10,
            });
            // Track whether this is a filtered request
            const isFiltered = params.stars !== undefined;
            return { ...response, vendorId: params.vendorId, isFiltered };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch reviews');
        }
    }
);

/**
 * Load more vendor reviews (pagination - next page)
 */
export const loadMoreVendorReviews = createAsyncThunk<
    VendorReviewsResponse | null,
    { vendorId: number; stars?: number; sort?: 'latest' | 'highest' | 'lowest' },
    { state: { review: ReviewState }; rejectValue: string }
>(
    'review/loadMoreVendorReviews',
    async (params, { getState, rejectWithValue }) => {
        try {
            const state = getState().review;
            const nextPage = state.vendorReviewsPage + 1;

            // Don't load if no more pages
            if (!state.vendorReviewsHasMore) {
                return null;
            }

            const response = await reviewApi.getVendorReviews({
                vendorId: params.vendorId,
                stars: params.stars,
                sort: params.sort,
                page: nextPage,
                page_size: 10,
            });
            return response;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to load more reviews');
        }
    }
);

/**
 * Refresh vendor reviews (pull to refresh)
 */
export const refreshVendorReviews = createAsyncThunk<
    VendorReviewsResponse & { vendorId: number },
    GetVendorReviewsParams,
    { rejectValue: string }
>(
    'review/refreshVendorReviews',
    async (params, { rejectWithValue }) => {
        try {
            const response = await reviewApi.getVendorReviews({
                ...params,
                page: 1,
                page_size: 10,
            });
            return { ...response, vendorId: params.vendorId };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to refresh reviews');
        }
    }
);

// ============================================================================
// Slice
// ============================================================================

const reviewSlice = createSlice({
    name: 'review',
    initialState,
    reducers: {
        /**
         * Reset all review state (call after closing review modal)
         */
        clearReviewState: () => initialState,

        /**
         * Clear only the error (for retry scenarios)
         */
        clearSubmitError: (state) => {
            state.submitError = null;
        },

        /**
         * Clear vendor reviews state
         */
        clearVendorReviews: (state) => {
            state.vendorReviews = [];
            state.isLoadingVendorReviews = false;
            state.isLoadingMoreReviews = false;
            state.vendorReviewsError = null;
            state.vendorReviewsCount = 0;
            state.vendorReviewsDistribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
            state.vendorAverageRating = 0;
            state.originalTotalCount = 0;
            state.originalDistribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
            state.originalAverageRating = 0;
            state.originalStatsLoaded = false;
            state.vendorReviewsPage = 1;
            state.vendorReviewsTotalPages = 1;
            state.vendorReviewsHasMore = false;
            state.currentVendorId = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Pending: Start submission
            .addCase(submitReview.pending, (state) => {
                state.isSubmitting = true;
                state.submitError = null;
                state.submitted = false;
            })
            // Fulfilled: Submission successful
            .addCase(submitReview.fulfilled, (state, action) => {
                state.isSubmitting = false;
                state.submitted = true;
                state.lastReview = action.payload.review;
            })
            // Rejected: Submission failed
            .addCase(submitReview.rejected, (state, action) => {
                state.isSubmitting = false;
                state.submitError = action.payload || 'Failed to submit review';
            })
            // Fetch vendor reviews: Pending (initial load)
            .addCase(fetchVendorReviews.pending, (state) => {
                state.isLoadingVendorReviews = true;
                state.vendorReviewsError = null;
            })
            // Fetch vendor reviews: Fulfilled
            .addCase(fetchVendorReviews.fulfilled, (state, action) => {
                state.isLoadingVendorReviews = false;
                state.vendorReviews = action.payload.results;
                state.vendorReviewsCount = action.payload.count;
                state.vendorReviewsDistribution = action.payload.distribution;
                state.vendorAverageRating = action.payload.average_rating;
                state.vendorReviewsPage = action.payload.page;
                state.vendorReviewsTotalPages = action.payload.total_pages;
                state.vendorReviewsHasMore = action.payload.page < action.payload.total_pages;
                state.currentVendorId = action.payload.vendorId;

                // Save original stats ONLY on unfiltered fetch (first time)
                // These will be used for filter chip counts - they never change with filter
                if (!action.payload.isFiltered && !state.originalStatsLoaded) {
                    state.originalTotalCount = action.payload.count;
                    state.originalDistribution = action.payload.distribution;
                    state.originalAverageRating = action.payload.average_rating;
                    state.originalStatsLoaded = true;
                }
            })
            // Fetch vendor reviews: Rejected
            .addCase(fetchVendorReviews.rejected, (state, action) => {
                state.isLoadingVendorReviews = false;
                state.vendorReviewsError = action.payload || 'Failed to fetch reviews';
            })

            // Load more vendor reviews: Pending
            .addCase(loadMoreVendorReviews.pending, (state) => {
                state.isLoadingMoreReviews = true;
                state.vendorReviewsError = null;
            })
            // Load more vendor reviews: Fulfilled
            .addCase(loadMoreVendorReviews.fulfilled, (state, action) => {
                state.isLoadingMoreReviews = false;
                if (action.payload) {
                    // Append new reviews, avoiding duplicates
                    const existingIds = new Set(state.vendorReviews.map(r => r.id));
                    const newReviews = action.payload.results.filter(r => !existingIds.has(r.id));
                    state.vendorReviews = [...state.vendorReviews, ...newReviews];
                    state.vendorReviewsPage = action.payload.page;
                    state.vendorReviewsTotalPages = action.payload.total_pages;
                    state.vendorReviewsHasMore = action.payload.page < action.payload.total_pages;
                }
            })
            // Load more vendor reviews: Rejected
            .addCase(loadMoreVendorReviews.rejected, (state, action) => {
                state.isLoadingMoreReviews = false;
                state.vendorReviewsError = action.payload || 'Failed to load more reviews';
            })

            // Refresh vendor reviews: Pending
            .addCase(refreshVendorReviews.pending, (state) => {
                state.isLoadingVendorReviews = true;
                state.vendorReviewsError = null;
            })
            // Refresh vendor reviews: Fulfilled
            .addCase(refreshVendorReviews.fulfilled, (state, action) => {
                state.isLoadingVendorReviews = false;
                state.vendorReviews = action.payload.results;
                state.vendorReviewsCount = action.payload.count;
                state.vendorReviewsDistribution = action.payload.distribution;
                state.vendorAverageRating = action.payload.average_rating;
                state.vendorReviewsPage = action.payload.page;
                state.vendorReviewsTotalPages = action.payload.total_pages;
                state.vendorReviewsHasMore = action.payload.page < action.payload.total_pages;
                state.currentVendorId = action.payload.vendorId;

                // Update original stats on refresh (fix for rating not updating after new review)
                state.originalTotalCount = action.payload.count;
                state.originalDistribution = action.payload.distribution;
                state.originalAverageRating = action.payload.average_rating;
            })
            // Refresh vendor reviews: Rejected
            .addCase(refreshVendorReviews.rejected, (state, action) => {
                state.isLoadingVendorReviews = false;
                state.vendorReviewsError = action.payload || 'Failed to refresh reviews';
            });
    },
});

// ============================================================================
// Actions
// ============================================================================

export const { clearReviewState, clearSubmitError, clearVendorReviews } = reviewSlice.actions;

// ============================================================================
// Selectors
// ============================================================================

/** Whether a review submission is in progress */
export const selectIsSubmittingReview = (state: RootState) => state.review.isSubmitting;

/** Error message from failed submission (null if none) */
export const selectReviewError = (state: RootState) => state.review.submitError;

/** Whether review was successfully submitted */
export const selectReviewSubmitted = (state: RootState) => state.review.submitted;

/** Last submitted review data */
export const selectLastReview = (state: RootState) => state.review.lastReview;

/** Vendor reviews list */
export const selectVendorReviews = (state: RootState) => state.review.vendorReviews;

/** Whether vendor reviews are loading */
export const selectIsLoadingVendorReviews = (state: RootState) => state.review.isLoadingVendorReviews;

/** Whether loading more reviews */
export const selectIsLoadingMoreReviews = (state: RootState) => state.review.isLoadingMoreReviews;

/** Error message from fetching vendor reviews */
export const selectVendorReviewsError = (state: RootState) => state.review.vendorReviewsError;

/** Total count of vendor reviews */
export const selectVendorReviewsCount = (state: RootState) => state.review.vendorReviewsCount;

/** Star rating distribution */
export const selectVendorReviewsDistribution = (state: RootState) => state.review.vendorReviewsDistribution;

/** Average vendor rating */
export const selectVendorAverageRating = (state: RootState) => state.review.vendorAverageRating;

/** Current page for vendor reviews */
export const selectVendorReviewsPage = (state: RootState) => state.review.vendorReviewsPage;

/** Total pages for vendor reviews */
export const selectVendorReviewsTotalPages = (state: RootState) => state.review.vendorReviewsTotalPages;

/** Whether there are more reviews to load */
export const selectVendorReviewsHasMore = (state: RootState) => state.review.vendorReviewsHasMore;

/** ORIGINAL total count (never changes with filter) */
export const selectOriginalTotalCount = (state: RootState) => state.review.originalTotalCount;

/** ORIGINAL distribution (never changes with filter) */
export const selectOriginalDistribution = (state: RootState) => state.review.originalDistribution;

/** ORIGINAL average rating (never changes with filter) */
export const selectOriginalAverageRating = (state: RootState) => state.review.originalAverageRating;

// ============================================================================
// Export
// ============================================================================

export default reviewSlice.reducer;
