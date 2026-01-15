// app/(vendor)/(servicerequests)/_layout.tsx
import { Stack } from "expo-router";

export default function VendorServiceRequestsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="index" options={{ title: "Service Requests" }} />
            <Stack.Screen name="request-details" options={{ title: "Request Detail" }} />
            <Stack.Screen name="websocket-request-details" options={{ title: "Request Detail" }} />
        </Stack>
    );
}
