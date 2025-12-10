/**
 * Advanced API Interceptors
 *
 * Handles:
 * - Automatic token refresh on 401 errors
 * - Request queuing during token refresh
 * - Automatic logout on invalid refresh token
 * - Retry failed requests after token refresh
 */

import { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import {
  getRefreshToken,
  saveAccessToken,
  clearSession,
  isAccessTokenExpired,
} from '@services/tokenService';
import { API_BASE_URL } from './client';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let isRefreshing = false;
let failedRequestsQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

// ============================================================================
// TOKEN REFRESH LOGIC
// ============================================================================

/**
 * Refresh the access token using the refresh token
 * Returns new access token or throws error
 */
async function refreshAccessToken(): Promise<string> {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Call refresh endpoint
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh/`,
      { refresh: refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const { access: newAccessToken } = response.data;

    if (!newAccessToken) {
      throw new Error('No access token in refresh response');
    }

    // Save new access token
    await saveAccessToken(newAccessToken);

    if (__DEV__) {
      console.log('[Auth] Token refreshed successfully');
    }

    return newAccessToken;
  } catch (error) {
    if (__DEV__) {
      console.error('[Auth] Token refresh failed:', error);
    }
    throw error;
  }
}

/**
 * Process the queue of failed requests
 * Resolves or rejects all queued requests
 */
function processQueue(error: any = null, token: string | null = null) {
  failedRequestsQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  failedRequestsQueue = [];
}

// ============================================================================
// SETUP INTERCEPTORS
// ============================================================================

/**
 * Setup advanced interceptors on API client
 * Must be called after store is initialized
 *
 * @param apiClient - Axios instance to setup interceptors on
 * @param logoutCallback - Function to call when logout is needed (invalid refresh token)
 */
export function setupInterceptors(
  apiClient: AxiosInstance,
  logoutCallback: () => void
): void {
  /**
   * Response interceptor for handling 401 errors and token refresh
   */
  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Check if error is 401 and we haven't retried yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Token is already being refreshed, queue this request
          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        // Mark request as retried to prevent infinite loop
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Attempt to refresh token
          const newAccessToken = await refreshAccessToken();

          // Update Authorization header with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          // Process queued requests
          processQueue(null, newAccessToken);

          // IMPORTANT: Reconnect WebSocket with new token
          // Socket still has old token after API token refresh, causing auth failures
          try {
            const { socketService } = await import('@/services/socketService');
            if (socketService.isConnected()) {
              if (__DEV__) {
                console.log('[Auth] Reconnecting socket with new token');
              }
              // Use reconnect() which properly closes old connection and opens new one
              socketService.reconnect().catch((err) => {
                if (__DEV__) {
                  console.warn('[Auth] Socket reconnect failed:', err);
                }
              });
            }
          } catch (socketError) {
            // Socket service might not be available, ignore
            if (__DEV__) {
              console.warn('[Auth] Socket reconnect skipped:', socketError);
            }
          }

          // Retry original request
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Token refresh failed - logout user
          processQueue(refreshError, null);

          if (__DEV__) {
            console.error('[Auth] Token refresh failed, logging out user');
          }

          // Clear session and logout
          await clearSession();
          logoutCallback();

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // For other errors or if retry already attempted, reject
      return Promise.reject(error);
    }
  );

  if (__DEV__) {
    console.log('[Auth] Advanced interceptors initialized');
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if token refresh is currently in progress
 */
export function isTokenRefreshing(): boolean {
  return isRefreshing;
}

/**
 * Get number of requests waiting for token refresh
 */
export function getQueuedRequestsCount(): number {
  return failedRequestsQueue.length;
}

/**
 * Manually trigger token refresh
 * Useful for proactive token refresh before expiry
 */
export async function manualTokenRefresh(): Promise<boolean> {
  if (isRefreshing) {
    if (__DEV__) {
      console.log('[Auth] Token refresh already in progress');
    }
    return false;
  }

  try {
    // Check if token is expired or about to expire
    const isExpired = await isAccessTokenExpired();

    if (!isExpired) {
      if (__DEV__) {
        console.log('[Auth] Token is still valid, skipping refresh');
      }
      return false;
    }

    if (__DEV__) {
      console.log('[Auth] Manually refreshing token');
    }

    isRefreshing = true;
    await refreshAccessToken();
    isRefreshing = false;

    return true;
  } catch (error) {
    isRefreshing = false;
    console.error('[Auth] Manual token refresh failed:', error);
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  setupInterceptors,
  manualTokenRefresh,
  isTokenRefreshing,
  getQueuedRequestsCount,
};
