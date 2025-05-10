"use client"

import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Animated,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from "react-native"
import { useState, useRef, useEffect, useCallback } from "react"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import { router } from "expo-router"
import * as AuthSession from "expo-auth-session"
import * as SecureStore from "expo-secure-store"
import { useIsFocused } from "@react-navigation/native"
import * as Haptics from "expo-haptics"

import { CommitItem } from "@/components/CommitItem"
import { githubService } from "@/services/githubService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = "your-github-client-id" // Replace with your actual GitHub client ID
const GITHUB_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: "devcue",
  path: "github-callback",
})

// GitHub OAuth discovery document
const discovery = {
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
  revocationEndpoint: "https://github.com/settings/connections/applications/" + GITHUB_CLIENT_ID,
}

export default function GitHubScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()
  const isFocused = useIsFocused()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [connection, setConnection] = useState<any>(null)
  const [repositories, setRepositories] = useState<any[]>([])
  const [selectedRepo, setSelectedRepo] = useState<any>(null)
  const [commits, setCommits] = useState<any[]>([])
  const [authRequest, setAuthRequest] = useState<AuthSession.AuthRequest | null>(null)
  const [authInProgress, setAuthInProgress] = useState(false)

  // Animation for the connect button
  const pulseAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current

  // Load GitHub data when the screen is focused
  useEffect(() => {
    if (isFocused) {
      loadGitHubData()
    }
  }, [isFocused])

  // Create GitHub OAuth request
  useEffect(() => {
    async function createAuthRequest() {
      try {
        const request = new AuthSession.AuthRequest({
          clientId: GITHUB_CLIENT_ID,
          scopes: ["user", "repo"],
          redirectUri: GITHUB_REDIRECT_URI,
        })

        await request.prepareAsync(discovery)
        setAuthRequest(request)
      } catch (error) {
        console.error("Error creating auth request:", error)
        showToast("Failed to prepare GitHub authentication", "error")
      }
    }

    createAuthRequest()
  }, [])

  // Start pulsing animation
  useEffect(() => {
    if (!connection) {
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
    } else {
      // Animate in the content when connection exists
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
      ]).start()
    }
  }, [connection])

  const loadGitHubData = async () => {
    try {
      setLoading(true)

      // Check if user has GitHub connection
      const connectionData = await githubService.getConnection()
      setConnection(connectionData)

      if (connectionData) {
        // Get repositories
        const reposData = await githubService.getRepositories()
        setRepositories(reposData)

        // Select first repo if available or previously selected repo
        const lastSelectedRepoId = await SecureStore.getItemAsync("lastSelectedGitHubRepo")

        if (reposData && reposData.length > 0) {
          let repoToSelect = reposData[0]

          if (lastSelectedRepoId) {
            const savedRepo = reposData.find((repo) => repo.id === lastSelectedRepoId)
            if (savedRepo) {
              repoToSelect = savedRepo
            }
          }

          setSelectedRepo(repoToSelect)

          // Get commits for selected repo
          const commitsData = await githubService.getCommits(repoToSelect.id)
          setCommits(commitsData)
        }
      }
    } catch (error) {
      console.error("Error loading GitHub data:", error)
      showToast("Failed to load GitHub data", "error")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadGitHubData()
  }, [])

  const handleConnect = async () => {
    try {
      if (!authRequest) {
        showToast("GitHub authentication is not ready", "error")
        return
      }

      setAuthInProgress(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Start the OAuth flow
      const result = await authRequest.promptAsync(discovery)

      if (result.type === "success") {
        // Exchange code for token using your backend
        const { code } = result.params

        // Call your backend API to exchange the code for a token
        const response = await fetch("https://your-backend-api.com/github/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        })

        const data = await response.json()

        if (data.access_token && data.github_user) {
          // Save the GitHub connection
          await githubService.saveConnection(data.github_user.login, data.access_token)

          // Refresh the GitHub data
          await loadGitHubData()

          showToast("GitHub account connected successfully", "success")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } else {
          throw new Error("Failed to get access token")
        }
      } else if (result.type === "error") {
        showToast(`Authentication error: ${result.error?.message || "Unknown error"}`, "error")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } else if (result.type === "dismiss") {
        showToast("GitHub authentication was cancelled", "info")
      }
    } catch (error) {
      console.error("Error connecting to GitHub:", error)
      showToast("Failed to connect GitHub account", "error")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setAuthInProgress(false)
    }
  }

  const handleSelectRepo = async (repo: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setSelectedRepo(repo)
      setLoading(true)

      // Save the selected repo ID
      await SecureStore.setItemAsync("lastSelectedGitHubRepo", repo.id)

      // Get commits for selected repo
      const commitsData = await githubService.getCommits(repo.id)
      setCommits(commitsData)
    } catch (error) {
      console.error("Error loading commits:", error)
      showToast("Failed to load commits", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleLinkCommit = (commitId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // Navigate to link commit to task screen
    router.push(`/link-commit?commitId=${commitId}`)
  }

  const handleDisconnect = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Disconnect GitHub account
      await githubService.disconnectGithub()

      // Clear state
      setConnection(null)
      setRepositories([])
      setSelectedRepo(null)
      setCommits([])

      showToast("GitHub account disconnected successfully", "success")
    } catch (error) {
      console.error("Error disconnecting GitHub:", error)
      showToast("Failed to disconnect GitHub account", "error")
    }
  }

  const handleAddRepository = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push("/add-repository")
  }

  const handleViewRepository = (repo: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (repo.html_url) {
      Linking.openURL(repo.html_url)
    }
  }

  const handleViewAllRepositories = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push("/repositories")
  }

  const handleViewCommit = (commit: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (selectedRepo?.html_url && commit.commit_id) {
      const commitUrl = `${selectedRepo.html_url}/commit/${commit.commit_id}`
      Linking.openURL(commitUrl)
    }
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <Text style={[styles.loadingText, { color: theme.textDim }]}>Loading GitHub data...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!connection ? (
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
              disabled={authInProgress || !authRequest}
              activeOpacity={0.8}
            >
              {authInProgress ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="link-outline" size={20} color="#fff" style={styles.connectIcon} />
                  <Text style={styles.connectButtonText}>Connect GitHub Account</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
          {!authRequest && (
            <Text style={[styles.authWarning, { color: theme.error }]}>
              GitHub authentication is initializing. Please wait...
            </Text>
          )}
        </View>
      ) : (
        <Animated.View
          style={[styles.connectedContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.accountInfo}>
              <Image
                source={{
                  uri: connection.avatar_url || `https://github.com/identicons/${connection.username}.png`,
                }}
                style={styles.avatar}
              />
              <View>
                <Text style={[styles.username, { color: theme.text }]}>{connection.username}</Text>
                <Text style={[styles.accountType, { color: theme.textDim }]}>GitHub Account</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.disconnectButton, { borderColor: theme.border }]}
              onPress={handleDisconnect}
            >
              <Ionicons name="log-out-outline" size={18} color={theme.error} />
              <Text style={[styles.disconnectText, { color: theme.error }]}>Disconnect</Text>
            </TouchableOpacity>
          </View>

          {repositories.length > 0 ? (
            <FlatList
              data={commits}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <CommitItem
                  commit={{
                    id: item.id,
                    message: item.message,
                    author: item.author,
                    timestamp: item.committed_at,
                    hash: item.commit_id.substring(0, 7),
                    repo: selectedRepo.name,
                  }}
                  onLinkPress={() => handleLinkCommit(item.id)}
                  onPress={() => handleViewCommit(item)}
                  linked={!!item.task_id}
                />
              )}
              ListHeaderComponent={
                <>
                  <TouchableOpacity
                    style={[styles.repoSelector, { backgroundColor: theme.cardBackground }]}
                    onPress={handleViewAllRepositories}
                  >
                    <Ionicons name="git-branch-outline" size={18} color={theme.tint} style={styles.repoIcon} />
                    <Text style={[styles.repoSelectorText, { color: theme.text }]}>
                      {selectedRepo ? selectedRepo.name : "Select Repository"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={theme.textDim} />
                  </TouchableOpacity>

                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.tintLight }]}
                      onPress={() => handleViewRepository(selectedRepo)}
                    >
                      <Ionicons name="open-outline" size={16} color={theme.tint} />
                      <Text style={[styles.actionButtonText, { color: theme.tint }]}>Open Repo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.tintLight }]}
                      onPress={handleAddRepository}
                    >
                      <Ionicons name="add-outline" size={16} color={theme.tint} />
                      <Text style={[styles.actionButtonText, { color: theme.tint }]}>Add Repo</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.commitsHeader}>
                    <Text style={[styles.commitsTitle, { color: theme.text }]}>Recent Commits</Text>
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() => router.push(`/repository/${selectedRepo.id}`)}
                    >
                      <Text style={[styles.viewAllText, { color: theme.tint }]}>View All</Text>
                      <Ionicons name="arrow-forward" size={16} color={theme.tint} />
                    </TouchableOpacity>
                  </View>

                  {commits.length === 0 && (
                    <View style={styles.emptyCommitsContainer}>
                      <Ionicons name="git-commit-outline" size={60} color={theme.textDim} />
                      <Text style={[styles.emptyCommitsText, { color: theme.textDim }]}>
                        No commits found for this repository
                      </Text>
                      <Text style={[styles.emptyCommitsSubtext, { color: theme.textDim }]}>
                        Commits will appear here once they are pushed to this repository.
                      </Text>
                    </View>
                  )}
                </>
              }
              contentContainerStyle={styles.commitsList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.tint]}
                  tintColor={theme.tint}
                />
              }
              ListEmptyComponent={null}
            />
          ) : (
            <View style={styles.emptyReposContainer}>
              <Ionicons name="folder-open-outline" size={60} color={theme.textDim} />
              <Text style={[styles.emptyReposText, { color: theme.textDim }]}>No repositories found</Text>
              <Text style={[styles.emptyReposSubtext, { color: theme.textDim }]}>
                Add your GitHub repositories to track commits and link them to tasks.
              </Text>
              <TouchableOpacity
                style={[styles.addRepoButton, { backgroundColor: theme.tint }]}
                onPress={handleAddRepository}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addRepoButtonText}>Add Repository</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
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
  authWarning: {
    marginTop: 16,
    fontSize: 14,
  },
  connectedContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  disconnectButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  disconnectText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
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
    flex: 1,
    textAlign: "center",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
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
    flexGrow: 1,
  },
  emptyCommitsContainer: {
    alignItems: "center",
    padding: 40,
    marginTop: 20,
  },
  emptyCommitsText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    fontWeight: "500",
  },
  emptyCommitsSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  emptyReposContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyReposText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: "600",
  },
  emptyReposSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  addRepoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addRepoButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
})
