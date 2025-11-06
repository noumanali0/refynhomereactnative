import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../../src/hooks/useAppDispatch';
import { setFilters } from '../../src/store/slices/vendorSlice';
import { logout } from '../../src/store/slices/authSlice';
import { SearchBar } from '../../src/components/common/SearchBar';
import { VendorCard } from '../../src/components/common/VendorCard';
import { SERVICE_CATEGORIES } from '../../src/constants/serviceCategories';
import { ServiceCategory } from '../../src/types';
import CategoryChips from '../../src/components/customer/CategoryChips';

export default function CustomerHome() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { filteredVendors } = useAppSelector((state) => state.vendor);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | undefined>();

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    dispatch(setFilters({ searchQuery: text, category: selectedCategory }));
  };

  const handleCategorySelect = (category: ServiceCategory) => {
    const newCategory = category === selectedCategory ? undefined : category;
    setSelectedCategory(newCategory);
    dispatch(setFilters({ category: newCategory, searchQuery }));
  };

  const handleLogout = () => {
    dispatch(logout());
    router.replace('/auth/otp-login' as any);
  };



  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-primary px-4 pt-4 pb-6">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-white text-2xl font-bold">Hello, {user?.name}!</Text>
            <Text className="text-white opacity-80">Find your perfect technician</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Text className="text-white text-sm">Logout</Text>
          </TouchableOpacity>
        </View>
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search for services..."
        />
      </View>
      <CategoryChips
        categories={SERVICE_CATEGORIES}
        selectedCategory={selectedCategory}
        onSelect={handleCategorySelect}
      />
      {/* <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 py-2 bg-white border-b border-gray-200"
        contentContainerStyle={{ alignItems: 'center' }} // keep chips vertically centered
      >
        {SERVICE_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            className={`px-4 py-1.5 rounded-full mr-2 ${selectedCategory === category ? 'bg-primary' : 'bg-gray-100'
              }`}
            onPress={() => handleCategorySelect(category)}
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-medium ${selectedCategory === category ? 'text-white' : 'text-gray-700'
                }`}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView> */}

      {/* <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2 bg-white border-b border-gray-200">
        {SERVICE_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            className={`px-4 py-2 rounded-full mr-2 ${selectedCategory === category ? 'bg-primary' : 'bg-gray-100'
              }`}
            onPress={() => handleCategorySelect(category)}
          >
            <Text
              className={`font-medium ${selectedCategory === category ? 'text-white' : 'text-gray-700'
                }`}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView> */}

      <View className="flex-row px-4 py-3 bg-white mb-2">
        <TouchableOpacity
          className="flex-1 mr-2 bg-gray-50 py-3 rounded-lg items-center"
          onPress={() => router.push('/customer/my-bookings' as any)}
        >
          <Text className="text-2xl mb-1">📋</Text>
          <Text className="text-gray-700 font-medium text-xs">My Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 mr-2 bg-gray-50 py-3 rounded-lg items-center"
          onPress={() => router.push('/customer/favorites' as any)}
        >
          <Text className="text-2xl mb-1">❤️</Text>
          <Text className="text-gray-700 font-medium text-xs">Favorites</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-gray-50 py-3 rounded-lg items-center"
          onPress={() => router.push('/booking/service-selection' as any)}
        >
          <Text className="text-2xl mb-1">➕</Text>
          <Text className="text-gray-700 font-medium text-xs">New Booking</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 pt-3 flex-1">
        <Text className="text-lg font-bold text-gray-900 mb-3">
          {selectedCategory ? `${selectedCategory} Technicians` : 'All Technicians'} ({filteredVendors.length})
        </Text>
        <FlatList
          data={filteredVendors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <VendorCard vendor={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-4"
        />
      </View>
    </View>
  );
}
