// LiveOffersScreen.tsx - PRODUCTION GRADE WITH ENHANCED UI
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from "react-native";
import MapView, {
    Marker,
    PROVIDER_DEFAULT,
    UrlTile,
    Polyline,
} from "react-native-maps";
import * as Location from "expo-location";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { MapPin, X, User } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { moderateScale } from "react-native-size-matters";

import {
    startReceivingOffers,
    addOffer,
    acceptOffer,
    cancelRequest,
    updateVendorLocation,
    removeOffersByIds,
    VendorOffer,
    Coordinate,
    removeOutOfRangeOffers,
} from "../../../src/store/slices/offersSlice";
import { RootState } from "../../../src/store";
import { useBackHandlerExit } from "../../../src/hooks/useBackHandlerExit";
import {
    generateRandomOffer,
    simulateVendorMovement,
} from "../../../src/utils/mockOffers";
import { VendorOfferCard } from "../../../src/components/customer/VendorOfferCard";
import RatingModal from "../../../src/components/common/RatingModal";
import { OffersList } from "../VendorOfferList";
import { Slider } from "@miblanchard/react-native-slider";
import { setupPushNotifications, sendLocalNotification, sendOfferNotification, clearAllOfferNotifications } from "../../../src/utils/notifications";
import debounce from "lodash.debounce";

type Coordinates = { latitude: number; longitude: number };

interface LocalVendorState {
    currentLocation: Coordinate;
    lastDistanceReportedAt: number;
    distanceMoved: number;
}

const BATCH_SIZE = 3;
const TIMER_DURATION = 20;
const GENERATE_INTERVAL_MS = 4000;
const MOVEMENT_INTERVAL_MS = 2000;
const ARRIVAL_THRESHOLD_METERS = 20;
const MOVEMENT_SPEED = 0.0002;
const ROUTE_UPDATE_THRESHOLD_METERS = 50;

export default function LiveOffersScreen() {
    const router = useRouter();
    const dispatch = useDispatch();
    const mapRef = useRef<MapView | null>(null);
    const bottomSheetRef = useRef<BottomSheet | null>(null);

    const { offers, acceptedOffer, isReceivingOffers } = useSelector(
        (s: RootState) => s.offers
    );

    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [locationLoading, setLocationLoading] = useState(true);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [routeCoords, setRouteCoords] = useState<Coordinates[]>([]);
    const [vendorArrived, setVendorArrived] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [distanceToUser, setDistanceToUser] = useState<number | null>(null);
    const [vendorLocalState, setVendorLocalState] = useState<LocalVendorState | null>(null);
    const [radiusKm, setRadiusKm] = useState<number>(5);

    useBackHandlerExit();

    const generateIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const movementIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const routeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const offersLengthRef = useRef(offers.length);
    const lastRouteUpdatePositionRef = useRef<Coordinates | null>(null);

    const handleRadiusChange = useCallback((value: number | number[]) => {
        if (Array.isArray(value)) value = value[0];
        const clamped = Math.max(1, Math.min(value, 20));
        setRadiusKm(clamped);
    }, []);

    const getOutOfRangeIds = useCallback(
        (offers: VendorOffer[], radiusKm: number) => offers.filter(o => o.distance > radiusKm).map(o => o.id),
        []
    );

    const debouncedRemove = useMemo(
        () =>
            debounce((ids: string[]) => {
                if (ids.length) dispatch(removeOutOfRangeOffers(ids));
            }, 400),
        [dispatch]
    );

    const getDistanceInMeters = useCallback((a: Coordinates, b: Coordinates): number => {
        const R = 6371e3;
        const toRad = (v: number) => (v * Math.PI) / 180;
        const dLat = toRad(b.latitude - a.latitude);
        const dLon = toRad(b.longitude - a.longitude);
        const lat1 = toRad(a.latitude);
        const lat2 = toRad(b.latitude);
        const aa =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
        return R * c;
    }, []);

    useEffect(() => {
        setupPushNotifications();
    }, []);

    const getUserLocation = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") throw new Error("Location permission denied");

            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const coords = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            };
            setUserLocation(coords);
            dispatch(startReceivingOffers());

            mapRef.current?.animateToRegion({
                ...coords,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 1000);
        } catch (err: any) {
            setLocationError(err?.message || "Failed to get location");
        } finally {
            setLocationLoading(false);
        }
    }, [dispatch]);

    useEffect(() => {
        getUserLocation();
    }, [getUserLocation]);

    const fetchRoute = useCallback(async (start: Coordinates, end: Coordinates): Promise<Coordinates[]> => {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            if (!res.ok) return [start, end];
            const data = await res.json();
            if (!data?.routes?.length) return [start, end];
            return data.routes[0].geometry.coordinates.map(
                ([lng, lat]: [number, number]) => ({
                    latitude: lat,
                    longitude: lng,
                })
            );
        } catch (e) {
            console.warn("fetchRoute error:", e);
            return [start, end];
        }
    }, []);

    const debouncedFetchRoute = useCallback(
        (start: Coordinates, end: Coordinates, delay = 700) =>
            new Promise<Coordinates[]>((resolve) => {
                if (routeTimeoutRef.current) clearTimeout(routeTimeoutRef.current);
                routeTimeoutRef.current = setTimeout(async () => {
                    const r = await fetchRoute(start, end);
                    resolve(r);
                }, delay);
            }),
        [fetchRoute]
    );

    const handleAcceptOffer = useCallback(
        async (offer: VendorOffer) => {
            dispatch(acceptOffer(offer));
            setVendorLocalState({
                currentLocation: offer.coordinates,
                lastDistanceReportedAt: 0,
                distanceMoved: 0,
            });
            if (userLocation) {
                const route = await debouncedFetchRoute(offer.coordinates, userLocation);
                setRouteCoords(route);
                lastRouteUpdatePositionRef.current = offer.coordinates;

                if (route?.length > 2) {
                    mapRef.current?.fitToCoordinates(route, {
                        edgePadding: { top: 100, right: 100, bottom: 400, left: 100 },
                        animated: true,
                    });
                }
            }
            bottomSheetRef.current?.snapToIndex(0);
        },
        [dispatch, userLocation, debouncedFetchRoute]
    );

    const updateRouteIfNeeded = useCallback(
        async (newVendorLocation: Coordinates) => {
            if (!userLocation || !lastRouteUpdatePositionRef.current) return;

            const distanceFromLastUpdate = getDistanceInMeters(
                lastRouteUpdatePositionRef.current,
                newVendorLocation
            );

            if (distanceFromLastUpdate >= ROUTE_UPDATE_THRESHOLD_METERS) {
                const newRoute = await fetchRoute(newVendorLocation, userLocation);
                setRouteCoords(newRoute);
                lastRouteUpdatePositionRef.current = newVendorLocation;
            }
        },
        [userLocation, getDistanceInMeters, fetchRoute]
    );

    useEffect(() => {
        offersLengthRef.current = offers.length;
    }, [offers.length]);

    useEffect(() => {
        return () => {
            clearAllOfferNotifications();
        };
    }, []);

    useEffect(() => {
        if (!userLocation || !isReceivingOffers || acceptedOffer) {
            if (generateIntervalRef.current) {
                clearInterval(generateIntervalRef.current);
                generateIntervalRef.current = null;
            }
            return;
        }

        generateIntervalRef.current = setInterval(() => {
            if (offersLengthRef.current < BATCH_SIZE) {
                const offer = generateRandomOffer(userLocation, radiusKm);
                const dist = getDistanceInMeters(userLocation, offer.coordinates) / 1000;
                if (dist <= radiusKm) {
                    dispatch(addOffer({
                        ...offer,
                        createdAt: Date.now(),
                        expiryTime: Date.now() + TIMER_DURATION * 1000,
                    }));
                    sendOfferNotification(offer);
                }
            }
        }, GENERATE_INTERVAL_MS);

        return () => {
            if (generateIntervalRef.current) {
                clearInterval(generateIntervalRef.current);
                generateIntervalRef.current = null;
            }
        };
    }, [userLocation, isReceivingOffers, acceptedOffer, dispatch, radiusKm, getDistanceInMeters]);

    useEffect(() => {
        if (!offers?.length) return;
        const outOfRangeIds = getOutOfRangeIds(offers, radiusKm);
        debouncedRemove(outOfRangeIds);
        return () => debouncedRemove.cancel();
    }, [offers, radiusKm, getOutOfRangeIds, debouncedRemove]);

    const filteredOffers = useMemo(() => {
        if (!userLocation) return [];
        return offers.filter(offer => {
            const distance = getDistanceInMeters(userLocation, offer.coordinates);
            return distance <= radiusKm * 1000;
        });
    }, [offers, userLocation, radiusKm, getDistanceInMeters]);

    useEffect(() => {
        if (!acceptedOffer || !userLocation || !vendorLocalState || vendorArrived) {
            return;
        }

        setVendorArrived(false);

        const movementInterval = setInterval(() => {
            setVendorLocalState((prevState) => {
                if (!prevState) return null;

                const newLocation = simulateVendorMovement(
                    prevState.currentLocation,
                    userLocation,
                    0.0002
                );

                const distanceMoved = getDistanceInMeters(prevState.currentLocation, newLocation);
                const totalDistanceMoved = prevState.distanceMoved + distanceMoved;
                const distanceToCustomer = getDistanceInMeters(newLocation, userLocation);

                if (distanceToCustomer === 0) {
                    console.log("✅ Vendor arrived at destination");
                    sendLocalNotification("Vendor Arrived", `${acceptedOffer.name} has reached your location!`);
                    setVendorArrived(true);
                    clearInterval(movementInterval);
                }

                if (totalDistanceMoved >= 50 || distanceToCustomer < 100) {
                    console.log(`✓ DISPATCH at ${totalDistanceMoved.toFixed(0)}m - Distance to user: ${distanceToCustomer.toFixed(0)}m`);
                    dispatch(
                        updateVendorLocation({
                            id: acceptedOffer.id,
                            coordinates: newLocation,
                            distance: Number((distanceToCustomer / 1000).toFixed(2)),
                            eta: Math.max(Math.round(distanceToCustomer / 250), 1),
                        })
                    );

                    return {
                        currentLocation: newLocation,
                        lastDistanceReportedAt: Date.now(),
                        distanceMoved: 0,
                    };
                }
                updateRouteIfNeeded(newLocation);

                console.log(`~ Moving: ${totalDistanceMoved.toFixed(0)}m total, ${distanceToCustomer.toFixed(0)}m to user`);

                return {
                    currentLocation: newLocation,
                    lastDistanceReportedAt: prevState.lastDistanceReportedAt,
                    distanceMoved: totalDistanceMoved,
                };
            });
        }, 2000);
        return () => clearInterval(movementInterval);
    }, [acceptedOffer, userLocation, dispatch, getDistanceInMeters, updateRouteIfNeeded, vendorLocalState, vendorArrived]);

    const handleCancelRequest = useCallback(() => {
        dispatch(cancelRequest());
        router.back();
    }, [dispatch, router]);

    const renderMarkers = useMemo(() => {
        if (!userLocation) return null;
        const markers: React.ReactNode[] = [];

        markers.push(
            <Marker key="user" coordinate={userLocation} title="Your Location">
                <LinearGradient
                    colors={['#2563EB', '#F97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.userMarker}
                >
                    <MapPin size={24} color="#fff" />
                </LinearGradient>
            </Marker>
        );

        if (acceptedOffer) {
            markers.push(
                <Marker
                    key={acceptedOffer.id}
                    coordinate={acceptedOffer.coordinates}
                    title={`${acceptedOffer.name} (Accepted)`}
                >
                    <LinearGradient
                        colors={['#F97316', '#2563EB']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.acceptedVendorMarker}
                    >
                        <User size={24} color="#fff" />
                    </LinearGradient>
                </Marker>
            );
        } else {
            filteredOffers.forEach((o) => {
                markers.push(
                    <Marker key={o.id} coordinate={o.coordinates} title={o.name}>
                        <LinearGradient
                            colors={['#10b981', '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.vendorMarker}
                        >
                            <User size={20} color="#fff" />
                        </LinearGradient>
                    </Marker>
                );
            });
        }

        return markers;
    }, [userLocation, filteredOffers, acceptedOffer]);

    useEffect(() => {
        if (!isReceivingOffers) {
            if (generateIntervalRef.current) {
                clearInterval(generateIntervalRef.current);
                generateIntervalRef.current = null;
            }
            if (movementIntervalRef.current) {
                clearInterval(movementIntervalRef.current);
                movementIntervalRef.current = null;
            }
        }
    }, [isReceivingOffers]);

    if (locationLoading) {
        return (
            <View style={styles.centerContainer}>
                <LinearGradient
                    colors={['#2563EB', '#F97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.loadingGradient}
                >
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>Getting your location...</Text>
                </LinearGradient>
            </View>
        );
    }

    if (locationError || !userLocation) {
        return (
            <View style={styles.centerContainer}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        {locationError || "Location unavailable"}
                    </Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={getUserLocation}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#2563EB', '#F97316']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.retryButtonInner}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const radiusSelector = (
        <View style={styles.radiusContainer}>
            <LinearGradient
                colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
                style={styles.radiusGradient}
            >
                <Text style={styles.radiusLabel}>
                    Search Radius: <Text style={styles.radiusValue}>{radiusKm.toFixed(1)} km</Text>
                </Text>
                <Slider
                    value={radiusKm}
                    onValueChange={handleRadiusChange}
                    minimumValue={1}
                    maximumValue={20}
                    step={0.5}
                    minimumTrackTintColor="#2563EB"
                    maximumTrackTintColor="#e2e8f0"
                    thumbTintColor="#F97316"
                    containerStyle={styles.sliderContainer}
                />
            </LinearGradient>
        </View>
    );

    return (
        <GestureHandlerRootView style={styles.container}>
            {radiusSelector}
            <RatingModal
                visible={showRatingModal}
                onClose={() => setShowRatingModal(false)}
            />
            <MapView
                ref={(r) => (mapRef.current = r)}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={{
                    ...userLocation,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
            >
                {Platform.OS === "web" && (
                    <UrlTile
                        urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maximumZ={19}
                    />
                )}
                {routeCoords?.length > 0 && (
                    <Polyline
                        coordinates={routeCoords}
                        strokeColor="#2563EB"
                        strokeWidth={5}
                        lineDashPattern={[1]}
                    />
                )}
                {renderMarkers}
            </MapView>

            <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelRequest}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={['#ef4444', '#dc2626']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.cancelButtonInner}
                >
                    <X size={20} color="#fff" />
                    <Text style={styles.cancelButtonText}>Cancel Request</Text>
                </LinearGradient>
            </TouchableOpacity>

            <BottomSheet
                ref={(r) => (bottomSheetRef.current = r)}
                index={1}
                snapPoints={acceptedOffer ? ["25%", "40%"] : ["25%", "60%"]}
                enablePanDownToClose={false}
                backgroundStyle={styles.bottomSheetBackground}
                handleIndicatorStyle={styles.bottomSheetHandle}
            >
                <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
                    {acceptedOffer ? (
                        <View>
                            <View style={styles.sheetTitleContainer}>
                                <LinearGradient
                                    colors={['#2563EB', '#F97316']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.sheetTitleGradient}
                                >
                                    <Text style={styles.sheetTitle}>Vendor on the way</Text>
                                </LinearGradient>
                            </View>
                            <VendorOfferCard offer={acceptedOffer} isAccepted />
                            <View style={styles.statusContainer}>
                                {!vendorArrived ? (
                                    <>
                                        <LinearGradient
                                            colors={['#2563EB', '#F97316']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.loadingIndicator}
                                        >
                                            <ActivityIndicator size="small" color="#fff" />
                                        </LinearGradient>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.statusText}>
                                                {acceptedOffer.name} is heading to your location...
                                            </Text>
                                            {acceptedOffer.distance !== undefined && (
                                                <Text style={styles.statusTextSmall}>
                                                    {acceptedOffer.distance} km away • ETA {acceptedOffer.eta} min
                                                </Text>
                                            )}
                                        </View>
                                    </>
                                ) : (
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.statusText, { color: "#22c55e" }]}>
                                            ✓ {acceptedOffer.name} has arrived!
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.arrivedButton}
                                            onPress={() => setShowRatingModal(true)}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={['#22c55e', '#16a34a']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.arrivedButtonInner}
                                            >
                                                <Text style={styles.arrivedButtonText}>Mark as Complete</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : (
                        <View>
                            <View style={styles.sheetTitleContainer}>
                                <LinearGradient
                                    colors={['#2563EB', '#F97316']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.sheetTitleGradient}
                                >
                                    <Text style={styles.sheetTitle}>
                                        {offers.length === 0
                                            ? "Waiting for offers..."
                                            : `${offers.length} Offers Received`}
                                    </Text>
                                </LinearGradient>
                            </View>

                            {offers.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <LinearGradient
                                        colors={['#2563EB', '#F97316']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.emptyGradient}
                                    >
                                        <ActivityIndicator size="large" color="#fff" />
                                    </LinearGradient>
                                    <Text style={styles.emptyText}>
                                        Nearby vendors are reviewing your request
                                    </Text>
                                </View>
                            ) : (
                                <OffersList
                                    offers={filteredOffers}
                                    onAccept={handleAcceptOffer}
                                    onExpire={(id) => dispatch(removeOffersByIds(id))}
                                />
                            )}
                        </View>
                    )}
                </BottomSheetScrollView>
            </BottomSheet>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        padding: 20,
    },
    loadingGradient: {
        padding: moderateScale(40),
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    loadingText: {
        marginTop: 16,
        fontSize: moderateScale(16),
        color: "#fff",
        fontWeight: '600',
    },
    errorContainer: {
        backgroundColor: '#fff',
        padding: moderateScale(32),
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    errorText: {
        fontSize: moderateScale(16),
        color: "#ef4444",
        textAlign: "center",
        marginBottom: 20,
        fontWeight: '600',
    },
    retryButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    retryButtonInner: {
        paddingHorizontal: 32,
        paddingVertical: 14,
    },
    retryButtonText: {
        color: "#fff",
        fontSize: moderateScale(16),
        fontWeight: "700",
    },
    userMarker: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#fff",
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    vendorMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#fff",
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    acceptedVendorMarker: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: "#fff",
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 10,
    },
    cancelButton: {
        position: "absolute",
        top: moderateScale(50),
        left: moderateScale(16),
        right: moderateScale(16),
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    cancelButtonInner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: moderateScale(14),
        gap: 8,
    },
    cancelButtonText: {
        color: "#fff",
        fontSize: moderateScale(16),
        fontWeight: "700",
    },
    radiusContainer: {
        position: "absolute",
        top: moderateScale(120),
        left: moderateScale(16),
        right: moderateScale(16),
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 10,
    },
    radiusGradient: {
        padding: moderateScale(16),
        borderRadius: 16,
    },
    radiusLabel: {
        fontSize: moderateScale(15),
        fontWeight: "600",
        marginBottom: moderateScale(12),
        color: "#334155",
    },
    radiusValue: {
        color: '#2563EB',
        fontWeight: '700',
        fontSize: moderateScale(16),
    },
    sliderContainer: {
        height: moderateScale(40),
    },
    bottomSheetBackground: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 16,
    },
    bottomSheetHandle: {
        backgroundColor: '#cbd5e1',
        width: moderateScale(40),
        height: moderateScale(4),
        borderRadius: 2,
    },
    bottomSheetContent: {
        padding: moderateScale(20),
        paddingBottom: moderateScale(40),
    },
    sheetTitleContainer: {
        marginBottom: moderateScale(16),
        borderRadius: 12,
        overflow: 'hidden',
    },
    sheetTitleGradient: {
        paddingVertical: moderateScale(12),
        paddingHorizontal: moderateScale(16),
    },
    sheetTitle: {
        fontSize: moderateScale(20),
        fontWeight: "800",
        color: "#fff",
        textAlign: 'center',
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: moderateScale(48),
    },
    emptyGradient: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(40),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: moderateScale(20),
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    emptyText: {
        marginTop: moderateScale(16),
        fontSize: moderateScale(15),
        color: "#64748b",
        textAlign: "center",
        fontWeight: '500',
        paddingHorizontal: moderateScale(32),
        lineHeight: moderateScale(22),
    },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: moderateScale(16),
        padding: moderateScale(16),
        backgroundColor: "rgba(37, 99, 235, 0.05)",
        borderRadius: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(37, 99, 235, 0.1)',
    },
    loadingIndicator: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    statusText: {
        fontSize: moderateScale(15),
        color: "#2563EB",
        fontWeight: "600",
        lineHeight: moderateScale(20),
    },
    statusTextSmall: {
        fontSize: moderateScale(13),
        color: "#64748b",
        marginTop: 4,
        fontWeight: '500',
    },
    arrivedButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: moderateScale(12),
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    arrivedButtonInner: {
        paddingVertical: moderateScale(14),
        alignItems: "center",
        justifyContent: 'center',
    },
    arrivedButtonText: {
        color: "#fff",
        fontSize: moderateScale(16),
        fontWeight: "700",
    },
});




// // LiveOffersScreen.tsx - PRODUCTION GRADE WITH ENHANCED UI
// import React, {
//     useCallback,
//     useEffect,
//     useMemo,
//     useRef,
//     useState,
// } from "react";
// import {
//     View,
//     Text,
//     StyleSheet,
//     TouchableOpacity,
//     ActivityIndicator,
//     Platform,
// } from "react-native";
// import MapView, {
//     Marker,
//     PROVIDER_DEFAULT,
//     UrlTile,
//     Polyline,
// } from "react-native-maps";
// import * as Location from "expo-location";
// import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { useRouter } from "expo-router";
// import { useDispatch, useSelector } from "react-redux";
// import { MapPin, X, User } from "lucide-react-native";
// import { LinearGradient } from "expo-linear-gradient";
// import { moderateScale } from "react-native-size-matters";

// import {
//     startReceivingOffers,
//     addOffer,
//     acceptOffer,
//     cancelRequest,
//     updateVendorLocation,
//     removeOffersByIds,
//     VendorOffer,
//     Coordinate,
//     removeOutOfRangeOffers,
// } from "../../../src/store/slices/offersSlice";
// import { RootState } from "../../../src/store";
// import { useBackHandlerExit } from "../../../src/hooks/useBackHandlerExit";
// import {
//     generateRandomOffer,
//     simulateVendorMovement,
// } from "../../../src/utils/mockOffers";
// import { VendorOfferCard } from "../../../src/components/customer/VendorOfferCard";
// import RatingModal from "../../../src/components/common/RatingModal";
// import { OffersList } from "../VendorOfferList";
// import { Slider } from "@miblanchard/react-native-slider";
// import { setupPushNotifications, sendLocalNotification, sendOfferNotification, clearAllOfferNotifications } from "../../../src/utils/notifications";
// import debounce from "lodash.debounce";

// type Coordinates = { latitude: number; longitude: number };

// interface LocalVendorState {
//     currentLocation: Coordinate;
//     lastDistanceReportedAt: number;
//     distanceMoved: number;
// }

// const BATCH_SIZE = 3;
// const TIMER_DURATION = 20;
// const GENERATE_INTERVAL_MS = 4000;
// const MOVEMENT_INTERVAL_MS = 2000;
// const ARRIVAL_THRESHOLD_METERS = 20;
// const MOVEMENT_SPEED = 0.0002;
// const ROUTE_UPDATE_THRESHOLD_METERS = 50;

// export default function LiveOffersScreen() {
//     const router = useRouter();
//     const dispatch = useDispatch();
//     const mapRef = useRef<MapView | null>(null);
//     const bottomSheetRef = useRef<BottomSheet | null>(null);

//     const { offers, acceptedOffer, isReceivingOffers } = useSelector(
//         (s: RootState) => s.offers
//     );

//     const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
//     const [locationLoading, setLocationLoading] = useState(true);
//     const [locationError, setLocationError] = useState<string | null>(null);
//     const [routeCoords, setRouteCoords] = useState<Coordinates[]>([]);
//     const [vendorArrived, setVendorArrived] = useState(false);
//     const [showRatingModal, setShowRatingModal] = useState(false);
//     const [distanceToUser, setDistanceToUser] = useState<number | null>(null);
//     const [vendorLocalState, setVendorLocalState] = useState<LocalVendorState | null>(null);
//     const [radiusKm, setRadiusKm] = useState<number>(5);

//     useBackHandlerExit();

//     const generateIntervalRef = useRef<NodeJS.Timeout | null>(null);
//     const movementIntervalRef = useRef<NodeJS.Timeout | null>(null);
//     const routeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//     const offersLengthRef = useRef(offers.length);
//     const lastRouteUpdatePositionRef = useRef<Coordinates | null>(null);

//     const handleRadiusChange = useCallback((value: number | number[]) => {
//         if (Array.isArray(value)) value = value[0];
//         const clamped = Math.max(1, Math.min(value, 20));
//         setRadiusKm(clamped);
//     }, []);

//     const getOutOfRangeIds = useCallback(
//         (offers: VendorOffer[], radiusKm: number) => offers.filter(o => o.distance > radiusKm).map(o => o.id),
//         []
//     );

//     const debouncedRemove = useMemo(
//         () =>
//             debounce((ids: string[]) => {
//                 if (ids.length) dispatch(removeOutOfRangeOffers(ids));
//             }, 400),
//         [dispatch]
//     );

//     const getDistanceInMeters = useCallback((a: Coordinates, b: Coordinates): number => {
//         const R = 6371e3;
//         const toRad = (v: number) => (v * Math.PI) / 180;
//         const dLat = toRad(b.latitude - a.latitude);
//         const dLon = toRad(b.longitude - a.longitude);
//         const lat1 = toRad(a.latitude);
//         const lat2 = toRad(b.latitude);
//         const aa =
//             Math.sin(dLat / 2) ** 2 +
//             Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
//         const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
//         return R * c;
//     }, []);

//     useEffect(() => {
//         setupPushNotifications();
//     }, []);

//     const getUserLocation = useCallback(async () => {
//         try {
//             const { status } = await Location.requestForegroundPermissionsAsync();
//             if (status !== "granted") throw new Error("Location permission denied");

//             const loc = await Location.getCurrentPositionAsync({
//                 accuracy: Location.Accuracy.High,
//             });

//             const coords = {
//                 latitude: loc.coords.latitude,
//                 longitude: loc.coords.longitude,
//             };
//             setUserLocation(coords);
//             dispatch(startReceivingOffers());

//             mapRef.current?.animateToRegion({
//                 ...coords,
//                 latitudeDelta: 0.05,
//                 longitudeDelta: 0.05,
//             }, 1000);
//         } catch (err: any) {
//             setLocationError(err?.message || "Failed to get location");
//         } finally {
//             setLocationLoading(false);
//         }
//     }, [dispatch]);

//     useEffect(() => {
//         getUserLocation();
//     }, [getUserLocation]);

//     const fetchRoute = useCallback(async (start: Coordinates, end: Coordinates): Promise<Coordinates[]> => {
//         try {
//             const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
//             const res = await fetch(url);
//             if (!res.ok) return [start, end];
//             const data = await res.json();
//             if (!data?.routes?.length) return [start, end];
//             return data.routes[0].geometry.coordinates.map(
//                 ([lng, lat]: [number, number]) => ({
//                     latitude: lat,
//                     longitude: lng,
//                 })
//             );
//         } catch (e) {
//             console.warn("fetchRoute error:", e);
//             return [start, end];
//         }
//     }, []);

//     const debouncedFetchRoute = useCallback(
//         (start: Coordinates, end: Coordinates, delay = 700) =>
//             new Promise<Coordinates[]>((resolve) => {
//                 if (routeTimeoutRef.current) clearTimeout(routeTimeoutRef.current);
//                 routeTimeoutRef.current = setTimeout(async () => {
//                     const r = await fetchRoute(start, end);
//                     resolve(r);
//                 }, delay);
//             }),
//         [fetchRoute]
//     );

//     const handleAcceptOffer = useCallback(
//         async (offer: VendorOffer) => {
//             dispatch(acceptOffer(offer));
//             setVendorLocalState({
//                 currentLocation: offer.coordinates,
//                 lastDistanceReportedAt: 0,
//                 distanceMoved: 0,
//             });
//             if (userLocation) {
//                 const route = await debouncedFetchRoute(offer.coordinates, userLocation);
//                 setRouteCoords(route);
//                 lastRouteUpdatePositionRef.current = offer.coordinates;

//                 if (route?.length > 2) {
//                     mapRef.current?.fitToCoordinates(route, {
//                         edgePadding: { top: 100, right: 100, bottom: 400, left: 100 },
//                         animated: true,
//                     });
//                 }
//             }
//             bottomSheetRef.current?.snapToIndex(0);
//         },
//         [dispatch, userLocation, debouncedFetchRoute]
//     );

//     const updateRouteIfNeeded = useCallback(
//         async (newVendorLocation: Coordinates) => {
//             if (!userLocation || !lastRouteUpdatePositionRef.current) return;

//             const distanceFromLastUpdate = getDistanceInMeters(
//                 lastRouteUpdatePositionRef.current,
//                 newVendorLocation
//             );

//             if (distanceFromLastUpdate >= ROUTE_UPDATE_THRESHOLD_METERS) {
//                 const newRoute = await fetchRoute(newVendorLocation, userLocation);
//                 setRouteCoords(newRoute);
//                 lastRouteUpdatePositionRef.current = newVendorLocation;
//             }
//         },
//         [userLocation, getDistanceInMeters, fetchRoute]
//     );

//     useEffect(() => {
//         offersLengthRef.current = offers.length;
//     }, [offers.length]);

//     useEffect(() => {
//         return () => {
//             clearAllOfferNotifications();
//         };
//     }, []);

//     useEffect(() => {
//         if (!userLocation || !isReceivingOffers || acceptedOffer) {
//             if (generateIntervalRef.current) {
//                 clearInterval(generateIntervalRef.current);
//                 generateIntervalRef.current = null;
//             }
//             return;
//         }

//         generateIntervalRef.current = setInterval(() => {
//             if (offersLengthRef.current < BATCH_SIZE) {
//                 const offer = generateRandomOffer(userLocation, radiusKm);
//                 const dist = getDistanceInMeters(userLocation, offer.coordinates) / 1000;
//                 if (dist <= radiusKm) {
//                     dispatch(addOffer({
//                         ...offer,
//                         createdAt: Date.now(),
//                         expiryTime: Date.now() + TIMER_DURATION * 1000,
//                     }));
//                     sendOfferNotification(offer);
//                 }
//             }
//         }, GENERATE_INTERVAL_MS);

//         return () => {
//             if (generateIntervalRef.current) {
//                 clearInterval(generateIntervalRef.current);
//                 generateIntervalRef.current = null;
//             }
//         };
//     }, [userLocation, isReceivingOffers, acceptedOffer, dispatch, radiusKm, getDistanceInMeters]);

//     useEffect(() => {
//         if (!offers?.length) return;
//         const outOfRangeIds = getOutOfRangeIds(offers, radiusKm);
//         debouncedRemove(outOfRangeIds);
//         return () => debouncedRemove.cancel();
//     }, [offers, radiusKm, getOutOfRangeIds, debouncedRemove]);

//     const filteredOffers = useMemo(() => {
//         if (!userLocation) return [];
//         return offers.filter(offer => {
//             const distance = getDistanceInMeters(userLocation, offer.coordinates);
//             return distance <= radiusKm * 1000;
//         });
//     }, [offers, userLocation, radiusKm, getDistanceInMeters]);

//     useEffect(() => {
//         if (!acceptedOffer || !userLocation || !vendorLocalState || vendorArrived) {
//             return;
//         }

//         setVendorArrived(false);

//         const movementInterval = setInterval(() => {
//             setVendorLocalState((prevState) => {
//                 if (!prevState) return null;

//                 const newLocation = simulateVendorMovement(
//                     prevState.currentLocation,
//                     userLocation,
//                     0.0002
//                 );

//                 const distanceMoved = getDistanceInMeters(prevState.currentLocation, newLocation);
//                 const totalDistanceMoved = prevState.distanceMoved + distanceMoved;
//                 const distanceToCustomer = getDistanceInMeters(newLocation, userLocation);

//                 if (distanceToCustomer === 0) {
//                     console.log("✅ Vendor arrived at destination");
//                     sendLocalNotification("Vendor Arrived", `${acceptedOffer.name} has reached your location!`);
//                     setVendorArrived(true);
//                     clearInterval(movementInterval);
//                 }

//                 if (totalDistanceMoved >= 50 || distanceToCustomer < 100) {
//                     console.log(`✓ DISPATCH at ${totalDistanceMoved.toFixed(0)}m - Distance to user: ${distanceToCustomer.toFixed(0)}m`);
//                     dispatch(
//                         updateVendorLocation({
//                             id: acceptedOffer.id,
//                             coordinates: newLocation,
//                             distance: Number((distanceToCustomer / 1000).toFixed(2)),
//                             eta: Math.max(Math.round(distanceToCustomer / 250), 1),
//                         })
//                     );

//                     return {
//                         currentLocation: newLocation,
//                         lastDistanceReportedAt: Date.now(),
//                         distanceMoved: 0,
//                     };
//                 }
//                 updateRouteIfNeeded(newLocation);

//                 console.log(`~ Moving: ${totalDistanceMoved.toFixed(0)}m total, ${distanceToCustomer.toFixed(0)}m to user`);

//                 return {
//                     currentLocation: newLocation,
//                     lastDistanceReportedAt: prevState.lastDistanceReportedAt,
//                     distanceMoved: totalDistanceMoved,
//                 };
//             });
//         }, 2000);
//         return () => clearInterval(movementInterval);
//     }, [acceptedOffer, userLocation, dispatch, getDistanceInMeters, updateRouteIfNeeded, vendorLocalState, vendorArrived]);

//     const handleCancelRequest = useCallback(() => {
//         dispatch(cancelRequest());
//         router.back();
//     }, [dispatch, router]);

//     const renderMarkers = useMemo(() => {
//         if (!userLocation) return null;
//         const markers: React.ReactNode[] = [];

//         markers.push(
//             <Marker key="user" coordinate={userLocation} title="Your Location">
//                 <LinearGradient
//                     colors={['#2563EB', '#F97316']}
//                     start={{ x: 0, y: 0 }}
//                     end={{ x: 1, y: 1 }}
//                     style={styles.userMarker}
//                 >
//                     <MapPin size={24} color="#fff" />
//                 </LinearGradient>
//             </Marker>
//         );

//         if (acceptedOffer) {
//             markers.push(
//                 <Marker
//                     key={acceptedOffer.id}
//                     coordinate={acceptedOffer.coordinates}
//                     title={`${acceptedOffer.name} (Accepted)`}
//                 >
//                     <LinearGradient
//                         colors={['#F97316', '#2563EB']}
//                         start={{ x: 0, y: 0 }}
//                         end={{ x: 1, y: 1 }}
//                         style={styles.acceptedVendorMarker}
//                     >
//                         <User size={24} color="#fff" />
//                     </LinearGradient>
//                 </Marker>
//             );
//         } else {
//             filteredOffers.forEach((o) => {
//                 markers.push(
//                     <Marker key={o.id} coordinate={o.coordinates} title={o.name}>
//                         <LinearGradient
//                             colors={['#10b981', '#059669']}
//                             start={{ x: 0, y: 0 }}
//                             end={{ x: 1, y: 1 }}
//                             style={styles.vendorMarker}
//                         >
//                             <User size={20} color="#fff" />
//                         </LinearGradient>
//                     </Marker>
//                 );
//             });
//         }

//         return markers;
//     }, [userLocation, filteredOffers, acceptedOffer]);

//     useEffect(() => {
//         if (!isReceivingOffers) {
//             if (generateIntervalRef.current) {
//                 clearInterval(generateIntervalRef.current);
//                 generateIntervalRef.current = null;
//             }
//             if (movementIntervalRef.current) {
//                 clearInterval(movementIntervalRef.current);
//                 movementIntervalRef.current = null;
//             }
//         }
//     }, [isReceivingOffers]);

//     if (locationLoading) {
//         return (
//             <View style={styles.centerContainer}>
//                 <LinearGradient
//                     colors={['#2563EB', '#F97316']}
//                     start={{ x: 0, y: 0 }}
//                     end={{ x: 1, y: 1 }}
//                     style={styles.loadingGradient}
//                 >
//                     <ActivityIndicator size="large" color="#fff" />
//                     <Text style={styles.loadingText}>Getting your location...</Text>
//                 </LinearGradient>
//             </View>
//         );
//     }

//     if (locationError || !userLocation) {
//         return (
//             <View style={styles.centerContainer}>
//                 <View style={styles.errorContainer}>
//                     <Text style={styles.errorText}>
//                         {locationError || "Location unavailable"}
//                     </Text>
//                     <TouchableOpacity
//                         style={styles.retryButton}
//                         onPress={getUserLocation}
//                         activeOpacity={0.8}
//                     >
//                         <LinearGradient
//                             colors={['#2563EB', '#F97316']}
//                             start={{ x: 0, y: 0 }}
//                             end={{ x: 1, y: 0 }}
//                             style={styles.retryButtonInner}
//                         >
//                             <Text style={styles.retryButtonText}>Retry</Text>
//                         </LinearGradient>
//                     </TouchableOpacity>
//                 </View>
//             </View>
//         );
//     }

//     const radiusSelector = (
//         <View style={styles.radiusContainer}>
//             <LinearGradient
//                 colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
//                 style={styles.radiusGradient}
//             >
//                 <Text style={styles.radiusLabel}>
//                     Search Radius: <Text style={styles.radiusValue}>{radiusKm.toFixed(1)} km</Text>
//                 </Text>
//                 <Slider
//                     value={radiusKm}
//                     onValueChange={handleRadiusChange}
//                     minimumValue={1}
//                     maximumValue={20}
//                     step={0.5}
//                     minimumTrackTintColor="#2563EB"
//                     maximumTrackTintColor="#e2e8f0"
//                     thumbTintColor="#F97316"
//                     containerStyle={styles.sliderContainer}
//                 />
//             </LinearGradient>
//         </View>
//     );

//     return (
//         <GestureHandlerRootView style={styles.container}>
//             {radiusSelector}
//             <RatingModal
//                 visible={showRatingModal}
//                 onClose={() => setShowRatingModal(false)}
//             />
//             <MapView
//                 ref={(r) => (mapRef.current = r)}
//                 style={styles.map}
//                 provider={PROVIDER_DEFAULT}
//                 initialRegion={{
//                     ...userLocation,
//                     latitudeDelta: 0.05,
//                     longitudeDelta: 0.05,
//                 }}
//             >
//                 {Platform.OS === "web" && (
//                     <UrlTile
//                         urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//                         maximumZ={19}
//                     />
//                 )}
//                 {routeCoords?.length > 0 && (
//                     <Polyline
//                         coordinates={routeCoords}
//                         strokeColor="#2563EB"
//                         strokeWidth={5}
//                         lineDashPattern={[1]}
//                     />
//                 )}
//                 {renderMarkers}
//             </MapView>

//             <TouchableOpacity
//                 style={styles.cancelButton}
//                 onPress={handleCancelRequest}
//                 activeOpacity={0.8}
//             >
//                 <LinearGradient
//                     colors={['#ef4444', '#dc2626']}
//                     start={{ x: 0, y: 0 }}
//                     end={{ x: 1, y: 0 }}
//                     style={styles.cancelButtonInner}
//                 >
//                     <X size={20} color="#fff" />
//                     <Text style={styles.cancelButtonText}>Cancel Request</Text>
//                 </LinearGradient>
//             </TouchableOpacity>

//             <BottomSheet
//                 ref={(r) => (bottomSheetRef.current = r)}
//                 index={1}
//                 snapPoints={acceptedOffer ? ["25%", "40%"] : ["25%", "60%"]}
//                 enablePanDownToClose={false}
//                 backgroundStyle={styles.bottomSheetBackground}
//                 handleIndicatorStyle={styles.bottomSheetHandle}
//             >
//                 <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
//                     {acceptedOffer ? (
//                         <View>
//                             <View style={styles.sheetTitleContainer}>
//                                 <LinearGradient
//                                     colors={['#2563EB', '#F97316']}
//                                     start={{ x: 0, y: 0 }}
//                                     end={{ x: 1, y: 0 }}
//                                     style={styles.sheetTitleGradient}
//                                 >
//                                     <Text style={styles.sheetTitle}>Vendor on the way</Text>
//                                 </LinearGradient>
//                             </View>
//                             <VendorOfferCard offer={acceptedOffer} isAccepted />
//                             <View style={styles.statusContainer}>
//                                 {!vendorArrived ? (
//                                     <>
//                                         <LinearGradient
//                                             colors={['#2563EB', '#F97316']}
//                                             start={{ x: 0, y: 0 }}
//                                             end={{ x: 1, y: 1 }}
//                                             style={styles.loadingIndicator}
//                                         >
//                                             <ActivityIndicator size="small" color="#fff" />
//                                         </LinearGradient>
//                                         <View style={{ flex: 1 }}>
//                                             <Text style={styles.statusText}>
//                                                 {acceptedOffer.name} is heading to your location...
//                                             </Text>
//                                             {acceptedOffer.distance !== undefined && (
//                                                 <Text style={styles.statusTextSmall}>
//                                                     {acceptedOffer.distance} km away • ETA {acceptedOffer.eta} min
//                                                 </Text>
//                                             )}
//                                         </View>
//                                     </>
//                                 ) : (
//                                     <View style={{ flex: 1 }}>
//                                         <Text style={[styles.statusText, { color: "#22c55e" }]}>
//                                             ✓ {acceptedOffer.name} has arrived!
//                                         </Text>
//                                         <TouchableOpacity
//                                             style={styles.arrivedButton}
//                                             onPress={() => setShowRatingModal(true)}
//                                             activeOpacity={0.8}
//                                         >
//                                             <LinearGradient
//                                                 colors={['#22c55e', '#16a34a']}
//                                                 start={{ x: 0, y: 0 }}
//                                                 end={{ x: 1, y: 0 }}
//                                                 style={styles.arrivedButtonInner}
//                                             >
//                                                 <Text style={styles.arrivedButtonText}>Mark as Complete</Text>
//                                             </LinearGradient>
//                                         </TouchableOpacity>
//                                     </View>
//                                 )}
//                             </View>
//                         </View>
//                     ) : (
//                         <View>
//                             <View style={styles.sheetTitleContainer}>
//                                 <LinearGradient
//                                     colors={['#2563EB', '#F97316']}
//                                     start={{ x: 0, y: 0 }}
//                                     end={{ x: 1, y: 0 }}
//                                     style={styles.sheetTitleGradient}
//                                 >
//                                     <Text style={styles.sheetTitle}>
//                                         {offers.length === 0
//                                             ? "Waiting for offers..."
//                                             : `${offers.length} Offers Received`}
//                                     </Text>
//                                 </LinearGradient>
//                             </View>

//                             {offers.length === 0 ? (
//                                 <View style={styles.emptyState}>
//                                     <LinearGradient
//                                         colors={['#2563EB', '#F97316']}
//                                         start={{ x: 0, y: 0 }}
//                                         end={{ x: 1, y: 1 }}
//                                         style={styles.emptyGradient}
//                                     >
//                                         <ActivityIndicator size="large" color="#fff" />
//                                     </LinearGradient>
//                                     <Text style={styles.emptyText}>
//                                         Nearby vendors are reviewing your request
//                                     </Text>
//                                 </View>
//                             ) : (
//                                 <OffersList
//                                     offers={filteredOffers}
//                                     onAccept={handleAcceptOffer}
//                                     onExpire={(id) => dispatch(removeOffersByIds(id))}
//                                 />
//                             )}
//                         </View>
//                     )}
//                 </BottomSheetScrollView>
//             </BottomSheet>
//         </GestureHandlerRootView>
//     );
// }

// const styles = StyleSheet.create({
//     container: { flex: 1 },
//     map: { flex: 1 },
//     centerContainer: {
//         flex: 1,
//         justifyContent: "center",
//         alignItems: "center",
//         backgroundColor: "#f8fafc",
//         padding: 20,
//     },
//     loadingGradient: {
//         padding: moderateScale(40),
//         borderRadius: 24,
//         alignItems: 'center',
//         justifyContent: 'center',
//         gap: 16,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.3,
//         shadowRadius: 8,
//         elevation: 8,
//     },
//     loadingText: {
//         marginTop: 16,
//         fontSize: moderateScale(16),
//         color: "#fff",
//         fontWeight: '600',
//     },
//     errorContainer: {
//         backgroundColor: '#fff',
//         padding: moderateScale(32),
//         borderRadius: 24,
//         alignItems: 'center',
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.1,
//         shadowRadius: 12,
//         elevation: 8,
//     },
//     errorText: {
//         fontSize: moderateScale(16),
//         color: "#ef4444",
//         textAlign: "center",
//         marginBottom: 20,
//         fontWeight: '600',
//     },
//     retryButton: {
//         borderRadius: 12,
//         overflow: 'hidden',
//         shadowColor: '#2563EB',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.3,
//         shadowRadius: 8,
//         elevation: 4,
//     },
//     retryButtonInner: {
//         paddingHorizontal: 32,
//         paddingVertical: 14,
//     },
//     retryButtonText: {
//         color: "#fff",
//         fontSize: moderateScale(16),
//         fontWeight: "700",
//     },
//     userMarker: {
//         width: 48,
//         height: 48,
//         borderRadius: 24,
//         justifyContent: "center",
//         alignItems: "center",
//         borderWidth: 3,
//         borderColor: "#fff",
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.3,
//         shadowRadius: 6,
//         elevation: 8,
//     },
//     vendorMarker: {
//         width: 40,
//         height: 40,
//         borderRadius: 20,
//         justifyContent: "center",
//         alignItems: "center",
//         borderWidth: 3,
//         borderColor: "#fff",
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.3,
//         shadowRadius: 6,
//         elevation: 8,
//     },
//     acceptedVendorMarker: {
//         width: 52,
//         height: 52,
//         borderRadius: 26,
//         justifyContent: "center",
//         alignItems: "center",
//         borderWidth: 4,
//         borderColor: "#fff",
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.4,
//         shadowRadius: 8,
//         elevation: 10,
//     },
//     cancelButton: {
//         position: "absolute",
//         top: moderateScale(50),
//         left: moderateScale(16),
//         right: moderateScale(16),
//         borderRadius: 16,
//         overflow: 'hidden',
//         shadowColor: '#ef4444',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.3,
//         shadowRadius: 8,
//         elevation: 8,
//     },
//     cancelButtonInner: {
//         flexDirection: "row",
//         alignItems: "center",
//         justifyContent: "center",
//         paddingVertical: moderateScale(14),
//         gap: 8,
//     },
//     cancelButtonText: {
//         color: "#fff",
//         fontSize: moderateScale(16),
//         fontWeight: "700",
//     },
//     radiusContainer: {
//         position: "absolute",
//         top: moderateScale(120),
//         left: moderateScale(16),
//         right: moderateScale(16),
//         borderRadius: 16,
//         overflow: 'hidden',
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 4 }
//     },
//     radiusGradient: {
//         paddingVertical: moderateScale(16),
//         paddingHorizontal: moderateScale(20),
//         borderRadius: 16,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 3 },
//         shadowOpacity: 0.15,
//         shadowRadius: 6,
//         elevation: 6,
//     },
//     radiusLabel: {
//         fontSize: moderateScale(14),
//         fontWeight: '600',
//         color: '#1e293b',
//         marginBottom: 8,
//     },
//     radiusValue: {
//         color: '#2563EB',
//         fontWeight: '700',
//     },
//     sliderContainer: {
//         marginTop: 4,
//         height: 40,
//         justifyContent: 'center',
//     },

//     bottomSheetBackground: {
//         backgroundColor: '#ffffff',
//         borderTopLeftRadius: 24,
//         borderTopRightRadius: 24,
//     },
//     bottomSheetHandle: {
//         backgroundColor: '#cbd5e1',
//         width: 60,
//         height: 6,
//         borderRadius: 3,
//         alignSelf: "center",
//         marginVertical: 8,
//     },
//     bottomSheetContent: {
//         padding: moderateScale(16),
//         paddingBottom: moderateScale(40),
//     },

//     sheetTitleContainer: {
//         marginBottom: 12,
//     },
//     sheetTitleGradient: {
//         paddingVertical: moderateScale(10),
//         paddingHorizontal: moderateScale(16),
//         borderRadius: 12,
//     },
//     sheetTitle: {
//         color: "#fff",
//         fontSize: moderateScale(16),
//         fontWeight: "700",
//         textAlign: "center",
//     },

//     emptyState: {
//         alignItems: "center",
//         marginTop: moderateScale(12),
//     },
//     emptyGradient: {
//         width: 80,
//         height: 80,
//         borderRadius: 40,
//         alignItems: "center",
//         justifyContent: "center",
//         marginBottom: 12,
//     },
//     emptyText: {
//         fontSize: moderateScale(14),
//         color: "#475569",
//         textAlign: "center",
//         paddingHorizontal: 20,
//         fontWeight: "500",
//     },

//     statusContainer: {
//         flexDirection: "row",
//         marginTop: 16,
//         padding: 12,
//         backgroundColor: "#f8fafc",
//         borderRadius: 16,
//         alignItems: "center",
//         gap: 12,
//         borderWidth: 1,
//         borderColor: "#e2e8f0",
//     },
//     loadingIndicator: {
//         width: 42,
//         height: 42,
//         borderRadius: 21,
//         justifyContent: "center",
//         alignItems: "center",
//     },
//     statusText: {
//         fontSize: moderateScale(14),
//         fontWeight: '600',
//         color: "#1e293b",
//     },
//     statusTextSmall: {
//         fontSize: moderateScale(12),
//         color: "#64748b",
//         marginTop: 4,
//     },

//     arrivedButton: {
//         marginTop: 12,
//         borderRadius: 12,
//         overflow: "hidden",
//     },
//     arrivedButtonInner: {
//         paddingVertical: 12,
//         alignItems: "center",
//         justifyContent: "center",
//     },
//     arrivedButtonText: {
//         color: "#fff",
//         fontSize: moderateScale(15),
//         fontWeight: "700",
//     },
// });




// // LiveOffersScreen.tsx - PRODUCTION GRADE WITH WORKING MOVEMENT
// import React, {
//     useCallback,
//     useEffect,
//     useMemo,
//     useRef,
//     useState,
// } from "react";
// import {
//     View,
//     Text,
//     StyleSheet,
//     TouchableOpacity,
//     ActivityIndicator,
//     Platform,
// } from "react-native";
// import MapView, {
//     Marker,
//     PROVIDER_DEFAULT,
//     UrlTile,
//     Polyline,
// } from "react-native-maps";
// import * as Location from "expo-location";
// import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { useRouter } from "expo-router";
// import { useDispatch, useSelector } from "react-redux";
// import { MapPin, X, User } from "lucide-react-native";

// import {
//     startReceivingOffers,
//     addOffer,
//     acceptOffer,
//     cancelRequest,
//     updateVendorLocation,
//     removeOffersByIds,
//     VendorOffer,
//     Coordinate,
//     removeOutOfRangeOffers,
// } from "../../../src/store/slices/offersSlice";
// import { RootState } from "../../../src/store";
// import { useBackHandlerExit } from "../../../src/hooks/useBackHandlerExit";
// import {
//     generateRandomOffer,
//     simulateVendorMovement,
// } from "../../../src/utils/mockOffers";
// import { VendorOfferCard } from "../../../src/components/customer/VendorOfferCard";
// import RatingModal from "../../../src/components/common/RatingModal";
// import { OffersList } from "../VendorOfferList";
// import { Slider } from "@miblanchard/react-native-slider";
// import { setupPushNotifications, sendLocalNotification, sendOfferNotification, clearAllOfferNotifications } from "../../../src/utils/notifications";
// import debounce from "lodash.debounce";

// type Coordinates = { latitude: number; longitude: number };

// interface LocalVendorState {
//     currentLocation: Coordinate;
//     lastDistanceReportedAt: number;
//     distanceMoved: number;
// }

// const BATCH_SIZE = 3;
// const TIMER_DURATION = 20;
// const GENERATE_INTERVAL_MS = 4000;
// const MOVEMENT_INTERVAL_MS = 2000;
// const ARRIVAL_THRESHOLD_METERS = 20;
// const MOVEMENT_SPEED = 0.0002; // ~22 meters per update (same as your old code)
// const ROUTE_UPDATE_THRESHOLD_METERS = 50;

// export default function LiveOffersScreen() {
//     const router = useRouter();
//     const dispatch = useDispatch();
//     const mapRef = useRef<MapView | null>(null);
//     const bottomSheetRef = useRef<BottomSheet | null>(null);

//     const { offers, acceptedOffer, isReceivingOffers } = useSelector(
//         (s: RootState) => s.offers
//     );

//     const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
//     const [locationLoading, setLocationLoading] = useState(true);
//     const [locationError, setLocationError] = useState<string | null>(null);
//     const [routeCoords, setRouteCoords] = useState<Coordinates[]>([]);
//     const [vendorArrived, setVendorArrived] = useState(false);
//     const [showRatingModal, setShowRatingModal] = useState(false);
//     const [distanceToUser, setDistanceToUser] = useState<number | null>(null);
//     const [vendorLocalState, setVendorLocalState] = useState<LocalVendorState | null>(null);
//     const [radiusKm, setRadiusKm] = useState<number>(5); // default 5km
//     const radiusOptions = [5, 10, 20]; // km

//     useBackHandlerExit();

//     // ===== REFS FOR STABLE STATE =====
//     const generateIntervalRef = useRef<NodeJS.Timeout | null>(null);
//     const movementIntervalRef = useRef<NodeJS.Timeout | null>(null);
//     const routeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//     const offersLengthRef = useRef(offers.length);
//     const lastRouteUpdatePositionRef = useRef<Coordinates | null>(null);


//     const handleRadiusChange = useCallback((value: number | number[]) => {
//         if (Array.isArray(value)) value = value[0]; // slider returns array
//         const clamped = Math.max(1, Math.min(value, 20)); // limit 1-20km
//         setRadiusKm(clamped);
//     }, []);


//     // 🔹 Pure function: filters and returns out-of-range IDs
//     const getOutOfRangeIds = useCallback(
//         (offers: VendorOffer[], radiusKm: number) => offers.filter(o => o.distance > radiusKm).map(o => o.id),
//         []
//     );

//     // 🔹 Debounced dispatcher to avoid flickering or redundant removes
//     const debouncedRemove = useMemo(
//         () =>
//             debounce((ids: string[]) => {
//                 if (ids.length) dispatch(removeOutOfRangeOffers(ids));
//             }, 400),
//         [dispatch]
//     );


//     // ===== HAVERSINE DISTANCE CALCULATION =====
//     const getDistanceInMeters = useCallback((a: Coordinates, b: Coordinates): number => {
//         const R = 6371e3;
//         const toRad = (v: number) => (v * Math.PI) / 180;
//         const dLat = toRad(b.latitude - a.latitude);
//         const dLon = toRad(b.longitude - a.longitude);
//         const lat1 = toRad(a.latitude);
//         const lat2 = toRad(b.latitude);
//         const aa =
//             Math.sin(dLat / 2) ** 2 +
//             Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
//         const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
//         return R * c;
//     }, []);


//     useEffect(() => {
//         setupPushNotifications();
//     }, []);
//     // ===== LOCATION PERMISSION & FETCHING =====
//     const getUserLocation = useCallback(async () => {
//         try {
//             const { status } = await Location.requestForegroundPermissionsAsync();
//             if (status !== "granted") throw new Error("Location permission denied");

//             const loc = await Location.getCurrentPositionAsync({
//                 accuracy: Location.Accuracy.High,
//             });

//             const coords = {
//                 latitude: loc.coords.latitude,
//                 longitude: loc.coords.longitude,
//             };
//             setUserLocation(coords);
//             dispatch(startReceivingOffers());

//             mapRef.current?.animateToRegion({
//                 ...coords,
//                 latitudeDelta: 0.05,
//                 longitudeDelta: 0.05,
//             }, 1000);
//         } catch (err: any) {
//             setLocationError(err?.message || "Failed to get location");
//         } finally {
//             setLocationLoading(false);
//         }
//     }, [dispatch]);

//     useEffect(() => {
//         getUserLocation();
//     }, [getUserLocation]);

//     // ===== FETCH ROUTE FROM OSRM =====
//     const fetchRoute = useCallback(async (start: Coordinates, end: Coordinates): Promise<Coordinates[]> => {
//         try {
//             const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
//             const res = await fetch(url);
//             if (!res.ok) return [start, end];
//             const data = await res.json();
//             if (!data?.routes?.length) return [start, end];
//             return data.routes[0].geometry.coordinates.map(
//                 ([lng, lat]: [number, number]) => ({
//                     latitude: lat,
//                     longitude: lng,
//                 })
//             );
//         } catch (e) {
//             console.warn("fetchRoute error:", e);
//             return [start, end];
//         }
//     }, []);

//     // ===== DEBOUNCED ROUTE FETCH =====
//     const debouncedFetchRoute = useCallback(
//         (start: Coordinates, end: Coordinates, delay = 700) =>
//             new Promise<Coordinates[]>((resolve) => {
//                 if (routeTimeoutRef.current) clearTimeout(routeTimeoutRef.current);
//                 routeTimeoutRef.current = setTimeout(async () => {
//                     const r = await fetchRoute(start, end);
//                     resolve(r);
//                 }, delay);
//             }),
//         [fetchRoute]
//     );

//     // ===== HANDLE ACCEPT OFFER =====
//     const handleAcceptOffer = useCallback(
//         async (offer: VendorOffer) => {
//             dispatch(acceptOffer(offer));
//             setVendorLocalState({
//                 currentLocation: offer.coordinates,
//                 lastDistanceReportedAt: 0,
//                 distanceMoved: 0,
//             });
//             if (userLocation) {
//                 const route = await debouncedFetchRoute(offer.coordinates, userLocation);
//                 setRouteCoords(route);
//                 lastRouteUpdatePositionRef.current = offer.coordinates;

//                 if (route?.length > 2) {
//                     mapRef.current?.fitToCoordinates(route, {
//                         edgePadding: { top: 100, right: 100, bottom: 400, left: 100 },
//                         animated: true,
//                     });
//                 }
//             }
//             bottomSheetRef.current?.snapToIndex(0);
//         },
//         [dispatch, userLocation, debouncedFetchRoute]
//     );

//     // ===== UPDATE ROUTE IF VENDOR MOVED SIGNIFICANTLY =====
//     const updateRouteIfNeeded = useCallback(
//         async (newVendorLocation: Coordinates) => {
//             if (!userLocation || !lastRouteUpdatePositionRef.current) return;

//             const distanceFromLastUpdate = getDistanceInMeters(
//                 lastRouteUpdatePositionRef.current,
//                 newVendorLocation
//             );

//             if (distanceFromLastUpdate >= ROUTE_UPDATE_THRESHOLD_METERS) {
//                 const newRoute = await fetchRoute(newVendorLocation, userLocation);
//                 setRouteCoords(newRoute);
//                 lastRouteUpdatePositionRef.current = newVendorLocation;
//             }
//         },
//         [userLocation, getDistanceInMeters, fetchRoute]
//     );

//     // ===== TRACK OFFERS LENGTH =====
//     useEffect(() => {
//         offersLengthRef.current = offers.length;
//     }, [offers.length]);

//     useEffect(() => {
//         return () => {
//             clearAllOfferNotifications();
//         };
//     }, []);

//     // ===== OFFER GENERATOR (ONLY IF NOT ACCEPTED) =====
//     useEffect(() => {
//         if (!userLocation || !isReceivingOffers || acceptedOffer) {
//             if (generateIntervalRef.current) {
//                 clearInterval(generateIntervalRef.current);
//                 generateIntervalRef.current = null;
//             }
//             return;
//         }

//         generateIntervalRef.current = setInterval(() => {
//             if (offersLengthRef.current < BATCH_SIZE) {
//                 const offer = generateRandomOffer(userLocation, radiusKm);

//                 // Optional: double-check distance
//                 const dist = getDistanceInMeters(userLocation, offer.coordinates) / 1000;
//                 if (dist <= radiusKm) {
//                     dispatch(addOffer({
//                         ...offer,
//                         createdAt: Date.now(),
//                         expiryTime: Date.now() + TIMER_DURATION * 1000,
//                     }));
//                     sendOfferNotification(offer);
//                     // sendLocalNotification("New vendor offer available", `${offer.name} is nearby within ${radiusKm} km!`);
//                 }
//             }
//         }, GENERATE_INTERVAL_MS);

//         return () => {
//             if (generateIntervalRef.current) {
//                 clearInterval(generateIntervalRef.current);
//                 generateIntervalRef.current = null;
//             }
//         };
//     }, [userLocation, isReceivingOffers, acceptedOffer, dispatch, radiusKm]);

//     // In your LiveOffers.tsx
//     useEffect(() => {
//         if (!offers?.length) return;
//         const outOfRangeIds = getOutOfRangeIds(offers, radiusKm);
//         debouncedRemove(outOfRangeIds);
//         return () => debouncedRemove.cancel(); // cleanup
//     }, [offers, radiusKm, getOutOfRangeIds, debouncedRemove]);

//     // useEffect(() => {
//     //     if (!offers?.length) return;

//     //     const filteredOffers = offers.filter(o => o.distance <= radiusKm);

//     //     // If some are out of range — remove them from Redux
//     //     if (filteredOffers.length !== offers.length) {
//     //         const outOfRangeIds = offers
//     //             .filter(o => o.distance > radiusKm)
//     //             .map(o => o.id);

//     //         dispatch(removeOutOfRangeOffers(outOfRangeIds));
//     //     }
//     // }, [radiusKm, offers, dispatch]);


//     const filteredOffers = useMemo(() => {
//         if (!userLocation) return [];
//         return offers.filter(offer => {
//             const distance = getDistanceInMeters(userLocation, offer.coordinates);
//             console.log("🚀 ~ LiveOffersScreen ~ distance:", distance <= radiusKm * 1000)
//             return distance <= radiusKm * 1000;
//         });
//     }, [offers, userLocation, radiusKm]);
//     console.log("🚀 ~ LiveOffersScreen ~ filteredOffers:", filteredOffers)


//     // ===== VENDOR MOVEMENT SIMULATION (FIXED - SIMILAR TO OLD CODE) =====
//     useEffect(() => {
//         // Only run if we have an accepted offer and user location
//         if (!acceptedOffer || !userLocation || !vendorLocalState || vendorArrived) {
//             return;
//         }

//         // Reset arrival state
//         setVendorArrived(false);

//         // Movement simulation loop
//         const movementInterval = setInterval(() => {
//             setVendorLocalState((prevState) => {
//                 if (!prevState) return null;

//                 // Simulate vendor moving toward user
//                 const newLocation = simulateVendorMovement(
//                     prevState.currentLocation,
//                     userLocation,
//                     0.0002
//                 );

//                 // Calculate distance moved from previous position
//                 const distanceMoved = getDistanceInMeters(prevState.currentLocation, newLocation);
//                 const totalDistanceMoved = prevState.distanceMoved + distanceMoved;

//                 // Calculate distance to user
//                 const distanceToCustomer = getDistanceInMeters(newLocation, userLocation);
//                 // const eta = calculateETARemaining(distanceToUser / 1000);
//                 if (distanceToCustomer == 0) {
//                     console.log("✅ Vendor arrived at destination");
//                     sendLocalNotification("Vendor Arrived", `${acceptedOffer.name} has reached your location!`);
//                     setVendorArrived(true);
//                     clearInterval(movementInterval);
//                     // if (movementInterval) {
//                     //     clearInterval(movementInterval);
//                     // }
//                 }
//                 // DISPATCH EVERY 50 METERS (or when closer than 100m)
//                 if (totalDistanceMoved >= 50 || distanceToCustomer < 100) {
//                     console.log(`✓ DISPATCH at ${totalDistanceMoved.toFixed(0)}m - Distance to user: ${distanceToCustomer.toFixed(0)}m`);
//                     // const distanceToDestination = getDistanceInMeters(userLocation, newLocation);
//                     dispatch(
//                         updateVendorLocation({
//                             id: acceptedOffer.id,
//                             coordinates: newLocation,
//                             distance: Number((distanceToCustomer / 1000).toFixed(2)),
//                             eta: Math.max(Math.round(distanceToCustomer / 250), 1),
//                         })
//                     );

//                     // Reset distance counter after dispatch
//                     return {
//                         currentLocation: newLocation,
//                         lastDistanceReportedAt: Date.now(),
//                         distanceMoved: 0, // Reset counter after 50m
//                     };
//                 }
//                 updateRouteIfNeeded(newLocation);


//                 // Update local state without dispatching
//                 console.log(`~ Moving: ${totalDistanceMoved.toFixed(0)}m total, ${distanceToCustomer.toFixed(0)}m to user`);

//                 return {
//                     currentLocation: newLocation,
//                     lastDistanceReportedAt: prevState.lastDistanceReportedAt,
//                     distanceMoved: totalDistanceMoved,
//                 };
//             });
//         }, 2000);
//         return () => clearInterval(movementInterval);
//         // movementIntervalRef.current = setInterval(() => {
//         //     console.log("🔄 Movement interval tick");

//         //     // CRITICAL: Read current vendor position from acceptedOffer in closure
//         //     // This works because acceptedOffer is in the dependency array,
//         //     // so the effect re-runs when Redux updates it
//         //     const currentVendorPos = acceptedOffer.coordinates;

//         //     console.log("📍 Current positions:", {
//         //         vendor: currentVendorPos,
//         //         user: userLocation,
//         //     });

//         //     // Simulate movement towards user
//         //     const newLocation = simulateVendorMovement(
//         //         currentVendorPos,
//         //         userLocation,
//         //         MOVEMENT_SPEED
//         //     );

//         //     // Calculate distances
//         //     const moved = getDistanceInMeters(currentVendorPos, newLocation);
//         //     const distanceToDestination = getDistanceInMeters(userLocation, newLocation);

//         //     console.log("📊 Movement data:", {
//         //         moved: moved.toFixed(2) + "m",
//         //         distanceToUser: distanceToDestination.toFixed(2) + "m",
//         //         newLocation,
//         //     });

//         //     // Update Redux state
//         //     dispatch(
//         //         updateVendorLocation({
//         //             id: acceptedOffer.id,
//         //             coordinates: newLocation,
//         //             distance: Number((distanceToDestination / 1000).toFixed(2)),
//         //             eta: Math.max(Math.round(distanceToDestination / 250), 1),
//         //         })
//         //     );

//         //     // Update local UI state
//         //     setDistanceToUser(distanceToDestination);

//         //     // Update route if vendor moved significantly
//         //     updateRouteIfNeeded(newLocation);

//         //     // Check if vendor arrived
//         //     if (distanceToDestination <= ARRIVAL_THRESHOLD_METERS) {
//         //         console.log("✅ Vendor arrived at destination");
//         //         setVendorArrived(true);

//         //         if (movementIntervalRef.current) {
//         //             clearInterval(movementIntervalRef.current);
//         //             movementIntervalRef.current = null;
//         //         }
//         //     }
//         // }, MOVEMENT_INTERVAL_MS);

//         // CRITICAL: Cleanup when effect re-runs or unmounts
//         // return () => {
//         //     console.log("🧹 Cleaning up vendor movement interval");
//         //     if (movementIntervalRef.current) {
//         //         clearInterval(movementIntervalRef.current);
//         //         movementIntervalRef.current = null;
//         //     }
//         // };
//     }, [acceptedOffer, userLocation, dispatch, getDistanceInMeters, updateRouteIfNeeded, vendorLocalState]);
//     // ☝️ acceptedOffer (full object) as dependency - this makes it re-run when coordinates update

//     // ===== CANCEL REQUEST =====
//     const handleCancelRequest = useCallback(() => {
//         dispatch(cancelRequest());
//         router.back();
//     }, [dispatch, router]);

//     // ===== RENDER MARKERS =====
//     const renderMarkers = useMemo(() => {
//         if (!userLocation) return null;
//         const markers: React.ReactNode[] = [];

//         // User marker
//         markers.push(
//             <Marker key="user" coordinate={userLocation} title="Your Location">
//                 <View style={styles.userMarker}>
//                     <MapPin size={24} color="#fff" />
//                 </View>
//             </Marker>
//         );

//         // Vendor markers
//         if (acceptedOffer) {
//             markers.push(
//                 <Marker
//                     key={acceptedOffer.id}
//                     coordinate={acceptedOffer.coordinates}
//                     title={`${acceptedOffer.name} (Accepted)`}
//                 >
//                     <View style={styles.acceptedVendorMarker}>
//                         <User size={24} color="#fff" />
//                     </View>
//                 </Marker>
//             );
//         } else {
//             filteredOffers.forEach((o) => {
//                 markers.push(
//                     <Marker key={o.id} coordinate={o.coordinates} title={o.name}>
//                         <View style={styles.vendorMarker}>
//                             <User size={20} color="#fff" />
//                         </View>
//                     </Marker>
//                 );
//             });
//         }

//         return markers;
//     }, [userLocation, offers, acceptedOffer]);

//     // ===== CLEANUP ON STOP RECEIVING =====
//     useEffect(() => {
//         if (!isReceivingOffers) {
//             if (generateIntervalRef.current) {
//                 clearInterval(generateIntervalRef.current);
//                 generateIntervalRef.current = null;
//             }
//             if (movementIntervalRef.current) {
//                 clearInterval(movementIntervalRef.current);
//                 movementIntervalRef.current = null;
//             }
//         }
//     }, [isReceivingOffers]);

//     // ===== LOADING STATE =====
//     if (locationLoading) {
//         return (
//             <View style={styles.centerContainer}>
//                 <ActivityIndicator size="large" color="#007AFF" />
//                 <Text style={styles.loadingText}>Getting your location...</Text>
//             </View>
//         );
//     }

//     // ===== ERROR STATE =====
//     if (locationError || !userLocation) {
//         return (
//             <View style={styles.centerContainer}>
//                 <Text style={styles.errorText}>
//                     {locationError || "Location unavailable"}
//                 </Text>
//                 <TouchableOpacity style={styles.retryButton} onPress={getUserLocation}>
//                     <Text style={styles.retryButtonText}>Retry</Text>
//                 </TouchableOpacity>
//             </View>
//         );
//     }


//     // ===== RADIUS SLIDER UI =====
//     const radiusSelector = (
//         <View style={styles.radiusContainer}>
//             <Text style={styles.radiusLabel}>Search Radius: {radiusKm.toFixed(1)} km</Text>
//             <Slider
//                 value={radiusKm}
//                 onValueChange={handleRadiusChange}
//                 minimumValue={1}
//                 maximumValue={20}
//                 step={0.5}
//                 minimumTrackTintColor="#007AFF"
//                 maximumTrackTintColor="#ccc"
//                 thumbTintColor="#007AFF"
//             />
//         </View>
//     );


//     // ===== MAIN RENDER =====
//     return (
//         <GestureHandlerRootView style={styles.container}>
//             {radiusSelector}
//             <RatingModal
//                 visible={showRatingModal}
//                 onClose={() => setShowRatingModal(false)}
//             />
//             <MapView
//                 ref={(r) => (mapRef.current = r)}
//                 style={styles.map}
//                 provider={PROVIDER_DEFAULT}
//                 initialRegion={{
//                     ...userLocation,
//                     latitudeDelta: 0.05,
//                     longitudeDelta: 0.05,
//                 }}
//             >
//                 {Platform.OS === "web" && (
//                     <UrlTile
//                         urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//                         maximumZ={19}
//                     />
//                 )}
//                 {routeCoords?.length > 0 && (
//                     <Polyline
//                         coordinates={routeCoords}
//                         strokeColor="#007AFF"
//                         strokeWidth={4}
//                     />
//                 )}
//                 {renderMarkers}
//             </MapView>
//             {/* <View style={styles.radiusSelector}>
//                 {radiusOptions.map((r) => (
//                     <TouchableOpacity
//                         key={r}
//                         style={[
//                             styles.radiusButton,
//                             radiusKm === r && styles.radiusButtonActive,
//                         ]}
//                         onPress={() => setRadiusKm(r)}
//                     >
//                         <Text style={radiusKm === r ? styles.radiusTextActive : styles.radiusText}>
//                             {r} km
//                         </Text>
//                     </TouchableOpacity>
//                 ))}
//             </View> */}

//             <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRequest}>
//                 <X size={20} color="#fff" />
//                 <Text style={styles.cancelButtonText}>Cancel Request</Text>
//             </TouchableOpacity>

//             <BottomSheet
//                 ref={(r) => (bottomSheetRef.current = r)}
//                 index={1}
//                 snapPoints={acceptedOffer ? ["25%", "40%"] : ["25%", "60%"]}
//                 enablePanDownToClose={false}
//             >
//                 <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
//                     {acceptedOffer ? (
//                         <View>
//                             <Text style={styles.sheetTitle}>Vendor on the way</Text>
//                             <VendorOfferCard offer={acceptedOffer} isAccepted />
//                             <View style={styles.statusContainer}>
//                                 {!vendorArrived ? (
//                                     <>
//                                         <ActivityIndicator size="small" color="#007AFF" />
//                                         <View style={{ flex: 1 }}>
//                                             <Text style={styles.statusText}>
//                                                 {acceptedOffer.name} is heading to your location...
//                                             </Text>
//                                             {distanceToUser !== null && (
//                                                 <Text style={styles.statusTextSmall}>
//                                                     {Math.round(distanceToUser)} m away • ETA {acceptedOffer.eta} min
//                                                 </Text>
//                                             )}
//                                         </View>
//                                     </>
//                                 ) : (
//                                     <View style={{ flex: 1 }}>
//                                         <Text style={[styles.statusText, { color: "#22c55e" }]}>
//                                             ✓ {acceptedOffer.name} has arrived!
//                                         </Text>
//                                         <TouchableOpacity
//                                             style={[styles.arrivedButton, { backgroundColor: "#34D399" }]}
//                                             onPress={() => setShowRatingModal(true)}
//                                         >
//                                             <Text style={styles.arrivedButtonText}>Mark as Complete</Text>
//                                         </TouchableOpacity>
//                                     </View>
//                                 )}
//                             </View>
//                         </View>
//                     ) : (
//                         <View>
//                             <Text style={styles.sheetTitle}>
//                                 {offers.length === 0
//                                     ? "Waiting for offers..."
//                                     : `${offers.length} Offers Received`}
//                             </Text>

//                             {offers.length === 0 ? (
//                                 <View style={styles.emptyState}>
//                                     <ActivityIndicator size="large" color="#007AFF" />
//                                     <Text style={styles.emptyText}>
//                                         Nearby vendors are reviewing your request
//                                     </Text>
//                                 </View>
//                             ) : (
//                                 <OffersList
//                                     offers={filteredOffers}
//                                     onAccept={handleAcceptOffer}
//                                     onExpire={(id) => dispatch(removeOffersByIds(id))}
//                                 />
//                             )}
//                         </View>
//                     )}
//                 </BottomSheetScrollView>
//             </BottomSheet>
//         </GestureHandlerRootView >
//     );
// }

// // ===== STYLES =====
// const styles = StyleSheet.create({
//     container: { flex: 1 },
//     map: { flex: 1 },
//     centerContainer: {
//         flex: 1,
//         justifyContent: "center",
//         alignItems: "center",
//         backgroundColor: "#fff",
//         padding: 20,
//     },
//     loadingText: { marginTop: 16, fontSize: 16, color: "#666" },
//     errorText: { fontSize: 16, color: "#FF3B30", textAlign: "center", marginBottom: 20 },
//     retryButton: {
//         backgroundColor: "#007AFF",
//         paddingHorizontal: 24,
//         paddingVertical: 12,
//         borderRadius: 8,
//     },
//     retryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
//     userMarker: {
//         width: 40,
//         height: 40,
//         borderRadius: 20,
//         backgroundColor: "#007AFF",
//         justifyContent: "center",
//         alignItems: "center",
//         borderWidth: 3,
//         borderColor: "#fff",
//         elevation: 5,
//     },
//     vendorMarker: {
//         width: 36,
//         height: 36,
//         borderRadius: 18,
//         backgroundColor: "#00A86B",
//         justifyContent: "center",
//         alignItems: "center",
//         borderWidth: 2,
//         borderColor: "#fff",
//         elevation: 5,
//     },
//     acceptedVendorMarker: {
//         width: 44,
//         height: 44,
//         borderRadius: 22,
//         backgroundColor: "#FF9500",
//         justifyContent: "center",
//         alignItems: "center",
//         borderWidth: 3,
//         borderColor: "#fff",
//         elevation: 5,
//     },
//     cancelButton: {
//         position: "absolute",
//         top: 50,
//         left: 16,
//         right: 16,
//         backgroundColor: "#FF3B30",
//         flexDirection: "row",
//         alignItems: "center",
//         justifyContent: "center",
//         paddingVertical: 12,
//         borderRadius: 12,
//         elevation: 5,
//         gap: 8,
//     },
//     cancelButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
//     bottomSheetContent: { padding: 16, paddingBottom: 40 },
//     sheetTitle: { fontSize: 20, fontWeight: "700", color: "#000", marginBottom: 16 },
//     emptyState: { alignItems: "center", paddingVertical: 40 },
//     emptyText: { marginTop: 16, fontSize: 16, color: "#666", textAlign: "center" },
//     statusContainer: {
//         flexDirection: "row",
//         alignItems: "center",
//         marginTop: 16,
//         padding: 16,
//         backgroundColor: "#F0F8FF",
//         borderRadius: 12,
//         gap: 12,
//     },
//     statusText: { fontSize: 14, color: "#007AFF", fontWeight: "600" },
//     statusTextSmall: { fontSize: 13, color: "#666", marginTop: 4 },
//     radiusSelector: {
//         position: "absolute",
//         top: 100,
//         left: 16,
//         right: 16,
//         flexDirection: "row",
//         justifyContent: "space-around",
//         backgroundColor: "#fff",
//         padding: 8,
//         borderRadius: 12,
//         elevation: 5,
//         zIndex: 10,
//     },
//     radiusButton: {
//         paddingHorizontal: 12,
//         paddingVertical: 6,
//         borderRadius: 8,
//         backgroundColor: "#f0f0f0",
//     },
//     radiusButtonActive: {
//         backgroundColor: "#007AFF",
//     },
//     radiusText: { color: "#333", fontWeight: "600" },
//     radiusTextActive: { color: "#fff", fontWeight: "700" },
//     radiusContainer: {
//         position: "absolute",
//         top: 100,
//         left: 16,
//         right: 16,
//         backgroundColor: "#fff",
//         padding: 16,
//         borderRadius: 12,
//         elevation: 5,
//         zIndex: 10,
//     },
//     radiusLabel: {
//         fontSize: 16,
//         fontWeight: "600",
//         marginBottom: 8,
//         color: "#333",
//     },
//     arrivedButton: {
//         backgroundColor: "#007AFF",
//         borderRadius: 10,
//         paddingVertical: 12,
//         alignItems: "center",
//         marginTop: 16,
//     },
//     arrivedButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },


// });
