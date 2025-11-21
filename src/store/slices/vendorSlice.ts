import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Vendor, VendorFilters } from '../../types';
import { MOCK_VENDORS } from '../../utils/mockData';

interface VendorState {
  vendors: Vendor[];
  filteredVendors: Vendor[];
  filters: VendorFilters;
  favoriteVendorIds: string[];
}

const initialState: VendorState = {
  vendors: MOCK_VENDORS,
  filteredVendors: MOCK_VENDORS,
  filters: {},
  favoriteVendorIds: [],
};

const vendorSlice = createSlice({
  name: 'vendor',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<VendorFilters>) => {
      state.filters = action.payload;
      state.filteredVendors = filterVendors(state.vendors, action.payload);
    },
    toggleFavorite: (state, action: PayloadAction<string>) => {
      const vendorId = action.payload;
      if (state.favoriteVendorIds.includes(vendorId)) {
        state.favoriteVendorIds = state.favoriteVendorIds.filter(id => id !== vendorId);
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
  },
});

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

export const { setFilters, toggleFavorite, updateVendorStatus } = vendorSlice.actions;
export default vendorSlice.reducer;
