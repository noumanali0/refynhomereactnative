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
    favoriteVendors: apiUser.favorite_vendors.map(convertAPIUserToFrontend),
    vendorProfile: apiUser.vendor_profile
      ? {
          id: apiUser.vendor_profile.id,
          verified: apiUser.vendor_profile.verified,
          cnic: apiUser.vendor_profile.cnic,
          city: apiUser.vendor_profile.city,
          bio: apiUser.vendor_profile.bio,
          profilePhoto: apiUser.vendor_profile.profile_photo,
          idVerificationPhoto: apiUser.vendor_profile.id_verification_photo,
          latitude: apiUser.vendor_profile.latitude,
          longitude: apiUser.vendor_profile.longitude,
          serviceRadiusKm: apiUser.vendor_profile.service_radius_km,
          locationUpdatedAt: apiUser.vendor_profile.location_updated_at,
          averageRating: apiUser.vendor_profile.average_rating,
          totalReviews: apiUser.vendor_profile.total_reviews,
          completedJobs: apiUser.vendor_profile.completed_jobs,
        }
      : null,

    // Computed fields
    name: `${apiUser.first_name} ${apiUser.last_name}`.trim(),
    phoneNumber: apiUser.phone, // Legacy alias
    profilePhoto: apiUser.vendor_profile?.profile_photo || undefined,
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
  async verifyOTP(phone: string, code: string): Promise<{
    access: string;
    refresh: string;
    user: Customer | Vendor;
    status: 'onboarding_complete' | 'onboarding_required';
  }> {
    try {
      const payload: OTPVerifyRequest = {
        phone,
        code,
        purpose: 'signup',
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
   * @returns Promise with tokens and user data
   */
  async login(phone: string, password: string): Promise<{
    access: string;
    refresh: string;
    user: Customer | Vendor;
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
   * Supports both multipart form data and JSON with base64 images
   *
   * @param payload - Vendor onboarding data
   * @returns Promise with onboarding response
   */
  async vendorOnboarding(payload: VendorOnboardingRequest): Promise<VendorOnboardingResponse> {
    try {
      // Determine if we're sending multipart/form-data or JSON
      const hasFileUploads =
        payload.profile_photo instanceof File || payload.id_verification_photo instanceof File;

      if (hasFileUploads) {
        // Use FormData for file uploads
        const formData = new FormData();

        // Add all fields to FormData
        formData.append('phone', payload.phone);
        formData.append('cnic', payload.cnic);

        if (payload.address) formData.append('address', payload.address);
        if (payload.city) formData.append('city', payload.city);
        if (payload.bio) formData.append('bio', payload.bio);
        if (payload.experience) formData.append('experience', payload.experience.toString());

        if (payload.profile_photo instanceof File) {
          formData.append('profile_photo', payload.profile_photo);
        }
        if (payload.id_verification_photo instanceof File) {
          formData.append('id_verification_photo', payload.id_verification_photo);
        }

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
        // Use JSON with base64 images
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
   * Logout - Clear local session
   * Note: Backend uses JWT which is stateless, so we only clear local storage
   *
   * @returns Promise that resolves when logout is complete
   */
  async logout(): Promise<void> {
    try {
      // JWT is stateless - no backend call needed
      // Just clear local tokens (handled by Redux slice)
      if (__DEV__) {
        console.log('[AuthService] Logout complete (local only)');
      }
    } catch (error) {
      console.error('[AuthService] Logout error:', error);
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
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export singleton instance
export const authService = new AuthService();
export default authService;
