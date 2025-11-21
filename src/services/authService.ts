// src/services/authService.ts
/**
 * Authentication Service
 *
 * Centralized service for all authentication-related API calls.
 * Currently uses mock data - replace with actual API endpoints.
 */

import { Customer, Vendor, UserRole } from '@/types';

// API Base URL - Move to environment config
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// ============================================================================
// Types
// ============================================================================

export interface SendOTPResponse {
  success: boolean;
  message: string;
  otpSent: boolean;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  user: Customer | Vendor;
  token: string;
}

export interface SignupPayload {
  name: string;
  phoneNumber: string;
  email?: string;
  role: UserRole;
}

export interface SignupResponse {
  success: boolean;
  message: string;
  otpSent: boolean;
}

// ============================================================================
// Auth Service
// ============================================================================

class AuthService {
  /**
   * Send OTP for Login
   * @param phoneNumber - User's phone number
   */
  async sendLoginOTP(phoneNumber: string): Promise<SendOTPResponse> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/auth/send-login-otp`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phoneNumber }),
      // });
      // const data = await response.json();
      // return data;

      // Mock response
      await this.delay(1500);
      return {
        success: true,
        message: 'OTP sent successfully',
        otpSent: true,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send OTP');
    }
  }

  /**
   * Send OTP for Signup
   * @param payload - Signup data including name, phone, email, role
   */
  async sendSignupOTP(payload: SignupPayload): Promise<SignupResponse> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
      // const data = await response.json();
      // return data;

      // Mock response
      await this.delay(1500);
      console.log('📤 Signup request:', payload);
      return {
        success: true,
        message: 'Account created. OTP sent to your phone.',
        otpSent: true,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create account');
    }
  }

  /**
   * Verify OTP
   * @param phoneNumber - User's phone number
   * @param otp - OTP code
   * @param type - 'login' or 'signup'
   */
  async verifyOTP(
    phoneNumber: string,
    otp: string,
    type: 'login' | 'signup' = 'login'
  ): Promise<VerifyOTPResponse> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phoneNumber, otp, type }),
      // });
      // const data = await response.json();
      // return data;

      // Mock response - Returns customer or vendor based on phone number
      await this.delay(1500);

      // Mock: Last digit determines role (even = customer, odd = vendor)
      const lastDigit = parseInt(phoneNumber.slice(-1));
      const role: UserRole = lastDigit % 2 === 0 ? 'customer' : 'vendor';

      const mockUser: Customer | Vendor =
        role === 'customer'
          ? {
              id: `customer_${Date.now()}`,
              phoneNumber,
              role: 'customer',
              name: 'Demo Customer',
              city: 'Lahore',
              profilePhoto: 'https://i.pravatar.cc/150?img=1',
              address: 'Demo Address, Lahore',
              favoriteVendors: [],
            }
          : {
              id: `vendor_${Date.now()}`,
              phoneNumber,
              role: 'vendor',
              name: 'Demo Vendor',
              city: 'Lahore',
              profilePhoto: 'https://i.pravatar.cc/150?img=2',
              cnic: '12345-1234567-1',
              serviceCategories: [
                { id: 'plumbing', label: 'Plumbing', icon: 'water' },
              ],
              rating: 4.5,
              totalReviews: 120,
              verified: true,
              isOnline: true,
              subscriptionTier: 'basic',
            };

      return {
        success: true,
        message: 'OTP verified successfully',
        user: mockUser,
        token: `mock_token_${Date.now()}`,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to verify OTP');
    }
  }

  /**
   * Resend OTP
   * @param phoneNumber - User's phone number
   */
  async resendOTP(phoneNumber: string): Promise<SendOTPResponse> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phoneNumber }),
      // });
      // const data = await response.json();
      // return data;

      // Mock response
      await this.delay(1000);
      return {
        success: true,
        message: 'OTP resent successfully',
        otpSent: true,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to resend OTP');
    }
  }

  /**
   * Logout
   * @param token - User's auth token
   */
  async logout(token: string): Promise<{ success: boolean; message: string }> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}`,
      //   },
      // });
      // const data = await response.json();
      // return data;

      // Mock response
      await this.delay(500);
      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to logout');
    }
  }

  /**
   * Helper: Simulate network delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const authService = new AuthService();
