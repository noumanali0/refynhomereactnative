import React from 'react';
import { View, Text, SafeAreaView, FlatList } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppSelector } from '../../src/hooks/useAppDispatch';
import { Header } from '../../src/components/common/Header';
import { VendorCard } from '../../src/components/common/VendorCard';
import { ServiceCategory } from '../../src/types';

export default function VendorList() {
  const { category } = useLocalSearchParams();
  const { vendors } = useAppSelector((state) => state.vendor);
  
  const filteredVendors = vendors.filter((v) => 
    v.serviceCategories.includes(category as ServiceCategory)
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Header title={`${category} Technicians`} showBack />
      <View className="px-4 pt-4 flex-1">
        <Text className="text-gray-600 mb-4">
          {filteredVendors.length} technicians available
        </Text>
        <FlatList
          data={filteredVendors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <VendorCard vendor={item} />}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}
