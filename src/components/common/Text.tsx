import { COLORS } from "@/constants/colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import React from "react";
import { Text as RNText, StyleSheet, TextProps } from "react-native";
// import { useThemeColor } from "@/hooks/useThemeColor";
import { moderateScale } from "react-native-size-matters";

export type ThemedTextProps = TextProps & {
    lightColor?: string;
    darkColor?: string;
    type?:
    | "body"
    | "body2"
    | "bodySemiBold"
    | "subtitle2"
    | "title"
    | "headerTitle"
    | "subtitle"
    | "link"
    | "caption"
    | "button"
    | "bodyExtraBold";
};

export default function Text({
    style,
    lightColor,
    darkColor,
    type = "body",
    ...rest
}: ThemedTextProps) {
    // pick color from theme or override via props
    const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

    return (
        <RNText
            {...rest}
            style={[
                { color, fontFamily: "Poppins" },
                typeStyles[type],
                style,
            ]}
        />
    );
}

// define your scale and weights here
const typeStyles = StyleSheet.create({
    body: {
        fontSize: moderateScale(12),
        lineHeight: moderateScale(24),
        fontFamily: "Poppins-Regular",
        color: COLORS.black,
    },
    body2: {
        fontSize: moderateScale(14),
        fontFamily: "Poppins-Regular",
        lineHeight: moderateScale(22),
        color: COLORS.black,
    },
    bodySemiBold: {
        fontSize: moderateScale(16),
        lineHeight: moderateScale(24),
        fontFamily: "Poppins-SemiBold",
    },
    bodyExtraBold: {
        fontSize: moderateScale(16),
        lineHeight: moderateScale(24),
        fontFamily: "Poppins-ExtraBold",
    },
    title: {
        fontSize: moderateScale(18),
        lineHeight: moderateScale(27),
        fontFamily: "Poppins-Bold",
        color: COLORS.black,
    },
    headerTitle: {
        fontSize: moderateScale(28),
        lineHeight: moderateScale(34),
        fontFamily: "Poppins-ExtraBold",
    },
    subtitle: {
        fontSize: moderateScale(14),
        lineHeight: moderateScale(22),
        fontFamily: "Poppins-Medium",
        color: COLORS.black,
    },
    subtitle2: {
        fontSize: moderateScale(14),
        lineHeight: moderateScale(22),
        fontFamily: "Poppins-SemiBold",
        color: COLORS.black,
    },
    link: {
        fontSize: moderateScale(12),
        // lineHeight: moderateScale(24),
        textDecorationLine: "underline",
        color: COLORS.black,
    },
    caption: {
        fontFamily: "Poppins-Bold",
        fontSize: moderateScale(12),
        lineHeight: moderateScale(18),
    },
    button: {
        fontSize: moderateScale(15),
        fontFamily: "Poppins-Bold",
    },
});
