// src/utils/notifications.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
// Note: store and registerPushToken are imported lazily inside setupAndRegisterPushToken
// to avoid circular import issues with Redux store initialization

// ✅ Maintain in-memory map of offerId → notificationId
const activeNotifications: Record<string, string> = {};

// ✅ Maintain in-memory map of requestId → notificationId for service requests
const activeServiceRequestNotifications: Record<string, string> = {};

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
    // Get Expo push token
    let pushToken: string | null = null;

    if (Device.isDevice) {
        try {
            console.log("📱 Getting Expo push token...");
            const tokenResponse = await Notifications.getExpoPushTokenAsync({
                projectId: "7a3ee123-d1a2-450e-abec-70c92c577477",
            });
            pushToken = tokenResponse.data;
            console.log("✅ Expo Push Token:", pushToken);
        } catch (error) {
            console.error("❌ Failed to get Expo push token:", error);
            return null;
        }
    } else {
        console.log("⚠️ Not a physical device, skipping push token");
    }

    token = pushToken;

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

// ✅ 2b. Setup push notifications and register token with backend
// Call this after successful login to register the push token for device session tracking
export async function setupAndRegisterPushToken(): Promise<string | null> {
    try {
        // Get the push token
        const token = await setupPushNotifications();

        if (!token) {
            console.log("📱 No push token available (simulator or permission denied)");
            return null;
        }

        // Register push token with backend for device session tracking
        try {
            const { store } = await import("@/store");
            const { registerPushToken } = await import("@/store/slices/authSlice");
            await store.dispatch(registerPushToken({ pushToken: token })).unwrap();
            console.log("✅ Push token registered with backend");
        } catch (error) {
            console.warn("⚠️ Failed to register push token with backend:", error);
        }

        return token;
    } catch (error) {
        console.warn("⚠️ Failed to setup push notifications:", error);
        return null;
    }
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

// ✅ 7. Send service request notification & store ID for later removal
export async function sendServiceRequestNotification(request: {
    id: number;
    category: string;
    title: string;
    address: string;
}) {
    try {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: "🔔 New Service Request!",
                body: `${request.category} • ${request.title}\n${request.address}`,
                sound: "default",
                priority: Notifications.AndroidNotificationPriority.HIGH,
                data: { requestId: request.id, type: 'service_request' },
            },
            trigger: null,
        });
        activeServiceRequestNotifications[request.id.toString()] = notificationId;
        console.log(`📩 Notification sent for service request ${request.id}`);
        return notificationId;
    } catch (err) {
        console.warn("❌ Failed to send service request notification:", err);
        return null;
    }
}

// ✅ 8. Remove specific service request notification by requestId
export async function removeServiceRequestNotification(requestId: number | string) {
    try {
        const key = requestId.toString();
        const notifId = activeServiceRequestNotifications[key];
        if (notifId) {
            await Notifications.dismissNotificationAsync(notifId);
            delete activeServiceRequestNotifications[key];
            console.log(`🧹 Removed notification for service request ${requestId}`);
        }
    } catch (err) {
        console.warn("⚠️ Failed to remove service request notification:", err);
    }
}

// ✅ 9. Clear all service request notifications
export async function clearAllServiceRequestNotifications() {
    try {
        const keys = Object.keys(activeServiceRequestNotifications);
        for (const key of keys) {
            const notifId = activeServiceRequestNotifications[key];
            if (notifId) {
                await Notifications.dismissNotificationAsync(notifId);
            }
            delete activeServiceRequestNotifications[key];
        }
        console.log("🧼 Cleared all service request notifications");
    } catch (err) {
        console.warn("⚠️ Failed to clear service request notifications:", err);
    }
}

// ============================================================================
// Vendor Arrival Notifications (100m proximity)
// ============================================================================

// Track arrival notification state to prevent duplicates
const arrivalNotificationSent: Record<string, boolean> = {};

// ✅ 10. Send vendor arrival notification (when vendor is within 100m)
export async function sendVendorArrivalNotification(params: {
    requestId: number;
    vendorName: string;
}): Promise<string | null> {
    const key = params.requestId.toString();

    // Prevent duplicate notifications for the same request
    if (arrivalNotificationSent[key]) {
        console.log(`📍 Arrival notification already sent for request ${params.requestId}`);
        return null;
    }

    try {
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: "🚗 Vendor Arriving!",
                body: `${params.vendorName} is almost at your location`,
                sound: "default",
                priority: Notifications.AndroidNotificationPriority.HIGH,
                data: { requestId: params.requestId, type: 'vendor_arrival' },
            },
            trigger: null,
        });

        arrivalNotificationSent[key] = true;
        console.log(`📍 Arrival notification sent for request ${params.requestId}`);
        return id;
    } catch (err) {
        console.warn("❌ Failed to send vendor arrival notification:", err);
        return null;
    }
}

// ✅ 11. Reset arrival notification state (call when request completes or changes)
export function resetArrivalNotification(requestId: number | string): void {
    const key = requestId.toString();
    delete arrivalNotificationSent[key];
    console.log(`🔄 Reset arrival notification state for request ${requestId}`);
}

// ✅ 12. Check if arrival notification was already sent
export function hasArrivalNotificationBeenSent(requestId: number | string): boolean {
    return !!arrivalNotificationSent[requestId.toString()];
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
