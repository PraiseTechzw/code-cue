"use client"

import { useState, useEffect, useCallback } from "react"
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Animated,
} from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useColorScheme } from "react-native"
import * as Haptics from "expo-haptics"
import * as Linking from "expo-linking"

import { githubService } from "@/services/githubService"
import { projectService } from "@/services/projectService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

export default function RepositoriesScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [repositories, setRepositories] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Animation
  const fadeAnim = useState(new Animated.Value(0))[0]
  const slideAnim = useState(new Animated.Value(50))[0]

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!loading && !refreshing) {
      // Animate in the content
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [loading, refreshing])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load repositories and projects in parallel
      const [repos, projectsData] = await Promise.all([githubService.getRepositories(), projectService.getProjects()])

      setRepositories(repos)
      setProjects(projectsData)
    } catch (error) {
      console.error("Error loading data:", error)
      showToast("Failed to load repositories", {type: 'error'})
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [])

  const handleSelectRepo = (repo: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // Set the selected repository and navigate back to GitHub screen
    githubService.setSelectedRepository(repo.id)
    router.back()
  }

  const handleViewRepo = (repo: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (repo.html_url) {
      Linking.openURL(repo.html_url)
    }
  }

  const handleLinkToProject = async (repo: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Navigate to project selection screen
      router.push({
        pathname: "/select-project",
        params: { repoId: repo.id },
      })
    } catch (error) {
      console.error("Error preparing to link repository:", error)
      showToast("Failed to prepare project linking",  {type: 'error'})
    }
  }

  const handleAddRepo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push("/add-repository")
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null
    const project = projects.find((p) => p.id === projectId)
    return project ? project.name : null
  }

  const filteredRepositories = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.full_name && repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.headerText, { color: theme.text }]}>Repositories</Text>
        </View>
        <TouchableOpacity onPress={handleAddRepo} style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.tint} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.textDim }]}>Loading repositories...</Text>
        </View>
      ) : (
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Ionicons name="search" size={20} color={theme.textDim} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search repositories..."
                placeholderTextColor={theme.textDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== "" && (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color={theme.textDim} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {repositories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={80} color={theme.textDim} />
              <Text style={[styles.emptyText, { color: theme.text }]}>No repositories found</Text>
              <Text style={[styles.emptySubtext, { color: theme.textDim }]}>
                Add a GitHub repository to track commits and link them to tasks.
              </Text>
              <TouchableOpacity style={[styles.addRepoButton, { backgroundColor: theme.tint }]} onPress={handleAddRepo}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addRepoButtonText}>Add Repository</Text>
              </TouchableOpacity>
            </View>
          ) : filteredRepositories.length === 0 ? (
            <View style={styles.emptySearchContainer}>
              <Ionicons name="search-outline" size={60} color={theme.textDim} />
              <Text style={[styles.emptySearchText, { color: theme.text }]}>No matching repositories</Text>
              <Text style={[styles.emptySearchSubtext, { color: theme.textDim }]}>
                Try a different search term or add a new repository.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredRepositories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.repoItem, { backgroundColor: theme.cardBackground }]}>
                  <TouchableOpacity style={styles.repoInfo} onPress={() => handleSelectRepo(item)} activeOpacity={0.7}>
                    <Text style={[styles.repoName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.repoFullName, { color: theme.textDim }]}>{item.full_name}</Text>
                    {item.description && (
                      <Text style={[styles.repoDescription, { color: theme.textDim }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                    {item.project_id && (
                      <View style={[styles.projectBadge, { backgroundColor: theme.tintLight }]}>
                        <Ionicons name="folder-outline" size={12} color={theme.tint} style={styles.projectIcon} />
                        <Text style={[styles.projectName, { color: theme.tint }]}>
                          {getProjectName(item.project_id)}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.repoActions}>
                    <TouchableOpacity
                      style={[styles.repoAction, { backgroundColor: theme.tintLight }]}
                      onPress={() => handleViewRepo(item)}
                    >
                      <Ionicons name="open-outline" size={16} color={theme.tint} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.repoAction,
                        { backgroundColor: item.project_id ? theme.successLight : theme.tintLight },
                      ]}
                      onPress={() => handleLinkToProject(item)}
                    >
                      <Ionicons
                        name={item.project_id ? "link" : "link-outline"}
                        size={16}
                        color={item.project_id ? theme.success : theme.tint}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.repoList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.tint]}
                  tintColor={theme.tint}
                />
              }
            />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
  },
  addButton: {
    padding: 4,
  },
  contentContainer: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },
  emptySearchContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptySearchText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySearchSubtext: {
    fontSize: 14,
    textAlign: "center",
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
  repoList: {
    padding: 16,
  },
  repoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  repoInfo: {
    flex: 1,
    marginRight: 16,
  },
  repoName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  repoFullName: {
    fontSize: 14,
    marginBottom: 8,
  },
  repoDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  projectBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  projectIcon: {
    marginRight: 4,
  },
  projectName: {
    fontSize: 12,
    fontWeight: "500",
  },
  repoActions: {
    flexDirection: "row",
    gap: 8,
  },
  repoAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
})
