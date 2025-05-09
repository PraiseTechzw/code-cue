import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"
import AsyncStorage from "@react-native-async-storage/async-storage"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type UpdateProfile = Database["public"]["Tables"]["profiles"]["Update"]

export const profileService = {
  async getProfile() {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (error && error.code !== "PGRST116") throw error // PGRST116 is "no rows returned"

      // If no profile exists, create one
      if (!data) {
        return this.createProfile(user.id)
      }

      // Cache profile locally
      await AsyncStorage.setItem("profile", JSON.stringify(data))

      return data
    } catch (error) {
      console.error("Error fetching profile:", error)

      // Try to get from local storage if offline
      try {
        const profileJson = await AsyncStorage.getItem("profile")
        return profileJson ? JSON.parse(profileJson) : null
      } catch (storageError) {
        console.error("Error getting profile from AsyncStorage:", storageError)
        return null
      }
    }
  },

  async createProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          full_name: "",
          theme: "light",
        })
        .select()
        .single()

      if (error) throw error

      // Cache profile locally
      await AsyncStorage.setItem("profile", JSON.stringify(data))

      return data
    } catch (error) {
      console.error("Error creating profile:", error)
      throw error
    }
  },

  async updateProfile(updates: UpdateProfile) {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single()

      if (error) throw error

      // Update local cache
      const currentProfile = await this.getProfile()
      const updatedProfile = { ...currentProfile, ...updates }
      await AsyncStorage.setItem("profile", JSON.stringify(updatedProfile))

      return data
    } catch (error) {
      console.error("Error updating profile:", error)

      // If offline, store locally and sync later
      try {
        const profileJson = await AsyncStorage.getItem("profile")
        if (profileJson) {
          const profile = JSON.parse(profileJson)
          const updatedProfile = { ...profile, ...updates }
          await AsyncStorage.setItem("profile", JSON.stringify(updatedProfile))

          // Add to offline changes
          const offlineChange = {
            table_name: "profiles",
            record_id: profile.id,
            operation: "UPDATE",
            data: updates,
          }

          const changesJson = await AsyncStorage.getItem("offlineChanges")
          const changes = changesJson ? JSON.parse(changesJson) : []
          await AsyncStorage.setItem("offlineChanges", JSON.stringify([...changes, offlineChange]))

          return updatedProfile
        }
      } catch (storageError) {
        console.error("Error updating profile in AsyncStorage:", storageError)
      }

      throw error
    }
  },

  async updateTheme(theme: "light" | "dark") {
    return this.updateProfile({ theme })
  },
}
