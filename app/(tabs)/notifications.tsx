"use client"

import { StyleSheet, View, Text, FlatList, TouchableOpacity } from "react-native"
import { useState, useEffect } from "react"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import { notificationService } from "@/services/notificationService"
import { useToast } from "@/contexts/ToastContext"
import { NotificationItem } from "@/components/NotificationItem"
import Colors from "@/constants/Colors"

export default function NotificationsScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await notificationService.getNotifications()
      setNotifications(data)
    } catch (error) {
      console.error("Error loading notifications:", error)
      showToast("Failed to load notifications", { type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead()
      showToast("All notifications marked as read", { type: "success" })
      loadNotifications() // Refresh the list
    } catch (error) {
      console.error("Error marking all as read:", error)
      showToast("Failed to mark all notifications as read", { type: "error" })
    }
  }

  const handleNotificationRead = () => {
    loadNotifications() // Refresh the list after marking a notification as read
  }

  // Mock data for notifications
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task_completed":
        return <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
      case "commit_linked":
        return <Ionicons name="git-commit-outline" size={24} color="#2196F3" />
      case "ai_suggestion":
        return <Ionicons name="bulb-outline" size={24} color="#9C27B0" />
      case "deadline":
        return <Ionicons name="time-outline" size={24} color="#FF9800" />
      default:
        return <Ionicons name="notifications-outline" size={24} color="#2196F3" />
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton} activeOpacity={0.7}>
          <Ionicons name="checkmark-done-outline" size={18} color={theme.tint} style={styles.markAllIcon} />
          <Text style={[styles.markAllText, { color: theme.tint }]}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.$id || item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={{
              ...item,
              icon: getNotificationIcon(item.type),
            }}
            onMarkAsRead={handleNotificationRead}
          />
        )}
        contentContainerStyle={styles.notificationsList}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadNotifications}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={80} color={theme.textDim} />
            <Text style={[styles.emptyText, { color: theme.textDim }]}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  markAllIcon: {
    marginRight: 4,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  notificationsList: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
})
