// import React, { useEffect, useRef, useState, useCallback } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ActivityIndicator,
//   Platform,
// } from 'react-native';
// import MapView, { Marker, PROVIDER_DEFAULT, UrlTile, Polyline } from 'react-native-maps';
// import * as Location from 'expo-location';
// import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import { useRouter } from 'expo-router';
// import { useDispatch, useSelector } from 'react-redux';
// import { MapPin, X, Navigation } from 'lucide-react-native';
// import { RootState } from '../../src/store';
// import { acceptOffer, addOffer, cancelRequest, Coordinate, startReceivingOffers, updateVendorLocation, VendorOffer } from '../../src/store/slices/offersSlice';
// import { generateRandomOffer, simulateVendorMovement } from '../../src/utils/mockOffers';
// import { VendorOfferCard } from '../../src/components/customer/VendorOfferCard';
// import { useBackHandlerExit } from '../../src/hooks/useBackHandlerExit';

// // import { VendorOfferCard } from '@/components/VendorOfferCard';
// // import { useBackHandlerExit } from '@/hooks/useBackHandlerExit';
// // import {
// //   generateRandomOffer,
// //   simulateVendorMovement,
// //   calculateDistanceRemaining,
// //   calculateETARemaining,
// // } from '@/utils/mockOffers';
// // import {
// //   startReceivingOffers,
// //   addOffer,
// //   acceptOffer,
// //   cancelRequest,
// //   updateVendorLocation,
// //   VendorOffer,
// //   Coordinate,
// // } from '@/redux/offersSlice';
// // import type { RootState } from '@/redux/store';

// interface LocalVendorState {
//   currentLocation: Coordinate;
//   lastDistanceReportedAt: number;
//   distanceMoved: number;
// }

// export default function LiveOffersScreen() {
//   const router = useRouter();
//   const dispatch = useDispatch();
//   const mapRef = useRef<MapView>(null);
//   const bottomSheetRef = useRef<BottomSheet>(null);

//   const { offers, acceptedOffer, isReceivingOffers } = useSelector(
//     (state: RootState) => state.offers
//   );

//   const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
//   const [locationLoading, setLocationLoading] = useState(true);
//   const [locationError, setLocationError] = useState<string | null>(null);
//   const [vendorLocalState, setVendorLocalState] = useState<LocalVendorState | null>(null);
//   const [route, setRoute] = useState<Coordinate[]>([]);

//   useBackHandlerExit();

//   // Haversine distance calculation
//   const getDistanceInMeters = useCallback((from: Coordinate, to: Coordinate): number => {
//     const R = 6371e3;
//     const toRad = (v: number) => (v * Math.PI) / 180;
//     const dLat = toRad(to.latitude - from.latitude);
//     const dLng = toRad(to.longitude - from.longitude);
//     const lat1 = toRad(from.latitude);
//     const lat2 = toRad(to.latitude);
//     const a =
//       Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//       Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     return R * c;
//   }, []);

//   // Get user location
//   const getUserLocation = async () => {
//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         setLocationError('Location permission denied');
//         setLocationLoading(false);
//         return;
//       }

//       const location = await Location.getCurrentPositionAsync({
//         accuracy: Location.Accuracy.High,
//       });

//       const userCoord: Coordinate = {
//         longitude: location.coords.longitude,
//         latitude: location.coords.latitude,
//       };

//       setUserLocation(userCoord);
//       dispatch(startReceivingOffers());
//       setLocationLoading(false);

//       mapRef.current?.animateToRegion({
//         latitude: userCoord.latitude,
//         longitude: userCoord.longitude,
//         latitudeDelta: 0.05,
//         longitudeDelta: 0.05,
//       }, 1000);
//     } catch (error) {
//       setLocationError('Failed to get location');
//       setLocationLoading(false);
//     }
//   };

//   useEffect(() => {
//     getUserLocation();
//   }, []);

//   // Generate mock offers
//   useEffect(() => {
//     if (!userLocation || !isReceivingOffers || acceptedOffer) return;

//     const interval = setInterval(() => {
//       const newOffer = generateRandomOffer(userLocation);
//       dispatch(addOffer(newOffer));
//     }, 4000);

//     return () => clearInterval(interval);
//   }, [userLocation, isReceivingOffers, acceptedOffer, dispatch]);

//   // Handle accept offer
//   const handleAcceptOffer = useCallback(
//     (offer: VendorOffer) => {
//       dispatch(acceptOffer({ offer }));

//       // Initialize local vendor state
//       setVendorLocalState({
//         currentLocation: offer.coordinates,
//         lastDistanceReportedAt: 0,
//         distanceMoved: 0,
//       });

//       // Generate mock route (simple line between vendor and user)
//       if (userLocation) {
//         const mockRoute: Coordinate[] = [];
//         const steps = 20;
//         for (let i = 0; i <= steps; i++) {
//           const t = i / steps;
//           mockRoute.push({
//             latitude: offer.coordinates.latitude + (userLocation.latitude - offer.coordinates.latitude) * t,
//             longitude: offer.coordinates.longitude + (userLocation.longitude - offer.coordinates.longitude) * t,
//           });
//         }
//         setRoute(mockRoute);
//       }

//       bottomSheetRef.current?.snapToIndex(0);
//     },
//     [dispatch, userLocation]
//   );

//   // CRITICAL: Vendor movement with 50-meter dispatch trigger
//   useEffect(() => {
//     if (!acceptedOffer || !userLocation || !vendorLocalState) return;

//     const movementInterval = setInterval(() => {
//       setVendorLocalState((prevState) => {
//         if (!prevState) return null;

//         // Simulate vendor moving toward user
//         const newLocation = simulateVendorMovement(
//           prevState.currentLocation,
//           userLocation,
//           0.0002
//         );

//         // Calculate distance moved from previous position
//         const distanceMoved = getDistanceInMeters(prevState.currentLocation, newLocation);
//         const totalDistanceMoved = prevState.distanceMoved + distanceMoved;

//         // Calculate distance to user
//         const distanceToUser = getDistanceInMeters(newLocation, userLocation);
//         const eta = Math.max(1, Math.round((distanceToUser / 1000) * 3)); // simple ETA calc

//         // DISPATCH EVERY 50 METERS (or when closer than 100m)
//         if (totalDistanceMoved >= 50 || distanceToUser < 100) {
//           console.log(`✓ DISPATCH at ${totalDistanceMoved.toFixed(0)}m - Distance to user: ${distanceToUser.toFixed(0)}m`);

//           dispatch(
//             updateVendorLocation({
//                 id: acceptedOffer.id,
//               coordinates: newLocation,
//               distance: Math.max(0, distanceToUser / 1000),
//               eta: Number(eta),
//             })
//           );

//           // Reset distance counter after dispatch
//           return {
//             currentLocation: newLocation,
//             lastDistanceReportedAt: Date.now(),
//             distanceMoved: 0, // Reset counter after 50m
//           };
//         }

//         // Update local state without dispatching
//         console.log(`~ Moving: ${totalDistanceMoved.toFixed(0)}m total, ${distanceToUser.toFixed(0)}m to user`);

//         return {
//           currentLocation: newLocation,
//           lastDistanceReportedAt: prevState.lastDistanceReportedAt,
//           distanceMoved: totalDistanceMoved,
//         };
//       });
//     }, 2000); // Update every 2 seconds

//     return () => clearInterval(movementInterval);
//   }, [acceptedOffer, userLocation, vendorLocalState, dispatch, getDistanceInMeters]);

//   // Cancel request
//   const handleCancelRequest = useCallback(() => {
//     dispatch(cancelRequest());
//     setVendorLocalState(null);
//     setRoute([]);
//     router.back();
//   }, [dispatch, router]);

//   // Loading state
//   if (locationLoading) {
//     return (
//       <View style={styles.centerContainer}>
//         <ActivityIndicator size="large" color="#007AFF" />
//         <Text style={styles.loadingText}>Getting your location...</Text>
//       </View>
//     );
//   }

//   if (locationError || !userLocation) {
//     return (
//       <View style={styles.centerContainer}>
//         <Text style={styles.errorText}>{locationError || 'Location unavailable'}</Text>
//         <TouchableOpacity style={styles.retryButton} onPress={getUserLocation}>
//           <Text style={styles.retryButtonText}>Retry</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   return (
//     <GestureHandlerRootView style={styles.container}>
//       <MapView
//         ref={mapRef}
//         style={styles.map}
//         provider={PROVIDER_DEFAULT}
//         initialRegion={{
//           latitude: userLocation.latitude,
//           longitude: userLocation.longitude,
//           latitudeDelta: 0.05,
//           longitudeDelta: 0.05,
//         }}
//       >
//         {Platform.OS === 'web' && (
//           <UrlTile
//             urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//             maximumZ={19}
//           />
//         )}

//         {/* Route visualization */}
//         {route.length > 0 && (
//           <Polyline
//             coordinates={route}
//             strokeColor="#007AFF"
//             strokeWidth={4}
//             lineDashPattern={[2, 2]}
//           />
//         )}

//         {/* User marker */}
//         <Marker coordinate={userLocation} title="Your Location">
//           <View style={styles.userMarker}>
//             <MapPin size={24} color="#fff" />
//           </View>
//         </Marker>

//         {/* Incoming vendor markers */}
//         {!acceptedOffer &&
//           offers.map((offer) => (
//             <Marker key={offer.id} coordinate={offer.coordinates} title={offer.name}>
//               <View style={styles.vendorMarker}>
//                 <Navigation size={20} color="#fff" />
//               </View>
//             </Marker>
//           ))}

//         {/* Accepted vendor marker - uses local state for real-time updates */}
//         {acceptedOffer && vendorLocalState && (
//           <Marker
//             coordinate={vendorLocalState.currentLocation}
//             title={`${acceptedOffer.name} (On the way)`}
//           >
//             <View style={styles.acceptedVendorMarker}>
//               <Navigation size={24} color="#fff" />
//             </View>
//           </Marker>
//         )}
//       </MapView>

//       <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRequest}>
//         <X size={20} color="#fff" />
//         <Text style={styles.cancelButtonText}>Cancel Request</Text>
//       </TouchableOpacity>

//       <BottomSheet
//         ref={bottomSheetRef}
//         index={1}
//         snapPoints={acceptedOffer ? ['25%', '40%'] : ['25%', '60%']}
//         enablePanDownToClose={false}
//       >
//         <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
//           {acceptedOffer ? (
//             <View>
//               <Text style={styles.sheetTitle}>Vendor on the way</Text>
//               <VendorOfferCard offer={acceptedOffer} onAccept={() => {}} isAccepted={true} />
//               <View style={styles.statusContainer}>
//                 <ActivityIndicator size="small" color="#007AFF" />
//                 <View style={styles.statusTextContainer}>
//                   <Text style={styles.statusText}>
//                     {acceptedOffer.name} is heading to your location
//                   </Text>
//                   <Text style={styles.etaText}>
//                     Distance: {acceptedOffer.distance} km • ETA {acceptedOffer.eta}
//                   </Text>
//                 </View>
//               </View>
//             </View>
//           ) : (
//             <View>
//               <Text style={styles.sheetTitle}>
//                 {offers.length === 0 ? 'Waiting for offers...' : `${offers.length} Offers Received`}
//               </Text>

//               {offers.length === 0 ? (
//                 <View style={styles.emptyState}>
//                   <ActivityIndicator size="large" color="#007AFF" />
//                   <Text style={styles.emptyText}>
//                     Nearby vendors are reviewing your request
//                   </Text>
//                 </View>
//               ) : (
//                 offers.map((offer) => (
//                   <VendorOfferCard
//                     key={offer.id}
//                     offer={offer}
//                     onAccept={handleAcceptOffer}
//                     isAccepted={false}
//                   />
//                 ))
//               )}
//             </View>
//           )}
//         </BottomSheetScrollView>
//       </BottomSheet>
//     </GestureHandlerRootView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   map: { flex: 1 },
//   centerContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     padding: 20,
//   },
//   loadingText: {
//     marginTop: 16,
//     fontSize: 16,
//     color: '#666',
//   },
//   errorText: {
//     fontSize: 16,
//     color: '#FF3B30',
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   retryButton: {
//     backgroundColor: '#007AFF',
//     paddingHorizontal: 24,
//     paddingVertical: 12,
//     borderRadius: 8,
//   },
//   retryButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   userMarker: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#007AFF',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 3,
//     borderColor: '#fff',
//     elevation: 5,
//   },
//   vendorMarker: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: '#00A86B',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#fff',
//     elevation: 5,
//   },
//   acceptedVendorMarker: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: '#FF9500',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 3,
//     borderColor: '#fff',
//     elevation: 5,
//   },
//   cancelButton: {
//     position: 'absolute',
//     top: 50,
//     left: 16,
//     right: 16,
//     backgroundColor: '#FF3B30',
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 12,
//     borderRadius: 12,
//     elevation: 5,
//     gap: 8,
//   },
//   cancelButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   bottomSheetContent: {
//     padding: 16,
//     paddingBottom: 40,
//   },
//   sheetTitle: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#000',
//     marginBottom: 16,
//   },
//   emptyState: {
//     alignItems: 'center',
//     paddingVertical: 40,
//   },
//   emptyText: {
//     marginTop: 16,
//     fontSize: 16,
//     color: '#666',
//     textAlign: 'center',
//   },
//   statusContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 16,
//     padding: 16,
//     backgroundColor: '#F0F8FF',
//     borderRadius: 12,
//     gap: 12,
//   },
//   statusTextContainer: {
//     flex: 1,
//   },
//   statusText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#007AFF',
//     marginBottom: 4,
//   },
//   etaText: {
//     fontSize: 12,
//     color: '#666',
//   },
// });

// LiveOffersScreen.tsx - PRODUCTION GRADE WITH WORKING MOVEMENT
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
} from "../../src/store/slices/offersSlice";
import { RootState } from "../../src/store";
import { useBackHandlerExit } from "../../src/hooks/useBackHandlerExit";
import {
    generateRandomOffer,
    simulateVendorMovement,
} from "../../src/utils/mockOffers";
import { VendorOfferCard } from "../../src/components/customer/VendorOfferCard";
import RatingModal from "../../src/components/common/RatingModal";
import { OffersList } from "./VendorOfferList";
import { Slider } from "@miblanchard/react-native-slider";
import { setupPushNotifications, sendLocalNotification } from "../../src/utils/notifications";


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
const MOVEMENT_SPEED = 0.0002; // ~22 meters per update (same as your old code)
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
    const [radiusKm, setRadiusKm] = useState<number>(5); // default 5km
    const radiusOptions = [5, 10, 20]; // km

    useBackHandlerExit();

    // ===== REFS FOR STABLE STATE =====
    const generateIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const movementIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const routeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const offersLengthRef = useRef(offers.length);
    const lastRouteUpdatePositionRef = useRef<Coordinates | null>(null);


    const handleRadiusChange = useCallback((value: number | number[]) => {
        if (Array.isArray(value)) value = value[0]; // slider returns array
        const clamped = Math.max(1, Math.min(value, 20)); // limit 1-20km
        setRadiusKm(clamped);
    }, []);



    // ===== HAVERSINE DISTANCE CALCULATION =====
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
    // ===== LOCATION PERMISSION & FETCHING =====
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

    // ===== FETCH ROUTE FROM OSRM =====
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

    // ===== DEBOUNCED ROUTE FETCH =====
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

    // ===== HANDLE ACCEPT OFFER =====
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

    // ===== UPDATE ROUTE IF VENDOR MOVED SIGNIFICANTLY =====
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

    // ===== TRACK OFFERS LENGTH =====
    useEffect(() => {
        offersLengthRef.current = offers.length;
    }, [offers.length]);

    // ===== OFFER GENERATOR (ONLY IF NOT ACCEPTED) =====
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

                // Optional: double-check distance
                const dist = getDistanceInMeters(userLocation, offer.coordinates) / 1000;
                if (dist <= radiusKm) {
                    dispatch(addOffer({
                        ...offer,
                        createdAt: Date.now(),
                        expiryTime: Date.now() + TIMER_DURATION * 1000,
                    }));
                    sendLocalNotification("New vendor offer available", `${offer.name} is nearby within ${radiusKm} km!`);
                }
            }
        }, GENERATE_INTERVAL_MS);

        return () => {
            if (generateIntervalRef.current) {
                clearInterval(generateIntervalRef.current);
                generateIntervalRef.current = null;
            }
        };
    }, [userLocation, isReceivingOffers, acceptedOffer, dispatch, radiusKm]);

    // In your LiveOffers.tsx
    useEffect(() => {
        if (!offers?.length) return;

        const filteredOffers = offers.filter(o => o.distance <= radiusKm);

        // If some are out of range — remove them from Redux
        if (filteredOffers.length !== offers.length) {
            const outOfRangeIds = offers
                .filter(o => o.distance > radiusKm)
                .map(o => o.id);

            dispatch(removeOutOfRangeOffers(outOfRangeIds));
        }
    }, [radiusKm, offers, dispatch]);


    const filteredOffers = useMemo(() => {
        if (!userLocation) return [];
        return offers.filter(offer => {
            const distance = getDistanceInMeters(userLocation, offer.coordinates);
            console.log("🚀 ~ LiveOffersScreen ~ distance:", distance <= radiusKm * 1000)
            return distance <= radiusKm * 1000;
        });
    }, [offers, userLocation, radiusKm]);
    console.log("🚀 ~ LiveOffersScreen ~ filteredOffers:", filteredOffers)


    // ===== VENDOR MOVEMENT SIMULATION (FIXED - SIMILAR TO OLD CODE) =====
    useEffect(() => {
        // Only run if we have an accepted offer and user location
        if (!acceptedOffer || !userLocation || !vendorLocalState || vendorArrived) {
            return;
        }

        // Reset arrival state
        setVendorArrived(false);

        // Movement simulation loop
        const movementInterval = setInterval(() => {
            setVendorLocalState((prevState) => {
                if (!prevState) return null;

                // Simulate vendor moving toward user
                const newLocation = simulateVendorMovement(
                    prevState.currentLocation,
                    userLocation,
                    0.0002
                );

                // Calculate distance moved from previous position
                const distanceMoved = getDistanceInMeters(prevState.currentLocation, newLocation);
                const totalDistanceMoved = prevState.distanceMoved + distanceMoved;

                // Calculate distance to user
                const distanceToCustomer = getDistanceInMeters(newLocation, userLocation);
                // const eta = calculateETARemaining(distanceToUser / 1000);
                if (distanceToCustomer == 0) {
                    console.log("✅ Vendor arrived at destination");
                    sendLocalNotification("Vendor Arrived", `${acceptedOffer.name} has reached your location!`);
                    setVendorArrived(true);
                    clearInterval(movementInterval);
                    // if (movementInterval) {
                    //     clearInterval(movementInterval);
                    // }
                }
                // DISPATCH EVERY 50 METERS (or when closer than 100m)
                if (totalDistanceMoved >= 50 || distanceToCustomer < 100) {
                    console.log(`✓ DISPATCH at ${totalDistanceMoved.toFixed(0)}m - Distance to user: ${distanceToCustomer.toFixed(0)}m`);
                    // const distanceToDestination = getDistanceInMeters(userLocation, newLocation);
                    dispatch(
                        updateVendorLocation({
                            id: acceptedOffer.id,
                            coordinates: newLocation,
                            distance: Number((distanceToCustomer / 1000).toFixed(2)),
                            eta: Math.max(Math.round(distanceToCustomer / 250), 1),
                        })
                    );


                    // Reset distance counter after dispatch
                    return {
                        currentLocation: newLocation,
                        lastDistanceReportedAt: Date.now(),
                        distanceMoved: 0, // Reset counter after 50m
                    };
                }
                updateRouteIfNeeded(newLocation);


                // Update local state without dispatching
                console.log(`~ Moving: ${totalDistanceMoved.toFixed(0)}m total, ${distanceToCustomer.toFixed(0)}m to user`);

                return {
                    currentLocation: newLocation,
                    lastDistanceReportedAt: prevState.lastDistanceReportedAt,
                    distanceMoved: totalDistanceMoved,
                };
            });
        }, 2000);
        return () => clearInterval(movementInterval);
        // movementIntervalRef.current = setInterval(() => {
        //     console.log("🔄 Movement interval tick");

        //     // CRITICAL: Read current vendor position from acceptedOffer in closure
        //     // This works because acceptedOffer is in the dependency array,
        //     // so the effect re-runs when Redux updates it
        //     const currentVendorPos = acceptedOffer.coordinates;

        //     console.log("📍 Current positions:", {
        //         vendor: currentVendorPos,
        //         user: userLocation,
        //     });

        //     // Simulate movement towards user
        //     const newLocation = simulateVendorMovement(
        //         currentVendorPos,
        //         userLocation,
        //         MOVEMENT_SPEED
        //     );

        //     // Calculate distances
        //     const moved = getDistanceInMeters(currentVendorPos, newLocation);
        //     const distanceToDestination = getDistanceInMeters(userLocation, newLocation);

        //     console.log("📊 Movement data:", {
        //         moved: moved.toFixed(2) + "m",
        //         distanceToUser: distanceToDestination.toFixed(2) + "m",
        //         newLocation,
        //     });

        //     // Update Redux state
        //     dispatch(
        //         updateVendorLocation({
        //             id: acceptedOffer.id,
        //             coordinates: newLocation,
        //             distance: Number((distanceToDestination / 1000).toFixed(2)),
        //             eta: Math.max(Math.round(distanceToDestination / 250), 1),
        //         })
        //     );

        //     // Update local UI state
        //     setDistanceToUser(distanceToDestination);

        //     // Update route if vendor moved significantly
        //     updateRouteIfNeeded(newLocation);

        //     // Check if vendor arrived
        //     if (distanceToDestination <= ARRIVAL_THRESHOLD_METERS) {
        //         console.log("✅ Vendor arrived at destination");
        //         setVendorArrived(true);

        //         if (movementIntervalRef.current) {
        //             clearInterval(movementIntervalRef.current);
        //             movementIntervalRef.current = null;
        //         }
        //     }
        // }, MOVEMENT_INTERVAL_MS);

        // CRITICAL: Cleanup when effect re-runs or unmounts
        // return () => {
        //     console.log("🧹 Cleaning up vendor movement interval");
        //     if (movementIntervalRef.current) {
        //         clearInterval(movementIntervalRef.current);
        //         movementIntervalRef.current = null;
        //     }
        // };
    }, [acceptedOffer, userLocation, dispatch, getDistanceInMeters, updateRouteIfNeeded, vendorLocalState]);
    // ☝️ acceptedOffer (full object) as dependency - this makes it re-run when coordinates update

    // ===== CANCEL REQUEST =====
    const handleCancelRequest = useCallback(() => {
        dispatch(cancelRequest());
        router.back();
    }, [dispatch, router]);

    // ===== RENDER MARKERS =====
    const renderMarkers = useMemo(() => {
        if (!userLocation) return null;
        const markers: React.ReactNode[] = [];

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
            filteredOffers.forEach((o) => {
                markers.push(
                    <Marker key={o.id} coordinate={o.coordinates} title={o.name}>
                        <View style={styles.vendorMarker}>
                            <User size={20} color="#fff" />
                        </View>
                    </Marker>
                );
            });
        }

        return markers;
    }, [userLocation, offers, acceptedOffer]);

    // ===== CLEANUP ON STOP RECEIVING =====
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

    // ===== LOADING STATE =====
    if (locationLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
        );
    }

    // ===== ERROR STATE =====
    if (locationError || !userLocation) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>
                    {locationError || "Location unavailable"}
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={getUserLocation}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }


    // ===== RADIUS SLIDER UI =====
    const radiusSelector = (
        <View style={styles.radiusContainer}>
            <Text style={styles.radiusLabel}>Search Radius: {radiusKm.toFixed(1)} km</Text>
            <Slider
                value={radiusKm}
                onValueChange={handleRadiusChange}
                minimumValue={1}
                maximumValue={20}
                step={0.5}
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#ccc"
                thumbTintColor="#007AFF"
            />
        </View>
    );


    // ===== MAIN RENDER =====
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
                        strokeColor="#007AFF"
                        strokeWidth={4}
                    />
                )}
                {renderMarkers}
            </MapView>
            {/* <View style={styles.radiusSelector}>
                {radiusOptions.map((r) => (
                    <TouchableOpacity
                        key={r}
                        style={[
                            styles.radiusButton,
                            radiusKm === r && styles.radiusButtonActive,
                        ]}
                        onPress={() => setRadiusKm(r)}
                    >
                        <Text style={radiusKm === r ? styles.radiusTextActive : styles.radiusText}>
                            {r} km
                        </Text>
                    </TouchableOpacity>
                ))}
            </View> */}

            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRequest}>
                <X size={20} color="#fff" />
                <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>

            <BottomSheet
                ref={(r) => (bottomSheetRef.current = r)}
                index={1}
                snapPoints={acceptedOffer ? ["25%", "40%"] : ["25%", "60%"]}
                enablePanDownToClose={false}
            >
                <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
                    {acceptedOffer ? (
                        <View>
                            <Text style={styles.sheetTitle}>Vendor on the way</Text>
                            <VendorOfferCard offer={acceptedOffer} isAccepted />
                            <View style={styles.statusContainer}>
                                {!vendorArrived ? (
                                    <>
                                        <ActivityIndicator size="small" color="#007AFF" />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.statusText}>
                                                {acceptedOffer.name} is heading to your location...
                                            </Text>
                                            {distanceToUser !== null && (
                                                <Text style={styles.statusTextSmall}>
                                                    {Math.round(distanceToUser)} m away • ETA {acceptedOffer.eta} min
                                                </Text>
                                            )}
                                        </View>
                                    </>
                                ) : (
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.statusText, { color: "#22c55e" }]}>
                                            ✓ {acceptedOffer.name} has arrived!
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : (
                        <View>
                            <Text style={styles.sheetTitle}>
                                {offers.length === 0
                                    ? "Waiting for offers..."
                                    : `${offers.length} Offers Received`}
                            </Text>

                            {offers.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <ActivityIndicator size="large" color="#007AFF" />
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

// ===== STYLES =====
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
    statusText: { fontSize: 14, color: "#007AFF", fontWeight: "600" },
    statusTextSmall: { fontSize: 13, color: "#666", marginTop: 4 },
    radiusSelector: {
        position: "absolute",
        top: 100,
        left: 16,
        right: 16,
        flexDirection: "row",
        justifyContent: "space-around",
        backgroundColor: "#fff",
        padding: 8,
        borderRadius: 12,
        elevation: 5,
        zIndex: 10,
    },
    radiusButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: "#f0f0f0",
    },
    radiusButtonActive: {
        backgroundColor: "#007AFF",
    },
    radiusText: { color: "#333", fontWeight: "600" },
    radiusTextActive: { color: "#fff", fontWeight: "700" },
    radiusContainer: {
        position: "absolute",
        top: 100,
        left: 16,
        right: 16,
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 12,
        elevation: 5,
        zIndex: 10,
    },
    radiusLabel: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
        color: "#333",
    },


});

// import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
// import debounce from "lodash.debounce";
// import {
//     View,
//     Text,
//     StyleSheet,
//     TouchableOpacity,
//     ActivityIndicator,
//     Platform,
// } from "react-native";
// import MapView, { Marker, PROVIDER_DEFAULT, UrlTile, Polyline } from "react-native-maps";
// import * as Location from "expo-location";
// import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { useRouter } from "expo-router";
// import { useDispatch, useSelector } from "react-redux";
// import { MapPin, X, User, Star } from "lucide-react-native";

// import {
//     startReceivingOffers,
//     addOffer,
//     acceptOffer,
//     cancelRequest,
//     updateVendorLocation,
//     VendorOffer,
//     removeOffersByIds,
// } from "../../src/store/slices/offersSlice";
// import { RootState } from "../../src/store";
// import { useBackHandlerExit } from "../../src/hooks/useBackHandlerExit";
// import { generateRandomOffer, simulateVendorMovement } from "../../src/utils/mockOffers";
// import { VendorOfferCard } from "../../src/components/customer/VendorOfferCard";
// import RatingModal from "../../src/components/common/RatingModal";



// type Coordinates = {
//     latitude: number;
//     longitude: number;
// };


// const MOVEMENT_INTERVAL = 2000;
// const UPDATE_THRESHOLD_METERS = 50;

// export default function LiveOffersScreen() {
//     const router = useRouter();
//     const dispatch = useDispatch();
//     const mapRef = useRef<MapView>(null);
//     const bottomSheetRef = useRef<BottomSheet>(null);

//     const { offers, acceptedOffer, isReceivingOffers } = useSelector(
//         (state: RootState) => state.offers
//     );

//     const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
//         null
//     );
//     const [locationLoading, setLocationLoading] = useState(true);
//     const [locationError, setLocationError] = useState<string | null>(null);
//     const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
//     const [vendorArrived, setVendorArrived] = useState(false);
//     const [jobCompleted, setJobCompleted] = useState(false);
//     const [showRatingModal, setShowRatingModal] = useState(false);
//     const [distanceToUser, setDistanceToUser] = useState<number | null>(null);
//     const [visibleOffers, setVisibleOffers] = useState<VendorOffer[]>([]);
//     const [currentBatch, setCurrentBatch] = useState(0);
//     const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
//     const [timeLeft, setTimeLeft] = useState(20);

//     const timerRef = useRef<NodeJS.Timeout | null>(null);

//     const BATCH_SIZE = 3;
//     const TIMER_DURATION = 20;
//     useBackHandlerExit();


//     // ✅ Refs declared at top-level (correct)
//     const intervalRef = useRef<NodeJS.Timeout | null>(null);
//     const lastUpdateCoords = useRef(acceptedOffer?.coordinates);


//     /** 🧭 Fetch User Location */
//     const getUserLocation = useCallback(async () => {
//         try {
//             const { status } = await Location.requestForegroundPermissionsAsync();
//             if (status !== "granted") throw new Error("Location permission denied");

//             const { coords } = await Location.getCurrentPositionAsync({
//                 accuracy: Location.Accuracy.High,
//             });

//             const userCoords = { latitude: coords.latitude, longitude: coords.longitude };
//             setUserLocation(userCoords);
//             dispatch(startReceivingOffers());

//             mapRef.current?.animateToRegion({
//                 ...userCoords,
//                 latitudeDelta: 0.05,
//                 longitudeDelta: 0.05,
//             });
//         } catch (error: any) {
//             setLocationError(error.message || "Failed to get location");
//         } finally {
//             setLocationLoading(false);
//         }
//     }, [dispatch]);

//     const fetchRoute = async (start, end) => {
//         // console.log("----function called ---")
//         try {
//             const response = await fetch(
//                 `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`
//             );
//             const data = await response.json();
//             // console.log("🚀 ~ fetchRoute ~ data:", JSON.stringify(data, null, 2))

//             if (data?.routes?.length) {
//                 // console.log("🚀 ~ fetchRoute ~ data?.routes?.length:", data?.routes?.length)
//                 const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({
//                     latitude: lat,
//                     longitude: lng,
//                 }));
//                 return coords;
//             }
//             return [start, end];
//         } catch (error) {
//             console.warn('Failed to fetch route:', error);
//             return [start, end];
//         }
//     };
//     // const fetchRoute = async (
//     //     start: Coordinates,
//     //     end: Coordinates
//     // ): Promise<Coordinates[]> => {
//     //     const baseUrl = "https://router.project-osrm.org/route/v1/driving";

//     //     try {
//     //         const url = `${baseUrl}/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;

//     //         const response = await fetch(url);

//     //         if (!response.ok) {
//     //             console.error("OSRM API responded with an error:", response.status);
//     //             return [start, end];
//     //         }

//     //         const data = await response.json();

//     //         if (!data?.routes?.length) {
//     //             console.warn("No routes found for the given coordinates");
//     //             return [start, end];
//     //         }

//     //         const routeCoords: Coordinates[] =
//     //             data.routes[0].geometry.coordinates.map(
//     //                 ([lng, lat]: [number, number]) => ({
//     //                     latitude: lat,
//     //                     longitude: lng,
//     //                 })
//     //             );

//     //         return routeCoords;
//     //     } catch (error) {
//     //         console.error("Failed to fetch route:", error);
//     //         return [start, end];
//     //     }
//     // };

//     let routeTimeout: NodeJS.Timeout | null = null;

//     const debouncedFetchRoute = (start, end, delay = 800) =>
//         new Promise((resolve) => {
//             if (routeTimeout) clearTimeout(routeTimeout);

//             routeTimeout = setTimeout(async () => {
//                 const result = await fetchRoute(start, end);
//                 resolve(result);
//             }, delay);
//         });


//     const getDistanceInMeters = (coord1: Coordinates, coord2: Coordinates): number => {
//         const toRad = (value: number): number => (value * Math.PI) / 180;

//         const R = 6371e3; // Radius of the Earth in meters
//         const dLat = toRad(coord2.latitude - coord1.latitude);
//         const dLon = toRad(coord2.longitude - coord1.longitude);

//         const lat1 = toRad(coord1.latitude);
//         const lat2 = toRad(coord2.latitude);

//         const a =
//             Math.sin(dLat / 2) ** 2 +
//             Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

//         const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//         return R * c;
//     };


//     const batches = useMemo(() => {
//         const chunks: VendorOffer[][] = [];
//         for (let i = 0; i < offers.length; i += BATCH_SIZE) {
//             chunks.push(offers.slice(i, i + BATCH_SIZE));
//         }
//         return chunks;
//     }, [offers]);


//     // when offers or batch index changes, update visibleOffers and reset timer
//     useEffect(() => {
//         const batch = batches[currentBatchIndex] || [];
//         setVisibleOffers(batch);
//         setTimeLeft(TIMER_DURATION);
//     }, [batches, currentBatchIndex]);


//     useEffect(() => {
//         if (batches.length === 0) return;

//         let mounted = true;
//         const interval = setInterval(() => {
//             setTimeLeft((prev) => {
//                 if (prev <= 1) {
//                     // snapshot the ids of the currently visible batch (important)
//                     const toRemoveIds = (batches[currentBatchIndex] || []).map((o) => o.id);

//                     // dispatch removal of only those ids
//                     if (toRemoveIds.length > 0) {
//                         dispatch(removeOffersByIds(toRemoveIds));
//                     }

//                     // advance to next batch (note: offers in redux already updated)
//                     // we will not increment blindly; instead recompute based on fresh offers
//                     // but keep currentBatchIndex same for now; below effect will update it
//                     return 0;
//                 }
//                 return prev - 1;
//             });
//         }, 1000);
//         return () => {
//             clearInterval(interval);
//             mounted = false;
//         };
//     }, [batches, currentBatchIndex, dispatch]);


//     useEffect(() => {
//         // if currentBatchIndex now out-of-range (because offers shortened), reset to 0
//         if (currentBatchIndex > batches.length - 1) {
//             setCurrentBatchIndex(0);
//         }
//     }, [batches.length, currentBatchIndex]);



//     /** 🧩 Simulate Offers (Mock) */
//     // useEffect(() => {
//     //     if (!userLocation || !isReceivingOffers) return;
//     //     const interval = setInterval(() => {
//     //         dispatch(addOffer(generateRandomOffer(userLocation)));
//     //     }, 4000);
//     //     return () => clearInterval(interval);
//     // }, [userLocation, isReceivingOffers, dispatch]);
//     useEffect(() => {
//         if (!userLocation || !isReceivingOffers) return;

//         const interval = setInterval(() => {
//             // only add if < 3 offers in redux
//             if (offers.length < BATCH_SIZE) {
//                 dispatch(addOffer(generateRandomOffer(userLocation)));
//             }
//         }, 4000);

//         return () => clearInterval(interval);
//     }, [userLocation, isReceivingOffers, dispatch, offers.length]);



//     useEffect(() => {
//         const updateLiveRoute = async () => {
//             if (!acceptedOffer || !userLocation) return;
//             const newRoute = await debouncedFetchRoute(userLocation, acceptedOffer.coordinates);
//             setRouteCoords(newRoute);

//             if (routeCoords?.length > 2) {
//                 mapRef.current?.fitToCoordinates(newRoute, {
//                     edgePadding: { top: 100, right: 100, bottom: 400, left: 100 },
//                     animated: false,
//                 });
//             }
//         };

//         updateLiveRoute();
//     }, [acceptedOffer?.coordinates, userLocation]);


//     /** 🎯 On Mount — Fetch Location */
//     useEffect(() => {
//         getUserLocation();
//     }, [getUserLocation]);







//     useEffect(() => {
//         if (offers.length === 0) return;

//         //   const batches = [];
//         //   for (let i = 0; i < offers.length; i += BATCH_SIZE) {
//         //     batches.push(offers.slice(i, i + BATCH_SIZE));
//         //   }

//         setVisibleOffers(batches[currentBatch] || []);
//         setTimeLeft(TIMER_DURATION);

//         const interval = setInterval(() => {
//             setTimeLeft((prev) => {
//                 if (prev <= 1) {
//                     clearInterval(interval);
//                     if (currentBatch < batches.length - 1) {
//                         setCurrentBatch((prev) => prev + 1);
//                         setVisibleOffers(batches[currentBatch + 1] || []);
//                         return TIMER_DURATION;
//                     } else {
//                         setVisibleOffers([]);
//                     }
//                 }
//                 return prev - 1;
//             });
//         }, 1000);

//         return () => clearInterval(interval);
//     }, [offers, currentBatch]);




//     useEffect(() => {
//         if (!acceptedOffer || !userLocation) return;
//         console.log("movement tracking vendor--->>")

//         const interval = setInterval(() => {
//             const newLocation = simulateVendorMovement(
//                 acceptedOffer.coordinates,
//                 userLocation,
//                 0.0002
//             );

//             const distance = getDistanceInMeters(userLocation, newLocation);
//             const etaMinutes = Math.max(Math.round(distance / 250), 1); // e.g., 250m/min ~ walking speed
//             // dispatch(updateVendorLocation({ id: acceptedOffer.id, coordinates: newLocation }));
//             dispatch(updateVendorLocation({
//                 id: acceptedOffer.id,
//                 coordinates: newLocation,
//                 distance: (distance / 1000).toFixed(2),
//                 eta: etaMinutes,
//             }));
//             setDistanceToUser(distance);

//             // ✅ Mark vendor arrived if within 500m
//             if (distance <= 500 && !vendorArrived) {
//                 setVendorArrived(true);
//             }
//         }, 2000);

//         return () => clearInterval(interval);
//     }, [acceptedOffer, userLocation, vendorArrived, dispatch]);

//     useEffect(() => {
//         if (!acceptedOffer || !userLocation) return;
//         const interval = setInterval(() => {
//             const newLocation = simulateVendorMovement(
//                 acceptedOffer.coordinates,
//                 userLocation,
//                 0.0002
//             );
//             dispatch(updateVendorLocation({ id: acceptedOffer.id, coordinates: newLocation }));
//         }, 2000);
//         return () => clearInterval(interval);
//     }, [acceptedOffer, userLocation, dispatch]);

//     const handleAcceptOffer = useCallback(async (offer: VendorOffer) => {
//         dispatch(acceptOffer(offer));

//         if (userLocation) {
//             const route = await debouncedFetchRoute(userLocation, offer?.coordinates);
//             setRouteCoords(route);

//             // optional: zoom out to fit the whole route
//             // if (routeCoords?.length > 2) {
//             mapRef.current?.fitToCoordinates(route, {
//                 edgePadding: { top: 100, right: 100, bottom: 400, left: 100 },
//                 animated: false,
//             });
//             // }
//         }

//         bottomSheetRef.current?.snapToIndex(0);
//     }, [dispatch, userLocation]);

//     /** ❌ Cancel Request */
//     const handleCancelRequest = useCallback(() => {
//         dispatch(cancelRequest());
//         router.back();
//     }, [dispatch, router]);

//     /** 🧭 Render Markers — Memoized for Performance */
//     const renderMarkers = useMemo(() => {
//         if (!userLocation) return null;

//         const markers = [];

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
//             offers.forEach((offer) =>
//                 markers.push(
//                     <Marker key={offer.id} coordinate={offer.coordinates} title={offer.name}>
//                         <View style={styles.vendorMarker}>
//                             <User size={20} color="#fff" />
//                         </View>
//                     </Marker>
//                 )
//             );
//         }

//         return markers;
//     }, [userLocation, offers, acceptedOffer]);

//     /** 🧩 Loading / Error States */
//     if (locationLoading) {
//         return (
//             <LoaderScreen message="Getting your location..." />
//         );
//     }

//     if (locationError || !userLocation) {
//         return (
//             <ErrorScreen message={locationError || "Location unavailable"} onRetry={getUserLocation} />
//         );
//     }

//     /** 🗺️ Main Screen Render */
//     return (
//         <GestureHandlerRootView style={styles.container}>
//             <RatingModal visible={showRatingModal} onClose={() => setShowRatingModal(false)} />
//             <MapView
//                 ref={mapRef}
//                 style={styles.map}
//                 provider={PROVIDER_DEFAULT}
//                 initialRegion={{
//                     ...userLocation,
//                     latitudeDelta: 0.05,
//                     longitudeDelta: 0.05,
//                 }}
//             >
//                 {Platform.OS === "web" && (
//                     <UrlTile urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
//                 )}
//                 {routeCoords?.length > 0 && (
//                     <Polyline coordinates={routeCoords} strokeColor="#007AFF" strokeWidth={4} />
//                 )}
//                 {renderMarkers}
//             </MapView>

//             <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRequest}>
//                 <X size={20} color="#fff" />
//                 <Text style={styles.cancelButtonText}>Cancel Request</Text>
//             </TouchableOpacity>

//             <BottomSheet
//                 ref={bottomSheetRef}
//                 index={1}
//                 snapPoints={acceptedOffer ? ["25%", "40%"] : ["25%", "60%"]}
//                 enablePanDownToClose={false}
//             >
//                 <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
//                     {acceptedOffer ? (
//                         <AcceptedOfferSection
//                             acceptedOffer={acceptedOffer}
//                             vendorArrived={vendorArrived}
//                             jobCompleted={jobCompleted}
//                             onMarkArrived={() => setVendorArrived(true)}
//                             onMarkComplete={() => {
//                                 setJobCompleted(true);
//                                 setShowRatingModal(true);
//                             }}
//                             distanceToUser={distanceToUser}
//                         />
//                         // <AcceptedOfferSection acceptedOffer={acceptedOffer} />
//                     ) : (
//                         <OffersList
//                             visibleOffers={visibleOffers}
//                             timeLeft={timeLeft}
//                             onAccept={handleAcceptOffer}
//                         />
//                         // <OffersList offers={offers} onAccept={handleAcceptOffer} />
//                     )}

//                     {/* {acceptedOffer ? (
//                     ) : (
//                         <OffersList offers={offers} onAccept={handleAcceptOffer} />
//                     )} */}
//                 </BottomSheetScrollView>
//             </BottomSheet>
//         </GestureHandlerRootView>
//     );
// }

// /** 🧩 Loader Component */
// const LoaderScreen = ({ message }: { message: string }) => (
//     <View style={styles.centerContainer}>
//         <ActivityIndicator size="large" color="#007AFF" />
//         <Text style={styles.loadingText}>{message}</Text>
//     </View>
// );

// /** 🧩 Error Component */
// const ErrorScreen = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
//     <View style={styles.centerContainer}>
//         <Text style={styles.errorText}>{message}</Text>
//         <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
//             <Text style={styles.retryButtonText}>Retry</Text>
//         </TouchableOpacity>
//     </View>
// );

// /** 🧩 Offers List Section */


// const OffersList = ({ visibleOffers, timeLeft, onAccept }: {
//     visibleOffers: VendorOffer[];
//     timeLeft: number;
//     onAccept: (offer: VendorOffer) => void;
// }) => {
//     return (
//         <View>
//             <Text style={styles.sheetTitle}>
//                 {visibleOffers.length === 0 ? "Waiting for offers..." : `${visibleOffers.length} Offers`}
//             </Text>

//             {visibleOffers.length === 0 ? (
//                 <View style={styles.emptyState}>
//                     <ActivityIndicator size="large" color="#007AFF" />
//                     <Text style={styles.emptyText}>Nearby vendors are reviewing your request...</Text>
//                 </View>
//             ) : (
//                 visibleOffers.map((offer) => (
//                     <VendorOfferCard
//                         key={offer.id}
//                         offer={offer}
//                         onAccept={onAccept}
//                         timeLeft={timeLeft}
//                         totalTime={20}
//                     />
//                 ))
//             )}
//         </View>
//     );
// };

// // const OffersList = ({ offers, onAccept }: { offers: VendorOffer[]; onAccept: (offer: VendorOffer) => void }) => (
// //     <View>
// //         <Text style={styles.sheetTitle}>
// //             {offers?.length === 0 ? "Waiting for offers..." : `${offers?.length} Offers Received`}
// //         </Text>
// //         {offers?.length === 0 ? (
// //             <View style={styles.emptyState}>
// //                 <ActivityIndicator size="large" color="#007AFF" />
// //                 <Text style={styles.emptyText}>Nearby vendors are reviewing your request</Text>
// //             </View>
// //         ) : (
// //             offers.map((offer) => <VendorOfferCard key={offer.id} offer={offer} onAccept={onAccept} />)
// //         )}
// //     </View>
// // );

// /** 🧩 Accepted Offer Section */

// const AcceptedOfferSection = ({
//     acceptedOffer,
//     vendorArrived,
//     jobCompleted,
//     onMarkArrived,
//     onMarkComplete,
//     distanceToUser,
// }: {
//     acceptedOffer: VendorOffer;
//     vendorArrived: boolean;
//     jobCompleted: boolean;
//     onMarkArrived: () => void;
//     onMarkComplete: () => void;
//     distanceToUser: number | null;
// }) => {

//     // useEffect(() => {
//     //   if (!acceptedOffer || !userLocation) return;
//     //   const distance = getDistanceInMeters(userLocation, acceptedOffer.coordinates);

//     //   if (distance < 500 && !vendorArrived) {
//     //     setVendorArrived(true);
//     //   }
//     // }, [acceptedOffer?.coordinates, userLocation]);

//     return (
//         <View>
//             <Text style={styles.sheetTitle}>Vendor on the way</Text>
//             <VendorOfferCard offer={acceptedOffer} isAccepted />

//             {!vendorArrived && (
//                 <View style={styles.statusContainer}>
//                     <ActivityIndicator size="small" color="#007AFF" />
//                     <Text style={styles.statusText}>
//                         {acceptedOffer.name} is heading to your location...
//                     </Text>
//                     {distanceToUser && (
//                         <Text style={styles.statusTextSmall}>
//                             {Math.round(distanceToUser)} m away
//                         </Text>
//                     )}
//                 </View>
//             )}

//             {vendorArrived && !jobCompleted && (
//                 <TouchableOpacity
//                     style={styles.arrivedButton}
//                     onPress={onMarkArrived}
//                 >
//                     <Text style={styles.arrivedButtonText}>Mark as Arrived</Text>
//                 </TouchableOpacity>
//             )}

//             {vendorArrived && !jobCompleted && (
//                 <TouchableOpacity
//                     style={[styles.arrivedButton, { backgroundColor: "#34D399" }]}
//                     onPress={onMarkComplete}
//                 >
//                     <Text style={styles.arrivedButtonText}>Mark as Complete</Text>
//                 </TouchableOpacity>
//             )}
//         </View>
//     );
// };


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
//     statusText: { flex: 1, fontSize: 14, color: "#007AFF" },
//     arrivedButton: {
//         backgroundColor: "#007AFF",
//         borderRadius: 10,
//         paddingVertical: 12,
//         alignItems: "center",
//         marginTop: 16,
//     },
//     arrivedButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
//     statusTextSmall: { fontSize: 13, color: "#666", marginTop: 4 },
//     modalOverlay: {
//         position: "absolute",
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         backgroundColor: "rgba(0,0,0,0.3)",
//         justifyContent: "center",
//         alignItems: "center",
//     },
//     modalContainer: {
//         backgroundColor: "#fff",
//         borderRadius: 16,
//         padding: 24,
//         width: "80%",
//         alignItems: "center",
//         shadowColor: "#000",
//         shadowOpacity: 0.2,
//         shadowRadius: 6,
//         elevation: 6,
//     },
//     modalTitle: { fontSize: 18, fontWeight: "700", color: "#000", marginBottom: 16 },
//     ratingRow: { flexDirection: "row", marginVertical: 16 },
//     submitButton: {
//         backgroundColor: "#007AFF",
//         borderRadius: 8,
//         paddingVertical: 10,
//         paddingHorizontal: 32,
//     },
//     submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

// });


