import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Vendor } from '../../types';
import { RatingStars } from './RatingStars';
import { useRouter } from 'expo-router';

interface VendorCardProps {
  vendor: Vendor;
  onPress?: () => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({ vendor, onPress }) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/customer/vendor-detail?id=${vendor.id}` as any);
    }
  };

  return (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View className="flex-row">
        <Image
          source={{ uri: vendor.profilePhoto || 'https://i.pravatar.cc/150?img=1' }}
          className="w-20 h-20 rounded-full mr-4"
        />
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-lg font-bold text-gray-900 mr-2">{vendor.name}</Text>
            {vendor.verified && <Text className="text-sm">✅</Text>}
          </View>
          <View className="flex-row items-center mb-2">
            <RatingStars rating={vendor.rating} size="small" />
            <Text className="text-sm text-gray-600 ml-2">
              ({vendor.totalReviews} reviews)
            </Text>
          </View>
          <Text className="text-sm text-gray-600 mb-2">📍 {vendor.city}</Text>
          <View className="flex-row flex-wrap">
            {vendor.serviceCategories.slice(0, 2).map((category, index) => (
              <View key={index} className="bg-primary-50 px-2 py-1 rounded mr-2 mb-1">
                <Text className="text-xs text-primary font-medium">{category}</Text>
              </View>
            ))}
            {vendor.serviceCategories.length > 2 && (
              <View className="bg-gray-100 px-2 py-1 rounded">
                <Text className="text-xs text-gray-600">
                  +{vendor.serviceCategories.length - 2}
                </Text>
              </View>
            )}
          </View>
          {vendor.isOnline && (
            <View className="flex-row items-center mt-2">
              <View className="w-2 h-2 bg-success rounded-full mr-1" />
              <Text className="text-xs text-success font-medium">Online</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};
