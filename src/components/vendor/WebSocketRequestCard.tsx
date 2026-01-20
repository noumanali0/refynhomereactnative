// src/components/vendor/WebSocketRequestCard.tsx
/**
 * Request Card Component for WebSocket Service Requests
 *
 * This component displays service requests received via WebSocket,
 * using the SocketServiceRequest type from the backend.
 */

import React, { memo, useMemo, useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Animated } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { LinearGradient } from 'expo-linear-gradient';
import type { SocketServiceRequest } from '@/types/socket';
import { COLORS } from '@/constants/colors';
import { formatCountdownTime } from '@/utils/dateFormatters';

interface Props {
    request: SocketServiceRequest;
    onPress: (id: number) => void;
    isNew?: boolean;
}

const WebSocketRequestCardInner = ({ request, onPress, isNew = false }: Props) => {
    console.log("🚀 ~ WebSocketRequestCardInner ~ request:", request)

    // Calculate time remaining from absolute expiry time
    const [timeLeft, setTimeLeft] = React.useState(() => {
        const expiresAt = new Date(request.expires_at).getTime();
        const now = Date.now();
        return Math.max(0, Math.floor((expiresAt - now) / 1000));
    });

    // Timer effect - calculate from absolute time for accuracy
    useEffect(() => {
        const calculateTimeLeft = () => {
            const expiresAt = new Date(request.expires_at).getTime();
            const now = Date.now();
            return Math.max(0, Math.floor((expiresAt - now) / 1000));
        };

        // Set initial value
        setTimeLeft(calculateTimeLeft());

        const interval = setInterval(() => {
            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);
        }, 1000);

        return () => clearInterval(interval);
    }, [request.expires_at]); // Only depend on expires_at, not remaining_expiry_time

    // Animation refs
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(1)).current;

    // Derived values
    const isUrgent = timeLeft <= 30;
    const totalDuration = useMemo(() => {
        // Estimate total duration from expires_at and created_at
        const expiresAt = new Date(request.expires_at).getTime();
        const createdAt = new Date(request.created_at).getTime();
        return Math.max(60, (expiresAt - createdAt) / 1000); // At least 60 seconds
    }, [request.expires_at, request.created_at]);

    const progress = timeLeft / totalDuration;

    // Format distance with null guards
    const distanceText = useMemo(() => {
        if (!request.distance_km && request.distance_km !== 0) {
            return 'N/A';
        }
        if (request.distance_km < 1) {
            return `${Math.round(request.distance_km * 1000)}m`;
        }
        return `${request.distance_km.toFixed(1)} km`;
    }, [request.distance_km]);

    // Format ETA with null guards
    const etaText = useMemo(() => {
        if (!request.eta_minutes && request.eta_minutes !== 0) {
            return 'N/A';
        }
        if (request.eta_minutes < 60) {
            return `${request.eta_minutes} min`;
        }
        const hours = Math.floor(request.eta_minutes / 60);
        const mins = request.eta_minutes % 60;
        return `${hours}h ${mins}m`;
    }, [request.eta_minutes]);

    // Determine if proposal is accepted using multiple conditions
    // This handles real-time updates similar to websocket-request-details.tsx
    const isAccepted = useMemo(() => {
        // 1. Check vendor_status directly (from sync or update events)
        if (request?.vendor_status === 'accepted') return true;
        // 2. Check request status (en_route/in_progress means accepted)
        if (request?.status === 'en_route' || request?.status === 'in_progress') return true;
        return false;
    }, [request?.vendor_status, request?.status]);

    // Get status badge color
    const getStatusColor = () => {
        if (isAccepted) return COLORS.success;
        switch (request.vendor_status) {
            case 'pending':
                return COLORS.warning;
            default:
                return COLORS.primary;
        }
    };

    // Pulse animation for urgent requests - stop when accepted
    useEffect(() => {
        if (isAccepted) {
            // Stop all animations when accepted
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
            return;
        }

        if (isUrgent) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.02,
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
        } else {
            pulseAnim.setValue(1);
        }
    }, [isUrgent, isAccepted, pulseAnim]);

    // Progress bar animation - stop when accepted
    useEffect(() => {
        if (isAccepted) {
            // Set progress to full when accepted
            progressAnim.setValue(1);
            return;
        }

        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [progress, isAccepted, progressAnim]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <Reanimated.View entering={isNew ? FadeInDown.duration(400).springify() : undefined}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(request.id)}>
                <Animated.View
                    style={[
                        styles.card,
                        // Only apply pulse animation when urgent AND not accepted
                        isUrgent && !isAccepted && { transform: [{ scale: pulseAnim }] },
                    ]}
                >
                    {/* Timer Progress Bar - Hide when accepted */}
                    {!isAccepted && (
                        <View style={styles.progressBarContainer}>
                            <Animated.View
                                style={[
                                    styles.progressBar,
                                    {
                                        width: progressWidth,
                                        backgroundColor: isUrgent ? COLORS.error : COLORS.success,
                                    },
                                ]}
                            />
                        </View>
                    )}

                    {/* Header with Category and Timer */}
                    <View style={styles.header}>
                        <View style={styles.serviceInfo}>
                            <View
                                style={[
                                    styles.serviceBadge,
                                    { backgroundColor: COLORS.primary + '20' },
                                ]}
                            >
                                <Ionicons name="construct" size={16} color={COLORS.primary} />
                            </View>
                            <View style={styles.serviceText}>
                                <Text style={styles.serviceType}>{request?.category?.name || 'Service'}</Text>
                                <Text style={styles.issue} numberOfLines={1}>
                                    {request?.problem_title}
                                </Text>
                            </View>
                        </View>
                        {/* Hide timer when proposal is accepted */}
                        {!isAccepted && (
                            <View
                                style={[
                                    styles.timerBadge,
                                    isUrgent && styles.timerBadgeUrgent,
                                ]}
                            >
                                <Ionicons
                                    name={isUrgent ? 'timer' : 'time'}
                                    size={14}
                                    color={COLORS.white}
                                />
                                <Text style={styles.timerText}>{formatCountdownTime(timeLeft)}</Text>
                            </View>
                        )}
                    </View>

                    {/* Customer Information */}
                    <View style={styles.customerSection}>
                        <View style={styles.infoRow}>
                            <View style={styles.iconWrapper}>
                                <Ionicons name="person" size={14} color={COLORS.primary} />
                            </View>
                            <Text style={styles.infoText}>{request?.customer?.name}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <View style={styles.iconWrapper}>
                                <Ionicons name="location" size={14} color={COLORS.accent} />
                            </View>
                            <Text style={styles.infoText} numberOfLines={1}>
                                {request?.address_line}
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
                                <Text style={styles.metricValue}>{etaText}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Vendor Status Badge (if already sent proposal) */}
                    {request?.already_sent && (
                        <View style={styles.statusRow}>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
                                <Ionicons
                                    name={request?.vendor_status === 'accepted' ? 'checkmark-circle' : 'hourglass'}
                                    size={14}
                                    color={getStatusColor()}
                                />
                                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                                    {request?.vendor_status === 'accepted'
                                        ? 'Proposal Accepted'
                                        : 'Proposal Sent'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Footer with CTA - Hide "Send Proposal" when accepted */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.viewButtonFull}
                            onPress={() => onPress(request?.id)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={isAccepted ? [COLORS.success, '#059669'] : [COLORS.primary, COLORS.accent]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.viewButtonGradient}
                            >
                                <Text style={styles.viewButtonText}>
                                    {isAccepted
                                        ? 'View Details'
                                        : request?.already_sent
                                            ? 'View Status'
                                            : 'Send Proposal'}
                                </Text>
                                <Ionicons
                                    name={isAccepted ? 'eye' : 'chevron-forward'}
                                    size={16}
                                    color={COLORS.white}
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* New Request Indicator */}
                    {isNew && (
                        <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                    )}
                </Animated.View>
            </TouchableOpacity>
        </Reanimated.View>
    );
};

const arePropsEqual = (prevProps: Props, nextProps: Props) => {
    return (
        prevProps.request.id === nextProps.request.id &&
        prevProps.request.vendor_status === nextProps.request.vendor_status &&
        prevProps.request.expires_at === nextProps.request.expires_at &&
        prevProps.isNew === nextProps.isNew
    );
};

export const WebSocketRequestCard = memo(WebSocketRequestCardInner, arePropsEqual);

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
    statusRow: {
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(8),
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(6),
        borderRadius: moderateScale(16),
        gap: scale(6),
    },
    statusText: {
        fontSize: moderateScale(12),
        fontWeight: '600',
    },
    footer: {
        padding: scale(16),
        paddingTop: verticalScale(12),
    },
    viewButtonFull: {
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
        justifyContent: 'center',
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(16),
        gap: scale(6),
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

export default WebSocketRequestCard;
