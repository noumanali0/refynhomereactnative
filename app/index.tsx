import React, { useEffect } from 'react';
import { View, Text } from 'react-native';

export default function Index() {

  // useEffect(() => {
  //   setTimeout(() => {
  //     if (!isAuthenticated) {
  //       router.replace("/(auth)/otp-login");
  //       // router.replace('/auth/otp-login');
  //     } else if (user?.role === 'customer') {
  //       router.replace('/customer');
  //     } else if (user?.role === 'vendor') {
  //       router.replace('/vendor');
  //     }
  //   }, 1000);
  // }, [isAuthenticated, user]);


  // useEffect(() => {
  //   setTimeout(() => {
  //     if (!isAuthenticated) {
  //       router.replace('/auth/otp-login' as any);
  //     } else if (user?.role === 'customer') {
  //       router.replace('/customer/home' as any);
  //     } else if (user?.role === 'vendor') {
  //       router.replace('/vendor/dashboard' as any);
  //     }
  //   }, 1000);
  // }, [isAuthenticated, user]);

  return (
    <View className="flex-1 bg-primary items-center justify-center">
      <Text className="text-4xl font-bold text-white mb-2">RefynHome</Text>
      <Text className="text-white text-lg">Connecting you with verified technicians</Text>
    </View>
  );
}
