// app/(customer)/(favorites)/index.tsx
/**
 * Favorite Vendors Screen
 *
 * Displays customer's favorite vendors list.
 * Integrated with backend API for real data.
 */

import React, { useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/hooks/useAppDispatch';
import Text from '@/components/common/Text';
import { COLORS } from '@/constants/colors';
import { router } from 'expo-router';
import type { AppDispatch } from '@/store';
import {
    fetchFavoriteVendors,
    removeFromFavorites,
    selectFavoriteVendors,
    selectIsAddingFavorite,
} from '@/store/slices/vendorSlice';
import type { FavoriteVendor } from '@/services/favoriteService';

export default function Favorites() {
    const dispatch = useDispatch<AppDispatch>();

    // Get favorites from Redux
    const favoriteVendors = useAppSelector(selectFavoriteVendors);
    const isLoadingFavorites = useAppSelector((state) => state.vendor.isLoadingFavorites);
    const isRemovingFavorite = useAppSelector(selectIsAddingFavorite);

    // Fetch favorites on mount
    useEffect(() => {
        dispatch(fetchFavoriteVendors());
    }, [dispatch]);

    // Handle refresh
    const onRefresh = useCallback(() => {
        dispatch(fetchFavoriteVendors());
    }, [dispatch]);

    // Handle remove from favorites
    const handleRemoveFavorite = useCallback((vendorId: number) => {
        dispatch(removeFromFavorites(vendorId));
    }, [dispatch]);

    // Render vendor card
    const renderVendorCard = ({ item }: { item: FavoriteVendor }) => (
        <TouchableOpacity
            style={styles.vendorCard}
            activeOpacity={0.7}
            onPress={() => router.push({
                pathname: '/(customer)/(favorites)/vendor-detail',
                params: { vendorId: item.vendor_id.toString() }
            })}
        >
            <View style={styles.vendorCardContent}>
                {/* Vendor Avatar */}
                <View style={styles.avatarContainer}>
                    {item.vendor.profile_photo_url ? (
                        <Image
                            source={{ uri: item.vendor.profile_photo_url }}
                            style={styles.vendorAvatar}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={28} color={COLORS.gray400} />
                        </View>
                    )}
                    {item.vendor.verified && (
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        </View>
                    )}
                </View>

                {/* Vendor Info */}
                <View style={styles.vendorInfo}>
                    <Text type="bodySemiBold" style={styles.vendorName}>
                        {item.vendor.full_name}
                    </Text>

                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color={COLORS.warning} />
                        <Text type="body2" style={styles.ratingText}>
                            {item.vendor.average_rating.toFixed(1)}
                        </Text>
                        <Text type="caption" style={styles.reviewCount}>
                            ({item.vendor.total_reviews} reviews)
                        </Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="briefcase-outline" size={14} color={COLORS.gray500} />
                            <Text type="caption" style={styles.statText}>
                                {item.vendor.completed_jobs} jobs
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="location-outline" size={14} color={COLORS.gray500} />
                            <Text type="caption" style={styles.statText}>
                                {item.vendor.service_radius_km}km radius
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Remove Button */}
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveFavorite(item.vendor_id)}
                    disabled={isRemovingFavorite}
                >
                    <Ionicons name="heart" size={24} color={COLORS.error} />
                </TouchableOpacity>
            </View>

            {/* Added Date */}
            <View style={styles.addedDateRow}>
                <Ionicons name="time-outline" size={12} color={COLORS.gray400} />
                <Text type="caption" style={styles.addedDateText}>
                    Added {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                    })}
                </Text>
            </View>
        </TouchableOpacity>
    );

    // Render empty state
    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="heart-outline" size={64} color={COLORS.gray400} />
            </View>
            <Text type="title" style={styles.emptyTitle}>No Favorite Vendors</Text>
            <Text type="body2" style={styles.emptyMessage}>
                Save your favorite vendors here for quick access.{'\n'}
                Start browsing to add your first favorite!
            </Text>
            <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/(customer)/(home)')}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={[COLORS.primary, COLORS.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.browseButtonGradient}
                >
                    <Ionicons name="search" size={18} color={COLORS.white} />
                    <Text type="button" style={styles.browseButtonText}>Browse Vendors</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header with Gradient */}
            <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Ionicons name="heart" size={28} color={COLORS.white} />
                    <Text type="title" style={styles.headerTitle}>Favorite Vendors</Text>
                </View>
                {favoriteVendors.length > 0 && (
                    <Text type="subtitle" style={styles.headerSubtitle}>
                        {favoriteVendors.length} saved vendor{favoriteVendors.length !== 1 ? 's' : ''}
                    </Text>
                )}
            </LinearGradient>

            {/* Content */}
            <View style={styles.content}>
                {isLoadingFavorites && favoriteVendors.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text type="body2" style={styles.loadingText}>Loading favorites...</Text>
                    </View>
                ) : favoriteVendors.length > 0 ? (
                    <FlatList<FavoriteVendor>
                        data={favoriteVendors}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderVendorCard}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={isLoadingFavorites}
                                onRefresh={onRefresh}
                                colors={[COLORS.primary]}
                                tintColor={COLORS.primary}
                            />
                        }
                    />
                ) : (
                    renderEmptyState()
                )}
            </View>
        </View>
    );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.gray50,
    },
    header: {
        paddingTop: verticalScale(60),
        paddingBottom: verticalScale(24),
        paddingHorizontal: scale(16),
        borderBottomLeftRadius: moderateScale(24),
        borderBottomRightRadius: moderateScale(24),
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        marginBottom: verticalScale(8),
    },
    headerTitle: {
        fontSize: moderateScale(28),
        color: COLORS.white,
    },
    headerSubtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
    },
    content: {
        flex: 1,
    },
    listContent: {
        padding: scale(16),
        paddingBottom: verticalScale(80),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: verticalScale(60),
    },
    loadingText: {
        marginTop: verticalScale(12),
        color: COLORS.gray500,
    },

    // Vendor Card
    vendorCard: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        padding: scale(16),
        marginBottom: verticalScale(12),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    vendorCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    vendorAvatar: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(30),
        backgroundColor: COLORS.gray100,
    },
    avatarPlaceholder: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(30),
        backgroundColor: COLORS.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(10),
        padding: 2,
    },
    vendorInfo: {
        flex: 1,
        marginLeft: scale(12),
    },
    vendorName: {
        fontSize: moderateScale(16),
        color: COLORS.gray900,
        marginBottom: verticalScale(4),
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        marginBottom: verticalScale(4),
    },
    ratingText: {
        color: COLORS.gray900,
        fontWeight: '600',
    },
    reviewCount: {
        color: COLORS.gray500,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
    },
    statText: {
        color: COLORS.gray500,
    },
    removeButton: {
        padding: scale(8),
    },
    addedDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        marginTop: verticalScale(12),
        paddingTop: verticalScale(12),
        borderTopWidth: 1,
        borderTopColor: COLORS.gray100,
    },
    addedDateText: {
        color: COLORS.gray400,
    },

    // Empty State
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(32),
        paddingVertical: verticalScale(60),
    },
    emptyIconContainer: {
        width: moderateScale(120),
        height: moderateScale(120),
        borderRadius: moderateScale(60),
        backgroundColor: COLORS.gray100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(24),
    },
    emptyTitle: {
        fontSize: moderateScale(22),
        color: COLORS.gray900,
        marginBottom: verticalScale(12),
        textAlign: 'center',
    },
    emptyMessage: {
        color: COLORS.gray600,
        textAlign: 'center',
        lineHeight: moderateScale(22),
        marginBottom: verticalScale(32),
    },
    browseButton: {
        borderRadius: moderateScale(12),
        overflow: 'hidden',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    browseButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(32),
    },
    browseButtonText: {
        color: COLORS.white,
    },
});
