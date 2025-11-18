import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { VendorOffer } from "../../src/store/slices/offersSlice";
import { VendorOfferCard } from "../../src/components/customer/VendorOfferCard";
import { AppState } from "react-native";
import { removeOfferNotification } from "../../src/utils/notifications";

const TIMER_DURATION = 20; // seconds per offer

interface OffersListProps {
    offers: VendorOffer[];
    onAccept: (offer: VendorOffer) => void;
    onExpire: (offerId: string) => void;
}

export const OffersList: React.FC<OffersListProps> = ({
    offers,
    onAccept,
    onExpire,
}) => {
    const [timers, setTimers] = useState<Record<string, number>>({});
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const expiredQueue = useRef<string[]>([]); // ✅ holds expired offer IDs temporarily

    // Initialize timers for new offers and clean removed ones
    useEffect(() => {
        setTimers((prev) => {
            const updated = { ...prev };

            // add timers for new offers
            offers.forEach((offer) => {
                if (!updated[offer.id]) updated[offer.id] = TIMER_DURATION;
            });

            // remove timers for offers that disappeared
            Object.keys(updated).forEach((id) => {
                if (!offers.some((o) => o.id === id)) delete updated[id];
            });

            return updated;
        });
    }, [offers]);

    // Countdown timer loop
    useEffect(() => {
        let appState = AppState.currentState;
        let lastBackgroundTime = 0;

        const subscription = AppState.addEventListener("change", (nextState) => {
            if (appState.match(/active/) && nextState === "background") {
                // App going to background
                lastBackgroundTime = Date.now();
            }

            if (appState.match(/background|inactive/) && nextState === "active") {
                // App coming back → adjust timers
                const elapsedSeconds = Math.floor((Date.now() - lastBackgroundTime) / 1000);
                if (elapsedSeconds > 0) {
                    setTimers((prev) => {
                        const updated = { ...prev };
                        Object.keys(updated).forEach((id) => {
                            updated[id] = Math.max(updated[id] - elapsedSeconds, 0);
                            if (updated[id] <= 0) {
                                onExpire(id)
                                removeOfferNotification(id);
                            }
                        });
                        return updated;
                    });
                }
            }

            appState = nextState;
        });

        return () => subscription.remove();
    }, [onExpire]);

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            setTimers((prev) => {
                const updated = { ...prev };
                Object.keys(updated).forEach((id) => {
                    updated[id] = (updated[id] || TIMER_DURATION) - 1;
                    if (updated[id] <= 0) {
                        onExpire(id);
                        removeOfferNotification(id); // 👈 remove its notification
                        delete updated[id];
                    }
                });
                return updated;
            });
        }, 1000);

        return () => clearInterval(intervalRef.current!);
    }, [onExpire]);

    // useEffect(() => {
    //     if (intervalRef.current) clearInterval(intervalRef.current);

    //     intervalRef.current = setInterval(() => {
    //         setTimers((prev) => {
    //             const updated = { ...prev };
    //             Object.keys(updated).forEach((id) => {
    //                 updated[id] = (updated[id] || TIMER_DURATION) - 1;
    //                 if (updated[id] <= 0) {
    //                     onExpire(id); // remove from Redux
    //                     delete updated[id];
    //                 }
    //             });
    //             return updated;
    //         });
    //     }, 1000);

    //     return () => clearInterval(intervalRef.current!);
    // }, [onExpire]);

    // ✅ Safely trigger parent updates after render
    useEffect(() => {
        if (expiredQueue.current.length > 0) {
            const toExpire = [...expiredQueue.current];
            expiredQueue.current = [];
            toExpire.forEach((id) => onExpire(id));
        }
    });

    // UI: Empty state
    if (!offers || offers.length === 0) {
        return (
            <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.emptyText}>
                    Nearby vendors are reviewing your request...
                </Text>
            </View>
        );
    }

    // UI: Offers list
    return (
        <View>
            {/* <Text style={styles.sheetTitle}>
                {offers.length} Offers Received
            </Text> */}
            {offers.map((offer) => (
                <VendorOfferCard
                    key={offer.id}
                    offer={offer}
                    onAccept={onAccept}
                    timeLeft={timers[offer.id] ?? TIMER_DURATION}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    sheetTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111",
        marginBottom: 8,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 32,
    },
    emptyText: {
        color: "#666",
        marginTop: 8,
    },
});



// import React, { useEffect, useState, useRef, useCallback } from "react";
// import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
// import { VendorOffer } from "../../src/store/slices/offersSlice";
// import { VendorOfferCard } from "../../src/components/customer/VendorOfferCard";
// // import { VendorOfferCard } from "./VendorOfferCard";
// // import { VendorOffer } from "../../store/slices/offersSlice";

// const TIMER_DURATION = 20; // seconds per offer

// interface OffersListProps {
//     offers: VendorOffer[];
//     onAccept: (offer: VendorOffer) => void;
//     onExpire: (offerId: string) => void; // parent handles Redux removal
// }

// export const OffersList: React.FC<OffersListProps> = ({ offers, onAccept, onExpire }) => {
//     const [timers, setTimers] = useState<{ [key: string]: number }>({});
//     const intervalRef = useRef<NodeJS.Timeout | null>(null);

//     // Initialize timers for new offers
//     useEffect(() => {
//         setTimers((prev) => {
//             const updated = { ...prev };
//             offers.forEach((offer) => {
//                 if (!updated[offer.id]) updated[offer.id] = TIMER_DURATION;
//             });
//             return updated;
//         });
//     }, [offers]);

//     // Countdown logic (independent per offer)
//     useEffect(() => {
//         if (intervalRef.current) clearInterval(intervalRef.current);

//         intervalRef.current = setInterval(() => {
//             setTimers((prev) => {
//                 const updated = { ...prev };
//                 Object.keys(updated).forEach((id) => {
//                     if (updated[id] > 0) {
//                         updated[id] -= 1;
//                         if (updated[id] <= 0) {
//                             onExpire(id); // tell parent to remove it
//                             delete updated[id];
//                         }
//                     }
//                 });
//                 return updated;
//             });
//         }, 1000);

//         return () => clearInterval(intervalRef.current!);
//     }, [onExpire]);

//     // UI rendering
//     if (!offers || offers.length === 0) {
//         return (
//             <View style={styles.emptyState}>
//                 <ActivityIndicator size="large" color="#007AFF" />
//                 <Text style={styles.emptyText}>Nearby vendors are reviewing your request...</Text>
//             </View>
//         );
//     }

//     return (
//         <View>
//             <Text style={styles.sheetTitle}>
//                 {offers.length} Offers Received
//             </Text>

//             {offers.map((offer) => (
//                 <VendorOfferCard
//                     key={offer.id}
//                     offer={offer}
//                     onAccept={onAccept}
//                     timeLeft={timers[offer.id] ?? TIMER_DURATION}
//                 />
//             ))}
//         </View>
//     );
// };

// const styles = StyleSheet.create({
//     sheetTitle: {
//         fontSize: 16,
//         fontWeight: "600",
//         color: "#111",
//         marginBottom: 8,
//     },
//     emptyState: {
//         alignItems: "center",
//         justifyContent: "center",
//         paddingVertical: 32,
//     },
//     emptyText: {
//         color: "#666",
//         marginTop: 8,
//     },
// });
