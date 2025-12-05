/**
 * useRouteTracking Hook
 *
 * Manages route tracking between vendor location and service location.
 * Includes proper throttling, AbortController for race condition handling,
 * and mounted state checks for safe state updates.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coordinates } from '@/types/socket';

// ============================================================================
// Constants
// ============================================================================

const ROUTE_CONSTANTS = {
  /** Minimum time between route API calls in milliseconds */
  THROTTLE_MS: 15000,
  /** OSRM API base URL */
  API_URL: 'https://router.project-osrm.org/route/v1/driving',
} as const;

// ============================================================================
// Types
// ============================================================================

interface UseRouteTrackingParams {
  /** Vendor's current location */
  vendorLocation: Coordinates | null;
  /** Service destination location */
  serviceLocation: Coordinates | null;
  /** Whether tracking is enabled (e.g., proposal accepted) */
  enabled: boolean;
  /** Callback when first route is fetched (for map animation) */
  onFirstRouteFetch?: (route: Coordinates[]) => void;
}

interface UseRouteTrackingResult {
  /** Array of coordinates representing the route */
  routeCoords: Coordinates[];
  /** Whether a route fetch is in progress */
  isLoading: boolean;
  /** Last error message, if any */
  error: string | null;
  /** Manually trigger a route refresh */
  refreshRoute: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook for tracking routes between two locations with proper
 * throttling, race condition handling, and cleanup.
 */
export function useRouteTracking({
  vendorLocation,
  serviceLocation,
  enabled,
  onFirstRouteFetch,
}: UseRouteTrackingParams): UseRouteTrackingResult {
  // State
  const [routeCoords, setRouteCoords] = useState<Coordinates[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for throttling and cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const routeFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRouteFetchRef = useRef<number>(0);
  const hasCalledFirstRouteRef = useRef(false);
  const isMountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Fetches route coordinates from OSRM API.
   * Pure function with no external dependencies.
   */
  const fetchRoute = useCallback(async (
    start: Coordinates,
    end: Coordinates,
    signal?: AbortSignal
  ): Promise<Coordinates[]> => {
    const url = `${ROUTE_CONSTANTS.API_URL}/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url, { signal });

      if (!response.ok) {
        return [start, end]; // Fallback to direct line
      }

      const data = await response.json();

      if (!data?.routes?.length) {
        return [start, end];
      }

      return data.routes[0].geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lng,
        })
      );
    } catch (err) {
      // Don't log abort errors - they're expected during cleanup
      if (err instanceof Error && err.name === 'AbortError') {
        return [];
      }

      if (__DEV__) {
        console.warn('[useRouteTracking] fetchRoute error:', err);
      }

      return [start, end]; // Fallback to direct line
    }
  }, []);

  /**
   * Performs the route fetch with proper abort handling and state updates.
   */
  const doFetchRoute = useCallback(async () => {
    if (!vendorLocation || !serviceLocation || !isMountedRef.current) {
      return;
    }

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsLoading(true);
    setError(null);

    try {
      lastRouteFetchRef.current = Date.now();
      const route = await fetchRoute(vendorLocation, serviceLocation, signal);

      // Only update state if request wasn't aborted and component is mounted
      if (!signal.aborted && isMountedRef.current && route.length > 0) {
        setRouteCoords(route);

        // Call onFirstRouteFetch callback once
        if (!hasCalledFirstRouteRef.current && route.length > 2 && onFirstRouteFetch) {
          hasCalledFirstRouteRef.current = true;
          onFirstRouteFetch(route);
        }
      }
    } catch (err) {
      if (isMountedRef.current && !(err instanceof Error && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Failed to fetch route');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [vendorLocation, serviceLocation, fetchRoute, onFirstRouteFetch]);

  /**
   * Manual refresh function exposed to consumers.
   */
  const refreshRoute = useCallback(() => {
    if (vendorLocation && serviceLocation && enabled) {
      lastRouteFetchRef.current = 0; // Reset throttle
      doFetchRoute();
    }
  }, [vendorLocation, serviceLocation, enabled, doFetchRoute]);

  // Main effect for route tracking
  useEffect(() => {
    // Clear route if tracking is disabled or locations unavailable
    if (!enabled || !serviceLocation) {
      setRouteCoords([]);
      hasCalledFirstRouteRef.current = false;
      return;
    }

    if (!vendorLocation) {
      setRouteCoords([]);
      return;
    }

    const now = Date.now();
    const timeSinceLastFetch = now - lastRouteFetchRef.current;

    // Clear any pending timeout
    if (routeFetchTimeoutRef.current) {
      clearTimeout(routeFetchTimeoutRef.current);
    }

    // If first fetch or enough time has passed, fetch immediately
    if (lastRouteFetchRef.current === 0 || timeSinceLastFetch >= ROUTE_CONSTANTS.THROTTLE_MS) {
      doFetchRoute();
    } else {
      // Schedule fetch after remaining throttle time
      const delay = ROUTE_CONSTANTS.THROTTLE_MS - timeSinceLastFetch;
      routeFetchTimeoutRef.current = setTimeout(doFetchRoute, delay);
    }

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (routeFetchTimeoutRef.current) {
        clearTimeout(routeFetchTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, vendorLocation, serviceLocation]);

  return {
    routeCoords,
    isLoading,
    error,
    refreshRoute,
  };
}

export default useRouteTracking;
