/**
 * Vendor Profile API Service
 *
 * Handles API calls for vendor public profile and reviews.
 * Used by customers to view vendor details before accepting proposals.
 */

import { apiClient, getErrorMessage } from '@/api/client';
import { VENDOR_ENDPOINTS, buildUrl } from '@/api/endpoints';

// ============================================================================
// TYPES
// ============================================================================

export interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface ReviewCustomer {
  name: string;
  photo_url: string | null;
}

export interface VendorReview {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: ReviewCustomer;
  service_category: string | null;
}

export interface VendorPublicProfile {
  id: number;
  full_name: string;
  phone: string;
  verified: boolean;
  city: string;
  bio: string;
  profile_photo_url: string | null;
  member_since: string;
  average_rating: number;
  total_reviews: number;
  completed_jobs: number;
  response_rate: number;
  services: ServiceCategory[];
  is_favorite: boolean;
  recent_reviews: VendorReview[];
  rating_distribution?: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  };
}

export interface VendorReviewsResponse {
  results: VendorReview[];
  count: number;
  distribution: Record<string, number>;
  average_rating: number;
}

export interface VendorReviewsParams {
  limit?: number;
  sort?: 'latest' | 'highest' | 'lowest';
  stars?: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get vendor's public profile
 */
export async function getVendorProfile(vendorId: number): Promise<VendorPublicProfile> {
  try {
    const response = await apiClient.get<VendorPublicProfile>(
      VENDOR_ENDPOINTS.PROFILE(vendorId)
    );
    return response.data;
  } catch (error) {
    console.error('[VendorApi] Get profile error:', error);
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get vendor's reviews with pagination and filtering
 */
export async function getVendorReviews(
  vendorId: number,
  params?: VendorReviewsParams
): Promise<VendorReviewsResponse> {
  try {
    const url = buildUrl(VENDOR_ENDPOINTS.REVIEWS(vendorId), {
      limit: params?.limit || 10,
      sort: params?.sort || 'latest',
      stars: params?.stars,
    });

    const response = await apiClient.get<VendorReviewsResponse>(url);
    return response.data;
  } catch (error) {
    console.error('[VendorApi] Get reviews error:', error);
    throw new Error(getErrorMessage(error));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const vendorApi = {
  getProfile: getVendorProfile,
  getReviews: getVendorReviews,
};

export default vendorApi;
