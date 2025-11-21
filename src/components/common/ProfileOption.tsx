// src/components/common/ProfileOption.tsx
import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { moderateScale } from "react-native-size-matters";
import Text from "./Text";

interface Props {
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
    gradient?: boolean;
    danger?: boolean;
    disabled?: boolean;
}

export const ProfileOption: React.FC<Props> = ({
    label,
    icon,
    onPress,
    gradient = false,
    danger = false,
    disabled = false,
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.row,
                gradient && styles.rowGradient,
                danger && styles.rowDanger,
                disabled && styles.rowDisabled,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
            disabled={disabled}
        >
            {gradient && (
                <LinearGradient
                    colors={["rgba(102, 126, 234, 0.05)", "rgba(118, 75, 162, 0.05)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBg}
                />
            )}

            <View style={[styles.iconBox, danger && styles.iconBoxDanger, disabled && styles.iconBoxDisabled]}>
                {icon}
            </View>
            <Text type="body2" style={[styles.label, danger && styles.dangerText, disabled && styles.labelDisabled]}>{label}</Text>
            <Ionicons name="chevron-forward" size={20} color={disabled ? "#d1d5db80" : "#d1d5db"} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: moderateScale(16),
        paddingHorizontal: moderateScale(16),
        backgroundColor: "#fff",
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        position: "relative",
        overflow: "hidden",
        height: moderateScale(60)
    },
    rowGradient: {
        borderWidth: 1,
        borderColor: "rgba(102, 126, 234, 0.2)",
    },
    rowDanger: {
        borderColor: "rgba(239, 68, 68, 0.1)",
    },
    rowDisabled: {
        opacity: 0.5,
    },
    gradientBg: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    iconBox: {
        width: moderateScale(34),
        height: moderateScale(34),
        borderRadius: 12,
        backgroundColor: "#f0f4ff",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    iconBoxDanger: {
        backgroundColor: "#fee2e2",
    },
    iconBoxDisabled: {
        backgroundColor: "#f3f4f6",
    },
    label: {
        flex: 1,
        fontSize: moderateScale(16),
        // fontWeight: "700",
        // color: "#1f2937",
        color: "black",
    },
    dangerText: {
        color: "#ef4444",
    },
    labelDisabled: {
        color: "#9ca3af",
    },
});

// // components/ProfileOption.tsx
// import React from "react";
// import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
// import { ChevronRight } from "lucide-react-native";

// interface Props {
//     label: string;
//     icon: React.ReactNode;
//     onPress: () => void;
// }

// export const ProfileOption: React.FC<Props> = ({ label, icon, onPress }) => {
//     return (
//         <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
//             <View style={styles.iconBox}>{icon}</View>
//             <Text style={styles.label}>{label}</Text>
//             <ChevronRight size={20} color="#999" />
//         </TouchableOpacity>
//     );
// };

// const styles = StyleSheet.create({
//     row: {
//         flexDirection: "row",
//         alignItems: "center",
//         paddingVertical: 16,
//         paddingHorizontal: 10,
//         backgroundColor: "#fff",
//         borderRadius: 12,
//         marginBottom: 10,
//     },
//     iconBox: {
//         width: 38,
//         height: 38,
//         borderRadius: 10,
//         backgroundColor: "#f1f5ff",
//         justifyContent: "center",
//         alignItems: "center",
//         marginRight: 12,
//     },
//     label: {
//         flex: 1,
//         fontSize: 16,
//         fontWeight: "600",
//         color: "#222",
//     },
// });
