// app/(vendor)/_layout.tsx
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import GradientIcon from "@/components/common/GradientIcon";
import { useAppSelector } from "@/hooks/useAppDispatch";
import { useEffect } from "react";


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
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#007AFF",
                tabBarStyle: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: 60 },
            }}
            initialRouteName="(servicerequests)"
        >
            <Tabs.Screen
                name="(servicerequests)"
                options={{
                    title: "Service Requests",
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
    );
}
