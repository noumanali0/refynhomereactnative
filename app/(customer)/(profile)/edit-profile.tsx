// app/(customer)/(profile)/update-profile.tsx
import React, { useState } from "react";
import {
    View,
    StyleSheet,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { moderateScale } from "react-native-size-matters";
import { COLORS } from "@/constants/colors";
import AppHeader from "@/components/common/AppHeader";
import Text from "@/components/common/Text";

export default function UpdateProfileScreen() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "Masood Ahmed",
        email: "masood@example.com",
        phone: "+92 300 1234567",
    });

    const handleUpdate = () => {
        // Add your update logic here
        Alert.alert("Success", "Profile updated successfully");
        router.back();
    };

    return (
        <View style={styles.container}>
            {/* Header with Gradient */}
            <AppHeader />
            <View
                style={styles.header}
            >
                {/* <LinearGradient
                colors={["#2563EB", "#F97316"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            > */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
                </TouchableOpacity>
                <Text type="bodySemiBold" style={styles.headerTitle}>Update Profile</Text>
                <View style={styles.placeholder} />
            </View>
            {/* </LinearGradient> */}

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.content}
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Name Field */}
                    <View style={styles.inputGroup}>
                        <Text type="body2" style={styles.inputLabel}>Full Name</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons
                                name="person-outline"
                                size={20}
                                color={COLORS.accent}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                value={formData.name}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, name: text })
                                }
                                placeholder="Enter your full name"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    {/* Email Field */}
                    <View style={styles.inputGroup}>
                        <Text type="body2" style={styles.inputLabel}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons
                                name="mail-outline"
                                size={20}
                                color={COLORS.accent}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                value={formData.email}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, email: text })
                                }
                                placeholder="Enter your email"
                                placeholderTextColor="#999"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* Phone Field */}
                    <View style={styles.inputGroup}>
                        <Text type="body2" style={styles.inputLabel}>Phone Number</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons
                                name="call-outline"
                                size={20}
                                color={COLORS.accent}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                value={formData.phone}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, phone: text })
                                }
                                placeholder="Enter your phone number"
                                placeholderTextColor="#999"
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    {/* Update Button */}
                    <TouchableOpacity
                        style={styles.updateButton}
                        onPress={handleUpdate}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={["#2563EB", "#F97316"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradientBtn}
                        >
                            <Ionicons name="checkmark" size={20} color="#fff" />
                            <Text style={styles.btnText}>Update Profile</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9ff",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: moderateScale(25),
        paddingBottom: moderateScale(20),
        paddingHorizontal: moderateScale(16),
    },
    backBtn: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",

    },
    headerTitle: {
        // fontSize: moderateScale(20),
        // fontWeight: "700",
        // color: "#fff",
        color: COLORS.gray600,
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: moderateScale(20),
    },
    inputGroup: {
        marginBottom: moderateScale(20),
    },
    inputLabel: {
        // fontSize: moderateScale(14),
        // fontWeight: "600",
        color: "#374151",
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        paddingHorizontal: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: moderateScale(50),
        fontSize: moderateScale(15),
        color: "#1f2937",
        fontFamily: "Poppins"
    },
    updateButton: {
        marginTop: moderateScale(10),
        borderRadius: 12,
        overflow: "hidden",
    },
    gradientBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: moderateScale(52),
        gap: 8,
    },
    btnText: {
        fontSize: moderateScale(16),
        fontWeight: "600",
        color: "#fff",
    },
});