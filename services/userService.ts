import { databases, account, storage, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite"
import * as ImagePicker from "expo-image-picker"
import { ID, Query } from 'appwrite'

class UserService {
  async uploadProfileImage(uri: string): Promise<string | null> {
    try {
      const userData = await account.get()
      if (!userData) throw new Error("User not authenticated")

      // Convert image to blob
      const response = await fetch(uri)
      const blob = await response.blob()

      // Upload to Appwrite Storage
      const fileExt = uri.split(".").pop()
      const fileName = `${userData.$id}-${Date.now()}.${fileExt}`
      const uploadedFile = await storage.createFile(
        'profile-images',
        ID.unique(),
        blob
      )

      // Get public URL
      const publicUrl = storage.getFileView('profile-images', uploadedFile.$id)

      // Update user profile
      const { documents: profiles } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        [Query.equal('user_id', userData.$id)]
      )

      if (profiles.length > 0) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.PROFILES,
          profiles[0].$id,
          { avatar_url: publicUrl }
        )
      }

      return publicUrl
    } catch (error) {
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

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri
      }

      return null
    } catch (error) {
      return null
    }
  }

  async takePhoto(): Promise<string | null> {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri
      }

      return null
    } catch (error) {
      return null
    }
  }

  async getProfile(): Promise<any> {
    try {
      const userData = await account.get()
      if (!userData) throw new Error("User not authenticated")

      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        [Query.equal('user_id', userData.$id)]
      )

      if (documents.length > 0) {
        return documents[0]
      }

      return null
    } catch (error) {
      return null
    }
  }
}

export const userService = new UserService() 