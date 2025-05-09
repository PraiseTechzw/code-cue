"use client"

import { useEffect, useState } from "react"
import { Text, StyleSheet, Animated, Easing } from "react-native"
import { Ionicons } from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import NetInfo from "@react-native-community/netinfo"
import Colors from "@/constants/Colors"

type ConnectionState = "online" | "offline" | "syncing"

export function ConnectionStatus() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const [connectionState, setConnectionState] = useState<ConnectionState>("online")
  const [visible, setVisible] = useState(false)
  const fadeAnim = useState(new Animated.Value(0))[0]
  const syncAnim = useState(new Animated.Value(0))[0]

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
        return <Ionicons name="wifi" size={16} color="#4CAF50" />
      case "offline":
        return <Ionicons name="cloud-offline" size={16} color="#F44336" />
      case "syncing":
        return (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="sync" size={16} color="#2196F3" />
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
        return isDark ? "#1A2E22" : "#E8F5E9"
      case "offline":
        return isDark ? "#2D1A1A" : "#FFEBEE"
      case "syncing":
        return isDark ? "#0D2030" : "#E3F2FD"
    }
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          opacity: fadeAnim,
          borderColor: connectionState === "online" ? "#4CAF50" : connectionState === "offline" ? "#F44336" : "#2196F3",
        },
      ]}
    >
      {getIcon()}
      <Text style={[styles.text, { color: theme.text }]}>{getText()}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1000,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
  },
})
