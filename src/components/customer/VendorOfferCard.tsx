import React, { memo, useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Linking, Platform, Alert, Animated, Easing } from "react-native";
import { User, MapPin, Clock, Star, MessageCircle, Phone } from "lucide-react-native";
import { VendorOffer } from "../../store/slices/offersSlice";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../common/Text";
import { moderateScale } from "react-native-size-matters";

interface VendorOfferCardProps {
    offer: VendorOffer;
    onAccept?: (offer: VendorOffer) => void;
    isAccepted?: boolean;
    timeLeft?: number;
    totalTime?: number;
    notFromMap?: boolean;
}

export const VendorOfferCard = memo(({
    offer,
    onAccept,
    isAccepted = false,
    timeLeft = 0,
    totalTime = 20,
    notFromMap = false
}: VendorOfferCardProps) => {
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
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: timeLeft / totalTime,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: false,
        }).start();

        // Pulse animation for urgent offers (< 5s)
        if (timeLeft <= 5 && timeLeft > 0) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [timeLeft, totalTime, progressAnim, pulseAnim]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    const details = useMemo(
        () => (
            <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                    <LinearGradient
                        colors={['rgba(37, 99, 235, 0.1)', 'rgba(37, 99, 235, 0.05)']}
                        style={styles.detailIconContainer}
                    >
                        <MapPin size={14} color="#2563EB" />
                    </LinearGradient>
                    <Text type="body2" style={styles.detailText}>{offer?.distance} km away</Text>
                </View>
                <View style={styles.detailItem}>
                    <LinearGradient
                        colors={['rgba(249, 115, 22, 0.1)', 'rgba(249, 115, 22, 0.05)']}
                        style={styles.detailIconContainer}
                    >
                        <Clock size={14} color="#F97316" />
                    </LinearGradient>
                    <Text type="body2" style={styles.detailText}>ETA {offer?.eta} min</Text>
                </View>
            </View>
        ),
        [offer?.distance, offer.eta]
    );

    // Timer color gradient (green → orange → red)
    const timerColor = timeLeft > 10 ? "#22c55e" : timeLeft > 5 ? "#f59e0b" : "#ef4444";
    const urgencyGradient = timeLeft > 10
        ? ['#22c55e', '#16a34a']
        : timeLeft > 5
            ? ['#f59e0b', '#ea580c']
            : ['#ef4444', '#dc2626'];

    return (
        <Animated.View style={[
            notFromMap ? styles.card1 : styles.card,
            { transform: [{ scale: pulseAnim }] }
        ]}>
            <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(37, 99, 235, 0.02)']}
                style={styles.cardGradient}
            >
                {/* Header Section */}
                <View style={styles.header}>
                    <LinearGradient
                        colors={['#2563EB', '#F97316']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                            styles.avatarContainer,
                            notFromMap && {
                                height: moderateScale(40),
                                width: moderateScale(40),
                                borderRadius: 20
                            }
                        ]}
                    >
                        <User size={notFromMap ? 20 : 24} color="#fff" />
                    </LinearGradient>

                    <View style={styles.vendorInfo}>
                        <Text
                            type={notFromMap ? "body" : "bodySemiBold"}
                            style={styles.vendorName}
                        >
                            {offer?.name || "Masood Ahmed"}
                        </Text>
                        <View style={styles.ratingContainer}>
                            <Star size={14} color="#FFA500" fill="#FFA500" />
                            <Text type="body2" style={styles.ratingText}>
                                {offer?.rating || 4.5} ({Math.floor(Math.random() * 100) + 10})
                            </Text>
                        </View>
                    </View>

                    {!notFromMap && (
                        <View style={styles.priceContainer}>
                            <LinearGradient
                                colors={['#22c55e', '#16a34a']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.priceBadge}
                            >
                                <Text type="body2" style={styles.priceLabel}>Quote</Text>
                                <Text type="bodySemiBold" style={styles.priceValue}>
                                    AED {offer?.price}
                                </Text>
                            </LinearGradient>
                        </View>
                    )}
                </View>

                {/* Details Section */}
                {!notFromMap && details}

                {/* Timer Section for Non-Accepted Offers */}
                {!isAccepted && (
                    <>
                        <View style={styles.timerContainer2}>
                            <LinearGradient
                                colors={urgencyGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.timerBadge}
                            >
                                <Clock size={12} color="#fff" />
                                <Text style={styles.timerText}>
                                    Expires in {timeLeft}s
                                </Text>
                            </LinearGradient>
                        </View>

                        {/* Animated Progress Bar */}
                        <View style={styles.timerBarContainer}>
                            <LinearGradient
                                colors={['#f1f5f9', '#e2e8f0']}
                                style={styles.timerBarBackground}
                            >
                                <Animated.View style={{ width: progressWidth, height: '100%' }}>
                                    <LinearGradient
                                        colors={urgencyGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.timerBar}
                                    />
                                </Animated.View>
                            </LinearGradient>
                        </View>
                    </>
                )}

                {/* Action Buttons */}
                {isAccepted || notFromMap ? (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            onPress={handleCall}
                            style={styles.flexButton}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#2563EB', '#F97316']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.gradientBorder}
                            >
                                <View style={styles.outlineInner}>
                                    <Phone size={16} color="#F97316" />
                                    <Text type="body2" style={styles.outlineText}>Call</Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleWhatsApp}
                            style={styles.flexButton}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#2563EB', '#F97316']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.gradientBorder}
                            >
                                <View style={styles.outlineInner}>
                                    <MessageCircle size={16} color="#F97316" />
                                    <Text type="body2" style={styles.outlineText}>WhatsApp</Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => onAccept && onAccept(offer)}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#2563EB', '#F97316']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.acceptButtonInner}
                        >
                            <Text style={styles.acceptButtonText}>Accept Offer</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </LinearGradient>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        marginBottom: moderateScale(12),
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        overflow: 'hidden',
    },
    card1: {
        backgroundColor: "#fff",
        borderRadius: 16,
        marginBottom: moderateScale(12),
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    cardGradient: {
        padding: moderateScale(16),
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: moderateScale(14),
    },
    avatarContainer: {
        width: moderateScale(52),
        height: moderateScale(52),
        borderRadius: moderateScale(26),
        justifyContent: "center",
        alignItems: "center",
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    vendorInfo: {
        flex: 1,
        marginLeft: moderateScale(12),
    },
    vendorName: {
        fontSize: moderateScale(16),
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: moderateScale(4),
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: moderateScale(4),
    },
    ratingText: {
        fontSize: moderateScale(13),
        color: "#64748b",
        fontWeight: '500',
    },
    priceContainer: {
        alignItems: "flex-end",
    },
    priceBadge: {
        paddingHorizontal: moderateScale(12),
        paddingVertical: moderateScale(8),
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    priceLabel: {
        fontSize: moderateScale(11),
        color: "rgba(255,255,255,0.9)",
        marginBottom: moderateScale(2),
        fontWeight: '600',
    },
    priceValue: {
        fontSize: moderateScale(16),
        fontWeight: "800",
        color: "#fff",
    },
    detailsRow: {
        flexDirection: "row",
        marginBottom: moderateScale(16),
        gap: moderateScale(12),
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: moderateScale(6),
    },
    detailIconContainer: {
        width: moderateScale(28),
        height: moderateScale(28),
        borderRadius: moderateScale(14),
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailText: {
        fontSize: moderateScale(13),
        color: "#64748b",
        fontWeight: '500',
    },
    timerContainer2: {
        alignItems: "flex-end",
        marginBottom: moderateScale(10),
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(6),
        paddingHorizontal: moderateScale(12),
        paddingVertical: moderateScale(6),
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    timerText: {
        fontSize: moderateScale(12),
        fontWeight: "700",
        color: '#fff',
    },
    timerBarContainer: {
        marginBottom: moderateScale(16),
    },
    timerBarBackground: {
        height: moderateScale(8),
        width: "100%",
        borderRadius: moderateScale(4),
        overflow: "hidden",
    },
    timerBar: {
        height: "100%",
        borderRadius: moderateScale(4),
    },
    acceptButton: {
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    acceptButtonInner: {
        paddingVertical: moderateScale(14),
        alignItems: "center",
        justifyContent: 'center',
    },
    acceptButtonText: {
        fontSize: moderateScale(16),
        fontWeight: "700",
        color: "#fff",
    },
    actionRow: {
        flexDirection: "row",
        gap: moderateScale(10),
        alignItems: "stretch",
    },
    flexButton: {
        flex: 1,
    },
    gradientBorder: {
        flex: 1,
        height: moderateScale(48),
        padding: moderateScale(2),
        borderRadius: 12,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    outlineInner: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: moderateScale(10),
        borderRadius: 10,
        backgroundColor: "#fff",
        gap: moderateScale(6),
    },
    outlineText: {
        fontSize: moderateScale(14),
        fontWeight: "700",
        color: "#F97316",
    },
});

// import React, { memo, useEffect, useMemo, useRef } from "react";
// import { View, StyleSheet, TouchableOpacity, Linking, Platform, Alert, Animated, Easing } from "react-native";
// import { User, MapPin, Clock, Star, MessageCircle, Phone } from "lucide-react-native";
// import { VendorOffer } from "../../store/slices/offersSlice";
// import { LinearGradient } from "expo-linear-gradient";
// import Text from "../common/Text";
// import { moderateScale } from "react-native-size-matters";

// interface VendorOfferCardProps {
//     offer: VendorOffer;
//     onAccept?: (offer: VendorOffer) => void;
//     isAccepted?: boolean;
//     timeLeft?: number; // new,
//     totalTime?: number; // new
//     notFromMap?: boolean
// }

// export const VendorOfferCard = memo(({ offer, onAccept, isAccepted = false, timeLeft = 0, totalTime = 20, notFromMap = false }: VendorOfferCardProps) => {
//     const phoneNumber = offer?.phone || "+971501234567";
//     const whatsappLink = `https://wa.me/${phoneNumber.replace("+", "")}`;

//     const handleCall = () => {
//         const phoneUrl = Platform.select({
//             ios: `telprompt:${phoneNumber}`,
//             android: `tel:${phoneNumber}`,
//         });
//         Linking.openURL(phoneUrl!).catch(() => Alert.alert("Error", "Unable to open phone dialer"));
//     };

//     const handleWhatsApp = () => {
//         Linking.openURL(whatsappLink).catch(() =>
//             Alert.alert("Error", "Unable to open WhatsApp")
//         );
//     };

//     // Animation for progress bar
//     const progressAnim = useRef(new Animated.Value(1)).current;

//     useEffect(() => {
//         Animated.timing(progressAnim, {
//             toValue: timeLeft / totalTime,
//             duration: 1000,
//             easing: Easing.linear,
//             useNativeDriver: false,
//         }).start();
//     }, [timeLeft]);

//     const progressWidth = progressAnim.interpolate({
//         inputRange: [0, 1],
//         outputRange: ["0%", "100%"],
//     });

//     const progressColor = progressAnim.interpolate({
//         inputRange: [0, 0.5, 1],
//         outputRange: ["#ff3b30", "#ffcc00", "#34c759"],
//     });



//     const details = useMemo(
//         () => (
//             <View style={styles.detailsRow}>
//                 <View style={styles.detailItem}>
//                     <MapPin size={16} color="#666" />
//                     <Text type="body" >{offer?.distance} km away</Text>
//                 </View>
//                 <View style={styles.detailItem}>
//                     <Clock size={16} color="#666" />
//                     <Text type="body" >ETA {offer?.eta} min</Text>
//                 </View>
//             </View>
//         ),
//         [offer?.distance, offer.eta]
//     );

//     // Timer color gradient (green → orange → red)
//     const timerColor =
//         timeLeft > 10 ? "#22c55e" : timeLeft > 5 ? "#f59e0b" : "#ef4444";

//     return (
//         <View style={[notFromMap ? styles.card1 : styles.card]}>
//             <View style={styles.header}>
//                 <LinearGradient
//                     colors={["#2563EB", "#F97316"]}
//                     start={{ x: 0, y: 0 }}
//                     end={{ x: 1, y: 1 }}
//                     style={[styles.avatarContainer, notFromMap && { height: moderateScale(32), width: moderateScale(32), borderRadius: 16 }]}
//                 >
//                     <User size={notFromMap ? 16 : 24} color="#fff" />
//                 </LinearGradient>

//                 <View style={styles.vendorInfo}>
//                     <Text type={notFromMap ? "body2" : "bodySemiBold"} >{offer?.name || "Masood Ahmed"}</Text>
//                     <View style={styles.ratingContainer}>
//                         <Star size={14} color="#FFA500" fill="#FFA500" />
//                         <Text type="body">{offer?.rating || 4.5}</Text>
//                     </View>
//                 </View>

//                 {
//                     !notFromMap && (
//                         <View style={styles.priceContainer}>
//                             <Text type="body">Quote</Text>
//                             <Text type="body" style={styles.priceValue}>AED {offer?.price}</Text>
//                         </View>
//                     )
//                 }
//             </View>

//             {!notFromMap ? details : null}

//             {!isAccepted &&
//                 <>
//                     <View style={[styles.timerContainer2]}>
//                         <Text style={[styles.timerText, { color: timerColor }]}>
//                             Expires in {timeLeft}s
//                         </Text>
//                     </View>

//                     {/* Timer bar */}
//                     <View style={[styles.timerContainer, { marginBottom: 12 }]}>
//                         <Animated.View
//                             style={[
//                                 styles.timerBar,
//                                 {
//                                     width: progressWidth,
//                                     backgroundColor: progressColor,
//                                 },
//                             ]}
//                         />
//                     </View>
//                 </>
//             }
//             {/* <Text style={styles.timerText}>{timeLeft}s left</Text> */}

//             {isAccepted || notFromMap ? (
//                 <View style={styles.actionRow}>
//                     <TouchableOpacity onPress={handleCall} style={styles.flexButton}>
//                         <LinearGradient
//                             colors={["#2563EB", "#F97316"]}
//                             start={{ x: 0, y: 0 }}
//                             end={{ x: 1, y: 1 }}
//                             style={styles.gradientBorder}
//                         >
//                             <View style={styles.outlineInner}>
//                                 <Phone size={15} color="#F97316" />
//                                 <Text type="body2" style={styles.outlineText}>Call</Text>
//                             </View>
//                         </LinearGradient>
//                     </TouchableOpacity>

//                     <TouchableOpacity onPress={handleWhatsApp} style={styles.flexButton}>
//                         <LinearGradient
//                             colors={["#2563EB", "#F97316"]}
//                             start={{ x: 0, y: 0 }}
//                             end={{ x: 1, y: 1 }}
//                             style={styles.gradientBorder}
//                         >
//                             <View style={styles.outlineInner}>
//                                 <MessageCircle size={15} color="#F97316" />
//                                 <Text type="body2" style={styles.outlineText}>WhatsApp</Text>
//                             </View>
//                         </LinearGradient>
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
// });

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
//     card1: {
//         backgroundColor: "#fff",
//         borderRadius: 12,
//         padding: 16,
//         marginBottom: 12,
//         // shadowColor: "#000",
//         // shadowOffset: { width: 0, height: 2 },
//         // shadowOpacity: 0.1,
//         // shadowRadius: 4,
//         // elevation: 3,
//     },
//     header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
//     avatarContainer: {
//         width: 48,
//         height: 48,
//         borderRadius: 24,
//         // backgroundColor: "#007AFF",
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
//     timerContainer2: { alignItems: "flex-end", marginBottom: 8 },
//     timerContainer: {
//         height: 6,
//         width: "100%",
//         backgroundColor: "#eee",
//         borderRadius: 6,
//         overflow: "hidden",
//         marginTop: 6,
//     },
//     timerBar: {
//         height: "100%",
//         borderRadius: 6,
//     },
//     timerText: { fontSize: 14, fontWeight: "600" },
//     acceptButton: {
//         backgroundColor: "#007AFF",
//         borderRadius: 8,
//         paddingVertical: 12,
//         alignItems: "center",
//     },
//     acceptButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
//     actionButton: {
//         flex: 1,
//         flexDirection: "row",
//         alignItems: "center",
//         justifyContent: "center",
//         paddingVertical: 12,
//         borderRadius: 8,
//         gap: 6,
//     },
//     actionRow: {
//         flexDirection: "row",
//         gap: 10,
//         alignItems: "stretch", // ⭐ ensures both children stretch vertically & horizontally
//     },

//     flexButton: {
//         flex: 1, // ⭐ forces both buttons equal width
//     },

//     gradientBorder: {
//         flex: 1,
//         height: moderateScale(48),
//         padding: moderateScale(2),
//         borderRadius: 10,
//     },

//     outlineInner: {
//         flex: 1, // ⭐ fill available space
//         flexDirection: "row",
//         alignItems: "center",
//         justifyContent: "center",
//         paddingVertical: 10,
//         borderRadius: 8,
//         backgroundColor: "#fff",
//         gap: 6,
//     },

//     outlineText: {
//         // fontSize: 14,
//         fontWeight: "600",
//         color: "#F97316",
//     },

//     actionText: { color: "#fff", fontWeight: "600", fontSize: 15 },
//     // timerBar: {
//     //     height: "10%",
//     //     borderRadius: 6,
//     // },
// });



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
