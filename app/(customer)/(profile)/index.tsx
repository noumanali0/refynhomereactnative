// app/(customer)/(profile)/index.tsx
import React, { useState, useEffect } from "react";
import {
    View,
    Image,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GradientBorder } from "@/components/common/GradientBorder";
import { ProfileOption } from "@/components/common/ProfileOption";
import useImagePicker from "@/hooks/useImagePicker";
import { moderateScale } from "react-native-size-matters";
import AppHeader from "@/components/common/AppHeader";
import Text from "@/components/common/Text";
import { useAppDispatch, useAppSelector } from "@/hooks/useAppDispatch";
import { logoutUser, fetchUserProfile } from "@/store/slices/authSlice";
import { COLORS } from "@/constants/colors";

export default function ProfileScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { imageUri, pickImage } = useImagePicker();
    const [deleteModal, setDeleteModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Get user from Redux store
    const { user, isLoading } = useAppSelector((state) => state.auth);

    // Fetch latest profile on mount
    useEffect(() => {
        dispatch(fetchUserProfile());
    }, [dispatch]);

    // Get user display info
    const userName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
    const userPhone = user?.phone || user?.phoneNumber || '';
    const userProfilePhoto = user?.profilePhoto || imageUri;

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setIsLoggingOut(true);
                            await dispatch(logoutUser()).unwrap();
                            // Navigation will be handled by _layout.tsx automatically
                            router.replace("/(auth)/login");
                        } catch (error: any) {
                            Alert.alert("Logout Failed", error.message || "Failed to logout");
                        } finally {
                            setIsLoggingOut(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteAccount = () => {
        setDeleteModal(false);
        // Add your delete account logic here
        console.log("Account deleted");
    };

    return (
        <View style={styles.container}>
            <AppHeader />
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header with Gradient Background */}
                <LinearGradient
                    colors={["#2563EB", "#F97316"]}
                    // colors={["#667eea", "#764ba2"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    {/* Avatar Section */}
                    <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                        <GradientBorder radius={60} style={styles.avatarBorder}>
                            <View style={styles.avatarInner}>
                                {userProfilePhoto ? (
                                    <Image source={{ uri: userProfilePhoto }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.placeholderAvatar}>
                                        <Ionicons name="person" size={50} color="#fff" />
                                    </View>
                                )}
                            </View>
                        </GradientBorder>

                        <LinearGradient
                            colors={["#f59e0b", "#d97706"]}
                            style={styles.editIcon}
                        >
                            <Ionicons name="pencil" size={16} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>

                    {isLoading ? (
                        <ActivityIndicator size="small" color={COLORS.white} style={{ marginVertical: 10 }} />
                    ) : (
                        <>
                            <Text type="body2" style={styles.name}>{userName}</Text>
                            <Text type="body" style={styles.email}>{userPhone}</Text>
                            {user?.city && (
                                <Text type="body" style={styles.email}>{user.city}</Text>
                            )}
                        </>
                    )}
                </LinearGradient>

                {/* Profile Settings Section */}
                <View style={styles.section}>
                    <Text type="body2" style={styles.sectionLabel}>Profile Settings</Text>

                    <ProfileOption
                        label="Update Profile"
                        icon={<Ionicons name="person-outline" size={22} color="#6366f1" />}
                        onPress={() => router.push("/(customer)/(profile)/edit-profile")}
                        gradient
                    />

                    <ProfileOption
                        label="Manage Address"
                        icon={<Ionicons name="location-outline" size={22} color="#8b5cf6" />}
                        onPress={() => router.push("/(customer)/(profile)/manage-address")}
                        gradient
                    />

                    {/* <ProfileOption
                        label="Change Password"
                        icon={<Ionicons name="lock-closed-outline" size={22} color="#ec4899" />}
                        onPress={() => router.push("/(customer)/(profile)/change-password")}
                        gradient
                    /> */}
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text type="body2" style={styles.sectionLabel}>Account</Text>

                    <ProfileOption
                        label={isLoggingOut ? "Logging out..." : "Logout"}
                        icon={<Ionicons name="log-out-outline" size={22} color="#f59e0b" />}
                        onPress={handleLogout}
                        disabled={isLoggingOut}
                    />

                    <ProfileOption
                        label="Delete Account"
                        icon={<Ionicons name="trash-outline" size={22} color="#ef4444" />}
                        onPress={() => setDeleteModal(true)}
                        danger
                    />
                </View>
            </ScrollView>

            {/* Delete Account Modal */}
            <Modal visible={deleteModal} transparent animationType="fade">
                <View style={styles.modalWrapper}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalIconContainer}>
                            <Ionicons name="warning" size={40} color="#ef4444" />
                        </View>

                        <Text type="title" style={styles.modalTitle}>Delete Account?</Text>
                        <Text type="body2" style={styles.modalText}>
                            This action is permanent and cannot be undone. All your data will be lost.
                        </Text>

                        <View style={styles.modalBtns}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setDeleteModal(false)}
                            >
                                <Text type="body2" style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={handleDeleteAccount}
                            >
                                <Text type="body2" style={styles.deleteText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9ff",
    },

    // Header with Gradient
    headerGradient: {
        paddingTop: moderateScale(30),
        paddingBottom: moderateScale(30),
        alignItems: "center",
    },

    // Avatar
    avatarWrapper: {
        alignSelf: "center",
        marginBottom: moderateScale(16),
        position: "relative",
    },
    avatarBorder: {
        width: moderateScale(120),
        height: moderateScale(120),
    },
    avatarInner: {
        flex: 1,
        borderRadius: moderateScale(56),
        overflow: "hidden",
        backgroundColor: "#fff",
    },
    avatar: {
        width: "100%",
        height: "100%",
    },
    placeholderAvatar: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "gray",
        zIndex: -1
    },
    editIcon: {
        position: "absolute",
        bottom: 4,
        right: 4,
        padding: 10,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    name: {
        fontSize: moderateScale(24),
        fontWeight: "600",
        color: "#fff",
        marginBottom: 4,
    },
    email: {
        // fontSize: moderateScale(14),
        color: "rgba(255,255,255,0.8)",
    },

    // Section
    section: {
        paddingHorizontal: moderateScale(16),
        paddingTop: moderateScale(24),
        borderTopLeftRadius: moderateScale(30),
        borderTopRightRadius: moderateScale(30)
    },
    sectionLabel: {
        // fontSize: moderateScale(16),
        fontWeight: "600",
        color: "#1f2937",
        marginBottom: moderateScale(12),
        paddingLeft: moderateScale(4),
    },

    // Delete Modal
    modalWrapper: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: moderateScale(20),
    },
    modalBox: {
        width: "100%",
        maxWidth: moderateScale(400),
        backgroundColor: "#fff",
        padding: moderateScale(24),
        borderRadius: moderateScale(24),
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: moderateScale(8),
        elevation: 8,
    },
    modalIconContainer: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(40),
        backgroundColor: "#fee2e2",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        marginBottom: moderateScale(16),
    },
    modalTitle: {
        // fontSize: 22,
        // fontWeight: "700",
        color: "#1f2937",
        textAlign: "center",
        marginBottom: moderateScale(8),
    },
    modalText: {
        // fontSize: 14,
        color: "#6b7280",
        textAlign: "center",
        lineHeight: moderateScale(20),
    },
    modalBtns: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: moderateScale(24),
        gap: moderateScale(12),
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: moderateScale(14),
        paddingHorizontal: moderateScale(20),
        borderRadius: moderateScale(12),
        backgroundColor: "#f3f4f6",
        alignItems: "center",
    },
    cancelText: {
        fontSize: 16,
        // fontWeight: "400",
        color: "#4b5563",
    },
    deleteBtn: {
        flex: 1,
        paddingVertical: moderateScale(14),
        paddingHorizontal: moderateScale(20),
        borderRadius: moderateScale(12),
        backgroundColor: "#ef4444",
        alignItems: "center",
    },
    deleteText: {
        fontSize: 16,
        // fontWeight: "600",
        color: "#fff",
    },
});
// import React from "react";
// import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
// import { LinearGradient } from "expo-linear-gradient";
// import { User, LogOut, Trash2, Edit3, Camera } from "lucide-react-native";

// export default function CustomerProfileScreen() {
//     return (
//         <View style={styles.container}>
//             {/* Header */}
//             <LinearGradient colors={["#2563EB", "#F97316"]} style={styles.header}>
//                 <Text style={styles.headerTitle}>My Profile</Text>
//             </LinearGradient>

//             {/* Profile Picture */}
//             <View style={styles.avatarWrapper}>
//                 <Image
//                     source={{ uri: "https://via.placeholder.com/150" }}
//                     style={styles.avatar}
//                 />
//                 <TouchableOpacity style={styles.cameraBtn}>
//                     <Camera size={18} color="#fff" />
//                 </TouchableOpacity>
//             </View>

//             {/* User Info */}
//             <View style={styles.infoBox}>
//                 <Text style={styles.name}>John Doe</Text>
//                 <Text style={styles.email}>john.doe@example.com</Text>
//             </View>

//             {/* Actions */}
//             <View style={styles.actions}>
//                 {/* Update Profile */}
//                 <TouchableOpacity style={styles.actionCard}>
//                     <LinearGradient colors={["#2563EB", "#F97316"]} style={styles.iconWrapper}>
//                         <Edit3 size={22} color="#fff" />
//                     </LinearGradient>
//                     <Text style={styles.actionLabel}>Update Profile</Text>
//                 </TouchableOpacity>

//                 {/* Logout */}
//                 <TouchableOpacity style={styles.actionCard}>
//                     <LinearGradient colors={["#2563EB", "#F97316"]} style={styles.iconWrapper}>
//                         <LogOut size={22} color="#fff" />
//                     </LinearGradient>
//                     <Text style={styles.actionLabel}>Logout</Text>
//                 </TouchableOpacity>

//                 {/* Delete Account */}
//                 <TouchableOpacity style={styles.deleteCard}>
//                     <Trash2 size={22} color="#EF4444" />
//                     <Text style={styles.deleteLabel}>Delete Account</Text>
//                 </TouchableOpacity>
//             </View>
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: "#F8FAFC",
//     },
//     header: {
//         height: 130,
//         justifyContent: "flex-end",
//         padding: 20,
//         borderBottomLeftRadius: 22,
//         borderBottomRightRadius: 22,
//     },
//     headerTitle: {
//         color: "#fff",
//         fontSize: 22,
//         fontWeight: "700",
//     },
//     avatarWrapper: {
//         alignSelf: "center",
//         marginTop: -50,
//     },
//     avatar: {
//         width: 100,
//         height: 100,
//         borderRadius: 50,
//         borderWidth: 4,
//         borderColor: "#fff",
//     },
//     cameraBtn: {
//         position: "absolute",
//         bottom: 0,
//         right: 0,
//         backgroundColor: "#2563EB",
//         padding: 8,
//         borderRadius: 20,
//     },
//     infoBox: {
//         marginTop: 20,
//         alignItems: "center",
//     },
//     name: {
//         fontSize: 20,
//         fontWeight: "700",
//         color: "#0F172A",
//     },
//     email: {
//         fontSize: 14,
//         color: "#475569",
//         marginTop: 4,
//     },
//     actions: {
//         marginTop: 30,
//         paddingHorizontal: 20,
//         gap: 14,
//     },
//     actionCard: {
//         flexDirection: "row",
//         alignItems: "center",
//         backgroundColor: "#fff",
//         padding: 14,
//         borderRadius: 14,
//         gap: 14,
//         elevation: 2,
//         shadowColor: "#000",
//         shadowOpacity: 0.05,
//         shadowRadius: 4,
//     },
//     iconWrapper: {
//         width: 42,
//         height: 42,
//         borderRadius: 10,
//         justifyContent: "center",
//         alignItems: "center",
//     },
//     actionLabel: {
//         fontSize: 16,
//         fontWeight: "600",
//         color: "#0F172A",
//     },
//     deleteCard: {
//         flexDirection: "row",
//         alignItems: "center",
//         padding: 14,
//         borderRadius: 14,
//         backgroundColor: "#fff",
//         gap: 14,
//         borderWidth: 1,
//         borderColor: "#FCA5A5",
//     },
//     deleteLabel: {
//         fontSize: 16,
//         fontWeight: "600",
//         color: "#EF4444",
//     },
// });
