"use client"

import React, { useEffect, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  StatusBar,
} from "react-native"
import { useRouter } from "expo-router"
import { useColorScheme } from "react-native"
import { useIsFocused } from "@react-navigation/native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useAuth } from "@/contexts/AuthContext"
import { githubService } from "@/services/githubService"
import Colors from "@/constants/Colors"
import * as Haptics from "expo-haptics"
import LoadingScreen from "@/components/LoadingScreen"

const { width, height } = Dimensions.get("window")

export default function WelcomeScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { user } = useAuth()
  const isFocused = useIsFocused()
  
  const [loading, setLoading] = useState(true)
  const [hasGitHubConnection, setHasGitHubConnection] = useState(false)
  const [fadeAnim] = useState(new Animated.Value(0))
  const [slideAnim] = useState(new Animated.Value(50))

  useEffect(() => {
    checkGitHubConnection()
    animateIn()
  }, [])

  // Refresh GitHub connection status when screen is focused
  useEffect(() => {
    if (isFocused) {
      checkGitHubConnection()
    }
  }, [isFocused])

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const checkGitHubConnection = async () => {
    try {
      const connection = await githubService.getGitHubConnection()
      setHasGitHubConnection(!!connection)
    } catch (error) {
      console.error("Error checking GitHub connection:", error)
      setHasGitHubConnection(false)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectGitHub = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push("/github-connect")
  }

  const handleSkipGitHub = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.replace("/(tabs)")
  }

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.replace("/(tabs)")
  }

  if (loading) {
    return (
      <LoadingScreen 
        message="Checking your setup..." 
        showSpinner={true}
        size="large"
      />
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === "dark" ? "light-content" : "dark-content"} />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image 
            source={require("@/assets/images/logo.png")} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.text }]}>
            Welcome to CodeCue!
          </Text>
          <Text style={[styles.subtitle, { color: theme.textDim }]}>
            {user?.name || "Developer"}
          </Text>
        </View>

        {/* GitHub Connection Status */}
        <View style={styles.connectionSection}>
          <View style={styles.connectionHeader}>
            <Ionicons 
              name="logo-github" 
              size={24} 
              color={hasGitHubConnection ? theme.success : theme.warning} 
            />
            <Text style={[styles.connectionTitle, { color: theme.text }]}>
              GitHub Integration
            </Text>
          </View>
          
          {hasGitHubConnection ? (
            <View style={styles.connectedState}>
              <View style={[styles.statusBadge, { backgroundColor: theme.success }]}>
                <Ionicons name="checkmark-circle" size={16} color="white" />
                <Text style={styles.statusText}>Connected</Text>
              </View>
              <Text style={[styles.connectionDescription, { color: theme.textDim }]}>
                Your GitHub account is connected. You can now link repositories, track commits, and manage your projects.
              </Text>
            </View>
          ) : (
            <View style={styles.disconnectedState}>
              <View style={[styles.statusBadge, { backgroundColor: theme.warning }]}>
                <Ionicons name="warning" size={16} color="white" />
                <Text style={styles.statusText}>Not Connected</Text>
              </View>
              <Text style={[styles.connectionDescription, { color: theme.textDim }]}>
                Connect your GitHub account to link repositories, track commits, and enhance your project management experience.
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {hasGitHubConnection ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.tint }]}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Continue to App</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.tint }]}
                onPress={handleConnectGitHub}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-github" size={20} color="white" />
                <Text style={styles.primaryButtonText}>Connect GitHub</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.border }]}
                onPress={handleSkipGitHub}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.textDim }]}>
                  Skip for now
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Features Preview */}
        <View style={styles.features}>
          <Text style={[styles.featuresTitle, { color: theme.text }]}>
            What you can do with CodeCue:
          </Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="folder" size={20} color={theme.tint} />
              <Text style={[styles.featureText, { color: theme.textDim }]}>
                Manage projects and tasks
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="git-branch" size={20} color={theme.tint} />
              <Text style={[styles.featureText, { color: theme.textDim }]}>
                Link commits to tasks
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="analytics" size={20} color={theme.tint} />
              <Text style={[styles.featureText, { color: theme.textDim }]}>
                Track progress and insights
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  connectionSection: {
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  connectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  connectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  connectedState: {
    alignItems: "flex-start",
  },
  disconnectedState: {
    alignItems: "flex-start",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  connectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  features: {
    flex: 1,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
}) 