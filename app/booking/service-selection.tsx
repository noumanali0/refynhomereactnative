import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../../src/components/common/Header';
import { SERVICE_CATEGORIES, CATEGORY_ICONS } from '../../src/constants/serviceCategories';

export default function ServiceSelection() {
  const router = useRouter();

  const handleServiceSelect = (service: string) => {
    router.push(`/booking/vendor-list?category=${service}` as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Select Service" showBack />
      <View className="px-4 pt-6 flex-1">
        <Text className="text-2xl font-bold text-gray-900 mb-2">What do you need help with?</Text>
        <Text className="text-gray-600 mb-6">Choose a service category</Text>
        
        <FlatList
          data={SERVICE_CATEGORIES}
          keyExtractor={(item) => item}
          numColumns={2}
          columnWrapperClassName="justify-between mb-4"
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-white border-2 border-gray-200 rounded-2xl p-6 items-center justify-center w-[48%]"
              onPress={() => handleServiceSelect(item)}
              activeOpacity={0.7}
            >
              <Text className="text-4xl mb-3">{CATEGORY_ICONS[item]}</Text>
              <Text className="text-center font-semibold text-gray-900">{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
