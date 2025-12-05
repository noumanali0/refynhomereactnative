/**
 * LiveOffersComponents.tsx
 *
 * Extracted, memoized components from LiveOffersScreen for better performance.
 * Each component only re-renders when its specific props change.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';

import Text from '@/components/common/Text';
import { COLORS } from '@/constants/colors';
import type { SocketProposal } from '@/types/socket';

// ============================================================================
// Waiting State Component
// ============================================================================

interface WaitingStateProps {
  requestTimeLeft: number;
  pulseAnim: Animated.Value;
  isConnected: boolean;
}

export const WaitingState = React.memo(({
  requestTimeLeft,
  pulseAnim,
  isConnected,
}: WaitingStateProps) => {
  return (
    <View style={styles.emptyState}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyGradient}
        >
          <ActivityIndicator size="large" color={COLORS.white} />
        </LinearGradient>
      </Animated.View>
      <Text type="body" style={styles.emptyTitle}>
        Finding nearby vendors...
      </Text>
      <View style={styles.timerContainer}>
        <Ionicons name="time" size={18} color={COLORS.gray500} />
        <Text style={styles.timerTextLarge}>
          {Math.floor(requestTimeLeft / 60)}:{(requestTimeLeft % 60).toString().padStart(2, '0')}
        </Text>
      </View>
      <Text style={styles.emptyText}>
        Nearby vendors are reviewing your request.
      </Text>
      {!isConnected && (
        <View style={styles.connectionWarning}>
          <Ionicons name="warning" size={16} color={COLORS.warning} />
          <Text style={styles.connectionWarningText}>
            Connecting to server...
          </Text>
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.requestTimeLeft === nextProps.requestTimeLeft &&
    prevProps.isConnected === nextProps.isConnected
  );
});

WaitingState.displayName = 'WaitingState';

// ============================================================================
// Expired State Component
// ============================================================================

interface ExpiredStateProps {
  onRetry: () => void;
  isRetrying: boolean;
}

export const ExpiredState = React.memo(({
  onRetry,
  isRetrying,
}: ExpiredStateProps) => {
  return (
    <View style={styles.emptyState}>
      <View style={styles.expiredIconContainer}>
        <Ionicons name="time-outline" size={64} color={COLORS.warning} />
      </View>
      <Text type="body" style={styles.emptyTitle}>
        Request Expired
      </Text>
      <Text style={styles.emptyText}>
        No vendors responded in time. Would you like to try again?
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
        disabled={isRetrying}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.retryGradient}
        >
          {isRetrying ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <>
              <Ionicons name="refresh" size={20} color={COLORS.white} />
              <Text style={styles.retryText}>Retry Request</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.isRetrying === nextProps.isRetrying;
});

ExpiredState.displayName = 'ExpiredState';

// ============================================================================
// Accepted Proposal View Component
// ============================================================================

interface AcceptedProposalViewProps {
  acceptedProposal: SocketProposal;
  vendorHasArrived: boolean;
  formattedDistance: string | null;
  ProposalCardComponent: React.ComponentType<{
    proposal: SocketProposal;
    onAccept: (id: number) => void;
    onDecline: (id: number) => void;
    isAccepting: boolean;
    isDeclining: boolean;
  }>;
}

export const AcceptedProposalView = React.memo(({
  acceptedProposal,
  vendorHasArrived,
  formattedDistance,
  ProposalCardComponent,
}: AcceptedProposalViewProps) => {
  const handleCallVendor = () => {
    if (acceptedProposal.vendor?.phone) {
      Linking.openURL(`tel:${acceptedProposal.vendor.phone}`);
    }
  };

  const noop = () => {};

  return (
    <View style={styles.acceptedContainer}>
      <ProposalCardComponent
        proposal={acceptedProposal}
        onAccept={noop}
        onDecline={noop}
        isAccepting={false}
        isDeclining={false}
      />

      {/* Vendor Contact Info */}
      {acceptedProposal.vendor?.phone && (
        <TouchableOpacity
          style={styles.contactCard}
          onPress={handleCallVendor}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={20} color={COLORS.success} />
          <Text style={styles.contactText}>
            Call Vendor: {acceptedProposal.vendor.phone}
          </Text>
        </TouchableOpacity>
      )}

      {/* Vendor Arrival Badge (100m proximity) */}
      {vendorHasArrived && (
        <View style={styles.arrivalBadge}>
          <Ionicons name="location" size={16} color={COLORS.white} />
          <Text style={styles.arrivalText}>Vendor Arrived!</Text>
        </View>
      )}

      <View style={styles.trackingInfo}>
        <LinearGradient
          colors={[COLORS.primary + '10', COLORS.accent + '10']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.trackingCard}
        >
          <View style={styles.trackingRow}>
            <View style={styles.trackingItem}>
              <Ionicons name="navigate" size={20} color={COLORS.primary} />
              <Text style={styles.trackingLabel}>Distance</Text>
              <Text type="subtitle" style={styles.trackingValue}>
                {formattedDistance || `${acceptedProposal.vendor?.distance_km?.toFixed(1) || '0.0'} km`}
              </Text>
            </View>
            <View style={styles.trackingDivider} />
            <View style={styles.trackingItem}>
              <Ionicons name="time" size={20} color={COLORS.accent} />
              <Text style={styles.trackingLabel}>ETA</Text>
              <Text type="subtitle" style={styles.trackingValue}>
                {acceptedProposal.eta_minutes || '~'} min
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.acceptedProposal.id === nextProps.acceptedProposal.id &&
    prevProps.acceptedProposal.status === nextProps.acceptedProposal.status &&
    prevProps.vendorHasArrived === nextProps.vendorHasArrived &&
    prevProps.formattedDistance === nextProps.formattedDistance
  );
});

AcceptedProposalView.displayName = 'AcceptedProposalView';

// ============================================================================
// Bottom Sheet Title Component
// ============================================================================

interface BottomSheetTitleProps {
  acceptedProposal: SocketProposal | undefined;
  activeProposalsCount: number;
}

export const BottomSheetTitle = React.memo(({
  acceptedProposal,
  activeProposalsCount,
}: BottomSheetTitleProps) => {
  const title = acceptedProposal
    ? 'Vendor on the way'
    : activeProposalsCount === 0
      ? 'Waiting for proposals...'
      : `${activeProposalsCount} Proposal${activeProposalsCount > 1 ? 's' : ''} Received`;

  return (
    <View style={styles.sheetTitleContainer}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.sheetTitleGradient}
      >
        <Text type="subtitle" style={styles.sheetTitle}>
          {title}
        </Text>
      </LinearGradient>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    (!!prevProps.acceptedProposal) === (!!nextProps.acceptedProposal) &&
    prevProps.activeProposalsCount === nextProps.activeProposalsCount
  );
});

BottomSheetTitle.displayName = 'BottomSheetTitle';

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: verticalScale(32),
  },
  emptyGradient: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: verticalScale(8),
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: COLORS.gray500,
    textAlign: 'center',
    paddingHorizontal: scale(32),
    lineHeight: moderateScale(20),
  },
  connectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(16),
    padding: scale(12),
    backgroundColor: COLORS.warning + '15',
    borderRadius: moderateScale(8),
    gap: scale(8),
  },
  connectionWarningText: {
    fontSize: moderateScale(13),
    color: COLORS.warning,
    fontWeight: '500',
  },

  // Timer container
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    marginVertical: verticalScale(12),
    gap: scale(6),
  },
  timerTextLarge: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: COLORS.gray700,
  },

  // Expired state
  expiredIconContainer: {
    marginBottom: verticalScale(16),
  },

  // Retry button
  retryButton: {
    marginTop: verticalScale(20),
    borderRadius: moderateScale(12),
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(24),
    gap: scale(8),
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: moderateScale(15),
  },

  // Accepted container
  acceptedContainer: {
    flex: 1,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    padding: scale(16),
    borderRadius: moderateScale(12),
    marginTop: verticalScale(12),
    gap: scale(10),
  },
  contactText: {
    color: COLORS.success,
    fontWeight: '600',
    fontSize: moderateScale(15),
  },

  // Tracking info
  trackingInfo: {
    marginTop: verticalScale(16),
  },
  trackingCard: {
    borderRadius: moderateScale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  trackingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  trackingItem: {
    alignItems: 'center',
    flex: 1,
  },
  trackingDivider: {
    width: 1,
    height: verticalScale(40),
    backgroundColor: COLORS.gray200,
  },
  trackingLabel: {
    fontSize: moderateScale(12),
    color: COLORS.gray500,
    marginTop: verticalScale(4),
  },
  trackingValue: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: verticalScale(2),
  },

  // Vendor arrival badge
  arrivalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    borderRadius: moderateScale(20),
    marginBottom: verticalScale(12),
    gap: scale(6),
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  arrivalText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: COLORS.white,
  },

  // Sheet title
  sheetTitleContainer: {
    marginBottom: verticalScale(16),
    borderRadius: moderateScale(12),
    overflow: 'hidden',
  },
  sheetTitleGradient: {
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
  },
  sheetTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
});
