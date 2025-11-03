import React from 'react';
import { View, TextInput, Text } from 'react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
}) => {
  return (
    <View className="bg-white rounded-lg px-4 py-3 flex-row items-center shadow-sm border border-gray-200">
      <Text className="mr-2 text-gray-400">🔍</Text>
      <TextInput
        className="flex-1 text-base"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
};
