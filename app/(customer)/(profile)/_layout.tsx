// app/(customer)/(profile)/_layout.tsx
import { Stack } from "expo-router";

export default function CustomerProfileLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="index" options={{ title: "Profile" }} />
            <Stack.Screen name="edit-profile" options={{ title: "Update Profile" }} />
            <Stack.Screen name="manage-address" options={{ title: "Manage Address" }} />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
        </Stack>
    );
}
