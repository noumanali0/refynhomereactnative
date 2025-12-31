// app/(customer)/(history)/index.tsx
/**
 * Customer Service History Screen
 *
 * Displays customer's service request history with filtering by status,
 * date range selection, and detailed service information.
 * Integrated with backend API for real data.
 */

import React, { useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import Text from '@/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { ServiceHistoryCard } from '@/components/customer/ServiceHistoryCard';
import { COLORS } from '@/constants/colors';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '@/store';
import {
    fetchServiceHistory,
    refreshServiceHistory,
    loadMoreHistory,
    setFilter,
    selectFilteredHistory,
    selectHistoryStats,
    selectIsLoading,
    selectIsRefreshing,
    selectHistoryError,
    selectCurrentFilter,
    selectHasMore,
    selectCurrentPage,
    selectTotalCount,
    selectIsLoadingMore,
} from '@/store/slices/serviceHistorySlice';

type FilterType = 'all' | 'active' | 'completed' | 'cancelled';

export default function CustomerHistoryScreen() {
    const dispatch = useDispatch<AppDispatch>();

    // Redux state
    const filteredServices = useSelector(selectFilteredHistory);
    const stats = useSelector(selectHistoryStats);
    const isLoading = useSelector(selectIsLoading);
    const isLoadingMore = useSelector(selectIsLoadingMore);  // From Redux now
    const isRefreshing = useSelector(selectIsRefreshing);
    const error = useSelector(selectHistoryError);
    const activeFilter = useSelector(selectCurrentFilter);
    const hasMore = useSelector(selectHasMore);
    const currentPage = useSelector(selectCurrentPage);
    const totalCount = useSelector(selectTotalCount);

    // Fetch data on mount
    useEffect(() => {
        dispatch(fetchServiceHistory());
    }, [dispatch]);

    // Handle filter change
    const handleFilterChange = useCallback((filter: FilterType) => {
        dispatch(setFilter(filter));
    }, [dispatch]);

    // Handle refresh
    const onRefresh = useCallback(() => {
        dispatch(refreshServiceHistory());
    }, [dispatch]);

    // Handle load more (pagination)
    const handleLoadMore = useCallback(() => {
        // Only load if: not already loading, not refreshing, has more data
        if (isLoadingMore || isLoading || isRefreshing || !hasMore) return;

        dispatch(loadMoreHistory(currentPage + 1));
    }, [dispatch, currentPage, hasMore, isLoadingMore, isLoading, isRefreshing]);

    // Get count for each filter
    const getFilterCount = (filter: FilterType): number => {
        if (filter === 'all') return stats.total;
        if (filter === 'active') return stats.active;
        if (filter === 'completed') return stats.completed;
        if (filter === 'cancelled') return stats.cancelled;
        return 0;
    };

    // Render filter tab
    const renderFilterTab = (filter: FilterType, label: string, icon: string, color: string) => {
        const isActive = activeFilter === filter;
        const count = getFilterCount(filter);

        return (
            <TouchableOpacity
                key={filter}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => handleFilterChange(filter)}
                activeOpacity={0.7}
            >
                <View style={[styles.filterIcon, isActive && { backgroundColor: color + '20' }]}>
                    <Ionicons name={icon as any} size={18} color={isActive ? color : COLORS.gray500} />
                </View>
                <View style={styles.filterTextContainer}>
                    <Text type="subtitle2" style={[styles.filterLabel, isActive && { color }]}>{label}</Text>
                    <Text type="body2" style={[styles.filterCount, isActive && { color }]}>({count})</Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Render footer with loading indicator or total count
    const renderFooter = useCallback(() => {
        if (isLoadingMore) {
            return (
                <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.footerLoaderText}>Loading more...</Text>
                </View>
            );
        }

        // Show total count when all data is loaded
        if (!hasMore && filteredServices.length > 0 && totalCount > 0) {
            return (
                <View style={styles.footerLoader}>
                    <Text style={styles.footerLoaderText}>
                        Showing all {filteredServices.length} of {totalCount} records
                    </Text>
                </View>
            );
        }

        return null;
    }, [isLoadingMore, hasMore, filteredServices.length, totalCount]);

    // Render empty state
    const renderEmptyState = useCallback(() => {
        if (isLoading) {
            return (
                <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading your service history...</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="alert-circle-outline" size={60} color={COLORS.error} />
                    </View>
                    <Text type="title" style={styles.emptyTitle}>Error Loading History</Text>
                    <Text type="body2" style={styles.emptyMessage}>{error}</Text>
                    <TouchableOpacity
                        style={styles.clearFilterButton}
                        onPress={() => dispatch(fetchServiceHistory())}
                    >
                        <Text type="button" style={styles.clearFilterText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                    <Ionicons name="document-text-outline" size={60} color={COLORS.gray400} />
                </View>
                <Text type="title" style={styles.emptyTitle}>No Service History</Text>
                <Text type="body2" style={styles.emptyMessage}>
                    {activeFilter === 'all'
                        ? 'Start requesting services to build your history.'
                        : `No ${activeFilter} services found.\nTry a different filter.`}
                </Text>
                {activeFilter !== 'all' && (
                    <TouchableOpacity
                        style={styles.clearFilterButton}
                        onPress={() => handleFilterChange('all')}
                    >
                        <Text type="button" style={styles.clearFilterText}>View All History</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }, [isLoading, error, activeFilter, handleFilterChange, dispatch]);

    return (
        <View style={styles.container}>
            {/* Header with Stats */}
            <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Text type="title" style={styles.headerTitle}>Service History</Text>
                <Text type="subtitle" style={styles.headerSubtitle}>Track all your service requests</Text>

                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <Ionicons name="time" size={20} color={COLORS.warning} />
                        </View>
                        <View style={styles.statTextContainer}>
                            <Text type="bodySemiBold" style={styles.statValue}>{stats.totalActive}</Text>
                            <Text type="caption" style={styles.statLabel}>Active</Text>
                        </View>
                    </View>

                    <View style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <Ionicons name="checkmark-done" size={20} color={COLORS.success} />
                        </View>
                        <View style={styles.statTextContainer}>
                            <Text type="bodySemiBold" style={styles.statValue}>{stats.totalCompleted}</Text>
                            <Text type="caption" style={styles.statLabel}>Completed</Text>
                        </View>
                    </View>

                    <View style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <Ionicons name="calendar" size={20} color={COLORS.info} />
                        </View>
                        <View style={styles.statTextContainer}>
                            <Text type="bodySemiBold" style={styles.statValue}>{stats.thisMonth}</Text>
                            <Text type="caption" style={styles.statLabel}>This Month</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Filter Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterTabs}
                style={styles.filterTabsContainer}
                scrollEventThrottle={16}
            >
                {renderFilterTab('all', 'All', 'list', COLORS.gray700)}
                {/* {renderFilterTab('active', 'Active', 'time', COLORS.warning)} */}
                {/* {renderFilterTab('completed', 'Completed', 'checkmark-circle', COLORS.success)} */}
                {/* {renderFilterTab('cancelled', 'Cancelled', 'close-circle', COLORS.error)} */}
            </ScrollView>

            {/* History List - Optimized for low-end devices */}
            <FlatList
                data={filteredServices}
                renderItem={({ item }) => (
                    <ServiceHistoryCard request={item} disablePress />
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmptyState}
                ListFooterComponent={renderFooter}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        colors={[COLORS.primary]}
                        tintColor={COLORS.primary}
                    />
                }
                // Pagination
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                showsVerticalScrollIndicator={false}
                // Performance optimizations for low-end devices
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={3}
                removeClippedSubviews={Platform.OS !== 'web'}
                updateCellsBatchingPeriod={100}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.gray50 },
    header: {
        paddingTop: verticalScale(20),
        paddingBottom: verticalScale(24),
        paddingHorizontal: scale(16),
        borderBottomLeftRadius: moderateScale(24),
        borderBottomRightRadius: moderateScale(24),
    },
    headerTitle: { fontSize: moderateScale(28), color: COLORS.white, marginBottom: verticalScale(4) },
    headerSubtitle: { color: 'rgba(255,255,255,0.9)', marginBottom: verticalScale(20) },
    statsContainer: { flexDirection: 'row', gap: scale(12) },
    statCard: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: moderateScale(12),
        padding: scale(12),
        gap: scale(8),
        minHeight: verticalScale(85),
    },
    statIconContainer: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statTextContainer: { alignItems: 'center', gap: verticalScale(2) },
    statValue: { fontSize: moderateScale(16), color: COLORS.white, marginBottom: verticalScale(2) },
    statLabel: { fontSize: moderateScale(10), color: 'rgba(255, 255, 255, 0.8)' },
    filterTabsContainer: { minHeight: verticalScale(80) },
    filterTabs: { paddingHorizontal: scale(16), paddingVertical: verticalScale(16), gap: scale(10) },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(10),
        borderRadius: moderateScale(20),
        backgroundColor: COLORS.white,
        borderWidth: 1.5,
        borderColor: COLORS.gray200,
    },
    filterTabActive: { borderColor: 'transparent', shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    filterIcon: { width: moderateScale(30), height: moderateScale(30), borderRadius: moderateScale(15), backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center' },
    filterTextContainer: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
    filterLabel: { color: COLORS.gray900 },
    filterCount: { color: COLORS.gray500 },
    listContent: { paddingHorizontal: scale(16), paddingTop: verticalScale(8), paddingBottom: verticalScale(80) },
    emptyState: { alignItems: 'center', paddingVertical: verticalScale(60), paddingHorizontal: scale(32) },
    emptyIconContainer: { width: moderateScale(120), height: moderateScale(120), borderRadius: moderateScale(60), backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center', marginBottom: verticalScale(20) },
    emptyTitle: { fontSize: moderateScale(22), color: COLORS.gray900, marginBottom: verticalScale(8), textAlign: 'center' },
    emptyMessage: { color: COLORS.gray600, textAlign: 'center', lineHeight: moderateScale(20) },
    clearFilterButton: { marginTop: verticalScale(20), paddingVertical: verticalScale(10), paddingHorizontal: scale(20), backgroundColor: COLORS.primary, borderRadius: moderateScale(10) },
    clearFilterText: { color: COLORS.white },
    loadingState: { alignItems: 'center', paddingVertical: verticalScale(80), paddingHorizontal: scale(32) },
    loadingText: { color: COLORS.gray600, marginTop: verticalScale(16), fontSize: moderateScale(14) },
    footerLoader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(20),
        gap: scale(12),
    },
    footerLoaderText: {
        color: COLORS.gray600,
        fontSize: moderateScale(14),
    },
});
