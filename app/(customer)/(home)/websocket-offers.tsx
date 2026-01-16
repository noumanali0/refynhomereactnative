// app/(customer)/(home)/websocket-offers.tsx
/**
 * WebSocket Live Offers Screen
 *
 * Customer view showing real-time vendor proposals via WebSocket.
 * Allows customers to accept or decline proposals.
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
    AppState,
    ActivityIndicator,
    type AppStateStatus,
    type ListRenderItemInfo,
} from 'react-native';
import Text from '@/components/common/Text';
import MapView, { Marker, PROVIDER_DEFAULT, Polyline, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { AppDispatch, RootState } from '@/store';
import {
    connectSocket,
    selectConnectionStatus,
    selectIsConnected,
    selectCustomerRequests,
    selectProposalsByRequestId,
    selectActiveProposal,
    selectVendorLocation,
} from '@/store/slices/dispatchSlice';
import { WebSocketProposalCard } from '@/components/customer/WebSocketProposalCard';
import { SocketStatusIndicator } from '@/components/common/SocketStatusIndicator';
import { COLORS } from '@/constants/colors';
import type { SocketProposal, Coordinates } from '@/types/socket';
import { getServiceRequest, ServiceRequestResponse } from '@/services/serviceRequestApi';
import { simplifyRoute } from '@/utils/polylineSimplify';

// ============================================================================
// Component
// ============================================================================

export default function WebSocketOffersScreen() {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();
    const mapRef = useRef<MapView>(null);
    const bottomSheetRef = useRef<BottomSheet>(null);

    // Get requestId from navigation params (passed from create screen)
    const { requestId } = useLocalSearchParams<{ requestId: string }>();
    const requestIdNum = requestId ? parseInt(requestId, 10) : null;

    // WebSocket selectors
    const connectionStatus = useSelector(selectConnectionStatus);
    const isConnected = useSelector(selectIsConnected);
    const customerRequests = useSelector(selectCustomerRequests);
    const activeProposal = useSelector(selectActiveProposal);
    const vendorLocation = useSelector(selectVendorLocation);

    // Local state for the created request (fetched from API)
    const [createdRequest, setCreatedRequest] = useState<ServiceRequestResponse | null>(null);
    const [loadingRequest, setLoadingRequest] = useState(!!requestIdNum);

    // Get active request: from URL param or first from WebSocket sync
    const activeRequest = useMemo(() => {
        // If we have a created request from API, use it
        if (createdRequest) {
            return {
                id: createdRequest.id,
                problem_title: createdRequest.problem_title,
                description: createdRequest.description,
                status: createdRequest.status,
                category: {
                    id: createdRequest.category,
                    name: createdRequest.category_detail?.name || 'Service',
                    slug: createdRequest.category_detail?.slug || '',
                },
                customer: {
                    id: createdRequest.customer,
                    full_name: '',
                    profile_photo_url: null,
                },
                location: createdRequest.location,
                address_line: createdRequest.address_line,
                expires_at: createdRequest.expires_at,
                created_at: createdRequest.created_at,
            };
        }
        // Otherwise try to find from WebSocket synced requests
        if (requestIdNum) {
            const found = customerRequests.find(r => r.id === requestIdNum);
            if (found) return found;
        }
        // Fallback to first request
        return customerRequests.length > 0 ? customerRequests[0] : null;
    }, [createdRequest, customerRequests, requestIdNum]);

    // Fetch request details if we have a requestId
    useEffect(() => {
        if (!requestIdNum) {
            setLoadingRequest(false);
            return;
        }

        const fetchRequest = async () => {
            try {
                const data = await getServiceRequest(requestIdNum);
                setCreatedRequest(data);
            } catch (error) {
                console.error('Failed to fetch request:', error);
            } finally {
                setLoadingRequest(false);
            }
        };

        fetchRequest();
    }, [requestIdNum]);

    // Get proposals for active request
    const proposals = useSelector((state: RootState) =>
        activeRequest ? selectProposalsByRequestId(state, activeRequest?.id) : []
    );

    // Local state
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [locationLoading, setLocationLoading] = useState(true);
    const [routeCoords, setRouteCoords] = useState<Coordinates[]>([]);
    const [newProposalIds, setNewProposalIds] = useState<Set<number>>(new Set());

    // Refs
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const previousProposalIds = useRef<Set<number>>(new Set());

    // Animations
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    // ========================================================================
    // Location
    // ========================================================================

    useEffect(() => {
        const getUserLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setLocationLoading(false);
                    return;
                }

                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });

                const coords = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                };
                setUserLocation(coords);

                mapRef.current?.animateToRegion({
                    ...coords,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }, 1000);
            } catch (err) {
                console.error('Location error:', err);
            } finally {
                setLocationLoading(false);
            }
        };

        getUserLocation();
    }, []);

    // ========================================================================
    // Route to vendor - with throttling to prevent jerk
    // ========================================================================

    // Track last route fetch time for throttling
    const lastRouteFetchRef = useRef<number>(0);
    const routeFetchTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        // Clear existing timeout
        if (routeFetchTimeoutRef.current) {
            clearTimeout(routeFetchTimeoutRef.current);
        }

        const fetchRoute = async () => {
            if (!userLocation || !vendorLocation) {
                setRouteCoords([]);
                return;
            }

            // PERFORMANCE: Throttle route fetching to prevent excessive API calls
            // Only fetch route once every 15 seconds to prevent marker jerk
            const now = Date.now();
            const timeSinceLastFetch = now - lastRouteFetchRef.current;
            const THROTTLE_MS = 15000; // 15 seconds

            if (timeSinceLastFetch < THROTTLE_MS && routeCoords.length > 0) {
                // Skip fetch if within throttle period and we already have a route
                return;
            }

            lastRouteFetchRef.current = now;

            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${vendorLocation?.longitude},${vendorLocation.latitude};${userLocation.longitude},${userLocation.latitude}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                if (!res.ok) {
                    setRouteCoords([userLocation, vendorLocation]);
                    return;
                }
                const data = await res.json();
                if (!data?.routes?.length) {
                    setRouteCoords([userLocation, vendorLocation]);
                    return;
                }
                const rawCoords = data.routes[0].geometry.coordinates.map(
                    ([lng, lat]: [number, number]) => ({
                        latitude: lat,
                        longitude: lng,
                    })
                );
                // CRITICAL: Simplify route to prevent crash on low-end devices
                // OSRM can return 2000+ points which causes Polyline to crash
                const simplifiedCoords = simplifyRoute(rawCoords);

                // Validate simplification output
                if (simplifiedCoords && simplifiedCoords.length > 1) {
                    setRouteCoords(simplifiedCoords);
                } else {
                    // Fallback to direct line if simplification failed
                    setRouteCoords([userLocation, vendorLocation]);
                }
            } catch (e) {
                console.warn('fetchRoute error:', e);
                setRouteCoords([userLocation, vendorLocation]);
            }
        };

        // Debounce route fetching by 500ms to avoid rapid updates
        routeFetchTimeoutRef.current = setTimeout(fetchRoute, 500);

        return () => {
            if (routeFetchTimeoutRef.current) {
                clearTimeout(routeFetchTimeoutRef.current);
            }
        };
    }, [userLocation, vendorLocation]);

    // ========================================================================
    // App State
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
            dispatch(connectSocket());
        }
    };

    // ========================================================================
    // New Proposal Detection
    // ========================================================================

    // Track setTimeout refs to prevent memory leak when component unmounts
    const newProposalTimersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

    useEffect(() => {
        const currentIds = new Set(proposals.map((p) => p.id));
        const newProposals = proposals.filter(
            (p) => !previousProposalIds.current.has(p.id)
        );

        if (newProposals.length > 0) {
            newProposals.forEach((p) => {
                setNewProposalIds((prev) => new Set([...prev, p.id]));

                // Store timer ref for cleanup
                const timerId = setTimeout(() => {
                    setNewProposalIds((prev) => {
                        const updated = new Set(prev);
                        updated.delete(p.id);
                        return updated;
                    });
                    // Remove from ref map after execution
                    newProposalTimersRef.current.delete(p.id);
                }, 3000);

                newProposalTimersRef.current.set(p.id, timerId);
            });
        }

        previousProposalIds.current = currentIds;
    }, [proposals]);

    // Cleanup all timers on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            newProposalTimersRef.current.forEach((timerId) => {
                clearTimeout(timerId);
            });
            newProposalTimersRef.current.clear();
        };
    }, []);

    // ========================================================================
    // Render
    // ========================================================================

    const renderProposalItem = useCallback(
        ({ item }: ListRenderItemInfo<SocketProposal>) => {
            const isNew = newProposalIds.has(item.id);
            return <WebSocketProposalCard proposal={item} isNew={isNew} />;
        },
        [newProposalIds]
    );

    const keyExtractor = useCallback((item: SocketProposal) => item.id.toString(), []);

    const renderEmptyState = useCallback(
        () => (
            <View style={styles.emptyState}>
                {loadingRequest ? (
                    <>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text type="subtitle" style={styles.emptyTitle}>
                            Loading Request...
                        </Text>
                    </>
                ) : (
                    <>
                        <Ionicons
                            name={activeRequest ? 'hourglass-outline' : 'document-text-outline'}
                            size={50}
                            color={COLORS.gray400}
                        />
                        <Text type="subtitle" style={styles.emptyTitle}>
                            {activeRequest ? 'Waiting for Proposals' : 'No Active Requests'}
                        </Text>
                        <Text type="body2" style={styles.emptyText}>
                            {activeRequest
                                ? 'Your request has been sent to nearby vendors. Proposals will appear here in real-time as vendors respond.'
                                : 'Create a service request to start receiving proposals from nearby vendors.'}
                        </Text>
                        {activeRequest && isConnected && (
                            <View style={styles.waitingIndicator}>
                                <View style={styles.pulsingDot} />
                                <Text type="body2" style={styles.waitingText}>
                                    Connected • Listening for proposals
                                </Text>
                            </View>
                        )}
                        {activeRequest && !isConnected && (
                            <View style={styles.offlineIndicator}>
                                <Ionicons name="cloud-offline" size={16} color={COLORS.warning} />
                                <Text type="body2" style={styles.offlineText}>
                                    Reconnecting to receive proposals...
                                </Text>
                            </View>
                        )}
                        {!activeRequest && (
                            <TouchableOpacity
                                style={styles.createButton}
                                onPress={() => router.push('/(customer)/(home)/create' as any)}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.accent]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.createButtonGradient}
                                >
                                    <Ionicons name="add-circle" size={20} color={COLORS.white} />
                                    <Text type="button" style={styles.createButtonText}>Create Request</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>
        ),
        [activeRequest, router, loadingRequest, isConnected]
    );

    // Get pending proposals count
    const pendingProposals = proposals.filter((p) => p.status === 'pending');
    const acceptedProposal = proposals.find((p) => p.status === 'accepted');

    return (
        <View style={styles.container}>
            {/* Map */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={
                    userLocation
                        ? {
                            ...userLocation,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }
                        : {
                            latitude: 24.8607,
                            longitude: 67.0011,
                            latitudeDelta: 0.1,
                            longitudeDelta: 0.1,
                        }
                }
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
                {/* User Marker */}
                {userLocation && (
                    <Marker coordinate={userLocation} title="Your Location">
                        <View collapsable={false} style={styles.userMarker}>
                            <Ionicons name="home" size={20} color={COLORS.white} />
                        </View>
                    </Marker>
                )}

                {/* Vendor Marker (when en_route) */}
                {vendorLocation && acceptedProposal && (
                    <Marker
                        coordinate={vendorLocation}
                        title={acceptedProposal.vendor?.full_name || 'Vendor'}
                        description="En route to you"
                    >
                        <View collapsable={false} style={styles.vendorMarker}>
                            <Ionicons name="car" size={20} color={COLORS.white} />
                        </View>
                    </Marker>
                )}

                {/* Route Line - Memoized to prevent jerk */}
                {useMemo(() =>
                    routeCoords.length > 1 ? (
                        <Polyline
                            coordinates={routeCoords}
                            strokeColor={COLORS.primary}
                            strokeWidth={4}
                        />
                    ) : null
                , [routeCoords])}
            </MapView>

            {/* Connection Status Badge */}
            <View style={styles.connectionBadge}>
                <SocketStatusIndicator showLabel size="small" />
            </View>

            {/* Active Request Banner */}
            {activeRequest && (
                <View style={styles.requestBanner}>
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.requestBannerGradient}
                    >
                        <View style={styles.requestBannerContent}>
                            <View style={styles.requestBannerIcon}>
                                <Ionicons name="construct" size={20} color={COLORS.white} />
                            </View>
                            <View style={styles.requestBannerText}>
                                <Text type="bodySemiBold" style={styles.requestBannerTitle}>
                                    {activeRequest.category.name}
                                </Text>
                                <Text type="body" style={styles.requestBannerSubtitle}>
                                    {activeRequest.problem_title}
                                </Text>
                            </View>
                            <View style={styles.proposalCountBadge}>
                                <Text type="bodySemiBold" style={styles.proposalCountText}>
                                    {pendingProposals.length}
                                </Text>
                                <Text type="caption" style={styles.proposalCountLabel}>offers</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>
            )}

            {/* Vendor En Route Banner */}
            {acceptedProposal && vendorLocation && (
                <View style={styles.enRouteBanner}>
                    <Ionicons name="car" size={20} color={COLORS.success} />
                    <View style={styles.enRouteTextContainer}>
                        <Text type="bodySemiBold" style={styles.enRouteTitle}>
                            {acceptedProposal.vendor?.full_name || 'Vendor'} is on the way!
                        </Text>
                        <Text type="body2" style={styles.enRouteSubtitle}>
                            {acceptedProposal.vendor?.distance_km?.toFixed(1) || '0.0'} km away
                        </Text>
                    </View>
                </View>
            )}

            {/* Bottom Sheet with Proposals */}
            <BottomSheet
                ref={bottomSheetRef}
                index={1}
                snapPoints={['25%', '50%', '85%']}
                backgroundStyle={styles.bottomSheetBackground}
                handleIndicatorStyle={styles.bottomSheetIndicator}
            >
                <BottomSheetScrollView
                    style={styles.sheetContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <Text type="title" style={styles.sheetTitle}>
                            {acceptedProposal ? 'Accepted Proposal' : 'Vendor Proposals'}
                        </Text>
                        {pendingProposals.length > 0 && !acceptedProposal && (
                            <View style={styles.countBadge}>
                                <Text type="bodySemiBold" style={styles.countText}>
                                    {pendingProposals.length}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Accepted Proposal */}
                    {acceptedProposal && (
                        <View style={styles.acceptedSection}>
                            <WebSocketProposalCard proposal={acceptedProposal} />
                        </View>
                    )}

                    {/* Pending Proposals */}
                    {!acceptedProposal && (
                        <FlatList
                            data={pendingProposals}
                            renderItem={renderProposalItem}
                            keyExtractor={keyExtractor}
                            ListEmptyComponent={renderEmptyState}
                            scrollEnabled={false}
                            contentContainerStyle={styles.listContent}
                        />
                    )}

                    {/* Other Proposals (declined, etc.) */}
                    {!acceptedProposal && proposals.filter((p) => p.status !== 'pending').length > 0 && (
                        <View style={styles.otherProposalsSection}>
                            <Text type="subtitle2" style={styles.otherProposalsTitle}>
                                Previous Proposals
                            </Text>
                            {proposals
                                .filter((p) => p.status !== 'pending')
                                .map((p) => (
                                    <WebSocketProposalCard key={p.id} proposal={p} />
                                ))}
                        </View>
                    )}

                    {/* Spacer */}
                    <View style={{ height: verticalScale(40) }} />
                </BottomSheetScrollView>
            </BottomSheet>
        </View>
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
    userMarker: {
        backgroundColor: COLORS.primary,
        padding: scale(10),
        borderRadius: moderateScale(20),
        borderWidth: 3,
        borderColor: COLORS.white,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    vendorMarker: {
        backgroundColor: COLORS.success,
        padding: scale(10),
        borderRadius: moderateScale(20),
        borderWidth: 3,
        borderColor: COLORS.white,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    connectionBadge: {
        position: 'absolute',
        top: verticalScale(16),
        right: scale(16),
        backgroundColor: COLORS.white,
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(8),
        borderRadius: moderateScale(20),
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    requestBanner: {
        position: 'absolute',
        top: verticalScale(16),
        left: scale(16),
        right: scale(80),
        borderRadius: moderateScale(12),
        overflow: 'hidden',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    requestBannerGradient: {
        padding: scale(12),
    },
    requestBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    requestBannerIcon: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    requestBannerText: {
        flex: 1,
        marginLeft: scale(10),
    },
    requestBannerTitle: {
        color: COLORS.white,
        fontSize: moderateScale(14),
    },
    requestBannerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: moderateScale(12),
    },
    proposalCountBadge: {
        backgroundColor: COLORS.white,
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(6),
        borderRadius: moderateScale(12),
        alignItems: 'center',
    },
    proposalCountText: {
        color: COLORS.primary,
        fontSize: moderateScale(16),
    },
    proposalCountLabel: {
        color: COLORS.gray500,
        fontSize: moderateScale(10),
    },
    enRouteBanner: {
        position: 'absolute',
        top: verticalScale(80),
        left: scale(16),
        right: scale(16),
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(12),
        padding: scale(12),
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.success,
    },
    enRouteTextContainer: {
        marginLeft: scale(10),
        flex: 1,
    },
    enRouteTitle: {
        color: COLORS.gray900,
    },
    enRouteSubtitle: {
        color: COLORS.gray500,
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
    countBadge: {
        backgroundColor: COLORS.primary,
        width: moderateScale(28),
        height: moderateScale(28),
        borderRadius: moderateScale(14),
        justifyContent: 'center',
        alignItems: 'center',
    },
    countText: {
        color: COLORS.white,
        fontSize: moderateScale(14),
    },
    acceptedSection: {
        marginBottom: verticalScale(16),
    },
    listContent: {
        paddingBottom: verticalScale(16),
    },
    otherProposalsSection: {
        marginTop: verticalScale(16),
        paddingTop: verticalScale(16),
        borderTopWidth: 1,
        borderTopColor: COLORS.gray200,
    },
    otherProposalsTitle: {
        color: COLORS.gray500,
        marginBottom: verticalScale(12),
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: verticalScale(40),
        paddingHorizontal: scale(20),
    },
    emptyTitle: {
        color: COLORS.gray700,
        marginTop: verticalScale(16),
        marginBottom: verticalScale(8),
    },
    emptyText: {
        color: COLORS.gray500,
        textAlign: 'center',
        lineHeight: moderateScale(20),
    },
    createButton: {
        marginTop: verticalScale(24),
        borderRadius: moderateScale(12),
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    createButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(24),
        gap: scale(8),
    },
    createButtonText: {
        color: COLORS.white,
    },
    waitingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(16),
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(10),
        backgroundColor: COLORS.success + '15',
        borderRadius: moderateScale(20),
        gap: scale(8),
    },
    pulsingDot: {
        width: moderateScale(8),
        height: moderateScale(8),
        borderRadius: moderateScale(4),
        backgroundColor: COLORS.success,
    },
    waitingText: {
        color: COLORS.success,
    },
    offlineIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(16),
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(10),
        backgroundColor: COLORS.warning + '15',
        borderRadius: moderateScale(20),
        gap: scale(8),
    },
    offlineText: {
        color: COLORS.warning,
    },
});
