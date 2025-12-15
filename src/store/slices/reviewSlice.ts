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
    /** Error message from fetching vendor reviews */
    vendorReviewsError: string | null;
    /** Total count of vendor reviews */
    vendorReviewsCount: number;
    /** Star rating distribution */
    vendorReviewsDistribution: Record<string, number>;
    /** Average rating */
    vendorAverageRating: number;
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
    vendorReviewsError: null,
    vendorReviewsCount: 0,
    vendorReviewsDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    vendorAverageRating: 0,
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
 * Fetch vendor reviews with optional filtering and sorting
 *
 * @param params - Query parameters (vendorId, stars?, sort?, limit?)
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
    VendorReviewsResponse,
    GetVendorReviewsParams,
    { rejectValue: string }
>(
    'review/fetchVendorReviews',
    async (params, { rejectWithValue }) => {
        try {
            const response = await reviewApi.getVendorReviews(params);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch reviews');
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
            state.vendorReviewsError = null;
            state.vendorReviewsCount = 0;
            state.vendorReviewsDistribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
            state.vendorAverageRating = 0;
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
            // Fetch vendor reviews: Pending
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
            })
            // Fetch vendor reviews: Rejected
            .addCase(fetchVendorReviews.rejected, (state, action) => {
                state.isLoadingVendorReviews = false;
                state.vendorReviewsError = action.payload || 'Failed to fetch reviews';
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

/** Error message from fetching vendor reviews */
export const selectVendorReviewsError = (state: RootState) => state.review.vendorReviewsError;

/** Total count of vendor reviews */
export const selectVendorReviewsCount = (state: RootState) => state.review.vendorReviewsCount;

/** Star rating distribution */
export const selectVendorReviewsDistribution = (state: RootState) => state.review.vendorReviewsDistribution;

/** Average vendor rating */
export const selectVendorAverageRating = (state: RootState) => state.review.vendorAverageRating;

// ============================================================================
// Export
// ============================================================================

export default reviewSlice.reducer;
