"use client"

import { useEffect, useRef } from "react"
import { StyleSheet, View, Text, Animated, TouchableOpacity, Dimensions } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"

export type ToastType = "success" | "error" | "info" | "warning"

interface ToastProps {
  visible: boolean
  message: string
  type: ToastType
  duration?: number
  onDismiss: () => void
}

export function Toast({ visible, message, type, duration = 3000, onDismiss }: ToastProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { width } = Dimensions.get("window")

  const fadeAnim = useRef(new Animated.Value(0)).current
  const translateYAnim = useRef(new Animated.Value(-100)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    if (visible) {
      // Show toast with spring animation
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start()

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [visible])

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss()
    })
  }

  const getIconName = () => {
    switch (type) {
      case "success":
        return "checkmark-circle"
      case "error":
        return "alert-circle"
      case "warning":
        return "warning"
      case "info":
        return "information-circle"
      default:
        return "information-circle"
    }
  }

  const getIconColor = () => {
    switch (type) {
      case "success":
        return "#4CAF50"
      case "error":
        return "#F44336"
      case "warning":
        return "#FF9800"
      case "info":
        return "#2196F3"
      default:
        return "#2196F3"
    }
  }

  const getBackgroundColor = () => {
    const baseColor = colorScheme === "dark" ? "#1F2937" : "#FFFFFF"

    switch (type) {
      case "success":
        return colorScheme === "dark" ? "#0F2922" : "#E8F5E9"
      case "error":
        return colorScheme === "dark" ? "#2D1A1A" : "#FFEBEE"
      case "warning":
        return colorScheme === "dark" ? "#2D2010" : "#FFF3E0"
      case "info":
        return colorScheme === "dark" ? "#0D2030" : "#E3F2FD"
      default:
        return baseColor
    }
  }

  if (!visible) return null

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: translateYAnim },
            { scale: scaleAnim }
          ],
          backgroundColor: getBackgroundColor(),
          borderColor: getIconColor(),
          width: width - 40,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}20` }]}>
          <Ionicons name={getIconName()} size={24} color={getIconColor()} />
        </View>
        <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
      </View>
      <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
        <Ionicons name="close" size={20} color={theme.textDim} />
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderLeftWidth: 4,
    zIndex: 1000,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  message: {
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
})
