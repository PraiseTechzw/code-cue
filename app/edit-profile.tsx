"use client"

import { useState, useEffect } from "react"
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native"
import { useRouter } from "expo-router"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"
import { profileService } from "@/services/profileService"
import Colors from "@/constants/Colors"
import { supabase } from "@/lib/supabase"
import { ConnectionStatus } from "@/components/ConnectionStatus"

export default function EditProfileScreen() {
  const router = useRouter()
  const { user, isConnected } = useAuth()
  const { showToast } = useToast()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const [fullName, setFullName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    loadProfile()
  }, [user])

  const loadProfile = async () => {
    if (user) {
      try {
        setLoading(true)
        const profile = await profileService.getProfile()
        if (profile) {
          setFullName(profile.full_name || "")
          setAvatarUrl(profile.avatar_url || null)
        }
      } catch (error) {
        console.error("Error loading profile:", error)
        showToast("Failed to load profile", { type: "error" })
      } finally {
        setLoading(false)
      }
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleSave = async () => {
    if (!user) return

    try {
      setSaving(true)
      await profileService.updateProfile({
        full_name: fullName,
        avatar_url: avatarUrl,
      })
      showToast("Profile updated successfully", { type: "success" })
      router.back()
    } catch (error) {
      console.error("Error updating profile:", error)

      if (!isConnected) {
        showToast("Profile will be updated when you're back online", { type: "info" })
        router.back()
      } else {
        showToast("Failed to update profile", { type: "error" })
      }
    } finally {
      setSaving(false)
    }
  }

  const handlePickImage = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You need to grant permission to access your photos.")
        return
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0]

        if (!isConnected) {
          // Just store the local URI if offline
          setAvatarUrl(selectedImage.uri)
          showToast("Image will be uploaded when you're back online", { type: "info" })
          return
        }

        // Upload to Supabase Storage
        await uploadAvatar(selectedImage.uri)
      }
    } catch (error) {
      console.error("Error picking image:", error)
      showToast("Failed to pick image", { type: "error" })
    }
  }

  const uploadAvatar = async (uri: string) => {
    try {
      if (!user) return

      // Show progress
      setUploadProgress(0)

      // Convert URI to Blob
      const response = await fetch(uri)
      const blob = await response.blob()

      // Generate a unique file name
      const fileExt = uri.split(".").pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage.from("profiles").upload(filePath, blob, {
        upsert: true,
        contentType: `image/${fileExt}`,
        cacheControl: "3600",
      })

      if (uploadError) throw uploadError

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("profiles").getPublicUrl(filePath)

      // Update avatar URL
      setAvatarUrl(publicUrl)
      setUploadProgress(100)

      showToast("Avatar uploaded successfully", { type: "success" })
    } catch (error) {
      console.error("Error uploading avatar:", error)
      showToast("Failed to upload avatar", { type: "error" })
      setUploadProgress(0)
    }
  }

  const handleTakePhoto = async () => {
    try {
      // Request camera permissions
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync()

      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You need to grant permission to access your camera.")
        return
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0]

        if (!isConnected) {
          // Just store the local URI if offline
          setAvatarUrl(selectedImage.uri)
          showToast("Image will be uploaded when you're back online", { type: "info" })
          return
        }

        // Upload to Supabase Storage
        await uploadAvatar(selectedImage.uri)
      }
    } catch (error) {
      console.error("Error taking photo:", error)
      showToast("Failed to take photo", { type: "error" })
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ConnectionStatus />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={theme.tint} />
          ) : (
            <Text style={[styles.saveButton, { color: theme.tint }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <Image
              source={avatarUrl ? { uri: avatarUrl } : require("@/assets/images/default-avatar.png")}
              style={styles.avatar}
            />

            {uploadProgress > 0 && uploadProgress < 100 && (
              <View style={styles.progressOverlay}>
                <Text style={styles.progressText}>{uploadProgress}%</Text>
              </View>
            )}

            <View style={styles.avatarActions}>
              <TouchableOpacity
                onPress={handlePickImage}
                style={[styles.avatarButton, { backgroundColor: theme.tintLight }]}
              >
                <Ionicons name="image-outline" size={20} color={theme.tint} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTakePhoto}
                style={[styles.avatarButton, { backgroundColor: theme.tintLight }]}
              >
                <Ionicons name="camera-outline" size={20} color={theme.tint} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            placeholderTextColor={theme.textDim}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>Email</Text>
          <View
            style={[
              styles.input,
              styles.disabledInput,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.disabledText, { color: theme.textDim }]}>{user?.email}</Text>
          </View>
          <Text style={[styles.helperText, { color: theme.textDim }]}>Email cannot be changed</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  avatarContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  progressOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  avatarActions: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  disabledInput: {
    justifyContent: "center",
  },
  disabledText: {
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
})
