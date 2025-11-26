/**
 * API Client Configuration
 *
 * Axios instance with interceptors for:
 * - Automatic JWT token injection
 * - Token refresh on 401 errors
 * - Request/response logging (dev only)
 * - Error handling
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken } from '@services/tokenService';
import { setupInterceptors } from './interceptors';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = 'http://192.168.100.14:8000/api';

// Log API base URL in development
if (__DEV__) {
  console.log('API Base URL:', API_BASE_URL);
}

// ============================================================================
// AXIOS INSTANCE
// ============================================================================

/**
 * Main API client instance
 * All authenticated requests should use this client
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds (increased for slow networks)
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================

/**
 * Request interceptor to add JWT token to all requests
 * Token is fetched from SecureStore for each request
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Get token from SecureStore
      const token = await getAccessToken();

      // Add token to Authorization header if available
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Log request in development
      if (__DEV__) {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        if (config.data) {
          console.log('[API] Request Data:', config.data);
        }
      }

      return config;
    } catch (error) {
      console.error('[API] Error in request interceptor:', error);
      return config;
    }
  },
  (error: AxiosError) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// ============================================================================
// RESPONSE INTERCEPTOR
// ============================================================================

/**
 * Response interceptor for logging and basic error handling
 * Advanced error handling (401, token refresh) is in interceptors.ts
 */
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (__DEV__) {
      console.log(`[API] Response from ${response.config.url}:`, response.status);
    }
    return response;
  },
  (error: AxiosError) => {
    // Log error in development
    if (__DEV__) {
      console.error('[API] Response error:', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// SETUP ADVANCED INTERCEPTORS
// ============================================================================

/**
 * Setup token refresh and logout interceptors
 * This must be called after Redux store is initialized
 * Call this from app/_layout.tsx after store setup
 */
export function initializeApiClient(logoutCallback: () => void) {
  setupInterceptors(apiClient, logoutCallback);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if error is from API client
 */
export function isApiError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

/**
 * Get error message from API error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    // Django REST Framework error format
    const data = error.response?.data as any;

    // Single error with 'detail' field
    if (data?.detail) {
      return typeof data.detail === 'string' ? data.detail : 'An error occurred';
    }

    // Field validation errors
    if (data && typeof data === 'object') {
      const firstError = Object.values(data)[0];
      if (Array.isArray(firstError) && firstError.length > 0) {
        return firstError[0];
      }
      if (typeof firstError === 'string') {
        return firstError;
      }
    }

    // HTTP status errors
    if (error.response?.status === 401) {
      return 'Unauthorized. Please login again.';
    }
    if (error.response?.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (error.response?.status === 404) {
      return 'Resource not found.';
    }
    if (error.response?.status === 500) {
      return 'Server error. Please try again later.';
    }

    // Network errors
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please check your internet connection.';
    }
    if (error.message === 'Network Error') {
      return 'Network error. Please check your internet connection.';
    }

    return error.message || 'An error occurred';
  }

  // Non-Axios errors
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Get HTTP status code from error
 */
export function getErrorStatus(error: unknown): number | null {
  if (isApiError(error)) {
    return error.response?.status || null;
  }
  return null;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (isApiError(error)) {
    return !error.response && (error.code === 'ECONNABORTED' || error.message === 'Network Error');
  }
  return false;
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.code === 'ECONNABORTED';
  }
  return false;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default apiClient;
export { API_BASE_URL };
