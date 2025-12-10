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
} from 'react-native';
import Text from '@/components/common/Text';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { AppDispatch, RootState } from '@/store';
import {
    selectServiceRequestById,
    selectIsPending,
    selectProposalsByRequestId,
    sendProposal,
    completeService,
    updateLocation,
    cleanupCompletedService,
} from '@/store/slices/dispatchSlice';
import { COLORS } from '@/constants/colors';
import type { Coordinates } from '@/types/socket';
import {
    startBackgroundLocationTracking,
    stopBackgroundLocationTracking,
    isBackgroundLocationRunning,
    flushLocationQueue,
} from '@/services/backgroundLocationService';
import { getDistance } from '@/utils/distanceCache';
import { simplifyRoute } from '@/utils/polylineSimplify';
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
    const R = 6371000; // Earth radius in meters
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const lat1Rad = coord1.latitude * Math.PI / 180;
    const lat2Rad = coord2.latitude * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export default function WebSocketRequestDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const requestId = parseInt(id || '0', 10);
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();
    const navigation = useNavigation();
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

    // Get proposals for this request to check if vendor's proposal was accepted
    const proposals = useSelector((s: RootState) => selectProposalsByRequestId(s, requestId));
    const acceptedProposal = useMemo(() => {
        return proposals.find(p => p.status === 'accepted');
    }, [proposals]);

    // Determine if service is accepted using multiple conditions
    // This handles real-time updates when backend doesn't send vendor_status
    const isAccepted = useMemo(() => {
        // 1. Check vendor_status directly (from initial sync)
        if (request?.vendor_status === 'accepted') return true;
        // 2. Check if there's an accepted proposal (from proposal.updated event)
        if (acceptedProposal) return true;
        // 3. Check request status (from service_request.updated event)
        if (request?.status === 'en_route' || request?.status === 'in_progress') return true;
        return false;
    }, [request?.vendor_status, request?.status, acceptedProposal]);

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

    // Local state
    const [vendorLocation, setVendorLocation] = useState<Coordinates | null>(null);
    const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
    const [proposalAmount, setProposalAmount] = useState<number>(500);
    const [proposalMessage, setProposalMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(0);

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

    // Timer effect - calculate from absolute expiry time for accuracy
    useEffect(() => {
        if (!request?.expires_at) return;

        const calculateTimeLeft = () => {
            const expiresAt = new Date(request.expires_at).getTime();
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
    }, [request?.expires_at]);

    // Handle request expiry - navigate away when timer ends
    useEffect(() => {
        if (timeLeft === 0 && request) {
            // Only navigate away if not in active service (accepted but not completed)
            const isActiveService = request.vendor_status === 'accepted' && request.status !== 'completed';

            // if (!isActiveService) {
            //     Alert.alert(
            //         'Request Expired',
            //         'This service request has expired.',
            //         [{ text: 'OK', onPress: () => router.back() }]
            //     );
            // }
        }
    }, [timeLeft, request, router]);

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
                    Alert.alert(
                        'Cannot Leave',
                        'Please wait for customer response or until the request expires.',
                        [{ text: 'OK' }]
                    );
                } else if (isAccepted) {
                    Alert.alert(
                        'Active Service',
                        'You have an active service. Please complete it before leaving.',
                        [{ text: 'OK' }]
                    );
                }
                return true; // Prevent default back behavior
            }
            return false; // Allow default back behavior
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

        return () => backHandler.remove();
    }, [isLocked, request?.already_sent, request?.vendor_status, isAccepted]);

    // Navigation interception using beforeRemove event (for swipe gestures, etc.)
    useEffect(() => {
        if (!isLocked) return;

        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            // Prevent default behavior of leaving the screen
            e.preventDefault();

            // Show appropriate alert
            if (request?.already_sent && request?.vendor_status === 'pending') {
                Alert.alert(
                    'Cannot Leave',
                    'Please wait for customer response or until the request expires.',
                    [{ text: 'OK' }]
                );
            } else if (isAccepted) {
                Alert.alert(
                    'Active Service',
                    'You have an active service. Please complete it before leaving.',
                    [{ text: 'OK' }]
                );
            }
        });

        return unsubscribe;
    }, [navigation, isLocked, request?.already_sent, request?.vendor_status, isAccepted]);

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
                    Alert.alert('Permission Denied', 'Location permission is required');
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

    // Start location tracking when proposal is accepted
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

                // Also start foreground watcher for UI updates (local state)
                // Background task handles socket updates, this is just for map UI
                // Using Balanced accuracy and longer intervals to prevent crashes on low-end devices
                locationWatchRef.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced, // Balanced saves battery
                        timeInterval: 10000, // 10 seconds (was 5s - too frequent)
                        distanceInterval: 20, // 20 meters (was 10m)
                    },
                    (location) => {
                        const newCoords = {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        };

                        // Only update local state for UI - background task sends to server
                        setVendorLocation(newCoords);
                    }
                );
            } else {
                // Fallback to foreground-only tracking (stops when app backgrounded)
                if (__DEV__) {
                    console.log('[VendorDetails] Background permission denied, using foreground tracking');
                }

                Alert.alert(
                    'Background Location',
                    'Background location permission was denied. Location tracking will stop when you leave the app. For best experience, please enable background location in settings.',
                    [{ text: 'OK' }]
                );

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
        if (!proposalAmount || proposalAmount < 100) {
            Alert.alert('Invalid Amount', 'Please enter a valid proposal amount (minimum PKR 100)');
            return;
        }

        try {
            await dispatch(sendProposal({
                serviceRequestId: requestId,
                priceQuote: proposalAmount,
                message: proposalMessage || undefined,
                etaMinutes: routeInfo ? Math.round(routeInfo.duration / 60) : undefined,
            })).unwrap();

            Alert.alert('Success', 'Proposal sent successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send proposal. Please try again.');
        }
    }, [dispatch, requestId, proposalAmount, proposalMessage, routeInfo]);

    // Handle complete
    const handleComplete = useCallback(async () => {
        Alert.alert(
            'Complete Service',
            'Mark this service as completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete',
                    onPress: async () => {
                        try {
                            // Stop all location tracking first (background + foreground)
                            await stopLocationTracking();

                            // Then complete the service via dispatch
                            await dispatch(completeService(requestId)).unwrap();

                            // Clean up Redux state for this completed service
                            dispatch(cleanupCompletedService(requestId));

                            Alert.alert('Success', 'Service completed!', [
                                {
                                    text: 'OK',
                                    onPress: () => {
                                        // Use InteractionManager to wait for alert to dismiss
                                        InteractionManager.runAfterInteractions(() => {
                                            if (isMountedRef.current) {
                                                router.replace('/(vendor)/(servicerequests)/');
                                            }
                                        });
                                    }
                                }
                            ]);
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to complete service.');
                        }
                    },
                },
            ]
        );
    }, [dispatch, requestId, router, stopLocationTracking]);

    // Request not found - check early
    if (!request && !isLoading) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
                <Text type="title" style={styles.errorText}>Request not found</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text type="bodySemiBold" style={styles.backButtonText}>Go Back</Text>
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

    // Request not found after loading
    if (!request) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
                <Text type="title" style={styles.errorText}>Request not found</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text type="bodySemiBold" style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const isUrgent = timeLeft <= 30;
    const canSendProposal = !request?.already_sent && request?.status === 'pending';

    // Check if vendor is within 100 meters of customer location
    // Using straight-line (Haversine) distance for accurate proximity check
    // 0.1 km = 100 meters
    const isWithinRange = straightLineDistanceKm !== null ? straightLineDistanceKm <= 0.1 : false;

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
                <Marker coordinate={vendorLocation} title="Your Location" pinColor={COLORS.primary}>
                    <View style={styles.vendorMarker}>
                        <Ionicons name="car" size={24} color={COLORS.white} />
                    </View>
                </Marker>

                <Marker coordinate={customerLocation} title="Customer Location" description={request?.customer?.name}>
                    <View style={styles.customerMarker}>
                        <Ionicons name="location" size={32} color={COLORS.accent} />
                    </View>
                </Marker>

                {routeInfo && routeInfo.coordinates.length > 0 && (
                    <Polyline
                        coordinates={routeInfo.coordinates}
                        strokeColor={COLORS.primary}
                        strokeWidth={4}
                        lineDashPattern={[1]}
                    />
                )}
            </MapView>

            {/* ETA Card */}
            {routeInfo && (
                <View style={styles.etaCard}>
                    <View style={styles.etaItem}>
                        <Ionicons name="navigate" size={20} color={COLORS.primary} />
                        <Text type="body" style={styles.etaLabel}>Distance</Text>
                        <Text type="bodySemiBold" style={styles.etaValue}>{formatDistance(routeInfo.distance)}</Text>
                    </View>
                    <View style={styles.etaDivider} />
                    <View style={styles.etaItem}>
                        <Ionicons name="time" size={20} color={COLORS.accent} />
                        <Text type="body" style={styles.etaLabel}>ETA</Text>
                        <Text type="bodySemiBold" style={styles.etaValue}>{formatDuration(routeInfo.duration)}</Text>
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

            {/* Status Banner - Service Accepted */}
            {isAccepted && request?.status !== 'completed' && (
                <View style={[styles.statusBanner, { backgroundColor: COLORS.success }]}>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
                    <View style={styles.statusTextContainer}>
                        <Text type="bodySemiBold" style={styles.statusTitle}>Service Accepted!</Text>
                        <Text type="body" style={styles.statusSubtitle}>Contact the customer and complete the service</Text>
                    </View>
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
                            <View style={styles.proposalInputContainer}>
                                <TouchableOpacity
                                    style={styles.proposalButton}
                                    onPress={() => setProposalAmount((prev) => Math.max(100, prev - 100))}
                                    disabled={isPendingProposal}
                                >
                                    <Ionicons name="remove" size={24} color={COLORS.white} />
                                </TouchableOpacity>

                                <View style={styles.proposalAmountContainer}>
                                    <Text type="body" style={styles.currencySymbol}>PKR</Text>
                                    <Text type="title" style={styles.proposalAmount}>{proposalAmount}</Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.proposalButton}
                                    onPress={() => setProposalAmount((prev) => prev + 100)}
                                    disabled={isPendingProposal}
                                >
                                    <Ionicons name="add" size={24} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>

                            {/* Quick amount presets */}
                            <View style={styles.presetsContainer}>
                                {[300, 500, 800, 1000].map((amount) => (
                                    <TouchableOpacity
                                        key={amount}
                                        style={[
                                            styles.presetButton,
                                            proposalAmount === amount && styles.presetButtonActive,
                                        ]}
                                        onPress={() => setProposalAmount(amount)}
                                        disabled={isPendingProposal}
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
                                style={[styles.sendProposalButton, isPendingProposal && styles.buttonDisabled]}
                                onPress={handleSendProposal}
                                disabled={isPendingProposal}
                            >
                                <LinearGradient
                                    colors={isPendingProposal ? [COLORS.gray400, COLORS.gray500] : [COLORS.primary, COLORS.accent]}
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
                        </View>
                    )}

                    {/* Proposal Sent Status */}
                    {request?.already_sent && request?.vendor_status === 'pending' && (
                        <View style={styles.proposalSentContainer}>
                            <Ionicons name="hourglass" size={24} color={COLORS.warning} />
                            <Text type="bodySemiBold" style={styles.proposalSentText}>
                                Waiting for customer response...
                            </Text>
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

                    {/* Spacer */}
                    <View style={{ height: verticalScale(40) }} />
                </BottomSheetScrollView>
            </BottomSheet>
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
    vendorMarker: {
        backgroundColor: COLORS.primary,
        padding: scale(8),
        borderRadius: moderateScale(20),
        borderWidth: 3,
        borderColor: COLORS.white,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    customerMarker: {
        alignItems: 'center',
    },
    etaCard: {
        position: 'absolute',
        top: verticalScale(16),
        left: scale(16),
        right: scale(16),
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(12),
        padding: scale(16),
        flexDirection: 'row',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    etaItem: {
        flex: 1,
        alignItems: 'center',
    },
    etaDivider: {
        width: 1,
        backgroundColor: COLORS.gray200,
        marginHorizontal: scale(12),
    },
    etaLabel: {
        color: COLORS.gray500,
        marginTop: verticalScale(4),
    },
    etaValue: {
        color: COLORS.gray900,
        marginTop: verticalScale(2),
    },
    timerBarContainer: {
        position: 'absolute',
        top: verticalScale(100),
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
    statusBanner: {
        position: 'absolute',
        top: verticalScale(100),
        left: scale(16),
        right: scale(16),
        borderRadius: moderateScale(12),
        padding: scale(16),
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    statusTextContainer: {
        marginLeft: scale(12),
        flex: 1,
    },
    statusTitle: {
        color: COLORS.white,
    },
    statusSubtitle: {
        color: COLORS.white,
        opacity: 0.9,
        marginTop: verticalScale(2),
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
        justifyContent: 'space-between',
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
        flex: 1,
        alignItems: 'center',
        backgroundColor: COLORS.gray50,
        marginHorizontal: scale(16),
        padding: verticalScale(16),
        borderRadius: moderateScale(12),
        borderWidth: 2,
        borderColor: COLORS.primary + '30',
    },
    currencySymbol: {
        color: COLORS.gray500,
    },
    proposalAmount: {
        fontSize: moderateScale(32),
        color: COLORS.gray900,
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
        top: verticalScale(160),
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
});
