import { useState, useRef, useEffect } from "react"
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  ScrollView,
  Keyboard,
  Image,
} from "react-native"
import { useRouter } from "expo-router"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import { useAuth } from "@/contexts/AuthContext"
import Colors from "@/constants/Colors"
import * as Haptics from "expo-haptics"
import React from "react"

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const { resetPassword, loading } = useAuth()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)
  const [isKeyboardVisible, setKeyboardVisible] = useState(false)

  // Animation refs
  const logoScale = useRef(new Animated.Value(0.8)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const formTranslateY = useRef(new Animated.Value(50)).current
  const formOpacity = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current
  const buttonOpacity = useRef(new Animated.Value(0.5)).current
  const errorShakeAnim = useRef(new Animated.Value(0)).current
  const successScale = useRef(new Animated.Value(0.8)).current
  const successOpacity = useRef(new Animated.Value(0)).current
  
  // Input focus animations
  const logoContainerScale = useRef(new Animated.Value(1)).current
  const logoContainerOpacity = useRef(new Animated.Value(1)).current
  const emailInputScale = useRef(new Animated.Value(1)).current
  const infoTextOpacity = useRef(new Animated.Value(0)).current
  const infoTextTranslateY = useRef(new Animated.Value(10)).current
  const keyboardSlideAnim = useRef(new Animated.Value(0)).current

  // Refs for inputs
  const emailInputRef = useRef<TextInput>(null)

  useEffect(() => {
    startEntranceAnimation()
    setupKeyboardListeners()
  }, [])

  const setupKeyboardListeners = () => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true)
      animateKeyboardShow()
    })
    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false)
      animateKeyboardHide()
    })

    return () => {
      keyboardDidShowListener.remove()
      keyboardDidHideListener.remove()
    }
  }

  const animateKeyboardShow = () => {
    Animated.parallel([
      Animated.timing(logoContainerScale, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(logoContainerOpacity, {
        toValue: 0.6,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(keyboardSlideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const animateKeyboardHide = () => {
    Animated.parallel([
      Animated.timing(logoContainerScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(logoContainerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(keyboardSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const startEntranceAnimation = () => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }

  const startSuccessAnimation = () => {
    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start()
  }

  // Update button opacity based on form validity
  const isFormValid = email.trim() !== ""
  
  useEffect(() => {
    Animated.timing(buttonOpacity, {
      toValue: isFormValid ? 1 : 0.5,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [isFormValid])

  const handleInputFocus = (inputName: string) => {
    setFocusedInput(inputName)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    
    Animated.parallel([
      Animated.timing(infoTextOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(infoTextTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handleInputBlur = () => {
    setFocusedInput(null)
    
    Animated.parallel([
      Animated.spring(emailInputScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.parallel([
        Animated.timing(infoTextOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(infoTextTranslateY, {
          toValue: 10,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }

  const handlePressIn = () => {
    if (isFormValid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start()
    }
  }

  const handlePressOut = () => {
    if (isFormValid) {
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start()
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (email.trim() === "") {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid"
    }

    setErrors(newErrors)
    
    // Shake animation for errors
    if (Object.keys(newErrors).length > 0) {
      Animated.sequence([
        Animated.timing(errorShakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(errorShakeAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(errorShakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(errorShakeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start()
    }
    
    return Object.keys(newErrors).length === 0
  }

  const handleResetPassword = async () => {
    if (validateForm()) {
      const success = await resetPassword(email)
      if (success) {
      setIsSubmitted(true)
        startSuccessAnimation()
      }
    }
  }

  const navigateToLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push("/auth/login")
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
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity onPress={navigateToLogin} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoContainerOpacity,
              transform: [{ scale: logoContainerScale }],
            },
          ]}
        >
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }}
          >
            <Image 
              source={require("@/assets/images/logo.png")} 
              style={styles.logo} 
              resizeMode="contain" 
            />
            <Text style={[styles.appName, { color: theme.text }]}>CodeCue</Text>
            <Text style={[styles.tagline, { color: theme.textDim }]}>
              Reset your password
            </Text>
          </Animated.View>
        </Animated.View>

          {isSubmitted ? (
          <Animated.View
            style={[
              styles.successContainer,
              {
                opacity: successOpacity,
                transform: [{ scale: successScale }],
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" style={styles.successIcon} />
            <Text style={[styles.successTitle, { color: theme.text }]}>Email Sent!</Text>
              <Text style={[styles.successMessage, { color: theme.textDim }]}>
              We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
              </Text>
              <TouchableOpacity
                style={[styles.backToLoginButton, { backgroundColor: theme.tint }]}
                onPress={navigateToLogin}
              activeOpacity={0.8}
              >
              <Ionicons name="arrow-back-outline" size={20} color="#fff" style={styles.backToLoginIcon} />
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: formOpacity,
                transform: [
                  { translateY: formTranslateY },
                  {
                    translateY: keyboardSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -20],
                    }),
                  },
                ],
              },
            ]}
          >
              <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
              <Animated.View
                  style={[
                    styles.inputContainer,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: focusedInput === "email" 
                      ? theme.tint 
                      : errors.email 
                      ? "#F44336" 
                      : theme.border,
                    borderWidth: focusedInput === "email" ? 2 : 1,
                    transform: [
                      { scale: focusedInput === "email" ? emailInputScale : 1 },
                      {
                        translateX: errorShakeAnim.interpolate({
                          inputRange: [-10, 10],
                          outputRange: [-10, 10],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons 
                  name="mail-outline" 
                  size={20} 
                  color={focusedInput === "email" ? theme.tint : theme.textDim} 
                  style={styles.inputIcon} 
                />
                  <TextInput
                  ref={emailInputRef}
                    style={[styles.input, { color: theme.text }]}
                  placeholder="Enter your email address"
                    placeholderTextColor={theme.textDim}
                    value={email}
                    onChangeText={setEmail}
                  onFocus={() => handleInputFocus("email")}
                  onBlur={handleInputBlur}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                />
              </Animated.View>
              
              {/* Field Info Text */}
              <Animated.View
                style={[
                  styles.infoContainer,
                  {
                    opacity: focusedInput === "email" ? infoTextOpacity : 0,
                    transform: [
                      {
                        translateY: focusedInput === "email" ? infoTextTranslateY : 10,
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="information-circle-outline" size={16} color={theme.tint} />
                <Text style={[styles.infoText, { color: theme.textDim }]}>
                  We'll send a secure link to reset your password
                </Text>
              </Animated.View>
              
              {errors.email && (
                <Animated.Text 
                  style={[
                    styles.errorText,
                    {
                      opacity: errorShakeAnim.interpolate({
                        inputRange: [-10, 10],
                        outputRange: [1, 1],
                      }),
                    },
                  ]}
                >
                  {errors.email}
                </Animated.Text>
              )}
              </View>

            <Animated.View 
              style={[
                styles.buttonContainer,
                { 
                  opacity: buttonOpacity, 
                  transform: [{ scale: buttonScale }] 
                }
              ]}
            >
                <TouchableOpacity
                  style={[styles.resetButton, { backgroundColor: theme.tint }]}
                  onPress={handleResetPassword}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={!isFormValid || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                  <React.Fragment>
                      <Ionicons name="send-outline" size={20} color="#fff" style={styles.resetIcon} />
                      <Text style={styles.resetButtonText}>Send Reset Link</Text>
                  </React.Fragment>
                  )}
                </TouchableOpacity>
              </Animated.View>

            <TouchableOpacity onPress={navigateToLogin} style={styles.loginLink} activeOpacity={0.7}>
              <Ionicons name="arrow-back-outline" size={16} color={theme.tint} style={styles.loginLinkIcon} />
                <Text style={[styles.loginLinkText, { color: theme.tint }]}>Back to Login</Text>
              </TouchableOpacity>
          </Animated.View>
          )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  backButton: {
    marginBottom: 20,
    padding: 8,
    width: 40,
    borderRadius: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    textAlign: "center",
  },
  formContainer: {
    flex: 1,
    marginTop: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 56,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    fontWeight: "500",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
  errorText: {
    color: "#F44336",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },
  buttonContainer: {
    marginBottom: 24,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 56,
  },
  resetIcon: {
    marginRight: 8,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  loginLinkIcon: {
    marginRight: 6,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  backToLoginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 56,
  },
  backToLoginIcon: {
    marginRight: 8,
  },
  backToLoginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
