// src/examples/WebSocketIntegrationExample.tsx
/**
 * EXAMPLE: WebSocket Integration for Service Requests
 *
 * This file demonstrates how to integrate the WebSocket dispatch system
 * into vendor and customer screens. Copy and adapt the relevant patterns
 * into your existing screens.
 *
 * ===== VENDOR INTEGRATION PATTERN =====
 */

import React, { useEffect, useCallback } from 'react';
import { View, FlatList, Alert, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';

// Import WebSocket dispatch actions and selectors
import {
  // Actions
  sendProposal,
  startRoute,
  arriveAtLocation,
  completeService,
  updateLocation,
  // Selectors
  selectConnectionStatus,
  selectIsConnected,
  selectServiceRequests,
  selectServiceRequestById,
  selectIsPending,
  selectError,
} from '@/store/slices/dispatchSlice';

// Import types
import type {
  SocketServiceRequest,
  SendProposalParams,
} from '@/types/socket';

// Import socket status indicator
import { SocketStatusIndicator } from '@/components/common/SocketStatusIndicator';

/**
 * ===== VENDOR: SERVICE REQUESTS LIST =====
 *
 * This shows how to display service requests received via WebSocket
 */
export function VendorServiceRequestsList() {
  const dispatch = useDispatch<AppDispatch>();

  // Get connection status
  const connectionStatus = useSelector(selectConnectionStatus);
  const isConnected = useSelector(selectIsConnected);

  // Get service requests from WebSocket dispatch slice
  const serviceRequests = useSelector(selectServiceRequests);

  // Render a single request item
  const renderRequestItem = useCallback(
    ({ item }: { item: SocketServiceRequest }) => (
      <View style={styles.requestCard}>
        {/* Request details from WebSocket payload */}
        {/* Use item.customer.name, item.problem_title, item.address_line, etc. */}
        {/* Fields match backend serializer exactly */}
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      {/* Show connection status */}
      <View style={styles.header}>
        <SocketStatusIndicator showLabel size="medium" />
      </View>

      {/* List of requests */}
      <FlatList
        data={serviceRequests}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.empty}>
            {/* Show appropriate empty state based on connection */}
          </View>
        }
      />
    </View>
  );
}

/**
 * ===== VENDOR: SEND PROPOSAL =====
 *
 * This shows how to send a proposal via WebSocket
 */
export function VendorSendProposal({ serviceRequestId }: { serviceRequestId: number }) {
  const dispatch = useDispatch<AppDispatch>();

  // Check if proposal is being sent (optimistic UI)
  const isPending = useSelector((state: RootState) =>
    selectIsPending(state, `proposal_${serviceRequestId}`)
  );

  // Check for errors
  const error = useSelector((state: RootState) => selectError(state, 'socket'));

  const handleSendProposal = async () => {
    const params: SendProposalParams = {
      serviceRequestId: serviceRequestId, // Required
      priceQuote: 500, // Optional: in PKR
      message: 'I can help with this!', // Optional
      etaMinutes: 30, // Optional: estimated time in minutes
    };

    try {
      // This sends via WebSocket and waits for acknowledgment
      await dispatch(sendProposal(params)).unwrap();

      // Success! Backend will update the service request status
      Alert.alert('Success', 'Proposal sent successfully!');
    } catch (err: any) {
      // Handle timeout or error
      Alert.alert('Error', err.message || 'Failed to send proposal');
    }
  };

  return (
    <View>
      {/* Proposal form UI */}
      {/* Button disabled while isPending is true */}
    </View>
  );
}

/**
 * ===== VENDOR: ROUTE STATUS =====
 *
 * This shows how to update route status via WebSocket
 */
export function VendorRouteActions({ serviceRequestId }: { serviceRequestId: number }) {
  const dispatch = useDispatch<AppDispatch>();

  // Start route to customer
  const handleStartRoute = async () => {
    try {
      await dispatch(startRoute(serviceRequestId)).unwrap();
      // Backend updates status to 'en_route'
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // Mark arrived at customer location
  const handleArrive = async () => {
    try {
      await dispatch(arriveAtLocation(serviceRequestId)).unwrap();
      // Backend updates status to 'in_progress'
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // Complete the service
  const handleComplete = async () => {
    try {
      await dispatch(completeService(serviceRequestId)).unwrap();
      // Backend updates status to 'completed'
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View>
      {/* Route action buttons */}
    </View>
  );
}

/**
 * ===== VENDOR: LOCATION UPDATES =====
 *
 * This shows how to send location updates while en_route
 */
export function VendorLocationUpdater({ serviceRequestId }: { serviceRequestId: number }) {
  const dispatch = useDispatch<AppDispatch>();

  // Get active job status
  const request = useSelector((state: RootState) =>
    selectServiceRequestById(state, serviceRequestId)
  );

  useEffect(() => {
    // Only update location when en_route
    if (request?.status !== 'en_route') return;

    const intervalId = setInterval(async () => {
      // Get current location
      // const location = await Location.getCurrentPositionAsync();

      // Send location update via WebSocket
      // dispatch(updateLocation({
      //   latitude: location.coords.latitude,
      //   longitude: location.coords.longitude,
      // }));
    }, 10000); // Every 10 seconds

    return () => clearInterval(intervalId);
  }, [request?.status, dispatch]);

  return null; // This is a background component
}

/**
 * ===== CUSTOMER: PROPOSALS LIST =====
 *
 * Import these selectors for customer screens:
 */
import {
  selectProposalsByRequestId,
  selectCustomerRequests,
  selectActiveProposal,
  selectVendorLocation,
  acceptProposal,
  declineProposal,
} from '@/store/slices/dispatchSlice';

/**
 * This shows how to display proposals received via WebSocket
 */
export function CustomerProposalsList({ requestId }: { requestId: number }) {
  const dispatch = useDispatch<AppDispatch>();

  // Get proposals for this request
  const proposals = useSelector((state: RootState) =>
    selectProposalsByRequestId(state, requestId)
  );

  // Handle accept proposal
  const handleAccept = async (proposalId: number) => {
    try {
      await dispatch(acceptProposal(proposalId)).unwrap();
      // Navigate to tracking screen or show success
    } catch (err: any) {
      // Handle error (e.g., proposal expired)
      Alert.alert('Error', err.message);
    }
  };

  // Handle decline proposal
  const handleDecline = async (proposalId: number) => {
    try {
      await dispatch(declineProposal(proposalId)).unwrap();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View>
      {/* List of proposals */}
      {proposals.map((proposal) => (
        <View key={proposal.id}>
          {/* Proposal card with accept/decline buttons */}
          {/* Use proposal.vendor.full_name, proposal.price_quote, etc. */}
          {/* Show countdown using proposal.remaining_expiry_time */}
        </View>
      ))}
    </View>
  );
}

/**
 * ===== CUSTOMER: VENDOR TRACKING =====
 *
 * This shows how to display vendor location while they're en_route
 */
export function CustomerVendorTracking() {
  // Get vendor's location from Redux (updated via WebSocket)
  const vendorLocation = useSelector(selectVendorLocation);

  // Get active accepted proposal
  const activeProposal = useSelector(selectActiveProposal);

  if (!vendorLocation || !activeProposal) {
    return null;
  }

  return (
    <View>
      {/* Map showing vendor location */}
      {/* vendorLocation.latitude, vendorLocation.longitude */}
    </View>
  );
}

/**
 * ===== KEY DATA STRUCTURES =====
 *
 * Service Request (vendor view):
 * {
 *   id: number
 *   customer: { id, phone, name }
 *   category: { id, name }
 *   problem_title: string
 *   description: string
 *   address_line: string
 *   location_source: 'live' | 'map' | 'manual'
 *   latitude: number
 *   longitude: number
 *   radius_km: number
 *   status: 'pending' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled' | 'expired'
 *   vendor_status: 'request' | 'pending' | 'accepted'
 *   proposal_id: number | null
 *   already_sent: boolean
 *   distance_km: number
 *   eta_minutes: number
 *   expires_at: string (ISO date)
 *   remaining_expiry_time: number (seconds)
 *   created_at: string
 * }
 *
 * Proposal:
 * {
 *   id: number
 *   service_request_id: number
 *   vendor: {
 *     id: number
 *     phone: string
 *     full_name: string
 *     verified: boolean
 *     average_rating: number
 *     total_reviews: number
 *     completed_jobs: number
 *     profile_photo_url: string | null
 *     service_radius_km: number
 *     distance_km: number
 *   }
 *   price_quote: number | null
 *   eta_minutes: number | null
 *   message: string
 *   status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired'
 *   acceptance_expires_at: string | null
 *   remaining_expiry_time: number
 *   created_at: string
 *   updated_at: string
 * }
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  requestCard: {
    padding: 16,
    margin: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
