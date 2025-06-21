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

  const toggleHapticFeedback = useCallback(async () => {
    await updateSetting("hapticFeedback", !settings.hapticFeedback)
  }, [settings.hapticFeedback, updateSetting])

  const updateFontSize = useCallback(async (fontSize: "small" | "medium" | "large") => {
    await updateSetting("fontSize", fontSize)
  }, [updateSetting])

  const updateLanguage = useCallback(async (language: string) => {
    await updateSetting("language", language)
  }, [updateSetting])

  return {
    settings,
    theme: settings.theme,
    toggleTheme,
    toggleOfflineMode,
    togglePushNotifications,
    toggleAutoSync,
    toggleHapticFeedback,
    updateFontSize,
    updateLanguage,
  }
} 