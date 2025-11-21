// src/services/requestApiService.ts
/**
 * Request API Service Interface
 *
 * Abstract interface for receiving live service requests.
 * Allows seamless switching between mock data and real WebSocket backend.
 *
 * Architecture:
 * - Mock implementation: Generates random requests for development
 * - WebSocket implementation: Connects to real backend (future)
 *
 * Usage:
 * ```typescript
 * const api = __DEV__ ? mockRequestApi : webSocketRequestApi;
 * api.connect();
 * api.subscribe((request) => {
 *     dispatch(addRequest(request));
 * });
 * ```
 */

import type { LiveRequest } from './types';

/**
 * Callback type for new request events
 */
export type RequestCallback = (request: LiveRequest) => void;

/**
 * Connection status
 */
export enum ConnectionStatus {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    ERROR = 'error',
}

/**
 * Connection state change callback
 */
export type StatusCallback = (status: ConnectionStatus) => void;

/**
 * Request API Service Interface
 *
 * All request service implementations must follow this interface.
 */
export interface IRequestApiService {
    /**
     * Connect to the request service
     * @returns Promise that resolves when connected
     */
    connect(): Promise<void>;

    /**
     * Disconnect from the request service
     */
    disconnect(): void;

    /**
     * Subscribe to new request events
     * @param callback - Function called when a new request arrives
     * @returns Unsubscribe function
     */
    subscribe(callback: RequestCallback): () => void;

    /**
     * Subscribe to connection status changes
     * @param callback - Function called when connection status changes
     * @returns Unsubscribe function
     */
    onStatusChange(callback: StatusCallback): () => void;

    /**
     * Get current connection status
     */
    getStatus(): ConnectionStatus;

    /**
     * Check if currently connected
     */
    isConnected(): boolean;
}

/**
 * Configuration options for request services
 */
export interface RequestServiceConfig {
    /**
     * Vendor service categories (for filtering)
     * e.g., ['plumber', 'electrician']
     */
    serviceCategories?: string[];

    /**
     * Vendor location (for distance filtering)
     */
    location?: {
        latitude: number;
        longitude: number;
    };

    /**
     * Maximum radius in kilometers (default: 20)
     */
    maxRadiusKm?: number;

    /**
     * Auto-reconnect on disconnect (default: true)
     */
    autoReconnect?: boolean;

    /**
     * Reconnection delay in milliseconds (default: 3000)
     */
    reconnectDelayMs?: number;
}

/**
 * Base class with common functionality
 *
 * Implementations can extend this to avoid duplicating listener management
 */
export abstract class BaseRequestApiService implements IRequestApiService {
    protected requestListeners: Set<RequestCallback> = new Set();
    protected statusListeners: Set<StatusCallback> = new Set();
    protected status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
    protected config: RequestServiceConfig;

    constructor(config: RequestServiceConfig = {}) {
        this.config = {
            maxRadiusKm: 20,
            autoReconnect: true,
            reconnectDelayMs: 3000,
            ...config,
        };
    }

    abstract connect(): Promise<void>;
    abstract disconnect(): void;

    subscribe(callback: RequestCallback): () => void {
        this.requestListeners.add(callback);
        return () => {
            this.requestListeners.delete(callback);
        };
    }

    onStatusChange(callback: StatusCallback): () => void {
        this.statusListeners.add(callback);
        // Immediately call with current status
        callback(this.status);
        return () => {
            this.statusListeners.delete(callback);
        };
    }

    getStatus(): ConnectionStatus {
        return this.status;
    }

    isConnected(): boolean {
        return this.status === ConnectionStatus.CONNECTED;
    }

    /**
     * Notify all request listeners
     */
    protected notifyRequestListeners(request: LiveRequest): void {
        this.requestListeners.forEach(callback => {
            try {
                callback(request);
            } catch (error) {
                console.error('Error in request callback:', error);
            }
        });
    }

    /**
     * Update connection status and notify listeners
     */
    protected setStatus(newStatus: ConnectionStatus): void {
        if (this.status !== newStatus) {
            this.status = newStatus;
            this.statusListeners.forEach(callback => {
                try {
                    callback(newStatus);
                } catch (error) {
                    console.error('Error in status callback:', error);
                }
            });
        }
    }

    /**
     * Update configuration (e.g., when vendor location changes)
     */
    updateConfig(config: Partial<RequestServiceConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): RequestServiceConfig {
        return { ...this.config };
    }
}
