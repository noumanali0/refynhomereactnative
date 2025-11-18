// app/(customer)/(home)/_layout.tsx
import { Stack } from "expo-router";

export default function CustomerHistoryLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                // headerTitleAlign: "center",
            }}
        >
            <Stack.Screen name="index" options={{ title: "History" }} />
            <Stack.Screen name="service-details" options={{ title: "Service Details" }} />

        </Stack>
    );
}
