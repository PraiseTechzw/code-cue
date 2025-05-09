"use client"

import { useEffect, useRef, useState } from "react"
import { StyleSheet, View, Text, Animated, TouchableOpacity, PanResponder, Dimensions } from "react-native"
import Ionicons  from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"

export type ToastType = "success" | "error" | "info" | "warning"
export type ToastPosition = "top" | "bottom"
export type ToastAnimation = "slide" | "fade" | "bounce" | "flip" | "zoom"

interface ToastProps {
  visible: boolean
  message: string
  type: ToastType
  duration?: number
  position?: ToastPosition
  animation?: ToastAnimation
  onDismiss: () => void
}

export function Toast({
  visible,
  message,
  type,
  duration = 3000,
  position = "top",
  animation = "slide",
  onDismiss,
}: ToastProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const [dimensions, setDimensions] = useState(() => Dimensions.get("window"))

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const translateYAnim = useRef(new Animated.Value(position === "top" ? -100 : 100)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  // Progress bar animation
  const progressAnim = useRef(new Animated.Value(0)).current
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  })

  // Rotation for flip animation
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window)
    })

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (visible) {
      // Show toast with selected animation
      showToastWithAnimation()

      // Start progress bar animation
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: duration,
        useNativeDriver: false,
      }).start()

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToastWithAnimation()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [visible, animation])

  const showToastWithAnimation = () => {
    // Reset progress
    progressAnim.setValue(0)

    // Different animations based on the selected type
    switch (animation) {
      case "slide":
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(translateYAnim, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start()
        break

      case "fade":
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start()
        break

      case "bounce":
        Animated.sequence([
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.spring(translateYAnim, {
              toValue: 0,
              friction: 4,
              tension: 50,
              useNativeDriver: true,
            }),
          ]),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 50,
            useNativeDriver: true,
          }),
        ]).start()
        break

      case "flip":
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(translateYAnim, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start()
        break

      case "zoom":
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start()
        break

      default:
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start()
    }
  }

  const hideToastWithAnimation = () => {
    // Different exit animations based on the selected type
    switch (animation) {
      case "slide":
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: position === "top" ? -100 : 100,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss())
        break

      case "fade":
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => onDismiss())
        break

      case "bounce":
        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 0.8,
            friction: 4,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
              toValue: position === "top" ? -100 : 100,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => onDismiss())
        break

      case "flip":
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: position === "top" ? -100 : 100,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss())
        break

      case "zoom":
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 0.8,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss())
        break

      default:
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: position === "top" ? -100 : 100,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss())
    }
  }

  // Pan responder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Allow horizontal swiping
        if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
          translateYAnim.setValue(gestureState.dx)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Dismiss if swiped far enough
        if (Math.abs(gestureState.dx) > dimensions.width * 0.3) {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onDismiss())
        } else {
          // Return to original position
          Animated.spring(translateYAnim, {
            toValue: 0,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }).start()
        }
      },
    }),
  ).current

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

  // Get animation style based on selected animation
  const getAnimationStyle = () => {
    const baseStyle = {
      opacity: fadeAnim,
    }

    switch (animation) {
      case "slide":
        return {
          ...baseStyle,
          transform: [{ translateY: translateYAnim }],
        }
      case "fade":
        return baseStyle
      case "bounce":
        return {
          ...baseStyle,
          transform: [{ translateY: translateYAnim }, { scale: scaleAnim }],
        }
      case "flip":
        return {
          ...baseStyle,
          transform: [{ translateY: translateYAnim }, { rotateY: rotateInterpolate }],
        }
      case "zoom":
        return {
          ...baseStyle,
          transform: [{ scale: scaleAnim }],
        }
      default:
        return {
          ...baseStyle,
          transform: [{ translateY: translateYAnim }],
        }
    }
  }

  // Position style based on selected position
  const getPositionStyle = () => {
    return {
      [position]: 50,
    }
  }

  if (!visible) return null

  return (
    <Animated.View
      style={[
        styles.container,
        getPositionStyle(),
        getAnimationStyle(),
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getIconColor(),
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.content}>
        <Ionicons name={getIconName()} size={24} color={getIconColor()} style={styles.icon} />
        <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
      </View>
      <TouchableOpacity onPress={() => hideToastWithAnimation()} style={styles.closeButton}>
        <Ionicons name="close" size={20} color={theme.textDim} />
      </TouchableOpacity>

      {/* Progress bar */}
      <Animated.View
        style={[
          styles.progressBar,
          {
            width: progressWidth,
            backgroundColor: getIconColor(),
          },
        ]}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    padding: 16,
    paddingBottom: 24, // Extra space for progress bar
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderLeftWidth: 4,
    zIndex: 1000,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 12,
  },
  message: {
    fontSize: 14,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 4,
    borderBottomLeftRadius: 12,
  },
})
