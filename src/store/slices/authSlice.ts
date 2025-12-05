/**
 * Authentication Slice - Backend Integrated
 *
 * Manages authentication state with Django backend integration.
 * Features:
 * - Real API integration (no mocks)
 * - JWT token management (access + refresh)
 * - SecureStore persistence
 * - OTP rate limiting
 * - Comprehensive error handling
 * - Vendor onboarding support
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Customer, Vendor, UserRole } from '../../types';
import { authService } from '@/services/authService';
// import { tokenService } from '@/services/tokenService';
import { getErrorMessage } from '@/api/client';
import type {
  SignupRequest,
  VendorOnboardingRequest,
} from '@/types/api';
import tokenService from '@/services/tokenService';

// ============================================================================
// Types
// ============================================================================

interface AuthState {
  user: Customer | Vendor | null;
  token: string | null; // Access token
  refreshToken: string | null; // Refresh token
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  otpSent: boolean;
  lastOtpSentTime: number | null;
  resendCooldown: number; // seconds
  phoneNumber: string | null; // Store for OTP verification
  // Vendor onboarding status
  vendorOnboardingStatus: 'not_started' | 'in_progress' | 'pending_verification' | 'complete';
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  otpSent: false,
  lastOtpSentTime: null,
  resendCooldown: 60, // 60 seconds cooldown
  phoneNumber: null,
  vendorOnboardingStatus: 'not_started',
};

// ============================================================================
// Async Thunks - New Backend Integration
// ============================================================================

/**
 * Signup - Register new user (customer or vendor)
 * POST /api/auth/signup/
 */
export const signupUser = createAsyncThunk(
  'auth/signup',
  async (payload: SignupRequest, { rejectWithValue }) => {
    try {
      const response = await authService.signup(payload);
      return {
        phoneNumber: payload.phone,
        message: response.message,
        status: response.status,
      };
    } catch (error: any) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

/**
 * Request OTP - Send OTP to phone number
 * POST /api/auth/otp-request/
 */
export const requestOTP = createAsyncThunk(
  'auth/requestOTP',
  async (phoneNumber: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const { lastOtpSentTime, resendCooldown } = state.auth;

      // Check rate limit
      if (lastOtpSentTime) {
        const elapsedSeconds = (Date.now() - lastOtpSentTime) / 1000;
        if (elapsedSeconds < resendCooldown) {
          const remainingSeconds = Math.ceil(resendCooldown - elapsedSeconds);
          return rejectWithValue(`Please wait ${remainingSeconds} seconds before requesting OTP`);
        }
      }

      const response = await authService.requestOTP(phoneNumber);
      return { phoneNumber, message: response.detail };
    } catch (error: any) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

/**
 * Verify OTP - Verify OTP code and complete signup/login
 * POST /api/auth/otp-verify/
 */
export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async (
    { phoneNumber, otp }: { phoneNumber: string; otp: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.verifyOTP(phoneNumber, otp);

      // Store tokens and user in SecureStore
      await tokenService.saveSession(
        response.access,
        response.refresh,
        response.user
      );

      return {
        user: response.user,
        accessToken: response.access,
        refreshToken: response.refresh,
        status: response.status,
      };
    } catch (error: any) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

/**
 * Login - Login with phone and password
 * POST /api/auth/login/
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (
    { phone, password }: { phone: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.login(phone, password);
      console.log("🚀 ~ response:", response)

      // Store tokens and user in SecureStore
      await tokenService.saveSession(
        response.access,
        response.refresh,
        response.user
      );

      return {
        user: response.user,
        accessToken: response.access,
        refreshToken: response.refresh,
      };
    } catch (error: any) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

/**
 * Vendor Onboarding - Complete vendor profile
 * POST /api/auth/vendor-onboarding/
 */
export const vendorOnboarding = createAsyncThunk(
  'auth/vendorOnboarding',
  async (payload: VendorOnboardingRequest, { rejectWithValue }) => {
    try {
      const response = await authService.vendorOnboarding(payload);
      return {
        vendorId: response.vendor_id,
        status: response.status,
        message: response.message,
      };
    } catch (error: any) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch User Profile - Get updated user data
 * GET /api/auth/me/
 */
export const fetchUserProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getProfile();
      console.log("🚀 ~ user:", user)

      // Update user in SecureStore
      await tokenService.saveUserData(user);

      return { user };
    } catch (error: any) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

/**
 * Refresh Access Token - Get new access token
 * POST /api/auth/refresh/
 */
export const refreshAccessToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const { refreshToken } = state.auth;

      if (!refreshToken) {
        return rejectWithValue('No refresh token available');
      }

      const newAccessToken = await authService.refreshToken(refreshToken);
      console.log("🚀 ~ newAccessToken:", newAccessToken)

      // Save new access token
      await tokenService.saveAccessToken(newAccessToken);

      return { accessToken: newAccessToken };
    } catch (error: any) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

/**
 * Logout - Clear session and disconnect socket
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    try {
      // Disconnect WebSocket first (imported dynamically to avoid circular deps)
      const { disconnectSocket, resetDispatchState } = await import('./dispatchSlice');

      // Properly await the async thunk dispatch
      try {
        await dispatch(disconnectSocket()).unwrap();
      } catch (socketError) {
        // Socket might not be connected, ignore this error
        console.log('[Auth] Socket disconnect skipped:', socketError);
      }

      // Reset dispatch state (sync action)
      dispatch(resetDispatchState());

      await authService.logout();

      // Clear all tokens and user data from SecureStore
      await tokenService.clearSession();

      return null;
    } catch (error: any) {
      // Logout locally even if API fails
      await tokenService.clearSession();
      return null;
    }
  }
);

/**
 * Restore Session from SecureStore
 */
export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      const session = await tokenService.restoreSession();

      if (!session) {
        return rejectWithValue('No session found');
      }

      // Check if token is expired
      const isExpired = await tokenService.isAccessTokenExpired();

      if (isExpired) {
        // Try to refresh token
        try {
          const newAccessToken = await authService.refreshToken(session.refreshToken);
          await tokenService.saveAccessToken(newAccessToken);

          return {
            user: session.user,
            accessToken: newAccessToken,
            refreshToken: session.refreshToken,
          };
        } catch (refreshError) {
          // Refresh failed, clear session
          await tokenService.clearSession();
          return rejectWithValue('Session expired');
        }
      }

      return {
        user: session.user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      };
    } catch (error: any) {
      return rejectWithValue('Failed to restore session');
    }
  }
);

// ============================================================================
// Legacy Thunks (Backward Compatibility)
// ============================================================================

/**
 * @deprecated Use requestOTP instead
 */
export const sendLoginOTP = requestOTP;

/**
 * @deprecated Use signupUser + requestOTP instead
 */
export const sendSignupOTP = createAsyncThunk(
  'auth/sendSignupOTP',
  async (payload: any, { dispatch, rejectWithValue }) => {
    try {
      // Redirect to new signup flow
      await dispatch(signupUser(payload));
      return { phoneNumber: payload.phoneNumber, otpSent: true };
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * @deprecated Use requestOTP instead
 */
export const resendOTP = requestOTP;

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
        tokenService.saveUserData(state.user);
      }
    },

    // Reset OTP state
    resetOTPState: (state) => {
      state.otpSent = false;
      state.error = null;
      state.phoneNumber = null;
    },

    // Set phone number (for OTP flow)
    setPhoneNumber: (state, action: PayloadAction<string>) => {
      state.phoneNumber = action.payload;
    },
  },
  extraReducers: (builder) => {
    // ========================================================================
    // Signup
    // ========================================================================
    builder
      .addCase(signupUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.otpSent = true;
        state.phoneNumber = action.payload.phoneNumber;
        state.lastOtpSentTime = Date.now();
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // Request OTP
    // ========================================================================
    builder
      .addCase(requestOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.otpSent = true;
        state.phoneNumber = action.payload.phoneNumber;
        state.lastOtpSentTime = Date.now();
      })
      .addCase(requestOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // Verify OTP
    // ========================================================================
    builder
      .addCase(verifyOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.otpSent = false;
        state.error = null;

        // Set vendor onboarding status
        if (action.payload.status === 'onboarding_required') {
          state.vendorOnboardingStatus = 'in_progress';
        } else {
          state.vendorOnboardingStatus = 'complete';
        }
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // Login
    // ========================================================================
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.error = null;
        state.vendorOnboardingStatus = 'complete';
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // Vendor Onboarding
    // ========================================================================
    builder
      .addCase(vendorOnboarding.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(vendorOnboarding.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vendorOnboardingStatus = 'pending_verification';
        state.error = null;
      })
      .addCase(vendorOnboarding.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // Fetch User Profile
    // ========================================================================
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // Refresh Access Token
    // ========================================================================
    builder
      .addCase(refreshAccessToken.pending, (state) => {
        // Don't set loading for token refresh (happens in background)
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.token = action.payload.accessToken;
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        // Token refresh failed - logout user
        return { ...initialState };
      });

    // ========================================================================
    // Logout
    // ========================================================================
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

    // ========================================================================
    // Restore Session
    // ========================================================================
    builder
      .addCase(restoreSession.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;

        // Set vendor onboarding status based on user data
        if (state.user?.role === 'vendor' && state.user.vendorProfile) {
          state.vendorOnboardingStatus = state.user.vendorProfile.verified
            ? 'complete'
            : 'pending_verification';
        } else {
          state.vendorOnboardingStatus = 'complete';
        }
      })
      .addCase(restoreSession.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

// ============================================================================
// Exports
// ============================================================================

export const {
  clearError,
  updateProfile,
  resetOTPState,
  setPhoneNumber,
} = authSlice.actions;

export default authSlice.reducer;
