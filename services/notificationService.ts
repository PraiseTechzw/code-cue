import * as Notifications from "expo-notifications"
import * as Device from "expo-device"
import { Platform } from "react-native"
import { databases, account, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Notification } from "@/types/appwrite"
import { ID, Query } from 'appwrite'
import { offlineStore } from './offlineStore'

export type { Notification }

// Cache keys
const CACHE_KEYS = {
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_SETTINGS: 'notification_settings'
}

// Notification types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  REMINDER: 'reminder',
  TASK_ASSIGNED: 'task_assigned',
  TASK_DUE: 'task_due',
  PHASE_STARTED: 'phase_started',
  PHASE_COMPLETED: 'phase_completed',
  PROJECT_UPDATED: 'project_updated',
  TEAM_MEMBER_JOINED: 'team_member_joined',
  COMMENT_ADDED: 'comment_added'
}

// Notification priorities
export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
}

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
  async registerForPushNotifications() {
    return await registerForPushNotificationsAsync();
  },

  async markAsRead(notificationId: string) {
    return await markNotificationAsRead(notificationId);
  },

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

        // Set up notification listeners
        this.setupNotificationListeners()
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

  setupNotificationListeners(): void {
    // Handle notification received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification)
      this.handleNotificationReceived(notification)
    })

    // Handle notification response (user tapped notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response)
      this.handleNotificationResponse(response)
    })

    // Clean up listeners when needed
    return () => {
      Notifications.removeNotificationSubscription(notificationListener)
      Notifications.removeNotificationSubscription(responseListener)
    }
  },

  handleNotificationReceived(notification: Notifications.Notification): void {
    // Update notification count
    this.updateNotificationCount()
    
    // Show in-app notification if needed
    this.showInAppNotification(notification)
  },

  handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data
    
    // Mark notification as read
    if (data.notificationId) {
      this.markAsRead(data.notificationId)
    }

    // Navigate to relevant screen
    this.navigateToNotificationTarget(data)
  },

  updateNotificationCount(): void {
    // This would typically update a global state or context
    // For now, we'll just log it
    this.getUnreadCount().then(count => {
      console.log('Unread notifications:', count)
    })
  },

  showInAppNotification(notification: Notifications.Notification): void {
    // This would typically show a toast or in-app notification
    // For now, we'll just log it
    console.log('In-app notification:', notification.request.content.title)
  },

  navigateToNotificationTarget(data: any): void {
    // This would typically use navigation to go to the target screen
    // For now, we'll just log it
    console.log('Navigate to:', data.actionUrl)
  },

  async updatePushToken(token: string): Promise<void> {
    try {
      const online = await offlineStore.isOnline()
      const currentUser = await account.get()

      if (!online) {
        await offlineStore.addOfflineChange({
          id: ID.unique(),
          table_name: 'profiles',
          record_id: currentUser.$id,
          operation: 'UPDATE',
          data: { push_token: token },
          created_at: new Date().toISOString(),
          synced: false,
          retry_count: 0
        })
        return
      }

      // Update profile with push token
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        currentUser.$id,
        { push_token: token }
      )
    } catch (error) {
      console.error('Error updating push token:', error)
    }
  },

  async getNotifications(
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    try {
      const online = await offlineStore.isOnline()
      const currentUser = await account.get()

      if (!online) {
        const cached = await offlineStore.getData(CACHE_KEYS.NOTIFICATIONS, async () => [])
        return cached.filter((notification: Notification) => 
          notification.user_id === currentUser.$id &&
          (!unreadOnly || !notification.read)
        ).slice(offset, offset + limit)
      }

      const queries = [
        Query.equal('user_id', currentUser.$id),
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
        Query.offset(offset)
      ]

      if (unreadOnly) {
        queries.push(Query.equal('read', false))
      }

      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NOTIFICATIONS,
        queries
      )

      const notifications = documents as unknown as Notification[]
      
      // Cache the results
      await offlineStore.setData(CACHE_KEYS.NOTIFICATIONS, notifications)
      
      return notifications
    } catch (error) {
      console.error('Error getting notifications:', error)
      return []
    }
  },

  async createTaskAssignmentNotification(
    taskId: string,
    taskTitle: string,
    assigneeId: string,
    projectId: string
  ): Promise<void> {
    try {
      await this.createNotification({
        title: 'Task Assigned',
        description: `You have been assigned to: ${taskTitle}`,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED,
        user_id: assigneeId,
        related_id: taskId,
        related_type: 'task',
        action_url: `/task/${taskId}`,
        priority: NOTIFICATION_PRIORITIES.MEDIUM,
        read: false
      })
    } catch (error) {
      console.error('Error creating task assignment notification:', error)
    }
  },

  async createTaskDueNotification(
    taskId: string,
    taskTitle: string,
    userId: string,
    dueDate: Date
  ): Promise<void> {
    try {
      // Create immediate notification
      await this.createNotification({
        title: 'Task Due Soon',
        description: `Task "${taskTitle}" is due soon`,
        type: NOTIFICATION_TYPES.TASK_DUE,
        user_id: userId,
        related_id: taskId,
        related_type: 'task',
        action_url: `/task/${taskId}`,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        read: false
      })

      // Schedule reminder notification
      const reminderDate = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000) // 1 day before
      if (reminderDate > new Date()) {
        await this.scheduleNotification(
          'Task Due Tomorrow',
          `Task "${taskTitle}" is due tomorrow`,
          reminderDate,
          {
            notificationId: taskId,
            type: NOTIFICATION_TYPES.TASK_DUE,
            relatedId: taskId,
            relatedType: 'task',
            actionUrl: `/task/${taskId}`
          }
        )
      }
    } catch (error) {
      console.error('Error creating task due notification:', error)
    }
  },

  async createPhaseNotification(
    phaseId: string,
    phaseName: string,
    projectId: string,
    action: 'started' | 'completed',
    userIds: string[]
  ): Promise<void> {
    try {
      const notificationType = action === 'started' 
        ? NOTIFICATION_TYPES.PHASE_STARTED 
        : NOTIFICATION_TYPES.PHASE_COMPLETED

      const title = action === 'started' 
        ? 'Phase Started' 
        : 'Phase Completed'

      const description = action === 'started'
        ? `Phase "${phaseName}" has started`
        : `Phase "${phaseName}" has been completed`

      for (const userId of userIds) {
        await this.createNotification({
          title,
          description,
          type: notificationType,
          user_id: userId,
          related_id: phaseId,
          related_type: 'phase',
          action_url: `/project/${projectId}`,
          priority: NOTIFICATION_PRIORITIES.MEDIUM,
          read: false
        })
      }
    } catch (error) {
      console.error('Error creating phase notification:', error)
    }
  },

  async createTeamMemberNotification(
    projectId: string,
    projectName: string,
    newMemberName: string,
    userIds: string[]
  ): Promise<void> {
    try {
      for (const userId of userIds) {
        await this.createNotification({
          title: 'New Team Member',
          description: `${newMemberName} has joined the project "${projectName}"`,
          type: NOTIFICATION_TYPES.TEAM_MEMBER_JOINED,
          user_id: userId,
          related_id: projectId,
          related_type: 'project',
          action_url: `/project/${projectId}`,
          priority: NOTIFICATION_PRIORITIES.LOW,
          read: false
        })
      }
    } catch (error) {
      console.error('Error creating team member notification:', error)
    }
  },

  async createCommentNotification(
    commentId: string,
    taskId: string,
    taskTitle: string,
    commenterName: string,
    userIds: string[]
  ): Promise<void> {
    try {
      for (const userId of userIds) {
        await this.createNotification({
          title: 'New Comment',
          description: `${commenterName} commented on task "${taskTitle}"`,
          type: NOTIFICATION_TYPES.COMMENT_ADDED,
          user_id: userId,
          related_id: commentId,
          related_type: 'comment',
          action_url: `/task/${taskId}`,
          priority: NOTIFICATION_PRIORITIES.LOW,
          read: false
        })
      }
    } catch (error) {
      console.error('Error creating comment notification:', error)
    }
  },

  async scheduleNotification(
    title: string,
    body: string,
    scheduledFor: Date,
    data?: Record<string, any>
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
        },
        trigger: {
          date: scheduledFor,
        },
      })

      return identifier
    } catch (error) {
      console.error('Error scheduling notification:', error)
      throw error
    }
  },

  async cancelScheduledNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier)
    } catch (error) {
      console.error('Error canceling scheduled notification:', error)
    }
  },

  async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync()
    } catch (error) {
      console.error('Error canceling all scheduled notifications:', error)
    }
  },

  getNotificationPriority(priority: string): 'default' | 'normal' | 'high' {
    switch (priority) {
      case NOTIFICATION_PRIORITIES.HIGH:
        return 'high'
      case NOTIFICATION_PRIORITIES.MEDIUM:
        return 'normal'
      case NOTIFICATION_PRIORITIES.LOW:
      default:
        return 'default'
    }
  },

  async getNotificationSettings(): Promise<Record<string, boolean>> {
    try {
      const cached = await offlineStore.getData(CACHE_KEYS.NOTIFICATION_SETTINGS, async () => ({}))
      return cached
    } catch (error) {
      console.error('Error getting notification settings:', error)
      return {}
    }
  },

  async updateNotificationSettings(settings: Record<string, boolean>): Promise<void> {
    try {
      await offlineStore.setData(CACHE_KEYS.NOTIFICATION_SETTINGS, settings)
    } catch (error) {
      console.error('Error updating notification settings:', error)
    }
  },

  async clearAllNotifications(): Promise<void> {
    try {
      const online = await offlineStore.isOnline()
      const currentUser = await account.get()

      if (!online) {
        await offlineStore.setData(CACHE_KEYS.NOTIFICATIONS, [])
        return
      }

      // Get all user notifications
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NOTIFICATIONS,
        [Query.equal('user_id', currentUser.$id)]
      )

      // Delete all notifications
      for (const notification of documents) {
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.NOTIFICATIONS,
          notification.$id
        )
      }

      // Update notification count
      this.updateNotificationCount()
    } catch (error) {
      console.error('Error clearing all notifications:', error)
    }
  }
}
