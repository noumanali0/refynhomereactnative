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
import { deviceService } from '@/services/deviceService'; // Keep for device transfer flow (will be used after Firebase setup)
// import { tokenService } from '@/services/tokenService';
import { getErrorMessage } from '@/api/client';
import type {
  SignupRequest,
  VendorOnboardingRequest,
  UpdateProfileRequest,
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
  // Email/Phone verification status (for customers who signed up but didn't verify OTP)
  isEmailVerified: boolean;
  // Vendor onboarding status
  vendorOnboardingStatus: 'not_started' | 'in_progress' | 'pending_verification' | 'complete';
  // Logout in progress flag - prevents navigation race conditions
  isLoggingOut: boolean;
  // Session conflict info (for single-device login)
  sessionConflict: {
    hasExistingSession: boolean;
    hasActiveService: boolean;
    activeServiceType: 'service_request' | 'active_job' | 'pending_proposal' | null;
    existingDeviceName: string | null;
    requiresOtp: boolean;
  } | null;
  // Device transfer OTP sent flag
  deviceTransferOtpSent: boolean;
  // Password stored temporarily for device transfer (cleared after use)
  pendingPassword: string | null;
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
  isEmailVerified: true, // Default true, set false when login returns is_verified=false
  vendorOnboardingStatus: 'not_started',
  isLoggingOut: false,
  // Single-device login state
  sessionConflict: null,
  deviceTransferOtpSent: false,
  pendingPassword: null,
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
 *
 * Includes device tracking for single-device login enforcement
 */
export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async (
    { phoneNumber, otp }: { phoneNumber: string; otp: string },
    { rejectWithValue }
  ) => {
    try {
      // Get device info for session management
      const deviceId = await deviceService.getOrCreateDeviceId();
      const deviceName = deviceService.getDeviceName();

      // Get push token (best-effort, don't fail if not available)
      let pushToken: string | null = null;
      try {
        const { setupPushNotifications } = await import('@/utils/notifications');
        pushToken = await setupPushNotifications();
      } catch {
        // Push token is optional
      }

      const response = await authService.verifyOTP(
        phoneNumber,
        otp,
        deviceId,
        deviceName,
        pushToken
      );

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
 * Login - Login with phone and password (with device tracking for single-device enforcement)
 * POST /api/auth/login/
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (
    { phone, password }: { phone: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      // Get device info for single-device login enforcement
      const deviceId = await deviceService.getOrCreateDeviceId();
      const deviceName = deviceService.getDeviceName();

      // Use loginWithDevice to include device tracking
      const response = await authService.loginWithDevice(
        phone,
        password,
        deviceId,
        deviceName,
        null, // pushToken - will be registered separately after login
        false // forceLogoutOther - false for normal login
      );

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
        isVerified: response.isVerified,
        isOnboardingComplete: response.isOnboardingComplete,
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
 * Update User Profile - Update current user's profile
 * PATCH /api/auth/update-profile/
 *
 * Supports both Customer and Vendor profile updates
 * Handles file uploads for profile photos
 */
export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (payload: UpdateProfileRequest, { rejectWithValue }) => {
    try {
      const response = await authService.updateProfile(payload);

      // Update user in SecureStore
      await tokenService.saveUserData(response.user);

      return {
        user: response.user,
        message: response.message,
      };
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
 * Logout - Clear session, disconnect socket, and cleanup all persisted state
 *
 * IMPORTANT: This thunk performs complete cleanup to ensure no stale state
 * remains after logout, preventing issues on next login.
 *
 * Order matters:
 * 1. First: Socket disconnect & API logout (need tokens)
 * 2. Then: Clear tokens and local storage
 * 3. Finally: Redux state resets
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    // Get tokens before any cleanup (needed for socket/API)
    const refreshToken = await tokenService.getRefreshToken();
    const deviceId = await deviceService.getOrCreateDeviceId();

    // Import all required modules
    const { disconnectSocket, resetDispatchState } = await import('./dispatchSlice');
    const { clearReviewState } = await import('./reviewSlice');
    const { resetHistory: resetServiceHistory } = await import('./serviceHistorySlice');
    const { resetHistory: resetVendorHistory } = await import('./vendorHistorySlice');
    const { stopBackgroundLocationTracking } = await import('@/services/backgroundLocationService');
    const { clearActiveJob } = await import('@/services/activeJobService');
    const { clearCustomerActiveService } = await import('@/services/customerActiveServiceService');

    // STEP 1: Socket disconnect & API logout (these need tokens to work properly)
    try {
      await Promise.allSettled([
        dispatch(disconnectSocket()).unwrap().catch(() => {}),
        stopBackgroundLocationTracking().catch(() => {}),
        refreshToken
          ? authService.logout(refreshToken, deviceId).catch(() => {})
          : Promise.resolve(),
      ]);
      if (__DEV__) console.log('[Auth] Socket disconnected and API logout done');
    } catch (error) {
      if (__DEV__) console.log('[Auth] Socket/API cleanup error (non-fatal):', error);
    }

    // STEP 2: Clear all tokens and local storage
    try {
      await Promise.allSettled([
        tokenService.clearSession(),
        clearActiveJob(),
        clearCustomerActiveService(),
      ]);
      if (__DEV__) console.log('[Auth] All local storage cleared');
    } catch (error) {
      if (__DEV__) console.log('[Auth] Storage clear error (non-fatal):', error);
    }

    // STEP 3: Reset Redux state (sync, instant)
    dispatch(resetDispatchState());
    dispatch(clearReviewState());
    dispatch(resetServiceHistory());
    dispatch(resetVendorHistory());

    if (__DEV__) console.log('[Auth] Logout complete');

    return null;
  }
);

/**
 * Delete Account - Permanently delete user account
 *
 * This thunk performs complete cleanup similar to logout:
 * 1. Verify password with backend and delete account
 * 2. Disconnect WebSocket
 * 3. Reset all Redux slices
 * 4. Stop background location tracking
 * 5. Clear active job storage
 * 6. Clear all tokens from SecureStore
 *
 * IMPORTANT: This action is irreversible.
 */
export const deleteAccount = createAsyncThunk(
  'auth/deleteAccount',
  async (password: string, { dispatch, rejectWithValue }) => {
    try {
      // Step 1: Call backend to delete account (verifies password)
      await authService.deleteAccount(password);

      // Step 2: Cleanup (same as logout)
      // Disconnect WebSocket first
      const { disconnectSocket, resetDispatchState } = await import('./dispatchSlice');

      try {
        await dispatch(disconnectSocket()).unwrap();
      } catch (socketError) {
        // Socket might not be connected, ignore
        console.log('[Auth] Socket disconnect skipped during account deletion:', socketError);
      }

      // Reset dispatch state
      dispatch(resetDispatchState());

      // Reset other slices
      try {
        const { clearReviewState } = await import('./reviewSlice');
        const { resetHistory: resetServiceHistory } = await import('./serviceHistorySlice');
        const { resetHistory: resetVendorHistory } = await import('./vendorHistorySlice');

        dispatch(clearReviewState());
        dispatch(resetServiceHistory());
        dispatch(resetVendorHistory());

        if (__DEV__) console.log('[Auth] All user-specific slices reset after account deletion');
      } catch (sliceError) {
        console.log('[Auth] Slice reset skipped:', sliceError);
      }

      // Stop background location tracking
      try {
        const { stopBackgroundLocationTracking } = await import('@/services/backgroundLocationService');
        await stopBackgroundLocationTracking();
        if (__DEV__) console.log('[Auth] Background location stopped after account deletion');
      } catch (locationError) {
        console.log('[Auth] Background location stop skipped:', locationError);
      }

      // Clear persisted active job
      try {
        const { clearActiveJob } = await import('@/services/activeJobService');
        await clearActiveJob();
        if (__DEV__) console.log('[Auth] Active job cleared after account deletion');
      } catch (jobError) {
        console.log('[Auth] Clear active job skipped:', jobError);
      }

      // Clear all tokens and user data from SecureStore
      await tokenService.clearSession();

      if (__DEV__) {
        console.log('[Auth] Account deleted and all local data cleared');
      }

      return null;
    } catch (error: any) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

/**
 * Change Password Thunk
 * Changes user password after verifying current password.
 * Does NOT log user out - they remain authenticated.
 */
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (
    { currentPassword, newPassword }: { currentPassword: string; newPassword: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.changePassword(currentPassword, newPassword);

      if (__DEV__) {
        console.log('[Auth] Password changed successfully');
      }

      return response;
    } catch (error: any) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

/**
 * Deactivate Account Thunk
 * Temporarily deactivates the user account and logs them out.
 * User data is preserved but login is disabled.
 */
export const deactivateAccount = createAsyncThunk(
  'auth/deactivateAccount',
  async (password: string, { dispatch, rejectWithValue }) => {
    try {
      // Step 1: Call backend to deactivate account (verifies password)
      await authService.deactivateAccount(password);

      // Step 2: Full cleanup (same as logout/delete)
      // Disconnect WebSocket first
      const { disconnectSocket, resetDispatchState } = await import('./dispatchSlice');

      try {
        await dispatch(disconnectSocket()).unwrap();
      } catch (socketError) {
        console.log('[Auth] Socket disconnect skipped during deactivation:', socketError);
      }

      // Reset dispatch state
      dispatch(resetDispatchState());

      // Reset other slices
      try {
        const { clearReviewState } = await import('./reviewSlice');
        const { resetHistory: resetServiceHistory } = await import('./serviceHistorySlice');
        const { resetHistory: resetVendorHistory } = await import('./vendorHistorySlice');

        dispatch(clearReviewState());
        dispatch(resetServiceHistory());
        dispatch(resetVendorHistory());

        if (__DEV__) console.log('[Auth] All user-specific slices reset after deactivation');
      } catch (sliceError) {
        console.log('[Auth] Slice reset skipped:', sliceError);
      }

      // Stop background location tracking
      try {
        const { stopBackgroundLocationTracking } = await import('@/services/backgroundLocationService');
        await stopBackgroundLocationTracking();
        if (__DEV__) console.log('[Auth] Background location stopped after deactivation');
      } catch (locationError) {
        console.log('[Auth] Background location stop skipped:', locationError);
      }

      // Clear persisted active job
      try {
        const { clearActiveJob } = await import('@/services/activeJobService');
        await clearActiveJob();
        if (__DEV__) console.log('[Auth] Active job cleared after deactivation');
      } catch (jobError) {
        console.log('[Auth] Clear active job skipped:', jobError);
      }

      // Clear all tokens and user data from SecureStore
      await tokenService.clearSession();

      if (__DEV__) {
        console.log('[Auth] Account deactivated and all local data cleared');
      }

      return null;
    } catch (error: any) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

/**
 * Reactivate Account - Reactivate a deactivated user account
 * POST /api/auth/reactivate-account/
 *
 * This thunk reactivates a deactivated account after password verification.
 * On success, it stores tokens and returns user data (same as login).
 */
export const reactivateAccount = createAsyncThunk(
  'auth/reactivateAccount',
  async (
    { phone, password }: { phone: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.reactivateAccount(phone, password);

      if (__DEV__) {
        console.log('[reactivateAccount] Backend response:', {
          isVerified: response.isVerified,
          isOnboardingComplete: response.isOnboardingComplete,
          vendorProfile: (response.user as any).vendorProfile,
          userRole: response.user.role,
        });
      }

      // Store tokens and user in SecureStore (same as login)
      await tokenService.saveSession(
        response.access,
        response.refresh,
        response.user
      );

      return {
        user: response.user,
        accessToken: response.access,
        refreshToken: response.refresh,
        isVerified: response.isVerified,
        isOnboardingComplete: response.isOnboardingComplete,
      };
    } catch (error: any) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
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
// Device Session Management Thunks (Single-Device Login)
// ============================================================================

/**
 * Check Session Status - Pre-login check for device conflicts
 * POST /api/auth/check-session/
 */
export const checkSessionStatus = createAsyncThunk(
  'auth/checkSessionStatus',
  async ({ phone }: { phone: string }, { rejectWithValue }) => {
    try {
      const deviceId = await deviceService.getOrCreateDeviceId();
      const result = await authService.checkSessionStatus(phone, deviceId);

      return {
        ...result,
        deviceId,
      };
    } catch (error: any) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

/**
 * Request Device Transfer OTP - Send OTP for device transfer
 * POST /api/auth/request-device-transfer-otp/
 */
export const requestDeviceTransferOTP = createAsyncThunk(
  'auth/requestDeviceTransferOTP',
  async ({ phone, password }: { phone: string; password: string }, { rejectWithValue }) => {
    try {
      const deviceId = await deviceService.getOrCreateDeviceId();
      const result = await authService.requestDeviceTransferOTP(phone, deviceId);

      return {
        ...result,
        phone,
        password, // Store for device transfer verification
      };
    } catch (error: any) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

/**
 * Verify Device Transfer - Verify OTP and transfer session
 * POST /api/auth/verify-device-transfer/
 */
export const verifyDeviceTransfer = createAsyncThunk(
  'auth/verifyDeviceTransfer',
  async (
    { phone, code, password }: { phone: string; code: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const { deviceId, deviceName } = await deviceService.getDeviceInfo();

      // Get push token (best-effort)
      let pushToken: string | null = null;
      try {
        const { setupPushNotifications } = await import('@/utils/notifications');
        pushToken = await setupPushNotifications();
      } catch {
        // Push token is optional
      }

      const response = await authService.verifyDeviceTransfer({
        phone,
        code,
        password,
        deviceId,
        deviceName,
        pushToken,
      });

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
        isVerified: response.isVerified,
        isOnboardingComplete: response.isOnboardingComplete,
        transferredFromDevice: response.transferredFromDevice,
      };
    } catch (error: any) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

/**
 * Register Push Token - Register device push token with backend
 * POST /api/auth/register-push-token/
 */
export const registerPushToken = createAsyncThunk(
  'auth/registerPushToken',
  async ({ pushToken }: { pushToken: string }, { rejectWithValue, getState }) => {
    try {
      // IMPORTANT: Check if user is still authenticated before making API call
      // This prevents continuous 401 retries after logout/device transfer
      const state = getState() as { auth: AuthState };
      if (!state.auth.isAuthenticated) {
        console.log('[Auth] Skipping push token registration - user not authenticated');
        return { success: false };
      }

      const deviceId = await deviceService.getOrCreateDeviceId();
      await authService.registerPushToken(pushToken, deviceId);
      return { success: true };
    } catch (error: any) {
      // Best-effort, don't fail
      console.error('[Auth] Failed to register push token:', error);
      return { success: false };
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

    // Clear session conflict (for single-device login)
    clearSessionConflict: (state) => {
      state.sessionConflict = null;
      state.deviceTransferOtpSent = false;
      state.pendingPassword = null;
    },

    // Set session conflict (used when login returns conflict)
    setSessionConflict: (state, action: PayloadAction<AuthState['sessionConflict']>) => {
      state.sessionConflict = action.payload;
    },

    // Clear logout state (called after navigation to login completes)
    clearLogoutState: (state) => {
      state.isLoggingOut = false;
      state.isLoading = false;
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

        // Store email/phone verification status from backend
        // If user signed up but didn't verify OTP, isVerified will be false
        state.isEmailVerified = action.payload.isVerified ?? true;

        // Set vendor onboarding status based on backend response
        if (action.payload.user.role === 'vendor') {
          if (!action.payload.isOnboardingComplete) {
            // Vendor hasn't completed CNIC + categories submission
            state.vendorOnboardingStatus = 'in_progress';
          } else if (!action.payload.isVerified) {
            // Vendor completed onboarding but awaiting admin approval
            state.vendorOnboardingStatus = 'pending_verification';
          } else {
            // Vendor is fully verified
            state.vendorOnboardingStatus = 'complete';
          }
        } else {
          // Customers are always complete (vendor onboarding not applicable)
          state.vendorOnboardingStatus = 'complete';
        }
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

        // Recalculate vendor onboarding status when user is updated
        // This fixes infinite loop when vendor is verified and clicks refresh
        if (action.payload.user.role === 'vendor') {
          const vendorProfile = (action.payload.user as any).vendorProfile;
          const isOnboardingComplete = vendorProfile &&
            vendorProfile.cnic &&
            vendorProfile.cnic.trim().length > 0;

          if (!isOnboardingComplete) {
            state.vendorOnboardingStatus = 'in_progress';
          } else if (!vendorProfile.verified) {
            state.vendorOnboardingStatus = 'pending_verification';
          } else {
            state.vendorOnboardingStatus = 'complete';
          }

          if (__DEV__) {
            console.log('[fetchUserProfile.fulfilled] Vendor status updated:', {
              cnic: vendorProfile?.cnic,
              verified: vendorProfile?.verified,
              vendorOnboardingStatus: state.vendorOnboardingStatus,
            });
          }
        }
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // Update User Profile
    // ========================================================================
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
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
        state.isLoggingOut = true; // Prevent navigation during logout
      })
      .addCase(logoutUser.fulfilled, (state) => {
        // Clear all sensitive data but keep isLoggingOut = true
        // This prevents navigation race conditions - clearLogoutState will reset it
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
        state.otpSent = false;
        state.lastOtpSentTime = null;
        state.phoneNumber = null;
        state.vendorOnboardingStatus = 'not_started';
        state.sessionConflict = null;
        state.deviceTransferOtpSent = false;
        state.pendingPassword = null;
        // isLoggingOut stays TRUE until clearLogoutState is called after navigation
      })
      .addCase(logoutUser.rejected, (state) => {
        // Reset anyway on failure, same approach
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
        state.otpSent = false;
        state.lastOtpSentTime = null;
        state.phoneNumber = null;
        state.vendorOnboardingStatus = 'not_started';
        state.sessionConflict = null;
        state.deviceTransferOtpSent = false;
        state.pendingPassword = null;
        // isLoggingOut stays TRUE until clearLogoutState is called
      });

    // ========================================================================
    // Delete Account
    // ========================================================================
    builder
      .addCase(deleteAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, () => {
        return { ...initialState }; // Reset to initial state (account deleted)
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // Change Password
    // ========================================================================
    builder
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        // User remains logged in after password change
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // Deactivate Account
    // ========================================================================
    builder
      .addCase(deactivateAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deactivateAccount.fulfilled, () => {
        return { ...initialState }; // Reset to initial state (account deactivated)
      })
      .addCase(deactivateAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // Reactivate Account
    // ========================================================================
    builder
      .addCase(reactivateAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(reactivateAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user as any;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;

        // Set vendor onboarding status based on backend response
        if (action.payload.user.role === 'vendor') {
          if (!action.payload.isOnboardingComplete) {
            state.vendorOnboardingStatus = 'in_progress';
          } else if (!action.payload.isVerified) {
            state.vendorOnboardingStatus = 'pending_verification';
          } else {
            state.vendorOnboardingStatus = 'complete';
          }
        } else {
          state.vendorOnboardingStatus = 'complete';
        }

        if (__DEV__) {
          console.log('[reactivateAccount.fulfilled] Status set:', {
            isOnboardingComplete: action.payload.isOnboardingComplete,
            isVerified: action.payload.isVerified,
            vendorOnboardingStatus: state.vendorOnboardingStatus,
          });
        }
      })
      .addCase(reactivateAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
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
        if (state.user?.role === 'vendor') {
          const vendorProfile = state.user.vendorProfile;
          // Check if onboarding is complete: CNIC must be submitted and not empty
          // (Backend creates empty VendorProfile on signup, so we check CNIC has value)
          const isOnboardingComplete = vendorProfile &&
            vendorProfile.cnic &&
            vendorProfile.cnic.trim().length > 0;

          if (__DEV__) {
            console.log('[restoreSession.fulfilled] Vendor check:', {
              hasVendorProfile: !!vendorProfile,
              cnic: vendorProfile?.cnic,
              verified: vendorProfile?.verified,
              isOnboardingComplete,
            });
          }

          if (!isOnboardingComplete) {
            // No CNIC = needs to complete onboarding form
            state.vendorOnboardingStatus = 'in_progress';
          } else if (!vendorProfile.verified) {
            // Has completed onboarding but not approved by admin
            state.vendorOnboardingStatus = 'pending_verification';
          } else {
            // Verified by admin
            state.vendorOnboardingStatus = 'complete';
          }
        } else {
          // Customers are always complete
          state.vendorOnboardingStatus = 'complete';
        }
      })
      .addCase(restoreSession.rejected, (state) => {
        state.isLoading = false;
      });

    // ========================================================================
    // Check Session Status (Single-Device Login)
    // ========================================================================
    builder
      .addCase(checkSessionStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkSessionStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.hasExistingSession) {
          state.sessionConflict = {
            hasExistingSession: action.payload.hasExistingSession,
            hasActiveService: action.payload.hasActiveService,
            activeServiceType: action.payload.activeServiceType,
            existingDeviceName: action.payload.existingDeviceName,
            requiresOtp: action.payload.requiresOtp,
          };
        } else {
          state.sessionConflict = null;
        }
      })
      .addCase(checkSessionStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // Request Device Transfer OTP
    // ========================================================================
    builder
      .addCase(requestDeviceTransferOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestDeviceTransferOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.deviceTransferOtpSent = true;
        state.phoneNumber = action.payload.phone;
        state.pendingPassword = action.payload.password;
        state.lastOtpSentTime = Date.now();
      })
      .addCase(requestDeviceTransferOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // Verify Device Transfer
    // ========================================================================
    builder
      .addCase(verifyDeviceTransfer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyDeviceTransfer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.error = null;
        // Clear session conflict state
        state.sessionConflict = null;
        state.deviceTransferOtpSent = false;
        state.pendingPassword = null;

        // Set vendor onboarding status based on backend response
        if (action.payload.user.role === 'vendor') {
          if (!action.payload.isOnboardingComplete) {
            state.vendorOnboardingStatus = 'in_progress';
          } else if (!action.payload.isVerified) {
            state.vendorOnboardingStatus = 'pending_verification';
          } else {
            state.vendorOnboardingStatus = 'complete';
          }
        } else {
          state.vendorOnboardingStatus = 'complete';
        }
      })
      .addCase(verifyDeviceTransfer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ========================================================================
    // Register Push Token (best-effort, no state changes needed)
    // ========================================================================
    builder
      .addCase(registerPushToken.fulfilled, () => {
        // No state changes needed
      })
      .addCase(registerPushToken.rejected, () => {
        // Best-effort, no state changes needed
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
  clearSessionConflict,
  setSessionConflict,
  clearLogoutState,
} = authSlice.actions;

export default authSlice.reducer;
