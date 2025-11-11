// src/utils/notifications.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// 1. Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,    // shows banner in foreground
        shouldShowList: true,      // optionally show in notification list
    }),
});

export async function setupPushNotifications(): Promise<string | null> {
    let token: string | null = null;

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== "granted") {
            console.warn("Push notification permission not granted");
            return null;
        }

        const expoTokenResponse = await Notifications.getExpoPushTokenAsync();
        token = expoTokenResponse.data;
        console.log("✅ Expo Push Token:", token);
    } else {
        console.warn("Must use physical device for Push Notifications");
    }

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.HIGH,
            sound: "default",
            enableVibrate: true,
        });
    }

    return token;
}

export async function sendLocalNotification(title: string, body: string, data: Record<string, any> = {}) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // immediate
    });
}
