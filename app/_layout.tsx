"use client"

import { useEffect } from "react"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useColorScheme } from "react-native"
import { AuthProvider } from "@/contexts/AuthContext"
import { ToastProvider } from "@/contexts/ToastContext"
import { notificationService } from "@/services/notificationService"
import { offlineStore } from "@/services/offlineStore"
import NetInfo from "@react-native-community/netinfo"
import Colors from "@/constants/Colors"
import { ThemeProvider } from "@/contexts/ThemeContext"

export default function RootLayout() {
  const colorScheme = useColorScheme()

  useEffect(() => {
    // Register for push notifications
    notificationService.registerForPushNotifications()

    // Set up network change listener to sync when coming back online
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected) {
        try {
          await offlineStore.syncOfflineChanges()
        } catch (error) {
          console.error("Error syncing offline changes:", error)
        }
      }
    })

    // Set up notification listeners
    const notificationReceivedSubscription = notificationService.addNotificationReceivedListener((notification) => {
      console.log("Notification received:", notification)
    })

    const notificationResponseSubscription = notificationService.addNotificationResponseReceivedListener((response) => {
      console.log("Notification response received:", response)
      // Handle notification tap here
      // You could navigate to a specific screen based on the notification
    })

    return () => {
      unsubscribe()
      notificationService.removeNotificationSubscription(notificationReceivedSubscription)
      notificationService.removeNotificationSubscription(notificationResponseSubscription)
    }
  }, [])

  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: Colors[colorScheme ?? "light"].background,
              },
              headerTintColor: Colors[colorScheme ?? "light"].text,
              headerTitleStyle: {
                fontWeight: "bold",
              },
              headerShown: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
          </Stack>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
