import { useState } from "react"
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native"
import { Link, useRouter } from "expo-router"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"
import { useColorScheme } from "react-native"

export default function RegisterScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { signUp } = useAuth()
  const { showToast } = useToast()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      showToast("Please fill in all fields", { type: "warning" })
      return
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match", { type: "error" })
      return
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters", { type: "warning" })
      return
    }

    try {
      setLoading(true)
      const success = await signUp(email, password)
      if (success) {
        showToast("Account created successfully", { type: "success" })
        router.replace("/(tabs)")
      } else {
        showToast("Failed to create account", { type: "error" })
      }
    } catch (error) {
      console.error("Registration error:", error)
      showToast("Failed to create account. Please try again.", { type: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: theme.textDim }]}>Sign up to get started</Text>
      </View>

      <View style={styles.form}>
        <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Email"
            placeholderTextColor={theme.textDim}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Password"
            placeholderTextColor={theme.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Confirm Password"
            placeholderTextColor={theme.textDim}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.tint }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textDim }]}>Already have an account? </Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: theme.tint }]}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  input: {
    padding: 16,
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