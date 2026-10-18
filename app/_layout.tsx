// app/_layout.tsx
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/nunito";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import mobileAds from 'react-native-google-mobile-ads';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp } from "../context/AppContext";
import {
  cancelAllReminders,
  configureNotificationHandler,
  scheduleReminderNotifications,
  startAppStateRescheduler,
} from "../services/notificationService";



// Initialize Stream Video SDK globals (WebRTC polyfills etc.)

// Configure notification foreground behaviour once at module level
configureNotificationHandler();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => { });

/* ────────────────────────────────────────────────────────────────
   NOTIFICATION WIRING HOOK
   - Requests permission on first launch
   - Schedules 24 h of hourly reminders
   - Re-schedules every time app comes to foreground (AppState)
   - Cancels reminders when user completes their daily goal
──────────────────────────────────────────────────────────────── */
function useNotifications() {
  const { stats, isAuthenticated } = useApp();
  const streakRef = useRef(stats?.streak ?? 0);

  // Keep ref in sync so the AppState callback always has latest streak
  useEffect(() => {
    streakRef.current = stats?.streak ?? 0;
  }, [stats?.streak]);

  useEffect(() => {
    if (!isAuthenticated) {
      cancelAllReminders().catch(() => {});
      return;
    }

    // Initial schedule when user is logged in
    scheduleReminderNotifications(streakRef.current).catch(() => {});

    // Re-schedule on every foreground event
    const cleanup = startAppStateRescheduler(() => streakRef.current);
    return cleanup;
  }, [isAuthenticated]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => { });
    }

    mobileAds()
      .initialize()
      .then(adapterStatuses => {
        console.log('AdMob initialized successfully', adapterStatuses);
      });
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }



  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <NotificationBridge />
          <View style={styles.container}>
            <StatusBar style="auto" />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "fade",
                contentStyle: { backgroundColor: "#FFFFFF" },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="splash" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="lesson" />
              <Stack.Screen name="plans" />
            </Stack>

          </View>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Thin bridge component so useApp() can be called inside AppProvider
function NotificationBridge() {
  useNotifications();
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
