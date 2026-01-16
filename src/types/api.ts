/**
 * API Type Definitions
 *
 * This file contains TypeScript interfaces that match the Django backend API
 * request and response structures for authentication endpoints.
 */

// ============================================================================
// USER & PROFILE TYPES (from Django backend)
// ============================================================================

export type UserRole = 'customer' | 'vendor' | 'admin';
export type SubscriptionTier = 'free' | 'silver' | 'gold' | 'pro';

/**
 * Vendor Profile from Django backend
 * Matches: backend/refynhomedjango/accounts/models.py - VendorProfile
 */
export interface VendorProfileAPI {
  id: number;
  verified: boolean;
  cnic: string;
  city: string;
  bio: string;
  profile_photo: string | null;
  profile_photo_url: string | null;
  id_verification_photo: string | null;
  latitude: string | null;
  longitude: string | null;
  service_radius_km: string;
  location_updated_at: string | null;
  average_rating: number;
  total_reviews: number;
  completed_jobs: number;
  member_since: string | null;
  active_requests: number;
  categories: Array<{ id: number; name: string; slug: string }>;
  rating_distribution: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  } | null;
}

/**
 * User from Django backend
 * Matches: backend/refynhomedjango/accounts/models.py - User
 */
export interface UserAPI {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  address: string;
  city: string;
  subscription_tier: SubscriptionTier;
  profile_photo: string | null;
  profile_photo_url: string | null;
  favorite_vendors: UserAPI[];
  vendor_profile: VendorProfileAPI | null;
}

// ============================================================================
// JWT TOKEN TYPES
// ============================================================================

export interface JWTTokens {
  access: string;
  refresh: string;
}

export interface TokenRefreshResponse {
  access: string;
}

// ============================================================================
// AUTHENTICATION REQUEST TYPES
// ============================================================================

/**
 * Signup Request (Customer)
 * POST /api/auth/signup/
 */
export interface SignupRequestCustomer {
  phone: string;
  password: string;
  role: 'customer';
  first_name?: string;
  last_name?: string;
  name?: string; // Backend auto-splits into first_name/last_name
  address: string; // Required for customer
  city: string; // Required for customer
}

/**
 * Signup Request (Vendor)
 * POST /api/auth/signup/
 */
export interface SignupRequestVendor {
  phone: string;
  password: string;
  role: 'vendor';
  first_name?: string;
  last_name?: string;
  name?: string; // Backend auto-splits into first_name/last_name
  address?: string; // Optional for vendor
  city?: string; // Optional for vendor
}

export type SignupRequest = SignupRequestCustomer | SignupRequestVendor;

/**
 * Login Request
 * POST /api/auth/login/
 */
export interface LoginRequest {
  phone: string;
  password: string;
}

/**
 * OTP Request
 * POST /api/auth/otp-request/
 */
export interface OTPRequest {
  phone: string;
  purpose: 'signup'; // Only 'signup' supported currently
}

/**
 * OTP Verification Request
 * POST /api/auth/otp-verify/
 */
export interface OTPVerifyRequest {
  phone: string;
  code: string;
  purpose: 'signup';
  // Device tracking fields for session management
  device_id?: string;
  device_name?: string;
  push_token?: string | null;
}

/**
 * Vendor Onboarding Request
 * POST /api/auth/vendor-onboarding/
 */
export interface VendorOnboardingRequest {
  phone: string;
  cnic: string;
  address?: string;
  city?: string;
  bio?: string;
  experience?: number;
  profile_photo?: File | string; // File for multipart, base64 for JSON
  // Old CNIC field - kept for backward compatibility
  id_verification_photo?: File | string;
  // New: Front and back CNIC photos (Pakistani NIC requirement)
  cnic_front_photo?: File | string;
  cnic_back_photo?: File | string;
  // Base64 alternatives
  profile_photo_base64?: string; // Base64 encoded image
  id_verification_photo_base64?: string; // Base64 encoded image
  cnic_front_photo_base64?: string; // Base64 encoded image
  cnic_back_photo_base64?: string; // Base64 encoded image
  service_categories?: (number | string)[]; // Array of IDs or slugs
}

/**
 * Update Profile Request
 * PATCH /api/auth/update-profile/
 * All fields are optional for partial updates
 */
export interface UpdateProfileRequest {
  // Common fields (Customer & Vendor)
  first_name?: string;
  last_name?: string;
  profile_photo?: string; // File URI (file:// or content://) or null

  // Customer-specific fields
  address?: string;
  city?: string; // For customer: User.city, For vendor: VendorProfile.city

  // Vendor-specific fields
  bio?: string;
  service_categories?: number[];
  service_radius_km?: number;
}

// ============================================================================
// AUTHENTICATION RESPONSE TYPES
// ============================================================================

/**
 * Signup Response
 * Status 201: OTP sent successfully
 */
export interface SignupResponse {
  message: string;
  phone: string;
  status: 'otp_required';
}

/**
 * OTP Request Response
 * Status 200: OTP sent
 */
export interface OTPRequestResponse {
  detail: string; // "OTP sent"
}

/**
 * OTP Verification Response - Customer (Complete)
 * Status 200: Customer onboarding complete
 */
export interface OTPVerifyResponseCustomer extends JWTTokens {
  message: string;
  user: UserAPI;
  status: 'onboarding_complete';
  device_id?: string; // Permanent device ID for session tracking
}

/**
 * OTP Verification Response - Vendor (Needs Onboarding)
 * Status 200: Vendor needs to complete onboarding
 */
export interface OTPVerifyResponseVendor extends JWTTokens {
  message: string;
  user: UserAPI;
  status: 'onboarding_required';
  is_verified?: boolean;
  is_onboarding_complete?: boolean;
  device_id?: string; // Permanent device ID for session tracking
}

export type OTPVerifyResponse = OTPVerifyResponseCustomer | OTPVerifyResponseVendor;

/**
 * Login Response
 * Status 200: Login successful
 */
export interface LoginResponse extends JWTTokens {
  user: UserAPI;
  is_verified: boolean; // For vendors: admin approved. For customers: always true
  is_onboarding_complete: boolean; // For vendors: CNIC + categories submitted. For customers: always true
}

/**
 * Get Profile Response
 * GET /api/auth/me/
 * Status 200: User profile
 */
export type ProfileResponse = UserAPI;

/**
 * Vendor Onboarding Response
 * POST /api/auth/vendor-onboarding/
 * Status 200: Onboarding submitted, pending admin verification
 */
export interface VendorOnboardingResponse {
  message: string;
  status: 'pending_verification';
  vendor_id: number;
}

/**
 * Update Profile Response
 * PATCH /api/auth/update-profile/
 * Status 200: Profile updated successfully
 */
export interface UpdateProfileResponse {
  message: string;
  user: UserAPI;
}

/**
 * Delete Account Request
 * DELETE /api/auth/delete-account/
 */
export interface DeleteAccountRequest {
  password: string;
}

/**
 * Delete Account Response
 * Status 200: Account deleted successfully
 */
export interface DeleteAccountResponse {
  message: string;
  status: 'deleted';
}

/**
 * Change Password Request
 * POST /api/auth/change-password/
 */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/**
 * Change Password Response
 * Status 200: Password changed successfully
 */
export interface ChangePasswordResponse {
  message: string;
}

/**
 * Deactivate Account Request
 * POST /api/auth/deactivate-account/
 */
export interface DeactivateAccountRequest {
  password: string;
}

/**
 * Deactivate Account Response
 * Status 200: Account deactivated successfully
 */
export interface DeactivateAccountResponse {
  message: string;
  status: 'deactivated';
}

/**
 * Reactivate Account Request
 * POST /api/auth/reactivate-account/
 */
export interface ReactivateAccountRequest {
  phone: string;
  password: string;
}

/**
 * Reactivate Account Response
 * Status 200: Account reactivated successfully with JWT tokens
 */
export interface ReactivateAccountResponse extends JWTTokens {
  message: string;
  status: 'reactivated';
  user: UserAPI;
  is_verified: boolean;
  is_onboarding_complete: boolean;
}

/**
 * Login Response when account is deactivated
 * Status 403: Account is deactivated
 */
export interface LoginResponseDeactivated {
  detail: string;
  status: 'account_deactivated';
  phone: string;
}

// ============================================================================
// ERROR RESPONSE TYPES (Django REST Framework)
// ============================================================================

/**
 * Single error message
 */
export interface ErrorResponseSingle {
  detail: string;
}

/**
 * Field validation errors
 */
export interface ErrorResponseFields {
  [field: string]: string | string[];
}

/**
 * JWT token error (401)
 */
export interface TokenErrorResponse {
  detail: string;
  code: 'token_not_valid';
  messages: Array<{
    token_class: string;
    token_type: string;
    message: string;
  }>;
}

export type ErrorResponse = ErrorResponseSingle | ErrorResponseFields | TokenErrorResponse;

// ============================================================================
// COMMON ERROR MESSAGES (from backend analysis)
// ============================================================================

export const AUTH_ERROR_MESSAGES = {
  // Signup errors
  USER_EXISTS: 'User with this phone already exists',

  // OTP errors
  INVALID_OTP: 'Invalid or expired code',
  TOO_MANY_ATTEMPTS: 'Too many attempts',

  // Login errors
  INVALID_CREDENTIALS: 'Invalid credentials',
  VENDOR_NOT_VERIFIED: 'Vendor not verified. Please wait for admin approval.',
  VENDOR_ONBOARDING_INCOMPLETE: 'Vendor onboarding incomplete',

  // Auth errors
  NOT_AUTHENTICATED: 'Authentication credentials were not provided.',
  INVALID_TOKEN: 'Token is invalid or expired',

  // General errors
  USER_NOT_FOUND: 'User not found',
  VENDOR_NOT_FOUND: 'Vendor not found',
  PERMISSION_DENIED: 'Only admins can verify vendors',
} as const;

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// ============================================================================
// HELPER TYPE GUARDS
// ============================================================================

/**
 * Check if response is an error
 */
export function isErrorResponse(response: any): response is ErrorResponse {
  return 'detail' in response || 'code' in response;
}

/**
 * Check if OTP verify response indicates onboarding complete
 */
export function isOnboardingComplete(
  response: OTPVerifyResponse
): response is OTPVerifyResponseCustomer {
  return response.status === 'onboarding_complete';
}

/**
 * Check if OTP verify response indicates onboarding required
 */
export function isOnboardingRequired(
  response: OTPVerifyResponse
): response is OTPVerifyResponseVendor {
  return response.status === 'onboarding_required';
}

/**
 * Check if error is a field validation error
 */
export function isFieldErrorResponse(error: ErrorResponse): error is ErrorResponseFields {
  return !('detail' in error) && !('code' in error);
}

/**
 * Check if error is a token error
 */
export function isTokenErrorResponse(error: ErrorResponse): error is TokenErrorResponse {
  return 'code' in error && error.code === 'token_not_valid';
}
