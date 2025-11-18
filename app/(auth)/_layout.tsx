// app/(customer)/(home)/_layout.tsx
import { Stack } from "expo-router";

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                // headerTitleAlign: "center",
            }}
        >
            <Stack.Screen name="login" options={{ title: "Login" }} />
            <Stack.Screen name="signup" options={{ title: "Signup" }} />
            <Stack.Screen name="verify-otp" options={{ title: "Verify" }} />
            <Stack.Screen name="role-selection" options={{ title: "Role Selection" }} />
            <Stack.Screen name="customer-setup" options={{ title: "Customer Setup" }} />
            <Stack.Screen name="vendor-setup" options={{ title: "Vendor Setup" }} />
        </Stack>
    );
}
