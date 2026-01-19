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
    Alert,
    FlatList,
    Animated,
    Linking,
    AppState,
    AppStateStatus,
    InteractionManager,
    Image,
} from "react-native";
import MapView, {
    Marker,
    PROVIDER_DEFAULT,
    Polyline,
} from "react-native-maps";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { MapPin } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

import Text from "@/components/common/Text";
import { SocketStatusIndicator } from "@/components/common/SocketStatusIndicator";
import RatingModal from "@/components/common/RatingModal";
import CancelRequestModal from "@/components/customer/CancelRequestModal";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { COLORS } from "@/constants/colors";
import { lightMapStyle, routeColors, routeWidths, calculateBearing } from "@/constants/mapStyles";
import { serviceRequestApi, type CreateServiceRequestParams, type CustomerCancelReasonCode } from "@/services/serviceRequestApi";
import { socketService } from "@/services/socketService";
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
    selectCancelledService,
    clearServiceCancelled,
    selectVendorCancelledRequest,
    clearVendorCancelledRequest,
    selectCanCustomerCancel,
    selectVendorDistanceTracking,
    resetVendorDistanceTracking,
    setVendorStationary,
    setCurrentCustomerRequest,
    clearCurrentCustomerRequest,
    setVendorLocation,
    setCustomerActiveService,
    clearCustomerActiveServiceState,
    setVendorReached1km,
} from "@/store/slices/dispatchSlice";
import { clearReviewState } from "@/store/slices/reviewSlice";
import { useVendorProximity } from "@/hooks/useVendorProximity";
import { useRouteTracking } from "@/hooks/useRouteTracking";
import { resetArrivalNotification } from "@/utils/notifications";
import {
    updateCustomerActiveServiceAcceptance,
    clearCustomerActiveService,
    getCancelDisableRemaining,
    markCustomerActiveServiceExpired,
    CANCEL_DISABLE_DURATION_MS,
    type ActiveServiceStatus,
} from "@/services/customerActiveServiceService";
import { useToast } from "@/contexts/ToastContext";

// ============================================================================
// Constants
// ============================================================================

const CONSTANTS = {
    /** Distance in meters to consider vendor as "arrived" */
    VENDOR_ARRIVAL_THRESHOLD_M: 100,
    /** Default request timeout in seconds (5 minutes) */
    REQUEST_TIMEOUT_SECONDS: 300,
    /** Map edge padding for fitToCoordinates (top accounts for tracking card) */
    MAP_EDGE_PADDING: { top: 200, right: 60, bottom: 400, left: 60 },
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

/**
 * Smart Zoom Thresholds for Map
 * Distance-aware zoom levels for Uber/Careem-like experience
 */
const ZOOM_THRESHOLDS = {
    // Distance thresholds in kilometers
    VERY_CLOSE: 0.5,    // < 500m - street-level detail
    CLOSE: 2,           // < 2km - neighborhood view
    MEDIUM: 5,          // < 5km - city block view
    FAR: Infinity,      // >= 5km - wide area view

    // Corresponding zoom deltas (smaller = more zoomed in)
    DELTAS: {
        VERY_CLOSE: 0.005,  // Like Uber when vendor nearby
        CLOSE: 0.015,       // User selected threshold
        MEDIUM: 0.03,       // Balanced view
        FAR: 0.05,          // Show full route
    },

    // Edge padding per zoom level (top accounts for tracking card, bottom for bottom sheet)
    PADDING: {
        VERY_CLOSE: { top: 180, right: 60, bottom: 350, left: 60 },
        CLOSE: { top: 200, right: 60, bottom: 400, left: 60 },
        MEDIUM: { top: 220, right: 60, bottom: 450, left: 60 },
        FAR: { top: 250, right: 60, bottom: 500, left: 60 },
    },

    ANIMATION_DURATION: 800, // Smooth 800ms animations
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
    onVendorTap?: (vendorId: number) => void;
    isAccepting: boolean;
    isDeclining: boolean;
}

const ProposalCard = React.memo(({
    proposal,
    onAccept,
    onDecline,
    onVendorTap,
    isAccepting,
    isDeclining,
}: ProposalCardProps) => {
    // Image load error state for fallback
    const [imageLoadError, setImageLoadError] = useState(false);

    // Reset error state when profile photo URL changes
    useEffect(() => {
        setImageLoadError(false);
    }, [proposal.vendor?.profile_photo_url]);

    // DEBUG: Log vendor profile photo URL
    if (__DEV__) {
        console.log('[ProposalCard] Vendor profile_photo_url:', proposal.vendor?.profile_photo_url);
    }

    // Calculate initial time from acceptance_expires_at (more reliable than remaining_expiry_time)
    const calculateTimeLeft = useCallback(() => {
        if (!proposal.acceptance_expires_at) {
            return proposal.remaining_expiry_time || 0;
        }
        const expiresAt = new Date(proposal.acceptance_expires_at).getTime();
        return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    }, [proposal.acceptance_expires_at, proposal.remaining_expiry_time]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);
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

    // Timer effect - use acceptance_expires_at for accurate time calculation
    // This ensures new proposals always show correct timer even if remaining_expiry_time is stale
    useEffect(() => {
        if (proposal.status !== 'pending') return;

        // Calculate and set time left immediately
        setTimeLeft(calculateTimeLeft());

        const interval = setInterval(() => {
            if (isMountedRef.current) {
                setTimeLeft(calculateTimeLeft());
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [proposal.id, proposal.acceptance_expires_at, proposal.status, calculateTimeLeft]);

    // Pulse animation - with proper cleanup to prevent memory leak on unmount
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

    const handleVendorTap = useCallback(() => {
        // Only allow vendor tap when proposal is accepted
        if (proposal.status === 'accepted' && onVendorTap && proposal.vendor?.id) {
            onVendorTap(proposal.vendor.id);
        }
    }, [onVendorTap, proposal.vendor?.id, proposal.status]);

    const handleCall = useCallback(() => {
        if (proposal.vendor?.phone) {
            Linking.openURL(`tel:${proposal.vendor.phone}`);
        }
    }, [proposal.vendor?.phone]);

    const handleWhatsApp = useCallback(() => {
        if (proposal.vendor?.phone) {
            const phone = proposal.vendor.phone.replace(/\D/g, '');
            Linking.openURL(`https://wa.me/${phone}`);
        }
    }, [proposal.vendor?.phone]);

    const isAcceptedProposal = proposal.status === 'accepted';

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
    // console.log("-->proposal logs",proposal.vendor)
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
                {isAcceptedProposal ? (
                    <TouchableOpacity
                        style={styles.vendorInfo}
                        onPress={handleVendorTap}
                        activeOpacity={0.7}
                    >
                        <View style={styles.avatarContainer}>
                            {proposal.vendor?.profile_photo_url && !imageLoadError ? (
                                <Image
                                    source={{ uri: proposal.vendor.profile_photo_url }}
                                    style={styles.avatarImage}
                                    onError={() => setImageLoadError(true)}
                                />
                            ) : (
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.accent]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.avatarPlaceholder}
                                >
                                    <Ionicons name="person" size={moderateScale(24)} color={COLORS.white} />
                                </LinearGradient>
                            )}
                            {proposal.vendor?.verified && (
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark" size={10} color={COLORS.white} />
                                </View>
                            )}
                        </View>

                        <View style={styles.vendorDetails}>
                            <View style={styles.vendorNameRow}>
                                <Text type="subtitle" style={styles.vendorName}>
                                    {proposal.vendor?.full_name || 'Vendor'}
                                </Text>
                                <Ionicons name="chevron-forward" size={14} color={COLORS.gray400} style={{ marginLeft: 4 }} />
                            </View>
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
                    </TouchableOpacity>
                ) : (
                    <View style={styles.vendorInfo}>
                        <View style={styles.avatarContainer}>
                            {proposal.vendor?.profile_photo_url && !imageLoadError ? (
                                <Image
                                    source={{ uri: proposal.vendor.profile_photo_url }}
                                    style={styles.avatarImage}
                                    onError={() => setImageLoadError(true)}
                                />
                            ) : (
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.accent]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.avatarPlaceholder}
                                >
                                    <Ionicons name="person" size={moderateScale(24)} color={COLORS.white} />
                                </LinearGradient>
                            )}
                            {proposal.vendor?.verified && (
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark" size={10} color={COLORS.white} />
                                </View>
                            )}
                        </View>

                        <View style={styles.vendorDetails}>
                            <View style={styles.vendorNameRow}>
                                <Text type="subtitle" style={styles.vendorName}>
                                    {proposal.vendor?.full_name || 'Vendor'}
                                </Text>
                            </View>
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
                )}

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

            {/* Contact Buttons - Show only when proposal is accepted */}
            {isAcceptedProposal && proposal.vendor?.phone && (
                <View style={styles.contactButtonsContainer}>
                    <TouchableOpacity
                        style={styles.callButton}
                        onPress={handleCall}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.contactButtonGradient}
                        >
                            <Ionicons name="call" size={18} color={COLORS.white} />
                            <Text style={styles.contactButtonText}>Call</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.whatsappButton}
                        onPress={handleWhatsApp}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#25D366', '#128C7E']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.whatsappButtonInner}
                        >
                            <Ionicons name="logo-whatsapp" size={18} color={COLORS.white} />
                            <Text style={[styles.whatsappButtonText, { color: COLORS.white }]}>WhatsApp</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </Animated.View>
    );
}, (prevProps, nextProps) => {
    // Check all critical props to prevent stale renders
    // IMPORTANT: Include acceptance_expires_at to detect when same proposal ID is updated with new expiry
    return (
        prevProps.proposal.id === nextProps.proposal.id &&
        prevProps.proposal.status === nextProps.proposal.status &&
        prevProps.proposal.acceptance_expires_at === nextProps.proposal.acceptance_expires_at &&
        prevProps.proposal.remaining_expiry_time === nextProps.proposal.remaining_expiry_time &&
        prevProps.isAccepting === nextProps.isAccepting &&
        prevProps.isDeclining === nextProps.isDeclining &&
        // Include vendor checks to detect when vendor data arrives
        prevProps.proposal.vendor?.id === nextProps.proposal.vendor?.id &&
        prevProps.proposal.vendor?.phone === nextProps.proposal.vendor?.phone &&
        prevProps.onVendorTap === nextProps.onVendorTap
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
        categoryId?: string;
        problemTitle?: string;
        description?: string;
        // Restoration params from persisted storage
        expiresAt?: string;          // ISO timestamp for timer restoration
        restoredStatus?: string;     // 'pending' | 'accepted' | 'expired'
        proposalId?: string;         // Accepted proposal ID (if any)
        acceptedAtTimestamp?: string; // When proposal was accepted (for cancel window)
    }>();
    const dispatch = useDispatch<AppDispatch>();
    const { showToast } = useToast();
    const mapRef = useRef<MapView | null>(null);
    const bottomSheetRef = useRef<BottomSheet | null>(null);

    // Refs to track map initialization state (prevents blinking/jerking)
    const hasInitialMapFitRef = useRef(false);
    const lastZoomLevelRef = useRef<string | null>(null);

    // Redux state
    const connectionStatus = useSelector(selectConnectionStatus);
    const isConnected = useSelector(selectIsConnected);
    const customerRequests = useSelector(selectCustomerRequests);
    const vendorLocation = useSelector(selectVendorLocation);
    const completedService = useSelector(selectCompletedService);
    const cancelledService = useSelector(selectCancelledService);
    const vendorCancelledRequest = useSelector(selectVendorCancelledRequest);
    const canCustomerCancel = useSelector(selectCanCustomerCancel);
    const vendorDistanceTracking = useSelector(selectVendorDistanceTracking);

    // Get current request and its proposals
    const requestId = params.requestId ? parseInt(params.requestId, 10) : null;
    const currentRequest = useMemo(() => {
        // Safety check: return null if customerRequests is empty or undefined
        if (!customerRequests || customerRequests.length === 0) {
            return null;
        }
        if (requestId) {
            return customerRequests.find(r => r?.id === requestId) || null;
        }
        return customerRequests[0] || null;
    }, [customerRequests, requestId]);

    // Use requestId directly from params OR from currentRequest
    const effectiveRequestId = requestId || currentRequest?.id;

    const proposals = useSelector((state: RootState) =>
        effectiveRequestId ? selectProposalsByRequestId(state, effectiveRequestId) : []
    );

    // Filter active proposals (pending or accepted)
    // Also exclude pending proposals that are time-expired (backup check)
    const activeProposals = useMemo(() => {
        const now = Date.now();
        return proposals.filter(p => {
            // Must be pending or accepted
            if (p.status !== 'pending' && p.status !== 'accepted') return false;

            // For pending proposals, also check if actually expired by time
            // This handles cases where backend hasn't sent the expired status yet
            if (p.status === 'pending' && p.acceptance_expires_at) {
                const expiresAt = new Date(p.acceptance_expires_at).getTime();
                if (expiresAt <= now) return false; // Expired by time, filter out
            }

            return true;
        });
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

    // Track if vendor arrival toast has been shown (prevents duplicate toasts)
    const [hasShownArrivalToast, setHasShownArrivalToast] = useState(false);

    // Track if customer has sent "I'm Coming" acknowledgement
    // Initialized from backend data (customer_coming_acknowledged) for persistence across app restarts
    const [hasSentComingAck, setHasSentComingAck] = useState(false);
    const [isSendingComingAck, setIsSendingComingAck] = useState(false);

    // Initialize hasSentComingAck from backend data when currentRequest is loaded
    // This ensures the "Vendor notified" banner persists across app restarts
    useEffect(() => {
        if (currentRequest?.customer_coming_acknowledged) {
            setHasSentComingAck(true);
            if (__DEV__) {
                console.log('[LiveOffers] Restored hasSentComingAck from backend:', true);
            }
        }
    }, [currentRequest?.customer_coming_acknowledged]);

    // =========================================================================
    // STAGED INITIALIZATION - Prevents crash on first mount
    // Operations are serialized instead of running in parallel
    // =========================================================================
    type InitStage = 'loading' | 'connecting' | 'syncing' | 'ready';
    const [initStage, setInitStage] = useState<InitStage>('loading');

    // Ref to track init stage for socket event filtering
    // Using ref because we need current value in event handlers without re-subscribing
    const initStageRef = useRef<InitStage>('loading');

    // Keep ref in sync with state
    useEffect(() => {
        initStageRef.current = initStage;
    }, [initStage]);

    // Mounted state ref for main component
    const isMountedRef = useRef(true);

    // Store original request params for retry
    const [originalRequestParams, setOriginalRequestParams] = useState<CreateServiceRequestParams | null>(null);

    // Rating modal state
    const [showRatingModal, setShowRatingModal] = useState(false);

    // Cancel request modal state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    // Track if service was cancelled by vendor (to prevent expiry UI from showing)
    const [serviceCancelledByVendor, setServiceCancelledByVendor] = useState(false);

    // Cancel disable state (1 minute after accepting proposal)
    const [cancelDisableTimeLeft, setCancelDisableTimeLeft] = useState<number>(0);
    const [acceptedAt, setAcceptedAt] = useState<number | null>(null);
    const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const backgroundTimeRef = useRef<number | null>(null);

    // Vendor location age tracking (for staleness indicators)
    const [locationAge, setLocationAge] = useState<number>(0);
    const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

    // =========================================================================
    // Set currentCustomerRequestId in Redux for cancellation tracking
    // This ensures the cancellation handler can detect this request even if
    // it's not in customerRequestsById or activeJobId
    // =========================================================================
    useEffect(() => {
        if (effectiveRequestId) {
            dispatch(setCurrentCustomerRequest(effectiveRequestId));
            if (__DEV__) {
                console.log('[LiveOffers] Set currentCustomerRequestId:', effectiveRequestId);
            }
        }

        // Cleanup: Clear when component unmounts or request changes
        return () => {
            if (effectiveRequestId) {
                dispatch(clearCurrentCustomerRequest());
                if (__DEV__) {
                    console.log('[LiveOffers] Cleared currentCustomerRequestId');
                }
            }
        };
    }, [effectiveRequestId, dispatch]);

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
    // Smart Zoom Calculation
    // =========================================================================

    /**
     * Calculate optimal zoom level based on vendor-to-customer distance
     * Returns: delta, padding, and zoom level for map animations
     */
    const calculateSmartZoom = useCallback((
        origin: Coordinates,
        destination: Coordinates
    ): {
        delta: number;
        padding: { top: number; right: number; bottom: number; left: number };
        zoomLevel: 'very_close' | 'close' | 'medium' | 'far';
    } => {
        const { haversineDistanceKm } = require('@/utils/geo');
        const distanceKm = haversineDistanceKm(
            origin.latitude,
            origin.longitude,
            destination.latitude,
            destination.longitude
        );

        if (__DEV__) {
            console.log('[SmartZoom] Distance:', distanceKm.toFixed(2), 'km');
        }

        if (distanceKm < ZOOM_THRESHOLDS.VERY_CLOSE) {
            return {
                delta: ZOOM_THRESHOLDS.DELTAS.VERY_CLOSE,
                padding: ZOOM_THRESHOLDS.PADDING.VERY_CLOSE,
                zoomLevel: 'very_close',
            };
        } else if (distanceKm < ZOOM_THRESHOLDS.CLOSE) {
            return {
                delta: ZOOM_THRESHOLDS.DELTAS.CLOSE,
                padding: ZOOM_THRESHOLDS.PADDING.CLOSE,
                zoomLevel: 'close',
            };
        } else if (distanceKm < ZOOM_THRESHOLDS.MEDIUM) {
            return {
                delta: ZOOM_THRESHOLDS.DELTAS.MEDIUM,
                padding: ZOOM_THRESHOLDS.PADDING.MEDIUM,
                zoomLevel: 'medium',
            };
        } else {
            return {
                delta: ZOOM_THRESHOLDS.DELTAS.FAR,
                padding: ZOOM_THRESHOLDS.PADDING.FAR,
                zoomLevel: 'far',
            };
        }
    }, []);

    // =========================================================================
    // Route Tracking Hook - Uses optimized useRouteTracking
    // =========================================================================
    const handleFirstRouteFetch = useCallback((route: Coordinates[]) => {
        // Only run the initial map fit ONCE to prevent blinking
        if (hasInitialMapFitRef.current) {
            if (__DEV__) {
                console.log('[FirstRouteFetch] Skipping - already fitted');
            }
            return;
        }

        // Defer map animation until UI is idle
        // This prevents jank on low-end devices during first route fetch
        InteractionManager.runAfterInteractions(() => {
            if (!mapRef.current || !vendorLocation || !serviceLocation) return;

            // Mark as fitted to prevent future calls
            hasInitialMapFitRef.current = true;

            const zoomConfig = calculateSmartZoom(vendorLocation, serviceLocation);
            lastZoomLevelRef.current = zoomConfig.zoomLevel;

            if (__DEV__) {
                console.log('[FirstRouteFetch] Initial smart zoom:', zoomConfig.zoomLevel);
            }

            if (zoomConfig.zoomLevel === 'very_close' || zoomConfig.zoomLevel === 'close') {
                // Close proximity: Zoom to midpoint for street-level detail
                const midLat = (vendorLocation.latitude + serviceLocation.latitude) / 2;
                const midLng = (vendorLocation.longitude + serviceLocation.longitude) / 2;

                mapRef.current.animateToRegion({
                    latitude: midLat,
                    longitude: midLng,
                    latitudeDelta: zoomConfig.delta,
                    longitudeDelta: zoomConfig.delta,
                }, ZOOM_THRESHOLDS.ANIMATION_DURATION);
            } else {
                // Medium/Far: Show full route with smart padding
                mapRef.current.fitToCoordinates(route.length > 2 ? route : [vendorLocation, serviceLocation], {
                    edgePadding: zoomConfig.padding,
                    animated: true,
                });
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calculateSmartZoom]); // Removed vendorLocation, serviceLocation - use refs instead

    // Memoize enabled flag to prevent unnecessary hook re-renders
    // This is critical for preventing crash on low-end devices
    // IMPORTANT: Only enable after staged initialization is complete
    // Disable when vendor cancels to clear route from map
    // Disable when status is 'arrived' or 'in_progress' (vendor has arrived, no need for routes)
    const isRouteTrackingEnabled = useMemo(() => {
        const vendorHasArrivedOrServiceStarted = currentRequest?.status === 'arrived' || currentRequest?.status === 'in_progress';
        return initStage === 'ready' && !!acceptedProposal && !!vendorLocation && !!serviceLocation && !serviceCancelledByVendor && !vendorHasArrivedOrServiceStarted;
    }, [initStage, acceptedProposal, vendorLocation, serviceLocation, serviceCancelledByVendor, currentRequest?.status]);

    const {
        routeCoords,
        roadDistanceFormatted,
        etaFormatted,
        isLoading: isRouteLoading,
        refreshRoute,
    } = useRouteTracking({
        vendorLocation,
        serviceLocation,
        enabled: isRouteTrackingEnabled,
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

    // =========================================================================
    // Dynamic Zoom Updates - Adjust as vendor approaches
    // =========================================================================

    /**
     * Update zoom ONLY when zoom level threshold changes
     * This prevents constant map animations that cause blinking/jerking
     */
    useEffect(() => {
        // Skip if not initialized yet
        if (!hasInitialMapFitRef.current) {
            return;
        }

        if (!vendorLocation || !serviceLocation || !acceptedProposal || routeCoords.length === 0) {
            return;
        }

        const zoomUpdateTimer = setTimeout(() => {
            InteractionManager.runAfterInteractions(() => {
                if (!mapRef.current) return;

                const zoomConfig = calculateSmartZoom(vendorLocation, serviceLocation);

                // CRITICAL: Only animate if zoom level CHANGED (crossed a threshold)
                // This prevents constant blinking when vendor moves but stays in same zoom level
                if (lastZoomLevelRef.current === zoomConfig.zoomLevel) {
                    if (__DEV__) {
                        console.log('[DynamicZoom] Skipping - same zoom level:', zoomConfig.zoomLevel);
                    }
                    return;
                }

                // Update the zoom level ref
                lastZoomLevelRef.current = zoomConfig.zoomLevel;

                if (__DEV__) {
                    console.log('[DynamicZoom] Zoom level changed to:', zoomConfig.zoomLevel);
                }

                if (zoomConfig.zoomLevel === 'very_close' || zoomConfig.zoomLevel === 'close') {
                    const midLat = (vendorLocation.latitude + serviceLocation.latitude) / 2;
                    const midLng = (vendorLocation.longitude + serviceLocation.longitude) / 2;

                    mapRef.current.animateToRegion({
                        latitude: midLat,
                        longitude: midLng,
                        latitudeDelta: zoomConfig.delta,
                        longitudeDelta: zoomConfig.delta,
                    }, ZOOM_THRESHOLDS.ANIMATION_DURATION);
                } else {
                    mapRef.current.fitToCoordinates(routeCoords, {
                        edgePadding: zoomConfig.padding,
                        animated: true,
                    });
                }
            });
        }, 2000); // 2 second debounce prevents zoom oscillation

        return () => clearTimeout(zoomUpdateTimer);
    }, [vendorLocation, serviceLocation, acceptedProposal, routeCoords, calculateSmartZoom]);

    // Vendor proximity detection (100m arrival notification)
    // IMPORTANT: Only enable after staged initialization is complete
    const { hasArrived: vendorHasArrived, formattedDistance } = useVendorProximity({
        vendorLocation,
        serviceLocation,
        requestId: effectiveRequestId ?? null,
        vendorName: acceptedProposal?.vendor?.full_name || 'Vendor',
        enabled: initStage === 'ready' && !!acceptedProposal && !!vendorLocation && !!serviceLocation,
        onArrival: () => {
            console.log('[LiveOffers] Vendor arrived within 100m');
        },
    });

    // Listen for vendor.arrived.notification from backend (vendor manually marks arrival)
    // This replaces the old auto-start logic - now vendor controls the flow
    useEffect(() => {
        if (!effectiveRequestId) return;

        const unsubscribe = socketService.on('vendor.arrived.notification', (data: any) => {
            if (data.service_request_id === effectiveRequestId && !hasShownArrivalToast) {
                // Show toast notification when vendor marks arrival
                showToast({
                    type: 'success',
                    title: 'Vendor Has Arrived',
                    message: data.message || `${acceptedProposal?.vendor?.full_name || 'Vendor'} has arrived at your location.`,
                    duration: 5000,
                });
                setHasShownArrivalToast(true);

                if (__DEV__) {
                    console.log('[LiveOffers] Received vendor.arrived.notification:', data);
                }
            }
        });

        return () => unsubscribe();
    }, [effectiveRequestId, hasShownArrivalToast, acceptedProposal?.vendor?.full_name, showToast]);

    // Listen for service.started.notification from backend (vendor starts service work)
    useEffect(() => {
        if (!effectiveRequestId) return;

        const unsubscribe = socketService.on('service.started.notification', (data: any) => {
            if (data.service_request_id === effectiveRequestId) {
                // Show toast notification when vendor starts service
                showToast({
                    type: 'info',
                    title: 'Service Started',
                    message: data.message || `${acceptedProposal?.vendor?.full_name || 'Vendor'} has started working on your service.`,
                    duration: 5000,
                });

                if (__DEV__) {
                    console.log('[LiveOffers] Received service.started.notification:', data);
                }
            }
        });

        return () => unsubscribe();
    }, [effectiveRequestId, acceptedProposal?.vendor?.full_name, showToast]);

    // Reset state when request changes
    useEffect(() => {
        setHasShownArrivalToast(false);
        // Reset map fit refs so new request gets proper initial fit
        hasInitialMapFitRef.current = false;
        lastZoomLevelRef.current = null;
    }, [effectiveRequestId]);

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
    // Priority: 1) URL params (from create screen), 2) currentRequest (from Redux)
    useEffect(() => {
        if (originalRequestParams) return; // Already set

        // First try to get from URL params (most reliable for retry)
        if (params.categoryId && params.problemTitle && params.latitude && params.longitude && params.address) {
            setOriginalRequestParams({
                category: parseInt(params.categoryId, 10),
                problem_title: params.problemTitle,
                description: params.description || '',
                address_line: params.address,
                latitude: parseFloat(params.latitude),
                longitude: parseFloat(params.longitude),
                location_source: 'map',
                radius_km: 10,
            });
            return;
        }

        // Fallback to currentRequest from Redux
        if (currentRequest) {
            setOriginalRequestParams({
                category: currentRequest?.category?.id ?? (currentRequest?.category as unknown as number),
                problem_title: currentRequest?.problem_title || '',
                description: currentRequest?.description || '',
                address_line: currentRequest?.address_line || '',
                latitude: currentRequest?.latitude || 0,
                longitude: currentRequest?.longitude || 0,
                location_source: currentRequest?.location_source,
                radius_km: currentRequest?.radius_km,
            });
        }
    }, [currentRequest, originalRequestParams, params]);

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
    // Priority: 1) URL params acceptedAtTimestamp, 2) SecureStore via getCancelDisableRemaining
    useEffect(() => {
        const restoreCancelTimer = async () => {
            try {
                // Priority 1: Use URL params acceptedAtTimestamp (passed from index.tsx restoration)
                if (params.acceptedAtTimestamp) {
                    const restoredAcceptedAt = parseInt(params.acceptedAtTimestamp, 10);
                    if (!isNaN(restoredAcceptedAt) && restoredAcceptedAt > 0) {
                        const elapsed = Date.now() - restoredAcceptedAt;
                        const remaining = Math.max(0, Math.ceil((CANCEL_DISABLE_DURATION_MS - elapsed) / 1000));
                        if (remaining > 0) {
                            setAcceptedAt(restoredAcceptedAt);
                            setCancelDisableTimeLeft(remaining);
                            if (__DEV__) {
                                console.log('[LiveOffers] Restored cancel timer from params:', remaining, 'seconds');
                            }
                            return;
                        }
                    }
                }

                // Priority 2: Fallback to SecureStore
                const remaining = await getCancelDisableRemaining();
                if (remaining > 0 && acceptedProposal) {
                    setCancelDisableTimeLeft(remaining);
                    // Calculate acceptedAt from remaining time
                    const calculatedAcceptedAt = Date.now() - (CANCEL_DISABLE_DURATION_MS - remaining * 1000);
                    setAcceptedAt(calculatedAcceptedAt);
                    if (__DEV__) {
                        console.log('[LiveOffers] Restored cancel timer from SecureStore:', remaining, 'seconds');
                    }
                }
            } catch (error) {
                if (__DEV__) console.error('[LiveOffers] Failed to restore cancel timer:', error);
            }
        };

        if (acceptedProposal || params.acceptedAtTimestamp) {
            restoreCancelTimer();
        }
    }, [acceptedProposal, params.acceptedAtTimestamp]);

    // Restore vendor location from persisted storage on mount (for app kill recovery)
    useEffect(() => {
        let mounted = true;

        const restoreVendorLocation = async () => {
            // Only restore if:
            // 1. Proposal is accepted
            // 2. No vendor location in Redux yet (prevents overwriting fresh WebSocket data)
            if (!acceptedProposal || vendorLocation) return;

            try {
                const { getCustomerActiveService } = require('@/services/customerActiveServiceService');
                const activeService = await getCustomerActiveService();

                // Check if still mounted before updating state
                if (!mounted) return;

                if (activeService?.vendorLocation) {
                    const { latitude, longitude, timestamp } = activeService.vendorLocation;

                    // Check location age
                    const age = Date.now() - timestamp;
                    const ageMinutes = Math.floor(age / 60000);

                    // Restore to Redux for immediate map display
                    dispatch(setVendorLocation({ latitude, longitude }));

                    if (__DEV__) {
                        console.log('[LiveOffers] Restored vendor location:', {
                            lat: latitude.toFixed(4),
                            lng: longitude.toFixed(4),
                            ageMinutes,
                        });
                    }

                    // Show toast if location is stale (> 2 minutes)
                    if (age > 2 * 60 * 1000 && ageMinutes < 30) {
                        showToast({ type: 'info', title: `Last known location (${ageMinutes} min ago)` });
                    } else if (ageMinutes >= 30) {
                        showToast({ type: 'warning', title: 'Vendor location may be outdated' });
                    }
                }
            } catch (error) {
                if (__DEV__) console.error('[LiveOffers] Failed to restore vendor location:', error);
            }
        };

        // Defer restoration until after mounted to avoid race with WebSocket
        const timeoutId = setTimeout(restoreVendorLocation, 1000);

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
        };
    }, [acceptedProposal, vendorLocation, dispatch]);

    // Track vendor location age for staleness indicators
    useEffect(() => {
        if (!vendorLocation || !acceptedProposal) {
            setLocationAge(0);
            return;
        }

        // Update age every 30 seconds for better performance
        const updateAge = async () => {
            try {
                const { getCustomerActiveService } = require('@/services/customerActiveServiceService');
                const activeService = await getCustomerActiveService();
                if (activeService?.vendorLocation) {
                    const age = Date.now() - activeService.vendorLocation.timestamp;
                    setLocationAge(age);
                }
            } catch (error) {
                if (__DEV__) console.error('[LiveOffers] Failed to update location age:', error);
            }
        };

        // Initial update
        updateAge();

        // Update every 30 seconds
        const interval = setInterval(updateAge, 30000);

        return () => clearInterval(interval);
    }, [vendorLocation, acceptedProposal]);

    // API fallback: Fetch vendor location from backend if WebSocket didn't provide it
    // Or if cached location is too stale (>10 min)
    useEffect(() => {
        const fetchVendorLocationFallback = async () => {
            // Skip if:
            // - No accepted proposal
            // - Already have vendor location in Redux
            // - No request ID
            if (!acceptedProposal || vendorLocation || !effectiveRequestId) return;

            try {
                // Check if cached location is too stale (> 10 min)
                const { getCustomerActiveService } = require('@/services/customerActiveServiceService');
                const activeService = await getCustomerActiveService();
                const cachedLocation = activeService?.vendorLocation;

                if (cachedLocation) {
                    const age = Date.now() - cachedLocation.timestamp;
                    if (age < 10 * 60 * 1000) {
                        // Cache is fresh enough, skip API call
                        return;
                    }
                }

                if (__DEV__) {
                    console.log('[LiveOffers] Fetching vendor location from API (fallback)');
                }

                const response = await serviceRequestApi.getVendorLocation(effectiveRequestId);

                if (response.vendor_location) {
                    // Update Redux
                    dispatch(setVendorLocation({
                        latitude: response.vendor_location.latitude,
                        longitude: response.vendor_location.longitude,
                    }));

                    // Persist for future app kills
                    const { updateVendorLocation } = require('@/services/customerActiveServiceService');
                    await updateVendorLocation(
                        response.vendor_location.latitude,
                        response.vendor_location.longitude
                    );

                    if (__DEV__) {
                        console.log('[LiveOffers] Vendor location fetched via API fallback');
                    }
                } else if (!response.is_online && __DEV__) {
                    console.log('[LiveOffers] Vendor is offline, no location available');
                }
            } catch (error) {
                if (__DEV__) {
                    console.error('[LiveOffers] API fallback failed:', error);
                }
                // Don't show error to user - might resolve when vendor comes online
            }
        };

        // Delay API call to give WebSocket 5 seconds to provide location first
        const timeoutId = setTimeout(fetchVendorLocationFallback, 5000);

        return () => clearTimeout(timeoutId);
    }, [acceptedProposal, vendorLocation, effectiveRequestId, dispatch]);

    // Cancel disable countdown timer - using setTimeout for better stability on low-end devices
    useEffect(() => {
        if (!acceptedAt || cancelDisableTimeLeft <= 0) return;

        const updateTimer = () => {
            if (!isMountedRef.current) return;

            const elapsed = Date.now() - acceptedAt;
            const remaining = Math.max(0, Math.ceil((CANCEL_DISABLE_DURATION_MS - elapsed) / 1000));

            setCancelDisableTimeLeft(remaining);

            // Schedule next update only if timer still has time left
            if (remaining > 0 && isMountedRef.current) {
                cancelTimerRef.current = setTimeout(updateTimer, 1000);
            } else {
                cancelTimerRef.current = null;
            }
        };

        // Start the timer chain
        cancelTimerRef.current = setTimeout(updateTimer, 1000);

        return () => {
            if (cancelTimerRef.current) {
                clearTimeout(cancelTimerRef.current);
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

    // =========================================================================
    // Backend sync on app foreground - Verify request status is still valid
    // This handles edge case where backend marked request as expired/cancelled while app was in background
    // =========================================================================
    useEffect(() => {
        const handleAppForeground = async (nextAppState: AppStateStatus) => {
            // Only sync when coming to foreground and we have a request
            if (
                appStateRef.current.match(/inactive|background/) &&
                nextAppState === 'active' &&
                effectiveRequestId &&
                !requestExpired &&
                !acceptedProposal
            ) {
                try {
                    if (__DEV__) {
                        console.log('[LiveOffers] App came to foreground - syncing with backend');
                    }

                    const response = await serviceRequestApi.get(effectiveRequestId);

                    // Check if backend has different status
                    if (response.status === 'expired' || response.status === 'cancelled') {
                        if (__DEV__) {
                            console.log('[LiveOffers] Backend reports request is:', response.status);
                        }
                        setRequestExpired(true);
                        await markCustomerActiveServiceExpired();
                    } else if (response.status === 'accepted' && response.accepted_proposal) {
                        // Request was accepted while in background - state will sync via WebSocket
                        if (__DEV__) {
                            console.log('[LiveOffers] Backend reports request is accepted');
                        }
                    }
                } catch (error) {
                    // 404 means request no longer exists
                    if (__DEV__) {
                        console.error('[LiveOffers] Backend sync failed:', error);
                    }
                    // Clear storage if request doesn't exist
                    await clearCustomerActiveService().catch(() => { });
                    dispatch(clearCustomerActiveServiceState());
                    setRequestExpired(true);
                }
            }
        };

        const subscription = AppState.addEventListener('change', handleAppForeground);
        return () => subscription?.remove();
    }, [effectiveRequestId, requestExpired, acceptedProposal]);

    // Clear persisted service on completion
    useEffect(() => {
        if (completedService && completedService.requestId === effectiveRequestId) {
            clearCustomerActiveService().catch(() => { });
            dispatch(clearCustomerActiveServiceState());
            // Reset vendor distance tracking
            dispatch(resetVendorDistanceTracking());
        }
    }, [completedService, effectiveRequestId, dispatch]);

    // Handle service cancellation by vendor (via WebSocket)
    useEffect(() => {
        // Guard: Only run once - check serviceCancelledByVendor flag to prevent infinite loop
        if (serviceCancelledByVendor) return;

        if (cancelledService && cancelledService.requestId === effectiveRequestId && cancelledService.cancelledBy === 'vendor') {
            // Set flag IMMEDIATELY to prevent re-running this effect and expiry UI from showing
            setServiceCancelledByVendor(true);

            // Clear persisted service
            clearCustomerActiveService().catch(() => { });
            dispatch(clearCustomerActiveServiceState());

            // Reset vendor distance tracking
            dispatch(resetVendorDistanceTracking());

            // Clear Redux cancelled service state (we're handling UI locally now)
            dispatch(clearServiceCancelled());

            // Show toast notification
            showToast({
                type: 'warning',
                title: 'Job Cancelled by Vendor',
                message: cancelledService.reason || 'The vendor has cancelled this job.',
                duration: 4000,
            });

            // NOTE: No auto-redirect - user will see "Request Cancelled" UI with Search Again option
        }
    }, [cancelledService, effectiveRequestId, dispatch, showToast, serviceCancelledByVendor]);

    // Handle vendor cancellation with request reset to pending (new flow)
    // Backend resets request to PENDING and re-broadcasts to other vendors
    useEffect(() => {
        // Check if vendor cancelled - handle even if effectiveRequestId is null
        // This can happen when proposals are cleared before currentRequest is re-evaluated
        if (vendorCancelledRequest &&
            (vendorCancelledRequest === effectiveRequestId || !effectiveRequestId)) {
            // Show toast - request is still active, searching for new vendors
            showToast({
                type: 'info',
                title: 'Vendor Cancelled',
                message: 'Searching for other vendors...',
                duration: 4000,
            });

            // Clear the flag
            dispatch(clearVendorCancelledRequest());

            // Reset vendor distance tracking
            dispatch(resetVendorDistanceTracking());

            if (__DEV__) {
                console.log('[LiveOffers] Vendor cancelled, request reset to pending - waiting for new proposals');
            }

            // If no active request anymore, navigate back to home/search
            if (!effectiveRequestId) {
                router.replace('/(customer)/(home)');
            }
            // Otherwise stay on this screen - backend will re-broadcast request and new proposals will arrive
        }
    }, [vendorCancelledRequest, effectiveRequestId, dispatch, showToast, router]);

    // =========================================================================
    // Periodic Stationary Check Timer
    // Checks if vendor has been stationary for 10+ minutes (no location updates)
    // This handles the case where vendor stops sending location updates entirely
    // =========================================================================
    useEffect(() => {
        // Only run when proposal is accepted and vendor has reached 1km
        if (!acceptedProposal) return;
        if (!vendorDistanceTracking.hasReached1km) return;
        if (vendorDistanceTracking.isVendorStationary) return; // Already marked stationary

        const STATIONARY_THRESHOLD_MS = 20 * 60 * 1000; // 20 minutes (production)
        const CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

        const checkStationaryInterval = setInterval(() => {
            const { lastMovementAt, hasReached1km, isVendorStationary } = vendorDistanceTracking;

            // Skip if conditions no longer met
            if (!hasReached1km || isVendorStationary || !lastMovementAt) return;

            const now = Date.now();
            const stationaryDuration = now - lastMovementAt;

            if (stationaryDuration >= STATIONARY_THRESHOLD_MS) {
                if (__DEV__) {
                    console.log('[LiveOffers] Vendor stationary for 10+ mins - enabling cancel button');
                }
                dispatch(setVendorStationary());
            }
        }, CHECK_INTERVAL_MS);

        return () => clearInterval(checkStationaryInterval);
    }, [acceptedProposal, vendorDistanceTracking.hasReached1km, vendorDistanceTracking.isVendorStationary, vendorDistanceTracking.lastMovementAt, dispatch]);

    // =========================================================================
    // Polling Fallback for Request Status (Production Safety Net)
    // Polls backend every 30 seconds to check if request was cancelled
    // This handles cases where WebSocket event is missed
    // =========================================================================
    useEffect(() => {
        // Only run when there's an accepted proposal and not already cancelled
        if (!acceptedProposal || !effectiveRequestId || serviceCancelledByVendor) return;

        const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds

        const checkRequestStatus = async () => {
            try {
                const response = await serviceRequestApi.get(effectiveRequestId);

                // Check if request was cancelled
                if (response.status === 'cancelled' && response.cancelled_by === 'vendor') {
                    if (__DEV__) {
                        console.log('[LiveOffers] Polling detected vendor cancellation:', response);
                    }

                    // Trigger the same flow as WebSocket cancellation
                    setServiceCancelledByVendor(true);
                    clearCustomerActiveService().catch(() => { });
                    dispatch(clearCustomerActiveServiceState());
                    dispatch(resetVendorDistanceTracking());
                    dispatch(clearCurrentCustomerRequest());

                    showToast({
                        type: 'warning',
                        title: 'Job Cancelled by Vendor',
                        message: response.cancellation_reason || 'The vendor has cancelled this job.',
                        duration: 4000,
                    });
                }
            } catch (error) {
                // Silently fail - WebSocket should handle most cases
                if (__DEV__) {
                    console.log('[LiveOffers] Polling check failed (non-critical):', error);
                }
            }
        };

        // Initial check after a short delay
        const initialCheck = setTimeout(checkRequestStatus, 5000);

        // Periodic polling
        const pollInterval = setInterval(checkRequestStatus, POLL_INTERVAL_MS);

        return () => {
            clearTimeout(initialCheck);
            clearInterval(pollInterval);
        };
    }, [acceptedProposal, effectiveRequestId, serviceCancelledByVendor, dispatch, showToast]);

    // =========================================================================
    // Server-Side Stationary Check on App Resume
    // Polls backend for vendor status when app comes to foreground
    // This handles cases where vendor's app was killed/backgrounded and no WebSocket updates
    // =========================================================================
    useEffect(() => {
        const checkVendorStatusOnForeground = async (nextAppState: AppStateStatus) => {
            // Only check when coming to foreground with accepted proposal and vendor has reached 1km
            if (
                appStateRef.current.match(/inactive|background/) &&
                nextAppState === 'active' &&
                acceptedProposal &&
                effectiveRequestId &&
                vendorDistanceTracking.hasReached1km &&
                !vendorDistanceTracking.isVendorStationary
            ) {
                try {
                    if (__DEV__) {
                        console.log('[LiveOffers] App foreground - checking vendor status from server');
                    }

                    const vendorStatus = await serviceRequestApi.getVendorStatus(effectiveRequestId);

                    if (__DEV__) {
                        console.log('[LiveOffers] Vendor status from server:', vendorStatus);
                    }

                    // If server says vendor is stationary and has reached 1km, enable cancel button
                    if (vendorStatus.can_cancel) {
                        if (__DEV__) {
                            console.log('[LiveOffers] Server confirms vendor stationary - enabling cancel');
                        }
                        dispatch(setVendorStationary());
                    }
                } catch (error) {
                    if (__DEV__) {
                        console.error('[LiveOffers] Vendor status check failed:', error);
                    }
                    // Silently fail - client-side timer is still running as fallback
                }
            }
        };

        const subscription = AppState.addEventListener('change', checkVendorStatusOnForeground);
        return () => subscription?.remove();
    }, [
        acceptedProposal,
        effectiveRequestId,
        vendorDistanceTracking.hasReached1km,
        vendorDistanceTracking.isVendorStationary,
        dispatch,
    ]);

    // Request expiry timer - uses restored expiresAt OR backend expires_at OR local countdown fallback
    // Priority: 1) URL params expiresAt (restored from SecureStore), 2) currentRequest.expires_at (from backend), 3) local fallback
    const requestStartTimeRef = useRef<number>(Date.now());

    // Check if restored from storage as already expired
    useEffect(() => {
        if (params.restoredStatus === 'expired') {
            setRequestExpired(true);
        }
    }, [params.restoredStatus]);

    useEffect(() => {
        // Skip if proposal already accepted, request already expired, or vendor cancelled
        if (acceptedProposal || requestExpired || serviceCancelledByVendor) return;

        const calculateTimeLeft = () => {
            // Priority 1: URL params expiresAt (restored from SecureStore - most reliable)
            if (params.expiresAt) {
                const expiresAt = new Date(params.expiresAt).getTime();
                return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
            }
            // Priority 2: Backend expires_at from currentRequest
            if (currentRequest?.expires_at) {
                const expiresAt = new Date(currentRequest.expires_at).getTime();
                return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
            }
            // Priority 3: Fallback to local countdown from component mount/start
            const elapsed = Math.floor((Date.now() - requestStartTimeRef.current) / 1000);
            return Math.max(0, CONSTANTS.REQUEST_TIMEOUT_SECONDS - elapsed);
        };

        // Initial calculation
        const initialTime = calculateTimeLeft();
        if (isMountedRef.current) {
            setRequestTimeLeft(initialTime);
            if (initialTime <= 0) {
                setRequestExpired(true);
                // Persist expired state to SecureStore
                markCustomerActiveServiceExpired().catch((err) => {
                    if (__DEV__) console.error('[LiveOffers] Failed to mark expired:', err);
                });
                return;
            }
        }

        // Use setTimeout chain for better stability on low-end devices
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const updateTimer = () => {
            if (!isMountedRef.current) return;

            const remaining = calculateTimeLeft();
            setRequestTimeLeft(remaining);

            if (remaining <= 0) {
                setRequestExpired(true);
                // Persist expired state to SecureStore
                markCustomerActiveServiceExpired().catch((err) => {
                    if (__DEV__) console.error('[LiveOffers] Failed to mark expired:', err);
                });
            } else {
                // Schedule next update
                timeoutId = setTimeout(updateTimer, 1000);
            }
        };

        // Start timer chain
        timeoutId = setTimeout(updateTimer, 1000);

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [params.expiresAt, currentRequest?.expires_at, acceptedProposal, requestExpired, serviceCancelledByVendor]);

    // =========================================================================
    // STAGED INITIALIZATION EFFECT
    // Serializes heavy operations to prevent crash on low-end devices
    // Flow: loading (500ms) → connecting → syncing (max 3s) → ready
    // Increased initial delay to let any rapid socket events settle
    // =========================================================================
    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            // Stage 1: Extended delay to let component stabilize AND socket events settle
            // This prevents CPU spike from immediate heavy operations
            // Also allows batched expired events to process before we render the map
            await new Promise(r => setTimeout(r, 500));
            if (!mounted) return;

            // Stage 2: Connect socket if needed
            if (!isConnected && connectionStatus !== 'connecting') {
                if (mounted) setInitStage('connecting');
                try {
                    await dispatch(connectSocket());
                } catch (error) {
                    if (__DEV__) console.error('[LiveOffers] Socket connect failed:', error);
                }
            }
            if (!mounted) return;

            // Additional delay after connection to let any burst of events settle
            // This is critical - backend sends multiple events (synced, expired) rapidly
            await new Promise(r => setTimeout(r, 300));
            if (!mounted) return;

            // Stage 3: Wait for data sync (with timeout)
            if (mounted) setInitStage('syncing');
            const syncTimeout = 3000; // 3 second max wait (reduced - events already settled)
            const startTime = Date.now();

            // Wait for customerRequests to populate OR timeout
            while (customerRequests.length === 0 && Date.now() - startTime < syncTimeout) {
                await new Promise(r => setTimeout(r, 200));
                if (!mounted) return;
            }

            // Stage 4: Ready - map can now render
            // Additional small delay to ensure Redux state is stable
            if (mounted) {
                await new Promise(r => setTimeout(r, 100));
                // Use InteractionManager to defer final state update
                InteractionManager.runAfterInteractions(() => {
                    if (mounted) {
                        if (__DEV__) {
                            console.log('[LiveOffers] Initialization complete, rendering map');
                        }
                        setInitStage('ready');
                    }
                });
            }
        };

        initialize();

        return () => {
            mounted = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

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
    // IMPORTANT: Only animate after initialization is complete to prevent CPU spike
    useEffect(() => {
        if (serviceLocation && !acceptedProposal && initStage === 'ready') {
            // Defer animation to avoid blocking main thread during initial render
            InteractionManager.runAfterInteractions(() => {
                mapRef.current?.animateToRegion({
                    ...serviceLocation,
                    latitudeDelta: CONSTANTS.MAP_DELTA,
                    longitudeDelta: CONSTANTS.MAP_DELTA,
                }, 1000);
            });
        }
    }, [serviceLocation, acceptedProposal, initStage]);

    // Handlers
    // Accept proposal with proper serialization to prevent crash on low-end devices
    const handleAcceptProposal = useCallback(async (proposalId: number) => {
        try {
            setAcceptingId(proposalId);

            // Wait for any pending animations/interactions to complete before heavy operation
            // This prevents CPU spike from concurrent animations + network + state updates
            await new Promise<void>(resolve => {
                InteractionManager.runAfterInteractions(() => resolve());
            });

            // Now do the socket accept (this waits for ACK)
            await dispatch(acceptProposal(proposalId)).unwrap();

            // Update Redux state for logout restriction
            if (effectiveRequestId) {
                dispatch(setCustomerActiveService({ requestId: effectiveRequestId, status: 'accepted' }));
            }

            // Persist vendor info for offline display after app kill
            const acceptedProposal = proposals.find(p => p.id === proposalId);
            if (acceptedProposal?.vendor) {
                const { updateAcceptedVendorInfo } = require('@/services/customerActiveServiceService');
                updateAcceptedVendorInfo({
                    id: acceptedProposal.vendor.id,
                    full_name: acceptedProposal.vendor.full_name,
                    phone: acceptedProposal.vendor.phone,
                    average_rating: acceptedProposal.vendor.average_rating,
                    total_reviews: acceptedProposal.vendor.total_reviews,
                }).catch((error: any) => {
                    if (__DEV__) console.error('[LiveOffers] Failed to persist vendor info:', error);
                });

                // Prefetch vendor avatar for smooth map marker rendering
                if (acceptedProposal.vendor.profile_photo_url) {
                    Image.prefetch(acceptedProposal.vendor.profile_photo_url).catch((error) => {
                        if (__DEV__) console.log('[Avatar] Prefetch failed:', error);
                    });
                }
            }

            // Defer non-critical UI operations to after the main thread is free
            // This prevents jank and potential crash from too many simultaneous updates
            InteractionManager.runAfterInteractions(() => {
                // Safe null check for bottomSheetRef
                if (bottomSheetRef.current) {
                    bottomSheetRef.current.snapToIndex(0);
                }

                // Set cancel disable timer (1 minute)
                const now = Date.now();
                setAcceptedAt(now);
                setCancelDisableTimeLeft(Math.ceil(CANCEL_DISABLE_DURATION_MS / 1000));

                // SecureStore write in background - don't block UI
                updateCustomerActiveServiceAcceptance(proposalId, now).catch((error) => {
                    if (__DEV__) console.error('[LiveOffers] Failed to update acceptance:', error);
                });
            });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to accept proposal. Please try again.';
            showToast({ type: 'error', title: 'Error', message: errorMessage });
        } finally {
            setAcceptingId(null);
        }
    }, [dispatch, showToast]);

    const handleDeclineProposal = useCallback(async (proposalId: number) => {
        try {
            setDecliningId(proposalId);
            await dispatch(declineProposal(proposalId)).unwrap();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to decline proposal.';
            showToast({ type: 'error', title: 'Error', message: errorMessage });
        } finally {
            setDecliningId(null);
        }
    }, [dispatch]);

    // Navigate to vendor profile
    const handleVendorProfileTap = useCallback((vendorId: number) => {
        router.push({
            pathname: '/(customer)/(favorites)/vendor-detail',
            params: { vendorId: vendorId.toString() }
        });
    }, [router]);

    // Manually refresh vendor location from API
    const handleRefreshVendorLocation = useCallback(async () => {
        if (!effectiveRequestId || isRefreshingLocation) return;

        try {
            setIsRefreshingLocation(true);

            if (__DEV__) {
                console.log('[LiveOffers] Manually refreshing vendor location from API');
            }

            const response = await serviceRequestApi.getVendorLocation(effectiveRequestId);

            if (response.vendor_location) {
                // Update Redux
                dispatch(setVendorLocation({
                    latitude: response.vendor_location.latitude,
                    longitude: response.vendor_location.longitude,
                }));

                // Persist for future app kills
                const { updateVendorLocation } = require('@/services/customerActiveServiceService');
                await updateVendorLocation(
                    response.vendor_location.latitude,
                    response.vendor_location.longitude
                );

                showToast({ type: 'success', title: 'Location updated' });

                // Reset age counter
                setLocationAge(0);
            } else if (!response.is_online) {
                showToast({ type: 'warning', title: 'Vendor is currently offline' });
            } else {
                showToast({ type: 'info', title: 'No location available yet' });
            }
        } catch (error) {
            if (__DEV__) {
                console.error('[LiveOffers] Failed to refresh vendor location:', error);
            }
            showToast({ type: 'error', title: 'Unable to refresh location' });
        } finally {
            setIsRefreshingLocation(false);
        }
    }, [effectiveRequestId, isRefreshingLocation, dispatch, showToast]);

    // Handle "I'm Coming" button - notify vendor that customer is coming
    const handleImComing = useCallback(async () => {
        if (!effectiveRequestId || isSendingComingAck || hasSentComingAck) return;

        try {
            setIsSendingComingAck(true);

            // Send acknowledgement via WebSocket
            socketService.send('customer.coming', {
                service_request_id: effectiveRequestId,
            });

            // Mark as sent (assume success - backend will send error if failed)
            setHasSentComingAck(true);

            showToast({
                type: 'success',
                title: 'Notification Sent',
                message: 'The vendor has been notified that you are coming.',
                duration: 3000,
            });

            if (__DEV__) {
                console.log('[LiveOffers] Sent customer.coming acknowledgement for request:', effectiveRequestId);
            }
        } catch (error) {
            console.error('[LiveOffers] Failed to send coming acknowledgement:', error);
            showToast({
                type: 'error',
                title: 'Failed',
                message: 'Could not notify the vendor. Please try again.',
                duration: 3000,
            });
        } finally {
            setIsSendingComingAck(false);
        }
    }, [effectiveRequestId, isSendingComingAck, hasSentComingAck, showToast]);

    // Open cancel modal
    const handleCancelRequest = useCallback(() => {
        setShowCancelModal(true);
    }, []);

    // Handle cancel confirmation from modal
    const handleConfirmCancel = useCallback(async (
        reasonCode?: CustomerCancelReasonCode,
        customReason?: string
    ) => {
        if (!effectiveRequestId) return;

        try {
            setIsCancelling(true);

            // Set up a one-time error listener to catch backend rejection
            let errorHandled = false;
            const errorTimeout = setTimeout(() => {
                // If no error after 3 seconds, assume success
                if (!errorHandled) {
                    handleCancelSuccess();
                }
            }, 3000);

            const handleCancelSuccess = async () => {
                if (errorHandled) return;
                errorHandled = true;
                clearTimeout(errorTimeout);

                if (__DEV__) {
                    console.log('[LiveOffers] Request cancelled via WebSocket:', effectiveRequestId, reasonCode);
                }

                // Clear persisted active service
                await clearCustomerActiveService().catch(() => { });
                dispatch(clearCustomerActiveServiceState());

                // Reset vendor distance tracking for next request
                dispatch(resetVendorDistanceTracking());

                // Close modal
                setShowCancelModal(false);
                setIsCancelling(false);

                // Navigate away
                if (router.canGoBack()) {
                    router.back();
                } else {
                    router.replace('/(customer)/(home)/');
                }
            };

            // Listen for error event from WebSocket
            const unsubscribe = socketService.on('error', (data: {
                code?: string;
                message?: string;
                details?: {
                    distance_covered_km?: number;
                    inactive_minutes?: number;
                    required_inactive_minutes?: number;
                };
            }) => {
                if (errorHandled) return;

                // Check if this is the cancel rejection error
                if (data.code === 'cancel_not_allowed_vendor_nearby') {
                    errorHandled = true;
                    clearTimeout(errorTimeout);
                    unsubscribe();
                    setIsCancelling(false);

                    // Update local state to hide cancel button
                    dispatch(setVendorReached1km({
                        distanceTowardsLocationKm: data.details?.distance_covered_km || 1.0,
                        currentDistanceKm: 0,
                        initialDistanceKm: 0,
                    }));

                    // Show informative alert
                    const remainingMinutes = Math.ceil(
                        (data.details?.required_inactive_minutes || 20) - (data.details?.inactive_minutes || 0)
                    );
                    showToast({
                        type: 'warning',
                        title: 'Cannot Cancel',
                        message: `The vendor has traveled ${data.details?.distance_covered_km?.toFixed(1) || '1.0'}km towards you. Cancellation will be available after ${remainingMinutes} more minutes if the vendor is inactive.`,
                        duration: 5000,
                    });
                    setShowCancelModal(false);
                }
            });

            // Listen for successful cancellation acknowledgment
            const unsubscribeAck = socketService.on('vendor.cancelled.ack', () => {
                if (!errorHandled) {
                    handleCancelSuccess();
                }
                unsubscribeAck();
            });

            // Send cancel request via WebSocket
            socketService.send('vendor.cancel', {
                service_request_id: effectiveRequestId,
                reason: customReason || undefined,
            });

            // Clean up error listener after timeout or success
            setTimeout(() => {
                unsubscribe();
                unsubscribeAck();
            }, 5000);

        } catch (error) {
            if (__DEV__) {
                console.error('[LiveOffers] Cancel WebSocket failed:', error);
            }
            showToast({ type: 'error', title: 'Error', message: 'Failed to cancel request. Please try again.' });
            setIsCancelling(false);
        }
    }, [effectiveRequestId, router, dispatch, showToast]);

    // Handle retry request - create new request with same parameters
    const handleRetryRequest = useCallback(async () => {
        if (!originalRequestParams) {
            showToast({ type: 'error', title: 'Error', message: 'Request details not available. Please create a new request.' });
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

            showToast({ type: 'success', title: 'Success', message: 'Request re-submitted! Finding nearby vendors...' });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to retry request';
            showToast({ type: 'error', title: 'Error', message: errorMessage });
        } finally {
            setIsRetrying(false);
        }
    }, [originalRequestParams, router, showToast]);

    /**
     * Renders map markers - styled circular markers with icons
     * Uses collapsable={false} for Android rendering and tracksViewChanges={false} for memory optimization
     */
    function renderMarkers(): React.ReactNode {
        if (!serviceLocation) return null;

        return (
            <>
                {/* Service Address Marker - Styled pin with tail */}
                <Marker
                    key="service-location"
                    coordinate={serviceLocation}
                    anchor={{ x: 0.5, y: 1 }}
                    tracksViewChanges={false}
                >
                    <View collapsable={false} style={styles.destinationMarkerContainer}>
                        <View collapsable={false} style={styles.destinationPin}>
                            <Ionicons name="location" size={22} color={COLORS.white} />
                        </View>
                        <View style={styles.destinationPinTail} />
                    </View>
                </Marker>

                {/* Vendor Marker - Person icon in styled circle */}
                {acceptedProposal && vendorLocation && !serviceCancelledByVendor && (
                    <Marker
                        key={`vendor-${acceptedProposal.id}`}
                        coordinate={vendorLocation}
                        anchor={{ x: 0.5, y: 0.5 }}
                        tracksViewChanges={false}
                    >
                        <View collapsable={false} style={vendorHasArrived ? styles.carMarkerArrived : styles.carMarkerContainer}>
                            <Ionicons
                                name="person"
                                size={22}
                                color={vendorHasArrived ? COLORS.success : COLORS.primary}
                            />
                        </View>
                    </Marker>
                )}
            </>
        );
    }

    // Render proposal item
    const renderProposalItem = useCallback(({ item }: { item: SocketProposal }) => (
        <ErrorBoundary>
            <ProposalCard
                proposal={item}
                onAccept={handleAcceptProposal}
                onDecline={handleDeclineProposal}
                onVendorTap={handleVendorProfileTap}
                isAccepting={acceptingId === item.id}
                isDeclining={decliningId === item.id}
            />
        </ErrorBoundary>
    ), [handleAcceptProposal, handleDeclineProposal, handleVendorProfileTap, acceptingId, decliningId]);

    // Include acceptance_expires_at in key so FlatList treats updated proposals as new items
    const keyExtractor = useCallback((item: SocketProposal) =>
        `${item.id}-${item.acceptance_expires_at || ''}`, []);

    const getItemLayout = useCallback((_: ArrayLike<SocketProposal> | null | undefined, index: number) => ({
        length: CONSTANTS.PROPOSAL_CARD_HEIGHT,
        offset: CONSTANTS.PROPOSAL_CARD_HEIGHT * index,
        index,
    }), []);

    // =========================================================================
    // STAGED LOADING MESSAGE
    // Computed before render to avoid hook inside conditional
    // =========================================================================
    const loadingMessage = useMemo(() => {
        if (!serviceLocation) return 'Loading service request...';
        switch (initStage) {
            case 'loading': return 'Preparing...';
            case 'connecting': return 'Connecting to server...';
            case 'syncing': return 'Loading offers...';
            default: return 'Almost ready...';
        }
    }, [serviceLocation, initStage]);

    // =========================================================================
    // MEMOIZED ROUTE POLYLINES
    // IMPORTANT: Moved outside JSX to prevent "rendered more hooks" error
    // This useMemo MUST be called before the early return to maintain hook order
    // =========================================================================
    const routePolylines = useMemo(() => {
        // Hide route when vendor has arrived (status = 'arrived') or service started (status = 'in_progress')
        const vendorHasArrivedOrServiceStarted = currentRequest?.status === 'arrived' || currentRequest?.status === 'in_progress';
        if (routeCoords.length === 0 || serviceCancelledByVendor || vendorHasArrivedOrServiceStarted) {
            return null;
        }
        return (
            <>
                {/* Shadow/glow layer */}
                <Polyline
                    coordinates={routeCoords}
                    strokeColor={routeColors.shadow}
                    strokeWidth={routeWidths.shadow}
                />
                {/* Middle layer */}
                <Polyline
                    coordinates={routeCoords}
                    strokeColor={routeColors.middle}
                    strokeWidth={routeWidths.middle}
                />
                {/* Main route line */}
                <Polyline
                    coordinates={routeCoords}
                    strokeColor={routeColors.main}
                    strokeWidth={routeWidths.main}
                />
            </>
        );
    }, [routeCoords, serviceCancelledByVendor, currentRequest?.status]);

    // =========================================================================
    // STAGED LOADING SCREEN
    // Shows different messages based on initialization stage
    // =========================================================================
    if (!serviceLocation || initStage !== 'ready') {
        return (
            <View style={styles.centerContainer}>
                <LinearGradient
                    colors={[COLORS.primary, COLORS.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.loadingGradient}
                >
                    <ActivityIndicator size="large" color={COLORS.white} />
                    <Text style={styles.loadingText}>{loadingMessage}</Text>
                    {/* Stage indicator for debugging */}
                    {__DEV__ && (
                        <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8, opacity: 0.7 }]}>
                            Stage: {initStage}
                        </Text>
                    )}
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
                        onPress={() => {
                            // Safe navigation - check if back is possible
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/(customer)/(home)/');
                            }
                        }}
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

            {/* Map - inDrive style with custom styling */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                customMapStyle={lightMapStyle}
                initialRegion={{
                    ...serviceLocation,
                    latitudeDelta: CONSTANTS.MAP_DELTA,
                    longitudeDelta: CONSTANTS.MAP_DELTA,
                }}
            >
                {/* Gradient Route - 3 layer polylines for glow effect (inDrive style) */}
                {/* Memoized outside JSX to prevent "rendered more hooks" error */}
                {routePolylines}
                {renderMarkers()}
            </MapView>

            {/* Vendor Tracking Info (when route is being tracked) - hide when vendor cancels */}
            {acceptedProposal && vendorLocation && !serviceCancelledByVendor && (
                <View style={styles.trackingInfoCard}>
                    {/* Show arrival/service status when vendor has arrived or service started */}
                    {(currentRequest?.status === 'arrived' || currentRequest?.status === 'in_progress') ? (
                        <View>
                            <View style={styles.trackingInfoRow}>
                                <View style={styles.trackingInfoItem}>
                                    <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                                    <Text type="bodySemiBold" style={[styles.trackingInfoValue, { color: COLORS.success, marginLeft: scale(8) }]}>
                                        {currentRequest?.status === 'arrived'
                                            ? 'Vendor has arrived'
                                            : 'Service in progress'}
                                    </Text>
                                </View>
                            </View>
                            {/* "I'm Coming" button - only show when status is 'arrived' */}
                            {currentRequest?.status === 'arrived' && !hasSentComingAck && (
                                <TouchableOpacity
                                    style={styles.imComingButton}
                                    onPress={handleImComing}
                                    disabled={isSendingComingAck}
                                    activeOpacity={0.7}
                                >
                                    {isSendingComingAck ? (
                                        <ActivityIndicator size="small" color={COLORS.white} />
                                    ) : (
                                        <>
                                            <Ionicons name="walk" size={18} color={COLORS.white} />
                                            <Text type="bodySemiBold" style={styles.imComingButtonText}>I'm Coming</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                            {/* Show confirmation when already sent */}
                            {currentRequest?.status === 'arrived' && hasSentComingAck && (
                                <View style={styles.comingAckSent}>
                                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                    <Text type="body" style={styles.comingAckSentText}>Vendor notified</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <>
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

                            {/* Location staleness indicator + manual refresh */}
                            {locationAge > 2 * 60 * 1000 && (
                                <View style={styles.locationAgeRow}>
                                    <View style={[
                                        styles.locationAgeBadge,
                                        locationAge > 30 * 60 * 1000 && styles.locationAgeBadgeStale
                                    ]}>
                                        <Ionicons
                                            name="time-outline"
                                            size={14}
                                            color={locationAge > 30 * 60 * 1000 ? COLORS.error : COLORS.warning}
                                        />
                                        <Text style={[
                                            styles.locationAgeText,
                                            locationAge > 30 * 60 * 1000 && styles.locationAgeTextStale
                                        ]}>
                                            {Math.floor(locationAge / 60000)} min ago
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={handleRefreshVendorLocation}
                                        style={styles.refreshLocationButton}
                                        disabled={isRefreshingLocation}
                                    >
                                        {isRefreshingLocation ? (
                                            <ActivityIndicator size="small" color={COLORS.primary} />
                                        ) : (
                                            <>
                                                <Ionicons name="location" size={14} color={COLORS.primary} />
                                                <Text style={styles.refreshLocationText}>Update</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    )}
                </View>
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
                            colors={serviceCancelledByVendor
                                ? [COLORS.error, '#dc2626']
                                : requestExpired && !acceptedProposal
                                    ? [COLORS.warning, '#f59e0b']
                                    : [COLORS.primary, COLORS.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.sheetTitleGradient}
                        >
                            <Text type="subtitle" style={styles.sheetTitle}>
                                {serviceCancelledByVendor
                                    ? 'Request Cancelled'
                                    : currentRequest?.status === 'in_progress'
                                        ? 'Service in progress'
                                        : currentRequest?.status === 'arrived'
                                            ? 'Vendor has arrived'
                                            : acceptedProposal
                                                ? 'Vendor on the way'
                                                : requestExpired
                                                    ? 'Request Expired'
                                                    : activeProposals.length === 0
                                                        ? 'Waiting for proposals...'
                                                        : `${activeProposals.length} Proposal${activeProposals.length > 1 ? 's' : ''} Received`
                                }
                            </Text>
                        </LinearGradient>
                    </View>

                    {/* Content */}
                    {acceptedProposal && !serviceCancelledByVendor ? (
                        // Accepted state - hide when vendor cancels
                        <View style={styles.acceptedContainer}>
                            <ErrorBoundary>
                                <ProposalCard
                                    proposal={acceptedProposal}
                                    onAccept={() => { }}
                                    onDecline={() => { }}
                                    onVendorTap={handleVendorProfileTap}
                                    isAccepting={false}
                                    isDeclining={false}
                                />
                            </ErrorBoundary>

                            {/* Cancel Request Button - Shows based on vendor distance and time logic */}
                            {/* Also hide when vendor has arrived (within 100m) */}
                            {canCustomerCancel && !vendorHasArrived && (
                                <TouchableOpacity
                                    style={styles.cancelButtonInSheetAccepted}
                                    onPress={handleCancelRequest}
                                    activeOpacity={0.7}
                                >
                                    <LinearGradient
                                        colors={[COLORS.error, '#dc2626']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.cancelButtonGradient}
                                    >
                                        <Ionicons name="close-circle" size={20} color={COLORS.white} />
                                        <Text style={styles.cancelButtonGradientText}>Cancel Request</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : requestExpired && !serviceCancelledByVendor ? (
                        // Request expired - show search again + cancel buttons (skip if vendor cancelled)
                        <View style={styles.emptyState}>
                            <View style={styles.expiredIconContainer}>
                                <Ionicons name="time-outline" size={64} color={COLORS.warning} />
                            </View>
                            <Text type="body" style={styles.emptyTitle}>
                                Request Expired
                            </Text>
                            <Text style={styles.emptyText}>
                                No vendors responded in time. Would you like to search again?
                            </Text>

                            {/* Search Again Button (Primary) */}
                            <TouchableOpacity
                                style={styles.searchAgainButton}
                                onPress={handleRetryRequest}
                                disabled={isRetrying}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.accent]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.searchAgainButtonInner}
                                >
                                    {isRetrying ? (
                                        <ActivityIndicator color={COLORS.white} size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="search" size={20} color={COLORS.white} />
                                            <Text style={styles.searchAgainText}>Search Again</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Cancel Button (Secondary) */}
                            <TouchableOpacity
                                style={styles.cancelButtonSecondary}
                                onPress={handleCancelRequest}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.cancelButtonSecondaryText}>Cancel Request</Text>
                            </TouchableOpacity>
                        </View>
                    ) : serviceCancelledByVendor ? (
                        // Vendor cancelled - show search again UI
                        <View style={styles.emptyState}>
                            <View style={styles.expiredIconContainer}>
                                <Ionicons name="close-circle-outline" size={64} color={COLORS.error} />
                            </View>
                            <Text type="body" style={styles.emptyTitle}>
                                Request Cancelled
                            </Text>
                            <Text style={styles.emptyText}>
                                The vendor has cancelled this job. Would you like to search for another vendor?
                            </Text>

                            {/* Search Again Button (Primary) */}
                            <TouchableOpacity
                                style={styles.searchAgainButton}
                                onPress={handleRetryRequest}
                                disabled={isRetrying}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.accent]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.searchAgainButtonInner}
                                >
                                    {isRetrying ? (
                                        <ActivityIndicator color={COLORS.white} size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="search" size={20} color={COLORS.white} />
                                            <Text style={styles.searchAgainText}>Search Again</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Go Home Button (Secondary) */}
                            <TouchableOpacity
                                style={styles.cancelButtonSecondary}
                                onPress={() => router.replace('/(customer)/(home)')}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.cancelButtonSecondaryText}>Go Home</Text>
                            </TouchableOpacity>
                        </View>
                    ) : activeProposals.length === 0 ? (
                        // Waiting state - no proposals yet
                        <View style={styles.emptyState}>
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

                            {/* Cancel Button inside bottom sheet */}
                            <TouchableOpacity
                                style={styles.cancelButtonInSheet}
                                onPress={handleCancelRequest}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.cancelButtonInSheetText}>Cancel Request</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // Proposals list with cancel button
                        <View style={styles.proposalsContainer}>
                            <FlatList
                                data={activeProposals}
                                renderItem={renderProposalItem}
                                keyExtractor={keyExtractor}
                                extraData={activeProposals.map(p => `${p.id}-${p.acceptance_expires_at}`).join(',')}
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

                            {/* Cancel Button at bottom of proposals */}
                            <TouchableOpacity
                                style={styles.cancelButtonInSheet}
                                onPress={handleCancelRequest}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.cancelButtonInSheetText}>Cancel Request</Text>
                            </TouchableOpacity>
                        </View>
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

            {/* Cancel Request Modal */}
            <CancelRequestModal
                visible={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={handleConfirmCancel}
                isLoading={isCancelling}
                proposalCount={activeProposals.length}
                status={acceptedProposal ? 'accepted' : 'pending'}
            />
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
        paddingTop: verticalScale(12),
        paddingBottom: verticalScale(10),
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
    // Destination pin marker container - explicit dimensions for Android
    destinationMarkerContainer: {
        width: 50,
        height: 60, // Taller to accommodate tail
        alignItems: 'center',
        justifyContent: 'flex-start',
    },

    destinationPin: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.white,
        // Shadow for iOS
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        // Elevation for Android
        elevation: 6,
    },

    destinationPinTail: {
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: COLORS.accent,
        marginTop: -2,
    },
    // Vendor person marker - fully rounded circle with shadow
    // Note: This is used directly without a container wrapper
    carMarkerContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.primary,
        // Shadow for iOS
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        // Elevation for Android
        elevation: 6,
    },
    carMarkerArrived: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.success,
        // Shadow for iOS
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        // Elevation for Android
        elevation: 6,
    },

    // Tracking info card
    trackingInfoCard: {
        position: 'absolute',
        top: verticalScale(85),
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

    // "I'm Coming" button (customer response to vendor arrival)
    imComingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        marginTop: verticalScale(12),
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(20),
        backgroundColor: COLORS.primary,
        borderRadius: moderateScale(10),
    },
    imComingButtonText: {
        color: COLORS.white,
        fontSize: moderateScale(14),
    },
    comingAckSent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(6),
        marginTop: verticalScale(10),
        paddingVertical: verticalScale(8),
        paddingHorizontal: scale(16),
        backgroundColor: COLORS.success + '15',
        borderRadius: moderateScale(8),
    },
    comingAckSentText: {
        color: COLORS.success,
        fontSize: moderateScale(13),
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

    // Search Again button (primary action in expired state)
    searchAgainButton: {
        marginTop: verticalScale(20),
        borderRadius: moderateScale(12),
        overflow: 'hidden',
        width: '100%',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    searchAgainButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(24),
        gap: scale(8),
    },
    searchAgainText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: moderateScale(16),
    },

    // Cancel button (secondary, inside bottom sheet)
    cancelButtonInSheet: {
        marginTop: verticalScale(16),
        paddingVertical: verticalScale(12),
        alignItems: 'center',
    },
    cancelButtonInSheetText: {
        color: COLORS.error,
        fontSize: moderateScale(14),
        fontWeight: '600',
    },

    // Cancel button for accepted state (with gradient, shows conditionally based on distance/time)
    cancelButtonInSheetAccepted: {
        marginTop: verticalScale(16),
        borderRadius: scale(12),
        overflow: 'hidden',
    },
    cancelButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(20),
        gap: scale(8),
    },
    cancelButtonGradientText: {
        color: COLORS.white,
        fontSize: moderateScale(15),
        fontWeight: '700',
    },

    // Cancel button secondary (in expired state)
    cancelButtonSecondary: {
        marginTop: verticalScale(16),
        paddingVertical: verticalScale(12),
        alignItems: 'center',
    },
    cancelButtonSecondaryText: {
        color: COLORS.gray600,
        fontSize: moderateScale(14),
        fontWeight: '500',
        textDecorationLine: 'underline',
    },

    // Proposals container (wraps FlatList + cancel button)
    proposalsContainer: {
        flex: 1,
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
    avatarImage: {
        width: moderateScale(50),
        height: moderateScale(50),
        borderRadius: moderateScale(25),
    },
    avatarPlaceholder: {
        width: moderateScale(50),
        height: moderateScale(50),
        borderRadius: moderateScale(25),
        justifyContent: 'center',
        alignItems: 'center',
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
    vendorNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
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
        alignItems: 'stretch',
        padding: scale(16),
        paddingTop: verticalScale(12),
        gap: scale(12),
    },
    declineButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(10),
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
        flex: 1,
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
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(10),
        gap: scale(6),
    },
    acceptText: {
        fontSize: moderateScale(14),
        fontWeight: '700',
        color: COLORS.white,
    },

    // Contact Buttons (Call/WhatsApp) - Show when proposal is accepted
    contactButtonsContainer: {
        flexDirection: 'row',
        gap: scale(12),
        marginTop: verticalScale(12),
        paddingHorizontal: scale(4),
        marginBottom: verticalScale(12),
        
    },
    callButton: {
        flex: 1,
        borderRadius: moderateScale(10),
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    contactButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(16),
        gap: scale(8),
        // marginBottom:moderateScale(10)
    },
    contactButtonText: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: COLORS.white,
    },
    whatsappButton: {
        flex: 1,
        borderRadius: moderateScale(10),
        overflow: 'hidden',
        shadowColor: '#25D366',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    whatsappButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(12),
        // paddingHorizontal: scale(16),
        gap: scale(8),
    },
    whatsappButtonText: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: '#25D366',
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

    // Route loading indicator (shows when Google Routes API is updating)
    routeLoadingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: verticalScale(8),
        gap: scale(6),
    },
    routeLoadingText: {
        fontSize: moderateScale(11),
        color: COLORS.gray500,
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

    // Location age indicator
    locationAgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: verticalScale(8),
        paddingTop: verticalScale(8),
        borderTopWidth: 1,
        borderTopColor: COLORS.gray300,
    },
    locationAgeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.warning + '15',
        paddingVertical: verticalScale(4),
        paddingHorizontal: scale(8),
        borderRadius: moderateScale(12),
        gap: scale(4),
    },
    locationAgeBadgeStale: {
        backgroundColor: COLORS.error + '15',
    },
    locationAgeText: {
        fontSize: moderateScale(11),
        color: COLORS.warning,
        fontWeight: '600',
    },
    locationAgeTextStale: {
        color: COLORS.error,
    },
    refreshLocationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '10',
        paddingVertical: verticalScale(4),
        paddingHorizontal: scale(10),
        borderRadius: moderateScale(12),
        gap: scale(4),
    },
    refreshLocationText: {
        fontSize: moderateScale(11),
        color: COLORS.primary,
        fontWeight: '600',
    },
});
