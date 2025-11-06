import React from 'react';
import { View, Text, SafeAreaView, FlatList } from 'react-native';
import { useAppSelector } from '../../src/hooks/useAppDispatch';
import { Header } from '../../src/components/common/Header';
import { BookingCard } from '../../src/components/common/BookingCard';

export default function MyBookings() {
  const { bookings } = useAppSelector((state) => state.booking);
  const { vendors } = useAppSelector((state) => state.vendor);
  const { user } = useAppSelector((state) => state.auth);

  const myBookings = bookings;
  // const myBookings = bookings.filter((b) => b.customerId === user?.id);

  const getVendorName = (vendorId: string) => {
    return vendors.find((v) => v.id === vendorId)?.name || 'Unknown Vendor';
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Header title="My Bookings" showBack />
      <View className="px-4 pt-4 flex-1">
        {myBookings.length > 0 ? (
          <FlatList
            data={myBookings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <BookingCard
                booking={item}
                vendorName={getVendorName(item.vendorId)}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-4xl mb-4">📋</Text>
            <Text className="text-gray-600 text-lg">No bookings yet</Text>
            <Text className="text-gray-400 mt-2">Your bookings will appear here</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
