import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, Customer, Vendor } from '../../types';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<Customer | Vendor>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
    updateProfile: (state, action: PayloadAction<Partial<Customer | Vendor>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload } as Customer | Vendor;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { loginSuccess, logout, updateProfile, setLoading } = authSlice.actions;
export default authSlice.reducer;
