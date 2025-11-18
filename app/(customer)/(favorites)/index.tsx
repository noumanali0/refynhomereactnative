import React from 'react';
import { View, FlatList } from 'react-native';
// import { useAppSelector } from '../../../src/hooks/useAppDispatch';
// import { Header } from '../../../src/components/common/Header';
// import { VendorCard } from '../../../src/components/common/VendorCard';
import AppHeader from '@/components/common/AppHeader';
import { useAppSelector } from '@/hooks/useAppDispatch';
import Text from '@/components/common/Text';
import { VendorCard } from '@/components/common/VendorCard';
import { moderateScale } from 'react-native-size-matters';

export default function Favorites() {
    const { vendors, favoriteVendorIds } = useAppSelector((state) => state.vendor);
    const favoriteVendors = vendors;
    // const favoriteVendors = vendors.filter((v) => favoriteVendorIds.includes(v.id));

    return (
        <View className="flex-1 bg-gray-50">
            <AppHeader />
            <Text type='title' style={{ marginTop: moderateScale(8), marginRight: moderateScale(8) }}>❤️ Favorite Vendors</Text>
            <View className="px-4 pt-4 flex-1">
                {favoriteVendors.length > 0 ? (
                    <FlatList
                        data={favoriteVendors}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <VendorCard vendor={item} />}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View className="flex-1 items-center justify-center">
                        <Text className="text-4xl mb-4">❤️</Text>
                        <Text className="text-gray-600 text-lg">No favorites yet</Text>
                        <Text className="text-gray-400 mt-2">Add vendors to your favorites</Text>
                    </View>
                )}
            </View>
        </View>
    );
}
