/**
 * Customer Edit Profile Screen
 *
 * Allows customers to update their profile information:
 * - First name, Last name
 * - Address, City
 * - Profile photo
 *
 * Integrates with PATCH /api/auth/update-profile/
 */

import React, { useState, useCallback } from 'react';
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
import type { AppDispatch } from '@/store';
import type { UpdateProfileRequest } from '@/types/api';

export default function CustomerEditProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();

  // Get current user from Redux
  const { user, isLoading } = useAppSelector((state) => state.auth);

  // Form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || '');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(
    user?.profilePhoto || user?.profilePhotoUrl || null
  );
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Track if form has changes
  const hasChanges = useCallback(() => {
    if (newPhotoUri) return true;
    if (firstName !== (user?.firstName || '')) return true;
    if (lastName !== (user?.lastName || '')) return true;
    if (address !== (user?.address || '')) return true;
    if (city !== (user?.city || '')) return true;
    return false;
  }, [firstName, lastName, address, city, newPhotoUri, user]);

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
      console.error('[EditProfile] Image picker error:', error);
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
    return null;
  }, [firstName]);

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

      if (firstName !== (user?.firstName || '')) {
        payload.first_name = firstName.trim();
      }
      if (lastName !== (user?.lastName || '')) {
        payload.last_name = lastName.trim();
      }
      if (address !== (user?.address || '')) {
        payload.address = address.trim();
      }
      if (city !== (user?.city || '')) {
        payload.city = city.trim();
      }
      if (newPhotoUri) {
        payload.profile_photo = newPhotoUri;
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
      console.error('[EditProfile] Update error:', error);
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
    address,
    city,
    newPhotoUri,
    user,
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
    return first + last || 'U';
  };

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
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
          <Text type="title" style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!hasChanges() || isSaving}
            style={[
              styles.saveHeaderButton,
              (!hasChanges() || isSaving) && styles.saveHeaderButtonDisabled,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text
                type="button"
                style={[
                  styles.saveHeaderButtonText,
                  (!hasChanges() || isSaving) && styles.saveHeaderButtonTextDisabled,
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
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={pickImage} style={styles.photoContainer}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text type="title" style={styles.photoPlaceholderText}>
                    {getInitials()}
                  </Text>
                </View>
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
                  value={user?.phone || ''}
                  editable={false}
                />
                <Ionicons name="lock-closed" size={16} color={COLORS.gray400} />
              </View>
              <Text type="caption" style={styles.inputHint}>
                Phone number cannot be changed
              </Text>
            </View>
          </View>

          {/* Address Information Section */}
          <View style={styles.section}>
            <Text type="bodySemiBold" style={styles.sectionTitle}>
              Address Information
            </Text>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text type="body2" style={styles.inputLabel}>
                Address
              </Text>
              <View style={[styles.inputWrapper, styles.inputMultiline]}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={COLORS.gray500}
                  style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 14 }]}
                />
                <TextInput
                  style={[styles.input, styles.inputTextarea]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter your address"
                  placeholderTextColor={COLORS.gray400}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* City */}
            <View style={styles.inputGroup}>
              <Text type="body2" style={styles.inputLabel}>
                City
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="business-outline"
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
          </View>

          {/* Buttons Section */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!hasChanges() || isSaving) && styles.saveButtonDisabled,
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
              style={styles.cancelButton}
              onPress={handleBack}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Text type="bodySemiBold" style={styles.cancelButtonText}>
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
  // Header styles
  header: {
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(16),
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
  saveHeaderButton: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(8),
    backgroundColor: COLORS.white,
    minWidth: moderateScale(60),
    alignItems: 'center',
  },
  saveHeaderButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  saveHeaderButtonText: {
    color: COLORS.primary,
  },
  saveHeaderButtonTextDisabled: {
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
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  photoPlaceholderText: {
    fontSize: moderateScale(40),
    color: COLORS.white,
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

  // Section styles
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
    height: moderateScale(80),
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

  // Buttons
  buttonSection: {
    paddingHorizontal: scale(20),
    gap: verticalScale(12),
  },
  saveButton: {
    borderRadius: moderateScale(12),
    overflow: 'hidden',
  },
  saveButtonDisabled: {
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
  cancelButton: {
    backgroundColor: COLORS.white,
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  cancelButtonText: {
    color: COLORS.gray700,
  },
});
