// LiveOffersScreen.tsx - Optimized WebSocket Integrated Version
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert,
    FlatList,
    Animated,
    Linking,
    AppState,
    AppStateStatus,
} from "react-native";
import MapView, {
    Marker,
    PROVIDER_DEFAULT,
    UrlTile,
    Polyline,
} from "react-native-maps";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { MapPin, X, Navigation } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";

import Text from "@/components/common/Text";
import { SocketStatusIndicator } from "@/components/common/SocketStatusIndicator";
import RatingModal from "@/components/common/RatingModal";
import { COLORS } from "@/constants/colors";
import { serviceRequestApi, type CreateServiceRequestParams } from "@/services/serviceRequestApi";
import type { AppDispatch, RootState } from "@/store";
import type { SocketProposal, Coordinates } from "@/types/socket";
import {
    selectConnectionStatus,
    selectIsConnected,
    selectProposalsByRequestId,
    selectVendorLocation,
    selectCustomerRequests,
    acceptProposal,
    declineProposal,
    connectSocket,
    selectCompletedService,
    clearCompletedService,
} from "@/store/slices/dispatchSlice";
import { clearReviewState } from "@/store/slices/reviewSlice";
import { useVendorProximity } from "@/hooks/useVendorProximity";
import { useRouteTracking } from "@/hooks/useRouteTracking";
import { resetArrivalNotification } from "@/utils/notifications";
import {
    updateCustomerActiveServiceAcceptance,
    clearCustomerActiveService,
    getCancelDisableRemaining,
    CANCEL_DISABLE_DURATION_MS,
} from "@/services/customerActiveServiceService";

// ============================================================================
// Constants
// ============================================================================

const CONSTANTS = {
    /** Distance in meters to consider vendor as "arrived" */
    VENDOR_ARRIVAL_THRESHOLD_M: 100,
    /** Default request timeout in seconds (5 minutes) */
    REQUEST_TIMEOUT_SECONDS: 300,
    /** Map edge padding for fitToCoordinates */
    MAP_EDGE_PADDING: { top: 100, right: 100, bottom: 400, left: 100 },
    /** Map delta for initial region */
    MAP_DELTA: 0.02,
    /** Height of each proposal card for FlatList optimization */
    PROPOSAL_CARD_HEIGHT: 280,
    /** FlatList initial render count */
    FLATLIST_INITIAL_NUM: 3,
    /** FlatList batching period in ms */
    FLATLIST_BATCH_PERIOD: 50,
    /** Proposal timer total seconds */
    PROPOSAL_TIMER_TOTAL: 30,
    /** Urgent threshold for proposal timer */
    PROPOSAL_URGENT_THRESHOLD: 10,
} as const;

const SNAP_POINTS = ["25%", "50%", "85%"];
const SNAP_POINTS_ACCEPTED = ["25%", "45%"];

// ============================================================================
// Proposal Card Component
// ============================================================================

interface ProposalCardProps {
    proposal: SocketProposal;
    onAccept: (id: number) => void;
    onDecline: (id: number) => void;
    isAccepting: boolean;
    isDeclining: boolean;
}

const ProposalCard = React.memo(({
    proposal,
    onAccept,
    onDecline,
    isAccepting,
    isDeclining,
}: ProposalCardProps) => {
    const [timeLeft, setTimeLeft] = useState(proposal.remaining_expiry_time);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(1)).current;
    const isMountedRef = useRef(true);

    const isUrgent = timeLeft <= CONSTANTS.PROPOSAL_URGENT_THRESHOLD && proposal.status === 'pending';
    const isPending = proposal.status === 'pending';
    const progress = timeLeft / CONSTANTS.PROPOSAL_TIMER_TOTAL;

    // Track mounted state for safe state updates
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Timer effect with mounted check
    useEffect(() => {
        setTimeLeft(proposal.remaining_expiry_time);
        if (proposal.status !== 'pending') return;

        const interval = setInterval(() => {
            if (isMountedRef.current) {
                setTimeLeft((prev) => Math.max(0, prev - 1));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [proposal.remaining_expiry_time, proposal.status]);

    // Pulse animation
    useEffect(() => {
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
    }, [isUrgent, pulseAnim]);

    // Progress animation
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

    const priceText = useMemo(() => {
        if (!proposal.price_quote) return 'To be discussed';
        return `PKR ${proposal.price_quote.toLocaleString()}`;
    }, [proposal.price_quote]);

    const etaText = useMemo(() => {
        if (!proposal.eta_minutes) return 'ASAP';
        if (proposal.eta_minutes < 60) return `${proposal.eta_minutes} min`;
        const hours = Math.floor(proposal.eta_minutes / 60);
        const mins = proposal.eta_minutes % 60;
        return `${hours}h ${mins}m`;
    }, [proposal.eta_minutes]);

    const handleAccept = useCallback(() => {
        onAccept(proposal.id);
    }, [onAccept, proposal.id]);

    const handleDecline = useCallback(() => {
        Alert.alert(
            'Decline Proposal',
            'Are you sure you want to decline this proposal?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: () => onDecline(proposal.id),
                },
            ]
        );
    }, [onDecline, proposal.id]);

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

    return (
        <Animated.View
            style={[
                styles.proposalCard,
                isUrgent && { transform: [{ scale: pulseAnim }] },
            ]}
        >
            {/* Progress Bar */}
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

            {/* Header */}
            <View style={styles.proposalHeader}>
                <View style={styles.vendorInfo}>
                    <View style={styles.avatarContainer}>
                        {proposal.vendor?.profile_photo_url ? (
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {proposal.vendor.full_name?.charAt(0)?.toUpperCase() || 'V'}
                                </Text>
                            </View>
                        ) : (
                            <LinearGradient
                                colors={[COLORS.primary, COLORS.accent]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.avatar}
                            >
                                <Text style={styles.avatarTextWhite}>
                                    {proposal.vendor?.full_name?.charAt(0)?.toUpperCase() || 'V'}
                                </Text>
                            </LinearGradient>
                        )}
                        {proposal.vendor?.verified && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark" size={10} color={COLORS.white} />
                            </View>
                        )}
                    </View>

                    <View style={styles.vendorDetails}>
                        <Text type="subtitle" style={styles.vendorName}>
                            {proposal.vendor?.full_name || 'Vendor'}
                        </Text>
                        <View style={styles.ratingRow}>
                            <Ionicons name="star" size={14} color={COLORS.warning} />
                            <Text style={styles.ratingText}>
                                {proposal.vendor?.average_rating?.toFixed(1) || '0.0'}
                            </Text>
                            <Text style={styles.reviewsText}>
                                ({proposal.vendor?.total_reviews || 0} reviews)
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Timer or Status Badge */}
                {isPending ? (
                    <View style={[styles.timerBadge, isUrgent && styles.timerBadgeUrgent]}>
                        <Ionicons name={isUrgent ? 'timer' : 'time'} size={14} color={COLORS.white} />
                        <Text style={styles.proposalTimerText}>{timeLeft}s</Text>
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
            {proposal.message ? (
                <View style={styles.messageContainer}>
                    <Ionicons name="chatbubble-outline" size={14} color={COLORS.gray500} />
                    <Text style={styles.messageText} numberOfLines={2}>
                        "{proposal.message}"
                    </Text>
                </View>
            ) : null}

            {/* Metrics */}
            <View style={styles.metricsContainer}>
                <View style={styles.metricBox}>
                    <Ionicons name="cash-outline" size={18} color={COLORS.success} />
                    <View style={styles.metricContent}>
                        <Text style={styles.metricLabel}>Price</Text>
                        <Text style={styles.priceValue}>{priceText}</Text>
                    </View>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricBox}>
                    <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                    <View style={styles.metricContent}>
                        <Text style={styles.metricLabel}>ETA</Text>
                        <Text style={styles.metricValue}>{etaText}</Text>
                    </View>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricBox}>
                    <Ionicons name="navigate-outline" size={18} color={COLORS.accent} />
                    <View style={styles.metricContent}>
                        <Text style={styles.metricLabel}>Distance</Text>
                        <Text style={styles.metricValue}>
                            {proposal.vendor?.distance_km?.toFixed(1) || '0.0'} km
                        </Text>
                    </View>
                </View>
            </View>

            {/* Actions */}
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
                                <ActivityIndicator size="small" color={COLORS.white} />
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
        </Animated.View>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.proposal.id === nextProps.proposal.id &&
        prevProps.proposal.status === nextProps.proposal.status &&
        prevProps.proposal.remaining_expiry_time === nextProps.proposal.remaining_expiry_time &&
        prevProps.isAccepting === nextProps.isAccepting &&
        prevProps.isDeclining === nextProps.isDeclining
    );
});

// ============================================================================
// Main Component
// ============================================================================

export default function LiveOffersScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        requestId?: string;
        latitude?: string;
        longitude?: string;
        address?: string;
    }>();
    const dispatch = useDispatch<AppDispatch>();
    const mapRef = useRef<MapView | null>(null);
    const bottomSheetRef = useRef<BottomSheet | null>(null);

    // Redux state
    const connectionStatus = useSelector(selectConnectionStatus);
    const isConnected = useSelector(selectIsConnected);
    const customerRequests = useSelector(selectCustomerRequests);
    const vendorLocation = useSelector(selectVendorLocation);
    console.log("🚀 ~ LiveOffersScreen ~ vendorLocation:", vendorLocation)
    const completedService = useSelector(selectCompletedService);

    // Get current request and its proposals
    const requestId = params.requestId ? parseInt(params.requestId, 10) : null;
    const currentRequest = useMemo(() => {
        if (requestId) {
            return customerRequests.find(r => r?.id === requestId);
        }
        return customerRequests[0];
    }, [customerRequests, requestId]);

    // Use requestId directly from params OR from currentRequest
    const effectiveRequestId = requestId || currentRequest?.id;

    const proposals = useSelector((state: RootState) =>
        effectiveRequestId ? selectProposalsByRequestId(state, effectiveRequestId) : []
    );

    // Filter active proposals (pending or accepted)
    const activeProposals = useMemo(() => {
        return proposals.filter(p => p.status === 'pending' || p.status === 'accepted');
    }, [proposals]);

    const acceptedProposal = useMemo(() => {
        return proposals.find(p => p.status === 'accepted');
    }, [proposals]);

    // Local state
    const [acceptingId, setAcceptingId] = useState<number | null>(null);
    const [decliningId, setDecliningId] = useState<number | null>(null);

    // Request expiry timer state
    const [requestTimeLeft, setRequestTimeLeft] = useState<number>(CONSTANTS.REQUEST_TIMEOUT_SECONDS);
    const [requestExpired, setRequestExpired] = useState<boolean>(false);
    const [isRetrying, setIsRetrying] = useState<boolean>(false);

    // Mounted state ref for main component
    const isMountedRef = useRef(true);

    // Store original request params for retry
    const [originalRequestParams, setOriginalRequestParams] = useState<CreateServiceRequestParams | null>(null);

    // Rating modal state
    const [showRatingModal, setShowRatingModal] = useState(false);

    // Cancel disable state (1 minute after accepting proposal)
    const [cancelDisableTimeLeft, setCancelDisableTimeLeft] = useState<number>(0);
    const [acceptedAt, setAcceptedAt] = useState<number | null>(null);
    const cancelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const backgroundTimeRef = useRef<number | null>(null);

    // Service address coordinates (from params first, then currentRequest)
    const serviceLocation = useMemo<Coordinates | null>(() => {
        // First try from URL params (passed from create screen)
        if (params.latitude && params.longitude) {
            const lat = parseFloat(params.latitude);
            const lng = parseFloat(params.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { latitude: lat, longitude: lng };
            }
        }
        // Fallback to currentRequest
        if (currentRequest?.latitude && currentRequest?.longitude) {
            return {
                latitude: currentRequest.latitude,
                longitude: currentRequest.longitude,
            };
        }
        return null;
    }, [params.latitude, params.longitude, currentRequest?.latitude, currentRequest?.longitude]);

    // Service address text (from params or currentRequest)
    const serviceAddress = params.address || currentRequest?.address_line || 'Service Location';

    // =========================================================================
    // Route Tracking Hook - Uses optimized useRouteTracking
    // =========================================================================
    const handleFirstRouteFetch = useCallback((route: Coordinates[]) => {
        if (route.length > 2) {
            mapRef.current?.fitToCoordinates(route, {
                edgePadding: CONSTANTS.MAP_EDGE_PADDING,
                animated: true,
            });
        }
    }, []);

    const {
        routeCoords,
        isLoading: isRouteLoading,
        refreshRoute,
    } = useRouteTracking({
        vendorLocation,
        serviceLocation,
        enabled: !!acceptedProposal && !!vendorLocation && !!serviceLocation,
        onFirstRouteFetch: handleFirstRouteFetch,
    });

    // Debug: Log vendor location updates
    useEffect(() => {
        if (__DEV__ && vendorLocation) {
            console.log('[LiveOffers] Vendor location updated from Redux:', vendorLocation);
        }
    }, [vendorLocation]);

    // Debug: Log route updates
    useEffect(() => {
        if (__DEV__ && routeCoords.length > 0) {
            console.log('[LiveOffers] Route updated:', routeCoords.length, 'points');
        }
    }, [routeCoords]);

    // Vendor proximity detection (100m arrival notification)
    const { hasArrived: vendorHasArrived, formattedDistance } = useVendorProximity({
        vendorLocation,
        serviceLocation,
        requestId: effectiveRequestId ?? null,
        vendorName: acceptedProposal?.vendor?.full_name || 'Vendor',
        enabled: !!acceptedProposal && !!vendorLocation && !!serviceLocation,
        onArrival: () => {
            console.log('[LiveOffers] Vendor arrived within 100m');
        },
    });

    // Animation for waiting state
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation for waiting state
    useEffect(() => {
        if (activeProposals.length === 0 && !acceptedProposal) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [activeProposals.length, acceptedProposal, pulseAnim]);

    // Store original request params for retry functionality
    useEffect(() => {
        if (currentRequest && !originalRequestParams) {
            setOriginalRequestParams({
                category: currentRequest.category?.id ?? (currentRequest.category as unknown as number),
                problem_title: currentRequest.problem_title,
                description: currentRequest.description,
                address_line: currentRequest.address_line,
                latitude: currentRequest.latitude,
                longitude: currentRequest.longitude,
                location_source: currentRequest.location_source,
                radius_km: currentRequest.radius_km,
            });
        }
    }, [currentRequest, originalRequestParams]);

    // Track mounted state for safe state updates in main component
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // =========================================================================
    // Cancel Disable Timer - 1 minute countdown after accepting proposal
    // =========================================================================

    // Restore cancel timer from persisted storage on mount (for app kill recovery)
    useEffect(() => {
        const restoreCancelTimer = async () => {
            try {
                const remaining = await getCancelDisableRemaining();
                if (remaining > 0 && acceptedProposal) {
                    setCancelDisableTimeLeft(remaining);
                    // Calculate acceptedAt from remaining time
                    const calculatedAcceptedAt = Date.now() - (CANCEL_DISABLE_DURATION_MS - remaining * 1000);
                    setAcceptedAt(calculatedAcceptedAt);
                }
            } catch (error) {
                if (__DEV__) console.error('[LiveOffers] Failed to restore cancel timer:', error);
            }
        };

        if (acceptedProposal) {
            restoreCancelTimer();
        }
    }, [acceptedProposal]);

    // Cancel disable countdown timer
    useEffect(() => {
        if (!acceptedAt || cancelDisableTimeLeft <= 0) return;

        cancelTimerRef.current = setInterval(() => {
            if (!isMountedRef.current) return;

            const elapsed = Date.now() - acceptedAt;
            const remaining = Math.max(0, Math.ceil((CANCEL_DISABLE_DURATION_MS - elapsed) / 1000));

            setCancelDisableTimeLeft(remaining);

            if (remaining <= 0 && cancelTimerRef.current) {
                clearInterval(cancelTimerRef.current);
                cancelTimerRef.current = null;
            }
        }, 1000);

        return () => {
            if (cancelTimerRef.current) {
                clearInterval(cancelTimerRef.current);
                cancelTimerRef.current = null;
            }
        };
    }, [acceptedAt]);

    // Handle AppState changes (background/foreground) for cancel timer
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
                // App came to foreground - recalculate timer from acceptedAt
                if (acceptedAt) {
                    const elapsed = Date.now() - acceptedAt;
                    const remaining = Math.max(0, Math.ceil((CANCEL_DISABLE_DURATION_MS - elapsed) / 1000));
                    setCancelDisableTimeLeft(remaining);
                    if (__DEV__) {
                        console.log('[LiveOffers] Restored cancel timer from background:', remaining, 'seconds');
                    }
                }
            } else if (nextAppState.match(/inactive|background/)) {
                // App going to background - save timestamp
                backgroundTimeRef.current = Date.now();
            }
            appStateRef.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, [acceptedAt]);

    // Clear persisted service on completion
    useEffect(() => {
        if (completedService && completedService.requestId === effectiveRequestId) {
            clearCustomerActiveService().catch(() => { });
        }
    }, [completedService, effectiveRequestId]);

    // Request expiry timer effect with mounted state check
    useEffect(() => {
        // Skip if proposal already accepted
        if (acceptedProposal) return;

        // Get expiry from currentRequest
        if (!currentRequest?.expires_at && !effectiveRequestId) return;

        const calculateTimeLeft = () => {
            if (currentRequest?.expires_at) {
                const expiresAt = new Date(currentRequest.expires_at).getTime();
                return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
            }
            return requestTimeLeft;
        };

        if (isMountedRef.current) {
            setRequestTimeLeft(calculateTimeLeft());
        }

        const interval = setInterval(() => {
            if (!isMountedRef.current) return;

            const remaining = calculateTimeLeft();
            setRequestTimeLeft(remaining);
            if (remaining <= 0 && !acceptedProposal) {
                setRequestExpired(true);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [currentRequest?.expires_at, effectiveRequestId, acceptedProposal]);

    // Connect socket on mount if not connected
    useEffect(() => {
        if (!isConnected && connectionStatus !== 'connecting') {
            dispatch(connectSocket());
        }
    }, [dispatch, isConnected, connectionStatus]);

    // Handle service completion - Show rating modal
    useEffect(() => {
        if (completedService && completedService.requestId === effectiveRequestId) {
            console.log('[LiveOffers] Service completed, showing rating modal');
            setShowRatingModal(true);
        }
    }, [completedService, effectiveRequestId]);

    // Handle rating modal close
    const handleRatingClose = useCallback(() => {
        setShowRatingModal(false);
        dispatch(clearCompletedService());
        dispatch(clearReviewState());
        if (effectiveRequestId) {
            resetArrivalNotification(effectiveRequestId);
        }
        router.replace('/(customer)/(home)/');
    }, [dispatch, effectiveRequestId, router]);

    // Animate map to service location when available
    useEffect(() => {
        if (serviceLocation && !acceptedProposal) {
            mapRef.current?.animateToRegion({
                ...serviceLocation,
                latitudeDelta: CONSTANTS.MAP_DELTA,
                longitudeDelta: CONSTANTS.MAP_DELTA,
            }, 1000);
        }
    }, [serviceLocation, acceptedProposal]);

    // Handlers
    const handleAcceptProposal = useCallback(async (proposalId: number) => {
        try {
            setAcceptingId(proposalId);
            await dispatch(acceptProposal(proposalId)).unwrap();
            bottomSheetRef.current?.snapToIndex(0);

            // Set cancel disable timer (1 minute)
            const now = Date.now();
            setAcceptedAt(now);
            setCancelDisableTimeLeft(Math.ceil(CANCEL_DISABLE_DURATION_MS / 1000));

            // Update persisted service with acceptance data
            // (Service was already persisted when request was created)
            updateCustomerActiveServiceAcceptance(proposalId, now).catch((error) => {
                if (__DEV__) console.error('[LiveOffers] Failed to update acceptance:', error);
            });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to accept proposal. Please try again.';
            Alert.alert('Error', errorMessage);
        } finally {
            setAcceptingId(null);
        }
    }, [dispatch]);

    const handleDeclineProposal = useCallback(async (proposalId: number) => {
        try {
            setDecliningId(proposalId);
            await dispatch(declineProposal(proposalId)).unwrap();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to decline proposal.';
            Alert.alert('Error', errorMessage);
        } finally {
            setDecliningId(null);
        }
    }, [dispatch]);

    const handleCancelRequest = useCallback(() => {
        // Check if cancel is disabled (within 1 minute of accepting)
        if (acceptedProposal && cancelDisableTimeLeft > 0) {
            Alert.alert(
                'Cannot Cancel Yet',
                `Please wait ${cancelDisableTimeLeft} seconds before cancelling. This allows the vendor to prepare for your service.`,
                [{ text: 'OK' }]
            );
            return;
        }

        Alert.alert(
            'Cancel Request',
            'Are you sure you want to cancel this request?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        // Clear persisted active service
                        await clearCustomerActiveService().catch(() => { });
                        router.back();
                    },
                },
            ]
        );
    }, [router, acceptedProposal, cancelDisableTimeLeft]);

    // Handle retry request - create new request with same parameters
    const handleRetryRequest = useCallback(async () => {
        if (!originalRequestParams) {
            Alert.alert('Error', 'Request details not available. Please create a new request.');
            return;
        }

        try {
            setIsRetrying(true);
            // Create new request with same parameters
            const response = await serviceRequestApi.create(originalRequestParams);

            // Reset state for new request
            setRequestExpired(false);
            setRequestTimeLeft(CONSTANTS.REQUEST_TIMEOUT_SECONDS);

            // Navigate to new live-offers screen with new request ID
            router.replace({
                pathname: "/(customer)/(home)/live-offers",
                params: {
                    requestId: response.request.id.toString(),
                    latitude: originalRequestParams.latitude.toString(),
                    longitude: originalRequestParams.longitude.toString(),
                    address: originalRequestParams.address_line,
                },
            });

            Alert.alert('Success', 'Request re-submitted! Finding nearby vendors...');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to retry request';
            Alert.alert('Error', errorMessage);
        } finally {
            setIsRetrying(false);
        }
    }, [originalRequestParams, router]);

    /**
     * Renders map markers
     */
    function renderMarkers(): React.ReactNode {
        if (!serviceLocation) return null;

        return (
            <>
                {/* Service Address marker (destination - where customer wants service) */}
                <Marker
                    key="service-location"
                    coordinate={serviceLocation}
                    title="Service Location"
                    description={serviceAddress}
                >
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.userMarker}
                    >
                        <MapPin size={24} color={COLORS.white} />
                    </LinearGradient>
                </Marker>

                {/* Vendor live location marker (only after acceptance and when vendor shares location) */}
                {acceptedProposal && vendorLocation && (
                    <Marker
                        key={`vendor-${acceptedProposal.id}`}
                        coordinate={vendorLocation}
                        title={acceptedProposal.vendor?.full_name || 'Vendor'}
                        description={vendorHasArrived ? "Vendor has arrived!" : "Vendor is on the way"}
                    >
                        <LinearGradient
                            colors={vendorHasArrived ? [COLORS.success, '#059669'] : [COLORS.warning, '#d97706']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.acceptedVendorMarker}
                        >
                            <Navigation size={24} color={COLORS.white} />
                        </LinearGradient>
                    </Marker>
                )}
            </>
        );
    }

    // Render proposal item
    const renderProposalItem = useCallback(({ item }: { item: SocketProposal }) => (
        <ProposalCard
            proposal={item}
            onAccept={handleAcceptProposal}
            onDecline={handleDeclineProposal}
            isAccepting={acceptingId === item.id}
            isDeclining={decliningId === item.id}
        />
    ), [handleAcceptProposal, handleDeclineProposal, acceptingId, decliningId]);

    const keyExtractor = useCallback((item: SocketProposal) => item.id.toString(), []);

    const getItemLayout = useCallback((_: ArrayLike<SocketProposal> | null | undefined, index: number) => ({
        length: CONSTANTS.PROPOSAL_CARD_HEIGHT,
        offset: CONSTANTS.PROPOSAL_CARD_HEIGHT * index,
        index,
    }), []);

    // Loading state - show while waiting for service location
    if (!serviceLocation) {
        return (
            <View style={styles.centerContainer}>
                <LinearGradient
                    colors={[COLORS.primary, COLORS.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.loadingGradient}
                >
                    <ActivityIndicator size="large" color={COLORS.white} />
                    <Text style={styles.loadingText}>Loading service request...</Text>
                </LinearGradient>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <LinearGradient
                    colors={[COLORS.primary, COLORS.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.header}
                >
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>

                    <View style={styles.headerTitleContainer}>
                        <Text type="subtitle" style={styles.headerTitle}>
                            {currentRequest?.category?.name || 'Service Request'}
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            {currentRequest?.problem_title || 'Finding vendors...'}
                        </Text>
                    </View>

                    <SocketStatusIndicator showLabel={false} size="medium" style={styles.statusIndicator} />
                </LinearGradient>
            </View>

            {/* Map */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={{
                    ...serviceLocation,
                    latitudeDelta: CONSTANTS.MAP_DELTA,
                    longitudeDelta: CONSTANTS.MAP_DELTA,
                }}
            >
                {Platform.OS === "web" && (
                    <UrlTile
                        urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maximumZ={19}
                    />
                )}
                {routeCoords.length > 0 && (
                    <Polyline
                        coordinates={routeCoords}
                        strokeColor={COLORS.primary}
                        strokeWidth={5}
                        lineDashPattern={[1]}
                    />
                )}
                {renderMarkers()}
            </MapView>

            {/* Vendor Tracking Info (when route is being tracked) */}
            {acceptedProposal && vendorLocation && (
                <View style={styles.trackingInfoCard}>
                    <View style={styles.trackingInfoRow}>
                        <View style={styles.trackingInfoItem}>
                            <Ionicons name="navigate" size={18} color={COLORS.primary} />
                            <Text style={styles.trackingInfoLabel}>Distance</Text>
                            <Text type="bodySemiBold" style={styles.trackingInfoValue}>
                                {formattedDistance || 'Calculating...'}
                            </Text>
                        </View>
                        {isRouteLoading && (
                            <ActivityIndicator size="small" color={COLORS.primary} style={styles.routeLoader} />
                        )}
                        <TouchableOpacity onPress={refreshRoute} style={styles.refreshButton}>
                            <Ionicons name="refresh" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Cancel Button - Show before acceptance OR after acceptance with timer */}
            {(!acceptedProposal || cancelDisableTimeLeft > 0) && (
                <TouchableOpacity
                    style={[
                        styles.cancelButton,
                        acceptedProposal && cancelDisableTimeLeft > 0 && styles.cancelButtonDisabled
                    ]}
                    onPress={handleCancelRequest}
                    activeOpacity={acceptedProposal && cancelDisableTimeLeft > 0 ? 1 : 0.8}
                    disabled={acceptedProposal && cancelDisableTimeLeft > 0}
                >
                    <LinearGradient
                        colors={acceptedProposal && cancelDisableTimeLeft > 0
                            ? [COLORS.gray400, COLORS.gray500]
                            : [COLORS.error, '#dc2626']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.cancelButtonInner}
                    >
                        {acceptedProposal && cancelDisableTimeLeft > 0 ? (
                            <>
                                <Ionicons name="time" size={20} color={COLORS.white} />
                                <Text style={styles.cancelButtonText}>
                                    Cancel available in {cancelDisableTimeLeft}s
                                </Text>
                            </>
                        ) : (
                            <>
                                <X size={20} color={COLORS.white} />
                                <Text style={styles.cancelButtonText}>Cancel Request</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            )}

            {/* Bottom Sheet */}
            <BottomSheet
                ref={bottomSheetRef}
                index={1}
                snapPoints={acceptedProposal ? SNAP_POINTS_ACCEPTED : SNAP_POINTS}
                enablePanDownToClose={false}
                backgroundStyle={styles.bottomSheetBackground}
                handleIndicatorStyle={styles.bottomSheetHandle}
            >
                <BottomSheetView style={styles.bottomSheetContent}>
                    {/* Title */}
                    <View style={styles.sheetTitleContainer}>
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.sheetTitleGradient}
                        >
                            <Text type="subtitle" style={styles.sheetTitle}>
                                {acceptedProposal
                                    ? vendorHasArrived
                                        ? 'Vendor Arrived!'
                                        : 'Vendor on the way'
                                    : activeProposals.length === 0
                                        ? 'Waiting for proposals...'
                                        : `${activeProposals.length} Proposal${activeProposals.length > 1 ? 's' : ''} Received`
                                }
                            </Text>
                        </LinearGradient>
                    </View>

                    {/* Content */}
                    {acceptedProposal ? (
                        // Accepted state
                        <View style={styles.acceptedContainer}>
                            <ProposalCard
                                proposal={acceptedProposal}
                                onAccept={() => { }}
                                onDecline={() => { }}
                                isAccepting={false}
                                isDeclining={false}
                            />

                            {/* Vendor Contact Info */}
                            {acceptedProposal.vendor?.phone && (
                                <TouchableOpacity
                                    style={styles.contactCard}
                                    onPress={() => Linking.openURL(`tel:${acceptedProposal.vendor?.phone}`)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="call" size={20} color={COLORS.success} />
                                    <Text style={styles.contactText}>
                                        Call Vendor: {acceptedProposal.vendor.phone}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Vendor Arrival Badge (100m proximity) */}
                            {vendorHasArrived && (
                                <View style={styles.arrivalBadge}>
                                    <Ionicons name="location" size={16} color={COLORS.white} />
                                    <Text style={styles.arrivalText}>Vendor Arrived!</Text>
                                </View>
                            )}

                            {/* Live Tracking Status */}
                            {vendorLocation ? (
                                <View style={styles.trackingInfo}>
                                    <LinearGradient
                                        colors={[COLORS.primary + '10', COLORS.accent + '10']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.trackingCard}
                                    >
                                        <View style={styles.trackingRow}>
                                            <View style={styles.trackingItem}>
                                                <Ionicons name="navigate" size={20} color={COLORS.primary} />
                                                <Text style={styles.trackingLabel}>Distance</Text>
                                                <Text type="subtitle" style={styles.trackingValue}>
                                                    {formattedDistance || `${acceptedProposal.vendor?.distance_km?.toFixed(1) || '0.0'} km`}
                                                </Text>
                                            </View>
                                            <View style={styles.trackingDivider} />
                                            <View style={styles.trackingItem}>
                                                <Ionicons name="time" size={20} color={COLORS.accent} />
                                                <Text style={styles.trackingLabel}>ETA</Text>
                                                <Text type="subtitle" style={styles.trackingValue}>
                                                    {acceptedProposal.eta_minutes || '~'} min
                                                </Text>
                                            </View>
                                        </View>
                                    </LinearGradient>
                                </View>
                            ) : (
                                <View style={styles.waitingForLocationContainer}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                    <Text style={styles.waitingForLocationText}>
                                        Waiting for vendor location...
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : activeProposals.length === 0 ? (
                        // Waiting state or Expired state
                        <View style={styles.emptyState}>
                            {requestExpired ? (
                                // Request expired - show retry button
                                <>
                                    <View style={styles.expiredIconContainer}>
                                        <Ionicons name="time-outline" size={64} color={COLORS.warning} />
                                    </View>
                                    <Text type="body" style={styles.emptyTitle}>
                                        Request Expired
                                    </Text>
                                    <Text style={styles.emptyText}>
                                        No vendors responded in time. Would you like to try again?
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.retryButton}
                                        onPress={handleRetryRequest}
                                        disabled={isRetrying}
                                        activeOpacity={0.8}
                                    >
                                        <LinearGradient
                                            colors={[COLORS.primary, COLORS.accent]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.retryGradient}
                                        >
                                            {isRetrying ? (
                                                <ActivityIndicator color={COLORS.white} size="small" />
                                            ) : (
                                                <>
                                                    <Ionicons name="refresh" size={20} color={COLORS.white} />
                                                    <Text style={styles.retryText}>Retry Request</Text>
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                // Still waiting for vendors
                                <>
                                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                        <LinearGradient
                                            colors={[COLORS.primary, COLORS.accent]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.emptyGradient}
                                        >
                                            <ActivityIndicator size="large" color={COLORS.white} />
                                        </LinearGradient>
                                    </Animated.View>
                                    <Text type="body" style={styles.emptyTitle}>
                                        Finding nearby vendors...
                                    </Text>
                                    <View style={styles.timerContainer}>
                                        <Ionicons name="time" size={18} color={COLORS.gray500} />
                                        <Text style={styles.timerText}>
                                            {Math.floor(requestTimeLeft / 60)}:{(requestTimeLeft % 60).toString().padStart(2, '0')}
                                        </Text>
                                    </View>
                                    <Text style={styles.emptyText}>
                                        Nearby vendors are reviewing your request.
                                    </Text>
                                    {!isConnected && (
                                        <View style={styles.connectionWarning}>
                                            <Ionicons name="warning" size={16} color={COLORS.warning} />
                                            <Text style={styles.connectionWarningText}>
                                                Connecting to server...
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    ) : (
                        // Proposals list
                        <FlatList
                            data={activeProposals}
                            renderItem={renderProposalItem}
                            keyExtractor={keyExtractor}
                            getItemLayout={getItemLayout}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.proposalsList}
                            removeClippedSubviews={true}
                            maxToRenderPerBatch={5}
                            windowSize={5}
                            initialNumToRender={CONSTANTS.FLATLIST_INITIAL_NUM}
                            updateCellsBatchingPeriod={CONSTANTS.FLATLIST_BATCH_PERIOD}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>No proposals yet</Text>
                                </View>
                            }
                        />
                    )}
                </BottomSheetView>
            </BottomSheet>
            {/* Rating Modal - Shows when service is completed */}
            {completedService && (
                <RatingModal
                    visible={showRatingModal}
                    onClose={handleRatingClose}
                    onSuccess={handleRatingClose}
                    serviceRequestId={completedService.requestId}
                    vendorName={completedService.vendorName}
                />
            )}
        </GestureHandlerRootView>
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
    map: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.gray50,
        padding: scale(20),
    },

    // Header
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: verticalScale(50),
        paddingBottom: verticalScale(16),
        paddingHorizontal: scale(16),
    },
    backButton: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: scale(12),
    },
    headerTitle: {
        color: COLORS.white,
        fontSize: moderateScale(18),
        fontWeight: '700',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: moderateScale(13),
        marginTop: verticalScale(2),
    },
    statusIndicator: {
        marginLeft: scale(12),
    },

    // Loading
    loadingGradient: {
        padding: moderateScale(40),
        borderRadius: moderateScale(24),
        alignItems: 'center',
        justifyContent: 'center',
        gap: verticalScale(16),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    loadingText: {
        fontSize: moderateScale(16),
        color: COLORS.white,
        fontWeight: '600',
    },

    // Map markers
    userMarker: {
        width: moderateScale(48),
        height: moderateScale(48),
        borderRadius: moderateScale(24),
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: COLORS.white,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    acceptedVendorMarker: {
        width: moderateScale(52),
        height: moderateScale(52),
        borderRadius: moderateScale(26),
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: COLORS.white,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 10,
    },

    // Tracking info card
    trackingInfoCard: {
        position: 'absolute',
        top: verticalScale(120),
        left: scale(16),
        right: scale(16),
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(12),
        padding: scale(12),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    trackingInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trackingInfoItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    trackingInfoLabel: {
        fontSize: moderateScale(12),
        color: COLORS.gray500,
    },
    trackingInfoValue: {
        fontSize: moderateScale(14),
        color: COLORS.gray900,
    },
    routeLoader: {
        marginHorizontal: scale(8),
    },
    refreshButton: {
        padding: scale(8),
        backgroundColor: COLORS.primary + '15',
        borderRadius: moderateScale(8),
    },

    // Cancel button
    cancelButton: {
        position: "absolute",
        bottom: verticalScale(280),
        left: scale(16),
        right: scale(16),
        borderRadius: moderateScale(12),
        overflow: 'hidden',
        shadowColor: COLORS.error,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    cancelButtonInner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: verticalScale(14),
        gap: scale(8),
    },
    cancelButtonText: {
        color: COLORS.white,
        fontSize: moderateScale(16),
        fontWeight: "700",
    },
    cancelButtonDisabled: {
        opacity: 0.9,
        shadowColor: COLORS.gray500,
    },

    // Bottom sheet
    bottomSheetBackground: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: moderateScale(24),
        borderTopRightRadius: moderateScale(24),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 16,
    },
    bottomSheetHandle: {
        backgroundColor: COLORS.gray300,
        width: moderateScale(40),
        height: verticalScale(4),
        borderRadius: moderateScale(2),
    },
    bottomSheetContent: {
        flex: 1,
        paddingHorizontal: scale(20),
    },
    sheetTitleContainer: {
        marginBottom: verticalScale(16),
        borderRadius: moderateScale(12),
        overflow: 'hidden',
    },
    sheetTitleGradient: {
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(16),
    },
    sheetTitle: {
        fontSize: moderateScale(18),
        fontWeight: "700",
        color: COLORS.white,
        textAlign: 'center',
    },

    // Empty state
    emptyState: {
        alignItems: "center",
        paddingVertical: verticalScale(32),
    },
    emptyGradient: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(40),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(20),
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    emptyTitle: {
        fontSize: moderateScale(18),
        fontWeight: '600',
        color: COLORS.gray900,
        marginBottom: verticalScale(8),
    },
    emptyText: {
        fontSize: moderateScale(14),
        color: COLORS.gray500,
        textAlign: "center",
        paddingHorizontal: scale(32),
        lineHeight: moderateScale(20),
    },
    connectionWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(16),
        padding: scale(12),
        backgroundColor: COLORS.warning + '15',
        borderRadius: moderateScale(8),
        gap: scale(8),
    },
    connectionWarningText: {
        fontSize: moderateScale(13),
        color: COLORS.warning,
        fontWeight: '500',
    },

    // Timer container for waiting state
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.gray100,
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(8),
        borderRadius: moderateScale(20),
        marginVertical: verticalScale(12),
        gap: scale(6),
    },
    timerText: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        color: COLORS.gray700,
    },

    // Expired state
    expiredIconContainer: {
        marginBottom: verticalScale(16),
    },

    // Retry button
    retryButton: {
        marginTop: verticalScale(20),
        borderRadius: moderateScale(12),
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    retryGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(24),
        gap: scale(8),
    },
    retryText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: moderateScale(15),
    },

    // Vendor contact card
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.success + '15',
        padding: scale(16),
        borderRadius: moderateScale(12),
        marginTop: verticalScale(12),
        gap: scale(10),
    },
    contactText: {
        color: COLORS.success,
        fontWeight: '600',
        fontSize: moderateScale(15),
    },

    // Waiting for location
    waitingForLocationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: scale(16),
        backgroundColor: COLORS.gray100,
        borderRadius: moderateScale(12),
        marginTop: verticalScale(16),
        gap: scale(10),
    },
    waitingForLocationText: {
        fontSize: moderateScale(14),
        color: COLORS.gray600,
    },

    // Proposals list
    proposalsList: {
        paddingBottom: verticalScale(20),
    },

    // Proposal card
    proposalCard: {
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
    proposalHeader: {
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
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '20',
    },
    avatarText: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: COLORS.primary,
    },
    avatarTextWhite: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: COLORS.white,
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
    proposalTimerText: {
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
        padding: scale(16),
        paddingTop: verticalScale(12),
        gap: scale(12),
    },
    declineButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(12),
        borderRadius: moderateScale(10),
        borderWidth: 1.5,
        borderColor: COLORS.error,
        gap: scale(6),
    },
    declineText: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: COLORS.error,
    },
    acceptButton: {
        flex: 2,
        borderRadius: moderateScale(10),
        overflow: 'hidden',
        shadowColor: COLORS.success,
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
        paddingVertical: verticalScale(12),
        gap: scale(6),
    },
    acceptText: {
        fontSize: moderateScale(14),
        fontWeight: '700',
        color: COLORS.white,
    },

    // Accepted state
    acceptedContainer: {
        flex: 1,
    },
    trackingInfo: {
        marginTop: verticalScale(16),
    },
    trackingCard: {
        borderRadius: moderateScale(16),
        padding: scale(16),
        borderWidth: 1,
        borderColor: COLORS.primary + '20',
    },
    trackingRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    trackingItem: {
        alignItems: 'center',
        flex: 1,
    },
    trackingDivider: {
        width: 1,
        height: verticalScale(40),
        backgroundColor: COLORS.gray200,
    },
    trackingLabel: {
        fontSize: moderateScale(12),
        color: COLORS.gray500,
        marginTop: verticalScale(4),
    },
    trackingValue: {
        fontSize: moderateScale(18),
        fontWeight: '700',
        color: COLORS.gray900,
        marginTop: verticalScale(2),
    },

    // Vendor arrival badge
    arrivalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.success,
        paddingVertical: verticalScale(8),
        paddingHorizontal: scale(16),
        borderRadius: moderateScale(20),
        marginTop: verticalScale(12),
        gap: scale(6),
        shadowColor: COLORS.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    arrivalText: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: COLORS.white,
    },
});
