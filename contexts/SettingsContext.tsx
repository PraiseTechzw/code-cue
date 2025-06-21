"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useAuth } from "./AuthContext"
import { profileService } from "@/services/profileService"
import { offlineStore } from "@/services/offlineStore"
import { notificationService } from "@/services/notificationService"

interface Settings {
  theme: "light" | "dark" | "system"
  pushNotifications: boolean
  offlineMode: boolean
  autoSync: boolean
  hapticFeedback: boolean
  fontSize: "small" | "medium" | "large"
  language: string
}

interface SettingsContextType {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
  isLoading: boolean
  isConnected: boolean
}

const defaultSettings: Settings = {
  theme: "system",
  offlineMode: true,
  pushNotifications: true,
  autoSync: true,
  hapticFeedback: true,
  fontSize: "medium",
  language: "en"
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSetting: async () => {},
  isLoading: true,
  isConnected: true
})

export const useSettings = () => useContext(SettingsContext)

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isConnected } = useAuth()
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  // Load settings on mount and when user changes
  useEffect(() => {
    loadSettings()
  }, [user])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const savedSettings = await AsyncStorage.getItem("appSettings")
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }

      // Load profile-specific settings
      if (user) {
        const profile = await profileService.getProfile()
        if (profile) {
          setSettings(prev => ({
            ...prev,
            theme: profile.theme || "system",
            pushNotifications: profile.push_token !== null
          }))
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    try {
      const newSettings = { ...settings, [key]: value }
      setSettings(newSettings)
      await AsyncStorage.setItem("appSettings", JSON.stringify(newSettings))

      // Handle specific settings that need additional processing
      switch (key) {
        case "theme":
          if (user) {
            await profileService.updateTheme(value as "light" | "dark")
          }
          // Update theme in AsyncStorage for persistence
          await AsyncStorage.setItem("themePreference", value as string)
          break

        case "pushNotifications":
          if (user) {
            if (value) {
              const token = await AsyncStorage.getItem("pushToken")
              await profileService.updateProfile({ push_token: token })
              await notificationService.registerForPushNotifications()
            } else {
              await profileService.updateProfile({ push_token: null })
            }
          }
          break

        case "offlineMode":
          if (value) {
            await offlineStore.enableOfflineMode()
          } else {
            await offlineStore.disableOfflineMode()
          }
          break

        case "autoSync":
          if (value && isConnected) {
            await offlineStore.syncOfflineChanges((progress) => {
              // Handle progress updates if needed
              console.log("Sync progress:", progress)
            })
            await AsyncStorage.setItem("lastSyncedTime", Date.now().toString())
            setSettings(prev => ({
              ...prev,
              lastSynced: new Date().toLocaleString()
            }))
          }
          break
      }
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error)
      // Revert the setting if there was an error
      setSettings(prev => ({ ...prev, [key]: settings[key] }))
      throw error
    }
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSetting,
        isLoading,
        isConnected
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
} 