// src/hooks/useRequestTimer.ts
/**
 * Per-Request Timer Hook
 *
 * Provides timer data for individual requests (timeLeft, progress, etc.)
 * Uses the shared global timer to avoid cascade re-renders.
 *
 * This hook only causes re-renders when the timer values actually change,
 * not on every global tick.
 */

import { useMemo } from 'react';
import { useSharedTimer } from './useSharedTimer';

export interface RequestTimerData {
    /** Time remaining in milliseconds */
    timeLeft: number;
    /** Time remaining in seconds (rounded) */
    timeLeftSeconds: number;
    /** Progress from 0 to 1 (0 = expired, 1 = full time) */
    progress: number;
    /** Whether the request has expired */
    isExpired: boolean;
    /** Whether the request is urgent (<= 10 seconds remaining) */
    isUrgent: boolean;
    /** Whether the request is new (>= 90% time remaining) */
    isNew: boolean;
}

/**
 * Hook: Calculate timer data for a request
 *
 * @param expiresAt - Expiration timestamp in milliseconds
 * @param createdAt - Creation timestamp in milliseconds (optional, for progress calculation)
 * @returns Timer data object
 *
 * @example
 * ```tsx
 * function RequestCard({ request }) {
 *     const timer = useRequestTimer(request.expiresAt, request.createdAt);
 *
 *     if (timer.isExpired) return null;
 *
 *     return (
 *         <View>
 *             <ProgressBar progress={timer.progress} />
 *             <Text>{timer.timeLeftSeconds}s remaining</Text>
 *             {timer.isUrgent && <Text style={{color: 'red'}}>URGENT</Text>}
 *         </View>
 *     );
 * }
 * ```
 */
export function useRequestTimer(
    expiresAt: number,
    createdAt?: number
): RequestTimerData {
    const nowMs = useSharedTimer();

    // Calculate timer values - memoized to avoid unnecessary recalculations
    const timerData = useMemo(() => {
        const timeLeft = Math.max(0, expiresAt - nowMs);
        const timeLeftSeconds = Math.ceil(timeLeft / 1000);
        const isExpired = timeLeft <= 0;

        // Calculate progress (0 to 1)
        let progress = 0;
        if (createdAt && !isExpired) {
            const totalDuration = expiresAt - createdAt;
            const elapsed = nowMs - createdAt;
            progress = Math.max(0, Math.min(1, 1 - elapsed / totalDuration));
        } else if (!isExpired) {
            // Fallback: assume 20s default duration if createdAt not provided
            const DEFAULT_DURATION = 20000;
            progress = Math.max(0, Math.min(1, timeLeft / DEFAULT_DURATION));
        }

        const isUrgent = timeLeftSeconds <= 10 && !isExpired;
        const isNew = progress >= 0.9;

        return {
            timeLeft,
            timeLeftSeconds,
            progress,
            isExpired,
            isUrgent,
            isNew,
        };
    }, [expiresAt, createdAt, nowMs]);

    return timerData;
}

/**
 * Hook: Get formatted time remaining string
 *
 * @param expiresAt - Expiration timestamp in milliseconds
 * @returns Formatted time string (e.g., "1:30", "0:45", "EXPIRED")
 *
 * @example
 * ```tsx
 * function RequestCard({ request }) {
 *     const timeString = useFormattedRequestTimer(request.expiresAt);
 *     return <Text>{timeString}</Text>;
 * }
 * ```
 */
export function useFormattedRequestTimer(expiresAt: number): string {
    const { timeLeftSeconds, isExpired } = useRequestTimer(expiresAt);

    return useMemo(() => {
        if (isExpired) return 'EXPIRED';

        const minutes = Math.floor(timeLeftSeconds / 60);
        const seconds = timeLeftSeconds % 60;

        if (minutes > 0) {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        return `0:${seconds.toString().padStart(2, '0')}`;
    }, [timeLeftSeconds, isExpired]);
}

/**
 * Hook: Check if request is still valid
 *
 * Simple hook that only returns boolean, useful for filtering
 *
 * @param expiresAt - Expiration timestamp in milliseconds
 * @returns true if not expired, false otherwise
 *
 * @example
 * ```tsx
 * function RequestCard({ request }) {
 *     const isValid = useRequestValidity(request.expiresAt);
 *     if (!isValid) return null;
 *     return <View>...</View>;
 * }
 * ```
 */
export function useRequestValidity(expiresAt: number): boolean {
    const nowMs = useSharedTimer();
    return useMemo(() => nowMs < expiresAt, [nowMs, expiresAt]);
}
