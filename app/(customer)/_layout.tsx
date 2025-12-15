// app/(customer)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import GradientIcon from "@/components/common/GradientIcon";
import { moderateScale, verticalScale } from "react-native-size-matters";


export default function CustomerTabsLayout() {
    return (
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
                },
                tabBarLabelStyle: {
                    fontSize: moderateScale(11),
                    fontWeight: '500',
                },
            }}
        >
            <Tabs.Screen
                name="(home)"
                options={{
                    title: "Home",
                    // tabBarIcon: ({ size }) => <GradientIcon name="home" size={size} />,
                    tabBarIcon: ({ focused, size }) => (
                        <GradientIcon
                            name="home"
                            size={size}
                            colors={focused ? ["#2563EB", "#F97316"] : ["#ccc", "#ccc"]}
                        />
                    )
                }}
            />
            <Tabs.Screen
                name="(favorites)"
                options={{
                    title: "Favorites",
                    // tabBarIcon: ({ size }) => <GradientIcon name="heart" size={size} />,
                    tabBarIcon: ({ focused, size }) => (
                        <GradientIcon
                            name="heart"
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
