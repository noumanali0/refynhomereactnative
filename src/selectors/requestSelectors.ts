// src/selectors/requestSelectors.ts
/**
 * Memoized Redux Selectors for Service Requests
 *
 * Problem: Direct state access in components causes re-renders even when
 * the relevant data hasn't changed.
 *
 * Solution: Use Reselect library to create memoized selectors that only
 * recompute when inputs change.
 *
 * Performance: Prevents unnecessary re-renders and expensive computations.
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import type { LiveRequest, Coordinates } from '@/services/types';
import { getDistance } from '@/utils/distanceCache';

// ============================================================================
// Base Selectors (direct state access)
// ============================================================================

/**
 * Select all requests (normalized by ID)
 */
export const selectRequestsById = (state: RootState) =>
    state.requests.requestsById;

/**
 * Select request IDs array
 */
export const selectRequestIds = (state: RootState) =>
    state.requests.requestIds;

/**
 * Select vendor location
 */
export const selectVendorLocation = (state: RootState) =>
    state.requests.vendorLocation;

/**
 * Select vendor service categories
 */
export const selectVendorServiceCategories = (state: RootState) =>
    state.requests.vendorServiceCategories;

/**
 * Select maximum radius
 */
export const selectMaxRadiusKm = (state: RootState) =>
    state.requests.maxRadiusKm;

/**
 * Select distance cache
 */
export const selectDistanceCache = (state: RootState) =>
    state.requests.distanceCache;

/**
 * Select connection status
 */
export const selectConnectionStatus = (state: RootState) =>
    state.requests.connectionStatus;

/**
 * Select active request details
 */
export const selectActiveRequestDetails = (state: RootState) =>
    state.requests.activeRequestDetails;

// ============================================================================
// Memoized Selectors (computed/derived data)
// ============================================================================

/**
 * Select all requests as array (sorted by creation time, newest first)
 */
export const selectAllRequestsArray = createSelector(
    [selectRequestsById, selectRequestIds],
    (requestsById, requestIds) => {
        return requestIds
            .map(id => requestsById[id])
            .filter(Boolean) // Remove any undefined entries
            .sort((a, b) => b.createdAt - a.createdAt); // Newest first
    }
);

/**
 * Select filtered requests (by service category and distance)
 *
 * This is the main selector used by the ServiceRequestsScreen.
 * It applies all filters and returns only valid, in-range requests.
 */
export const selectFilteredRequests = createSelector(
    [
        selectAllRequestsArray,
        selectVendorLocation,
        selectVendorServiceCategories,
        selectMaxRadiusKm,
        selectDistanceCache,
    ],
    (requests, vendorLocation, serviceCategories, maxRadiusKm, distanceCache) => {
        if (!vendorLocation) {
            return []; // No location, can't filter by distance
        }

        return requests.filter(request => {
            // Service category filter
            if (serviceCategories.size > 0) {
                if (!serviceCategories.has(request.serviceType)) {
                    return false;
                }
            }

            // Distance filter
            const cachedDistance = distanceCache[request.id];
            if (cachedDistance !== undefined) {
                return cachedDistance <= maxRadiusKm;
            }

            // Calculate distance if not cached (shouldn't happen often)
            const distance = getDistance(vendorLocation, request.coordinates);
            return distance <= maxRadiusKm;
        });
    }
);

/**
 * Select distance for a specific request
 *
 * @param requestId - Request ID
 * @returns Memoized selector function
 */
export const makeSelectRequestDistance = () =>
    createSelector(
        [
            selectDistanceCache,
            selectVendorLocation,
            (_state: RootState, requestId: string) => requestId,
            selectRequestsById,
        ],
        (distanceCache, vendorLocation, requestId, requestsById) => {
            // Check cache first
            const cached = distanceCache[requestId];
            if (cached !== undefined) {
                return cached;
            }

            // Calculate if not cached
            const request = requestsById[requestId];
            if (!request || !vendorLocation) {
                return null;
            }

            return getDistance(vendorLocation, request.coordinates);
        }
    );

/**
 * Select urgent requests (expiring soon, <= 10 seconds)
 *
 * Note: This selector needs current time, so it should be called
 * with a time parameter or used sparingly.
 */
export const selectUrgentRequests = createSelector(
    [selectFilteredRequests, (_state: RootState, nowMs: number) => nowMs],
    (requests, nowMs) => {
        return requests.filter(request => {
            const timeLeft = request.expiresAt - nowMs;
            return timeLeft > 0 && timeLeft <= 10000; // Urgent: <= 10 seconds
        });
    }
);

/**
 * Select count of filtered requests
 */
export const selectFilteredRequestsCount = createSelector(
    [selectFilteredRequests],
    (requests) => requests.length
);

/**
 * Select request by ID
 */
export const makeSelectRequestById = () =>
    createSelector(
        [selectRequestsById, (_state: RootState, requestId: string) => requestId],
        (requestsById, requestId) => requestsById[requestId] || null
    );

/**
 * Select active request detail by ID
 */
export const makeSelectActiveRequestDetail = () =>
    createSelector(
        [
            selectActiveRequestDetails,
            (_state: RootState, requestId: string) => requestId,
        ],
        (activeDetails, requestId) => activeDetails[requestId] || null
    );

/**
 * Select if vendor has any service categories configured
 */
export const selectHasServiceCategories = createSelector(
    [selectVendorServiceCategories],
    (categories) => categories.size > 0
);

/**
 * Select average distance of all visible requests
 */
export const selectAverageDistance = createSelector(
    [selectFilteredRequests, selectDistanceCache],
    (requests, distanceCache) => {
        if (requests.length === 0) return 0;

        const totalDistance = requests.reduce((sum, request) => {
            const distance = distanceCache[request.id] || 0;
            return sum + distance;
        }, 0);

        return totalDistance / requests.length;
    }
);

/**
 * Select nearest request
 */
export const selectNearestRequest = createSelector(
    [selectFilteredRequests, selectDistanceCache],
    (requests, distanceCache) => {
        if (requests.length === 0) return null;

        return requests.reduce((nearest, request) => {
            const requestDist = distanceCache[request.id] || Infinity;
            const nearestDist = nearest ? (distanceCache[nearest.id] || Infinity) : Infinity;
            return requestDist < nearestDist ? request : nearest;
        }, null as LiveRequest | null);
    }
);

/**
 * Select requests grouped by service type
 */
export const selectRequestsByServiceType = createSelector(
    [selectFilteredRequests],
    (requests) => {
        const grouped: Record<string, LiveRequest[]> = {};

        requests.forEach(request => {
            if (!grouped[request.serviceType]) {
                grouped[request.serviceType] = [];
            }
            grouped[request.serviceType].push(request);
        });

        return grouped;
    }
);

/**
 * Select service type counts
 */
export const selectServiceTypeCounts = createSelector(
    [selectRequestsByServiceType],
    (grouped) => {
        const counts: Record<string, number> = {};
        Object.keys(grouped).forEach(serviceType => {
            counts[serviceType] = grouped[serviceType].length;
        });
        return counts;
    }
);
