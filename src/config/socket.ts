// src/config/socket.ts
/**
 * WebSocket Configuration
 * Environment-based settings for socket connection
 */

// WebSocket base URL from environment or default to localhost
// Uses EXPO_PUBLIC_SOCKET_URL from .env file
export const WS_BASE_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'ws://192.168.100.8:8000';

// Ping interval in milliseconds (keep alive)
// Backend expects ping every ~30s, we use 25s for safety margin
export const PING_INTERVAL = 25000;

// Reconnection settings
export const RECONNECT_MAX_ATTEMPTS = 10;
export const RECONNECT_INITIAL_DELAY = 1000; // 1 second
export const RECONNECT_MAX_DELAY = 30000; // 30 seconds

// Acknowledgment timeout for actions (in milliseconds)
export const ACK_TIMEOUT = 10000; // 10 seconds

// WebSocket close codes
export const WS_CLOSE_CODES = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  AUTH_FAILED: 4401,
  INVALID_TOKEN: 4401,
} as const;

// Location update interval when vendor is en_route (in milliseconds)
export const LOCATION_UPDATE_INTERVAL = 10000; // 10 seconds

// Proposal acceptance window (from backend, for UI countdown)
export const PROPOSAL_ACCEPTANCE_WINDOW = 30; // seconds
