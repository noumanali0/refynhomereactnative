// app/(customer)/(home)/_layout.tsx
import { Stack } from "expo-router";

export default function VendorSubscriptionLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                // headerTitleAlign: "center",
            }}
        >
            <Stack.Screen name="index" options={{ title: "Subscriptions" }} />
            {/* <Stack.Screen name="request-detail" options={{ title: "Request Detail" }} /> */}
            {/* <Stack.Screen name="live-offers" options={{ title: "Live Offers" }} /> */}
            {/* <Stack.Screen name="tracking" options={{ title: "Track Vendor" }} /> */}
        </Stack>
    );
}
