"use client"
import React, { useEffect, useState } from "react"
import { View, Text, StyleSheet, Switch, TouchableOpacity, Image, ScrollView, Platform } from "react-native"
import { useRouter } from "expo-router"
import { useToast } from "@/contexts/ToastContext"
import { notificationService } from "@/services/notificationService"
import { userService } from "@/services/userService"
import { supabase } from "@/lib/supabase"
import { useTheme } from "@/contexts/ThemeContext"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated"

export default function SettingsScreen() {
  const router = useRouter()
  const { showToast } = useToast()
  const { isDarkMode, toggleTheme } = useTheme()
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [isPushEnabled, setIsPushEnabled] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    checkNotificationPermission()
    loadProfile()
  }, [])

  const checkNotificationPermission = async () => {
    const hasPermission = await notificationService.hasNotificationPermission()
    setIsPushEnabled(hasPermission)
  }

  const loadProfile = async () => {
    const profileData = await userService.getProfile()
    setProfile(profileData)
    if (profileData?.avatar_url) {
      setProfileImage(profileData.avatar_url)
    }
  }

  const handleImagePick = async () => {
    try {
      const imageUri = await userService.pickImage()
      if (imageUri) {
        setIsUploading(true)
        const uploadedUrl = await userService.uploadProfileImage(imageUri)
        if (uploadedUrl) {
          setProfileImage(uploadedUrl)
          showToast("Profile image updated successfully", "success")
        } else {
          showToast("Failed to upload profile image", "error")
        }
      }
    } catch (error) {
      showToast("Error picking image", "error")
    } finally {
      setIsUploading(false)
    }
  }

  const handlePushToggle = async (value: boolean) => {
    if (value) {
      const permission = await notificationService.requestNotificationPermission()
      if (!permission) {
        showToast("Notification permission denied", "error")
        return
      }
    }
    const success = await notificationService.updateNotificationSettings(value)
    if (success) {
      setIsPushEnabled(value)
      showToast(value ? "Push notifications enabled" : "Push notifications disabled", "success")
    } else {
      showToast("Failed to update notification settings", "error")
    }
  }

  const handleOfflineToggle = (value: boolean) => {
    setIsOfflineMode(value)
    showToast(value ? "Offline mode enabled" : "Offline mode disabled", "info")
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.replace("/auth/login")
    } catch (error) {
      showToast("Error signing out", "error")
    }
  }

  const SettingItem = ({ icon, title, value, onValueChange, type = "switch", onPress }: any) => (
    <Animated.View entering={FadeInDown} style={[styles.settingItem, isDarkMode && styles.darkSettingItem]}>
      <TouchableOpacity 
        style={styles.settingLeft} 
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={[styles.iconContainer, isDarkMode && styles.darkIconContainer]}>
          <Ionicons name={icon} size={22} color={isDarkMode ? "#fff" : "#000"} />
        </View>
        <Text style={[styles.settingLabel, isDarkMode && styles.darkText]}>{title}</Text>
      </TouchableOpacity>
      {type === "switch" ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: "#767577", true: isDarkMode ? "#4a4a4a" : "#81b0ff" }}
          thumbColor={value ? (isDarkMode ? "#fff" : "#007AFF") : "#f4f3f4"}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#666" : "#999"} />
      )}
    </Animated.View>
  )

  return (
    <ScrollView 
      style={[styles.container, isDarkMode && styles.darkContainer]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={isDarkMode ? ["#1a1a1a", "#2a2a2a"] : ["#fff", "#f5f5f5"]}
        style={styles.header}
      >
        <TouchableOpacity 
          onPress={handleImagePick} 
          disabled={isUploading}
          style={styles.profileSection}
        >
          <View style={styles.profileImageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImagePlaceholder, isDarkMode && styles.darkProfileImagePlaceholder]}>
                <Ionicons name="person" size={40} color={isDarkMode ? "#666" : "#999"} />
              </View>
            )}
            <View style={[styles.editIconContainer, isDarkMode && styles.darkEditIconContainer]}>
              <Ionicons name="camera" size={16} color={isDarkMode ? "#fff" : "#000"} />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, isDarkMode && styles.darkText]}>
              {profile?.full_name || "Add Your Name"}
            </Text>
            <Text style={[styles.profileEmail, isDarkMode && styles.darkSubText]}>
              {profile?.email || "Add your email"}
            </Text>
            <Text style={[styles.lastLogin, isDarkMode && styles.darkSubText]}>
              Last login: {profile?.last_sign_in_at ? new Date(profile.last_sign_in_at).toLocaleDateString() : "N/A"}
            </Text>
          </View>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>
        <Animated.View entering={FadeInUp} style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Account</Text>
          
          <SettingItem
            icon="person-outline"
            title="Edit Profile"
            type="link"
            onPress={() => router.push({ pathname: "/(tabs)/edit-profile" } as any)}
          />

          <SettingItem
            icon="lock-closed-outline"
            title="Change Password"
            type="link"
            onPress={() => router.push({ pathname: "/auth/change-password" } as any)}
          />

          <SettingItem
            icon="mail-outline"
            title="Email Preferences"
            type="link"
            onPress={() => router.push({ pathname: "/settings/email-preferences" } as any)}
          />

          <SettingItem
            icon="shield-checkmark-outline"
            title="Two-Factor Authentication"
            type="link"
            onPress={() => router.push({ pathname: "/settings/2fa" } as any)}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100)} style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Preferences</Text>
          
          <SettingItem
            icon="moon-outline"
            title="Dark Mode"
            value={isDarkMode}
            onValueChange={toggleTheme}
          />

          <SettingItem
            icon="cloud-offline-outline"
            title="Offline Mode"
            value={isOfflineMode}
            onValueChange={handleOfflineToggle}
          />

          <SettingItem
            icon="notifications-outline"
            title="Push Notifications"
            value={isPushEnabled}
            onValueChange={handlePushToggle}
          />

          <SettingItem
            icon="language-outline"
            title="Language"
            type="link"
            onPress={() => router.push({ pathname: "/settings/language" } as any)}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200)} style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Privacy & Security</Text>
          
          <SettingItem
            icon="eye-outline"
            title="Privacy Settings"
            type="link"
            onPress={() => router.push({ pathname: "/settings/privacy" } as any)}
          />

          <SettingItem
            icon="shield-outline"
            title="Security Settings"
            type="link"
            onPress={() => router.push({ pathname: "/settings/security" } as any)}
          />

          <SettingItem
            icon="download-outline"
            title="Download My Data"
            type="link"
            onPress={() => router.push({ pathname: "/settings/download-data" } as any)}
          />

          <SettingItem
            icon="trash-outline"
            title="Delete Account"
            type="link"
            onPress={() => router.push({ pathname: "/settings/delete-account" } as any)}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300)} style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Support & Legal</Text>
          
          <SettingItem
            icon="help-circle-outline"
            title="Help Center"
            type="link"
            onPress={() => router.push({ pathname: "/settings/help" } as any)}
          />

          <SettingItem
            icon="document-text-outline"
            title="Terms of Service"
            type="link"
            onPress={() => router.push({ pathname: "/settings/terms" } as any)}
          />

          <SettingItem
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            type="link"
            onPress={() => router.push({ pathname: "/settings/privacy-policy" } as any)}
          />

          <SettingItem
            icon="information-circle-outline"
            title="About"
            type="link"
            onPress={() => router.push({ pathname: "/settings/about" } as any)}
          />
        </Animated.View>

        <TouchableOpacity
          style={[styles.signOutButton, isDarkMode && styles.darkSignOutButton]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" style={styles.signOutIcon} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, isDarkMode && styles.darkSubText]}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  darkContainer: {
    backgroundColor: "#000",
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
    position: "relative",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  darkProfileImagePlaceholder: {
    backgroundColor: "#2a2a2a",
  },
  editIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkEditIconContainer: {
    backgroundColor: "#333",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: "#666",
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 15,
    color: "#000",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  darkSettingItem: {
    backgroundColor: "#1a1a1a",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  darkIconContainer: {
    backgroundColor: "#2a2a2a",
  },
  dangerIconContainer: {
    backgroundColor: "#FFE5E5",
  },
  settingLabel: {
    fontSize: 16,
    color: "#000",
  },
  darkText: {
    color: "#fff",
  },
  darkSubText: {
    color: "#999",
  },
  dangerText: {
    color: "#FF3B30",
  },
  version: {
    textAlign: "center",
    fontSize: 14,
    color: "#999",
    marginTop: 20,
    marginBottom: 40,
  },
  lastLogin: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE5E5",
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  darkSignOutButton: {
    backgroundColor: "#2A1A1A",
  },
  signOutIcon: {
    marginRight: 8,
  },
  signOutText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
  },
})
