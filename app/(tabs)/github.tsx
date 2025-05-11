"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
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
  Modal,
  TextInput,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import { router } from "expo-router"
import * as AuthSession from "expo-auth-session"
import * as SecureStore from "expo-secure-store"
import { useIsFocused } from "@react-navigation/native"
import * as Haptics from "expo-haptics"

import { CommitItem } from "@/components/CommitItem"
import { githubService } from "@/services/githubService"
import { useToast } from "@/contexts/ToastContext"
import { useAuth } from "@/contexts/AuthContext"
import Colors from "@/constants/Colors"
import type { GithubRepository } from "@/services/githubService"

// Remove OAuth configuration
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
  const { isConnected } = useAuth()
  const isFocused = useIsFocused()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [connection, setConnection] = useState<any>(null)
  const [repositories, setRepositories] = useState<GithubRepository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<GithubRepository | null>(null)
  const [commits, setCommits] = useState<any[]>([])
  const [authInProgress, setAuthInProgress] = useState(false)
  const hasFetchedFromGitHub = useRef(false)
  const isLoadingRef = useRef(false)
  const [showRepoModal, setShowRepoModal] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')
  const modalAnim = useRef(new Animated.Value(0)).current

  // Animation for the connect button
  const pulseAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  // Add new state for commit fetch error
  const [commitFetchError, setCommitFetchError] = useState<string | null>(null)

  // Load GitHub data when the screen is focused
  useEffect(() => {
    if (isFocused && !isLoadingRef.current) {
      loadGitHubData(false)
    }
  }, [isFocused])

  const handleConnect = async () => {
    try {
      setAuthInProgress(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Button press animation
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start()

      // Navigate to manual connection screen
      router.push("/github-connect" as any)
    } catch (error) {
      console.error("Error connecting to GitHub:", error)
      showToast("Failed to connect GitHub account", { type: "error" })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setAuthInProgress(false)
    }
  }

  const loadGitHubData = async (forceRefreshFromGitHub = false) => {
    if (isLoadingRef.current) return
    
    try {
      isLoadingRef.current = true
      setLoading(true)

      // Check if user has GitHub connection
      const connectionData = await githubService.getConnection()
      setConnection(connectionData)

      if (!connectionData) {
        setLoading(false)
        return
      }

      // Get repositories
      let reposData = await githubService.getRepositories()
      
      // If no repos or force refresh, fetch from GitHub
      if (reposData.length === 0 || forceRefreshFromGitHub) {
        await githubService.fetchAndCacheRepositories(connectionData.access_token, connectionData.user_id)
        reposData = await githubService.getRepositories()
      }

      setRepositories(reposData)

      if (reposData.length > 0) {
        // Get last selected repo or default to first repo
        const lastSelectedRepoId = await SecureStore.getItemAsync("lastSelectedGitHubRepo")
        const repoToSelect = lastSelectedRepoId 
          ? reposData.find((repo: GithubRepository) => repo.id === lastSelectedRepoId) || reposData[0]
          : reposData[0]

        setSelectedRepo(repoToSelect)

        // Get commits for selected repo
        const commitsData = await githubService.getCommits(repoToSelect.id)
        setCommits(commitsData)
      }
    } catch (error) {
      console.error("Error loading GitHub data:", error)
      showToast("Failed to load GitHub data", { type: "error" })
    } finally {
      setLoading(false)
      setRefreshing(false)
      isLoadingRef.current = false
    }
  }

  const onRefresh = useCallback(() => {
    if (!refreshing && !isLoadingRef.current) {
      setRefreshing(true)
      loadGitHubData(false)
    }
  }, [refreshing])

  const handleRefreshFromGitHub = useCallback(async () => {
    if (connection && !refreshing && !isLoadingRef.current) {
      setRefreshing(true)
      await loadGitHubData(true)
    }
  }, [connection, refreshing])

  const handleManualConnect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push("/github-connect")
  }

  const handleOpenRepoModal = () => {
    setShowRepoModal(true)
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }

  const handleCloseRepoModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowRepoModal(false)
    })
  }

  const handleSelectRepo = async (repo: GithubRepository) => {
    if (isLoadingRef.current) return

    try {
      isLoadingRef.current = true
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setSelectedRepo(repo)
      setLoading(true)

      // Save the selected repo ID
      await SecureStore.setItemAsync("lastSelectedGitHubRepo", repo.id)

      // Get commits for selected repo
      const commitsData = await githubService.getCommits(repo.id)
      setCommits(commitsData)
      
      handleCloseRepoModal()
    } catch (error) {
      console.error("Error loading commits:", error)
      showToast("Failed to load commits", { type: "error" })
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
  }

  const handleLinkCommit = (commitId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // Navigate to link commit to task screen
    router.push({
      pathname: "/link-commit",
      params: { commitId }
    } as any)
  }

  const handleDisconnect = async () => {
    try {
      setLoading(true)
      await githubService.disconnectGithub()
      showToast("GitHub account disconnected", { type: "success" })
      router.replace("/github")
    } catch (error) {
      console.error("Error disconnecting GitHub:", error)
      showToast("Failed to disconnect GitHub account", { type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddRepository = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push("/add-repository" as any)
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
   

      {/* Account Info */}
      {connection && (
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: theme.border }}>
          <Image
            source={{ uri: connection.avatar_url || `https://github.com/identicons/${connection.username}.png` }}
            style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
          />
          <View style={{ flex: 1, justifyContent: 'center', flexShrink: 1, minWidth: 0 }}>
            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }} numberOfLines={1} ellipsizeMode="tail">{connection.username}</Text>
            <Text style={{ color: theme.textDim, fontSize: 13 }}>GitHub Account</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
            <TouchableOpacity
              style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', marginRight: 6 }}
              onPress={() => setShowRepoModal(true)}
            >
              <Ionicons name="git-branch-outline" size={16} color={theme.tint} />
              <Text style={{ color: theme.tint, fontSize: 13, fontWeight: '500', marginLeft: 4 }}>Select</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center' }}
              onPress={handleDisconnect}
            >
              <Ionicons name="log-out-outline" size={16} color={theme.error} />
              <Text style={{ color: theme.error, fontSize: 12, fontWeight: '500', marginLeft: 3 }}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Selected Repo Info */}
      {selectedRepo && (
        <View style={{
          margin: 16,
          marginBottom: 0,
          backgroundColor: theme.cardBackground,
          borderRadius: 16,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 4,
          flexDirection: 'column',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="git-branch-outline" size={22} color={theme.tint} style={{ marginRight: 8 }} />
            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 18, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">{selectedRepo.name}</Text>
            {selectedRepo.html_url && (
              <TouchableOpacity onPress={() => handleViewRepository(selectedRepo)} style={{ marginLeft: 8 }} accessibilityLabel="View on GitHub">
                <Ionicons name="open-outline" size={20} color={theme.tint} />
              </TouchableOpacity>
            )}
          </View>
          {selectedRepo.full_name && (
            <Text style={{ color: theme.textDim, fontSize: 14, marginBottom: 4 }}>{selectedRepo.full_name}</Text>
          )}
          {selectedRepo.description ? (
            <Text style={{ color: theme.textDim, fontSize: 14, marginBottom: 8 }}>{selectedRepo.description}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flexShrink: 1, marginTop: 4 }}>
            {/* Owner */}
            {selectedRepo.full_name && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 6 }}>
                <Ionicons name="person-outline" size={15} color={theme.textDim} style={{ marginRight: 2 }} />
                <Text style={{ color: theme.textDim, fontSize: 13 }}>{selectedRepo.full_name.split('/')[0]}</Text>
              </View>
            )}
            {/* Visibility */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 6 }}>
              <Ionicons name={'earth-outline'} size={15} color={theme.textDim} style={{ marginRight: 2 }} />
              <Text style={{ color: theme.textDim, fontSize: 13 }}>Public</Text>
            </View>
            {/* Commit count */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 6 }}>
              <Ionicons name="git-commit-outline" size={15} color={theme.textDim} style={{ marginRight: 2 }} />
              <Text style={{ color: theme.textDim, fontSize: 13 }}>{commits.length} Commits</Text>
            </View>
            {/* Last updated */}
            {selectedRepo.updated_at && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="time-outline" size={15} color={theme.textDim} style={{ marginRight: 2 }} />
                <Text style={{ color: theme.textDim, fontSize: 13 }}>Updated {new Date(selectedRepo.updated_at).toLocaleDateString()}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Repo Selector Modal */}
      <Modal
        visible={showRepoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRepoModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPressOut={() => setShowRepoModal(false)}
        >
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.cardBackground, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: theme.border }}>
              <Ionicons name="search" size={18} color={theme.textDim} />
              <TextInput
                style={{ flex: 1, marginLeft: 8, color: theme.text, fontSize: 16 }}
                placeholder="Search repositories..."
                placeholderTextColor={theme.textDim}
                value={repoSearch}
                onChangeText={setRepoSearch}
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowRepoModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={repositories.filter(r => r.name.toLowerCase().includes(repoSearch.toLowerCase()))}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 16, borderBottomWidth: 1, borderColor: theme.border, backgroundColor: selectedRepo?.id === item.id ? theme.tintLight : 'transparent', borderRadius: 10 }}
                  activeOpacity={0.7}
                  onPress={async () => {
                    setShowRepoModal(false)
                    setSelectedRepo(item)
                    setLoading(true)
                    setCommitFetchError(null)
                    try {
                      const commitsData = await githubService.getCommits(item.id)
                      setCommits(commitsData)
                    } catch (err: any) {
                      setCommitFetchError(err?.message || 'Failed to fetch commits')
                    } finally {
                      setLoading(false)
                    }
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>{item.name}</Text>
                  {item.description ? <Text style={{ color: theme.textDim, fontSize: 13 }}>{item.description}</Text> : null}
                  {selectedRepo?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={18} color={theme.tint} style={{ position: 'absolute', right: 16, top: 20 }} />
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
              ListEmptyComponent={<View style={{ alignItems: 'center', padding: 32 }}><Ionicons name="alert-circle-outline" size={40} color={theme.textDim} /><Text style={{ color: theme.textDim, marginTop: 12 }}>No repositories found</Text></View>}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.tintLight }]}
          onPress={() => handleAddRepository()}
          accessibilityLabel="Add Repository"
          accessibilityHint="Opens the add repository screen"
          activeOpacity={0.7}
        >
          <Ionicons name="add-outline" size={16} color={theme.tint} />
          <Text style={[styles.actionButtonText, { color: theme.tint }]}>Add Repo</Text>
        </TouchableOpacity>
        {/* Manual fetch commits button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.tintLight, flexDirection: 'row', alignItems: 'center' }]}
          onPress={async () => {
            if (!selectedRepo) return
            setLoading(true)
            setCommitFetchError(null)
            try {
              await githubService.fetchCommitsForRepository(selectedRepo.id)
              const commitsData = await githubService.getCommits(selectedRepo.id)
              setCommits(commitsData)
              showToast('Commits fetched from GitHub', { type: 'success' })
            } catch (err: any) {
              setCommitFetchError(err?.message || 'Failed to fetch commits from GitHub')
              showToast('Failed to fetch commits from GitHub', { type: 'error' })
            } finally {
              setLoading(false)
            }
          }}
          accessibilityLabel="Fetch Commits"
          accessibilityHint="Fetches latest commits from GitHub for the selected repository"
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.tint} style={{ marginRight: 6 }} />
          ) : (
            <Ionicons name="cloud-download-outline" size={16} color={theme.tint} style={{ marginRight: 6 }} />
          )}
          <Text style={[styles.actionButtonText, { color: theme.tint }]}>Fetch Commits</Text>
        </TouchableOpacity>
      </View>

      {/* Commit List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.textDim }]}>Loading GitHub data...</Text>
        </View>
      ) : repositories.length > 0 && selectedRepo ? (
        <FlatList
          data={commits}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ padding: 12, borderBottomWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBackground, borderRadius: 10, marginVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '500' }}>{item.message}</Text>
              <Text style={{ color: theme.textDim, fontSize: 12, marginTop: 2 }}>{item.author} - {item.committed_at ? new Date(item.committed_at).toLocaleString() : ''}</Text>
            </View>
          )}
          ListHeaderComponent={
            <View style={styles.commitsHeader}>
              <Text style={[styles.commitsTitle, { color: theme.text }]}>Recent Commits</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => selectedRepo && router.push(`/repository/${selectedRepo.id}` as any)}
                accessibilityLabel="View All Commits"
                accessibilityHint="Shows all commits for this repository"
                activeOpacity={0.7}
              >
                <Text style={[styles.viewAllText, { color: theme.tint }]}>View All</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.tint} />
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.tint]}
              tintColor={theme.tint}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCommitsContainer}>
              <Ionicons name="git-commit-outline" size={60} color={theme.textDim} />
              <Text style={[styles.emptyCommitsText, { color: theme.textDim, marginTop: 12 }]}>No commits found for this repository</Text>
              <Text style={[styles.emptyCommitsSubtext, { color: theme.textDim }]}>Commits will appear here once they are pushed to this repository.</Text>
            </View>
          }
          contentContainerStyle={{ padding: 8, paddingBottom: 24 }}
        />
      ) : (
        <View style={styles.emptyReposContainer}>
          <Ionicons name="folder-open-outline" size={60} color={theme.textDim} />
          <Text style={[styles.emptyReposText, { color: theme.textDim, marginTop: 12 }]}>No repositories found</Text>
          <Text style={[styles.emptyReposSubtext, { color: theme.textDim }]}>Add your GitHub repositories to track commits and link them to tasks.</Text>
          <TouchableOpacity
            style={[styles.addRepoButton, { backgroundColor: theme.tint }]}
            onPress={handleAddRepository}
            accessibilityLabel="Add Repository"
            accessibilityHint="Opens the add repository screen"
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addRepoButtonText}>Add Repository</Text>
          </TouchableOpacity>
        </View>
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
  offlineWarning: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    maxWidth: 300,
  },
  offlineText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  repoList: {
    padding: 16,
  },
  repoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  repoItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  repoItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  repoItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  repoItemDescription: {
    fontSize: 14,
    marginTop: 2,
  },
})
