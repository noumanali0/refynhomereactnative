// src/types/socket.ts
/**
 * WebSocket Types - Matching Django Channels Backend Exactly
 * DO NOT modify field names - they must match backend serializers
 */

// ============================================
// Connection Status
// ============================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ============================================
// Entity Types (from backend serializers)
// ============================================

export interface SocketCustomer {
  id: number;
  phone: string;
  name: string;
}

export interface SocketVendor {
  id: number;
  phone: string;
  full_name: string;
  verified: boolean;
  average_rating: number;
  total_reviews: number;
  completed_jobs: number;
  profile_photo_url: string | null;
  service_radius_km: number;
  distance_km: number;
}

export interface SocketCategory {
  id: number;
  name: string;
}

export interface SocketServiceRequest {
  id: number;
  customer: SocketCustomer;
  category: SocketCategory;
  problem_title: string;
  description: string;
  address_line: string;
  location_source: 'live' | 'map' | 'manual';
  latitude: number;
  longitude: number;
  radius_km: number;
  status: ServiceRequestStatus;
  vendor_status: VendorStatus;
  proposal_id: number | null;
  already_sent: boolean;
  distance_km: number;
  eta_minutes: number;
  expires_at: string;
  remaining_expiry_time: number;
  created_at: string;
}

export interface SocketProposal {
  id: number;
  service_request_id: number;
  vendor: SocketVendor;
  price_quote: number | null;
  eta_minutes: number | null;
  message: string;
  status: ProposalStatus;
  acceptance_expires_at: string | null;
  remaining_expiry_time: number;
  created_at: string;
  updated_at: string;
  event?: ProposalEventType; // Set on proposal.updated events
}

// Status Enums
export type ServiceRequestStatus =
  | 'pending'
  | 'accepted'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type VendorStatus = 'request' | 'pending' | 'accepted';

export type ProposalStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'withdrawn'
  | 'expired';

export type ProposalEventType =
  | 'proposal.created'
  | 'proposal.accepted'
  | 'proposal.declined'
  | 'proposal.withdrawn'
  | 'proposal.expired';

// ============================================
// Incoming Actions (Client → Server)
// ============================================

export interface PingPayload {
  ts: number;
}

export interface ProposalCreatePayload {
  service_request_id: number;
  price_quote?: number;
  message?: string;
  eta_minutes?: number;
}

export interface ProposalAcceptPayload {
  proposal_id: number;
}

export interface ProposalDeclinePayload {
  proposal_id: number;
}

export interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
}

export interface RouteActionPayload {
  service_request_id: number;
}

export interface ProposalCheckExpiryPayload {
  proposal_id: number;
}

export interface ServiceRequestCheckExpiryPayload {
  service_request_id: number;
}

// Action type union
export type SocketAction =
  | 'ping'
  | 'proposal.create'
  | 'proposal.accept'
  | 'proposal.decline'
  | 'location.update'
  | 'location.disable'
  | 'route.start'
  | 'route.arrive'
  | 'route.complete'
  | 'proposal.check_expiry'
  | 'service_request.check_expiry';

// ============================================
// Outgoing Events (Server → Client)
// ============================================

export interface ConnectionEstablishedEvent {
  event: 'connection.established';
  user_id: number;
  role: 'customer' | 'vendor';
  existing_count: number;
  data_type: string;
}

export interface ServiceRequestsSyncedEvent {
  event: 'service_requests.synced';
  requests: SocketServiceRequest[];
}

export interface ProposalsSyncedEvent {
  event: 'proposals.synced';
  requests: Array<SocketServiceRequest & { proposals: SocketProposal[] }>;
}

export interface PongEvent {
  event: 'pong';
  ts: number;
}

export interface ServiceRequestCreatedEvent {
  event: 'service_request.created';
  request: SocketServiceRequest;
}

export interface ServiceRequestUpdatedEvent {
  event: 'service_request.updated';
  request: SocketServiceRequest;
}

export interface ServiceRequestExpiredEvent {
  event: 'service_request.expired';
  request_id: number;
  expired_at: string;
  remaining_expiry_time: number;
}

export interface ProposalUpdatedEvent {
  event: 'proposal.updated';
  proposal: SocketProposal;
}

export interface ProposalAcceptTimeoutEvent {
  event: 'proposal.accept.timeout';
  proposal: SocketProposal;
}

export interface ProposalAckEvent {
  event: 'proposal.ack';
  service_request_id: number;
}

export interface ProposalAcceptedAckEvent {
  event: 'proposal.accepted.ack';
  proposal_id: number;
  message: string;
}

export interface ProposalDeclinedAckEvent {
  event: 'proposal.declined.ack';
  proposal_id: number;
}

export interface LocationUpdatedAckEvent {
  event: 'location.updated.ack';
  latitude: number;
  longitude: number;
}

export interface RouteStartAckEvent {
  event: 'route.start.ack';
  service_request_id: number;
}

export interface RouteArriveAckEvent {
  event: 'route.arrive.ack';
  service_request_id: number;
}

export interface RouteCompleteAckEvent {
  event: 'route.complete.ack';
  service_request_id: number;
}

export interface SocketErrorEvent {
  event: 'error';
  code: string;
  message: string;
}

export interface LocationUpdatedEvent {
  event: 'location.updated';
  vendor_id: number;
  latitude: number;
  longitude: number;
  heading?: number;
}

// Union of all socket events
export type SocketEvent =
  | ConnectionEstablishedEvent
  | ServiceRequestsSyncedEvent
  | ProposalsSyncedEvent
  | PongEvent
  | ServiceRequestCreatedEvent
  | ServiceRequestUpdatedEvent
  | ServiceRequestExpiredEvent
  | ProposalUpdatedEvent
  | ProposalAcceptTimeoutEvent
  | ProposalAckEvent
  | ProposalAcceptedAckEvent
  | ProposalDeclinedAckEvent
  | LocationUpdatedAckEvent
  | LocationUpdatedEvent
  | RouteStartAckEvent
  | RouteArriveAckEvent
  | RouteCompleteAckEvent
  | SocketErrorEvent;

// ============================================
// Message Structure
// ============================================

export interface SocketMessage<T = unknown> {
  action: SocketAction;
  payload: T;
}

export interface SocketEventMessage<T = unknown> {
  event: string;
  [key: string]: T | string;
}

// ============================================
// Helper Types for Redux
// ============================================

export interface NormalizedServiceRequests {
  byId: Record<number, SocketServiceRequest>;
  allIds: number[];
}

export interface NormalizedProposals {
  byId: Record<number, SocketProposal>;
  byRequestId: Record<number, number[]>;
}

// ============================================
// Thunk Parameter Types
// ============================================

export interface SendProposalParams {
  serviceRequestId: number;
  priceQuote?: number;
  message?: string;
  etaMinutes?: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}
