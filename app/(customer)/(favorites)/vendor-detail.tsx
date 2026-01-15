// VendorDetailScreen.tsx
/**
 * Vendor Detail Screen - Beautiful Modern Design
 * Shows vendor's public profile with reviews, services, and contact info.
 */

import React, { useCallback, memo, useState, useEffect } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@/store";

import Text from "@/components/common/Text";
import { vendorApi, VendorPublicProfile, VendorReview } from "@/services/vendorApi";
import { addToFavorites, removeFromFavorites, selectFavoriteVendorIds } from "@/store/slices/vendorSlice";
import { COLORS } from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ----------------------- Types -----------------------
type TabType = "about" | "reviews" | "contact";

// ----------------------- Stat Card Component -----------------------
const StatCard = memo(({
  icon,
  value,
  label,
  iconColor,
  delay = 0
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  iconColor: string;
  delay?: number;
}) => (
  <Animated.View
    entering={FadeInDown.delay(delay).springify()}
    style={styles.statCard}
  >
    <View style={[styles.statIconContainer, { backgroundColor: iconColor + '15' }]}>
      <Ionicons name={icon} size={moderateScale(20)} color={iconColor} />
    </View>
    <Text type="title" style={styles.statValue}>{value}</Text>
    <Text type="body" style={styles.statLabel}>{label}</Text>
  </Animated.View>
));

// ----------------------- Header Component -----------------------
const VendorHeader = memo(({
  vendor,
  isFavorite,
  onToggleFavorite,
  isTogglingFavorite,
  onBack
}: {
  vendor: VendorPublicProfile;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isTogglingFavorite: boolean;
  onBack: () => void;
}) => {
  const memberYear = vendor.member_since
    ? new Date(vendor.member_since).getFullYear()
    : new Date().getFullYear();

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={onToggleFavorite}
          disabled={isTogglingFavorite}
          activeOpacity={0.7}
        >
          {isTogglingFavorite ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? COLORS.error : COLORS.white}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <Animated.View
        entering={FadeIn.delay(100)}
        style={styles.profileSection}
      >
        <View style={styles.avatarContainer}>
          {vendor.profile_photo_url ? (
            <Image
              source={{ uri: vendor.profile_photo_url }}
              style={styles.avatar}
            />
          ) : (
            <LinearGradient
              colors={[COLORS.white + '30', COLORS.white + '10']}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarText}>
                {vendor.full_name?.charAt(0)?.toUpperCase() || 'V'}
              </Text>
            </LinearGradient>
          )}
          {vendor.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color={COLORS.white} />
            </View>
          )}
        </View>

        <Text type="title" style={styles.vendorName}>{vendor.full_name}</Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.white + '90'} />
          <Text style={styles.locationText}>
            {vendor.city || 'Pakistan'} • Since {memberYear}
          </Text>
        </View>

        {/* Rating Badge */}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={16} color={COLORS.warning} />
          <Text style={styles.ratingText}>
            {vendor.average_rating.toFixed(1)}
          </Text>
          <Text style={styles.reviewCountText}>
            ({vendor.total_reviews} reviews)
          </Text>
        </View>
      </Animated.View>

      {/* Quick Action Buttons */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => Linking.openURL(`tel:${vendor.phone}`)}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={20} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Call</Text>
        </TouchableOpacity>

        <View style={styles.quickActionDivider} />

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => {
            const phone = vendor.phone.replace(/\D/g, '');
            Linking.openURL(`https://wa.me/${phone}`);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text style={styles.quickActionText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
});

// ----------------------- Tabs Component -----------------------
const TabBar = memo(({ active, onChange }: { active: TabType; onChange: (t: TabType) => void }) => {
  const tabs: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'about', label: 'About', icon: 'person-outline' },
    { key: 'reviews', label: 'Reviews', icon: 'star-outline' },
    { key: 'contact', label: 'Contact', icon: 'call-outline' },
  ];

  return (
    <Animated.View
      entering={FadeInDown.delay(200).springify()}
      style={styles.tabBar}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, isActive && styles.tabActive]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={isActive ? COLORS.primary : COLORS.gray500}
            />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
});

// ----------------------- Service Card Component -----------------------
const ServiceCard = memo(({ name, description, index }: { name: string; description?: string; index: number }) => (
  <Animated.View
    entering={FadeInDown.delay(300 + index * 50).springify()}
    style={styles.serviceCard}
  >
    <LinearGradient
      colors={[COLORS.primary + '10', COLORS.accent + '10']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.serviceIconBg}
    >
      <Ionicons name="construct" size={20} color={COLORS.primary} />
    </LinearGradient>
    <View style={styles.serviceContent}>
      <Text type="subtitle2" style={styles.serviceName}>{name}</Text>
      {description && (
        <Text type="body" style={styles.serviceDescription}>{description}</Text>
      )}
    </View>
    <Ionicons name="chevron-forward" size={18} color={COLORS.gray400} />
  </Animated.View>
));

// ----------------------- About Tab -----------------------
const AboutTab = memo(({ vendor }: { vendor: VendorPublicProfile }) => (
  <View style={styles.tabContent}>
    {vendor.bio && (
      <Animated.View
        entering={FadeInDown.delay(250).springify()}
        style={styles.bioSection}
      >
        <Text type="subtitle2" style={styles.sectionTitle}>About</Text>
        <Text type="body2" style={styles.bioText}>{vendor.bio}</Text>
      </Animated.View>
    )}

    <View style={styles.servicesSection}>
      <Text type="subtitle2" style={styles.sectionTitle}>Services Offered</Text>
      {(vendor.services ?? []).length > 0 ? (
        (vendor.services ?? []).map((service, index) => (
          <ServiceCard
            key={service.id}
            name={service.name}
            description={service.description}
            index={index}
          />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={48} color={COLORS.gray300} />
          <Text style={styles.emptyStateText}>No services listed</Text>
        </View>
      )}
    </View>
  </View>
));

// ----------------------- Review Card Component -----------------------
const ReviewCard = memo(({ review, index }: { review: VendorReview; index: number }) => {
  const formattedDate = new Date(review.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <Animated.View
      entering={FadeInDown.delay(300 + index * 80).springify()}
      style={styles.reviewCard}
    >
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          {review.customer.photo_url ? (
            <Image
              source={{ uri: review.customer.photo_url }}
              style={styles.reviewerAvatar}
            />
          ) : (
            <LinearGradient
              colors={[COLORS.primary, COLORS.accent]}
              style={styles.reviewerAvatarPlaceholder}
            >
              <Text style={styles.reviewerInitial}>
                {review.customer.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </LinearGradient>
          )}
          <View style={styles.reviewerDetails}>
            <Text type="subtitle2" style={styles.reviewerName}>{review.customer.name}</Text>
            <Text type="body" style={styles.reviewDate}>{formattedDate}</Text>
          </View>
        </View>

        <View style={styles.ratingStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= review.rating ? "star" : "star-outline"}
              size={14}
              color={star <= review.rating ? COLORS.warning : COLORS.gray300}
            />
          ))}
        </View>
      </View>

      {review.comment && (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      )}

      {review.service_category && (
        <View style={styles.serviceBadge}>
          <Ionicons name="construct-outline" size={12} color={COLORS.primary} />
          <Text style={styles.serviceBadgeText}>{review.service_category}</Text>
        </View>
      )}
    </Animated.View>
  );
});

// ----------------------- Reviews Tab -----------------------
const ReviewsTab = memo(({
  reviews,
  averageRating,
  totalReviews,
  onLoadMore,
  isLoadingMore
}: {
  reviews: VendorReview[];
  averageRating: number;
  totalReviews: number;
  onLoadMore: () => void;
  isLoadingMore: boolean;
}) => (
  <View style={styles.tabContent}>
    {/* Rating Summary Card */}
    <Animated.View
      entering={FadeInDown.delay(250).springify()}
      style={styles.ratingSummaryCard}
    >
      <View style={styles.ratingBig}>
        <Text style={styles.ratingBigNumber}>{averageRating.toFixed(1)}</Text>
        <View style={styles.ratingStarsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= Math.round(averageRating) ? "star" : "star-outline"}
              size={18}
              color={star <= Math.round(averageRating) ? COLORS.warning : COLORS.gray300}
            />
          ))}
        </View>
        <Text style={styles.totalReviewsText}>{totalReviews} reviews</Text>
      </View>
    </Animated.View>

    {/* Reviews List */}
    {reviews.length > 0 ? (
      <>
        {reviews.map((review, index) => (
          <ReviewCard key={review.id} review={review} index={index} />
        ))}
        {reviews.length < totalReviews && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={onLoadMore}
            disabled={isLoadingMore}
            activeOpacity={0.7}
          >
            {isLoadingMore ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Text style={styles.loadMoreText}>Load More Reviews</Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
              </>
            )}
          </TouchableOpacity>
        )}
      </>
    ) : (
      <View style={styles.emptyState}>
        <Ionicons name="chatbubble-outline" size={56} color={COLORS.gray300} />
        <Text style={styles.emptyStateText}>No reviews yet</Text>
        <Text style={styles.emptyStateSubtext}>Be the first to review!</Text>
      </View>
    )}
  </View>
));

// ----------------------- Contact Tab -----------------------
const ContactTab = memo(({ vendor }: { vendor: VendorPublicProfile }) => {
  const handleCall = () => Linking.openURL(`tel:${vendor.phone}`);
  const handleWhatsApp = () => {
    const phone = vendor.phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${phone}`);
  };

  return (
    <View style={styles.tabContent}>
      <Animated.View
        entering={FadeInDown.delay(250).springify()}
        style={styles.contactCard}
      >
        {/* Phone */}
        <TouchableOpacity
          style={styles.contactItem}
          onPress={handleCall}
          activeOpacity={0.7}
        >
          <View style={[styles.contactIconBg, { backgroundColor: COLORS.primary + '15' }]}>
            <Ionicons name="call" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text type="body" style={styles.contactLabel}>Phone</Text>
            <Text type="subtitle2" style={styles.contactValue}>{vendor.phone}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
        </TouchableOpacity>

        <View style={styles.contactDivider} />

        {/* WhatsApp */}
        <TouchableOpacity
          style={styles.contactItem}
          onPress={handleWhatsApp}
          activeOpacity={0.7}
        >
          <View style={[styles.contactIconBg, { backgroundColor: '#25D366' + '15' }]}>
            <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
          </View>
          <View style={styles.contactInfo}>
            <Text type="body" style={styles.contactLabel}>WhatsApp</Text>
            <Text type="subtitle2" style={styles.contactValue}>Send message</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
        </TouchableOpacity>

        {vendor.city && (
          <>
            <View style={styles.contactDivider} />
            <View style={styles.contactItem}>
              <View style={[styles.contactIconBg, { backgroundColor: COLORS.accent + '15' }]}>
                <Ionicons name="location" size={22} color={COLORS.accent} />
              </View>
              <View style={styles.contactInfo}>
                <Text type="body" style={styles.contactLabel}>Location</Text>
                <Text type="subtitle2" style={styles.contactValue}>{vendor.city}</Text>
              </View>
            </View>
          </>
        )}
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View
        entering={FadeInDown.delay(350).springify()}
        style={styles.actionButtons}
      >
        <TouchableOpacity
          style={styles.callButton}
          onPress={handleCall}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primary]}
            style={styles.callButtonGradient}
          >
            <Ionicons name="call" size={20} color={COLORS.white} />
            <Text style={styles.callButtonText}>Call Now</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={handleWhatsApp}
          activeOpacity={0.8}
        >
          <View style={styles.whatsappButtonInner}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            <Text style={styles.whatsappButtonText}>WhatsApp</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

// ----------------------- Loading Skeleton -----------------------
const LoadingSkeleton = () => (
  <View style={styles.skeletonContainer}>
    <LinearGradient
      colors={[COLORS.gray200, COLORS.gray100]}
      style={styles.skeletonHeader}
    />
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonStatsRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.skeletonStatCard} />
        ))}
      </View>
      <View style={styles.skeletonTabs} />
      <View style={styles.skeletonCard} />
      <View style={styles.skeletonCard} />
    </View>
  </View>
);

// ----------------------- Error State -----------------------
const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <View style={styles.errorContainer}>
    <Ionicons name="alert-circle-outline" size={72} color={COLORS.error} />
    <Text type="title" style={styles.errorTitle}>Something went wrong</Text>
    <Text type="body2" style={styles.errorMessage}>{message}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.retryButtonGradient}
      >
        <Ionicons name="refresh" size={18} color={COLORS.white} />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

// ----------------------- Main Screen -----------------------
const VendorDetailScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const vendorId = params.vendorId ? Number(params.vendorId) : null;
  const dispatch = useDispatch<AppDispatch>();

  // Redux state for favorites (source of truth)
  const favoriteVendorIds = useSelector(selectFavoriteVendorIds);
  const isFavorite = vendorId ? favoriteVendorIds.includes(vendorId) : false;

  const [vendor, setVendor] = useState<VendorPublicProfile | null>(null);
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("about");
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const fetchVendorProfile = useCallback(async (showLoading = true) => {
    if (!vendorId) {
      setError("Vendor ID is required");
      setIsLoading(false);
      return;
    }

    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      const profile = await vendorApi.getProfile(vendorId);
      setVendor(profile);
      // Note: isFavorite is managed by Redux (favoriteVendorIds), not local state
      setReviews(profile.recent_reviews);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendor profile");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [vendorId]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchVendorProfile(false);
  }, [fetchVendorProfile]);

  const handleLoadMoreReviews = useCallback(async () => {
    if (!vendorId || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      const response = await vendorApi.getReviews(vendorId, {
        limit: 10,
        sort: 'latest',
      });
      setReviews(response.results);
    } catch (err) {
      console.error('Failed to load more reviews:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [vendorId, isLoadingMore]);

  const handleToggleFavorite = useCallback(async () => {
    if (!vendorId || isTogglingFavorite) return;

    try {
      setIsTogglingFavorite(true);
      if (isFavorite) {
        // Use Redux action - updates favoriteVendorIds immediately
        await dispatch(removeFromFavorites(vendorId)).unwrap();
      } else {
        // Use Redux action - updates favoriteVendorIds immediately
        await dispatch(addToFavorites(vendorId)).unwrap();
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [vendorId, isFavorite, isTogglingFavorite, dispatch]);

  useEffect(() => {
    fetchVendorProfile();
  }, [fetchVendorProfile]);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error || !vendor) {
    return (
      <View style={styles.container}>
        <View style={styles.errorHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.errorBackButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.gray900} />
          </TouchableOpacity>
        </View>
        <ErrorState
          message={error || "Vendor not found"}
          onRetry={() => fetchVendorProfile()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <VendorHeader
          vendor={vendor}
          isFavorite={isFavorite}
          onToggleFavorite={handleToggleFavorite}
          isTogglingFavorite={isTogglingFavorite}
          onBack={() => router.back()}
        />

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="briefcase"
            value={vendor.completed_jobs}
            label="Jobs Done"
            iconColor={COLORS.primary}
            delay={100}
          />
          <StatCard
            icon="star"
            value={vendor.average_rating.toFixed(1)}
            label="Rating"
            iconColor={COLORS.warning}
            delay={150}
          />
          <StatCard
            icon="chatbubbles"
            value={vendor.total_reviews}
            label="Reviews"
            iconColor={COLORS.accent}
            delay={200}
          />
          <StatCard
            icon="flash"
            value={`${vendor.response_rate}%`}
            label="Response"
            iconColor={COLORS.success}
            delay={250}
          />
        </View>

        {/* Tab Bar */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === "about" && <AboutTab vendor={vendor} />}
        {activeTab === "reviews" && (
          <ReviewsTab
            reviews={reviews}
            averageRating={vendor.average_rating}
            totalReviews={vendor.total_reviews}
            onLoadMore={handleLoadMoreReviews}
            isLoadingMore={isLoadingMore}
          />
        )}
        {activeTab === "contact" && <ContactTab vendor={vendor} />}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

export default VendorDetailScreen;

// ----------------------- Styles -----------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  scrollView: {
    flex: 1,
  },

  // Header Styles
  headerGradient: {
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(24),
    borderBottomLeftRadius: moderateScale(32),
    borderBottomRightRadius: moderateScale(32),
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(20),
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: COLORS.white + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: COLORS.white + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: scale(16),
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: verticalScale(12),
  },
  avatar: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  avatarPlaceholder: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  avatarText: {
    fontSize: moderateScale(36),
    fontWeight: '700',
    color: COLORS.white,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  vendorName: {
    color: COLORS.white,
    fontSize: moderateScale(22),
    fontWeight: '700',
    marginBottom: verticalScale(4),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  locationText: {
    color: COLORS.white + '90',
    fontSize: moderateScale(13),
    marginLeft: scale(4),
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    gap: scale(6),
  },
  ratingText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: COLORS.gray900,
  },
  reviewCountText: {
    fontSize: moderateScale(13),
    color: COLORS.gray500,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: scale(24),
    marginTop: verticalScale(20),
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(4),
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    gap: scale(8),
  },
  quickActionDivider: {
    width: 1,
    backgroundColor: COLORS.gray200,
    marginVertical: verticalScale(8),
  },
  quickActionText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: COLORS.gray700,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(12),
    marginTop: verticalScale(-12),
    marginBottom: verticalScale(16),
    gap: scale(8),
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    padding: scale(12),
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  statValue: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: COLORS.gray900,
  },
  statLabel: {
    fontSize: moderateScale(11),
    color: COLORS.gray500,
    marginTop: verticalScale(2),
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: scale(16),
    borderRadius: moderateScale(12),
    padding: scale(4),
    marginBottom: verticalScale(16),
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(10),
    gap: scale(6),
  },
  tabActive: {
    backgroundColor: COLORS.primary + '10',
  },
  tabText: {
    fontSize: moderateScale(13),
    fontWeight: '500',
    color: COLORS.gray500,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Tab Content
  tabContent: {
    paddingHorizontal: scale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: verticalScale(12),
  },

  // Bio Section
  bioSection: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    padding: scale(16),
    marginBottom: verticalScale(16),
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  bioText: {
    color: COLORS.gray600,
    lineHeight: 22,
  },

  // Services
  servicesSection: {
    marginBottom: verticalScale(16),
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(14),
    padding: scale(14),
    marginBottom: verticalScale(10),
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  serviceIconBg: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceContent: {
    flex: 1,
    marginLeft: scale(12),
  },
  serviceName: {
    color: COLORS.gray900,
    marginBottom: verticalScale(2),
  },
  serviceDescription: {
    color: COLORS.gray500,
    fontSize: moderateScale(12),
  },

  // Reviews
  ratingSummaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    padding: scale(20),
    marginBottom: verticalScale(16),
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  ratingBig: {
    alignItems: 'center',
  },
  ratingBigNumber: {
    fontSize: moderateScale(48),
    fontWeight: '700',
    color: COLORS.gray900,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    gap: scale(4),
    marginTop: verticalScale(4),
  },
  totalReviewsText: {
    fontSize: moderateScale(14),
    color: COLORS.gray500,
    marginTop: verticalScale(8),
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(14),
    padding: scale(16),
    marginBottom: verticalScale(12),
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(10),
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
  },
  reviewerAvatarPlaceholder: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerInitial: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: COLORS.white,
  },
  reviewerDetails: {
    marginLeft: scale(10),
  },
  reviewerName: {
    color: COLORS.gray900,
  },
  reviewDate: {
    color: COLORS.gray500,
    fontSize: moderateScale(12),
    marginTop: verticalScale(2),
  },
  ratingStars: {
    flexDirection: 'row',
    gap: scale(2),
  },
  reviewComment: {
    color: COLORS.gray700,
    fontSize: moderateScale(14),
    lineHeight: moderateScale(22),
    marginTop: verticalScale(8),
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    alignSelf: 'flex-start',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(8),
    marginTop: verticalScale(10),
    gap: scale(4),
  },
  serviceBadgeText: {
    fontSize: moderateScale(11),
    color: COLORS.primary,
    fontWeight: '500',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(14),
    gap: scale(6),
  },
  loadMoreText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Contact
  contactCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    marginBottom: verticalScale(16),
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
  },
  contactIconBg: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: scale(14),
  },
  contactLabel: {
    color: COLORS.gray500,
    fontSize: moderateScale(12),
  },
  contactValue: {
    color: COLORS.gray900,
    marginTop: verticalScale(2),
  },
  contactDivider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginHorizontal: scale(16),
  },
  actionButtons: {
    flexDirection: 'row',
    gap: scale(12),
  },
  callButton: {
    flex: 1,
    borderRadius: moderateScale(14),
    overflow: 'hidden',
  },
  callButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(14),
    gap: scale(8),
  },
  callButtonText: {
    color: COLORS.white,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  whatsappButton: {
    flex: 1,
    borderRadius: moderateScale(14),
    borderWidth: 2,
    borderColor: '#25D366',
    overflow: 'hidden',
  },
  whatsappButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    gap: scale(8),
  },
  whatsappButtonText: {
    color: '#25D366',
    fontSize: moderateScale(15),
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: verticalScale(40),
  },
  emptyStateText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: COLORS.gray500,
    marginTop: verticalScale(12),
  },
  emptyStateSubtext: {
    fontSize: moderateScale(13),
    color: COLORS.gray400,
    marginTop: verticalScale(4),
  },

  // Loading Skeleton
  skeletonContainer: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  skeletonHeader: {
    height: verticalScale(280),
    borderBottomLeftRadius: moderateScale(32),
    borderBottomRightRadius: moderateScale(32),
  },
  skeletonContent: {
    padding: scale(16),
    marginTop: verticalScale(-20),
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: verticalScale(16),
  },
  skeletonStatCard: {
    flex: 1,
    height: verticalScale(90),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
  },
  skeletonTabs: {
    height: verticalScale(48),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(16),
  },
  skeletonCard: {
    height: verticalScale(120),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    marginBottom: verticalScale(12),
  },

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(24),
  },
  errorHeader: {
    paddingTop: verticalScale(50),
    paddingHorizontal: scale(16),
  },
  errorBackButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    color: COLORS.gray900,
    marginTop: verticalScale(16),
    textAlign: 'center',
  },
  errorMessage: {
    color: COLORS.gray500,
    marginTop: verticalScale(8),
    textAlign: 'center',
  },
  retryButton: {
    marginTop: verticalScale(24),
    borderRadius: moderateScale(12),
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    gap: scale(8),
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },

  bottomSpacer: {
    height: verticalScale(32),
  },
});
