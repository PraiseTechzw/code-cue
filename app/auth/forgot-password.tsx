"use client"

import { useState } from "react"
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
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import { useAuth } from "@/contexts/AuthContext"
import Colors from "@/constants/Colors"

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const { resetPassword, loading } = useAuth()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Animation for the reset button
  const buttonOpacity = new Animated.Value(0.5)
  const buttonScale = new Animated.Value(1)

  // Update button opacity based on form validity
  const isFormValid = email.trim() !== ""
  buttonOpacity.setValue(isFormValid ? 1 : 0.5)

  const handlePressIn = () => {
    if (isFormValid) {
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
    return Object.keys(newErrors).length === 0
  }

  const handleResetPassword = async () => {
    if (validateForm()) {
      await resetPassword(email)
      setIsSubmitted(true)
    }
  }

  const navigateToLogin = () => {
    router.push("/auth/login")
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={navigateToLogin} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <Ionicons name="lock-open-outline" size={60} color={theme.tint} style={styles.icon} />
            <Text style={[styles.title, { color: theme.text }]}>Forgot Password</Text>
            <Text style={[styles.subtitle, { color: theme.textDim }]}>
              Enter your email address and we'll send you a link to reset your password
            </Text>
          </View>

          {isSubmitted ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#4CAF50" style={styles.successIcon} />
              <Text style={[styles.successTitle, { color: theme.text }]}>Email Sent</Text>
              <Text style={[styles.successMessage, { color: theme.textDim }]}>
                Please check your email for instructions on how to reset your password
              </Text>
              <TouchableOpacity
                style={[styles.backToLoginButton, { backgroundColor: theme.tint }]}
                onPress={navigateToLogin}
              >
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Email</Text>
                <View
                  style={[
                    styles.inputContainer,
                    { backgroundColor: theme.cardBackground, borderColor: errors.email ? "#F44336" : theme.border },
                  ]}
                >
                  <Ionicons name="mail-outline" size={20} color={theme.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Enter your email"
                    placeholderTextColor={theme.textDim}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <Animated.View style={{ opacity: buttonOpacity, transform: [{ scale: buttonScale }] }}>
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
                    <>
                      <Ionicons name="send-outline" size={20} color="#fff" style={styles.resetIcon} />
                      <Text style={styles.resetButtonText}>Send Reset Link</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity onPress={navigateToLogin} style={styles.loginLink}>
                <Text style={[styles.loginLinkText, { color: theme.tint }]}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    marginTop: 40,
    padding: 8,
    width: 40,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 100,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  formContainer: {
    width: "100%",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  errorText: {
    color: "#F44336",
    fontSize: 12,
    marginTop: 4,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
    alignItems: "center",
    padding: 10,
  },
  loginLinkText: {
    fontSize: 16,
    fontWeight: "500",
  },
  successContainer: {
    alignItems: "center",
    padding: 20,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  backToLoginButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backToLoginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
