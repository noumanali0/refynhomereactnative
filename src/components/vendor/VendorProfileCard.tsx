import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Star, MapPin, CheckCircle, Award } from 'lucide-react-native';

interface VendorProfileCardProps {
    vendor: {
        avatar: string;
        name: string;
        city: string;
        rating: number;
        reviewCount: number;
        jobsCompleted: number;
        isVerified: boolean;
        isGold: boolean;
        isOnline: boolean;
    };
    onToggleAvailability: () => void;
}

export const VendorProfileCard: React.FC<VendorProfileCardProps> = ({
    vendor,
    onToggleAvailability,
}) => {
    return (
        <View style={styles.card}>
            {/* Header Row */}
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Image source={{ uri: vendor.avatar }} style={styles.avatar} />
                    <View style={[styles.onlineIndicator, vendor.isOnline && styles.onlineActive]} />
                </View>

                <View style={styles.headerInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{vendor.name}</Text>
                        {vendor.isVerified && (
                            <View style={styles.badge}>
                                <CheckCircle size={12} color="#2563EB" />
                                <Text style={styles.badgeText}>Verified</Text>
                            </View>
                        )}
                        {vendor.isGold && (
                            <View style={[styles.badge, styles.goldBadge]}>
                                <Award size={12} color="#F59E0B" />
                                <Text style={styles.goldBadgeText}>Gold</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.ratingRow}>
                        <Star size={14} color="#F59E0B" fill="#F59E0B" />
                        <Text style={styles.rating}>{vendor.rating.toFixed(1)}</Text>
                        <Text style={styles.reviewCount}>({vendor.reviewCount} reviews)</Text>
                    </View>

                    <View style={styles.locationRow}>
                        <MapPin size={14} color="#6B7280" />
                        <Text style={styles.location}>{vendor.city}</Text>
                        <Text style={styles.separator}>•</Text>
                        <Text style={styles.jobsCompleted}>{vendor.jobsCompleted} jobs completed</Text>
                    </View>
                </View>
            </View>

            {/* Availability Toggle */}
            <TouchableOpacity
                style={styles.toggleButton}
                onPress={onToggleAvailability}
                activeOpacity={0.7}
            >
                <Text style={styles.toggleLabel}>Availability:</Text>
                <View style={[styles.toggle, vendor.isOnline && styles.toggleActive]}>
                    <View style={[styles.toggleThumb, vendor.isOnline && styles.toggleThumbActive]} />
                </View>
                <Text style={[styles.toggleStatus, vendor.isOnline && styles.toggleStatusActive]}>
                    {vendor.isOnline ? 'Online' : 'Offline'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#E5E7EB',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#9CA3AF',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    onlineActive: {
        backgroundColor: '#10B981',
    },
    headerInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginRight: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        marginRight: 6,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2563EB',
        marginLeft: 3,
    },
    goldBadge: {
        backgroundColor: '#FEF3C7',
    },
    goldBadgeText: {
        color: '#F59E0B',
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 3,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    rating: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginLeft: 4,
    },
    reviewCount: {
        fontSize: 13,
        color: '#6B7280',
        marginLeft: 4,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    location: {
        fontSize: 13,
        color: '#6B7280',
        marginLeft: 4,
    },
    separator: {
        fontSize: 13,
        color: '#D1D5DB',
        marginHorizontal: 6,
    },
    jobsCompleted: {
        fontSize: 13,
        color: '#6B7280',
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginRight: 12,
    },
    toggle: {
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#D1D5DB',
        padding: 2,
        justifyContent: 'center',
    },
    toggleActive: {
        backgroundColor: '#2563EB',
    },
    toggleThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
    },
    toggleThumbActive: {
        transform: [{ translateX: 20 }],
    },
    toggleStatus: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginLeft: 8,
    },
    toggleStatusActive: {
        color: '#2563EB',
    },
});