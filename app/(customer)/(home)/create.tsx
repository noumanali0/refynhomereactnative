import React, { useCallback, memo, useState } from "react";
import {
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Pressable,
    StyleSheet,
} from "react-native";
import Text from "@/components/common/Text";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Formik } from "formik";
import * as Yup from "yup";
import { LinearGradient } from "expo-linear-gradient";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";
import Dropdown from "../../../src/components/common/Dropdown";
import { router } from "expo-router";
import { COLORS } from "@/constants/colors";
import { AddressSearchBottomSheet } from "@/components/customer/AddressSearchBottomSheet";
import type { Address } from "@/types/mapbox";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";

// ============================================================================
// Reusable Components
// ============================================================================

const SectionTitle = memo(({ title }: { title: string }) => (
    <Text type="bodySemiBold" style={styles.sectionTitle}>{title}</Text>
));

const InfoList = memo(({ items }: { items: string[] }) => (
    <View style={styles.infoContainer}>
        <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text type="bodySemiBold" style={styles.infoHeaderText}>How it works:</Text>
        </View>
        {items.map((text, i) => (
            <View key={i} style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text type="body2" style={styles.infoText}>{text}</Text>
            </View>
        ))}
    </View>
));

const Disclaimer = memo(
    ({ agreed, onToggle }: { agreed: boolean; onToggle: () => void }) => (
        <View style={styles.disclaimerContainer}>
            <Pressable onPress={onToggle} style={styles.checkbox}>
                <View style={[
                    styles.checkboxInner,
                    agreed && styles.checkboxActive
                ]}>
                    {agreed && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                </View>
            </Pressable>
            <Text type="body" style={styles.disclaimerText}>
                RefynHome connects you with independent service providers. All payments are
                handled directly between customers and vendors. RefynHome is not responsible
                for any damages or disputes.
            </Text>
        </View>
    )
);


const requestServiceSchema = Yup.object().shape({
    selectedService: Yup.string().required("Service category is required"),
    needService: Yup.string().required("Please select when you need the service"),
    serviceAddress: Yup.string().trim().required("Service address is required"),
    description: Yup.string()
        .trim()
        .min(10, "Description must be at least 10 characters")
        .required("Problem description is required"),
    isAgreed: Yup.boolean()
        .oneOf([true], "You must agree to the disclaimer before submitting"),
});

const RequestServiceScreen = () => {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [photo, setPhoto] = useState<string | null>(null);
    const [showAddressSearch, setShowAddressSearch] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

    // Get current location for proximity bias in search
    const { coordinates } = useCurrentLocation({ autoFetch: true });

    const pickImage = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });
        if (!result.canceled) setPhoto(result.assets[0].uri);
    }, []);

    const handleAddressSelect = useCallback((address: Address, setFieldValue: any) => {
        setSelectedAddress(address);
        setFieldValue("serviceAddress", address.formatted);
        setFieldValue("latitude", address.coordinates.latitude.toString());
        setFieldValue("longitude", address.coordinates.longitude.toString());
        setShowAddressSearch(false);
    }, []);

    return (
        <Formik
            initialValues={{
                selectedService: "",
                needService: "asap",
                selectedDate: null,
                serviceAddress: "",
                latitude: "",
                longitude: "",
                description: "",
                isAgreed: false,
            }}
            validationSchema={requestServiceSchema}
            onSubmit={(values) => {
                console.log("Form submitted:", values);
            }}
        >
            {({
                handleChange,
                handleSubmit,
                setFieldValue,
                values,
                errors,
                touched,
            }) => (
                <View style={styles.container}>
                    {/* Header */}
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.header}
                    >
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                        <Text type="title" style={styles.headerTitle}>Request Service</Text>
                        <Text type="subtitle" style={styles.headerSubtitle}>
                            We'll connect you with qualified technicians nearby
                        </Text>
                    </LinearGradient>

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >

                        {/* Service Category */}
                        <Dropdown
                            label="Service Category *"
                            items={[
                                { label: "AC Repair", value: "ac_repair" },
                                { label: "Plumbing", value: "plumbing" },
                                { label: "Electrical", value: "electrical" },
                                { label: "Washing Machine", value: "washing_machine" },
                                { label: "Refrigerator", value: "refrigerator" },
                            ]}
                            value={values.selectedService}
                            onValueChange={(val) => setFieldValue("selectedService", val)}
                            error={touched.selectedService && errors.selectedService}
                        />

                        {/* Service Address */}
                        <SectionTitle title="Service Address *" />
                        <TouchableOpacity
                            onPress={() => setShowAddressSearch(true)}
                            style={styles.addressButton}
                            activeOpacity={0.7}
                        >
                            <View style={styles.addressContent}>
                                <Ionicons name="location" size={22} color={COLORS.primary} />
                                <Text
                                    type="body2"
                                    style={[
                                        styles.addressText,
                                        !values.serviceAddress && styles.addressPlaceholder,
                                    ]}
                                    numberOfLines={2}
                                >
                                    {values.serviceAddress || "Tap to search address"}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
                        </TouchableOpacity>
                        {touched.serviceAddress && errors.serviceAddress && (
                            <Text type="body" style={styles.errorText}>{errors.serviceAddress}</Text>
                        )}

                        {/* Address Search Bottom Sheet */}
                        <AddressSearchBottomSheet
                            isVisible={showAddressSearch}
                            onClose={() => setShowAddressSearch(false)}
                            onSelectAddress={(address) => handleAddressSelect(address, setFieldValue)}
                            proximity={coordinates ? {
                                latitude: coordinates.latitude,
                                longitude: coordinates.longitude,
                            } : undefined}
                            initialValue={values.serviceAddress}
                        />

                        {/* Description */}
                        <SectionTitle title="Problem Description *" />
                        <TextInput
                            value={values.description}
                            onChangeText={handleChange("description")}
                            placeholder="Describe the issue in detail (e.g., AC not cooling, water leaking)"
                            placeholderTextColor={COLORS.gray400}
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                            style={[styles.input, styles.textArea]}
                        />
                        {touched.description && errors.description && (
                            <Text type="body" style={styles.errorText}>{errors.description}</Text>
                        )}

                        {/* Photo Upload */}
                        <SectionTitle title="Photos (Optional)" />
                        <TouchableOpacity
                            onPress={pickImage}
                            style={styles.uploadButton}
                            activeOpacity={0.7}
                        >
                            <View style={styles.uploadContent}>
                                <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
                                <Text type="body2" style={styles.uploadText}>
                                    {photo ? "1 photo selected" : "Add photos of the problem"}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
                        </TouchableOpacity>
                        {photo && (
                            <View style={styles.photoPreview}>
                                <Image
                                    source={{ uri: photo }}
                                    style={styles.photoImage}
                                    resizeMode="cover"
                                />
                                <TouchableOpacity
                                    onPress={() => setPhoto(null)}
                                    style={styles.removePhotoButton}
                                >
                                    <Ionicons name="close-circle" size={24} color={COLORS.error} />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Info Section */}
                        <InfoList
                            items={[
                                "We'll notify qualified technicians near you",
                                "First technician to accept gets priority",
                                "You'll have 5 minutes to confirm",
                                "Contact details shared after confirmation",
                            ]}
                        />

                        {/* Disclaimer */}
                        <Disclaimer
                            agreed={values.isAgreed}
                            onToggle={() => setFieldValue("isAgreed", !values.isAgreed)}
                        />
                        {touched.isAgreed && errors.isAgreed && (
                            <Text type="body" style={styles.errorText}>{errors.isAgreed}</Text>
                        )}

                        {/* Buttons */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => router.back()}
                                activeOpacity={0.7}
                            >
                                <Text type="bodySemiBold" style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                disabled={!values.isAgreed}
                                onPress={() => router.push("/(customer)/(home)/live-offers")}
                                activeOpacity={0.8}
                                style={styles.submitButtonWrapper}
                            >
                                <LinearGradient
                                    colors={
                                        values.isAgreed
                                            ? [COLORS.primary, COLORS.accent]
                                            : [COLORS.gray300, COLORS.gray400]
                                    }
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.submitButton}
                                >
                                    <Text type="button" style={styles.submitButtonText}>
                                        Submit Request
                                    </Text>
                                    <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            )}
        </Formik>
    );
};

export default RequestServiceScreen;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.gray50,
    },
    header: {
        paddingTop: verticalScale(60),
        paddingBottom: verticalScale(24),
        paddingHorizontal: scale(16),
        borderBottomLeftRadius: moderateScale(24),
        borderBottomRightRadius: moderateScale(24),
    },
    backButton: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    headerTitle: {
        fontSize: moderateScale(28),
        color: COLORS.white,
        marginBottom: verticalScale(4),
    },
    headerSubtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: scale(16),
        paddingBottom: verticalScale(100),
    },
    sectionTitle: {
        color: COLORS.gray900,
        marginTop: verticalScale(16),
        marginBottom: verticalScale(8),
    },
    input: {
        borderWidth: 1.5,
        borderColor: COLORS.gray300,
        borderRadius: moderateScale(12),
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(12),
        fontSize: moderateScale(14),
        color: COLORS.gray900,
        backgroundColor: COLORS.white,
        fontFamily: 'Poppins-Regular',
        marginBottom: verticalScale(4),
    },
    textArea: {
        minHeight: verticalScale(120),
        textAlignVertical: 'top',
        paddingTop: verticalScale(12),
    },
    errorText: {
        color: COLORS.error,
        marginBottom: verticalScale(12),
        marginTop: verticalScale(4),
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderColor: COLORS.gray300,
        borderRadius: moderateScale(12),
        padding: scale(16),
        backgroundColor: COLORS.white,
        marginBottom: verticalScale(12),
    },
    uploadContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
    },
    uploadText: {
        color: COLORS.gray700,
    },
    photoPreview: {
        position: 'relative',
        marginBottom: verticalScale(16),
        borderRadius: moderateScale(12),
        overflow: 'hidden',
    },
    photoImage: {
        width: '100%',
        height: verticalScale(200),
        borderRadius: moderateScale(12),
    },
    removePhotoButton: {
        position: 'absolute',
        top: scale(8),
        right: scale(8),
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(20),
        padding: scale(4),
    },
    infoContainer: {
        backgroundColor: COLORS.primary + '08',
        borderRadius: moderateScale(12),
        padding: scale(16),
        marginTop: verticalScale(16),
        marginBottom: verticalScale(16),
        borderWidth: 1,
        borderColor: COLORS.primary + '20',
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        marginBottom: verticalScale(12),
    },
    infoHeaderText: {
        color: COLORS.primary,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(10),
        marginBottom: verticalScale(8),
    },
    infoText: {
        flex: 1,
        color: COLORS.gray700,
        lineHeight: moderateScale(20),
    },
    disclaimerContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.warning + '10',
        borderRadius: moderateScale(12),
        padding: scale(16),
        marginTop: verticalScale(8),
        marginBottom: verticalScale(20),
        borderWidth: 1,
        borderColor: COLORS.warning + '30',
        gap: scale(12),
    },
    checkbox: {
        marginTop: verticalScale(2),
    },
    checkboxInner: {
        width: moderateScale(22),
        height: moderateScale(22),
        borderRadius: moderateScale(6),
        borderWidth: 2,
        borderColor: COLORS.gray400,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary,
    },
    disclaimerText: {
        flex: 1,
        color: COLORS.gray700,
        lineHeight: moderateScale(20),
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: scale(12),
        marginTop: verticalScale(8),
    },
    cancelButton: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderRadius: moderateScale(12),
        paddingVertical: verticalScale(14),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
    },
    cancelButtonText: {
        color: COLORS.primary,
    },
    submitButtonWrapper: {
        flex: 1,
        borderRadius: moderateScale(12),
        overflow: 'hidden',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        paddingVertical: verticalScale(14),
    },
    submitButtonText: {
        color: COLORS.white,
    },
    addressButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderColor: COLORS.gray300,
        borderRadius: moderateScale(12),
        padding: scale(16),
        backgroundColor: COLORS.white,
        marginBottom: verticalScale(4),
        minHeight: verticalScale(56),
    },
    addressContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        flex: 1,
        paddingRight: scale(8),
    },
    addressText: {
        flex: 1,
        color: COLORS.gray900,
        fontSize: moderateScale(14),
        lineHeight: moderateScale(20),
    },
    addressPlaceholder: {
        color: COLORS.gray400,
    },
});
