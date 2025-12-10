/**
 * useRouteTracking Hook
 *
 * Manages route tracking between vendor location and service location.
 * Uses Google Directions API for route calculation.
 * Includes proper throttling, AbortController for race condition handling,
 * and mounted state checks for safe state updates.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import type { Coordinates } from '@/types/socket';
import { simplifyRoute } from '@/utils/polylineSimplify';
import { googleDirectionsService } from '@/services/googleDirectionsService';

// ============================================================================
// Constants
// ============================================================================

const ROUTE_CONSTANTS = {
  /** Minimum time between route API calls in milliseconds */
  THROTTLE_MS: 15000,
  /** Minimum distance change in meters to trigger route refetch */
  SIGNIFICANT_DISTANCE_M: 100,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in meters.
 */
function getDistanceInMeters(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const lat1Rad = coord1.latitude * Math.PI / 180;
  const lat2Rad = coord2.latitude * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

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
  // Track previous vendor location to detect significant movement
  const prevVendorLocationRef = useRef<Coordinates | null>(null);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Force initial route fetch on mount when locations are available
  // This handles app restart where state is restored from Redux persist
  // but the main effect hasn't triggered because vendorLocation didn't "change"
  useEffect(() => {
    // Only trigger if: enabled, have both locations, but no route yet
    if (enabled && vendorLocation && serviceLocation && routeCoords.length === 0) {
      if (__DEV__) {
        console.log('[useRouteTracking] Initial mount with locations but no route - forcing fetch');
      }

      // Reset refs to ensure fresh start
      prevVendorLocationRef.current = null;
      lastRouteFetchRef.current = 0;
      hasCalledFirstRouteRef.current = false;

      // Trigger initial fetch after short delay to ensure component is stable
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          InteractionManager.runAfterInteractions(() => {
            if (isMountedRef.current) {
              doFetchRoute();
            }
          });
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // Only run when enabled changes - handles initial mount and acceptance

  /**
   * Fetches route coordinates from Google Directions API.
   * Uses googleDirectionsService for route calculation.
   */
  const fetchRoute = useCallback(async (
    start: Coordinates,
    end: Coordinates,
    _signal?: AbortSignal // Signal not used by Google service (has internal timeout)
  ): Promise<Coordinates[]> => {
    try {
      const routeInfo = await googleDirectionsService.getRoute(start, end);

      if (!routeInfo || !routeInfo.coordinates.length) {
        if (__DEV__) {
          console.warn('[useRouteTracking] Google Directions returned no route, using fallback');
        }
        return [start, end]; // Fallback to direct line
      }

      // Simplify route to max ~80 points to prevent Polyline crash on low-end devices
      return simplifyRoute(routeInfo.coordinates);
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
      prevVendorLocationRef.current = null;
      return;
    }

    if (!vendorLocation) {
      setRouteCoords([]);
      return;
    }

    // CRITICAL: Only process if vendor location changed significantly (>100m)
    // This prevents crash on low-end devices from frequent small location updates
    // EXCEPTION: Always fetch if we have no route yet (handles app restart scenario)
    const isFirstLocation = prevVendorLocationRef.current === null;
    const hasNoRoute = routeCoords.length === 0;

    // Skip distance check if: first location OR no route exists yet
    if (!isFirstLocation && !hasNoRoute) {
      const distanceMoved = getDistanceInMeters(
        prevVendorLocationRef.current!,
        vendorLocation
      );

      if (distanceMoved < ROUTE_CONSTANTS.SIGNIFICANT_DISTANCE_M) {
        if (__DEV__) {
          console.log(
            `[useRouteTracking] Skipping route fetch - vendor moved only ${distanceMoved.toFixed(0)}m (< ${ROUTE_CONSTANTS.SIGNIFICANT_DISTANCE_M}m)`
          );
        }
        return; // Skip - location change not significant enough
      }
    }

    // Log why we're fetching (helps debugging)
    if (__DEV__) {
      if (isFirstLocation) {
        console.log('[useRouteTracking] Fetching route - first vendor location');
      } else if (hasNoRoute) {
        console.log('[useRouteTracking] Fetching route - no existing route (app restart?)');
      }
    }

    // Update previous location reference
    prevVendorLocationRef.current = vendorLocation;

    const now = Date.now();
    const timeSinceLastFetch = now - lastRouteFetchRef.current;

    // Clear any pending timeout
    if (routeFetchTimeoutRef.current) {
      clearTimeout(routeFetchTimeoutRef.current);
    }

    // If first fetch or enough time has passed, fetch with InteractionManager defer
    // This prevents main thread blocking during route processing
    if (lastRouteFetchRef.current === 0 || timeSinceLastFetch >= ROUTE_CONSTANTS.THROTTLE_MS) {
      InteractionManager.runAfterInteractions(() => {
        if (isMountedRef.current) {
          doFetchRoute();
        }
      });
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
