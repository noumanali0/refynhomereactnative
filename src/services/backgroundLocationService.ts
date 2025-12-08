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
import { socketService } from './socketService';
import { API_BASE_URL } from '@/api/client';
import { VENDOR_ENDPOINTS } from '@/api/endpoints';

// ============================================================================
// Constants
// ============================================================================

export const BACKGROUND_LOCATION_TASK = 'vendor-background-location';

// SecureStore keys for background task data persistence
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken', // Must match tokenService key
  SERVICE_REQUEST_ID: 'background_service_request_id',
};

const LOCATION_CONFIG = {
  accuracy: Location.Accuracy.High,
  timeInterval: 5000,           // 5 seconds
  distanceInterval: 10,         // 10 meters minimum movement
  deferredUpdatesInterval: 5000,
  showsBackgroundLocationIndicator: true,
  pausesUpdatesAutomatically: false,
  activityType: Location.ActivityType.AutomotiveNavigation,
};

const MAX_QUEUE_SIZE = 50; // ~4 minutes of location data at 5s intervals

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
    return store.getState().dispatch.connectionStatus === 'connected';
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
// Location Queue Management
// ============================================================================

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
 * Clear the location queue
 */
export function clearLocationQueue() {
  locationQueue = [];
}

/**
 * Flush queued locations to the server via WebSocket
 * Called when socket reconnects
 */
export async function flushLocationQueue(): Promise<void> {
  if (locationQueue.length === 0) return;

  if (!isSocketConnected()) {
    console.log('[BackgroundLocation] Cannot flush - socket not connected');
    return;
  }

  console.log(`[BackgroundLocation] Flushing ${locationQueue.length} queued locations`);

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
        console.error('[BackgroundLocation] Failed to send queued location:', error);
        // Put it back at the front if send failed
        locationQueue.unshift(coords);
        break;
      }
    }
  }
}

/**
 * Send location update via HTTP API
 * Used when app is in background/killed and WebSocket is not available
 */
async function sendLocationViaHttp(coords: Coordinates, serviceRequestId: number | null): Promise<boolean> {
  try {
    // Get token from SecureStore (available even when app is killed)
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);

    if (!token) {
      console.warn('[BackgroundLocation] No auth token available for HTTP request');
      return false;
    }

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
    });

    if (!response.ok) {
      console.error('[BackgroundLocation] HTTP update failed:', response.status);
      return false;
    }

    if (__DEV__) {
      console.log('[BackgroundLocation] Sent location via HTTP:', coords);
    }

    return true;
  } catch (error) {
    console.error('[BackgroundLocation] HTTP request failed:', error);
    return false;
  }
}

/**
 * Send location update to server
 * Uses WebSocket if connected, otherwise falls back to HTTP API
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
      console.error('[BackgroundLocation] WebSocket send failed:', error);
      // Fall through to HTTP
    }
  }

  // WebSocket not available - use HTTP API
  // Get service request ID from SecureStore (persists even after app kill)
  let serviceReqId = activeServiceRequestId;
  if (!serviceReqId) {
    try {
      const storedId = await SecureStore.getItemAsync(STORAGE_KEYS.SERVICE_REQUEST_ID);
      if (storedId) {
        serviceReqId = parseInt(storedId, 10);
      }
    } catch {
      // Ignore errors reading from storage
    }
  }

  const httpSuccess = await sendLocationViaHttp(coords, serviceReqId);

  if (!httpSuccess) {
    // Both methods failed, queue the location
    queueLocation(coords);
  }
}

/**
 * Add location to queue (with max size limit)
 */
function queueLocation(coords: Coordinates): void {
  locationQueue.push(coords);

  // Keep queue size manageable
  if (locationQueue.length > MAX_QUEUE_SIZE) {
    locationQueue.shift(); // Remove oldest
  }

  if (__DEV__) {
    console.log(`[BackgroundLocation] Queued location (${locationQueue.length}/${MAX_QUEUE_SIZE})`);
  }
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
    console.log('[BackgroundLocation] Task already defined');
    return;
  }

  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('[BackgroundLocation] Task error:', error);
      return;
    }

    if (!data) {
      console.warn('[BackgroundLocation] No data received');
      return;
    }

    const { locations } = data as LocationTaskData;

    if (!locations || locations.length === 0) {
      console.warn('[BackgroundLocation] No locations in data');
      return;
    }

    // Get the most recent location
    const latestLocation = locations[locations.length - 1];
    const coords: Coordinates = {
      latitude: latestLocation.coords.latitude,
      longitude: latestLocation.coords.longitude,
    };

    if (__DEV__) {
      console.log('[BackgroundLocation] Task received location:', {
        ...coords,
        accuracy: latestLocation.coords.accuracy,
        timestamp: new Date(latestLocation.timestamp).toISOString(),
      });
    }

    // Send to server (will use HTTP if WebSocket not available)
    await sendLocationUpdate(coords);
  });

  isTaskDefined = true;
  console.log('[BackgroundLocation] Task defined successfully');
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
      console.warn('[BackgroundLocation] Foreground permission denied');
      return false;
    }

    // Then request background permission
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('[BackgroundLocation] Background permission denied');
      return false;
    }

    console.log('[BackgroundLocation] All permissions granted');
    return true;
  } catch (error) {
    console.error('[BackgroundLocation] Permission request failed:', error);
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
      console.log('[BackgroundLocation] Already running, updating service request ID');
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
      console.warn('[BackgroundLocation] Cannot start - permission denied');
      return false;
    }

    // Persist service request ID for background task after app kill
    await SecureStore.setItemAsync(STORAGE_KEYS.SERVICE_REQUEST_ID, serviceRequestId.toString());

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
    console.log(`[BackgroundLocation] Started tracking for service request: ${serviceRequestId}`);
    return true;
  } catch (error) {
    console.error('[BackgroundLocation] Failed to start tracking:', error);
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
      console.log('[BackgroundLocation] Not running, nothing to stop');
      return;
    }

    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    activeServiceRequestId = null;
    clearLocationQueue();

    // Clear persisted service request ID
    await SecureStore.deleteItemAsync(STORAGE_KEYS.SERVICE_REQUEST_ID);

    console.log('[BackgroundLocation] Stopped tracking');
  } catch (error) {
    console.error('[BackgroundLocation] Failed to stop tracking:', error);
  }
}

/**
 * Check if background location tracking is currently running
 */
export async function isBackgroundLocationRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch (error) {
    console.error('[BackgroundLocation] Failed to check status:', error);
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
    console.error('[BackgroundLocation] Support check failed:', error);
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
    console.error('[BackgroundLocation] Failed to get current location:', error);
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
