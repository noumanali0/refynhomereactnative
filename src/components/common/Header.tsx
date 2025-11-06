import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
    <View className="bg-white py-4 px-4 flex-row items-center justify-between h-20" >
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        )}
        <Text className="text-black text-xl font-bold">{title}</Text>
      </View>
      {rightAction && (
        <TouchableOpacity onPress={rightAction.onPress}>
          <Text className="text-black font-medium">{rightAction.text}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
