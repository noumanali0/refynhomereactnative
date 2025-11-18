import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";

interface GradientIconProps {
    name: keyof typeof Ionicons.glyphMap;
    size: number;
    colors: String[]
}

const GradientIcon: React.FC<GradientIconProps> = ({ name, size, colors }) => {
    return (
        <MaskedView
            maskElement={
                <Ionicons name={name} size={size} color="black" />
            }
        >
            <LinearGradient
                colors={colors} // Gradient colors
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: size, height: size }}
            />
        </MaskedView>
    );
};

export default GradientIcon;
