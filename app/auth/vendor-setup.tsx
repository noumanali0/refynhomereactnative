import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '../../src/hooks/useAppDispatch';
import { loginSuccess } from '../../src/store/slices/authSlice';
import { AppButton } from '../../src/components/common/AppButton';
import { InputField } from '../../src/components/common/InputField';
import { Header } from '../../src/components/common/Header';
import { Vendor, ServiceCategory } from '../../src/types';
import { SERVICE_CATEGORIES } from '../../src/constants/serviceCategories';

export default function VendorSetup() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');
  const [cnic, setCnic] = useState('');
  const [city, setCity] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleCategory = (category: ServiceCategory) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleComplete = () => {
    setIsLoading(true);
    setTimeout(() => {
      const vendor: Vendor = {
        id: `v${Date.now()}`,
        phoneNumber: '+923001234567',
        role: 'vendor',
        name,
        cnic,
        city,
        serviceCategories: selectedCategories,
        rating: 0,
        totalReviews: 0,
        verified: false,
        isOnline: true,
      };
      dispatch(loginSuccess(vendor));
      setIsLoading(false);
      router.replace('/vendor/dashboard' as any);
    }, 1000);
  };

  const isFormValid =
    name.length > 0 && cnic.length > 0 && city.length > 0 && selectedCategories.length > 0;

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
            label="CNIC"
            placeholder="42101-1234567-1"
            value={cnic}
            onChangeText={setCnic}
            keyboardType="number-pad"
          />
          <InputField
            label="City"
            placeholder="e.g., Karachi, Lahore"
            value={city}
            onChangeText={setCity}
          />

          <Text className="text-gray-700 font-medium mb-3">Service Categories</Text>
          <View className="flex-row flex-wrap mb-6">
            {SERVICE_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                className={`px-4 py-2 rounded-full mr-2 mb-2 ${
                  selectedCategories.includes(category)
                    ? 'bg-primary'
                    : 'bg-gray-200'
                }`}
                onPress={() => toggleCategory(category)}
              >
                <Text
                  className={`${
                    selectedCategories.includes(category) ? 'text-white' : 'text-gray-700'
                  } font-medium`}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity className="bg-gray-100 p-4 rounded-lg mb-4 items-center border-2 border-dashed border-gray-300">
            <Text className="text-4xl mb-2">📷</Text>
            <Text className="text-gray-600">Upload Profile Photo</Text>
            <Text className="text-gray-400 text-xs">(Mock UI)</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-gray-100 p-4 rounded-lg mb-6 items-center border-2 border-dashed border-gray-300">
            <Text className="text-4xl mb-2">🆔</Text>
            <Text className="text-gray-600">Upload ID Verification</Text>
            <Text className="text-gray-400 text-xs">(Mock UI)</Text>
          </TouchableOpacity>

          <View className="mb-8">
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
