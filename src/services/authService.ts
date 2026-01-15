/**
 * Authentication Service
 *
 * Centralized service for all authentication-related API calls.
 * Connects to Django backend at /api/auth/*
 *
 * All methods use the apiClient which automatically:
 * - Adds JWT token to requests
 * - Refreshes expired tokens
 * - Handles 401 errors
 */

import { apiClient } from '@/api/client';
import { AUTH_ENDPOINTS } from '@/api/endpoints';
import { deviceService } from './deviceService';
import type {
  SignupRequest,
  SignupResponse,
  OTPRequest,
  OTPRequestResponse,
  OTPVerifyRequest,
  OTPVerifyResponse,
  LoginRequest,
  LoginResponse,
  TokenRefreshResponse,
  ProfileResponse,
  VendorOnboardingRequest,
  VendorOnboardingResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UserAPI,
} from '@/types/api';
import { Customer, Vendor, User } from '@/types';

// ============================================================================
// TYPE CONVERSIONS
// ============================================================================

/**
 * Convert Django backend user to frontend User type
 * Handles field name mapping and computed properties
 */
function convertAPIUserToFrontend(apiUser: UserAPI): Customer | Vendor {
  const baseUser: User = {
    id: apiUser.id,
    phone: apiUser.phone,
    firstName: apiUser.first_name,
    lastName: apiUser.last_name,
    role: apiUser.role,
    address: apiUser.address,
    city: apiUser.city,
    subscriptionTier: apiUser.subscription_tier,
    favoriteVendors: (apiUser.favorite_vendors || []).map(convertAPIUserToFrontend),
    vendorProfile: apiUser.vendor_profile
      ? {
          id: apiUser.vendor_profile.id,
          verified: apiUser.vendor_profile.verified,
          cnic: apiUser.vendor_profile.cnic,
          city: apiUser.vendor_profile.city,
          bio: apiUser.vendor_profile.bio,
          // Use profile_photo_url (full URL) instead of profile_photo (relative path)
          profilePhoto: apiUser.vendor_profile.profile_photo_url || apiUser.vendor_profile.profile_photo,
          idVerificationPhoto: apiUser.vendor_profile.id_verification_photo,
          latitude: apiUser.vendor_profile.latitude,
          longitude: apiUser.vendor_profile.longitude,
          serviceRadiusKm: apiUser.vendor_profile.service_radius_km,
          locationUpdatedAt: apiUser.vendor_profile.location_updated_at,
          averageRating: apiUser.vendor_profile.average_rating,
          totalReviews: apiUser.vendor_profile.total_reviews,
          completedJobs: apiUser.vendor_profile.completed_jobs,
          // Member since date (when vendor was approved)
          memberSince: apiUser.vendor_profile.member_since,
          // Active service requests count
          activeRequests: apiUser.vendor_profile.active_requests || 0,
          // Rating distribution for profile screen
          rating_distribution: apiUser.vendor_profile.rating_distribution,
          // Service categories for edit profile
          categories: apiUser.vendor_profile.categories || [],
        }
      : null,

    // Computed fields
    name: `${apiUser.first_name} ${apiUser.last_name}`.trim(),
    phoneNumber: apiUser.phone, // Legacy alias
    // Use profile_photo_url for full URL, fallback to vendor_profile photo
    profilePhoto: apiUser.profile_photo_url || apiUser.vendor_profile?.profile_photo || undefined,
    profilePhotoUrl: apiUser.profile_photo_url || undefined,
  };

  // Return as Customer or Vendor based on role
  if (apiUser.role === 'vendor' && baseUser.vendorProfile) {
    return {
      ...baseUser,
      role: 'vendor',
      vendorProfile: baseUser.vendorProfile,
      // Legacy computed fields for backward compatibility
      cnic: baseUser.vendorProfile.cnic,
      rating: baseUser.vendorProfile.averageRating,
      totalReviews: baseUser.vendorProfile.totalReviews,
      verified: baseUser.vendorProfile.verified,
      isOnline: false, // Not in backend, default to false
      idVerificationUrl: baseUser.vendorProfile.idVerificationPhoto || undefined,
    } as Vendor;
  } else {
    return {
      ...baseUser,
      role: 'customer',
      vendorProfile: null,
    } as Customer;
  }
}

// ============================================================================
// AUTH SERVICE CLASS
// ============================================================================

class AuthService {
  /**
   * Signup - Register a new user (customer or vendor)
   * POST /api/auth/signup/
   *
   * @param payload - Signup data
   * @returns Promise with signup response
   */
  async signup(payload: SignupRequest): Promise<SignupResponse> {
    try {
      const response = await apiClient.post<SignupResponse>(AUTH_ENDPOINTS.SIGNUP, payload);
      return response.data;
    } catch (error) {
      console.error('[AuthService] Signup error:', error);
      throw error;
    }
  }

  /**
   * Request OTP - Send OTP code to phone number
   * POST /api/auth/otp-request/
   *
   * @param phone - Phone number
   * @returns Promise with OTP request response
   */
  async requestOTP(phone: string): Promise<OTPRequestResponse> {
    try {
      const payload: OTPRequest = {
        phone,
        purpose: 'signup',
      };

      const response = await apiClient.post<OTPRequestResponse>(
        AUTH_ENDPOINTS.OTP_REQUEST,
        payload
      );
      return response.data;
    } catch (error) {
      console.error('[AuthService] OTP request error:', error);
      throw error;
    }
  }

  /**
   * Verify OTP - Verify OTP code and complete authentication
   * POST /api/auth/otp-verify/
   *
   * @param phone - Phone number
   * @param code - OTP code (6 digits)
   * @returns Promise with tokens and user data
   */
  async verifyOTP(
    phone: string,
    code: string,
    deviceId?: string,
    deviceName?: string,
    pushToken?: string | null
  ): Promise<{
    access: string;
    refresh: string;
    user: Customer | Vendor;
    status: 'onboarding_complete' | 'onboarding_required';
    device_id?: string;
  }> {
    try {
      const payload: OTPVerifyRequest = {
        phone,
        code,
        purpose: 'signup',
        device_id: deviceId,
        device_name: deviceName,
        push_token: pushToken,
      };

      const response = await apiClient.post<OTPVerifyResponse>(
        AUTH_ENDPOINTS.OTP_VERIFY,
        payload
      );

      // Convert API user to frontend format
      const user = convertAPIUserToFrontend(response.data.user);

      return {
        access: response.data.access,
        refresh: response.data.refresh,
        user,
        status: response.data.status,
        device_id: response.data.device_id,
      };
    } catch (error) {
      console.error('[AuthService] OTP verify error:', error);
      throw error;
    }
  }

  /**
   * Login - Login with phone and password
   * POST /api/auth/login/
   *
   * @param phone - Phone number
   * @param password - Password
   * @returns Promise with tokens, user data, and verification status
   */
  async login(phone: string, password: string): Promise<{
    access: string;
    refresh: string;
    user: Customer | Vendor;
    isVerified: boolean;
    isOnboardingComplete: boolean;
  }> {
    try {
      const payload: LoginRequest = {
        phone,
        password,
      };

      const response = await apiClient.post<LoginResponse>(AUTH_ENDPOINTS.LOGIN, payload);

      // Convert API user to frontend format
      const user = convertAPIUserToFrontend(response.data.user);

      return {
        access: response.data.access,
        refresh: response.data.refresh,
        user,
        isVerified: response.data.is_verified,
        isOnboardingComplete: response.data.is_onboarding_complete,
      };
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh Token - Get new access token using refresh token
   * POST /api/auth/refresh/
   *
   * @param refreshToken - Refresh token
   * @returns Promise with new access token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const response = await apiClient.post<TokenRefreshResponse>(AUTH_ENDPOINTS.REFRESH, {
        refresh: refreshToken,
      });

      return response.data.access;
    } catch (error) {
      console.error('[AuthService] Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Get Profile - Get current user profile
   * GET /api/auth/me/
   *
   * Requires authentication (token in header)
   * @returns Promise with user profile
   */
  async getProfile(): Promise<Customer | Vendor> {
    try {
      const response = await apiClient.get<ProfileResponse>(AUTH_ENDPOINTS.ME);

      // Convert API user to frontend format
      return convertAPIUserToFrontend(response.data);
    } catch (error) {
      console.error('[AuthService] Get profile error:', error);
      throw error;
    }
  }

  /**
   * Vendor Onboarding - Complete vendor profile after signup
   * POST /api/auth/vendor-onboarding/
   *
   * Uses multipart/form-data for file uploads (React Native)
   *
   * @param payload - Vendor onboarding data
   * @returns Promise with onboarding response
   */
  async vendorOnboarding(payload: VendorOnboardingRequest): Promise<VendorOnboardingResponse> {
    try {
      // Helper to check if string is a file URI (React Native)
      const isFileUri = (value: unknown): value is string =>
        typeof value === 'string' && (value.startsWith('file://') || value.startsWith('content://'));

      // Check if we have image URIs (React Native returns file:// or content:// URIs)
      const hasImageUris =
        isFileUri(payload.profile_photo) || isFileUri(payload.id_verification_photo);

      if (hasImageUris) {
        // Use FormData for file uploads in React Native
        const formData = new FormData();

        // Add required fields
        formData.append('phone', payload.phone);
        formData.append('cnic', payload.cnic);

        // Add optional fields
        if (payload.address) formData.append('address', payload.address);
        if (payload.city) formData.append('city', payload.city);
        if (payload.bio) formData.append('bio', payload.bio);
        if (payload.experience) formData.append('experience', payload.experience.toString());

        // Add profile photo as file object (React Native format)
        if (isFileUri(payload.profile_photo)) {
          const uri = payload.profile_photo;
          const filename = uri.split('/').pop() || 'profile.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

          formData.append('profile_photo', {
            uri,
            name: filename,
            type,
          } as any);
        }

        // Add ID verification photo as file object (React Native format)
        if (isFileUri(payload.id_verification_photo)) {
          const uri = payload.id_verification_photo;
          const filename = uri.split('/').pop() || 'id_verification.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

          formData.append('id_verification_photo', {
            uri,
            name: filename,
            type,
          } as any);
        }

        // Add service categories
        if (payload.service_categories) {
          payload.service_categories.forEach((cat) => {
            formData.append('service_categories', cat.toString());
          });
        }

        const response = await apiClient.post<VendorOnboardingResponse>(
          AUTH_ENDPOINTS.VENDOR_ONBOARDING,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        return response.data;
      } else {
        // Use JSON (for web or when no file URIs)
        const response = await apiClient.post<VendorOnboardingResponse>(
          AUTH_ENDPOINTS.VENDOR_ONBOARDING,
          payload
        );

        return response.data;
      }
    } catch (error) {
      console.error('[AuthService] Vendor onboarding error:', error);
      throw error;
    }
  }

  /**
   * Update Profile - Update current user's profile
   * PATCH /api/auth/update-profile/
   *
   * Uses multipart/form-data for file uploads (React Native)
   * All fields are optional for partial updates
   *
   * @param payload - Profile update data
   * @returns Promise with updated user data
   */
  async updateProfile(payload: UpdateProfileRequest): Promise<{
    message: string;
    user: Customer | Vendor;
  }> {
    try {
      // Helper to check if string is a file URI (React Native)
      const isFileUri = (value: unknown): value is string =>
        typeof value === 'string' && (value.startsWith('file://') || value.startsWith('content://'));

      // Check if we have image URI
      const hasImageUri = isFileUri(payload.profile_photo);

      if (hasImageUri) {
        // Use FormData for file uploads in React Native
        const formData = new FormData();

        // Add text fields (only if provided)
        if (payload.first_name !== undefined) formData.append('first_name', payload.first_name);
        if (payload.last_name !== undefined) formData.append('last_name', payload.last_name);
        if (payload.address !== undefined) formData.append('address', payload.address);
        if (payload.city !== undefined) formData.append('city', payload.city);
        if (payload.bio !== undefined) formData.append('bio', payload.bio);
        if (payload.service_radius_km !== undefined) {
          formData.append('service_radius_km', payload.service_radius_km.toString());
        }

        // Add service categories (array)
        if (payload.service_categories) {
          payload.service_categories.forEach((id) => {
            formData.append('service_categories', id.toString());
          });
        }

        // Add profile photo as file object (React Native format)
        const uri = payload.profile_photo!;
        const filename = uri.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

        formData.append('profile_photo', {
          uri,
          name: filename,
          type,
        } as any);

        const response = await apiClient.patch<UpdateProfileResponse>(
          AUTH_ENDPOINTS.UPDATE_PROFILE,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        return {
          message: response.data.message,
          user: convertAPIUserToFrontend(response.data.user),
        };
      } else {
        // Use JSON for non-file updates
        const response = await apiClient.patch<UpdateProfileResponse>(
          AUTH_ENDPOINTS.UPDATE_PROFILE,
          payload
        );

        return {
          message: response.data.message,
          user: convertAPIUserToFrontend(response.data.user),
        };
      }
    } catch (error) {
      console.error('[AuthService] Update profile error:', error);
      throw error;
    }
  }

  /**
   * Logout - Blacklist refresh token on backend and clear local session
   * POST /api/auth/logout/
   *
   * This invalidates the refresh token on the server, preventing
   * it from being used to generate new access tokens.
   *
   * @param refreshToken - The refresh token to blacklist
   * @returns Promise that resolves when logout is complete
   */
  async logout(refreshToken: string, deviceId?: string): Promise<{ message: string; status: 'logged_out' }> {
    try {
      const response = await apiClient.post<{ message: string; status: 'logged_out' }>(
        AUTH_ENDPOINTS.LOGOUT,
        {
          refresh: refreshToken,
          device_id: deviceId
        }
      );

      if (__DEV__) {
        console.log('[AuthService] Logout complete - token blacklisted, session deactivated');
      }

      return response.data;
    } catch (error) {
      // Even if API fails, we should still clear local tokens
      console.error('[AuthService] Logout API error:', error);
      // Return success anyway - local cleanup will happen
      return { message: 'Logged out successfully', status: 'logged_out' };
    }
  }

  /**
   * Delete Account - Permanently delete user account
   * DELETE /api/auth/delete-account/
   *
   * Requires password confirmation for security.
   * This action is irreversible - all user data will be deleted.
   *
   * @param password - Current password for verification
   * @returns Promise that resolves when account is deleted
   * @throws Error if password is invalid or deletion fails
   */
  async deleteAccount(password: string): Promise<{ message: string; status: 'deleted' }> {
    try {
      const response = await apiClient.delete<{ message: string; status: 'deleted' }>(
        AUTH_ENDPOINTS.DELETE_ACCOUNT,
        {
          data: { password }, // DELETE requests send body via 'data' in axios
        }
      );

      if (__DEV__) {
        console.log('[AuthService] Account deleted successfully');
      }

      return response.data;
    } catch (error) {
      console.error('[AuthService] Delete account error:', error);
      throw error;
    }
  }

  /**
   * Change Password - Change user's password
   * POST /api/auth/change-password/
   *
   * Requires current password verification.
   * New password must be at least 8 characters and different from current.
   *
   * @param currentPassword - Current password for verification
   * @param newPassword - New password (min 8 characters)
   * @returns Promise that resolves when password is changed
   * @throws Error if current password is invalid or validation fails
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post<{ message: string }>(
        AUTH_ENDPOINTS.CHANGE_PASSWORD,
        {
          current_password: currentPassword,
          new_password: newPassword,
        }
      );

      if (__DEV__) {
        console.log('[AuthService] Password changed successfully');
      }

      return response.data;
    } catch (error) {
      console.error('[AuthService] Change password error:', error);
      throw error;
    }
  }

  /**
   * Deactivate Account - Temporarily deactivate user account
   * POST /api/auth/deactivate-account/
   *
   * Requires password confirmation for security.
   * User data is preserved but login is disabled.
   * Account can be reactivated by admin through Django admin panel.
   *
   * @param password - Current password for verification
   * @returns Promise that resolves when account is deactivated
   * @throws Error if password is invalid or deactivation fails
   */
  async deactivateAccount(password: string): Promise<{ message: string; status: 'deactivated' }> {
    try {
      const response = await apiClient.post<{ message: string; status: 'deactivated' }>(
        AUTH_ENDPOINTS.DEACTIVATE_ACCOUNT,
        { password }
      );

      if (__DEV__) {
        console.log('[AuthService] Account deactivated successfully');
      }

      return response.data;
    } catch (error) {
      console.error('[AuthService] Deactivate account error:', error);
      throw error;
    }
  }

  /**
   * Reactivate Account - Reactivate a deactivated user account
   * POST /api/auth/reactivate-account/
   *
   * @param phone - User phone number
   * @param password - Current password for verification
   * @returns Promise with JWT tokens and user data (same as login)
   */
  async reactivateAccount(phone: string, password: string): Promise<{
    access: string;
    refresh: string;
    user: Customer | Vendor;
    isVerified: boolean;
    isOnboardingComplete: boolean;
  }> {
    try {
      const response = await apiClient.post<LoginResponse>(
        AUTH_ENDPOINTS.REACTIVATE_ACCOUNT,
        { phone, password }
      );

      // Convert API user to frontend format (same as login)
      const user = convertAPIUserToFrontend(response.data.user);

      if (__DEV__) {
        console.log('[AuthService] Account reactivated successfully');
      }

      return {
        access: response.data.access,
        refresh: response.data.refresh,
        user,
        isVerified: response.data.is_verified,
        isOnboardingComplete: response.data.is_onboarding_complete,
      };
    } catch (error) {
      console.error('[AuthService] Reactivate account error:', error);
      throw error;
    }
  }

  /**
   * Send Login OTP - For backward compatibility with existing code
   * @deprecated Use requestOTP instead
   */
  async sendLoginOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.requestOTP(phoneNumber);
      return {
        success: true,
        message: 'OTP sent successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send Signup OTP - For backward compatibility with existing code
   * @deprecated Use signup + requestOTP instead
   */
  async sendSignupOTP(payload: {
    name: string;
    phoneNumber: string;
    email?: string;
    role: 'customer' | 'vendor';
  }): Promise<{ success: boolean; message: string }> {
    try {
      // This is a placeholder for backward compatibility
      // In the new flow, use signup() directly which will trigger OTP
      return {
        success: true,
        message: 'Use signup() method instead',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Resend OTP - For backward compatibility
   * @deprecated Use requestOTP instead
   */
  async resendOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.requestOTP(phoneNumber);
      return {
        success: true,
        message: 'OTP resent successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  // ==========================================================================
  // DEVICE SESSION MANAGEMENT (Single-Device Login)
  // ==========================================================================

  /**
   * Check session status before login
   * POST /api/auth/check-session/
   *
   * Determines if user has existing session on another device
   * and whether they have an active service that would block login.
   *
   * @param phone - User's phone number
   * @param deviceId - Current device's unique ID
   * @returns Session status information
   */
  async checkSessionStatus(phone: string, deviceId: string): Promise<{
    hasExistingSession: boolean;
    hasActiveService: boolean;
    activeServiceType: 'service_request' | 'active_job' | 'pending_proposal' | null;
    existingDeviceName: string | null;
    canLogin: boolean;
    requiresOtp: boolean;
  }> {
    try {
      const response = await apiClient.post<{
        has_existing_session: boolean;
        has_active_service: boolean;
        active_service_type: 'service_request' | 'active_job' | 'pending_proposal' | null;
        existing_device_name: string | null;
        can_login: boolean;
        requires_otp: boolean;
      }>(AUTH_ENDPOINTS.CHECK_SESSION, {
        phone,
        device_id: deviceId,
      });

      return {
        hasExistingSession: response.data.has_existing_session,
        hasActiveService: response.data.has_active_service,
        activeServiceType: response.data.active_service_type,
        existingDeviceName: response.data.existing_device_name,
        canLogin: response.data.can_login,
        requiresOtp: response.data.requires_otp || false,
      };
    } catch (error) {
      console.error('[AuthService] Check session status error:', error);
      throw error;
    }
  }

  /**
   * Request OTP for device transfer
   * POST /api/auth/request-device-transfer-otp/
   *
   * Sends OTP to user's phone for transferring session to new device.
   * Only allowed when user has existing session but NO active service.
   *
   * @param phone - User's phone number
   * @param deviceId - New device's unique ID
   */
  async requestDeviceTransferOTP(phone: string, deviceId: string): Promise<{
    message: string;
    otpSent: boolean;
  }> {
    try {
      const response = await apiClient.post<{
        message: string;
        otp_sent: boolean;
      }>(AUTH_ENDPOINTS.REQUEST_DEVICE_TRANSFER_OTP, {
        phone,
        device_id: deviceId,
      });

      return {
        message: response.data.message,
        otpSent: response.data.otp_sent,
      };
    } catch (error) {
      console.error('[AuthService] Request device transfer OTP error:', error);
      throw error;
    }
  }

  /**
   * Verify OTP and transfer session to new device
   * POST /api/auth/verify-device-transfer/
   *
   * Verifies OTP and completes session transfer.
   * Old device will be force logged out and receive push notification.
   *
   * @param params - Transfer verification parameters
   * @returns Login response with tokens and user data
   */
  async verifyDeviceTransfer(params: {
    phone: string;
    code: string;
    password: string;
    deviceId: string;
    deviceName: string;
    pushToken?: string | null;
  }): Promise<{
    access: string;
    refresh: string;
    user: Customer | Vendor;
    isVerified: boolean;
    isOnboardingComplete: boolean;
    transferredFromDevice: string | null;
  }> {
    try {
      const response = await apiClient.post<{
        access: string;
        refresh: string;
        user: UserAPI;
        is_verified: boolean;
        is_onboarding_complete: boolean;
        transferred_from_device: string | null;
      }>(AUTH_ENDPOINTS.VERIFY_DEVICE_TRANSFER, {
        phone: params.phone,
        code: params.code,
        password: params.password,
        device_id: params.deviceId,
        device_name: params.deviceName,
        push_token: params.pushToken,
      });

      // Convert API user to frontend format
      const user = convertAPIUserToFrontend(response.data.user);

      return {
        access: response.data.access,
        refresh: response.data.refresh,
        user,
        isVerified: response.data.is_verified,
        isOnboardingComplete: response.data.is_onboarding_complete,
        transferredFromDevice: response.data.transferred_from_device,
      };
    } catch (error) {
      console.error('[AuthService] Verify device transfer error:', error);
      throw error;
    }
  }

  /**
   * Register push token with backend
   * POST /api/auth/register-push-token/
   *
   * Registers the device's push token for receiving notifications
   * about login attempts and force logouts.
   *
   * @param pushToken - Expo push token
   * @param deviceId - Device's unique ID
   */
  async registerPushToken(pushToken: string, deviceId: string): Promise<void> {
    try {
      await apiClient.post(AUTH_ENDPOINTS.REGISTER_PUSH_TOKEN, {
        push_token: pushToken,
        device_id: deviceId,
      });

      if (__DEV__) {
        console.log('[AuthService] Push token registered successfully');
      }
    } catch (error) {
      console.error('[AuthService] Register push token error:', error);
      // Don't throw - push token registration is best-effort
    }
  }

  /**
   * Login with device tracking
   * POST /api/auth/login/
   *
   * Updated login method that includes device information for session tracking.
   *
   * @param phone - Phone number
   * @param password - Password
   * @param deviceId - Device's unique ID
   * @param deviceName - Human-readable device name
   * @param pushToken - Expo push token (optional)
   * @param forceLogoutOther - Force logout other devices (only after OTP verification)
   */
  async loginWithDevice(
    phone: string,
    password: string,
    deviceId: string,
    deviceName: string,
    pushToken?: string | null,
    forceLogoutOther?: boolean
  ): Promise<{
    access: string;
    refresh: string;
    user: Customer | Vendor;
    isVerified: boolean;
    isOnboardingComplete: boolean;
    // Session conflict info (if any)
    hasExistingSession?: boolean;
    hasActiveService?: boolean;
    activeServiceType?: string;
    existingDeviceName?: string;
    requiresOtp?: boolean;
  }> {
    try {
      const response = await apiClient.post<LoginResponse & {
        error?: string;
        has_existing_session?: boolean;
        has_active_service?: boolean;
        active_service_type?: string;
        existing_device_name?: string;
        requires_otp?: boolean;
      }>(AUTH_ENDPOINTS.LOGIN, {
        phone,
        password,
        device_id: deviceId,
        device_name: deviceName,
        push_token: pushToken,
        force_logout_other: forceLogoutOther || false,
      });

      // Convert API user to frontend format
      const user = convertAPIUserToFrontend(response.data.user);

      return {
        access: response.data.access,
        refresh: response.data.refresh,
        user,
        isVerified: response.data.is_verified,
        isOnboardingComplete: response.data.is_onboarding_complete,
      };
    } catch (error: any) {
      // Check if this is a session conflict error
      if (error.response?.status === 409 || error.response?.status === 403) {
        const data = error.response.data;
        if (data.error === 'existing_session' || data.error === 'active_service_blocking') {
          // Return the conflict info instead of throwing
          throw {
            isSessionConflict: true,
            hasExistingSession: data.has_existing_session,
            hasActiveService: data.has_active_service,
            activeServiceType: data.active_service_type,
            existingDeviceName: data.existing_device_name,
            requiresOtp: data.requires_otp,
            message: data.message,
          };
        }
      }
      console.error('[AuthService] Login with device error:', error);
      throw error;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export singleton instance
export const authService = new AuthService();
export default authService;
