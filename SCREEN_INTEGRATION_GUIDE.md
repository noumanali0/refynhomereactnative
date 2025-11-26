# Screen Integration Guide

## 🎯 Overview

This guide shows exactly how to update your auth screens to connect with the Django backend. Each section includes before/after code examples.

---

## 📱 Screen Updates Required

### 1. App Layout - Initialize API Interceptors

**File:** `app/_layout.tsx`

**Add at the top of the component:**

```typescript
import { useEffect } from 'react';
import { initializeApiClient } from '@/api/client';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { logoutUser, restoreSession } from '@store/slices/authSlice';

export default function RootLayout() {
  const dispatch = useAppDispatch();

  // Initialize API interceptors on app start
  useEffect(() => {
    // Setup token refresh and logout interceptors
    initializeApiClient(() => {
      // This callback is called when refresh token is invalid
      dispatch(logoutUser());
    });

    // Restore session from SecureStore
    dispatch(restoreSession());
  }, []);

  // ... rest of your layout code
}
```

---

### 2. Signup Screen - Customer

**File:** `app/(auth)/signup.tsx` or `app/(auth)/customer-setup.tsx`

**Current Code (approximate):**
```typescript
const handleSignup = async () => {
  dispatch(sendSignupOTP({ name, phoneNumber, role: 'customer' }));
  // navigate to OTP screen
};
```

**Updated Code:**
```typescript
import { signupUser } from '@store/slices/authSlice';
import { normalizePhoneNumber } from '@utils/validation';
import type { SignupRequestCustomer } from '@/types/api';

const handleSignup = async () => {
  try {
    // Normalize phone number for API
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Prepare signup payload
    const payload: SignupRequestCustomer = {
      phone: normalizedPhone,
      password: password,
      role: 'customer',
      first_name: firstName,
      last_name: lastName,
      address: address,
      city: city,
    };

    // Dispatch signup action
    const result = await dispatch(signupUser(payload)).unwrap();

    // Navigate to OTP verification screen
    router.push({
      pathname: '/(auth)/otp-login',
      params: { phoneNumber: normalizedPhone, type: 'signup' }
    });
  } catch (error: any) {
    // Error is already in Redux state
    Alert.alert('Signup Failed', error);
  }
};
```

**Form Validation (using Yup):**
```typescript
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { customerSignupSchema } from '@utils/validation';

const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(customerSignupSchema),
  defaultValues: {
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
  },
});

const onSubmit = handleSubmit(async (data) => {
  const payload: SignupRequestCustomer = {
    phone: normalizePhoneNumber(data.phone),
    password: data.password,
    role: 'customer',
    first_name: data.firstName,
    last_name: data.lastName,
    address: data.address,
    city: data.city,
  };

  await dispatch(signupUser(payload)).unwrap();
  router.push('/(auth)/otp-login');
});
```

---

### 3. Signup Screen - Vendor

**File:** `app/(auth)/signup.tsx` (vendor path)

**Updated Code:**
```typescript
import { signupUser } from '@store/slices/authSlice';
import type { SignupRequestVendor } from '@/types/api';

const handleVendorSignup = async () => {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const payload: SignupRequestVendor = {
      phone: normalizedPhone,
      password: password,
      role: 'vendor',
      first_name: firstName,
      last_name: lastName,
      // address and city are optional for vendors
    };

    await dispatch(signupUser(payload)).unwrap();

    // Navigate to OTP verification
    router.push({
      pathname: '/(auth)/otp-login',
      params: { phoneNumber: normalizedPhone, type: 'signup' }
    });
  } catch (error: any) {
    Alert.alert('Signup Failed', error);
  }
};
```

---

### 4. OTP Verification Screen

**File:** `app/(auth)/otp-login.tsx`

**Current Code (approximate):**
```typescript
const handleVerifyOTP = async () => {
  dispatch(verifyOTP({ phoneNumber, otp, type: 'login' }));
};
```

**Updated Code:**
```typescript
import { verifyOTP } from '@store/slices/authSlice';
import { useAuth } from '@hooks/useAuth';

export default function OTPVerificationScreen() {
  const dispatch = useAppDispatch();
  const { phoneNumber } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const [otp, setOtp] = useState('');

  const handleVerifyOTP = async () => {
    try {
      const result = await dispatch(
        verifyOTP({ phoneNumber: phoneNumber!, otp })
      ).unwrap();

      // Check onboarding status
      if (result.status === 'onboarding_required') {
        // Vendor needs to complete onboarding
        router.replace('/(auth)/vendor-onboarding');
      } else if (result.status === 'onboarding_complete') {
        // Customer or verified vendor - go to app
        if (result.user.role === 'customer') {
          router.replace('/(customer)/(home)');
        } else if (result.user.role === 'vendor') {
          router.replace('/(vendor)/(servicerequests)');
        }
      }
    } catch (error: any) {
      Alert.alert('Verification Failed', error);
    }
  };

  return (
    <View>
      <Text>Enter OTP sent to {phoneNumber}</Text>
      <TextInput
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
      />
      <Button title="Verify" onPress={handleVerifyOTP} />
    </View>
  );
}
```

---

### 5. Login Screen

**File:** `app/(auth)/login.tsx`

**IMPORTANT:** Backend uses **phone + password** login, NOT OTP!

**Current Code (OTP-based):**
```typescript
const handleLogin = async () => {
  dispatch(sendLoginOTP(phoneNumber));
  router.push('/otp-login');
};
```

**Updated Code (Password-based):**
```typescript
import { loginUser } from '@store/slices/authSlice';
import { normalizePhoneNumber } from '@utils/validation';
import { loginSchema } from '@utils/validation';

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const router = useRouter();

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      const result = await dispatch(
        loginUser({
          phone: normalizePhoneNumber(data.phone),
          password: data.password,
        })
      ).unwrap();

      // Navigate based on user role
      if (result.user.role === 'customer') {
        router.replace('/(customer)/(home)');
      } else if (result.user.role === 'vendor') {
        // Check if vendor is verified
        if (result.user.vendorProfile?.verified) {
          router.replace('/(vendor)/(servicerequests)');
        } else {
          Alert.alert(
            'Pending Verification',
            'Your vendor account is pending admin approval. Please wait for verification.'
          );
        }
      }
    } catch (error: any) {
      // Check for specific vendor errors
      if (error.includes('not verified')) {
        Alert.alert(
          'Account Not Verified',
          'Your vendor account is pending admin approval.'
        );
      } else if (error.includes('onboarding incomplete')) {
        Alert.alert(
          'Complete Onboarding',
          'Please complete your vendor profile first.'
        );
        router.push('/(auth)/vendor-onboarding');
      } else {
        Alert.alert('Login Failed', error);
      }
    }
  });

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Login
      </Text>

      {/* Phone Input */}
      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="+92 300 1234567"
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        )}
      />
      {errors.phone && <Text style={{ color: 'red' }}>{errors.phone.message}</Text>}

      {/* Password Input */}
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="Password"
            secureTextEntry
            autoComplete="password"
          />
        )}
      />
      {errors.password && <Text style={{ color: 'red' }}>{errors.password.message}</Text>}

      {/* Error Message */}
      {error && <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text>}

      {/* Login Button */}
      <Button
        title={isLoading ? 'Logging in...' : 'Login'}
        onPress={onSubmit}
        disabled={isLoading}
      />

      {/* Signup Link */}
      <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
        <Text style={{ marginTop: 20, textAlign: 'center' }}>
          Don't have an account? Sign up
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

### 6. Vendor Onboarding Screen

**File:** `app/(auth)/vendor-onboarding.tsx` (create if doesn't exist)

**Full Implementation:**

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ScrollView, Image } from 'react-native';
import { useAppDispatch, useAppSelector } from '@hooks/useAppDispatch';
import { vendorOnboarding } from '@store/slices/authSlice';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { vendorOnboardingSchema, formatCNIC } from '@utils/validation';
import type { VendorOnboardingRequest } from '@/types/api';

export default function VendorOnboardingScreen() {
  const dispatch = useAppDispatch();
  const { phoneNumber, isLoading } = useAppSelector((state) => state.auth);
  const router = useRouter();

  const [profilePhoto, setProfilePhoto] = useState<any>(null);
  const [idPhoto, setIdPhoto] = useState<any>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(vendorOnboardingSchema),
  });

  const pickImage = async (type: 'profile' | 'id') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      if (type === 'profile') {
        setProfilePhoto(result.assets[0]);
      } else {
        setIdPhoto(result.assets[0]);
      }
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Convert images to base64 or File objects
      const payload: VendorOnboardingRequest = {
        phone: phoneNumber!,
        cnic: data.cnic,
        bio: data.bio,
        address: data.address,
        city: data.city,
        service_categories: selectedCategories,
        // For base64 approach:
        profile_photo_base64: profilePhoto?.base64,
        id_verification_photo_base64: idPhoto?.base64,
      };

      const result = await dispatch(vendorOnboarding(payload)).unwrap();

      Alert.alert(
        'Onboarding Complete',
        'Your vendor profile has been submitted for admin verification. You will be notified once approved.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Onboarding Failed', error);
    }
  });

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Complete Vendor Profile
      </Text>

      {/* CNIC Input */}
      <Text>CNIC (12345-1234567-1)</Text>
      <Controller
        control={control}
        name="cnic"
        render={({ field: { onChange, value } }) => (
          <TextInput
            value={value}
            onChangeText={(text) => onChange(formatCNIC(text))}
            placeholder="12345-1234567-1"
            keyboardType="number-pad"
            maxLength={15}
          />
        )}
      />
      {errors.cnic && <Text style={{ color: 'red' }}>{errors.cnic.message}</Text>}

      {/* Bio Input */}
      <Text style={{ marginTop: 15 }}>Bio</Text>
      <Controller
        control={control}
        name="bio"
        render={({ field: { onChange, value } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="Tell customers about your experience..."
            multiline
            numberOfLines={4}
          />
        )}
      />
      {errors.bio && <Text style={{ color: 'red' }}>{errors.bio.message}</Text>}

      {/* Address */}
      <Text style={{ marginTop: 15 }}>Address</Text>
      <Controller
        control={control}
        name="address"
        render={({ field: { onChange, value } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="Your business address"
          />
        )}
      />

      {/* City */}
      <Text style={{ marginTop: 15 }}>City</Text>
      <Controller
        control={control}
        name="city"
        render={({ field: { onChange, value } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="Lahore"
          />
        )}
      />

      {/* Profile Photo */}
      <Text style={{ marginTop: 15 }}>Profile Photo</Text>
      <Button title="Pick Profile Photo" onPress={() => pickImage('profile')} />
      {profilePhoto && (
        <Image source={{ uri: profilePhoto.uri }} style={{ width: 100, height: 100, marginTop: 10 }} />
      )}

      {/* ID Verification Photo */}
      <Text style={{ marginTop: 15 }}>CNIC Photo (Front Side)</Text>
      <Button title="Pick CNIC Photo" onPress={() => pickImage('id')} />
      {idPhoto && (
        <Image source={{ uri: idPhoto.uri }} style={{ width: 150, height: 100, marginTop: 10 }} />
      )}

      {/* Service Categories (Multi-Select) */}
      <Text style={{ marginTop: 15 }}>Service Categories</Text>
      {/* TODO: Add multi-select component for categories */}
      {/* For now, you can hardcode category IDs: 1, 2, 3, etc. */}

      {/* Submit Button */}
      <Button
        title={isLoading ? 'Submitting...' : 'Submit for Verification'}
        onPress={onSubmit}
        disabled={isLoading}
      />
    </ScrollView>
  );
}
```

---

## 🔑 Key Points

### 1. Phone Number Normalization
Always normalize phone numbers before sending to API:
```typescript
import { normalizePhoneNumber } from '@utils/validation';

const normalizedPhone = normalizePhoneNumber(phoneNumber);
// Input: "0300 1234567" or "+92 300 1234567"
// Output: "+923001234567"
```

### 2. Error Handling
Use `getErrorMessage` from API client to parse Django errors:
```typescript
import { getErrorMessage } from '@/api/client';

try {
  await dispatch(loginUser({ phone, password })).unwrap();
} catch (error: any) {
  const message = getErrorMessage(error);
  Alert.alert('Error', message);
}
```

### 3. Backend Error Responses
Django returns errors in these formats:
```typescript
// Single error
{ detail: "Invalid credentials" }

// Field errors
{ phone: ["This field is required"], password: ["Password too short"] }

// Token errors
{
  detail: "Token is invalid or expired",
  code: "token_not_valid"
}
```

### 4. Navigation After Auth
```typescript
// Customer login
router.replace('/(customer)/(home)');

// Vendor login (verified)
router.replace('/(vendor)/(servicerequests)');

// Vendor needs onboarding
router.replace('/(auth)/vendor-onboarding');

// Vendor pending verification
// Show message, stay on login screen
```

---

## 🧪 Testing Checklist

### Customer Flow
- [ ] Signup with valid data
- [ ] Receive OTP (check backend logs)
- [ ] Verify OTP
- [ ] Navigate to customer home
- [ ] Logout and login with password
- [ ] Session restoration on app restart

### Vendor Flow
- [ ] Signup as vendor
- [ ] Verify OTP
- [ ] Redirect to vendor onboarding
- [ ] Complete vendor profile
- [ ] See "pending verification" message
- [ ] Admin verifies (backend: `POST /api/auth/admin/verify-vendor/{{vendor_id}}/`)
- [ ] Login successfully
- [ ] Navigate to vendor dashboard

### Error Testing
- [ ] Invalid phone format
- [ ] Wrong password
- [ ] Expired OTP
- [ ] Network error handling
- [ ] Vendor not verified (403 error)
- [ ] Backend validation errors

---

## 📝 Next Steps

1. Update all auth screens with code from this guide
2. Test each flow end-to-end
3. Handle edge cases (network errors, expired tokens)
4. Add loading states and error messages
5. Test on physical devices (not just simulator)

---

**Need Help?** Refer to [`AUTHENTICATION_IMPLEMENTATION.md`](AUTHENTICATION_IMPLEMENTATION.md) for architecture details.
