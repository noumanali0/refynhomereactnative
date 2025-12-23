// src/hooks/useCurrentLocation.ts
/**
 * Hook for getting user's current location and reverse geocoding to city name
 * Handles permissions, location fetching, and reverse geocoding
 *
 * Currently using: OpenStreetMap (free, no API key)
 * To switch to Mapbox: Change import from openStreetMapService to mapboxService
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
// TODO: Switch to mapboxService when public token is available
// import { mapboxService } from '@/services/mapboxService';
import { openStreetMapService } from '@/services/openStreetMapService';
import type { Address } from '@/types/mapbox';

interface UseCurrentLocationOptions {
  autoFetch?: boolean; // Automatically fetch on mount
  updateRedux?: boolean; // Whether to update Redux state (for future implementation)
}

interface UseCurrentLocationReturn {
  location: Address | null;
  city: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  loading: boolean;
  error: string | null;
  permissionStatus: Location.PermissionStatus | null;
  refetch: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

export function useCurrentLocation(
  options: UseCurrentLocationOptions = {}
): UseCurrentLocationReturn {
  const { autoFetch = false } = options;

  const [location, setLocation] = useState<Address | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<Location.PermissionStatus | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check permission status on mount
  useEffect(() => {
    checkPermission();
  }, []);

  // Auto-fetch if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchCurrentLocation();
    }
  }, [autoFetch]);

  /**
   * Check current permission status
   */
  const checkPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
    } catch (err) {
      console.error('Error checking location permission:', err);
    }
  };

  /**
   * Request location permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status === Location.PermissionStatus.GRANTED) {
        return true;
      }

      setError('Location permission denied');
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request permission';
      setError(message);
      return false;
    }
  }, []);

  /**
   * Fetch current location and reverse geocode
   */
  const fetchCurrentLocation = useCallback(async () => {
    // Early exit if unmounted
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Check permission
      let status = permissionStatus;
      if (!status || status === Location.PermissionStatus.UNDETERMINED) {
        const granted = await requestPermission();
        if (!granted || !isMountedRef.current) {
          if (isMountedRef.current) setLoading(false);
          return;
        }
        status = Location.PermissionStatus.GRANTED;
      }

      if (!isMountedRef.current) return;

      if (status !== Location.PermissionStatus.GRANTED) {
        if (isMountedRef.current) {
          setError('Location permission is required');
          setLoading(false);
        }
        return;
      }

      // 2. Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000, // Use cached location if less than 10s old
      });

      // Check if still mounted after async call
      if (!isMountedRef.current) return;

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCoordinates(coords);

      // 3. Reverse geocode to get address (using OpenStreetMap for now)
      const address = await openStreetMapService.reverseGeocode(
        position.coords.longitude,
        position.coords.latitude
      );

      // Check if still mounted after async call
      if (!isMountedRef.current) return;

      if (address) {
        setLocation(address);
        setCity(address.city || null);
      } else {
        setError('Could not determine location');
      }
    } catch (err) {
      // Only update state if still mounted
      if (isMountedRef.current) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to get current location';
        setError(message);
        console.error('useCurrentLocation error:', err);
      }
    } finally {
      // Only update loading state if still mounted
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [permissionStatus, requestPermission]);

  return {
    location,
    city,
    coordinates,
    loading,
    error,
    permissionStatus,
    refetch: fetchCurrentLocation,
    requestPermission,
  };
}
