import { useEffect } from "react"
import { useSettings } from "@/contexts/SettingsContext"
import { useTheme } from "@/contexts/ThemeContext"
import { useToast } from "@/contexts/ToastContext"
import { notificationService } from "@/services/notificationService"
import { offlineStore } from "@/services/offlineStore"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Haptics from "expo-haptics"
import { StatusBar, Platform } from "react-native"
import Colors from "@/constants/Colors"

export function useSettingsEffects() {
  const { settings } = useSettings()
  const { setThemePreference, colors } = useTheme()
  const { showToast } = useToast()

  // Handle theme changes
  useEffect(() => {
    const applyTheme = async () => {
      try {
        // Update theme preference in ThemeContext
        await setThemePreference(settings.theme)
        
        // Update status bar
        if (Platform.OS === "android") {
          StatusBar.setBackgroundColor(colors.background)
        }
        StatusBar.setBarStyle(settings.theme === "dark" ? "light-content" : "dark-content")
      } catch (error) {
        showToast("Failed to apply theme changes")
      }
    }

    applyTheme()
  }, [settings.theme, setThemePreference, colors.background])

  // Handle push notification changes
  useEffect(() => {
    async function updatePushNotifications() {
      try {
        if (settings.pushNotifications) {
          await notificationService.registerForPushNotifications()
        } else {
          await AsyncStorage.removeItem("pushToken")
        }
      } catch (error) {
        showToast("Failed to update push notifications")
      }
    }
    updatePushNotifications()
  }, [settings.pushNotifications])

  // Handle offline mode changes
  useEffect(() => {
    async function updateOfflineMode() {
      try {
        if (settings.offlineMode) {
          await offlineStore.loadCachedData()
        } else {
          // Get current cached data and persist it
          const cachedData = await offlineStore.loadCachedData()
          await offlineStore.persistCachedData(cachedData)
        }
      } catch (error) {
        showToast("Failed to update offline mode")
      }
    }
    updateOfflineMode()
  }, [settings.offlineMode])

  // Handle auto-sync changes
  useEffect(() => {
    async function updateAutoSync() {
      try {
        if (settings.autoSync) {
          await offlineStore.syncOfflineChanges((progress) => {
            // Handle progress updates if needed
          })
          await AsyncStorage.setItem("lastSyncedTime", Date.now().toString())
        }
      } catch (error) {
        showToast("Failed to update auto-sync")
      }
    }
    updateAutoSync()
  }, [settings.autoSync])

  // Handle haptic feedback changes
  useEffect(() => {
    if (settings.hapticFeedback) {
      // Enable haptic feedback by triggering a light impact
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }, [settings.hapticFeedback])

  // Handle font size changes
  useEffect(() => {
    async function updateFontSize() {
      try {
        await AsyncStorage.setItem("fontSize", settings.fontSize)
      } catch (error) {
        showToast("Failed to update font size")
      }
    }
    updateFontSize()
  }, [settings.fontSize])

  // Handle language changes
  useEffect(() => {
    async function updateLanguage() {
      try {
        await AsyncStorage.setItem("language", settings.language)
        // Here you would typically trigger a language change in your i18n system
      } catch (error) {
        showToast("Failed to update language")
      }
    }
    updateLanguage()
  }, [settings.language])
} 