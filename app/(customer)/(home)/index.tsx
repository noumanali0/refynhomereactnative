import { useState, useEffect, useRef } from 'react';
import {
  View,
  // Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { SERVICE_CATEGORIES } from '@/constants/serviceCategories';
import { moderateScale, verticalScale, scale } from "react-native-size-matters";
import Text from '@/components/common/Text';
import { COLORS } from '@/constants/colors';
import AppHeader from '@/components/common/AppHeader';
import { AppButton } from '@/components/common/AppButton';
import { LinearGradient } from "expo-linear-gradient";
import { ServiceHistoryCard } from '@/components/customer/ServiceHistoryCard';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { updateProfile, fetchUserProfile } from '@/store/slices/authSlice';
import { fetchServiceHistory, selectServiceHistory, selectIsLoading as selectHistoryLoading } from '@/store/slices/serviceHistorySlice';
import {
  getCustomerActiveService,
  clearCustomerActiveService,
  isActiveServiceExpired,
} from '@/services/customerActiveServiceService';
// import { useAppSelector } from '@/store/hooks';
// import { useGetServiceHistoryQuery } from '@/services/customerApi';
// import { SERVICE_TYPES } from '@/utils/constants';
// import { useSocket } from '@/hooks/useSocket';

export default function CustomerHomeScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const recentServices = useAppSelector(selectServiceHistory);
  const historyLoading = useAppSelector(selectHistoryLoading);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingActiveService, setCheckingActiveService] = useState(true);
  const hasCheckedActiveService = useRef(false);
  // const { isConnected } = useSocket();
  const isConnected = true;

  // Check for active service on mount and redirect to live-offers if found
  useEffect(() => {
    const checkActiveService = async () => {
      // Only check once per mount
      if (hasCheckedActiveService.current) return;
      hasCheckedActiveService.current = true;

      try {
        const activeService = await getCustomerActiveService();

        if (activeService) {
          // Check if request has already expired (based on stored expiresAt)
          const isExpired = await isActiveServiceExpired();

          if (isExpired && activeService.status !== 'accepted') {
            // Request expired and no proposal was accepted - clear storage
            if (__DEV__) {
              console.log('[CustomerHome] Active service expired, clearing storage');
            }
            await clearCustomerActiveService();
            setCheckingActiveService(false);
            return;
          }

          if (__DEV__) {
            console.log('[CustomerHome] Found active service, redirecting to live-offers:', activeService);
          }

          // Redirect to live-offers with the stored data (including retry params)
          // Pass status and expiresAt for proper state restoration
          router.replace({
            pathname: '/(customer)/(home)/live-offers',
            params: {
              requestId: activeService.requestId.toString(),
              // Pass expiresAt for timer restoration
              ...(activeService.expiresAt && {
                expiresAt: activeService.expiresAt,
              }),
              // Pass status for state restoration
              ...(activeService.status && {
                restoredStatus: activeService.status,
              }),
              ...(activeService.serviceLocation && {
                latitude: activeService.serviceLocation.latitude.toString(),
                longitude: activeService.serviceLocation.longitude.toString(),
              }),
              ...(activeService.serviceAddress && {
                address: activeService.serviceAddress,
              }),
              // Retry params for Search Again functionality
              ...(activeService.categoryId && {
                categoryId: activeService.categoryId.toString(),
              }),
              ...(activeService.problemTitle && {
                problemTitle: activeService.problemTitle,
              }),
              ...(activeService.description !== undefined && {
                description: activeService.description,
              }),
              // Pass acceptance data if available (for cancel window restoration)
              ...(activeService.proposalId && {
                proposalId: activeService.proposalId.toString(),
              }),
              ...(activeService.acceptedAt && {
                acceptedAtTimestamp: activeService.acceptedAt.toString(),
              }),
              // Pass vendor location for immediate restoration (app kill recovery)
              ...(activeService.vendorLocation && {
                vendorLatitude: activeService.vendorLocation.latitude.toString(),
                vendorLongitude: activeService.vendorLocation.longitude.toString(),
                vendorTimestamp: activeService.vendorLocation.timestamp.toString(),
              }),
              // Pass vendor info for offline display
              ...(activeService.acceptedVendor && {
                vendorId: activeService.acceptedVendor.id.toString(),
                vendorName: activeService.acceptedVendor.full_name,
              }),
            },
          });
        }
      } catch (error) {
        if (__DEV__) {
          console.error('[CustomerHome] Error checking active service:', error);
        }
        // Clear potentially corrupted data
        await clearCustomerActiveService().catch(() => { });
      } finally {
        setCheckingActiveService(false);
      }
    };

    checkActiveService();
  }, [router]);

  // Fetch user profile and recent services on mount
  useEffect(() => {
    dispatch(fetchUserProfile());
    // Fetch recent services (limit to 5 for home screen)
    dispatch(fetchServiceHistory({ limit: 5 }));
  }, [dispatch]);

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
    await Promise.all([
      dispatch(fetchServiceHistory({ limit: 5 })),
      refetchLocation(),
    ]);
    setRefreshing(false);
  };

  const handleServiceSelect = (serviceType: string) => {
    router.push({
      pathname: '/(customer)/(home)/service-request',
      params: { serviceType },
    });
  };

  // Show loading while checking for active service
  if (checkingActiveService) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Services</Text>
          {recentServices.length > 0 && (
            <Pressable onPress={() => router.push('/(customer)/(history)')}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          )}
        </View>
        {historyLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : recentServices.length > 0 ? (
          recentServices.slice(0, 3).map((service) => (
            <ServiceHistoryCard
              key={service.id}
              request={service}
              onPress={() => router.push({
                pathname: '/(customer)/(history)/service-details',
                params: { id: service.id.toString() },
              })}
            />
          ))
        ) : (
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
    fontSize: moderateScale(14),
    color: '#8E8E93',
  },
  userName: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#000',
    marginTop: verticalScale(4),
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
    fontSize: moderateScale(12),
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
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: verticalScale(8),
  },
  cardSubtitle: {
    fontSize: moderateScale(14),
    color: '#fff',
    opacity: 0.9,
    marginBottom: moderateScale(10)
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: verticalScale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold' as const,
    color: '#000',
  },
  viewAllText: {
    fontSize: moderateScale(14),
    color: COLORS.primary,
    fontWeight: '600' as const,
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
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  serviceLabel: {
    fontSize: moderateScale(12),
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
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#000',
    marginBottom: verticalScale(4),
  },
  historyVendor: {
    fontSize: moderateScale(14),
    color: '#8E8E93',
    marginBottom: verticalScale(2),
  },
  historyDate: {
    fontSize: moderateScale(12),
    color: '#8E8E93',
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    fontSize: moderateScale(12),
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
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#000',
    marginTop: verticalScale(16),
  },
  emptySubtext: {
    fontSize: moderateScale(14),
    color: '#8E8E93',
    marginTop: verticalScale(8),
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
