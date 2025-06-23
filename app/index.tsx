"use client"

import { useEffect, useState } from "react"
import { View, ActivityIndicator, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/contexts/AuthContext"
import Colors from "@/constants/Colors"
import { useColorScheme } from "react-native"
import { githubService } from "@/services/githubService"

export default function Index() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const checkAndRoute = async () => {
      if (!loading) {
        if (user) {
          setChecking(true)
          try {
            const connection = await githubService.getGitHubConnection()
            if (connection) {
              router.replace("/(tabs)")
            } else {
              router.replace("/welcome")
            }
          } catch (e) {
            router.replace("/welcome")
          } finally {
            setChecking(false)
          }
        } else {
          router.replace("/auth/login")
        }
      }
    }
    checkAndRoute()
  }, [user, loading, router])

  if (loading || checking) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
})
