"use client"

import { useEffect, useState, useRef } from "react"
import { View, Text, StyleSheet, Animated, Easing } from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import NetInfo from "@react-native-community/netinfo"
import Colors from "@/constants/Colors"
import { formatDistanceToNow } from "date-fns"

type ConnectionState = "online" | "offline" | "syncing"

interface ConnectionStatusProps {
  lastSyncTime?: string | null
}

export function ConnectionStatus({ lastSyncTime }: ConnectionStatusProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const [connectionState, setConnectionState] = useState<ConnectionState>("online")
  const [visible, setVisible] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const syncAnim = useRef(new Animated.Value(0)).current

  // Rotate animation for syncing icon
  const spin = syncAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  useEffect(() => {
    // Start rotation animation for syncing state
    let syncAnimation: Animated.CompositeAnimation | null = null

    if (connectionState === "syncing") {
      syncAnimation = Animated.loop(
        Animated.timing(syncAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      )
      syncAnimation.start()
    } else {
      syncAnim.setValue(0)
    }

    return () => {
      if (syncAnimation) {
        syncAnimation.stop()
      }
    }
  }, [connectionState])

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        if (connectionState === "offline") {
          // If we were offline and now online, show syncing state
          setConnectionState("syncing")

          // Simulate syncing process (in a real app, this would be actual data syncing)
          setTimeout(() => {
            setConnectionState("online")
          }, 3000)
        } else {
          setConnectionState("online")
        }
      } else {
        setConnectionState("offline")
      }

      // Show the indicator
      setVisible(true)

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()

      // Auto hide after 5 seconds if online
      if (state.isConnected && connectionState !== "syncing") {
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setVisible(false)
          })
        }, 5000)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [connectionState])

  // Don't render if not visible
  if (!visible) return null

  // Get icon and color based on connection state
  const getIcon = () => {
    switch (connectionState) {
      case "online":
        return <Ionicons name="wifi" size={16} color={theme.success || "#4CAF50"} />
      case "offline":
        return <Ionicons name="cloud-offline" size={16} color={theme.error || "#F44336"} />
      case "syncing":
        return (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="sync" size={16} color={theme.warning || "#FF9800"} />
          </Animated.View>
        )
    }
  }

  // Get text based on connection state
  const getText = () => {
    switch (connectionState) {
      case "online":
        return "Online"
      case "offline":
        return "Offline"
      case "syncing":
        return "Syncing..."
    }
  }

  // Get background color based on connection state
  const getBackgroundColor = () => {
    const isDark = colorScheme === "dark"

    switch (connectionState) {
      case "online":
        return isDark ? "rgba(76, 175, 80, 0.2)" : "rgba(76, 175, 80, 0.1)"
      case "offline":
        return isDark ? "rgba(244, 67, 54, 0.2)" : "rgba(244, 67, 54, 0.1)"
      case "syncing":
        return isDark ? "rgba(255, 152, 0, 0.2)" : "rgba(255, 152, 0, 0.1)"
    }
  }

  // Get text color based on connection state
  const getTextColor = () => {
    switch (connectionState) {
      case "online":
        return theme.success || "#4CAF50"
      case "offline":
        return theme.error || "#F44336"
      case "syncing":
        return theme.warning || "#FF9800"
    }
  }

  // Format last sync time
  const formatLastSync = () => {
    if (!lastSyncTime) return null

    try {
      const date = new Date(Number.parseInt(lastSyncTime))
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      return null
    }
  }

  const syncTimeText = formatLastSync()

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          opacity: fadeAnim,
          borderColor:
            connectionState === "online"
              ? theme.success || "#4CAF50"
              : connectionState === "offline"
                ? theme.error || "#F44336"
                : theme.warning || "#FF9800",
        },
      ]}
    >
      <View style={styles.content}>
        {getIcon()}
        <Text style={[styles.text, { color: getTextColor() }]}>{getText()}</Text>
      </View>

      {connectionState === "online" && syncTimeText && (
        <Text style={[styles.syncText, { color: theme.textDim }]}>Last synced {syncTimeText}</Text>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1000,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
  },
  syncText: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
  },
})
