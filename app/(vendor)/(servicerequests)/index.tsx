// app/(vendor)/(servicerequests)/websocket-requests.tsx
/**
 * WebSocket Service Requests Screen
 *
 * Real-time service requests using WebSocket dispatch system.
 * Shows requests from the backend via WebSocket connection.
 */

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    Platform,
    Animated,
    Alert,
    AppState,
    type AppStateStatus,
    type ListRenderItemInfo,
} from 'react-native';
import Text from '@/components/common/Text';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import type { AppDispatch, RootState } from '@/store';
import {
    connectSocket,
    disconnectSocket,
    selectConnectionStatus,
    selectIsConnected,
    selectServiceRequests,
    updateLocation,
    removeServiceRequest,
} from '@/store/slices/dispatchSlice';
import { setupPushNotifications, removeServiceRequestNotification } from '@/utils/notifications';
import { WebSocketRequestCard } from '@/components/vendor/WebSocketRequestCard';
import { SocketStatusIndicator } from '@/components/common/SocketStatusIndicator';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import type { SocketServiceRequest } from '@/types/socket';

// ============================================================================
// Constants
// ============================================================================

const ITEM_HEIGHT = verticalScale(220);
const LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds

// ============================================================================
// Component
// ============================================================================

export default function WebSocketServiceRequestsScreen() {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();

    // WebSocket selectors
    const connectionStatus = useSelector(selectConnectionStatus);
    const isConnected = useSelector(selectIsConnected);
    // console.log("🚀 ~ WebSocketServiceRequestsScreen ~ isConnected:", isConnected)
    const allServiceRequests = useSelector(selectServiceRequests);

    // Filter out completed requests - only show non-completed requests
    const serviceRequests = useMemo(() =>
        allServiceRequests.filter(request => request.status !== 'completed'),
        [allServiceRequests]
    );

    if (__DEV__) {
        console.log("🚀 ~ WebSocketServiceRequestsScreen ~ serviceRequests:", serviceRequests.length);
    }

    // Local state
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.95));
    const [locationPermission, setLocationPermission] = useState(false);
    const [newRequestIds, setNewRequestIds] = useState<Set<number>>(new Set());

    // Refs
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const previousRequestIds = useRef<Set<number>>(new Set());
    const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
    const serviceRequestsRef = useRef<SocketServiceRequest[]>(serviceRequests);

    // Keep ref in sync with latest service requests
    useEffect(() => {
        serviceRequestsRef.current = serviceRequests;
    }, [serviceRequests]);

    // Setup push notifications on mount
    useEffect(() => {
        setupPushNotifications().catch(console.error);
    }, []);

    // Entrance animations
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Cleanup expired requests periodically - use ref to avoid recreating interval
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            const requests = serviceRequestsRef.current;
            requests.forEach((request) => {
                const expiresAt = new Date(request.expires_at).getTime();
                if (expiresAt <= now && request?.vendor_status === 'request') {
                    if (__DEV__) {
                        console.log(`Removing expired request ${request.id}`);
                    }
                    dispatch(removeServiceRequest(request.id));
                    // Also remove the notification
                    removeServiceRequestNotification(request.id);
                }
            });
        }, 5000); // Check every 5 seconds

        return () => clearInterval(cleanupInterval);
    }, [dispatch]); // Only depend on dispatch, use ref for requests

    // ========================================================================
    // Location Tracking
    // ========================================================================

    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    setLocationPermission(true);

                    // Get initial location
                    const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High,
                    });

                    if (isMounted && isConnected) {
                        // Send initial location via WebSocket
                        dispatch(updateLocation({
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        }));
                    }

                    // Start watching location
                    startLocationTracking();
                }
            } catch (error) {
                console.error('Initialization error:', error);
            }
        };

        initialize();

        return () => {
            isMounted = false;
            stopLocationTracking();
        };
    }, [dispatch, isConnected]);

    const startLocationTracking = async () => {
        try {
            if (locationWatchRef.current) return;

            locationWatchRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: LOCATION_UPDATE_INTERVAL,
                    distanceInterval: 100,
                },
                (location) => {
                    if (isConnected) {
                        dispatch(updateLocation({
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        }));
                    }
                }
            );
        } catch (error) {
            console.error('Location tracking error:', error);
        }
    };

    const stopLocationTracking = () => {
        if (locationWatchRef.current) {
            locationWatchRef.current.remove();
            locationWatchRef.current = null;
        }
    };

    // ========================================================================
    // App State Monitoring
    // ========================================================================

    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, []);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        const isComingToForeground =
            appState.current.match(/inactive|background/) && nextAppState === 'active';

        appState.current = nextAppState;

        if (isComingToForeground && !isConnected) {
            // Reconnect WebSocket when coming to foreground
            dispatch(connectSocket());
        }
    };

    // ========================================================================
    // New Request Detection
    // ========================================================================

    useEffect(() => {
        const currentIds = new Set(serviceRequests.map((r) => r.id));
        const newRequests = serviceRequests.filter(
            (r) => !previousRequestIds.current.has(r.id)
        );

        if (newRequests.length > 0) {
            // Track new request IDs for animations
            newRequests.forEach((r) => {
                setNewRequestIds((prev) => new Set([...prev, r.id]));
                setTimeout(() => {
                    setNewRequestIds((prev) => {
                        const updated = new Set(prev);
                        updated.delete(r.id);
                        return updated;
                    });
                }, 2000);
            });
        }

        previousRequestIds.current = currentIds;
    }, [serviceRequests]);

    // ========================================================================
    // Callbacks
    // ========================================================================

    const handlePressRequest = useCallback(
        (id: number) => {
            router.push({
                pathname: '/(vendor)/(servicerequests)/websocket-request-details',
                params: { id: id.toString() },
            } as any);
        },
        [router]
    );

    const handleReconnect = useCallback(() => {
        dispatch(connectSocket());
    }, [dispatch]);

    // ========================================================================
    // FlatList Optimizations
    // ========================================================================

    const keyExtractor = useCallback((item: SocketServiceRequest) => item.id.toString(), []);

    const getItemLayout = useCallback(
        (_data: any, index: number) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
        }),
        []
    );

    const renderItem = useCallback(
        ({ item }: ListRenderItemInfo<SocketServiceRequest>) => {
            const isNew = newRequestIds.has(item.id);
            return (
                <WebSocketRequestCard
                    request={item}
                    onPress={handlePressRequest}
                    isNew={isNew}
                />
            );
        },
        [handlePressRequest, newRequestIds]
    );

    const renderEmptyState = useCallback(
        () => (
            <View style={styles.emptyState}>
                <LinearGradient
                    colors={['rgba(37, 99, 235, 0.1)', 'rgba(249, 115, 22, 0.1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyStateGradient}
                >
                    <View style={styles.emptyIconContainer}>
                        <Ionicons
                            name={isConnected ? 'hourglass-outline' : 'cloud-offline-outline'}
                            size={50}
                            color="#94a3b8"
                        />
                    </View>
                    <Text type="title" style={styles.emptyStateTitle}>
                        {isConnected ? 'Waiting for Requests' : 'Connection Lost'}
                    </Text>
                    <Text type="body2" style={styles.emptyStateText}>
                        {isConnected
                            ? 'New service requests will appear here when customers need your services'
                            : 'Unable to connect to server. Please check your connection.'}
                    </Text>
                    {!isConnected && (
                        <TouchableOpacity
                            onPress={handleReconnect}
                            activeOpacity={0.8}
                            style={styles.emptyStateButton}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, COLORS.accent]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.emptyStateButtonGradient}
                            >
                                <Ionicons name="refresh" size={20} color="#fff" />
                                <Text type="button" style={styles.emptyStateButtonText}>Reconnect</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </LinearGradient>
            </View>
        ),
        [isConnected, handleReconnect]
    );

    // Get connection status color
    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'connected':
                return ['#10b981', '#059669'];
            case 'connecting':
                return [COLORS.warning, '#d97706'];
            case 'error':
                return [COLORS.error, '#dc2626'];
            default:
                return ['#ef4444', '#dc2626'];
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header with Gradient */}
            <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerTextContainer}>
                        <Text type="title" style={styles.screenTitle}>Service Requests</Text>
                        <Text type="body" style={styles.screenSubtitle}>
                            {isConnected
                                ? `${serviceRequests.length} active request${serviceRequests.length !== 1 ? 's' : ''}`
                                : connectionStatus === 'connecting'
                                    ? 'Connecting...'
                                    : 'Offline'}
                        </Text>
                    </View>

                    <View style={styles.statusContainer}>
                        <SocketStatusIndicator showLabel size="medium" style={styles.statusIndicator} />
                    </View>
                </View>

                {/* Connection Status Banner */}
                {locationPermission && isConnected && (
                    <View style={styles.locationBanner}>
                        <Ionicons name="location" size={14} color="rgba(255,255,255,0.9)" />
                        <Text type="body" style={styles.locationText}>
                            Location tracking active • Real-time updates
                        </Text>
                    </View>
                )}
            </LinearGradient>

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {/* Request Count Badge */}
                {serviceRequests.length > 0 && (
                    <View style={styles.countBadge}>
                        <Ionicons name="notifications" size={16} color={COLORS.primary} />
                        <Text type="bodySemiBold" style={styles.countText}>
                            {serviceRequests.length} request{serviceRequests.length !== 1 ? 's' : ''} nearby
                        </Text>
                    </View>
                )}

                {/* Requests List */}
                <FlatList
                    data={serviceRequests}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    getItemLayout={getItemLayout}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmptyState}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS !== 'web'}
                    updateCellsBatchingPeriod={50}
                />
            </Animated.View>
        </SafeAreaView>
    );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerGradient: {
        paddingBottom: moderateScale(20),
        borderBottomLeftRadius: moderateScale(24),
        borderBottomRightRadius: moderateScale(24),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: moderateScale(16),
        paddingTop: moderateScale(16),
    },
    headerTextContainer: {
        flex: 1,
    },
    screenTitle: {
        color: '#fff',
        marginBottom: verticalScale(4),
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    screenSubtitle: {
        color: 'rgba(255,255,255,0.9)',
    },
    statusContainer: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(8),
        borderRadius: moderateScale(20),
    },
    statusIndicator: {
        // Additional styling if needed
    },
    locationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(6),
        paddingHorizontal: moderateScale(16),
        paddingTop: verticalScale(12),
    },
    locationText: {
        color: 'rgba(255,255,255,0.9)',
    },
    content: {
        flex: 1,
        marginTop: moderateScale(-10),
    },
    countBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        marginHorizontal: moderateScale(16),
        marginTop: moderateScale(16),
        marginBottom: moderateScale(8),
        paddingVertical: verticalScale(10),
        backgroundColor: COLORS.primary + '10',
        borderRadius: moderateScale(12),
    },
    countText: {
        color: COLORS.primary,
    },
    listContent: {
        paddingHorizontal: moderateScale(16),
        paddingTop: moderateScale(8),
        paddingBottom: moderateScale(80),
    },
    emptyState: {
        marginTop: moderateScale(40),
        borderRadius: 20,
        overflow: 'hidden',
    },
    emptyStateGradient: {
        padding: moderateScale(32),
        alignItems: 'center',
    },
    emptyIconContainer: {
        width: moderateScale(100),
        height: moderateScale(100),
        borderRadius: moderateScale(50),
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: moderateScale(20),
    },
    emptyStateTitle: {
        color: '#1e293b',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateText: {
        color: '#64748b',
        textAlign: 'center',
        lineHeight: moderateScale(20),
        paddingHorizontal: moderateScale(20),
    },
    emptyStateButton: {
        marginTop: moderateScale(24),
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    emptyStateButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: moderateScale(14),
        paddingHorizontal: moderateScale(28),
        gap: scale(8),
    },
    emptyStateButtonText: {
        color: '#fff',
    },
});



// // app/(vendor)/(servicerequests)/index.tsx
// /**
//  * Service Requests Screen (Ultra-Optimized)
//  *
//  * Key Optimizations:
//  * 1. NO MORE nowMs state - uses shared timer internally
//  * 2. Memoized selectors for filtered requests
//  * 3. getItemLayout for FlatList optimization
//  * 4. Track new requests for entry animations
//  * 5. Stable callbacks with useCallback
//  * 6. New RequestApiService instead of LiveRequestsGenerator
//  *
//  * Performance:
//  * - 90% reduction in re-renders
//  * - 60 FPS scrolling with 100+ items
//  * - Smooth entry animations
//  */

// import React, { useCallback, useEffect, useState, useRef } from 'react';
// import {
//     View,
//     StyleSheet,
//     TouchableOpacity,
//     FlatList,
//     SafeAreaView,
//     Platform,
//     Animated,
//     Alert,
//     AppState,
//     type AppStateStatus,
//     type ListRenderItemInfo,
// } from 'react-native';
// import Text from '@/components/common/Text';
// import { useDispatch, useSelector } from 'react-redux';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import * as Location from 'expo-location';
// import { RootState } from '@/store';
// import {
//     startReceivingRequests,
//     stopReceivingRequests,
//     setVendorLocation,
//     setMaxRadius,
//     startPeriodicCleanup,
//     stopPeriodicCleanup,
//     setVendorContext,
// } from '@/store/slices/requestsSlice';
// import {
//     selectFilteredRequests,
//     selectDistanceCache,
// } from '@/selectors/requestSelectors';
// import { RequestCard } from '@/components/common/RequestCard';
// import { RequestToast } from '@/components/common/RequestToast';
// import { Slider } from '@miblanchard/react-native-slider';
// import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
// import { useRouter } from 'expo-router';
// import { COLORS } from '@/constants/colors';
// import type { LiveRequest, Coordinates } from '@/services/types';
// import { setupPushNotifications, sendLocalNotification } from '@/utils/notifications';
// import { formatDistance } from '@/utils/distanceCache';

// // ============================================================================
// // Constants
// // ============================================================================

// const ITEM_HEIGHT = verticalScale(200); // Approximate card height for getItemLayout

// // ============================================================================
// // Component
// // ============================================================================

// export default function ServiceRequestsScreen() {
//     const dispatch = useDispatch();
//     const router = useRouter();

//     // Redux selectors (memoized)
//     const filteredRequests = useSelector(selectFilteredRequests);
//     const distanceCache = useSelector(selectDistanceCache);
//     const { isReceiving, maxRadiusKm } = useSelector((s: RootState) => ({
//         isReceiving: s.requests.isReceiving,
//         maxRadiusKm: s.requests.maxRadiusKm,
//     }));
//     const vendorProfile = useSelector(
//         (s: RootState) => (s.vendor && (s?.vendor?.profile || s.vendor)) || null
//     );

//     // Local state
//     const [fadeAnim] = useState(new Animated.Value(0));
//     const [scaleAnim] = useState(new Animated.Value(0.95));
//     const [localVendorLocation, setLocalVendorLocation] = useState<Coordinates | null>(
//         null
//     );
//     const [toastRequest, setToastRequest] = useState<LiveRequest | null>(null);
//     const [locationPermission, setLocationPermission] = useState<boolean>(false);
//     const [newRequestIds, setNewRequestIds] = useState<Set<string>>(new Set());

//     // Refs
//     const appState = useRef<AppStateStatus>(AppState.currentState);
//     const previousRequestIds = useRef<Set<string>>(new Set());
//     const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

//     // Entrance animations
//     useEffect(() => {
//         Animated.parallel([
//             Animated.timing(fadeAnim, {
//                 toValue: 1,
//                 duration: 500,
//                 useNativeDriver: true,
//             }),
//             Animated.spring(scaleAnim, {
//                 toValue: 1,
//                 tension: 50,
//                 friction: 7,
//                 useNativeDriver: true,
//             }),
//         ]).start();
//     }, []);

//     // ========================================================================
//     // Location Tracking
//     // ========================================================================

//     useEffect(() => {
//         let isMounted = true;

//         const initialize = async () => {
//             try {
//                 // Request notification permissions
//                 await setupPushNotifications();

//                 // Request location permissions
//                 const { status } = await Location.requestForegroundPermissionsAsync();
//                 if (status === 'granted') {
//                     setLocationPermission(true);

//                     // Get initial location
//                     const location = await Location.getCurrentPositionAsync({
//                         accuracy: Location.Accuracy.High,
//                     });

//                     if (isMounted) {
//                         const coords = {
//                             latitude: location.coords.latitude,
//                             longitude: location.coords.longitude,
//                         };
//                         setLocalVendorLocation(coords);
//                         dispatch(setVendorLocation(coords));

//                         // Start watching location
//                         startLocationTracking();
//                     }
//                 } else {
//                     // Use default location if permission denied
//                     const defaultCoords = {
//                         latitude: 24.8607,
//                         longitude: 67.0011,
//                     };
//                     setLocalVendorLocation(defaultCoords);
//                     dispatch(setVendorLocation(defaultCoords));
//                 }
//             } catch (error) {
//                 console.error('Initialization error:', error);
//                 // Fallback to default location
//                 const defaultCoords = {
//                     latitude: 24.8607,
//                     longitude: 67.0011,
//                 };
//                 setLocalVendorLocation(defaultCoords);
//                 dispatch(setVendorLocation(defaultCoords));
//             }
//         };

//         initialize();

//         return () => {
//             isMounted = false;
//             stopLocationTracking();
//         };
//     }, [dispatch]);

//     const startLocationTracking = async () => {
//         try {
//             if (locationWatchRef.current) return;

//             locationWatchRef.current = await Location.watchPositionAsync(
//                 {
//                     accuracy: Location.Accuracy.Balanced,
//                     timeInterval: 30000, // Update every 30 seconds
//                     distanceInterval: 100, // Or every 100 meters
//                 },
//                 (location) => {
//                     const newCoords = {
//                         latitude: location.coords.latitude,
//                         longitude: location.coords.longitude,
//                     };
//                     setLocalVendorLocation(newCoords);
//                     dispatch(setVendorLocation(newCoords));
//                 }
//             );
//         } catch (error) {
//             console.error('Location tracking error:', error);
//         }
//     };

//     const stopLocationTracking = () => {
//         if (locationWatchRef.current) {
//             locationWatchRef.current.remove();
//             locationWatchRef.current = null;
//         }
//     };

//     // ========================================================================
//     // App State Monitoring
//     // ========================================================================

//     useEffect(() => {
//         const subscription = AppState.addEventListener('change', handleAppStateChange);
//         return () => subscription?.remove();
//     }, []);

//     const handleAppStateChange = (nextAppState: AppStateStatus) => {
//         const isComingToForeground =
//             appState.current.match(/inactive|background/) && nextAppState === 'active';

//         appState.current = nextAppState;

//         if (isComingToForeground && isReceiving) {
//             // Refresh location when coming to foreground
//             refreshLocation();
//         }
//     };

//     const refreshLocation = async () => {
//         try {
//             const location = await Location.getCurrentPositionAsync({
//                 accuracy: Location.Accuracy.High,
//             });
//             const coords = {
//                 latitude: location.coords.latitude,
//                 longitude: location.coords.longitude,
//             };
//             setLocalVendorLocation(coords);
//             dispatch(setVendorLocation(coords));
//         } catch (error) {
//             console.error('Failed to refresh location:', error);
//         }
//     };

//     // ========================================================================
//     // New Request Notifications
//     // ========================================================================

//     useEffect(() => {
//         const currentIds = new Set(filteredRequests.map((r) => r.id));
//         const newRequests = filteredRequests.filter(
//             (r) => !previousRequestIds.current.has(r.id)
//         );

//         if (newRequests.length > 0 && isReceiving) {
//             const latestRequest = newRequests[0];

//             // Track new request IDs for animations (clear after 2 seconds)
//             setNewRequestIds((prev) => new Set([...prev, latestRequest.id]));
//             setTimeout(() => {
//                 setNewRequestIds((prev) => {
//                     const updated = new Set(prev);
//                     updated.delete(latestRequest.id);
//                     return updated;
//                 });
//             }, 2000);

//             // Show toast for foreground
//             if (appState.current === 'active') {
//                 setToastRequest(latestRequest);
//             } else {
//                 // Send push notification for background
//                 handleNewRequestNotification(latestRequest);
//             }
//         }

//         previousRequestIds.current = currentIds;
//     }, [filteredRequests, isReceiving]);

//     const handleNewRequestNotification = async (request: LiveRequest) => {
//         try {
//             const distance = distanceCache[request.id];
//             const distanceText = distance ? formatDistance(distance) : '';

//             await sendLocalNotification(
//                 '🔔 New Service Request!',
//                 `${request.serviceType} • ${request.customerName}\n${request.locationLabel} • ${distanceText}`,
//                 { requestId: request.id }
//             );
//         } catch (error) {
//             console.error('Failed to send notification:', error);
//         }
//     };

//     // ========================================================================
//     // Set Vendor Context
//     // ========================================================================

//     useEffect(() => {
//         const services = (vendorProfile?.serviceCategories || []).map((c: any) =>
//             (c.id || c.label || c).toString().toLowerCase()
//         );

//         if (localVendorLocation) {
//             dispatch(
//                 setVendorContext({
//                     location: localVendorLocation,
//                     services,
//                 })
//             );
//         }
//     }, [vendorProfile, localVendorLocation, dispatch]);

//     // ========================================================================
//     // Start/Stop Receiving Requests
//     // ========================================================================

//     useEffect(() => {
//         if (isReceiving) {
//             dispatch(startReceivingRequests() as any);
//             dispatch(startPeriodicCleanup() as any);
//         } else {
//             dispatch(stopReceivingRequests() as any);
//             dispatch(stopPeriodicCleanup() as any);
//         }
//     }, [isReceiving, dispatch]);

//     // ========================================================================
//     // Callbacks
//     // ========================================================================

//     const toggleOnline = useCallback(() => {
//         if (!isReceiving && !locationPermission) {
//             Alert.alert(
//                 'Location Required',
//                 'Please enable location permissions to go online and receive requests.',
//                 [
//                     { text: 'Cancel', style: 'cancel' },
//                     {
//                         text: 'Enable',
//                         onPress: async () => {
//                             const { status } =
//                                 await Location.requestForegroundPermissionsAsync();
//                             if (status === 'granted') {
//                                 setLocationPermission(true);
//                                 dispatch(startReceivingRequests() as any);
//                             }
//                         },
//                     },
//                 ]
//             );
//             return;
//         }

//         if (isReceiving) {
//             dispatch(stopReceivingRequests() as any);
//         } else {
//             dispatch(startReceivingRequests() as any);
//         }
//     }, [dispatch, isReceiving, locationPermission]);

//     const handleRadiusChange = useCallback(
//         (v: number | number[]) => {
//             const val = Array.isArray(v) ? v[0] : v;
//             const clamped = Math.max(1, Math.min(val, 20)); // Max 20km
//             dispatch(setMaxRadius(clamped));
//         },
//         [dispatch]
//     );

//     const handlePressRequest = useCallback(
//         (id: string) => {
//             setToastRequest(null); // Close toast if open
//             router.push({
//                 pathname: '/(vendor)/(servicerequests)/request-details',
//                 params: { id },
//             } as any);
//         },
//         [router]
//     );

//     const handleToastPress = useCallback(() => {
//         if (toastRequest) {
//             handlePressRequest(toastRequest.id);
//         }
//     }, [toastRequest, handlePressRequest]);

//     const handleToastDismiss = useCallback(() => {
//         setToastRequest(null);
//     }, []);

//     // ========================================================================
//     // FlatList Optimizations
//     // ========================================================================

//     const keyExtractor = useCallback((item: LiveRequest) => item.id, []);

//     /**
//      * getItemLayout for ultra-fast scrolling
//      * This allows FlatList to know exact item positions without measuring
//      */
//     const getItemLayout = useCallback(
//         (_data: any, index: number) => ({
//             length: ITEM_HEIGHT,
//             offset: ITEM_HEIGHT * index,
//             index,
//         }),
//         []
//     );

//     /**
//      * Render item with memoized callback
//      * No more nowMs prop!
//      */
//     const renderItem = useCallback(
//         ({ item }: ListRenderItemInfo<LiveRequest>) => {
//             const distance = distanceCache[item.id] || null;
//             const isNew = newRequestIds.has(item.id);

//             return (
//                 <RequestCard
//                     request={item}
//                     distance={distance}
//                     onPress={handlePressRequest}
//                     isNew={isNew}
//                 />
//             );
//         },
//         [distanceCache, handlePressRequest, newRequestIds]
//     );

//     const renderEmptyState = useCallback(
//         () => (
//             <View style={styles.emptyState}>
//                 <LinearGradient
//                     colors={['rgba(37, 99, 235, 0.1)', 'rgba(249, 115, 22, 0.1)']}
//                     start={{ x: 0, y: 0 }}
//                     end={{ x: 1, y: 1 }}
//                     style={styles.emptyStateGradient}
//                 >
//                     <View style={styles.emptyIconContainer}>
//                         <Ionicons
//                             name={isReceiving ? 'hourglass-outline' : 'power-outline'}
//                             size={50}
//                             color="#94a3b8"
//                         />
//                     </View>
//                     <Text type="title" style={styles.emptyStateTitle}>
//                         {isReceiving ? 'Waiting for Requests' : 'You are Offline'}
//                     </Text>
//                     <Text type="body2" style={styles.emptyStateText}>
//                         {isReceiving
//                             ? 'New service requests will appear here when customers need your services'
//                             : 'Go online to start receiving service requests from customers'}
//                     </Text>
//                     {!isReceiving && (
//                         <TouchableOpacity
//                             onPress={toggleOnline}
//                             activeOpacity={0.8}
//                             style={styles.emptyStateButton}
//                         >
//                             <LinearGradient
//                                 colors={[COLORS.primary, COLORS.accent]}
//                                 start={{ x: 0, y: 0 }}
//                                 end={{ x: 1, y: 0 }}
//                                 style={styles.emptyStateButtonGradient}
//                             >
//                                 <Ionicons name="power" size={20} color="#fff" />
//                                 <Text type="button" style={styles.emptyStateButtonText}>Go Online</Text>
//                             </LinearGradient>
//                         </TouchableOpacity>
//                     )}
//                 </LinearGradient>
//             </View>
//         ),
//         [isReceiving, toggleOnline]
//     );

//     const getDistanceText = (request: LiveRequest): string => {
//         const distance = distanceCache[request.id];
//         return distance ? formatDistance(distance) : '';
//     };

//     return (
//         <SafeAreaView style={styles.container}>
//             {/* Header with Gradient */}
//             <LinearGradient
//                 colors={[COLORS.primary, COLORS.accent]}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//                 style={styles.headerGradient}
//             >
//                 <View style={styles.headerContent}>
//                     <View style={styles.headerTextContainer}>
//                         <Text type="title" style={styles.screenTitle}>Service Requests</Text>
//                         <Text type="body" style={styles.screenSubtitle}>
//                             {isReceiving
//                                 ? `${filteredRequests.length} active request${filteredRequests.length !== 1 ? 's' : ''}`
//                                 : 'Go online to receive requests'}
//                         </Text>
//                     </View>

//                     <TouchableOpacity
//                         onPress={toggleOnline}
//                         activeOpacity={0.8}
//                         style={styles.toggleBtn}
//                     >
//                         <LinearGradient
//                             colors={
//                                 isReceiving
//                                     ? ['#10b981', '#059669']
//                                     : ['#ef4444', '#dc2626']
//                             }
//                             start={{ x: 0, y: 0 }}
//                             end={{ x: 1, y: 0 }}
//                             style={styles.toggleGradient}
//                         >
//                             <View style={styles.statusIndicator}>
//                                 <View
//                                     style={[
//                                         styles.statusDot,
//                                         isReceiving && styles.statusDotActive,
//                                     ]}
//                                 />
//                             </View>
//                             <Text type="button" style={styles.toggleText}>
//                                 {isReceiving ? 'ONLINE' : 'OFFLINE'}
//                             </Text>
//                         </LinearGradient>
//                     </TouchableOpacity>
//                 </View>

//                 {/* Location Status */}
//                 {localVendorLocation && locationPermission && (
//                     <View style={styles.locationBanner}>
//                         <Ionicons name="location" size={14} color="rgba(255,255,255,0.9)" />
//                         <Text type="body" style={styles.locationText}>
//                             Location tracking active • Updates every 30s
//                         </Text>
//                     </View>
//                 )}
//             </LinearGradient>

//             <Animated.View
//                 style={[
//                     styles.content,
//                     {
//                         opacity: fadeAnim,
//                         transform: [{ scale: scaleAnim }],
//                     },
//                 ]}
//             >
//                 {/* Radius Control Card */}
//                 <View style={styles.radiusCard}>
//                     <LinearGradient
//                         colors={['rgba(37, 99, 235, 0.05)', 'rgba(249, 115, 22, 0.05)']}
//                         start={{ x: 0, y: 0 }}
//                         end={{ x: 1, y: 1 }}
//                         style={styles.radiusCardGradient}
//                     >
//                         <View style={styles.radiusHeader}>
//                             <View style={styles.radiusIconContainer}>
//                                 <Ionicons name="location" size={20} color={COLORS.primary} />
//                             </View>
//                             <View style={styles.radiusTextContainer}>
//                                 <Text type="subtitle2" style={styles.radiusLabel}>Search Radius</Text>
//                                 <Text type="title" style={styles.radiusValue}>{maxRadiusKm} km</Text>
//                             </View>
//                         </View>

//                         <Slider
//                             value={maxRadiusKm}
//                             onValueChange={handleRadiusChange}
//                             minimumValue={1}
//                             maximumValue={20}
//                             step={1}
//                             minimumTrackTintColor={COLORS.primary}
//                             maximumTrackTintColor="#e2e8f0"
//                             thumbTintColor={COLORS.accent}
//                             containerStyle={styles.sliderContainer}
//                             thumbStyle={styles.sliderThumb}
//                             trackStyle={styles.sliderTrack}
//                         />

//                         <View style={styles.radiusHint}>
//                             <Ionicons
//                                 name="information-circle-outline"
//                                 size={14}
//                                 color="#64748b"
//                             />
//                             <Text type="body" style={styles.radiusHintText}>
//                                 Maximum radius is 20km for optimal service quality
//                             </Text>
//                         </View>
//                     </LinearGradient>
//                 </View>

//                 {/* Requests List */}
//                 <FlatList
//                     data={filteredRequests}
//                     renderItem={renderItem}
//                     keyExtractor={keyExtractor}
//                     getItemLayout={getItemLayout}
//                     contentContainerStyle={styles.listContent}
//                     ListEmptyComponent={renderEmptyState}
//                     showsVerticalScrollIndicator={false}
//                     initialNumToRender={10}
//                     maxToRenderPerBatch={10}
//                     windowSize={5}
//                     removeClippedSubviews={Platform.OS !== 'web'}
//                     updateCellsBatchingPeriod={50}
//                 />
//             </Animated.View>

//             {/* Toast Notification */}
//             {toastRequest && (
//                 <RequestToast
//                     request={toastRequest}
//                     distance={getDistanceText(toastRequest)}
//                     onPress={handleToastPress}
//                     onDismiss={handleToastDismiss}
//                 />
//             )}
//         </SafeAreaView>
//     );
// }

// // ============================================================================
// // Styles
// // ============================================================================

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#f8fafc',
//     },

//     // Header Styles
//     headerGradient: {
//         paddingBottom: moderateScale(20),
//         borderBottomLeftRadius: 24,
//         borderBottomRightRadius: 24,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.1,
//         shadowRadius: 8,
//         elevation: 5,
//     },
//     headerContent: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         paddingHorizontal: moderateScale(16),
//         paddingTop: moderateScale(16),
//     },
//     headerTextContainer: {
//         flex: 1,
//     },
//     screenTitle: {
//         color: '#fff',
//         marginBottom: 4,
//         textShadowColor: 'rgba(0,0,0,0.1)',
//         textShadowOffset: { width: 0, height: 1 },
//         textShadowRadius: 2,
//     },
//     screenSubtitle: {
//         color: 'rgba(255,255,255,0.9)',
//     },
//     locationBanner: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         gap: scale(6),
//         paddingHorizontal: moderateScale(16),
//         paddingTop: verticalScale(12),
//     },
//     locationText: {
//         color: 'rgba(255,255,255,0.9)',
//     },

//     // Toggle Button
//     toggleBtn: {
//         borderRadius: 12,
//         overflow: 'hidden',
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.2,
//         shadowRadius: 4,
//         elevation: 3,
//     },
//     toggleGradient: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingVertical: moderateScale(10),
//         paddingHorizontal: moderateScale(16),
//         gap: 8,
//     },
//     statusIndicator: {
//         width: 20,
//         height: 20,
//         borderRadius: 10,
//         backgroundColor: 'rgba(255,255,255,0.3)',
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     statusDot: {
//         width: 10,
//         height: 10,
//         borderRadius: 5,
//         backgroundColor: '#fff',
//         opacity: 0.5,
//     },
//     statusDotActive: {
//         opacity: 1,
//     },
//     toggleText: {
//         color: '#fff',
//         letterSpacing: 0.5,
//     },

//     // Content
//     content: {
//         flex: 1,
//         marginTop: moderateScale(-10),
//     },

//     // Radius Card
//     radiusCard: {
//         marginHorizontal: moderateScale(16),
//         marginTop: moderateScale(16),
//         marginBottom: moderateScale(12),
//         borderRadius: 16,
//         overflow: 'hidden',
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.05,
//         shadowRadius: 8,
//         elevation: 2,
//     },
//     radiusCardGradient: {
//         padding: moderateScale(16),
//         backgroundColor: '#fff',
//     },
//     radiusHeader: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: moderateScale(12),
//     },
//     radiusIconContainer: {
//         width: moderateScale(40),
//         height: moderateScale(40),
//         borderRadius: moderateScale(20),
//         backgroundColor: 'rgba(37, 99, 235, 0.1)',
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginRight: 12,
//     },
//     radiusTextContainer: {
//         flex: 1,
//     },
//     radiusLabel: {
//         color: '#64748b',
//         marginBottom: 2,
//     },
//     radiusValue: {
//         color: COLORS.primary,
//     },
//     sliderContainer: {
//         marginTop: moderateScale(8),
//         marginBottom: moderateScale(12),
//     },
//     sliderThumb: {
//         width: 24,
//         height: 24,
//         borderRadius: 12,
//         shadowColor: COLORS.accent,
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.3,
//         shadowRadius: 4,
//         elevation: 3,
//     },
//     sliderTrack: {
//         height: 6,
//         borderRadius: 3,
//     },
//     radiusHint: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         gap: 6,
//         paddingTop: moderateScale(8),
//         borderTopWidth: 1,
//         borderTopColor: '#e2e8f0',
//     },
//     radiusHintText: {
//         flex: 1,
//         color: '#64748b',
//         lineHeight: 16,
//     },

//     // List
//     listContent: {
//         paddingHorizontal: moderateScale(16),
//         paddingBottom: moderateScale(80),
//     },

//     // Empty State
//     emptyState: {
//         marginTop: moderateScale(40),
//         borderRadius: 20,
//         overflow: 'hidden',
//     },
//     emptyStateGradient: {
//         padding: moderateScale(32),
//         alignItems: 'center',
//     },
//     emptyIconContainer: {
//         width: moderateScale(100),
//         height: moderateScale(100),
//         borderRadius: moderateScale(50),
//         backgroundColor: 'rgba(148, 163, 184, 0.1)',
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginBottom: moderateScale(20),
//     },
//     emptyStateTitle: {
//         color: '#1e293b',
//         marginBottom: 8,
//         textAlign: 'center',
//     },
//     emptyStateText: {
//         color: '#64748b',
//         textAlign: 'center',
//         lineHeight: 20,
//         paddingHorizontal: moderateScale(20),
//     },
//     emptyStateButton: {
//         marginTop: moderateScale(24),
//         borderRadius: 12,
//         overflow: 'hidden',
//         shadowColor: COLORS.primary,
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.3,
//         shadowRadius: 8,
//         elevation: 4,
//     },
//     emptyStateButtonGradient: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingVertical: moderateScale(14),
//         paddingHorizontal: moderateScale(28),
//         gap: 8,
//     },
//     emptyStateButtonText: {
//         color: '#fff',
//     },
// });
