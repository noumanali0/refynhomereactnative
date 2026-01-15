// app/(vendor)/(servicerequests)/websocket-request-details.tsx
/**
 * WebSocket Request Details Screen
 *
 * Vendor view for service request details with real-time proposal sending
 * using WebSocket dispatch system.
 */

import React, { useCallback, useEffect, useState, useRef, useMemo, memo } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Animated,
    BackHandler,
    AppState,
    AppStateStatus,
    InteractionManager,
    Platform,
    TextInput,
} from 'react-native';
import Text from '@/components/common/Text';
import CancelJobModal from '@/components/vendor/CancelJobModal';
import CompleteServiceModal from '@/components/vendor/CompleteServiceModal';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import type { AppDispatch, RootState } from '@/store';
import {
    selectServiceRequestById,
    selectIsPending,
    selectProposalsByRequestId,
    sendProposal,
    completeService,
    updateLocation,
    cleanupCompletedService,
    selectCancelledService,
    clearServiceCancelled,
    removeServiceRequest,
} from '@/store/slices/dispatchSlice';
import { COLORS } from '@/constants/colors';
import type { Coordinates } from '@/types/socket';
import { serviceRequestApi, type VendorCancelReasonCode } from '@/services/serviceRequestApi';
import { socketService } from '@/services/socketService';
import { useToast } from '@/contexts/ToastContext';
import {
    startBackgroundLocationTracking,
    stopBackgroundLocationTracking,
    isBackgroundLocationRunning,
    flushLocationQueue,
} from '@/services/backgroundLocationService';
import { getDistance } from '@/utils/distanceCache';
import { simplifyRoute } from '@/utils/polylineSimplify';
import { activeJobService } from '@/services/activeJobService';
import { haversineDistanceKm } from '@/utils/geo';
// Google Routes API service - ready for integration when client enables the API
// import { googleDirectionsService, type RouteInfo } from '@/services/googleDirectionsService';

interface RouteInfo {
    distance: number;
    duration: number;
    coordinates: Coordinates[];
}

// ============================================================================
// Constants for Route Optimization
// ============================================================================

const ROUTE_CONSTANTS = {
    /** Minimum time between route API calls in milliseconds */
    THROTTLE_MS: 15000, // 15 seconds (optimized for low-end devices)
    /** Minimum distance change in meters to trigger route refetch */
    SIGNIFICANT_DISTANCE_M: 100,
} as const;

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in meters.
 */
function getDistanceInMeters(
    coord1: Coordinates,
    coord2: Coordinates
): number {
    return haversineDistanceKm(
        coord1.latitude,
        coord1.longitude,
        coord2.latitude,
        coord2.longitude
    ) * 1000; // Convert km to meters
}

export default function WebSocketRequestDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const requestId = parseInt(id || '0', 10);
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();
    const navigation = useNavigation();
    const { showToast } = useToast();
    const mapRef = useRef<MapView>(null);
    const bottomSheetRef = useRef<BottomSheet>(null);
    const progressAnim = useRef(new Animated.Value(1)).current;

    // Redux state
    const request = useSelector((s: RootState) => selectServiceRequestById(s, requestId));
    const isPendingProposal = useSelector((s: RootState) =>
        selectIsPending(s, `proposal_${requestId}`)
    );
    const isPendingComplete = useSelector((s: RootState) =>
        selectIsPending(s, `route_complete_${requestId}`)
    );
    const cancelledService = useSelector(selectCancelledService);

    // Get proposals for this request to check if vendor's proposal was accepted
    const proposals = useSelector((s: RootState) => selectProposalsByRequestId(s, requestId));
    const acceptedProposal = useMemo(() => {
        return proposals.find(p => p.status === 'accepted');
    }, [proposals]);

    // Determine if service is accepted using multiple conditions
    // This handles real-time updates when backend doesn't send vendor_status
    const isAccepted = useMemo(() => {
        // If request is undefined (removed from Redux after cancel/complete) or cancelled
        // Allow navigation away - NOT considered accepted
        if (!request || request.status === 'cancelled') return false;

        // 1. Check vendor_status directly (from initial sync)
        if (request.vendor_status === 'accepted') return true;
        // 2. Check if there's an accepted proposal (from proposal.updated event)
        if (acceptedProposal) return true;
        // 3. Check request status (from service_request.updated event)
        if (request.status === 'en_route' || request.status === 'in_progress') return true;
        return false;
    }, [request, acceptedProposal]);

    // Debug: Log state changes in development
    useEffect(() => {
        if (__DEV__) {
            console.log('[VendorDetails] State update:', {
                requestId,
                vendor_status: request?.vendor_status,
                status: request?.status,
                acceptedProposal: acceptedProposal?.id,
                isAccepted,
            });
        }
    }, [requestId, request?.vendor_status, request?.status, acceptedProposal, isAccepted]);

    // Handle service cancellation by customer (via WebSocket)
    // Uses Toast + auto-redirect for better UX (non-blocking)
    useEffect(() => {
        if (cancelledService && cancelledService.requestId === requestId && cancelledService.cancelledBy === 'customer') {
            // Set flag to prevent stale UI
            setServiceCancelledByCustomer(true);
            setCancelRedirectCountdown(5);

            // Stop location tracking immediately
            stopLocationTracking();

            // Clear Redux state
            dispatch(clearServiceCancelled());

            // Show toast notification
            showToast({
                type: 'info',
                title: 'Job Cancelled by Customer',
                message: cancelledService.reason
                    ? `Reason: ${cancelledService.reason}`
                    : 'The customer has cancelled this request.',
                duration: 5000,
            });

            // Start countdown timer
            let currentCount = 5;
            const countdownInterval = setInterval(() => {
                currentCount -= 1;

                // Safety check: component still mounted
                if (!isMountedRef.current) {
                    clearInterval(countdownInterval);
                    return;
                }

                if (currentCount > 0) {
                    setCancelRedirectCountdown(currentCount);
                } else {
                    clearInterval(countdownInterval);
                    // Double-check component still mounted before redirect
                    if (isMountedRef.current) {
                        router.replace('/(vendor)/(servicerequests)');
                    }
                }
            }, 1000);

            return () => clearInterval(countdownInterval);
        }
    }, [cancelledService, requestId, dispatch, router, showToast]);

    // Local state
    const [vendorLocation, setVendorLocation] = useState<Coordinates | null>(null);
    const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
    const [proposalAmount, setProposalAmount] = useState<number>(500);
    const [proposalMessage, setProposalMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(0);
    const [proposalExpired, setProposalExpired] = useState(false);

    // Cancel job modal state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    // Completion modal and state with retry support
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    // Track navigation state to show loader instead of "not found"
    const [isCompletionNavigating, setIsCompletionNavigating] = useState(false);

    // Track if service was cancelled by customer (prevents stale UI)
    const [serviceCancelledByCustomer, setServiceCancelledByCustomer] = useState(false);
    const [cancelRedirectCountdown, setCancelRedirectCountdown] = useState<number>(5);

    // Track if arrival toast has been shown (prevents duplicate toasts)
    const [hasShownArrivalToast, setHasShownArrivalToast] = useState(false);

    // Refs
    const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
    const routeFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastRouteFetchRef = useRef<number>(0);
    const isBackgroundTrackingActiveRef = useRef<boolean>(false);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const isMountedRef = useRef<boolean>(true);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const progressAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
    // Track previous vendor location for significant distance check
    const prevVendorLocationForRouteRef = useRef<Coordinates | null>(null);

    // Customer location from request
    const customerLocation = useMemo(() => {
        if (!request?.latitude || !request?.longitude) return null;
        return {
            latitude: request.latitude,
            longitude: request.longitude,
        };
    }, [request?.latitude, request?.longitude]);

    // Calculate straight-line (Haversine) distance for accurate proximity check
    // This is different from OSRM road distance - road distance can be much higher
    // due to routing around buildings, one-way streets, etc.
    const straightLineDistanceKm = useMemo(() => {
        if (!vendorLocation || !customerLocation) return null;
        return getDistance(vendorLocation, customerLocation); // Returns distance in km
    }, [vendorLocation, customerLocation]);

    // Format straight-line distance for display (in meters when < 1km)
    // Must be before any early returns to maintain consistent hook order
    const formattedStraightLineDistance = useMemo(() => {
        if (straightLineDistanceKm === null) return null;
        if (straightLineDistanceKm < 1) {
            return `${Math.round(straightLineDistanceKm * 1000)}m`;
        }
        return `${straightLineDistanceKm.toFixed(1)}km`;
    }, [straightLineDistanceKm]);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;

            // Clear all timers
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            if (routeFetchTimeoutRef.current) {
                clearTimeout(routeFetchTimeoutRef.current);
                routeFetchTimeoutRef.current = null;
            }

            // Stop animations
            if (progressAnimationRef.current) {
                progressAnimationRef.current.stop();
                progressAnimationRef.current = null;
            }

            // Clear location watcher
            if (locationWatchRef.current) {
                locationWatchRef.current.remove();
                locationWatchRef.current = null;
            }
        };
    }, []);

    // Find vendor's pending proposal (for proposal expiry timer)
    // Note: SocketProposal has 'status' field, not 'vendor_status'
    const pendingProposal = useMemo(() => {
        return proposals.find(p => p.status === 'pending');
    }, [proposals]);

    // Timer effect - calculate from absolute expiry time for accuracy
    // Uses PROPOSAL expiry when waiting for customer response, REQUEST expiry otherwise
    useEffect(() => {
        // Determine which expiry to use
        const isWaitingForCustomerResponse = request?.already_sent && request?.vendor_status === 'pending';

        // Use proposal expiry when waiting for customer response
        let expirySource: string | null = null;
        if (isWaitingForCustomerResponse && pendingProposal?.acceptance_expires_at) {
            expirySource = pendingProposal.acceptance_expires_at;
        } else if (request?.expires_at) {
            expirySource = request.expires_at;
        }

        if (!expirySource) return;

        const calculateTimeLeft = () => {
            const expiresAt = new Date(expirySource!).getTime();
            const now = Date.now();
            return Math.max(0, Math.floor((expiresAt - now) / 1000));
        };

        setTimeLeft(calculateTimeLeft());

        // Clear existing interval before creating new one
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }

        timerIntervalRef.current = setInterval(() => {
            if (!isMountedRef.current) return;
            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);
        }, 1000);

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [request?.expires_at, request?.already_sent, request?.vendor_status, pendingProposal?.acceptance_expires_at]);

    // Handle request expiry - INDEPENDENT check with its own interval
    // This runs independently of timeLeft (which may track proposal expiry)
    // Ensures request disappears when request.expires_at is reached
    useEffect(() => {
        if (!request) return;

        const checkRequestExpiry = () => {
            const now = Date.now();
            const requestExpiresAt = new Date(request.expires_at).getTime();

            if (requestExpiresAt <= now) {
                // Don't remove if it's an accepted/active service
                const isActiveService = request.vendor_status === 'accepted' ||
                    request.status === 'en_route' ||
                    request.status === 'in_progress';

                if (!isActiveService) {
                    if (__DEV__) {
                        console.log('[VendorDetails] Request expired, removing:', request.id);
                    }
                    // Remove from Redux - this makes request undefined
                    // The existing "Request not found" screen with "Go Home" button will appear
                    dispatch(removeServiceRequest(request.id));
                }
            }
        };

        // Check immediately
        checkRequestExpiry();

        // Check every second (independent of timeLeft)
        const interval = setInterval(checkRequestExpiry, 1000);

        return () => clearInterval(interval);
    }, [request?.id, request?.expires_at, request?.vendor_status, request?.status, dispatch]);

    // Detect when proposal expires (timer hits 0 while waiting for customer response)
    useEffect(() => {
        if (timeLeft === 0 && request?.already_sent && request?.vendor_status === 'pending') {
            setProposalExpired(true);
        }
    }, [timeLeft, request?.already_sent, request?.vendor_status]);

    // Determine if screen is locked (vendor cannot navigate away)
    const isLocked = useMemo(() => {
        // Lock if proposal sent and waiting for response (timer still running)
        const proposalSentAndWaiting = request?.already_sent &&
            request?.vendor_status === 'pending' &&
            timeLeft > 0;

        // Lock if proposal accepted but service not completed
        // Use isAccepted which checks multiple conditions
        const acceptedButNotComplete = isAccepted && request?.status !== 'completed';

        return proposalSentAndWaiting || acceptedButNotComplete;
    }, [request?.already_sent, request?.vendor_status, request?.status, timeLeft, isAccepted]);

    // BackHandler effect to intercept hardware back button (Android)
    useEffect(() => {
        const backAction = () => {
            if (isLocked) {
                // Determine which message to show
                if (request?.already_sent && request?.vendor_status === 'pending') {
                    showToast({
                        type: 'warning',
                        title: 'Cannot Leave',
                        message: 'Please wait for customer response or until the proposal expires.',
                    });
                } else if (isAccepted) {
                    showToast({
                        type: 'warning',
                        title: 'Active Service',
                        message: 'You have an active service. Please complete it before leaving.',
                    });
                }
                return true; // Prevent default back behavior
            }
            return false; // Allow default back behavior
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

        return () => backHandler.remove();
    }, [isLocked, request?.already_sent, request?.vendor_status, isAccepted, showToast]);

    // Navigation interception using beforeRemove event (for swipe gestures, etc.)
    useEffect(() => {
        if (!isLocked) return;

        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            // Prevent default behavior of leaving the screen
            e.preventDefault();

            // Show appropriate toast
            if (request?.already_sent && request?.vendor_status === 'pending') {
                showToast({
                    type: 'warning',
                    title: 'Cannot Leave',
                    message: 'Please wait for customer response or until the proposal expires.',
                });
            } else if (isAccepted) {
                showToast({
                    type: 'warning',
                    title: 'Active Service',
                    message: 'You have an active service. Please complete it before leaving.',
                });
            }
        });

        return unsubscribe;
    }, [navigation, isLocked, request?.already_sent, request?.vendor_status, isAccepted, showToast]);

    // Progress animation
    useEffect(() => {
        if (!request || !isMountedRef.current) return;

        const totalDuration = 120; // Assume 2 minute window
        const progress = timeLeft / totalDuration;

        // Stop any existing animation
        if (progressAnimationRef.current) {
            progressAnimationRef.current.stop();
        }

        progressAnimationRef.current = Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        });

        progressAnimationRef.current.start(() => {
            progressAnimationRef.current = null;
        });
    }, [timeLeft, request]);

    // Initialize vendor location and check for existing background tracking
    useEffect(() => {
        const initializeLocation = async () => {
            try {
                // Wait for navigation animations to complete
                await new Promise<void>((resolve) => {
                    InteractionManager.runAfterInteractions(() => resolve());
                });

                if (!isMountedRef.current) return;

                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    showToast({
                        type: 'error',
                        title: 'Permission Denied',
                        message: 'Location permission is required',
                    });
                    if (isMountedRef.current) setIsLoading(false);
                    return;
                }

                // Check if background tracking is already running (e.g., from previous session)
                const isBackgroundRunning = await isBackgroundLocationRunning();
                if (isBackgroundRunning) {
                    isBackgroundTrackingActiveRef.current = true;
                    if (__DEV__) {
                        console.log('[VendorDetails] Background tracking already active');
                    }
                }

                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });

                if (isMountedRef.current) {
                    const coords = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    };
                    setVendorLocation(coords);
                    setIsLoading(false);

                    // Send location to backend immediately (required for proposal validation)
                    // Wait for WebSocket connection if not connected
                    const sendLocationToBackend = () => {
                        if (socketService.isConnected()) {
                            dispatch(updateLocation(coords));
                            if (__DEV__) {
                                console.log('[VendorDetails] Location sent to backend:', coords);
                            }
                        } else {
                            if (__DEV__) {
                                console.log('[VendorDetails] WebSocket not connected, waiting...');
                            }
                            // Wait for connection and send
                            const unsubscribe = socketService.onStatusChange((status) => {
                                if (status === 'connected' && isMountedRef.current) {
                                    dispatch(updateLocation(coords));
                                    if (__DEV__) {
                                        console.log('[VendorDetails] Location sent after connection:', coords);
                                    }
                                    unsubscribe();
                                }
                            });
                        }
                    };
                    sendLocationToBackend();

                    // Start watching location if en_route or already accepted
                    if (request?.status === 'en_route' || isAccepted) {
                        startLocationTracking();
                    }
                }
            } catch (error) {
                console.error('[VendorDetails] Location error:', error);
                if (isMountedRef.current) setIsLoading(false);
            }
        };

        initializeLocation();
    }, []);

    // Start location tracking when proposal is accepted + track acceptance time
    useEffect(() => {
        if (isAccepted && !locationWatchRef.current) {
            if (__DEV__) {
                console.log('[VendorDetails] Starting location tracking - service accepted');
            }
            startLocationTracking();
        }
    }, [isAccepted]);

    // Handle app state changes - flush queued locations when returning to foreground
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (
                appStateRef.current.match(/inactive|background/) &&
                nextAppState === 'active' &&
                isBackgroundTrackingActiveRef.current
            ) {
                if (__DEV__) {
                    console.log('[VendorDetails] App returned to foreground, flushing location queue');
                }
                // Flush any queued locations when coming back to foreground
                await flushLocationQueue();
            }
            appStateRef.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, []);

    // Stop location tracking when vendor arrives (status becomes in_progress)
    // Battery optimization: No need to track location when vendor is already at customer's place
    // Backend also stops broadcasting location to customer in IN_PROGRESS status
    useEffect(() => {
        if (request?.status === 'in_progress') {
            // Stop foreground location watcher
            if (locationWatchRef.current) {
                locationWatchRef.current.remove();
                locationWatchRef.current = null;
            }
            // Stop background location tracking
            if (isBackgroundTrackingActiveRef.current) {
                stopBackgroundLocationTracking();
                isBackgroundTrackingActiveRef.current = false;
            }
            if (__DEV__) {
                console.log('[VendorDetails] Stopped location tracking - vendor arrived (in_progress)');
            }
        }
    }, [request?.status]);

    /**
     * Start location tracking - uses background tracking for persistence
     * Falls back to foreground tracking if background permission denied
     */
    const startLocationTracking = async () => {
        try {
            if (__DEV__) {
                console.log('[VendorDetails] Starting location tracking for request:', requestId);
            }

            // Try background tracking first (persists when app is backgrounded/killed)
            let backgroundStarted = false;
            try {
                backgroundStarted = await startBackgroundLocationTracking(requestId);
            } catch (bgError) {
                console.error('[VendorDetails] Background tracking failed to start:', bgError);
                // Continue with foreground-only tracking
            }

            if (backgroundStarted) {
                isBackgroundTrackingActiveRef.current = true;
                if (__DEV__) {
                    console.log('[VendorDetails] Background location tracking started');
                }

                // Start foreground watcher for UI updates AND server updates
                // IMPORTANT: Foreground watcher MUST also send to server because:
                // 1. Mock location apps don't trigger background tasks (security restriction)
                // 2. When app is in foreground, foreground watcher is more responsive
                // 3. Background task is a fallback for when app is in background/killed
                // Using Balanced accuracy and longer intervals to prevent crashes on low-end devices
                locationWatchRef.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced, // Balanced saves battery
                        timeInterval: 10000, // 10 seconds
                        distanceInterval: 20, // 20 meters
                    },
                    (location) => {
                        const newCoords = {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        };

                        if (__DEV__) {
                            console.log('[VendorDetails] Location updated (foreground with bg backup):', newCoords);
                        }

                        // Update local state for UI
                        setVendorLocation(newCoords);

                        // CRITICAL: Also dispatch to server via WebSocket
                        // This ensures location updates work even with mock locations
                        // Background task serves as backup when app is actually in background
                        dispatch(updateLocation(newCoords));
                    }
                );
            } else {
                // Fallback to foreground-only tracking (stops when app backgrounded)
                if (__DEV__) {
                    console.log('[VendorDetails] Background permission denied, using foreground tracking');
                }

                showToast({
                    type: 'warning',
                    title: 'Background Location',
                    message: 'Background location permission was denied. Location tracking will stop when you leave the app.',
                    duration: 5000,
                });

                locationWatchRef.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced, // Balanced saves battery
                        timeInterval: 10000, // 10 seconds (was 5s)
                        distanceInterval: 20, // 20 meters (was 10m)
                    },
                    (location) => {
                        const newCoords = {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        };

                        if (__DEV__) {
                            console.log('[VendorDetails] Location updated (foreground):', newCoords);
                        }

                        setVendorLocation(newCoords);
                        dispatch(updateLocation(newCoords));
                    }
                );
            }
        } catch (error) {
            console.error('[VendorDetails] Location tracking error:', error);
        }
    };

    /**
     * Stop all location tracking (background + foreground)
     */
    const stopLocationTracking = async () => {
        // Stop foreground watcher
        if (locationWatchRef.current) {
            locationWatchRef.current.remove();
            locationWatchRef.current = null;
        }

        // Stop background tracking
        if (isBackgroundTrackingActiveRef.current) {
            await stopBackgroundLocationTracking();
            isBackgroundTrackingActiveRef.current = false;
            if (__DEV__) {
                console.log('[VendorDetails] Background location tracking stopped');
            }
        }
    };

    // Fetch route with throttling and significant distance check
    // Currently using OSRM - Switch to Google Routes API when client enables it:
    // 1. Uncomment the googleDirectionsService import at the top
    // 2. Replace the OSRM fetch below with: const route = await googleDirectionsService.getRoute(vendorLocation, customerLocation);
    useEffect(() => {
        if (!vendorLocation || !customerLocation || !isMountedRef.current) return;

        // CRITICAL: Only process if vendor location changed significantly (>100m)
        // This prevents crash on low-end devices from frequent small location updates
        const isFirstLocation = prevVendorLocationForRouteRef.current === null;
        if (!isFirstLocation) {
            const distanceMoved = getDistanceInMeters(
                prevVendorLocationForRouteRef.current!,
                vendorLocation
            );

            if (distanceMoved < ROUTE_CONSTANTS.SIGNIFICANT_DISTANCE_M) {
                if (__DEV__) {
                    console.log(
                        `[VendorDetails] Skipping route fetch - moved only ${distanceMoved.toFixed(0)}m (< ${ROUTE_CONSTANTS.SIGNIFICANT_DISTANCE_M}m)`
                    );
                }
                return; // Skip - location change not significant enough
            }
        }

        // Update previous location reference
        prevVendorLocationForRouteRef.current = vendorLocation;

        const now = Date.now();
        const timeSinceLastFetch = now - lastRouteFetchRef.current;

        // Clear any pending timeout
        if (routeFetchTimeoutRef.current) {
            clearTimeout(routeFetchTimeoutRef.current);
            routeFetchTimeoutRef.current = null;
        }

        const fetchRoute = async () => {
            if (!isMountedRef.current) return;

            try {
                lastRouteFetchRef.current = Date.now();

                // Using OSRM for now - switch to Google Routes API when enabled
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

                const res = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${vendorLocation.longitude},${vendorLocation.latitude};${customerLocation.longitude},${customerLocation.latitude}?overview=full&geometries=geojson`,
                    { signal: controller.signal }
                );

                clearTimeout(timeoutId);

                if (!isMountedRef.current) return;

                const data = await res.json();

                if (data.routes && data.routes[0] && isMountedRef.current) {
                    const route = data.routes[0];
                    const rawCoords = route.geometry.coordinates.map(
                        ([lng, lat]: [number, number]) => ({
                            latitude: lat,
                            longitude: lng,
                        })
                    );

                    // CRITICAL: Simplify route to max ~80 points to prevent Polyline crash
                    // OSRM can return 2000+ points which crashes low-end devices
                    const coords = simplifyRoute(rawCoords);

                    if (__DEV__) {
                        console.log('[VendorDetails] Route updated (OSRM):', {
                            distance: route.distance,
                            duration: route.duration,
                            rawCoordsCount: rawCoords.length,
                            simplifiedCoordsCount: coords.length,
                        });
                    }

                    setRouteInfo({
                        distance: route.distance,
                        duration: route.duration,
                        coordinates: coords,
                    });
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('[VendorDetails] Route fetch error:', error);
                }
            }
        };

        // If first fetch or enough time has passed, fetch with InteractionManager defer
        // This prevents main thread blocking during route processing
        if (lastRouteFetchRef.current === 0 || timeSinceLastFetch >= ROUTE_CONSTANTS.THROTTLE_MS) {
            InteractionManager.runAfterInteractions(() => {
                if (isMountedRef.current) {
                    fetchRoute();
                }
            });
        } else {
            // Schedule fetch after remaining throttle time
            const delay = ROUTE_CONSTANTS.THROTTLE_MS - timeSinceLastFetch;
            routeFetchTimeoutRef.current = setTimeout(fetchRoute, delay);
        }

        return () => {
            if (routeFetchTimeoutRef.current) {
                clearTimeout(routeFetchTimeoutRef.current);
                routeFetchTimeoutRef.current = null;
            }
        };
    }, [vendorLocation, customerLocation]);

    // Auto-zoom to fit both markers when locations are available
    useEffect(() => {
        if (!vendorLocation || !customerLocation || !mapRef.current) return;

        // Small delay to ensure map is ready
        const timer = setTimeout(() => {
            if (mapRef.current && isMountedRef.current) {
                mapRef.current.fitToCoordinates(
                    [vendorLocation, customerLocation],
                    {
                        edgePadding: { top: 120, right: 60, bottom: 350, left: 60 },
                        animated: true,
                    }
                );
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [vendorLocation, customerLocation]);

    // Format helpers
    const formatDistance = (meters: number): string => {
        if (meters < 1000) return `${Math.round(meters)}m`;
        return `${(meters / 1000).toFixed(1)}km`;
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.round(seconds / 60);
        if (mins < 60) return `${mins} min`;
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hours}h ${remainingMins}m`;
    };

    // Handle send proposal
    const handleSendProposal = useCallback(async () => {
        if (!proposalAmount || proposalAmount < 300) {
            showToast({
                type: 'error',
                title: 'Invalid Amount',
                message: 'Please enter a valid proposal amount (minimum PKR 300)',
            });
            return;
        }

        // Reset expired state when sending new proposal
        setProposalExpired(false);

        try {
            await dispatch(sendProposal({
                serviceRequestId: requestId,
                priceQuote: proposalAmount,
                message: proposalMessage || undefined,
                etaMinutes: routeInfo ? Math.round(routeInfo.duration / 60) : undefined,
                // COMMENTED OUT for testing - location should be initialized on socket connect now
                // vendorLatitude: vendorLocation?.latitude,
                // vendorLongitude: vendorLocation?.longitude,
            })).unwrap();

            showToast({
                type: 'success',
                title: 'Success',
                message: 'Proposal sent successfully!',
            });
        } catch (error: any) {
            showToast({
                type: 'error',
                title: 'Error',
                message: error.message || 'Failed to send proposal. Please try again.',
            });
        }
    }, [dispatch, requestId, proposalAmount, proposalMessage, routeInfo, showToast]);

    // Open complete modal
    const handleComplete = useCallback(() => {
        setShowCompleteModal(true);
    }, []);

    // Handle completion confirmation from modal
    const handleConfirmComplete = useCallback(async () => {
        // Prevent double-click while completing
        if (isCompleting) return;

        const attemptComplete = async (retryCount: number = 0): Promise<boolean> => {
            const MAX_RETRIES = 2;

            try {
                setIsCompleting(true);

                // Complete the service via dispatch FIRST (before stopping tracking)
                await dispatch(completeService(requestId)).unwrap();

                // Only stop location tracking AFTER successful completion
                await stopLocationTracking();

                // Set navigating state BEFORE cleanup to show loader instead of "not found"
                setIsCompletionNavigating(true);

                // Close modal
                setShowCompleteModal(false);

                // Clean up Redux state for this completed service
                dispatch(cleanupCompletedService(requestId));

                return true;
            } catch (error: any) {
                if (retryCount < MAX_RETRIES) {
                    // Auto-retry with delay
                    if (__DEV__) console.log(`[Complete] Retry attempt ${retryCount + 1}/${MAX_RETRIES}`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                    return attemptComplete(retryCount + 1);
                }
                throw error;
            }
        };

        try {
            const success = await attemptComplete();

            if (success) {
                setIsCompleting(false);

                // Show success toast
                showToast({
                    type: 'success',
                    title: 'Service Completed',
                    message: 'Great job! The service has been marked as complete.',
                    duration: 3000,
                });

                // Navigate to service requests screen
                InteractionManager.runAfterInteractions(() => {
                    if (isMountedRef.current) {
                        router.replace('/(vendor)/(servicerequests)/');
                    }
                });
            }
        } catch (error: any) {
            setIsCompleting(false);
            setShowCompleteModal(false);

            // Show error toast with retry option
            showToast({
                type: 'error',
                title: 'Completion Failed',
                message: error.message || 'Failed to complete service. Please try again.',
                duration: 4000,
            });
        }
    }, [dispatch, requestId, router, stopLocationTracking, isCompleting, showToast]);

    // Open cancel modal
    const handleCancelJob = useCallback(() => {
        setShowCancelModal(true);
    }, []);

    // Handle cancel confirmation from modal
    // Vendor can cancel anytime - no grace period or offline penalty
    const handleConfirmCancelJob = useCallback(async (
        reasonCode: VendorCancelReasonCode,
        customReason?: string
    ) => {
        try {
            setIsCancelling(true);

            // Stop all location tracking first
            await stopLocationTracking();

            // Cancel via WebSocket (realtime, broadcasts to customer immediately)
            // Backend resets request to PENDING and re-broadcasts to other vendors
            socketService.send('service.cancel', {
                service_request_id: requestId,
                reason_code: reasonCode,
                reason: customReason,
            });

            if (__DEV__) {
                console.log('[VendorDetails] Job cancelled via WebSocket:', requestId, reasonCode);
            }

            // Clean up Redux state
            dispatch(cleanupCompletedService(requestId));

            // Clear persisted active job from SecureStore
            // This prevents "already active request" error on next app open
            await activeJobService.clear();

            // Close modal
            setShowCancelModal(false);

            // Navigate back to requests list
            Alert.alert(
                'Job Cancelled',
                'The job has been cancelled. The customer has been notified.',
                [{ text: 'OK', onPress: () => router.replace('/(vendor)/(servicerequests)/') }]
            );
        } catch (error) {
            if (__DEV__) {
                console.error('[VendorDetails] Cancel job failed:', error);
            }
            showToast({
                type: 'error',
                title: 'Error',
                message: 'Failed to cancel job. Please try again.',
            });
        } finally {
            setIsCancelling(false);
        }
    }, [requestId, dispatch, router, stopLocationTracking]);

    // Handle "Go Home" button - clear persisted job data before navigating
    const handleGoHome = useCallback(async () => {
        try {
            await activeJobService.clear();
            await stopLocationTracking();
        } catch (error) {
            if (__DEV__) {
                console.error('[VendorDetails] Failed to clear active job:', error);
            }
        }
        router.replace('/(vendor)/(servicerequests)/');
    }, [router, stopLocationTracking]);

    // Handle skip countdown - allow vendor to skip waiting
    const handleSkipCancelCountdown = useCallback(() => {
        if (isMountedRef.current) {
            router.replace('/(vendor)/(servicerequests)');
        }
    }, [router]);

    // Check if vendor is within 100 meters of customer location
    // Using straight-line (Haversine) distance for accurate proximity check
    // 0.1 km = 100 meters (must be before early returns for hooks)
    const isWithinRange = straightLineDistanceKm !== null ? straightLineDistanceKm <= 0.1 : false;

    // Show toast when vendor reaches customer location (within 100m)
    // Also stop location tracking - vendor has arrived, no need to continue tracking
    useEffect(() => {
        if (isWithinRange && !hasShownArrivalToast && isAccepted) {
            showToast({
                type: 'success',
                title: 'Reached Destination',
                message: 'You have arrived at the customer location.',
                duration: 5000,
            });
            setHasShownArrivalToast(true);

            // Stop location tracking when vendor arrives (battery optimization)
            // This prevents unnecessary location updates after reaching destination
            if (locationWatchRef.current) {
                locationWatchRef.current.remove();
                locationWatchRef.current = null;
            }
            if (isBackgroundTrackingActiveRef.current) {
                stopBackgroundLocationTracking();
                isBackgroundTrackingActiveRef.current = false;
            }

            if (__DEV__) {
                console.log('[VendorDetails] Vendor arrived within 100m - stopped location tracking');
            }
        }
    }, [isWithinRange, hasShownArrivalToast, isAccepted, showToast]);

    // Reset arrival toast when request changes
    useEffect(() => {
        setHasShownArrivalToast(false);
    }, [requestId]);

    // Show loader when navigating after completion (prevents "not found" flash)
    if (isCompletionNavigating) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.success} />
                <Text type="body2" style={styles.loadingText}>Completing service...</Text>
            </View>
        );
    }

    // Request not found - check early
    // Use router.replace instead of back() for persisted screens with no history
    if (!request && !isLoading) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
                <Text type="title" style={styles.errorText}>Request not found</Text>
                <TouchableOpacity style={styles.backButton} onPress={handleGoHome}>
                    <Text type="bodySemiBold" style={styles.backButtonText}>Go Home</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Loading state
    if (isLoading || !vendorLocation || !customerLocation) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text type="body2" style={styles.loadingText}>Loading request details...</Text>
            </View>
        );
    }

    // Service cancelled by customer - show countdown and redirect
    if (serviceCancelledByCustomer) {
        return (
            <View style={styles.cancelledContainer}>
                <View style={styles.cancelledContent}>
                    <Ionicons name="close-circle" size={64} color={COLORS.error} />
                    <Text type="title" style={[styles.errorText, { marginTop: verticalScale(16) }]}>
                        Job Cancelled
                    </Text>
                    <Text type="body2" style={[styles.loadingText, { marginTop: verticalScale(8) }]}>
                        The customer has cancelled this request.
                    </Text>

                    <View style={styles.countdownContainer}>
                        <Text type="body" style={styles.countdownText}>
                            Redirecting in <Text type="bodySemiBold" style={styles.countdownNumber}>
                                {cancelRedirectCountdown}
                            </Text>...
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={handleSkipCancelCountdown}
                        activeOpacity={0.7}
                    >
                        <Text type="bodySemiBold" style={styles.skipButtonText}>
                            Go Back Now
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Request not found after loading
    // Use router.replace instead of back() for persisted screens with no history
    if (!request) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
                <Text type="title" style={styles.errorText}>Request not found</Text>
                <TouchableOpacity style={styles.backButton} onPress={handleGoHome}>
                    <Text type="bodySemiBold" style={styles.backButtonText}>Go Home</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const isUrgent = timeLeft <= 30;

    // Check if waiting for customer response (proposal sent, timer running)
    const isWaitingForResponse = request?.already_sent &&
        request?.vendor_status === 'pending' &&
        timeLeft > 0;

    // Can show proposal form when request is pending (not yet accepted)
    const canShowProposalForm = request?.status === 'pending' && !isAccepted;

    // Button disabled while waiting or sending
    const isButtonDisabled = isWaitingForResponse || isPendingProposal;

    // Legacy - keep for timer bar visibility
    const canSendProposal = !request?.already_sent && request?.status === 'pending';

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={{
                    ...vendorLocation,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation
                showsMyLocationButton
                loadingEnabled
            >
                {/* OpenStreetMap tiles - COMMENTED OUT for Google Maps dev build */}
                {/* Uncomment below for Expo Go testing (no native Google Maps) */}
                {/* {(Platform.OS === "web" || (Platform.OS === "android" && __DEV__)) && (
                    <UrlTile
                        urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maximumZ={19}
                        shouldReplaceMapContent={true}
                    />
                )} */}
                {/* Vendor Car Marker */}
                <Marker
                    coordinate={vendorLocation}
                    anchor={{ x: 0.5, y: 0.5 }}
                >
                    <View collapsable={false} style={styles.vendorMarker}>
                        <FontAwesome5 name="car" size={18} color={COLORS.primary} />
                    </View>
                </Marker>

                {/* Customer Location Marker */}
                <Marker
                    coordinate={customerLocation}
                    anchor={{ x: 0.5, y: 1 }}
                >
                    <View collapsable={false} style={styles.customerMarkerContainer}>
                        <View collapsable={false} style={styles.customerMarker}>
                            <Ionicons name="location" size={22} color={COLORS.white} />
                        </View>
                        <View style={styles.customerMarkerTail} />
                    </View>
                </Marker>

                {/* Route with 3-layer gradient effect */}
                {routeInfo && routeInfo.coordinates.length > 0 && (
                    <>
                        {/* Shadow/glow layer */}
                        <Polyline
                            coordinates={routeInfo.coordinates}
                            strokeColor="rgba(29, 78, 216, 0.15)"
                            strokeWidth={10}
                        />
                        {/* Middle layer */}
                        <Polyline
                            coordinates={routeInfo.coordinates}
                            strokeColor="rgba(29, 78, 216, 0.4)"
                            strokeWidth={6}
                        />
                        {/* Main route line */}
                        <Polyline
                            coordinates={routeInfo.coordinates}
                            strokeColor={COLORS.primary}
                            strokeWidth={4}
                        />
                    </>
                )}
            </MapView>

            {/* Back Button */}
            <TouchableOpacity
                style={styles.backButtonFloat}
                onPress={() => {
                    if (isLocked) {
                        if (request?.already_sent && request?.vendor_status === 'pending') {
                            showToast({
                                type: 'warning',
                                title: 'Cannot Leave',
                                message: 'Please wait for customer response or until the proposal expires.',
                            });
                        } else if (isAccepted) {
                            showToast({
                                type: 'warning',
                                title: 'Active Service',
                                message: 'You have an active service. Please complete it before leaving.',
                            });
                        }
                    } else {
                        router.back();
                    }
                }}
                activeOpacity={0.8}
            >
                <Ionicons name="arrow-back" size={22} color={COLORS.gray800} />
            </TouchableOpacity>

            {/* ETA Card - Compact */}
            {routeInfo && (
                <View style={styles.etaCard}>
                    <View style={styles.etaItem}>
                        <Ionicons name="navigate" size={16} color={COLORS.primary} />
                        <Text type="caption" style={styles.etaValue}>{formatDistance(routeInfo.distance)}</Text>
                    </View>
                    <View style={styles.etaDivider} />
                    <View style={styles.etaItem}>
                        <Ionicons name="time" size={16} color={COLORS.accent} />
                        <Text type="caption" style={styles.etaValue}>{formatDuration(routeInfo.duration)}</Text>
                    </View>
                </View>
            )}

            {/* Timer Bar (for pending proposals) */}
            {canSendProposal && timeLeft > 0 && (
                <View style={styles.timerBarContainer}>
                    <View style={styles.timerBar}>
                        <Animated.View
                            style={[
                                styles.timerBarFill,
                                {
                                    width: progressWidth,
                                    backgroundColor: isUrgent ? COLORS.error : COLORS.success,
                                },
                            ]}
                        />
                    </View>
                    <Text type="body" style={styles.timerText}>
                        Request expires in {timeLeft}s
                    </Text>
                </View>
            )}

            {/* Status Banner - Service Accepted (Compact) */}
            {isAccepted && request?.status !== 'completed' && (
                <View style={styles.statusBannerCompact}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
                    <Text type="caption" style={styles.statusBannerText}>Service Accepted - Contact customer</Text>
                </View>
            )}

            {/* Lock Status Banner - show when waiting for customer response */}
            {isLocked && !isAccepted && (
                <View style={styles.lockBanner}>
                    <Ionicons name="lock-closed" size={18} color={COLORS.white} />
                    <Text type="body" style={styles.lockBannerText}>
                        Waiting for customer response...
                    </Text>
                    <View style={styles.lockTimerBadge}>
                        <Text type="bodySemiBold" style={styles.lockTimerText}>{timeLeft}s</Text>
                    </View>
                </View>
            )}

            <BottomSheet
                ref={bottomSheetRef}
                index={0}
                snapPoints={['35%', '60%', '85%']}
                backgroundStyle={styles.bottomSheetBackground}
                handleIndicatorStyle={styles.bottomSheetIndicator}
            >
                <BottomSheetScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <Text type="title" style={styles.sheetTitle}>Request Details</Text>
                        <View style={[styles.categoryBadge, { backgroundColor: COLORS.primary + '20' }]}>
                            <Text type="caption" style={{ color: COLORS.primary }}>{request?.category?.name || 'Service'}</Text>
                        </View>
                    </View>

                    {/* Problem */}
                    <View style={styles.section}>
                        <Text type="bodySemiBold" style={styles.problemTitle}>{request?.problem_title}</Text>
                        <Text type="body2" style={styles.problemDescription}>{request?.description}</Text>
                    </View>

                    {/* Customer Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="person" size={20} color={COLORS.primary} />
                            <Text type="bodySemiBold" style={styles.sectionTitle}>Customer Information</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text type="body2" style={styles.infoLabel}>Name</Text>
                            <Text type="bodySemiBold" style={styles.infoValue}>{request?.customer?.name}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text type="body2" style={styles.infoLabel}>Address</Text>
                            <Text type="bodySemiBold" style={[styles.infoValue, styles.addressText]}>
                                {request?.address_line}
                            </Text>
                        </View>

                        {/* Phone (only shown after acceptance) */}
                        {isAccepted && request?.customer?.phone && (
                            <View style={[styles.infoRow, styles.phoneRow]}>
                                <Ionicons name="call" size={18} color={COLORS.success} />
                                <Text type="body2" style={styles.infoLabel}>Contact</Text>
                                <TouchableOpacity>
                                    <Text type="bodySemiBold" style={styles.phoneValue}>
                                        {request?.customer?.phone}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Proposal Section (only show when can send) */}
                    {!isAccepted && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="cash" size={20} color={COLORS.success} />
                                <Text type="bodySemiBold" style={styles.sectionTitle}>Send Proposal</Text>
                            </View>

                            <Text type="subtitle2" style={styles.proposalLabel}>Visit Charges (PKR)</Text>
                            <View style={[styles.proposalInputContainer, isButtonDisabled && { opacity: 0.6 }]}>
                                <TouchableOpacity
                                    style={styles.proposalButton}
                                    onPress={() => setProposalAmount((prev) => Math.max(300, prev - 100))}
                                    disabled={isButtonDisabled}
                                >
                                    <Ionicons name="remove" size={24} color={COLORS.white} />
                                </TouchableOpacity>

                                <View style={styles.proposalAmountContainer}>
                                    <Text type="body" style={styles.currencySymbol}>PKR</Text>
                                    <TextInput
                                        style={styles.proposalAmountInput}
                                        value={proposalAmount.toString()}
                                        onChangeText={(text) => {
                                            const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                                            if (!isNaN(num)) {
                                                setProposalAmount(num);
                                            } else if (text === '') {
                                                setProposalAmount(0);
                                            }
                                        }}
                                        onBlur={() => {
                                            // Enforce minimum on blur
                                            if (proposalAmount < 300) {
                                                setProposalAmount(300);
                                            }
                                        }}
                                        keyboardType="numeric"
                                        editable={!isButtonDisabled}
                                        selectTextOnFocus
                                        maxLength={6}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={styles.proposalButton}
                                    onPress={() => setProposalAmount((prev) => prev + 100)}
                                    disabled={isButtonDisabled}
                                >
                                    <Ionicons name="add" size={24} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>

                            {/* Quick amount presets */}
                            <View style={[styles.presetsContainer, isButtonDisabled && { opacity: 0.6 }]}>
                                {[300, 500, 800, 1000].map((amount) => (
                                    <TouchableOpacity
                                        key={amount}
                                        style={[
                                            styles.presetButton,
                                            proposalAmount === amount && styles.presetButtonActive,
                                        ]}
                                        onPress={() => setProposalAmount(amount)}
                                        disabled={isButtonDisabled}
                                    >
                                        <Text
                                            type="body"
                                            style={[
                                                styles.presetText,
                                                proposalAmount === amount && styles.presetTextActive,
                                            ]}
                                        >
                                            {amount}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.sendProposalButton, isButtonDisabled && styles.buttonDisabled]}
                                onPress={handleSendProposal}
                                disabled={isButtonDisabled}
                            >
                                <LinearGradient
                                    colors={isButtonDisabled ? [COLORS.gray400, COLORS.gray500] : [COLORS.primary, COLORS.accent]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradientButton}
                                >
                                    {isPendingProposal ? (
                                        <>
                                            <ActivityIndicator color={COLORS.white} size="small" />
                                            <Text type="button" style={styles.sendProposalText}>Sending...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Ionicons name="send" size={20} color={COLORS.white} />
                                            <Text type="button" style={styles.sendProposalText}>Send Proposal</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Waiting banner - show when waiting for customer response */}
                            {isWaitingForResponse && (
                                <View style={styles.waitingBanner}>
                                    <Ionicons name="time-outline" size={18} color={COLORS.warning} />
                                    <Text type="body" style={styles.waitingText}>
                                        Waiting for customer response... {timeLeft}s
                                    </Text>
                                </View>
                            )}

                            {/* Expired banner - show when proposal expired */}
                            {proposalExpired && !isWaitingForResponse && (
                                <View style={[styles.waitingBanner, styles.expiredBanner]}>
                                    <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                                    <Text type="body" style={[styles.waitingText, { color: COLORS.error }]}>
                                        Proposal expired. You can send a new proposal.
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Mark as Complete - shows after proposal accepted */}
                    {isAccepted && request?.status !== 'completed' && (
                        <TouchableOpacity
                            style={[styles.actionButton, (isPendingComplete || !isWithinRange) && styles.buttonDisabled]}
                            onPress={handleComplete}
                            disabled={isPendingComplete || !isWithinRange}
                        >
                            <LinearGradient
                                colors={isWithinRange ? [COLORS.success, '#059669'] : [COLORS.gray400, COLORS.gray500]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientButton}
                            >
                                {isPendingComplete ? (
                                    <ActivityIndicator color={COLORS.white} size="small" />
                                ) : (
                                    <>
                                        <Ionicons
                                            name={isWithinRange ? "checkmark-circle" : "navigate"}
                                            size={24}
                                            color={COLORS.white}
                                        />
                                        <Text type="button" style={styles.actionButtonText}>
                                            {isWithinRange
                                                ? 'Mark as Complete'
                                                : `${formattedStraightLineDistance || 'Calculating...'} away`
                                            }
                                        </Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {/* Cancel Job Button - shows after proposal accepted, but not in_progress */}
                    {isAccepted && request?.status !== 'completed' && request?.status !== 'in_progress' && (
                        <TouchableOpacity
                            style={styles.cancelJobButton}
                            onPress={handleCancelJob}
                            activeOpacity={0.7}
                        >
                            <Text type="bodySemiBold" style={styles.cancelJobButtonText}>
                                Cancel Job
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Spacer */}
                    <View style={{ height: verticalScale(40) }} />
                </BottomSheetScrollView>
            </BottomSheet>

            {/* Cancel Job Modal */}
            <CancelJobModal
                visible={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={handleConfirmCancelJob}
                isLoading={isCancelling}
                status={request?.status === 'en_route' ? 'en_route' : 'accepted'}
            />

            {/* Complete Service Modal */}
            <CompleteServiceModal
                visible={showCompleteModal}
                onClose={() => setShowCompleteModal(false)}
                onConfirm={handleConfirmComplete}
                isLoading={isCompleting}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.gray50,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.gray50,
    },
    loadingText: {
        marginTop: verticalScale(16),
        color: COLORS.gray600,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.gray50,
        padding: scale(24),
    },
    errorText: {
        color: COLORS.gray900,
        marginTop: verticalScale(16),
        marginBottom: verticalScale(24),
    },
    backButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: scale(24),
        paddingVertical: verticalScale(12),
        borderRadius: moderateScale(8),
    },
    backButtonText: {
        color: COLORS.white,
    },
    map: {
        flex: 1,
    },
    // Vendor car marker - fully rounded circle
    vendorMarker: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    // Customer destination marker - fully rounded circle
    customerMarkerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    customerMarker: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    customerMarkerTail: {
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
    backButtonFloat: {
        position: 'absolute',
        top: verticalScale(16),
        left: scale(16),
        width: scale(40),
        height: scale(40),
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(20),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    etaCard: {
        position: 'absolute',
        top: verticalScale(16),
        left: scale(66),
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(20),
        paddingVertical: verticalScale(8),
        paddingHorizontal: scale(14),
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    etaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
    },
    etaDivider: {
        width: 1,
        height: verticalScale(16),
        backgroundColor: COLORS.gray300,
        marginHorizontal: scale(10),
    },
    etaValue: {
        color: COLORS.gray800,
        fontWeight: '600',
    },
    timerBarContainer: {
        position: 'absolute',
        top: verticalScale(70),
        left: scale(16),
        right: scale(16),
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(8),
        padding: scale(12),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    timerBar: {
        height: verticalScale(6),
        backgroundColor: COLORS.gray200,
        borderRadius: moderateScale(3),
        overflow: 'hidden',
        marginBottom: verticalScale(8),
    },
    timerBarFill: {
        height: '100%',
        borderRadius: moderateScale(3),
    },
    timerText: {
        color: COLORS.gray700,
        textAlign: 'center',
    },
    statusBannerCompact: {
        position: 'absolute',
        top: verticalScale(70),
        left: scale(16),
        right: scale(16),
        backgroundColor: COLORS.success,
        borderRadius: moderateScale(12),
        paddingVertical: verticalScale(10),
        paddingHorizontal: scale(14),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(6),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    statusBannerText: {
        color: COLORS.white,
        fontWeight: '600',
    },
    bottomSheetBackground: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: moderateScale(24),
        borderTopRightRadius: moderateScale(24),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    bottomSheetIndicator: {
        backgroundColor: COLORS.gray300,
        width: scale(40),
    },
    sheetContent: {
        padding: scale(20),
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    sheetTitle: {
        color: COLORS.gray900,
    },
    categoryBadge: {
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(6),
        borderRadius: moderateScale(16),
    },
    section: {
        marginBottom: verticalScale(24),
    },
    problemTitle: {
        color: COLORS.gray900,
        fontSize: moderateScale(16),
        marginBottom: verticalScale(8),
    },
    problemDescription: {
        color: COLORS.gray600,
        lineHeight: moderateScale(20),
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(12),
    },
    sectionTitle: {
        color: COLORS.gray900,
        marginLeft: scale(8),
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: verticalScale(10),
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray100,
    },
    infoLabel: {
        color: COLORS.gray600,
        flex: 1,
    },
    infoValue: {
        color: COLORS.gray900,
        flex: 2,
        textAlign: 'right',
    },
    addressText: {},
    phoneRow: {
        backgroundColor: COLORS.success + '10',
        paddingHorizontal: scale(12),
        borderRadius: moderateScale(8),
        borderBottomWidth: 0,
    },
    phoneValue: {
        color: COLORS.success,
    },
    proposalLabel: {
        color: COLORS.gray700,
        marginBottom: verticalScale(12),
    },
    proposalInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(16),
        marginBottom: verticalScale(16),
    },
    proposalButton: {
        backgroundColor: COLORS.primary,
        width: scale(48),
        height: scale(48),
        borderRadius: moderateScale(24),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    proposalAmountContainer: {
        width: scale(90),
        alignItems: 'center',
        backgroundColor: COLORS.gray50,
        paddingVertical: verticalScale(4),
        paddingHorizontal: scale(4),
        borderRadius: moderateScale(8),
        borderWidth: 1.5,
        borderColor: COLORS.primary + '30',
    },
    currencySymbol: {
        color: COLORS.gray500,
        fontSize: moderateScale(10),
    },
    proposalAmount: {
        fontSize: moderateScale(28),
        color: COLORS.gray900,
    },
    proposalAmountInput: {
        fontSize: moderateScale(22),
        color: COLORS.gray900,
        fontWeight: 'bold',
        textAlign: 'center',
        minWidth: scale(60),
        padding: 0,
    },
    presetsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(16),
    },
    presetButton: {
        flex: 1,
        backgroundColor: COLORS.gray100,
        paddingVertical: verticalScale(10),
        marginHorizontal: scale(4),
        borderRadius: moderateScale(8),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.gray200,
    },
    presetButtonActive: {
        backgroundColor: COLORS.primary + '20',
        borderColor: COLORS.primary,
    },
    presetText: {
        color: COLORS.gray700,
    },
    presetTextActive: {
        color: COLORS.primary,
    },
    sendProposalButton: {
        borderRadius: moderateScale(12),
        overflow: 'hidden',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    gradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(16),
        gap: scale(8),
    },
    sendProposalText: {
        color: COLORS.white,
    },
    proposalSentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.warning + '20',
        padding: scale(16),
        borderRadius: moderateScale(12),
        marginBottom: verticalScale(24),
        gap: scale(8),
    },
    proposalSentText: {
        color: COLORS.warning,
    },
    waitingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        paddingVertical: verticalScale(10),
        paddingHorizontal: scale(12),
        backgroundColor: COLORS.warning + '20',
        borderRadius: moderateScale(8),
        marginTop: verticalScale(12),
    },
    expiredBanner: {
        backgroundColor: COLORS.error + '20',
    },
    waitingText: {
        color: COLORS.warning,
        fontSize: moderateScale(14),
        flex: 1,
    },
    actionButton: {
        borderRadius: moderateScale(12),
        overflow: 'hidden',
        marginBottom: verticalScale(16),
    },
    actionButtonText: {
        color: COLORS.white,
        fontSize: moderateScale(16),
    },
    lockBanner: {
        position: 'absolute',
        top: verticalScale(130),
        left: scale(16),
        right: scale(16),
        backgroundColor: COLORS.warning,
        borderRadius: moderateScale(12),
        padding: scale(14),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    lockBannerText: {
        color: COLORS.white,
        flex: 1,
    },
    lockTimerBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(4),
        borderRadius: moderateScale(16),
    },
    lockTimerText: {
        color: COLORS.white,
        fontSize: moderateScale(13),
    },
    cancelJobButton: {
        marginTop: verticalScale(12),
        paddingVertical: verticalScale(14),
        borderRadius: moderateScale(12),
        borderWidth: 1.5,
        borderColor: COLORS.error,
        backgroundColor: COLORS.white,
        alignItems: 'center',
    },
    cancelJobButtonText: {
        color: COLORS.error,
        fontSize: moderateScale(15),
    },
    cancelledContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.gray50,
        padding: scale(24),
    },
    cancelledContent: {
        alignItems: 'center',
        maxWidth: scale(300),
    },
    countdownContainer: {
        marginTop: verticalScale(24),
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(12),
        backgroundColor: COLORS.warning + '15',
        borderRadius: moderateScale(12),
        borderWidth: 1,
        borderColor: COLORS.warning + '40',
    },
    countdownText: {
        color: COLORS.gray700,
        textAlign: 'center',
    },
    countdownNumber: {
        color: COLORS.warning,
        fontSize: moderateScale(18),
    },
    skipButton: {
        marginTop: verticalScale(20),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        backgroundColor: COLORS.primary,
        paddingHorizontal: scale(24),
        paddingVertical: verticalScale(12),
        borderRadius: moderateScale(8),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    skipButtonText: {
        color: COLORS.white,
        fontSize: moderateScale(15),
    },
});
