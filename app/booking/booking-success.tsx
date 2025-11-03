import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppButton } from '../../src/components/common/AppButton';

export default function BookingSuccess() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-6xl mb-6">✅</Text>
        <Text className="text-3xl font-bold text-gray-900 mb-3 text-center">
          Booking Confirmed!
        </Text>
        <Text className="text-gray-600 text-center mb-8">
          Your booking has been successfully placed. The vendor will contact you soon.
        </Text>

        <AppButton
          title="View My Bookings"
          onPress={() => router.push('/customer/my-bookings' as any)}
          className="mb-3 w-full"
        />
        <AppButton
          title="Chat with Vendor"
          variant="outline"
          onPress={() => router.push('/chat/index' as any)}
          className="w-full"
        />
        <AppButton
          title="Back to Home"
          variant="outline"
          onPress={() => router.push('/customer/home' as any)}
          className="mt-3 w-full"
        />
      </View>
    </SafeAreaView>
  );
}
