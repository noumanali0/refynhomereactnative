// app/(vendor)/_layout.tsx
import { Tabs, useRouter } from "expo-router";
import GradientIcon from "@/components/common/GradientIcon";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { useAppSelector, useAppDispatch } from "@/hooks/useAppDispatch";
import { useEffect, useRef, useState } from "react";
import { moderateScale, verticalScale } from "react-native-size-matters";
import { View, ActivityIndicator, Alert } from "react-native";
import Text from "@/components/common/Text";
import { COLORS } from "@/constants/colors";
import { syncVendorActiveJobFromBackend } from "@/services/activeJobService";
import { setActiveJob } from "@/store/slices/dispatchSlice";


export default function VendorTabsLayout() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user, vendorOnboardingStatus } = useAppSelector((state) => state.auth);
    const [syncingBackend, setSyncingBackend] = useState(true);
    const hasSyncedBackend = useRef(false);

    // Guard: Only verified vendors can access dashboard
    useEffect(() => {
        if (user?.role === 'vendor') {
            const vendorVerified = user.vendorProfile?.verified === true;
            const needsOnboarding = vendorOnboardingStatus === 'in_progress';
            const pendingVerification = vendorOnboardingStatus === 'pending_verification';

            if (needsOnboarding) {
                router.replace('/(shared)/vendor-setup');
            } else if (pendingVerification || !vendorVerified) {
                router.replace('/(shared)/pending-verification');
            }
        }
    }, [user, vendorOnboardingStatus]);

    // Backend sync for multi-device support
    useEffect(() => {
        const syncActiveJob = async () => {
            // Only sync once per mount
            if (hasSyncedBackend.current) return;
            hasSyncedBackend.current = true;

            try {
                if (__DEV__) {
                    console.log('[VendorLayout] Starting backend sync for active job...');
                }

                const { hasActive, activeJob, jobType, source } = await syncVendorActiveJobFromBackend();

                if (hasActive && activeJob) {
                    // Update Redux state
                    dispatch(setActiveJob({
                        jobId: activeJob.jobId,
                        proposalId: activeJob.proposalId,
                    }));

                    if (__DEV__) {
                        console.log('[VendorLayout] Found active job from', source, ':', activeJob);
                    }

                    // Show alert with option to view job/proposal
                    const title = jobType === 'active' ? 'Active Job Found' : 'Pending Proposal Found';
                    const message = jobType === 'active'
                        ? 'You have an active job in progress. Would you like to view it?'
                        : 'You have a pending proposal waiting for customer response. Would you like to view it?';

                    Alert.alert(
                        title,
                        message,
                        [
                            {
                                text: 'View',
                                onPress: () => {
                                    router.push({
                                        pathname: '/(vendor)/(servicerequests)/websocket-request-details',
                                        params: { requestId: activeJob.jobId.toString() },
                                    });
                                    setSyncingBackend(false);
                                },
                            },
                            {
                                text: 'Stay Here',
                                style: 'cancel',
                                onPress: () => setSyncingBackend(false),
                            },
                        ],
                        { cancelable: false }
                    );
                    return;
                }

                // No active job found
                setSyncingBackend(false);
            } catch (error) {
                if (__DEV__) {
                    console.error('[VendorLayout] Backend sync error:', error);
                }
                setSyncingBackend(false);
            }
        };

        // Only sync if user is verified vendor
        if (user?.role === 'vendor' && user.vendorProfile?.verified) {
            syncActiveJob();
        } else {
            setSyncingBackend(false);
        }
    }, [user, dispatch, router]);

    // Show loading while syncing backend
    if (syncingBackend && user?.role === 'vendor' && user.vendorProfile?.verified) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F9F9' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text type="body" style={{ marginTop: 16, color: COLORS.gray600 }}>
                    Checking for active jobs...
                </Text>
            </View>
        );
    }
    return (
        <ErrorBoundary>
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#2563EB",
                tabBarInactiveTintColor: "#9CA3AF",
                tabBarStyle: {
                    borderTopLeftRadius: moderateScale(20),
                    borderTopRightRadius: moderateScale(20),
                    height: verticalScale(70),
                    paddingBottom: verticalScale(8),
                    paddingTop: verticalScale(8),
                    backgroundColor: '#fff',
                    borderTopWidth: 0,
                    // Shadow for iOS
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -3 },
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                    // Shadow for Android
                    elevation: 10,
                },
                tabBarLabelStyle: {
                    fontSize: moderateScale(11),
                    fontWeight: '500',
                },
                // Set background color behind the tab bar (for rounded corners)
                sceneStyle: { backgroundColor: '#fff' },
            }}
            initialRouteName="(servicerequests)"
        >
            <Tabs.Screen
                name="(servicerequests)"
                options={{
                    title: "Requests",
                    // tabBarIcon: ({ size }) => <GradientIcon name="home" size={size} />,
                    tabBarIcon: ({ focused, size }) => (
                        <GradientIcon
                            name="book"
                            size={size}
                            colors={focused ? ["#2563EB", "#F97316"] : ["#ccc", "#ccc"]}
                        />
                    )
                }}
            />

            <Tabs.Screen
                name="(history)"
                options={{
                    title: "History",
                    // tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
                    tabBarIcon: ({ focused, size }) => (
                        <GradientIcon
                            name="time"
                            size={size}
                            colors={focused ? ["#2563EB", "#F97316"] : ["#ccc", "#ccc"]}
                        />
                    )
                }}
            />
            <Tabs.Screen
                name="(subscriptions)"
                options={{
                    title: "Subscriptions",
                    // tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
                    tabBarIcon: ({ focused, size }) => (
                        <GradientIcon
                            name="trophy"
                            size={size}
                            colors={focused ? ["#2563EB", "#F97316"] : ["#ccc", "#ccc"]}
                        />
                    )
                }}
            />
            <Tabs.Screen
                name="(profile)"
                options={{
                    title: "Profile",
                    // tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
                    tabBarIcon: ({ focused, size }) => (
                        <GradientIcon
                            name="person"
                            size={size}
                            colors={focused ? ["#2563EB", "#F97316"] : ["#ccc", "#ccc"]}
                        />
                    )
                }}
            />
        </Tabs>
        </ErrorBoundary>
    );
}
