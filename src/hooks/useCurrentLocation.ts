// src/hooks/useCurrentLocation.ts
/**
 * Hook for getting user's current location and reverse geocoding to city name
 * Handles permissions, location fetching, and reverse geocoding
 *
 * Currently using: OpenStreetMap (free, no API key)
 * To switch to Mapbox: Change import from openStreetMapService to mapboxService
 */

import { useState, useEffect, useCallback } from 'react';
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
    setLoading(true);
    setError(null);

    try {
      // 1. Check permission
      let status = permissionStatus;
      if (!status || status === Location.PermissionStatus.UNDETERMINED) {
        const granted = await requestPermission();
        if (!granted) {
          setLoading(false);
          return;
        }
        status = Location.PermissionStatus.GRANTED;
      }

      if (status !== Location.PermissionStatus.GRANTED) {
        setError('Location permission is required');
        setLoading(false);
        return;
      }

      // 2. Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000, // Use cached location if less than 10s old
      });

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

      if (address) {
        setLocation(address);
        setCity(address.city || null);
      } else {
        setError('Could not determine location');
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to get current location';
      setError(message);
      console.error('useCurrentLocation error:', err);
    } finally {
      setLoading(false);
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
