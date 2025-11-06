import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { mockActiveServices } from '../../src/mock/services';
import { ServiceCard } from '../../src/components/customer/ServiceCard';
// import { ServiceCard } from '../components/ServiceCard';

const ActiveServicesScreen = () => {
    return (
        <View className="flex-1 bg-gray-50 px-3">
            <Text className="text-xl font-bold text-gray-800 my-3">Active Services</Text>

            <FlatList
                data={mockActiveServices}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ServiceCard item={item} />}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

export default ActiveServicesScreen;
