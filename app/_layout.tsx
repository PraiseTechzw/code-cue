"use client"

import { useEffect, useState } from "react"
import { Stack } from "expo-router"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { AppState } from "react-native"
import { AuthProvider } from "@/contexts/AuthContext"
import { ToastProvider } from "@/contexts/ToastContext"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { SettingsProvider } from "@/contexts/SettingsContext"
import { offlineStore } from "@/services/offlineStore"
import NetInfo from "@react-native-community/netinfo"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SplashScreen from "expo-splash-screen"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import CustomSplashScreen from "@/components/SplashScreen"
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
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="github-connect" />
        <Stack.Screen name="add-repository" />
        <Stack.Screen name="add-task" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="edit-project" />
        <Stack.Screen name="link-commit" />
        <Stack.Screen name="modal" />
        <Stack.Screen name="new-project" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="project" />
        <Stack.Screen name="repositories" />
        <Stack.Screen name="repository" />
        <Stack.Screen name="select-project" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="task" />
        <Stack.Screen name="terms-of-service" />
        <Stack.Screen name="toast-demo" />
        <Stack.Screen name="+html" />
        <Stack.Screen name="+not-found" />
      </Stack>
     
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
