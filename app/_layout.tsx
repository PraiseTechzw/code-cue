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
import { useRouter } from "expo-router"
import { useColorScheme } from "react-native"
import { useAuth } from "@/contexts/AuthContext"
import { useSettings } from "@/contexts/SettingsContext"
import { useTheme } from "@/contexts/ThemeContext"
import GitHubConnectionBanner from "@/components/GitHubConnectionBanner"
import Colors from "@/constants/Colors"

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
        <Stack.Screen name="add-phase" />
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
        <Stack.Screen name="time-tracking" />
        <Stack.Screen name="team-management" />
        <Stack.Screen name="analytics-dashboard" />
        <Stack.Screen name="workflow-automation" />
        <Stack.Screen name="phase" />
        <Stack.Screen name="edit-phase" />
        <Stack.Screen name="github-debug" />
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
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <AppWrapper />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

function AppWrapper() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { user, loading } = useAuth()
  const { settings } = useSettings()
  const { setThemePreference } = useTheme()
  const router = useRouter()

  useEffect(() => {
    if (settings.theme !== "system") {
      setThemePreference(settings.theme)
    }
  }, [settings.theme, setThemePreference])

  // Show loading screen while checking authentication
  if (loading) {
    return null
  }

  // If not authenticated, show auth screens
  if (!user) {
    return (
      <ToastProvider>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.background,
            },
            headerTintColor: theme.text,
            headerTitleStyle: {
              fontWeight: "600",
            },
            contentStyle: {
              backgroundColor: theme.background,
            },
          }}
        >
          <Stack.Screen
            name="auth"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="welcome"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
      </ToastProvider>
    )
  }

  // If authenticated, show main app
  return (
    <ToastProvider>
      <ConnectionStatus />
      <GitHubConnectionBanner />
      <AppContent />
    </ToastProvider>
  )
}
