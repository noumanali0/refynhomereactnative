import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    SafeAreaView,
} from 'react-native';
import {
    ClipboardList,
    Briefcase,
    TrendingUp,
    Calendar,
    MapPin,
} from 'lucide-react-native';
import { MockAPI } from '@/api/mock/handlers';
import { VendorProfileCard } from '@/components/vendor/VendorProfileCard';
import { DashboardStatTile } from '@/components/vendor/DashboardStatTile';
import { RequestCard } from '@/components/customer/RequestCard';
import { router } from 'expo-router';
import { useCountdown } from '@/hooks/useCountdown';
import { LiveVendorStream } from '@/api/mock/liveVendorRequests';
// import { VendorProfileCard } from '../../src/components/vendor/VendorProfileCard';
// import { DashboardStatTile } from '../../src/components/vendor/DashboardStatTile';
// import { RequestCard } from '../../src/components/customer/RequestCard';
// import { MockAPI } from '../../src/api/mock/handlers';

type TabType = 'pending' | 'active' | 'completed' | 'history';

/**
 * Vendor Dashboard Screen
 * Matches the screenshot design with profile card, stats, and tabs
 */
export default function VendorDashboard() {
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [refreshing, setRefreshing] = useState(false);
    const [vendorProfile, setVendorProfile] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [requests, setRequests] = useState<any[]>([]);
    const [liveRequest, setLiveRequest] = useState(null);
    const { time, reset } = useCountdown(20);

    useEffect(() => {
        loadDashboardData();
    }, []);

    useEffect(() => {
        LiveVendorStream.start();
        LiveVendorStream.subscribe(onNewIncomingRequest);

        return () => LiveVendorStream.unsubscribe(onNewIncomingRequest);
    }, []);

    const onNewIncomingRequest = (req) => {
        setLiveRequest(req);
        reset(); // restart timer
    };


    const loadDashboardData = async () => {
        try {
            const [profile, vendorStats, allRequests] = await Promise.all([
                MockAPI.getVendorProfile('vendor_1'),
                MockAPI.getVendorStats('vendor_1'),
                MockAPI.getRequests({ role: 'vendor' }),
            ]);

            setVendorProfile(profile);
            setStats(vendorStats);
            setRequests(allRequests);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadDashboardData();
        setRefreshing(false);
    };

    const handleToggleAvailability = async () => {
        try {
            const updated = await MockAPI.updateVendorAvailability(
                vendorProfile.id,
                !vendorProfile.isOnline
            );
            setVendorProfile(updated);
        } catch (error) {
            console.error('Error toggling availability:', error);
        }
    };

    const getFilteredRequests = () => {
        switch (activeTab) {
            case 'pending':
                return requests.filter(r => r.status === 'awaiting_proposals' || r.status === 'proposals_received');
            case 'active':
                return requests.filter(r => r.status === 'in_progress');
            case 'completed':
                return requests.filter(r => r.status === 'completed');
            default:
                return requests;
        }
    };

    if (!vendorProfile || !stats) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Dashboard</Text>
                    <Text style={styles.headerSubtitle}>Manage your services</Text>
                </View>

                {/* Profile Card */}
                <VendorProfileCard
                    vendor={vendorProfile}
                    onToggleAvailability={handleToggleAvailability}
                />

                {/* Stats Row */}
                <View style={styles.statsContainer}>
                    <DashboardStatTile
                        icon={<ClipboardList size={20} color="#2563EB" />}
                        label="Pending Requests"
                        value={stats.pendingRequests}
                        color="#2563EB"
                    />
                    <DashboardStatTile
                        icon={<Briefcase size={20} color="#8B5CF6" />}
                        label="Active Jobs"
                        value={stats.activeJobs}
                        color="#8B5CF6"
                    />
                </View>

                <View style={styles.statsContainer}>
                    <DashboardStatTile
                        icon={<TrendingUp size={20} color="#10B981" />}
                        label="Response Rate"
                        value={`${stats.responseRate}%`}
                        subtitle="Keep it high!"
                        color="#10B981"
                    />
                    <DashboardStatTile
                        icon={<Calendar size={20} color="#F59E0B" />}
                        label="This Month"
                        value={stats.monthJobs}
                        subtitle="Jobs completed"
                        color="#F59E0B"
                    />
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsContent}
                    >
                        {(['pending', 'active', 'completed', 'history'] as TabType[]).map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[
                                    styles.tab,
                                    activeTab === tab && styles.tabActive,
                                ]}
                                onPress={() => setActiveTab(tab)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.tabText,
                                        activeTab === tab && styles.tabTextActive,
                                    ]}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Requests List */}
                <View style={styles.requestsContainer}>
                    {getFilteredRequests().length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>
                                No {activeTab} requests
                            </Text>
                            <Text style={styles.emptyStateSubtext}>
                                {activeTab === 'pending'
                                    ? "New requests will appear here"
                                    : `You don't have any ${activeTab} jobs`}
                            </Text>
                        </View>
                    ) : (
                        getFilteredRequests().map((request) => (
                            <RequestCard
                                key={request.id}
                                request={request}
                                onPress={() => {
                                    // Navigate to request detail
                                    // router.push({ pathname: "/(vendor)/(dashboard)/request-details", params: request.id })
                                    console.log('Navigate to request:', request.id);
                                }}
                            />
                        ))
                    )}
                </View>

                {/* Quick Actions */}
                {/* LIVE REQUEST incoming view */}
                {activeTab === "pending" && liveRequest && (
                    <View style={styles.liveCard}>
                        <Text style={styles.liveTitle}>New Request Available</Text>

                        <Text style={styles.liveService}>{liveRequest?.serviceType}</Text>
                        <Text style={styles.liveIssue}>{liveRequest?.issue}</Text>

                        <View style={styles.row}>
                            <MapPin size={16} color="#2563EB" />
                            <Text style={styles.address}>{liveRequest?.location}</Text>
                        </View>

                        <Text style={styles.timerText}>
                            Expires in {time}s
                        </Text>

                        <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={() => console.log("Accepted:", liveRequest.id)}
                        >
                            <Text style={styles.acceptText}>Send Quote</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* {activeTab === 'pending' && getFilteredRequests().length > 0 && (
                    <View style={styles.quickActionsContainer}>
                        <TouchableOpacity style={styles.quickActionButton}>
                            <Text style={styles.quickActionText}>
                                Send Proposals to All
                            </Text>
                        </TouchableOpacity>
                    </View>
                )} */}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
    },
    header: {
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 15,
        color: '#6B7280',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    tabsContainer: {
        marginTop: 24,
        marginBottom: 16,
    },
    tabsContent: {
        gap: 8,
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tabActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    requestsContainer: {
        marginTop: 8,
    },
    emptyState: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    quickActionsContainer: {
        marginTop: 16,
    },
    quickActionButton: {
        backgroundColor: '#2563EB',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    quickActionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    liveCard: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#2563EB20",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    liveTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#2563EB",
        marginBottom: 8,
    },
    liveService: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111",
    },
    liveIssue: {
        fontSize: 14,
        color: "#6B7280",
        marginVertical: 4,
    },
    timerText: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: "700",
        color: "#EF4444",
    },
    acceptButton: {
        marginTop: 14,
        backgroundColor: "#2563EB",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    acceptText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },


});



// // app/(vendor)/dashboard.tsx
// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   RefreshControl,
//   SafeAreaView,
// } from 'react-native';
// import {
//   ClipboardList,
//   Briefcase,
//   TrendingUp,
//   Calendar,
// } from 'lucide-react-native';
// import { VendorProfileCard } from '../../src/components/vendor/VendorProfileCard';
// import { DashboardStatTile } from '../../src/components/vendor/DashboardStatTile';
// import { RequestCard } from '../../src/components/customer/RequestCard';
// import { MockAPI } from '../../src/api/mock/handlers';

// type TabType = 'pending' | 'active' | 'completed' | 'history';

// /**
//  * Vendor Dashboard Screen
//  * Matches the screenshot design with profile card, stats, and tabs
//  */
// export default function VendorDashboard() {
//   const [activeTab, setActiveTab] = useState<TabType>('pending');
//   const [refreshing, setRefreshing] = useState(false);
//   const [vendorProfile, setVendorProfile] = useState<any>(null);
//   const [stats, setStats] = useState<any>(null);
//   const [requests, setRequests] = useState<any[]>([]);

//   useEffect(() => {
//     loadDashboardData();
//   }, []);

//   const loadDashboardData = async () => {
//     try {
//       const [profile, vendorStats, allRequests] = await Promise.all([
//         MockAPI.getVendorProfile('vendor_1'),
//         MockAPI.getVendorStats('vendor_1'),
//         MockAPI.getRequests({ role: 'vendor' }),
//       ]);

//       setVendorProfile(profile);
//       setStats(vendorStats);
//       setRequests(allRequests);
//     } catch (error) {
//       console.error('Error loading dashboard:', error);
//     }
//   };

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await loadDashboardData();
//     setRefreshing(false);
//   };

//   const handleToggleAvailability = async () => {
//     try {
//       const updated = await MockAPI.updateVendorAvailability(
//         vendorProfile.id,
//         !vendorProfile.isOnline
//       );
//       setVendorProfile(updated);
//     } catch (error) {
//       console.error('Error toggling availability:', error);
//     }
//   };

//   const getFilteredRequests = () => {
//     switch (activeTab) {
//       case 'pending':
//         return requests.filter(r => r.status === 'awaiting_proposals' || r.status === 'proposals_received');
//       case 'active':
//         return requests.filter(r => r.status === 'in_progress');
//       case 'completed':
//         return requests.filter(r => r.status === 'completed');
//       default:
//         return requests;
//     }
//   };

//   if (!vendorProfile || !stats) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <View style={styles.loadingContainer}>
//           <Text style={styles.loadingText}>Loading...</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={styles.scrollContent}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//       >
//         {/* Header */}
//         <View style={styles.header}>
//           <Text style={styles.headerTitle}>Dashboard</Text>
//           <Text style={styles.headerSubtitle}>Manage your services</Text>
//         </View>

//         {/* Profile Card */}
//         <VendorProfileCard
//           vendor={vendorProfile}
//           onToggleAvailability={handleToggleAvailability}
//         />

//         {/* Stats Row */}
//         <View style={styles.statsContainer}>
//           <DashboardStatTile
//             icon={<ClipboardList size={20} color="#2563EB" />}
//             label="Pending Requests"
//             value={stats.pendingRequests}
//             color="#2563EB"
//           />
//           <DashboardStatTile
//             icon={<Briefcase size={20} color="#8B5CF6" />}
//             label="Active Jobs"
//             value={stats.activeJobs}
//             color="#8B5CF6"
//           />
//         </View>

//         <View style={styles.statsContainer}>
//           <DashboardStatTile
//             icon={<TrendingUp size={20} color="#10B981" />}
//             label="Response Rate"
//             value={`${stats.responseRate}%`}
//             subtitle="Keep it high!"
//             color="#10B981"
//           />
//           <DashboardStatTile
//             icon={<Calendar size={20} color="#F59E0B" />}
//             label="This Month"
//             value={stats.monthJobs}
//             subtitle="Jobs completed"
//             color="#F59E0B"
//           />
//         </View>

//         {/* Tabs */}
//         <View style={styles.tabsContainer}>
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={styles.tabsContent}
//           >
//             {(['pending', 'active', 'completed', 'history'] as TabType[]).map((tab) => (
//               <TouchableOpacity
//                 key={tab}
//                 style={[
//                   styles.tab,
//                   activeTab === tab && styles.tabActive,
//                 ]}
//                 onPress={() => setActiveTab(tab)}
//                 activeOpacity={0.7}
//               >
//                 <Text
//                   style={[
//                     styles.tabText,
//                     activeTab === tab && styles.tabTextActive,
//                   ]}
//                 >
//                   {tab.charAt(0).toUpperCase() + tab.slice(1)}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </ScrollView>
//         </View>

//         {/* Requests List */}
//         <View style={styles.requestsContainer}>
//           {getFilteredRequests().length === 0 ? (
//             <View style={styles.emptyState}>
//               <Text style={styles.emptyStateText}>
//                 No {activeTab} requests
//               </Text>
//               <Text style={styles.emptyStateSubtext}>
//                 {activeTab === 'pending'
//                   ? "New requests will appear here"
//                   : `You don't have any ${activeTab} jobs`}
//               </Text>
//             </View>
//           ) : (
//             getFilteredRequests().map((request) => (
//               <RequestCard
//                 key={request.id}
//                 request={request}
//                 onPress={() => {
//                   // Navigate to request detail
//                   console.log('Navigate to request:', request.id);
//                 }}
//               />
//             ))
//           )}
//         </View>

//         {/* Quick Actions */}
//         {activeTab === 'pending' && getFilteredRequests().length > 0 && (
//           <View style={styles.quickActionsContainer}>
//             <TouchableOpacity style={styles.quickActionButton}>
//               <Text style={styles.quickActionText}>
//                 Send Proposals to All
//               </Text>
//             </TouchableOpacity>
//           </View>
//         )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F9FAFB',
//   },
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     padding: 16,
//     paddingBottom: 32,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     fontSize: 16,
//     color: '#6B7280',
//   },
//   header: {
//     marginBottom: 20,
//   },
//   headerTitle: {
//     fontSize: 28,
//     fontWeight: '700',
//     color: '#111827',
//     marginBottom: 4,
//   },
//   headerSubtitle: {
//     fontSize: 15,
//     color: '#6B7280',
//   },
//   statsContainer: {
//     flexDirection: 'row',
//     gap: 12,
//     marginTop: 12,
//   },
//   tabsContainer: {
//     marginTop: 24,
//     marginBottom: 16,
//   },
//   tabsContent: {
//     gap: 8,
//   },
//   tab: {
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     borderRadius: 20,
//     backgroundColor: '#FFFFFF',
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//   },
//   tabActive: {
//     backgroundColor: '#2563EB',
//     borderColor: '#2563EB',
//   },
//   tabText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#6B7280',
//   },
//   tabTextActive: {
//     color: '#FFFFFF',
//   },
//   requestsContainer: {
//     marginTop: 8,
//   },
//   emptyState: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 16,
//     padding: 40,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 8,
//     elevation: 2,
//   },
//   emptyStateText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#374151',
//     marginBottom: 8,
//   },
//   emptyStateSubtext: {
//     fontSize: 14,
//     color: '#9CA3AF',
//     textAlign: 'center',
//   },
//   quickActionsContainer: {
//     marginTop: 16,
//   },
//   quickActionButton: {
//     backgroundColor: '#2563EB',
//     borderRadius: 12,
//     padding: 16,
//     alignItems: 'center',
//     shadowColor: '#2563EB',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   quickActionText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#FFFFFF',
//   },
// });

// // src/components/forms/CreateRequestForm.tsx
// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import { useForm, Controller } from 'react-hook-form';
// import { yupResolver } from '@hookform/resolvers/yup';
// import * as yup from 'yup';
// import { Calendar, MapPin, DollarSign, Camera } from 'lucide-react-native';
// import * as ImagePicker from 'expo-image-picker';

// const requestSchema = yup.object({
//   serviceType: yup.string().required('Service type is required'),
//   title: yup.string().required('Title is required').min(5, 'Title too short'),
//   description: yup.string().required('Description is required').min(20, 'Description too short'),
//   preferredDate: yup.date().required('Preferred date is required').min(new Date(), 'Date must be in future'),
//   estimatedBudget: yup.number().positive('Budget must be positive').nullable(),
// });

// interface CreateRequestFormProps {
//   onSubmit: (data: any) => void;
//   onCancel: () => void;
// }

// export const CreateRequestForm: React.FC<CreateRequestFormProps> = ({
//   onSubmit,
//   onCancel,
// }) => {
//   const [photos, setPhotos] = useState<string[]>([]);
//   const [selectedAddress, setSelectedAddress] = useState<any>(null);

//   const {
//     control,
//     handleSubmit,
//     formState: { errors, isSubmitting },
//   } = useForm({
//     resolver: yupResolver(requestSchema),
//     defaultValues: {
//       serviceType: '',
//       title: '',
//       description: '',
//       preferredDate: new Date(),
//       estimatedBudget: null,
//     },
//   });

//   const pickImage = async () => {
//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ImagePicker.MediaTypeOptions.Images,
//       allowsMultipleSelection: true,
//       quality: 0.8,
//     });

//     if (!result.canceled) {
//       const uris = result.assets.map(asset => asset.uri);
//       setPhotos([...photos, ...uris]);
//     }
//   };

//   const onSubmitForm = (data: any) => {
//     onSubmit({
//       ...data,
//       photos,
//       address: selectedAddress || {
//         street: '123 Main St',
//         city: 'San Francisco',
//         state: 'CA',
//         zipCode: '94102',
//         country: 'US',
//         latitude: 37.7749,
//         longitude: -122.4194,
//       },
//     });
//   };

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={styles.content}>
//       <Text style={styles.title}>Create Service Request</Text>

//       {/* Service Type */}
//       <View style={styles.fieldContainer}>
//         <Text style={styles.label}>Service Type *</Text>
//         <Controller
//           control={control}
//           name="serviceType"
//           render={({ field: { onChange, value } }) => (
//             <TextInput
//               style={[styles.input, errors.serviceType && styles.inputError]}
//               placeholder="e.g., AC Repair, Plumbing"
//               value={value}
//               onChangeText={onChange}
//             />
//           )}
//         />
//         {errors.serviceType && (
//           <Text style={styles.errorText}>{errors.serviceType.message}</Text>
//         )}
//       </View>

//       {/* Title */}
//       <View style={styles.fieldContainer}>
//         <Text style={styles.label}>Title *</Text>
//         <Controller
//           control={control}
//           name="title"
//           render={({ field: { onChange, value } }) => (
//             <TextInput
//               style={[styles.input, errors.title && styles.inputError]}
//               placeholder="Brief description of the issue"
//               value={value}
//               onChangeText={onChange}
//             />
//           )}
//         />
//         {errors.title && (
//           <Text style={styles.errorText}>{errors.title.message}</Text>
//         )}
//       </View>

//       {/* Description */}
//       <View style={styles.fieldContainer}>
//         <Text style={styles.label}>Description *</Text>
//         <Controller
//           control={control}
//           name="description"
//           render={({ field: { onChange, value } }) => (
//             <TextInput
//               style={[styles.input, styles.textArea, errors.description && styles.inputError]}
//               placeholder="Detailed description of what needs to be done"
//               value={value}
//               onChangeText={onChange}
//               multiline
//               numberOfLines={4}
//             />
//           )}
//         />
//         {errors.description && (
//           <Text style={styles.errorText}>{errors.description.message}</Text>
//         )}
//       </View>

//       {/* Estimated Budget */}
//       <View style={styles.fieldContainer}>
//         <Text style={styles.label}>Estimated Budget (Optional)</Text>
//         <Controller
//           control={control}
//           name="estimatedBudget"
//           render={({ field: { onChange, value } }) => (
//             <View style={styles.inputWithIcon}>
//               <DollarSign size={20} color="#6B7280" style={styles.inputIcon} />
//               <TextInput
//                 style={styles.input}
//                 placeholder="0.00"
//                 value={value?.toString() || ''}
//                 onChangeText={(text) => onChange(text ? parseFloat(text) : null)}
//                 keyboardType="decimal-pad"
//               />
//             </View>
//           )}
//         />
//       </View>

//       {/* Location */}
//       <View style={styles.fieldContainer}>
//         <Text style={styles.label}>Service Location *</Text>
//         <TouchableOpacity style={styles.locationButton} onPress={() => {}}>
//           <MapPin size={20} color="#2563EB" />
//           <Text style={styles.locationButtonText}>
//             {selectedAddress ? selectedAddress.street : 'Select location on map'}
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* Photos */}
//       <View style={styles.fieldContainer}>
//         <Text style={styles.label}>Photos (Optional)</Text>
//         <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
//           <Camera size={24} color="#2563EB" />
//           <Text style={styles.photoButtonText}>Add Photos</Text>
//         </TouchableOpacity>
//         {photos.length > 0 && (
//           <View style={styles.photoGrid}>
//             {photos.map((uri, index) => (
//               <Image key={index} source={{ uri }} style={styles.photoThumbnail} />
//             ))}
//           </View>
//         )}
//       </View>

//       {/* Actions */}
//       <View style={styles.actions}>
//         <TouchableOpacity
//           style={[styles.button, styles.cancelButton]}
//           onPress={onCancel}
//         >
//           <Text style={styles.cancelButtonText}>Cancel</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.button, styles.submitButton]}
//           onPress={handleSubmit(onSubmitForm)}
//           disabled={isSubmitting}
//         >
//           <Text style={styles.submitButtonText}>
//             {isSubmitting ? 'Creating...' : 'Create Request'}
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F9FAFB',
//   },
//   content: {
//     padding: 16,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#111827',
//     marginBottom: 24,
//   },
//   fieldContainer: {
//     marginBottom: 20,
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#374151',
//     marginBottom: 8,
//   },
//   input: {
//     backgroundColor: '#FFFFFF',
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//     borderRadius: 12,
//     padding: 14,
//     fontSize: 15,
//     color: '#111827',
//   },
//   inputError: {
//     borderColor: '#EF4444',
//   },
//   textArea: {
//     height: 100,
//     textAlignVertical: 'top',
//   },
//   inputWithIcon: {
//     position: 'relative',
//   },
//   inputIcon: {
//     position: 'absolute',
//     left: 14,
//     top: 14,
//     zIndex: 1,
//   },
//   locationButton: {
//     backgroundColor: '#FFFFFF',
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//     borderRadius: 12,
//     padding: 14,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   locationButtonText: {
//     fontSize: 15,
//     color: '#374151',
//   },
//   photoButton: {
//     backgroundColor: '#FFFFFF',
//     borderWidth: 2,
//     borderColor: '#2563EB',
//     borderStyle: 'dashed',
//     borderRadius: 12,
//     padding: 24,
//     alignItems: 'center',
//     gap: 8,
//   },
//   photoButtonText: {
//     fontSize: 15,
//     fontWeight: '600',
//     color: '#2563EB',
//   },
//   photoGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//     marginTop: 12,
//   },
//   photoThumbnail: {
//     width: 80,
//     height: 80,
//     borderRadius: 8,
//   },
//   errorText: {
//     fontSize: 13,
//     color: '#EF4444',
//     marginTop: 4,
//   },
//   actions: {
//     flexDirection: 'row',
//     gap: 12,
//     marginTop: 24,
//   },
//   button: {
//     flex: 1,
//     borderRadius: 12,
//     padding: 16,
//     alignItems: 'center',
//   },
//   cancelButton: {
//     backgroundColor: '#FFFFFF',
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//   },
//   cancelButtonText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#374151',
//   },
//   submitButton: {
//     backgroundColor: '#2563EB',
//   },
//   submitButtonText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#FFFFFF',
//   },
// });