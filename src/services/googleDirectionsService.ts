// src/services/googleDirectionsService.ts
/**
 * Google Routes API Service
 * Fetches route information between two coordinates
 * Uses the Routes API (New) instead of legacy Directions API
 */

import type { Coordinates } from '@/types/socket';

// Use the same API key that's in AndroidManifest.xml for Google Maps
const GOOGLE_MAPS_API_KEY = 'AIzaSyDKE8TyUf0gDUZFK0S-Cc1HgYms-VAdoAE';

// Routes API endpoint (New)
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const TIMEOUT = 15000;

export interface RouteInfo {
    distance: number; // in meters
    duration: number; // in seconds
    coordinates: Coordinates[];
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
     * Get route between two points using Google Routes API
     * @param origin - Starting coordinates (vendor location)
     * @param destination - Ending coordinates (customer location)
     * @returns Route information including distance, duration, and path coordinates
     */
    async getRoute(origin: Coordinates, destination: Coordinates): Promise<RouteInfo | null> {
        try {
            if (__DEV__) {
                console.log('[GoogleRoutes] Fetching route...');
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
                console.error('[GoogleRoutes] HTTP error:', response.status, errorText);
                return null;
            }

            const data: RoutesApiResponse = await response.json();

            if (data.error) {
                console.error('[GoogleRoutes] API error:', data.error.status, data.error.message);
                return null;
            }

            if (!data.routes || data.routes.length === 0) {
                console.warn('[GoogleRoutes] No routes found');
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

            if (__DEV__) {
                console.log('[GoogleRoutes] Route fetched:', {
                    distance: `${(route.distanceMeters / 1000).toFixed(1)} km`,
                    duration: `${Math.round(parseDuration(route.duration) / 60)} min`,
                    coordsCount: coordinates.length,
                });
            }

            return routeInfo;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.error('[GoogleRoutes] Request timeout');
            } else {
                console.error('[GoogleRoutes] Error fetching route:', error);
            }
            return null;
        }
    }
}

export const googleDirectionsService = new GoogleDirectionsService();
