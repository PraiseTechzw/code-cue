"use client"

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react"
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useColorScheme } from "react-native"
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from "@gorhom/bottom-sheet"

import { githubService } from "@/services/githubService"
import { projectService } from "@/services/projectService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

const { height: screenHeight } = Dimensions.get('window')

export default function AddRepositoryScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  // Bottom sheet refs
  const bottomSheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ['25%', '75%'], [])

  const [repoUrl, setRepoUrl] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Load projects when the component mounts
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoadingProjects(true)
      const projectsData = await projectService.getProjects()
      setProjects(projectsData)
    } catch (error) {
      console.error("Error loading projects:", error)
      showToast("Failed to load projects", {type: "error"})
    } finally {
      setLoadingProjects(false)
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (repoUrl.trim() === "") {
      newErrors.repoUrl = "Repository URL is required"
    } else if (!isValidGitHubUrl(repoUrl)) {
      newErrors.repoUrl = "Invalid GitHub repository URL"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidGitHubUrl = (url: string) => {
    // Simple validation for GitHub URLs
    return url.trim().startsWith("https://github.com/") && url.trim().split("/").length >= 5
  }

  const handleAddRepository = async () => {
    if (validateForm()) {
      try {
        setLoading(true)

        // Extract owner and repo name from URL
        const urlParts = repoUrl.trim().split("/")
        const owner = urlParts[3]
        const repoName = urlParts[4].split("#")[0].split("?")[0]

        // Add repository
        await githubService.addRepository({
          name: repoName,
          full_name: `${owner}/${repoName}`,
          html_url: repoUrl,
          project_id: selectedProjectId,
        })

        showToast("Repository added successfully", {type: "success"})

        // Navigate back to repositories screen
        router.push("/repositories")
      } catch (error) {
        console.error("Error adding repository:", error)
        showToast("Failed to add repository", {type: "error"})
      } finally {
        setLoading(false)
      }
    }
  }

  const handleClose = useCallback(() => {
    router.back()
  }, [])

  const handleSheetChanges = useCallback((index: number) => {
    console.log('handleSheetChanges', index)
  }, [])

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        onClose={handleClose}
        backgroundStyle={[styles.bottomSheetBackground, { backgroundColor: theme.background }]}
        handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: theme.border }]}
      >
        <BottomSheetScrollView 
          style={styles.contentContainer}
          contentContainerStyle={styles.contentContainerStyle}
          showsVerticalScrollIndicator={false}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Add Repository</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>GitHub Repository URL</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
                    errors.repoUrl && styles.inputError,
                  ]}
                  placeholder="https://github.com/username/repository"
                  placeholderTextColor={theme.textDim}
                  value={repoUrl}
                  onChangeText={setRepoUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                {errors.repoUrl && <Text style={styles.errorText}>{errors.repoUrl}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Link to Project (Optional)</Text>
                {loadingProjects ? (
                  <View style={[styles.loadingProjects, { backgroundColor: theme.cardBackground }]}>
                    <ActivityIndicator size="small" color={theme.tint} />
                    <Text style={[styles.loadingProjectsText, { color: theme.textDim }]}>Loading projects...</Text>
                  </View>
                ) : projects.length === 0 ? (
                  <View style={[styles.noProjects, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Text style={[styles.noProjectsText, { color: theme.textDim }]}>No projects available</Text>
                  </View>
                ) : (
                  <View style={styles.projectsContainer}>
                    {projects.map((project) => (
                      <TouchableOpacity
                        key={project.$id || project.id}
                        style={[
                          styles.projectItem,
                          { backgroundColor: theme.cardBackground, borderColor: theme.border },
                          selectedProjectId === (project.$id || project.id) && {
                            borderColor: theme.tint,
                            backgroundColor: theme.tintLight,
                          },
                        ]}
                        onPress={() => setSelectedProjectId((project.$id || project.id) === selectedProjectId ? null : (project.$id || project.id))}
                      >
                        <Text
                          style={[
                            styles.projectName,
                            { color: theme.text },
                            selectedProjectId === (project.$id || project.id) && { color: theme.tint },
                          ]}
                        >
                          {project.name}
                        </Text>
                        {selectedProjectId === (project.$id || project.id) && (
                          <Ionicons name="checkmark-circle" size={20} color={theme.tint} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.tint }]}
                onPress={handleAddRepository}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.addIcon} />
                    <Text style={styles.addButtonText}>Add Repository</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
  },
  contentContainerStyle: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 10,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  form: {
    padding: 20,
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
  projectsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  projectItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    margin: 4,
    minWidth: "45%",
  },
  projectName: {
    fontSize: 14,
    fontWeight: "500",
  },
  loadingProjects: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    padding: 16,
  },
  loadingProjectsText: {
    marginLeft: 8,
    fontSize: 14,
  },
  noProjects: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  noProjectsText: {
    fontSize: 14,
  },
  addButton: {
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
  addIcon: {
    marginRight: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
