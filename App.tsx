import "expo-router/entry";
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
export default function App() {


  useEffect(() => {
    const foregroundListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📩 Foreground notification received:', notification);
      // Optionally show custom UI inside app
      // showToast(notification.request.content.body)
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📲 User interacted with notification:', response);
      // Navigate user to relevant screen, e.g., LiveOffer
      const offerId = response.notification.request.content.data?.offerId;
      if (offerId) {
        router.replace('LiveOffer', { offerId });
      }
    });

    return () => {
      foregroundListener.remove();
      responseListener.remove();
    };
  }, []);



  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
