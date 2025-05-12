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
import Colors from "@/constants/Colors"
import ErrorBoundary from "@/components/ErrorBoundary"
import { useSettingsEffects } from "@/hooks/useSettingsEffects"

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

function AppContent() {
  const [isReady, setIsReady] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string>("Never")

  // Apply settings effects
  useSettingsEffects()

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make API calls, etc.
        await Promise.all([
          // Add any async initialization here
        ])
      } catch (e) {
        console.warn(e)
      } finally {
        setIsReady(true)
        await SplashScreen.hideAsync()
      }
    }

    prepare()
  }, [])

  useEffect(() => {
    // Load last sync time
    async function loadLastSyncTime() {
      const time = await AsyncStorage.getItem("lastSyncedTime")
      if (time) {
        setLastSyncTime(new Date(Number(time)).toLocaleString())
      }
    }
    loadLastSyncTime()
  }, [])

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      <ConnectionStatus lastSyncTime={lastSyncTime} />
    </>
  )
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
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
      </GestureHandlerRootView>
    </ErrorBoundary>
  )
}
