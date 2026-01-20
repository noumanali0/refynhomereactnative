/**
 * Vendor Edit Profile Screen
 *
 * Allows vendors to update their profile information:
 * - First name, Last name
 * - City, Bio
 * - Profile photo
 * - Service radius
 *
 * Integrates with PATCH /api/auth/update-profile/
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch } from 'react-redux';

import { COLORS } from '@/constants/colors';
import Text from '@/components/common/Text';
import { useAppSelector } from '@/hooks/useAppDispatch';
import { updateUserProfile } from '@/store/slices/authSlice';
import { useToast } from '@/contexts/ToastContext';
import { serviceRequestApi, ServiceCategory } from '@/services/serviceRequestApi';
import type { AppDispatch } from '@/store';
import type { UpdateProfileRequest } from '@/types/api';

export default function VendorEditProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();

  // Get current user from Redux
  const { user, isLoading } = useAppSelector((state) => state.auth);

  // Extract vendor profile data
  const vendorProfile = useMemo(() => {
    if (!user) return null;
    return (user as any).vendorProfile || (user as any).vendor_profile || null;
  }, [user]);

  // Form state
  const [firstName, setFirstName] = useState(
    (user as any)?.firstName || (user as any)?.first_name || ''
  );
  const [lastName, setLastName] = useState(
    (user as any)?.lastName || (user as any)?.last_name || ''
  );
  const [city, setCity] = useState(vendorProfile?.city || '');
  const [bio, setBio] = useState(vendorProfile?.bio || '');
  const [serviceRadius, setServiceRadius] = useState(
    vendorProfile?.service_radius_km?.toString() || vendorProfile?.serviceRadiusKm?.toString() || '10'
  );
  const [profilePhoto, setProfilePhoto] = useState<string | null>(
    vendorProfile?.profile_photo || vendorProfile?.profilePhoto || null
  );
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Category management state
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [originalCategoryIds, setOriginalCategoryIds] = useState<number[]>([]);
  
  // Original values for change detection
  const originalFirstName = (user as any)?.firstName || (user as any)?.first_name || '';
  const originalLastName = (user as any)?.lastName || (user as any)?.last_name || '';
  const originalCity = vendorProfile?.city || '';
  const originalBio = vendorProfile?.bio || '';
  const originalRadius = vendorProfile?.service_radius_km?.toString() || vendorProfile?.serviceRadiusKm?.toString() || '10';

  // Fetch all service categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await serviceRequestApi.getCategories();
        // Handle both paginated response { results: [...] } and direct array [...]
        const cats = Array.isArray(response) ? response : (response as any)?.results || [];
        setCategories(cats);
      } catch (error) {
        console.error('[VendorEditProfile] Failed to load categories:', error);
        showToast({ type: "error", title: "Error", message: 'Failed to load service categories' });
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, [showToast]);

  // Initialize selected categories from vendor profile
  useEffect(() => {
    if (vendorProfile?.categories) {
      const ids = vendorProfile.categories.map((c: any) => c.id);
      setSelectedCategoryIds(ids);
      setOriginalCategoryIds(ids);
    }
  }, [vendorProfile]);

  // Toggle category selection - prevent removing last category
  const toggleCategory = useCallback((categoryId: number) => {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        // Don't allow removing if it's the last selected category
        if (prev.length === 1) {
          return prev; // Keep it selected
        }
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  }, []);

  // Check if categories have changed
  const categoriesChanged = useMemo(() => {
    if (selectedCategoryIds.length !== originalCategoryIds.length) return true;
    const sortedSelected = [...selectedCategoryIds].sort();
    const sortedOriginal = [...originalCategoryIds].sort();
    return JSON.stringify(sortedSelected) !== JSON.stringify(sortedOriginal);
  }, [selectedCategoryIds, originalCategoryIds]);

  // Track if form has changes
  const hasChanges = useCallback(() => {
    if (newPhotoUri) return true;
    if (firstName !== originalFirstName) return true;
    if (lastName !== originalLastName) return true;
    if (city !== originalCity) return true;
    if (bio !== originalBio) return true;
    if (serviceRadius !== originalRadius) return true;
    if (categoriesChanged) return true;
    return false;
  }, [firstName, lastName, city, bio, serviceRadius, newPhotoUri, originalFirstName, originalLastName, originalCity, originalBio, originalRadius, categoriesChanged]);

  // Pick image from gallery
  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast({
          type: 'error',
          title: 'Permission Required',
          message: 'Please allow access to your photo library',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]) {
        setNewPhotoUri(result.assets[0].uri);
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[VendorEditProfile] Image picker error:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to pick image',
      });
    }
  }, [showToast]);

  // Validate form
  const validateForm = useCallback((): string | null => {
    if (!firstName.trim()) {
      return 'First name is required';
    }
    if (firstName.trim().length < 2) {
      return 'First name must be at least 2 characters';
    }
    const radiusNum = parseFloat(serviceRadius);
    if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 15) {
      return 'Service radius must be between 1 and 15 km';
    }
    if (selectedCategoryIds.length === 0) {
      return 'Please select at least one service category';
    }
    return null;
  }, [firstName, serviceRadius, selectedCategoryIds]);

  // Handle save
  const handleSave = useCallback(async () => {
    // Validate
    const validationError = validateForm();
    if (validationError) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: validationError,
      });
      return;
    }

    // Check if there are changes
    if (!hasChanges()) {
      showToast({
        type: 'info',
        title: 'No Changes',
        message: 'No changes to save',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Build update payload (only changed fields)
      const payload: UpdateProfileRequest = {};

      if (firstName !== originalFirstName) {
        payload.first_name = firstName.trim();
      }
      if (lastName !== originalLastName) {
        payload.last_name = lastName.trim();
      }
      if (city !== originalCity) {
        payload.city = city.trim();
      }
      if (bio !== originalBio) {
        payload.bio = bio.trim();
      }
      if (serviceRadius !== originalRadius) {
        payload.service_radius_km = parseFloat(serviceRadius);
      }
      if (newPhotoUri) {
        payload.profile_photo = newPhotoUri;
      }
      if (categoriesChanged) {
        payload.service_categories = selectedCategoryIds;
      }

      // Dispatch update action
      await dispatch(updateUserProfile(payload)).unwrap();

      showToast({
        type: 'success',
        title: 'Success',
        message: 'Profile updated successfully',
      });

      // Navigate back
      router.back();
    } catch (error) {
      console.error('[VendorEditProfile] Update error:', error);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: typeof error === 'string' ? error : 'Failed to update profile',
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    firstName,
    lastName,
    city,
    bio,
    serviceRadius,
    newPhotoUri,
    originalFirstName,
    originalLastName,
    originalCity,
    originalBio,
    originalRadius,
    categoriesChanged,
    selectedCategoryIds,
    validateForm,
    hasChanges,
    dispatch,
    showToast,
    router,
  ]);

  // Handle back with unsaved changes warning
  const handleBack = useCallback(() => {
    if (hasChanges()) {
      showToast({
        type: 'warning',
        title: 'Unsaved Changes',
        message: 'You have unsaved changes',
      });
    }
    router.back();
  }, [hasChanges, router, showToast]);

  // Get display name initials
  const getInitials = () => {
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName.charAt(0).toUpperCase();
    return first + last || 'VN';
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
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text type="headerTitle" style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!hasChanges() || isSaving}
            style={[
              styles.saveButton,
              (!hasChanges() || isSaving) && styles.saveButtonDisabled,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text
                type="button"
                style={[
                  styles.saveButtonText,
                  (!hasChanges() || isSaving) && styles.saveButtonTextDisabled,
                ]}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Profile Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={pickImage} style={styles.photoContainer}>
              {profilePhoto && !imageLoadError ? (
                <Image
                  source={{ uri: profilePhoto }}
                  style={styles.profilePhoto}
                  onError={() => setImageLoadError(true)}
                />
              ) : (
                <LinearGradient
                  colors={[COLORS.primary, COLORS.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.photoPlaceholder}
                >
                  <Ionicons name="person" size={moderateScale(50)} color={COLORS.white} />
                </LinearGradient>
              )}
              <View style={styles.cameraButton}>
                <Ionicons name="camera" size={16} color={COLORS.white} />
              </View>
            </TouchableOpacity>
            <Text type="caption" style={styles.photoHint}>
              Tap to change photo
            </Text>
          </View>

          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text type="bodySemiBold" style={styles.sectionTitle}>
              Personal Information
            </Text>

            {/* First Name */}
            <View style={styles.inputGroup}>
              <Text type="body2" style={styles.inputLabel}>
                First Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={COLORS.gray500}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter first name"
                  placeholderTextColor={COLORS.gray400}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Last Name */}
            <View style={styles.inputGroup}>
              <Text type="body2" style={styles.inputLabel}>
                Last Name
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={COLORS.gray500}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter last name"
                  placeholderTextColor={COLORS.gray400}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Phone (Read-only) */}
            <View style={styles.inputGroup}>
              <Text type="body2" style={styles.inputLabel}>
                Phone Number
              </Text>
              <View style={[styles.inputWrapper, styles.inputDisabled]}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={COLORS.gray400}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.inputTextDisabled]}
                  value={(user as any)?.phone || ''}
                  editable={false}
                />
                <Ionicons name="lock-closed" size={16} color={COLORS.gray400} />
              </View>
              <Text type="caption" style={styles.inputHint}>
                Phone number cannot be changed
              </Text>
            </View>

            {/* CNIC (Read-only) */}
            <View style={styles.inputGroup}>
              <Text type="body2" style={styles.inputLabel}>
                CNIC
              </Text>
              <View style={[styles.inputWrapper, styles.inputDisabled]}>
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={COLORS.gray400}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.inputTextDisabled]}
                  value={vendorProfile?.cnic || 'Not provided'}
                  editable={false}
                />
                <Ionicons name="lock-closed" size={16} color={COLORS.gray400} />
              </View>
              <Text type="caption" style={styles.inputHint}>
                CNIC cannot be changed after verification
              </Text>
            </View>
          </View>

          {/* Business Information Section */}
          <View style={styles.section}>
            <Text type="bodySemiBold" style={styles.sectionTitle}>
              Business Information
            </Text>

            {/* City */}
            <View style={styles.inputGroup}>
              <Text type="body2" style={styles.inputLabel}>
                City
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={COLORS.gray500}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter your city"
                  placeholderTextColor={COLORS.gray400}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Bio */}
            <View style={styles.inputGroup}>
              <Text type="body2" style={styles.inputLabel}>
                Bio
              </Text>
              <View style={[styles.inputWrapper, styles.inputMultiline]}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={COLORS.gray500}
                  style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 14 }]}
                />
                <TextInput
                  style={[styles.input, styles.inputTextarea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell customers about yourself and your services..."
                  placeholderTextColor={COLORS.gray400}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              <Text type="caption" style={styles.inputHint}>
                A good bio helps customers trust you
              </Text>
            </View>

            {/* Service Categories */}
            <View style={styles.inputGroup}>
              <Text type="body2" style={styles.inputLabel}>
                Services Offered <Text style={styles.required}>*</Text>
              </Text>
              {isLoadingCategories ? (
                <View style={styles.categoriesLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text type="caption" style={styles.loadingText}>Loading categories...</Text>
                </View>
              ) : (
                <View style={styles.categoriesGrid}>
                  {categories.map((category) => {
                    const isSelected = selectedCategoryIds.includes(category.id);
                    return (
                      <TouchableOpacity
                        key={category.id}
                        onPress={() => toggleCategory(category.id)}
                        activeOpacity={0.7}
                        style={[
                          styles.categoryCard,
                          isSelected && styles.categoryCardSelected,
                        ]}
                      >
                        <View style={styles.categoryContent}>
                          <View
                            style={[
                              styles.checkbox,
                              isSelected && styles.checkboxSelected,
                            ]}
                          >
                            {isSelected && (
                              <Ionicons name="checkmark" size={14} color={COLORS.white} />
                            )}
                          </View>
                          <Text
                            type="body2"
                            style={[
                              styles.categoryLabel,
                              isSelected && styles.categoryLabelSelected,
                            ]}
                            numberOfLines={2}
                          >
                            {category.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {!isLoadingCategories && selectedCategoryIds.length === 0 && (
                <Text type="caption" style={styles.categoryError}>
                  Please select at least one service
                </Text>
              )}
              <Text type="caption" style={styles.inputHint}>
                Choose the services you provide to customers
              </Text>
            </View>

            {/* Service Radius */}
            <View style={styles.inputGroup}>
              <Text type="body2" style={styles.inputLabel}>
                Service Radius (km)
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="locate-outline"
                  size={20}
                  color={COLORS.gray500}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={serviceRadius}
                  onChangeText={setServiceRadius}
                  placeholder="10"
                  placeholderTextColor={COLORS.gray400}
                  keyboardType="numeric"
                />
                <Text type="body2" style={styles.inputSuffix}>km</Text>
              </View>
              <Text type="caption" style={styles.inputHint}>
                Maximum distance you're willing to travel (1-15 km)
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!hasChanges() || isSaving) && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={!hasChanges() || isSaving}
            >
              <LinearGradient
                colors={
                  hasChanges() && !isSaving
                    ? [COLORS.primary, COLORS.accent]
                    : [COLORS.gray300, COLORS.gray400]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBtn}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color={COLORS.white} />
                    <Text style={styles.btnText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleBack}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Text type="bodySemiBold" style={styles.cancelBtnText}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: verticalScale(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  header: {
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(26),
    paddingHorizontal: scale(16),
    borderBottomLeftRadius: moderateScale(24),
    borderBottomRightRadius: moderateScale(24),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.white,
  },
  saveButton: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(8),
    backgroundColor: COLORS.white,
    minWidth: moderateScale(60),
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  saveButtonText: {
    color: COLORS.primary,
  },
  saveButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  content: {
    flex: 1,
  },

  // Photo section
  photoSection: {
    alignItems: 'center',
    paddingVertical: verticalScale(24),
  },
  photoContainer: {
    position: 'relative',
  },
  profilePhoto: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  photoPlaceholder: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  photoHint: {
    marginTop: verticalScale(12),
    color: COLORS.gray500,
  },

  // Sections
  section: {
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    color: COLORS.gray900,
    marginBottom: verticalScale(16),
  },

  // Input fields
  inputGroup: {
    marginBottom: verticalScale(16),
  },
  inputLabel: {
    color: COLORS.gray700,
    marginBottom: verticalScale(6),
  },
  required: {
    color: COLORS.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: scale(14),
  },
  inputMultiline: {
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: scale(10),
  },
  input: {
    flex: 1,
    height: moderateScale(48),
    fontSize: moderateScale(15),
    color: COLORS.gray900,
  },
  inputTextarea: {
    height: moderateScale(100),
    paddingTop: verticalScale(12),
  },
  inputDisabled: {
    backgroundColor: COLORS.gray100,
    borderColor: COLORS.gray200,
  },
  inputTextDisabled: {
    color: COLORS.gray500,
  },
  inputHint: {
    marginTop: verticalScale(4),
    color: COLORS.gray400,
    fontSize: moderateScale(11),
  },
  inputSuffix: {
    color: COLORS.gray500,
    marginLeft: scale(8),
  },

  // Category selection
  categoriesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(20),
    gap: scale(8),
  },
  loadingText: {
    color: COLORS.gray500,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  categoryCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(10),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(10),
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
  },
  categoryCardSelected: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: COLORS.primary,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  checkbox: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(4),
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryLabel: {
    flex: 1,
    fontSize: moderateScale(13),
    color: COLORS.gray700,
  },
  categoryLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  categoryError: {
    marginTop: verticalScale(4),
    color: COLORS.error,
    fontSize: moderateScale(11),
  },

  // Buttons
  buttonSection: {
    paddingHorizontal: scale(20),
    gap: verticalScale(12),
  },
  saveBtn: {
    borderRadius: moderateScale(12),
    overflow: 'hidden',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: moderateScale(52),
    gap: scale(8),
  },
  btnText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: COLORS.white,
  },
  cancelBtn: {
    backgroundColor: COLORS.white,
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  cancelBtnText: {
    color: COLORS.gray700,
  },
});
