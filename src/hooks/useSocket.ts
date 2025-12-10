// src/hooks/useSocket.ts
/**
 * React Hook for WebSocket Integration
 *
 * Features:
 * - Auto-connect when authenticated
 * - Auto-disconnect on unmount
 * - Connection status
 * - Send message helpers
 * - Event subscription helpers
 * - App state handling (foreground/background)
 */

import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import {
  connectSocket,
  disconnectSocket,
  selectConnectionStatus,
  selectIsConnected,
} from '@/store/slices/dispatchSlice';
import { socketService } from '@/services/socketService';
import type { ConnectionStatus, SocketAction } from '@/types/socket';

// ============================================================================
// Hook Options
// ============================================================================

interface UseSocketOptions {
  /**
   * Auto-connect when hook mounts (if authenticated)
   * Default: true
   */
  autoConnect?: boolean;

  /**
   * Auto-reconnect when app returns to foreground
   * Default: true
   */
  reconnectOnForeground?: boolean;

  /**
   * Disconnect when app goes to background
   * Default: false (keep connection alive in background)
   */
  disconnectOnBackground?: boolean;
}

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseSocketReturn {
  /**
   * Current connection status
   */
  status: ConnectionStatus;

  /**
   * Whether socket is currently connected
   */
  isConnected: boolean;

  /**
   * Connect to WebSocket server
   */
  connect: () => Promise<void>;

  /**
   * Disconnect from WebSocket server
   */
  disconnect: () => void;

  /**
   * Force reconnect (useful after token refresh)
   */
  reconnect: () => Promise<void>;

  /**
   * Send a message through WebSocket
   */
  send: <T = unknown>(action: SocketAction, payload?: T) => void;

  /**
   * Subscribe to a WebSocket event
   * Returns unsubscribe function
   */
  on: <T = unknown>(event: string, callback: (data: T) => void) => () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const {
    autoConnect = true,
    reconnectOnForeground = true,
    disconnectOnBackground = false,
  } = options;

  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectConnectionStatus);
  const isConnected = useSelector(selectIsConnected);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  // Track if we've attempted initial connection
  const hasConnectedRef = useRef(false);

  // Track previous app state for background/foreground transitions
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('[useSocket] Cannot connect: not authenticated');
      return;
    }

    try {
      await dispatch(connectSocket()).unwrap();
    } catch (error) {
      console.error('[useSocket] Connection error:', error);
    }
  }, [dispatch, isAuthenticated]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    dispatch(disconnectSocket());
  }, [dispatch]);

  /**
   * Force reconnect
   */
  const reconnect = useCallback(async () => {
    disconnect();
    // Small delay to ensure clean disconnect
    await new Promise((resolve) => setTimeout(resolve, 100));
    await connect();
  }, [connect, disconnect]);

  /**
   * Send message through WebSocket
   */
  const send = useCallback(<T = unknown>(action: SocketAction, payload?: T) => {
    socketService.send(action, payload);
  }, []);

  /**
   * Subscribe to WebSocket events
   */
  const on = useCallback(<T = unknown>(event: string, callback: (data: T) => void) => {
    return socketService.on<T>(event, callback);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && isAuthenticated && !hasConnectedRef.current) {
      hasConnectedRef.current = true;
      connect();
    }
  }, [autoConnect, isAuthenticated, connect]);

  // Auto-disconnect on unmount
  useEffect(() => {
    return () => {
      // Only disconnect if we connected
      if (hasConnectedRef.current) {
        disconnect();
        hasConnectedRef.current = false;
      }
    };
  }, [disconnect]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      // App came to foreground
      if (
        reconnectOnForeground &&
        prevState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[useSocket] App returned to foreground - reconnecting');
        if (isAuthenticated && !isConnected) {
          connect();
        }
      }

      // App went to background
      if (
        disconnectOnBackground &&
        prevState === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        console.log('[useSocket] App went to background - disconnecting');
        disconnect();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [
    isAuthenticated,
    isConnected,
    connect,
    disconnect,
    reconnectOnForeground,
    disconnectOnBackground,
  ]);

  // Reconnect when authentication state changes (e.g., after token refresh)
  useEffect(() => {
    if (!isAuthenticated) {
      // User logged out
      if (hasConnectedRef.current) {
        disconnect();
        hasConnectedRef.current = false;
      }
    }
  }, [isAuthenticated, disconnect]);

  return {
    status,
    isConnected,
    connect,
    disconnect,
    reconnect,
    send,
    on,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for vendor-specific WebSocket features
 */
export function useVendorSocket() {
  const socket = useSocket();

  // Get vendor-specific state
  const serviceRequests = useSelector((state: RootState) =>
    state.dispatch.serviceRequestIds.map((id) => state.dispatch.serviceRequestsById[id])
  );

  const activeJob = useSelector((state: RootState) => {
    if (!state.dispatch.activeJobId) return null;
    return state.dispatch.serviceRequestsById[state.dispatch.activeJobId];
  });

  // Get all pending actions so components can check specific requests
  const pendingActions = useSelector((state: RootState) => state.dispatch.pendingActions);

  return {
    ...socket,
    serviceRequests,
    activeJob,
    pendingActions,
  };
}

/**
 * Hook for customer-specific WebSocket features
 */
export function useCustomerSocket() {
  const socket = useSocket();

  // Get customer-specific state
  const customerRequests = useSelector((state: RootState) =>
    state.dispatch.customerRequestIds.map((id) => state.dispatch.customerRequestsById[id])
  );

  // Get proposals indexed by request ID so components can access them
  const proposalIdsByRequest = useSelector((state: RootState) => state.dispatch.proposalIdsByRequest);
  const proposalsById = useSelector((state: RootState) => state.dispatch.proposalsById);

  const activeProposal = useSelector((state: RootState) => {
    if (!state.dispatch.activeProposalId) return null;
    return state.dispatch.proposalsById[state.dispatch.activeProposalId];
  });

  const vendorLocation = useSelector((state: RootState) => state.dispatch.vendorLocation);

  return {
    ...socket,
    customerRequests,
    proposalIdsByRequest,
    proposalsById,
    activeProposal,
    vendorLocation,
  };
}

// ============================================================================
// Connection Status Hook
// ============================================================================

/**
 * Simple hook to get just the connection status
 */
export function useSocketStatus() {
  const status = useSelector(selectConnectionStatus);
  const isConnected = useSelector(selectIsConnected);

  return { status, isConnected };
}

// Default export
export default useSocket;
