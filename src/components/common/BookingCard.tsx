import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Booking } from '../../types';

interface BookingCardProps {
  booking: Booking;
  vendorName?: string;
  onPress?: () => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({ booking, vendorName, onPress }) => {
  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-warning text-warning';
      case 'confirmed':
        return 'bg-info text-info';
      case 'completed':
        return 'bg-success text-success';
      case 'cancelled':
        return 'bg-error text-error';
      default:
        return 'bg-gray-500 text-gray-500';
    }
  };

  const statusColors = getStatusColor(booking.status);
  const bgColor = statusColors.split(' ')[0].replace('text-', 'bg-') + '-50';

  return (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900 mb-1">{booking.serviceCategory}</Text>
          {vendorName && (
            <Text className="text-sm text-gray-600">Vendor: {vendorName}</Text>
          )}
        </View>
        <View className={`${bgColor} px-3 py-1 rounded-full`}>
          <Text className={`text-xs font-semibold ${statusColors.split(' ')[1]} capitalize`}>
            {booking.status}
          </Text>
        </View>
      </View>
      
      <View className="space-y-2">
        <View className="flex-row items-center">
          <Text className="text-sm text-gray-600 mr-2">📅</Text>
          <Text className="text-sm text-gray-700">{booking.scheduledDate}</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-sm text-gray-600 mr-2">🕐</Text>
          <Text className="text-sm text-gray-700">{booking.scheduledTime}</Text>
        </View>
        <View className="flex-row items-start">
          <Text className="text-sm text-gray-600 mr-2">📍</Text>
          <Text className="text-sm text-gray-700 flex-1">{booking.address}</Text>
        </View>
        {booking.notes && (
          <View className="flex-row items-start mt-1">
            <Text className="text-sm text-gray-600 mr-2">💬</Text>
            <Text className="text-sm text-gray-600 italic flex-1">{booking.notes}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
