// src/services/reviewApi.ts
/**
 * Review API Service
 *
 * Handles submitting reviews for completed service requests.
 * Uses the backend endpoint: POST /api/service-requests/{id}/rate/
 * Also fetches vendor reviews: GET /api/vendors/{id}/reviews/
 */

import { apiClient, getErrorMessage } from '@/api/client';
import { REVIEW_ENDPOINTS, VENDOR_ENDPOINTS } from '@/api/endpoints';

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

export interface VendorReview {
    id: number;
    rating: number;
    comment: string;
    createdAt: string;
    customer: {
        name: string;
        photo_url: string | null;
    };
    service_category: string | null;
}

export interface GetVendorReviewsParams {
    vendorId: number;
    stars?: number;
    sort?: 'latest' | 'highest' | 'lowest';
    page?: number;
    page_size?: number;
}

export interface VendorReviewsResponse {
    results: VendorReview[];
    count: number;
    distribution: Record<string, number>;
    average_rating: number;
    total_reviews: number;
    page: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
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

/**
 * Get reviews for a vendor with optional filtering, sorting, and pagination
 *
 * @param params - Query parameters
 * @returns Promise with vendor reviews response
 * @throws Error with user-friendly message
 *
 * @example
 * ```typescript
 * const response = await reviewApi.getVendorReviews({
 *   vendorId: 123,
 *   stars: 5,      // optional: filter by star rating
 *   sort: 'latest', // optional: 'latest', 'highest', 'lowest'
 *   page: 1,       // optional: page number
 *   page_size: 10  // optional: number of results per page
 * });
 * console.log('Reviews:', response.results);
 * console.log('Average rating:', response.average_rating);
 * ```
 */
async function getVendorReviews(params: GetVendorReviewsParams): Promise<VendorReviewsResponse> {
    try {
        // Build query string
        const queryParams = new URLSearchParams();
        if (params.stars) queryParams.append('stars', params.stars.toString());
        if (params.sort) queryParams.append('sort', params.sort);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.page_size) queryParams.append('page_size', params.page_size.toString());

        const queryString = queryParams.toString();
        const url = VENDOR_ENDPOINTS.REVIEWS(params.vendorId) + (queryString ? `?${queryString}` : '');

        const response = await apiClient.get<VendorReviewsResponse>(url);

        // Ensure pagination fields have defaults
        return {
            ...response.data,
            page: response.data.page || 1,
            total_pages: response.data.total_pages || 1,
            total_reviews: response.data.total_reviews || response.data.count || 0,
            next: response.data.next || null,
            previous: response.data.previous || null,
        };
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

// ============================================================================
// Export
// ============================================================================

export const reviewApi = {
    submitReview,
    getVendorReviews,
};

export default reviewApi;
