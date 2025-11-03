import '../global.css';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
        <Provider store={store}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="auth/otp-login" />
            <Stack.Screen name="auth/role-selection" />
            <Stack.Screen name="auth/customer-setup" />
            <Stack.Screen name="auth/vendor-setup" />
            <Stack.Screen name="customer/home" />
            <Stack.Screen name="customer/vendor-detail" />
            <Stack.Screen name="customer/my-bookings" />
            <Stack.Screen name="customer/favorites" />
            <Stack.Screen name="vendor/dashboard" />
            <Stack.Screen name="booking/service-selection" />
            <Stack.Screen name="booking/vendor-list" />
            <Stack.Screen name="booking/booking-details" />
            <Stack.Screen name="booking/booking-success" />
            <Stack.Screen name="chat" />
          </Stack>
        </Provider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}


const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#181928",
  },
});