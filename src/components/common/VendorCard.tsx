// src/components/common/VendorCard.tsx
/**
 * Vendor Card Component
 *
 * Displays vendor information including profile photo, name, rating,
 * location, and service categories in a card format.
 */

import React, { memo } from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { RatingStars } from './RatingStars';
import { COLORS } from '@/constants/colors';
import { useRouter } from 'expo-router';
import type { Vendor } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface VendorCardProps {
  vendor: Vendor;
  onPress?: () => void;
}

// ============================================================================
// Component
// ============================================================================

const VendorCardComponent: React.FC<VendorCardProps> = ({ vendor, onPress }) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/customer/vendor-detail?id=${vendor.id}` as any);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.container}>
        {/* Vendor Avatar */}
        <Image
          source={{ uri: vendor.profilePhoto || 'https://i.pravatar.cc/150?img=1' }}
          style={styles.avatar}
        />

        {/* Vendor Info */}
        <View style={styles.infoContainer}>
          {/* Name and Verified Badge */}
          <View style={styles.nameRow}>
            <Text type="bodySemiBold" style={styles.vendorName} numberOfLines={1}>
              {vendor.name}
            </Text>
            {vendor.verified && (
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            )}
          </View>

          {/* Rating and Reviews */}
          <View style={styles.ratingRow}>
            <RatingStars rating={vendor.rating} size="small" />
            <Text type="body2" style={styles.reviewText}>
              ({vendor.totalReviews} reviews)
            </Text>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={COLORS.gray500} />
            <Text type="body2" style={styles.locationText} numberOfLines={1}>
              {vendor.city}
            </Text>
          </View>

          {/* Service Categories */}
          <View style={styles.categoriesRow}>
            {vendor.serviceCategories.slice(0, 2).map((category, index) => (
              <View key={index} style={styles.categoryBadge}>
                <Text type="caption" style={styles.categoryText}>{category.label}</Text>
              </View>
            ))}
            {vendor.serviceCategories.length > 2 && (
              <View style={styles.moreBadge}>
                <Text type="caption" style={styles.moreText}>
                  +{vendor.serviceCategories.length - 2}
                </Text>
              </View>
            )}
          </View>

          {/* Online Status (if needed in future) */}
          {/* {vendor.isOnline && (
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text type="caption" style={styles.onlineText}>Online</Text>
            </View>
          )} */}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// Memoization
// ============================================================================

export const VendorCard = memo(VendorCardComponent);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginBottom: verticalScale(12),
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  container: {
    flexDirection: 'row',
    gap: scale(12),
  },
  avatar: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    backgroundColor: COLORS.gray100,
  },
  infoContainer: {
    flex: 1,
    gap: verticalScale(6),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  vendorName: {
    flex: 1,
    fontSize: moderateScale(16),
    color: COLORS.gray900,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  reviewText: {
    color: COLORS.gray600,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  locationText: {
    flex: 1,
    color: COLORS.gray600,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
  },
  categoryBadge: {
    backgroundColor: COLORS.primary50,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(6),
  },
  categoryText: {
    fontSize: moderateScale(11),
    color: COLORS.primary,
  },
  moreBadge: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(6),
  },
  moreText: {
    fontSize: moderateScale(11),
    color: COLORS.gray600,
  },
  // Online status styles (for future use)
  // onlineRow: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   gap: scale(4),
  // },
  // onlineDot: {
  //   width: moderateScale(8),
  //   height: moderateScale(8),
  //   borderRadius: moderateScale(4),
  //   backgroundColor: COLORS.success,
  // },
  // onlineText: {
  //   fontSize: moderateScale(11),
  //   color: COLORS.success,
  // },
});
