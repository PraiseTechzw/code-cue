"use client"

import { useState, useEffect } from "react"
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator, Animated } from "react-native"
import { Ionicons } from "@expo/vector-icons/Ionicons"
import { router, useLocalSearchParams } from "expo-router"
import { useColorScheme } from "react-native"
import * as Haptics from "expo-haptics"

import { githubService } from "@/services/githubService"
import { projectService } from "@/services/projectService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

export default function SelectProjectScreen() {
  const { repoId } = useLocalSearchParams()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [repository, setRepository] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)

  // Animation
  const fadeAnim = useState(new Animated.Value(0))[0]
  const slideAnim = useState(new Animated.Value(50))[0]

  useEffect(() => {
    if (repoId) {
      loadData()
    }
  }, [repoId])

  useEffect(() => {
    if (!loading && repository) {
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

      // Pre-select the current project if it exists
      if (repository.project_id) {
        setSelectedProjectId(repository.project_id)
      }
    }
  }, [loading, repository])

  const loadData = async () => {
    try {
      setLoading(true)

      // Get repository details
      const repoData = await githubService.getRepositoryById(repoId as string)
      setRepository(repoData)

      // Get projects
      const projectsData = await projectService.getProjects()
      setProjects(projectsData)
    } catch (error) {
      console.error("Error loading data:", error)
      showToast("Failed to load data", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectProject = (projectId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedProjectId(projectId === selectedProjectId ? null : projectId)
  }

  const handleLinkRepository = async () => {
    try {
      setLinking(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Link repository to project
      await githubService.linkRepositoryToProject(repository.id, selectedProjectId)

      showToast("Repository linked to project successfully", "success")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Navigate back
      router.back()
    } catch (error) {
      console.error("Error linking repository:", error)
      showToast("Failed to link repository", "error")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLinking(false)
    }
  }

  const handleUnlinkRepository = async () => {
    try {
      setLinking(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Unlink repository from project (link to null)
      await githubService.linkRepositoryToProject(repository.id, null)

      showToast("Repository unlinked from project", "success")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Navigate back
      router.back()
    } catch (error) {
      console.error("Error unlinking repository:", error)
      showToast("Failed to unlink repository", "error")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLinking(false)
    }
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.headerText, { color: theme.text }]}>Link to Project</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.textDim }]}>Loading data...</Text>
        </View>
      </View>
    )
  }

  if (!repository) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.headerText, { color: theme.text }]}>Link to Project</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={theme.textDim} />
          <Text style={[styles.errorText, { color: theme.textDim }]}>Repository not found</Text>
          <TouchableOpacity onPress={handleBack} style={[styles.errorButton, { backgroundColor: theme.tint }]}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.headerText, { color: theme.text }]}>Link to Project</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.repoCard,
            {
              backgroundColor: theme.cardBackground,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={[styles.repoName, { color: theme.text }]}>{repository.name}</Text>
          <Text style={[styles.repoFullName, { color: theme.textDim }]}>{repository.full_name}</Text>
          {repository.description && (
            <Text style={[styles.repoDescription, { color: theme.textDim }]}>{repository.description}</Text>
          )}
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Select a Project</Text>

          {projects.length > 0 ? (
            <FlatList
              data={projects}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.projectItem,
                    { backgroundColor: theme.cardBackground },
                    selectedProjectId === item.id && { borderColor: theme.tint, borderWidth: 2 },
                  ]}
                  onPress={() => handleSelectProject(item.id)}
                >
                  <View style={styles.projectItemLeft}>
                    <Ionicons name="folder-outline" size={20} color={theme.text} style={styles.projectIcon} />
                    <View style={styles.projectDetails}>
                      <Text style={[styles.projectTitle, { color: theme.text }]}>{item.name}</Text>
                      {item.description && (
                        <Text style={[styles.projectDescription, { color: theme.textDim }]} numberOfLines={1}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  {selectedProjectId === item.id && <Ionicons name="checkmark-circle" size={20} color={theme.tint} />}
                </TouchableOpacity>
              )}
              scrollEnabled={true}
              contentContainerStyle={styles.projectsList}
            />
          ) : (
            <View style={styles.emptyProjectsContainer}>
              <Ionicons name="folder-open-outline" size={60} color={theme.textDim} />
              <Text style={[styles.emptyProjectsText, { color: theme.textDim }]}>No projects found</Text>
              <Text style={[styles.emptyProjectsSubtext, { color: theme.textDim }]}>
                Create a project first to link this repository.
              </Text>
              <TouchableOpacity
                style={[styles.createProjectButton, { backgroundColor: theme.tint }]}
                onPress={() => router.push("/new-project")}
              >
                <Ionicons name="add-outline" size={16} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.createProjectButtonText}>Create New Project</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>

      <View style={[styles.footer, { backgroundColor: theme.cardBackground }]}>
        {repository.project_id ? (
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={[styles.unlinkButton, { borderColor: theme.error }]}
              onPress={handleUnlinkRepository}
              disabled={linking}
            >
              {linking ? (
                <ActivityIndicator color={theme.error} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color={theme.error} style={styles.buttonIcon} />
                  <Text style={[styles.unlinkButtonText, { color: theme.error }]}>Unlink</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.linkButton,
                { backgroundColor: theme.tint },
                (!selectedProjectId || linking) && { opacity: 0.6 },
              ]}
              onPress={handleLinkRepository}
              disabled={!selectedProjectId || linking}
            >
              {linking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="link" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.linkButtonText}>Update Link</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.linkButton,
              { backgroundColor: theme.tint },
              (!selectedProjectId || linking) && { opacity: 0.6 },
            ]}
            onPress={handleLinkRepository}
            disabled={!selectedProjectId || linking}
          >
            {linking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="link" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.linkButtonText}>Link to Project</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
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
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  repoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  projectItem: {
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
  projectItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  projectIcon: {
    marginRight: 12,
  },
  projectDetails: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  projectDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  projectsList: {
    paddingBottom: 100,
  },
  emptyProjectsContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyProjectsText: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
    marginTop: 16,
  },
  emptyProjectsSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  createProjectButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buttonIcon: {
    marginRight: 6,
  },
  createProjectButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  linkButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  unlinkButton: {
    flex: 0.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  unlinkButtonText: {
    fontSize: 16,
    fontWeight: "600",
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  errorButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
})
