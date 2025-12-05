// app/(vendor)/(servicerequests)/websocket-requests.tsx
/**
 * WebSocket Service Requests Screen
 *
 * Real-time service requests using WebSocket dispatch system.
 * Shows requests from the backend via WebSocket connection.
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    Platform,
    Animated,
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
    selectConnectionStatus,
    selectIsConnected,
    selectServiceRequests,
    updateLocation,
} from '@/store/slices/dispatchSlice';
import { WebSocketRequestCard } from '@/components/vendor/WebSocketRequestCard';
import { SocketStatusIndicator } from '@/components/common/SocketStatusIndicator';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useRouter, useFocusEffect } from 'expo-router';
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
    const serviceRequests = useSelector(selectServiceRequests);

    // Active job selector - if vendor has active service, redirect to it
    const activeJobId = useSelector((state: RootState) => state.dispatch.activeJobId);

    // Local state
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.95));
    const [locationPermission, setLocationPermission] = useState(false);
    const [newRequestIds, setNewRequestIds] = useState<Set<number>>(new Set());

    // Refs
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const previousRequestIds = useRef<Set<number>>(new Set());
    const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

    // ========================================================================
    // Auto-navigate to active job when tab is focused
    // ========================================================================

    useFocusEffect(
        useCallback(() => {
            // If vendor has an active job, auto-navigate to the details screen
            if (activeJobId) {
                if (__DEV__) {
                    console.log('[WebSocketRequests] Active job found, navigating to:', activeJobId);
                }
                router.push({
                    pathname: '/(vendor)/(servicerequests)/websocket-request-details',
                    params: { id: activeJobId.toString() },
                } as any);
            }
        }, [activeJobId, router])
    );

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
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
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
        marginBottom: 4,
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
        lineHeight: 20,
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
        gap: 8,
    },
    emptyStateButtonText: {
        color: '#fff',
    },
});
