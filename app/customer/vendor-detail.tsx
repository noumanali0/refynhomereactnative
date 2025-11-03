import React from 'react';
import { View, Text, SafeAreaView, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppSelector } from '../../src/hooks/useAppDispatch';
import { Header } from '../../src/components/common/Header';
import { RatingStars } from '../../src/components/common/RatingStars';
import { AppButton } from '../../src/components/common/AppButton';

export default function VendorDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { vendors } = useAppSelector((state) => state.vendor);
  const { reviews } = useAppSelector((state) => state.review);

  const vendor = vendors.find((v) => v.id === id);
  const vendorReviews = reviews.filter((r) => r.vendorId === id);

  if (!vendor) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Header title="Vendor Details" showBack />
        <View className="flex-1 items-center justify-center">
          <Text>Vendor not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Header title="Vendor Details" showBack />
      <ScrollView>
        <View className="bg-white p-6 items-center border-b border-gray-200">
          <Image
            source={{ uri: vendor.profilePhoto || 'https://i.pravatar.cc/150?img=1' }}
            className="w-32 h-32 rounded-full mb-4"
          />
          <View className="flex-row items-center mb-2">
            <Text className="text-2xl font-bold text-gray-900 mr-2">{vendor.name}</Text>
            {vendor.verified && <Text className="text-xl">✅</Text>}
          </View>
          <View className="flex-row items-center mb-2">
            <RatingStars rating={vendor.rating} size="medium" />
            <Text className="text-gray-600 ml-2">({vendor.totalReviews} reviews)</Text>
          </View>
          <Text className="text-gray-600 mb-2">📍 {vendor.city}</Text>
          {vendor.isOnline && (
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-success rounded-full mr-1" />
              <Text className="text-success font-medium">Online Now</Text>
            </View>
          )}
        </View>

        <View className="bg-white p-6 mt-2">
          <Text className="text-lg font-bold text-gray-900 mb-3">Services</Text>
          <View className="flex-row flex-wrap">
            {vendor.serviceCategories.map((category, index) => (
              <View key={index} className="bg-primary-50 px-4 py-2 rounded-full mr-2 mb-2">
                <Text className="text-primary font-medium">{category}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="bg-white p-6 mt-2">
          <Text className="text-lg font-bold text-gray-900 mb-4">Reviews ({vendorReviews.length})</Text>
          {vendorReviews.length > 0 ? (
            vendorReviews.slice(0, 5).map((review) => (
              <View key={review.id} className="mb-4 pb-4 border-b border-gray-100">
                <View className="flex-row items-center mb-2">
                  <Text className="font-semibold text-gray-900 flex-1">{review.customerName}</Text>
                  <RatingStars rating={review.rating} size="small" />
                </View>
                <Text className="text-gray-600">{review.comment}</Text>
              </View>
            ))
          ) : (
            <Text className="text-gray-500">No reviews yet</Text>
          )}
        </View>

        <View className="p-6">
          <AppButton
            title="Book Now"
            onPress={() => router.push(`/booking/booking-details?vendorId=${vendor.id}` as any)}
          />
          <AppButton
            title="Chat with Vendor"
            variant="outline"
            className="mt-3"
            onPress={() => router.push('/chat' as any)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
