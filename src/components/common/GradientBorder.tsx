// components/GradientBorder.tsx
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";

interface Props {
    children?: React.ReactNode;
    radius?: number;
    style?: StyleProp<ViewStyle>;
}

export const GradientBorder: React.FC<Props> = ({ children, radius = 12, style }) => {
    return (
        <LinearGradient
            colors={["#2563EB", "#F97316"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, { borderRadius: radius }, style]}
        >
            <View style={[styles.inner, { borderRadius: radius - 2 }]}>
                {children}
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradient: {
        padding: 2,
    },
    inner: {
        backgroundColor: "#fff",
        flex: 1,
    },
});


// import { LinearGradient } from "expo-linear-gradient";
// import React from "react";
// import { View, StyleSheet } from "react-native";

// export const GradientBorder = ({ children, radius = 14, padding = 2 }) => {
//     return (
//         <LinearGradient
//             colors={["#2563EB", "#F97316"]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             style={[styles.border, { borderRadius: radius, padding }]}
//         >
//             <View style={[styles.inner, { borderRadius: radius - padding }]}>
//                 {children}
//             </View>
//         </LinearGradient>
//     );
// };

// const styles = StyleSheet.create({
//     border: {},
//     inner: {
//         backgroundColor: "#fff",
//         flex: 1,
//     },
// });
