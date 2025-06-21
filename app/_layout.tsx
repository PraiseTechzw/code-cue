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
import { SettingsProvider } from "@/contexts/SettingsContext"
import { notificationService } from "@/services/notificationService"
import { offlineStore } from "@/services/offlineStore"
import NetInfo from "@react-native-community/netinfo"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SplashScreen from "expo-splash-screen"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import CustomSplashScreen from "@/components/SplashScreen"
import Colors from "@/constants/Colors"
import ErrorBoundary from "@/components/ErrorBoundary"
import { useSettingsEffects } from "@/hooks/useSettingsEffects"

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

function AppContent() {
  const [isReady, setIsReady] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [isConnected, setIsConnected] = useState(true)
  const [lastSynced, setLastSynced] = useState<string>("Never")

  // Apply settings effects
  useSettingsEffects()

  useEffect(() => {
    prepareApp()
  }, [])

  const prepareApp = async () => {
    try {
      // Load last sync time
      const lastSyncedTime = await AsyncStorage.getItem("lastSyncedTime")
      if (lastSyncedTime) {
        setLastSynced(new Date(Number.parseInt(lastSyncedTime)).toLocaleString())
      }

      // Set up network listener
      const unsubscribe = NetInfo.addEventListener(state => {
        setIsConnected(state.isConnected ?? false)
      })

      // Set up app state listener
      const appStateSubscription = AppState.addEventListener("change", nextAppState => {
        if (nextAppState === "active") {
          offlineStore.syncOfflineChanges((progress) => {
            // Handle progress updates if needed
            console.log("Sync progress:", progress)
          })
        }
      })

      return () => {
        unsubscribe()
        appStateSubscription.remove()
      }
    } catch (error) {
      console.error("Error preparing app:", error)
    } finally {
      setIsReady(true)
      // Don't hide splash screen immediately, let our custom splash screen handle it
    }
  }

  const handleSplashComplete = async () => {
    setShowSplash(false)
    await SplashScreen.hideAsync()
  }

  if (!isReady || showSplash) {
    return <CustomSplashScreen onAnimationComplete={handleSplashComplete} />
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <ConnectionStatus />
    </GestureHandlerRootView>
  )
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <SettingsProvider>
            <ThemeProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </ThemeProvider>
          </SettingsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}
