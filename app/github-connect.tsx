"use client"

import { useState } from "react"
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useColorScheme } from "react-native"

import { githubService } from "@/services/githubService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

export default function GitHubConnectScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [username, setUsername] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (username.trim() === "") {
      newErrors.username = "GitHub username is required"
    }

    if (accessToken.trim() === "") {
      newErrors.accessToken = "Access token is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleConnect = async () => {
    if (validateForm()) {
      try {
        setLoading(true)

        // Connect to GitHub
        await githubService.connectGitHub({
          username,
          accessToken,
        })

        showToast("GitHub account connected successfully", "success")

        // Navigate back to GitHub screen
        router.push("/github")
      } catch (error) {
        console.error("Error connecting GitHub:", error)
        showToast("Failed to connect GitHub account", "error")
      } finally {
        setLoading(false)
      }
    }
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Connect GitHub</Text>
      </View>

      <View style={styles.content}>
        <Ionicons name="logo-github" size={80} color={theme.text} style={styles.logo} />
        <Text style={[styles.subtitle, { color: theme.text }]}>Link your GitHub account</Text>
        <Text style={[styles.description, { color: theme.textDim }]}>
          Connect your GitHub account to track commits, pull requests, and issues directly in your projects.
        </Text>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>GitHub Username</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
                errors.username && styles.inputError,
              ]}
              placeholder="Enter your GitHub username"
              placeholderTextColor={theme.textDim}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Personal Access Token</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
                errors.accessToken && styles.inputError,
              ]}
              placeholder="Enter your GitHub access token"
              placeholderTextColor={theme.textDim}
              value={accessToken}
              onChangeText={setAccessToken}
              secureTextEntry
              autoCapitalize="none"
            />
            {errors.accessToken && <Text style={styles.errorText}>{errors.accessToken}</Text>}
            <Text style={[styles.helperText, { color: theme.textDim }]}>
              You can generate a personal access token in your GitHub account settings.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: theme.tint }]}
            onPress={handleConnect}
            disabled={loading}
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
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  content: {
    padding: 20,
    alignItems: "center",
  },
  logo: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
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
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: "#F44336",
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
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  connectIcon: {
    marginRight: 8,
  },
  connectButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
