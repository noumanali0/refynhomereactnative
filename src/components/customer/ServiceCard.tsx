// components/ServiceCard.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { MapPin } from "lucide-react-native";
import { VendorOfferCard } from "./VendorOfferCard";
import { ServiceCardContainer } from "../common/ServiceCardWithGradientBorder";
import Text from "../common/Text";
// import { ServiceCardContainer } from "./ServiceCardContainer";

interface ServiceCardProps {
    service: {
        id: string;
        serviceType: string;
        location: string;
        issue: string;
    };
    vendorOffer: any;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, vendorOffer }) => {
    return (
        <ServiceCardContainer>
            {/* Service Header */}
            <Text type="bodySemiBold" style={styles.title}>{service?.serviceType}</Text>

            {/* Address Row */}
            <View style={styles.row}>
                <MapPin size={16} color="#2563EB" />
                <Text type="body" >{service?.location}</Text>
            </View>

            {/* Description */}
            <Text type="body">{service?.issue}</Text>

            {/* Vendor Offer Card */}
            <VendorOfferCard offer={vendorOffer} isAccepted={true} notFromMap={true} />
        </ServiceCardContainer>
    );
};

const styles = StyleSheet.create({
    title: {
        // fontSize: 18,
        // fontWeight: "700",
        // marginBottom: 8,
        // color: "#111",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 6,
    },
    address: { fontSize: 14, color: "#555" },
    description: {
        fontSize: 14,
        color: "#666",
        marginBottom: 12,
        lineHeight: 20,
    },
});


// import React, { useEffect, useState } from 'react';
// import { View, Text, TouchableOpacity } from 'react-native';
// import { StatusBadge } from './StatusBadge';
// import { VendorCard } from './VendorCard';
// import { OutlineButton } from '../common/OutlineButton';
// import { MotiView } from 'moti';
// import { Easing } from 'react-native-reanimated';
// import SearchStatusBar from '../common/SearchStatusBar';
// import { Ionicons } from '@expo/vector-icons';

// export const ServiceCard = ({ item }: { item: any }) => {
//     const [status, setStatus] = useState(item.status);

//     // Mock real-time status updates (simulate socket)
//     useEffect(() => {
//         // if (status === 'pending') {
//         //     const timer = setTimeout(() => setStatus('en_route'), 8000); // after 8s change to en_route
//         //     return () => clearTimeout(timer);
//         // }
//         if (status === 'en_route') {
//             const timer = setTimeout(() => setStatus('in_progress'), 12000); // 12s later -> in progress
//             return () => clearTimeout(timer);
//         }
//     }, [status]);

//     const renderActionButton = () => {
//         switch (status) {
//             case 'en_route':
//                 return <OutlineButton title="Technician Arrived – Start Service" />;
//             case 'in_progress':
//                 return <OutlineButton title="Mark as Completed" />;
//             case 'assigned':
//                 return <OutlineButton title="Cancel Request" />;
//             case 'waiting':
//                 return <OutlineButton title="Cancel Request & Leave Review" />;
//             case 'pending':
//                 return <OutlineButton title="Cancel Request" />;
//             default:
//                 return null;
//         }
//     };

//     return (
//         <MotiView
//             from={{ opacity: 0, translateY: 30 }}
//             animate={{ opacity: 1, translateY: 0 }}
//             transition={{ type: 'timing', duration: 400, easing: Easing.out(Easing.exp) }}
//             className="bg-white rounded-2xl p-4 mb-4 shadow-lg border border-gray-100"
//         >
//             {/* Header */}
//             <View className="flex-row justify-between items-center mb-2">
//                 <View>
//                     <Text className="text-base font-semibold text-gray-800">{item.serviceType}</Text>
//                     <Text className="text-base  text-gray-400">{"ASAP"}</Text>
//                 </View>
//                 <StatusBadge status={status} />
//             </View>

//             {/* Content based on status */}
//             {status === 'pending' && (
//                 <View className="bg-white rounded-lg p-6" style={{ borderColor: "#F97316", borderWidth: 1 }}>
//                     <Text className="text-black mb-2 text-md font-bold font-poppins ">Vendors who accepted:</Text>
//                     <SearchStatusBar isSearching={true} remainingTime="30 min" />
//                     {item.vendors.map((v: any) => (
//                         <VendorCard key={v.id} vendor={v} />
//                     ))}
//                 </View>
//             )}

//             {['en_route', 'in_progress', 'assigned', 'waiting'].includes(status) && (
//                 <MotiView
//                     from={{ opacity: 0 }}
//                     animate={{ opacity: 1 }}
//                     transition={{ delay: 400 }}
//                     className="mt-2"
//                 >
//                     <View>
//                         <Text className="font-semibold text-gray-700">{item?.technician?.name}</Text>
//                         <View className="flex-row justify-center  items-center">
//                             <TouchableOpacity className="mt-2">
//                                 <Text className="text-blue-600 text-sm font-medium">📞 Call</Text>
//                             </TouchableOpacity>
//                             <TouchableOpacity className="bg-green-100 px-3 py-1 rounded-lg ml-4">
//                                 <Text className="text-green-600 font-medium text-sm">WhatsApp</Text>
//                             </TouchableOpacity>
//                         </View>
//                     </View>

//                     {item.schedule && (
//                         <Text className="text-sm text-gray-600 mt-1">
//                             Scheduled for: <Text className="font-medium font-poppins">{item.schedule}</Text>
//                         </Text>
//                     )}
//                     <Text className="text-sm text-gray-600 mt-1">{item.note}</Text>
//                 </MotiView>
//             )}

//             {/* Footer */}
//             <View className="mt-3">
//                 <View className='flex-row items-center'>
//                     <Ionicons name="location-outline" size={16} color="#6B7280" className='mr-3' />
//                     <Text className="text-gray-700 text-sm">{item.location}</Text>
//                 </View>
//                 <Text className="text-gray-500 text-xs mt-1">{item.issue}</Text>
//             </View>

//             {/* Action Button */}
//             <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 600 }}>
//                 {renderActionButton()}
//             </MotiView>
//         </MotiView>
//     );
// };


// // import React from 'react';
// // import { View, Text } from 'react-native';
// // import { StatusBadge } from './StatusBadge';
// // import { VendorCard } from './VendorCard';
// // import { OutlineButton } from '../common/OutlineButton';
// // // import { OutlineButton } from './OutlineButton';

// // export const ServiceCard = ({ item }: { item: any }) => {
// //     return (
// //         <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
// //             {/* Header */}
// //             <View className="flex-row justify-between items-center mb-2">
// //                 <Text className="text-base font-semibold text-gray-800">{item.serviceType}</Text>
// //                 <StatusBadge status={item.status} />
// //             </View>

// //             {/* Content based on status */}
// //             {item.status === 'pending' && (
// //                 <>
// //                     <Text className="text-gray-600 mb-2">Vendors who accepted:</Text>
// //                     {item.vendors.map((v: any) => (
// //                         <VendorCard key={v.id} vendor={v} />
// //                     ))}
// //                 </>
// //             )}

// //             {['en_route', 'in_progress', 'assigned', 'waiting'].includes(item.status) && (
// //                 <View className="mt-2">
// //                     <Text className="font-semibold text-gray-700">{item.technician.name}</Text>
// //                     <Text className="text-xs text-gray-500">⭐ {item.technician.rating}</Text>
// //                     {item.schedule && (
// //                         <Text className="text-sm text-gray-600 mt-1">
// //                             Scheduled for: <Text className="font-medium">{item.schedule}</Text>
// //                         </Text>
// //                     )}
// //                     <Text className="text-sm text-gray-600 mt-1">{item.note}</Text>
// //                 </View>
// //             )}

// //             {/* Footer */}
// //             <View className="mt-3">
// //                 <Text className="text-gray-700 text-sm">{item.location}</Text>
// //                 <Text className="text-gray-500 text-xs mt-1">{item.issue}</Text>
// //             </View>

// //             <OutlineButton title="Cancel Request" />
// //         </View>
// //     );
// // };
