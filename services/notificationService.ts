import * as Notifications from "expo-notifications"
import * as Device from "expo-device"
import { Platform } from "react-native"
import { supabase } from "@/lib/supabase"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Database } from "@/types/supabase"
import { EventSubscription } from "expo-modules-core"

export type Notification = Database["public"]["Tables"]["notifications"]["Row"]
export type NewNotification = Database["public"]["Tables"]["notifications"]["Insert"]

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

class NotificationService {
  async registerForPushNotifications(): Promise<string | null> {
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

      const token = await Notifications.getExpoPushTokenAsync()
      return token.data
    } catch (error) {
      console.error("Error registering for push notifications:", error)
      return null
    }
  }

  async hasNotificationPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync()
    return status === "granted"
  }

  async requestNotificationPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync()
    return status === "granted"
  }

  async updateNotificationSettings(enabled: boolean): Promise<boolean> {
    try {
      if (enabled) {
        const permission = await this.requestNotificationPermission()
        if (!permission) {
          return false
        }
      }
      // Store the user's preference in your backend
      return true
    } catch (error) {
      console.error("Error updating notification settings:", error)
      return false
    }
  }

  async getNotifications(): Promise<any> {
    // Implement getting notifications from your backend
    return []
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    // Implement marking a notification as read
    return true
  }

  async getUnreadCount(): Promise<number> {
    try {
      const notifications = await this.getNotifications()
      return notifications.filter((n: Notification) => !n.read).length
    } catch (error) {
      console.error("Error getting unread count:", error)
      return 0
    }
  }

  addNotificationReceivedListener(callback: (notification: any) => void): EventSubscription {
    return Notifications.addNotificationReceivedListener(callback)
  }

  addNotificationResponseReceivedListener(callback: (response: any) => void): EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback)
  }

  removeNotificationSubscription(subscription: EventSubscription): void {
    subscription.remove()
  }
}

export const notificationService = new NotificationService()
