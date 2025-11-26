/**
 * useAuth Hook
 *
 * Convenience hook for accessing authentication state and operations.
 * Wraps Redux auth slice for easier component usage.
 */

import { useAppSelector, useAppDispatch } from './useAppDispatch';
import { logoutUser } from '@store/slices/authSlice';
import type { Customer, Vendor } from '@/types';

// ============================================================================
// HOOK
// ============================================================================

/**
 * useAuth Hook
 *
 * Provides easy access to:
 * - Current user
 * - Authentication status
 * - Loading state
 * - Error messages
 * - Logout function
 *
 * @example
 * const { user, isAuthenticated, logout } = useAuth();
 *
 * if (!isAuthenticated) {
 *   return <LoginScreen />;
 * }
 *
 * return <Text>Welcome {user?.name}!</Text>;
 */
export function useAuth() {
  const dispatch = useAppDispatch();

  // Select auth state from Redux store
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    otpSent,
    lastOtpSentTime,
    resendCooldown,
    phoneNumber,
  } = useAppSelector((state) => state.auth);

  /**
   * Logout current user
   * Clears all auth state and tokens
   */
  const logout = () => {
    dispatch(logoutUser());
  };

  /**
   * Check if current user is a customer
   */
  const isCustomer = user?.role === 'customer';

  /**
   * Check if current user is a vendor
   */
  const isVendor = user?.role === 'vendor';

  /**
   * Check if current user is an admin
   */
  const isAdmin = user?.role === 'admin';

  /**
   * Get user as Customer type (with type guard)
   */
  const customer = isCustomer ? (user as Customer) : null;

  /**
   * Get user as Vendor type (with type guard)
   */
  const vendor = isVendor ? (user as Vendor) : null;

  /**
   * Check if vendor is verified
   * Returns false if not a vendor or not verified
   */
  const isVendorVerified = isVendor && vendor?.vendorProfile?.verified === true;

  /**
   * Check if OTP can be resent
   * Returns true if cooldown period has passed
   */
  const canResendOTP = resendCooldown <= 0;

  /**
   * Get time remaining until OTP can be resent (in seconds)
   */
  const otpResendTimeRemaining = Math.max(0, resendCooldown);

  return {
    // User data
    user,
    customer,
    vendor,
    token,

    // Auth status
    isAuthenticated,
    isLoading,
    error,

    // User role checks
    isCustomer,
    isVendor,
    isAdmin,
    isVendorVerified,

    // OTP status
    otpSent,
    lastOtpSentTime,
    resendCooldown,
    canResendOTP,
    otpResendTimeRemaining,
    phoneNumber,

    // Actions
    logout,
  };
}

export default useAuth;
