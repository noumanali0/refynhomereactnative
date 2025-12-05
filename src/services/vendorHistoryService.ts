/**
 * Vendor History API Service
 *
 * Handles all API calls related to vendor's job history.
 * Uses /api/vendors/service-requests/?type=history endpoint.
 */

import { apiClient, getErrorMessage } from '@/api/client';
import { VENDOR_ENDPOINTS, buildUrl } from '@/api/endpoints';

// ============================================================================
// TYPES
// ============================================================================

export interface VendorHistoryCustomer {
  id: number;
  phone: string;
  full_name: string;
  address: string | null;
  city: string | null;
}

export interface VendorHistoryCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string;
}

export interface VendorHistoryJob {
  id: number;
  customer: VendorHistoryCustomer;
  category: VendorHistoryCategory;
  problem_title: string;
  description: string;
  address_line: string;
  latitude: number;
  longitude: number;
  status: 'completed' | 'cancelled' | 'expired';
  price_quote: number | null;
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

export interface VendorHistoryResponse {
  count: number;
  results: VendorHistoryJob[];
  type: string;
}

export interface VendorHistoryFilters {
  status?: 'completed' | 'cancelled' | 'all';
  page?: number;
  page_size?: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get vendor's job history
 * Uses /api/vendors/service-requests/?type=history endpoint
 */
export async function getVendorHistory(
  filters?: VendorHistoryFilters
): Promise<VendorHistoryResponse> {
  try {
    // Build URL with type=history to get past completed/cancelled jobs
    const url = buildUrl(VENDOR_ENDPOINTS.SERVICE_REQUESTS, {
      type: 'history',
      limit: filters?.page_size || 50,
    });

    const response = await apiClient.get<VendorHistoryResponse>(url);

    // Filter by status client-side if needed (server returns all history)
    let results = response.data.results || [];
    if (filters?.status && filters.status !== 'all') {
      results = results.filter(job => job.status === filters.status);
    }

    return {
      count: results.length,
      results,
      type: 'history',
    };
  } catch (error) {
    console.error('[VendorHistoryService] Get history error:', error);
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get single job detail
 * Note: Uses service request detail endpoint
 */
export async function getVendorJobDetail(jobId: number): Promise<VendorHistoryJob> {
  try {
    const response = await apiClient.get<VendorHistoryJob>(`/service-requests/${jobId}/`);
    return response.data;
  } catch (error) {
    console.error('[VendorHistoryService] Get job detail error:', error);
    throw new Error(getErrorMessage(error));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const vendorHistoryService = {
  getHistory: getVendorHistory,
  getDetail: getVendorJobDetail,
};

export default vendorHistoryService;
