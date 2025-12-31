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

export interface VendorHistoryProposal {
  id: number;
  price_quote: number | null;
  eta_minutes?: number | null;
  message?: string;
  status?: string;
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
  status: 'completed' | 'cancelled' | 'expired' | 'done';
  price_quote: number | null;
  // API may return price in accepted_proposal instead of price_quote
  accepted_proposal?: VendorHistoryProposal | null;
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
  page: number;
  total_pages: number;
  has_more: boolean;
  next: string | null;
  previous: string | null;
}

export interface VendorHistoryFilters {
  status?: 'completed' | 'cancelled' | 'all';
  page?: number;
  page_size?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Normalize status value from API
 * Maps various backend status values to expected frontend values
 */
function normalizeStatus(status: string | undefined | null): VendorHistoryJob['status'] {
  if (!status) return 'completed'; // Default fallback

  const normalized = status.toLowerCase().trim();

  // Map 'done' to 'completed' for display consistency
  if (normalized === 'done' || normalized === 'complete' || normalized === 'finished') {
    return 'completed';
  }
  if (normalized === 'cancelled' || normalized === 'canceled') {
    return 'cancelled';
  }
  if (normalized === 'expired') {
    return 'expired';
  }

  // If status matches expected values, return as is
  if (['completed', 'cancelled', 'expired', 'done'].includes(normalized)) {
    return normalized as VendorHistoryJob['status'];
  }

  // Default to completed for history items
  return 'completed';
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get vendor's job history with pagination
 * Uses /api/vendors/service-requests/?type=history endpoint
 */
export async function getVendorHistory(
  filters?: VendorHistoryFilters
): Promise<VendorHistoryResponse> {
  try {
    // Build URL with type=history to get past completed/cancelled jobs
    const url = buildUrl(VENDOR_ENDPOINTS.SERVICE_REQUESTS, {
      type: 'history',
      page: filters?.page || 1,
      page_size: filters?.page_size || 10,
    });

    const response = await apiClient.get<VendorHistoryResponse>(url);

    // Debug: Log first job to see API response structure
    if (__DEV__ && response.data.results?.length > 0) {
      const firstJob = response.data.results[0];
      console.log('[VendorHistory] API Response - First job structure:', JSON.stringify(firstJob, null, 2));
      console.log('[VendorHistory] price_quote:', firstJob.price_quote);
      console.log('[VendorHistory] accepted_proposal:', firstJob.accepted_proposal);
    }

    // Normalize status values from API and extract price from accepted_proposal if needed
    const results = (response.data.results || []).map(job => ({
      ...job,
      status: normalizeStatus(job.status),
      // Map price_quote from accepted_proposal if not directly available
      price_quote: job.price_quote ?? job.accepted_proposal?.price_quote ?? null,
    }));

    // Note: Status filtering now happens on the backend or in the slice for pagination consistency
    return {
      count: response.data.count || results.length,
      results,
      type: response.data.type || 'history',
      page: response.data.page || 1,
      total_pages: response.data.total_pages || 1,
      has_more: response.data.has_more || false,
      next: response.data.next || null,
      previous: response.data.previous || null,
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
