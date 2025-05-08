"use client"

import { View, StyleSheet, Animated } from "react-native"
import { useEffect, useRef } from "react"

interface ProgressBarProps {
  progress: number
  color?: string
}

export function ProgressBar({ progress, color = "#2196F3" }: ProgressBarProps) {
  const widthAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: progress,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start()
  }, [progress])

  return (
    <View style={[styles.container, { backgroundColor: `${color}20` }]}>
      <Animated.View
        style={[
          styles.progress,
          {
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
            backgroundColor: color,
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
  progress: {
    height: "100%",
    borderRadius: 4,
  },
})
