/**
 * Ongoing Service Card Component
 *
 * Displays active service request card on home screen when customer has an ongoing service.
 * Shows status with colored dot indicator, countdown timer (for pending), vendor info (for accepted).
 * Simple white card design matching ServiceHistoryCard styling.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';

import Text from '@/components/common/Text';
import { COLORS } from '@/constants/colors';
import { formatCountdownTime } from '@/utils/dateFormatters';

// ============================================================================
// TYPES
// ============================================================================

export type OngoingServiceStatus = 'pending' | 'accepted' | 'en_route' | 'arrived' | 'in_progress';

export interface OngoingServiceCardProps {
  requestId: number;
  status: OngoingServiceStatus;
  categoryName?: string;
  problemTitle?: string;
  vendorName?: string;
  expiresAt?: string;
  onPress: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const getStatusConfig = (status: OngoingServiceStatus) => {
  switch (status) {
    case 'pending':
      return {
        label: 'Searching for Vendors',
        color: COLORS.warning,
      };
    case 'accepted':
      return {
        label: 'Vendor Assigned',
        color: COLORS.info,
      };
    case 'en_route':
      return {
        label: 'Vendor En Route',
        color: COLORS.primary,
      };
    case 'arrived':
      return {
        label: 'Vendor Has Arrived',
        color: COLORS.success,
      };
    case 'in_progress':
      return {
        label: 'Service In Progress',
        color: COLORS.success,
      };
    default:
      return {
        label: 'Active Service',
        color: COLORS.primary,
      };
  }
};

// formatTimeLeft removed - using centralized formatCountdownTime from dateFormatters

// ============================================================================
// COMPONENT
// ============================================================================

export const OngoingServiceCard: React.FC<OngoingServiceCardProps> = ({
  // requestId is available for future use (e.g., analytics)
  status,
  categoryName,
  problemTitle,
  vendorName,
  expiresAt,
  onPress,
}) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const statusConfig = getStatusConfig(status);

  // Calculate and update timer for pending requests
  useEffect(() => {
    if (status !== 'pending' || !expiresAt) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const expiresAtMs = new Date(expiresAt).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((expiresAtMs - now) / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status, expiresAt]);

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  // Don't allow click when in_progress - proposals.sync doesn't have data after service.start
  const isClickable = status !== 'in_progress';
  const CardWrapper = isClickable ? TouchableOpacity : View;
  const wrapperProps = isClickable ? { onPress: handlePress, activeOpacity: 0.8 } : {};

  return (
    <CardWrapper
      style={styles.card}
      {...wrapperProps}
    >
      {/* Header: Status dot + Label + Timer */}
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text type="bodySemiBold" style={[styles.statusLabel, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
        {timeLeft !== null && timeLeft > 0 && (
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={14} color={COLORS.gray600} />
            <Text style={styles.timerText}>{formatCountdownTime(timeLeft)}</Text>
          </View>
        )}
      </View>

      {/* Content: Category & Problem */}
      <View style={styles.content}>
        {categoryName && (
          <Text style={styles.categoryText}>{categoryName}</Text>
        )}
        {problemTitle && (
          <Text type="bodySemiBold" style={styles.problemText} numberOfLines={1}>
            {problemTitle}
          </Text>
        )}
      </View>

      {/* Vendor Info (when assigned) */}
      {vendorName && status !== 'pending' && (
        <View style={styles.vendorRow}>
          <Ionicons name="person-outline" size={16} color={COLORS.gray500} />
          <Text style={styles.vendorName} numberOfLines={1}>
            {vendorName}
          </Text>
        </View>
      )}

      {/* CTA Row - Only show when clickable */}
      {isClickable && (
        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>Tap to view details</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </View>
      )}
    </CardWrapper>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    marginBottom: verticalScale(12),
    padding: scale(16),
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  statusDot: {
    width: moderateScale(10),
    height: moderateScale(10),
    borderRadius: moderateScale(5),
  },
  statusLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: COLORS.gray100,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  timerText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: COLORS.gray700,
  },
  content: {
    marginBottom: verticalScale(10),
  },
  categoryText: {
    fontSize: moderateScale(12),
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: verticalScale(4),
  },
  problemText: {
    fontSize: moderateScale(15),
    color: COLORS.gray900,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingVertical: verticalScale(10),
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  vendorName: {
    fontSize: moderateScale(14),
    color: COLORS.gray700,
    flex: 1,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: verticalScale(8),
    paddingTop: verticalScale(10),
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  ctaText: {
    fontSize: moderateScale(13),
    color: COLORS.primary,
    fontWeight: '500',
    marginRight: scale(4),
  },
});

export default OngoingServiceCard;
