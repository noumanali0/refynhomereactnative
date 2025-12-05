/**
 * Vendor Reviews API Service
 *
 * Handles all API calls related to vendor reviews listing.
 */

import { apiClient, getErrorMessage } from '@/api/client';
import { VENDOR_ENDPOINTS, buildUrl } from '@/api/endpoints';

// ============================================================================
// TYPES
// ============================================================================

export interface ReviewCustomer {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
}

export interface VendorReview {
  id: number;
  customer: ReviewCustomer;
  service_request: number;
  stars: number;
  feedback: string;
  created_at: string;
  category_name?: string;
}

export interface VendorReviewsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: VendorReview[];
}

export interface VendorReviewsFilters {
  page?: number;
  page_size?: number;
  min_rating?: number;
}

export interface VendorReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get vendor's reviews list
 */
export async function getVendorReviews(
  vendorId: number,
  filters?: VendorReviewsFilters
): Promise<VendorReviewsResponse> {
  try {
    const baseUrl = VENDOR_ENDPOINTS.REVIEWS(vendorId);
    const url = buildUrl(baseUrl, {
      page: filters?.page,
      page_size: filters?.page_size || 20,
      min_rating: filters?.min_rating,
    });

    const response = await apiClient.get<VendorReviewsResponse>(url);
    return response.data;
  } catch (error) {
    console.error('[VendorReviewsService] Get reviews error:', error);
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get vendor's review statistics
 */
export async function getVendorReviewStats(vendorId: number): Promise<VendorReviewStats> {
  try {
    const response = await apiClient.get<VendorReviewStats>(
      `${VENDOR_ENDPOINTS.REVIEWS(vendorId)}stats/`
    );
    return response.data;
  } catch (error) {
    console.error('[VendorReviewsService] Get review stats error:', error);
    throw new Error(getErrorMessage(error));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const vendorReviewsService = {
  getReviews: getVendorReviews,
  getStats: getVendorReviewStats,
};

export default vendorReviewsService;
