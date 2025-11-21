// app/(customer)/(home)/_layout.tsx
import { Stack } from "expo-router";

export default function VendorDashboardLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                // headerTitleAlign: "center",
            }}
        >
            <Stack.Screen name="index" options={{ title: "Service Requests" }} />
            <Stack.Screen name="request-details" options={{ title: "Request Detail" }} />
            {/* <Stack.Screen name="live-offers" options={{ title: "Live Offers" }} /> */}
            {/* <Stack.Screen name="tracking" options={{ title: "Track Vendor" }} /> */}
        </Stack>
    );
}
