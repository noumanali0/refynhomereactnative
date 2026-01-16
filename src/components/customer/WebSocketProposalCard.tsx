// src/components/customer/WebSocketProposalCard.tsx
/**
 * Proposal Card Component for Customer View
 *
 * Displays vendor proposals received via WebSocket with accept/decline actions.
 */

import React, { memo, useMemo, useEffect, useRef, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Animated, Alert, Image } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import type { SocketProposal } from '@/types/socket';
import type { AppDispatch, RootState } from '@/store';
import { acceptProposal, declineProposal, selectIsPending } from '@/store/slices/dispatchSlice';
import { COLORS } from '@/constants/colors';

interface Props {
    proposal: SocketProposal;
    isNew?: boolean;
}

const WebSocketProposalCardInner = ({ proposal, isNew = false }: Props) => {
    const dispatch = useDispatch<AppDispatch>();

    // Check pending states
    const isAccepting = useSelector((state: RootState) =>
        selectIsPending(state, `accept_${proposal.id}`)
    );
    const isDeclining = useSelector((state: RootState) =>
        selectIsPending(state, `decline_${proposal.id}`)
    );

    // Calculate time remaining for acceptance
    const [timeLeft, setTimeLeft] = React.useState(proposal.remaining_expiry_time);
    const [imageLoadError, setImageLoadError] = React.useState(false);

    // Sync timeLeft with remaining_expiry_time when it changes
    useEffect(() => {
        setTimeLeft(proposal.remaining_expiry_time);
    }, [proposal.remaining_expiry_time]);

    // Reset image error when vendor photo URL changes
    useEffect(() => {
        setImageLoadError(false);
    }, [proposal?.vendor?.profile_photo_url]);

    // Timer effect - only runs when status changes
    useEffect(() => {
        if (proposal.status !== 'pending') return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [proposal.status]);

    // Animation refs
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(1)).current;

    // Derived values
    const isUrgent = timeLeft <= 10 && proposal.status === 'pending';
    const progress = timeLeft / 30; // 30 second acceptance window

    // Format price
    const priceText = useMemo(() => {
        if (!proposal.price_quote) return 'To be discussed';
        return `PKR ${proposal.price_quote.toLocaleString()}`;
    }, [proposal.price_quote]);

    // Format ETA
    const etaText = useMemo(() => {
        if (!proposal.eta_minutes) return 'ASAP';
        if (proposal.eta_minutes < 60) return `${proposal.eta_minutes} min`;
        const hours = Math.floor(proposal.eta_minutes / 60);
        const mins = proposal.eta_minutes % 60;
        return `${hours}h ${mins}m`;
    }, [proposal.eta_minutes]);

    // Pulse animation for urgent proposals - with proper cleanup to prevent memory leak
    useEffect(() => {
        let animationRef: Animated.CompositeAnimation | null = null;

        if (isUrgent) {
            animationRef = Animated.loop(
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
            );
            animationRef.start();
        } else {
            pulseAnim.setValue(1);
        }

        // CRITICAL: Stop animation on cleanup to prevent CPU spike on low-end devices
        return () => {
            if (animationRef) {
                animationRef.stop();
            }
            pulseAnim.setValue(1);
        };
    }, [isUrgent, pulseAnim]);

    // Progress bar animation
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [progress, progressAnim]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    // Handle accept
    const handleAccept = useCallback(async () => {
        try {
            await dispatch(acceptProposal(proposal.id)).unwrap();
            // Success handled by Redux state update
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to accept proposal');
        }
    }, [dispatch, proposal.id]);

    // Handle decline
    const handleDecline = useCallback(() => {
        Alert.alert(
            'Decline Proposal',
            'Are you sure you want to decline this proposal?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dispatch(declineProposal(proposal.id)).unwrap();
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'Failed to decline proposal');
                        }
                    },
                },
            ]
        );
    }, [dispatch, proposal.id]);

    // Get status badge
    const getStatusBadge = () => {
        switch (proposal.status) {
            case 'accepted':
                return { color: COLORS.success, text: 'Accepted', icon: 'checkmark-circle' };
            case 'declined':
                return { color: COLORS.error, text: 'Declined', icon: 'close-circle' };
            case 'expired':
                return { color: COLORS.gray500, text: 'Expired', icon: 'time' };
            case 'withdrawn':
                return { color: COLORS.warning, text: 'Withdrawn', icon: 'remove-circle' };
            default:
                return null;
        }
    };

    const statusBadge = getStatusBadge();
    const isPending = proposal.status === 'pending';

    return (
        <Reanimated.View entering={isNew ? FadeInDown.duration(400).springify() : undefined}>
            <Animated.View
                style={[
                    styles.card,
                    isUrgent && { transform: [{ scale: pulseAnim }] },
                ]}
            >
                {/* Timer Progress Bar (only for pending) */}
                {isPending && (
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

                {/* Header with Vendor Info */}
                <View style={styles.header}>
                    <View style={styles.vendorInfo}>
                        {/* Vendor Avatar */}
                        <View style={styles.avatarContainer}>
                            {proposal?.vendor?.profile_photo_url && !imageLoadError ? (
                                <Image
                                    source={{ uri: proposal?.vendor?.profile_photo_url }}
                                    style={styles.avatar}
                                    onError={() => setImageLoadError(true)}
                                />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="person" size={moderateScale(24)} color={COLORS.white} />
                                </View>
                            )}
                            {proposal?.vendor?.verified && (
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark" size={10} color={COLORS.white} />
                                </View>
                            )}
                        </View>

                        {/* Vendor Details */}
                        <View style={styles.vendorDetails}>
                            <Text style={styles.vendorName}>{proposal?.vendor?.full_name || 'Vendor'}</Text>
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={14} color={COLORS.warning} />
                                <Text style={styles.ratingText}>
                                    {/* Use category-specific rating if available, fallback to overall */}
                                    {(proposal?.vendor?.category_average_rating ?? proposal?.vendor?.average_rating)?.toFixed(1) || '0.0'}
                                </Text>
                                <Text style={styles.reviewsText}>
                                    {/* Use category-specific reviews if available, fallback to overall */}
                                    ({proposal?.vendor?.category_total_reviews ?? proposal?.vendor?.total_reviews ?? 0} reviews)
                                </Text>
                            </View>
                            <Text style={styles.jobsText}>
                                {/* Use category-specific jobs if available, fallback to overall */}
                                {proposal?.vendor?.category_completed_jobs ?? proposal?.vendor?.completed_jobs ?? 0} jobs completed
                            </Text>
                        </View>
                    </View>

                    {/* Timer or Status Badge */}
                    {isPending ? (
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
                            <Text style={styles.timerText}>{timeLeft}s</Text>
                        </View>
                    ) : statusBadge ? (
                        <View style={[styles.statusBadge, { backgroundColor: statusBadge.color + '20' }]}>
                            <Ionicons name={statusBadge.icon as any} size={14} color={statusBadge.color} />
                            <Text style={[styles.statusText, { color: statusBadge.color }]}>
                                {statusBadge.text}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Message */}
                {proposal.message && (
                    <View style={styles.messageContainer}>
                        <Ionicons name="chatbubble-outline" size={14} color={COLORS.gray500} />
                        <Text style={styles.messageText} numberOfLines={2}>
                            "{proposal.message}"
                        </Text>
                    </View>
                )}

                {/* Price and ETA Row */}
                <View style={styles.metricsContainer}>
                    <View style={styles.metricBox}>
                        <Ionicons name="cash-outline" size={18} color={COLORS.success} />
                        <View style={styles.metricContent}>
                            <Text style={styles.metricLabel}>Price Quote</Text>
                            <Text style={styles.priceValue}>{priceText}</Text>
                        </View>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricBox}>
                        <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                        <View style={styles.metricContent}>
                            <Text style={styles.metricLabel}>Arrival</Text>
                            <Text style={styles.metricValue}>{etaText}</Text>
                        </View>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricBox}>
                        <Ionicons name="navigate-outline" size={18} color={COLORS.accent} />
                        <View style={styles.metricContent}>
                            <Text style={styles.metricLabel}>Distance</Text>
                            <Text style={styles.metricValue}>{proposal?.vendor?.distance_km?.toFixed(1) || '0.0'} km</Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons (only for pending) */}
                {isPending && timeLeft > 0 && (
                    <View style={styles.actionContainer}>
                        <TouchableOpacity
                            style={styles.declineButton}
                            onPress={handleDecline}
                            disabled={isDeclining || isAccepting}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close" size={20} color={COLORS.error} />
                            <Text style={styles.declineText}>Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.acceptButton, (isAccepting || isDeclining) && styles.buttonDisabled]}
                            onPress={handleAccept}
                            disabled={isDeclining || isAccepting}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[COLORS.success, '#059669']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.acceptGradient}
                            >
                                {isAccepting ? (
                                    <Text style={styles.acceptText}>Accepting...</Text>
                                ) : (
                                    <>
                                        <Ionicons name="checkmark" size={20} color={COLORS.white} />
                                        <Text style={styles.acceptText}>Accept</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}

                {/* New Indicator */}
                {isNew && (
                    <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                )}
            </Animated.View>
        </Reanimated.View>
    );
};

const arePropsEqual = (prevProps: Props, nextProps: Props) => {
    // PERFORMANCE: Only re-render if these specific props change
    // This prevents unnecessary re-renders when vendor location updates
    return (
        prevProps.proposal.id === nextProps.proposal.id &&
        prevProps.proposal.status === nextProps.proposal.status &&
        prevProps.proposal.remaining_expiry_time === nextProps.proposal.remaining_expiry_time &&
        prevProps.isNew === nextProps.isNew &&
        // Also check vendor distance to prevent jerk when vendor moves
        prevProps.proposal.vendor?.distance_km === nextProps.proposal.vendor?.distance_km &&
        prevProps.proposal.eta_minutes === nextProps.proposal.eta_minutes &&
        prevProps.proposal.message === nextProps.proposal.message
    );
};

export const WebSocketProposalCard = memo(WebSocketProposalCardInner, arePropsEqual);

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
        alignItems: 'flex-start',
        padding: scale(16),
        paddingBottom: verticalScale(12),
    },
    vendorInfo: {
        flexDirection: 'row',
        flex: 1,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: moderateScale(50),
        height: moderateScale(50),
        borderRadius: moderateScale(25),
    },
    avatarPlaceholder: {
        width: moderateScale(50),
        height: moderateScale(50),
        borderRadius: moderateScale(25),
        backgroundColor: COLORS.gray400,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: COLORS.primary,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.success,
        width: moderateScale(18),
        height: moderateScale(18),
        borderRadius: moderateScale(9),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    vendorDetails: {
        marginLeft: scale(12),
        flex: 1,
    },
    vendorName: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: COLORS.gray900,
        marginBottom: verticalScale(4),
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        marginBottom: verticalScale(2),
    },
    ratingText: {
        fontSize: moderateScale(13),
        fontWeight: '600',
        color: COLORS.gray800,
    },
    reviewsText: {
        fontSize: moderateScale(12),
        color: COLORS.gray500,
    },
    jobsText: {
        fontSize: moderateScale(12),
        color: COLORS.gray500,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.success,
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(5),
        borderRadius: moderateScale(16),
        gap: scale(4),
    },
    timerBadgeUrgent: {
        backgroundColor: COLORS.error,
    },
    timerText: {
        fontSize: moderateScale(12),
        fontWeight: '700',
        color: COLORS.white,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(5),
        borderRadius: moderateScale(16),
        gap: scale(4),
    },
    statusText: {
        fontSize: moderateScale(12),
        fontWeight: '600',
    },
    messageContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: scale(16),
        paddingBottom: verticalScale(12),
        gap: scale(8),
    },
    messageText: {
        flex: 1,
        fontSize: moderateScale(13),
        color: COLORS.gray600,
        fontStyle: 'italic',
        lineHeight: moderateScale(18),
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
        marginHorizontal: scale(6),
    },
    metricContent: {
        flex: 1,
    },
    metricLabel: {
        fontSize: moderateScale(9),
        color: COLORS.gray500,
        fontWeight: '500',
    },
    metricValue: {
        fontSize: moderateScale(11),
        fontWeight: '700',
        color: COLORS.gray900,
        marginTop: verticalScale(1),
    },
    priceValue: {
        fontSize: moderateScale(11),
        fontWeight: '700',
        color: COLORS.success,
        marginTop: verticalScale(1),
    },
    actionContainer: {
        flexDirection: 'row',
        // padding: scale(16),
        paddingTop: verticalScale(12),
        // gap: scale(16),
        backgroundColor:"green"
    },
    declineButton: {
        // flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(10),
        paddingHorizontal: scale(12),
        borderRadius: moderateScale(10),
        borderWidth: 1.5,
        borderColor: COLORS.error,
        // gap: scale(6),
    },
    declineText: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: COLORS.error,
    },
    acceptButton: {
        // flex: 1,
        borderRadius: moderateScale(10),
        overflow: 'hidden',
        // shadowColor: COLORS.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    acceptGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(10),
        paddingHorizontal: scale(12),
        gap: scale(6),
    },
    acceptText: {
        fontSize: moderateScale(14),
        fontWeight: '700',
        color: COLORS.white,
    },
    newBadge: {
        position: 'absolute',
        top: verticalScale(12),
        right: scale(12),
        backgroundColor: COLORS.accent,
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(12),
        shadowColor: COLORS.accent,
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

export default WebSocketProposalCard;
