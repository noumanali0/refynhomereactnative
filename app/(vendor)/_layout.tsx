// app/(vendor)/_layout.tsx
import { Tabs, useRouter } from "expo-router";
import GradientIcon from "@/components/common/GradientIcon";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { useAppSelector } from "@/hooks/useAppDispatch";
import { useEffect } from "react";
import { moderateScale, verticalScale } from "react-native-size-matters";


export default function VendorTabsLayout() {
    const router = useRouter();
    const { user, vendorOnboardingStatus } = useAppSelector((state) => state.auth);

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
