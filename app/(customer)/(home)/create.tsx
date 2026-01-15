import React, { useCallback, memo, useState, useEffect, useMemo, useRef, Component, ErrorInfo, ReactNode } from "react";
import {
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Pressable,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import Text from "@/components/common/Text";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Formik, FormikHelpers, FormikProps } from "formik";
import * as Yup from "yup";
import { LinearGradient } from "expo-linear-gradient";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";
import Dropdown from "../../../src/components/common/Dropdown";
import { router } from "expo-router";
import { COLORS } from "@/constants/colors";
import { AddressSearchBottomSheet } from "@/components/customer/AddressSearchBottomSheet";
import type { Address } from "@/types/mapbox";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import {
    createServiceRequest,
    getServiceCategories,
    ServiceCategory,
} from "@/services/serviceRequestApi";
import { saveCustomerActiveService, canCustomerCreateNewRequest } from "@/services/customerActiveServiceService";
import { useAppDispatch, useAppSelector } from "@/hooks/useAppDispatch";
import {
    setCustomerActiveService,
    selectCanCustomerCreateRequest,
} from "@/store/slices/dispatchSlice";
import { useToast } from "@/contexts/ToastContext";

// ============================================================================
// Error Boundary Component
// ============================================================================

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class FormErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        if (__DEV__) {
            console.error('Form Error Boundary caught an error:', error);
            console.error('Component stack:', errorInfo.componentStack);
        }
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: COLORS.gray50 }}>
                    <Ionicons name="alert-circle" size={48} color={COLORS.error} />
                    <Text type="title" style={{ marginTop: 16, color: COLORS.gray900, textAlign: 'center' }}>
                        Something went wrong
                    </Text>
                    <Text type="body" style={{ marginTop: 8, color: COLORS.gray600, textAlign: 'center' }}>
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </Text>
                    <TouchableOpacity
                        onPress={() => {
                            this.setState({ hasError: false, error: null });
                            router.back();
                        }}
                        style={{
                            marginTop: 24,
                            backgroundColor: COLORS.primary,
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 8,
                        }}
                    >
                        <Text type="bodySemiBold" style={{ color: COLORS.white }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

// ============================================================================
// Constants
// ============================================================================

const FORM_CONSTANTS = {
    INPUT_BORDER_RADIUS: moderateScale(12),
    INPUT_PADDING_HORIZONTAL: scale(16),
    INPUT_PADDING_VERTICAL: verticalScale(12),
    SECTION_MARGIN_TOP: verticalScale(16),
} as const;

// Static info items - defined outside component to prevent re-creation
const INFO_ITEMS = [
    "We'll notify qualified technicians near you",
    "First technician to accept gets priority",
    "You'll have 5 minutes to confirm",
    "Contact details shared after confirmation",
];

// Fallback categories
const FALLBACK_CATEGORIES: ServiceCategory[] = [
    { id: 1, name: "AC Repair", slug: "ac_repair", is_active: true },
    { id: 2, name: "Plumbing", slug: "plumbing", is_active: true },
    { id: 3, name: "Electrical", slug: "electrical", is_active: true },
    { id: 4, name: "Washing Machine", slug: "washing_machine", is_active: true },
    { id: 5, name: "Refrigerator", slug: "refrigerator", is_active: true },
];

// ============================================================================
// Types
// ============================================================================

interface FormValues {
    selectedService: string;
    problemTitle: string;
    needService: string;
    selectedDate: Date | null;
    serviceAddress: string;
    latitude: string;
    longitude: string;
    description: string;
    isAgreed: boolean;
    photo: string | null; // Photo moved into Formik state
}

// Props for the extracted FormContent component
interface FormContentProps {
    formikProps: FormikProps<FormValues>;
    categoryItems: { label: string; value: string }[];
    loadingCategories: boolean;
    showAddressSearch: boolean;
    imageLoading: boolean;
    coordinates: { latitude: number; longitude: number } | null;
    currentLocationAddress: Address | null;
    isLoadingCurrentLocation: boolean;
    onOpenAddressSearch: () => void;
    onCloseAddressSearch: () => void;
    onAddressSelect: (address: Address, setFieldValue: FormikProps<FormValues>['setFieldValue']) => void;
    onUseCurrentLocation: (setFieldValue: FormikProps<FormValues>['setFieldValue']) => void;
    onPickImage: (setFieldValue: FormikProps<FormValues>['setFieldValue']) => Promise<void>;
    onRemovePhoto: (setFieldValue: FormikProps<FormValues>['setFieldValue']) => void;
    onGoBack: () => void;
    problemTitleRef: React.RefObject<TextInput | null>;
    descriptionRef: React.RefObject<TextInput | null>;
    // Debounce refs - defined in main component to allow clearing from address handlers
    problemTitleDebounceRef: React.MutableRefObject<NodeJS.Timeout | null>;
    descriptionDebounceRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

// ============================================================================
// Validation Schema (defined outside component - already optimized)
// ============================================================================

const requestServiceSchema = Yup.object().shape({
    selectedService: Yup.string().required("Service category is required"),
    problemTitle: Yup.string()
        .trim()
        .min(5, "Problem title must be at least 5 characters")
        .required("Problem title is required"),
    needService: Yup.string().required("Please select when you need the service"),
    serviceAddress: Yup.string().trim().required("Service address is required"),
    latitude: Yup.string().required("Please select a valid address"),
    longitude: Yup.string().required("Please select a valid address"),
    description: Yup.string()
        .trim()
        .min(10, "Description must be at least 10 characters")
        .required("Problem description is required"),
    isAgreed: Yup.boolean()
        .oneOf([true], "You must agree to the disclaimer before submitting"),
});

// ============================================================================
// Memoized Sub-Components
// ============================================================================

interface SectionTitleProps {
    title: string;
}

const SectionTitle = memo(function SectionTitle({ title }: SectionTitleProps) {
    return <Text type="bodySemiBold" style={styles.sectionTitle}>{title}</Text>;
});

interface InfoListProps {
    items: string[];
}

const InfoList = memo(function InfoList({ items }: InfoListProps) {
    return (
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
    );
});

interface DisclaimerProps {
    agreed: boolean;
    onToggle: () => void;
    hasError?: boolean;
}

const Disclaimer = memo(function Disclaimer({ agreed, onToggle, hasError }: DisclaimerProps) {
    return (
        <View style={[styles.disclaimerContainer, hasError && styles.disclaimerError]}>
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
    );
});

// Initial form values - photo now included
const INITIAL_VALUES: FormValues = {
    selectedService: "",
    problemTitle: "",
    needService: "asap",
    selectedDate: null,
    serviceAddress: "",
    latitude: "",
    longitude: "",
    description: "",
    isAgreed: false,
    photo: null,
};

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Hook to fetch and manage service categories with AbortController
 */
function useServiceCategories() {
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        // Create new AbortController for this fetch
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const fetchCategories = async () => {
            try {
                // Pass signal to enable proper cancellation on unmount (fixes memory leak)
                const data = await getServiceCategories(signal);
                // Check if aborted before updating state
                if (!signal.aborted) {
                    // Handle both array and paginated response formats
                    const categoriesArray = Array.isArray(data) ? data : ((data as any)?.results ?? []);
                    setCategories(categoriesArray);
                }
            } catch (error: unknown) {
                // Handle abort gracefully - don't update state if cancelled
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                if (__DEV__) console.error('Failed to fetch categories:', error);
                if (!signal.aborted) {
                    setCategories(FALLBACK_CATEGORIES);
                }
            } finally {
                if (!signal.aborted) {
                    setLoadingCategories(false);
                }
            }
        };

        fetchCategories();

        // Cleanup: abort on unmount
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    // Memoized category items for dropdown
    const categoryItems = useMemo(() => {
        // Defensive check - ensure categories is always an array
        const safeCategories = Array.isArray(categories) ? categories : [];
        return safeCategories.map(c => ({
            label: c.name,
            value: c.id.toString(),
        }));
    }, [categories]);

    return { categories, categoryItems, loadingCategories };
}

/**
 * Hook to manage image picking with loading state
 */
function useImagePicker() {
    const [imageLoading, setImageLoading] = useState(false);

    const pickImage = useCallback(async (
        setFieldValue: FormikProps<FormValues>['setFieldValue']
    ) => {
        setImageLoading(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
            });
            if (!result.canceled) {
                setFieldValue("photo", result.assets[0].uri);
            }
        } catch (error) {
            if (__DEV__) console.error('Image picker error:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        } finally {
            setImageLoading(false);
        }
    }, []);

    const removePhoto = useCallback((
        setFieldValue: FormikProps<FormValues>['setFieldValue']
    ) => {
        setFieldValue("photo", null);
    }, []);

    return { imageLoading, pickImage, removePhoto };
}

// ============================================================================
// Form Content Component (Memoized with custom comparison)
// ============================================================================

const FormContent = memo(function FormContent({
    formikProps,
    categoryItems,
    loadingCategories,
    showAddressSearch,
    imageLoading,
    coordinates,
    currentLocationAddress,
    isLoadingCurrentLocation,
    onOpenAddressSearch,
    onCloseAddressSearch,
    onAddressSelect,
    onUseCurrentLocation,
    onPickImage,
    onRemovePhoto,
    onGoBack,
    problemTitleRef,
    descriptionRef,
    // Debounce refs from main component
    problemTitleDebounceRef,
    descriptionDebounceRef,
}: FormContentProps) {
    const {
        handleSubmit,
        setFieldValue,
        setFieldTouched,
        values,
        errors,
        touched,
        isSubmitting,
    } = formikProps;

    // Store refs to avoid stale closures - these NEVER change identity
    const setFieldValueRef = useRef(setFieldValue);
    const setFieldTouchedRef = useRef(setFieldTouched);
    setFieldValueRef.current = setFieldValue;
    setFieldTouchedRef.current = setFieldTouched;

    // LOCAL STATE for text inputs - completely decoupled from Formik re-renders
    const [localProblemTitle, setLocalProblemTitle] = useState(values.problemTitle);
    const [localDescription, setLocalDescription] = useState(values.description);

    // Memoize proximity object to prevent unnecessary re-renders of AddressSearchBottomSheet
    // This prevents crash when typing description after address selection
    const memoizedProximity = useMemo(() => {
        if (!coordinates) return undefined;
        return {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
        };
    }, [coordinates?.latitude, coordinates?.longitude]);

    // Note: Debounce refs are now passed from main component (not defined here)
    // This allows handleAddressSelect/handleUseCurrentLocation to clear pending debounces

    // Sync local state when form values change from external source (e.g., address selection)
    // This prevents stale local state causing crashes
    useEffect(() => {
        // Only sync if values differ AND no debounce is pending (prevents loop)
        if (values.problemTitle !== localProblemTitle && !problemTitleDebounceRef.current) {
            setLocalProblemTitle(values.problemTitle);
        }
        if (values.description !== localDescription && !descriptionDebounceRef.current) {
            setLocalDescription(values.description);
        }
    }, [values.problemTitle, values.description]);

    // Cleanup debounce timers on unmount - nullify refs to prevent race conditions
    useEffect(() => {
        return () => {
            if (problemTitleDebounceRef.current) {
                clearTimeout(problemTitleDebounceRef.current);
                problemTitleDebounceRef.current = null;
            }
            if (descriptionDebounceRef.current) {
                clearTimeout(descriptionDebounceRef.current);
                descriptionDebounceRef.current = null;
            }
        };
    }, []);

    // DEBOUNCED change handler for problem title - updates Formik after 300ms of no typing
    const handleProblemTitleChange = useCallback((text: string) => {
        // Update local state immediately for responsive UI
        setLocalProblemTitle(text);

        // Clear previous debounce timer
        if (problemTitleDebounceRef.current) {
            clearTimeout(problemTitleDebounceRef.current);
        }

        // Debounce Formik update to prevent re-render storms
        problemTitleDebounceRef.current = setTimeout(() => {
            setFieldValueRef.current("problemTitle", text, false);
        }, 300);
    }, []);

    // DEBOUNCED change handler for description
    const handleDescriptionChange = useCallback((text: string) => {
        // Update local state immediately for responsive UI
        setLocalDescription(text);

        // Clear previous debounce timer
        if (descriptionDebounceRef.current) {
            clearTimeout(descriptionDebounceRef.current);
        }

        // Debounce Formik update to prevent re-render storms
        descriptionDebounceRef.current = setTimeout(() => {
            setFieldValueRef.current("description", text, false);
        }, 300);
    }, []);

    // On blur, immediately sync to Formik and validate
    const handleProblemTitleBlur = useCallback(() => {
        // Clear any pending debounce
        if (problemTitleDebounceRef.current) {
            clearTimeout(problemTitleDebounceRef.current);
            problemTitleDebounceRef.current = null;
        }
        // Immediately sync final value to Formik
        setFieldValueRef.current("problemTitle", localProblemTitle, true);
        setFieldTouchedRef.current("problemTitle", true);
    }, [localProblemTitle]);

    const handleDescriptionBlur = useCallback(() => {
        // Clear any pending debounce
        if (descriptionDebounceRef.current) {
            clearTimeout(descriptionDebounceRef.current);
            descriptionDebounceRef.current = null;
        }
        // Immediately sync final value to Formik
        setFieldValueRef.current("description", localDescription, true);
        setFieldTouchedRef.current("description", true);
    }, [localDescription]);

    // Stable handler for dropdown
    const handleServiceChange = useCallback((val: string) => {
        setFieldValueRef.current("selectedService", val);
    }, []);

    // Stable handler for disclaimer toggle - use ref to get latest value
    const isAgreedRef = useRef(values.isAgreed);
    isAgreedRef.current = values.isAgreed;

    const handleDisclaimerToggle = useCallback(() => {
        setFieldValueRef.current("isAgreed", !isAgreedRef.current);
    }, []);

    // Stable handlers for image picker
    const handlePickImage = useCallback(() => {
        onPickImage(setFieldValueRef.current);
    }, [onPickImage]);

    const handleRemovePhoto = useCallback(() => {
        onRemovePhoto(setFieldValueRef.current);
    }, [onRemovePhoto]);

    // Stable handler for address selection
    const handleAddressSelectInternal = useCallback((address: Address) => {
        onAddressSelect(address, setFieldValueRef.current);
    }, [onAddressSelect]);

    // Stable handler for using current location
    const handleUseCurrentLocation = useCallback(() => {
        onUseCurrentLocation(setFieldValueRef.current);
    }, [onUseCurrentLocation]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity
                    onPress={onGoBack}
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
                keyboardShouldPersistTaps="handled"
            >
                {/* Service Category */}
                <Dropdown
                    label="Service Category *"
                    items={categoryItems}
                    value={values.selectedService}
                    onValueChange={handleServiceChange}
                    error={touched.selectedService ? errors.selectedService : undefined}
                    disable={loadingCategories}
                    placeholder={loadingCategories ? "Loading categories..." : "Select a category"}
                />

                {/* Problem Title - Uses local state + debounced Formik sync for performance */}
                <SectionTitle title="Problem Title *" />
                <TextInput
                    ref={problemTitleRef}
                    value={localProblemTitle}
                    onChangeText={handleProblemTitleChange}
                    onBlur={handleProblemTitleBlur}
                    placeholder="Brief title (e.g., AC not cooling, Tap leaking)"
                    placeholderTextColor={COLORS.gray400}
                    style={[
                        styles.input,
                        touched.problemTitle && errors.problemTitle && styles.inputError
                    ]}
                    maxLength={100}
                    returnKeyType="next"
                    autoCorrect={false}
                    autoCapitalize="sentences"
                    spellCheck={false}
                    onSubmitEditing={() => descriptionRef.current?.focus()}
                />
                {touched.problemTitle && errors.problemTitle && (
                    <Text type="body" style={styles.errorText}>{errors.problemTitle}</Text>
                )}

                {/* Service Address */}
                <SectionTitle title="Service Address *" />

                {/* Address Options - Use Current Location OR Search */}
                <View style={styles.addressOptionsContainer}>
                    {/* Use Current Location Button */}
                    <TouchableOpacity
                        onPress={handleUseCurrentLocation}
                        style={[
                            styles.addressOptionButton,
                            styles.currentLocationButton,
                            isLoadingCurrentLocation && styles.addressOptionButtonDisabled,
                        ]}
                        activeOpacity={0.7}
                        disabled={isLoadingCurrentLocation}
                    >
                        {isLoadingCurrentLocation ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <Ionicons name="navigate" size={20} color={COLORS.primary} />
                        )}
                        <Text type="body2" style={styles.addressOptionText}>
                            {isLoadingCurrentLocation ? "Getting location..." : "Use Current Location"}
                        </Text>
                    </TouchableOpacity>

                    {/* Search Address Button */}
                    <TouchableOpacity
                        onPress={onOpenAddressSearch}
                        style={[styles.addressOptionButton, styles.searchAddressButton]}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="search" size={20} color={COLORS.accent} />
                        <Text type="body2" style={styles.addressOptionText}>Search Address</Text>
                    </TouchableOpacity>
                </View>

                {/* Selected Address Display */}
                {values.serviceAddress ? (
                    <View style={[
                        styles.selectedAddressContainer,
                        touched.serviceAddress && errors.serviceAddress && styles.inputError
                    ]}>
                        <View style={styles.selectedAddressContent}>
                            <View style={styles.selectedAddressIcon}>
                                <Ionicons name="location" size={20} color={COLORS.white} />
                            </View>
                            <View style={styles.selectedAddressTextContainer}>
                                <Text type="body2" style={styles.selectedAddressLabel}>Service Location</Text>
                                <Text type="body" style={styles.selectedAddressText} numberOfLines={2}>
                                    {values.serviceAddress}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={onOpenAddressSearch}
                            style={styles.changeAddressButton}
                        >
                            <Text type="body2" style={styles.changeAddressText}>Change</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[
                        styles.noAddressContainer,
                        touched.serviceAddress && errors.serviceAddress && styles.inputError
                    ]}>
                        <Ionicons name="location-outline" size={24} color={COLORS.gray400} />
                        <Text type="body2" style={styles.noAddressText}>
                            Select your service location using the options above
                        </Text>
                    </View>
                )}

                {touched.serviceAddress && errors.serviceAddress && (
                    <Text type="body" style={styles.errorText}>{errors.serviceAddress}</Text>
                )}

                {/* Address Search Bottom Sheet - Conditionally rendered to prevent stack overflow on unmount */}
                {showAddressSearch && (
                    <AddressSearchBottomSheet
                        isVisible={showAddressSearch}
                        onClose={onCloseAddressSearch}
                        onSelectAddress={handleAddressSelectInternal}
                        proximity={memoizedProximity}
                        initialValue={values.serviceAddress}
                    />
                )}

                {/* Description - Uses local state + debounced Formik sync for performance */}
                <SectionTitle title="Problem Description *" />
                <TextInput
                    ref={descriptionRef}
                    value={localDescription}
                    onChangeText={handleDescriptionChange}
                    onBlur={handleDescriptionBlur}
                    placeholder="Describe the issue in detail (e.g., AC not cooling, water leaking)"
                    placeholderTextColor={COLORS.gray400}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    style={[
                        styles.input,
                        styles.textArea,
                        touched.description && errors.description && styles.inputError
                    ]}
                    autoCorrect={false}
                    autoCapitalize="sentences"
                    spellCheck={false}
                />
                {touched.description && errors.description && (
                    <Text type="body" style={styles.errorText}>{errors.description}</Text>
                )}

                {/* Photo Upload - Commented out for now
                <SectionTitle title="Photos (Optional)" />
                <TouchableOpacity
                    onPress={handlePickImage}
                    style={styles.uploadButton}
                    activeOpacity={0.7}
                    disabled={imageLoading}
                >
                    <View style={styles.uploadContent}>
                        {imageLoading ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
                        )}
                        <Text type="body2" style={styles.uploadText}>
                            {imageLoading
                                ? "Processing..."
                                : values.photo
                                    ? "1 photo selected"
                                    : "Add photos of the problem"}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
                </TouchableOpacity>
                {values.photo && (
                    <View style={styles.photoPreview}>
                        <Image
                            source={{ uri: values.photo }}
                            style={styles.photoImage}
                            resizeMode="cover"
                        />
                        <TouchableOpacity
                            onPress={handleRemovePhoto}
                            style={styles.removePhotoButton}
                        >
                            <Ionicons name="close-circle" size={24} color={COLORS.error} />
                        </TouchableOpacity>
                    </View>
                )}
                */}

                {/* Info Section */}
                <InfoList items={INFO_ITEMS} />

                {/* Disclaimer */}
                <Disclaimer
                    agreed={values.isAgreed}
                    onToggle={handleDisclaimerToggle}
                    hasError={touched.isAgreed && !!errors.isAgreed}
                />
                {touched.isAgreed && errors.isAgreed && (
                    <Text type="body" style={styles.errorText}>{errors.isAgreed}</Text>
                )}

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onGoBack}
                        activeOpacity={0.7}
                    >
                        <Text type="bodySemiBold" style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        disabled={!values.isAgreed || isSubmitting}
                        onPress={() => handleSubmit()}
                        activeOpacity={0.8}
                        style={styles.submitButtonWrapper}
                    >
                        <LinearGradient
                            colors={
                                values.isAgreed && !isSubmitting
                                    ? [COLORS.primary, COLORS.accent]
                                    : [COLORS.gray300, COLORS.gray400]
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitButton}
                        >
                            {isSubmitting ? (
                                <>
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                    <Text type="button" style={styles.submitButtonText} numberOfLines={1}>
                                        Creating...
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text type="button" style={styles.submitButtonText} numberOfLines={1}>
                                        Submit Request
                                    </Text>
                                    <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
});
// Note: Removed custom memo comparator - React's default shallow comparison
// is safer and prevents stale handler issues. The local state + debounce pattern
// already prevents unnecessary re-renders during typing.

// ============================================================================
// Main Component
// ============================================================================

const RequestServiceScreen = () => {
    const [showAddressSearch, setShowAddressSearch] = useState(false);
    const dispatch = useAppDispatch();
    const { showToast } = useToast();
    // Check if customer can create new request (excludes in_progress status - vendor working)
    const canCreateRequestCheck = useAppSelector(selectCanCustomerCreateRequest);

    // Custom hooks for data fetching and image picking
    const { categories, categoryItems, loadingCategories } = useServiceCategories();
    const { imageLoading, pickImage, removePhoto } = useImagePicker();

    // AbortController for submission
    const submitAbortControllerRef = useRef<AbortController | null>(null);
    // Ref for double-click protection (synchronous check before async Formik state)
    const isSubmittingRef = useRef(false);

    // Input refs for focus management
    const problemTitleRef = useRef<TextInput>(null);
    const descriptionRef = useRef<TextInput>(null);

    // Debounce refs - defined HERE so handleAddressSelect can clear pending debounces
    // This fixes the crash when typing description after selecting address
    const problemTitleDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const descriptionDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Mount check ref - prevents state updates after unmount
    const isMountedRef = useRef(true);

    // Ref to track if we should auto-fill after location fetch (with cancellation support)
    const pendingLocationFillRef = useRef<{
        setFieldValue: FormikProps<FormValues>['setFieldValue'] | null;
        cancelled: boolean;
    }>({ setFieldValue: null, cancelled: false });

    // Get current location for proximity bias in search AND for "Use Current Location" feature
    const { coordinates, location: currentLocationAddress, loading: isLoadingCurrentLocation, refetch: fetchCurrentLocation } = useCurrentLocation({ autoFetch: true });

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;  // Mark as unmounted first
            submitAbortControllerRef.current?.abort();
            // Also cleanup debounce timers to prevent memory leaks - nullify to prevent race conditions
            if (problemTitleDebounceRef.current) {
                clearTimeout(problemTitleDebounceRef.current);
                problemTitleDebounceRef.current = null;
            }
            if (descriptionDebounceRef.current) {
                clearTimeout(descriptionDebounceRef.current);
                descriptionDebounceRef.current = null;
            }
            // Cancel pending location fills to prevent state updates after unmount
            pendingLocationFillRef.current.cancelled = true;
        };
    }, []);

    const openAddressSearch = useCallback(() => {
        setShowAddressSearch(true);
    }, []);

    const closeAddressSearch = useCallback(() => {
        setShowAddressSearch(false);
    }, []);

    // Handle address selection - receives setFieldValue as parameter (no ref anti-pattern)
    // Uses requestAnimationFrame to batch updates and prevent crash during rapid re-renders
    const handleAddressSelect = useCallback((
        address: Address,
        setFieldValue: FormikProps<FormValues>['setFieldValue']
    ) => {
        // Close modal first to prevent re-render during value updates
        setShowAddressSearch(false);

        // Clear any pending debounced text updates to prevent race condition
        // This ensures no stale text updates fire while address is being set
        if (problemTitleDebounceRef.current) {
            clearTimeout(problemTitleDebounceRef.current);
            problemTitleDebounceRef.current = null;
        }
        if (descriptionDebounceRef.current) {
            clearTimeout(descriptionDebounceRef.current);
            descriptionDebounceRef.current = null;
        }

        // Batch all Formik updates in next frame to avoid race conditions
        // This prevents crash when user types in description field immediately after
        requestAnimationFrame(() => {
            if (!isMountedRef.current) return;  // Mount check
            setFieldValue("serviceAddress", address.formatted, false);
            setFieldValue("latitude", address.coordinates.latitude.toString(), false);
            setFieldValue("longitude", address.coordinates.longitude.toString(), false);
        });
    }, []);

    // Handle "Use Current Location" - fetches location if not available, then sets form values
    const handleUseCurrentLocation = useCallback(async (
        setFieldValue: FormikProps<FormValues>['setFieldValue']
    ) => {
        // Clear any pending debounced text updates to prevent race condition
        if (problemTitleDebounceRef.current) {
            clearTimeout(problemTitleDebounceRef.current);
            problemTitleDebounceRef.current = null;
        }
        if (descriptionDebounceRef.current) {
            clearTimeout(descriptionDebounceRef.current);
            descriptionDebounceRef.current = null;
        }

        // If we already have current location address, use it directly
        if (currentLocationAddress && coordinates) {
            requestAnimationFrame(() => {
                if (!isMountedRef.current) return;  // Mount check
                setFieldValue("serviceAddress", currentLocationAddress.formatted, false);
                setFieldValue("latitude", coordinates.latitude.toString(), false);
                setFieldValue("longitude", coordinates.longitude.toString(), false);
            });
            return;
        }

        // Otherwise, fetch location first
        await fetchCurrentLocation();

        // After fetch, the state will update and we can use it
        // Note: This is handled by the useEffect below for post-fetch updates
    }, [currentLocationAddress, coordinates, fetchCurrentLocation]);

    // Effect to handle location updates when user clicks "Use Current Location"
    useEffect(() => {
        const pending = pendingLocationFillRef.current;
        if (pending.setFieldValue && !pending.cancelled && isMountedRef.current && currentLocationAddress && coordinates && !isLoadingCurrentLocation) {
            const setFieldValue = pending.setFieldValue;
            requestAnimationFrame(() => {
                // Double-check not cancelled and still mounted before updating
                if (!pendingLocationFillRef.current.cancelled && isMountedRef.current) {
                    setFieldValue("serviceAddress", currentLocationAddress.formatted, false);
                    setFieldValue("latitude", coordinates.latitude.toString(), false);
                    setFieldValue("longitude", coordinates.longitude.toString(), false);
                }
            });
            pendingLocationFillRef.current = { setFieldValue: null, cancelled: false };
        }
    }, [currentLocationAddress, coordinates, isLoadingCurrentLocation]);

    // Updated handler that sets the pending ref
    const handleUseCurrentLocationWithPending = useCallback(async (
        setFieldValue: FormikProps<FormValues>['setFieldValue']
    ) => {
        // If we already have current location address, use it directly
        if (currentLocationAddress && coordinates) {
            requestAnimationFrame(() => {
                if (!isMountedRef.current) return;  // Mount check
                setFieldValue("serviceAddress", currentLocationAddress.formatted, false);
                setFieldValue("latitude", coordinates.latitude.toString(), false);
                setFieldValue("longitude", coordinates.longitude.toString(), false);
            });
            return;
        }

        // Set pending ref so useEffect can fill values after fetch completes
        pendingLocationFillRef.current = { setFieldValue, cancelled: false };
        // Trigger location fetch
        await fetchCurrentLocation();
    }, [currentLocationAddress, coordinates, fetchCurrentLocation]);

    // Extract category finding logic
    const findCategory = useCallback((
        selectedService: string,
        categoriesList: ServiceCategory[]
    ): ServiceCategory | undefined => {
        return categoriesList.find(
            c => c.id.toString() === selectedService || c.slug === selectedService
        );
    }, []);

    // Extract navigation logic - pass all params needed for retry functionality
    const navigateToLiveOffers = useCallback((
        requestId: number,
        latitude: string,
        longitude: string,
        address: string,
        categoryId: number,
        problemTitle: string,
        description: string
    ) => {
        router.replace({
            pathname: "/(customer)/(home)/live-offers",
            params: {
                requestId: requestId.toString(),
                latitude,
                longitude,
                address,
                categoryId: categoryId.toString(),
                problemTitle,
                description,
            },
        } as any);
    }, []);

    // Handle form submission - uses Formik's isSubmitting, no duplicate state
    const handleSubmitRequest = useCallback(async (
        values: FormValues,
        formikHelpers: FormikHelpers<FormValues>
    ) => {
        // Double-click protection: synchronous check before async operations
        if (isSubmittingRef.current) {
            if (__DEV__) console.log('[CreateRequest] Ignoring duplicate submission');
            return;
        }
        isSubmittingRef.current = true;

        // Create abort controller for this submission
        submitAbortControllerRef.current = new AbortController();
        const signal = submitAbortControllerRef.current.signal;

        try {
            // Quick Redux check first (instant, no network)
            // Only blocks pending/accepted/en_route - allows creating new requests when in_progress
            if (!canCreateRequestCheck.canCreate && canCreateRequestCheck.blockingRequestId) {
                if (__DEV__) {
                    console.log('[CreateRequest] Blocked by Redux - status:', canCreateRequestCheck.blockingStatus, 'request:', canCreateRequestCheck.blockingRequestId);
                }

                Alert.alert(
                    'Active Request Exists',
                    canCreateRequestCheck.reason || 'You have an active service request that needs attention.',
                    [
                        {
                            text: 'View Request',
                            onPress: () => {
                                router.replace({
                                    pathname: '/(customer)/(home)/live-offers',
                                    params: { requestId: canCreateRequestCheck.blockingRequestId!.toString() },
                                });
                            },
                        },
                        { text: 'OK', style: 'cancel' },
                    ]
                );
                formikHelpers.setSubmitting(false);
                isSubmittingRef.current = false;
                return;
            }

            // Pre-creation backend check (multi-device duplicate prevention)
            // This prevents creating duplicate requests if another device already created one
            // Only blocks pending/accepted/en_route - allows in_progress
            if (__DEV__) {
                console.log('[CreateRequest] Checking backend for blocking requests...');
            }

            const backendCheck = await canCustomerCreateNewRequest();

            if (!backendCheck.canCreate && backendCheck.blockingRequestId) {
                if (__DEV__) {
                    console.log('[CreateRequest] Blocked by backend - status:', backendCheck.blockingStatus, 'request:', backendCheck.blockingRequestId);
                }

                // Update Redux with blocking request info
                dispatch(setCustomerActiveService({
                    requestId: backendCheck.blockingRequestId,
                    status: backendCheck.blockingStatus as 'pending' | 'accepted' | 'en_route',
                }));

                Alert.alert(
                    'Active Request Exists',
                    backendCheck.reason || 'You have an active service request that needs attention.',
                    [
                        {
                            text: 'View Request',
                            onPress: () => {
                                router.replace({
                                    pathname: '/(customer)/(home)/live-offers',
                                    params: { requestId: backendCheck.blockingRequestId!.toString() },
                                });
                            },
                        },
                        { text: 'OK', style: 'cancel' },
                    ]
                );
                formikHelpers.setSubmitting(false);
                isSubmittingRef.current = false;
                return;
            }

            const selectedCategory = findCategory(values.selectedService, categories);

            if (!selectedCategory) {
                showToast({ type: 'error', title: 'Error', message: 'Please select a valid service category' });
                formikHelpers.setSubmitting(false);
                return;
            }

            const lat = values.latitude ? parseFloat(values.latitude) : null;
            const lng = values.longitude ? parseFloat(values.longitude) : null;

            if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
                showToast({ type: 'error', title: 'Invalid Location', message: 'Please select a valid address' });
                formikHelpers.setSubmitting(false);
                isSubmittingRef.current = false;
                return;
            }

            const response = await createServiceRequest({
                category: selectedCategory.id,
                problem_title: values.problemTitle,
                description: values.description,
                address_line: values.serviceAddress,
                latitude: lat,
                longitude: lng,
                location_source: 'map',
                radius_km: 10,
            });

            // Check if aborted before navigating
            if (signal.aborted) {
                return;
            }

            if (__DEV__) console.log('Service request created:', response);

            // Persist active service for app kill recovery
            // This ensures customer returns to live-offers screen after app restart
            // expiresAt is CRITICAL for correct timer restoration after app kill
            // Also saves retry params for Search Again functionality
            await saveCustomerActiveService({
                requestId: response.request.id,
                expiresAt: response.request.expires_at,
                serviceLocation: {
                    latitude: lat,
                    longitude: lng,
                },
                serviceAddress: values.serviceAddress,
                // Retry params
                categoryId: selectedCategory.id,
                problemTitle: values.problemTitle,
                description: values.description,
            }).catch((error) => {
                if (__DEV__) console.error('[CreateRequest] Failed to persist active service:', error);
            });

            // Update Redux state for logout restriction
            dispatch(setCustomerActiveService({ requestId: response.request.id, status: 'pending' }));

            navigateToLiveOffers(
                response.request.id,
                values.latitude,
                values.longitude,
                values.serviceAddress,
                selectedCategory.id,
                values.problemTitle,
                values.description
            );

        } catch (error: unknown) {
            // Handle abort gracefully
            if (error instanceof Error && error.name === 'AbortError') {
                if (__DEV__) console.log('Submission was cancelled');
                return;
            }

            if (__DEV__) console.error('Failed to create service request:', error);
            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to create service request. Please try again.';
            showToast({ type: 'error', title: 'Error', message: errorMessage });
        } finally {
            // Reset double-click protection
            isSubmittingRef.current = false;
            // Formik handles setSubmitting(false) automatically when promise resolves
        }
    }, [categories, findCategory, navigateToLiveOffers, showToast]);

    const goBack = useCallback(() => {
        // Cancel any ongoing submission
        submitAbortControllerRef.current?.abort();
        router.back();
    }, []);

    return (
        <FormErrorBoundary>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                enabled={!showAddressSearch}
            >
                <Formik<FormValues>
                    initialValues={INITIAL_VALUES}
                    validationSchema={requestServiceSchema}
                    onSubmit={handleSubmitRequest}
                    enableReinitialize={false}
                    validateOnMount={false}
                    validateOnChange={false}
                    validateOnBlur={true}
                >
                    {(formikProps) => (
                        <FormContent
                            formikProps={formikProps}
                            categoryItems={categoryItems}
                            loadingCategories={loadingCategories}
                            showAddressSearch={showAddressSearch}
                            imageLoading={imageLoading}
                            coordinates={coordinates}
                            currentLocationAddress={currentLocationAddress}
                            isLoadingCurrentLocation={isLoadingCurrentLocation}
                            onOpenAddressSearch={openAddressSearch}
                            onCloseAddressSearch={closeAddressSearch}
                            onAddressSelect={handleAddressSelect}
                            onUseCurrentLocation={handleUseCurrentLocationWithPending}
                            onPickImage={pickImage}
                            onRemovePhoto={removePhoto}
                            onGoBack={goBack}
                            problemTitleRef={problemTitleRef}
                            descriptionRef={descriptionRef}
                            problemTitleDebounceRef={problemTitleDebounceRef}
                            descriptionDebounceRef={descriptionDebounceRef}
                        />
                    )}
                </Formik>
            </KeyboardAvoidingView>
        </FormErrorBoundary>
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
        paddingTop: verticalScale(30),
        paddingBottom: verticalScale(24),
        paddingHorizontal: scale(16),
        borderBottomLeftRadius: FORM_CONSTANTS.INPUT_BORDER_RADIUS * 2,
        borderBottomRightRadius: FORM_CONSTANTS.INPUT_BORDER_RADIUS * 2,
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
        marginTop: FORM_CONSTANTS.SECTION_MARGIN_TOP,
        marginBottom: verticalScale(8),
    },
    input: {
        borderWidth: 1.5,
        borderColor: COLORS.gray300,
        borderRadius: FORM_CONSTANTS.INPUT_BORDER_RADIUS,
        paddingHorizontal: FORM_CONSTANTS.INPUT_PADDING_HORIZONTAL,
        paddingVertical: FORM_CONSTANTS.INPUT_PADDING_VERTICAL,
        fontSize: moderateScale(14),
        color: COLORS.gray900,
        backgroundColor: COLORS.white,
        marginBottom: verticalScale(4),
    },
    inputError: {
        borderColor: COLORS.error,
        borderWidth: 2,
    },
    textArea: {
        minHeight: verticalScale(120),
        textAlignVertical: 'top',
        paddingTop: FORM_CONSTANTS.INPUT_PADDING_VERTICAL,
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
        borderRadius: FORM_CONSTANTS.INPUT_BORDER_RADIUS,
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
        borderRadius: FORM_CONSTANTS.INPUT_BORDER_RADIUS,
        overflow: 'hidden',
    },
    photoImage: {
        width: '100%',
        height: verticalScale(200),
        borderRadius: FORM_CONSTANTS.INPUT_BORDER_RADIUS,
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
        borderRadius: FORM_CONSTANTS.INPUT_BORDER_RADIUS,
        padding: scale(16),
        marginTop: FORM_CONSTANTS.SECTION_MARGIN_TOP,
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
        borderRadius: FORM_CONSTANTS.INPUT_BORDER_RADIUS,
        padding: scale(16),
        marginTop: verticalScale(8),
        marginBottom: verticalScale(20),
        borderWidth: 1,
        borderColor: COLORS.warning + '30',
        gap: scale(12),
    },
    disclaimerError: {
        borderColor: COLORS.error,
        borderWidth: 2,
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
        // flex: 1,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderRadius: FORM_CONSTANTS.INPUT_BORDER_RADIUS,
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        width:moderateScale(150)
    },
    cancelButtonText: {
        color: COLORS.primary,
        fontSize: moderateScale(13),
    },
    submitButtonWrapper: {
        // flex: 1,
        borderRadius: FORM_CONSTANTS.INPUT_BORDER_RADIUS,
        overflow: 'hidden',
        marginLeft:moderateScale(20)
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(14),
        width:moderateScale(150)
    },
    submitButtonText: {
        color: COLORS.white,
        fontSize: moderateScale(13),
        flexShrink: 0,
    },
    addressButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderColor: COLORS.gray300,
        borderRadius: FORM_CONSTANTS.INPUT_BORDER_RADIUS,
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
    // Address Options Styles
    addressOptionsContainer: {
        flexDirection: 'row',
        gap: scale(12),
        marginBottom: verticalScale(12),
    },
    addressOptionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(10),
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(16),
        borderRadius: moderateScale(10),
        borderWidth: 1.5,
    },
    currentLocationButton: {
        backgroundColor: COLORS.primary + '10',
        borderColor: COLORS.primary + '40',
    },
    searchAddressButton: {
        backgroundColor: COLORS.accent + '10',
        borderColor: COLORS.accent + '40',
    },
    addressOptionButtonDisabled: {
        opacity: 0.6,
    },
    addressOptionText: {
        color: COLORS.gray800,
        fontSize: moderateScale(13),
    },
    // Selected Address Display
    selectedAddressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        borderRadius: moderateScale(12),
        padding: scale(12),
        borderWidth: 1.5,
        borderColor: COLORS.success + '40',
        marginBottom: verticalScale(4),
    },
    selectedAddressContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        flex: 1,
    },
    selectedAddressIcon: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedAddressTextContainer: {
        flex: 1,
    },
    selectedAddressLabel: {
        color: COLORS.success,
        fontSize: moderateScale(11),
        marginBottom: verticalScale(2),
    },
    selectedAddressText: {
        color: COLORS.gray800,
        fontSize: moderateScale(13),
        lineHeight: moderateScale(18),
    },
    changeAddressButton: {
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(6),
        borderRadius: moderateScale(6),
        backgroundColor: COLORS.gray100,
    },
    changeAddressText: {
        color: COLORS.primary,
        fontSize: moderateScale(12),
    },
    // No Address Placeholder
    noAddressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(10),
        backgroundColor: COLORS.gray50,
        borderRadius: moderateScale(12),
        padding: scale(16),
        borderWidth: 1.5,
        borderColor: COLORS.gray200,
        borderStyle: 'dashed',
        marginBottom: verticalScale(4),
    },
    noAddressText: {
        color: COLORS.gray500,
        fontSize: moderateScale(13),
        textAlign: 'center',
        flex: 1,
    },
});
