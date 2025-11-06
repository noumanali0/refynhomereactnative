import React from 'react';
import { Text, TouchableOpacity, ViewStyle } from 'react-native';

export const OutlineButton = ({ title, onPress, styles }: { title: string; onPress?: () => void, styles: ViewStyle }) => (
    <TouchableOpacity
        onPress={onPress}
        className="border border-blue-500 rounded-xl py-2 px-4 mt-3"
        style={styles}
    >
        <Text className="text-blue-500 text-center font-semibold">{title}</Text>
    </TouchableOpacity>
);
