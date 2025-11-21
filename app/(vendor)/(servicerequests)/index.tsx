import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    Platform,
    Animated,
    Alert,
    AppState,
    type AppStateStatus,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { RootState } from '@/store';
import {
    setOnline,
    setRadius,
    startReceivingRequests,
    stopReceivingRequests,
    startPruneLoop,
    stopPruneLoop,
    setVendorContext,
} from '@/store/slices/requestsSlice';
import { RequestCard } from '@/components/common/RequestCard';
import { RequestToast } from '@/components/common/RequestToast';
import { LiveRequestsGenerator } from '@/services/liveRequestsServices';
import { Slider } from '@miblanchard/react-native-slider';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import type { LiveRequest, Coordinates } from '@/services/types';
import { haversineDistanceKm } from '@/utils/geo';
import { setupPushNotifications, sendLocalNotification } from '@/utils/notifications';

export default function ServiceRequestsScreen() {
    const dispatch = useDispatch();
    const router = useRouter();

    const { requests, isOnline, radiusKm } = useSelector((s: RootState) => s.requests);
    const vendorProfile = useSelector(
        (s: RootState) => (s.vendor && (s?.vendor?.profile || s.vendor)) || null
    );

    // State
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.95));
    const [vendorLocation, setVendorLocation] = useState<Coordinates | null>(null);
    const [toastRequest, setToastRequest] = useState<LiveRequest | null>(null);
    const [locationPermission, setLocationPermission] = useState<boolean>(false);

    // Refs
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const previousRequestIds = useRef<Set<string>>(new Set());
    const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

    // Animations
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

    // Initialize permissions and location tracking
    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            try {
                // Request notification permissions
                await setupPushNotifications();

                // Request location permissions
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    setLocationPermission(true);

                    // Get initial location
                    const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High
                    });

                    if (isMounted) {
                        const coords = {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude
                        };
                        setVendorLocation(coords);

                        // Start watching location
                        startLocationTracking(coords);
                    }
                } else {
                    // Use default location if permission denied
                    const defaultCoords = { latitude: 24.8559743, longitude: 67.3334962 };
                    setVendorLocation(defaultCoords);
                }
            } catch (error) {
                console.error('Initialization error:', error);
                // Fallback to default location
                const defaultCoords = { latitude: 24.8559743, longitude: 67.3334962 };
                setVendorLocation(defaultCoords);
            }
        };

        initialize();

        return () => {
            isMounted = false;
            stopLocationTracking();
        };
    }, []);

    // Location tracking
    const startLocationTracking = async (_initialCoords: Coordinates) => {
        try {
            if (locationWatchRef.current) return;

            locationWatchRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 30000, // Update every 30 seconds
                    distanceInterval: 100, // Or every 100 meters
                },
                (location) => {
                    const newCoords = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    };
                    setVendorLocation(newCoords);

                    // Update vendor context in Redux
                    dispatch(setVendorContext({ location: newCoords }));
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

    // Monitor app state for foreground/background
    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, []);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        const isComingToForeground =
            appState.current.match(/inactive|background/) && nextAppState === 'active';

        appState.current = nextAppState;

        if (isComingToForeground && isOnline) {
            // Refresh location when coming to foreground
            refreshLocation();
        }
    };

    const refreshLocation = async () => {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });
            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            };
            setVendorLocation(coords);
            dispatch(setVendorContext({ location: coords }));
        } catch (error) {
            console.error('Failed to refresh location:', error);
        }
    };

    // Monitor new requests for notifications
    useEffect(() => {
        const currentIds = new Set(requests.map(r => r.id));
        const newRequests = requests.filter(r => !previousRequestIds.current.has(r.id));

        if (newRequests.length > 0 && isOnline) {
            const latestRequest = newRequests[0];

            // Show toast for foreground
            if (appState.current === 'active') {
                setToastRequest(latestRequest);
            } else {
                // Send push notification for background
                handleNewRequestNotification(latestRequest);
            }
        }

        previousRequestIds.current = currentIds;
    }, [requests, isOnline]);

    const handleNewRequestNotification = async (request: LiveRequest) => {
        try {
            const distance = vendorLocation
                ? haversineDistanceKm(
                    vendorLocation.latitude,
                    vendorLocation.longitude,
                    request.coordinates.latitude,
                    request.coordinates.longitude
                )
                : 0;

            const distanceText = distance < 1
                ? `${Math.round(distance * 1000)}m`
                : `${distance.toFixed(1)} km`;

            await sendLocalNotification(
                '🔔 New Service Request!',
                `${request.serviceType} • ${request.customerName}\n${request.locationLabel} • ${distanceText}`,
                { requestId: request.id }
            );
        } catch (error) {
            console.error('Failed to send notification:', error);
        }
    };

    // Set vendor context: location + services
    useEffect(() => {
        const services = (vendorProfile?.serviceCategories || []).map((c: any) =>
            (c.id || c.label || c).toString().toLowerCase()
        );
        const location = vendorLocation ||
            vendorProfile?.location ||
            vendorProfile?.coordinates ||
            vendorProfile?.geo ||
            { latitude: 24.8559743, longitude: 67.3334962 };

        dispatch(setVendorContext({ location, services }));
    }, [vendorProfile, vendorLocation, dispatch]);

    // Shared clock
    const [nowMs, setNowMs] = useState(Date.now());
    useEffect(() => {
        const t = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    // console.log("🚀 ~ ServiceRequestsScreen ~ nowMs:", nowMs)
    // Start prune loop once
    useEffect(() => {
        dispatch(startPruneLoop() as any);
        return () => {
            dispatch(stopPruneLoop() as any);
        };
    }, [dispatch]);

    // Start/stop receiving based on isOnline
    useEffect(() => {
        if (isOnline) {
            dispatch(startReceivingRequests() as any);
            LiveRequestsGenerator.start();
        } else {
            dispatch(stopReceivingRequests() as any);
            LiveRequestsGenerator.stop();
        }
    }, [isOnline, dispatch]);

    // Fallback subscription
    useEffect(() => {
        const onIncoming = (r: LiveRequest) => dispatch({ type: 'requests/addRequest', payload: r });
        LiveRequestsGenerator.subscribe(onIncoming);
        return () => LiveRequestsGenerator.unsubscribe(onIncoming);
    }, [dispatch]);

    const toggleOnline = useCallback(() => {
        if (!isOnline && !locationPermission) {
            Alert.alert(
                'Location Required',
                'Please enable location permissions to go online and receive requests.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Enable',
                        onPress: async () => {
                            const { status } = await Location.requestForegroundPermissionsAsync();
                            if (status === 'granted') {
                                setLocationPermission(true);
                                dispatch(setOnline(true));
                            }
                        }
                    }
                ]
            );
            return;
        }
        dispatch(setOnline(!isOnline));
    }, [dispatch, isOnline, locationPermission]);

    const handleRadiusChange = useCallback(
        (v: number | number[]) => {
            const val = Array.isArray(v) ? v[0] : v;
            const clamped = Math.max(1, Math.min(val, 20)); // Max 20km as requested
            dispatch(setRadius(clamped));
        },
        [dispatch]
    );

    const data = useMemo(
        () => requests.slice().sort((a, b) => b.createdAt - a.createdAt),
        [requests]
    );

    const handlePressRequest = useCallback(
        (id: string) => {
            setToastRequest(null); // Close toast if open
            router.push({
                pathname: '/(vendor)/(servicerequests)/request-details',
                params: { id },
            } as any);
        },
        [router]
    );

    const handleToastPress = useCallback(() => {
        if (toastRequest) {
            handlePressRequest(toastRequest.id);
        }
    }, [toastRequest, handlePressRequest]);

    const handleToastDismiss = useCallback(() => {
        setToastRequest(null);
    }, []);

    const keyExtractor = useCallback((item: LiveRequest) => item.id, []);

    const renderItem = useCallback(
        ({ item }: { item: LiveRequest }) => (
            <RequestCard
                request={item}
                nowMs={nowMs}
                onPress={handlePressRequest}
                vendorLocation={vendorLocation}
            />
        ),
        [nowMs, handlePressRequest, vendorLocation]
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <LinearGradient
                colors={['rgba(37, 99, 235, 0.1)', 'rgba(249, 115, 22, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyStateGradient}
            >
                <View style={styles.emptyIconContainer}>
                    <Ionicons
                        name={isOnline ? 'hourglass-outline' : 'power-outline'}
                        size={50}
                        color="#94a3b8"
                    />
                </View>
                <Text style={styles.emptyStateTitle}>
                    {isOnline ? 'Waiting for Requests' : 'You are Offline'}
                </Text>
                <Text style={styles.emptyStateText}>
                    {isOnline
                        ? 'New service requests will appear here when customers need your services'
                        : 'Go online to start receiving service requests from customers'}
                </Text>
                {!isOnline && (
                    <TouchableOpacity
                        onPress={toggleOnline}
                        activeOpacity={0.8}
                        style={styles.emptyStateButton}
                    >
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.emptyStateButtonGradient}
                        >
                            <Ionicons name="power" size={20} color="#fff" />
                            <Text style={styles.emptyStateButtonText}>Go Online</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </LinearGradient>
        </View>
    );

    const getDistanceText = (request: LiveRequest): string => {
        if (!vendorLocation) return '';
        const dist = haversineDistanceKm(
            vendorLocation.latitude,
            vendorLocation.longitude,
            request.coordinates.latitude,
            request.coordinates.longitude
        );
        return dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)} km`;
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
                        <Text style={styles.screenTitle}>Service Requests</Text>
                        <Text style={styles.screenSubtitle}>
                            {isOnline
                                ? `${requests.length} active request${requests.length !== 1 ? 's' : ''}`
                                : 'Go online to receive requests'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={toggleOnline}
                        activeOpacity={0.8}
                        style={styles.toggleBtn}
                    >
                        <LinearGradient
                            colors={isOnline ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.toggleGradient}
                        >
                            <View style={styles.statusIndicator}>
                                <View
                                    style={[
                                        styles.statusDot,
                                        isOnline && styles.statusDotActive,
                                    ]}
                                />
                            </View>
                            <Text style={styles.toggleText}>
                                {isOnline ? 'ONLINE' : 'OFFLINE'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Location Status */}
                {vendorLocation && locationPermission && (
                    <View style={styles.locationBanner}>
                        <Ionicons name="location" size={14} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.locationText}>
                            Location tracking active • Updates every 30s
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
                {/* Radius Control Card */}
                <View style={styles.radiusCard}>
                    <LinearGradient
                        colors={['rgba(37, 99, 235, 0.05)', 'rgba(249, 115, 22, 0.05)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.radiusCardGradient}
                    >
                        <View style={styles.radiusHeader}>
                            <View style={styles.radiusIconContainer}>
                                <Ionicons name="location" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.radiusTextContainer}>
                                <Text style={styles.radiusLabel}>Search Radius</Text>
                                <Text style={styles.radiusValue}>{radiusKm} km</Text>
                            </View>
                        </View>

                        <Slider
                            value={radiusKm}
                            onValueChange={handleRadiusChange}
                            minimumValue={1}
                            maximumValue={20}
                            step={1}
                            minimumTrackTintColor={COLORS.primary}
                            maximumTrackTintColor="#e2e8f0"
                            thumbTintColor={COLORS.accent}
                            containerStyle={styles.sliderContainer}
                            thumbStyle={styles.sliderThumb}
                            trackStyle={styles.sliderTrack}
                        />

                        <View style={styles.radiusHint}>
                            <Ionicons name="information-circle-outline" size={14} color="#64748b" />
                            <Text style={styles.radiusHintText}>
                                Maximum radius is 20km for optimal service quality
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* Requests List */}
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmptyState}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={8}
                    maxToRenderPerBatch={12}
                    windowSize={11}
                    removeClippedSubviews={Platform.OS !== 'web'}
                />
            </Animated.View>

            {/* Toast Notification */}
            {/* {toastRequest && (
                <RequestToast
                    request={toastRequest}
                    distance={getDistanceText(toastRequest)}
                    onPress={handleToastPress}
                    onDismiss={handleToastDismiss}
                />
            )} */}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },

    // Header Styles
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
        fontSize: moderateScale(24),
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    screenSubtitle: {
        fontSize: moderateScale(13),
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
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
        fontSize: moderateScale(12),
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
    },

    // Toggle Button
    toggleBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    toggleGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: moderateScale(10),
        paddingHorizontal: moderateScale(16),
        gap: 8,
    },
    statusIndicator: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
        opacity: 0.5,
    },
    statusDotActive: {
        opacity: 1,
    },
    toggleText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: moderateScale(14),
        letterSpacing: 0.5,
    },

    // Content
    content: {
        flex: 1,
        marginTop: moderateScale(-10),
    },

    // Radius Card
    radiusCard: {
        marginHorizontal: moderateScale(16),
        marginTop: moderateScale(16),
        marginBottom: moderateScale(12),
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    radiusCardGradient: {
        padding: moderateScale(16),
        backgroundColor: '#fff',
    },
    radiusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: moderateScale(12),
    },
    radiusIconContainer: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    radiusTextContainer: {
        flex: 1,
    },
    radiusLabel: {
        fontSize: moderateScale(14),
        color: '#64748b',
        fontWeight: '500',
        marginBottom: 2,
    },
    radiusValue: {
        fontSize: moderateScale(20),
        color: COLORS.primary,
        fontWeight: '700',
    },
    sliderContainer: {
        marginTop: moderateScale(8),
        marginBottom: moderateScale(12),
    },
    sliderThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    sliderTrack: {
        height: 6,
        borderRadius: 3,
    },
    radiusHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: moderateScale(8),
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    radiusHintText: {
        flex: 1,
        fontSize: moderateScale(12),
        color: '#64748b',
        lineHeight: 16,
    },

    // List
    listContent: {
        paddingHorizontal: moderateScale(16),
        paddingBottom: moderateScale(80),
    },

    // Empty State
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
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: moderateScale(14),
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
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: '#fff',
    },
});
