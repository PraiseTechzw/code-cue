"use client"

import { View, StyleSheet, Animated } from "react-native"
import { useRef, useEffect } from "react"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"

interface ProgressBarProps {
  progress: number // 0-100
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  // Ensure progress is between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100)

  // Animation for progress bar
  const progressAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: clampedProgress,
      duration: 1000,
      useNativeDriver: false,
    }).start()
  }, [clampedProgress])

  // Interpolate width from animation value
  const width = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  })

  // Interpolate color based on progress
  const backgroundColor = progressAnim.interpolate({
    inputRange: [0, 30, 70, 100],
    outputRange: ["#F44336", "#FF9800", "#2196F3", "#4CAF50"],
  })

  return (
    <View style={[styles.container, { backgroundColor: theme.border }]}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            width,
            backgroundColor,
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
})
