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
  status: 'pending' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
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
}

export interface ServiceHistoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceHistoryRequest[];
}

export interface ServiceHistoryFilters {
  status?: 'pending' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
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
    const pageSize = filters?.limit || filters?.page_size || 50;

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

    // Handle response format from backend: { results: [], count: number, type: string }
    if (response.data && 'results' in response.data) {
      return {
        count: response.data.count || response.data.results.length,
        next: null,
        previous: null,
        results: response.data.results,
      };
    }

    // Handle array response (fallback)
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
