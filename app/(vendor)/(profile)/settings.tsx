// app/(vendor)/(profile)/settings.tsx
/**
 * Account Settings Screen
 *
 * Comprehensive settings screen with notifications, privacy,
 * business preferences, and app settings.
 */

import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { SettingItem } from '@/components/vendor/SettingItem';
import { COLORS } from '@/constants/colors';
import Text from '@/components/common/Text';

export default function AccountSettingsScreen() {
    const router = useRouter();

    // Notification Settings
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [whatsappNotifications, setWhatsappNotifications] = useState(false);
    const [smsAlerts, setSmsAlerts] = useState(true);

    // Business Settings
    const [autoAccept, setAutoAccept] = useState(false);
    const [notificationSound, setNotificationSound] = useState(true);
    const [hapticFeedback, setHapticFeedback] = useState(true);

    const handleChangePassword = () => {
        Alert.alert('Change Password', 'Password change coming soon!');
    };

    const handleTwoFactor = (enabled: boolean) => {
        if (enabled) {
            Alert.alert('Two-Factor Authentication', 'Setup 2FA coming soon!');
        }
    };

    const handlePrivacy = () => {
        Alert.alert('Privacy Policy', 'View privacy policy coming soon!');
    };

    const handleDeactivate = () => {
        Alert.alert(
            'Deactivate Account',
            'Your account will be temporarily deactivated. You can reactivate it anytime by logging in.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Deactivate', style: 'destructive', onPress: () => {
                        Alert.alert('Success', 'Account deactivated');
                    }
                },
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            '⚠️ Delete Account',
            'This action is PERMANENT and cannot be undone. All your data will be deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Forever', style: 'destructive', onPress: () => {
                        Alert.alert('Confirm Deletion', 'Type DELETE to confirm', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'I Understand', style: 'destructive' },
                        ]);
                    }
                },
            ]
        );
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
                    <Text type="title" style={styles.headerTitle}>Account Settings</Text>
                    <View style={styles.headerSpacer} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Notifications Section */}
                <View style={styles.section}>
                    <Text type="title" style={styles.sectionTitle}>Notifications</Text>
                    <View style={styles.settingsGroup}>
                        <SettingItem
                            icon="mail-outline"
                            label="Email Notifications"
                            subtitle="Receive updates via email"
                            type="toggle"
                            value={emailNotifications}
                            onValueChange={setEmailNotifications}
                        />
                        <SettingItem
                            icon="notifications-outline"
                            label="Push Notifications"
                            subtitle="Get instant alerts on your device"
                            type="toggle"
                            value={pushNotifications}
                            onValueChange={setPushNotifications}
                        />
                        {/* <SettingItem
                            icon="logo-whatsapp"
                            label="WhatsApp Notifications"
                            subtitle="Receive updates on WhatsApp"
                            type="toggle"
                            value={whatsappNotifications}
                            onValueChange={setWhatsappNotifications}
                            badge="PREMIUM"
                            badgeColor={COLORS.warning}
                            gradient
                        />
                        <SettingItem
                            icon="chatbubble-outline"
                            label="SMS Alerts"
                            subtitle="Important updates via SMS"
                            type="toggle"
                            value={smsAlerts}
                            onValueChange={setSmsAlerts}
                            showDivider={false}
                        /> */}
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
                            onPress={handleChangePassword}
                        />
                        {/* <SettingItem
                            icon="shield-checkmark-outline"
                            label="Two-Factor Authentication"
                            subtitle="Add an extra layer of security"
                            type="toggle"
                            value={false}
                            onValueChange={handleTwoFactor}
                        /> */}
                        {/* <SettingItem
                            icon="eye-outline"
                            label="Account Visibility"
                            subtitle="Control who can see your profile"
                            type="navigation"
                            onPress={() => Alert.alert('Coming Soon')}
                            value="Public"
                        /> */}
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

                {/* Business Preferences Section */}
                {/* <View style={styles.section}>
                    <Text type="title" style={styles.sectionTitle}>Business Preferences</Text>
                    <View style={styles.settingsGroup}>
                        <SettingItem
                            icon="flash-outline"
                            label="Auto-Accept Requests"
                            subtitle="Automatically accept matching requests"
                            type="toggle"
                            value={autoAccept}
                            onValueChange={setAutoAccept}
                            badge="PRO"
                            badgeColor={COLORS.accent}
                        />
                        <SettingItem
                            icon="navigate-outline"
                            label="Maximum Travel Distance"
                            subtitle="Set your service radius"
                            type="navigation"
                            onPress={() => Alert.alert('Coming Soon')}
                            value="20 km"
                        />
                        <SettingItem
                            icon="time-outline"
                            label="Response Time Target"
                            subtitle="Your preferred response speed"
                            type="navigation"
                            onPress={() => Alert.alert('Coming Soon')}
                            value="Fast"
                        />
                        <SettingItem
                            icon="calendar-outline"
                            label="Working Hours"
                            subtitle="Set your availability schedule"
                            type="navigation"
                            onPress={() => Alert.alert('Coming Soon')}
                            value="9 AM - 6 PM"
                            showDivider={false}
                        />
                    </View>
                </View> */}

                {/* App Settings Section */}
                {/* <View style={styles.section}>
                    <Text type="title" style={styles.sectionTitle}>App Settings</Text>
                    <View style={styles.settingsGroup}>
                        <SettingItem
                            icon="language-outline"
                            label="Language"
                            subtitle="Choose your preferred language"
                            type="navigation"
                            onPress={() => Alert.alert('Coming Soon')}
                            value="English"
                        />
                        <SettingItem
                            icon="moon-outline"
                            label="Dark Mode"
                            subtitle="Switch to dark theme"
                            type="toggle"
                            value={false}
                            onValueChange={() => Alert.alert('Coming Soon')}
                            disabled
                            badge="SOON"
                            badgeColor={COLORS.info}
                        />
                        <SettingItem
                            icon="volume-high-outline"
                            label="Notification Sound"
                            subtitle="Play sound for notifications"
                            type="toggle"
                            value={notificationSound}
                            onValueChange={setNotificationSound}
                        />
                        <SettingItem
                            icon="phone-portrait-outline"
                            label="Haptic Feedback"
                            subtitle="Vibration for interactions"
                            type="toggle"
                            value={hapticFeedback}
                            onValueChange={setHapticFeedback}
                            showDivider={false}
                        />
                    </View>
                </View> */}

                {/* Danger Zone Section */}
                <View style={styles.section}>
                    <Text type="title" style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
                    <View style={styles.settingsGroup}>
                        <SettingItem
                            icon="pause-circle-outline"
                            label="Deactivate Account"
                            subtitle="Temporarily disable your account"
                            type="navigation"
                            onPress={handleDeactivate}
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
                    <Text type="body" style={styles.versionText}>RefynHome Vendor v1.0.0</Text>
                    <Text type="body" style={styles.versionSubtext}>© 2024 RefynHome. All rights reserved.</Text>
                </View>
            </ScrollView>
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
});
