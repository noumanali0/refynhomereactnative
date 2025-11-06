import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { MapPin, X, User } from "lucide-react-native";

import {
    startReceivingOffers,
    addOffer,
    acceptOffer,
    cancelRequest,
    updateVendorLocation,
    VendorOffer,
} from "../../src/store/slices/offersSlice";
import { RootState } from "../../src/store";
import { useBackHandlerExit } from "../../src/hooks/useBackHandlerExit";
import { generateRandomOffer, simulateVendorMovement } from "../../src/utils/mockOffers";
import { VendorOfferCard } from "../../src/components/customer/VendorOfferCard";






export default function LiveOffersScreen() {
    const router = useRouter();
    const dispatch = useDispatch();
    const mapRef = useRef<MapView>(null);
    const bottomSheetRef = useRef<BottomSheet>(null);

    const { offers, acceptedOffer, isReceivingOffers } = useSelector(
        (state: RootState) => state.offers
    );

    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
        null
    );
    const [locationLoading, setLocationLoading] = useState(true);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);

    useBackHandlerExit();

    /** 🧭 Fetch User Location */
    const getUserLocation = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") throw new Error("Location permission denied");

            const { coords } = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const userCoords = { latitude: coords.latitude, longitude: coords.longitude };
            setUserLocation(userCoords);
            dispatch(startReceivingOffers());

            mapRef.current?.animateToRegion({
                ...userCoords,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            });
        } catch (error: any) {
            setLocationError(error.message || "Failed to get location");
        } finally {
            setLocationLoading(false);
        }
    }, [dispatch]);

    const fetchRoute = async (start, end) => {
        try {
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`
            );
            const data = await response.json();

            if (data?.routes?.length) {
                const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({
                    latitude: lat,
                    longitude: lng,
                }));
                return coords;
            }
            return [start, end];
        } catch (error) {
            console.warn('Failed to fetch route:', error);
            return [start, end];
        }
    };


    // const getDistanceInMeters = (coord1, coord2) => {
    //     const toRad = (value) => (value * Math.PI) / 180;
    //     const R = 6371e3; // Earth radius in meters
    //     const dLat = toRad(coord2.latitude - coord1.latitude);
    //     const dLon = toRad(coord2.longitude - coord1.longitude);
    //     const lat1 = toRad(coord1.latitude);
    //     const lat2 = toRad(coord2.latitude);

    //     const a =
    //         Math.sin(dLat / 2) ** 2 +
    //         Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    //     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    //     return R * c; // in meters
    // };

    // useEffect(() => {
    //     if (!acceptedOffer || !userLocation) return;

    //     let lastVendorCoord = acceptedOffer.coordinates; // keep previous coord

    //     const interval = setInterval(async () => {
    //         const distance = getDistanceInMeters(
    //             lastVendorCoord,
    //             acceptedOffer.coordinates
    //         );

    //         // ✅ Only update route if vendor moved > 50 meters
    //         if (distance > 50) {
    //             const newRoute = await fetchRoute(userLocation, acceptedOffer.coordinates);
    //             setRouteCoords(newRoute);

    //             mapRef.current?.fitToCoordinates(newRoute, {
    //                 edgePadding: { top: 100, right: 100, bottom: 400, left: 100 },
    //                 animated: true,
    //             });

    //             lastVendorCoord = acceptedOffer.coordinates;
    //         }
    //     }, 3000); // check every 3 seconds

    //     return () => clearInterval(interval);
    // }, [acceptedOffer, userLocation]);

    /** 🎯 On Mount — Fetch Location */
    useEffect(() => {
        getUserLocation();
    }, [getUserLocation]);

    /** 🧩 Simulate Offers (Mock) */
    useEffect(() => {
        if (!userLocation || !isReceivingOffers) return;
        const interval = setInterval(() => {
            dispatch(addOffer(generateRandomOffer(userLocation)));
        }, 4000);
        return () => clearInterval(interval);
    }, [userLocation, isReceivingOffers, dispatch]);

    /** 🚗 Simulate Vendor Movement */
    useEffect(() => {
        if (!acceptedOffer || !userLocation) return;
        const interval = setInterval(() => {
            const newLocation = simulateVendorMovement(
                acceptedOffer.coordinates,
                userLocation,
                0.0002
            );
            dispatch(updateVendorLocation({ id: acceptedOffer.id, coordinates: newLocation }));
        }, 2000);
        return () => clearInterval(interval);
    }, [acceptedOffer, userLocation, dispatch]);

    const handleAcceptOffer = useCallback(async (offer: VendorOffer) => {
        dispatch(acceptOffer(offer));

        if (userLocation) {
            const route = await fetchRoute(userLocation, offer.coordinates);
            setRouteCoords(route);

            // optional: zoom out to fit the whole route
            mapRef.current?.fitToCoordinates(route, {
                edgePadding: { top: 100, right: 100, bottom: 400, left: 100 },
                animated: true,
            });
        }

        bottomSheetRef.current?.snapToIndex(0);
    }, [dispatch, userLocation]);



    //   /** ✅ Accept Offer */
    //   const handleAcceptOffer = useCallback(
    //     (offer: VendorOffer) => {
    //       dispatch(acceptOffer(offer));
    //       if (userLocation) {
    //         setRouteCoords([userLocation, offer.coordinates]);
    //       }
    //       bottomSheetRef.current?.snapToIndex(0);
    //     },
    //     [dispatch, userLocation]
    //   );

    /** ❌ Cancel Request */
    const handleCancelRequest = useCallback(() => {
        dispatch(cancelRequest());
        router.back();
    }, [dispatch, router]);

    /** 🧭 Render Markers — Memoized for Performance */
    const renderMarkers = useMemo(() => {
        if (!userLocation) return null;

        const markers = [];

        // User marker
        markers.push(
            <Marker key="user" coordinate={userLocation} title="Your Location">
                <View style={styles.userMarker}>
                    <MapPin size={24} color="#fff" />
                </View>
            </Marker>
        );

        // Vendor markers
        if (acceptedOffer) {
            markers.push(
                <Marker
                    key={acceptedOffer.id}
                    coordinate={acceptedOffer.coordinates}
                    title={`${acceptedOffer.name} (Accepted)`}
                >
                    <View style={styles.acceptedVendorMarker}>
                        <User size={24} color="#fff" />
                    </View>
                </Marker>
            );
        } else {
            offers.forEach((offer) =>
                markers.push(
                    <Marker key={offer.id} coordinate={offer.coordinates} title={offer.name}>
                        <View style={styles.vendorMarker}>
                            <User size={20} color="#fff" />
                        </View>
                    </Marker>
                )
            );
        }

        return markers;
    }, [userLocation, offers, acceptedOffer]);

    /** 🧩 Loading / Error States */
    if (locationLoading) {
        return (
            <LoaderScreen message="Getting your location..." />
        );
    }

    if (locationError || !userLocation) {
        return (
            <ErrorScreen message={locationError || "Location unavailable"} onRetry={getUserLocation} />
        );
    }

    /** 🗺️ Main Screen Render */
    return (
        <GestureHandlerRootView style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={{
                    ...userLocation,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
            >
                {Platform.OS === "web" && (
                    <UrlTile urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
                )}
                {routeCoords.length > 0 && (
                    <Polyline coordinates={routeCoords} strokeColor="#007AFF" strokeWidth={4} />
                )}
                {renderMarkers}
            </MapView>

            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRequest}>
                <X size={20} color="#fff" />
                <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>

            <BottomSheet
                ref={bottomSheetRef}
                index={1}
                snapPoints={acceptedOffer ? ["25%", "40%"] : ["25%", "60%"]}
                enablePanDownToClose={false}
            >
                <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
                    {acceptedOffer ? (
                        <AcceptedOfferSection acceptedOffer={acceptedOffer} />
                    ) : (
                        <OffersList offers={offers} onAccept={handleAcceptOffer} />
                    )}
                </BottomSheetScrollView>
            </BottomSheet>
        </GestureHandlerRootView>
    );
}

/** 🧩 Loader Component */
const LoaderScreen = ({ message }: { message: string }) => (
    <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{message}</Text>
    </View>
);

/** 🧩 Error Component */
const ErrorScreen = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
    </View>
);

/** 🧩 Offers List Section */
const OffersList = ({ offers, onAccept }: { offers: VendorOffer[]; onAccept: (offer: VendorOffer) => void }) => (
    <View>
        <Text style={styles.sheetTitle}>
            {offers.length === 0 ? "Waiting for offers..." : `${offers.length} Offers Received`}
        </Text>
        {offers.length === 0 ? (
            <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.emptyText}>Nearby vendors are reviewing your request</Text>
            </View>
        ) : (
            offers.map((offer) => <VendorOfferCard key={offer.id} offer={offer} onAccept={onAccept} />)
        )}
    </View>
);

/** 🧩 Accepted Offer Section */
const AcceptedOfferSection = ({ acceptedOffer }: { acceptedOffer: VendorOffer }) => (
    <View>
        <Text style={styles.sheetTitle}>Vendor on the way</Text>
        <VendorOfferCard offer={acceptedOffer} onAccept={() => { }} />
        <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.statusText}>{acceptedOffer.name} is heading to your location...</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 20,
    },
    loadingText: { marginTop: 16, fontSize: 16, color: "#666" },
    errorText: { fontSize: 16, color: "#FF3B30", textAlign: "center", marginBottom: 20 },
    retryButton: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    userMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#007AFF",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#fff",
        elevation: 5,
    },
    vendorMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#00A86B",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#fff",
        elevation: 5,
    },
    acceptedVendorMarker: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#FF9500",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#fff",
        elevation: 5,
    },
    cancelButton: {
        position: "absolute",
        top: 50,
        left: 16,
        right: 16,
        backgroundColor: "#FF3B30",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 12,
        elevation: 5,
        gap: 8,
    },
    cancelButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    bottomSheetContent: { padding: 16, paddingBottom: 40 },
    sheetTitle: { fontSize: 20, fontWeight: "700", color: "#000", marginBottom: 16 },
    emptyState: { alignItems: "center", paddingVertical: 40 },
    emptyText: { marginTop: 16, fontSize: 16, color: "#666", textAlign: "center" },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 16,
        padding: 16,
        backgroundColor: "#F0F8FF",
        borderRadius: 12,
        gap: 12,
    },
    statusText: { flex: 1, fontSize: 14, color: "#007AFF" },
});




// import React, { useEffect, useRef, useState, useCallback } from 'react';
// import {
//     View,
//     Text,
//     StyleSheet,
//     TouchableOpacity,
//     ScrollView,
//     ActivityIndicator,
//     Platform,
// } from 'react-native';
// import MapView, { Marker, PROVIDER_DEFAULT, UrlTile, Polyline } from 'react-native-maps';
// import * as Location from 'expo-location';
// import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import { useRouter } from 'expo-router';
// import { useDispatch, useSelector } from 'react-redux';
// import { MapPin, X, Navigation, User } from 'lucide-react-native';
// // import MapView, { Marker,  } from "react-native-maps";

// // import { VendorOfferCard } from '@/components/VendorOfferCard';
// // import { useBackHandlerExit } from '@/hooks/useBackHandlerExit';
// // import { generateRandomOffer, simulateVendorMovement } from '@/utils';
// import {
//     startReceivingOffers,
//     addOffer,
//     acceptOffer,
//     cancelRequest,
//     updateVendorLocation,
//     VendorOffer,
// } from '../../src/store/slices/offersSlice';
// import { RootState } from '../../src/store';
// import { useBackHandlerExit } from '../../src/hooks/useBackHandlerExit';
// import { generateRandomOffer, simulateVendorMovement } from '../../src/utils/mockOffers';
// import { VendorOfferCard } from '../../src/components/customer/VendorOfferCard';
// // import type { RootState } from '@/redux/store';

// export default function LiveOffersScreen() {
//     const router = useRouter();
//     const dispatch = useDispatch();
//     const mapRef = useRef<MapView>(null);
//     const bottomSheetRef = useRef<BottomSheet>(null);

//     const { offers, acceptedOffer, isReceivingOffers } = useSelector(
//         (state: RootState) => state.offers
//     );

//     const [userLocation, setUserLocation] = useState<{
//         latitude: number;
//         longitude: number;
//     } | null>(null);
//     const [locationLoading, setLocationLoading] = useState(true);
//     const [locationError, setLocationError] = useState<string | null>(null);
//     const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);

//     useBackHandlerExit();

//     useEffect(() => {
//         getUserLocation();
//     }, []);

//     const getUserLocation = async () => {
//         try {
//             const { status } = await Location.requestForegroundPermissionsAsync();

//             if (status !== 'granted') {
//                 setLocationError('Location permission denied');
//                 setLocationLoading(false);
//                 return;
//             }

//             const location = await Location.getCurrentPositionAsync({
//                 accuracy: Location.Accuracy.High,
//             });

//             const userCoords = {
//                 latitude: location.coords.latitude,
//                 longitude: location.coords.longitude,
//             };

//             setUserLocation(userCoords);
//             setLocationLoading(false);

//             dispatch(startReceivingOffers());

//             mapRef.current?.animateToRegion({
//                 latitude: userCoords.latitude,
//                 longitude: userCoords.longitude,
//                 latitudeDelta: 0.05,
//                 longitudeDelta: 0.05,
//             });
//         } catch (error) {
//             setLocationError('Failed to get location');
//             setLocationLoading(false);
//         }
//     };

//     useEffect(() => {
//         if (!userLocation || !isReceivingOffers) return;

//         const interval = setInterval(() => {
//             const newOffer = generateRandomOffer(userLocation);
//             dispatch(addOffer(newOffer));
//         }, 4000);

//         return () => clearInterval(interval);
//     }, [userLocation, isReceivingOffers, dispatch]);

//     useEffect(() => {
//         if (!acceptedOffer || !userLocation) return;

//         const interval = setInterval(() => {
//             const newLocation = simulateVendorMovement(
//                 acceptedOffer.coordinates,
//                 userLocation,
//                 0.0002
//             );

//             dispatch(
//                 updateVendorLocation({
//                     id: acceptedOffer.id,
//                     coordinates: newLocation,
//                 })
//             );
//         }, 2000);

//         return () => clearInterval(interval);
//     }, [acceptedOffer, userLocation, dispatch]);

//     const handleAcceptOffer = useCallback((offer: VendorOffer) => {
//         dispatch(acceptOffer(offer));

//         if (userLocation) {
//             setRouteCoords([
//                 userLocation,           // start
//                 offer.coordinates,      // end
//             ]);
//         }

//         bottomSheetRef.current?.snapToIndex(0);
//     }, [dispatch, userLocation]);

//     // const handleAcceptOffer = useCallback(
//     //     (offer: VendorOffer) => {
//     //         dispatch(acceptOffer(offer));
//     //         bottomSheetRef.current?.snapToIndex(0);
//     //     },
//     //     [dispatch]
//     // );

//     const handleCancelRequest = useCallback(() => {
//         dispatch(cancelRequest());
//         router.back();
//     }, [dispatch, router]);

//     if (locationLoading) {
//         return (
//             <View style={styles.centerContainer}>
//                 <ActivityIndicator size="large" color="#007AFF" />
//                 <Text style={styles.loadingText}>Getting your location...</Text>
//             </View>
//         );
//     }

//     if (locationError || !userLocation) {
//         return (
//             <View style={styles.centerContainer}>
//                 <Text style={styles.errorText}>{locationError || 'Location unavailable'}</Text>
//                 <TouchableOpacity style={styles.retryButton} onPress={getUserLocation}>
//                     <Text style={styles.retryButtonText}>Retry</Text>
//                 </TouchableOpacity>
//             </View>
//         );
//     }

//     return (
//         <GestureHandlerRootView style={styles.container}>
//             <MapView
//                 ref={mapRef}
//                 style={styles.map}
//                 provider={PROVIDER_DEFAULT}
//                 initialRegion={{
//                     latitude: userLocation.latitude,
//                     longitude: userLocation.longitude,
//                     latitudeDelta: 0.05,
//                     longitudeDelta: 0.05,
//                 }}
//             >
//                 {routeCoords.length > 0 && (
//                     <Polyline
//                         coordinates={routeCoords}
//                         strokeColor="#007AFF"
//                         strokeWidth={4}
//                         lineDashPattern={[1]} // optional for dashed line
//                     />
//                 )}
//                 {Platform.OS === 'web' && (
//                     <UrlTile
//                         urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//                         maximumZ={19}
//                         flipY={false}
//                     />
//                 )}

//                 <Marker coordinate={userLocation} title="Your Location">
//                     <View style={styles.userMarker}>
//                         <MapPin size={24} color="#fff" fill="#007AFF" />
//                     </View>
//                 </Marker>
//                 {!acceptedOffer
//                     ? // Show all vendor markers when no offer is accepted
//                     offers.map((offer) => (
//                         <Marker key={offer.id} coordinate={offer.coordinates} title={offer.name}>
//                             <View style={styles.vendorMarker}>
//                                 <User size={20} color="#fff" />
//                             </View>
//                         </Marker>
//                     ))
//                     : // Show only the accepted vendor marker
//                     (
//                         <Marker
//                             coordinate={acceptedOffer.coordinates}
//                             title={`${acceptedOffer.name} (Accepted)`}
//                         >
//                             <View style={styles.acceptedVendorMarker}>
//                                 <User size={24} color="#fff" />
//                             </View>
//                         </Marker>
//                     )}
//                 {/* {offers.map((offer) => (
//                     <Marker key={offer.id} coordinate={offer.coordinates} title={offer.name}>
//                         <View style={styles.vendorMarker}>
//                             <Navigation size={20} color="#fff" />
//                         </View>
//                     </Marker>
//                 ))} */}

//                 {acceptedOffer && (
//                     <Marker
//                         coordinate={acceptedOffer.coordinates}
//                         title={`${acceptedOffer.name} (On the way)`}
//                     >
//                         <View style={styles.acceptedVendorMarker}>
//                             <User size={24} color="#fff" />
//                         </View>
//                     </Marker>
//                 )}
//             </MapView>

//             <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRequest}>
//                 <X size={20} color="#fff" />
//                 <Text style={styles.cancelButtonText}>Cancel Request</Text>
//             </TouchableOpacity>

//             <BottomSheet
//                 ref={bottomSheetRef}
//                 index={1}
//                 snapPoints={acceptedOffer ? ['25%', '40%'] : ['25%', '60%']}
//                 enablePanDownToClose={false}
//             >
//                 <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
//                     {acceptedOffer ? (
//                         <View>
//                             <Text style={styles.sheetTitle}>Vendor on the way</Text>
//                             <VendorOfferCard offer={acceptedOffer} onAccept={() => { }} />
//                             <View style={styles.statusContainer}>
//                                 <ActivityIndicator size="small" color="#007AFF" />
//                                 <Text style={styles.statusText}>
//                                     {acceptedOffer.name} is heading to your location...
//                                 </Text>
//                             </View>
//                         </View>
//                     ) : (
//                         <View>
//                             <Text style={styles.sheetTitle}>
//                                 {offers.length === 0 ? 'Waiting for offers...' : `${offers.length} Offers Received`}
//                             </Text>

//                             {offers.length === 0 ? (
//                                 <View style={styles.emptyState}>
//                                     <ActivityIndicator size="large" color="#007AFF" />
//                                     <Text style={styles.emptyText}>
//                                         Nearby vendors are reviewing your request
//                                     </Text>
//                                 </View>
//                             ) : (
//                                 offers.map((offer) => (
//                                     <VendorOfferCard key={offer.id} offer={offer} onAccept={handleAcceptOffer} />
//                                 ))
//                             )}
//                         </View>
//                     )}
//                 </BottomSheetScrollView>
//             </BottomSheet>
//         </GestureHandlerRootView>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//     },
//     map: {
//         flex: 1,
//     },
//     centerContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         backgroundColor: '#fff',
//         padding: 20,
//     },
//     loadingText: {
//         marginTop: 16,
//         fontSize: 16,
//         color: '#666',
//     },
//     errorText: {
//         fontSize: 16,
//         color: '#FF3B30',
//         textAlign: 'center',
//         marginBottom: 20,
//     },
//     retryButton: {
//         backgroundColor: '#007AFF',
//         paddingHorizontal: 24,
//         paddingVertical: 12,
//         borderRadius: 8,
//     },
//     retryButtonText: {
//         color: '#fff',
//         fontSize: 16,
//         fontWeight: '600',
//     },
//     userMarker: {
//         width: 40,
//         height: 40,
//         borderRadius: 20,
//         backgroundColor: '#007AFF',
//         justifyContent: 'center',
//         alignItems: 'center',
//         borderWidth: 3,
//         borderColor: '#fff',
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.3,
//         shadowRadius: 4,
//         elevation: 5,
//     },
//     vendorMarker: {
//         width: 36,
//         height: 36,
//         borderRadius: 18,
//         backgroundColor: '#00A86B',
//         justifyContent: 'center',
//         alignItems: 'center',
//         borderWidth: 2,
//         borderColor: '#fff',
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.3,
//         shadowRadius: 4,
//         elevation: 5,
//     },
//     acceptedVendorMarker: {
//         width: 44,
//         height: 44,
//         borderRadius: 22,
//         backgroundColor: '#FF9500',
//         justifyContent: 'center',
//         alignItems: 'center',
//         borderWidth: 3,
//         borderColor: '#fff',
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.3,
//         shadowRadius: 4,
//         elevation: 5,
//     },
//     cancelButton: {
//         position: 'absolute',
//         top: 50,
//         left: 16,
//         right: 16,
//         backgroundColor: '#FF3B30',
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         paddingVertical: 12,
//         paddingHorizontal: 20,
//         borderRadius: 12,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.25,
//         shadowRadius: 4,
//         elevation: 5,
//         gap: 8,
//     },
//     cancelButtonText: {
//         color: '#fff',
//         fontSize: 16,
//         fontWeight: '600',
//     },
//     bottomSheetContent: {
//         padding: 16,
//         paddingBottom: 40,
//     },
//     sheetTitle: {
//         fontSize: 20,
//         fontWeight: '700',
//         color: '#000',
//         marginBottom: 16,
//     },
//     emptyState: {
//         alignItems: 'center',
//         paddingVertical: 40,
//     },
//     emptyText: {
//         marginTop: 16,
//         fontSize: 16,
//         color: '#666',
//         textAlign: 'center',
//     },
//     statusContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginTop: 16,
//         padding: 16,
//         backgroundColor: '#F0F8FF',
//         borderRadius: 12,
//         gap: 12,
//     },
//     statusText: {
//         flex: 1,
//         fontSize: 14,
//         color: '#007AFF',
//     },
// });
