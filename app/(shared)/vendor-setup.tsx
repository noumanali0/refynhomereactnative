import React, { useState, useEffect } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import Text from '@/components/common/Text';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { InputField } from '@/components/common/InputField';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import { vendorOnboarding, fetchUserProfile } from '@/store/slices/authSlice';
import useImagePicker from '@/hooks/useImagePicker';
import { moderateScale } from 'react-native-size-matters';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/api/client';
import type { VendorOnboardingRequest } from '@/types/api';

// Types
interface FormData {
  name: string;
  email: string;
  cnicNumber: string;
  city: string;
  serviceAreas: string;
  yearsOfExperience: string;
  serviceCategories: string[];
  bio: string;
}

interface FormErrors {
  [key: string]: string;
}

interface ServiceCategory {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// Constants
const CITIES = [
  'Select city',
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
  'Sukkur',
];

const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: '1', label: 'AC Repair', icon: 'snow-outline' },
  { id: '2', label: 'Refrigerator Repair', icon: 'cube-outline' },
  { id: '3', label: 'Washing Machine', icon: 'water-outline' },
  { id: '4', label: 'Plumbing', icon: 'hammer-outline' },
  { id: '5', label: 'Electrical', icon: 'flash-outline' },
  { id: '6', label: 'Kitchen Appliances', icon: 'restaurant-outline' },
  { id: '7', label: 'Geyser Repair', icon: 'thermometer-outline' },
  { id: '8', label: 'Microwave Repair', icon: 'radio-outline' },
  { id: '9', label: 'TV Repair', icon: 'tv-outline' },
  { id: '10', label: 'Other Services', icon: 'construct-outline' },
];

export default function VendorProfileSetup() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { user, isLoading: authLoading } = useAppSelector((state) => state.auth);

  // Image pickers for profile and CNIC photos
  const { imageUri: profilePhoto, pickImage: pickProfilePhoto } = useImagePicker();
  const { imageUri: cnicPhoto, pickImage: pickCnicPhoto } = useImagePicker();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: user?.name || '',
    email: '',
    cnicNumber: '',
    city: 'Select city',
    serviceAreas: '',
    yearsOfExperience: '',
    serviceCategories: [],
    bio: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateCNIC = (cnic: string): boolean => {
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    return cnicRegex.test(cnic);
  };

  // CNIC formatting helper
  const formatCNIC = (text: string): string => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 5) return cleaned;
    if (cleaned.length <= 12) return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12, 13)}`;
  };

  // Handlers
  const handleCNICChange = (text: string) => {
    const formatted = formatCNIC(text);
    setFormData(prev => ({ ...prev, cnicNumber: formatted }));
    if (errors.cnicNumber) {
      setErrors(prev => ({ ...prev, cnicNumber: '' }));
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectCity = (city: string) => {
    setFormData(prev => ({ ...prev, city }));
    setShowCityDropdown(false);
    if (errors.city) {
      setErrors(prev => ({ ...prev, city: '' }));
    }
  };

  const toggleServiceCategory = (categoryId: string) => {
    setFormData(prev => {
      const currentCategories = prev.serviceCategories;
      const updatedCategories = currentCategories.includes(categoryId)
        ? currentCategories.filter(id => id !== categoryId)
        : [...currentCategories, categoryId];

      return { ...prev, serviceCategories: updatedCategories };
    });

    if (errors.serviceCategories) {
      setErrors(prev => ({ ...prev, serviceCategories: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Profile photo validation
    if (!profilePhoto) {
      newErrors.profilePhoto = 'Profile photo is required';
      isValid = false;
    }

    // CNIC number validation
    if (!formData.cnicNumber.trim()) {
      newErrors.cnicNumber = 'CNIC number is required';
      isValid = false;
    } else if (!validateCNIC(formData.cnicNumber)) {
      newErrors.cnicNumber = 'Invalid CNIC format (e.g., 12345-1234567-1)';
      isValid = false;
    }

    // City validation
    if (formData.city === 'Select city') {
      newErrors.city = 'Please select a city';
      isValid = false;
    }

    // Service categories validation
    if (formData.serviceCategories.length === 0) {
      newErrors.serviceCategories = 'Select at least one service category';
      isValid = false;
    }

    // CNIC photo validation
    if (!cnicPhoto) {
      newErrors.cnicPhoto = 'CNIC verification photo is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill all required fields correctly',
      });
      return;
    }

    if (!user?.phoneNumber) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Phone number not found. Please login again.',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare payload for vendor onboarding
      const payload: VendorOnboardingRequest = {
        phone: user.phoneNumber,
        cnic: formData.cnicNumber,
        profile_photo: profilePhoto ?? undefined, // Base64 or file URI
        id_verification_photo: cnicPhoto ?? undefined, // Base64 or file URI
        service_categories: formData.serviceCategories, // Already string[], matches (number | string)[]
        bio: formData.bio || undefined,
        address: formData.serviceAreas || undefined,
        city: formData.city !== 'Select city' ? formData.city : undefined,
        experience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : undefined,
      };

      // Dispatch vendor onboarding action
      const result = await dispatch(vendorOnboarding(payload)).unwrap();

      // Fetch updated user profile
      await dispatch(fetchUserProfile()).unwrap();

      // Show success toast
      showToast({
        type: 'success',
        title: 'Profile Submitted!',
        message: result.message || 'Your profile is under review',
      });

      // Navigate to pending verification screen
      router.replace('/(shared)/pending-verification');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      showToast({
        type: 'error',
        title: 'Submission Failed',
        message: errorMessage,
      });
      console.error('Vendor onboarding error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Gradient Header Background */}
      <LinearGradient
        colors={['#2563EB', '#F97316']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
              style={styles.logoCircle}
            >
              <Ionicons name="construct" size={36} color="#fff" />
            </LinearGradient>
          </View>
          <Text type="title" style={styles.appName}>Complete Your Profile</Text>
          <Text type="body2" style={styles.tagline}>Let's set up your vendor profile</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <LinearGradient
                colors={['rgba(37, 99, 235, 0.1)', 'rgba(249, 115, 22, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.infoBannerGradient}
              >
                <Ionicons name="information-circle" size={24} color="#F97316" />
                <Text type="body" style={styles.infoBannerText}>
                  Complete profile helps customers trust you more
                </Text>
              </LinearGradient>
            </View>

            {/* Profile Photo Upload */}
            <View style={styles.photoContainer}>
              <Text type="subtitle2" style={styles.photoLabel}>
                Profile Photo <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                onPress={pickProfilePhoto}
                activeOpacity={0.8}
                style={styles.photoUploadContainer}
              >
                {profilePhoto ? (
                  <View style={styles.photoPreviewContainer}>
                    <Image
                      source={{ uri: profilePhoto }}
                      style={styles.photoPreview}
                    />
                    <View style={styles.photoEditOverlay}>
                      <LinearGradient
                        colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
                        style={styles.photoEditGradient}
                      >
                        <Ionicons name="camera" size={24} color="#fff" />
                        <Text type="bodySemiBold" style={styles.photoEditText}>Change Photo</Text>
                      </LinearGradient>
                    </View>
                  </View>
                ) : (
                  <LinearGradient
                    colors={['rgba(37, 99, 235, 0.1)', 'rgba(249, 115, 22, 0.1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.photoPlaceholder}
                  >
                    <View
                      style={[
                        styles.photoIconContainer,
                        errors.profilePhoto && styles.photoIconContainerError,
                      ]}
                    >
                      <Ionicons name="camera" size={40} color="#F97316" />
                    </View>
                    <Text type="bodySemiBold" style={styles.photoPlaceholderText}>
                      Tap to upload photo
                    </Text>
                    <Text type="body" style={styles.photoPlaceholderSubtext}>
                      JPG, PNG (Max 5MB)
                    </Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
              {errors.profilePhoto ? (
                <Text type="body" style={styles.errorText}>{errors.profilePhoto}</Text>
              ) : null}
            </View>

            {/* CNIC Number Input */}
            <View style={styles.inputContainer}>
              <Text type="subtitle2" style={styles.inputLabel}>
                CNIC Number <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.cnicNumber && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="card-outline"
                  size={20}
                  color="#2563EB"
                  style={styles.inputIcon}
                />
                <InputField
                  placeholder="12345-1234567-1"
                  value={formData.cnicNumber}
                  onChangeText={handleCNICChange}
                  keyboardType="number-pad"
                  maxLength={15}
                  style={styles.input}
                />
              </View>
              {errors.cnicNumber ? (
                <Text type="body" style={styles.errorText}>{errors.cnicNumber}</Text>
              ) : null}
            </View>

            {/* City Dropdown */}
            <View style={styles.inputContainer}>
              <Text type="subtitle2" style={styles.inputLabel}>
                City <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setShowCityDropdown(!showCityDropdown)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.inputWrapper,
                    errors.city && styles.inputWrapperError,
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color="#2563EB"
                    style={styles.inputIcon}
                  />
                  <Text
                    type="body2"
                    style={[
                      styles.dropdownText,
                      formData.city === 'Select city' && styles.placeholderText,
                    ]}
                  >
                    {formData.city}
                  </Text>
                  <Ionicons
                    name={showCityDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#64748b"
                  />
                </View>
              </TouchableOpacity>
              {showCityDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView
                    style={styles.dropdownScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {CITIES.map((city) => (
                      <TouchableOpacity
                        key={city}
                        onPress={() => selectCity(city)}
                        style={[
                          styles.dropdownItem,
                          formData.city === city && styles.dropdownItemSelected,
                        ]}
                      >
                        <Text
                          type="body2"
                          style={[
                            styles.dropdownItemText,
                            formData.city === city && styles.dropdownItemTextSelected,
                          ]}
                        >
                          {city}
                        </Text>
                        {formData.city === city && (
                          <Ionicons name="checkmark" size={20} color="#2563EB" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {errors.city ? (
                <Text type="body" style={styles.errorText}>{errors.city}</Text>
              ) : null}
            </View>

            {/* Service Areas Input */}
            <View style={styles.inputContainer}>
              <Text type="subtitle2" style={styles.inputLabel}>Service Areas</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="map-outline"
                  size={20}
                  color="#F97316"
                  style={styles.inputIcon}
                />
                <InputField
                  placeholder="e.g., Clifton, Defence, PECHS"
                  value={formData.serviceAreas}
                  onChangeText={(text) => handleInputChange('serviceAreas', text)}
                  style={styles.input}
                />
              </View>
            </View>

            {/* Years of Experience */}
            <View style={styles.inputContainer}>
              <Text type="subtitle2" style={styles.inputLabel}>Years of Experience</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="briefcase-outline"
                  size={20}
                  color="#2563EB"
                  style={styles.inputIcon}
                />
                <InputField
                  placeholder="Enter years"
                  value={formData.yearsOfExperience}
                  onChangeText={(text) => {
                    const numbersOnly = text.replace(/[^0-9]/g, '');
                    handleInputChange('yearsOfExperience', numbersOnly);
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={styles.input}
                />
              </View>
            </View>

            {/* Service Categories */}
            <View style={styles.inputContainer}>
              <Text type="subtitle2" style={styles.inputLabel}>
                Service Categories <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.categoriesGrid}>
                {SERVICE_CATEGORIES.map((category) => {
                  const isSelected = formData.serviceCategories.includes(category.id);
                  return (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => toggleServiceCategory(category.id)}
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
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </View>
                        <Text
                          type="body"
                          style={[
                            styles.categoryLabel,
                            isSelected && styles.categoryLabelSelected,
                          ]}
                          numberOfLines={2}
                        >
                          {category.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.serviceCategories ? (
                <Text type="body" style={styles.errorText}>{errors.serviceCategories}</Text>
              ) : null}
            </View>

            {/* Bio */}
            <View style={styles.inputContainer}>
              <Text type="subtitle2" style={styles.inputLabel}>Bio</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#F97316"
                  style={[styles.inputIcon, styles.textAreaIcon]}
                />
                <InputField
                  placeholder="Tell customers about your expertise..."
                  value={formData.bio}
                  onChangeText={(text) => handleInputChange('bio', text)}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={styles.textArea}
                />
              </View>
            </View>

            {/* CNIC Verification Photo */}
            <View style={styles.photoContainer}>
              <Text type="subtitle2" style={styles.photoLabel}>
                ID Verification Photo (CNIC) <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                onPress={pickCnicPhoto}
                activeOpacity={0.8}
                style={styles.cnicPhotoUploadContainer}
              >
                <LinearGradient
                  colors={['rgba(37, 99, 235, 0.1)', 'rgba(249, 115, 22, 0.1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.cnicPhotoPlaceholder,
                    cnicPhoto && styles.cnicPhotoSelected,
                  ]}
                >
                  <View style={styles.cnicPhotoContent}>
                    <Ionicons
                      name="document-attach-outline"
                      size={28}
                      color={errors.cnicPhoto ? '#ef4444' : '#F97316'}
                    />
                    <View style={styles.cnicPhotoTextContainer}>
                      <Text type="bodySemiBold" style={styles.cnicPhotoButtonText}>Choose File</Text>
                      <Text type="body" style={styles.cnicPhotoSubtext}>
                        {cnicPhoto ? 'File selected ✓' : 'No file chosen'}
                      </Text>
                    </View>
                  </View>
                  {cnicPhoto && (
                    <View style={styles.cnicPhotoPreviewThumb}>
                      <Image
                        source={{ uri: cnicPhoto }}
                        style={styles.cnicPhotoThumbImage}
                      />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              {errors.cnicPhoto ? (
                <Text type="body" style={styles.errorText}>{errors.cnicPhoto}</Text>
              ) : null}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading || authLoading}
              activeOpacity={0.8}
              style={styles.submitButton}
            >
              <LinearGradient
                colors={
                  isLoading || authLoading
                    ? ['#94a3b8', '#94a3b8']
                    : ['#2563EB', '#F97316']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonInner}
              >
                {isLoading || authLoading ? (
                  <Ionicons name="hourglass-outline" size={20} color="#fff" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                )}
                <Text type="button" style={styles.submitButtonText}>
                  {isLoading || authLoading ? 'Submitting...' : 'Submit for Review'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerGradient: {
    paddingBottom: moderateScale(20),
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: moderateScale(16)
  },
  backButton: {
    position: 'absolute',
    top: moderateScale(10),
    left: moderateScale(16),
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: moderateScale(20),
  },
  logoContainer: {
    marginBottom: moderateScale(16),
  },
  logoCircle: {
    width: moderateScale(70),
    height: moderateScale(70),
    borderRadius: moderateScale(35),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  appName: {
    fontSize: moderateScale(26),
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    color: 'rgba(255,255,255,0.9)',
  },
  formContainer: {
    flex: 1,
    marginTop: moderateScale(-20),
  },
  scrollContent: {
    padding: moderateScale(20),
    paddingBottom: moderateScale(40),
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: moderateScale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  infoBanner: {
    marginBottom: moderateScale(24),
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(14),
    gap: 12,
  },
  infoBannerText: {
    flex: 1,
    color: '#334155',
    lineHeight: 18,
  },
  photoContainer: {
    marginBottom: moderateScale(24),
  },
  photoLabel: {
    color: '#334155',
    marginBottom: 12,
  },
  photoUploadContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoPreviewContainer: {
    width: '100%',
    height: moderateScale(200),
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoEditOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  photoEditGradient: {
    padding: moderateScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoEditText: {
    color: '#fff',
  },
  photoPlaceholder: {
    height: moderateScale(200),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  photoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoIconContainerError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  photoPlaceholderText: {
    color: '#334155',
    marginTop: 8,
  },
  photoPlaceholderSubtext: {
    color: '#64748b',
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: moderateScale(20),
  },
  inputLabel: {
    color: '#334155',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    minHeight: moderateScale(50),
  },
  textArea: {
    flex: 1,
    minHeight: moderateScale(80),
    fontSize: moderateScale(15),
    color: '#1e293b',
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  textAreaIcon: {
    marginTop: 4,
  },
  errorText: {
    color: '#ef4444',
    marginTop: 6,
    marginLeft: 4,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: moderateScale(50),
    fontSize: moderateScale(15),
    color: '#1e293b',
  },
  submitButton: {
    marginTop: moderateScale(10),
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: moderateScale(54),
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: moderateScale(160),
    overflow: 'hidden',
  },
  dropdownScroll: {
    paddingVertical: 4,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  dropdownItemText: {
    color: '#334155',
  },
  dropdownItemTextSelected: {
    color: '#2563eb',
  },
  dropdownText: {
    flex: 1,
    color: '#0f172a',
  },
  placeholderText: {
    color: '#94a3b8',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(12),
    marginTop: 6,
  },
  categoryCard: {
    width: '47.5%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: moderateScale(16),
    paddingHorizontal: 10,
  },
  categoryCardSelected: {
    backgroundColor: 'rgba(37,99,235,0.1)',
    borderColor: '#2563eb',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#94a3b8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryLabel: {
    color: '#334155',
    flex: 1,
  },
  categoryLabelSelected: {
    color: '#1e293b',
  },
  cnicPhotoUploadContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cnicPhotoPlaceholder: {
    padding: moderateScale(16),
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: moderateScale(70),
  },
  cnicPhotoSelected: {
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  cnicPhotoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cnicPhotoTextContainer: {
    marginLeft: 12,
  },
  cnicPhotoButtonText: {
    color: '#0f172a',
  },
  cnicPhotoSubtext: {
    color: '#64748b',
  },
  cnicPhotoPreviewThumb: {
    width: 55,
    height: 55,
    borderRadius: 8,
    overflow: 'hidden',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cnicPhotoThumbImage: {
    width: '100%',
    height: '100%',
  },
});
