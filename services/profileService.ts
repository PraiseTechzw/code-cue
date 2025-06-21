import { databases, account, DATABASE_ID, COLLECTION_IDS } from "@/lib/appwrite"
import type { Profile } from "@/types/appwrite"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ID, Query } from 'appwrite'

export type { Profile }

// Cache keys
const CACHE_KEYS = {
  PROFILE: 'profile_cache'
}

// Get current user profile
export const getProfile = async (): Promise<Profile | null> => {
    try {
    const user = await account.get()
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.PROFILES,
      [Query.equal('user_id', user.$id)]
    )

    if (documents.length > 0) {
      const profile = documents[0] as unknown as Profile
      await AsyncStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify(profile))
      return profile
    }

    return null
    } catch (error) {
    console.error("Error getting profile:", error)
        return null
      }
    }

// Create or update profile
export const upsertProfile = async (profileData: Partial<Profile>): Promise<Profile | null> => {
  try {
    const user = await account.get()
    const now = new Date().toISOString()

    // Check if profile exists
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.PROFILES,
      [Query.equal('user_id', user.$id)]
    )

    let profile: Profile

    if (documents.length > 0) {
      // Update existing profile
      const existingProfile = documents[0] as unknown as Profile
      const updatedProfile = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.PROFILES,
        existingProfile.$id,
        {
          ...profileData,
          user_id: user.$id
        }
      ) as unknown as Profile
      profile = updatedProfile
    } else {
      // Create new profile
      const newProfile = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.PROFILES,
        ID.unique(),
        {
          ...profileData,
          user_id: user.$id,
          role: profileData.role || 'user'
        }
      ) as unknown as Profile
      profile = newProfile
    }

    // Update cache
    await AsyncStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify(profile))
    return profile
    } catch (error) {
    console.error("Error upserting profile:", error)
    return null
  }
}

// Update profile
export const updateProfile = async (updates: Partial<Profile>): Promise<Profile | null> => {
  try {
    const user = await account.get()
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.PROFILES,
      [Query.equal('user_id', user.$id)]
    )

    if (documents.length === 0) {
      throw new Error("Profile not found")
    }

    const existingProfile = documents[0] as unknown as Profile
    const updatedProfile = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.PROFILES,
      existingProfile.$id,
      updates
    ) as unknown as Profile

    // Update cache
    await AsyncStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify(updatedProfile))
          return updatedProfile
  } catch (error) {
    console.error("Error updating profile:", error)
    return null
  }
}

// Profile service object
export const profileService = {
  async getProfile() {
    return await getProfile()
  },

  async upsertProfile(profileData: Partial<Profile>) {
    return await upsertProfile(profileData)
  },

  async updateProfile(updates: Partial<Profile>) {
    return await updateProfile(updates)
  },

  async updateTheme(theme: "light" | "dark") {
    return await updateProfile({ theme })
  }
}
