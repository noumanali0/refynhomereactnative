/**
 * Service History Card Component
 *
 * Displays service request history with vendor info and add to favorites functionality.
 * Shows different UI based on service status (active, completed, cancelled).
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useDispatch, useSelector } from 'react-redux';
import { router } from 'expo-router';

import Text from '@/components/common/Text';
import RatingModal from '@/components/common/RatingModal';
import { COLORS } from '@/constants/colors';
import { ServiceHistoryRequest } from '@/services/serviceHistoryService';
import { addToFavorites, removeFromFavorites, selectFavoriteVendorIds, selectIsAddingFavorite } from '@/store/slices/vendorSlice';
import { AppDispatch } from '@/store';
import { useToast } from '@/contexts/ToastContext';

// ============================================================================
// TYPES
// ============================================================================

interface ServiceHistoryCardProps {
  request: ServiceHistoryRequest;
  onPress?: (requestId: number) => void;
  disablePress?: boolean;
  onReviewSubmit?: () => void; // Callback after review is submitted to refresh history
}

// ============================================================================
// HELPERS
// ============================================================================

const getStatusConfig = (status: ServiceHistoryRequest['status']) => {
  switch (status) {
    case 'pending':
      return { label: 'Pending', color: COLORS.warning, icon: 'time-outline' };
    case 'accepted':
      return { label: 'Accepted', color: COLORS.info, icon: 'checkmark-circle-outline' };
    case 'en_route':
      return { label: 'En Route', color: COLORS.info, icon: 'navigate-outline' };
    case 'in_progress':
      return { label: 'In Progress', color: COLORS.primary, icon: 'construct-outline' };
    case 'completed':
      return { label: 'Completed', color: COLORS.success, icon: 'checkmark-done' };
    case 'cancelled':
      return { label: 'Cancelled', color: COLORS.error, icon: 'close-circle-outline' };
    case 'expired':
      return { label: 'Expired', color: COLORS.gray500, icon: 'timer-outline' };
    default:
      return { label: status, color: COLORS.gray500, icon: 'help-circle-outline' };
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ServiceHistoryCard: React.FC<ServiceHistoryCardProps> = ({
  request,
  onPress,
  disablePress = false,
  onReviewSubmit,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();
  const favoriteVendorIds = useSelector(selectFavoriteVendorIds);
  const isAddingFavorite = useSelector(selectIsAddingFavorite);

  // Review modal state
  const [showRatingModal, setShowRatingModal] = useState(false);

  const statusConfig = useMemo(() => getStatusConfig(request.status), [request.status]);

  // Get vendor info from either assigned_vendor_detail or accepted_proposal
  const vendor = request?.assigned_vendor_detail || request?.accepted_proposal?.vendor;
  const vendorId = vendor?.id;

  // Redux favoriteVendorIds is the source of truth for UI
  // It's updated immediately on toggle for responsive UX
  // Only fall back to API value if vendorId is not available
  const isFavorite = vendorId
    ? favoriteVendorIds.includes(vendorId)
    : (vendor?.is_favorite ?? false);

  // Handle toggle favorites (add/remove)
  const handleToggleFavorite = useCallback(async () => {
    if (!vendorId) return;

    try {
      if (isFavorite) {
        // Remove from favorites
        await dispatch(removeFromFavorites(vendorId)).unwrap();
        showToast({
          type: 'success',
          title: 'Removed',
          message: 'Vendor removed from favorites.',
        });
      } else {
        // Add to favorites
        await dispatch(addToFavorites(vendorId)).unwrap();
        showToast({
          type: 'success',
          title: 'Added',
          message: 'Vendor added to favorites!',
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Error',
        message: typeof error === 'string' ? error : 'Something went wrong',
      });
    }
  }, [dispatch, vendorId, isFavorite, showToast]);

  // Handle card press
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(request.id);
    } else {
      router.push({
        pathname: '/(customer)/(history)/service-details',
        params: { id: request.id },
      });
    }
  }, [onPress, request.id]);

  // Check if service is completed and has vendor
  const showVendorSection = request.status === 'completed' && vendor;

  // Use View instead of TouchableOpacity when press is disabled (better performance)
  const CardWrapper = disablePress ? View : TouchableOpacity;
  const wrapperProps = disablePress ? {} : { onPress: handlePress, activeOpacity: 0.8 };

  return (
    <CardWrapper
      style={styles.card}
      {...wrapperProps}
    >
      {/* Header: Category & Status */}
      <View style={styles.header}>
        <View style={styles.categoryContainer}>
          <View style={styles.categoryIcon}>
            <Ionicons name="construct" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.categoryInfo}>
            <Text type="bodySemiBold" style={styles.categoryName}>
              {request?.category?.name || 'Service'}
            </Text>
            <Text style={styles.dateText}>
              {formatDate(request.created_at)} at {formatTime(request.created_at)}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Problem Title & Description */}
      <View style={styles.detailsSection}>
        <Text type="bodySemiBold" style={styles.problemTitle} numberOfLines={1}>
          {request.problem_title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {request.description}
        </Text>
      </View>

      {/* Address */}
      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={16} color={COLORS.gray500} />
        <Text style={styles.addressText} numberOfLines={1}>
          {request.address_line}
        </Text>
      </View>

      {/* Cancellation Info Section - Show for cancelled requests */}
      {request.status === 'cancelled' && (
        <View style={styles.cancellationSection}>
          <View style={styles.cancellationHeader}>
            <Ionicons name="close-circle" size={20} color={COLORS.error} />
            <Text style={styles.cancelledByText}>
              {request.cancelled_by === 'vendor'
                ? 'Cancelled by Vendor'
                : 'Cancelled by You'}
            </Text>
          </View>
          {request.cancellation_reason && (
            <View style={styles.cancellationReasonContainer}>
              <Text style={styles.cancellationReasonLabel}>Reason:</Text>
              <Text style={styles.cancellationReasonText}>
                {request.cancellation_reason}
              </Text>
            </View>
          )}
          {request.cancelled_at && (
            <Text style={styles.cancelledAtText}>
              {formatDate(request.cancelled_at)} at {formatTime(request.cancelled_at)}
            </Text>
          )}
        </View>
      )}

      {/* Vendor Section - Only show for completed services */}
      {showVendorSection && (
        <View style={styles.vendorSection}>
          <LinearGradient
            colors={[COLORS.gray50, COLORS.white]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.vendorGradient}
          >
            {/* Vendor Info Row */}
            <View style={styles.vendorInfoRow}>
              {/* Vendor Info - Clickable to view vendor profile */}
              <TouchableOpacity
                style={styles.vendorClickableArea}
                onPress={() => {
                  if (vendorId) {
                    router.push({
                      pathname: '/(customer)/(favorites)/vendor-detail',
                      params: { vendorId: vendorId.toString() }
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                {/* Vendor Avatar */}
                <View style={styles.vendorAvatar}>
                  {vendor.profile_photo_url ? (
                    <Image
                      source={{ uri: vendor.profile_photo_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.accent]}
                      style={styles.avatarGradient}
                    >
                      <Text style={styles.avatarText}>
                        {vendor?.full_name?.charAt(0)?.toUpperCase() || 'V'}
                      </Text>
                    </LinearGradient>
                  )}
                </View>

                {/* Vendor Details */}
                <View style={styles.vendorDetails}>
                  <View style={styles.vendorNameRow}>
                    <Text type="bodySemiBold" style={styles.vendorName}>
                      {vendor.full_name}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.gray400} style={{ marginLeft: 4 }} />
                  </View>
                  <View style={styles.vendorMeta}>
                    {vendor.verified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={12} color={COLORS.warning} />
                      <Text style={styles.ratingText}>
                        {/* Use category-specific rating if available, fallback to overall */}
                        {(vendor?.category_average_rating ?? vendor?.average_rating)?.toFixed(1) || '0.0'}
                      </Text>
                      <Text style={styles.reviewCount}>
                        {/* Use category-specific reviews if available, fallback to overall */}
                        ({vendor?.category_total_reviews ?? vendor?.total_reviews ?? 0})
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.completedJobs}>
                    {/* Use category-specific jobs if available, fallback to overall */}
                    {vendor?.category_completed_jobs ?? vendor?.completed_jobs ?? 0} jobs completed
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Toggle Favorites Button */}
              <TouchableOpacity
                style={[
                  styles.favoriteButton,
                  isFavorite && styles.favoriteButtonActive,
                ]}
                onPress={handleToggleFavorite}
                disabled={isAddingFavorite}
                activeOpacity={0.7}
              >
                {isAddingFavorite ? (
                  <ActivityIndicator size="small" color={isFavorite ? COLORS.error : COLORS.primary} />
                ) : (
                  <>
                    <Ionicons
                      name={isFavorite ? 'heart' : 'heart-outline'}
                      size={20}
                      color={isFavorite ? COLORS.error : COLORS.primary}
                    />
                    <Text
                      style={[
                        styles.favoriteButtonText,
                        isFavorite && styles.favoriteButtonTextActive,
                      ]}
                    >
                      {isFavorite ? 'Saved' : 'Save'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Price & Review Row */}
            {request.accepted_proposal?.price_quote && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Service Price</Text>
                <Text type="subtitle" style={styles.priceValue}>
                  Rs. {request?.accepted_proposal?.price_quote?.toLocaleString() || '0'}
                </Text>
              </View>
            )}

            {/* Review Section */}
            {request.has_review && request.review ? (
              // Show existing review
              <View style={styles.reviewSection}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewLabel}>Your Review</Text>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= request.review!.stars ? 'star' : 'star-outline'}
                        size={14}
                        color={COLORS.warning}
                      />
                    ))}
                  </View>
                </View>
                {request.review.feedback && (
                  <Text style={styles.reviewFeedback} numberOfLines={2}>
                    "{request.review.feedback}"
                  </Text>
                )}
              </View>
            ) : (
              // Show Add Review button
              <TouchableOpacity
                style={styles.addReviewButton}
                onPress={() => setShowRatingModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="star-outline" size={16} color={COLORS.primary} />
                <Text style={styles.addReviewText}>Add Review</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>
      )}

      {/* Rating Modal */}
      {showVendorSection && (
        <RatingModal
          visible={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onSuccess={() => {
            setShowRatingModal(false);
            // Call refresh callback to update history list
            onReviewSubmit?.();
          }}
          serviceRequestId={request.id}
          vendorName={vendor?.full_name || 'Vendor'}
        />
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
    alignItems: 'flex-start',
    marginBottom: verticalScale(12),
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(12),
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: moderateScale(15),
    color: COLORS.gray900,
  },
  dateText: {
    fontSize: moderateScale(12),
    color: COLORS.gray500,
    marginTop: verticalScale(2),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(20),
    gap: scale(4),
  },
  statusText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  detailsSection: {
    marginBottom: verticalScale(10),
  },
  problemTitle: {
    fontSize: moderateScale(14),
    color: COLORS.gray800,
    marginBottom: verticalScale(4),
  },
  description: {
    fontSize: moderateScale(13),
    color: COLORS.gray600,
    lineHeight: moderateScale(18),
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  addressText: {
    fontSize: moderateScale(13),
    color: COLORS.gray600,
    flex: 1,
  },
  cancellationSection: {
    marginTop: verticalScale(12),
    padding: scale(12),
    backgroundColor: COLORS.error + '08',
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: COLORS.error + '20',
  },
  cancellationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(6),
  },
  cancelledByText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: COLORS.error,
  },
  cancellationReasonContainer: {
    marginTop: verticalScale(4),
    paddingLeft: scale(28),
  },
  cancellationReasonLabel: {
    fontSize: moderateScale(12),
    color: COLORS.gray500,
    marginBottom: verticalScale(2),
  },
  cancellationReasonText: {
    fontSize: moderateScale(13),
    color: COLORS.gray700,
    lineHeight: moderateScale(18),
  },
  cancelledAtText: {
    fontSize: moderateScale(11),
    color: COLORS.gray500,
    marginTop: verticalScale(6),
    paddingLeft: scale(28),
  },
  vendorSection: {
    marginTop: verticalScale(12),
    borderRadius: moderateScale(12),
    overflow: 'hidden',
  },
  vendorGradient: {
    padding: scale(12),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  vendorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorClickableArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vendorAvatar: {
    marginRight: scale(12),
  },
  avatarImage: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
  },
  avatarPlaceholder: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGradient: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: COLORS.white,
  },
  vendorDetails: {
    flex: 1,
  },
  vendorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorName: {
    fontSize: moderateScale(14),
    color: COLORS.gray900,
  },
  vendorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: verticalScale(3),
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
  },
  verifiedText: {
    fontSize: moderateScale(11),
    color: COLORS.success,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
  },
  ratingText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: COLORS.gray700,
  },
  reviewCount: {
    fontSize: moderateScale(11),
    color: COLORS.gray500,
  },
  completedJobs: {
    fontSize: moderateScale(11),
    color: COLORS.gray500,
    marginTop: verticalScale(2),
  },
  favoriteButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(10),
    backgroundColor: COLORS.primary + '10',
    minWidth: moderateScale(60),
  },
  favoriteButtonActive: {
    backgroundColor: COLORS.error + '10',
  },
  favoriteButtonText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: verticalScale(2),
  },
  favoriteButtonTextActive: {
    color: COLORS.error,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(12),
    paddingTop: verticalScale(10),
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  priceLabel: {
    fontSize: moderateScale(13),
    color: COLORS.gray600,
  },
  priceValue: {
    fontSize: moderateScale(16),
    color: COLORS.success,
  },
  reviewSection: {
    marginTop: verticalScale(10),
    paddingTop: verticalScale(10),
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  reviewLabel: {
    fontSize: moderateScale(12),
    color: COLORS.gray500,
    fontWeight: '500',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: scale(2),
  },
  reviewFeedback: {
    fontSize: moderateScale(12),
    fontStyle: 'italic',
    color: COLORS.gray600,
    lineHeight: moderateScale(18),
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: verticalScale(10),
    paddingTop: verticalScale(10),
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  addReviewText: {
    fontSize: moderateScale(13),
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default ServiceHistoryCard;
