/**
 * API Endpoint Definitions
 *
 * All API endpoints aligned with Django backend
 * Base URL: http://localhost:8000/api or EXPO_PUBLIC_API_BASE_URL
 *
 * Backend Structure:
 * - Auth endpoints: /api/auth/*
 * - Service requests: /api/service-requests/*
 * - Categories: /api/categories/*
 * - Proposals: /api/vendors/proposals/*
 * - Customer dashboard: /api/customers/*
 * - Vendor dashboard: /api/vendors/*
 */

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

export const AUTH_ENDPOINTS = {
  /**
   * POST /api/auth/signup/
   * Body: { phone, password, role, first_name, last_name, address?, city? }
   * Response: { message, phone, status: "otp_required" }
   */
  SIGNUP: '/auth/signup/',

  /**
   * POST /api/auth/otp-request/
   * Body: { phone, purpose: "signup" }
   * Response: { detail: "OTP sent" }
   */
  OTP_REQUEST: '/auth/otp-request/',

  /**
   * POST /api/auth/otp-verify/
   * Body: { phone, code, purpose: "signup" }
   * Response: { access, refresh, user, status }
   */
  OTP_VERIFY: '/auth/otp-verify/',

  /**
   * POST /api/auth/login/
   * Body: { phone, password }
   * Response: { access, refresh, user }
   */
  LOGIN: '/auth/login/',

  /**
   * POST /api/auth/refresh/
   * Body: { refresh }
   * Response: { access }
   */
  REFRESH: '/auth/refresh/',

  /**
   * GET /api/auth/me/
   * Headers: Authorization: Bearer {token}
   * Response: User object with vendor_profile if vendor
   */
  ME: '/auth/me/',

  /**
   * POST /api/auth/vendor-onboarding/
   * Body: { phone, cnic, bio?, profile_photo?, id_verification_photo?, service_categories? }
   * Response: { message, status: "pending_verification", vendor_id }
   */
  VENDOR_ONBOARDING: '/auth/vendor-onboarding/',

  /**
   * POST /api/auth/admin/verify-vendor/{vendor_id}/
   * Admin only
   * Response: { message, vendor_id, verified: true }
   */
  ADMIN_VERIFY_VENDOR: (vendorId: number) => `/auth/admin/verify-vendor/${vendorId}/`,

  /**
   * PATCH /api/auth/update-profile/
   * Headers: Authorization: Bearer {token}
   * Body (Customer): { first_name?, last_name?, address?, city?, profile_photo? }
   * Body (Vendor): { first_name?, last_name?, city?, bio?, profile_photo?, service_categories?, service_radius_km? }
   * Supports both multipart/form-data (file upload) and JSON
   * Response: { message, user }
   */
  UPDATE_PROFILE: '/auth/update-profile/',

  /**
   * DELETE /api/auth/delete-account/
   * Headers: Authorization: Bearer {token}
   * Body: { password: string }
   * Response: { message: string, status: 'deleted' }
   *
   * Permanently deletes the user account. Requires password confirmation.
   * All user data will be deleted (service requests, proposals, reviews, etc.)
   * For vendors: assigned_vendor on service requests will be set to NULL
   */
  DELETE_ACCOUNT: '/auth/delete-account/',

  /**
   * POST /api/auth/change-password/
   * Headers: Authorization: Bearer {token}
   * Body: { current_password: string, new_password: string }
   * Response: { message: string }
   *
   * Change user password. Requires current password verification.
   * New password must be at least 8 characters and different from current.
   */
  CHANGE_PASSWORD: '/auth/change-password/',

  /**
   * POST /api/auth/deactivate-account/
   * Headers: Authorization: Bearer {token}
   * Body: { password: string }
   * Response: { message: string, status: 'deactivated' }
   *
   * Temporarily deactivate the user account. Requires password confirmation.
   * User data is preserved but login is disabled.
   * Account can be reactivated using the reactivate-account endpoint.
   */
  DEACTIVATE_ACCOUNT: '/auth/deactivate-account/',

  /**
   * POST /api/auth/reactivate-account/
   * Body: { phone: string, password: string }
   * Response: { message: string, status: 'reactivated', access, refresh, user, is_verified, is_onboarding_complete }
   *
   * Reactivate a deactivated user account. No auth required (user is logged out).
   * Returns JWT tokens on success (same as login response).
   */
  REACTIVATE_ACCOUNT: '/auth/reactivate-account/',

  /**
   * POST /api/auth/logout/
   * Headers: Authorization: Bearer {token}
   * Body: { refresh: string }
   * Response: { message: string, status: 'logged_out' }
   *
   * Logout user and blacklist refresh token on server.
   * This prevents the refresh token from being used to generate new access tokens.
   */
  LOGOUT: '/auth/logout/',
} as const;

// ============================================================================
// SERVICE REQUEST ENDPOINTS
// ============================================================================

export const SERVICE_REQUEST_ENDPOINTS = {
  /**
   * GET /api/service-requests/
   * Query params: ?status=pending&category=1
   * Response: ServiceRequest[]
   */
  LIST: '/service-requests/',

  /**
   * POST /api/service-requests/
   * Body: { category, description, address, latitude, longitude }
   * Response: ServiceRequest
   */
  CREATE: '/service-requests/',

  /**
   * GET /api/service-requests/{id}/
   * Response: ServiceRequest
   */
  DETAIL: (id: number) => `/service-requests/${id}/`,

  /**
   * PATCH /api/service-requests/{id}/
   * Body: { status?, description?, etc }
   * Response: ServiceRequest
   */
  UPDATE: (id: number) => `/service-requests/${id}/`,

  /**
   * DELETE /api/service-requests/{id}/
   * Response: 204 No Content
   */
  DELETE: (id: number) => `/service-requests/${id}/`,

  /**
   * GET /api/service-requests/{id}/nearby-vendors/
   * Response: Vendor[]
   */
  NEARBY_VENDORS: (id: number) => `/service-requests/${id}/nearby-vendors/`,

  /**
   * GET /api/service-requests/{id}/proposals/
   * Response: ServiceProposal[]
   */
  PROPOSALS: (id: number) => `/service-requests/${id}/proposals/`,
} as const;

// ============================================================================
// SERVICE CATEGORY ENDPOINTS
// ============================================================================

export const CATEGORY_ENDPOINTS = {
  /**
   * GET /api/categories/
   * Response: ServiceCategory[]
   */
  LIST: '/categories/',

  /**
   * GET /api/categories/{id}/
   * Response: ServiceCategory
   */
  DETAIL: (id: number) => `/categories/${id}/`,
} as const;

// ============================================================================
// CUSTOMER ENDPOINTS
// ============================================================================

export const CUSTOMER_ENDPOINTS = {
  /**
   * GET /api/customers/dashboard/
   * Response: { active_requests, pending_proposals, favorites_count }
   */
  DASHBOARD: '/customers/dashboard/',

  /**
   * GET /api/customers/service-requests/
   * Response: ServiceRequest[]
   */
  SERVICE_REQUESTS: '/customers/service-requests/',

  /**
   * POST /api/customers/proposals/accept/
   * Body: { proposal_id }
   * Response: { message, booking_id }
   */
  ACCEPT_PROPOSAL: '/customers/proposals/accept/',

  /**
   * POST /api/customers/proposals/decline/
   * Body: { proposal_id }
   * Response: { message }
   */
  DECLINE_PROPOSAL: '/customers/proposals/decline/',
} as const;

// ============================================================================
// FAVORITE VENDOR ENDPOINTS
// ============================================================================

export const FAVORITE_ENDPOINTS = {
  /**
   * GET /api/customers/favorite-vendors/
   * Response: FavoriteVendor[]
   */
  LIST: '/customers/favorite-vendors/',

  /**
   * POST /api/customers/favorite-vendors/
   * Body: { vendor_id: number }
   * Response: { message, favorite: FavoriteVendor }
   */
  ADD: '/customers/favorite-vendors/',

  /**
   * DELETE /api/customers/favorite-vendors/{vendor_id}/
   * Response: 204 No Content
   */
  REMOVE: (vendorId: number) => `/customers/favorite-vendors/${vendorId}/`,

  /**
   * GET /api/customers/favorite-vendors/{vendor_id}/check/
   * Response: { is_favorite: boolean }
   * Note: This endpoint may not exist in backend - favoriteService handles gracefully
   */
  CHECK: (vendorId: number) => `/customers/favorite-vendors/${vendorId}/check/`,
} as const;

// ============================================================================
// VENDOR ENDPOINTS
// ============================================================================

export const VENDOR_ENDPOINTS = {
  /**
   * GET /api/vendors/dashboard/
   * Response: { active_proposals, completed_jobs, rating }
   */
  DASHBOARD: '/vendors/dashboard/',

  /**
   * POST /api/vendors/location/
   * Body: { latitude, longitude, service_request_id? }
   * Response: { success: true }
   *
   * HTTP endpoint for location updates (used by background task when app is killed)
   * This bypasses WebSocket for reliable background updates
   */
  UPDATE_LOCATION: '/vendors/location/',

  /**
   * GET /api/vendors/service-requests/
   * Query params:
   *   - type: 'pending' | 'incoming' | 'active' | 'completed' | 'history'
   *   - limit: number (default 50)
   *
   * Type values:
   *   - pending: Requests where vendor sent proposal (waiting for customer)
   *   - incoming: Requests where vendor can send proposal
   *   - active: Active jobs assigned to vendor (en_route, in_progress)
   *   - completed: Completed jobs assigned to vendor
   *   - history: All past requests (completed or cancelled) assigned to vendor
   *
   * Response: { results: ServiceRequest[], count: number, type: string }
   */
  SERVICE_REQUESTS: '/vendors/service-requests/',

  /**
   * POST /api/vendors/proposals/
   * Body: { service_request, estimated_price, estimated_time, message }
   * Response: ServiceProposal
   */
  CREATE_PROPOSAL: '/vendors/proposals/',

  /**
   * GET /api/vendors/proposals/
   * Response: ServiceProposal[]
   */
  MY_PROPOSALS: '/vendors/proposals/',

  /**
   * GET /api/vendors/{id}/
   * Response: Vendor profile with stats
   */
  DETAIL: (id: number) => `/vendors/${id}/`,

  /**
   * PATCH /api/vendors/{id}/
   * Body: { bio?, service_categories?, etc }
   * Response: Vendor
   */
  UPDATE: (id: number) => `/vendors/${id}/`,

  /**
   * GET /api/vendors/{id}/reviews/
   * Response: Review[] - List of reviews for vendor
   */
  REVIEWS: (id: number) => `/vendors/${id}/reviews/`,

  /**
   * GET /api/vendors/{id}/profile/
   * Response: VendorPublicProfile - Full vendor profile for customers
   * Includes: basic info, stats, services, recent reviews, is_favorite
   */
  PROFILE: (id: number) => `/vendors/${id}/profile/`,
} as const;

// ============================================================================
// REVIEW ENDPOINTS
// ============================================================================

export const REVIEW_ENDPOINTS = {
  /**
   * POST /api/service-requests/{serviceRequestId}/rate/
   * Body: { stars: 1-5, feedback: "optional text" }
   * Response: { message, review: { id, service_request, customer, vendor, stars, feedback, created_at } }
   */
  RATE_SERVICE: (serviceRequestId: number) => `/service-requests/${serviceRequestId}/rate/`,
} as const;

// ============================================================================
// PROPOSAL ENDPOINTS
// ============================================================================

export const PROPOSAL_ENDPOINTS = {
  /**
   * GET /api/proposals/
   * Response: ServiceProposal[]
   */
  LIST: '/proposals/',

  /**
   * GET /api/proposals/{id}/
   * Response: ServiceProposal
   */
  DETAIL: (id: number) => `/proposals/${id}/`,

  /**
   * PATCH /api/proposals/{id}/
   * Body: { status?, estimated_price?, etc }
   * Response: ServiceProposal
   */
  UPDATE: (id: number) => `/proposals/${id}/`,
} as const;

// ============================================================================
// SUBSCRIPTION & PLANS ENDPOINTS (Future)
// ============================================================================

export const SUBSCRIPTION_ENDPOINTS = {
  /**
   * GET /api/plans/
   * Response: Plan[]
   */
  PLANS: '/plans/',

  /**
   * GET /api/subscriptions/current/
   * Response: Subscription
   */
  CURRENT: '/subscriptions/current/',

  /**
   * POST /api/subscriptions/checkout/
   * Body: { plan_id }
   * Response: { checkout_url }
   */
  CHECKOUT: '/subscriptions/checkout/',
} as const;

// ============================================================================
// ADMIN ENDPOINTS (Future)
// ============================================================================

export const ADMIN_ENDPOINTS = {
  /**
   * GET /api/admin/dashboard/
   * Response: { users_count, requests_count, vendors_count }
   */
  DASHBOARD: '/admin/dashboard/',

  /**
   * GET /api/admin/users/
   * Response: User[]
   */
  USERS: '/admin/users/',

  /**
   * POST /api/admin/verify-vendor/{vendor_id}/
   * Response: { message, verified: true }
   */
  VERIFY_VENDOR: (vendorId: number) => `/admin/verify-vendor/${vendorId}/`,
} as const;

// ============================================================================
// LEGACY ENDPOINTS (Backward Compatibility)
// ============================================================================

/**
 * @deprecated Use AUTH_ENDPOINTS instead
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: AUTH_ENDPOINTS.LOGIN,
    REGISTER: AUTH_ENDPOINTS.SIGNUP, // Note: renamed to signup in backend
    LOGOUT: '/auth/logout/', // Blacklists refresh token on server
  },
  SERVICES: CATEGORY_ENDPOINTS.LIST,
  REQUESTS: SERVICE_REQUEST_ENDPOINTS.LIST,
  PROPOSALS: PROPOSAL_ENDPOINTS.LIST,
  VENDORS: '/vendors/',
  PLANS: SUBSCRIPTION_ENDPOINTS.PLANS,
  SUBSCRIPTIONS: SUBSCRIPTION_ENDPOINTS.CURRENT,
  ADMIN: ADMIN_ENDPOINTS.DASHBOARD,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build URL with query parameters
 * Example: buildUrl('/service-requests/', { status: 'pending', category: 1 })
 * Returns: '/service-requests/?status=pending&category=1'
 */
export function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  if (!params) return endpoint;

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
}

/**
 * Build URL with path parameters
 * Example: buildPath('/service-requests/:id/', { id: 123 })
 * Returns: '/service-requests/123/'
 */
export function buildPath(
  template: string,
  params: Record<string, string | number>
): string {
  let path = template;
  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`:${key}`, String(value));
  });
  return path;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  AUTH: AUTH_ENDPOINTS,
  SERVICE_REQUESTS: SERVICE_REQUEST_ENDPOINTS,
  CATEGORIES: CATEGORY_ENDPOINTS,
  CUSTOMER: CUSTOMER_ENDPOINTS,
  FAVORITES: FAVORITE_ENDPOINTS,
  VENDOR: VENDOR_ENDPOINTS,
  REVIEWS: REVIEW_ENDPOINTS,
  PROPOSALS: PROPOSAL_ENDPOINTS,
  SUBSCRIPTIONS: SUBSCRIPTION_ENDPOINTS,
  ADMIN: ADMIN_ENDPOINTS,

  // Helpers
  buildUrl,
  buildPath,
};
