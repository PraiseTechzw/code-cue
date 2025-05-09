"use client"

import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import type { ReactNode } from "react"
import { useColorScheme } from "react-native"
import { notificationService } from "@/services/notificationService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

interface NotificationItemProps {
  notification: {
    id: string
    type: string
    title: string
    description: string
    timestamp: string
    icon: ReactNode
    read: boolean
  }
  onMarkAsRead?: () => void
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 1) {
      return "Just now"
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
  }

  const handlePress = async () => {
    if (!notification.read) {
      try {
        await notificationService.markAsRead(notification.id)
        showToast("Notification marked as read", { type: "success" })
        if (onMarkAsRead) {
          onMarkAsRead()
        }
      } catch (error) {
        console.error("Error marking notification as read:", error)
        showToast("Failed to mark notification as read", { type: "error" })
      }
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        notification.read
          ? [styles.readNotification, { backgroundColor: theme.cardBackground }]
          : [styles.unreadNotification, { backgroundColor: theme.tintLight }],
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: "rgba(0, 0, 0, 0.05)" }]}>{notification.icon}</View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{notification.title}</Text>
        <Text style={[styles.description, { color: theme.textDim }]}>{notification.description}</Text>
        <Text style={[styles.timestamp, { color: theme.textDim }]}>{formatDate(notification.timestamp)}</Text>
      </View>
      {!notification.read && <View style={[styles.unreadIndicator, { backgroundColor: theme.tint }]} />}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  unreadNotification: {},
  readNotification: {},
  iconContainer: {
    marginRight: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
})
