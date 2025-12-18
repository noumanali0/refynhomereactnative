// src/services/googleDirectionsService.ts
/**
 * Google Routes API Service
 * Fetches route information between two coordinates
 * Uses the Routes API (New) instead of legacy Directions API
 *
 * Features:
 * - LRU cache with TTL to reduce API calls (~240+ calls/hour → ~10-20)
 * - Coordinate rounding for better cache hit rate
 * - Automatic cache cleanup
 */

import type { Coordinates } from '@/types/socket';

// Google Routes API key from environment variable
// Falls back to empty string - will cause API errors if not configured
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY || '';

// Routes API endpoint (New)
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const TIMEOUT = 15000;

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes - routes don't change frequently
const MAX_CACHE_SIZE = 50; // Max cached routes to prevent memory bloat
const COORD_PRECISION = 3; // Round to 3 decimals (~111m precision) for better hit rate

export interface RouteInfo {
    distance: number; // in meters
    duration: number; // in seconds
    coordinates: Coordinates[];
}

// Cache entry with timestamp for TTL and access tracking for LRU
interface CacheEntry {
    data: RouteInfo;
    timestamp: number;
    lastAccess: number;
}

// Route cache storage
const routeCache = new Map<string, CacheEntry>();

/**
 * Generate cache key from coordinates
 * Rounds to COORD_PRECISION decimals for better hit rate
 * ~111m precision at equator means nearby requests hit same cache
 */
function getCacheKey(origin: Coordinates, destination: Coordinates): string {
    const oLat = origin.latitude.toFixed(COORD_PRECISION);
    const oLng = origin.longitude.toFixed(COORD_PRECISION);
    const dLat = destination.latitude.toFixed(COORD_PRECISION);
    const dLng = destination.longitude.toFixed(COORD_PRECISION);
    return `${oLat},${oLng}_${dLat},${dLng}`;
}

/**
 * Clean expired entries and enforce size limit (LRU eviction)
 */
function cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    routeCache.forEach((entry, key) => {
        if (now - entry.timestamp > CACHE_TTL) {
            expiredKeys.push(key);
        }
    });

    // Remove expired
    expiredKeys.forEach(key => routeCache.delete(key));

    // If still over limit, remove least recently accessed
    if (routeCache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(routeCache.entries())
            .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

        const toRemove = entries.slice(0, routeCache.size - MAX_CACHE_SIZE);
        toRemove.forEach(([key]) => routeCache.delete(key));
    }
}

interface RoutesApiResponse {
    routes?: Array<{
        distanceMeters: number;
        duration: string; // e.g., "1234s"
        polyline: {
            encodedPolyline: string;
        };
    }>;
    error?: {
        code: number;
        message: string;
        status: string;
    };
}

/**
 * Decode Google's encoded polyline format
 * @param encoded - The encoded polyline string
 * @returns Array of coordinates
 */
function decodePolyline(encoded: string): Coordinates[] {
    const coordinates: Coordinates[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let shift = 0;
        let result = 0;
        let byte: number;

        // Decode latitude
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
        lat += deltaLat;

        // Decode longitude
        shift = 0;
        result = 0;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
        lng += deltaLng;

        coordinates.push({
            latitude: lat / 1e5,
            longitude: lng / 1e5,
        });
    }

    return coordinates;
}

/**
 * Parse duration string from Routes API (e.g., "1234s" -> 1234)
 */
function parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)s$/);
    return match ? parseInt(match[1], 10) : 0;
}

class GoogleDirectionsService {
    private apiKey: string;

    constructor() {
        this.apiKey = GOOGLE_MAPS_API_KEY;
    }

    /**
     * Clear all cached routes
     * Useful when starting a new service request
     */
    clearCache(): void {
        routeCache.clear();
        if (__DEV__) {
            console.log('[GoogleRoutes] Cache cleared');
        }
    }

    /**
     * Get cache statistics for debugging
     */
    getCacheStats(): { size: number; maxSize: number; ttlMinutes: number } {
        return {
            size: routeCache.size,
            maxSize: MAX_CACHE_SIZE,
            ttlMinutes: CACHE_TTL / 60000,
        };
    }

    /**
     * Get route between two points using Google Routes API
     * Uses LRU cache with TTL to minimize API calls
     * @param origin - Starting coordinates (vendor location)
     * @param destination - Ending coordinates (customer location)
     * @returns Route information including distance, duration, and path coordinates
     */
    async getRoute(origin: Coordinates, destination: Coordinates): Promise<RouteInfo | null> {
        try {
            // Check cache first
            const cacheKey = getCacheKey(origin, destination);
            const cached = routeCache.get(cacheKey);
            const now = Date.now();

            if (cached && (now - cached.timestamp) < CACHE_TTL) {
                // Update last access time for LRU
                cached.lastAccess = now;
                if (__DEV__) {
                    console.log('[GoogleRoutes] Cache HIT:', cacheKey.substring(0, 20) + '...');
                }
                return cached.data;
            }

            if (__DEV__) {
                console.log('[GoogleRoutes] Cache MISS, fetching route...');
            }

            const requestBody = {
                origin: {
                    location: {
                        latLng: {
                            latitude: origin.latitude,
                            longitude: origin.longitude,
                        },
                    },
                },
                destination: {
                    location: {
                        latLng: {
                            latitude: destination.latitude,
                            longitude: destination.longitude,
                        },
                    },
                },
                travelMode: 'DRIVE',
                routingPreference: 'TRAFFIC_AWARE',
                computeAlternativeRoutes: false,
                languageCode: 'en',
                units: 'METRIC',
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

            const response = await fetch(ROUTES_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': this.apiKey,
                    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                if (__DEV__) console.error('[GoogleRoutes] HTTP error:', response.status, errorText);
                return null;
            }

            const data: RoutesApiResponse = await response.json();

            if (data.error) {
                if (__DEV__) console.error('[GoogleRoutes] API error:', data.error.status, data.error.message);
                return null;
            }

            if (!data.routes || data.routes.length === 0) {
                if (__DEV__) console.warn('[GoogleRoutes] No routes found');
                return null;
            }

            const route = data.routes[0];

            // Decode the polyline for the route path
            const coordinates = decodePolyline(route.polyline.encodedPolyline);

            const routeInfo: RouteInfo = {
                distance: route.distanceMeters,
                duration: parseDuration(route.duration),
                coordinates,
            };

            // Store in cache
            routeCache.set(cacheKey, {
                data: routeInfo,
                timestamp: now,
                lastAccess: now,
            });

            // Periodic cleanup (non-blocking)
            if (routeCache.size > MAX_CACHE_SIZE * 0.8) {
                cleanupCache();
            }

            if (__DEV__) {
                console.log('[GoogleRoutes] Route fetched & cached:', {
                    distance: `${(route.distanceMeters / 1000).toFixed(1)} km`,
                    duration: `${Math.round(parseDuration(route.duration) / 60)} min`,
                    coordsCount: coordinates.length,
                    cacheSize: routeCache.size,
                });
            }

            return routeInfo;
        } catch (error) {
            if (__DEV__) {
                if (error instanceof Error && error.name === 'AbortError') {
                    console.error('[GoogleRoutes] Request timeout');
                } else {
                    console.error('[GoogleRoutes] Error fetching route:', error);
                }
            }
            return null;
        }
    }
}

export const googleDirectionsService = new GoogleDirectionsService();
