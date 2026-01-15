/**
 * useRouteTracking Hook
 *
 * Manages route tracking between vendor location and service location.
 * Uses OSRM (Open Source Routing Machine) for route calculation.
 * Includes proper throttling, AbortController for race condition handling,
 * and mounted state checks for safe state updates.
 *
 * Note: Switch to Google Routes API when enabled by uncommenting googleDirectionsService
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import type { Coordinates } from '@/types/socket';
import { simplifyRoute } from '@/utils/polylineSimplify';
// Google Routes API - uncomment when enabled
// import { googleDirectionsService, RouteInfo } from '@/services/googleDirectionsService';
import { haversineDistanceKm } from '@/utils/geo';

// RouteInfo type for OSRM response
interface RouteInfo {
  distance: number; // meters
  duration: number; // seconds
  coordinates: Coordinates[];
}

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
  return haversineDistanceKm(
    coord1.latitude,
    coord1.longitude,
    coord2.latitude,
    coord2.longitude
  ) * 1000; // Convert km to meters
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
  /** Road distance in meters (from Google Routes API) */
  roadDistanceMeters: number | null;
  /** Road distance formatted as string (e.g., "2.5 km") */
  roadDistanceFormatted: string | null;
  /** ETA in minutes (from Google Routes API, traffic-aware) */
  etaMinutes: number | null;
  /** ETA formatted as string (e.g., "~8 min") */
  etaFormatted: string | null;
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
  const [roadDistanceMeters, setRoadDistanceMeters] = useState<number | null>(null);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived formatted values (memoized to prevent unnecessary re-renders)
  const roadDistanceFormatted = useMemo(() => {
    if (roadDistanceMeters === null) return null;
    const km = roadDistanceMeters / 1000;
    if (km < 1) {
      return `${Math.round(roadDistanceMeters)} m`;
    }
    return `${km.toFixed(1)} km`;
  }, [roadDistanceMeters]);

  const etaMinutes = useMemo(() => {
    if (etaSeconds === null) return null;
    return Math.ceil(etaSeconds / 60);
  }, [etaSeconds]);

  const etaFormatted = useMemo(() => {
    if (etaMinutes === null) return null;
    if (etaMinutes < 60) {
      return `~${etaMinutes} min`;
    }
    const hours = Math.floor(etaMinutes / 60);
    const mins = etaMinutes % 60;
    return `~${hours}h ${mins}m`;
  }, [etaMinutes]);

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
   * Fetches route from OSRM (Open Source Routing Machine).
   * Returns full RouteInfo including distance, duration, and coordinates.
   *
   * Note: Switch to Google Routes API when enabled:
   * const routeInfo = await googleDirectionsService.getRoute(start, end);
   */
  const fetchRoute = useCallback(async (
    start: Coordinates,
    end: Coordinates,
    signal?: AbortSignal
  ): Promise<{ routeInfo: RouteInfo | null; simplifiedCoords: Coordinates[] }> => {
    try {
      // Using OSRM for now - switch to Google Routes API when enabled
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`,
        { signal }
      );

      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes?.[0]) {
        if (__DEV__) {
          console.warn('[useRouteTracking] OSRM returned no route, using fallback');
        }
        return { routeInfo: null, simplifiedCoords: [start, end] };
      }

      const route = data.routes[0];
      const coordinates: Coordinates[] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lng,
        })
      );

      const routeInfo: RouteInfo = {
        distance: route.distance, // meters
        duration: route.duration, // seconds
        coordinates,
      };

      // OSRM can return 2000+ points which crashes low-end devices
      // Simplify route to max ~80 points
      const simplifiedCoords = simplifyRoute(coordinates);

      if (__DEV__) {
        console.log('[useRouteTracking] Route updated (OSRM):', {
          originalPoints: coordinates.length,
          simplifiedPoints: simplifiedCoords.length,
          distance: `${(route.distance / 1000).toFixed(1)} km`,
          duration: `${Math.ceil(route.duration / 60)} min`,
        });
      }

      return { routeInfo, simplifiedCoords };
    } catch (err) {
      // Don't log abort errors - they're expected during cleanup
      if (err instanceof Error && err.name === 'AbortError') {
        return { routeInfo: null, simplifiedCoords: [] };
      }

      if (__DEV__) {
        console.warn('[useRouteTracking] fetchRoute error:', err);
      }

      return { routeInfo: null, simplifiedCoords: [start, end] }; // Fallback to direct line
    }
  }, []);

  /**
   * Performs the route fetch with proper abort handling and state updates.
   * Updates coordinates, road distance, and ETA from OSRM.
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
      const { routeInfo, simplifiedCoords } = await fetchRoute(vendorLocation, serviceLocation, signal);

      // Only update state if request wasn't aborted and component is mounted
      if (!signal.aborted && isMountedRef.current && simplifiedCoords.length > 0) {
        setRouteCoords(simplifiedCoords);

        // Update road distance and ETA from Google Routes API
        if (routeInfo) {
          setRoadDistanceMeters(routeInfo.distance);
          setEtaSeconds(routeInfo.duration);
        }

        // Call onFirstRouteFetch callback once
        if (!hasCalledFirstRouteRef.current && simplifiedCoords.length > 2 && onFirstRouteFetch) {
          hasCalledFirstRouteRef.current = true;
          onFirstRouteFetch(simplifiedCoords);
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
    // Clear route and tracking data if tracking is disabled or locations unavailable
    if (!enabled || !serviceLocation) {
      setRouteCoords([]);
      setRoadDistanceMeters(null);
      setEtaSeconds(null);
      hasCalledFirstRouteRef.current = false;
      prevVendorLocationRef.current = null;
      return;
    }

    if (!vendorLocation) {
      setRouteCoords([]);
      setRoadDistanceMeters(null);
      setEtaSeconds(null);
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
    roadDistanceMeters,
    roadDistanceFormatted,
    etaMinutes,
    etaFormatted,
    isLoading,
    error,
    refreshRoute,
  };
}

export default useRouteTracking;
