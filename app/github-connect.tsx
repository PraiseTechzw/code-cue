"use client"

import { useState, useEffect, useRef } from "react"
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  Linking,
} from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useColorScheme } from "react-native"
import * as Haptics from "expo-haptics"
import { BlurView } from "expo-blur"

import { githubService } from "@/services/githubService"
import { useToast } from "@/contexts/ToastContext"
import { useAuth } from "@/contexts/AuthContext"
import Colors from "@/constants/Colors"
import React from "react"

export default function GitHubConnectScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()
  const { isConnected } = useAuth()

  const [username, setUsername] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [showHelp, setShowHelp] = useState(false)
  const [isKeyboardVisible, setKeyboardVisible] = useState(false)

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const buttonScale = useRef(new Animated.Value(1)).current
  const helpOpacity = useRef(new Animated.Value(0)).current
  const helpScale = useRef(new Animated.Value(0.9)).current
  const logoAnim = useRef(new Animated.Value(0)).current
  const formAnim = useRef(new Animated.Value(0)).current
  const buttonAnim = useRef(new Animated.Value(0)).current

  // Refs for inputs
  const tokenInputRef = useRef<TextInput>(null)

  useEffect(() => {
    // Start entrance animations
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()

    // Keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true)
    })
    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false)
    })

    return () => {
      keyboardDidShowListener.remove()
      keyboardDidHideListener.remove()
    }
  }, [])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (username.trim() === "") {
      newErrors.username = "GitHub username is required"
    }

    if (accessToken.trim() === "") {
      newErrors.accessToken = "Access token is required"
    } else if (accessToken.trim().length < 30) {
      newErrors.accessToken = "Access token appears to be invalid"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleConnect = async () => {
    if (!isConnected) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      showToast("Cannot connect while offline", { type: "error" })
      return
    }

    if (validateForm()) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        setLoading(true)

        // Debug logging
        console.log("Connecting GitHub with:", {
          username: username,
          hasAccessToken: !!accessToken,
          accessTokenLength: accessToken?.length
        })

        // Button press animation
        Animated.sequence([
          Animated.timing(buttonScale, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(buttonScale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start()

        // Connect to GitHub
        const connectionParams = {
          username,
          accessToken,
        }
        console.log("Connection params:", {
          username: connectionParams.username,
          hasAccessToken: !!connectionParams.accessToken
        })

        await githubService.connectGitHub(connectionParams)

        // Success animation
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        showToast("GitHub account connected successfully", { type: "success" })

        // Navigate back to welcome screen with a slight delay for the toast to be visible
        setTimeout(() => {
          router.push("/welcome")
        }, 500)
      } catch (error) {
        console.error("Error connecting GitHub:", error)
        console.error("Error in handleConnect:", {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        })
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        showToast("Failed to connect GitHub account", { type: "error" })

        // Shake animation for error
        Animated.sequence([
          Animated.timing(buttonScale, {
            toValue: 1.05,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(buttonScale, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(buttonScale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start()
      } finally {
        setLoading(false)
      }
    } else {
      // Error haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)

      // Shake animation for validation errors
      const shakeAnimation = Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ])

      shakeAnimation.start()
    }
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }

  const toggleHelpModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (showHelp) {
      // Hide help modal
      Animated.parallel([
        Animated.timing(helpOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(helpScale, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowHelp(false)
      })
    } else {
      // Show help modal
      setShowHelp(true)
      Animated.parallel([
        Animated.timing(helpOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(helpScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }

  const openGitHubTokensPage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Linking.openURL("https://github.com/settings/tokens")
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityHint="Returns to the previous screen"
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Connect GitHub</Text>
          <TouchableOpacity
            onPress={toggleHelpModal}
            style={styles.helpButton}
            accessibilityLabel="Help"
            accessibilityHint="Shows information about GitHub tokens"
          >
            <Ionicons name="help-circle-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.content}>
          <Animated.View
            style={{
              opacity: logoAnim,
              transform: [
                {
                  scale: logoAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            }}
          >
            <Ionicons name="logo-github" size={80} color={theme.text} style={styles.logo} />
          </Animated.View>

          <Animated.View
            style={{
              opacity: formAnim,
              transform: [
                {
                  translateY: formAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            }}
          >
            <Text style={[styles.subtitle, { color: theme.text }]}>Link your GitHub account</Text>
            <Text style={[styles.description, { color: theme.textDim }]}>
              Connect your GitHub account to track commits, pull requests, and issues directly in your projects.
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.form,
              {
                opacity: formAnim,
                transform: [
                  {
                    translateY: formAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>GitHub Username</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.cardBackground,
                    color: theme.text,
                    borderColor: errors.username ? "#F44336" : theme.border,
                  },
                ]}
                placeholder="Enter your GitHub username"
                placeholderTextColor={theme.textDim}
                value={username}
                onChangeText={(text) => {
                  setUsername(text)
                  if (errors.username) {
                    setErrors({ ...errors, username: "" })
                  }
                }}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => tokenInputRef.current?.focus()}
                accessibilityLabel="GitHub username"
                accessibilityHint="Enter your GitHub username"
              />
              {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: theme.text }]}>Personal Access Token</Text>
                <TouchableOpacity
                  onPress={openGitHubTokensPage}
                  accessibilityLabel="Get token"
                  accessibilityHint="Opens GitHub tokens page in browser"
                >
                  <Text style={[styles.getTokenLink, { color: theme.tint }]}>Get token</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                ref={tokenInputRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.cardBackground,
                    color: theme.text,
                    borderColor: errors.accessToken ? "#F44336" : theme.border,
                  },
                ]}
                placeholder="Enter your GitHub access token"
                placeholderTextColor={theme.textDim}
                value={accessToken}
                onChangeText={(text) => {
                  setAccessToken(text)
                  if (errors.accessToken) {
                    setErrors({ ...errors, accessToken: "" })
                  }
                }}
                secureTextEntry
                autoCapitalize="none"
                accessibilityLabel="GitHub access token"
                accessibilityHint="Enter your GitHub personal access token"
              />
              {errors.accessToken && <Text style={styles.errorText}>{errors.accessToken}</Text>}
              <Text style={[styles.helperText, { color: theme.textDim }]}>
                Token needs 'repo' and 'user' scopes for full functionality.
              </Text>
            </View>

            <Animated.View
              style={{
                opacity: buttonAnim,
                transform: [
                  { scale: buttonScale },
                  {
                    translateY: buttonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={[styles.connectButton, { backgroundColor: theme.tint }, !isConnected && styles.disabledButton]}
                onPress={handleConnect}
                disabled={loading || !isConnected}
                accessibilityLabel="Connect GitHub Account"
                accessibilityHint="Connects your GitHub account using the provided credentials"
                accessibilityState={{ disabled: loading || !isConnected }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="link-outline" size={20} color="#fff" style={styles.connectIcon} />
                    <Text style={styles.connectButtonText}>Connect GitHub Account</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {!isConnected && (
              <Animated.View
                style={{
                  opacity: buttonAnim,
                  transform: [
                    {
                      translateY: buttonAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                }}
              >
                <View style={[styles.offlineWarning, { backgroundColor: theme.warningBackground }]}>
                  <Ionicons name="cloud-offline-outline" size={18} color={theme.warningText} />
                  <Text style={[styles.offlineText, { color: theme.warningText }]}>
                    You're offline. Connect to the internet to link your GitHub account.
                  </Text>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      {/* Help Modal */}
      {showHelp && (
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} style={StyleSheet.absoluteFill} />
          <Animated.View
            style={[
              styles.helpModal,
              {
                backgroundColor: theme.cardBackground,
                opacity: helpOpacity,
                transform: [{ scale: helpScale }],
              },
            ]}
          >
            <View style={styles.helpHeader}>
              <Text style={[styles.helpTitle, { color: theme.text }]}>How to Get a GitHub Token</Text>
              <TouchableOpacity onPress={toggleHelpModal}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.helpContent}>
              <Text style={[styles.helpStep, { color: theme.text }]}>
                1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
              </Text>
              <Text style={[styles.helpStep, { color: theme.text }]}>
                2. Click "Generate new token" and select "Generate new token (classic)"
              </Text>
              <Text style={[styles.helpStep, { color: theme.text }]}>
                3. Give your token a descriptive name (e.g., "DevCue App")
              </Text>
              <Text style={[styles.helpStep, { color: theme.text }]}>
                4. Set an expiration date (or "No expiration")
              </Text>
              <Text style={[styles.helpStep, { color: theme.text }]}>5. Select these scopes:</Text>
              <View style={styles.scopesList}>
                <Text style={[styles.scope, { color: theme.textDim }]}>
                  • repo (Full control of private repositories)
                </Text>
                <Text style={[styles.scope, { color: theme.textDim }]}>• user (Read user information)</Text>
              </View>
              <Text style={[styles.helpStep, { color: theme.text }]}>6. Click "Generate token"</Text>
              <Text style={[styles.helpStep, { color: theme.text }]}>
                7. Copy the generated token and paste it here
              </Text>

              <Text style={[styles.helpWarning, { color: theme.error }]}>
                Important: Store this token securely. You won't be able to see it again on GitHub!
              </Text>

              <TouchableOpacity
                style={[styles.openGitHubButton, { backgroundColor: theme.tintLight }]}
                onPress={openGitHubTokensPage}
              >
                <Ionicons name="open-outline" size={18} color={theme.tint} />
                <Text style={[styles.openGitHubText, { color: theme.tint }]}>Open GitHub Tokens Page</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  helpButton: {
    padding: 8,
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  content: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  logo: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  form: {
    width: "100%",
  },
  formGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  getTokenLink: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  errorText: {
    color: "#F44336",
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  connectIcon: {
    marginRight: 8,
  },
  connectButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  offlineWarning: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  offlineText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  helpModal: {
    width: "100%",
    maxHeight: "80%",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  helpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  helpContent: {
    padding: 16,
    maxHeight: 400,
  },
  helpStep: {
    fontSize: 15,
    marginBottom: 12,
    lineHeight: 22,
  },
  scopesList: {
    marginLeft: 16,
    marginBottom: 12,
  },
  scope: {
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  helpWarning: {
    fontSize: 14,
    fontWeight: "500",
    marginVertical: 16,
    textAlign: "center",
  },
  openGitHubButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  openGitHubText: {
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 8,
  },
})
