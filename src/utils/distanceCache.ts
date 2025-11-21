// src/utils/distanceCache.ts
/**
 * Distance Caching Utility
 *
 * Problem: Haversine distance calculation runs 3x per request per render.
 * With 50 requests and 60 FPS, this can be 9000+ calculations per second.
 *
 * Solution: Cache distance calculations using a Map keyed by coordinate pairs.
 * Since vendor location and request locations rarely change, we can cache aggressively.
 *
 * Performance: O(1) lookups, ~0.001ms vs ~0.01ms for Haversine calculation.
 */

import { Coordinates } from '@/services/types';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param from - Starting coordinates
 * @param to - Ending coordinates
 * @returns Distance in kilometers
 */
function calculateHaversineDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers

    const dLat = toRadians(to.latitude - from.latitude);
    const dLon = toRadians(to.longitude - from.longitude);

    const lat1 = toRadians(from.latitude);
    const lat2 = toRadians(to.latitude);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Create a cache key from two coordinate pairs
 * Rounds to 4 decimal places (~11m precision) to improve cache hits
 */
function createCacheKey(from: Coordinates, to: Coordinates): string {
    const fromLat = from.latitude.toFixed(4);
    const fromLng = from.longitude.toFixed(4);
    const toLat = to.latitude.toFixed(4);
    const toLng = to.longitude.toFixed(4);

    // Use deterministic key (smaller coords first) for bidirectional lookup
    if (fromLat < toLat || (fromLat === toLat && fromLng < toLng)) {
        return `${fromLat},${fromLng}|${toLat},${toLng}`;
    }
    return `${toLat},${toLng}|${fromLat},${fromLng}`;
}

/**
 * Distance Cache Service
 *
 * Caches distance calculations between coordinate pairs.
 * Automatically manages cache size to prevent memory bloat.
 */
class DistanceCacheService {
    private cache: Map<string, number> = new Map();
    private readonly MAX_CACHE_SIZE = 1000; // Prevent unbounded growth

    /**
     * Get distance between two coordinates (with caching)
     *
     * @param from - Starting coordinates
     * @param to - Ending coordinates
     * @returns Distance in kilometers
     */
    getDistance(from: Coordinates, to: Coordinates): number {
        const key = createCacheKey(from, to);

        // Check cache first
        const cached = this.cache.get(key);
        if (cached !== undefined) {
            return cached;
        }

        // Calculate and cache
        const distance = calculateHaversineDistance(from, to);
        this.setDistance(key, distance);

        return distance;
    }

    /**
     * Set distance in cache
     */
    private setDistance(key: string, distance: number): void {
        // Evict oldest entry if cache is full (simple FIFO eviction)
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, distance);
    }

    /**
     * Clear all cached distances
     * Call this when vendor location changes significantly
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Clear distances for a specific coordinate
     * Useful when a request location is updated
     */
    clearForCoordinate(coords: Coordinates): void {
        const coordStr = `${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`;
        const keysToDelete: string[] = [];

        this.cache.forEach((_, key) => {
            if (key.includes(coordStr)) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Get cache statistics (for debugging)
     */
    getStats(): { size: number; maxSize: number; hitRate: number } {
        return {
            size: this.cache.size,
            maxSize: this.MAX_CACHE_SIZE,
            hitRate: 0, // Could track hits/misses if needed
        };
    }
}

// Singleton instance
const distanceCacheService = new DistanceCacheService();

/**
 * Get distance between two coordinates (cached)
 *
 * @param from - Starting coordinates
 * @param to - Ending coordinates
 * @returns Distance in kilometers
 *
 * @example
 * ```typescript
 * const vendorLocation = { latitude: 24.8607, longitude: 67.0011 };
 * const requestLocation = { latitude: 24.8700, longitude: 67.0100 };
 * const distance = getDistance(vendorLocation, requestLocation);
 * console.log(`Distance: ${distance.toFixed(2)} km`);
 * ```
 */
export function getDistance(from: Coordinates, to: Coordinates): number {
    return distanceCacheService.getDistance(from, to);
}

/**
 * Clear distance cache
 * Call when vendor location changes significantly (e.g., > 100m)
 *
 * @example
 * ```typescript
 * // When vendor moves significantly
 * clearDistanceCache();
 * ```
 */
export function clearDistanceCache(): void {
    distanceCacheService.clear();
}

/**
 * Format distance for display
 *
 * @param distanceKm - Distance in kilometers
 * @returns Formatted string (e.g., "1.5 km", "250 m")
 */
export function formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
        const meters = Math.round(distanceKm * 1000);
        return `${meters} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
}

/**
 * Calculate ETA based on distance
 * Assumes average speed in urban areas
 *
 * @param distanceKm - Distance in kilometers
 * @returns ETA in minutes
 */
export function calculateETA(distanceKm: number): number {
    const AVERAGE_SPEED_KMH = 30; // Urban traffic speed
    const hours = distanceKm / AVERAGE_SPEED_KMH;
    return Math.ceil(hours * 60);
}

// Export service for advanced use cases
export { distanceCacheService };
