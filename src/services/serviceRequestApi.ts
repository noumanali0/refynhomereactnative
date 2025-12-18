// src/services/serviceRequestApi.ts
/**
 * Service Request API
 *
 * Handles creating and managing service requests via REST API.
 * After creation, the backend broadcasts to vendors via WebSocket.
 */

import { apiClient, getErrorMessage, isApiError } from '@/api/client';

// ============================================================================
// Types
// ============================================================================

export interface CreateServiceRequestParams {
  category: number; // Category ID
  problem_title: string;
  description: string;
  address_line: string;
  latitude: number;
  longitude: number;
  location_source?: 'live' | 'map' | 'manual';
  radius_km?: number;
}

export interface ServiceRequestResponse {
  id: number;
  customer: number;
  category: number;
  category_detail: {
    id: number;
    name: string;
    slug: string;
  };
  problem_title: string;
  description: string;
  address_line: string;
  location_source: string;
  latitude: string;
  longitude: string;
  radius_km: string;
  status: string;
  assigned_vendor: number | null;
  scheduled_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface CreateServiceRequestResponse {
  request: ServiceRequestResponse;
  vendors: Array<{
    id: number;
    full_name: string;
    profile_photo_url: string | null;
    average_rating: number;
    total_reviews: number;
    completed_jobs: number;
    distance_km: number;
    eta_minutes: number;
    verified: boolean;
  }>;
  meta: {
    total_found: number;
    returned: number;
    requested_radius_km: number;
    actual_radius_km: number;
    search_time_ms: number;
  };
}

export interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  is_active: boolean;
}

// Cancel reason codes for customer
export type CustomerCancelReasonCode =
  | 'found_another_vendor'
  | 'issue_resolved'
  | 'pricing_too_high'
  | 'changed_mind'
  | 'other';

// Cancel reason codes for vendor
export type VendorCancelReasonCode =
  | 'emergency'
  | 'vehicle_breakdown'
  | 'customer_unreachable'
  | 'unsafe_location'
  | 'request_mismatch'
  | 'other';

export interface CancelServiceRequestParams {
  id: number;
  cancelled_by: 'customer' | 'vendor';
  reason_code?: CustomerCancelReasonCode | VendorCancelReasonCode;
  reason?: string; // Custom reason text for 'other'
}

export interface CancelStatusResponse {
  can_create_request: boolean;
  cooldown_remaining_seconds: number | null;
  last_cancellation: string | null;
}

export interface VendorStatusResponse {
  is_stationary: boolean;
  stationary_duration_minutes: number;
  last_location_at: string | null;
  total_distance_km: number;
  has_reached_1km: boolean;
  can_cancel: boolean;
  vendor_id: number;
  vendor_name: string;
  vendor_lat: number | null;
  vendor_lng: number | null;
}

// Human-readable labels for cancel reasons
export const CUSTOMER_CANCEL_REASONS: Record<CustomerCancelReasonCode, string> = {
  found_another_vendor: 'Found another vendor',
  issue_resolved: 'Issue resolved',
  pricing_too_high: 'Pricing too high',
  changed_mind: 'Changed my mind',
  other: 'Other',
};

export const VENDOR_CANCEL_REASONS: Record<VendorCancelReasonCode, string> = {
  emergency: 'Emergency situation',
  vehicle_breakdown: 'Vehicle breakdown',
  customer_unreachable: 'Customer unreachable',
  unsafe_location: 'Unsafe location',
  request_mismatch: 'Customer request mismatch',
  other: 'Other',
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Create a new service request
 *
 * This will:
 * 1. Create the request in the database
 * 2. Find nearby vendors matching the category
 * 3. Broadcast the request to those vendors via WebSocket
 *
 * @returns The created request and list of nearby vendors notified
 */
export async function createServiceRequest(
  params: CreateServiceRequestParams
): Promise<CreateServiceRequestResponse> {
  try {
    const response = await apiClient.post<CreateServiceRequestResponse>(
      '/service-requests/',
      {
        category: params.category,
        problem_title: params.problem_title,
        description: params.description,
        address_line: params.address_line,
        latitude: params.latitude,
        longitude: params.longitude,
        location_source: params.location_source || 'map',
        radius_km: params.radius_km || 10,
      }
    );

    return response.data;
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Get service request by ID
 */
export async function getServiceRequest(id: number): Promise<ServiceRequestResponse> {
  try {
    const response = await apiClient.get<ServiceRequestResponse>(`/service-requests/${id}/`);
    return response.data;
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Get all service requests for the current customer
 */
export async function getCustomerServiceRequests(): Promise<ServiceRequestResponse[]> {
  try {
    const response = await apiClient.get<{ results: ServiceRequestResponse[] }>(
      '/customers/service-requests/'
    );
    return response.data.results || [];
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Get all service categories
 * @param signal - Optional AbortController signal for cancellation
 */
export async function getServiceCategories(signal?: AbortSignal): Promise<ServiceCategory[]> {
  try {
    const response = await apiClient.get<ServiceCategory[]>('/categories/', { signal });
    return response.data;
  } catch (error) {
    // Re-throw abort errors as-is for proper handling
    if (error instanceof Error && error.name === 'CanceledError') {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      throw abortError;
    }
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Cancel a service request with reason
 *
 * Uses dedicated cancel endpoint: /service-requests/{id}/cancel/
 * Backend auto-detects cancelled_by from authenticated user's role
 *
 * @param params - Cancel parameters including reason code and optional text
 */
export async function cancelServiceRequest(
  params: CancelServiceRequestParams | number
): Promise<void> {
  try {
    if (typeof params === 'number') {
      // Legacy: simple cancel without reason
      await apiClient.patch(`/service-requests/${params}/cancel/`);
    } else {
      // Cancel with reason - backend expects reason_code and reason only
      await apiClient.patch(`/service-requests/${params.id}/cancel/`, {
        reason_code: params.reason_code,
        reason: params.reason,
      });
    }
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Check if user can create new request (cooldown status)
 */
export async function getCancelStatus(): Promise<CancelStatusResponse> {
  try {
    const response = await apiClient.get<CancelStatusResponse>('/users/cancel-status/');
    return response.data;
  } catch (error) {
    // Only return default if endpoint doesn't exist (404)
    if (isApiError(error) && error.response?.status === 404) {
      return {
        can_create_request: true,
        cooldown_remaining_seconds: null,
        last_cancellation: null,
      };
    }
    // Re-throw other errors (500, network, etc.)
    throw error;
  }
}

/**
 * Get vendor status for a service request (server-side stationary detection)
 *
 * Used by customers to check if vendor is stationary (no location updates for 10+ mins)
 * after covering 1km distance. This enables the cancel button to reappear.
 *
 * Call this when:
 * - App returns to foreground
 * - Periodically as a fallback for WebSocket-based tracking
 */
export async function getVendorStatus(serviceRequestId: number): Promise<VendorStatusResponse> {
  try {
    const response = await apiClient.get<VendorStatusResponse>(
      `/service-requests/${serviceRequestId}/vendor-status/`
    );
    return response.data;
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

// ============================================================================
// Export
// ============================================================================

export const serviceRequestApi = {
  create: createServiceRequest,
  get: getServiceRequest,
  getCustomerRequests: getCustomerServiceRequests,
  getCategories: getServiceCategories,
  cancel: cancelServiceRequest,
  getCancelStatus: getCancelStatus,
  getVendorStatus: getVendorStatus,
};

export default serviceRequestApi;
