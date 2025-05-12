"use client"

import React from "react"
import { View, StyleSheet, Switch, Text, ScrollView, TouchableOpacity, Platform } from "react-native"
import { useAppSettings } from "@/hooks/useAppSettings"
import { useToast } from "@/contexts/ToastContext"
import { Ionicons } from "@expo/vector-icons"
import Colors from "@/constants/Colors"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useAuth } from "@/contexts/AuthContext"

export default function SettingsScreen() {
  const {
    settings,
    theme,
    toggleTheme,
    toggleOfflineMode,
    togglePushNotifications,
    toggleAutoSync,
    toggleDataUsage,
    toggleHapticFeedback,
    toggleSoundEffects,
    setFontSize,
    setLanguage,
  } = useAppSettings()
  const themeColors = Colors[settings.theme === "dark" ? "dark" : "light"]
  const { showToast } = useToast()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useAuth()

  const handleThemeChange = async (value: boolean) => {
    try {
      await toggleTheme()
      showToast("Theme updated successfully")
    } catch (error) {
      showToast("Failed to update theme")
    }
  }

  const handleOfflineModeChange = async (value: boolean) => {
    try {
      await toggleOfflineMode()
      showToast(value ? "Offline mode enabled" : "Offline mode disabled")
    } catch (error) {
      showToast("Failed to update offline mode")
    }
  }

  const handlePushNotificationsChange = async (value: boolean) => {
    try {
      await togglePushNotifications()
      showToast(value ? "Push notifications enabled" : "Push notifications disabled")
    } catch (error) {
      showToast("Failed to update push notifications")
    }
  }

  const handleAutoSyncChange = async (value: boolean) => {
    try {
      await toggleAutoSync()
      showToast(value ? "Auto-sync enabled" : "Auto-sync disabled")
    } catch (error) {
      showToast("Failed to update auto-sync")
    }
  }

  const handleDataUsageChange = async (value: boolean) => {
    try {
      await toggleDataUsage()
      showToast(`Data usage set to ${value ? "high" : "low"}`)
    } catch (error) {
      showToast("Failed to update data usage")
    }
  }

  const handleHapticFeedbackChange = async (value: boolean) => {
    try {
      await toggleHapticFeedback()
      showToast(value ? "Haptic feedback enabled" : "Haptic feedback disabled")
    } catch (error) {
      showToast("Failed to update haptic feedback")
    }
  }

  const handleSoundEffectsChange = async (value: boolean) => {
    try {
      await toggleSoundEffects()
      showToast(value ? "Sound effects enabled" : "Sound effects disabled")
    } catch (error) {
      showToast("Failed to update sound effects")
    }
  }

  const handleFontSizeChange = async (size: "small" | "medium" | "large") => {
    try {
      await setFontSize(size)
      showToast(`Font size set to ${size}`)
    } catch (error) {
      showToast("Failed to update font size")
    }
  }

  const handleLanguageChange = async (language: string) => {
    try {
      await setLanguage(language)
      showToast(`Language set to ${language}`)
    } catch (error) {
      showToast("Failed to update language")
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <Text style={[styles.title, { color: themeColors.text }]}>Settings</Text>
      </View>

      <ScrollView style={[styles.content, { backgroundColor: themeColors.background }]}>
        <View style={[styles.section, { borderBottomColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Appearance</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={24} color={themeColors.text} />
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={settings.theme === "dark"}
              onValueChange={handleThemeChange}
              trackColor={{ false: "#767577", true: themeColors.tint }}
              thumbColor={settings.theme === "dark" ? "#f4f3f4" : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="text-outline" size={24} color={themeColors.text} />
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Font Size</Text>
            </View>
            <View style={styles.fontSizeButtons}>
              {(["small", "medium", "large"] as const).map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.fontSizeButton,
                    settings.fontSize === size && styles.fontSizeButtonActive,
                  ]}
                  onPress={() => handleFontSizeChange(size)}
                >
                  <Text
                    style={[
                      styles.fontSizeButtonText,
                      settings.fontSize === size && styles.fontSizeButtonTextActive,
                    ]}
                  >
                    {size.charAt(0).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.section, { borderBottomColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={24} color={themeColors.text} />
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Push Notifications</Text>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={handlePushNotificationsChange}
              trackColor={{ false: "#767577", true: themeColors.tint }}
              thumbColor={settings.pushNotifications ? "#f4f3f4" : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={[styles.section, { borderBottomColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Data & Sync</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="cloud-offline-outline" size={24} color={themeColors.text} />
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Offline Mode</Text>
            </View>
            <Switch
              value={settings.offlineMode}
              onValueChange={handleOfflineModeChange}
              trackColor={{ false: "#767577", true: themeColors.tint }}
              thumbColor={settings.offlineMode ? "#f4f3f4" : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="sync-outline" size={24} color={themeColors.text} />
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Auto-Sync</Text>
            </View>
            <Switch
              value={settings.autoSync}
              onValueChange={handleAutoSyncChange}
              trackColor={{ false: "#767577", true: themeColors.tint }}
              thumbColor={settings.autoSync ? "#f4f3f4" : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="cellular-outline" size={24} color={themeColors.text} />
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>High Data Usage</Text>
            </View>
            <Switch
              value={settings.dataUsage === "high"}
              onValueChange={handleDataUsageChange}
              trackColor={{ false: "#767577", true: themeColors.tint }}
              thumbColor={settings.dataUsage === "high" ? "#f4f3f4" : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={[styles.section, { borderBottomColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Accessibility</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="hand-left" size={24} color={themeColors.text} />
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Haptic Feedback</Text>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={handleHapticFeedbackChange}
              trackColor={{ false: "#767577", true: themeColors.tint }}
              thumbColor={settings.hapticFeedback ? "#f4f3f4" : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="volume-high-outline" size={24} color={themeColors.text} />
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Sound Effects</Text>
            </View>
            <Switch
              value={settings.soundEffects}
              onValueChange={handleSoundEffectsChange}
              trackColor={{ false: "#767577", true: themeColors.tint }}
              thumbColor={settings.soundEffects ? "#f4f3f4" : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={[styles.section, { borderBottomColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Language</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="language-outline" size={24} color={themeColors.text} />
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>App Language</Text>
            </View>
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => handleLanguageChange(settings.language === "en" ? "es" : "en")}
            >
              <Text style={[styles.languageButtonText, { color: themeColors.text }]}>
                {settings.language === "en" ? "English" : "Español"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  fontSizeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  fontSizeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  fontSizeButtonActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  fontSizeButtonText: {
    fontSize: 14,
    color: "#666",
  },
  fontSizeButtonTextActive: {
    color: "#fff",
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  languageButtonText: {
    fontSize: 14,
  },
})
