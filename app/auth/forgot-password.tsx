"use client"
import React from "react"
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
import { Link, useRouter } from "expo-router"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const { resetPassword } = useAuth()
  const { showToast } = useToast()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

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

  const handleResetPassword = async () => {
    if (!email) {
      showToast("Please enter your email address", "warning")
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      showToast("Please enter a valid email address", "warning")
      return
    }

    try {
      setLoading(true)
      const success = await resetPassword(email)
      if (success) {
        showToast("Password reset instructions sent to your email", "success")
        router.back()
      } else {
        showToast("Failed to send reset instructions", "error")
      }
    } catch (error) {
      console.error("Reset password error:", error)
      showToast("Failed to send reset instructions. Please try again.", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: theme.textDim }]}>
            Enter your email address and we'll send you instructions to reset your password
          </Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground }]}>
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

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.tint }]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Instructions</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textDim }]}>Remember your password? </Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity>
                <Text style={[styles.footerLink, { color: theme.tint }]}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
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
    marginBottom: 20,
    padding: 8,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "600",
  },
})
