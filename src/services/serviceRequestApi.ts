// src/services/serviceRequestApi.ts
/**
 * Service Request API
 *
 * Handles creating and managing service requests via REST API.
 * After creation, the backend broadcasts to vendors via WebSocket.
 */

import { apiClient, getErrorMessage } from '@/api/client';

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
 */
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  try {
    const response = await apiClient.get<ServiceCategory[]>('/categories/');
    return response.data;
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Cancel a service request
 */
export async function cancelServiceRequest(id: number): Promise<void> {
  try {
    await apiClient.patch(`/service-requests/${id}/`, {
      status: 'cancelled',
    });
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
};

export default serviceRequestApi;
