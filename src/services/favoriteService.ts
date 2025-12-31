/**
 * Favorite Vendors API Service
 *
 * Handles all API calls related to favorite vendors functionality.
 * Transforms backend responses to frontend-compatible formats.
 */

import { apiClient, getErrorMessage } from '@/api/client';
import { FAVORITE_ENDPOINTS } from '@/api/endpoints';

// ============================================================================
// BACKEND RESPONSE TYPES (What the API actually returns)
// ============================================================================

/**
 * Backend VendorProfile model serializer response
 */
interface BackendVendorProfile {
  id: number;
  verified: boolean;
  cnic: string | null;
  city: string | null;
  bio: string | null;
  profile_photo: string | null;
  profile_photo_url: string | null; // Full URL for profile photo
  id_verification_photo: string | null;
  latitude: number | null;
  longitude: number | null;
  service_radius_km: number;
  location_updated_at: string | null;
  average_rating: number;
  total_reviews: number;
  completed_jobs: number;
}

/**
 * Backend FavoriteVendorSerializer response
 * This is the actual structure returned by the backend for each vendor
 */
interface BackendFavoriteVendor {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  address: string | null;
  city: string | null;
  vendor_profile: BackendVendorProfile | null;
}

/**
 * Backend LIST response with pagination: { count, next, previous, page, total_pages, results }
 */
interface ListFavoritesBackendResponse {
  count: number;
  next: string | null;
  previous: string | null;
  page?: number;
  total_pages?: number;
  results: BackendFavoriteVendor[];
}

/**
 * Pagination filters for fetching favorites
 */
export interface FavoritePaginationFilters {
  page?: number;
  page_size?: number;
}

/**
 * Paginated response for favorites
 */
export interface PaginatedFavoritesResponse {
  favorites: FavoriteVendor[];
  count: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Backend ADD/REMOVE response: { message, vendor, is_favorite }
 */
interface MutateFavoriteBackendResponse {
  message: string;
  detail?: string;
  vendor: BackendFavoriteVendor;
  is_favorite: boolean;
}

// ============================================================================
// FRONTEND TYPES (What the UI components expect)
// ============================================================================

/**
 * Normalized vendor data for UI consumption
 */
export interface VendorData {
  id: number;
  phone: string;
  full_name: string;
  first_name: string;
  last_name: string;
  verified: boolean;
  average_rating: number;
  total_reviews: number;
  completed_jobs: number;
  profile_photo_url: string | null;
  service_radius_km: number;
  city: string | null;
  bio: string | null;
}

/**
 * Frontend favorite vendor structure
 */
export interface FavoriteVendor {
  id: number;
  vendor_id: number;
  vendor: VendorData;
  created_at: string;
}

/**
 * Frontend response for add favorite
 */
export interface AddFavoriteResponse {
  message: string;
  favorite: FavoriteVendor;
}

export interface CheckFavoriteResponse {
  is_favorite: boolean;
}

// ============================================================================
// TRANSFORMERS (Convert backend to frontend format)
// ============================================================================

/**
 * Transform backend vendor to frontend VendorData format
 */
function transformToVendorData(backendVendor: BackendFavoriteVendor): VendorData {
  const profile = backendVendor.vendor_profile;

  return {
    id: backendVendor.id,
    phone: backendVendor.phone,
    full_name: `${backendVendor.first_name || ''} ${backendVendor.last_name || ''}`.trim() || 'Unknown Vendor',
    first_name: backendVendor.first_name || '',
    last_name: backendVendor.last_name || '',
    verified: profile?.verified ?? false,
    average_rating: profile?.average_rating ?? 0,
    total_reviews: profile?.total_reviews ?? 0,
    completed_jobs: profile?.completed_jobs ?? 0,
    // Use profile_photo_url (full URL) instead of profile_photo (relative path)
    profile_photo_url: profile?.profile_photo_url ?? profile?.profile_photo ?? null,
    service_radius_km: profile?.service_radius_km ?? 10,
    city: profile?.city ?? backendVendor.city ?? null,
    bio: profile?.bio ?? null,
  };
}

/**
 * Transform backend vendor to FavoriteVendor format
 */
function transformToFavoriteVendor(backendVendor: BackendFavoriteVendor): FavoriteVendor {
  return {
    id: backendVendor.id,
    vendor_id: backendVendor.id,
    vendor: transformToVendorData(backendVendor),
    created_at: new Date().toISOString(),
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get list of favorite vendors for current customer (simple - no pagination)
 * Backend returns: { count, results: BackendFavoriteVendor[] }
 * We transform to: FavoriteVendor[]
 * @deprecated Use getFavoriteVendorsPaginated for new implementations
 */
export async function getFavoriteVendors(): Promise<FavoriteVendor[]> {
  try {
    const response = await apiClient.get<ListFavoritesBackendResponse>(FAVORITE_ENDPOINTS.LIST);

    // Handle edge case: backend might return empty results
    if (!response.data?.results || !Array.isArray(response.data.results)) {
      return [];
    }

    // Transform each vendor to frontend format
    return response.data.results.map(transformToFavoriteVendor);
  } catch (error) {
    if (__DEV__) {
      console.error('[FavoriteService] getFavoriteVendors error:', error);
    }
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get paginated list of favorite vendors for current customer
 * Backend returns: { count, next, previous, page, total_pages, results }
 * We transform to: PaginatedFavoritesResponse
 */
export async function getFavoriteVendorsPaginated(
  filters?: FavoritePaginationFilters
): Promise<PaginatedFavoritesResponse> {
  try {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const url = params.toString()
      ? `${FAVORITE_ENDPOINTS.LIST}?${params.toString()}`
      : FAVORITE_ENDPOINTS.LIST;

    const response = await apiClient.get<ListFavoritesBackendResponse>(url);

    // Handle edge case: backend might return empty results
    if (!response.data?.results || !Array.isArray(response.data.results)) {
      return {
        favorites: [],
        count: 0,
        page: 1,
        totalPages: 1,
        hasMore: false,
      };
    }

    const favorites = response.data.results.map(transformToFavoriteVendor);
    const currentPage = response.data.page || 1;
    const totalPages = response.data.total_pages || 1;

    return {
      favorites,
      count: response.data.count,
      page: currentPage,
      totalPages,
      hasMore: currentPage < totalPages,
    };
  } catch (error) {
    if (__DEV__) {
      console.error('[FavoriteService] getFavoriteVendorsPaginated error:', error);
    }
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Add a vendor to favorites
 * Backend returns: { message, vendor, is_favorite }
 * We transform to: { message, favorite: FavoriteVendor }
 */
export async function addFavoriteVendor(vendorId: number): Promise<AddFavoriteResponse> {
  try {
    const response = await apiClient.post<MutateFavoriteBackendResponse>(FAVORITE_ENDPOINTS.ADD, {
      vendor_id: vendorId,
    });

    const backendData = response.data;

    // Handle case where vendor might not exist in response
    if (!backendData.vendor) {
      throw new Error(backendData.detail || backendData.message || 'Failed to add vendor to favorites');
    }

    return {
      message: backendData.message || 'Vendor added to favorites',
      favorite: transformToFavoriteVendor(backendData.vendor),
    };
  } catch (error) {
    if (__DEV__) {
      console.error('[FavoriteService] addFavoriteVendor error:', error);
    }
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Remove a vendor from favorites
 */
export async function removeFavoriteVendor(vendorId: number): Promise<void> {
  try {
    await apiClient.delete(FAVORITE_ENDPOINTS.REMOVE(vendorId));
  } catch (error) {
    if (__DEV__) {
      console.error('[FavoriteService] removeFavoriteVendor error:', error);
    }
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Check if a vendor is in favorites
 * Note: This endpoint may not exist in backend - handles gracefully
 */
export async function checkIsFavorite(vendorId: number): Promise<boolean> {
  try {
    const response = await apiClient.get<CheckFavoriteResponse>(FAVORITE_ENDPOINTS.CHECK(vendorId));
    return response.data.is_favorite ?? false;
  } catch (error) {
    // If endpoint doesn't exist or any error, assume not favorite
    if (__DEV__) {
      console.warn('[FavoriteService] checkIsFavorite failed (assuming false):', getErrorMessage(error));
    }
    return false;
  }
}

/**
 * Toggle favorite status for a vendor
 * Returns true if vendor is now a favorite, false if removed
 */
export async function toggleFavoriteVendor(vendorId: number): Promise<boolean> {
  try {
    const isFavorite = await checkIsFavorite(vendorId);

    if (isFavorite) {
      await removeFavoriteVendor(vendorId);
      return false;
    } else {
      await addFavoriteVendor(vendorId);
      return true;
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[FavoriteService] toggleFavoriteVendor error:', error);
    }
    throw new Error(getErrorMessage(error));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const favoriteService = {
  getAll: getFavoriteVendors,
  getPaginated: getFavoriteVendorsPaginated,
  add: addFavoriteVendor,
  remove: removeFavoriteVendor,
  check: checkIsFavorite,
  toggle: toggleFavoriteVendor,
};

export default favoriteService;
