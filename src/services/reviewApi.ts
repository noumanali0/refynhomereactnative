// src/services/reviewApi.ts
/**
 * Review API Service
 *
 * Handles submitting reviews for completed service requests.
 * Uses the backend endpoint: POST /api/service-requests/{id}/rate/
 */

import { apiClient, getErrorMessage } from '@/api/client';
import { REVIEW_ENDPOINTS } from '@/api/endpoints';

// ============================================================================
// Types
// ============================================================================

export interface CreateReviewParams {
    /** The service request ID to rate */
    serviceRequestId: number;
    /** Rating from 1 to 5 stars */
    stars: number;
    /** Optional feedback text */
    feedback?: string;
}

export interface Review {
    id: number;
    service_request: number;
    customer: number;
    vendor: number;
    stars: number;
    feedback: string;
    created_at: string;
}

export interface ReviewResponse {
    message: string;
    review: Review;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Submit a review for a completed service request
 *
 * @param params - Review parameters
 * @returns Promise with review response
 * @throws Error with user-friendly message
 *
 * @example
 * ```typescript
 * const response = await reviewApi.submitReview({
 *   serviceRequestId: 123,
 *   stars: 5,
 *   feedback: 'Excellent service!'
 * });
 * console.log('Review submitted:', response.review.id);
 * ```
 */
async function submitReview(params: CreateReviewParams): Promise<ReviewResponse> {
    try {
        const response = await apiClient.post<ReviewResponse>(
            REVIEW_ENDPOINTS.RATE_SERVICE(params.serviceRequestId),
            {
                stars: params.stars,
                feedback: params.feedback || '',
            }
        );
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

// ============================================================================
// Export
// ============================================================================

export const reviewApi = {
    submitReview,
};

export default reviewApi;
