import React, { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Text from '@/components/common/Text';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InputField } from '@/components/common/InputField';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { updateProfile } from '@/store/slices/authSlice';
import { moderateScale } from 'react-native-size-matters';

export default function CustomerProfileSetup() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
  });
  const [errors, setErrors] = useState({
    name: '',
    address: '',
    city: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const validateForm = () => {
    const newErrors = {
      name: '',
      address: '',
      city: '',
    };
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
      isValid = false;
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
      isValid = false;
    } else if (formData.address.trim().length < 10) {
      newErrors.address = 'Please enter a complete address';
      isValid = false;
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
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
          address: formData.address,
          city: formData.city,
        })
      );

      setIsLoading(false);
      // Navigate to customer home
      router.replace('/(customer)/(home)');
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
              <Ionicons name="person" size={36} color="#fff" />
            </LinearGradient>
          </View>
          <Text type="title" style={styles.appName}>Complete Your Profile</Text>
          <Text type="body2" style={styles.tagline}>Let's set up your customer profile</Text>
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
                <Ionicons name="information-circle" size={24} color="#2563EB" />
                <Text type="body" style={styles.infoBannerText}>
                  This information helps vendors provide better service
                </Text>
              </LinearGradient>
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
                  onChangeText={(text) => {
                    setFormData({ ...formData, name: text });
                    setErrors({ ...errors, name: '' });
                  }}
                  style={styles.input}
                />
              </View>
              {errors.name ? (
                <Text type="body" style={styles.errorText}>{errors.name}</Text>
              ) : null}
            </View>

            {/* Address Input */}
            <View style={styles.inputContainer}>
              <Text type="subtitle2" style={styles.inputLabel}>
                Complete Address <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  styles.textAreaWrapper,
                  errors.address && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color="#F97316"
                  style={[styles.inputIcon, styles.textAreaIcon]}
                />
                <InputField
                  placeholder="House/Flat No., Street, Area"
                  value={formData.address}
                  onChangeText={(text) => {
                    setFormData({ ...formData, address: text });
                    setErrors({ ...errors, address: '' });
                  }}
                  style={styles.textArea}
                  multiline
                  numberOfLines={3}
                />
              </View>
              {errors.address ? (
                <Text type="body" style={styles.errorText}>{errors.address}</Text>
              ) : null}
            </View>

            {/* City Input */}
            <View style={styles.inputContainer}>
              <Text type="subtitle2" style={styles.inputLabel}>
                City <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.city && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={20}
                  color="#2563EB"
                  style={styles.inputIcon}
                />
                <InputField
                  placeholder="Enter your city"
                  value={formData.city}
                  onChangeText={(text) => {
                    setFormData({ ...formData, city: text });
                    setErrors({ ...errors, city: '' });
                  }}
                  style={styles.input}
                />
              </View>
              {errors.city ? (
                <Text type="body" style={styles.errorText}>{errors.city}</Text>
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
                  {isLoading ? 'Setting Up...' : 'Complete Setup'}
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
    marginBottom: moderateScale(15)
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
  textAreaIcon: {
    marginTop: 4,
  },
  input: {
    flex: 1,
    height: moderateScale(50),
    fontSize: moderateScale(15),
    color: '#1e293b',
  },
  textArea: {
    flex: 1,
    minHeight: moderateScale(80),
    fontSize: moderateScale(15),
    color: '#1e293b',
    textAlignVertical: 'top',
    paddingTop: moderateScale(4),
  },
  errorText: {
    color: '#ef4444',
    marginTop: 6,
    marginLeft: 4,
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
});

// import React, { useState } from 'react';
// import { View, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
// import { useRouter } from 'expo-router';
// import { useAppDispatch } from '../../src/hooks/useAppDispatch';
// import { loginSuccess } from '../../src/store/slices/authSlice';
// import { AppButton } from '../../src/components/common/AppButton';
// import { InputField } from '../../src/components/common/InputField';
// import { Header } from '../../src/components/common/Header';
// import { Customer } from '../../src/types';

// export default function CustomerSetup() {
//   const router = useRouter();
//   const dispatch = useAppDispatch();
//   const [name, setName] = useState('');
//   const [city, setCity] = useState('');
//   const [address, setAddress] = useState('');
//   const [isLoading, setIsLoading] = useState(false);

//   const handleComplete = () => {
//     setIsLoading(true);
//     setTimeout(() => {
//       const customer: Customer = {
//         id: `c${Date.now()}`,
//         phoneNumber: '+923001234567',
//         role: 'customer',
//         name,
//         city,
//         address,
//         favoriteVendors: [],
//       };
//       dispatch(loginSuccess(customer));
//       setIsLoading(false);
//       router.replace('/(customer)' as any);
//     }, 1000);
//   };

//   const isFormValid = name.length > 0 && city.length > 0 && address.length > 0;

//   return (
//     <SafeAreaView className="flex-1 bg-white">
//       <Header title="Complete Your Profile" />
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         className="flex-1"
//       >
//         <ScrollView className="flex-1 px-6 pt-6">
//           <InputField
//             label="Full Name"
//             placeholder="Enter your name"
//             value={name}
//             onChangeText={setName}
//           />
//           <InputField
//             label="City"
//             placeholder="e.g., Karachi, Lahore"
//             value={city}
//             onChangeText={setCity}
//           />
//           <InputField
//             label="Address"
//             placeholder="Enter your full address"
//             value={address}
//             onChangeText={setAddress}
//             multiline
//             numberOfLines={3}
//           />

//           <View className="mt-6 mb-8">
//             <AppButton
//               title="Complete Setup"
//               onPress={handleComplete}
//               isLoading={isLoading}
//               disabled={!isFormValid}
//             />
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }
