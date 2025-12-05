/**
 * Favorite Vendors API Service
 *
 * Handles all API calls related to favorite vendors functionality.
 */

import { apiClient, getErrorMessage } from '@/api/client';
import { FAVORITE_ENDPOINTS } from '@/api/endpoints';
import type { SocketVendor } from '@/types/socket';

// ============================================================================
// TYPES
// ============================================================================

export interface FavoriteVendor {
  id: number;
  vendor_id: number;
  vendor: {
    id: number;
    phone: string;
    full_name: string;
    verified: boolean;
    average_rating: number;
    total_reviews: number;
    completed_jobs: number;
    profile_photo_url: string | null;
    service_radius_km: number;
  };
  created_at: string;
}

export interface AddFavoriteResponse {
  message: string;
  favorite: FavoriteVendor;
}

export interface CheckFavoriteResponse {
  is_favorite: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get list of favorite vendors for current customer
 */
export async function getFavoriteVendors(): Promise<FavoriteVendor[]> {
  try {
    const response = await apiClient.get<FavoriteVendor[]>(FAVORITE_ENDPOINTS.LIST);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Add a vendor to favorites
 */
export async function addFavoriteVendor(vendorId: number): Promise<AddFavoriteResponse> {
  try {
    const response = await apiClient.post<AddFavoriteResponse>(FAVORITE_ENDPOINTS.ADD, {
      vendor_id: vendorId,
    });
    return response.data;
  } catch (error) {
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
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Check if a vendor is in favorites
 */
export async function checkIsFavorite(vendorId: number): Promise<boolean> {
  try {
    const response = await apiClient.get<CheckFavoriteResponse>(FAVORITE_ENDPOINTS.CHECK(vendorId));
    return response.data.is_favorite;
  } catch (error) {
    // If endpoint doesn't exist, assume not favorite
    console.warn('[FavoriteService] Check favorite failed:', getErrorMessage(error));
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
    throw new Error(getErrorMessage(error));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const favoriteService = {
  getAll: getFavoriteVendors,
  add: addFavoriteVendor,
  remove: removeFavoriteVendor,
  check: checkIsFavorite,
  toggle: toggleFavoriteVendor,
};

export default favoriteService;
