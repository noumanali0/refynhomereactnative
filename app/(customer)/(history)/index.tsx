// app/(customer)/(history)/index.tsx
/**
 * Customer Service History Screen
 *
 * Displays customer's service request history with filtering by status,
 * date range selection, and detailed service information.
 */

import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native';
import Text from '@/components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { ServiceCard } from '@/components/customer/ServiceCard';
import { COLORS } from '@/constants/colors';
import { mockActiveServices } from '@/mock/services';

type FilterType = 'all' | 'active' | 'completed' | 'cancelled';

export default function CustomerHistoryScreen() {
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    // Mock data - replace with actual data from Redux/API
    const allServices = mockActiveServices;

    // Calculate stats
    const stats = useMemo(() => {
        const active = allServices.filter(s => s.status === 'active' || s.status === 'pending').length;
        const completed = allServices.filter(s => s.status === 'completed').length;
        const thisMonth = allServices.filter(s => {
            // Mock: In real app, check createdAt date
            return true;
        }).length;

        return {
            totalActive: active,
            totalCompleted: completed,
            thisMonth,
        };
    }, [allServices]);

    // Filter services based on active filter
    const filteredServices = useMemo(() => {
        if (activeFilter === 'all') return allServices;
        if (activeFilter === 'active') {
            return allServices.filter(s => s.status === 'active' || s.status === 'pending');
        }
        return allServices.filter(s => s.status === activeFilter);
    }, [allServices, activeFilter]);

    // Sort by date (most recent first)
    const sortedServices = useMemo(() => {
        return [...filteredServices].sort((a, b) => {
            // Mock: In real app, sort by actual date
            return 0;
        });
    }, [filteredServices]);

    // Get count for each filter
    const getFilterCount = (filter: FilterType): number => {
        if (filter === 'all') return allServices.length;
        if (filter === 'active') {
            return allServices.filter(s => s.status === 'active' || s.status === 'pending').length;
        }
        return allServices.filter(s => s.status === filter).length;
    };

    // Handle refresh
    const onRefresh = async () => {
        setRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
    };

    // Render filter tab
    const renderFilterTab = (filter: FilterType, label: string, icon: string, color: string) => {
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
            >
                {renderFilterTab('all', 'All', 'list', COLORS.gray700)}
                {renderFilterTab('active', 'Active', 'time', COLORS.warning)}
                {renderFilterTab('completed', 'Completed', 'checkmark-circle', COLORS.success)}
                {renderFilterTab('cancelled', 'Cancelled', 'close-circle', COLORS.error)}
            </ScrollView>

            {/* History List */}
            <FlatList
                data={sortedServices}
                renderItem={({ item }) => (
                    <ServiceCard service={item} vendorOffer={{}} />
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
});
