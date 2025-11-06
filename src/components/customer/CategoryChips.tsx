import React from 'react';
import { FlatList, TouchableOpacity, Text, View } from 'react-native';
import { ServiceCategory } from '../../types';

interface CategoryChipsProps {
    categories: ServiceCategory[];
    selectedCategory?: ServiceCategory | undefined;
    onSelect: (category: ServiceCategory) => void;
}

const CategoryChips: React.FC<CategoryChipsProps> = ({
    categories,
    selectedCategory,
    onSelect,
}) => {
    return (
        <View className="bg-white border-b border-gray-200 py-2">
            <FlatList
                data={categories}
                horizontal
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
                renderItem={({ item }) => {
                    const isSelected = item === selectedCategory;
                    return (
                        <TouchableOpacity
                            onPress={() => onSelect(item)}
                            activeOpacity={0.7}
                            className={`justify-center items-center h-12 px-4 py-1.5 rounded-full mr-2 ${isSelected ? 'bg-primary' : 'bg-gray-100'
                                }`}
                        >
                            <Text
                                className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-700'
                                    }`}
                            >
                                {item}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
};

export default CategoryChips;
