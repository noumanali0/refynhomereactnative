// app/(customer)/(home)/_layout.tsx
import { Stack } from "expo-router";

export default function CustomerHomeLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="index" options={{ title: "Home" }} />
            <Stack.Screen name="create" options={{ title: "Create Request" }} />
            <Stack.Screen name="live-offers" options={{ title: "Live Offers" }} />
            <Stack.Screen name="tracking" options={{ title: "Track Vendor" }} />
        </Stack>
    );
}
