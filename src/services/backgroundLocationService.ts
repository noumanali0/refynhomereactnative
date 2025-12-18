/**
 * Background Location Service
 *
 * Handles background location tracking for vendors en route to customers.
 * Uses expo-task-manager for persistent tracking even when app is backgrounded/killed.
 *
 * Features:
 * - Background task definition with foreground service notification (Android)
 * - HTTP API fallback when app is killed (WebSocket won't work in background)
 * - Location queuing for offline resilience
 * - Automatic queue flush on reconnection
 * - Clean start/stop lifecycle management
 *
 * IMPORTANT: When app is killed, WebSocket connection is lost. This service uses
 * HTTP API to send location updates directly to the backend, which then broadcasts
 * to the customer via WebSocket.
 */

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from './socketService';
import { API_BASE_URL } from '@/api/client';
import { VENDOR_ENDPOINTS } from '@/api/endpoints';
import { getValidAccessToken } from '@/api/interceptors';

// ============================================================================
// Constants
// ============================================================================

export const BACKGROUND_LOCATION_TASK = 'vendor-background-location';

// SecureStore keys for background task data persistence
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'authToken', // Must match tokenService key
  SERVICE_REQUEST_ID: 'background_service_request_id',
  TRACKING_START_TIME: 'background_tracking_start_time',
};

// AsyncStorage key for persistent location queue
const QUEUE_STORAGE_KEY = 'background_location_queue';

const LOCATION_CONFIG = {
  accuracy: Location.Accuracy.Balanced, // Balanced accuracy saves battery on low-end devices
  timeInterval: 15000,          // 15 seconds (was 5s - too frequent, drains battery)
  distanceInterval: 20,         // 20 meters minimum movement (was 10m)
  deferredUpdatesInterval: 15000,
  showsBackgroundLocationIndicator: true,
  pausesUpdatesAutomatically: true, // Allow pausing when device is stationary
  activityType: Location.ActivityType.AutomotiveNavigation,
};

// HTTP fallback configuration (used when app is killed and WebSocket unavailable)
const HTTP_CONFIG = {
  TIMEOUT_MS: 8000,      // 8 second timeout (matches API client)
  MAX_RETRIES: 2,        // Retry twice on failure
  RETRY_DELAY_MS: 1000,  // 1 second between retries
};

const MAX_QUEUE_SIZE = 50; // ~4 minutes of location data at 5s intervals

// Production-grade limits
const MAX_TRACKING_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours max tracking
const MIN_ACCURACY_METERS = 100; // Reject locations with accuracy > 100m

// ============================================================================
// Lazy Store Access (avoids circular dependency)
// ============================================================================

/**
 * Lazy getter for Redux store to avoid circular dependency.
 * NOTE: Store may not be available when task runs in background after app kill.
 */
let storeInstance: any = null;

function getStore(): any | null {
  try {
    if (!storeInstance) {
      storeInstance = require('@/store').store;
    }
    return storeInstance;
  } catch {
    // Store not available (app was killed)
    return null;
  }
}

/**
 * Check if WebSocket is connected via Redux store
 * Returns false if store is not available (app killed)
 */
function isSocketConnected(): boolean {
  try {
    const store = getStore();
    if (!store) return false;
    // Safe access with optional chaining to prevent crash if dispatch slice is undefined
    const state = store.getState();
    return state?.dispatch?.connectionStatus === 'connected';
  } catch {
    return false;
  }
}

// ============================================================================
// Types
// ============================================================================

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationTaskData {
  locations: Location.LocationObject[];
}

// ============================================================================
// State
// ============================================================================

let locationQueue: Coordinates[] = [];
let activeServiceRequestId: number | null = null;
let isTaskDefined = false;

// ============================================================================
// Location Queue Management (Persistent - survives app kill)
// ============================================================================

/**
 * Load location queue from AsyncStorage
 * Called on app startup to restore queued locations
 */
async function loadPersistedQueue(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        locationQueue = parsed;
        if (__DEV__) {
          console.log(`[BackgroundLocation] Loaded ${locationQueue.length} queued locations from storage`);
        }
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[BackgroundLocation] Failed to load queue from storage:', error);
    }
  }
}

/**
 * Save location queue to AsyncStorage
 * Called after every queue modification
 */
async function persistQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(locationQueue));
  } catch (error) {
    if (__DEV__) {
      console.error('[BackgroundLocation] Failed to persist queue:', error);
    }
  }
}

/**
 * Get current queue status (for debugging)
 */
export function getLocationQueueStatus() {
  return {
    queueSize: locationQueue.length,
    activeServiceRequestId,
    isTaskDefined,
  };
}

/**
 * Clear the location queue (memory + storage)
 */
export async function clearLocationQueue(): Promise<void> {
  locationQueue = [];
  try {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch (error) {
    if (__DEV__) {
      console.error('[BackgroundLocation] Failed to clear persisted queue:', error);
    }
  }
}

/**
 * Flush queued locations to the server via WebSocket
 * Called when socket reconnects
 */
export async function flushLocationQueue(): Promise<void> {
  // Load any persisted locations first
  await loadPersistedQueue();

  if (locationQueue.length === 0) return;

  if (!isSocketConnected()) {
    if (__DEV__) {
      console.log('[BackgroundLocation] Cannot flush - socket not connected');
    }
    return;
  }

  if (__DEV__) {
    console.log(`[BackgroundLocation] Flushing ${locationQueue.length} queued locations`);
  }

  while (locationQueue.length > 0) {
    const coords = locationQueue.shift();
    if (coords) {
      try {
        socketService.send('location.update', {
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        // Small delay to avoid flooding the server
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        if (__DEV__) {
          console.error('[BackgroundLocation] Failed to send queued location:', error);
        }
        // Put it back at the front if send failed
        locationQueue.unshift(coords);
        break;
      }
    }
  }

  // Persist remaining queue (should be empty if flush succeeded)
  await persistQueue();
}

/**
 * Send location update via HTTP API
 * Used when app is in background/killed and WebSocket is not available
 *
 * Features:
 * - Auto token refresh before sending (handles expired tokens)
 * - Timeout protection (8s) to prevent hanging
 * - Retry logic (2 retries with 1s delay)
 * - Error response parsing for debugging
 * - No retry on auth errors (401/403)
 */
async function sendLocationViaHttp(coords: Coordinates, serviceRequestId: number): Promise<boolean> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= HTTP_CONFIG.MAX_RETRIES + 1; attempt++) {
    try {
      // PRODUCTION FIX: Use getValidAccessToken which auto-refreshes expired tokens
      // This is critical for app-kill scenarios where token may have expired
      let token: string | null = null;

      try {
        // Try auto-refresh first (works when app is in foreground/background)
        token = await getValidAccessToken();
      } catch (refreshError) {
        // Auto-refresh failed (likely app killed, no Redux)
        // Fall back to raw SecureStore token
        if (__DEV__) {
          console.log('[BackgroundLocation] Token refresh unavailable, using stored token');
        }
        token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      }

      if (!token) {
        if (__DEV__) {
          console.warn('[BackgroundLocation] No auth token available for HTTP request');
        }
        return false;
      }

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HTTP_CONFIG.TIMEOUT_MS);

      try {
        const response = await fetch(`${API_BASE_URL}${VENDOR_ENDPOINTS.UPDATE_LOCATION}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitude: coords.latitude,
            longitude: coords.longitude,
            service_request_id: serviceRequestId,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          if (__DEV__) {
            console.log('[BackgroundLocation] HTTP location sent successfully:', coords);
          }
          return true;
        }

        // Parse error response for debugging
        let errorDetail = `Status ${response.status}`;
        try {
          const errorBody = await response.json();
          errorDetail = errorBody.detail || errorBody.message || JSON.stringify(errorBody);
        } catch {
          // Ignore parse errors
        }

        if (__DEV__) {
          console.error(`[BackgroundLocation] HTTP failed (attempt ${attempt}/${HTTP_CONFIG.MAX_RETRIES + 1}): ${errorDetail}`);
        }

        // Don't retry on auth errors (401/403) - token is expired/invalid
        if (response.status === 401 || response.status === 403) {
          if (__DEV__) {
            console.error('[BackgroundLocation] Auth error - token expired and refresh failed');
          }
          return false;
        }

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (__DEV__) {
        if (lastError.name === 'AbortError') {
          console.error(`[BackgroundLocation] HTTP timeout (attempt ${attempt}/${HTTP_CONFIG.MAX_RETRIES + 1})`);
        } else {
          // Log detailed error info for debugging
          console.error(`[BackgroundLocation] HTTP error (attempt ${attempt}/${HTTP_CONFIG.MAX_RETRIES + 1}):`, {
            message: lastError.message,
            name: lastError.name,
            url: `${API_BASE_URL}${VENDOR_ENDPOINTS.UPDATE_LOCATION}`,
            serviceRequestId,
          });
        }
      }
    }

    // Wait before retry (except on last attempt)
    if (attempt <= HTTP_CONFIG.MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, HTTP_CONFIG.RETRY_DELAY_MS));
    }
  }

  if (__DEV__) {
    // Only log once per session to avoid spam
    console.warn('[BackgroundLocation] HTTP fallback failed - this is expected if backend endpoint does not exist', {
      hint: 'Add POST /api/vendors/location/ endpoint to backend for HTTP fallback',
      lastError: lastError?.message,
      url: `${API_BASE_URL}${VENDOR_ENDPOINTS.UPDATE_LOCATION}`,
      serviceRequestId,
    });
  }
  return false;
}

/**
 * Send location update to server
 * Uses WebSocket if connected, otherwise falls back to HTTP API
 *
 * IMPORTANT: When app is killed, in-memory state (activeServiceRequestId) is lost.
 * We MUST read service_request_id from SecureStore first for HTTP fallback to work.
 */
async function sendLocationUpdate(coords: Coordinates): Promise<void> {
  // Try WebSocket first (faster, real-time)
  if (isSocketConnected()) {
    try {
      socketService.send('location.update', {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      // Flush any queued locations
      if (locationQueue.length > 0) {
        await flushLocationQueue();
      }

      if (__DEV__) {
        console.log('[BackgroundLocation] Sent location via WebSocket:', coords);
      }
      return;
    } catch (error) {
      if (__DEV__) {
        console.error('[BackgroundLocation] WebSocket send failed:', error);
      }
      // Fall through to HTTP
    }
  }

  // WebSocket not available - use HTTP API fallback
  // NOTE: HTTP fallback requires backend endpoint POST /api/vendors/location/
  // If endpoint doesn't exist, location will be queued for later WebSocket send
  // CRITICAL: Always read from SecureStore FIRST (in-memory state lost after app kill)
  let serviceReqId: number | null = null;

  try {
    const storedId = await SecureStore.getItemAsync(STORAGE_KEYS.SERVICE_REQUEST_ID);
    if (storedId) {
      serviceReqId = parseInt(storedId, 10);
      if (__DEV__) {
        console.log('[BackgroundLocation] Read service_request_id from SecureStore:', serviceReqId);
      }
    }
  } catch (e) {
    if (__DEV__) {
      console.error('[BackgroundLocation] Failed to read service_request_id from SecureStore:', e);
    }
  }

  // Fallback to in-memory (only works if app wasn't killed)
  if (!serviceReqId && activeServiceRequestId) {
    serviceReqId = activeServiceRequestId;
    if (__DEV__) {
      console.log('[BackgroundLocation] Using in-memory service_request_id:', serviceReqId);
    }
  }

  // CRITICAL: Don't send HTTP without service_request_id - backend will reject it
  if (!serviceReqId) {
    if (__DEV__) {
      console.error('[BackgroundLocation] No service_request_id available - cannot send HTTP update');
      console.error('[BackgroundLocation] This likely means the background tracking was not started properly');
    }
    queueLocation(coords);
    return;
  }

  const httpSuccess = await sendLocationViaHttp(coords, serviceReqId);

  if (!httpSuccess) {
    // HTTP failed, queue the location for later
    queueLocation(coords);
  }
}

/**
 * Add location to queue (with max size limit)
 * PRODUCTION FIX: Persists to AsyncStorage to survive app kill
 */
async function queueLocation(coords: Coordinates): Promise<void> {
  locationQueue.push(coords);

  // Keep queue size manageable
  if (locationQueue.length > MAX_QUEUE_SIZE) {
    locationQueue.shift(); // Remove oldest
  }

  // Persist queue to AsyncStorage (survives app kill)
  await persistQueue();

  if (__DEV__) {
    console.log(`[BackgroundLocation] Queued location (${locationQueue.length}/${MAX_QUEUE_SIZE})`);
  }
}

/**
 * Check if tracking has exceeded max duration (6 hours)
 * Returns true if should stop tracking
 */
async function isTrackingExpired(): Promise<boolean> {
  try {
    const startTimeStr = await SecureStore.getItemAsync(STORAGE_KEYS.TRACKING_START_TIME);
    if (!startTimeStr) return false;

    const startTime = parseInt(startTimeStr, 10);
    if (isNaN(startTime)) return false;

    const elapsed = Date.now() - startTime;
    const isExpired = elapsed >= MAX_TRACKING_DURATION_MS;

    if (isExpired && __DEV__) {
      console.warn(`[BackgroundLocation] Tracking expired after ${Math.round(elapsed / 1000 / 60 / 60)}h`);
    }

    return isExpired;
  } catch (error) {
    if (__DEV__) {
      console.error('[BackgroundLocation] Failed to check tracking expiry:', error);
    }
    return false;
  }
}

/**
 * Validate location accuracy
 * Returns false if accuracy is too poor (> 100m)
 */
function isLocationAccurate(accuracy: number | null | undefined): boolean {
  if (accuracy === null || accuracy === undefined) {
    // No accuracy info, accept location
    return true;
  }

  if (accuracy > MIN_ACCURACY_METERS) {
    if (__DEV__) {
      console.warn(`[BackgroundLocation] Rejecting inaccurate location (accuracy: ${accuracy}m > ${MIN_ACCURACY_METERS}m)`);
    }
    return false;
  }

  return true;
}

// ============================================================================
// Background Task Definition
// ============================================================================

/**
 * Define the background location task
 * MUST be called at app startup (in _layout.tsx) before any navigation
 */
export function defineBackgroundLocationTask(): void {
  if (isTaskDefined) {
    if (__DEV__) {
      console.log('[BackgroundLocation] Task already defined');
    }
    return;
  }

  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    // Log task trigger for debugging kill mode issues
    if (__DEV__) {
      console.log('[BackgroundLocation] Task triggered', {
        hasData: !!data,
        hasError: !!error,
        timestamp: new Date().toISOString(),
      });
    }

    if (error) {
      if (__DEV__) {
        console.error('[BackgroundLocation] Task error:', error);
      }
      return;
    }

    if (!data) {
      if (__DEV__) {
        console.warn('[BackgroundLocation] No data received');
      }
      return;
    }

    // PRODUCTION FIX: Check if tracking has exceeded max duration (6 hours)
    const expired = await isTrackingExpired();
    if (expired) {
      if (__DEV__) {
        console.warn('[BackgroundLocation] Auto-stopping - tracking exceeded 6 hour limit');
      }
      await stopBackgroundLocationTracking();
      return;
    }

    const { locations } = data as LocationTaskData;

    if (!locations || locations.length === 0) {
      if (__DEV__) {
        console.warn('[BackgroundLocation] No locations in data');
      }
      return;
    }

    // Get the most recent location
    const latestLocation = locations[locations.length - 1];

    // PRODUCTION FIX: Validate location accuracy (reject > 100m)
    if (!isLocationAccurate(latestLocation.coords.accuracy)) {
      if (__DEV__) {
        console.log('[BackgroundLocation] Skipping inaccurate location');
      }
      return;
    }

    const coords: Coordinates = {
      latitude: latestLocation.coords.latitude,
      longitude: latestLocation.coords.longitude,
    };

    // Log location details and connection state for debugging
    if (__DEV__) {
      console.log('[BackgroundLocation] Processing location update', {
        coords,
        accuracy: latestLocation.coords.accuracy,
        timestamp: new Date(latestLocation.timestamp).toISOString(),
        socketConnected: isSocketConnected(),
        activeServiceRequestId,
      });
    }

    // Send to server (will use HTTP if WebSocket not available)
    await sendLocationUpdate(coords);
  });

  isTaskDefined = true;
  if (__DEV__) {
    console.log('[BackgroundLocation] Task defined successfully');
  }
}

// ============================================================================
// Start/Stop Background Tracking
// ============================================================================

/**
 * Request background location permission
 * Returns true if granted
 */
export async function requestBackgroundLocationPermission(): Promise<boolean> {
  try {
    // First check foreground permission
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      if (__DEV__) {
        console.warn('[BackgroundLocation] Foreground permission denied');
      }
      return false;
    }

    // Then request background permission
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      if (__DEV__) {
        console.warn('[BackgroundLocation] Background permission denied');
      }
      return false;
    }

    if (__DEV__) {
      console.log('[BackgroundLocation] All permissions granted');
    }
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('[BackgroundLocation] Permission request failed:', error);
    }
    return false;
  }
}

/**
 * Start background location tracking
 * Call this when vendor's proposal is accepted
 */
export async function startBackgroundLocationTracking(
  serviceRequestId: number
): Promise<boolean> {
  try {
    // Check if already running
    const isRunning = await isBackgroundLocationRunning();
    if (isRunning) {
      if (__DEV__) {
        console.log('[BackgroundLocation] Already running, updating service request ID');
      }
      activeServiceRequestId = serviceRequestId;
      // Persist service request ID for background task after app kill
      await SecureStore.setItemAsync(STORAGE_KEYS.SERVICE_REQUEST_ID, serviceRequestId.toString());
      return true;
    }

    // Ensure task is defined
    if (!isTaskDefined) {
      defineBackgroundLocationTask();
    }

    // Request permissions
    const hasPermission = await requestBackgroundLocationPermission();
    if (!hasPermission) {
      if (__DEV__) {
        console.warn('[BackgroundLocation] Cannot start - permission denied');
      }
      return false;
    }

    // Persist service request ID for background task after app kill
    await SecureStore.setItemAsync(STORAGE_KEYS.SERVICE_REQUEST_ID, serviceRequestId.toString());

    // PRODUCTION FIX: Save tracking start time for timeout check (6 hours max)
    await SecureStore.setItemAsync(STORAGE_KEYS.TRACKING_START_TIME, Date.now().toString());

    // Load any persisted queue from previous session
    await loadPersistedQueue();

    // Start location updates with foreground service
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      ...LOCATION_CONFIG,
      foregroundService: {
        notificationTitle: 'Refyn Home - Active Service',
        notificationBody: 'Tracking your location for customer',
        notificationColor: '#2563EB',
      },
    });

    activeServiceRequestId = serviceRequestId;
    if (__DEV__) {
      console.log(`[BackgroundLocation] Started tracking for service request: ${serviceRequestId}`);
    }
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('[BackgroundLocation] Failed to start tracking:', error);
    }
    return false;
  }
}

/**
 * Stop background location tracking
 * Call this when service is completed or cancelled
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    const isRunning = await isBackgroundLocationRunning();
    if (!isRunning) {
      if (__DEV__) {
        console.log('[BackgroundLocation] Not running, nothing to stop');
      }
      // Still clear storage even if not running
      await SecureStore.deleteItemAsync(STORAGE_KEYS.SERVICE_REQUEST_ID);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.TRACKING_START_TIME);
      await clearLocationQueue();
      return;
    }

    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    activeServiceRequestId = null;

    // Clear all persisted data
    await clearLocationQueue(); // Clears memory + AsyncStorage
    await SecureStore.deleteItemAsync(STORAGE_KEYS.SERVICE_REQUEST_ID);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.TRACKING_START_TIME);

    if (__DEV__) {
      console.log('[BackgroundLocation] Stopped tracking and cleared all storage');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[BackgroundLocation] Failed to stop tracking:', error);
    }
  }
}

/**
 * Check if background location tracking is currently running
 */
export async function isBackgroundLocationRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch (error) {
    if (__DEV__) {
      console.error('[BackgroundLocation] Failed to check status:', error);
    }
    return false;
  }
}

/**
 * Get current active service request ID
 */
export function getActiveServiceRequestId(): number | null {
  return activeServiceRequestId;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if background location is supported on this device
 */
export async function isBackgroundLocationSupported(): Promise<boolean> {
  try {
    const isAvailable = await Location.isBackgroundLocationAvailableAsync();
    return isAvailable;
  } catch (error) {
    if (__DEV__) {
      console.error('[BackgroundLocation] Support check failed:', error);
    }
    return false;
  }
}

/**
 * Get current location (one-time)
 * Useful for initial position before tracking starts
 */
export async function getCurrentLocation(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    if (__DEV__) {
      console.error('[BackgroundLocation] Failed to get current location:', error);
    }
    return null;
  }
}

// ============================================================================
// Export Default Service Object
// ============================================================================

export const backgroundLocationService = {
  defineTask: defineBackgroundLocationTask,
  start: startBackgroundLocationTracking,
  stop: stopBackgroundLocationTracking,
  isRunning: isBackgroundLocationRunning,
  requestPermission: requestBackgroundLocationPermission,
  isSupported: isBackgroundLocationSupported,
  getCurrentLocation,
  flushQueue: flushLocationQueue,
  clearQueue: clearLocationQueue,
  getQueueStatus: getLocationQueueStatus,
  getActiveServiceRequestId,
};

export default backgroundLocationService;
