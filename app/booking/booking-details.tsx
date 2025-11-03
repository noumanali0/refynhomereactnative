import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../../src/hooks/useAppDispatch';
import { addBooking } from '../../src/store/slices/bookingSlice';
import { Header } from '../../src/components/common/Header';
import { AppButton } from '../../src/components/common/AppButton';
import { InputField } from '../../src/components/common/InputField';
import { Booking, Customer } from '../../src/types';

export default function BookingDetails() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { vendorId } = useLocalSearchParams();
  const { vendors } = useAppSelector((state) => state.vendor);
  const { user } = useAppSelector((state) => state.auth);
  
  const vendor = vendors.find((v) => v.id === vendorId);
  const customer = user as Customer;

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirmBooking = () => {
    setIsLoading(true);
    setTimeout(() => {
      const newBooking: Booking = {
        id: `b${Date.now()}`,
        customerId: customer.id,
        vendorId: vendorId as string,
        serviceCategory: vendor?.serviceCategories[0] || 'Other',
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        status: 'pending',
        address: customer.address,
        notes,
        createdAt: new Date().toISOString(),
      };
      dispatch(addBooking(newBooking));
      setIsLoading(false);
      router.push('/booking/booking-success' as any);
    }, 1000);
  };

  const isFormValid = selectedDate.length > 0 && selectedTime.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Booking Details" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-6">
          <View className="bg-gray-50 p-4 rounded-lg mb-6">
            <Text className="text-gray-600 text-sm">Booking with</Text>
            <Text className="text-xl font-bold text-gray-900">{vendor?.name}</Text>
            <Text className="text-gray-600">{vendor?.serviceCategories.join(', ')}</Text>
          </View>

          <InputField
            label="Select Date"
            placeholder="YYYY-MM-DD (e.g., 2025-11-10)"
            value={selectedDate}
            onChangeText={setSelectedDate}
          />

          <InputField
            label="Select Time"
            placeholder="e.g., 10:00 AM"
            value={selectedTime}
            onChangeText={setSelectedTime}
          />

          <InputField
            label="Service Address"
            value={customer.address}
            editable={false}
          />

          <InputField
            label="Additional Notes (Optional)"
            placeholder="Describe the issue..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />

          <View className="mt-6 mb-8">
            <AppButton
              title="Confirm Booking"
              onPress={handleConfirmBooking}
              isLoading={isLoading}
              disabled={!isFormValid}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
