// src/services/socketService.ts
/**
 * WebSocket Service for Real-Time Dispatch
 *
 * Handles:
 * - Connection with JWT authentication
 * - Automatic reconnection with exponential backoff
 * - Heartbeat/ping to keep connection alive
 * - Message queue for offline messages
 * - Event subscription system
 * - Connection state management
 *
 * SECURITY NOTE:
 * Currently uses token in URL query param for authentication.
 * This is secure over WSS (TLS encrypted) but token appears in server logs.
 *
 * TODO: Implement message-based authentication when backend supports it:
 * 1. Connect without token in URL
 * 2. Send 'authenticate' action with token in message body
 * 3. Backend validates and sets user on WebSocket scope
 *
 * Backend needs to implement:
 * - Accept anonymous connection initially
 * - Handle 'authenticate' action to validate token
 * - Close connection if auth fails
 */

import {
  WS_BASE_URL,
  PING_INTERVAL,
  PONG_TIMEOUT,
  RECONNECT_MAX_ATTEMPTS,
  RECONNECT_INITIAL_DELAY,
  RECONNECT_MAX_DELAY,
  WS_CLOSE_CODES,
} from '@/config/socket';
import { getAccessToken, shouldRefreshToken } from '@/services/tokenService';
import type { ConnectionStatus, SocketAction } from '@/types/socket';

// Authentication mode - change to 'message' when backend supports it
type AuthMode = 'url' | 'message';
const AUTH_MODE: AuthMode = 'url'; // TODO: Switch to 'message' when backend ready

// Queued message structure
interface QueuedMessage {
  action: SocketAction;
  payload: unknown;
}

// Maximum queue size to prevent memory leaks on poor connections
const MAX_MESSAGE_QUEUE_SIZE = 50;

// Event callback type
type EventCallback<T = unknown> = (data: T) => void;
type StatusCallback = (status: ConnectionStatus) => void;

class SocketService {
  // WebSocket instance
  private ws: WebSocket | null = null;

  // Timers
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  // Reconnection tracking
  private reconnectAttempts = 0;
  private isManualDisconnect = false;

  // Message queue for offline messages
  private messageQueue: QueuedMessage[] = [];

  // Event listeners
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private statusListeners: Set<StatusCallback> = new Set();

  // Current connection status
  private status: ConnectionStatus = 'disconnected';

  // Last pong timestamp for connection health
  private lastPongTime: number = 0;

  // Pending token for message-based authentication
  private pendingAuthToken: string | null = null;

  /**
   * Connect to WebSocket server
   * Authenticates using JWT token from SecureStore
   */
  async connect(): Promise<void> {
    // Already connected or connecting
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (__DEV__) console.log('[Socket] Already connected');
      return;
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      if (__DEV__) console.log('[Socket] Connection in progress');
      return;
    }

    // Get access token
    const token = await getAccessToken();
    if (!token) {
      if (__DEV__) console.error('[Socket] No access token available');
      this.setStatus('error');
      throw new Error('No access token');
    }

    // Check if token needs refresh
    const needsRefresh = await shouldRefreshToken();
    if (needsRefresh) {
      if (__DEV__) console.warn('[Socket] Token needs refresh before connecting');
      this.setStatus('error');
      throw new Error('Token needs refresh');
    }

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.setStatus('connecting');
    this.isManualDisconnect = false;

    // Build WebSocket URL based on auth mode
    let wsUrl: string;
    if (AUTH_MODE === 'message') {
      // Message-based auth: Connect without token, authenticate after connection
      // More secure - token not exposed in server logs
      wsUrl = `${WS_BASE_URL}/ws/dispatch/`;
      this.pendingAuthToken = token;
    } else {
      // URL-based auth: Token in query param (current mode)
      // Note: Secure over WSS but token appears in server logs
      wsUrl = `${WS_BASE_URL}/ws/dispatch/?token=${token}`;
      this.pendingAuthToken = null;
    }

    if (__DEV__) console.log('[Socket] Connecting to:', WS_BASE_URL, `(auth: ${AUTH_MODE})`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      if (__DEV__) console.error('[Socket] Failed to create WebSocket:', error);
      this.setStatus('error');
      throw error;
    }
  }

  /**
   * Handle successful connection
   */
  private handleOpen(): void {
    if (__DEV__) console.log('[Socket] Connected successfully');
    this.reconnectAttempts = 0;
    this.lastPongTime = Date.now();

    // If using message-based auth, send authenticate action first
    if (AUTH_MODE === 'message' && this.pendingAuthToken) {
      if (__DEV__) console.log('[Socket] Sending authentication...');
      // Send auth immediately (bypass queue since we're authenticating)
      const authMessage = JSON.stringify({
        action: 'authenticate',
        payload: { token: this.pendingAuthToken },
      });
      this.ws?.send(authMessage);
      this.pendingAuthToken = null;
      // Note: Status will be set to 'connected' when we receive auth.success event
      // For now, set connected immediately (backend will close if auth fails)
    }

    this.setStatus('connected');

    // Start heartbeat
    this.startPing();

    // Flush any queued messages
    this.flushMessageQueue();
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      const eventType = data.event || data.type;

      // Handle pong
      if (eventType === 'pong') {
        this.lastPongTime = Date.now();
        return;
      }

      if (__DEV__) {
        console.log('[Socket] Received:', eventType, data);
      }

      // Notify listeners for this specific event
      const eventListeners = this.listeners.get(eventType);
      if (eventListeners) {
        eventListeners.forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            if (__DEV__) console.error(`[Socket] Error in listener for ${eventType}:`, error);
          }
        });
      }

      // Notify wildcard listeners
      const wildcardListeners = this.listeners.get('*');
      if (wildcardListeners) {
        wildcardListeners.forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            if (__DEV__) console.error('[Socket] Error in wildcard listener:', error);
          }
        });
      }
    } catch (error) {
      if (__DEV__) console.error('[Socket] Failed to parse message:', error);
    }
  }

  /**
   * Handle connection close
   */
  private handleClose(event: CloseEvent): void {
    if (__DEV__) console.log(`[Socket] Closed with code ${event.code}:`, event.reason);

    // Stop heartbeat
    this.stopPing();

    // Handle authentication failure
    if (event.code === WS_CLOSE_CODES.AUTH_FAILED) {
      if (__DEV__) console.error('[Socket] Authentication failed - need new token');
      this.setStatus('error');
      // Notify listeners about auth failure
      this.notifyListeners('auth.failed', { code: event.code, reason: event.reason });
      return;
    }

    // If manual disconnect, don't reconnect
    if (this.isManualDisconnect) {
      this.setStatus('disconnected');
      return;
    }

    this.setStatus('disconnected');

    // Schedule reconnection
    this.scheduleReconnect();
  }

  /**
   * Handle connection errors
   */
  private handleError(error: Event): void {
    if (__DEV__) console.error('[Socket] Connection error:', error);
    // Note: onclose will be called after onerror
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isManualDisconnect) {
      return;
    }

    if (this.reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
      if (__DEV__) console.error('[Socket] Max reconnection attempts reached');
      this.setStatus('error');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(
      RECONNECT_INITIAL_DELAY * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY
    );

    this.reconnectAttempts++;
    if (__DEV__) console.log(`[Socket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${RECONNECT_MAX_ATTEMPTS})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        if (__DEV__) console.error('[Socket] Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Send message to server
   * Queues message if not connected (with max queue size to prevent memory leaks)
   */
  send<T = unknown>(action: SocketAction, payload: T = {} as T): void {
    const message = JSON.stringify({ action, payload });

    if (this.ws?.readyState === WebSocket.OPEN) {
      if (__DEV__) {
        console.log('[Socket] Sending:', action, payload);
      }
      this.ws.send(message);
    } else {
      // Queue message for later (with size limit to prevent memory leaks)
      if (this.messageQueue.length >= MAX_MESSAGE_QUEUE_SIZE) {
        // Drop oldest message to make room
        const dropped = this.messageQueue.shift();
        if (__DEV__) {
          console.warn('[Socket] Queue full, dropping oldest message:', dropped?.action);
        }
      }
      if (__DEV__) console.log('[Socket] Queuing message:', action);
      this.messageQueue.push({ action, payload });
    }
  }

  /**
   * Subscribe to a specific event
   * Returns unsubscribe function
   */
  on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback as EventCallback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback);

      // Clean up empty sets
      if (this.listeners.get(event)?.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Subscribe to multiple events at once
   * Returns single unsubscribe function
   */
  onMany(subscriptions: Record<string, EventCallback>): () => void {
    const unsubscribers: Array<() => void> = [];

    for (const [event, callback] of Object.entries(subscriptions)) {
      unsubscribers.push(this.on(event, callback));
    }

    // Return single function that unsubscribes all
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  /**
   * Subscribe to connection status changes
   * Returns unsubscribe function
   */
  onStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);

    // Immediately notify with current status
    callback(this.status);

    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (__DEV__) console.log('[Socket] Disconnecting...');
    this.isManualDisconnect = true;

    // Stop heartbeat
    this.stopPing();

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close(WS_CLOSE_CODES.NORMAL, 'Client disconnect');
      this.ws = null;
    }

    this.setStatus('disconnected');

    // Clear message queue on intentional disconnect
    this.messageQueue = [];

    // Reset reconnection attempts
    this.reconnectAttempts = 0;
  }

  /**
   * Force reconnect (useful after token refresh)
   */
  async reconnect(): Promise<void> {
    if (__DEV__) console.log('[Socket] Force reconnecting...');
    this.isManualDisconnect = false;
    this.reconnectAttempts = 0;

    // Close existing connection
    if (this.ws) {
      this.ws.close(WS_CLOSE_CODES.NORMAL, 'Reconnecting');
      this.ws = null;
    }

    // Stop heartbeat
    this.stopPing();

    // Connect with new token
    await this.connect();
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection health info
   */
  getHealthInfo(): {
    status: ConnectionStatus;
    lastPong: number;
    queuedMessages: number;
    reconnectAttempts: number;
  } {
    return {
      status: this.status,
      lastPong: this.lastPongTime,
      queuedMessages: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Start heartbeat ping with pong timeout detection
   * If no pong received within PONG_TIMEOUT, connection is considered stale
   */
  private startPing(): void {
    this.stopPing(); // Clear existing interval

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Check if pong is overdue - connection may be stale
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (this.lastPongTime > 0 && timeSinceLastPong > PONG_TIMEOUT) {
          if (__DEV__) {
            console.warn(`[Socket] Pong timeout (${Math.round(timeSinceLastPong / 1000)}s) - connection stale, reconnecting...`);
          }
          // Close stale connection and trigger reconnect
          this.ws?.close(WS_CLOSE_CODES.GOING_AWAY, 'Pong timeout');
          return;
        }

        this.send('ping', { ts: Date.now() });
      }
    }, PING_INTERVAL);
  }

  /**
   * Stop heartbeat ping
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    if (__DEV__) console.log(`[Socket] Flushing ${this.messageQueue.length} queued messages`);

    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()!;
      this.send(msg.action, msg.payload);
    }
  }

  /**
   * Update and broadcast connection status
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;

    const previousStatus = this.status;
    this.status = status;

    if (__DEV__) console.log(`[Socket] Status: ${previousStatus} -> ${status}`);

    // Notify all status listeners
    this.statusListeners.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        if (__DEV__) console.error('[Socket] Error in status listener:', error);
      }
    });
  }

  /**
   * Notify event listeners
   */
  private notifyListeners(event: string, data: unknown): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          if (__DEV__) console.error(`[Socket] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all event listeners
   * Useful for cleanup
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Remove all listeners for a specific event
   */
  removeListeners(event: string): void {
    this.listeners.delete(event);
  }
}

// Export singleton instance
export const socketService = new SocketService();

// Also export class for testing
export { SocketService };
