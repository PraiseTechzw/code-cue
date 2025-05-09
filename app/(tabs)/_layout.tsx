"use client"

import { useEffect, useState } from "react"
import { Tabs } from "expo-router"
import { useColorScheme } from "react-native"
import Ionicons  from "@expo/vector-icons/Ionicons"
import { notificationService } from "@/services/notificationService"
import Colors from "@/constants/Colors"

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Get initial unread count
    loadUnreadCount()

    // Set up interval to refresh unread count
    const interval = setInterval(loadUnreadCount, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount()
      setUnreadCount(count)
    } catch (error) {
      console.error("Error loading unread count:", error)
    }
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
          borderTopWidth: 1,
          borderTopColor: Colors[colorScheme ?? "light"].border,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTintColor: Colors[colorScheme ?? "light"].text,
        headerShadowVisible: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarIcon: ({ color, size }) => <Ionicons name="folder-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="github"
        options={{
          title: "GitHub",
          tabBarIcon: ({ color, size }) => <Ionicons name="logo-github" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "AI Insights",
          tabBarIcon: ({ color, size }) => <Ionicons name="bulb-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors[colorScheme ?? "light"].tint,
          },
        }}
      />
    </Tabs>
  )
}
