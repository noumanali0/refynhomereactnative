// src/components/common/RequestCard.tsx
import React, { memo, useMemo, useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Animated } from 'react-native';
import { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { LinearGradient } from 'expo-linear-gradient';
import type { Coordinates, LiveRequest, CustomerRequestInfo } from '@/services/types';
import { haversineDistanceKm } from '@/utils/geo';
import { COLORS } from '@/constants/colors';

interface Props {
    request: LiveRequest;
    nowMs: number;
    onPress: (id: string) => void;
    vendorLocation?: Coordinates | null;
}

// Generate mock customer data consistent with request ID
const generateMockCustomerData = (requestId: string): CustomerRequestInfo => {
    const names = ['Ahmed Khan', 'Fatima Ali', 'Hassan Raza', 'Ayesha Malik', 'Usman Tariq', 'Sara Ahmed', 'Bilal Sheikh'];
    const addresses = [
        'House 123, Street 5, DHA Phase 2',
        'Flat 4B, Blue Area Plaza, F-6',
        'Villa 789, Bahria Town Phase 4',
        'Apartment 12C, Centaurus Mall',
        'House 456, G-11 Markaz',
        'Plot 234, Sector F-10',
        'Apartment 5A, Kohsar Complex'
    ];
    const services = ['Plumbing', 'Electrical Work', 'AC Repair', 'Appliance Repair', 'General Maintenance', 'TV Repair', 'Refrigerator Repair'];
    const urgencies: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    const notes = [
        'Please bring necessary tools',
        'Water leakage issue',
        'Urgent - Not working',
        'Prefer morning visit',
        'Multiple items need checking',
        'Experience required',
        'Quick service needed'
    ];

    const hash = requestId.split('_').reduce((acc, part) => acc + part.length, 0);
    const index = hash % names.length;

    return {
        id: requestId,
        name: names[index],
        address: addresses[index],
        serviceRequested: services[index],
        urgencyLevel: urgencies[index % 3],
        preferredTime: 'ASAP',
        additionalNotes: notes[index]
    };
};

const RequestCardInner = ({ request, nowMs, onPress, vendorLocation }: Props) => {
    const timeLeft = Math.max(0, Math.ceil((request.expiresAt - nowMs) / 1000));
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(1)).current;

    const customerData = useMemo(() =>
        generateMockCustomerData(request.id),
        [request.id]
    );

    const { distanceKm, distanceText, eta } = useMemo(() => {
        const lat = vendorLocation?.latitude || 24.8559743;
        const lng = vendorLocation?.longitude || 67.3334962;

        const dist = haversineDistanceKm(
            lat,
            lng,
            request.coordinates.latitude,
            request.coordinates.longitude
        );

        const distKm = dist;
        const distText = dist < 1
            ? `${Math.round(dist * 1000)}m`
            : `${dist.toFixed(1)} km`;

        // Estimate ETA: ~30 km/h average in city
        const estimatedMinutes = Math.round((dist / 30) * 60);
        const etaText = estimatedMinutes < 1
            ? '< 1 min'
            : `${estimatedMinutes} min`;

        return { distanceKm: dist, distanceText: distText, eta: etaText };
    }, [request.coordinates, vendorLocation]);

    const progress = timeLeft / 3000; // Assuming 20s total
    const isUrgent = timeLeft <= 10;

    // Pulse animation for urgent requests
    useEffect(() => {
        if (isUrgent) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [isUrgent]);

    // Progress animation
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    const getUrgencyColor = () => {
        switch (customerData.urgencyLevel) {
            case 'high': return COLORS.error;
            case 'medium': return COLORS.warning;
            case 'low': return COLORS.success;
            default: return COLORS.gray500;
        }
    };

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return (
        <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(request.id)}>
            <Animated.View
                style={[
                    styles.card,
                    isUrgent && { transform: [{ scale: pulseAnim }] }
                ]}
            >
                {/* Timer Progress Bar */}
                <View style={styles.progressBarContainer}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            {
                                width: progressWidth,
                                backgroundColor: isUrgent ? COLORS.error : COLORS.success
                            }
                        ]}
                    />
                </View>

                {/* Header with Service Type and Timer */}
                <View style={styles.header}>
                    <View style={styles.serviceInfo}>
                        <View style={[styles.serviceBadge, { backgroundColor: COLORS.primary + '20' }]}>
                            <Ionicons name="construct" size={16} color={COLORS.primary} />
                        </View>
                        <View style={styles.serviceText}>
                            <Text style={styles.serviceType}>{request.serviceType}</Text>
                            <Text style={styles.issue} numberOfLines={1}>{request.issue}</Text>
                        </View>
                    </View>
                    <View style={[styles.timerBadge, isUrgent && styles.timerBadgeUrgent]}>
                        <Ionicons
                            name={isUrgent ? "timer" : "time"}
                            size={14}
                            color={COLORS.white}
                        />
                        <Text style={styles.timerText}>{timeLeft}s</Text>
                    </View>
                </View>

                {/* Customer Information */}
                <View style={styles.customerSection}>
                    <View style={styles.infoRow}>
                        <View style={styles.iconWrapper}>
                            <Ionicons name="person" size={14} color={COLORS.primary} />
                        </View>
                        <Text style={styles.infoText}>{customerData.name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <View style={styles.iconWrapper}>
                            <Ionicons name="location" size={14} color={COLORS.accent} />
                        </View>
                        <Text style={styles.infoText} numberOfLines={1}>
                            {request.locationLabel}
                        </Text>
                    </View>
                </View>

                {/* Distance and ETA Row */}
                <View style={styles.metricsContainer}>
                    <View style={styles.metricBox}>
                        <Ionicons name="navigate" size={16} color={COLORS.primary} />
                        <View style={styles.metricContent}>
                            <Text style={styles.metricLabel}>Distance</Text>
                            <Text style={styles.metricValue}>{distanceText}</Text>
                        </View>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricBox}>
                        <Ionicons name="time-outline" size={16} color={COLORS.accent} />
                        <View style={styles.metricContent}>
                            <Text style={styles.metricLabel}>ETA</Text>
                            <Text style={styles.metricValue}>{eta}</Text>
                        </View>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricBox}>
                        <Ionicons
                            name="alert-circle"
                            size={16}
                            color={getUrgencyColor()}
                        />
                        <View style={styles.metricContent}>
                            <Text style={styles.metricLabel}>Priority</Text>
                            <Text style={[styles.metricValue, { color: getUrgencyColor() }]}>
                                {customerData.urgencyLevel.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Footer with Price and CTA */}
                <View style={styles.footer}>
                    <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>Visit Charges</Text>
                        <View style={styles.priceRow}>
                            <Text style={styles.currency}>PKR</Text>
                            <Text style={styles.priceAmount}>{request.visitCharges}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => onPress(request.id)}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.viewButtonGradient}
                        >
                            <Text style={styles.viewButtonText}>View Details</Text>
                            <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* New Request Indicator */}
                {timeLeft > 15 && (
                    <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                )}
            </Animated.View>
        </TouchableOpacity>
    );
};

export const RequestCard = memo(RequestCardInner);

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        marginBottom: verticalScale(16),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.gray100,
    },
    progressBarContainer: {
        height: verticalScale(4),
        backgroundColor: COLORS.gray100,
    },
    progressBar: {
        height: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: scale(16),
        paddingBottom: verticalScale(12),
    },
    serviceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    serviceBadge: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        justifyContent: 'center',
        alignItems: 'center',
    },
    serviceText: {
        marginLeft: scale(12),
        flex: 1,
    },
    serviceType: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: COLORS.gray900,
        marginBottom: verticalScale(2),
    },
    issue: {
        fontSize: moderateScale(13),
        color: COLORS.gray600,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.success,
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(6),
        borderRadius: moderateScale(20),
        gap: scale(4),
    },
    timerBadgeUrgent: {
        backgroundColor: COLORS.error,
    },
    timerText: {
        fontSize: moderateScale(13),
        fontWeight: '700',
        color: COLORS.white,
    },
    customerSection: {
        paddingHorizontal: scale(16),
        gap: verticalScale(8),
        marginBottom: verticalScale(12),
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    iconWrapper: {
        width: moderateScale(24),
        height: moderateScale(24),
        borderRadius: moderateScale(12),
        backgroundColor: COLORS.gray50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoText: {
        fontSize: moderateScale(14),
        color: COLORS.gray700,
        fontWeight: '500',
        flex: 1,
    },
    metricsContainer: {
        flexDirection: 'row',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(12),
        backgroundColor: COLORS.gray50,
    },
    metricBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    metricDivider: {
        width: 1,
        backgroundColor: COLORS.gray200,
        marginHorizontal: scale(8),
    },
    metricContent: {
        flex: 1,
    },
    metricLabel: {
        fontSize: moderateScale(10),
        color: COLORS.gray500,
        fontWeight: '500',
    },
    metricValue: {
        fontSize: moderateScale(12),
        fontWeight: '700',
        color: COLORS.gray900,
        marginTop: verticalScale(2),
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: scale(16),
        paddingTop: verticalScale(12),
    },
    priceContainer: {
        flex: 1,
    },
    priceLabel: {
        fontSize: moderateScale(11),
        color: COLORS.gray500,
        fontWeight: '500',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: verticalScale(4),
    },
    currency: {
        fontSize: moderateScale(12),
        color: COLORS.gray600,
        fontWeight: '600',
        marginRight: scale(4),
    },
    priceAmount: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: COLORS.gray900,
    },
    viewButton: {
        borderRadius: moderateScale(10),
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    viewButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: verticalScale(10),
        paddingHorizontal: scale(16),
        gap: scale(4),
    },
    viewButtonText: {
        fontSize: moderateScale(14),
        fontWeight: '700',
        color: COLORS.white,
    },
    newBadge: {
        position: 'absolute',
        top: verticalScale(12),
        right: scale(12),
        backgroundColor: COLORS.success,
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(12),
        shadowColor: COLORS.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 3,
    },
    newBadgeText: {
        fontSize: moderateScale(10),
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: 0.5,
    },
});


// // src/components/RequestCard.tsx
// import React, { memo, useMemo } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// import { MapPin } from 'lucide-react-native';
// // import { LiveRequest } from '@/services/liveRequestsService';
// import { moderateScale } from 'react-native-size-matters';
// import { LiveRequest } from '@/services/liveRequestsServices';

// interface Props {
//     request: LiveRequest;
//     nowMs: number; // pass current timestamp to avoid per-card timers
//     onPress: (id: string) => void;
// }

// export const RequestCard = memo(({ request, nowMs, onPress }: Props) => {
//     const timeLeft = Math.max(0, Math.ceil((request.expiresAt - nowMs) / 1000));

//     const distanceKm = useMemo(() => {
//         // placeholder — if you have vendor coordinates, compute Haversine
//         return (Math.random() * 10).toFixed(1);
//     }, [request.id]);

//     return (
//         <TouchableOpacity style={styles.card} onPress={() => onPress(request.id)} activeOpacity={0.8}>
//             <View style={styles.header}>
//                 <Text style={styles.title}>{request.serviceType}</Text>
//                 <Text style={styles.timer}>{timeLeft}s</Text>
//             </View>

//             <Text style={styles.issue} numberOfLines={2}>{request.issue}</Text>

//             <View style={styles.row}>
//                 <View style={styles.location}>
//                     <MapPin size={14} color="#2563EB" />
//                     <Text style={styles.locationText}>{request.locationLabel} • {distanceKm} km</Text>
//                 </View>

//                 <View style={styles.priceBox}>
//                     <Text style={styles.priceText}>{request.visitCharges} PKR</Text>
//                 </View>
//             </View>
//         </TouchableOpacity>
//     );
// });

// const styles = StyleSheet.create({
//     card: {
//         backgroundColor: '#fff',
//         borderRadius: 12,
//         padding: moderateScale(14),
//         marginBottom: moderateScale(12),
//         borderWidth: 1,
//         borderColor: '#E6EEF9',
//         shadowColor: '#000',
//         shadowOpacity: 0.05,
//         shadowRadius: 8,
//         elevation: 2,
//     },
//     header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
//     title: { fontSize: moderateScale(16), fontWeight: '700', color: '#0f172a' },
//     timer: { fontSize: moderateScale(13), fontWeight: '700', color: '#ef4444' },
//     issue: { color: '#475569', fontSize: moderateScale(14), marginBottom: 12 },
//     row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
//     location: { flexDirection: 'row', alignItems: 'center', gap: 8 },
//     locationText: { marginLeft: 8, color: '#6B7280' },
//     priceBox: { backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
//     priceText: { color: '#0f172a', fontWeight: '700' },
// });
