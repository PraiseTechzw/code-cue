"use client"

import { useEffect, useState } from "react"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { useColorScheme, AppState, View, ActivityIndicator } from "react-native"
import { AuthProvider } from "@/contexts/AuthContext"
import { ToastProvider } from "@/contexts/ToastContext"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { notificationService } from "@/services/notificationService"
import { offlineStore } from "@/services/offlineStore"
import NetInfo from "@react-native-community/netinfo"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SplashScreen from "expo-splash-screen"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import Colors from "@/constants/Colors"
import ErrorBoundary from "@/components/ErrorBoundary"

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const [appIsReady, setAppIsReady] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  // Load resources and initialize app
  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load cached data
        await offlineStore.loadCachedData()

        // Get last sync time
        const lastSync = await AsyncStorage.getItem("lastSyncedTime")
        if (lastSync) {
          setLastSyncTime(lastSync)
        }

        // Artificial delay for smooth transition
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (e) {
        console.warn("Error loading resources:", e)
      } finally {
        setAppIsReady(true)
      }
    }

    prepare()
  }, [])

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "active") {
        // App came to foreground
        const netInfo = await NetInfo.fetch()
        if (netInfo.isConnected) {
          // Check for updates when app comes to foreground
          try {
            await offlineStore.syncOfflineChanges()
            const currentTime = Date.now().toString()
            await AsyncStorage.setItem("lastSyncedTime", currentTime)
            setLastSyncTime(currentTime)
          } catch (error) {
            console.error("Error syncing on app foreground:", error)
          }
        }
      } else if (nextAppState === "background") {
        // App went to background
        // Save any pending state
        await offlineStore.persistCachedData()
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  // Network connectivity monitoring
  useEffect(() => {
    // Set up network change listener to sync when coming back online
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected) {
        try {
          // Sync offline changes
          await offlineStore.syncOfflineChanges()

          // Update last synced time
          const currentTime = Date.now().toString()
          await AsyncStorage.setItem("lastSyncedTime", currentTime)
          setLastSyncTime(currentTime)
        } catch (error) {
          console.error("Error syncing offline changes:", error)
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Notification setup
  useEffect(() => {
    // Register for push notifications
    notificationService.registerForPushNotifications()

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
      notificationService.removeNotificationSubscription(notificationReceivedSubscription)
      notificationService.removeNotificationSubscription(notificationResponseSubscription)
    }
  }, [])

  // Hide splash screen once resources are loaded
  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync()
    }
  }, [appIsReady])

  // Initialize services
  useEffect(() => {
    // Initialize offline store
    offlineStore.initOfflineStore()
  }, [])

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <SafeAreaProvider>
            <ToastProvider>
              <AuthProvider>
                <StatusBar style="auto" />
                <ConnectionStatus lastSyncTime={lastSyncTime } />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: "slide_from_right",
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
              </AuthProvider>
            </ToastProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  )
}
