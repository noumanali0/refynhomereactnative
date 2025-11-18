// src/utils/notifications.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// ✅ Maintain in-memory map of offerId → notificationId
const activeNotifications: Record<string, string> = {};

// ✅ 1. Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowAlert: true, // ✅ this replaces deprecated shouldShowBanner/shouldShowList
    }),
});

// ✅ 2. Request permission and get push token
export async function setupPushNotifications(): Promise<string | null> {
    let token: string | null = null;

    if (!Device.isDevice) {
        console.warn("⚠️ Must use a physical device for push notifications");
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        console.warn("🚫 Push notification permission not granted");
        return null;
    }

    const projectId = Device.isDevice
        ? (await Notifications.getExpoPushTokenAsync({
            projectId: "YOUR-EXPO-PROJECT-ID", // 👈 must be set for bare workflow or SDK 51+
        })).data
        : null;

    token = projectId;
    console.log("✅ Expo Push Token:", token);

    // Android channel
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

// ✅ 3. Send offer notification & store ID for later removal
export async function sendOfferNotification(offer: {
    id: string;
    name: string;
    distance: number;
    eta: number;
}) {
    try {
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: "🚀 New Vendor Offer!",
                body: `${offer.name} is ${offer.distance.toFixed(1)} km away — ETA ${offer.eta} mins`,
                sound: "default",
                priority: Notifications.AndroidNotificationPriority.HIGH,
                data: { offerId: offer.id },
            },
            trigger: null,
        });
        activeNotifications[offer.id] = id;
        console.log(`📩 Notification sent for offer ${offer.id}`);
    } catch (err) {
        console.warn("❌ Failed to send offer notification:", err);
    }
}

// ✅ 4. Remove specific notification by offerId
export async function removeOfferNotification(offerId: string) {
    try {
        const notifId = activeNotifications[offerId];
        if (notifId) {
            await Notifications.dismissNotificationAsync(notifId);
            delete activeNotifications[offerId];
            console.log(`🧹 Removed notification for offer ${offerId}`);
        }
    } catch (err) {
        console.warn("⚠️ Failed to remove offer notification:", err);
    }
}

// ✅ 5. Clear all notifications (optional on unmount or logout)
export async function clearAllOfferNotifications() {
    try {
        await Notifications.dismissAllNotificationsAsync();
        Object.keys(activeNotifications).forEach((key) => delete activeNotifications[key]);
        console.log("🧼 Cleared all active offer notifications");
    } catch (err) {
        console.warn("⚠️ Failed to clear notifications:", err);
    }
}

// ✅ 6. (Optional) Generic notification for other features
export async function sendLocalNotification(
    title: string,
    body: string,
    data: Record<string, any> = {}
) {
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


// // src/utils/notifications.ts
// import * as Notifications from "expo-notifications";
// import * as Device from "expo-device";
// import { Platform } from "react-native";

// // 1. Configure how notifications behave when the app is in the foreground
// Notifications.setNotificationHandler({
//     handleNotification: async () => ({
//         shouldPlaySound: true,
//         shouldSetBadge: false,
//         shouldShowBanner: true,    // shows banner in foreground
//         shouldShowList: true,      // optionally show in notification list
//     }),
// });

// export async function setupPushNotifications(): Promise<string | null> {
//     let token: string | null = null;

//     if (Device.isDevice) {
//         const { status: existingStatus } = await Notifications.getPermissionsAsync();
//         let finalStatus = existingStatus;

//         if (existingStatus !== "granted") {
//             const { status } = await Notifications.requestPermissionsAsync();
//             finalStatus = status;
//         }

//         if (finalStatus !== "granted") {
//             console.warn("Push notification permission not granted");
//             return null;
//         }

//         const expoTokenResponse = await Notifications.getExpoPushTokenAsync();
//         token = expoTokenResponse.data;
//         console.log("✅ Expo Push Token:", token);
//     } else {
//         console.warn("Must use physical device for Push Notifications");
//     }

//     if (Platform.OS === "android") {
//         await Notifications.setNotificationChannelAsync("default", {
//             name: "Default",
//             importance: Notifications.AndroidImportance.HIGH,
//             sound: "default",
//             enableVibrate: true,
//         });
//     }

//     return token;
// }

// export async function sendLocalNotification(title: string, body: string, data: Record<string, any> = {}) {
//     await Notifications.scheduleNotificationAsync({
//         content: {
//             title,
//             body,
//             data,
//             sound: "default",
//             priority: Notifications.AndroidNotificationPriority.HIGH,
//         },
//         trigger: null, // immediate
//     });
// }
