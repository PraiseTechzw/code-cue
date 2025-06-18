import * as Notifications from "expo-notifications"
import * as Device from "expo-device"
import { Platform } from "react-native"
import { databases, account, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Notification } from "@/types/appwrite"
import { ID, Query } from 'appwrite'

export type { Notification }

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Register for push notifications
export const registerForPushNotificationsAsync = async () => {
  let token

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    })
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!")
      return
    }
    token = (await Notifications.getExpoPushTokenAsync()).data
  } else {
    alert("Must use physical device for Push Notifications")
  }

  return token
}

// Store push token in user profile
export const storePushToken = async (token: string) => {
  try {
    // Store the token in Appwrite profile
    const user = await account.get()
    
    // Update user profile with push token
    const { documents: profiles } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      [Query.equal('user_id', user.$id)]
    )

    if (profiles.length > 0) {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        profiles[0].$id,
        { push_token: token }
      )
    }
  } catch (error) {
    console.error("Error storing push token:", error)
  }
}

// Get notifications
export const getNotifications = async (): Promise<Notification[]> => {
  try {
    const user = await account.get()
    
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      [
        Query.equal('user_id', user.$id),
        Query.orderDesc('$createdAt')
      ]
    )

    return documents as unknown as Notification[]
  } catch (error) {
    console.error("Error getting notifications:", error)
    return []
  }
}

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      notificationId,
      { read: true }
    )
    return true
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return false
  }
}

// Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  try {
    const user = await account.get()
    
    // Get all unread notifications
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      [
        Query.equal('user_id', user.$id),
        Query.equal('read', false)
      ]
    )

    // Update each notification
    for (const notification of documents) {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.NOTIFICATIONS,
        notification.$id,
        { read: true }
      )
    }

    return true
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return false
  }
}

// Create notification
export const createNotification = async (
  title: string,
  description: string | null,
  type: string,
  relatedId?: string,
  relatedType?: string
): Promise<Notification | null> => {
  try {
    const user = await account.get()
    
    const newNotification = {
      title,
      description,
      type,
      read: false,
      user_id: user.$id,
      related_id: relatedId || null,
      related_type: relatedType || null
    }

    const createdNotification = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      ID.unique(),
      newNotification
    ) as unknown as Notification

    return createdNotification
  } catch (error) {
    console.error("Error creating notification:", error)
    return null
  }
}

// Get unread notification count
export const getUnreadNotificationCount = async (): Promise<number> => {
  try {
    const user = await account.get()
    
    const { total } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      [
        Query.equal('user_id', user.$id),
        Query.equal('read', false)
      ]
    )

    return total
  } catch (error) {
    console.error("Error getting unread notification count:", error)
    return 0
  }
}

export const notificationService = {
  async initialize() {
    try {
      const token = await registerForPushNotificationsAsync()
      if (token) {
        await AsyncStorage.setItem("pushToken", token)

        // Store the token in Appwrite profile
        await storePushToken(token)

        // Configure for Android
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
          })
        }
      }
    } catch (error) {
      console.error("Error initializing notifications:", error)
    }
  },

  async getNotifications() {
    try {
      const user = await account.get()
      if (!user) throw new Error("User not authenticated")

      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NOTIFICATIONS,
        [
          Query.equal('user_id', user.$id),
          Query.orderDesc('$createdAt')
        ]
      )

      // Cache notifications locally
      await AsyncStorage.setItem("notifications", JSON.stringify(documents))

      return documents as unknown as Notification[]
    } catch (error) {
      console.error("Error fetching notifications:", error)

      // Try to get from cache
      try {
        const cached = await AsyncStorage.getItem("notifications")
        return cached ? JSON.parse(cached) : []
      } catch (cacheError) {
        console.error("Error getting cached notifications:", cacheError)
        return []
      }
    }
  },

  async markAsRead(notificationId: string) {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.NOTIFICATIONS,
        notificationId,
        { read: true }
      )

      // Update local cache
      const notificationsJson = await AsyncStorage.getItem("notifications")
      if (notificationsJson) {
        const notifications = JSON.parse(notificationsJson)
        const updatedNotifications = notifications.map((n: any) =>
          n.$id === notificationId ? { ...n, read: true } : n
        )
        await AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifications))
      }

      return true
    } catch (error) {
      console.error("Error marking notification as read:", error)
      return false
    }
  },

  async markAllAsRead() {
    try {
      const user = await account.get()
      if (!user) throw new Error("User not authenticated")

      // Get all unread notifications
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NOTIFICATIONS,
        [
          Query.equal('user_id', user.$id),
          Query.equal('read', false)
        ]
      )

      // Update each notification
      for (const notification of documents) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.NOTIFICATIONS,
          notification.$id,
          { read: true }
        )
      }

      // Update local cache
      const notificationsJson = await AsyncStorage.getItem("notifications")
      if (notificationsJson) {
        const notifications = JSON.parse(notificationsJson)
        const updatedNotifications = notifications.map((n: any) => ({ ...n, read: true }))
        await AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifications))
      }

      return true
    } catch (error) {
      console.error("Error marking all notifications as read:", error)

      // If offline, store locally
      try {
        const user = await account.get()
        if (!user) throw new Error("User not authenticated")

        // Add to offline changes
        const offlineChange = {
          table_name: "notifications",
          record_id: "all",
          operation: "MARK_ALL_READ",
          data: { user_id: user.$id },
        }

        // Store offline change
        const offlineChangesJson = await AsyncStorage.getItem("offlineChanges")
        const offlineChanges = offlineChangesJson ? JSON.parse(offlineChangesJson) : []
        offlineChanges.push(offlineChange)
        await AsyncStorage.setItem("offlineChanges", JSON.stringify(offlineChanges))

        // Update local cache
        const notificationsJson = await AsyncStorage.getItem("notifications")
        if (notificationsJson) {
          const notifications = JSON.parse(notificationsJson)
          const updatedNotifications = notifications.map((n: any) => ({ ...n, read: true }))
          await AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifications))
        }

        return true
      } catch (offlineError) {
        console.error("Error handling offline mark all as read:", offlineError)
        return false
      }
    }
  },

  async createNotification(notification: Omit<Notification, "$id" | "$createdAt" | "user_id">) {
    try {
      const user = await account.get()
      if (!user) throw new Error("User not authenticated")

      const newNotification = {
        ...notification,
        user_id: user.$id,
      }

      const createdNotification = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.NOTIFICATIONS,
        ID.unique(),
        newNotification
      ) as unknown as Notification

      // Update local cache
      const notificationsJson = await AsyncStorage.getItem("notifications")
      const notifications = notificationsJson ? JSON.parse(notificationsJson) : []
      await AsyncStorage.setItem("notifications", JSON.stringify([createdNotification, ...notifications]))

      // Send local notification
      await this.sendLocalNotification(notification.title, notification.description || "")

      return createdNotification
    } catch (error) {
      console.error("Error creating notification:", error)

      // If offline, store locally
      try {
        const user = await account.get()
        if (!user) throw new Error("User not authenticated")

        const tempId = `temp_${Date.now()}`
        const tempNotification = {
          ...notification,
          user_id: user.$id,
          $id: tempId,
          $createdAt: new Date().toISOString(),
          read: false,
        }

        // Store locally
        const notificationsJson = await AsyncStorage.getItem("notifications")
        const notifications = notificationsJson ? JSON.parse(notificationsJson) : []
        await AsyncStorage.setItem("notifications", JSON.stringify([tempNotification, ...notifications]))

        // Add to offline changes
        const offlineChange = {
          table_name: "notifications",
          record_id: tempId,
          operation: "INSERT",
          data: {
            ...notification,
            user_id: user.$id,
          },
        }

        const offlineChangesJson = await AsyncStorage.getItem("offlineChanges")
        const offlineChanges = offlineChangesJson ? JSON.parse(offlineChangesJson) : []
        offlineChanges.push(offlineChange)
        await AsyncStorage.setItem("offlineChanges", JSON.stringify(offlineChanges))

        // Send local notification
        await this.sendLocalNotification(notification.title, notification.description || "")

        return tempNotification
      } catch (offlineError) {
        console.error("Error handling offline notification creation:", offlineError)
        return null
      }
    }
  },

  async sendLocalNotification(title: string, body: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
        },
        trigger: null, // Send immediately
      })
    } catch (error) {
      console.error("Error sending local notification:", error)
    }
  },

  async getUnreadCount() {
    try {
      const user = await account.get()
      if (!user) return 0

      const { total } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NOTIFICATIONS,
        [
          Query.equal('user_id', user.$id),
          Query.equal('read', false)
        ]
      )

      return total
    } catch (error) {
      console.error("Error getting unread count:", error)
      return 0
    }
  },
}
