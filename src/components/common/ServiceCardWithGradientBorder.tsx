import React, { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// Types for props
interface ServiceCardContainerProps {
    children: ReactNode;
    borderRadius?: number;
    padding?: number;
}

export const ServiceCardContainer = ({
    children,
    borderRadius = 18,
    padding = 16,
}: ServiceCardContainerProps) => {
    const borderWidth = 2; // gradient border thickness

    return (
        <LinearGradient
            colors={["#2563EB", "#F97316"]}     // 🔥 your gradient theme
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
                styles.gradientBorder,
                {
                    borderRadius: borderRadius,
                    padding: borderWidth,
                },
            ]}
        >
            <View
                style={[
                    styles.innerCard,
                    {
                        borderRadius: borderRadius - borderWidth,
                        padding: padding,
                    },
                ]}
            >
                {children}
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradientBorder: {
        marginBottom: 16,
    },
    innerCard: {
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 6, // Android shadow
    },
});
