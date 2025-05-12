import { useSettings } from "@/contexts/SettingsContext"
import { useTheme } from "@/contexts/ThemeContext"
import { useCallback } from "react"

export function useAppSettings() {
  const { settings, updateSetting } = useSettings()
  const { setThemePreference } = useTheme()

  const toggleTheme = useCallback(async () => {
    const newTheme = settings.theme === "dark" ? "light" : "dark"
    await updateSetting("theme", newTheme)
    await setThemePreference(newTheme)
  }, [settings.theme, updateSetting, setThemePreference])

  const toggleOfflineMode = useCallback(async () => {
    await updateSetting("offlineMode", !settings.offlineMode)
  }, [settings.offlineMode, updateSetting])

  const togglePushNotifications = useCallback(async () => {
    await updateSetting("pushNotifications", !settings.pushNotifications)
  }, [settings.pushNotifications, updateSetting])

  const toggleAutoSync = useCallback(async () => {
    await updateSetting("autoSync", !settings.autoSync)
  }, [settings.autoSync, updateSetting])

  const toggleDataUsage = useCallback(async () => {
    await updateSetting("dataUsage", settings.dataUsage === "high" ? "low" : "high")
  }, [settings.dataUsage, updateSetting])

  const toggleHapticFeedback = useCallback(async () => {
    await updateSetting("hapticFeedback", !settings.hapticFeedback)
  }, [settings.hapticFeedback, updateSetting])

  const toggleSoundEffects = useCallback(async () => {
    await updateSetting("soundEffects", !settings.soundEffects)
  }, [settings.soundEffects, updateSetting])

  const setFontSize = useCallback(async (size: "small" | "medium" | "large") => {
    await updateSetting("fontSize", size)
  }, [updateSetting])

  const setLanguage = useCallback(async (language: string) => {
    await updateSetting("language", language)
  }, [updateSetting])

  return {
    settings,
    theme: settings.theme,
    toggleTheme,
    toggleOfflineMode,
    togglePushNotifications,
    toggleAutoSync,
    toggleDataUsage,
    toggleHapticFeedback,
    toggleSoundEffects,
    setFontSize,
    setLanguage,
  }
} 