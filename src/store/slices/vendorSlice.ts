import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { Vendor, VendorFilters } from '../../types';
import { MOCK_VENDORS } from '../../utils/mockData';
import { favoriteService, FavoriteVendor } from '@/services/favoriteService';

// ============================================================================
// TYPES
// ============================================================================

interface VendorState {
  vendors: Vendor[];
  filters: VendorFilters;
  favoriteVendorIds: number[];
  favoriteVendors: FavoriteVendor[];
  isLoadingFavorites: boolean;
  isLoadingMoreFavorites: boolean;
  isAddingFavorite: boolean;
  favoriteError: string | null;
  // Pagination state for favorites
  favoritesPage: number;
  favoritesHasMore: boolean;
  favoritesTotalCount: number;
  favoritesTotalPages: number;
}

const initialState: VendorState = {
  vendors: MOCK_VENDORS,
  filters: {},
  favoriteVendorIds: [],
  favoriteVendors: [],
  isLoadingFavorites: false,
  isLoadingMoreFavorites: false,
  isAddingFavorite: false,
  favoriteError: null,
  // Pagination defaults
  favoritesPage: 1,
  favoritesHasMore: false,
  favoritesTotalCount: 0,
  favoritesTotalPages: 1,
};

// ============================================================================
// ASYNC THUNKS
// ============================================================================

/**
 * Fetch favorite vendors from API (paginated - page 1)
 */
export const fetchFavoriteVendors = createAsyncThunk(
  'vendor/fetchFavorites',
  async (_, { rejectWithValue }) => {
    try {
      const response = await favoriteService.getPaginated({ page: 1, page_size: 10 });
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch favorites');
    }
  }
);

/**
 * Load more favorite vendors (next page)
 */
export const loadMoreFavorites = createAsyncThunk(
  'vendor/loadMoreFavorites',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { vendor: VendorState };
      const nextPage = state.vendor.favoritesPage + 1;

      // Don't load if no more pages
      if (!state.vendor.favoritesHasMore) {
        return null;
      }

      const response = await favoriteService.getPaginated({ page: nextPage, page_size: 10 });
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load more favorites');
    }
  }
);

/**
 * Refresh favorite vendors (pull to refresh)
 */
export const refreshFavorites = createAsyncThunk(
  'vendor/refreshFavorites',
  async (_, { rejectWithValue }) => {
    try {
      const response = await favoriteService.getPaginated({ page: 1, page_size: 10 });
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to refresh favorites');
    }
  }
);

/**
 * Add vendor to favorites
 */
export const addToFavorites = createAsyncThunk(
  'vendor/addToFavorites',
  async (vendorId: number, { rejectWithValue }) => {
    try {
      const response = await favoriteService.add(vendorId);
      return response.favorite;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add favorite');
    }
  }
);

/**
 * Remove vendor from favorites
 */
export const removeFromFavorites = createAsyncThunk(
  'vendor/removeFromFavorites',
  async (vendorId: number, { rejectWithValue }) => {
    try {
      await favoriteService.remove(vendorId);
      return vendorId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to remove favorite');
    }
  }
);

/**
 * Toggle favorite status
 */
export const toggleFavoriteVendor = createAsyncThunk(
  'vendor/toggleFavorite',
  async (vendorId: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { vendor: VendorState };
      const isFavorite = state.vendor.favoriteVendorIds.includes(vendorId);

      if (isFavorite) {
        await favoriteService.remove(vendorId);
        return { vendorId, isFavorite: false };
      } else {
        const response = await favoriteService.add(vendorId);
        return { vendorId, isFavorite: true, favorite: response.favorite };
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to toggle favorite');
    }
  }
);

// ============================================================================
// SLICE
// ============================================================================

const vendorSlice = createSlice({
  name: 'vendor',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<VendorFilters>) => {
      state.filters = action.payload;
    },
    // Local toggle for optimistic updates
    toggleFavoriteLocal: (state, action: PayloadAction<number>) => {
      const vendorId = action.payload;
      if (state.favoriteVendorIds.includes(vendorId)) {
        state.favoriteVendorIds = state.favoriteVendorIds.filter(id => id !== vendorId);
        state.favoriteVendors = state.favoriteVendors.filter(f => f.vendor_id !== vendorId);
      } else {
        state.favoriteVendorIds.push(vendorId);
      }
    },
    updateVendorStatus: (state, action: PayloadAction<{ vendorId: string; isOnline: boolean }>) => {
      const vendor = state.vendors.find(v => v.id === action.payload.vendorId);
      if (vendor) {
        vendor.isOnline = action.payload.isOnline;
      }
    },
    clearFavoriteError: (state) => {
      state.favoriteError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch favorites (initial load - page 1)
    builder
      .addCase(fetchFavoriteVendors.pending, (state) => {
        state.isLoadingFavorites = true;
        state.favoriteError = null;
      })
      .addCase(fetchFavoriteVendors.fulfilled, (state, action) => {
        state.isLoadingFavorites = false;
        state.favoriteVendors = action.payload.favorites;
        state.favoriteVendorIds = action.payload.favorites.map(f => f.vendor_id);
        state.favoritesPage = action.payload.page;
        state.favoritesHasMore = action.payload.hasMore;
        state.favoritesTotalCount = action.payload.count;
        state.favoritesTotalPages = action.payload.totalPages;
      })
      .addCase(fetchFavoriteVendors.rejected, (state, action) => {
        state.isLoadingFavorites = false;
        state.favoriteError = action.payload as string;
      });

    // Load more favorites (next page)
    builder
      .addCase(loadMoreFavorites.pending, (state) => {
        state.isLoadingMoreFavorites = true;
        state.favoriteError = null;
      })
      .addCase(loadMoreFavorites.fulfilled, (state, action) => {
        state.isLoadingMoreFavorites = false;
        if (action.payload) {
          // Append new favorites, avoiding duplicates
          const existingIds = new Set(state.favoriteVendorIds);
          const newFavorites = action.payload.favorites.filter(
            f => !existingIds.has(f.vendor_id)
          );
          state.favoriteVendors = [...state.favoriteVendors, ...newFavorites];
          state.favoriteVendorIds = [
            ...state.favoriteVendorIds,
            ...newFavorites.map(f => f.vendor_id)
          ];
          state.favoritesPage = action.payload.page;
          state.favoritesHasMore = action.payload.hasMore;
          state.favoritesTotalCount = action.payload.count;
          state.favoritesTotalPages = action.payload.totalPages;
        }
      })
      .addCase(loadMoreFavorites.rejected, (state, action) => {
        state.isLoadingMoreFavorites = false;
        state.favoriteError = action.payload as string;
      });

    // Refresh favorites (pull to refresh)
    builder
      .addCase(refreshFavorites.pending, (state) => {
        state.isLoadingFavorites = true;
        state.favoriteError = null;
      })
      .addCase(refreshFavorites.fulfilled, (state, action) => {
        state.isLoadingFavorites = false;
        state.favoriteVendors = action.payload.favorites;
        state.favoriteVendorIds = action.payload.favorites.map(f => f.vendor_id);
        state.favoritesPage = action.payload.page;
        state.favoritesHasMore = action.payload.hasMore;
        state.favoritesTotalCount = action.payload.count;
        state.favoritesTotalPages = action.payload.totalPages;
      })
      .addCase(refreshFavorites.rejected, (state, action) => {
        state.isLoadingFavorites = false;
        state.favoriteError = action.payload as string;
      });

    // Add to favorites
    builder
      .addCase(addToFavorites.pending, (state) => {
        state.isAddingFavorite = true;
        state.favoriteError = null;
      })
      .addCase(addToFavorites.fulfilled, (state, action) => {
        state.isAddingFavorite = false;
        state.favoriteVendors.push(action.payload);
        if (!state.favoriteVendorIds.includes(action.payload.vendor_id)) {
          state.favoriteVendorIds.push(action.payload.vendor_id);
        }
      })
      .addCase(addToFavorites.rejected, (state, action) => {
        state.isAddingFavorite = false;
        state.favoriteError = action.payload as string;
      });

    // Remove from favorites
    builder
      .addCase(removeFromFavorites.pending, (state) => {
        state.isAddingFavorite = true;
        state.favoriteError = null;
      })
      .addCase(removeFromFavorites.fulfilled, (state, action) => {
        state.isAddingFavorite = false;
        const vendorId = action.payload;
        state.favoriteVendorIds = state.favoriteVendorIds.filter(id => id !== vendorId);
        state.favoriteVendors = state.favoriteVendors.filter(f => f.vendor_id !== vendorId);
      })
      .addCase(removeFromFavorites.rejected, (state, action) => {
        state.isAddingFavorite = false;
        state.favoriteError = action.payload as string;
      });

    // Toggle favorite
    builder
      .addCase(toggleFavoriteVendor.pending, (state) => {
        state.isAddingFavorite = true;
        state.favoriteError = null;
      })
      .addCase(toggleFavoriteVendor.fulfilled, (state, action) => {
        state.isAddingFavorite = false;
        const { vendorId, isFavorite, favorite } = action.payload;

        if (isFavorite && favorite) {
          state.favoriteVendors.push(favorite);
          if (!state.favoriteVendorIds.includes(vendorId)) {
            state.favoriteVendorIds.push(vendorId);
          }
        } else {
          state.favoriteVendorIds = state.favoriteVendorIds.filter(id => id !== vendorId);
          state.favoriteVendors = state.favoriteVendors.filter(f => f.vendor_id !== vendorId);
        }
      })
      .addCase(toggleFavoriteVendor.rejected, (state, action) => {
        state.isAddingFavorite = false;
        state.favoriteError = action.payload as string;
      });
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function filterVendors(vendors: Vendor[], filters: VendorFilters): Vendor[] {
  return vendors.filter(vendor => {
    if (filters.category && !vendor.serviceCategories.some(cat => cat.id === filters.category?.id)) {
      return false;
    }
    if (filters.verifiedOnly && !vendor.verified) {
      return false;
    }
    if (filters.minRating && vendor.rating < filters.minRating) {
      return false;
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      return (
        vendor.name.toLowerCase().includes(query) ||
        vendor.serviceCategories.some(cat => cat.label.toLowerCase().includes(query))
      );
    }
    return true;
  });
}

// ============================================================================
// SELECTORS
// ============================================================================

// Base selectors
export const selectVendors = (state: { vendor: VendorState }) => state.vendor.vendors;
export const selectVendorFilters = (state: { vendor: VendorState }) => state.vendor.filters;

// Memoized selector for filtered vendors - prevents duplicate data in state
export const selectFilteredVendors = createSelector(
  [selectVendors, selectVendorFilters],
  (vendors, filters) => filterVendors(vendors, filters)
);

// Favorite selectors
export const selectFavoriteVendorIds = (state: { vendor: VendorState }) => state.vendor.favoriteVendorIds;
export const selectFavoriteVendors = (state: { vendor: VendorState }) => state.vendor.favoriteVendors;
export const selectIsVendorFavorite = (vendorId: number) => (state: { vendor: VendorState }) =>
  state.vendor.favoriteVendorIds.includes(vendorId);
export const selectIsAddingFavorite = (state: { vendor: VendorState }) => state.vendor.isAddingFavorite;
export const selectFavoriteError = (state: { vendor: VendorState }) => state.vendor.favoriteError;
export const selectIsLoadingFavorites = (state: { vendor: VendorState }) => state.vendor.isLoadingFavorites;
export const selectIsLoadingMoreFavorites = (state: { vendor: VendorState }) => state.vendor.isLoadingMoreFavorites;
export const selectFavoritesHasMore = (state: { vendor: VendorState }) => state.vendor.favoritesHasMore;
export const selectFavoritesTotalCount = (state: { vendor: VendorState }) => state.vendor.favoritesTotalCount;

// ============================================================================
// EXPORTS
// ============================================================================

export const { setFilters, toggleFavoriteLocal, updateVendorStatus, clearFavoriteError } = vendorSlice.actions;
export default vendorSlice.reducer;
