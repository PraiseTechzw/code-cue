import { useEffect } from "react"
import { useSettings } from "@/contexts/SettingsContext"
import { useTheme } from "@/contexts/ThemeContext"
import { useToast } from "@/contexts/ToastContext"
import { notificationService } from "@/services/notificationService"
import { offlineStore } from "@/services/offlineStore"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Haptics from "expo-haptics"
import { Audio } from "expo-av"
import { StatusBar, Platform } from "react-native"
import Colors from "@/constants/Colors"

export function useSettingsEffects() {
  const { settings } = useSettings()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const themeColors = Colors[theme === "dark" ? "dark" : "light"]

  // Handle theme changes
  useEffect(() => {
    // Update status bar color
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(themeColors.background)
    }
    StatusBar.setBarStyle(settings.theme === "dark" ? "light-content" : "dark-content")
  }, [settings.theme, themeColors.background])

  // Handle push notification changes
  useEffect(() => {
    async function updatePushNotifications() {
      try {
        if (settings.pushNotifications) {
          await notificationService.registerForPushNotifications()
        } else {
          // Unregister by removing the token
          await AsyncStorage.removeItem("pushToken")
        }
      } catch (error) {
        console.error("Error updating push notifications:", error)
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
          await offlineStore.persistCachedData()
        }
      } catch (error) {
        console.error("Error updating offline mode:", error)
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
          await offlineStore.syncOfflineChanges()
        }
      } catch (error) {
        console.error("Error updating auto-sync:", error)
        showToast("Failed to update auto-sync")
      }
    }
    updateAutoSync()
  }, [settings.autoSync])

  // Handle data usage changes
  useEffect(() => {
    async function updateDataUsage() {
      try {
        await AsyncStorage.setItem("dataUsage", settings.dataUsage)
      } catch (error) {
        console.error("Error updating data usage:", error)
        showToast("Failed to update data usage")
      }
    }
    updateDataUsage()
  }, [settings.dataUsage])

  // Handle haptic feedback
  useEffect(() => {
    async function updateHapticFeedback() {
      try {
        if (settings.hapticFeedback) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }
      } catch (error) {
        console.error("Error updating haptic feedback:", error)
        showToast("Failed to update haptic feedback")
      }
    }
    updateHapticFeedback()
  }, [settings.hapticFeedback])

  // Handle sound effects
  useEffect(() => {
    async function updateSoundEffects() {
      try {
        if (settings.soundEffects) {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
          })
        }
      } catch (error) {
        console.error("Error updating sound effects:", error)
        showToast("Failed to update sound effects")
      }
    }
    updateSoundEffects()
  }, [settings.soundEffects])

  // Handle font size changes
  useEffect(() => {
    async function updateFontSize() {
      try {
        await AsyncStorage.setItem("fontSize", settings.fontSize)
      } catch (error) {
        console.error("Error updating font size:", error)
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
        console.error("Error updating language:", error)
        showToast("Failed to update language")
      }
    }
    updateLanguage()
  }, [settings.language])
} 