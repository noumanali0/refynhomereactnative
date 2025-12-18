// src/config/appConfig.ts
/**
 * Centralized App Configuration
 *
 * Contains all hardcoded values, timeouts, thresholds, and limits used throughout the app.
 * This makes it easier to tune values and maintain consistency.
 *
 * Note: WebSocket-specific config is in socket.ts
 * Note: Environment variables (API URLs, keys) are in .env
 */

// ============================================================================
// API Configuration
// ============================================================================

export const API_CONFIG = {
  /** Default timeout for API requests in milliseconds */
  TIMEOUT_MS: 8000,
  /** Maximum retry attempts for failed requests */
  MAX_RETRIES: 2,
  /** Initial delay between retries in milliseconds */
  RETRY_INITIAL_DELAY_MS: 1000,
  /** Maximum delay between retries in milliseconds */
  RETRY_MAX_DELAY_MS: 10000,
  /** Backoff multiplier for retry delays */
  RETRY_BACKOFF_FACTOR: 2,
} as const;

// ============================================================================
// Google Services Configuration
// ============================================================================

export const GOOGLE_CONFIG = {
  /** Timeout for Google Routes API calls in milliseconds */
  ROUTES_TIMEOUT_MS: 15000,
  /** Timeout for Google Places API calls in milliseconds */
  PLACES_TIMEOUT_MS: 15000,
} as const;

// ============================================================================
// Location Tracking Configuration
// ============================================================================

export const LOCATION_CONFIG = {
  /** Vendor arrival threshold in meters (100m = arrived) */
  VENDOR_ARRIVAL_THRESHOLD_M: 100,
  /** Background location update interval in milliseconds */
  BACKGROUND_LOCATION_INTERVAL_MS: 15000,
  /** Minimum distance change in meters between updates */
  BACKGROUND_LOCATION_DISTANCE_M: 20,
  /** Maximum tracking duration in milliseconds (6 hours) */
  MAX_TRACKING_DURATION_MS: 6 * 60 * 60 * 1000,
  /** Maximum acceptable location accuracy in meters */
  MAX_ACCURACY_METERS: 100,
  /** Maximum queued locations when offline */
  MAX_LOCATION_QUEUE_SIZE: 50,
} as const;

// ============================================================================
// Route Tracking Configuration
// ============================================================================

export const ROUTE_CONFIG = {
  /** Minimum time between route API calls in milliseconds */
  THROTTLE_MS: 15000,
  /** Minimum distance change in meters to trigger route refetch */
  SIGNIFICANT_DISTANCE_M: 100,
  /** Maximum polyline points to prevent rendering issues */
  MAX_POLYLINE_POINTS: 80,
} as const;

// ============================================================================
// Vendor Distance/Cancel Configuration
// ============================================================================

export const VENDOR_TRACKING_CONFIG = {
  /** Distance threshold in meters - cancel button disappears after this (1km) */
  DISTANCE_THRESHOLD_M: 1000,
  /**
   * Time in ms vendor must be stationary to re-enable cancel
   * Note: Backend uses 20 minutes for stationary detection.
   * Frontend uses 10 minutes as a fallback/safety margin.
   */
  STATIONARY_THRESHOLD_MS: 10 * 60 * 1000, // 10 minutes (frontend fallback)
  /** Backend stationary threshold is 20 minutes */
  BACKEND_STATIONARY_THRESHOLD_MINS: 20,
  /** Minimum movement in meters to consider vendor as "moving" */
  SIGNIFICANT_MOVEMENT_M: 20,
} as const;

// ============================================================================
// Service Request Configuration
// ============================================================================

export const REQUEST_CONFIG = {
  /** Default search radius for nearby vendors in km */
  DEFAULT_SEARCH_RADIUS_KM: 50,
  /** Request expiry timeout in seconds (5 minutes) */
  REQUEST_TIMEOUT_SECONDS: 300,
  /** Proposal acceptance window in seconds */
  PROPOSAL_ACCEPTANCE_WINDOW: 30,
  /** Maximum service requests to keep in memory */
  MAX_CACHED_REQUESTS: 500,
} as const;

// ============================================================================
// UI/UX Configuration
// ============================================================================

export const UI_CONFIG = {
  /** Debounce time for vendor location updates on customer side in ms */
  VENDOR_LOCATION_DEBOUNCE_MS: 3000,
  /** Batch delay for expired request events in ms */
  EXPIRED_BATCH_DELAY_MS: 500,
  /** Cancel disable duration after accepting proposal in ms (1 minute) */
  CANCEL_DISABLE_DURATION_MS: 60 * 1000,
  /** FlatList initial render count */
  FLATLIST_INITIAL_NUM: 3,
  /** FlatList batching period in ms */
  FLATLIST_BATCH_PERIOD: 50,
} as const;

// ============================================================================
// Cache Configuration
// ============================================================================

export const CACHE_CONFIG = {
  /** Maximum selector cache size for proposals */
  MAX_SELECTOR_CACHE_SIZE: 100,
  /** Maximum socket message queue size */
  MAX_MESSAGE_QUEUE_SIZE: 50,
} as const;

// ============================================================================
// Map Configuration
// ============================================================================

export const MAP_CONFIG = {
  /** Map edge padding for fitToCoordinates */
  EDGE_PADDING: { top: 100, right: 100, bottom: 400, left: 100 },
  /** Default map delta for initial region */
  DEFAULT_DELTA: 0.02,
} as const;
