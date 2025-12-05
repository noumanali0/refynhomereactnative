// src/store/slices/reviewSlice.ts
/**
 * Review Slice
 *
 * Manages review submission state for completed service requests.
 * Integrates with the backend review API.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { reviewApi, CreateReviewParams, ReviewResponse } from '@/services/reviewApi';
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
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: ReviewState = {
    isSubmitting: false,
    submitError: null,
    submitted: false,
    lastReview: null,
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
            });
    },
});

// ============================================================================
// Actions
// ============================================================================

export const { clearReviewState, clearSubmitError } = reviewSlice.actions;

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

// ============================================================================
// Export
// ============================================================================

export default reviewSlice.reducer;
