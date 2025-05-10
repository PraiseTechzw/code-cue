"use client"

import { useState, useEffect, useCallback } from "react"
import {
  StyleSheet,
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"
import { profileService } from "@/services/profileService"
import { offlineStore } from "@/services/offlineStore"
import Colors from "@/constants/Colors"
import { VerifyAction } from "@/components/VerifyAction"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Application from "expo-application"

export default function SettingsScreen() {
  const router = useRouter()
  const { user, signOut, isConnected } = useAuth()
  const { showToast } = useToast()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === "dark")
  const [isOfflineEnabled, setIsOfflineEnabled] = useState(true)
  const [isPushEnabled, setIsPushEnabled] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
  const [showClearDataConfirmation, setShowClearDataConfirmation] = useState(false)
  const [cacheSize, setCacheSize] = useState<string>("0 KB")
  const [lastSynced, setLastSynced] = useState<string>("Never")
  const [appVersion, setAppVersion] = useState<string>("1.0.0")

  useEffect(() => {
    loadProfile()
    loadAppInfo()
    loadCacheInfo()
  }, [user])

  const loadAppInfo = async () => {
    try {
      const version = Application.nativeApplicationVersion || "1.0.0"
      setAppVersion(version)

      // Get last synced time
      const lastSyncedTime = await AsyncStorage.getItem("lastSyncedTime")
      if (lastSyncedTime) {
        const date = new Date(Number.parseInt(lastSyncedTime))
        setLastSynced(date.toLocaleString())
      }
    } catch (error) {
      console.error("Error loading app info:", error)
    }
  }

  const loadCacheInfo = async () => {
    try {
      // Calculate approximate cache size
      let totalSize = 0
      const keys = await AsyncStorage.getAllKeys()

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key)
        if (value) {
          totalSize += value.length
        }
      }

      // Convert bytes to KB or MB
      if (totalSize > 1024 * 1024) {
        setCacheSize(`${(totalSize / (1024 * 1024)).toFixed(2)} MB`)
      } else {
        setCacheSize(`${(totalSize / 1024).toFixed(2)} KB`)
      }
    } catch (error) {
      console.error("Error calculating cache size:", error)
      setCacheSize("Unknown")
    }
  }

  const loadProfile = async () => {
    if (user) {
      try {
        setLoading(true)
        const profileData = await profileService.getProfile()
        setProfile(profileData)

        // Set theme based on profile preference
        if (profileData?.theme) {
          setIsDarkMode(profileData.theme === "dark")
        }

        // Load push notification setting
        const pushEnabled = await AsyncStorage.getItem("pushNotificationsEnabled")
        setIsPushEnabled(pushEnabled !== "false")

        // Load offline mode setting
        const offlineEnabled = await AsyncStorage.getItem("offlineModeEnabled")
        setIsOfflineEnabled(offlineEnabled !== "false")
      } catch (error) {
        console.error("Error loading profile:", error)
        showToast("Failed to load profile", "error")
      } finally {
        setLoading(false)
      }
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadProfile()
    await loadCacheInfo()
    setRefreshing(false)
  }, [])

  const handleBack = () => {
    router.back()
  }

  const handleToggleDarkMode = async (value: boolean) => {
    setIsDarkMode(value)
    try {
      await profileService.updateTheme(value ? "dark" : "light")
      showToast(`Theme changed to ${value ? "dark" : "light"} mode`, "success")
    } catch (error) {
      console.error("Error updating theme:", error)
      showToast("Failed to update theme", "error")

      // Store change for offline sync
      if (!isConnected) {
        await AsyncStorage.setItem("pendingThemeChange", value ? "dark" : "light")
        showToast("Theme change will be synced when online", "info")
      }
    }
  }

  const handleToggleOfflineMode = async (value: boolean) => {
    setIsOfflineEnabled(value)
    await AsyncStorage.setItem("offlineModeEnabled", value.toString())
    showToast(`Offline mode ${value ? "enabled" : "disabled"}`, "info")
  }

  const handleTogglePushNotifications = async (value: boolean) => {
    setIsPushEnabled(value)
    await AsyncStorage.setItem("pushNotificationsEnabled", value.toString())

    try {
      if (value) {
        await profileService.updateProfile({ push_token: (await AsyncStorage.getItem("pushToken")) || null })
      } else {
        await profileService.updateProfile({ push_token: null })
      }
      showToast(`Push notifications ${value ? "enabled" : "disabled"}`, "info")
    } catch (error) {
      console.error("Error updating push notification settings:", error)

      // Store change for offline sync
      if (!isConnected) {
        await offlineStore.addOfflineChange({
          table_name: "profiles",
          record_id: user?.id || "",
          operation: "UPDATE",
          data: { push_token: value ? await AsyncStorage.getItem("pushToken") : null },
        })
        showToast("Push notification settings will be synced when online", "info")
      }
    }
  }

  const handleSyncData = async () => {
    if (!isConnected) {
      showToast("You are offline. Please connect to the internet to sync data.", "error")
      return
    }

    try {
      setIsSyncing(true)
      await offlineStore.syncOfflineChanges()

      // Update last synced time
      await AsyncStorage.setItem("lastSyncedTime", Date.now().toString())
      setLastSynced(new Date().toLocaleString())

      // Refresh cache info
      await loadCacheInfo()

      showToast("Data synchronized successfully", "success")
    } catch (error) {
      console.error("Error syncing data:", error)
      showToast("Failed to synchronize data. Please try again.", "error")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleClearCache = () => {
    setShowClearDataConfirmation(true)
  }

  const confirmClearCache = async () => {
    setShowClearDataConfirmation(false)
    try {
      // Get all keys
      const keys = await AsyncStorage.getAllKeys()

      // Filter out essential keys
      const nonEssentialKeys = keys.filter(
        (key) =>
          !key.includes("auth") && key !== "profile" && !key.includes("Token") && !key.includes("offlineChanges"),
      )

      // Remove non-essential data
      await AsyncStorage.multiRemove(nonEssentialKeys)

      // Update cache size
      await loadCacheInfo()

      showToast("Cache cleared successfully", "success")
    } catch (error) {
      console.error("Error clearing cache:", error)
      showToast("Failed to clear cache", "error")
    }
  }

  const handleEditProfile = () => {
    router.push("/edit-profile")
  }

  const handleLogout = () => {
    setShowLogoutConfirmation(true)
  }

  const confirmLogout = async () => {
    setShowLogoutConfirmation(false)
    const success = await signOut()
    if (success) {
      showToast("Logged out successfully", "success")
      router.replace("/auth/login")
    } else {
      showToast("Failed to logout", "error")
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ConnectionStatus />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.tint]} tintColor={theme.tint} />
        }
      >
        <View style={[styles.profileSection, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.profileInfo}>
            <Image
              source={profile?.avatar_url ? { uri: profile.avatar_url } : require("@/assets/images/default-avatar.png")}
              style={styles.avatar}
            />
            <View style={styles.profileText}>
              <Text style={[styles.profileName, { color: theme.text }]}>{profile?.full_name || "User"}</Text>
              <Text style={[styles.profileEmail, { color: theme.textDim }]}>{user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleEditProfile}
            style={[styles.editButton, { backgroundColor: theme.tintLight }]}
          >
            <Ionicons name="create-outline" size={20} color={theme.tint} />
            <Text style={[styles.editButtonText, { color: theme.tint }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionTitle}>
          <Text style={[styles.sectionTitleText, { color: theme.text }]}>Appearance</Text>
        </View>

        <View style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.settingInfo}>
            <Ionicons name="moon-outline" size={24} color={theme.text} style={styles.settingIcon} />
            <Text style={[styles.settingText, { color: theme.text }]}>Dark Mode</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={handleToggleDarkMode}
            trackColor={{ false: "#767577", true: theme.tintLight }}
            thumbColor={isDarkMode ? theme.tint : "#f4f3f4"}
          />
        </View>

        <View style={styles.sectionTitle}>
          <Text style={[styles.sectionTitleText, { color: theme.text }]}>Data & Sync</Text>
        </View>

        <View style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.settingInfo}>
            <Ionicons name="cloud-offline-outline" size={24} color={theme.text} style={styles.settingIcon} />
            <Text style={[styles.settingText, { color: theme.text }]}>Offline Mode</Text>
          </View>
          <Switch
            value={isOfflineEnabled}
            onValueChange={handleToggleOfflineMode}
            trackColor={{ false: "#767577", true: theme.tintLight }}
            thumbColor={isOfflineEnabled ? theme.tint : "#f4f3f4"}
          />
        </View>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
          onPress={handleSyncData}
          disabled={isSyncing || !isConnected}
        >
          <View style={styles.settingInfo}>
            <Ionicons name="sync-outline" size={24} color={theme.text} style={styles.settingIcon} />
            <View>
              <Text style={[styles.settingText, { color: theme.text }]}>Sync Data</Text>
              <Text style={[styles.settingSubtext, { color: theme.textDim }]}>Last synced: {lastSynced}</Text>
            </View>
          </View>
          {isSyncing ? (
            <ActivityIndicator size="small" color={theme.tint} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
          onPress={handleClearCache}
        >
          <View style={styles.settingInfo}>
            <Ionicons name="trash-outline" size={24} color={theme.text} style={styles.settingIcon} />
            <View>
              <Text style={[styles.settingText, { color: theme.text }]}>Clear Cache</Text>
              <Text style={[styles.settingSubtext, { color: theme.textDim }]}>Current size: {cacheSize}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
        </TouchableOpacity>

        <View style={styles.sectionTitle}>
          <Text style={[styles.sectionTitleText, { color: theme.text }]}>Notifications</Text>
        </View>

        <View style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications-outline" size={24} color={theme.text} style={styles.settingIcon} />
            <Text style={[styles.settingText, { color: theme.text }]}>Push Notifications</Text>
          </View>
          <Switch
            value={isPushEnabled}
            onValueChange={handleTogglePushNotifications}
            trackColor={{ false: "#767577", true: theme.tintLight }}
            thumbColor={isPushEnabled ? theme.tint : "#f4f3f4"}
          />
        </View>

        <View style={styles.sectionTitle}>
          <Text style={[styles.sectionTitleText, { color: theme.text }]}>Account</Text>
        </View>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
          onPress={() => router.push("/privacy-policy")}
        >
          <View style={styles.settingInfo}>
            <Ionicons name="shield-checkmark-outline" size={24} color={theme.text} style={styles.settingIcon} />
            <Text style={[styles.settingText, { color: theme.text }]}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
          onPress={() => router.push("/terms-of-service")}
        >
          <View style={styles.settingInfo}>
            <Ionicons name="document-text-outline" size={24} color={theme.text} style={styles.settingIcon} />
            <Text style={[styles.settingText, { color: theme.text }]}>Terms of Service</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
          onPress={handleLogout}
        >
          <View style={styles.settingInfo}>
            <Ionicons name="log-out-outline" size={24} color="#F44336" style={styles.settingIcon} />
            <Text style={[styles.settingText, { color: "#F44336" }]}>Logout</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
        </TouchableOpacity>

        <View style={styles.versionInfo}>
          <Text style={[styles.versionText, { color: theme.textDim }]}>Version {appVersion}</Text>
          <Text style={[styles.versionText, { color: theme.textDim, marginTop: 4 }]}>
            {isConnected ? "Online" : "Offline"} Mode
          </Text>
        </View>

        <VerifyAction
          visible={showLogoutConfirmation}
          title="Confirm Logout"
          message="Are you sure you want to log out? You will need to sign in again to access your account."
          confirmText="Logout"
          destructive={true}
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutConfirmation(false)}
        />

        <VerifyAction
          visible={showClearDataConfirmation}
          title="Clear Cache"
          message="This will clear all cached data. Your account information will remain intact. Continue?"
          confirmText="Clear"
          destructive={true}
          onConfirm={confirmClearCache}
          onCancel={() => setShowClearDataConfirmation(false)}
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 16,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: "600",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingIcon: {
    marginRight: 16,
  },
  settingText: {
    fontSize: 16,
  },
  settingSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  versionInfo: {
    alignItems: "center",
    padding: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  versionText: {
    fontSize: 14,
  },
})
