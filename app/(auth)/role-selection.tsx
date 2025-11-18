import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function RoleSelection() {
  const router = useRouter();

  const handleRoleSelect = (role: 'customer' | 'vendor') => {
    if (role === 'customer') {
      router.push('/(auth)/customer-setup' as any);
    } else {
      router.push('/(auth)/vendor-setup' as any);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 justify-center">
        <Text className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Choose Your Role
        </Text>
        <Text className="text-gray-600 text-center mb-12">
          How do you want to use RefynHome?
        </Text>

        <TouchableOpacity
          className="bg-primary rounded-2xl p-8 mb-6 items-center shadow-lg"
          onPress={() => handleRoleSelect('customer')}
          activeOpacity={0.8}
        >
          <Text className="text-6xl mb-4">👤</Text>
          <Text className="text-white text-2xl font-bold mb-2">Customer</Text>
          <Text className="text-white text-center opacity-90">
            Find and book verified technicians for home repairs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-accent rounded-2xl p-8 items-center shadow-lg"
          onPress={() => handleRoleSelect('vendor')}
          activeOpacity={0.8}
        >
          <Text className="text-6xl mb-4">🔧</Text>
          <Text className="text-white text-2xl font-bold mb-2">Vendor</Text>
          <Text className="text-white text-center opacity-90">
            Offer your services and grow your business
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
