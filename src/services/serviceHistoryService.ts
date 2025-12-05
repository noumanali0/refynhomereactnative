/**
 * Service Request History API Service
 *
 * Handles all API calls related to customer service request history.
 */

import { apiClient, getErrorMessage } from '@/api/client';
import { CUSTOMER_ENDPOINTS, SERVICE_REQUEST_ENDPOINTS } from '@/api/endpoints';

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
  assigned_vendor: ServiceHistoryVendor | null;
  accepted_proposal: ServiceHistoryProposal | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
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
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get customer's service request history
 */
export async function getServiceHistory(filters?: ServiceHistoryFilters): Promise<ServiceHistoryResponse> {
  try {
    const params = new URLSearchParams();

    if (filters?.status) {
      params.append('status', filters.status);
    }
    if (filters?.page) {
      params.append('page', filters.page.toString());
    }
    if (filters?.page_size) {
      params.append('page_size', filters.page_size.toString());
    }

    const queryString = params.toString();
    const url = queryString
      ? `${CUSTOMER_ENDPOINTS.SERVICE_REQUESTS}?${queryString}`
      : CUSTOMER_ENDPOINTS.SERVICE_REQUESTS;

    const response = await apiClient.get<ServiceHistoryResponse | ServiceHistoryRequest[]>(url);

    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data,
      };
    }

    return response.data;
  } catch (error) {
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
