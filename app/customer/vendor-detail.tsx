// VendorDetailScreen.tsx
import React, { useCallback, memo, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { RatingStars } from "../../src/components/common/RatingStars";

// ----------------------- Types -----------------------
type Vendor = {
  id: string;
  name: string;
  avatar?: string;
  location: string;
  rating: number;
  reviewsCount: number;
  tags: string[];
  verified: boolean;
  responseRate: string;
  experience: number;
  jobsThisMonth: number;
  about: string;
  services: { title: string; subtitle?: string }[];
  certifications?: string[];
  phone?: string;
  email?: string;
};

type Review = {
  id: string;
  user: string;
  rating: number;
  text: string;
  date: string;
};

// ----------------------- Mock data (replace with real fetch) -----------------------
const mockVendor: Vendor = {
  id: "1",
  name: "Ahmed Ali",
  avatar: undefined,
  location: "Sialkot",
  rating: 4.8,
  reviewsCount: 127,
  tags: ["AC Repair", "Refrigerator Repair"],
  verified: true,
  responseRate: "95%",
  experience: 10,
  jobsThisMonth: 245,
  about: "Expert AC technician with 10+ years experience",
  services: [
    { title: "AC Repair", subtitle: "Air conditioning repair and maintenance" },
    { title: "Refrigerator Repair", subtitle: "Fridge and freezer repair" },
  ],
  certifications: ["HVAC Certified", "Licensed Technician"],
  phone: "+923001234567",
  email: "ahmed@example.com",
};

const mockReviews: Review[] = [
  {
    id: "r1",
    user: "Sana",
    rating: 5,
    text: "Great service, quick response and professional.",
    date: "2024-09-01",
  },
  {
    id: "r2",
    user: "Bilal",
    rating: 4,
    text: "Fixed AC problem within 30 minutes. Recommended.",
    date: "2024-08-15",
  },
];

// ----------------------- Small Reusable Components -----------------------
const Pill = memo(({ children }: { children: React.ReactNode }) => (
  <View className="bg-[#FFECD8] px-3 py-1 rounded-full mr-2">
    <Text className="text-xs text-[#9A5A00]">{children}</Text>
  </View>
));

const StatCard = memo(({ title, value }: { title: string; value: string | number }) => (
  <View className="bg-white shadow-sm rounded-lg p-4 flex-1 mr-3" style={styles.cardShadow}>
    <Text className="text-xs text-gray-500">{title}</Text>
    <Text className="text-lg font-semibold text-gray-800 mt-1">{value}</Text>
  </View>
));

const Tag = memo(({ text }: { text: string }) => (
  <View className="bg-[#FFF2F0] px-3 py-1 rounded-full mr-2 mt-2">
    <Text className="text-xs text-[#C2410C]">{text}</Text>
  </View>
));

// ----------------------- Header Card -----------------------
const VendorHeaderCard = memo(({ vendor }: { vendor: Vendor }) => {
  return (
    <View className="bg-white rounded-2xl p-4 shadow-lg">
      <View className="flex-row items-center">
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center overflow-hidden">
          {vendor.avatar ? (
            <Image source={{ uri: vendor.avatar }} style={{ width: 80, height: 80 }} />
          ) : (
            <View className="w-20 h-20 rounded-full bg-orange-100 items-center justify-center">
              <Text className="text-2xl">👨‍🔧</Text>
            </View>
          )}
        </View>

        <View className="flex-1 ml-4">
          <View className="flex-row items-center">
            <Text className="text-xl font-semibold text-gray-900">{vendor.name}</Text>
            {vendor.verified && (
              <View className="ml-2 px-2 py-0.5 rounded-full bg-[#E6FFFA] border border-green-200">
                <Text className="text-xs text-green-700">Verified</Text>
              </View>
            )}
            <View className="ml-2 px-2 py-0.5 rounded-full bg-[#ECFDF5]">
              <Text className="text-xs text-green-600">Online</Text>
            </View>
          </View>

          <View className="flex-row items-center mt-1">
            <Ionicons name="location-outline" size={14} color="#6B7280" />
            <Text className="text-xs text-gray-500 ml-1">{vendor.location}</Text>
            <Text className="text-xs text-gray-500 ml-3">• {vendor.jobsThisMonth} jobs</Text>
            <Text className="text-xs text-gray-500 ml-3">• Member since 2024</Text>
          </View>

          <View className="flex-row items-center mt-3">
            <View className="flex-row items-center">
              <Text className="text-yellow-500 font-semibold mr-2">★ {vendor.rating}</Text>
              <Text className="text-xs text-gray-500">({vendor.reviewsCount} reviews)</Text>
            </View>
          </View>

          <View className="flex-row mt-3 flex-wrap">
            {vendor.tags.map((t) => (
              <View key={t} className="bg-[#FFF2F0] px-3 py-1 rounded-full mr-2 mb-2">
                <Text className="text-xs text-[#C2410C]">{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity
        className="mt-4 border border-blue-400 rounded-lg py-3 items-center"
        accessibilityLabel="message-button"
        testID="message-button"
      >
        <Text className="text-blue-600 font-medium">Message</Text>
      </TouchableOpacity>
    </View>
  );
});

// ----------------------- Tabs -----------------------
const Tabs = memo(
  ({ active, onChange }: { active: "about" | "reviews" | "contact"; onChange: (t: any) => void }) => {
    return (
      <View className="flex-row mt-4 bg-white rounded-xl p-1">
        {["about", "reviews", "contact"].map((t) => {
          const label = t.charAt(0).toUpperCase() + t.slice(1);
          const activeTab = active === t;
          return (
            <Pressable
              key={t}
              onPress={() => onChange(t)}
              className={`flex-1 items-center py-2 rounded-lg ${activeTab ? "bg-blue-50" : "bg-transparent"
                }`}
              testID={`tab-${t}`}
            >
              <Text className={`text-sm ${activeTab ? "text-blue-600" : "text-gray-600"}`}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
);

// ----------------------- Tab contents -----------------------
const AboutTab = memo(({ vendor }: { vendor: Vendor }) => {
  return (
    <View className="mt-4">
      <Text className="text-lg font-semibold text-gray-900 mb-2">About {vendor.name}</Text>
      <Text className="text-sm text-gray-600 mb-4">{vendor.about}</Text>

      <Text className="text-sm font-semibold text-gray-700 mb-2">Services Offered</Text>
      <View className="space-y-3">
        {vendor.services.map((s) => (
          <View key={s.title} className="bg-white rounded-lg p-3 border border-gray-100">
            <Text className="font-semibold text-gray-800">{s.title}</Text>
            {s.subtitle && <Text className="text-xs text-gray-500 mt-1">{s.subtitle}</Text>}
          </View>
        ))}
      </View>

      {vendor.certifications && vendor.certifications.length > 0 && (
        <>
          <Text className="text-sm font-semibold text-gray-700 mt-4 mb-2">Certifications</Text>
          <View className="flex-row flex-wrap">
            {vendor.certifications.map((c) => (
              <View key={c} className="bg-white px-3 py-1 rounded-full mr-2 mb-2 border border-gray-100">
                <Text className="text-xs text-gray-700">{c}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
});

const ReviewItem = memo(({ item }: { item: Review }) => (
  <View key={item?.id} className="mb-6 pb-4 border-b border-gray-100 shadow-sm rounded-lg p-4">
    <View className="flex-row items-center mb-2">
      <Text className="font-semibold text-gray-900 flex-1">{item?.user}</Text>
      <RatingStars rating={item.rating} size="small" />
    </View>
    <Text className="text-gray-600">{item?.text}</Text>
    <Text className="text-sm text-gray-500">{item.date}</Text>
  </View>

));

const ReviewsTab = memo(({ reviews }: { reviews: Review[] }) => {
  return (
    <View className="mt-4">
      <Text className="text-lg font-semibold text-gray-900 mb-3">Reviews</Text>
      <FlatList
        data={reviews}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <ReviewItem item={item} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

const ContactTab = memo(({ vendor }: { vendor: Vendor }) => {
  return (
    <View className="mt-4 space-y-3 bg-white p-6 rounded-lg shadow-lg">
      <Text className="text-xl font-semibold text-gray-900 mb-1">Contact Information</Text>

      <View className=" p-3 ">
        <View className="flex-row items-center">
          <Ionicons name="call-outline" size={20} color="#2563EB" />
          <View className="ml-3">
            <Text className="text-sm text-gray-500">Phone</Text>
            <Text className="text-md font-medium text-gray-800">{vendor.phone}</Text>
          </View>
        </View>
      </View>

      <View className="p-3 mt-4">
        <View className="flex-row items-center">
          <Ionicons name="mail-outline" size={20} color="#2563EB" />
          <View className="ml-3">
            <Text className="text-sm text-gray-500">Email</Text>
            <Text className="text-md font-medium text-gray-800">{vendor.email}</Text>
          </View>
        </View>
      </View>

      <View className=" rounded-lg p-3 mt-4">
        <View className="flex-row items-center">
          <Ionicons name="location-outline" size={20} color="#2563EB" />
          <View className="ml-3">
            <Text className="text-sm text-gray-500">Location</Text>
            <Text className="text-md font-medium text-gray-800">{vendor.location}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity className="mt-4 bg-primary rounded-lg py-3 items-center" testID="send-message">
        <Text className="text-white font-semibold">Send Message</Text>
      </TouchableOpacity>
    </View>
  );
});

// ----------------------- Main Screen -----------------------
const VendorDetailScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  // const vendorId = params.id; // use to fetch vendor
  // For now using mock data
  const vendor = mockVendor;
  const [activeTab, setActiveTab] = useState<"about" | "reviews" | "contact">("about");

  const onChangeTab = useCallback((t: any) => setActiveTab(t), []);

  return (
    <ScrollView className="flex-1 bg-gray-50 px-4 py-4">
      {/* Top header / back */}
      <View className="flex-row items-center justify-between mb-3">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-row items-center">
          <Text className="text-lg font-semibold text-[#2563EB]">RefynHome</Text>
        </View>
        <View className="w-8 h-8" />
      </View>

      {/* Header Card */}
      <VendorHeaderCard vendor={vendor} />

      {/* Stats row */}
      <View className="flex-row mt-6">
        <StatCard title="Response Rate" value={vendor.responseRate} />
        <StatCard title="Experience" value={`${vendor.experience}`} />
      </View>
      <View className="flex-row mt-3 mb-4">
        <StatCard title="Jobs This Month" value={`${vendor.jobsThisMonth}`} />
        <StatCard title="Verified" value={vendor.verified ? "Yes" : "No"} />
      </View>

      {/* Tabs */}
      <Tabs active={activeTab} onChange={onChangeTab} />

      {/* Tab content */}
      <View className="mt-3">
        {activeTab === "about" && <AboutTab vendor={vendor} />}
        {activeTab === "reviews" && <ReviewsTab reviews={mockReviews} />}
        {activeTab === "contact" && <ContactTab vendor={vendor} />}
      </View>

      <View className="h-24" />
    </ScrollView>
  );
};

export default VendorDetailScreen;


const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2, // For Android
  },
});

// import React from 'react';
// import { View, Text, SafeAreaView, ScrollView, Image, TouchableOpacity } from 'react-native';
// import { useRouter, useLocalSearchParams } from 'expo-router';
// import { useAppSelector } from '../../src/hooks/useAppDispatch';
// import { Header } from '../../src/components/common/Header';
// import { RatingStars } from '../../src/components/common/RatingStars';
// import { AppButton } from '../../src/components/common/AppButton';

// export default function VendorDetail() {
//   const router = useRouter();
//   const { id } = useLocalSearchParams();
//   const { vendors } = useAppSelector((state) => state.vendor);
//   const { reviews } = useAppSelector((state) => state.review);

//   const vendor = vendors.find((v) => v.id === id);
//   const vendorReviews = reviews.filter((r) => r.vendorId === id);

//   if (!vendor) {
//     return (
//       <SafeAreaView className="flex-1 bg-white">
//         <Header title="Vendor Details" showBack />
//         <View className="flex-1 items-center justify-center">
//           <Text>Vendor not found</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView className="flex-1 bg-gray-50">
//       <Header title="Vendor Details" showBack />
//       <ScrollView>
//         <View className="bg-white p-6 items-center border-b border-gray-200">
//           <Image
//             source={{ uri: vendor.profilePhoto || 'https://i.pravatar.cc/150?img=1' }}
//             className="w-32 h-32 rounded-full mb-4"
//           />
//           <View className="flex-row items-center mb-2">
//             <Text className="text-2xl font-bold text-gray-900 mr-2">{vendor.name}</Text>
//             {vendor.verified && <Text className="text-xl">✅</Text>}
//           </View>
//           <View className="flex-row items-center mb-2">
//             <RatingStars rating={vendor.rating} size="medium" />
//             <Text className="text-gray-600 ml-2">({vendor.totalReviews} reviews)</Text>
//           </View>
//           <Text className="text-gray-600 mb-2">📍 {vendor.city}</Text>
//           {vendor.isOnline && (
//             <View className="flex-row items-center">
//               <View className="w-2 h-2 bg-success rounded-full mr-1" />
//               <Text className="text-success font-medium">Online Now</Text>
//             </View>
//           )}
//         </View>

//         <View className="bg-white p-6 mt-2">
//           <Text className="text-lg font-bold text-gray-900 mb-3">Services</Text>
//           <View className="flex-row flex-wrap">
//             {vendor.serviceCategories.map((category, index) => (
//               <View key={index} className="bg-primary-50 px-4 py-2 rounded-full mr-2 mb-2">
//                 <Text className="text-primary font-medium">{category}</Text>
//               </View>
//             ))}
//           </View>
//         </View>

//         <View className="bg-white p-6 mt-2">
//           <Text className="text-lg font-bold text-gray-900 mb-4">Reviews ({vendorReviews.length})</Text>
//           {vendorReviews.length > 0 ? (
//             vendorReviews.slice(0, 5).map((review) => (
//               <View key={review.id} className="mb-4 pb-4 border-b border-gray-100">
//                 <View className="flex-row items-center mb-2">
//                   <Text className="font-semibold text-gray-900 flex-1">{review.customerName}</Text>
//                   <RatingStars rating={review.rating} size="small" />
//                 </View>
//                 <Text className="text-gray-600">{review.comment}</Text>
//               </View>
//             ))
//           ) : (
//             <Text className="text-gray-500">No reviews yet</Text>
//           )}
//         </View>

//         <View className="p-6">
//           <AppButton
//             title="Book Now"
//             onPress={() => router.push(`/booking/booking-details?vendorId=${vendor.id}` as any)}
//           />
//           <AppButton
//             title="Chat with Vendor"
//             variant="outline"
//             className="mt-3"
//             onPress={() => router.push('/chat' as any)}
//           />
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }
