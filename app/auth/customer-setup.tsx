import React, { useState } from 'react';
import { View, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '../../src/hooks/useAppDispatch';
import { loginSuccess } from '../../src/store/slices/authSlice';
import { AppButton } from '../../src/components/common/AppButton';
import { InputField } from '../../src/components/common/InputField';
import { Header } from '../../src/components/common/Header';
import { Customer } from '../../src/types';

export default function CustomerSetup() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = () => {
    setIsLoading(true);
    setTimeout(() => {
      const customer: Customer = {
        id: `c${Date.now()}`,
        phoneNumber: '+923001234567',
        role: 'customer',
        name,
        city,
        address,
        favoriteVendors: [],
      };
      dispatch(loginSuccess(customer));
      setIsLoading(false);
      router.replace('/customer/home' as any);
    }, 1000);
  };

  const isFormValid = name.length > 0 && city.length > 0 && address.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Complete Your Profile" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-6">
          <InputField
            label="Full Name"
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
          />
          <InputField
            label="City"
            placeholder="e.g., Karachi, Lahore"
            value={city}
            onChangeText={setCity}
          />
          <InputField
            label="Address"
            placeholder="Enter your full address"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
          />

          <View className="mt-6 mb-8">
            <AppButton
              title="Complete Setup"
              onPress={handleComplete}
              isLoading={isLoading}
              disabled={!isFormValid}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
