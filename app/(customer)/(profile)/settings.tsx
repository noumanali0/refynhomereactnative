// app/(customer)/(profile)/settings.tsx
/**
 * Customer Settings Screen
 *
 * Settings screen with notifications, privacy & security,
 * and account management (deactivate/delete).
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { SettingItem } from '@/components/vendor/SettingItem';
import { COLORS } from '@/constants/colors';
import Text from '@/components/common/Text';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { deleteAccount, changePassword, deactivateAccount } from '@/store/slices/authSlice';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '@/contexts/ToastContext';

// Storage key for notification preference
const PUSH_NOTIFICATION_KEY = 'customer_push_notifications';

export default function CustomerSettingsScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { showToast } = useToast();

    // Notification Settings
    const [pushNotifications, setPushNotifications] = useState(false);
    const [isLoadingNotificationPref, setIsLoadingNotificationPref] = useState(true);

    // Delete account state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
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

    // Deactivate account state
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [deactivatePassword, setDeactivatePassword] = useState('');
    const [isDeactivating, setIsDeactivating] = useState(false);
    const [deactivateError, setDeactivateError] = useState<string | null>(null);
    const [showDeactivatePassword, setShowDeactivatePassword] = useState(false);

    // Load notification preference on mount
    useEffect(() => {
        loadNotificationPreference();
    }, []);

    const loadNotificationPreference = async () => {
        try {
            const stored = await AsyncStorage.getItem(PUSH_NOTIFICATION_KEY);
            if (stored !== null) {
                setPushNotifications(stored === 'true');
            } else {
                // Check if permissions are already granted
                const { status } = await Notifications.getPermissionsAsync();
                setPushNotifications(status === 'granted');
            }
        } catch (error) {
            console.error('[Settings] Error loading notification preference:', error);
        } finally {
            setIsLoadingNotificationPref(false);
        }
    };

    const handlePushNotificationToggle = async (enabled: boolean) => {
        if (enabled) {
            // Request notification permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                showToast({
                    type: 'warning',
                    title: 'Permission Required',
                    message: 'Please enable notifications in your device settings to receive push notifications.',
                });
                return;
            }

            // Get push token (for future use with backend)
            if (Platform.OS !== 'web') {
                try {
                    const token = await Notifications.getExpoPushTokenAsync();
                    if (__DEV__) {
                        console.log('[Settings] Push token:', token.data);
                    }
                } catch (error) {
                    console.error('[Settings] Error getting push token:', error);
                }
            }
        }

        // Update state and persist
        setPushNotifications(enabled);
        await AsyncStorage.setItem(PUSH_NOTIFICATION_KEY, String(enabled));

        if (__DEV__) {
            console.log('[Settings] Push notifications:', enabled ? 'enabled' : 'disabled');
        }
    };

    const handleOpenPasswordModal = () => {
        setShowPasswordModal(true);
    };

    const handlePrivacy = () => {
        showToast({ type: 'info', title: 'Privacy Policy', message: 'View privacy policy coming soon!' });
    };

    const handleOpenDeactivateModal = () => {
        setShowDeactivateModal(true);
    };

    const handleConfirmDeactivate = async () => {
        if (!deactivatePassword.trim()) {
            setDeactivateError('Please enter your password');
            return;
        }

        setIsDeactivating(true);
        setDeactivateError(null);

        try {
            await dispatch(deactivateAccount(deactivatePassword)).unwrap();
            setShowDeactivateModal(false);
            // Navigation is handled by _layout.tsx automatically when isAuthenticated becomes false
        } catch (error: any) {
            const message = typeof error === 'string'
                ? error
                : error?.message || 'Failed to deactivate account';
            setDeactivateError(message);
        } finally {
            setIsDeactivating(false);
        }
    };

    const handleCloseDeactivateModal = () => {
        setShowDeactivateModal(false);
        setDeactivatePassword('');
        setDeactivateError(null);
        setShowDeactivatePassword(false);
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
            handleClosePasswordModal();
            showToast({ type: 'success', title: 'Success', message: 'Password changed successfully' });
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

    const handleDeleteAccount = () => {
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        // Validate password
        if (!deletePassword.trim()) {
            setDeleteError('Please enter your password');
            return;
        }

        setIsDeleting(true);
        setDeleteError(null);

        try {
            await dispatch(deleteAccount(deletePassword)).unwrap();

            // Success - close modal
            setShowDeleteModal(false);
            setDeletePassword('');
            // Navigation is handled by _layout.tsx automatically when isAuthenticated becomes false
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
        setShowDeleteModal(false);
        setDeletePassword('');
        setDeleteError(null);
        setShowDeletePassword(false);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text type="title" style={styles.headerTitle}>Settings</Text>
                    <View style={styles.headerSpacer} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Notifications Section */}
                <View style={styles.section}>
                    <Text type="title" style={styles.sectionTitle}>Notifications</Text>
                    <View style={styles.settingsGroup}>
                        <SettingItem
                            icon="notifications-outline"
                            label="Push Notifications"
                            subtitle="Get instant alerts on your device"
                            type="toggle"
                            value={pushNotifications}
                            onValueChange={handlePushNotificationToggle}
                            disabled={isLoadingNotificationPref}
                            showDivider={false}
                        />
                    </View>
                </View>

                {/* Privacy & Security Section */}
                <View style={styles.section}>
                    <Text type="title" style={styles.sectionTitle}>Privacy & Security</Text>
                    <View style={styles.settingsGroup}>
                        <SettingItem
                            icon="key-outline"
                            label="Change Password"
                            subtitle="Update your account password"
                            type="navigation"
                            onPress={handleOpenPasswordModal}
                        />
                        <SettingItem
                            icon="document-text-outline"
                            label="Data & Privacy"
                            subtitle="View our privacy policy"
                            type="navigation"
                            onPress={handlePrivacy}
                            showDivider={false}
                        />
                    </View>
                </View>

                {/* Danger Zone Section */}
                <View style={styles.section}>
                    <Text type="title" style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
                    <View style={styles.settingsGroup}>
                        <SettingItem
                            icon="pause-circle-outline"
                            label="Deactivate Account"
                            subtitle="Temporarily disable your account"
                            type="navigation"
                            onPress={handleOpenDeactivateModal}
                            danger
                        />
                        <SettingItem
                            icon="trash-outline"
                            label="Delete Account"
                            subtitle="Permanently remove your account"
                            type="navigation"
                            onPress={handleDeleteAccount}
                            danger
                            showDivider={false}
                        />
                    </View>
                </View>

                {/* App Version */}
                <View style={styles.versionSection}>
                    <Text type="body" style={styles.versionText}>RefynHome v1.0.0</Text>
                    <Text type="body" style={styles.versionSubtext}>© 2024 RefynHome. All rights reserved.</Text>
                </View>
            </ScrollView>

            {/* Delete Account Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={handleCloseDeleteModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <Ionicons name="warning" size={48} color={COLORS.error} />
                        </View>
                        <Text type="title" style={styles.modalTitle}>Delete Account</Text>
                        <Text type="body" style={styles.modalDescription}>
                            This action is permanent and cannot be undone. All your data, service history, and favorites will be permanently deleted.
                        </Text>
                        <Text type="body" style={styles.modalPasswordLabel}>
                            Enter your password to confirm:
                        </Text>
                        <View style={styles.passwordInputContainer}>
                            <View style={styles.passwordInputWrapper}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Enter password"
                                    placeholderTextColor={COLORS.gray400}
                                    secureTextEntry={!showDeletePassword}
                                    value={deletePassword}
                                    onChangeText={(text) => {
                                        setDeletePassword(text);
                                        setDeleteError(null);
                                    }}
                                    editable={!isDeleting}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowDeletePassword(!showDeletePassword)}
                                    disabled={isDeleting}
                                >
                                    <Ionicons
                                        name={showDeletePassword ? 'eye-off' : 'eye'}
                                        size={20}
                                        color={COLORS.gray500}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                        {deleteError && (
                            <Text type="body" style={styles.errorText}>{deleteError}</Text>
                        )}
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={handleCloseDeleteModal}
                                disabled={isDeleting}
                            >
                                <Text type="body" style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalDeleteButton,
                                    (isDeleting || !deletePassword.trim()) && styles.modalDeleteButtonDisabled
                                ]}
                                onPress={handleConfirmDelete}
                                disabled={isDeleting || !deletePassword.trim()}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <Text type="body" style={styles.modalDeleteText}>Delete</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Change Password Modal */}
            <Modal
                visible={showPasswordModal}
                transparent
                animationType="fade"
                onRequestClose={handleClosePasswordModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalIconContainer, styles.passwordIconContainer]}>
                            <Ionicons name="key" size={48} color={COLORS.primary} />
                        </View>
                        <Text type="title" style={styles.modalTitle}>Change Password</Text>
                        <Text type="body" style={styles.modalDescription}>
                            Enter your current password and choose a new secure password.
                        </Text>

                        {/* Current Password */}
                        <Text type="body" style={styles.modalPasswordLabel}>Current Password</Text>
                        <View style={styles.passwordInputContainer}>
                            <View style={styles.passwordInputWrapper}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Enter current password"
                                    placeholderTextColor={COLORS.gray400}
                                    secureTextEntry={!showCurrentPassword}
                                    value={currentPassword}
                                    onChangeText={(text) => {
                                        setCurrentPassword(text);
                                        setPasswordError(null);
                                    }}
                                    editable={!isChangingPassword}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                    disabled={isChangingPassword}
                                >
                                    <Ionicons
                                        name={showCurrentPassword ? 'eye-off' : 'eye'}
                                        size={20}
                                        color={COLORS.gray500}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* New Password */}
                        <Text type="body" style={styles.modalPasswordLabel}>New Password</Text>
                        <View style={styles.passwordInputContainer}>
                            <View style={styles.passwordInputWrapper}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Enter new password (min 8 chars)"
                                    placeholderTextColor={COLORS.gray400}
                                    secureTextEntry={!showNewPassword}
                                    value={newPassword}
                                    onChangeText={(text) => {
                                        setNewPassword(text);
                                        setPasswordError(null);
                                    }}
                                    editable={!isChangingPassword}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                    disabled={isChangingPassword}
                                >
                                    <Ionicons
                                        name={showNewPassword ? 'eye-off' : 'eye'}
                                        size={20}
                                        color={COLORS.gray500}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm New Password */}
                        <Text type="body" style={styles.modalPasswordLabel}>Confirm New Password</Text>
                        <View style={styles.passwordInputContainer}>
                            <View style={styles.passwordInputWrapper}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Confirm new password"
                                    placeholderTextColor={COLORS.gray400}
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        setPasswordError(null);
                                    }}
                                    editable={!isChangingPassword}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={isChangingPassword}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                                        size={20}
                                        color={COLORS.gray500}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {passwordError && (
                            <Text type="body" style={styles.errorText}>{passwordError}</Text>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={handleClosePasswordModal}
                                disabled={isChangingPassword}
                            >
                                <Text type="body" style={styles.modalCancelText}>Cancel</Text>
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
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <Text type="body" style={styles.changePasswordText}>Change</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Deactivate Account Modal */}
            <Modal
                visible={showDeactivateModal}
                transparent
                animationType="fade"
                onRequestClose={handleCloseDeactivateModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalIconContainer, styles.deactivateIconContainer]}>
                            <Ionicons name="pause-circle" size={48} color={COLORS.warning} />
                        </View>
                        <Text type="title" style={styles.modalTitle}>Deactivate Account</Text>
                        <Text type="body" style={styles.modalDescription}>
                            Your account will be temporarily disabled. You won't be able to log in until you reactivate your account. Your data will be preserved.
                        </Text>
                        <Text type="body" style={styles.modalPasswordLabel}>
                            Enter your password to confirm:
                        </Text>
                        <View style={styles.passwordInputContainer}>
                            <View style={styles.passwordInputWrapper}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Enter password"
                                    placeholderTextColor={COLORS.gray400}
                                    secureTextEntry={!showDeactivatePassword}
                                    value={deactivatePassword}
                                    onChangeText={(text) => {
                                        setDeactivatePassword(text);
                                        setDeactivateError(null);
                                    }}
                                    editable={!isDeactivating}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowDeactivatePassword(!showDeactivatePassword)}
                                    disabled={isDeactivating}
                                >
                                    <Ionicons
                                        name={showDeactivatePassword ? 'eye-off' : 'eye'}
                                        size={20}
                                        color={COLORS.gray500}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                        {deactivateError && (
                            <Text type="body" style={styles.errorText}>{deactivateError}</Text>
                        )}
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={handleCloseDeactivateModal}
                                disabled={isDeactivating}
                            >
                                <Text type="body" style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.deactivateBtn,
                                    (isDeactivating || !deactivatePassword.trim()) && styles.deactivateBtnDisabled
                                ]}
                                onPress={handleConfirmDeactivate}
                                disabled={isDeactivating || !deactivatePassword.trim()}
                            >
                                {isDeactivating ? (
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <Text type="body" style={styles.deactivateText}>Deactivate</Text>
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
    container: { flex: 1, backgroundColor: COLORS.gray50 },
    header: {
        paddingTop: verticalScale(50),
        paddingBottom: verticalScale(16),
        paddingHorizontal: scale(16),
        borderBottomLeftRadius: moderateScale(24),
        borderBottomRightRadius: moderateScale(24),
    },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { flex: 1, textAlign: 'center', color: COLORS.white },
    headerSpacer: { width: moderateScale(40) },
    content: { flex: 1 },
    contentContainer: { paddingBottom: verticalScale(32) },
    section: { marginTop: verticalScale(24), paddingHorizontal: scale(16) },
    sectionTitle: { color: COLORS.gray900, marginBottom: verticalScale(12) },
    dangerTitle: { color: COLORS.error },
    settingsGroup: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(12),
        overflow: 'hidden',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    versionSection: { alignItems: 'center', paddingVertical: verticalScale(32) },
    versionText: { color: COLORS.gray600, marginBottom: verticalScale(4) },
    versionSubtext: { color: COLORS.gray500 },
    // Delete Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(24),
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(16),
        padding: scale(24),
        width: '100%',
        maxWidth: scale(340),
        alignItems: 'center',
    },
    modalIconContainer: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(40),
        backgroundColor: `${COLORS.error}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    modalTitle: {
        color: COLORS.gray900,
        marginBottom: verticalScale(8),
        textAlign: 'center',
    },
    modalDescription: {
        color: COLORS.gray600,
        textAlign: 'center',
        marginBottom: verticalScale(16),
        lineHeight: 20,
    },
    modalPasswordLabel: {
        color: COLORS.gray700,
        alignSelf: 'flex-start',
        marginBottom: verticalScale(8),
    },
    passwordInputContainer: {
        width: '100%',
        marginBottom: verticalScale(8),
    },
    passwordInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.gray300,
        borderRadius: moderateScale(8),
        backgroundColor: COLORS.gray50,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(12),
        fontSize: moderateScale(14),
        color: COLORS.gray900,
    },
    eyeButton: {
        padding: scale(12),
    },
    errorText: {
        color: COLORS.error,
        fontSize: moderateScale(12),
        marginBottom: verticalScale(8),
        alignSelf: 'flex-start',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: scale(12),
        marginTop: verticalScale(16),
        width: '100%',
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: verticalScale(12),
        borderRadius: moderateScale(8),
        backgroundColor: COLORS.gray100,
        alignItems: 'center',
    },
    modalCancelText: {
        color: COLORS.gray700,
        fontWeight: '600',
    },
    modalDeleteButton: {
        flex: 1,
        paddingVertical: verticalScale(12),
        borderRadius: moderateScale(8),
        backgroundColor: COLORS.error,
        alignItems: 'center',
    },
    modalDeleteButtonDisabled: {
        backgroundColor: `${COLORS.error}60`,
    },
    modalDeleteText: {
        color: COLORS.white,
        fontWeight: '600',
    },
    // Change Password Modal Styles
    passwordIconContainer: {
        backgroundColor: `${COLORS.primary}15`,
    },
    changePasswordBtn: {
        flex: 1,
        paddingVertical: verticalScale(12),
        borderRadius: moderateScale(8),
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    changePasswordBtnDisabled: {
        backgroundColor: `${COLORS.primary}60`,
    },
    changePasswordText: {
        color: COLORS.white,
        fontWeight: '600',
    },
    // Deactivate Account Modal Styles
    deactivateIconContainer: {
        backgroundColor: `${COLORS.warning}15`,
    },
    deactivateBtn: {
        flex: 1,
        paddingVertical: verticalScale(12),
        borderRadius: moderateScale(8),
        backgroundColor: COLORS.warning,
        alignItems: 'center',
    },
    deactivateBtnDisabled: {
        backgroundColor: `${COLORS.warning}60`,
    },
    deactivateText: {
        color: COLORS.white,
        fontWeight: '600',
    },
});
