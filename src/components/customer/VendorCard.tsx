import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBadge } from './StatusBadge';
import { MotiView, MotiText } from 'moti';
import { AppButton } from '../common/AppButton';
import { OutlineButton } from '../common/OutlineButton';
import { Ionicons } from '@expo/vector-icons';

export const VendorCard = ({ vendor }: { vendor: any }) => {
    const [timer, setTimer] = useState(30); // mock countdown seconds

    useEffect(() => {
        // if (vendor.status === 'expired') return;
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
            style={{ backgroundColor: "#FEF2F2" }}
            className="flex-row items-center justify-between rounded-xl p-3 mb-2 "
        >
            <View className="flex-row items-center">
                <Image
                    source={{ uri: 'https://via.placeholder.com/40' }}
                    className="w-10 h-10 rounded-full mr-3"
                // style={{ width: 100, height: 100, borderRadius: 50, marginRight: 12 }}
                />
                <View>
                    <Text className="font-semibold text-gray-800">{vendor.name}</Text>
                    <Text className="text-xs text-gray-500">
                        ⭐ {vendor.rating} • {vendor.jobs} jobs
                    </Text>
                    <Text className="text-blue-600 font-semibold">Rs. {vendor.price}</Text>
                </View>
            </View>

            {/* {vendor.status !== 'expired' ? ( */}
            {timer == 0 ? (
                <View>
                    <View style={styles.container}>
                        <View style={styles.expiredBadge}>
                            <Ionicons name="time-outline" size={14} color="#DC2626" style={styles.icon} />
                            <Text style={styles.expiredText}>Expired</Text>
                        </View>

                        <TouchableOpacity style={styles.expiredButton} disabled={true}>
                            <Text style={styles.buttonText}>Expired</Text>
                        </TouchableOpacity>
                    </View>
                    {/* <StatusBadge status="expired" /> */}
                </View>
            ) : (
                <View>
                    <MotiText
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 300 }}
                        className="text-xs text-red-600 font-medium mb-4"
                    >
                        ⏳ {timer}s left
                    </MotiText>
                    {/* <AppButton title='Accept' className='bg-primary-400 h-3 justify-center items-center rounded-lg' onPress={() => { }} /> */}
                    <TouchableOpacity
                        style={{ backgroundColor: '#3B82F6', borderRadius: 10, }}
                    >
                        <Text className='text-white font-medium p-2 text-sm'>Accept</Text>
                    </TouchableOpacity>
                </View>
            )}
        </MotiView>
    );
};


const styles = StyleSheet.create({
    container: {
        // optional wrapper if needed
    },
    expiredBadge: {
        borderWidth: 1,
        borderColor: '#DC2626',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 8,
    },
    expiredText: {
        fontSize: 12,
        color: '#DC2626',
    },
    expiredButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 10,
        marginTop: 8,
        alignItems: 'center',
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '500',
        padding: 8,
        fontSize: 14,
    },
});



// import React from 'react';
// import { View, Text, Image } from 'react-native';
// import { StatusBadge } from './StatusBadge';

// export const VendorCard = ({ vendor }: { vendor: any }) => (
//     <View className="flex-row items-center justify-between bg-white rounded-xl p-3 mb-2 border border-orange-200">
//         <View className="flex-row items-center">
//             <Image
//                 source={{ uri: 'https://via.placeholder.com/40' }}
//                 className="w-10 h-10 rounded-full mr-3"
//             />
//             <View>
//                 <Text className="font-semibold text-gray-800">{vendor.name}</Text>
//                 <Text className="text-xs text-gray-500">
//                     ⭐ {vendor.rating} • {vendor.jobs} jobs
//                 </Text>
//                 <Text className="text-blue-600 font-semibold">Rs. {vendor.price}</Text>
//             </View>
//         </View>
//         <StatusBadge status={vendor.status} />
//     </View>
// );
