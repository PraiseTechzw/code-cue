import { useState, useRef, useEffect } from "react"
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  ScrollView,
  Keyboard,
} from "react-native"
import { useRouter } from "expo-router"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"
import * as Haptics from "expo-haptics"
import React from "react"

export default function SignUpScreen() {
  const router = useRouter()
  const { signUp, loading } = useAuth()
  const { showToast } = useToast()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
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
  
  // Input focus animations
  const logoContainerScale = useRef(new Animated.Value(1)).current
  const logoContainerOpacity = useRef(new Animated.Value(1)).current
  const fullNameInputScale = useRef(new Animated.Value(1)).current
  const emailInputScale = useRef(new Animated.Value(1)).current
  const passwordInputScale = useRef(new Animated.Value(1)).current
  const confirmPasswordInputScale = useRef(new Animated.Value(1)).current
  const infoTextOpacity = useRef(new Animated.Value(0)).current
  const infoTextTranslateY = useRef(new Animated.Value(10)).current
  const keyboardSlideAnim = useRef(new Animated.Value(0)).current

  // Refs for inputs
  const fullNameInputRef = useRef<TextInput>(null)
  const emailInputRef = useRef<TextInput>(null)
  const passwordInputRef = useRef<TextInput>(null)
  const confirmPasswordInputRef = useRef<TextInput>(null)

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

  // Update button opacity based on form validity
  const isFormValid =
    fullName.trim() !== "" && email.trim() !== "" && password.trim() !== "" && confirmPassword.trim() !== ""
  
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
    
    // Animate input container
    const targetScale = useRef(new Animated.Value(1)).current
    Animated.parallel([
      Animated.spring(targetScale, {
        toValue: 1.02,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
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
      ]),
    ]).start()
  }

  const handleInputBlur = () => {
    setFocusedInput(null)
    
    // Animate input container back
    Animated.parallel([
      Animated.spring(fullNameInputScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(emailInputScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(passwordInputScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(confirmPasswordInputScale, {
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

    if (fullName.trim() === "") {
      newErrors.fullName = "Full name is required"
    }

    if (email.trim() === "") {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid"
    }

    if (password.trim() === "") {
      newErrors.password = "Password is required"
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    if (confirmPassword.trim() === "") {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
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

  const handleSignUp = async () => {
    if (validateForm()) {
      const success = await signUp(email, password, fullName)
      if (success) {
        showToast("Account created successfully! Please check your email to verify your account.", { type: "success" })
        router.push("/auth/login")
      } else {
        showToast("Failed to create account. Please try again.", { type: "error" })
      }
    }
  }

  const navigateToLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push("/auth/login")
  }

  const togglePasswordVisibility = (field: "password" | "confirmPassword") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (field === "password") {
      setShowPassword(!showPassword)
    } else {
      setShowConfirmPassword(!showConfirmPassword)
    }
  }

  const getFieldInfo = (fieldName: string) => {
    switch (fieldName) {
      case "fullName":
        return "Enter your full name as it appears on official documents"
      case "email":
        return "We'll use this email to send you important updates"
      case "password":
        return "Create a strong password with at least 6 characters"
      case "confirmPassword":
        return "Please enter the same password to confirm"
      default:
        return ""
    }
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
              Create your account
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Form Section */}
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
            <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
            <Animated.View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: focusedInput === "fullName" 
                    ? theme.tint 
                    : errors.fullName 
                    ? "#F44336" 
                    : theme.border,
                  borderWidth: focusedInput === "fullName" ? 2 : 1,
                  transform: [
                    { scale: focusedInput === "fullName" ? fullNameInputScale : 1 },
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
                name="person-outline" 
                size={20} 
                color={focusedInput === "fullName" ? theme.tint : theme.textDim} 
                style={styles.inputIcon} 
              />
              <TextInput
                ref={fullNameInputRef}
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter your full name"
                placeholderTextColor={theme.textDim}
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => handleInputFocus("fullName")}
                onBlur={handleInputBlur}
                returnKeyType="next"
                onSubmitEditing={() => emailInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </Animated.View>
            
            {/* Field Info Text */}
            <Animated.View
              style={[
                styles.infoContainer,
                {
                  opacity: focusedInput === "fullName" ? infoTextOpacity : 0,
                  transform: [
                    {
                      translateY: focusedInput === "fullName" ? infoTextTranslateY : 10,
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="information-circle-outline" size={16} color={theme.tint} />
              <Text style={[styles.infoText, { color: theme.textDim }]}>
                {getFieldInfo("fullName")}
              </Text>
            </Animated.View>
            
            {errors.fullName && (
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
                {errors.fullName}
              </Animated.Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Email</Text>
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
                placeholder="Enter your email"
                placeholderTextColor={theme.textDim}
                value={email}
                onChangeText={setEmail}
                onFocus={() => handleInputFocus("email")}
                onBlur={handleInputBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
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
                {getFieldInfo("email")}
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

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
            <Animated.View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: focusedInput === "password" 
                    ? theme.tint 
                    : errors.password 
                    ? "#F44336" 
                    : theme.border,
                  borderWidth: focusedInput === "password" ? 2 : 1,
                  transform: [
                    { scale: focusedInput === "password" ? passwordInputScale : 1 },
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
                name="lock-closed-outline" 
                size={20} 
                color={focusedInput === "password" ? theme.tint : theme.textDim} 
                style={styles.inputIcon} 
              />
              <TextInput
                ref={passwordInputRef}
                style={[styles.input, { color: theme.text }]}
                placeholder="Create a password"
                placeholderTextColor={theme.textDim}
                value={password}
                onChangeText={setPassword}
                onFocus={() => handleInputFocus("password")}
                onBlur={handleInputBlur}
                secureTextEntry={!showPassword}
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                blurOnSubmit={false}
              />
              <TouchableOpacity 
                onPress={() => togglePasswordVisibility("password")} 
                style={styles.eyeIcon}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={focusedInput === "password" ? theme.tint : theme.textDim} 
                />
              </TouchableOpacity>
            </Animated.View>
            
            {/* Field Info Text */}
            <Animated.View
              style={[
                styles.infoContainer,
                {
                  opacity: focusedInput === "password" ? infoTextOpacity : 0,
                  transform: [
                    {
                      translateY: focusedInput === "password" ? infoTextTranslateY : 10,
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="information-circle-outline" size={16} color={theme.tint} />
              <Text style={[styles.infoText, { color: theme.textDim }]}>
                {getFieldInfo("password")}
              </Text>
            </Animated.View>
            
            {errors.password && (
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
                {errors.password}
              </Animated.Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Confirm Password</Text>
            <Animated.View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: focusedInput === "confirmPassword" 
                    ? theme.tint 
                    : errors.confirmPassword 
                    ? "#F44336" 
                    : theme.border,
                  borderWidth: focusedInput === "confirmPassword" ? 2 : 1,
                  transform: [
                    { scale: focusedInput === "confirmPassword" ? confirmPasswordInputScale : 1 },
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
                name="lock-closed-outline" 
                size={20} 
                color={focusedInput === "confirmPassword" ? theme.tint : theme.textDim} 
                style={styles.inputIcon} 
              />
              <TextInput
                ref={confirmPasswordInputRef}
                style={[styles.input, { color: theme.text }]}
                placeholder="Confirm your password"
                placeholderTextColor={theme.textDim}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => handleInputFocus("confirmPassword")}
                onBlur={handleInputBlur}
                secureTextEntry={!showConfirmPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
              />
              <TouchableOpacity 
                onPress={() => togglePasswordVisibility("confirmPassword")} 
                style={styles.eyeIcon}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={focusedInput === "confirmPassword" ? theme.tint : theme.textDim} 
                />
              </TouchableOpacity>
            </Animated.View>
            
            {/* Field Info Text */}
            <Animated.View
              style={[
                styles.infoContainer,
                {
                  opacity: focusedInput === "confirmPassword" ? infoTextOpacity : 0,
                  transform: [
                    {
                      translateY: focusedInput === "confirmPassword" ? infoTextTranslateY : 10,
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="information-circle-outline" size={16} color={theme.tint} />
              <Text style={[styles.infoText, { color: theme.textDim }]}>
                {getFieldInfo("confirmPassword")}
              </Text>
            </Animated.View>
            
            {errors.confirmPassword && (
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
                {errors.confirmPassword}
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
              style={[styles.signupButton, { backgroundColor: theme.tint }]}
              onPress={handleSignUp}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={!isFormValid || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="#fff" style={styles.signupIcon} />
                  <Text style={styles.signupButtonText}>Create Account</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: theme.textDim }]}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={navigateToLogin} activeOpacity={0.7}>
              <Text style={[styles.loginLink, { color: theme.tint }]}>Log In</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
  eyeIcon: {
    padding: 8,
    marginLeft: 8,
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
  signupButton: {
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
  signupIcon: {
    marginRight: 8,
  },
  signupButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 16,
  },
  loginText: {
    fontSize: 14,
    marginRight: 4,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "600",
  },
})
