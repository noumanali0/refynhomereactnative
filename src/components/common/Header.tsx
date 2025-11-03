import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: {
    text: string;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = false, rightAction }) => {
  const router = useRouter();

  return (
    <View className="bg-primary py-4 px-4 flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-white text-xl">←</Text>
          </TouchableOpacity>
        )}
        <Text className="text-white text-xl font-bold">{title}</Text>
      </View>
      {rightAction && (
        <TouchableOpacity onPress={rightAction.onPress}>
          <Text className="text-white font-medium">{rightAction.text}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
