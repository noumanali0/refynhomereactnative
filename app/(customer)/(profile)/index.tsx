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
    TextInput,
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
import { logoutUser, fetchUserProfile, deleteAccount, changePassword, updateUserProfile } from "@/store/slices/authSlice";
import { COLORS } from "@/constants/colors";
import { useToast } from "@/contexts/ToastContext";

export default function ProfileScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { showToast } = useToast();
    const { imageUri, pickImage } = useImagePicker();
    const [deleteModal, setDeleteModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    // Delete account state
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [showDeletePassword, setShowDeletePassword] = useState(false);

    // Change password state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Get user from Redux store
    const { user, isLoading } = useAppSelector((state) => state.auth);

    // Fetch latest profile on mount
    useEffect(() => {
        dispatch(fetchUserProfile());
    }, [dispatch]);

    // Get user display info
    const userName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
    const userPhone = user?.phone || user?.phoneNumber || '';
    // Use profilePhoto (camelCase from authService) with snake_case fallback
    const userProfilePhoto = user?.profilePhoto || (user as any)?.profile_photo_url || (user as any)?.profile_photo || imageUri;

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
                        setIsLoggingOut(true);

                        // Timeout to prevent infinite loading if logout hangs
                        const logoutTimeout = setTimeout(() => {
                            if (__DEV__) {
                                console.warn('[Profile] Logout timeout - forcing navigation');
                            }
                            setIsLoggingOut(false);
                            router.replace("/(auth)/login");
                        }, 5000); // 5 second timeout

                        try {
                            await dispatch(logoutUser()).unwrap();
                            clearTimeout(logoutTimeout);
                            // Navigation is handled by _layout.tsx automatically when isAuthenticated becomes false
                            // No need to call router.replace here - _layout.tsx will redirect to login
                        } catch (error: any) {
                            clearTimeout(logoutTimeout);
                            Alert.alert("Logout Failed", error.message || "Failed to logout");
                        } finally {
                            setIsLoggingOut(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteAccount = async () => {
        // Validate password
        if (!deletePassword.trim()) {
            setDeleteError('Please enter your password');
            return;
        }

        setIsDeleting(true);
        setDeleteError(null);

        try {
            await dispatch(deleteAccount(deletePassword)).unwrap();

            // Success - close modal and navigate to login
            setDeleteModal(false);
            setDeletePassword('');
            router.replace("/(auth)/login");
        } catch (error: any) {
            const message = typeof error === 'string'
                ? error
                : error?.message || 'Failed to delete account. Please try again.';
            setDeleteError(message);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCloseDeleteModal = () => {
        setDeleteModal(false);
        setDeletePassword('');
        setDeleteError(null);
        setShowDeletePassword(false);
    };

    const handleChangePassword = async () => {
        // Validate inputs
        if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
            setPasswordError('All fields are required');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters');
            return;
        }

        setIsChangingPassword(true);
        setPasswordError(null);

        try {
            await dispatch(changePassword({ currentPassword, newPassword })).unwrap();
            // Success - close modal and show success alert
            handleClosePasswordModal();
            Alert.alert('Success', 'Password changed successfully');
        } catch (error: any) {
            const message = typeof error === 'string'
                ? error
                : error?.message || 'Failed to change password';
            setPasswordError(message);
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleClosePasswordModal = () => {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError(null);
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    // Handle profile photo update
    const handleUpdateProfilePhoto = async () => {
        const selectedImage = await pickImage();
        console.log("🚀 ~ handleUpdateProfilePhoto ~ selectedImage:", selectedImage)

        if (selectedImage) {
            setIsUploadingPhoto(true);
            try {
                await dispatch(updateUserProfile({
                    profile_photo: selectedImage,
                })).unwrap();

                showToast({
                    type: 'success',
                    title: 'Photo Updated',
                    message: 'Your profile photo has been updated successfully',
                });
            } catch (error: any) {
                const message = typeof error === 'string'
                    ? error
                    : error?.message || 'Failed to update profile photo';
                showToast({
                    type: 'error',
                    title: 'Update Failed',
                    message: message,
                });
            } finally {
                setIsUploadingPhoto(false);
            }
        }
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
                    <TouchableOpacity
                        onPress={handleUpdateProfilePhoto}
                        style={styles.avatarWrapper}
                        disabled={isUploadingPhoto}
                    >
                        <GradientBorder radius={60} style={styles.avatarBorder}>
                            <View style={styles.avatarInner}>
                                {isUploadingPhoto ? (
                                    <View style={styles.placeholderAvatar}>
                                        <ActivityIndicator size="large" color="#fff" />
                                    </View>
                                ) : userProfilePhoto ? (
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
                            {isUploadingPhoto ? (
                                <ActivityIndicator size={12} color="#fff" />
                            ) : (
                                <Ionicons name="camera" size={16} color="#fff" />
                            )}
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

                    {/* <ProfileOption
                        label="Manage Address"
                        icon={<Ionicons name="location-outline" size={22} color="#8b5cf6" />}
                        onPress={() => router.push("/(customer)/(profile)/manage-address")}
                        gradient
                    /> */}

                    {/* <ProfileOption
                        label="Change Password"
                        icon={<Ionicons name="lock-closed-outline" size={22} color="#ec4899" />}
                        onPress={() => setShowPasswordModal(true)}
                        gradient
                    /> */}

                    <ProfileOption
                        label="Settings"
                        icon={<Ionicons name="settings-outline" size={22} color="#10b981" />}
                        onPress={() => router.push("/(customer)/(profile)/settings")}
                        gradient
                    />
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
                            This action is permanent and cannot be undone. All your data including service history and favorites will be permanently deleted.
                        </Text>

                        {/* Password Input */}
                        <View style={styles.passwordInputContainer}>
                            <Text type="body2" style={styles.passwordLabel}>
                                Enter your password to confirm:
                            </Text>
                            <View style={styles.passwordInputWrapper}>
                                <TextInput
                                    style={styles.passwordInput}
                                    value={deletePassword}
                                    onChangeText={(text) => {
                                        setDeletePassword(text);
                                        setDeleteError(null);
                                    }}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#9ca3af"
                                    secureTextEntry={!showDeletePassword}
                                    editable={!isDeleting}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowDeletePassword(!showDeletePassword)}
                                    style={styles.eyeButton}
                                >
                                    <Ionicons
                                        name={showDeletePassword ? "eye-off" : "eye"}
                                        size={20}
                                        color="#6b7280"
                                    />
                                </TouchableOpacity>
                            </View>
                            {deleteError && (
                                <Text type="caption" style={styles.errorText}>{deleteError}</Text>
                            )}
                        </View>

                        <View style={styles.modalBtns}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={handleCloseDeleteModal}
                                disabled={isDeleting}
                            >
                                <Text type="body2" style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.deleteBtn,
                                    (isDeleting || !deletePassword.trim()) && styles.deleteBtnDisabled
                                ]}
                                onPress={handleDeleteAccount}
                                disabled={isDeleting || !deletePassword.trim()}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text type="body2" style={styles.deleteText}>Delete</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Change Password Modal */}
            <Modal visible={showPasswordModal} transparent animationType="fade">
                <View style={styles.modalWrapper}>
                    <View style={styles.modalBox}>
                        <View style={[styles.modalIconContainer, { backgroundColor: '#ede9fe' }]}>
                            <Ionicons name="lock-closed" size={40} color="#8b5cf6" />
                        </View>

                        <Text type="title" style={styles.modalTitle}>Change Password</Text>
                        <Text type="body2" style={styles.modalText}>
                            Enter your current password and choose a new password.
                        </Text>

                        {/* Current Password */}
                        <View style={styles.passwordInputContainer}>
                            <Text type="body2" style={styles.passwordLabel}>Current Password</Text>
                            <View style={styles.passwordInputWrapper}>
                                <TextInput
                                    style={styles.passwordInput}
                                    value={currentPassword}
                                    onChangeText={(text) => {
                                        setCurrentPassword(text);
                                        setPasswordError(null);
                                    }}
                                    placeholder="Enter current password"
                                    placeholderTextColor="#9ca3af"
                                    secureTextEntry={!showCurrentPassword}
                                    editable={!isChangingPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                    style={styles.eyeButton}
                                >
                                    <Ionicons
                                        name={showCurrentPassword ? "eye-off" : "eye"}
                                        size={20}
                                        color="#6b7280"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* New Password */}
                        <View style={styles.passwordInputContainer}>
                            <Text type="body2" style={styles.passwordLabel}>New Password</Text>
                            <View style={styles.passwordInputWrapper}>
                                <TextInput
                                    style={styles.passwordInput}
                                    value={newPassword}
                                    onChangeText={(text) => {
                                        setNewPassword(text);
                                        setPasswordError(null);
                                    }}
                                    placeholder="Enter new password (min 8 chars)"
                                    placeholderTextColor="#9ca3af"
                                    secureTextEntry={!showNewPassword}
                                    editable={!isChangingPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                    style={styles.eyeButton}
                                >
                                    <Ionicons
                                        name={showNewPassword ? "eye-off" : "eye"}
                                        size={20}
                                        color="#6b7280"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.passwordInputContainer}>
                            <Text type="body2" style={styles.passwordLabel}>Confirm New Password</Text>
                            <View style={styles.passwordInputWrapper}>
                                <TextInput
                                    style={styles.passwordInput}
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        setPasswordError(null);
                                    }}
                                    placeholder="Confirm new password"
                                    placeholderTextColor="#9ca3af"
                                    secureTextEntry={!showConfirmPassword}
                                    editable={!isChangingPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={styles.eyeButton}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? "eye-off" : "eye"}
                                        size={20}
                                        color="#6b7280"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {passwordError && (
                            <Text type="caption" style={styles.errorText}>{passwordError}</Text>
                        )}

                        <View style={styles.modalBtns}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={handleClosePasswordModal}
                                disabled={isChangingPassword}
                            >
                                <Text type="body2" style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.changePasswordBtn,
                                    (isChangingPassword || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) && styles.changePasswordBtnDisabled
                                ]}
                                onPress={handleChangePassword}
                                disabled={isChangingPassword || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
                            >
                                {isChangingPassword ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text type="body2" style={styles.changePasswordText}>Change</Text>
                                )}
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
        fontSize: moderateScale(16),
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
        fontSize: moderateScale(16),
        // fontWeight: "600",
        color: "#fff",
    },
    deleteBtnDisabled: {
        backgroundColor: "#fca5a5",
    },

    // Password input styles
    passwordInputContainer: {
        width: "100%",
        marginTop: moderateScale(20),
    },
    passwordLabel: {
        color: "#374151",
        marginBottom: moderateScale(8),
    },
    passwordInputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        borderRadius: moderateScale(12),
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    passwordInput: {
        flex: 1,
        paddingVertical: moderateScale(14),
        paddingHorizontal: moderateScale(16),
        fontSize: moderateScale(16),
        color: "#1f2937",
    },
    eyeButton: {
        padding: moderateScale(14),
    },
    errorText: {
        color: "#ef4444",
        marginTop: moderateScale(6),
    },

    // Change Password Button Styles
    changePasswordBtn: {
        flex: 1,
        paddingVertical: moderateScale(14),
        paddingHorizontal: moderateScale(20),
        borderRadius: moderateScale(12),
        backgroundColor: "#8b5cf6",
        alignItems: "center",
    },
    changePasswordText: {
        fontSize: moderateScale(16),
        color: "#fff",
    },
    changePasswordBtnDisabled: {
        backgroundColor: "#c4b5fd",
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
