// src/store/slices/authSlice.ts
/**
 * Authentication Slice
 *
 * Manages authentication state with async thunks for API integration.
 * Includes OTP rate limiting and comprehensive error handling.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Customer, Vendor, UserRole } from '../../types';
import { authService, SignupPayload } from '@/services/authService';
import * as SecureStore from 'expo-secure-store';

// ============================================================================
// Types
// ============================================================================

interface AuthState {
  user: Customer | Vendor | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  otpSent: boolean;
  lastOtpSentTime: number | null;
  resendCooldown: number; // seconds
  phoneNumber: string | null; // Store for OTP verification
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  otpSent: false,
  lastOtpSentTime: null,
  resendCooldown: 60, // 60 seconds cooldown
  phoneNumber: null,
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Send Login OTP
 */
export const sendLoginOTP = createAsyncThunk(
  'auth/sendLoginOTP',
  async (phoneNumber: string, { rejectWithValue }) => {
    try {
      const response = await authService.sendLoginOTP(phoneNumber);
      return { phoneNumber, otpSent: response.otpSent };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send OTP');
    }
  }
);

/**
 * Send Signup OTP
 */
export const sendSignupOTP = createAsyncThunk(
  'auth/sendSignupOTP',
  async (payload: SignupPayload, { rejectWithValue }) => {
    try {
      const response = await authService.sendSignupOTP(payload);
      return { phoneNumber: payload.phoneNumber, otpSent: response.otpSent };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create account');
    }
  }
);

/**
 * Verify OTP
 */
export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async (
    { phoneNumber, otp, type }: { phoneNumber: string; otp: string; type: 'login' | 'signup' },
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.verifyOTP(phoneNumber, otp, type);

      // Store token and user in SecureStore (hardware-backed encryption)
      if (response.token) {
        await SecureStore.setItemAsync('authToken', response.token);
        await SecureStore.setItemAsync('user', JSON.stringify(response.user));
      }

      return {
        user: response.user,
        token: response.token,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Invalid OTP. Please try again.');
    }
  }
);

/**
 * Resend OTP
 */
export const resendOTP = createAsyncThunk(
  'auth/resendOTP',
  async (phoneNumber: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const { lastOtpSentTime, resendCooldown } = state.auth;

      // Check rate limit
      if (lastOtpSentTime) {
        const elapsedSeconds = (Date.now() - lastOtpSentTime) / 1000;
        if (elapsedSeconds < resendCooldown) {
          const remainingSeconds = Math.ceil(resendCooldown - elapsedSeconds);
          return rejectWithValue(`Please wait ${remainingSeconds} seconds before resending`);
        }
      }

      const response = await authService.resendOTP(phoneNumber);
      return { otpSent: response.otpSent };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to resend OTP');
    }
  }
);

/**
 * Logout
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const { token } = state.auth;

      if (token) {
        await authService.logout(token);
      }

      // Clear SecureStore (remove encrypted tokens)
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('user');

      return null;
    } catch (error: any) {
      // Logout locally even if API fails
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('user');
      return null;
    }
  }
);

/**
 * Restore Session from SecureStore
 */
export const restoreSession = createAsyncThunk('auth/restoreSession', async (_, { rejectWithValue }) => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    const userString = await SecureStore.getItemAsync('user');

    if (token && userString) {
      const user = JSON.parse(userString);
      return { user, token };
    }

    return rejectWithValue('No session found');
  } catch (error: any) {
    return rejectWithValue('Failed to restore session');
  }
});

// ============================================================================
// Slice
// ============================================================================

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    // Update profile (for profile edit screen)
    updateProfile: (state, action: PayloadAction<Partial<Customer | Vendor>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload } as Customer | Vendor;
        // Update SecureStore (async operation, fire-and-forget)
        SecureStore.setItemAsync('user', JSON.stringify(state.user));
      }
    },
    // Reset OTP state
    resetOTPState: (state) => {
      state.otpSent = false;
      state.error = null;
      state.phoneNumber = null;
    },
  },
  extraReducers: (builder) => {
    // Send Login OTP
    builder
      .addCase(sendLoginOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendLoginOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.otpSent = action.payload.otpSent;
        state.phoneNumber = action.payload.phoneNumber;
        state.lastOtpSentTime = Date.now();
      })
      .addCase(sendLoginOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Send Signup OTP
    builder
      .addCase(sendSignupOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendSignupOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.otpSent = action.payload.otpSent;
        state.phoneNumber = action.payload.phoneNumber;
        state.lastOtpSentTime = Date.now();
      })
      .addCase(sendSignupOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Verify OTP
    builder
      .addCase(verifyOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.otpSent = false;
        state.error = null;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Resend OTP
    builder
      .addCase(resendOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resendOTP.fulfilled, (state) => {
        state.isLoading = false;
        state.lastOtpSentTime = Date.now();
      })
      .addCase(resendOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        return { ...initialState }; // Reset to initial state
      })
      .addCase(logoutUser.rejected, (state) => {
        return { ...initialState }; // Reset anyway
      });

    // Restore Session
    builder
      .addCase(restoreSession.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

// ============================================================================
// Exports
// ============================================================================

export const { clearError, updateProfile, resetOTPState } = authSlice.actions;
export default authSlice.reducer;
