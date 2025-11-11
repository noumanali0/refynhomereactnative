import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";

interface RatingModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function RatingModal({ visible, onClose }: RatingModalProps) {
    const navigation = useNavigation();
    const [rating, setRating] = useState<number>(0);
    const [review, setReview] = useState<string>("");
    const [submitted, setSubmitted] = useState<boolean>(false);

    const fadeAnim = new Animated.Value(0);

    const handleRate = (value: number) => setRating(value);

    const handleSubmit = () => {
        if (rating === 0) return;

        // Here you could call your API:
        // await submitReview({ rating, review });

        setSubmitted(true);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start(() => {
            setTimeout(() => {
                onClose();
                navigation.goBack();
            }, 1000);
        });
    };

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {!submitted ? (
                        <>
                            <Text style={styles.title}>Rate Your Experience</Text>

                            <View style={styles.starContainer}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity key={star} onPress={() => handleRate(star)}>
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
                            />

                            <TouchableOpacity
                                onPress={handleSubmit}
                                style={[
                                    styles.button,
                                    { backgroundColor: rating > 0 ? "#2563EB" : "#9CA3AF" },
                                ]}
                                disabled={rating === 0}
                            >
                                <Text style={styles.buttonText}>Submit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
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
};

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
        marginBottom: 16,
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


