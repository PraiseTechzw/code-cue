import * as Notifications from "expo-notifications"
import * as Device from "expo-device"
import { Platform } from "react-native"
import { supabase } from "@/lib/supabase"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Database } from "@/types/supabase"

export type Notification = Database["public"]["Tables"]["notifications"]["Row"]
export type NewNotification = Database["public"]["Tables"]["notifications"]["Insert"]

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export const notificationService = {
  async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.log("Push Notifications are not available on emulator")
      return null
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!")
        return null
      }

      // Get the token
      const token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PROJECT_ID,
        })
      ).data

      // Store the token in AsyncStorage
      await AsyncStorage.setItem("pushToken", token)

      // Store the token in Supabase profile
      const user = (await supabase.auth.getUser()).data.user
      if (user) {
        await supabase.from("profiles").update({ push_token: token }).eq("id", user.id)
      }

      // Configure for Android
      if (Platform.OS === "android") {
        Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#6366F1",
        })
      }

      return token
    } catch (error) {
      console.error("Error registering for push notifications:", error)
      return null
    }
  },

  async getNotifications() {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Cache notifications locally
      await AsyncStorage.setItem("notifications", JSON.stringify(data))

      return data || []
    } catch (error) {
      console.error("Error fetching notifications:", error)

      // Try to get from local storage if offline
      try {
        const notificationsJson = await AsyncStorage.getItem("notifications")
        return notificationsJson ? JSON.parse(notificationsJson) : []
      } catch (storageError) {
        console.error("Error getting notifications from AsyncStorage:", storageError)
        return []
      }
    }
  },

  async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId)

      if (error) throw error

      // Update local cache
      const notificationsJson = await AsyncStorage.getItem("notifications")
      if (notificationsJson) {
        const notifications = JSON.parse(notificationsJson)
        const updatedNotifications = notifications.map((n: Notification) =>
          n.id === notificationId ? { ...n, read: true } : n,
        )
        await AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifications))
      }

      return true
    } catch (error) {
      console.error("Error marking notification as read:", error)

      // If offline, update locally
      try {
        const notificationsJson = await AsyncStorage.getItem("notifications")
        if (notificationsJson) {
          const notifications = JSON.parse(notificationsJson)
          const updatedNotifications = notifications.map((n: Notification) =>
            n.id === notificationId ? { ...n, read: true } : n,
          )
          await AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifications))

          // Add to offline changes
          const offlineChange = {
            table_name: "notifications",
            record_id: notificationId,
            operation: "UPDATE",
            data: { read: true },
          }

          const changesJson = await AsyncStorage.getItem("offlineChanges")
          const changes = changesJson ? JSON.parse(changesJson) : []
          await AsyncStorage.setItem("offlineChanges", JSON.stringify([...changes, offlineChange]))
        }
        return true
      } catch (storageError) {
        console.error("Error updating notification in AsyncStorage:", storageError)
        return false
      }
    }
  },

  async markAllAsRead() {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false)

      if (error) throw error

      // Update local cache
      const notificationsJson = await AsyncStorage.getItem("notifications")
      if (notificationsJson) {
        const notifications = JSON.parse(notificationsJson)
        const updatedNotifications = notifications.map((n: Notification) => ({ ...n, read: true }))
        await AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifications))
      }

      return true
    } catch (error) {
      console.error("Error marking all notifications as read:", error)

      // If offline, update locally
      try {
        const notificationsJson = await AsyncStorage.getItem("notifications")
        if (notificationsJson) {
          const notifications = JSON.parse(notificationsJson)
          const updatedNotifications = notifications.map((n: Notification) => ({ ...n, read: true }))
          await AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifications))

          // Add to offline changes
          const user = (await supabase.auth.getUser()).data.user
          if (user) {
            const offlineChange = {
              table_name: "notifications",
              record_id: "all",
              operation: "MARK_ALL_READ",
              data: { user_id: user.id },
            }

            const changesJson = await AsyncStorage.getItem("offlineChanges")
            const changes = changesJson ? JSON.parse(changesJson) : []
            await AsyncStorage.setItem("offlineChanges", JSON.stringify([...changes, offlineChange]))
          }
        }
        return true
      } catch (storageError) {
        console.error("Error updating notifications in AsyncStorage:", storageError)
        return false
      }
    }
  },

  async createNotification(notification: Omit<NewNotification, "user_id">) {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("User not authenticated")

      const newNotification: NewNotification = {
        ...notification,
        user_id: user.id,
      }

      const { data, error } = await supabase.from("notifications").insert(newNotification).select().single()

      if (error) throw error

      // Update local cache
      const notificationsJson = await AsyncStorage.getItem("notifications")
      const notifications = notificationsJson ? JSON.parse(notificationsJson) : []
      await AsyncStorage.setItem("notifications", JSON.stringify([data, ...notifications]))

      // Send local notification
      await this.sendLocalNotification(notification.title, notification.description || "")

      return data
    } catch (error) {
      console.error("Error creating notification:", error)

      // If offline, store locally
      try {
        const user = (await supabase.auth.getUser()).data.user
        if (!user) throw new Error("User not authenticated")

        const tempId = `temp_${Date.now()}`
        const tempNotification = {
          ...notification,
          user_id: user.id,
          id: tempId,
          created_at: new Date().toISOString(),
          read: false,
        }

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
            user_id: user.id,
          },
        }

        const changesJson = await AsyncStorage.getItem("offlineChanges")
        const changes = changesJson ? JSON.parse(changesJson) : []
        await AsyncStorage.setItem("offlineChanges", JSON.stringify([...changes, offlineChange]))

        // Send local notification
        await this.sendLocalNotification(notification.title, notification.description || "")

        return tempNotification
      } catch (storageError) {
        console.error("Error storing notification in AsyncStorage:", storageError)
        throw error
      }
    }
  },

  async sendLocalNotification(title: string, body: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      })
    } catch (error) {
      console.error("Error sending local notification:", error)
    }
  },

  async getUnreadCount() {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return 0

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)

      if (error) throw error

      return count || 0
    } catch (error) {
      console.error("Error getting unread count:", error)

      // Try to get from local storage if offline
      try {
        const notificationsJson = await AsyncStorage.getItem("notifications")
        if (notificationsJson) {
          const notifications = JSON.parse(notificationsJson)
          return notifications.filter((n: Notification) => !n.read).length
        }
        return 0
      } catch (storageError) {
        console.error("Error getting notifications from AsyncStorage:", storageError)
        return 0
      }
    }
  },

  // Listen for notification received
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback)
  },

  // Listen for notification response (user tapped on notification)
  addNotificationResponseReceivedListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback)
  },

  // Remove listeners
  removeNotificationSubscription(subscription: Notifications.Subscription) {
    Notifications.removeNotificationSubscription(subscription)
  },
}
