"use client"

import { useEffect } from "react"
import { View, ActivityIndicator, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/contexts/AuthContext"
import Colors from "@/constants/Colors"
import { useColorScheme } from "react-native"

export default function Index() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/welcome")
      } else {
        router.replace("/auth/login")
      }
    }
  }, [user, loading, router])

  if (loading) {
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
