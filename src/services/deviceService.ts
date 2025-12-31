/**
 * Device Service
 *
 * Manages device identification for single-device login enforcement.
 * Generates and persists a unique device ID using SecureStore.
 *
 * Features:
 * - Generates UUID on first run
 * - Persists device ID across app sessions
 * - Provides device name for display in login conflicts
 */

import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Generate a UUID v4 using pure JavaScript (no native modules required)
 * Works in Expo Go without needing a development build
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// Constants
// ============================================================================

const DEVICE_ID_KEY = 'device_unique_id';

// ============================================================================
// Device ID Management
// ============================================================================

/**
 * Get or create a unique device ID
 *
 * This ID is used to identify the device for session tracking.
 * It's generated once and persisted in SecureStore.
 *
 * @returns Promise<string> - The unique device ID (UUID)
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    // Try to get existing device ID
    let deviceId: string | null = null;

    if (Platform.OS === 'web') {
      // Fallback to localStorage for web
      deviceId = localStorage.getItem(DEVICE_ID_KEY);
    } else {
      deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    }

    // If no device ID exists, generate a new one
    if (!deviceId) {
      deviceId = generateUUID();

      if (Platform.OS === 'web') {
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
      } else {
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
      }

      if (__DEV__) {
        console.log('[DeviceService] Generated new device ID:', deviceId);
      }
    } else {
      if (__DEV__) {
        console.log('[DeviceService] Retrieved existing device ID:', deviceId);
      }
    }

    return deviceId;
  } catch (error) {
    console.error('[DeviceService] Error getting device ID:', error);
    // Generate a fallback ID (won't be persisted if storage fails)
    return generateUUID();
  }
}

/**
 * Get human-readable device name
 *
 * Returns a string like "Samsung Galaxy S23" or "iPhone 14 Pro"
 * Used to display which device has an active session.
 *
 * @returns string - The device name
 */
export function getDeviceName(): string {
  if (Platform.OS === 'web') {
    return 'Web Browser';
  }

  const brand = Device.brand || 'Unknown';
  const modelName = Device.modelName || 'Device';

  // Clean up the name
  const name = `${brand} ${modelName}`.trim();

  return name || 'Unknown Device';
}

/**
 * Get device info object for API calls
 *
 * Returns both device ID and name in a single call.
 *
 * @returns Promise<{ deviceId: string; deviceName: string }>
 */
export async function getDeviceInfo(): Promise<{
  deviceId: string;
  deviceName: string;
}> {
  const [deviceId, deviceName] = await Promise.all([
    getOrCreateDeviceId(),
    Promise.resolve(getDeviceName()),
  ]);

  return { deviceId, deviceName };
}

/**
 * Clear device ID (for testing/debugging only)
 *
 * WARNING: This will generate a new device ID on next call,
 * effectively making this appear as a new device.
 */
export async function clearDeviceId(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(DEVICE_ID_KEY);
    } else {
      await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    }

    if (__DEV__) {
      console.log('[DeviceService] Device ID cleared');
    }
  } catch (error) {
    console.error('[DeviceService] Error clearing device ID:', error);
  }
}

// ============================================================================
// Export Service Object
// ============================================================================

export const deviceService = {
  getOrCreateDeviceId,
  getDeviceName,
  getDeviceInfo,
  clearDeviceId,
};

export default deviceService;
