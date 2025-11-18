// import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/constants/colors";
import { useAppSelector } from "@/hooks/useAppDispatch";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import React from "react";
import { View, Image, StyleSheet, Pressable } from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";
import Text from "./Text";
import { Wrench } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
    isStackScreen?: boolean;
}
export default function AppHeader({ isStackScreen = false }: Props) {
    const { user } = useAppSelector((state) => state.auth);
    const insets = useSafeAreaInsets();


    return (
        <View
            style={[
                styles.header,
                {
                    paddingTop: moderateScale(12),
                    height: insets.top + moderateScale(28),
                },
            ]}
        >
            <View
                style={{
                    borderRadius: moderateScale(20),
                    overflow: "hidden", // REQUIRED for gradient rounding
                }}
            >
                <LinearGradient
                    colors={["#2563EB", "#F97316"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: moderateScale(10),
                        gap: moderateScale(4),
                        borderRadius: moderateScale(20),
                    }}
                >
                    <Wrench color="#FFFFFF" size={16} />
                    <Text type="bodySemiBold" style={{ color: "#FFFFFF" }}>
                        REFYNHOME
                    </Text>
                </LinearGradient>
            </View>
            {/* <View
                style={{ flexDirection: "row", alignItems: "center", gap: moderateScale(4), backgroundColor: "green", padding: moderateScale(10), borderRadius: moderateScale(20) }}>
                <Wrench color={COLORS.white} size={18} />
                <Text type="title" style={{ color: COLORS.primary500 }}>REFYNHOME</Text>
            </View> */}
            {/* <Image
                source={require("../../../assets/images/logo-horizontal-white.png")}
                style={styles.logo}
                resizeMode="cover"
            /> */}
            {
                !isStackScreen && (
                    <Link href="/(customer)/(profile)" asChild>
                        <Pressable
                            style={styles.avatarWrap}
                        // onPress={() => router.push("/(tabs)/profile")}
                        >
                            {
                                user?.photoUrl ? (<>
                                    <Image
                                        source={{ uri: user?.photoUrl }}
                                        // source={require("@/assets/images/players/avatar.png")}
                                        style={styles.avatar}
                                    />
                                </>) : (<>
                                    <View style={styles.avatarPlaceholder}>
                                        <Ionicons
                                            name="person-sharp"
                                            size={moderateScale(25)}
                                            color="white"
                                        />
                                    </View>
                                </>)
                            }
                        </Pressable>
                    </Link>

                )
            }
        </View>
    );
}

const styles = StyleSheet.create({

    header: {
        height: "auto",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: moderateScale(10),
        paddingVertical: moderateScale(8),
        backgroundColor: "#FFFFFF",

        // iOS shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: moderateScale(2) },
        shadowOpacity: 0.1,
        shadowRadius: moderateScale(4),

        // Android shadow
        elevation: 3,

        // Optional (recommended for rounded headers)
        // borderRadius: moderateScale(8),
    },
    logo: {
        width: moderateScale(80),
        height: moderateScale(38),
        // backgroundColor: "red",
    },
    avatarWrap: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        overflow: "hidden",
        borderColor: "red",
    },
    avatarPlaceholder: {
        width: "100%",
        height: "100%",
        borderRadius: moderateScale(50),
        backgroundColor: "gray",
        alignItems: "center",
        justifyContent: "center",
    },
    avatar: { width: "100%", height: "100%" },
});
