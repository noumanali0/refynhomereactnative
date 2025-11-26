// app/(vendor)/(history)/index.tsx
/**
 * Service History Screen
 *
 * Displays vendor's service history with filtering by status,
 * date range selection, and detailed job information.
 */

import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native';
import Text from '@/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { HistoryCard } from '@/components/vendor/HistoryCard';
import { COLORS } from '@/constants/colors';

type FilterType = 'all' | 'completed' | 'cancelled' | 'confirmed' | 'pending';

export default function HistoryScreen() {
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    // Get vendor bookings from Redux
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const allBookings = useSelector((state: RootState) => state.booking.bookings);

    // Filter bookings for current vendor
    const vendorBookings = useMemo(() => {
        return allBookings.filter(b => b.vendorId === currentUser?.uid);
    }, [allBookings, currentUser]);

    // Calculate stats
    const stats = useMemo(() => {
        const completed = vendorBookings.filter(b => b.status === 'completed').length;
        const thisMonth = vendorBookings.filter(b => {
            const bookingDate = new Date(b.createdAt);
            const now = new Date();
            return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear();
        }).length;

        return {
            totalCompleted: completed,
            thisMonth,
            totalEarnings: completed * 1200, // Mock calculation
        };
    }, [vendorBookings]);

    // Filter bookings based on active filter
    const filteredBookings = useMemo(() => {
        if (activeFilter === 'all') return vendorBookings;
        return vendorBookings.filter(b => b.status === activeFilter);
    }, [vendorBookings, activeFilter]);

    // Sort by date (most recent first)
    const sortedBookings = useMemo(() => {
        return [...filteredBookings].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [filteredBookings]);

    // Get count for each filter
    const getFilterCount = (filter: FilterType): number => {
        if (filter === 'all') return vendorBookings.length;
        return vendorBookings.filter(b => b.status === filter).length;
    };

    // Handle refresh
    const onRefresh = async () => {
        setRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
    };

    // Render filter tab
    const renderFilterTab = (filter: FilterType, label: string, icon: string, color: string) => {
        console.log("🚀 ~ renderFilterTab ~ label:", label)
        const isActive = activeFilter === filter;
        const count = getFilterCount(filter);

        return (
            <TouchableOpacity
                key={filter}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setActiveFilter(filter)}
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
                    onPress={() => setActiveFilter('all')}
                >
                    <Text type="button" style={styles.clearFilterText}>View All History</Text>
                </TouchableOpacity>
            )}
        </View>
    );

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
                {renderFilterTab('confirmed', 'Confirmed', 'time', COLORS.info)}
                {renderFilterTab('pending', 'Pending', 'hourglass', COLORS.warning)}
                {renderFilterTab('cancelled', 'Cancelled', 'close-circle', COLORS.error)}
            </ScrollView>

            {/* History List */}
            <FlatList
                data={sortedBookings}
                renderItem={({ item }) => (
                    <HistoryCard
                        booking={item}
                        onPress={(id) => console.log('View booking:', id)}
                        showRating={item.status === 'completed'}
                    />
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            />
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
    filterTabsContainer: { minHeight: verticalScale(90) },
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
});
