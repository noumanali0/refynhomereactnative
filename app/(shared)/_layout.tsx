// app/(customer)/(home)/_layout.tsx
import { Stack } from "expo-router";

export default function SharedLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                headerTitleAlign: "center",
            }}
        >
            <Stack.Screen name="chat" options={{ title: "Chat" }} />
            <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
            <Stack.Screen name="reviews" options={{ title: "Reviews" }} />
        </Stack>
    );
}
