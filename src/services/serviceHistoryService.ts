/**
 * Service Request History API Service
 *
 * Handles all API calls related to customer service request history.
 */

import { apiClient, getErrorMessage } from '@/api/client';
import { CUSTOMER_ENDPOINTS, SERVICE_REQUEST_ENDPOINTS, buildUrl } from '@/api/endpoints';

// ============================================================================
// TYPES
// ============================================================================

export interface ServiceHistoryVendor {
  id: number;
  phone: string;
  full_name: string;
  verified: boolean;
  average_rating: number;
  total_reviews: number;
  completed_jobs: number;
  profile_photo_url: string | null;
  service_radius_km: number;
  is_favorite?: boolean;
  // Category-specific stats (for the service category of this request)
  category_average_rating?: number;
  category_total_reviews?: number;
  category_completed_jobs?: number;
}

export interface ServiceHistoryCategory {
  id: number;
  name: string;
  icon?: string;
}

export interface ServiceHistoryProposal {
  id: number;
  vendor: ServiceHistoryVendor;
  price_quote: number | null;
  eta_minutes: number | null;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface ServiceHistoryRequest {
  id: number;
  category: ServiceHistoryCategory;
  problem_title: string;
  description: string;
  address_line: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'accepted' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  // Backend returns assigned_vendor_detail (not assigned_vendor)
  assigned_vendor_detail: ServiceHistoryVendor | null;
  accepted_proposal: ServiceHistoryProposal | null;
  proposals?: ServiceHistoryProposal[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  has_review?: boolean;
  review?: {
    id: number;
    stars: number;
    feedback: string;
    created_at: string;
  } | null;
  // Cancellation fields
  cancelled_by?: 'customer' | 'vendor';
  cancellation_reason_code?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
}

export interface ServiceHistoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  page?: number;
  total_pages?: number;
  results: ServiceHistoryRequest[];
}

export interface ServiceHistoryFilters {
  status?: 'pending' | 'accepted' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  page?: number;
  page_size?: number;
  limit?: number; // Alias for page_size, used for home screen recent services
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get customer's service request history
 */
export async function getServiceHistory(filters?: ServiceHistoryFilters): Promise<ServiceHistoryResponse> {
  try {
    // Use limit as alias for page_size if provided
    const pageSize = filters?.limit || filters?.page_size || 10;

    // Build URL with type=history to get completed/cancelled requests (like vendor history)
    const url = buildUrl(CUSTOMER_ENDPOINTS.SERVICE_REQUESTS, {
      type: 'history',
      status: filters?.status,
      page: filters?.page,
      page_size: pageSize,
    });

    if (__DEV__) {
      console.log('[ServiceHistory] Fetching history with URL:', url);
    }

    // Use longer timeout for history queries (may have more data)
    const response = await apiClient.get<{ results: ServiceHistoryRequest[]; count: number; type: string } | ServiceHistoryRequest[]>(url, {
      timeout: 15000, // 15 seconds for history
    });

    if (__DEV__) {
      console.log('[ServiceHistory] Response:', response.data);
    }

    // Handle DRF paginated response: { results, count, next, previous, page, total_pages }
    if (response.data && 'results' in response.data) {
      const data = response.data as {
        results: ServiceHistoryRequest[];
        count: number;
        next?: string | null;
        previous?: string | null;
        page?: number;
        total_pages?: number;
        type?: string;
      };

      return {
        count: data.count || data.results.length,
        next: data.next || null,
        previous: data.previous || null,
        page: data.page,
        total_pages: data.total_pages,
        results: data.results,
      };
    }

    // Handle array response (fallback for old API format)
    if (Array.isArray(response.data)) {
      return {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data,
      };
    }

    // Fallback for unexpected format
    return {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };
  } catch (error) {
    if (__DEV__) {
      console.error('[ServiceHistory] Error fetching history:', error);
    }
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get single service request details
 */
export async function getServiceRequestDetail(requestId: number): Promise<ServiceHistoryRequest> {
  try {
    const response = await apiClient.get<ServiceHistoryRequest>(
      SERVICE_REQUEST_ENDPOINTS.DETAIL(requestId)
    );
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get all service history without pagination
 */
export async function getAllServiceHistory(): Promise<ServiceHistoryRequest[]> {
  try {
    // Use max page size for fetching all records
    const response = await getServiceHistory({ page_size: 100 });
    return response.results;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const serviceHistoryService = {
  getHistory: getServiceHistory,
  getDetail: getServiceRequestDetail,
  getAll: getAllServiceHistory,
};

export default serviceHistoryService;
