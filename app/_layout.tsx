import 'react-native-gesture-handler';
import '../global.css';
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { Provider, useDispatch } from "react-redux";
// import { PersistGate } from "redux-persist/integration/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { store } from "@/store";
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { StyleSheet } from 'react-native';
import { useFonts } from "expo-font";
import { FONTS } from '@/constants/fonts';
import * as SplashScreen from "expo-splash-screen";
import { restoreSession } from '@/store/slices/authSlice';
import { ToastProvider } from '@/contexts/ToastContext';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
SplashScreen.preventAutoHideAsync();
// import { useAppSelector } from "@/store/hooks";
// import LoadingSpinner from "@/components/common/LoadingSpinner";
// import SocketManager from "@/socket/socketManager";

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { isAuthenticated, user, isLoading, vendorOnboardingStatus } = useAppSelector((s) => s.auth);
  const [isInitialized, setIsInitialized] = useState(false);

  const role = user?.role;
  const userId = user?.id;
  const isVendor = role === 'vendor';
  const vendorNeedsOnboarding = isVendor && vendorOnboardingStatus === 'in_progress';
  const vendorPendingVerification = isVendor && vendorOnboardingStatus === 'pending_verification';
  const vendorVerified = isVendor && user?.vendorProfile?.verified === true;

  // Restore session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await dispatch(restoreSession()).unwrap();
      } catch (error) {
        // No session to restore, user needs to login
        console.log('No session to restore');
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    // Wait for initialization and loading to complete
    if (!isInitialized || isLoading) return;

    const inAuth = segments[0] === "(auth)";
    const inCustomer = segments[0] === "(customer)";
    const inVendor = segments[0] === "(vendor)";
    const inShared = segments[0] === "(shared)";
    const onVendorSetup = inShared && (segments as string[])[1] === "vendor-setup";
    const onPendingVerification = inShared && (segments as string[])[1] === "pending-verification";

    // Add a small delay to prevent navigation conflicts
    const redirectTimeout = setTimeout(() => {
      if (!isAuthenticated && !inAuth) {
        // Not authenticated and not on auth screen -> redirect to login
        router.replace("/(auth)/login");
      } else if (isAuthenticated && role) {
        // Handle vendor onboarding status
        if (isVendor) {
          if (vendorNeedsOnboarding && !onVendorSetup) {
            // Vendor needs to complete onboarding
            router.replace("/(shared)/vendor-setup");
            return;
          } else if (vendorPendingVerification && !onPendingVerification) {
            // Vendor is waiting for admin approval
            console.log("this par running...!!")
            router.replace("/(shared)/pending-verification");
            return;
          } else if (!vendorVerified && !vendorNeedsOnboarding && !vendorPendingVerification && inVendor) {
            // Vendor not verified but trying to access dashboard
            console.log("this par running...!!")
            router.replace("/(shared)/pending-verification");
            return;
          }
        }

        // Handle normal authenticated navigation
        if (inAuth) {
          // Authenticated but still on auth screen -> redirect to appropriate home
          if (role === "customer") {
            router.replace("/(customer)/(home)");
          } else if (role === "vendor" && vendorVerified) {
            router.replace("/(vendor)/(servicerequests)");
          }
        } else if (!inAuth && !inCustomer && !inVendor && !inShared) {
          // Authenticated but not in any valid segment (e.g., on root after session restore)
          if (role === "customer") {
            router.replace("/(customer)/(home)");
          } else if (role === "vendor" && vendorVerified) {
            router.replace("/(vendor)/(servicerequests)");
          } else if (role === "vendor" && vendorPendingVerification) {
            router.replace("/(shared)/pending-verification");
          } else if (role === "vendor" && vendorNeedsOnboarding) {
            router.replace("/(shared)/vendor-setup");
          }
        } else if (role === "customer" && inVendor) {
          // Customer trying to access vendor module
          router.replace("/(customer)/(home)");
        } else if (role === "vendor" && vendorVerified && inCustomer) {
          // Vendor trying to access customer module
          router.replace("/(vendor)/(servicerequests)");
        }
      }
    }, 100);

    return () => clearTimeout(redirectTimeout);
  }, [isAuthenticated, role, segments, isLoading, isInitialized]);

  // TODO: Uncomment when socket implementation is ready
  // useEffect(() => {
  //   if (isAuthenticated && userId && role) {
  //     const socket = SocketManager.getInstance();
  //     socket.connect(userId, role);
  //     return () => socket.disconnect();
  //   }
  // }, [isAuthenticated, userId, role]);

  return <Slot />;
}

export default function RootLayout() {

  const [loaded] = useFonts({
    [FONTS.regular]: require("../assets/fonts/Poppins-Regular.ttf"),
    [FONTS.extrabold]: require("../assets/fonts/Poppins-ExtraBold.ttf"),
    [FONTS.medium]: require("../assets/fonts/Poppins-Medium.ttf"),
    [FONTS.semibold]: require("../assets/fonts/Poppins-SemiBold.ttf"),
    [FONTS.bold]: require("../assets/fonts/Poppins-Bold.ttf"),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;


  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={{ backgroundColor: "black" }} edges={["top"]} />
      <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
        <Provider store={store}>
          <ToastProvider>
            {/* <PersistGate loading={<LoadingSpinner />} persistor={persistor}> */}
            <GestureHandlerRootView style={{ flex: 1 }}>
              <BottomSheetModalProvider>
                {/* <SafeAreaProvider> */}
                <RootLayoutNav />
                {/* </SafeAreaProvider> */}
              </BottomSheetModalProvider>
            </GestureHandlerRootView>
            {/* </PersistGate> */}
          </ToastProvider>
        </Provider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}


const styles = StyleSheet.create({
  safe: {
    flex: 1,
    // backgroundColor: "white",
  },
});



// import { Stack } from 'expo-router';
// import { Provider } from 'react-redux';
// import { store } from '../src/store';
// import { StatusBar } from 'expo-status-bar';
// import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
// import { StyleSheet } from 'react-native';

// export default function RootLayout() {
//   return (
//     <SafeAreaProvider>
//       <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
//         <Provider store={store}>
//           <StatusBar style="light" />
//           <Stack
//             screenOptions={{
//               headerShown: false,
//             }}
//           >
//             <Stack.Screen name="index" />
//             <Stack.Screen name="customer/live-offers" />
//             <Stack.Screen name="customer/services" />
//             <Stack.Screen name="customer/create" />
//             <Stack.Screen name="auth/otp-login" />
//             <Stack.Screen name="auth/role-selection" />
//             <Stack.Screen name="auth/customer-setup" />
//             <Stack.Screen name="auth/vendor-setup" />
//             <Stack.Screen name="customer/home" />
//             <Stack.Screen name="customer/vendor-detail" />
//             <Stack.Screen name="customer/my-bookings" />
//             <Stack.Screen name="customer/favorites" />
//             <Stack.Screen name="vendor/dashboard" />
//             <Stack.Screen name="booking/service-selection" />
//             <Stack.Screen name="booking/vendor-list" />
//             <Stack.Screen name="booking/booking-details" />
//             <Stack.Screen name="booking/booking-success" />
//             <Stack.Screen name="chat" />
//           </Stack>
//         </Provider>
//       </SafeAreaView>
//     </SafeAreaProvider>
//   );
// }


// const styles = StyleSheet.create({
//   safe: {
//     flex: 1,
//     backgroundColor: "#181928",
//   },
// });