import { useState, useEffect } from 'react';
import {
  View,
  // Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { SERVICE_CATEGORIES } from '@/constants/serviceCategories';
import { moderateScale } from "react-native-size-matters";
import Text from '@/components/common/Text';
import { COLORS } from '@/constants/colors';
import AppHeader from '@/components/common/AppHeader';
import { AppButton } from '@/components/common/AppButton';
import { LinearGradient } from "expo-linear-gradient";
import { mockActiveServices } from '@/mock/services';
import { ServiceCard } from '@/components/customer/ServiceCard';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { updateProfile } from '@/store/slices/authSlice';
import { AddressSearchBottomSheet } from '@/components/customer/AddressSearchBottomSheet';
// import { useAppSelector } from '@/store/hooks';
// import { useGetServiceHistoryQuery } from '@/services/customerApi';
// import { SERVICE_TYPES } from '@/utils/constants';
// import { useSocket } from '@/hooks/useSocket';

export default function CustomerHomeScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { data: history, isLoading, refetch } = { data: [], isLoading: false, refetch: async () => { } }; // useGetServiceHistoryQuery();
  const [refreshing, setRefreshing] = useState(false);
  // const { isConnected } = useSocket();
  const isConnected = true;

  // Get current location
  const {
    city: currentCity,
    loading: locationLoading,
    error: locationError,
    refetch: refetchLocation,
  } = useCurrentLocation({ autoFetch: true });

  // Update Redux when location is fetched
  useEffect(() => {
    if (currentCity && currentCity !== user?.city) {
      dispatch(updateProfile({ city: currentCity }));
    }
  }, [currentCity, user?.city, dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchLocation()]);
    setRefreshing(false);
  };

  const handleServiceSelect = (serviceType: string) => {
    router.push({
      pathname: '/(customer)/(home)/service-request',
      params: { serviceType },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader />
      <View style={styles.header}>
        <View style={styles.sectionTop}>
          <Text type="title" style={styles.welcome}>
            Welcome back, <Text type="title" style={{ textTransform: "capitalize", color: COLORS.primary500 }} >{user?.name || 'Masood'}</Text> <Text>👋</Text>
          </Text>
          {/* map-marker and address */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location-outline" size={18} color={COLORS.gray500} />
            {locationLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text type="subtitle" style={styles.date}>
                {currentCity || user?.city || 'Lahore'}
              </Text>
            )}
            {locationError && (
              <TouchableOpacity onPress={refetchLocation} style={{ marginLeft: 4 }}>
                <Ionicons name="refresh" size={16} color={COLORS.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* <AddressSearchBottomSheet
          isVisible={true}
          onClose={() => { }}
          onSelectAddress={(address) => console.log(address)}
          proximity={undefined}
          initialValue={''}
        /> */}
        {/* <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.userName}>{user?.name || 'Customer'}</Text>
        </View> */}
        {/* <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push('/(shared)/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#000" />
          <View style={styles.badge} />
        </TouchableOpacity> */}
      </View>

      {/* Connection Status */}
      {!isConnected && (
        <View style={styles.offlineBar}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.offlineText}>You're offline</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Request Card */}

        <LinearGradient
          colors={["#2563EB", "#F97316"]}   // your gradient start → end
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quickRequestCard}
        >
          <Text style={styles.cardTitle}>Need a service?</Text>
          <Text style={styles.cardSubtitle}>
            Request a service and get quotes from nearby vendors
          </Text>

          <AppButton
            // variant="outline"
            title="Request Service"
            onPress={() => router.push("/(customer)/(home)/create")}
          />
        </LinearGradient>

        {/* <View style={styles.quickRequestCard}>
          <Text style={styles.cardTitle}>Need a service?</Text>
          <Text style={styles.cardSubtitle}>
            Request a service  and get quotes from nearby vendors
          </Text>
          <AppButton
            variant="secondary"
            title='Request Service'
            onPress={() => { }}
          />
        </View> */}

        {/* Service Types Grid */}
        {/* <Text style={styles.sectionTitle}>Select Service Type</Text>
        <View style={styles.servicesGrid}>
          {SERVICE_CATEGORIES.map((service) => (
            <TouchableOpacity
              key={service?.id}
              style={styles.serviceCard}
              onPress={() => handleServiceSelect(service.id)}
            >
              <View style={styles.serviceIcon}>
                <Ionicons name={service.icon as any} size={32} color="#007AFF" />
              </View>
              <Text style={styles.serviceLabel}>{service?.label}</Text>
            </TouchableOpacity>
          ))}
        </View> */}

        {/* Recent Services */}
        <Text style={styles.sectionTitle}>Recent Services</Text>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading...</Text>
          </View>
        )
          // : mockActiveServices && mockActiveServices.length > 0 ? (
          //   mockActiveServices.slice(0, 3).map((item) => (
          //     // <View style={styles.historyCard}>
          //     <ServiceCard service={item} vendorOffer={{}} />

          //   ))
          // )
          : (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color="#8E8E93" />
              <Text style={styles.emptyText}>No service history yet</Text>
              <Text style={styles.emptySubtext}>
                Request your first service to get started
              </Text>
            </View>
          )}
      </ScrollView>
    </View>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return '#34C759';
    case 'in_progress':
      return '#007AFF';
    case 'cancelled':
      return '#FF3B30';
    default:
      return '#FFA500';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    // paddingTop: moderateScale(8),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: moderateScale(16),
    borderRadius: moderateScale(20),
    padding: moderateScale(8),

    marginTop: moderateScale(16),
    borderWidth: 1,
    borderColor: COLORS.gray300
  },
  greeting: {
    fontSize: 14,
    color: '#8E8E93',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 4,
  },
  notificationButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    padding: 8,
    gap: 8,
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  quickRequestCard: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: moderateScale(10)
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    // padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyInfo: {
    flex: 1,
  },
  historyService: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  historyVendor: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionTop: {
    paddingVertical: moderateScale(12),
    // marginBottom: moderateScale(20),
  },
  welcome: {
    marginBottom: moderateScale(2),
    color: COLORS.black
  },
  date: {
    color: COLORS.gray500,
    opacity: 1,
    fontFamily: "Plus-Jakarrta-Sans",
  },
});

// import React, { useState } from 'react';
// import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, FlatList } from 'react-native';
// import { useRouter } from 'expo-router';
// import { useAppSelector, useAppDispatch } from '../../../src/hooks/useAppDispatch';
// import { setFilters } from '../../../src/store/slices/vendorSlice';
// import { logout } from '../../../src/store/slices/authSlice';
// import { SearchBar } from '../../../src/components/common/SearchBar';
// import { VendorCard } from '../../../src/components/common/VendorCard';
// import { SERVICE_CATEGORIES } from '../../../src/constants/serviceCategories';
// import { ServiceCategory } from '../../../src/types';
// import CategoryChips from '../../../src/components/customer/CategoryChips';

// export default function CustomerHome() {
//     const router = useRouter();
//     const dispatch = useAppDispatch();
//     const { user } = useAppSelector((state) => state.auth);
//     const { filteredVendors } = useAppSelector((state) => state.vendor);
//     const [searchQuery, setSearchQuery] = useState('');
//     const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | undefined>();

//     const handleSearch = (text: string) => {
//         setSearchQuery(text);
//         dispatch(setFilters({ searchQuery: text, category: selectedCategory }));
//     };

//     const handleCategorySelect = (category: ServiceCategory) => {
//         const newCategory = category === selectedCategory ? undefined : category;
//         setSelectedCategory(newCategory);
//         dispatch(setFilters({ category: newCategory, searchQuery }));
//     };

//     const handleLogout = () => {
//         dispatch(logout());
//         router.replace('/auth/otp-login' as any);
//     };



//     return (
//         <View className="flex-1 bg-gray-50">
//             <View className="bg-primary px-4 pt-4 pb-6">
//                 <View className="flex-row justify-between items-center mb-4">
//                     <View>
//                         <Text className="text-white text-2xl font-bold">Hello, {user?.name}!</Text>
//                         <Text className="text-white opacity-80">Find your perfect technician</Text>
//                     </View>
//                     <TouchableOpacity onPress={handleLogout}>
//                         <Text className="text-white text-sm">Logout</Text>
//                     </TouchableOpacity>
//                 </View>
//                 <SearchBar
//                     value={searchQuery}
//                     onChangeText={handleSearch}
//                     placeholder="Search for services..."
//                 />
//             </View>
//             <CategoryChips
//                 categories={SERVICE_CATEGORIES}
//                 selectedCategory={selectedCategory}
//                 onSelect={handleCategorySelect}
//             />
//             {/* <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         className="px-4 py-2 bg-white border-b border-gray-200"
//         contentContainerStyle={{ alignItems: 'center' }} // keep chips vertically centered
//       >
//         {SERVICE_CATEGORIES.map((category) => (
//           <TouchableOpacity
//             key={category}
//             className={`px-4 py-1.5 rounded-full mr-2 ${selectedCategory === category ? 'bg-primary' : 'bg-gray-100'
//               }`}
//             onPress={() => handleCategorySelect(category)}
//             activeOpacity={0.7}
//           >
//             <Text
//               className={`text-sm font-medium ${selectedCategory === category ? 'text-white' : 'text-gray-700'
//                 }`}
//             >
//               {category}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView> */}

//             {/* <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2 bg-white border-b border-gray-200">
//         {SERVICE_CATEGORIES.map((category) => (
//           <TouchableOpacity
//             key={category}
//             className={`px-4 py-2 rounded-full mr-2 ${selectedCategory === category ? 'bg-primary' : 'bg-gray-100'
//               }`}
//             onPress={() => handleCategorySelect(category)}
//           >
//             <Text
//               className={`font-medium ${selectedCategory === category ? 'text-white' : 'text-gray-700'
//                 }`}
//             >
//               {category}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView> */}

//             <View className="flex-row px-4 py-3 bg-white mb-2">
//                 <TouchableOpacity
//                     className="flex-1 mr-2 bg-gray-50 py-3 rounded-lg items-center"
//                     onPress={() => router.push('/customer/my-bookings' as any)}
//                 >
//                     <Text className="text-2xl mb-1">📋</Text>
//                     <Text className="text-gray-700 font-medium text-xs">My Bookings</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                     className="flex-1 mr-2 bg-gray-50 py-3 rounded-lg items-center"
//                     onPress={() => router.push('/customer/favorites' as any)}
//                 >
//                     <Text className="text-2xl mb-1">❤️</Text>
//                     <Text className="text-gray-700 font-medium text-xs">Favorites</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                     className="flex-1 bg-gray-50 py-3 rounded-lg items-center"
//                     onPress={() => router.push('/booking/service-selection' as any)}
//                 >
//                     <Text className="text-2xl mb-1">➕</Text>
//                     <Text className="text-gray-700 font-medium text-xs">New Booking</Text>
//                 </TouchableOpacity>
//             </View>

//             <View className="px-4 pt-3 flex-1">
//                 <Text className="text-lg font-bold text-gray-900 mb-3">
//                     {selectedCategory ? `${selectedCategory} Technicians` : 'All Technicians'} ({filteredVendors.length})
//                 </Text>
//                 <FlatList
//                     data={filteredVendors}
//                     keyExtractor={(item) => item.id}
//                     renderItem={({ item }) => <VendorCard vendor={item} />}
//                     showsVerticalScrollIndicator={false}
//                     contentContainerClassName="pb-4"
//                 />
//             </View>
//         </View>
//     );
// }
