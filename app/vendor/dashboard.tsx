import React, { useState } from 'react';
import { View, Text, SafeAreaView, FlatList, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../../src/hooks/useAppDispatch';
import { logout, updateProfile } from '../../src/store/slices/authSlice';
import { updateVendorStatus } from '../../src/store/slices/vendorSlice';
import { BookingCard } from '../../src/components/common/BookingCard';
import { Vendor } from '../../src/types';

export default function VendorDashboard() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { bookings } = useAppSelector((state) => state.booking);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  const vendor = user as Vendor;
  const vendorBookings = bookings.filter((b) => b.vendorId === vendor?.id);
  const filteredBookings = vendorBookings.filter((b) =>
    activeTab === 'pending' ? b.status === 'pending' || b.status === 'confirmed' : b.status === 'completed'
  );

  const handleToggleOnline = (value: boolean) => {
    dispatch(updateVendorStatus({ vendorId: vendor.id, isOnline: value }));
    dispatch(updateProfile({ isOnline: value }));
  };

  const handleLogout = () => {
    dispatch(logout());
    router.replace('/auth/otp-login' as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-primary px-4 pt-4 pb-6">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">{vendor?.name}</Text>
            <Text className="text-white opacity-80">{vendor?.verified ? '✅ Verified' : '⏳ Pending Verification'}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Text className="text-white text-sm">Logout</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white bg-opacity-20 rounded-lg p-4">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white opacity-80 text-sm">Availability Status</Text>
              <Text className="text-white text-lg font-bold">{vendor?.isOnline ? 'Online' : 'Offline'}</Text>
            </View>
            <Switch
              value={vendor?.isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#767577', true: '#F97316' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      <View className="flex-row bg-white border-b border-gray-200">
        <TouchableOpacity
          className={`flex-1 py-4 items-center border-b-2 ${
            activeTab === 'pending' ? 'border-primary' : 'border-transparent'
          }`}
          onPress={() => setActiveTab('pending')}
        >
          <Text className={`font-semibold ${activeTab === 'pending' ? 'text-primary' : 'text-gray-500'}`}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-4 items-center border-b-2 ${
            activeTab === 'completed' ? 'border-primary' : 'border-transparent'
          }`}
          onPress={() => setActiveTab('completed')}
        >
          <Text className={`font-semibold ${activeTab === 'completed' ? 'text-primary' : 'text-gray-500'}`}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 pt-4 flex-1">
        {filteredBookings.length > 0 ? (
          <FlatList
            data={filteredBookings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <BookingCard booking={item} />}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-4xl mb-4">📋</Text>
            <Text className="text-gray-600 text-lg">No {activeTab} bookings</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
