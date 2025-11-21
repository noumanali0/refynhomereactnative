// src/hooks/useSharedTimer.ts
/**
 * Shared Global Timer Service
 *
 * Problem: Having a global `nowMs` state that updates every second causes
 * ALL components to re-render, even those that don't need updates.
 *
 * Solution: Use a pub/sub pattern (EventEmitter) where components subscribe
 * to timer ticks individually. Only components that need updates will re-render.
 *
 * Performance: Single setInterval for entire app instead of per-component timers.
 * Auto-cleanup: Timer stops when no subscribers exist.
 */

import { useEffect, useState } from 'react';

type TimerCallback = (nowMs: number) => void;

class SharedTimerService {
    private listeners: Set<TimerCallback> = new Set();
    private intervalId: NodeJS.Timeout | null = null;
    private readonly TICK_INTERVAL_MS = 1000; // 1 second

    /**
     * Subscribe to timer ticks
     * @param callback - Function called every second with current timestamp
     * @returns Unsubscribe function
     */
    subscribe(callback: TimerCallback): () => void {
        this.listeners.add(callback);

        // Start timer if this is the first subscriber
        if (this.listeners.size === 1) {
            this.start();
        }

        // Return unsubscribe function
        return () => {
            this.listeners.delete(callback);

            // Stop timer if no more subscribers
            if (this.listeners.size === 0) {
                this.stop();
            }
        };
    }

    /**
     * Start the global timer
     */
    private start(): void {
        if (this.intervalId) return; // Already running

        this.intervalId = setInterval(() => {
            const nowMs = Date.now();
            // Notify all subscribers
            this.listeners.forEach(callback => callback(nowMs));
        }, this.TICK_INTERVAL_MS);

        console.log('✅ SharedTimer: Started');
    }

    /**
     * Stop the global timer
     */
    private stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🛑 SharedTimer: Stopped (no subscribers)');
        }
    }

    /**
     * Get current subscriber count (for debugging)
     */
    getSubscriberCount(): number {
        return this.listeners.size;
    }

    /**
     * Force cleanup (for testing/debugging only)
     */
    destroy(): void {
        this.listeners.clear();
        this.stop();
    }
}

// Singleton instance
const sharedTimerService = new SharedTimerService();

/**
 * Hook: Subscribe to shared global timer
 *
 * @returns Current timestamp in milliseconds, updates every second
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *     const nowMs = useSharedTimer();
 *     const timeLeft = Math.max(0, expiresAt - nowMs);
 *     return <Text>{timeLeft}s</Text>;
 * }
 * ```
 */
export function useSharedTimer(): number {
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        // Subscribe to timer ticks
        const unsubscribe = sharedTimerService.subscribe((timestamp) => {
            setNowMs(timestamp);
        });

        // Initial update
        setNowMs(Date.now());

        // Cleanup on unmount
        return unsubscribe;
    }, []);

    return nowMs;
}

// Export service for advanced use cases (e.g., manual subscription)
export { sharedTimerService };
