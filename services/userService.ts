import { supabase } from "@/lib/supabase"
import * as ImagePicker from "expo-image-picker"

class UserService {
  async uploadProfileImage(uri: string): Promise<string | null> {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) throw new Error("User not authenticated")

      // Convert image to blob
      const response = await fetch(uri)
      const blob = await response.blob()

      // Upload to Supabase Storage
      const fileExt = uri.split(".").pop()
      const fileName = `${userData.user.id}-${Date.now()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from("profile-images")
        .upload(fileName, blob)

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("profile-images")
        .getPublicUrl(fileName)

      // Update user profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userData.user.id)

      if (updateError) throw updateError

      return publicUrl
    } catch (error) {
      console.error("Error uploading profile image:", error)
      return null
    }
  }

  async pickImage(): Promise<string | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled) {
        return result.assets[0].uri
      }
      return null
    } catch (error) {
      console.error("Error picking image:", error)
      return null
    }
  }

  async updateProfile(data: { username?: string; full_name?: string; bio?: string }): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) throw new Error("User not authenticated")

      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", userData.user.id)

      if (error) throw error
      return true
    } catch (error) {
      console.error("Error updating profile:", error)
      return false
    }
  }

  async getProfile(): Promise<any> {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) throw new Error("User not authenticated")

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error getting profile:", error)
      return null
    }
  }
}

export const userService = new UserService() 