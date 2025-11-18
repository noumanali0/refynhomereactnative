import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppButton } from '../../src/components/common/AppButton';
import { InputField } from '../../src/components/common/InputField';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OTPLogin() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = () => {
    setIsLoading(true);
    setTimeout(() => {
      setOtpSent(true);
      setIsLoading(false);
    }, 1000);
  };

  const handleVerifyOTP = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push('/auth/role-selection' as any);
    }, 1000);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6">
          <View className="mt-20 mb-10">
            <Text className="text-4xl font-bold text-primary mb-2">RefynHome</Text>
            <Text className="text-gray-600 text-lg">Welcome back!</Text>
          </View>

          <InputField
            label="Phone Number"
            placeholder="+92 300 1234567"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            editable={!otpSent}
          />

          {otpSent && (
            <InputField
              label="Enter OTP"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
          )}

          <View className="mt-6">
            {!otpSent ? (
              <AppButton
                title="Send OTP"
                onPress={handleSendOTP}
                isLoading={isLoading}
                disabled={phoneNumber.length < 10}
              />
            ) : (
              <>
                <AppButton
                  title="Verify OTP"
                  onPress={handleVerifyOTP}
                  isLoading={isLoading}
                  disabled={otp.length !== 6}
                />
                <AppButton
                  title="Resend OTP"
                  onPress={handleSendOTP}
                  variant="outline"
                  className="mt-3"
                />
              </>
            )}
          </View>

          <Text className="text-center text-gray-500 text-sm mt-8">
            By continuing, you agree to our Terms & Conditions
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
