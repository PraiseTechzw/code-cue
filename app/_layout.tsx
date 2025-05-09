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
import AsyncStorage from "@react-native-async-storage/async-storage"

export default function RootLayout() {
  const colorScheme = useColorScheme()

  useEffect(() => {
    // Register for push notifications
    notificationService.registerForPushNotifications()

    // Set up network change listener to sync when coming back online
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected) {
        try {
          // Set syncing flag
          await AsyncStorage.setItem("isSyncing", "true")

          // Sync offline changes
          await offlineStore.syncOfflineChanges()

          // Update last synced time
          await AsyncStorage.setItem("lastSyncedTime", Date.now().toString())

          // Clear syncing flag
          await AsyncStorage.setItem("isSyncing", "false")
        } catch (error) {
          console.error("Error syncing offline changes:", error)
          await AsyncStorage.setItem("isSyncing", "false")
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
    <AuthProvider>
      <ToastProvider>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false }} />
      </ToastProvider>
    </AuthProvider>
  )
}
