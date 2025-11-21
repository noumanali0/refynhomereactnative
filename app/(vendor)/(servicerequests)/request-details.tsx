import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Animated } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { sendProposal, setVendorArrived } from "@/store/slices/requestsSlice";
import { LinearGradient } from "expo-linear-gradient";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";
import { Coordinates, CustomerRequestInfo, RouteInfo } from "@/services/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS } from "@/constants/colors";
import { haversineDistanceKm } from "@/utils/geo";
import { Ionicons } from "@expo/vector-icons";

// Mock customer data generator
const generateMockCustomerData = (requestId: string): CustomerRequestInfo => {
    const names = ['Ahmed Khan', 'Fatima Ali', 'Hassan Raza', 'Ayesha Malik', 'Usman Tariq'];
    const addresses = [
        'House 123, Street 5, DHA Phase 2, Islamabad',
        'Flat 4B, Blue Area Plaza, F-6, Islamabad',
        'Villa 789, Bahria Town Phase 4, Rawalpindi',
        'Apartment 12C, Centaurus Mall Road, Islamabad',
        'House 456, G-11 Markaz, Islamabad'
    ];
    const services = ['Plumbing', 'Electrical Work', 'AC Repair', 'Appliance Repair', 'General Maintenance'];
    const urgencies: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    const notes = [
        'Please bring necessary tools',
        'Water leakage in bathroom',
        'Urgent - AC not working in summer heat',
        'Prefer morning visit',
        'Multiple outlets need checking'
    ];

    const index = parseInt(requestId.slice(-1)) % 5;
    return {
        id: requestId,
        name: names[index],
        address: addresses[index],
        serviceRequested: services[index],
        urgencyLevel: urgencies[index % 3],
        preferredTime: 'Morning (9 AM - 12 PM)',
        additionalNotes: notes[index]
    };
};

export default function RequestDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const dispatch = useDispatch();
    const router = useRouter();
    const mapRef = useRef<MapView>(null);
    const bottomSheetRef = useRef<BottomSheet>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
    const progressAnim = useRef(new Animated.Value(1)).current;

    // Redux state
    const activeRequest = useSelector((s: RootState) =>
        s.requests.requests.find(r => r.id === id)
    );
    const requestDetail = useSelector((s: RootState) =>
        s.requests.activeRequestDetails[id as string]
    );

    // Local state
    const [vendorLocation, setVendorLocation] = useState<Coordinates | null>(null);
    const [customerLocation, setCustomerLocation] = useState<Coordinates | null>(null);
    const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
    const [proposalAmount, setProposalAmount] = useState<number>(500);
    const [remainingTime, setRemainingTime] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [customerData, setCustomerData] = useState<CustomerRequestInfo | null>(null);
    const [isNearby, setIsNearby] = useState(false);

    // Generate mock customer data
    useEffect(() => {
        if (id) {
            const mockData = generateMockCustomerData(id as string);
            setCustomerData(mockData);
        }
    }, [id]);

    // Initialize vendor location with real-time tracking
    useEffect(() => {
        let isMounted = true;

        const initializeLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Location permission is required');
                    return;
                }

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
                    setIsLoading(false);

                    // Start watching location if proposal is accepted
                    if (requestDetail?.customerAccepted) {
                        startLocationTracking();
                    }
                }
            } catch (error) {
                console.error('Location error:', error);
                if (isMounted) setIsLoading(false);
            }
        };

        initializeLocation();

        return () => {
            isMounted = false;
            stopLocationTracking();
        };
    }, []);

    // Start real-time location tracking when customer accepts
    useEffect(() => {
        if (requestDetail?.customerAccepted && !locationWatchRef.current) {
            startLocationTracking();
        }
    }, [requestDetail?.customerAccepted]);

    const startLocationTracking = async () => {
        try {
            locationWatchRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000, // Update every 5 seconds
                    distanceInterval: 10, // Or every 10 meters
                },
                (location) => {
                    const newCoords = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    };
                    setVendorLocation(newCoords);

                    // Check proximity
                    if (customerLocation) {
                        const distanceMeters = haversineDistanceKm(
                            newCoords.latitude,
                            newCoords.longitude,
                            customerLocation.latitude,
                            customerLocation.longitude
                        ) * 1000;
                        setIsNearby(distanceMeters <= 100);
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

    // Set customer location
    useEffect(() => {
        if (activeRequest?.coordinates) {
            setCustomerLocation(activeRequest.coordinates);
        }
    }, [activeRequest]);

    // Fetch route and calculate ETA
    useEffect(() => {
        const fetchRoute = async () => {
            if (!vendorLocation || !customerLocation) return;

            try {
                const res = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${vendorLocation.longitude},${vendorLocation.latitude};${customerLocation.longitude},${customerLocation.latitude}?overview=full&geometries=geojson`
                );
                const data = await res.json();

                if (data.routes && data.routes[0]) {
                    const route = data.routes[0];
                    const coords = route.geometry.coordinates.map(
                        ([lng, lat]: [number, number]) => ({
                            latitude: lat,
                            longitude: lng
                        })
                    );

                    setRouteInfo({
                        distance: route.distance, // meters
                        duration: route.duration, // seconds
                        coordinates: coords
                    });
                }
            } catch (error) {
                console.error('Route fetch error:', error);
            }
        };

        fetchRoute();
    }, [vendorLocation, customerLocation]);

    // Timer management for proposal
    useEffect(() => {
        if (requestDetail?.proposalExpiresAt && requestDetail.proposalStatus === 'sent') {
            const updateTimer = () => {
                const remaining = Math.max(0, Math.ceil((requestDetail.proposalExpiresAt! - Date.now()) / 1000));
                setRemainingTime(remaining);

                // Update progress animation
                const progress = remaining / 20;
                Animated.timing(progressAnim, {
                    toValue: progress,
                    duration: 300,
                    useNativeDriver: false
                }).start();

                if (remaining <= 0 && timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            };

            updateTimer();
            timerRef.current = setInterval(updateTimer, 1000);

            return () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            };
        }
    }, [requestDetail?.proposalExpiresAt, requestDetail?.proposalStatus]);

    // Handle send proposal
    const handleSendProposal = useCallback(async () => {
        if (!proposalAmount || proposalAmount < 100) {
            Alert.alert('Invalid Amount', 'Please enter a valid proposal amount (minimum PKR 100)');
            return;
        }

        if (!id) return;

        try {
            await dispatch(sendProposal({
                requestId: id as string,
                proposalAmount
            })).unwrap();
        } catch (error) {
            Alert.alert('Error', 'Failed to send proposal. Please try again.');
        }
    }, [dispatch, id, proposalAmount]);

    // Handle vendor arrival
    const handleVendorArrived = useCallback(() => {
        if (!id) return;

        Alert.alert(
            'Confirm Arrival',
            'Have you arrived at the customer location?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: () => {
                        dispatch(setVendorArrived({ requestId: id as string }));
                        Alert.alert('Success', 'Customer has been notified of your arrival');
                    }
                }
            ]
        );
    }, [dispatch, id]);

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

    const getUrgencyColor = (level: 'low' | 'medium' | 'high'): string => {
        switch (level) {
            case 'high': return COLORS.error;
            case 'medium': return COLORS.warning;
            case 'low': return COLORS.success;
            default: return COLORS.gray500;
        }
    };

    // Render loading state
    if (isLoading || !vendorLocation || !customerLocation || !customerData) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading request details...</Text>
            </View>
        );
    }

    // Render request not found
    if (!activeRequest) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
                <Text style={styles.errorText}>Request not found</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

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
                <Marker
                    coordinate={vendorLocation}
                    title="Your Location"
                    pinColor={COLORS.primary}
                >
                    <View style={styles.vendorMarker}>
                        <Ionicons name="car" size={24} color={COLORS.white} />
                    </View>
                </Marker>

                <Marker
                    coordinate={customerLocation}
                    title="Customer Location"
                    description={customerData.name}
                >
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

            {/* ETA and Distance Card */}
            {routeInfo && (
                <View style={styles.etaCard}>
                    <View style={styles.etaItem}>
                        <Ionicons name="navigate" size={20} color={COLORS.primary} />
                        <Text style={styles.etaLabel}>Distance</Text>
                        <Text style={styles.etaValue}>{formatDistance(routeInfo.distance)}</Text>
                    </View>
                    <View style={styles.etaDivider} />
                    <View style={styles.etaItem}>
                        <Ionicons name="time" size={20} color={COLORS.accent} />
                        <Text style={styles.etaLabel}>ETA</Text>
                        <Text style={styles.etaValue}>{formatDuration(routeInfo.duration)}</Text>
                    </View>
                </View>
            )}

            {/* Proposal Timer Bar */}
            {requestDetail?.proposalStatus === 'sent' && remainingTime > 0 && (
                <View style={styles.timerBarContainer}>
                    <View style={styles.timerBar}>
                        <Animated.View
                            style={[
                                styles.timerBarFill,
                                {
                                    width: progressWidth,
                                    backgroundColor: remainingTime <= 5 ? COLORS.error : COLORS.success
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.timerText}>
                        Waiting for customer response... {remainingTime}s
                    </Text>
                </View>
            )}

            {/* Customer Accepted Banner */}
            {requestDetail?.customerAccepted && (
                <View style={styles.acceptedBanner}>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
                    <View style={styles.acceptedTextContainer}>
                        <Text style={styles.acceptedTitle}>Proposal Accepted!</Text>
                        <Text style={styles.acceptedSubtitle}>Navigate to customer location</Text>
                    </View>
                </View>
            )}

            <BottomSheet
                ref={bottomSheetRef}
                index={requestDetail?.customerAccepted ? 1 : 0}
                snapPoints={requestDetail?.customerAccepted ? ["40%", "70%"] : ["35%", "60%"]}
                backgroundStyle={styles.bottomSheetBackground}
                handleIndicatorStyle={styles.bottomSheetIndicator}
            >
                <BottomSheetScrollView
                    style={styles.sheetContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Request Details</Text>
                        <View style={[
                            styles.urgencyBadge,
                            { backgroundColor: getUrgencyColor(customerData.urgencyLevel) + '20' }
                        ]}>
                            <Text style={[
                                styles.urgencyText,
                                { color: getUrgencyColor(customerData.urgencyLevel) }
                            ]}>
                                {customerData.urgencyLevel.toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    {/* Customer Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="person" size={20} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Customer Information</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Name</Text>
                            <Text style={styles.infoValue}>{customerData.name}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Service</Text>
                            <Text style={styles.infoValue}>{customerData.serviceRequested}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Address</Text>
                            <Text style={[styles.infoValue, styles.addressText]}>
                                {customerData.address}
                            </Text>
                        </View>

                        {customerData.preferredTime && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Preferred Time</Text>
                                <Text style={styles.infoValue}>{customerData.preferredTime}</Text>
                            </View>
                        )}

                        {/* Contact number (only shown after acceptance) */}
                        {requestDetail?.customerAccepted && requestDetail.customerPhone && (
                            <View style={[styles.infoRow, styles.phoneRow]}>
                                <Ionicons name="call" size={18} color={COLORS.success} />
                                <Text style={styles.infoLabel}>Contact</Text>
                                <TouchableOpacity>
                                    <Text style={styles.phoneValue}>
                                        {requestDetail.customerPhone}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Additional Notes */}
                    {customerData.additionalNotes && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="document-text" size={20} color={COLORS.accent} />
                                <Text style={styles.sectionTitle}>Additional Notes</Text>
                            </View>
                            <Text style={styles.notesText}>{customerData.additionalNotes}</Text>
                        </View>
                    )}

                    {/* Proposal Section */}
                    {!requestDetail?.customerAccepted && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="cash" size={20} color={COLORS.success} />
                                <Text style={styles.sectionTitle}>Send Proposal</Text>
                            </View>

                            <Text style={styles.proposalLabel}>Visit Charges (PKR)</Text>
                            <View style={styles.proposalInputContainer}>
                                <TouchableOpacity
                                    style={styles.proposalButton}
                                    onPress={() => setProposalAmount(prev => Math.max(100, prev - 100))}
                                    disabled={requestDetail?.proposalStatus === 'sending' || requestDetail?.proposalStatus === 'sent'}
                                >
                                    <Ionicons name="remove" size={24} color={COLORS.white} />
                                </TouchableOpacity>

                                <View style={styles.proposalAmountContainer}>
                                    <Text style={styles.currencySymbol}>PKR</Text>
                                    <Text style={styles.proposalAmount}>{proposalAmount}</Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.proposalButton}
                                    onPress={() => setProposalAmount(prev => prev + 100)}
                                    disabled={requestDetail?.proposalStatus === 'sending' || requestDetail?.proposalStatus === 'sent'}
                                >
                                    <Ionicons name="add" size={24} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>

                            {/* Quick amount presets */}
                            <View style={styles.presetsContainer}>
                                {[300, 500, 800, 1000].map(amount => (
                                    <TouchableOpacity
                                        key={amount}
                                        style={[
                                            styles.presetButton,
                                            proposalAmount === amount && styles.presetButtonActive
                                        ]}
                                        onPress={() => setProposalAmount(amount)}
                                        disabled={requestDetail?.proposalStatus === 'sending' || requestDetail?.proposalStatus === 'sent'}
                                    >
                                        <Text style={[
                                            styles.presetText,
                                            proposalAmount === amount && styles.presetTextActive
                                        ]}>
                                            {amount}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.sendProposalButton,
                                    (requestDetail?.proposalStatus === 'sending' || requestDetail?.proposalStatus === 'sent') &&
                                    styles.sendProposalButtonDisabled
                                ]}
                                onPress={handleSendProposal}
                                disabled={requestDetail?.proposalStatus === 'sending' || requestDetail?.proposalStatus === 'sent'}
                            >
                                <LinearGradient
                                    colors={
                                        requestDetail?.proposalStatus === 'sending' || requestDetail?.proposalStatus === 'sent'
                                            ? [COLORS.gray400, COLORS.gray500]
                                            : [COLORS.primary, COLORS.accent]
                                    }
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradientButton}
                                >
                                    {requestDetail?.proposalStatus === 'sending' ? (
                                        <>
                                            <ActivityIndicator color={COLORS.white} />
                                            <Text style={styles.sendProposalText}>Sending...</Text>
                                        </>
                                    ) : requestDetail?.proposalStatus === 'sent' ? (
                                        <>
                                            <Ionicons name="hourglass" size={20} color={COLORS.white} />
                                            <Text style={styles.sendProposalText}>
                                                Waiting ({remainingTime}s)
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <Ionicons name="send" size={20} color={COLORS.white} />
                                            <Text style={styles.sendProposalText}>Send Proposal</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Arrival Button */}
                    {requestDetail?.customerAccepted && isNearby && !requestDetail.vendorArrived && (
                        <TouchableOpacity
                            style={styles.arrivedButton}
                            onPress={handleVendorArrived}
                        >
                            <LinearGradient
                                colors={[COLORS.success, '#059669']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientButton}
                            >
                                <Ionicons name="checkmark-done" size={24} color={COLORS.white} />
                                <Text style={styles.arrivedButtonText}>I Have Arrived</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {requestDetail?.vendorArrived && (
                        <View style={styles.arrivedConfirmation}>
                            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                            <Text style={styles.arrivedConfirmationText}>
                                You have marked your arrival
                            </Text>
                        </View>
                    )}
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
        fontSize: moderateScale(16),
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
        fontSize: moderateScale(18),
        fontWeight: '600',
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
        fontSize: moderateScale(16),
        fontWeight: '600',
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
        fontSize: moderateScale(12),
        color: COLORS.gray500,
        marginTop: verticalScale(4),
    },
    etaValue: {
        fontSize: moderateScale(16),
        fontWeight: '700',
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
        fontSize: moderateScale(13),
        color: COLORS.gray700,
        textAlign: 'center',
        fontWeight: '500',
    },
    acceptedBanner: {
        position: 'absolute',
        top: verticalScale(100),
        left: scale(16),
        right: scale(16),
        backgroundColor: COLORS.success,
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
    acceptedTextContainer: {
        marginLeft: scale(12),
        flex: 1,
    },
    acceptedTitle: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: COLORS.white,
    },
    acceptedSubtitle: {
        fontSize: moderateScale(13),
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
        marginBottom: verticalScale(20),
    },
    sheetTitle: {
        fontSize: moderateScale(22),
        fontWeight: '700',
        color: COLORS.gray900,
    },
    urgencyBadge: {
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(6),
        borderRadius: moderateScale(16),
    },
    urgencyText: {
        fontSize: moderateScale(11),
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    section: {
        marginBottom: verticalScale(24),
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(12),
    },
    sectionTitle: {
        fontSize: moderateScale(16),
        fontWeight: '600',
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
        fontSize: moderateScale(14),
        color: COLORS.gray600,
        flex: 1,
    },
    infoValue: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: COLORS.gray900,
        flex: 2,
        textAlign: 'right',
    },
    addressText: {
        fontSize: moderateScale(13),
    },
    phoneRow: {
        backgroundColor: COLORS.success + '10',
        paddingHorizontal: scale(12),
        borderRadius: moderateScale(8),
        borderBottomWidth: 0,
    },
    phoneValue: {
        fontSize: moderateScale(15),
        fontWeight: '700',
        color: COLORS.success,
    },
    notesText: {
        fontSize: moderateScale(14),
        color: COLORS.gray700,
        lineHeight: moderateScale(20),
        backgroundColor: COLORS.gray50,
        padding: scale(12),
        borderRadius: moderateScale(8),
        borderLeftWidth: 3,
        borderLeftColor: COLORS.accent,
    },
    proposalLabel: {
        fontSize: moderateScale(14),
        fontWeight: '600',
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
        fontSize: moderateScale(12),
        color: COLORS.gray500,
        fontWeight: '600',
    },
    proposalAmount: {
        fontSize: moderateScale(32),
        fontWeight: '700',
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
        fontSize: moderateScale(13),
        fontWeight: '600',
        color: COLORS.gray700,
    },
    presetTextActive: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    sendProposalButton: {
        borderRadius: moderateScale(12),
        overflow: 'hidden',
    },
    sendProposalButtonDisabled: {
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
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: COLORS.white,
    },
    arrivedButton: {
        borderRadius: moderateScale(12),
        overflow: 'hidden',
        marginTop: verticalScale(8),
    },
    arrivedButtonText: {
        fontSize: moderateScale(18),
        fontWeight: '700',
        color: COLORS.white,
    },
    arrivedConfirmation: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.success + '20',
        padding: scale(16),
        borderRadius: moderateScale(12),
        marginTop: verticalScale(8),
    },
    arrivedConfirmationText: {
        fontSize: moderateScale(15),
        fontWeight: '600',
        color: COLORS.success,
        marginLeft: scale(8),
    },
});


// import React, { useState, useEffect } from 'react';
// import {
//     View,
//     Text,
//     ScrollView,
//     TouchableOpacity,
//     TextInput,
//     StyleSheet,
//     SafeAreaView,
//     Modal,
// } from 'react-native';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import { MapPin, Calendar, DollarSign, X } from 'lucide-react-native';
// import { MockAPI } from '../../../src/api/mock/handlers';

// export default function RequestDetailScreen() {
//     const { id } = useLocalSearchParams();
//     const router = useRouter();
//     const [request, setRequest] = useState<any>(null);
//     const [showProposalModal, setShowProposalModal] = useState(false);
//     const [proposalPrice, setProposalPrice] = useState('');
//     const [proposalDuration, setProposalDuration] = useState('');
//     const [proposalMessage, setProposalMessage] = useState('');

//     useEffect(() => {
//         loadRequest();
//     }, [id]);

//     const loadRequest = async () => {
//         try {
//             const data = await MockAPI.getRequestById(id as string);
//             setRequest(data);
//         } catch (error) {
//             console.error('Error loading request:', error);
//         }
//     };

//     const handleSendProposal = async () => {
//         if (!proposalPrice || !proposalDuration || !proposalMessage) {
//             alert('Please fill all fields');
//             return;
//         }

//         try {
//             await MockAPI.createProposal({
//                 requestId: id,
//                 vendorId: 'vendor_1',
//                 price: parseFloat(proposalPrice),
//                 estimatedDuration: proposalDuration,
//                 message: proposalMessage,
//             });

//             setShowProposalModal(false);
//             alert('Proposal sent successfully!');
//             router.back();
//         } catch (error) {
//             alert('Failed to send proposal');
//         }
//     };

//     if (!request) {
//         return (
//             <SafeAreaView style={styles.container}>
//                 <View style={styles.loadingContainer}>
//                     <Text>Loading...</Text>
//                 </View>
//             </SafeAreaView>
//         );
//     }

//     return (
//         <SafeAreaView style={styles.container}>
//             <ScrollView contentContainerStyle={styles.content}>
//                 <View style={styles.header}>
//                     <Text style={styles.title}>{request.title}</Text>
//                     <Text style={styles.serviceType}>{request.serviceType}</Text>
//                 </View>

//                 <View style={styles.section}>
//                     <Text style={styles.sectionTitle}>Description</Text>
//                     <Text style={styles.description}>{request.description}</Text>
//                 </View>

//                 <View style={styles.detailsGrid}>
//                     <View style={styles.detailCard}>
//                         <Calendar size={20} color="#2563EB" />
//                         <Text style={styles.detailLabel}>Preferred Date</Text>
//                         <Text style={styles.detailValue}>
//                             {new Date(request.preferredDate).toLocaleDateString()}
//                         </Text>
//                     </View>

//                     <View style={styles.detailCard}>
//                         <MapPin size={20} color="#8B5CF6" />
//                         <Text style={styles.detailLabel}>Location</Text>
//                         <Text style={styles.detailValue}>{request.address.city}</Text>
//                     </View>

//                     {request.estimatedBudget && (
//                         <View style={styles.detailCard}>
//                             <DollarSign size={20} color="#10B981" />
//                             <Text style={styles.detailLabel}>Budget</Text>
//                             <Text style={styles.detailValue}>${request.estimatedBudget}</Text>
//                         </View>
//                     )}
//                 </View>

//                 <TouchableOpacity
//                     style={styles.proposalButton}
//                     onPress={() => setShowProposalModal(true)}
//                 >
//                     <Text style={styles.proposalButtonText}>Send Proposal</Text>
//                 </TouchableOpacity>
//             </ScrollView>

//             {/* Proposal Modal */}
//             <Modal
//                 visible={showProposalModal}
//                 animationType="slide"
//                 presentationStyle="pageSheet"
//             >
//                 <SafeAreaView style={styles.modalContainer}>
//                     <View style={styles.modalHeader}>
//                         <Text style={styles.modalTitle}>Send Proposal</Text>
//                         <TouchableOpacity onPress={() => setShowProposalModal(false)}>
//                             <X size={24} color="#6B7280" />
//                         </TouchableOpacity>
//                     </View>

//                     <ScrollView contentContainerStyle={styles.modalContent}>
//                         <View style={styles.inputContainer}>
//                             <Text style={styles.inputLabel}>Your Price *</Text>
//                             <TextInput
//                                 style={styles.input}
//                                 placeholder="0.00"
//                                 value={proposalPrice}
//                                 onChangeText={setProposalPrice}
//                                 keyboardType="decimal-pad"
//                             />
//                         </View>

//                         <View style={styles.inputContainer}>
//                             <Text style={styles.inputLabel}>Estimated Duration *</Text>
//                             <TextInput
//                                 style={styles.input}
//                                 placeholder="e.g., 2-3 hours"
//                                 value={proposalDuration}
//                                 onChangeText={setProposalDuration}
//                             />
//                         </View>

//                         <View style={styles.inputContainer}>
//                             <Text style={styles.inputLabel}>Message *</Text>
//                             <TextInput
//                                 style={[styles.input, styles.textArea]}
//                                 placeholder="Explain your proposal..."
//                                 value={proposalMessage}
//                                 onChangeText={setProposalMessage}
//                                 multiline
//                                 numberOfLines={6}
//                             />
//                         </View>

//                         <TouchableOpacity
//                             style={styles.sendButton}
//                             onPress={handleSendProposal}
//                         >
//                             <Text style={styles.sendButtonText}>Send Proposal</Text>
//                         </TouchableOpacity>
//                     </ScrollView>
//                 </SafeAreaView>
//             </Modal>
//         </SafeAreaView>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#F9FAFB',
//     },
//     content: {
//         padding: 16,
//     },
//     loadingContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     header: {
//         marginBottom: 20,
//     },
//     title: {
//         fontSize: 24,
//         fontWeight: '700',
//         color: '#111827',
//         marginBottom: 4,
//     },
//     serviceType: {
//         fontSize: 15,
//         color: '#6B7280',
//     },
//     section: {
//         backgroundColor: '#FFFFFF',
//         borderRadius: 16,
//         padding: 16,
//         marginBottom: 16,
//     },
//     sectionTitle: {
//         fontSize: 16,
//         fontWeight: '600',
//         color: '#374151',
//         marginBottom: 8,
//     },
//     description: {
//         fontSize: 14,
//         color: '#6B7280',
//         lineHeight: 20,
//     },
//     detailsGrid: {
//         flexDirection: 'row',
//         flexWrap: 'wrap',
//         gap: 12,
//         marginBottom: 24,
//     },
//     detailCard: {
//         flex: 1,
//         minWidth: '45%',
//         backgroundColor: '#FFFFFF',
//         borderRadius: 12,
//         padding: 16,
//         gap: 8,
//     },
//     detailLabel: {
//         fontSize: 12,
//         color: '#6B7280',
//     },
//     detailValue: {
//         fontSize: 16,
//         fontWeight: '600',
//         color: '#111827',
//     },
//     proposalButton: {
//         backgroundColor: '#2563EB',
//         borderRadius: 12,
//         padding: 16,
//         alignItems: 'center',
//     },
//     proposalButtonText: {
//         fontSize: 16,
//         fontWeight: '600',
//         color: '#FFFFFF',
//     },
//     modalContainer: {
//         flex: 1,
//         backgroundColor: '#F9FAFB',
//     },
//     modalHeader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         padding: 16,
//         borderBottomWidth: 1,
//         borderBottomColor: '#E5E7EB',
//         backgroundColor: '#FFFFFF',
//     },
//     modalTitle: {
//         fontSize: 18,
//         fontWeight: '600',
//         color: '#111827',
//     },
//     modalContent: {
//         padding: 16,
//     },
//     inputContainer: {
//         marginBottom: 20,
//     },
//     inputLabel: {
//         fontSize: 14,
//         fontWeight: '600',
//         color: '#374151',
//         marginBottom: 8,
//     },
//     input: {
//         backgroundColor: '#FFFFFF',
//         borderWidth: 1,
//         borderColor: '#E5E7EB',
//         borderRadius: 12,
//         padding: 14,
//         fontSize: 15,
//         color: '#111827',
//     },
//     textArea: {
//         height: 120,
//         textAlignVertical: 'top',
//     },
//     sendButton: {
//         backgroundColor: '#2563EB',
//         borderRadius: 12,
//         padding: 16,
//         alignItems: 'center',
//         marginTop: 8,
//     },
//     sendButtonText: {
//         fontSize: 16,
//         fontWeight: '600',
//         color: '#FFFFFF',
//     },
// });