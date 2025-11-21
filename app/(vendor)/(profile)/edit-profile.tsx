// app/(vendor)/(profile)/edit-profile.tsx
/**
 * Edit Profile Screen - Allows vendors to edit their profile information
 */

import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { COLORS } from '@/constants/colors';
import { SERVICE_CATEGORIES } from '@/constants/serviceCategories';
import Text from '@/components/common/Text';

export default function EditProfileScreen() {
    const router = useRouter();
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const allVendors = useSelector((state: RootState) => state.vendor.vendors);
    const vendorProfile = useMemo(() => allVendors.find(v => v.id === currentUser?.uid) || allVendors[0], [allVendors, currentUser]);

    const [name, setName] = useState(vendorProfile?.name || '');
    const [phone, setPhone] = useState(vendorProfile?.phoneNumber || '');
    const [city, setCity] = useState(vendorProfile?.city || '');
    const [selectedServices, setSelectedServices] = useState<string[]>(vendorProfile?.serviceCategories.map(sc => sc.id) || []);
    const [isOnline, setIsOnline] = useState(vendorProfile?.isOnline || false);
    const [isSaving, setIsSaving] = useState(false);

    const hasChanges = useMemo(() => {
        if (!vendorProfile) return false;
        return name !== vendorProfile.name || phone !== vendorProfile.phoneNumber || city !== vendorProfile.city || isOnline !== vendorProfile.isOnline || JSON.stringify(selectedServices.sort()) !== JSON.stringify(vendorProfile.serviceCategories.map(sc => sc.id).sort());
    }, [name, phone, city, isOnline, selectedServices, vendorProfile]);

    const toggleService = (serviceId: string) => {
        setSelectedServices(prev => {
            if (prev.includes(serviceId)) {
                if (prev.length === 1) {
                    Alert.alert('Error', 'You must select at least one service category.');
                    return prev;
                }
                return prev.filter(id => id !== serviceId);
            }
            return [...prev, serviceId];
        });
    };

    const handleSave = async () => {
        if (!name.trim() || name.trim().length < 3) {
            Alert.alert('Error', 'Name must be at least 3 characters');
            return;
        }
        if (!phone.trim() || !city.trim()) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }
        if (selectedServices.length === 0) {
            Alert.alert('Error', 'Select at least one service category');
            return;
        }

        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSaving(false);
        Alert.alert('Success', 'Profile updated successfully!', [{ text: 'OK', onPress: () => router.back() }]);
    };

    const handleCancel = () => {
        if (hasChanges) {
            Alert.alert('Discard Changes?', 'You have unsaved changes. Discard them?', [
                { text: 'Keep Editing', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => router.back() },
            ]);
        } else {
            router.back();
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <LinearGradient colors={[COLORS.primary, COLORS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text type="title" style={styles.headerTitle}>Edit Profile</Text>
                    <TouchableOpacity onPress={handleSave} disabled={!hasChanges || isSaving} style={[styles.saveButton, (!hasChanges || isSaving) && styles.saveButtonDisabled]}>
                        <Text type="button" style={[styles.saveButtonText, (!hasChanges || isSaving) && styles.saveButtonTextDisabled]}>
                            {isSaving ? 'Saving...' : 'Save'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                <View style={styles.photoSection}>
                    {vendorProfile?.profilePhoto ? (
                        <Image source={{ uri: vendorProfile.profilePhoto }} style={styles.photo} />
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <Text type="title" style={styles.photoPlaceholderText}>{name.substring(0, 2).toUpperCase() || 'VN'}</Text>
                        </View>
                    )}
                    <TouchableOpacity style={styles.cameraButton} onPress={() => Alert.alert('Coming Soon', 'Photo upload coming soon!')}>
                        <Ionicons name="camera" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text type="body" style={styles.photoHint}>Tap to change photo</Text>
                </View>

                <View style={styles.section}>
                    <Text type="title" style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.inputGroup}>
                        <Text type="subtitle2" style={styles.inputLabel}>Full Name *</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your name" placeholderTextColor={COLORS.gray400} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text type="subtitle2" style={styles.inputLabel}>Phone Number *</Text>
                        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+92 XXX XXXXXXX" placeholderTextColor={COLORS.gray400} keyboardType="phone-pad" />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text type="subtitle2" style={styles.inputLabel}>City *</Text>
                        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Enter your city" placeholderTextColor={COLORS.gray400} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text type="subtitle2" style={styles.inputLabel}>CNIC</Text>
                        <View style={styles.readOnlyInput}>
                            <Text type="body2" style={styles.readOnlyText}>{vendorProfile?.cnic || 'Not provided'}</Text>
                            <View style={styles.readOnlyBadge}>
                                <Text type="caption" style={styles.readOnlyBadgeText}>Read-only</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text type="title" style={styles.sectionTitle}>Service Categories *</Text>
                    <Text type="body" style={styles.sectionSubtitle}>Select services you provide</Text>
                    <View style={styles.servicesGrid}>
                        {SERVICE_CATEGORIES.map((service) => {
                            const isSelected = selectedServices.includes(service.id);
                            return (
                                <TouchableOpacity key={service.id} style={[styles.serviceChip, isSelected && styles.serviceChipSelected]} onPress={() => toggleService(service.id)} activeOpacity={0.7}>
                                    <Ionicons name={service.icon as any} size={18} color={isSelected ? COLORS.white : COLORS.primary} />
                                    <Text type="body" style={[styles.serviceChipText, isSelected && styles.serviceChipTextSelected]}>{service.label}</Text>
                                    {isSelected && <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text type="title" style={styles.sectionTitle}>Availability</Text>
                    <TouchableOpacity style={styles.availabilityCard} onPress={() => setIsOnline(!isOnline)} activeOpacity={0.7}>
                        <View style={styles.availabilityLeft}>
                            <Ionicons name={isOnline ? 'checkmark-circle' : 'close-circle'} size={24} color={isOnline ? COLORS.success : COLORS.gray400} />
                            <View style={styles.availabilityText}>
                                <Text type="subtitle2" style={styles.availabilityTitle}>{isOnline ? 'Online' : 'Offline'}</Text>
                                <Text type="body" style={styles.availabilitySubtitle}>{isOnline ? 'You are receiving service requests' : 'You are not receiving requests'}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
                    </TouchableOpacity>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity style={[styles.button, styles.buttonPrimary, (!hasChanges || isSaving) && styles.buttonDisabled]} onPress={handleSave} disabled={!hasChanges || isSaving} activeOpacity={0.8}>
                        <LinearGradient colors={(!hasChanges || isSaving) ? [COLORS.gray300, COLORS.gray400] : [COLORS.primary, COLORS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonGradient}>
                            <Text type="button" style={styles.buttonText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleCancel} disabled={isSaving} activeOpacity={0.8}>
                        <Text type="bodySemiBold" style={styles.buttonSecondaryText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.gray50 },
    header: { paddingTop: verticalScale(50), paddingBottom: verticalScale(16), paddingHorizontal: scale(16), borderBottomLeftRadius: moderateScale(24), borderBottomRightRadius: moderateScale(24) },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20), backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', color: COLORS.white },
    saveButton: { paddingHorizontal: scale(16), paddingVertical: verticalScale(8), borderRadius: moderateScale(8), backgroundColor: COLORS.white },
    saveButtonDisabled: { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
    saveButtonText: { color: COLORS.primary },
    saveButtonTextDisabled: { color: 'rgba(255, 255, 255, 0.6)' },
    content: { flex: 1 },
    contentContainer: { paddingBottom: verticalScale(32) },
    photoSection: { alignItems: 'center', paddingVertical: verticalScale(32) },
    photo: { width: moderateScale(120), height: moderateScale(120), borderRadius: moderateScale(60), borderWidth: 4, borderColor: COLORS.white },
    photoPlaceholder: { width: moderateScale(120), height: moderateScale(120), borderRadius: moderateScale(60), backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: COLORS.white },
    photoPlaceholderText: { fontSize: moderateScale(40), color: COLORS.white },
    cameraButton: { position: 'absolute', bottom: verticalScale(32), right: '35%', backgroundColor: COLORS.primary, width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20), justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.white },
    photoHint: { marginTop: verticalScale(12), color: COLORS.gray500 },
    section: { paddingHorizontal: scale(16), marginBottom: verticalScale(24) },
    sectionTitle: { color: COLORS.gray900, marginBottom: verticalScale(8) },
    sectionSubtitle: { color: COLORS.gray600, marginBottom: verticalScale(16) },
    inputGroup: { marginBottom: verticalScale(16) },
    inputLabel: { color: COLORS.gray700, marginBottom: verticalScale(8) },
    input: { backgroundColor: COLORS.white, borderRadius: moderateScale(10), paddingHorizontal: scale(16), paddingVertical: verticalScale(14), fontSize: moderateScale(15), color: COLORS.gray900, borderWidth: 1, borderColor: COLORS.gray200 },
    readOnlyInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.gray100, borderRadius: moderateScale(10), paddingHorizontal: scale(16), paddingVertical: verticalScale(14), borderWidth: 1, borderColor: COLORS.gray200 },
    readOnlyText: { color: COLORS.gray600 },
    readOnlyBadge: { backgroundColor: COLORS.gray300, paddingHorizontal: scale(8), paddingVertical: verticalScale(4), borderRadius: moderateScale(8) },
    readOnlyBadgeText: { color: COLORS.gray700 },
    servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10) },
    serviceChip: { flexDirection: 'row', alignItems: 'center', gap: scale(6), backgroundColor: COLORS.white, paddingHorizontal: scale(14), paddingVertical: verticalScale(10), borderRadius: moderateScale(20), borderWidth: 1.5, borderColor: COLORS.primary + '50' },
    serviceChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    serviceChipText: { color: COLORS.primary },
    serviceChipTextSelected: { color: COLORS.white },
    availabilityCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, borderRadius: moderateScale(12), padding: scale(16), borderWidth: 1, borderColor: COLORS.gray200 },
    availabilityLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(12), flex: 1 },
    availabilityText: { flex: 1 },
    availabilityTitle: { color: COLORS.gray900, marginBottom: verticalScale(2) },
    availabilitySubtitle: { color: COLORS.gray500 },
    actions: { paddingHorizontal: scale(16), gap: verticalScale(12) },
    button: { borderRadius: moderateScale(12), overflow: 'hidden' },
    buttonPrimary: {},
    buttonDisabled: { opacity: 0.5 },
    buttonGradient: { paddingVertical: verticalScale(16), alignItems: 'center' },
    buttonText: { color: COLORS.white },
    buttonSecondary: { backgroundColor: COLORS.white, paddingVertical: verticalScale(16), alignItems: 'center', borderWidth: 1, borderColor: COLORS.gray300 },
    buttonSecondaryText: { color: COLORS.gray700 },
});
