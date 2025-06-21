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
  const [codeTypingAnim] = useState(new Animated.Value(0))
  const [elementFloatAnim] = useState(new Animated.Value(0))
  const [notificationAnim] = useState(new Animated.Value(0))
  const [sunRotateAnim] = useState(new Animated.Value(0))
  const [cloudFloatAnim] = useState(new Animated.Value(0))
  const [birdFlyAnim] = useState(new Animated.Value(0))

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

    // Start continuous animations after entrance
    setTimeout(() => {
      // Code typing effect
      Animated.loop(
        Animated.timing(codeTypingAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start()

      // Element floating
      Animated.loop(
        Animated.sequence([
          Animated.timing(elementFloatAnim, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(elementFloatAnim, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          }),
        ])
      ).start()

      // Notification bell
      Animated.loop(
        Animated.sequence([
          Animated.timing(notificationAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(notificationAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start()
    }, 800)
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
          <View style={styles.illustrationContainer}>
            {/* CodeCue Project Management Vector Illustration */}
            <View style={[styles.illustration, { backgroundColor: theme.cardBackground }]}>
              {/* Code Window/IDE */}
              <View style={[styles.codeWindow, { backgroundColor: theme.background }]}>
                {/* Window Header */}
                <View style={[styles.windowHeader, { backgroundColor: theme.tint }]}>
                  <View style={styles.windowButtons}>
                    <View style={[styles.windowButton, { backgroundColor: '#FF5F56' }]} />
                    <View style={[styles.windowButton, { backgroundColor: '#FFBD2E' }]} />
                    <View style={[styles.windowButton, { backgroundColor: '#27C93F' }]} />
                  </View>
                </View>
                
                {/* Code Content */}
                <View style={styles.codeContent}>
                  <View style={styles.codeLine}>
                    <View style={[styles.codeKeyword, { backgroundColor: theme.tint }]} />
                    <View style={[styles.codeText, { backgroundColor: theme.textDim }]} />
                  </View>
                  <View style={styles.codeLine}>
                    <View style={[styles.codeIndent, { backgroundColor: theme.border }]} />
                    <View style={[styles.codeFunction, { backgroundColor: theme.success }]} />
                    <View style={[styles.codeText, { backgroundColor: theme.textDim }]} />
                  </View>
                  <View style={styles.codeLine}>
                    <View style={[styles.codeIndent, { backgroundColor: theme.border }]} />
                    <View style={[styles.codeIndent, { backgroundColor: theme.border }]} />
                    <View style={[styles.codeString, { backgroundColor: theme.warning }]} />
                  </View>
                </View>
              </View>
              
              {/* Floating Code Elements */}
              <View style={styles.floatingElements}>
                {/* Git Branch Icon */}
                <Animated.View 
                  style={[
                    styles.gitBranch, 
                    { 
                      backgroundColor: theme.success,
                      transform: [{
                        translateY: elementFloatAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -3],
                        }),
                      }],
                    }
                  ]} 
                >
                  <View style={[styles.branchLine, { backgroundColor: theme.background }]} />
                  <View style={[styles.branchCircle, { backgroundColor: theme.background }]} />
                </Animated.View>
                
                {/* Task Checkbox */}
                <Animated.View 
                  style={[
                    styles.taskCheckbox, 
                    { 
                      backgroundColor: theme.tint,
                      transform: [{
                        translateY: elementFloatAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -5],
                        }),
                      }],
                    }
                  ]} 
                >
                  <View style={[styles.checkmark, { backgroundColor: theme.background }]} />
                </Animated.View>
                
                {/* Analytics Chart */}
                <Animated.View 
                  style={[
                    styles.analyticsChart, 
                    { 
                      backgroundColor: theme.warning,
                      transform: [{
                        translateY: elementFloatAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -2],
                        }),
                      }],
                    }
                  ]} 
                >
                  <View style={[styles.chartBar, { backgroundColor: theme.background }]} />
                  <View style={[styles.chartBar, styles.chartBar2, { backgroundColor: theme.background }]} />
                  <View style={[styles.chartBar, styles.chartBar3, { backgroundColor: theme.background }]} />
                </Animated.View>
                
                {/* Notification Bell */}
                <Animated.View 
                  style={[
                    styles.notificationBell, 
                    { 
                      backgroundColor: theme.text,
                      transform: [{
                        rotate: notificationAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '15deg'],
                        }),
                      }],
                    }
                  ]} 
                >
                  <View style={[styles.bellClapper, { backgroundColor: theme.tint }]} />
                </Animated.View>
              </View>
              
              {/* Project Cards */}
              <View style={styles.projectCards}>
                <View style={[styles.projectCard, { backgroundColor: theme.tint }]}>
                  <View style={[styles.cardHeader, { backgroundColor: theme.background }]} />
                  <View style={[styles.cardContent, { backgroundColor: theme.background }]} />
                </View>
                <View style={[styles.projectCard, styles.projectCard2, { backgroundColor: theme.success }]}>
                  <View style={[styles.cardHeader, { backgroundColor: theme.background }]} />
                  <View style={[styles.cardContent, { backgroundColor: theme.background }]} />
                </View>
              </View>
              
              {/* Connection Lines */}
              <View style={styles.connectionLines}>
                <View style={[styles.connectionLine, { backgroundColor: theme.border }]} />
                <View style={[styles.connectionLine, styles.connectionLine2, { backgroundColor: theme.border }]} />
              </View>
            </View>
          </View>
          
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
  illustrationContainer: {
    width: 140,
    height: 140,
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  codeWindow: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 12,
  },
  windowHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 24,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: "flex-end",
  },
  windowButtons: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  windowButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 2,
  },
  codeContent: {
    position: "absolute",
    top: 24,
    left: 0,
    right: 0,
    bottom: 0,
  },
  codeLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  codeKeyword: {
    width: 60,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  codeText: {
    width: 100,
    height: 16,
    borderRadius: 4,
  },
  codeIndent: {
    width: 16,
    height: 16,
    borderRadius: 2,
    marginRight: 4,
  },
  codeFunction: {
    width: 40,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  codeString: {
    width: 60,
    height: 16,
    borderRadius: 4,
  },
  floatingElements: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gitBranch: {
    position: "absolute",
    top: 20,
    left: 15,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  branchLine: {
    position: "absolute",
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: "white",
  },
  branchCircle: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "white",
    top: 10,
    left: 8,
  },
  taskCheckbox: {
    position: "absolute",
    top: 35,
    right: 20,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: "white",
  },
  analyticsChart: {
    position: "absolute",
    top: 55,
    right: 15,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  chartBar: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: "white",
  },
  chartBar2: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: "white",
  },
  chartBar3: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: "white",
  },
  notificationBell: {
    position: "absolute",
    top: 75,
    right: 15,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  bellClapper: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: "white",
  },
  projectCards: {
    position: "absolute",
    top: 95,
    left: 0,
    right: 0,
    bottom: 0,
  },
  projectCard: {
    flex: 1,
    borderRadius: 12,
    margin: 4,
    overflow: "hidden",
  },
  projectCard2: {
    flex: 1,
    borderRadius: 12,
    margin: 4,
    overflow: "hidden",
  },
  cardHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 24,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: "flex-end",
  },
  cardContent: {
    position: "absolute",
    top: 24,
    left: 0,
    right: 0,
    bottom: 0,
  },
  connectionLines: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  connectionLine: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "white",
  },
  connectionLine2: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "white",
    top: 24,
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