import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useAppSelector } from '@/hooks/useAppDispatch';
import Text from '@/components/common/Text';
import { VendorCard } from '@/components/common/VendorCard';
import { COLORS } from '@/constants/colors';
import { router } from 'expo-router';

export default function Favorites() {
    const { vendors, favoriteVendorIds } = useAppSelector((state) => state.vendor);
    const favoriteVendors = vendors;
    // const favoriteVendors = vendors.filter((v) => favoriteVendorIds.includes(v.id));
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        // Add your refresh logic here
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
    };

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

            {/* Vendors List */}
            <View style={styles.content}>
                {favoriteVendors.length > 0 ? (
                    <FlatList
                        data={favoriteVendors}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <VendorCard vendor={item} />}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
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
