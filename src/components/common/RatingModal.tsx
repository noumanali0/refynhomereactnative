import React, { useState, useRef, useEffect } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Animated,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@/store";
import {
    submitReview,
    selectIsSubmittingReview,
    selectReviewError,
    clearReviewState,
} from "@/store/slices/reviewSlice";

interface RatingModalProps {
    /** Whether modal is visible */
    visible: boolean;
    /** Called when modal is closed (cancel or after success) */
    onClose: () => void;
    /** Called after successful review submission */
    onSuccess?: () => void;
    /** Service request ID to rate */
    serviceRequestId: number;
    /** Vendor name to display */
    vendorName: string;
}

export default function RatingModal({
    visible,
    onClose,
    onSuccess,
    serviceRequestId,
    vendorName,
}: RatingModalProps) {
    const dispatch = useDispatch<AppDispatch>();
    const isSubmitting = useSelector(selectIsSubmittingReview);
    const submitError = useSelector(selectReviewError);

    const [rating, setRating] = useState<number>(0);
    const [review, setReview] = useState<string>("");
    const [submitted, setSubmitted] = useState<boolean>(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setRating(0);
            setReview("");
            setSubmitted(false);
            fadeAnim.setValue(0);
        }
    }, [visible, fadeAnim]);

    const handleRate = (value: number) => setRating(value);

    const handleSubmit = async () => {
        if (rating === 0 || isSubmitting) return;

        try {
            await dispatch(submitReview({
                serviceRequestId,
                stars: rating,
                feedback: review,
            })).unwrap();

            setSubmitted(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start(() => {
                setTimeout(() => {
                    dispatch(clearReviewState());
                    onSuccess?.();
                    onClose();
                }, 1000);
            });
        } catch (error) {
            // Error is handled in Redux state
            console.error('[RatingModal] Submit error:', error);
        }
    };

    const handleSkip = () => {
        dispatch(clearReviewState());
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {!submitted ? (
                        <>
                            <Text style={styles.title}>Rate Your Experience</Text>
                            <Text style={styles.subtitle}>How was your service with {vendorName}?</Text>

                            <View style={styles.starContainer}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity
                                        key={star}
                                        onPress={() => handleRate(star)}
                                        disabled={isSubmitting}
                                    >
                                        <Ionicons
                                            name={star <= rating ? "star" : "star-outline"}
                                            size={32}
                                            color={star <= rating ? "#FACC15" : "#CBD5E1"}
                                            style={styles.star}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TextInput
                                style={styles.input}
                                placeholder="Write a short review (optional)"
                                placeholderTextColor="#9CA3AF"
                                value={review}
                                onChangeText={setReview}
                                multiline
                                editable={!isSubmitting}
                            />

                            {/* Error Message */}
                            {submitError && (
                                <Text style={styles.errorText}>{submitError}</Text>
                            )}

                            <TouchableOpacity
                                onPress={handleSubmit}
                                style={[
                                    styles.button,
                                    {
                                        backgroundColor: rating > 0 && !isSubmitting
                                            ? "#2563EB"
                                            : "#9CA3AF"
                                    },
                                ]}
                                disabled={rating === 0 || isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={styles.buttonText}>Submit</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSkip}
                                style={styles.cancelBtn}
                                disabled={isSubmitting}
                            >
                                <Text style={styles.cancelText}>Skip</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <Animated.View style={[styles.successContainer, { opacity: fadeAnim }]}>
                            <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
                            <Text style={styles.successText}>Thanks for your feedback!</Text>
                        </Animated.View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

// ✅ Styles: Clean, maintainable, consistent
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "85%",
        backgroundColor: "#FFF",
        borderRadius: 16,
        paddingVertical: 24,
        paddingHorizontal: 20,
        alignItems: "center",
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 16,
        textAlign: "center",
    },
    errorText: {
        color: "#DC2626",
        fontSize: 13,
        marginTop: 8,
        textAlign: "center",
    },
    starContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 16,
    },
    star: {
        marginHorizontal: 6,
    },
    input: {
        width: "100%",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 10,
        textAlignVertical: "top",
        color: "#111827",
        fontSize: 14,
        minHeight: 80,
    },
    button: {
        width: "100%",
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 16,
    },
    buttonText: {
        color: "#FFF",
        fontWeight: "600",
        fontSize: 16,
    },
    cancelBtn: {
        marginTop: 12,
    },
    cancelText: {
        color: "#6B7280",
        fontSize: 14,
    },
    successContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
    },
    successText: {
        fontSize: 16,
        fontWeight: "500",
        color: "#16A34A",
        marginTop: 10,
    },
});


// import React, { useState } from "react";
// import {
//     Modal,
//     View,
//     Text,
//     TouchableOpacity,
//     StyleSheet,
//     GestureResponderEvent,
// } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useNavigation } from "expo-router";

// interface RatingModalProps {
//     visible: boolean;
//     onClose: (event?: GestureResponderEvent) => void;
// }

// export default function RatingModal({ visible, onClose }: RatingModalProps) {
//     const [rating, setRating] = useState<number>(0);
//     const navigation = useNavigation();

//     const handleRate = (value: number) => setRating(value);

//     const handleSubmit = () => {
//         // 🔹 Optionally send to API here
//         onClose();
//         navigation.goBack();
//     };

//     return (
//         <Modal
//             visible={visible}
//             animationType="fade"
//             transparent
//             statusBarTranslucent
//         >
//             <View style={styles.overlay}>
//                 <View style={styles.container}>
//                     <Text style={styles.title}>Rate your experience</Text>

//                     <View style={styles.starContainer}>
//                         {[1, 2, 3, 4, 5].map((star) => (
//                             <TouchableOpacity key={star} onPress={() => handleRate(star)}>
//                                 <Ionicons
//                                     name={star <= rating ? "star" : "star-outline"}
//                                     size={32}
//                                     color={star <= rating ? "#FACC15" : "#CBD5E1"}
//                                     style={styles.star}
//                                 />
//                             </TouchableOpacity>
//                         ))}
//                     </View>

//                     <TouchableOpacity
//                         onPress={handleSubmit}
//                         style={[
//                             styles.button,
//                             { backgroundColor: rating > 0 ? "#2563EB" : "#9CA3AF" },
//                         ]}
//                         disabled={rating === 0}
//                     >
//                         <Text style={styles.buttonText}>Submit</Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
//                         <Text style={styles.cancelText}>Cancel</Text>
//                     </TouchableOpacity>
//                 </View>
//             </View>
//         </Modal>
//     );
// };

// // ✅ Styles are clean, reusable, and readable
// const styles = StyleSheet.create({
//     overlay: {
//         flex: 1,
//         backgroundColor: "rgba(0,0,0,0.5)",
//         justifyContent: "center",
//         alignItems: "center",
//     },
//     container: {
//         width: "85%",
//         backgroundColor: "#FFF",
//         borderRadius: 16,
//         paddingVertical: 24,
//         paddingHorizontal: 20,
//         alignItems: "center",
//     },
//     title: {
//         fontSize: 18,
//         fontWeight: "600",
//         marginBottom: 16,
//         color: "#111827",
//     },
//     starContainer: {
//         flexDirection: "row",
//         justifyContent: "center",
//         marginVertical: 10,
//     },
//     star: {
//         marginHorizontal: 6,
//     },
//     button: {
//         width: "100%",
//         paddingVertical: 12,
//         borderRadius: 10,
//         alignItems: "center",
//         marginTop: 16,
//     },
//     buttonText: {
//         color: "#FFF",
//         fontWeight: "600",
//         fontSize: 16,
//     },
//     cancelBtn: {
//         marginTop: 12,
//     },
//     cancelText: {
//         color: "#6B7280",
//         fontSize: 14,
//     },
// });


