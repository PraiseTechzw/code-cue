"use client"

import { StyleSheet, View, Text, Image, TouchableOpacity, FlatList, Animated, ActivityIndicator } from "react-native"
import { useState, useRef, useEffect } from "react"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import { router } from "expo-router"

import { CommitItem } from "@/components/CommitItem"
import { githubService } from "@/services/githubService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

export default function GitHubScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState<any>(null)
  const [repositories, setRepositories] = useState<any[]>([])
  const [selectedRepo, setSelectedRepo] = useState<any>(null)
  const [commits, setCommits] = useState<any[]>([])

  // Animation for the connect button
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    loadGitHubData()
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
      pulseAnim.setValue(1)
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

        // Select first repo if available
        if (reposData && reposData.length > 0) {
          setSelectedRepo(reposData[0])

          // Get commits for selected repo
          const commitsData = await githubService.getCommits(reposData[0].id)
          setCommits(commitsData)
        }
      }
    } catch (error) {
      console.error("Error loading GitHub data:", error)
      showToast("Failed to load GitHub data", { type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    // In a real app, this would trigger GitHub OAuth flow
    // For now, we'll just navigate to a mock connection screen
    router.push("/github-connect")
  }

  const handleSelectRepo = async (repo: any) => {
    try {
      setSelectedRepo(repo)
      setLoading(true)

      // Get commits for selected repo
      const commitsData = await githubService.getCommits(repo.id)
      setCommits(commitsData)
    } catch (error) {
      console.error("Error loading commits:", error)
      showToast("Failed to load commits", { type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleLinkCommit = (commitId: string) => {
    // Navigate to link commit to task screen
    router.push(`/link-commit?commitId=${commitId}`)
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
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
              <Image
                source={{ uri: `https://github.com/identicons/${connection.username}.png` }}
                style={styles.avatar}
              />
              <View>
                <Text style={[styles.username, { color: theme.text }]}>{connection.username}</Text>
                <Text style={[styles.accountType, { color: theme.textDim }]}>GitHub Account</Text>
              </View>
            </View>
          </View>

          {repositories.length > 0 ? (
            <>
              <TouchableOpacity
                style={[styles.repoSelector, { backgroundColor: theme.cardBackground }]}
                onPress={() => router.push("/repositories")}
              >
                <Ionicons name="git-branch-outline" size={18} color={theme.tint} style={styles.repoIcon} />
                <Text style={[styles.repoSelectorText, { color: theme.text }]}>
                  {selectedRepo ? selectedRepo.name : "Select Repository"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={theme.textDim} />
              </TouchableOpacity>

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

              {commits.length > 0 ? (
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
                    />
                  )}
                  contentContainerStyle={styles.commitsList}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyCommitsContainer}>
                  <Ionicons name="git-commit-outline" size={60} color={theme.textDim} />
                  <Text style={[styles.emptyCommitsText, { color: theme.textDim }]}>
                    No commits found for this repository
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyReposContainer}>
              <Ionicons name="folder-open-outline" size={60} color={theme.textDim} />
              <Text style={[styles.emptyReposText, { color: theme.textDim }]}>No repositories found</Text>
              <TouchableOpacity
                style={[styles.addRepoButton, { backgroundColor: theme.tint }]}
                onPress={() => router.push("/add-repository")}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addRepoButtonText}>Add Repository</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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
  emptyCommitsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 40,
  },
  emptyCommitsText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
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
