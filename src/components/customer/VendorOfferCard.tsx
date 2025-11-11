import React, { memo, useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Alert, Animated, Easing } from "react-native";
import { User, MapPin, Clock, Star, MessageCircle, Phone } from "lucide-react-native";
import { VendorOffer } from "../../store/slices/offersSlice";

interface VendorOfferCardProps {
    offer: VendorOffer;
    onAccept?: (offer: VendorOffer) => void;
    isAccepted?: boolean;
    timeLeft?: number; // new,
    totalTime?: number; // new
}

export const VendorOfferCard = memo(({ offer, onAccept, isAccepted = false, timeLeft = 0, totalTime = 20 }: VendorOfferCardProps) => {
    const phoneNumber = offer?.phone || "+971501234567";
    const whatsappLink = `https://wa.me/${phoneNumber.replace("+", "")}`;

    const handleCall = () => {
        const phoneUrl = Platform.select({
            ios: `telprompt:${phoneNumber}`,
            android: `tel:${phoneNumber}`,
        });
        Linking.openURL(phoneUrl!).catch(() => Alert.alert("Error", "Unable to open phone dialer"));
    };

    const handleWhatsApp = () => {
        Linking.openURL(whatsappLink).catch(() =>
            Alert.alert("Error", "Unable to open WhatsApp")
        );
    };

    // Animation for progress bar
    const progressAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: timeLeft / totalTime,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: false,
        }).start();
    }, [timeLeft]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    const progressColor = progressAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ["#ff3b30", "#ffcc00", "#34c759"],
    });



    const details = useMemo(
        () => (
            <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                    <MapPin size={16} color="#666" />
                    <Text style={styles.detailText}>{offer?.distance} km away</Text>
                </View>
                <View style={styles.detailItem}>
                    <Clock size={16} color="#666" />
                    <Text style={styles.detailText}>ETA {offer?.eta} min</Text>
                </View>
            </View>
        ),
        [offer?.distance, offer.eta]
    );

    // Timer color gradient (green → orange → red)
    const timerColor =
        timeLeft > 10 ? "#22c55e" : timeLeft > 5 ? "#f59e0b" : "#ef4444";

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <User size={24} color="#fff" />
                </View>

                <View style={styles.vendorInfo}>
                    <Text style={styles.vendorName}>{offer?.name}</Text>
                    <View style={styles.ratingContainer}>
                        <Star size={14} color="#FFA500" fill="#FFA500" />
                        <Text style={styles.ratingText}>{offer?.rating}</Text>
                    </View>
                </View>

                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Quote</Text>
                    <Text style={styles.priceValue}>AED {offer?.price}</Text>
                </View>
            </View>

            {details}

            {!isAccepted &&
                <>
                    <View style={[styles.timerContainer2]}>
                        <Text style={[styles.timerText, { color: timerColor }]}>
                            Expires in {timeLeft}s
                        </Text>
                    </View>

                    {/* Timer bar */}
                    <View style={[styles.timerContainer, { marginBottom: 12 }]}>
                        <Animated.View
                            style={[
                                styles.timerBar,
                                {
                                    width: progressWidth,
                                    backgroundColor: progressColor,
                                },
                            ]}
                        />
                    </View>
                </>
            }
            {/* <Text style={styles.timerText}>{timeLeft}s left</Text> */}

            {isAccepted ? (
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: "#F97316" }]}
                        onPress={handleCall}
                    >
                        <Phone size={18} color="#fff" />
                        <Text style={styles.actionText}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: "#25D366" }]}
                        onPress={handleWhatsApp}
                    >
                        <MessageCircle size={18} color="#fff" />
                        <Text style={styles.actionText}>WhatsApp</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => onAccept && onAccept(offer)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.acceptButtonText}>Accept Offer</Text>
                </TouchableOpacity>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#007AFF",
        justifyContent: "center",
        alignItems: "center",
    },
    vendorInfo: { flex: 1, marginLeft: 12 },
    vendorName: { fontSize: 16, fontWeight: "600", color: "#000", marginBottom: 4 },
    ratingContainer: { flexDirection: "row", alignItems: "center" },
    ratingText: { fontSize: 14, color: "#666", marginLeft: 4 },
    priceContainer: { alignItems: "flex-end" },
    priceLabel: { fontSize: 12, color: "#666", marginBottom: 2 },
    priceValue: { fontSize: 18, fontWeight: "700", color: "#00A86B" },
    detailsRow: { flexDirection: "row", marginBottom: 16, gap: 16 },
    detailItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    detailText: { fontSize: 14, color: "#666" },
    timerContainer2: { alignItems: "flex-end", marginBottom: 8 },
    timerContainer: {
        height: 6,
        width: "100%",
        backgroundColor: "#eee",
        borderRadius: 6,
        overflow: "hidden",
        marginTop: 6,
    },
    timerBar: {
        height: "100%",
        borderRadius: 6,
    },
    timerText: { fontSize: 14, fontWeight: "600" },
    acceptButton: {
        backgroundColor: "#007AFF",
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
    },
    acceptButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
    actionRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
    },
    actionText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    // timerBar: {
    //     height: "10%",
    //     borderRadius: 6,
    // },
});



// import React, { useEffect, useRef } from "react";
// import {
//     View,
//     Text,
//     StyleSheet,
//     TouchableOpacity,
//     Linking,
//     Platform,
//     Alert,
//     Animated,
//     Easing,
// } from "react-native";
// import {
//     User,
//     MapPin,
//     Clock,
//     Star,
//     MessageCircle,
//     Phone,
// } from "lucide-react-native";
// import { VendorOffer } from "../../store/slices/offersSlice";

// interface VendorOfferCardProps {
//     offer: VendorOffer;
//     onAccept?: (offer: VendorOffer) => void;
//     isAccepted?: boolean;
//     timeLeft?: number; // from parent
//     totalTime?: number; // from parent
// }

// export const VendorOfferCard: React.FC<VendorOfferCardProps> = ({
//     offer,
//     onAccept,
//     isAccepted = false,
//     timeLeft = 0,
//     totalTime = 20,
// }) => {
//     const phoneNumber = offer?.phone || "+971501234567";
//     const whatsappLink = `https://wa.me/${phoneNumber.replace("+", "")}`;

//     const handleCall = () => {
//         const phoneUrl = Platform.select({
//             ios: `telprompt:${phoneNumber}`,
//             android: `tel:${phoneNumber}`,
//         });
//         Linking.openURL(phoneUrl!).catch(() =>
//             Alert.alert("Error", "Unable to open phone dialer")
//         );
//     };

//     const handleWhatsApp = () => {
//         Linking.openURL(whatsappLink).catch(() =>
//             Alert.alert("Error", "Unable to open WhatsApp")
//         );
//     };

// // Animation for progress bar
// const progressAnim = useRef(new Animated.Value(1)).current;

// useEffect(() => {
//     Animated.timing(progressAnim, {
//         toValue: timeLeft / totalTime,
//         duration: 1000,
//         easing: Easing.linear,
//         useNativeDriver: false,
//     }).start();
// }, [timeLeft]);

// const progressWidth = progressAnim.interpolate({
//     inputRange: [0, 1],
//     outputRange: ["0%", "100%"],
// });

// const progressColor = progressAnim.interpolate({
//     inputRange: [0, 0.5, 1],
//     outputRange: ["#ff3b30", "#ffcc00", "#34c759"],
// });

//     return (
//         <View style={styles.card}>
//             <View style={styles.header}>
//                 <View style={styles.avatarContainer}>
//                     <User size={24} color="#fff" />
//                 </View>

//                 <View style={styles.vendorInfo}>
//                     <Text style={styles.vendorName}>{offer?.name}</Text>
//                     <View style={styles.ratingContainer}>
//                         <Star size={14} color="#FFA500" fill="#FFA500" />
//                         <Text style={styles.ratingText}>{offer?.rating}</Text>
//                     </View>
//                 </View>

//                 <View style={styles.priceContainer}>
//                     <Text style={styles.priceLabel}>Quote</Text>
//                     <Text style={styles.priceValue}>AED {offer?.price}</Text>
//                 </View>
//             </View>

//             <View style={styles.detailsRow}>
//                 <View style={styles.detailItem}>
//                     <MapPin size={16} color="#666" />
//                     <Text style={styles.detailText}>{offer?.distance} km away</Text>
//                 </View>
//                 <View style={styles.detailItem}>
//                     <Clock size={16} color="#666" />
//                     <Text style={styles.detailText}>ETA {offer?.eta} min</Text>
//                 </View>
//             </View>

//             {/* Timer bar */}
//             <View style={styles.timerContainer}>
//                 <Animated.View
//                     style={[
//                         styles.timerBar,
//                         {
//                             width: progressWidth,
//                             backgroundColor: progressColor,
//                         },
//                     ]}
//                 />
//             </View>
//             <Text style={styles.timerText}>{timeLeft}s left</Text>

//             {isAccepted ? (
//                 <View style={styles.actionRow}>
//                     <TouchableOpacity
//                         style={[styles.actionButton, { backgroundColor: "#F97316" }]}
//                         onPress={handleCall}
//                     >
//                         <Phone size={18} color="#fff" />
//                         <Text style={styles.actionText}>Call</Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                         style={[styles.actionButton, { backgroundColor: "#25D366" }]}
//                         onPress={handleWhatsApp}
//                     >
//                         <MessageCircle size={18} color="#fff" />
//                         <Text style={styles.actionText}>WhatsApp</Text>
//                     </TouchableOpacity>
//                 </View>
//             ) : (
//                 <TouchableOpacity
//                     style={styles.acceptButton}
//                     onPress={() => onAccept && onAccept(offer)}
//                     activeOpacity={0.8}
//                 >
//                     <Text style={styles.acceptButtonText}>Accept Offer</Text>
//                 </TouchableOpacity>
//             )}
//         </View>
//     );
// };

// const styles = StyleSheet.create({
//     card: {
//         backgroundColor: "#fff",
//         borderRadius: 12,
//         padding: 16,
//         marginBottom: 12,
//         shadowColor: "#000",
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         elevation: 3,
//     },
//     header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
//     avatarContainer: {
//         width: 48,
//         height: 48,
//         borderRadius: 24,
//         backgroundColor: "#007AFF",
//         justifyContent: "center",
//         alignItems: "center",
//     },
//     vendorInfo: { flex: 1, marginLeft: 12 },
//     vendorName: { fontSize: 16, fontWeight: "600", color: "#000", marginBottom: 4 },
//     ratingContainer: { flexDirection: "row", alignItems: "center" },
//     ratingText: { fontSize: 14, color: "#666", marginLeft: 4 },
//     priceContainer: { alignItems: "flex-end" },
//     priceLabel: { fontSize: 12, color: "#666", marginBottom: 2 },
//     priceValue: { fontSize: 18, fontWeight: "700", color: "#00A86B" },
//     detailsRow: { flexDirection: "row", marginBottom: 16, gap: 16 },
//     detailItem: { flexDirection: "row", alignItems: "center", gap: 6 },
//     detailText: { fontSize: 14, color: "#666" },
//     acceptButton: {
//         backgroundColor: "#007AFF",
//         borderRadius: 8,
//         paddingVertical: 12,
//         alignItems: "center",
//     },
//     acceptButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
//     actionRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
//     actionButton: {
//         flex: 1,
//         flexDirection: "row",
//         alignItems: "center",
//         justifyContent: "center",
//         paddingVertical: 12,
//         borderRadius: 8,
//         gap: 6,
//     },
//     actionText: { color: "#fff", fontWeight: "600", fontSize: 15 },
//     timerContainer: {
//         height: 6,
//         width: "100%",
//         backgroundColor: "#eee",
//         borderRadius: 6,
//         overflow: "hidden",
//         marginTop: 6,
//     },
// timerBar: {
//     height: "100%",
//     borderRadius: 6,
// },
//     timerText: {
//         fontSize: 12,
//         textAlign: "right",
//         color: "#666",
//         marginTop: 4,
//     },
// });


// import React, { memo, useMemo, useCallback } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
// import { User, MapPin, Clock, Star, MessageCircle, Phone } from 'lucide-react-native';
// import { VendorOffer } from '../../store/slices/offersSlice';

// interface VendorOfferCardProps {
//     offer: VendorOffer;
//     onAccept?: (offer: VendorOffer) => void;
//     isAccepted?: boolean;
// }

// export function VendorOfferCard({ offer, onAccept, isAccepted = false }: VendorOfferCardProps) {
//     const phoneNumber = offer?.phone || '+971501234567'; // mock number
//     const whatsappLink = `https://wa.me/${phoneNumber.replace('+', '')}`;

//     const handleCall = useCallback(() => {
//         const phoneUrl = Platform.select({
//             ios: `telprompt:${phoneNumber}`,
//             android: `tel:${phoneNumber}`,
//         });
//         Linking.openURL(phoneUrl!).catch(() => Alert.alert('Error', 'Unable to open phone dialer'));
//     }, [phoneNumber]);

//     const handleWhatsApp = useCallback(() => {
//         Linking.openURL(whatsappLink).catch(() =>
//             Alert.alert('Error', 'Unable to open WhatsApp'),
//         );
//     }, [whatsappLink]);

//     const details = useMemo(() => (
//         <View style={styles.detailsRow}>
//             <View style={styles.detailItem}>
//                 <MapPin size={16} color="#666" />
//                 <Text style={styles.detailText}>{offer?.distance} km away</Text>
//             </View>
//             <View style={styles.detailItem}>
//                 <Clock size={16} color="#666" />
//                 <Text style={styles.detailText}>ETA {offer?.eta} min</Text>
//             </View>
//         </View>
//     ), [offer?.distance, offer.eta]);

//     return (
//         <View style={styles.card}>
//             <View style={styles.header}>
//                 <View style={styles.avatarContainer}>
//                     <User size={24} color="#fff" />
//                 </View>

//                 <View style={styles.vendorInfo}>
//                     <Text style={styles.vendorName}>{offer?.name}</Text>
//                     <View style={styles.ratingContainer}>
//                         <Star size={14} color="#FFA500" fill="#FFA500" />
//                         <Text style={styles.ratingText}>{offer?.rating}</Text>
//                     </View>
//                 </View>

//                 <View style={styles.priceContainer}>
//                     <Text style={styles.priceLabel}>Quote</Text>
//                     <Text style={styles.priceValue}>AED {offer?.price}</Text>
//                 </View>
//             </View>

//             {details}

//             {isAccepted ? (
//                 <View style={styles.actionRow}>
//                     <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#F97316' }]} onPress={handleCall}>
//                         <Phone size={18} color="#fff" />
//                         <Text style={styles.actionText}>Call</Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#25D366' }]} onPress={handleWhatsApp}>
//                         <MessageCircle size={18} color="#fff" />
//                         <Text style={styles.actionText}>WhatsApp</Text>
//                     </TouchableOpacity>
//                 </View>
//             ) : (
//                 <TouchableOpacity
//                     style={styles.acceptButton}
//                     onPress={() => onAccept && onAccept(offer)}
//                     activeOpacity={0.8}
//                 >
//                     <Text style={styles.acceptButtonText}>Accept Offer</Text>
//                 </TouchableOpacity>
//             )}
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     card: {
//         backgroundColor: '#fff',
//         borderRadius: 12,
//         padding: 16,
//         marginBottom: 12,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         elevation: 3,
//     },
//     header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
//     avatarContainer: {
//         width: 48,
//         height: 48,
//         borderRadius: 24,
//         backgroundColor: '#007AFF',
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     vendorInfo: { flex: 1, marginLeft: 12 },
//     vendorName: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 4 },
//     ratingContainer: { flexDirection: 'row', alignItems: 'center' },
//     ratingText: { fontSize: 14, color: '#666', marginLeft: 4 },
//     priceContainer: { alignItems: 'flex-end' },
//     priceLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
//     priceValue: { fontSize: 18, fontWeight: '700', color: '#00A86B' },
//     detailsRow: { flexDirection: 'row', marginBottom: 16, gap: 16 },
//     detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
//     detailText: { fontSize: 14, color: '#666' },
//     acceptButton: {
//         backgroundColor: '#007AFF',
//         borderRadius: 8,
//         paddingVertical: 12,
//         alignItems: 'center',
//     },
//     acceptButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
//     actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
//     actionButton: {
//         flex: 1,
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         paddingVertical: 12,
//         borderRadius: 8,
//         gap: 6,
//     },
//     actionText: { color: '#fff', fontWeight: '600', fontSize: 15 },
// });


// import React from 'react';
// import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// import { User, MapPin, Clock, Star } from 'lucide-react-native';
// import { VendorOffer } from '../../store/slices/offersSlice';
// // import { VendorOffer } from '@/redux/offersSlice';

// interface VendorOfferCardProps {
//     offer: VendorOffer;
//     onAccept: (offer: VendorOffer) => void;
// }

// export function VendorOfferCard({ offer, onAccept }: VendorOfferCardProps) {
//     return (
//         <View style={styles.card}>
//             <View style={styles.header}>
//                 <View style={styles.avatarContainer}>
//                     <User size={24} color="#fff" />
//                 </View>
//                 <View style={styles.vendorInfo}>
//                     <Text style={styles.vendorName}>{offer.name}</Text>
//                     <View style={styles.ratingContainer}>
//                         <Star size={14} color="#FFA500" fill="#FFA500" />
//                         <Text style={styles.ratingText}>{offer.rating}</Text>
//                     </View>
//                 </View>
//                 <View style={styles.priceContainer}>
//                     <Text style={styles.priceLabel}>Quote</Text>
//                     <Text style={styles.priceValue}>AED {offer.price}</Text>
//                 </View>
//             </View>

//             <View style={styles.detailsRow}>
//                 <View style={styles.detailItem}>
//                     <MapPin size={16} color="#666" />
//                     <Text style={styles.detailText}>{offer.distance} km away</Text>
//                 </View>
//                 <View style={styles.detailItem}>
//                     <Clock size={16} color="#666" />
//                     <Text style={styles.detailText}>ETA {offer.eta} min</Text>
//                 </View>
//             </View>

//             <TouchableOpacity
//                 style={styles.acceptButton}
//                 onPress={() => onAccept(offer)}
//                 activeOpacity={0.8}
//             >
//                 <Text style={styles.acceptButtonText}>Accept Offer</Text>
//             </TouchableOpacity>
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     card: {
//         backgroundColor: '#fff',
//         borderRadius: 12,
//         padding: 16,
//         marginBottom: 12,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         elevation: 3,
//     },
//     header: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 12,
//     },
//     avatarContainer: {
//         width: 48,
//         height: 48,
//         borderRadius: 24,
//         backgroundColor: '#007AFF',
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     vendorInfo: {
//         flex: 1,
//         marginLeft: 12,
//     },
//     vendorName: {
//         fontSize: 16,
//         fontWeight: '600',
//         color: '#000',
//         marginBottom: 4,
//     },
//     ratingContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     ratingText: {
//         fontSize: 14,
//         color: '#666',
//         marginLeft: 4,
//     },
//     priceContainer: {
//         alignItems: 'flex-end',
//     },
//     priceLabel: {
//         fontSize: 12,
//         color: '#666',
//         marginBottom: 2,
//     },
//     priceValue: {
//         fontSize: 18,
//         fontWeight: '700',
//         color: '#00A86B',
//     },
//     detailsRow: {
//         flexDirection: 'row',
//         marginBottom: 16,
//         gap: 16,
//     },
//     detailItem: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         gap: 6,
//     },
//     detailText: {
//         fontSize: 14,
//         color: '#666',
//     },
//     acceptButton: {
//         backgroundColor: '#007AFF',
//         borderRadius: 8,
//         paddingVertical: 12,
//         alignItems: 'center',
//     },
//     acceptButtonText: {
//         fontSize: 16,
//         fontWeight: '600',
//         color: '#fff',
//     },
// });
