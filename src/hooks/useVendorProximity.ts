// src/hooks/useVendorProximity.ts
/**
 * Vendor Proximity Detection Hook
 *
 * Monitors vendor location and triggers notifications/callbacks
 * when vendor arrives within 100m of the service location.
 *
 * Features:
 * - Uses cached Haversine distance calculation
 * - Sends push notification on arrival
 * - Debounces to prevent duplicate notifications
 * - Resets when request changes
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { getDistance } from '@/utils/distanceCache';
import {
    sendVendorArrivalNotification,
    hasArrivalNotificationBeenSent,
} from '@/utils/notifications';
import type { Coordinates } from '@/types/socket';

// 100 meters = 0.1 km
const ARRIVAL_THRESHOLD_KM = 0.1;

interface UseVendorProximityOptions {
    /** Current vendor location from WebSocket */
    vendorLocation: Coordinates | null;
    /** Customer's service location */
    serviceLocation: Coordinates | null;
    /** Current service request ID */
    requestId: number | null;
    /** Vendor's display name for notification */
    vendorName: string;
    /** Enable/disable proximity detection */
    enabled?: boolean;
    /** Callback when vendor arrives within threshold */
    onArrival?: () => void;
}

interface UseVendorProximityReturn {
    /** Current distance in km (null if locations not available) */
    currentDistance: number | null;
    /** Whether vendor has arrived (within 100m) */
    hasArrived: boolean;
    /** Formatted distance string */
    formattedDistance: string | null;
}

export function useVendorProximity({
    vendorLocation,
    serviceLocation,
    requestId,
    vendorName,
    enabled = true,
    onArrival,
}: UseVendorProximityOptions): UseVendorProximityReturn {
    const [hasArrived, setHasArrived] = useState(false);
    const [currentDistance, setCurrentDistance] = useState<number | null>(null);
    const onArrivalRef = useRef(onArrival);
    const hasArrivedRef = useRef(false); // Use ref to avoid dependency loop

    // Keep callback ref updated
    useEffect(() => {
        onArrivalRef.current = onArrival;
    }, [onArrival]);

    // Reset state when request changes
    useEffect(() => {
        setHasArrived(false);
        setCurrentDistance(null);
        hasArrivedRef.current = false;
    }, [requestId]);

    // Check proximity and trigger arrival
    useEffect(() => {
        if (!enabled || !vendorLocation || !serviceLocation || !requestId) {
            return;
        }

        const distance = getDistance(vendorLocation, serviceLocation);
        setCurrentDistance(distance);

        // Check if within threshold and hasn't already triggered (use ref to avoid re-runs)
        if (distance <= ARRIVAL_THRESHOLD_KM && !hasArrivedRef.current) {
            // Double-check notification hasn't been sent (in case of re-mount)
            if (!hasArrivalNotificationBeenSent(requestId)) {
                if (__DEV__) {
                    console.log(`[useVendorProximity] Vendor arrived! Distance: ${(distance * 1000).toFixed(0)}m`);
                }

                // Send notification
                sendVendorArrivalNotification({
                    requestId,
                    vendorName,
                });

                // Update ref first to prevent duplicate triggers
                hasArrivedRef.current = true;
                setHasArrived(true);

                // Call callback
                onArrivalRef.current?.();
            } else {
                // Notification was already sent (e.g., component remounted)
                hasArrivedRef.current = true;
                setHasArrived(true);
            }
        }
    }, [vendorLocation, serviceLocation, requestId, vendorName, enabled]); // Removed hasArrived from deps

    // Format distance for display
    const formattedDistance = currentDistance !== null
        ? currentDistance < 1
            ? `${Math.round(currentDistance * 1000)} m`
            : `${currentDistance.toFixed(1)} km`
        : null;

    return {
        currentDistance,
        hasArrived,
        formattedDistance,
    };
}

export default useVendorProximity;
