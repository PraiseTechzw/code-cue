"use client"

import React from "react"
import { StyleSheet, View, Text, Image, TouchableOpacity, FlatList, Animated } from "react-native"
import { useState, useRef, useEffect } from "react"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"

import { CommitItem } from "@/components/CommitItem"
import Colors from "@/constants/Colors"

export default function GitHubScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const [isConnected, setIsConnected] = useState(false)

  // Animation for the connect button
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Start pulsing animation
  useEffect(() => {
    if (!isConnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start()
    }
  }, [isConnected])

  // Mock data for GitHub commits
  const commits = [
    {
      id: "c1",
      message: "Fix navigation bug in project details screen",
      author: "Sarah Chen",
      timestamp: "2025-05-08T14:30:00Z",
      hash: "a1b2c3d",
      repo: "code-cue",
    },
    {
      id: "c2",
      message: "Add task filtering functionality",
      author: "Sarah Chen",
      timestamp: "2025-05-08T12:15:00Z",
      hash: "e4f5g6h",
      repo: "code-cue",
    },
    {
      id: "c3",
      message: "Implement dark mode toggle",
      author: "Alex Johnson",
      timestamp: "2025-05-07T16:45:00Z",
      hash: "i7j8k9l",
      repo: "code-cue",
    },
    {
      id: "c4",
      message: "Update README with installation instructions",
      author: "Sarah Chen",
      timestamp: "2025-05-07T10:20:00Z",
      hash: "m1n2o3p",
      repo: "code-cue",
    },
    {
      id: "c5",
      message: "Refactor authentication service",
      author: "Alex Johnson",
      timestamp: "2025-05-06T15:10:00Z",
      hash: "q4r5s6t",
      repo: "code-cue",
    },
  ]

  const handleConnect = () => {
    // In a real app, this would trigger GitHub OAuth flow
    setIsConnected(true)
  }

  const handleLinkCommit = (commitId: string) => {
    // Navigate to link commit to task screen
    console.log(`Link commit ${commitId} to task`)
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!isConnected ? (
        <View style={styles.connectContainer}>
          <Ionicons name="logo-github" size={80} color={theme.text} />
          <Text style={[styles.connectTitle, { color: theme.text }]}>Connect to GitHub</Text>
          <Text style={[styles.connectDescription, { color: theme.textDim }]}>
            Link your GitHub account to track commits, pull requests, and issues directly in your projects.
          </Text>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.connectButton, { backgroundColor: theme.tint }]}
              onPress={handleConnect}
              activeOpacity={0.8}
            >
              <Ionicons name="link-outline" size={20} color="#fff" style={styles.connectIcon} />
              <Text style={styles.connectButtonText}>Connect GitHub Account</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      ) : (
        <>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.accountInfo}>
              <Image source={{ uri: "https://github.com/identicons/sarahchen.png" }} style={styles.avatar} />
              <View>
                <Text style={[styles.username, { color: theme.text }]}>sarahchen</Text>
                <Text style={[styles.accountType, { color: theme.textDim }]}>Personal Account</Text>
              </View>
            </View>
          </View>

          <View style={[styles.repoSelector, { backgroundColor: theme.cardBackground }]}>
            <Ionicons name="git-branch-outline" size={18} color={theme.tint} style={styles.repoIcon} />
            <Text style={[styles.repoSelectorText, { color: theme.text }]}>code-cue</Text>
            <Ionicons name="chevron-down" size={18} color={theme.textDim} />
          </View>

          <View style={styles.commitsHeader}>
            <Text style={[styles.commitsTitle, { color: theme.text }]}>Recent Commits</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={[styles.viewAllText, { color: theme.tint }]}>View All</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.tint} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={commits}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <CommitItem commit={item} onLinkPress={() => handleLinkCommit(item.id)} />}
            contentContainerStyle={styles.commitsList}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  connectContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  connectTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12,
  },
  connectDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 36,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  connectIcon: {
    marginRight: 8,
  },
  connectButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  accountInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  username: {
    fontSize: 18,
    fontWeight: "bold",
  },
  accountType: {
    fontSize: 14,
    marginTop: 2,
  },
  repoSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    margin: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  repoIcon: {
    marginRight: 8,
  },
  repoSelectorText: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  commitsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  commitsTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  viewAllText: {
    fontSize: 14,
    marginRight: 4,
    fontWeight: "500",
  },
  commitsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
})
