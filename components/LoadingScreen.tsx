"use client"

import React, { useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"

interface LoadingScreenProps {
  message?: string
  showSpinner?: boolean
  size?: "small" | "large"
}

export default function LoadingScreen({ 
  message = "Loading...", 
  showSpinner = true,
  size = "large" 
}: LoadingScreenProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {showSpinner && (
          <ActivityIndicator 
            size={size} 
            color={theme.tint} 
            style={styles.spinner}
          />
        )}
        <Text style={[styles.message, { color: theme.textDim }]}>
          {message}
        </Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    padding: 20,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
}) 