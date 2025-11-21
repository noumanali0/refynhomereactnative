import 'react-native-gesture-handler';
import '../global.css';
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { Provider } from "react-redux";
// import { PersistGate } from "redux-persist/integration/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { store } from "@/store";
import { useAppSelector } from '@/hooks/useAppDispatch';
import { StyleSheet } from 'react-native';
import { useFonts } from "expo-font";
import { FONTS } from '@/constants/fonts';
import * as SplashScreen from "expo-splash-screen";
SplashScreen.preventAutoHideAsync();
// import { useAppSelector } from "@/store/hooks";
// import LoadingSpinner from "@/components/common/LoadingSpinner";
// import SocketManager from "@/socket/socketManager";

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();

  const { isAuthenticated, user, isLoading } = useAppSelector((s) => s.auth);
  console.log("🚀 ~ RootLayoutNav ~ user:", isAuthenticated, user)

  const role = user?.role;
  const userId = user?.id;


  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === "(auth)";
    const inCustomer = segments[0] === "(customer)";
    const inVendor = segments[0] === "(vendor)";
    router.replace({ pathname: "/(customer)" })
    // router.replace({ pathname: "/(vendor)/(servicerequests)" })
    // if (loaded) {
    let redirectTimeout: NodeJS.Timeout;
    // redirectTimeout = setTimeout(() => {
    //   if (!isAuthenticated && !inAuth) router.replace({ pathname: "/(vendor)/(servicerequests)/request-details", params: { id: 'req_1763638546365_4867' } });
    //   else if (isAuthenticated && inAuth) {
    //     console.log("isAuth and inAuth")
    //     if (role === "customer") router.replace("/(customer)/(home)");
    //     else if (role === "vendor") router.replace("/(vendor)/(dashboard)");
    //   } else if (isAuthenticated && role) {
    //     console.log("isAuth and role")
    //     if (role === "customer" && inVendor) router.replace("/(customer)/(home)");
    //     else if (role === "vendor" && inCustomer) router.replace("/(vendor)/(dashboard)");
    //   }
    //   // clearTimeout(redirectTimeout);
    // }, 100);
    // return () => clearTimeout(redirectTimeout);
    // }
  }, []);
  // }, [isAuthenticated, role, segments, isLoading]);

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
          {/* <PersistGate loading={<LoadingSpinner />} persistor={persistor}> */}
          <GestureHandlerRootView style={{ flex: 1 }}>
            {/* <SafeAreaProvider> */}
            <RootLayoutNav />
            {/* </SafeAreaProvider> */}
          </GestureHandlerRootView>
          {/* </PersistGate> */}
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