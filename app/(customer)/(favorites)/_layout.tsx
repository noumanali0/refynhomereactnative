// app/(customer)/(home)/_layout.tsx
import { Stack } from "expo-router";

export default function CustomerFavoriteLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                // headerTitleAlign: "center",
            }}
        >
            <Stack.Screen name="index" options={{ title: "Favorite" }} />
            <Stack.Screen name="vendor-detail" options={{ title: "Vendor Details" }} />

        </Stack>
    );
}
