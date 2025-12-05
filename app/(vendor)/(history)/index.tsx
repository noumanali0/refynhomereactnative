// app/(vendor)/(history)/index.tsx
/**
 * Service History Screen
 *
 * Displays vendor's service history with filtering by status.
 * Integrated with backend API for real data.
 */

import React, { useMemo, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import Text from '@/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { COLORS } from '@/constants/colors';
import {
    fetchVendorHistory,
    refreshVendorHistory,
    loadMoreVendorHistory,
    setFilter,
    selectFilteredVendorHistory,
    selectVendorHistoryLoading,
    selectVendorHistoryRefreshing,
    selectVendorHistoryFilter,
    selectVendorHistoryHasMore,
    selectVendorHistoryPage,
    selectVendorHistory,
} from '@/store/slices/vendorHistorySlice';
import type { VendorHistoryJob } from '@/services/vendorHistoryService';

type FilterType = 'all' | 'completed' | 'cancelled';

export default function HistoryScreen() {
    const dispatch = useDispatch<AppDispatch>();

    // Get vendor history from Redux
    const jobs = useSelector(selectVendorHistory);
    const filteredJobs = useSelector(selectFilteredVendorHistory);
    const isLoading = useSelector(selectVendorHistoryLoading);
    const isRefreshing = useSelector(selectVendorHistoryRefreshing);
    const activeFilter = useSelector(selectVendorHistoryFilter);
    const hasMore = useSelector(selectVendorHistoryHasMore);
    const currentPage = useSelector(selectVendorHistoryPage);

    // Fetch history on mount
    useEffect(() => {
        dispatch(fetchVendorHistory({ page: 1, page_size: 20 }));
    }, [dispatch]);

    // Calculate stats from real data
    const stats = useMemo(() => {
        const completed = jobs.filter(j => j.status === 'completed').length;
        const now = new Date();
        const thisMonth = jobs.filter(j => {
            if (j.status !== 'completed') return false;
            const jobDate = new Date(j.completed_at || j.created_at);
            return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
        }).length;
        const totalEarnings = jobs
            .filter(j => j.status === 'completed')
            .reduce((sum, j) => sum + (j.price_quote || 0), 0);

        return {
            totalCompleted: completed,
            thisMonth,
            totalEarnings,
        };
    }, [jobs]);

    // Sort by date (most recent first)
    const sortedJobs = useMemo(() => {
        return [...filteredJobs].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }, [filteredJobs]);

    // Get count for each filter
    const getFilterCount = (filter: FilterType): number => {
        if (filter === 'all') return jobs.length;
        return jobs.filter(j => j.status === filter).length;
    };

    // Handle filter change
    const handleFilterChange = useCallback((filter: FilterType) => {
        dispatch(setFilter(filter));
        dispatch(fetchVendorHistory({
            page: 1,
            page_size: 20,
            status: filter === 'all' ? undefined : filter,
        }));
    }, [dispatch]);

    // Handle refresh
    const onRefresh = useCallback(() => {
        dispatch(refreshVendorHistory(activeFilter));
    }, [dispatch, activeFilter]);

    // Handle load more
    const onEndReached = useCallback(() => {
        if (!isLoading && hasMore) {
            dispatch(loadMoreVendorHistory({ page: currentPage + 1, filter: activeFilter }));
        }
    }, [dispatch, isLoading, hasMore, currentPage, activeFilter]);

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

    // Render job card
    const renderJobCard = ({ item }: { item: VendorHistoryJob }) => (
        <TouchableOpacity
            style={styles.jobCard}
            activeOpacity={0.7}
            onPress={() => console.log('View job:', item.id)}
        >
            <View style={styles.jobCardHeader}>
                <View style={styles.categoryBadge}>
                    <Ionicons name="construct" size={16} color={COLORS.primary} />
                    <Text type="body2" style={styles.categoryText}>{item.category?.name || 'Service'}</Text>
                </View>
                <View style={[
                    styles.statusBadge,
                    item.status === 'completed' && styles.statusCompleted,
                    item.status === 'cancelled' && styles.statusCancelled,
                ]}>
                    <Text type="caption" style={styles.statusText}>
                        {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Unknown'}
                    </Text>
                </View>
            </View>

            <Text type="bodySemiBold" style={styles.jobTitle}>{item.problem_title || 'Service Request'}</Text>

            <View style={styles.jobDetails}>
                <View style={styles.jobDetailRow}>
                    <Ionicons name="person-outline" size={16} color={COLORS.gray500} />
                    <Text type="body2" style={styles.jobDetailText}>
                        {item.customer?.full_name || 'Customer'}
                    </Text>
                </View>
                <View style={styles.jobDetailRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.gray500} />
                    <Text type="body2" style={styles.jobDetailText} numberOfLines={1}>
                        {item.address_line}
                    </Text>
                </View>
                <View style={styles.jobDetailRow}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.gray500} />
                    <Text type="body2" style={styles.jobDetailText}>
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        })}
                    </Text>
                </View>
            </View>

            {item.price_quote && (
                <View style={styles.priceRow}>
                    <Text type="body2" style={styles.priceLabel}>Earned</Text>
                    <Text type="bodySemiBold" style={styles.priceValue}>
                        Rs. {item.price_quote.toLocaleString()}
                    </Text>
                </View>
            )}

            {item.review && (
                <View style={styles.reviewRow}>
                    <View style={styles.ratingStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons
                                key={star}
                                name={star <= item.review!.stars ? 'star' : 'star-outline'}
                                size={14}
                                color={star <= item.review!.stars ? COLORS.warning : COLORS.gray300}
                            />
                        ))}
                    </View>
                    {item.review.feedback && (
                        <Text type="caption" style={styles.reviewText} numberOfLines={1}>
                            "{item.review.feedback}"
                        </Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );

    // Render empty state
    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="briefcase-outline" size={60} color={COLORS.gray400} />
            </View>
            <Text type="title" style={styles.emptyTitle}>No Service History</Text>
            <Text type="body2" style={styles.emptyMessage}>
                {activeFilter === 'all'
                    ? 'Start accepting and completing requests to build your service history.'
                    : `No ${activeFilter} jobs found.\nTry a different filter.`}
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

    // Render footer loading
    const renderFooter = () => {
        if (!isLoading || !hasMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
        );
    };

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
                <Text type="subtitle" style={styles.headerSubtitle}>Track your completed jobs</Text>

                {/* Stats Cards */}
                <View style={styles.statsContainer}>
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

                    <View style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <Ionicons name="cash" size={20} color={COLORS.warning} />
                        </View>
                        <View style={styles.statTextContainer}>
                            <Text type="bodySemiBold" style={styles.statValue}>Rs. {stats.totalEarnings.toLocaleString()}</Text>
                            <Text type="caption" style={styles.statLabel}>Earned</Text>
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
            >
                {renderFilterTab('all', 'All', 'list', COLORS.gray700)}
                {renderFilterTab('completed', 'Completed', 'checkmark-circle', COLORS.success)}
                {renderFilterTab('cancelled', 'Cancelled', 'close-circle', COLORS.error)}
            </ScrollView>

            {/* Initial Loading */}
            {isLoading && jobs.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text type="body2" style={styles.loadingText}>Loading history...</Text>
                </View>
            ) : (
                /* History List */
                <FlatList
                    data={sortedJobs}
                    renderItem={renderJobCard}
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
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.5}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.gray50 },
    header: {
        paddingTop: verticalScale(60),
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
    filterTabsContainer: { minHeight: verticalScale(70) },
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
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: verticalScale(60) },
    loadingText: { marginTop: verticalScale(12), color: COLORS.gray500 },
    footerLoader: { paddingVertical: verticalScale(20), alignItems: 'center' },

    // Job Card Styles
    jobCard: {
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
    jobCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(8),
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        backgroundColor: COLORS.primary + '10',
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(8),
    },
    categoryText: { color: COLORS.primary },
    statusBadge: {
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(8),
        backgroundColor: COLORS.gray100,
    },
    statusCompleted: { backgroundColor: COLORS.success + '15' },
    statusCancelled: { backgroundColor: COLORS.error + '15' },
    statusText: { color: COLORS.gray700, fontSize: moderateScale(11) },
    jobTitle: { fontSize: moderateScale(16), color: COLORS.gray900, marginBottom: verticalScale(12) },
    jobDetails: { gap: verticalScale(6), marginBottom: verticalScale(12) },
    jobDetailRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
    jobDetailText: { color: COLORS.gray600, flex: 1 },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: verticalScale(12),
        borderTopWidth: 1,
        borderTopColor: COLORS.gray100,
    },
    priceLabel: { color: COLORS.gray500 },
    priceValue: { color: COLORS.success, fontSize: moderateScale(16) },
    reviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        marginTop: verticalScale(8),
        paddingTop: verticalScale(8),
        borderTopWidth: 1,
        borderTopColor: COLORS.gray100,
    },
    ratingStars: { flexDirection: 'row', gap: scale(2) },
    reviewText: { color: COLORS.gray500, flex: 1, fontStyle: 'italic' },

    // Empty State
    emptyState: { alignItems: 'center', paddingVertical: verticalScale(60), paddingHorizontal: scale(32) },
    emptyIconContainer: { width: moderateScale(120), height: moderateScale(120), borderRadius: moderateScale(60), backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center', marginBottom: verticalScale(20) },
    emptyTitle: { fontSize: moderateScale(22), color: COLORS.gray900, marginBottom: verticalScale(8), textAlign: 'center' },
    emptyMessage: { color: COLORS.gray600, textAlign: 'center', lineHeight: moderateScale(20) },
    clearFilterButton: { marginTop: verticalScale(20), paddingVertical: verticalScale(10), paddingHorizontal: scale(20), backgroundColor: COLORS.primary, borderRadius: moderateScale(10) },
    clearFilterText: { color: COLORS.white },
});
