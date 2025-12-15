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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { restoreSession, logoutUser } from '@/store/slices/authSlice';
import { ToastProvider } from '@/contexts/ToastContext';
import { initializeApiClient } from '@/api/client';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { connectSocket, disconnectSocket, resetDispatchState, restoreActiveJob } from '@/store/slices/dispatchSlice';
import { defineBackgroundLocationTask } from '@/services/backgroundLocationService';

// Onboarding storage key
const ONBOARDING_COMPLETE_KEY = 'hasSeenOnboarding';

// Initialize background location task at app startup
// MUST be called before any navigation renders
defineBackgroundLocationTask();

SplashScreen.preventAutoHideAsync();
// import { useAppSelector } from "@/store/hooks";
// import LoadingSpinner from "@/components/common/LoadingSpinner";
// import SocketManager from "@/socket/socketManager";

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { isAuthenticated, user, isLoading, vendorOnboardingStatus } = useAppSelector((s) => s.auth);
  const activeJobId = useAppSelector((s) => s.dispatch.activeJobId);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  // Debug: Track activeJobId changes
  useEffect(() => {
    if (__DEV__) {
      console.log('[_layout] activeJobId changed:', activeJobId);
    }
  }, [activeJobId]);

  const role = user?.role;
  const userId = user?.id;
  const isVendor = role === 'vendor';
  const vendorNeedsOnboarding = isVendor && vendorOnboardingStatus === 'in_progress';
  const vendorPendingVerification = isVendor && vendorOnboardingStatus === 'pending_verification';
  const vendorVerified = isVendor && user?.vendorProfile?.verified === true;

  // Restore session and check onboarding status on mount
  useEffect(() => {
    // Initialize API client with logout callback ONCE at startup
    // This sets up token refresh interceptors that will trigger logout on refresh failure
    const logoutCallback = () => {
      if (__DEV__) {
        console.log('[_layout] API client triggered logout (token refresh failed)');
      }
      dispatch(logoutUser());
      router.replace('/(auth)/login');
    };
    initializeApiClient(logoutCallback);

    const initializeApp = async () => {
      try {
        // Check if user has seen onboarding
        const onboardingComplete = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
        setHasSeenOnboarding(onboardingComplete === 'true');

        if (__DEV__) {
          console.log('[_layout] Onboarding complete:', onboardingComplete === 'true');
        }

        // Restore session
        const session = await dispatch(restoreSession()).unwrap();
        if (__DEV__) {
          console.log('[_layout] Session restored:', session?.user?.role);
        }

        // If vendor, restore any active job from storage
        if (session?.user?.role === 'vendor') {
          // Debug: Check SecureStore directly
          if (__DEV__) {
            const SecureStore = require('expo-secure-store');
            const jobId = await SecureStore.getItemAsync('vendor_active_job_id');
            const proposalId = await SecureStore.getItemAsync('vendor_active_proposal_id');
            const status = await SecureStore.getItemAsync('vendor_proposal_status');
            console.log('[_layout] SecureStore raw values:', { jobId, proposalId, status });
          }

          const restoredJob = await dispatch(restoreActiveJob()).unwrap();
          if (__DEV__) {
            console.log('[_layout] Restored active job:', restoredJob);
          }
        }
      } catch (error) {
        // No session to restore, user needs to login
        console.log('No session to restore');
      } finally {
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // Handle navigation based on auth state and onboarding status
  useEffect(() => {
    // Wait for initialization and loading to complete
    if (!isInitialized || isLoading || hasSeenOnboarding === null) return;

    if (__DEV__) {
      console.log('[_layout] Navigation effect running:', {
        isAuthenticated,
        role,
        activeJobId,
        vendorVerified,
        hasSeenOnboarding,
        segments: segments.join('/'),
      });
    }

    const inAuth = segments[0] === "(auth)";
    const inCustomer = segments[0] === "(customer)";
    const inVendor = segments[0] === "(vendor)";
    const inShared = segments[0] === "(shared)";
    const inOnboarding = segments[0] === "(onboarding)";
    const onVendorSetup = inShared && (segments as string[])[1] === "vendor-setup";
    const onPendingVerification = inShared && (segments as string[])[1] === "pending-verification";

    // Add a small delay to prevent navigation conflicts
    const redirectTimeout = setTimeout(async () => {
      // First check: If user hasn't seen onboarding and is not authenticated, show onboarding
      // Re-check AsyncStorage in case onboarding was just completed
      if (!hasSeenOnboarding && !isAuthenticated && !inOnboarding) {
        const freshCheck = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
        if (freshCheck === 'true') {
          // Onboarding was completed, update state and go to login
          setHasSeenOnboarding(true);
          router.replace("/(auth)/login");
          return;
        }
        router.replace("/(onboarding)");
        return;
      }

      if (!isAuthenticated && !inAuth && !inOnboarding) {
        // Not authenticated and not on auth/onboarding screen -> redirect to login
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
            // If vendor has active job, redirect directly to that job's details
            if (activeJobId) {
              router.replace({
                pathname: "/(vendor)/(servicerequests)/websocket-request-details",
                params: { id: activeJobId.toString() },
              } as any);
            } else {
              router.replace("/(vendor)/(servicerequests)");
            }
          }
        } else if (!inAuth && !inCustomer && !inVendor && !inShared) {
          // Authenticated but not in any valid segment (e.g., on root after session restore)
          if (role === "customer") {
            router.replace("/(customer)/(home)");
          } else if (role === "vendor" && vendorVerified) {
            // If vendor has active job, redirect directly to that job's details
            if (activeJobId) {
              router.replace({
                pathname: "/(vendor)/(servicerequests)/websocket-request-details",
                params: { id: activeJobId.toString() },
              } as any);
            } else {
              router.replace("/(vendor)/(servicerequests)");
            }
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
        // NOTE: Removed forced redirect to active job when vendor is in vendor section
        // This was causing tabs to not switch - vendor should be able to navigate freely
        // The initial redirect on app startup is handled above in the !inAuth && !inCustomer... block
      }
    }, 100);

    return () => clearTimeout(redirectTimeout);
  }, [isAuthenticated, role, segments, isLoading, isInitialized, activeJobId, hasSeenOnboarding]);

  // WebSocket connection management
  useEffect(() => {
    if (isAuthenticated && userId && role) {
      // Connect to WebSocket when authenticated
      dispatch(connectSocket());

      return () => {
        // Disconnect and reset state on unmount
        dispatch(disconnectSocket());
        dispatch(resetDispatchState());
      };
    } else if (!isAuthenticated) {
      // Reset dispatch state when logged out
      dispatch(resetDispatchState());
    }
  }, [isAuthenticated, userId, role]);

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