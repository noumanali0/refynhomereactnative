import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { mockActiveServices } from '../../../src/mock/services';
import { ServiceCard } from '../../../src/components/customer/ServiceCard';
import AppHeader from '@/components/common/AppHeader';
// import { ServiceCard } from '../components/ServiceCard';

const ServicesHistoryScreen = () => {
    return (
        <View className="flex-1 bg-gray-50 px-3">
            <AppHeader />
            <Text className="text-xl font-bold text-gray-800 my-3">History</Text>
            <FlatList
                data={mockActiveServices}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ServiceCard service={item} vendorOffer={{}} />}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

export default ServicesHistoryScreen;
