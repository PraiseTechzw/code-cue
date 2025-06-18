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
import { storage, account, ID } from "@/lib/appwrite"
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
        showToast("Failed to load profile", "error")
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
      showToast("Profile updated successfully", "success")
      router.back()
    } catch (error) {
      console.error("Error updating profile:", error)

      if (!isConnected) {
        showToast("Profile will be updated when you're back online", "info")
        router.back()
      } else {
        showToast("Failed to update profile", "error")
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
          showToast("Image will be uploaded when you're back online", "info")
          return
        }

        // Upload to Appwrite Storage
        await uploadAvatar(selectedImage.uri)
      }
    } catch (error) {
      console.error("Error picking image:", error)
      showToast("Failed to pick image", "error")
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
      const fileName = `${user.$id}-${Date.now()}.${fileExt}`

      // Upload to Appwrite Storage
      const uploadedFile = await storage.createFile(
        'profile-images',
        ID.unique(),
        blob
      )

      // Get public URL
      const publicUrl = storage.getFileView('profile-images', uploadedFile.$id)

      // Update avatar URL
      setAvatarUrl(publicUrl)
      setUploadProgress(100)

      showToast("Avatar uploaded successfully", "success")
    } catch (error) {
      console.error("Error uploading avatar:", error)
      showToast("Failed to upload avatar", "error")
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
          showToast("Image will be uploaded when you're back online", "info")
          return
        }

        // Upload to Appwrite Storage
        await uploadAvatar(selectedImage.uri)
      }
    } catch (error) {
      console.error("Error taking photo:", error)
      showToast("Failed to take photo", "error")
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl(null)
    showToast("Avatar removed", "success")
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ConnectionStatus />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.background} />
          ) : (
            <Text style={[styles.saveButtonText, { color: theme.background }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarContainer, { borderColor: theme.border }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.secondary }]}>
                <Ionicons name="person" size={40} color={theme.text} />
              </View>
            )}
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <View style={styles.uploadProgress}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.uploadProgressText, { color: theme.text }]}>
                  Uploading... {uploadProgress}%
                </Text>
              </View>
            )}
          </View>

          <View style={styles.avatarActions}>
            <TouchableOpacity
              onPress={handlePickImage}
              style={[styles.avatarButton, { backgroundColor: theme.primary }]}
            >
              <Ionicons name="images" size={20} color={theme.background} />
              <Text style={[styles.avatarButtonText, { color: theme.background }]}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleTakePhoto}
              style={[styles.avatarButton, { backgroundColor: theme.primary }]}
            >
              <Ionicons name="camera" size={20} color={theme.background} />
              <Text style={[styles.avatarButtonText, { color: theme.background }]}>Camera</Text>
            </TouchableOpacity>

            {avatarUrl && (
              <TouchableOpacity
                onPress={handleRemoveAvatar}
                style={[styles.avatarButton, { backgroundColor: theme.error }]}
              >
                <Ionicons name="trash" size={20} color={theme.background} />
                <Text style={[styles.avatarButtonText, { color: theme.background }]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border
              }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="words"
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#007AFF",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    overflow: "hidden",
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadProgress: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadProgressText: {
    fontSize: 12,
    marginTop: 4,
  },
  avatarActions: {
    flexDirection: "row",
    gap: 12,
  },
  avatarButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  avatarButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  formSection: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
})
