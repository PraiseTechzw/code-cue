"use client"

import React, { useEffect, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native"
import { useRouter } from "expo-router"
import { useColorScheme } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { githubService } from "@/services/githubService"
import Colors from "@/constants/Colors"
import * as Haptics from "expo-haptics"

interface GitHubConnectionBannerProps {
  onDismiss?: () => void
  showDismissButton?: boolean
}

export default function GitHubConnectionBanner({ 
  onDismiss, 
  showDismissButton = true 
}: GitHubConnectionBannerProps) {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  
  const [hasGitHubConnection, setHasGitHubConnection] = useState<boolean | null>(null)
  const [slideAnim] = useState(new Animated.Value(-100))
  const [opacityAnim] = useState(new Animated.Value(0))

  useEffect(() => {
    checkGitHubConnection()
  }, [])

  useEffect(() => {
    if (hasGitHubConnection === false) {
      // Animate in when not connected
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    } else if (hasGitHubConnection === true) {
      // Animate out when connected
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [hasGitHubConnection])

  const checkGitHubConnection = async () => {
    try {
      const connection = await githubService.getGitHubConnection()
      setHasGitHubConnection(!!connection)
    } catch (error) {
      console.error("Error checking GitHub connection:", error)
      setHasGitHubConnection(false)
    }
  }

  const handleConnectGitHub = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push("/github-connect")
  }

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.()
    })
  }

  // Don't render if connected or still loading
  if (hasGitHubConnection !== false) {
    return null
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.warning,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="logo-github" size={20} color="white" />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>Connect GitHub</Text>
          <Text style={styles.description}>
            Link your GitHub account to track commits and manage repositories
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={handleConnectGitHub}
            activeOpacity={0.8}
          >
            <Text style={styles.connectButtonText}>Connect</Text>
          </TouchableOpacity>

          {showDismissButton && (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  description: {
    color: "white",
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  connectButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  connectButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  dismissButton: {
    padding: 4,
  },
}) 