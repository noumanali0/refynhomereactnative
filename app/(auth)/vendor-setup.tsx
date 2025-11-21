import React, { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  TextInput,
} from 'react-native';
import Text from '@/components/common/Text';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InputField } from '@/components/common/InputField';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { updateProfile } from '@/store/slices/authSlice';
import useImagePicker from '@/hooks/useImagePicker';
import { moderateScale } from 'react-native-size-matters';

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
  { id: 'ac_repair', label: 'AC Repair', icon: 'snow-outline' },
  { id: 'refrigerator', label: 'Refrigerator Repair', icon: 'cube-outline' },
  { id: 'washing_machine', label: 'Washing Machine', icon: 'water-outline' },
  { id: 'plumbing', label: 'Plumbing', icon: 'hammer-outline' },
  { id: 'electrical', label: 'Electrical', icon: 'flash-outline' },
  { id: 'kitchen', label: 'Kitchen Appliances', icon: 'restaurant-outline' },
  { id: 'geyser', label: 'Geyser Repair', icon: 'thermometer-outline' },
  { id: 'microwave', label: 'Microwave Repair', icon: 'radio-outline' },
  { id: 'tv', label: 'TV Repair', icon: 'tv-outline' },
  { id: 'other', label: 'Other Services', icon: 'construct-outline' },
];

export default function VendorProfileSetup() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Image pickers for profile and CNIC photos
  const { imageUri: profilePhoto, pickImage: pickProfilePhoto } = useImagePicker();
  const { imageUri: cnicPhoto, pickImage: pickCnicPhoto } = useImagePicker();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
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
  React.useEffect(() => {
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

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
      isValid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    // City validation
    if (formData.city === 'Select city') {
      newErrors.city = 'Please select a city';
      isValid = false;
    }

    // Service areas validation
    if (!formData.serviceAreas.trim()) {
      newErrors.serviceAreas = 'Service areas are required';
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

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      // Update user in Redux
      dispatch(
        updateProfile({
          name: formData.name,
          email: formData.email,
          cnicNumber: formData.cnicNumber,
          city: formData.city,
          serviceAreas: formData.serviceAreas,
          yearsOfExperience: formData.yearsOfExperience,
          serviceCategories: formData.serviceCategories,
          bio: formData.bio,
          profilePhoto,
          cnicPhoto,
        })
      );

      setIsLoading(false);
      // Navigate to vendor dashboard
      router.replace('/(vendor)/(dashboard)');
    }, 1500);
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

        {/* Progress Indicator */}
        {/* <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#fff', 'rgba(255,255,255,0.8)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressFill}
            />
          </View>
          <Text style={styles.progressText}>Step 3 of 3</Text>
        </View> */}
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
              <Text type="subtitle2" style={styles.inputLabel}>
                Service Areas <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.serviceAreas && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="map-outline"
                  size={20}
                  color="#F97316"
                  style={styles.inputIcon}
                />
                <InputField
                  placeholder="e.g., Clifton, Defence, PECHS (comma separated)"
                  value={formData.serviceAreas}
                  onChangeText={(text) => handleInputChange('serviceAreas', text)}
                  style={styles.input}
                />
              </View>
              {errors.serviceAreas ? (
                <Text type="body" style={styles.errorText}>{errors.serviceAreas}</Text>
              ) : null}
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
                  placeholder="Enter years of experience"
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

            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <Text type="subtitle2" style={styles.inputLabel}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.name && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#2563EB"
                  style={styles.inputIcon}
                />
                <InputField
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChangeText={(text) => handleInputChange('name', text)}
                  style={styles.input}
                />
              </View>
              {errors.name ? (
                <Text type="body" style={styles.errorText}>{errors.name}</Text>
              ) : null}
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text type="subtitle2" style={styles.inputLabel}>
                Email Address <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.email && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#F97316"
                  style={styles.inputIcon}
                />
                <InputField
                  placeholder="your@email.com"
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
              {errors.email ? (
                <Text type="body" style={styles.errorText}>{errors.email}</Text>
              ) : null}
              <Text type="body" style={styles.hintText}>
                We'll use this for important notifications
              </Text>
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
              disabled={isLoading}
              activeOpacity={0.8}
              style={styles.submitButton}
            >
              <LinearGradient
                colors={['#2563EB', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonInner}
              >
                {isLoading ? (
                  <Ionicons name="hourglass-outline" size={20} color="#fff" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                )}
                <Text type="button" style={styles.submitButtonText}>
                  {isLoading ? 'Setting Up...' : 'Complete Profile'}
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
  progressContainer: {
    paddingHorizontal: moderateScale(40),
    marginTop: moderateScale(20),
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '100%',
  },
  progressText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.9)',
    fontSize: moderateScale(12),
    fontWeight: '600',
    marginTop: 8,
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

  hintText: {
    color: '#64748b',
    marginTop: 4,
  },
  /* DROPDOWN */
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

  /* CATEGORY GRID */
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


  /* CNIC FILE UPLOAD */
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
// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   StyleSheet,
//   TouchableOpacity,
//   Animated,
//   Image,
// } from 'react-native';
// import { useRouter } from 'expo-router';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { InputField } from '@/components/common/InputField';
// import { useAppDispatch } from '@/hooks/useAppDispatch';
// import { updateProfile } from '@/store/slices/authSlice';
// import useImagePicker from '@/hooks/useImagePicker';
// import { moderateScale } from 'react-native-size-matters';

// export default function VendorProfileSetup() {
//   const router = useRouter();
//   const dispatch = useAppDispatch();
//   const { imageUri, pickImage } = useImagePicker();
//   const [formData, setFormData] = useState({
//     name: '',
//     email: '',
//   });
//   const [errors, setErrors] = useState({
//     name: '',
//     email: '',
//     photo: '',
//   });
//   const [isLoading, setIsLoading] = useState(false);
//   const [fadeAnim] = useState(new Animated.Value(0));

//   React.useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 800,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const validateEmail = (email: string) => {
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return emailRegex.test(email);
//   };

//   const validateForm = () => {
//     const newErrors = {
//       name: '',
//       email: '',
//       photo: '',
//     };
//     let isValid = true;

//     if (!imageUri) {
//       newErrors.photo = 'Profile photo is required';
//       isValid = false;
//     }

//     if (!formData.name.trim()) {
//       newErrors.name = 'Name is required';
//       isValid = false;
//     } else if (formData.name.trim().length < 2) {
//       newErrors.name = 'Name must be at least 2 characters';
//       isValid = false;
//     }

//     if (!formData.email.trim()) {
//       newErrors.email = 'Email is required';
//       isValid = false;
//     } else if (!validateEmail(formData.email)) {
//       newErrors.email = 'Please enter a valid email';
//       isValid = false;
//     }

//     setErrors(newErrors);
//     return isValid;
//   };

//   const handleSubmit = () => {
//     if (!validateForm()) {
//       return;
//     }

//     setIsLoading(true);

//     // Simulate API call
//     setTimeout(() => {
//       // Update user in Redux
//       dispatch(
//         updateProfile({
//           name: formData.name,
//           email: formData.email,
//           profilePhoto: imageUri,
//         })
//       );

//       setIsLoading(false);
//       // Navigate to vendor dashboard
//       router.replace('/(vendor)/(dashboard)');
//     }, 1500);
//   };

//   return (
//     <View style={styles.container}>
//       {/* Gradient Header Background */}
//       <LinearGradient
//         colors={['#2563EB', '#F97316']}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 1 }}
//         style={styles.headerGradient}
//       >
//         <View style={styles.headerContent}>
//           <View style={styles.logoContainer}>
//             <LinearGradient
//               colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
//               style={styles.logoCircle}
//             >
//               <Ionicons name="construct" size={36} color="#fff" />
//             </LinearGradient>
//           </View>
//           <Text style={styles.appName}>Complete Your Profile</Text>
//           <Text style={styles.tagline}>Let's set up your vendor profile</Text>
//         </View>

//         {/* Progress Indicator */}
//         <View style={styles.progressContainer}>
//           <View style={styles.progressBar}>
//             <LinearGradient
//               colors={['#fff', 'rgba(255,255,255,0.8)']}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 0 }}
//               style={styles.progressFill}
//             />
//           </View>
//           <Text style={styles.progressText}>Step 3 of 3</Text>
//         </View>
//       </LinearGradient>

//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         style={styles.formContainer}
//       >
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={styles.scrollContent}
//         >
//           <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
//             {/* Info Banner */}
//             <View style={styles.infoBanner}>
//               <LinearGradient
//                 colors={['rgba(37, 99, 235, 0.1)', 'rgba(249, 115, 22, 0.1)']}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 0 }}
//                 style={styles.infoBannerGradient}
//               >
//                 <Ionicons name="information-circle" size={24} color="#F97316" />
//                 <Text style={styles.infoBannerText}>
//                   Complete profile helps customers trust you more
//                 </Text>
//               </LinearGradient>
//             </View>

//             {/* Profile Photo Upload */}
//             <View style={styles.photoContainer}>
//               <Text style={styles.photoLabel}>
//                 Profile Photo <Text style={styles.required}>*</Text>
//               </Text>
//               <TouchableOpacity
//                 onPress={pickImage}
//                 activeOpacity={0.8}
//                 style={styles.photoUploadContainer}
//               >
//                 {imageUri ? (
//                   <View style={styles.photoPreviewContainer}>
//                     <Image
//                       source={{ uri: imageUri }}
//                       style={styles.photoPreview}
//                     />
//                     <View style={styles.photoEditOverlay}>
//                       <LinearGradient
//                         colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
//                         style={styles.photoEditGradient}
//                       >
//                         <Ionicons name="camera" size={24} color="#fff" />
//                         <Text style={styles.photoEditText}>Change Photo</Text>
//                       </LinearGradient>
//                     </View>
//                   </View>
//                 ) : (
//                   <LinearGradient
//                     colors={['rgba(37, 99, 235, 0.1)', 'rgba(249, 115, 22, 0.1)']}
//                     start={{ x: 0, y: 0 }}
//                     end={{ x: 1, y: 1 }}
//                     style={styles.photoPlaceholder}
//                   >
//                     <View
//                       style={[
//                         styles.photoIconContainer,
//                         errors.photo && styles.photoIconContainerError,
//                       ]}
//                     >
//                       <Ionicons name="camera" size={40} color="#F97316" />
//                     </View>
//                     <Text style={styles.photoPlaceholderText}>
//                       Tap to upload photo
//                     </Text>
//                     <Text style={styles.photoPlaceholderSubtext}>
//                       JPG, PNG (Max 5MB)
//                     </Text>
//                   </LinearGradient>
//                 )}
//               </TouchableOpacity>
//               {errors.photo ? (
//                 <Text style={styles.errorText}>{errors.photo}</Text>
//               ) : null}
//             </View>

//             {/* Full Name Input */}
//             <View style={styles.inputContainer}>
//               <Text style={styles.inputLabel}>
//                 Full Name <Text style={styles.required}>*</Text>
//               </Text>
//               <View
//                 style={[
//                   styles.inputWrapper,
//                   errors.name && styles.inputWrapperError,
//                 ]}
//               >
//                 <Ionicons
//                   name="person-outline"
//                   size={20}
//                   color="#2563EB"
//                   style={styles.inputIcon}
//                 />
//                 <InputField
//                   placeholder="Enter your full name"
//                   value={formData.name}
//                   onChangeText={(text) => {
//                     setFormData({ ...formData, name: text });
//                     setErrors({ ...errors, name: '' });
//                   }}
//                   style={styles.input}
//                 />
//               </View>
//               {errors.name ? (
//                 <Text style={styles.errorText}>{errors.name}</Text>
//               ) : null}
//             </View>

//             {/* Email Input */}
//             <View style={styles.inputContainer}>
//               <Text style={styles.inputLabel}>
//                 Email Address <Text style={styles.required}>*</Text>
//               </Text>
//               <View
//                 style={[
//                   styles.inputWrapper,
//                   errors.email && styles.inputWrapperError,
//                 ]}
//               >
//                 <Ionicons
//                   name="mail-outline"
//                   size={20}
//                   color="#F97316"
//                   style={styles.inputIcon}
//                 />
//                 <InputField
//                   placeholder="your@email.com"
//                   value={formData.email}
//                   onChangeText={(text) => {
//                     setFormData({ ...formData, email: text });
//                     setErrors({ ...errors, email: '' });
//                   }}
//                   keyboardType="email-address"
//                   autoCapitalize="none"
//                   style={styles.input}
//                 />
//               </View>
//               {errors.email ? (
//                 <Text style={styles.errorText}>{errors.email}</Text>
//               ) : null}
//               <Text style={styles.hintText}>
//                 We'll use this for important notifications
//               </Text>
//             </View>

//             {/* Submit Button */}
//             <TouchableOpacity
//               onPress={handleSubmit}
//               disabled={isLoading}
//               activeOpacity={0.8}
//               style={styles.submitButton}
//             >
//               <LinearGradient
//                 colors={['#2563EB', '#F97316']}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 0 }}
//                 style={styles.submitButtonInner}
//               >
//                 {isLoading ? (
//                   <Ionicons name="hourglass-outline" size={20} color="#fff" />
//                 ) : (
//                   <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
//                 )}
//                 <Text style={styles.submitButtonText}>
//                   {isLoading ? 'Setting Up...' : 'Complete Setup'}
//                 </Text>
//               </LinearGradient>
//             </TouchableOpacity>
//           </Animated.View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f8fafc',
//   },
//   headerGradient: {
//     paddingBottom: moderateScale(30),
//     borderBottomLeftRadius: 30,
//     borderBottomRightRadius: 30,
//   },
//   headerContent: {
//     alignItems: 'center',
//     paddingTop: moderateScale(20),
//   },
//   logoContainer: {
//     marginBottom: moderateScale(16),
//   },
//   logoCircle: {
//     width: moderateScale(70),
//     height: moderateScale(70),
//     borderRadius: moderateScale(35),
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 3,
//     borderColor: 'rgba(255,255,255,0.3)',
//   },
//   appName: {
//     fontSize: moderateScale(26),
//     fontWeight: '800',
//     color: '#fff',
//     marginBottom: 4,
//     textShadowColor: 'rgba(0,0,0,0.1)',
//     textShadowOffset: { width: 0, height: 2 },
//     textShadowRadius: 4,
//   },
//   tagline: {
//     fontSize: moderateScale(14),
//     color: 'rgba(255,255,255,0.9)',
//     fontWeight: '500',
//   },
//   progressContainer: {
//     paddingHorizontal: moderateScale(40),
//     marginTop: moderateScale(20),
//   },
//   progressBar: {
//     height: 4,
//     backgroundColor: 'rgba(255,255,255,0.3)',
//     borderRadius: 2,
//     overflow: 'hidden',
//   },
//   progressFill: {
//     height: '100%',
//     width: '100%',
//   },
//   progressText: {
//     textAlign: 'center',
//     color: 'rgba(255,255,255,0.9)',
//     fontSize: moderateScale(12),
//     fontWeight: '600',
//     marginTop: 8,
//   },
//   formContainer: {
//     flex: 1,
//     marginTop: moderateScale(-20),
//   },
//   scrollContent: {
//     padding: moderateScale(20),
//   },
//   formCard: {
//     backgroundColor: '#fff',
//     borderRadius: 24,
//     padding: moderateScale(24),
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 12,
//     elevation: 8,
//   },
//   infoBanner: {
//     marginBottom: moderateScale(24),
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   infoBannerGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: moderateScale(14),
//     gap: 12,
//   },
//   infoBannerText: {
//     flex: 1,
//     fontSize: moderateScale(13),
//     color: '#334155',
//     lineHeight: 18,
//     fontWeight: '500',
//   },
//   photoContainer: {
//     marginBottom: moderateScale(24),
//   },
//   photoLabel: {
//     fontSize: moderateScale(14),
//     fontWeight: '600',
//     color: '#334155',
//     marginBottom: 12,
//     textAlign: 'center',
//   },
//   submitButton: {
//     marginTop: moderateScale(10),
//     borderRadius: 12,
//     overflow: 'hidden',
//     shadowColor: '#2563EB',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   submitButtonInner: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     height: moderateScale(54),
//     gap: 8,
//   },
//   submitButtonText: {
//     fontSize: moderateScale(16),
//     fontWeight: '700',
//     color: '#fff',
//   },
//   errorText: {
//     fontSize: moderateScale(12),
//     color: '#ef4444',
//     marginTop: 6,
//     marginLeft: 4,
//   },
//   inputContainer: {
//     marginBottom: moderateScale(20),
//   },
//   inputLabel: {
//     fontSize: moderateScale(14),
//     fontWeight: '600',
//     color: '#334155',
//     marginBottom: 8,
//   },
//   required: {
//     color: '#ef4444',
//   },
//   inputWrapper: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#f8fafc',
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#e2e8f0',
//     paddingHorizontal: 16,
//   },
//   inputWrapperError: {
//     borderColor: '#ef4444',
//     backgroundColor: '#fef2f2',
//   },
//   textAreaWrapper: {
//     alignItems: 'flex-start',
//     paddingVertical: 12,
//   },
//   inputIcon: {
//     marginRight: 12,
//   },
//   textAreaIcon: {
//     marginTop: 4,
//   },
//   input: {
//     flex: 1,
//     height: moderateScale(50),
//     fontSize: moderateScale(15),
//     color: '#1e293b',
//   },
//   textArea: {
//     flex: 1,
//     minHeight: moderateScale(80),
//     fontSize: moderateScale(15),
//     color: '#1e293b',
//     textAlignVertical: 'top',
//     paddingTop: 4,
//   },
// })


// // import React, { useState } from 'react';
// // import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
// // import { useRouter } from 'expo-router';
// // import { useAppDispatch } from '../../src/hooks/useAppDispatch';
// // import { loginSuccess } from '../../src/store/slices/authSlice';
// // import { AppButton } from '../../src/components/common/AppButton';
// // import { InputField } from '../../src/components/common/InputField';
// // import { Header } from '../../src/components/common/Header';
// // import { Vendor, ServiceCategory } from '../../src/types';
// // import { SERVICE_CATEGORIES } from '../../src/constants/serviceCategories';

// // export default function VendorSetup() {
// //   const router = useRouter();
// //   const dispatch = useAppDispatch();
// //   const [name, setName] = useState('');
// //   const [cnic, setCnic] = useState('');
// //   const [city, setCity] = useState('');
// //   const [selectedCategories, setSelectedCategories] = useState<ServiceCategory[]>([]);
// //   const [isLoading, setIsLoading] = useState(false);

// //   const toggleCategory = (category: ServiceCategory) => {
// //     if (selectedCategories.includes(category)) {
// //       setSelectedCategories(selectedCategories.filter((c) => c !== category));
// //     } else {
// //       setSelectedCategories([...selectedCategories, category]);
// //     }
// //   };

// //   const handleComplete = () => {
// //     setIsLoading(true);
// //     setTimeout(() => {
// //       const vendor: Vendor = {
// //         id: `v${Date.now()}`,
// //         phoneNumber: '+923001234567',
// //         role: 'vendor',
// //         name,
// //         cnic,
// //         city,
// //         serviceCategories: selectedCategories,
// //         rating: 0,
// //         totalReviews: 0,
// //         verified: false,
// //         isOnline: true,
// //       };
// //       dispatch(loginSuccess(vendor));
// //       setIsLoading(false);
// //       router.replace('/vendor/dashboard' as any);
// //     }, 1000);
// //   };

// //   const isFormValid =
// //     name.length > 0 && cnic.length > 0 && city.length > 0 && selectedCategories.length > 0;

// //   return (
// //     <SafeAreaView className="flex-1 bg-white">
// //       <Header title="Complete Your Profile" />
// //       <KeyboardAvoidingView
// //         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
// //         className="flex-1"
// //       >
// //         <ScrollView className="flex-1 px-6 pt-6">
// //           <InputField
// //             label="Full Name"
// //             placeholder="Enter your name"
// //             value={name}
// //             onChangeText={setName}
// //           />
// //           <InputField
// //             label="CNIC"
// //             placeholder="42101-1234567-1"
// //             value={cnic}
// //             onChangeText={setCnic}
// //             keyboardType="number-pad"
// //           />
// //           <InputField
// //             label="City"
// //             placeholder="e.g., Karachi, Lahore"
// //             value={city}
// //             onChangeText={setCity}
// //           />

// //           <Text className="text-gray-700 font-medium mb-3">Service Categories</Text>
// //           {/* <View className="flex-row flex-wrap mb-6">
// //             {SERVICE_CATEGORIES.map((category) => (
// //               <TouchableOpacity
// //                 key={category}
// //                 className={`px-4 py-2 rounded-full mr-2 mb-2 ${
// //                   selectedCategories.includes(category)
// //                     ? 'bg-primary'
// //                     : 'bg-gray-200'
// //                 }`}
// //                 onPress={() => toggleCategory(category)}
// //               >
// //                 <Text
// //                   className={`${
// //                     selectedCategories.includes(category) ? 'text-white' : 'text-gray-700'
// //                   } font-medium`}
// //                 >
// //                   {category}
// //                 </Text>
// //               </TouchableOpacity>
// //             ))}
// //           </View> */}

// //           <TouchableOpacity className="bg-gray-100 p-4 rounded-lg mb-4 items-center border-2 border-dashed border-gray-300">
// //             <Text className="text-4xl mb-2">📷</Text>
// //             <Text className="text-gray-600">Upload Profile Photo</Text>
// //             <Text className="text-gray-400 text-xs">(Mock UI)</Text>
// //           </TouchableOpacity>

// //           <TouchableOpacity className="bg-gray-100 p-4 rounded-lg mb-6 items-center border-2 border-dashed border-gray-300">
// //             <Text className="text-4xl mb-2">🆔</Text>
// //             <Text className="text-gray-600">Upload ID Verification</Text>
// //             <Text className="text-gray-400 text-xs">(Mock UI)</Text>
// //           </TouchableOpacity>

// //           <View className="mb-8">
// //             <AppButton
// //               title="Complete Setup"
// //               onPress={handleComplete}
// //               isLoading={isLoading}
// //               disabled={!isFormValid}
// //             />
// //           </View>
// //         </ScrollView>
// //       </KeyboardAvoidingView>
// //     </SafeAreaView>
// //   );
// // }
