/**
 * Token Service
 *
 * Centralized service for managing JWT tokens using Expo SecureStore.
 * SecureStore provides hardware-backed encryption on devices that support it.
 *
 * Features:
 * - Secure token storage using device keychain/keystore
 * - Token expiry checking
 * - Automatic token refresh
 * - Token cleanup on logout
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ============================================================================
// CONSTANTS
// ============================================================================

const TOKEN_KEYS = {
  ACCESS_TOKEN: 'authToken', // Keep legacy key name for backward compatibility
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'user',
  TOKEN_EXPIRY: 'tokenExpiry',
} as const;

// Token lifetime from backend: 1 day for access, 30 days for refresh
const ACCESS_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Refresh token when it's within 5 minutes of expiring
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// SECURE STORAGE HELPERS
// ============================================================================

/**
 * Safely get item from SecureStore
 * Returns null if item doesn't exist or on error
 */
async function getSecureItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      // Fallback to localStorage for web (not secure, but works for development)
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Error reading ${key} from SecureStore:`, error);
    return null;
  }
}

/**
 * Safely set item in SecureStore
 */
async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // Fallback to localStorage for web
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Error writing ${key} to SecureStore:`, error);
    throw error;
  }
}

/**
 * Safely delete item from SecureStore
 */
async function deleteSecureItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Error deleting ${key} from SecureStore:`, error);
    // Don't throw - deletion failures are non-critical
  }
}

// ============================================================================
// TOKEN STORAGE
// ============================================================================

/**
 * Save access token to SecureStore
 */
export async function saveAccessToken(token: string): Promise<void> {
  await setSecureItem(TOKEN_KEYS.ACCESS_TOKEN, token);

  // Calculate and save expiry time
  const expiryTime = Date.now() + ACCESS_TOKEN_LIFETIME_MS;
  await setSecureItem(TOKEN_KEYS.TOKEN_EXPIRY, expiryTime.toString());
}

/**
 * Save refresh token to SecureStore
 */
export async function saveRefreshToken(token: string): Promise<void> {
  await setSecureItem(TOKEN_KEYS.REFRESH_TOKEN, token);
}

/**
 * Save both access and refresh tokens
 * This is the primary method to use after login/signup
 */
export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([saveAccessToken(accessToken), saveRefreshToken(refreshToken)]);
}

/**
 * Get access token from SecureStore
 */
export async function getAccessToken(): Promise<string | null> {
  return await getSecureItem(TOKEN_KEYS.ACCESS_TOKEN);
}

/**
 * Get refresh token from SecureStore
 */
export async function getRefreshToken(): Promise<string | null> {
  return await getSecureItem(TOKEN_KEYS.REFRESH_TOKEN);
}

/**
 * Get both tokens
 * Returns object with access and refresh tokens (either may be null)
 */
export async function getTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const [accessToken, refreshToken] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
  ]);

  return { accessToken, refreshToken };
}

/**
 * Clear access token only
 * Useful when refreshing tokens
 */
export async function clearAccessToken(): Promise<void> {
  await deleteSecureItem(TOKEN_KEYS.ACCESS_TOKEN);
  await deleteSecureItem(TOKEN_KEYS.TOKEN_EXPIRY);
}

/**
 * Clear all tokens
 * Use this on logout
 */
export async function clearTokens(): Promise<void> {
  await Promise.all([
    deleteSecureItem(TOKEN_KEYS.ACCESS_TOKEN),
    deleteSecureItem(TOKEN_KEYS.REFRESH_TOKEN),
    deleteSecureItem(TOKEN_KEYS.TOKEN_EXPIRY),
  ]);
}

// ============================================================================
// TOKEN EXPIRY MANAGEMENT
// ============================================================================

/**
 * Get token expiry timestamp
 */
export async function getTokenExpiry(): Promise<number | null> {
  const expiryStr = await getSecureItem(TOKEN_KEYS.TOKEN_EXPIRY);
  if (!expiryStr) return null;

  const expiry = parseInt(expiryStr, 10);
  return isNaN(expiry) ? null : expiry;
}

/**
 * Check if access token is expired
 */
export async function isAccessTokenExpired(): Promise<boolean> {
  const expiry = await getTokenExpiry();
  if (!expiry) return true; // No expiry = assume expired

  return Date.now() >= expiry;
}

/**
 * Check if access token needs refresh soon
 * Returns true if token expires within threshold (5 minutes)
 */
export async function shouldRefreshToken(): Promise<boolean> {
  const expiry = await getTokenExpiry();
  if (!expiry) return true;

  return Date.now() >= expiry - TOKEN_REFRESH_THRESHOLD_MS;
}

/**
 * Get time until token expiry in milliseconds
 * Returns 0 if expired or no expiry found
 */
export async function getTimeUntilExpiry(): Promise<number> {
  const expiry = await getTokenExpiry();
  if (!expiry) return 0;

  const timeLeft = expiry - Date.now();
  return Math.max(0, timeLeft);
}

// ============================================================================
// USER DATA MANAGEMENT
// ============================================================================

/**
 * Save user data to SecureStore
 */
export async function saveUserData(user: any): Promise<void> {
  const userJson = JSON.stringify(user);
  await setSecureItem(TOKEN_KEYS.USER_DATA, userJson);
}

/**
 * Get user data from SecureStore
 */
export async function getUserData<T = any>(): Promise<T | null> {
  const userJson = await getSecureItem(TOKEN_KEYS.USER_DATA);
  if (!userJson) return null;

  try {
    return JSON.parse(userJson) as T;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

/**
 * Clear user data
 */
export async function clearUserData(): Promise<void> {
  await deleteSecureItem(TOKEN_KEYS.USER_DATA);
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Save complete session (tokens + user data)
 * Primary method after successful authentication
 */
export async function saveSession(
  accessToken: string,
  refreshToken: string,
  user: any
): Promise<void> {
  await Promise.all([
    saveTokens(accessToken, refreshToken),
    saveUserData(user),
  ]);
}

/**
 * Restore session from SecureStore
 * Returns session data or null if not found
 */
export async function restoreSession(): Promise<{
  accessToken: string;
  refreshToken: string;
  user: any;
} | null> {
  const [tokens, user] = await Promise.all([getTokens(), getUserData()]);

  // Session is valid only if we have all required data
  if (!tokens.accessToken || !tokens.refreshToken || !user) {
    return null;
  }

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user,
  };
}

/**
 * Clear complete session
 * Use this on logout
 */
export async function clearSession(): Promise<void> {
  await Promise.all([clearTokens(), clearUserData()]);
}

// ============================================================================
// TOKEN VALIDATION
// ============================================================================

/**
 * Check if we have a valid session
 * Checks for presence of tokens and user data
 */
export async function hasValidSession(): Promise<boolean> {
  const session = await restoreSession();
  return session !== null;
}

/**
 * Get session status
 * Returns detailed information about current session
 */
export async function getSessionStatus(): Promise<{
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  hasUserData: boolean;
  isAccessTokenExpired: boolean;
  shouldRefresh: boolean;
  timeUntilExpiry: number;
}> {
  const [tokens, user, expired, shouldRefresh, timeLeft] = await Promise.all([
    getTokens(),
    getUserData(),
    isAccessTokenExpired(),
    shouldRefreshToken(),
    getTimeUntilExpiry(),
  ]);

  return {
    hasAccessToken: !!tokens.accessToken,
    hasRefreshToken: !!tokens.refreshToken,
    hasUserData: !!user,
    isAccessTokenExpired: expired,
    shouldRefresh,
    timeUntilExpiry: timeLeft,
  };
}

// ============================================================================
// DEBUG UTILITIES (Development Only)
// ============================================================================

/**
 * Log current session status (for debugging)
 * Only use in development
 */
export async function debugSessionStatus(): Promise<void> {
  if (__DEV__) {
    const status = await getSessionStatus();
    console.log('=== Token Service Debug ===');
    console.log('Has Access Token:', status.hasAccessToken);
    console.log('Has Refresh Token:', status.hasRefreshToken);
    console.log('Has User Data:', status.hasUserData);
    console.log('Is Access Token Expired:', status.isAccessTokenExpired);
    console.log('Should Refresh:', status.shouldRefresh);
    console.log(
      'Time Until Expiry:',
      Math.floor(status.timeUntilExpiry / 1000 / 60),
      'minutes'
    );
    console.log('===========================');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Token storage
  saveAccessToken,
  saveRefreshToken,
  saveTokens,
  getAccessToken,
  getRefreshToken,
  getTokens,
  clearAccessToken,
  clearTokens,

  // Token expiry
  getTokenExpiry,
  isAccessTokenExpired,
  shouldRefreshToken,
  getTimeUntilExpiry,

  // User data
  saveUserData,
  getUserData,
  clearUserData,

  // Session management
  saveSession,
  restoreSession,
  clearSession,
  hasValidSession,
  getSessionStatus,

  // Debug
  debugSessionStatus,
};
